import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carregar pricing table
const prices = JSON.parse(fs.readFileSync(path.join(__dirname, '../prices.json'), 'utf-8'));

// Busca a lista de modelos ATIVOS direto na API oficial do provedor.
// Isso é o que faz o sistema se auto-atualizar: quando um modelo é
// aposentado pelo provedor, ele simplesmente some dessa lista e para
// de ser testado — sem precisar editar código.
async function fetchLiveAnthropicModels(apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.data || []).map(m => m.id);
}

async function fetchLiveOpenAIModels(apiKey) {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.data || []).map(m => m.id);
}

async function fetchLiveGeminiModels(apiKey) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.models || []).map(m => m.name.replace('models/', ''));
}

async function fetchLiveGroqModels(apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.data || []).map(m => m.id);
}

// A API de modelos de alguns provedores (ex: Anthropic) retorna o ID com
// data (claude-haiku-4-5-20251001) mesmo quando nossa tabela de preços usa
// o alias curto (claude-haiku-4-5). Resolve isso casando por prefixo.
function resolveLiveModel(curatedId, liveModelIds) {
  if (liveModelIds.includes(curatedId)) return curatedId;
  return liveModelIds.find(id => id.startsWith(curatedId + '-')) || null;
}

// Cruza nossa tabela de preços com a lista de modelos ativos agora mesmo
// no provedor. Modelos aposentados somem daqui automaticamente.
function matchCuratedToLiveModels(priceKey, liveModelIds) {
  const curatedModels = Object.keys(prices[priceKey].models);
  const resolvedPairs = curatedModels
    .map(curated => ({ curated, live: resolveLiveModel(curated, liveModelIds) }))
    .filter(p => p.live !== null);
  const unpricedModels = liveModelIds.filter(id => !resolvedPairs.some(p => p.live === id));
  return { resolvedPairs, unpricedModels };
}

// Testa em paralelo os pares (alias curado ↔ id real no provedor).
// `callModel` faz a chamada de teste real e retorna { input, output } em tokens.
async function testModelsWithPricing(resolvedPairs, priceKey, callModel) {
  const promises = resolvedPairs.map(({ curated, live }) =>
    callModel(live)
      .then(usage => {
        const pricing = prices[priceKey].models[curated];
        return {
          model: curated,
          live_model_id: live,
          status: 'active',
          usage: {
            test_input_tokens: usage.input,
            test_output_tokens: usage.output,
            test_total_cost: (usage.input * pricing.input) + (usage.output * pricing.output)
          },
          pricing: {
            input: pricing.input,
            output: pricing.output,
            input_per_million: pricing.input * 1000000,
            output_per_million: pricing.output * 1000000
          }
        };
      })
      .catch(() => null)
  );
  return (await Promise.all(promises)).filter(r => r !== null);
}

// GET /api/integrations/validate-key
// Valida chave do provedor e retorna informações de consumo
router.post('/validate-key', async (req, res) => {
  try {
    const { provider_key, provider: explicitProvider, access_key_id, secret_access_key, region, endpoint, deployment } = req.body;

    // Bedrock e Azure não autenticam com uma chave única (SigV4 / endpoint+deployment+chave),
    // então o cliente manda o provider explicitamente em vez de depender da detecção por prefixo.
    if (!provider_key && !explicitProvider) {
      return res.status(400).json({ error: 'provider_key é obrigatório' });
    }

    // Detectar provider pela chave (ou usar o explícito, para provedores multi-campo)
    let provider = explicitProvider || null;
    if (!provider) {
      if (provider_key.startsWith('sk-ant-')) {
        provider = 'anthropic';
      } else if (provider_key.startsWith('gsk_')) {
        provider = 'groq';
      } else if (provider_key.startsWith('pplx-')) {
        provider = 'perplexity';
      } else if (provider_key.startsWith('hf_')) {
        provider = 'huggingface';
      } else if (provider_key.startsWith('fc-')) {
        provider = 'firecrawl';
      } else if (provider_key.startsWith('r8_')) {
        provider = 'replicate';
      } else if (provider_key.startsWith('sk-') || provider_key.startsWith('sk_')) {
        provider = 'openai';
      } else if (provider_key.includes('AIza')) {
        provider = 'google-gemini';
      } else {
        return res.status(400).json({ error: 'Formato de chave não reconhecido' });
      }
    }

    let result = {};

    // Validar Anthropic
    if (provider === 'anthropic') {
      let liveModelIds;
      try {
        liveModelIds = await fetchLiveAnthropicModels(provider_key);
      } catch (error) {
        return res.status(401).json({
          provider: 'anthropic',
          name: 'Anthropic Claude',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: error.message
        });
      }

      const { resolvedPairs, unpricedModels } = matchCuratedToLiveModels('anthropic-claude', liveModelIds);

      const modelResults = await testModelsWithPricing(resolvedPairs, 'anthropic-claude', (model) =>
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': provider_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ok' }]
          })
        }).then(async r => {
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error?.message || r.statusText);
          }
          const data = await r.json();
          return { input: data.usage.input_tokens, output: data.usage.output_tokens };
        })
      );

      // Tenta buscar info de billing
      let billing = null;
      try {
        const billingRes = await fetch('https://api.anthropic.com/v1/accounts/me', {
          headers: { 'x-api-key': provider_key, 'content-type': 'application/json' }
        });
        if (billingRes.ok) {
          const accountInfo = await billingRes.json();
          billing = { account_id: accountInfo.account_id, status: 'active' };
        }
      } catch (e) {
        // Endpoint pode não estar disponível
      }

      result = {
        provider: 'anthropic',
        name: 'Anthropic Claude',
        is_valid: true,
        models_tested: modelResults,
        available_models: liveModelIds,
        unpriced_models: unpricedModels,
        billing: billing
      };
    }

    // Validar OpenAI
    if (provider === 'openai') {
      let liveModelIds;
      try {
        liveModelIds = await fetchLiveOpenAIModels(provider_key);
      } catch (error) {
        return res.status(401).json({
          provider: 'openai',
          name: 'OpenAI GPT',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: error.message
        });
      }

      const { resolvedPairs, unpricedModels } = matchCuratedToLiveModels('openai-gpt', liveModelIds);

      const modelResults = await testModelsWithPricing(resolvedPairs, 'openai-gpt', (model) =>
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ok' }]
          })
        }).then(async r => {
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error?.message || r.statusText);
          }
          const data = await r.json();
          return { input: data.usage.prompt_tokens, output: data.usage.completion_tokens };
        })
      );

      // Tenta buscar balance/credit info via REST
      let billing = null;
      try {
        const balanceRes = await fetch('https://api.openai.com/v1/billing/credit_grants', {
          headers: {
            'Authorization': `Bearer ${provider_key}`,
            'Content-Type': 'application/json'
          }
        });

        if (balanceRes.ok) {
          const creditData = await balanceRes.json();
          if (creditData.data && creditData.data.length > 0) {
            const activeCredit = creditData.data.find(c => c.status === 'active');
            if (activeCredit) {
              billing = {
                credit_available: activeCredit.grant_amount - activeCredit.used_amount,
                total_credit: activeCredit.grant_amount,
                used_credit: activeCredit.used_amount,
                expires_at: activeCredit.expires_at
              };
            }
          }
        }
      } catch (e) {
        // Billing endpoint pode não estar disponível
      }

      result = {
        provider: 'openai',
        name: 'OpenAI GPT',
        is_valid: true,
        models_tested: modelResults,
        available_models: liveModelIds,
        unpriced_models: unpricedModels,
        billing: billing
      };
    }

    // Validar Google Gemini
    if (provider === 'google-gemini') {
      let liveModelIds;
      try {
        liveModelIds = await fetchLiveGeminiModels(provider_key);
      } catch (error) {
        return res.status(401).json({
          provider: 'google-gemini',
          name: 'Google Gemini',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: error.message
        });
      }

      const { resolvedPairs, unpricedModels } = matchCuratedToLiveModels('google-gemini', liveModelIds);

      result = {
        provider: 'google-gemini',
        name: 'Google Gemini',
        is_valid: true,
        available_models: liveModelIds,
        priced_models: resolvedPairs.map(p => p.curated),
        unpriced_models: unpricedModels,
        usage: {
          note: 'Consumo detalhado disponível no console do Google Cloud'
        }
      };
    }

    // Validar Groq
    if (provider === 'groq') {
      let liveModelIds;
      try {
        liveModelIds = await fetchLiveGroqModels(provider_key);
      } catch (error) {
        return res.status(401).json({
          provider: 'groq',
          name: 'Groq',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: error.message
        });
      }

      const { resolvedPairs, unpricedModels } = matchCuratedToLiveModels('groq', liveModelIds);

      const modelResults = await testModelsWithPricing(resolvedPairs, 'groq', (model) =>
        fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ok' }]
          })
        }).then(async r => {
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error?.message || r.statusText);
          }
          const data = await r.json();
          return { input: data.usage.prompt_tokens, output: data.usage.completion_tokens };
        })
      );

      result = {
        provider: 'groq',
        name: 'Groq',
        is_valid: true,
        models_tested: modelResults,
        available_models: liveModelIds,
        unpriced_models: unpricedModels,
        billing: null
      };
    }

    // Validar Perplexity
    // Nota: a Perplexity não expõe um endpoint público de lista de modelos
    // ativos, então aqui testamos direto os modelos da nossa tabela de
    // preços (sem o cruzamento "live" que os outros provedores têm).
    if (provider === 'perplexity') {
      const curatedModels = Object.keys(prices.perplexity.models);
      const pairs = curatedModels.map(m => ({ curated: m, live: m }));

      const modelResults = await testModelsWithPricing(pairs, 'perplexity', (model) =>
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ok' }]
          })
        }).then(async r => {
          if (!r.ok) {
            const e = await r.json().catch(() => ({}));
            throw new Error(e.error?.message || r.statusText);
          }
          const data = await r.json();
          return { input: data.usage.prompt_tokens, output: data.usage.completion_tokens };
        })
      );

      if (modelResults.length === 0) {
        return res.status(401).json({
          provider: 'perplexity',
          name: 'Perplexity AI',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: 'Nenhum modelo respondeu com sucesso'
        });
      }

      result = {
        provider: 'perplexity',
        name: 'Perplexity AI',
        is_valid: true,
        models_tested: modelResults,
        billing: null
      };
    }

    // Validar Hugging Face
    // Nota: cobrança é por tempo de execução (varia por provedor de
    // inferência), não por token — então aqui só validamos a chave via
    // whoami, sem testar/cobrar um modelo real.
    if (provider === 'huggingface') {
      const whoamiRes = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { 'Authorization': `Bearer ${provider_key}` }
      });

      if (!whoamiRes.ok) {
        return res.status(401).json({
          provider: 'huggingface',
          name: 'Hugging Face',
          is_valid: false,
          error: 'Chave inválida ou expirada'
        });
      }

      const whoami = await whoamiRes.json();

      result = {
        provider: 'huggingface',
        name: 'Hugging Face',
        is_valid: true,
        billing: {
          account: whoami.name || whoami.fullname,
          plan: whoami.type
        },
        usage: {
          note: 'Cobrança por tempo de execução (varia por provedor de inferência) — veja huggingface.co/settings/billing'
        }
      };
    }

    // Validar Replicate
    // Nota: cobrança é por segundo de computação (varia por hardware),
    // não por token — então aqui só validamos a chave via /account.
    if (provider === 'replicate') {
      const accountRes = await fetch('https://api.replicate.com/v1/account', {
        headers: { 'Authorization': `Bearer ${provider_key}` }
      });

      if (!accountRes.ok) {
        return res.status(401).json({
          provider: 'replicate',
          name: 'Replicate',
          is_valid: false,
          error: 'Chave inválida ou expirada'
        });
      }

      const account = await accountRes.json();

      result = {
        provider: 'replicate',
        name: 'Replicate',
        is_valid: true,
        billing: {
          account: account.username,
          type: account.type
        },
        usage: {
          note: 'Cobrança por segundo de computação (varia por modelo/hardware) — veja replicate.com/account/billing'
        }
      };
    }

    // Validar Firecrawl
    // Não é um LLM — usa créditos por operação (scrape/crawl/search), não
    // tokens. getCreditUsage não consome créditos, então dá pra validar
    // sem custo real.
    if (provider === 'firecrawl') {
      const creditRes = await fetch('https://api.firecrawl.dev/v2/team/credit-usage', {
        headers: { 'Authorization': `Bearer ${provider_key}` }
      });

      if (!creditRes.ok) {
        return res.status(401).json({
          provider: 'firecrawl',
          name: 'Firecrawl',
          is_valid: false,
          error: 'Chave inválida ou expirada'
        });
      }

      const body = await creditRes.json();
      const credit = body.data || body;

      result = {
        provider: 'firecrawl',
        name: 'Firecrawl',
        is_valid: true,
        billing: {
          credit_available: credit.remainingCredits ?? credit.remaining_credits,
          total_credit: credit.planCredits ?? credit.plan_credits
        },
        usage: {
          note: 'Cobrança em créditos por operação (scrape/crawl/search), não em tokens'
        }
      };
    }

    // Validar AWS Bedrock
    // Não autentica com uma chave única — precisa de Access Key + Secret
    // Key + Região (SigV4), por isso os campos vêm separados do body.
    if (provider === 'bedrock') {
      if (!access_key_id || !secret_access_key || !region) {
        return res.status(400).json({
          provider: 'bedrock',
          name: 'AWS Bedrock',
          is_valid: false,
          error: 'access_key_id, secret_access_key e region são obrigatórios'
        });
      }

      const client = new BedrockRuntimeClient({
        region,
        credentials: { accessKeyId: access_key_id, secretAccessKey: secret_access_key }
      });

      const pairs = Object.keys(prices['claude-ai-bedrock'].models).map(m => ({ curated: m, live: m }));

      const modelResults = await testModelsWithPricing(pairs, 'claude-ai-bedrock', (model) =>
        client.send(new ConverseCommand({
          modelId: model,
          messages: [{ role: 'user', content: [{ text: 'ok' }] }],
          inferenceConfig: { maxTokens: 10 }
        })).then(r => ({ input: r.usage.inputTokens, output: r.usage.outputTokens }))
      );

      if (modelResults.length === 0) {
        return res.status(401).json({
          provider: 'bedrock',
          name: 'AWS Bedrock',
          is_valid: false,
          error: 'Credenciais inválidas ou sem acesso a nenhum modelo Claude no Bedrock',
          details: 'Verifique se o modelo foi habilitado em "Model access" no console do Bedrock'
        });
      }

      result = {
        provider: 'bedrock',
        name: 'AWS Bedrock',
        is_valid: true,
        models_tested: modelResults,
        billing: null
      };
    }

    // Validar Azure OpenAI
    // Não autentica com uma chave única — precisa de Endpoint do recurso +
    // Deployment Name + chave, por isso os campos vêm separados do body.
    if (provider === 'azure') {
      if (!endpoint || !deployment) {
        return res.status(400).json({
          provider: 'azure',
          name: 'Azure OpenAI',
          is_valid: false,
          error: 'endpoint e deployment são obrigatórios'
        });
      }

      const apiVersion = '2024-10-01-preview';
      const testRes = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`, {
        method: 'POST',
        headers: {
          'api-key': provider_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ max_tokens: 10, messages: [{ role: 'user', content: 'ok' }] })
      });

      if (!testRes.ok) {
        const err = await testRes.json().catch(() => ({}));
        return res.status(401).json({
          provider: 'azure',
          name: 'Azure OpenAI',
          is_valid: false,
          error: 'Credenciais inválidas ou deployment incorreto',
          details: err.error?.message
        });
      }

      const data = await testRes.json();
      const model = prices['azure-openai'].models[data.model] ? data.model : Object.keys(prices['azure-openai'].models)[0];
      const pricing = prices['azure-openai'].models[model];
      const inputTokens = data.usage.prompt_tokens;
      const outputTokens = data.usage.completion_tokens;

      result = {
        provider: 'azure',
        name: 'Azure OpenAI',
        is_valid: true,
        models_tested: [{
          model,
          status: 'active',
          usage: {
            test_input_tokens: inputTokens,
            test_output_tokens: outputTokens,
            test_total_cost: inputTokens * pricing.input + outputTokens * pricing.output
          },
          pricing: {
            input: pricing.input,
            output: pricing.output,
            input_per_million: pricing.input * 1000000,
            output_per_million: pricing.output * 1000000
          }
        }],
        billing: null
      };
    }

    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

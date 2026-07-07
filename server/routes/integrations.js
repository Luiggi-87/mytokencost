import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const { provider_key } = req.body;

    if (!provider_key) {
      return res.status(400).json({ error: 'provider_key é obrigatório' });
    }

    // Detectar provider pela chave
    let provider = null;
    if (provider_key.startsWith('sk-ant-')) {
      provider = 'anthropic';
    } else if (provider_key.startsWith('sk-') || provider_key.startsWith('sk_')) {
      provider = 'openai';
    } else if (provider_key.includes('AIza')) {
      provider = 'google-gemini';
    } else {
      return res.status(400).json({ error: 'Formato de chave não reconhecido' });
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

    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

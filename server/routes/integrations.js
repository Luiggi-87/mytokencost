import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carregar pricing table
const prices = JSON.parse(fs.readFileSync(path.join(__dirname, '../prices.json'), 'utf-8'));

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

    // Validar Anthropic com múltiplos modelos
    if (provider === 'anthropic') {
      try {
        const modelsToTest = [
          'claude-3-5-sonnet-20241022',
          'claude-3-opus-20250219',
          'claude-3-haiku-20240307'
        ];

        const modelResults = [];
        let firstError = null;

        // Testar cada modelo
        for (const model of modelsToTest) {
          try {
            const testRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': provider_key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                model: model,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'ok' }]
              })
            });

            if (!testRes.ok) {
              if (!firstError) {
                const errorData = await testRes.json();
                firstError = errorData.error?.message || testRes.statusText;
              }
              continue;
            }

            const response = await testRes.json();
            const pricing = prices['anthropic-claude'].models[model];

            modelResults.push({
              model: model,
              status: 'active',
              usage: {
                test_input_tokens: response.usage.input_tokens,
                test_output_tokens: response.usage.output_tokens,
                test_total_cost: (response.usage.input_tokens * pricing.input) + (response.usage.output_tokens * pricing.output)
              },
              pricing: {
                input: pricing.input,
                output: pricing.output,
                input_per_million: pricing.input * 1000000,
                output_per_million: pricing.output * 1000000
              }
            });
          } catch (e) {
            // Continua com próximo modelo
          }
        }

        if (modelResults.length === 0) {
          return res.status(401).json({
            provider: 'anthropic',
            name: 'Anthropic Claude',
            is_valid: false,
            error: 'Chave inválida ou expirada',
            details: firstError || 'Falha ao testar modelos'
          });
        }

        // Tenta buscar info de billing
        let billing = null;
        try {
          const billingRes = await fetch('https://api.anthropic.com/v1/accounts/me', {
            headers: {
              'x-api-key': provider_key,
              'content-type': 'application/json'
            }
          });
          if (billingRes.ok) {
            const accountInfo = await billingRes.json();
            billing = {
              account_id: accountInfo.account_id,
              status: 'active'
            };
          }
        } catch (e) {
          // Endpoint pode não estar disponível
        }

        result = {
          provider: 'anthropic',
          name: 'Anthropic Claude',
          is_valid: true,
          models_tested: modelResults,
          billing: billing
        };
      } catch (error) {
        return res.status(401).json({
          provider: 'anthropic',
          name: 'Anthropic Claude',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: error.message
        });
      }
    }

    // Validar OpenAI com múltiplos modelos
    if (provider === 'openai') {
      try {
        let OpenAI;
        try {
          const mod = await import('openai');
          OpenAI = mod.default;
        } catch {
          // Usar REST API sem SDK
          const modelsToTest = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
          const modelResults = [];
          let firstError = null;

          for (const model of modelsToTest) {
            try {
              const testRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${provider_key}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: model,
                  max_tokens: 10,
                  messages: [{ role: 'user', content: 'ok' }]
                })
              });

              if (!testRes.ok) {
                if (!firstError) {
                  const errorData = await testRes.json();
                  firstError = errorData.error?.message || testRes.statusText;
                }
                continue;
              }

              const response = await testRes.json();
              const pricing = prices['openai-gpt'].models[model];

              modelResults.push({
                model: model,
                status: 'active',
                usage: {
                  test_input_tokens: response.usage.prompt_tokens,
                  test_output_tokens: response.usage.completion_tokens,
                  test_total_cost: (response.usage.prompt_tokens * pricing.input) + (response.usage.completion_tokens * pricing.output)
                },
                pricing: {
                  input: pricing.input,
                  output: pricing.output,
                  input_per_million: pricing.input * 1000000,
                  output_per_million: pricing.output * 1000000
                }
              });
            } catch (e) {
              // Continua com próximo modelo
            }
          }

          if (modelResults.length === 0) {
            return res.status(401).json({
              provider: 'openai',
              name: 'OpenAI GPT',
              is_valid: false,
              error: 'Chave inválida ou expirada',
              details: firstError || 'Falha ao testar modelos'
            });
          }

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

          return res.json({
            provider: 'openai',
            name: 'OpenAI GPT',
            is_valid: true,
            models_tested: modelResults,
            billing: billing
          });
        }

        const client = new OpenAI({ apiKey: provider_key });
        const modelsToTest = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
        const modelResults = [];
        let firstError = null;

        for (const model of modelsToTest) {
          try {
            const response = await client.chat.completions.create({
              model: model,
              max_tokens: 10,
              messages: [{ role: 'user', content: 'ok' }]
            });

            const pricing = prices['openai-gpt'].models[model];

            modelResults.push({
              model: model,
              status: 'active',
              usage: {
                test_input_tokens: response.usage.prompt_tokens,
                test_output_tokens: response.usage.completion_tokens,
                test_total_cost: (response.usage.prompt_tokens * pricing.input) + (response.usage.completion_tokens * pricing.output)
              },
              pricing: {
                input: pricing.input,
                output: pricing.output,
                input_per_million: pricing.input * 1000000,
                output_per_million: pricing.output * 1000000
              }
            });
          } catch (e) {
            if (!firstError) {
              firstError = e.message;
            }
          }
        }

        if (modelResults.length === 0) {
          return res.status(401).json({
            provider: 'openai',
            name: 'OpenAI GPT',
            is_valid: false,
            error: 'Chave inválida ou expirada',
            details: firstError || 'Falha ao testar modelos'
          });
        }

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
          // Billing endpoint pode não estar disponível ou requer billing acesso específico
        }

        result = {
          provider: 'openai',
          name: 'OpenAI GPT',
          is_valid: true,
          models_tested: modelResults,
          billing: billing
        };
      } catch (error) {
        return res.status(401).json({
          provider: 'openai',
          name: 'OpenAI GPT',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: error.message
        });
      }
    }

    // Validar Google Gemini
    if (provider === 'google-gemini') {
      try {
        // Gemini não tem SDK nativo fácil, mas podemos validar fazendo chamada REST
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ok' }] }]
          }),
          timeout: 5000
        });

        if (!response.ok) {
          return res.status(401).json({
            provider: 'google-gemini',
            name: 'Google Gemini',
            is_valid: false,
            error: 'Chave inválida ou expirada',
            details: `HTTP ${response.status}`
          });
        }

        result = {
          provider: 'google-gemini',
          name: 'Google Gemini',
          is_valid: true,
          models: [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-pro'
          ],
          usage: {
            note: 'Consumo detalhado disponível no console do Google Cloud'
          }
        };
      } catch (error) {
        return res.status(401).json({
          provider: 'google-gemini',
          name: 'Google Gemini',
          is_valid: false,
          error: 'Chave inválida ou expirada',
          details: error.message
        });
      }
    }

    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

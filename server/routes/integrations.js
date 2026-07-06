import express from 'express';

const router = express.Router();

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
      try {
        // Faz chamada teste diretamente via REST (sem SDK)
        const testRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': provider_key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ok' }]
          })
        });

        if (!testRes.ok) {
          const errorData = await testRes.json();
          return res.status(401).json({
            provider: 'anthropic',
            name: 'Anthropic Claude',
            is_valid: false,
            error: 'Chave inválida ou expirada',
            details: errorData.error?.message || testRes.statusText
          });
        }

        const response = await testRes.json();

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
          models: [
            'claude-3-5-sonnet-20241022',
            'claude-3-opus-20250219',
            'claude-3-haiku-20240307'
          ],
          usage: {
            test_input_tokens: response.usage.input_tokens,
            test_output_tokens: response.usage.output_tokens,
            test_total_cost: (response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015)
          },
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

    // Validar OpenAI
    if (provider === 'openai') {
      try {
        let OpenAI;
        try {
          const mod = await import('openai');
          OpenAI = mod.default;
        } catch {
          // SDK não instalado em produção
          return res.status(400).json({
            provider: 'openai',
            name: 'OpenAI GPT',
            is_valid: false,
            error: 'SDK não disponível neste servidor'
          });
        }

        const client = new OpenAI({ apiKey: provider_key });

        // Faz chamada teste
        const response = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ok' }]
        });

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
          models: [
            'gpt-4',
            'gpt-4-turbo',
            'gpt-4o',
            'gpt-3.5-turbo'
          ],
          usage: {
            test_input_tokens: response.usage.prompt_tokens,
            test_output_tokens: response.usage.completion_tokens,
            test_total_tokens: response.usage.total_tokens,
            test_total_cost: (response.usage.prompt_tokens * 0.0000005) + (response.usage.completion_tokens * 0.0000015)
          },
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

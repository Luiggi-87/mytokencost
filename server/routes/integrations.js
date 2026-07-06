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
        let Anthropic;
        try {
          const mod = await import('@anthropic-ai/sdk');
          Anthropic = mod.default;
        } catch {
          // SDK não instalado em produção
          return res.status(400).json({
            provider: 'anthropic',
            name: 'Anthropic Claude',
            is_valid: false,
            error: 'SDK não disponível neste servidor'
          });
        }

        const client = new Anthropic({ apiKey: provider_key });

        // Faz chamada teste simples
        const response = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ok' }]
        });

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
          }
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

        // Tenta buscar usage data (requer endpoint adicional)
        let usage_data = null;
        try {
          const usage = await client.beta.billing.usage.list({
            limit: 1
          }).catch(() => null);
          usage_data = usage;
        } catch (e) {
          // Usage endpoint pode não estar disponível
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
          billing_data: usage_data ? {
            note: 'Acesso a dados de billing pode estar limitado'
          } : null
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

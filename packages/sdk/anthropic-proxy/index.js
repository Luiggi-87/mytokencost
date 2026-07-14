import Anthropic from "@anthropic-ai/sdk";

/**
 * Contador de Tokens - Anthropic Proxy SDK
 *
 * Wrapper do Anthropic Claude que automaticamente rastreia custos
 * e registra no dashboard MyTokenCost
 *
 * Uso:
 * import { CountedAnthropic } from '@luiggi-87/anthropic-proxy';
 *
 * const client = new CountedAnthropic({
 *   apiKey: process.env.ANTHROPIC_KEY,
 *   token: process.env.MYTOKENCOST_TOKEN, // JWT retornado pelo login/register
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 */

// Preços de token por modelo (atualizar conforme necessário)
const MODEL_PRICES = {
  "claude-opus-4-8": { input: 0.000005, output: 0.000025 },
  "claude-sonnet-5": { input: 0.000003, output: 0.000015 },
  "claude-haiku-4-5": { input: 0.000001, output: 0.000005 },
};

export class CountedAnthropic extends Anthropic {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "anthropic-claude";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    // this.messages.create é um método de instância do SDK oficial, não um
    // método de classe — precisa ser envolvido em runtime, não sobrescrito
    // via "async messages.create() {}" (isso é um erro de sintaxe em JS).
    const originalCreate = this.messages.create.bind(this.messages);
    this.messages.create = async (params) => {
      if (this.debug) {
        console.log("[CountedAnthropic] Creating message:", {
          model: params.model,
          project: this.projectId,
        });
      }

      const response = await originalCreate(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedAnthropic] Erro ao registrar custo:", error.message);
        // Não falha se não conseguir registrar (fail-open)
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || "unknown";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["claude-sonnet-5"];

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;

    // Calcular custo em USD
    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedAnthropic] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedAnthropic] Cost:", {
        value: cost.toFixed(6),
        currency: "USD",
      });
    }

    // Enviar para backend
    const response_register = await fetch(`${this.backendUrl}/api/costs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({
        project_id: this.projectId,
        api_id: this.apiId,
        amount: cost,
        units: totalTokens,
        unit_type: "tokens",
        description: `Claude ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedAnthropic] Cost recorded successfully");
    }
  }
}

export default CountedAnthropic;

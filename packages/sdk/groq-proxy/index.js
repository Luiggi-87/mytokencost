import Groq from "groq-sdk";

/**
 * Contador de Tokens - Groq Proxy SDK
 *
 * Wrapper do Groq que automaticamente rastreia custos
 * e registra no dashboard MyTokenCost
 *
 * Uso:
 * import { CountedGroq } from '@mtc-247ia/groq-proxy';
 *
 * const client = new CountedGroq({
 *   apiKey: process.env.GROQ_API_KEY,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 */

const MODEL_PRICES = {
  "llama-3.3-70b-versatile": { input: 0.00000059, output: 0.00000079 },
  "llama-3.1-8b-instant": { input: 0.00000005, output: 0.00000008 },
  "gemma2-9b-it": { input: 0.0000002, output: 0.0000002 },
};

export class CountedGroq extends Groq {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "groq";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    const originalCreate = this.chat.completions.create.bind(this.chat.completions);
    this.chat.completions.create = async (params) => {
      if (this.debug) {
        console.log("[CountedGroq] Creating completion:", {
          model: params.model,
          project: this.projectId,
        });
      }

      const response = await originalCreate(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedGroq] Erro ao registrar custo:", error.message);
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || "llama-3.3-70b-versatile";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["llama-3.3-70b-versatile"];

    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const totalTokens = inputTokens + outputTokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedGroq] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedGroq] Cost:", {
        value: cost.toFixed(6),
        currency: "USD",
      });
    }

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
        description: `Groq ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedGroq] Cost recorded successfully");
    }
  }
}

export default CountedGroq;

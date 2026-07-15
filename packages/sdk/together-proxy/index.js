import Together from "together-ai";

/**
 * Contador de Tokens - Together AI Proxy SDK
 *
 * Wrapper do Together AI que automaticamente rastreia custos
 * e registra no dashboard MyTokenCost
 *
 * Uso:
 * import { CountedTogether } from '@mtc-247ia/together-proxy';
 *
 * const client = new CountedTogether({
 *   apiKey: process.env.TOGETHER_API_KEY,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 */

const MODEL_PRICES = {
  "togethercomputer/llama-2-70b-chat": { input: 0.00000090, output: 0.00000120 },
  "mistralai/Mistral-7B-Instruct-v0.1": { input: 0.00000020, output: 0.00000020 },
  "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO": { input: 0.00000060, output: 0.00000060 },
};

export class CountedTogether extends Together {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "together-ai";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    const originalCreate = this.chat.completions.create.bind(this.chat.completions);
    this.chat.completions.create = async (params) => {
      if (this.debug) {
        console.log("[CountedTogether] Creating completion:", {
          model: params.model,
          project: this.projectId,
        });
      }

      const response = await originalCreate(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedTogether] Erro ao registrar custo:", error.message);
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || "mistralai/Mistral-7B-Instruct-v0.1";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["mistralai/Mistral-7B-Instruct-v0.1"];

    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const totalTokens = inputTokens + outputTokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedTogether] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedTogether] Cost:", {
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
        description: `Together ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedTogether] Cost recorded successfully");
    }
  }
}

export default CountedTogether;

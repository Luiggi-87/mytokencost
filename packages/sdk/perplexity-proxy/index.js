import { Perplexity } from "@perplexity-ai/perplexity_ai";

/**
 * Contador de Tokens - Perplexity Proxy SDK
 *
 * Wrapper do Perplexity que automaticamente rastreia custos
 * e registra no dashboard MyTokenCost
 *
 * Uso:
 * import { CountedPerplexity } from '@mtc-247ia/perplexity-proxy';
 *
 * const client = new CountedPerplexity({
 *   apiKey: process.env.PERPLEXITY_API_KEY,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 */

const MODEL_PRICES = {
  "sonar": { input: 0.000001, output: 0.000001 },
  "sonar-pro": { input: 0.000003, output: 0.000015 },
  "sonar-reasoning": { input: 0.000001, output: 0.000005 },
};

export class CountedPerplexity extends Perplexity {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "perplexity";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    const originalCreate = this.chat.completions.create.bind(this.chat.completions);
    this.chat.completions.create = async (params) => {
      if (this.debug) {
        console.log("[CountedPerplexity] Creating completion:", {
          model: params.model,
          project: this.projectId,
        });
      }

      const response = await originalCreate(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedPerplexity] Erro ao registrar custo:", error.message);
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || "sonar";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["sonar"];

    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const totalTokens = inputTokens + outputTokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedPerplexity] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedPerplexity] Cost:", {
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
        description: `Perplexity ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedPerplexity] Cost recorded successfully");
    }
  }
}

export default CountedPerplexity;

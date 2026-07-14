import { Mistral } from "@mistralai/mistralai";

/**
 * Contador de Tokens - Mistral AI Proxy SDK
 *
 * Wrapper do Mistral AI que automaticamente rastreia custos
 * e registra no dashboard MyTokenCost
 *
 * Uso:
 * import { CountedMistral } from '@luiggi-87/mistral-proxy';
 *
 * const client = new CountedMistral({
 *   apiKey: process.env.MISTRAL_API_KEY,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 */

const MODEL_PRICES = {
  "mistral-large-latest": { input: 0.000002, output: 0.000006 },
  "mistral-medium-latest": { input: 0.0000004, output: 0.000002 },
  "mistral-small-latest": { input: 0.0000001, output: 0.0000003 },
};

export class CountedMistral extends Mistral {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "mistral";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    // O SDK oficial expõe chat.complete() (não .create()) — precisa ser
    // envolvido em runtime, não sobrescrito via método de classe.
    const originalComplete = this.chat.complete.bind(this.chat);
    this.chat.complete = async (params) => {
      if (this.debug) {
        console.log("[CountedMistral] Creating completion:", {
          model: params.model,
          project: this.projectId,
        });
      }

      const response = await originalComplete(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedMistral] Erro ao registrar custo:", error.message);
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || "mistral-small-latest";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["mistral-small-latest"];

    // O SDK Mistral desserializa a resposta em camelCase (promptTokens),
    // diferente do padrão snake_case da OpenAI.
    const inputTokens = response.usage.promptTokens;
    const outputTokens = response.usage.completionTokens;
    const totalTokens = inputTokens + outputTokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedMistral] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedMistral] Cost:", {
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
        description: `Mistral ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedMistral] Cost recorded successfully");
    }
  }
}

export default CountedMistral;

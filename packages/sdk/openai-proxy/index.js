import OpenAI from "openai";

/**
 * Contador de Tokens - OpenAI Proxy SDK
 * Wrapper that automatically tracks costs for OpenAI API calls
 */

const MODEL_PRICES = {
  "gpt-4o": { input: 0.0000050, output: 0.000015 },
  "gpt-4-turbo": { input: 0.00001, output: 0.00003 },
  "gpt-3.5-turbo": { input: 0.0000005, output: 0.0000015 },
};

export class CountedOpenAI extends OpenAI {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "openai-gpt";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    // this.chat.completions.create é um método de instância do SDK oficial,
    // não um método de classe — precisa ser envolvido em runtime, não
    // sobrescrito via "async chat.completions.create() {}" (erro de sintaxe).
    const originalCreate = this.chat.completions.create.bind(this.chat.completions);
    this.chat.completions.create = async (params) => {
      if (this.debug) {
        console.log("[CountedOpenAI] Creating completion:", {
          model: params.model,
          project: this.projectId,
        });
      }

      const response = await originalCreate(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedOpenAI] Error recording cost:", error.message);
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || "gpt-4o";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["gpt-4o"];

    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const totalTokens = response.usage.total_tokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedOpenAI] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedOpenAI] Cost:", {
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
        description: `OpenAI ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedOpenAI] Cost recorded successfully");
    }
  }
}

export default CountedOpenAI;

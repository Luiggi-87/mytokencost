import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Contador de Tokens - Google Gemini Proxy SDK
 * Wrapper that automatically tracks costs for Google Gemini API calls
 */

const MODEL_PRICES = {
  "gemini-1.5-pro": { input: 0.00000175, output: 0.0000070 },
  "gemini-1.5-flash": { input: 0.000000075, output: 0.00000030 },
  "gemini-pro": { input: 0.0000005, output: 0.0000015 },
};

export class CountedGemini {
  constructor(options = {}) {
    this.client = new GoogleGenerativeAI(options.apiKey);
    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "google-gemini";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;
  }

  async generateContent(model, params) {
    if (this.debug) {
      console.log("[CountedGemini] Generating content:", {
        model,
        project: this.projectId,
      });
    }

    const generativeModel = this.client.getGenerativeModel({ model });
    const response = await generativeModel.generateContent(params);

    try {
      await this._recordCost(response, model);
    } catch (error) {
      console.error("[CountedGemini] Error recording cost:", error.message);
    }

    return response;
  }

  async _recordCost(response, model) {
    const prices = MODEL_PRICES[model] || MODEL_PRICES["gemini-pro"];

    // Gemini retorna token count diferente
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = inputTokens + outputTokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedGemini] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedGemini] Cost:", {
        value: cost.toFixed(6),
        currency: "BRL",
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
        description: `Google ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedGemini] ✅ Cost recorded successfully");
    }
  }
}

export default CountedGemini;

import { CohereClientV2 } from "cohere-ai";

/**
 * Contador de Tokens - Cohere Proxy SDK
 *
 * Wrapper do Cohere que automaticamente rastreia custos
 * e registra no dashboard MyTokenCost
 *
 * Uso:
 * import { CountedCohere } from '@mtc-247ia/cohere-proxy';
 *
 * const client = new CountedCohere({
 *   apiKey: process.env.COHERE_API_KEY,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 */

const MODEL_PRICES = {
  "command-r": { input: 0.00000015, output: 0.0000006 },
  "command-r-plus": { input: 0.0000025, output: 0.00001 },
  "command-a": { input: 0.0000025, output: 0.00001 },
};

export class CountedCohere extends CohereClientV2 {
  constructor(options = {}) {
    // O SDK oficial do Cohere usa "token" no construtor, não "apiKey".
    super({
      token: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "cohere";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    // client.chat() é um método de instância direto (sem sub-namespace
    // completions) — precisa ser envolvido em runtime.
    const originalChat = this.chat.bind(this);
    this.chat = async (params) => {
      if (this.debug) {
        console.log("[CountedCohere] Creating chat:", {
          model: params.model,
          project: this.projectId,
        });
      }

      const response = await originalChat(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedCohere] Erro ao registrar custo:", error.message);
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || "command-r";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["command-r"];

    // Formato de usage do Cohere v2: response.usage.tokens.{inputTokens,outputTokens}
    const inputTokens = response.usage?.tokens?.inputTokens || 0;
    const outputTokens = response.usage?.tokens?.outputTokens || 0;
    const totalTokens = inputTokens + outputTokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedCohere] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedCohere] Cost:", {
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
        description: `Cohere ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedCohere] Cost recorded successfully");
    }
  }
}

export default CountedCohere;

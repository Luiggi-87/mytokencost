import { AzureOpenAI } from "openai";

/**
 * Contador de Tokens - Azure OpenAI Proxy SDK
 *
 * Wrapper do Azure OpenAI que automaticamente rastreia custos e registra
 * no dashboard MyTokenCost.
 *
 * Azure não usa uma única API key — precisa de Endpoint do recurso +
 * Deployment Name + chave (e a versão da API). Por isso o construtor pede
 * endpoint/deployment além de apiKey.
 *
 * Uso:
 * import { CountedAzureOpenAI } from '@mtc-247ia/azure-openai-proxy';
 *
 * const client = new CountedAzureOpenAI({
 *   apiKey: process.env.AZURE_OPENAI_KEY,
 *   endpoint: process.env.AZURE_OPENAI_ENDPOINT, // https://SEU-RECURSO.openai.azure.com
 *   deployment: 'meu-deployment-gpt4o',
 *   model: 'gpt-4o', // modelo real por trás do deployment (usado só p/ preço)
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 *
 * const msg = await client.chat.completions.create({
 *   messages: [{ role: 'user', content: 'Olá' }]
 * });
 */

const MODEL_PRICES = {
  "gpt-4o": { input: 0.0000050, output: 0.000015 },
  "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
  "gpt-4-turbo": { input: 0.00001, output: 0.00003 },
};

export class CountedAzureOpenAI extends AzureOpenAI {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
      endpoint: options.endpoint,
      apiVersion: options.apiVersion || "2024-10-01-preview",
      deployment: options.deployment,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "azure-openai";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;
    // Azure roteia pelo deployment, não pelo `model` do payload — guardamos
    // o modelo real por trás do deployment só para calcular o preço certo.
    this.modelHint = options.model;

    const originalCreate = this.chat.completions.create.bind(this.chat.completions);
    this.chat.completions.create = async (params) => {
      if (this.debug) {
        console.log("[CountedAzureOpenAI] Creating completion:", {
          deployment: options.deployment,
          project: this.projectId,
        });
      }

      const response = await originalCreate(params);

      try {
        await this._recordCost(response, params);
      } catch (error) {
        console.error("[CountedAzureOpenAI] Erro ao registrar custo:", error.message);
      }

      return response;
    };
  }

  async _recordCost(response, params) {
    const model = params.model || this.modelHint || "gpt-4o";
    const prices = MODEL_PRICES[model] || MODEL_PRICES["gpt-4o"];

    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const totalTokens = response.usage.total_tokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedAzureOpenAI] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedAzureOpenAI] Cost:", { value: cost.toFixed(6), currency: "USD" });
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
        description: `Azure OpenAI ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedAzureOpenAI] Cost recorded successfully");
    }
  }
}

export default CountedAzureOpenAI;

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * Contador de Tokens - AWS Bedrock Proxy SDK
 *
 * Wrapper do AWS Bedrock Runtime que automaticamente rastreia custos e
 * registra no dashboard MyTokenCost.
 *
 * Bedrock não usa uma única API key — autentica via credenciais AWS
 * (Access Key + Secret Key + Região, SigV4). Por isso o construtor pede
 * accessKeyId/secretAccessKey/region em vez de apiKey.
 *
 * Usa a Converse API (unificada entre modelos Bedrock — Claude, Titan,
 * Llama etc.) porque ela sempre retorna `usage` em formato consistente,
 * diferente do InvokeModel (cujo corpo de resposta varia por provedor).
 *
 * Uso:
 * import { CountedBedrockRuntime, ConverseCommand } from '@mtc-247ia/bedrock-proxy';
 *
 * const client = new CountedBedrockRuntime({
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 *   region: 'us-east-1',
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 *
 * const response = await client.send(new ConverseCommand({
 *   modelId: 'anthropic.claude-sonnet-5',
 *   messages: [{ role: 'user', content: [{ text: 'Olá' }] }]
 * }));
 */

const MODEL_PRICES = {
  "anthropic.claude-opus-4-8": { input: 0.000005, output: 0.000025 },
  "anthropic.claude-sonnet-5": { input: 0.000003, output: 0.000015 },
  "anthropic.claude-haiku-4-5": { input: 0.000001, output: 0.000005 },
};

export class CountedBedrockRuntime extends BedrockRuntimeClient {
  constructor(options = {}) {
    super({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        ...(options.sessionToken ? { sessionToken: options.sessionToken } : {}),
      },
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "bedrock";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    // send() é o método de instância direto do SDK oficial (todos os
    // comandos passam por ele) — precisa ser envolvido em runtime.
    // Só registramos custo para ConverseCommand, que tem `usage` padronizado.
    const originalSend = this.send.bind(this);
    this.send = async (command, ...rest) => {
      const response = await originalSend(command, ...rest);

      if (command instanceof ConverseCommand) {
        try {
          await this._recordCost(response, command.input);
        } catch (error) {
          console.error("[CountedBedrockRuntime] Erro ao registrar custo:", error.message);
        }
      }

      return response;
    };
  }

  async _recordCost(response, input) {
    const model = input.modelId;
    const prices = MODEL_PRICES[model] || Object.values(MODEL_PRICES)[0];

    const inputTokens = response.usage?.inputTokens || 0;
    const outputTokens = response.usage?.outputTokens || 0;
    const totalTokens = response.usage?.totalTokens || inputTokens + outputTokens;

    const cost = inputTokens * prices.input + outputTokens * prices.output;

    if (this.debug) {
      console.log("[CountedBedrockRuntime] Tokens:", {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      });
      console.log("[CountedBedrockRuntime] Cost:", { value: cost.toFixed(6), currency: "USD" });
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
        description: `Bedrock ${model} - ${inputTokens}in + ${outputTokens}out tokens`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedBedrockRuntime] Cost recorded successfully");
    }
  }
}

export { ConverseCommand };
export default CountedBedrockRuntime;

import { InferenceClient } from "@huggingface/inference";

/**
 * Contador de Tokens - Hugging Face Proxy SDK
 *
 * Wrapper do Hugging Face Inference que automaticamente rastreia custos
 * e registra no dashboard MyTokenCost.
 *
 * Hugging Face não cobra por token fixo — os provedores de inferência
 * (Fal.ai, Fireworks, Together, etc.) cobram por tempo de computação.
 * Por isso o custo aqui é medido em SEGUNDOS de execução (wall-clock da
 * chamada), não em tokens. `pricePerSecond` é uma estimativa genérica —
 * ajuste para o valor real do seu provedor/plano.
 *
 * Uso:
 * import { CountedHuggingFace } from '@mtc-247ia/huggingface-proxy';
 *
 * const client = new CountedHuggingFace({
 *   apiKey: process.env.HF_TOKEN,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001',
 *   pricePerSecond: 0.0006 // opcional, ajuste ao seu provedor
 * });
 *
 * const out = await client.chatCompletion({
 *   model: 'Qwen/Qwen3-32B',
 *   messages: [{ role: 'user', content: 'Olá' }]
 * });
 */

// ponytail: estimativa genérica de GPU-segundo (não há preço fixo por
// token nesse provedor). Sobrescreva via options.pricePerSecond quando
// souber o custo real do seu provider/plano.
const DEFAULT_PRICE_PER_SECOND = 0.0006;

export class CountedHuggingFace {
  constructor(options = {}) {
    // O InferenceClient define seus métodos (chatCompletion, etc.) como
    // propriedades não-configuráveis na própria instância — não dá pra
    // sobrescrevê-los via `extends` + monkey-patch como nos outros
    // proxies. Por isso aqui usamos composição: guardamos o client oficial
    // e delegamos as chamadas.
    this._client = new InferenceClient(options.apiKey);

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "huggingface";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;
    this.pricePerSecond = options.pricePerSecond ?? DEFAULT_PRICE_PER_SECOND;
  }

  async chatCompletion(params) {
    const start = Date.now();
    const response = await this._client.chatCompletion(params);
    const durationSeconds = (Date.now() - start) / 1000;

    try {
      await this._recordCost(durationSeconds, params.model);
    } catch (error) {
      console.error("[CountedHuggingFace] Erro ao registrar custo:", error.message);
    }

    return response;
  }

  async _recordCost(durationSeconds, model) {
    const cost = durationSeconds * this.pricePerSecond;

    if (this.debug) {
      console.log("[CountedHuggingFace] Duração:", durationSeconds.toFixed(2), "s");
      console.log("[CountedHuggingFace] Cost:", { value: cost.toFixed(6), currency: "USD" });
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
        units: durationSeconds,
        unit_type: "seconds",
        description: `Hugging Face ${model || "inference"} - ${durationSeconds.toFixed(2)}s de execução`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedHuggingFace] Cost recorded successfully");
    }
  }
}

export default CountedHuggingFace;

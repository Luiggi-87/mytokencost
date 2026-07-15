import Replicate from "replicate";

/**
 * Contador de Tokens - Replicate Proxy SDK
 *
 * Wrapper do Replicate que automaticamente rastreia custos e registra no
 * dashboard MyTokenCost.
 *
 * Replicate cobra por segundo de computação do modelo (varia por hardware:
 * CPU, T4, A100, etc.), não por token fixo. Por isso o custo aqui usa o
 * `predict_time` real retornado pela API (via callback de progress do
 * `run()`) — com fallback para wall-clock caso a API não o exponha.
 * `pricePerSecond` é uma estimativa genérica — ajuste ao hardware do seu
 * modelo em https://replicate.com/pricing.
 *
 * Uso:
 * import { CountedReplicate } from '@mtc-247ia/replicate-proxy';
 *
 * const client = new CountedReplicate({
 *   apiKey: process.env.REPLICATE_API_TOKEN,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001',
 *   pricePerSecond: 0.0006 // opcional, ajuste ao hardware usado
 * });
 *
 * const output = await client.run('owner/model:version', {
 *   input: { prompt: 'Olá' }
 * });
 */

// ponytail: estimativa genérica de GPU-segundo (não há preço fixo por
// token nesse provedor). Sobrescreva via options.pricePerSecond quando
// souber o hardware/plano real do seu modelo.
const DEFAULT_PRICE_PER_SECOND = 0.0006;

export class CountedReplicate extends Replicate {
  constructor(options = {}) {
    super({
      auth: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "replicate";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;
    this.pricePerSecond = options.pricePerSecond ?? DEFAULT_PRICE_PER_SECOND;

    // run() é um método de instância direto no SDK oficial — precisa ser
    // envolvido em runtime, não sobrescrito via classe. O 3º argumento
    // (progress callback) recebe o objeto Prediction, que ao concluir traz
    // metrics.predict_time — o tempo real de computação cobrado.
    const originalRun = this.run.bind(this);
    this.run = async (identifier, params, progress) => {
      const start = Date.now();
      let predictTime = null;

      const output = await originalRun(identifier, params, (prediction) => {
        if (prediction?.metrics?.predict_time) {
          predictTime = prediction.metrics.predict_time;
        }
        if (typeof progress === "function") progress(prediction);
      });

      const durationSeconds = predictTime ?? (Date.now() - start) / 1000;

      try {
        await this._recordCost(durationSeconds, identifier);
      } catch (error) {
        console.error("[CountedReplicate] Erro ao registrar custo:", error.message);
      }

      return output;
    };
  }

  async _recordCost(durationSeconds, model) {
    const cost = durationSeconds * this.pricePerSecond;

    if (this.debug) {
      console.log("[CountedReplicate] Duração:", durationSeconds.toFixed(2), "s");
      console.log("[CountedReplicate] Cost:", { value: cost.toFixed(6), currency: "USD" });
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
        description: `Replicate ${model} - ${durationSeconds.toFixed(2)}s de execução`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedReplicate] Cost recorded successfully");
    }
  }
}

export default CountedReplicate;

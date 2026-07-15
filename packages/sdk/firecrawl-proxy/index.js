import { Firecrawl } from "firecrawl";

/**
 * Contador de Tokens - Firecrawl Proxy SDK
 *
 * Wrapper do Firecrawl que automaticamente rastreia custos de scraping
 * e registra no dashboard MyTokenCost.
 *
 * Firecrawl não é um LLM — cobra em créditos por página/operação, não em
 * tokens. Por isso o registro de custo usa unit_type: "credits" em vez de
 * "tokens", e o preço é por crédito consumido (não por input/output).
 *
 * Uso:
 * import { CountedFirecrawl } from '@mtc-247ia/firecrawl-proxy';
 *
 * const client = new CountedFirecrawl({
 *   apiKey: process.env.FIRECRAWL_API_KEY,
 *   token: process.env.MYTOKENCOST_TOKEN,
 *   projectId: 'meu-projeto',
 *   backendUrl: 'http://localhost:3001'
 * });
 *
 * const doc = await client.scrape('https://example.com');
 * const crawl = await client.crawl('https://example.com', { limit: 10 });
 * const results = await client.search('minha busca');
 */

// Preço estimado por crédito consumido (Firecrawl cobra em créditos, não
// tokens — ajuste conforme seu plano em https://firecrawl.dev/pricing).
const CREDIT_PRICE = {
  scrape: 0.00001,
  crawl: 0.00005,
  search: 0.00001,
};

export class CountedFirecrawl extends Firecrawl {
  constructor(options = {}) {
    super({
      apiKey: options.apiKey,
    });

    this.projectId = options.projectId || "unknown";
    this.apiId = options.apiId || "firecrawl";
    this.token = options.token;
    this.backendUrl = options.backendUrl || "http://localhost:3001";
    this.debug = options.debug || false;

    // scrape/crawl/search são métodos de instância diretos no SDK oficial —
    // precisam ser envolvidos em runtime, não sobrescritos via classe.
    const originalScrape = this.scrape.bind(this);
    this.scrape = async (url, params) => {
      const response = await originalScrape(url, params);
      try {
        await this._recordCost("scrape", response?.metadata?.creditsUsed, url);
      } catch (error) {
        console.error("[CountedFirecrawl] Erro ao registrar custo:", error.message);
      }
      return response;
    };

    const originalCrawl = this.crawl.bind(this);
    this.crawl = async (url, params) => {
      const response = await originalCrawl(url, params);
      try {
        await this._recordCost("crawl", response?.creditsUsed, url);
      } catch (error) {
        console.error("[CountedFirecrawl] Erro ao registrar custo:", error.message);
      }
      return response;
    };

    const originalSearch = this.search.bind(this);
    this.search = async (query, params) => {
      const response = await originalSearch(query, params);
      try {
        // A API de search não retorna creditsUsed — assume 1 crédito.
        await this._recordCost("search", 1, query);
      } catch (error) {
        console.error("[CountedFirecrawl] Erro ao registrar custo:", error.message);
      }
      return response;
    };
  }

  async _recordCost(operation, creditsUsed, target) {
    const credits = creditsUsed || 1;
    const pricePerCredit = CREDIT_PRICE[operation] ?? CREDIT_PRICE.scrape;
    const cost = credits * pricePerCredit;

    if (this.debug) {
      console.log("[CountedFirecrawl] Operação:", operation, "Créditos:", credits);
      console.log("[CountedFirecrawl] Cost:", { value: cost.toFixed(6), currency: "USD" });
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
        units: credits,
        unit_type: "credits",
        description: `Firecrawl ${operation} - ${credits} credit(s) - ${target}`,
      }),
    });

    if (!response_register.ok) {
      throw new Error(
        `Failed to record cost: ${response_register.status} ${response_register.statusText}`
      );
    }

    if (this.debug) {
      console.log("[CountedFirecrawl] Cost recorded successfully");
    }
  }
}

export default CountedFirecrawl;

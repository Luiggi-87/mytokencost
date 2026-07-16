# @mtc-247ia/firecrawl-proxy

SDK proxy para Firecrawl que **automaticamente rastreia custos de scraping** e registra no MyTokenCost.

> Firecrawl não é um LLM — é uma API de raspagem de sites (scrape/crawl/search). Por isso este pacote rastreia **créditos consumidos**, não tokens.

## 📦 Instalação

```bash
npm install @mtc-247ia/firecrawl-proxy
```

## 🚀 Uso

```javascript
import { CountedFirecrawl } from "@mtc-247ia/firecrawl-proxy";

const client = new CountedFirecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost-production.up.railway.app",
});

// Custos rastreados automaticamente ✨
const doc = await client.scrape("https://example.com");
const crawl = await client.crawl("https://example.com", { limit: 10 });
const results = await client.search("minha busca");
```

## ⚙️ Opções

```javascript
const client = new CountedFirecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY, // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN,  // ✅ Obrigatório
  projectId: "meu-projeto",              // ✅ Obrigatório
  apiId: "minha-api",                    // Opcional (default: "firecrawl")
  backendUrl: "https://mytokencost-production.up.railway.app", // Opcional
  debug: true,                           // Opcional (logs detalhados)
});
```

## 💰 Preço por crédito (estimativa)

| Operação | Preço/crédito |
|----------|---------------|
| scrape   | $0.00001      |
| crawl    | $0.00005      |
| search   | $0.00001      |

`search()` não expõe créditos consumidos na resposta, então é contado como 1 crédito por chamada. Ajuste os valores em `CREDIT_PRICE` no `index.js` conforme seu plano em [firecrawl.dev/pricing](https://firecrawl.dev/pricing).

## 📄 Licença

ISC

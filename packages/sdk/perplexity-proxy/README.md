# @mtc-247ia/perplexity-proxy

SDK proxy para Perplexity que **automaticamente rastreia custos** e registra no MyTokenCost.

## 📦 Instalação

```bash
npm install @mtc-247ia/perplexity-proxy
```

## 🚀 Uso

```javascript
import { CountedPerplexity } from "@mtc-247ia/perplexity-proxy";

const client = new CountedPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨
const message = await client.chat.completions.create({
  model: "sonar",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## ⚙️ Opções

```javascript
const client = new CountedPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY, // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN,   // ✅ Obrigatório
  projectId: "meu-projeto",               // ✅ Obrigatório
  apiId: "minha-api",                     // Opcional (default: "perplexity")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                            // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| sonar | $1.00 | $1.00 |
| sonar-pro | $3.00 | $15.00 |
| sonar-reasoning | $1.00 | $5.00 |

## 📄 Licença

ISC

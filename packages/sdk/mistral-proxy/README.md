# @mtc-247ia/mistral-proxy

SDK proxy para Mistral AI que **automaticamente rastreia custos** e registra no MyTokenCost.

## 📦 Instalação

```bash
npm install @mtc-247ia/mistral-proxy
```

## 🚀 Uso

```javascript
import { CountedMistral } from "@mtc-247ia/mistral-proxy";

const client = new CountedMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨
const response = await client.chat.complete({
  model: "mistral-small-latest",
  messages: [{ role: "user", content: "Hello!" }],
});
```

> Note: o método do SDK oficial da Mistral é `chat.complete()` (não `chat.completions.create()` como Anthropic/OpenAI).

## ⚙️ Opções

```javascript
const client = new CountedMistral({
  apiKey: process.env.MISTRAL_API_KEY, // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN, // ✅ Obrigatório
  projectId: "meu-projeto",             // ✅ Obrigatório
  apiId: "minha-api",                   // Opcional (default: "mistral")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                          // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| mistral-large-latest | $2.00 | $6.00 |
| mistral-medium-latest | $0.40 | $2.00 |
| mistral-small-latest | $0.10 | $0.30 |

## 📄 Licença

ISC

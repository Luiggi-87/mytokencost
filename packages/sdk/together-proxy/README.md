# @luiggi-87/together-proxy

SDK proxy para Together AI que **automaticamente rastreia custos** e registra no MyTokenCost.

## 📦 Instalação

```bash
npm install @luiggi-87/together-proxy
```

## 🚀 Uso

```javascript
import { CountedTogether } from "@luiggi-87/together-proxy";

const client = new CountedTogether({
  apiKey: process.env.TOGETHER_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨
const message = await client.chat.completions.create({
  model: "mistralai/Mistral-7B-Instruct-v0.1",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## ⚙️ Opções

```javascript
const client = new CountedTogether({
  apiKey: process.env.TOGETHER_API_KEY, // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN, // ✅ Obrigatório
  projectId: "meu-projeto",             // ✅ Obrigatório
  apiId: "minha-api",                   // Opcional (default: "together-ai")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                          // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| togethercomputer/llama-2-70b-chat | $0.90 | $1.20 |
| mistralai/Mistral-7B-Instruct-v0.1 | $0.20 | $0.20 |
| NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO | $0.60 | $0.60 |

## 📄 Licença

ISC

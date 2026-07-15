# @mtc-247ia/cohere-proxy

SDK proxy para Cohere que **automaticamente rastreia custos** e registra no MyTokenCost.

## 📦 Instalação

```bash
npm install @mtc-247ia/cohere-proxy
```

## 🚀 Uso

```javascript
import { CountedCohere } from "@mtc-247ia/cohere-proxy";

const client = new CountedCohere({
  apiKey: process.env.COHERE_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨
const response = await client.chat({
  model: "command-r",
  messages: [{ role: "user", content: "Hello!" }],
});
```

> Note: `chat()` é um método direto do cliente (sem sub-namespace `completions`), diferente do padrão Anthropic/OpenAI.

## ⚙️ Opções

```javascript
const client = new CountedCohere({
  apiKey: process.env.COHERE_API_KEY, // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN, // ✅ Obrigatório
  projectId: "meu-projeto",             // ✅ Obrigatório
  apiId: "minha-api",                   // Opcional (default: "cohere")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                          // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| command-r | $0.15 | $0.60 |
| command-r-plus | $2.50 | $10.00 |
| command-a | $2.50 | $10.00 |

## 📄 Licença

ISC

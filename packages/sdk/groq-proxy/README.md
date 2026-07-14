# @luiggi-87/groq-proxy

SDK proxy para Groq que **automaticamente rastreia custos** e registra no MyTokenCost.

## 📦 Instalação

```bash
npm install @luiggi-87/groq-proxy
```

## 🚀 Uso

```javascript
import { CountedGroq } from "@luiggi-87/groq-proxy";

const client = new CountedGroq({
  apiKey: process.env.GROQ_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨
const message = await client.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## ⚙️ Opções

```javascript
const client = new CountedGroq({
  apiKey: process.env.GROQ_API_KEY,     // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN, // ✅ Obrigatório
  projectId: "meu-projeto",             // ✅ Obrigatório
  apiId: "minha-api",                   // Opcional (default: "groq")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                          // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| llama-3.3-70b-versatile | $0.59 | $0.79 |
| llama-3.1-8b-instant | $0.05 | $0.08 |
| gemma2-9b-it | $0.20 | $0.20 |

## 📄 Licença

ISC

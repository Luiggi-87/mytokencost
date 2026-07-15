# @mtc-247ia/openai-proxy

SDK proxy para OpenAI que **automaticamente rastreia custos** e registra no MyTokenCost.

## 🎯 O Que Faz

Substitua suas importações do OpenAI por este proxy e:
- ✅ Custos registrados automaticamente
- ✅ Sem mudança no resto do seu código
- ✅ Funciona com todo o SDK oficial da OpenAI

## 📦 Instalação

```bash
npm install @mtc-247ia/openai-proxy
```

## 🚀 Uso

### Antes (sem tracking)
```javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const message = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Depois (com tracking automático)
```javascript
import { CountedOpenAI } from "@mtc-247ia/openai-proxy";

const client = new CountedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Mesmo código! Custos rastreados automaticamente ✨
const message = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## ⚙️ Opções

```javascript
const client = new CountedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,   // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN, // ✅ Obrigatório
  projectId: "meu-projeto",             // ✅ Obrigatório
  apiId: "minha-api",                   // Opcional (default: "openai-gpt")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                          // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| gpt-4o | $5.00 | $15.00 |
| gpt-4-turbo | $10.00 | $30.00 |
| gpt-3.5-turbo | $0.50 | $1.50 |

## 📄 Licença

ISC

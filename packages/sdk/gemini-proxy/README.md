# @mtc-247ia/gemini-proxy

SDK proxy para Google Gemini que **automaticamente rastreia custos** e registra no MyTokenCost.

## 🎯 O Que Faz

Substitua suas importações do Gemini por este proxy e:
- ✅ Custos registrados automaticamente
- ✅ Sem mudança no resto do seu código
- ✅ Funciona com o SDK oficial `@google/generative-ai`

## 📦 Instalação

```bash
npm install @mtc-247ia/gemini-proxy
```

## 🚀 Uso

```javascript
import { CountedGemini } from "@mtc-247ia/gemini-proxy";

const client = new CountedGemini({
  apiKey: process.env.GEMINI_API_KEY,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨
const response = await client.generateContent("gemini-2.0-flash", {
  contents: [{ role: "user", parts: [{ text: "Hello!" }] }],
});
```

## ⚙️ Opções

```javascript
const client = new CountedGemini({
  apiKey: process.env.GEMINI_API_KEY,   // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN, // ✅ Obrigatório
  projectId: "meu-projeto",             // ✅ Obrigatório
  apiId: "minha-api",                   // Opcional (default: "google-gemini")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                          // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| gemini-2.0-flash | $0.075 | $0.30 |

## 📄 Licença

ISC

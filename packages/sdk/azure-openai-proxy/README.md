# @mtc-247ia/azure-openai-proxy

SDK proxy para Azure OpenAI que **automaticamente rastreia custos** e registra no MyTokenCost.

> Azure não usa uma chave única — precisa de Endpoint do recurso + Deployment Name + chave. O construtor pede esses campos em vez de só `apiKey`.

## 📦 Instalação

```bash
npm install @mtc-247ia/azure-openai-proxy
```

## 🚀 Uso

```javascript
import { CountedAzureOpenAI } from "@mtc-247ia/azure-openai-proxy";

const client = new CountedAzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT, // https://SEU-RECURSO.openai.azure.com
  deployment: "meu-deployment-gpt4o",
  model: "gpt-4o", // modelo real por trás do deployment (usado só p/ preço)
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost-production.up.railway.app",
});

// Custos rastreados automaticamente ✨
const msg = await client.chat.completions.create({
  messages: [{ role: "user", content: "Olá" }],
});
```

## ⚙️ Opções

```javascript
const client = new CountedAzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,       // ✅ Obrigatório
  endpoint: process.env.AZURE_OPENAI_ENDPOINT, // ✅ Obrigatório
  deployment: "meu-deployment-gpt4o",         // ✅ Obrigatório
  apiVersion: "2024-10-01-preview",           // Opcional
  model: "gpt-4o",                            // Opcional (modelo real do deployment, usado p/ preço)
  token: process.env.MYTOKENCOST_TOKEN,       // ✅ Obrigatório
  projectId: "meu-projeto",                   // ✅ Obrigatório
  apiId: "minha-api",                         // Opcional (default: "azure-openai")
  backendUrl: "https://mytokencost-production.up.railway.app", // Opcional
  debug: true,                                // Opcional (logs detalhados)
});
```

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| gpt-4o | $5.00 | $15.00 |
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4-turbo | $10.00 | $30.00 |

## 📄 Licença

ISC

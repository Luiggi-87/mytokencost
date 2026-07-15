# @mtc-247ia/bedrock-proxy

SDK proxy para AWS Bedrock que **automaticamente rastreia custos** e registra no MyTokenCost.

> Bedrock não usa uma chave única — autentica via credenciais AWS (Access Key + Secret Key + Região, SigV4). O construtor pede esses 3 campos em vez de `apiKey`.

## 📦 Instalação

```bash
npm install @mtc-247ia/bedrock-proxy
```

## 🚀 Uso

```javascript
import { CountedBedrockRuntime, ConverseCommand } from "@mtc-247ia/bedrock-proxy";

const client = new CountedBedrockRuntime({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "us-east-1",
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨
const response = await client.send(new ConverseCommand({
  modelId: "anthropic.claude-sonnet-5",
  messages: [{ role: "user", content: [{ text: "Olá" }] }],
}));
```

## ⚙️ Opções

```javascript
const client = new CountedBedrockRuntime({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,     // ✅ Obrigatório
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // ✅ Obrigatório
  region: "us-east-1",                            // ✅ Obrigatório
  sessionToken: process.env.AWS_SESSION_TOKEN,     // Opcional (credenciais temporárias/STS)
  token: process.env.MYTOKENCOST_TOKEN,            // ✅ Obrigatório
  projectId: "meu-projeto",                        // ✅ Obrigatório
  apiId: "minha-api",                              // Opcional (default: "bedrock")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  debug: true,                                     // Opcional (logs detalhados)
});
```

## ⚠️ Limitação

O rastreamento de custo só funciona para chamadas via `ConverseCommand` (API unificada do Bedrock, com `usage` padronizado entre modelos). Chamadas via `InvokeModelCommand` não são interceptadas, pois o formato de resposta varia por provedor de modelo.

## 💰 Preços Suportados

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|-------|--------|
| anthropic.claude-opus-4-8 | $5.00 | $25.00 |
| anthropic.claude-sonnet-5 | $3.00 | $15.00 |
| anthropic.claude-haiku-4-5 | $1.00 | $5.00 |

## 📄 Licença

ISC

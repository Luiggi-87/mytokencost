# @mtc-247ia/replicate-proxy

SDK proxy para Replicate que **automaticamente rastreia custos por tempo de execução** e registra no MyTokenCost.

> Replicate cobra por segundo de computação do hardware usado (CPU, T4, A100...), não por token fixo. Este pacote usa o `predict_time` real retornado pela API (com fallback para wall-clock).

## 📦 Instalação

```bash
npm install @mtc-247ia/replicate-proxy
```

## 🚀 Uso

```javascript
import { CountedReplicate } from "@mtc-247ia/replicate-proxy";

const client = new CountedReplicate({
  apiKey: process.env.REPLICATE_API_TOKEN,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨ (por segundo de execução)
const output = await client.run("owner/model:version", {
  input: { prompt: "Olá" },
});
```

## ⚙️ Opções

```javascript
const client = new CountedReplicate({
  apiKey: process.env.REPLICATE_API_TOKEN, // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN,    // ✅ Obrigatório
  projectId: "meu-projeto",                // ✅ Obrigatório
  apiId: "minha-api",                      // Opcional (default: "replicate")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  pricePerSecond: 0.0006,                  // Opcional (default: estimativa genérica de GPU-segundo)
  debug: true,                             // Opcional (logs detalhados)
});
```

## 💰 Como o custo é calculado

```
custo = predict_time_em_segundos × pricePerSecond
```

`predict_time` vem direto da API do Replicate (tempo real de computação cobrado). `pricePerSecond` é uma **estimativa genérica** ($0.0006/s) — ajuste ao hardware do seu modelo em [replicate.com/pricing](https://replicate.com/pricing).

## 📄 Licença

ISC

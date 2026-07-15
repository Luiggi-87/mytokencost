# @mtc-247ia/huggingface-proxy

SDK proxy para Hugging Face Inference que **automaticamente rastreia custos por tempo de execução** e registra no MyTokenCost.

> Hugging Face não cobra por token fixo — os provedores de inferência (Fal.ai, Fireworks, Together, etc.) cobram por segundo de computação. Por isso este pacote mede a **duração (wall-clock) de cada chamada**, não tokens.

## 📦 Instalação

```bash
npm install @mtc-247ia/huggingface-proxy
```

## 🚀 Uso

```javascript
import { CountedHuggingFace } from "@mtc-247ia/huggingface-proxy";

const client = new CountedHuggingFace({
  apiKey: process.env.HF_TOKEN,
  token: process.env.MYTOKENCOST_TOKEN,
  projectId: "meu-projeto",
  apiId: "minha-api",
  backendUrl: "https://mytokencost.up.railway.app",
});

// Custos rastreados automaticamente ✨ (por segundo de execução)
const out = await client.chatCompletion({
  model: "Qwen/Qwen3-32B",
  messages: [{ role: "user", content: "Olá" }],
});
```

## ⚙️ Opções

```javascript
const client = new CountedHuggingFace({
  apiKey: process.env.HF_TOKEN,          // ✅ Obrigatório
  token: process.env.MYTOKENCOST_TOKEN,  // ✅ Obrigatório
  projectId: "meu-projeto",              // ✅ Obrigatório
  apiId: "minha-api",                    // Opcional (default: "huggingface")
  backendUrl: "https://mytokencost.up.railway.app", // Opcional
  pricePerSecond: 0.0006,                // Opcional (default: estimativa genérica de GPU-segundo)
  debug: true,                           // Opcional (logs detalhados)
});
```

## 💰 Como o custo é calculado

```
custo = duração_da_chamada_em_segundos × pricePerSecond
```

`pricePerSecond` é uma **estimativa genérica** ($0.0006/s). Ajuste para o valor real cobrado pelo seu provedor de inferência e plano — veja [huggingface.co/docs/inference-providers](https://huggingface.co/docs/inference-providers/index#partners).

## 📄 Licença

ISC

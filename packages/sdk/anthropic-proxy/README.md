# @contador-tokens/anthropic-proxy

SDK proxy para Anthropic Claude que **automaticamente rastreia custos** e registra no Contador de Tokens.

## 🎯 O Que Faz

Substitua suas importações do Anthropic por este proxy e:
- ✅ Custos registrados automaticamente
- ✅ Sem mudança no seu código
- ✅ Funciona com todo o Anthropic SDK

## 📦 Instalação

```bash
npm install @contador-tokens/anthropic-proxy
```

## 🚀 Uso

### Antes (sem tracking)
```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_KEY,
});

const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello, Claude!" }
  ],
});
```

### Depois (com tracking automático)
```javascript
import { CountedAnthropic } from "@contador-tokens/anthropic-proxy";

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,
  projectId: "agente-vendas", // ← Seu projeto
  backendUrl: "http://localhost:3001" // ← URL do Contador
});

// Mesmo código! Custos rastreados automaticamente ✨
const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello, Claude!" }
  ],
});
```

## ⚙️ Opções

```javascript
const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,      // ✅ Obrigatório
  projectId: "meu-projeto",                // ✅ Obrigatório (qual projeto?)
  backendUrl: "http://localhost:3001",    // Opcional (default acima)
  apiId: "anthropic-claude",              // Opcional (default acima)
  debug: true                             // Opcional (logs detalhados)
});
```

## 📊 O Que é Registrado

Para cada chamada:
- **Projeto**: qual projeto gerou o custo
- **API**: `anthropic-claude`
- **Tokens**: entrada + saída
- **Custo**: calculado em R$
- **Modelo**: qual modelo foi usado
- **Data**: quando aconteceu

No dashboard você verá:
```
Projeto: Agente de Vendas
├── Custo Total: R$ 45,50
├── Tokens Usados: 125.000
└── Histórico
    ├── Claude 3.5 Sonnet: R$ 30
    ├── Claude 3 Opus: R$ 15,50
    └── ...
```

## 💰 Preços Suportados

Preços pré-configurados em BRL (Real):

| Modelo | Input | Output |
|--------|-------|--------|
| Claude 3.5 Sonnet | R$ 0,000003 | R$ 0,000015 |
| Claude 3 Opus | R$ 0,000015 | R$ 0,00075 |
| Claude 3 Haiku | R$ 0,00000080 | R$ 0,000004 |
| Claude 3 Sonnet | R$ 0,000003 | R$ 0,000015 |

**Atualizar preços**:
Edite `MODEL_PRICES` em `index.js`

## 🔧 Troubleshooting

### "Cannot find project"
```
Erro: Failed to record cost: 404 Not Found
→ Verifique se o projectId existe no Contador
→ Crie o projeto antes via dashboard
```

### "Backend connection refused"
```
Erro: ECONNREFUSED localhost:3001
→ Verifique se Contador está rodando: npm run dev
→ Verifique backendUrl nas opções
```

### "Zero tokens recorded"
```
Problema: Custos não aparecem no dashboard
→ Ative debug: debug: true
→ Verifique logs do console
→ Refresh dashboard (F5)
```

## ✨ Features Futuros

- [ ] Cache de preços (evitar chamadas extras)
- [ ] Retry automático em falhas
- [ ] Rate limiting
- [ ] Batch de múltiplas chamadas
- [ ] Streaming support
- [ ] TypeScript types

## 📖 Documentação Completa

Ver [Contador de Tokens - Documentação](../../README.md)

## 🐛 Issues

Encontrou um bug? 
1. Ative `debug: true`
2. Reproduza o problema
3. Verifique os logs
4. Abra uma issue com os logs

## 📄 Licença

ISC

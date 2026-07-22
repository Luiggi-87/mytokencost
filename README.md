# 💰 MyTokenCost

Sistema multi-tenant para rastrear, calcular e gerenciar custos de múltiplas APIs de IA (Anthropic, OpenAI, Google, Groq, Mistral, Cohere, Perplexity, Together AI, Firecrawl, etc.), com dashboard em tempo real, alertas, webhooks e relatórios. Todos os valores são exibidos e cobrados em **USD**.

**Produção:**
- Frontend: https://mtc.247ia.com.br (Netlify)
- Backend: https://mytokencost-production.up.railway.app (Railway + PostgreSQL)

## 🚀 Rodando localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Acesso: http://localhost:3001 (usa SQLite local automaticamente — veja `server/db.js`)

Build de produção: `npm run build && npm run start`

## 📊 Funcionalidades

- **Autenticação JWT** multi-tenant (cada usuário só vê seus próprios dados), com fluxo de **reset de senha** por email
- **Dashboard em tempo real** via WebSocket (Socket.io) — total gasto, por API, por projeto, últimos 30 dias
- **APIs suportadas**: Anthropic, OpenAI, Google AI Studio, Groq, Mistral, Cohere, Perplexity, Together AI, AWS Bedrock, Azure OpenAI, Hugging Face, Replicate, Firecrawl, customizável (13 provedores em `server/prices.json`)
- **Validação de chave em tempo real**: aba Integração testa a chave do cliente direto na API oficial do provedor (Anthropic, OpenAI, Google, Groq, Perplexity) e cruza com modelos ativos agora mesmo — quando um provedor aposenta um modelo, ele some da lista testada automaticamente, sem precisar editar código (`server/routes/integrations.js`)
- **Projetos/Clientes**: taxa mensal de referência, custos segmentados
- **Rastreamento de custos**: manual ou automático via SDKs proxy (`packages/sdk/*`) — 13 provedores com pacote pronto (12 publicados no npm, 1 com publicação pendente)
- **Webhooks**: notificação em eventos de custo, retry automático
- **Alertas**: limite de gasto, detecção de anomalia (email/Slack/webhook)
- **Relatórios**: PDF, CSV, JSON
- **Stripe**: criação de customer e cobrança automática por projeto (USD)

## 🗄️ Banco de Dados

- **Local/dev**: SQLite (`server/db.js` detecta ausência de `DATABASE_URL`)
- **Produção**: PostgreSQL (Railway), selecionado automaticamente quando `DATABASE_URL` está presente
- Conversão de dialeto SQLite→PostgreSQL é automática (`convertQuery()` em `server/db.js`)

Tabelas: `users` (inclui `reset_token`/`reset_token_expires`), `apis`, `projects`, `costs`, `webhooks`, `alerts`, `audit_logs`, `settings`

## 🔌 Endpoints principais

Todas as rotas (exceto `/api/auth/*` e `/api/health`) exigem header `Authorization: Bearer <token>`.

```
POST   /api/auth/register         POST /api/auth/login       GET /api/auth/me
POST   /api/auth/forgot-password  POST /api/auth/reset-password
GET    /api/apis                  POST/PUT/DELETE /api/apis/:id
GET    /api/projects              POST/PUT/DELETE /api/projects/:id
GET    /api/costs                 POST/DELETE /api/costs/:id
GET    /api/dashboard/summary     GET /api/dashboard/monthly
GET    /api/webhooks              POST/DELETE /api/webhooks/:id
GET    /api/alerts                POST/DELETE/PATCH /api/alerts/:id
GET    /api/reports/*
GET    /api/health                (sem autenticação)
```

Exemplos completos de uso: [DADOS_EXEMPLO.md](DADOS_EXEMPLO.md)

## 📦 Estrutura do Projeto

```
server/
  index.js              # Servidor Express + WebSocket
  db.js                 # Conexão SQLite/PostgreSQL + helpers (dbRun, dbGet, dbAll)
  auth.js               # JWT, bcrypt, reset de senha, middleware
  email.js               # Envio de email (SMTP opcional; sem config, loga o link no console)
  stripe.js              # Integração Stripe
  sentry.js              # Error tracking (opcional, via SENTRY_DSN)
  routes/                # auth (login/registro/reset), apis, projects, costs, dashboard, webhooks, alerts, reports, stripe
client/
  App.jsx, components/, styles/, main.jsx
packages/sdk/
  anthropic-proxy/, openai-proxy/, gemini-proxy/,      # SDKs com rastreamento automático de custo
  groq-proxy/, mistral-proxy/, cohere-proxy/,          # publicados no npm sob @mtc-247ia/*-proxy
  perplexity-proxy/, together-proxy/,
  huggingface-proxy/, replicate-proxy/, firecrawl-proxy/,
  bedrock-proxy/, azure-openai-proxy/
monitor.js               # Script de monitoramento de produção
.github/workflows/monitor.yml   # Monitoramento automático (a cada 6h)
```

## 🌐 Deploy

Guia completo: [DEPLOY.md](DEPLOY.md) — Railway (backend), Netlify (frontend), variáveis de ambiente, monitoramento, troubleshooting.

## 💻 SDKs com rastreamento automático

```bash
npm install @mtc-247ia/anthropic-proxy
```
```javascript
import { CountedAnthropic } from "@mtc-247ia/anthropic-proxy";
const client = new CountedAnthropic({ apiKey: process.env.ANTHROPIC_KEY, projectId: "seu-projeto" });
// Custos rastreados automaticamente
```

Publicados no npm sob o escopo `@mtc-247ia`, todos com o mesmo padrão (`Counted<Provider>`, mesmas opções de construtor):

| Provedor | Pacote |
|----------|--------|
| Anthropic | `@mtc-247ia/anthropic-proxy` |
| OpenAI | `@mtc-247ia/openai-proxy` |
| Google Gemini | `@mtc-247ia/gemini-proxy` |
| Groq | `@mtc-247ia/groq-proxy` |
| Mistral AI | `@mtc-247ia/mistral-proxy` |
| Cohere | `@mtc-247ia/cohere-proxy` |
| Perplexity AI | `@mtc-247ia/perplexity-proxy` |
| Together AI | `@mtc-247ia/together-proxy` (publicação pendente, retry manual) |
| Hugging Face | `@mtc-247ia/huggingface-proxy` |
| Replicate | `@mtc-247ia/replicate-proxy` |
| Firecrawl | `@mtc-247ia/firecrawl-proxy` |
| AWS Bedrock | `@mtc-247ia/bedrock-proxy` |
| Azure OpenAI | `@mtc-247ia/azure-openai-proxy` |

O nome do método de chat varia por provedor (`chat.completions.create` na maioria, `chat.complete` na Mistral, `chat()` direto na Cohere) — ver o README de cada pacote ou [INTEGRACAO_DEVS.md](INTEGRACAO_DEVS.md) para exemplos completos, incluindo os provedores "especiais" (Hugging Face/Replicate cobram por tempo de execução, Firecrawl por créditos, Bedrock/Azure precisam de credenciais multi-campo).

## 🔐 Segurança

- Senhas com bcrypt (10 rounds), JWT (7 dias), CORS configurado, WebSocket autenticado, isolamento de dados por usuário, prepared statements.

## 🐛 Troubleshooting

Ver seção "Troubleshooting" em [DEPLOY.md](DEPLOY.md) — inclui o caso já resolvido de requisições `auth/register`/`login` travando por ~5min (export default quebrado em `db.js`).

## 📝 Histórico do projeto

Ver [CHANGELOG.md](CHANGELOG.md) para o histórico de decisões e fases de implementação.

## 📄 Licença

MIT

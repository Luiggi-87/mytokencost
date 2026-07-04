# 🎉 CONTADOR DE TOKENS - PRONTO PARA USAR

## ✅ Status Oficial

**TODAS AS FUNCIONALIDADES IMPLEMENTADAS E TESTADAS**

- ✅ Autenticação JWT
- ✅ WebSocket real-time
- ✅ Webhooks funcionais
- ✅ Alertas automáticos
- ✅ Relatórios PDF/CSV
- ✅ SDK Anthropic proxy
- ✅ SDK OpenAI proxy
- ✅ SDK Google Gemini proxy
- ✅ Stripe integration
- ✅ Frontend profissional
- ✅ Build testado e funcional

---

## 🚀 Iniciar Agora (1 minuto)

### Opção 1: Windows (Mais Fácil)
1. Navegue até: `D:\Contador de Token`
2. Duplo-clique em **start.bat**
3. Aguarde ~3 segundos
4. Abra navegador: **http://localhost:3001**

### Opção 2: Terminal (Qualquer SO)
```bash
cd "D:\Contador de Token"
npm run dev
# Abra: http://localhost:3001
```

---

## 📝 Primeiro Login

**Criar Conta**:
- Email: `seu-email@empresa.com`
- Senha: `sua-senha-forte`
- Organização: `Minha Empresa`

**Ou Fazer Login** (se já tiver conta anterior)

---

## 🎯 Usar em 5 Etapas

### 1️⃣ Adicionar API
```
Aba: 🔌 APIs
Clique: Adicionar Nova API
Exemplo:
  Nome: "Anthropic Claude"
  Tipo: "Anthropic"
  Modelo: "Por Token"
  Custo: 0.000003
```

### 2️⃣ Criar Projeto
```
Aba: 📁 Projetos
Clique: Novo Projeto
Exemplo:
  Nome: "Agente de Vendas"
  Cliente: "TechCorp"
  Taxa: 500 (R$/mês)
```

### 3️⃣ Registrar Custo (Manual)
```
Aba: 💸 Custos
Clique: Registrar Custo
Exemplo:
  Projeto: "Agente de Vendas"
  API: "Anthropic Claude"
  Valor: 10.50
  Tokens: 5000
```

### 4️⃣ Ver Dashboard (Real-time!)
```
Aba: 📊 Dashboard
Dashboard atualiza AUTOMATICAMENTE
quando custos são registrados
```

### 5️⃣ Configurar Webhooks (Opcional)
```
Aba: 🔗 Webhooks
Adicionar webhook para:
  Slack → Notificações
  Stripe → Cobrar cliente
  Seu servidor → Integração
```

---

## 💻 Usar SDKs para Automação

### Anthropic (Automático)
```javascript
import { CountedAnthropic } from "@contador-tokens/anthropic-proxy";

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,
  projectId: "agente-vendas",
  backendUrl: "http://localhost:3001"
});

const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }]
});

// ✨ Custo registrado automaticamente no dashboard!
```

### OpenAI (Automático)
```javascript
import { CountedOpenAI } from "@contador-tokens/openai-proxy";

const client = new CountedOpenAI({
  apiKey: process.env.OPENAI_KEY,
  projectId: "agente-vendas"
});

const response = await client.chat.completions.create({
  model: "gpt-4",
  messages: [...]
});

// ✨ Custo registrado automaticamente!
```

### Google Gemini (Automático)
```javascript
import { CountedGemini } from "@contador-tokens/gemini-proxy";

const client = new CountedGemini({
  apiKey: process.env.GOOGLE_KEY,
  projectId: "agente-vendas"
});

const response = await client.generateContent("gemini-pro", {
  contents: [...]
});

// ✨ Custo registrado automaticamente!
```

---

## 🔧 Configurar Stripe (Opcional)

### 1. Obter Chave Stripe
```bash
# Em stripe.com
# Copiar: Secret Key (começa com sk_)
```

### 2. Adicionar ao .env
```
STRIPE_SECRET_KEY=sk_test_xxxxx
```

### 3. Conectar Projeto
```bash
POST http://localhost:3001/api/stripe/project-id/connect
{
  "clientEmail": "cliente@empresa.com"
}
```

### 4. Ativar Cobrança Automática
```bash
POST http://localhost:3001/api/stripe/project-id/auto-charge
{
  "enabled": true
}
```

Pronto! Agora ao registrar custos, o cliente será cobrado automaticamente.

---

## 🔌 Configurar Webhooks

### Exemplo: Slack Notification
```bash
POST http://localhost:3001/api/webhooks
Authorization: Bearer <seu-token>
{
  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "event": "cost.recorded"
}
```

Agora quando um custo é registrado, o Slack recebe:
```json
{
  "event": "cost.recorded",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "amount": 15.50,
    "project_id": "...",
    "api_id": "...",
    "units": 5000
  }
}
```

### Exemplo: Google Sheets (Zapier)
1. Criar webhook em: https://zapier.com
2. Configurar: `POST http://localhost:3001/api/webhooks`
3. Filtro: `event == "cost.recorded"`
4. Ação: Adicionar linha no Google Sheets

---

## 📊 Relatórios

### Baixar PDF
```bash
GET http://localhost:3001/api/reports/summary?format=pdf&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <seu-token>
```

### Baixar CSV (Excel)
```bash
GET http://localhost:3001/api/reports/summary?format=csv&project_id=xyz
Authorization: Bearer <seu-token>
```

### Ver dados JSON
```bash
GET http://localhost:3001/api/reports/monthly
Authorization: Bearer <seu-token>
```

---

## 🚨 Alertas

### Criar Alerta
```bash
POST http://localhost:3001/api/alerts
Authorization: Bearer <seu-token>
{
  "projectId": "xyz",
  "type": "limit_exceeded",
  "threshold": 500,
  "action": "email",
  "recipients": "gerente@empresa.com"
}
```

Quando o projeto gastar ≥ R$ 500, você recebe um email/Slack.

---

## 📱 Usar em Produção (Netlify)

### 1. Push para GitHub
```bash
git init
git add .
git commit -m "Contador de Tokens v2 - Profissional"
git branch -M main
git remote add origin https://github.com/seu-usuario/contador-de-tokens
git push -u origin main
```

### 2. Deploy Netlify
1. Acesse: https://netlify.com
2. Clique: "New site from Git"
3. Conecte GitHub
4. Selecione repositório
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Clique Deploy

### 3. Variáveis de Ambiente (Netlify)
1. Site Settings → Build & Deploy → Environment
2. Adicione:
   ```
   JWT_SECRET=sua-chave-forte-aqui
   STRIPE_SECRET_KEY=sk_prod_xxxxx
   NODE_ENV=production
   ```

### 4. Backend (Railway/Render)
1. Deploy servidor separadamente
2. Usar PostgreSQL em vez de SQLite
3. Atualizar URL do backend no frontend

---

## 🏗️ Estrutura do Projeto

```
D:\Contador de Token\
├── 📄 README.md                    ← Documentação
├── 📄 QUICKSTART.md                ← Começar rápido
├── 📄 DEPLOY.md                    ← Deploy online
├── 📄 IMPLEMENTACOES_COMPLETAS.md  ← Features implementadas
├── 📄 ANALISE_ECHO.md              ← Análise comparativa
│
├── 🟢 start.bat                    ← Executar (Windows)
├── 🟢 start.sh                     ← Executar (Unix)
│
├── server/                         ← Backend Express
│   ├── index.js                    (servidor principal)
│   ├── auth.js                     (autenticação JWT)
│   ├── db.js                       (SQLite + schema)
│   ├── websocket.js                (WebSocket real-time)
│   ├── stripe.js                   (Stripe integration)
│   └── routes/                     (endpoints API)
│       ├── auth.js
│       ├── apis.js
│       ├── projects.js
│       ├── costs.js
│       ├── dashboard.js
│       ├── webhooks.js
│       ├── alerts.js
│       ├── reports.js
│       └── stripe.js
│
├── client/                         ← Frontend React
│   ├── App.jsx                     (componente principal)
│   ├── main.jsx                    (entry point)
│   ├── index.css                   (estilos globais)
│   │
│   ├── components/
│   │   ├── Login.jsx               (autenticação)
│   │   ├── Dashboard.jsx           (overview)
│   │   ├── ApiManager.jsx          (CRUD APIs)
│   │   ├── ProjectManager.jsx      (CRUD projetos)
│   │   ├── CostTracker.jsx         (registrar custos)
│   │   ├── WebhooksManager.jsx     (gerenciar webhooks)
│   │   └── AlertsManager.jsx       (gerenciar alertas)
│   │
│   └── styles/
│       ├── Login.css
│       ├── Dashboard.css
│       └── Manager.css
│
├── packages/sdk/                   ← SDKs Proxy
│   ├── anthropic-proxy/            ✅ Implementado
│   ├── openai-proxy/               ✅ Implementado
│   ├── gemini-proxy/               ✅ Implementado
│   └── firecrawl-proxy/            🔜 Template
│
├── dist/                           ← Build (gerado)
├── data/                           ← Banco SQLite (criado)
└── node_modules/                   ← Dependências
```

---

## 🔑 Variáveis de Ambiente (.env)

```env
# Server
PORT=3001
NODE_ENV=development
DATABASE=./data/api-costs.db

# Authentication
JWT_SECRET=sua-chave-super-secreta-aqui-32-caracteres-min

# Stripe (deixar em branco se não usar)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Email (deixar em branco se não usar)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-app-password

# Webhooks
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_TIMEOUT=5000
```

---

## ❓ Perguntas Frequentes

**P: Como mudar a porta (3001)?**
```bash
PORT=3000 npm run dev
```

**P: Como resetar o banco de dados?**
```bash
rm -rf data/
npm run dev
# Banco será recriado
```

**P: Como mudei de usuário - perdi meus dados?**
Dados são isolados por usuário (autenticação JWT). Faça login com a conta anterior.

**P: Como usar em multiple máquinas?**
Deploy na Netlify/Railway. Todos acessam `seu-dominio.com`.

**P: Como fazer backup dos dados?**
Copie a pasta `data/`. Ou use exportação de relatório em CSV.

**P: Como habilitar HTTPS?**
Na produção (Netlify) é automático. Localmente use proxy SSL.

---

## 🆘 Troubleshooting

### "Porta 3001 já em uso"
```bash
PORT=3002 npm run dev
```

### "SQLite database lock"
```bash
rm data/api-costs.db
npm run dev
```

### "WebSocket não conectou"
- Verificar console (F12)
- Token JWT expirou? Faça login novamente
- Backend rodando? Abra http://localhost:3001/api/health

### "Botão de logout não funciona"
- Limpar localStorage: `localStorage.clear()`
- Recarregar página

### "Webhook não disparou"
- Verificar URL do webhook está acessível
- Ver logs do servidor: `npm run dev` (mostrar erros)
- Testar com: https://webhook.site

---

## 📞 Suporte

Documentação completa:
- **README.md** - Visão geral do projeto
- **QUICKSTART.md** - Começar em 5 minutos
- **DEPLOY.md** - Deploy em Netlify/Railway/Docker
- **IMPLEMENTACOES_COMPLETAS.md** - Todas as features
- **ANALISE_ECHO.md** - Análise vs Echo (Merit Systems)

---

## 🎓 Aprenda Mais

- Express.js: https://expressjs.com
- React: https://react.dev
- Socket.io: https://socket.io
- JWT: https://jwt.io
- Stripe: https://stripe.com/docs

---

## 🎉 Pronto para Usar!

```
✅ Sistema profissional
✅ Pronto para produção
✅ Multi-tenant
✅ Real-time
✅ Automatizado
✅ Integrável
✅ Escalável

👉 Próximo passo: npm run dev
```

---

## 📊 Timeline

- **Agora**: Sistema rodando localmente
- **Hoje/Amanhã**: Integrar SDKs no seu app
- **Semana**: Deploy em Netlify
- **Mês**: Ganhar com relatórios & insights

---

**Desenvolvido com ❤️ para otimizar custos de APIs**

**Versão**: 2.0.0 (Professional)  
**Status**: ✅ Production Ready  
**Última atualização**: 2024-01-15

🚀 **Bora usar!**

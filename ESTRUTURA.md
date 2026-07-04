# 📁 Estrutura do Projeto

```
contador-de-token/
│
├── 📄 README.md                    # Documentação principal
├── 📄 QUICKSTART.md                # Guia rápido (5 min)
├── 📄 DEPLOY.md                    # Como hospedar online
├── 📄 DADOS_EXEMPLO.md             # Exemplos de API calls
├── 📄 ESTRUTURA.md                 # Este arquivo
│
├── 📄 package.json                 # Dependências Node
├── 📄 vite.config.js               # Config build frontend
├── 📄 index.html                   # Template HTML
├── 📄 .env                         # Variáveis de ambiente
├── 📄 .env.example                 # Exemplo .env
├── 📄 .gitignore                   # Git ignore
├── 📄 netlify.toml                 # Config Netlify deploy
│
├── 🟢 start.bat                    # Script iniciar (Windows)
├── 🟢 start.sh                     # Script iniciar (Unix)
│
├── 📁 server/                      # 🚀 BACKEND (Node.js + Express)
│   ├── 📄 index.js                 # Servidor principal
│   ├── 📄 db.js                    # Inicialização SQLite
│   │
│   └── 📁 routes/                  # Rotas da API
│       ├── 📄 apis.js              # GET/POST/PUT/DELETE /api/apis
│       ├── 📄 projects.js          # GET/POST/PUT/DELETE /api/projects
│       ├── 📄 costs.js             # GET/POST/DELETE /api/costs
│       └── 📄 dashboard.js         # GET /api/dashboard/*
│
├── 📁 client/                      # 💻 FRONTEND (React)
│   ├── 📄 main.jsx                 # Entry point React
│   ├── 📄 App.jsx                  # Componente principal
│   ├── 📄 index.css                # CSS global
│   ├── 📄 App.css                  # CSS App
│   ├── 📄 package.json
│   │
│   ├── 📁 components/              # Componentes React
│   │   ├── 📄 Dashboard.jsx        # 📊 Dashboard
│   │   ├── 📄 ApiManager.jsx       # 🔌 Gerenciador de APIs
│   │   ├── 📄 ProjectManager.jsx   # 📁 Gerenciador de Projetos
│   │   └── 📄 CostTracker.jsx      # 💸 Rastreador de Custos
│   │
│   └── 📁 styles/                  # Estilos específicos
│       ├── 📄 Dashboard.css
│       └── 📄 Manager.css
│
├── 📁 dist/                        # 🏗️ Build output (gerado por: npm run build)
│   ├── 📄 index.html
│   ├── 📁 assets/
│   │   ├── *.css
│   │   └── *.js
│
├── 📁 data/                        # 💾 Banco de dados (criado automaticamente)
│   └── 📄 api-costs.db             # SQLite database
│
└── 📁 node_modules/               # 📦 Dependências (npm install)
```

## 🔄 Fluxo de Dados

```
Frontend (React)
    ↓ HTTP
    ↓
Backend (Express)
    ↓
SQLite Database (data/api-costs.db)

┌─────────────────────────────────────┐
│     DASHBOARD (http://localhost:3001)│
├─────────────────────────────────────┤
│                                     │
│  📊 Dashboard      💸 Custos        │
│  📁 Projetos       🔌 APIs          │
│                                     │
└─────────────────────────────────────┘
         ↓ chamadas HTTP
    /api/dashboard/summary
    /api/dashboard/monthly
    /api/costs
    /api/projects
    /api/apis
         ↓
   Banco SQLite
```

## 🔌 API Endpoints

### APIs
```
GET    /api/apis                  # Listar todas
POST   /api/apis                  # Criar nova
PUT    /api/apis/:id              # Atualizar
DELETE /api/apis/:id              # Deletar
GET    /api/apis/types            # Tipos disponíveis
```

### Projetos
```
GET    /api/projects              # Listar todas
POST   /api/projects              # Criar novo
PUT    /api/projects/:id          # Atualizar
DELETE /api/projects/:id          # Deletar
```

### Custos
```
GET    /api/costs                 # Listar (com filtros)
POST   /api/costs                 # Registrar novo
DELETE /api/costs/:id             # Deletar

Query params:
?project_id=xxx                   # Filtrar por projeto
?api_id=xxx                       # Filtrar por API
?start_date=2024-01-01            # Data inicial
?end_date=2024-01-31              # Data final
```

### Dashboard
```
GET    /api/dashboard/summary     # Resumo geral
GET    /api/dashboard/monthly     # Últimos 30 dias
```

### Health
```
GET    /api/health                # Status do servidor
```

## 📊 Banco de Dados

### Tabelas

**apis**
- id (uuid, PK)
- name (texto único)
- type (categoria)
- api_key (texto)
- base_url (texto)
- pricing_model (por_token, por_requisicao, etc)
- unit_cost (número)
- created_at, updated_at

**projects**
- id (uuid, PK)
- name (texto único)
- client_name (texto)
- description (texto)
- monthly_rate (número)
- created_at, updated_at

**costs**
- id (uuid, PK)
- project_id (FK → projects)
- api_id (FK → apis)
- amount (número - valor em R$)
- units (número - quantidade)
- unit_type (tokens, requisições, etc)
- description (texto)
- date (datetime)
- created_at

**settings**
- key (texto, PK)
- value (texto)
- updated_at

## 🚀 Scripts NPM

```bash
npm install          # Instalar dependências
npm run dev          # Rodar em desenvolvimento (http://localhost:3001)
npm run build        # Build do frontend para produção
npm run start        # Rodar em produção
npm run preview      # Preview do build
```

## 🛠️ Tecnologias

**Backend**
- Node.js 16+
- Express 5.x
- SQLite 3
- UUID
- CORS, Morgan

**Frontend**
- React 18.x
- Vite (build tool)
- CSS (vanilla)

## 📈 Escalabilidade

### Fácil migrar para:

**PostgreSQL** (melhor para produção)
```
npm install pg
Mudar: server/db.js para usar postgres client
```

**Supabase** (hosted PostgreSQL)
```
DATABASE_URL=postgresql://...@supabase.co/postgres
```

**MongoDB** (NoSQL)
```
npm install mongoose
Reimplementar models com Mongoose
```

## 🔐 Segurança

✅ Já tem:
- CORS configurado
- Input validation básico
- SQL Injection protection (prepared statements)

❌ Adicionar antes de produção:
- Autenticação de usuários (JWT)
- HTTPS
- Rate limiting
- API key validation
- Audit logging

## 📱 Deployment Options

| Platform | Dificuldade | Custo | Banco |
|----------|-------------|-------|-------|
| Netlify | ⭐ Fácil | Grátis | ❌ SQLite não persiste |
| Railway | ⭐⭐ Médio | $5/mês | ✅ PostgreSQL |
| Render | ⭐⭐ Médio | Grátis | ✅ PostgreSQL |
| Docker | ⭐⭐⭐ Difícil | Varia | ✅ Qualquer |
| Servidor Caseiro | ⭐⭐⭐⭐ Muito difícil | Energia | ✅ Qualquer |

## 📚 Próximas Features

- [ ] Integração com APIs reais (sync automático)
- [ ] Autenticação de usuários
- [ ] Webhooks para eventos
- [ ] Export PDF/CSV
- [ ] Alertas de limite de gasto
- [ ] Previsão com ML
- [ ] Mobile app
- [ ] Faturamento automático (Stripe)


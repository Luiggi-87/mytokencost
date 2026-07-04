# 💰 MyTokenCost - Real-time API Cost Management

Complete system to track, calculate, and manage costs from multiple APIs (Anthropic, OpenAI, Google, Firecrawl, etc.). Ready to run locally and deploy to Netlify.

## 🚀 Quick Start

### Requisitos
- Node.js 16+
- npm ou yarn

### Instalação Local

```bash
# 1. Instalar dependências
npm install

# 2. Copiar arquivo de configuração
cp .env.example .env

# 3. Rodar servidor (desenvolvimento)
npm run dev
```

Acesso: http://localhost:3001

### Build para Produção

```bash
# Build do frontend
npm run build

# Rodar servidor em produção
npm run start
```

## 📊 Funcionalidades

### Dashboard
- **Total Gasto**: Visualização em tempo real
- **Por API**: Breakdown detalhado por provedor (Anthropic, OpenAI, Google, etc.)
- **Por Projeto**: Custos segmentados por cliente/projeto
- **Gráficos**: Últimos 30 dias e tendências

### Gerenciamento de APIs
Suporte para:
- 🧠 Anthropic Claude
- 🤖 OpenAI
- 🔍 Google AI Studio
- 🔥 Firecrawl
- 🤗 Hugging Face
- 📝 Cohere
- ⚡ Mistral
- ⚙️ Groq
- 🎬 Replicate
- 📦 Customizável

Modelos de precificação:
- Por Token
- Por Requisição
- Por Minuto
- Por GB
- Subscription

### Projetos
- Criar projetos com cliente associado
- Taxa mensal de referência
- Rastreamento de custos por projeto

### Rastreamento de Custos
- Registrar custos por API/Projeto
- Incluir quantidade de unidades (tokens, requisições, etc)
- Histórico completo
- Filtros por período

## 🗄️ Banco de Dados

Usa **SQLite** localmente. Migração para Supabase (PostgreSQL) é trivial depois.

### Tabelas
- `apis`: Configuração de APIs
- `projects`: Projetos/Clientes
- `costs`: Histórico de custos
- `settings`: Configurações gerais

## 🌐 Deploy na Netlify

### Opção 1: Netlify Functions (Recomendado)

1. Push para GitHub
2. Conectar repo no Netlify
3. Configurar build:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
4. Adicionar variáveis de ambiente:
   ```
   NODE_ENV=production
   DATABASE=./.netlify/cache/api-costs.db
   ```

### Opção 2: Railway / Render (Servidor Node)

1. Deploy como app Node.js padrão
2. Usar PostgreSQL/Supabase em vez de SQLite
3. Variáveis de ambiente necessárias

## 🔧 Configuração

### .env
```env
PORT=3001
NODE_ENV=development
DATABASE=./data/api-costs.db
```

## 📦 Estrutura do Projeto

```
.
├── server/
│   ├── index.js           # Servidor Express
│   ├── db.js              # Inicialização SQLite
│   └── routes/
│       ├── apis.js        # API de APIs
│       ├── projects.js    # API de Projetos
│       ├── costs.js       # API de Custos
│       └── dashboard.js   # API de Dashboard
├── client/
│   ├── App.jsx            # Componente principal
│   ├── components/        # Componentes React
│   ├── styles/            # CSS
│   └── main.jsx           # Entry point
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

## 🎯 Caso de Uso

1. **Configurar APIs**: Adicione suas chaves de API e modelos de preço
2. **Criar Projetos**: Crie um projeto para cada cliente
3. **Registrar Custos**: Registre cada custo/consumo manualmente ou via integração
4. **Analisar**: Veja o dashboard para entender os gastos
5. **Cobrar**: Use os dados para cobrar clientes de forma precisa

## 🔌 Integrações Futuras

- [ ] Sync automático com APIs (Anthropic, OpenAI, etc)
- [ ] Export de relatórios (PDF, CSV)
- [ ] Webhooks para eventos de custo
- [ ] Alertas de limite de gastos
- [ ] Multi-tenant para gestores de agência

## 📝 Roadmap

- [ ] GraphQL API
- [ ] Autenticação de usuários
- [ ] Auditorias de acesso
- [ ] Integração com Stripe para invoicing automático
- [ ] Mobile app
- [ ] Previsão de custos com ML

## 🐛 Troubleshooting

**Erro de porta em uso**
```bash
# Mudar porta
PORT=3002 npm run dev
```

**Banco de dados corrompido**
```bash
# Remover banco (vai recrear)
rm -rf data/
npm run dev
```

## 📄 Licença

MIT

## 💬 Suporte

Dúvidas? Crie uma issue no repositório.

---

**Desenvolvido com ❤️ para otimizar custos de APIs**

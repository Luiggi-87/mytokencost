# 🚀 Guia de Deploy

## Local (Desenvolvimento)

```bash
npm install
npm run dev
```

Acesso: http://localhost:3001

---

## Netlify (Recomendado)

### Pré-requisitos
- Conta no Netlify (gratuita)
- Repositório GitHub

### Passo 1: Preparar Repositório

```bash
git init
git add .
git commit -m "Initial commit: Contador de Tokens API Cost Manager"
git branch -M main
git remote add origin https://github.com/seu-usuario/contador-de-token.git
git push -u origin main
```

### Passo 2: Deploy no Netlify

1. Acesse [netlify.com](https://netlify.com)
2. Clique em "New site from Git"
3. Selecione GitHub e autorize
4. Selecione o repositório `contador-de-token`
5. Configurar build:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Clique em "Deploy"

### Passo 3: Variáveis de Ambiente

No painel Netlify:
1. Site → Settings → Build & deploy → Environment
2. Adicione:
   ```
   PORT = 3001
   NODE_ENV = production
   DATABASE = ./.netlify/cache/api-costs.db
   ```

### Deploy Automático

Toda vez que fizer push para `main`, o Netlify faz deploy automaticamente.

---

## Railway (Alternativa com Servidor Node)

### Passo 1: Criar Conta

Acesse [railway.app](https://railway.app) e faça login com GitHub

### Passo 2: Novo Projeto

1. Clique em "New Project"
2. Selecione "Deploy from GitHub repo"
3. Autorize e selecione o repositório

### Passo 3: Variáveis de Ambiente

```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://... (usar Postgres, não SQLite)
```

### Passo 4: Deploy

Railway faz deploy automaticamente ao detectar alterações no `main`.

---

## Render (Alternativa com Banco PostgreSQL)

### Passo 1: Criar Serviço

1. Acesse [render.com](https://render.com)
2. Clique "New +" → "Web Service"
3. Conecte seu GitHub

### Passo 2: Configurar

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Environment**: Node
- **Region**: Escolha a mais próxima

### Passo 3: Banco de Dados

Criar PostgreSQL no Render e usar connection string no `.env`

---

## Docker (Self-hosted)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

Deploy:
```bash
docker build -t contador-tokens .
docker run -p 3001:3001 -e NODE_ENV=production contador-tokens
```

---

## Servidor Caseiro (Futuro)

Quando tiver servidor dedicado:

1. Instalar Node.js
2. Git clone do repositório
3. `npm install && npm run build`
4. Usar PM2 para rodar em background:
   ```bash
   npm install -g pm2
   pm2 start "npm run start" --name "contador-tokens"
   pm2 save
   pm2 startup
   ```

---

## Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados funcionando
- [ ] Build completa sem erros (`npm run build`)
- [ ] Frontend acessível
- [ ] API endpoints respondendo (`/api/health`)
- [ ] Dados persistindo após reinicialização

---

## Monitoramento

### Logs
- **Netlify**: Site → Functions → Logs
- **Railway**: Logs aba no dashboard
- **Render**: Logs aba no serviço

### Health Check
```bash
curl https://seu-dominio.com/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## Troubleshooting

**Erro 404 em rotas**
- Verificar se `netlify.toml` está correto
- Redeployo: `npm run build` localmente

**Banco de dados vazio**
- SQLite não persiste em Netlify por padrão
- Solução: Migrar para Supabase/PostgreSQL

**Timeout de build**
- Aumentar tempo de build nas configurações
- Verificar se `npm install` está lento


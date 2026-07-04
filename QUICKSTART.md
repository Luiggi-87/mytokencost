# ⚡ MyTokenCost - Quick Start

## Local

```bash
npm install
npm run dev
```

Acesso: http://localhost:3001

## Produção

Frontend: https://mtc.247ia.com.br
Backend: https://mytokencost-production.up.railway.app

## 1️⃣ Criar conta

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"voce@empresa.com","password":"sua-senha","organizationName":"Minha Empresa"}'
```

Guarda o `token` retornado — todas as chamadas seguintes usam `Authorization: Bearer <token>`.

### Esqueceu a senha?

Pela UI: link **"Esqueci minha senha"** na tela de login → informa o email → abre o email recebido (ou, se `SMTP_HOST` não estiver configurado, o link aparece nos logs do servidor) → define uma nova senha.

```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"voce@empresa.com"}'
# resposta genérica sempre (não revela se o email existe); token expira em 1h e só pode ser usado uma vez

curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" -d '{"token":"token-do-email-ou-log","newPassword":"nova-senha"}'
```

## 2️⃣ Adicionar uma API

Pela UI: aba **🔌 APIs** → **Adicionar Nova API** → nome, tipo, modelo de preço (ex: "Por Token"), custo unitário.

Via curl:
```bash
TOKEN="seu-token-aqui"
curl -X POST http://localhost:3001/api/apis \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Anthropic Claude 3.5","type":"anthropic","pricing_model":"por_token","unit_cost":0.0000015}'
```

## 3️⃣ Criar projeto

Pela UI: aba **📁 Projetos** → **Novo Projeto**.

## 4️⃣ Registrar custo

Pela UI: aba **💸 Custos** → **Registrar Custo** (escolha projeto, API, valor, quantidade).

## 5️⃣ Ver Dashboard

Volta para **📊 Dashboard** — total gasto, por API, por projeto, atualização em tempo real via WebSocket.

## Fluxo completo

```
Registrar conta → Adicionar API → Criar Projeto → Usar API no seu app
    → Registrar Custo → Ver Dashboard → Cobrar Cliente
```

## Endpoints úteis

```bash
curl http://localhost:3001/api/health                     # sem autenticação
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/apis
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/projects
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/dashboard/summary
```

Mais exemplos (SDKs, dados de teste): [DADOS_EXEMPLO.md](DADOS_EXEMPLO.md)
Deploy: [DEPLOY.md](DEPLOY.md)

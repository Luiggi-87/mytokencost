# Changelog / Histórico do Projeto

Histórico condensado das fases de desenvolvimento. Documentação atual está em [README.md](README.md) e [DEPLOY.md](DEPLOY.md).

## Fase 1 — MVP local (Contador de Tokens v1)

Sistema básico para rastrear custos de API manualmente: CRUD de APIs/Projetos/Custos, dashboard simples, SQLite local, sem autenticação. Stack: Express + React/Vite.

## Fase 2 — Análise competitiva (Echo / Merit Systems)

Análise do projeto [Echo](https://github.com/Merit-Systems/echo), um SDK "User Pays AI" (usuários finais pagam direto, markup automático para devs, stack Next.js/TypeScript). Decisão: manter o foco em **tracking + billing para agências/devs** (não em pass-through de pagamento ao usuário final), mas adotar o padrão de **SDK proxy** para rastreamento automático de custo sem alterar código do cliente.

## Fase 3 — Professional v2 (10 melhorias)

Reescrita completa adicionando:

1. **SDK Proxy** para Anthropic, OpenAI e Google Gemini (`packages/sdk/*`) — wrapper que rastreia custo automaticamente
2. **WebSocket real-time** (Socket.io) para dashboard ao vivo
3. **Autenticação JWT** (bcrypt + multi-tenant, isolamento de dados por usuário)
4. **Webhooks** configuráveis por evento, com retry
5. **Alertas** de limite de gasto e anomalias (email/Slack/webhook)
6. **Relatórios** PDF/CSV/JSON
7. **Stripe** — criação de customer e cobrança automática por projeto
8. **Frontend profissional** — telas de login, gerenciadores de webhooks/alertas

Renomeado para **MyTokenCost**.

## Fase 4 — Deploy em produção (Railway + Netlify)

- Backend deployado no Railway; frontend no Netlify (`mtc.247ia.com.br`)
- Migração de SQLite (dev) para **PostgreSQL** (produção) via detecção de `DATABASE_URL` em `server/db.js`, com conversão automática de dialeto SQL (`?`→`$n`, `DATETIME`→`TIMESTAMP`, `DEFAULT 1/0`→`TRUE/FALSE`)
- Diversas rodadas de correção de compatibilidade SQLite→PostgreSQL (GROUP BY, funções de data, tipos de coluna)
- **Bug crítico resolvido**: `auth/register`/`login` travavam ~5min antes de retornar 502. Causa raiz: export default de `db.js` capturava `db` como `undefined` no carregamento do módulo (antes da conexão assíncrona completar), congelando um stub vazio para sempre. Corrigido substituindo por helpers `dbRun`/`dbGet`/`dbAll` que leem a variável viva. Detalhes em [DEPLOY.md](DEPLOY.md#-known-issues-resolved).
- Adicionado: pool do PostgreSQL com `query_timeout`/`statement_timeout` (evita travamentos indefinidos), `DATABASE_URL` via variável de referência do Railway (rede interna, não pública)
- Monitoramento: `monitor.js` + GitHub Actions rodando a cada 6h, error tracking opcional via Sentry

**Status atual**: produção estável, register/login/CRUD principais testados e funcionando (~99% dentro de <1s).

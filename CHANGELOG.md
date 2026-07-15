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

## Fase 5 — Reset de senha

- Novos endpoints `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`; token aleatório (32 bytes), armazenado apenas como hash SHA-256, expira em 1h, uso único
- `server/email.js` (nodemailer): envia por SMTP se configurado; sem configuração, apenas loga o link no console (não bloqueia o fluxo)
- Resposta de `forgot-password` é sempre genérica, independente do email existir ou não (evita enumeração de usuários)
- Frontend: link "Esqueci minha senha" no Login, modo de reset ativado automaticamente via `?reset_token=` na URL
- **Bug encontrado e corrigido no processo**: `initializeTables()` disparava os `CREATE TABLE`/`ALTER TABLE` sem aguardar (fire-and-forget). Isso permitia que o `ALTER TABLE users` (migração das novas colunas) rodasse antes do `CREATE TABLE users` terminar; no SQLite local isso derrubava o processo inteiro (erro não tratado "no such table"). Corrigido: todas as queries de inicialização agora rodam em sequência com `await`.
- Testado ponta a ponta local e em produção: registro → forgot-password → reset com token → senha antiga rejeitada → senha nova funciona → token não pode ser reutilizado → email desconhecido recebe resposta idêntica.

## Fase 6 — Conversão de moeda, auto-atualização de modelos, SDKs publicados

- **Conversão R$ → USD**: todo o sistema (dashboard, relatórios PDF/CSV, cobrança Stripe, SDKs proxy) migrado de Real brasileiro para Dólar. **Bug crítico encontrado e corrigido**: `server/stripe.js` cobrava o cliente via Stripe com `currency: "brl"` usando valores calculados em USD — uma cobrança de $10 seria criada como R$10 no cartão real do cliente.
- **IDs de modelo aposentados**: os modelos hardcoded (`claude-3-5-sonnet-20241022`, `gpt-3.5-turbo-16k`, família Gemini 1.5, etc.) foram descontinuados pelos provedores, causando falhas de validação em produção. Corrigido duas vezes até a raiz ser endereçada (ver item seguinte).
- **Descoberta de modelo em tempo real** (`server/routes/integrations.js`): em vez de testar uma lista fixa de modelos, o endpoint `/api/integrations/validate-key` agora consulta a API oficial de modelos do provedor (`GET /v1/models`) a cada validação e cruza com a tabela de preços curada. Quando um provedor aposenta um modelo, ele simplesmente some da lista testada — sem precisar editar código. Implementado para Anthropic, OpenAI, Google Gemini e Groq; Perplexity testa a tabela curada diretamente (provedor não expõe endpoint público de modelos).
- **Auditoria completa dos 13 provedores**: encontrados e corrigidos preços duplicados por copy-paste (Mistral medium=large, Cohere command=command-nightly), blocos inteiros de modelo aposentado (Groq, Perplexity, AWS Bedrock, Gemini), e resíduos de R$/BRL espalhados pelo código (relatórios, logs de debug, comentários).
- **8 SDKs proxy publicados no npm** sob o escopo `@luiggi-87` (`anthropic-proxy`, `openai-proxy`, `gemini-proxy`, `groq-proxy`, `mistral-proxy`, `cohere-proxy`, `perplexity-proxy`, `together-proxy`). Os pacotes existiam como código-fonte mas nunca haviam sido publicados de verdade — o guia de integração instruía um `npm install` que sempre falhava (404). Antes de escrever cada wrapper, o SDK oficial do provedor foi instalado e inspecionado (não assumido de memória), revelando diferenças reais de API entre provedores (Mistral usa `chat.complete`, Cohere usa `chat()` direto e construtor com `token` em vez de `apiKey`, Together retorna array puro em `models.list()`).
- **Aba Integração** agora gera código de exemplo dinâmico por provedor selecionado (antes sempre mostrava código Anthropic, mesmo para APIs OpenAI/Groq/etc.) e corrige um bug de CSS onde o bloco de código estourava a largura da página inteira em vez de rolar internamente.

## Fase 7 — 13 provedores SDK proxy + escopo npm próprio

- SDK proxy expandido de 3 para 13 provedores (`packages/sdk/*`): Anthropic, OpenAI, Gemini, Groq, Mistral, Cohere, Perplexity, Together AI, e 5 provedores "especiais" que não seguem o padrão de uma chave + `messages.create`:
  - **Hugging Face** e **Replicate**: cobram por tempo de computação, não por token — o proxy mede duração real (`predict_time`/wall-clock) e aplica um `pricePerSecond` configurável
  - **Firecrawl**: não é LLM, é scraping (scrape/crawl/search) — rastreia créditos consumidos via `getCreditUsage()` da API oficial, não tokens
  - **AWS Bedrock**: autentica com Access Key + Secret Key + Região (SigV4) em vez de uma chave única; usa a Converse API (formato de `usage` padronizado entre modelos)
  - **Azure OpenAI**: autentica com Endpoint + Deployment Name + chave
- `server/routes/integrations.js` (`/api/integrations/validate-key`) e `IntegrationSetup.jsx` atualizados para os 5 novos provedores, incluindo campos de credencial multi-campo condicionais (Bedrock/Azure) em vez do campo único de chave
- **Bug encontrado durante o desenvolvimento**: `@huggingface/inference` define seus métodos como propriedades não-configuráveis na instância — o padrão `extends` + monkey-patch usado nos outros 12 pacotes quebrava com `TypeError: Cannot assign to read only property`. Corrigido usando composição (client interno + delegação) só nesse pacote.
- **Escopo npm renomeado**: todos os 13 pacotes migraram de `@luiggi-87/*` (conta pessoal) para `@mtc-247ia/*` (organização npm), para não expor o nome pessoal do usuário nos comandos de instalação. Os pacotes antigos em `@luiggi-87/*` foram deprecados (não removidos) apontando para o novo escopo.
  - Pendência: `@mtc-247ia/together-proxy` não publicou (HTTP 429 persistente em 4 tentativas) — falta retry manual; `@luiggi-87/together-proxy` foi deixado sem deprecar até lá.
- **Bug pré-existente encontrado e corrigido**: o código gerado pela aba Integração para Google Gemini chamava `client.generateContent({ model, contents })` (um objeto só), mas o método real do `CountedGemini` é `generateContent(model, params)` — dois argumentos separados. Quem copiasse o código da produção (ainda rodando a versão anterior a esta fase) receberia um snippet que quebra em runtime. Corrigido em `IntegrationSetup.jsx`.

# Proposta: Recarga de API (MyTokenCost como intermediário)

> **Status**: proposta em avaliação, não implementada. Este documento existe para registrar a ideia, a arquitetura possível e os trade-offs antes de decidir construir.

## O que muda

**Hoje**: MyTokenCost é um *rastreador* de custo. O cliente usa a própria chave de API (Anthropic, OpenAI, etc.), e o sistema só registra quanto foi gasto — manualmente ou via SDK proxy (`packages/sdk/*`), que intercepta a chamada, calcula o custo e loga em `/api/costs`, mas quem efetivamente fala com o provedor de IA é o código do cliente, com a chave dele.

**Proposta**: MyTokenCost vira *intermediário*. O cliente deposita crédito (recarga via Stripe), e as chamadas de IA passam por um proxy do próprio MyTokenCost, que:
1. Usa **a chave de API do MyTokenCost** (não a do cliente) para falar com Anthropic/OpenAI/etc.
2. Debita o custo (+ markup) do saldo do cliente **em tempo real**, antes ou durante a chamada.
3. Bloqueia a chamada se o saldo for insuficiente.

Isso é o modelo "User Pays AI" (o mesmo do Echo, analisado na Fase 2 do [CHANGELOG.md](CHANGELOG.md) e descartado na época em favor do modelo de tracking atual).

## Arquitetura proposta

### 1. Ledger de saldo (novo)

Tabela `credits` (ou colunas em `users`/`projects`):
- `balance` (NUMERIC) — saldo atual em R$ ou em "tokens de crédito"
- `user_id` / `project_id` — por usuário ou por projeto, a decidir
- Histórico de transações: tabela `credit_transactions` (id, user_id, type: `recharge`|`debit`, amount, balance_after, reference, created_at) — necessário para auditoria e disputas

### 2. Endpoint de proxy real (novo)

Hoje as rotas `/api/costs` só *registram* um custo já ocorrido. O novo fluxo precisa de um endpoint tipo:

```
POST /api/proxy/anthropic/messages
POST /api/proxy/openai/chat/completions
POST /api/proxy/gemini/generateContent
```

Que:
1. Valida o token JWT do cliente (autenticação já existe)
2. Verifica saldo disponível **antes** de chamar o provedor (reserva o valor estimado)
3. Encaminha a chamada para o provedor real, usando a chave do MyTokenCost
4. Calcula o custo real da resposta (tokens de entrada/saída) e ajusta o débito
5. Registra em `costs` (já existe) e decrementa `credits.balance`
6. Repassa a resposta (incluindo streaming, se o provedor suportar) de volta ao cliente

Este é o componente **novo e mais arriscado** — hoje o sistema não faz proxy de nenhuma chamada de IA, só recebe registros pós-fato.

### 3. Recarga via Stripe (adaptação do que já existe)

`server/stripe.js` já tem `createStripeCustomer` e `chargeStripeCustomer`. Precisa de:
- Endpoint `POST /api/credits/recharge` — cria um Payment Intent/Checkout Session no Stripe para um valor de recarga
- Webhook do Stripe (`charge.succeeded` já tratado em `handleStripeWebhook`, mas hoje só loga — precisa creditar o `balance` do usuário quando o pagamento confirmar)
- UI: tela de "Adicionar crédito" com valores sugeridos (R$ 50, 100, 200...) ou valor livre

### 4. Alertas de saldo baixo (reaproveita o que já existe)

O sistema de `alerts` já suporta `type: 'limit_exceeded'` — pode virar `type: 'low_balance'`, disparando quando `balance` cair abaixo de um limite configurável, reutilizando `checkAlerts()` e os canais já existentes (email/Slack/webhook).

## O que já existe e é reaproveitável

| Componente | Uso hoje | Uso no modelo de recarga |
|---|---|---|
| Autenticação JWT | Login multi-tenant | Igual — identifica quem está chamando o proxy |
| `server/stripe.js` | Cobrança mensal por projeto | Vira cobrança de recarga (top-up) |
| `alerts` | Limite de gasto mensal | Alerta de saldo baixo |
| `webhooks` | Notificação de custo registrado | Notificação de recarga/débito |
| SDKs proxy (`packages/sdk/*`) | Interceptam chamada do **cliente com a própria chave** | Precisariam apontar para o proxy do MyTokenCost em vez do provedor direto |
| `costs` (tabela) | Log de custo manual/automático | Continua como log de auditoria, mas alimentado pelo proxy, não por quem chama |

## O que precisa ser construído do zero

- Ledger de saldo + transações (`credits`, `credit_transactions`)
- Endpoint de proxy real por provedor, com suporte a streaming
- Lógica de reserva/débito síncrono de saldo (para não deixar o cliente gastar mais do que tem)
- Fluxo de recarga (Checkout Stripe + webhook de crédito)
- Gestão centralizada das chaves de API dos provedores (Anthropic/OpenAI/Google) — hoje cada cliente usa a própria chave; no modelo de recarga, o MyTokenCost precisa manter (e proteger) essas chaves
- Política de markup (quanto cobrar acima do custo real do provedor)
- Tela de saldo/recarga no frontend

## Riscos e trade-offs

- **Responsabilidade pelas chaves**: o MyTokenCost passa a deter e proteger chaves de API de produção de todos os provedores — superfície de ataque e responsabilidade bem maiores que hoje (onde cada cliente guarda a própria chave).
- **Rate limit compartilhado**: todos os clientes dividem o rate limit das chaves do MyTokenCost junto ao provedor — precisa de fila/throttling por cliente para não um cliente afetar outro.
- **Risco de margem**: se o débito não for síncrono (reserva antes da chamada + ajuste depois), um cliente pode gastar mais do que o saldo antes do sistema perceber — prejuízo fica com o MyTokenCost.
- **Streaming**: respostas de IA em streaming (SSE) tornam o cálculo de custo "antes de responder" mais difícil — geralmente se reserva uma estimativa e ajusta no fim.
- **Compliance/fraude**: virar processador de pagamento + revendedor de API atrai obrigações que o modelo atual (só tracking) não tinha (ex: reembolso de crédito não usado, disputas de cobrança).
- **Escopo**: isso é uma reescrita do núcleo do produto, não uma feature — o modelo atual (tracking + fatura mensal) foi escolhido deliberadamente na Fase 2 para evitar exatamente esses riscos.

## Decisões em aberto (a resolver antes de implementar)

1. Saldo é por **usuário** ou por **projeto**? (afeta como agências repassam custo a múltiplos clientes)
2. Markup fixo (%) ou por provedor/modelo?
3. Crédito não utilizado é reembolsável?
4. Suporta todos os provedores desde o início ou começa só com um (ex: Anthropic) para validar o proxy antes de expandir?
5. O débito é síncrono (bloqueia a chamada até confirmar saldo) ou assíncrono com estorno se estourar?

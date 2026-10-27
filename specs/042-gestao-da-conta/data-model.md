# Data Model: Gestão da conta

Uma tabela nova e duas ações novas no limite de tentativas, numa migração Drizzle (`npm run db:generate -w @cruzadinha/api -- --name account_management`, princípio IX). Documentação: novo `docs/data-definitions/DDE-006-gestao-da-conta.md` e `docs/entity-relationship-diagrams/ERD-006-gestao-da-conta.md` (conferir o número com `npm run check:ids:remote` antes de criar).

## `email_change_requests` (nova)

Pedido de troca de e-mail ainda não confirmado (FR-003, FR-004). No máximo um por conta.

| Coluna        | Tipo          | Regra                                                                |
| ------------- | ------------- | -------------------------------------------------------------------- |
| `request_id`  | `uuid`        | PK, `defaultRandom()`                                                |
| `user_id`     | `uuid`        | NOT NULL, FK `users.user_id` `ON DELETE CASCADE`, índice único       |
| `new_email`   | `text`        | NOT NULL; já normalizado por `emailSchema` (minúsculo, sem espaços)  |
| `token_hash`  | `text`        | NOT NULL, único; SHA-256 hex do token de 43 caracteres               |
| `expires_at`  | `timestamptz` | NOT NULL; `created_at + 60 min` (`EMAIL_CHANGE_TTL_MINUTES = 60`)     |
| `created_at`, `updated_at` | `timestamptz` | `...timestamps` e trigger `email_change_requests_set_updated_at` (exigido por `conventions.int.test.ts`) |

Regras:

- Pedido novo da mesma conta: `insert ... onConflictDoUpdate({ target: user_id, set: { new_email, token_hash, expires_at } })`. O hash antigo some, então o link anterior deixa de valer.
- Uso: `DELETE ... WHERE token_hash = $1 AND expires_at > now RETURNING user_id, new_email`, na mesma transação do `UPDATE users SET email`. Sem linha: link inexistente, vencido, usado ou substituído.
- `new_email` igual ao e-mail de outra conta: nunca é gravado (sem pedido e sem link). Se outra conta ocupar o endereço depois do pedido, o `UPDATE` falha em `users_email_unique`, só ele é desfeito e o pedido fica apagado.
- Limpeza: `deleteExpiredAuthRows` apaga os vencidos há mais de 7 dias, como os tokens de recuperação (`CleanupCounts` ganha `emailChanges`; a linha da CLI cita o número).
- Exclusão da conta: `ON DELETE CASCADE`.
- `new_email` é dado pessoal: nunca em log (`describeError`), nunca na resposta da API.

Estados: `aberto` (linha com `expires_at > now`) → `usado` (apagado na confirmação) | `substituído` (hash trocado por um pedido novo) | `vencido` (`expires_at <= now`, apagado pelo cleanup) | `apagado com a conta`.

## `rate_limit_attempts` (muda o `CHECK`)

`rateLimitActions` ganha `PASSWORD_CONFIRM` e `CHANGE_EMAIL`; a migração recria `rate_limit_attempts_action_check` com a lista nova. Nada muda nas linhas existentes.

| Ação               | Chave                       | Janela                        | Uso                                                   |
| ------------------ | --------------------------- | ----------------------------- | ----------------------------------------------------- |
| `PASSWORD_CONFIRM` | `USER` (`user_id`)          | 5 em 15 min (`passwordConfirm`) | senha atual em trocar senha, trocar e-mail e excluir |
| `CHANGE_EMAIL`     | `NETWORK_ADDRESS`           | 10 em 60 min (`changeEmail`)  | `admitAddress` antes do corpo                         |
| `CHANGE_EMAIL`     | `USER` (`user_id`)          | intervalo `EMAIL_RESEND_INTERVAL_SECONDS` | `enterIntervalGate` entre pedidos       |
| `VERIFY_TOKEN`     | `NETWORK_ADDRESS` (existente) | 30 em 60 min                | `confirm-email-change`                                |

`RateLimits` e `defaultRateLimits` (`platform/rate-limit/limits.ts`) ganham `passwordConfirm` e `changeEmail`.

## Tabelas existentes (sem mudança de schema)

- `users`: `email` muda na confirmação; a linha é apagada na exclusão. Todas as tabelas filhas já têm `ON DELETE CASCADE` (`sessions`, `progress`, `user_settings`, `password_reset_tokens`).
- `sessions`: trocar senha e sair de todos marcam `ended_at` em todas as sessões abertas da conta menos a do cookie da requisição.
- `password_reset_tokens`: trocar a senha logado chama `revokeOpenResetTokens` (FR-002).
- Exclusão também apaga `rate_limit_attempts` com `key_type = 'USER'` e `key_value = user_id`; as de chave `EMAIL`/`NETWORK_ADDRESS` saem no cleanup em até 2 dias (contadores contra abuso, ver research D8).

## Site (sem armazenamento novo)

- Exclusão no aparelho: `clearAccountData(userId)` (feature 041) apaga cruzadas guardadas de uso exclusivo da conta, `known-progress` e outbox da conta; `clearLastUser()`; cache do TanStack Query limpo; sessão `null`. Banco `cruzadinha-visitante` intocado.
- Outros aparelhos: nada novo; `401` na próxima ação segue a regra de sessão expirada da feature 041.

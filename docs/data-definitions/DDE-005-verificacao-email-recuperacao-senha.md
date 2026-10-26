# DDE-005 — Confirmação de e-mail e recuperação de senha

## Changelog

| Version | Date       | Changes                                      |
| ------- | ---------- | -------------------------------------------- |
| `0.0.1` | 2026-10-26 | - Versão inicial derivada da spec 035 (#82). |

## Scope

Cobre as tabelas da confirmação de e-mail no cadastro, da recuperação de senha por e-mail e da trava de envio por cota do provedor, e o alargamento dos valores aceitos em `RateLimitAttempt`. `User` e `RateLimitAttempt` já são definidos na [DDE-001](./DDE-001-banco-auth-convites.md) e aparecem aqui só no que muda. Os tokens dos links nunca são guardados: só o SHA-256 (hex), como nas sessões.

## Source Artifacts

| Source                                                                                                                   | Type | Description                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ---- | ----------------------------------------------- |
| [specs/035-confirmar-email-recuperar-senha/spec.md](../../specs/035-confirmar-email-recuperar-senha/spec.md)             | Spec | Requisitos FR-001 a FR-025 e entidades          |
| [specs/035-confirmar-email-recuperar-senha/data-model.md](../../specs/035-confirmar-email-recuperar-senha/data-model.md) | Plan | Colunas, restrições, índices, estados e limpeza |
| [specs/035-confirmar-email-recuperar-senha/research.md](../../specs/035-confirmar-email-recuperar-senha/research.md)     | Plan | Validades, tetos, trava de cota e limpeza       |

## Entity Summary

| Entity                                      | Description                                        | Source          |
| ------------------------------------------- | -------------------------------------------------- | --------------- |
| [PendingRegistration](#pendingregistration) | Cadastro aguardando a confirmação do e-mail        | FR-001 a FR-005 |
| [PasswordResetToken](#passwordresettoken)   | Link de redefinição de senha de um usuário         | FR-007 a FR-010 |
| [EmailSendBlock](#emailsendblock)           | Trava de envio quando a cota do provedor acaba     | FR-012, FR-013  |
| [RateLimitAttempt](#ratelimitattempt)       | Novos valores de ação e de tipo de chave (DDE-001) | FR-011, FR-013  |
| [User](#user)                               | Dono do token de recuperação (definido na DDE-001) | FR-002, FR-009  |

## Entity Definitions

### PendingRegistration

| Field      | Description                              | Data Type | Mandatory | Notes                                                                                               |
| ---------- | ---------------------------------------- | --------- | --------- | --------------------------------------------------------------------------------------------------- |
| pending_id | Identificador único da pendência         | UUID      | Yes       | PK; gerado pelo banco                                                                               |
| email      | E-mail ainda não confirmado              | Text      | Yes       | Único (`pending_registrations_email_unique`); em minúsculas, sem espaços nas pontas, como em `User` |
| token_hash | SHA-256 do token do link de confirmação  | Text      | Yes       | Único; trocado a cada reenvio (o link antigo deixa de valer)                                        |
| expires_at | Validade do link                         | Date      | Yes       | Momento do envio + 24 horas; link vencido não confirma, mas o reenvio o refaz                       |
| created_at | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC                                                                          |
| updated_at | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco (gatilho `pending_registrations_set_updated_at`); UTC              |

Regras:

- A pendência não guarda senha: ela é escolhida na confirmação por quem abriu o link, e o hash (argon2id) vai direto para o `User`. Assim quem cadastra o e-mail de outra pessoa não define a senha da conta dela.
- No máximo uma pendência por e-mail; um cadastro novo do mesmo e-mail troca o token (só depois do intervalo mínimo por e-mail).
- Confirmar = apagar a pendência (`DELETE ... WHERE token_hash = ? AND expires_at > now() RETURNING`) e criar o usuário (com a senha enviada) na mesma transação; só uma de duas confirmações simultâneas vence. Se o e-mail já virou usuário, a pendência é apagada e nada é criado.
- Limpeza (`auth cleanup`): linhas com `expires_at` há mais de 7 dias.

### PasswordResetToken

| Field      | Description                              | Data Type | Mandatory | Notes                                                                                                                                                                           |
| ---------- | ---------------------------------------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| token_id   | Identificador único do token             | UUID      | Yes       | PK; gerado pelo banco                                                                                                                                                           |
| user_id    | Usuário que pediu a redefinição          | UUID      | Yes       | FK → User (`ON DELETE CASCADE`); índice `password_reset_tokens_user_id_idx`; índice único parcial `password_reset_tokens_open_user_unique` em `(user_id) WHERE used_at IS NULL` |
| token_hash | SHA-256 do token do link                 | Text      | Yes       | Único                                                                                                                                                                           |
| expires_at | Validade do link                         | Date      | Yes       | Emissão + 1 hora                                                                                                                                                                |
| used_at    | Quando o token deixou de valer           | Date      | No        | Nulo até o uso ou até um pedido novo do mesmo usuário invalidá-lo; válido = `used_at IS NULL AND expires_at > now()`                                                            |
| created_at | Data e hora em que o registro foi criado | Date      | Yes       | Preenchido pelo banco; UTC; também marca a emissão para o intervalo mínimo                                                                                                      |
| updated_at | Data e hora da última alteração          | Date      | Yes       | Preenchido e avançado pelo banco (gatilho `password_reset_tokens_set_updated_at`); UTC                                                                                          |

Regras:

- Redefinir a senha marca também todos os outros tokens abertos do usuário.
- Um pedido novo, na mesma transação, marca `used_at` dos tokens abertos do usuário e insere o novo: no máximo um token aberto por usuário.
- Uso único: o token é consumido por `UPDATE ... SET used_at = now() WHERE token_hash = ? AND used_at IS NULL AND expires_at > now() RETURNING user_id`, na transação que troca a senha e encerra todas as sessões do usuário.
- Limpeza (`auth cleanup`): linhas com `expires_at` ou `used_at` há mais de 7 dias.

### EmailSendBlock

| Field         | Description                                 | Data Type | Mandatory | Notes                                                                                                                         |
| ------------- | ------------------------------------------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| block_id      | Chave da linha única                        | Integer   | Yes       | PK; `CHECK (block_id = 1)`                                                                                                    |
| blocked_until | Até quando o envio de e-mail está bloqueado | Date      | Yes       | Cota diária: próxima 00:00 UTC; mensal: 00:00 UTC do primeiro dia do mês seguinte; uma trava nunca encurta outra (`GREATEST`) |
| reason        | Qual cota acabou                            | Text      | Yes       | `daily_quota_exceeded` ou `monthly_quota_exceeded`; `rate_limit_exceeded` não cria trava                                      |
| created_at    | Data e hora em que o registro foi criado    | Date      | Yes       | Preenchido pelo banco; UTC                                                                                                    |
| updated_at    | Data e hora da última alteração             | Date      | Yes       | Preenchido e avançado pelo banco (gatilho `email_send_block_set_updated_at`); UTC                                             |

Trava ativa = `blocked_until > now()`; uma linha vencida é ignorada e não precisa de limpeza. Enquanto houver trava, as rotas que enviam e-mail respondem `503 email-unavailable` sem chamar o provedor.

### RateLimitAttempt

Sem coluna nova. A migração alarga os dois `CHECK`:

| Field    | Valores novos                                                                            | Uso                                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| action   | `FORGOT_PASSWORD`, `RESEND_VERIFICATION`, `VERIFY_TOKEN`, `RESET_PASSWORD`, `EMAIL_SENT` | `FORGOT_PASSWORD`, `RESEND_VERIFICATION`, `VERIFY_TOKEN` e `RESET_PASSWORD` por `NETWORK_ADDRESS` (10, 10, 30 e 30 por hora); `REGISTER` e `FORGOT_PASSWORD` também por `EMAIL`, como intervalo mínimo entre pedidos; `EMAIL_SENT` a cada e-mail realmente enviado, por `EMAIL` (teto por e-mail por dia) e `GLOBAL` (tetos diários) |
| key_type | `GLOBAL`                                                                                 | `key_value` fixo `email`; conta os envios do dia para o teto abaixo da cota do provedor, com a reserva para a recuperação                                                                                                                                                                                                            |

### User

| Field   | Description                    | Data Type | Mandatory | Notes                                                            |
| ------- | ------------------------------ | --------- | --------- | ---------------------------------------------------------------- |
| user_id | Identificador único do usuário | UUID      | Yes       | PK; demais campos na [DDE-001](./DDE-001-banco-auth-convites.md) |

`User` não muda nesta feature.

## Relationships

| From Entity   | Cardinality | To Entity                                 | Description                                                              |
| ------------- | ----------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| [User](#user) | one-to-many | [PasswordResetToken](#passwordresettoken) | Um usuário pode ter vários tokens (um aberto); somem junto com o usuário |

`PendingRegistration` e `EmailSendBlock` não têm relacionamento: a primeira vira um `User` na confirmação, e a segunda é uma linha única.

## Entity Relationship Diagrams

| ID                                                                                        |
| ----------------------------------------------------------------------------------------- |
| [ERD-005](../entity-relationship-diagrams/ERD-005-verificacao-email-recuperacao-senha.md) |

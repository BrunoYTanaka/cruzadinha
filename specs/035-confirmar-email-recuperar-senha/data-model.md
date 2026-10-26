# Data Model: Confirmar e-mail no cadastro e recuperar senha

Migração `0009_email_verification_and_recovery.sql` (próximo número após a `0008_remove_invites`), gerada pelo Drizzle e com o `CREATE TRIGGER <tabela>_set_updated_at` das três tabelas à mão. `users` não muda. Todas as tabelas espalham `timestamps` (`created_at`, `updated_at`).

## `pending_registrations`

| Coluna          | Tipo          | Regra                                                        |
| --------------- | ------------- | ------------------------------------------------------------ |
| `pending_id`    | `uuid`        | PK, `gen_random_uuid()`                                      |
| `email`         | `text`        | NOT NULL, único (`pending_registrations_email_unique`); minúsculas, como em `users` |
| `token_hash`    | `text`        | NOT NULL, único; SHA-256 do token                            |
| `expires_at`    | `timestamptz` | NOT NULL; envio + 24 h                                       |
| `created_at`, `updated_at` | `timestamptz` | padrão `timestamps`                              |

- A pendência **não guarda senha**: ela é escolhida em `verify-email` por quem abriu o link, então quem cadastra o e-mail de outra pessoa não define a senha da conta dela.
- Um cadastro novo do mesmo e-mail faz `upsert` por `email` (troca o token e reinicia a validade), só quando o intervalo mínimo por e-mail passou (ver `rate_limit_attempts`).
- Confirmar = `DELETE ... RETURNING` + `INSERT` em `users` (com o hash da senha enviada) na mesma transação. Se o e-mail já está em `users`, a pendência é apagada e nada é criado.
- Limpeza: linhas com `expires_at` há mais de 7 dias.

## `password_reset_tokens`

| Coluna       | Tipo          | Regra                                                     |
| ------------ | ------------- | --------------------------------------------------------- |
| `token_id`   | `uuid`        | PK, `gen_random_uuid()`                                   |
| `user_id`    | `uuid`        | NOT NULL, FK → `users.user_id` `ON DELETE CASCADE`        |
| `token_hash` | `text`        | NOT NULL, único                                           |
| `expires_at` | `timestamptz` | NOT NULL; emissão + 1 h                                   |
| `used_at`    | `timestamptz` | NULL até o uso ou até a invalidação por um pedido novo    |
| `created_at`, `updated_at` | `timestamptz` | padrão `timestamps`                       |

- Índice `password_reset_tokens_user_id_idx` em `user_id` e índice único parcial `password_reset_tokens_open_user_unique` em `(user_id) WHERE used_at IS NULL`: no máximo um token aberto por usuário, mesmo com dois pedidos ao mesmo tempo (o segundo não insere nada e não envia).
- Um pedido novo, na mesma transação, marca `used_at = now()` dos tokens abertos do usuário e insere o novo (no máximo um aberto por usuário).
- Válido: `used_at IS NULL AND expires_at > now()`.
- Limpeza: `expires_at` ou `used_at` há mais de 7 dias.

## `email_send_block`

| Coluna          | Tipo          | Regra                                                   |
| --------------- | ------------- | ------------------------------------------------------- |
| `block_id`      | `smallint`    | PK, `CHECK (block_id = 1)`: linha única                 |
| `blocked_until` | `timestamptz` | NOT NULL                                                |
| `reason`        | `text`        | NOT NULL, `CHECK IN ('daily_quota_exceeded', 'monthly_quota_exceeded')` |
| `created_at`, `updated_at` | `timestamptz` | padrão `timestamps`                    |

- Gravação por `upsert` com `GREATEST(blocked_until)`: uma trava nunca encurta outra. Trava ativa = `blocked_until > now()`; linha vencida é ignorada (não precisa de limpeza).

## `rate_limit_attempts` (só alarga os `CHECK`)

- `action` passa a aceitar `FORGOT_PASSWORD`, `RESEND_VERIFICATION`, `VERIFY_TOKEN`, `RESET_PASSWORD`, `EMAIL_SENT` (somando-se a `LOGIN`, `REGISTER`, `INVITE_CREATE`, `PUZZLE_FETCH`, `SETTINGS_SAVE`).
- `key_type` passa a aceitar `GLOBAL` (valor fixo `email`), somando-se a `EMAIL` e `NETWORK_ADDRESS`.
- Uso: `REGISTER`, `FORGOT_PASSWORD`, `RESEND_VERIFICATION`, `VERIFY_TOKEN` e `RESET_PASSWORD` por `NETWORK_ADDRESS` (10, 10, 10, 30 e 30 por hora); `REGISTER` e `FORGOT_PASSWORD` também por `EMAIL`, como intervalo mínimo entre pedidos (uma tentativa por `EMAIL_RESEND_INTERVAL_SECONDS`, contada com ou sem conta ou pendência e desfeita se nenhum e-mail saiu); `EMAIL_SENT` a cada e-mail realmente enviado, por `EMAIL` (teto por e-mail por dia) e por `GLOBAL` (tetos diários).
- A data de cada tentativa é a do relógio da aplicação (injetado), a mesma que a janela usa ao contar.

## Estados

```
cadastro:   (nada) ──register──▶ pending ──verify──▶ users        (pending apagada)
                         └─ vencida / substituída ─▶ removida pela limpeza
recuperação: (conta) ──forgot──▶ token aberto ──reset──▶ usado (senha nova, sessões encerradas)
                         └─ novo pedido / vencido ─▶ inválido
envio:       livre ──cota esgotada──▶ bloqueado até blocked_until ──▶ livre
```

## Documentação de dados (FR-024)

- `docs/data-definitions/DDE-005-verificacao-email-recuperacao-senha.md` descreve as três tabelas novas e o alargamento dos `CHECK` de `rate_limit_attempts`.
- `docs/entity-relationship-diagrams/ERD-005-verificacao-email-recuperacao-senha.md` mostra as três tabelas e `password_reset_tokens` → `users`. Os ERDs anteriores não mudam, porque `users` e `rate_limit_attempts` não ganham colunas.
- Conferir `npm run check:ids` (e `:remote`) antes do push: outras branches podem ter pegado o número 005.

# Data Model: Banco de dados, autenticação e convites

O modelo lógico (entidades, campos, relacionamentos e origem de cada um) está na [DDE-001](../../docs/data-definitions/DDE-001-banco-auth-convites.md), com o diagrama na [ERD-001](../../docs/entity-relationship-diagrams/ERD-001-banco-auth-convites.md). Este documento acrescenta o que o schema Drizzle e as migrações precisam: tipos físicos, restrições, índices, triggers, regras de validação e transições de estado.

## Convenção comum a toda tabela

| Coluna | Tipo físico | Regra |
|---|---|---|
| `created_at` | `timestamp with time zone` | `NOT NULL DEFAULT now()` |
| `updated_at` | `timestamp with time zone` | `NOT NULL DEFAULT now()`; o trigger `<tabela>_set_updated_at` (`BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION set_updated_at()`) grava `now()` a cada alteração |

- Chave primária `<entidade>_id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- No código, as duas colunas vêm de um único objeto `timestamps` (`src/db/columns.ts`), usado por todas as tabelas.
- A função `set_updated_at()` é criada uma vez, numa migração `--custom`. Cada tabela nova precisa do seu trigger na migração que a cria.
- O teste `conventions.int.test.ts` percorre `information_schema` e `pg_trigger` e falha se alguma tabela do schema `public` não seguir essa convenção (FR-003).
- O Drizzle grava o histórico de migrações no schema `drizzle`, fora da conferência.

## `users`

| Coluna | Tipo físico | Restrições |
|---|---|---|
| `user_id` | `uuid` | PK |
| `email` | `text` | `NOT NULL`, `UNIQUE` (`users_email_unique`) |
| `password_hash` | `text` | `NOT NULL` |
| `created_at`, `updated_at` | ver convenção | |

**Validação** (no `shared`, antes de chegar ao banco):
- `email`: sem espaços nas pontas, em minúsculas, formato de e-mail, até 254 caracteres.
- Senha: de 8 a 128 caracteres, sem normalização.
- O banco recebe o e-mail já normalizado, e a unicidade vale sobre esse valor (FR-006).

## `sessions`

| Coluna | Tipo físico | Restrições |
|---|---|---|
| `session_id` | `uuid` | PK |
| `token_hash` | `text` | `NOT NULL`, `UNIQUE`; SHA-256 em hexadecimal do valor do cookie |
| `user_id` | `uuid` | `NOT NULL`, FK → `users.user_id` `ON DELETE CASCADE`; índice `sessions_user_id_idx` |
| `expires_at` | `timestamp with time zone` | `NOT NULL` |
| `absolute_expires_at` | `timestamp with time zone` | `NOT NULL`; `CHECK (expires_at <= absolute_expires_at)` |
| `ended_at` | `timestamp with time zone` | nulo enquanto aberta |
| `created_at`, `updated_at` | ver convenção | |

**Estados** (derivados no instante `agora`):

| Estado | Condição |
|---|---|
| Ativa | `ended_at IS NULL AND agora < expires_at` |
| Expirada | `ended_at IS NULL AND agora >= expires_at` (por inatividade ou porque chegou a `absolute_expires_at`) |
| Encerrada | `ended_at IS NOT NULL` |

**Transições**:
- Abrir (login ou cadastro): `expires_at = agora + 30 d` e `absolute_expires_at = agora + 365 d`.
- Renovar: só se estiver ativa, com `expires_at - agora < 29 d` e `expires_at < absolute_expires_at`. Faz `expires_at = min(agora + 30 d, absolute_expires_at)`.
- Encerrar (logout): só se estiver ativa. Faz `ended_at = agora`.

Expirada e encerrada são finais: nada as reabre.

## `invites`

| Coluna | Tipo físico | Restrições |
|---|---|---|
| `invite_id` | `uuid` | PK |
| `code_hash` | `text` | `NOT NULL`, `UNIQUE`; SHA-256 em hexadecimal do código normalizado |
| `created_by_user_id` | `uuid` | FK → `users.user_id` (sem cascata); nulo quando criado pela linha de comando; índice `invites_created_by_user_id_idx` |
| `used_by_user_id` | `uuid` | FK → `users.user_id`, `UNIQUE` (vários nulos são permitidos) |
| `expires_at` | `timestamp with time zone` | `NOT NULL` |
| `used_at` | `timestamp with time zone` | `CHECK ((used_at IS NULL) = (used_by_user_id IS NULL))` |
| `revoked_at` | `timestamp with time zone` | `CHECK (NOT (used_at IS NOT NULL AND revoked_at IS NOT NULL))` |
| `created_at`, `updated_at` | ver convenção | |

**Validação**:
- Código gerado com 16 caracteres do alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` e exibido em grupos de 4 separados por hífen.
- Código recebido: o pedido de cadastro aceita qualquer texto de 1 a 64 caracteres. O serviço normaliza (maiúsculas, sem espaços nem hífens); se não sobrar 16 caracteres do alfabeto, a resposta é "convite inválido" sem consulta ao banco, igual aos outros casos (FR-018, FR-020).
- Validade pela linha de comando: inteiro positivo de dias; padrão 7.

**Situação** (derivada, nesta ordem):

| Situação | Condição |
|---|---|
| `used` | `used_at IS NOT NULL` |
| `revoked` | `revoked_at IS NOT NULL` |
| `expired` | `agora >= expires_at` |
| `active` | nenhuma das anteriores |

**Transições**:
- Criar: com `expires_at = agora + dias`. Fica ativo.
- Usar (cadastro): só se ativo, na transação que cria o usuário. Faz `used_by_user_id` e `used_at = agora`.
- Revogar (linha de comando): só se não usado nem já revogado. Faz `revoked_at = agora` e vale também para convite expirado (edge case da spec).

**Cota**: um usuário pode criar um convite novo se `count(*) WHERE created_by_user_id = $user AND used_at IS NULL AND revoked_at IS NULL AND expires_at > agora` for menor que 3, contado com a linha do usuário travada (`FOR UPDATE`).

## `rate_limit_attempts`

| Coluna | Tipo físico | Restrições |
|---|---|---|
| `rate_limit_attempt_id` | `uuid` | PK |
| `action` | `text` | `NOT NULL`, `CHECK (action IN ('LOGIN', 'REGISTER', 'INVITE_CREATE'))` |
| `key_type` | `text` | `NOT NULL`, `CHECK (key_type IN ('EMAIL', 'NETWORK_ADDRESS'))` |
| `key_value` | `text` | `NOT NULL`; e-mail normalizado ou endereço de rede |
| `created_at`, `updated_at` | ver convenção | |

Índices:
- `rate_limit_attempts_lookup_idx` em `(action, key_type, key_value, created_at)`, para a contagem.
- `rate_limit_attempts_created_at_idx` em `(created_at)`, para a limpeza.

**Regras**:

| Ação | Chave | O que grava | Limite |
|---|---|---|---|
| `LOGIN` | `EMAIL` | cada falha | 5 em 15 min |
| `LOGIN` | `NETWORK_ADDRESS` | cada falha | 20 em 15 min |
| `REGISTER` | `NETWORK_ADDRESS` | cada tentativa | 10 em 1 h |
| `INVITE_CREATE` | `NETWORK_ADDRESS` | cada tentativa | 10 em 1 h |

- Contagem: linhas da chave com `created_at > agora - janela`. Se for maior ou igual ao limite, o pedido é recusado com 429 antes de qualquer verificação.
- Um login certo apaga as linhas `LOGIN`/`EMAIL` daquele e-mail.
- Cada gravação apaga as linhas com `created_at < agora - 1 dia`.
- Senha e código de convite nunca são gravados aqui (FR-029).

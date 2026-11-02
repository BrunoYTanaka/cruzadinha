# Data Model: x1 de cruzada

Documentado também em `docs/data-definitions/DDE-007-duelos.md` e `docs/entity-relationship-diagrams/ERD-007-duelos.md` (a criar na implementação). Ambas as tabelas spreadam `timestamps` e têm o trigger `<table>_set_updated_at`.

## duels

| Coluna | Tipo | Regra |
|---|---|---|
| `duel_id` | uuid PK | `defaultRandom` |
| `puzzle_id` | uuid FK → `puzzles` | `ON DELETE RESTRICT` |
| `link_token` | text unique | token do link (32 bytes, base64url), em claro (ver R3) |
| `code` | text | 8 caracteres do alfabeto sem ambiguidade; **único parcial** onde `state = 'open'` |
| `state` | text | `open`, `running`, `finished`, `cancelled` (CHECK) |
| `help_mode` | text | `free`, `forbidden`, `penalty` (CHECK) |
| `help_penalty_ms` | integer | `> 0` se `penalty`, nulo caso contrário (CHECK) |
| `max_ms` | integer | nulo = sem limite; senão `60000..7200000` (CHECK) |
| `start_deadline_at` | timestamptz | criação + prazo escolhido |
| `outcome` | text | nulo até `finished`: `creator`, `opponent`, `tie` |
| `outcome_reason` | text | nulo ou `time`, `forfeit`, `timeout`, `walkover`, `declined` |
| `finished_at` | timestamptz | nulo até `finished`/`cancelled` |
| `timestamps` | | `created_at`, `updated_at` |

Índices: `(state, start_deadline_at)` para o cron; `(puzzle_id)`.

## duel_participants

| Coluna | Tipo | Regra |
|---|---|---|
| `duel_participant_id` | uuid PK | |
| `duel_id` | uuid FK → `duels` | `ON DELETE CASCADE` |
| `role` | text | `creator` ou `opponent` (CHECK); `unique (duel_id, role)` |
| `user_id` | uuid FK → `users` | **anulável**, `ON DELETE SET NULL` |
| `nickname` | text | 1–24 caracteres, aparado; obrigatório para todos |
| `token_hash` | text | SHA-256 do token do participante; `NOT NULL`, unique; gerado para todos e devolvido só a visitantes (o logado usa a sessão) |
| `started_at` | timestamptz | nulo até "Começar" (o criador também começa pelo botão) |
| `finished_at` | timestamptz | nulo até terminar/desistir |
| `elapsed_ms` | integer | tempo do servidor (`finished_at − started_at`), sem penalidade |
| `helps_used` | integer | declarado pelo cliente, `0..1000` |
| `penalty_ms` | integer | calculado no servidor (`helps_used × help_penalty_ms`) |
| `end_reason` | text | nulo, `completed`, `forfeit`, `timeout` |
| `timestamps` | | |

Regras (CHECK): `(finished_at IS NULL) = (end_reason IS NULL)`; `end_reason = 'completed'` exige `elapsed_ms`; índice `(user_id)` parcial onde `user_id IS NOT NULL` para "Meus x1".

## Estados e transições

```text
open ──começar(oponente)──▶ running ──todos terminam / desistência / W.O.──▶ finished
 │                              │
 ├──cancelar(criador)──▶ cancelled      └─ (criador também joga dentro de running)
 ├──recusar(oponente)──▶ finished (outcome_reason = declined, vence o criador)
 └──prazo vencido sem oponente──▶ expirado (efetivo; apagado pelo cron)
```

`resolveDuel` (pura) deriva o estado efetivo: `waiting-opponent`, `playing`, `waiting-other`, `won`, `lost`, `tie`, `expired`, `cancelled`, `declined`. Quem tem `end_reason = 'completed'` e o outro sem fim com prazo vencido vence por `walkover`. `timeout` (tempo > `max_ms`) conta como perda.

## Rate limit (novas ações)

`DUEL_CREATE`, `DUEL_LOOKUP`, `DUEL_MINE` (chave `NETWORK_ADDRESS`; criação também `USER` quando há sessão), entram em `rateLimitActions` e no `CHECK` por migração.

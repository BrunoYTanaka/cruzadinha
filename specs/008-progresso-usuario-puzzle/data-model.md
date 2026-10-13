# Data Model: Progresso do usuário em cada puzzle

**Feature**: [spec.md](./spec.md) | **Decisões**: [research.md](./research.md)

## Tabela `progress` (nova)

Segue as convenções da base: `created_at` e `updated_at` (spread de `timestamps`) e o trigger `progress_set_updated_at` na migração.

| Coluna | Tipo | Regras |
|---|---|---|
| `user_id` | `uuid` | `NOT NULL`, FK `users.user_id` `ON DELETE CASCADE`; parte da chave |
| `puzzle_id` | `uuid` | `NOT NULL`, FK `puzzles.puzzle_id` `ON DELETE RESTRICT`; parte da chave |
| `cells` | `jsonb` | `NOT NULL`; matriz de letras do jogador (`null` = bloco ou vazia); relida por Zod |
| `elapsed_ms` | `integer` | `NOT NULL`, `CHECK (elapsed_ms BETWEEN 0 AND 604800000)`; tempo da partida atual |
| `status` | `text` | `NOT NULL`, `CHECK (status IN ('in_progress','completed'))` |
| `saved_at` | `timestamptz` | `NOT NULL`; `savedAt` do último salvamento aplicado (ordem, FR-010) |
| `completed_at` | `timestamptz` | nulo até concluir; instante do servidor na conclusão |
| `finished_ms` | `integer` | nulo até concluir; tempo total da última conclusão (FR-007) |
| `best_ms` | `integer` | nulo até a primeira conclusão; menor `finished_ms` já obtido |
| `best_at` | `timestamptz` | nulo até a primeira conclusão; instante em que `best_ms` foi obtido (só muda quando o recorde é batido) |
| `created_at`, `updated_at` | `timestamptz` | convenção da base |

Chave primária: `(user_id, puzzle_id)`. Índice extra: `progress_puzzle_id_idx` em `puzzle_id` (a FK com `RESTRICT` consulta por puzzle; também serve a biblioteca futura).

Checks de coerência:

- `progress_completed_pair`: `(status = 'completed') = (completed_at IS NOT NULL AND finished_ms IS NOT NULL)`.
- `progress_best_pair`: `(best_ms IS NULL) = (best_at IS NULL)`.
- `progress_best_when_finished`: `finished_ms IS NULL OR (best_ms IS NOT NULL AND best_ms <= finished_ms)`.

## Estados e transições

```text
(sem linha) --PUT in_progress--> in_progress --PUT in_progress--> in_progress
in_progress --PUT completed--> completed        (completed_at, finished_ms; best_ms e best_at só se for recorde estrito)
completed   --PUT completed--> completed        (idempotente: nada muda)
completed   --PUT in_progress/letras--> recusado (409 progress-completed)
completed   --POST reset--> in_progress         (cells vazias, elapsed 0; completed_at e finished_ms limpos; best_ms e best_at mantidos)
in_progress --POST reset--> in_progress         (cells vazias, elapsed 0)
(sem linha) --POST reset--> in_progress         (linha vazia)
```

Um `PUT` com `savedAt` anterior ao `saved_at` guardado não muda estado em nenhuma transição.

## Entidades de contrato (`packages/shared`)

- `saveProgressRequestSchema`: `{ cells, elapsedMs, status, savedAt }`. `cells` é validado contra a grade do puzzle no serviço (`cellsMatchGrid`), não só no formato.
- `progressSchema`: `{ puzzleId, cells, elapsedMs, status, savedAt, completedAt, finishedMs, bestMs, bestAt, updatedAt }` (datas em ISO-8601; nulos como `null`).
- `progressEnvelopeSchema`: `{ progress: Progress | null }`, corpo de sucesso das três rotas.

## Relações

`users 1 — N progress N — 1 puzzles`. O puzzle continua compartilhado; só `progress` é individual. A solução não é lida por este módulo.

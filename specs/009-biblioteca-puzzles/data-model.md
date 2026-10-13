# Data Model: Biblioteca de puzzles

**Feature**: [spec.md](./spec.md) | **Decisões**: [research.md](./research.md)

Nenhuma tabela ou coluna nova. A biblioteca é uma **visão de leitura** montada a cada pedido sobre `puzzles` e `progress` (feature 008).

## Origem dos campos

| Campo do item | Origem | Observação |
|---|---|---|
| `puzzleId` | `puzzles.puzzle_id` | |
| `date` | `puzzles.date` | `YYYY-MM-DD` |
| `level` | `puzzles.level` | hoje só `daily` |
| `status` | derivado | `not_started` \| `in_progress` \| `completed` (veja abaixo) |
| `elapsedMs` | `progress.elapsed_ms` | só quando `in_progress`; senão `null` |
| `finishedMs` | `progress.finished_ms` | só quando `completed`; senão `null` |
| `completedAt` | `progress.completed_at` | só quando `completed`; senão `null` |
| `bestMs` | `progress.best_ms` | quando existir, em qualquer situação; senão `null` |
| `bestAt` | `progress.best_at` | idem |

Não saem na resposta: `puzzles.data`, `puzzles.solution`, `progress.cells`, `progress.saved_at`, `progress.updated_at`.

## Derivação de `status`

| Linha em `progress` | `status` guardado | Há letras? | Situação do item |
|---|---|---|---|
| inexistente | - | - | `not_started` |
| existe | `completed` | - | `completed` |
| existe | `in_progress` | sim | `in_progress` |
| existe | `in_progress` | não | `not_started` (linha vazia, ou reiniciada; `bestMs`/`bestAt` continuam) |

## Regras

- Isolamento: a junção filtra `progress.user_id` pelo usuário da sessão; nunca por parâmetro.
- Ordem: `date` decrescente, depois `level`, depois `puzzle_id`. Máximo de 366 itens (`LIBRARY_LIMIT`).
- Coerência herdada dos checks de `progress`: `completed` implica `completedAt` e `finishedMs`; `bestMs` e `bestAt` aparecem juntos.

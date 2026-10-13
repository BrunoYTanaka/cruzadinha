# Contrato: rota da biblioteca

**Feature**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md)

Exige sessão (cookie, como as demais rotas). O usuário é sempre o da sessão. A rota declara `schema` OpenAPI (tag `library`, `security: session`).

## `GET /api/library`

Sem parâmetros nesta versão.

| Situação | Status | Corpo |
|---|---|---|
| Há puzzles guardados | `200` | `{ items }` com até 366 itens, do mais recente ao mais antigo |
| Nenhum puzzle guardado | `200` | `{ items: [] }` |
| Sem sessão | `401` | `unauthenticated` |

Nunca consulta a fonte externa, nunca consome o limite `PUZZLE_FETCH` e nunca devolve grade, dicas, solução nem letras do jogador.

## Tipo `LibraryItem`

```json
{
  "puzzleId": "0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a",
  "date": "2026-10-13",
  "level": "daily",
  "status": "completed",
  "elapsedMs": null,
  "finishedMs": 412000,
  "completedAt": "2026-10-13T14:03:22.000Z",
  "bestMs": 398000,
  "bestAt": "2026-10-10T09:12:45.000Z"
}
```

| Campo | Tipo | Regra |
|---|---|---|
| `puzzleId` | uuid | |
| `date` | `YYYY-MM-DD` | |
| `level` | `daily` | |
| `status` | `not_started` \| `in_progress` \| `completed` | |
| `elapsedMs` | inteiro \| `null` | só em `in_progress` |
| `finishedMs`, `completedAt` | inteiro/instante \| `null` | só em `completed` |
| `bestMs`, `bestAt` | inteiro/instante \| `null` | juntos; mantidos após reinício |

Exemplo de resposta: `{ "items": [ <LibraryItem>, ... ] }`.

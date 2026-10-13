# Contrato: rotas de progresso

**Feature**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md)

Todas exigem sessão (cookie, como as demais rotas). O usuário é sempre o da sessão. Corpo de sucesso das três rotas: `{ "progress": Progress | null }`. Cada rota declara `schema` OpenAPI (tag `progress`, `security: session`).

## `GET /api/progress/:puzzleId`

| Situação | Status | Corpo |
|---|---|---|
| Há progresso do usuário neste puzzle | `200` | `{ progress }` |
| Puzzle existe, sem progresso | `200` | `{ progress: null }` |
| `puzzleId` malformado ou inexistente | `404` | `puzzle-unavailable` |
| Sem sessão | `401` | `unauthenticated` |

## `PUT /api/progress/:puzzleId`

Corpo:

```json
{ "cells": [["A", null], [null, "D"]], "elapsedMs": 83000, "status": "in_progress", "savedAt": "2026-10-13T14:03:22.000Z" }
```

| Situação | Status | Corpo |
|---|---|---|
| Salvo (cria ou substitui) | `200` | `{ progress }` com o estado resultante |
| `savedAt` anterior ao já guardado | `200` | `{ progress }` com o estado atual, sem alteração |
| `status: completed` | `200` | idem; `completedAt`, `finishedMs`, `bestMs` e `bestAt` preenchidos |
| Registro já concluído e corpo tenta `in_progress` ou outras letras | `409` | `progress-completed` |
| Dimensão, bloco com letra, célula com mais de uma letra ou não maiúscula, tempo fora de 0..604800000, `savedAt` inválido ou mais de 5 min no futuro, `status` desconhecido | `400` | `invalid-input` (`fields` com nomes de campos) |
| `puzzleId` malformado ou inexistente | `404` | `puzzle-unavailable` |
| Sem sessão | `401` | `unauthenticated` |

Regras: `PUT` completed repetido sobre registro concluído com as mesmas letras é idempotente. O progresso anterior fica intacto em todo `400` e `409`. Letras nunca aparecem em log nem em erro.

## `POST /api/progress/:puzzleId/reset`

Sem corpo. Zera letras e tempo da partida atual, volta a `in_progress`, limpa `completedAt` e `finishedMs` (a última conclusão não é guardada), mantém `bestMs` e `bestAt` (o recorde e a data dele).

| Situação | Status | Corpo |
|---|---|---|
| Reiniciado (ou criado vazio) | `200` | `{ progress }` |
| `puzzleId` malformado ou inexistente | `404` | `puzzle-unavailable` |
| Sem sessão | `401` | `unauthenticated` |

## Tipo `Progress`

```json
{
  "puzzleId": "0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a",
  "cells": [["A", null], [null, "D"]],
  "elapsedMs": 83000,
  "status": "completed",
  "savedAt": "2026-10-13T14:03:22.000Z",
  "completedAt": "2026-10-13T14:03:23.412Z",
  "finishedMs": 83000,
  "bestMs": 79000,
  "bestAt": "2026-10-12T09:15:40.000Z",
  "updatedAt": "2026-10-13T14:03:23.412Z"
}
```

Exemplos usam grade e letras inventadas.

## Erros

Novo código em `apiErrorCodeSchema`: `progress-completed` (mensagem genérica). Os demais são os já existentes.

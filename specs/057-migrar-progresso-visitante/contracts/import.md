# Contract: POST /api/progress/import

Sessão obrigatória (`requireSession`). O usuário vem só da sessão. Tag `progress` no OpenAPI.

**Request** (`importProgressRequestSchema`, estrito)
```json
{ "items": [ { "puzzleId": "uuid", "cells": [[null,"A"]], "elapsedMs": 83000, "status": "in_progress",
  "savedAt": "2026-10-13T14:03:22.000Z", "completedAt": null, "finishedMs": null, "bestMs": null, "bestAt": null } ] }
```

**200** `importProgressResponseSchema` (tolerante a chaves novas): `{ "results": [{ "puzzleId", "result", "reason?" }], "imported": n, "kept": n, "rejected": n }`

| Status | Quando |
|---|---|
| 400 `invalid-input` + nomes de campos | corpo inválido (mais de 100 itens, `puzzleId` repetido, campo extra, estado incoerente) |
| 401 `unauthenticated` | sem sessão |
| 429 + `Retry-After` | limite `PROGRESS_SAVE` do usuário |

Itens inválidos individualmente (grade que não bate, cruzada desconhecida, `savedAt` no futuro) não geram 400: voltam como `rejected`.

Idempotente: reenviar o mesmo corpo devolve `kept` nos itens já importados e não altera dados.

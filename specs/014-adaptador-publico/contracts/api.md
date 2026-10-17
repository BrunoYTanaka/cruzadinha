# Contrato da API: fonte nas rotas de puzzle e biblioteca

Mudanças em relação às features 006, 007, 009 e 013. Os schemas ficam em `packages/shared`: as respostas são tolerantes e os pedidos, estritos. Toda rota mantém o `schema` de documentação (`docs.test.ts`).

## Parâmetro `source`

| Valor | Efeito |
| --- | --- |
| ausente | `oglobo`: a resposta é igual à de hoje (site da versão anterior, SC-007) |
| `oglobo` | Fonte O Globo |
| `cruzadaonline` | Fonte Cruzada Online (do Público) |
| outro | `400 { error: 'invalid-input', fields: ['source'] }` |

Schema: `puzzleSourceQuerySchema` (`shared`).

## `GET /api/puzzles?level=daily&date=YYYY-MM-DD&source=<id>`

- A resposta continua `{ puzzleId, puzzle, solution }`, com `puzzle.source` igual à fonte pedida.
- Erros iguais aos de hoje:
  - `404 puzzle-unavailable`: a fonte não tem o dia ou a data está no futuro.
  - `502 puzzle-source-failed`: a fonte falhou. O log registra só `{ source, reason }`.
  - `429 too-many-attempts` com `Retry-After`: o limite `PUZZLE_FETCH` por endereço é o mesmo para as duas fontes.
- Sessão opcional, como na feature 013.
- Um puzzle guardado nunca vai à fonte. Uma data no futuro responde 404 sem ir à fonte, mesmo quando o Público já publicou o arquivo.

Exemplo: `GET /api/puzzles?date=2026-10-16&source=cruzadaonline` → `200`

```json
{
  "puzzleId": "5d2f7c10-8a3b-4e6d-b1c9-3a4f5e6d7c8b",
  "puzzle": {
    "source": "cruzadaonline",
    "level": "daily",
    "date": "2026-10-16",
    "attribution": { "sourceName": "Cruzada Online", "title": null, "author": null, "copyright": "Cruzada Online" },
    "grid": { "width": 11, "height": 11, "cells": [["…"]] },
    "words": [{ "number": 1, "direction": "across", "row": 0, "col": 0, "length": 10, "clue": "…" }]
  },
  "solution": { "cells": [["…"]] }
}
```

## `GET /api/puzzles/:id`

Sem mudança. A fonte vem em `puzzle.source`.

## `GET /api/library?source=<id>`

- `200 { items: LibraryItem[] }` com só os puzzles da fonte pedida: até 366, do mais recente ao mais antigo.
- Cada item ganha `source`, igual à fonte pedida.
- Com sessão, a situação e os tempos vêm do usuário (feature 009). Sem sessão, todos os itens vêm `not_started` com tempos nulos (feature 013).
- Nunca vai à fonte.

```json
{
  "items": [
    {
      "puzzleId": "5d2f7c10-8a3b-4e6d-b1c9-3a4f5e6d7c8b",
      "source": "cruzadaonline",
      "date": "2026-10-16",
      "level": "daily",
      "status": "not_started",
      "elapsedMs": null,
      "finishedMs": null,
      "completedAt": null,
      "bestMs": null,
      "bestAt": null
    }
  ]
}
```

## Compatibilidade

| Combinação | Resultado |
| --- | --- |
| Site anterior → API nova | Não manda `source`: recebe só `oglobo`. O campo `source` do item é descartado pelo esquema tolerante. Nunca recebe `cruzadaonline`. |
| Site novo → API anterior (rollback) | A API ignora `source` e responde O Globo. O item sem `source` vira `oglobo` (`.default`). O site confere `puzzle.source` e mostra a fonte como indisponível (contracts/ui.md). |

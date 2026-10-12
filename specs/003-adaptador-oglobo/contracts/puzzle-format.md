# Contrato: formato interno de puzzle (`@cruzadinha/shared`)

O que `packages/shared/src/index.ts` passa a exportar. Campos e regras em [data-model.md](../data-model.md).

## Exportações

| Nome | Tipo | Uso |
|---|---|---|
| `levelSchema`, `Level` | schema e tipo | os cinco níveis |
| `puzzleSourceIdSchema`, `PuzzleSourceId` | schema e tipo | `'oglobo'` |
| `puzzleSchema`, `Puzzle` | schema e tipo | parte pública; o `safeParse` aplica as regras de FR-003 |
| `solutionSchema`, `Solution` | schema e tipo | letras por célula |
| `availableDateSchema`, `AvailableDate` | schema e tipo | datas informadas pela fonte |
| `validatePuzzleWithSolution(puzzle, solution)` | função | `{ success: true }` ou `{ success: false, issues: { path, message }[] }` (FR-004) |
| `wordCells(word)` | função | lista de `{ row, col }` ocupadas pela palavra |

## Garantias

- `Puzzle` não tem campo capaz de guardar letra da resposta, e os objetos são estritos (`z.strictObject`), recusando campos extras. Um teste confere, para cada fixture válida, que converter a mesma resposta com as letras da solução trocadas produz uma parte pública idêntica (SC-004).
- Mensagens de erro em português, com `path` apontando a palavra ou célula.
- Sem dependência de Node ou do navegador: o site pode importar os mesmos schemas.

## Exemplo mínimo (grade 2 x 2 sem blocos)

```json
{
  "source": "oglobo",
  "level": "mini",
  "date": "2026-10-12",
  "attribution": { "sourceName": "O Globo", "title": null, "author": null, "copyright": null },
  "grid": {
    "width": 2,
    "height": 2,
    "cells": [
      [{ "kind": "open", "number": 1 }, { "kind": "open", "number": 2 }],
      [{ "kind": "open", "number": 3 }, { "kind": "open", "number": null }]
    ]
  },
  "words": [
    { "number": 1, "direction": "across", "row": 0, "col": 0, "length": 2, "clue": "Dica 1H" },
    { "number": 3, "direction": "across", "row": 1, "col": 0, "length": 2, "clue": "Dica 3H" },
    { "number": 1, "direction": "down", "row": 0, "col": 0, "length": 2, "clue": "Dica 1V" },
    { "number": 2, "direction": "down", "row": 0, "col": 1, "length": 2, "clue": "Dica 2V" }
  ]
}
```

Solução correspondente: `{ "cells": [["A", "B"], ["C", "D"]] }`.

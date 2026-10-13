# Contrato: rotas de puzzles (alterações)

**Feature**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md) | **Base**: [006 http-api](../../006-coleta-puzzles/contracts/http-api.md)

Só muda o corpo de sucesso das duas rotas; parâmetros, ordem das verificações, status, limites e erros continuam como na 006.

## `GET /api/puzzles?level=daily&date=AAAA-MM-DD` e `GET /api/puzzles/:id`

| Situação | Status | Corpo |
|---|---|---|
| Puzzle guardado, ou buscado e gravado agora | `200` | `{ puzzleId, puzzle, solution }` (**mudou**: antes sem `solution`) |
| Puzzle guardado com par puzzle/solução inconsistente | `500` | `internal-error` genérico (**novo**) |
| Demais situações (`400`, `401`, `404`, `429`, `502`) | inalterado | inalterado, sem `solution` |

Exemplo (grade 2 x 2 de teste, conteúdo inventado):

```json
{
  "puzzleId": "0b9a3a4e-6d0e-4b6c-9a52-1f2e3d4c5b6a",
  "puzzle": { "source": "oglobo", "level": "daily", "date": "2026-10-12", "attribution": {}, "grid": {}, "words": [] },
  "solution": { "cells": [["A", "B"], ["C", "D"]] }
}
```

Regras:

- `solution` usa o formato guardado: matriz `height x width`, uma letra por célula aberta e `null` nos blocos (FR-002).
- O corpo só é entregue com sessão válida; sem sessão, `401` sem `solution` (FR-004).
- Nenhuma resposta de erro contém `solution` ou letras (FR-005). O log do `500` registra só nome e código do erro (FR-006).
- Puzzle buscado na fonte pela primeira vez já sai com `solution`, igual a um guardado.
- Mudança compatível para quem lê só `puzzleId` e `puzzle`; o contrato compartilhado `puzzleResponseSchema` passa a exigir `solution`.

## Documentação

`puzzles.schemas.ts` troca "nunca traz as letras" e "sem a solução" por descrições do novo corpo; o exemplo do documento usa letras inventadas (FR-008).

# Contract: `GET /api/admin/generated` (delta)

Rota, autenticação (`createRequireAdmin`, 404 para não admin), limites e erros não mudam (064). Só `sources[].today` ganha um campo opcional.

```jsonc
{
  "sources": [
    {
      "source": "casa",
      "gridSize": 13,            // configuração atual
      "difficulty": "hard",      // configuração atual
      "callsLeft": 2,
      "today": {
        "puzzleId": "…",
        "size": 11,
        "difficulty": "medium",  // NOVO: com que a cruzada de hoje foi gerada; null se não der para saber
        "discardable": true,
        "blockedBy": null,
        "words": [{ "number": 1, "direction": "across", "answer": "CASA", "clue": "Moradia" }]
      }
    }
  ]
}
```

Regras:

- `today.difficulty` vem de `parseDifficultyTitle(puzzle.attribution.title)`; não lê `solution` além do que já lia.
- Schema de resposta (`shared`): `difficulty: difficultySchema.nullable().optional()`. Site novo + API velha: campo ausente → cartão "—". Site velho + API nova: chave descartada pelo schema tolerante.
- O schema de documentação (`sources.schemas.ts`, `toDocSchema`) passa a listar o campo; `platform/docs/docs.test.ts` continua passando.

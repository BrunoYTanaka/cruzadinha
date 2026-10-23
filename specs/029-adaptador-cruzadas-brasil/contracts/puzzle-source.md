# Contrato: adaptador `cruzadasbrasil`

Implementa `PuzzleSource` (`apps/api/src/sources/types.ts`) com `id: 'cruzadasbrasil'`.

```ts
createCruzadasBrasilSource(options?: {
  fetch?: typeof fetch      // injetado nos testes
  clock?: Clock             // "futuro" pelo dia em Brasília
  timeoutMs?: number        // 10_000
  maxBytes?: number         // 1_048_576
}): PuzzleSource
```

`fetchPuzzle(level, date)`:

- `TypeError` para nível ou data inválidos (como os outros adaptadores).
- Data posterior a hoje em Brasília → `{ ok:false, reason:'unavailable' }` sem pedido.
- Um `GET https://cruzadasbrasil.com.br/palavras-cruzadas/AAAAMMDD` (`accept: text/html`), sem nova tentativa, com `AbortSignal.timeout`.

| Situação | Resultado |
|----------|-----------|
| 404 | `unavailable` |
| 429 | `rate-limited` |
| 5xx, 403, erro de rede, tempo limite | `source-down` |
| outro status não 2xx nem 403/404/429 | `unexpected-format` |
| corpo maior que `maxBytes`, UTF-8 inválido, sem dados do jogo, JSON ou schema inválido, `id` diferente da data, grade/dicas/gabarito incoerentes | `unexpected-format` |
| `nivel` diferente de "Diário" | `unsupported` |
| tudo certo | `{ ok:true, puzzle, solution, dates: [] }` |

O `detail` é curto e nunca contém o corpo, letras ou texto de dica.

## Fixtures (`sources/cruzadasbrasil/fixtures/`)

HTML 5 x 5 com conteúdo inventado, no mesmo formato do payload real (`self.__next_f.push`): `daily-valid.html` (acentos e cedilha, uma célula inicial de duas direções), `no-game-data.html` (como 2026-08-01), `coming-soon.html`, `changed-shape.html`, `clue-without-word.html`, `word-without-clue.html`, `numbers-mismatch.html`, `positions-mismatch.html`, `grid-solution-mismatch.html`, `other-level.html`, `other-date.html`, `invalid-json.html`. Nunca uma página completa da fonte.

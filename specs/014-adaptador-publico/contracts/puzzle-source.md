# Contrato: adaptador `cruzadaonline`

Implementa a interface `PuzzleSource` de `apps/api/src/sources/types.ts` (feature 003), sem mudança na interface.

```ts
createCruzadaOnlineSource(options?: {
  fetch?: typeof globalThis.fetch // padrão: globalThis.fetch
  clock?: Clock                   // padrão: systemClock; decide "futuro" pelo dia em Brasília
  timeoutMs?: number              // padrão: 10_000
  maxBytes?: number               // padrão: 1_048_576
}): PuzzleSource                  // id: 'cruzadaonline'
```

## `fetchPuzzle(level, date)`

- `TypeError` para nível fora de `levelSchema` ou data fora de `isoDateSchema`, antes de qualquer pedido.
- Data posterior a `todayInSaoPaulo(clock)`: `{ ok: false, reason: 'unavailable', detail: 'data no futuro' }`, sem pedido.
- Pedido único: `GET https://static.publico.pt/s3/files/widgets/crosswords/prd/<AAAAMMDD>.xml`, sem nova tentativa.
- Mapeamento de status e corpo: research R5. Leitura segura: research R2. Conversão: data-model §3.
- Sucesso: `{ ok: true, puzzle, solution, dates: [] }`, com o par já validado por `validatePuzzleWithSolution`.
- `detail` só contém códigos curtos (`HTTP 403`, `xml: InvalidTag`, `cell 3,4: solução ausente`), nunca trechos do corpo nem texto de dica (FR-010).

## Módulos

| Arquivo | Papel | Puro? |
| --- | --- | --- |
| `cruzadaonline.ts` | Pedido, status, tamanho, DOCTYPE, chamada à leitura e à conversão | não (rede) |
| `xml.ts` | `readXml(text): { ok: true; doc: unknown } \| { ok: false; detail }` com `XMLValidator` + `XMLParser` (R1) | sim |
| `crossword-compiler-schema.ts` | Zod do documento lido (data-model §3) | sim |
| `clue-text.ts` | `clueText(raw): string \| null` (R3) | sim |
| `convert.ts` | `convertCrosswordCompiler(doc, level, date): ConvertResult` (R4) | sim |
| `check.ts` | Verificação sob demanda (contracts/source-check.md); fora do bundle | não |
| `fixtures/*.xml` | Research R11 | — |

Nenhum outro módulo importa algo de `sources/cruzadaonline/` além de `app.ts`, `cli.ts`, `db/seed-puzzle.ts` e os testes.

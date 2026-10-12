# Contrato: interface `PuzzleSource` e adaptador O Globo (`apps/api`)

## Interface (`apps/api/src/sources/types.ts`)

```ts
interface PuzzleSource {
  readonly id: PuzzleSourceId
  fetchPuzzle(level: Level, date: string): Promise<FetchPuzzleResult>
}
```

`FetchPuzzleResult` em [data-model.md](../data-model.md#fetchpuzzleresult-só-no-servidor-apps-apisrcsourcestypests).

- `level` fora do enum ou `date` que não seja `AAAA-MM-DD` válida: lança `TypeError` antes de qualquer pedido (erro de quem chama).
- Qualquer falha da fonte vira `{ ok: false, reason }`; o método não lança por causa da fonte.
- Nenhuma outra parte do `api` importa de `sources/oglobo/` além da fábrica (FR-006).

## Fábrica do adaptador (`apps/api/src/sources/oglobo/oglobo.ts`)

```ts
createOgloboSource(options?: {
  fetch?: typeof fetch          // padrão: fetch global
  generateToken?: () => string  // padrão: ANONYMOUS-<32 hex>-ANONYMOUS com node:crypto
  timeoutMs?: number            // padrão: 10_000
}): PuzzleSource
```

## Pedido à fonte

- `GET https://oglobo-api.agilmenteapp.com/api/games/crossword/{level}/{date}`
- Cabeçalhos: `x-access-token: <token>`, `accept: application/json`. Sem `x-key`.
- `signal: AbortSignal.timeout(timeoutMs)`.
- No máximo 2 pedidos por chamada: o primeiro e, só após recusa, um com token novo (FR-008, FR-012).

## Mapeamento da resposta

| Resposta | Ação | Resultado |
|---|---|---|
| Corpo `{ "error": "NO-USER" }` (qualquer status) ou HTTP 401/403 | trocar token e repetir uma vez | se repetir: `refused` |
| HTTP 429 | parar | `rate-limited` |
| HTTP 5xx, erro de rede, `TimeoutError`/`AbortError` | parar | `source-down` |
| Corpo com `"error": "NOT-AVAILABLE"` (qualquer status, mesmo acompanhado do resto da resposta) | não converter | `unavailable` |
| HTTP 404 | | `unavailable` |
| HTTP 200, corpo válido, `dates` marca a data pedida com `inTheFuture: true` | | `unavailable` |
| Corpo não-JSON, outro valor em `error`, outro 4xx, ou fora do schema da Agilmente | | `unexpected-format` |
| Corpo válido com recurso fora do suporte | | `unsupported` |
| Corpo válido, conversão consistente | | `ok: true` |

Observado pelo autor em 2026-10-12: data mal formada (por exemplo `2026-13-01`) recebe o corpo completo (`dates`, `ipuzData` etc.) acrescido de `"error": "NOT-AVAILABLE"`, e pedido sem data recebe HTTP 502. Como o corpo com `NOT-AVAILABLE` traz um `ipuzData` que não é da data pedida, o campo `error` é conferido antes de qualquer conversão. O adaptador valida a data antes do pedido, então nunca envia data mal formada nem ausente; o comportamento para data bem formada sem puzzle é confirmado na T020.

## Conversão ipuz → formato interno (`convert.ts`, função pura)

1. `kind` precisa incluir `http://ipuz.org/crossword#1`; senão `unsupported`.
2. `block` (padrão `#`) e `empty` (padrão `0`) vêm do próprio ipuz.
3. `puzzle` e `solution` precisam ter `height` linhas de `width` células; senão `unexpected-format`. Célula ausente ou `null` na grade: `unsupported`.
4. Célula da grade: igual a `block` → bloco; número > 0 → aberta com número; igual a `empty` ou 0 → aberta sem número; objeto → `unsupported`; outro valor → `unexpected-format`.
5. Palavras: sequências de 2 ou mais células abertas por linha (`across`) e por coluna (`down`). A célula inicial precisa ter número; senão `unexpected-format`.
6. Dicas: cada palavra recebe o texto de `clues.Across`/`clues.Down` com o mesmo número, sem alteração. Palavra sem dica, dica sem palavra ou dica vazia: `unexpected-format`. Dica que não seja par `[número, texto]`: `unsupported`.
7. Solução: bloco ↔ `block`/`null`; célula aberta precisa ter exatamente 1 caractere (mais de um: `unsupported`; vazio: `unexpected-format`), convertido com `toLocaleUpperCase('pt-BR')`.
8. Atribuição: `sourceName: "O Globo"`, `title`, `author`, `copyright` do ipuz ou `null`.
9. `dates`: cada entrada vira `{ date, inTheFuture }`; entradas com data inválida são descartadas; lista ausente vira `[]`.
10. O resultado passa por `puzzleSchema` e `validatePuzzleWithSolution`; qualquer falha aqui é `unexpected-format`.

## Garantias de segurança

- O token fica só na closure da instância; não aparece em `detail`, exceção, log ou retorno (FR-013).
- `detail` contém apenas caminho de campo e tipo esperado, nunca valores da resposta.
- O adaptador não escreve logs.

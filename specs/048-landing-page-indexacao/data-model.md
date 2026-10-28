# Data Model: Landing page pública e indexação no Google

Nenhuma tabela, coluna, contrato de API ou chave de armazenamento nova. Só dados estáticos do site.

## SourceDescription

- **Onde**: `features/landing/helpers/source-descriptions.ts`
- **Forma**: `Record<PuzzleSourceId, string>`: uma descrição curta (1 a 2 frases) por fonte.
- **Regras**: a chave é o tipo `PuzzleSourceId` de `shared`, então fonte sem descrição ou descrição de fonte inexistente não compila (FR-010, SC-007). O nome exibido vem de `puzzleSourceNames`; a ordem, de `puzzleSourceIdSchema.options`. O texto não cita dicas, grades nem marcas das fontes (FR-011).

## MiniCrosswordSample

- **Onde**: `features/landing/helpers/sample.ts`
- **Forma**: um par `{ puzzle, solution }` no formato interno (`puzzleSchema`, `solutionSchema` de `shared`), 5x5, com palavras e dicas inventadas.
- **Regras**: passa em `puzzleSchema.safeParse` e `solutionSchema.safeParse` (teste); não é igual a nenhuma cruzada de fonte (revisão manual, registrada no teste como comentário); letras acentuadas, se houver, comparadas com `plainLetter`.
- **Estado**: `GameState` do `domain/game`, criado ao montar o componente e descartado ao sair; nunca gravado (FR-009). Sem relógio, sem ajuda, sem rascunho.

## Chaves lidas (sem escrever)

- `cruzadinha:settings` (campo `directToGame`): lida pelo `<script>` do `index.html` e pelo `directPlayLoader`, que já a leem hoje. Nada novo é gravado.

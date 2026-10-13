# Data Model: Resposta no puzzle entregue ao front-end

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Nenhuma mudança de banco: a tabela `puzzles` (feature 006) já guarda `data` (parte pública) e `solution` (jsonb, `Solution` de `@cruzadinha/shared`) em colunas separadas. Nenhuma migração.

## Resposta de puzzle (`PuzzleResponse`, em `packages/shared`)

| Campo | Tipo | Regras |
|---|---|---|
| `puzzleId` | uuid | identificador do puzzle guardado |
| `puzzle` | `Puzzle` | parte pública (grade, palavras com dicas, atribuição); sem letras |
| `solution` | `Solution` | **novo**; `{ cells: (string \| null)[][] }`, mesmo formato guardado |

Regras de coerência (aplicadas por `validatePuzzleWithSolution`, também no `safeParse` da resposta):

- `solution.cells` tem as dimensões da grade (`height` linhas, `width` colunas).
- Cada célula aberta tem exatamente uma letra; cada bloco é `null`.
- As palavras do puzzle cobrem as células abertas de forma coerente com a solução.
- O objeto é estrito: campos extras são recusados.

## Fluxo de entrega

1. Repositório lê a linha e relê `data` e `solution` por Zod (`toStored`, inalterado).
2. Serviço valida o par; se falhar, lança erro (resposta `500 internal-error`, log com nome e código apenas).
3. Rota monta `{ puzzleId, puzzle, solution }` e responde `200`.

Não há novos estados nem transições. Puzzles antigos e o exemplo do seed passam a sair com solução sem reprocessamento.

# Data Model: Imprimir a cruzada

Sem entidade persistida, sem tabela, sem DDE/ERD novos.

## Folha de impressão (só em memória)

Derivada de `Puzzle` (`@cruzadinha/shared`), nunca de `Solution` nem de `GameState`.

| Campo | Origem |
|-------|--------|
| Título | `puzzleSourceNames[puzzle.source]` + data longa com ano (`printDate(puzzle.date)`) |
| Casas | `puzzle.grid.cells` (`block` / `open` com `number`) |
| Dicas horizontais / verticais | `puzzle.words` filtradas por `direction`, ordenadas por `number`; cada item: número, dica, `length` |
| Atribuição | `attributionLine(puzzle)` |

Regras: nenhum campo guarda letra; o componente não aceita `solution`, `cells` do jogo nem `draft` como propriedade.

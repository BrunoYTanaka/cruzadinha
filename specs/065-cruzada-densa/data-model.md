# Data Model: Casa com grade densa

Sem mudança de banco: nenhuma tabela, coluna ou migração nova. DDE e ERD continuam como estão. As entidades abaixo vivem em código (`apps/api/src/sources/generated/`).

## Lista de palavras (`words/word-list.data.ts`, gerada)

Constante de texto, uma entrada por linha, em ordem de frequência (mais comum primeiro):

| Campo   | Regra                                                                                        |
| ------- | -------------------------------------------------------------------------------------------- |
| `plain` | maiúsculas `A-Z`, sem acento nem cedilha, 3 a 15 letras; único na lista                      |
| `form`  | forma original em minúsculas, com acento e cedilha quando houver (vai para o pedido de dica) |
| `band`  | `1` comum (posição até 15 000), `2` intermediária (até 30 000), `3` rara (até 50 000)        |

Fora da lista: palavras que o Hunspell pt_BR recusa, com caractere fora de `a-zà-ü`, de `excluded.txt` ou com termo da lista de bloqueio. Lida uma vez por geração e convertida num índice por comprimento.

## Desenho (`Template`)

Grade `N x N` de booleanos (preta / branca):

- simétrica por rotação de meia volta: `black[r][c] === black[N-1-r][N-1-c]`;
- pretas ≤ 25% das casas;
- toda corrida de brancas, na horizontal e na vertical, com 3 a `MAX_SLOT` letras;
- brancas ligadas entre si.

## Corrida (`Slot`)

Uma palavra a preencher: direção, casa inicial, comprimento e as casas que cruza. Toda casa branca está em exatamente uma corrida horizontal e uma vertical.

## Grade preenchida (`FilledGrid`)

Desenho + uma entrada da lista por corrida, sem repetir `plain`, com a mesma letra em cada cruzamento. Entra em `toPuzzle` com as dicas para virar `Puzzle` + `Solution` (formato das outras fontes, mesmas validações).

## Pedido e resposta de dicas

Ver `contracts/clue-request.md`. Entrada: `{ n, form }` por corrida, mais a dificuldade. Saída validada: uma dica por `n`.

## Configuração da fonte gerada

Igual à 064 (`generated_source_settings`: tamanho 9 a 15, dificuldade). A dificuldade passa a escolher a faixa de palavras (`band`), além do estilo da dica.

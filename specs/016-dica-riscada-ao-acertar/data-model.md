# Data Model: Dica riscada só ao acertar a palavra

Nada é persistido. Os dados abaixo são derivados no navegador a cada mudança de letra.

## 1. Modo de riscar (`StrikeMode`)

| Campo | Tipo | Regra |
| --- | --- | --- |
| valor | `'solved'` | Único valor nesta feature. A preferência futura acrescenta `'filled'` e `'never'` à união (R2). |

Escolhido num único lugar (`STRIKE_MODE` em `useGame`). Não vai para `localStorage`, IndexedDB nem servidor.

## 2. Situação da dica (derivada)

Para cada `Word` do puzzle:

| Entrada | Origem |
| --- | --- |
| `cells` | `GameState.cells` (letras do jogador, A–Z e Ç, ou `null`) |
| `solution.cells` | `response.solution` (pode ter acento) |
| células da palavra | `PuzzleIndex.cellsOf(word)` |

- **Resolvida** se e só se toda célula da palavra tem letra e `cells[r][c] === plainLetter(solution.cells[r][c])` (FR-001).
- Caso contrário, **não resolvida**, inclusive completa e errada (FR-002).
- Não depende de `marks`, `locked`, `usage`, `mode`, relógio nem conclusão (FR-007, R7).

## 3. Conjunto de dicas riscadas (`struck`)

- Tipo: `ReadonlySet<string>` com chaves `wordKey(word)` (`` `${number}${direction}` ``, por exemplo `"6across"`).
- Com `mode = 'solved'`: as chaves das palavras resolvidas.
- Termos: "dica riscada" (na tela), "palavra resolvida" (na spec e no leitor de tela), `struck` e `isWordSolved` (no código) são o mesmo conjunto no modo `'solved'`.
- Transições: recalculado quando `state.cells` muda (digitar, apagar, Delete, ajudas, `hydrate`, "jogar de novo"). Nenhum outro evento o altera.

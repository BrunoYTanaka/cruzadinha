# Data Model: Formato interno de puzzle e adaptador O Globo

Nenhuma tabela nesta feature: as entidades abaixo são estruturas em memória, definidas como schemas Zod em `packages/shared/src/puzzle/` (formato interno) e tipos em `apps/api/src/sources/` (resultado da busca). A persistência chega na feature de puzzles, que guardará `Puzzle` e `Solution` em colunas separadas.

Convenções: linhas e colunas começam em 0, a partir do canto superior esquerdo. Datas são `AAAA-MM-DD` (`z.iso.date()`).

## Level

Enum: `daily` (FR-005). A fonte não publica outros níveis.

## Puzzle (parte pública)

| Campo | Tipo | Regras |
|---|---|---|
| `source` | `'oglobo'` | enum das fontes conhecidas; só `oglobo` na v1 |
| `level` | `Level` | |
| `date` | string | `AAAA-MM-DD` válida |
| `attribution` | `Attribution` | |
| `grid` | `Grid` | |
| `words` | `Word[]` | ao menos 1 |

Não tem nenhum campo de letra (FR-002, SC-004).

### Attribution

| Campo | Tipo | Regras |
|---|---|---|
| `sourceName` | string | não vazia; `"O Globo"` para a fonte `oglobo` |
| `title` | string \| null | como veio da fonte |
| `author` | string \| null | como veio da fonte |
| `copyright` | string \| null | como veio da fonte |

### Grid

| Campo | Tipo | Regras |
|---|---|---|
| `width` | inteiro | 1 a 30 |
| `height` | inteiro | 1 a 30 |
| `cells` | `Cell[][]` | `height` linhas com `width` células cada |

### Cell

União discriminada por `kind`:

- `{ kind: 'block' }`
- `{ kind: 'open', number: inteiro positivo | null }`

### Word

| Campo | Tipo | Regras |
|---|---|---|
| `number` | inteiro positivo | igual ao `number` da célula inicial |
| `direction` | `'across'` \| `'down'` | |
| `row`, `col` | inteiro ≥ 0 | célula inicial dentro da grade |
| `length` | inteiro ≥ 2 | |
| `clue` | string | não vazia após remover espaços; texto como veio da fonte |

As células de uma palavra são derivadas: `across` ocupa `(row, col + i)`, `down` ocupa `(row + i, col)`, para `i` de 0 a `length - 1`.

### Regras do Puzzle (FR-003, via `superRefine`)

1. Toda palavra fica dentro da grade e só passa por células `open`.
2. A sequência de células abertas na direção da palavra tem exatamente `length` células: a célula anterior à inicial e a posterior à final são borda ou bloco.
3. A célula inicial é `open` com `number` igual ao da palavra.
4. Não há duas palavras com o mesmo `number` na mesma direção.
5. Toda célula `open` pertence a pelo menos uma palavra.
6. Toda célula com `number` inicia pelo menos uma palavra.

Cada violação gera um issue com `path` apontando a palavra (`['words', i]`) ou a célula (`['grid', 'cells', r, c]`).

## Solution

| Campo | Tipo | Regras |
|---|---|---|
| `cells` | `(string \| null)[][]` | mesma forma da grade; `null` nos blocos; nas células abertas, exatamente um caractere, em maiúscula |

### Regras do par Puzzle + Solution (FR-004, `validatePuzzleWithSolution`)

1. Mesmas dimensões.
2. `null` exatamente nas células `block`.
3. Um caractere (uma letra, acentuada ou não) em cada célula `open`.

## AvailableDate

| Campo | Tipo | Regras |
|---|---|---|
| `date` | string | `AAAA-MM-DD` |
| `inTheFuture` | boolean | como marcado pela fonte |

## FetchPuzzleResult (só no servidor, `apps/api/src/sources/types.ts`)

União discriminada por `ok`:

- `{ ok: true, puzzle: Puzzle, solution: Solution, dates: AvailableDate[] }`. O par já passou por `validatePuzzleWithSolution`.
- `{ ok: false, reason: FetchFailureReason, detail?: string }`, com `reason` em `unavailable`, `refused`, `rate-limited`, `source-down`, `unexpected-format`, `unsupported` (FR-010). `detail` é um texto curto para diagnóstico, sem token nem conteúdo da resposta (FR-013), por exemplo `ipuzData.dimensions.width: esperado número`.

## Resposta da Agilmente (só no adaptador)

Schema Zod do lado de fora do sistema, em `apps/api/src/sources/oglobo/agilmente-schema.ts`, aplicado ao corpo recebido como `unknown` (FR-011). Cobre o que `decision.md` descreve:

- `id` (string), `dates` (lista de `{ date, inTheFuture, ... }`, campos extras ignorados), `ipuzData`, `fromIpuz` (exigido como objeto, não usado na conversão).
- `ipuzData`: `kind` (lista com `http://ipuz.org/crossword#1`), `dimensions { width, height }`, `puzzle` (linhas de células: número, string ou objeto, este último `unsupported`), `solution` (linhas de string ou `null`), `clues { Across, Down }` (pares `[número, texto]`), `block` e `empty` opcionais, `title`, `author`, `copyright` opcionais.
- Recusa: `{ error: string }`.

Conversão para `Puzzle` + `Solution`: ver [contracts/puzzle-source.md](./contracts/puzzle-source.md).

## Estados

Sem ciclo de vida: o resultado é produzido a cada chamada. O único estado do adaptador é o token anônimo em memória: ausente → gerado na primeira chamada → substituído uma vez a cada recusa.

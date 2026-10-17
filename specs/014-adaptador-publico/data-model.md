# Data Model: Adaptador da fonte Público

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## 1. Identificador de fonte (`shared`)

| Valor | Nome na atribuição | Adaptador |
| --- | --- | --- |
| `oglobo` | O Globo | `apps/api/src/sources/oglobo/` (sem mudança) |
| `cruzadaonline` | Cruzada Online | `apps/api/src/sources/cruzadaonline/` (novo) |

- `puzzleSourceIdSchema = z.enum(['oglobo', 'cruzadaonline'])`.
- `puzzleSourceQuerySchema = puzzleSourceIdSchema.default('oglobo')`: para as rotas, onde a fonte não informada vale `oglobo` (R7).
- `puzzleSourceNames = { oglobo: 'O Globo', cruzadaonline: 'Cruzada Online' }`: única fonte dos nomes exibidos (atribuição gravada pelos adaptadores, saída da coleta e rótulos do seletor).
- O formato interno de puzzle e solução (feature 003) não muda: `puzzle.source` só ganha um valor possível. O nível continua só `daily`.

## 2. Banco (`puzzles`)

Sem coluna nova. Muda só a regra:

| Regra | Antes | Depois |
| --- | --- | --- |
| `puzzles_source_check` | `source IN ('oglobo')` | `source IN ('oglobo', 'cruzadaonline')` |

- A chave única `(source, level, date)` continua: um puzzle por fonte, nível e data.
- Os puzzles das duas fontes para o mesmo dia são linhas diferentes, com `puzzle_id` diferentes.
- `progress` (chave `(user_id, puzzle_id)`) e o IndexedDB de visitante (chave `puzzleId`) já ficam separados por fonte, sem mudança.
- Migração `0004_puzzles_source_cruzadaonline` (R8): só troca a regra, sem atualizar dados. É reversível trocando a regra de volta, desde que não haja linhas `cruzadaonline`.

## 3. Arquivo do dia do Público (entrada do adaptador)

Estrutura aceita depois da leitura do XML (validada por Zod em `crossword-compiler-schema.ts`). Os atributos chegam como texto, e o Zod converte os números.

```text
crossword-compiler
└─ rectangular-puzzle
   ├─ metadata: title?, creator?, copyright?, description?   (texto; vazio → null)
   └─ crossword
      ├─ grid @width @height                                  (inteiros 1..30)
      │  └─ cell[] @x @y                                      (inteiros 1-based; x = coluna, y = linha)
      │            @type? = "block"                           (bloco)
      │            @solution? (1 grafema) @number? (inteiro > 0)
      ├─ word[] @id  @x ("N" | "N-M")  @y ("N" | "N-M")
      └─ clues[] (2 grupos; título ignorado)
         └─ clue[] @word (id) @number @format?  texto cru     (hint-url e outros atributos ignorados)
```

Regras de conversão (research R4). Cada violação leva ao motivo indicado:

| Regra | Motivo |
| --- | --- |
| Toda posição `(x, y)` da grade aparece exatamente uma vez | `unexpected-format` |
| `type` diferente de `block` | `unsupported` |
| `solution` com mais de um grafema | `unsupported` |
| Célula aberta sem `solution` | `unexpected-format` |
| Palavra com exatamente um eixo em intervalo crescente | `unexpected-format` (intervalo decrescente ou palavra em trechos: `unsupported`) |
| Cada palavra tem exatamente uma dica, e cada dica aponta para uma palavra existente | `unexpected-format` |
| `clue@number` = número da célula inicial da palavra | `unexpected-format` |
| `format` inteiro = tamanho da palavra (formato composto é ignorado) | `unexpected-format` |
| Texto da dica não vazio depois de `clueText` | `unexpected-format` |
| Resultado passa em `puzzleSchema` e `validatePuzzleWithSolution` | `unexpected-format` |

Saída: o `FetchPuzzleSuccess` de `sources/types.ts`. `source: 'cruzadaonline'`, `level: 'daily'`, a data pedida, `attribution.sourceName: 'Cruzada Online'`, `attribution.copyright` do arquivo ou, se vazio, `'Cruzada Online'`, e `dates: []`.

## 4. Relatório da coleta (API, `puzzles.service.ts`)

```text
CollectRun
└─ sources[]: { source: PuzzleSourceId, report: CollectReport }
   CollectReport (feature 006, sem mudança): saved[], skipped[], unavailable[], failed[{date, reason}], stoppedBy?, pending[]
```

- A ordem é a da lista de fontes do serviço: `oglobo`, depois `cruzadaonline`.
- `rate-limited` interrompe só a fonte afetada, e as demais seguem.
- Uma exceção inesperada de um adaptador entra como `failed` daquela fonte para a data atual, com motivo `source-down`, e a coleta segue para a próxima fonte.
- Código de saída do comando: 1 se alguma fonte tiver `failed` ou `stoppedBy`; senão 0.

## 5. Item da biblioteca (`shared`, `libraryItemSchema`)

Ganha um campo:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `source` | `PuzzleSourceId` | Na resposta da API nova, sempre presente e igual à fonte pedida. No site, `.default('oglobo')` para aceitar a API anterior. |

Os outros campos e a derivação (`toLibraryItem`, `toPublicLibraryItem`, `mergeGuestLibrary`) não mudam. O repositório só ganha o filtro `WHERE puzzles.source = :source`, e a ordem e o limite de 366 ficam como estão, agora por fonte.

## 6. Preferências no aparelho (site)

| Chave | Armazenamento | Valor | Regra |
| --- | --- | --- | --- |
| `cruzadinha:source` | `localStorage` | `oglobo` \| `cruzadaonline` | Validada por `puzzleSourceIdSchema`; ausente ou inválida vale `oglobo` |
| `cruzadinha:source-down:<source>` | `localStorage` | carimbo de tempo (ms) | Dura 10 min; substitui `cruzadinha:source-down` |
| `cruzadinha:no-puzzle:<source>:<date>` | `sessionStorage` | `'1'` | Substitui `cruzadinha:no-puzzle:<date>` |

Chaves de consulta (TanStack Query):

- `library(viewer, source)` → `['library', viewer, source]`. `libraryAll` continua `['library']` para invalidar todas.
- `puzzleByDate(source, date)` → `['puzzle-by-date', source, date]`.

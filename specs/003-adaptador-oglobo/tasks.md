---

description: "Task list for feature 003-adaptador-oglobo"
---

# Tasks: Formato interno de puzzle e adaptador O Globo

**Input**: Design documents from `/specs/003-adaptador-oglobo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (puzzle-format.md, puzzle-source.md, source-check.md), quickstart.md

**Tests**: Incluídos. FR-014 exige testes de contrato do adaptador, a história 1 define testes de validação e a constitution exige testes sem internet (princípios IV e VII). Em cada história, os testes vêm antes da implementação e devem falhar primeiro.

**Organization**: Tarefas agrupadas por história de usuário (US1 = P1, US2 = P2, US3 = P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1 a US3)

## Path Conventions

Monorepo npm workspaces: `packages/shared` e `apps/api` (ver Project Structure em plan.md). Todos os caminhos são relativos à raiz.

**Regras para todas as tarefas** (constitution v2.0.0 e `CLAUDE.md`):
- Consultar o Context7 antes de escrever código que use Zod ou Vitest; usar Zod 4.6 e Vitest 5.0 (ver `research.md`).
- Nunca escrever o tipo `any`; a resposta da fonte entra como `unknown` e passa por Zod.
- Formatar com Prettier (`semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`).
- Nunca gravar, imprimir ou commitar um token real no formato `ANONYMOUS-<32 hex>-ANONYMOUS`; os testes usam tokens falsos fora desse formato (por exemplo `token-de-teste-1`).
- Fixtures nunca reproduzem um puzzle completo da fonte: grade de no máximo 5 x 5, letras e dicas inventadas.
- Mensagens de erro em português, como em `apps/api/src/config.ts`.
- Commits em Conventional Commits, sem `Co-Authored-By`, com escopo `shared` ou `api`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar o repositório para as amostras da fonte real.

- [X] T001 Acrescentar `apps/api/.source-samples/` ao `.gitignore`, num bloco comentado "Respostas brutas da fonte (verificação sob demanda)"

---

## Phase 2: Foundational (Blocking Prerequisites)

Nenhuma tarefa: o formato interno (US1) é o pré-requisito da US2 e fica na própria fase da US1, que é o MVP.

---

## Phase 3: User Story 1 - Definir o formato interno de puzzle (Priority: P1) 🎯 MVP

**Goal**: Formato único de puzzle no `shared`, com parte pública e solução separadas e validação com motivo claro (FR-001 a FR-005).

**Independent Test**: `npm test -w @cruzadinha/shared` aceita o exemplo de `contracts/puzzle-format.md` e recusa cada variação inválida com `path` apontando a palavra ou célula.

### Tests for User Story 1

- [X] T002 [P] [US1] Criar `packages/shared/src/puzzle/schema.test.ts`: (a) o exemplo 2 x 2 de `specs/003-adaptador-oglobo/contracts/puzzle-format.md` passa em `puzzleSchema` e a solução `{ "cells": [["A","B"],["C","D"]] }` passa em `solutionSchema`; (b) `levelSchema` aceita `daily`, `mini`, `express`, `expert`, `thematic` e recusa `weekly`; (c) `date` recusa `2026-10-32` e `2026-1-1`; (d) objetos estritos recusam campo extra (por exemplo `letter` numa célula `open` ou `solution` no puzzle); (e) `width`/`height` fora de 1 a 30 são recusados; (f) `cells` com número de linhas diferente de `height` ou linha com tamanho diferente de `width` é recusado; (g) `availableDateSchema` aceita `{ date: '2026-10-12', inTheFuture: false }`
- [X] T003 [P] [US1] Criar `packages/shared/src/puzzle/rules.test.ts`, partindo do exemplo 2 x 2 e de uma grade 3 x 3 com bloco central, com um caso por regra de `specs/003-adaptador-oglobo/data-model.md` ("Regras do Puzzle"), cada um conferindo o `path` do issue: palavra saindo da grade; palavra passando por bloco; `length` menor que a sequência de células abertas; célula inicial sem `number` ou com número diferente; número repetido na mesma direção; célula `open` fora de qualquer palavra; célula com `number` que não inicia palavra; dica só com espaços. Para `validatePuzzleWithSolution`: dimensões diferentes, letra num bloco, `null` numa célula aberta, dois caracteres numa célula. Para `wordCells`: palavra `across` e `down` devolvem as posições na ordem

### Implementation for User Story 1

- [X] T004 [P] [US1] Criar `packages/shared/src/puzzle/word-cells.ts` com `wordCells(word: { direction: 'across' | 'down'; row: number; col: number; length: number }): { row: number; col: number }[]` ("`across` ocupa `(row, col + i)`, `down` ocupa `(row + i, col)`, para `i` de 0 a `length - 1`")
- [X] T005 [US1] Criar `packages/shared/src/puzzle/schema.ts` com `z.strictObject` em todos os objetos: `levelSchema` (enum `daily`, `mini`, `express`, `expert`, `thematic`), `puzzleSourceIdSchema` (enum `oglobo`), data com `z.iso.date()`, `cellSchema` (união discriminada por `kind`: `{ kind: 'block' }` ou `{ kind: 'open', number: inteiro positivo | null }`), `wordSchema` (`number` inteiro positivo, `direction` `'across' | 'down'`, `row`/`col` inteiro ≥ 0, `length` inteiro ≥ 2, `clue` string "não vazia após remover espaços; texto como veio da fonte", sem `trim` na saída), `gridSchema` (`width`/`height` inteiros de 1 a 30, `cells` com `height` linhas de `width` células, conferido em `superRefine`), `attributionSchema` (`sourceName` não vazia; `title`, `author`, `copyright` string ou `null`), `puzzleSchema` (`source`, `level`, `date`, `attribution`, `grid`, `words` com ao menos 1, aplicando as regras de `rules.ts` num `superRefine`), `solutionSchema` (`cells` de `string | null`) e `availableDateSchema` (`date`, `inTheFuture` boolean). Exportar os tipos com `z.infer` (`Level`, `PuzzleSourceId`, `Puzzle`, `Solution`, `AvailableDate`, `Word`, `Cell`)
- [X] T006 [US1] Criar `packages/shared/src/puzzle/rules.ts` com `checkPuzzleRules(puzzle, ctx)` (as seis regras de "Regras do Puzzle" em `data-model.md`, cada violação com `ctx.addIssue({ code: 'custom', path, message })`, `path` `['words', i]` ou `['grid', 'cells', r, c]`, mensagens em português) e `validatePuzzleWithSolution(puzzle: Puzzle, solution: Solution)` retornando `{ success: true }` ou `{ success: false, issues: { path: (string | number)[]; message: string }[] }` (mesmas dimensões, `null` exatamente nos blocos, exatamente um caractere em cada célula aberta). Usar `wordCells`; importar tipos de `schema.ts` com `import type`
- [X] T007 [US1] Exportar em `packages/shared/src/index.ts` tudo o que `specs/003-adaptador-oglobo/contracts/puzzle-format.md` lista, mantendo a exportação de `health`
- [X] T008 [US1] Rodar `npm test -w @cruzadinha/shared` e `npm run typecheck -w @cruzadinha/shared` e corrigir até passar (T002 e T003 verdes)

**Checkpoint**: formato interno pronto e validado; pode ser commitado sozinho (`feat(shared): add internal puzzle format`).

---

## Phase 4: User Story 2 - Obter um puzzle do O Globo por nível e data (Priority: P2)

**Goal**: Interface `PuzzleSource` e adaptador O Globo que busca, valida, converte e devolve sucesso ou um dos seis motivos de falha (FR-006 a FR-016).

**Independent Test**: `npm test -w @cruzadinha/api` sem internet: a fixture válida vira um puzzle idêntico à resposta, e cada fixture de falha devolve o motivo da tabela de `contracts/puzzle-source.md`.

**Depende de**: US1 (T005 a T007).

### Tests for User Story 2

- [X] T009 [P] [US2] Criar as fixtures em `apps/api/src/sources/oglobo/fixtures/`, provisórias até a T021: `daily-valid.json` (estrutura de `specs/001-viabilidade-fonte/decision.md`: `id`, `dates` com 3 entradas incluindo `fomattedDate`, `day`, `status` e uma com `inTheFuture: true`, `ipuzData` com `kind: ["http://ipuz.org/crossword#1"]`, `dimensions` 5 x 5, `puzzle` com blocos `#`, números e vazio `:`, `empty: ":"`, `solution` com letras inventadas, `clues.Across`/`clues.Down` como pares `[número, texto]` inventados, `title`, `author`, `copyright`, `intro`, `notes`, e `fromIpuz` com `across`/`down`), `refused.json` (`{"error":"NO-USER"}`), `changed-shape.json` (cópia da válida com `ipuzData.solution` renomeado para `ipuzData.solutions`), `unsupported-cell-style.json` (uma célula de `puzzle` como objeto `{ "cell": 1, "style": { "shapebg": "circle" } }`) `unsupported-rebus.json` (uma célula de `solution` com `"AB"`) e `unavailable.json` (cópia da válida acrescida de `"error": "NOT-AVAILABLE"` no nível de cima, como a fonte responde a data mal formada)
- [X] T010 [P] [US2] Criar `apps/api/src/sources/oglobo/convert.test.ts`: `daily-valid.json` converte para `Puzzle` + `Solution` com as mesmas dimensões, blocos, números, dicas (texto idêntico, sem decodificar nada) e letras em maiúscula, com `attribution.sourceName` `"O Globo"` e `dates` só com `{ date, inTheFuture }` (SC-001); trocar as letras da solução produz parte pública idêntica (SC-004); casos derivados em código a partir da válida, cada um com o motivo de `contracts/puzzle-source.md`: `kind` diferente (`unsupported`), linha a menos (`unexpected-format`), célula `null` (`unsupported`), sequência sem número (`unexpected-format`), dica sem palavra e palavra sem dica (`unexpected-format`), dica vazia (`unexpected-format`), dica como string em vez de par (`unsupported`), célula vazia na solução (`unexpected-format`), `dates` ausente vira `[]`; e as fixtures `unsupported-cell-style.json` e `unsupported-rebus.json` (`unsupported`) e `changed-shape.json` (`unexpected-format`, SC-005)
- [X] T011 [P] [US2] Criar `apps/api/src/sources/oglobo/oglobo.test.ts` com `fetch` injetado (`vi.fn()` devolvendo `new Response(...)`) e `generateToken` injetado (`token-de-teste-1`, `token-de-teste-2`): pedido usa `GET https://oglobo-api.agilmenteapp.com/api/games/crossword/daily/2026-10-12` com `x-access-token` e `signal`; o mesmo token é reutilizado entre duas chamadas; uma linha de teste para cada linha da tabela "Mapeamento da resposta" de `contracts/puzzle-source.md` (recusa pelo corpo com status 200 e por 401/403 → 2 chamadas com tokens diferentes e `refused`; recusa seguida de sucesso → `ok`; 429 → 1 chamada e `rate-limited`; 500, `fetch` rejeitando `TypeError` e rejeitando `DOMException` `TimeoutError` → 1 chamada e `source-down`; 404 → `unavailable`; data pedida com `inTheFuture: true` → `unavailable`; `unavailable.json` (corpo completo com `"error": "NOT-AVAILABLE"`) → 1 chamada e `unavailable`, sem puzzle; corpo não-JSON, `{"error":"OUTRO"}` e 400 → `unexpected-format`); `level` inválido e `date` `2026-13-01` lançam `TypeError` sem chamar `fetch`; em nenhum resultado (`JSON.stringify`) aparece o token nem `detail` com texto de dica

### Implementation for User Story 2

- [X] T012 [P] [US2] Criar `apps/api/src/sources/types.ts` com `FetchFailureReason` (`'unavailable' | 'refused' | 'rate-limited' | 'source-down' | 'unexpected-format' | 'unsupported'`), `FetchPuzzleResult` (união por `ok`, conforme `data-model.md`) e `PuzzleSource` (`readonly id: PuzzleSourceId`, `fetchPuzzle(level: Level, date: string): Promise<FetchPuzzleResult>`), importando os tipos de `@cruzadinha/shared`
- [X] T013 [P] [US2] Criar `apps/api/src/sources/oglobo/token.ts` com `generateAnonymousToken()` retornando `` `ANONYMOUS-${randomBytes(16).toString('hex')}-ANONYMOUS` `` (`node:crypto`)
- [X] T014 [P] [US2] Criar `apps/api/src/sources/oglobo/agilmente-schema.ts` com o schema Zod da resposta descrito em `data-model.md` ("Resposta da Agilmente"), usando `z.object` (não estrito: campos extras da fonte são ignorados) e `refusalSchema` (`{ error: string }`); células de `puzzle` como `number | string | object`, de `solution` como `string | null`, dicas como `unknown[]` (o formato do par é conferido no conversor para distinguir `unsupported`)
- [X] T015 [US2] Criar `apps/api/src/sources/oglobo/convert.ts` com `convertAgilmenteResponse(body: AgilmenteResponse, level: Level, date: string)` puro, seguindo os 10 passos de "Conversão ipuz → formato interno" em `contracts/puzzle-source.md`, retornando `{ ok: true, puzzle, solution, dates } | { ok: false, reason: 'unexpected-format' | 'unsupported', detail }`, com `detail` contendo só caminho de campo e o que se esperava
- [X] T016 [US2] Criar `apps/api/src/sources/oglobo/oglobo.ts` com `createOgloboSource({ fetch, generateToken, timeoutMs } = {})` (padrões: `fetch` global, `generateAnonymousToken`, `10_000`): valida `level` com `levelSchema` e `date` com `z.iso.date()` (lança `TypeError`), monta o pedido de `contracts/puzzle-source.md`, aplica a tabela de mapeamento (no máximo uma nova tentativa, só após recusa), lê o corpo como `unknown`, confere o campo `error` **antes** de qualquer outra validação (`NO-USER` → recusa; `NOT-AVAILABLE` → `unavailable`, mesmo com o resto da resposta presente; outro valor → `unexpected-format`), valida com `agilmente-schema.ts`, devolve `unavailable` se `dates` marcar a data com `inTheFuture: true` e chama `convertAgilmenteResponse`. Token só na closure; sem logs
- [X] T017 [US2] Rodar `npm test -w @cruzadinha/api` e `npm run typecheck -w @cruzadinha/api` e corrigir até passar (T010 e T011 verdes)

**Checkpoint**: adaptador funcional com fixtures provisórias (`feat(api): add oglobo puzzle source`). Fixtures ainda provisórias: não concluir a feature antes da T021.

---

## Phase 5: User Story 3 - Conferir sob demanda contra a fonte real (Priority: P3)

**Goal**: Verificação manual contra a fonte real e fixtures alinhadas às respostas reais (FR-016, FR-017).

**Independent Test**: `npm run source:check -w @cruzadinha/api` imprime uma linha por nível, faz no máximo um pedido por nível e não mostra token nem conteúdo.

**Depende de**: US2 (T016).

- [X] T018 [US3] Criar `apps/api/src/sources/oglobo/check.ts` conforme `specs/003-adaptador-oglobo/contracts/source-check.md`: argumentos `[AAAA-MM-DD] [--save]` (data padrão: hoje em `America/Sao_Paulo` via `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`; data inválida → uso e saída 2), cinco níveis em ordem com 2 s de pausa, parada no primeiro `rate-limited` listando os não consultados, uma linha por nível (`ok` com `LxA` e contagem de palavras, ou motivo e `detail`), saída 0 só se todos os consultados deram `ok` ou `unavailable`. Com `--save`, usar um `fetch` que envolve o global e grava o corpo em `apps/api/.source-samples/<level>-<date>.json` e indicar se alguma dica contém `<` ou `&`. Nunca imprimir token, cabeçalhos ou conteúdo
- [X] T019 [US3] Acrescentar `"source:check": "tsx src/sources/oglobo/check.ts"` aos scripts de `apps/api/package.json`
- [ ] T020 [US3] Rodar `npm run source:check -w @cruzadinha/api -- --save` (pedidos reais; confirmar com o autor antes) e registrar em `specs/003-adaptador-oglobo/findings.md`: data usada, resultado por nível, se havia marcação nas dicas, e diferenças entre a resposta real e `decision.md`. Fazer uma segunda execução com uma data bem formada sem puzzle (mais de 31 dias atrás) e registrar o status e a forma do corpo; isso é obrigatório, porque confirma se ela também vem com `"error": "NOT-AVAILABLE"` (já observado pelo autor para data mal formada, com o corpo completo; pedido sem data dá HTTP 502)
- [ ] T021 [US3] Reconciliar `apps/api/src/sources/oglobo/fixtures/daily-valid.json` com `apps/api/.source-samples/daily-<date>.json`: mesmos campos, tipos e marcadores (`block`, `empty`, formato das dicas e de `dates`), mas grade reduzida a 5 x 5, letras e dicas inventadas e `dates` com 3 entradas. Se a resposta real divergir do schema ou do conversor, ajustar `agilmente-schema.ts` e `convert.ts` e os testes da T010/T011
- [ ] T022 [P] [US3] Para cada outro nível que deu `ok` na T020, criar `apps/api/src/sources/oglobo/fixtures/<level>-valid.json` reduzida da mesma forma e incluí-la num teste parametrizado (`it.each`) em `apps/api/src/sources/oglobo/convert.test.ts`. Níveis que falharam ficam listados como pendência em `findings.md`
- [ ] T023 [US3] Com o registro da T020, reduzir `apps/api/src/sources/oglobo/fixtures/unavailable.json` a partir da resposta real com `NOT-AVAILABLE` (mesmas regras da T021). Se a data bem formada sem puzzle responder de outra forma, criar `fixtures/unavailable-date.json`, ajustar o mapeamento em `apps/api/src/sources/oglobo/oglobo.ts` e a tabela em `specs/003-adaptador-oglobo/contracts/puzzle-source.md`, e acrescentar o caso em `apps/api/src/sources/oglobo/oglobo.test.ts` (cenário 5 da US2). Se a T020 revelar outro sinal de limite de uso além do HTTP 429, fazer o mesmo para `rate-limited`
- [ ] T024 [US3] Conferir que `git status` não mostra `apps/api/.source-samples/` e que nenhuma fixture contém token real: `git grep -nE 'ANONYMOUS-[0-9a-f]{32}'` sem resultados

**Checkpoint**: fixtures refletem a fonte real; níveis confirmados registrados (`test(api): align oglobo fixtures with real responses`).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T025 [P] Atualizar `CLAUDE.md`: comando `npm run source:check -w @cruzadinha/api -- [data] [--save]` em Commands; em Architecture, `packages/shared/src/puzzle/` (formato interno, solução separada) e `apps/api/src/sources/` (interface `PuzzleSource`, adaptador `oglobo`, fixtures reduzidas); em Current state, a feature 003
- [ ] T026 [P] Atualizar `docs/design.md`, seção 2: níveis confirmados pela T020 e, se descoberto, o comportamento da janela de histórico; seção 4: `sources/oglobo/` como pasta
- [ ] T027 Rodar a validação de `specs/003-adaptador-oglobo/quickstart.md`: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`; conferir que a suíte termina em menos de 10 s (SC-003), que `apps/api/dist/server.mjs` não contém `check.ts` nem `source:check`, que nenhuma fixture tem grade maior que 5 x 5 (SC-007) e repetir o passo 2 do quickstart (renomear campo e ver teste falhar, SC-005)

---

## Dependencies & Execution Order

- **Setup (T001)**: sem dependências.
- **US1 (T002 a T008)**: depende só da Setup. MVP.
- **US2 (T009 a T017)**: depende de T005 a T007 (tipos e schemas do `shared`).
- **US3 (T018 a T024)**: depende de T016 (o script usa o adaptador). T020 faz pedidos reais e exige a fonte no ar; T021 a T023 dependem do resultado da T020. **A feature só pode ser concluída com a T021 feita** (princípio IV e FR-015: fixtures derivadas de respostas reais). Se a fonte estiver fora do ar, a feature fica aberta; as fixtures provisórias da T009 não bastam.
- **Polish**: T025 e T026 depois da T020; T027 por último.

Dentro de cada história: testes (devem falhar) → implementação → rodar testes.

## Parallel Opportunities

- US1: T002, T003 e T004 em paralelo; T005 e T006 em sequência (o `superRefine` usa `rules.ts`, que importa os tipos).
- US2: T009, T010, T011, T012, T013 e T014 em paralelo; depois T015 e T016.
- US3: T022 por nível em paralelo, depois da T021.
- Polish: T025 e T026 em paralelo.

### Exemplo (US2)

```text
Em paralelo: T009 (fixtures), T010 (convert.test.ts), T011 (oglobo.test.ts), T012 (types.ts), T013 (token.ts), T014 (agilmente-schema.ts)
Depois: T015 (convert.ts) → T016 (oglobo.ts) → T017 (rodar testes)
```

## Implementation Strategy

1. **MVP**: Setup + US1. O formato interno já é útil para começar a `game-logic` com puzzles montados à mão.
2. **US2**: adaptador completo com fixtures provisórias, sem nenhum pedido real.
3. **US3**: uma execução real (com confirmação do autor) para alinhar as fixtures e confirmar os níveis.
4. **Polish**: documentação e validação final.

Commits por checkpoint, cada um com testes verdes.

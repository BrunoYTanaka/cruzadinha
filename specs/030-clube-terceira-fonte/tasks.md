# Tasks: Cruzadas Clube como terceira fonte

**Input**: `specs/030-clube-terceira-fonte/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Prerequisites**: plan.md, spec.md

**Tests**: pedidos pelo FR-021 (unitários, integração e e2e). Cada story traz os testes antes da implementação.

**Format**: `- [ ] T### [P?] [US?] Descrição com caminho`. `[P]` = arquivos diferentes, sem dependência de tarefa aberta.

## Phase 1: Setup (spike e dependência)

- [x] T001 Adicionar `quickjs-emscripten` (variante singlefile síncrona, versão com ao menos 2 semanas) em `apps/api/package.json` e atualizar `package-lock.json`; conferir no Context7 (`/justjake/quickjs-emscripten`) o nome exato do pacote da variante e confirmar que `npm run build -w @cruzadinha/api` inlina o WASM sem arquivo extra em `dist/`
- [x] T002 Criar o script de verificação sob demanda `apps/api/src/sources/clube/check.ts` e o script `source:check:clube` em `apps/api/package.json` (espelha `cruzadaonline/check.ts`: uma linha por edição, `--save` grava em `apps/api/.source-samples/`, sem imprimir script nem XML; `User-Agent` identificável)
- [x] T003 Rodar o spike contra a fonte real e registrar em `specs/030-clube-terceira-fonte/findings.md`: (a) o script roda no QuickJS sem *stubs* de `document`/`window` (R1), (b) HTML exato do link "anterior" e da categoria (R2/R8), (c) UA identificável aceito (R9), (d) 12 x 8 e forma do XML com `left-bar`/`top-bar`. Atualizar `research.md` (R1, R2, R9) com os achados; T022 e T024 só começam depois. Nada do conteúdo real entra no Git

## Phase 2: Foundational (bloqueia todas as stories)

- [x] T004 [P] Em `packages/shared/src/puzzle/schema.ts` incluir `clube` em `puzzleSourceIdSchema` e `'Cruzadas Clube'` em `puzzleSourceNames`; exportar `puzzleSourcesWithoutFetch = ['clube']` de `packages/shared/src/index.ts`; ajustar `schema.test.ts` e os testes que enumeram fontes (`packages/shared/src/library/schema.test.ts`, `settings/schema.test.ts`)
- [x] T005 Escrever testes em `packages/shared/src/puzzle/rules.test.ts` para a regra de vizinhas: aceita palavra seguida de célula aberta que inicia outra da mesma direção; recusa célula aberta que não inicia palavra, lacuna e sobreposição (`células sobrepostas`); as fixtures atuais seguem válidas
- [x] T006 Implementar a regra em `packages/shared/src/puzzle/rules.ts` (`checkPuzzleRules`): `after`/`before` abertas só valem se há palavra da mesma direção começando em `after` / terminando em `before`; cobertura dupla na mesma direção é erro. Sem enfraquecer as demais regras
- [x] T007 [P] Criar `wordBoundaries(words)` em `packages/shared/src/puzzle/word-cells.ts` (lista `{row, col, direction}` da última célula de cada palavra com vizinha colada), com teste em `packages/shared/src/puzzle/word-cells.test.ts` e exportação em `packages/shared/src/index.ts`
- [x] T008 Em `apps/api/src/db/schema.ts` incluir `'clube'` em `puzzles_source_check` e gerar a migração `apps/api/drizzle/0006_puzzles_source_clube.sql` (`npm run db:generate -w @cruzadinha/api -- --custom --name puzzles_source_clube`, SQL só troca a restrição como a `0004`); conferir `meta/_journal.json` e snapshot
- [x] T009 [P] Atualizar `docs/data-definitions/DDE-002-coleta-puzzles.md` e `docs/entity-relationship-diagrams/ERD-002-coleta-puzzles.md` com o novo valor de `source`
- [x] T010 Em `apps/api/src/sources/types.ts` acrescentar `onDemand?: boolean` e `listRecent?` ao `PuzzleSource` (contrato em `contracts/puzzle-source-clube.md`) sem alterar `oglobo` e `cruzadaonline`; teste de tipos/uso nos testes existentes
- [x] T011 Teste de integração em `apps/api/src/test/puzzles-repository.int.test.ts` (ou novo `clube.int.test.ts`): a restrição aceita `clube` e continua recusando fonte desconhecida; rodar `npm run test:int`

**Checkpoint**: `shared` aceita a grade e o banco aceita `clube`.

## Phase 3: User Story 1 - Jogar uma cruzada clássica no tabuleiro (P1)

**Goal**: digitar, navegar, ajudar e completar um puzzle com palavras vizinhas coladas, com barras visíveis.

**Independent Test**: puzzle 12 x 8 reduzido e inventado, sem blocos, salvo localmente (seed de desenvolvimento ou fixture do site), jogado até completar sem o cursor passar à vizinha.

- [x] T012 [P] [US1] Fixture de site em `apps/web/src/test/fixtures.ts`: puzzle `clube` reduzido (ex.: 4 x 3 sem blocos, vizinhas coladas, conteúdo inventado) e sua solução
- [x] T013 [P] [US1] Testes em `apps/web/src/game-logic/navigation.test.ts` e `reducer.test.ts` (afirmando a posição do cursor após cada tecla, SC-003): digitar a última letra de uma palavra com vizinha não avança; Home/End vão às pontas da palavra ativa; Delete limpa sem mover; Tab/Shift+Tab percorrem as palavras na ordem; seta troca de célula e a palavra ativa passa a ser a da nova célula (research R5); retroceder (Backspace) para na primeira célula da palavra
- [x] T014 [US1] Auditar e corrigir `apps/web/src/game-logic/reducer.ts`, `navigation.ts`, `help.ts` e `completion.ts` para limitar por `wordCells` e não por `isOpen` onde a regra é "dentro da palavra" (reducer.ts:164 e vizinhos); ajudas (letra/palavra/verificar) e conclusão funcionam com grade sem blocos
- [x] T015 [P] [US1] Teste do desenho em `apps/web/src/features/game/Board.test.tsx`: células com fim de palavra e vizinha colada recebem `data-bar-end="across|down"`; grades sem vizinhas colada não mudam; teste axe sem violação
- [x] T016 [US1] Em `apps/web/src/features/game/Board.tsx` e `Cell.tsx` aplicar `wordBoundaries` e marcar `data-bar-end`; em `Cell.module.css` desenhar a barra (3 px, `box-shadow`/pseudo-elemento sem alterar a caixa da célula, `aria-hidden`) e criar o token `--bar` em `apps/web/src/themes/` com contraste ≥ 3:1 nos dois temas (estender `src/test/tokens-contrast.test.ts`)
- [x] T017 [US1] Garantir que o teclado na tela (`Keyboard.tsx`), `ClueList.tsx`/`ClueBar.tsx` e `ReadModeBanner.tsx` funcionam com a fixture `clube` (testes em `Keyboard.test.tsx`, `ClueBar.test.tsx`)
- [x] T018 [US1] E2E `apps/web/e2e/clube.spec.ts`: semear um puzzle `clube` reduzido no banco local, abrir, digitar palavra inteira, Tab/setas/Home/End/Delete, barras visíveis nos dois temas sem salto de layout (`expectNear` de `e2e/support.ts`), a posição do cursor após cada tecla no limite entre vizinhas (SC-003), completar
- [x] T019 [US1] Partida de teste da experiência 12 x 8 (research R11) com a edição real salva localmente (T003) renderizada no tabuleiro; registrar o resultado e a decisão de seguir ou reavaliar em `specs/030-clube-terceira-fonte/findings.md`

**Checkpoint**: US1 jogável e testável sem o adaptador.

## Phase 4: User Story 3 - Coletar as edições do Cruzadas Clube (P3, entregue antes da US2 porque a US2 precisa de edições salvas)

**Goal**: adaptador, coleta e verificação sob demanda, sem executar código remoto fora da sandbox.

**Independent Test**: coleta com fontes falsas salva as edições, falha em `clube` não impede as outras; sandbox interrompe rede, arquivos, laço e memória.

- [x] T020 [P] [US3] Fixtures reduzidas e inventadas em `apps/api/src/sources/clube/fixtures/` (página válida, sem data, sem script, script ofuscado simples, sem a variável, laço infinito, tentativa de `fetch`/`require`/`process`, XML mal formado, estrutura alterada, barra sem palavra do outro lado, corpo grande) e `fixtures.ts`
- [x] T021 [P] [US3] Testes de contrato de `apps/api/src/sources/clube/page.test.ts`: data "postado em DD/MM/AAAA" (aceita só data válida), autor, caminho `/jogos/CC<n>.js`, link anterior; ignorar outras datas da página (menu, rodapé); sem data → `unexpected-format`
- [x] T022 [US3] (depois de T003) Implementar `apps/api/src/sources/clube/page.ts` (funções puras com regex estreitas sobre texto ≤ 1 MB, conforme R2 e os achados de T003)
- [x] T023 [P] [US3] Testes em `apps/api/src/sources/clube/sandbox.test.ts`: extrai `CrosswordPuzzleData` de um script ofuscado; recusa não-string e > 1 MB; interrompe laço infinito (prazo 1 s), memória excessiva, pilha, e tentativas de `fetch`, `require`, `process`, `import`; nenhum acesso a rede/arquivos; depois de cada interrupção o processo segue respondendo (outra chamada à sandbox funciona, SC-006)
- [x] T024 [US3] (depois de T003) Implementar `apps/api/src/sources/clube/sandbox.ts` (QuickJS: runtime novo por chamada, `setMemoryLimit` 32 MB, `setMaxStackSize` 512 KB, `setInterruptHandler` com prazo de 1 s, sem funções do host, dispose garantido em `finally`; saída `string`)
- [x] T025 [P] [US3] Schema Zod do XML em `apps/api/src/sources/clube/schema.ts` e testes de conversão em `convert.test.ts` (palavras vizinhas, barras coerentes, dica sem palavra, palavra sem dica, número divergente, palavra de 1 letra, barra sem palavra do outro lado, célula com mais de uma letra → `unsupported`, dica limpa como em `cruzadaonline/clue-text.ts`)
- [x] T026 [US3] Implementar `apps/api/src/sources/clube/convert.ts` (reutiliza `cruzadaonline/xml.ts` e `clue-text.ts`; palavras do intervalo, barras como conferência; atribuição `Cruzadas Clube` + título + autor; valida `puzzleSchema` e o par com `validatePuzzleWithSolution`)
- [x] T027 [P] [US3] Testes de `clube.test.ts` com `fetch` injetado: mapeamento 403/404 → `unavailable`, 429 → `rate-limited` sem nova tentativa, 5xx/rede/10 s → `source-down`, corpo grande → `unexpected-format`, no máximo 2 pedidos por edição (página e, só se a coleta pedir, script), nenhum log de corpo/script; `fetchPuzzle` devolve `unavailable` (sem pedido) por ser `onDemand = false`; `listRecent` (assíncrono, entrega a página e `loadPuzzle()`) segue o link anterior e para na janela (`oldestDate`), sem link anterior ou quando a coleta deixa de consumir; o script só é pedido em `loadPuzzle()`
- [x] T028 [US3] Implementar `apps/api/src/sources/clube/clube.ts` (`createClubeSource`, `onDemand: false`, `listRecent`, UA identificável, pausa tratada pela coleta) e completar `check.ts` (T002) com a fonte pronta
- [x] T029 [US3] Em `apps/api/src/modules/puzzles/puzzles.service.ts`: `collect()` usa `listRecent` quando a fonte o declara: consulta `existingDates` com a data da página e só chama `loadPuzzle()` das datas não salvas (edição salva custa 1 pedido; duplicata de data em `skipped`; `rate-limited` encerra a fonte com `stoppedBy`), `getByDate` devolve `unavailable` sem pedir à fonte nem consumir `PUZZLE_FETCH` quando `onDemand === false`; testes em `puzzles.service.test.ts`
- [x] T030 [US3] Passar o terceiro adaptador em `apps/api/src/app.ts`, `apps/api/src/cli.ts` e `apps/api/src/cli/run-cli.ts`; `puzzles collect` imprime uma linha por fonte; testes em `apps/api/src/cli/` e `docs/docs.test.ts` (enum de `source` na documentação)
- [x] T031 [US3] Testes de integração: `apps/api/src/test/collect.int.test.ts` (três fontes; falha ou limite em `clube` não impede as outras; edição duplicada na mesma data), `puzzles.int.test.ts` (`source=clube` salvo → 200, não salvo → 404 sem consumir `PUZZLE_FETCH`), `library.int.test.ts` (`source=clube`, limite 366 por fonte, estados e tempos) e `cli.int.test.ts`
- [x] T032 [US3] Conferir `.github/workflows/collect.yml` (a coleta já itera as fontes; ajustar mensagens/tempo limite se a coleta de `clube` precisar de mais tempo) e documentar `source:check:clube` em `CLAUDE.md`

**Checkpoint**: edições `clube` coletadas e salvas.

## Phase 5: User Story 2 - Escolher a terceira fonte no site (P2)

**Goal**: aba, cartão "Hoje" e atribuição da terceira fonte; dia passado sem edição não busca.

**Independent Test**: com edições das três fontes salvas, os três cartões e abas aparecem, o progresso fica separado e `/dia/:date?fonte=clube` sem edição não faz pedido à fonte.

- [x] T033 [P] [US2] Testes em `apps/web/src/features/library/calendar.test.ts` e `today-cards.test.ts`: `dayState` de fonte em `puzzleSourcesWithoutFetch` devolve `none` (não `fetchable`) para dia passado não salvo; cartão "Hoje" de `clube` sem edição mostra "sem cruzada"; `otherSourceShortcut` e `completedInMonth` com três fontes
- [x] T034 [US2] Implementar em `apps/web/src/features/library/calendar.ts`, `today-cards.ts` e `useSourceLibraries` o tratamento das fontes sem busca e das três fontes
- [x] T035 [P] [US2] Testes em `DayRoute.test.tsx`, `SourceTabs.test.tsx`, `TodayCards.test.tsx`, `LibraryPage.test.tsx`, `source-down.test.ts`, `source-choice.test.ts`: três abas e cartões, contador por aba, `/dia/:date?fonte=clube` sem edição mostra "não há cruzada" sem pedir à API, 400 de uma API anterior em `?source=clube` vira fonte indisponível sem afetar as outras
- [x] T036 [US2] Implementar em `apps/web/src/features/library/DayRoute.tsx`, `SourceTabs.tsx`, `TodayCards.tsx`, `LibraryPage.tsx` e `source-down.ts` a terceira fonte e a mensagem de dia sem edição; tratar 400 como indisponível
- [x] T037 [P] [US2] Testes e ajuste em `apps/web/src/features/settings/SettingsDialog.tsx`/`SettingsDialog.test.tsx` (`SourcePicker` com 3 colunas e `.thumb` com `--count: 3`, `defaultSource` desconhecida lida como a primeira) e em `app/direct-play.ts` (`directToGame` com a fonte padrão `clube`)
- [x] T038 [P] [US2] Teste e implementação da atribuição em `apps/web/src/features/game/attribution.ts` e `attribution.test.ts`: "Cruzadas Clube" + autor sem repetir partes iguais; título da aba e `h1` com nome da fonte
- [x] T039 [US2] E2E `apps/web/e2e/clube.spec.ts` (e ajuste de `fontes.spec.ts`): três cartões e abas, jogar uma edição `clube` e conferir que o progresso não aparece nas outras fontes, dia passado sem edição sem pedido à API de puzzle (interceptar rota), atribuição, axe nos dois temas, janela estreita (360 px) sem rolagem lateral
- [x] T040 [US2] Testes de compatibilidade (FR-004): site novo contra API anterior (`?source=clube` → 400, tratado como fonte indisponível) em `apps/web/src/api/`; API nova com `clube` salvo: `GET /api/library` e `GET /api/puzzles` sem `source` nunca devolvem puzzle `clube` e a biblioteca de `oglobo` fica idêntica, em `apps/api/src/test/library.int.test.ts` e `puzzles.int.test.ts`

**Checkpoint**: terceira fonte completa no site.

## Phase 6: Polish e transversais

- [x] T041 [P] Atualizar `CLAUDE.md` (resumo da feature 030), `docs/design.md`, `docs/deploy.md` (se a sandbox/WASM mudar o build) e conferir `docs/versionamento.md` (release A: `shared`+API; release B: site)
- [x] T042 Rodar `npm run format:check`, `lint`, `check:ids:remote`, `typecheck`, `test`, `build`, `test:int` e `test:e2e -w @cruzadinha/web`; corrigir o que falhar
- [x] T043 Verificação final contra a fonte real em pelo menos 5 edições (`npm run source:check:clube -w @cruzadinha/api`, SC-007) e rodar o checklist de `quickstart.md`; confirmar que nenhum arquivo versionado contém um puzzle completo (SC-009)

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (T004–T011) → stories. T003 (spike) pode revisar R1/R2 antes de T022 e T024.
- **US1 (Phase 3)** depende só da Phase 2 (T004, T006, T007). **US3 (Phase 4)** depende da Phase 2 e de T001–T003. **US2 (Phase 5)** depende da Phase 2 e usa edições salvas da US3 só nos e2e; seus testes unitários usam fixtures.
- Dentro de cada story: testes primeiro, depois implementação.
- Releases: A = Phase 2 + US3 (API e `shared`); B = US1 + US2 (site). Não publicar o site antes da API (research R7).

### Parallel opportunities

- Phase 2: T004, T007, T009 em paralelo; T005 → T006 em sequência.
- US1: T012, T013, T015 em paralelo.
- US3: T020, T021, T023, T025, T027 (arquivos de teste diferentes) em paralelo.
- US2: T033, T035, T037, T038 em paralelo.
- Polish: T041 em paralelo com T042.

## Implementation Strategy

1. **MVP (US1)**: Phase 1–2 + US1: o tabuleiro joga grades coladas com um puzzle semeado. T019 decide se vale seguir.
2. **Incremental**: US3 (adaptador e coleta, release A), depois US2 (site, release B).
3. Cada checkpoint roda `typecheck`, `lint` e os testes do pacote tocado antes de seguir.

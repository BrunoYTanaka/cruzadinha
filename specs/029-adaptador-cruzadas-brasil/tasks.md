---

description: "Task list for feature 029: adaptador da fonte Cruzadas Brasil"
---

# Tasks: Adaptador da fonte Cruzadas Brasil

**Input**: Design documents from `/specs/029-adaptador-cruzadas-brasil/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: obrigatórios. A spec pede testes de contrato sem rede (FR-017, SC-001, SC-002, SC-004, SC-007) e a constitution exige testes nos adaptadores (IV) e integração com Postgres real (VII). Em cada história, os testes vêm antes da implementação e precisam falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário da spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (adaptador), US2 (jogar no site, com as rotas), US3 (coleta e verificação real).
- Caminhos relativos à raiz do repositório.

## Regras que valem para todas as tarefas

- Antes de escrever código que usa uma biblioteca (Zod, Drizzle, Fastify, React Router, TanStack Query, Vitest, Playwright), consultar a documentação atual pelo Context7 (constitution, Fluxo de Desenvolvimento).
- Sem `any`. A página entra como `string`/`unknown` e passa por Zod.
- Comentários em português, no mesmo tom e densidade do código ao redor. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- Nunca pôr corpo bruto da página, texto de dica ou solução em logs, `detail` ou mensagens de erro (FR-008). O `detail` leva só coordenadas, números e contagens.
- Commits em inglês, Conventional Commits, sem `Co-Authored-By` nem atribuição de IA (CLAUDE.md). Escopos: `shared`, `api`, `web`.
- Entregar a API antes do site (plan.md, Ordem de entrega).

---

## Phase 1: Setup

**Purpose**: id da fonte e fixtures.

- [X] T001 Em `packages/shared/src/puzzle/schema.ts`, acrescentar `'cruzadasbrasil'` ao fim de `puzzleSourceIdSchema` e `cruzadasbrasil: 'Cruzadas Brasil'` a `puzzleSourceNames`. Atualizar `packages/shared/src/puzzle/schema.test.ts`, `packages/shared/src/library/schema.test.ts` e `packages/shared/src/settings/schema.test.ts` onde listam as fontes. O `typecheck` completo só fica verde depois da T004 (tipo de `puzzles.source` no Drizzle): aqui rodar `npm run typecheck -w @cruzadinha/shared`.
- [X] T002 [P] Criar as fixtures em `apps/api/src/sources/cruzadasbrasil/fixtures/` (contracts/puzzle-source.md), todas HTML 5 x 5 com conteúdo inventado, no formato do payload real: um `<script>self.__next_f.push([1,"..."])</script>` cujo texto escapado contém `"dadosJogo":{...}` com `id`, `titulo`, `nivel`, `dimensoes` (`linhas`, `colunas`), `dicas` (`horizontais`, `verticais`), `posicoes_num` (`x` coluna, `y` linha, base 0) e `gabarito` (`#` nos blocos). Arquivos: `daily-valid.html` (acentos e cedilha em dicas e gabarito, p. ex. AÇÃO; uma célula inicial de palavra horizontal e vertical), `no-game-data.html` (grade renderizada sem payload), `coming-soon.html` ("Em breve"), `changed-shape.html` (campo renomeado), `clue-without-word.html`, `word-without-clue.html`, `numbers-mismatch.html`, `positions-mismatch.html`, `grid-solution-mismatch.html` (letra em bloco / dimensões divergentes), `other-level.html` (`nivel` diferente de "Diário"), `other-date.html` (`id` ≠ data pedida), `invalid-json.html`. A ordem das dicas na lista não importa: sem fixture para isso. Incluir texto de dica com `&amp;` e `&quot;`. Nunca copiar uma página completa da fonte.
- [X] T003 [P] Criar `apps/api/src/sources/cruzadasbrasil/fixtures.ts` com `readFixture(name)` (mesma forma de `sources/cruzadaonline/fixtures.ts`; só testes e seed importam).

---

## Phase 2: Foundational (bloqueia as histórias)

**Purpose**: migração e registro do id nos pontos que enumeram fontes no banco.

- [X] T004 Em `apps/api/src/db/schema.ts`, trocar `puzzleSources` e o `check('puzzles_source_check', ...)` para `('oglobo', 'cruzadaonline', 'cruzadasbrasil')`. Gerar a migração com `npm run db:generate -w @cruzadinha/api -- --name puzzles_source_cruzadasbrasil` (nunca `push`); conferir que `apps/api/drizzle/0006_puzzles_source_cruzadasbrasil.sql` só troca o `CHECK` (data-model §2) e que `meta/_journal.json` e o snapshot entraram.
- [X] T005 [P] Atualizar os testes de integração que fixam a lista de fontes ou a regra: `apps/api/src/test/puzzles-repository.int.test.ts` (aceita a nova fonte e recusa uma desconhecida) e `apps/api/src/test/conventions.int.test.ts` se citar a regra.

**Checkpoint**: `npm run typecheck` verde nas três workspaces (primeiro fechamento completo); `npm run test:int -w @cruzadinha/api -- puzzles-repository` verde.

---

## Phase 3: User Story 1 - Obter um puzzle da Cruzadas Brasil por data (Priority: P1) 🎯 MVP

**Goal**: adaptador que busca, lê, valida e converte, devolvendo os motivos da interface.

**Independent Test**: `npx vitest run src/sources/cruzadasbrasil` em `apps/api` passa sem rede, com `fetch` injetado.

### Tests for User Story 1 (escrever antes; devem falhar)

- [X] T006 [P] [US1] `apps/api/src/sources/cruzadasbrasil/clue-text.test.ts`: entidades (`&amp; &lt; &gt; &quot; &#39; &nbsp;` e numéricas) decodificadas, marcação removida, espaços repetidos reduzidos, pontas aparadas, nome de entidade desconhecido e texto vazio viram erro.
- [X] T007 [P] [US1] `apps/api/src/sources/cruzadasbrasil/page-data.test.ts`: extrai o objeto de `daily-valid.html`; barras, aspas e acentos dentro das dicas sobrevivem; retorna "ausente" para `no-game-data.html` e `coming-soon.html`; `invalid-json.html` → erro; nenhum trecho é avaliado como código.
- [X] T008 [P] [US1] `apps/api/src/sources/cruzadasbrasil/convert.test.ts`: `daily-valid` reproduz dimensões, blocos, números, início, direção, tamanho, dicas e letras (SC-001), com acentos e cedilha preservados e letras em maiúscula; célula inicial das duas direções recebe um só número; cada fixture de falha dá o motivo esperado, sem puzzle parcial (SC-002): `clue-without-word`, `word-without-clue`, `numbers-mismatch`, `positions-mismatch`, `grid-solution-mismatch` → `unexpected-format`; `other-level` → `unsupported`; `changed-shape` falha no schema (SC-004); o `detail` nunca contém letras nem texto de dica.
- [X] T009 [P] [US1] `apps/api/src/sources/cruzadasbrasil/cruzadasbrasil.test.ts` (com `fetch` e relógio injetados): URL `https://cruzadasbrasil.com.br/palavras-cruzadas/AAAAMMDD`; um pedido e nenhuma nova tentativa; 404 → `unavailable`; 429 → `rate-limited`; 5xx, erro de rede e tempo limite → `source-down`; 403 → `source-down` (bloqueio, FR-019); outro 4xx → `unexpected-format`; data futura (por Brasília) → `unavailable` sem chamar `fetch`; `TypeError` para nível/data inválidos; corpo acima de `maxBytes` (por `content-length` e por tamanho lido) → `unexpected-format`; bytes UTF-8 inválidos → `unexpected-format`; `id` diferente da data → `unexpected-format`; acentos corretos de ponta a ponta com a página entregue em bytes UTF-8 (FR-005); `dates` vazio; nenhum `detail` com trecho do corpo (FR-008).

### Implementation for User Story 1

- [X] T010 [P] [US1] `apps/api/src/sources/cruzadasbrasil/clue-text.ts`: `clueText(raw)` conforme T006 (data-model §3, FR-006).
- [X] T011 [P] [US1] `apps/api/src/sources/cruzadasbrasil/page-schema.ts`: schema Zod dos dados do jogo (data-model §3): `id` string `AAAAMMDD`; `titulo` opcional; `nivel` string; `dimensoes` com `linhas` e `colunas` inteiros "entre 1 e 30"; `dicas.horizontais`/`verticais` com `numero` inteiro positivo e `dica` string; `posicoes_num` com `numero`, `x`, `y` inteiros ≥ 0; `gabarito` matriz de strings. Objeto tolerante a campos extras.
- [X] T012 [US1] `apps/api/src/sources/cruzadasbrasil/page-data.ts`: `readPageData(html)` (research R1): concatenar os literais de `self.__next_f.push([1,"..."])` lidos com `JSON.parse`, achar `"dadosJogo":`, extrair o objeto por contagem de chaves ciente de strings e `JSON.parse`; devolver `{ ok:true, data: unknown }` ou `{ ok:false, detail }` curto. Depende de T011 só pelo tipo de retorno `unknown`.
- [X] T013 [US1] `apps/api/src/sources/cruzadasbrasil/convert.ts`: `convertCruzadasBrasil(data, level, date)` pura (data-model §4): validar com o schema de T011; `nivel` "Diário" → `daily`, outro → `unsupported`; `id` = data; dimensões × gabarito; grade e solução (letra única, maiúscula pt-BR, NFC; `#` bloco); palavras e numeração clássica pela grade; conferir números/posições/dicas; montar atribuição ("Cruzadas Brasil", `title` ou `null`, `author` e `copyright` `null`); validar com `puzzleSchema` e `validatePuzzleWithSolution` antes de devolver. Usa `clueText` (T010).
- [X] T014 [US1] `apps/api/src/sources/cruzadasbrasil/cruzadasbrasil.ts`: `createCruzadasBrasilSource(options)` conforme contracts/puzzle-source.md: validar nível/data, recusar futuro sem pedido (`todayInSaoPaulo`), um `GET` com `accept: text/html` e `AbortSignal.timeout(10_000)`, mapa de status, limite de 1 MiB, `arrayBuffer()` + `TextDecoder('utf-8', { fatal: true })`, `readPageData` e `convertCruzadasBrasil`.
- [X] T015 [US1] Rodar `npx vitest run src/sources/cruzadasbrasil` em `apps/api` e `npm run typecheck && npm run lint`; todos os testes de T006 a T009 passam.

**Checkpoint**: adaptador completo e testado sem rede (MVP).

---

## Phase 4: User Story 2 - Jogar o puzzle da Cruzadas Brasil no site (Priority: P2)

**Goal**: API serve a fonte e o site mostra três fontes.

**Independent Test**: com puzzles das três fontes salvos no mesmo dia, a biblioteca mostra três abas e três cartões, e o jogo abre com "Cruzadas Brasil".

### Tests for User Story 2 (escrever antes; devem falhar)

- [X] T016 [P] [US2] Integração em `apps/api/src/test/library.int.test.ts` e `apps/api/src/test/puzzles.int.test.ts`: três fontes salvas no mesmo dia; `source=cruzadasbrasil` lista/entrega só a dela; pedido sem `source` devolve só `oglobo` (SC-007); `source` desconhecida → 400; busca sob demanda de dia passado ausente com fonte falsa `cruzadasbrasil`, contando no limite `PUZZLE_FETCH`; limite de 366 por fonte.
- [X] T017 [P] [US2] Testes do site (jsdom) em `apps/web/src/features/library/SourceTabs.test.tsx`, `TodayCards.test.tsx`, `LibraryPage.test.tsx`, `DayRoute.test.tsx`, `source-down.test.ts`, `today-cards.test.ts`, `apps/web/src/features/settings/SettingsDialog.test.tsx`, `apps/web/src/features/game/GamePage.test.tsx` e `GameCompletion.test.tsx`: três fontes; ordem das abas e dos cartões; contador de concluídos por aba; `/dia/:date?fonte=cruzadasbrasil`; aviso por fonte com o nome "Cruzadas Brasil"; seletor de fonte padrão com três segmentos; atribuição sem repetir o nome; conclusão oferece a próxima fonte não concluída; fonte desconhecida cai na primeira; `axe` sem violações. Com API antiga (`400 invalid-input` para a fonte nova, conferido na rota), só essa aba falha.
- [X] T018 [P] [US2] `apps/web/e2e/fontes.spec.ts` (estender): três fontes a 360 px e a ≥ 861 px, sem rolagem lateral, nome longo sem sobrepor nem cortar o foco nas abas, nos cartões e no seletor (SC-009), nos dois temas; e que o cartão "Hoje" da Cruzadas Brasil abre o jogo em no máximo 2 interações (SC-008).

### Implementation for User Story 2

- [X] T019 [US2] Registrar o adaptador: em `apps/api/src/app.ts` e `apps/api/src/cli.ts` importar `createCruzadasBrasilSource` e passá-lo à lista de fontes do serviço, depois dos outros dois.
- [X] T020 [P] [US2] Conferir/ajustar a documentação OpenAPI: `apps/api/src/docs/doc-schema.ts` deriva o enum de `puzzleSourceIdSchema.options`; ajustar `apps/api/src/docs/docs.test.ts` e exemplos em `modules/*/*.schemas.ts` se fixarem a lista.
- [X] T021 [P] [US2] Seed: em `apps/api/src/db/seed-puzzle.ts`, trocar o `if` de `convertSample` por `switch` exaustivo e usar a fixture `daily-valid.html` da nova fonte (via `readPageData` + `convertCruzadasBrasil`); atualizar `apps/api/src/test/seed.int.test.ts`.
- [X] T022 [US2] Site: rodar T017/T018 e corrigir só o que falhar em `apps/web/src/features/library/*`, `features/settings/SettingsDialog*` e `features/game/*` (CSS das abas, cartões e do seletor com nome longo). Sem componente novo; nenhuma lista de fontes escrita à mão.
- [X] T023 [US2] Rodar `npm test`, `npm run test:int -w @cruzadinha/api` e `npm run test:e2e -w @cruzadinha/web -- fontes.spec.ts` (ver CLAUDE.md para o banco de e2e separado).

**Checkpoint**: API compatível com o site anterior; site com três fontes.

---

## Phase 5: User Story 3 - Coleta e verificação sob demanda (Priority: P3)

**Goal**: coleta inclui a fonte; verificação real fora da suíte.

**Independent Test**: coleta com fontes falsas continua quando uma falha; `source:check:cruzadasbrasil` imprime uma linha por data.

### Tests for User Story 3 (escrever antes; devem falhar)

- [X] T024 [P] [US3] `apps/api/src/test/collect.int.test.ts` e `apps/api/src/test/cli.int.test.ts`: três fontes falsas; uma linha de resumo por fonte com o nome; falha ou limite de uma não para as outras; datas 404 contadas como indisponíveis sem erro de execução (exit 0), com as disponíveis salvas na janela; sem repetir datas salvas.

### Implementation for User Story 3

- [X] T025 [US3] `apps/api/src/sources/cruzadasbrasil/check.ts` e script `source:check:cruzadasbrasil` em `apps/api/package.json` conforme contracts/cli.md (cópia adaptada de `sources/cruzadaonline/check.ts`): até 10 datas, pausa de 2 s só entre pedidos que chegaram à fonte, uma linha por data, `--save` grava `cruzadasbrasil-<data>.html` em `.source-samples/`, saídas 0/1/2, sem imprimir conteúdo.
- [X] T026 [US3] Ajustar `apps/api/src/modules/puzzles` e `apps/api/src/cli/run-cli.ts` apenas se T024 mostrar que algo assume duas fontes; senão, nenhuma mudança.
- [X] T027 [US3] Rodar a verificação real (único momento com rede, quickstart §3) para 2026-10-22, 2026-10-23, 2026-09-20, 2026-07-13, 2026-10-10, 2026-08-01, 2026-07-12 e uma data futura; conferir `ok` ×5 (SC-003), `unexpected-format`, `unavailable` ×2. Registrar em `findings.md` que a coleta com `COLLECT_HISTORY_DAYS` acima de ~103 dias pede datas 404 sem necessidade (R8). Criar `specs/029-adaptador-cruzadas-brasil/findings.md` (FR-018) com: formato dos dados, histórico (início 2026-07-13, ~103 dias), páginas anômalas (2026-08-01, "Em breve"), nível único, 404, limites; pendências do autor (pedir endpoint JSON, permissão por escrito, atribuição, anúncios e PDF da fonte). Sem conteúdo de puzzle.
- [X] T028 [US3] Rodar `npm run test:int -w @cruzadinha/api -- collect cli`.

**Checkpoint**: coleta e verificação funcionando.

---

## Phase 6: Polish & Cross-Cutting

- [X] T029 [P] Atualizar `docs/design.md` (terceira fonte, adaptador, página sem API), `docs/data-definitions/DDE-002-coleta-puzzles.md` (valores de `source`, versão e histórico) e `docs/entity-relationship-diagrams/ERD-002-coleta-puzzles.md`.
- [X] T030 [P] Atualizar `CLAUDE.md` (Feature 029, comandos `source:check:cruzadasbrasil`, arquitetura `sources/cruzadasbrasil/`) no tom das entradas anteriores.
- [X] T031 Rodar a suíte completa: `npm run format:check && npm run lint && npm run check:ids && npm run typecheck && npm test && npm run build`, `npm run test:int` e o e2e; confirmar que nenhum arquivo versionado contém uma página completa da fonte (SC-006).
- [ ] T032 Seguir `quickstart.md` de ponta a ponta (seed, dev, três fontes, conclusão, 360 px).
- [ ] T033 Depois do deploy da API (docs/deploy.md), conferir FR-019: rodar `puzzles collect` (ou `collect.yml` por `workflow_dispatch`) e confirmar que a Cruzadas Brasil salva as datas disponíveis; se a Cloudflare bloquear o IP, aparece como `source-down` com HTTP 403, e o autor decide (pedir liberação à fonte ou desligar a fonte). Registrar o resultado em `findings.md`.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5) → Polish.
- US2 depende de US1 (adaptador registrado, T019). US3 depende de US1; T025 pode andar em paralelo com US2 depois de T014.
- Dentro de cada história: testes (devem falhar) → implementação. T010/T011 em paralelo; T012 e T013 usam T010/T011; T014 usa T012/T013.
- Entrega: API (T001–T021, T024–T028) antes do site (T017/T018/T022).

### Parallel examples

- US1: T006, T007, T008, T009 juntos; depois T010 e T011 juntos.
- US2: T016, T017, T018 juntos; T020 e T021 juntos.

## Implementation Strategy

1. **MVP**: Phases 1 a 3 (adaptador testado sem rede).
2. Phase 4: API registrada e site com três fontes.
3. Phase 5: coleta e verificação real, com `findings.md`.
4. Phase 6: documentação e suíte completa.

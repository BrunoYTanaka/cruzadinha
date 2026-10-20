---

description: "Task list for feature 017: tela de jogo sem saltos e dica resolvida mais visível"
---

# Tasks: Tela de jogo sem saltos e dica resolvida mais visível

**Input**: Design documents from `/specs/017-jogo-sem-layout-shift/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios. A spec mede posição e altura em pixels (SC-001 a SC-004) e pede acessibilidade sem violações nos dois temas (SC-005). Os testes vêm antes da implementação e precisam falhar primeiro. Posição, altura e reticências só podem ser medidas no navegador (jsdom não faz layout), então ficam no Playwright; o resto fica no Vitest.

**Organization**: uma fase por história da spec (US1 e US2 são P1, US3 é P2), mais setup, base e acabamento.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (faixa parada ao salvar), US2 (barra da dica numa linha), US3 (dica resolvida com fundo verde e visto).
- Caminhos relativos à raiz do repositório. Só `apps/web` muda; API, banco e `packages/shared` não mudam (SC-006).

## Regras que valem para todas as tarefas

- Antes de escrever código que usa uma biblioteca (Testing Library, Vitest, Playwright), consultar a documentação atual pelo Context7 (constitution, Fluxo de Desenvolvimento). No Playwright: `page.route`, `route.fetch`, `route.fulfill({ response, json })`, `locator.boundingBox`, `locator.evaluate`, `page.waitForResponse`.
- Sem `any`. Sem cor ou medida de tema fixa: só tokens (`--ok`, `--ok-tint`, `--word`, `--ink`, `--mute`).
- Nada muda no salvamento em si (FR-002): `save-queue.ts`, `guest-save-queue.ts` e `SaveState` ficam iguais.
- Comentários em português, no tom e densidade do código ao redor. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- Commits em inglês, Conventional Commits, sem linha de coautoria. Escopo `web`.
- Dicas longas dos testes são inventadas, nunca copiadas de uma fonte real (constitution VIII).

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Rodar `npm test -w @cruzadinha/web` e `npm run typecheck` na branch `feat/017-jogo-sem-layout-shift` e anotar que estão verdes antes de qualquer mudança

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o arquivo e2e que as três histórias usam para medir posição e altura (research R8).

- [X] T002 Criar `apps/web/e2e/sem-saltos.spec.ts` só com os helpers, sem testes ainda, importando de `./support` (`resetAndSeed`, `login`, `todayPuzzle`, `solveFirstAcrossWord`, `typedLetter`, `pressLetter`) e com `test.beforeEach(resetAndSeed)` como os outros specs:
  - `LONG_CLUE`: uma dica inventada com mais de 200 caracteres, sem quebra de linha.
  - `lengthenClues(page)`: `page.route(/\/api\/puzzles(\?|\/)/, …)` que faz `route.fetch()`, lê o JSON (`{ puzzleId, puzzle, solution }`), troca `clue` das palavras de índice par de `puzzle.words` por `LONG_CLUE` e responde com `route.fulfill({ response, json })`. Não intercepta `/api/library` nem `/api/progress`.
  - `box(locator)`: `boundingBox()` que falha o teste com mensagem clara quando volta `null`.
  - `openToday(page)`: abre `/`, clica no cartão `/^O Globo: /` e espera `getByRole('grid')`.
  - `activeClue(page)`: `page.locator('[aria-live="polite"][aria-atomic="true"]')` (a região viva da `ClueBar`), e `activeClueText(page)`: o `span` de texto dentro dela (o que não é o `<b>`).

**Checkpoint**: `npx playwright test e2e/sem-saltos.spec.ts --list` roda sem erro de tipo.

---

## Phase 3: User Story 1 - Faixa de ferramentas parada enquanto se digita (Priority: P1) 🎯 MVP

**Goal**: nada de "Salvando…", "Salvo" ou "Salvo neste aparelho"; avisos de problema e anúncios como hoje; o visitante vê um texto fixo.

**Independent Test**: digitar 20 letras com conta e como visitante; nenhum desses textos aparece e nenhum item da faixa nem o tabuleiro se move; recarregar e as letras estão lá.

### Tests for User Story 1 ⚠️

> Escrever primeiro e confirmar que falham.

- [X] T003 [P] [US1] Reescrever `apps/web/src/features/game/SaveStatus.test.tsx` conforme `data-model.md` §1:
  - `saved` e `saving` (conta): nenhum texto fora da região viva (`container` só tem o `[aria-live]`, vazio) e `queryByText('Salvo')`/`queryByText('Salvando…')` nulos.
  - `it.each` dos quatro avisos com o texto de hoje ("Sem conexão, tentando de novo", "Sessão expirada", "Concluída em outro aparelho", "Não salvo: vale só nesta aba"); `offline` e `local-only` com a classe de aviso.
  - Manter os testes atuais de anúncio: só uma região viva; não anuncia a cada salvamento; anuncia a queda e "Conexão restabelecida"; sessão expirada e conclusão em outro aparelho limpam o anúncio.
  - Visitante: em `saved` e em `saving`, mostra "Progresso só neste aparelho" e o link "Entrar para salvar na sua conta" com o `href` recebido; `queryByText('Salvo neste aparelho')` nulo; o anúncio de abertura continua "Seu progresso fica salvo só neste aparelho."; em `local-only`, mostra "Não salvo: vale só nesta aba" no lugar do texto fixo, mantém o link e anuncia o aviso.
- [X] T004 [P] [US1] Em `apps/web/src/features/game/GamePage.test.tsx`, no caso "salva ao digitar, depois de 1,5 s" (hoje espera `getByText('Salvo')`): depois do envio, esperar que o pedido foi feito e conferir `queryByText('Salvo')` e `queryByText('Salvando…')` nulos, também logo depois de digitar (antes de 1,5 s)
- [X] T005 [P] [US1] Em `apps/web/src/features/game/GuestGame.test.tsx`, o caso "mostra \"Salvo neste aparelho\", o link para entrar e a fonte" passa a se chamar "mostra que o progresso fica só neste aparelho, o link para entrar e a fonte" e espera "Progresso só neste aparelho"; acrescentar que, depois de digitar uma letra e esperar o IndexedDB (`stored()`), o texto continua o mesmo e "Salvo neste aparelho" não existe
- [X] T006 [US1] Em `apps/web/e2e/sem-saltos.spec.ts`, dois testes da US1 (com conta, depois de `login`; e como visitante, sem `login`): `openToday`, clicar na primeira célula vazia, anotar `box` de cada filho direto da faixa (`getByRole('toolbar', { name: 'Ferramentas do jogo' }).locator(':scope > *')`, e dos filhos dos grupos) e do `grid`; digitar 20 letras com `pressLetter` (o relógio da faixa usa `tabular-nums`, então a passagem dos segundos não muda a largura) (com conta, esperar as respostas `PUT` de `/api/progress/` com `page.waitForResponse`); conferir caixas iguais (SC-002) e `getByText('Salvo', { exact: true })`, `getByText('Salvando…')` e `getByText('Salvo neste aparelho')` com contagem 0 durante e depois; com conta, recarregar e ver as letras (cenário 5)

### Implementation for User Story 1

- [X] T007 [US1] Em `apps/web/src/features/game/SaveStatus.tsx`: trocar `TEXT` por `WARNING: Partial<Record<SaveState, string>>` só com os quatro avisos; trocar `GUEST_TEXT` por `GUEST_TEXT = 'Progresso só neste aparelho'`; renderizar o `<span>` visível só quando há texto (aviso, ou o texto fixo do visitante quando não há aviso), sem elemento vazio na faixa (research R1); manter o link do visitante, a lógica de `previous`/`wasOffline`/`announcement` e a região viva sem mudança (R2), usando `WARNING['local-only']` no anúncio; atualizar o comentário do topo (o texto visível não aparece nos salvamentos normais; só avisos e, para o visitante, o texto fixo). Ajustar `SaveStatus.module.css` só se o texto fixo precisar de classe própria (mesmo estilo `.status`). Também `flex-wrap: wrap` em `.group` de `Toolbar.module.css`, para o texto do visitante não passar da largura do celular (ver nota em R3). T003 a T005 passam
- [X] T008 [US1] Em `apps/web/src/features/game/Toolbar.tsx`, trocar no comentário "estado do salvamento" por "avisos do salvamento"
- [X] T009 [US1] Ajustar os e2e que esperavam os textos antigos: em `apps/web/e2e/visitante.spec.ts` (linha com `'Salvo neste aparelho'`) e `apps/web/e2e/fontes.spec.ts` (idem), esperar `'Progresso só neste aparelho'`; em `apps/web/e2e/ajudas-e-retomada.spec.ts`, trocar `await expect(page.getByText('Salvo')).toBeVisible({ timeout: 10_000 })` por um `page.waitForResponse` do `PUT` em `/api/progress/` com `response.ok()`, registrado antes do clique em "Verificar" e com o mesmo `timeout`; no mesmo arquivo, trocar o comentário "Com uma dica riscada (feature 016), para o axe ver o estilo do risco no tema." por um que diga que há uma dica resolvida (fundo de sucesso e visto, feature 017) para o axe medir o texto sobre esse fundo no tema. T006 passa

**Checkpoint**: US1 completa; nenhum texto de salvamento normal na tela, avisos como antes.

---

## Phase 4: User Story 2 - Barra da dica ativa numa linha, com reticências (Priority: P1)

**Goal**: a barra da dica ativa fica sempre com a altura de hoje, numa linha, com reticências; o tabuleiro não se move ao trocar de palavra.

**Independent Test**: com dicas longas, percorrer todas as palavras com Tab no computador e no celular com teclado; o `y` do tabuleiro e a altura da barra não mudam e a dica longa termina em reticências.

### Tests for User Story 2 ⚠️

- [X] T010 [P] [US2] Em `apps/web/src/features/game/ClueBar.test.tsx`, caso novo com uma palavra de dica longa (inventada, mais de 200 caracteres): a região viva (`closest('[aria-live]')`) tem `textContent` com o número, a direção e a dica inteira, sem "…" acrescentado (FR-008); e o mesmo sem `onPrevious`/`onNext`
- [X] T011 [US2] Em `apps/web/e2e/sem-saltos.spec.ts`, testes da US2 (como visitante, para não depender de login), com `lengthenClues(page)` antes de abrir o jogo:
  - Computador (`page.setViewportSize({ width: 1280, height: 800 })`): `openToday`; a primeira palavra horizontal já vem escolhida (`initialSelection`, então não há estado "sem célula" para medir); anotar `box(grid).y` e a altura da barra; apertar Tab `puzzle.words.length` vezes (o tabuleiro cicla as palavras, feature 011) e, a cada passo, conferir `y` do tabuleiro e altura da barra iguais aos iniciais (SC-001). `puzzle` vem de `todayPuzzle(page.request)` (sem o `route`, então use só o tamanho da lista).
  - Na palavra com `LONG_CLUE`: `activeClueText(page).evaluate` devolve `white-space` `nowrap`, `text-overflow` `ellipsis` e `scrollWidth > clientWidth`; no `<b>` da barra, `scrollWidth <= clientWidth` (FR-007, SC-003). Numa palavra de dica curta, `scrollWidth <= clientWidth` no texto (cenário 3).
  - Celular com teclado: `test.describe` com `test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })`, como em `tamanhos.spec.ts`; o mesmo percurso com Tab (a barra do celular não tem anterior/próxima, mas o Tab do teclado físico emulado cicla as palavras como no computador) e as mesmas conferências (cenário 6).
  - Janela estreita sem teclado na tela (800 x 900, sem `hasTouch`): até 720 px ou com toque o teclado na tela sempre aparece (`ON_SCREEN_KEYBOARD_QUERY`), e acima de 860 px vale o layout de computador, então só nessa faixa a barra fica na coluna de dicas, abaixo do tabuleiro; percorrer as palavras com Tab e conferir que a altura da barra não muda e que a dica longa termina em reticências (FR-006).

### Implementation for User Story 2

- [X] T012 [US2] Em `apps/web/src/features/game/ClueBar.module.css` (research R4): em `.text`, acrescentar `white-space: nowrap`, `overflow: hidden` e `text-overflow: ellipsis` (já tem `flex: 1` e `min-width: 0`); em `.number`, acrescentar `flex: none`; manter as `min-height` de `.bar` (52 px) e `.navigable` (56 px). Comentário curto: a dica fica numa linha para a barra não mudar de altura e o tabuleiro não se mover; o texto inteiro continua na região viva. Em `.bar`, `contain: inline-size` (a largura vem de quem contém a barra, não da dica; sem isso a dica longa alargava a coluna do tabuleiro no computador, ver nota em R4). Nenhuma mudança no JSX. T010 e T011 passam

**Checkpoint**: US2 completa; trocar de palavra não move o tabuleiro em nenhuma fonte.

---

## Phase 5: User Story 3 - Dica resolvida fácil de notar (Priority: P2)

**Goal**: a dica resolvida ganha fundo `--ok-tint` e um visto `--ok` no fim, sem risco nem texto apagado, sem mudar a altura da lista.

**Independent Test**: acertar uma palavra nos dois temas; a linha da dica fica com fundo verde claro e visto, sem risco, também quando é a ativa; a altura da lista não muda.

### Tests for User Story 3 ⚠️

- [X] T013 [P] [US3] Em `apps/web/src/features/game/ClueList.test.tsx`, no caso "risca só as dicas resolvidas…" (renomear para "marca só as dicas resolvidas…"): o botão resolvido tem um `svg[aria-hidden="true"]` (o visto) e o nome acessível de hoje, com ", resolvida" uma vez só; os outros botões não têm `svg`; caso novo em que a dica resolvida também é a ativa (`activeWord` igual), com as classes de ativa e de resolvida e o visto; `expectNoA11yViolations`
- [X] T014 [P] [US3] Em `apps/web/src/features/game/ClueSheet.test.tsx`, no caso "destaca a dica ativa e marca as resolvidas": o botão resolvido dentro do diálogo tem o visto (`svg[aria-hidden="true"]`)
- [X] T015 [US3] Em `apps/web/e2e/sem-saltos.spec.ts`, teste da US3 para cada tema (`for (const theme of ['light', 'dark'] as const)`, com `page.addInitScript` gravando `cruzadinha:theme`, como em `ajudas-e-retomada.spec.ts`), como visitante em 1280 x 800, sem `lengthenClues`: `openToday`; anotar a altura do botão da primeira dica horizontal e do seu grupo (`getByRole('complementary', { name: 'Dicas' }).getByRole('region', { name: 'Horizontais' })`); `solveFirstAcrossWord(page)`; clicar numa célula de outra palavra para a dica deixar de ser a ativa; conferir alturas iguais (FR-013, SC-004), `svg` visível no botão, `text-decoration-line` `none` e o `background-color` computado igual ao de um elemento de prova com `background: var(--ok-tint)` criado no `evaluate`; voltar à palavra resolvida e conferir que o fundo é o de `var(--word)` e o visto continua (cenário 2); conferir que o `stroke` computado do `svg` é igual ao de um elemento de prova com `stroke: var(--ok)` (o contraste do visto com `--ok-tint` e `--word` está medido em research R7; o teste prova que o visto usa esse token, FR-012); apagar uma letra da palavra e conferir que o visto some e as alturas continuam iguais. Num teste à parte (um tema basta), concluir a cruzada com `fillSolution`, fechar o diálogo de conclusão ("Ver o tabuleiro") e, no modo leitura, conferir que o número de botões de dica com `svg` é igual a `puzzle.words.length` (Edge Cases: todas as dicas aparecem resolvidas)

### Implementation for User Story 3

- [X] T016 [US3] Em `apps/web/src/features/game/ClueList.tsx` (research R6): na dica resolvida, depois do texto oculto ", resolvida", renderizar `<svg viewBox="0 0 24 24" aria-hidden="true" className={styles.check}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>`; atualizar o comentário da prop `struck` se citar o risco
- [X] T017 [US3] Em `apps/web/src/features/game/ClueList.module.css` (research R6): `.clue` com `position: relative` e `padding-right: 36px` em toda dica (espaço do visto, para a quebra de linha não mudar ao resolver); `.done` passa a `background: var(--ok-tint)`, sem `color`, `text-decoration` nem espessura; `.active.done` passa a `background: var(--word)` e troca o comentário de contraste por um que explica que a ativa mantém o fundo da palavra ativa; `.check` com `position: absolute`, `top` alinhado à primeira linha (centro da linha de 16/17 px com o padding de 6 px), `right: 10px`, `width`/`height: 18px`, `fill: none`, `stroke: var(--ok)`, `stroke-width: 2.5`, `stroke-linecap`/`stroke-linejoin: round`. Comentário curto ligando ao FR-013. T013 a T015 passam

**Checkpoint**: US3 completa; a dica certa se destaca na lista nos dois temas sem mexer na lista.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] Atualizar `docs/design.md` (o arquivo tem duas listas numeradas com itens 10 e 12; os itens são estes): o item 12 que começa com "Uma dica da lista fica riscada e apagada" (hoje na linha 193: dica resolvida com fundo de sucesso e visto, sem risco, ", resolvida" para o leitor de tela, espaço do visto reservado; e a barra da dica ativa numa linha com reticências; feature 017); o item 10 que começa com "O progresso é salvo automaticamente" (hoje na linha 197: o salvamento automático não mostra texto quando dá certo, só os avisos de problema; o visitante vê "Progresso só neste aparelho")
- [X] T019 [P] Acrescentar a feature 017 em "Current state" do `CLAUDE.md` (só `apps/web`; `SaveStatus` sem texto em `saved`/`saving` e texto fixo do visitante; `ClueBar` numa linha com reticências só por CSS; dica resolvida com `--ok-tint` e visto `aria-hidden`, espaço reservado; `e2e/sem-saltos.spec.ts` com `lengthenClues`; substitui os textos de salvamento das features 010 e 013 e a aparência riscada das features 011 e 016)
- [X] T020 [P] Deixar o rastro nas specs antigas, sem reescrever os requisitos, com uma nota em itálico no fim de cada um: `specs/010-front-basico/spec.md` FR-015 (_Nota (feature 017): o salvamento não mostra "Salvo"/"Salvando…"; ver `specs/017-jogo-sem-layout-shift/spec.md`._); `specs/013-jogo-sem-login/spec.md` FR-010 (_Nota (feature 017): o texto fixo é "Progresso só neste aparelho"._); `specs/011-calendario-e-tamanho-tabuleiro/spec.md` FR-023 e `specs/016-dica-riscada-ao-acertar/spec.md` FR-001 (_Nota (feature 017): a dica resolvida não fica mais riscada nem apagada; ganha fundo de sucesso e visto. A regra de quando ela é resolvida não muda._)
- [X] T021 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` na raiz, e o e2e completo contra o banco `cruzadinha_e2e` (API própria na porta 3001, `E2E_WEB_PORT=4174`); corrigir o que falhar
- [ ] T022 Seguir o roteiro manual de `specs/017-jogo-sem-layout-shift/quickstart.md` em 1280 x 800 e 360 x 740, temas claro e escuro, como visitante e com conta, incluindo uma cruzada real da Cruzada Online com dicas longas

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependência.
- **Foundational (T002)**: depois de T001; bloqueia os e2e das três histórias (T006, T011, T015).
- **US1 (T003–T009)**, **US2 (T010–T012)** e **US3 (T013–T017)**: depois de T002; independentes entre si (arquivos diferentes), exceto que T006, T011 e T015 editam o mesmo `sem-saltos.spec.ts` e devem ser escritos um de cada vez.
- **Polish (T018–T022)**: T018–T020 depois das implementações que descrevem; T021 e T022 por último.

### Within Each User Story

- Testes antes da implementação, falhando.
- US1: T003–T006 → T007 → T008 → T009.
- US2: T010–T011 → T012.
- US3: T013–T015 → T016 → T017.

### Parallel Opportunities

- T003, T004 e T005 (arquivos diferentes de teste da US1).
- T010 com qualquer teste da US1 ou da US3.
- T013 e T014.
- T018, T019 e T020.
- Com mais de uma pessoa: US1, US2 e US3 em paralelo, combinando a ordem das edições em `sem-saltos.spec.ts`.

---

## Parallel Example: User Story 1

```text
Task: "T003 SaveStatus.test.tsx (tabela de estados e visitante)"
Task: "T004 GamePage.test.tsx (sem 'Salvo' ao salvar)"
Task: "T005 GuestGame.test.tsx (texto fixo do visitante)"
```

## Parallel Example: User Story 3

```text
Task: "T013 ClueList.test.tsx (visto e nome acessível)"
Task: "T014 ClueSheet.test.tsx (visto no celular)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 e T002.
2. US1: testes T003–T006 falhando, T007–T009 até passarem.
3. Validar com o roteiro 1 a 3 do quickstart; a faixa já para de pular.

### Incremental Delivery

1. US1 → commit `feat(web): stop showing the save state while it works`.
2. US2 → commit `feat(web): keep the active clue bar on one line`.
3. US3 → commit `feat(web): mark a solved clue with a success background and a check`.
4. Polish → commit `docs: describe the game screen changes of feature 017`.

Cada história é testável sozinha e pode ir para o `main` antes das outras.

---

description: "Task list for feature 018: barra da dica com a largura do tabuleiro e dica completa ao parar o mouse"
---

# Tasks: Barra da dica com a largura do tabuleiro e dica completa ao parar o mouse

**Input**: Design documents from `/specs/018-barra-dica-largura-tabuleiro/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios. A spec mede largura e posição em pixels (SC-001 a SC-003, SC-007) e o tempo do balão (SC-006). Os testes vêm antes da implementação e precisam falhar primeiro. Largura, posição e corte só podem ser medidos no navegador (jsdom não faz layout), então ficam no Playwright. As regras do balão (tempo, abrir, fechar) ficam no Vitest, com temporizadores falsos e o corte simulado.

**Organization**: uma fase por história da spec. US1 (largura do tabuleiro) é P1; US2 (acompanha o tamanho e largura mínima) e US3 (balão) são P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (colunas de dicas paradas), US2 (largura acompanha o tabuleiro, mínimo de 320 px), US3 (dica completa ao parar o mouse).
- Caminhos relativos à raiz do repositório. Só `apps/web` muda; API, banco e `packages/shared` não mudam (SC-005).

## Regras que valem para todas as tarefas

- Pré-requisito: a feature 017 commitada (barra numa linha, `contain: inline-size` em `.bar`, `apps/web/e2e/sem-saltos.spec.ts` com `lengthenClues`, `box`, `openToday`, `activeClue`, `activeClueText`, `clueBar`, `overflow` e `walkWords`).
- Antes de escrever código que usa uma biblioteca, consultar a documentação atual pelo Context7 (constituição, Fluxo de Desenvolvimento). Já confirmados no plano: `Locator.boundingBox()` (Playwright), `onPointerEnter`/`onPointerLeave`/`pointerType` (React), `userEvent.setup({ advanceTimers })`, `user.hover`, `user.unhover` (user-event).
- Sem `any`. Sem cor ou medida de tema fixa: só tokens (`--surface`, `--ink`, `--line`, `--radius-md`). O `320px` de `--clue-bar-min` é um token de layout novo, declarado uma vez (data-model.md).
- Comentários em português, no tom e densidade do código ao redor. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- Commits em inglês, Conventional Commits, sem linha de coautoria. Escopo `web`.
- Dicas longas dos testes são inventadas (`LONG_CLUE` da 017), nunca copiadas de uma fonte real.
- Medidas de largura e posição no e2e comparam com tolerância de 1 px pelo helper `expectNear` (diferença absoluta ≤ 1). `toBeCloseTo(b, 0)` exige menos de 0,5 px e falha na centralização em meio pixel (visto na T009).

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Criar a branch `feat/018-barra-dica-largura-tabuleiro` a partir de `main` com a 017 já mesclada (ou, se o autor preferir, continuar na branch da 017) e rodar `npm test -w @cruzadinha/web` e `npm run typecheck`, anotando que estão verdes antes de qualquer mudança

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: helpers e2e de medida que as três histórias usam.

- [X] T002 Em `apps/web/e2e/sem-saltos.spec.ts`, acrescentar os helpers, sem testes novos ainda:
  - `cluesAside(page)`: `page.getByRole('complementary', { name: 'Dicas' })`.
  - `boardHead(page)`: o primeiro filho da coluna do tabuleiro, `page.getByRole('region', { name: 'Tabuleiro' }).locator(':scope > :first-child')` (barra da dica ou faixa de modo leitura). Se a `section` "Tabuleiro" não for exposta como `region` pelo Playwright, usar `page.locator('section[aria-label="Tabuleiro"] > :first-child')`.
  - `expectSameSpan(a, b)`: recebe duas caixas de `box()` e confere `x` e `width` com `toBeCloseTo(…, 0)`.
  - `setCellSize(page, key: 'Home' | 'End')`: foca `getByRole('slider', { name: 'Tamanho do tabuleiro' })` e aperta a tecla (mínimo 30 ou máximo que cabe), como em `apps/web/e2e/tamanhos.spec.ts`.

**Checkpoint**: `npx playwright test e2e/sem-saltos.spec.ts --list` roda sem erro de tipo.

---

## Phase 3: User Story 1 - Colunas de dicas paradas ao trocar de palavra (Priority: P1) 🎯 MVP

**Goal**: no computador, a barra tem sempre a largura da grade e as colunas de dicas não se movem ao trocar de palavra (FR-001 a FR-003, FR-008).

**Independent Test**: em 1280 × 800, com `lengthenClues`, percorrer todas as palavras com Tab; a barra tem `x`/`width` da grade e o `aside` "Dicas" não muda de `x`.

### Tests for User Story 1 ⚠️

- [X] T003 [US1] Em `apps/web/e2e/sem-saltos.spec.ts`, dar a `walkWords` uma opção `{ boardFixed: boolean; matchGrid?: boolean }`. Com `matchGrid: true`, a cada palavra: `expectSameSpan(await box(clueBar(page)), await box(page.getByRole('grid')))`, e `x` de `box(cluesAside(page))` igual ao da primeira palavra (FR-001, FR-002, SC-001, SC-002). Passar `matchGrid: true` só no teste "computador: o tabuleiro não se move ao trocar de palavra"; os testes de janela estreita e de celular continuam sem a opção (FR-009)
- [X] T004 [US1] Rodar `npm run test:e2e -w @cruzadinha/web -- sem-saltos` e registrar o resultado de T003. Com só a 017 aplicada, a largura já deve acompanhar a grade (research R1). Se passar, anotar na tarefa que a regra já valia e que T003 a protege de regressão. Se falhar, anotar a diferença medida antes de seguir para T005
  - Resultado (2026-10-20): passou com só a 017 aplicada (o `contain: inline-size` de `.bar` já impede a dica de alargar a coluna). T003 fica como proteção contra regressão; T005 estende a regra à faixa de modo leitura.

### Implementation for User Story 1

- [X] T005 [US1] Em `apps/web/src/features/game/GamePage.module.css`, logo depois de `.desktop .board`, acrescentar `.desktop .board > :first-child { contain: inline-size; }` com um comentário curto dizendo que a barra e a faixa de modo leitura têm a largura do tabuleiro e nunca o alargam (feature 018). Manter o `contain: inline-size` de `.bar` em `apps/web/src/features/game/ClueBar.module.css`

**Checkpoint**: T003 verde; `npm run test:e2e -w @cruzadinha/web -- tamanhos` continua verde (FR-007).

---

## Phase 4: User Story 2 - Largura acompanha o tamanho do tabuleiro (Priority: P2)

**Goal**: a barra acompanha a grade ao redimensionar; grades com menos de 320 px usam uma barra de 320 px centralizada, sem cortar número nem direção; a faixa de modo leitura segue a mesma regra (FR-004 a FR-006).

**Independent Test**: com o 5 × 5 do seed em 1280 × 800, levar a alça ao mínimo (grade de 158 px) e ao máximo e usar "Tamanho padrão"; terminar a cruzada e repetir com a faixa de modo leitura.

### Tests for User Story 2 ⚠️

- [X] T006 [US2] Em `apps/web/e2e/sem-saltos.spec.ts`, novo `test.describe('US2: a barra acompanha o tamanho do tabuleiro', …)` em 1280 × 800 com `lengthenClues` e `openToday`:
  - Antes de mudar o tamanho, guardar a altura de `box(clueBar(page))`. Em cada passo abaixo (mínimo, máximo, padrão e janela de 1000 px), conferir que a altura da barra continua igual a essa, ou seja, a dica continua numa linha (SC-003).
  - `setCellSize(page, 'Home')`: largura de `box(clueBar(page))` igual a 320 (`toBeCloseTo(320, 0)`); centro da barra (`x + width / 2`) igual ao centro da grade com `toBeCloseTo(…, 0)`; percorrer as palavras com Tab conferindo que a largura continua 320 e que `overflow(activeClue(page).locator('b')).cut` é `false` (FR-004, SC-002).
  - `setCellSize(page, 'End')`: `expectSameSpan` entre barra e grade (FR-005).
  - Clicar em "Tamanho padrão": `expectSameSpan` entre barra e grade (FR-005, SC-003).
  - `page.setViewportSize({ width: 1000, height: 800 })`: `expectSameSpan` entre barra e grade, ou largura 320 se a grade ficar com menos de 320 px (FR-005).
- [X] T007 [US2] No mesmo arquivo, teste da faixa de modo leitura em 1280 × 800: `openToday`, `fillSolution(page, solution.cells)` com `todayPuzzle`, clicar em "Ver o tabuleiro", e conferir com `boardHead(page)` que a faixa tem `x`/`width` da grade no tamanho padrão; depois `setCellSize(page, 'Home')` e conferir que a faixa tem largura 320 e que a borda esquerda do `aside` fica exatamente um `column-gap` à direita da borda direita da faixa, ou seja, a faixa não alarga a coluna além de 320 px (FR-006). O `column-gap` vem de `getComputedStyle` do elemento pai da `section[aria-label="Tabuleiro"]` (o `.body` em layout `.desktop`), lido com `locator.evaluate((section) => getComputedStyle(section.parentElement!).columnGap)` ou equivalente sem `!`, sem valor fixo no teste
- [X] T008 [US2] Rodar `npm run test:e2e -w @cruzadinha/web -- sem-saltos` e confirmar que T006 e T007 falham no caso do mínimo (barra mais estreita que 320 px ou número cortado) antes de T009

### Implementation for User Story 2

- [X] T009 [US2] Em `apps/web/src/features/game/GamePage.module.css`: em `.desktop`, declarar `--clue-bar-min: 320px` com um comentário dizendo que cabe nos botões anterior e próxima, no número com a direção e num trecho da dica (research R3); na regra de T005, acrescentar `min-width: var(--clue-bar-min);`. Conferir que `.board` continua com `align-items: center`, de modo que a grade fica centralizada na coluna de 320 px

**Checkpoint**: T006 e T007 verdes; `tamanhos.spec.ts` verde, incluindo "sem rolagem horizontal de 861 a 2560 px, com 30 e 110 px" (FR-007).

---

## Phase 5: User Story 3 - Dica completa ao parar o mouse sobre ela (Priority: P2)

**Goal**: com o mouse parado 500 ms sobre a dica cortada, um balão abaixo da barra mostra a dica inteira; fecha ao sair, com Esc e ao trocar de palavra; não move nada e é invisível ao leitor de tela (FR-010 a FR-015).

**Independent Test**: no computador, com uma dica longa ativa, parar o mouse sobre ela; o balão aparece com a dica inteira em até 1 s, nada se move, e ele some ao sair, com Esc e ao trocar de palavra; numa dica curta, nenhum balão.

### Tests for User Story 3 ⚠️

- [X] T010 [P] [US3] Em `apps/web/src/features/game/ClueBar.test.tsx`, novo `describe('balão com a dica completa', …)` com `vi.useFakeTimers()` no `beforeEach` e `vi.useRealTimers()` no `afterEach`, `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, e o corte simulado por `vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get')` e `vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get')` (cortado: 400 e 200; inteiro: 200 e 200), restaurados com `vi.restoreAllMocks()`. Uma `word` com dica longa inventada. O balão é achado por `screen.queryByTestId('full-clue')`. Casos:
  - cortada, `user.hover` no texto da dica, `act(() => vi.advanceTimersByTime(499))`: sem balão; mais 1 ms: balão com o texto inteiro (FR-010, SC-006);
  - inteira, hover e 500 ms: sem balão (FR-011);
  - `user.hover` e `user.unhover` antes de 500 ms, avançar 500 ms: sem balão (FR-011);
  - aberto, `user.hover` no próprio balão: continua aberto; `user.unhover` da barra: fecha (FR-012);
  - aberto, na variante com `onPrevious`/`onNext`, `user.hover` no botão "Próxima dica" e depois no "Dica anterior": continua aberto (FR-012, os botões fazem parte da barra);
  - aberto, `user.keyboard('{Escape}')`: fecha (FR-012);
  - aberto, `rerender` com outra `word`: fecha (FR-012);
  - aberto: o balão tem `aria-hidden="true"` e há uma só região `aria-live` (FR-014);
  - `fireEvent.pointerEnter` no texto com `{ pointerType: 'touch' }` e 500 ms: sem balão (FR-011). Se o jsdom não repassar `pointerType`, deixar esse caso só no e2e de T011 e anotar aqui;
  - as duas variantes, com e sem `onPrevious`/`onNext`;
  - `expectNoA11yViolations(container)` com o balão aberto.
  - Feito com `fireEvent` em vez de `user-event`: o `user-event` espera `setTimeout` reais entre as ações e trava com os temporizadores falsos do Vitest. O jsdom repassa `pointerType`, então o caso do toque ficou no unitário também. Dois casos a mais cobrem o tempo contado desde o último movimento (research R6).
- [X] T011 [P] [US3] Em `apps/web/e2e/sem-saltos.spec.ts`, novo `test.describe('US3: dica completa ao parar o mouse', …)` em 1280 × 800 com `lengthenClues` e `openToday`. A primeira palavra (índice 0) tem `LONG_CLUE`. Casos:
  - guardar `box` da grade, da barra e do `aside`; `activeClueText(page).hover()`; `expect(page.getByTestId('full-clue')).toHaveText(LONG_CLUE, { timeout: 1000 })` (SC-006); as três caixas iguais às de antes (FR-013, SC-007); o balão com `width` igual à da barra (`toBeCloseTo`) e `y` abaixo do fundo da barra;
  - travessia do vão: com o balão aberto, pegar o centro horizontal do texto da dica (`cx`), o centro vertical do texto (`y0`) e o centro vertical do balão (`y1`); `page.mouse.move(cx, y0)` e depois `page.mouse.move(cx, y1, { steps: 20 })`, para o mouse passar pelo vão de 4 px entre a barra e o balão. O balão continua visível durante e depois do movimento (FR-012, ponte `.full::before`). Depois `page.mouse.move(0, 0)`: some (FR-012);
  - Esc: pôr o foco no tabuleiro com `page.getByRole('grid').focus()`, sem clicar. Quem recebe o foco é a grade (`tabIndex={0}` e `aria-activedescendant` em `Board.tsx`); as células não são focáveis. Clicar na célula já selecionada trocaria a direção (`select` → `toggleDirection` em `game-logic/reducer.ts`) e mudaria a palavra ativa. Tirar o mouse da barra com `page.mouse.move(0, 0)`. Passar o mouse de novo pelo texto da dica e esperar o balão. Com o balão aberto, `page.keyboard.press('Escape')`: some. Depois `Tab` continua o comportamento do Esc da feature 011: o foco vai para a alça `slider` "Tamanho do tabuleiro" (FR-012);
  - abrir de novo e clicar em "Próxima dica": some (FR-012);
  - dica curta: apertar Tab, com o foco no tabuleiro, até o texto de `activeClueText(page)` ser diferente de `LONG_CLUE` (no máximo `puzzle.words.length` vezes; falhar se não achar). Não depender da posição da palavra na lista, porque `lengthenClues` alonga pela posição em `puzzle.words` e a ordem de "Próxima dica" pode ser outra. Passar o mouse sobre a dica e esperar 1 s: `getByTestId('full-clue')` com contagem 0 (FR-011);
  - cores, nos temas claro e escuro: com o balão aberto, `color` e `background-color` de `getComputedStyle` do balão iguais aos de um elemento de teste com `color: var(--ink)` e `background-color: var(--surface)`, porque o axe pode pular conteúdo `aria-hidden` (FR-015). Usar o `probe` da 017 neste arquivo, ampliando o tipo do parâmetro `property` para `'background-color' | 'stroke' | 'color'` e trocando o `setProperty` para aplicar a própria propriedade recebida (`element.style.setProperty(name, token)`), sem quebrar os usos atuais;
  - axe (`new AxeBuilder({ page }).exclude('[role="grid"]')`, como em `visitante.spec.ts`) com o balão aberto, nos temas claro e escuro (SC-004);
  - janela estreita sem teclado na tela (800 × 900, com mouse): com `lengthenClues`, passar o mouse pela dica longa na barra da coluna de dicas e conferir que o balão aparece em até 1 s com a dica inteira (FR-009, FR-010).
- [X] T012 [P] [US3] No `test.describe('US2 no celular com teclado na tela', …)` de `apps/web/e2e/sem-saltos.spec.ts` (viewport 360 × 740, `hasTouch`, `isMobile`), novo teste: com `lengthenClues`, `activeClueText(page).tap()`, esperar 1 s e conferir `getByTestId('full-clue')` com contagem 0 (FR-011)
- [X] T013 [US3] Rodar `npx vitest run src/features/game/ClueBar.test.tsx` em `apps/web` e `npm run test:e2e -w @cruzadinha/web -- sem-saltos`, e confirmar que T010 e T011 falham (não existe balão) antes de T014

### Implementation for User Story 3

- [X] T014 [US3] Em `apps/web/src/features/game/ClueBar.tsx` (research R6):
  - `const HOVER_DELAY_MS = 500` com um comentário curto (tempo com o mouse parado antes do balão, FR-010).
  - Estado `openFor: string | null` (`useState`) com a chave da palavra, `wordKey(word)` de `apps/web/src/game-logic/clue-strike.ts`. O balão aparece só quando `word !== null && openFor === wordKey(word)`, então outra palavra o fecha sem `useEffect`. A chave não depende de a página entregar sempre o mesmo objeto `Word`.
  - `ref` no `span` do texto e `ref` do temporizador (`useRef<number | undefined>`). `onPointerEnter` e `onPointerMove` no `span` (mesma função): se `event.pointerType === 'touch'` ou o balão já está aberto, nada; senão, cancela o pendente e `window.setTimeout` de `HOVER_DELAY_MS` que, ao disparar, abre (`setOpenFor(wordKey(word))`) só se `span.scrollWidth > span.clientWidth`. `onPointerLeave` no `span`: `window.clearTimeout` do pendente (não fecha o balão aberto).
  - `onPointerLeave` na `div` da barra (as duas variantes): cancela o temporizador e `setOpenFor(null)`.
  - Enquanto aberto, `useEffect` com `keydown` no `document` que fecha no `Escape`, sem `preventDefault`/`stopPropagation`, removido na limpeza, como em `apps/web/src/features/game/LegendButton.tsx`.
  - `useEffect` de limpeza que cancela o temporizador ao desmontar.
  - O balão, dentro da barra e depois da região viva (e dos botões): `<div className={styles.full} aria-hidden="true" data-testid="full-clue">{word.clue}</div>`. A região viva e o texto "Escolha uma célula para começar." não mudam.
- [X] T015 [US3] Em `apps/web/src/features/game/ClueBar.module.css`: `.bar` ganha `position: relative`; nova `.full` com `position: absolute`, `top: calc(100% + 4px)`, `left: 0`, `right: 0`, `z-index: 4` (acima da alça, 1, e da capa de pausa, 3; abaixo da legenda, 5), `padding: 8px 12px`, `border: 1px solid var(--line)`, `border-radius: var(--radius-md)`, `background: var(--surface)`, `color: var(--ink)`, `box-shadow: 0 4px 16px rgb(0 0 0 / 20%)` (a mesma do painel de `LegendButton.module.css`), `font-size: 15px`, `white-space: normal` e `overflow-wrap: anywhere`, com um comentário curto (balão por cima do tabuleiro, fora do fluxo, FR-013). Nova `.full::before` como ponte invisível sobre o vão: `content: ''`, `position: absolute`, `left: 0`, `right: 0`, `bottom: 100%`, `height: 5px` (os 4 px do vão mais 1 px da borda), com um comentário curto dizendo que ela mantém o balão aberto quando o mouse desce da dica para ele (FR-012, research R6)

**Checkpoint**: T010, T011 e T012 verdes; os testes da 017 em `sem-saltos.spec.ts` e o resto de `ClueBar.test.tsx` continuam verdes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Em `docs/design.md`, na parte da tela de jogo, descrever a barra da dica no computador com a largura do tabuleiro (mínimo de 320 px) e o balão com a dica completa ao parar o mouse 500 ms sobre uma dica cortada
- [X] T017 [P] Em `CLAUDE.md`, seção "Current state", acrescentar a linha da feature 018 no estilo das anteriores: só `apps/web`; `.desktop .board > :first-child` com `contain: inline-size` e `min-width: var(--clue-bar-min)` (320 px) para a barra e a faixa de modo leitura; o balão de `ClueBar` (`HOVER_DELAY_MS` 500, só para dica cortada, `openFor`, Esc, `aria-hidden`, `data-testid="full-clue"`); os testes em `e2e/sem-saltos.spec.ts`
- [X] T018 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e -w @cruzadinha/web` (todos os specs), e corrigir o que falhar. Conferir com `git diff --stat main` que nada mudou fora de `apps/web/`, `docs/`, `specs/018-barra-dica-largura-tabuleiro/` e `CLAUDE.md` (SC-005)
  - Resultado (2026-10-20): lint, typecheck e unitários verdes (277 + 651 + 112); e2e completo 46/46 com a API do e2e em `REGISTRATION_ENABLED=true`, como na CI (sem isso `fluxo-principal` não acha "Criar conta"). `format:check` só acusa `apps/web/e2e/zz-debug.spec.ts`, um teste de depuração temporário não versionado que precisa ser apagado à mão. O diff fica em `apps/web/`, `docs/design.md`, `CLAUDE.md` e na pasta da spec.
- [ ] T019 Fazer a conferência manual de `specs/018-barra-dica-largura-tabuleiro/quickstart.md` (passos 1 a 9), incluindo uma cruzada real do Cruzada Online nos dois temas, e anotar o resultado nesta tarefa

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002)** → histórias.
- **US1 (T003–T005)**: depende de T002. É o MVP.
- **US2 (T006–T009)**: depende de US1, porque T009 acrescenta `min-width` à regra criada em T005.
- **US3 (T010–T015)**: depende só de T002 para o e2e; `ClueBar.tsx`/`ClueBar.module.css` não são tocados por US1 nem US2. Pode ser feita em paralelo com US1/US2, mas os testes e2e de US3 (T011, T012) e os de US1/US2 editam o mesmo arquivo, então as edições em `sem-saltos.spec.ts` são sequenciais.
- **Polish (T016–T019)**: depois das três histórias.

Dentro de cada história: testes → confirmar a falha → implementação → checkpoint.

## Parallel Opportunities

- T010 (`ClueBar.test.tsx`) em paralelo com T003/T006/T007 (`sem-saltos.spec.ts`): arquivos diferentes.
- T011 e T012 estão marcados [P] em relação a T010, não entre si: os dois editam `sem-saltos.spec.ts`.
- T014/T015 (ClueBar) em paralelo com T005/T009 (GamePage): arquivos diferentes.
- T016 e T017 em paralelo.

### Parallel Example: User Story 3

```text
Task: "T010 [US3] unitários do balão em apps/web/src/features/game/ClueBar.test.tsx"
Task: "T011 [US3] e2e do balão em apps/web/e2e/sem-saltos.spec.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001–T002.
2. T003–T005: a barra com a largura do tabuleiro, protegida por e2e. Já resolve o que o autor viu na captura.
3. Parar e validar com os passos 1 e 2 do quickstart.

### Incremental Delivery

1. US1 → commit `feat(web): keep the clue bar as wide as the board`.
2. US2 → commit `feat(web): give the clue bar a minimum width on small boards`.
3. US3 → commit `feat(web): show the full clue when hovering a cut clue`.
4. Polish → commit `docs: describe the clue bar width and hover clue of feature 018`.

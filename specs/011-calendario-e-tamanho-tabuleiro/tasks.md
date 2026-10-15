---
description: "Lista de tarefas da feature 011: calendário mais largo e tamanho ajustável do tabuleiro"
---

# Tasks: Calendário mais largo e tamanho ajustável do tabuleiro

**Input**: Documentos de design em `/specs/011-calendario-e-tamanho-tabuleiro/`

**Prerequisites**: plan.md, spec.md, research.md (R1 a R11), data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: incluídos. A constitution (princípio VII) e o plano (research R11) pedem testes unitários das funções puras, testes de componente com `vitest-axe` e medidas reais no Playwright. Os testes de cada fase vêm antes da implementação e devem falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário (US1 a US3), na ordem de prioridade da spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história de usuário da spec (US1 a US3). As fases de Setup, Foundational e Polish não têm rótulo.
- Todo caminho é relativo à raiz do repositório.

## Path Conventions

Monorepo npm workspaces. Todo código muda em `apps/web/` (`src/` e `e2e/`). A API, o banco e `packages/shared` não mudam.

- "Layout de computador" da tela de jogo é `useDesktopLayout()`: sem teclado na tela **e** `(min-width: 861px)`.
- Na biblioteca, o "layout de computador" é só `(min-width: 861px)` (contracts/ui-contracts.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: tokens novos usados pelas três histórias

- [X] T001 Acrescentar a `apps/web/src/themes/tokens.css` os tokens `--clues-width: 560px` (largura máxima da área de dicas no computador) e `--library-max: 1632px` (1600 px de calendário + margens), com comentário curto em português, sem mudar nenhum token existente

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: a condição única de layout de computador (US1 e US2) e a alça de redimensionar genérica (US2 e US3)

**⚠️ CRITICAL**: US1 depende de T002 e T003; US2 e US3 dependem de toda esta fase.

- [X] T002 [P] Criar `apps/web/src/features/game/useDesktopLayout.test.ts` com `matchMedia` simulado, cobrindo:
  - `true` só quando `(min-width: 861px)` casa e `ON_SCREEN_KEYBOARD_QUERY` não casa;
  - `false` com ponteiro grosseiro em 1200 px;
  - `false` sem `matchMedia`.
- [X] T003 Criar `apps/web/src/features/game/useDesktopLayout.ts`: `DESKTOP_LAYOUT_QUERY = '(min-width: 861px)'` e `useDesktopLayout()`, que combina `useMediaQuery(DESKTOP_LAYOUT_QUERY)` com `!useOnScreenKeyboard()`, com comentário explicando por que é uma condição em JS e não uma media query CSS (research R1). Faz T002 passar.
- [X] T004 [P] Criar `apps/web/src/components/ResizeHandle.test.tsx` (research R6, contracts "Alça de redimensionar"):
  - **Atributos**: renderiza `role="slider"` com `aria-label`, `aria-orientation="horizontal"`, `aria-valuemin`/`max`/`now` e `aria-valuetext` vindo de `valueText(value)`, com `tabIndex=0`.
  - **Teclado**:
    - ← e ↓ chamam `onChange` e `onCommit` com `value − step`; → e ↑ com `value + step`;
    - Home leva a `min` e End a `max`;
    - o resultado fica sempre limitado a `min`..`max`;
    - cada tecla usa `preventDefault`;
    - letras não chamam nada.
  - **Arraste**: `fireEvent.pointerDown` (botão 0, `clientX`/`clientY`), depois `pointerMove` e `pointerUp`. Chama `fromDrag({ startValue, dx, dy })`, chama `onChange` com o valor limitado e chama `onCommit` uma vez ao soltar. `pointerCancel` e `lostPointerCapture` também chamam `onCommit` com o último valor válido. O botão secundário não inicia o arraste. Não falha sem `setPointerCapture` (o jsdom não tem).
  - **Clique duplo**: chama `onReset`.
  - **Variantes**: `variant="corner"` e `variant="edge"` aplicam classes diferentes.
  - **`decorative`**: não tem `role`, não tem `aria-value*`, tem `aria-hidden="true"` e `tabIndex=-1` e ignora o teclado, mas o arraste com ponteiro continua funcionando e chamando `onChange`/`onCommit`.
  - **Acessibilidade**: passa no `vitest-axe`, inclusive numa árvore com uma alça normal e uma `decorative` lado a lado.

  Usar `vi.useFakeTimers` ou simular `requestAnimationFrame` para o agrupamento das atualizações.
- [X] T005 Criar `apps/web/src/components/ResizeHandle.tsx` e `apps/web/src/components/ResizeHandle.module.css` conforme research R6 (faz T004 passar).
  - **Props**: `value`, `min`, `max`, `step`, `label`, `valueText(value)`, `fromDrag({ startValue, dx, dy })`, `onChange`, `onCommit`, `onReset`, `variant: 'corner' | 'edge'`, `className?` e `decorative?: boolean`.
  - **`decorative`**: sem `role="slider"` e sem `aria-*` de valor, com `aria-hidden="true"`, `tabIndex={-1}` e sem `onKeyDown`. O arraste e o clique duplo continuam. Se o `eslint-plugin-jsx-a11y` acusar `no-static-element-interactions` nesse ramo, desativar a regra só nessa linha (`eslint-disable-next-line`) com um comentário dizendo que é uma pegada visual duplicada de uma alça acessível. Nunca desativar no arquivo inteiro.
  - **Arraste**:
    - `onPointerDown` só com `event.button === 0`, guardando o ponto e o valor inicial e chamando `event.currentTarget.setPointerCapture?.(event.pointerId)`;
    - `onPointerMove`, agrupado em `requestAnimationFrame`;
    - `onPointerUp`, `onPointerCancel` e `onLostPointerCapture` encerram o arraste, chamam `onCommit` uma vez e cancelam o quadro pendente.
  - **Teclado e clique duplo**: `onKeyDown` com ←, →, ↑, ↓, Home e End; `onDoubleClick`.
  - **CSS**:
    - `corner` é um alvo de 44 × 44 px com cursor `nwse-resize` e um desenho de três traços diagonais;
    - `edge` é uma faixa de 44 px de largura, com a altura toda, cursor `ew-resize` e um traço vertical centralizado;
    - cores só por token: `--mute` em repouso e `--accent` no `:hover`, `:focus-visible` e durante o arraste;
    - foco visível com `--focus`, `touch-action: none` e sem seleção de texto durante o arraste.

  Comentário em português explicando o dobro do deslocamento, que fica nas funções `fromDrag` de cada tela.

**Checkpoint**: condição de layout e alça prontas; as histórias podem começar.

---

## Phase 3: User Story 1 - Tela de jogo equilibrada no computador (Priority: P1) 🎯 MVP

**Goal**: no computador, tabuleiro e dicas formam um bloco centralizado. A dica ativa fica numa barra acima do tabuleiro, com anterior e próxima. Horizontais e verticais ficam lado a lado, com a altura do tabuleiro, rolando por dentro. O tabuleiro tem o maior tamanho que cabe inteiro na janela.

**Independent Test**: sem tamanho guardado, abrir uma cruzada 11 × 11 em 1920 × 1080. O bloco fica centralizado, a área de dicas tem no máximo 576 px e o tabuleiro e a barra cabem sem rolar. Em 360 px, nada muda.

### Tests for User Story 1 ⚠️

- [X] T006 [P] [US1] Criar `apps/web/src/features/game/board-size.test.ts` com os casos de layout (research R2):
  - `cellFor(space, count)` devolve o maior inteiro `c` com `count·c + (count−1) + 4 ≤ space`;
  - `fitCellSize({ width, height, cols, rows })` fica limitado a 30..110 e usa o menor entre largura e altura;
  - `maxCellSize({ width, cols })` fica limitado a 30..110;
  - grade não quadrada (15 × 11);
  - espaço zero ou negativo resulta em 30.
- [X] T007 [P] [US1] Criar `apps/web/src/features/game/ClueBar.test.tsx`:
  - com `onPrevious`/`onNext`, mostra os botões "Dica anterior" e "Próxima dica" e chama cada callback;
  - sem as props, não mostra botões;
  - a região continua `aria-live="polite"`;
  - passa no `vitest-axe`.
- [X] T008 [P] [US1] Criar `apps/web/src/features/game/ClueList.test.tsx`:
  - os grupos "Horizontais" e "Verticais" continuam separados;
  - com `fill`, quando `activeWord` muda, ajusta só o `scrollTop` do grupo que contém a dica ativa, sem chamar `Element.prototype.scrollIntoView` (espionar);
  - sem `fill`, nada rola.
- [X] T009 [US1] Em `apps/web/src/features/game/GamePage.test.tsx`, acrescentar casos com `matchMedia` simulado. No layout de computador:
  - a barra da dica ativa fica dentro da `section` "Tabuleiro", antes da grade;
  - o `aside` "Dicas" tem só as listas e a atribuição;
  - "Próxima dica" seleciona a próxima palavra e devolve o foco a `#board`;
  - o corpo recebe a classe de layout de computador.

  No layout de celular, a estrutura da feature 010 fica intacta, sem botões anterior e próxima.

### Implementation for User Story 1

- [X] T010 [US1] Criar `apps/web/src/features/game/board-size.ts` com `MIN_CELL = 30`, `MAX_CELL = 110`, `cellFor`, `fitCellSize` e `maxCellSize` como funções puras sem React, com comentário sobre o `gap` de 1 px e o `padding` de 2 px da grade (faz T006 passar)
- [X] T011 [US1] Separar a medida da escolha em dois hooks:
  - `apps/web/src/features/game/useMeasuredSpace.ts` só mede e devolve `{ width, height } | null`;
  - `apps/web/src/features/game/useBoardSize.ts` recebe a ref do corpo da tela de jogo, `cols`, `rows` e `enabled` (o layout de computador), chama `useMeasuredSpace(ref, enabled)` e aplica `fitCellSize`/`maxCellSize`.

  Assim os testes de componente simulam só `useMeasuredSpace` (`vi.mock`) e exercitam o `useBoardSize` real.

  `useMeasuredSpace` mede com `useLayoutEffect` + `ResizeObserver` + evento `resize` da janela:
    - largura disponível = largura interna do corpo − `--clues-width` (lida de `getComputedStyle`) − 24 px de `gap`;
    - altura disponível = `window.innerHeight` − topo do corpo na página − margens do corpo − 56 px (uma linha da barra da dica ativa) − 12 px de `gap`.
  - `useMeasuredSpace` devolve `null` quando desligado ou quando a medida dá zero, como no jsdom (research R2), e limpa o observador e o evento ao desmontar.
  - `useBoardSize` devolve `{ fit, max } | null`, e `null` quando a medida é `null`.
- [X] T012 [P] [US1] Em `apps/web/src/features/game/Board.tsx`, acrescentar a prop opcional `cellSize?: number`. Quando presente, ela entra no `style` da grade como `'--cell-size': \`${cellSize}px\``, junto de `--cols`/`--rows`. Sem a prop, vale o CSS atual de `apps/web/src/features/game/Board.module.css`, que não muda.
- [X] T013 [P] [US1] Em `apps/web/src/features/game/ClueBar.tsx` e `ClueBar.module.css`, acrescentar as props opcionais `onPrevious` e `onNext`. Quando presentes, renderizar os botões de 44 px "Dica anterior" (‹) e "Próxima dica" (›) com SVG `aria-hidden`, cores só por token e fundo `--word` na barra, como no mockup (faz T007 passar).
- [X] T014 [US1] Em `apps/web/src/features/game/ClueList.tsx` e `ClueList.module.css`:
  - cada grupo ganha um contêiner rolável (`overflow-y: auto; min-height: 0`), com o título fixo como hoje;
  - com a prop opcional `fill`, as listas ocupam a altura do pai, o `max-height: 600px` sai e um efeito ajusta o `scrollTop` do grupo ativo para mostrar o botão da dica ativa (research R5);
  - sem `fill`, o comportamento atual continua (celular e `ClueSheet`);
  - faz T008 passar.
- [X] T015 [US1] Em `apps/web/src/features/game/GamePage.tsx`:
  - usar `useDesktopLayout()` e uma ref no corpo;
  - no computador, renderizar a barra dentro da `section` "Tabuleiro", antes da grade: `ClueBar` com `onPrevious`/`onNext`, que despacham `previousWord`/`nextWord` e devolvem o foco a `#board`, ou `ReadModeBanner`;
  - deixar no `aside` só `ClueList fill` e a atribuição;
  - aplicar `styles.desktop` ao corpo;
  - passar `cellSize={size?.fit}` ao `Board` a partir de `useBoardSize`;
  - no celular, manter tudo como está (faz T009 passar).
- [X] T016 [US1] Em `apps/web/src/features/game/GamePage.module.css`, acrescentar as regras sob `.desktop` (research R3):
  - corpo com `display: flex; justify-content: center; align-items: stretch; gap: 24px`;
  - `.board` com `flex: none`;
  - `.clues` com `flex: 0 1 var(--clues-width); min-width: 0`;
  - invólucro interno das dicas com `position: sticky; top: 16px; height: min(100%, calc(100dvh - 32px)); display: flex; flex-direction: column`;
  - listas com `grid-template-columns: 1fr 1fr` e `flex: 1`.

  Manter a fórmula de `--cell-size` de computador de `Board.module.css` como reserva sem medida. O layout de até 860 px fica igual.
- [X] T017 [US1] Criar `apps/web/e2e/tamanhos.spec.ts`, bloco "layout do jogo", com `test.use({ viewport: { width: 1920, height: 1080 } })`, `localStorage` limpo e a cruzada 11 × 11 do seed, medindo com `boundingBox()` (contracts, medidas):
  - com `scrollY = 0`, a base da grade fica ≤ 1080;
  - a largura do `aside` "Dicas" fica ≤ 576 px;
  - as margens esquerda e direita do bloco diferem em ≤ 2 px;
  - a célula fica ≥ 72 px (SC-002; o mockup aprovado dá 74 px);
  - "Próxima dica" troca a dica sem mudar `scrollY`.

  Bloco "celular", com `viewport 360 × 740` e `hasTouch`:
  - **antes de qualquer mudança de CSS ou layout da US1**, rodar o bloco na `main` atual e registrar no teste, como constantes esperadas, a largura de uma célula e a largura e a altura da grade (SC-006);
  - depois, o bloco exige as mesmas medidas (±0,5 px);
  - não há `role="slider"` na página nem botões anterior e próxima;
  - a grade 11 × 11 cabe sem rolagem horizontal.

**Checkpoint**: US1 funciona e pode ser demonstrada sozinha (MVP).

---

## Phase 4: User Story 2 - Ajustar o tamanho do tabuleiro e guardar a escolha (Priority: P1)

**Goal**: no computador, a pessoa arrasta a alça no canto inferior direito do tabuleiro (ou usa as setas nela) para mudar o tamanho, entre 30 px e o máximo. "Tamanho padrão" na barra de ferramentas, ou um clique duplo na alça, volta ao padrão. A escolha fica no navegador.

**Independent Test**: arrastar a alça até o máximo, recarregar e abrir outra cruzada; o tamanho continua. "Tamanho padrão" volta ao padrão e apaga a chave.

### Tests for User Story 2 ⚠️

- [X] T018 [P] [US2] Em `apps/web/src/features/game/board-size.test.ts`, acrescentar:
  - `resolveCellSize({ fit, max, chosen })`: sem escolha devolve `fit`; com escolha devolve `clamp(30, chosen, max)`.
  - `cellFromDrag({ startCell, dx, dy, cols, rows })`, com candidato horizontal `startCell + 2·dx/cols` e candidato vertical `startCell + dy/rows`:
    - usa o candidato do eixo em que o movimento normalizado é maior;
    - arredonda para inteiro;
    - exemplos: `startCell=74, dx=55, dy=0, cols=11` → 84; `startCell=74, dx=0, dy=-110, rows=11` → 64.
  - `loadBoardSize`, `saveBoardSize` e `clearBoardSize` na chave `cruzadinha:board-size`, com valor `{"cellSize": N}`.
  - Leitura com JSON inválido, campo ausente, tipo errado, `29`, `111`, `80.5` ou armazenamento que lança exceção resulta em `null`, sem lançar.

  Regra do data-model: "`cellSize` inteiro, 30 a 110 (px por célula), inclusive".
- [X] T019 [US2] Em `apps/web/src/features/game/GamePage.test.tsx`, acrescentar os casos abaixo no layout de computador, com o `useBoardSize` real e só `useMeasuredSpace` simulado por `vi.mock('./useMeasuredSpace')`. A medida simulada (espaço já disponível para a grade) é `{ width: 1230, height: 838 }`, que dá `fit = 74` e `max = 110` numa grade 11 × 11. A conta é `11·c + 14 ≤ espaço`: na altura, `c ≤ 74,9`; na largura, `c ≤ 110,5`. Não simular o `useBoardSize`:
  - **Alça**: há um `slider` "Tamanho do tabuleiro" com `aria-valuetext` "Tamanho do tabuleiro 74 de 110, padrão".
  - **Setas**: → muda para 84, grava `{"cellSize":84}` no `localStorage` e aplica `--cell-size: 84px` à grade.
  - **"Tamanho padrão"**: está `disabled` sem escolha; com escolha, remove a chave. O clique duplo na alça faz o mesmo.
  - **Chave guardada**: é aplicada ao abrir.
  - **Estado do jogo** (SC-007, FR-008): mudar o tamanho 10 vezes seguidas, alternando → e ←, não altera letras, seleção, direção, marcas de ajuda (com uma letra revelada antes) nem o tempo exibido, e não coloca nenhum envio novo na fila de salvamento.
  - **Troca de layout**: abrir com o layout de celular simulado e uma chave `{"cellSize":90}` guardada, depois trocar a simulação para computador. A grade passa a usar 90 px e a chave continua igual. Voltar para celular não apaga a chave.
  - **Pausa**: a alça não aparece.
  - **Celular**: não há alça nem "Tamanho padrão", e a chave guardada é ignorada.

### Implementation for User Story 2

- [X] T020 [US2] Em `apps/web/src/features/game/board-size.ts`, acrescentar:
  - `BOARD_SIZE_KEY = 'cruzadinha:board-size'`;
  - o schema `z.object({ cellSize: z.number().int().min(30).max(110) })`;
  - `loadBoardSize`, `saveBoardSize` e `clearBoardSize` via `apps/web/src/lib/storage.ts`, com o valor bruto como `unknown`;
  - `resolveCellSize`, `cellFromDrag` e `KEYBOARD_STEP = 10`;
  - comentário de que a chave guarda só um número (faz T018 passar).
- [X] T021 [US2] Em `apps/web/src/features/game/useBoardSize.ts`:
  - acrescentar o estado da escolha, lido com `loadBoardSize()` quando monta com `enabled` e lido de novo toda vez que `enabled` passa de `false` para `true`; enquanto `enabled` é falso, a escolha é ignorada, mas nunca apagada (research R9, "Troca de layout");
  - devolver `{ cellSize, fit, max, isDefault, preview(value), commit(value), reset() } | null`;
  - `preview` muda só o estado, durante o arraste;
  - `commit` muda o estado e grava com `saveBoardSize`;
  - `reset` chama `clearBoardSize` e volta para `null`;
  - mudanças de janela recalculam `fit`/`max` sem mexer na escolha (FR-011).
- [X] T022 [P] [US2] Criar `apps/web/src/features/game/BoardSizeReset.tsx`: botão de texto "Tamanho padrão", alvo de 44 px, estilo só por token, `disabled` quando `isDefault` e `onClick` chamando `reset`
- [X] T023 [P] [US2] Em `apps/web/src/features/game/Toolbar.tsx`, acrescentar a prop opcional `sizeReset?: ReactNode`, renderizada no primeiro grupo depois do link "Escolher outro dia" e de um separador, antes de `saveStatus`. Sem a prop, a faixa fica igual.
- [X] T024 [US2] Em `apps/web/src/features/game/GamePage.tsx` e `GamePage.module.css` (research R7):
  - **Grade**: passar `cellSize` (a escolha resolvida) ao `Board`.
  - **Alça**: renderizar `<ResizeHandle variant="corner">` dentro de `.boardWrap`, no canto inferior direito, metade para fora da grade, só no layout de computador e fora da pausa. Configuração:
    - `label="Tamanho do tabuleiro"`;
    - `valueText` "Tamanho do tabuleiro N de M", acrescido de ", padrão" quando `isDefault`;
    - `min=30`, `max=size.max`, `step=10`;
    - `fromDrag` usando `cellFromDrag` com as `cols`/`rows` da grade;
    - `onChange=preview`, `onCommit=commit`, `onReset=reset`.
  - **Foco**: depois de um arraste com o ponteiro, devolver o foco a `#board`. Pelo teclado, o foco fica na alça.
  - **"Tamanho padrão"**: passar `<BoardSizeReset/>` em `Toolbar.sizeReset` no layout de computador.
  - **Rolagem**: quando a seleção muda no layout de computador, chamar `scrollIntoView({ block: 'nearest', inline: 'nearest' })` em `#cell-{row}-{col}` (research R5).
  - Faz T019 passar.
- [X] T025 [US2] Em `apps/web/e2e/tamanhos.spec.ts`, bloco "alça do tabuleiro", em 1920 × 1080:
  - **Arraste**: com `page.mouse` (move até o centro da alça, `down`, `move` 600 px para a direita e para baixo em vários passos, `up`):
    - a célula chega ao `max` (110 px ou menos) e não passa dele;
    - a página passa a rolar e o `aside` "Dicas" continua visível depois de rolar até o fim;
    - uma letra digitada logo depois vai para o tabuleiro.
  - **Seleção**: levar a seleção à última linha com setas; a célula fica dentro da janela.
  - **Persistência**: recarregar; a célula é a mesma, com ±1 px.
  - **Limite mínimo**: arrastar para a esquerda além do limite; a célula para em 30 px.
  - **Padrão**: "Tamanho padrão" volta ao padrão e a chave sai do `localStorage`.
  - **Teclado**: Tab até a alça, End, Home e →; `aria-valuetext` acompanha.
  - **Rolagem horizontal**: em viewports de 861 e 2560 px, com 30 e 110 px escolhidos, `document.documentElement.scrollWidth` é igual à largura da janela (SC-004).
  - **Escolha preservada** (FR-011): com 110 px escolhido em 1920 × 1080, mudar a viewport para 900 × 1080. A célula encolhe para caber, sem rolagem horizontal, e a chave continua `{"cellSize":110}`. Voltar para 1920 × 1080 traz a célula de novo a 110 px.
  - **Valor inválido**: `localStorage.setItem('cruzadinha:board-size', '{"cellSize":999}')` abre no padrão sem erro.

**Checkpoint**: US1 e US2 funcionam juntas, e o tamanho do tabuleiro persiste.

---

## Phase 5: User Story 3 - Biblioteca mais larga e redimensionável no computador (Priority: P2)

**Goal**: no computador, o calendário fica até 1600 px no ajuste automático, com dias, números e textos que crescem com a largura dele. A pessoa arrasta a borda direita ou o canto inferior direito entre 720 e 1600 px (ou a largura disponível). A escolha fica no navegador, e o clique duplo volta ao automático. O celular não muda.

**Independent Test**: em 1920 × 1080, medir o calendário no automático, arrastar até o mínimo, recarregar e conferir 720 px; em 360 px, as medidas são as da feature 010.

### Tests for User Story 3 ⚠️

- [X] T026 [P] [US3] Criar `apps/web/src/features/library/library-width.test.ts`:
  - `widthFromDrag({ startWidth, dx })` devolve `round(startWidth + 2·dx)`;
  - `clampWidth(value, available)` fica entre 720 e `min(1600, available)`; com disponível menor que 720, devolve o disponível;
  - `loadLibraryWidth`, `saveLibraryWidth` e `clearLibraryWidth` na chave `cruzadinha:library-width`, com valor `{"width": N}`;
  - leitura com JSON inválido, `"x"`, `719`, `1601`, `1000.5` ou armazenamento que lança exceção resulta em `null`.

  Regra do data-model: "`width` inteiro, 720 a 1600 (px de largura do calendário), inclusive".
- [X] T027 [P] [US3] Em `apps/web/src/features/library/LibraryPage.test.tsx`, acrescentar:
  - com `(min-width: 861px)` simulado, há um `slider` "Largura do calendário" com `aria-valuetext` terminando em ", automático" sem escolha;
  - → grava `{"width": N+40}` e define `--library-width` inline na página;
  - clique duplo remove a chave e o estilo inline;
  - uma chave guardada é aplicada ao abrir;
  - sem a media query (celular), não há alça e a chave é ignorada;
  - abrir sem a media query e com `{"width":1000}` guardado, depois passar a simulação para `(min-width: 861px)`: `--library-width` passa a valer e a chave continua igual;
  - a pegada de canto (`decorative`) não aparece na árvore de acessibilidade nem recebe foco com Tab;
  - os testes atuais da biblioteca continuam passando sem mudança.
- [X] T028 [US3] Antes de mudar o CSS, rodar na `main` atual e registrar como constantes esperadas em `apps/web/e2e/tamanhos.spec.ts`:
  - no bloco "biblioteca celular" (360 × 740, `hasTouch`), a largura do calendário e a altura de um dia;
  - a largura do calendário em 1920 × 1080 (`BASELINE_DESKTOP_WIDTH`, em torno de 1008 px).

  Depois, criar o bloco "biblioteca", em 1920 × 1080:
  - **Automático**: a largura do calendário fica ≥ 1,5 × `BASELINE_DESKTOP_WIDTH` e ≤ 1600 px. Num mês com seis semanas (procurar navegando para trás a partir do mês atual; se não houver mês navegável com seis linhas, `test.skip` com mensagem), a base da última linha fica ≤ 1080 com `scrollY = 0`.
  - **Arraste até o mínimo** (alça da borda direita): a largura fica em 720 px (±1), e o título e a legenda acompanham. Recarregar mantém 720 px.
  - **Arraste além do máximo**: a largura fica ≤ 1600 px.
  - **Pegada de canto**: o arraste também funciona.
  - **Restaurar**: o clique duplo volta ao automático.
  - **Teclado**: Tab até a alça, setas, Home e End.
  - **Rolagem horizontal**: em 861 px não há rolagem horizontal com 1600 px escolhido.
  - **Escolha preservada** (caso-limite "largura guardada maior que a janela"): com 1600 px escolhido em 1920 × 1080, mudar para 900 × 1080. O calendário usa a largura disponível e a chave continua `{"width":1600}`. Voltar para 1920 × 1080 traz de novo 1600 px.
  - **Texto no mínimo** (caso-limite "calendário estreitado até o mínimo"): com 720 px, em cada dia com situação visível, o texto da situação tem `scrollWidth ≤ clientWidth`, ou seja, não está cortado.

### Implementation for User Story 3

- [X] T029 [US3] Criar `apps/web/src/features/library/library-width.ts`:
  - `MIN_WIDTH = 720`, `MAX_WIDTH = 1600`, `KEYBOARD_STEP = 40`;
  - `widthFromDrag` e `clampWidth`;
  - `LIBRARY_WIDTH_KEY = 'cruzadinha:library-width'` e o schema `z.object({ width: z.number().int().min(720).max(1600) })`;
  - `loadLibraryWidth`, `saveLibraryWidth` e `clearLibraryWidth` via `apps/web/src/lib/storage.ts`, com o valor bruto como `unknown`;
  - faz T026 passar.
- [X] T030 [US3] Em `apps/web/src/features/library/LibraryPage.module.css`, dentro de `@media (min-width: 861px)`, trocar `max-width: var(--content-max)` por `max-width: var(--library-width, var(--library-max))`. Fora da media query, `--content-max` continua.
- [X] T031 [US3] Em `apps/web/src/features/library/Calendar.module.css`, acrescentar ao `.month` `position: relative; container-type: inline-size`. Dentro de `@media (min-width: 861px)` (research R10):
  - `.day` com `min-height: clamp(56px, min(calc(100cqi / 14), calc((100dvh - 400px) / 6)), 112px)` e `padding: 10px 12px`;
  - `.number` com `font-size: clamp(14px, 1.25cqi, 20px)`;
  - `.status` com `font-size: clamp(10.5px, 0.95cqi, 15px)`;
  - `.title` e `.weekday` proporcionalmente maiores.

  Fora da media query, nada muda.
- [X] T032 [US3] Em `apps/web/src/features/library/Calendar.tsx`, acrescentar a prop opcional `resizeHandle?: ReactNode`, renderizada dentro do `section` do mês (no fim, depois da tabela), para a alça ficar presa à borda direita dele
- [X] T033 [US3] Em `apps/web/src/features/library/LibraryPage.tsx`:
  - **Condição e estado**: `useMediaQuery('(min-width: 861px)')`. O estado da escolha é lido com `loadLibraryWidth()` quando a página monta com a condição verdadeira e lido de novo toda vez que ela passa de falsa para verdadeira. Enquanto a condição é falsa, a escolha é ignorada, mas nunca apagada (research R9).
  - **Espaço disponível**: medir com `ResizeObserver` a largura do pai do `.page` menos as margens. Sem medida, `max = 1600`.
  - **Largura aplicada**: com escolha, `style={{ '--library-width': \`${clampWidth(chosen, available) + 2 * gutter}px\` }}` no `.page`.
  - **Alça na borda**: passar ao `Calendar` uma `<ResizeHandle variant="edge">` presa à borda direita do mês, com:
    - `label="Largura do calendário"`;
    - `valueText` "Largura do calendário N de M", acrescido de ", automático" sem escolha;
    - `value` igual à largura atual do calendário, medida quando não há escolha;
    - `min=720`, `max=min(1600, disponível)`, `step=40`;
    - `fromDrag={({ startValue, dx }) => widthFromDrag({ startWidth: startValue, dx })}`;
    - `onChange` atualizando o estado, `onCommit` gravando com `saveLibraryWidth` e `onReset` chamando `clearLibraryWidth`.
  - **Pegada de canto**: uma segunda `<ResizeHandle variant="corner" decorative>` no canto inferior direito, só ponteiro e visual, com os mesmos `value`, `min`, `max`, `fromDrag`, `onChange`, `onCommit` e `onReset`.
  - Faz T027 passar.

**Checkpoint**: as três histórias funcionam e podem ser testadas de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T034 [P] Em `specs/010-front-basico/spec.md`, acrescentar ao FR-010 uma nota curta: no computador, a posição da dica ativa, a largura das dicas, o tamanho da célula, a alça de redimensionar e a rolagem passam a seguir a feature 011 (`specs/011-calendario-e-tamanho-tabuleiro/spec.md`, FR-001 a FR-014). O texto atual do FR-010 não é apagado.
- [X] T035 [P] Em `CLAUDE.md`, acrescentar à seção "Current state" um item da feature 011, no estilo dos outros, cobrindo:
  - bloco centralizado e barra da dica ativa com anterior e próxima;
  - dicas em `--clues-width`;
  - padrão "cabe inteiro na janela";
  - `ResizeHandle` (`role="slider"`, ponteiro, teclado, clique duplo) no tabuleiro (30 a 110 px por célula, "Tamanho padrão" na barra, `cruzadinha:board-size`) e no calendário (720 a 1600 px, `cruzadinha:library-width`, dias em `cqi`);
  - `useDesktopLayout` como condição única.

  Mencionar `components/ResizeHandle` na lista de componentes genéricos de "Architecture".
- [X] T036 [P] Em `apps/web/src/test/tokens-contrast.test.ts`, conferir que os pares usados pelos elementos novos atendem 3:1 para controles e 4,5:1 para texto nos dois temas, e acrescentar os que faltarem:
  - alça em repouso (`--mute`) sobre `--bg` e sobre `--surface`;
  - alça em foco (`--accent`) sobre `--bg` e sobre `--surface`;
  - botões ‹ › (`--ink`) sobre `--word`;
  - "Tamanho padrão" (`--accent`) sobre `--surface`.
- [X] T037 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck` e `npm test` na raiz, e depois `npm run test:e2e -w @cruzadinha/web` com a API e o Postgres locais. Corrigir o que falhar.
- [X] T038 Seguir o roteiro manual de `specs/011-calendario-e-tamanho-tabuleiro/quickstart.md` (passos 1 a 11, nos dois temas) e registrar no PR qualquer desvio encontrado

---

## Phase 7: Ajustes depois da implementação (FR-003, FR-023 a FR-027)

**Purpose**: ajustes pedidos olhando o site com cruzadas reais (Clarifications, sessão 2026-10-15). Valem em todas as telas, exceto onde dito; o layout do celular não muda (FR-013, FR-017).

- [X] T039 [P] FR-003: em `apps/web/src/features/game/GamePage.module.css`, `.desktop .clues` com `contain: size`, para a coluna de dicas ter a altura do tabuleiro e não esticar o bloco além da janela (a página rolava ao entrar). Em `apps/web/src/features/game/ClueList.tsx`, a rolagem até a dica ativa desconta o título fixo do grupo (a borda de baixo do `h2` mais a margem), com teste de regressão em `ClueList.test.tsx` ("não deixa a dica ativa escondida sob o título fixo do grupo"), escrito antes e visto falhando
- [X] T040 [P] FR-023: em `apps/web/src/features/game/ClueList.module.css`, `.clue` em `display: block` (a segunda linha volta para baixo do número), texto de 16 px (17 px em `.fill`), `.number` em negrito, na cor herdada, com `margin-right: 0.35em` e `::after { content: '.' }`; `.heading` com 14 px, negrito e `--ink`
- [X] T041 [P] FR-024: em `apps/web/src/features/game/Cell.module.css`, letra com `font-size: calc(var(--cell-size) * 0.7)` numa `span.letter` (`line-height: 1`, `text-box: trim-both cap alphabetic`, `translate: 0 calc(var(--cell-size) * 0.06)`) e `.number` com peso 700; em `Cell.tsx`, a classe `letter`; em `apps/web/src/features/game/Board.module.css`, as quatro células dos cantos com raio `calc(var(--radius-sm) - 2px)`
- [X] T042 FR-025: em `apps/web/src/themes/global.css`, `scrollbar-color: var(--scrollbar) transparent` no `:root`, `scrollbar-width: thin` em `*` e, em `@supports not (scrollbar-color: auto)`, os pseudo-elementos `::-webkit-scrollbar*` com as mesmas cores (Safari). Token `--scrollbar` em `light.css` e `dark.css` com contraste de pelo menos 3:1 sobre `--bg` e `--surface`, conferido em `apps/web/src/test/tokens-contrast.test.ts`
- [X] T043 FR-026: em `apps/web/src/features/game/Board.tsx`, Tab e Shift+Tab sempre chamam `nextWord`/`previousWord` (a volta é de `stepWord`); Esc liga um `ref` que deixa o próximo Tab sair; outra tecla ou `blur` desliga; a grade ganha `aria-describedby` para um `<p hidden>` com "Tab e Shift+Tab mudam de palavra. Para sair do tabuleiro, aperte Esc e depois Tab.". Testes em `Board.test.tsx` (volta nas pontas, Esc nos dois sentidos, Esc cancelado por outra tecla, descrição) escritos antes e vistos falhando; os dois testes antigos de "sai nas pontas" passam a esperar a volta. Regra 4 de `docs/design.md` atualizada
- [X] T044 SC-009 com FR-026: em `apps/web/e2e/tamanhos.spec.ts`, teste que, com o foco no tabuleiro, Tab continua no tabuleiro e Esc seguido de Tab leva o foco à alça "Tamanho do tabuleiro"
- [X] T045 Documentação: `plan.md` e `research.md` (R1) passam a dizer que o layout do celular não muda e que FR-023 a FR-027 valem em todas as telas; `quickstart.md` ganha o passo da regra do Tab e corrige o caminho até a alça; `contracts/ui-contracts.md` ganha a seção "Tabuleiro: teclado e aparência"; `CLAUDE.md` atualiza o item da feature 011; a nota no FR-010 de `specs/010-front-basico/spec.md` passa a citar também FR-023 a FR-027 da feature 011
- [X] T046 FR-027: em `apps/web/src/game-logic/reducer.ts`, ações `delete` (apaga a letra da célula selecionada sem mover; ignora célula vazia ou travada; tira a marca `wrong`), `wordStart` e `wordEnd` (primeira e última célula de `activeWord`, sem mudar a direção); em `Board.tsx`, Delete, Home e End com `preventDefault` (Home e End não rolam a página), mapeados em `board-keys.ts`. Testes em `reducer.test.ts` e `Board.test.tsx`, escritos antes e vistos falhando. Regras 3 e 4 de `docs/design.md` atualizadas. A descrição da grade (FR-026) passa a citar também Delete, Home e End
- [X] T047 Rodar de novo `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e -w @cruzadinha/web`. Localmente, o e2e pode rodar num banco à parte (`cruzadinha_e2e`) com uma API própria, para não apagar os dados do banco de desenvolvimento

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup. T002 e T003 bloqueiam US1 e US2; T004 e T005 (`ResizeHandle`) bloqueiam US2 e US3.
- **US1 (Phase 3)**: depende de T001 a T003.
- **US2 (Phase 4)**: depende da US1, porque compartilha `board-size.ts`, `useBoardSize.ts`, `GamePage.tsx` e `GamePage.test.tsx`, e de T005.
- **US3 (Phase 5)**: depende só de T001 e T005, e pode correr em paralelo com US1 e US2.
- **Polish (Phase 6)**: depois das histórias desejadas.

### Within Each User Story

- Testes primeiro, falhando, e depois a implementação.
- US1: o bloco "celular" de T017 é escrito e roda primeiro, antes de qualquer mudança, para registrar as medidas de referência. Depois: T010 → T011 → T015 → T016; T012, T013 e T014 em paralelo antes de T015; o resto de T017 por último.
- US2: T020 → T021 → T024; T022 e T023 em paralelo; T025 por último.
- US3: T028 começa registrando as medidas do celular antes de T030 e T031; T029 → T033; T030, T031 e T032 em paralelo.

### Parallel Opportunities

- T002 e T004 (testes da Foundational, arquivos diferentes).
- T006, T007 e T008; T012, T013 e T014.
- T022 e T023.
- T026 e T027; T030, T031 e T032.
- Toda a US3 em paralelo com US1 e US2, depois de T005.
- T034, T035 e T036.

---

## Parallel Example: User Story 1

```text
# Testes de US1 juntos:
Task: "T006 board-size.test.ts (cellFor, fitCellSize, maxCellSize)"
Task: "T007 ClueBar.test.tsx (botões anterior e próxima)"
Task: "T008 ClueList.test.tsx (rolagem só do grupo ativo)"

# Componentes de US1 juntos, depois de T010 e T011:
Task: "T012 Board.tsx prop cellSize"
Task: "T013 ClueBar.tsx onPrevious/onNext"
Task: "T014 ClueList.tsx contêiner rolável e fill"
```

## Parallel Example: User Story 3 (independente, depois de T005)

```text
Task: "T026 library-width.test.ts"
Task: "T027 LibraryPage.test.tsx (alça e preferência)"
# depois:
Task: "T030 LibraryPage.module.css --library-width"
Task: "T031 Calendar.module.css dias em cqi"
Task: "T032 Calendar.tsx prop resizeHandle"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 (T001) e as tarefas T002 e T003 da Fase 2.
2. Fase 3 (US1): bloco centralizado, barra acima do tabuleiro e padrão "cabe inteiro".
3. **Parar e validar** com T017 e os passos 1, 2 e 9 do quickstart. Esta etapa resolve a queixa principal.

### Incremental Delivery

1. US1, o MVP, resolve o tabuleiro que parece pequeno.
2. T004 e T005 (`ResizeHandle`) e depois US2, com a alça e a preferência do tabuleiro.
3. US3, com a biblioteca larga e redimensionável, que pode entrar antes de US2, logo depois de T005.
4. Polish: documentação, contraste, CI verde e roteiro manual.

---

## Notes

- Nenhuma tarefa toca a API, o banco ou `packages/shared`.
- O celular (até 860 px ou com teclado na tela) não pode mudar: T017, T019, T027 e T028 garantem isso. As medidas de referência do celular (T017 e T028) são registradas antes de qualquer mudança de CSS.
- O mockup (canvas "Cruzadinha 011 — tamanhos", versão 7) já mostra a alça do tabuleiro, o botão "Tamanho padrão" e a alça do calendário.
- Commits em inglês, Conventional Commits, escopo `web` (por exemplo `feat(web): add resizable board handle`).

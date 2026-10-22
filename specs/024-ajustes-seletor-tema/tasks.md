---

description: "Task list for feature 024: ajustes de layout e animação nas configurações e no botão de tema"
---

# Tasks: Ajustes de layout e animação nas configurações e no botão de tema

**Input**: Design documents from `/specs/024-ajustes-seletor-tema/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios. A spec mede caixas e posições (SC-001 a SC-006) e acessibilidade (SC-007). O jsdom não faz layout: as regras puras e a estrutura vão em Vitest; as medidas, em Playwright (Chromium) contra o build de produção. O teste de cada história vem antes da implementação e precisa falhar primeiro.

**Organization**: uma fase por história da spec.

- US1 (balão da engrenagem) e US2 (botão de tema) são P1.
- US3 (modal alinhada) e US4 ("Sem limite" à direita) são P2.
- US5 (troca suave da cruzada padrão) é P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 a US5.
- Caminhos relativos à raiz do repositório. Só `apps/web` muda, mais `CLAUDE.md`, `docs/design.md` (se houver trecho afetado) e `specs/024-ajustes-seletor-tema/research.md` (resultado da T001). API, banco, `packages/shared` e `game-logic/` não mudam.

## Regras que valem para todas as tarefas

- Cores só por tokens (`var(--...)`), sem cor fixa. Nenhuma dependência nova.
- Valores exatos do plano: margem do balão **8 px**; transição do destaque **200 ms** (limite da spec: 100 a 300 ms); largura máxima da modal de configurações **460 px**; "Sem limite" na linha dos passos a partir de **400 px** de conteúdo (container query).
- Movimento reduzido (`prefers-reduced-motion: reduce`) zera qualquer transição nova.
- Os testes da feature 023 (`tokens-contrast.test.ts`, `components/button-states.test.ts`, `e2e/botoes.spec.ts`) continuam passando.
- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`.
- Os dois rótulos inativos do botão de tema ficam `aria-hidden` e `visibility: hidden`; o nome acessível não muda.

## Phase 1: Setup (medição inicial)

**Purpose**: fechar a dúvida sobre as setas da imagem 1 da issue e preparar o arquivo de e2e.

- [X] T001 Medir a modal de configurações em 320, 360, 420, 861 e 1280 px de largura, nos dois temas, com a API e o Postgres locais (veja `quickstart.md`): bordas direitas dos dois interruptores, borda esquerda de "Restaurar padrões" contra a margem das outras linhas, alturas e larguras dos botões do seletor. Anotar o resultado na seção 6 de `specs/024-ajustes-seletor-tema/research.md` ("O que a medição mostrou") como uma lista com uma linha por item medido: elemento, largura de tela, valor atual, valor esperado e se está alinhado. Cada item desalinhado vira uma correção citada pela T014; se nada estiver desalinhado, escrever isso na seção e dar a história 3 por cumprida só com o teste T013.
- [X] T002 Criar `apps/web/e2e/ajustes-configuracoes.spec.ts` com o `beforeEach(resetAndSeed)` de `configuracoes.spec.ts`, o helper `openSettings` e os helpers `box`, `expectNear`, `css` de `apps/web/e2e/support.ts`, e uma constante `WIDTHS = [320, 360, 861, 1920]`. Sem testes ainda.

---

## Phase 2: Foundational (bloqueante)

**Purpose**: a regra pura do deslocamento do balão, usada pela US1.

- [X] T003 [P] Criar `apps/web/src/components/tooltip-position.test.ts` com os casos de `clampShift(left, width, viewport, margin)`: cabe (devolve 0); estoura à direita (devolve valor negativo até `right = viewport - margin`); estoura à esquerda (devolve positivo até `left = margin`); largura maior que `viewport - 2 * margin` (alinha à esquerda, devolve o necessário para `left = margin`); `margin` padrão 8. Precisa falhar primeiro.
- [X] T004 Criar `apps/web/src/components/tooltip-position.ts` com `clampShift(left: number, width: number, viewport: number, margin = 8): number` pura, sem DOM, fazendo passar a T003.

**Checkpoint**: `cd apps/web && npx vitest run src/components/tooltip-position.test.ts` verde.

---

## Phase 3: User Story 1 - Ler o balão da engrenagem por inteiro (Priority: P1) 🎯 MVP

**Goal**: o balão de qualquer botão de ícone fica inteiro dentro da janela, inclusive o da engrenagem rente à borda direita.

**Independent Test**: focar a engrenagem em 320 a 1920 px e conferir que as bordas do balão ficam dentro da janela; o balão centralizado continua centralizado quando cabe.

### Tests for User Story 1

- [X] T005 [P] [US1] Em `apps/web/src/components/Tooltip.test.tsx`, adicionar testes: com `getBoundingClientRect` simulado estourando a borda direita, o balão aberto recebe `--tip-shift` negativo; cabendo, recebe `0px`; o balão mantém `data-tooltip` e `aria-hidden="true"`, abre só com mouse/foco (nunca toque) e fecha com Esc; com um `label` longo (60 caracteres) e uma janela estreita simulada, a caixa não passa de `max-width: calc(100vw - 16px)` e o texto quebra em linhas. Precisa falhar primeiro.
- [X] T006 [US1] Em `apps/web/e2e/ajustes-configuracoes.spec.ts`, adicionar o teste "balão da engrenagem dentro da janela": para cada largura de `WIDTHS`, `page.setViewportSize`, focar a engrenagem e conferir `left >= 8` e `right <= largura - 8` da caixa de `[data-tooltip]`; repetir com a rota do `ServerWake` simulada (resposta lenta de `/api/health`, como em `e2e/espera-servidor.spec.ts`) para cobrir "Acordando o servidor", caso que é o que precisa falhar primeiro (a engrenagem sozinha à direita) e que confirma ou refuta a hipótese de causa da spec (se o estado normal também falhar, registrar na seção 6 do `research.md`); em 1920 px, o centro do balão da engrenagem coincide com o centro do botão (tolerância 1 px) só se couber, e o do botão de tema (modal, `placement="above"`) continua centralizado (`expectNear`). Precisa falhar primeiro em 320 e 360 px no estado "Acordando o servidor".

### Implementation for User Story 1

- [X] T007 [US1] Em `apps/web/src/components/Tooltip.tsx`, medir o balão ao abrir: `useLayoutEffect` (dependências `open` e `label`) lê o `getBoundingClientRect()` do `[data-tooltip]` com `translate` sem deslocamento, calcula `clampShift` com `document.documentElement.clientWidth` e grava `--tip-shift` (em px) no estilo do balão; um `resize` com o balão aberto recalcula; ao fechar, zera. Sem estado que dispare novo `useLayoutEffect` em laço.
- [X] T008 [US1] Em `apps/web/src/components/Tooltip.module.css`, usar `translate: calc(-50% + var(--tip-shift, 0px)) 0`, `width: max-content` e `max-width: calc(100vw - 16px)`, trocar `white-space: nowrap` por `white-space: normal` (o texto só quebra quando a janela não comporta), mantendo `pointer-events: none` e `z-index: 60`.

**Checkpoint**: T005 e T006 verdes; o balão da engrenagem lê-se por inteiro em 320 px.

---

## Phase 4: User Story 2 - Botão de tema com o mesmo tamanho nos três estados (Priority: P1)

**Goal**: o botão de tema tem a mesma largura e altura em automático, claro e escuro, e nada em volta se mexe.

**Independent Test**: medir a caixa do botão e dos vizinhos na linha "Tema" nos três estados, nas larguras de desktop e celular, nos dois temas.

### Tests for User Story 2

- [X] T009 [P] [US2] Em `apps/web/src/themes/ThemeButton.test.tsx`, adicionar testes: os três rótulos (Automático, Claro, Escuro) existem no botão, só o do estado atual sem `aria-hidden`; o nome acessível continua `Tema: <estado>. Mudar para <próximo>`; ao clicar, o anúncio de `role="status"` continua dizendo o novo tema. Ajustar buscas por texto que passem a achar rótulos duplicados para `getByRole`. Precisa falhar primeiro.
- [X] T010 [US2] Em `apps/web/e2e/ajustes-configuracoes.spec.ts`, adicionar o teste "botão de tema com tamanho fixo": em 1280 e 360 px, nos dois temas (`page.emulateMedia({ colorScheme })` mais o próprio botão), clicar três vezes e comparar largura e altura do botão (`expectNear` com tolerância 0) e a caixa do vizinho (rótulo "Tema" e o texto de ajuda da linha, tolerância 1 px). Precisa falhar primeiro.

### Implementation for User Story 2

- [X] T011 [US2] Em `apps/web/src/themes/ThemeButton.tsx`, trocar o `<span aria-hidden="true">{themeLabel(theme)}</span>` por um contêiner `styles.label` com os três rótulos (`themeLabel('auto')`, `themeLabel('light')`, `themeLabel('dark')`), cada um num `<span>` com `aria-hidden="true"` e `data-active` no do tema atual; o tema atual continua o único visível na tela.
- [X] T012 [US2] Em `apps/web/src/themes/ThemeButton.module.css`, criar `.label { display: grid }` com `.label > span { grid-area: 1 / 1 }` e `.label > span:not([data-active]) { visibility: hidden }`, de modo que a largura seja a do rótulo mais largo; sem largura fixa em px. A animação do ícone (`icon-in`) e o movimento reduzido ficam como estão.

**Checkpoint**: T009 e T010 verdes; as animações do botão continuam como na feature 021.

---

## Phase 5: User Story 3 - Modal alinhada em qualquer tela (Priority: P2)

**Goal**: interruptores, "Restaurar padrões" e seletor da cruzada padrão alinhados às demais linhas da modal, sem texto cortado nem rolagem lateral, de 320 a 1920 px.

**Independent Test**: abrir a modal em 320 a 1920 px, nos dois temas, e medir bordas dos interruptores, margem de "Restaurar padrões" e alturas dos botões do seletor.

### Tests for User Story 3

- [X] T013 [US3] Em `apps/web/e2e/ajustes-configuracoes.spec.ts`, adicionar o teste "modal alinhada": (SC-004, SC-008) para cada largura de `WIDTHS` e nos dois temas, conferir que os dois interruptores têm a mesma largura e altura e a mesma borda direita (1 px) que a borda de conteúdo da modal; que a borda esquerda do texto de "Restaurar padrões" coincide com a das demais linhas (1 px); que os botões do seletor têm a mesma altura e a mesma largura entre si; que `scrollWidth <= clientWidth` do diálogo (sem rolagem lateral); e axe sem violações. Incluir o caso de nome de fonte longo trocando o texto de um botão por `page.route`/`locator.evaluate`, e o equivalente a zoom de 200 % numa janela de 1280 px, que é uma largura de 640 px de CSS. Precisa falhar primeiro onde a T001 achou desalinhamento.

### Implementation for User Story 3

- [X] T014 [US3] Em `apps/web/src/features/settings/SettingsDialog.module.css`, corrigir cada item desalinhado listado na seção 6 do `research.md` (T001), com estas correções já definidas além delas: `.switch`, `.row` e `.footer` com a mesma borda; "Restaurar padrões" (`Button variant="quiet"`) com margem inicial negativa igual ao `padding` do tipo (18 px, `apps/web/src/components/Button.module.css`) para o texto alinhar à margem; `.segment` em grade de colunas iguais (`display: grid; grid-auto-flow: column; grid-auto-columns: 1fr`) e `.segmentButton` com `min-width: 0`, `overflow-wrap: anywhere` e `line-height` que permita quebra sem desalinhar a altura (`min-height: var(--tap)`, `height: 100%`). Atualizar `SettingsDialog.tsx` só se a medição pedir mudança de estrutura.

**Checkpoint**: T013 verde nas quatro larguras e nos dois temas.

---

## Phase 6: User Story 4 - "Sem limite" à direita em telas maiores (Priority: P2)

**Goal**: em cada ajuda, "Sem limite" fica na mesma linha dos passos, no canto direito, quando a modal comporta; senão desce para uma linha própria, à esquerda.

**Independent Test**: abrir a modal em desktop e comparar a borda direita de "Sem limite" nas duas ajudas com a borda de conteúdo; em 360 px, conferir que desce sem sair da modal.

**Depende da T014** (mesmo arquivo CSS).

### Tests for User Story 4

- [X] T015 [US4] Em `apps/web/e2e/ajustes-configuracoes.spec.ts`, adicionar o teste "Sem limite à direita": em 1280 px, a borda direita da caixa "Sem limite" fica a no máximo 1 px da borda de conteúdo nas ajudas de letras e de palavras, na mesma linha (mesmo `y` central) que os passos − e +; em 360 px, "Sem limite" fica abaixo dos passos, com a borda esquerda igual à do nome; marcar e desmarcar a caixa não muda a posição (1 px) do nome, de − e + nem do valor. Precisa falhar primeiro.

### Implementation for User Story 4

- [X] T016 [US4] Em `apps/web/src/features/settings/SettingsDialog.module.css`, tornar `.body` um contêiner (`container-type: inline-size`) e, em `.limit`, usar `@container (min-width: 400px)` para ficar sem quebra de linha com `.check { margin-inline-start: auto }`; abaixo disso, `.check { flex-basis: 100% }` (linha própria, à esquerda, como hoje). Sem mudar a ordem no DOM (nome, passos, caixa).
- [X] T017 [US4] Em `apps/web/src/components/Dialog.tsx`, `apps/web/src/components/Dialog.module.css` e `apps/web/src/features/settings/SettingsDialog.tsx`, permitir a largura máxima de 460 px só na modal de configurações: o `Dialog` ganha a prop opcional `size?: 'default' | 'wide'` (padrão `'default'`) que soma a classe `styles.wide` ao painel quando `'wide'`; em `Dialog.module.css`, declarar `.wide { max-width: 460px }` **depois** de `.panel`, no mesmo arquivo, para a ordem da cascata ser garantida; a modal de configurações passa `size="wide"`. As demais modais ficam em 420 px. Acrescentar a `apps/web/src/components/Dialog.test.tsx` um teste de que `size="wide"` aplica a classe de largura ao painel e de que, sem a prop, o painel não a tem.

**Checkpoint**: T015 verde; em 1280 px a linha da ajuda cabe sem quebrar (conteúdo de 412 px contra ≈ 378 px necessários).

---

## Phase 7: User Story 5 - Troca suave da cruzada padrão (Priority: P3)

**Goal**: o destaque do seletor desliza até a fonte escolhida em até 300 ms, sem animação com movimento reduzido.

**Independent Test**: trocar a cruzada padrão e conferir que o destaque se move em transição curta; repetir com movimento reduzido e conferir troca imediata.

**Depende da T014** (seletor em colunas iguais).

### Tests for User Story 5

- [X] T018 [P] [US5] Em `apps/web/src/features/settings/SettingsDialog.test.tsx`, adicionar testes de `SourcePicker`: com 2 e 3 fontes, o contêiner expõe `--i` igual ao índice da fonte marcada; escolher outra fonte chama `onChange` e atualiza `--i`; com 1 fonte não há `thumb`; com mais de 3 continua a lista de rádios. Precisa falhar primeiro.
- [X] T019 [US5] Em `apps/web/e2e/ajustes-configuracoes.spec.ts`, adicionar o teste "destaque desliza": ler o `transition-duration` do `thumb` (entre 100 e 300 ms), escolher a outra fonte e conferir que o `translate` calculado do `thumb` termina na caixa do botão escolhido; dois cliques rápidos em fontes diferentes terminam na última; com `page.emulateMedia({ reducedMotion: 'reduce' })`, `transition-duration` é `0s`; pelo teclado (Tab, Enter e Espaço) a troca é igual e o foco continua visível; num contexto com `hasTouch: true`, um `tap` troca a fonte do mesmo jeito; com `forcedColors: 'active'`, a fonte marcada se distingue da outra (o `thumb` tem borda visível). Precisa falhar primeiro.

### Implementation for User Story 5

- [X] T020 [US5] Em `apps/web/src/features/settings/SettingsDialog.tsx`, no ramo de até 3 fontes de `SourcePicker`, definir `style={{ '--i': index, '--count': sources.length }}` no `role="group"` (índice da fonte marcada; `0` quando o valor não existir) e renderizar `<span className={styles.thumb} aria-hidden="true" />` antes dos botões apenas quando há 2 ou mais fontes. Tipar o estilo sem `any` (`CSSProperties & { '--i': number; '--count': number }`).
- [X] T021 [US5] Em `apps/web/src/features/settings/SettingsDialog.module.css`, estilizar `.thumb` (posição absoluta com `top: 4px; left: 4px; height: calc(100% - 8px)` (o padding do trilho, para o primeiro botão e o destaque coincidirem), largura `calc((100% - 8px - 4px * (var(--count) - 1)) / var(--count))`, fundo `var(--surface)`, `border: 1px solid transparent` para aparecer em cores forçadas, sombra e raio já usados no botão marcado) com `translate: calc(var(--i) * (100% + 4px)) 0` e `transition: translate 200ms cubic-bezier(0.2, 0.8, 0.2, 1)`; tirar o fundo e a sombra de `.segmentButton[aria-pressed='true']` (fica só a cor do texto) e dar `position: relative` ao trilho, com os botões acima do `thumb`; `@media (prefers-reduced-motion: reduce) { .thumb { transition: none } }`. A sobreposição de hover/pressed da feature 023 continua em `.segmentButton`.

**Checkpoint**: T018 e T019 verdes.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T022 [P] Atualizar `CLAUDE.md` com o item "Feature 024 (ajustes de layout e animação nas configurações e no botão de tema) changed only `apps/web`", no mesmo estilo e tamanho dos itens das features anteriores, descrevendo `clampShift`/`--tip-shift`, os rótulos empilhados do `ThemeButton`, o container query de 400 px, a largura de 460 px da modal e o `thumb` do seletor.
- [X] T023 [P] Atualizar `docs/design.md` onde descreve o balão, o botão de tema e a modal de configurações, se houver trecho afetado (conferir com `grep -n "balão\|Tooltip\|tema\|Cruzada padrão" docs/design.md`); sem trecho afetado, nada a fazer.
- [X] T024 Rodar `npm run format:check && npm run lint && npm run typecheck && npm test` na raiz e corrigir o que falhar.
- [X] T025 Rodar `npm run test:e2e -w @cruzadinha/web` completo (inclui `botoes.spec.ts`, `configuracoes.spec.ts`, `sem-saltos.spec.ts` e o novo arquivo) e conferir os cenários do `quickstart.md` à mão em 360 e 1280 px, nos dois temas.
- [X] T026 Commits em inglês, Conventional Commits, sem atribuição de IA (regra do `CLAUDE.md`): `fix(web)` para os cinco ajustes (a issue os trata como defeitos; o release-please dá bump de patch só no site), com o teste de cada história no mesmo commit ou antes dele em `test(web)`, e `docs` para `CLAUDE.md` e `docs/design.md`. Branch e PR seguem `.claude/rules/git-conventions.md`.

---

## Dependencies & Execution Order

- **Phase 1** (T001, T002) não depende de nada; T001 alimenta a T014.
- **Phase 2** (T003, T004) bloqueia só a US1.
- **US1** e **US2** são independentes entre si e podem andar juntas (arquivos diferentes), mas compartilham `ajustes-configuracoes.spec.ts` (as tarefas de e2e (T006, T010, T013, T015, T019) editam o mesmo arquivo e não têm `[P]`).
- **US3 → US4 → US5**: as três mexem em `SettingsDialog.module.css` (e `SettingsDialog.tsx`), então vão em sequência: T014, depois T016/T017, depois T020/T021.
- **Polish** só depois de todas as histórias.

### Parallel opportunities

- T003 junto com T001 e T002.
- Só as tarefas de arquivos diferentes têm `[P]`: T005 (unit do balão), T009 (unit do botão de tema) e T018 (unit do seletor) rodam em paralelo; as de e2e editam o mesmo arquivo e vão em sequência.
- T022 e T023 em paralelo.

## Implementation Strategy

1. **MVP**: Phases 1, 2 e 3 (US1). Entrega o único defeito que impede ler algo.
2. **Incremento 2**: US2 (botão de tema), o salto mais visível.
3. **Incremento 3**: US3 e US4 (alinhamento da modal e "Sem limite").
4. **Incremento 4**: US5 (animação).
5. Cada fase termina com o checkpoint verde antes da próxima; Polish por último.

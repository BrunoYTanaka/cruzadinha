---

description: "Task list for feature 023: botões que parecem botões, distintos dos links"
---

# Tasks: Botões que parecem botões, distintos dos links

**Input**: Design documents from `/specs/023-design-botoes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios. A spec mede contraste (SC-001, SC-004), estados (SC-002), saltos de layout (SC-006) e classificação de link × botão (SC-003). Os testes vêm antes da implementação de cada fase e precisam falhar primeiro.

- **Vitest**: contraste dos tokens e regras lidas dos CSS. O jsdom não aplica o CSS dos módulos nem faz layout.
- **Playwright**: estados calculados, caixas, foco, toque, cores forçadas e axe, contra o build de produção.

**Organization**: uma fase por história da spec.

- US1 (reconhecer um botão) e US2 (estados) são P1.
- US3 (link × botão) é P2.
- US4 (consistência entre telas e temas) é P3.
- A fundação (tokens, camadas, `Button` com os quatro tipos) bloqueia todas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1, US2, US3, US4.
- Caminhos relativos à raiz do repositório. Só `apps/web` muda, mais a documentação. API, banco, `packages/shared` e `game-logic/` não mudam.

## Regras que valem para todas as tarefas

- **Valores exatamente como em data-model.md e research.md (R5)**:
  - `--control`: claro `#eef0f3`, escuro `#24272d`.
  - `--control-line`: claro `#80878f`, escuro `#6e7581`.
  - `--hover-overlay`: claro `rgb(28 31 36 / 0.08)`, escuro `rgb(236 238 242 / 0.10)`.
  - `--press-overlay`: claro `rgb(28 31 36 / 0.16)`, escuro `rgb(236 238 242 / 0.18)`.
  - Transição de 120 ms em `background-color`, `background-image`, `border-color`, `color` e `box-shadow`.
- **Estados**:
  - mouse por cima: `background-image: linear-gradient(var(--hover-overlay), var(--hover-overlay))`;
  - pressionado: o mesmo com `--press-overlay`;
  - regras `:hover` sempre dentro de `@media (hover: hover)`; regras `:active` fora da consulta;
  - todo seletor de estado exclui o desativado com `:not(:disabled, [aria-disabled='true'])`.
- **Cores**: sem cor fixa nos componentes, só tokens. A sombra já existente (`rgb(0 0 0 / …)`) fica como está.
- **Organização do CSS**:
  - classes compartilhadas de `Button.module.css` em `@layer components`;
  - regras de elemento de `global.css` em `@layer reset`;
  - `:focus-visible`, `[hidden]`, menos movimento e View Transition sem camada;
  - classes locais dos componentes sem camada, mudando só medidas e forma (largura, altura, `padding`, `font-size`, raio, sombra já existente), nunca cor ou estado.
- **Bibliotecas**: antes de escrever código que usa uma biblioteca, consultar a documentação atual pelo Context7 (constituição). Já confirmados no plano: `page.emulateMedia({ forcedColors })`, `hasTouch` e as consultas `hover` no Chromium headless, `locator.evaluate` com `getComputedStyle` (Playwright); Lightning CSS como minificador padrão (Vite 8).
- **Estilo**:
  - sem `any`;
  - comentários em português, no tom e densidade do código ao redor, citando a feature 023 onde mudam uma regra anterior;
  - Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- **Commits**: em inglês, Conventional Commits, escopo `web`, sem linha de coautoria nem atribuição a IA (CLAUDE.md).

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Na branch `feat/023-design-botoes`, rodar `npm run lint`, `npm run typecheck`, `npm test -w @cruzadinha/web` e `npm run build -w @cruzadinha/web`, e anotar que estão verdes. Subir o ambiente do e2e (banco separado e API própria, como em `specs/011-calendario-e-tamanho-tabuleiro/quickstart.md`) e rodar `npm run test:e2e -w @cruzadinha/web -- sem-saltos configuracoes visitante` para ter a linha de base verde.
- [X] T002 Depois de T001 (que usa `sem-saltos.spec.ts` como linha de base), mover os helpers de medida `box`, `expectNear`, `css` e `probe` de `apps/web/e2e/sem-saltos.spec.ts` para `apps/web/e2e/support.ts`, exportados e sem mudar o comportamento, e importá-los de volta em `sem-saltos.spec.ts`. Rodar `sem-saltos` de novo: deve continuar verde.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tokens, camadas e o `Button` com os quatro tipos, de que todas as histórias dependem.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes da fundação (escrever antes, devem falhar)

- [X] T003 [P] (Feito reaproveitando `apps/web/src/test/tokens-contrast.test.ts`, que já tinha `contrast` e a leitura dos temas: ganhou `readOverlays` e `blend`. O arquivo novo não foi criado, para não duplicar.) Criar `apps/web/src/test/contrast.ts` com funções puras:
  - `parseHex(hex)`;
  - `relativeLuminance(rgb)` (fórmula WCAG 2.x);
  - `contrastRatio(a, b)`;
  - `blend(overlay: { rgb; alpha }, base)`;
  - `readThemeTokens(css: string, selector: ':root' | ":root[data-theme='dark']")`, que devolve um `Record<string, string>` com as declarações `--nome: valor` do bloco.

  Sem dependência nova.
- [X] T004 [P] (Feito como o `describe('estados dos botões')` em `apps/web/src/test/tokens-contrast.test.ts`.) Criar `apps/web/src/themes/contrast.test.ts`, que lê `light.css` (bloco `:root`) e `dark.css` (bloco `:root[data-theme='dark']`) e confere, nos dois temas, a tabela de research.md R5:
  - `--control-line` × `--bg` e × `--surface` ≥ 3;
  - `--ink` sobre `--control`, `--surface`, `--bg`, `--pill`, sozinho e misturado com `--hover-overlay` e com `--press-overlay`, ≥ 4,5;
  - `--ink` sobre `--word` misturado com `--press-overlay` ≥ 3;
  - `--accent-ink` sobre `--accent` sozinho e com as duas sobreposições ≥ 4,5;
  - `--accent` × `--bg` e × `--surface` ≥ 4,5.

  Confere também que os dois blocos de `dark.css` (o da `@media` e o de `[data-theme='dark']`) têm os mesmos quatro tokens novos com os mesmos valores. Deve falhar: os tokens não existem.
- [X] T005 [P] Criar `apps/web/src/components/Button.test.tsx` (Vitest + Testing Library, helper `render` de `src/test/`):
  - `buttonClass()` sem opções contém as classes `button` e `secondary`;
  - cada `variant` (`primary`, `secondary`, `quiet`, `icon`) gera a sua classe;
  - `size: 'small'` acrescenta `small`;
  - `block: true` acrescenta `block`;
  - `<Button>` renderiza `type="button"` por padrão e repassa `className` depois das classes do tipo.

  Deve falhar: `buttonClass`, `secondary`, `quiet`, `icon` e `small` não existem. Os nomes de classe vêm do objeto do CSS Module; o Vitest do projeto já os resolve.

### Implementação da fundação

- [X] T006 Em `apps/web/src/themes/light.css` e nos dois blocos de `apps/web/src/themes/dark.css`, acrescentar `--control`, `--control-line`, `--hover-overlay` e `--press-overlay` com os valores das regras acima, num grupo "controles" junto de `--pill` e `--scrollbar`. No comentário de cabeçalho de `apps/web/src/themes/tokens.css`, acrescentar os quatro nomes à linha "controles". Com isso T004 passa.
- [X] T007 Em `apps/web/src/themes/global.css`:
  - pôr no topo `@layer reset, components;`;
  - mover para dentro de `@layer reset { … }` as regras de elemento: `*, *::before, *::after`, `html`, `body`, `button, input`, `button`, `button:disabled, button[aria-disabled='true']`, `a`, `h1, h2, h3`.

  Ficam fora de camada: `:root` da barra de rolagem, `* { scrollbar-width }`, o bloco `@supports` do WebKit, `[hidden]`, `:focus-visible`, a View Transition e a regra de `prefers-reduced-motion`. O comentário explica em uma ou duas linhas por que as camadas existem (research.md R2).
- [X] T008 Reescrever `apps/web/src/components/Button.module.css`. Começa por `@layer reset, components;`, com tudo dentro de `@layer components { … }`:
  - **`.button`**:
    - mantém o que tem hoje (`inline-flex`, `gap: 8px`, `min-height: var(--tap)`, `padding: 0 18px`, `border-radius: var(--radius-md)`, `font-size: 15px`, `font-weight: 500`);
    - acrescenta `border: 1px solid transparent`, `text-decoration: none` e a transição das regras acima;
    - repete `cursor: pointer`, para um link com `buttonClass` ter o mesmo cursor.
  - **`.primary`**: `background: var(--accent)`, `border-color: var(--accent)`, `color: var(--accent-ink)`.
  - **`.secondary`**: `background: var(--control)`, `border-color: var(--control-line)`, `color: var(--ink)`.
  - **`.quiet`**: `background: transparent`, `border-color: var(--control-line)`, `color: var(--ink)`.
  - **`.icon`**: `background: transparent`, `border-color: transparent`, `color: var(--ink)`, `padding: 0`.
  - **`.small`**: `padding: 0 14px`, `border-radius: var(--radius-sm)`, `font-size: 13px`, `white-space: nowrap`.
  - **`.block`**: sem mudança.
  - **Desativado**: `.button:disabled, .button[aria-disabled='true']` com `opacity: 0.6` e `cursor: not-allowed`.

  Os estados entram em T015 (US2).
- [X] T009 Em `apps/web/src/components/Button.tsx`:
  - exportar `type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'icon'` e `type ButtonSize = 'regular' | 'small'`;
  - exportar `buttonClass({ variant = 'secondary', size = 'regular', block = false } = {}): string`, que junta `styles.button`, `styles[variant]`, `styles.small` quando `size === 'small'` e `styles.block`;
  - fazer `Button` usar `buttonClass` e acrescentar `className` no fim.

  Com isso T005 passa.
- [X] T010 Trocar os usos dos nomes antigos, guiado por `npm run typecheck -w @cruzadinha/web`:
  - `variant="ghost"` → `variant="quiet"` em `apps/web/src/app/AppLayout.tsx` ("Sair"), `apps/web/src/components/Notice.tsx` (dispensar) e `apps/web/src/features/settings/SettingsDialog.tsx` ("Restaurar padrões");
  - os ‹ › de `apps/web/src/features/library/Calendar.tsx` também eram `ghost` (não previsto no inventário) e passaram a secundário, sem `variant`;
  - `variant={otherSource ? 'default' : 'primary'}` → `'secondary'` em `apps/web/src/features/game/CompletionDialog.tsx`;
  - no mesmo arquivo, o link "Jogar … deste dia" passa a usar `className={\`${buttonClass({ variant: 'primary', block: true })} ${styles.link}\`}` e o import `buttonStyles` sai.

  Rodar `npm run typecheck`, `npm test -w @cruzadinha/web` e `npm run build -w @cruzadinha/web`: verdes.

**Checkpoint**: tokens, camadas e tipos prontos. O site já mostra contorno no secundário e no discreto.

---

## Phase 3: User Story 1 — Reconhecer um botão à primeira vista (Priority: P1) 🎯 MVP

**Goal**: todo botão de texto tem limite visível em repouso (≥ 3:1), e "Restaurar padrões" parece um botão.

**Independent Test**: abrir cada tela e modal nos dois temas e conferir o contorno de cada botão de texto. No e2e, a `border-color` calculada é igual à de `--control-line` (ou à de `--accent` no principal) e há no máximo um principal por grupo.

### Testes da US1 (escrever antes, devem falhar)

- [X] T011 [US1] Criar `apps/web/e2e/botoes.spec.ts` com o `describe('023 US1')`. Usar `resetAndSeed`, `login`, `brasiliaToday`, e `box`, `expectNear` e `css` de `support.ts`. Criar um helper local `tokenColor(page, name)` que pinta um elemento de prova com `color: var(name)` e devolve a cor calculada (como `probe` em `sem-saltos.spec.ts`). Nos temas claro e escuro (`data-theme` escolhido pelo botão de tema da modal ou `page.emulateMedia({ colorScheme })`), conferir:
  1. na modal de configurações, o botão "Restaurar padrões" tem `border-top-style: solid`, `border-top-width` 1 px e `border-top-color` igual a `tokenColor('--control-line')`;
  2. os botões − e + e o botão de tema da modal têm a mesma cor de borda;
  3. na biblioteca, ‹ e › do calendário têm `background-color` igual a `tokenColor('--control')` e a mesma borda;
  4. no jogo, as três ajudas (pílulas) têm a borda `--control-line`;
  5. "Sair" no cabeçalho (com conta) tem a borda `--control-line`;
  6. na tela de entrar, na de cadastro, na modal de conclusão e na modal de nova entrada, há no máximo um botão ou link com a classe do principal visível em cada `form` ou `[role="dialog"]` (contar pelo `background-color` igual a `tokenColor('--accent')`). Para abrir a modal de nova entrada, seguir `ajudas-e-retomada.spec.ts`: com conta, no jogo, `context.clearCookies()`, digitar uma letra, esperar "Sua sessão expirou" e clicar em "Entrar de novo".

  Rodar: falham os itens 2 (− e + com a borda local `--line`; tema) e 4 (pílulas). Os itens 1, 3, 5 e 6 já passam pela fundação (T008, T010) e ficam como proteção contra regressão.

### Implementação da US1

- [X] T012 [P] [US1] Em `apps/web/src/components/Pill.tsx`, a pílula passa a `className={[buttonClass(), styles.pill, className ?? ''].join(' ').trim()}` (secundário). Em `apps/web/src/components/Pill.module.css`, a `.pill` fica só com a forma: `min-height: var(--tap)` (lido por `touch-targets.test.tsx`), `padding: 0 16px`, `border-radius: 999px`, `font-size: 14px`, `font-weight: 700`, `font-variant-numeric: tabular-nums` e `white-space: nowrap`. Saem `border`, `background`, `color` e a regra de desativado, que o tipo já cobre. O fundo das ajudas passa de `--pill` para `--control`, com a borda `--control-line`.
- [X] T013 [P] [US1] Em `apps/web/src/themes/ThemeButton.tsx`, o botão passa a `className={\`${buttonClass()} ${styles.button}\`}` (secundário). Em `ThemeButton.module.css`, `.button` fica só com a forma: `min-height: 48px`, `padding: 0 16px 0 12px`, `border-radius: 999px`, `gap: 8px`. Saem `border`, `background`, `color`, `font`, `font-weight` e `cursor`. `.icon`, `.fill` e a animação não mudam.
- [X] T014 [P] [US1] Em `apps/web/src/features/settings/SettingsDialog.tsx`, os botões − e + (`styles.step`) passam a ter `className={\`${buttonClass()} ${styles.step}\`}`. Em `SettingsDialog.module.css`, a `.step` fica só com as medidas (`width: var(--tap)`, `height: var(--tap)`, `padding: 0`, `font-size: 20px`) e perde `border`, `background`, `color`, `cursor` e a regra `.step:disabled`, que o tipo e o reset já cobrem. Conferir que "Restaurar padrões" já é `quiet` (T010). Rodar o `describe('023 US1')`: verde.

**Checkpoint**: US1 entregue. Botões de texto reconhecíveis nos dois temas.

---

## Phase 4: User Story 2 — Resposta ao mouse, ao pressionar e ao teclado (Priority: P1)

**Goal**: todo botão habilitado muda com o mouse e ao pressionar, sem salto; o foco continua inteiro; o desativado não reage; o toque não deixa estado preso; sem animação com menos movimento.

**Independent Test**: passar o mouse, pressionar e dar Tab em cada botão, nos dois temas, inclusive na engrenagem. Repetir num botão desativado e num contexto com toque.

### Testes da US2 (escrever antes, devem falhar)

- [X] T015 [US2] Criar `apps/web/src/components/button-states.test.ts` no estilo de `touch-targets.test.tsx` (lê o CSS como texto). Para cada par arquivo/seletor da lista abaixo, ele confere:
  - (a) existe uma regra com `${seletor}` e `:hover` dentro de um bloco `@media (hover: hover)`;
  - (b) existe uma regra com `${seletor}` e `:active` fora desse bloco;
  - (c) toda regra de `:hover` ou `:active` do seletor contém `:not(:disabled, [aria-disabled='true'])`;
  - (d) as regras de estado não contêm `#`, `rgb(` nem `hsl(`;
  - (e) as durações de `transition` no arquivo são ≤ 150 ms.

  A lista fica numa constante (`CONTROLS`) para a US4 acrescentar itens (T026). Na US2 ela tem um só item:

  ```text
  components/Button.module.css .button
  ```

  As isenções ficam noutra constante (`EXEMPT`), com o motivo, vazia por enquanto. Todo botão que usa `buttonClass` herda os estados de `.button` e não entra na lista: ícones, pílulas, tema, legenda, passos e "Tamanho padrão". Rodar: falha, porque `Button.module.css` ainda não tem estados.
- [X] T016 [US2] Em `apps/web/e2e/botoes.spec.ts`, acrescentar o `describe('023 US2')`, nos dois temas, para uma amostra por tela:
  - engrenagem;
  - fechar da modal;
  - "Restaurar padrões";
  - botão de pausa da barra do jogo (os estados do "Tamanho padrão" foram para o T020, porque ele só vira botão com tipo no T022);
  - setas da barra da dica (computador, 1280 × 800);
  - ‹ › do calendário;
  - ajuda "Letra";
  - "Entrar" (principal) na tela de entrar.

  Para cada um, conferir:
  1. o `background-image` em repouso é `none`; com `locator.hover()` é diferente de `none`; com `page.mouse.down()` sobre ele é diferente do de mouse por cima (depois, `mouse.up()` fora do botão para não clicar);
  2. `box()` igual (±1 px, `expectNear`) em repouso, com o mouse, pressionado e com foco, também para o vizinho imediato;
  3. depois de `focus()` pelo teclado (Tab até ele) com o mouse por cima, `outline-style` é `solid` e `outline-width` é `3px`;
  4. num desativado (−, com o limite em 0; "Tamanho padrão" no tamanho padrão; ajuda esgotada com o limite em 0 nas configurações), o `background-image` continua `none` com o mouse e pressionado, e o `cursor` é `not-allowed`;
  5. num `browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } })`, depois de `tap()` na engrenagem (fechar a modal) e numa ajuda, o `background-image` é `none`;
  6. com `page.emulateMedia({ reducedMotion: 'reduce' })`, o `transition-duration` calculado de um botão é ≤ `0.01ms`;
  7. com o mouse sobre a engrenagem, o tooltip "Configurações" fica visível e a sua caixa não fica coberta: `document.elementFromPoint` no centro do tooltip devolve o próprio tooltip.

  Rodar: o item 1 falha em todos os botões da amostra, porque `.button` ainda não tem estados (T018) e os de ícone ainda não usam o tipo (T017). O item 7 também falha. Os itens 2, 3, 4 e 6 podem já passar e ficam como proteção.

### Implementação da US2

- [X] T017 [P] [US2] Botões de ícone com `buttonClass({ variant: 'icon' })`, cada classe local ficando só com as medidas:
  - `apps/web/src/features/settings/SettingsButton.tsx`, com `.button` em `SettingsButton.module.css` ficando com `width`, `height` e o `svg`;
  - o botão de fechar em `apps/web/src/components/Dialog.tsx`, com `.close` em `Dialog.module.css` ficando com `flex: none`, `width`, `height` e o `svg`;
  - os botões e o link de voltar com `styles.iconButton` em `apps/web/src/features/game/Toolbar.tsx`, com `.iconButton` em `Toolbar.module.css` ficando com `display: grid`, `place-items: center`, `width`, `height` e `padding: 0`;
  - as setas `styles.step` em `apps/web/src/features/game/ClueBar.tsx`, com `.step` em `ClueBar.module.css` ficando com `display: grid`, `flex: none`, `place-items: center`, `width`, `height`, `padding: 0` e `border-radius: var(--radius-sm)`.

  Em `apps/web/src/components/touch-targets.test.tsx`, o seletor `Toolbar .iconButton` continua com `width` e `height` na classe local.
- [X] T018 [P] [US2] Estados compartilhados e legenda:
  - em `apps/web/src/components/Button.module.css`, dentro de `@layer components`:
    - `@media (hover: hover) { .button:not(:disabled, [aria-disabled='true']):hover { background-image: linear-gradient(var(--hover-overlay), var(--hover-overlay)) } }`;
    - `.button:not(:disabled, [aria-disabled='true']):active { background-image: linear-gradient(var(--press-overlay), var(--press-overlay)) }`;
  - em `apps/web/src/features/game/LegendButton.tsx`, o botão "?" passa a `className={\`${buttonClass({ variant: 'primary' })} ${styles.button}\`}`. Em `LegendButton.module.css`, `.button` fica só com a forma: `width: 44px`, `height: 44px` (lidos por `touch-targets.test.tsx`), `padding: 0`, `border-radius: 50%`, `font-size: 20px`, `font-weight: 700` e a `box-shadow` que já existe. Saem `border`, `background` e `color`.

  Em `apps/web/src/features/game/HelpButtons.module.css`, a regra `.help[aria-disabled='true']` continua igual, porque os estados já excluem `aria-disabled`.
- [X] T019 [US2] Rodar `button-states.test.ts`, o `describe('023 US2')`, `sem-saltos` e `touch-targets.test.tsx`: verdes. Corrigir o que faltar antes de seguir.

**Checkpoint**: US1 e US2 entregues. É o MVP da issue: botões reconhecíveis e com resposta visual.

---

## Phase 5: User Story 3 — Diferenciar link de botão (Priority: P2)

**Goal**: links de texto sublinhados e com estados, sem cara de botão; botões sem sublinhado e sem a cor de link; links que funcionam como cartão ou controle ganham os estados do tipo deles.

**Independent Test**: percorrer entrar, cadastro, biblioteca, jogo, configurações, conclusão, 404 e erro, e classificar cada elemento clicável só pela aparência.

### Testes da US3 (escrever antes, devem falhar)

- [X] T020 [US3] Em `apps/web/e2e/botoes.spec.ts`, acrescentar o `describe('023 US3')`:
  1. na tela de entrar, "Criar conta" e "Jogar sem entrar" têm `text-decoration-line` `underline` e `background-image` `none`; com `hover()`, o `text-decoration-thickness` aumenta (de `auto`/1 px para `2px`), sem fundo;
  2. em cada tela visitada (entrar, cadastro, biblioteca, jogo, modal de configurações, modal de conclusão, página não encontrada em `/nao-existe`, e a tela de erro forçada com `page.route('**/api/library**', (route) => route.fulfill({ status: 500 }))`), todo `button` visível tem `text-decoration-line` sem `underline` (a dica resolvida é riscada de propósito, feature 019) e, fora os de fundo `--accent`, `color` diferente de `tokenColor('--accent')`;
  3. "Tamanho padrão" (`BoardSizeReset`) tem `color` igual a `tokenColor('--ink')` e borda `--control-line` e, fora do tamanho padrão, os estados de `expectStates` (vindo do T016);
  4. "Entrar" do cabeçalho, como visitante, é um link (`a`) com borda `--control-line`, sem sublinhado, e ganha `background-image` com o mouse;
  5. com o mouse sobre um cartão "Hoje" e sobre um dia jogável do calendário, `border-color` igual a `tokenColor('--accent')`; pressionados, `background-image` diferente de `none`;
  6. o link de voltar da barra do jogo ganha `background-image` com o mouse, como os botões de ícone;
  7. a marca "Cruzadinha" do cabeçalho tem `color` igual a `tokenColor('--accent')` com o mouse;
  8. na página não encontrada, "Voltar à biblioteca" é link sublinhado; na tela de erro, "Tentar de novo" tem a borda `--control-line` e o fundo `--control`.

  Rodar: os itens 1, 2 ("Tamanho padrão"), 3, 4, 5 e 7 falham.

### Implementação da US3

- [X] T021 [US3] Em `apps/web/src/themes/global.css`, dentro de `@layer reset`, a regra `a` ganha:
  - `text-decoration-thickness: 1px`;
  - `@media (hover: hover) { a:hover { text-decoration-thickness: 2px } }`;
  - `a:active { color: var(--ink); text-decoration-thickness: 2px }`.

  Como as regras ficam em `reset`, um link com `buttonClass` (`text-decoration: none`, em `components`) não é afetado. Um link com cor própria fora de camada (`ReadModeBanner .link` em `--ok`, `.brand`) mantém a cor ao ser pressionado e só engrossa o sublinhado (Edge Cases da spec).
- [X] T022 [P] [US3] (Feito com `<Button size="small">` e o arquivo `BoardSizeReset.module.css` removido, porque ficava vazio.) Em `apps/web/src/features/game/BoardSizeReset.tsx`, o botão passa a `className={\`${buttonClass({ size: 'small' })} ${styles.reset}\`}`. Em `BoardSizeReset.module.css`, `.reset` fica vazia ou sai, junto com `.reset:disabled`. O texto deixa de usar `--accent`, e o desativado usa a opacidade do tipo.
- [X] T023 [P] [US3] Em `apps/web/src/app/AppLayout.tsx`, o link "Entrar" do visitante passa a `className={\`${buttonClass({ variant: 'quiet' })} ${styles.login}\`}`. Em `AppLayout.module.css`:
  - `.login` fica só com `padding: 0 12px`, se ainda for preciso;
  - `.brand` ganha `transition: color 120ms` e `@media (hover: hover) { .brand:hover { color: var(--accent) } }`.
- [X] T024 [P] [US3] Cartões e dias:
  - em `apps/web/src/features/library/TodayCards.module.css`, `.link:hover` passa para dentro de `@media (hover: hover)` como `.link:hover { border-color: var(--accent) }`, e entra `.link:active { background-image: linear-gradient(var(--press-overlay), var(--press-overlay)) }`; `.card` ganha a transição de 120 ms;
  - em `apps/web/src/features/library/Calendar.module.css`, as mesmas duas regras para `a.day`, e `.day` ganha a transição;
  - nos dois arquivos, `.today` e as cores de estado do dia (`completed`, `in_progress`, `fetchable`) não mudam;
  - em `Calendar.module.css`, sai a regra `.nav:disabled { opacity: 0.35 }`: ‹ › desativado usa os 0,6 do tipo (FR-011).
- [X] T025 [US3] Rodar o `describe('023 US3')`, `fontes.spec.ts` e `visitante.spec.ts`: verdes.

**Checkpoint**: link × botão distinguíveis em todas as telas.

---

## Phase 6: User Story 4 — Consistência entre telas e temas (Priority: P3)

**Goal**:

- os controles com estado próprio ganham os mesmos estados sem perder o selecionado;
- todo botão tem limite em cores forçadas;
- axe sem violações nos dois temas.

**Independent Test**: comparar botões do mesmo tipo entre telas, nos dois temas e em cores forçadas.

### Testes da US4 (escrever antes, devem falhar)

- [X] T026 [US4] Em `apps/web/e2e/botoes.spec.ts`, acrescentar o `describe('023 US4')`:
  1. com o mouse sobre a aba selecionada de `SourceTabs`, `box-shadow` (marca `--accent`) e `background-color` iguais aos de repouso, e `background-image` diferente de `none`; idem para o segmento com `aria-pressed="true"` e para a chave ligada (`aria-checked="true"`, `background-color` igual a `tokenColor('--accent')`) na modal de configurações;
  2. numa linha de dica sem destaque, com o mouse, `background-image` diferente de `none`; na linha ativa (`--word`), `background-color` igual ao de repouso com o mouse; a `box()` das linhas não muda (±1 px) entre repouso e mouse;
  3. com `page.emulateMedia({ forcedColors: 'active' })`, todos os botões visíveis (`button` e links com a classe do tipo) da biblioteca, do jogo e da modal de configurações têm `border-top-style` diferente de `none` e `border-top-width` ≥ 1 px;
  4. dois secundários em telas diferentes ("Voltar à biblioteca" da conclusão e ‹ do calendário) têm iguais `background-color`, `border-color`, `border-radius` e `min-height`;
  5. `new AxeBuilder({ page }).exclude('[role="grid"]').analyze()` sem violações, nos temas claro e escuro, em: entrar, cadastro, biblioteca, jogo, modal de configurações, modal de conclusão, página não encontrada e tela de erro (forçada como em T020).

  Em `apps/web/src/components/button-states.test.ts` (T015), acrescentar a `CONTROLS`:

  ```text
  features/settings/SettingsDialog.module.css .segmentButton
  features/settings/SettingsDialog.module.css .switch
  features/library/SourceTabs.module.css .tab
  features/game/ClueList.module.css .clue
  features/game/Keyboard.module.css .key
  ```

  E a `EXEMPT`:
  - (c) não vale para `.segmentButton`, `.switch`, `.tab`, `.clue` e `.key`, que nunca ficam desativados. O `:hover` de `.clue` usa `.clue:not(.active, .done)` (T029).
  - (a) não vale para `.key`: o teclado na tela só aparece em aparelho de toque (T030).

  Rodar: os itens 1 a 3 do e2e e os cinco itens novos do unitário falham.

### Implementação da US4

- [X] T027 [P] [US4] Em `apps/web/src/features/library/SourceTabs.module.css`, a `.tab` ganha a transição e os estados das regras gerais (mouse e pressionado). Eles se somam ao `.selected`, porque `background-image` fica por cima do `background-color` e o `box-shadow` inset não muda.
- [X] T028 [P] [US4] Em `apps/web/src/features/settings/SettingsDialog.module.css`:
  - `.segmentButton` e `.switch` trocam `border: 0` por `border: 1px solid transparent` e ganham os estados e a transição de 120 ms (no lugar dos 0,2 s atuais do `.switch`; a `.knob` passa a 120 ms também);
  - na `.switch`, ajustar `top` e `left` da `.knob` em −1 px (`top: 2px`, `left: 2px`, e ligada `left: 24px`), para a bola continuar no mesmo lugar dentro da borda.
- [X] T029 [P] [US4] Em `apps/web/src/features/game/ClueList.module.css`:
  - `.clue` troca `border: 0` por `border: 1px solid transparent` e `padding: 6px 36px 6px 10px` por `5px 35px 5px 9px`, para o texto não mudar de lugar nem de quebra (feature 017);
  - o `.check` passa a `top: calc(5px + 0.75em - 9px)` e `right: 9px`;
  - estados: `@media (hover: hover) { .clue:not(.active, .done):hover { … --hover-overlay … } }` e `.clue:active { … --press-overlay … }`, com a transição de 120 ms.

  O teste de T026 já espera esse seletor e a isenção de (c) para `.clue`.
- [X] T030 [P] [US4] Em `apps/web/src/features/game/Keyboard.module.css`, `.key:active { background-image: linear-gradient(var(--press-overlay), var(--press-overlay)) }`, sem regra de mouse por cima: o teclado só aparece em aparelho de toque.
- [X] T031 [US4] Rodar o `describe('023 US4')`, `sem-saltos.spec.ts` (quebras e alturas das linhas de dica) e `button-states.test.ts`: verdes.

**Checkpoint**: todas as histórias entregues.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T032 [P] Em `docs/design.md`, acrescentar a seção "Botões e links" perto do tema (seção 5):
  - os quatro tipos e quando usar cada um (no máximo um principal por grupo);
  - os estados (mouse só com ponteiro que passa por cima, pressionado, foco, desativado, menos movimento);
  - a regra de link × botão;
  - os tokens `--control`, `--control-line`, `--hover-overlay` e `--press-overlay`;
  - o que fica fora (tabuleiro, alça, teclado só com pressionado).

  No mesmo tom do documento.
- [X] T033 [P] Em `CLAUDE.md`, acrescentar a linha da feature 023 em "Current state", no formato das anteriores:
  - só `apps/web` mudou;
  - os quatro tipos em `Button` (`primary`, `secondary`, `quiet`, `icon`, `size: 'small'`) e `buttonClass()` para links e botões com classe própria;
  - `@layer reset, components`;
  - os tokens novos;
  - os estados por sobreposição com `(hover: hover)` e a exclusão de `:disabled`/`aria-disabled`;
  - a borda transparente para cores forçadas;
  - "Entrar" do cabeçalho como link `quiet`;
  - `e2e/botoes.spec.ts`, `contrast.test.ts` e `button-states.test.ts`.

  Atualizar também a menção a `src/components/` (Button) se citar variantes antigas.
- [X] T034 Rodar a verificação completa:
  - `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`;
  - `npm run test:e2e -w @cruzadinha/web` inteiro (todos os specs, não só os desta feature).

  Tudo verde. Anotar qualquer falha com a saída.
- [X] T035 (Resultado, 2026-10-22: conferência visual no Chromium, temas claro e escuro, na modal de configurações e na tela do jogo. "Restaurar padrões", − e +, tema e "Entrar" do cabeçalho com contorno; a engrenagem com fundo de mouse e o tooltip por cima. Firefox não conferido: não está instalado para o Playwright neste ambiente. Toque, menos movimento e cores forçadas foram conferidos pelo e2e, não pelo DevTools.) Seguir a conferência manual de `specs/023-design-botoes/quickstart.md` nos temas claro e escuro, no Chromium e no Firefox, incluindo toque, menos movimento e cores forçadas pelo DevTools. Corrigir o que destoar e anotar o resultado aqui.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências. T002 vem depois de T001, porque mexe no arquivo que T001 roda.
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias. T003, T004 e T005 em paralelo; depois T006 → T007 → T008 → T009 → T010 (T008 e T009 dependem de T007 pela ordem das camadas; T010, do tipo de T009).
- **US1 (Phase 3)**: depende da fundação.
- **US2 (Phase 4)**: depende da fundação. Usa T012 e T013 (borda das pílulas e do tema) só para o item de caixa igual, então é melhor fazê-la depois da US1. T018 implementa os estados de `.button` que T015 e T016 cobram.
- **US3 (Phase 5)**: depende da fundação (`buttonClass`). Independente de US1 e US2, mas o item 6 de T020 (link de voltar) depende de T017.
- **US4 (Phase 6)**: depende da fundação e de T015, porque estende a lista de `button-states.test.ts` em T026.
- **Polish (Phase 7)**: depois de todas as histórias.

### Within Each User Story

- Testes primeiro, falhando; depois a implementação; depois a rodada de verificação da fase.
- Tarefas [P] da mesma fase mexem em arquivos diferentes.

### Parallel Opportunities

- Fundação: T003, T004, T005.
- US1: T012, T013, T014.
- US2: T017, T018 (arquivos diferentes).
- US3: T022, T023, T024.
- US4: T027, T028, T029, T030.
- Polish: T032, T033.

---

## Parallel Example: User Story 4

```text
Task: "T027 [US4] Estados da aba em apps/web/src/features/library/SourceTabs.module.css"
Task: "T028 [US4] Segmento e chave em apps/web/src/features/settings/SettingsDialog.module.css"
Task: "T029 [US4] Linhas de dica em apps/web/src/features/game/ClueList.module.css"
Task: "T030 [US4] Tecla pressionada em apps/web/src/features/game/Keyboard.module.css"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 e Phase 2 (fundação).
2. Phase 3 (US1) e Phase 4 (US2): resolvem os dois exemplos da issue (engrenagem sem hover, "Restaurar padrões" sem cara de botão).
3. **Parar e validar**: `botoes.spec.ts` US1 e US2, `sem-saltos`, quickstart passos 1 e 4.

### Incremental Delivery

1. Fundação + US1 + US2 → MVP.
2. US3 (links) → validar → incremento.
3. US4 (controles com estado próprio, cores forçadas, axe) → validar.
4. Polish (docs, verificação completa, conferência manual).

---

## Notes

- `touch-targets.test.tsx` continua valendo: nenhum controle perde os 44 px.
- Nenhuma tarefa mexe em `apps/api`, `packages/shared` ou `game-logic/`.
- Commit sugerido por fase, por exemplo:
  - `feat(web): add control tokens and button layers`;
  - `feat(web): give buttons hover and pressed states`;
  - `feat(web): tell links and buttons apart`;
  - `feat(web): add states to tabs, switches and clue rows`;
  - `docs: describe buttons and links in design doc`.

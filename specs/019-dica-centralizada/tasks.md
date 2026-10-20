---

description: "Task list for feature 019: dica no meio da altura da barra, balão acima da barra e dica resolvida riscada"
---

# Tasks: Dica no meio da altura da barra, balão acima da barra e dica resolvida riscada

**Input**: Design documents from `/specs/019-dica-centralizada/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios. A spec mede posição em pixels (SC-001, SC-002, SC-004, SC-009) e o risco (SC-007, SC-008). Os testes vêm antes da implementação e precisam falhar primeiro.
- **Playwright**: posição, linha de base e risco, porque o jsdom não faz layout nem aplica o CSS dos módulos.
- **Vitest**: o recuo do balão para baixo, com a geometria simulada.

**Organization**: uma fase por história da spec. US1 (texto no meio da altura da barra) é P1; US2 (balão acima da barra) e US3 (dica resolvida riscada nas colunas de dicas) são P2 e independentes entre si.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (centro ótico da barra), US2 (balão acima), US3 (risco nas colunas).
- Caminhos relativos à raiz do repositório. Só `apps/web` muda (e docs); API, banco e `packages/shared` não mudam (SC-006).

## Regras que valem para todas as tarefas

- Usar os helpers que já existem em `apps/web/e2e/sem-saltos.spec.ts`, sem duplicar:
  - preparação: `lengthenClues`, `openToday`, `todayPuzzle`, `walkWords`, `solveFirstAcrossWord`, `fillSolution`;
  - seletores: `activeClue`, `activeClueText`, `clueBar`, `cluesAside`, `fullClue`, `openFullClue`, `cell`;
  - medidas: `box`, `expectNear`, `css`, `probe`.
- Antes de escrever código que usa uma biblioteca, consultar a documentação atual pelo Context7 (constituição). Já confirmados no plano:
  - `useLayoutEffect` medindo e reposicionando um tooltip antes da pintura (React);
  - `Locator.boundingBox()` e `mouse.move(x, y, { steps })` (Playwright).
- Sem `any`. Sem cor fixa: só tokens (`--ink`, `--ok-tint`, `--surface`, `--line`).
- Valores novos exatamente como em data-model.md:
  - `translate: 0 -1px` em `.navigable .live`;
  - `placement`: `'above'` (padrão) ou `'below'`;
  - risco `line-through`, 1 px.
- Comentários em português, no tom e densidade do código ao redor, citando a feature 019 onde mudam uma regra das features 017 ou 018. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- Commits em inglês, Conventional Commits, escopo `web`, sem linha de coautoria nem atribuição a IA (CLAUDE.md).
- Dicas longas dos testes são inventadas (`LONG_CLUE`), nunca copiadas de uma fonte real.

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Na branch `feat/019-dica-centralizada` (já criada a partir de `main` com a 018 mesclada), rodar `npm run lint`, `npm run typecheck` e `npm test -w @cruzadinha/web` e anotar que estão verdes antes de qualquer mudança; subir o ambiente do e2e (banco separado e API própria, como em `specs/011-calendario-e-tamanho-tabuleiro/quickstart.md`) e rodar `npm run test:e2e -w @cruzadinha/web -- sem-saltos` para ter a linha de base verde

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o helper de medida vertical que a US1 usa.

- [X] T002 Em `apps/web/e2e/sem-saltos.spec.ts`, acrescentar `xHeightCenter(page)`, sem testes novos ainda. É uma `page.evaluate` sobre a região viva da barra (`clueBar(page).locator('[aria-live="polite"]')`) que devolve, em px de viewport, quatro valores:
  - `barCenter`: meio de `getBoundingClientRect()` da barra;
  - `arrowCenters`: meio vertical de cada `svg` dos botões "Dica anterior" e "Próxima dica";
  - para cada filho da região viva (`b` do número e `span` da dica), `baseline` e `xCenter`;
  - `numberX`: `x` do número.

  Como medir `baseline` e `xCenter` (research R2):
  - `baseline`: anexar ao elemento um `span` com `display:inline-block;width:0;height:0;vertical-align:baseline`, ler o `top` e removê-lo;
  - `xCenter`: `baseline - measureText('x').actualBoundingBoxAscent / 2`, com um `CanvasRenderingContext2D` cuja `font` é montada de `getComputedStyle` (`fontWeight`, `fontSize`, `fontFamily`).

  Esperar `document.fonts.ready` antes de medir. Comentário curto dizendo que é o centro ótico da spec (meio das minúsculas).

**Checkpoint**: `npx playwright test e2e/sem-saltos.spec.ts --list` (em `apps/web`) roda sem erro de tipo.

---

## Phase 3: User Story 1 - Dica no meio da altura da barra (Priority: P1) 🎯 MVP

**Goal**: no computador, o meio das minúsculas do número e da dica fica no meio da barra e na altura das setas, os dois na mesma linha de base, com o texto ainda à esquerda (FR-001 a FR-008).

**Independent Test**: em 1280 × 800, com `lengthenClues`, percorrer todas as palavras com Tab nos dois temas. Em cada palavra: o `xCenter` da dica e do número a ≤ 0,5 px de `barCenter` e de cada `arrowCenters`; as duas `baseline` iguais (±0,1 px); a `baseline` da dica e o `numberX` iguais em todas as palavras (±0,1 px).

### Tests for User Story 1 ⚠️

> Escrever primeiro e confirmar que falham com o CSS de hoje (research R1: 0,75 px e 0,5 px).

- [X] T003 [US1] Em `apps/web/e2e/sem-saltos.spec.ts`, novo `test.describe('019 US1: a dica fica no meio da altura da barra')` com um teste por tema (`for (const theme of ['light', 'dark'] as const)`, `addInitScript` com `cruzadinha:theme`, como no teste de dica resolvida da 017). Em 1280 × 800, com `lengthenClues` e `openToday`, percorrer todas as palavras com Tab (laço como o de `walkWords`, `puzzle.words.length + 1` passos). Em cada passo, com `xHeightCenter`:
  - `Math.abs(xCenter - barCenter) <= 0.5` para o número e para a dica;
  - o mesmo contra cada `arrowCenters`;
  - `Math.abs(baseline do número - baseline da dica) <= 0.1`;
  - `baseline` da dica e `numberX` iguais aos da primeira palavra, com `Math.abs(...) <= 0.1` (SC-002 e SC-004 pedem variação de 0 px; não usar `expectNear`, que aceita 1 px).

  Conferir também que passou por pelo menos uma dica cortada (`LONG_CLUE`) e uma inteira. Rodar e confirmar que falha. **FR-001 a FR-004, SC-001, SC-002, SC-004.**

### Implementation for User Story 1

- [X] T004 [US1] Em `apps/web/src/features/game/ClueBar.module.css`, acrescentar uma regra `.navigable .live` com `align-items: baseline` e `translate: 0 -1px`, logo depois de `.navigable .text`. O comentário diz, em uma ou duas frases, que:
  - número e dica dividem a linha de base;
  - o conjunto sobe 1 px até o meio das minúsculas ficar no meio da barra e na altura das setas (centro ótico, feature 019);
  - o `translate` não muda o layout nem a altura da barra.

  Não mexer em `.live` (vale também para a barra sem botões, FR-009) nem em `.text`. Conferir que "Escolha uma célula para começar." continua dentro da mesma região viva `.live` em `ClueBar.tsx`: é assim que a FR-006 fica coberta, porque o jogo sempre abre numa palavra e o e2e não chega a esse estado (contracts/ui.md). Rodar o T003 e confirmar que passa.
- [X] T005 [US1] Rodar `npm run test:e2e -w @cruzadinha/web -- sem-saltos tamanhos` e confirmar que os testes das features 017 e 018 continuam verdes: `walkWords`, `expectBarFollowsGrid`, o balão e o celular. Isso cobre barra, grade e `aside` parados (FR-007), o corte (FR-005) e os layouts sem botões (FR-009). Se algum falhar, corrigir no CSS do T004, sem afrouxar o teste.

**Checkpoint**: US1 entregue e testável sozinha.

---

## Phase 4: User Story 2 - Balão da dica completa acima da barra (Priority: P2)

**Goal**: no computador, o balão abre logo acima da barra, por cima da barra de ferramentas, sem cobrir células; sem espaço acima na janela, abre abaixo. Na janela estreita sem teclado na tela, em que a barra fica abaixo do tabuleiro, continua abaixo dela, como na 018 (FR-015 a FR-018, SC-009, SC-010).

**Independent Test**: em 1280 × 800, com `lengthenClues`, parar o mouse sobre a dica longa:
- o balão abre com a base 4 px acima da barra, mesma largura, acima do topo da grade;
- subir o mouse até ele não o fecha;
- nada se move.

Com a página rolada até a barra encostar no topo, o balão abre abaixo. Em 800 px de largura, o balão abre abaixo da barra e não cobre nenhuma célula.

### Tests for User Story 2 ⚠️

- [X] T006 [P] [US2] Em `apps/web/src/features/game/ClueBar.test.tsx`, dentro de `describe('balão com a dica completa')`, acrescentar três casos que usam `cut()`, `open()`, `hover`/`leave`/`wait`, como os vizinhos.
  - **Acima por padrão**: com espaço, o balão (`balloon()`) não tem a classe de recuo; conferir por `className` contendo `below` ou não.
  - **Recuo para baixo**: com `vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')` devolvendo `top: -10` para o balão (identificado por `data-testid="full-clue"`) e um retângulo neutro para o resto, o balão abre com a classe `below`.
  - **Volta para cima**: fechar com `leave` da barra, trocar o retorno para `top: 50`, abrir de novo e conferir que o balão está sem `below`.

  Rodar e confirmar que o segundo caso falha. **FR-015, FR-016.**
- [X] T007 [P] [US2] Em `apps/web/e2e/sem-saltos.spec.ts`, no `test.describe('018 US3: dica completa ao parar o mouse')`:
  - **Troca no teste "abre sem mover nada"**: o novo nome é "abre acima da barra sem mover nada, atravessa o vão subindo e fecha ao sair".
    - Trocar `expect(balloon.y).toBeGreaterThan(bar.y + bar.height)` por `expectNear(balloon.y + balloon.height + 4, bar.y)`.
    - Acrescentar `expect(balloon.y + balloon.height).toBeLessThanOrEqual(grid.y)`, com a grade lida por `box(page.getByRole('grid'))`.
    - Incluir a caixa do `h1` da página em `boxes()`.
    - Mover o mouse em passos da dica para `balloon.y + balloon.height / 2`, para cima, atravessando o vão.
  - **Teste novo**, "sem espaço acima, o balão abre abaixo":
    - 1280 × 800 (do `beforeEach`), `openToday`;
    - para a página sempre poder rolar, qualquer que seja o tamanho da cruzada, dar espaço extra no fim só no teste: `page.evaluate(() => { document.body.style.paddingBottom = '2000px' })`;
    - rolar até a barra ficar 8 px abaixo do topo: `page.evaluate` com `window.scrollBy(0, top - 8)`, lendo `top` de `getBoundingClientRect()` da barra; conferir que o `top` da barra ficou entre 0 e 20 px;
    - `openFullClue`; conferir `balloon.y >= bar.y + bar.height` e `balloon.y >= 0`.
  - **Troca no teste "janela estreita sem teclado na tela: o balão também aparece"** (800 × 900): depois de `openFullClue`, ler `bar`, `balloon` e `grid` com `box` e conferir `balloon.y >= bar.y + bar.height` (abaixo da barra, como na 018) e `balloon.y >= grid.y + grid.height` (nenhuma célula coberta). Esse teste já passa hoje e precisa continuar passando depois do T008; ele protege a janela estreita (FR-018, SC-010).

  Rodar e confirmar que só o teste "abre acima da barra" falha. Os outros dois passam hoje, porque o balão ainda abre abaixo; o de recuo só passa a provar algo depois do T008 (ver o T008). **FR-015 a FR-018, SC-009, SC-010.**

### Implementation for User Story 2

- [X] T008 [US2] Em `apps/web/src/features/game/ClueBar.module.css`, mudar a posição do balão só na barra do computador. `.full` e `.full::before` ficam como estão: valem para a barra sem botões, que na janela estreita fica abaixo do tabuleiro, onde o balão acima cobriria células.
  - **Novas regras**, logo depois da `.navigable .live` do T004 (ou de `.navigable .text`, se a US2 vier antes da US1):
    - `.navigable .full`: `top: auto` e `bottom: calc(100% + 4px)`;
    - `.navigable .full::before` (a ponte): `top: 100%` e `bottom: auto`, com o `height: 5px` herdado;
    - `.navigable .full.below`: `top: calc(100% + 4px)` e `bottom: auto`;
    - `.navigable .full.below::before`: `top: auto` e `bottom: 100%`.
  - **Comentários**: dizer que no computador o balão fica acima da barra para o tabuleiro ficar à vista (feature 019, substitui o "logo abaixo" da 018), e que `.below` é o recuo quando não cabe acima na janela. No comentário de `.full`, dizer que a posição abaixo continua valendo para a barra sem botões, que fica abaixo do tabuleiro na janela estreita. O `z-index: 4` e a sombra ficam como estão.
  - **Antes do T009**: rodar o e2e "sem espaço acima, o balão abre abaixo" e confirmar que agora falha (o balão sobe e sai da janela, sem `placement` para recuar). O teste "abre acima da barra" já deve passar.
- [X] T009 [US2] Em `apps/web/src/features/game/ClueBar.tsx`, acrescentar o lado do balão.
  - **Estado**: `const [placement, setPlacement] = useState<'above' | 'below'>('above')` e um `ref` para o balão (`useRef<HTMLDivElement>(null)`).
  - **Ao abrir**: no callback do temporizador em `onTextPointer`, junto com `setOpenFor(key)`, chamar `setPlacement('above')`.
  - **Medição**: um `useLayoutEffect` com dependência `[open]`. Se `open` e o `ref` existir, e `ref.current.getBoundingClientRect().top < 0`, chamar `setPlacement('below')`. Seguir o estilo de `useMeasuredSpace.ts`. Se o lint (`react-hooks`) reclamar de `setState` no efeito, usar a forma funcional, como lá.
  - **Comentário**: uma frase dizendo que a medição acontece antes da pintura, para o balão nunca aparecer cortado no topo da janela (FR-016).
  - **Balão**: passar o `ref` e `className={placement === 'below' ? \`${styles.full} ${styles.below}\` : styles.full}`.
  - Atualizar o comentário do componente ("aparece inteira num balão") para dizer "acima da barra no computador, abaixo na barra sem botões". O `placement` só muda algo com `.navigable`; na barra sem botões o balão já fica abaixo, e a medição nunca dá `top < 0` enquanto o mouse está sobre a dica.

  Rodar T006 e T007 e confirmar que passam.
- [X] T010 [US2] Rodar `npm test -w @cruzadinha/web` e o e2e `sem-saltos` e confirmar que os testes existentes do balão continuam verdes:
  - Esc, troca de palavra, dica curta, toque no celular;
  - cores do tema e axe com o balão aberto;
  - janela estreita (800 px), agora com o balão abaixo da barra e fora da grade (T007).

**Checkpoint**: US2 entregue; US1 continua verde.

---

## Phase 5: User Story 3 - Dica resolvida riscada nas colunas de dicas (Priority: P2)

**Goal**: a dica de uma palavra completa e certa fica riscada (número e texto, todas as linhas) nas colunas de dicas e no painel do celular, com o fundo e o visto da 017 e o texto em `--ink`. A barra da dica nunca é riscada (FR-010 a FR-014).

**Independent Test**: completar a primeira horizontal.
- A dica dela tem `text-decoration-line: line-through` e `color` igual a `--ink`, com fundo `--ok-tint` e o visto.
- A barra da dica tem `none`.
- A altura da dica e das colunas não muda.
- Depois de `Delete`, a dica volta a `none`.

### Tests for User Story 3 ⚠️

- [X] T011 [P] [US3] Em `apps/web/e2e/sem-saltos.spec.ts`, no teste `US3: a dica resolvida ganha fundo de sucesso e visto, sem mexer na lista, tema ${theme}` (feature 017):
  - **Nome**: passa a ser "a dica resolvida fica riscada, com fundo de sucesso e visto, sem mexer na lista".
  - **Resolvida**:
    - trocar `expect(await css(first, 'text-decoration-line')).toBe('none')` por `toBe('line-through')`;
    - acrescentar `expect(await css(first, 'color')).toBe(await probe(page, 'color', 'var(--ink)'))`.
  - **Ativa e resolvida**: conferir `line-through` na dica, `color` igual a `await probe(page, 'color', 'var(--ink)')` também com o fundo `--word` (FR-011), e `expect(await css(clueBar(page), 'text-decoration-line')).toBe('none')` (FR-014).
  - **Desfeita** (depois de `Delete`): conferir `none` na dica.

  No teste do modo leitura (`US3: no modo leitura todas as dicas aparecem resolvidas`), conferir `line-through` em todos os botões das colunas (`clues.getByRole('button')`, laço com `css`).

  Rodar e confirmar que falham. **FR-010 a FR-014, SC-007, SC-008.**

### Implementation for User Story 3

- [X] T012 [US3] Em `apps/web/src/features/game/ClueList.module.css`, acrescentar a `.done` `text-decoration: line-through` e `text-decoration-thickness: 1px`, sem mudar `color` e sem tocar em `.active.done` nem em `.check`.
  - **Comentário**: a dica resolvida fica riscada de novo (feature 019), com o fundo e o visto da 017 e o texto em `--ink`, porque `--mute` sobre `--word` fica abaixo de 4,5:1 no tema escuro (feature 016).
  - **Por que nada mais é riscado**: o risco não se propaga para o visto nem para ", resolvida", que são absolutos.
  - Não mudar `ClueList.tsx`, `ClueSheet.tsx` nem `game-logic/clue-strike.ts`. Rodar o T011 e confirmar que passa.

**Checkpoint**: US3 entregue; US1 e US2 continuam verdes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T013 [P] Atualizar `docs/design.md` nos trechos da barra da dica, do balão e da lista de dicas:
  - texto da barra no computador pelo centro ótico, ainda à esquerda;
  - balão acima da barra no computador, com recuo para baixo, e abaixo da barra na janela estreita;
  - dica resolvida riscada com fundo e visto, sem ficar apagada.

  Manter o estilo e o nível de detalhe do documento.
- [X] T014 [P] Acrescentar a linha da feature 019 em `CLAUDE.md` (seção "Current state"), no mesmo formato das linhas 016 a 018. A linha diz que só `apps/web` mudou e resume os três ajustes:
  - `.navigable .live` com `align-items: baseline` e `translate: 0 -1px` (centro ótico medido no e2e por `xHeightCenter`);
  - balão de `ClueBar` acima da barra no computador (`.navigable .full`), com `placement`/`.below` medido num `useLayoutEffect` quando não cabe, e abaixo da barra sem botões, como na 018;
  - `.done` de `ClueList` com `line-through`, substituindo o "sem risco" da 017.
- [X] T015 Rodar a conferência completa: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e -w @cruzadinha/web` (todas as specs). Registrar o resultado; qualquer falha volta para a tarefa da história correspondente.
- [X] T016 Seguir o roteiro manual de `specs/019-dica-centralizada/quickstart.md` (passos 1 a 10: temas claro e escuro, janela baixa rolada, janela estreita de 800 px, Firefox, celular com o painel de dicas) e anotar no PR o que foi conferido.
  - **Conferido em 2026-10-20** (Chromium pelo Playwright MCP, dicas longas inventadas): balão acima da barra a 1280 × 800 nos temas claro e escuro, tabuleiro inteiro à vista; dica resolvida riscada com fundo e visto, inclusive ativa, e a barra sem risco; recuo para baixo com a barra a 8 px do topo (classe `below`); a 800 px, balão abaixo da barra, sem cobrir a grade, e a dica riscada no painel. Não conferidos aqui: Firefox (passo 9) e celular com toque (passo 10); o painel do celular usa o mesmo `ClueList`.
- [X] T017 Commitar em passos pequenos, em inglês, por exemplo:
  - `test(web): measure the clue bar optical centre`
  - `fix(web): centre the clue bar text on the lowercase letters`
  - `feat(web): open the full clue balloon above the bar`
  - `feat(web): strike solved clues in the clue columns again`
  - `docs: describe feature 019`

  Os specs vão num commit `docs(specs): add feature 019 spec and plan`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)** → **Foundational (T002)** → US1.
- **US1 (T003–T005)** depende de T002.
- **US2 (T006–T010)** e **US3 (T011–T012)** dependem só do Setup. Não usam `xHeightCenter` e mexem em arquivos e trechos diferentes, então podem vir antes, depois ou em paralelo com US1.
- **Polish (T013–T017)** depende das histórias entregues.

### Dentro de cada história

- Teste antes do código, falhando primeiro (T003 → T004; T006/T007 → T008/T009; T011 → T012). O e2e de recuo do T007 é a exceção: passa hoje e falha entre o T008 e o T009, que o faz passar de novo.
- T008 (CSS) antes de T009 (TSX), porque a classe `.below` precisa existir.

### Conflitos de arquivo

- `sem-saltos.spec.ts` é tocado por T002, T003, T007 e T011. Se rodarem em paralelo, cada um mexe num `describe` diferente, mas é mais seguro aplicar um de cada vez.
- `ClueBar.module.css` é tocado por T004 e T008 em regras diferentes (`.navigable .live` e `.navigable .full`), que podem ficar uma depois da outra.

## Parallel Example

```text
# Depois do Setup, em paralelo:
T006 [US2] unitários do recuo em ClueBar.test.tsx
T011 [US3] e2e do risco em sem-saltos.spec.ts (describe da 017)

# No polish, em paralelo:
T013 docs/design.md
T014 CLAUDE.md
```

## Implementation Strategy

### MVP (US1)

T001 → T002 → T003 → T004 → T005. A barra fica no centro ótico, que é o pedido inicial do autor. Pode ser revisada e mesclada sozinha.

### Incremental

1. US1 (barra no centro ótico).
2. US2 (balão acima) ou US3 (risco), em qualquer ordem; cada uma tem seus testes e não depende da outra.
3. Polish: docs, conferência completa e roteiro manual.

### Totais

- 17 tarefas: Setup 1, Foundational 1, US1 3, US2 5, US3 2, Polish 5.
- Paralelas: T006 com T011 (e com T007 em `describe`s separados), T013 com T014.

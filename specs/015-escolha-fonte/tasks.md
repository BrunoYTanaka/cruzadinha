---

description: "Task list for feature 015: escolha da fonte mais visível"
---

# Tasks: Escolha da fonte mais visível

**Input**: Design documents from `/specs/015-escolha-fonte/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: obrigatórios. A constitution exige teste para regra pura (V) e a spec pede acessibilidade sem violações (SC-004) e compatibilidade com a API anterior (SC-006). Em cada história, os testes vêm antes da implementação e precisam falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário da spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 (cartões de hoje), US2 (abas do calendário), US3 (fonte no jogo e atalho de conclusão).
- Caminhos relativos à raiz do repositório. Só `apps/web` muda; API, banco e `packages/shared` não mudam.

## Regras que valem para todas as tarefas

- Antes de escrever código que usa uma biblioteca (React Router, TanStack Query, Testing Library, Vitest, Playwright), consultar a documentação atual pelo Context7 (constitution, Fluxo de Desenvolvimento). `useQueries` já foi conferido (research R1).
- Sem `any`. Sem cor ou medida fixa nos componentes: só tokens (`--surface`, `--line`, `--ink`, `--mute`, `--accent`, `--accent-ink`, `--ok`, `--ok-tint`, `--warn`, `--warn-tint`, `--pill`, `--radius-*`, `--tap`).
- Nenhum texto ou regra fixa por fonte: nomes de `puzzleSourceNames`, ordem de `puzzleSourceIdSchema.options` (FR-013).
- Estado sempre por texto além da cor (FR-003).
- Comentários em português, no tom e densidade do código ao redor. Prettier: sem ponto e vírgula, aspas simples, `printWidth` 100.
- Commits em inglês, Conventional Commits, sem linha de coautoria. Escopo `web`.

---

## Phase 1: Setup

**Purpose**: branch.

- [X] T001 Criar a branch `feat/015-escolha-fonte` a partir de `main` (`git switch -c feat/015-escolha-fonte`) e versionar `specs/015-escolha-fonte/` num commit `docs: add feature 015 spec, plan and tasks`. Não incluir `specs/016-dica-riscada-ao-acertar/` (é outra feature).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: regra de estado do dia exposta, fonte padrão pela lista e o hook de dados que as três histórias usam.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T002 [P] Em `apps/web/src/features/library/calendar.test.ts`, acrescentar testes de `dayState(date, today, byDate, noPuzzleDates)` exportada: item `completed` → `{ kind: 'completed', finishedMs, puzzleId }`; `in_progress` → `{ kind: 'in_progress', puzzleId }`; `not_started` → `{ kind: 'not_started', puzzleId }`; sem item e `date > today` → `future`; sem item, passado, em `noPuzzleDates` → `none`; sem item, passado ou hoje → `fetchable`.
- [X] T003 Em `apps/web/src/features/library/calendar.ts`, renomear `stateFor` para `dayState` e exportá-la, sem mudar o comportamento; `buildMonth` passa a chamá-la. T002 passa.
- [X] T004 [P] Em `apps/web/src/features/library/source-choice.test.ts`, acrescentar: `DEFAULT_SOURCE` é igual a `puzzleSourceIdSchema.options[0]`; com `cruzadinha:source` = `'fonte-retirada'`, `loadSourceChoice()` devolve `DEFAULT_SOURCE` (research R10, FR-008).
- [X] T005 Em `apps/web/src/features/library/source-choice.ts`, trocar `DEFAULT_SOURCE: PuzzleSourceId = 'oglobo'` por `puzzleSourceIdSchema.options[0]` (com comentário: a primeira fonte da lista é a padrão). T004 passa.
- [X] T006 Criar `apps/web/src/features/library/useSourceLibraries.ts` (research R1, R9):
  - mover `libraryFor(viewer, source)` de `LibraryPage.tsx` para cá (exportada), sem mudar o comportamento;
  - `export function useSourceLibraries({ enabled = true }: { enabled?: boolean } = {}): SourceLibrary[]`, com `useViewer()` e `useQueries` sobre `puzzleSourceIdSchema.options`, cada consulta com `queryKey: queryKeys.library(viewer ? viewerKey(viewer) : 'pending', source)`, `queryFn: () => (viewer ? libraryFor(viewer, source) : getLibrary(source))`, `enabled: enabled && viewer !== undefined`, `retry: false` (as mesmas opções de hoje em `LibraryPage.tsx`);
  - `SourceLibrary = { source: PuzzleSourceId; name: string; query: UseQueryResult<LibraryResponse>; items: LibraryItem[] }`, com `items` = `data?.items` filtrado por `item.source === source` (research R11) e `[]` sem dados;
  - sem `combine`: cada fonte mantém o próprio `isPending`, `isError`, `error` e `refetch` (FR-014).
- [X] T007 Em `apps/web/src/features/library/LibraryPage.tsx`, trocar o `useQuery` local por `useSourceLibraries()` e usar a entrada da fonte ativa para o calendário, mantendo todo o comportamento atual (seletor, carregamento, erro, 401 de visitante, aviso de fonte fora do ar). Rodar `cd apps/web && npx vitest run src/features/library`: tudo verde, sem mudar testes.

**Checkpoint**: base pronta; nada visível mudou.

---

## Phase 3: User Story 1 - Ver e abrir a cruzada de hoje de cada fonte (Priority: P1) 🎯 MVP

**Goal**: seção "Hoje" com um cartão por fonte, cada um um único link para jogar; sai o "Jogar a de hoje".

**Independent Test**: com as duas fontes guardadas para hoje, abrir `/` e ver dois cartões com as situações certas, cada um abrindo o puzzle da sua fonte (quickstart passos 1, 2 e 5).

### Tests for User Story 1 ⚠️

- [X] T008 [P] [US1] Criar `apps/web/src/features/library/today-cards.test.ts` para `todayCard(source, items, today, { down, noPuzzle })` (data-model §3), com `makeLibraryItem` de `src/test/fixtures.ts` e `today = '2026-10-19'`:
  - `not_started` → estado "Não iniciada", ação "Jogar", `href` `/jogo/<puzzleId>`;
  - `in_progress` com `elapsedMs: 522000` → "◐ Em jogo · 08:42", "Continuar"; com `elapsedMs: null` → "◐ Em jogo", sem tempo;
  - `completed` com `finishedMs: 987000` → "✓ Concluída · 16:27", "Ver"; com `finishedMs: null` → "✓ Concluída";
  - sem item de hoje → "Ainda não guardada", "Jogar", `href` `/dia/2026-10-19?fonte=<source>`;
  - sem item e `down: true` → "Fonte fora do ar agora", sem ação e `href: null`;
  - sem item e `noPuzzle: true` → "Sem cruzada hoje", sem ação e `href: null`;
  - `spoken` traz o tempo por `spokenElapsed` (por exemplo "em andamento, 8 minutos e 42 segundos"; conferir o formato real em `src/lib/time.ts`);
  - item de outra data não conta como hoje.
- [X] T009 [P] [US1] Criar `apps/web/src/features/library/TodayCards.test.tsx`, renderizando `<TodayCards libraries={…} today="2026-10-19" />` dentro de um router de memória:
  - dois cartões na ordem de `puzzleSourceIdSchema.options`; cada cartão com destino é um único link (`getByRole('link', { name: /^O Globo: .*Continuar$/ })`) com o `href` certo;
  - "Sem cruzada hoje" não é link;
  - fonte com `query.isPending` mostra "Carregando…" com `aria-busy="true"`; com `query.isError` mostra "Não foi possível carregar." e o botão "Tentar de novo" chama `refetch`, e o outro cartão continua link (FR-014);
  - `expectNoA11yViolations` de `src/test/axe.ts`.
- [X] T010 [P] [US1] Em `apps/web/src/features/library/LibraryPage.test.tsx`, com `mockApi` respondendo `GET /api/library` por `source`:
  - `h1` "Hoje" e dois cartões; não existe mais o link "Jogar a de hoje";
  - visitante: os cartões mostram o estado vindo do IndexedDB (`guestStore`), como o calendário;
  - API anterior à feature 014 (resposta sem `source` nos itens, que vira `oglobo`, para qualquer `source` pedido): o cartão da Cruzada Online fica "Ainda não guardada", nunca com o puzzle do O Globo (SC-006);
  - erro só em `source=cruzadaonline`: o cartão dela mostra "Tentar de novo" e o calendário do O Globo aparece.
  - Remover ou ajustar os casos antigos que procuram "Jogar a de hoje" e o `h1` "Escolha um dia".

### Implementation for User Story 1

- [X] T011 [US1] Criar `apps/web/src/features/library/today-cards.ts` com `export type TodayCard = { source; name; kind: DayState['kind']; status: string; spoken: string; action: string | null; href: string | null }` e `export function todayCard(source, items, today, { down, noPuzzle })`, usando `dayState` (T003) e `formatElapsed`/`spokenElapsed` de `src/lib/time.ts`. Textos e destinos exatamente da tabela de data-model §3. T008 passa.
- [X] T012 [US1] Criar `apps/web/src/features/library/TodayCards.tsx` e `TodayCards.module.css` (contracts/ui.md §1, "Cartão"):
  - `<section aria-labelledby="today-title">` com `<h1 id="today-title">Hoje</h1>` e a data por extenso (`Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })`);
  - por fonte: carregando → `<div aria-busy="true">`; erro → `<div>` com o nome, "Não foi possível carregar." e `<Button>` "Tentar de novo" (`query.refetch()`); sucesso → `todayCard(...)` com `down: isSourceDown(source)` e `noPuzzle: isNoPuzzle(source, today)`; com `href`, `<Link>` do cartão inteiro com `aria-label={`${name}: ${spoken}. ${action}`}`; sem `href`, `<div>`;
  - pílula de estado com `--ok-tint`/`--ok` (concluída), `--warn-tint`/`--warn` (em jogo), `--pill`/`--ink` (os demais); ação com `--accent`/`--accent-ink`, altura mínima `var(--tap)`;
  - layout (research R6, FR-016): `display: grid; gap: 16px`, uma coluna; `@media (min-width: 600px)` `grid-template-columns: repeat(var(--source-count), minmax(0, 1fr))`, com `--source-count` no `style` da lista.
  - T009 passa.
- [X] T013 [US1] Em `apps/web/src/features/library/LibraryPage.tsx` (research R7):
  - renderizar `<TodayCards libraries={libraries} today={today} />` no topo, antes do seletor;
  - remover o bloco `.top` (título "Escolha um dia", frase e o link "Jogar a de hoje") e o cálculo `todayItem`/`todayPath`; manter `useDocumentTitle('Escolha um dia')`;
  - o carregamento e o erro da fonte ativa passam a afetar só a área do calendário; os cartões aparecem sempre (FR-014);
  - exceção, só de compatibilidade com a API anterior à feature 013: se a biblioteca de um visitante responder 401, a página inteira continua mostrando "Entre para ver a biblioteca", sem cartões nem abas, como hoje; manter o teste existente desse caso;
  - remover de `LibraryPage.module.css` as classes que ficaram sem uso (`.top`, `.title`, `.lead`, `.today`).
  - T010 passa.

**Checkpoint**: US1 entregável sozinha (MVP): cartões funcionam com o seletor antigo ainda no calendário.

---

## Phase 4: User Story 2 - Trocar a fonte do calendário por abas (Priority: P2)

**Goal**: abas acessíveis com a contagem de concluídas no mês, no lugar do `SourcePicker`.

**Independent Test**: trocar de aba e ver o calendário da fonte certa no mesmo mês; a aba ativa é anunciada, as setas trocam de aba e a escolha volta depois de recarregar (quickstart passos 3, 4, 7 e 8).

### Tests for User Story 2 ⚠️

- [ ] T014 [P] [US2] Em `apps/web/src/features/library/today-cards.test.ts`, testes de `completedInMonth(items, { year: 2026, month: 10 })` (data-model §4): conta só `status === 'completed'` com data em outubro de 2026; ignora setembro e novembro; lista vazia → 0. E de `completedLabel(n)`: 0 → "0 concluídas", 1 → "1 concluída", 5 → "5 concluídas".
- [ ] T015 [P] [US2] Criar `apps/web/src/features/library/SourceTabs.test.tsx` (research R4, contracts/ui.md §1, "Abas"):
  - `tablist` com nome "Fonte do calendário" e uma `tab` por fonte, na ordem da lista;
  - a ativa com `aria-selected="true"` e `tabindex="0"`, as outras `"false"` e `"-1"`; cada aba com `aria-controls="source-panel"`;
  - com contagens, a aba mostra "5 concluídas"; com `count: null` (carregando/erro), só o nome;
  - clique chama `onChange(source)`; → e ← chamam `onChange` com a vizinha, com volta nas pontas, e movem o foco; Home/End vão à primeira/última;
  - `expectNoA11yViolations`.
- [ ] T016 [P] [US2] Em `apps/web/src/features/library/LibraryPage.test.tsx`:
  - escolher a aba "Cruzada Online" mostra os dias dela no mesmo mês (navegar para setembro antes e conferir que continua em setembro), sem novo pedido de biblioteca (contar chamadas no `mockApi`);
  - a escolha fica em `cruzadinha:source` e uma nova renderização abre nessa aba;
  - o calendário é `role="tabpanel"` com nome igual ao da aba ativa;
  - a aba mostra a contagem de concluídas do mês exibido e muda ao trocar de mês.
- [ ] T017 [US2] Em `apps/web/src/features/library/LibraryPage.test.tsx` (mesmo arquivo de T016, depois dela), caso de visitante: com um item `completed` de outubro no IndexedDB (`guestStore`) para O Globo, a aba "O Globo" mostra "1 concluída" e a da Cruzada Online "0 concluídas" (FR-012).

### Implementation for User Story 2

- [ ] T018 [US2] Em `apps/web/src/features/library/today-cards.ts`, implementar `completedInMonth(items, month)` e `completedLabel(n)`. T014 passa.
- [ ] T019 [US2] Criar `apps/web/src/features/library/SourceTabs.tsx` e `SourceTabs.module.css`: props `{ value: PuzzleSourceId; tabs: { source; name; count: number | null }[]; onChange(source) }`; `<div role="tablist" aria-label="Fonte do calendário">`, cada `<button type="button" role="tab" id={`source-tab-${source}`} aria-controls="source-panel" aria-selected tabIndex>` com nome em negrito e `completedLabel(count)` quando `count !== null`; `onKeyDown` no tablist para ←/→/Home/End, chamando `onChange` e focando a aba nova (refs por fonte). Estilo: aba ativa com fundo `--surface` e marca de 3 px em `--accent`; inativas em `--pill`; altura mínima `var(--tap)`; abaixo de 600 px `grid-auto-flow: column; grid-auto-columns: 1fr` (FR-016). T015 passa.
- [ ] T020 [US2] Em `apps/web/src/features/library/Calendar.tsx`, a `<section>` do mês ganha `id="source-panel"`, `role="tabpanel"`, `aria-labelledby={`source-tab-${source}`}` e `aria-describedby="calendar-title"` (o nome do painel é o da aba; o mês continua no `h2#calendar-title`, contracts/ui.md §1). Ajustar os testes existentes que dependam de `aria-labelledby="calendar-title"`.
- [ ] T021 [US2] Em `apps/web/src/features/library/LibraryPage.tsx`, trocar `SourcePicker` por `<SourceTabs value={source} tabs={…} onChange={setSource} />`, com `count = completedInMonth(entry.items, month)` quando `entry.query.isSuccess` e `null` caso contrário; o `month` continua no estado da página ao trocar de aba (FR-009). T016 e T017 passam.
- [ ] T022 [US2] Só depois de T021 (a página já não usa o componente): remover `apps/web/src/features/library/SourcePicker.tsx`, `SourcePicker.module.css` e `SourcePicker.test.tsx`. Rodar `npm run typecheck -w @cruzadinha/web`: verde.

**Checkpoint**: US1 e US2 juntas = alternativa A do mockup na biblioteca.

---

## Phase 5: User Story 3 - Saber de qual fonte é o jogo aberto e trocar para a outra do mesmo dia (Priority: P3)

**Goal**: nome da fonte no topo do jogo e atalho para a próxima fonte do mesmo dia no diálogo de conclusão.

**Independent Test**: concluir a cruzada de um dia numa fonte e ver o atalho para a outra fonte do mesmo dia, que abre o puzzle certo; sem atalho quando a outra já está concluída (quickstart passo 6).

### Tests for User Story 3 ⚠️

- [ ] T023 [P] [US3] Em `apps/web/src/features/library/today-cards.test.ts`, testes de `otherSourceShortcut(current, date, today, libraries, { isDown, isNoPuzzle })` (data-model §5), com `libraries: { source; name; ready: boolean; items }[]`:
  - atual `oglobo`, Cruzada Online `not_started` no dia → `{ source: 'cruzadaonline', name: 'Cruzada Online', href: '/jogo/<id>' }`; `in_progress` também gera atalho;
  - Cruzada Online sem item no dia (passado) → `href` `/dia/<date>?fonte=cruzadaonline`; se `isDown('cruzadaonline')` → `null`;
  - `completed`, `none` (`isNoPuzzle`) ou `future` → `null`;
  - fonte com `ready: false` (carregando ou erro) → ignorada;
  - com três fontes (lista falsa), devolve a primeira não concluída na ordem, ignorando a atual.
- [ ] T024 [P] [US3] Em `apps/web/src/features/game/CompletionDialog.test.tsx`:
  - com `otherSource={{ name: 'Cruzada Online', href: '/jogo/x' }}`: mostra "Também há cruzada deste dia em Cruzada Online.", o link "Jogar Cruzada Online deste dia" com foco inicial e `href` `/jogo/x`, e os botões "Voltar à biblioteca" e "Ver o tabuleiro";
  - sem `otherSource`: igual a hoje (foco em "Voltar à biblioteca");
  - `expectNoA11yViolations` nos dois casos.
- [ ] T025 [P] [US3] Em `apps/web/src/features/game/GamePage.test.tsx` (com `openGame`/`openGuestGame` de `src/test/game-harness.tsx`):
  - o `h1` contém o nome da fonte do puzzle antes de "Cruzada de …" e `document.title` termina em "· O Globo";
  - ao concluir com `GET /api/library?source=cruzadaonline` devolvendo um item `not_started` na data do puzzle, o diálogo mostra o atalho; com o item `completed`, não mostra; com a biblioteca respondendo 500, o diálogo aparece sem atalho e nada bloqueia o tabuleiro; antes de concluir, nenhum `GET /api/library` é feito pela tela do jogo.

### Implementation for User Story 3

- [ ] T026 [US3] Em `apps/web/src/features/library/today-cards.ts`, implementar `otherSourceShortcut` reutilizando `dayState`. T023 passa.
- [ ] T027 [US3] Em `apps/web/src/features/game/CompletionDialog.tsx` (+ `.module.css` se precisar), prop opcional `otherSource?: { name: string; href: string }`; com ela, a frase, o link primário (`<Link>` com a aparência de `Button variant="primary" block`, recebendo o `initialFocusRef`) e "Voltar à biblioteca" vira botão secundário; sem ela, sem mudança (contracts/ui.md §3). T024 passa.
- [ ] T028 [US3] Em `apps/web/src/features/game/GamePage.tsx` e `GamePage.module.css` (o `h1`, o hook e o atalho ficam no componente interno `Game`, onde existem `puzzle` e `completedHere`; `GamePage` retorna antes dele em carregamento e erro, então nenhum hook novo vai em `GamePage`; o título do documento continua em `GamePage`, a partir de `puzzleQuery.data`):
  - `h1`: `<span className={styles.source}>{puzzleSourceNames[puzzle.source]}</span>` antes de "Cruzada de {data}" (pílula visual com `--pill` e `--radius-*`; não usar o componente `Pill`, que é botão);
  - `useDocumentTitle`: "Cruzada de {data} · {nome da fonte}" quando o puzzle carregou;
  - chamar `useSourceLibraries({ enabled: completedHere })` (só pede as bibliotecas ao concluir; em geral já estão em cache, research R9) e passar `otherSource={otherSourceShortcut(puzzle.source, puzzle.date, todayInBrasilia(), …, { isDown: isSourceDown, isNoPuzzle: (s) => isNoPuzzle(s, puzzle.date) })}` ao `CompletionDialog`, com `ready = entry.query.isSuccess`;
  - garantir que a consulta da biblioteca não cria estado de carregamento nem erro na tela do jogo (FR-032 da feature 010).
  - T025 passa.

**Checkpoint**: as três histórias funcionam juntas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T029 [P] Atualizar os specs Playwright que dependem do layout antigo (research R7): `apps/web/e2e/support.ts` (helpers que esperam o `h1` "Escolha um dia" ou clicam em "Jogar a de hoje" passam a esperar o `h1` "Hoje" e clicar no cartão da fonte), `fluxo-principal.spec.ts`, `visitante.spec.ts`, `tamanhos.spec.ts`, `espera-servidor.spec.ts`.
- [ ] T030 [P] Em `apps/web/e2e/fontes.spec.ts`: substituir o uso do seletor por abas (`getByRole('tab', { name: /Cruzada Online/ })`), cobrir os dois cartões de hoje abrindo o puzzle da fonte certa e o atalho do diálogo de conclusão; com `page.setViewportSize` em 360 x 640 e em 1280 x 800, conferir com `toBeInViewport()` que os cartões de todas as fontes e as abas aparecem sem rolar (SC-002) e que `document.documentElement.scrollWidth <= innerWidth` (FR-015); repetir a página da biblioteca com `page.emulateMedia({ colorScheme: 'dark' })`.
- [ ] T031 [P] Atualizar `docs/design.md` (§2, parágrafo da Cruzada Online, e §5 `library/`): a escolha da fonte agora é pelos cartões de "Hoje" e pelas abas do calendário.
- [ ] T032 [P] Atualizar `CLAUDE.md`, "Current state": acrescentar o item da feature 015 (cartões "Hoje" por fonte, `SourceTabs`, `useSourceLibraries` com `useQueries`, `dayState`/`today-cards.ts`, fonte no `h1` do jogo e atalho de conclusão, fonte padrão = primeira da lista, layout para 1 a 3 fontes) e trocar a menção a `SourcePicker` no item da feature 014.
- [ ] T033 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` na raiz; tudo verde.
- [ ] T034 Rodar `npm run test:e2e -w @cruzadinha/web` contra a API e o Postgres locais com seed (CLAUDE.md, Commands) e seguir o roteiro manual de `specs/015-escolha-fonte/quickstart.md` (passos 1 a 8), em 360 px e 1280 px, nos temas claro e escuro.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todas as histórias. T003 depende de T002, T005 de T004, T007 de T006.
- **US1 (Phase 3)**: depende da Phase 2.
- **US2 (Phase 4)**: depende da Phase 2. Dentro dela, T022 (remover `SourcePicker`) só depois de T021, para o código nunca ficar sem compilar. Toca `LibraryPage.tsx` e `today-cards.ts` como a US1, então, com uma pessoa só, fazer depois da US1.
- **US3 (Phase 5)**: depende da Phase 2 (`dayState`, `useSourceLibraries`). Independente da US1 e da US2 em comportamento; divide `today-cards.ts` com elas.
- **Polish (Phase 6)**: depois das histórias escolhidas.

### Within Each User Story

- Testes antes e falhando; depois funções puras, componentes e a integração na página.

### Parallel Opportunities

- Phase 2: T002 e T004.
- US1: T008, T009 e T010.
- US2: T014, T015 e T016 (T017 vem depois de T016, no mesmo arquivo).
- US3: T023, T024 e T025.
- Polish: T029, T030, T031 e T032.

---

## Parallel Example: User Story 1

```text
Task: "T008 [US1] today-cards.test.ts (todayCard)"
Task: "T009 [US1] TodayCards.test.tsx"
Task: "T010 [US1] LibraryPage.test.tsx (cartões, visitante, API anterior, falha de uma fonte)"
```

## Parallel Example: User Story 3

```text
Task: "T023 [US3] today-cards.test.ts (otherSourceShortcut)"
Task: "T024 [US3] CompletionDialog.test.tsx"
Task: "T025 [US3] GamePage.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 e Phase 2.
2. Phase 3 (US1): os cartões de "Hoje" já resolvem o problema principal (a segunda fonte passa a ser vista e jogada com um toque).
3. **Parar e validar**: quickstart passos 1, 2 e 5.

### Incremental Delivery

1. US1 → cartões (MVP).
2. US2 → abas com contagem; a biblioteca fica igual ao mockup.
3. US3 → fonte no jogo e atalho de conclusão.
4. Polish → e2e, documentação e verificação completa.

Cada incremento é um commit `feat(web): …` próprio; o PR único da feature vai para `main`.

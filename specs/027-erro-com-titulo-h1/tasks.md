---

description: "Task list for feature 027: telas de erro com título de nível 1"
---

# Tasks: Telas de erro com título de nível 1

**Input**: Design documents from `/specs/027-erro-com-titulo-h1/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/error-state-heading.md, quickstart.md

**Tests**: obrigatórios. É uma correção: o teste de regressão de cada história vem antes da implementação, precisa falhar primeiro e entra no mesmo PR (constituição, Fluxo de Desenvolvimento). Unitários em Vitest + Testing Library (jsdom, sem rede); e2e em Playwright contra o build de produção, com axe.

**Organization**: uma fase por história da spec.

- US1 (tela do dia), US2 (outras telas de página inteira) e US3 (erro dentro de página com `h1`) são P1.
- US4 (e2e sem exceção) é P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: US1 a US4.
- Caminhos relativos à raiz do repositório. Só `apps/web` muda, mais `CLAUDE.md`. API, banco e `packages/shared` não mudam.

## Regras que valem para todas as tarefas

- O nível do título muda, a aparência não: o `.title` de `apps/web/src/app/ErrorState.module.css` (20 px, margem 0) e o de `ServerWake.module.css` ficam como estão. Cores só por tokens.
- Sem `any`; sem dependência nova; sem mudança de texto, de papel (`role="alert"`) nem de foco.
- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`.
- Commits em inglês, Conventional Commits, sem trailer de atribuição de IA (regra do `CLAUDE.md`). Escopo `web`; tipo `fix`.

## Phase 1: Setup

**Purpose**: medir a aparência atual para provar SC-004 depois.

- [X] T001 Com `npm run dev -w @cruzadinha/web`, medir (DevTools ou `getComputedStyle`) `font-size`, `font-weight`, `margin` e a caixa do título na tela do dia com a fonte falhando (bloquear `/api/puzzles`), nos temas claro e escuro, e anotar os valores em `specs/027-erro-com-titulo-h1/research.md` numa nova seção 7 ("Aparência antes da mudança").

- [X] T002 Consultar a documentação atual via Context7 MCP (regra da constituição) antes de escrever o e2e: `@axe-core/playwright` (`AxeBuilder`, `exclude`, `disableRules`) e Playwright (`page.route`, `page.clock`, `emulateMedia`, `getByRole` com `level`), confirmando as versões instaladas em `apps/web/package.json`; anotar em `specs/027-erro-com-titulo-h1/research.md`, seção 7, o que foi confirmado.

---

## Phase 2: Foundational (bloqueia as histórias)

**Purpose**: o componente aceita o nível; sem isso nenhuma história compila.

- [X] T003 Em `apps/web/src/app/ErrorState.test.tsx`, adicionar testes que renderizam `<ErrorState level={1} title="X" />` e `level={2}` e afirmam: `getByRole('heading', { level: 1 })` (ou 2) com o texto do título, ausência do outro nível, e `role="alert"` mantido no bloco. Rodar e ver falhar.
- [X] T004 Em `apps/web/src/app/ErrorState.tsx`, adicionar `level: 1 | 2` (obrigatório, sem padrão) a `ErrorStateProps` e renderizar o título como `<h1>` ou `<h2>` (mesma `className={styles.title}`). Os usos existentes deixam de compilar até as fases seguintes.

**Checkpoint**: após T004, T003 passa; `npm run typecheck -w @cruzadinha/web` aponta só os usos sem `level`. Como `level` é obrigatório, o typecheck só fica verde quando todos os usos forem corrigidos (T006, T011, T012, T013 e T017; a T014 não usa `ErrorState`); até lá, não commitar nem dar push (o pré-push roda o typecheck).

---

## Phase 3: User Story 1 — Título principal na tela de erro do dia (P1) 🎯 MVP

**Goal**: toda tela de erro de `/dia/:date` tem um único `h1`.

**Independent Test**: `/dia/<data passada sem cruzada>?fonte=oglobo` com 502: um `h1` com "A fonte está fora do ar agora.", axe sem violações nos dois temas.

- [X] T005 [US1] Em `apps/web/src/features/library/DayRoute.test.tsx`, nos testes que já provocam cada erro (futuro, fonte indisponível, 404, 502, 429, sem conexão, genérico), afirmar `getAllByRole('heading', { level: 1 })` com exatamente um item e o título esperado. Rodar e ver falhar (hoje é `h2`).
- [X] T006 [US1] Em `apps/web/src/features/library/DayRoute.tsx`, passar `level={1}` aos 6 usos de `ErrorState`.

**Checkpoint**: T005 passa (o typecheck do projeto ainda falha nos outros usos até a US2 e a US3).

---

## Phase 4: User Story 2 — Outras telas de erro de página inteira (P1)

**Goal**: cruzada não encontrada ou com falha, erro de rota, pedido de login da biblioteca e "Acordando o servidor" têm um único `h1`.

**Independent Test**: provocar cada situação e contar os `h1` (unitário) e rodar axe (e2e, US4).

- [X] T007 [P] [US2] Em `apps/web/src/features/game/GamePage.test.tsx`, nos testes de 404 ("Cruzada não encontrada.") e de falha/sem conexão ("Não foi possível abrir a cruzada"), afirmar um único `h1` com o título. Ver falhar.
- [X] T008 [P] [US2] Em `apps/web/src/app/RouteError.test.tsx`, afirmar um único `h1` nos casos "Algo deu errado", "Sem conexão" e "Não foi possível falar com o servidor." (e, no caso de revalidação, o `h1` "Acordando o servidor"). Ver falhar.
- [X] T009 [P] [US2] Em `apps/web/src/features/library/LibraryPage.test.tsx`, no caso da API antiga com visitante (401), afirmar um único `h1` "Entre para ver a biblioteca". Ver falhar.
- [X] T010 [P] [US2] Em `apps/web/src/features/status/ServerWake.test.tsx`, afirmar `getByRole('heading', { level: 1, name: 'Acordando o servidor' })` com a mensagem visível e que o foco continua no título quando `focusOnMount`. Ver falhar.
- [X] T011 [P] [US2] Em `apps/web/src/features/game/GamePage.tsx`, passar `level={1}` aos 2 usos de `ErrorState`.
- [X] T012 [P] [US2] Em `apps/web/src/app/RouteError.tsx`, passar `level={1}` aos 2 usos de `ErrorState`.
- [X] T013 [P] [US2] Em `apps/web/src/features/library/LibraryPage.tsx`, passar `level={1}` ao `ErrorState` "Entre para ver a biblioteca".
- [X] T014 [P] [US2] Em `apps/web/src/features/status/ServerWake.tsx`, trocar o `<h2 id="server-wake-title" …>` por `<h1 …>`, mantendo `id`, `className`, `ref` e `tabIndex`.
- [X] T015 [US2] Rodar `grep -rn "<ErrorState" apps/web/src` e confirmar que todo uso tem `level` e que `apps/web/src/app/NotFoundPage.tsx` segue `h1` (a tabela da seção 1 de `specs/027-erro-com-titulo-h1/research.md` já lista os usos; corrigi-la só se a conferência divergir).

**Checkpoint**: T007 a T010 passam; `npm run typecheck -w @cruzadinha/web` só falha em `LibraryPage.tsx` (falta o `level` do calendário, tratado na US3).

---

## Phase 5: User Story 3 — Erro dentro de página que já tem `h1` (P1)

**Goal**: a falha do calendário da biblioteca continua com um único `h1` ("Hoje") e o erro entra como `h2`.

**Independent Test**: simular falha de `/api/library`: um `h1` "Hoje", o erro como `h2`, sem nível pulado.

- [X] T016 [US3] Em `apps/web/src/features/library/LibraryPage.test.tsx`, no caso de falha do carregamento (e no offline), afirmar que há um único `h1` ("Hoje") e que o título do erro é `getByRole('heading', { level: 2 })`. Ver falhar com o `level` ausente (typecheck) ou com a tag errada.
- [X] T017 [US3] Em `apps/web/src/features/library/LibraryPage.tsx`, passar `level={2}` ao `ErrorState` de `calendarArea`.

**Checkpoint**: typecheck verde; T016 passa.

---

## Phase 6: User Story 4 — Verificação automática sem exceção (P2)

**Goal**: o axe roda nas telas de erro sem regra desativada; a falha não volta sem ninguém ver.

**Independent Test**: `botoes.spec.ts` e o novo spec passam nos dois temas; reintroduzir um `h2` num dos usos faz falhar.

- [X] T018 [US4] Em `apps/web/e2e/botoes.spec.ts`, trocar `await expectNoAxeViolations(page, ['page-has-heading-one'])` por `await expectNoAxeViolations(page)` e apagar as duas linhas de comentário acima dele. Remover o parâmetro `disabledRules` de `expectNoAxeViolations` e o `.disableRules(...)` se nada mais o usar.
- [X] T019 [US4] Criar `apps/web/e2e/erros-com-titulo.spec.ts` com `beforeEach(resetAndSeed)`, o mesmo `axe` de `botoes.spec.ts` (`new AxeBuilder({ page }).exclude('[role="grid"]')`) e, para cada tema (`page.emulateMedia({ colorScheme })`), os casos abaixo. Cada caso afirma `getByRole('heading', { level: 1 })` com `toHaveCount(1)` (e o texto esperado) e zero violações do axe, sem regra desativada. (a) Dia, com `page.route('**/api/puzzles?**', …)` em `/dia/<ontem>?fonte=oglobo`: 502, 404, 429 (com `Retry-After`) e rede caída (`route.abort('internetdisconnected')`). (b) Cruzada: `/jogo/<id>` com `page.route('**/api/puzzles/*', …)` em 404 e em 500. (c) Biblioteca: `page.route('**/api/library?**', …)` em 500 em `/` (um `h1` "Hoje", erro como `h2` sem nível pulado) e em 401 como visitante, simulando a API antiga (um `h1` "Entre para ver a biblioteca"). (d) "Acordando o servidor": `/api/health` atrasado, como `delayHealth` de `espera-servidor.spec.ts`. (e) Erro de rota "Não foi possível falar com o servidor.": `/api/health` com 503 e `page.clock` avançando 92 s, como o terceiro teste de `espera-servidor.spec.ts`; ali clicar em "Tentar de novo" e conferir que há um único `h1` durante e depois da espera (borda: o erro muda com a tela aberta). As variantes "Sem conexão" e "Algo deu errado" do erro de rota ficam só nos testes unitários (T008).
- [X] T020 [US4] No mesmo `apps/web/e2e/erros-com-titulo.spec.ts`, adicionar o teste de aparência (SC-004): na tela do dia com 502, ler `font-size`, `font-weight`, `color`, `margin` e a caixa (posição e tamanho, com `box()`) do título com `css()` de `apps/web/e2e/support.ts` e comparar com um `h2` de mesma classe colocado no lugar do `h1` (equivale aos valores de antes; tolerância 1 px, `expectNear`), nos dois temas.

**Checkpoint**: `npm run test:e2e -w @cruzadinha/web -- botoes.spec.ts erros-com-titulo.spec.ts` verde; `grep -rn "page-has-heading-one" apps/web` sem resultados.

---

## Phase 7: Polish & cross-cutting

- [X] T021 [P] Atualizar o `CLAUDE.md` com um item "Feature 027 (telas de erro com `h1`)" no bloco "Current state": `ErrorState` exige `level` (1 = página inteira, 2 = dentro de página com `h1`), `ServerWake` virou `h1`, o e2e de botões não desativa mais `page-has-heading-one`, e a regra "um `h1` por página" para telas novas.
- [X] T022 Rodar da raiz `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`; corrigir o que falhar. Rodar também o e2e completo do site (`npm run test:e2e -w @cruzadinha/web`) para confirmar que nenhum teste das features 010 a 024 quebrou (SC-005), e executar o roteiro de `specs/027-erro-com-titulo-h1/quickstart.md`.
- [ ] T023 Commitar com `fix(web): give full-page error screens a level-one heading` (corpo explicando o `level`; sem trailer de IA) e abrir o PR para `main` com resumo e plano de teste, seguindo `.claude/rules/git-conventions.md` (não usar a skill `open-mr`). Mencionar "Closes #46". Se a branch atual não seguir `fix/<slug>` (regra do `CLAUDE.md`), renomeá-la localmente antes do push.

---

## Dependencies & Execution Order

- Phase 1: T001 antes da T020; T002 antes da T019. Pode andar junto com a Phase 2.
- Phase 2 (T003, T004) bloqueia todas as histórias. T004 depende de T003 estar vermelho.
- US1 (T005–T006), US2 (T007–T015) e US3 (T016–T017) dependem só da Phase 2 e tocam arquivos diferentes, salvo `LibraryPage.tsx` e `LibraryPage.test.tsx` (T009/T013 e T016/T017: fazer em sequência).
- US4 (T018–T020) depende de US1 a US3 terminadas (o axe só passa com todas as telas corrigidas).
- Polish (T021–T023) por último; T022 depende de tudo.

## Parallel Example

Depois da Phase 2:

```text
T005 + T007 + T008 + T010      # testes vermelhos em arquivos diferentes
T006 + T011 + T012 + T014      # correções em arquivos diferentes
```

## Implementation Strategy

1. **MVP de teste**: Phase 2 + US1 (tela do dia, caso da issue) já tira o `h1` faltante da tela reportada. Como `level` é obrigatório, o código só compila com US1, US2 e US3 juntas; entregar tudo num único PR.
2. US2 e US3 completam o critério "outros usos de tela inteira" e "um único `h1` onde já havia".
3. US4 fecha o ciclo removendo a exceção do axe e travando a regressão.
4. Polish: documentação, verificação completa e PR.

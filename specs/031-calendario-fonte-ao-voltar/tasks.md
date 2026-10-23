# Tasks: Calendário volta na fonte do jogo

**Input**: `specs/031-calendario-fonte-ao-voltar/` (plan.md, spec.md, research.md, data-model.md, quickstart.md)

**Prerequisites**: plan.md, spec.md

**Tests**: pedidos pela regra de correção da constituição (começar por teste de regressão que falha, no mesmo PR) e pelo quickstart.

**Format**: `- [ ] T### [P?] [US?] Descrição com caminho`. `[P]` = arquivos diferentes, sem dependência de tarefa aberta.

Só `apps/web` muda. Sem API, sem schema, sem `shared`, sem migração (portanto sem DDE/ERD).

## Phase 1: Setup

Nada a preparar: sem dependência nova e sem arquivo de código novo.

## Phase 2: Foundational

- [x] T001 Em `apps/web/src/features/library/source-choice.test.ts` escrever os testes que falham antes do código: (a) `useSourceChoice` começa na fonte lembrada quando há uma válida; (b) começa em `loadSourceChoice()` quando não há nada lembrado; (c) trocar de aba não grava em `cruzadinha:settings`. Rodar e ver falhar

## Phase 3: User Story 1 - Voltar do jogo para o calendário da mesma fonte (P1)

**Goal**: ao voltar de um jogo, o calendário abre na aba da fonte desse jogo, por qualquer caminho de volta.

**Independent Test**: padrão O Globo → aba Cruzada Online → abrir jogo → voltar: aba Cruzada Online selecionada (link, cabeçalho, botão "Voltar" do navegador).

- [x] T002 [US1] Em `apps/web/src/features/library/source-choice.ts` guardar a fonte lembrada num `let` do módulo e exportar `rememberGameSource(source: unknown)` (aceita só o que `puzzleSourceIdSchema.safeParse` aprova; qualquer outro valor apaga a memória) e `clearRememberedSource()`; trocar o inicializador de `useSourceChoice` para usar a fonte lembrada, senão `loadSourceChoice()`; comentário curto com o porquê (módulo, não URL: cobre o botão do navegador e zera ao recarregar)
- [x] T003 [US1] Em `apps/web/src/features/game/GamePage.tsx` chamar `rememberGameSource(puzzle.source)` num `useEffect` quando a cruzada carrega (dependência: a fonte), de modo que cartão "Hoje", `/dia/...` e "Ir direto ao jogo" também valham (FR-003)
- [x] T004 [US1] (também em `apps/web/src/app/AppLayout.tsx`: limpar em `/login` e `/cadastro`, achado pelo e2e) Em `apps/web/src/features/library/LibraryPage.tsx` chamar `clearRememberedSource()` num `useEffect` sem dependências variáveis logo após montar, para que a troca de aba não vire memória e o calendário aberto de outra página valha a cruzada padrão (FR-005, história 2, cenário 3). T001 deve passar
- [x] T005 [P] [US1] Teste de componente em `apps/web/src/features/library/LibraryPage.test.tsx` (usar `src/test/render`, `http`, `fixtures`): com `rememberGameSource('cruzadaonline')` antes de montar e cruzada padrão O Globo, a aba Cruzada Online vem selecionada; com fonte inválida, a padrão; depois da montagem a memória está apagada, então uma segunda montagem abre na cruzada padrão
- [x] T006 [US1] E2E em `apps/web/e2e/fontes.spec.ts`: abrir um jogo de Cruzada Online e voltar por "Voltar à biblioteca", pelo link do cabeçalho, pelo botão "Voltar" do navegador e pelo botão "Voltar à biblioteca" do diálogo de conclusão (`navigate('/')`), confirmando a aba selecionada; e jogo aberto pelo cartão "Hoje" de outra fonte volta nessa fonte

## Phase 4: User Story 2 - A cruzada padrão continua valendo ao abrir o site (P1)

**Goal**: a cruzada padrão decide a aba só ao chegar ao site; nada vira preferência.

**Independent Test**: voltar de um jogo de Cruzada Online (aba Cruzada Online), recarregar: aba da cruzada padrão.

- [x] T007 [US2] E2E em `apps/web/e2e/fontes.spec.ts`: depois de voltar de um jogo de outra fonte, recarregar a página abre a cruzada padrão; ir do jogo ao login e voltar pelo cabeçalho abre a cruzada padrão; trocar de aba não muda `cruzadinha:settings` (FR-004, FR-005, SC-004); mudar a cruzada padrão nas configurações com o calendário aberto não troca a aba mostrada
- [x] T008 [US2] Garantir que `apps/web/src/features/settings/SettingsDialog.tsx` e `apps/web/src/app/direct-play.ts` seguem usando só `loadSourceChoice()` (sem a memória da visita): "Ir direto ao jogo" e o seletor da cruzada padrão não mudam (FR-007); acrescentar em `apps/web/src/app/direct-play.test.ts` um caso: com `rememberGameSource('cruzadaonline')` e cruzada padrão O Globo, o atalho continua indo à cruzada de hoje de O Globo

## Phase 5: Polish & cross-cutting

- [x] T009 [P] Atualizar `CLAUDE.md` (lista de features: entrada da feature 031 e a frase "the tab is no longer remembered" da 021) e acrescentar a nota de ajuste em `specs/021-configuracoes-usuario/spec.md` (cenário 6 da história 2 e Assumptions: a regra passa a valer só ao abrir o site)
- [x] T010 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e -w @cruzadinha/web -- fontes.spec.ts` (ver `quickstart.md`); conferir que os testes de T001 e T006 falhavam antes da correção e passam agora; conferir à mão (`npm run dev -w @cruzadinha/web`) o modo leitura, duas abas do navegador abertas (voltar de um jogo numa não muda a outra) e a fonte fora do ar ao voltar (aviso já existente na aba)
- [ ] T011 Renomear a branch para `fix/031-calendario-fonte-ao-voltar` (`npm run check:branch` passa) antes de subir; commits em inglês, sem trailer de IA (regra do `CLAUDE.md`)

## Dependencies

- T001 antes de T002–T004 (regressão primeiro).
- T002 antes de T003, T004, T005. T003 e T004 mexem em arquivos diferentes e só dependem de T002.
- T006 e T007 dependem de T003 e T004. T008 independe das demais depois de T002.
- T009 e T011 só no fim; T010 por último antes do PR.

## Parallel example

Depois de T002: T003, T004 e T005 em paralelo (três arquivos).

## Implementation strategy

MVP = Phase 2 + Phase 3 (US1). US2 não exige código novo além de T004 (apagar a memória); T007 e T008 provam que a regra da 021 segue de pé. Entregar tudo num PR de `fix`.

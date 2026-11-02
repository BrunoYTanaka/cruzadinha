---

description: "Tarefas da feature 059: carregamento padronizado e amigável"
---

# Tasks: Carregamento padronizado e amigável

**Input**: `/specs/059-loading-padronizado/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-loading.md`, `quickstart.md`)

**Tests**: o projeto exige teste ao lado de cada unidade (pasta própria com `.module.css` e testes, regra da 037), então cada unidade nova tem a tarefa de teste dela. Os testes usam timers falsos e nunca a rede.

**Format**: `- [ ] T### [P?] [US?] Descrição com caminho`. Caminhos partem de `apps/web/src/`. `[P]` = arquivos diferentes, sem dependência pendente.

## Phase 1: Setup

- [X] T001 Consultar a documentação atual via Context7 MCP (constitution, Fluxo de Desenvolvimento) de `react-router` (`Link`, `StaticRouter`, `popstate`), `vitest` (`vi.useFakeTimers`) e `@playwright/test` (`emulateMedia`, medidas de layout) e anotar em `research.md` (seção R7) qualquer diferença de API que mude o plano. Conferir que a branch é `feat/059-loading-padronizado` e rodar `npm run typecheck && npm test` em `apps/web` para ter a linha de base verde antes de mexer.

## Phase 2: Foundational (bloqueia todas as histórias)

- [X] T002 [P] Criar `shared/hooks/useSlowAfter/useSlowAfter.ts`: `useSlowAfter(active: boolean, delayMs = WAKE_NOTICE_DELAY_MS)` devolve `{ slow, elapsedSeconds }`; conta desde que `active` virou `true`, zera quando volta a `false`, limpa o timer ao desmontar. Importar `WAKE_NOTICE_DELAY_MS` de `shared/services/api/server-wake/server-wake.ts` (não alterar esse arquivo). Teste em `useSlowAfter.test.ts` com `vi.useFakeTimers()`: `false` antes de 2 s, `true` aos 2 s, contador em segundos inteiros, reinício ao desativar.
- [X] T003 [P] Criar `shared/components/LoadingState/loading-screens.ts`: `type LoadingScreen = 'entry' | 'game' | 'day' | 'library' | 'stats'` e `LOADING_SCREENS: Record<LoadingScreen, { title: string; word: string }>` com exatamente os cinco pares de `data-model.md` (Preparando as palavras…/CRUZADA, Montando a grade…/GRADE, Procurando a cruzada de hoje…/BUSCANDO, Folheando o calendário…/CALENDÁRIO, Contando seus acertos…/ACERTOS) e a constante `SLOW_MESSAGE = 'O servidor tirou uma soneca. Já estamos acordando ele, pode levar até um minuto.'`. Teste em `loading-screens.test.ts`: cinco chaves, nenhum título ou palavra vazio, palavras só com letras.
- [X] T004 [P] Criar `shared/components/SlowNotice/SlowNotice.tsx` + `SlowNotice.module.css` + `SlowNotice.test.tsx`: `<SlowNotice active />` renderiza um bloco de altura mínima fixa (para não deslocar o layout) com `role="status"`; o texto `SLOW_MESSAGE` só entra no DOM quando `active` é `true` (para o leitor de tela anunciar quando surge), com fade curto e sem fade em `prefers-reduced-motion`. Cor `var(--mute)`. Teste: vazio com `active={false}`, texto com `active`, sem violação no `vitest-axe`.

**Checkpoint**: hook, textos e aviso prontos; as histórias seguem em qualquer ordem.

## Phase 3: User Story 2 — Uma tela de espera só, bonita e amigável (P1)

**Goal**: `LoadingState` único com casas, título amigável, e mensagem + barra + contador após 2 s, absorvendo o `ServerWake`.

**Independent Test**: com o servidor lento, abrir `/calendario`, `/estatisticas`, `/jogo/:id`, `/dia/:data` e a entrada (`quickstart.md` passo 3): mesmo layout, título e palavra de cada tela, aviso aos 2 s sem nada se mexer; com API rápida o aviso não aparece.

- [X] T005 [US2] Criar `shared/components/LoadingState/CrosswordCells.tsx` + `CrosswordCells.module.css` + `CrosswordCells.test.tsx`: `<CrosswordCells word />` desenha uma casa por letra (`[...word]`), número 1 na primeira, `aria-hidden="true"`, `flex-wrap` e casas menores abaixo de 480 px; onda amarela (`--sel`/`--sel-ink`) só com `transform` e `background-color`, atraso `calc(var(--i) * 0.12s)`; `@media (prefers-reduced-motion: reduce)` sem animação. Fonte de títulos: `'Fraunces Variable', Georgia, serif` como em `features/landing`; cores só de tokens. Teste: uma casa por letra, `aria-hidden`.
- [X] T006 [US2] Criar `shared/components/LoadingState/LoadingState.tsx` + `LoadingState.module.css` + `LoadingState.test.tsx` conforme `contracts/ui-loading.md`: props `screen = 'entry'`, `level?: 1 | 2`, `immediate?`, `focusOnMount?`. Lento quando `useSlowServer().slow` ou `useSlowAfter(true).slow` ou `immediate`; título (`h1`/`h2`/`p` conforme `level`, `tabIndex={-1}` e foco com `focusOnMount`) e casas **nunca** trocam; abaixo, bloco de altura reservada com `SlowNotice`, barra de progresso (`aria-hidden`, `translateX`, parada em movimento reduzido) e contador "N s esperando" (`font-variant-numeric: tabular-nums`) escondidos com `visibility: hidden` antes de ficar lento. Teste: título/palavra de cada tela, mensagem ausente aos 1,9 s e presente aos 2 s, `immediate`, `focusOnMount`, título e casas iguais antes e depois, `vitest-axe` nos dois estados.
- [X] T007 [US2] Em `shared/components/ErrorState/ErrorState.tsx` remover o `LoadingState` antigo e o `.loading`/`.hint` de `ErrorState.module.css`; ajustar `ErrorState.test.tsx` (os casos de `LoadingState` migram para o teste do T006). Atualizar os imports de `LoadingState` para `shared/components/LoadingState/LoadingState` em `pages/library/LibraryPage.tsx`, `pages/day/DayRoute.tsx`, `pages/game/GamePage.tsx` e `pages/stats/StatsPage.tsx`, trocando `label=` por `screen="library" | "day" | "game" | "stats"` (`level={2}` ou ausente onde a página já tem `h1`).
- [X] T008 [US2] Absorver o `ServerWake`: em `app/router.tsx` (dois `hydrateFallbackElement`), `pages/landing/LandingPage.tsx` (modo `directToGame`) e `app/RouteError.tsx` (`immediate focusOnMount level={1}`) trocar `<ServerWake …/>` por `<LoadingState screen="entry" level={1} …/>`; apagar a pasta `features/status/components/ServerWake/` e o export em `features/status/index.ts` (se o `index.ts` ficar vazio, apagar o arquivo e conferir `npm run check:deps`).
- [X] T009 [US2] Atualizar os testes e e2e que citam o texto antigo: `app/router.test.tsx`, `app/RouteError.test.tsx`, `pages/library/LibraryPage.test.tsx`, `pages/library/direct-play.test.ts`, `pages/game/GamePage.test.tsx`, `features/session/services/viewer.test.tsx`, `features/library/components/TodayCards/TodayCards.test.tsx` (rodar `grep -rn "Carregando\|Acordando o servidor\|Buscando a cruzada" src e2e` e ajustar cada ocorrência que sobrar; arquivo sem ocorrência não muda), `e2e/espera-servidor.spec.ts`, `e2e/espera-sessao.spec.ts` e `e2e/erros-com-titulo.spec.ts`; checar também `features/account/hooks/useRegistration.ts` e `test/render.tsx` por menções. As buscas passam a usar o título amigável ou o papel `status`.

**Checkpoint**: US2 completa e testável sozinha; a espera de entrada e das quatro páginas já usa a tela nova.

## Phase 4: User Story 1 — Botões da landing que respondem ao clique (P1)

**Goal**: os quatro links da landing para `/jogar` e `/calendario` reagem na hora e avisam aos 2 s.

**Independent Test**: com a API lenta, abrir `/`, clicar em "Jogar a cruzada de hoje": "Abrindo…" na hora, aviso aos 2 s sem deslocar nada; "Experimentar aqui" só rola.

- [X] T010 [US1] Criar `features/landing/components/PlayLink/PlayLink.tsx` + `PlayLink.module.css` + `PlayLink.test.tsx`: `<PlayLink to variant? size? className? pendingLabel="Abrindo…">` usa `Link` de `react-router`; com `variant` aplica `landingButtonClass`, sem ela só a `className` (o link "Ver o calendário" tem estilo próprio); estado local `pending` ligado no `onClick` (sem `useNavigation`, que quebra no `StaticRouter`); `aria-busy`, texto trocado, cliques seguintes com `preventDefault`; `useSlowAfter(pending)` mostra `SlowNotice` na linha reservada; limpa `pending` no `popstate`. Importar só de `shared/` e da própria feature. Teste com `MemoryRouter`: reação imediata (o texto "Abrindo…" já está na tela logo depois do `click`, sem avançar timers, cobrindo SC-001), segundo clique ignorado, aviso aos 2 s, `popstate` limpa, renderiza sem erro em `StaticRouter` (como o prerender).
- [X] T011 [US1] Usar o `PlayLink` em `features/landing/components/Hero/Hero.tsx` ("Jogar a cruzada de hoje"), `FinalBand/FinalBand.tsx` ("Jogar agora" e "Ver o calendário", este sem `variant` e com `className={styles.calendar}`) e `MiniCrossword/MiniCrossword.tsx` (link "Jogar a cruzada de hoje" que aparece ao resolver). Reservar a linha do aviso em cada local sem criar salto (`min-height` no contêiner dos botões). "Experimentar aqui" e o cabeçalho ficam intactos. Ajustar `Hero.test.tsx`, `FinalBand.test.tsx` e `MiniCrossword.test.tsx`.
- [X] T012 [US1] Rodar `npm run build -w @cruzadinha/web` e `npm run check:build-output -w @cruzadinha/web` para provar que o prerender da landing continua gerando o HTML (o `PlayLink` roda no `renderToString`).

**Checkpoint**: US1 completa; US1 e US2 já entregam o valor principal.

## Phase 5: User Story 3 — Botões de envio que explicam a demora (P2)

**Goal**: botões de envio dos formulários de conta com indicador, largura fixa e aviso aos 2 s.

**Independent Test**: com a API lenta, enviar o login: botão com spinner, mesma largura, aviso aos 2 s abaixo, sem mover os campos (`quickstart.md` passo 4).

- [X] T013 [US3] Em `shared/components/Button/Button.tsx` (+ `Button.module.css`, `Button.test.tsx`) somar `pending?: boolean`: `disabled`, `aria-busy="true"`, spinner CSS antes do texto (parado em movimento reduzido) e largura travada medindo o botão ao entrar em `pending` (`min-width` em px por `ref`, removida ao sair). Sem `pending` o componente é igual ao atual (não mexer em `buttonClass`). Testes: `aria-busy`, `disabled`, sem `pending` nada muda, `vitest-axe`.
- [X] T014 [P] [US3] Em `features/account/components/LoginForm/LoginForm.tsx` usar `pending={login.isPending}` e `<SlowNotice active={slow} />` abaixo do botão com `useSlowAfter(login.isPending)`; ajustar `LoginForm.test.tsx`.
- [X] T015 [P] [US3] Mesmo tratamento em `RegisterForm.tsx` (`registerMutation`), `ForgotPasswordForm.tsx` (`mutation`), `VerifyEmailForm.tsx`, `ResetPasswordForm.tsx`, `ChangePasswordForm.tsx` e `ChangeEmailForm.tsx` (todos em `features/account/components/<Nome>/`), mantendo os textos "Enviando…", "Criando…", "Salvando…" e as regras de `disabled` já existentes (captcha, espera de reenvio); ajustar o teste de cada um. Não alterar `DeleteAccountDialog` nem `LogoutOthersButton`.

**Checkpoint**: as três histórias entregues.

## Phase 6: Polish & Cross-Cutting

- [X] T016 [P] Estender `e2e/sem-saltos.spec.ts` (ou um spec novo ao lado) para medir que a entrada do aviso no `LoadingState` e no `PlayLink` não muda a posição de nenhum elemento, e que o botão do login mantém a largura em `pending`.
- [X] T017 [P] Verificar a acessibilidade e o movimento reduzido com `vitest-axe` e `emulateMedia({ reducedMotion: 'reduce' })` nos estados lento e normal, nos temas claro e escuro, em 320 px de largura (casas sem rolagem lateral).
- [X] T018 Rodar `npm run format`, `npm run lint` (inclui `check:deps`), `npm run typecheck`, `npm test` e `npm run test:e2e -w @cruzadinha/web` (com API e Postgres locais, ver `quickstart.md`); corrigir o que falhar. Conferir com `git diff --stat main -- apps/web/src/shared/services/api/server-wake/server-wake.ts` que o arquivo não mudou (FR-014).
- [X] T019 Percorrer `quickstart.md` à mão com a API lenta e anotar o resultado. Atualizar a linha de "Cold start" de `docs/design.md` (hoje cita "Acordando o servidor" depois de 2 s) para a tela única com a mensagem da soneca. Atualizar `CLAUDE.md` com um parágrafo da feature 059 (LoadingState único, `SlowNotice`, `Button pending`, `PlayLink`, ServerWake removido, `server-wake.ts` intacto).

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T002, T003, T004 em paralelo) → histórias → Phase 6.
- **US2** (T005 → T006 → T007 → T008 → T009) depende de T002, T003, T004.
- **US1** (T010 → T011 → T012) depende de T002 e T004; independe da US2.
- **US3** (T013 → T014/T015) depende de T002 e T004; independe das outras.
- T016 a T019 depois das histórias.

## Parallel Example

Depois do Foundational: uma pessoa em US2 (T005 a T009), outra em US1 (T010 a T012), outra em US3 (T013 a T015). Dentro da US3, T014 e T015 são arquivos distintos e correm juntos.

## Implementation Strategy

- **MVP**: Foundational + US1 + US2 (as duas P1); entrega o fim do "botão morto" e a tela única. Parar e validar com `quickstart.md`.
- Depois US3 e o Polish. Cada fase fecha com `typecheck` e os testes da pasta verdes.
- Commits em inglês e Conventional Commits, sem atribuição de IA (regra do projeto): `feat(web): …` para cada fase.

---
description: "Lista de tarefas da feature 010: front básico do Cruzadinha"
---

# Tasks: Front básico do Cruzadinha

**Input**: Documentos de design em `/specs/010-front-basico/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (`api-usage.md`, `ui-contracts.md`), quickstart.md

**Tests**: incluídos. A constituição (princípios V e VII) exige teste unitário para toda regra de jogo e dois caminhos ponta a ponta; o plano também prevê teste de contraste dos tokens e verificação de acessibilidade. Os testes de cada história vêm antes da implementação e devem falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário (US1 a US7), na ordem de prioridade da spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história de usuário da spec (US1 a US7); fases de Setup, Foundational e Polish não têm rótulo
- Todo caminho é relativo à raiz do repositório

## Path Conventions

Monorepo npm workspaces. Todo código novo fica em `apps/web/` (`src/` e `e2e/`); `packages/shared` só é consumido (nenhum schema novo); a API não muda. Nada aqui altera o servidor.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependências, configuração do Vite e ferramentas de teste

- [X] T001 Instalar as dependências novas em `apps/web/package.json` (e atualizar `package-lock.json`): `react-router` 7, `@fontsource/roboto`, `@fontsource/roboto-mono`; dev: `@testing-library/user-event`, `vitest-axe`, `@playwright/test`, `@axe-core/playwright`, `postgres` (só para os auxiliares de ponta a ponta); rodar `npm ci` para confirmar que o lock fecha
- [X] T002 [P] Acrescentar `VITE_HELP_LETTER_LIMIT=4` e `VITE_HELP_WORD_LIMIT=2` a `.env.example`, com comentário de que são lidos no build e que só variáveis com prefixo `VITE_` chegam ao navegador (sem segredos)
- [X] T003 [P] Em `apps/web/vite.config.ts`: `envDir` apontando para a raiz do repositório e o mesmo proxy de `/api` também em `preview.proxy`, ambos lendo `API_PROXY_TARGET`
- [X] T004 [P] Criar `apps/web/src/vite-env.d.ts` tipando `ImportMetaEnv` com `VITE_HELP_LETTER_LIMIT` e `VITE_HELP_WORD_LIMIT` como `string | undefined` (sem `import` no arquivo)
- [X] T005 [P] Criar `apps/web/playwright.config.ts` (servidor via `vite preview`, só o projeto Chromium, `testDir: 'e2e'`), o script `test:e2e` em `apps/web/package.json` e as entradas `playwright-report/` e `test-results/` no `.gitignore` da raiz
- [X] T006 [P] Garantir que `apps/web/tsconfig.json`, `apps/web/tsconfig.node.json` e o `eslint.config.mjs` da raiz cubram `apps/web/e2e/` (typecheck e lint rodando nos arquivos de teste ponta a ponta)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: base compartilhada por todas as histórias. Nenhuma história começa antes disto.

**⚠️ CRITICAL**: sem esta fase não há roteador, cliente de API, tema nem componentes base.

- [X] T007 [P] Criar `apps/web/src/lib/storage.ts` (`readStorage`, `writeStorage`, `removeStorage` para `localStorage` e `sessionStorage`, cada acesso dentro de `try/catch`, devolvendo `null` quando indisponível) e `apps/web/src/lib/storage.test.ts` simulando armazenamento que lança exceção
- [X] T008 [P] Criar `apps/web/src/lib/dates.ts` (`todayInBrasilia(now)` via `Intl.DateTimeFormat` com `America/Sao_Paulo`, `toIsoDate`, `monthKey`, `addMonths`) e `apps/web/src/lib/dates.test.ts` cobrindo virada de dia perto da meia-noite de Brasília
- [X] T009 [P] Criar `apps/web/src/lib/time.ts` (`formatElapsed(ms)` → `mm:ss`, e `h:mm:ss` a partir de 1 hora; teto de 604800000 ms; e `formatWait(seconds)` → "N s" até 59 s e "N min" (arredondado para cima) a partir de 60 s, usada por todas as mensagens de espera) e `apps/web/src/lib/time.test.ts`
- [X] T010 [P] Criar `apps/web/src/config.ts` validando com Zod `VITE_HELP_LETTER_LIMIT` (padrão `4`) e `VITE_HELP_WORD_LIMIT` (padrão `2`) como inteiros de 0 a 99, abortando com mensagem clara quando inválidos, e `apps/web/src/config.test.ts`
- [X] T011 [P] Criar os arquivos de tema em `apps/web/src/themes/`: `fonts.css` (importa Roboto 400, 500 e 700 e Roboto Mono 500, subconjunto latino, `font-display: swap`), `tokens.css` (lista dos nomes de token de `contracts/ui-contracts.md`), `light.css` e `dark.css` (valores tirados de `docs/mockups/game.html`, tema escuro por `prefers-color-scheme` e por `data-theme="dark"`, tema claro por `data-theme="light"`), e `global.css` (fonte Roboto com pilha de reserva, `:focus-visible` com `--focus`, regra global de `prefers-reduced-motion` que zera animações e transições, alvos de 44 px nos controles)
- [X] T012 Criar `apps/web/src/themes/theme.ts` (`Theme = 'auto' | 'light' | 'dark'`, `readTheme`, `saveTheme`, `applyTheme`, `nextTheme`; chave `cruzadinha:theme`) e `apps/web/src/themes/theme.test.ts`; acrescentar a `apps/web/index.html` `lang="pt-BR"`, o título e o script inline mínimo que lê `cruzadinha:theme` e define `data-theme` antes da primeira pintura
- [X] T013 Criar `apps/web/src/api/client.ts` (`apiRequest(path, schema, init)`: `fetch` com `credentials: 'same-origin'`, resposta como `unknown` validada por Zod, `ApiRequestError { status, code?, retryAfterSeconds? }` lido de `apiErrorSchema` e do cabeçalho `Retry-After`, falha de rede como `status: 0`; guarda a diferença entre o cabeçalho `Date` da resposta e o relógio do aparelho em `getServerClockOffsetMs()`; `401 unauthenticated` chama um tratador registrado com `setUnauthenticatedHandler` (a guarda de sessão redireciona ao login com o endereço de origem fora da rota `/jogo`; na rota `/jogo` o tratador só marca a sessão como expirada, sem redirecionar) exceto em `/login` e `/cadastro`) e `apps/web/src/api/client.test.ts` com `fetch` injetado, cobrindo o desvio do relógio e os dois comportamentos do `401`
- [X] T014 [P] Criar `apps/web/src/api/auth.ts` (`getMe`, `login`, `register`, `logout` usando `authResponseSchema`, `loginRequestSchema`, `registerRequestSchema` de `@cruzadinha/shared`) e `apps/web/src/api/query-keys.ts` (`session`, `library`, `puzzle(id)`, `puzzleByDate(date)`, `progress(id)`, `invites`)
- [X] T015 [P] Criar `apps/web/src/api/library.ts` (`getLibrary` com `libraryResponseSchema`) e `apps/web/src/api/puzzles.ts` (`getPuzzleById`, `getPuzzleByDate(date)` com `puzzleResponseSchema`, nível `daily`)
- [X] T016 [P] Criar `apps/web/src/api/progress.ts` (`getProgress`, `saveProgress`, `resetProgress` com `progressEnvelopeSchema` e `saveProgressRequestSchema`; `saveProgress` aceita `keepalive`)
- [X] T017 [P] Criar `apps/web/src/api/invites.ts` (`createInvite` com `createdInviteSchema`, `listInvites` com `inviteListSchema`)
- [X] T018 [P] Criar `apps/web/src/components/Button.tsx`, `Pill.tsx`, `VisuallyHidden.tsx` e seus módulos CSS em `apps/web/src/components/`, lendo só tokens, com altura mínima de 44 px
- [X] T019 Criar `apps/web/src/components/Dialog.tsx` (diálogo acessível: `role="dialog"`, `aria-modal="true"`, título e descrição por `aria-labelledby` e `aria-describedby`, foco inicial no botão principal, `Esc` fecha, foco volta ao elemento de origem, prende o foco) e `apps/web/src/components/Dialog.test.tsx` com `user-event` e `vitest-axe`
- [X] T020 [P] Criar `apps/web/src/app/ErrorState.tsx` (carregando, erro com "Tentar de novo", erro com tempo de espera) e `apps/web/src/app/NotFoundPage.tsx` com link para a biblioteca, em português do Brasil
- [X] T021 [P] Criar `apps/web/src/components/Notice.tsx`, `Notice.module.css` e `Notice.test.tsx`: aviso que não bloqueia (variantes informação, aviso e erro), região `aria-live="polite"` (`role="alert"` só para erro), botão de ação opcional ("Entrar de novo", "Ver como ficou"), colocado fora do tabuleiro, nunca cobre o jogo nem toma o foco
- [X] T022 Criar `apps/web/src/app/router.tsx` (rotas `/login`, `/cadastro`, `/`, `/dia/:date`, `/jogo/:puzzleId` com `lazy`, `/status` e `*`), `apps/web/src/app/RequireSession.tsx` (loader que garante `GET /api/auth/me` pelo TanStack Query e, sem sessão, redireciona a `/login` com o endereço de origem em `?next=`) e `apps/web/src/app/AppLayout.tsx` (cabeçalho com nome, espaço para o tema e botão "Sair"); mover o conteúdo de `apps/web/src/app/App.tsx` e `App.test.tsx` para `apps/web/src/features/status/StatusPage.tsx` e `StatusPage.test.tsx`, atualizar `apps/web/src/main.tsx` para `RouterProvider` e importar os CSS de tema e globais; manter `StrictMode` e `QueryClientProvider`

**Checkpoint**: roteador, tema, cliente de API e componentes base prontos; as histórias podem começar.

---

## Phase 3: User Story 1 - Entrar e criar conta com convite (Priority: P1) 🎯 MVP

**Goal**: criar a conta com convite, entrar, sair, e nenhuma outra tela acessível sem sessão.

**Independent Test**: com um convite válido criado pela CLI, cadastrar, sair e entrar de novo, chegando à biblioteca nas duas vezes; sessão expirada leva ao login e volta ao ponto de origem.

### Tests for User Story 1 ⚠️ (escrever antes e ver falhar)

- [X] T023 [P] [US1] Teste de `LoginPage` em `apps/web/src/features/auth/LoginPage.test.tsx`: erro `invalid-credentials` mostra "E-mail ou senha incorretos." sem revelar o e-mail, `429` mostra o tempo de espera de `Retry-After`, `400 invalid-input` marca os campos de `fields`, sucesso redireciona ao endereço de origem ou à biblioteca, com sessão já válida redireciona sem mostrar o formulário
- [X] T024 [P] [US1] Teste de `RegisterPage` em `apps/web/src/features/auth/RegisterPage.test.tsx`: `invalid-invite` mostra "Convite inválido.", `registration-failed` mostra "Não foi possível criar a conta.", senha com menos de 8 caracteres bloqueia o envio, sucesso vai à biblioteca
- [X] T025 [P] [US1] Teste de `RequireSession` em `apps/web/src/app/RequireSession.test.tsx`: sem sessão vai a `/login` com `state.from`; depois do login volta ao endereço de origem; `401` fora do tabuleiro limpa o cache e redireciona, e `401` na rota `/jogo` não redireciona (marca a sessão como expirada); "Sair" encerra e volta ao login
- [X] T026 [P] [US1] Teste de `ReloginDialog` em `apps/web/src/features/auth/ReloginDialog.test.tsx`: abre sobre a tela sem sair dela, e-mail da sessão anterior pré-preenchido e somente leitura, senha incorreta mostra a mensagem genérica, `429` mostra a espera, sucesso fecha a janela e chama o `onSuccess` recebido (um espião no teste), fechar sem entrar mantém o aviso e o jogo, `Esc` fecha e o foco volta ao botão de origem; se o login devolver outro `userId`, encerra essa sessão e mostra "Entre com a conta desta partida"

### Implementation for User Story 1

- [X] T027 [P] [US1] Criar `apps/web/src/features/auth/messages.ts` com os textos fixos em português do Brasil (credenciais, convite inválido, cadastro recusado, limite de tentativas com o tempo de espera de `formatWait`), sem nunca dizer se o e-mail existe ou o motivo da recusa do convite
- [X] T028 [US1] Criar `apps/web/src/features/auth/useSession.ts` (`useSessionQuery`, `useLoginMutation`, `useRegisterMutation`, `useLogoutMutation`; ao sair limpa o cache e vai ao login mesmo se a chamada falhar)
- [X] T029 [US1] Criar `apps/web/src/features/auth/LoginPage.tsx` e `LoginPage.module.css`: rótulos visíveis ligados aos campos, `autocomplete="username"` e `"current-password"`, erro em região `role="alert"`, link para `/cadastro`, redireciona se já há sessão
- [X] T030 [US1] Criar `apps/web/src/features/auth/RegisterPage.tsx` e `RegisterPage.module.css`: campos código do convite, e-mail e senha ("No mínimo 8 caracteres"), `autocomplete="new-password"`, dica "Peça a um amigo que já joga.", link para `/login`
- [X] T031 [US1] Ligar "Sair" em `apps/web/src/app/AppLayout.tsx` à mutação de logout e esconder o botão nas rotas públicas; cabeçalho de login e cadastro só com o nome
- [X] T032 [US1] Criar `apps/web/src/app/session-expired.ts` (armazenamento fora do React, com o hook `useSessionExpired`, que guarda se a sessão expirou, o último usuário e `markExpired`/`clearExpired`; só marca sem redirecionar quando a rota é `/jogo`; feito como módulo e não como Context porque quem marca é o cliente de API) e `apps/web/src/app/session-handlers.ts` (`installSessionHandlers`) e `apps/web/src/features/auth/ReloginDialog.tsx` sobre `Dialog` (props `{ email, onSuccess }`, sem conhecer o `save-queue`), e `apps/web/src/features/auth/SessionExpiredNotice.tsx` com o `Notice` "Sua sessão expirou. Entre de novo para salvar" e o botão que abre a janela; o tratador é registrado em `createAppRouter` via `setUnauthenticatedHandler` (feito em `session-handlers.ts`, sem editar `AppLayout.tsx` nem `client.ts`)

**Checkpoint**: US1 funciona sozinha (login, cadastro, sair, guarda com retorno).

---

## Phase 4: User Story 2 - Escolher um dia na biblioteca (Priority: P1)

**Goal**: calendário mensal com a situação de cada dia, atalho para hoje e busca de dias passados não guardados.

**Independent Test**: abrir a biblioteca e abrir a cruzada de hoje, uma já concluída e um dia passado ainda não guardado, vendo carregando e cada erro com seu motivo.

### Tests for User Story 2 ⚠️

- [X] T033 [P] [US2] Teste de `calendar.ts` em `apps/web/src/features/library/calendar.test.ts`: domingo como primeiro dia, dias em branco no início, estados `completed`, `in_progress`, `not_started`, `future`, `fetchable` e `none`, `isToday` em data de Brasília, navegação limitada a 12 meses antes de hoje
- [X] T034 [P] [US2] Teste de `LibraryPage` em `apps/web/src/features/library/LibraryPage.test.tsx`: estados por texto e não só por cor ("12:41", "Em jogo", "Jogar", "Buscar"), dia futuro sem ação, botões de mês com 44 px e desabilitados nos limites, "Jogar a de hoje" abre o jogo, erro de rede mostra "Tentar de novo", o aviso "Novas cruzadas não podem ser buscadas agora" só aparece quando `cruzadinha:source-down` existe e tem menos de 10 minutos, e some depois disso, sem esconder o que está guardado
- [X] T035 [P] [US2] Teste de `DayRoute` em `apps/web/src/features/library/DayRoute.test.tsx`: sucesso redireciona a `/jogo/:id` com `replace` e apaga `cruzadinha:source-down`; `404` mostra "Não há cruzada neste dia." e grava `cruzadinha:no-puzzle:<date>`; `502` mostra "A fonte está fora do ar agora. Tente mais tarde." e grava `cruzadinha:source-down`; `429` mostra o tempo de espera; data inválida mostra página não encontrada

### Implementation for User Story 2

- [X] T036 [P] [US2] Criar `apps/web/src/features/library/calendar.ts` (função pura `buildMonth(year, month, today, items, noPuzzleDates)` devolvendo `MonthView` conforme `data-model.md` seção 3: "domingo é o primeiro dia da semana; hoje é a data de Brasília; o primeiro mês navegável é o de 12 meses antes de hoje")
- [X] T037 [P] [US2] Criar `apps/web/src/features/library/DayCell.tsx` e `Calendar.tsx` com módulos CSS: `role="grid"`, `aria-label` por dia (data e situação), texto do estado em cada dia, hoje com contorno, dias futuros esmaecidos e sem ação, botões "Mês anterior" e "Próximo mês" de 44 px
- [X] T038 [P] [US2] Criar `apps/web/src/features/library/LibraryLegend.tsx` com os cinco estados (concluído, em andamento, não iniciado, buscar na fonte, indisponível) como no mockup `docs/mockups/library.html`
- [X] T039 [US2] Criar `apps/web/src/features/library/LibraryPage.tsx`: consulta `GET /api/library`, título "Escolha um dia", botão "Jogar a de hoje" (usa o item de hoje se existir, senão vai a `/dia/<hoje>`), calendário, legenda, aviso "Novas cruzadas não podem ser buscadas agora" quando a chave `cruzadinha:source-down` existir e tiver menos de 10 minutos (constante fixa `SOURCE_DOWN_TTL_MS` de 600000 ms em `apps/web/src/features/library/source-down.ts`), estados de carregamento e erro
- [X] T040 [US2] Criar `apps/web/src/features/library/DayRoute.tsx` para `/dia/:date`: busca `GET /api/puzzles?level=daily&date=` ao entrar, mostra "Buscando a cruzada…", redireciona com `replace`, trata `404`, `502` e `429` (espera de `formatWait`) com o motivo e link de volta à biblioteca, grava o dia sem cruzada em `sessionStorage`, grava `cruzadinha:source-down` (com a hora) no `502` e a apaga quando uma busca funcionar
- [X] T041 [US2] Registrar a rota `/` e `/dia/:date` em `apps/web/src/app/router.tsx` apontando para as páginas novas e remover o que sobrar do placeholder

**Checkpoint**: US2 funciona sozinha; US1 + US2 dão a entrada e a escolha do dia.

---

## Phase 5: User Story 3 - Jogar uma cruzada (Priority: P1)

**Goal**: tabuleiro, dicas, teclado do computador e na tela, relógio com pausa e salvamento automático com fila de reenvio.

**Independent Test**: abrir uma cruzada, preencher letras por teclado e por toque, fechar e reabrir em outro aparelho e ver as letras e o tempo no lugar; derrubar a rede, digitar e ver o envio depois.

### Tests for User Story 3 ⚠️

- [X] T042 [P] [US3] Teste de `letters.ts` em `apps/web/src/game-logic/letters.test.ts`: só entram A–Z e "Ç", letras acentuadas viram a letra simples ("á" → "A", "ã" → "A", "é" → "E", "ç" → "Ç"), caracteres inválidos e teclas de controle são rejeitados
- [X] T043 [P] [US3] Teste de `navigation.ts` em `apps/web/src/game-logic/navigation.test.ts`: palavra ativa por célula e direção, próxima célula aberta da palavra, setas ignorando blocos, Tab e Shift+Tab entre palavras em ordem circular, seleção por número e direção de dica
- [X] T044 [P] [US3] Teste do reducer em `apps/web/src/game-logic/reducer.test.ts`: selecionar célula, bloco não selecionável, clique repetido alterna a direção, digitar preenche e avança, ao completar a palavra o cursor fica na última letra, apagar volta uma célula, `hydrate` restaura letras, ao fechar a grade certa o `mode` passa a `completed` com `completion: 'pending'` na mesma ação (o reducer tem a solução), com a grade completa e errada nada muda, `confirmCompletion` passa a `completion: 'confirmed'`, `markElsewhere` só liga `elsewhere` sem tirar a edição, e `viewServerProgress` passa ao modo leitura com as letras do servidor
- [X] T045 [P] [US3] Teste de `clock.ts` em `apps/web/src/features/game/clock.test.ts` com relógio falso: acumula tempo, para ao ocultar a aba (`visibilitychange`), ao pausar e ao concluir, parte de `elapsedMs` inicial e respeita o máximo de 604800000 ms
- [X] T046 [P] [US3] Teste de `save-queue.ts` em `apps/web/src/features/game/save-queue.test.ts` com relógio falso: debounce de 1,5 s, envio ao ocultar a aba e ao sair da página com `keepalive`, `savedAt` corrigido pelo desvio de `getServerClockOffsetMs()` (aparelho 10 minutos adiantado ainda salva) e, num `400 invalid-input` por `savedAt`, uma repetição com a hora do cabeçalho `Date`, falha de rede ou `5xx` guarda o corpo em `cruzadinha:outbox:<userId>:<puzzleId>` e repete com espera de 1 s até 30 s, `409 progress-completed` num corpo `in_progress` para de reenviar, mantém as letras no aparelho e sinaliza "concluída em outro aparelho", `401` mantém a fila e sinaliza "sessão expirada", fila local mais nova que o servidor é reenviada na abertura e depois do novo login
- [X] T047 [P] [US3] Teste de `Board` em `apps/web/src/features/game/Board.test.tsx`: `role="grid"` com uma única parada de tabulação, `aria-label` por célula ("Linha 3, coluna 3, letra A" ou "vazia"), setas, digitação, Backspace, Tab, clique e clique repetido, dica ativa anunciada em `aria-live="polite"`
- [X] T048 [P] [US3] Teste de `Keyboard` e `WordBar` em `apps/web/src/features/game/Keyboard.test.tsx`: teclas A–Z, Ç e apagar com 46 px de altura, aparece só com ponteiro grosseiro ou largura pequena, `WordBar` mostra a palavra ativa e a dica
- [X] T049 [P] [US3] Teste de `ClueSheet` em `apps/web/src/features/game/ClueSheet.test.tsx`: a tecla "Dicas" abre a lista no celular, escolher uma dica seleciona a palavra e fecha a folha, `Esc` fecha e o foco volta à tecla, a lista traz horizontais e verticais com a ativa destacada
- [X] T050 [P] [US3] Teste de `SaveStatus` em `apps/web/src/features/game/SaveStatus.test.tsx`: mostra "Salvando…", "Salvo" e "Sem conexão, tentando de novo" por texto visível, mas só anuncia ao leitor de tela (região `aria-live="polite"` separada) a queda para "Sem conexão" e a volta ("Conexão restabelecida"), nunca "Salvando…" nem "Salvo"; não tira o foco nem cobre o tabuleiro
- [X] T051 [P] [US3] Teste de `GamePage` em `apps/web/src/features/game/GamePage.test.tsx`: carrega cruzada e progresso em paralelo, hidrata letras e tempo, salva ao digitar, atribuição à fonte visível, `404` mostra "Cruzada não encontrada." com volta à biblioteca, "Pausar" cobre o tabuleiro e o torna `inert`, e o login pelo `ReloginDialog` depois de um `401` reenvia a fila local

### Implementation for User Story 3

- [X] T052 [P] [US3] Criar `apps/web/src/game-logic/letters.ts` (`normalizeLetter(input): string | null`) conforme R13: "letras acentuadas viram a letra simples antes de entrar no reducer"
- [X] T053 [P] [US3] Criar `apps/web/src/game-logic/state.ts` com os tipos de `data-model.md` seção 1 (`Direction`, `Position`, `HelpMark`, `GameState` com `completion: 'none' | 'pending' | 'confirmed'` e `elsewhere: boolean`, `GameLimits`): "`cells` com as mesmas dimensões da grade, só letras maiúsculas A–Z e Ç, bloco sempre `null`", "`selected` nunca aponta para bloco", e `createInitialState(puzzle)` (começa com `mode: 'playing'`, `completion: 'none'` e `elsewhere: false`): "`completion` só vira `confirmed` quando o servidor confirma; só `confirmed` mostra o melhor tempo"
- [X] T054 [US3] Criar `apps/web/src/game-logic/navigation.ts` (palavra ativa, próxima célula, mover por seta, próxima e anterior palavra, seleção por dica) usando `wordCells` de `@cruzadinha/shared`, sem React
- [X] T055 [US3] Criar `apps/web/src/game-logic/reducer.ts` com as ações `select`, `toggleDirection`, `type`, `backspace`, `move`, `nextWord`, `previousWord`, `selectWord`, `hydrate`, `confirmCompletion`, `markElsewhere`, `viewServerProgress`, `reset`, seguindo a tabela de transições de `data-model.md` (sem ajudas; elas entram na US4); `createGame({ puzzle, solution, limits })` entrega o reducer com a solução, e depois de cada ação de edição ele chama `isSolved` e, se a grade ficou certa, passa a `mode: 'completed'` e `completion: 'pending'` na mesma transição, e `apps/web/src/game-logic/completion.ts` com `isSolved(state, solution)`: "toda célula aberta tem a letra da solução; a comparação ignora marcas e travas"
- [X] T056 [P] [US3] Criar `apps/web/src/features/game/clock.ts` (relógio com `performance.now()`, para por `visibilitychange`, por "Pausar" e ao concluir) e `apps/web/src/features/game/useClock.ts`
- [X] T057 [US3] Criar `apps/web/src/features/game/save-queue.ts` (debounce, `pagehide` e `visibilitychange` com `keepalive`, `savedAt` = relógio do aparelho + `getServerClockOffsetMs()`, reenvio com espera crescente, fila local, expõe o estado `saving | saved | offline | session-expired | completed-elsewhere`; `409` num corpo `in_progress` para o reenvio e sinaliza "concluída em outro aparelho" sem tirar a pessoa do jogo; `401` mantém a fila e sinaliza "sessão expirada"; `reenviar()` é chamado depois do novo login) conforme R6, R17 e R19, usando `apps/web/src/api/progress.ts` e `apps/web/src/lib/storage.ts`
- [X] T058 [P] [US3] Criar `apps/web/src/features/game/Cell.tsx`, `Cell.module.css`, `Board.tsx` e `Board.module.css`: células `memo`, tamanho por variável CSS: celular pela largura (30 px com 11 colunas em 360 px), computador o maior que caiba na largura e na altura (teto de 110 px, sem rolagem vertical da página) conforme a grade, sem rolagem horizontal, estados (vazia, palavra ativa, selecionada, bloco) só por tokens, selecionada só com a cor de fundo (sem contorno), números de dica no canto superior esquerdo
- [X] T059 [P] [US3] Criar `apps/web/src/features/game/ClueBar.tsx` (dica ativa acima do tabuleiro) e `ClueList.tsx` (horizontais e verticais, ativa destacada, preenchidas distintas, clique seleciona a palavra, rolagem própria com títulos fixos)
- [X] T060 [P] [US3] Criar `apps/web/src/features/game/Keyboard.tsx` e `WordBar.tsx` com módulos CSS: teclado QWERTY com Ç, apagar e a tecla "Dicas" (abre o `ClueSheet`), mostrado só quando `(pointer: coarse)` ou largura pequena, e a barra da palavra ativa ampliada acima dele
- [X] T061 [P] [US3] Criar `apps/web/src/features/game/Toolbar.tsx` (faixa entre o cabeçalho e o jogo: tempo, "Pausar", "Outro dia" que leva à biblioteca; espaço reservado para as ajudas da US4) e `PauseCover.tsx` (cobre o tabuleiro e o torna `inert`)
- [X] T062 [P] [US3] Criar `apps/web/src/features/game/ClueSheet.tsx` e `ClueSheet.module.css`: folha (diálogo) que reaproveita `ClueList`, aberta pela tecla "Dicas", fecha ao escolher a dica, com `Esc` e ao tocar fora
- [X] T063 [P] [US3] Criar `apps/web/src/features/game/SaveStatus.tsx` e `SaveStatus.module.css`: indicador na faixa de ferramentas com o estado do `save-queue` ("Salvando…", "Salvo", "Sem conexão, tentando de novo"), sempre por texto; o texto visível não é uma região viva, e uma região `aria-live="polite"` visualmente oculta anuncia só a queda para sem conexão e a volta
- [X] T064 [US3] Criar `apps/web/src/features/game/useGame.ts` ligando reducer, relógio e `save-queue`, hidratando de `GET /api/progress` e da fila local, e `apps/web/src/features/game/GamePage.tsx` com `GamePage.module.css`: carrega cruzada e progresso em paralelo, mostra a atribuição à fonte (`puzzle.attribution`), regiões `aria-live`, `SaveStatus` na faixa de ferramentas, o `ReloginDialog` ligado ao jogo (seu `onSuccess` chama `clearExpired` e `reenviar()` do `save-queue`), `Notice` para rede e salvamento (nunca cobre o tabuleiro), erros de `404` e de rede com volta à biblioteca, e nenhum estado de erro depois do carregamento tira o tabuleiro da tela (FR-032)
- [X] T065 [US3] Registrar `/jogo/:puzzleId` em `apps/web/src/app/router.tsx` com `lazy` apontando para `GamePage` e conferir que o código do jogo sai em um bloco à parte no `npm run build -w @cruzadinha/web`

**Checkpoint**: US3 funciona sozinha (jogar, retomar em outro aparelho, tempo com pausa, salvamento). US1 + US2 + US3 formam o MVP.

---

## Phase 6: User Story 4 - Usar as ajudas (Priority: P2)

**Goal**: revelar letra, revelar palavra e verificar, com limites configuráveis, marcas nas células e legenda escondida por padrão.

**Independent Test**: usar cada ajuda em uma cruzada, conferir marcas e contadores, esgotar o limite de letras e ver o botão desabilitado; recarregar mantendo contadores e marcas no mesmo aparelho.

### Tests for User Story 4 ⚠️

- [X] T066 [P] [US4] Teste de `help.ts` em `apps/web/src/game-logic/help.test.ts` cobrindo a semântica de `research.md` R9: revelar letra só se a célula não está correta e então consome 1 e trava a célula; revelar palavra preenche e trava só células não corretas e consome 1 só se mudar alguma; verificar marca certas conferidas como `helped` e erradas como `wrong`, vazias sem marca, sem letras não faz nada; corrigir célula `wrong` a torna `helped`; "`usage.letters ≤ limits.letters` e `usage.words ≤ limits.words`"; célula travada não aceita digitar nem apagar; revelar e verificar não mudam a seleção
- [X] T067 [P] [US4] Teste de `help-storage.ts` em `apps/web/src/features/game/help-storage.test.ts`: grava e lê `{ usage, marks, locked }` em `cruzadinha:help:<userId>:<puzzleId>`, sem armazenamento a aplicação segue, "reiniciar" apaga o registro, duas contas no mesmo aparelho não se misturam
- [X] T068 [P] [US4] Teste de `HelpButtons` e `LegendButton` em `apps/web/src/features/game/HelpButtons.test.tsx`: contadores "1/4 Letra" e "1/2 Palavra", "Verificar" sem contador, esgotada fica `aria-disabled` com o motivo no rótulo, anúncio em `aria-live` do resultado de cada ajuda; legenda começa escondida, o botão "?" abre e fecha, `Esc` fecha, `aria-expanded` correto

### Implementation for User Story 4

- [X] T069 [US4] Criar `apps/web/src/game-logic/help.ts` (`revealLetter`, `revealWord`, `verify`, `canRevealLetter`, `canRevealWord`) conforme R9 e integrar as ações `revealLetter`, `revealWord` e `verify` e o bloqueio de células travadas em `apps/web/src/game-logic/reducer.ts`
- [X] T070 [P] [US4] Criar `apps/web/src/features/game/help-storage.ts` (`loadHelp`, `saveHelp`, `clearHelp` por usuário e cruzada; só contadores, marcas e células travadas; nunca solução, senha nem token) e ligar a gravação a cada mudança de ajuda em `apps/web/src/features/game/useGame.ts`
- [X] T071 [P] [US4] Criar `apps/web/src/features/game/HelpButtons.tsx` (três pílulas "Letra", "Palavra" e "Verificar" na faixa de `Toolbar.tsx`, contadores usado/limite lidos de `apps/web/src/config.ts`, esgotada `aria-disabled` explicando o motivo, texto "Verificar" sem ícone) e `HelpButtons.module.css`
- [X] T072 [P] [US4] Desenhar a marca de ajuda em `apps/web/src/features/game/Cell.module.css` e `Cell.tsx`: triângulo de 24% da célula no canto superior direito, `--help` para `helped` e `--bad` para `wrong`, `aria-label` acrescenta "com ajuda" ou "errada na verificação"
- [X] T073 [P] [US4] Criar `apps/web/src/features/game/LegendButton.tsx` e `LegendButton.module.css`: botão redondo de 44 × 44 px "?" no canto inferior direito da tela (acima do teclado no celular), abre uma janelinha com vazia, palavra ativa, selecionada, com ajuda e errada na verificação, começa escondida, fecha com `Esc` e ao tocar fora, `aria-expanded` e `aria-controls`
- [X] T074 [US4] Ligar tudo em `apps/web/src/features/game/GamePage.tsx`: `hydrate` com a ajuda guardada, anúncios `aria-live` ("Letra revelada", "Verificado: 2 letras erradas", "Limite de letras atingido"), reservar espaço embaixo do tabuleiro para o botão "?" e conferir que o salvamento do progresso envia as letras reveladas como as demais

**Checkpoint**: US4 funciona sobre US3; ajudas e legenda completas.

---

## Phase 7: User Story 5 - Concluir e rever (Priority: P2)

**Goal**: janela de conclusão com tempo, melhor tempo e ajudas; modo leitura; jogar de novo mantendo o recorde.

**Independent Test**: completar uma cruzada corretamente, ver a janela, fechar, ver o modo leitura e jogar de novo; abrir uma cruzada já concluída direto em modo leitura.

### Tests for User Story 5 ⚠️

- [X] T075 [P] [US5] Teste de `CompletionDialog` em `apps/web/src/features/game/CompletionDialog.test.tsx`: mostra tempo, melhor tempo (destacado quando é novo recorde) e ajudas usadas, foco inicial em "Voltar à biblioteca", `Esc` e "Ver o tabuleiro" fecham e devolvem o foco, texto "Cruzada concluída" além da cor verde
- [X] T076 [P] [US5] Teste de `ReadModeBanner` e da abertura em modo leitura em `apps/web/src/features/game/ReadMode.test.tsx`: faixa "Concluída em mm:ss", sem seleção nem teclado, "Jogar de novo" chama `POST /api/progress/:id/reset`, zera letras, tempo, ajuda e marcas e mantém o melhor tempo; falha do reinício mantém o modo leitura e avisa
- [X] T077 [P] [US5] Teste de conclusão em `apps/web/src/features/game/GameCompletion.test.tsx`: grade completa e correta abre a janela na hora e envia `status: 'completed'`; sem rede, a janela abre com o tempo da pessoa, o aviso "Vamos registrar quando a conexão voltar" e "Melhor tempo" em "—" até o servidor confirmar, o tabuleiro vai ao modo leitura, o envio é repetido e o melhor tempo aparece quando confirmar; grade completa e errada não faz nada; `200` repetido da própria conclusão não mostra aviso; progresso `completed` ao abrir vai direto ao modo leitura; "Jogar de novo" sem rede mostra "Sem conexão. Tente de novo quando voltar" e mantém o modo leitura
- [X] T078 [P] [US5] Teste de `CompletedElsewhere` em `apps/web/src/features/game/CompletedElsewhere.test.tsx`: `409 progress-completed` num salvamento `in_progress` mostra o `Notice` "Esta cruzada já foi concluída em outro aparelho" com "Ver como ficou", o jogo continua editável e nada muda sozinho, "Ver como ficou" carrega o progresso do servidor e abre o modo leitura, e o reenvio das letras para

### Implementation for User Story 5

- [X] T079 [US5] Em `apps/web/src/features/game/useGame.ts`, detectar `isSolved` depois de cada mudança e, na mesma hora, passar a `mode: 'completed'` com `completion: 'pending'`, abrir a janela de conclusão e enviar `PUT` com `status: 'completed'` pelo `save-queue` (com prioridade); quando o servidor confirmar, passar a `completion: 'confirmed'` e preencher `completedAt`, `finishedMs` e `bestMs`; sem confirmação, repetir o envio sem tirar a janela nem o modo leitura da tela
- [X] T080 [P] [US5] Criar `apps/web/src/features/game/CompletionDialog.tsx` e `CompletionDialog.module.css` sobre `apps/web/src/components/Dialog.tsx`: título "Cruzada concluída", descrição com o tempo por extenso, três quadros (seu tempo, melhor tempo — "—" e o aviso "Vamos registrar quando a conexão voltar" enquanto `completion` for `pending` —, ajudas usadas lidas de `help-storage.ts`; "0" quando a conclusão foi em outro aparelho), botões "Voltar à biblioteca" (principal) e "Ver o tabuleiro"
- [X] T081 [P] [US5] Criar `apps/web/src/features/game/ReadModeBanner.tsx` e `ReadModeBanner.module.css`: faixa verde com ícone, "Concluída em mm:ss" e botões "Jogar de novo" e "Voltar à biblioteca"; tabuleiro sem seleção e sem teclado em `mode: 'completed'`
- [X] T082 [US5] Implementar "Jogar de novo" em `apps/web/src/features/game/useGame.ts`: `POST /api/progress/:id/reset`, ação `reset` do reducer, `clearHelp` do armazenamento e reinício do relógio; sem conexão (`status: 0`) mostra "Sem conexão. Tente de novo quando voltar", e em erro do servidor "Não foi possível reiniciar. Tente de novo."; nos dois casos mantém o modo leitura e não reinicia localmente
- [X] T083 [US5] Em `apps/web/src/features/game/GamePage.tsx`, abrir direto em modo leitura quando `progress.status === 'completed'`, mostrar a janela de conclusão uma vez por conclusão e o recorde no quadro "Melhor tempo"
- [X] T084 [US5] Em `apps/web/src/features/game/useGame.ts` e `GamePage.tsx`, tratar o sinal "concluída em outro aparelho" do `save-queue`: mostrar o `Notice` com "Ver como ficou", manter o jogo editável e, só se a pessoa escolher, carregar `GET /api/progress/:id` e passar ao modo leitura com `completion: 'confirmed'`

**Checkpoint**: US5 completa o ciclo de jogo.

---

## Phase 8: User Story 6 - Claro, escuro e acessibilidade (Priority: P2)

**Goal**: botão de tema (automático, claro, escuro), contraste verificado e acessibilidade nível "básico sólido" comprovada por teste.

**Independent Test**: alternar os três temas em cada tela e percorrer o fluxo principal só com teclado; os testes de contraste e de acessibilidade passam.

### Tests for User Story 6 ⚠️

- [X] T085 [P] [US6] Teste de contraste dos tokens em `apps/web/src/test/tokens-contrast.test.ts`: lê `light.css` e `dark.css`, calcula a razão WCAG e exige 4,5:1 para os pares de texto e para a letra sobre cada estado do tabuleiro, e 3:1 para foco, `--help` e `--bad` contra a célula; registra os pares de estado do tabuleiro entre si com uma lista explícita de exceções (decisão do autor, `plan.md` Riscos 1)
- [X] T086 [P] [US6] Teste de `ThemeToggle` em `apps/web/src/themes/ThemeToggle.test.tsx`: alterna `auto → claro → escuro → auto`, mostra "Tema: Auto", aplica `data-theme` na hora, grava `cruzadinha:theme`, sem armazenamento segue a preferência do sistema
- [X] T087 [P] [US6] Testes de acessibilidade com `vitest-axe` em `apps/web/src/test/a11y.test.tsx` para Login, Cadastro, Biblioteca, Jogo (com legenda aberta) e as duas janelas, e teste de `prefers-reduced-motion` verificando que `global.css` zera animações e transições

### Implementation for User Story 6

- [X] T088 [US6] Criar `apps/web/src/themes/ThemeToggle.tsx` e `ThemeToggle.module.css` e colocar o botão no cabeçalho em `apps/web/src/app/AppLayout.tsx`, com o rótulo do modo atual em texto
- [X] T089 [US6] Revisar os valores de `apps/web/src/themes/light.css` e `dark.css` até `tokens-contrast.test.ts` passar nos mínimos exigidos (texto, letra de cada estado, foco, marcas de ajuda), mantendo a paleta aprovada dos mockups e sem contorno na célula selecionada
- [X] T090 [US6] Auditoria de teclado e leitor de tela nas cinco telas e nas duas janelas: ordem de foco, `:focus-visible` em todos os controles, regiões `aria-live`, nomes e descrições, `lang="pt-BR"`; registrar achados e correções em `specs/010-front-basico/quickstart.md` na seção de validação manual
- [X] T091 [US6] Garantir alvos de toque de 44 px fora do tabuleiro (botões, pílulas, navegação do calendário, teclas) e a exceção de 30 px das células, com teste de tamanho mínimo em `apps/web/src/components/touch-targets.test.tsx`

**Checkpoint**: US6 verificada por teste de contraste, axe e auditoria manual.

---

## Phase 9: User Story 7 - Criar convite pelo código Konami (Priority: P3)

**Goal**: sequência secreta abre a janela com o código do convite, uma única vez; cota cheia explicada.

**Independent Test**: logado, na biblioteca, digitar a sequência e ver o código; repetir até a cota e ver a explicação; no tabuleiro nada abre.

### Tests for User Story 7 ⚠️

- [X] T092 [P] [US7] Teste do detector em `apps/web/src/features/invites/konami.test.ts`: reconhece ↑ ↑ ↓ ↓ ← → ← → B A (`ArrowUp`, `ArrowUp`, `ArrowDown`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ArrowLeft`, `ArrowRight`, `b`, `a`), reinicia a cada tecla errada, aceita maiúsculas, ignora teclas com Ctrl, Alt ou Meta
- [X] T093 [P] [US7] Teste de `KonamiListener` em `apps/web/src/features/invites/KonamiListener.test.tsx`: não age em `input`, `textarea` e `select`, não age na rota `/jogo`, não age sem sessão, age na biblioteca; a sequência no tabuleiro move a seleção e digita B e A normalmente
- [X] T094 [P] [US7] Teste de `InviteDialog` em `apps/web/src/features/invites/InviteDialog.test.tsx`: `201` mostra o código uma vez com "Copiar" (com ou sem `navigator.clipboard`), validade, "Uso único" e "N convites ativos" lidos de `GET /api/invites`, falha da contagem mostra só o código, fechar descarta o código, `409 invite-quota-reached` mostra a explicação com a validade do mais antigo sem repetir o número da cota, `429` mostra a espera

### Implementation for User Story 7

- [X] T095 [P] [US7] Criar `apps/web/src/features/invites/konami.ts` (detector puro com buffer das últimas 10 teclas) conforme `research.md` R10
- [X] T096 [US7] Criar `apps/web/src/features/invites/KonamiListener.tsx` (ouvinte global de `keydown` no layout, ativo só com sessão, fora de campos de texto e fora da rota `/jogo`) e montá-lo em `apps/web/src/app/AppLayout.tsx`
- [X] T097 [US7] Criar `apps/web/src/features/invites/InviteDialog.tsx` e `InviteDialog.module.css` sobre `Dialog` (tempo de espera de `formatWait`): variante de sucesso (código em Roboto Mono com botão "Copiar" e cópia por seleção de texto como reserva, validade, "Uso único", contagem de ativos, "Pronto") e variante de cota cheia ("Entendi"); o código fica só em memória, nunca em `localStorage`, console nem log

**Checkpoint**: US7 completa; todas as histórias funcionam.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: ponta a ponta, CI, documentação e verificação final

- [X] T098 [P] Criar `apps/web/e2e/support.ts`: auxiliares que criam um convite pela CLI da API (`invites create`), semeiam o banco com `db:seed` (cruzada de amostra de hoje, sem rede) e limpam o banco entre os testes (`TRUNCATE ... CASCADE` em `users`, `sessions`, `invites`, `rate_limit_attempts`, `puzzles` e `progress`, pelo driver `postgres`, lendo `DATABASE_URL` do ambiente), recusando rodar com `NODE_ENV=production` ou com um `DATABASE_URL` que não seja local (`localhost`, `127.0.0.1` ou o serviço `postgres` da CI); usados por `fluxo-principal.spec.ts` e `ajudas-e-retomada.spec.ts`
- [X] T099 [P] Escrever `apps/web/e2e/fluxo-principal.spec.ts` (usa `apps/web/e2e/support.ts`): convite criado pela CLI, cadastro, biblioteca, jogo da cruzada de amostra 5 × 5 do seed, conclusão, modo leitura, jogar de novo (nunca a fonte real); um trecho do fluxo é feito só com `keyboard.press`; confere a atribuição à fonte na tela do jogo
- [X] T100 [P] Escrever `apps/web/e2e/ajudas-e-retomada.spec.ts` (usa `apps/web/e2e/support.ts`): login, usar as três ajudas, recarregar mantendo letras e ajudas, simular rede caída e sessão expirada sem perder o tabuleiro, `@axe-core/playwright` nas telas principais nos dois temas (sem a regra de contraste nas células do tabuleiro), `data-theme` já definido antes da primeira pintura, grade sem rolagem horizontal em 360 px
- [X] T101 Acrescentar o job `e2e` a `.github/workflows/ci.yml`: Postgres como serviço, `npm ci`, build de `shared`, API e web, migrar e semear, subir a API, `npx playwright install --with-deps chromium`, `npm run test:e2e -w @cruzadinha/web`; manter o pré-push sem o E2E
- [X] T102 [P] Atualizar `CLAUDE.md` (resumo da feature 010, comandos `test:e2e` e variáveis `VITE_HELP_*`, estrutura de `apps/web`) e `docs/design.md` (tema só no aparelho, ajudas na v1, convite sem o número da cota) para refletir o que foi construído
- [X] T103 [P] Medir SC-003 e SC-008: letra digitada visível em até 100 ms com a CPU 4× mais lenta no Chrome DevTools e um perfil de celular de 360 px, e grade 11 × 11 sem rolagem horizontal em 360 px; registrar os números em `specs/010-front-basico/quickstart.md`
- [X] T104 Conferir o tamanho do bundle inicial e o corte por rota (jogo em bloco separado), e que nenhuma requisição sai para terceiros (fontes e imagens do próprio site), registrando o resultado em `specs/010-front-basico/quickstart.md`
- [ ] T105 Passar o roteiro de 19 cenários de `specs/010-front-basico/quickstart.md` à mão, nos dois temas, em computador e celular, e marcar os critérios de pronto da seção 5
- [X] T106 Rodar `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, e corrigir o que falhar antes de abrir o PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências.
- **Foundational (Fase 2)**: depende do Setup e bloqueia todas as histórias.
- **Histórias (Fases 3 a 9)**: dependem da Fase 2. US1, US2, US3 e US7 podem andar em paralelo depois dela; US4 e US5 dependem da US3 (a US1 entrega o `ReloginDialog` com um `onSuccess`, e a US3 o liga ao `save-queue` no `401` do jogo); US6 depende de haver telas para auditar (depois de US1 a US3, e das janelas da US5 e da US7 para o axe completo).
- **Polish (Fase 10)**: depende das histórias desejadas completas (E2E precisa de US1 a US5).


### Arquivos editados por mais de uma tarefa

Tarefas de histórias diferentes que mexem no mesmo arquivo não podem rodar em paralelo: seguir a ordem dos números. Isso limita o paralelismo entre histórias a arquivos distintos.

- `AppLayout.tsx`: T022, T031, T032, T088, T096
- `router.tsx`: T022, T041, T065
- `useGame.ts`: T064, T070, T079, T082, T084
- `GamePage.tsx`: T064, T074, T083, T084
- `Cell.tsx`: T058, T072
- `client.ts`: T013, T032
- `save-queue.ts`: T046, T057

### User Story Dependencies

- **US1 (P1)**: após a Fase 2. Sem dependência de outras histórias.
- **US2 (P1)**: após a Fase 2. Usa a guarda de sessão da Fase 2, não a tela da US1.
- **US3 (P1)**: após a Fase 2. Abre por URL sem passar pela biblioteca.
- **US4 (P2)**: depende de US3 (reducer, `Cell`, `GamePage`, `Toolbar`).
- **US5 (P2)**: depende de US3 e de US4 (lê o uso de ajuda do aparelho para o quadro "ajudas usadas").
- **US6 (P2)**: tokens e tema vêm da Fase 2; a auditoria precisa das telas das outras histórias.
- **US7 (P3)**: após a Fase 2; depende de `AppLayout` e `Dialog`.

### Within Each User Story

- Testes escritos antes e vendo falhar.
- Funções puras e tipos antes de hooks; hooks antes de páginas; página antes de registrar a rota.
- Cada história fecha com seu checkpoint antes de passar à seguinte.

### Parallel Opportunities

- Setup: T002 a T006 em paralelo depois de T001.
- Fase 2: T007 a T011 em paralelo; T014 a T018 em paralelo depois de T013; T019, T020 e T021 em paralelo.
- Cada história: todos os testes marcados [P] juntos, e os arquivos de componentes marcados [P] juntos.
- Entre histórias: US1, US2, US3 e US7 em paralelo por pessoas ou sessões diferentes, respeitando a ordem nos arquivos compartilhados listados acima.

---

## Parallel Example: User Story 3

```bash
# Testes da US3 juntos:
Task: "Teste de letters.ts em apps/web/src/game-logic/letters.test.ts"
Task: "Teste de navigation.ts em apps/web/src/game-logic/navigation.test.ts"
Task: "Teste do reducer em apps/web/src/game-logic/reducer.test.ts"
Task: "Teste de clock.ts em apps/web/src/features/game/clock.test.ts"
Task: "Teste de save-queue.ts em apps/web/src/features/game/save-queue.test.ts"

# Componentes da US3 juntos (depois do reducer):
Task: "Criar Cell.tsx e Board.tsx em apps/web/src/features/game/"
Task: "Criar ClueBar.tsx e ClueList.tsx em apps/web/src/features/game/"
Task: "Criar Keyboard.tsx e WordBar.tsx em apps/web/src/features/game/"
Task: "Criar Toolbar.tsx e PauseCover.tsx em apps/web/src/features/game/"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Fase 1 (Setup) e Fase 2 (Foundational).
2. US1, US2 e US3.
3. **Parar e validar**: cadastrar, escolher o dia de hoje, jogar uma cruzada e reabrir em outro navegador (cenários 1 a 6 do quickstart).
4. Demonstrar se estiver pronto.

### Incremental Delivery

1. Setup + Foundational.
2. US1 → US2 → US3 (MVP).
3. US4 (ajudas), US5 (conclusão e modo leitura), US6 (tema e acessibilidade comprovada), US7 (convite).
4. Polish: ponta a ponta, CI, documentação e verificação final.
5. Cada história acrescenta valor sem quebrar as anteriores.

### Parallel Team Strategy

Com mais de uma pessoa ou sessão: após a Fase 2, uma frente em US1 + US2, outra em US3, outra em US7; US4 e US5 seguem a US3; US6 fecha depois.

---

## Notes

- [P] = arquivos diferentes e sem dependência de tarefa incompleta.
- [Story] liga cada tarefa à história para rastreio.
- Nenhuma tarefa altera a API, o banco ou `packages/shared`; se uma precisar, parar e voltar ao plano.
- Commits em inglês e sem atribuição de IA, no padrão do projeto (`feat(web): ...`), um por tarefa ou grupo lógico.
- Mockups de referência em `docs/mockups/`; textos e dados deles são inventados.
- Evitar: tarefas vagas, conflito de arquivo, dependência entre histórias que quebre a independência.

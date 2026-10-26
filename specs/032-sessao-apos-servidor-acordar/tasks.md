# Tasks: Sessão só depois de o servidor acordar

**Input**: `specs/032-sessao-apos-servidor-acordar/` (plan.md, spec.md, research.md, quickstart.md)

**Prerequisites**: plan.md, spec.md

**Tests**: pedidos pela regra de correção da constituição (começar por teste de regressão que falha, no mesmo commit da correção) e pelo quickstart.

**Format**: `- [ ] T### [P?] [US?] Descrição com caminho`. `[P]` = arquivos diferentes, sem dependência de tarefa aberta.

Só `apps/web` muda. Sem API, sem schema, sem `shared`, sem migração (portanto sem DDE/ERD).

## Phase 1: Setup

Nada a preparar: sem dependência nova e sem arquivo de código novo.

## Phase 2: Foundational

- [x] T001 Em `apps/web/src/api/server-wake.test.ts` escrever os testes que falham de `whenServerReady(signal)` (ainda inexistente): (a) resolve na hora quando `isServerReady()` é verdadeiro; (b) pendente até `waitForServer` marcar pronto (tempo falso), então resolve; (c) rejeita com `AbortError` quando o `signal` aborta, e depois disso um `markReady` não faz nada; (d) com `signal` já abortado rejeita sem assinar. Rodar e ver falhar
- [x] T002 Em `apps/web/src/api/server-wake.ts` exportar `whenServerReady(signal?: AbortSignal): Promise<void>` sobre `isServerReady`/`subscribeServerReady` (remove a assinatura ao resolver e ao abortar), reaproveitando `abortError()`; comentário curto: não faz pedido, só espera o laço do `serverReadyLoader`. T001 deve passar
- [x] T003 [P] Em `apps/web/src/test/render.tsx` exportar `serverIsReady()`: `await waitForServer({ fetch })` com `fetch` que devolve `200 {status:'ok',database:'up'}`, para testes que montam `viewerLoader`/`directPlayLoader` fora do portão pai (sem isso os loaders esperariam para sempre). Quem usar chama `resetServerWake()` no `afterEach`

## Phase 3: User Story 1 - Abrir o site com a API dormindo sem tela de erro (P1)

**Goal**: com a API dormindo, só as mensagens de espera aparecem e depois o calendário; nunca "Algo deu errado", e nenhum pedido além da saúde sai antes de o servidor estar pronto.

**Independent Test**: saúde 503, 503, 200 e `/api/auth/me` 503 até a saúde dar 200 e 401 depois; abrir `/` sem sessão: espera, depois calendário, sem `alert`.

- [x] T004 [US1] Em `apps/web/src/app/viewer.test.tsx` (usar `mockApi`, `renderRoutes` e rotas com um pai igual ao `serverReadyLoader` do `router.tsx`) escrever o teste de regressão que falha hoje: `GET /api/health` responde 503 duas vezes e depois 200 `{status:'ok',database:'up'}`; `GET /api/auth/me` responde 503 enquanto a saúde não deu 200 e 401 depois; esperado: a única chamada antes da saúde 200 é `GET /api/health` (FR-001), nenhum `alert` e, no fim, `é visitante`. Acrescentar o caso de FR-007: com o servidor pronto, `/api/auth/me` respondendo 500 cai na tela de erro da rota (já existe um teste parecido; ajustar para o novo `beforeEach`). Nos demais testes do arquivo, chamar `await serverIsReady()` no `beforeEach` e `resetServerWake()` no `afterEach` (T003). Rodar e ver falhar o novo
- [x] T005 [US1] Em `apps/web/src/app/viewer.ts` fazer o `viewerLoader` receber `{ request }` e chamar `await whenServerReady(request.signal)` antes de `ensureQueryData`; atualizar o comentário do arquivo (a sessão só é consultada com o servidor pronto, feature 032). T004 deve passar
- [x] T006 [US1] Em `apps/web/src/app/direct-play.ts` fazer o loader devolvido por `directPlayLoader` receber `{ request }` e esperar `await whenServerReady(request.signal)` dentro do `try`, antes de `ensureQueryData` da sessão (só quando `directToGame` está ligado e o caminho inicial é `/`; o `handled` continua sendo marcado como hoje). Em `apps/web/src/app/direct-play.test.ts`: chamar `await serverIsReady()` nos testes existentes (passar `{ request: new Request('http://x/') }` ao loader) e acrescentar caso novo que falha antes do código: servidor dormindo (não pronto), `directToGame` ligado, `GET /api/auth/me` e a biblioteca só respondem depois da saúde 200; nenhuma chamada além da saúde antes disso e, depois de pronto, o atalho age (`replace` ao jogo de hoje)
- [x] T007 [P] [US1] Em `apps/web/src/app/router.test.tsx` (usa `createAppRoutes`, saúde simulada e `resetServerWake()` já no arquivo) acrescentar casos: (a) `/dia/:date` e `/jogo/:puzzleId` com a API dormindo não mostram `alert` e só pedem a sessão depois da saúde; `/login` e `/cadastro` continuam sem erro e sem pedir a sessão antes da saúde (não regridem); (b) a API que nunca acorda mostra a tela de erro com nova tentativa da feature 012 e não a mensagem genérica, e nenhum `/api/auth/me` sai; (c) `/status` continua sem esperar; (d) cancelamento: navegar para `/status` durante a espera não deixa pedido de sessão pendente (nenhum `/api/auth/me` depois da saúde 200), e anotar em `research.md` se o `signal` do loader é abortado quando o pai rejeita ou a navegação muda (item 1 da pesquisa)
- [x] T008 [US1] Em `apps/web/e2e/espera-servidor.spec.ts` acrescentar a simulação do issue #63 com `page.route` (saúde 503 nas 3 primeiras vezes; `/api/auth/me` 503 HTML até a saúde dar 200, 401 depois): amostrar cabeçalho e corpo a cada 250 ms até o calendário; afirmar que "Algo deu errado" nunca aparece, que a única chamada à API antes da saúde 200 é `/api/health` (FR-001; inclui `/api/library` e `/api/settings`) e que o calendário aparece. Caso com sessão (conta) e caso com `directToGame` ligado (o atalho leva ao jogo depois de acordar) incluídos

## Phase 4: User Story 2 - Cabeçalho sem mudança brusca (P1)

**Goal**: o cabeçalho mostra só `Cruzadinha` durante a espera e a identidade no mesmo quadro do calendário.

**Independent Test**: a mesma simulação; amostras do cabeçalho sem "Visitante"/"Entrar"/conta até o quadro em que o calendário aparece.

- [x] T009 [US2] Em `apps/web/e2e/espera-servidor.spec.ts` medir, na simulação de T008 (com `/api/auth/me` respondendo 401 de imediato e a biblioteca com atraso extra), o cabeçalho a cada 250 ms: só `Cruzadinha` enquanto a mensagem de espera está visível e identidade e calendário no mesmo quadro (FR-003, FR-004). Rodar com T005 e T006 aplicados
- [x] T010 [US2] (dispensada: T009 passou, ver research.md) Só se T009 falhar (identidade antes do calendário): em `apps/web/src/app/AppLayout.tsx` mostrar a identidade do cabeçalho só quando a rota atual terminou de carregar (estado de navegação ocioso e sem tela de espera), conforme research.md item 2, sem API instável do React Router; cobrir com teste em `apps/web/src/app/viewer.test.tsx`. Se T009 passar, marcar esta tarefa como dispensada com a evidência no `research.md`

## Phase 5: User Story 3 - API acordada continua como hoje (P2)

**Goal**: sem lentidão, pedido a mais nem mensagem de espera quando a API responde na hora.

**Independent Test**: API respondendo na hora; `/` abre o calendário sem "Acordando o servidor" e sem nova consulta de saúde.

- [x] T011 [P] [US3] Em `apps/web/src/app/viewer.test.tsx` acrescentar caso: com o servidor já pronto (`serverIsReady()`), o `viewerLoader` pede a sessão na hora (uma chamada a `/api/auth/me`, nenhuma a `/api/health`); caso análogo para `directPlayLoader` em `direct-play.test.ts` já fica coberto por T006 (testes existentes)
- [x] T012 [US3] Em `apps/web/e2e/espera-servidor.spec.ts` (ou `fluxo-principal.spec.ts`) conferir que com a API normal `/` mostra o calendário sem a mensagem "Acordando o servidor" e que, dentro de uma partida carregada, com a API passando a falhar, não aparece tela de espera nem de erro (FR-005, FR-006); reaproveitar casos existentes se já cobrirem, citando o teste

## Phase 6: Polish

- [x] T013 `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` na raiz; e2e local conforme `quickstart.md`. Conferir FR-008: `git diff --stat` só em `apps/web/` e `specs/`/`CLAUDE.md`, sem mudança em chaves de `localStorage`, rotas ou `shared`
- [x] T014 Atualizar `CLAUDE.md` (Current state: item da feature 032, curto, no estilo dos anteriores) e anotar em `specs/032-sessao-apos-servidor-acordar/research.md` o resultado de T007(d) e T009/T010
- [x] T015 Commits em inglês, Conventional Commits, sem atribuição de IA (regra do `CLAUDE.md`): `fix(web): wait for the server before asking for the session` (teste de regressão junto da correção); branch `fix/032-sessao-apos-servidor-acordar`

## Dependencies

- T001 → T002 → T005 e T006. T003 antes de T004 e T006. T004 → T005.
- T005 e T006 antes de T007–T012.
- US1 (T004–T008) é o MVP; US2 depende de T005 e T006; US3 independente depois delas.
- T010 condicional a T009.

## Parallel

- T001 e T003 (arquivos diferentes) no início; T007, T008 e T011 depois de T005 e T006.

## Implementation strategy

MVP: Foundational + US1 (T001–T008). Depois US2 e US3, e por fim Polish.

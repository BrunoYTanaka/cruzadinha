---
description: "Lista de tarefas da feature 013: jogo sem login e cadastro aberto"
---

# Tasks: Jogo sem login e cadastro aberto

**Input**: Documentos de design em `/specs/013-jogo-sem-login/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (`api.md`, `ui-contracts.md`), quickstart.md

**Tests**: incluídos. A constituição pede teste unitário para toda regra de jogo (princípio V) e testes de integração com Postgres real para autenticação, cadastro e progresso (princípio VII). O plano também prevê um caminho ponta a ponta de visitante. Em cada história, os testes vêm antes da implementação e precisam falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário (US1 a US5), na ordem de prioridade da spec. A última fase, o **lançamento B**, é um PR separado, feito depois que o lançamento A estiver publicado (research R15).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem depender de tarefa incompleta).
- **[Story]**: história de usuário da spec (US1 a US5). As fases Setup, Foundational, Polish e Lançamento B não têm rótulo.
- Todo caminho é relativo à raiz do repositório.

## Path Conventions

Monorepo npm workspaces:
- `packages/shared/src/`: schemas Zod;
- `apps/api/src/`: Fastify, com rota → serviço → repositório e testes de integração em `src/test/*.int.test.ts`;
- `apps/web/src/`: React; regra pura em `game-logic/`; ponta a ponta em `apps/web/e2e/`.

Antes de escrever código que use `idb`, `fake-indexeddb`, Fastify, Drizzle, React Router ou TanStack Query, consultar a documentação atual no Context7 (constitution, Fluxo de Desenvolvimento).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependências, configuração de teste e variáveis

- [X] T001 Instalar em `apps/web/package.json` (atualizando o `package-lock.json`) `idb` `^8.0.4` como dependência e `fake-indexeddb` `^6.2.6` como dependência de desenvolvimento. Rodar `npm ci` para confirmar que o lock fecha.
- [X] T002 Em `apps/web/src/test/setup.ts`, importar `fake-indexeddb/auto` e, num `beforeEach`, trocar `globalThis.indexedDB` por um `new IDBFactory()` de `fake-indexeddb`, para cada teste começar com o IndexedDB vazio.
- [X] T003 [P] Acrescentar ao `.env.example`, logo depois de `RELEASE_COMMIT`, `REGISTRATION_ENABLED=false`. O comentário diz: "Cadastro aberto pelo site e pela API: só `true` ou `false`; vazio ou ausente vale `false`. Contas com o cadastro fechado: `npm run cli -w @cruzadinha/api -- users create --email <email>`."
- [X] T004 [P] Acrescentar a `render.yaml`, em `envVars`, `- key: REGISTRATION_ENABLED` com `sync: false`, **sem `value`**. Um valor escrito no Blueprint volta a valer em toda sincronização e desfaria a mudança feita no painel (FR-018). Comentário: "definida só no painel do Render; ausente vale `false` (cadastro fechado); mudar no painel e reiniciar abre ou fecha o cadastro sem nova versão".
- [X] T005 [P] Em `.github/workflows/ci.yml`, no `env` do job `e2e` (junto de `SEED_USER_EMAIL`/`SEED_USER_PASSWORD`), acrescentar `REGISTRATION_ENABLED: 'true'`, para a API do E2E aceitar cadastro.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contratos compartilhados, configuração da chave, sessão opcional na API e identidade (visitante ou conta) no site.

**⚠️ CRITICAL**: nenhuma história começa antes disto.

### Testes da fundação

- [X] T006 [P] Em `packages/shared/src/auth/schema.test.ts`:
  - `registerRequestSchema` aceita `{ email, password }` e `{ email, password, inviteCode }` (código de até 64 caracteres, ignorado) e recusa chave desconhecida;
  - `registrationStatusSchema` aceita `{ open: true }`, descarta campos desconhecidos e recusa `open` que não seja booleano.
- [X] T007 [P] Em `packages/shared/src/api-error.test.ts`, conferir que `registration-closed` é um código válido.
- [X] T008 [P] Em `apps/api/src/config.test.ts`, cobrir `REGISTRATION_ENABLED`:
  - ausente → `registrationEnabled: false`;
  - `''` → `false`;
  - `'false'` → `false`;
  - `'true'` → `true`;
  - `'1'`, `'yes'` e `'talvez'` → `loadConfig` lança "Configuração inválida" citando `REGISTRATION_ENABLED`, sem repetir outros valores.
- [X] T009 [P] Criar `apps/api/src/modules/auth/session.plugin.test.ts`, com `app.inject()` e um `AuthService` falso, para `createOptionalSession`:
  - sem cookie → `request.user = null` e a rota responde;
  - cookie válido → usuário preenchido e cookie reenviado quando `renewedExpiresAt` vem;
  - cookie presente e inválido → `401 unauthenticated` com `Set-Cookie` apagando `session`.
- [X] T010 [P] Em `apps/api/src/test/session.int.test.ts`, cobrir que `GET /api/auth/me` (e qualquer rota com `requireSession`) com um cookie de sessão expirado, encerrado ou mal formado responde `401 unauthenticated` **e apaga o cookie** (`Set-Cookie` com `session` expirado). Sem cookie, responde 401 sem `Set-Cookie`. Em seguida, `GET /api/puzzles/:id` sem cookie responde 200: é o caminho de quem tinha uma sessão vencida e abre o site como visitante (research R8).
- [X] T011 [P] Em `apps/web/src/api/client.test.ts` (ou num `apps/web/src/api/auth.test.ts` novo), cobrir que `getMe` devolve `null` num `401 unauthenticated` sem chamar o tratador de 401, e que outros erros continuam lançando `ApiRequestError`.
- [X] T012 [P] Substituir `apps/web/src/app/RequireSession.test.tsx` por `apps/web/src/app/viewer.test.tsx`. Cobrir:
  - `viewerLoader` resolve com e sem sessão (sem redirecionar ao login);
  - `useViewer()` devolve `{ kind: 'guest' }` com a sessão `null` e `{ kind: 'user', user }` com sessão;
  - falha de rede em `getMe` cai na tela de erro da rota.

### Implementação da fundação

- [X] T013 Em `packages/shared/src/auth/schema.ts`:
  - `registerRequestSchema = z.strictObject({ email: emailSchema, password: passwordSchema, inviteCode: z.string().max(64).optional() })`, com o comentário "aceito e ignorado só para o site anterior; sai no lançamento B (feature 013, R15)";
  - criar `registrationStatusSchema = z.object({ open: z.boolean() })` e o tipo `RegistrationStatus`;
  - exportar os dois em `packages/shared/src/index.ts`.
- [X] T014 [P] Em `packages/shared/src/api-error.ts`, acrescentar `'registration-closed'` a `apiErrorCodeSchema`. Marcar `'invalid-invite'` e `'invite-quota-reached'` com o comentário "obsoletos desde a feature 013; saem no lançamento B".
- [X] T015 Em `apps/api/src/config.ts`:
  - acrescentar `REGISTRATION_ENABLED` ao `envSchema` (`z.preprocess` com `'' → undefined`, depois `z.enum(['true', 'false'], { error: 'deve ser true ou false' }).default('false')`);
  - acrescentar `registrationEnabled: boolean` a `ServerConfig` e a `loadConfig`, com o comentário "cadastro aberto (feature 013); desligado por padrão".
- [X] T016 Em `apps/api/src/modules/auth/session.plugin.ts`, criar e exportar `createOptionalSession(auth, config, clock)`, no mesmo formato de `createRequireSession`. Sem cookie, `request.user = null`. Com cookie válido, preenche o usuário e renova o cookie. Com cookie presente e inválido, `clearSessionCookie(reply)` e `sendError(reply, 401, 'unauthenticated')`. Mudar também `createRequireSession`: quando havia cookie e ele é inválido, apagar o cookie antes do 401 (sem cookie, 401 sem `Set-Cookie`). Assim o `GET /api/auth/me` que o site faz ao abrir já limpa uma sessão vencida, e os pedidos seguintes saem como visitante. Em `apps/api/src/app.ts`, instanciar `optionalSession` ao lado de `requireSession`.
- [X] T017 Em `apps/web/src/api/auth.ts`:
  - `getMe(): Promise<AuthResponse | null>`, que chama `/api/auth/me` com `skipUnauthenticatedHandler: true` e devolve `null` em `ApiRequestError` 401;
  - `getRegistration(): Promise<RegistrationStatus>` com `registrationStatusSchema`.

  Em `apps/web/src/api/query-keys.ts`, acrescentar `registration: ['registration']` e trocar `library` por `library: (viewer: string) => ['library', viewer] as const`, ajustando os usos em `apps/web/src/features/library/` e `apps/web/src/features/library/DayRoute.tsx` (invalidar com o prefixo `['library']`).
- [X] T018 Em `apps/web/src/features/auth/useSession.ts`:
  - `sessionQueryOptions` passa a resolver `AuthResponse | null`;
  - criar `export type Viewer = { kind: 'guest' } | { kind: 'user'; user: User }`, `useViewer(): Viewer | undefined` (indefinido enquanto carrega) e `viewerKey(viewer)` (`'guest'` ou `user.id`);
  - `useLogoutMutation` passa a navegar para `/` em vez de `/login`.
- [X] T019 Criar `apps/web/src/app/viewer.ts` com `viewerLoader(queryClient)`, que só faz `ensureQueryData(sessionQueryOptions())` (resultado `null` permitido). Apagar `apps/web/src/app/RequireSession.tsx`. Em `apps/web/src/app/router.tsx`, trocar `requireSessionLoader` por `viewerLoader` nas rotas `/`, `/dia/:date` e `/jogo/:puzzleId`, e atualizar `apps/web/src/app/router.test.tsx` (abrir `/` sem sessão mostra a biblioteca, e não o login).
- [X] T020 Ajustar todo uso de `session.data.user` para a sessão anulável (`apps/web/src/app/AppLayout.tsx`, `apps/web/src/features/game/GamePage.tsx`, `apps/web/src/features/auth/LoginPage.tsx`, `apps/web/src/features/auth/RegisterPage.tsx`, `apps/web/src/features/auth/ReloginDialog.tsx`, `apps/web/src/app/session-handlers.ts`). Rodar `npm run typecheck` sem erro. Até a US1, o `GamePage` sem sessão mostra o `LoadingState`.

**Checkpoint**: API com chave validada e sessão opcional disponível; site sabe se a pessoa é visitante ou conta, e nenhuma rota exige sessão.

---

## Phase 3: User Story 1 - Jogar sem conta (Priority: P1) 🎯 MVP

**Goal**: quem abre o site sem conta vê direto o calendário do mês atual, abre um dia guardado e joga. Letras, tempo e ajudas ficam no navegador, sobrevivem a recarregar e nunca vão ao servidor.

**Independent Test**: numa janela anônima, abrir o site (calendário direto, com "Visitante" e "Entrar"), jogar parte da cruzada de hoje, recarregar e ver tudo de volta. `SELECT count(*) FROM progress` → 0. Ver quickstart §2, passos 1 a 4 e 8 a 9.

### Testes da US1

- [X] T021 [P] [US1] Em `apps/api/src/test/puzzles.int.test.ts`:
  - `GET /api/puzzles?level=daily&date=` e `GET /api/puzzles/:id` sem cookie respondem `200 { puzzleId, puzzle, solution }`;
  - com cookie inválido, `401` e `Set-Cookie` apagando `session`;
  - a busca na fonte de um dia passado sem cookie conta no `PUZZLE_FETCH` por endereço e responde 429 ao passar do limite.
- [X] T022 [P] [US1] Em `apps/api/src/test/library.int.test.ts`:
  - `GET /api/library` sem cookie devolve os mesmos `puzzleId`, na mesma ordem, que um usuário com progresso veria, todos com `status: 'not_started'` e `elapsedMs`, `finishedMs`, `completedAt`, `bestMs` e `bestAt` nulos, mesmo havendo linhas em `progress`;
  - com cookie inválido, `401`.
- [X] T023 [P] [US1] Em `apps/api/src/modules/library/library.service.test.ts`, cobrir `toPublicLibraryItem(row)`: sempre `not_started` e tempos nulos.
- [X] T024 [P] [US1] Criar `apps/web/src/features/guest/guest-record.test.ts` para `guestProgressRecordSchema`:
  - aceita um registro completo com `v: 1`;
  - recusa `v` diferente de 1, `elapsedMs` fora de 0 a `MAX_ELAPSED_MS`, `bestMs` sem `bestAt` (e vice-versa), `status` desconhecido e `savedAt` que não seja instante ISO;
  - recusa qualquer campo `solution`: o schema é `strictObject`.
- [X] T025 [P] [US1] Criar `apps/web/src/game-logic/guest-progress.test.ts` com a tabela de `decideGuestSave` em andamento (data-model §1):
  - sem registro → `apply`;
  - `savedAt` mais antigo → `unchanged`;
  - `in_progress → in_progress` → `apply` com letras, tempo, ajudas e `savedAt` novos;
  - concluído recebendo `in_progress` → `unchanged`.
- [X] T026 [P] [US1] Criar `apps/web/src/features/guest/guest-store.test.ts` (com `fake-indexeddb`):
  - `save` e `get` devolvem o registro;
  - duas gravações com `savedAt` fora de ordem deixam a mais nova;
  - gravações seguidas sem esperar ficam só com a última;
  - registro inválido no banco → `get` devolve `null` e o apaga;
  - registro com dimensões diferentes da grade (`getForPuzzle(puzzleId, grid)` com `cellsMatchGrid`) → `null` e apagado;
  - `indexedDB` ausente ou `open` falhando → `available === false`, e `save`/`get` funcionam em memória.
- [X] T027 [P] [US1] Criar `apps/web/src/features/guest/guest-save-queue.test.ts`:
  - `schedule` grava na hora no store (sem debounce);
  - o estado fica `'saved'`, ou `'local-only'` quando o store não está disponível;
  - nunca vira `'offline'` nem `'session-expired'`;
  - nenhum `fetch` é chamado.
- [X] T028 [P] [US1] Em `apps/web/src/features/game/GamePage.test.tsx`:
  - sem sessão, abre a cruzada só com `GET /api/puzzles/:id` (nenhum pedido a `/api/progress`);
  - digitar letras grava no IndexedDB;
  - desmontar e montar de novo restaura letras, tempo e ajuda usada;
  - usar "Verificar" sem digitar mais nada, desmontar e montar de novo: as marcas continuam (FR-004);
  - mostra "Salvo neste aparelho" e o link "Entrar para salvar na sua conta";
  - com o store indisponível, mostra o `Notice` "Seu navegador não deixou guardar o progresso. Ele vale só enquanto esta aba estiver aberta." sem cobrir o tabuleiro;
  - mostra a atribuição à fonte ("Fonte: …") também no modo visitante (FR-024);
  - inclui `vitest-axe`.
- [X] T029 [P] [US1] Em `apps/web/src/features/library/LibraryPage.test.tsx`, cobrir que, sem sessão, `/` mostra direto o calendário do mês atual, sem diálogo, banner nem `Notice` por cima. O `AppLayout` mostra "Visitante" e o link "Entrar" com `?next=` da rota atual. Chegar a "Entrar" com `user.tab()`, com foco visível, e segui-lo com Enter (SC-007). Incluir `vitest-axe`.

### Implementação da US1

- [X] T030 [US1] Em `apps/api/src/modules/puzzles/puzzles.routes.ts`, receber `optionalSession` em vez de `requireSession` nas duas rotas, sem exigir `request.user`. Em `apps/api/src/modules/puzzles/puzzles.schemas.ts`, trocar `security` para `[{}, { session: [] }]` e acrescentar que a sessão é opcional na descrição. Em `apps/api/src/app.ts`, passar `optionalSession` ao registrar `puzzlesRoutes`.
- [X] T031 [US1] Em `apps/api/src/modules/library/library.repository.ts`, criar `listPuzzleRows(db, limit)`. Ele seleciona só `puzzleId`, `date` e `level` de `puzzles`, com a mesma ordem de `listLibraryRows` (`date desc, level asc, puzzleId asc`), sem `JOIN` e sem `data`/`solution`.
- [X] T032 [US1] Em `apps/api/src/modules/library/library.service.ts`, criar `toPublicLibraryItem(row)` e `listPublic()`, com `LIBRARY_LIMIT`. Em `apps/api/src/modules/library/library.routes.ts`, usar `optionalSession`: com usuário, `library.list(user.id)`; sem usuário, `library.listPublic()`. Em `apps/api/src/modules/library/library.schemas.ts`, `security: [{}, { session: [] }]`. Em `apps/api/src/app.ts`, passar `optionalSession`.
- [X] T033 [P] [US1] Criar `apps/web/src/features/guest/guest-record.ts` com `guestProgressRecordSchema`, um `z.strictObject` com os campos de data-model §1:
  - `v: z.literal(1)`, `puzzleId: z.uuid()`, `date: isoDateSchema`, `cells: progressCellsSchema`;
  - `elapsedMs`, `finishedMs` e `bestMs` como inteiro de 0 a `MAX_ELAPSED_MS` (os dois últimos `.nullable()`);
  - `status: progressStatusSchema`;
  - `savedAt`, `completedAt` e `bestAt` como `z.iso.datetime({ offset: true })` (os dois últimos `.nullable()`);
  - `help` com o mesmo formato de `helpSchema` de `help-storage.ts` (exportá-lo de lá), `.nullable()`;
  - `refine`: `bestMs` e `bestAt` juntos;
  - tipo `GuestProgressRecord`.
- [X] T034 [P] [US1] Criar `apps/web/src/game-logic/guest-progress.ts` com `decideGuestSave(current, incoming, now): { kind: 'apply'; next } | { kind: 'unchanged' }`, que trata os casos em andamento de data-model §1. A conclusão fica para a T047. Sem dependência de React nem de IndexedDB.
- [X] T035 [US1] Criar `apps/web/src/features/guest/guest-store.ts` com `idb`:
  - `openDB<GuestDB>('cruzadinha-visitante', 1, { upgrade(db) { db.createObjectStore('progress', { keyPath: 'puzzleId' }) } })`, aberto uma vez por carregamento;
  - `get(puzzleId)`, `getForPuzzle(puzzleId, grid)`, `getAll()` (cada registro validado por `guestProgressRecordSchema`, e os inválidos apagados);
  - `save(incoming)`: transação `readwrite` que lê, aplica `decideGuestSave` e grava. Se uma gravação estiver em andamento, guarda só a mais nova para a seguinte;
  - `reset(puzzleId)` (implementado na US2);
  - `available` e `subscribe` para o estado de disponibilidade;
  - em qualquer falha de abertura ou gravação, passa para um `Map` em memória pelo resto da página (research R2);
  - nunca grava a solução.
- [X] T036 [US1] Criar `apps/web/src/features/guest/guest-save-queue.ts`, com a mesma interface `SaveQueue` de `save-queue.ts` (`getState`, `subscribe`, `schedule`, `sendNow`, `retry`, `readOutbox`, `dispose`), gravando no `guest-store` a cada chamada, sem debounce e sem rede. Acrescentar `'local-only'` a `SaveState` em `apps/web/src/features/game/save-queue.ts`.
- [X] T037 [US1] Em `apps/web/src/features/game/useGame.ts`, trocar `user: User` por `viewer: Viewer` e `progress` por `initial: { cells, elapsedMs, status, help } | null`:
  - **visitante**: usa `createGuestSaveQueue` e carrega a ajuda do registro (não do `localStorage`); o `schedule` roda quando mudam `cells` **ou** `usage`, `marks` ou `locked` (uma verificação que só marca células também é gravada na hora); o tempo é gravado também ao ocultar a aba e ao pausar;
  - **conta**: comportamento atual, sem mudança.
- [X] T038 [US1] Em `apps/web/src/features/game/GamePage.tsx`:
  - visitante: buscar o registro com `useQuery({ queryKey: ['guest-progress', puzzleId], queryFn: () => guestStore.getForPuzzle(puzzleId, grid), gcTime: 0 })` depois do puzzle, e não chamar `getProgress`;
  - conta: como hoje;
  - montar `<Game key={puzzleId + ':' + viewerKey(viewer)} …>`;
  - mostrar o `Notice` de armazenamento indisponível quando `guestStore.available` for falso;
  - remover o `LoadingState` provisório da T020 para quem não tem sessão: o visitante passa a ver o jogo.
- [X] T039 [P] [US1] Em `apps/web/src/features/game/SaveStatus.tsx`, tratar o modo visitante: o texto "Salvo neste aparelho" e o link "Entrar para salvar na sua conta" (`/login?next=/jogo/<id>`) em `aria-live="polite"`, sem avisos de rede. Atualizar `apps/web/src/features/game/SaveStatus.test.tsx`.
- [X] T040 [US1] Em `apps/web/src/app/AppLayout.tsx`, quando a pessoa é visitante, mostrar o texto "Visitante" e o link "Entrar" (`/login?next=` com a rota atual). Logado, mostrar o e-mail da conta e "Sair". Nada é aberto por cima do conteúdo.
- [X] T041 [US1] Em `apps/web/src/features/library/LibraryPage.tsx`, buscar a biblioteca com `queryKeys.library(viewerKey(viewer))`. Com a API anterior (biblioteca de visitante respondendo 401 mesmo sem cookie), mostrar um `ErrorState` com o título "Entre para ver a biblioteca" e o link "Entrar", em vez de travar (research R19). A consulta da biblioteca usa `retry: false`. A T074 refaz a busca no máximo uma vez, então esse estado é o final, sem laço de pedidos.

**Checkpoint**: o visitante joga e retoma; a US1 pode ser demonstrada sozinha.

---

## Phase 4: User Story 2 - Concluir e acompanhar cruzadas como visitante (Priority: P1)

**Goal**: o visitante conclui com a janela de conclusão na hora, tem recorde no aparelho, usa "Jogar de novo" sem rede e vê a situação de cada dia no calendário.

**Independent Test**: concluir uma cruzada como visitante, ver o dia como concluído com o tempo, usar "Jogar de novo" offline e conferir que o recorde ficou. Ver quickstart §2, passos 5 a 7.

### Testes da US2

- [X] T042 [P] [US2] Em `apps/web/src/game-logic/guest-progress.test.ts`, acrescentar:
  - `in_progress → completed` grava `completedAt = now`, `finishedMs = elapsedMs` e o recorde (`bestMs` = menor entre o atual e `elapsedMs`, `bestAt = now` só quando bate o recorde);
  - `completed → completed` → `unchanged`;
  - `decideGuestReset` zera letras, tempo, `help`, `completedAt` e `finishedMs`, põe `status = in_progress` e mantém `bestMs`/`bestAt`.
- [X] T043 [P] [US2] Criar `apps/web/src/features/guest/guest-library.test.ts` para `mergeGuestLibrary(items, records)`, com a tabela de data-model §1:
  - sem registro → `not_started` com tempos nulos;
  - `in_progress` sem letras → `not_started` só com o recorde;
  - `in_progress` com letras → `elapsedMs` e recorde;
  - `completed` → `finishedMs`, `completedAt` e recorde;
  - registro de um `puzzleId` fora da lista é ignorado.
- [X] T044 [P] [US2] Em `apps/web/src/features/game/GameCompletion.test.tsx` e `apps/web/src/features/game/ReadMode.test.tsx`, cobrir o visitante:
  - completar a grade abre a janela de conclusão na hora, com o tempo e o recorde do aparelho e sem "Vamos registrar quando a conexão voltar", também com `navigator.onLine = false`;
  - reabrir uma concluída abre em modo leitura;
  - "Jogar de novo" sem rede reinicia do zero e mantém o recorde;
  - nenhum `fetch` a `/api/progress`.
- [X] T045 [P] [US2] Em `apps/web/src/features/library/LibraryPage.test.tsx`, cobrir que, sem sessão e com registros no IndexedDB (em andamento e concluído), o calendário mostra a situação e o tempo por texto em cada dia, e os outros dias como não iniciados.
- [X] T046 [P] [US2] Em `apps/web/src/features/guest/guest-store.test.ts`, acrescentar `reset(puzzleId)`: o recorde fica, e um `save` concluído seguido de um `save` em andamento mais novo não reabre a cruzada.

### Implementação da US2

- [X] T047 [US2] Em `apps/web/src/game-logic/guest-progress.ts`, completar `decideGuestSave` com os casos de conclusão e criar `decideGuestReset(current, now)` (data-model §1).
- [X] T048 [US2] Em `apps/web/src/features/guest/guest-store.ts`, implementar `reset(puzzleId)` numa transação `readwrite` com `decideGuestReset`.
- [X] T049 [P] [US2] Criar `apps/web/src/features/guest/guest-library.ts` com `mergeGuestLibrary(items: LibraryItem[], records: GuestProgressRecord[]): LibraryItem[]`, pura, com a mesma derivação de `toLibraryItem` da API.
- [X] T050 [US2] Em `apps/web/src/features/game/useGame.ts`, no modo visitante:
  - a conclusão grava `status: 'completed'` pelo `guest-save-queue` e despacha `confirmCompletion` logo depois da gravação, sem aviso de rede;
  - `playAgain` chama `guestStore.reset`, limpa o estado local e reinicia o relógio, sem pedir nada ao servidor, e devolve `'ok'`;
  - o recorde mostrado vem do registro.

  Em `apps/web/src/features/game/CompletionDialog.tsx`, aceitar o recorde do visitante e esconder o aviso "Vamos registrar…" no modo visitante.
- [X] T051 [US2] Em `apps/web/src/features/library/LibraryPage.tsx`, quando a pessoa é visitante, juntar `getLibrary()` com `guestStore.getAll()` por `mergeGuestLibrary` antes de passar os itens ao `Calendar`. O `DayCell` não muda.

**Checkpoint**: experiência completa de visitante (US1 e US2).

---

## Phase 5: User Story 3 - Cadastro sem convite, controlado por chave (Priority: P2)

**Goal**: com a chave ligada, cadastro só com e-mail e senha. Com a chave desligada (o padrão), sem opção no site e com a API recusando. O autor cria contas pela linha de comando.

**Independent Test**: quickstart §4 e §5.

### Testes da US3

- [X] T052 [P] [US3] Reescrever `apps/api/src/test/register.int.test.ts`:
  - **chave desligada**: `POST /api/auth/register` → `403 registration-closed`, nenhuma linha nova em `users` e nenhuma tentativa `REGISTER` gravada;
  - **chave ligada**: e-mail e senha válidos → `201`, cookie de sessão e `users` com hash argon2id;
  - `inviteCode` enviado → ignorado;
  - e-mail repetido → `409 registration-failed`, sem dizer que o e-mail existe;
  - formato inválido → `400 invalid-input` com `fields`;
  - 11ª tentativa do mesmo endereço em 1 hora → `429` com `Retry-After`;
  - `GET /api/auth/registration` → `{ open }` igual à chave, com `Cache-Control: no-store`.
- [X] T053 [P] [US3] Reescrever `apps/api/src/test/cli.int.test.ts` para `users create`, com um `readSecret` falso:
  - cria a conta com e-mail normalizado e senha confirmada → código 0, `Conta criada: <email>`, com a chave desligada;
  - e-mail existente → código 1, `Já existe uma conta com esse e-mail.`, sem alterar a conta;
  - senha curta, confirmação diferente, `--email` ausente, `--password` → código 2;
  - a senha nunca aparece em `stdout`/`stderr`;
  - `invites create` → código 2, "Comando desconhecido.";
  - `puzzles collect` continua igual.
- [X] T054 [P] [US3] Em `apps/web/src/features/auth/LoginPage.test.tsx`:
  - com `GET /api/auth/registration` → `{ open: false }`, não há "Criar conta";
  - com `{ open: true }`, há o link "Criar conta";
  - com a rota falhando (404 ou rede), não há "Criar conta";
  - sempre há o link "Jogar sem entrar" para `/`;
  - "Jogar sem entrar" e "Criar conta" são alcançados com `user.tab()` e seguidos com Enter (SC-007).
- [X] T055 [P] [US3] Reescrever `apps/web/src/features/auth/RegisterPage.test.tsx`:
  - formulário só com e-mail e senha (sem campo de convite);
  - cadastro fechado (ou sem resposta) → "O cadastro está fechado no momento." e o link "Entrar", sem formulário;
  - envio recusado com `403 registration-closed` (aba antiga) → a mesma mensagem;
  - sucesso → chega à biblioteca logado;
  - inclui `vitest-axe`.

### Implementação da US3

- [X] T056 [US3] Em `apps/api/src/modules/auth/auth.service.ts`:
  - criar `createAccount({ email, password }): Promise<{ ok: true; user } | { ok: false; reason: 'email-taken' }>`, com hash fora da transação e `insertIfEmailFree`;
  - reescrever `register({ email, password })` para criar a conta e abrir a sessão numa transação, sem convite (`registration-failed` para e-mail existente);
  - tirar os imports de `invites.repository` e de `inviteCodeSchema`.
- [X] T057 [US3] Em `apps/api/src/modules/auth/auth.routes.ts`, com `config.registrationEnabled`:
  - `POST /api/auth/register` responde `403 registration-closed` antes de `admitRegistration` quando a chave está desligada; tirar o ramo `invalid-invite`;
  - criar `GET /api/auth/registration` → `{ open: config.registrationEnabled }` com `reply.header('cache-control', 'no-store')`.

  Em `apps/api/src/modules/auth/auth.schemas.ts`, documentar a rota nova (resposta com `registrationStatusSchema` via `toDocSchema`), o `403 registration-closed` no cadastro e o pedido sem convite obrigatório.
- [X] T058 [US3] Em `apps/api/src/cli/run-cli.ts`:
  - acrescentar `readSecret: (prompt: string) => Promise<string>` a `CliDeps` e o comando `users create --email <email>` (`parseArgs` com só `email`, `allowPositionals: false`), conforme a tabela de `contracts/api.md`;
  - pedir "Senha: " e "Confirme a senha: ", validar com `emailSchema`/`passwordSchema` e chamar `createAuthService(...).createAccount`;
  - atualizar o `USAGE`.
- [X] T059 [US3] Em `apps/api/src/cli.ts`, implementar `readSecret`:
  - com `process.stdin.isTTY`, usar `node:readline` com a saída silenciada enquanto se digita (sem eco);
  - sem TTY, ler a primeira linha da entrada padrão;
  - nunca registrar o valor.

  Consultar a documentação atual do `node:readline` antes.
- [X] T060 [P] [US3] Criar `apps/web/src/features/auth/useRegistration.ts`, com `useQuery({ queryKey: queryKeys.registration, queryFn: getRegistration, staleTime: 60_000 })` e `isOpen = data?.open === true` (erro ou carregando ⇒ fechado).
- [X] T061 [US3] Em `apps/web/src/features/auth/LoginPage.tsx`, acrescentar o link "Jogar sem entrar" para `/` e o link "Criar conta" (`/cadastro`, mantendo `?next=`) só quando `isOpen`.
- [X] T062 [US3] Em `apps/web/src/features/auth/RegisterPage.tsx`, tirar o campo e o estado do código de convite. Quando `!isOpen`, mostrar "O cadastro está fechado no momento." e o link "Entrar". No erro `registration-closed`, mostrar a mesma mensagem. Em `apps/web/src/features/auth/messages.ts`, acrescentar `registration-closed` e tirar as mensagens de convite.

**Checkpoint**: cadastro controlado pela chave e criação de conta pelo autor funcionando.

---

## Phase 6: User Story 4 - Fim dos convites (Priority: P2)

**Goal**: nenhuma tela, comando ou rota cria, lista, revoga ou aceita convite. A tabela continua até o lançamento B.

**Independent Test**: quickstart §7.

### Testes da US4

- [X] T063 [P] [US4] Em `apps/api/src/docs/docs.test.ts`, conferir que o documento OpenAPI não tem `/api/invites` e tem `/api/auth/registration`. Em `apps/api/src/app.test.ts`, conferir que `POST /api/invites` e `GET /api/invites` respondem 404.
- [X] T064 [P] [US4] Em `apps/web/src/app/router.test.tsx` (ou num teste do `AppLayout`), conferir que, logado e fora do tabuleiro, digitar ↑ ↑ ↓ ↓ ← → ← → B A não abre nenhum diálogo e não faz nenhum pedido.

### Implementação da US4

- [X] T065 [US4] Apagar `apps/api/src/modules/invites/` inteiro (com `invite-status.test.ts`) e `apps/api/src/test/invites.int.test.ts`. Em `apps/api/src/app.ts`, tirar `invitesRoutes` e `createInvitesService`.
- [X] T066 [P] [US4] Em `apps/api/src/lib/tokens.ts`, tirar `INVITE_CODE_ALPHABET`, `generateInviteCode`, `formatInviteCode` e `normalizeInviteCode`, e os casos correspondentes de `apps/api/src/lib/tokens.test.ts`. Em `apps/api/src/modules/rate-limit/limits.ts` e `apps/api/src/modules/rate-limit/rate-limit.service.test.ts`, tirar `inviteCreate`.
- [X] T067 [P] [US4] Em `apps/api/src/cli/run-cli.ts`, tirar `createInvite`, `listInvites`, `revokeInvite`, `formatTable`, `STATUS_LABEL`, `daysSchema` e os imports de convite.
- [X] T068 [P] [US4] Apagar `packages/shared/src/invites/` (com `schema.test.ts`) e o export correspondente em `packages/shared/src/index.ts`. Conferir que nenhum outro arquivo os importa.
- [X] T069 [P] [US4] Apagar `apps/web/src/features/invites/` inteiro (com os testes) e `apps/web/src/api/invites.ts`. Tirar `<KonamiListener />` de `apps/web/src/app/AppLayout.tsx` e `invites` de `apps/web/src/api/query-keys.ts`. Revisar `apps/web/src/components/Dialog.test.tsx`, se ele usa o convite como exemplo.
- [X] T070 [US4] Atualizar os testes que ainda criam convites para criar a conta direto, com `insertIfEmailFree` ou `createAccount`: `apps/api/src/test/session.int.test.ts`, `library.int.test.ts`, `progress.int.test.ts`, `puzzles.int.test.ts`, `secrets.int.test.ts`, `seed.int.test.ts` e `conventions.int.test.ts`. O `TRUNCATE` continua incluindo `invites` até o lançamento B. Rodar `npm run test:int` verde.

**Checkpoint**: nenhum código de aplicação usa convites.

---

## Phase 7: User Story 5 - Entrar numa conta depois de jogar como visitante (Priority: P3)

**Goal**: entrar mostra o progresso da conta, sem levar nada do visitante. Sair volta a visitante com os dados de visitante intactos. A sessão que termina fora do tabuleiro vira navegação de visitante com aviso.

**Independent Test**: quickstart §6.

### Testes da US5

- [X] T071 [P] [US5] Em `apps/web/src/features/game/GamePage.test.tsx`:
  - com um registro de visitante no IndexedDB, entrar (gravar a sessão no cache) remonta o jogo com o progresso da conta vindo de `GET /api/progress/:id`, sem letras de visitante, e nenhum `PUT` leva as letras de visitante;
  - sair (sessão `null`) remonta com o registro de visitante igual ao de antes;
  - o IndexedDB não é lido nem gravado enquanto há sessão.
- [X] T072 [P] [US5] Criar `apps/web/src/app/session-handlers.test.ts`:
  - um `401 unauthenticated` fora de `/jogo/` grava a sessão como `null`, invalida `['library']` e não navega para `/login`;
  - em `/jogo/…` com sessão de conta, só chama `markExpired`; com visitante, não chama nada;
  - fora de `/jogo/` com visitante, não grava, não invalida e não avisa;
  - em `/login` e `/cadastro`, nada.
- [X] T073 [P] [US5] Em `apps/web/src/features/library/LibraryPage.test.tsx` (ou num teste do `AppLayout`), cobrir que, depois do 401 fora do tabuleiro, aparece o `Notice` "Sua sessão terminou. Você está como visitante." com o botão "Entrar", e a biblioteca passa à de visitante. O botão é alcançado com `user.tab()` e acionado com Enter, e o aviso não rouba o foco (SC-007). Incluir `vitest-axe`. Cobrir também que "Sair" leva a `/` como visitante.

### Implementação da US5

- [X] T074 [US5] Criar `apps/web/src/app/session-ended.ts`, um store pequeno como `session-expired.ts`, com `markEnded`, `clearEnded` e `useSessionEnded`. Em `apps/web/src/app/session-handlers.ts`, trocar o caso "outras telas" para que, **só quando a sessão em cache era de uma conta**, faça `queryClient.setQueryData(queryKeys.session, null)`, `invalidateQueries({ queryKey: ['library'] })` (uma única busca nova) e `markEnded()`, sem redirecionar. Se a pessoa já era visitante, o 401 não faz nada (nem invalida nem avisa), e a tela trata o erro sozinha (T041), o que evita um laço de pedidos contra a API anterior. No caso `/jogo/`, chamar `markExpired` também **só quando a sessão em cache era de uma conta**; para o visitante, um 401 inesperado não abre a janela de login. Cobrir os ramos em `apps/web/src/app/session-handlers.test.ts` (T072).
- [X] T075 [US5] Em `apps/web/src/app/AppLayout.tsx`, mostrar o `Notice` "Sua sessão terminou. Você está como visitante." com o botão "Entrar" (`/login?next=` com a rota atual) quando `useSessionEnded()` for verdadeiro. Ele some ao fechar ou quando a sessão volta (`clearEnded` no `onSuccess` do login em `apps/web/src/features/auth/useSession.ts`).
- [X] T076 [US5] Em `apps/web/src/features/game/useGame.ts` e `apps/web/src/features/game/GamePage.tsx`, garantir a separação: o modo visitante nunca lê nem grava `cruzadinha:outbox:*` nem `cruzadinha:help:*`, e o modo conta nunca lê nem grava o `guest-store`. Garantir que a `key` do `Game` muda ao entrar e ao sair.

**Checkpoint**: todas as histórias funcionando juntas.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T077 [P] Atualizar `apps/web/e2e/support.ts`: tirar `createInviteCode` e criar `createAccount(email, password)` via `npm run cli -w @cruzadinha/api -- users create --email <email>`, com a senha pela entrada padrão. Manter `invites` no `TRUNCATE` até o lançamento B.
- [X] T078 [P] Atualizar `apps/web/e2e/fluxo-principal.spec.ts` para cadastrar só com e-mail e senha (a API do E2E com `REGISTRATION_ENABLED=true`), mantendo o resto do fluxo.
- [X] T079 Criar `apps/web/e2e/visitante.spec.ts`. O fluxo:
  1. abre `/` sem sessão e vê o calendário direto, com "Visitante";
  2. abre a cruzada de amostra do seed e digita letras;
  3. recarrega e vê as letras de volta;
  4. conclui e vê a janela na hora;
  5. volta ao calendário e vê o dia concluído;
  6. usa "Jogar de novo";
  7. confere no banco (`SELECT count(*) FROM progress`) que é 0.

  No passo 2, medir o tempo entre abrir `/` e o tabuleiro aceitar a primeira letra: precisa ficar abaixo de 30 s com o servidor já acordado (SC-001). Incluir `@axe-core/playwright` na biblioteca e no jogo de visitante.
- [X] T080 [P] Criar `apps/web/public-headers.test.ts` (rodando em node, como `version-plugin.test.ts`). Ele lê `apps/web/public/_headers` e `apps/web/public/robots.txt` e confere que `/*` tem `X-Robots-Tag: noindex, nofollow` e que o `robots.txt` bloqueia todos os robôs (constitution VIII, FR-025). Trocar o comentário "Site privado" do `_headers` por "Site sem divulgação em buscadores (constitution VIII)".
- [X] T081 [P] Atualizar `docs/design.md`:
  - regras 18 a 26 (convites) → cadastro aberto com chave, `users create` e visitante;
  - o item da estrutura `invites/` → `guest/`;
  - testes de ponta a ponta → visitante e cadastro sem convite.
- [X] T082 [P] Atualizar `docs/deploy.md` com `REGISTRATION_ENABLED`: o que faz, padrão `false`, como abrir e fechar o cadastro no painel do Render (Environment → valor `true`/`false` → reiniciar), e por que ela é `sync: false` no `render.yaml` (a sincronização do Blueprint não sobrescreve o painel) e com a criação de contas pelo shell do Render: `node apps/api/dist/cli.mjs users create --email <email>`, que pede a senha sem eco.
- [X] T083 [P] Atualizar `CLAUDE.md`:
  - versão da constitution (4.0.0);
  - um item "Feature 013" no "Current state";
  - os comandos (`users create` no lugar de `invites`, e `REGISTRATION_ENABLED`);
  - a descrição de `src/modules` (sem `invites`, com a sessão opcional) e a de `apps/web` (`features/guest`, sem `invites`, IndexedDB com `idb`).
- [X] T084 Rodar `npm run format && npm run lint && npm run typecheck && npm test && npm run build`, `npm run test:int` e `npm run test:e2e -w @cruzadinha/web`. Seguir `specs/013-jogo-sem-login/quickstart.md` §2 a §7 à mão e registrar ali qualquer diferença encontrada.

---

## Phase 9: Lançamento B (PR separado, depois que o lançamento A estiver publicado)

**Purpose**: apagar os dados de convite e o que ficou só por compatibilidade (FR-021; research R15; `docs/versionamento.md` §8). **Não começar antes de a versão da API do lançamento A estar no ar.**

- [ ] T085 Criar a branch `refactor/remover-tabela-convites` a partir da `main` atualizada.
- [ ] T086 Em `apps/api/src/db/schema.ts`, tirar a tabela `invites` e `INVITE_CREATE` de `rateLimitActions` e do `CHECK` `rate_limit_attempts_action_check`. Rodar `npm run db:generate -w @cruzadinha/api -- --name drop_invites`. Revisar o SQL gerado em `apps/api/drizzle/0004_drop_invites.sql` e acrescentar à mão, antes de recriar o `CHECK`, `DELETE FROM "rate_limit_attempts" WHERE "action" = 'INVITE_CREATE';`. Nunca usar `drizzle-kit push`.
- [ ] T087 Em `apps/api/src/test/conventions.int.test.ts` (ou num teste novo), conferir depois das migrações que a tabela `invites` não existe, que não há linhas `INVITE_CREATE` e que um `INSERT` com `INVITE_CREATE` falha no `CHECK`. Tirar `invites` do `TRUNCATE` em `apps/api/src/test/database.ts` e em `apps/web/e2e/support.ts`.
- [ ] T088 [P] Em `packages/shared/src/api-error.ts`, tirar `invalid-invite` e `invite-quota-reached`. Em `packages/shared/src/auth/schema.ts`, tirar o `inviteCode` opcional de `registerRequestSchema` (pedido com `inviteCode` volta a ser `400`). Atualizar os testes de `shared` e `register.int.test.ts`.
- [ ] T089 [P] Atualizar `docs/data-definitions/DDE-001-banco-auth-convites.md` e `docs/entity-relationship-diagrams/ERD-001-banco-auth-convites.md`, sem a tabela `invites` e com uma nota sobre a feature 013.
- [ ] T090 Rodar `npm run test:int` e `npm run db:migrate -w @cruzadinha/api` contra um banco local com dados (as migrações são idempotentes), e conferir quickstart §8.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup e **bloqueia todas as histórias**.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende da US1, porque reusa `guest-store`, `guest-progress` e o modo visitante de `useGame`.
- **US3 (Phase 5)**: depende só da Foundational (T013 a T015). Pode correr em paralelo à US1 e à US2.
- **US4 (Phase 6)**: depende da US3 (T056: o `register` já sem convite, antes de apagar o repositório de convites).
- **US5 (Phase 7)**: depende da US1 (modo visitante no jogo) e da Foundational (handlers).
- **Polish (Phase 8)**: depende de todas as histórias.
- **Lançamento B (Phase 9)**: depende do lançamento A **publicado**, num PR separado.

### Within Each User Story

- Os testes primeiro, e precisam falhar.
- Schemas e regras puras, depois o store e os serviços, depois as rotas e telas, e por fim a integração.

### Parallel Opportunities

- Setup: T003, T004 e T005.
- Foundational: os testes T006 a T012 juntos; T014 em paralelo a T013 e T015.
- US1: os testes T021 a T029 juntos; T033 e T034 juntos; o lado da API (T030 a T032) em paralelo ao lado do site (T033 a T041).
- US3 inteira em paralelo à US1 e à US2: o lado da API (T052, T053, T056 a T059) é independente do site (T054, T055, T060 a T062).
- US4: T066, T067, T068 e T069 juntos, depois de T065.

## Parallel Example: User Story 1

```text
# Testes juntos:
T021 puzzles.int.test.ts   T022 library.int.test.ts   T024 guest-record.test.ts
T025 guest-progress.test.ts   T026 guest-store.test.ts   T027 guest-save-queue.test.ts

# Implementação em duas frentes:
API:  T030 → T031 → T032
Site: T033 + T034 → T035 → T036 → T037 → T038 → T039/T040/T041
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 e Phase 2.
2. Phase 3 (US1): o visitante já abre o calendário e joga com o progresso no aparelho.
3. **Parar e validar** com quickstart §2, passos 1 a 4 e 8 a 9.

### Incremental Delivery

1. Fundação e US1, depois US2 (experiência completa de visitante).
2. US3 (chave e `users create`) e US4 (fim dos convites): com elas, o cadastro por convite some.
3. US5 (entrar e sair, sessão terminada).
4. Polish e PR do lançamento A. Depois de publicado, o PR do lançamento B.

O lançamento A só deve ser publicado com a US3 e a US4 juntas. A US4 sem a US3 deixaria o cadastro sem caminho. A US3 sem a US4 deixaria convites aceitos e ignorados ao mesmo tempo, o que é inofensivo, mas confuso.

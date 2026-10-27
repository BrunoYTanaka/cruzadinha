---

description: "Task list for feature 041 - PWA e modo offline"
---

# Tasks: PWA e modo offline

**Input**: Design documents from `/specs/041-pwa-modo-offline/`

**Prerequisites**: plan.md, spec.md, research.md (R1 a R10), data-model.md, contracts/site-offline.md, quickstart.md

**Tests**: Incluídos. A constituição (princípios V e VII) e o plano exigem testes de unidade para as regras puras e um caminho e2e; cada tarefa de teste vem antes da implementação que ela cobre e deve falhar primeiro.

**Organization**: Tarefas agrupadas por história de usuário. Só `apps/web` muda (API e `packages/shared` intocados). Cada unidade de `shared/{hooks,services}` fica na própria pasta com seu `.module.css` e testes (regra da feature 037); importadores nomeiam o arquivo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1 a US4, conforme spec.md
- Todos os caminhos são relativos à raiz do repositório

---

## Phase 1: Setup

**Purpose**: dependência, ordem de features e tipos

- [X] T001 Add `vite-plugin-pwa` 2.0.0 as devDependency of `apps/web` (`npm i -D vite-plugin-pwa@2.0.0 -w @cruzadinha/web`) and commit the updated `package-lock.json`
- [X] T002 [P] Change `FEATURE_ORDER` to `['session', 'guest', 'offline', 'library', 'settings', 'game']` in `.dependency-cruiser.cjs`
- [X] T003 [P] Declare the `virtual:pwa-register` module and the `BeforeInstallPromptEvent` interface (no `any`) in `apps/web/src/vite-env.d.ts`
- [X] T004 [P] Create the feature skeleton `apps/web/src/features/offline/index.ts` (empty public entry, filled as exports appear; export only names other areas use)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: service worker da casca, banco offline, estado de conexão, portão sem rede e último usuário. Nenhuma história começa antes.

**⚠️ CRITICAL**: US1 a US4 dependem desta fase.

- [X] T005 Configure `VitePWA({ registerType: 'prompt', workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api\//] } })` in `apps/web/vite.config.ts` with NO `runtimeCaching`, NO `skipWaiting`, NO `clientsClaim`; keep `./version-plugin.ts` imported with its extension (research R1, R2)
- [X] T006 Register the service worker with `registerSW({ immediate: true })` from `virtual:pwa-register` (never pass `onNeedRefresh`, never call `updateSW`) in `apps/web/src/main.tsx` (depends on T005)
- [X] T007 [P] Add `/sw.js` and `/manifest.webmanifest` with `Cache-Control: no-cache` to `apps/web/public/_headers` (keep the `/*` noindex rule)
- [X] T008 [P] Write failing tests for `useOnline` (initial `navigator.onLine`, reacts to `online`/`offline` events) in `apps/web/src/shared/hooks/useOnline/useOnline.test.ts`
- [X] T009 [P] Implement `useOnline()` with `useSyncExternalStore` over `online`/`offline` and `navigator.onLine` in `apps/web/src/shared/hooks/useOnline/useOnline.ts`
- [X] T010 [P] Write failing tests for the offline store (store `puzzles` keyed by `puzzleId`; read validated with `puzzleResponseSchema`, invalid record deleted and treated as absent; `openedAt` updated on read; limit `OFFLINE_PUZZLE_LIMIT = 60` removes the lowest `openedAt` but never the just-opened one, ones with an outbox of any account, ones in progress in `guestStore`, or ones in `known-progress`; storage failure resolves without throwing; store `known-progress` keyed `[userId, puzzleId]` with `Progress` validated on read; delete by `userId` and delete all except one `userId`) in `apps/web/src/features/offline/services/offline-store/offline-store.test.ts` using `fake-indexeddb`
- [X] T011 Implement the IndexedDB `cruzadinha-offline` (via `idb`; stores `puzzles` with index `by-openedAt` and `known-progress`; fields `puzzleId`, `response`, `source`, `date`, `openedAt`; everything read enters as `unknown` and goes through the `shared` schemas; call `navigator.storage.persist()` once on the first save, ignoring refusal) in `apps/web/src/features/offline/services/offline-store/offline-store.ts` (depends on T010)
- [X] T012 [P] Write failing tests for the server-wake offline exit (`waitForServer` and `whenServerReady` resolve without marking the server ready when `navigator.onLine` is `false` or turns `false` during the wait; the `online` event restarts the wait in the background and marks ready when health answers) in `apps/web/src/shared/services/api/server-wake/server-wake.test.ts`
- [X] T013 Implement the "sem rede" exit and the `online` restart in `apps/web/src/shared/services/api/server-wake/server-wake.ts` (depends on T012)
- [X] T014 [P] Write failing tests for `last-user` (`cruzadinha:last-user` read with `userSchema`, invalid value ignored, write, clear) in `apps/web/src/features/session/services/last-user/last-user.test.ts`
- [X] T015 Implement `readLastUser`/`writeLastUser`/`clearLastUser` in `apps/web/src/features/session/services/last-user/last-user.ts` and export them from `apps/web/src/features/session/index.ts` (depends on T014)
- [X] T016 Wire `last-user` into the session code: write it when `getMe` or login returns a user, clear it when the server answers without a session and on logout, in `apps/web/src/features/session/services/session-handlers.ts` and the `getMe`/login callers (extend `session-handlers.test.ts`)
- [X] T017 `viewerLoader`/`useViewer`: when `navigator.onLine` is `false`, fill the session query with `readLastUser()` (or `null` for guest) instead of calling `GET /api/auth/me`; when the server becomes ready, refetch the session and use the existing session-ended flow if it is gone, in `apps/web/src/features/session/services/viewer.ts` (extend `viewer.test.tsx`; depends on T013, T015)

**Checkpoint**: casca offline registrada, banco offline, `useOnline` e portão sem rede prontos.

---

## Phase 3: User Story 1 - Jogar sem rede uma cruzada já aberta (Priority: P1) 🎯 MVP

**Goal**: abrir o site sem rede, mostrar aviso de conexão e jogar até concluir uma cruzada já aberta; cruzada guardada abre da cópia mesmo com rede.

**Independent Test**: abrir uma cruzada com rede, desligar a rede, recarregar e concluir (quickstart.md, e2e `offline.spec.ts`).

### Tests for User Story 1

- [X] T018 [P] [US1] Write failing tests for `useGameData`: with a stored copy it resolves from the offline store without calling `getPuzzleById` (FR-019), updates `openedAt`, writes to the store after a network load (FR-002, storage failure silent), and without a copy and without network returns a "só abre com conexão" state; account without network uses `known-progress` as `progress` (FR-018); account with server answer writes `known-progress` — in `apps/web/src/features/game/hooks/useGameData.test.tsx`
- [X] T019 [P] [US1] Write failing router tests: `/jogo/:puzzleId` with a stored copy resolves without waiting for the server or the session (uses the last known user); without a copy it behaves as today — in `apps/web/src/app/router.test.tsx`
- [X] T020 [P] [US1] Write failing component tests for `OfflineNotice` (`role="status"` "Sem conexão", disappears when `useOnline()` turns `true`, no axe violations) in `apps/web/src/features/offline/components/OfflineNotice/OfflineNotice.test.tsx`

### Implementation for User Story 1

- [X] T021 [US1] Change `useGameData` to read the offline store first, fall back to `getPuzzleById`, save every network-loaded `PuzzleResponse` to the store, and feed `progress` of an account from `known-progress` when the server does not answer; expose a `needs-connection` result when there is neither copy nor network, in `apps/web/src/features/game/hooks/useGameData.ts` (depends on T011, T018)
- [X] T022 [US1] Export the store API used by other areas (`savePuzzle`, `readPuzzle`, `listStoredPuzzles`, `readKnownProgress`, `writeKnownProgress`) from `apps/web/src/features/offline/index.ts`
- [X] T023 [US1] Move `/jogo/:puzzleId` out of the server gate and `viewerLoader` into its own loader: with a stored copy resolve immediately with the last known user, without a copy do what the gate does today, in `apps/web/src/app/router.tsx` (depends on T017, T019, T022)
- [X] T024 [US1] Show "Esta cruzada só abre com conexão." with a link to the calendar (use `ErrorState`, one `h1` per page) when `useGameData` returns `needs-connection`, in `apps/web/src/pages/game/GamePage.tsx` and in the same way for `/dia/:date` in `apps/web/src/pages/day/DayRoute.tsx` (depends on T021)
- [X] T025 [P] [US1] Implement `OfflineNotice` (discreet `Notice`, `role="status"`, driven by `useOnline()`) in `apps/web/src/features/offline/components/OfflineNotice/OfflineNotice.tsx` with its `.module.css`, and render it in `apps/web/src/app/AppLayout.tsx` (depends on T009, T020)
- [X] T026 [P] [US1] Show "Esta tela precisa de conexão." instead of the form when `useOnline()` is `false` in `apps/web/src/pages/login/`, `register/`, `forgot-password/`, `reset-password/`, `verify-email/` page files and the health page `status/` (one test per page asserting the message offline)
- [X] T027 [US1] Library without network: when `useOnline()` is `false` list only stored days (source, date, title from the offline store) with "Sem conexão: mostrando só as cruzadas guardadas." in `apps/web/src/features/library/` (calendar data hook and `apps/web/src/pages/library/`), with tests; the clock, helps and completion of a stored puzzle must still work with no `getPuzzleById` call
- [X] T028 [US1] Write the e2e `apps/web/e2e/offline.spec.ts` for the guest path: open a puzzle online, `context.setOffline(true)`, reload, see the notice, play to completion, go online and see the notice disappear; also an unstored puzzle offline shows the message and the rest of the site works (SC-001, SC-002, SC-007)

**Checkpoint**: US1 funciona sozinha para visitantes e contas (sem fila ainda).

---

## Phase 4: User Story 2 - Instalar o site no celular (Priority: P1)

**Goal**: manifesto, ícones e botão "Instalar" que só aparece quando a instalação é possível.

**Independent Test**: instalar pelo navegador/emulador e abrir pelo ícone; botão ausente quando já instalado ou sem `beforeinstallprompt`.

### Tests for User Story 2

- [X] T029 [P] [US2] Write failing tests for `useInstallPrompt` (null without event, exposes the prompt after `beforeinstallprompt`, hides on `appinstalled` and when `matchMedia('(display-mode: standalone)')` matches, `prompt()` clears it) in `apps/web/src/features/offline/hooks/useInstallPrompt/useInstallPrompt.test.ts`
- [X] T030 [P] [US2] Write failing tests for `InstallButton` (renders nothing without a prompt, `Button` variant `quiet` "Instalar" when possible, click calls `prompt()`, no axe violations) in `apps/web/src/features/offline/components/InstallButton/InstallButton.test.tsx`

### Implementation for User Story 2

- [X] T031 [P] [US2] Add the manifest to `VitePWA` in `apps/web/vite.config.ts`: `name: 'Cruzadinha'`, `short_name: 'Cruzadinha'`, `lang: 'pt-BR'`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`, `theme_color`/`background_color` from `docs/design.md`, icons `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` (`purpose: 'maskable'`)
- [X] T032 [P] [US2] Generate once from `apps/web/public/favicon.svg` and commit `apps/web/public/pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` (safe zone) and `apple-touch-icon.png` (180)
- [X] T033 [P] [US2] Add `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` and `<meta name="theme-color">` to `apps/web/index.html`
- [X] T034 [US2] Capture `beforeinstallprompt` early in `apps/web/src/main.tsx` (store the event for the hook; do not call `prompt()` automatically) (depends on T006)
- [X] T035 [US2] Implement `useInstallPrompt` in `apps/web/src/features/offline/hooks/useInstallPrompt/useInstallPrompt.ts` (depends on T029, T034)
- [X] T036 [US2] Implement `InstallButton` in `apps/web/src/features/offline/components/InstallButton/InstallButton.tsx` with its `.module.css`, render it in the header of `apps/web/src/app/AppLayout.tsx`, and export what `AppLayout` needs from `apps/web/src/features/offline/index.ts` (depends on T030, T035)
- [X] T037 [US2] Verify the build output: `npm run build -w @cruzadinha/web` produces `dist/sw.js`, `dist/manifest.webmanifest` and no `/api` entry in the precache list; run the Lighthouse installability check from quickstart.md

**Checkpoint**: US1 e US2 entregam o MVP instalável.

---

## Phase 5: User Story 3 - Progresso de conta feito sem rede chega ao servidor (Priority: P2)

**Goal**: fila de salvamento que sobrevive a reinícios, é drenada fora do jogo, aceita "Jogar de novo" offline e respeita o dono das pendências.

**Independent Test**: entrar, desligar a rede, preencher letras, religar e conferir no servidor (e2e conta).

### Tests for User Story 3

- [X] T038 [P] [US3] Write failing tests for the pure `decideOutbox` and the tolerant reader/writer (key `cruzadinha:outbox:<userId>:<puzzleId>`; old format = body only is read as `save`; new `{ v: 2, items }` with 1 or 2 items; every transition of data-model §3: save over save keeps only the latest, reset replaces everything, `[reset, save]` ordering, confirmed reset leaves the rest, confirmed save with `savedAt ≥` empties, 401 leaves unchanged, a `reset` is dropped when the server `savedAt` is later than its `at`; invalid content ignored) in `apps/web/src/features/offline/services/outbox/outbox.test.ts`
- [X] T039 [P] [US3] Write failing tests for `drainOutboxes(userId)` (sends in `savedAt` order, `reset` before the later `save`, deletes on confirmation, stops on 401 keeping everything, repeats 429/5xx/network with `BACKOFF_MS`, `409 progress-completed` discards the save, before a `reset` it reads `GET /api/progress/:puzzleId` and drops the reset (keeping any later `save`) when the server `savedAt` is later than `reset.at` (never erases a completion made elsewhere), sends it when the server is older or has no record, skips the puzzle open in this tab, writes `known-progress` on confirmation, `navigator.locks` `ifAvailable` skip and fallback without `locks`) in `apps/web/src/features/offline/services/drain/drain.test.ts`
- [X] T040 [P] [US3] Write failing tests for the owner rules (logout with outbox asks confirmation and then clears outbox, `known-progress` and `last-user`; login of another account (detected by the session user id differing from `readLastUser()`/the outbox owners, for both the login page and `ReloginDialog`; a wrong account in `ReloginDialog` also runs the cleanup) clears the other `userId`'s outbox and `known-progress` and signals the "descartado" notice once; expired session clears nothing; pending of another account while guest shows the "esperando você entrar" notice) in `apps/web/src/features/offline/services/outbox-owner/outbox-owner.test.ts`
- [X] T041 [P] [US3] Write failing component tests for `PendingOwnerNotice` and `LogoutConfirm` (`Dialog`: "Há progresso ainda não enviado. Sair agora descarta esse progresso." with [Sair mesmo assim] and [Cancelar]; no axe violations) in `apps/web/src/features/offline/components/PendingOwnerNotice/PendingOwnerNotice.test.tsx` and `apps/web/src/features/offline/components/LogoutConfirm/LogoutConfirm.test.tsx`
- [X] T042 [P] [US3] Extend `apps/web/src/features/game/services/save-queue.test.ts` for the `reset` item, for using the shared outbox module, and for "Jogar de novo" of an account without network (queues a reset, no `'offline'` failure, `useGame`/`GameScreen` keep playing)

### Implementation for User Story 3

- [X] T043 [US3] Implement the outbox module (key builder, tolerant read, `OutboxItem` types, pure `decideOutbox`, list keys by `userId`, `clearOutboxUpTo`) moved from `apps/web/src/features/game/services/save-queue.ts` into `apps/web/src/features/offline/services/outbox/outbox.ts` (depends on T038)
- [X] T044 [US3] Make `createSaveQueue` use the outbox module, enqueue `reset` items, and write `known-progress` through `onProgress` for stored puzzles, in `apps/web/src/features/game/services/save-queue.ts`; export the outbox API from `apps/web/src/features/offline/index.ts` (depends on T042, T043)
- [X] T045 [US3] Make "Jogar de novo" for accounts enqueue a `reset` item when offline instead of answering `'offline'`, bumping the board to the new empty state locally, in `apps/web/src/features/game/hooks/useGame.ts` and the play-again path in `apps/web/src/features/game/` (depends on T044)
- [X] T046 [US3] Implement `drainOutboxes(userId)` using `saveProgress`/`resetProgress`/`getProgress` from `shared/services/api/progress` (before sending a `reset`, read the server progress and drop the reset when its `savedAt` is later than `reset.at`), the same `BACKOFF_MS` as the queue, and `navigator.locks.request('cruzadinha:outbox-drain', { ifAvailable: true })`, in `apps/web/src/features/offline/services/drain/drain.ts` (depends on T039, T043)
- [X] T047 [US3] Implement `useOutboxDrain` (runs `drainOutboxes` when an account exists and the server becomes ready, and on the `online` event; never blocks rendering) in `apps/web/src/features/offline/hooks/useOutboxDrain/useOutboxDrain.ts` and call it from `apps/web/src/app/AppLayout.tsx` (depends on T046)
- [X] T048 [US3] Implement the owner rules (`discardOtherAccounts(userId)`, `clearAccountData(userId)`, `hasOutbox(userId)`) in `apps/web/src/features/offline/services/outbox-owner/outbox-owner.ts` (depends on T040, T043, T011)
- [X] T049 [P] [US3] Implement `PendingOwnerNotice` (visitor with a foreign outbox: "Há progresso esperando você entrar." + link Entrar; one-time "O progresso não enviado da conta anterior foi descartado.") in `apps/web/src/features/offline/components/PendingOwnerNotice/PendingOwnerNotice.tsx` with its `.module.css` (depends on T041, T048)
- [X] T050 [P] [US3] Implement `LogoutConfirm` with `Dialog` in `apps/web/src/features/offline/components/LogoutConfirm/LogoutConfirm.tsx` with its `.module.css` (depends on T041)
- [X] T051 [US3] In `apps/web/src/app/AppLayout.tsx`: "Sair" opens `LogoutConfirm` when `hasOutbox(user.id)`, then calls `clearAccountData` + `clearLastUser` before the logout call; run `discardOtherAccounts(user.id)` in an effect on the session `user.id` (covers `useLoginMutation` and `ReloginDialog`, since `session` cannot import `offline`); render `PendingOwnerNotice`; export all needed names from `apps/web/src/features/offline/index.ts` (depends on T036, T049, T050)
- [X] T052 [US3] Make the account's own pending state visible in the game: confirm the existing `SaveStatus` shows `offline` when the outbox has items and never blocks typing (FR-010), extend its test in `apps/web/src/features/game/components/`
- [X] T053 [US3] Extend `apps/web/e2e/offline.spec.ts` for an account: fill letters offline, go online, assert the saved progress reaches the server within 2 minutes and an earlier-completed server record is not regressed (SC-003)

**Checkpoint**: US3 completa; guest e conta funcionam offline.

---

## Phase 6: User Story 4 - Baixar cruzadas para a viagem (Priority: P3)

**Goal**: baixar as cruzadas de hoje de todas as fontes e marcar o que está disponível sem rede.

**Independent Test**: tocar em "Baixar as cruzadas de hoje", ficar offline, abrir cada uma.

### Tests for User Story 4

- [X] T054 [P] [US4] Write failing tests for `downloadToday` (one `getPuzzleByDate(source, today)` per `puzzleSourceIdSchema.options` through `Promise.allSettled`; successes stored; summary `{ saved, failed }`; one failing source does not stop the others; storage failure reported in the summary) in `apps/web/src/features/offline/services/download-today/download-today.test.ts`
- [X] T055 [P] [US4] Write failing tests for `useOfflinePuzzleIds` and for the "Disponível sem rede" mark on `DayCell` and `TodayCards`, plus the download button (disabled without network, summary "Guardadas: N. Falharam: <fontes>.", "Não foi possível guardar para jogar sem rede." on storage failure) in `apps/web/src/features/offline/hooks/useOfflinePuzzleIds/useOfflinePuzzleIds.test.ts`, `apps/web/src/features/library/components/DayCell/DayCell.test.tsx` and `apps/web/src/features/library/components/TodayCards/TodayCards.test.tsx`

### Implementation for User Story 4

- [X] T056 [US4] Implement `downloadToday` in `apps/web/src/features/offline/services/download-today/download-today.ts` (depends on T011, T054)
- [X] T057 [P] [US4] Implement `useOfflinePuzzleIds` (stored ids from the offline store, refreshed after writes) in `apps/web/src/features/offline/hooks/useOfflinePuzzleIds/useOfflinePuzzleIds.ts` and export it from `apps/web/src/features/offline/index.ts` (depends on T011, T055)
- [X] T058 [US4] Mark stored days with an icon plus accessible text "Disponível sem rede" in `apps/web/src/features/library/components/DayCell/DayCell.tsx` and `apps/web/src/features/library/components/TodayCards/TodayCards.tsx` (depends on T057)
- [X] T059 [US4] Add the "Baixar as cruzadas de hoje" `Button` and its result `Notice` to the "Hoje" section in `apps/web/src/features/library/components/TodayCards/TodayCards.tsx` (disabled when `useOnline()` is `false`; `downloadToday` exported from the offline `index.ts`) (depends on T056, T058)
- [X] T060 [US4] Extend `apps/web/e2e/offline.spec.ts`: download today's puzzles, go offline, open each stored one (SC-006)

**Checkpoint**: todas as histórias independentes e completas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T061 [P] Document the feature in `CLAUDE.md` (offline store, outbox owner rules, `last-user`, new `FEATURE_ORDER`, SW with no `/api` cache, update on next open) and the new headers/files in `docs/deploy.md`
- [X] T062 [P] Check the new notices, install button and `LogoutConfirm` dialog by keyboard and with `vitest-axe` in light and dark themes (focus returns to the "Sair" button on cancel; the offline `role="status"` region does not steal focus)
- [X] T063 Run `npm run format`, `npm run lint` (includes `check:deps`), `npm run check:ids`, `npm run typecheck`, `npm test` and `npm run build`; fix every violation
- [X] T064 Run `npm run test:e2e -w @cruzadinha/web` (needs API, local Postgres with seed, `DATABASE_URL`) and walk through `specs/041-pwa-modo-offline/quickstart.md` (scenario 4 is the manual check of FR-007: a reload keeps the old version, closing every tab and reopening applies the new one), including `e2e/sem-saltos.spec.ts` (nothing may shift the layout; the new header button and notice must not move the board)
- [X] T065 Confirm the API OpenAPI document and `packages/shared` are unchanged (`git diff --stat apps/api packages/shared` empty) so the release stays web-only

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)**: sem dependências
- **Foundational (2)**: depende de Setup; bloqueia todas as histórias
- **US1 (3)** → depende da Fase 2 (MVP)
- **US2 (4)**: depende da Fase 2 (T005/T006 do plugin e da captura em `main.tsx`); independente de US1
- **US3 (5)**: depende da Fase 2 e usa `useGameData`/`known-progress` de US1 (T021) e o `AppLayout` de US1/US2 (T025, T036) por tocar o mesmo arquivo; testável sozinha com conta
- **US4 (6)**: depende da Fase 2; usa `TodayCards` e `index.ts` (sequencie depois de US3 por edições no mesmo arquivo)
- **Polish (7)**: depois das histórias desejadas

### Within Stories

- Testes primeiro (devem falhar), depois a implementação
- Arquivos compartilhados (`AppLayout.tsx`, `offline/index.ts`, `vite.config.ts`, `TodayCards.tsx`, `offline.spec.ts`) não rodam em paralelo entre histórias

### Parallel Opportunities

- Setup: T002, T003, T004
- Fase 2: T007, T008+T009, T010, T012, T014 (pares teste/implementação em sequência)
- US1: T018, T019, T020 juntos; T025 e T026 juntos
- US2: T029, T030, T031, T032, T033 juntos
- US3: T038 a T042 juntos; T049 e T050 juntos
- US4: T054 e T055 juntos

## Parallel Example: User Story 1

```text
Task: "useGameData tests in apps/web/src/features/game/hooks/useGameData.test.tsx"
Task: "router tests in apps/web/src/app/router.test.tsx"
Task: "OfflineNotice tests in apps/web/src/features/offline/components/OfflineNotice/OfflineNotice.test.tsx"
```

## Implementation Strategy

### MVP First (US1 + US2, ambas P1)

1. Fases 1 e 2
2. US1: validar com o e2e visitante
3. US2: validar instalação e Lighthouse
4. Entregar (só `apps/web`; commits `feat(web): ...`)

### Incremental Delivery

1. MVP (US1 + US2) → US3 (fila de conta) → US4 (download) → Polish
2. Cada história acrescenta valor sem quebrar a anterior; a API não muda, então o site novo funciona com a API publicada

## Notes

- [P] = arquivos diferentes, sem dependência
- Nenhum `any`; tudo lido de IndexedDB/`localStorage` entra como `unknown` e passa pelos schemas de `shared`
- Commits em inglês, Conventional Commits, sem atribuição de IA (regra do projeto)
- Antes de `useGameData`/`router.tsx`, ler o código atual (a memória do plano pode estar ligeiramente defasada)

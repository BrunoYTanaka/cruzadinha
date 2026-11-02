# Tasks: x1 de cruzada (duelo 1x1 por link ou código)

**Input**: specs/058-x1-duelo-1x1/ (plan, spec, research, data-model, contracts/api.md, quickstart)

**Tests**: obrigatórios (constituição II e VII). Regra pura: escreva o teste antes do código. `Clock` sempre injetado, nunca `Date.now()` nas regras.

**Relógio** (research R12): instantes de regra (`start_deadline_at`, `started_at`, `finished_at`, janelas) vêm do `Clock` injetado e são gravados explicitamente, nunca do `now()` do banco; o e2e usa relógio real e não afirma tempo exato.

**Convenções**: consultar Context7 antes de usar API de Drizzle, Fastify, TanStack Query ou React Router (constituição, Fluxo). Comentários e mensagens de UI em português; commits em inglês. Cada componente do site mora na própria pasta com `.module.css` e teste.

## Phase 1: Setup

- [x] T001 Amend `.specify/memory/constitution.md` to 7.0.0 (run `/speckit-constitution`, which owns that file) ("Emenda 7.0.0"): principle VI allows the server to keep, for a duel only, the participant nickname, the SHA-256 of the participant token and the duel times of a guest; guest progress, letters and cells still never leave the device; also allow the duel responses to reach whoever presents the link, the code or the participant token (principle VI says responses to people without a session carry no user data); record justification, migration plan (none for data) and the Sync Impact line at the top
- [x] T002 [P] Add `'duel'` last to `FEATURE_ORDER` in `.dependency-cruiser.cjs` (order `... < game < duel`) and run `npm run check:deps`
- [x] T003 [P] Create `docs/data-definitions/DDE-007-duelos.md` and `docs/entity-relationship-diagrams/ERD-007-duelos.md` from `data-model.md` (use the `entity-relationship-diagram` skill for the ERD); run `npm run check:ids`

## Phase 2: Foundational (contrato, dados e regras puras)

**Bloqueia todas as histórias.**

- [x] T004 Create `packages/shared/src/duel/duel.ts` and export from `packages/shared/src/index.ts`: `duelStateSchema` (`open|running|finished|cancelled`), `helpModeSchema` (`free|forbidden|penalty`), `duelRulesSchema` (strict: `helpMode`, `helpPenaltyMs` int `> 0` only when `penalty` and null otherwise, `maxMs` null or int `60000..7200000`, `startDeadlineHours` one of 1, 24, 168), `nicknameSchema` (trimmed, 1–24 characters), `duelCodeSchema` (8 characters of `23456789ABCDEFGHJKMNPQRSTUVWXYZ`), request schemas of every route in `contracts/api.md` (strict; `participantTokens` at most 20; `helpsUsed` int `0..1000`), tolerant response schemas (`DuelView`, `DuelSummary`, `lookup`) and the effective status union; `duel.test.ts` (extra key refused, penalty without value refused, code with `0/O/1/I/L` refused, 21 tokens refused)
- [x] T005 Add migration `apps/api/drizzle/0012_duels.sql` via `npm run db:generate -w @cruzadinha/api -- --custom --name duels`: tables `duels` and `duel_participants` per `data-model.md` with the constraints `state IN ('open','running','finished','cancelled')`, `help_mode IN ('free','forbidden','penalty')`, `help_penalty_ms > 0` only for `penalty`, `max_ms` null or `BETWEEN 60000 AND 7200000`, `outcome` null or `creator|opponent|tie`, `outcome_reason` null or `time|forfeit|timeout|walkover|declined`, `role IN ('creator','opponent')` with `unique (duel_id, role)`, `(finished_at IS NULL) = (end_reason IS NULL)`, `end_reason = 'completed'` requires `elapsed_ms`, `nickname` 1–24 characters, `helps_used BETWEEN 0 AND 1000`; unique `link_token` (stored in clear, research R3), unique `token_hash`, partial unique index on `code` where `state = 'open'`, index `(state, start_deadline_at)`, partial index `(user_id)` where `user_id IS NOT NULL`; `duel_participants.user_id` nullable `ON DELETE SET NULL`; `duels.puzzle_id` `ON DELETE RESTRICT`; `<table>_set_updated_at` trigger for both; extend the `rate_limit_attempts_action_check` with `DUEL_CREATE`, `DUEL_LOOKUP`, `DUEL_MINE`
- [x] T006 Mirror T005 in `apps/api/src/platform/db/schema.ts` (tables spreading `timestamps`, new `rateLimitActions`, matching CHECK in the table definition); run `conventions.int.test.ts` to confirm timestamps and triggers
- [x] T007 [P] Add `duelCreate` (10/h), `duelLookup` (30/h) and `duelMine` (60/h) windows to `apps/api/src/platform/rate-limit/limits.ts` (and `RateLimits` type), per research R1; update existing limits tests
- [x] T008 [P] Create `apps/api/src/modules/duels/duel-codes.ts`: `newLinkToken()`, `newParticipantToken()` (32 random bytes, base64url), `newCode()` (8 characters of the ambiguity-free alphabet), `hashToken()` (SHA-256 hex, used only for the participant token); `duel-codes.test.ts` (alphabet, length, hash stable, no collision in 10 000 samples)
- [x] T009 Create pure `apps/api/src/modules/duels/duels.rules.ts` with `resolveDuel(duel, participants, now)` returning the effective status of research R2 (`waiting-opponent`, `playing`, `waiting-other`, `won`, `lost`, `tie`, `expired`, `cancelled`, `declined`), `decideFinish(participant, duel, now, helpsUsed)` (elapsed from the server `started_at`; `elapsed > maxMs` ⇒ `timeout`/loss; penalty = `helpsUsed × helpPenaltyMs`; `helpsUsed` is stored and shown as declared, with no enforcement even for `forbidden`, per FR-017) and `decideOutcome` (lowest `elapsed + penalty` wins, equal ⇒ `tie`, forfeit loses, deadline passed with one finished ⇒ `walkover`); `duels.rules.test.ts` covering every spec scenario with a fake `Clock`
- [x] T010 Create `apps/api/src/modules/duels/duels.repository.ts` (every time column is passed in by the service from the `Clock`; no `now()` in SQL for rule columns): `insertDuel`, `findByLinkToken`, `findByCode` (only `open`), `claimOpponentSlot` (`UPDATE duels SET state='running' WHERE duel_id=$1 AND state='open'` + insert opponent in one transaction; no row updated ⇒ `taken`), `markFinished`, `markCancelled`, `markDeclined`, `listForUser`, `listForTokenHashes`, `countOpenByCreator` (user or token hash), `deleteExpired(now)`; no HTTP types, SQL only here
- [x] T011 [P] Create the web client `apps/web/src/features/duel/services/duel-api.ts` with one function per route of `contracts/api.md` validated by the `shared` schemas, using the single HTTP client in `apps/web/src/shared/services/api/`; a 404 on `/api/duels/*` from an older API maps to a typed `duel-unavailable` error; test with the `http` helper
- [x] T012 [P] Create `apps/web/src/features/duel/services/duel-tokens.ts`: IndexedDB `cruzadinha-duelos` through `idb` (store `tokens`, key `linkToken`, value `{ participantToken, duelKey, createdAt }`), `saveToken`, `getToken`, `listTokens`, `removeToken`; test with `fake-indexeddb`
- [x] T013 [P] Add `public/_headers` rules in `apps/web/public/_headers` for `/x1` and `/x1/*`: `X-Robots-Tag: noindex, nofollow` and `Referrer-Policy: no-referrer`; extend `apps/web/src/test/headers.test.ts` and make sure `check-build-output` keeps passing

## Phase 3: US1 – Criar um duelo e convidar alguém (P1) 🎯 MVP

**Independent test**: como visitante, escolher um dia salvo, definir regras, criar e ver link e código; o duelo fica `open`.

- [x] T014 [US1] Add `createDuel` to `apps/api/src/modules/duels/duels.service.ts`: `admitAddress` with `DUEL_CREATE` first (and per-user when there is a session), validate the body, require `nickname` 1–24 characters from everyone, guest or account (`400 invalid-input`), `404 puzzle-unavailable` for an unknown `puzzleId`, `409 open-limit` at 5 open or running duels created by the same user or token, generate the three tokens, store the participant token only as hash (`token_hash`) and the link token as `link_token` and `start_deadline_at = now + startDeadlineHours`, retry once on `code` collision; return `{ linkToken, code, participantToken? , duel }` (participant token only for a guest); logs carry field names only; test with the in-memory limiter and fake `Clock`
- [x] T015 [US1] Create `apps/api/src/modules/duels/duels.schemas.ts` (OpenAPI via `toDocSchema`, tag `duels`, 200/400/401/404/409/429) and `duels.routes.ts` with `POST /api/duels` behind `optionalSession` (an invalid cookie answers `401` and clears it, like the other optional routes); `index.ts` exports `duelsRoutes` and `DuelsService`; register in `apps/api/src/app.ts`; add the route to `apps/api/src/platform/docs/docs.test.ts`
- [x] T016 [US1] Add `apps/api/src/test/duels.int.test.ts` (one file holds the integration tests of T016, T024, T031, T038 and T042): creates as guest and as account, the code is unique among open duels, the limit of 5 answers `409 open-limit`, 11th creation from one address answers `429`, participant token stored only as hash, missing nickname is `400`, unknown `puzzleId` is `404`
- [x] T017 [P] [US1] Add optional `selection` prop (`{ isSelectable(day), onSelect(day), selectedId? }`) to `apps/web/src/features/library/components/Calendar/Calendar.tsx` and `DayCell.tsx` per research R7: selectable only for `not_started`, `in_progress`, `completed`; `none`, `fetchable`, `future` render as text without action; `completed` shows the time plus the visible and spoken note "você já fez esta"; no change when the prop is absent; extend `Calendar` and `DayCell` tests (existing CSS and `vitest-axe` tests unchanged and passing); export a `DuelDayPicker`-ready `CalendarSelection` type from `features/library/index.ts`
- [x] T018 [US1] (verified: `GET /api/library` already returns `puzzleId` per saved day, also for visitors; no change needed) Verify what `GET /api/library` returns for a guest per saved day (`puzzleId`, date) and, if `puzzleId` is missing for a guest, add it as an optional tolerant field in `packages/shared` and the library module without changing existing responses; test in `apps/api/src/modules/library/library.service.test.ts`
- [x] T019 [US1] Create `apps/web/src/features/duel/components/CreateForm/CreateForm.tsx` (+ css, test with `vitest-axe`): source tabs and calendar in selection mode (through `features/library` `index.ts` only), rules fields (help mode with penalty options +10/+30/+60 s, max time none/15/30/60 min, deadline 1 h/24 h/7 d), nickname field for everyone (prefilled from `cruzadinha:duel-nickname`), submit; error messages for `open-limit`, `429` and `duel-unavailable`; no layout shift when messages appear
- [x] T020 [US1] Create `apps/web/src/features/duel/components/ShareLinkPanel/ShareLinkPanel.tsx` (+ css, test): shows the invite link `/x1/<linkToken>` and the 8-character code with "Copiar link" and "Copiar código" buttons, and the return link `/x1/<linkToken>#p=<participantToken>` for a guest with a clear "guarde este link" note; on creation the guest token goes to `duel-tokens.ts`
- [x] T021 [US1] Create `apps/web/src/pages/duel-new/DuelNewPage.tsx` (one `h1`, composes `CreateForm` and `ShareLinkPanel`) and register `/x1/novo` in `apps/web/src/app/` router; `features/duel/index.ts` exports `CreateForm`, `ShareLinkPanel`, `RulesDialog`, `DuelBoard`, `ResultPanel`, `DuelList`, `JoinByCode` and `useMyDuels` for the pages (add each name in the task that creates it)

**Checkpoint**: criar um duelo funciona de ponta a ponta sem ninguém aceitar.

## Phase 4: US2 – Aceitar o desafio, jogar e ver o resultado (P1)

**Independent test**: dois contextos e relógio falso; começar, terminar com tempos diferentes, conferir vencedor e diferença.

- [x] T022 [US2] Add to `duels.service.ts`: `lookup` (by `linkToken` or `code`, returns `linkToken` in the answer, only `open`, `DUEL_LOOKUP` limit by address, identical `404 not-found` for missing and not open, never changes state), `start` (atomic through `claimOpponentSlot`; `409 duel-taken`; `409 own-duel` when the session or token belongs to the creator; creator starts through the same call without claiming a slot; idempotent per participant: the second call returns the same `startedAt`; nickname required; hash of the new participant token stored; a logged user on a second device resolves to the same participant row by `user_id`; returns `puzzleId` only after starting), `decline` (opponent only while `open`, ends the duel with `declined`), `state` and `finish`/`decideFinish` from T009; `DuelView` hides the other player's time until the duel is `finished`; tests with fake `Clock`
- [x] T023 [US2] Add the routes `lookup`, `start`, `decline`, `state`, `finish` (with schemas for docs) in `duels.routes.ts`; credential resolution `session first, participantToken second` in one helper in `duels.service.ts`; docs test updated
- [x] T024 [US2] Add `apps/api/src/test/duels-play.int.test.ts`: two simultaneous `start` calls leave exactly one opponent (SC-003), loading `lookup` 1 000 times changes nothing (SC-004), `finish` above `maxMs` is `timeout` and loses, equal totals are `tie`, first finisher's `state` response has no opponent time (SC-006), session beats token when both are sent
- [x] T025 [US2] In `apps/web/src/features/game/` export `useGame`, `GameOwner` and the pieces the duel needs through `features/game/index.ts` (keep the barrel small: add only these), and add the `kind: 'duel'` owner to `hooks/useGame.ts` per research R4, with the store and save queue injected by the caller (as the guest owner does, because `game` cannot import `duel`); create `apps/web/src/features/duel/services/duel-progress.ts` implementing them: progress saved only under `cruzadinha:duel:<duelId>:…` (`duelId` comes from `DuelView`) (never the guest key nor the account), removed when the duel ends (finish, forfeit, cancel, decline), clock = `startedAt + getServerClockOffsetMs`, not paused by the settings dialog or the shortcuts dialog, helps follow the duel rules through the reducer help limits (`forbidden` sets both limits to 0, `penalty` shows the cost), draft layer keeps working; extend `useGame` tests including "reload does not restart the clock"
- [x] T026 [US2] Create `apps/web/src/features/duel/components/RulesDialog/RulesDialog.tsx` (+ css, test with `vitest-axe`): uses `Dialog` without `closeOnBackdrop` and blocks `Esc` (FR-010), buttons "Começar", "Agora não", "Recusar desafio"; "Recusar desafio" asks no extra step but explains it ends the duel; focus on "Começar"; texts for the three help modes and the two clocks (deadline vs. max time) in `helpers/rules-text.ts`
- [x] T027 [US2] Create `features/duel/hooks/useDuel.ts` (TanStack Query: `state` polling every 5 s only while waiting for the opponent and the tab is visible; `start`, `finish`, `decline` mutations; maps API errors to non-blocking notices once the game started) and `useServerClock.ts` (offset from `serverNow`); tests
- [x] T028 [US2] Create `features/duel/components/DuelBoard/DuelBoard.tsx` (wraps `GameScreen` with the duel owner, sends `finish` with `helpsUsed` when the board completes, shows the server clock, retries a failed `finish` without blocking typing) and `components/ResultPanel/ResultPanel.tsx` (winner, difference, both times, penalties, helps; a declined, cancelled or expired duel shows its own message with no times; "Aguardando o oponente" without the other time; tie and "tempo esgotado" texts in `helpers/result-text.ts`); tests including `vitest-axe`
- [x] T029 [US2] Create `apps/web/src/pages/duel/DuelPage.tsx` (route `/x1/:linkToken`; one `h1`; reads the `#p=` fragment once and stores it with `duel-tokens.ts`, then clears the fragment from the address; picks the view: rules dialog (not joined), board (running and mine not finished), waiting, result, expired/cancelled/declined messages; shows `duel-unavailable` as "O x1 não está disponível agora"); register in the router inside the server-ready group (offline shows `RequiresConnection`); test the view selection per status
- [x] T030 [US2] Add `apps/web/e2e/duelo.spec.ts` (Playwright, two browser contexts, real clock: assert order, presence and wide ranges, never an exact time; deadline, timeout and walkover are covered only in the fake-`Clock` tests): A creates, B opens the link, both start, B finishes first and sees "Aguardando o oponente", A finishes and both see the same winner and difference; also covers `Esc` and backdrop not closing the rules dialog

**Checkpoint**: duelo completo do convite ao resultado.

## Phase 5: US3 – Voltar ao duelo e acompanhar em "Meus x1" (P1)

**Independent test**: criar como visitante, fechar e reabrir, voltar pelo "Meus x1"; repetir com conta em outro aparelho.

- [x] T031 [US3] Add `mine` to `duels.service.ts` and `duels.routes.ts`: `DUEL_MINE` limit by address, logged user lists by `user_id`, guest lists by up to 20 `participantTokens` (`400 invalid-input` above 20), result is `DuelSummary[]` of active duels only (`open`, `running`, and `finished` while the person has not seen the result) listing `open`, `running` and `finished` in the last 24 hours, each with `linkToken` and an `attention` flag (`running` and I have not finished, or `finished` in the last 24 hours, research R10); session wins over tokens; unit and `apps/web`-independent integration test in `apps/api/src/test/duels-mine.int.test.ts` (account sees duels from two sessions, guest sees only own tokens, 21 tokens refused)
- [x] T032 [US3] Create `features/duel/hooks/useMyDuels.ts` (query `mine`, sends the tokens from `duel-tokens.ts` in the POST body, polls every 15 s while the tab is visible, pauses when hidden, never puts a token in a URL) and `components/DuelList/DuelList.tsx` (+ css, test with `vitest-axe`): one row per duel with source, date, role, status text, link to `/x1/<linkToken>`; guest note "só neste aparelho"; empty state; the header counter uses the `attention` count
- [x] T033 [US3] Create `apps/web/src/pages/duels/DuelsPage.tsx` (route `/x1`, one `h1`, `DuelList`, link "Novo x1") and add the "x1" link with an attention counter to the header menu in `apps/web/src/app/AppLayout.tsx` (counter badge reserves its space so nothing shifts, spoken text "N x1 aguardando")
- [x] T034 [US3] Make `DuelPage` handle returning: guest by stored token or `#p=` fragment, logged by session (the session wins); an expired session mid-game never interrupts the board (notice only, FR-019); test in `DuelPage.test.tsx` with a token only, a session only, and both
- [x] T035 [US3] Test isolation (FR-016) in `features/duel/services/duel-progress.test.ts` and `useGame` tests: two duels over the same puzzle plus the normal game and "Jogar de novo" each keep separate cells, draft and clock

## Phase 6: US4 – Entrar por código (P2)

**Independent test**: código válido mostra as regras; inexistente e já aceito dão a mesma mensagem.

- [x] T036 [P] [US4] Create `features/duel/helpers/parse-join-input.ts` (accepts the 8-character code in any case with spaces or dashes, or a pasted `/x1/<linkToken>` link, with or without origin; returns `{ code } | { linkToken } | null`) with exhaustive tests (pasted link with fragment, trailing spaces, lowercase code, wrong length)
- [x] T037 [US4] Create `features/duel/components/JoinByCode/JoinByCode.tsx` (+ css, test with `vitest-axe`): field and "Entrar" button, calls `lookup`, same "Não encontramos um x1 aberto com esse código" message for missing and not open, `429` message; success navigates to `/x1/<linkToken>`; mount it in `DuelsPage` and in the header menu of `AppLayout`
- [x] T038 [US4] Add `apps/api/src/test/duels-lookup.int.test.ts`: identical status and body for missing code, expired and accepted duel (FR-013), rate limit after 30 lookups from one address, `lookup` never writes (row `updated_at` unchanged)

## Phase 7: US5 – Desistir, cancelar e prazos (P2)

**Independent test**: levar cada saída (desistir, cancelar, recusar, prazo vencido, tempo estourado) até o fim com relógio falso.

- [x] T039 [US5] Add `forfeit` and `cancel` to `duels.service.ts` and `duels.routes.ts`: `forfeit` ends the duel at once and the forfeiter loses (`end_reason forfeit`, `outcome_reason forfeit`); `cancel` only for the creator while `open`, else `409 not-open`; both without undo; docs test updated
- [x] T040 [US5] Materialize deadline outcomes in `duels.service.ts`: every write path (`start`, `finish`, `forfeit`, `state`) first runs `resolveDuel` and persists a due `walkover` or `expired` result so the stored row matches what a read shows; tests with a fake `Clock` for: deadline passed with no opponent ⇒ expired on read, with one finished ⇒ walkover win, cron not needed for correctness
- [x] T041 [US5] Create `features/duel/components/ForfeitConfirm/ForfeitConfirm.tsx` (+ test) used for "Desistir" (during play) and "Cancelar duelo" (creator, `open` only): confirmation in the same `Dialog`, text says it cannot be undone; wire both into `DuelPage`/`DuelBoard`
- [x] T042 [US5] Add `apps/api/src/test/duels-endings.int.test.ts`: forfeit, cancel (only `open`), decline, walkover, timeout, tie, each reflected in both participants' `state` responses and in `mine`; deleting a participant's account keeps the duel and the nickname (FR-031)
- [x] T043 [US5] Add the cleanup step to `apps/api/src/cli/run-cli.ts` (`auth cleanup`) per research R8: delete `open` duels with a deadline passed more than 7 days ago, `running` duels where nobody finished and the deadline passed more than 7 days ago, and `cancelled` duels older than 30 days; never delete `finished`; print `Duelos apagados: N.`; a failure prints `Falha ao apagar duelos antigos.` and exits 1 without hiding the other steps; test in `run-cli.test.ts` and an integration test that proves a `finished` duel survives

## Phase 8: Polish e transversais

- [x] T044 [P] Add an e2e case in `apps/web/e2e/duelo.spec.ts` for forfeit, cancel and for "recarregar não reinicia o relógio", for SC-001 (create in at most 6 interactions) and SC-007 (return to an active duel in at most 3 clicks) (open settings during play and check the clock keeps running), and for "Meus x1" of a logged user in a second device
- [x] T045 [P] Extend `apps/web/e2e/sem-saltos.spec.ts` for the duel board and the header counter (no layout shift)
- [x] T046 Update `CLAUDE.md` with a "Feature 058" paragraph (routes, tokens, rules in `duels.rules.ts`, three identifiers, order `... < game < duel`, headers, cleanup step) and `docs/deploy.md` with the new rate-limit windows and the cleanup line
- [x] T047 Mark the spec `Status: Implemented`, tick the plan's Constitution Check, run the whole gate: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:int && npm run build && npm run test:e2e -w @cruzadinha/web`, and walk `quickstart.md` section 2 by hand

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. T001 before any code; T005 before T006; T004 and T009 before every service task.
- US1 (T014–T021) has no dependency on other stories: it is the MVP. T017/T018 (calendar) can run beside T014–T016.
- US2 needs US1 (a duel to join). T025 (`useGame` duel owner) can start as soon as Phase 2 ends.
- US3 needs US2 for the return view (T034) but `mine` (T031–T033) only needs US1.
- US4 needs US2's `lookup` (T022).
- US5 needs US2 (`running` duels); T043 only needs the repository (T010).
- Polish last.

## Parallel Opportunities

- Phase 1: T002 ‖ T003.
- Phase 2: T007 ‖ T008 ‖ T011 ‖ T012 ‖ T013 after T004–T006.
- US1: T017 ‖ T018 ‖ T014–T016 (calendar vs. API).
- US2: T025 ‖ T022–T024 (client game owner vs. API); T026 ‖ T027.
- US3 and US4 web tasks (T032, T036) are independent of each other.
- Polish: T044 ‖ T045.

## Implementation Strategy

1. **MVP**: Phases 1, 2 and US1 (create and share), already demonstrable.
2. Add US2 for the full duel loop (first real value), then US3 so nobody loses a duel by closing the tab.
3. US4 and US5 close the edge cases; each is independently testable.
4. Land the constitution amendment (T001) in its own commit first; each phase leaves `main` green and compatible with the previous API/site (research R9).

## Notas da implementação

- T037: o campo de código está em "Meus x1" (`/x1`). O cabeçalho só tem o link "x1" com o contador; um campo de texto no cabeçalho não cabe em 360 px. No celular o link do cabeçalho some (como "Estatísticas") e o calendário ganha o link "Meus x1".
- T016, T024, T031, T038, T042: um só arquivo, `apps/api/src/test/duels.int.test.ts`; a limpeza está em `auth-cleanup.int.test.ts`.
- T025: o dono `duel` guarda como o visitante, num banco só do duelo (`cruzadinha-duelo-jogo`, chave = id do duelo).
- Verificar (e "verificar ao digitar") só existe no modo de ajudas livres; nos outros modos é ajuda e some do menu.

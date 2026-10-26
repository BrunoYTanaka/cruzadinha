---
description: 'Task list for 037-reorganizar-por-feature'
---

# Tasks: Reorganizar web e API por feature

**Input**: Design documents from `/specs/037-reorganizar-por-feature/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/boundaries.md, quickstart.md

**Tests**: No new product tests: behaviour does not change, so the existing tests are the proof (they only change import paths and file lookups). The one new check is the boundary rule itself (T006, T046).

**Organization**: Grouped by user story. Delivery is one `refactor/<slug>` PR per block marked `PR n` (research.md D8); each PR ends with the CI-equivalent gate in the "Gate" task. Moves use `git mv` in a commit of their own, then a second commit fixes imports, so history follows the files. Destination paths come from `data-model.md`; the split of `features/game` and the `helpers/` × `services/` choice are confirmed while moving.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 to US4 from `spec.md`
- Paths are relative to the repository root. Test files and `*.module.css` move with their component.
- **File lookups**: besides imports, some tests and configs read files by path (`readFileSync`/`readdirSync`: `apps/web/src/test/tokens-contrast.test.ts`, `components/{button-states,touch-targets,Tooltip}.test.*`, `features/game/Keyboard.test.tsx`, `features/settings/settings-css.test.ts`, `test/a11y.test.tsx`; `apps/api/src/version.test.ts`, `lib/collect-workflow.test.ts`, `modules/email/resend-sender.test.ts`, the `sources/*/fixtures.ts` files). After every move run `grep -rnE "readFileSync|readdirSync"` on the moved folders and fix the relative paths; the Gate catches the rest.
- **Gate** = `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run check:deps` (after T005), plus `npm run test:int` when `apps/api` changed and `npm run test:e2e -w @cruzadinha/web` when `apps/web` changed.

## Phase 1: Setup (PR 1: `refactor/boundary-rules-warn`)

- [X] T001 Run `npm ci` and `nvm use`; confirm `apps/web/src/specs/` does not exist (`git ls-files apps/web/src/specs` empty, FR-012) and note that no deletion is needed
- [X] T002 Record the baseline in `specs/037-reorganizar-por-feature/research.md` (new "Baseline" section): `npm run build -w @cruzadinha/web` and the size of every file in `apps/web/dist/assets`; `curl localhost:3000/api/docs/json` saved to the scratchpad as `openapi-before.json` (needs the API running, see `quickstart.md`) (OpenAPI "antes" pendente: API local não subiu; fazer no PR 7)
- [X] T003 Consult Context7 (`/sverweij/dependency-cruiser`) for the config file format with ESM/CJS, `options.tsConfig`, `options.doNotFollow`/`exclude` for `.css`, and the `--output-type err` / `--no-config` flags before writing the config
- [X] T004 Add `dependency-cruiser` as an exact-version devDependency in the root `package.json` and update `package-lock.json`
- [X] T005 Add the script `"check:deps"` to the root `package.json` running `depcruise apps/web/src apps/api/src --config .dependency-cruiser.cjs --output-type err`

---

## Phase 2: Foundational: boundary rules in warning mode (PR 1, US1 first half)

**Purpose**: the rules exist and report the current violations, so every later PR proves it adds none.

- [X] T006 [US1] Create `.dependency-cruiser.cjs` with every rule of `specs/037-reorganizar-por-feature/contracts/boundaries.md` at `severity: 'warn'`; test files (`*.test.ts(x)`), `apps/web/src/test/`, `apps/web/e2e/` and `.css` imports excluded; `options.tsConfig` pointing to each workspace's `tsconfig.json`. Rules that name destination folders not created yet simply match nothing
- [X] T007 [US1] Run `npm run check:deps`; save the list of current violations in `specs/037-reorganizar-por-feature/research.md` ("Violações iniciais") and confirm it contains at least the cycles named in research.md (`settings ↔ library`, `game ↔ guest`, `auth ↔ app`, `status ↔ app`)
- [X] T008 [US1] Make sure `check:deps` is not yet in `lint`, the Git hooks or CI as a blocking step (warnings only exit 0); add it to `.github/workflows/ci.yml` as a step that prints the report
- [X] T009 Gate, open PR 1

---

## Phase 3: User Story 2 - No cycles between site features (Priority: P1) (PR 2: `refactor/break-web-cycles`)

**Goal**: the five ruptures of research.md D3, with zero behaviour change.

**Independent Test**: `npm run check:deps` reports no cycle in `apps/web/src`; `npm test` and `npm run test:e2e -w @cruzadinha/web` pass unchanged.

- [X] T010 [P] [US2] `git mv` `apps/web/src/features/settings/settings-store.ts` (+ test) and `apps/web/src/config.ts` (+ test) into `apps/web/src/shared/services/`; fix every import (`features/library/library-width.ts`, `features/library/source-choice.ts`, `features/game/board-size.ts`, `features/game/useCopyClue.ts`, `themes/*`, `app/direct-play*.ts`, `features/settings/*`, `test/setup.ts`, tests)
- [X] T011 [P] [US2] Move `apps/web/src/app/ErrorState.tsx` (+ css, test) and `apps/web/src/app/NotFoundPage.tsx` to `apps/web/src/shared/components/`; move `apps/web/src/features/status/useSlowServer.ts` to `apps/web/src/shared/hooks/`; fix imports in `features/status/ServerWake.tsx`, `features/library/{DayRoute,LibraryPage}.tsx`, `features/game/GamePage.tsx`, `features/auth/useSession.ts`, `app/{RouteError,router}.tsx`
- [X] T012 [US2] Create `apps/web/src/features/session/` and move into it from `apps/web/src/app/`: `session-ended.ts`, `session-expired.ts`, `session-handlers.ts` (+ test), `viewer.ts` (+ test); and from `apps/web/src/features/auth/`: `useSession.ts`, `redirect.ts`, `SessionExpiredNotice.tsx`, `ReloginDialog.tsx` (+ test). Add `features/session/index.ts` exporting what other areas use. Fix imports in `app/`, `features/library`, `features/game`, `features/settings`, `test/render.tsx`, `test/game-harness.tsx`
- [X] T013 [US2] Extract the help schema and its types from `apps/web/src/features/game/help-storage.ts` into `apps/web/src/domain/game/help-schema.ts`, and the save record types from `apps/web/src/features/game/save-queue.ts` into `apps/web/src/domain/game/save-types.ts`; both files keep their exported names and add a unit test only if the extraction touches logic. `features/guest/guest-record.ts` and `guest-save-queue.ts` import from `domain/game`
- [X] T014 [US2] In `apps/web/src/features/game/useGame.ts` remove the imports of `features/guest` and take the save-queue factory (and the guest store reads it needs) as a parameter; `apps/web/src/features/game/GamePage.tsx` builds them and passes them in. Update `GuestGame.test.tsx`, `PlayAgainHelps.test.tsx` and `test/game-harness.tsx` to the new parameter
- [X] T015 [US2] Run `npm run check:deps`: zero `no-cycles` hits in `apps/web/src`; list the remaining boundary warnings in `research.md`
- [X] T016 [US2] Gate, open PR 2

---

## Phase 4: User Story 3 - Site organized by feature, pages only compose (Priority: P2)

**Goal**: the target layout of `apps/web/src` from `data-model.md`.

**Independent Test**: for each PR the Gate passes with only import-path changes in tests, and the chunk comparison of `quickstart.md` is within the tolerance of research.md D6.

### PR 3: `refactor/web-shared-and-domain`

- [X] T017 [P] [US3] `git mv` `apps/web/src/components/*` to `apps/web/src/shared/components/`, `apps/web/src/themes/*` to `apps/web/src/shared/themes/`, `apps/web/src/lib/{useDocumentTitle,useMediaQuery}.ts` to `shared/hooks/`, `lib/{dates,time}.*` to `shared/helpers/`, `lib/storage.*` to `shared/services/`, `apps/web/src/api/*` to `shared/services/api/`; fix imports, including `apps/web/index.html`, `apps/web/vite.config.ts`, `vitest.config.ts` and any `src/themes/...` path referenced in CSS or scripts, and the file lookups of `tokens-contrast.test.ts`, `button-states.test.ts`, `touch-targets.test.tsx`, `Tooltip.test.tsx`
- [X] T018 [P] [US3] `git mv` `apps/web/src/game-logic/*` to `apps/web/src/domain/game/` except `guest-progress.ts` (+ test), which goes to `apps/web/src/domain/guest/`; fix imports
- [X] T019 [US3] Gate (chunk comparison included), open PR 3

### PR 4: `refactor/web-status-session-account`

- [ ] T020 [US3] `features/status/`: `git mv` `ServerWake*` into `components/`, add `features/status/index.ts` (the page `StatusPage*` moves in T028)
- [ ] T021 [P] [US3] Create `apps/web/src/features/account/`: extract the forms out of `LoginPage.tsx`, `RegisterPage.tsx`, `VerifyEmailPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` into `features/account/components/{Login,Register,VerifyEmail,ForgotPassword,ResetPassword}Form.tsx`; move `ResendLink.tsx`, `AuthPage.module.css`, `useCountdown.*`, `token-fragment.*`, `useRegistration.ts`, `messages.ts` into the right subfolders; add `features/account/index.ts`. The page files keep only composition (heading, layout, the form); their tests move to the form when they test the form
- [ ] T022 [US3] Gate, open PR 4

### PR 5: `refactor/web-guest-library-settings`

- [ ] T023 [P] [US3] `features/guest/`: split into `services/` (`guest-store`, `guest-save-queue`, IndexedDB code) and `helpers/` (`guest-library`, `guest-record` if pure); add `index.ts`; the rule "guest imports no feature" is the target
- [ ] T024 [P] [US3] `features/library/`: `components/` (`Calendar`, `DayCell`, `LibraryLegend`, `SourceTabs`, `TodayCards`), `hooks/` (`useSourceLibraries`, `useLibraryWidth`), `helpers/` (`calendar`, `today-cards`, `source-down`), `services/` (`library-width`, `source-choice`); add `index.ts`
- [ ] T025 [P] [US3] `features/settings/`: `components/` (`SettingsButton`, `SettingsDialog`), `services/` (`settings-sync`, `settings-open`); add `index.ts`
- [ ] T026 [US3] Replace cross-feature deep imports with the `index.ts` entries (`session < guest < library < settings < game`); Gate, open PR 5

### PR 6: `refactor/web-game-and-pages`

- [ ] T027 [US3] Split `apps/web/src/features/game/` (68 flat files) into `components/` (board, clue, help, keyboard, dialogs, toolbar), `hooks/` (`useGame`, `useClock`, `useBoardSize`, `useCopyClue`, `useDesktopLayout`, `useMeasuredSpace`, `useOnScreenKeyboard`), `services/` (`help-storage`, `save-queue`, `board-size` and `clock` when they use `localStorage` or the settings store) and `helpers/` (pure files: `attribution`, `board-keys`); record in `research.md` which files went where and any that did not fit; at most 20 files directly in any subfolder (SC-005)
- [ ] T028 [US3] Create `apps/web/src/pages/` with one folder each and move only composition into it: `login`, `register`, `verify-email`, `forgot-password`, `reset-password` (from `features/auth`, now thin), `library` (`LibraryPage*` plus `app/direct-play*`), `day` (`DayRoute*`), `game` (`GamePage*` and its css/tests), `status` (`StatusPage*`)
- [ ] T029 [US3] Slim `pages/game/GamePage.tsx`: move logic that is not composition into `features/game/hooks/` (for example the source-library requests on completion and the opening/loading of the puzzle) until the page holds only composition: no `useQuery`/`useMutation`, no storage or save-queue logic and no import of a feature file other than its `index.ts` (`check:deps` clean); write in `research.md` what left the page and why (spec, Edge Cases)
- [ ] T030 [US3] `apps/web/src/app/router.tsx`: import pages by direct path (`../pages/<name>/<Page>`), keep `lazy: import('../pages/game/GamePage')`; add the `router` exception to the rule in `.dependency-cruiser.cjs` (still `warn`)
- [ ] T031 [US3] Compare `apps/web/dist/assets` with the baseline of T002 (research.md D6); if the entry chunk grew above +5% or the game chunk was absorbed, fix the entry-point imports before continuing
- [ ] T032 [US3] Gate, open PR 6; `apps/web/src/` has no folder from the old layout (`api/`, `components/`, `lib/`, `themes/`, `game-logic/`, `features/auth`)

---

## Phase 5: User Story 4 - API with separate identity and `platform/` (Priority: P2)

**Goal**: the target layout of `apps/api/src` from `data-model.md`; routes under `/api/auth/*` unchanged.

**Independent Test**: `npm run test:int` and `npm test -w @cruzadinha/api` pass without changing any expectation; `GET /api/docs/json` is identical to `openapi-before.json` (T002).

### PR 7: `refactor/api-identity`

- [ ] T033 [US4] Create `apps/api/src/modules/identity/{sessions,registration,recovery}/`; `git mv` the `modules/auth/` files as in `data-model.md`; split `auth.routes.ts` (207 lines) into `sessions.routes.ts`, `registration.routes.ts`, `recovery.routes.ts` and `auth.schemas.ts` into the matching `*.schemas.ts`; keep the prefix `/api/auth` and every route `schema`; `users.repository.ts` and `cleanup.repository.ts` stay at `modules/identity/`
- [ ] T034 [US4] Create `apps/api/src/modules/identity/index.ts` exporting `createRequireSession`, `createOptionalSession`, `SESSION_COOKIE`, `createAccount` and the route registrars; switch `modules/{puzzles,library,progress,settings}`, `platform/docs` (still `docs/` until T038), `cli/run-cli.ts`, `app.ts` and `src/test/app.ts` to it
- [ ] T035 [US4] `git mv` `apps/api/src/db/{seed,seed-user,seed-puzzle}.ts` (+ tests) to `apps/api/src/seed/`; fix the script `db:seed` in `apps/api/package.json` and the references in `docs/` and CLAUDE.md
- [ ] T036 [US4] Decide in `research.md` how `modules/progress` reaches `puzzles.repository` (entry `modules/puzzles/index.ts` or a named exception in the config), apply it
- [ ] T037 [US4] Gate (with `test:int`), compare `GET /api/docs/json` with `openapi-before.json` (empty diff), open PR 7

### PR 8: `refactor/api-platform`

- [ ] T038 [P] [US4] `git mv` `apps/api/src/{db,http,lib,docs}` to `apps/api/src/platform/` (the `db/` seed files already left in T035); fix every import in `src/`, `apps/api/drizzle.config.ts` (`schema: './src/db/schema.ts'` becomes `./src/platform/db/schema.ts`), `vitest*.config.ts`, `package.json` scripts (`db:generate`, `db:migrate`), `Dockerfile`, `apps/api/tsdown.config.ts` entries and the file lookups of `version.test.ts`, `collect-workflow.test.ts`, `resend-sender.test.ts` and the `sources/*/fixtures.ts` files
- [ ] T039 [P] [US4] `git mv` `modules/rate-limit` and `modules/email` to `apps/api/src/platform/rate-limit/` and `platform/email/`; add `index.ts` in each exporting only the public API (limits, `RateLimiter`, gates; `EmailService`, senders, templates, `EmailSender`); switch `identity`, `puzzles`, `settings`, `cli/run-cli.ts`, `app.ts` and `src/test/*` to the entries; `platform/email` imports `platform/rate-limit` by its entry
- [ ] T040 [US4] Reduce `apps/api/src/app.ts` imports through the new entries (target: fewer than 36, no numeric goal beyond that); behaviour untouched
- [ ] T041 [US4] Gate (with `test:int`), compare the OpenAPI document again (empty diff), verify `docker build -f apps/api/Dockerfile .` still works, open PR 8

---

## Phase 6: User Story 1 - Boundaries enforced (Priority: P1) (PR 9: `refactor/boundary-rules-error`)

**Goal**: warnings become errors and block commit, push and CI. Depends on every previous PR.

**Independent Test**: a temporary forbidden import fails `npm run lint`; removing it passes.

- [ ] T042 [US1] Run `npm run check:deps`: zero violations and zero cycles in both workspaces; fix anything left before switching severities
- [ ] T043 [US1] In `.dependency-cruiser.cjs` change every rule to `severity: 'error'`; keep only the documented exceptions (router → `pages/*`, `import()` of `pages/game/GamePage`)
- [ ] T044 [US1] Make `check:deps` part of the root `lint` script (`eslint . && npm run check:deps`) and turn the CI step of T008 into a failing step
- [ ] T045 [US1] Measure `npm run check:deps` (time it); when under 10 s add it to `.husky/pre-push` after `npm run typecheck`, otherwise leave it in `lint` and CI only and write the measured time in `research.md`
- [ ] T046 [US1] Manual check of SC-002: add `import '../game/useGame'` to a file in `apps/web/src/features/library/`, confirm `npm run lint` fails; remove it
- [ ] T047 [US1] Gate, open PR 9

---

## Phase 7: Polish & cross-cutting concerns (PR 10: `docs/update-paths-after-reorg`)

- [ ] T048 Update `CLAUDE.md`: the "Architecture" section for the new layout, the feature list (add feature 037 and its dependency rules and `check:deps`), the commands section (`check:deps`), and every old path (`features/auth`, `game-logic`, `modules/auth`, `modules/rate-limit`, `modules/email`, `db/seed*`)
- [ ] T049 [P] Update `docs/` (`deploy.md`, `versionamento.md`, `design.md`, data definitions if they quote paths) and `.github/workflows/*.yml` that name old paths; `grep -rnE "features/auth|game-logic|modules/(auth|rate-limit|email)|src/(api|components|lib|themes)/" CLAUDE.md docs .github` returns nothing (SC-008)
- [ ] T050 [P] Update the old specs that quote moved paths only where a reader would be misled (`specs/0NN-*/`); do not rewrite their history, and add one line pointing to `specs/037-reorganizar-por-feature/` where the path moved
- [ ] T051 Final validation: `npm run check:deps` clean, `npm run test:int`, `npm run test:e2e -w @cruzadinha/web`, chunk comparison and OpenAPI diff, as in `quickstart.md`; check the success criteria SC-001 to SC-008 one by one in the PR description; for SC-004 compare the route list of `apps/web/src/app/router.tsx` with `main` (same paths) and rely on the e2e for the screens

---

## Dependencies & Execution Order

- **Setup (T001-T005)** → **Foundational (T006-T009)** → blocks everything; PR 1 first.
- **US2 (T010-T016)**: after PR 1. Ruptures T010, T011 can run in parallel; T012 after T011 (session imports `ErrorState`/`useSlowServer` from `shared`); T013 before T014; T015 last.
- **US3 (PR 3 to PR 6)**: after US2, in the order of the PRs: PR 3 (shared/domain) → PR 4 (status, account) → PR 5 (guest, library, settings) → PR 6 (game, pages). T027 to T029 depend on T014.
- **US4 (PR 7, PR 8)**: independent from US3; can run in parallel with it in a separate branch, since `apps/api` and `apps/web` do not share files. PR 7 before PR 8.
- **US1 final (PR 9)**: after PR 6 and PR 8, because it flips the severity.
- **Polish (PR 10)**: after PR 9; path updates of docs for an already-merged PR may be included in that PR instead.

## Parallel Opportunities

- Within PR 2: T010 and T011. Within PR 3: T017 and T018. Within PR 5: T023, T024, T025 (different features).
- US3 (web) and US4 (API) in two branches at the same time.
- Within PR 8: T038 and T039 touch different folders, but both rewrite `app.ts` imports; do them one after another unless merge conflicts are acceptable.

## Implementation Strategy

- **MVP**: PR 1 and PR 2 (rules visible + no cycles). They deliver the main protection and the biggest decoupling, and every later PR is optional layout work that cannot create a new cycle because `check:deps` is already running.
- **Incremental**: one PR per block; never start the next one on a red Gate. Re-run the baseline comparison (chunks, OpenAPI) in every PR that moves pages, entries or routes.
- **Rollback**: each PR is a pure move plus import changes, so a revert restores the previous layout.
- **No version bump**: PR types are `refactor`/`docs`/`chore`/`ci`, so release-please does not release (docs/versionamento.md).

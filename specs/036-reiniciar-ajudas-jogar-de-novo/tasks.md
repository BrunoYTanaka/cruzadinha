---
description: 'Task list for 036-reiniciar-ajudas-jogar-de-novo'
---

# Tasks: Ajudas zeradas ao jogar de novo

**Input**: Design documents from `/specs/036-reiniciar-ajudas-jogar-de-novo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (no `contracts/`: no interface changes)

**Tests**: Requested by the spec (FR-008) and by the bug flow: when the defect reproduces, the failing regression test is committed together with the fix.

**Organization**: Grouped by user story. The cause is **unknown** (the defect did not reproduce in jsdom, see `research.md` §1), so the first tasks reproduce it; the fix tasks (marked _conditional_) depend on what the reproduction shows.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 from `spec.md`
- All paths relative to the repository root; only `apps/web` changes

## Phase 1: Setup

- [X] T001 Confirm the environment: `npm ci` done, Postgres and API running with the seed, `npx playwright install chromium` done (see `specs/036-reiniciar-ajudas-jogar-de-novo/quickstart.md`)
- [X] T002 Review the uncommitted `apps/web/src/features/game/PlayAgainHelps.test.tsx` (3 passing component tests: visitor, account, visitor reopening a completed puzzle with stored helps); keep it as protection for FR-001 to FR-006
- [X] T003 Consult Context7 MCP (constitution, "Fluxo de Desenvolvimento") for Playwright (reload, two pages in one browser context, `page.route`) and Vitest/Testing Library (fake timers with `user-event`) before writing tests; note the confirmed versions and APIs in `specs/036-reiniciar-ajudas-jogar-de-novo/research.md`

---

## Phase 2: Foundational (blocks the fix)

- [X] T004 Reproduce in Chromium: new `apps/web/e2e/jogar-de-novo-ajudas.spec.ts` that uses a letter help and a word help, completes the puzzle, clicks "Ver o tabuleiro" and "Jogar de novo", then expects the letter and word counters at the full limit (read the limits from the buttons' own text, not hard-coded) and no help-marked cell (FR-002), before and after `page.reload()`, for visitor and account, and that the best time is kept (FR-007). Use `resetAndSeed`, `login`, `solveFirstAcrossWord`, `typeWord` from `apps/web/e2e/support.ts` (pattern in `apps/web/e2e/visitante.spec.ts:12` and `apps/web/e2e/ajudas-e-retomada.spec.ts:21`)
- [X] T005 Decision gate on T004, record the result in `specs/036-reiniciar-ajudas-jogar-de-novo/research.md` (new section "Reproduction"):
  - **Fails** → go to Phase 3 (cause found).
  - **Passes** → go to T006.
- [X] T006 Only if T004 passes: add the variants from `research.md` §2 to the same e2e file, one test each: two tabs on the same puzzle (the old tab regrabs its helps; visitor result is the documented last-write-wins rule, see `research.md` §5), reset with a pending debounced save (real timers, visitor), limits set to "Sem limite" and a limit lowered below the usage before playing again
- [X] T007 Only if T006 also passes: stop and ask the user (repository owner) before any outward action. Propose a comment on issue #86 asking the reporter for the site version (`/version.json`), player type (visitor or account) and exact steps; post or close the issue only after the user confirms. Keep the passing tests from T002, T004 and T006 as protection. Skip Phases 3 to 5 and go to Phase 6

**Checkpoint**: a red test exists and the cause is named in `research.md`, or the work stops at T007.

---

## Phase 3: User Story 1 - Nova partida começa com o limite completo de ajudas (Priority: P1) 🎯 MVP

**Goal**: after "Jogar de novo" every help counter shows the full limit and no help mark remains.

**Independent Test**: the T004 spec (visitor and account) passes; `npx vitest run src/features/game/PlayAgainHelps.test.tsx` stays green.

- [X] T008 [US1] _Conditional on T005 "Fails"._ Fix the root cause named in `research.md`, in the layer that owns it: pure rules in `apps/web/src/game-logic/` (with a unit test), reset flow in `apps/web/src/features/game/useGame.ts` (`playAgain`), account helps in `apps/web/src/features/game/help-storage.ts`, visitor record in `apps/web/src/features/guest/guest-store.ts` or `apps/web/src/game-logic/guest-progress.ts`. Change the smallest thing; do not touch the API, shared schemas or settings
- [X] T009 [US1] Commit the red test from T004/T006 together with T008 (bug flow: regression test with the fix), conventional commit `fix(web): reset helps when playing again`

**Checkpoint**: US1 verified for visitor and account.

---

## Phase 4: User Story 2 - O reinício das ajudas sobrevive a recarregar a página (Priority: P1)

**Goal**: reload, reopen or a second tab never brings back the previous game's helps.

**Independent Test**: T004 after `page.reload()` and the two-tab case of T006.

- [X] T010 [US2] _Conditional._ If T008 does not already cover reload, second-tab and pending-save persistence (spec US2 scenario 3 and the pending-save edge case), extend the fix so the reset helps are not regrabbed; add the failing case first in `apps/web/e2e/jogar-de-novo-ajudas.spec.ts`
- [X] T011 [US2] Add a component test in `apps/web/src/features/game/PlayAgainHelps.test.tsx`: after "Jogar de novo" use one help and reopen; only that help counts (spec US2 scenario 2, SC-003)

**Checkpoint**: US1 and US2 verified.

---

## Phase 5: User Story 3 - Reinício que falha não perde nem mistura nada (Priority: P2)

**Goal**: an account without connection keeps helps, marks and board as they were; a reset never touches other puzzles or the visitor's data.

**Independent Test**: the new component tests below.

- [ ] T012 [US3] Add a component test in `apps/web/src/features/game/PlayAgainHelps.test.tsx` (after T011, same file): account, `RESET` handler answering a network error, click "Jogar de novo" in read mode; expect the "Sem conexão. Tente de novo quando voltar." notice, the board unchanged and the stored help (`cruzadinha:help:<userId>:<puzzleId>`) still present (pattern in `apps/web/src/features/game/ReadMode.test.tsx`)
- [ ] T013 [US3] Add a component test in `apps/web/src/features/game/PlayAgainHelps.test.tsx` (after T012): reset puzzle A and check that puzzle B's stored help, the visitor's IndexedDB record (account case) or the account's `localStorage` help (visitor case) and `cruzadinha:settings` are unchanged (FR-006, edge case "não se misturam")
- [ ] T014 [US3] _Conditional._ If T012 or T013 fails, fix `apps/web/src/features/game/useGame.ts` (`playAgain`) so nothing is cleared before `resetProgress` succeeds and only the reset puzzle's keys are touched

---

## Phase 6: Polish & cross-cutting

- [X] T015 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e -w @cruzadinha/web` (against a separate e2e database, see `CLAUDE.md`)
- [X] T016 Update `CLAUDE.md` "Current state" with a Feature 036 line (what the cause was, or that it was not reproducible and which tests protect the rule) only if code changed; no DDE or ERD update (no table change) (skipped: no code changed)
- [ ] T017 Open the PR from `fix/reset-helps-on-play-again` to `main`, title `fix(web): reset helps when playing again` (or `test(web): ...` if no code fix was needed), summary and test plan, no AI attribution lines (project rule)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → decision gate T005. T003 (Context7) comes before any test is written.
- T005 "Fails": Phases 3 and 4 in order (T010 may be a no-op); Phase 5 is independent of them after Phase 2.
- T005 "Passes": T006, then T007; if still green, skip to Phase 6 with the tests as the only change.
- T011, T012 and T013 edit the same file, so they run one after the other (no `[P]`).

## Implementation Strategy

MVP = Phase 2 + US1 (T004 → T008 → T009). Stop at T007 if the defect does not reproduce: no speculative change to `useGame.ts`.

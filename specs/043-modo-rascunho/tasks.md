---

description: "Task list for feature 043 - Modo rascunho (lápis)"
---

# Tasks: Modo rascunho (lápis) com letras provisórias

**Input**: `specs/043-modo-rascunho/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Prerequisites**: plan.md, spec.md

**Tests**: Included. Constitution principle V requires a unit test per rule of the pure reducer, and the plan lists unit and e2e tests.

**Organization**: by user story. Only `apps/web` changes (no API, `shared`, table or save contract). All paths are under `apps/web/` and Portuguese UI text follows `docs/design.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an incomplete task
- **[Story]**: US1, US2, US3

## Phase 1: Setup

- [X] T001 Confirm the baseline is green before changing anything: run `npx vitest run src/domain/game src/features/offline src/features/game` in `apps/web` and `npm run check:deps` at the root

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: the `draft`/`pencil` layer in the game state and its invariant. Every story depends on it.

- [X] T002 Add `draft: (string | null)[][]` (same size as the grid, letters A–Z and Ç or `null`) and `pencil: boolean` (starts `false`) to `GameState`, reusing `emptyCells`, in `apps/web/src/domain/game/state.ts`
- [X] T003 [P] Create pure helpers `pruneDraft(state)` (invariant: `draft != null ⇒ cells == null && !locked`; `mode === 'completed' ⇒ draft` all `null`), `wordHasDraft(index, state)` and `hasAnyDraft(draft)` in `apps/web/src/domain/game/draft.ts`, with `apps/web/src/domain/game/draft.test.ts`
- [X] T004 Apply `pruneDraft` at the end of every action in `apps/web/src/domain/game/reducer.ts`, and make `finish` (completion), `viewServerProgress` and `reset` produce an empty `draft` (FR-011)
- [X] T005 Extend the `hydrate` action with `draft?: (string | null)[][] | null` in `apps/web/src/domain/game/reducer.ts`: apply it through `pruneDraft`; a draft whose shape differs from the grid is ignored without dropping the rest of the action (contract guarantee 3)

**Checkpoint**: state carries the draft layer; no behaviour visible yet.

---

## Phase 3: User Story 1 - Anotar uma letra provisória (P1) 🎯 MVP

**Goal**: with the pencil on, typed letters go to the draft layer, look like a draft, and never count as an answer.

**Independent Test**: turn the pencil on, type `A` in an empty cell and see an italic light letter; turn it off and the cell has no definitive answer; a word filled only with correct drafts is not solved and its clue is not struck.

- [X] T006 [US1] Add the `setPencil { on }` action (only while playing, only changes `pencil`) in `apps/web/src/domain/game/reducer.ts`
- [X] T007 [US1] Make `type` pencil-aware in `apps/web/src/domain/game/reducer.ts`: pencil on writes or replaces the draft of a free cell, ignores a cell with a definitive or locked letter, always advances the cursor as a normal typing (skipping locked cells) and never calls `finish`; pencil off types the definitive letter as today and the invariant removes the cell's draft (FR-002, FR-006, FR-008)
- [X] T008 [US1] Make `backspace` and `delete` pencil-aware in `apps/web/src/domain/game/reducer.ts`: pencil on erases only the draft; pencil off erases the visible letter (unlocked definitive or draft); same cursor movement as today (FR-005)
- [X] T009 [US1] Reducer unit tests in `apps/web/src/domain/game/reducer.test.ts`: type, replace, erase, definitive priority with cursor advance, locked cell ignored, accented letters via `plainLetter`, pencil-off erase removes a draft, definitive typing removes a draft, `completed` mode ignores `setPencil`, a word full of correct drafts is not solved (`isSolved`, `struckWords` unchanged), pencil-on backspace/delete on a definitive letter erases only the draft and keeps the letter, cursor moves identically with and without the pencil
- [X] T010 [P] [US1] Create `pencil-preference.ts` (`cruzadinha:pencil`, `'1'` on, absent off, via `shared/services/storage`, never throws) with `pencil-preference.test.ts` in `apps/web/src/features/game/services/` (FR-016)
- [X] T011 [P] [US1] Add a `draft` prop and a `.draft` class (italic, lighter weight, smaller size, secondary-text token; no layout shift) to `apps/web/src/features/game/components/board/Cell/Cell.tsx` and its `.module.css`, keeping `memo`; add a Cell test
- [X] T012 [US1] Pass the draft to each `Cell` and describe the cell as "rascunho <letra>" in `apps/web/src/features/game/components/board/Board/Board.tsx`; add a Board test
- [X] T013 [US1] Create `DraftControls` with a pencil icon button (name "Lápis (rascunho)", `aria-pressed`) in `apps/web/src/features/game/components/controls/DraftControls/DraftControls.tsx` and `.module.css`, with a test (including `vitest-axe`); use the `Button` `icon` variant. Pause and settings live in the clock, not in `GameState`: `DraftControls` takes `disabled` (`clock.paused` or settings open, like `HelpButtons`) and the test covers the pencil, confirm and discard blocked with the clock paused and with settings open
- [X] T014 [US1] In `apps/web/src/features/game/hooks/useGame.ts` expose `pencil` and `setPencil`, applying the stored preference when the game opens and saving it on change
- [X] T015 [US1] Render `DraftControls` in the tools strip next to `HelpButtons`, only while playing and present from the first paint, in `apps/web/src/features/game/components/GameScreen/GameScreen.tsx`, passing `disabled={clock.paused}` (and the settings-open state) as `HelpButtons` gets it; check physical, on-screen and device keyboards all go through the same `type` action (acceptance 1.5)

**Checkpoint**: US1 works in the session (no persistence yet); MVP.

---

## Phase 4: User Story 2 - Confirmar ou descartar rascunhos (P2)

**Goal**: turn the active word's drafts into definitive letters or drop them in one action.

**Independent Test**: fill drafts in a word, confirm and see them become normal letters that count; repeat and discard and see them vanish.

- [X] T016 [US2] Add `confirmDraft` (active word's draft → `cells`, clear that draft, then `finish` so it can complete; only while playing; no change when the word has no draft; other words untouched) and `discardDraft` (clear the active word's draft) in `apps/web/src/domain/game/reducer.ts`
- [X] T017 [US2] Reducer tests in `apps/web/src/domain/game/reducer.test.ts`: confirm counts for verification and completion, confirm only affects the active word (crossed cells), discard keeps definitive letters, both are no-ops in `completed` mode and without a draft, a help (`revealLetter`/`revealWord`) over a drafted cell removes the draft, `verify` neither marks nor removes drafts and leaves the help count as today, a locked cell never receives a draft, `hydrate` with a draft is filtered by the invariant
- [X] T018 [US2] Add "Confirmar rascunho" and "Descartar rascunho" buttons to `apps/web/src/features/game/components/controls/DraftControls/DraftControls.tsx`: always present, `aria-disabled` (still focusable, same pattern as `HelpButtons`) when `wordHasDraft` is false for the active word, plus an `aria-live="polite"` region announcing "Rascunho confirmado"/"Rascunho descartado"; extend its test
- [X] T019 [US2] Wire `confirmDraft`/`discardDraft` from `useGame.ts` through `GameScreen.tsx` to `DraftControls`

**Checkpoint**: US1 and US2 work in the session.

---

## Phase 5: User Story 3 - Rascunho que sobrevive e não atrapalha (P3)

**Goal**: drafts survive reloads on the same device, follow the 041 owner and limit rules, and vanish on completion, restart and "Jogar de novo".

**Independent Test**: write drafts, reload and see them back; complete the puzzle and see no `cruzadinha:draft:*` key for it; sign out and see the account's keys gone.

- [X] T020 [P] [US3] Create the draft storage `loadDraft`/`saveDraft`/`clearDraft` and internal `listDrafts` in `apps/web/src/features/offline/services/draft/draft.ts`: key `cruzadinha:draft:<owner>:<puzzleId>` (`owner` = user id or `guest`), value `{ "v": 1, "cells": (string | null)[][] }` read through a strict Zod `draftSchema` (letters A–Z and Ç or `null`; an invalid value is ignored and removed), an all-empty draft removes the key, never throws; with `draft.test.ts`
- [X] T021 [US3] Export `loadDraft`, `saveDraft`, `clearDraft` from `apps/web/src/features/offline/index.ts`, keeping the barrel to names other areas use
- [X] T022 [P] [US3] In `apps/web/src/features/offline/services/outbox-owner/outbox-owner.ts` make `clearAccountData(userId)` delete that account's drafts and `discardOtherAccounts(userId)` delete the drafts of every other account but never `guest`; an expired session clears nothing; extend its tests (FR-017)
- [X] T023 [P] [US3] In `apps/web/src/features/offline/services/offline-store/offline-store.ts` make `protectedIds` include every `puzzleId` with a draft of any owner and delete a puzzle's drafts when `enforceLimit` removes its copy; extend its tests (FR-018)
- [X] T024 [US3] In `apps/web/src/features/game/hooks/useGame.ts` hydrate the stored draft (owner = account id or `guest`) through `hydrate`, save it on every `state.draft` change while playing, and clear it on completion, restart, "Jogar de novo" and when opening an already completed puzzle (FR-009, FR-011, R8); a guest draft change counts as a progress change: schedule the guest snapshot so an `in_progress` record exists once a draft is written, even with no definitive letter; only after that, delete a guest draft that has no guest progress record when the game opens (FR-018). Accounts get no orphan cleanup (FR-018 lists their triggers); two tabs are last-write-wins, accepted in the spec; a storage failure never blocks the game
- [X] T025 [US3] Hook/integration tests in `apps/web/src/features/game/` (using `game-harness`; include `vitest-axe` on `GameScreen` with drafts on the board): reload brings drafts and pencil back for a guest and for an account, including a guest who wrote only drafts (no definitive letter) on a new puzzle (H1); typing a draft does not start or change the clock (FR-004); completion, restart and "Jogar de novo" leave no draft key; the body sent by the save queue never has a draft (FR-010, SC-005); copy-clue still copies only definitive letters (FR-015)
- [X] T026 [P] [US3] Playwright `apps/web/e2e/rascunho.spec.ts`: write drafts, reload, confirm, complete; and extend `apps/web/e2e/sem-saltos.spec.ts` to measure no layout shift when turning the pencil on and typing with it; add a narrow-viewport case with the on-screen keyboard that reaches the pencil and types a draft (FR-012); run axe (including `color-contrast`) on the game screen with drafts on the board in light and dark themes (constitution contrast rule, SC-006)

---

## Phase 6: Polish & Cross-Cutting

- [X] T027 Run `npm run check:deps`, `npm run lint`, `npm run typecheck`, `npm test` at the root and fix any import-rule or type violation (new `features/offline/services/draft` must not import `game`)
- [X] T028 Run (after T027) `npm run test:e2e -w @cruzadinha/web -- rascunho sem-saltos` and the manual script in `specs/043-modo-rascunho/quickstart.md` for a guest and then an account
- [X] T029 [P] Add the feature 043 paragraph (pencil, device-only draft keys, owner and limit rules) to the "Where things stand" section of `CLAUDE.md`; no DDE/ERD change (no table)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T002 → T004, T005; T003 parallel to T002 but T004 needs it) → user stories.
- **US1** needs Phase 2. **US2** needs US1's `DraftControls` (T013) and reducer. **US3** needs US1 (hook, T014) and US2 for the full e2e; T020 needs only Phase 2 and can start earlier; T022 and T023 need T020 (`listDrafts`) and then run in parallel.
- Same-file tasks are sequential: `reducer.ts` (T004–T008, T016), `reducer.test.ts` (T009, T017), `useGame.ts` (T014, T024), `DraftControls.tsx` (T013, T018).

## Parallel Examples

- After Phase 2: T010, T011 and T020, T022, T023 touch different files and can run together.
- Phase 6: T029 is independent; T028 runs after T027.

## Implementation Strategy

- **MVP**: Phases 1 to 3 (US1). Drafts work in the session; ship-worthy only after US3 persistence, but each phase is testable alone.
- Then US2 (confirm/discard), then US3 (persistence and owner rules), then Polish.
- Commit per phase with Conventional Commits (`feat(web): ...`); no Claude attribution lines, per `CLAUDE.md`.

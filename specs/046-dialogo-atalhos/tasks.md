---

description: "Task list for the keyboard shortcuts dialog"
---

# Tasks: Diálogo com atalhos de teclado

**Input**: Design documents from `/specs/046-dialogo-atalhos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/shortcuts-dialog.md, quickstart.md

**Tests**: Included (plan.md and SC-002/SC-004 require them: table test, Board, dialog with axe in both themes, GameScreen, one e2e).

**Organization**: Grouped by user story. Web only (`apps/web`); no API, storage or new setting. All paths are under `apps/web/` and each component lives in its own folder with `.module.css` and tests (feature 037 rule). Commits: Conventional Commits in English, scope `web`, no AI attribution trailer (CLAUDE.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3

---

## Phase 1: Setup

- [X] T001 Read `src/features/game/components/board/Board/Board.tsx`, `src/features/game/helpers/board-keys.ts`, `src/features/game/components/controls/Toolbar/Toolbar.tsx`, the `SettingsButton` in `src/features/settings/components/SettingsButton/` (icon + `Tooltip` pattern; read only, copy the pattern, never import it: `game` may not import `settings` internals), `src/shared/components/Dialog` and `src/features/game/hooks/useGame.ts` to confirm the names used below (`sizeReset` prop, `useOnScreenKeyboard`, `useClock` `suspended`); adjust paths in later tasks if a name differs. Use Context7 (`resolve-library-id` then `query-docs`) to confirm React 19 portal event bubbling and the boolean `inert` prop, plus the Testing Library and Playwright APIs used in T010–T017, and record the result in research R3/R4 (constitution development flow). No other file changes.

---

## Phase 2: Foundational (blocking)

**Purpose**: the single shortcut definition (FR-009, SC-002) that the board, the dialog and the `?` key all read.

**⚠️ CRITICAL**: US1–US3 depend on this phase.

- [X] T002 Create `src/features/game/helpers/shortcuts.ts` per data-model.md: move the `BoardKey` type here; export types `ShortcutKey` (`key: string | null`, `shift: boolean`, `label`, `spoken?`), `Shortcut` (`keys`, `action`, `description`), `ShortcutGroup`; export `SHORTCUT_GROUPS` in the order Mover (↑ ↓ ← → `arrow`, Home `wordStart`, End `wordEnd`, Tab `nextWord`, Shift+Tab `previousWord`), Escrever (A a Z `letter` with `key: null`, Backspace, Delete), Sair do tabuleiro (Esc `releaseTab`), Ajuda (`?` `openShortcuts`); arrows carry `spoken` ("seta para cima", "seta para baixo", "seta para a esquerda", "seta para a direita"); descriptions short, in Portuguese. Export pure `resolveBoardKey(key, shiftKey)`: first table match on `key` (and `shift` for Tab), `'?'` → `null`, any other single-character `key` → `{ type: 'letter', key }`, everything else → `null`.
- [X] T003 [P] Create `src/features/game/helpers/shortcuts.test.ts`: every table key except `?` resolves to its declared action; `?` and unlisted keys (`F5`, `Enter`) resolve to `null`; Shift+Tab → `previousWord`, Tab → `nextWord`; a single character resolves to `letter`; every `BoardKey['type']` appears in at least one shortcut (SC-002).
- [X] T004 Edit `src/features/game/components/board/Board/Board.tsx`: import `BoardKey` from `shortcuts.ts` and re-export it (`export type { BoardKey } from '../../../helpers/shortcuts'`); replace the `if` chain in `onKeyDown` with `resolveBoardKey(event.key, event.shiftKey)`, keeping Ctrl/Alt/Meta refusal, the Esc `releaseTab` handling, Tab release behaviour and `preventDefault` exactly as today. Edit `src/features/game/helpers/board-keys.ts` to import `BoardKey` from `shortcuts.ts` (avoids the `shortcuts → Board → shortcuts` cycle flagged by `check:deps`).
- [X] T005 Run the existing Board tests (`npx vitest run src/features/game/components/board/Board`) and fix regressions; behaviour must be unchanged.

**Checkpoint**: table in place, board driven by it, `npm run lint` (includes `check:deps`) clean.

---

## Phase 3: User Story 1 - Consultar os atalhos sem sair do jogo (P1) 🎯 MVP

**Goal**: toolbar button opens a dialog listing grouped shortcuts; closing leaves the game untouched.

**Independent Test**: open the dialog from the toolbar button, see every shortcut with its description, close (Esc, "Fechar", click outside) and keep typing in the same cell.

- [X] T006 [P] [US1] Create `src/features/game/components/dialogs/ShortcutsDialog/ShortcutsDialog.tsx` and `ShortcutsDialog.module.css`: `Dialog` with `title="Atalhos de teclado"`, `closeButton`, `closeOnBackdrop`, `size="wide"`; for each `SHORTCUT_GROUPS` entry an `h3` and a `<dl>`/`<ul>` with the keys in `<kbd>` (symbol `aria-hidden` + `VisuallyHidden` with `spoken`) and the description; props `open`, `onClose`. Both themes via tokens, no horizontal scroll at 200% zoom, no underline on buttons, no `h1`.
- [X] T007 [P] [US1] Create `src/features/game/components/controls/ShortcutsButton/ShortcutsButton.tsx` (+ `.module.css` if needed) and a small `ShortcutsButton.test.tsx` (accessible name and `Tooltip` text "Atalhos de teclado", `onOpen` called on click): icon button (`buttonClass({ variant: 'icon' })`, keyboard SVG) with `aria-label="Atalhos de teclado"` inside `Tooltip label="Atalhos de teclado"`, prop `onOpen`; model on `SettingsButton`.
- [X] T008 [US1] Edit `src/features/game/components/controls/Toolbar/Toolbar.tsx`: add optional `shortcuts?: ReactNode` rendered next to `sizeReset` (with the separator as `sizeReset` does), inside the existing `role="toolbar"`; button is an icon so the strip must not wrap.
- [X] T009 [US1] Edit `src/features/game/components/GameScreen/GameScreen.tsx`: add `shortcutsOpen` state (declared before `useGame`), pass `<ShortcutsButton onOpen=... />` to `Toolbar` as `shortcuts` and render `<ShortcutsDialog open onClose />`; button and dialog also available when the game is complete (read-only) and when paused.
- [X] T010 [P] [US1] Create `ShortcutsDialog.test.tsx` next to the component: lists every group title and every shortcut description from `SHORTCUT_GROUPS`; arrow keys expose the spoken name; Esc, "Fechar" and backdrop click close it; focus returns to the opener; axe passes in light and dark themes.
- [X] T011 [US1] Add GameScreen tests in `GameScreen.test.tsx` (use `game-harness`): button opens the dialog; typing letters/arrows with it open writes nothing behind; open+close 10 times leaves `selected`, `direction`, `cells`, `draft`, `usage` and the saved progress unchanged (SC-003); Esc that closes the dialog does not reach the board, so the next Tab still changes word; works with the game complete.

**Checkpoint**: US1 works with the mouse; MVP.

---

## Phase 4: User Story 2 - Abrir o diálogo pelo teclado (P2)

**Goal**: `?` opens the dialog from the game page without typing anything.

**Independent Test**: with focus on the board press `?`, see the dialog, press Esc, keep typing in the same cell.

- [X] T012 [US2] Edit `GameScreen.tsx`: add a `keydown` listener on `document` (effect, removed on unmount) that opens the dialog when `event.key === '?'`, no `ctrlKey`/`altKey`/`metaKey` (Shift allowed), the target is `document.body` or inside the `GameScreen` root (so focus on body, e.g. after clicking an empty area or while paused with the board `inert`, still works; the site header and portal dialogs such as completion/settings do not, so it never stacks), and the target is not `input, textarea, select, [contenteditable]`; call `preventDefault`. Do nothing when the dialog is already open.
- [X] T013 [US2] Add GameScreen tests: `?` (with and without Shift) from the board and from a toolbar button opens it and types nothing; `Ctrl+?`/`Alt+?`/`Meta+?` do not; `?` from a text input does not; `?` with the dialog open leaves one dialog; `?` with focus on `document.body` (also with the game paused) opens it; `?` with the settings or completion dialog open opens nothing.

**Checkpoint**: US1 and US2 both work.

---

## Phase 5: User Story 3 - Convivência com relógio, ajuda e telas pequenas (P3)

**Goal**: dialog suspends the clock, never resumes a paused game, and only exists without the on-screen keyboard.

**Independent Test**: open the dialog 10 s and see the clock stand still; load the screen on a coarse-pointer/≤720 px setup and see no button and no `?`.

- [X] T014 [US3] Edit `src/features/game/hooks/useGame.ts`: accept `dialogOpen?: boolean` and pass `settingsOpen || dialogOpen` as the `suspended` argument of `useClock`; pass `shortcutsOpen` from `GameScreen.tsx`. Do not touch the manual pause.
- [X] T015 [US3] Edit `GameScreen.tsx`: render the button/dialog and attach the `?` listener only when `useOnScreenKeyboard()` is false (any window width; contract "Presença", FR-008).
- [X] T016 [US3] Add tests: with the fake `Clock`, 10 s with the dialog open do not count; closing a dialog opened while paused leaves the game paused ("Continuar" still needed); with the on-screen keyboard matched there is no button and `?` opens nothing; with a 721–860 px window and no on-screen keyboard both exist. Pressing `?` while paused opens the dialog (FR-006).

**Checkpoint**: all stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [X] T017 Create `e2e/atalhos.spec.ts` (after T012 and T015): open a puzzle, press `?`, assert the dialog and its groups, press Esc, assert the board is intact and Tab still moves to the next word; also open by the toolbar button. Required (FR-010): in the `e2e/sem-saltos.spec.ts` style, measure the board box before, during and after the dialog and assert it does not move, and at a 721 px wide window with the new button assert the toolbar height equals its height without wrapping (single line).
- [X] T018 Run `npm run format`, `npm run lint` (ESLint + `check:deps`), `npm run typecheck`, `npm test` and `npm run build`; fix findings.
- [ ] T019 Walk through `quickstart.md` manual steps 1–7 (dark theme, 200% zoom, 800 px window, completed game) and run `npm run test:e2e -w @cruzadinha/web -- atalhos` (needs API + seed).
- [X] T020 Add the feature 046 entry to CLAUDE.md "Where things stand" (as features 041 to 043 did: shortcut table in `features/game/helpers/shortcuts.ts`, `?` rule, dialog suspends the clock and never resumes a paused game); never edit `CHANGELOG.md` or versions by hand (release-please).

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T002 → T003 [P] and T004 → T005) → Phase 3+.
- US1 (T006, T007 parallel → T008 → T009 → T010 [P], T011) is the MVP.
- US2 (T012, T013) needs T009 (state and dialog in `GameScreen`).
- US3 (T014–T016) needs T009; T015 touches the same file as T009/T012, so do it after them.
- `GameScreen.tsx` is edited by T009, T012, T014 (passes `shortcutsOpen`) and T015, and tested in one file by T011, T013, T016: run those sequentially.
- Polish after all stories (T017 needs T012 and T015).

## Parallel Example

```text
After T005:  T006 (ShortcutsDialog.tsx)  ||  T007 (ShortcutsButton.tsx)  ||  T003 already done
After T009:  T010 (dialog tests)         ||  T014 (useGame.ts hook part only; its GameScreen edit goes in the sequential list)
After T012 and T015: T017 (e2e)
```

## Implementation Strategy

1. Phases 1–2: shared table and board refactor (behaviour-neutral, validated by existing Board tests).
2. Phase 3 (US1) → stop and validate: button + dialog work with the mouse. MVP.
3. Add US2 (`?`), then US3 (clock, on-screen keyboard rule), then Polish.
4. Branch `feat/046-dialogo-atalhos`; commit per phase with `feat(web): ...` / `test(web): ...`.

## Notes

- No migration, no DDE/ERD change (nothing stored); `features/game/index.ts` exports nothing new.
- `?` in the table has action `openShortcuts` but `resolveBoardKey('?')` returns `null`: the page handles it (research R3).

## Phase 7: Convergence

- [X] T021 Add to `apps/web/src/pages/game/Shortcuts.test.tsx` the `?` cases T013 lists and the current test does not exercise: `Alt+?` and `Meta+?` open nothing, `?` typed in a text input opens nothing (the existing test title claims it but no assertion does), `?` from a toolbar button opens the dialog, and `?` with focus on `document.body` opens it per FR-004 (partial)
- [X] T022 Add to `apps/web/src/pages/game/Shortcuts.test.tsx` a test that `?` with the settings or completion dialog open opens no shortcuts dialog (FR-004, T013), and one that the toolbar button and `?` exist at a 721–860 px window without the on-screen keyboard (FR-008, T016) (missing)

---

description: "Task list for the optional automatic verification"
---

# Tasks: Verificação automática opcional

**Input**: Design documents from `/specs/047-verificacao-automatica/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settings-contract.md, quickstart.md

**Tests**: Included (constitution V and VII: pure rule, schema, component with axe in both themes, GameScreen, one e2e).

**Organization**: Grouped by user story. Shared schema (`packages/shared`) and web (`apps/web`); the API gets only a doc example and an integration check, no route, table or migration. Each web component lives in its own folder with `.module.css` and tests (feature 037 rule). Commits: Conventional Commits in English, no AI attribution trailer (CLAUDE.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3

---

## Phase 1: Setup

- [X] T001 Read `apps/web/src/features/game/components/GameScreen/GameScreen.tsx`, `src/features/game/components/board/Board/Board.tsx` (where `state.marks` is read, lines ~36, 152, 160), `src/features/settings/components/SettingsDialog/SettingsDialog.tsx` (local `Switch`, `Row`), `src/features/game/components/controls/{HelpButtons,DraftControls,Toolbar}/`, `src/shared/components/Pill/Pill.tsx`, `src/shared/services/settings-store/settings-store.ts` and `src/domain/game/letters.ts` to confirm the names used below; adjust paths in later tasks if a name differs. Use Context7 (`resolve-library-id` then `query-docs`) to confirm the Testing Library keyboard/focus APIs, `vitest-axe` and the Playwright APIs used in T012, T014, T017 and T019–T021, and record the result in `research.md` (constitution development flow). No other file changes.

---

## Phase 2: Foundational (blocking)

**Purpose**: the `verifyOnType` setting, which all three stories read.

**⚠️ CRITICAL**: US1–US3 depend on this phase.

- [X] T002 Edit `packages/shared/src/settings/schema.ts`: add `verifyOnType: z.boolean()` to `fields`, `verifyOnType: false` to `defaultSettings`, and extend the request with `saveSettingsRequestSchema = z.object({ settings: settingsSchema.extend({ copyClue: z.boolean().optional(), verifyOnType: z.boolean().optional() }), savedAt })`; update the comment above it (feature 047, same reason as `copyClue`: the previous site does not send it). Response schema stays `settingsSchema.partial()`.
- [X] T003 [P] Edit `packages/shared/src/settings/schema.test.ts`: default is `false`; `parseSettings` with the key missing or invalid (`'yes'`) gives `false` without dropping other fields; request without `verifyOnType` is accepted; unknown keys are still dropped.
- [X] T004 [P] Edit `apps/api/src/modules/settings/settings.schemas.ts` (add `verifyOnType: false` to the OpenAPI example) and `apps/api/src/test/settings.int.test.ts` (a `PUT` without `verifyOnType` answers 200 and the next `GET` returns the document without it; a `PUT` with it round-trips). Also fix any fixture/test in `apps/web/src` that builds a full `Settings` object (`npx tsc -p apps/web --noEmit` shows them), such as `src/shared/services/settings-store/settings-store.test.ts` and `src/features/settings/services/settings-sync.test.ts`.

**Checkpoint**: `npm run typecheck` and the shared tests pass.

---

## Phase 3: User Story 1 - Ver o erro assim que a letra é digitada (Priority: P1) 🎯 MVP

**Goal**: with the option on, a wrong letter is marked red on the spot; the setting is switchable in the settings dialog.

**Independent Test**: turn the option on in the settings dialog, type a wrong letter and see the cell marked; type the right one and the mark goes away.

- [X] T005 [US1] Create `apps/web/src/domain/game/wrong-cells.ts`: export pure `withAutoMarks(state: GameState, solution: Solution): GameState['marks']` per data-model.md: for each cell with a solution letter, `cells[r][c] != null`, `!locked[r][c]` and `plainLetter(expected) !== cells[r][c]` set `marks["row,col"] = 'wrong'` on a copy of `state.marks`; empty, locked and draft-only cells are left alone; no React, no I/O (`domain` imports no `shared`, no React).
- [X] T006 [P] [US1] Create `apps/web/src/domain/game/wrong-cells.test.ts`: right letter, wrong letter, empty cell, locked (revealed) cell, accented solution typed without accent counts as right, a letter only in `draft` is not marked, an existing manual `wrong` stays, `state.marks` is not mutated, a block cell is ignored.
- [X] T007 [US1] Edit `apps/web/src/features/settings/components/SettingsDialog/SettingsDialog.tsx`: add a `Row` with `Switch` labelled "Verificar ao digitar" (`checked={settings.verifyOnType}`, `onChange={(next) => updateSettings({ verifyOnType: next })}`) next to "Copiar a dica", with a one-line hint ("Marca a letra errada assim que você digita; não gasta Letra nem Palavra.").
- [X] T008 [P] [US1] Edit `apps/web/src/features/settings/components/SettingsDialog/SettingsDialog.test.tsx`: the switch is off by default, toggling it saves `verifyOnType: true` through the same path as `copyClue`, and the axe check still passes; the dialog switch is reachable in at most 3 actions (open, toggle, close; SC-002).
- [X] T009 [US1] Edit `apps/web/src/features/game/components/GameScreen/GameScreen.tsx`: read `verifyOnType` with `useSettings()`; build `boardState = useMemo(() => verifyOnType && state.mode === 'playing' ? { ...state, marks: withAutoMarks(state, response.solution) } : state, [...])` and pass `boardState` only to `Board` (and whatever else only draws); keep the raw `state` for the reducer, `useGame`, save queues, help snapshot, completion and `wordHasDraft`.
- [X] T010 [US1] Create `apps/web/src/pages/game/VerifyOnType.test.tsx` (use `game-harness`): option off, a wrong letter has no mark; option on, the same letter is marked at once and the right letter clears it; erasing clears it; turning the option on marks letters already typed and turning it off removes only the automatic marks (a mark from manual "Verificar" stays); revealed (locked) cells are never marked; pencil on, a wrong letter in the draft has no mark and after "Confirmar rascunho" it is marked; `Letra`/`Palavra` counters do not change and the save payload is the same as with the option off (SC-003, FR-006).

**Checkpoint**: US1 works with the option set only in the settings dialog. `npm test` green.

---

## Phase 4: User Story 2 - Ligar e desligar nos ajustes e no jogo (Priority: P2)

**Goal**: the "Ajudas" menu replaces `Verificar` and the three draft controls; the in-game switch and the settings switch are the same value.

**Independent Test**: open "Ajudas", turn "Verificar ao digitar" on, see it on in the settings dialog and the dot on the button; use the keyboard only.

- [X] T011 [US2] Create `apps/web/src/shared/components/Menu/Menu.tsx` and `Menu.module.css` per contracts/settings-contract.md: `Menu` (button with `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, props `label`, `buttonContent`, `placement: 'popover' | 'sheet'`), `MenuGroup` (`role="group"` + visible label), `MenuItem` (`role="menuitem"`, `disabled` → `aria-disabled`, focusable, no action; closes the menu after acting), `MenuCheckItem` (`role="menuitemcheckbox"`, `aria-checked`, stays open on toggle). Behaviour: focus goes to the first item on open; ArrowUp/ArrowDown with wrap, Home, End; Enter/Space act; Esc closes and returns focus to the button; Tab closes; pointer down outside closes; every key handled inside the menu calls `stopPropagation` so nothing reaches the board or the document `?` handler. `popover`: anchored below the button, kept inside the window (as `Tooltip` does). `sheet`: `position: fixed`, `left: 0; right: 0; bottom: var(--keyboard-space, 0px)`, items `min-height: 48px`, own scroll. Colours from theme tokens only; buttons never underlined; use `buttonClass`/`Pill` styles for the trigger; `background-color` in hover/pressed styles (`@layer components`).
- [X] T012 [P] [US2] Create `apps/web/src/shared/components/Menu/Menu.test.tsx`: roles and `aria-*` as above; open/close by click, Esc (focus back to the button), outside press and Tab; arrows, Home, End, wrap, disabled item is focusable but does nothing; `menuitem` closes after acting and `menuitemcheckbox` does not; keys inside do not reach a parent `keydown` listener; `sheet` class is applied; axe passes in light and dark (`vitest-axe`, as in other component tests); `readCss('Menu.css')` confirms `min-height: 48px` for the sheet items.
- [X] T013 [US2] Create `apps/web/src/features/game/components/controls/HelpsMenu/HelpsMenu.tsx` and `HelpsMenu.module.css`: props `pencil`, `hasDraft`, `disabled` (paused), `verifyOnType`, `placement`, `onVerify`, `onVerifyOnType`, `onPencil`, `onConfirm`, `onDiscard`. Button content "Ajudas ▾" plus a dot (`aria-hidden` span) shown when `verifyOnType` is on; accessible name "Ajudas" or "Ajudas, verificação automática ligada"; fixed width so the toolbar never changes size. Items: `MenuItem` "Verificar" (disabled when `disabled`); `MenuGroup` "Automática" with `MenuCheckItem` "Verificar ao digitar" (never disabled); `MenuGroup` "Rascunho" with `MenuCheckItem` "Lápis" (disabled when `disabled`), `MenuItem` "Confirmar rascunho" and "Descartar rascunho" (disabled when `disabled || !hasDraft`, FR-010). Keep the `role="status"` live region ("Rascunho confirmado", "Rascunho descartado") outside the menu panel so it survives the close.
- [X] T014 [P] [US2] Create `apps/web/src/features/game/components/controls/HelpsMenu/HelpsMenu.test.tsx`: items and groups present; paused disables Verificar, Lápis, Confirmar and Descartar but not "Verificar ao digitar"; no draft disables Confirmar and Descartar; the dot and accessible name follow `verifyOnType`; each callback fires once; announcements; axe passes in both themes.
- [X] T015 [US2] Edit `apps/web/src/features/game/components/controls/HelpButtons/HelpButtons.tsx`: remove the Verificar `Pill` and `onVerify` (keep `Letra`, `Palavra` and the live region that announces `lastHelp`, including the `verify` text); edit `HelpButtons.test.tsx` and `HelpButtons.module.css` to match. Delete `controls/DraftControls/` (component, CSS and test; its cases move to T014); move the `pencil` pressed style to `HelpsMenu.module.css`, now selected by `[aria-checked='true']` (the pencil is a `menuitemcheckbox`).
- [X] T016 [US2] Edit `GameScreen.tsx`: in `helps`, render `HelpButtons` (without `onVerify`) and `HelpsMenu` (`placement={onScreenKeyboard ? 'sheet' : 'popover'}`, `verifyOnType` from `useSettings()`, `onVerifyOnType={(next) => updateSettings({ verifyOnType: next })}` through the same settings-store function `SettingsDialog` uses so the two controls share one state, `onVerify={() => help('verify')}`, the pencil/confirm/discard dispatches as today). Hide the menu together with the other helps in read-only mode (`readOnly ? null`, as today; spec edge case). Close the menu when a dialog opens (shortcuts, settings, completion) and never open it over one (FR-012): pass an `open`/`onOpenChange` pair or a `closeSignal` to `Menu` if needed.
- [X] T017 [US2] Edit `apps/web/src/pages/game/Draft.test.tsx`, `GamePage.test.tsx` and `GuestGame.test.tsx` (the only unit tests that use the old controls): open "Ajudas" first, then act on the items; add to `VerifyOnType.test.tsx` that the in-game switch and the settings dialog switch show the same value and update each other without reload, that opening the shortcuts dialog (`?`) or the settings dialog closes an open menu, and that with either dialog open the "Ajudas" button does not open the menu.
- [X] T018 [P] [US2] Edit `apps/web/e2e/ajudas-e-retomada.spec.ts`, `botoes.spec.ts`, `fontes.spec.ts` and `rascunho.spec.ts`: open "Ajudas" before using "Verificar", "Lápis", "Confirmar rascunho" and "Descartar rascunho".

**Checkpoint**: US2 works; the toolbar has `Letra`, `Palavra`, `Ajudas`.

---

## Phase 5: User Story 3 - Convivência com limites, rascunho e telas pequenas (Priority: P3)

**Goal**: no layout jump, mobile sheet, paused and read-only behaviour.

**Independent Test**: emulate the on-screen keyboard and see three controls in one line and the menu as a bottom panel; open the menu 10 times without moving the board.

- [X] T019 [US3] Edit `apps/web/e2e/sem-saltos.spec.ts`: after the toolbar change, measure that opening and closing the "Ajudas" menu, turning "Verificar ao digitar" on and off and typing wrong letters with it on move nothing (strip, clue bar, board); add a narrow-viewport case with the on-screen keyboard: `Letra`, `Palavra`, `Ajudas` on one line (same `top`), the panel touches the bottom edge above the keyboard and its items are at least 48 px high.
- [X] T020 [P] [US3] Create `apps/web/e2e/verificacao-automatica.spec.ts`: one flow (settings switch on, wrong letter marked, correct letter clears, in-game switch off, reload keeps the choice on the device; for an account the setting is read back after a reload).
- [X] T021 [P] [US3] Add to `apps/web/src/pages/game/VerifyOnType.test.tsx`: paused game opens the menu, the switch works and closing it does not resume the clock; read-only (completed) game shows no "Ajudas" button and no new marks; with the on-screen keyboard (`useOnScreenKeyboard` mocked) the menu uses the `sheet` placement; keys typed while the menu is open do not change any cell.

**Checkpoint**: all three stories pass.

---

## Phase 6: Polish & cross-cutting

- [X] T022 [P] Edit `docs/data-definitions/DDE-004-configuracoes-usuario.md`: add `verifyOnType` (boolean, default false, may be missing in requests from a previous site) to the `settings` row, same wording style as `copyClue`; edit `docs/entity-relationship-diagrams/ERD-004-*.md` only if it lists the document content.
- [X] T023 [P] Edit `CLAUDE.md`: add a short "Feature 047" paragraph (setting `verifyOnType`, derived marks never stored, `Menu` and `HelpsMenu`, `DraftControls` removed, request key optional like `copyClue`) and add `Verificar ao digitar` to the settings notes if listed.
- [X] T024 Run `npm run format`, `npm run lint` (includes `check:deps`), `npm run typecheck`, `npm test`, `npm run test:int`, `npm run test:e2e -w @cruzadinha/web` and `npm run check:ids`; walk through `quickstart.md`; fix what fails.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2 → US3 → Polish. US1 needs only Phase 2 and is the MVP; US2 reorganises the toolbar and needs Phase 2 (the shared setting); US3 tests need US1 and US2.
- T005 before T006, T009; T009 before T010. T011 before T012, T013; T013 before T014, T016; T015 and T016 together (the toolbar loses `Verificar` and gains the menu in the same change); T017 and T018 after T016.
- `Menu` is generic and `HelpsMenu` only reads settings from `shared`, so no new `check:deps` edge (`features/game` does not import `features/settings` internals).

## Parallel Opportunities

- After T002: T003, T004 together.
- US1: T006 with T008 (different files) after T005 and T007.
- US2: T012 and T014 together after T011/T013; T018 once T016 is done.
- Polish: T022 and T023 together.

## Implementation Strategy

- **MVP**: Phases 1–3 (US1): the option works from the settings dialog with the existing toolbar. Stop and check `quickstart.md` scenario 1.
- **Then**: US2 (menu, one shared state) and US3 (layout proof and edge cases). The three stories can ship in one PR because the toolbar change in US2 is the only visible rework.
- Commits: one per phase group, e.g. `feat(shared): add verifyOnType setting`, `feat(web): mark wrong letters as they are typed`, `feat(web): group the help controls in an Ajudas menu`, `docs: note verifyOnType in DDE-004`.

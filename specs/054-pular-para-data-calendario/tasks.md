---
description: 'Task list for jumping to a date in the calendar'
---

# Tasks: Pular para uma data no calendário

**Input**: Design documents from `/specs/054-pular-para-data-calendario/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included (constitution II). No network; `today` is injected as in `calendar.test.ts`.

**Organization**: Grouped by user story. Web only (`apps/web/src/features/library`, `apps/web/src/pages/library`); no `shared`, API, schema or DDE/ERD change. Paths are from the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (spec.md)

---

## Phase 1: Setup

- [x] T001 Rename the branch to `feat/054-pular-para-data-calendario` (`git branch -m`) so `npm run check:branch` passes. Do it before the first push: renaming a pushed branch with an open PR closes the PR.

---

## Phase 2: Foundational

- [x] T002 Create the pure helper `apps/web/src/features/library/helpers/jump.ts` exporting `type JumpResult = { ok: true; month: YearMonth; date: string } | { ok: false; reason: 'invalid' | 'future' | 'too-old' }`, `resolveJump(input: string, today: string): JumpResult` (rules in order: `parseIsoDate(input)` null → `invalid`; `input > today` → `future`; month of `input` before `firstNavigableMonth(today)` → `too-old`; else `ok`) and `monthOptions(today: string)` returning `{ year, month, value: 'YYYY-MM', label: '<mês> de <ano>' }` from the current month down to `firstNavigableMonth(today)`. First move `MONTH_NAMES` from `components/DayCell/DayCell.tsx` to `helpers/calendar.ts` (exported) and make `DayCell.tsx` and `Calendar.tsx` import it from there, so the helper never imports a component. Also export `periodText(today: string): string` returning `de <mês de ano do primeiro mês navegável> até hoje`, used by the error messages.
- [x] T003 [P] Test the helper in `apps/web/src/features/library/helpers/jump.test.ts`: valid date, today, first day of the first navigable month, 31/02 → `invalid`, malformed text → `invalid`, tomorrow → `future`, day before the first navigable month → `too-old`; `monthOptions` has 13 entries, newest first, labels in pt-BR; `periodText` for a fixed `today`.

**Checkpoint**: rules are tested before any UI.

---

## Phase 3: User Story 1 - Ir direto a um mês (Priority: P1) 🎯 MVP

**Goal**: A month `<select>` in the calendar header changes the shown month at once.

**Independent Test**: Choose a month six months back; the grid and title change; "Anterior"/"Próximo" continue from it; source and filter stay.

- [x] T004 [P] [US1] Create `apps/web/src/features/library/components/JumpToDate/JumpToDate.tsx` and `JumpToDate.module.css` (one folder per component, feature 037): `role="group"` with `aria-label="Ir para uma data"`, a labelled `<select>` ("Mês", value = shown month as `YYYY-MM`, options from `monthOptions`) calling `onJumpMonth(month: YearMonth)`; `flex-wrap` so it fits 360 px; existing tokens only.
- [x] T005 [P] [US1] Test in `apps/web/src/features/library/components/JumpToDate/JumpToDate.test.tsx`: the select shows the shown month, choosing another option calls `onJumpMonth` once with that month, only the 13 navigable months are offered, `vitest-axe` has no violations.
- [x] T006 [US1] Mount `JumpToDate` in `apps/web/src/features/library/components/Calendar/Calendar.tsx` between the month header and the status filter; add props `today: string`, `onJumpMonth`; style row in `Calendar.module.css` without changing the grid.
- [x] T007 [US1] In `apps/web/src/pages/library/LibraryPage.tsx` pass `today` and `onJumpMonth={(m) => setMonth(m)}` (skip when equal to the shown month, via `compareMonths`) to `Calendar`.
- [x] T008 [US1] Extend `apps/web/src/pages/library/LibraryPage.test.tsx`: jumping to an older month shows it, "Anterior"/"Próximo" continue from it and respect their limits, source and status filter survive, the `h2` title (live region) carries the new month (FR-007), reload (remount) opens the current month.

**Checkpoint**: MVP; month jump works alone.

---

## Phase 4: User Story 2 - Ir direto a um dia (Priority: P2)

**Goal**: A date field shows the month of a valid date and focuses the day.

**Independent Test**: Enter a date three months back; the month shows and focus lands on the day link; Enter opens it.

- [x] T009 [US2] Add the labelled `<input type="date">` ("Data", `min` = first day of the first navigable month, `max` = `today`) to `JumpToDate.tsx`; on change, ignore an empty value, otherwise call `resolveJump` and, when `ok`, call `onJumpDate(result.date, result.month)`.
- [x] T010 [US2] Add `data-date={day.date}` to the link/span root in `apps/web/src/features/library/components/DayCell/DayCell.tsx`.
- [x] T011 [US2] In `Calendar.tsx` add props `focusDate: string | null`, `onJumpDate: (date: string, month: YearMonth) => void`, `onFocused`; a `useEffect` on `[focusDate, view.year, view.month]` focuses `a[data-date="<focusDate>"]` inside the section (scrolling it into view) and calls `onFocused()`; a date with no link (dimmed, future, none) gets no focus but is still cleared.
- [x] T012 [US2] In `LibraryPage.tsx` add `focusDate` state; `onJumpDate = (date, month) => { setMonth(month); setFocusDate(date) }` (month comes from `resolveJump`, no extra parser); `onFocused` sets it to `null`. Choosing the already shown month through the select must not move focus.
- [x] T013 [P] [US2] Tests: `JumpToDate.test.tsx` (valid date calls `onJumpDate`, empty value calls nothing), `Calendar.test.tsx` (focus lands on the day link once; a dimmed day gets no focus; nothing opens by itself), `LibraryPage.test.tsx` (full flow, no navigation to `/jogo` or `/dia` happens).

**Checkpoint**: US1 and US2 work together.

---

## Phase 5: User Story 3 - Datas que não servem (Priority: P3)

**Goal**: Invalid, future or too-old dates keep the month and show a short announced message without moving the layout.

**Independent Test**: Enter tomorrow, a date two years back and 31/02; the month stays and the message names the reason and the accepted period.

- [x] T014 [US3] In `JumpToDate.tsx` keep an error state from `resolveJump`; render it in a `<p role="alert">` inside a row with a reserved fixed height (FR-011). Texts, each ending with the accepted period from `periodText` (FR-006): `invalid` "Data inválida. Use uma data <período>."; `future` "Esta data ainda não chegou. Use uma data <período>."; `too-old` "Só há datas <período>." Clear the error on the next valid date, on a month selection and when the field is emptied. Style in `JumpToDate.module.css`.
- [x] T015 [P] [US3] Tests in `JumpToDate.test.tsx`: each reason shows its text with `role="alert"` and never calls the jump handlers; the error clears on correction; the error row has the same height with and without a message (class check via `readCss('JumpToDate.css')`); axe with the error shown.
- [ ] T016 [P] [US3] Add a layout case to `apps/web/e2e/sem-saltos.spec.ts` (or the closest existing e2e spec): showing and clearing the message does not move the grid.

**Checkpoint**: all stories complete.

---

## Phase 6: Polish

- [x] T017 Run `npm run format`, `npm run lint` (includes `check:deps`), `npm run typecheck -w @cruzadinha/web` and `npx vitest run` in `apps/web`; fix findings.
- [ ] T018 Walk through `specs/054-pular-para-data-calendario/quickstart.md` manually, including 360 px width and keyboard-only use.
- [x] T019 Update `CLAUDE.md` "Where things stand" with a Feature 054 line (web only; `JumpToDate`, `resolveJump`, one-shot `focusDate`, month not stored). Do not edit `CHANGELOG.md` or versions by hand.

---

## Dependencies

- T001 before the first push. T002 blocks T003, T004, T006 and T014. T004 blocks T006; T006 blocks T007.
- US2 builds on US1's component and page wiring (T009 edits the file from T004). US3 builds on T009 (it needs `resolveJump` wired in the component).
- Polish last.

## Parallel opportunities

- T003 with T002's consumers once the signatures exist; T004 with T005; T013, T015, T016 are separate test files.

## Implementation strategy

MVP is US1 (T001–T008): month `<select>` alone already removes the month-by-month walk. Then US2 (date + focus), then US3 (errors). Ship each as a green step.

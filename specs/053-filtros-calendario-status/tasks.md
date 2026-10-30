---
description: 'Task list for calendar status filters'
---

# Tasks: Filtros no calendário por status

**Input**: Design documents from `/specs/053-filtros-calendario-status/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included (constitution II). No network; `today` is injected as in `calendar.test.ts`.

**Organization**: Grouped by user story. Web only (`apps/web/src/features/library`, `apps/web/src/pages/library`); no `shared`, API, schema or DDE/ERD change. Paths are from the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (spec.md)

---

## Phase 1: Setup

- [x] T001 Rename the branch to `feat/053-filtros-calendario-status` (`git branch -m`) so `npm run check:branch` passes. Do it before the first push: renaming a pushed branch with an open PR closes the PR.

---

## Phase 2: Foundational

- [x] T002 Create the pure helper `apps/web/src/features/library/helpers/status-filter.ts` exporting `type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed'`, `matchesFilter(state: DayState, filter: StatusFilter): boolean` (`all` → always `true`; otherwise `state.kind === filter`) and `countByFilter(days: readonly CalendarDay[]): Record<StatusFilter, number>` (counts only `completed`, `in_progress`, `not_started`; `all` is their sum; `fetchable`, `none` and `future` are never counted).
- [x] T003 [P] Test the helper in `apps/web/src/features/library/helpers/status-filter.test.ts`: each filter against every `DayState` kind, `all` keeps `fetchable`/`none`/`future` active, counts for a mixed month, zero counts.

**Checkpoint**: rules and counts are tested before any UI.

---

## Phase 3: User Story 1 - Ver só os dias de um status (Priority: P1) 🎯 MVP

**Goal**: Filter bar above the grid; days outside the chosen status are dimmed and inoperable.

**Independent Test**: open a month with completed, in-progress and not-started days, choose "Em andamento": only those days stay links; "Todas" restores everything.

- [x] T004 [P] [US1] Create `apps/web/src/features/library/components/StatusFilter/StatusFilter.tsx` and `StatusFilter.module.css`: `role="group"` with `aria-label="Filtrar por status"`, four `Pill` buttons ("Todas", "Não iniciadas", "Em andamento", "Concluídas") with `aria-pressed`, props `value`, `onChange`. Fixed height so toggling shifts nothing.
- [x] T005 [P] [US1] Test it in `apps/web/src/features/library/components/StatusFilter/StatusFilter.test.tsx`: "Todas" pressed by default, click calls `onChange`, keyboard activation, `vitest-axe` clean.
- [x] T006 [US1] Edit `apps/web/src/features/library/components/DayCell/DayCell.tsx` to take `filter: StatusFilter`; when `!matchesFilter(day.state, filter)` render the existing non-link `<span role="img">` path with a `dimmed` class and `aria-label` ending in ", fora do filtro" (never opacity; no focus stop). With `all` the output stays identical to today (SC-004).
- [x] T007 [US1] Add the `.dimmed` style (transparent background, `--mute` colour, same border treatment as `.future`, `font-weight: 400`) to `apps/web/src/features/library/components/Calendar/Calendar.module.css`.
- [x] T008 [US1] Extend `apps/web/src/features/library/components/DayCell/DayCell.test.tsx`: dimmed day is not a link, is not focusable (no `tabindex`, absent from the tab order) and its label contains "fora do filtro"; matching day stays a link; `all` renders as before; axe clean.
- [x] T009 [US1] Edit `apps/web/src/features/library/components/Calendar/Calendar.tsx`: add props `filter` and `onFilterChange`, render `StatusFilter` between the month header and the table, pass `filter` to each `DayCell`.
- [x] T010 [US1] Edit `apps/web/src/pages/library/LibraryPage.tsx`: `const [filter, setFilter] = useState<StatusFilter>('all')` and pass `filter`/`onFilterChange` to `Calendar`. Export `StatusFilter` type from `apps/web/src/features/library/index.ts`.
- [x] T011 [US1] Extend `apps/web/src/pages/library/LibraryPage.test.tsx`: choosing "Concluídas" leaves only completed days as links; "Todas" restores all; filters are absent for a refused source and during loading/error (they live inside `Calendar`).

**Checkpoint**: US1 works alone as the MVP.

---

## Phase 4: User Story 2 - Saber quantos dias há em cada status (Priority: P2)

**Goal**: Counts on each filter and a message when the chosen filter has no days.

**Independent Test**: month with 3 in-progress days shows "Em andamento (3)"; changing month updates counts; an empty filter shows the message.

- [x] T012 [US2] Add an optional `counts: Record<StatusFilter, number>` prop to `StatusFilter.tsx` so labels read "Concluídas (12)"; update `StatusFilter.test.tsx` for the labels.
- [x] T013 [US2] In `Calendar.tsx` compute `countByFilter(view.days)` and pass it down. Render one `<p role="status">` in a slot of reserved height (`min-height` in `Calendar.module.css`; grid never hidden, nothing shifts): empty when `filter === 'all'`; "N dias <status>" (singular "1 dia") when the count is above 0; "Nenhum dia neste mês com esse status." when the count is 0. This is the screen-reader announcement of a filter change (FR-008); the message never appears with "Todas" (FR-007). "Todas" counts only stored puzzles; `fetchable` days stay clickable but are not counted (FR-005).
- [x] T014 [US2] Extend `LibraryPage.test.tsx`: counts match the highlighted days (SC-003), change on month navigation, the status region announces "N dias …" and the empty message, and shows nothing with "Todas".

---

## Phase 5: User Story 3 - Filtro vale por fonte e some ao sair (Priority: P3)

**Goal**: Filter stays when month or source changes and resets when the page is reopened.

**Independent Test**: choose "Concluídas", switch source: still marked and applied; remount the page: "Todas".

- [x] T015 [US3] Extend `LibraryPage.test.tsx`: filter stays pressed after changing month and source and applies to the new source's days; a fresh render starts at "Todas". Fix `LibraryPage.tsx` only if a test fails (the `useState` in T010 should already satisfy it).

---

## Phase 6: Polish & Cross-Cutting

- [x] T016 [P] Guard against layout shift with a CSS test (using `readCss('Calendar.css')` from `apps/web/src/test/css-file.ts`) in `apps/web/src/features/library/components/Calendar/Calendar.test.tsx`: the status region and the filter bar have a fixed `min-height`. No e2e needed: jsdom has no layout, and the reserved slot is the whole mechanism.
- [x] T017 Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run format:check` from the root; fix findings (including `check:deps`).
- [ ] T018 Walk through `specs/053-filtros-calendario-status/quickstart.md` manually, keyboard only included.

---

## Dependencies & Order

- T001 → T002 → T003 (T003 parallel with nothing else touching the helper).
- US1 needs Phase 2. Inside US1: T004/T005 parallel; T006 → T007 → T008; T009 needs T004, T006; T010 needs T009; T011 last.
- US2 needs US1 (T012 → T013 → T014). US3 needs US1 only (T015), independent of US2.
- Polish after all stories.

## Parallel example

After T003: T004 (StatusFilter component) and T006 (DayCell) touch different files and can run together; T005 runs beside T006.

## Implementation strategy

MVP = Phases 1–3 (filter that dims days). Then add counts and the empty message (US2), then lock the persistence behaviour with tests (US3).

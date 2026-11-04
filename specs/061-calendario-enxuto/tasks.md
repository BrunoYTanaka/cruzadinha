# Tasks: Calendário mais enxuto

**Input**: `specs/061-calendario-enxuto/` (spec.md, plan.md, research.md, contracts/ui-contract.md, quickstart.md). Web only: no `shared`, API, schema or contract change. Tests are part of each task (project rule: every component has its own test). Run `npm run typecheck && npm run lint` and `cd apps/web && npx vitest run src/features/library src/pages/library` after each phase.

## Phase 1: US1 – remove "Hoje" (P1)

**Goal**: `/calendario` has no "Hoje" section and keeps exactly one `h1` ("Escolha um dia", visually hidden).
**Independent test**: open `/calendario`: no cards, tabs then grid, today opens from the grid, one `h1`.

- [x] T001 [US1] In `apps/web/src/pages/library/LibraryPage.tsx` remove `TodayCards` (and its import and the comment about "cartões de hoje aparecem sempre") and render a `<h1>` with `VisuallyHidden` "Escolha um dia" as the first child of the page `div`; keep `LoadingState level={1}` in `LibraryPage` as is
- [x] T002 [US1] Delete `apps/web/src/features/library/components/TodayCards/` (tsx, css, test) and drop only the `TodayCards` export from `apps/web/src/features/library/index.ts`; `helpers/today-cards.ts` and its test stay whole (`todayCard`/`TodayCard` serve `pages/library/direct-play.ts`, `otherSourceShortcut` serves `GameScreen`, `completedInMonth`/`completedLabel` serve the tabs); confirm with `grep -rn TodayCards apps/web/src` that nothing is left and run `npm run check:deps`
- [x] T003 [US1] Update `apps/web/src/pages/library/LibraryPage.test.tsx` (and `direct-play.test.ts` if it reads the cards): remove expectations of the "Hoje" section and cards, assert no `heading` "Hoje", one `heading` level 1 "Escolha um dia", that the day of today in the grid is a link to `/dia/<today>?fonte=<source>`, and (FR-015) that the open tab is the default source on arrival and the game's source when coming back from a game
- [x] T004 [US1] Add `todayLink(page)` (the `a[data-date="${brasiliaToday()}"]` link in the grid) and `openSourceToday(page, source)` (picks the tab, then clicks it) to `apps/web/e2e/support.ts`, reusing the existing `brasiliaToday` and replace every `page.getByRole('link', { name: /^O Globo: / }).click()` that opened today's game in `apps/web/e2e/{verificacao-automatica,ajudas-e-retomada,sem-saltos,offline,rascunho,configuracoes,fluxo-principal,copiar-dica,importar-progresso,imprimir,atalhos}.spec.ts` with it; replace `heading level 1 name 'Hoje'` with `'Escolha um dia'` in `{espera-servidor,clube,erros-com-titulo,offline,configuracoes,fluxo-principal,landing,espera-sessao,conta,visitante}.spec.ts`; rewrite or drop the two asserts that read card-only text (`configuracoes.spec.ts` "a cruzada de hoje já foi concluída", `clube.spec.ts` `/^O Globo: não iniciada/` → check the day's label in the grid); keep `admin.spec.ts` `Cruzada Online` count 0 meaningful by asserting on the source tab instead of the card

**Checkpoint**: US1 shippable alone (the date filter is still under the month title).

## Phase 2: US2 – date filter behind an icon (P1)

**Goal**: filter hidden behind a 46 px icon button at the right end of the tabs row; floating panel; same rules as feature 054.
**Independent test**: open panel, choose month and date, close by icon, `Esc` (focus back on the button) and outside press; open/close moves nothing.

- [x] T005 [US2] Rewrite `apps/web/src/features/library/components/JumpToDate/JumpToDate.tsx` as a disclosure per research.md R2 and contracts/ui-contract.md: `button` (`type="button"`, `aria-label="Ir para uma data"`, `buttonClass` icon variant (inherits hover/active/disabled states, so `button-states.test.ts` needs no new entry), `aria-expanded`, `aria-controls` only when open, no `aria-haspopup`, 46 × 46 px, 24 px calendar svg icon with `aria-hidden`) plus the panel (`role="group"` `aria-label="Ir para uma data"`, `position: absolute` under the button aligned to its right edge, `min-width: 300px` limited to the window, fields `min-height: 44px`, same month `<select>`, `<input type="date">` and fixed-height `role="alert"` error); `resolveJump`, `monthOptions`, `periodText` and messages unchanged; open moves focus to the month select; close on button, `Escape` (`stopPropagation`, focus to the button) and `pointerdown` outside (document listener only while open); `Tab` moves through the fields and out of the panel without closing it; closing clears the error message (FR-016); clamp to the window with `clampShift` as `Menu` does; update `JumpToDate.module.css`
- [x] T006 [US2] Update `JumpToDate.test.tsx`: closed by default and fields not in the DOM; opens on click with `aria-expanded="true"`; an error message is gone after close and reopen (FR-016); `Tab` out of the panel keeps it open; closes by button, `Esc` (focus on the button, event does not reach a parent `keydown`) and outside `pointerdown`, not on a press inside; month change, valid date, future, too old and invalid date behave as feature 054 (callbacks and messages); `vitest-axe` closed and open
- [x] T007 [US2] Create `apps/web/src/features/library/components/SourceBar/` (`SourceBar.tsx`, `.module.css`, `SourceBar.test.tsx`): flex row with `SourceTabs` (`flex: 1`) and `JumpToDate` at the right end; props = `SourceTabs` props plus `today`, `month`, `onJumpMonth`, `onJumpDate`; the bottom border moves here from `SourceTabs.module.css` (remove it there; the row uses `align-items: flex-end` so the selected tab's `margin-bottom: -1px` still covers the border and merges with the surface); the icon slot always reserves 46 px; on narrow screens (≤ 599 px) tabs keep dividing the row and the icon stays in the same row; test renders tabs and button, tab keys still work, axe
- [x] T008 [US2] In `apps/web/src/features/library/components/Calendar/Calendar.tsx` remove `JumpToDate` and the props `today`, `onJumpMonth`, `onJumpDate` (keep `focusDate`, `onFocused`); update `Calendar.test.tsx` (focus on the day link still works, jump tests move to `JumpToDate`/`SourceBar`); export `SourceBar` from `features/library/index.ts` (keep the `SourceTabs` export until T009 and T011 are done, then remove it if `grep -rn SourceTabs apps/web/src` shows no importer outside the feature)
- [x] T009 [US2] In `apps/web/src/pages/library/LibraryPage.tsx` replace `SourceTabs` with `SourceBar` passing `today`, `month`, `onJumpMonth` (the `compareMonths` guard moves here) and `onJumpDate` (set month and `focusDate`), and drop those props from the `<Calendar>` call; update `LibraryPage.test.tsx` (the filter is not visible until the icon is pressed; picking a date focuses the day link; still works while the library is loading or failed)
- [x] T010 [US2] Update `apps/web/e2e/sem-saltos.spec.ts` with a calendar case: boxes of tabs row, grid and legend before and after opening and closing the panel are equal (0 px shift), the panel overlays the grid and stays inside the viewport at 360 px and at desktop width; add an e2e case that opens the panel, picks a past date and sees the grid focus its day (no existing e2e covers the filter, so none needs fixing)

**Checkpoint**: calendar page done. SC-001 (grid starts higher) and SC-003 are checked by eye in T013.

## Phase 3: US3 – same icon in the x1 day picker (P2)

**Goal**: `DayPicker` uses the same bar and panel.
**Independent test**: in `/x1/novo` the icon is at the right of the tabs, a valid date shows the month and focuses the day, nothing is picked by itself.

- [x] T011 [US3] In `apps/web/src/features/library/components/DayPicker/DayPicker.tsx` replace `SourceTabs` with `SourceBar` (same props as T009, `onJumpDate` sets month and `focusDate`) and stop passing the jump props to `Calendar`; extend `DayPicker.test.tsx`: no "Hoje", icon present, valid date shows the month and focuses the day link/button, `onSelect` is not called until the person picks; check `apps/web/e2e` x1 specs that open the day picker still pass

## Phase 4: Polish

- [x] T012 [P] Update the feature notes: add a "Feature 061" line to `CLAUDE.md` (calendar without "Hoje", hidden `h1` "Escolha um dia", `SourceBar`, disclosure `JumpToDate`, e2e `openToday`) and mention in the Feature 054 line that the filter now sits behind the icon; run `npm run format` on the touched files
- [x] T013 Run `npm run format:check && npm run lint && npm run typecheck && npm test`, then `npm run test:e2e -w @cruzadinha/web` per quickstart.md, and walk the manual checklist (desktop and 360 px, light and dark theme)

## Dependencies

T001 → T002 → T003; T004 after T001 (needs the page without cards). US2 starts after US1 (shares `LibraryPage.tsx`): T005 → T006; T007 needs T005; T008 and T009 need T007; T010 needs T009. US3 (T011) needs T007 and T008. T012 and T013 last.

## Parallel opportunities

T003 and T004 touch different files and can run together after T002. T005/T006 and the CSS of T007 can start together if `JumpToDate` props are fixed first. T012 can run beside T013's manual part.

## Implementation strategy

MVP is Phase 1 alone (removes "Hoje", keeps the filter where it is). Then Phase 2 and Phase 3. Run the e2e suite at the end of Phase 1 and Phase 2: they are the widest regression risk.

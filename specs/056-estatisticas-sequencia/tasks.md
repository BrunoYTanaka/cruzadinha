# Tasks: Estatísticas e sequência de dias

**Input**: specs/056-estatisticas-sequencia/ (plan, spec, data-model, contracts/stats.md)

## Phase 1: Foundational (regra pura em `shared`)

- [x] T001 Create `packages/shared/src/stats/schema.ts`: `statsSchema` (`streak {current, longest}`, `total`, `averageMs` int|null, `bySource[{source,total,averageMs,bestMs}]`) and types; export from `packages/shared/src/index.ts`
- [x] T002 Create `packages/shared/src/stats/compute-stats.ts`: pure `computeStats(rows, now)` per data-model.md (day = `completedAt` in `America/Sao_Paulo`; current streak starts today or yesterday; `bySource` has every `puzzleSourceIdSchema.options` source; best from `bestMs` of any row, total/average only from `completed` rows) plus `compute-stats.test.ts` (consecutive days, gap, same-day duplicates, today empty/yesterday full, midnight Brasília, reset keeps best, empty → zeros and null)

## Phase 2: US1 + US2 – conta (P1, P2)

**Independent test**: conta com conclusões em duas fontes mostra sequência, total, média e recorde por fonte.

- [x] T003 [US1] Create `apps/api/src/modules/stats/stats.repository.ts`: select `puzzles.source, progress.status, finishedMs, completedAt, bestMs` from `progress` join `puzzles` where `user_id` (never `cells`)
- [x] T004 [US1] Create `apps/api/src/modules/stats/stats.service.ts` (`createStatsService({db, clock})` → `computeStats`) and `stats.service.test.ts`
- [x] T005 [US1] Create `stats.schemas.ts` (tag `stats`, `security` with session, 200/401) and `stats.routes.ts` (`GET /api/stats`, required session preHandler as in `progress` routes); register in `apps/api/src/app.ts`
- [x] T006 [US1] Add `apps/api/src/test/stats.int.test.ts`: two accounts never see each other's rows; response has no `cells`
- [x] T007 [US1] Web: add `apps/web/src/features/stats/` (`services/stats-api` using the shared API client + `statsSchema`, `hooks/useStats`, `components/StatsView` with sequence, total, average, per-source table, empty state, `formatDuration` helper) with tests and `index.ts` exporting `StatsView`/`useStats`
- [x] T008 [US1] Create `apps/web/src/pages/stats/StatsPage.tsx` (one `h1`, `RequiresConnection`-style error with retry); route `/estatisticas` in `apps/web/src/app/router.tsx` (inside the serverReady group); link "Estatísticas" in `apps/web/src/app/HeaderStart.tsx` with test updates in `AppLayout.test.tsx`
- [x] T009 [US1] Update `apps/web/src/app/router.test.tsx`: route renders; 404 from API shows "indisponível"

## Phase 3: US3 – visitante (P3)

**Independent test**: visitante concluiu 1 cruzada → total 1 e aviso; conta nunca mostra esses números.

- [x] T010 [US3] Add to `features/guest` public `index.ts` a `listGuestProgressRows()` mapping IndexedDB records (status, finishedMs, completedAt, bestMs, source) to the `computeStats` input; test with `fake-indexeddb`
- [x] T011 [US3] `useStats` uses guest rows when there is no session (aviso "valem só neste aparelho" in `StatsView`); add `features/stats` to the order in `.dependency-cruiser.cjs` after `guest`; tests: guest sees own data, account does not see guest data

## Phase 4: Polish

- [x] T012 [P] Axe test for `StatsView` (light/dark) and layout stability (no shift) check
- [x] T013 [P] Update `CLAUDE.md` with a Feature 056 entry; `docs` unaffected (no schema change)
- [x] T014 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int`, `npm run build`

## Dependencies

T001–T002 → T003–T006 (API) and T007–T009 (web, needs T005 for the contract) → T010–T011 → T012–T014. MVP = Phase 1 + 2.

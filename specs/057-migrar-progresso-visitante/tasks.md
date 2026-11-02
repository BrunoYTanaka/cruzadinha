# Tasks: Migrar progresso de visitante para a conta

**Input**: specs/057-migrar-progresso-visitante/ (plan, spec, research, data-model, contracts/import.md, quickstart)

**Tests**: obrigatórios (constituição II e VII). Escreva o teste antes do código de cada tarefa quando for regra pura.

## Phase 1: Foundational (contrato e regra pura)

- [x] T001 Add to `packages/shared/src/progress/schema.ts` `importItemSchema` (strict: `puzzleId` uuid, `cells` via `progressCellsSchema`, `elapsedMs` int 0..604800000, `status`, `savedAt` ISO with offset, `completedAt`, `finishedMs`, `bestMs`, `bestAt`; `superRefine`: `completed` ⇒ `completedAt` and `finishedMs` not null, `in_progress` ⇒ both null, `bestMs` and `bestAt` both null or both set), `importProgressRequestSchema` (strict `{ items }`, "1 a 100" items, unique `puzzleId`), `importProgressResponseSchema` (tolerant: `results[{puzzleId, result: imported|kept|rejected, reason?: puzzle-unavailable|invalid-input}]`, `imported`, `kept`, `rejected`); export from `packages/shared/src/index.ts`; extend `schema.test.ts` (extra key `help`/`userId` refused, 101 items refused, duplicate id refused, incoherent status refused)
- [x] T002 Add pure `decideImport(current, incoming, now)` next to `decideSave` in `apps/api/src/modules/progress/progress.service.ts` per research.md Decision 3 (`savedAtTooFar` ⇒ `rejected`; conta `completed` ⇒ `kept`; `incoming.savedAt <= current.savedAt` ⇒ `kept`; else `imported` with record = lower `bestMs` of both and its `bestAt`) and cover it in `progress.service.test.ts` (new row from `ensureRow` epoch, older/newer/equal `savedAt`, completed account, completed incoming over older in-progress keeps best, future `savedAt`)

## Phase 2: US1 + US2 – importar com regra de conflito (P1)

**Independent test**: conta com progresso novo, antigo e concluído na mesma cruzada recebe a importação e cada caso dá o resultado da spec.

- [x] T003 [US1] Add `import()` to the `ProgressService` type and `createProgressService` in `apps/api/src/modules/progress/progress.service.ts`: one `admit` (`PROGRESS_SAVE`) per request, then for each item `findPuzzleGridById` (missing ⇒ `rejected`/`puzzle-unavailable`), `cellsMatchGrid` (fail ⇒ `rejected`/`invalid-input`), and one transaction per item with `ensureRow` → `lockRow` → `decideImport` → `updateProgress`; return counts and `results` in input order; log only field names, never letters
- [x] T004 [US1] Add `importProgressSchema` (tag `progress`, `security`, 200/400/401/429) in `apps/api/src/modules/progress/progress.schemas.ts` and `POST /api/progress/import` in `progress.routes.ts` (register before `/api/progress/:puzzleId`; `requireSession`, user only from `request.user`, 400 `invalid-input` with first-level field names, 429 via `sendTooManyAttempts`); add the route to the list in `apps/api/src/platform/docs/docs.test.ts`
- [x] T005 [US2] Add `apps/api/src/test/progress-import.int.test.ts`: account with newer/older/completed progress on same puzzle, new puzzle, mixed batch with an unknown puzzle and a bad grid (others still imported), same body twice (second all `kept`, no row changed), 401 without session, 400 for 101 items, 429 after the limit, one account never touches another's rows
- [x] T006 [US1] Add `importProgress(items)` to the single API client in `apps/web/src/shared/services/api/` (own folder with test, Zod-validated with `importProgressResponseSchema`, a 429 reads `Retry-After`) and export it as the other calls are
- [x] T007 [US1] Add `removeIfUnchanged(puzzleId, savedAt)` to `GuestStore` in `apps/web/src/features/guest/services/guest-store.ts` (deletes IndexedDB and memory record only if the stored `savedAt` equals the argument; returns boolean; notifies subscribers) with tests in `guest-store.test.ts` (match deletes, newer save kept, missing is false)
- [x] T008 [US1] Add `'import'` to `FEATURE_ORDER` in `.dependency-cruiser.cjs` between `offline` and `library` (it imports `session`, `guest` and `offline`) and run `npm run check:deps`
- [x] T009 [US1] Create `apps/web/src/features/import/` (`index.ts` exports only `ImportOffer`): `helpers/summarize.ts` (`summarizeGuest(records)` ⇒ total/completed/in-progress) and `helpers/to-import-item.ts` (record ⇒ `importItemSchema` shape, no `help`, no `game`, no `v`), each with tests
- [x] T010 [US1] Create `features/import/services/run-import.ts`: reads `guestStore.getAll()`, sends batches of 100 through `importProgress` (waits `Retry-After` on 429, stops on 401), then for every `imported` or `kept` result calls `guestStore.removeIfUnchanged(puzzleId, sentSavedAt)` and removes `cruzadinha:draft:guest:<puzzleId>`; returns `{ imported, kept, rejected }`; leaves local data untouched on any thrown error; test with `http` helper and `fake-indexeddb` (success, partial reject keeps rejected, network error keeps all, record changed during send is kept (FR-012), 1.464 items go in 15 batches of at most 100 (SC-004))
- [x] T011 [US1] Create `features/import/components/ImportOffer/ImportOffer.tsx` (+ `.module.css`, test with `vitest-axe`): shows only for an account (`useViewer`) with local guest progress and not postponed; `Dialog` with summary and "Importar", progress state, success message with counts (US2 scenario 6), error with "Tentar de novo"; mount it in `apps/web/src/app/AppLayout.tsx` beside `PendingOwnerNotice`; invalidate library/progress queries after success
- [x] T012 [US1] Test in `ImportOffer.test.tsx`: no offer without guest records; no offer for a guest viewer; offer after login; confirm sends and clears; after success the dialog does not return; after "Agora não" and sign-out the guest record is untouched (US3 scenario 3); dialog and keyboard focus do not block the board (FR-015)

## Phase 3: US3 – recusar ou adiar (P2)

**Independent test**: "Agora não" mantém tudo e a oferta volta na próxima carga; descartar pede confirmação e só então apaga.

- [x] T013 [US3] In `ImportOffer.tsx` add "Agora não" (module variable `postponed`, reset on page load; nothing touched) and "Descartar" opening a second step in the same `Dialog` (never a second dialog) with the loss warning and "Descartar mesmo assim" / "Voltar"; discard calls `guestStore.removeIfUnchanged` for every record and removes the guest drafts; tests for both paths, `Esc` goes back, focus moves to the first button of each step

## Phase 4: US4 – falha sem perder nada (P2)

**Independent test**: falha de rede na confirmação deixa o IndexedDB intacto e "Tentar de novo" conclui.

- [x] T014 [US4] Cover in `run-import.test.ts` and `ImportOffer.test.tsx`: network failure, 401 mid-way (viewer becomes guest, nothing deleted), 429 retry, retry after a lost response yields `kept` and then clears; session ending closes the offer without deleting

## Phase 5: Polish

- [x] T015 Add `apps/web/e2e/importar-progresso.spec.ts`: guest plays and completes one puzzle and leaves another in progress, logs in, imports, sees both in the calendar and an empty `cruzadinha-visitante`; second scenario "Agora não" then reload shows the offer again; `e2e/sem-saltos.spec.ts` untouched
- [x] T016 Update `CLAUDE.md` with a "Feature 057" bullet (endpoint, `decideImport`, `features/import` order, local cleanup rule, helps not imported) and `docs/` API doc if it lists routes; no DDE/ERD change (no schema change)
- [x] T017 Run `npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:int` and fix findings

## Dependencies

T001 → T002 → T003 → T004 → T005. T006 needs T001. T007 and T008 are independent of the API tasks ([P] with T003–T005 in practice). T009 needs T001; T010 needs T006, T007, T009; T011 needs T010; T012 after T011. T013 after T011. T014 after T010/T011. T015–T017 last.

## Implementation strategy

MVP = Phase 1 + Phase 2 (US1 + US2): importação funcional com a regra de conflito. Phases 3 e 4 reforçam controle e segurança dos dados; T014 testa o que T010 já garante, então pode ser feito junto com T010.

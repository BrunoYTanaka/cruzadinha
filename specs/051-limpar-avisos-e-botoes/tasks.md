---
description: "Task list for fewer notices and buttons on the calendar and the game"
---

# Tasks: Menos avisos e botões no calendário e no jogo

**Input**: Design documents from `/specs/051-limpar-avisos-e-botoes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included: the tests that covered the removed behaviour are changed in the same task as the code. No new network use.

**Organization**: Grouped by user story. Web only (`apps/web`); no `shared`, API, schema or DDE/ERD change. Paths are from the repository root. The code of US1 to US3 was written before this list (marked done); the open tasks are the checks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 to US3 (spec.md)

---

## Phase 1: Setup

- [X] T001 Create the branch `feat/051-limpar-avisos-e-botoes` and the spec, plan, research, data-model and quickstart in `specs/051-limpar-avisos-e-botoes/`.

---

## Phase 2: User Story 1 - Visitante sem faixa de aviso (Priority: P1) 🎯 MVP

**Goal**: the visitor never sees "Há progresso esperando você entrar."; the queue and the discard notice for accounts stay.

**Independent Test**: with an account's saves waiting in `localStorage`, open `/`, `/calendario` and a game as a guest: no strip; after logging in the saves are sent.

- [X] T002 [US1] Edit `apps/web/src/features/offline/components/PendingOwnerNotice/PendingOwnerNotice.tsx`: remove the `guest && hasAnyOutbox()` branch, the `useNavigate` use and the `loginPath` prop; keep the discard notice (`discarded && !guest`) with its "Fechar" button.
- [X] T003 [US1] Edit `apps/web/src/app/AppLayout.tsx`: render `<PendingOwnerNotice guest={session.data === null} />` without `loginPath`.
- [X] T004 [US1] Edit `apps/web/src/features/offline/components/PendingOwnerNotice/PendingOwnerNotice.test.tsx`: the guest with a pending save sees no `status`; drop the `loginPath` prop and the unused import; keep the discard test.
- [X] T005 [P] [US1] Edit `apps/web/src/app/AppLayout.test.tsx`: the guest does not see "Há progresso esperando você entrar.", nothing is sent and the outbox item stays (sending after login stays covered by the `drainOutboxes` tests in `features/offline`, SC-002).

**Checkpoint**: US1 works alone.

---

## Phase 3: User Story 2 - Botão "Ajudas" sem espaço sobrando (Priority: P2)

**Goal**: "Ajudas" keeps the pill look of "Letra" and "Palavra" with its text centered; the automatic-verification dot sits in the corner and moves nothing.

**Independent Test**: open a game, compare the three buttons, toggle "Verificar ao digitar": nothing moves.

- [X] T006 [US2] Edit `apps/web/src/shared/components/Menu/Menu.module.css`: `.button` gets `position: relative` and keeps its pill look (`padding: 0 16px`, `border-radius: 999px`, `font-size: 14px`, `font-weight: 700`), the same as `Pill` in `shared/components/Pill/Pill.module.css`.
- [X] T007 [US2] Edit `apps/web/src/features/game/components/controls/HelpsMenu/HelpsMenu.module.css`: `.dot` is `position: absolute` at `top: 6px; right: 6px` with no margin or reserved width; update its comment.

**Checkpoint**: US2 works alone.

---

## Phase 4: User Story 3 - Calendário sem o botão de baixar (Priority: P2)

**Goal**: no "Baixar as cruzadas de hoje" or "Guardadas: N"; opened puzzles still open offline and keep "Disponível sem rede".

**Independent Test**: `/calendario` has no download button; open a puzzle online, go offline, reload: it opens.

- [X] T008 [US3] Edit `apps/web/src/features/library/components/TodayCards/TodayCards.tsx`: remove `DownloadToday`, `DownloadResult` and their imports (`useState`, `puzzleSourceNames`, `useOnline`, `downloadToday`, `DownloadSummary`); keep `Button` and `useOfflinePuzzleIds`.
- [X] T009 [P] [US3] Edit `apps/web/src/features/library/components/TodayCards/TodayCards.test.tsx`: remove the two download tests and the unused `jsonResponse`/`mockApi` import; keep "Disponível sem rede".
- [X] T010 [P] [US3] Edit `apps/web/e2e/offline.spec.ts`: replace the download test with "uma cruzada já aberta abre de novo sem rede" (open the O Globo card online, go offline, reload, the grid shows).

**Checkpoint**: all stories work.

---

## Phase 5: Polish & Cross-Cutting

- [X] T011 Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run format:check` from the root; all pass.
- [X] T012 Run `npm run test:e2e -w @cruzadinha/web` for `offline.spec.ts` and `sem-saltos.spec.ts` (needs API and local Postgres; see CLAUDE.md); the rewritten offline test and the "Ajudas" no-shift test pass.
- [ ] T013 Walk through `specs/051-limpar-avisos-e-botoes/quickstart.md` in the browser, light and dark theme.
- [X] T014 [P] Add the note "Substituída pela feature 051" to `specs/041-pwa-modo-offline/spec.md` (User Story 4, FR-014, SC-006 and the guest notice in FR-011) and to the two rows in `specs/041-pwa-modo-offline/contracts/site-offline.md` (guest notice, download of today).
- [X] T016 [P] Update `CLAUDE.md`: in the feature 041 paragraph, state that the guest strip "Há progresso esperando você entrar" and `DownloadToday` are gone (feature 051), add a short feature 051 line; `downloadToday` and `hasAnyOutbox` stay exported without UI.
- [X] T015 Commit in Conventional Commits (English, no AI trailer per CLAUDE.md): `fix(web)` for the notice, button style and download button, `docs(specs)` for the spec.

---

## Dependencies & Execution Order

- Phase 1 first; US1, US2 and US3 are independent and touch different files (inside US1, T002 comes before T003 and T004 because of the prop).
- Phase 5 after all stories; T012 needs the API and Postgres running.

## Parallel Opportunities

- US1, US2 and US3 can run in parallel; inside US1, T004 and T005 (after T002 and T003); inside US3, T009 and T010.

## Implementation Strategy

- MVP is US1 (the notice that gets in the way). US2 and US3 are small and can ship together in the same PR.

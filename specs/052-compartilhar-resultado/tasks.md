---
description: 'Task list for sharing the result without spoilers'
---

# Tasks: Compartilhar o resultado sem spoiler

**Input**: Design documents from `/specs/052-compartilhar-resultado/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included (constitution II). `navigator.clipboard` and `navigator.share` are simulated; no network.

**Organization**: Grouped by user story (US3 added after the first delivery: image card). Web only (`apps/web/src/features/game`); no `shared`, API, schema or DDE/ERD change. Paths are from the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 and US2 (spec.md)

---

## Phase 1: Setup

- [x] T001 Rename the branch to `feat/052-compartilhar-resultado` (`git branch -m`) so `npm run check:branch` passes. Do it before the first push: renaming a pushed branch with an open PR closes the PR.

---

## Phase 2: User Story 1 - Copiar o resultado ao concluir (Priority: P1) 🎯 MVP

**Goal**: the completion dialog has "Compartilhar resultado"; one tap copies `Cruzadinha · <Fonte> · <dd/mm/aaaa>` and `Concluí em <mm:ss>`, with no letters, clues or grid shape.

**Independent Test**: complete a puzzle (guest too), tap the button, paste: source, date and time are there and nothing else.

- [x] T002 [P] [US1] Write `apps/web/src/features/game/helpers/share-result.test.ts`: `buildShareText({ source, date, elapsedMs })` returns the two lines for every source (name from `puzzleSourceNames`), date as `dd/mm/aaaa` of the puzzle date (an old date keeps its year), time from `formatElapsed` (`07:48`, `1:02:03`); the output has exactly two lines and no `@` (no personal data, FR-008). The hook (T004) never calls `fetch` (FR-009).
- [x] T003 [US1] Create `apps/web/src/features/game/helpers/share-result.ts` with the pure `buildShareText`. It takes only `source`, `date` and `elapsedMs` (no solution, clues or cells); no React, no I/O. Make T002 pass.
- [x] T004 [P] [US1] Write `apps/web/src/features/game/hooks/useShareResult.test.ts`: with `navigator.clipboard.writeText` resolving, `share(text)` calls it once with the text and the status becomes `copied`; each new call copies the same text again without duplicating state.
- [x] T005 [US1] Create `apps/web/src/features/game/hooks/useShareResult.ts`: returns `{ status, share }` with `status` in `idle | copied` for now (the clipboard path only). Make T004 pass.
- [x] T006 [P] [US1] Add `shareText` to the default props of `renderDialog` and extend `apps/web/src/features/game/components/dialogs/CompletionDialog/CompletionDialog.test.tsx`: with a `shareText` prop, a "Compartilhar resultado" button exists; click copies the text and shows "Resultado copiado" in a `role="status"` paragraph; the button works with `localOnly` and with `confirmed={false}`; initial focus and the order of the existing buttons are unchanged; the "Resultado copiado" notice stays until the next tap or until the dialog closes; `vitest-axe` has no violation.
- [x] T007 [US1] In `apps/web/src/features/game/components/dialogs/CompletionDialog/CompletionDialog.tsx` add the prop `shareText: string`, use `useShareResult`, and render a `Button` (`variant="secondary"`, `block`) "Compartilhar resultado" as the last action plus the status paragraph (style in `CompletionDialog.module.css`). Status `copied` shows "Resultado copiado"; `shared` shows no message (the device sheet is the feedback); `idle` shows nothing. Make T006 pass.
- [x] T008 [US1] In `apps/web/src/features/game/components/GameScreen/GameScreen.tsx` pass `shareText={buildShareText({ source: puzzle.source, date: puzzle.date, elapsedMs: finishedMs })}` to `CompletionDialog` (import the helper by file, no new barrel name). Update any test that renders `CompletionDialog` without the new prop.

**Checkpoint**: US1 is shippable alone.

---

## Phase 3: User Story 2 - Compartilhar mesmo quando copiar falha (Priority: P2)

**Goal**: when the clipboard is denied or missing, the text still reaches the person.

**Independent Test**: deny `clipboard-write`, tap the button: share sheet if available, otherwise the text is shown selected with a notice.

- [x] T009 [P] [US2] Extend `useShareResult.test.ts`: clipboard rejects and `navigator.share` exists → `share` is called with the text and status becomes `shared`; `share` rejecting with `AbortError` → status goes back to `idle`, no error; clipboard rejects or is absent and no `navigator.share` (or it fails other than `AbortError`) → status `manual`.
- [x] T010 [US2] Extend `useShareResult.ts` with the fallback chain clipboard → `navigator.share` (checked by presence, no `any`) → `manual`, and the statuses `shared` and `manual`. Make T009 pass.
- [x] T011 [P] [US2] Extend `CompletionDialog.test.tsx`: in `manual` the dialog shows "Não foi possível copiar sozinho. Copie o texto abaixo." and a read-only field with the text, focused and fully selected; the notice is in a `role="status"` region; no axe violation.
- [x] T012 [US2] Update `CompletionDialog.tsx` and `CompletionDialog.module.css`: in `manual` render the notice and a read-only `textarea` with an accessible label; on show, move focus to it and select all its text (the `role="status"` notice announces why). Make T011 pass.

**Checkpoint**: US1 and US2 work.

---

## Phase 4: Polish & Cross-Cutting

- [x] T013 Run `npm run format:check`, `npm run lint` (includes `check:deps`), `npm run typecheck` and `npm test`; fix what fails.
- [x] T014 Run the manual scenarios of `specs/052-compartilhar-resultado/quickstart.md` (guest, offline, clipboard denied, keyboard and screen reader).
- [x] T015 [P] Run `grep -rn "Voltar à biblioteca\|Ver o tabuleiro" apps/web/e2e`; for each spec found, confirm the extra button does not break it (selectors by role/name, button counts) and adjust it if it does.

---

## Phase 5: User Story 3 - Compartilhar o resultado como imagem (Priority: P2)

**Goal**: "Compartilhar imagem" builds a PNG card (brand, source, date, time) on a `canvas` and delivers it by file share, image copy or download.

**Independent Test**: complete a puzzle, tap "Compartilhar imagem": the card arrives/downloads with only those four things.

- [X] T016 [P] [US3] Write `apps/web/src/features/game/helpers/share-card.test.ts`: with `HTMLCanvasElement.prototype.getContext` stubbed by a recording fake and `toBlob` stubbed, `renderShareCard({ source, date, elapsedMs })` draws only the texts "Cruzadinha", the source name, `dd/mm/aaaa` and the time (and fixed labels), resolves a PNG `Blob`, and resolves `null` when `getContext` returns `null`.
- [X] T017 [US3] Create `apps/web/src/features/game/helpers/share-card.ts` with `renderShareCard` (1080×1080 canvas, fixed colours, fonts `Fraunces`/`Roboto` with serif/sans fallbacks, text wrapped to fit). Same three inputs as `buildShareText`; no solution, clues or cells. Make T016 pass.
- [X] T018 [P] [US3] Extend `useShareResult.test.ts`: `shareImage(blob)` with `navigator.canShare({files})` true → `navigator.share` gets a `File` named `cruzadinha.png` and the status stays `idle`; `AbortError` → `idle`; no file share but `ClipboardItem` + `clipboard.write` ok → `imageCopied`; neither → an `<a download="cruzadinha.png">` is clicked and the status is `imageDownloaded`; `null` blob → `manual`-free failure: status `imageFailed`.
- [X] T019 [US3] Extend `useShareResult.ts` with `shareImage(blob: Blob | null)` and the statuses `imageCopied`, `imageDownloaded`, `imageFailed` (no `any`; features checked by presence). Make T018 pass.
- [X] T020 [P] [US3] Extend `CompletionDialog.test.tsx` (mock `../../../helpers/share-card`): a "Compartilhar imagem" button exists after "Compartilhar resultado"; its click renders the card with source, date and time and delivers it; "Imagem copiada" and "Imagem baixada" appear in a `role="status"` paragraph; "Não foi possível gerar a imagem." appears for `imageFailed`; no axe violation.
- [X] T021 [US3] Update `CompletionDialog.tsx`: keep `shareText` and add the prop `shareCard: { source: PuzzleSourceId; date: string }` (the elapsed time is the existing `elapsedMs`); add the button "Compartilhar imagem" (`variant="secondary"`, `block`) after "Compartilhar resultado" and the messages above. Pass `shareCard={{ source: puzzle.source, date: puzzle.date }}` in `GameScreen.tsx` and add it to the `renderDialog` defaults. Make T020 pass.
- [X] T022 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`; check `apps/web/e2e/botoes.spec.ts` and `sem-saltos.spec.ts` for dialog-button assumptions.
- [X] T023 Replace the two dialog buttons with one "Compartilhar" button (share icon) that switches the same dialog to a second screen with "Compartilhar texto", "Compartilhar imagem" and "Voltar" (Esc goes back); add `reset` to `useShareResult`; update the tests.

---

## Dependencies & Execution Order

- T001 first (independent of code). US1: T002→T003; T004→T005; T006→T007 (needs T005); T008 needs T003 and T007.
- US2 needs US1 (same hook and dialog): T009→T010; T011→T012.
- Polish after both stories.

## Parallel Opportunities

- T002, T004 and T006 touch different files and can be written together.
- T009 and T011 can be written together.

## Implementation Strategy

MVP = Phase 2 (copy only). Ship US2 right after: without it a denied clipboard fails silently.

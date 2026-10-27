---

description: "Task list for feature 042 - Gestão da conta"
---

# Tasks: Gestão da conta

**Input**: `specs/042-gestao-da-conta/` (plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-contracts.md, quickstart.md)

**Tests**: included. The constitution (II, VII) and the project flow require tests with each change; unit tests use fakes (`EmailSender`, `Clock`, in-memory rate-limit repository), integration tests (`*.int.test.ts`) use Postgres via Testcontainers.

**Organization**: by user story. US1 and US2 are P1, US3 and US4 are P2. After Phase 2 the four stories are independent on the API; on the site they share the `/conta` page created in Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an unfinished task
- Paths are relative to the repository root. `ID/api` = `apps/api/src/modules/identity`.

---

## Phase 1: Setup

- [X] T001 Run `npm run check:ids:remote` and confirm DDE-006 / ERD-006 and `specs/042-*` are free; if not, rename per CLAUDE.md before creating files

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: shared schemas, error code, rate-limit actions, migration, account module skeleton, `/conta` page shell.

**⚠️ CRITICAL**: no story starts before this phase is done.

- [X] T002 [P] Add to `packages/shared/src/auth/schema.ts` (strict requests): `currentPasswordSchema = z.string().min(1).max(128)`, `changePasswordRequestSchema { currentPassword, newPassword: passwordSchema }`, `changeEmailRequestSchema { currentPassword, newEmail: emailSchema }`, `confirmEmailChangeRequestSchema { token: tokenSchema }`, `deleteAccountRequestSchema { currentPassword }`; export from the package index; add schema tests next to the file
- [X] T003 [P] Add `'wrong-password'` (400, "A senha atual não confere.") to `apiErrorCodeSchema` in `packages/shared/src/api-error.ts` and extend its test
- [X] T004 Add `PASSWORD_CONFIRM` and `CHANGE_EMAIL` to `rateLimitActions` in `apps/api/src/platform/db/schema.ts`, add the `emailChangeRequests` table (`request_id` uuid PK `defaultRandom()`, `user_id` uuid NOT NULL FK `users.user_id` ON DELETE CASCADE with unique index, `new_email` text NOT NULL, `token_hash` text NOT NULL unique, `expires_at` timestamptz NOT NULL, spread `...timestamps`)
- [X] T005 Generate the migration with `npm run db:generate -w @cruzadinha/api -- --name account_management`; edit the SQL to add the `email_change_requests_set_updated_at` trigger and recreate `rate_limit_attempts_action_check` with the two new actions; run `npm run db:migrate -w @cruzadinha/api` (depends on T004)
- [X] T006 [P] Add `passwordConfirm` (5 in 15 min, same numbers as `loginEmail`) and `changeEmail` (10 in 60 min per address) to `RateLimits` and `defaultRateLimits` in `apps/api/src/platform/rate-limit/limits.ts`, export through `platform/rate-limit/index.ts` if needed, update its tests
- [X] T007 [P] Create `docs/data-definitions/DDE-006-gestao-da-conta.md` (columns, `EMAIL_CHANGE_TTL_MINUTES = 60`, states, new rate-limit actions) and `docs/entity-relationship-diagrams/ERD-006-gestao-da-conta.md` (Mermaid `erDiagram`, `users 1—0..1 email_change_requests`) following DDE-005 / ERD-005
- [X] T008 [P] Update `.dependency-cruiser.cjs`: `modules/identity/account` may import `sessions` and `recovery` (through their files as the other rules allow); `sessions`, `registration`, `recovery` never import `account`; run `npm run check:deps`
- [X] T009 Create the account module skeleton: `ID/api/account/account.schemas.ts` (OpenAPI `schema` per route, built with `toDocSchema` from the shared schemas, `security` on session routes), `account.routes.ts` (empty plugin `accountRoutes`), `account.service.ts` (`createAccountService` with injectable `Clock`), and register it in `ID/api/identity.routes.ts`; expose nothing new in `index.ts` unless another module needs it
- [X] T010 Implement the shared current-password step in `ID/api/account/account.service.ts` as `confirmCurrentPassword(userId, password)`: `rateLimiter.reserve` on `PASSWORD_CONFIRM`/`USER` before argon2 (refusal → `429 too-many-attempts` with `retryAfter` and `Retry-After`), wrong password → `400 wrong-password` (the reserved row stays as the failure record), success → release the reservation and clear the bucket; unit tests in `account.service.test.ts` with fake clock and in-memory repository (6th wrong attempt is `429`, a correct one resets the bucket) (depends on T006, T009)
- [X] T011 [P] Web: add API client calls, one folder per file under `apps/web/src/shared/services/api/` (`change-password`, `logout-others`, `change-email`, `confirm-email-change`, `delete-account`), each Zod-validated via `ApiRequestError`, with tests using `src/test/http` (depends on T002, T003)
- [X] T012 [P] Web: extract `endLocalSession` (clear `last-user`, query cache, session `null`, navigate to `/`) from `useLogoutMutation` into `apps/web/src/features/session/` (own folder + test), make `useLogoutMutation` use it, export from `features/session/index.ts`; existing logout tests must still pass
- [X] T013 Web: create `apps/web/src/pages/account/AccountPage.tsx` (+ `.module.css`, test): offline → `RequiresConnection`; visitor → `h1` "Sua conta", "Entre para gerenciar sua conta." and link to `/login?next=/conta`, no forms; with session → `h1` "Sua conta", current e-mail and the four `h2` sections as empty slots; add the `/conta` route in `apps/web/src/app/router.tsx` (lazy like the other pages) and make the header e-mail in `apps/web/src/app/AppLayout.tsx` an underlined text link to `/conta` with accessible label "Sua conta (<e-mail>)", visitors do not see it; update the layout test
- [X] T014 [P] Add `/conta` to `apps/web/public/_headers` (`noindex`, like the other account routes) and to `ACCOUNT_PATHS` (find with `grep -rn ACCOUNT_PATHS apps/web/src`)

**Checkpoint**: migration applied, `npm run check:deps` and `npm run typecheck` green, `/conta` renders for a session and a visitor.

---

## Phase 3: User Story 1 - Trocar a senha estando logado (P1) 🎯 MVP

**Goal**: with the current password, change the password; other sessions end, the current one stays, open recovery links are revoked.

**Independent Test**: two browsers on the same account; change the password in one; the other loses the session, the old password fails, the new one logs in.

### Tests for US1

- [X] T015 [P] [US1] Service unit tests in `ID/api/account/account.service.test.ts`: success hashes with argon2id, ends other sessions, keeps the current one, revokes open reset links; wrong current password changes nothing; repeated request with the old password gives `wrong-password`
- [X] T016 [P] [US1] Integration tests in `apps/api/src/test/account-change-password.int.test.ts`: acceptance scenarios 1 to 4 of US1 (valid change, wrong current → `400 wrong-password`, new password outside the sign-up rules → `400 invalid-input` with `fields: ["newPassword"]`, 6th wrong attempt → `429`), `401` without session, a pending `email_change_requests` row survives a password change and a completed `reset-password`, an open "esqueci a senha" link stops working
- [X] T017 [P] [US1] Web test `apps/web/src/features/account/components/ChangePasswordForm/ChangePasswordForm.test.tsx`: success notice and cleared fields, `wrong-password` error on "Senha atual", `invalid-input` on the pointed field, `429` text "Muitas tentativas. Tente de novo em N minutos.", only its own button disabled while pending (a second click sends no second request), `vitest-axe` clean

### Implementation for US1

- [X] T018 [US1] Add `endOtherSessionsForUser(db, userId, keepTokenHash, now)` (same `UPDATE ... SET ended_at` as `endAllSessionsForUser` with `token_hash <> keep`) to `ID/api/sessions/sessions.repository.ts` and a `updatePasswordHash` to `ID/api/users.repository.ts` if absent (reuse the one the recovery uses otherwise); export what `account` needs
- [X] T019 [US1] Implement `changePassword(userId, keepTokenHash, body)` in `account.service.ts`: `confirmCurrentPassword`, then hash the new password with argon2id first (outside any transaction), then one transaction with the three writes `updatePasswordHash`, `endOtherSessionsForUser`, `revokeOpenResetTokens` from `recovery` (depends on T010, T018)
- [X] T020 [US1] Add `POST /api/auth/change-password` to `account.routes.ts` (session required, body `safeParse` → `400 invalid-input` with `fields`, `200 {}`) and its OpenAPI schema in `account.schemas.ts`; run `apps/api/src/platform/docs/docs.test.ts`
- [X] T021 [US1] Web: build `ChangePasswordForm` in `apps/web/src/features/account/components/ChangePasswordForm/` (fields "Senha atual" `autocomplete="current-password"`, "Nova senha" `autocomplete="new-password"` with the sign-up rules hint, `primary` Button "Trocar senha", `useMutation`, `Notice` with `role="status"`/`role="alert"` in a reserved space so the layout does not shift, "Esta ação não está disponível agora." on `404`), export from `features/account/index.ts`, place in `AccountPage` (depends on T011, T013)

**Checkpoint**: US1 works end to end and is the MVP.

---

## Phase 4: User Story 2 - Sair de todos os aparelhos (P1)

**Goal**: end all other sessions with no password; current one stays.

**Independent Test**: two browsers; use the button in one; the other becomes a guest on its next account-dependent action without interrupting the game.

### Tests for US2

- [X] T022 [P] [US2] Integration tests in `apps/api/src/test/account-logout-others.int.test.ts`: other sessions get `401` afterwards, the current one keeps working, idempotent second call, `401` without session, body other than `{}` → `400`
- [X] T023 [P] [US2] Web test `apps/web/src/features/account/components/LogoutOthersButton/LogoutOthersButton.test.tsx`: explanatory text, success notice "Os outros aparelhos saíram da conta.", error and `404` notices, axe clean

### Implementation for US2

- [X] T024 [US2] Implement `logoutOthers(userId, keepTokenHash)` in `account.service.ts` using `endOtherSessionsForUser` (T018) and add `POST /api/auth/logout-others` (strict empty body, `200 {}`) with its OpenAPI schema
- [X] T025 [US2] Web: build `LogoutOthersButton` in `apps/web/src/features/account/components/LogoutOthersButton/` (text "Encerra a conta em todos os outros aparelhos. Este continua conectado.", `secondary` Button "Sair dos outros aparelhos", no password), export and place in `AccountPage`
- [X] T026 [US2] Verify FR-013 / SC-006 with a test in the existing session-ended tests (or a new one in `apps/web/src/features/session/`): a `401` while a game is open shows the non-blocking notice and does not interrupt play; fix only if it fails

**Checkpoint**: US1 and US2 independent and working.

---

## Phase 5: User Story 3 - Trocar o e-mail com confirmação (P2)

**Goal**: new address gets a single-use 60-minute link; the account e-mail changes only when the link is opened; old address gets a notice without the new address.

**Independent Test**: request the change, old e-mail still logs in, open the link, only the new e-mail logs in.

### Tests for US3

- [X] T027 [P] [US3] Repository/service unit tests in `ID/api/account/account.service.test.ts` with a fake `EmailSender`: free address → request upserted (new request replaces the old hash), link + notice sent after the response; address of another account → no link, the account's pending request (if any) is deleted via `deleteEmailChangeFor`, the notice is sent and the response is identical; same as current e-mail → `invalid-input` `fields: ["newEmail"]`; interval gate answers `202` with the remainder without saving or sending and the earlier request stays valid; nothing sent → attempt released
- [X] T028 [P] [US3] Integration tests in `apps/api/src/test/account-change-email.int.test.ts`: all six US3 acceptance scenarios, two requests in a row (only the last link works), request X (free) then request Y (taken address) after the interval: the X link answers `400 invalid-token`; a second request inside the interval leaves the X link valid; confirming the change revokes an open "esqueci a senha" link of the account; address taken after the request (`400 invalid-token`, e-mail unchanged, request deleted), link used twice, expired link (fake clock), confirm without session, `VERIFY_TOKEN` limit `429`, `503 email-unavailable` without sender, wrong password sends nothing; `conventions.int.test.ts` passes for the new trigger
- [X] T029 [P] [US3] Template tests in `apps/api/src/platform/email/templates.test.ts`: `emailChangeEmail(link)` mentions 60 minutes and "se não foi você, ignore"; `emailChangeNotice(requestedAt)` shows date and time in Brasília, tells to change the password, and contains neither a link nor the new address
- [X] T030 [P] [US3] Web tests: `ChangeEmailForm.test.tsx` (same-address refusal "Esse já é o seu e-mail." without a request, submit disabled while the countdown runs, `202` message with the new address and countdown via `useCountdown`, `503` message, `wrong-password`), `ConfirmEmailChange.test.tsx` and `pages/confirm-email/ConfirmEmailPage.test.tsx` (token read once from the fragment and the fragment removed, sends without a click, success with and without session, `invalid-token`/missing token), axe clean

### Implementation for US3

- [X] T031 [US3] Create `ID/api/account/email-change.repository.ts` with `EMAIL_CHANGE_TTL_MINUTES = 60`: `upsertEmailChange` (`insert ... onConflictDoUpdate({ target: user_id, set: { new_email, token_hash, expires_at } })`), `consumeEmailChange` (`DELETE ... WHERE token_hash = $1 AND expires_at > now RETURNING user_id, new_email`, in the caller's transaction) and `deleteEmailChangeFor`; add `updateEmail` to `ID/api/users.repository.ts` (unique violation on `users_email_unique` surfaces as a typed result); `new_email` never in logs (`describeError`)
- [X] T032 [P] [US3] Add `emailChangeEmail(link)` and `emailChangeNotice(requestedAt)` to `apps/api/src/platform/email/templates.ts` (subjects "Confirme seu novo e-mail na Cruzadinha" and "Pedido de troca de e-mail"), export through `platform/email/index.ts`
- [X] T033 [US3] Implement `requestEmailChange` in `account.service.ts` following contracts/api.md order: `admitAddress` `CHANGE_EMAIL` (before body) → `email.admit()` → `confirmCurrentPassword` → same-as-current check → `enterIntervalGate` `CHANGE_EMAIL`/`USER` → work (free address: upsert with `generateSessionToken` stored as SHA-256 and link `APP_BASE_URL/confirmar-email#token=<token>`; taken address: `deleteEmailChangeFor` the account, so no older link survives; both branches inside the work step) → `202 { retryAfter }` → `email.sendAfterResponse` for the link and always the notice, each reserving the daily ceiling; release the interval attempt when nothing leaves (depends on T010, T031, T032)
- [X] T034 [US3] Implement `confirmEmailChange` in `account.service.ts`: `VERIFY_TOKEN` per address, one transaction doing `consumeEmailChange` + `updateEmail` + `revokeOpenResetTokens` (from `recovery`, so open "esqueci a senha" links die with the old address); no row or unique violation → `400 invalid-token` (request stays deleted); sessions untouched (depends on T031)
- [X] T035 [US3] Add `POST /api/auth/change-email` (session) and `POST /api/auth/confirm-email-change` (no session, independent of `REGISTRATION_ENABLED`) to `account.routes.ts` with OpenAPI schemas in `account.schemas.ts`; use `request.clientAddress`
- [X] T036 [P] [US3] Extend `deleteExpiredAuthRows` in `ID/api/cleanup.repository.ts` to delete `email_change_requests` expired more than 7 days ago, add `emailChanges` to `CleanupCounts`, update the `auth cleanup` line in `apps/api/src/cli/run-cli.ts` and the related tests
- [X] T037 [US3] Web: build `ChangeEmailForm` in `apps/web/src/features/account/components/ChangeEmailForm/` (fields "Novo e-mail" `type="email"`, "Senha atual"; `secondary` Button "Enviar link"; messages from ui-contracts) and place in `AccountPage`
- [X] T038 [US3] Web: build `ConfirmEmailChange` in `apps/web/src/features/account/components/ConfirmEmailChange/` and `apps/web/src/pages/confirm-email/ConfirmEmailPage.tsx` (token via the existing `token-fragment` helper, "Confirmando seu novo e-mail…", success invalidates `queryKeys.session`, links "Ir para sua conta" / "Entrar" / "Pedir outro"); add the `/confirmar-email` route in `router.tsx`, `Referrer-Policy: no-referrer` and `noindex` in `apps/web/public/_headers`, and the route in `ACCOUNT_PATHS`

**Checkpoint**: e-mail change works end to end, including from a browser without session.

---

## Phase 6: User Story 4 - Excluir a conta (P2)

**Goal**: with the password and after reading what goes away, delete everything and become a guest; clean the account data on this device, keep guest progress.

**Independent Test**: account with progress and settings; delete; login fails, the e-mail can sign up again, nothing of the account remains on the server or on this device, guest progress remains.

### Tests for US4

- [X] T039 [P] [US4] Integration tests in `apps/api/src/test/account-delete.int.test.ts`: acceptance scenarios 2 to 4 of US4, zero rows of the account in `users`, `sessions`, `progress`, `user_settings`, `password_reset_tokens`, `email_change_requests` and `rate_limit_attempts` with `key_type = 'USER'`; cookie cleared; second identical call → `401`; wrong password deletes nothing; same e-mail can register again; `401` without session
- [X] T040 [P] [US4] Web test `apps/web/src/features/account/components/DeleteAccountDialog/DeleteAccountDialog.test.tsx`: lists what is deleted and "Não há como desfazer. O progresso de visitante deste aparelho fica.", no backdrop close, `Esc` cancels, initial focus on the password field, `wrong-password` error and nothing deleted, success calls `onDeleted` before `endLocalSession`, confirm button disabled while pending (a double click sends one request), a `401` from a late second request after success shows no session-ended notice over "Sua conta foi excluída.", axe clean
- [X] T041 [P] [US4] Web test in `apps/web/src/pages/account/AccountPage.test.tsx`: deleting runs `clearAccountData(userId)` (assert with the `features/offline` fake IndexedDB: account puzzles, `known-progress` and outbox gone) while `cruzadinha-visitante` is untouched, and the person lands on `/` as a guest with "Sua conta foi excluída."

### Implementation for US4

- [X] T042 [US4] Add `deleteUser` to `ID/api/users.repository.ts` and an `deleteUserAttempts(userId)` (rows with `key_type = 'USER'` and `key_value = userId`) to the rate-limit repository exposed through `platform/rate-limit/index.ts`; implement `deleteAccount(userId, body)` in `account.service.ts`: `confirmCurrentPassword`, then delete user (cascade) and the `USER` attempts; add `POST /api/auth/delete-account` (session, `200 {}`, `clearSessionCookie`) with its OpenAPI schema
- [X] T043 [US4] Web: build `DeleteAccountDialog` in `apps/web/src/features/account/components/DeleteAccountDialog/` (`Dialog` with `closeOnBackdrop` off, title "Excluir a conta?", the list from ui-contracts, "Senha atual" field, "Cancelar" `quiet`, "Excluir para sempre" `primary`, prop `onDeleted`), export and open from a `secondary` "Excluir conta" button in `AccountPage`
- [X] T044 [US4] Web: in `AccountPage` pass `onDeleted` = `clearAccountData(userId)` from `features/offline` (the page composes, `account` stays importing only `session`), then call `endLocalSession` and show the notice "Sua conta foi excluída."; run `npm run check:deps`

**Checkpoint**: all four stories work.

---

## Phase 7: Polish & Cross-Cutting

- [X] T045 [P] Playwright spec `apps/web/e2e/conta.spec.ts`: change password in one context while another is logged in, then delete the account; plus a layout-shift check on `/conta` as in `e2e/sem-saltos.spec.ts`
- [X] T046 [P] Update `CLAUDE.md` with a "Feature 042" paragraph (only rules a future change can break: `wrong-password` is never `401`, one `PASSWORD_CONFIRM` bucket per user, `email_change_requests` one row per account, confirm without session, `account` + `clearAccountData` via `onDeleted`), the `auth cleanup` line, and the `/confirmar-email` header rule; list `change-email` as the exception to the "every e-mail route answers `202 { retryAfter }`, `429` only per address" rule (it also answers `400 wrong-password`, `400 invalid-input` for the same address and a per-user `429`, allowed because it requires a session so nothing about other accounts leaks); update `docs/deploy.md` only if it lists routes or cleanup output
- [X] T047 [P] Update `docs/versionamento.md` / release notes only if the contract compatibility note (new site against old API shows "Esta ação não está disponível agora.") is not already covered; otherwise skip
- [X] T048 Run the full gates: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:int`, `npm run build`, `npm run test:e2e -w @cruzadinha/web` (separate database, see CLAUDE.md)
- [ ] T049 Walk through `specs/042-gestao-da-conta/quickstart.md` manually (items 1 to 6, including keyboard-only, light/dark and 360 px) and fix what it finds
- [ ] T050 Commit in English with Conventional Commits without any AI attribution (CLAUDE.md overrides): e.g. `feat(shared): add account management schemas`, `feat(api): add account management routes`, `feat(web): add account page`, `docs: add data definition for account management`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories → Phase 7.
- Inside Phase 2: T004 → T005; T002 and T003 → T011; T006 → T010; T009 → T010; T021, T025, T037 and T043 need T011 and T013, T044 needs T012; T007, T008, T012, T014 are free.
- US1 (needs T018 shared with US2: do T018 first in US1; US2 reuses it). US3 and US4 depend only on Phase 2 (US4's T042 is independent of US3).
- Web tasks of a story need that story's API route only for e2e/manual checks; unit tests mock HTTP.
- `AccountPage.tsx` is edited by T021, T025, T037, T043, T044: do these sequentially.
- `account.service.ts`, `account.routes.ts` and `account.schemas.ts` are shared by all stories: tasks touching them are not `[P]` with each other.

### Parallel examples

```text
Phase 2:  T002 + T003 + T006 + T007 + T008 + T012 + T014
US1 tests: T015 + T016 + T017 together, before T018-T021
US3:      T029 + T032 + T036 (different files) while T031 is written
Stories:  after Phase 2, US3 and US4 API work (T031-T036, T042) can go in parallel with US1/US2
```

## Implementation Strategy

1. MVP: Phase 1 + 2 + US1 (T001–T021). Validate with the US1 independent test.
2. Add US2 (small, reuses T018), validate.
3. Add US3, then US4 (destructive, last), each validated by its own test and the matching quickstart item.
4. Polish: e2e, CLAUDE.md, full gates.

Release note: API and site ship separately; the site tolerates an older API (`404` → "Esta ação não está disponível agora."), so no deploy order is required.

---

## Phase 8: Convergence

- [X] T051 [P] Add `apps/web/e2e/conta.spec.ts`: change the password in one context while a second one is logged in (the second ends as an expired session without interrupting an open game), then delete the account; plus a layout-shift check on `/conta` as in `e2e/sem-saltos.spec.ts`; no such spec exists in `apps/web/e2e/` (T045 open) per SC-002, SC-004, SC-006, FR-014 (missing)
- [X] T052 Add an explicit test that a `401` from a progress save while a game is open shows the non-blocking notice and leaves the board playable; `session-handlers.test.ts` only covers the handler, not the game screen (T026 open) per FR-013 / SC-006 (partial)
- [ ] T053 Walk through `specs/042-gestao-da-conta/quickstart.md` items 1 to 6 (keyboard-only, light/dark, 360 px) and fix what it finds (T049 open) per FR-014 (missing)
- [X] T054 Decide T047: confirm `docs/versionamento.md` already covers the "new site against old API" compatibility note and record the outcome, or add the note per FR-015 (partial)
- [ ] T055 Commit the feature in English with Conventional Commits and no AI attribution (CLAUDE.md overrides); all 042 work is still uncommitted (T050 open) per plan: delivery (missing)

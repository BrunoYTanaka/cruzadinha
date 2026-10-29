---

description: "Task list for the Turnstile captcha on sign-up, resend and password recovery"
---

# Tasks: Captcha no cadastro e na recuperação de senha

**Input**: Design documents from `/specs/049-captcha-cadastro-recuperacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/captcha-api.md, quickstart.md

**Tests**: Included (plan.md D12: unit, integration with real Postgres, axe in both themes, e2e with the widget script intercepted). No suite uses the network or Cloudflare's test keys.

**Organization**: Grouped by user story. Touches `packages/shared`, `apps/api` (no schema or migration, so no DDE/ERD change) and `apps/web`. Paths are from the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 to US3 (spec.md)

---

## Phase 1: Setup

- [X] T001 Use Context7 (`resolve-library-id` then `query-docs`, library `/websites/developers_cloudflare_turnstile`) before coding to re-confirm: `siteverify` request and response fields, `turnstile.render` options (`appearance`, `theme`, `language`, `action`, `expired-callback`, `error-callback`, `timeout-callback`), `reset`/`remove`, and the accepted `language` value for Brazilian Portuguese (`pt-BR` vs `pt-br`, research D6). Write the confirmed value into `specs/049-captcha-cadastro-recuperacao/research.md` D6.
- [X] T002 [P] Add `CAPTCHA_ENABLED=false`, `TURNSTILE_SECRET_KEY=` and `VITE_TURNSTILE_SITE_KEY=` with fictitious or empty values and a one-line comment each to `.env.example` (the real keys never go in the repository).

---

## Phase 2: Foundational (blocking)

**Purpose**: shared contract, configuration, the verifier interface, the error code and the status flag every story uses.

**⚠️ CRITICAL**: US1 to US3 depend on this phase.

- [X] T003 Edit `packages/shared/src/auth/schema.ts`: add `captchaTokenSchema = z.string().min(1).max(2048)`; add `CAPTCHA_ACTIONS = ['signup', 'resend', 'forgot'] as const` and `type CaptchaAction`; add `captchaToken: captchaTokenSchema.optional()` to `registerRequestSchema`, `resendVerificationRequestSchema` and `forgotPasswordRequestSchema` (all stay `z.strictObject`); change `registrationStatusSchema` to `z.object({ open: z.boolean(), captchaRequired: z.boolean().default(false) })`. Export the new names from `packages/shared/src/index.ts`. Add cases to `packages/shared/src/auth/schema.test.ts`: token of 2048 accepted, 2049 and empty string rejected, absent accepted, extra key still rejected, status without `captchaRequired` parses as `false`.
- [X] T004 Edit `apps/api/src/config.ts`: add `CAPTCHA_ENABLED` (same `preprocess` empty-as-absent and `z.enum(['true','false'])` pattern as `REGISTRATION_ENABLED`, error "deve ser true ou false", default `true` when `NODE_ENV === 'production'` and `false` otherwise) and `TURNSTILE_SECRET_KEY` (`emptyAsUndefined`, string 1 to 512, optional). Add `ServerConfig.captcha: { enabled: boolean; secretKey: string | undefined; hostname: string | undefined }` where `hostname` is `new URL(APP_BASE_URL).hostname`. In `checkMail`'s sibling (new `checkCaptcha`) push "TURNSTILE_SECRET_KEY: obrigatória com CAPTCHA_ENABLED=true" and "APP_BASE_URL: obrigatória com CAPTCHA_ENABLED=true" when enabled and missing; note that the development default for `APP_BASE_URL` (`http://localhost:5173`) must also count as present. Extend `apps/api/src/config.test.ts`: default per `NODE_ENV`, invalid value, missing secret, missing base URL, hostname derived, secret never present in the error text.
- [X] T005 [P] Create `apps/api/src/platform/captcha/types.ts`: `CaptchaAction` re-exported from `@cruzadinha/shared`; `CaptchaResult = { ok: true } | { ok: false; reason: 'missing' | 'rejected' | 'wrong-action' | 'wrong-hostname' | 'unavailable' }`; `interface CaptchaVerifier { verify(input: { token: string; action: CaptchaAction; remoteIp: string }): Promise<CaptchaResult> }`.
- [X] T006 Create `apps/api/src/platform/captcha/turnstile-verifier.ts` with `createTurnstileVerifier({ secret, hostname, fetch })` (same shape as `platform/email/resend-sender.ts`): `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with JSON `{ secret, response, remoteip }`, no `idempotency_key`, `signal: AbortSignal.timeout(10_000)`. Read the response as `unknown` and parse with Zod (`success` boolean required; `hostname`, `action` strings optional; `error-codes` string array optional). Return `unavailable` on network error, timeout, non-2xx or JSON/Zod failure; `rejected` when `success` is false; `wrong-action` when `action` differs; `wrong-hostname` when `hostname` differs; else `{ ok: true }`. Never log or return the token or the secret. Create `turnstile-verifier.test.ts` with an injected `fetch` and hand-written responses taken from the documentation (success; `success:false` with `invalid-input-response`; `timeout-or-duplicate`; wrong action; wrong hostname; 500; invalid JSON; timeout; network error) and assert the request body and URL.
- [X] T007 Create `apps/api/src/platform/captcha/captcha-guard.ts` with `createCaptchaGuard({ enabled, verifier })` returning `check(request, action): Promise<boolean>`: when `enabled` is false return `true` without reading the body or calling the verifier; otherwise read `request.body` as `unknown`, parse only `{ captchaToken }` with `captchaTokenSchema` (absent, empty, non-string or longer than 2048 means `false` without calling the verifier), call `verifier.verify({ token, action, remoteIp: request.clientAddress })` and, on failure, log `{ reason }` only (`request.log.warn`). Create `apps/api/src/platform/captcha/index.ts` exporting `createCaptchaGuard`, `createTurnstileVerifier` and the types. Create `captcha-guard.test.ts`: disabled calls nothing even with a bad body; missing, empty, 2049-char and non-string tokens never reach the verifier; the verifier receives `request.clientAddress` and the right action; log never contains the token.
- [X] T008 [P] Edit `.dependency-cruiser.cjs`: add rule `api-captcha-entry` copying `api-email-entry` (only `platform/captcha/index.ts` is importable from outside `platform/captcha/`), and keep `platform` free of `modules`/`sources` imports. Run `npm run check:deps`.
- [X] T009 Edit `apps/api/src/platform/http/errors.ts`: add `'captcha-failed': 'Não foi possível confirmar que você é uma pessoa. Tente de novo.'` to the message table (the same text as in `contracts/captcha-api.md`); add a `sendCaptchaFailed(reply)` helper that answers `400` with that code through the existing `sendError`/`apiError`.
- [X] T010 Edit `apps/api/src/app.ts`: add `captchaVerifier?: CaptchaVerifier` to `AppDeps` (tests pass a fake; without it use `createTurnstileVerifier` when `config.captcha.enabled`, else a verifier that is never called); build `createCaptchaGuard` once and pass `captcha` to `identityRoutes` and from there to `registrationRoutes` and `recoveryRoutes` (extend `IdentityRoutesOptions`, `RegistrationRoutesOptions`, `RecoveryRoutesOptions`). Edit `apps/api/src/test/app.ts` so test apps default to `CAPTCHA_ENABLED=false` and expose a `fakeCaptcha()` helper (token `ok-<action>` passes, anything else is rejected; records calls) for the story tests.
- [X] T011 Edit `apps/api/src/modules/identity/registration/registration.routes.ts`: `GET /api/auth/registration` returns `{ open: config.registrationEnabled, captchaRequired: config.captcha.enabled }` (type `RegistrationStatus`, still `cache-control: no-store`). Edit its `registrationSchema` in `registration.schemas.ts` (OpenAPI doc) to describe `captchaRequired`. Add a case to the existing route test for both values.

**Checkpoint**: `npm run lint`, `npm run typecheck`, `npm test` clean; the API starts with the switch off exactly as before.

---

## Phase 3: User Story 1 - Impedir que scripts esgotem os e-mails do site (Priority: P1) 🎯 MVP

**Goal**: with the switch on, the three routes refuse any request without a valid proof before spending anything; with a valid proof they behave as today.

**Independent Test**: with the fake verifier, send each route with no proof, bad proof, wrong action and a good proof; refused ones answer the same `400 captcha-failed`, send no e-mail and change no limit row; the good one behaves as before.

- [X] T012 [P] [US1] Add API route tests in `apps/api/src/test/captcha.int.test.ts` (one integration file with the fake verifier, replacing the planned unit files `registration.captcha.test.ts` and `recovery.captcha.test.ts`) with `CAPTCHA_ENABLED=true`: for `register`, `resend-verification` and `forgot-password`, no token, empty token, 2049-char token, rejected token, token for another action and verifier "unavailable" all answer identical `400 { error: 'captcha-failed' }`; same answers with and without an account; a good token answers `202 { retryAfter }`; with the switch off a bad token is ignored and the verifier is never called; `register` and `resend-verification` with registration closed answer `403 registration-closed` before the verifier is called; `verify-email` and `reset-password` never call the verifier.
- [X] T013 [P] [US1] Add `apps/api/src/test/captcha.int.test.ts` (Postgres via Testcontainers, `*.int.test.ts` pattern): with the switch on and the fake verifier rejecting, send many requests to each of the three routes and assert `rate_limit_attempts` has zero rows added, the email interval and per-address daily counters and the daily ceiling are untouched, no `pending_registrations`, reset token or e-mail was created, and the fake `EmailSender` got no call; then a valid-proof request still consumes exactly what it did before.
- [X] T014 [US1] Edit `apps/api/src/modules/identity/registration/registration.routes.ts`: in `POST /api/auth/register` call `captcha.check(request, 'signup')` immediately after the `registrationEnabled` check and before `registration.admitRegister`; on `false` return `sendCaptchaFailed(reply)`. Same in `POST /api/auth/resend-verification` with `'resend'`. Do not touch `verify-email`.
- [X] T015 [US1] Edit `apps/api/src/modules/identity/recovery/recovery.routes.ts`: in `POST /api/auth/forgot-password` call `captcha.check(request, 'forgot')` as the first statement, before `recovery.admitForgot`; on `false` return `sendCaptchaFailed(reply)`. Do not touch `reset-password`.
- [X] T016 [P] [US1] Edit `apps/api/src/modules/identity/registration/registration.schemas.ts` and `apps/api/src/modules/identity/recovery/recovery.schemas.ts` so the OpenAPI documentation lists `captchaToken` in the three bodies and `400 captcha-failed` in their responses; `apps/api/src/platform/docs/docs.test.ts` must still pass.
- [X] T037 [US1] Cap verifications in flight in `apps/api/src/platform/captcha/captcha-guard.ts` (2 per address, 20 in total, released in `finally`, refusal logged at `debug`); tests in `captcha-guard.test.ts` (FR-020).

**Checkpoint**: US1 delivers the protection by itself (callable with `curl` and the fake or real verifier); `npm test` and `npm run test:int` green.

---

## Phase 4: User Story 2 - Passar pelo captcha sem atrito (Priority: P1)

**Goal**: the site gets a proof in the background, blocks the button until it has one, resets after each submit, and never hangs silently.

**Independent Test**: with the API reporting `captchaRequired: true` and a fake `window.turnstile`, the button is disabled until the callback delivers a token, the body carries `captchaToken`, the widget is reset after success and failure, expiry disables the button again, and a script that never loads shows a notice with "Tentar de novo".

- [X] T017 [US2] Edit `apps/web/src/shared/services/config/config.ts` (and `config.test.ts`): add optional `VITE_TURNSTILE_SITE_KEY` (empty means absent, trimmed string, max 128) exposed as `turnstileSiteKey: string | undefined`; an invalid value aborts like the help limits do.
- [X] T018 [US2] Edit `apps/web/src/shared/services/api/auth/auth.ts` (and `auth.test.ts`): `register`, `resendVerification` and `forgotPassword` already take the request types from `shared`, so they send `captchaToken` when present; add a test that the JSON body includes it and omits the key when absent.
- [X] T019 [US2] Create `apps/web/src/shared/components/Turnstile/Turnstile.tsx` (+ `turnstile-script.ts` for the script loader and window typing, `Turnstile.test.tsx`; no CSS file was needed), about 40 to 60 lines, no new dependency: props `{ siteKey, action, onToken(token: string | null), onUnavailable(), resetSignal }` where each increase of `resetSignal` calls `turnstile.reset(id)` (no ref handle: the React lint forbids reading refs during render). It injects `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` once (reused by later mounts), waits up to 10 s for `window.turnstile` and calls `onUnavailable` on timeout, script `error` or `error-callback`. It renders with `{ sitekey, action, appearance: 'interaction-only', language: <value confirmed in T001>, theme: 'light' | 'dark' from the root `data-theme` (falling back to `prefers-color-scheme`), callback: onToken(token), 'expired-callback': onToken(null), 'error-callback': onUnavailable, 'timeout-callback': onToken(null) }`, calls `turnstile.remove(id)` on unmount, and re-renders the widget (and calls `onToken(null)`) when `data-theme` changes (`MutationObserver`). Declare `window.turnstile` with a narrow type (no `any`). Tests use a fake `window.turnstile`: renders with the right options, `action` per prop, theme change re-renders, `reset()` calls `turnstile.reset(id)`, unmount removes, timeout calls `onUnavailable`, and `vitest-axe` has no violations in light and dark.
- [X] T020 [US2] Create `apps/web/src/features/account/hooks/useCaptcha.ts` (+ test): `useCaptcha(action)` reads `captchaRequired` from the registration query (T021), returns `{ required, siteKey, token, ready: !required || token !== null, unavailable, attempt, resets, onToken, onUnavailable, retry(), consume() }`, where `consume()` returns the unspent token from an internal ref (so two submits in the same instant cannot reuse it), sets the token to `null` and increments `resets` (the `resetSignal` of the widget); the forms stop when a required token comes back empty; `retry()` clears `unavailable` and remounts the widget (change of a `key`). When `required` is true but `siteKey` is undefined, `unavailable` is true from the start.
- [X] T021 [US2] Edit `apps/web/src/features/account/hooks/useRegistration.ts` (+ test) to also return `captchaRequired` (from the same `GET /api/auth/registration` query and key, so there is still one request); export a small `useCaptchaRequired()` that `ForgotPasswordForm` can use even when registration is closed.
- [X] T022 [US2] Edit `apps/web/src/features/account/components/RegisterForm/RegisterForm.tsx`: when `captcha.required`, render `<Turnstile action="signup">` above the submit button; disable the button until `captcha.ready`; on submit send `captchaToken: captcha.consume()` (call `consume()` in a `finally` path so the widget resets after success and failure); in the "Confira seu e-mail" screen render a second `<Turnstile action="resend">` (own `useCaptcha('resend')`) and send its token in `onResend`, again consuming it after the call and with the resend button blocked until a new token arrives. When `unavailable`, show a `role="alert"` notice "Não foi possível carregar a verificação de segurança." with a "Tentar de novo" button (`captcha.retry`), keep the submit blocked, and never leave the page without a message. Add the failure message for `captcha-failed` (text "Não foi possível confirmar que você é uma pessoa. Recarregue a página e tente de novo.") to `apps/web/src/features/session/helpers/messages.ts` and make `emailRequestErrorMessage` return it.
- [X] T023 [US2] Edit `apps/web/src/features/account/components/ForgotPasswordForm/ForgotPasswordForm.tsx` the same way with `action="forgot"` (uses `useCaptchaRequired`, so it works with registration closed), and edit `apps/web/src/features/account/components/ResendLink/ResendLink.tsx` to take an optional `blocked` prop that disables the button and keeps its countdown label behavior.
- [X] T024 [US2] Extend `apps/web/src/features/account/components/RegisterForm/RegisterForm.test.tsx` (or the `pages/register/RegisterPage.test.tsx` and `pages/forgot-password/ForgotPasswordPage.test.tsx` already there) with the fake `window.turnstile`: button disabled until the token callback; body carries `captchaToken`; reset called after a successful and after a failed submit; second submit blocked until a new token; resend uses a new token after the countdown; `expired-callback` disables the button again; script never loads shows the notice and "Tentar de novo" re-renders the widget; with `captchaRequired: false` the script is never injected and no widget renders; `vitest-axe` passes in both themes; the page works with keyboard only (Tab reaches the button only when enabled).
- [X] T025 [US2] Add `apps/web/e2e/captcha.spec.ts`: with `page.route` intercept `https://challenges.cloudflare.com/turnstile/v0/api.js*` (fulfil a small fake `window.turnstile` that calls `callback('e2e-token')` after a tick and records `reset`), `GET /api/auth/registration` (`{ open: true, captchaRequired: true }`) and the three POSTs (assert `captchaToken === 'e2e-token'`, answer `202 { retryAfter: 60 }`): sign-up, resend after the countdown and forgot-password all complete with the keyboard only, in the light and dark theme; a second spec fulfils the script with an error and expects the notice with "Tentar de novo" within 10 s; a third checks that, with `captchaRequired: false`, no request goes to `challenges.cloudflare.com`. Update `e2e/sem-saltos.spec.ts` if the widget container shifts the layout (reserve its space).
- [X] T026 [P] [US2] Add a test in `apps/web/src/test/` (or beside the existing `_headers` tests, if any) that reads `apps/web/public/_headers` and asserts there is no `Content-Security-Policy` entry and that `/cadastro` and `/esqueci-a-senha` do not receive `Referrer-Policy: no-referrer` (research D8), so a future CSP or header change that would break the widget fails fast.
- [X] T038 [US2] Hide "Tentar de novo" in `apps/web/src/features/account/components/CaptchaField/CaptchaField.tsx` when `captcha.siteKey` is undefined; test in `apps/web/src/pages/register/RegisterPage.nokey.test.tsx` (FR-021).

**Checkpoint**: the whole flow works in the browser with the switch on (fake script) and off; `npm test -w @cruzadinha/web`, axe and `npm run test:e2e -w @cruzadinha/web` green.

---

## Phase 5: User Story 3 - Poder desligar o captcha rápido e lançar sem quebrar o site antigo (Priority: P2)

**Goal**: the switch is documented and wired for the host, the rollout order is written down, and old and new halves keep working together.

**Independent Test**: with the switch off, the three flows work with no proof and no widget; an old-format request (no `captchaToken`) is accepted by the new API; with the switch on and no secret the API refuses to start; the new site reads `captchaRequired` as `false` from an older API.

- [X] T027 [P] [US3] Add compatibility tests: in `apps/api` (switch off) a request body exactly as the previous site sends it (no `captchaToken`) is accepted for the three routes, and a body with `captchaToken` is accepted and ignored; in `apps/web` `getRegistration` against a response without `captchaRequired` yields `captchaRequired: false` and renders no widget; in `packages/shared` a response with an unknown extra key still parses (tolerant response schema).
- [X] T028 [P] [US3] Edit `render.yaml`: add `CAPTCHA_ENABLED` and `TURNSTILE_SECRET_KEY` with `sync: false`, with a comment in the style of `REGISTRATION_ENABLED` (set only in the Render dashboard, restart to apply, no `value` here).
- [X] T029 [P] [US3] Edit `.github/workflows/ci.yml` (e2e job env: keep `CAPTCHA_ENABLED: 'false'` explicit so the real Turnstile is never contacted) and `.github/workflows/deploy.yml` / the Pages build step to pass the public `VITE_TURNSTILE_SITE_KEY` from a repository variable (`vars.VITE_TURNSTILE_SITE_KEY`, not a secret), without breaking the build when it is unset.
- [X] T030 [US3] Edit `docs/deploy.md`: new section "Captcha (Turnstile)" with the variable table (`CAPTCHA_ENABLED`, `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`, `APP_BASE_URL` as hostname), how to create the widget in the Cloudflare dashboard (managed or invisible mode, list the site's domain among its hostnames, free plan up to 10 hostnames and 20 widgets), the rollout order (1. set `CAPTCHA_ENABLED=false` in Render before publishing this version because production defaults to `true` and the API refuses to start without the secret; 2. publish API, `shared` and site; 3. set the secret and the site key and republish the site; 4. set `CAPTCHA_ENABLED=true` and restart), the emergency off (set `false`, restart; no new site release needed), the fail-closed behavior and the error the user sees.
- [X] T031 [P] [US3] Edit `docs/design.md` (item 20 on sign-up: mention the captcha on the three e-mail routes and the switch) and `CLAUDE.md` (add a "Feature 049" bullet in the style of the others: the three protected routes, order registration-closed → captcha → limits, `400 captcha-failed`, `platform/captcha/` entry, `CAPTCHA_ENABLED` default per environment, `captchaRequired` in `GET /api/auth/registration`, widget per screen with `action` `signup`/`resend`/`forgot`, no CSP change). Keep the CLAUDE.md text short and in English like the rest.
- [X] T032 [US3] Verify the startup guard end to end: add cases to `apps/api/src/config.test.ts` or `src/server.test.ts` (whichever tests start-up) that `loadConfig({ NODE_ENV: 'production', ... })` with the secret missing throws "TURNSTILE_SECRET_KEY: obrigatória com CAPTCHA_ENABLED=true", with `CAPTCHA_ENABLED=false` does not, and that the thrown text never includes the secret value.
- [X] T039 [US3] Make the start-up error for a missing `TURNSTILE_SECRET_KEY` name the production default and the `CAPTCHA_ENABLED=false` way out in `apps/api/src/config.ts`; document it and the in-flight cap in `docs/deploy.md` and `CLAUDE.md`.

**Checkpoint**: all three stories independently verifiable; docs match the behavior.

---

## Phase 6: Polish & Cross-Cutting

- [X] T033 Run `npm run format`, `npm run lint` (includes `check:deps`), `npm run typecheck`, `npm test`, `npm run test:int` and `npm run build`; fix what they report.
- [X] T034 Run `npm run check:ids` and `npm run check:branch` (the branch name is `feat/049-captcha-cadastro-recuperacao`; rename the current branch before the push if it still has the old name).
- [ ] T035 Walk through `quickstart.md` section 3 by hand in a browser with the Cloudflare test keys (switch on, `1x…AA` site key and secret; then `3x…FF` for the interactive challenge, both themes, keyboard only, blocked `challenges.cloudflare.com`). Done: the real `siteverify` answer of the test secret was checked on 2026-10-29 and recorded in `research.md` D3 (`hostname: example.com`, no `action`, so the API refuses by design). Open: the in-browser walk and the first real widget in production.
- [ ] T036 Check the commit plan: one `feat(shared)`/`feat(api)` commit and one `feat(web)` commit (conventional commits, English, no `Co-Authored-By` or AI attribution per CLAUDE.md), `docs`/`ci` commits for T028 to T031; the PR title in Conventional Commits format.


---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. Phase 2 blocks everything: T003 (shared) before T004 to T011; T004 before T007/T010; T005 before T006/T007; T009 before T014/T015.
- US1 (T012 to T016) needs only Phase 2. US2 (T017 to T026) needs Phase 2 (T003 and T011 for the flag) and works against the fake script, so it does not wait for US1; for a real end-to-end run it needs US1. US3 (T027 to T032) needs Phase 2; the docs tasks can run any time after Phase 2.
- Within a story: tests [P] first (they fail), then implementation. T014 and T015 touch different files and can run in parallel; T022 and T023 share `ResendLink.tsx` and `messages.ts` through T022/T023, so do T022 before T023.

### Parallel opportunities

- Phase 2: T005 and T008 beside T003/T004; T006 after T005.
- US1: T012, T013 and T016 in parallel; then T014 and T015 in parallel.
- US2: T017, T018, T019 and T026 in parallel; then T020 and T021; then T022, T023.
- US3: T027, T028, T029, T031 in parallel.

## Implementation Strategy

1. **MVP = Phase 1 + 2 + US1**: the API alone already blocks scripted abuse (switch kept off in production until the site is ready).
2. Add US2 so people can pass the check; publish both together (the site only shows the widget when the API says so).
3. US3 closes the rollout (docs, host config, compatibility proof); then turn `CAPTCHA_ENABLED=true` on in Render as the last, reversible step.

---

description: "Task list for the public landing page and search indexing"
---

# Tasks: Landing page pública e indexação no Google

**Input**: Design documents from `/specs/048-landing-page-indexacao/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/delivery.md, quickstart.md

**Tests**: Included (plan.md: unit, axe in both themes, built-HTML test, e2e).

**Organization**: Grouped by user story. Web only (`apps/web`) plus `.github/workflows/deploy.yml`, `docs/` and the constitution; no API, storage or contract change. Paths are under `apps/web/` unless they start with `.`, `docs/`, `specs/` or `CLAUDE.md`. Each component lives in its own folder with `.module.css` and tests (feature 037 rule). Colours come from theme tokens, never fixed. Commits: Conventional Commits in English, scope `web`, no AI attribution trailer (CLAUDE.md). The constitution amendment (T002) is its own commit and comes before any commit that touches `public/_headers`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 to US5 (spec.md)

---

## Phase 1: Setup

- [X] T001 Use Context7 (`resolve-library-id` then `query-docs`) to re-confirm before coding: Cloudflare Pages `_headers` `! Header` detach and splat order, Vite 8 `build({ build: { ssr } })` called from a plugin `buildStart`, `transformIndexHtml` with `order: 'post'` and `this.emitFile`, `StaticRouter` from `react-router` 7 with `renderToString`, `@fontsource-variable/fraunces` import path and axes, and React 19 `createRoot` replacing existing `#root` content. Record any difference in `specs/048-landing-page-indexacao/research.md` (R1, R2, R7). No code change.
- [X] T002 Amend `.specify/memory/constitution.md` to 5.0.0: rewrite principle VIII so only the landing (`/`) may be indexed and every other page keeps the non-indexing instructions, keep "content MUST NOT be redistributed" and attribution rules; add "Emenda 5.0.0 (2026-10-28)" in Governance with justification (issue #122, feature 048, the landing has only own text and no source content) and migration plan (feature 048 changes `_headers`, `robots.txt`, router; until it ships, code stays stricter and conforms); update the version line. Update the principle-VIII row of `specs/048-landing-page-indexacao/plan.md` from "CONFLITO" to "Emendado em 5.0.0". Commit alone as `docs: amend constitution to allow indexing the landing page`.
- [X] T003 [P] Add the dependency: `npm install @fontsource-variable/fraunces -w @cruzadinha/web` (updates `package-lock.json`); import its latin subset in `src/shared/themes/fonts.css` with the comment style already used there. Confirm `npm run build -w @cruzadinha/web` still passes.

---

## Phase 2: Foundational (blocking)

**Purpose**: the calendar leaves `/` so the landing can take it (FR-001), and `check:deps` knows the new feature.

**⚠️ CRITICAL**: US1 to US5 depend on this phase.

- [X] T004 Edit `.dependency-cruiser.cjs`: extend the rule at the `account|status` entry so `landing` also imports no feature, and make sure `landing` is outside `FEATURE_ORDER`. Create `src/features/landing/index.ts` as an empty-export placeholder to be filled by US1 so `npm run check:deps` runs on the new folder.
- [X] T005 Edit `src/app/router.tsx`: move `{ path: '/', element: <LibraryPage />, loader: directPlayLoader(queryClient) }` to `/calendario` with no direct-play loader (it keeps its place in the `viewerLoader` group). Add `{ path: '/calendario', element: <LibraryPage /> }`.
- [X] T006 [P] Replace links that mean "library" with `/calendario`: `src/shared/components/NotFoundPage/NotFoundPage.tsx`, `src/shared/components/RequiresConnection/RequiresConnection.tsx`, `src/pages/game/GamePage.tsx`, `src/features/game/components/board/ReadModeBanner/ReadModeBanner.tsx`, `src/features/game/components/dialogs/CompletionDialog/CompletionDialog.tsx` (`navigate('/calendario')`). Leave `RegisterForm` "Jogar sem entrar" and the header brand on `/`. Edit `src/features/session/helpers/redirect.ts` so the default after login is `/calendario` (keep `/login`/`/cadastro` rejection and the `//` and `/\` guards). Update the unit tests that assert the old targets (`redirect.test.ts`, `NotFoundPage`, `RequiresConnection`, `ReadModeBanner`, `CompletionDialog`).
- [X] T007 [P] Edit `src/app/AppLayout.tsx` and `AppLayout.module.css`: add a "Calendário" link (T014's `LandingShell` renders the same link, so keep the markup and classes in step) (`<Link to="/calendario">`, text link style, not a button) in the header next to the brand, hidden nowhere; keep one `h1` per page rule untouched. Update `AppLayout.test.tsx`.
- [X] T008 Switch every e2e spec and e2e support file that uses `page.goto('/')` or `location.pathname === '/'` to mean the calendar to `/calendario` (`e2e/*.spec.ts`, `e2e/*.support.ts`; about 50 files; the specs for "Ir direto ao jogo" in `e2e/configuracoes.spec.ts` and `e2e/ajustes-configuracoes.spec.ts` that open the root keep `/`, with two required changes in `configuracoes.spec.ts`: the `MutationObserver` that watches for the calendar checks `location.pathname === '/calendario'`, and the closing step "a volta pelo cabeçalho fica no calendário" (logo click expecting the "Hoje" `h1`) becomes two steps: the logo goes to the game again, and the "Calendário" header link reaches the "Hoje" `h1`). Switch unit tests (`src/pages/library/*.test.tsx`, `src/test/`) that render `/` as the library to `/calendario`. Run `npm test -w @cruzadinha/web` and fix leftovers.
- [X] T009 Edit `src/pages/library/direct-play.ts`: when the decision is `stay`, store `{ directPlay }` in a module variable (`takeDirectPlayStay()` returns it once and clears it, in the style of `source-choice.ts`) and return `replace('/calendario')`; `go` still returns `replace(href)`; `null` cases unchanged. Drop the `handled` once-per-load flag and the `initialPath !== '/'` check: the loader now decides on every navigation to `/` (initial load and header logo), per the 2026-10-28 clarification and FR-002; the feature 021 rule that going back to the calendar through the header does not repeat the shortcut no longer applies because the calendar lives at `/calendario`. Add the `initialPath`/`handled` removal to the `direct-play.test.ts` updates: a second call decides again. Edit `src/pages/library/LibraryPage.tsx` to read the notice with `takeDirectPlayStay()` instead of `useLoaderData`/`isDirectPlayData`; remove `DirectPlayData`/`isDirectPlayData` if unused. Update `direct-play.test.ts` and `LibraryPage.test.tsx`.

**Checkpoint**: calendar works at `/calendario`, `npm run lint`, `npm run typecheck` and `npm test -w @cruzadinha/web` clean. `/` shows nothing useful yet (placeholder).

---

## Phase 3: User Story 1 - Entender o site e começar a jogar (Priority: P1)

**Goal**: `/` shows the landing; the main call to action reaches today's game in two clicks; "Ir direto ao jogo" still skips it; the calendar is one link away.

**Independent Test**: open `/` with no account: one `h1`, three cards, features row, final band; "Jogar a cruzada de hoje" ends on the default source's game; with `directToGame` on, `/` goes to the game.

- [X] T010 [P] [US1] Create `src/pages/play-today/play-today.ts` with `playTodayLoader()` returning `replace(`/dia/${todayInBrasilia()}?fonte=${DEFAULT_SOURCE}`)`, where `DEFAULT_SOURCE` is the first item of `puzzleSourceIdSchema.options` (same rule the calendar uses; reuse the existing helper if `features/library` or `shared` already exports one, otherwise read it from `shared`). Add `play-today.test.ts` (fixed clock: redirect target, source default) and register `{ path: '/jogar', loader: playTodayLoader }` in `src/app/router.tsx` inside the `viewerLoader` group so `/dia/...` gets the same server wait it has today.
- [X] T011 [P] [US1] Create `src/features/landing/components/Hero/Hero.tsx` (+ `.module.css`, `Hero.test.tsx`): the only `h1` (text "Cruzadinha" as real text, decoration cells `aria-hidden`), one-sentence pitch, primary `Button` link (`buttonClass`) "Jogar a cruzada de hoje" to `/jogar`, and a text link "Experimentar aqui" to `#mini-cruzada`. No animation yet (US5).
- [X] T012 [P] [US1] Create `src/features/landing/components/FeatureCards/FeatureCards.tsx` (+ `.module.css`, test): three cards (jogar sem conta; N fontes de cruzadas where N is `puzzleSourceIdSchema.options.length`, written out in words by a small helper with a test for 1 to 9; funciona sem internet) as `h2` sections, plus the smaller-features row (modo lápis, atalhos de teclado, tema claro e escuro). Text fixed in Portuguese, no source content.
- [X] T013 [P] [US1] Create `src/features/landing/components/FinalBand/FinalBand.tsx` (+ `.module.css`, test): heading, one sentence, primary link "Jogar agora" to `/jogar`, text link "Ver o calendário" to `/calendario`.
- [X] T014 [US1] Create `src/features/landing/components/LandingContent/LandingContent.tsx` (+ `.module.css`, test) composing Hero, FeatureCards and FinalBand as sections only (no `<main>`: the layout owns `<main id="conteudo">`), and export it from `src/features/landing/index.ts` (the barrel exports only `LandingContent`). Create `src/app/LandingShell.tsx` (+ test): the static copy of the layout's left side used only by the pre-render (F1): skip link, header with the brand `Link` to `/` and the "Calendário" `Link`, and `<main id="conteudo" tabIndex={-1}>` around `LandingContent`, reusing the classes of `AppLayout.module.css` so the header and main sit in the same place as in the real `AppLayout` (the right-hand actions, session and settings buttons appear after mount without moving `main`). Test: one `h1`, links' `href`s, `vitest-axe` clean, and the shell and `AppLayout` render the same brand and calendar link markup.
- [X] T015 [US1] Create `src/pages/landing/LandingPage.tsx` (+ test) rendering `LandingContent`. Edit `src/app/router.tsx`: add `{ path: '/', element: <LandingPage />, loader: directPlayLoader(queryClient), hydrateFallbackElement: <LandingFallback /> }` as a child of the layout and **outside** the group guarded by `serverReadyLoader`, with its own `errorElement: <RouteError />`; the loader needs no extra `viewerLoader`. `LandingFallback` (in `src/pages/landing/`) renders `<LandingPage />` when `getSettings().directToGame` is false and `<ServerWake />` (from `features/status`) when it is true, so a person going straight to the game sees the wake screen, never the landing or a blank page, while the loader waits for the API (FR-002). Extend `src/app/router.test.tsx`: `/` renders without calling `waitForServer`; with `directToGame` on and a stay decision it lands on `/calendario` with the notice; with a go decision it lands on the game, also when reached again through the header logo after a first visit; with `directToGame` on the fallback renders the wake screen.
- [X] T016 [P] [US1] Add `e2e/landing.spec.ts` scenarios for US1: root shows the landing without an account, "Jogar a cruzada de hoje" ends on a `/jogo/...` page in at most 2 clicks (SC-002), "Calendário" header link and "Ver o calendário" reach the library, `directToGame` on at `/` goes to the game, and clicking the header logo after a first visit goes to the game again (FR-002, SC-008).

**Checkpoint**: US1 works in dev (`npm run dev -w @cruzadinha/web`), MVP of the page is usable.

---

## Phase 4: User Story 2 - Ser encontrado no Google (Priority: P1)

**Goal**: the landing text is in the delivered HTML, only `/` is indexable, a sitemap lists it, other routes stay `noindex`.

**Independent Test**: build, then read `dist/index.html` without scripts (quickstart 1) and check headers (quickstart 2).

- [X] T017 [US2] Create `src/landing-entry.tsx` exporting `renderLanding(): string` (`renderToString` of `<StaticRouter location="/"><LandingShell /></StaticRouter>`; imports only `app/LandingShell` and `react-router`). Add `src/landing-entry.test.tsx` checking the output has one `<h1`, one `<main id="conteudo"`, the skip link, the call-to-action text and, once US4 lands, every `puzzleSourceNames` value (assert the US1 text now; US4 extends it).
- [X] T018 [US2] Create `prerender-plugin.ts` (next to `vite.config.ts`, imported with its `.ts` extension like `version-plugin.ts`): a build-only plugin that skips itself when `config.build.ssr` is set (no recursion). In `buildStart` it runs `build()` with `configFile: false`, `plugins: [react()]`, `build: { ssr: 'src/landing-entry.tsx', outDir: <dir inside node_modules/.cache>, emptyOutDir: true, write: true }` and no `codeSplitting` groups, imports the result and keeps `renderLanding()`. A `transformIndexHtml` hook with `order: 'post'` puts that HTML inside `#root`, so the PWA plugin hashes the final `index.html` (F2: never rewrite `dist/index.html` after the bundle is written). In `generateBundle` it emits `sitemap.xml` (single `<loc>${SITE_URL}/</loc>`) and `robots.txt` (`User-agent: *`, `Disallow: /api/`, plus `Sitemap: ${SITE_URL}/sitemap.xml` with `SITE_URL`) with `this.emitFile`, and logs a warning, emitting no sitemap and no `Sitemap` line, when `SITE_URL` is unset. Validate `SITE_URL` as an `https?://` origin without trailing slash; abort the build on a malformed value. Register it in `vite.config.ts` before `VitePWA`. Delete `public/robots.txt` (now generated).
- [X] T019 [US2] Edit `index.html`: landing `<title>` (e.g. "Cruzadinha: cruzadas grátis para jogar online") and `<meta name="description">` (one plain-text sentence), and, immediately after `<div id="root"></div>`, an inline `<script>` that empties `#root` when `location.pathname !== '/'` or when `cruzadinha:settings` parses with `settings.directToGame === true` (same defensive `try/catch` style as the theme script; field name from `settingsSchema` in `shared`). Keep the existing theme script.
- [X] T020 [US2] Edit `public/_headers`: keep `/*` `noindex, nofollow` and add, after it, `/`, `/sitemap.xml` and `/robots.txt` each with `! X-Robots-Tag` (exact block in `contracts/delivery.md`); update the leading comment (constitution VIII, feature 048). Keep every other rule. The commit comes after T002's commit.
- [X] T021 [P] [US2] Create `scripts/check-build-output.mjs` in `apps/web` and an npm script `check:build-output` (`node scripts/check-build-output.mjs`, run after `npm run build`; not part of `npm test`, F4): asserts invariants 1 and 2 of `contracts/delivery.md` on `dist/index.html` (one `<h1`, one `<main id="conteudo"`, title, description, every CSS-module class used in the pre-rendered `#root` exists in the built CSS), the `sitemap.xml` and `robots.txt` content, and that the `index.html` revision listed in `dist/sw.js` matches the file's content hash (F2). Add a step running it right after `npm run build` in `.github/workflows/ci.yml` (with `SITE_URL=https://exemplo.pages.dev`). Add unit tests that stay in `npm test`: `public/_headers` parsed (`/*` has `noindex`; `/`, `/sitemap.xml`, `/robots.txt` detach it; no other rule sets `X-Robots-Tag`) in `src/headers.test.ts`, and the inline script of T019 extracted from `index.html` and run in jsdom for `/`, `/calendario`, and `directToGame` on and off.
- [X] T022 [P] [US2] Edit `.github/workflows/deploy.yml` "Verificar" step: replace `curl -fsSI "$SITE_URL/" | grep -i '^x-robots-tag:.*noindex'` with checks that `/` has no `x-robots-tag`, that `/calendario`, `/jogo/x` and `/conta` each have `noindex` (F5), and that `$SITE_URL/sitemap.xml` returns 200 containing `$SITE_URL/`. Make sure the web build step exports `SITE_URL` in its `env`.
- [X] T023 [P] [US2] Edit `docs/deploy.md`: `SITE_URL` is now also a build input (sitemap and `robots.txt`), indexing rules (only `/`), how to request indexing in Search Console, and the verification commands of quickstart 2 against the published site. Edit `README.md` or `docs/design.md` only if they state that the site is not indexed (grep `noindex`).

**Checkpoint**: `SITE_URL=https://exemplo.pages.dev npm run build -w @cruzadinha/web` passes quickstart 1; `npx wrangler@4.151.1 pages dev apps/web/dist` shows the headers of quickstart 2.

---

## Phase 5: User Story 3 - Experimentar uma cruzada na própria página (Priority: P2)

**Goal**: a playable 5x5 on the landing with mouse, keyboard and phone keyboard; no API, no storage.

**Independent Test**: "Experimentar aqui" scrolls to it, a word is filled with each input type, the page makes no `/api` request.

- [X] T024 [P] [US3] Create `src/features/landing/helpers/sample.ts` with the 5x5 sample (`puzzle` and `solution` in the internal format, invented words and clues, at least four words, Portuguese, accented letters avoided or handled with `plainLetter`) and `sample.test.ts` validating both with `puzzleSchema.safeParse` / `solutionSchema.safeParse` and checking that every clue text is non-empty. First read `packages/shared/src/puzzle/` for the exact shape and `src/test/fixtures` for an existing 5x5 to copy the structure (not the content).
- [X] T025 [US3] Create `src/features/landing/components/MiniCrossword/MiniCrossword.tsx` (+ `.module.css`, `MiniCrossword.test.tsx`): builds `GameState` from `domain/game` for the sample; cells as focusable elements inside `role="grid"` with roving tabindex; click/touch selects (second click on the selected cell toggles direction, like the board); arrow keys, letters, Backspace, Delete, Tab/Shift+Tab, Home/End go through `domain/game` reducer actions; a visually hidden `<input>` receives focus on touch/click so the phone keyboard opens and its `input`/`beforeinput` letters are dispatched as `type` actions; current clue shown below the grid; selected cell, active word, block, filled letter use theme tokens with the contrast the constitution asks; on completion (compared with `plainLetter`) shows "Você completou a mini cruzada!" and a primary link "Jogar a cruzada de hoje" to `/jogar`. The root element has `id="mini-cruzada"` and `scroll-margin-top`. No `fetch`, no `localStorage`, no IndexedDB, no clock. Tests: keyboard fill of a word, click selection, phone-input path with `userEvent`, completion message, `vitest-axe` clean, and a test that stubs `fetch`/`indexedDB` and fails if touched (FR-009).
- [X] T026 [US3] Add `MiniCrossword` to `LandingContent` (between FeatureCards and FinalBand, in a section with its own `h2` "Experimente aqui"); extend `LandingContent.test.tsx` and `src/landing-entry.test.tsx` (the grid is in the pre-rendered HTML). Make sure `renderToString` of the component is deterministic (no `Math.random`, no `Date`, no `useId` in text).
- [X] T027 [P] [US3] Extend `e2e/landing.spec.ts`: "Experimentar aqui" scrolls the grid into view (with reduced motion: no smooth behaviour, `page.emulateMedia({ reducedMotion: 'reduce' })`), a word is filled by physical keyboard and by `locator.pressSequentially` on the hidden input, completion message appears after solving, and `page.on('request')` records no `/api` call during the mini game (SC-006).

---

## Phase 6: User Story 4 - Fontes sempre em dia com o jogo (Priority: P2)

**Goal**: the sources section follows the game's list; a missing description fails `typecheck`.

**Independent Test**: quickstart 4.

- [X] T028 [P] [US4] Create `src/features/landing/helpers/source-descriptions.ts`: `export const SOURCE_DESCRIPTIONS: Record<PuzzleSourceId, string>` with one or two short original sentences per source (who publishes it and the kind of crossword, as the existing `specs/003-*`, `014-*`, `029-*`, `030-*` findings and the library's source tabs describe it; no clue text, grids or logos; say the content belongs to the source). Add `source-descriptions.test.ts` asserting a non-empty description for every `puzzleSourceIdSchema.options` id and no extra keys.
- [X] T029 [US4] Create `src/features/landing/components/SourcesSection/SourcesSection.tsx` (+ `.module.css`, test): `h2`, a list over `puzzleSourceIdSchema.options` (game order) showing `puzzleSourceNames[id]` and `SOURCE_DESCRIPTIONS[id]`, plus a closing line that the crosswords belong to their sources. Test: one item per option in order; mock the options list with an extra id to show it appears (a `vi.mock` of `@cruzadinha/shared` limited to the list, or pass the list as a prop defaulting to the real one: prefer the prop); `vitest-axe` clean.
- [X] T030 [US4] Add `SourcesSection` to `LandingContent` (after the cards); extend `LandingContent.test.tsx` and `src/landing-entry.test.tsx` so every `puzzleSourceNames` value is in the pre-rendered HTML (SC-001). Run quickstart 4 once by hand (temporary extra source without a description fails `npm run typecheck`) and revert; do not commit the temporary change.

---

## Phase 7: User Story 5 - Aparência e conforto em qualquer tela (Priority: P3)

**Goal**: animation, themes, reduced motion, 360 px, contrast and focus.

**Independent Test**: quickstart 3 accessibility and layout scenarios.

- [X] T031 [US5] Edit `Hero.tsx` and `Hero.module.css`: title letters in crossword cells falling in with `transform`/`opacity` keyframes inside `@media (prefers-reduced-motion: no-preference)` only (staggered with a CSS custom property per letter, no JS timers), cell boxes with reserved size in `em` so nothing moves, the font Fraunces with `font-display: swap` fallback metrics (`size-adjust` or a close system serif) to avoid a shift when it loads. Without the media query match, the title is static and complete. Add tests that read the CSS with `readCss('Hero.css')` from `src/test/css-file.ts`: animation declared only under `prefers-reduced-motion: no-preference`; no `width`/`height`/`top`/`margin` in the keyframes.
- [X] T032 [P] [US5] Edit `src/shared/themes/global.css` or `LandingContent.module.css`: `html { scroll-behavior: smooth }` only under `prefers-reduced-motion: no-preference` (check that `global.css` has no conflicting rule), `scroll-margin-top` on the anchor target, `overflow-x: clip` not needed if no overflow exists (fix the cause instead). Test with `readCss`.
- [X] T033 [P] [US5] Extend `LandingContent.test.tsx` with `vitest-axe` runs in light and dark (set `data-theme` on `document.documentElement`, as the `Dialog`/`ShortcutsDialog` tests do) and a focus-visible check: every interactive element is reachable by Tab in DOM order and has a non-`none` focus outline in the CSS.
- [X] T034 [P] [US5] Extend `e2e/landing.spec.ts`: viewport 360x740, `scrollWidth <= clientWidth` (no horizontal scroll) in both themes; `@axe-core/playwright` clean in both themes; reduced motion shows the full title with no running animation (`document.getAnimations()` empty); layout-shift check in the style of `e2e/sem-saltos.spec.ts` (measure the bounding boxes of the title and the first card before and after the animation, or use a `PerformanceObserver` for `layout-shift`, total 0).

---

## Phase 8: Polish & cross-cutting

- [X] T035 [P] Edit `CLAUDE.md`: add the "Feature 048" bullet (landing at `/`, calendar at `/calendario`, `/jogar`, pre-render in `index.html` through `prerender-plugin.ts`, the inline script that empties `#root`, `_headers` detach rule, generated `robots.txt` and `sitemap.xml` from `SITE_URL`, `features/landing` rule in `check:deps`, `takeDirectPlayStay`, direct play now running on every arrival at `/`, which replaces the once-per-load rule of feature 021, constitution 5.0.0) and fix the lines that say the site is `noindex` everywhere (Product, Build, `public/_headers and public/robots.txt`). Keep it short, in the style of the neighbouring feature bullets.
- [X] T036 Run the full gate from the repository root: `npm run format:check`, `npm run lint` (includes `check:deps`), `npm run typecheck`, `npm test`, `npm run build` (with `SITE_URL` set), `npm run check:ids`, then `npm run test:e2e -w @cruzadinha/web` against a local API with the seed (see CLAUDE.md for the separate-database setup). Fix failures; do not skip hooks.
- [X] T037 Walk through `specs/048-landing-page-indexacao/quickstart.md` end to end, including the `wrangler pages dev` header check, and note anything that differs in `quickstart.md`. Confirm the PWA precaches the pre-rendered `index.html` with the final revision (`dist/sw.js`, also checked by `check:build-output`) and that the landing opens offline in a built preview with the network disabled (spec edge case, FR-014).

---

## Dependencies & Execution Order

- Phase 1: T001 and T003 are independent; T002 is its own commit and must precede any commit with T020.
- Phase 2 blocks everything: T004 → T005 → (T006, T007 in parallel) → T008 → T009. T014 (`LandingShell`) copies the header markup T007 adds, so T007 comes first.
- US1 (Phase 3) after Phase 2. US2 (Phase 4) needs `LandingContent` from T014, so start it after US1's T014; the router work of T015 and T017 to T023 can then run in parallel with US1's tail. US3 and US4 need T014 (they add sections to `LandingContent`) and are independent of each other; US2's tests T017/T021 are extended by T026 and T030. US5 needs the Hero (T011) and a complete page.
- Within a story: component tasks marked [P] first, then the composing task, then e2e.
- Polish after all stories.

## Parallel examples

- After T014: T017/T018 (US2) alongside T024 (US3) and T028 (US4).
- US1: T010, T011, T012, T013 together.
- US2 closing: T021, T022, T023 together.
- US5: T032, T033, T034 together after T031.

## Implementation strategy

- **MVP**: Phases 1 to 4 (setup, calendar move, landing, indexing): the page exists, explains the site, and is indexable. Ship behind the constitution amendment.
- **Increment 2**: US4 (sources, small) then US3 (mini crossword).
- **Increment 3**: US5 polish and the final gate.
- Release note: the version bump comes from Conventional Commits (`feat(web): ...`), the constitution commit is `docs:`.

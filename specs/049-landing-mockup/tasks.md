---

description: "Task list for the landing page aligned to the mockup"
---

# Tasks: Landing page alinhada ao mockup

**Input**: Design documents from `/specs/049-landing-mockup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Included (plan.md: component tests, axe in both themes, built-HTML check, e2e).

**Organization**: Grouped by user story. Web only, inside `apps/web/src/features/landing/` plus its tests, `e2e/`, `scripts/check-build-output.mjs`, `specs/` and `CLAUDE.md`. No API, route, storage, `shared/themes`, `shared/components/Button`, `prerender-plugin.ts` or `_headers` change (FR-014, FR-018). Paths are under `apps/web/` unless they start with `specs/` or `CLAUDE.md`. Each component lives in its own folder with `.module.css` and tests (feature 037 rule). Colours come from theme tokens, never fixed; only `--grid-line`, `--band` and `--band-ink` are new, derived from `--ink` and `--surface` with `color-mix()` and `light-dark()` in the landing CSS (research R1). Visible text is the mockup's (https://claude.ai/artifact/5SdYtHc7FbzT2JibcmHLc4) as listed in `contracts/ui-contract.md`; the source count is always computed (`puzzleSourceIdSchema`, `feminineCount`). Commits: Conventional Commits in English, scope `web`, no AI attribution trailer (CLAUDE.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 to US5 (spec.md)

---

## Phase 1: Setup

- [X] T001 Record the baseline before touching code: run `npm test -w @cruzadinha/web -- landing` and `npm run build -w @cruzadinha/web` on the branch, and note the CSS size of `dist/assets/*.css` in `specs/049-landing-mockup/research.md` (R7) so the polish phase can compare. Confirm `grep -n "light-dark\|color-scheme" src/shared/themes/light.css src/shared/themes/dark.css` shows `color-scheme` in the same selectors that switch the theme (research R1). No code change.

---

## Phase 2: Foundational (blocking)

**Purpose**: the pieces every story uses: the landing button, the layout that lets one band run edge to edge, and the new sample.

**⚠️ CRITICAL**: US1 to US5 depend on this phase.

- [X] T002 [P] Create `src/features/landing/components/LandingButton/LandingButton.tsx` and `LandingButton.module.css`: `landingButtonClass({ variant: 'primary' | 'quiet', size?: 'small' })` returning the class names, same pattern as `buttonClass` in `shared/components/Button/Button.tsx` (usable on `Link`, `a` and `button`). Primary: `background-color: var(--sel)`, `color: var(--sel-ink)`, `border: 2px solid var(--ink)`, `box-shadow: 4px 4px 0 var(--ink)`, no underline, `min-height: var(--tap)`, `font: 700 1rem/1 var(--font)`; with `@media (hover: hover)` hover moves `translate(-2px, -2px)` and the shadow to `6px 6px 0`; `:active` moves `translate(3px, 3px)` with `1px 1px 0`. Quiet: transparent background, `border-color: var(--line)` (`var(--ink)` on hover), no shadow. `small`: `padding: 10px 14px`, `font-size: .9rem`, `box-shadow: 3px 3px 0`, still `min-height: var(--tap)`. Transitions on `transform` and `box-shadow` only, off under `prefers-reduced-motion: reduce`. Focus ring comes from the site's global `:focus-visible`. Add `LandingButton.test.tsx` (classes per variant and size, link and button usage) and a CSS test with `readCss('LandingButton.css')` asserting no fixed hex colours and the reduced-motion rule.
- [X] T003 [P] Replace `src/features/landing/helpers/sample.ts` with the mockup's sample (`data-model.md`): grid `COSTA / A#O#T / MUNDO / P#D#M / OCASO`, same blocks and numbers as today, across clues 1 "Faixa de terra junto ao mar", 4 "O planeta Terra", 5 "Pôr do sol"; down 1 "Terreno de futebol ou de plantação", 2 "Aparelho que mede a profundidade", 3 "Partícula de matéria (sem acento)"; `SAMPLE_SOLUTION` with the same letters. Update `sample.test.ts`: the pair still passes `puzzleSchema.safeParse` and `solutionSchema` and the six answers read COSTA, MUNDO, OCASO, CAMPO, SONDA, ATOMO.
- [X] T004 Create `src/features/landing/helpers/mini-state.ts` with `miniGame` (the `createGame` of the sample, no limits, moved from `MiniCrossword.tsx`), `START_STATE` (built with `miniGame.reducer`: `select` (0,0) then `type` C, O, S, so the selection ends on (0,3)), `miniReducer(state, action | 'clear')` (`'clear'` returns `START_STATE`, anything else goes to `miniGame.reducer`) and `solvedWords(state): readonly { number: number; direction: Direction }[]` comparing each word's cells with the solution through `plainLetter` from `domain/game/letters`. Pure, no React, no storage. Add `mini-state.test.ts`: `START_STATE` has exactly `C`, `O`, `S` in row 0 and nothing else; `'clear'` after typing returns to it; `solvedWords` is empty at the start, lists 1H after COSTA is completed (`CÓSTA` with an accent also counts) and has six entries when solved; no `localStorage`/`indexedDB` access (spy). Depends on T003.
- [X] T005 Restructure `src/features/landing/components/LandingContent/LandingContent.tsx` and `.module.css` (research R1, R6, R8): root `.landing` with the landing tokens, none a fixed colour (`--grid-line: color-mix(in srgb, var(--ink) 7%, transparent)`, `--band: light-dark(var(--ink), var(--surface))`, `--band-ink: light-dark(var(--surface), var(--ink))`), `--font-display: 'Fraunces Variable', Georgia, 'Times New Roman', serif`, and the typography of the page (body `font-family: var(--font)`, `font-size: 16px`, `line-height: 1.55`; headings `var(--font-display)`; kickers `var(--font-mono)`), `overflow-x: clip`; no `max-width` on the root. Render `<Hero />` (full width, owns its inner), then `<div className={styles.wrap}>` (`max-width: 1080px`, auto margins, gutter with `env(safe-area-inset-*)` as today) around `FeatureCards`, `MiniCrossword` and `SourcesSection`, then `<FinalBand />` (full width). Optional scroll entrance (FR-016): inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`, `.wrap > section { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% entry 45%; }` with `@keyframes rise { from { transform: translateY(18px) } to { transform: none } }` (transform only: an `opacity` start, as in the mockup, fails axe contrast on sections still off screen; research R8); nothing outside those two conditions. Update `LandingContent.test.tsx`: sections keep their order, the page has one `h1`, the text "Prévia de design" is absent and no link has `href="#"` (FR-019), and a `readCss('LandingContent.css')` test that the `rise` animation sits only inside `prefers-reduced-motion: no-preference` and the file has no hex colour. Depends on T002.

**Checkpoint**: `npm run typecheck -w @cruzadinha/web` and `npm test -w @cruzadinha/web -- landing` pass with the old section components still in place.

---

## Phase 3: User Story 1 - Primeira impressão de "página de cruzada" (Priority: P1) 🎯 MVP

**Goal**: the top of the page matches the mockup: ten numbered cells, the highlight phrase, two buttons, grid and floating letters.

**Independent Test**: open `/` wide and at 360 px, with and without reduced motion, and compare the top with the mockup (quickstart step 3, items 1, 2 and 6).

- [X] T006 [US1] Rewrite `src/features/landing/components/Hero/Hero.tsx` and `Hero.module.css` (research R4, R5). Markup: `<section class=hero>` full width with the decorative `::before` grid (two `linear-gradient` with `var(--grid-line)`, 44 px, masked to fade down) inside a `position: relative; isolation: isolate; overflow-x: clip` container (never `100vw`); three `span aria-hidden="true"` floating letters `Ç`, `A`, `É` (46 px cells, `animation: drift 9s ease-in-out infinite alternate`, second one `background-color: var(--sel)` with `border-color: var(--ink)`), hidden under 820 px; an `.inner` (`max-width: 1080px`, gutter). Title: `container-type: inline-size; max-width: 820px`, a 10-column grid (`gap: 3px`) of `aria-hidden` cells `CRUZADINHA` with `aspect-ratio: 1`, `border: 2px solid var(--ink)`, `font: 800 8.2cqw/1 'Fraunces Variable', Georgia, serif`, numbers `1`, `2`, `3` on cells 1, 5, 7 (`<small>`, `font: 500 max(9px, 1.8cqw)/1 var(--font-mono)`, `color: var(--mute)`); animation only under `prefers-reduced-motion: no-preference`: `drop` (transform and opacity, `calc(var(--i) * 70ms)` delay) and `flash` (`background-color` from `var(--sel)` to `var(--cell)`, delay `+450ms`). Copy block below the title, two columns from 700 px up: the single `h1` = `<span class=sr>Cruzadinha: </span>Palavras cruzadas <em>todo dia</em>, sem cadastro e sem pressa.` (`font: 600 clamp(1.7rem, 4.2vw, 2.7rem) var(--font-display)`; `em` with `box-shadow: inset 0 -.38em 0 var(--sel)`, no italics), the lead paragraph (`color: var(--mute)`: "O jogo abre direto no navegador. Escolha entre quatro fontes…" using the computed count), and two actions: `<Link to="/jogar" className={landingButtonClass({ variant: 'primary' })}>Jogar a cruzada de hoje</Link>` and `<a href="#mini-cruzada" className={landingButtonClass({ variant: 'quiet' })} onClick={scrollToMini}>Experimentar aqui</a>` (keep `scrollToMini` and its reduced-motion handling from today's file). Use `var(--font-display)` from the `.landing` root (defined in T005). Rewrite `Hero.test.tsx`: one `h1` whose accessible name is "Cruzadinha: Palavras cruzadas todo dia, sem cadastro e sem pressa."; the ten cells and floats are `aria-hidden`; numbers on cells 1, 5, 7; both links with the right `href`; scroll test for "Experimentar aqui" kept; axe passes; CSS test via `readCss('Hero.css')`: animations only inside `prefers-reduced-motion: no-preference`, no `100vw`, no fixed hex colours.
- [X] T007 [US1] Update `e2e/landing.spec.ts` for the top: the `h1` name is the new phrase (use a regex `/Palavras cruzadas todo dia/`), "Jogar a cruzada de hoje" still reaches the game in at most 2 clicks, and the axe run still covers both themes. Extend `e2e/sem-saltos.spec.ts` with a landing case: measure the position of the h1, the two actions and the first section heading before and after the title animation ends (animation on) and assert they do not move.

**Checkpoint**: the top of the page is the mockup's; the rest still has the old look but works.

---

## Phase 4: User Story 2 - Seção "Como funciona" com a identidade do mockup (Priority: P1)

**Goal**: kicker, title, three icon cards (middle one lower on wide screens) and five pills.

**Independent Test**: scroll to "Como funciona" (quickstart step 3, item 3).

- [X] T008 [US2] Rewrite `src/features/landing/components/FeatureCards/FeatureCards.tsx` and `.module.css` (keep the folder name and export): `<section id="como" aria-labelledby>` with the kicker "Como funciona" (`font: 500 .8rem/1 var(--font-mono)`, `letter-spacing: .12em`, uppercase, `color: var(--accent)`), `h2` "Abriu, jogou. O resto é opcional." (`font: 800 clamp(1.7rem, 4vw, 2.5rem) var(--font-display)`, `max-width: 20ch`), three `article` cards (`border: 2px solid var(--ink)`, `background: var(--surface)`, `padding: 24px`, grid `repeat(auto-fit, minmax(240px, 1fr))`, gap 18 px, the second `translateY(18px)` only from 820 px up) each with an `aria-hidden` icon square (`1↓`, `2→`, `3↓`; 44 px, `background: var(--word)`, `border: 2px solid var(--ink)`) and an `h3` (`font: 600 1.35rem var(--font-display)`): "Sem conta para começar" ("Seu progresso fica guardado neste aparelho. Se quiser levar o jogo para outro lugar, crie uma conta depois."), "Uma cruzada por dia, de {count} fontes" using `feminineCount(SOURCE_COUNT)` as today ("A seção "Hoje" mostra uma cruzada de cada fonte e se você já começou, terminou ou ainda não tocou nela."), "Funciona até sem internet" ("Instale o site como aplicativo e baixe a cruzada de hoje para jogar no ônibus, no avião, onde for."). Below, a `ul` of five pills (`border: 1.5px solid var(--line)`, `border-radius: 99px`, `background: var(--surface)`, `color: var(--mute)`): "Modo lápis para rascunhar", "Atalhos de teclado (tecle ?)", "Tema claro e escuro", "Tabuleiro que se ajusta à tela", "Cronômetro que pausa sozinho". Update `FeatureCards.test.tsx`: the `h2`, three `h3`, the computed count follows `puzzleSourceIdSchema` (mock the list as today), five pills, the card order, axe, and a CSS test that the offset is only inside a `min-width` query.

**Checkpoint**: P1 stories done; the first two screens of the page match the mockup.

---

## Phase 5: User Story 3 - "Experimente" como no mockup (Priority: P2)

**Goal**: boxed 5x5 with side clue lists, count, solved marks, win message and Limpar.

**Independent Test**: solve the sample with mouse, keyboard and touch emulation (quickstart step 3, item 4).

- [X] T009 [US3] Rewrite `src/features/landing/components/MiniCrossword/MiniCrossword.tsx` and `.module.css` (research R9). Keep `keyAction`, the touch sink input, `onPointerDown`/`onInput`, `aria-activedescendant` and the section id `mini-cruzada`, but: `useReducer(miniReducer, START_STATE)`; `<section id="mini-cruzada">` with kicker "Experimente" and `h2` "Uma mini cruzada, bem aqui." (id `mini-cruzada-titulo`); two columns from 820 px (`grid-template-columns: repeat(2, minmax(0, 1fr))`, `gap: 40px`). Left: `.box` (`background: var(--surface)`, `border: 2px solid var(--ink)`, `padding: 20px`, `box-shadow: 8px 8px 0 var(--ink)`), grid as today with `max-width: 400px`, cell classes `word` (`--word`), `selected` (`--sel`), `ok` (`--ok-tint`, letter `--ok`) for every cell of a word in `solvedWords(state)`, `pop` (`transform: scale(1.14)` once, only with motion allowed) when a cell turns `ok`; under it a footer with `<p role="status" aria-live="polite">` ("{n} de 6 palavras certas." or, solved, "Resolvida! Amanhã tem outra." plus a `Link` "Jogar a cruzada de hoje" to `/jogar` styled with `landingButtonClass` primary `small`) and the "Limpar" button (`landingButtonClass` quiet `small`, `onClick={() => dispatch('clear')}`), always visible; reserve the footer height so nothing shifts. Right: two lists "Horizontais" and "Verticais" (`h3`, `font: 500 .8rem var(--font-mono)`, uppercase) with `li > button` per word (`selectWord` with `number` and `direction`; `aria-current` on the active one; `.done` = `text-decoration: line-through; color: var(--mute)` plus a `✓` marker with `aria-label`/visually hidden text "resolvida"), each text `"{clue} ({length})"`, and the hint paragraph "Clique de novo na mesma casa para trocar de direção. Setas andam pelo tabuleiro. As dicas são só desta amostra.". Tab/Shift+Tab: `nextWord`/`previousWord` with `preventDefault`, except Tab on the last word and Shift+Tab on the first, which are left alone so focus leaves the grid (no keyboard trap). Update `MiniCrossword.test.tsx`: starts with C, O, S and 0 of 6; typing COSTA's remaining letters ticks 1H (strikes, `✓`, count 1 of 6); `CÓSTA` accented also counts; solving all six shows the win message and the link; "Limpar" returns to C, O, S; clicking a clue button selects that word; Tab moves to the next word and leaves from the last; arrow, Backspace, Delete, Home and End as before; no `fetch`, `localStorage` or `indexedDB` calls (spies); axe passes; CSS test (`readCss('MiniCrossword.css')`): `pop` only inside `no-preference`, no fixed hex colours.
- [X] T010 [US3] Extend `e2e/landing.spec.ts`: "Experimentar aqui" scrolls to the mini crossword; solve the six words with the keyboard and see "Resolvida!"; assert zero requests to `/api/` during use and that `localStorage` and IndexedDB hold nothing from the mini crossword (reads `Object.keys(localStorage)` before and after).

---

## Phase 6: User Story 4 - Fontes, faixa final e tipografia do mockup (Priority: P2)

**Goal**: source rows with hover, full-width dark band, and the mockup's type families.

**Independent Test**: compare the sources section with the game's list and look at the band in both themes (quickstart step 3, items 5 and 6).

- [X] T011 [P] [US4] Rewrite `src/features/landing/components/SourcesSection/SourcesSection.tsx` and `.module.css`: `<section id="fontes">` with kicker "Fontes" and `h2` "{N} fontes, um só lugar." (N from `sources.length` as digits, per the contract; keep the `sources` prop for the test), a `ul` with `border-top: 2px solid var(--ink)`, one `li` per source with `h3` (`puzzleSourceNames[id]`, `font: 600 1.5rem var(--font-display)`) and `p` (`SOURCE_DESCRIPTIONS[id]`) in two columns (`1fr 1.4fr`) from 820 px, `border-bottom: 1px solid var(--line)`, hover (`@media (hover: hover)`) `background-color: var(--word)` and `padding-left: 24px` with a `padding-left` transition off under reduced motion; keep the attribution note paragraph of 048 under the list. Update `SourcesSection.test.tsx`: one row per source in the game's order, a new source id (cast) without description fails `typecheck` as today (keep the type test), title count follows the prop, note present, axe.
- [X] T012 [P] [US4] Rewrite `src/features/landing/components/FinalBand/FinalBand.tsx` and `.module.css`: full-width `<section>` with `background-color: var(--band)`, `color: var(--band-ink)`, inner `max-width: 1080px` with gutter, `h2` "A cruzada de hoje já está esperando." (`font: 800 clamp(1.8rem, 4.4vw, 2.8rem) var(--font-display)`, `max-width: 16ch`), `Link` "Jogar agora" to `/jogar` (`landingButtonClass` primary; override `border-color` and the `box-shadow` colour with `var(--band-ink)` in this component's CSS) and `Link` "Ver o calendário" to `/calendario` (underlined text link in `var(--band-ink)`). Remove `margin-bottom`/rounded card styles. Update `FinalBand.test.tsx` (heading, both links, axe) and a CSS test that the band has no `100vw` and no negative margin.
- [X] T013 [US4] Verify the type families and the no-third-party rule (the rules themselves are in T005): add to `e2e/landing.spec.ts` a check that no request leaves the site's origin while the landing loads and the mini crossword is used (SC-008), and that `getComputedStyle` gives Fraunces on the `h2` of the sources section, Roboto Mono on a kicker and Roboto on body text. Confirm `git diff main -- src/shared/themes/fonts.css package.json package-lock.json` is empty (no new font file or dependency, FR-013). Depends on T005 and T011.
- [X] T014 [P] [US4] Update `scripts/check-build-output.mjs`: also assert that the pre-rendered `index.html` contains "Como funciona", "Abriu, jogou. O resto é opcional.", "Experimente", "Uma mini cruzada, bem aqui.", "Fontes", "A cruzada de hoje já está esperando." and the phrase "Palavras cruzadas" inside the single `h1` (research R10); keep every existing assertion.

**Checkpoint**: all five sections and the band match the mockup.

---

## Phase 7: User Story 5 - Botões e estilo restritos à landing (Priority: P3)

**Goal**: the new style does not leak.

**Independent Test**: diff outside the landing is empty and other pages look the same (quickstart step 4).

- [X] T015 [US5] Verify containment: run `git diff --stat main -- apps/web/src ':!apps/web/src/features/landing'` and record the result in `specs/049-landing-mockup/research.md` (R7); it must list no `shared/`, `app/`, `pages/` or other feature file. In `src/features/landing/components/LandingButton/LandingButton.test.tsx` add a case that no landing CSS module defines a selector on `:root`, `body`, `html` or a bare element (`readCss` for each landing `.css`), and that `Button.module.css` is untouched (compare the four variant names in `shared/components/Button`).
- [X] T016 [US5] Keyboard and focus pass: in `e2e/landing.spec.ts`, Tab through the whole landing and assert that every link, button and clue button shows a visible focus ring (`outline` or `box-shadow` differs from the unfocused state) and that Tab from the last grid word leaves the grid.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T017 Run the full local gate: `npm run lint` (includes `check:deps`), `npm run typecheck`, `npm test`, `npm run build -w @cruzadinha/web`, `SITE_URL=https://exemplo.pages.dev npm run check:build-output -w @cruzadinha/web`, then `npm run test:e2e -w @cruzadinha/web -- landing sem-saltos` (quickstart 1, 2 and 5; e2e needs the API and a local Postgres with seed). The `landing` spec also guards the 048 rules this feature keeps (FR-015): direct-to-game, calendar link, indexing. Compare the CSS size in `dist/assets/*.css` with the T001 baseline and note the increase in the PR description (report only, no limit; research R7). Fix what fails.
- [X] T018 Walk through `specs/049-landing-mockup/quickstart.md` step 3 side by side with the mockup at 1440, 820 and 360 px, light and dark, with and without reduced motion; list any visible difference as a fix in this feature (not a new feature) and note in `research.md` the ones accepted on purpose (the site header kept, `--word` and `--sel` dark values from the site's tokens).
- [X] T019 [P] Edit `CLAUDE.md`: add a "Feature 049 (landing aligned to the mockup, web only)" line after 048: the mockup is the visual contract; the style is local to `features/landing` (`LandingButton`, tokens `--grid-line`, `--band`, `--band-ink` with `light-dark()`, no new dependency, no third-party fonts); the mini crossword keeps the `domain/game` reducer with `START_STATE` and `solvedWords` in `helpers/mini-state.ts`; Tab leaves the grid at the ends; `FinalBand` is the only full-width block and `LandingContent` has no `max-width`; specs in `specs/049-landing-mockup/`. Do not edit `CHANGELOG.md` or versions (release-please).
- [ ] T020 Commit in logical steps (English Conventional Commits, scope `web`, no AI trailer), e.g. `feat(web): align landing hero to the mockup`, `feat(web): align landing sections to the mockup`, `test(web): cover the landing mockup in e2e`, `docs: add feature 049 spec and notes`, then push `feat/049-landing-mockup` and open the PR to `main` with a summary and test plan (the "Verificar" step of the PR checks needs `SITE_URL`). Never use the `open-mr` skill.

---

## Dependencies & Execution Order

- **Setup (T001)** first. **Foundational (T002 to T005)**: T002 and T003 parallel; T004 after T003; T005 after T002. All of US1 to US5 wait for it.
- **US1 (T006, T007)** and **US2 (T008)** are the P1 pair and can run in parallel after Phase 2 (different files); T007 after T006.
- **US3 (T009, T010)** needs T002 to T005; T010 after T009.
- **US4**: T011 and T012 parallel; T013 after T005; T014 independent.
- **US5 (T015, T016)** after every component task (it verifies the whole).
- **Polish (T017 to T020)** last, in order; T019 can run any time after T018.

### Parallel Example

```text
After T005:  T006 (Hero)  ||  T008 (FeatureCards)  ||  T009 (MiniCrossword)  ||  T011 (SourcesSection)  ||  T012 (FinalBand)  ||  T014 (check-build-output)
```

## Implementation Strategy

- **MVP**: Phase 1, Phase 2, US1 (T006, T007). The top of the page already matches; the rest still works with the old look.
- **Then**: US2 (the other P1), US3 and US4 (P2), US5 (verification), Polish. Each story leaves the page working and tested, so the branch can be paused after any checkpoint.
- Visual fidelity is checked against the mockup in T018; if a pixel-level choice is ambiguous, follow the mockup's CSS in the artifact and note it in `research.md`.

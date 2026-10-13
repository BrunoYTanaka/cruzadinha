# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository ("cruzadinha") is driven by a [GitHub Spec Kit](https://github.com/github/spec-kit) scaffold (v1.0.13, Claude integration, `sh` scripts, sequential feature numbering).

- Feature 001 (source feasibility) is concluded: the verdict was **viable**, and its probe code was intentionally not versioned. The O Globo API details the puzzle adapter needs (endpoint, anonymous token, ipuz response format) are in `specs/001-viabilidade-fonte/decision.md`. The adapter is feature 003.
- Feature 002 (foundation) set up the monorepo, quality tooling, CI and local environment. Application code is only the minimum that proves the structure: `GET /api/health` and a status page. No product features yet.
- Feature 003 (O Globo adapter) added the internal puzzle format in `shared` and the `oglobo` puzzle source in the API, with fixtures reduced from real responses. Findings from the real-source checks are in `specs/003-adaptador-oglobo/findings.md`. The source only publishes the `daily` level, so that is the only level accepted.
- Feature 004 (database, auth and invites) added Drizzle with versioned migrations (`users`, `sessions`, `invites`, `rate_limit_attempts`), invite-only registration, login/logout/`me` with a server-side session (sliding 30-day expiry, 1-year absolute limit), per-user invites with a quota of 3, persisted rate limits, the author CLI and a development-only seed. Password recovery and "log out everywhere" are deferred to a future feature.
- Feature 006 (puzzle collection and cache) added the `puzzles` table (one row per source, level and date, public part and solution in separate `jsonb` columns), `GET /api/puzzles?level=&date=` and `GET /api/puzzles/:id` (session required; a missing past date is fetched from the source, validated and saved, counted against a persisted per-address limit), the `puzzles collect` author command and the scheduled `.github/workflows/collect.yml` (00:01 and 08:00 in Brasília), and a development sample puzzle in the seed.
- Feature 007 (solution in the puzzle response) made `GET /api/puzzles` and `GET /api/puzzles/:id` return `{ puzzleId, puzzle, solution }` to logged-in users so the front end controls hints (constitution 3.0.0). The service revalidates the puzzle/solution pair before delivering; a stored pair that does not match answers a generic 500. No schema change.
- Feature 008 (user progress per puzzle) added the `progress` table (composite key `(user_id, puzzle_id)`, `ON DELETE CASCADE` on the user and `RESTRICT` on the puzzle) and `GET`/`PUT /api/progress/:puzzleId` and `POST /api/progress/:puzzleId/reset` (session required, user always from the session). The server validates only the letter format against the grid; the front end decides when the grid is correct. A save carries the device's `savedAt`; an older one is ignored, a completed record rejects changes with `409 progress-completed`, completion stores the server-side `completed_at`, `finished_ms` and the personal record (`best_ms`/`best_at`, kept on reset). Rules live in the pure `decideSave`/`decideReset` in `modules/progress/progress.service.ts`.
- Feature 009 (puzzle library) added `GET /api/library` (session required, no schema change): up to 366 saved puzzles, newest first, each with the session user's status (`not_started`, `in_progress`, `completed`) and times (`elapsedMs`, `finishedMs`, `completedAt`, `bestMs`, `bestAt`). One `LEFT JOIN` of `puzzles` with `progress` filtered by user in the `ON` clause, selecting metadata columns only (never `data`, `solution` or `cells`); an `in_progress` row with no letters counts as `not_started`. It has no `PuzzleSource` or `PUZZLE_FETCH` limiter dependency, so it never reaches the source. Derivation is the pure `toLibraryItem` in `modules/library/library.service.ts`.

## Commands

Prerequisites: Node.js 24 (`nvm use`, version in `.nvmrc`) and, for the local environment, Docker with Compose.

Run everything from the repository root:

- `npm ci`: install all workspaces from `package-lock.json`; also activates the Git hooks (`prepare: husky`).
- `npm run format` / `npm run format:check`: Prettier on the whole repo (`specs/`, `.specify/`, `.claude/` and this file are ignored).
- `npm run lint`: ESLint with the single root `eslint.config.mjs`.
- `npm run typecheck`, `npm test`, `npm run build`: run in every workspace (`--workspaces --if-present`).
- `npm run test:int`: integration tests (`*.int.test.ts`) against a real Postgres 17 started by Testcontainers; needs Docker. Not run by the pre-push hook.
- Single test: `npx vitest run <file>` inside the workspace, e.g. `cd apps/api && npx vitest run src/config.test.ts`.
- `npm run source:check -w @cruzadinha/api -- [YYYY-MM-DD] [--save]`: fetches the puzzle from the real source (real requests, never run by the test suite or CI); `--save` writes the raw bodies to the git-ignored `apps/api/.source-samples/`.
- `npm run db:generate -w @cruzadinha/api` (add `-- --name <name>`, or `-- --custom --name <name>` for hand-written SQL such as triggers): generate a migration from `src/db/schema.ts` into `apps/api/drizzle/`. Never use `drizzle-kit push`.
- `npm run db:migrate -w @cruzadinha/api`: apply pending migrations to `DATABASE_URL` (idempotent). The API also applies them on startup; in the image it is `node apps/api/dist/migrate.mjs`.
- `npm run db:seed -w @cruzadinha/api`: development only; creates the test account from `SEED_USER_EMAIL`/`SEED_USER_PASSWORD` (fictitious values in `.env.example`) without an invite, never changes an existing account, also saves a sample 5 x 5 puzzle (invented text, attributed as a sample) for today in Brasília without touching the network or an existing puzzle (while it occupies today, `puzzles collect` counts today as already saved: recreate the local database to collect the real one), refuses `NODE_ENV=production` and is not in the image.
- `npm run cli -w @cruzadinha/api -- invites create [--days N] | list | revoke <invite_id>`: author CLI (no quota); in the image it is `node apps/api/dist/cli.mjs`.
- `npm run cli -w @cruzadinha/api -- puzzles collect`: saves today's puzzle (Brasília) and the missing past days within `COLLECT_HISTORY_DAYS` (0 to 365, default 31; real requests with a 2 s pause, one per missing date, stops on the source's rate-limit signal). Idempotent: dates already saved are not requested. Exit 0 on success, 1 on failure or interruption. The scheduled workflow `collect.yml` runs it from the built files and needs the `DATABASE_URL` secret (without it the schedule is skipped with a notice; it does not run migrations, the API does that on startup). `COLLECT_HISTORY_DAYS` can also be set as a repository variable.
- `npm run dev -w @cruzadinha/api`: API with reload (`tsx watch`), reading `.env` from the root. The Swagger UI is at `http://localhost:3000/api/docs/` (also through the Vite proxy) and the OpenAPI 3.1 document at `/api/docs/json` and `/api/docs/yaml`. Docs are never registered in production, including the `docker compose` API (production image), where `/api/docs*` returns 404.
- `npm run dev -w @cruzadinha/web`: site with Vite; `/api` is proxied to `API_PROXY_TARGET` (default `http://localhost:3000`).
- Local environment: `cp .env.example .env`, then `docker compose up -d` (Postgres 17 and the API image). Health: `curl localhost:3000/api/health`.

Hooks: pre-commit runs `lint-staged` (ESLint `--fix` and Prettier on staged files); pre-push runs `typecheck` and the unit tests. CI (`.github/workflows/ci.yml`) runs `npm ci`, `format:check`, `lint`, `typecheck`, `test` and `build` on every push, plus a job that runs `test:int` and one that builds `apps/api/Dockerfile`.

## Architecture

npm workspaces monorepo, TypeScript 6 strict everywhere (`tsconfig.base.json`, extended per package):

- `packages/shared` (`@cruzadinha/shared`): Zod schemas and types shared by API and web. No build step: it exports its TypeScript source (`./src/index.ts`). `src/puzzle/` holds the internal puzzle format: the public part (`puzzleSchema`, with the consistency rules applied in `safeParse`) and the solution (`solutionSchema`) are separate, so the public part has no field for answer letters (the API response carries both, see feature 007).
- `apps/api` (`@cruzadinha/api`): Fastify 5. `src/app.ts` builds the app without listening (tested with `app.inject()`); `src/server.ts` is the entry point. Layers per module: route → service → repository (`src/modules/<name>/`, database access in `src/db/`). Configuration comes only from environment variables validated by `src/config.ts`; no other module reads `process.env`. Built with tsdown into `dist/server.mjs`, `dist/migrate.mjs` and `dist/cli.mjs` (plus a shared chunk), inlining `shared`; the Dockerfile also copies `apps/api/drizzle/`.
  - `src/db/`: postgres.js + Drizzle client (`client.ts`), schema (`schema.ts`), the shared `timestamps` columns (`columns.ts`; every table must spread them and get a `<table>_set_updated_at` trigger in its migration, enforced by `conventions.int.test.ts`), `migrations.ts` and error helpers. Drizzle's `DrizzleQueryError` message embeds query parameters (hashes, e-mails), so logs use `describeError` (names and codes only).
  - `src/modules/auth` (register, login, logout, `me`, session `preHandler` with sliding renewal), `src/modules/invites` (CLI and per-user invites, quota of 3 with a row lock) and `src/modules/rate-limit` (attempts stored in the database). Passwords use argon2id; session tokens and invite codes are stored only as SHA-256. Services take an injectable `Clock`.
  - `src/docs/`: OpenAPI docs (`@fastify/swagger` + `@fastify/swagger-ui`), registered only outside production. Each route declares a `schema` (tags, summary, body, responses, `security` when it needs a session) in `<module>.schemas.ts`, built from the `shared` Zod schemas with `toDocSchema`. These schemas only document: `buildApp` swaps in pass-through validator and serializer compilers, so validation stays in each route's `safeParse`. Every new `/api/*` route needs a `schema`, enforced by `src/docs/docs.test.ts`.
  - `src/modules/puzzles` (`GET /api/puzzles`, `GET /api/puzzles/:id`, `collect()`): the service reads the saved puzzle first and only calls the `PuzzleSource` for a missing, non-future date, after checking the `PUZZLE_FETCH` limit; it revalidates the puzzle/solution pair before saving with `onConflictDoNothing`. Date helpers (Brasília day, candidate dates) are in `src/lib/dates.ts`.
  - `src/modules/library` (`GET /api/library`): read-only listing of saved puzzles with the user's progress summary; see feature 009 above.
  - `src/cli.ts` / `src/cli/run-cli.ts`: author CLI that calls the invites and puzzles services directly. `src/sources/` holds the `PuzzleSource` interface (`types.ts`) and one folder per adapter; `oglobo/` is the only code that knows the Agilmente API (request, anonymous token, response schema, pure ipuz → internal conversion). Its tests use an injected `fetch` and reduced 5 x 5 fixtures with invented content, never full puzzles from the source.
- `apps/web` (`@cruzadinha/web`): React 19 + Vite 8; server state through TanStack Query. The board logic will live in `src/game-logic/` (not a separate package).
- The API and the web app never import each other; anything both need goes in `shared`.

Unit tests use Vitest 5 per workspace (`jsdom` + Testing Library in web) and never touch the network, a database or a browser. Integration tests live in `apps/api/src/test/*.int.test.ts`, run by `vitest.int.config.ts` (`npm run test:int`): the global setup starts `postgres:17-alpine` with Testcontainers and applies the migrations, files run serially and tables are truncated before each test.

Tooling notes: ESLint 10 with a `package.json` `overrides` entry so `eslint-plugin-jsx-a11y` (peer range stops at ESLint 9) accepts it; TypeScript stays on 6.0 because `typescript-eslint` does not support 7 yet. Writing `any` is a lint error (`@typescript-eslint/no-explicit-any`, constitution principle I); external data enters as `unknown` and goes through Zod.

## Spec-driven workflow

Work is meant to flow through the Spec Kit skills in `.claude/skills/`, in roughly this order:

1. `/speckit-constitution`: project principles live in `.specify/memory/constitution.md` (v2.0.0). Plans must pass a Constitution Check against it.
2. `/speckit-specify`: create a feature spec (`spec.md`).
3. `/speckit-clarify`: resolve underspecified areas in the spec.
4. `/speckit-plan`: generate `plan.md` and design artifacts.
5. `/speckit-tasks`: generate a dependency-ordered `tasks.md`.
6. `/speckit-analyze` and `/speckit-checklist`: check consistency and quality across the artifacts.
7. `/speckit-implement`: execute `tasks.md`. `/speckit-converge` appends any unbuilt work to `tasks.md` as new tasks.

`/speckit-taskstoissues` converts tasks to GitHub issues.

## Conventions

- Formatting (Prettier): `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`.
- Commits follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>[scope][!]: <description>`, types `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Breaking changes use `!` or a `BREAKING CHANGE:` footer. Scope is the workspace or module (`api`, `web`, `shared`, `auth`, `game-logic`). Description in the imperative, lowercase, no trailing period. Commit messages (subject and body) are always written in English, e.g. `feat(game-logic): add word validation`, not `feat(game-logic): adiciona validação de palavras`.
- Commit messages and PR descriptions must NOT include a `Co-Authored-By` trailer or any other Claude/AI attribution line (this overrides the default attribution).
- Branches are `<type>/<kebab-description>` with the same types; Spec Kit feature branches include the number and slug, e.g. `feat/001-viabilidade-fonte`.
- Work type decides the flow: new behavior → full Spec Kit cycle on `feat/NNN-slug`; bug fix → `fix/<slug>` without the full cycle, starting with a failing regression test (committed with the fix); a fix that changes a documented rule → update that feature's `spec.md` first and treat it as a feature; chores/docs/ci → direct, no spec.
- The design source is `docs/design.md` (the app is named Cruzadinha).

## Layout of `.specify/`

- `scripts/bash/`: helpers the skills call (`create-new-feature.sh`, `setup-plan.sh`, `setup-tasks.sh`, `check-prerequisites.sh`, `resolve-template.sh`, shared code in `common.sh`). Prefer running these over recreating their logic by hand.
- `templates/`: templates for spec, plan, tasks, and so on.
- `workflows/speckit/workflow.yml`: workflow definition.
- `integrations/*.manifest.json`: record the files Spec Kit installed. Use the Spec Kit tooling, not manual edits, to upgrade them.
- `init-options.json` and `integration.json`: install-time settings.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository ("cruzadinha") is driven by a [GitHub Spec Kit](https://github.com/github/spec-kit) scaffold (v1.0.13, Claude integration, `sh` scripts, sequential feature numbering).

- Feature 001 (source feasibility) is concluded: the verdict was **viable**, and its probe code was intentionally not versioned. The O Globo API details the puzzle adapter needs (endpoint, anonymous token, ipuz response format) are in `specs/001-viabilidade-fonte/decision.md`. The adapter is feature 003.
- Feature 002 (foundation) set up the monorepo, quality tooling, CI and local environment. Application code is only the minimum that proves the structure: `GET /api/health` and a status page. No product features yet.

## Commands

Prerequisites: Node.js 24 (`nvm use`, version in `.nvmrc`) and, for the local environment, Docker with Compose.

Run everything from the repository root:

- `npm ci`: install all workspaces from `package-lock.json`; also activates the Git hooks (`prepare: husky`).
- `npm run format` / `npm run format:check`: Prettier on the whole repo (`specs/`, `.specify/`, `.claude/` and this file are ignored).
- `npm run lint`: ESLint with the single root `eslint.config.mjs`.
- `npm run typecheck`, `npm test`, `npm run build`: run in every workspace (`--workspaces --if-present`).
- Single test: `npx vitest run <file>` inside the workspace, e.g. `cd apps/api && npx vitest run src/config.test.ts`.
- `npm run dev -w @cruzadinha/api`: API with reload (`tsx watch`), reading `.env` from the root.
- `npm run dev -w @cruzadinha/web`: site with Vite; `/api` is proxied to `API_PROXY_TARGET` (default `http://localhost:3000`).
- Local environment: `cp .env.example .env`, then `docker compose up -d` (Postgres 17 and the API image). Health: `curl localhost:3000/api/health`.

Hooks: pre-commit runs `lint-staged` (ESLint `--fix` and Prettier on staged files); pre-push runs `typecheck` and the unit tests. CI (`.github/workflows/ci.yml`) runs `npm ci`, `format:check`, `lint`, `typecheck`, `test` and `build` on every push, plus a job that builds `apps/api/Dockerfile`.

## Architecture

npm workspaces monorepo, TypeScript 6 strict everywhere (`tsconfig.base.json`, extended per package):

- `packages/shared` (`@cruzadinha/shared`): Zod schemas and types shared by API and web. No build step: it exports its TypeScript source (`./src/index.ts`).
- `apps/api` (`@cruzadinha/api`): Fastify 5. `src/app.ts` builds the app without listening (tested with `app.inject()`); `src/server.ts` is the entry point. Layers per module: route → service → repository (`src/modules/<name>/`, database access in `src/db/`). Configuration comes only from environment variables validated by `src/config.ts`; no other module reads `process.env`. Built with tsdown into a single `dist/server.mjs` that inlines `shared`.
- `apps/web` (`@cruzadinha/web`): React 19 + Vite 8; server state through TanStack Query. The board logic will live in `src/game-logic/` (not a separate package).
- The API and the web app never import each other; anything both need goes in `shared`.

Tests use Vitest 5 per workspace (`jsdom` + Testing Library in web) and never touch the network, a database or a browser. Future integration tests with Postgres go in `*.int.test.ts` with a separate script.

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
- The design source is `/home/bruno/Desktop/2026-10-12-cruzadas-design.md` (the app is named Cruzadinha).

## Layout of `.specify/`

- `scripts/bash/`: helpers the skills call (`create-new-feature.sh`, `setup-plan.sh`, `setup-tasks.sh`, `check-prerequisites.sh`, `resolve-template.sh`, shared code in `common.sh`). Prefer running these over recreating their logic by hand.
- `templates/`: templates for spec, plan, tasks, and so on.
- `workflows/speckit/workflow.yml`: workflow definition.
- `integrations/*.manifest.json`: record the files Spec Kit installed. Use the Spec Kit tooling, not manual edits, to upgrade them.
- `init-options.json` and `integration.json`: install-time settings.

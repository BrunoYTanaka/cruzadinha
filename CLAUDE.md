# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository ("cruzadinha") has no application source code, build system, tests, or README yet. It contains only a freshly initialized [GitHub Spec Kit](https://github.com/github/spec-kit) scaffold (v1.0.13, Claude integration, `sh` scripts, sequential feature numbering). Git is initialized with no commits yet. Once real code lands, update this file with build/lint/test commands and architecture.

## Spec-driven workflow

Work is meant to flow through the Spec Kit skills in `.claude/skills/`, in roughly this order:

1. `/speckit-constitution`: project principles live in `.specify/memory/constitution.md` (v1.3.0 ratified). Plans must pass a Constitution Check against it.
2. `/speckit-specify`: create a feature spec (`spec.md`).
3. `/speckit-clarify`: resolve underspecified areas in the spec.
4. `/speckit-plan`: generate `plan.md` and design artifacts.
5. `/speckit-tasks`: generate a dependency-ordered `tasks.md`.
6. `/speckit-analyze` and `/speckit-checklist`: check consistency and quality across the artifacts.
7. `/speckit-implement`: execute `tasks.md`. `/speckit-converge` appends any unbuilt work to `tasks.md` as new tasks.

`/speckit-taskstoissues` converts tasks to GitHub issues.

## Conventions

- Formatting (Prettier): `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`.
- Commits follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `<type>[scope][!]: <description>`, types `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Breaking changes use `!` or a `BREAKING CHANGE:` footer. Scope is the workspace or module (`api`, `web`, `shared`, `auth`, `game-logic`). Description in the imperative, lowercase, no trailing period.
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

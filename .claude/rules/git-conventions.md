---
description: Branching, commit message, and pull request conventions for this repository
---

# Git Conventions

## Branching

```
feat/add-job-filter-sidebar            # New features (Spec Kit: feat/NNN-slug)
fix/employer-route-redirect-loop       # Bug fixes
docs/update-readme                     # Documentation only
chore/upgrade-dependencies             # Maintenance, tooling
refactor/simplify-auth-context         # Code refactoring
style/mobile-job-card-spacing          # Visual/style changes
```

- Format is `<type>/<kebab-description>`, with the same types as Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`)
- Enforced by `npm run check:branch` (pre-push hook and the `branch-name` CI job); `main` and `release-please--*` are exempt
- Branch off `main` for all new work
- Keep branches short-lived; open a PR when ready
- Delete branches after merging

## Commit Messages

Follow **Conventional Commits**:

```
feat: add saved jobs count to navbar
fix: correct role guard on employer routes
docs: update README with localStorage keys
chore: upgrade react-router to v7.8
refactor: extract job card into reusable component
style: fix spacing on mobile job list
```

- Use present tense, lowercase, no period at the end
- Keep the subject line under 72 characters
- Add a body for non-obvious changes

## Pull Requests

- PR title must match the Conventional Commits format
- Include a summary and test plan in the PR description
- Target `main` as the base branch

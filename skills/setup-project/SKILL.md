---
name: setup-project
description: "Create the code project to the team standard: feature folders, lint, types, tests, env, git rules, PR template, CI and CLAUDE.md. Use once the stack is approved."
---
# Setup project

> Owner: **setup-engineer** agent. Not running as it? Delegate this skill to it (no subagents: follow `role-setup-engineer`). Inside it, just do the steps.


Use the framework's official scaffolder non-interactively, then apply the standard in `references/standard.md`.

1. Scaffold (latest stable versions; check the registry, not memory).
2. Folders: `src/features/<feature>/`, `src/shared/`, `tests/e2e/`.
3. Formatter + linter + type checking; scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`.
4. Unit test runner + Playwright for e2e, each with one passing example test.
5. `.env.example` listing every variable (with comments); `.env*` git-ignored.
6. `.github/pull_request_template.md` and CI workflow (install → lint → typecheck → test → build) on every PR.
7. `CLAUDE.md`: stack, commands, conventions, "read project/progress.md first" (≤60 lines).
8. Git: initial commit on `main`; branch and commit rules from the standard.
9. Run `check-setup`.

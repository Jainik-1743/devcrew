# Changelog

Versions stay 0.0.x while the kit is being tested. 1.0.0 is cut once it is approved as stable.

## 0.0.1 - 2026-10-03 (pre-release)
- 13 agents, 44 skills, 4 workflow commands (`/crew-start`, `/crew-next`, `/crew-status`, `/crew-change`).
- Codebase knowledge base: `codebase-expert` agent, `map-codebase` (with a zero-dependency scanner script)
  and `answer-codebase-question`, which write and use `project/architecture.md`, `modules.md`, `memory.md` and `archive.md`.
- `npx devcrew-kit` CLI: project/global scope, Claude Code and `.agents` targets, presets (including
  `existing-project`), dependency resolution, hash manifest for safe `update` / `remove`, `doctor`, `tokens`, `--dry-run`.
- Interactive `npx devcrew-kit` setup (arrow-key menus, banner, a custom picker that links agents, skills and commands); Claude Code plugin + marketplace manifests.
- Validator that enforces the token budget; node:test suite; CI on Linux/macOS/Windows × Node 18–24.

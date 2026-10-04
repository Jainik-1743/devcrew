# Changelog

Versions stay 0.0.x while the kit is being tested. 1.0.0 is cut once it is approved as stable.

## 0.0.3

### Patch Changes

- [#4](https://github.com/Jainik-1743/devcrew/pull/4) [`0f57ef8`](https://github.com/Jainik-1743/devcrew/commit/0f57ef898a9a71d9c41253a2bf224a3825f2073f) Thanks [@Jainik-1743](https://github.com/Jainik-1743)! - Each skill now runs on the model its work needs, whatever model your main chat uses. Agents pick a model for their job instead of `inherit`: opus for the analyst, architect and reviewer; sonnet for building, design, testing and the codebase expert; haiku for tickets, docs and releases. Owned skills set `context: fork`, `agent:` and `model:`, so `/create-tickets` runs as the project manager on haiku and `/review-code` runs as the reviewer on opus. Context-dependent skills (`track-progress`, `log-decision`, `write-handoff`, `confirm-done`, `build-step-by-step`) stay inline. These routing keys are stripped for `--target agents`. `devcrew-kit info` shows where and on which model each item runs, and the validator rejects `inherit` and routing that doesn't match the owners.

- [#4](https://github.com/Jainik-1743/devcrew/pull/4) [`0f57ef8`](https://github.com/Jainik-1743/devcrew/commit/0f57ef898a9a71d9c41253a2bf224a3825f2073f) Thanks [@Jainik-1743](https://github.com/Jainik-1743)! - `update` now refreshes the devcrew rules block in CLAUDE.md / AGENTS.md. Before, projects kept the rules from the version they first installed (for example, the "Owner:" delegation rule from 0.0.2 never reached them). Only the block is replaced; the rest of the file is kept.

## 0.0.2

### Patch Changes

- [#3](https://github.com/Jainik-1743/devcrew/pull/3) [`08d051d`](https://github.com/Jainik-1743/devcrew/commit/08d051d6b9c7e8b93d096d4804157d1031e312f2) Thanks [@Jainik-1743](https://github.com/Jainik-1743)! - Agents now inherit the session model (`model: inherit`) so they work on any model and follow `/model`. Every skill carries an owner line that hands it to its agent. Fixed skill ownership: `apply-feedback` and `add-regression-test` move to the developer (the reviewer is read-only), and the analyst gets `log-decision`.

- [#1](https://github.com/Jainik-1743/devcrew/pull/1) [`0856bd5`](https://github.com/Jainik-1743/devcrew/commit/0856bd5a330845ddaaddc4673a44cf4e91f82bb5) Thanks [@Jainik-1743](https://github.com/Jainik-1743)! - Automated releases: npm publishes now come from CI with provenance, and the package links to its GitHub repository, issues and README.

- [#2](https://github.com/Jainik-1743/devcrew/pull/2) [`8188c82`](https://github.com/Jainik-1743/devcrew/commit/8188c821b7039ab7e567a9d16192531c6647af0d) Thanks [@Jainik-1743](https://github.com/Jainik-1743)! - Published on npm as `devcrew-kit` (`npx devcrew-kit`); a global install also provides the `devcrew` command.

- [`4cdea9d`](https://github.com/Jainik-1743/devcrew/commit/4cdea9de9426bbc7eebcaeb9471ce142923b35e6) Thanks [@Jainik-1743](https://github.com/Jainik-1743)! - Fixed invalid YAML frontmatter in 11 skills (including all `/crew-*` commands) that strict parsers like Claude Code's could reject; `role-*` skills now get quoted descriptions; `remove` acts on every installed target by default. The validator now catches unquoted YAML values and changesets that name the wrong package.

## 0.0.1 - 2026-10-03 (pre-release)
- 13 agents, 44 skills, 4 workflow commands (`/crew-start`, `/crew-next`, `/crew-status`, `/crew-change`).
- Codebase knowledge base: `codebase-expert` agent, `map-codebase` (with a zero-dependency scanner script)
  and `answer-codebase-question`, which write and use `project/architecture.md`, `modules.md`, `memory.md` and `archive.md`.
- `npx devcrew-kit` CLI: project/global scope, Claude Code and `.agents` targets, presets (including
  `existing-project`), dependency resolution, hash manifest for safe `update` / `remove`, `doctor`, `tokens`, `--dry-run`.
- Interactive `npx devcrew-kit` setup (arrow-key menus, banner, a custom picker that links agents, skills and commands); Claude Code plugin + marketplace manifests.
- Validator that enforces the token budget; node:test suite; CI on Linux/macOS/Windows × Node 18–24.

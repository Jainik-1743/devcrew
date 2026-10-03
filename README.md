# devcrew

**An AI dev crew for Claude Code and any [Agent Skills](https://agentskills.io) tool.**
13 agents, 44 skills and 4 workflow commands that take requirements to a tested, released, documented product. It also includes a **codebase knowledge base**, so questions about your code are answered from small files instead of re-reading the whole repo.

It works for a solo developer on a side project, a team on a product, or anyone building for someone else. The requirements can come from you, a product owner or a client.

> **Status: 0.0.1 (pre-release).** Versions stay at 0.0.x while the kit is being tested. 1.0.0 comes once it is approved as stable.

```bash
npx devcrew            # interactive setup
npx devcrew init       # install everything into this project
npx devcrew init -g    # ...or globally, for every project
```

Then in Claude Code:

```
/crew-start requirements.md     # a new project from requirements (file or pasted text)
/crew-next                      # repeat: the team lead runs exactly one next step
/map-codebase                   # an existing project: build the knowledge base first
```

---

## Why devcrew (and not aihero.dev / mattpocock skills or gstack)

Both are excellent and inspired this kit, but they solve different problems.

| | **mattpocock/skills** (aihero.dev) | **gstack** | **devcrew** |
|---|---|---|---|
| Built for | Improving one developer's workflow | Shipping a founder's idea fast | **The whole delivery cycle**: requirements → specs → design → build → review → test → release |
| Unit of work | Skills only | Skills (persona prompts) | **Real subagents**, each with its own model, tools and preloaded skills, plus skills |
| Questions | Grilling, one question at a time | Forcing questions | **Question cards**: priority, options, *recommended answer and default*. Work never blocks waiting for an answer |
| Large projects | One spec | One plan | **Just-in-time per-spec questions**: spec 1 is built while spec 2's questions are open |
| Requirements | PRD → issues | Plan reviews | **FRD sections** with Given/When/Then checks, traced to tickets, tests and reviews |
| Requirement changes | — | — | **`/crew-change` impact table** (specs, design, tickets, code, timeline) before anything changes |
| Existing codebases | Architecture improvement report | Optional knowledge "brain" (needs a database) | **`map-codebase`**: a scanner script + 4 plain markdown files, refreshed incrementally from git |
| Design | — | Strong (mockups, design review) | Flows → wireframes with **5 states per screen** → tokens → UX and WCAG 2.2 AA checks |
| Ticket tools | GitHub/Linear | GitHub | **Jira, Linear or GitHub Issues**, with local files as a fallback |
| State and resume | Handoff doc | Memory/brain | **`project/progress.md` (≤40 lines) + handoff notes + archive**. A new session reads 2 files |
| Install | `npx skills add` (skills only) | `git clone` + setup script | **`npx devcrew`**: project or global, presets, dependency resolution, safe update/uninstall |
| Cost control | Short skills | Large, rich prompts | **Enforced budget**: CI fails if a skill passes 60 lines or the always-loaded cost passes 3.5k tokens |

### What we improved

1. **Agents, not only prompts.** Each role is a Claude Code subagent with **least-privilege tools** (the reviewer can't edit code), **model routing** (Opus for analyst, architect and reviewer; Sonnet for builders; Haiku for project-manager, release-manager and doc-writer) and **only its own skills preloaded**. The work runs in the agent's own context window, so your main conversation stays small.
2. **A codebase memory that stays true.** `map-codebase` writes `architecture.md`, `modules.md`, `memory.md` and `archive.md`, each stamped with a git commit. Refreshes only re-read what changed since then. `answer-codebase-question` looks things up there first, verifies in code, cites `file:line`, and adds what it learned.
3. **Never blocked on a person.** Every question has a recommended answer and a default. Unanswered questions take the default and are logged in `project/assumptions.md`, so nothing is silently guessed.
4. **Deterministic routing.** `whats-next` is a fixed state → (action, owner) table. `/crew-next` always does exactly one step.
5. **Evidence gates.** `confirm-done` requires real test, lint, type-check and build output, mapped to each acceptance check. Reviews require `file:line` plus a concrete fix, and unverifiable findings are dropped.
6. **Full traceability.** Requirements → question cards → FRD rule → acceptance check → ticket → test → review → release notes → status report.
7. **Six approval gates** (spec list, each FRD section, design, tech plan, sprint, release). Outward-facing actions (merge, deploy, Slack, email) are always drafted first.
8. **A safe installer.** Every file is hashed in a manifest. `update` never overwrites files you edited, `remove` refuses to delete skills an installed agent still needs, and nothing outside the kit's files is touched.
9. **Works beyond Claude Code.** `--target agents` installs into `.agents/skills` (Codex, Cursor, Gemini CLI, Copilot, OpenCode) and turns each agent into a `role-<name>` skill.

---

## Install

Requires Node.js 18.17+. There are no runtime dependencies.

```bash
npx devcrew init [--preset <name>] [-g] [-t claude|agents|all]
```

| Scope | Where | Use when |
|---|---|---|
| `--project` (default) | `./.claude/` (+ `project/` state and a `CLAUDE.md` block) | Share the crew with everyone on the repo through git |
| `--global` / `-g` | `~/.claude/` | Use the crew in every project on your machine |

| Target | Installs to | Agents become |
|---|---|---|
| `claude` (default) | `.claude/skills`, `.claude/agents` | Native subagents |
| `agents` | `.agents/skills` (+ `AGENTS.md` block) | `role-<name>` skills |
| `all` | both | both |

| Preset | Contents |
|---|---|
| `full` | Everything (recommended) |
| `core` | team-lead, analyst, spec-writer, developer, reviewer, codebase-expert + commands |
| `planning` | Discovery → specs → design → architecture → tickets |
| `build` | developer, reviewer, tester, release-manager, doc-writer |
| `existing-project` | codebase-expert, developer, reviewer, tester. Map an existing repo, then work in it |
| `skills-only` | All skills, no agents |

### All commands

```bash
npx devcrew add reviewer tester          # agents bring their skills along
npx devcrew add map-codebase             # or single skills
npx devcrew add preset:existing-project
npx devcrew remove tester                # --all removes everything the kit installed
npx devcrew update                       # upgrade; keeps files you edited (--force to overwrite)
npx devcrew list [--installed]
npx devcrew info codebase-expert
npx devcrew doctor                       # missing files, edited files, version drift
npx devcrew tokens                       # always-loaded token cost
```

Common flags: `--dry-run`, `--force`, `--no-scaffold`, `-y`.

---

## Test it locally (no publishing needed)

Pick whichever fits. None of them need npm or GitHub.

| Way | Commands | Good for |
|---|---|---|
| **1. Run the CLI from the folder** | `cd ~/some-project && node /path/to/devcrew/bin/cli.js init` | Installing into a real project of yours |
| **2. `npm link`** | In this repo: `npm link`. Then anywhere: `devcrew init` (undo: `npm unlink -g devcrew`) | Using it like the published command while you edit the kit |
| **3. Exact publish simulation** | `npm pack` → `npx --package=./devcrew-0.0.1.tgz devcrew init` | Final check that the published package contains everything |
| **4. As a plugin** | `claude --plugin-dir /path/to/devcrew` | Testing the plugin form without installing files |

Automated checks: `npm run check` runs the validator and all tests (installs run in temp folders and never touch your home folder).

To confirm Claude Code really loads everything, run this inside a project where you installed it:

```bash
claude -p "hi" --output-format stream-json --verbose --max-turns 1 | grep '"subtype":"init"'
# the init event lists "agents" (should include all 13) and "slash_commands" (crew-start, map-codebase, ...)
```

> Restart Claude Code after installing so it picks up the new agents.
> The `/crew-*` commands only run when you type them. Claude won't trigger them on its own (`disable-model-invocation`), so they won't appear in the list of skills the model can call.

---

## Codebase knowledge base

Run `/map-codebase` once after setup, or right away on an existing repo. It runs a zero-dependency scanner (`scripts/scan.mjs`: stack, folders, scripts, entry points, routes, tests, biggest and most-changed files), reads only what the scan points to, and writes:

| File | Holds | Budget |
|---|---|---|
| `project/architecture.md` | As-built stack, entry points, layers, data-flow diagram, services, how to run | ≤150 lines |
| `project/modules.md` | "Where is X?" index: folder → purpose, key files, dependencies | ≤200 lines |
| `project/memory.md` | Verified commands, conventions, gotchas, learned Q&A | ≤150 lines |
| `project/archive.md` | Finished work, retired facts, old handoffs (read only for history questions) | append-only |

Later, ask anything ("where are emails sent?", "how does auth work?"). `answer-codebase-question` (or the `codebase-expert` agent) checks these files first, opens only the files they point to, answers with `file:line` evidence, and fixes or extends the map. `/map-codebase` again does an incremental refresh from the stamped commit. `docs/tech/architecture.md` is the *planned* design; `project/architecture.md` is what was *actually built*.

---

## How a project flows

```
/crew-start requirements.md
 1. team-lead        creates project/ state
 2. analyst          big-picture questions (1 round) -> spec list            >> YOU APPROVE
 3. per spec:        analyst questions (just in time) -> spec-writer FRD     >> YOU APPROVE each
 4. designer         flows -> wireframes (5 states) -> tokens -> UX + a11y   >> YOU APPROVE
 5. architect        stack, architecture, database, API (+ spikes)           >> YOU APPROVE
 6. setup-engineer   project standard, GitHub/Jira/Slack/CI, check-setup
 7. codebase-expert  map-codebase -> project/architecture, modules, memory
 8. project-manager  tickets -> sizes -> tracker -> sprint                   >> YOU APPROVE
 9. per ticket:      developer (test first) -> reviewer -> tester -> close
10. release-manager  PR, release notes, deploy check, status report          >> YOU MERGE / RELEASE
11. doc-writer       docs -> sprint review -> map refresh -> next sprint
Any time: /crew-change (requirements changed) · /crew-status · ask any code question
```

**Tip:** run `claude --agent team-lead` to make the team lead your main session. It can then hand work to every other agent directly.

### Commands

| Command | Does |
|---|---|
| `/crew-start <requirements>` | Starts the project: saves the requirements, asks big-picture questions, proposes the spec list |
| `/crew-next [note]` | Records your approval or answer, then runs exactly one next step with the right agent |
| `/crew-status` | Shows where the project is in under 15 lines |
| `/crew-change <what changed>` | Shows a change's impact before accepting it |
| `/map-codebase [full]` | Builds or refreshes the codebase knowledge base |

Every skill can also be called directly, e.g. `/create-tickets` or `/fix-bug`.

### Crew

| Agent | Model | Job | Skills |
|---|---|---|---|
| team-lead | sonnet | Routes the next step | whats-next, track-progress, write-handoff |
| analyst | opus | Removes ambiguity | ask-questions, make-questionnaire, define-terms, handle-change |
| spec-writer | sonnet | FRD sections | write-requirements, write-acceptance, log-decision |
| designer | sonnet | Flows, wireframes, design system | map-user-flows, make-wireframes, build-design-system, check-ux, check-accessibility |
| architect | opus | Stack, DB, API | design-architecture, design-database, design-api, try-idea, log-decision |
| setup-engineer | sonnet | Project and tool setup | setup-project, connect-tools, check-setup |
| codebase-expert | sonnet | Codebase map and Q&A | map-codebase, answer-codebase-question |
| project-manager | haiku | Tickets and sprints | create-tickets, estimate-tickets, sync-tickets, plan-sprint |
| developer | sonnet | Builds tickets with TDD | write-test-first, build-step-by-step, build-ui, fix-bug, confirm-done |
| reviewer | opus | Read-only code and security review | review-code, check-security, apply-feedback |
| tester | sonnet | Tests like a user | write-test-plan, test-like-user, add-regression-test, check-accessibility |
| release-manager | haiku | PR, notes, updates | prepare-release, send-update, status-report |
| doc-writer | haiku | Docs and retros | update-docs, sprint-review |

---

## How it keeps token use low

| Technique | Effect |
|---|---|
| Skill bodies ≤60 lines (enforced), descriptions ≤220 characters | ~2.9k tokens always loaded for the whole kit, ~250 per skill when used |
| Templates and checklists in `references/`, scanning in `scripts/` | Loaded or run only when needed; the scanner replaces dozens of file reads |
| Codebase knowledge base | Questions read ~3 small files + the cited code, not the repo |
| Each agent preloads only its own 2–5 skills | No agent carries the whole kit |
| Agents return ≤10 lines + file paths | The main conversation doesn't fill with tool output |
| Small state files (progress ≤40 lines, handoffs, archive) | New sessions read 2 files instead of chat history |
| Model routing (haiku/sonnet/opus) | Cheap models for mechanical work |

Check it yourself with `npx devcrew tokens`.

---

## What gets created in your project

```
.claude/
  agents/*.md                 13 subagents
  skills/<name>/SKILL.md      48 skills (+ references/, scripts/)
  devcrew.json                manifest (version + file hashes, used for safe updates)
project/                      crew memory, yours to edit; never overwritten or removed
  progress.md decisions.md glossary.md assumptions.md shared-questions.md handoffs/
  architecture.md modules.md memory.md archive.md     (written by /map-codebase)
CLAUDE.md                     short rules block between <!-- devcrew --> markers
docs/                         created by the agents as they work:
  brief.md  frd/  design/  tech/  tickets/  tests/  bugs/  releases/  reports/  questions/
```

Commit `.claude/` and `project/` so everyone on the repo shares the same crew and state.

---

## Developing the kit

```
agents/        13 agent files (frontmatter: model, tools, skills)
skills/        48 skill folders (SKILL.md + optional references/ and scripts/)
kit.json       presets, and which agents each command needs
bin/cli.js     the npx CLI (no dependencies)
src/           catalog, installer (manifest/hashes), scaffold
scripts/       validate.js (budget and structure)
test/          node:test suite (runs installs in temp folders)
```

```bash
npm run check        # validate + test
npm pack --dry-run   # see what will be published
npx changeset        # describe your change for the next release
```

The validator enforces: the folder name matches the `name` field, kebab-case names, short one- or two-sentence descriptions, skills ≤60 lines, every `references/` and `scripts/` file mentioned actually exists, every agent sets `tools` and a valid `model`, every skill is used by an agent, presets and commands resolve, and the plugin version matches the package version.

### Versioning

`0.0.x` while testing; `1.0.0` once the kit is approved as stable. Releases are automated with [Changesets](https://github.com/changesets/changesets):

1. Branch off `main` (it is protected: changes land only through a PR with green CI).
2. Run `npx changeset`, pick `patch`, write one line for the changelog, and commit the file with your PR.
3. When the PR merges, the **Release** workflow opens a *Version Packages* PR that bumps `package.json`, `.claude-plugin/plugin.json` and `CHANGELOG.md`.
4. Merging that PR publishes to npm (with provenance), tags `vX.Y.Z` and creates the GitHub release.

Repo secrets: `NPM_TOKEN` (npm automation/granular token, not needed once npm trusted publishing is set up) and optionally `CHANGESETS_TOKEN` (a PAT so CI runs on the Version Packages PR).

## License

[MIT](LICENSE) © 2026 Jainik Patel

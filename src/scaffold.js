// Files created once in a project (never overwritten) + the rules block kept in CLAUDE.md / AGENTS.md.

export const PROJECT_FILES = {
  'project/progress.md': `# Progress
Phase:          Discovery
Current spec:   -
Current ticket: -
Open questions: -
Blockers:       none
Last step:      kit installed
Next step:      run /crew-start with your requirements (file or text)
`,
  'project/decisions.md': `# Decisions
<!-- One line each: YYYY-MM-DD | decision | reason | who approved -->
`,
  'project/glossary.md': `# Glossary
<!-- term | meaning | do NOT call it -->
`,
  'project/shared-questions.md': `# Shared questions
<!-- Questions that affect more than one spec. Answer these first. -->
`,
  'project/assumptions.md': `# Assumptions
<!-- Q-id | default used | date | confirmed? -->
`,
  'project/handoffs/.gitkeep': '',
};

export const BLOCK_START = '<!-- devcrew:start -->';
export const BLOCK_END = '<!-- devcrew:end -->';

export const RULES_BLOCK = `${BLOCK_START}
## devcrew
- State lives in \`project/\`: read \`project/progress.md\` (+ latest \`project/handoffs/\` note) before anything else; never re-read old chats.
- Specs: \`docs/frd/NN-name.md\`. Tickets keep IDs in progress.md. Decisions: one line in \`project/decisions.md\`.
- Commands: \`/crew-start\` begin · \`/crew-next\` do next step · \`/crew-status\` where are we · \`/crew-change\` requirements changed.
- Every choice is given as Decision / Options / Recommended. Questions use question cards with a default.
- Questions about the code: read \`project/memory.md\` + \`project/modules.md\` first, then verify in code (skill: answer-codebase-question). No map yet → \`/map-codebase\`.
- Never say "done" without showing test, lint and type-check output (skill: confirm-done).
- Approval gates: spec list, each FRD section, designs, tech plan, sprint, release.
- Subagents return <= 10 lines + file paths, never full file dumps.
${BLOCK_END}`;

/** Insert or replace the kit's block in a markdown file's text. */
export function upsertBlock(text, block = RULES_BLOCK) {
  const re = new RegExp(`${escape(BLOCK_START)}[\\s\\S]*?${escape(BLOCK_END)}`);
  if (re.test(text)) return text.replace(re, block);
  return (text.trimEnd() ? text.trimEnd() + '\n\n' : '') + block + '\n';
}

export function removeBlock(text) {
  const re = new RegExp(`\\n*${escape(BLOCK_START)}[\\s\\S]*?${escape(BLOCK_END)}\\n?`);
  return text.replace(re, '\n').replace(/\n{3,}/g, '\n\n');
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

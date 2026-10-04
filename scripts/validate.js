#!/usr/bin/env node
// Enforces the kit's token budget and structure. Run: npm run validate
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, KIT_ROOT, tokens, ownerLine } from '../src/catalog.js';
import { parseFrontmatter } from '../src/frontmatter.js';

const LIMITS = { skillLines: 60, agentLines: 60, descriptionChars: 220, alwaysLoadedTokens: 3500 };
const MODELS = ['haiku', 'sonnet', 'opus', 'fable', 'inherit'];
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const catalog = loadCatalog();

for (const s of catalog.skills.values()) {
  const file = path.join(s.dir, 'SKILL.md');
  const text = fs.readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(text);
  const where = `skills/${s.name}`;
  if (data.name !== s.name) err(where, `frontmatter name "${data.name}" must equal folder name`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name)) err(where, 'name must be kebab-case');
  if (!data.description) err(where, 'missing description');
  if (data.description?.length > LIMITS.descriptionChars) err(where, `description ${data.description.length} chars > ${LIMITS.descriptionChars}`);
  if ((data.description?.match(/[.!?](\s|$)/g) || []).length > 2) err(where, 'description should be one or two sentences');
  if (text.split('\n').length > LIMITS.skillLines) err(where, `SKILL.md ${text.split('\n').length} lines > ${LIMITS.skillLines} (move detail to references/)`);
  if (!body.trim()) err(where, 'empty body');
  for (const m of body.matchAll(/(references|scripts)\/([\w.-]+\.\w+)/g)) {
    if (!fs.existsSync(path.join(s.dir, m[1], m[2]))) err(where, `${m[1]}/${m[2]} is mentioned but missing`);
  }
  if (s.command && data['disable-model-invocation'] !== 'true') err(where, 'commands must set disable-model-invocation: true');
  const owner = ownerLine(catalog, s.name);
  if (owner && !text.includes(owner)) err(where, `missing or stale owner line; expected:\n    ${owner}`);
}

for (const a of catalog.agents.values()) {
  const text = fs.readFileSync(a.file, 'utf8');
  const { data } = parseFrontmatter(text);
  const where = `agents/${a.name}`;
  if (data.name !== a.name) err(where, 'frontmatter name must equal file name');
  if (!data.description) err(where, 'missing description');
  if (data.description?.length > LIMITS.descriptionChars) err(where, `description too long (${data.description.length})`);
  if (!MODELS.includes(a.model)) err(where, `model must be one of ${MODELS.join(', ')}`);
  if (!data.tools) err(where, 'set tools explicitly (least privilege)');
  if (text.split('\n').length > LIMITS.agentLines) err(where, `${text.split('\n').length} lines > ${LIMITS.agentLines}`);
  for (const s of a.skills) if (!catalog.skills.has(s)) err(where, `unknown skill "${s}"`);
}

for (const [cmd, def] of Object.entries(catalog.kit.commands)) {
  if (!catalog.skills.has(cmd)) err('kit.json', `command "${cmd}" has no skill folder`);
  for (const a of def.agents) if (!catalog.agents.has(a)) err('kit.json', `command "${cmd}" needs unknown agent "${a}"`);
}
for (const [name, p] of Object.entries(catalog.kit.presets)) {
  if (Array.isArray(p.agents)) p.agents.forEach((a) => catalog.agents.has(a) || err('kit.json', `preset ${name}: unknown agent ${a}`));
  if (Array.isArray(p.skills)) p.skills.forEach((s) => catalog.skills.has(s) || err('kit.json', `preset ${name}: unknown skill ${s}`));
}

// Every non-command skill should belong to at least one agent.
const owned = new Set([...catalog.agents.values()].flatMap((a) => a.skills));
for (const s of catalog.skills.values()) if (!s.command && !owned.has(s.name)) err(`skills/${s.name}`, 'not used by any agent');

const always = [...catalog.skills.values(), ...catalog.agents.values()].reduce((n, x) => n + tokens(x.name + x.description) + 6, 0);
if (always > LIMITS.alwaysLoadedTokens) err('kit', `always-loaded descriptions ~${always} tokens > ${LIMITS.alwaysLoadedTokens}`);

const plugin = JSON.parse(fs.readFileSync(path.join(KIT_ROOT, '.claude-plugin/plugin.json'), 'utf8'));
if (plugin.version !== catalog.version) err('.claude-plugin/plugin.json', `version ${plugin.version} != package ${catalog.version}`);

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`✔ ${catalog.agents.size} agents, ${catalog.skills.size} skills valid · always-loaded ≈ ${always} tokens`);

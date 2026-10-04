// Reads the kit's own skills/ and agents/ folders and resolves what an install request needs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, asList } from './frontmatter.js';

export const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadCatalog(root = KIT_ROOT) {
  const kit = JSON.parse(fs.readFileSync(path.join(root, 'kit.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const skills = new Map();
  const agents = new Map();

  const skillsDir = path.join(root, 'skills');
  for (const name of fs.readdirSync(skillsDir).sort()) {
    const file = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const { data } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    skills.set(name, {
      name,
      kind: 'skill',
      description: data.description || '',
      command: name in kit.commands,
      dir: path.join(skillsDir, name),
    });
  }

  const agentsDir = path.join(root, 'agents');
  for (const file of fs.readdirSync(agentsDir).sort()) {
    if (!file.endsWith('.md')) continue;
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(agentsDir, file), 'utf8'));
    const name = file.replace(/\.md$/, '');
    agents.set(name, {
      name,
      kind: 'agent',
      description: data.description || '',
      model: data.model || 'inherit',
      skills: asList(data.skills),
      file: path.join(agentsDir, file),
      body,
    });
  }

  return { version: pkg.version, kit, skills, agents };
}

/**
 * Expand names (skills, agents, or "preset:<x>") into the full set to install,
 * pulling in every skill an agent uses and every agent a command needs.
 */
export function resolve(catalog, names) {
  const want = { agents: new Set(), skills: new Set() };
  const unknown = [];

  const addAgent = (name) => {
    if (want.agents.has(name)) return;
    want.agents.add(name);
    for (const s of catalog.agents.get(name).skills) addSkill(s);
  };
  const addSkill = (name) => {
    if (want.skills.has(name)) return;
    if (!catalog.skills.has(name)) return unknown.push(name);
    want.skills.add(name);
    for (const a of catalog.kit.commands[name]?.agents || []) addAgent(a);
  };

  for (const raw of names) {
    const name = raw.trim();
    if (name.startsWith('preset:')) {
      const preset = catalog.kit.presets[name.slice(7)];
      if (!preset) { unknown.push(name); continue; }
      const agents = preset.agents === '*' ? [...catalog.agents.keys()] : preset.agents;
      const skills = preset.skills === '*' ? [...catalog.skills.keys()] : preset.skills;
      agents.forEach(addAgent);
      skills.forEach(addSkill);
    } else if (catalog.agents.has(name)) {
      addAgent(name);
    } else if (catalog.skills.has(name)) {
      addSkill(name);
    } else {
      unknown.push(name);
    }
  }
  return { agents: [...want.agents].sort(), skills: [...want.skills].sort(), unknown };
}

/**
 * Link a hand-picked set of agents and skills: an agent brings its skills, a command brings the
 * agents it runs, and a skill picked on its own brings the agent that uses it (unless one already
 * does). requiredBy tells which picked item pulled each extra one in.
 */
export function connect(catalog, picked) {
  const owners = new Map();
  for (const a of catalog.agents.values()) for (const s of a.skills) owners.set(s, [...(owners.get(s) || []), a.name]);
  const chosen = new Set();
  const requiredBy = new Map();

  const add = (name) => {
    if (chosen.has(name)) return;
    chosen.add(name);
    const agent = catalog.agents.get(name);
    if (agent) agent.skills.filter((s) => catalog.skills.has(s)).forEach((s) => need(s, name));
    else for (const a of catalog.kit.commands[name]?.agents || []) need(a, name);
  };
  const need = (name, by) => {
    const list = requiredBy.get(name) || [];
    if (!list.includes(by)) requiredBy.set(name, [...list, by]);
    add(name);
  };

  const known = picked.filter((n) => catalog.agents.has(n) || catalog.skills.has(n));
  known.forEach(add);
  for (const s of known) {
    const own = owners.get(s) || [];
    if (own.length && !own.some((a) => chosen.has(a))) own.forEach((a) => need(a, s));
  }
  const all = [...chosen].sort();
  return {
    agents: all.filter((n) => catalog.agents.has(n)),
    skills: all.filter((n) => catalog.skills.has(n)),
    requiredBy,
  };
}

/** Rough token estimate (~4 chars/token) — good enough to compare budgets. */
export const tokens = (text) => Math.ceil(text.length / 4);

/**
 * The hand-off line a skill carries so it always runs inside its agent: from the main chat the
 * model delegates to that agent; tools without subagents follow the role-<name> skill instead.
 * Returns null for commands and skills no agent owns. The validator checks every SKILL.md has it.
 */
export function ownerLine(catalog, skill) {
  const owners = [...catalog.agents.values()].filter((a) => a.skills.includes(skill)).map((a) => a.name);
  if (!owners.length) return null;
  const agents = owners.map((a) => `**${a}**`).join(' or ');
  const roles = owners.map((a) => '`role-' + a + '`').join(' or ');
  return `> Owner: ${agents} agent. Not running as it? Delegate this skill to it (no subagents: follow ${roles}). Inside it, just do the steps.`;
}

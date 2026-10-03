// Install / remove / update kit items at project or global scope, for one or more targets.
// Every written file is hashed in a manifest so updates never clobber files the user edited.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolve } from './catalog.js';
import { PROJECT_FILES, upsertBlock, removeBlock } from './scaffold.js';

export const MANIFEST = 'devcrew.json';

export const TARGETS = {
  // Claude Code: native skills + subagents.
  claude: { dir: '.claude', rulesFile: 'CLAUDE.md', agents: 'native' },
  // Agent Skills open standard (.agents/skills): Codex, Cursor, Gemini CLI, Copilot, OpenCode...
  // Those tools have no subagent format, so each agent becomes a "role-<name>" skill.
  agents: { dir: '.agents', rulesFile: 'AGENTS.md', agents: 'as-skill' },
};

export function baseDir({ scope, target, cwd = process.cwd(), home = os.homedir() }) {
  return path.join(scope === 'global' ? home : cwd, TARGETS[target].dir);
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
const toPosix = (p) => p.split(path.sep).join('/');

export function readManifest(base) {
  const file = path.join(base, MANIFEST);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeManifest(base, manifest) {
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
}

function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

/** The files (relative to the target base dir) that one item produces. */
export function itemFiles(catalog, target, kind, name) {
  if (kind === 'skill') {
    const skill = catalog.skills.get(name);
    return listFiles(skill.dir).map((rel) => ({
      rel: toPosix(path.join('skills', name, rel)),
      data: fs.readFileSync(path.join(skill.dir, rel)),
    }));
  }
  const agent = catalog.agents.get(name);
  if (TARGETS[target].agents === 'native') {
    return [{ rel: `agents/${name}.md`, data: fs.readFileSync(agent.file) }];
  }
  const role = `---\nname: role-${name}\ndescription: Act as the ${name}. ${agent.description}\n---\n` +
    agent.body.trimEnd() +
    `\n\nSkills this role uses: ${agent.skills.map((s) => '`' + s + '`').join(', ')}.\n`;
  return [{ rel: `skills/role-${name}/SKILL.md`, data: Buffer.from(role) }];
}

function emptyManifest(catalog, scope, target) {
  return { kit: 'devcrew', version: catalog.version, scope, target, agents: [], skills: [], files: {} };
}

/**
 * Write items. Rules:
 *  - file unknown to the manifest but already on disk -> skipped (it's the user's), unless force
 *  - file in manifest whose hash changed on disk      -> skipped (user edited it), unless force
 * Returns a report { written, unchanged, skipped, unknown }.
 */
export function install(catalog, opts) {
  const { scope, target, names, force = false, dryRun = false, scaffold = true, cwd = process.cwd(), home } = opts;
  const base = baseDir({ scope, target, cwd, home });
  const manifest = readManifest(base) || emptyManifest(catalog, scope, target);
  const plan = resolve(catalog, names);
  const report = { base, written: [], unchanged: [], skipped: [], unknown: plan.unknown, agents: plan.agents, skills: plan.skills };

  const items = [...plan.skills.map((n) => ['skill', n]), ...plan.agents.map((n) => ['agent', n])];
  for (const [kind, name] of items) {
    for (const { rel, data } of itemFiles(catalog, target, kind, name)) {
      const dest = path.join(base, rel);
      const exists = fs.existsSync(dest);
      const newHash = sha(data);
      if (exists) {
        const diskHash = sha(fs.readFileSync(dest));
        const known = manifest.files[rel];
        if (diskHash === newHash) { report.unchanged.push(rel); manifest.files[rel] = newHash; continue; }
        if (!force && (!known || known !== diskHash)) {
          report.skipped.push({ rel, reason: known ? 'edited by you' : 'not created by the kit' });
          continue;
        }
      }
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, data);
      }
      manifest.files[rel] = newHash;
      report.written.push(rel);
    }
    const list = kind === 'skill' ? manifest.skills : manifest.agents;
    if (!list.includes(name)) list.push(name);
  }

  manifest.skills.sort();
  manifest.agents.sort();
  manifest.version = catalog.version;
  manifest.updatedAt = new Date().toISOString();
  if (!dryRun) {
    writeManifest(base, manifest);
    if (scaffold && scope === 'project') report.scaffolded = scaffoldProject(cwd, target);
  }
  return report;
}

/** Create project/ memory files (only if missing) and upsert the rules block. */
export function scaffoldProject(cwd, target) {
  const created = [];
  for (const [rel, content] of Object.entries(PROJECT_FILES)) {
    const dest = path.join(cwd, rel);
    if (fs.existsSync(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
    created.push(rel);
  }
  const rules = path.join(cwd, TARGETS[target].rulesFile);
  const before = fs.existsSync(rules) ? fs.readFileSync(rules, 'utf8') : '';
  const after = upsertBlock(before);
  if (after !== before) {
    fs.writeFileSync(rules, after);
    created.push(TARGETS[target].rulesFile);
  }
  return created;
}

/**
 * Remove items (or everything with all=true). Edited files are kept unless force.
 * Refuses to remove a skill an installed agent still needs, unless force.
 */
export function remove(catalog, opts) {
  const { scope, target, names = [], all = false, force = false, dryRun = false, cwd = process.cwd(), home } = opts;
  const base = baseDir({ scope, target, cwd, home });
  const manifest = readManifest(base);
  const report = { base, removed: [], kept: [], blocked: [], missing: [] };
  if (!manifest) { report.missing = names; return report; }

  const targets = all
    ? [...manifest.skills.map((n) => ['skill', n]), ...manifest.agents.map((n) => ['agent', n])]
    : names.map((n) => [manifest.agents.includes(n) ? 'agent' : 'skill', n]);

  const leaving = new Set(targets.filter(([k]) => k === 'agent').map(([, n]) => n));
  for (const [kind, name] of targets) {
    const list = kind === 'skill' ? manifest.skills : manifest.agents;
    if (!list.includes(name)) { report.missing.push(name); continue; }
    if (kind === 'skill' && !all && !force) {
      const users = manifest.agents.filter((a) => !leaving.has(a) && catalog.agents.get(a)?.skills.includes(name));
      if (users.length) { report.blocked.push({ name, users }); continue; }
    }
    const prefix = kind === 'skill' ? `skills/${name}/` : target === 'claude' ? `agents/${name}.md` : `skills/role-${name}/`;
    for (const rel of Object.keys(manifest.files).filter((r) => r === prefix || r.startsWith(prefix))) {
      const dest = path.join(base, rel);
      if (fs.existsSync(dest) && sha(fs.readFileSync(dest)) !== manifest.files[rel] && !force) {
        report.kept.push(rel);
        continue;
      }
      if (!dryRun) { fs.rmSync(dest, { force: true }); pruneEmptyDirs(path.dirname(dest), base); }
      delete manifest.files[rel];
      report.removed.push(rel);
    }
    list.splice(list.indexOf(name), 1);
  }

  if (!dryRun) {
    if (!manifest.skills.length && !manifest.agents.length) {
      fs.rmSync(path.join(base, MANIFEST), { force: true });
      if (scope === 'project') {
        const rules = path.join(cwd, TARGETS[target].rulesFile);
        if (fs.existsSync(rules)) fs.writeFileSync(rules, removeBlock(fs.readFileSync(rules, 'utf8')));
      }
    } else {
      writeManifest(base, manifest);
    }
  }
  return report;
}

/** Re-install everything in the manifest from this kit version; drop files the new version no longer ships. */
export function update(catalog, opts) {
  const { scope, target, cwd = process.cwd(), home, force = false, dryRun = false } = opts;
  const base = baseDir({ scope, target, cwd, home });
  const manifest = readManifest(base);
  if (!manifest) return null;
  const from = manifest.version;
  const names = [...manifest.agents, ...manifest.skills].filter((n) => catalog.agents.has(n) || catalog.skills.has(n));
  const report = install(catalog, { ...opts, names, scaffold: false });

  // Files the old version wrote that the new version no longer produces.
  const fresh = readManifest(base) || manifest;
  const shipped = new Set(
    [...fresh.skills.map((n) => ['skill', n]), ...fresh.agents.map((n) => ['agent', n])]
      .filter(([k, n]) => (k === 'skill' ? catalog.skills.has(n) : catalog.agents.has(n)))
      .flatMap(([k, n]) => itemFiles(catalog, target, k, n).map((f) => f.rel)),
  );
  report.stale = [];
  for (const rel of Object.keys(fresh.files)) {
    if (shipped.has(rel)) continue;
    const dest = path.join(base, rel);
    const edited = fs.existsSync(dest) && sha(fs.readFileSync(dest)) !== fresh.files[rel];
    if (edited && !force) continue;
    if (!dryRun) { fs.rmSync(dest, { force: true }); pruneEmptyDirs(path.dirname(dest), base); }
    delete fresh.files[rel];
    report.stale.push(rel);
  }
  if (!dryRun) writeManifest(base, fresh);
  report.from = from;
  return report;
}

/** Health check for an installed scope. */
export function doctor(catalog, opts) {
  const base = baseDir(opts);
  const manifest = readManifest(base);
  const issues = [];
  if (!manifest) return { base, installed: false, issues };
  for (const [rel, hash] of Object.entries(manifest.files)) {
    const dest = path.join(base, rel);
    if (!fs.existsSync(dest)) issues.push(`missing file: ${rel}`);
    else if (sha(fs.readFileSync(dest)) !== hash) issues.push(`edited by you (kept on update): ${rel}`);
  }
  for (const a of manifest.agents) {
    for (const s of catalog.agents.get(a)?.skills || []) {
      if (!manifest.skills.includes(s)) issues.push(`agent ${a} needs skill ${s} (run: add ${s})`);
    }
  }
  if (manifest.version !== catalog.version) issues.push(`installed ${manifest.version}, kit is ${catalog.version} (run: update)`);
  return { base, installed: true, manifest, issues };
}

function pruneEmptyDirs(dir, stopAt) {
  while (dir.startsWith(stopAt) && dir !== stopAt) {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    else break;
    dir = path.dirname(dir);
  }
}

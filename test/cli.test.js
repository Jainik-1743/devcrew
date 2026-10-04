import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadCatalog, resolve, connect } from '../src/catalog.js';
import { install, remove, update, doctor, readManifest } from '../src/installer.js';
import { upsertBlock, removeBlock } from '../src/scaffold.js';
import { parseFrontmatter } from '../src/frontmatter.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'cli.js');
const catalog = loadCatalog();

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'devcrew-'));
  const cwd = path.join(root, 'proj');
  const home = path.join(root, 'home');
  fs.mkdirSync(cwd);
  fs.mkdirSync(home);
  return { cwd, home };
}

const run = (args, { cwd, home }) =>
  execFileSync(process.execPath, [CLI, ...args], { cwd, env: { ...process.env, HOME: home, USERPROFILE: home, NO_COLOR: '1' }, encoding: 'utf8' });

test('frontmatter parses scalars and lists', () => {
  const { data, body } = parseFrontmatter('---\nname: x\nskills:\n  - a\n  - b\ntools: [Read, Write]\n---\nhello');
  assert.equal(data.name, 'x');
  assert.deepEqual(data.skills, ['a', 'b']);
  assert.deepEqual(data.tools, ['Read', 'Write']);
  assert.equal(body, 'hello');
});

test('resolve pulls in agent skills and command agents', () => {
  const r = resolve(catalog, ['reviewer']);
  assert.deepEqual(r.agents, ['reviewer']);
  assert.ok(r.skills.includes('review-code') && r.skills.includes('check-security'));

  const c = resolve(catalog, ['crew-start']);
  assert.ok(c.agents.includes('analyst') && c.skills.includes('ask-questions'));

  const full = resolve(catalog, ['preset:full']);
  assert.equal(full.agents.length, catalog.agents.size);
  assert.equal(full.skills.length, catalog.skills.size);
  assert.deepEqual(resolve(catalog, ['nope']).unknown, ['nope']);
});

test('project install writes skills, agents, manifest and scaffold', () => {
  const s = sandbox();
  const r = install(catalog, { scope: 'project', target: 'claude', names: ['preset:full'], ...s });
  const base = path.join(s.cwd, '.claude');
  assert.ok(fs.existsSync(path.join(base, 'skills/ask-questions/SKILL.md')));
  assert.ok(fs.existsSync(path.join(base, 'skills/ask-questions/references/question-card.md')));
  assert.ok(fs.existsSync(path.join(base, 'agents/team-lead.md')));
  assert.ok(fs.existsSync(path.join(s.cwd, 'project/progress.md')));
  assert.match(fs.readFileSync(path.join(s.cwd, 'CLAUDE.md'), 'utf8'), /devcrew:start/);
  assert.equal(readManifest(base).agents.length, catalog.agents.size);
  assert.ok(r.written.length > 50);
  assert.ok(!fs.existsSync(path.join(s.home, '.claude')), 'project install must not touch home');
});

test('global install goes to home and skips scaffold', () => {
  const s = sandbox();
  install(catalog, { scope: 'global', target: 'claude', names: ['developer'], ...s });
  assert.ok(fs.existsSync(path.join(s.home, '.claude/agents/developer.md')));
  assert.ok(fs.existsSync(path.join(s.home, '.claude/skills/confirm-done/SKILL.md')));
  assert.ok(!fs.existsSync(path.join(s.cwd, 'project')));
});

test('agents target converts agents into role skills', () => {
  const s = sandbox();
  install(catalog, { scope: 'project', target: 'agents', names: ['reviewer'], ...s });
  const role = fs.readFileSync(path.join(s.cwd, '.agents/skills/role-reviewer/SKILL.md'), 'utf8');
  assert.match(role, /name: role-reviewer/);
  assert.match(role, /review-code/);
  assert.match(fs.readFileSync(path.join(s.cwd, 'AGENTS.md'), 'utf8'), /devcrew:start/);
});

test('owned skills route to their agent on an explicit model; inline ones keep the caller model', () => {
  for (const a of catalog.agents.values()) assert.notEqual(a.model, 'inherit', `${a.name} must pick a model`);
  assert.equal(catalog.agents.get('project-manager').model, 'haiku');
  assert.equal(catalog.agents.get('reviewer').model, 'opus');

  const mc = catalog.skills.get('map-codebase');
  assert.deepEqual([mc.context, mc.agent, mc.model], ['fork', 'codebase-expert', 'sonnet']);
  assert.equal(catalog.skills.get('create-tickets').model, 'haiku');
  assert.equal(catalog.skills.get('fix-bug').model, 'opus');
  const handoff = catalog.skills.get('write-handoff');
  assert.deepEqual([handoff.context, handoff.model], ['inline', 'inherit']);
  for (const s of catalog.skills.values()) if (s.command) assert.equal(s.context, 'inline', `${s.name} is a command`);
});

test('Claude routing keys stay for Claude Code and are stripped for other tools', () => {
  const s = sandbox();
  install(catalog, { scope: 'project', target: 'claude', names: ['codebase-expert'], ...s });
  install(catalog, { scope: 'project', target: 'agents', names: ['codebase-expert'], ...s });
  const claude = fs.readFileSync(path.join(s.cwd, '.claude/skills/map-codebase/SKILL.md'), 'utf8');
  const other = fs.readFileSync(path.join(s.cwd, '.agents/skills/map-codebase/SKILL.md'), 'utf8');
  assert.match(claude, /^context: fork$/m);
  assert.match(claude, /^agent: codebase-expert$/m);
  for (const k of ['context', 'agent', 'model', 'effort', 'background']) assert.doesNotMatch(other, new RegExp(`^${k}:`, 'm'));
  const { data, body } = parseFrontmatter(other);
  assert.equal(data.name, 'map-codebase');
  assert.match(body, /role-codebase-expert/);
});

test('user-edited and foreign files are never overwritten without --force', () => {
  const s = sandbox();
  const base = path.join(s.cwd, '.claude');
  fs.mkdirSync(path.join(base, 'skills/fix-bug'), { recursive: true });
  fs.writeFileSync(path.join(base, 'skills/fix-bug/SKILL.md'), 'mine');
  const r = install(catalog, { scope: 'project', target: 'claude', names: ['developer'], ...s });
  assert.ok(r.skipped.some((x) => x.rel === 'skills/fix-bug/SKILL.md'));
  assert.equal(fs.readFileSync(path.join(base, 'skills/fix-bug/SKILL.md'), 'utf8'), 'mine');

  const edited = path.join(base, 'skills/confirm-done/SKILL.md');
  fs.appendFileSync(edited, '\nmy rule');
  const u = update(catalog, { scope: 'project', target: 'claude', ...s });
  assert.ok(u.skipped.some((x) => x.rel === 'skills/confirm-done/SKILL.md'));
  assert.match(fs.readFileSync(edited, 'utf8'), /my rule/);
  assert.ok(doctor(catalog, { scope: 'project', target: 'claude', ...s }).issues.some((i) => i.includes('edited')));

  install(catalog, { scope: 'project', target: 'claude', names: ['developer'], force: true, ...s });
  assert.doesNotMatch(fs.readFileSync(edited, 'utf8'), /my rule/);
});

test('update refreshes an outdated rules block and keeps the rest of the file', () => {
  const s = sandbox();
  const opts = { scope: 'project', target: 'claude', ...s };
  install(catalog, { ...opts, names: ['reviewer'] });
  const rules = path.join(s.cwd, 'CLAUDE.md');
  const old = upsertBlock('# My project\n', '<!-- devcrew:start -->\n## devcrew\n- old rule\n<!-- devcrew:end -->');
  fs.writeFileSync(rules, old);

  const u = update(catalog, opts);
  assert.equal(u.rules, 'CLAUDE.md');
  const text = fs.readFileSync(rules, 'utf8');
  assert.match(text, /^# My project/);
  assert.doesNotMatch(text, /old rule/);
  assert.equal(text, upsertBlock(old));

  assert.equal(update(catalog, opts).rules, undefined);
});

test('remove blocks skills still used by an agent, then cleans up fully', () => {
  const s = sandbox();
  const opts = { scope: 'project', target: 'claude', ...s };
  install(catalog, { ...opts, names: ['reviewer'] });
  const blocked = remove(catalog, { ...opts, names: ['review-code'] });
  assert.equal(blocked.blocked[0].name, 'review-code');

  remove(catalog, { ...opts, names: ['reviewer'] });
  assert.ok(!fs.existsSync(path.join(s.cwd, '.claude/agents/reviewer.md')));
  remove(catalog, { ...opts, all: true });
  assert.ok(!fs.existsSync(path.join(s.cwd, '.claude/skills')));
  assert.ok(!fs.existsSync(path.join(s.cwd, '.claude/devcrew.json')));
  assert.doesNotMatch(fs.readFileSync(path.join(s.cwd, 'CLAUDE.md'), 'utf8'), /devcrew/);
  assert.ok(fs.existsSync(path.join(s.cwd, 'project/progress.md')), 'user project state is kept');
});

test('dry run writes nothing', () => {
  const s = sandbox();
  const r = install(catalog, { scope: 'project', target: 'claude', names: ['preset:core'], dryRun: true, ...s });
  assert.ok(r.written.length > 0);
  assert.ok(!fs.existsSync(path.join(s.cwd, '.claude')));
});

test('rules block upsert is idempotent and removable', () => {
  const once = upsertBlock('# Mine\n');
  assert.equal(upsertBlock(once), once);
  assert.equal(removeBlock(once).trim(), '# Mine');
});

test('CLI: init, list --installed, doctor, add, remove, tokens', () => {
  const s = sandbox();
  assert.match(run(['init', '--preset', 'core', '-y'], s), /6 agents/);
  assert.match(run(['list', '--installed'], s), /team-lead/);
  assert.match(run(['doctor'], s), /v\d+\.\d+\.\d+, 6 agents/);
  assert.match(run(['add', 'tester'], s), /1 agent,/);
  assert.match(run(['remove', 'tester'], s), /removed/);
  assert.match(run(['init', '-g', '-t', 'all', '-y'], s), /\.agents/);
  assert.ok(fs.existsSync(path.join(s.home, '.agents/skills/role-team-lead/SKILL.md')));
  assert.match(run(['tokens'], s), /Always loaded/);
  assert.match(run(['--version'], s), /^\d+\.\d+\.\d+/);
});

test('existing-project preset installs codebase-expert with its scanner script', () => {
  const s = sandbox();
  install(catalog, { scope: 'project', target: 'claude', names: ['preset:existing-project'], ...s });
  assert.ok(fs.existsSync(path.join(s.cwd, '.claude/agents/codebase-expert.md')));
  assert.ok(fs.existsSync(path.join(s.cwd, '.claude/skills/map-codebase/scripts/scan.mjs')));
  assert.match(fs.readFileSync(path.join(s.cwd, 'CLAUDE.md'), 'utf8'), /project\/memory\.md/);
});

test('scan.mjs summarises a repo and supports --since', () => {
  const s = sandbox();
  const scan = path.join(path.dirname(CLI), '..', 'skills/map-codebase/scripts/scan.mjs');
  fs.mkdirSync(path.join(s.cwd, 'src/api'), { recursive: true });
  fs.writeFileSync(path.join(s.cwd, 'package.json'), JSON.stringify({ name: 'demo', scripts: { test: 'vitest' }, dependencies: { express: '1' } }));
  fs.writeFileSync(path.join(s.cwd, 'src/index.ts'), 'export {}\n');
  fs.writeFileSync(path.join(s.cwd, 'src/api/users.ts'), 'export {}\n');
  const git = (...a) => execFileSync('git', a, { cwd: s.cwd, stdio: 'ignore' });
  git('init', '-q'); git('add', '.'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  const out = execFileSync(process.execPath, [scan, '.'], { cwd: s.cwd, encoding: 'utf8' });
  assert.match(out, /demo/);
  assert.match(out, /express/);
  assert.match(out, /src\/index\.ts/);
  assert.match(out, /src\/api\/users\.ts/);
  const first = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: s.cwd, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(s.cwd, 'src/api/orders.ts'), 'export {}\n');
  git('add', '.'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'orders');
  assert.match(execFileSync(process.execPath, [scan, '.', '--since', first], { cwd: s.cwd, encoding: 'utf8' }), /orders\.ts/);
});

test('connect links agents, skills and commands in both directions', () => {
  // agent -> its skills
  const a = connect(catalog, ['reviewer']);
  assert.deepEqual(a.agents, ['reviewer']);
  assert.ok(a.skills.includes('review-code') && a.requiredBy.get('review-code').includes('reviewer'));
  // skill on its own -> the agent that uses it (and that agent's other skills)
  const s = connect(catalog, ['review-code']);
  assert.deepEqual(s.agents, ['reviewer']);
  assert.deepEqual(s.requiredBy.get('reviewer'), ['review-code']);
  assert.ok(s.skills.includes('check-security'));
  // a skill already covered by a picked agent doesn't drag in its other owners
  const d = connect(catalog, ['designer', 'check-accessibility']);
  assert.ok(!d.agents.includes('tester'));
  // command -> the agents it runs
  assert.deepEqual(connect(catalog, ['crew-start']).agents.sort(), ['analyst', 'team-lead']);
  assert.deepEqual(connect(catalog, ['nope']), { agents: [], skills: [], requiredBy: new Map() });
});

test('role skills keep valid frontmatter and point back to the agent', () => {
  const s = sandbox();
  install(catalog, { scope: 'project', target: 'agents', names: ['preset:full'], ...s });
  for (const a of catalog.agents.values()) {
    const text = fs.readFileSync(path.join(s.cwd, `.agents/skills/role-${a.name}/SKILL.md`), 'utf8');
    const desc = /^description: (.*)$/m.exec(text)[1];
    assert.ok(desc.startsWith('"'), `role-${a.name} description must be quoted YAML`);
    assert.equal(JSON.parse(desc), `Act as the ${a.name}. ${a.description}`);
  }
});

test('CLI remove defaults to every installed target', () => {
  const s = sandbox();
  run(['init', '-t', 'agents', '-y'], s);
  assert.match(run(['remove', '--all'], s), /\.agents — removed \d+ files/);
  assert.equal(fs.existsSync(path.join(s.cwd, '.agents/devcrew.json')), false);
  assert.match(run(['remove', '--all'], s), /Nothing installed/);
});

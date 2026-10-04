#!/usr/bin/env node
// devcrew CLI — zero dependencies.
import fs from 'node:fs';
import { loadCatalog, connect, tokens } from '../src/catalog.js';
import { install, remove, update, doctor, readManifest, baseDir, TARGETS } from '../src/installer.js';
import { c, banner, select } from '../src/ui.js';

const HELP = `${c.b('devcrew')} — an AI dev crew (agents + skills) for Claude Code & Agent Skills tools

${c.b('Usage')}
  npx devcrew-kit                     interactive setup
  npx devcrew-kit init [options]      install a preset (default: full)
  npx devcrew-kit add <name...>       add agents, skills or preset:<name> (dependencies included)
  npx devcrew-kit remove <name...>    remove items (--all for everything)
  npx devcrew-kit update              upgrade installed items, keeping files you edited
  npx devcrew-kit list [--installed]  show agents, skills, presets
  npx devcrew-kit info <name>         details for one agent or skill
  npx devcrew-kit doctor              check an install for problems
  npx devcrew-kit tokens              always-loaded token cost of the kit

${c.b('Options')}
  -g, --global          install in your home folder (~/.claude) for every project
  -p, --project         install in this project (./.claude)            ${c.d('[default]')}
  -t, --target <t>      claude | agents | all                        ${c.d('[default: claude]')}
                        ${c.d('agents = .agents/skills (Codex, Cursor, Gemini CLI, Copilot, OpenCode)')}
      --preset <name>   full | core | planning | build | existing-project | skills-only  ${c.d('(init only)')}
      --no-scaffold     don't create project/ memory files or the CLAUDE.md block
      --force           overwrite files you edited / files not made by the kit
      --dry-run         show what would change, write nothing
  -y, --yes             no prompts
  -h, --help | -v, --version
`;

function parseArgs(argv) {
  const args = { _: [], scope: null, target: null, preset: null, scaffold: true, force: false, dryRun: false, yes: false, installed: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) fail(`${a} needs a value`); return argv[++i]; };
    if (a === '-g' || a === '--global') args.scope = 'global';
    else if (a === '-p' || a === '--project') args.scope = 'project';
    else if (a === '-t' || a === '--target') args.target = next();
    else if (a.startsWith('--target=')) args.target = a.slice(9);
    else if (a === '--preset') args.preset = next();
    else if (a.startsWith('--preset=')) args.preset = a.slice(9);
    else if (a === '--no-scaffold') args.scaffold = false;
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '-y' || a === '--yes') args.yes = true;
    else if (a === '--installed') args.installed = true;
    else if (a === '--all') args.all = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else if (a === '-v' || a === '--version') args.version = true;
    else if (a.startsWith('-')) fail(`unknown option ${a}`);
    else args._.push(a);
  }
  if (args.target && !['claude', 'agents', 'all'].includes(args.target)) fail(`--target must be claude, agents or all`);
  return args;
}

function fail(msg) {
  console.error(c.r(`error: ${msg}`));
  process.exit(1);
}

const targetsOf = (t) => (t === 'all' ? Object.keys(TARGETS) : [t || 'claude']);
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const where = (scope) => (scope === 'global' ? 'global (~)' : 'project (.)');

function printInstall(report, args) {
  const verb = args.dryRun ? 'would write' : 'wrote';
  console.log(`${c.g('✔')} ${c.b(report.base)}`);
  console.log(`  ${count(report.agents.length, 'agent')}, ${count(report.skills.length, 'skill')} — ${verb} ${report.written.length} files, ${report.unchanged.length} unchanged`);
  for (const s of report.skipped) console.log(`  ${c.y('skipped')} ${s.rel} ${c.d(`(${s.reason}; use --force to overwrite)`)}`);
  if (report.unknown.length) console.log(`  ${c.r('unknown')} ${report.unknown.join(', ')} ${c.d('(see: list)')}`);
  if (report.scaffolded?.length) console.log(`  ${c.d('created')} ${report.scaffolded.join(', ')}`);
  if (report.stale?.length) console.log(`  ${c.d('removed old')} ${report.stale.length} files`);
}

async function wizard(catalog, args) {
  banner(catalog.version);
  args.scope ??= await select({
    title: 'Where should it be installed?',
    options: [
      { value: 'project', label: 'This project', hint: './.claude — shared with your team via git' },
      { value: 'global', label: 'Global', hint: '~/.claude — available in every project' },
    ],
  });
  args.target ??= await select({
    title: 'Which AI tool?',
    options: [
      { value: 'claude', label: 'Claude Code', hint: 'agents + skills' },
      { value: 'agents', label: 'Other Agent Skills tools', hint: 'Codex, Cursor, Gemini CLI, Copilot (.agents/skills)' },
      { value: 'all', label: 'Both', hint: 'Claude Code and .agents/skills' },
    ],
  });
  const preset = args.preset ?? await select({
    title: 'What should the crew include?',
    options: [
      ...Object.entries(catalog.kit.presets).map(([k, p]) => ({ value: k, label: k, hint: p.description })),
      { value: 'custom', label: 'custom', hint: 'pick agents and skills yourself — dependencies are linked' },
    ],
  });
  args._ = preset === 'custom' ? await pickCustom(catalog) : [`preset:${preset}`];
  const go = await select({
    title: 'Ready to install?',
    options: [
      { value: true, label: 'Install', hint: `${where(args.scope)} · ${args.target}` },
      { value: false, label: 'Cancel', hint: 'nothing is written' },
    ],
  });
  if (!go) {
    console.log(c.y('Setup cancelled. Nothing was installed.'));
    process.exit(0);
  }
  console.log();
}

// One list of agents, commands and skills, kept consistent as you toggle (see connect()).
function pickCustom(catalog) {
  const picked = new Set();
  let state = connect(catalog, []);
  const isOn = (n) => state.agents.includes(n) || state.skills.includes(n);
  const why = (n) => (state.requiredBy.get(n) || []).filter(isOn).join(', ');
  const update = () => { state = connect(catalog, [...picked]); };
  const plain = [...catalog.skills.values()].filter((s) => !s.command);
  const model = {
    has: isOn,
    toggle(n) {
      if (picked.has(n)) {
        picked.delete(n);
        update();
        return isOn(n) ? `${n} stays: needed by ${why(n)}` : '';
      }
      if (isOn(n)) return `${n} is needed by ${why(n)} — untick that first`;
      picked.add(n);
      update();
      const added = [...state.agents, ...state.skills].filter((x) => x !== n && (state.requiredBy.get(x) || []).includes(n));
      return added.length ? `+ ${n} brings ${added.length > 4 ? `${added.length} items` : added.join(', ')}` : '';
    },
    note: (n) => (picked.has(n) ? '' : `↳ needed by ${why(n)}`),
    setAll(on) {
      picked.clear();
      if (on) [...catalog.agents.keys(), ...catalog.skills.keys()].forEach((n) => picked.add(n));
      update();
    },
    size: () => state.agents.length + state.skills.length,
    status: () => `${count(state.agents.length, 'agent')} · ${count(state.skills.length, 'skill')}`,
    result: () => [...state.agents, ...state.skills],
    summary: () => `${count(state.agents.length, 'agent')}, ${count(state.skills.length, 'skill')}`,
  };
  return select({
    title: 'Pick agents and skills (linked items are added for you)',
    multi: true,
    model,
    options: [
      { heading: 'Agents' },
      ...[...catalog.agents.values()].map((a) => ({ value: a.name, label: a.name, hint: a.description })),
      { heading: 'Commands' },
      ...[...catalog.skills.values()].filter((s) => s.command).map((s) => ({ value: s.name, label: `/${s.name}`, hint: s.description })),
      { heading: 'Skills' },
      ...plain.map((s) => ({ value: s.name, label: s.name, hint: s.description })),
    ],
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalog = loadCatalog();
  if (args.version) return console.log(catalog.version);
  let [cmd, ...rest] = args._;
  if (args.help || cmd === 'help') return console.log(HELP);

  if (!cmd) {
    if (!process.stdin.isTTY || args.yes) return console.log(HELP);
    await wizard(catalog, args);
    cmd = 'add';
    rest = args._;
  }
  const scope = args.scope || 'project';
  const opts = { scope, force: args.force, dryRun: args.dryRun, scaffold: args.scaffold };

  switch (cmd) {
    case 'init':
    case 'install': {
      const preset = args.preset || rest[0] || 'full';
      if (!catalog.kit.presets[preset]) fail(`unknown preset "${preset}" — choose: ${Object.keys(catalog.kit.presets).join(', ')}`);
      return runInstall(catalog, [`preset:${preset}`], args, opts);
    }
    case 'add': {
      if (!rest.length) fail('add needs at least one name (see: list)');
      return runInstall(catalog, rest, args, opts);
    }
    case 'remove':
    case 'rm':
    case 'uninstall': {
      if (!rest.length && !args.all) fail('remove needs names, or --all');
      // Like update/doctor: every installed target unless one is named.
      const installed = targetsOf(args.target || 'all').filter((t) => args.target || readManifest(baseDir({ scope, target: t })));
      if (!installed.length) return console.log(`Nothing installed at ${where(scope)} scope.`);
      for (const target of installed) {
        const r = remove(catalog, { ...opts, target, names: rest, all: args.all });
        console.log(`${c.g('✔')} ${c.b(r.base)} — removed ${r.removed.length} files`);
        for (const k of r.kept) console.log(`  ${c.y('kept')} ${k} ${c.d('(edited by you; --force to delete)')}`);
        for (const b of r.blocked) console.log(`  ${c.y('blocked')} ${b.name} ${c.d(`(used by ${b.users.join(', ')}; --force to remove)`)}`);
        if (r.missing.length) console.log(`  ${c.d('not installed:')} ${r.missing.join(', ')}`);
      }
      return;
    }
    case 'update':
    case 'upgrade': {
      let any = false;
      for (const target of targetsOf(args.target || 'all')) {
        const r = update(catalog, { ...opts, target });
        if (!r) continue;
        any = true;
        console.log(c.d(`${target}: ${r.from} → ${catalog.version}`));
        printInstall(r, args);
        if (r.rules) console.log(`  ${c.d('updated rules block in')} ${r.rules}`);
      }
      if (!any) console.log(`Nothing installed at ${where(scope)} scope. Run ${c.c('npx devcrew-kit init')}`);
      return;
    }
    case 'list':
    case 'ls':
      return list(catalog, args, scope);
    case 'info':
      return info(catalog, rest[0]);
    case 'doctor': {
      let any = false;
      for (const target of targetsOf(args.target || 'all')) {
        const r = doctor(catalog, { scope, target });
        if (!r.installed) continue;
        any = true;
        const m = r.manifest;
        console.log(`${r.issues.length ? c.y('!') : c.g('✔')} ${c.b(r.base)} — v${m.version}, ${m.agents.length} agents, ${m.skills.length} skills`);
        r.issues.forEach((i) => console.log(`  - ${i}`));
      }
      if (!any) console.log(`Nothing installed at ${where(scope)} scope.`);
      return;
    }
    case 'tokens':
      return tokenReport(catalog);
    default:
      fail(`unknown command "${cmd}"\n\n${HELP}`);
  }
}

function runInstall(catalog, names, args, opts) {
  let hasStart = false;
  for (const target of targetsOf(args.target)) {
    const report = install(catalog, { ...opts, target, names });
    if (report.unknown.length && !report.skills.length) fail(`unknown: ${report.unknown.join(', ')} (see: list)`);
    hasStart ||= report.skills.includes('crew-start');
    printInstall(report, args);
  }
  if (!args.dryRun) {
    if (hasStart) console.log(`\n${c.b('Next:')} open Claude Code and run ${c.c('/crew-start')} with your requirements (a file or pasted text).`);
    else console.log(`\n${c.b('Next:')} open your AI tool — the installed agents and skills are ready to use.`);
    console.log(c.d('Tip: restart Claude Code if it was already open, so it picks up new agents.'));
  }
}

function list(catalog, args, scope) {
  if (args.installed) {
    for (const target of targetsOf(args.target || 'all')) {
      const m = readManifest(baseDir({ scope, target }));
      if (!m) continue;
      console.log(`${c.b(baseDir({ scope, target }))} v${m.version}`);
      console.log(`  agents: ${m.agents.join(', ') || '-'}`);
      console.log(`  skills: ${m.skills.join(', ') || '-'}`);
    }
    return;
  }
  console.log(c.b('\nPresets'));
  for (const [k, p] of Object.entries(catalog.kit.presets)) console.log(`  ${c.c(k.padEnd(13))}${p.description}`);
  console.log(c.b('\nAgents'));
  for (const a of catalog.agents.values()) console.log(`  ${c.c(a.name.padEnd(17))}${c.d(a.model.padEnd(7))} ${a.description}`);
  console.log(c.b('\nCommands'));
  for (const s of catalog.skills.values()) if (s.command) console.log(`  ${c.c(('/' + s.name).padEnd(17))}${s.description}`);
  console.log(c.b('\nSkills'));
  for (const s of catalog.skills.values()) if (!s.command) console.log(`  ${c.c(s.name.padEnd(22))}${s.description}`);
  console.log();
}

function info(catalog, name) {
  if (!name) fail('info needs a name');
  const a = catalog.agents.get(name);
  if (a) {
    const effort = a.effort ? `, effort ${a.effort}` : '';
    console.log(`${c.b(a.name)} ${c.d(`agent · model ${a.model}${effort}`)}\n${a.description}\nskills: ${a.skills.join(', ')}`);
    return;
  }
  const s = catalog.skills.get(name);
  if (!s) fail(`unknown: ${name}`);
  const users = [...catalog.agents.values()].filter((x) => x.skills.includes(name)).map((x) => x.name);
  const refs = fs.existsSync(`${s.dir}/references`) ? fs.readdirSync(`${s.dir}/references`) : [];
  console.log(`${c.b(s.name)} ${c.d(s.command ? 'command' : 'skill')}\n${s.description}`);
  if (users.length) console.log(`used by: ${users.join(', ')}`);
  if (s.context === 'fork') console.log(`runs as: ${s.agent} agent · model ${s.model}${s.effort ? `, effort ${s.effort}` : ''}`);
  else if (!s.command) console.log('runs: inline, on the caller\'s model');
  if (refs.length) console.log(`references (loaded on demand): ${refs.join(', ')}`);
}

function tokenReport(catalog) {
  // Only name + description are always in context; bodies load when used.
  const skillMeta = [...catalog.skills.values()].reduce((n, s) => n + tokens(s.name + s.description) + 6, 0);
  const agentMeta = [...catalog.agents.values()].reduce((n, a) => n + tokens(a.name + a.description) + 6, 0);
  const bodies = [...catalog.skills.values()].map((s) => tokens(fs.readFileSync(`${s.dir}/SKILL.md`, 'utf8')));
  const avg = Math.round(bodies.reduce((a, b) => a + b, 0) / bodies.length);
  console.log(`${c.b('Always loaded')} (descriptions): ~${skillMeta + agentMeta} tokens  ${c.d(`skills ${skillMeta} + agents ${agentMeta}`)}`);
  console.log(`${c.b('Per skill when used')}: avg ~${avg}, max ~${Math.max(...bodies)} tokens  ${c.d('(references/ load only if needed)')}`);
}

main().catch((err) => fail(err.message));

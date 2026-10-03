#!/usr/bin/env node
// Keeps .claude-plugin/plugin.json on the package.json version. Runs after `changeset version`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const file = path.join(root, '.claude-plugin', 'plugin.json');
const plugin = JSON.parse(fs.readFileSync(file, 'utf8'));
if (plugin.version !== version) {
  plugin.version = version;
  fs.writeFileSync(file, JSON.stringify(plugin, null, 2) + '\n');
  console.log(`plugin.json -> ${version}`);
}

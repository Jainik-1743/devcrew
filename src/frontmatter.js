// Minimal YAML-frontmatter reader: scalars, inline lists [a, b] and "- item" lists.
// Enough for SKILL.md / agent files; no dependency on a YAML library.

export function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { data: {}, body: text };
  const data = {};
  let listKey = null;
  for (const raw of match[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item && listKey) {
      data[listKey].push(unquote(item[1]));
      continue;
    }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '') {
      data[key] = [];
      listKey = key;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value.slice(1, -1).split(',').map((v) => unquote(v)).filter(Boolean);
      listKey = null;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return { data, body: match[2] };
}

function unquote(v) {
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

/** Normalise a "tools"/"skills" field that may be a list or a comma string. */
export function asList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

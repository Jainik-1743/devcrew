// Terminal UI for the interactive setup: colors, banner and arrow-key menus. Zero dependencies.
import readline from 'node:readline';

const out = process.stdout;
export const color = Boolean(out.isTTY && !process.env.NO_COLOR);

const esc = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = { b: esc(1), d: esc(2), g: esc(32), y: esc(33), r: esc(31), c: esc(36), m: esc(35) };
const fg = (n) => esc(`38;5;${n}`);

// "devcrew" in figlet's Standard font (kerned).
const LOGO = [
  '     _                                  ',
  '  __| | _____   _____ _ __ _____      __',
  ' / _` |/ _ \\ \\ / / __| \'__/ _ \\ \\ /\\ / /',
  '| (_| |  __/\\ V / (__| | |  __/\\ V  V / ',
  ' \\__,_|\\___| \\_/ \\___|_|  \\___| \\_/\\_/  ',
];
// cyan -> blue -> violet -> pink, spread across the width of the logo
const GRADIENT = [51, 45, 39, 33, 63, 99, 135, 171, 207];

export function banner(version) {
  const rows = LOGO;
  const width = rows[0].length;
  const paint = (row) => [...row].map((ch, x) => fg(GRADIENT[Math.floor((x / width) * GRADIENT.length)])(ch)).join('');
  const rule = c.d('─'.repeat(width + 2));

  const name = 'Jainik Patel';
  const plate = ` ✦ crafted by ${name} `;
  const edge = fg(214);
  const lines = [
    '',
    ` ${rule}`,
    ...rows.map((r) => `  ${c.b(paint(r))}`),
    '',
    `  ${c.d('an AI dev crew for Claude Code & Agent Skills tools')}  ${fg(45)(`v${version}`)}`,
    `  ${edge(`╭${'─'.repeat(plate.length)}╮`)}`,
    `  ${edge('│')} ${fg(214)('✦')} ${c.d('crafted by')} ${c.b(fg(231)(name))} ${edge('│')}`,
    `  ${edge(`╰${'─'.repeat(plate.length)}╯`)}`,
    ` ${rule}`,
    '',
  ];
  out.write(lines.join('\n') + '\n');
}

const fit = (s, max) => (s.length > max ? s.slice(0, Math.max(0, max - 1)) + '…' : s);

/**
 * Arrow-key menu. Resolves to the chosen value, or for multi to model.result().
 * options: [{ value, label, hint }] plus optional [{ heading }] rows the cursor skips.
 * multi needs a model: { has(v), toggle(v) -> message?, note(v) -> string?, setAll(on), size(),
 * status(), result(), summary() }. A choice is required: Enter with nothing selected is refused.
 */
export function select({ title, options, multi = false, model }) {
  const input = process.stdin;
  const pickable = options.map((o, i) => (o.heading ? -1 : i)).filter((i) => i >= 0);
  let at = 0; // index into pickable
  let top = 0; // first visible row
  let message = '';
  let drawn = 0;

  const labelWidth = Math.max(...options.map((o) => (o.label || '').length));
  const render = () => {
    const cols = (out.columns || 80) - 1;
    const height = Math.max(5, Math.min(options.length, (out.rows || 24) - 5));
    const cursor = pickable[at];
    if (cursor < top) top = cursor > 0 && options[cursor - 1].heading ? cursor - 1 : cursor;
    if (cursor >= top + height) top = cursor - height + 1;

    const lines = [`${c.c('?')} ${c.b(title)}`];
    for (const [i, o] of options.slice(top, top + height).map((o, k) => [top + k, o])) {
      if (o.heading) {
        lines.push(`  ${c.m(c.b(o.heading))}`);
        continue;
      }
      const active = i === cursor;
      const on = multi && model.has(o.value);
      const mark = multi ? (on ? c.g('◉') : c.d('◯')) : active ? c.c('●') : c.d('○');
      const label = o.label.padEnd(labelWidth);
      const note = multi && on ? model.note(o.value) : '';
      const room = cols - labelWidth - 8;
      const tail = note ? c.y(fit(note, room)) : c.d(fit(o.hint || '', room));
      lines.push(` ${active ? c.c('❯') : ' '} ${mark} ${active ? c.b(c.c(label)) : label}  ${tail}`);
    }
    const more = options.length > height ? c.d(`  ${top > 0 ? '↑' : ' '}${top + height < options.length ? '↓' : ' '} more  `) : '  ';
    const keys = multi ? `${model.status()} · space toggle · a all · enter confirm` : '↑/↓ move · enter select';
    lines.push(message ? `${more}${c.y(message)}` : `${more}${c.d(fit(keys, cols - 10))}`);
    if (drawn) out.write(`\x1b[${drawn}A\x1b[0J`);
    out.write(lines.join('\n') + '\n');
    drawn = lines.length;
  };

  return new Promise((resolve) => {
    const finish = (value, summary) => {
      input.off('keypress', onKey);
      input.setRawMode(false);
      input.pause();
      out.write(`\x1b[${drawn}A\x1b[0J\x1b[?25h`);
      out.write(`${c.g('✔')} ${c.b(title)} ${c.d('·')} ${c.c(summary)}\n`);
      resolve(value);
    };
    const onKey = (str, key = {}) => {
      message = '';
      const n = pickable.length;
      const current = options[pickable[at]];
      if (key.ctrl && key.name === 'c') {
        out.write(`\x1b[${drawn}A\x1b[0J\x1b[?25h${c.y('Setup cancelled.')}\n`);
        process.exit(130);
      }
      if (key.name === 'up' || str === 'k') at = (at - 1 + n) % n;
      else if (key.name === 'down' || str === 'j' || key.name === 'tab') at = (at + 1) % n;
      else if (key.name === 'pageup') at = Math.max(0, at - 10);
      else if (key.name === 'pagedown') at = Math.min(n - 1, at + 10);
      else if (!multi && /^[1-9]$/.test(str || '') && Number(str) <= n) at = Number(str) - 1;
      else if (multi && key.name === 'space') message = model.toggle(current.value) || '';
      else if (multi && str === 'a') model.setAll(!pickable.every((i) => model.has(options[i].value)));
      else if (key.name === 'return' || key.name === 'enter') {
        if (!multi) return finish(current.value, current.label.trim());
        if (!model.size()) message = 'Select at least one (space to toggle).';
        else return finish(model.result(), model.summary());
      }
      render();
    };
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    input.on('keypress', onKey);
    out.write('\x1b[?25l');
    render();
  });
}

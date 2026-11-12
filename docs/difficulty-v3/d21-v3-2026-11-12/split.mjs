// D21-V3 (MP09d2; cross-review TP03): splits the no-stall captures for the two analyses. simulate.mjs is exact only in
// `any` mode, where the stall stop returns the best raw candidate; in `require` mode the stop hands the candidates to
// the uniqueness repair, so those calls are certified by reruns (rerun.mjs, certify.mjs). The nine vector calls that
// rate with scripted difficulty-v2 doubles are mechanics controls, never v3 evidence. For each input <name>.jsonl this
// writes <out>/screen/<name>.jsonl (every line except require-mode call lines and controls), <out>/require/<name>.jsonl
// (the require-mode call lines that are not controls; only when there are some) and, for the controls,
// <out>/controls/vectors-scripted.jsonl. It never overwrites a file. Prints one count line per input.
//   node ./<this folder>/split.mjs <out dir> <files...>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const CONTROLS = new Set(['vec/tie-0', 'vec/req-0', 'vec/req-2', 'vec/req-3', 'vec/req-3-excluded', 'vec/budget-0',
  'vec/budget-1', 'vec/none-0-any', 'vec/none-0-require']);

const [out, ...files] = process.argv.slice(2);
if (out === undefined || files.length === 0) {
  throw new Error('usage: split.mjs <out dir> <files...>');
}
/** @param {string} file @param {string[]} lines */
const write = (file, lines) => {
  if (existsSync(file)) {
    throw new Error(`${file} exists: split never overwrites`);
  }
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, lines.map((l) => `${l}\r\n`).join(''));
};
/** @type {string[]} */
const controls = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n').map((l) => l.trimEnd()).filter((l) => l !== '');
  const screen = [];
  const require = [];
  for (const line of lines) {
    const l = JSON.parse(line);
    if (CONTROLS.has(l.tag)) {
      controls.push(line);
    } else if (l.kind === 'call' && l.mode === 'require') {
      require.push(line);
    } else {
      screen.push(line);
    }
  }
  write(join(out, 'screen', basename(file)), screen);
  if (require.length > 0) {
    write(join(out, 'require', basename(file)), require);
  }
  console.log(`${basename(file)}: ${screen.length} screen lines, ${require.length} require calls`);
}
if (controls.length > 0) {
  const found = new Set(controls.map((l) => JSON.parse(l).tag));
  const missing = [...CONTROLS].filter((t) => !found.has(t));
  if (missing.length > 0) {
    throw new Error(`control calls missing: ${missing.join(', ')}`);
  }
  write(join(out, 'controls', 'vectors-scripted.jsonl'), controls);
  console.log(`controls: ${controls.length} lines`);
}

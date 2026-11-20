import { EDITS } from './v4-anchors-list.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const COMMIT = '3fc65f4';
const show = (p) => execFileSync('git', ['show', `${COMMIT}:${p}`], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n');
const chain = ['instr', 'log'].map((v) => JSON.parse(readFileSync(`tools/ig-proto/variants/${v}.json`, 'utf8')));
const files = new Map();
const get = (p) => { if (!files.has(p)) files.set(p, show(p)); return files.get(p); };
for (const m of chain) for (const e of m.edits ?? []) {
  const t = get(e.file);
  if (e.append !== undefined) { files.set(e.file, t + e.append); continue; }
  const i = t.indexOf(e.find);
  if (i < 0 || t.indexOf(e.find, i + 1) >= 0) { console.log('chain edit not unique', e.id); continue; }
  files.set(e.file, t.slice(0, i) + e.replace + t.slice(i + e.find.length));
}
for (const [id, file, find] of EDITS) {
  const t = get(file); let n = 0; for (let i = t.indexOf(find); i >= 0; i = t.indexOf(find, i + 1)) n += 1;
  console.log(`${n === 1 ? 'ok  ' : 'FAIL'} ${id} ${file}: ${n} (after instr, log)`);
}

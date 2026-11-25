// @ts-check
// SA-Opus, round 1: the condensed stage-2 table of the analysis (section 3), merged from s2-rows.json and s2-calls.json.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-table.mjs   (after s2-rows.mjs and s2-calls.mjs)
// Writes s2-table.md beside this script.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { f, HERE, writeCrlf } from './s2-lib.mjs';

const rows = JSON.parse(readFileSync(join(HERE, 's2-rows.json'), 'utf8'));
const calls = JSON.parse(readFileSync(join(HERE, 's2-calls.json'), 'utf8'));
const order = ['12x12-nightmare', '10x10-nightmare', '14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare', '15x20-nightmare',
  '26x26-nightmare', '26x26-hell-1', '20x20-hell-1', '24x24-hell-1', '14x14-hell-1'];
const md = ['| Cell (class) | Arm | Ten of 5 | T1 med s | T10 med (max) s | Response max s | Clues med (share) | Census-estimate share | Work lo / hi per puzzle G | W of the start lines |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---|'];
for (const cell of order) {
  for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5']) {
    const s = rows.arms[arm]?.[cell];
    const c = calls.arms[arm]?.[cell];
    if (!s || !c) continue;
    const w = Object.keys(c.wSeen).map((x) => `${(Number(x) / 1e6).toFixed(0)} M`).join(', ');
    md.push(`| ${cell} (${c.cls}) | ${arm} | ${s.reachedTen} | ${f(s.t1MedS, 1)} | ${f(s.t10MedS, 1)} (${f(s.t10MaxS, 1)}) | ${f(s.respMaxS, 1)} | ${f(s.cluesMed, 1)} (${f(s.shareMed, 3)}) | ${f(s.censusEstimateShare, 2)} | ${f(c.loPerAcc / 1e9, 2)} / ${f(c.hiPerAcc / 1e9, 2)} | ${w} |`);
  }
}
writeCrlf(join(HERE, 's2-table.md'), md.join('\n'));
process.stdout.write(md.join('\n') + '\n');

import { readFileSync } from 'node:fs';
import { levelForScore, offeredLevels } from '../../../../../core/engine/levels.js';
const dir = 'docs/improve-generating/evidence/provisional/IGP-05/';
let fam = 0, probes = 0, rated = 0, alt = 0, mismatch = 0, offered = 0;
const pops = {};
for (const part of ['failed-sets', 'scan', 'windows']) {
  const L = readFileSync(dir + 'families-' + part + '.jsonl', 'utf8').split('\n').filter((l) => l !== '').map((l) => JSON.parse(l));
  for (const f of L) {
    fam++;
    for (const p of f.probes) {
      probes++;
      if (p.score === null) continue;
      rated++;
      const lv = levelForScore(p.score).id;
      if (lv !== p.level) mismatch++;
      if (lv.startsWith('hell-') && lv !== f.level) {
        alt++;
        if (offeredLevels(f.set.area).some((l) => l.id === lv)) offered++;
        const k = lv + '|' + f.case;
        (pops[k] ??= []).push([p.count, p.score, f.set.area]);
      }
    }
  }
}
console.log({ fam, probes, rated, alt, mismatch, offered });
console.log(JSON.stringify(pops['hell-3|15x15b10-hell-1']));

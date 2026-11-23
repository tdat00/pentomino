// @ts-check
// SA-Opus, round 1: a no-regression preview on the pilot seeds (read-only, unlocked). Today's search on the same seeds is
// MP12b1's report (landscape/<case>/<rep>, reps 0 to 4; the stage-1 identity receipt found today's search unchanged on the
// frozen source, factor 1.0236), so the ratio today over after per seed is T09b's no-regression quantity, on five fitting
// seeds and two runs at different times: an indication for the controls, never the gate.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-today.mjs
// Writes s2-today.md beside this script.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { armShards, CAP_MS, f, geo, HERE, QUANTITY, ROOT, V, writeCrlf } from './s2-lib.mjs';

const P = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'paths.mjs')).href);
const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const REPS = [0, 1, 2, 3, 4];
const md = ['# No-regression preview: today (MP12b1, reps 0 to 4) over the stage-2 arms (SA-Opus scratch, round 1)', '',
  'Per seed `cappedT10(today) / cappedT10(after)` (T09b\'s no-regression ratio; below 1 the new search is slower), today\'s',
  'run being MP12b1\'s request of the same seed. `today ten` counts MP12b1\'s rows of reps 0 to 4 that reached ten.', '',
  '| Cell | Arm | today ten | after ten | ratios rep 0-4 | geo | min |', '|---|---|---:|---:|---|---:|---:|'];
for (const arm of ['fr-none', 'fr-screen', 'fr-base']) {
  for (const s of armShards(arm)) {
    const found = P.mp12b1Report(s.cell);
    if (found === null) {
      md.push(`| ${s.cell} | ${arm} | no MP12b1 report | | | | |`);
      continue;
    }
    const runs = found.report.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation' && REPS.includes(r.rep));
    const ratios = [];
    let todayTen = 0;
    for (const rep of REPS) {
      const today = runs.find((/** @type {any} */ r) => r.rep === rep);
      const after = s.rows.find((r) => r.rep === rep);
      if (!today || !after) {
        ratios.push(null);
        continue;
      }
      const t = M.withoutSampling(today);
      if (V.reachedTen(t, { quantity: QUANTITY })) todayTen += 1;
      ratios.push(V.cappedT10(t, { quantity: QUANTITY, capMs: CAP_MS }) / V.cappedT10(after.run, { quantity: QUANTITY, capMs: CAP_MS }));
    }
    const afterTen = s.rows.filter((r) => V.reachedTen(r.run, { quantity: QUANTITY })).length;
    const ok = /** @type {number[]} */ (ratios.filter((x) => x !== null));
    md.push(`| ${s.cell} | ${arm} | ${todayTen} | ${afterTen} | ${ratios.map((x) => f(x)).join(' ')} | ${f(geo(ok), 2)} | ${f(Math.min(...ok), 2)} |`);
  }
}
writeCrlf(join(HERE, 's2-today.md'), md.join('\n'));
process.stdout.write(md.join('\n') + '\n');

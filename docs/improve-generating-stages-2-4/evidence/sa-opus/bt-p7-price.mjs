// @ts-check
// SA-Opus, break-tasks: the price of V4-P7 for one to three composites (T05b's expected figures). Read-only.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-p7-price.mjs
import { readFileSync } from 'node:fs';
const M = await import('../../../../tools/ig-proto/manifest.mjs');
const k = JSON.parse(readFileSync(new URL('../../../../docs/improve-generating/evidence/frozen/V4-S2K/kernel.json', import.meta.url), 'utf8'));
const d = [0, 1, 2].flatMap(() => k.rows.map((r) => 1.25 * r.itemMs / 1000));
const g = (c) => ({ type: 'items', groups: [{ kind: 'p7-time', variant: c, lanes: 1, reserveS: 90, durationsS: d }] });
for (const n of [1, 2, 3]) {
  const steps = ['a', 'b', 'c'].slice(0, n).map(g);
  const p = M.price(steps);
  const alloc = Math.ceil(steps.map((s) => M.stepPrice(s)).reduce((a, s) => a + s.projectS + 45 * s.invocations, 0) / 60);
  console.log(n, 'alloc', alloc, 'guardS', p.guardS.toFixed(3), 'guardMin', (p.guardS / 60).toFixed(6), 'projMin', (p.countedS / 60).toFixed(6));
}

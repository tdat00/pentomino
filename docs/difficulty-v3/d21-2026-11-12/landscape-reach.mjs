// D21: structural reach of the central half of every band in the landscape matrix (v2 rating, read-only).
// The highest possible v2 score of a puzzle with K pieces is one clue (U = K - 1) with a saturated B:
// round(2 (K - 1) + 8 log10(1 + 5000)) = 2 (K - 1) + 30. A cell whose highest possible score is below the lower edge
// of the central half can never stop early on a central result; every puzzle there spends 48 ratings.
//   node ./docs/difficulty-v3/d21-2026-11-12/landscape-reach.mjs
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { buildLandscapeMatrix } = await imp('tools/bench/calibration-reference.js');
const { level } = await imp('core/engine/levels.js');
const { pieceCountRange } = await imp('core/engine/policy.js');
const { boardFromRows, activeCount } = await imp('core/engine/board.js');

const top = (/** @type {number} */ k) => Math.round(2 * (k - 1) + 8 * Math.log10(1 + 5000));
const matrix = buildLandscapeMatrix();
console.log('| case | cells | K range | band | central half | highest possible score at max K | at min K | central half reachable | K values that cannot reach it |');
console.log('|---|---|---|---|---|---|---|---|---|');
let unreachable = 0;
for (const c of matrix.cases) {
  const area = activeCount(boardFromRows(c.boardRows));
  const ks = pieceCountRange(c.levelId, area);
  const lv = level(c.levelId);
  const finite = Number.isFinite(lv.max);
  const centre = (lv.min + lv.max) / 2;
  const lo = centre - (lv.max - lv.min) / 4;
  const kMax = Math.max(...ks);
  const kMin = Math.min(...ks);
  const reach = !finite || top(kMax) >= lo;
  const reachAll = !finite || top(kMin) >= lo;
  const blocked = finite ? ks.filter((k) => top(k) < lo).length : 0;
  if (!reach) {
    unreachable += 1;
  }
  console.log(`| ${c.id} | ${area} | ${kMin}-${kMax} | [${lv.min}, ${finite ? lv.max : 'inf'}) | `
    + `${finite ? `[${lo}, ${centre + (lv.max - lv.min) / 4}]` : 'none (unbounded)'} | ${top(kMax)} | ${top(kMin)} | `
    + `${reach ? (reachAll ? 'yes' : `only for K >= ${ks.find((k) => top(k) >= lo)}`) : 'NO'} | ${blocked}/${ks.length} |`);
}
console.log(`cells: ${matrix.cases.length}; central half unreachable for every K: ${unreachable}`);

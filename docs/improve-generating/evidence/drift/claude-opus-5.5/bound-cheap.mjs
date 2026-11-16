// Read-only: the cheap proved bound of T02d (IG-P-Q37) on carved sets, without building a model.
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const ROOT = process.cwd();
const { loadEngine } = await import(pathToFileURL(join(ROOT, 'tools/ig-proto/lib/engine.mjs')).href);
const { caseBoard, firstCarvedSet } = await import(pathToFileURL(join(ROOT, 'tools/ig-proto/lib/sets.mjs')).href);
const e = await loadEngine(ROOT);
export function stretch({ R, C, NC, NP, NZ, L, K, Tsz }) {
  const sel = L + 2 * NZ, U = R + C + NZ;
  const P = sel + U + (C + K + sel) + ((NC + 1) * (NP + 1) + NC) + (NZ + sel) + (R + 4 * NZ + NP * L + L * K)
    + (3 * NZ + R + (L - 1) * (R + NZ)) + (3 * NZ + sel + U)
    + (NC + 2 * NC * (R + NP) + 2 * R + NZ + 2 * NP + (NP + 1) * (NC + 1) * (2 * Tsz + 1))
    + (9 * NC + NP + NZ * (2 + 2 * NC + L) + NP * NP + NP * (NC + 1) * (NP + 1) + NZ)
    + (3 * NZ + (NC * NC) / 2 + 3 * ((NC * NC) / 2) * K * L) + (C + K); // R9 as corrected by review 4 (R4-01)
  return { P, U };
}
for (const id of process.argv.slice(2)) {
  const entry = caseBoard(id);
  const carved = firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText: `ig-v4/bound/${id}` });
  if (!carved.ok) { console.log(id, 'no carve'); continue; }
  const sizes = carved.set.pieces.map((p) => p.cells.length);
  const A = carved.board.width * carved.board.height;
  const NC = e.board.activeCount(carved.board), NP = sizes.length, Tsz = sizes.reduce((a, b) => a + b, 0);
  const maxSize = Math.max(...sizes);
  const q = { NC, NP, C: NC + NP, Tsz, L: maxSize + 1, R: 8 * NP * NC, NZ: 8 * NC * (Tsz + NP), K: 8 * Math.max(Tsz, NC) };
  const { P, U } = stretch(q);
  const setup = 3 * q.NZ + q.R + q.C + A + 2 * NC + NP;
  const canon = setup + 760e6 + 80e6 + 2 * (P + U), screen190 = setup + 190e6 + 80e6 + 2 * (P + U);
  console.log(JSON.stringify({ id, A, NC, NP, Tsz, maxSize, R: q.R, NZ: q.NZ, K: q.K, P: Math.round(P), canonG: +(canon / 1e9).toFixed(3), screen190G: +(screen190 / 1e9).toFixed(3) }));
}

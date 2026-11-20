// Read-only: model dimensions of carved sets and the per-pass work terms of deduce.js (IG-P-Q37 bound derivation).
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const ROOT = process.cwd();
const { loadEngine } = await import(pathToFileURL(join(ROOT, 'tools/ig-proto/lib/engine.mjs')).href);
const { caseBoard, firstCarvedSet } = await import(pathToFileURL(join(ROOT, 'tools/ig-proto/lib/sets.mjs')).href);
const e = await loadEngine(ROOT);
const ws = e.workspace.createWorkspace(e.workspace.MAIN_WORKSPACE_BYTES);
const cases = process.argv.slice(2);
for (const id of cases) {
  const entry = caseBoard(id);
  const carved = firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText: `ig-v4/bound/${id}` });
  if (!carved.ok) { console.log(id, 'no carve'); continue; }
  const m = e.tiling.buildModel(carved.board, carved.set.pieces, [], ws);
  const R = m.rowCount, C = m.columns, NC = m.freeCells, NP = m.freePieceCount;
  const rs = m.rowStart, rc = m.rowCols; const NZ = rs[R];
  let L = 0; const col = new Int32Array(C);
  for (let r = 0; r < R; r++) { L = Math.max(L, rs[r + 1] - rs[r]); for (let k = rs[r]; k < rs[r + 1]; k++) col[rc[k]]++; }
  let Kc = 0; for (let c = 0; c < NC; c++) Kc = Math.max(Kc, col[c]);
  let Kp = 0; for (let c = NC; c < C; c++) Kp = Math.max(Kp, col[c]);
  const NZc = NZ - R; const W = m.width;
  // pieceK: |imbalance| of a row of the piece (chessboard colouring of its cells)
  const cellIndex = new Int32Array(NC); for (let i = 0; i < m.width * m.height; i++) if (m.cellColumn[i] >= 0) cellIndex[m.cellColumn[i]] = i;
  const pk = new Int32Array(NP).fill(-1); const rowPiece = m.rowPiece;
  for (let r = 0; r < R; r++) { const p = rowPiece[r]; if (pk[p] >= 0) continue; let imb = 0; for (let k = rs[r]; k < rs[r + 1] - 1; k++) { const i = cellIndex[rc[k]]; const x = i % W; imb += ((x + (i - x) / W) & 1) === 0 ? 1 : -1; } pk[p] = Math.abs(imb); }
  let Tk = 0; for (let p = 0; p < NP; p++) Tk += Math.max(0, pk[p]);
  const sel = L + 2 * NZ, undo = R + C + NZ;
  const t = {
    select: sel, undo, r12: C + Kc + sel, r3: (NC + 1) * (NP + 1) + NC, r3p: NZc + sel,
    r4: R + 3 * NZc + NP * L + L * Kc + NZ, r5: NZc + (L - 1) * (R + NZ) + R + 2 * NZ, r6: 3 * NZ + sel + undo,
    r7: NC + 2 * NC * (R + NP) + NP + (NP + 1) * (NC + 1) * (2 * Tk + 1) + R + NZ,
    r8: 9 * NC + NP + NZc * (2 + 2 * NC + L) + NP * NP + NP * (NC + 1) * (NP + 1) + NZ,
    r9: NZc + (NC * NC) / 2 + (NC * NC / 2) * Kc * L + 2 * NZ, misc: C + Kc,
  };
  const P = Object.values(t).reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ id, area: carved.area, K: carved.K, R, C, NC, NP, NZ, L, Kc, Kp, Tk, P: Math.round(P), terms: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)])) }));
}

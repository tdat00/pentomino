// D36 evidence (SA1, 2026-11-12): v3 deduction cost on the sets that the D21 flow builds for Hell cells.
// Read-only: builds set attempt 0 as `setAttempt` does (its calibration is still v2 until MP09d2), then rates random
// clue subsets of the witness with `measureDeduction` and the pinned `DEDUCE` (or overrides) and prints one line each.
//   node docs/difficulty-v3/claude-opus-5.5/d36-hell-probe.mjs <cols> <rows> <levelId> <seedText> <sizes> <perSize>
//   <sizes>: comma-separated clue counts; "c", "c2", "c6" mean the calibration clue count plus 0, 2, 6.
//   Environment (optional): V3_WORK, V3_NODES, V3_LA override DEDUCE.work, DEDUCE.nodes, DEDUCE.lookaheadWidth.
import { boardFromRows } from '../../../core/engine/board.js';
import { measureDeduction } from '../../../core/engine/deduce.js';
import { scoreV3 } from '../../../core/engine/difficulty.js';
import { setAttempt } from '../../../core/engine/generate.js';
import { level, levelForScore } from '../../../core/engine/levels.js';
import { DEDUCE } from '../../../core/engine/policy.js';
import { createRng } from '../../../core/engine/rng.js';
import { buildModel } from '../../../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../../../core/engine/workspace.js';

const [w, h, levelId, seedText, sizesArg, perSize] = process.argv.slice(2);
const board = boardFromRows(Array(Number(h)).fill('#'.repeat(Number(w))));
const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
const t0 = performance.now();
const set = setAttempt({ board, rotation: 0, levelId, seedText, uniqueness: 'any', execution }, 0);
console.log(`${w}x${h} ${levelId} ${seedText}: set attempt 0 ${set.ok ? 'ok' : `failed (${set.reason})`} in ${Math.round(performance.now() - t0)} ms`);
if (!set.ok) {
  process.exit(0);
}
const pieces = set.set.pieces;
const layout = set.set.witness;
const c0 = set.calibration.clues.length;
console.log(`K ${pieces.length}; v2 calibration score ${set.calibration.rating.score} with ${c0} clues; band ${JSON.stringify(level(levelId))}`);
const limits = {
  ...DEDUCE,
  ...(process.env.V3_WORK ? { work: Number(process.env.V3_WORK) } : {}),
  ...(process.env.V3_NODES ? { nodes: Number(process.env.V3_NODES) } : {}),
  ...(process.env.V3_LA ? { lookaheadWidth: Number(process.env.V3_LA) } : {}),
};
console.log(`limits ${JSON.stringify(limits)}`);
const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const rng = createRng('d36-probe');
const sizes = sizesArg.split(',').map((x) => (x.startsWith('c') ? c0 + Number(x.slice(1) || 0) : Number(x)))
  .filter((k) => k >= 0 && k < pieces.length);
for (const k of sizes) {
  for (let i = 0; i < Number(perSize); i += 1) {
    const idx = rng.shuffle(layout.map((_, j) => j)).slice(0, k).sort((a, b) => a - b);
    const clues = idx.map((j) => layout[j]);
    const t = performance.now();
    const d = measureDeduction(buildModel(board, pieces, clues, ws), limits);
    const ms = performance.now() - t;
    let line = `k ${k}: ${d.path}, ${ms.toFixed(0)} ms, nodes ${d.search.nodes}, work ${d.search.work}, stop ${d.search.stop}`;
    if (d.path === 'complete') {
      const s = scoreV3({ U: pieces.length - k, deductionTier: d.first.deductionTier, G: d.first.G, info: d.first.info, solutions: d.count.solutions });
      line += `, tier ${d.first.deductionTier}, G ${d.first.G}, Gproved ${d.first.Gproved}, census ${d.census.complete}, score ${s} (${levelForScore(s).id})`;
    }
    console.log(line);
  }
}

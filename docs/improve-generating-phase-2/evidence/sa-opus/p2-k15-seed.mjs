// @ts-check
// SA-Opus scratch (review-1 R7): the K = 15 set of the frozen v4 synthetic vectors (tools/ig-proto/self-test.mjs
// k15Set, lib/sets.mjs carveSet), rebuilt with the production engine modules at the base. Carving only, no rating.
// Usage (locked): Invoke-IgNode -Repo pentomino -Task 'SA-Opus k15' -NodeArgs @('docs\improve-generating-phase-2\evidence\sa-opus\p2-k15-seed.mjs')
import { activeCount, boardFromRows } from '../../../../core/engine/board.js';
import { carveFlatSet, carveMacro, finalizeSet, validateSet } from '../../../../core/engine/carve.js';
import { BUDGETS, pieceCountRange } from '../../../../core/engine/policy.js';
import { createRng, normalizeSeedText } from '../../../../core/engine/rng.js';

const rows = Array.from({ length: 10 }, () => '#'.repeat(10));
const board = boardFromRows(rows);
const area = activeCount(board);
for (let n = 0; n < 50; n += 1) {
  const seedText = `ig-selftest/proto/k15/${n}`;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stream = createRng(normalizeSeedText(seedText), `set/${attempt}`);
    const ks = pieceCountRange('master', area);
    if (ks === null || ks.length === 0) {
      throw new Error('master is not offered on 100 cells');
    }
    const k = ks[stream.int(ks.length)];
    let carved = area / k >= 6.5 ? carveMacro(board, k, stream.derive('macro'), BUDGETS) : null;
    carved ??= carveFlatSet(board, k, stream.derive('flat'), BUDGETS);
    if (carved === null) {
      continue;
    }
    const set = finalizeSet(board, carved.regions, carved.regionOf ?? null);
    if (validateSet(set).length > 0) {
      continue;
    }
    console.log(`seed ${seedText} attempt ${attempt} K ${set.pieces.length} carving ${set.carving} sizes ${set.pieces.map((p) => p.cells.length).sort((a, b) => a - b).join(',')}`);
    if (set.pieces.length === 15) {
      console.log(`k15: ${seedText} attempt ${attempt}`);
      process.exit(0);
    }
    break;
  }
}
console.log('k15: none');

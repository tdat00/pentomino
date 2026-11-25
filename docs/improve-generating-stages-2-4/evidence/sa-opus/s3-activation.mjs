// @ts-check
// SA-Opus, round 1: the go checks of `activate` that can be read now (check-list 3.4), read-only and unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s3-activation.mjs
// (1) the five-seed pilots of the conditional Hell 1 boards and T11a's `conditionalActivated` on them; (4) the comparator
// cells the activation would declare (T11e's pure `activation`, with a placeholder epoch: nothing is written), which the
// freeze file's classes must name exactly, each in one class; and the class proposal of the analysis checked against them.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { armShards, ROOT } from './s2-lib.mjs';

const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const P = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'paths.mjs')).href);

const data = M.matrixData();
const base = armShards('fr-base');
/** @type {Record<string, any[]>} */
const pilots = {};
for (const cell of data.cells.hell1Conditional) {
  pilots[cell] = base.filter((s) => s.cell === cell).flatMap((s) => s.rows).filter((r) => r.rep >= 0 && r.rep <= 4).map((r) => r.run);
  process.stdout.write(`${cell}: ${pilots[cell].length} of 5 pilot reps published; conditionalActivated: ${JSON.stringify(M.conditionalActivated(pilots[cell]))}\n`);
}
const controls = M.controlsFrom(P.mp12b1Report, data.cells.failingNightmare);
process.stdout.write(`controls (controlsFrom): ${controls.join(', ')}\n`);
const expansion = M.expandMatrix(data, { controls, secondValidationBoards: [] });
const placeholder = { path: 'placeholder', sha256: '0'.repeat(64) };
const record = M.activation(expansion, { pilots, approvedOptional: [], epoch: { data: placeholder, freeze: placeholder, universe: placeholder } });
const cells = record.comparatorCells.map((/** @type {any} */ c) => c.cell);
process.stdout.write(`comparator cells (${cells.length}): ${cells.join(', ')}\n`);
process.stdout.write(`groups ${record.groups.length}, declared rows ${record.declaredRows.length}; conditional ${JSON.stringify(record.conditional.map((/** @type {any} */ c) => ({ cell: c.cell, activated: c.activated, valid: c.valid, reachingTen: c.reachingTen })))}\n`);

// The class proposal of the analysis (section 5): every comparator cell in exactly one class.
const proposal = [
  { id: 'n-small', cells: ['3x29-nightmare', '10x10-nightmare', '12x12-nightmare'] },
  { id: 'n-mid', cells: ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'] },
  { id: 'n-upper', cells: ['15x20-nightmare', '18x18-nightmare'] },
  { id: 'n-large', cells: ['18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare', '24x24-nightmare', '26x26-nightmare'] },
  { id: 'hell-1', cells: ['26x26-hell-1', '20x20-hell-1', '24x24-hell-1', '14x14-hell-1'] },
];
const named = proposal.flatMap((c) => c.cells);
const missing = cells.filter((c) => !named.includes(c));
const extra = named.filter((c) => !cells.includes(c));
const twice = named.filter((c, i) => named.indexOf(c) !== i);
process.stdout.write(`proposal: ${named.length} cells; missing ${JSON.stringify(missing)}; not comparator cells ${JSON.stringify(extra)}; in more than one class ${JSON.stringify(twice)}\n`);

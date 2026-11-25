// @ts-check
// SA-Opus, break-tasks: the expected figures of the plans V4-S2B and V4-S3P as T02a and T10 build them (manifest.mjs's
// exported `rowStep`, `parityPass`, `planOf`, `stepPrice`, `planGuardS`, `refS`, `factor`, `projectedRowS`,
// `durationsFromLogs`), and today's approval arithmetic. Read-only, unlocked; nothing is written outside this folder.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-plans.mjs
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { HERE, ROOT, writeCrlf } from './s2-lib.mjs';

const M = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'manifest.mjs')).href);
const B = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'budget.mjs')).href);
const factor = M.factor();
const durations = M.durationsFromLogs();
const rowSOf = (/** @type {string} */ cell, /** @type {number} */ rowLimitS) => M.projectedRowS({ refS: M.refS(cell), factor, rowLimitS });
/** @param {string} task @param {string} arm @param {string} cell @param {number} from @param {number} to */
const group = (task, arm, cell, from, to) => ({ task, arm, shard: `pilot-${cell}`, cell, from, to, rows: to - from + 1, rowLimitS: 260 });
const out = /** @type {Record<string, any>} */ ({ factor });

// V4-S2B: fr-none on the eight unpiloted controls, reps 0-4.
const S2B = ['3x29-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare', '24x24-nightmare'];
const s2bRows = S2B.map((cell) => M.rowStep(group('V4-S2B', 'fr-none', cell, 0, 4), M.stepPrice, rowSOf(cell, 260)));
const s2b = M.planOf({ task: 'V4-S2B', generatedBy: 'manifest.mjs write-plan', runnable: true, blockedBy: [], prerequisites: [], steps: s2bRows });
out['V4-S2B'] = {
  allocationMinutes: s2b.allocationMinutes, guardS: M.planGuardS(s2b), guardMin: M.planGuardS(s2b) / 60,
  steps: s2bRows.map((/** @type {any} */ s) => ({ id: s.id, rowS: s.price.rowS, projectS: s.projectS, invocations: s.invocations, minHorizonS: s.minHorizonS })),
};

// V4-S3P: the four frozen arms' P-1 passes, then fr-frozen-none-uncapped on the four Hell 1 boards, reps 0-4.
const ARMS = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
const HELL = ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const proofs = ARMS.flatMap((arm) => M.parityPass('V4-S3P', arm, M.stepPrice, durations));
const hellRows = HELL.map((cell) => M.rowStep(group('V4-S3P', 'fr-frozen-none-uncapped', cell, 0, 4), M.stepPrice, rowSOf(cell, 260)));
const s3p = M.planOf({ task: 'V4-S3P', generatedBy: 'manifest.mjs write-plan', runnable: true, blockedBy: [], prerequisites: [], steps: [...proofs, ...hellRows] });
const proofPlan = M.planOf({ task: 'x', generatedBy: 'x', runnable: true, blockedBy: [], prerequisites: [], steps: proofs });
const hellPlan = M.planOf({ task: 'x', generatedBy: 'x', runnable: true, blockedBy: [], prerequisites: [], steps: hellRows });
out['V4-S3P'] = {
  allocationMinutes: s3p.allocationMinutes, guardS: M.planGuardS(s3p), guardMin: M.planGuardS(s3p) / 60,
  proofsGuardMin: M.planGuardS(proofPlan) / 60, hellGuardMin: M.planGuardS(hellPlan) / 60,
  proofsProjectedMin: M.price(proofs.filter((/** @type {any} */ s) => s.locked).map((/** @type {any} */ s) => s.price)).countedS / 60,
  hellProjectedMin: M.price(hellRows.map((/** @type {any} */ s) => s.price)).countedS / 60,
  steps: [...proofs, ...hellRows].map((/** @type {any} */ s) => ({ id: s.id, locked: s.locked, projectS: s.projectS ?? null, invocations: s.invocations ?? null, minHorizonS: s.minHorizonS ?? null })),
  parityNode: proofs[0].node, receiptNode: proofs[1].node, acceptNode: proofs[2].node, hellNode: hellRows[0].node,
};

// Today's account (logs only, as `approval` reads it) and the caps on the account (+ 87.4 s off-log).
const spentS = B.totals(B.readInvocations('frozen'), '').roundCountedS;
out.account = { spentS, offLogS: 87.4, accountMin: (spentS + 87.4) / 60 };
const capOf = (/** @type {number} */ guardS, /** @type {number} */ before) => Math.ceil((before + 87.4 + guardS) / 60);
out.caps = {
  'V4-S2B first': capOf(out['V4-S2B'].guardS, spentS),
  'V4-S3P first': capOf(out['V4-S3P'].guardS, spentS),
};
const md = ['# Break-tasks: expected figures of the plans V4-S2B and V4-S3P (SA-Opus scratch)', '',
  `Computed by \`bt-plans.mjs\` with manifest.mjs's exported functions; factor ${factor}. Account (logs) ${spentS.toFixed(3)} s;`,
  `with the 87.4 s off-log ${out.account.accountMin.toFixed(4)} counted minutes.`, '',
  '| Plan | allocationMinutes | guard (min) | cap on the account if run first |', '|---|---:|---:|---:|',
  `| V4-S2B | ${out['V4-S2B'].allocationMinutes} | ${out['V4-S2B'].guardMin.toFixed(6)} | ${out.caps['V4-S2B first']} |`,
  `| V4-S3P | ${out['V4-S3P'].allocationMinutes} | ${out['V4-S3P'].guardMin.toFixed(6)} | ${out.caps['V4-S3P first']} |`, '',
  `V4-S3P: proofs ${out['V4-S3P'].proofsProjectedMin.toFixed(6)} projected / ${out['V4-S3P'].proofsGuardMin.toFixed(6)} guard; Hell 1 rows ${out['V4-S3P'].hellProjectedMin.toFixed(6)} / ${out['V4-S3P'].hellGuardMin.toFixed(6)}.`, '',
  '| Step | projectS | invocations | minHorizonS |', '|---|---:|---:|---:|',
  ...out['V4-S2B'].steps.map((/** @type {any} */ s) => `| ${s.id} | ${s.projectS.toFixed(3)} | ${s.invocations} | ${s.minHorizonS} |`),
  ...out['V4-S3P'].steps.filter((/** @type {any} */ s) => s.locked).map((/** @type {any} */ s) => `| ${s.id} | ${s.projectS.toFixed(3)} | ${s.invocations} | ${s.minHorizonS} |`)];
writeCrlf(join(HERE, 'bt-plans.json'), JSON.stringify(out, null, 2));
writeCrlf(join(HERE, 'bt-plans.md'), md.join('\n'));
process.stdout.write(`${md.join('\n')}\n`);

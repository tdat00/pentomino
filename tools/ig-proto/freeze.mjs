// @ts-check
// The freeze of plan v4's stage 3 (N-V4-03; stages 2 to 4 pack T08b, T12a and T12b; plan 4.1 and 4.2 of docs/improve-generating-stages-2-4/plan.md):
// the classes, bounds, table ids and values as constants, the checks of the four frozen trees against them (`check`, unlocked: it builds or
// reuses trees and reads records, it rates nothing), and (T12b) the record freeze.json, written once.
//   node tools\ig-proto\freeze.mjs check --label frozen --source-label <SL>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { computePriorS3, PRIOR_S3_FILE } from './fit-prior-s3.mjs';
import { evidenceDir, mp12b1Report, parseArgs } from './lib/paths.mjs';
import { lf, sha256 } from './lib/records.mjs';
import { loadCatalogue } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';
import { activation, controlsFrom, expandMatrix, freezeMismatch, matrixData, readPilots } from './manifest.mjs';

export const FROZEN_VARIANTS = Object.freeze(['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped']);
const SCREEN = 'fr-frozen';
const NO_SCREEN = 'fr-frozen-none';
export const FREEZE_CLASSES = Object.freeze([
  { id: 'n-small', cells: ['3x29-nightmare', '10x10-nightmare', '12x12-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
  { id: 'n-mid', cells: ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
  { id: 'n-upper', cells: ['15x20-nightmare', '18x18-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
  { id: 'n-large', cells: ['18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare', '24x24-nightmare', '26x26-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
  { id: 'hell-1', cells: ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'], screen: SCREEN, noScreen: NO_SCREEN },
]);
export const FREEZE_BOUNDS = Object.freeze({
  'n-small': ['nightmare', 1, 144], 'n-mid': ['nightmare', 196, 256], 'n-upper': ['nightmare', 257, 324],
  'n-large': ['nightmare', 360, null], 'hell-1': ['hell-1', 1, null],
});
export const FREEZE_TABLES = Object.freeze({ screen: 'screen-s3-v1', prior: 'prior-s3-v1', budget: 'budget-s3-v1', deadline: 'deadline-s3-v1' });
export const FREEZE_VALUES = Object.freeze({
  W: { 'n-small': null, 'n-mid': 190000000, 'n-upper': 190000000, 'n-large': 190000000, 'hell-1': null },
  callBudget: { any: { nightmare: 10000000000, 'hell-1': 40000000000 }, require: { nightmare: 32000000000, 'hell-1': 40000000000 } },
  setAttemptsBound: 4,
  deadline: { reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000 },
  c4: false, rerate: 'rescue', rerateMax: 4, ranker: null, perSetLevels: ['hell-1'],
});

/**
 * @param {string} levelId
 * @param {number} area
 * @returns {string | null} The id of the first class of `FREEZE_BOUNDS` whose level is `levelId` and whose area range holds `area`; else null.
 */
export function classOf(levelId, area) {
  for (const [id, [level, lo, hi]] of Object.entries(FREEZE_BOUNDS)) {
    if (levelId === level && area >= lo && (hi === null || area <= hi)) {
      return id;
    }
  }
  return null;
}

/** @typedef {{ name: string, pass: boolean, detail: string }} FreezeCheck */

/**
 * @returns {Promise<{ checks: FreezeCheck[], trees: Record<string, { treeId: string, paramsHash: string }> }>}
 *   The six checks of the four frozen trees against the freeze's constants, in this order: classes, bounds, runtime W, parameters,
 *   differences, prior. Nothing is written.
 */
export async function freezeChecks() {
  /** @type {Record<string, any>} */
  const built = {};
  /** @type {Record<string, { treeId: string, paramsHash: string }>} */
  const trees = {};
  for (const id of FROZEN_VARIANTS) {
    built[id] = await ensureTree(id);
    trees[id] = { treeId: built[id].treeId, paramsHash: sha256(JSON.stringify(built[id].params)) };
  }
  const cases = loadCatalogue().cases;
  const data = matrixData();
  /** @type {FreezeCheck[]} */
  const checks = [];

  const expansion = expandMatrix(data, { controls: controlsFrom(mp12b1Report, data.cells.failingNightmare) });
  const placeholder = { path: 'placeholder', sha256: '0'.repeat(64) };
  const record = activation(expansion, {
    pilots: readPilots(evidenceDir('frozen', 'V4-S2', 'fr-base'), data),
    approvedOptional: [],
    epoch: { data: placeholder, freeze: placeholder, universe: placeholder },
  });
  const mismatch = freezeMismatch({ classes: /** @type {any} */ (FREEZE_CLASSES) }, record.comparatorCells.map((c) => c.cell));
  const inactive = record.conditional.filter((c) => !c.activated).map((c) => c.cell);
  const problems = [
    ...mismatch,
    ...(record.comparatorCells.length === 19 ? [] : [`${record.comparatorCells.length} comparator cells, not 19`]),
    ...(inactive.length > 0 ? [`not activated ${inactive.join(', ')}`] : []),
  ];
  checks.push({
    name: 'classes',
    pass: problems.length === 0,
    detail: problems.length > 0 ? problems.join('; ')
      : `${record.comparatorCells.length} comparator cells; conditional ${record.conditional.map((c) => `${c.cell} ${c.activated}`).join(', ')}`,
  });

  const unbound = FREEZE_CLASSES.flatMap((cls) => cls.cells.filter((cell) => classOf(cases[cell].levelId, cases[cell].area) !== cls.id));
  checks.push({ name: 'bounds', pass: unbound.length === 0, detail: unbound.length > 0 ? unbound.join(', ') : `${FREEZE_CLASSES.flatMap((c) => c.cells).length} cells in their class` });

  /** @type {string[]} */
  const wDiffs = [];
  let wCells = 0;
  for (const variant of [SCREEN, NO_SCREEN]) {
    const tree = built[variant];
    const { classW } = await import(pathToFileURL(join(tree.root, 'core', 'engine', 'ig-select-v4.js')).href);
    const { DEDUCE } = await import(pathToFileURL(join(tree.root, 'core', 'engine', 'policy.js')).href);
    for (const cls of FREEZE_CLASSES) {
      const value = variant === SCREEN ? /** @type {Record<string, number | null>} */ (FREEZE_VALUES.W)[cls.id] : null;
      const expected = value ?? DEDUCE.work;
      for (const cell of cls.cells) {
        wCells += 1;
        const w = classW(tree.params.screenClasses, cases[cell].levelId, cases[cell].area);
        if (w !== expected) {
          wDiffs.push(`${variant} ${cell} ${w}`);
        }
      }
    }
  }
  checks.push({ name: 'runtime W', pass: wDiffs.length === 0, detail: wDiffs.length > 0 ? wDiffs.join(', ') : `${wCells} cells` });

  checks.push({ name: 'parameters', ...(await parameterCheck(built)) });

  const keysDiffering = (/** @type {string} */ a, /** @type {string} */ b) => {
    const A = built[a].params;
    const B = built[b].params;
    return [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((k) => k !== 'variant' && !isDeepStrictEqual(A[k], B[k])).sort();
  };
  const declared = [...data.comparatorDifferences].sort();
  /** @type {string[]} */
  const diffProblems = [];
  for (const [a, b] of [[SCREEN, 'fr-frozen-uncapped'], [NO_SCREEN, 'fr-frozen-none-uncapped']]) {
    if (!isDeepStrictEqual(keysDiffering(a, b), declared)) {
      diffProblems.push(`${a} against ${b}: ${keysDiffering(a, b).join(', ')}`);
    }
    for (const key of declared) {
      if (built[b].params[key] !== null) {
        diffProblems.push(`${b}: ${key} is not null`);
      }
    }
  }
  if (!isDeepStrictEqual(keysDiffering(SCREEN, NO_SCREEN), ['screenClasses', 'screenTable'])) {
    diffProblems.push(`${SCREEN} against ${NO_SCREEN}: ${keysDiffering(SCREEN, NO_SCREEN).join(', ')}`);
  }
  checks.push({
    name: 'differences',
    pass: diffProblems.length === 0,
    detail: diffProblems.length > 0 ? diffProblems.join('; ') : `twins differ in ${declared.join(', ')} (null); screen arms in screenClasses, screenTable`,
  });

  const table = computePriorS3();
  const fileSame = lf(readFileSync(PRIOR_S3_FILE, 'utf8')).trimEnd() === lf(JSON.stringify(table, null, 2)).trimEnd();
  const treeSame = isDeepStrictEqual(built[SCREEN].params.prior, table.cells);
  checks.push({
    name: 'prior',
    pass: fileSame && treeSame,
    detail: fileSame && treeSame ? `${Object.keys(table.cells).length} cells reproduced`
      : [...(fileSame ? [] : ['the file differs from the recomputed table']), ...(treeSame ? [] : ['the tree\'s prior differs from the table'])].join('; '),
  });
  return { checks, trees };
}

/**
 * @param {Record<string, any>} built The four trees by variant id.
 * @returns {Promise<{ pass: boolean, detail: string }>} The first difference between the trees' parameters and the freeze's constants.
 */
async function parameterCheck(built) {
  const p = built[SCREEN].params;
  const none = built[NO_SCREEN].params;
  const { reserve, setStageCapMs, generationStopMs, responseBoundMs } = FREEZE_VALUES.deadline;
  const { TIME } = await import(pathToFileURL(join(built[SCREEN].root, 'core', 'engine', 'policy.js')).href);
  const wanted = [
    ['priorTable', p.priorTable, FREEZE_TABLES.prior],
    ['screenTable', p.screenTable, FREEZE_TABLES.screen],
    ['callBudget', p.callBudget, { id: FREEZE_TABLES.budget, ...FREEZE_VALUES.callBudget }],
    ['setAttemptsBound', p.setAttemptsBound, FREEZE_VALUES.setAttemptsBound],
    ['c4', p.c4, FREEZE_VALUES.c4],
    ['rerate', p.rerate, FREEZE_VALUES.rerate],
    ['rerateMax', p.rerateMax, FREEZE_VALUES.rerateMax],
    ['perSetLevels', p.perSetLevels, FREEZE_VALUES.perSetLevels],
    ['liveDeadline', p.liveDeadline, { id: FREEZE_TABLES.deadline, levels: ['nightmare', 'hell-1'], ...FREEZE_VALUES.deadline, hostMarginMs: 1000 }],
    ['setStageCapMs', setStageCapMs, Math.round((1 - reserve) * generationStopMs)],
    ['generationStopMs', generationStopMs, TIME.dispatchStopMs],
    ['responseBoundMs', responseBoundMs, TIME.responseMs],
    ['fr-frozen-none screenTable', none.screenTable, 'screen-s3-none'],
    ['fr-frozen-none screenClasses', Object.keys(none.screenClasses ?? {}).sort().map((k) => [k, none.screenClasses[k]]),
      ['hell-1', 'n-large', 'n-mid', 'n-small'].map((k) => [k, null])],
  ];
  for (const [name, got, want] of wanted) {
    if (!isDeepStrictEqual(got, want)) {
      return { pass: false, detail: `${name} is ${JSON.stringify(got)}, not ${JSON.stringify(want)}` };
    }
  }
  return { pass: true, detail: `${FREEZE_TABLES.prior}, ${FREEZE_TABLES.screen}, ${FREEZE_TABLES.budget}, ${FREEZE_TABLES.deadline}; deadline numbers relate` };
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  if (command !== 'check') {
    process.stderr.write('usage: freeze.mjs check --label frozen --source-label <SL>\n');
    return 1;
  }
  parseArgs(rest, { values: ['label', 'source-label'] });
  const { checks, trees } = await freezeChecks();
  for (const c of checks) {
    process.stdout.write(`freeze: ${c.name} ${c.pass ? 'pass' : 'FAIL'} (${c.detail})\n`);
  }
  const failed = checks.filter((c) => !c.pass).length;
  if (failed > 0) {
    process.stdout.write(`freeze: check failed (${failed} of ${checks.length})\n`);
    return 1;
  }
  const ids = FROZEN_VARIANTS.map((id) => `${id} ${trees[id].treeId.slice(0, 12)}`).join(', ');
  process.stdout.write(`freeze: check pass (${checks.length} checks; ${ids})\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`freeze: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}

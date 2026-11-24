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
import { readRepoFile } from './lib/proof.mjs';
import { lf, sha256, sha256Text } from './lib/records.mjs';
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

/** The indices that fitted the freeze, read transitively (R18); `field` null for an array file. */
export const FIT_INDICES = Object.freeze([
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/input-index.json', field: null, key: 'sha256Lf' },
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/review-input-index.json', field: null, key: 'sha256Lf' },
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/freeze-inputs.json', field: 'inputs', key: 'sha256Lf' },
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-opus/fit-input-index.json', field: 'entries', key: 'sha256Lf' },
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport-inputs.json', field: null, key: 'sha256Lf' },
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection-inputs.json', field: null, key: 'sha256Lf' },
  { path: 'docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json', field: 'inputs', key: 'sha256' },
  { path: 'docs/improve-generating/evidence/frozen/V4-S2B/fit-read-prefixes-fr-none.json', field: 'inputs', key: 'sha256' },
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.json', field: 'publicationInputs', key: 'sha256' },
  { path: 'docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json', field: 'inputs', key: 'sha256' },
]);
/** The top-level files and scripts of the fit (hashed as they are today; every index file is one too). */
export const FIT_INPUTS = Object.freeze([
  'tools/ig-proto/freeze.mjs',
  'tools/ig-proto/fit-prior-s3.mjs',
  'tools/ig-proto/data/prior-s3-v1.json',
  'tools/ig-proto/data/prior-v1.json',
  'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-14x14-hell-1.calls.jsonl',
  'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-20x20-hell-1.calls.jsonl',
  'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-24x24-hell-1.calls.jsonl',
  'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-26x26-hell-1.calls.jsonl',
  'docs/improve-generating/evidence/provisional/IGP-05/families-windows.jsonl',
  'docs/improve-generating/evidence/provisional/IGP-05/families-failed-sets.jsonl',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/analyze-records.mjs',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/freeze-inputs.mjs',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/review-records.mjs',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/stage2-computed.json',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/stage2-computed.md',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/rows-computed.json',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/calls-computed.json',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/review-records.json',
  'docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.mjs',
  'docs/improve-generating-stages-2-4/evidence/sa-opus/bt-fit-index.mjs',
  'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport.mjs',
  'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection.mjs',
  'docs/improve-generating-stages-2-4/report.md',
  'docs/improve-generating-stages-2-4/plan.md',
  'docs/improve-generating-stages-2-4/s01-reading.md',
  'docs/improve-generating-stages-2-4/t11-reading.md',
]);
/** Where a mutable harness source's indexed epoch is captured, and from which commit. */
export const FIT_CAPTURE = Object.freeze({ dir: 'docs/improve-generating/evidence/frozen/V4-S3/fit-sources', commit: '57ef5cf' });
/** The fitting records and reps actually used (plan 4.7); every other rep is excluded, and refused by fitIndex. */
export const FIT_SEEDS_USED = Object.freeze([
  { source: 'V4-S2', arms: ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'], reps: [0, 1, 2, 3, 4] },
  { source: 'V4-S2B', arms: ['fr-none'], reps: [0, 1, 2, 3, 4] },
  { source: 'V4-S3P', arms: ['fr-frozen-none-uncapped'], reps: [0, 1, 2, 3, 4] },
  { source: 'MP12b1', reps: 'landscape reps 0-19 of docs/difficulty-v3/landscape-v3-full (today\'s search)' },
  { source: 'IGP-05', reps: 'PM1\'s first slice (ig-pm1/...)' },
  { source: 'V4-S2K, V4-T10a-c', reps: 'the kernel streams ig-v4/kernel/<case>' },
]);

/**
 * @param {string} text A runs file's text: a JSON object with `rows`, or JSON lines.
 * @param {string} path
 * @returns {number[] | null} The distinct `rep` numbers of the runs file `path` in order of appearance; null when the text is not JSON.
 */
function repsOf(text, path) {
  try {
    const rows = path.endsWith('.runs.json') ? (JSON.parse(text)?.rows ?? []) : text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
    const reps = (Array.isArray(rows) ? rows : []).map((r) => r?.rep).filter((r) => typeof r === 'number');
    return [...new Set(reps)];
  } catch {
    return null;
  }
}

/**
 * @param {{ indices?: ReadonlyArray<{ path: string, field: string | null, key: string }>, read?: (path: string) => string | null,
 *   capture?: { dir: string, commit: string } }} [o]
 * @returns {{ indices: { path: string, key: string, entries: number }[], checked: number,
 *   captures: { path: string, sourceCommit: string, capturedPath: string, hash: string, index: string, kind: 'normalized-text' }[],
 *   uncaptured: { path: string, hash: string, index: string }[], problems: string[] }}
 *   The transitive validation of the fit's indices (R18): every entry's `key` hash recomputed with `sha256Lf` (the LF-normalized text hash), an
 *   entry of a `tools/` path that changed accepted only through the capture of its indexed epoch, a missing or changed input refused, and no
 *   validation, Master or second-validation rep (20 or more) in a runs file.
 */
export function fitIndex({ indices = FIT_INDICES, read = (p) => readRepoFile(p), capture = FIT_CAPTURE } = {}) {
  /** @type {ReturnType<typeof fitIndex>} */
  const out = { indices: [], checked: 0, captures: [], uncaptured: [], problems: [] };
  for (const { path: index, field, key } of indices) {
    const text = read(index);
    if (text === null) {
      out.problems.push(`missing fit index ${index}`);
      continue;
    }
    let list;
    try {
      const parsed = JSON.parse(text);
      list = field === null ? parsed : parsed?.[field];
    } catch {
      list = null;
    }
    if (!Array.isArray(list)) {
      out.problems.push(`malformed fit index ${index}`);
      continue;
    }
    out.indices.push({ path: index, key, entries: list.length });
    for (const e of list) {
      const p = typeof e?.path === 'string' ? e.path.replace(/\\/g, '/') : String(e?.path);
      const want = e?.[key];
      if (typeof e?.path !== 'string' || typeof want !== 'string' || !/^[0-9a-f]{64}$/.test(want)) {
        out.problems.push(`malformed entry ${p} (index ${index})`);
        continue;
      }
      const current = read(p);
      let matched = current;
      if (current === null || sha256Text(current) !== want) {
        matched = null;
        const cap = `${capture.dir}/${p}`;
        const captured = p.startsWith('tools/') ? read(cap) : null;
        if (captured !== null && sha256Text(captured) === want) {
          out.captures.push({ path: p, sourceCommit: capture.commit, capturedPath: cap, hash: want, index, kind: 'normalized-text' });
        } else if (p.startsWith('tools/')) {
          out.problems.push(`fit input ${p} changed or missing and has no matching capture (index ${index})`);
          out.uncaptured.push({ path: p, hash: want, index });
        } else {
          out.problems.push(current === null ? `missing fit input ${p} (index ${index})` : `fit input ${p} changed (index ${index})`);
        }
        continue;
      }
      out.checked += 1;
      if (p.endsWith('.runs.json') || p.endsWith('/rows.jsonl')) {
        const reps = repsOf(/** @type {string} */ (matched), p);
        if (reps === null) {
          out.problems.push(`malformed fit input ${p} (index ${index})`);
        } else {
          for (const r of reps.filter((n) => n >= 20)) {
            out.problems.push(`fit input ${p} holds rep ${r}: validation, Master and second-validation reps are never fitting inputs`);
          }
        }
      }
    }
  }
  return out;
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

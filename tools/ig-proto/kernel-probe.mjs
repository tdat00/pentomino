// @ts-check
// Kernel probe (task pack v4, V4-T10a; plan P7 C1; reviews RV1-05, RV1-16 to RV1-19 and R17). The `counters` step runs
// the complete deduction of the window subsets of a case's first carved set in the `r4c` tree (the `instr` tree plus
// R4 visit and mutation counters, variants/r4c.json) and in the `instr` tree, on the same model input, and compares
// the two complete `DeductionResult`s: the counters are test-side and must change nothing. The probe runs as items of
// lib/items.mjs (kind `v4-kernel`, one lane, reserve 90 s); `report` rebuilds `kernel.json` and `kernel.md` from the
// completed items. T10b adds the `fewestColumn` profile.
//   node tools\ig-proto\kernel-probe.mjs counters --task V4-T10a --label frozen --source-label "frozen 3fc65f4"
//     [--cases <ids>] [--horizon-s <H>]
//   node tools\ig-proto\kernel-probe.mjs report --task V4-T10a --label frozen --source-label "frozen 3fc65f4" [--cases <ids>]
//     (without --cases: the default list, else the cases the item log names)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { identityHash, manifestHash, readItemLog, runItems } from './lib/items.mjs';
import { artifactDir, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, readTreeInfo, writeJson, writeText } from './lib/records.mjs';
import { caseBoard, loadCatalogue } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';

/**
 * @typedef {import('./lib/items.mjs').Item} Item
 * @typedef {{ calls: number, pieces: number, staticRows: number, liveRows: number, dirtyPieces: number,
 *   countChanged: number, r4Kills: number, kills: number, undoEntries: number }} R4 The `r4` block of `igTake()`.
 * @typedef {{ item: string, caseId: string, subsetIndex: number, status: string, outcome: string | null, g: number | null,
 *   same: boolean | null, r4: R4 | null, ms: number | null, itemMs: number | null }} Row One expected item joined with
 *   its `item-end` line; `status` is the line's, or `missing` without one.
 */

export const DEFAULT_CASES = Object.freeze(['14x14-nightmare', '26x26-nightmare']);
/** Subsets per case: the window offsets 1, 2 and 3 with two subsets each (lib/lane-worker.mjs, `kernelItem`). */
export const SUBSETS_PER_CASE = 6;
export const R4_FIELDS = Object.freeze(['calls', 'pieces', 'staticRows', 'liveRows', 'dirtyPieces', 'countChanged', 'r4Kills', 'kills', 'undoEntries']);
const STEP = 'counters';
const DEFAULT_HORIZON_S = 285;
const SEED_PREFIX = 'ig-v4/kernel/';
/** The folders of the historical observations (check-list 3.1): no run of this tool writes under them. */
const HISTORICAL_TASKS = Object.freeze(['IGP-02', 'V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i', 'V4-S2P']);

/** @param {string} reason @returns {1} */
function refuse(reason) {
  process.stderr.write(`kernel-probe: ${reason}\n`);
  return 1;
}

/**
 * @param {string | undefined} text A comma-separated list of catalogue case ids; `undefined` is the default list.
 * @returns {string[]} The case ids, in the order given; an unknown id, an empty entry or a repeated id throws.
 */
export function parseCases(text) {
  if (text === undefined) {
    return [...DEFAULT_CASES];
  }
  const { cases } = loadCatalogue();
  /** @type {string[]} */
  const ids = [];
  for (const id of text.split(',')) {
    if (id === '') {
      throw new Error('empty entry in the case list');
    }
    if (!Object.hasOwn(cases, id)) {
      throw new Error(`unknown case id ${id}`);
    }
    if (ids.includes(id)) {
      throw new Error(`repeated case id ${id}`);
    }
    ids.push(id);
  }
  return ids;
}

/**
 * The dirty rule of RV1-18 on a synthetic trace: a piece is dirty at a visit when its live rows changed since its
 * previous visit (the first visit is dirty), which a per-piece epoch tracks: `kill` and `restore` each raise it by one,
 * whatever the number of live rows afterwards. `countChanged` is the separate statistic of the live-row count: the
 * count of a piece starts at 0, `kill` lowers it by one and `restore` raises it by one.
 * @param {['visit' | 'kill' | 'restore', number][]} trace
 * @returns {{ dirty: number, countChanged: number }}
 */
export function epochDirty(trace) {
  /** @type {Map<number, { epoch: number, seen: number, count: number, last: number }>} */
  const pieces = new Map();
  let dirty = 0;
  let countChanged = 0;
  for (const [step, p] of trace) {
    let piece = pieces.get(p);
    if (piece === undefined) {
      piece = { epoch: 0, seen: -1, count: 0, last: -1 };
      pieces.set(p, piece);
    }
    if (step === 'visit') {
      if (piece.seen !== piece.epoch) {
        dirty += 1;
        piece.seen = piece.epoch;
      }
      if (piece.last !== piece.count) {
        countChanged += 1;
        piece.last = piece.count;
      }
    } else if (step === 'kill' || step === 'restore') {
      piece.epoch += 1;
      piece.count += step === 'kill' ? -1 : 1;
    } else {
      throw new Error(`unknown trace step ${String(step)}`);
    }
  }
  return { dirty, countChanged };
}

/**
 * @param {string[]} caseIds
 * @returns {Promise<Item[]>} Six items per case, `counters:r4c:<caseId>:ig-v4/kernel/<caseId>:<i>`. The payload holds
 *   the experiment only (the other tree's root is a fixed place of this machine, never an invocation's value).
 */
export async function kernelItems(caseIds) {
  const otherRoot = (await ensureTree('instr')).root;
  /** @type {Item[]} */
  const items = [];
  for (const caseId of caseIds) {
    const entry = caseBoard(caseId);
    const seedText = `${SEED_PREFIX}${caseId}`;
    for (let i = 0; i < SUBSETS_PER_CASE; i += 1) {
      items.push({
        id: `${STEP}:r4c:${caseId}:${seedText}:${i}`,
        kind: 'v4-kernel',
        variant: 'r4c',
        payload: { boardRows: entry.boardRows, levelId: entry.levelId, seedText, subsetIndex: i, otherRoot },
      });
    }
  }
  return items;
}

/** @param {unknown} r4 @returns {r4 is R4} Nine non-negative integers. */
function isR4(r4) {
  if (r4 === null || typeof r4 !== 'object') {
    return false;
  }
  const fields = /** @type {Record<string, unknown>} */ (r4);
  return R4_FIELDS.every((name) => Number.isInteger(fields[name]) && /** @type {number} */ (fields[name]) >= 0);
}

/** @param {any[]} lines @returns {Map<string, any>} The first `item-end` line of each item. */
function endsOf(lines) {
  /** @type {Map<string, any>} */
  const ends = new Map();
  for (const line of lines) {
    if (line?.type === 'item-end' && !ends.has(line.item)) {
      ends.set(line.item, line);
    }
  }
  return ends;
}

/**
 * The verdict of the probe on the item-log lines. `equal`: every expected item has a `completed` end line whose result
 * is `ok` with `same: true`. `incomplete`: an item is missing or censored (the probe did not finish). Otherwise `DIFFER`:
 * a completed item whose two deductions differ, or one that measured nothing (`no-set`, `no-subset`) or ended `error`.
 * @param {string[]} ids The expected item ids.
 * @param {any[]} lines The parsed lines of the item log.
 * @returns {{ verdict: 'equal' | 'incomplete' | 'DIFFER', items: string[], line: string }} `items` names the items the
 *   verdict is about (none for `equal`); `line` is the printed verdict.
 */
export function counterVerdict(ids, lines) {
  if (ids.length === 0) {
    throw new RangeError('counterVerdict needs at least one item');
  }
  const ends = endsOf(lines);
  /** @type {string[]} */
  const unfinished = [];
  /** @type {string[]} */
  const differ = [];
  for (const id of ids) {
    const end = ends.get(id);
    if (end === undefined || end.status === 'censored') {
      unfinished.push(id);
    } else if (end.status !== 'completed' || end.result?.outcome !== 'ok' || end.result.same !== true) {
      differ.push(id);
    }
  }
  if (unfinished.length > 0) {
    return { verdict: 'incomplete', items: unfinished, line: `counters: incomplete (${unfinished.join(', ')})` };
  }
  if (differ.length > 0) {
    return { verdict: 'DIFFER', items: differ, line: `counters: DIFFER (${differ.join(', ')})` };
  }
  return { verdict: 'equal', items: [], line: 'counters: equal' };
}

/** @param {Item} item @returns {string} The case of a probe item. */
const caseOf = (item) => String(item.payload.seedText).slice(SEED_PREFIX.length);

const ITEM_ID = new RegExp(`^${STEP}:r4c:([^:]+):${SEED_PREFIX}\\1:\\d+$`);

/**
 * @param {any[]} lines The parsed lines of an item log.
 * @returns {string[]} The cases of the probe items the lines name, in order of first appearance: what `report` falls
 *   back on when the run was not of the default case list and `--cases` is not given.
 */
export function loggedCases(lines) {
  /** @type {string[]} */
  const ids = [];
  for (const line of lines) {
    const match = typeof line?.item === 'string' ? ITEM_ID.exec(line.item) : null;
    if (match !== null && !ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

/**
 * @param {Item[]} items The expected items, in order.
 * @param {any[]} lines The parsed lines of the item log.
 * @returns {Row[]}
 */
export function kernelRows(items, lines) {
  const ends = endsOf(lines);
  return items.map((item) => {
    const end = ends.get(item.id);
    const result = end?.result ?? null;
    return {
      item: item.id,
      caseId: caseOf(item),
      subsetIndex: /** @type {number} */ (item.payload.subsetIndex),
      status: end?.status ?? 'missing',
      outcome: typeof result?.outcome === 'string' ? result.outcome : null,
      g: Number.isInteger(result?.g) ? result.g : null,
      same: typeof result?.same === 'boolean' ? result.same : null,
      r4: isR4(result?.r4) ? result.r4 : null,
      ms: typeof result?.ms === 'number' ? result.ms : null,
      itemMs: typeof end?.ms === 'number' ? end.ms : null,
    };
  });
}

/** @param {number} a @param {number} b @returns {number | null} `a / b` to four decimals; null when `b` is 0. */
const share = (a, b) => (b === 0 ? null : Math.round((a / b) * 10000) / 10000);

/**
 * Per case, in the order of first appearance: the sums of the counters over the items that have them and the two shares
 * the C1 spike prices from, `dirtyPieces / pieces` (live rows changed since the piece's previous visit, by the epoch)
 * and `countChanged / pieces` (only the number of live rows changed).
 * @param {Row[]} rows
 * @returns {{ caseId: string, items: number, measured: number, sums: R4, dirtyShare: number | null, countChangedShare: number | null }[]}
 */
export function caseSums(rows) {
  /** @type {Map<string, Row[]>} */
  const byCase = new Map();
  for (const row of rows) {
    byCase.set(row.caseId, [...(byCase.get(row.caseId) ?? []), row]);
  }
  return [...byCase].map(([caseId, own]) => {
    const withCounters = own.filter((row) => row.r4 !== null);
    /** @type {Record<string, number>} */
    const totals = {};
    for (const name of R4_FIELDS) {
      totals[name] = withCounters.reduce((sum, row) => sum + /** @type {R4} */ (row.r4)[/** @type {keyof R4} */ (name)], 0);
    }
    const sums = /** @type {R4} */ (/** @type {unknown} */ (totals));
    return {
      caseId,
      items: own.length,
      measured: withCounters.length,
      sums,
      dirtyShare: share(sums.dirtyPieces, sums.pieces),
      countChangedShare: share(sums.countChanged, sums.pieces),
    };
  });
}

/** @param {unknown} value @returns {string} A table cell. */
const cell = (value) => (value === null || value === undefined ? '-' : String(value).replaceAll('|', '\\|'));

/**
 * @param {string} task
 * @param {{ meta: any, verdict: { line: string }, rows: Row[], perCase: ReturnType<typeof caseSums>, withoutCounters: string[] }} record
 * @returns {string} The Markdown record `kernel.md`.
 */
function renderKernel(task, { meta, verdict, rows, perCase, withoutCounters }) {
  const lines = [
    `# Kernel probe: R4 visit and mutation counters (${task})`, '', banner(meta), '', verdict.line, '',
    'The `r4c` tree counts R4 invocations, piece visits, static and live rows, dirty pieces, live-row count changes and '
    + 'mutations; every item measures the complete deduction in the `r4c` and the `instr` tree on the same model and compares the '
    + 'two complete `DeductionResult`s. A piece is dirty at an R4 visit when its live rows changed since its previous '
    + 'visit (a per-piece epoch, raised by every row removal and restoration; its first visit is dirty); `countChanged` '
    + 'counts only the visits at which the number of live rows changed.', '',
    '## Items', '', '| item | status | g | same | ms | calls | pieces | dirtyPieces | countChanged |', '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((row) => `| ${cell(row.item)} | ${cell(row.status)}${row.outcome !== null && row.outcome !== 'ok' ? ` (${cell(row.outcome)})` : ''} | ${cell(row.g)} | ${cell(row.same)} | ${cell(row.ms)} | ${cell(row.r4?.calls)} | ${cell(row.r4?.pieces)} | ${cell(row.r4?.dirtyPieces)} | ${cell(row.r4?.countChanged)} |`),
    '', '## Per case', '',
    `| case | items | measured | ${R4_FIELDS.join(' | ')} | dirtyPieces / pieces | countChanged / pieces |`,
    `|---|---|---|${R4_FIELDS.map(() => '---').join('|')}|---|---|`,
    ...perCase.map((c) => `| ${cell(c.caseId)} | ${c.items} | ${c.measured} | ${R4_FIELDS.map((name) => c.sums[/** @type {keyof R4} */ (name)]).join(' | ')} | ${cell(c.dirtyShare)} | ${cell(c.countChangedShare)} |`),
    '',
  ];
  if (withoutCounters.length > 0) {
    lines.push('## Items without counters', '', 'Both trees threw the same error, so there is no `r4` record:', '',
      ...withoutCounters.map((id) => `- ${id}`), '');
  }
  return lines.join('\n');
}

/**
 * @param {string[]} argv `--task <T> --label frozen --source-label <SL> [--cases <ids>] [--horizon-s <H>]`
 * @returns {Promise<number>} The runner's exit code (0, or 3 for a refused resume); 1 for a refused command.
 */
async function countersCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label', 'cases', 'horizon-s'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const { task } = args;
  if (task === undefined) {
    return refuse('counters needs --task');
  }
  if (HISTORICAL_TASKS.includes(task)) {
    return refuse(`${task} is a historical observation namespace; use another --task`);
  }
  const horizonS = Number(args['horizon-s'] ?? DEFAULT_HORIZON_S);
  if (!Number.isFinite(horizonS) || horizonS <= 0) {
    return refuse('--horizon-s must be a positive number');
  }
  const items = await kernelItems(parseCases(args.cases));
  return (await runItems({ task, step: STEP, label: 'frozen', horizonS, items })).exitCode;
}

/**
 * @param {string[]} argv `--task <T> --label frozen --source-label <SL> [--cases <ids>]`; without `--cases` the run's
 *   list is the default one or, when the state is of another list, the cases the item log names
 * @returns {Promise<number>} 0 once the record is written, whatever its verdict; 1 for a refused command or a run whose
 *   state, log or trees are not the experiment of these cases.
 */
async function reportCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label', 'cases'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const { task } = args;
  if (task === undefined) {
    return refuse('report needs --task');
  }
  if (HISTORICAL_TASKS.includes(task)) {
    return refuse(`${task} is a historical observation namespace; use another --task`);
  }
  const dir = artifactDir('frozen', task, STEP);
  const statePath = join(dir, 'state.json');
  if (!existsSync(statePath)) {
    return refuse(`no state ${rel(statePath)}: run counters first`);
  }
  const identity = JSON.parse(readFileSync(statePath, 'utf8')).identity ?? null;
  if (identity === null) {
    return refuse(`the state ${rel(statePath)} has no identity`);
  }
  const lines = readItemLog(join(dir, 'items.jsonl'));
  // The cases of the run: `--cases`, else the default list, else the cases the log names (a run of another list).
  const logged = loggedCases(lines);
  const candidates = args.cases !== undefined
    ? [parseCases(args.cases)]
    : [parseCases(undefined), ...(logged.length > 0 ? [parseCases(logged.join(','))] : [])];
  /** @type {string[]} */
  let caseIds = candidates[0];
  /** @type {Item[]} */
  let items = [];
  let matched = false;
  for (const ids of candidates) {
    const own = await kernelItems(ids);
    if (identity.manifestHash === manifestHash(own)) {
      caseIds = ids;
      items = own;
      matched = true;
      break;
    }
  }
  /** @type {string[]} */
  const problems = [];
  if (!matched) {
    problems.push(`the manifest hash of the state differs from the items of the cases ${candidates.map((ids) => ids.join(',')).join(' and of the cases ')}`);
  }
  if (identity.frozenCommit !== FROZEN_COMMIT || identity.sourceDigest !== FROZEN_DIGEST) {
    problems.push('the state is not of the frozen source');
  }
  const hash = identityHash(identity);
  for (const [index, line] of lines.entries()) {
    if (line.identityHash !== hash) {
      problems.push(`log line ${index + 1} carries another identityHash than the state's`);
    }
  }
  for (const [variant, treeId] of Object.entries(identity.treeIds ?? {})) {
    const current = readTreeInfo(variant).treeId;
    if (current !== treeId) {
      problems.push(`stale tree ${variant} (${treeId} vs ${current})`);
    }
  }
  if (problems.length > 0) {
    return refuse(problems.join('; '));
  }
  const verdict = counterVerdict(items.map((item) => item.id), lines);
  const rows = kernelRows(items, lines);
  const perCase = caseSums(rows);
  const withoutCounters = rows.filter((row) => row.same === true && row.r4 === null).map((row) => row.item);
  const record = {
    meta: await buildMeta({ task, label: 'frozen', kind: 'kernel', trees: ['r4c', 'instr'], sourceLabel: args['source-label'] }),
    task,
    verdict: verdict.verdict,
    line: verdict.line,
    items: verdict.items,
    cases: caseIds,
    rows,
    perCase,
    withoutCounters,
  };
  writeJson(evidenceDir('frozen', task, 'kernel.json'), record);
  writeText(evidenceDir('frozen', task, 'kernel.md'), renderKernel(task, { meta: record.meta, verdict, rows, perCase, withoutCounters }));
  process.stdout.write(`${verdict.line}\nkernel-probe: wrote ${rel(evidenceDir('frozen', task, 'kernel.json'))}\n`);
  return 0;
}

/**
 * @param {string[]} argv `counters ...` or `report ...`
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  const commands = /** @type {Record<string, (argv: string[]) => Promise<number>>} */ ({ counters: countersCommand, report: reportCommand });
  if (command === undefined || !Object.hasOwn(commands, command)) {
    return refuse(`unknown command ${command ?? ''} (counters, report)`);
  }
  try {
    return await commands[command](rest);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}

// @ts-check
// Kernel probe (task pack v4, V4-T10a and V4-T10b; plan P7; reviews RV1-05, RV1-16 to RV1-19 and R17). The `counters`
// step runs the complete deduction of the window subsets of a case's first carved set in the `r4c` tree (the `instr`
// tree plus R4 visit and mutation counters, variants/r4c.json) and in the `instr` tree, on the same model input, and
// compares the two complete `DeductionResult`s: the counters are test-side and must change nothing. The probe runs as
// items of lib/items.mjs (kind `v4-kernel`, one lane, reserve 90 s). The `profile` step (V4-T10b) attributes
// `fewestColumn`: one child process per case, started with `--cpu-prof --no-turbo-inlining`, rates the case's six
// subsets in the `instr` tree (diagnostic only; the rating code does not change); `rebuildProfiles` derives
// `profile.jsonl` from the completed items. `report` rebuilds `kernel.json` and `kernel.md` from the completed items of
// the steps whose folder exists.
//   node tools\ig-proto\kernel-probe.mjs counters --task V4-T10a --label frozen --source-label "frozen 3fc65f4"
//     [--cases <ids>] [--horizon-s <H>]
//   node tools\ig-proto\kernel-probe.mjs profile --task V4-T10b --label frozen --source-label "frozen 3fc65f4"
//     [--cases <ids>] [--horizon-s <H>]
//   node tools\ig-proto\kernel-probe.mjs profile-child --case <id> --task V4-T10b --label frozen --source-label "frozen 3fc65f4"
//     (run by `profile` under the Node flags above; prints one JSON line)
//   node tools\ig-proto\kernel-probe.mjs report --task V4-T10a --label frozen --source-label "frozen 3fc65f4" [--cases <ids>]
//     (a block's cases: the default list, else the cases its item log names; `--cases` applies to `counters` only)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { startCountFor, windowSubsets } from './lib/calls.mjs';
import { loadEngine } from './lib/engine.mjs';
import { identityHash, manifestHash, readItemLog, runItems, runProcessItems } from './lib/items.mjs';
import { abs, artifactDir, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, readTreeInfo, sha256File, writeJson, writeText } from './lib/records.mjs';
import { caseBoard, firstCarvedSet, loadCatalogue } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';

/**
 * @typedef {import('./lib/items.mjs').Item} Item
 * @typedef {{ calls: number, pieces: number, staticRows: number, liveRows: number, dirtyPieces: number,
 *   countChanged: number, r4Kills: number, kills: number, undoEntries: number }} R4 The `r4` block of `igTake()`.
 * @typedef {{ item: string, caseId: string, subsetIndex: number, status: string, outcome: string | null, g: number | null,
 *   same: boolean | null, r4: R4 | null, ms: number | null, itemMs: number | null }} Row One expected item joined with
 *   its `item-end` line; `status` is the line's, or `missing` without one.
 * @typedef {{ item: string, caseId: string, file: string, sha256: string, totalMs: number, deduceMs: number,
 *   fewestColumnMs: number, share: number | null }} ProfileRecord One completed profile item with exactly one profile file.
 * @typedef {{ item: string, caseId: string, error: string }} ProfileProblem A completed profile item whose file is not usable.
 * @typedef {{ item: string, caseId: string, status: string, ratings: number | null, ms: number | null, itemMs: number | null,
 *   record: ProfileRecord | ProfileProblem | null }} ProfileRow One expected profile item joined with its end line and record.
 * @typedef {{ verdict: { line: string }, rows: Row[], perCase: ReturnType<typeof caseSums>, withoutCounters: string[] }} CountersView
 * @typedef {{ verdict: { line: string }, rows: ProfileRow[] }} ProfileView What `renderKernel` draws of a block.
 */

export const DEFAULT_CASES = Object.freeze(['14x14-nightmare', '26x26-nightmare']);
/** Subsets per case: the window offsets 1, 2 and 3 with two subsets each (lib/lane-worker.mjs, `kernelItem`). */
export const SUBSETS_PER_CASE = 6;
export const R4_FIELDS = Object.freeze(['calls', 'pieces', 'staticRows', 'liveRows', 'dirtyPieces', 'countChanged', 'r4Kills', 'kills', 'undoEntries']);
const STEP = 'counters';
const PROFILE_STEP = 'profile';
/** The reserve of a profile item (D-V4-14): admitted while `e + 120 <= H - 15`. */
const PROFILE_RESERVE_S = 120;
export const PROFILE_NOTE = 'reduced-inlining profile, diagnostic only (plan P7)';
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

/** @param {string} caseId @returns {string} The id of a case's profile item. */
const profileItemId = (caseId) => `profile:instr:${caseId}:${SEED_PREFIX}${caseId}`;

const PROFILE_ITEM_ID = new RegExp(`^profile:instr:([^:]+):${SEED_PREFIX}\\1$`);

/**
 * @param {string} task
 * @param {string} caseId
 * @param {string} [label] `frozen`; the self-test passes `selftest`.
 * @returns {string} The folder of a profile item's `.cpuprofile`, relative to the repository root with `/`.
 */
export const profileOutDir = (task, caseId, label = 'frozen') => rel(join(artifactDir(label, task, PROFILE_STEP), 'out', caseId));

/**
 * @param {string[]} caseIds
 * @param {{ task: string, sourceLabel: string }} o
 * @returns {Item[]} One process item per case, `profile:instr:<caseId>:ig-v4/kernel/<caseId>`. No argument depends on the
 *   invocation (the horizon is the parent's execution envelope, R2-03); the child's output folder is the item's `outDir`.
 */
export function profileItems(caseIds, { task, sourceLabel }) {
  return caseIds.map((caseId) => {
    const outDir = profileOutDir(task, caseId);
    return {
      id: profileItemId(caseId),
      kind: 'process',
      variant: 'instr',
      payload: {
        outDir,
        argv: [
          '--cpu-prof', '--cpu-prof-dir', outDir, '--no-turbo-inlining', 'tools/ig-proto/kernel-probe.mjs', 'profile-child',
          '--case', caseId, '--task', task, '--label', 'frozen', '--source-label', sourceLabel,
        ],
      },
    };
  });
}

/**
 * @param {any[]} lines The parsed lines of a `profile` item log.
 * @returns {string[]} The cases of the profile items the lines name, in order of first appearance.
 */
export function loggedProfileCases(lines) {
  /** @type {string[]} */
  const ids = [];
  for (const line of lines) {
    const match = typeof line?.item === 'string' ? PROFILE_ITEM_ID.exec(line.item) : null;
    if (match !== null && !ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  return ids;
}

/**
 * @param {any} profile A parsed `.cpuprofile`.
 * @returns {{ totalMs: number, deduceMs: number, fewestColumnMs: number }} A node's self time is the sum of the
 *   `timeDeltas` (µs) of the samples that name it, over 1,000; `totalMs` sums every node, `deduceMs` the nodes of a file
 *   ending `core/engine/deduce.js`, `fewestColumnMs` the nodes named `fewestColumn`. A file that is no profile throws.
 */
export function profileTimes(profile) {
  const { nodes, samples, timeDeltas } = profile ?? {};
  if (!Array.isArray(nodes) || !Array.isArray(samples) || !Array.isArray(timeDeltas) || samples.length !== timeDeltas.length
    || !timeDeltas.every((d) => Number.isFinite(d))) {
    throw new Error('not a cpuprofile (nodes, samples and timeDeltas)');
  }
  /** @type {Map<number, number>} */
  const selfUs = new Map();
  for (const [i, id] of samples.entries()) {
    selfUs.set(id, (selfUs.get(id) ?? 0) + timeDeltas[i]);
  }
  let totalUs = 0;
  let deduceUs = 0;
  let fewestUs = 0;
  for (const node of nodes) {
    const us = selfUs.get(node?.id) ?? 0;
    totalUs += us;
    if (typeof node?.callFrame?.url === 'string' && node.callFrame.url.endsWith('core/engine/deduce.js')) {
      deduceUs += us;
    }
    if (node?.callFrame?.functionName === 'fewestColumn') {
      fewestUs += us;
    }
  }
  return { totalMs: totalUs / 1000, deduceMs: deduceUs / 1000, fewestColumnMs: fewestUs / 1000 };
}

/**
 * The records of the completed items of a `profile` step, in the order of the items (R2-03). A completed item whose
 * folder holds exactly one `.cpuprofile` file gives its record; none or several give `profile files: <n>`, and a file
 * that is no profile gives `profile unreadable: <message>`. Nothing is written.
 * @param {string} task
 * @param {string} [label] `frozen`; the self-test passes `selftest`.
 * @returns {(ProfileRecord | ProfileProblem)[]}
 */
export function profileRecords(task, label = 'frozen') {
  const lines = readItemLog(join(artifactDir(label, task, PROFILE_STEP), 'items.jsonl'));
  const ends = endsOf(lines);
  /** @type {(ProfileRecord | ProfileProblem)[]} */
  const records = [];
  for (const caseId of loggedProfileCases(lines)) {
    const item = profileItemId(caseId);
    if (ends.get(item)?.status !== 'completed') {
      continue;
    }
    const outDir = profileOutDir(task, caseId, label);
    /** @type {string[]} */
    let files = [];
    try {
      files = readdirSync(abs(outDir)).filter((name) => name.endsWith('.cpuprofile')).sort();
    } catch {
      files = [];
    }
    if (files.length !== 1) {
      records.push({ item, caseId, error: `profile files: ${files.length}` });
      continue;
    }
    const path = join(abs(outDir), files[0]);
    try {
      const times = profileTimes(JSON.parse(readFileSync(path, 'utf8')));
      records.push({
        item, caseId, file: `${outDir}/${files[0]}`, sha256: sha256File(path, { raw: true }), ...times,
        share: times.deduceMs === 0 ? null : times.fewestColumnMs / times.deduceMs,
      });
    } catch (e) {
      records.push({ item, caseId, error: `profile unreadable: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  return records;
}

/**
 * Writes `profile.jsonl` of a `profile` step whole, one line per record of `profileRecords`, never appending: a second
 * call writes the same bytes (R2-03).
 * @param {string} task
 * @param {string} [label] `frozen`; the self-test passes `selftest`.
 * @returns {(ProfileRecord | ProfileProblem)[]} The records written.
 */
export function rebuildProfiles(task, label = 'frozen') {
  const dir = artifactDir(label, task, PROFILE_STEP);
  if (!existsSync(dir)) {
    throw new Error(`no profile step ${rel(dir)}`);
  }
  const records = profileRecords(task, label);
  writeFileSync(join(dir, 'profile.jsonl'), records.map((record) => `${JSON.stringify(record)}\n`).join(''));
  return records;
}

/**
 * @param {string[]} caseIds The expected cases, in order.
 * @param {any[]} lines The parsed lines of the profile item log.
 * @param {(ProfileRecord | ProfileProblem)[]} records
 * @returns {ProfileRow[]}
 */
export function profileRows(caseIds, lines, records) {
  const ends = endsOf(lines);
  return caseIds.map((caseId) => {
    const item = profileItemId(caseId);
    const end = ends.get(item);
    const child = end?.result?.stdout;
    return {
      item,
      caseId,
      status: end?.status ?? 'missing',
      ratings: Number.isInteger(child?.ratings) ? child.ratings : null,
      ms: typeof child?.ms === 'number' ? child.ms : null,
      itemMs: typeof end?.ms === 'number' ? end.ms : null,
      record: records.find((record) => record.item === item) ?? null,
    };
  });
}

/**
 * @param {ProfileRow[]} rows
 * @returns {{ verdict: 'complete' | 'incomplete', cases: string[], line: string }} `complete` when every item completed
 *   with a record of its profile; else `incomplete` with the cases whose item is missing, censored, an error or an
 *   evidence error (`cases` is empty for `complete`; `line` is the printed verdict).
 */
export function profileVerdict(rows) {
  if (rows.length === 0) {
    throw new RangeError('profileVerdict needs at least one item');
  }
  const bad = rows.filter((row) => row.status !== 'completed' || row.record === null || 'error' in row.record).map((row) => row.caseId);
  return bad.length === 0
    ? { verdict: 'complete', cases: [], line: 'profile: complete' }
    : { verdict: 'incomplete', cases: bad, line: `profile: incomplete (${bad.join(', ')})` };
}

/**
 * @param {string} task
 * @param {{ meta: any, counters: CountersView | null, profile: ProfileView | null }} record The blocks present in the report.
 * @returns {string} The Markdown record `kernel.md`.
 */
export function renderKernel(task, { meta, counters, profile }) {
  const title = counters !== null && profile !== null ? `R4 counters and the \`fewestColumn\` profile (${task})`
    : profile !== null ? `the \`fewestColumn\` profile (${task})` : `R4 visit and mutation counters (${task})`;
  const lines = [`# Kernel probe: ${title}`, '', banner(meta), ''];
  if (counters !== null) {
    lines.push(counters.verdict.line, '');
  }
  if (profile !== null) {
    lines.push(profile.verdict.line, '');
  }
  if (counters !== null) {
    lines.push(...countersBody(counters));
  }
  if (profile !== null) {
    lines.push(...profileBody(profile));
  }
  return lines.join('\n');
}

/**
 * @param {ProfileView} profile
 * @returns {string[]} The profile block of `kernel.md` after its verdict line.
 */
function profileBody({ rows }) {
  return [
    '## The `fewestColumn` profile', '', PROFILE_NOTE, '',
    'Each case ran in a child process started with `--cpu-prof --no-turbo-inlining` and rated the six window subsets of its '
    + 'first carved set in the `instr` tree with `rate()` (an incomplete rating counts as a rating); the rating code is not changed. '
    + 'A node\'s self time is the sum of the sample deltas that name it; `totalMs` sums every node, `deduceMs` the nodes of '
    + '`core/engine/deduce.js`, `fewestColumnMs` the nodes named `fewestColumn`, and `share` is `fewestColumnMs / deduceMs`. '
    + '`ratings` and `ms` are the child\'s own report and `itemMs` the parent\'s time of the item.', '',
    '| case | status | ratings | ms | itemMs | file | sha256 | totalMs | deduceMs | fewestColumnMs | share |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(({ caseId, status, ratings, ms, itemMs, record }) => {
      const problem = record !== null && 'error' in record ? ` (${cell(record.error)})` : '';
      const ok = record !== null && !('error' in record) ? record : null;
      return `| ${cell(caseId)} | ${cell(status)}${problem} | ${cell(ratings)} | ${cell(ms)} | ${cell(itemMs)} | ${cell(ok?.file)} | ${cell(ok?.sha256.slice(0, 16))} | ${cell(ok?.totalMs)} | ${cell(ok?.deduceMs)} | ${cell(ok?.fewestColumnMs)} | ${cell(ok?.share === null || ok === null ? null : Math.round(ok.share * 10000) / 10000)} |`;
    }),
    '',
  ];
}

/**
 * @param {CountersView} counters
 * @returns {string[]} The counters block of `kernel.md` after its verdict line.
 */
function countersBody({ rows, perCase, withoutCounters }) {
  const lines = [
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
  return lines;
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
 * @param {string[]} argv `--task <T> --label frozen --source-label <SL> [--cases <ids>] [--horizon-s <H>]`
 * @returns {Promise<number>} The runner's exit code (0, or 3 for a refused resume); 1 for a refused command.
 */
async function profileCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label', 'cases', 'horizon-s'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const { task } = args;
  if (task === undefined) {
    return refuse('profile needs --task');
  }
  if (HISTORICAL_TASKS.includes(task)) {
    return refuse(`${task} is a historical observation namespace; use another --task`);
  }
  const sourceLabel = args['source-label'];
  if (sourceLabel === undefined) {
    return refuse('profile needs --source-label');
  }
  const horizonS = Number(args['horizon-s'] ?? DEFAULT_HORIZON_S);
  if (!Number.isFinite(horizonS) || horizonS <= 0) {
    return refuse('--horizon-s must be a positive number');
  }
  const items = profileItems(parseCases(args.cases), { task, sourceLabel });
  const out = await runProcessItems({ task, step: PROFILE_STEP, label: 'frozen', horizonS, items, reserveS: PROFILE_RESERVE_S });
  if (out.exitCode === 0) {
    const records = rebuildProfiles(task);
    process.stdout.write(`kernel-probe: wrote ${rel(join(artifactDir('frozen', task, PROFILE_STEP), 'profile.jsonl'))} (${records.length} records)\n`);
  }
  return out.exitCode;
}

/**
 * The child of a profile item, run under `--cpu-prof --no-turbo-inlining`: in the `instr` tree it rates the six window
 * subsets of the case's first carved set (T10a's corpus) with `rate()`; an `IncompleteRatingError` counts as a rating.
 * Prints one JSON line `{ caseId, ratings, ms }`.
 * @param {string[]} argv `--case <id> --task <T> --label frozen --source-label <SL>`
 * @returns {Promise<number>}
 */
async function profileChildCommand(argv) {
  const { args } = parseArgs(argv, { values: ['case', 'task', 'label', 'source-label'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  if (args.case === undefined) {
    return refuse('profile-child needs --case');
  }
  if (args.task !== undefined && HISTORICAL_TASKS.includes(args.task)) {
    return refuse(`${args.task} is a historical observation namespace; use another --task`);
  }
  const ids = parseCases(args.case);
  if (ids.length !== 1) {
    return refuse('profile-child takes one case');
  }
  const [caseId] = ids;
  const e = await loadEngine((await ensureTree('instr')).root);
  const ws = e.workspace.createWorkspace(e.workspace.MAIN_WORKSPACE_BYTES);
  const entry = caseBoard(caseId);
  const seedText = `${SEED_PREFIX}${caseId}`;
  const carved = firstCarvedSet(e, { boardRows: entry.boardRows, levelId: entry.levelId, seedText });
  if (!carved.ok) {
    return refuse(`no set for ${caseId}: ${carved.reason}`);
  }
  const subsets = windowSubsets(e, {
    set: carved.set, seedText, offsets: [1, 2, 3], perCount: 2, startCount: startCountFor(e, entry.levelId, carved.K),
  });
  const t0 = performance.now();
  let ratings = 0;
  for (const subset of subsets) {
    try {
      e.difficulty.rate(carved.board, carved.set.pieces, subset.clues, ws);
    } catch (error) {
      if (!(error instanceof e.difficulty.IncompleteRatingError)) {
        throw error;
      }
    }
    ratings += 1;
  }
  process.stdout.write(`${JSON.stringify({ caseId, ratings, ms: Math.round((performance.now() - t0) * 1000) / 1000 })}\n`);
  return 0;
}

/** @typedef {{ caseIds: string[], items: Item[], lines: any[] }} Located A step's cases, items and item-log lines. */

/**
 * Finds the run of a step for `report`: its state, its log and the cases whose items reproduce the state's manifest hash
 * (`explicit`, else the default list, else the cases the log names), and checks that the state is of the frozen source,
 * that every log line carries the state's `identityHash` and that no tree is stale.
 * @param {{ task: string, step: string, explicit: string[] | null, logged: (lines: any[]) => string[],
 *   itemsFor: (caseIds: string[]) => Item[] | Promise<Item[]> }} o
 * @returns {Promise<Located | { problems: string[] }>}
 */
async function locateRun({ task, step, explicit, logged, itemsFor }) {
  const dir = artifactDir('frozen', task, step);
  const statePath = join(dir, 'state.json');
  if (!existsSync(statePath)) {
    return { problems: [`no state ${rel(statePath)}: run ${step} first`] };
  }
  const identity = JSON.parse(readFileSync(statePath, 'utf8')).identity ?? null;
  if (identity === null) {
    return { problems: [`the state ${rel(statePath)} has no identity`] };
  }
  const lines = readItemLog(join(dir, 'items.jsonl'));
  const named = logged(lines);
  const candidates = explicit !== null
    ? [explicit]
    : [parseCases(undefined), ...(named.length > 0 ? [parseCases(named.join(','))] : [])];
  /** @type {string[]} */
  const problems = [];
  /** @type {Located | null} */
  let found = null;
  for (const caseIds of candidates) {
    const items = await itemsFor(caseIds);
    if (identity.manifestHash === manifestHash(items)) {
      found = { caseIds, items, lines };
      break;
    }
  }
  if (found === null) {
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
  return problems.length > 0 || found === null ? { problems } : found;
}

/** @param {Located} run @returns {{ json: Record<string, unknown>, view: CountersView }} */
function countersBlock({ caseIds, items, lines }) {
  const verdict = counterVerdict(items.map((item) => item.id), lines);
  const rows = kernelRows(items, lines);
  const perCase = caseSums(rows);
  const withoutCounters = rows.filter((row) => row.same === true && row.r4 === null).map((row) => row.item);
  return {
    json: { verdict: verdict.verdict, line: verdict.line, items: verdict.items, cases: caseIds, rows, perCase, withoutCounters },
    view: { verdict, rows, perCase, withoutCounters },
  };
}

/** @param {string} task @param {Located} run @returns {{ json: Record<string, unknown>, view: ProfileView }} */
function profileBlock(task, { caseIds, lines }) {
  const records = profileRecords(task);
  const rows = profileRows(caseIds, lines, records);
  const verdict = profileVerdict(rows);
  return {
    json: { profile: { verdict: verdict.verdict, line: verdict.line, items: verdict.cases, cases: caseIds, note: PROFILE_NOTE, rows, records } },
    view: { verdict, rows },
  };
}

/**
 * @param {string[]} argv `--task <T> --label frozen --source-label <SL> [--cases <ids>]`. The counters block is written
 *   when the task has a `counters` step folder and the profile block when it has a `profile` folder (the plans of T10a and
 *   T10b have one each, T11c's `V4-S2K` both); a block's cases are the default list or, when its state is of another
 *   list, the cases its item log names (`--cases` is for the counters block only)
 * @returns {Promise<number>} 0 once the record is written, whatever its verdicts; 1 for a refused command or a run whose
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
  const sourceLabel = args['source-label'];
  const present = [STEP, PROFILE_STEP].filter((step) => existsSync(artifactDir('frozen', task, step)));
  if (present.length === 0) {
    return refuse(`no ${STEP} or ${PROFILE_STEP} step under ${rel(artifactDir('frozen', task))}: run ${STEP} or ${PROFILE_STEP} first`);
  }
  // Each block finds its cases from its own state; `--cases` applies to the counters block only.
  /** @type {string[]} */
  const problems = [];
  /** @type {Located | null} */
  let countersRun = null;
  if (present.includes(STEP)) {
    const run = await locateRun({
      task, step: STEP, explicit: args.cases === undefined ? null : parseCases(args.cases), logged: loggedCases, itemsFor: kernelItems,
    });
    if ('problems' in run) {
      problems.push(...run.problems.map((p) => `${STEP}: ${p}`));
    } else {
      countersRun = run;
    }
  }
  /** @type {Located | null} */
  let profileRun = null;
  if (present.includes(PROFILE_STEP)) {
    const run = sourceLabel === undefined
      ? { problems: ['the profile block needs --source-label'] }
      : await locateRun({
        task, step: PROFILE_STEP, explicit: null, logged: loggedProfileCases, itemsFor: (ids) => profileItems(ids, { task, sourceLabel }),
      });
    if ('problems' in run) {
      problems.push(...run.problems.map((p) => `${PROFILE_STEP}: ${p}`));
    } else {
      profileRun = run;
    }
  }
  if (problems.length > 0) {
    return refuse(problems.join('; '));
  }

  const counters = countersRun === null ? null : countersBlock(countersRun);
  const profile = profileRun === null ? null : profileBlock(task, profileRun);
  const record = {
    meta: await buildMeta({ task, label: 'frozen', kind: 'kernel', trees: counters === null ? ['instr'] : ['r4c', 'instr'], sourceLabel }),
    task,
    ...counters?.json,
    ...profile?.json,
  };
  writeJson(evidenceDir('frozen', task, 'kernel.json'), record);
  writeText(evidenceDir('frozen', task, 'kernel.md'), renderKernel(task, { meta: record.meta, counters: counters?.view ?? null, profile: profile?.view ?? null }));
  process.stdout.write(`${[counters, profile].map((block) => (block === null ? '' : `${block.view.verdict.line}\n`)).join('')}`
    + `kernel-probe: wrote ${rel(evidenceDir('frozen', task, 'kernel.json'))}\n`);
  return 0;
}

/**
 * @param {string[]} argv `counters ...`, `profile ...`, `profile-child ...` or `report ...`
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  const commands = /** @type {Record<string, (argv: string[]) => Promise<number>>} */ ({
    counters: countersCommand, profile: profileCommand, 'profile-child': profileChildCommand, report: reportCommand,
  });
  if (command === undefined || !Object.hasOwn(commands, command)) {
    return refuse(`unknown command ${command ?? ''} (counters, profile, profile-child, report)`);
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

// @ts-check
// MP12a criteria script (cross-review TP21, TP22, TP27): evaluates the criteria C1 to C5 of one calibration round of the
// 18 GV2 cases from the published reports, the GV2 baseline and the `prod` lines of the round's probe corpus, and prints
// Markdown (ASCII only). It reads files and prints; it never writes one and never decides a knob.
//   node docs/difficulty-v3/landscape-v3/criteria.mjs --round docs/difficulty-v3/landscape-v3/r0
//     --baseline docs/difficulty-v3/baseline-v2 --final docs/difficulty-v3/landscape-v3/r0/probe/final.jsonl
//     [--fit tests/artifacts/MP12a/r0/fit-current.json]
//   node docs/difficulty-v3/landscape-v3/criteria.mjs --self-test
// Exit 0 when the round could be evaluated (whatever the criteria say), 1 on an input error or a failed self-test.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { level } from '../../../core/engine/levels.js';

const HARD = 3;
const EPS = 1e-9;
const C2_MARGIN = 0.1;
const C4_SHARE = 0.05;
const USAGE = 'usage: criteria.mjs --round <folder> --baseline <folder> --final <final.jsonl> [--fit <fit-current.json>]\n'
  + '       criteria.mjs --self-test';

/**
 * A cell of the round as the criteria read it: the report's calibration cell plus the totals of its runs.
 * @typedef {object} V3Block
 * @property {number} accepted
 * @property {{ median: number }} score
 * @property {{ count: number, share: number }} censored
 * @property {number} provedZero
 * @property {Record<string, any>} [G]
 * @property {Record<string, any>} [info]
 * @property {Record<string, any>} [Cmax]
 * @property {Record<string, any>} [tier]
 * @property {Record<string, any>} [solutions]
 */
/**
 * @typedef {object} Cell
 * @property {string} caseId
 * @property {string} boardId
 * @property {string} levelId
 * @property {number | null} requestInBandRate The request completion rate (requests that completed ten in-band puzzles).
 * @property {number} recorded Recorded requests.
 * @property {number} completeTen Requests that completed ten.
 * @property {number} accepted Accepted puzzles over the recorded requests.
 * @property {V3Block | null} v3 Null without an accepted v3 puzzle.
 * @property {number} sampledUnrateable Diagnostic samples that were unrateable.
 * @property {number} sampledAttempted Diagnostic samples attempted (rated plus failed).
 */
/**
 * @typedef {object} BaselineCell
 * @property {number | null} requestInBandRate
 * @property {number} recorded
 * @property {number} completeTen
 * @property {number} accepted
 */
/**
 * @typedef {object} FitCurrent
 * @property {number[]} [tuple]
 * @property {Record<string, { lines: number, hits: number, puzzleRescoreHitRate: number | null }>} cells
 */
/** @typedef {'pass' | 'fail' | 'unavailable'} Status */

/** @param {unknown} v @returns {v is number} */
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** @param {unknown} v */
const pct = (v) => (isNumber(v) ? `${(v * 100).toFixed(1)}%` : 'n/a');

/** @param {unknown} v @param {number} [digits] Fixed digits; by default an integer as it is and any other value with one decimal. */
const num = (v, digits) => {
  if (!isNumber(v)) {
    return 'n/a';
  }
  return digits !== undefined ? v.toFixed(digits) : Number.isInteger(v) ? String(v) : v.toFixed(1);
};

/** @param {Status[]} statuses @returns {Status} */
const combine = (statuses) => (statuses.includes('fail') ? 'fail' : statuses.includes('unavailable') ? 'unavailable' : 'pass');

/**
 * Class of a probe line (MP06b A1.3 step 1): `error`, or the deduction path `complete`, `capped` or `none`.
 * @param {any} line
 * @returns {'error' | 'complete' | 'capped' | 'none'}
 */
export function classOf(line) {
  if (line !== null && typeof line === 'object' && 'error' in line) {
    return 'error';
  }
  const path = line?.deduction?.path;
  return path === 'complete' || path === 'capped' || path === 'none' ? path : 'error';
}

/** @param {any} line */
const isCutoff = (line) => classOf(line) === 'complete' && ['node-cap', 'work-cap'].includes(line.deduction?.search?.stop);

/** @param {any} line @returns {string} The GV2 case of a request id `A-<case>-r<rep>`; the id itself otherwise. */
const caseOf = (line) => {
  const m = /^A-(.+)-r\d+$/.exec(String(line.request));
  return m === null ? String(line.request) : m[1];
};

/** @param {Record<string, number> | undefined} hist */
const histText = (hist) => (hist === undefined ? 'n/a'
  : Object.entries(hist).map(([k, v]) => `${k}:${v}`).join(' '));

/**
 * The pure core: the criteria C1 to C5 of one round.
 * @param {{ cells: Cell[], baseline: Record<string, BaselineCell>, lines: any[], fit?: FitCurrent | null }} input
 */
export function evaluateRound({ cells, baseline, lines, fit = null }) {
  /** @type {Map<string, Record<string, number>>} */
  const byCase = new Map();
  for (const line of lines) {
    const id = caseOf(line);
    const counts = byCase.get(id) ?? { complete: 0, capped: 0, none: 0, error: 0, cutoff: 0 };
    counts[classOf(line)] += 1;
    counts.cutoff += isCutoff(line) ? 1 : 0;
    byCase.set(id, counts);
  }
  const rows = cells.map((cell) => {
    const index = level(cell.levelId).index;
    const base = baseline[cell.caseId] ?? null;
    const rate = cell.requestInBandRate;
    const baseRate = base === null ? null : base.requestInBandRate;
    const bound = isNumber(baseRate) ? baseRate - C2_MARGIN : null;
    /** @type {Status | 'n/a'} */
    let c2 = 'n/a';
    if (cell.levelId === 'hard' || cell.levelId === 'expert') {
      c2 = bound === null || !isNumber(rate) ? 'unavailable' : rate >= bound - EPS ? 'pass' : 'fail';
    }
    /** @type {Status | 'n/a'} */
    let c3 = 'n/a';
    if (index >= HARD) {
      c3 = cell.v3 === null ? 'unavailable' : cell.v3.provedZero === 0 ? 'pass' : 'fail';
    }
    /** @type {Status} */
    const c4 = cell.v3 === null ? 'unavailable' : cell.v3.censored.share <= C4_SHARE + EPS ? 'pass' : 'fail';
    const yieldOf = (/** @type {{ accepted: number, recorded: number } | null} */ x) => (
      x === null || x.recorded === 0 ? null : x.accepted / (x.recorded * 10));
    const fitCell = fit?.cells?.[cell.caseId] ?? null;
    return {
      caseId: cell.caseId,
      boardId: cell.boardId,
      levelId: cell.levelId,
      levelIndex: index,
      requestCompletionRate: rate,
      baselineRate: baseRate,
      bound,
      c2,
      yield: yieldOf(cell),
      baselineYield: yieldOf(base),
      puzzleRescoreHitRate: fitCell === null ? null : fitCell.puzzleRescoreHitRate,
      median: cell.v3 === null ? null : cell.v3.score.median,
      censoredShare: cell.v3 === null ? null : cell.v3.censored.share,
      censoredCount: cell.v3 === null ? null : cell.v3.censored.count,
      provedZero: cell.v3 === null ? null : cell.v3.provedZero,
      c3,
      c4,
      prod: byCase.get(cell.caseId) ?? { complete: 0, capped: 0, none: 0, error: 0, cutoff: 0 },
      samples: `${cell.sampledUnrateable} of ${cell.sampledAttempted}`,
      v3: cell.v3,
    };
  });

  // C1: per board the medians strictly increase with the level; a board with an empty cell is unavailable.
  /** @type {string[]} */
  const boardIds = [];
  for (const r of rows) {
    if (!boardIds.includes(r.boardId)) {
      boardIds.push(r.boardId);
    }
  }
  const boards = boardIds.map((boardId) => {
    const mine = rows.filter((r) => r.boardId === boardId).sort((a, b) => a.levelIndex - b.levelIndex);
    const missing = mine.filter((r) => r.median === null).map((r) => r.caseId);
    const medians = mine.map((r) => r.median);
    let ordered = true;
    for (let i = 1; i < mine.length; i += 1) {
      const a = medians[i - 1];
      const b = medians[i];
      if (isNumber(a) && isNumber(b) && !(b > a)) {
        ordered = false;
      }
    }
    /** @type {Status} */
    const status = !ordered ? 'fail' : missing.length > 0 ? 'unavailable' : 'pass';
    return { boardId, mine, missing, ordered, status };
  });
  const c1Detail = boards.map((b) => `${b.boardId}: ${b.mine.map((r) => `${r.levelId} ${num(r.median)}`).join(' < ')}`
    + `${b.status === 'pass' ? ' (ordered)' : b.status === 'fail' ? ' (NOT ordered)' : ` (unavailable: no accepted v3 puzzle in ${b.missing.join(', ')})`}`)
    .join('; ');

  const c2Rows = rows.filter((r) => r.c2 !== 'n/a');
  const c3Rows = rows.filter((r) => r.c3 !== 'n/a');
  const empty = (/** @type {string} */ what, /** @type {Status[]} */ list) => (list.length === 0 ? `no ${what} cell` : '');
  /** @type {Status[]} */
  const c2Status = c2Rows.map((r) => /** @type {Status} */ (r.c2));
  /** @type {Status[]} */
  const c3Status = c3Rows.map((r) => /** @type {Status} */ (r.c3));
  const c4Status = rows.map((r) => r.c4);
  const totals = { complete: 0, capped: 0, none: 0, error: 0, cutoff: 0 };
  for (const counts of byCase.values()) {
    for (const key of /** @type {const} */ (['complete', 'capped', 'none', 'error', 'cutoff'])) {
      totals[key] += counts[key];
    }
  }
  /** @type {Status} */
  const c5Status = lines.length === 0 ? 'unavailable' : totals.capped > 0 ? 'fail' : 'pass';
  const list = (/** @type {typeof rows} */ items, /** @type {(r: typeof rows[number]) => string} */ text) => items.map(text).join('; ');
  const criteria = {
    C1: { status: combine(boards.map((b) => b.status)), detail: c1Detail },
    C2: {
      status: combine(c2Status),
      detail: empty('Hard or Expert', c2Status) || list(c2Rows,
        (r) => `${r.caseId} ${pct(r.requestCompletionRate)} vs GV2 ${pct(r.baselineRate)} (bound ${pct(r.bound)}): ${r.c2}`),
    },
    C3: {
      status: combine(c3Status),
      detail: empty('Hard-or-above', c3Status) || list(c3Rows,
        (r) => `${r.caseId} provedZero ${r.provedZero === null ? 'unavailable' : r.provedZero}`)
        + ' (the slow test is recorded apart)',
    },
    C4: {
      status: combine(c4Status),
      detail: list(rows, (r) => `${r.caseId} ${r.censoredShare === null ? 'unavailable'
        : `${r.censoredCount} census estimates (${pct(r.censoredShare)})`}`),
    },
    C5: {
      status: c5Status,
      detail: `${lines.length} prod lines: complete ${totals.complete}, capped ${totals.capped}, none ${totals.none}, `
        + `error ${totals.error}, count cutoffs ${totals.cutoff}; diagnostic samples are reported, never gated`,
    },
  };
  /** @type {string[]} */
  const branches = [];
  if (criteria.C5.status === 'fail') {
    branches.push('caps');
  }
  if (criteria.C4.status === 'fail') {
    branches.push('census');
  }
  if (criteria.C2.status === 'fail' || boards.some((b) => b.missing.length > 0)) {
    branches.push('availability');
  }
  if (boards.some((b) => !b.ordered)) {
    branches.push('order');
  }
  const allPass = Object.values(criteria).every((c) => c.status === 'pass');
  return { criteria, cells: rows, branches: allPass && branches.length === 0 ? ['final'] : branches };
}

const BRANCH_TEXT = {
  final: 'every criterion passes: the round is final (the penalty question of P-OD3 is settled apart).',
  caps: 'C5 fails (P-OD2): cap-1g, then cap-10g on the packs with a capped prod line; D19 sets work and nodes.',
  census: 'C4 fails (P-OD1): census-20m, census-40m, census-80m on the packs of the failing cells.',
  availability: 'C2 fails, or C1 is unavailable on a board: no round on an unchanged tuple; prepare one SHARES or K60 '
    + 'trial from the diag captures and stop for the orchestrator (TP22).',
  order: 'C1 fails with its medians present: MP06c grid by distance to the current knobs, scored by puzzleRescoreHitRate.',
};

/**
 * @param {ReturnType<typeof evaluateRound>} result
 * @param {{ lines: string[] }} [meta] Header lines (source identity and the inputs).
 * @returns {string} Markdown, ASCII only.
 */
export function renderMarkdown(result, meta = { lines: [] }) {
  const out = ['## Criteria C1 to C5', '', ...meta.lines, '', '| Criterion | Status | Numbers |', '|---|---|---|'];
  const names = {
    C1: 'C1 levels ordered', C2: 'C2 Hard and Expert completion', C3: 'C3 proved real choice (Hard and above)',
    C4: 'C4 census estimates at most 5 %', C5: 'C5 no capped prod line',
  };
  for (const [key, c] of Object.entries(result.criteria)) {
    out.push(`| ${names[/** @type {keyof typeof names} */ (key)]} | ${c.status} | ${c.detail} |`);
  }
  out.push('', '## Cells', '',
    '| Case | request completion | GV2 | bound | C2 | yield | GV2 yield | puzzle rescore hit | v3 median | census share | '
    + 'provedZero | prod complete / capped / none / error (cutoff) | samples unrateable |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of result.cells) {
    out.push(`| ${r.caseId} | ${pct(r.requestCompletionRate)} | ${pct(r.baselineRate)} | ${pct(r.bound)} | ${r.c2} | `
      + `${pct(r.yield)} | ${pct(r.baselineYield)} | ${pct(r.puzzleRescoreHitRate)} | ${num(r.median)} | `
      + `${r.censoredShare === null ? 'unavailable' : pct(r.censoredShare)} | `
      + `${r.provedZero === null ? 'unavailable' : r.provedZero} | `
      + `${r.prod.complete} / ${r.prod.capped} / ${r.prod.none} / ${r.prod.error} (${r.prod.cutoff}) | ${r.samples} |`);
  }
  out.push('', '## v3 measures of the accepted puzzles', '',
    '| Case | accepted | score min / median / max | G | info median | Cmax | tier | solutions |', '|---|---|---|---|---|---|---|---|');
  for (const r of result.cells) {
    const v = r.v3;
    const score = /** @type {any} */ (v)?.score;
    out.push(v === null ? `| ${r.caseId} | unavailable | | | | | | |`
      : `| ${r.caseId} | ${v.accepted} | ${num(score.min)} / ${num(score.median)} / ${num(score.max)} | ${histText(v.G)} | `
      + `${num(/** @type {any} */ (v.info)?.median, 2)} | ${histText(v.Cmax)} | ${histText(v.tier)} | ${histText(v.solutions)} |`);
  }
  out.push('', '## Branches of "Choosing a change"', '');
  for (const b of result.branches) {
    out.push(`- ${b}: ${BRANCH_TEXT[/** @type {keyof typeof BRANCH_TEXT} */ (b)]}`);
  }
  return `${out.join('\n')}\n`;
}

class InputError extends Error {}

/** @param {string} path @returns {any} */
function readJson(path) {
  const text = readFileSync(path, 'utf8');
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
}

/** @param {any} report @returns {number} */
const acceptedOf = (report) => report.runs
  .filter((/** @type {any} */ r) => r.probeKind === 'generation' && !r.interrupted)
  .reduce((/** @type {number} */ sum, /** @type {any} */ r) => sum + r.acceptedCount, 0);

/**
 * Reads the inputs of the round; any inconsistency is an InputError.
 * @param {{ round: string, baseline: string, final: string, fit: string | null }} paths
 * @param {string[]} gv2 The 18 GV2 case ids.
 */
export function loadInputs(paths, gv2) {
  /** @type {string[]} */
  const problems = [];
  /** @type {Map<string, string[]>} */
  const files = new Map();
  for (const name of readdirSync(paths.round)) {
    const m = /^(.+)-(\d{4}-\d{2}-\d{2})\.json$/.exec(name);
    if (m !== null) {
      files.set(m[1], [...(files.get(m[1]) ?? []), name]);
    }
  }
  for (const id of gv2) {
    const found = files.get(id) ?? [];
    if (found.length !== 1) {
      problems.push(`the round folder has ${found.length} reports for ${id}, not exactly one`);
    }
  }
  for (const id of files.keys()) {
    if (!gv2.includes(id)) {
      problems.push(`the round folder has a report of ${id}, which is not a GV2 case`);
    }
  }
  /** @type {Cell[]} */
  const cells = [];
  /** @type {Map<string, any>} */
  const metas = new Map();
  for (const id of gv2) {
    const found = files.get(id) ?? [];
    if (found.length !== 1) {
      continue;
    }
    const report = readJson(join(paths.round, found[0]));
    const cell = report.calibration?.cells?.find((/** @type {any} */ c) => c.caseId === id);
    const reps = new Set(report.runs.filter((/** @type {any} */ r) => r.caseId === id && r.probeKind === 'generation')
      .map((/** @type {any} */ r) => r.rep));
    if (report.complete !== true) {
      problems.push(`${id}: the report is not complete`);
    }
    for (let rep = 0; rep < 20; rep += 1) {
      if (!reps.has(rep)) {
        problems.push(`${id}: the report lacks rep ${rep}`);
      }
    }
    if (cell === undefined) {
      problems.push(`${id}: the report has no calibration cell of its case`);
      continue;
    }
    metas.set(id, report.meta);
    const runs = report.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation' && !r.interrupted);
    const attempted = runs.reduce((/** @type {number} */ s, /** @type {any} */ r) => s
      + (Array.isArray(r.samples) ? r.samples.length : 0)
      + (r.details !== null && r.details !== undefined ? (r.details.sampleFailures ?? 0) : 0), 0);
    cells.push({
      caseId: id,
      boardId: cell.boardId,
      levelId: cell.levelId,
      requestInBandRate: cell.requestInBandRate,
      recorded: cell.runs.recorded,
      completeTen: cell.runs.completeTen,
      accepted: acceptedOf(report),
      v3: cell.v3 ?? null,
      sampledUnrateable: cell.sampledUnrateable ?? 0,
      sampledAttempted: attempted,
    });
  }
  const [first] = [...metas.values()];
  for (const [id, meta] of metas) {
    if (meta.sourceDigest !== first.sourceDigest || JSON.stringify(meta.versions) !== JSON.stringify(first.versions)) {
      problems.push(`${id}: the report has another sourceDigest or versions than the others`);
    }
  }
  /** @type {Record<string, BaselineCell>} */
  const baseline = {};
  for (const id of gv2) {
    const name = readdirSync(paths.baseline).filter((n) => new RegExp(`^${id}-\\d{4}-\\d{2}-\\d{2}\\.json$`).test(n));
    if (name.length !== 1) {
      if (id.endsWith('-hard') || id.endsWith('-expert')) {
        problems.push(`the baseline has ${name.length} files for ${id}, not exactly one`);
      }
      continue;
    }
    const report = readJson(join(paths.baseline, name[0]));
    const cell = report.calibration?.cells?.find((/** @type {any} */ c) => c.caseId === id);
    if (cell === undefined) {
      problems.push(`${id}: the baseline has no calibration cell of its case`);
      continue;
    }
    baseline[id] = {
      requestInBandRate: cell.requestInBandRate, recorded: cell.runs.recorded, completeTen: cell.runs.completeTen,
      accepted: acceptedOf(report),
    };
  }
  const text = readFileSync(paths.final, 'utf8');
  /** @type {any[]} */
  const lines = [];
  text.split(/\r?\n/).forEach((row, i) => {
    if (row.trim() === '') {
      return;
    }
    try {
      const line = JSON.parse(row);
      if (typeof line.request !== 'string' || line.puzzleId === undefined) {
        problems.push(`final.jsonl line ${i + 1} has no request or puzzleId`);
      }
      lines.push(line);
    } catch {
      problems.push(`final.jsonl line ${i + 1} is not JSON`);
    }
  });
  const fit = paths.fit === null ? null : readJson(paths.fit);
  if (problems.length > 0) {
    throw new InputError(problems.join('\n'));
  }
  return { cells, baseline, lines, fit, meta: first };
}

/** @returns {number} */
function selfTest() {
  /** @type {[string, string[]][]} */
  const boards = [['6x10', ['easy', 'normal', 'hard', 'expert', 'master']], ['10x10', ['easy', 'normal', 'hard', 'expert', 'master']],
    ['12x12', ['easy', 'normal', 'hard', 'expert', 'master']], ['18x20', ['hard', 'expert', 'master']]];
  /** @param {(s: { cells: Cell[], baseline: Record<string, BaselineCell>, lines: any[], fit: FitCurrent }) => void} [change] */
  const synthetic = (change = () => {}) => {
    /** @type {Cell[]} */
    const cells = [];
    /** @type {Record<string, BaselineCell>} */
    const baseline = {};
    /** @type {any[]} */
    const lines = [];
    /** @type {FitCurrent} */
    const fit = { cells: {} };
    for (const [board, levels] of boards) {
      for (const levelId of levels) {
        const caseId = `${board}-${levelId}`;
        cells.push({
          caseId, boardId: board, levelId, requestInBandRate: 1, recorded: 20, completeTen: 20, accepted: 200,
          v3: { accepted: 200, score: { median: level(levelId).min + 2 }, censored: { count: 0, share: 0 }, provedZero: 0 },
          sampledUnrateable: 0, sampledAttempted: 24,
        });
        baseline[caseId] = { requestInBandRate: 1, recorded: 20, completeTen: 20, accepted: 200 };
        lines.push({ request: `A-${caseId}-r0`, puzzleId: 'p1', deduction: { path: 'complete', search: { stop: 'done' } } });
        fit.cells[caseId] = { lines: 50, hits: 50, puzzleRescoreHitRate: 1 };
      }
    }
    const round = { cells, baseline, lines, fit };
    change(round);
    return round;
  };
  /** @param {string} caseId @param {{ cells: Cell[] }} round */
  const cellOf = (caseId, round) => /** @type {Cell} */ (round.cells.find((c) => c.caseId === caseId));
  /** @type {string[]} */
  const failures = [];
  const same = (/** @type {string} */ name, /** @type {unknown} */ got, /** @type {unknown} */ want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  };

  const one = evaluateRound(synthetic((s) => {
    cellOf('10x10-hard', s).sampledUnrateable = 1;
  }));
  same('1 C5', one.criteria.C5.status, 'pass');
  same('1 samples', one.cells.find((c) => c.caseId === '10x10-hard')?.samples, '1 of 24');
  same('1 statuses', Object.values(one.criteria).map((c) => c.status), ['pass', 'pass', 'pass', 'pass', 'pass']);
  same('1 branches', one.branches, ['final']);

  const two = evaluateRound(synthetic((s) => {
    s.lines[7] = { ...s.lines[7], deduction: { path: 'capped' } };
  }));
  same('2 C5', two.criteria.C5.status, 'fail');
  same('2 first branch', two.branches[0], 'caps');

  const three = evaluateRound(synthetic((s) => {
    const cell = cellOf('12x12-hard', s);
    cell.requestInBandRate = 0;
    cell.completeTen = 0;
    s.baseline['12x12-hard'].requestInBandRate = 0.9;
  }));
  same('3 C2', three.criteria.C2.status, 'fail');
  same('3 rescore', three.cells.find((c) => c.caseId === '12x12-hard')?.puzzleRescoreHitRate, 1);
  same('3 branches', three.branches, ['availability']);

  const four = evaluateRound(synthetic((s) => {
    cellOf('18x20-expert', s).v3 = null;
  }));
  same('4 C1', four.criteria.C1.status, 'unavailable');
  const gap = four.cells.find((c) => c.caseId === '18x20-expert');
  same('4 C3 and C4 of the cell', [gap?.c3, gap?.c4], ['unavailable', 'unavailable']);
  same('4 C3 and C4', [four.criteria.C3.status, four.criteria.C4.status], ['unavailable', 'unavailable']);
  same('4 branches', four.branches.includes('availability') && !four.branches.includes('final'), true);

  const five = evaluateRound(synthetic((s) => {
    const v3 = /** @type {V3Block} */ (cellOf('10x10-normal', s).v3);
    v3.censored = { count: 12, share: 0.06 };
  }));
  same('5 C4', five.criteria.C4.status, 'fail');
  same('5 branches', five.branches.includes('census') && !five.branches.includes('final'), true);

  for (const text of [renderMarkdown(one), renderMarkdown(three), renderMarkdown(four)]) {
    if (/[^\x20-\x7e\n]/.test(text)) {
      failures.push('the Markdown output is not ASCII');
    }
  }
  for (const failure of failures) {
    process.stderr.write(`self-test: ${failure}\n`);
  }
  process.stdout.write(failures.length === 0 ? 'criteria self-test: 5 of 5 synthetic rounds as expected\n'
    : `criteria self-test: ${failures.length} differences\n`);
  return failures.length === 0 ? 0 : 1;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  if (argv.length === 1 && argv[0] === '--self-test') {
    return selfTest();
  }
  /** @type {Record<string, string>} */
  const flags = {};
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i];
    if (!['--round', '--baseline', '--final', '--fit'].includes(name) || argv[i + 1] === undefined || name in flags) {
      process.stderr.write(`${USAGE}\n`);
      return 1;
    }
    flags[name] = argv[i + 1];
  }
  if (flags['--round'] === undefined || flags['--baseline'] === undefined || flags['--final'] === undefined) {
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }
  const { buildLandscapeMatrix } = await import('../../../tools/bench/calibration-reference.js');
  const gv2 = buildLandscapeMatrix({ seeds: 20 }).cases.map((c) => c.id)
    .filter((id) => /^(6x10|10x10|12x12|18x20)-(easy|normal|hard|expert|master)$/.test(id));
  try {
    const paths = {
      round: resolve(flags['--round']), baseline: resolve(flags['--baseline']), final: resolve(flags['--final']),
      fit: flags['--fit'] === undefined ? null : resolve(flags['--fit']),
    };
    const input = loadInputs(paths, gv2);
    const result = evaluateRound(input);
    const meta = input.meta;
    process.stdout.write(renderMarkdown(result, {
      lines: [
        `Round folder \`${flags['--round']}\`, baseline \`${flags['--baseline']}\`, final lines \`${flags['--final']}\`.`,
        `Source identity of the reports: sourceDigest \`${meta.sourceDigest}\`, versions \`${JSON.stringify(meta.versions)}\`.`,
      ],
    }));
    return 0;
  } catch (e) {
    process.stderr.write(`criteria: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}

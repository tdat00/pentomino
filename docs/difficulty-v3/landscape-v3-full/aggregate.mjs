// @ts-check
// MP12b1 aggregation of the full landscape (gate GL-P3, full part; cross-review TP08, TP27, TP31). It reads the 25 Hell
// prescreens of the full folder first, derives the protocol of every case of the landscape matrix from them (owner
// decision P-OD9: 20 requests for a case that is not Hell and for a Hell case whose prescreen accepted a puzzle, else
// the 3-request prescreen stays its evidence), takes exactly one validated report per case by name, aggregates their runs
// with the tools' `aggregateLandscape` over the full matrix and writes, once, `aggregate-<date>.json` and `.md` beside
// the reports (protocol coverage and three lists). It never changes a report and never overwrites an aggregate.
//   node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --full docs/difficulty-v3/landscape-v3-full
//     --slice docs/difficulty-v3/landscape-v3/r2 --date <YYYY-MM-DD>
//   node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --self-test
// Exit 0 when the aggregate was written (or the self-test passed); 2 when a case is missing or invalid (the coverage
// table is printed, nothing is written); 1 on an input error or a failed self-test.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { level } from '../../../core/engine/levels.js';
import {
  aggregateLandscape, buildLandscapeMatrix, renderLandscapeMarkdown,
} from '../../../tools/bench/calibration-reference.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FULL_REQUESTS = 20;
const PRESCREEN_REQUESTS = 3;
const WORKERS = 4;
const CENSUS_SHARE = 0.05;
const CENSUS_OWNER_SHARE = 0.25;
const EPS = 1e-9;
const REPORT_NAME = /^(.+)-(\d{4}-\d{2}-\d{2})\.json$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const USAGE = 'usage: aggregate.mjs --full <folder> --slice <folder> --date <YYYY-MM-DD>\n'
  + '       aggregate.mjs --self-test';

/**
 * @typedef {object} Io
 * @property {(dir: string) => string[]} files The file names of a folder, not those of its subfolders.
 * @property {(path: string) => any} readJson
 * @property {(path: string) => boolean} exists
 * @property {(path: string, text: string) => void} write Creates a new file; never overwrites one.
 */
/** @typedef {{ id: string, levelId: string, boardRows: string[] }} MatrixCase */
/** @typedef {'measured' | 'reduced (P-OD9)' | 'missing' | 'invalid'} Status */
/**
 * @typedef {object} Entry
 * @property {string} caseId
 * @property {string} levelId
 * @property {number} area Active cells of the board.
 * @property {boolean} hell
 * @property {number | null} requiredN Null when the protocol of a Hell case cannot be derived.
 * @property {Status} status
 * @property {string | null} report Repository-relative path of the selected report (of the failing one when invalid).
 * @property {number} reps Completed distinct reps of the case in the selected report.
 * @property {string[]} problems
 * @property {any[]} runs The rows of the case of the selected report (empty unless the entry is valid).
 * @property {{ accepted: number, reasons: Record<string, number> }} stats
 */
/**
 * @typedef {object} CellRow
 * @property {string} caseId
 * @property {string} board
 * @property {number} area
 * @property {string} level
 * @property {number | null} requiredN
 * @property {Status} status
 * @property {number} requests Recorded requests of the selected report.
 * @property {number} accepted Accepted puzzles over those requests.
 * @property {number | null} requestCompletionRate Requests that completed ten in-band puzzles over the recorded ones.
 * @property {number | null} yield Accepted puzzles over ten per request.
 * @property {any} v3 The cell's v3 block, null without an accepted v3 puzzle.
 * @property {Record<string, number>} reasons Requests by `partialReason`.
 */

/** @param {string} p */
const norm = (p) => p.split('\\').join('/').replace(/\/+$/, '');

/** @param {unknown} v @returns {v is number} */
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** @param {number | null | undefined} v @param {number} [digits] */
const num = (v, digits = 2) => (isNumber(v) ? String(Math.round(v * 10 ** digits) / 10 ** digits) : 'n/a');

/** @param {number | null | undefined} v */
const pct = (v) => (isNumber(v) ? `${(v * 100).toFixed(1)} %` : 'n/a');

/** @param {string} text */
const crlf = (text) => text.replace(/\r?\n/g, '\r\n');

/** @param {MatrixCase} c */
const areaOf = (c) => c.boardRows.join('').replace(/\./g, '').length;

/**
 * `<case>-YYYY-MM-DD.json` is a 20-request report, `<case>-s3-YYYY-MM-DD.json` a prescreen of 3 requests.
 * @param {string} name
 * @returns {{ caseId: string, date: string, prescreen: boolean } | null}
 */
export function parseReportName(name) {
  const m = REPORT_NAME.exec(name);
  if (m === null) {
    return null;
  }
  const prescreen = m[1].endsWith('-s3');
  return { caseId: prescreen ? m[1].slice(0, -3) : m[1], date: m[2], prescreen };
}

/**
 * The report names of one folder (the folder itself, never its subfolders) by case.
 * @param {string} folder
 * @param {Io} io
 * @returns {Map<string, { full: string[], prescreen: string[] }>}
 */
function indexFolder(folder, io) {
  /** @type {Map<string, { full: string[], prescreen: string[] }>} */
  const map = new Map();
  for (const name of io.files(folder)) {
    const parsed = parseReportName(name);
    if (parsed === null) {
      continue;
    }
    const item = map.get(parsed.caseId) ?? { full: [], prescreen: [] };
    (parsed.prescreen ? item.prescreen : item.full).push(name);
    map.set(parsed.caseId, item);
  }
  return map;
}

/** @param {any} meta The identity of a report: digest and the version keys, sorted. */
const identityOf = (meta) => JSON.stringify({
  sourceDigest: meta?.sourceDigest ?? null,
  versions: Object.fromEntries(Object.entries(meta?.versions ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))),
});

/**
 * Validates a report for a case that needs `n` requests (TP27, TP31); the problems found, none when valid.
 * @param {any} report
 * @param {string} caseId
 * @param {number} n
 * @returns {string[]}
 */
export function validateReport(report, caseId, n) {
  if (report === null || typeof report !== 'object') {
    return ['the report is not an object'];
  }
  /** @type {string[]} */
  const problems = [];
  const meta = report.meta ?? {};
  if (report.complete !== true) {
    problems.push('the report is not complete');
  }
  if (typeof meta.sourceDigest !== 'string' || typeof meta.versions !== 'object' || meta.versions === null) {
    problems.push('the report has no source identity');
  }
  if (meta.profile !== 'landscape' || meta.workerCount !== WORKERS
    || !Array.isArray(meta.notes) || !meta.notes.includes('fresh process per row')) {
    problems.push('the report did not run with --profile landscape --workers 4 --fresh-process');
  }
  const runs = Array.isArray(report.runs) ? report.runs : [];
  if (meta.expectedRuns !== n) {
    problems.push(`the report expected ${meta.expectedRuns} rows, not ${n}`);
  }
  if (report.runCount !== runs.length) {
    problems.push(`the report says ${report.runCount} rows and holds ${runs.length}`);
  }
  const mine = runs.filter((/** @type {any} */ r) => r.probeKind === 'generation' && r.caseId === caseId);
  if (mine.length !== runs.length) {
    problems.push(`the report holds ${runs.length - mine.length} rows that are not generation rows of ${caseId}`);
  }
  if (mine.some((/** @type {any} */ r) => r.interrupted === true)) {
    problems.push('a row is interrupted');
  }
  const got = mine.map((/** @type {any} */ r) => r.rep).sort((/** @type {number} */ a, /** @type {number} */ b) => a - b);
  if (got.join(',') !== Array.from({ length: n }, (_, i) => i).join(',')) {
    problems.push(`the rows of ${caseId} are the reps ${got.length > 8 ? `${got.slice(0, 8).join(',')},...` : got.join(',')}`
      + ` (${got.length} rows), not exactly 0 to ${n - 1}`);
  }
  return problems;
}

/** @param {any[]} rows @returns {{ accepted: number, reasons: Record<string, number> }} */
function statsOf(rows) {
  /** @type {Record<string, number>} */
  const reasons = {};
  let accepted = 0;
  for (const r of rows) {
    accepted += isNumber(r.acceptedCount) ? r.acceptedCount : 0;
    const key = String(r.partialReason ?? 'none');
    reasons[key] = (reasons[key] ?? 0) + 1;
  }
  return { accepted, reasons };
}

/**
 * Steps 1 to 4: the prescreens first, the protocol of every case, one validated report per case.
 * @param {{ cases: MatrixCase[], io: Io, full: string, slice: string }} input
 */
export function selectReports({ cases, io, full, slice }) {
  const inFull = indexFolder(full, io);
  const inSlice = indexFolder(slice, io);
  const known = new Set(cases.map((c) => c.id));
  const strays = [...inFull.keys()].filter((id) => !known.has(id) && id !== 'aggregate').sort();
  /** @type {Map<string, { path: string, identity: string, commit: string }>} */
  const readOnes = new Map();
  /** @type {Map<string, string[]>} */
  const readBy = new Map();
  /**
   * @param {string} folder @param {string} name @param {string} caseId @param {number} n
   * @returns {{ path: string, report: any, problems: string[] }}
   */
  const read = (folder, name, caseId, n) => {
    const path = `${folder}/${name}`;
    /** @type {any} */
    let report = null;
    try {
      report = io.readJson(path);
    } catch (e) {
      return { path, report: null, problems: [`the report cannot be read: ${e instanceof Error ? e.message : String(e)}`] };
    }
    if (report !== null && typeof report === 'object') {
      readOnes.set(path, { path, identity: identityOf(report.meta), commit: String(report.meta?.sourceCommit ?? 'unknown') });
      readBy.set(caseId, [...(readBy.get(caseId) ?? []), path]);
    }
    return { path, report, problems: validateReport(report, caseId, n) };
  };

  /** @type {Entry[]} */
  const entries = cases.map((c) => ({
    caseId: c.id,
    levelId: c.levelId,
    area: areaOf(c),
    hell: c.levelId.startsWith('hell-'),
    requiredN: null,
    status: /** @type {Status} */ ('missing'),
    report: null,
    reps: 0,
    problems: [],
    runs: [],
    stats: { accepted: 0, reasons: {} },
  }));
  /** @type {Map<string, any[]>} */
  const prescreenRows = new Map();

  // 1. The prescreens first: the protocol input.
  for (const e of entries.filter((x) => x.hell)) {
    const names = inFull.get(e.caseId)?.prescreen ?? [];
    if (names.length === 0) {
      e.problems.push('no prescreen: the protocol of the case cannot be derived');
    } else if (names.length > 1) {
      e.status = 'invalid';
      e.problems.push(`${names.length} prescreens match ${e.caseId}-s3-YYYY-MM-DD.json, not exactly one`);
    } else {
      const got = read(full, names[0], e.caseId, PRESCREEN_REQUESTS);
      e.report = got.path;
      if (got.problems.length > 0) {
        e.status = 'invalid';
        e.problems.push(...got.problems.map((p) => `prescreen: ${p}`));
      } else {
        prescreenRows.set(e.caseId, got.report.runs);
      }
    }
  }

  // 2. The protocol (P-OD9), from the prescreens only.
  for (const e of entries) {
    if (!e.hell) {
      e.requiredN = FULL_REQUESTS;
    } else if (prescreenRows.has(e.caseId)) {
      const accepted = statsOf(/** @type {any[]} */ (prescreenRows.get(e.caseId))).accepted;
      e.requiredN = accepted > 0 ? FULL_REQUESTS : PRESCREEN_REQUESTS;
    }
  }

  // 3 and 4. One validated report per case.
  for (const e of entries) {
    if (e.requiredN === null) {
      continue;
    }
    if (e.requiredN === PRESCREEN_REQUESTS) {
      const outside = inFull.get(e.caseId)?.full ?? [];
      if (outside.length > 0) {
        e.status = 'invalid';
        e.report = `${full}/${outside[0]}`;
        e.problems.push('a 20-request report exists for a case whose protocol is 3 requests (a run outside the P-OD9 plan)');
        continue;
      }
      e.status = 'reduced (P-OD9)';
      e.runs = prescreenRows.get(e.caseId) ?? [];
    } else {
      e.report = null;
      const inFullFolder = inFull.get(e.caseId)?.full ?? [];
      const inSliceFolder = inSlice.get(e.caseId)?.full ?? [];
      const [folder, names] = inFullFolder.length > 0 ? [full, inFullFolder] : [slice, inSliceFolder];
      if (names.length === 0) {
        e.status = 'missing';
        e.problems.push(`no ${e.caseId}-YYYY-MM-DD.json in the full folder or the slice folder`);
        continue;
      }
      if (names.length > 1) {
        e.status = 'invalid';
        e.problems.push(`${names.length} reports match ${e.caseId}-YYYY-MM-DD.json in ${folder}, not exactly one`);
        continue;
      }
      const got = read(folder, names[0], e.caseId, FULL_REQUESTS);
      e.report = got.path;
      if (got.problems.length > 0) {
        e.status = 'invalid';
        e.problems.push(...got.problems);
        continue;
      }
      e.status = 'measured';
      e.runs = got.report.runs;
    }
  }

  // The source identity is shared by every report read, the prescreens and the reused slice reports included.
  /** @type {Map<string, number>} */
  const votes = new Map();
  for (const one of readOnes.values()) {
    votes.set(one.identity, (votes.get(one.identity) ?? 0) + 1);
  }
  const shared = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  for (const e of entries) {
    const odd = (readBy.get(e.caseId) ?? []).filter((p) => readOnes.get(p)?.identity !== shared);
    if (odd.length > 0) {
      e.status = 'invalid';
      e.runs = [];
      e.problems.push(...odd.map((p) => `${p} has another source digest or versions than the other reports`));
    }
  }
  for (const e of entries) {
    if (e.status === 'measured' || e.status === 'reduced (P-OD9)') {
      e.runs = e.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation' && r.caseId === e.caseId);
      e.reps = new Set(e.runs.filter((/** @type {any} */ r) => r.interrupted !== true).map((/** @type {any} */ r) => r.rep)).size;
      e.stats = statsOf(e.runs);
    }
  }
  /** @type {Map<string, number>} */
  const commits = new Map();
  for (const e of entries) {
    if (e.status === 'measured' || e.status === 'reduced (P-OD9)') {
      for (const p of readBy.get(e.caseId) ?? []) {
        if (p === e.report) {
          const commit = readOnes.get(p)?.commit ?? 'unknown';
          commits.set(commit, (commits.get(commit) ?? 0) + 1);
        }
      }
    }
  }
  return { entries, shared: shared === null ? null : JSON.parse(shared), commits, strays };
}

/**
 * One row per cell with the numbers the lists print.
 * @param {any[]} cells The cells of `aggregateLandscape`.
 * @param {Entry[]} entries
 * @returns {CellRow[]}
 */
export function cellRows(cells, entries) {
  const byCase = new Map(entries.map((e) => [e.caseId, e]));
  return cells.map((cell) => {
    const e = byCase.get(cell.caseId);
    const accepted = e?.stats.accepted ?? 0;
    const requests = cell.runs?.recorded ?? 0;
    return {
      caseId: cell.caseId,
      board: cell.boardId,
      area: cell.area,
      level: cell.levelId,
      requiredN: e?.requiredN ?? null,
      status: e?.status ?? 'missing',
      requests,
      accepted,
      requestCompletionRate: isNumber(cell.requestInBandRate) ? cell.requestInBandRate : null,
      yield: requests > 0 ? accepted / (requests * 10) : null,
      v3: cell.v3 ?? null,
      reasons: e?.stats.reasons ?? {},
    };
  });
}

/**
 * List 1: no selected request of the case accepted a puzzle. Never "cannot be made".
 * @param {CellRow[]} rows
 */
export function listNoPuzzle(rows) {
  return rows.filter((r) => r.requests > 0 && r.accepted === 0).map((r) => ({
    ...r,
    observation: `no puzzle observed in ${r.requiredN ?? r.requests} requests`,
    reduced: r.status === 'reduced (P-OD9)',
  }));
}

/**
 * List 2: every accepted score lies on one side of the central half of the band.
 * @param {CellRow[]} rows
 */
export function listOneSided(rows) {
  const out = [];
  for (const r of rows) {
    const score = r.v3?.score;
    if (r.v3 === null || r.v3 === undefined || !score || !(score.n > 0) || !isNumber(score.min) || !isNumber(score.max)) {
      continue;
    }
    const band = level(r.level);
    if (!isNumber(band.min) || !isNumber(band.max)) {
      continue;
    }
    const c = (band.min + band.max) / 2;
    const h = (band.max - band.min) / 4;
    if (score.max < c - h || score.min > c + h) {
      out.push({ ...r, band: [band.min, band.max], central: [c - h, c + h], side: score.max < c - h ? 'below' : 'above' });
    }
  }
  return out;
}

/**
 * List 3: more than 5 % of the accepted puzzles carry a census estimate; above 25 % goes to the owner.
 * @param {CellRow[]} rows
 */
export function listCensus(rows) {
  const out = [];
  for (const r of rows) {
    const share = r.v3?.censored?.share;
    if (r.v3 === null || r.v3 === undefined || !isNumber(share) || !(share > CENSUS_SHARE + EPS)) {
      continue;
    }
    out.push({ ...r, share, count: r.v3.censored.count, above25: share > CENSUS_OWNER_SHARE + EPS });
  }
  return out;
}

/** @param {any} v3 */
const scoreText = (v3) => (v3 && v3.score && v3.score.n > 0
  ? `${num(v3.score.min)} / ${num(v3.score.median)} / ${num(v3.score.p95)} / ${num(v3.score.max)}` : 'unavailable');

/** @param {string[]} head @param {string[][]} body */
const table = (head, body) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`,
  ...body.map((cells) => `| ${cells.join(' | ')} |`)];

/** @param {CellRow} r @returns {string[]} */
const commonCells = (r) => [r.board, String(r.area), r.level, String(r.requests), String(r.accepted),
  pct(r.requestCompletionRate), pct(r.yield), scoreText(r.v3)];
const COMMON_HEAD = ['Board', 'Area', 'Level', 'Requests', 'Accepted puzzles', 'Request completion rate', 'Yield',
  'v3 score min / median / p95 / max'];

/** @param {Record<string, number>} reasons */
const reasonText = (reasons) => Object.entries(reasons).sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([k, n]) => `${k} x${n}`).join(', ');

/**
 * The aggregate's Markdown: the tools' rendering, the protocol coverage and the three lists (LF line ends).
 * @param {{ agg: any, meta: any, coverage: any[], lists: { noPuzzle: any[], oneSided: any[], census: any[] } }} input
 */
function renderAggregate({ agg, meta, coverage, lists }) {
  const L = [renderLandscapeMarkdown(agg, meta).replace(/\n$/, ''), ''];
  const reduced = coverage.filter((c) => c.status === 'reduced (P-OD9)').length;
  L.push('## Protocol coverage (owner decision P-OD9)', '',
    `Every case of the landscape matrix with the protocol derived from the Hell prescreens: ${FULL_REQUESTS} requests for a `
    + `case that is not Hell and for a Hell case whose prescreen accepted a puzzle (status \`measured\`), else its `
    + `${PRESCREEN_REQUESTS}-request prescreen stays its evidence (status \`reduced (P-OD9)\`: ${reduced} cases, `
    + 'labelled "reduced (P-OD9): no puzzle observed in 3 requests", not offered). "Runs recorded / requested" are the '
    + 'tools\' own counts of the aggregate, which keeps the 20-request criteria of every cell: they stay 3 / 20 for a '
    + 'reduced case, so the tools count it as an unfinished cell (the "selected cells complete" line above) and their '
    + 'criterion 1, their Blockers list and their Outcome line judge its 3 requests against the 20-request sample. Read '
    + 'that outcome as the tools\' verdict on the criteria of the earlier calibration (the request completion rate of '
    + 'every cell and the reference-row timing bounds), and the findings of this task in the three lists below. "Reps" is '
    + 'the number of completed distinct requests of the case in the selected report. The reports of the 18 GV2 cases come '
    + 'from the slice folder.', '',
    ...table(['Case', 'Active cells', 'Required N', 'Reps', 'Report', 'Status', 'Runs recorded / requested'],
      coverage.map((c) => [c.caseId, String(c.area), c.requiredN === null ? 'n/a' : String(c.requiredN), String(c.reps),
        c.report === null ? 'none' : `\`${c.report}\``, c.status, `${c.recorded ?? 'n/a'} / ${c.requested ?? 'n/a'}`])));
  L.push('', '## Lists', '',
    'Measures of MP12a: "Request completion rate" is the share of the recorded requests that completed ten in-band '
    + 'puzzles and "Yield" the accepted puzzles over ten per recorded request. A missing value is `n/a` or `unavailable`.');
  L.push('', `### 1. Cells without a puzzle (${lists.noPuzzle.length})`, '',
    'No selected request of the case accepted a puzzle. This says what was observed, never that the cell cannot be made. '
    + 'It is the input of the Hell availability record of MP12b2.', '');
  L.push(...table([...COMMON_HEAD, 'Observation', 'Failure reasons (requests)'],
    lists.noPuzzle.map((r) => [...commonCells(r), r.reduced ? `${r.observation}; reduced (P-OD9)` : r.observation,
      reasonText(r.reasons) || 'n/a'])));
  L.push('', `### 2. Cells whose scores never reach the central half of their band (${lists.oneSided.length})`, '',
    'A finite band, at least one accepted v3 score, and every accepted score on one side of the central half of the '
    + 'band [min + (max - min) / 4, max - (max - min) / 4].', '');
  L.push(...table([...COMMON_HEAD, 'Band [min, max)', 'Central half', 'Scores lie'],
    lists.oneSided.map((r) => [...commonCells(r), `[${num(r.band[0])}, ${num(r.band[1])})`,
      `[${num(r.central[0])}, ${num(r.central[1])}]`, r.side])));
  L.push('', `### 3. Cells with too many census estimates (${lists.census.length})`, '',
    'More than 5 % of the accepted puzzles carry a census estimate (`censored`); a share above 25 % is marked '
    + '"above 25 %" (MP12b2 puts that cell to the owner).', '');
  L.push(...table([...COMMON_HEAD, 'Census estimates', 'Share'],
    lists.census.map((r) => [...commonCells(r), `${r.count} of ${r.accepted}`, `${pct(r.share)}${r.above25 ? ' (above 25 %)' : ''}`])));
  return `${L.join('\n')}\n`;
}

/** @param {Entry[]} entries @returns {string} */
function coverageText(entries) {
  return entries.map((e) => `${e.caseId.padEnd(20)} area ${String(e.area).padStart(3)}  N ${String(e.requiredN ?? '?').padStart(2)}`
    + `  reps ${String(e.reps).padStart(2)}  ${e.status.padEnd(15)} ${e.report ?? ''}`).join('\n');
}

/**
 * Steps 1 to 6 on an `Io`: the coverage and the files to write, or the gaps.
 * @param {{ matrix: { cases: any[] }, io: Io, full: string, slice: string, date: string }} input
 * @returns {{ exit: number, text: string, files: { path: string, text: string }[] | null, result?: any, entries?: Entry[] }}
 */
export function execute({ matrix, io, full, slice, date }) {
  const jsonPath = `${full}/aggregate-${date}.json`;
  const mdPath = `${full}/aggregate-${date}.md`;
  if (io.exists(jsonPath) || io.exists(mdPath)) {
    return { exit: 1, text: `an aggregate of ${date} exists: a record is never overwritten`, files: null };
  }
  const { entries, shared, commits, strays } = selectReports({ cases: matrix.cases, io, full, slice });
  const gaps = entries.filter((e) => e.status === 'missing' || e.status === 'invalid');
  const lines = [coverageText(entries)];
  if (strays.length > 0) {
    lines.push(`not matrix cases, ignored: ${strays.join(', ')}`);
  }
  if (gaps.length > 0) {
    for (const e of gaps) {
      lines.push(`${e.status.toUpperCase()} ${e.caseId}: ${e.problems.join('; ')}`);
    }
    lines.push(`${gaps.length} cases are missing or invalid: nothing written`);
    return { exit: 2, text: lines.join('\n'), files: null, entries };
  }
  const runs = entries.flatMap((e) => e.runs);
  const agg = aggregateLandscape(runs, matrix);
  const cells = new Map(agg.cells.map((/** @type {any} */ c) => [c.caseId, c]));
  const coverage = entries.map((e) => ({
    caseId: e.caseId,
    area: e.area,
    requiredN: e.requiredN,
    reps: e.reps,
    report: e.report,
    status: e.status,
    recorded: cells.get(e.caseId)?.runs.recorded ?? null,
    requested: cells.get(e.caseId)?.runs.requested ?? null,
  }));
  const rows = cellRows(agg.cells, entries);
  const lists = { noPuzzle: listNoPuzzle(rows), oneSided: listOneSided(rows), census: listCensus(rows) };
  const source = { sourceDigest: shared?.sourceDigest ?? null, versions: shared?.versions ?? null };
  const meta = {
    date,
    sourceCommit: [...commits.entries()].map(([c, n]) => `${c} (${n} reports)`).join('; '),
    sourceDigest: String(source.sourceDigest),
    seeds: FULL_REQUESTS,
    workers: WORKERS,
  };
  const result = { aggregate: agg, coverage, lists, source };
  lines.push(`lists: ${lists.noPuzzle.length} without a puzzle, ${lists.oneSided.length} one-sided, ${lists.census.length} with `
    + `census estimates above 5 % (${lists.census.filter((r) => r.above25).length} above 25 %)`);
  return {
    exit: 0,
    text: lines.join('\n'),
    files: [{ path: jsonPath, text: crlf(`${JSON.stringify(result, null, 2)}\n`) },
      { path: mdPath, text: crlf(renderAggregate({ agg, meta, coverage, lists })) }],
    result,
    entries,
  };
}

/** @returns {Io} */
function realIo() {
  return {
    files: (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort(),
    readJson: (path) => {
      const text = readFileSync(path, 'utf8');
      return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    },
    exists: (path) => existsSync(path),
    write: (path, text) => writeFileSync(path, text, { flag: 'wx' }),
  };
}

/**
 * @param {string} arg
 * @returns {string} The repository-relative folder with forward slashes.
 */
function repoFolder(arg) {
  const rel = norm(relative(ROOT, resolve(arg)));
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`${arg} is not a folder of the repository`);
  }
  return rel;
}

/** @returns {number} */
function selfTest() {
  /** @type {string[]} */
  const failures = [];
  let checks = 0;
  /** @param {string} name @param {boolean} ok @param {string} [detail] */
  const check = (name, ok, detail = '') => {
    checks += 1;
    if (!ok) {
      failures.push(`${name}${detail === '' ? '' : `: ${detail}`}`);
    }
  };
  const all = buildLandscapeMatrix({ seeds: FULL_REQUESTS });
  const levelOf = (/** @type {string} */ id) => /** @type {string} */ (all.cases.find((c) => c.id === id)?.levelId);
  const pick = (/** @type {string[]} */ ids) => ({ ...all, cases: all.cases.filter((c) => ids.includes(c.id)) });
  const SOURCE = { sourceDigest: 'digest-1', versions: { algo: 'a', policy: 'p', rng: 'r', model: 'm', app: '1' } };
  const FULL = 'full';
  const SLICE = 'slice';
  const DAY = '2026-11-14';

  /**
   * A synthetic report of one case; `accepted(rep)` accepted puzzles per request, `censored(rep)` of them censored.
   * @param {string} caseId @param {number} n
   * @param {{ accepted?: (rep: number) => number, censored?: (rep: number) => number, score?: number, complete?: boolean,
   *   reps?: number[], src?: any, interrupted?: boolean, reason?: string | null }} [o]
   */
  const report = (caseId, n, o = {}) => {
    const accepted = o.accepted ?? (() => 10);
    const censored = o.censored ?? (() => 0);
    const score = o.score ?? 10;
    const runs = (o.reps ?? Array.from({ length: n }, (_, i) => i)).map((rep) => {
      const a = accepted(rep);
      const c = censored(rep);
      return {
        probeKind: 'generation', caseId, rep, interrupted: o.interrupted === true && rep === 0,
        acceptedCount: a, tenthReadyMs: a >= 10 ? 1000 : null, responseMs: 2000,
        partialReason: a >= 10 ? null : (o.reason ?? 'time-limit'),
        ratingSaturatedCount: 0, ratingCensoredCount: c, certificates: { unique: 0, multiple: 0, notProved: 0, notChecked: a },
        samples: [],
        details: a === 0 ? null : {
          K: 8, sizes: [5, 5, 5, 5, 5, 5, 5, 5], initialG: 3, sampleUnrateable: 0, policy: { violations: [] },
          puzzles: Array.from({ length: a }, (_, i) => ({
            clues: 3, U: 1, score, level: levelOf(caseId), censored: i < c,
            metrics: { G: 2, info: 1.5, Cmax: 2, deductionTier: 1, solutions: 1, Gproved: 1 },
          })),
        },
      };
    });
    return {
      complete: o.complete !== false,
      runCount: runs.length,
      meta: {
        profile: 'landscape', workerCount: WORKERS, notes: ['fresh process per row'], expectedRuns: n, sourceCommit: 'c0ffee',
        ...(o.src ?? SOURCE),
      },
      runs,
    };
  };
  /** @param {Record<string, any>} files */
  const memory = (files) => {
    const data = new Map(Object.entries(files));
    /** @type {Io} */
    const io = {
      files: (dir) => [...data.keys()].filter((p) => p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes('/'))
        .map((p) => p.slice(dir.length + 1)).sort(),
      readJson: (p) => {
        if (!data.has(p)) {
          throw new Error(`ENOENT ${p}`);
        }
        return structuredClone(data.get(p));
      },
      exists: (p) => data.has(p),
      write: (p, text) => {
        if (data.has(p)) {
          throw new Error(`EEXIST ${p}`);
        }
        data.set(p, text);
      },
    };
    return { data, io };
  };
  const mid = (/** @type {string} */ id) => {
    const band = level(levelOf(id));
    return (band.min + band.max) / 2;
  };
  const GV2 = '6x10-easy';
  const PLAIN = '10x10-easy';
  const HELL_A = '14x14-hell-1';
  const HELL_B = '15x15b10-hell-1';
  const HELL_C = '16x16-hell-1';
  const ids = [GV2, PLAIN, HELL_A, HELL_B, HELL_C];
  /** A valid landscape: HELL_A made a puzzle in its prescreen, HELL_B and HELL_C did not. */
  const base = () => ({
    [`${SLICE}/${GV2}-2026-11-13.json`]: report(GV2, 20, { score: mid(GV2) }),
    [`${FULL}/${PLAIN}-2026-11-14.json`]: report(PLAIN, 20, { score: mid(PLAIN) }),
    [`${FULL}/${HELL_A}-s3-2026-11-14.json`]: report(HELL_A, 3, { accepted: (rep) => (rep === 1 ? 10 : 0), score: mid(HELL_A) }),
    [`${FULL}/${HELL_A}-2026-11-14.json`]: report(HELL_A, 20, { score: mid(HELL_A) }),
    [`${FULL}/${HELL_B}-s3-2026-11-14.json`]: report(HELL_B, 3, { accepted: () => 0 }),
    [`${FULL}/${HELL_C}-s3-2026-11-14.json`]: report(HELL_C, 3, { accepted: () => 0, reason: 'no-set' }),
  });
  /** @param {Record<string, any>} files @param {string[]} [which] */
  const run = (files, which = ids) => {
    const m = memory(files);
    return { m, out: execute({ matrix: pick(which), io: m.io, full: FULL, slice: SLICE, date: '2026-11-15' }) };
  };
  /** @param {ReturnType<typeof run>} r @param {string} id */
  const entry = (r, id) => r.out.entries?.find((e) => e.caseId === id);
  const noWrite = (/** @type {ReturnType<typeof run>} */ r) => r.out.exit === 2 && r.out.files === null
    && ![...r.m.data.keys()].some((p) => p.includes('aggregate-'));

  const ok = run(base());
  check('base: exit 0 with the two files', ok.out.exit === 0 && ok.out.files?.length === 2, ok.out.text);
  check('base: statuses', entry(ok, GV2)?.status === 'measured' && entry(ok, PLAIN)?.status === 'measured'
    && entry(ok, HELL_A)?.status === 'measured' && entry(ok, HELL_B)?.status === 'reduced (P-OD9)', JSON.stringify(ok.out.entries?.map((e) => e.status)));
  check('base: CRLF only, no BOM', ok.out.files?.every((f) => !/[^\r]\n/.test(f.text) && f.text.charCodeAt(0) !== 0xfeff) === true);

  // (a) a valid reduced zero-puzzle Hell cell
  const a = entry(ok, HELL_B);
  const aCover = ok.out.result?.coverage.find((/** @type {any} */ c) => c.caseId === HELL_B);
  const aList = ok.out.result?.lists.noPuzzle.find((/** @type {any} */ r) => r.caseId === HELL_B);
  check('(a) reduced, N 3, reps 3', a?.status === 'reduced (P-OD9)' && a.requiredN === 3 && a.reps === 3);
  check('(a) in list 1 as "no puzzle observed in 3 requests"', aList?.observation === 'no puzzle observed in 3 requests'
    && aList.reduced === true, JSON.stringify(aList));
  check('(a) the aggregator shows 3 / 20', aCover?.recorded === 3 && aCover.requested === 20, JSON.stringify(aCover));
  const md = ok.out.files?.find((f) => f.path.endsWith('.md'))?.text ?? '';
  check('(a) Markdown carries the observation, the reduced label and 3 / 20',
    md.includes('no puzzle observed in 3 requests; reduced (P-OD9)') && md.includes('| 3 / 20 |'));

  // (b) a complete positive cell; lists 2 and 3 evaluated on its v3
  const bList = ok.out.result?.lists;
  check('(b) measured and not in list 1', entry(ok, PLAIN)?.status === 'measured' && entry(ok, PLAIN)?.reps === 20
    && !bList.noPuzzle.some((/** @type {any} */ r) => r.caseId === PLAIN));
  check('(b) central scores: not in lists 2 and 3', !bList.oneSided.some((/** @type {any} */ r) => r.caseId === PLAIN)
    && !bList.census.some((/** @type {any} */ r) => r.caseId === PLAIN));
  const low = base();
  low[`${FULL}/${PLAIN}-2026-11-14.json`] = report(PLAIN, 20, { score: level(levelOf(PLAIN)).min });
  const lowRun = run(low);
  const lowList = lowRun.out.result?.lists.oneSided.find((/** @type {any} */ r) => r.caseId === PLAIN);
  check('(b) a score below the central half: in list 2 with its side', lowList?.side === 'below', JSON.stringify(lowList));

  // (c) a missing cell, and an unfinished one
  const gone = base();
  delete gone[`${FULL}/${PLAIN}-2026-11-14.json`];
  const goneRun = run(gone);
  check('(c) missing: status, exit 2, nothing written', entry(goneRun, PLAIN)?.status === 'missing' && noWrite(goneRun), goneRun.out.text);
  const open = base();
  open[`${FULL}/${PLAIN}-2026-11-14.json`] = report(PLAIN, 20, { complete: false });
  const openRun = run(open);
  check('(c) unfinished: invalid, exit 2, nothing written', entry(openRun, PLAIN)?.status === 'invalid' && noWrite(openRun));

  // (d) a cell with v3 null given to lists 2 and 3
  /** @type {CellRow} */
  const nullCell = {
    caseId: HELL_B, board: '15x15b10', area: 215, level: 'hell-1', requiredN: 3, status: 'reduced (P-OD9)', requests: 3, accepted: 0,
    requestCompletionRate: 0, yield: 0, v3: null, reasons: {},
  };
  /** @type {any} */
  let thrown = null;
  /** @type {any[]} */
  let dTwo = [];
  /** @type {any[]} */
  let dThree = [];
  try {
    dTwo = listOneSided([nullCell, { ...nullCell, v3: { score: { n: 0, min: null, max: null } } }]);
    dThree = listCensus([nullCell, { ...nullCell, v3: { censored: {} } }]);
  } catch (e) {
    thrown = e;
  }
  check('(d) v3 null: not listed, no exception', thrown === null && dTwo.length === 0 && dThree.length === 0, String(thrown));

  // (e) a Hell case whose prescreen made a puzzle but which has no 20-request report
  const noFull = base();
  delete noFull[`${FULL}/${HELL_A}-2026-11-14.json`];
  const noFullRun = run(noFull);
  check('(e) missing (needs 20)', entry(noFullRun, HELL_A)?.status === 'missing' && entry(noFullRun, HELL_A)?.requiredN === 20
    && noWrite(noFullRun));

  // (f) the Hell cases of one level, no prescreen accepted a puzzle: all require 3, the smallest included
  const none = base();
  none[`${FULL}/${HELL_A}-s3-2026-11-14.json`] = report(HELL_A, 3, { accepted: () => 0 });
  delete none[`${FULL}/${HELL_A}-2026-11-14.json`];
  const noneRun = run(none);
  check('(f) every Hell 1 case requires 3, the smallest included',
    [HELL_A, HELL_B, HELL_C].every((id) => entry(noneRun, id)?.requiredN === 3 && entry(noneRun, id)?.status === 'reduced (P-OD9)')
    && noneRun.out.exit === 0, noneRun.out.text);

  // (g) a Hell case without a puzzle in its prescreen that also has a 20-request report
  const outside = base();
  outside[`${FULL}/${HELL_B}-2026-11-14.json`] = report(HELL_B, 20, { accepted: () => 0 });
  const outsideRun = run(outside);
  check('(g) a run outside the plan: invalid, exit 2, nothing written', entry(outsideRun, HELL_B)?.status === 'invalid'
    && noWrite(outsideRun), outsideRun.out.text);

  // (h) a prescreen that made a puzzle is read for the protocol only; its 20 runs are counted once
  const hCover = ok.out.result?.coverage.find((/** @type {any} */ c) => c.caseId === HELL_A);
  check('(h) the 20 runs once (recorded 20, not 23)', entry(ok, HELL_A)?.runs.length === 20 && hCover?.recorded === 20
    && hCover.reps === 20 && hCover.report === `${FULL}/${HELL_A}-2026-11-14.json`, JSON.stringify(hCover));

  // (i) a Hell case without a prescreen
  const noPre = base();
  delete noPre[`${FULL}/${HELL_C}-s3-2026-11-14.json`];
  const noPreRun = run(noPre);
  check('(i) missing, protocol not derivable, exit 2, nothing written', entry(noPreRun, HELL_C)?.status === 'missing'
    && entry(noPreRun, HELL_C)?.requiredN === null && noWrite(noPreRun));

  // (j) a census cell with a share of 0.30; 0.10 and exactly 0.05 on the way
  const census = base();
  census[`${SLICE}/${GV2}-2026-11-13.json`] = report(GV2, 20, { score: mid(GV2), censored: (rep) => (rep < 6 ? 10 : 0) });
  census[`${FULL}/${PLAIN}-2026-11-14.json`] = report(PLAIN, 20, { score: mid(PLAIN), censored: (rep) => (rep < 2 ? 10 : 0) });
  census[`${FULL}/${HELL_A}-2026-11-14.json`] = report(HELL_A, 20, { score: mid(HELL_A), censored: (rep) => (rep < 1 ? 10 : 0) });
  const censusRun = run(census);
  const cen = censusRun.out.result?.lists.census ?? [];
  const share = (/** @type {string} */ id) => cen.find((/** @type {any} */ r) => r.caseId === id);
  check('(j) 0.30 listed and marked above 25 %', share(GV2)?.above25 === true && Math.abs(share(GV2).share - 0.3) < 1e-9,
    JSON.stringify(share(GV2)));
  check('(j) 0.10 listed, not above 25 %', share(PLAIN)?.above25 === false);
  check('(j) exactly 0.05 not listed', share(HELL_A) === undefined);
  check('(j) Markdown marks above 25 %', (censusRun.out.files?.find((f) => f.path.endsWith('.md'))?.text ?? '').includes('(above 25 %)'));

  // more rules of the validation
  const twin = base();
  twin[`${FULL}/${PLAIN}-2026-11-15.json`] = report(PLAIN, 20);
  check('two reports match one pattern: invalid', entry(run(twin), PLAIN)?.status === 'invalid');
  const prefer = base();
  prefer[`${FULL}/${GV2}-2026-11-14.json`] = report(GV2, 20, { score: mid(GV2) });
  check('a report of the full folder wins over the slice report', entry(run(prefer), GV2)?.report === `${FULL}/${GV2}-2026-11-14.json`);
  const short = base();
  short[`${FULL}/${PLAIN}-2026-11-14.json`] = report(PLAIN, 3);
  check('3 requests never stand for a case that needs 20', entry(run(short), PLAIN)?.status === 'invalid');
  const gapReps = base();
  gapReps[`${FULL}/${PLAIN}-2026-11-14.json`] = report(PLAIN, 20, { reps: [...Array(19).keys(), 20] });
  check('the reps must be exactly 0 to N - 1', entry(run(gapReps), PLAIN)?.status === 'invalid');
  const cut = base();
  cut[`${FULL}/${HELL_B}-s3-2026-11-14.json`] = report(HELL_B, 3, { accepted: () => 0, interrupted: true });
  const cutRun = run(cut);
  check('an interrupted row: invalid', entry(cutRun, HELL_B)?.status === 'invalid' && noWrite(cutRun));
  const twoPre = base();
  twoPre[`${FULL}/${HELL_B}-s3-2026-11-15.json`] = report(HELL_B, 3, { accepted: () => 0 });
  check('two prescreens: invalid', entry(run(twoPre), HELL_B)?.status === 'invalid');
  const other = base();
  other[`${SLICE}/${GV2}-2026-11-13.json`] = report(GV2, 20, { src: { sourceDigest: 'digest-2', versions: SOURCE.versions } });
  const otherRun = run(other);
  check('another digest: invalid, nothing written', entry(otherRun, GV2)?.status === 'invalid' && noWrite(otherRun), otherRun.out.text);
  const oldVersion = base();
  oldVersion[`${FULL}/${HELL_B}-s3-2026-11-14.json`] = report(HELL_B, 3, {
    accepted: () => 0, src: { sourceDigest: SOURCE.sourceDigest, versions: { ...SOURCE.versions, model: 'old' } },
  });
  check('a prescreen with other versions: invalid', entry(run(oldVersion), HELL_B)?.status === 'invalid');
  const prescreenOther = base();
  prescreenOther[`${FULL}/${HELL_A}-s3-2026-11-14.json`] = report(HELL_A, 3, {
    accepted: (rep) => (rep === 1 ? 10 : 0), src: { sourceDigest: 'digest-2', versions: SOURCE.versions },
  });
  check('a prescreen read for the protocol shares the identity too', entry(run(prescreenOther), HELL_A)?.status === 'invalid');
  const flags = base();
  flags[`${FULL}/${PLAIN}-2026-11-14.json`].meta.workerCount = 2;
  check('other flags: invalid', entry(run(flags), PLAIN)?.status === 'invalid');
  const existing = run({ ...base(), [`${FULL}/aggregate-2026-11-15.json`]: '{}' });
  check('an existing aggregate is never overwritten', existing.out.exit === 1 && existing.out.files === null);
  const parsed = [parseReportName('15x15b10-hell-1-s3-2026-11-14.json'), parseReportName('3x29-very-easy-2026-11-14.json'),
    parseReportName('shards-2026-11-14.md')];
  check('report names', parsed[0]?.caseId === '15x15b10-hell-1' && parsed[0].prescreen && parsed[1]?.caseId === '3x29-very-easy'
    && !parsed[1].prescreen && parsed[2] === null, JSON.stringify(parsed));

  for (const failure of failures) {
    process.stderr.write(`self-test: ${failure}\n`);
  }
  process.stdout.write(`aggregate self-test: ${checks - failures.length} of ${checks} checks as expected\n`);
  return failures.length === 0 ? 0 : 1;
}

/** @param {string[]} argv @returns {number} */
function main(argv) {
  if (argv.length === 1 && argv[0] === '--self-test') {
    return selfTest();
  }
  const flag = (/** @type {string} */ name) => {
    const at = argv.indexOf(name);
    return at < 0 ? undefined : argv[at + 1];
  };
  const [full, slice, date] = [flag('--full'), flag('--slice'), flag('--date')];
  if (argv.length !== 6 || full === undefined || slice === undefined || date === undefined || !DATE.test(date)) {
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }
  if (resolve('.').toLowerCase() !== ROOT.toLowerCase()) {
    process.stderr.write('aggregate: run from the repository root\n');
    return 1;
  }
  try {
    const io = realIo();
    const out = execute({
      matrix: buildLandscapeMatrix({ seeds: FULL_REQUESTS }), io, full: repoFolder(full), slice: repoFolder(slice), date,
    });
    process.stdout.write(`${out.text}\n`);
    if (out.files !== null) {
      for (const f of out.files) {
        io.write(f.path, f.text);
        process.stdout.write(`wrote ${f.path}\n`);
      }
    }
    return out.exit;
  } catch (e) {
    process.stderr.write(`aggregate: ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}

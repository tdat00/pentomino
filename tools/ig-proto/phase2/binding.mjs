// @ts-check
// The binding verifiers of phase 2 (P2-13v): whether an observation belongs to the sealed source.
// One verifier for a measured row (C5), one for a proof result (C14), and the A4 and A5 gates (C15, C16).
// Every seal, observation and file reader is passed in; the module only hashes and compares.
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { matrixDigest } from '../../bench/calibration-reference.js';
import { SOURCE_FILES } from '../../bench/report.js';

/** The eight fixed replay-probe items (P2-14b; C15). */
export const REPLAY_ITEMS = Object.freeze([
  { n: 1, cell: '26x26-hell-1', uniqueness: 'any', copy: 'p2-gen4-diag' },
  { n: 2, cell: '20x20-hell-1', uniqueness: 'any', copy: 'p2-gen4-diag' },
  { n: 3, cell: '24x24-nightmare', uniqueness: 'any', copy: 'p2-gen4' },
  { n: 4, cell: '22x22-nightmare', uniqueness: 'any', copy: 'p2-gen4' },
  { n: 5, cell: '22x22-hell-1', uniqueness: 'require', copy: 'p2-gen4-diag' },
  { n: 6, cell: '32x15-hell-1', uniqueness: 'require', copy: 'p2-gen4-diag' },
  { n: 7, cell: '22x22-nightmare', uniqueness: 'require', copy: 'p2-gen4' },
  { n: 8, cell: '32x15-nightmare', uniqueness: 'require', copy: 'p2-gen4' },
].map((item) => Object.freeze(item)));

/** The six browser checks of `tests/browser/deadline.html` (P2-16b; C16). */
export const BROWSER_CHECKS = Object.freeze(['set-bound', 'batch-prefix', 'late-fence', 'fresh-after-pause', 'no-window-texts', 'screen-capped-step']);
export const BROWSER_PAGE = 'tests/browser/deadline.html';
/** A check's `CHECK-END` reading may take at most this many seconds. */
export const CHECK_END_MAX_S = 60;
export const BROWSER_GENERATOR_SOURCES = Object.freeze([
  'generator/jobs.js', 'generator/locale.en.js', 'generator/locale.vi.js', 'generator/ui/replay-model.js', 'generator/ui/replay-cache.js',
]);

/** @param {Buffer | string} bytes */
export const sha256Hex = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * The matrix file of one row (P2-13d step 3.2); its digest fixes the case id, seed, uniqueness and quantity.
 * @param {{ cell: string, boardRows: any, levelId: string, maxActive: number, uniqueness: string, seed: string }} expected
 */
export function rowMatrix(expected) {
  const { seed } = expected;
  const seedPrefix = seed.slice(0, seed.lastIndexOf('/', seed.lastIndexOf('/') - 1));
  return {
    version: 1,
    profile: 'smoke',
    cases: [{
      id: expected.cell,
      boardRows: expected.boardRows,
      rotation: 0,
      levelId: expected.levelId,
      maxActive: expected.maxActive,
      quantity: 10,
      uniqueness: expected.uniqueness,
      seedPrefix,
      repetitions: 1,
      seeds: [seed],
    }],
  };
}

/**
 * @typedef {object} RowContext
 * @property {string} sealSha256 The active seal's SHA-256.
 * @property {Record<string, any>} seal The parsed active seal (C13).
 * @property {Record<string, any> | null} expected The expected identity of the row's key, from the sealed plan.
 * @property {(path: string) => Buffer | null} read The bytes of a file of RAW (`/`-separated), or null.
 * @property {(path: string) => string[]} list The sorted file names of a folder of RAW, or [].
 */

/**
 * Whether a published row belongs to the active seal (review-2 R2-04; C5).
 * @param {Record<string, any>} row
 * @param {RowContext} ctx
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function verifyRow(row, ctx) {
  /** @type {string[]} */
  const problems = [];
  const result = () => ({ ok: problems.length === 0, problems });
  const { seal, expected, read, list } = ctx;

  if (row.sealSha256 !== ctx.sealSha256) {
    problems.push(`foreign seal ${row.sealSha256 ?? 'none'}`);
    return result();
  }
  if (expected === null || expected === undefined) {
    problems.push(`no expected row ${row.key}`);
    return result();
  }
  for (const field of ['key', 'fileKey', 'stage', 'component', 'arm', 'variant', 'cell', 'rep', 'seed', 'uniqueness']) {
    if (row[field] !== expected[field]) {
      problems.push(`row ${field}`);
    }
  }

  const folder = `raw/${expected.fileKey}`;
  const receiptBytes = read(`${folder}/receipt.json`);
  if (receiptBytes === null) {
    problems.push('receipt missing');
    return result();
  }
  if (sha256Hex(receiptBytes) !== row.receipt) {
    problems.push('receipt hash');
  }
  /** @type {Record<string, any>} */
  let receipt;
  try {
    receipt = JSON.parse(receiptBytes.toString('utf8'));
  } catch {
    problems.push('receipt invalid');
    return result();
  }
  for (const field of ['key', 'fileKey', 'stage', 'variant', 'sealSha256']) {
    if (receipt[field] !== row[field]) {
      problems.push(`receipt ${field}`);
    }
  }
  const copy = (seal.copies ?? []).find((/** @type {{ id: string }} */ c) => c.id === row.variant);
  if (!copy) {
    problems.push(`no sealed copy ${row.variant}`);
    return result();
  }
  if (receipt.copy?.treeId !== copy.treeId || receipt.copy?.copyDigest !== copy.copyDigest) {
    problems.push('receipt copy');
  }

  const reportBytes = receipt.report === null || receipt.report === undefined ? null : read(`${folder}/report.json`);
  if (reportBytes === null) {
    problems.push('report missing');
    return result();
  }
  if (sha256Hex(reportBytes) !== receipt.report.sha256) {
    problems.push('report hash');
  }
  /** @type {Record<string, any>} */
  let report;
  try {
    report = JSON.parse(reportBytes.toString('utf8'));
  } catch {
    problems.push('report invalid');
    return result();
  }
  const runs = (Array.isArray(report.runs) ? report.runs : []).filter((/** @type {{ probeKind?: string }} */ r) => r?.probeKind === 'generation');
  if (runs.length !== 1) {
    problems.push(`report runs ${runs.length}`);
    return result();
  }
  const run = runs[0];

  const journal = Array.isArray(receipt.journal) ? receipt.journal : [];
  for (const entry of journal) {
    const bytes = read(`${folder}/journal/${entry.name}`);
    if (bytes === null || bytes.length !== entry.bytes || sha256Hex(bytes) !== entry.sha256) {
      problems.push(`journal ${entry.name}`);
    }
  }
  const names = journal.map((/** @type {{ name: string }} */ e) => e.name).sort();
  if (!isDeepStrictEqual([...list(`${folder}/journal`)].sort(), names)) {
    problems.push('journal inventory');
  }

  if (run.caseId !== expected.cell) {
    problems.push('run caseId');
  }
  if (run.seed !== expected.seed) {
    problems.push('run seed');
  }
  if (report.meta?.matrixDigest !== matrixDigest(rowMatrix(/** @type {any} */ (expected)))) {
    problems.push('matrix digest');
  }
  if (run.sourceDigest !== copy.runtimeDigest) {
    problems.push('run sourceDigest');
  }
  if (run.sourceCommit !== `${row.variant} ${seal.commit}`) {
    problems.push('run source label');
  }
  if (!isDeepStrictEqual(row.run, run)) {
    problems.push('run differs');
  }
  if (!isDeepStrictEqual(row.telemetry, run.telemetry ?? null)) {
    problems.push('row telemetry');
  }
  return result();
}

/**
 * Whether a proof result belongs to the seal (review-2 R2-04; C14). S1 checks the result's `status` itself.
 * @param {Record<string, any> | null} result
 * @param {Record<string, any>} seal
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function verifyProof(result, seal) {
  /** @type {string[]} */
  const problems = [];
  if (result === null || result === undefined) {
    return { ok: false, problems: ['missing'] };
  }
  if (result.format !== 'p2-proof') {
    problems.push('format');
  }
  if (result.quick !== false) {
    problems.push('quick');
  }
  if (result.sources?.sourceDigest !== seal.sourceDigest) {
    problems.push('sourceDigest');
  }
  const sealed = seal.copies ?? [];
  for (const { id, treeId } of Array.isArray(result.sources?.copies) ? result.sources.copies : []) {
    const copy = sealed.find((/** @type {{ id: string }} */ c) => c.id === id);
    if (!copy) {
      problems.push(`copy ${id} not sealed`);
    } else if (copy.treeId !== treeId) {
      problems.push(`copy ${id} treeId`);
    }
  }
  return { ok: problems.length === 0, problems };
}

/**
 * A4: the eight replay-probe items, read from the receipt (review-2 R2-05, review-3 R3-02; C15).
 * An item passes only on the positive values; an unknown or absent value is incomplete, never success.
 * @param {Record<string, any> | null} receipt
 * @param {Record<string, any>} seal
 * @returns {{ status: 'pass' | 'fail' | 'incomplete', items: { n: number, cell: string, status: string, problems: string[] }[] }}
 */
export function resourceGate(receipt, seal) {
  const usable = receipt !== null && receipt !== undefined && receipt.format === 'p2-replay-probes';
  const received = usable && Array.isArray(receipt.items) ? receipt.items : [];
  const items = REPLAY_ITEMS.map((fixed) => {
    const item = received.find((/** @type {{ n: number }} */ i) => i?.n === fixed.n);
    if (!item || item.cell !== fixed.cell || item.uniqueness !== fixed.uniqueness || item.copy?.id !== fixed.copy) {
      return { n: fixed.n, cell: fixed.cell, status: 'missing', problems: ['missing'] };
    }
    /** @type {string[]} */
    const problems = [];
    const sealed = (seal.copies ?? []).find((/** @type {{ id: string }} */ c) => c.id === fixed.copy);
    if (!sealed || item.copy.treeId !== sealed.treeId) {
      problems.push('binding');
    }
    const puzzles = Array.isArray(item.puzzles) ? item.puzzles : [];
    const unmatched = puzzles.some((/** @type {{ status?: unknown }} */ p) => typeof p?.status === 'string' && p.status !== 'matched');
    if (item.status === 'failed' || unmatched || item.margin === 'exceeded') {
      problems.push('failed');
    }
    if (['not-measured', 'censored', 'not-started'].includes(item.status)) {
      problems.push(item.status);
    } else if (item.status !== 'measured' && item.status !== 'failed') {
      problems.push('status unknown');
    } else if (!puzzles.some((/** @type {{ kind?: unknown }} */ p) => p?.kind === 'candidate') && item.status !== 'failed') {
      problems.push('empty sample');
    }
    if (item.margin !== 'ok' && item.margin !== 'exceeded') {
      problems.push('margin unknown');
    }
    if (puzzles.some((/** @type {{ status?: unknown }} */ p) => typeof p?.status !== 'string')) {
      problems.push('replay unknown');
    }
    return { n: fixed.n, cell: fixed.cell, status: problems.length === 0 ? 'pass' : problems.includes('failed') ? 'failed' : problems[0], problems };
  });
  const status = items.some((i) => i.problems.includes('failed')) ? 'fail' : items.some((i) => i.problems.length > 0) ? 'incomplete' : 'pass';
  return { status, items };
}

const CHECK_END = /^CHECK-END (PASS|FAIL) (\S+) s (\S+)$/;
const OBSERVED_FAILURE = /^(status (fail|timeout|error)|reading )/;

/**
 * A5: the six browser receipts, each read from `E/browser/<check>/receipt.json` (review-2 R2-05, review-3 R3-02; C16).
 * @param {Record<string, Record<string, any> | null>} receipts The parsed receipt of each check name, or null.
 * @param {Record<string, any>} seal
 * @returns {{ status: 'pass' | 'fail' | 'incomplete', checks: { check: string, status: string, seconds: number | null, problems: string[] }[] }}
 */
export function browserGate(receipts, seal) {
  const sealedHashes = new Map();
  for (const entry of [...(seal.tools ?? []), ...(seal.inputs ?? [])]) {
    sealedHashes.set(entry.path, entry.sha256);
  }
  const pageBase = (BROWSER_PAGE.split('/').pop() ?? '').replace(/\.[^.]*$/, '');
  const required = [...new Set([
    BROWSER_PAGE,
    ...(seal.inputs ?? [])
      .map((/** @type {{ path: string }} */ e) => e.path)
      .filter((/** @type {string} */ p) => p.startsWith('tests/browser/') && (p.split('/').pop() ?? '').startsWith(pageBase)),
    ...SOURCE_FILES,
    ...BROWSER_GENERATOR_SOURCES,
  ])];

  const checks = BROWSER_CHECKS.map((check) => {
    const receipt = receipts[check];
    if (receipt === null || receipt === undefined) {
      return { check, status: 'missing', seconds: null, problems: ['missing'] };
    }
    /** @type {string[]} */
    const problems = [];
    if (receipt.format !== 'p2-browser' || receipt.page !== BROWSER_PAGE || receipt.check !== check) {
      problems.push('identity');
    }
    const sources = Array.isArray(receipt.sources) ? receipt.sources : [];
    const have = new Set(sources.map((/** @type {{ path: string }} */ s) => s.path));
    for (const path of required) {
      if (!have.has(path)) {
        problems.push(`source missing ${path}`);
      }
    }
    for (const { path, sha256 } of sources) {
      if (!sealedHashes.has(path) || sealedHashes.get(path) !== sha256) {
        problems.push(`source ${path}`);
      }
    }
    if (['fail', 'timeout', 'error'].includes(receipt.status)) {
      problems.push(`status ${receipt.status}`);
    } else if (receipt.status !== 'pass') {
      problems.push('status unknown');
    }
    let seconds = null;
    const reading = (Array.isArray(receipt.consoleLines) ? receipt.consoleLines : [])
      .map((/** @type {unknown} */ line) => (typeof line === 'string' ? CHECK_END.exec(line) : null))
      .filter((m) => m !== null && m[3] === check)
      .pop();
    if (!reading) {
      problems.push('duration');
    } else {
      seconds = Number(reading[2]);
      if (!Number.isFinite(seconds) || seconds < 0) {
        problems.push('duration invalid');
        seconds = null;
      } else if (reading[1] === 'FAIL' || seconds > CHECK_END_MAX_S) {
        problems.push(`reading ${reading[1]} ${reading[2]}`);
      }
    }
    const failed = problems.some((p) => OBSERVED_FAILURE.test(p));
    return { check, status: failed ? 'fail' : problems.length > 0 ? 'incomplete' : 'pass', seconds, problems };
  });
  const status = checks.some((c) => c.problems.some((p) => OBSERVED_FAILURE.test(p)))
    ? 'fail'
    : checks.some((c) => c.problems.length > 0) ? 'incomplete' : 'pass';
  return { status, checks };
}

// @ts-check
// SA-Opus, analysis round 1 of improve-generating-stages-2-4: read-only loaders over V4-S2's records.
// Reads the published runs (docs/improve-generating/evidence/frozen/V4-S2/<arm>/*.runs.json) and the raw journals
// (tests/artifacts/ig-proto/frozen/V4-S2/<arm>/<shard>/logs/). Writes nothing, rates nothing, runs no lock.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..', '..', '..', '..');
export const EVID = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2');
export const RAW = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen', 'V4-S2');
export const QUANTITY = 10;
export const CAP_MS = 120000;
export const RESPONSE_BOUND_MS = 120000;

/** The harness's pure statistics (tools/ig-proto/verdicts.mjs); importing it reads the frozen snapshot only. */
export const V = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'verdicts.mjs')).href);
export const LINK = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'linkage.mjs')).href);

/** @param {string} p @returns {any} */
export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** @returns {string[]} */
export function arms() {
  return readdirSync(EVID, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

/**
 * Every published row of one arm, ingested by the harness's own `ingestRow`.
 * @param {string} arm
 * @returns {{ cell: string, shard: string, file: string, rows: any[] }[]}
 */
export function armShards(arm) {
  const dir = join(EVID, arm);
  return readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort().map((n) => {
    const j = readJson(join(dir, n));
    const shard = n.replace(/\.runs\.json$/, '');
    const rows = j.rows.map((/** @type {any} */ r) => V.ingestRow(r, { quantity: QUANTITY }));
    const cell = rows[0]?.caseId ?? shard.replace(/^pilot-/, '');
    return { cell, shard, file: join(dir, n), rows, meta: j.meta };
  });
}

/**
 * The raw journal of one row: every worker journal line (file order, files sorted by pid and thread) and the link lines.
 * @param {string} arm
 * @param {string} shard
 * @param {string} rowKey
 */
export function rowJournal(arm, shard, rowKey) {
  const dir = join(RAW, arm, shard, 'logs');
  if (!existsSync(dir)) {
    return { lines: null, linkLines: null, problems: [`no logs folder ${dir}`], files: [] };
  }
  const prefix = `${rowKey}.`;
  const files = readdirSync(dir).filter((n) => n.startsWith(prefix) && n.endsWith('.jsonl')
    && n !== `${rowKey}.row.jsonl` && n !== `${rowKey}.link.jsonl`).sort((a, b) => {
    const pa = a.slice(prefix.length).split('.').map(Number);
    const pb = b.slice(prefix.length).split('.').map(Number);
    return pa[0] - pb[0] || pa[1] - pb[1];
  });
  /** @type {any[]} */
  const lines = [];
  /** @type {string[]} */
  const problems = [];
  for (const f of files) {
    const parsed = V.parseLines(readFileSync(join(dir, f), 'utf8'), f);
    lines.push(...parsed.lines);
    problems.push(...parsed.problems);
  }
  const linkPath = join(dir, `${rowKey}.link.jsonl`);
  let linkLines = null;
  if (existsSync(linkPath)) {
    const parsed = V.parseLines(readFileSync(linkPath, 'utf8'), `${rowKey}.link.jsonl`);
    linkLines = parsed.lines;
    problems.push(...parsed.problems);
  }
  return { lines, linkLines, problems, files };
}

/**
 * Groups a row's worker journal lines by call.
 * @param {any[]} lines
 * @returns {Map<string, { start: any, end: any, ps: any[], phases: string[], begins: any[], counts: any[] }>}
 */
export function callsOf(lines) {
  /** @type {Map<string, any>} */
  const calls = new Map();
  for (const l of lines) {
    if (typeof l.call !== 'string') {
      continue;
    }
    let c = calls.get(l.call);
    if (c === undefined) {
      c = { start: null, end: null, ps: [], phases: [], begins: [], counts: [] };
      calls.set(l.call, c);
    }
    if (l.t === 'start') c.start = l;
    else if (l.t === 'end') c.end = l;
    else if (l.t === 'p') c.ps.push(l);
    else if (l.t === 'phase') c.phases.push(l.phase);
    else if (l.t === 'begin') c.begins.push(l);
    else if (l.t === 'count') c.counts.push(l);
  }
  return calls;
}

/** @param {number[]} xs @returns {number | null} */
export function med(xs) {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** @param {number[]} xs @returns {number | null} */
export function geo(xs) {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x) && x > 0);
  if (v.length === 0) return null;
  return Math.exp(v.reduce((s, x) => s + Math.log(x), 0) / v.length);
}

/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
export function f(x, d = 2) {
  return x === null || x === undefined || !Number.isFinite(x) ? '-' : x.toFixed(d);
}

/**
 * Writes a text file with CRLF line ends, no trailing whitespace and one final newline (the workspace convention).
 * @param {string} path
 * @param {string} text
 */
export function writeCrlf(path, text) {
  const body = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\r\n');
  writeFileSync(path, body.replace(/(\r\n)*$/, '') + '\r\n', 'utf8');
}

/** The board area class of plan P2 / T08's `screenClass` (Nightmare and Hell 1 only). */
export function screenClass(levelId, area) {
  if (levelId === 'hell-1') return 'hell-1';
  if (levelId !== 'nightmare') return null;
  if (area <= 144) return 'n-small';
  if (area >= 196 && area <= 324) return 'n-mid';
  return area >= 360 ? 'n-large' : null;
}

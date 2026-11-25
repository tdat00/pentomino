// @ts-check
// The common proof runner (P2-12b; plan §7.2, review-2 R2-03 and R2-04; contracts.md C14): imports the bundle
// `./proof-<bundle>.mjs` only on invocation, runs it and writes result.json and result.md with the sources the result
// is bound to. The bundles (P2-12c, P2-12e) are their own modules and use the exported `compare`.
//   node tools\ig-proto\phase2\proofs.mjs <bundle> --out <dir> [--quick]
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { computeSourceDigest } from '../../bench/report.js';
import { parseArgs } from '../lib/paths.mjs';
import { COPIES } from './copies.mjs';

/**
 * @typedef {object} Outcome What a bundle's `run` returns.
 * @property {'pass' | 'fail'} status
 * @property {unknown[]} cases
 * @property {Record<string, unknown>} counts
 * @property {string[]} [copies] The ids of the copies the bundle used (`[]` or absent: production modules only).
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const TREES = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'phase2', 'trees');
const USAGE = 'usage: node tools\\ig-proto\\phase2\\proofs.mjs <observer|certificate|prior-replay|legacy> --out <dir> [--quick]';

export const BUNDLES = Object.freeze(['observer', 'certificate', 'prior-replay', 'legacy']);

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string[]} path
 * @returns {string | null}
 */
function diff(a, b, path) {
  if (a === b || (a !== a && b !== b)) {
    return null;
  }
  const here = path.length === 0 ? '(root)' : path.join('.');
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) {
    return here;
  }
  const left = /** @type {Record<string, unknown>} */ (a);
  const right = /** @type {Record<string, unknown>} */ (b);
  const keys = Array.isArray(a)
    ? Array.from({ length: Math.max(a.length, /** @type {unknown[]} */ (b).length) }, (_, i) => String(i))
    : [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  for (const key of keys) {
    if (Object.hasOwn(left, key) !== Object.hasOwn(right, key)) {
      return [...path, key].join('.');
    }
    const found = diff(left[key], right[key], [...path, key]);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {string | null} The path of the first difference (`skips.subsets.1`; `(root)` for the values themselves), or `null` when they are deep equal.
 */
export function compare(a, b) {
  return diff(a, b, []);
}

/**
 * The proof record of contracts.md C14.
 * @param {{ bundle: string, quick: boolean, outcome: Outcome, sourceDigest: string, copies: { id: string, treeId: string }[] }} o
 */
export function resultOf({ bundle, quick, outcome, sourceDigest, copies }) {
  return {
    format: 'p2-proof',
    version: 1,
    bundle,
    status: outcome.status,
    quick,
    cases: outcome.cases,
    counts: outcome.counts,
    sources: { sourceDigest, copies },
  };
}

/** @param {unknown} value @returns {string} A table cell. */
const cell = (value) => String(typeof value === 'object' && value !== null ? JSON.stringify(value) : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/**
 * @param {ReturnType<typeof resultOf>} result
 * @returns {string} The table form of the record (LF).
 */
export function resultMd(result) {
  const lines = [
    `# Proof bundle ${result.bundle}`,
    '',
    '| Field | Value |',
    '|---|---|',
    `| status | ${result.status} |`,
    `| quick | ${result.quick} |`,
    `| sourceDigest | ${result.sources.sourceDigest} |`,
    ...result.sources.copies.map((c) => `| copy ${cell(c.id)} | ${c.treeId} |`),
    '',
    '| Count | Value |',
    '|---|---|',
    ...Object.entries(result.counts).map(([name, value]) => `| ${cell(name)} | ${cell(value)} |`),
    '',
    '| Case | Detail |',
    '|---|---|',
    ...result.cases.map((c, i) => `| ${i + 1} | ${cell(c)} |`),
  ];
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string} id
 * @returns {{ id: string, treeId: string }} The copy's id and the treeId of its ig-tree.json.
 */
function copyOf(id) {
  const source = Object.entries(COPIES).find(([, ids]) => ids.includes(id))?.[0];
  if (source === undefined) {
    throw new Error(`unknown copy ${id}`);
  }
  const info = JSON.parse(readFileSync(join(TREES, source, id, 'ig-tree.json'), 'utf8'));
  return { id, treeId: info.treeId };
}

/** @param {string} path @param {string} text A text with LF, written with CRLF. */
const writeCrlf = (path, text) => writeFileSync(path, text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));

/** @param {string[]} argv @returns {Promise<number>} The exit code: 0 pass, 1 fail, 2 not run. */
async function main(argv) {
  /** @type {ReturnType<typeof parseArgs>} */
  let parsed;
  try {
    parsed = parseArgs(argv, { values: ['out'], switches: ['quick'] });
  } catch {
    console.error(USAGE);
    return 2;
  }
  const { args, on, rest } = parsed;
  if (rest.length !== 1 || args.out === undefined) {
    console.error(USAGE);
    return 2;
  }
  const bundle = rest[0];
  if (!BUNDLES.includes(bundle) || !existsSync(join(HERE, `proof-${bundle}.mjs`))) {
    console.error(`proofs: no bundle ${bundle}`);
    return 2;
  }
  const out = resolve(args.out);
  const quick = on.has('quick');
  mkdirSync(out, { recursive: true });
  // A stale result must never stand for this run.
  rmSync(join(out, 'result.json'), { force: true });
  rmSync(join(out, 'result.md'), { force: true });
  try {
    const module = await import(new URL(`./proof-${bundle}.mjs`, import.meta.url).href);
    /** @type {Outcome} */
    const outcome = await module.run({ out, quick, root: ROOT, trees: TREES });
    const sourceDigest = await computeSourceDigest((/** @type {string} */ p) => readFileSync(join(ROOT, ...p.split('/')), 'utf8'));
    const copies = (outcome.copies ?? []).map(copyOf);
    const result = resultOf({ bundle, quick, outcome, sourceDigest, copies });
    writeCrlf(join(out, 'result.json'), JSON.stringify(result, null, 2));
    writeCrlf(join(out, 'result.md'), resultMd(result));
    console.log(`proofs: ${bundle} ${result.status}${quick ? ' (quick)' : ''}`);
    return result.status === 'pass' ? 0 : 1;
  } catch (e) {
    console.error(`proofs: ${bundle} did not complete: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}

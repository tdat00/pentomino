// @ts-check
// Records of the ig-proto harness: CRLF writers that refuse absolute paths, the common `meta` block, the banner
// and content hashes (check-list §3 "Records"). No git.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism, cpus, release, totalmem } from 'node:os';
import { dirname, join } from 'node:path';

import { APP_VERSION } from '../../../core/engine/version.js';
import { computeSourceDigest } from '../../bench/report.js';
import { checkText } from '../../check-conventions.mjs';
import { currentVersions } from '../../record-fixtures.mjs';
import { readInvocations, totals } from './budget.mjs';
import { abs, argValue, IG_DIR, MP12B1_DIGEST, rel, ROOT, treeDir } from './paths.mjs';

/** @param {string | Uint8Array} data @returns {string} SHA-256 hex. */
export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** @param {string} text @returns {string} The text with LF line ends. */
export const lf = (text) => text.replace(/\r\n/g, '\n');

/** @param {string} text @returns {string} SHA-256 of the LF-normalised text. */
export const sha256Text = (text) => sha256(lf(text));

/**
 * @param {string} path Absolute path.
 * @param {{ raw?: boolean }} [options] `raw` hashes the bytes as they are (production files); else text is LF-normalised.
 * @returns {string}
 */
export function sha256File(path, { raw = false } = {}) {
  const bytes = readFileSync(path);
  return raw || bytes.includes(0) ? sha256(bytes) : sha256Text(bytes.toString('utf8'));
}

/**
 * @param {string} text
 * @returns {string} The text with CRLF line ends and one final newline.
 */
export function toCrlf(text) {
  const normal = lf(text);
  return (normal.endsWith('\n') ? normal : `${normal}\n`).replace(/\n/g, '\r\n');
}

/**
 * Refuses a text that names the worktree's absolute root or holds a drive-letter path.
 * @param {string} path
 * @param {string} text
 */
function refuseAbsolute(path, text) {
  const root = ROOT.replace(/[\\/]+$/, '').toLowerCase();
  const lower = text.toLowerCase();
  const forms = [root, root.replaceAll('\\', '/'), root.replaceAll('\\', '\\\\')];
  if (forms.some((f) => lower.includes(f))) {
    throw new Error(`records: ${rel(path)} would contain the worktree's absolute path`);
  }
  if (/(^|[^A-Za-z0-9])[A-Za-z]:(\\\\|\\|\/)/.test(text)) {
    throw new Error(`records: ${rel(path)} would contain a drive-letter path`);
  }
}

/**
 * @param {string} path Absolute path.
 * @param {string} text
 * @returns {void} Writes UTF-8 without BOM, CRLF, a final newline; throws on a convention or absolute-path problem.
 */
export function writeText(path, text) {
  const crlf = toCrlf(text);
  refuseAbsolute(path, crlf);
  const problems = checkText(rel(path), Buffer.from(crlf, 'utf8'));
  if (problems.length > 0) {
    throw new Error(`records: ${problems.join('; ')}`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, crlf);
}

/** @param {string} path @param {unknown} value @returns {void} */
export const writeJson = (path, value) => writeText(path, JSON.stringify(value, null, 2));

/** @param {string} path @param {unknown[]} rows @returns {void} One JSON line per row. */
export function writeJsonl(path, rows) {
  if (rows.length === 0) {
    throw new Error(`records: ${rel(path)} has no rows`);
  }
  writeText(path, rows.map((r) => JSON.stringify(r)).join('\n'));
}

/**
 * @param {string} dir Absolute folder.
 * @param {(name: string) => boolean} [keep]
 * @returns {string[]} Files below the folder, absolute, sorted by relative path with `/`.
 */
function walk(dir, keep = () => true) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) {
    return out;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(path, keep));
    } else if (keep(entry.name)) {
      out.push(path);
    }
  }
  return out.sort((a, b) => (rel(a) < rel(b) ? -1 : 1));
}

/**
 * The harness identity: `tools/ig-proto/lib/`, the driver scripts (top-level .mjs and .ps1 files) and the data.
 * @returns {{ harnessHash: string, files: Record<string, string> }}
 */
export function harnessInfo() {
  const paths = [
    ...walk(join(IG_DIR, 'lib')),
    ...walk(IG_DIR, () => true).filter((p) => /\.(mjs|ps1)$/.test(p) && dirname(p) === IG_DIR),
    ...walk(join(IG_DIR, 'data')),
  ];
  /** @type {Record<string, string>} */
  const files = {};
  for (const path of paths) {
    files[rel(path)] = sha256File(path);
  }
  const lines = Object.entries(files).map(([p, h]) => `${p}\t${h}`);
  return { harnessHash: sha256(lines.join('\n')), files };
}

/** @returns {Promise<string>} Digest of the worktree's SOURCE_FILES (the sourceDigest of every MP12b1 report). */
export function worktreeDigest() {
  return computeSourceDigest((path) => readFileSync(abs(path), 'utf8'));
}

/** @returns {{ algo: string, policy: string, rng: string, model: string, app: string }} */
export const worktreeVersions = () => ({ ...currentVersions(), app: APP_VERSION });

/**
 * @param {string} variant
 * @returns {any} The tree's ig-tree.json.
 */
export function readTreeInfo(variant) {
  return JSON.parse(readFileSync(join(treeDir(variant), 'ig-tree.json'), 'utf8'));
}

/**
 * The common `meta` block of a JSON record (check-list §3).
 * @param {{ task: string, label: string, kind: string, trees?: string[], sourceLabel?: string }} o
 * @returns {Promise<any>}
 */
export async function buildMeta({ task, label, kind, trees = [], sourceLabel }) {
  const { manifest } = await import('../firewall.mjs');
  const sourceDigest = await worktreeDigest();
  const harness = harnessInfo();
  /** @type {Record<string, any>} */
  const treeBlock = {};
  for (const variant of trees) {
    const info = readTreeInfo(variant);
    treeBlock[variant] = {
      treeId: info.treeId,
      copyDigest: info.copyDigest,
      edits: info.edits.map((/** @type {{ id: string }} */ e) => e.id),
      params: info.params,
    };
  }
  const t = totals(readInvocations(label), task);
  const frozen = label === 'frozen';
  return {
    format: `ig-proto-${kind}`,
    version: 1,
    task,
    label,
    labelText: frozen ? 'frozen (post-MP17)' : 'provisional (pre-freeze)',
    createdAt: new Date().toISOString(),
    source: {
      label: sourceLabel ?? argValue('source-label') ?? 'unlabelled',
      sourceDigest,
      versions: worktreeVersions(),
      equalsMp12b1Source: sourceDigest === MP12B1_DIGEST,
      firewall: manifest().hash,
    },
    harness,
    trees: treeBlock,
    machine: {
      cpu: (cpus()[0]?.model ?? 'unknown').trim(),
      logicalCores: availableParallelism(),
      totalMemoryBytes: totalmem(),
      node: process.version,
      platform: `${process.platform} ${release()} ${process.arch}`,
    },
    invocations: { count: t.count, nodeSeconds: t.nodeSeconds, countedSeconds: t.countedSeconds, lockWaitSeconds: t.lockWaitSeconds },
    rerun: `pwsh -NoProfile -File tools\\ig-proto\\run-task.ps1 -Plan tools\\ig-proto\\plans\\${task}.json -Label frozen -SourceLabel <label> -LockHelper <path>`,
  };
}

/**
 * @param {any} meta
 * @returns {string} The banner every Markdown record starts with, after its title.
 */
export function banner(meta) {
  const eight = String(meta.source.sourceDigest).slice(0, 8);
  const equal = meta.source.equalsMp12b1Source ? ", equal to MP12b1's source" : '';
  if (meta.label === 'frozen') {
    return `> **Frozen post-MP17 source.** Measured on ${meta.source.label} (source digest ${eight}…${equal}). Re-run: ${meta.rerun}.`;
  }
  return `> **Provisional (pre-freeze).** Measured on ${meta.source.label} (source digest ${eight}…${equal}), not on the frozen post-MP17 source. Re-run: ${meta.rerun}.`;
}

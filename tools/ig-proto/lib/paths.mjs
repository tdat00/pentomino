// @ts-check
// Roots, labels and constants of the ig-proto harness (check-list §3). No git: identity comes from content; the
// frozen source is a folder extracted once and verified against its manifest (V4-T01a).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root: three parents of tools/ig-proto/lib/ (with a trailing separator). */
export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const IG_DIR = join(ROOT, 'tools', 'ig-proto');
export const LABELS = Object.freeze(['provisional', 'frozen']);
/** Scratch label of the self-test and of developer debugging runs (never published). */
export const SELFTEST_LABEL = 'selftest';
export const MP12B1_DIGEST = '34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918';
export const MP12B1_COMMIT = '917052a946b19de7cc0ac8214dddb1995561d70d';
export const ROUND_LIMIT_S = 10800;
/** The frozen source of the frozen round (task pack v4, D-V4-01): the merge of difficulty-v3. */
export const FROZEN_COMMIT = '3fc65f4681a53d3984d9218c15efbf696cc3a1a5';
/** computeSourceDigest of FROZEN_COMMIT's SOURCE_FILES (40 files). */
export const FROZEN_DIGEST = 'e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b';
/** The extracted frozen source (git-ignored), written by V4-T01a's snapshot step. */
export const FROZEN_SOURCE_DIR = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen-source');
/** The hash manifest of FROZEN_SOURCE_DIR (committed evidence). */
export const SNAPSHOT_MANIFEST = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-T01a', 'snapshot-manifest.json');
/** 'frozen' when this process runs with `--label frozen`, else 'worktree'. Worker threads do not read it (T01b). */
export const SOURCE_KIND = argValue('label') === 'frozen' ? 'frozen' : 'worktree';

const VARIANT_ID = /^[a-z0-9][a-z0-9-]*$/;
const MP12B1_FOLDERS = Object.freeze(['docs/difficulty-v3/landscape-v3-full', 'docs/difficulty-v3/landscape-v3/r2']);

/**
 * @param {string} path Absolute path.
 * @returns {string} Repository-relative path with `/`.
 */
export const rel = (path) => relative(ROOT, path).split(sep).join('/');

/**
 * @param {string} relPath Repository-relative path with `/`.
 * @returns {string} Absolute path.
 */
export const abs = (relPath) => join(ROOT, ...relPath.split('/'));

/** @param {string} label @returns {string} */
function checkLabel(label) {
  if (!LABELS.includes(label) && label !== SELFTEST_LABEL) {
    throw new RangeError(`label must be one of ${[...LABELS, SELFTEST_LABEL].join(', ')}, got ${label}`);
  }
  return label;
}

/**
 * @param {string} label
 * @param {string} [task]
 * @param {...string} parts
 * @returns {string} Folder under tests/artifacts/ig-proto/<label>/<task>/.
 */
export function artifactDir(label, task, ...parts) {
  const base = join(ROOT, 'tests', 'artifacts', 'ig-proto', checkLabel(label));
  return task === undefined ? base : join(base, task, ...parts);
}

/**
 * @param {'frozen' | 'worktree'} [kind] The source kind; default: the one of this process's `--label`.
 * @returns {string} The folder every source, version and catalogue reference is read from: the verified snapshot
 *   for `frozen` (it must exist; the snapshot step of V4-T01a writes it), else the repository root.
 */
export function sourceRoot(kind = SOURCE_KIND) {
  if (kind !== 'frozen') {
    return ROOT;
  }
  if (!existsSync(join(FROZEN_SOURCE_DIR, 'core', 'engine', 'clues.js'))) {
    throw new Error('frozen source missing: run the snapshot step of V4-T01a');
  }
  return FROZEN_SOURCE_DIR;
}

/**
 * @param {string} label
 * @returns {number} The round's cap in seconds before any approval: 10,800 for `provisional`, 0 for `frozen`
 *   (every locked frozen step needs `-ApprovedRoundMinutes`, D-V4-02).
 */
export function roundLimitS(label) {
  return label === 'frozen' ? 0 : ROUND_LIMIT_S;
}

/**
 * @param {string} variant
 * @param {'frozen' | 'worktree'} [kind] The source kind; default: the one of this process's `--label`.
 * @returns {string} tests/artifacts/ig-proto/tree/<variant>/, or tree-frozen/<variant>/ for `frozen`.
 */
export function treeDir(variant, kind = SOURCE_KIND) {
  if (!VARIANT_ID.test(variant)) {
    throw new RangeError(`bad variant id: ${variant}`);
  }
  return join(ROOT, 'tests', 'artifacts', 'ig-proto', kind === 'frozen' ? 'tree-frozen' : 'tree', variant);
}

/**
 * @param {string} label
 * @param {string} task
 * @param {...string} parts
 * @returns {string} docs/improve-generating/evidence/<label>/<task>/
 */
export function evidenceDir(label, task, ...parts) {
  if (!LABELS.includes(label)) {
    throw new RangeError(`evidence label must be one of ${LABELS.join(', ')}, got ${label}`);
  }
  return join(ROOT, 'docs', 'improve-generating', 'evidence', label, task, ...parts);
}

/**
 * MP12b1's report of a landscape case: the full folder first, then landscape-v3/r2.
 * @param {string} caseId
 * @returns {{ path: string, report: any } | null}
 */
export function mp12b1Report(caseId) {
  const pattern = new RegExp(`^${caseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}-\\d{2}-\\d{2}\\.json$`);
  for (const folder of MP12B1_FOLDERS) {
    const dir = abs(folder);
    if (!existsSync(dir)) {
      continue;
    }
    const names = readdirSync(dir).filter((n) => pattern.test(n)).sort();
    if (names.length > 0) {
      const name = /** @type {string} */ (names.at(-1));
      return { path: `${folder}/${name}`, report: JSON.parse(readFileSync(join(dir, name), 'utf8')) };
    }
  }
  return null;
}

/**
 * Minimal flag parser: `--name value`, `--name=value` and switches.
 * @param {string[]} argv
 * @param {{ values?: string[], switches?: string[] }} spec
 * @returns {{ args: Record<string, string>, on: Set<string>, rest: string[] }}
 */
export function parseArgs(argv, { values = [], switches = [] }) {
  const known = new Set([...values, ...switches]);
  /** @type {Record<string, string>} */
  const args = {};
  /** @type {Set<string>} */
  const on = new Set();
  /** @type {string[]} */
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const match = /^--([a-z0-9-]+)(?:=(.*))?$/s.exec(argv[i]);
    if (match === null) {
      rest.push(argv[i]);
      continue;
    }
    const name = match[1];
    if (!known.has(name)) {
      throw new Error(`unknown argument: ${argv[i]}`);
    }
    if (switches.includes(name)) {
      on.add(name);
      continue;
    }
    let value = match[2];
    if (value === undefined) {
      i += 1;
      value = argv[i];
      if (value === undefined) {
        throw new Error(`--${name} needs a value`);
      }
    }
    args[name] = value;
  }
  return { args, on, rest };
}

/** @returns {number} Seconds since this process started (the origin of every horizon). */
export const elapsedS = () => performance.now() / 1000;

/**
 * @param {string} name Flag name without the dashes.
 * @param {string[]} [argv]
 * @returns {string | undefined} Raw value of a flag, read from the process arguments.
 */
export function argValue(name, argv = process.argv.slice(2)) {
  const at = argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < argv.length) {
    return argv[at + 1];
  }
  const joined = argv.find((a) => a.startsWith(`--${name}=`));
  return joined === undefined ? undefined : joined.slice(name.length + 3);
}

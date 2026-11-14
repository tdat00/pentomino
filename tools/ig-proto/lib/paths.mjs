// @ts-check
// Roots, labels and constants of the ig-proto harness (check-list §3). No git: identity comes from content.
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

/** @param {string} variant @returns {string} tests/artifacts/ig-proto/tree/<variant>/ */
export function treeDir(variant) {
  if (!VARIANT_ID.test(variant)) {
    throw new RangeError(`bad variant id: ${variant}`);
  }
  return join(ROOT, 'tests', 'artifacts', 'ig-proto', 'tree', variant);
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

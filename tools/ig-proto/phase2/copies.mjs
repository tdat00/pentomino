// @ts-check
// Measurement copies (P2-12b; plan §7.1, R2, R13): every measured arm is an identified copy of a known source, built by
// the frozen tree builder with the manifests of tools/ig-proto/phase2/variants/. Each copy records the root and the
// digest of the sources it was built from in p2-copy.json. No git; nothing is written outside the copy's own folder.
//   node tools\ig-proto\phase2\copies.mjs check|build --source gen-v4|today [--root <dir>] [--rehearse-cutover] [--dest <dir>]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseArgs } from '../lib/paths.mjs';
import { lf, sha256 } from '../lib/records.mjs';
import { buildTree, planTree } from '../lib/tree.mjs';

/** @typedef {Map<string, string | Buffer>} Sources */
/** @typedef {'gen-v4' | 'today'} CopySource */

const HERE = dirname(fileURLToPath(import.meta.url));
const SLOT = resolve(HERE, '..', '..', '..');
const VARIANTS_DIR = join(HERE, 'variants');
const FILES_ROOT = join(HERE, 'files');
const DEFAULT_DEST = join(SLOT, 'tests', 'artifacts', 'ig-proto', 'phase2', 'trees');

const USAGE = 'usage: node tools\\ig-proto\\phase2\\copies.mjs check|build --source gen-v4|today [--root <dir>] [--rehearse-cutover] [--dest <dir>]';

/** The copies of each source, in build order. */
export const COPIES = Object.freeze({ 'gen-v4': Object.freeze(['p2-gen4', 'p2-gen4-diag', 'p2-none', 'p2-uncapped', 'p2-uncapped-diag']), today: Object.freeze(['p2-today']) });

/** @returns {Record<string, any>} Every manifest of tools/ig-proto/phase2/variants/, keyed by its id. */
export function loadManifests() {
  /** @type {Record<string, any>} */
  const manifests = {};
  for (const name of readdirSync(VARIANTS_DIR).filter((n) => n.endsWith('.json')).sort()) {
    const manifest = JSON.parse(readFileSync(join(VARIANTS_DIR, name), 'utf8'));
    if (manifest.id !== name.slice(0, -5)) {
      throw new Error(`manifest ${name} names itself ${manifest.id}`);
    }
    manifests[manifest.id] = manifest;
  }
  return manifests;
}

/** @param {Sources} map @param {string} dir @param {string} root */
function readFolder(map, dir, root) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = join(dir, entry.name);
    const label = relative(root, path).split(sep).join('/');
    if (label === 'tools/ig-proto') {
      continue;
    }
    if (entry.isDirectory()) {
      readFolder(map, path, root);
    } else if (entry.isFile()) {
      const bytes = readFileSync(path);
      map.set(label, bytes.includes(0) ? bytes : lf(bytes.toString('utf8')));
    }
  }
}

/**
 * The sources a copy is built from, as `collectSources()` of tree.mjs reads the slot's.
 * @param {string} root
 * @returns {Sources} core/, tools/ (without tools/ig-proto/) and package.json of `root`; texts LF-normalised, a file with a 0 byte as bytes.
 */
export function readSources(root) {
  /** @type {Sources} */
  const map = new Map();
  for (const dir of ['core', 'tools']) {
    readFolder(map, join(root, dir), root);
  }
  map.set('package.json', lf(readFileSync(join(root, 'package.json'), 'utf8')));
  return map;
}

/** @type {readonly [string, string, string][]} */
const CUTOVER = Object.freeze([
  ['core/engine/version.js', "export const ALGO_ID = 'gen-v3';", "export const ALGO_ID = 'gen-v4';"],
  ['core/engine/gen-v4.js', 'export const GEN_V4_LIVE = false;', 'export const GEN_V4_LIVE = true;'],
]);

/**
 * @param {Sources} sources
 * @returns {Sources} A copy in which the cutover of P2-15 is applied (`--rehearse-cutover`); throws when it is already merged.
 */
export function rehearse(sources) {
  const out = new Map(sources);
  for (const [file, anchor, replacement] of CUTOVER) {
    const text = out.get(file);
    const parts = typeof text === 'string' ? text.split(anchor) : [];
    if (parts.length !== 2) {
      throw new Error(`--rehearse-cutover: ${file} has no ${anchor}; the cutover is already merged`);
    }
    out.set(file, `${parts[0]}${replacement}${parts[1]}`);
  }
  return out;
}

/**
 * @param {Sources} sources
 * @returns {string} The digest of the input sources of a copy.
 */
export function inputDigest(sources) {
  return sha256(JSON.stringify([...sources].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, c]) => [p, sha256(c)])));
}

/**
 * @param {{ source: CopySource, root?: string }} o
 * @returns {string} The root of the sources: the slot for `gen-v4`; required for `today`.
 */
function rootOf({ source, root }) {
  if (root !== undefined) {
    return resolve(root);
  }
  if (source === 'today') {
    throw new Error('--root is required for --source today');
  }
  return SLOT;
}

/**
 * @param {CopySource} source
 * @returns {readonly string[]} The copy ids of the source.
 */
function idsOf(source) {
  const ids = COPIES[source];
  if (ids === undefined) {
    throw new Error(`unknown source ${source}`);
  }
  return ids;
}

/**
 * @param {{ source: CopySource, root?: string, rehearsal?: boolean }} o
 * @returns {{ root: string, sources: Sources }}
 */
function inputOf(o) {
  const root = rootOf(o);
  const sources = readSources(root);
  return { root, sources: o.rehearsal === true ? rehearse(sources) : sources };
}

/**
 * Plans every copy of a source in memory.
 * @param {{ source: CopySource, root?: string, rehearsal?: boolean }} o
 * @returns {{ ok: boolean, variants: number, edits: number, errors: string[] }} `edits` counts the applied edits.
 */
export function checkCopies(o) {
  const ids = idsOf(o.source);
  const manifests = loadManifests();
  const { sources } = inputOf(o);
  /** @type {string[]} */
  const errors = [];
  let edits = 0;
  for (const id of ids) {
    /** @type {string[]} */
    const found = [];
    try {
      edits += planTree(id, { manifests, filesRoot: FILES_ROOT, sources, errors: found }).edits.length;
    } catch (e) {
      found.push(e instanceof Error ? e.message : String(e));
    }
    errors.push(...found.map((m) => `${id}: ${m}`));
  }
  return { ok: errors.length === 0, variants: ids.length, edits, errors };
}

/**
 * @typedef {object} CopyOptions
 * @property {CopySource} source
 * @property {string} [root] The root of the sources (default the slot; required for `today`).
 * @property {boolean} [rehearsal]
 * @property {string} [destRoot] Default tests/artifacts/ig-proto/phase2/trees.
 * @property {Record<string, any>} [manifests]
 * @property {Sources} [sources] The prepared (rehearsed) sources of `root`.
 */

/**
 * Builds one copy under `<destRoot>/<source>/<id>/` and writes its receipt p2-copy.json.
 * @param {string} id
 * @param {CopyOptions} o
 * @returns {Promise<Record<string, unknown>>} The receipt.
 */
export async function buildCopy(id, o) {
  const root = rootOf(o);
  const manifests = o.manifests ?? loadManifests();
  const sources = o.sources ?? inputOf(o).sources;
  const dest = join(o.destRoot ?? DEFAULT_DEST, o.source, id);
  const info = await buildTree(id, { manifests, filesRoot: FILES_ROOT, sources, dest, sourceLabel: `p2-${o.source}` });
  const record = {
    format: 'p2-copy',
    version: 1,
    id,
    source: o.source,
    root,
    rehearsal: o.rehearsal === true,
    inputDigest: inputDigest(sources),
    treeId: info.treeId,
    copyDigest: info.copyDigest,
    chain: info.chain,
    params: info.params,
  };
  // Not writeText of records.mjs: it refuses the drive-letter path of `root`, which this receipt records.
  mkdirSync(dest, { recursive: true });
  writeFileSync(join(dest, 'p2-copy.json'), `${JSON.stringify(record, null, 2)}\n`.replace(/\n/g, '\r\n'));
  return record;
}

/**
 * Builds every copy of a source.
 * @param {CopyOptions} o
 * @returns {Promise<Record<string, unknown>[]>} The receipts.
 */
export async function buildCopies(o) {
  const ids = idsOf(o.source);
  const manifests = o.manifests ?? loadManifests();
  const sources = o.sources ?? inputOf(o).sources;
  /** @type {Record<string, unknown>[]} */
  const records = [];
  for (const id of ids) {
    records.push(await buildCopy(id, { ...o, manifests, sources }));
  }
  return records;
}

/** @param {string[]} argv @returns {Promise<number>} The exit code. */
async function main(argv) {
  /** @type {ReturnType<typeof parseArgs>} */
  let parsed;
  try {
    parsed = parseArgs(argv, { values: ['source', 'root', 'dest'], switches: ['rehearse-cutover'] });
  } catch {
    console.error(USAGE);
    return 1;
  }
  const { args, on, rest } = parsed;
  const [command] = rest;
  const source = /** @type {CopySource} */ (args.source);
  const valid = rest.length === 1 && (command === 'check' || command === 'build') && Object.hasOwn(COPIES, source ?? '')
    && (source === 'gen-v4' || args.root !== undefined)     && (source === 'gen-v4' || !on.has('rehearse-cutover'));
  if (!valid) {
    console.error(USAGE);
    return 1;
  }
  const o = { source, root: args.root, rehearsal: on.has('rehearse-cutover'), destRoot: args.dest === undefined ? undefined : resolve(args.dest) };
  try {
    if (command === 'check') {
      const result = checkCopies(o);
      if (!result.ok) {
        for (const error of result.errors) {
          console.error(error);
        }
        return 1;
      }
      console.log(`copies: OK (${result.variants} variants, ${result.edits} edits match)`);
      return 0;
    }
    for (const r of await buildCopies(o)) {
      console.log(`${r.id} ${r.treeId} ${r.copyDigest}`);
    }
    return 0;
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}

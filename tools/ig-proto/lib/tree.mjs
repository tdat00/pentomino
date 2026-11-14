// @ts-check
// Tree builder (check-list §3 "Copies, never edits"; IGP-00 §2): a variant is a copy of core/, tools/ (without
// tools/ig-proto/) and package.json under tests/artifacts/ig-proto/tree/<variant>/, with anchored text edits and
// added files. A production file is never edited. No git.
//   node tools\ig-proto\lib\tree.mjs build <id>...       (prints: <id> <treeId> <copyDigest> built|reused)
//   node tools\ig-proto\lib\tree.mjs check-edits --all|<id>...
//   node tools\ig-proto\lib\tree.mjs list
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { argValue, IG_DIR, parseArgs, ROOT, treeDir } from './paths.mjs';
import { lf, sha256, worktreeDigest, worktreeVersions, writeJson } from './records.mjs';

/**
 * @typedef {{ id: string, file: string, find: string, replace: string }
 *   | { id: string, file: string, append: string }
 *   | { id: string, file: string, from: string, through: string, lines: number, replace: string }} Edit
 * @typedef {object} Manifest
 * @property {string} id
 * @property {string[]} [extends]
 * @property {string} [description]
 * @property {Edit[]} [edits]
 * @property {string[]} [files]
 * @property {Record<string, unknown>} [params]
 * @property {Record<string, unknown>} [paramFiles]
 */

const VARIANTS_DIR = join(IG_DIR, 'variants');
const FILES_DIR = join(VARIANTS_DIR, 'files');

/** In every tree: the copy's readSource runs no git (it takes its label from the runner). */
const META_1 = Object.freeze({
  id: 'meta-1',
  file: 'tools/calibrate.mjs',
  from: '    commit = execFileSync(',
  through: "    commit += dirty === '' ? '' : '+uncommitted-changes';\n",
  lines: 3,
  replace: "    commit = process.env.IG_SOURCE_LABEL || 'ig-proto';\n",
});

const SOURCE_FILES_TAIL = "  'tools/bench/responsiveness.js', 'tools/bench/calibration-reference.js',\n]);\n";

/** @param {string} text @param {string} needle @returns {number} */
function count(text, needle) {
  if (needle === '') {
    return 0;
  }
  let n = 0;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length)) {
    n += 1;
  }
  return n;
}

/**
 * Applies one edit to a file text; throws when an anchor does not occur exactly once.
 * @param {string} text
 * @param {Edit} edit
 * @param {string} variant
 * @returns {string}
 */
export function applyEdit(text, edit, variant) {
  const normal = lf(text);
  const miss = (/** @type {number} */ n) => new Error(`edit ${edit.id} (${variant}): anchor found ${n} times in ${edit.file}; re-derive this edit for the current source`);
  if ('append' in edit) {
    return normal + lf(edit.append);
  }
  if ('from' in edit) {
    const from = lf(edit.from);
    const through = lf(edit.through);
    const nFrom = count(normal, from);
    const nThrough = count(normal, through);
    if (nFrom !== 1 || nThrough !== 1) {
      throw miss(nFrom !== 1 ? nFrom : nThrough);
    }
    const start = normal.indexOf(from);
    const end = normal.indexOf(through) + through.length;
    if (end <= start || count(normal.slice(start, end), '\n') !== edit.lines) {
      throw miss(0);
    }
    return normal.slice(0, start) + lf(edit.replace) + normal.slice(end);
  }
  const find = lf(edit.find);
  const n = count(normal, find);
  if (n !== 1) {
    throw miss(n);
  }
  const at = normal.indexOf(find);
  return normal.slice(0, at) + lf(edit.replace) + normal.slice(at + find.length);
}

/** @returns {string[]} Ids of every variant manifest, sorted. */
export function listVariants() {
  return readdirSync(VARIANTS_DIR).filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5)).sort();
}

/**
 * Manifests of the chain, ancestors first (depth first, each ancestor once).
 * @param {string} id
 * @param {(id: string) => Manifest} load
 * @returns {Manifest[]}
 */
function chainOf(id, load) {
  /** @type {Manifest[]} */
  const out = [];
  const done = new Set();
  const visiting = new Set();
  const visit = (/** @type {string} */ v) => {
    if (done.has(v)) {
      return;
    }
    if (visiting.has(v)) {
      throw new Error(`variant ${v} extends itself`);
    }
    visiting.add(v);
    const m = load(v);
    for (const parent of m.extends ?? []) {
      visit(parent);
    }
    visiting.delete(v);
    done.add(v);
    out.push(m);
  };
  visit(id);
  return out;
}

/** @param {Map<string, string | Buffer>} map @param {string} dir @param {string} root @param {(label: string) => boolean} skip */
function readTree(map, dir, root, skip) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const entry of entries) {
    const path = join(dir, entry.name);
    const label = relative(root, path).split(sep).join('/');
    if (skip(label)) {
      continue;
    }
    if (entry.isDirectory()) {
      readTree(map, path, root, skip);
    } else if (entry.isFile()) {
      const bytes = readFileSync(path);
      map.set(label, bytes.includes(0) ? bytes : lf(bytes.toString('utf8')));
    }
  }
}

/** @returns {Map<string, string | Buffer>} core/, tools/ (without tools/ig-proto/) and package.json, texts LF-normalised. */
export function collectSources() {
  /** @type {Map<string, string | Buffer>} */
  const map = new Map();
  for (const dir of ['core', 'tools']) {
    readTree(map, join(ROOT, dir), ROOT, (label) => label === 'tools/ig-proto');
  }
  map.set('package.json', lf(readFileSync(join(ROOT, 'package.json'), 'utf8')));
  return map;
}

/**
 * @typedef {object} PlanOptions
 * @property {Record<string, Manifest>} [manifests] Synthetic manifests (tests).
 * @property {string} [filesRoot] Folder of the copy-only files (tests).
 * @property {string} [paramRoot] Folder the `paramFiles` paths are relative to (tests; default tools/ig-proto).
 * @property {Map<string, string | Buffer>} [sources]
 * @property {string[]} [errors] When given, a failing edit is reported here and skipped (check-edits).
 */

/**
 * Resolves a variant and applies its edits in memory.
 * @param {string} id
 * @param {PlanOptions} [opts]
 */
export function planTree(id, opts = {}) {
  const load = (/** @type {string} */ v) => {
    const manifest = opts.manifests?.[v] ?? JSON.parse(readFileSync(join(VARIANTS_DIR, `${v}.json`), 'utf8'));
    if (manifest.id !== v) {
      throw new Error(`manifest ${v} names itself ${manifest.id}`);
    }
    return /** @type {Manifest} */ (manifest);
  };
  const chain = chainOf(id, load);
  const sources = opts.sources ?? collectSources();
  const files = new Map(sources);
  const fail = (/** @type {string} */ message) => {
    if (opts.errors === undefined) {
      throw new Error(message);
    }
    opts.errors.push(message);
  };
  /** @type {{ id: string, file: string, before: string, after: string }[]} */
  const edits = [];
  const apply = (/** @type {Edit} */ edit) => {
    const text = files.get(edit.file);
    if (typeof text !== 'string') {
      fail(`edit ${edit.id} (${id}): ${edit.file} is not a text file of the copy`);
      return;
    }
    try {
      const next = applyEdit(text, edit, id);
      edits.push({ id: edit.id, file: edit.file, before: sha256(text), after: sha256(next) });
      files.set(edit.file, next);
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  };

  /** @type {Map<string, string | Buffer>} */
  const added = new Map();
  const filesRoot = opts.filesRoot ?? FILES_DIR;
  /** @type {Record<string, unknown>} */
  const paramData = {};
  /** @type {Record<string, string>} */
  const paramHashes = {};
  for (const m of chain) {
    for (const [name, path] of Object.entries(m.paramFiles ?? {})) {
      const file = join(opts.paramRoot ?? IG_DIR, ...String(path).split('/'));
      if (!existsSync(file)) {
        fail(`variant ${m.id}: parameter file ${path} does not exist`);
        continue;
      }
      const text = lf(readFileSync(file, 'utf8'));
      const parsed = JSON.parse(text);
      paramData[name] = parsed.cells ?? parsed;
      paramHashes[name] = sha256(text);
    }
    for (const name of m.files ?? []) {
      const dir = join(filesRoot, name);
      if (!existsSync(dir)) {
        fail(`variant ${m.id}: files folder ${name} does not exist`);
        continue;
      }
      /** @type {Map<string, string | Buffer>} */
      const found = new Map();
      readTree(found, dir, dir, () => false);
      for (const [path, content] of found) {
        if (sources.has(path) || added.has(path)) {
          fail(`variant ${m.id}: file ${name}/${path} would overwrite a file of the copy`);
          continue;
        }
        added.set(path, content);
      }
    }
  }
  /** @type {Record<string, unknown>} */
  const params = Object.assign({}, ...chain.map((m) => m.params ?? {}), paramData, { variant: id });
  if (id !== 'base') {
    const text = `// @ts-check\n// Generated by tools/ig-proto/lib/tree.mjs for the variant "${id}"; do not edit.\n`
      + `export const IG = Object.freeze(${JSON.stringify(params, null, 2)});\n`;
    added.set('core/engine/ig-params.js', text);
  }

  apply(/** @type {Edit} */ (META_1));
  for (const m of chain) {
    for (const edit of m.edits ?? []) {
      apply(edit);
    }
  }
  if (id !== 'base') {
    const names = [...added.keys()].filter((p) => p.startsWith('core/engine/')).sort();
    apply({
      id: 'meta-2',
      file: 'tools/bench/report.js',
      find: SOURCE_FILES_TAIL,
      replace: `${SOURCE_FILES_TAIL.slice(0, SOURCE_FILES_TAIL.indexOf(']);'))}  ${names.map((n) => `'${n}'`).join(', ')},\n]);\n`,
    });
  }
  for (const [path, content] of added) {
    files.set(path, content);
  }

  const addedHashes = Object.fromEntries([...added].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, c]) => [p, sha256(c)]));
  const sourceHashes = [...sources].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, c]) => [p, sha256(c)]);
  const treeId = sha256(JSON.stringify({
    v: 1, meta: [META_1, SOURCE_FILES_TAIL], sources: sourceHashes, manifests: chain, added: addedHashes,
    ...(Object.keys(paramHashes).length === 0 ? {} : { paramFiles: paramHashes }),
  }));
  return { id, chain: chain.map((m) => m.id), treeId, files, added: addedHashes, edits, params };
}

/**
 * Writes a tree. Nothing is written when an edit does not match.
 * @param {string} id
 * @param {PlanOptions & { dest?: string, sourceLabel?: string }} [opts]
 */
export async function buildTree(id, opts = {}) {
  const plan = planTree(id, opts);
  const dest = opts.dest ?? treeDir(id);
  rmSync(dest, { recursive: true, force: true });
  for (const [path, content] of plan.files) {
    const target = join(dest, ...path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  const report = await import(pathToFileURL(join(dest, 'tools', 'bench', 'report.js')).href);
  const copyDigest = await report.computeSourceDigest((/** @type {string} */ p) => readFileSync(join(dest, ...p.split('/')), 'utf8'));
  const sourceDigest = await worktreeDigest();
  if (id === 'base' && copyDigest !== sourceDigest) {
    rmSync(dest, { recursive: true, force: true });
    throw new Error(`the base copy's digest ${copyDigest} differs from the worktree's ${sourceDigest}`);
  }
  const info = {
    format: 'ig-proto-tree',
    version: 1,
    variant: id,
    chain: plan.chain,
    treeId: plan.treeId,
    worktree: { sourceLabel: opts.sourceLabel ?? argValue('source-label') ?? 'unlabelled', sourceDigest, versions: worktreeVersions() },
    copyDigest,
    edits: plan.edits,
    files: plan.added,
    params: plan.params,
    builtAt: new Date().toISOString(),
  };
  writeJson(join(dest, 'ig-tree.json'), info);
  return { ...info, root: dest, built: true };
}

/**
 * Reuses a tree whose ig-tree.json has the current treeId; otherwise deletes it and builds it again.
 * @param {string} id
 * @param {PlanOptions & { dest?: string, sourceLabel?: string }} [opts]
 */
export async function ensureTree(id, opts = {}) {
  const plan = planTree(id, opts);
  const dest = opts.dest ?? treeDir(id);
  const file = join(dest, 'ig-tree.json');
  if (existsSync(file)) {
    const info = JSON.parse(readFileSync(file, 'utf8'));
    if (info.treeId === plan.treeId) {
      return { ...info, root: dest, built: false };
    }
  }
  return buildTree(id, opts);
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  const { rest: ids } = parseArgs(rest.filter((a) => a !== '--all'), { values: ['label', 'source-label'] });
  const all = rest.includes('--all');
  if (command === 'list') {
    for (const id of listVariants()) {
      const chain = planTree(id, { errors: [] }).chain;
      process.stdout.write(`${id}: ${chain.join(' > ')}\n`);
    }
    return 0;
  }
  if (command === 'build') {
    for (const id of ids) {
      const info = await ensureTree(id);
      process.stdout.write(`${id} ${info.treeId} ${info.copyDigest} ${info.built ? 'built' : 'reused'}\n`);
    }
    return 0;
  }
  if (command === 'check-edits') {
    let failures = 0;
    const sources = collectSources();
    for (const id of all ? listVariants() : ids) {
      /** @type {string[]} */
      const errors = [];
      const plan = planTree(id, { errors, sources });
      for (const e of errors) {
        process.stdout.write(`${e}\n`);
      }
      failures += errors.length;
      if (errors.length === 0) {
        process.stdout.write(`ok ${id}: ${plan.edits.length} edits match\n`);
      }
    }
    return failures > 0 ? 1 : 0;
  }
  process.stderr.write('usage: tree.mjs build <id>... | check-edits --all|<id>... | list\n');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`tree: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}

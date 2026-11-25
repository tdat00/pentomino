// @ts-check
// SA-Opus, break-tasks of improve-generating-stages-2-4: checks the variant manifests that the task files of
// tasks/improve-generating-stages-2-4/ give verbatim (every ```json block whose object has an "id" and an "extends"
// array), in memory, with the harness's own lib/tree.mjs planTree on the frozen sources: each anchored edit must occur
// once, as check-edits requires, and the count of edits is printed like check-edits. Then it evaluates the appended
// helper functions of the pack (fz-2, fz-4) on stub parameters. Read-only: nothing is written; unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-variants.mjs --label frozen
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const tree = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'tree.mjs')).href);
const PACK = join(ROOT, 'tasks', 'improve-generating-stages-2-4');

/** @type {Record<string, any>} */
const manifests = {};
/** @type {Record<string, string>} */
const origin = {};
/** @type {{ addTo: string, edits: any[], file: string }[]} */
const additions = [];
// `--draft` checks the manifests of bt-live.mjs (they replace the task files' blocks of the same ids) before they are
// copied into the task files.
const draftMode = process.argv.includes('--draft');
if (draftMode) {
  const draft = await import(pathToFileURL(join(ROOT, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-opus', 'bt-live.mjs')).href);
  for (const m of [draft.live, draft.liveTest, ...draft.frozen, ...draft.tests]) {
    manifests[m.id] = structuredClone(m);
    origin[m.id] = 'bt-live.mjs';
  }
  additions.push({ ...structuredClone(draft.liveAdd), file: 'bt-live.mjs' });
}
for (const file of readdirSync(PACK).filter((n) => n.endsWith('.md')).sort()) {
  const text = readFileSync(join(PACK, file), 'utf8').replace(/\r\n/g, '\n');
  for (const m of text.matchAll(/^( *)```json\n([\s\S]*?)\n\1```$/gm)) {
    const indent = m[1].length;
    const body = m[2].split('\n').map((l) => l.slice(Math.min(indent, l.length - l.trimStart().length))).join('\n');
    /** @type {any} */
    let obj;
    try {
      obj = JSON.parse(body);
    } catch {
      continue;
    }
    if (obj !== null && typeof obj.id === 'string' && Array.isArray(obj.extends)) {
      if (draftMode && origin[obj.id] === 'bt-live.mjs') {
        continue;
      }
      if (manifests[obj.id] !== undefined) {
        throw new Error(`${obj.id} is given twice: ${origin[obj.id]} and ${file}`);
      }
      manifests[obj.id] = obj;
      origin[obj.id] = file;
    } else if (obj !== null && typeof obj.addTo === 'string' && Array.isArray(obj.edits)) {
      if (!(draftMode && origin[obj.addTo] === 'bt-live.mjs')) {
        additions.push({ ...obj, file });
      }
    }
  }
}
for (const a of additions) {
  if (manifests[a.addTo] === undefined) {
    throw new Error(`${a.file} adds edits to ${a.addTo}, which no block defines`);
  }
  manifests[a.addTo].edits.push(...a.edits);
}

const sources = tree.collectSources();
let bad = 0;
const vm = await import('node:vm');
/** @type {any} */
const SourceTextModule = /** @type {any} */ (vm).SourceTextModule;
for (const id of Object.keys(manifests).sort()) {
  /** @type {string[]} */
  const errors = [];
  const plan = tree.planTree(id, { errors, manifests, sources });
  // The parameter file of T06a does not exist before T06a runs: reported apart, never an anchor error.
  const pending = errors.filter((e) => /parameter file data\/prior-s3-v1\.json does not exist/.test(e));
  const real = errors.filter((e) => !pending.includes(e));
  // With node --experimental-vm-modules, every file an edit of this pack touches is parsed as a module (syntax only).
  if (SourceTextModule !== undefined) {
    const touched = new Set((manifests[id].edits ?? []).map((/** @type {any} */ e) => e.file));
    for (const m of plan.chain) {
      for (const e of manifests[m]?.edits ?? []) {
        touched.add(e.file);
      }
    }
    for (const file of touched) {
      try {
        new SourceTextModule(String(plan.files.get(file)), { identifier: `${id}/${file}` });
      } catch (e) {
        real.push(`syntax of ${file}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  bad += real.length;
  for (const e of real) {
    process.stdout.write(`ERROR ${id} (${origin[id]}): ${e}\n`);
  }
  const ids = plan.edits.map((/** @type {any} */ e) => e.id);
  process.stdout.write(`${real.length === 0 ? 'ok' : 'FAIL'} ${id}: ${plan.edits.length} edits match${pending.length > 0 ? ' (prior-s3-v1.json pending T06a)' : ''}; chain ${plan.chain.join(' > ')}; own edits ${(manifests[id].edits ?? []).map((/** @type {any} */ e) => e.id).join(',') || '-'}; last ${ids.slice(-3).join(',')}\n`);
}

/**
 * The function an append edit declares, evaluated with stub imports (the `import` lines are removed, `export` dropped).
 * @param {string} variant
 * @param {string} editId
 * @param {string} name
 * @param {Record<string, any>} imports The local names of the removed imports.
 * @returns {any}
 */
function appended(variant, editId, name, imports) {
  const edit = manifests[variant]?.edits?.find((/** @type {any} */ e) => e.id === editId);
  if (edit === undefined) {
    return undefined;
  }
  const body = String(edit.append).split('\n').filter((l) => !l.startsWith('import ')).join('\n').replace(/^export /gm, '');
  return new Function(...Object.keys(imports), `${body}\nreturn ${name};`)(...Object.values(imports));
}

/** @param {boolean} ok @param {string} what */
const check = (ok, what) => {
  bad += ok ? 0 : 1;
  process.stdout.write(`${ok ? 'ok' : 'FAIL'} ${what}\n`);
};

const igModeBudget = appended('p5-mode', 'fz-2', 'igModeBudget', { IG_FZ: {} });
if (igModeBudget !== undefined) {
  const T = { id: 'budget-test', any: { nightmare: 10, 'hell-1': 40 }, require: { nightmare: 32, 'hell-1': 0 } };
  const c = (/** @type {string} */ u, /** @type {string} */ id) => ({ uniqueness: u, target: { id, min: 53, max: 77 } });
  check(igModeBudget(c('any', 'nightmare'), T).igBudget === 10, 'fz-2 any/nightmare 10');
  check(igModeBudget(c('any', 'hell-1'), T).igBudget === 40, 'fz-2 any/hell-1 40');
  check(igModeBudget(c('require', 'nightmare'), T).igBudget === 32, 'fz-2 require/nightmare 32');
  check(igModeBudget(c('require', 'hell-1'), T).igBudget === Infinity, 'fz-2 require/hell-1 0 -> Infinity');
  check(igModeBudget(c('any', 'st-band'), T).igBudget === Infinity, 'fz-2 absent -> Infinity');
  const x = { ...c('any', 'nightmare'), igBudget: 5 };
  check(igModeBudget(x, T) === x, 'fz-2 the seam wins');
  const y = c('any', 'nightmare');
  check(igModeBudget(y, null) === y && igModeBudget(y, { default: 2000000000 }) === y && igModeBudget(y) === y, 'fz-2 inert');
  igModeBudget(y, T);
  check(!('igBudget' in y), 'fz-2 does not mutate');
}
const igPerSetLevel = appended('ps-levels', 'fz-4', 'igPerSetLevel', { IG_PSL: {} });
if (igPerSetLevel !== undefined) {
  check(igPerSetLevel('hell-1', ['hell-1']) === true && igPerSetLevel('nightmare', ['hell-1']) === false
    && igPerSetLevel('hell-1', []) === false && igPerSetLevel('hell-1', null) === true
    && igPerSetLevel('nightmare', 'hell-1') === false && igPerSetLevel('nightmare') === true, 'fz-4 rule table');
}
const igLiveOf = appended('live', 'lv-9', 'igLiveOf', { IG_LIVE: {} });
if (igLiveOf !== undefined) {
  const clock = { now: () => 5000 };
  const T = { id: 'deadline-test', levels: ['hard'], reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 };
  const same = (/** @type {any} */ a, /** @type {any} */ b) => JSON.stringify(a) === JSON.stringify(b);
  check(same(igLiveOf({ igOrigin: 1000 }, 'hard', clock, T), { origin: 1000, setCutAt: 47000 }), 'lv-9 listed level with an origin');
  check(igLiveOf({ igOrigin: 1000 }, 'easy', clock, T) === null, 'lv-9 unlisted level');
  check(igLiveOf({}, 'hard', clock, T) === null && igLiveOf({ igOrigin: Number.NaN }, 'hard', clock, T) === null, 'lv-9 no origin');
  check(igLiveOf({ igOrigin: 5001 }, 'hard', clock, T) === null && same(igLiveOf({ igOrigin: 5000 }, 'hard', clock, T), { origin: 5000, setCutAt: 51000 }), 'lv-9 a later origin is refused, now is accepted');
  check(igLiveOf({ igOrigin: 1000 }, 'hard', clock) === null && igLiveOf({ igOrigin: 1000 }, 'hard', clock, null) === null, 'lv-9 inert without the parameter');
  check(igLiveOf({ igOrigin: 1000 }, 'hard', clock, { ...T, setStageCapMs: undefined }) === null, 'lv-9 no set-stage cap is no live deadline');
}
process.stdout.write(bad === 0 ? `bt-variants: ${Object.keys(manifests).length} manifests, every check passed\n` : `bt-variants: ${bad} failures\n`);
process.exitCode = bad === 0 ? 0 : 1;

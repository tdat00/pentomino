// @ts-check
// SA-Opus, review 2 of the stages 2 to 4 pack (R2-02): checks the host's hard bound of T07b without an engine run.
// (1) It evaluates the function `igBoundStart` that the edit lv-14 appends to tools/bench/runner.js (taken from
// bt-live.mjs, the source of T07b's JSON block), with a stub IG.liveDeadline, the fake clock of lib/fake-pool.mjs and
// controlled promises: a held set or batch ends at t0 + 119000 ms, the batch with the client's prefix snapshot, never
// awaiting the held promise; a result that settles first is returned unchanged. (2) It composes the `live` tree's
// core/browser/generation-client.js in memory (lib/tree.mjs planTree on the frozen sources) and checks that the prefix
// snapshot of lv-16 builds its pack from the same parts as the client's own final assembly. Read-only; unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-bound.mjs
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const draft = await import(pathToFileURL(join(ROOT, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-opus', 'bt-live.mjs')).href);
const { createFakeClock, settle } = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'fake-pool.mjs')).href);
const tree = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'tree.mjs')).href);

let failed = 0;
/** @param {boolean} ok @param {string} what */
const check = (ok, what) => {
  process.stdout.write(`${ok ? 'ok' : 'FAIL'} ${what}\n`);
  if (!ok) {
    failed += 1;
  }
};
/** @param {Promise<any>} p */
const track = (p) => {
  /** @type {{ state: string, value?: any, error?: any, at?: number }} */
  const out = { state: 'pending' };
  p.then((value) => Object.assign(out, { state: 'resolved', value }), (error) => Object.assign(out, { state: 'rejected', error }));
  return out;
};

const lv14 = draft.liveAdd.edits.find((/** @type {any} */ e) => e.id === 'lv-14');
const body = String(lv14.append).split('\n').filter((l) => !l.startsWith('import ')).join('\n').replace(/^export /gm, '');
const DEADLINE = { id: 'deadline-test', levels: ['hard'], reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 };
/** @type {(s: any, caseDef: any, clock: any, client: any) => any} */
const igBoundStart = new Function('IG_HOST', `${body}\nreturn igBoundStart;`)({ liveDeadline: DEADLINE });

/** A client stub: counts cancels; igPrefix returns `prefix` (a function is called). @param {any} prefix */
const stub = (prefix) => {
  const c = { cancels: 0, cancel() { c.cancels += 1; }, igPrefix: () => (typeof prefix === 'function' ? prefix() : prefix) };
  return c;
};
const SNAP = { status: 'partial', reason: 'response-bound', accepted: [{ id: 'p1' }], made: { p1: {} }, seenLayouts: ['l1'], seenClues: ['c1'], pack: { ok: true } };
const BOUND_SET = { status: 'failed', reason: 'response-bound', failures: {} };

{
  const clock = createFakeClock();
  const client = stub(SNAP);
  const b = igBoundStart({ t0: clock.now() }, { levelId: 'easy' }, clock, client);
  const p = Promise.resolve(1);
  check(b.set(p) === p && b.batch(p) === p, 'an unlisted level returns the promises unchanged');
  clock.advance(200000);
  check(client.cancels === 0, 'an unlisted level sets no timer');
}
{
  const clock = createFakeClock();
  const client = stub(SNAP);
  const s = { t0: clock.now() };
  const b = igBoundStart(s, { levelId: 'hard' }, clock, client);
  const r = track(b.set(new Promise(() => {})).then((v) => { r.at = clock.now() - s.t0; return v; }));
  clock.advance(118999);
  await settle();
  check(r.state === 'pending', 'a held set is pending at t0 + 118999');
  clock.advance(1);
  await settle();
  check(r.state === 'resolved' && JSON.stringify(r.value) === JSON.stringify(BOUND_SET) && r.at === 119000, `a held set ends at t0 + 119000 with response-bound (${r.state}, ${r.at})`);
  check(client.cancels === 1, 'the client is cancelled once at the bound');
  clock.advance(1000);
  await settle();
  check(r.at === 119000 && client.cancels === 1, 'driving the clock through 120 s changes nothing');
  b.clear();
}
{
  const clock = createFakeClock();
  const client = stub(SNAP);
  const s = { t0: clock.now() };
  const b = igBoundStart(s, { levelId: 'hard' }, clock, client);
  /** @type {(v: any) => void} */
  let release = () => {};
  const held = new Promise((resolve) => { release = resolve; });
  const r = track(b.batch(held).then((v) => { r.at = clock.now() - s.t0; return v; }));
  clock.advance(119000);
  await settle();
  check(r.state === 'resolved' && r.value === SNAP && r.at === 119000, `a held batch ends at t0 + 119000 with the prefix snapshot (${r.state}, ${r.at})`);
  clock.advance(6000);
  release({ status: 'partial', reason: 'time-limit', accepted: [] });
  await settle();
  check(r.value === SNAP && client.cancels === 1, 'releasing the held batch at t0 + 125000 changes nothing');
  b.clear();
}
{
  const clock = createFakeClock();
  const b = igBoundStart({ t0: clock.now() }, { levelId: 'hard' }, clock, stub(null));
  const r = track(b.batch(new Promise(() => {})));
  clock.advance(119000);
  await settle();
  check(r.state === 'rejected' && /no batch prefix/.test(String(r.error?.message)), 'a batch without a prefix snapshot is a fault, not an invented result');
  b.clear();
}
{
  const clock = createFakeClock();
  const b = igBoundStart({ t0: clock.now() }, { levelId: 'hard' }, clock, stub(() => { throw new Error('invalid pack'); }));
  const r = track(b.batch(new Promise(() => {})));
  clock.advance(119000);
  await settle();
  check(r.state === 'rejected' && r.error?.message === 'invalid pack', 'a failing snapshot rejects the batch with its error');
  b.clear();
}
{
  const clock = createFakeClock();
  const client = stub(SNAP);
  const b = igBoundStart({ t0: clock.now() }, { levelId: 'hard' }, clock, client);
  const value = { status: 'complete', accepted: [] };
  const r = track(b.batch(new Promise((resolve) => clock.setTimeout(() => resolve(value), 60000))));
  clock.advance(60000);
  await settle();
  b.clear();
  clock.advance(100000);
  await settle();
  check(r.state === 'resolved' && r.value === value && client.cancels === 0, 'a batch that settles first is returned unchanged; the cleared timer never fires');
}
{
  const clock = createFakeClock();
  const b = igBoundStart({ t0: clock.now() }, { levelId: 'hard' }, clock, stub(SNAP));
  const r = track(b.set(Promise.reject(new Error('fault'))));
  await settle();
  check(r.state === 'rejected' && r.error?.message === 'fault', 'a set fault before the bound is propagated');
  b.clear();
}
{
  const clock = createFakeClock();
  const client = stub(SNAP);
  const s = { t0: clock.now() };
  const b = igBoundStart(s, { levelId: 'hard' }, clock, client);
  clock.advance(119000);
  const r = track(b.batch(new Promise(() => {})));
  await settle();
  check(r.state === 'resolved' && r.value === SNAP && client.cancels === 2, 'a batch called after the bound is cancelled and cut at once');
  b.clear();
}

// (2) The snapshot's pack parts are the client's own final assembly's parts.
const manifests = {};
for (const m of [draft.live, draft.liveTest]) {
  manifests[m.id] = structuredClone(m);
}
manifests.live.edits.push(...structuredClone(draft.liveAdd.edits));
const sources = tree.collectSources();
/** @type {string[]} */
const errors = [];
const plan = tree.planTree('live', { errors, manifests, sources });
check(errors.length === 0, `the live tree composes (${errors.join('; ') || 'no error'})`);
const client = String(plan.files.get('core/browser/generation-client.js')).replace(/\r\n/g, '\n');
/** @param {string} text @param {string} from */
const partsAfter = (text, from) => {
  const i = text.indexOf(from);
  if (i < 0) {
    return null;
  }
  const open = text.indexOf('({', i);
  let depth = 0;
  for (let k = open; k < text.length; k += 1) {
    if (text[k] === '(') {
      depth += 1;
    } else if (text[k] === ')') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(open + 1, k).split('\n').map((l) => l.trim()).filter((l) => l !== '').join('\n');
      }
    }
  }
  return null;
};
const own = partsAfter(client, '      result.pack = await assemblePack(');
const snap = partsAfter(client, '          checked = igValidatePack(createPack(');
check(own !== null && snap !== null, 'both assemblies were found in the composed client');
check(own !== null && snap !== null && snap.replace('puzzles: accepted.slice(),', 'puzzles: accepted,') === own.replace(/\n\}, detail\(\)$/, '\n}').replace(/, detail\(\)$/, ''),
  'the snapshot builds its pack from the same parts as the final assembly');
check(client.includes("import { validatePack as igValidatePack } from '../engine/pack.js';"), 'the snapshot imports the synchronous validator');
check((client.match(/options\.igAssemblyGate/g) ?? []).length === 4, 'the assembly gate is read at the set and the batch assembly only');
process.stdout.write(`bt-bound: ${failed === 0 ? 'every check passed' : `${failed} check(s) failed`}\n`);
process.exitCode = failed === 0 ? 0 : 1;

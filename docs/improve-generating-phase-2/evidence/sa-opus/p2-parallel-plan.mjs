// @ts-check
// SA-Opus: the phase-2 parallel execution plan, revision 2 (check-list §3.7; sa-opus/parallel-schedule.md).
// Revision 2 applies review-2: P2-13v, P2-13e and P2-13f are new; P2-16c starts after P2-12d; the proof runner moves to
// P2-12b; P2-16a no longer runs gate 2. The model is a scenario, not a delivery promise (review-2 §8).
// Unlocked and engine-free. Usage: node docs\improve-generating-phase-2\evidence\sa-opus\p2-parallel-plan.mjs
// Part 1 checks the start conditions of check-list §1 and gives each task's remaining path (its tail).
// Part 2 lists every pair of tasks that the start conditions leave unordered (they may run at the same time) and that
// edit a common file, with the region each edits (lines and sections at 97a6326 unless named by an anchor).
// Part 3 models the developer phase under the machine-wide test lock. Assumptions: a task's non-lock time is r x its
// estimate (r = 0.15 or 0.25); a locked run holds the lock for the 45-s quiet period plus its node time, first come
// first served; a task makes two focused runs (30 s each), its special runs, and the full suite (145 s) only at the four
// full-suite points; the orchestrator reviews it (5 min), then merges one task at a time: 1 min of rebase, the merge
// gate's locked run (the focused gate, 30 s; the full suite at a full-suite point; the phase-2 test files, 3 min, for a
// task under tools/ig-proto/phase2/), 1.5 min of static checks. At most three developers (lanes S, C, T) and five slots;
// a slot is held from a task's start to its merge. No fix round, no question wait, no Sudoku run, no idle declaration.

const DD = 'docs/design-detail.md';
const GC = 'core/browser/generation-client.js';
const GCT = 'tests/generation-client.test.js';
const GT = 'tests/generate.test.js';
const RJ = 'tools/bench/runner.js';
const RP = 'tools/bench/report.js';
const DG = 'DEVELOPERGUIDE.md';
const DGV = 'DEVELOPERGUIDE.vn.md';
const PH = 'tools/ig-proto/phase2/';
const SEL = 'core/engine/select-v4.js';
const SELT = 'tests/select-v4.test.js';

/**
 * @type {Record<string, { est: number, lane: 'S' | 'C' | 'T' | 'J', deps: string[], files: Record<string, string>,
 *   special?: number[], full?: boolean }>}
 */
const TASKS = {
  'P2-01': { est: 2.5, lane: 'S', deps: [], files: { 'core/engine/gen-v4.js': 'new', 'tests/gen-v4.test.js': 'new', [RP]: 'line 39', [DD]: 'line 169; §7.6 end' } },
  'P2-02': { est: 2, lane: 'S', deps: ['P2-01'], full: true, files: { 'core/engine/clue-primitives.js': 'new', 'core/engine/clues.js': 'move, dispatcher', 'tests/clue-primitives.test.js': 'new', [RP]: 'line 38', [DD]: 'line 169; lines 555-590' } },
  'P2-03': { est: 2.5, lane: 'T', deps: [], files: { 'core/engine/difficulty.js': 'append', 'tests/screen-rating.test.js': 'new', [DD]: '§7.9 end' } },
  'P2-04': { est: 3, lane: 'S', deps: ['P2-02', 'P2-03'], files: { [SEL]: 'new', 'core/engine/clues.js': 'dispatcher body', [SELT]: 'new', [RP]: 'line 43', [DD]: '§6.10 end' } },
  'P2-05a': { est: 3, lane: 'S', deps: ['P2-04'], files: { [SELT]: 'vector cases', [SEL]: 'defects only' } },
  'P2-05b': { est: 2.5, lane: 'S', deps: ['P2-05a'], special: [5], files: { [SELT]: 'budget, event and skip cases', [SEL]: 'defects only', 'docs/improve-generating-phase-2/evidence/P2-05b/': 'new' } },
  'P2-14a': { est: 1.5, lane: 'S', deps: ['P2-01'], special: [1, 1], files: { 'tools/record-fixtures.mjs': 'modes', [GT]: 'inside the record-fixtures test (lines 901-921)', [DG]: 'fixtures paragraph end (line 124)', [DGV]: 'fixtures paragraph end (line 123)' } },
  'P2-06': { est: 2.75, lane: 'C', deps: ['P2-01'], full: true, files: { 'core/engine/generate.js': 'failureOf, results', 'core/engine/types.js': 'typedefs', [GC]: 'the gen-v4 import line; setBound; generateSet callbacks and loop; batch counter lines', [GT]: 'after the test "lazy certification ..." (line 689)', [GCT]: 'end of file', [DD]: '§6.5 end; §6.9 end' } },
  'P2-07': { est: 2.5, lane: 'C', deps: ['P2-06'], files: { 'core/engine/generate.js': 'import; setAttempt; puzzleCandidate; runFold', 'core/engine/tasks.js': 'puzzleCandidate task', 'core/engine/protocol.js': 'payload', 'core/engine/types.js': 'BatchContext', [GC]: 'one line after `const base` (852-860); the dispatch (903)', 'tests/protocol.test.js': 'after line 263', 'tests/tasks.test.js': 'after line 92', [GCT]: 'after the test at line 740', [GT]: 'end of describe "calibration reuse ..." (335-391)', [DD]: '§6.9 end' } },
  'P2-08': { est: 2.75, lane: 'C', deps: ['P2-07'], files: { 'core/engine/generate.js': 'import; provenanceVersions; made', 'core/engine/pack.js': 'family', 'core/engine/replay.js': 'lines 180, 436', 'core/engine/types.js': 'typedefs', 'generator/ui/replay-cache.js': 'key', 'tests/pack.test.js': 'end', 'tests/replay.test.js': 'end', [GT]: 'after the test "lazy certification ..." (line 689)', 'tests/replay-model.test.js': 'after line 1316', [DD]: '§7.7 end' } },
  'P2-10': { est: 2.5, lane: 'C', deps: ['P2-06'], files: { 'core/browser/worker-pool.js': 'beginRequest', [GC]: 'typedefs; checkSet/checkBatch; begin (470-497); newScope; generateSet; line 850; the client object', 'tools/generate.mjs': 'cliScope; run 548-577', [RJ]: 'generate() 535-590; import after line 10', [DD]: '§8.4 end', 'tests/worker-pool.test.js': 'end', [GCT]: 'end of file', 'tests/cli.test.js': 'end' } },
  'P2-11a': { est: 2, lane: 'C', deps: ['P2-10'], files: { 'core/browser/generation-deadline.js': 'new', [GC]: 'options typedef (450); finishSet 735; after `detail` (879); batch assembly 1185-1204; the client object; typedefs; import line 14', [RP]: 'line 46', [DD]: '§8.4 end', 'tests/generation-deadline.test.js': 'new', [GCT]: 'end of file' } },
  'P2-11b': { est: 2.5, lane: 'C', deps: ['P2-11a'], files: { 'generator/jobs.js': 'generateSet, addMore', 'tools/generate.mjs': 'run', [RJ]: 'generate()', [DD]: '§8.4 end', 'tests/generator-controller.test.js': 'fakeClient (70-109); end' } },
  'P2-09': { est: 2.75, lane: 'C', deps: ['P2-08', 'P2-11b'], files: { 'core/engine/types.js': 'ClueEvent', 'core/engine/replay.js': 'step builder', 'generator/ui/replay-model.js': 'stepText', 'generator/locale.en.js': 'keys', 'generator/locale.vi.js': 'keys', 'generator/jobs.js': 'N-NOSET variant; batchShortfall', 'docs/design-brief.md': 'line 100', [DD]: '§6.12 end', 'tests/replay-model.test.js': 'end', 'tests/replay-recorders.test.js': 'end', 'tests/generator-controller.test.js': 'end' } },
  'P2-12a': { est: 2, lane: 'C', deps: ['P2-06'], files: { [RJ]: 'checkCase 174-176; fillRecord after line 631, JSDoc', 'tests/benchmark-matrix.test.js': 'end', 'tests/calibration.test.js': 'end', [DG]: 'calibrate bullet end (line 80)', [DGV]: 'calibrate bullet end (line 81)' } },
  'P2-13r': { est: 1.5, lane: 'T', deps: [], files: { [`${PH}trace-reader.mjs`]: 'new', [`${PH}trace-reader.test.mjs`]: 'new' } },
  'P2-13v': { est: 2.5, lane: 'T', deps: [], files: { [`${PH}binding.mjs`]: 'new', [`${PH}binding.test.mjs`]: 'new' } },
  'P2-16e': { est: 2, lane: 'T', deps: [], special: [2], files: { [`${PH}browser-run.mjs`]: 'new', [`${PH}browser-run.test.mjs`]: 'new', [`${PH}fixtures/browser-selftest.*`]: 'new' } },
  'P2-13a': { est: 3, lane: 'T', deps: ['P2-13r'], files: { [`${PH}p2.mjs`]: 'new', [`${PH}run-group.ps1`]: 'new', [`${PH}fixtures/fake-invoker.ps1`]: 'new', [`${PH}p2.test.mjs`]: 'new' } },
  'P2-13d': { est: 3, lane: 'T', deps: ['P2-13a'], files: { [`${PH}p2.mjs`]: 'run-group, status, publish', [`${PH}gates.mjs`]: 'stub', [`${PH}p2.test.mjs`]: 'cases' } },
  'P2-13e': { est: 3, lane: 'T', deps: ['P2-13d', 'P2-13v'], files: { [`${PH}p2.mjs`]: 'seal, records, resume, publish, loadSnapshot', [`${PH}p2.test.mjs`]: 'cases' } },
  'P2-13b': { est: 3, lane: 'T', deps: ['P2-13e'], files: { [`${PH}p2.mjs`]: 'report', [`${PH}gates.mjs`]: 'gates', [`${PH}p2.test.mjs`]: 'cases' } },
  'P2-13c': { est: 3, lane: 'T', deps: ['P2-13b'], files: { [`${PH}p2.mjs`]: 'twins', [`${PH}p5.mjs`]: 'new', [`${PH}gates.mjs`]: 'B8', [`${PH}p2.test.mjs`]: 'cases' } },
  'P2-13f': { est: 2, lane: 'T', deps: ['P2-13c'], files: { [`${PH}glue-reach.mjs`]: 'new', [`${PH}p2.mjs`]: 'report readings', [`${PH}p2.test.mjs`]: 'cases' } },
  'P2-12b': { est: 3, lane: 'J', deps: ['P2-05b', 'P2-11b', 'P2-13r'], files: { [`${PH}proofs.mjs`]: 'new', [`${PH}copies.mjs`]: 'new', [`${PH}copies.test.mjs`]: 'new', [`${PH}variants/p2-gen4.json`]: 'new', [`${PH}variants/p2-today.json`]: 'new', [`${PH}variants/(other copies)`]: 'new' } },
  'P2-12d': { est: 3, lane: 'J', deps: ['P2-12b', 'P2-08'], special: [3], files: { [`${PH}files/p2-trace/`]: 'new', [`${PH}files/p2-link/`]: 'new', [`${PH}variants/p2-link.json, p2-trace*.json`]: 'new', [`${PH}variants/p2-gen4.json`]: 'extends', [`${PH}variants/p2-today.json`]: 'extends', [`${PH}trace.test.mjs`]: 'new' } },
  'P2-12c': { est: 2, lane: 'J', deps: ['P2-12d'], special: [2, 2], files: { [`${PH}proof-observer.mjs, proof-certificate.mjs`]: 'new', [`${PH}proofs.test.mjs`]: 'new' } },
  'P2-12e': { est: 2.5, lane: 'J', deps: ['P2-12d'], special: [4, 4], files: { [`${PH}proof-prior-replay.mjs, proof-legacy.mjs`]: 'new', [`${PH}proofs-prior-legacy.test.mjs`]: 'new' } },
  'P2-14b': { est: 2, lane: 'J', deps: ['P2-12b'], files: { [`${PH}replay-probe.mjs`]: 'new', [`${PH}replay-probe.test.mjs`]: 'new' } },
  'P2-15': { est: 3, lane: 'J', deps: ['P2-09', 'P2-12a', 'P2-12b', 'P2-14a'], full: true, special: [3, 9, 9, 2, 2, 2, 2, 2, 5, 1], files: { 'core/engine/gen-v4.js': 'GEN_V4_LIVE', 'core/engine/version.js': 'ALGO_ID', 'tests/gen-v4.test.js': 'K1', [SELT]: 'K2', [GT]: 'K3, K5', 'tests/cli.test.js': 'K4', 'tests/clues.test.js': 'K7, K8', 'tests/fixtures/': 'fixtures; ui-flow recipe', 'tests/replay-refusal.test.js': 'new', [GCT]: 'reader (959)', 'tests/protocol.test.js': 'reader (55)', 'tests/replay-model.test.js': 'reader (33)', 'tests/replay.test.js': 'reader (27)', 'tests/tasks.test.js': 'reader (615)', [DD]: 'line 1805; §7.7; §7.8; "not yet live" lines' } },
  'P2-16c': { est: 2.5, lane: 'J', deps: ['P2-12d', 'P2-09'], special: [3], files: { [`${PH}variants/p2-glue*.json`]: 'new', [`${PH}files/p2-glue/`]: 'new', [`${PH}glue.test.mjs`]: 'new' } },
  'P2-16b': { est: 3, lane: 'J', deps: ['P2-09', 'P2-11b', 'P2-16e'], special: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5], files: { 'tests/browser/deadline.html': 'new', 'tests/browser/deadline.js': 'new', 'docs/improve-generating-phase-2/evidence/P2-16b/': 'new' } },
  'P2-16a': { est: 2, lane: 'J', deps: ['P2-15', 'P2-13a'], full: true, files: { 'tests/real-worker.test.js': 'new', [GT]: 'end of describe "deterministic parallel simulation"', 'tests/cli.test.js': 'end', 'docs/improve-generating-phase-2/evidence/P2-16a/gates.md': 'new' } },
  'P2-17': { est: 2.5, lane: 'J', deps: ['P2-15', 'P2-12c', 'P2-12e', 'P2-13f', 'P2-14b', 'P2-16b', 'P2-16c'], files: { 'USERGUIDE.md': 'sentence', 'USERGUIDE.vn.md': 'sentence', [DG]: 'harness paragraph; page list', [DGV]: 'harness paragraph; page list', 'README.md': 'line', 'tools/ig-proto/README.md': 'section', 'docs/improve-generating-phase-2/pr-body.md': 'new' } },
};

/** check-list §1's order: lane S, lane C, lane T, the joins. */
const ORDER = ['P2-01', 'P2-02', 'P2-04', 'P2-05a', 'P2-05b', 'P2-14a', 'P2-06', 'P2-07', 'P2-08', 'P2-10', 'P2-11a',
  'P2-11b', 'P2-09', 'P2-12a', 'P2-03', 'P2-13r', 'P2-13v', 'P2-16e', 'P2-13a', 'P2-13d', 'P2-13e', 'P2-13b', 'P2-13c',
  'P2-13f', 'P2-12b', 'P2-12d',
  'P2-12c', 'P2-12e', 'P2-14b', 'P2-15', 'P2-16c', 'P2-16b', 'P2-16a', 'P2-17'];

const ids = Object.keys(TASKS);
if (ORDER.length !== ids.length || ORDER.some((id) => TASKS[id] === undefined)) {
  throw new Error('ORDER and TASKS differ');
}
for (const id of ids) {
  for (const d of TASKS[id].deps) {
    if (TASKS[d] === undefined) {
      throw new Error(`${id} starts after an unknown task ${d}`);
    }
    if (ORDER.indexOf(d) > ORDER.indexOf(id) && TASKS[d].lane === TASKS[id].lane) {
      throw new Error(`${id} is listed before its start condition ${d} in its lane`);
    }
  }
}
/** @type {Record<string, Set<string>>} */
const anc = {};
/** @param {string} id @returns {Set<string>} */
const ancestors = (id) => {
  if (anc[id] === undefined) {
    anc[id] = new Set();
    for (const d of TASKS[id].deps) {
      anc[id].add(d);
      ancestors(d).forEach((x) => anc[id].add(x));
    }
  }
  return anc[id];
};
ids.forEach(ancestors);
/** @type {Record<string, number>} */
const tail = {};
/** @param {string} id @returns {number} */
const tailOf = (id) => {
  if (tail[id] === undefined) {
    const next = ids.filter((k) => TASKS[k].deps.includes(id)).map(tailOf);
    tail[id] = TASKS[id].est + (next.length ? Math.max(...next) : 0);
  }
  return tail[id];
};
ids.forEach(tailOf);

console.log('# Phase 2: the parallel execution plan, checked and modelled (revision 2; a scenario, not a delivery promise)\n');
console.log('Generated by `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-parallel-plan.mjs`; engine-free.\n');
console.log('## Start conditions and tails (estimated hours)\n');
console.log('| Task | Lane | Est. h | Starts when merged | Tail h |');
console.log('|---|---|---:|---|---:|');
for (const id of [...ids].sort((a, b) => tail[b] - tail[a] || ORDER.indexOf(a) - ORDER.indexOf(b))) {
  console.log(`| ${id} | ${TASKS[id].lane === 'J' ? 'join' : TASKS[id].lane} | ${TASKS[id].est} | ${TASKS[id].deps.join(', ') || 'the pack commit'} | ${tail[id]} |`);
}

console.log('\n## Unordered pairs that edit a common file\n');
console.log('| Pair | File | Region of the first | Region of the second |');
console.log('|---|---|---|---|');
let pairs = 0;
for (let i = 0; i < ids.length; i += 1) {
  for (let j = i + 1; j < ids.length; j += 1) {
    const [a, b] = [ids[i], ids[j]];
    if (ancestors(a).has(b) || ancestors(b).has(a)) {
      continue;
    }
    for (const f of Object.keys(TASKS[a].files)) {
      if (TASKS[b].files[f] !== undefined) {
        pairs += 1;
        console.log(`| ${a}, ${b} | \`${f}\` | ${TASKS[a].files[f]} | ${TASKS[b].files[f]} |`);
      }
    }
  }
}
console.log(`\n${pairs} shared-file entries among unordered pairs; check-list §3.7's table separates each.`);

const FULL = 145 / 60;
const FOCUSED = 0.5;
const QUIET = 0.75;
const PHASE2_TESTS = 3;

/** @param {number} r @param {('S' | 'C' | 'T')[]} devs @param {boolean} serial */
function simulate(r, devs, serial) {
  /** @type {{ at: number, seq: number, fn: () => void }[]} */
  const events = [];
  let seq = 0;
  let now = 0;
  const at = (/** @type {number} */ t, /** @type {() => void} */ fn) => events.push({ at: t, seq: seq++, fn });
  let lockHeld = false;
  /** @type {{ minutes: number, then: () => void }[]} */
  const lockQueue = [];
  let lockBusy = 0;
  /** @param {number} minutes @param {() => void} then */
  const lock = (minutes, then) => {
    if (lockHeld) {
      lockQueue.push({ minutes, then });
      return;
    }
    lockHeld = true;
    lockBusy += QUIET + minutes;
    at(now + QUIET + minutes, () => {
      lockHeld = false;
      const next = lockQueue.shift();
      if (next !== undefined) {
        lock(next.minutes, next.then);
      }
      then();
    });
  };
  /** @param {number[]} list @param {() => void} then */
  const lockAll = (list, then) => (list.length === 0 ? then() : lock(list[0], () => lockAll(list.slice(1), then)));
  /** @type {Record<string, number>} */
  const merged = {};
  /** @type {Record<string, number>} */
  const started = {};
  const pending = new Set(ids);
  const free = new Set(devs.map((_, i) => i));
  let slots = 5;
  /** @type {string[]} */
  const mergeQueue = [];
  let merging = false;
  const mergeNext = () => {
    if (merging || mergeQueue.length === 0) {
      return;
    }
    merging = true;
    const id = /** @type {string} */ (mergeQueue.shift());
    const gate = [TASKS[id].full ? FULL : FOCUSED];
    if (Object.keys(TASKS[id].files).some((f) => f.startsWith(PH))) {
      gate.push(PHASE2_TESTS);
    }
    if ((id === 'P2-15' && merged['P2-16b'] !== undefined) || (id === 'P2-16b' && merged['P2-15'] !== undefined)) {
      gate.push(...TASKS['P2-16b'].special ?? []);
    }
    for (const late of ['P2-12c', 'P2-12e', 'P2-16c']) {
      if ((id === 'P2-15' && merged[late] !== undefined) || (id === late && merged['P2-15'] !== undefined)) {
        gate.push(...TASKS[late].special ?? []);
      }
    }
    at(now + 1, () => lockAll(gate, () => at(now + 1.5, () => {
      merged[id] = now;
      slots += 1;
      merging = false;
      mergeNext();
      startReady();
    })));
  };
  /** @param {string} id @param {number} dev */
  const runTask = (id, dev) => {
    const w = r * TASKS[id].est * 60;
    const runs = [...(TASKS[id].special ?? []), ...(TASKS[id].full ? [FULL] : [])];
    at(now + 0.5 * w, () => lock(FOCUSED, () => at(now + 0.3 * w, () => lock(FOCUSED, () => at(now + 0.2 * w,
      () => lockAll(runs, () => {
        free.add(dev);
        startReady();
        at(now + 5, () => {
          mergeQueue.push(id);
          mergeNext();
        });
      }))))));
  };
  const ready = () => [...pending].filter((id) => TASKS[id].deps.every((d) => merged[d] !== undefined));
  const startReady = () => {
    for (const dev of [...free].sort()) {
      if (slots === 0) {
        return;
      }
      const list = ready();
      let pick;
      if (serial) {
        const inFlight = Object.keys(started).some((k) => merged[k] === undefined);
        pick = inFlight ? undefined : list.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
      } else {
        const own = list.filter((id) => TASKS[id].lane === devs[dev]).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
        const other = list.sort((a, b) => tail[b] - tail[a] || ORDER.indexOf(a) - ORDER.indexOf(b));
        pick = own[0] ?? other[0];
      }
      if (pick === undefined) {
        continue;
      }
      pending.delete(pick);
      free.delete(dev);
      slots -= 1;
      started[pick] = now;
      runTask(pick, dev);
    }
  };
  startReady();
  while (events.length > 0) {
    events.sort((a, b) => a.at - b.at || a.seq - b.seq);
    const e = /** @type {{ at: number, seq: number, fn: () => void }} */ (events.shift());
    now = e.at;
    e.fn();
  }
  if (pending.size > 0) {
    throw new Error(`deadlock: ${[...pending].join(', ')}`);
  }
  return { hours: now / 60, lockShare: lockBusy / now, started, merged };
}

const total = ids.reduce((s, k) => s + TASKS[k].est, 0);
console.log(`\n## Model of the developer phase\n\n${ids.length} developer tasks, ${total} estimated hours, critical path ${Math.max(...ids.map((k) => tail[k]))} h.\n`);
console.log('| r | Developers | Elapsed h | Lock busy |');
console.log('|---:|---|---:|---:|');
/** @type {{ r: number, res: ReturnType<typeof simulate> }[]} */
const keep = [];
for (const r of [0.15, 0.25]) {
  const s = simulate(r, ['S'], true);
  console.log(`| ${r} | 1, check-list §1's order, one task at a time | ${s.hours.toFixed(1)} | ${(100 * s.lockShare).toFixed(0)} % |`);
  const p = simulate(r, ['S', 'C', 'T'], false);
  console.log(`| ${r} | 3, lanes S, C and T | ${p.hours.toFixed(1)} | ${(100 * p.lockShare).toFixed(0)} % |`);
  keep.push({ r, res: p });
}
console.log('\nLanes S, C and T, five slots:\n');
console.log('| Task | Lane | Start, r 0.15 | Merged, r 0.15 | Start, r 0.25 | Merged, r 0.25 |');
console.log('|---|---|---:|---:|---:|---:|');
const [lo, hi] = keep;
for (const id of [...ids].sort((a, b) => lo.res.started[a] - lo.res.started[b] || ORDER.indexOf(a) - ORDER.indexOf(b))) {
  const h = (/** @type {number} */ m) => (m / 60).toFixed(2);
  console.log(`| ${id} | ${TASKS[id].lane === 'J' ? 'join' : TASKS[id].lane} | ${h(lo.res.started[id])} | ${h(lo.res.merged[id])} | ${h(hi.res.started[id])} | ${h(hi.res.merged[id])} |`);
}

// @ts-check
// Browser regression harness of the puzzle-code client over its real module worker (no mock): encode, decode, correction
// candidates, damaged-tail recovery, cancellation, supersession, independent clients and disposal. Worker construction
// is counted by wrapping the page's Worker constructor, so "one lazy worker per client, none left behind" is measured.
// It also asserts that the page itself never builds the cold shape catalogue. Writes a pass/fail list into the page,
// data-summary and data-result on <html> (running until every case has finished). Developer fixture, not deployed.

import { parsePack } from '../../core/engine/pack.js';
import { catalogueStats } from '../../core/engine/puzzlecode-v1.js';
import { createPuzzleCodeClient } from '../../core/browser/puzzle-code-client.js';
import { PoolError, createPool, isAbortError } from '../../core/browser/worker-pool.js';

document.documentElement.dataset.result = 'running';

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));

const NativeWorker = globalThis.Worker;
const workers = { spawned: 0, terminated: 0 };
class CountingWorker extends NativeWorker {
  /** @param {ConstructorParameters<typeof Worker>} args */
  constructor(...args) {
    super(...args);
    workers.spawned += 1;
  }

  terminate() {
    workers.terminated += 1;
    super.terminate();
  }
}
globalThis.Worker = /** @type {any} */ (CountingWorker);
const live = () => workers.spawned - workers.terminated;

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
  }
}

/**
 * @param {unknown} cond
 * @param {string} msg
 */
function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} msg
 */
function equal(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/** @param {string} text @param {number} at */
const change = (text, at) => text.slice(0, at) + (text[at] === '0' ? '1' : '0') + text.slice(at + 1);

const fixture = await (await fetch(new URL('../fixtures/puzzlecode-v1.json', import.meta.url))).json();
const GOLDEN = fixture.goldens[0];
const CODE = /** @type {string} */ (GOLDEN.code);
const CORE = CODE.slice(0, CODE.indexOf('.'));
const parsed = parsePack(await (await fetch(new URL(`../../${GOLDEN.source}`, import.meta.url))).text());
if (!parsed.ok) {
  throw new Error('the sample pack does not parse');
}
const sample = parsed.value;
const puzzle = sample.puzzles[GOLDEN.puzzle];
const snapshot = {
  rows: sample.board.rows,
  rotation: sample.presentation?.rotation ?? 0,
  pieces: sample.pieces,
  title: GOLDEN.title,
  clues: puzzle.clues,
  solution: puzzle.solution ?? null,
  rating: puzzle.rating ?? null,
  certificate: puzzle.certificate ?? null,
};

/** @type {import('../../core/browser/puzzle-code-client.js').PuzzleCodeClient[]} */
const owned = [];
const makeClient = () => {
  const client = createPuzzleCodeClient();
  owned.push(client);
  return client;
};
const client = makeClient();

await check('a new client starts no worker, and the page has built no cold catalogue', () => {
  assert(workers.spawned === 0, `${workers.spawned} workers before the first operation`);
  assert(catalogueStats.sizesBuilt === 0, 'catalogue built on the main thread');
});

await check('encode in the module worker is the frozen raw golden of the sample puzzle', async () => {
  const encoded = await client.encode(snapshot);
  assert(encoded.ok, JSON.stringify(encoded));
  equal(encoded.value, { C: CORE, T: CODE.slice(CORE.length + 1), F: CODE, version: 1 }, 'encoded');
  assert(workers.spawned === 1 && live() === 1, `one worker: spawned ${workers.spawned}, live ${live()}`);
});

await check('decode returns one valid puzzle with the stored answer; the core alone has none; links and grouping decode alike', async () => {
  const full = await client.decode(CODE);
  assert(full.ok, JSON.stringify(full));
  assert(full.value.hasTail && full.value.tailError === null && full.value.code === CODE, 'full code flags');
  assert(full.value.pack.puzzles.length === 1 && full.value.pack.puzzles[0].solution, 'one puzzle with its answer');
  equal(full.value.pack.puzzles[0].clues, puzzle.clues, 'clues');
  equal(full.value.pack.board.rows, sample.board.rows, 'board');
  const core = await client.decode(CORE);
  assert(core.ok && !core.value.hasTail && (core.value.pack.puzzles[0].solution ?? null) === null, 'core without an answer');
  for (const text of [CODE.toLowerCase().replace(/(.{4})/g, '$1 '), `https://tdat00.github.io/pentomino/player/#p=${CODE}&i=0`]) {
    const again = await client.decode(text);
    assert(again.ok && again.value.code === CODE, `decode of ${text.slice(0, 30)}`);
  }
  assert(workers.spawned === 1, `the same worker served every operation: ${workers.spawned}`);
});

await check('one changed symbol returns a validated candidate and no game; repair returns the same candidate', async () => {
  const typed = change(CODE, 5);
  const failed = await client.decode(typed);
  assert(!failed.ok && failed.issues[0].code === 'core-check', JSON.stringify(failed));
  equal(failed.candidate, {
    normalizedCode: typed, correctedCode: CODE, component: 'core', offset: 5, group: 2, position: 2, typed: typed[5], expected: CODE[5],
  }, 'candidate');
  const repaired = await client.repair(typed);
  assert(repaired.ok, 'repair is a success carrying the candidate');
  equal(repaired.value, failed.candidate, 'repair candidate');
  const none = await client.repair(change(change(CODE, 5), 9));
  assert(none.ok && none.value === null, 'two changed symbols have no candidate');
});

await check('a damaged tail is a failure with the core as recovery data and a tail candidate', async () => {
  const typed = change(CODE, CODE.length - 1);
  const failed = await client.decode(typed);
  assert(!failed.ok && failed.issues[0].code === 'tail-check', JSON.stringify(failed.issues));
  assert(failed.recovery?.kind === 'core-only' && failed.recovery.pack.puzzles.length === 1, 'core-only recovery');
  assert((failed.recovery.pack.puzzles[0].solution ?? null) === null, 'the recovery has no answer');
  assert(failed.candidate?.component === 'tail' && failed.candidate.offset === 5 && failed.candidate.correctedCode === CODE, 'tail candidate');
});

await check('typed codec failures keep their code and params; a bad snapshot is invalid', async () => {
  const bad = await client.decode('ab!c');
  assert(!bad.ok && bad.issues[0].code === 'bad-char' && bad.issues[0].params?.char === '!', JSON.stringify(bad));
  const index = await client.decode(`#p=${CODE}&i=1`);
  assert(!index.ok && index.issues[0].code === 'index', JSON.stringify(index));
  const short = await client.decode(CORE.slice(0, 4));
  assert(!short.ok && short.issues[0].code === 'core-check', 'too short');
  const refused = await client.encode({ ...snapshot, rows: ['##'], clues: [], pieces: [] });
  assert(!refused.ok && refused.issues[0].code === 'invalid', JSON.stringify(refused));
  const malformed = await client.encode(/** @type {any} */ ({ ...snapshot, extra: 1 }));
  assert(!malformed.ok && malformed.issues[0].code === 'invalid', JSON.stringify(malformed));
  const after = await client.decode(CODE);
  assert(after.ok, 'the worker is still usable after every failure');
});

await check('cancel settles the running operation, ignores its reply and leaves at most one worker', async () => {
  const running = client.decode(CODE);
  client.cancel();
  let reason = '';
  try {
    await running;
  } catch (error) {
    reason = isAbortError(error) ? error.reason : String(error);
  }
  assert(reason === 'cancelled', `cancelled, got "${reason}"`);
  const next = await client.decode(CORE);
  assert(next.ok, 'the client works again');
  assert(live() <= 1, `${live()} live workers`);
});

await check('a newer operation supersedes the running one', async () => {
  const first = client.decode(CODE);
  const second = client.decode(CORE);
  let reason = '';
  try {
    await first;
  } catch (error) {
    reason = isAbortError(error) ? error.reason : String(error);
  }
  assert(reason === 'superseded', `superseded, got "${reason}"`);
  const done = await second;
  assert(done.ok && done.value.code === CORE, 'only the newest result arrives');
  assert(live() <= 1, `${live()} live workers`);
});

await check('two independent clients each own one worker and do not disturb each other', async () => {
  const before = workers.spawned;
  const other = makeClient();
  const [a, b] = await Promise.all([client.decode(CODE), other.decode(CORE)]);
  assert(a.ok && b.ok, 'both decode');
  assert(workers.spawned - before >= 1 && live() <= 2, `live ${live()}`);
  other.dispose();
  const still = await client.decode(CODE);
  assert(still.ok, 'the first client is unaffected by the second one\'s disposal');
});

await check('missing module workers are worker-unavailable, never a main-thread decode', async () => {
  const none = createPuzzleCodeClient({
    createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: () => { throw new PoolError('worker-unavailable', 'no workers'); } })),
  });
  const failed = await none.decode(CODE);
  assert(!failed.ok && failed.issues[0].code === 'worker-unavailable', JSON.stringify(failed));
  none.dispose();
  assert(catalogueStats.sizesBuilt === 0, 'the page did not decode it itself');
});

await check('dispose is idempotent, refuses new work and leaves no worker running', async () => {
  const running = client.decode(CODE);
  client.dispose();
  client.dispose();
  let reason = '';
  try {
    await running;
  } catch (error) {
    reason = isAbortError(error) ? error.reason : String(error);
  }
  assert(reason === 'closed', `closed, got "${reason}"`);
  for (const call of [() => client.decode(CODE), () => client.encode(snapshot), () => client.repair(CODE)]) {
    let refused = '';
    try {
      await call();
    } catch (error) {
      refused = isAbortError(error) ? error.reason : String(error);
    }
    assert(refused === 'closed', `refused after dispose, got "${refused}"`);
  }
  for (const c of owned) {
    c.dispose();
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(live() === 0, `${live()} workers still alive (spawned ${workers.spawned}, terminated ${workers.terminated})`);
});

await check('the page never built the cold catalogue, and nothing violated the policy or threw', () => {
  assert(catalogueStats.sizesBuilt === 0, 'catalogue built on the main thread');
  assert(violations.length === 0, violations.join('; '));
  assert(uncaught.length === 0, uncaught.join('; '));
});

const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` - ${r.error}`}`;
  list.append(li);
}
const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = `${results.length - failed.length}/${results.length} passed; workers spawned ${workers.spawned}, terminated ${workers.terminated}`;
}
document.documentElement.dataset.summary = JSON.stringify({
  total: results.length,
  spawned: workers.spawned,
  terminated: workers.terminated,
  failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 700)),
});
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';

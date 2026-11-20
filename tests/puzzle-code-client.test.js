// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePack } from '../core/engine/pack.js';
import { catalogueStats } from '../core/engine/puzzlecode-v1.js';
import { WorkerTaskError, PoolAbortError, PoolError, createPool, isAbortError } from '../core/browser/worker-pool.js';
import { createPuzzleCodeClient } from '../core/browser/puzzle-code-client.js';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const root = new URL('../', import.meta.url);
const fixture = JSON.parse(readFileSync(new URL('tests/fixtures/puzzlecode-v1.json', root), 'utf8'));
const GOLDEN = fixture.goldens[0];
const parsed = parsePack(readFileSync(new URL(GOLDEN.source, root), 'utf8'));
assert.ok(parsed.ok);
const samplePack = parsed.value;
const onePuzzle = { ...samplePack, puzzles: [samplePack.puzzles[0]] };
const sampleSnapshot = () => {
  const puzzle = samplePack.puzzles[GOLDEN.puzzle];
  return {
    rows: samplePack.board.rows,
    rotation: samplePack.presentation?.rotation ?? 0,
    pieces: samplePack.pieces,
    title: GOLDEN.title,
    clues: puzzle.clues,
    solution: puzzle.solution ?? null,
    rating: puzzle.rating ?? null,
    certificate: puzzle.certificate ?? null,
  };
};
const CODE = GOLDEN.code;
const CORE = CODE.slice(0, CODE.indexOf('.'));
/** @param {string} text @param {number} at */
const change = (text, at) => text.slice(0, at) + (text[at] === '0' ? '1' : '0') + text.slice(at + 1);

/**
 * A pool double that records every call. `answer(task, controls)` returns the task's promise.
 * @param {(task: any, log: ReturnType<typeof newLog>) => Promise<unknown>} answer
 */
function fakePool(answer) {
  const log = newLog();
  return {
    log,
    beginRequest: (/** @type {any} */ r) => void log.begin.push(r),
    run: (/** @type {any} */ task) => {
      log.run.push(task);
      return answer(task, log);
    },
    endRequest: (/** @type {number} */ id) => void log.end.push(id),
    close: () => {
      log.closed += 1;
    },
  };
}

function newLog() {
  return {
    begin: /** @type {any[]} */ ([]),
    run: /** @type {any[]} */ ([]),
    end: /** @type {number[]} */ ([]),
    closed: 0,
  };
}

/** A pool whose answers the test settles by hand and which ignores abort signals. */
function manualPool() {
  /** @type {{ resolve: (v: unknown) => void, reject: (e: unknown) => void, task: any }[]} */
  const pending = [];
  const pool = fakePool((task) => new Promise((resolve, reject) => {
    pending.push({ resolve, reject, task });
  }));
  return { pool, pending };
}

/** @param {() => unknown} test */
async function until(test, ms = 5000) {
  const end = Date.now() + ms;
  while (!test()) {
    assert.ok(Date.now() < end, 'timed out');
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** A client over a one-worker Node pool that counts the workers it spawned and stopped. */
function nodeClient() {
  const counts = { spawned: 0, terminated: 0 };
  const factory = nodeWorkerFactory();
  const client = createPuzzleCodeClient({
    createPool: () => /** @type {any} */ (createPool({
      size: 1,
      workerFactory: () => {
        counts.spawned += 1;
        const worker = factory();
        return { ...worker, postMessage: (m) => worker.postMessage(m), terminate: () => (counts.terminated += 1, worker.terminate()), addEventListener: (t, l) => worker.addEventListener(t, l) };
      },
    })),
  });
  return { client, counts };
}

test('nothing exists before the first operation; the default client owns exactly one worker and closes it', async () => {
  assert.equal(catalogueStats.sizesBuilt, 0, 'importing the client built no catalogue');
  let made = 0;
  let spawned = 0;
  let terminated = 0;
  const factory = nodeWorkerFactory();
  const client = createPuzzleCodeClient({
    createPool: () => {
      made += 1;
      return /** @type {any} */ (createPool({
        size: 1,
        workerFactory: () => {
          spawned += 1;
          const worker = factory();
          return { postMessage: (m) => worker.postMessage(m), terminate: () => (terminated += 1, worker.terminate()), addEventListener: (t, l) => worker.addEventListener(t, l) };
        },
      }));
    },
  });
  assert.deepEqual([made, spawned], [0, 0]);
  assert.ok((await client.decode(CODE)).ok);
  assert.ok((await client.decode(CORE)).ok);
  assert.ok((await client.encode(sampleSnapshot())).ok);
  assert.deepEqual([made, spawned], [1, 1], 'one pool, one worker, reused');
  assert.equal(catalogueStats.sizesBuilt, 0, 'the cold catalogue is only ever built inside the worker');
  client.dispose();
  client.dispose();
  assert.equal(terminated, 1);
});

test('encode through the worker is the frozen raw golden, decode returns the stored answer, and the core alone has none', async () => {
  const { client } = nodeClient();
  try {
    const encoded = await client.encode(sampleSnapshot());
    assert.ok(encoded.ok);
    assert.deepEqual(encoded.value, { C: CORE, T: CODE.slice(CORE.length + 1), F: CODE, version: 1 });
    assert.deepEqual(encoded.warnings, []);
    const full = await client.decode(CODE.toLowerCase());
    assert.ok(full.ok);
    assert.equal(full.value.code, CODE, 'the normalized request');
    assert.equal(full.value.hasTail, true);
    assert.equal(full.value.tailError, null);
    assert.equal(full.value.pack.puzzles.length, 1);
    assert.deepEqual(full.value.pack.puzzles[0].clues, samplePack.puzzles[0].clues);
    assert.ok(full.value.pack.puzzles[0].solution);
    const core = await client.decode(`${CORE.slice(0, 8)} ${CORE.slice(8)}`);
    assert.ok(core.ok);
    assert.equal(core.value.code, CORE);
    assert.equal(core.value.hasTail, false);
    assert.equal(core.value.pack.puzzles[0].solution ?? null, null);
    assert.deepEqual(core.value.pack.board, full.value.pack.board);
    assert.deepEqual(core.value.pack.pieces, full.value.pack.pieces);
  } finally {
    client.dispose();
  }
});

test('one changed core symbol is a failure with a validated candidate, never a loaded game; repair returns it', async () => {
  const { client } = nodeClient();
  try {
    const typed = change(CODE, 5);
    const failed = await client.decode(typed);
    assert.ok(!failed.ok);
    assert.equal(failed.issues[0].code, 'core-check');
    assert.equal(failed.recovery, undefined);
    assert.deepEqual(failed.candidate, {
      normalizedCode: typed, correctedCode: CODE, component: 'core', offset: 5, group: 2, position: 2, typed: typed[5], expected: CODE[5],
    });
    const repaired = await client.repair(typed.toLowerCase());
    assert.ok(repaired.ok);
    assert.deepEqual(repaired.value, failed.candidate);
    const none = await client.repair(CODE);
    assert.ok(none.ok);
    assert.equal(none.value, null, 'a code that needs no repair has no candidate');
  } finally {
    client.dispose();
  }
});

test('the offset counts within the component: a tail symbol is offset 4*(group-1)+position-1 of the tail', async () => {
  const { client } = nodeClient();
  try {
    const typed = change(CODE, CODE.length - 1);
    const failed = await client.decode(typed);
    assert.ok(!failed.ok);
    assert.equal(failed.issues[0].code, 'tail-check');
    assert.equal(failed.candidate?.component, 'tail');
    assert.equal(failed.candidate?.offset, 5);
    assert.equal(failed.candidate?.group, 2);
    assert.equal(failed.candidate?.position, 2);
    assert.equal(failed.candidate?.correctedCode, CODE);
    assert.equal(failed.candidate?.normalizedCode, typed);
  } finally {
    client.dispose();
  }
});

test('a damaged tail is a failure with the validated core as recovery data, not a success', async () => {
  const { client } = nodeClient();
  try {
    for (const typed of [change(CODE, CODE.length - 1), `${CORE}.${'0'.repeat(6)}`, `${CORE}.`]) {
      const failed = await client.decode(typed);
      assert.ok(!failed.ok, typed);
      assert.ok(['tail-check', 'tail-tag', 'tail-invalid'].includes(failed.issues[0].code), failed.issues[0].code);
      assert.deepEqual(failed.recovery?.kind, 'core-only');
      assert.equal(failed.recovery?.code, failed.issues[0].code);
      assert.equal(failed.recovery?.pack.puzzles.length, 1);
      assert.equal(failed.recovery?.pack.puzzles[0].solution ?? null, null, 'the core has no answer');
      assert.deepEqual(failed.recovery?.pack.puzzles[0].clues, samplePack.puzzles[0].clues);
    }
  } finally {
    client.dispose();
  }
});

test('repair has no candidate for ambiguous or out-of-bound input and passes malformed text and service failures through', async () => {
  const { client } = nodeClient();
  try {
    const two = change(change(CODE, 5), 9);
    const ambiguous = await client.repair(two);
    assert.ok(ambiguous.ok);
    assert.equal(ambiguous.value, null);
    const outOfBound = await client.repair('A'.repeat(6000));
    assert.ok(outOfBound.ok, JSON.stringify(outOfBound));
    assert.equal(outOfBound.value, null);
    const malformed = await client.repair('ab!c');
    assert.ok(!malformed.ok);
    assert.equal(malformed.issues[0].code, 'bad-char');
    assert.deepEqual(malformed.issues[0].params, { char: '!' });
  } finally {
    client.dispose();
  }
});

test('codec failures keep their code and message through the worker; a bad snapshot is invalid, never a crash', async () => {
  const { client } = nodeClient();
  try {
    const tooShort = await client.decode(CORE.slice(0, 3));
    assert.ok(!tooShort.ok);
    assert.equal(tooShort.issues[0].code, 'core-check');
    const empty = await client.decode('   ');
    assert.ok(!empty.ok);
    assert.equal(empty.issues[0].code, 'empty');
    const refused = await client.encode({ ...sampleSnapshot(), rows: ['##'], clues: [], pieces: [] });
    assert.ok(!refused.ok);
    assert.equal(refused.issues[0].code, 'invalid');
    assert.ok(refused.issues[0].message.length > 0);
    const malformed = await client.encode(/** @type {any} */ ({ ...sampleSnapshot(), extra: 1 }));
    assert.ok(!malformed.ok);
    assert.equal(malformed.issues[0].code, 'invalid');
    const afterwards = await client.decode(CODE);
    assert.ok(afterwards.ok, 'the worker is still usable');
  } finally {
    client.dispose();
  }
});

test('pasted links obey the navigation rules and never reach a worker when they fail', async () => {
  const pool = fakePool(async () => ({ pack: onePuzzle, hasTail: true, tailError: null }));
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  /** @type {[string, string][]} */
  const cases = [
    [`https://tdat00.github.io/pentomino/player/#p=${CODE}&i=1`, 'index'],
    [`#p=${CODE}&i=999999`, 'index'],
    [`https://tdat00.github.io/pentomino/player/#p=${CODE}&i=-1`, 'invalid'],
    [`#p=${CODE}&i=x`, 'invalid'],
    [`#p=${CODE}&i=00`, 'invalid'],
    [`#p=${CODE}&p=${CODE}`, 'invalid'],
    [`#p=${CODE}&i=0&i=0`, 'invalid'],
    [`#p=${CODE}&pack=1j.abc`, 'invalid'],
    [`#p=${CODE}&lib=0123456789abcdef`, 'invalid'],
    ['#p=', 'invalid'],
    ['#p=1D0J+492G', 'bad-char'],
    ['#p=1D0J%23p%3D1D0J', 'bad-char'],
    ['', 'empty'],
    ['1D0J..', 'dots'],
    ['x'.repeat(32769), 'too-long'],
  ];
  for (const [text, code] of cases) {
    const result = await client.decode(text);
    assert.ok(!result.ok, text.slice(0, 40));
    assert.equal(result.issues[0].code, code, text.slice(0, 40));
  }
  assert.deepEqual(pool.log.begin, []);
  const valid = await client.decode(`#p=${CODE}&i=0&x=1`);
  assert.ok(valid.ok, 'a valid link reaches the pool');
  assert.equal(pool.log.begin.length, 1);
});

test('a link with #p= and index 0 decodes like the bare code', async () => {
  const { client } = nodeClient();
  try {
    const result = await client.decode(`https://tdat00.github.io/pentomino/player/#p=${CODE.toLowerCase()}&i=0&utm=x`);
    assert.ok(result.ok);
    assert.equal(result.value.code, CODE);
  } finally {
    client.dispose();
  }
});

test('missing module workers are worker-unavailable, transport faults are worker-error, and neither decodes on the page', async () => {
  const none = createPuzzleCodeClient({
    createPool: () => /** @type {any} */ (createPool({ size: 1, workerFactory: () => { throw new PoolError('worker-unavailable', 'no workers'); } })),
  });
  for (const result of [await none.decode(CODE), await none.encode(sampleSnapshot()), await none.repair(CODE)]) {
    assert.ok(!result.ok);
    assert.equal(result.issues[0].code, 'worker-unavailable');
  }
  none.dispose();
  /** @type {[string, () => Promise<unknown>][]} */
  const faults = [
    ['crash', () => Promise.reject(new PoolError('worker-crashed', 'The worker stopped'))],
    ['protocol', () => Promise.reject(new PoolError('worker-protocol', 'bad message'))],
    ['internal', () => Promise.reject(new WorkerTaskError('internal', 'boom'))],
    ['invalid-payload reply', () => Promise.reject(new WorkerTaskError('invalid-payload', 'x', [{ code: 'x', path: '$', message: 'm' }]))],
    ['stray error', () => Promise.reject(new Error('who knows'))],
    ['unreadable result', () => Promise.resolve({ nonsense: true })],
    ['null result', () => Promise.resolve(null)],
  ];
  for (const [name, answer] of faults) {
    const pool = fakePool(answer);
    const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
    for (const result of [await client.decode(CODE), await client.encode(sampleSnapshot())]) {
      assert.ok(!result.ok, name);
      assert.equal(result.issues[0].code, 'worker-error', name);
      assert.equal(result.recovery, undefined);
      assert.equal(result.candidate, undefined);
    }
    assert.deepEqual(pool.log.end, pool.log.begin.map((r) => r.requestId), `${name}: every begun request is ended`);
  }
});

test('the watchdog deadline is a service failure, not an invalid puzzle', async () => {
  const pool = fakePool(() => Promise.reject(new PoolAbortError('deadline')));
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  const result = await client.decode(CODE);
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'worker-error');
  assert.deepEqual(result.issues[0].params, { reason: 'deadline' });
});

test('a worker error that is a codec error becomes typed issues; its candidate is enriched from the request', async () => {
  const wire = { component: 'core', group: 3, position: 4, expected: 'Q', typed: 'R', correctedCode: 'AAAA.BBBB' };
  const pool = fakePool(() => Promise.reject(new WorkerTaskError('core-check', 'typing error', [
    { code: 'core-check', path: '$', message: 'typing error', params: { n: 1 }, candidate: wire },
  ])));
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  const result = await client.decode('aaaa-bbbb');
  assert.ok(!result.ok);
  assert.deepEqual(result.issues, [{ code: 'core-check', path: '$', message: 'typing error', params: { n: 1 } }]);
  assert.deepEqual(result.candidate, {
    normalizedCode: 'AAAABBBB', correctedCode: 'AAAA.BBBB', component: 'core', offset: 11, group: 3, position: 4, typed: 'R', expected: 'Q',
  });
  assert.deepEqual(pool.log.run[0].payload, { text: 'AAAABBBB' }, 'the worker gets the normalized code');
  assert.equal(pool.log.run[0].kind, 'decodePuzzleCode');
});

test('each operation begins one request with an unused ID and revision, sends one task and ends the request', async () => {
  const pool = fakePool(async (task) => (task.kind === 'decodePuzzleCode'
    ? { pack: onePuzzle, hasTail: true, tailError: null }
    : { C: 'A', T: null, F: 'A', version: 1 }));
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  await client.decode(CODE);
  await client.encode(sampleSnapshot());
  await client.repair(CODE);
  assert.equal(pool.log.begin.length, 3);
  assert.equal(pool.log.run.length, 3);
  assert.deepEqual(pool.log.end, pool.log.begin.map((r) => r.requestId));
  const ids = pool.log.begin.map((r) => r.requestId);
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  assert.equal(new Set(ids).size, 3);
  assert.ok(pool.log.begin.every((r, i) => Number.isSafeInteger(r.requestId) && r.requestId >= 0 && typeof r.revision === 'string' && r.revision !== ''));
  assert.deepEqual(pool.log.run.map((t) => [t.requestId, t.revision]), pool.log.begin.map((r) => [r.requestId, r.revision]));
  assert.deepEqual(Object.keys(pool.log.run[1].payload), ['snapshot']);
  assert.equal(pool.log.closed, 0, 'a caller-owned pool is never closed by the client');
  client.dispose();
  assert.equal(pool.log.closed, 0);
});

test('cancel settles the running operation as an abort, ignores its late reply and ends its request', async () => {
  const { pool, pending } = manualPool();
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  const running = client.decode(CODE);
  await until(() => pending.length === 1);
  assert.equal(pending[0].task.signal.aborted, false);
  client.cancel();
  await assert.rejects(running, (e) => isAbortError(e) && e.reason === 'cancelled');
  assert.equal(pending[0].task.signal.aborted, true, 'the pool task is aborted through its signal');
  pending[0].resolve({ pack: onePuzzle, hasTail: true, tailError: null });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(pool.log.end, [pool.log.begin[0].requestId]);
  client.cancel();
  const next = client.decode(CODE);
  await until(() => pending.length === 2);
  pending[1].resolve({ pack: onePuzzle, hasTail: true, tailError: null });
  assert.ok((await next).ok, 'the client works after a cancellation');
});

test('a newer operation supersedes the running one; cancel of an idle client does nothing', async () => {
  const { pool, pending } = manualPool();
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  client.cancel();
  const first = client.decode(CODE);
  await until(() => pending.length === 1);
  const second = client.decode(CORE);
  await assert.rejects(first, (e) => isAbortError(e) && e.reason === 'superseded');
  await until(() => pending.length === 2);
  pending[0].resolve({ pack: onePuzzle, hasTail: true, tailError: null });
  pending[1].resolve({ pack: onePuzzle, hasTail: false, tailError: null });
  const done = await second;
  assert.ok(done.ok);
  assert.equal(done.value.code, CORE, 'only the newest reply reaches its caller');
  assert.deepEqual(pool.log.end.toSorted((a, b) => a - b), pool.log.begin.map((r) => r.requestId).toSorted((a, b) => a - b));
});

test('dispose is idempotent, stops the running operation, ignores a late reply and refuses new work', async () => {
  const { pool, pending } = manualPool();
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  const running = client.encode(sampleSnapshot());
  await until(() => pending.length === 1);
  client.dispose();
  client.dispose();
  await assert.rejects(running, (e) => isAbortError(e) && e.reason === 'closed');
  pending[0].resolve({ C: 'A', T: null, F: 'A', version: 1 });
  await new Promise((resolve) => setImmediate(resolve));
  for (const call of [() => client.decode(CODE), () => client.encode(sampleSnapshot()), () => client.repair(CODE)]) {
    await assert.rejects(call(), (e) => isAbortError(e) && e.reason === 'closed');
  }
  client.cancel();
  assert.equal(pool.log.begin.length, 1, 'nothing started after dispose');
  assert.equal(pool.log.closed, 0, 'the caller-owned pool stays open');
});

test('a factory pool is closed once by dispose; a pool nobody asked for is never made', async () => {
  const { pool } = manualPool();
  let made = 0;
  const client = createPuzzleCodeClient({
    createPool: () => {
      made += 1;
      return /** @type {any} */ (pool);
    },
  });
  client.dispose();
  client.dispose();
  assert.equal(made, 0);
  assert.equal(pool.log.closed, 0);
  const used = createPuzzleCodeClient({ createPool: () => /** @type {any} */ (pool) });
  const running = used.decode(CODE);
  await new Promise((resolve) => setImmediate(resolve));
  used.dispose();
  used.dispose();
  await assert.rejects(running, isAbortError);
  assert.equal(pool.log.closed, 1);
});

test('two independent clients never collide on request IDs and never cancel each other', async () => {
  const a = manualPool();
  const b = manualPool();
  const first = createPuzzleCodeClient({ pool: /** @type {any} */ (a.pool) });
  const second = createPuzzleCodeClient({ pool: /** @type {any} */ (b.pool) });
  const one = first.decode(CODE);
  const two = second.decode(CORE);
  await until(() => a.pending.length === 1 && b.pending.length === 1);
  const oneSettled = one.then(() => 'ok', (e) => e.reason);
  const three = first.decode(CORE).then(() => 'ok', (e) => e.reason);
  const ids = [a.pool.log.begin[0].requestId, b.pool.log.begin[0].requestId, a.pool.log.begin[1].requestId];
  assert.equal(new Set(ids).size, 3);
  assert.deepEqual(ids, [...ids].sort((x, y) => x - y));
  first.cancel();
  assert.equal(b.pending[0].task.signal.aborted, false, 'the other client keeps its work');
  b.pending[0].resolve({ pack: onePuzzle, hasTail: false, tailError: null });
  assert.ok((await two).ok);
  assert.equal(await oneSettled, 'superseded');
  assert.equal(await three, 'cancelled');
});

test('a failing request never leaves a begun request open', async () => {
  const pool = {
    log: newLog(),
    beginRequest() {
      throw new Error('the pool is closed');
    },
    run: () => Promise.reject(new Error('unreachable')),
    endRequest() {},
  };
  const client = createPuzzleCodeClient({ pool: /** @type {any} */ (pool) });
  const result = await client.decode(CODE);
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'worker-error');
});

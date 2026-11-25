// @ts-check
// The scripted worker of the pool probe's self-test (task pack v4, V4-T10c): the protocol of lib/width-worker.mjs without
// an engine, so that the width dispatch can be tested without a rating. It answers `{ type: 'ready' }`, then on
// `{ type: 'go' }` posts `{ type: 'result', ms }`, `{ type: 'error', message }` or nothing, as `workerData.script` says.
// `workerData` is `{ script, shared, items, rounds }` (`items` and `rounds` give the size of a result: `items.length *
// rounds` times). `script` is one of `result`, `error`, `nothing` (no terminal message), `exit` (the thread exits with
// code 3 before `ready`) and `malformed` (a result whose `ms` is not a list), or a list of them: the worker that is the
// n-th to start takes entry `n % length`. `shared` is an `Int32Array` over a `SharedArrayBuffer` of at least 64 entries
// that the test reads: [0] workers started (the index a worker takes), [1] workers that have posted `ready`, [2 + n] the
// heartbeat of worker n (one beat every 10 ms for as long as the thread lives, so that a worker that was not terminated
// shows), [18 + n] the `ready` count that worker n saw at its first `go` (the barrier), [34 + n] the `go` messages it got.
// A worker n posts `ready` after n x 40 ms, so that a `go` sent before the last `ready` is seen. Nothing closes its port:
// only a terminated thread stops its heartbeat; a safety exit after 30 s keeps a failed test from hanging the process.
import { parentPort, workerData } from 'node:worker_threads';

const port = /** @type {import('node:worker_threads').MessagePort} */ (parentPort);
const { script, shared, items, rounds } = workerData;
const slot = Atomics.add(shared, 0, 1);
const mine = Array.isArray(script) ? script[slot % script.length] : script;

setInterval(() => Atomics.add(shared, 2 + slot, 1), 10);
setTimeout(() => process.exit(0), 30000);

if (mine === 'exit') {
  process.exit(3);
}

let firstGo = true;
port.on('message', (/** @type {any} */ message) => {
  if (message?.type !== 'go') {
    return;
  }
  Atomics.add(shared, 34 + slot, 1);
  if (!firstGo) {
    return;
  }
  firstGo = false;
  Atomics.store(shared, 18 + slot, Atomics.load(shared, 1));
  if (mine === 'result') {
    port.postMessage({ type: 'result', ms: Array.from({ length: items.length * rounds }, (_, k) => (slot + 1) * 100 + k) });
  } else if (mine === 'error') {
    port.postMessage({ type: 'error', message: 'scripted error' });
  } else if (mine === 'malformed') {
    port.postMessage({ type: 'result', ms: 'nope' });
  }
});

setTimeout(() => {
  Atomics.add(shared, 1, 1);
  port.postMessage({ type: 'ready' });
}, slot * 40);

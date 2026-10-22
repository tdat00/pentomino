// @ts-check
// Node host of the engine worker (design §8.1). Loaded as a worker it wires the
// shared task handler of core/engine/tasks.js to `parentPort`; imported on the
// main thread it adapts `worker_threads.Worker` to the pool's Worker interface.
// There is no second solver, generator or protocol here.
import { isMainThread, parentPort, Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

import { createTaskHandler } from '../core/engine/tasks.js';

/** @typedef {import('../core/browser/worker-pool.js').WorkerLike} WorkerLike */

/**
 * Adapts a Node Worker to the pool's Worker interface: `message` delivers
 * `event.data`, and a worker `error` or `exit` is reported as the pool's `error`.
 * @param {Worker} worker
 * @returns {WorkerLike}
 */
export function adaptNodeWorker(worker) {
  return {
    postMessage: (message) => worker.postMessage(message),
    terminate: () => {
      worker.terminate().catch(() => {});
    },
    addEventListener(type, listener) {
      if (type === 'message') {
        worker.on('message', (data) => listener({ data }));
      } else if (type === 'error') {
        worker.on('error', (error) => listener({ message: error?.message ?? 'worker error' }));
        worker.on('exit', (code) => listener({ message: `worker exited with code ${code}` }));
      } else if (type === 'messageerror') {
        worker.on('messageerror', () => listener({}));
      }
    },
  };
}

/**
 * Worker factory for `createPool({ workerFactory })`.
 * @returns {() => WorkerLike}
 */
export function nodeWorkerFactory() {
  const file = fileURLToPath(import.meta.url);
  return () => adaptNodeWorker(new Worker(file));
}

if (!isMainThread && parentPort !== null) {
  const port = parentPort;
  const handler = createTaskHandler({ post: (reply) => port.postMessage(reply) });
  port.on('message', (message) => handler.handle(message));
}

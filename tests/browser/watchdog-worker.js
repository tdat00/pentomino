// @ts-check
// Module worker fixture for the T23 scaled-watchdog probe. It runs the real engine handler for every
// task except `puzzleCandidate`, which keeps the worker busy for 10 real seconds without ever replying,
// so only the pool watchdog (terminate) can stop it. Developer fixture, not deployed.

import { createTaskHandler } from '../../core/engine/tasks.js';

const BUSY_MS = 10000;
const scope = /** @type {any} */ (globalThis);

if (typeof scope.postMessage === 'function' && typeof scope.addEventListener === 'function') {
  const handler = createTaskHandler({ post: (reply) => scope.postMessage(reply) });
  scope.addEventListener('message', (/** @type {{ data: any }} */ event) => {
    const message = event.data;
    if (message !== null && typeof message === 'object' && message.type === 'task' && message.kind === 'puzzleCandidate') {
      const end = scope.performance.now() + BUSY_MS;
      while (scope.performance.now() < end) {
        // busy on purpose
      }
      return;
    }
    handler.handle(message);
  });
}

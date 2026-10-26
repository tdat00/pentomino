// @ts-check
// Module worker entry: engine modules only. Solver and generation tasks run synchronously through the shared task
// handler (no slicing, no SharedArrayBuffer); puzzle-code tasks may await native compression before replying.

import { createTaskHandler } from '../engine/tasks.js';

const scope = /** @type {any} */ (globalThis);

if (typeof scope.postMessage === 'function' && typeof scope.addEventListener === 'function') {
  const handler = createTaskHandler({ post: (reply) => scope.postMessage(reply) });
  scope.addEventListener('message', (/** @type {{ data: unknown }} */ event) => handler.handle(event.data));
}

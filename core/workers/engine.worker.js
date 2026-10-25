// @ts-check
// Module worker entry: engine modules only. The solver and generation tasks run synchronously through the shared task
// handler, with no cooperative slicing and no SharedArrayBuffer; the puzzle-code tasks may await native compression, and
// the handler answers each of them once its Promise has settled.

import { createTaskHandler } from '../engine/tasks.js';

const scope = /** @type {any} */ (globalThis);

if (typeof scope.postMessage === 'function' && typeof scope.addEventListener === 'function') {
  const handler = createTaskHandler({ post: (reply) => scope.postMessage(reply) });
  scope.addEventListener('message', (/** @type {{ data: unknown }} */ event) => handler.handle(event.data));
}

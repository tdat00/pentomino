// @ts-check
// Module worker entry: engine modules only. It owns this worker's main and
// scratch workspaces through the shared task handler and runs every task
// synchronously; there is no cooperative slicing and no SharedArrayBuffer.

import { createTaskHandler } from '../engine/tasks.js';

const scope = /** @type {any} */ (globalThis);

if (typeof scope.postMessage === 'function' && typeof scope.addEventListener === 'function') {
  const handler = createTaskHandler({ post: (reply) => scope.postMessage(reply) });
  scope.addEventListener('message', (/** @type {{ data: unknown }} */ event) => handler.handle(event.data));
}

// SA-Opus, review-1 response (R06): the worker side of bt-worker-argv.mjs.
import { parentPort } from 'node:worker_threads';
parentPort.postMessage(process.argv[1]);

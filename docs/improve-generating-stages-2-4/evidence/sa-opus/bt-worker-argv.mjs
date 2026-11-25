// SA-Opus, review-1 response (R06): which script a worker thread sees in process.argv[1].
import { Worker } from 'node:worker_threads';
const w = new Worker(new URL('./bt-worker-argv-child.mjs', import.meta.url));
w.once('message', (m) => { console.log(`node ${process.version}; main argv[1] ${process.argv[1]}; worker argv[1] ${m}; the main script ${m === process.argv[1]}`); w.terminate(); });

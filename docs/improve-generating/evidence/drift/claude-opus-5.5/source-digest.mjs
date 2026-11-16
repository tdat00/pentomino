// Read-only: the computeSourceDigest of the worktree's SOURCE_FILES (the worktree's core and tools/bench equal 3fc65f4).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const report = await import(pathToFileURL(join(root, 'tools', 'bench', 'report.js')).href);
const digest = await report.computeSourceDigest((p) => readFileSync(join(root, ...p.split('/')), 'utf8'));
console.log(digest, report.SOURCE_FILES ? report.SOURCE_FILES.length : '?');

// Read-only check (SA-Opus, review-1 round): every `find` of the T02c and T05 edits occurs exactly once in its
// file at the frozen code (3fc65f4, read through `git show`, LF line endings as the tree builder reads them).
import { execFileSync } from 'node:child_process';

const COMMIT = '3fc65f4';
const show = (path) => execFileSync('git', ['show', `${COMMIT}:${path}`], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .replace(/\r\n/g, '\n');

import { EDITS } from './v4-anchors-list.mjs';


let bad = 0;
for (const [id, file, find] of EDITS) {
  const text = show(file);
  let n = 0;
  for (let i = text.indexOf(find); i >= 0; i = text.indexOf(find, i + 1)) {
    n += 1;
  }
  if (n !== 1) {
    bad += 1;
  }
  console.log(`${n === 1 ? 'ok  ' : 'FAIL'} ${id} ${file}: ${n}`);
}
console.log(bad === 0 ? 'all anchors unique' : `${bad} anchors not unique`);
process.exitCode = bad === 0 ? 0 : 1;

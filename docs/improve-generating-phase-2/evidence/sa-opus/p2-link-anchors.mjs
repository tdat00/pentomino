// @ts-check
// SA-Opus scratch (P2-12d design check): do the frozen log-5..8, link-1..17 and instr-7 edits apply to the phase-1 head
// (6b94ffb) and to the pack base (97a6326)? Read-only: git show into memory, applyEdit of the frozen tree builder.
// With `--root <dir>` it checks the working tree of `<dir>` instead (CRLF read as LF), for a slot's merge gate before
// P2-12b's G-COPIES exists: expected `<dir>: 22 of 22 edits apply`, exit 0; any edit that does not apply exits 1.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyEdit } from '../../../../tools/ig-proto/lib/tree.mjs';

const log = JSON.parse(readFileSync('tools/ig-proto/variants/log.json', 'utf8'));
const link = JSON.parse(readFileSync('tools/ig-proto/variants/link.json', 'utf8'));
const instr = JSON.parse(readFileSync('tools/ig-proto/variants/instr.json', 'utf8'));
const edits = [...log.edits.filter((e) => ['log-5', 'log-6', 'log-7', 'log-8'].includes(e.id)), ...link.edits, ...instr.edits.filter((e) => e.id === 'instr-7')];
const rootAt = process.argv.indexOf('--root');
const root = rootAt === -1 ? null : process.argv[rootAt + 1];
let failed = 0;
for (const commit of root === null ? ['6b94ffb', '97a6326'] : [root]) {
  const files = new Map();
  let ok = 0;
  for (const e of edits) {
    if (!files.has(e.file)) {
      files.set(e.file, root === null
        ? execFileSync('git', ['show', `${commit}:${e.file}`], { encoding: 'utf8', maxBuffer: 1 << 26 })
        : readFileSync(join(root, e.file), 'utf8').replace(/\r\n/g, '\n'));
    }
    try {
      files.set(e.file, applyEdit(files.get(e.file), e, 'p2-link'));
      ok += 1;
    } catch (err) {
      console.log(`${commit} ${e.id}: ${err.message}`);
      failed += 1;
    }
  }
  console.log(`${commit}: ${ok} of ${edits.length} edits apply`);
}
process.exitCode = root !== null && failed > 0 ? 1 : 0;

// @ts-check
// SA-Opus scratch (P2-12d design check): do the frozen log-5..8, link-1..17 and instr-7 edits apply to the phase-1 head
// (6b94ffb) and to the pack base (97a6326)? Read-only: git show into memory, applyEdit of the frozen tree builder.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { applyEdit } from '../../../../tools/ig-proto/lib/tree.mjs';

const log = JSON.parse(readFileSync('tools/ig-proto/variants/log.json', 'utf8'));
const link = JSON.parse(readFileSync('tools/ig-proto/variants/link.json', 'utf8'));
const instr = JSON.parse(readFileSync('tools/ig-proto/variants/instr.json', 'utf8'));
const edits = [...log.edits.filter((e) => ['log-5', 'log-6', 'log-7', 'log-8'].includes(e.id)), ...link.edits, ...instr.edits.filter((e) => e.id === 'instr-7')];
for (const commit of ['6b94ffb', '97a6326']) {
  const files = new Map();
  let ok = 0;
  for (const e of edits) {
    if (!files.has(e.file)) {
      files.set(e.file, execFileSync('git', ['show', `${commit}:${e.file}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
    }
    try {
      files.set(e.file, applyEdit(files.get(e.file), e, 'p2-link'));
      ok += 1;
    } catch (err) {
      console.log(`${commit} ${e.id}: ${err.message}`);
    }
  }
  console.log(`${commit}: ${ok} of ${edits.length} edits apply`);
}

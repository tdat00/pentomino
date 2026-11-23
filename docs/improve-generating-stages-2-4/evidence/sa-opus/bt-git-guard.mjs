// @ts-check
// SA-Opus, break-tasks (review R02): tries T01b's git guard (the reviewer's expression) on the files the self-test case
// scans (every .mjs, .js and .ps1 under tools/ig-proto and the copies of tools/calibrate.mjs in the trees base, instr and
// log; only phase1/p6-bench.ps1 may match), on the eleven sample texts T01b moves into
// tools/ig-proto/data/git-guard-cases.json, and on T01b's own new guard code (which must not match itself).
// Read-only, unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-git-guard.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT } from './s2-lib.mjs';

const GIT_CALL = /(?:execFileSync|execSync|spawnSync|spawn|execFile|exec|fork)\(\s*['"`]git(?:\.exe)?\b|(?:^|[;|({&]|\$\(|@\()\s*&?\s*git(?:\.exe)?\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)\s+)?(?:rev-parse|status|log|diff|show|add|commit|push|ls-files)\b/m;
/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : /\.(mjs|js|ps1)$/.test(e.name) ? [join(dir, e.name)] : []));
const files = [...walk(join(ROOT, 'tools', 'ig-proto')),
  ...['base', 'instr', 'log'].map((v) => join(ROOT, 'tests', 'artifacts', 'ig-proto', 'tree-frozen', v, 'tools', 'calibrate.mjs'))];
let bad = 0;
const matched = files.filter((f) => GIT_CALL.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f).split('\\').join('/'));
process.stdout.write(`${files.length} files scanned; matching: ${matched.join(', ') || 'none'}\n`);
bad += matched.length === 1 && matched[0] === 'tools/ig-proto/phase1/p6-bench.ps1' ? 0 : 1;
/** The content of T01b's tools/ig-proto/data/git-guard-cases.json. */
const CASES = [
  ['$head = @(& git -C $worktree rev-parse HEAD)', true], ['$s = $(git status --short)', true], ['git -C x log', true],
  ['& git diff', true], ['  git status', true], ["spawnSync('git', ['status'])", true], ['const x = (git status)', true],
  ['// the git status of a worktree', false], ['# git status in a comment', false],
  ['$head = @(& git -C "Q:\\a b" rev-parse HEAD)', true], ["& git.exe -C 'Q:\\a b' status", true],
];
for (const [text, hit] of CASES) {
  const got = GIT_CALL.test(/** @type {string} */ (text));
  bad += got === hit ? 0 : 1;
  process.stdout.write(`sample ${JSON.stringify(text)}: ${got} (expected ${hit})\n`);
}
/** T01b's new code exactly as the task file gives it (every ```js block of its steps); it must not match the expression. */
const TASK = readFileSync(join(ROOT, 'tasks', 'improve-generating-stages-2-4', 'T01b-git-guard.md'), 'utf8').replace(/\r\n/g, '\n');
const blocks = [...TASK.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1].split('\n').map((l) => l.replace(/^ {3}/, '')).join('\n'));
const NEW_CODE = blocks.join('\n');
process.stdout.write(`${blocks.length} js blocks read from T01b\n`);
bad += blocks.length === 4 ? 0 : 1;
const json = /```json\n([\s\S]*?)```/.exec(TASK);
const taskCases = json === null ? null : JSON.parse(json[1].split('\n').map((l) => l.replace(/^ {3}/, '')).join('\n'));
const sameCases = JSON.stringify(taskCases) === JSON.stringify(CASES);
bad += sameCases ? 0 : 1;
process.stdout.write(`T01b's JSON file content equals the eleven samples: ${sameCases}\n`);
const self = GIT_CALL.test(NEW_CODE);
bad += self ? 1 : 0;
process.stdout.write(`T01b's new guard code matches itself: ${self}\n`);
process.stdout.write(`JSON for git-guard-cases.json:\n${JSON.stringify(CASES)}\n`);
process.stdout.write(bad === 0 ? 'bt-git-guard: every check passed\n' : `bt-git-guard: ${bad} failures\n`);
process.exitCode = bad === 0 ? 0 : 1;

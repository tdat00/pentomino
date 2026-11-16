// @ts-check
// Read-only check of the pack author (SA-Opus) for T02a's report: is the fork's phase B to E text
// (tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js) the prototype's
// (tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js:728-840) with only the changes of T02a step 4.8,
// and is every name that block reads declared in the fork? Prints a line diff and the undeclared names. Runs nothing.
import { readFileSync } from 'node:fs';

const proto = readFileSync('tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js', 'utf8').split(/\r?\n/);
const fork = readFileSync('tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js', 'utf8').split(/\r?\n/);

const norm = (/** @type {string} */ l) => l.replace(/\/\*\* @type \{[^}]*\} \*\/ ?/g, '').trim();
const block = (/** @type {string[]} */ lines, /** @type {number} */ from, /** @type {number} */ to) => lines
  .slice(from - 1, to).map(norm).filter((l) => l !== '');

const forkFrom = fork.findIndex((l) => l.includes('// Phase B: window')) + 1;
let forkTo = forkFrom;
while (forkTo < fork.length && !/^ {2}\} catch \(e\) \{/.test(fork[forkTo - 1]) && !/^\}$/.test(fork[forkTo - 1])) {
  forkTo += 1;
}
const a = block(proto, 728, 840);
const b = block(fork, forkFrom, forkTo);
process.stdout.write(`prototype 728-840: ${a.length} lines; fork ${forkFrom}-${forkTo}: ${b.length} lines\n`);

// Longest common subsequence line diff.
const n = a.length;
const m = b.length;
const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
for (let i = n - 1; i >= 0; i -= 1) {
  for (let j = m - 1; j >= 0; j -= 1) {
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  }
}
let i = 0;
let j = 0;
let changes = 0;
while (i < n || j < m) {
  if (i < n && j < m && a[i] === b[j]) {
    i += 1;
    j += 1;
  } else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) {
    process.stdout.write(`+ ${b[j]}\n`);
    j += 1;
    changes += 1;
  } else {
    process.stdout.write(`- ${a[i]}\n`);
    i += 1;
    changes += 1;
  }
}
process.stdout.write(`${changes} changed line(s)\n`);

// Names the fork's block reads that the fork does not declare (const, let, function, class, import, parameter).
const text = fork.join('\n');
// Code only: no JSDoc lines, strings, line comments or object keys (`key:` without a space before the colon).
const code = b.filter((l) => !/^(\/\*\*|\*)/.test(l)).join('\n').replace(/'[^']*'|`[^`]*`|\/\/.*$/gm, '').replace(/[A-Za-z_$][\w$]*:(?!:)/g, '');
const used = new Set(code.match(/(?<![.\w$])[A-Za-z_$][\w$]*/g) ?? []);
const keywords = new Set(['const', 'let', 'for', 'if', 'else', 'return', 'of', 'new', 'true', 'false', 'null', 'continue',
  'break', 'while', 'typeof', 'undefined', 'in', 'throw', 'try', 'catch', 'function', 'Math', 'Set', 'Map', 'Number',
  'Array', 'Object', 'Error', 'JSON', 'String', 'Infinity']);
const declared = (/** @type {string} */ name) => new RegExp(
  `(const|let|var|function|class)\\s+${name}\\b|import \\{[^}]*\\b${name}\\b[^}]*\\}|[({,]\\s*${name}\\s*[,)}=]|\\(${name}\\)\\s*=>|\\b${name}\\s*=>`,
).test(text);
const missing = [...used].filter((u) => !keywords.has(u) && !declared(u));
process.stdout.write(`names read by the block: ${used.size}; not declared in the fork: ${missing.length === 0 ? 'none' : missing.join(', ')}\n`);

// @ts-check
// SA-Opus, break-tasks of improve-generating-stages-2-4: the repository's text conventions (tools/check-conventions.mjs
// `checkText`: UTF-8 without BOM, one line-ending style, no trailing whitespace, a final newline; and CRLF line ends, the
// workspace's rule) on the task pack and on this evidence folder, which `npm run check` does not scan. With `--fix` it
// first normalizes the files git does not track yet (BOM removed, CRLF, trailing whitespace removed, one final newline);
// tracked files are only checked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-conventions.mjs [--fix]
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const { checkText } = await import(pathToFileURL(join(ROOT, 'tools', 'check-conventions.mjs')).href);
const DIRS = ['tasks/improve-generating-stages-2-4', 'docs/improve-generating-stages-2-4/evidence/sa-opus'];
const untracked = new Set(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...DIRS], { cwd: ROOT, encoding: 'utf8' })
  .split(/\r?\n/).filter((l) => l !== ''));
let n = 0;
let fixed = 0;
/** @type {string[]} */
const problems = [];
for (const d of DIRS) {
  for (const f of readdirSync(join(ROOT, d)).sort()) {
    const rel = `${d}/${f}`;
    const file = join(ROOT, d, f);
    n += 1;
    if (process.argv.includes('--fix') && untracked.has(rel)) {
      const before = readFileSync(file);
      const text = before.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
        .map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n*$/, '\n').replace(/\n/g, '\r\n');
      const after = Buffer.from(text, 'utf8');
      if (!after.equals(before)) {
        writeFileSync(file, after);
        fixed += 1;
      }
    }
    const b = readFileSync(file);
    problems.push(...checkText(rel, b));
    const bare = (b.toString('utf8').match(/(?<!\r)\n/g) ?? []).length;
    if (bare > 0) {
      problems.push(`${rel}: ${bare} bare LF line ends`);
    }
  }
}
process.stdout.write(`bt-conventions: ${n} files checked, ${fixed} normalized, ${problems.length} problem(s)\n${problems.slice(0, 30).join('\n')}${problems.length ? '\n' : ''}`);
process.exitCode = problems.length === 0 ? 0 : 1;

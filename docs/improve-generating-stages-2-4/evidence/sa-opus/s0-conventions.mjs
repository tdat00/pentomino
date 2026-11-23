// @ts-check
// SA-Opus, round 1: the repository's text conventions (tools/check-conventions.mjs `checkText`: UTF-8 without BOM, one
// line-ending style, no trailing whitespace, a final newline) applied to SA-Opus's analysis and evidence folders, which
// `npm run check` does not scan (it covers core, generator, player, tools, tests and .github). Also counts bare LF line ends.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s0-conventions.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const { checkText } = await import(pathToFileURL(join(ROOT, 'tools', 'check-conventions.mjs')).href);
const dirs = ['docs/improve-generating-stages-2-4/sa-opus', 'docs/improve-generating-stages-2-4/evidence/sa-opus'];
let n = 0;
/** @type {string[]} */
const problems = [];
for (const d of dirs) {
  for (const f of readdirSync(join(ROOT, d))) {
    n += 1;
    const b = readFileSync(join(ROOT, d, f));
    problems.push(...checkText(`${d}/${f}`, b));
    const bare = (b.toString('utf8').match(/(?<!\r)\n/g) ?? []).length;
    if (bare > 0) problems.push(`${d}/${f}: ${bare} bare LF line ends`);
  }
}
process.stdout.write(`${n} files checked, ${problems.length} problem(s)\n${problems.slice(0, 20).join('\n')}${problems.length ? '\n' : ''}`);
process.exitCode = problems.length === 0 ? 0 : 1;

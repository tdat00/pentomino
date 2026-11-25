// @ts-check
// SA-Opus, round 1: the self time per function in V4-S2K's reduced-inlining CPU profiles (read-only, unlocked), as input
// of P7's spike (N-V4-05). A node's self time is the sum of the sample deltas that name it (T10b's rule); the shares are of
// the profile's total and of the time in `core/engine/deduce.js` and `core/engine/dlx.js`.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-profile.mjs
// Writes s2-profile.md beside this script.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { f, HERE, ROOT, writeCrlf } from './s2-lib.mjs';

const OUT = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen', 'V4-S2K', 'profile', 'out');
const md = ['# V4-S2K: self time per function (SA-Opus scratch, round 1)', '',
  'From the raw `.cpuprofile` files of V4-S2K (`--cpu-prof --no-turbo-inlining`, six window ratings of the first carved set',
  'of each case in the `instr` tree). Self time = the sum of the sample deltas naming the node (T10b\'s rule).', ''];
for (const cell of readdirSync(OUT)) {
  const dir = join(OUT, cell);
  const file = readdirSync(dir).find((n) => n.endsWith('.cpuprofile'));
  if (!file) continue;
  const prof = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  /** @type {Map<number, any>} */
  const nodes = new Map(prof.nodes.map((/** @type {any} */ n) => [n.id, n]));
  /** @type {Map<string, number>} */
  const self = new Map();
  let total = 0;
  for (let i = 0; i < prof.samples.length; i += 1) {
    const n = nodes.get(prof.samples[i]);
    const dt = (prof.timeDeltas[i] ?? 0) / 1000;
    total += dt;
    const cf = n.callFrame;
    const url = String(cf.url).replace(/^.*\/(core\/[^?]*)$/, '$1').replace(/^.*\/([^/]+)$/, '$1');
    const key = `${cf.functionName || '(anonymous)'} [${url}]`;
    self.set(key, (self.get(key) ?? 0) + dt);
  }
  const deduce = [...self].filter(([k]) => k.includes('deduce.js')).reduce((s, [, v]) => s + v, 0);
  const dlx = [...self].filter(([k]) => k.includes('dlx.js')).reduce((s, [, v]) => s + v, 0);
  md.push(`## ${cell}`, '', `Total ${f(total, 1)} ms; deduce.js ${f(deduce, 1)} ms (${f(100 * deduce / total, 1)} %); dlx.js ${f(dlx, 1)} ms (${f(100 * dlx / total, 1)} %).`, '',
    '| Function [file] | Self ms | % of total | % of deduce.js |', '|---|---:|---:|---:|');
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    md.push(`| ${k.replace(/\|/g, '/')} | ${f(v, 1)} | ${f(100 * v / total, 1)} | ${k.includes('deduce.js') ? f(100 * v / deduce, 1) : '-'} |`);
  }
  md.push('');
}
writeCrlf(join(HERE, 's2-profile.md'), md.join('\n'));
process.stdout.write(md.join('\n') + '\n');

// Read-only check (SA-Opus, ruling on V4-T10b): do the V4-T10b profiles attribute fewestColumn's lines to callers?
// For every node of core/engine/deduce.js, the positionTicks whose line lies inside fewestColumn's body in the instr
// tree's deduce.js are summed per owning function. Nothing is written.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const deduce = readFileSync(join(root, 'tests/artifacts/ig-proto/tree-frozen/instr/core/engine/deduce.js'), 'utf8').split('\n');
const start = deduce.findIndex((l) => l.includes('function fewestColumn()')) + 1;
let end = start;
let depth = 0;
for (let i = start - 1; i < deduce.length; i += 1) {
  for (const ch of deduce[i]) {
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
  }
  if (depth === 0 && i > start - 1) {
    end = i + 1;
    break;
  }
}
console.log(`fewestColumn: instr deduce.js lines ${start}-${end}`);
const calls = deduce.map((l, i) => (l.includes('fewestColumn();') ? i + 1 : null)).filter((n) => n !== null);
console.log(`call sites: instr deduce.js lines ${calls.join(', ')}`);
for (const cell of ['14x14-nightmare', '26x26-nightmare']) {
  const dir = join(root, 'tests/artifacts/ig-proto/frozen/V4-T10b/profile/out', cell);
  const file = readdirSync(dir).find((f) => f.endsWith('.cpuprofile'));
  const p = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const dt = new Map();
  p.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (p.timeDeltas[i] ?? 0)));
  let deduceUs = 0;
  let ownUs = 0;
  let withTicks = 0;
  const inside = new Map();
  let insideTicks = 0;
  let deduceTicks = 0;
  for (const n of p.nodes) {
    if (!String(n.callFrame.url).endsWith('core/engine/deduce.js')) continue;
    deduceUs += dt.get(n.id) ?? 0;
    if (n.callFrame.functionName === 'fewestColumn') ownUs += dt.get(n.id) ?? 0;
    if (Array.isArray(n.positionTicks) && n.positionTicks.length > 0) withTicks += 1;
    for (const t of n.positionTicks ?? []) {
      deduceTicks += t.ticks;
      if (calls.includes(t.line)) {
        const key = `call site ${t.line} in ${n.callFrame.functionName || '(anonymous)'}`;
        inside.set(key, (inside.get(key) ?? 0) + t.ticks);
      }
      if (t.line >= start && t.line <= end) {
        insideTicks += t.ticks;
        const key = n.callFrame.functionName || '(anonymous)';
        inside.set(key, (inside.get(key) ?? 0) + t.ticks);
      }
    }
  }
  console.log(`${cell}: deduce ${(deduceUs / 1000).toFixed(1)} ms; fewestColumn nodes ${(ownUs / 1000).toFixed(3)} ms; deduce nodes with positionTicks ${withTicks}; ticks on fewestColumn lines ${insideTicks} of ${deduceTicks} deduce ticks; by owner ${JSON.stringify(Object.fromEntries(inside))}`);
}

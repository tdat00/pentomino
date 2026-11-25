// Read-only checks of SA-Opus's ruling on V4-T11c's report (2026-11-17). (1) QUESTION 1: no plan under tools/ig-proto/plans/ has two
// keys that differ only in case outside the new rows price inputs, and none spells a key that run-task.ps1 reads in another case, so a
// read with ConvertFrom-Json -AsHashtable (case-sensitive keys) gives the runner what it read before. (2) QUESTION 2: the measured
// durations, the counted minutes of each kind of locked step and a P-1 pass at its reserves and at the v4 measures. It writes nothing.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'tools/ig-proto/plans';
const runnerKeys = ['task', 'allocationMinutes', 'optionalMinutes', 'steps', 'id', 'optional', 'node', 'locked', 'invocations', 'projectS',
  'minHorizonS', 'state', 'repeatUntilDone'];
const canonical = new Map(runnerKeys.map((k) => [k.toLowerCase(), k]));
for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const variants = [];
  const clashes = [];
  const walk = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (value && typeof value === 'object') {
      const seen = new Map();
      for (const key of Object.keys(value)) {
        const lower = key.toLowerCase();
        if (seen.has(lower)) {
          clashes.push(`${path}: ${seen.get(lower)}/${key}`);
        }
        seen.set(lower, key);
        if (canonical.has(lower) && canonical.get(lower) !== key) {
          variants.push(`${path}.${key}`);
        }
        walk(value[key], `${path}.${key}`);
      }
    }
  };
  walk(JSON.parse(readFileSync(join(dir, name), 'utf8')), '');
  const kinds = [...new Set(clashes.map((c) => c.replace(/^.*: /, '')))];
  console.log(name.padEnd(26), 'runner keys in another case:', variants.length, 'clashes:', clashes.length, kinds.join(' '));
}

const m = await import('../../../../../tools/ig-proto/manifest.mjs');
const d = m.durationsFromLogs();
console.log(JSON.stringify(d));
const plans = ['V4-S2', 'V4-LIVE'].map((p) => JSON.parse(readFileSync(join(dir, `${p}.json`), 'utf8')));
for (const plan of plans) {
  let all = 0;
  const byKind = {};
  for (const s of plan.steps.filter((x) => x.locked)) {
    const c = s.projectS + 45 * s.invocations;
    all += c;
    const k = s.id.startsWith('rows-') ? 'rows' : s.id.startsWith('parity-') ? 'parity' : s.id;
    byKind[k] = byKind[k] ?? { n: 0, s: 0, inv: 0, node: 0 };
    byKind[k].n += 1;
    byKind[k].s += c;
    byKind[k].inv += s.invocations;
    byKind[k].node += s.projectS;
  }
  console.log(plan.task, 'allocation', plan.allocationMinutes, 'counted min', (all / 60).toFixed(1));
  for (const [k, v] of Object.entries(byKind)) {
    console.log('  ', k.padEnd(16), 'steps', v.n, 'invocations', v.inv, 'node s', v.node.toFixed(0), 'counted min', (v.s / 60).toFixed(1),
      'quiet min', ((v.inv * 45) / 60).toFixed(1));
  }
}
const pass = plans[0].steps.find((s) => s.id === 'parity-fr-base');
console.log(JSON.stringify(pass.price.groups.map((g) => ({ kind: g.kind, variant: g.variant, lanes: g.lanes, reserveS: g.reserveS, n: g.durationsS.length,
  s: g.durationsS[0], source: g.durationSource }))));
const atReserve = m.stepPrice(pass.price);
console.log('P-1 pass at the reserves', atReserve.projectS, 's node,', atReserve.invocations, 'invocations,', (atReserve.countedS / 60).toFixed(2), 'min');
const v4 = { ...pass.price, groups: pass.price.groups.map((g) => ({ ...g, durationsS: g.durationsS.map(() => d[`${g.kind}/v4`]) })) };
const atV4 = m.stepPrice(v4);
console.log('P-1 pass at the v4 measures', atV4.projectS.toFixed(1), 's node,', atV4.invocations, 'invocations,', (atV4.countedS / 60).toFixed(2), 'min');

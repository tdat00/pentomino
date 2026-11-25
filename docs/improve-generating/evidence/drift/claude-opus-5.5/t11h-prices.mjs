// Read-only prices of the frozen round under the owner's lock rules of 2026-11-17 21:33 (SA-Opus): a locked invocation may last
// 900 s (horizon 885 s), the quiet period is 15 s when difficulty-v3 has nothing scheduled and 45 s otherwise. T11b's simulations are
// ported here with the horizon, the counted quiet and the kill as parameters; at the old values (285, 45, 300) they must reproduce
// every compiled price exactly (checked below), then they price the plans and the universe that T11c compiled (read from git HEAD,
// so that a working tree in the middle of a fix round is never read). The price counts 45 s of quiet per invocation (fail-closed:
// the idle state is not known when a plan is approved); the idle line counts 15 s. It writes nothing.
import { execFileSync } from 'node:child_process';

const head = (p) => JSON.parse(execFileSync('git', ['show', `HEAD:tools/ig-proto/plans/${p}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const s2 = head('V4-S2.json');
const live = head('V4-LIVE.json');
const universe = head('V4-S4.universe.json');

function simulateRows({ rows, rowS, rowLimitS }, H, startupS = 2) {
  const invocations = [];
  let left = rows;
  let completed = 0;
  let censored = 0;
  while (left > 0) {
    let e = startupS;
    let ran = 0;
    while (left > 0 && e + rowLimitS + 10 <= H) {
      e += Math.min(rowS, rowLimitS + 10);
      if (rowS > rowLimitS) censored += 1; else completed += 1;
      left -= 1;
      ran += 1;
    }
    if (ran === 0) throw new Error('inadmissible rows');
    invocations.push(e);
  }
  return { invocations, completed, censored, units: rows };
}

function simulateItems({ groups }, H, startupS = 2, groupStartS = 3, cutMarginS = 15) {
  const cutS = H - cutMarginS;
  const placed = groups.map(() => 0);
  const invocations = [];
  let completed = 0;
  let censored = 0;
  while (groups.some((g, i) => placed[i] < g.durationsS.length)) {
    let e = startupS;
    let items = 0;
    for (const [i, group] of groups.entries()) {
      const total = group.durationsS.length;
      if (placed[i] >= total) continue;
      if (e + group.reserveS > cutS) break;
      e += groupStartS;
      const free = new Array(group.lanes).fill(e);
      while (placed[i] < total) {
        const lane = free.indexOf(Math.min(...free));
        const t = free[lane];
        if (t + group.reserveS > cutS) break;
        const end = t + group.durationsS[placed[i]];
        if (end > cutS) { free[lane] = cutS; censored += 1; } else { free[lane] = end; completed += 1; }
        placed[i] += 1;
        items += 1;
      }
      e = Math.max(...free);
      if (placed[i] < total) break;
    }
    if (items === 0) throw new Error('inadmissible items');
    invocations.push(e);
  }
  return { invocations, completed, censored, units: groups.reduce((s, g) => s + g.durationsS.length, 0) };
}

const simulate = (price, H) => (price.type === 'rows' ? simulateRows(price, H)
  : price.type === 'items' ? simulateItems(price, H)
    : simulateItems({ groups: [{ kind: 'process', variant: 'process', lanes: 1, reserveS: price.reserveS, durationsS: price.durationsS }] }, H, 2, 0));

const rules = { old: { H: 285, Q: 45, kill: 300 }, now: { H: 885, Q: 45, kill: 900 }, idle: { H: 885, Q: 15, kill: 900 } };
function priced(price, { H, Q, kill }) {
  const s = simulate(price, H);
  const nodeS = s.invocations.reduce((a, b) => a + b, 0);
  return { nodeS, inv: s.invocations.length, countedS: nodeS + Q * s.invocations.length, ceilingS: s.units * (kill + 45), censored: s.censored, units: s.units };
}

// 1. The port reproduces every compiled price.
let checked = 0;
for (const step of [...s2.steps, ...live.steps].filter((x) => x.locked)) {
  const p = priced(step.price, rules.old);
  if (Math.abs(p.nodeS - step.projectS) > 1e-6 || p.inv !== step.invocations) throw new Error(`port differs on ${step.id}`);
  checked += 1;
}
for (const c of Object.values(universe.collections)) {
  for (const g of [...c.groups, ...c.comparators]) {
    const p = priced(g.price, rules.old);
    if (Math.abs(p.nodeS - g.projectS) > 1e-6 || p.inv !== g.invocations) throw new Error(`port differs on ${g.id}`);
    checked += 1;
  }
}
console.log(`port: ${checked} compiled prices reproduced at the old rules`);

const kindOf = (id) => (id.startsWith('rows-') ? 'rows' : id.startsWith('parity-') ? 'P-1 passes' : id === 'p0-v4' ? 'P-0' : 'probes');
const total = (list) => list.reduce((a, b) => ({ nodeS: a.nodeS + b.nodeS, inv: a.inv + b.inv, countedS: a.countedS + b.countedS, ceilingS: a.ceilingS + b.ceilingS,
  censored: a.censored + b.censored, units: a.units + b.units }), { nodeS: 0, inv: 0, countedS: 0, ceilingS: 0, censored: 0, units: 0 });
const m = (s) => (s / 60).toFixed(1);
const lines = {};
for (const [name, r] of Object.entries(rules)) {
  const out = {};
  for (const plan of [s2, live]) {
    const steps = plan.steps.filter((x) => x.locked);
    const per = {};
    for (const st of steps) (per[kindOf(st.id)] ??= []).push(priced(st.price, r));
    const all = total(steps.map((st) => priced(st.price, r)));
    out[plan.task] = { all, per: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, total(v)])) };
  }
  for (const [cname, c] of Object.entries(universe.collections)) out[cname] = { all: total([...c.groups, ...c.comparators].map((g) => priced(g.price, r))) };
  // The four P-1 passes of V4-S4 (T11e prices them at the activation): the stage-2 pass input with the fr-* reserves.
  const pass = s2.steps.find((x) => x.id === 'parity-fr-base').price;
  out['V4-S4 P-1 passes'] = { all: total([0, 1, 2, 3].map(() => priced(pass, r))) };
  lines[name] = out;
}
for (const [name, out] of Object.entries(lines)) {
  console.log(`\n${name}: ${JSON.stringify(rules[name])}`);
  for (const [k, v] of Object.entries(out)) {
    const alloc = Math.ceil(v.all.countedS / 60);
    console.log(`  ${k.padEnd(18)} counted ${m(v.all.countedS).padStart(7)} min  allocation ${String(alloc).padStart(5)}  guard ${(1.25 * v.all.countedS / 60).toFixed(0).padStart(5)}  ceiling ${m(v.all.ceilingS).padStart(8)}  invocations ${String(v.all.inv).padStart(4)}  censored ${v.all.censored}`);
    for (const [kk, vv] of Object.entries(v.per ?? {})) console.log(`      ${kk.padEnd(14)} counted ${m(vv.countedS).padStart(7)} min  invocations ${String(vv.inv).padStart(4)}  node ${m(vv.nodeS)} min`);
  }
  const req = ['V4-S2', 'V4-LIVE', 'initial', 'V4-S4 P-1 passes'].map((k) => out[k].all);
  const uni = ['live', 'initial', 'conditional', 'optional', 'second'].filter((k) => out[k]).map((k) => out[k].all);
  const t = total(req);
  console.log(`  required set (V4-S2, V4-LIVE, the initial collection, V4-S4's P-1 passes): counted ${m(t.countedS)} min = ${(t.countedS / 3600).toFixed(1)} h, guard ${(1.25 * t.countedS / 3600).toFixed(1)} h, invocations ${t.inv}`);
  const rowsOnly = total([out['V4-S2'].per.rows, out['V4-LIVE'].per.rows, out.initial.all, out.conditional.all, out.optional.all, out.second.all]);
  console.log(`  every request row (T11b's matrix): counted ${m(rowsOnly.countedS)} min, invocations ${rowsOnly.inv}, quiet ${m(rowsOnly.inv * rules[name].Q)} min`);
  const all = total([out['V4-S2'].all, out['V4-LIVE'].all, out.initial.all, out.conditional.all, out.optional.all, out.second.all, out['V4-S4 P-1 passes'].all]);
  console.log(`  everything priced (plans, universe, V4-S4's P-1 passes): counted ${m(all.countedS)} min = ${(all.countedS / 3600).toFixed(1)} h`);
}

// The initial collection by item, a P-1 pass at the v4 measures, and the fr-frozen twins of the cells whose provisional class has no
// screen (plan P2: Hell 1 on every board, Nightmare up to 144 cells; Nightmare of 360 cells and more unknown until the pilots), under
// the old and the new rules: the inputs of the options (b) and (f2).
const area = { '3x29-nightmare': 87, '10x10-nightmare': 100, '12x12-nightmare': 144, '18x20-nightmare': 360, '20x20-nightmare': 400,
  '20x21-nightmare': 420, '32x15-nightmare': 480, '22x22-nightmare': 484, '24x24-nightmare': 576, '26x26-nightmare': 676 };
const noScreen = (cell) => cell.endsWith('-hell-1') || (area[cell] !== undefined && area[cell] <= 144);
const unknown = (cell) => area[cell] !== undefined && area[cell] >= 360;
const v4 = { 'v4-select': 34.57975, 'v4-generate': 23.622666666666667, 'v4-replay': 16.315833333333334 };
const pass = s2.steps.find((x) => x.id === 'parity-fr-base').price;
const passV4 = { ...pass, groups: pass.groups.map((g) => ({ ...g, durationsS: g.durationsS.map(() => v4[g.kind]) })) };
for (const name of ['old', 'now']) {
  const r = rules[name];
  const byItem = {};
  for (const g of universe.collections.initial.groups.concat(universe.collections.initial.comparators)) {
    (byItem[g.items.join('+')] ??= []).push(priced(g.price, r));
  }
  console.log(`\n${name}: initial by item`, Object.entries(byItem).map(([k, v]) => `${k} ${m(total(v).countedS)}`).join(', '));
  const p = priced(passV4, r);
  console.log(`  a P-1 pass at the v4 measures: ${m(p.countedS)} min (${p.inv} invocation(s)); seven: ${m(7 * p.countedS)} min`);
  for (const c of ['initial', 'conditional', 'second']) {
    const twins = universe.collections[c].groups.filter((g) => g.arm === 'fr-frozen');
    const dup = total(twins.filter((g) => noScreen(g.cell)).map((g) => priced(g.price, r)));
    const maybe = total(twins.filter((g) => unknown(g.cell)).map((g) => priced(g.price, r)));
    console.log(`  ${c}: fr-frozen twins of no-screen cells ${m(dup.countedS)} min; of Nightmare cells of 360 and more ${m(maybe.countedS)} min`);
  }
}

// The forecast lines of run-task.ps1's dry runs under the new rules (Σ projectS + 45 x invocations of the locked steps, in seconds).
for (const plan of [s2, live]) {
  const steps = plan.steps.filter((x) => x.locked).map((st) => priced(st.price, rules.now));
  const forecastS = steps.reduce((a, b) => a + b.nodeS + 45 * b.inv, 0);
  const allocation = Math.ceil(forecastS / 60);
  console.log(`dry run ${plan.task}: forecast ${forecastS.toFixed(1)} s counted (allocation ${allocation * 60} s, guard ${1.25 * allocation * 60} s); allocation ${allocation} min`);
}

// SA-Astra's review of 2026-11-17 (finding 4a): what wider lanes for the `v4-select` and `v4-replay` items would save on the
// stage-2 P-1 passes and the P-0 pass, at the new rules, under the reserve durations (as priced) and under the `v4` proxy.
const p0 = s2.steps.find((x) => x.id === 'p0-v4').price;
const widen = (price, lanes) => ({ ...price, groups: price.groups.map((g) => (g.kind === 'v4-generate' ? g : { ...g, lanes })) });
const proxy = (price) => ({ ...price, groups: price.groups.map((g) => ({ ...g, durationsS: g.durationsS.map((d) => (g.durationSource === 'reserve' ? v4[g.kind] : d)) })) });
for (const [label, f] of [['reserve durations', (x) => x], ['v4 proxy', proxy]]) {
  const cost = (lanes) => 7 * priced(widen(f(pass), lanes), rules.now).countedS + priced(widen(f(p0), lanes), rules.now).countedS;
  const base = cost(2);
  console.log(`lanes, ${label}: 2 lanes ${m(base)} min; 4 lanes saves ${m(base - cost(4))} min; 8 lanes saves ${m(base - cost(8))} min`);
}

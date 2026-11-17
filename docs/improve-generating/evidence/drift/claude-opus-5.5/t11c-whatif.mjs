// Read-only what-if pricing of the frozen round (SA-Opus, 2026-11-17, for the owner's questions of 20:12 and 20:16). It reads the
// plans and the universe that V4-T11c compiled and re-simulates their request rows under T11b's row rule (a row starts while
// `e + rowLimitS + 10 <= H`, startup 2 s, one counted quiet period per invocation) with another horizon (a lock-helper cap above
// 300 s: H = cap - 15), another counted quiet period, or concurrent lanes with a slowdown. It writes nothing; numbers are counted
// minutes of the request rows only (the P-1, P-0 and probe steps are apart: t11c-checks.mjs).
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(`tools/ig-proto/plans/${p}`, 'utf8'));
const s2 = read('V4-S2.json');
const live = read('V4-LIVE.json');
const universe = read('V4-S4.universe.json');

/** One group of rows; `lanes` rows run at once, each `slow` times longer. */
function rows({ rows: n, rowS, rowLimitS }, { H = 285, Q = 45, lanes = 1, slow = 1, startup = 2 } = {}) {
  let left = n;
  let node = 0;
  let inv = 0;
  let censored = 0;
  const t = rowS * slow;
  while (left > 0) {
    let e = startup;
    let ran = 0;
    while (left > 0 && e + rowLimitS + 10 <= H) {
      const k = Math.min(lanes, left);
      e += Math.min(t, rowLimitS + 10);
      if (t > rowLimitS) {
        censored += k;
      }
      left -= k;
      ran += k;
    }
    if (ran === 0) {
      throw new Error('inadmissible');
    }
    node += e;
    inv += 1;
  }
  return { node, inv, quiet: Q * inv, counted: node + Q * inv, censored };
}

const zero = { node: 0, inv: 0, quiet: 0, counted: 0, censored: 0 };
const add = (a, b) => ({ node: a.node + b.node, inv: a.inv + b.inv, quiet: a.quiet + b.quiet, counted: a.counted + b.counted, censored: a.censored + b.censored });
const sum = (list, o) => list.map((g) => rows(g, o)).reduce(add, zero);
const min = (x) => (x / 60).toFixed(0);
const stepRows = (plan) => plan.steps.filter((s) => s.id.startsWith('rows-')).map((s) => ({
  ...s.price, key: s.id, items: [], arm: s.node[s.node.indexOf('--arm') + 1], cell: s.node[s.node.indexOf('--cases') + 1].split(':')[0],
}));
const groupsOf = (name) => universe.collections[name].groups.concat(universe.collections[name].comparators)
  .map((g) => ({ ...g.price, key: g.id, items: g.items, cell: g.cell, arm: g.arm }));
const sets = { stage2: stepRows(s2), live: stepRows(live), initial: groupsOf('initial'), conditional: groupsOf('conditional'),
  optional: groupsOf('optional'), second: groupsOf('second') };

// An indication of the likely cost, not a price: the rows of the new arms on the six cells the provisional round measured take
// their provisional gen-v4 T10 medians (plan section 4: Measured, provisional, n 2 to 6); every other row takes today's MP12b1 median
// times the identity factor (the priced row without R15's 1.25 margin); a row priced at its limit for want of a report stays there.
const gen4 = { '14x14-nightmare': 8.9, '15x15b10-nightmare': 8.5, '12x12-nightmare': 16.5, '26x26-nightmare': 11.9, '26x26-hell-1': 34.2,
  '20x20-hell-1': 42.9 };
const likely = (g) => {
  const isNew = g.arm.startsWith('fr-') || g.arm === 'shipped-uncapped';
  if (isNew && gen4[g.cell] !== undefined) {
    return { ...g, rowS: gen4[g.cell] };
  }
  return { ...g, rowS: g.rowS === g.rowLimitS ? g.rowS : g.rowS / 1.25 };
};
const likelySets = Object.fromEntries(Object.entries(sets).map(([k, list]) => [k, list.map(likely)]));

const scenarios = [
  ['today: cap 300 s, quiet 45 s', {}], ['(d) quiet 15 s', { Q: 15 }], ['(d) quiet 5 s', { Q: 5 }], ['(c) cap 600 s', { H: 585 }],
  ['(c) cap 900 s', { H: 885 }], ['(c) cap 1800 s', { H: 1785 }], ['(c) cap 3600 s', { H: 3585 }], ['(c)+(d) cap 900 s, quiet 15 s', { H: 885, Q: 15 }],
  ['(a) 2 lanes, x1.30', { lanes: 2, slow: 1.30 }], ['(a) 3 lanes, x1.60', { lanes: 3, slow: 1.60 }], ['(a) 3 lanes, x2.00', { lanes: 3, slow: 2.00 }],
];
for (const [label, table] of [['price (as compiled)', sets], ['likely (indication)', likelySets]]) {
  console.log(`\n${label}`.padEnd(32), Object.keys(table).map((k) => k.padStart(12)).join(''), '   all rows  invocations  quiet  censored');
  for (const [name, o] of scenarios) {
    const per = Object.values(table).map((list) => sum(list, o));
    const all = per.reduce(add, zero);
    console.log(name.padEnd(31), per.map((p) => min(p.counted).padStart(12)).join(''), min(all.counted).padStart(11), String(all.inv).padStart(12),
      min(all.quiet).padStart(6), String(all.censored).padStart(9));
  }
}

// The initial collection by item.
const byItem = {};
for (const g of sets.initial) {
  const k = g.items.join('+');
  const p = rows(g);
  byItem[k] = byItem[k] ?? { groups: 0, rows: 0, counted: 0, inv: 0 };
  byItem[k].groups += 1;
  byItem[k].rows += g.rows;
  byItem[k].counted += p.counted;
  byItem[k].inv += p.inv;
}
console.log('');
for (const [k, v] of Object.entries(byItem)) {
  console.log('initial', k.padEnd(6), 'groups', String(v.groups).padStart(3), 'rows', String(v.rows).padStart(4), 'invocations', String(v.inv).padStart(4), 'counted min', min(v.counted));
}

// The fr-frozen twins whose cell has no screen in the plan's provisional W_screen table (P2): Hell 1 on every board and Nightmare up
// to 144 cells (OD-P7); the Nightmare cells of 360 and more stay unknown until the stage-2 pilots.
const area = { '3x29-nightmare': 87, '10x10-nightmare': 100, '12x12-nightmare': 144, '18x18-nightmare': 324, '18x20-nightmare': 360, '20x20-nightmare': 400,
  '20x21-nightmare': 420, '32x15-nightmare': 480, '22x22-nightmare': 484, '24x24-nightmare': 576, '26x26-nightmare': 676 };
const noScreen = (cell) => cell.endsWith('-hell-1') || (area[cell] !== undefined && area[cell] <= 144);
const unknown = (cell) => area[cell] !== undefined && area[cell] >= 360;
for (const name of ['initial', 'conditional', 'second']) {
  const dup = sets[name].filter((g) => g.arm === 'fr-frozen' && noScreen(g.cell));
  const maybe = sets[name].filter((g) => g.arm === 'fr-frozen' && unknown(g.cell));
  console.log(name, 'fr-frozen twins on no-screen cells:', dup.map((g) => g.cell).join(', '), 'counted min', min(sum(dup, {}).counted),
    '| on Nightmare cells of 360 and more:', maybe.length, 'counted min', min(sum(maybe, {}).counted));
}

// The required set of the first approvals (stage 2, V4-LIVE and the initial collection), per option, with and without those twins.
const req = ['stage2', 'live', 'initial'];
const drop = (list) => list.filter((g) => !(g.key.startsWith('V4-S4/fr-frozen/') && noScreen(g.cell)));
console.log('\nrequired set: stage 2 + V4-LIVE + initial, rows only');
for (const [name, o] of scenarios.filter(([n]) => !n.includes('3 lanes') && !n.includes('quiet 5') && !n.includes('1800') && !n.includes('3600'))) {
  const at = (s, f = (x) => x) => req.map((k) => sum(f(s[k]), o)).reduce(add, zero);
  const p = at(sets);
  const l = at(likelySets);
  console.log(name.padEnd(31), 'price', min(p.counted).padStart(5), `(${(p.counted / 3600).toFixed(1)} h)`, ' likely', min(l.counted).padStart(5),
    `(${(l.counted / 3600).toFixed(1)} h)`, ' without the duplicate twins: price', min(at(sets, drop).counted).padStart(5), 'likely',
    min(at(likelySets, drop).counted).padStart(5), ' invocations', p.inv, 'censored', p.censored);
}

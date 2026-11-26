// @ts-check
// SA-Opus, improve-generating phase 2, round-1 cross-review: one price for the reconciled production validation.
// 1. Reads the pure pricing section of tools/ig-proto/manifest.mjs (T11g: horizon 885 s, 45-s quiet per invocation, 2-s start-up,
//    10-s row margin, guard 1.25), the same way as SA-Astra's round1-audit.mjs, without importing the module.
// 2. Calibrates two per-row bases on the frozen round's own row steps: SA-Astra's proxy (1.25 x the arm/cell median response)
//    and SA-Opus's (the arm/cell mean response + 1.0 s), against the counted seconds the row steps really took
//    (tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl, steps `rows-*`).
// 3. Prices the converged matrix of round-1-cross-review.md section 8 (after the coordination with SA-Astra) with SA-Astra's
//    round-1 proxy, component by component; SA-Astra computes the final enumerated schedule.
// Read-only; writes p2-xr-price.md and p2-xr-price.json.
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-price.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const text = (/** @type {string} */ p) => readFileSync(join(ROOT, ...p.split('/')), 'utf8');

const manifest = text('tools/ig-proto/manifest.mjs');
const from = manifest.indexOf('const HORIZON_S = 885;');
const to = manifest.indexOf('// ---- Plans (V4-T11c) ----', from);
if (from < 0 || to <= from) throw new Error('pricing section not found');
/** @type {{ price: (steps: any[]) => any, PRICING: any }} */
const T11G = runInNewContext(`${manifest.slice(from, to).replace(/^export /gm, '')}\n({ price, PRICING });`, {}, { timeout: 1000 });

/** @type {Map<string, { rows: number, median: number, mean: number }>} */
const sets = new Map();
const median = (/** @type {number[]} */ a) => {
  const s = a.slice().sort((x, y) => x - y);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
for (const [task, arms] of [['V4-S4', ['fr-frozen', 'fr-frozen-none', 'log-link']], ['V4-S4C', ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']]]) {
  for (const arm of /** @type {string[]} */ (arms)) {
    const dir = `docs/improve-generating/evidence/frozen/${task}/${arm}`;
    for (const f of readdirSync(join(ROOT, ...dir.split('/'))).filter((n) => n.endsWith('.runs.json'))) {
      const rows = JSON.parse(text(`${dir}/${f}`)).rows;
      const t = rows.map((/** @type {any} */ r) => r.run.responseMs / 1000);
      sets.set(`${task}/${arm}/${rows[0].caseId}`, { rows: rows.length, median: median(t), mean: t.reduce((a, b) => a + b, 0) / t.length });
    }
  }
}
const get = (/** @type {string} */ key) => {
  const s = sets.get(key);
  if (s === undefined) throw new Error(`no rows for ${key}`);
  return s;
};

// ---- 2. Calibration on the frozen row steps ----
/** @param {string} task @returns {number} */
const actualRowsCountedS = (task) => {
  const p = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen', task, 'invocations.jsonl');
  if (!existsSync(p)) return NaN;
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    .filter((l) => l.step.startsWith('rows-')).reduce((s, l) => s + l.countedSeconds, 0);
};
/** @param {string} task @param {'astra' | 'opus'} basis */
const priceFrozen = (task, basis) => {
  const steps = [...sets.entries()].filter(([k]) => k.startsWith(`${task}/`)).map(([k, s]) => {
    const arm = k.split('/')[1];
    const rowLimitS = task === 'V4-S4' && arm !== 'log-link' ? 130 : 260;
    const rowS = basis === 'astra' ? 1.25 * s.median : s.mean + 1.0;
    return { type: 'rows', rows: s.rows, rowS, rowLimitS };
  });
  return T11G.price(steps);
};
const calibration = ['V4-S4', 'V4-S4C'].map((task) => {
  const actual = actualRowsCountedS(task);
  const a = priceFrozen(task, 'astra');
  const o = priceFrozen(task, 'opus');
  return { task, actualRowsCountedS: actual, astraCountedS: a.countedS, astraGuardS: a.guardS, opusCountedS: o.countedS,
    astraOverActual: a.countedS / actual, opusOverActual: o.countedS / actual, invocationsPriced: a.invocations };
});

// ---- 3. The reconciled matrix, SA-Astra's proxy (1.25 x median) ----
/** @param {string} role @param {string} source @param {number} rows @param {number} rowLimitS @param {number} [atLimit] */
const group = (role, source, rows, rowLimitS, atLimit) => ({
  role, source, rows, rowLimitS,
  step: { type: 'rows', rows, rowLimitS, rowS: atLimit === undefined ? 1.25 * get(source).median : atLimit },
});
const failing = ['12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare', '15x20-nightmare'];
const controls = ['3x29-nightmare', '10x10-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare',
  '22x22-nightmare', '24x24-nightmare', '26x26-nightmare', '32x15-nightmare'];
const hell = ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'];
const nmid = ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'];
const master = [...sets.keys()].filter((k) => k.startsWith('V4-S4/log-link/') && k.endsWith('-master')).map((k) => k.split('/')[2]);
const shippedArm = (/** @type {string} */ cell) => (nmid.includes(cell) ? 'fr-frozen' : 'fr-frozen-none');
/** @type {Record<string, ReturnType<typeof group>[]>} */
const components = {
  'core: gen-v4 shipped on the 19 frozen Nightmare and Hell 1 cells x 20 (26x26 by the legacy route)': [...failing, ...controls, ...hell]
    .map((c) => (c === '26x26-nightmare' ? group('shipped-route', `V4-S4/log-link/${c}`, 20, 260) : group('shipped', `V4-S4/${shippedArm(c)}/${c}`, 20, 130))),
  'core: gen-v4 on the 16 Master cells x 5': master.map((c) => group('shipped-master', `V4-S4/log-link/${c}`, 5, 260)),
  'core: today (6b94ffb) on the 10 controls x 20': controls.map((c) => group('today-control', `V4-S4/log-link/${c}`, 20, 260)),
  'core: today on the 16 Master cells x 5': master.map((c) => group('today-master', `V4-S4/log-link/${c}`, 5, 260)),
  'core: n-mid without the screen (measurement copy) x 20': nmid.map((c) => group('nmid-no-screen', `V4-S4/fr-frozen-none/${c}`, 20, 130)),
  'boards without a prior cell, both arms x 20 (11x11, 18x19, 21x21; proxies 10x10, 18x18, 20x21)': [
    ['11x11', '10x10-nightmare'], ['18x19', '18x18-nightmare'], ['21x21', '20x21-nightmare'],
  ].flatMap(([b, p]) => [group(`no-prior-gen-v4 ${b}`, `V4-S4/fr-frozen-none/${p}`, 20, 130), group(`no-prior-today ${b}`, `V4-S4/log-link/${p}`, 20, 260)]),
  'board without a prior cell, gen-v4 only x 20 (15x15; proxy 15x15b10 with the screen)': [group('no-prior-gen-v4 15x15', 'V4-S4/fr-frozen/15x15b10-nightmare', 20, 130)],
  'port smoke: 8 representative requests before the timed matrix (frozen reps 20; one mixed step)': (() => {
    const parts = ['V4-S4/fr-frozen/14x14-nightmare', 'V4-S4/fr-frozen-none/10x10-nightmare', 'V4-S4/fr-frozen-none/18x18-nightmare',
      'V4-S4/fr-frozen-none/22x22-nightmare', 'V4-S4/log-link/26x26-nightmare', 'V4-S4/fr-frozen-none/20x20-hell-1',
      'V4-S4/fr-frozen-none/15x20-nightmare', 'V4-S4/log-link/10x10-master'];
    const rowS = parts.reduce((s, k) => s + 1.25 * get(k).median, 0) / parts.length;
    return [{ role: 'smoke', source: 'mixed', rows: parts.length, rowLimitS: 260,
      step: { type: 'rows', rows: parts.length, rowLimitS: 260, rowS } }];
  })(),
  'N-V4-15: require x 5, Nightmare 22x22 and 32x15 (today, gen-v4, uncapped), Hell 1 22x22 and 32x15 (gen-v4, uncapped), at the row limits': [
    ...['22x22-nightmare', '32x15-nightmare'].flatMap((c) => [
      group(`require-today ${c}`, `V4-S4/log-link/${c}`, 5, 260, 260),
      group(`require-gen-v4 ${c}`, `V4-S4/fr-frozen-none/${c}`, 5, 130, 130),
      group(`require-uncapped ${c}`, `V4-S4/fr-frozen-none/${c}`, 5, 260, 260)]),
    ...['22x22-hell-1', '32x15-hell-1'].flatMap((c) => [
      group(`require-gen-v4 ${c}`, 'V4-S4/fr-frozen-none/24x24-hell-1', 5, 130, 130),
      group(`require-uncapped ${c}`, 'V4-S4/fr-frozen-none/24x24-hell-1', 5, 260, 260)]),
  ],
  'predeclared conditional uncapped twins: 15 main-matrix rows (frozen: 10 rows, all 14x14 Hell 1) at that twin\'s proxy': [
    group('twins-main', 'V4-S4C/fr-frozen-none-uncapped/14x14-hell-1', 15, 260),
  ],
};
const quoted = Object.entries(components).map(([name, groups]) => {
  const p = T11G.price(groups.map((g) => g.step));
  if (!p.admissible) throw new Error(`${name}: not admissible`);
  return { name, rows: groups.reduce((s, g) => s + g.rows, 0), invocations: p.invocations, countedS: p.countedS, guardS: p.guardS };
});
// Items priced outside the row machinery (their sources in the cross-review): the four proof bundles at the counted seconds
// of V4-S4's four parity steps (1,400.916 s, the measured cost of the same kind of bundle), SA-Astra's resource replays
// (533 counted s) and her six browser checks (6 x (120 + 45) s, a ceiling).
const items = [
  { name: 'four proof bundles (observers, certificate, prior, legacy route), at the measured cost of V4-S4\'s parity steps', countedS: 1400.916 },
  { name: 'resource replays (SA-Astra\'s 8 items)', countedS: 533 },
  { name: 'browser functional checks (SA-Astra\'s 6, ceiling)', countedS: 990, guardIsCounted: true },
];
const rowsCounted = quoted.reduce((s, q) => s + q.countedS, 0);
const rowsGuard = quoted.reduce((s, q) => s + q.guardS, 0);
const itemsCounted = items.reduce((s, i) => s + i.countedS, 0);
const itemsGuard = items.reduce((s, i) => s + (i.guardIsCounted ? i.countedS : 1.25 * i.countedS), 0);
const total = { rows: quoted.reduce((s, q) => s + q.rows, 0), countedS: rowsCounted + itemsCounted, guardS: rowsGuard + itemsGuard };
// Stage A, the measurements that can stop the plan, before the rest: the port smoke, the proof bundles, N-V4-15, the boards
// without a prior cell and the three thinnest controls (3x29, 32x15, 22x22; both arms, from the core).
const stageANames = quoted.map((q) => q.name).filter((n) => /^(port smoke|N-V4-15|board)/.test(n));
const thin = ['3x29-nightmare', '32x15-nightmare', '22x22-nightmare'];
const thinQuote = T11G.price(thin.flatMap((c) => [group('shipped', `V4-S4/${shippedArm(c)}/${c}`, 20, 130).step,
  group('today', `V4-S4/log-link/${c}`, 20, 260).step]));
const stageA = {
  countedS: quoted.filter((q) => stageANames.includes(q.name)).reduce((s, q) => s + q.countedS, 0) + thinQuote.countedS + items[0].countedS,
  guardS: quoted.filter((q) => stageANames.includes(q.name)).reduce((s, q) => s + q.guardS, 0) + thinQuote.guardS + 1.25 * items[0].countedS,
};
const stageB = { countedS: total.countedS - stageA.countedS, guardS: total.guardS - stageA.guardS };

const m = (/** @type {number} */ s) => (s / 60).toFixed(1);
const lines = ['# The converged price of the production validation (SA-Opus, phase-2 cross-review)', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-xr-price.mjs` (read-only; no engine run).',
  'Pricing: the pure pricing section of `tools/ig-proto/manifest.mjs` (T11g), evaluated in memory as in',
  '`evidence/sa-astra/round1-audit.mjs`; per-row basis SA-Astra\'s proxy, 1.25 x the median response of the matching frozen',
  'arm and cell (`docs/improve-generating/evidence/frozen/{V4-S4,V4-S4C}/<arm>/*.runs.json`); guard = 1.25 x counted.', '',
  '## 1. Calibration on the frozen round\'s own row steps', '',
  'Each basis prices the frozen row steps from their own published rows; the actual is the counted seconds of the `rows-*`',
  'steps in `tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl` (the four parity steps of V4-S4 excluded).', '',
  '| Task | Actual counted (min) | 1.25 x median: counted (min) | ratio | guard (min) | mean + 1.0 s: counted (min) | ratio |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...calibration.map((c) => `| ${c.task} | ${m(c.actualRowsCountedS)} | ${m(c.astraCountedS)} | ${c.astraOverActual.toFixed(3)} | ${m(c.astraGuardS)} | ${m(c.opusCountedS)} | ${c.opusOverActual.toFixed(3)} |`),
  '',
  '## 2. The converged matrix (round-1-cross-review.md section 8)', '',
  '| Component | Rows | Invocations | Counted (min) | Guard (min) |', '|---|---:|---:|---:|---:|',
  ...quoted.map((q) => `| ${q.name} | ${q.rows} | ${q.invocations} | ${m(q.countedS)} | ${m(q.guardS)} |`),
  ...items.map((i) => `| ${i.name} | - | - | ${m(i.countedS)} | ${m(i.guardIsCounted ? i.countedS : 1.25 * i.countedS)} |`),
  `| **Total** | **${total.rows}** | | **${m(total.countedS)}** | **${m(total.guardS)}** |`, '',
  `Proposed grant on this basis: the guard rounded up to whole minutes, ${Math.ceil(total.guardS / 60)} counted minutes. SA-Astra computes the final enumerated schedule (mean response + 2 s per row, 45-s quiet, the measured proof timings, explicit reserves).`, '',
  `Stage A (the port smoke, the proof bundles, N-V4-15, the boards without a prior cell, the controls 3x29, 32x15 and 22x22): counted ${m(stageA.countedS)} min, guard ${m(stageA.guardS)} min. Stage B (the rest): counted ${m(stageB.countedS)} min, guard ${m(stageB.guardS)} min.`, ''];
writeFileSync(join(HERE, 'p2-xr-price.md'), lines.join('\r\n'));
writeFileSync(join(HERE, 'p2-xr-price.json'), `${JSON.stringify({ pricing: T11G.PRICING, calibration, components: quoted, items, total, stageA, stageB }, null, 2).replace(/\n/g, '\r\n')}\r\n`);
process.stdout.write(`${lines.join('\n')}\n`);

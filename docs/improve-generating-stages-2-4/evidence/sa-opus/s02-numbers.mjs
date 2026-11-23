// @ts-check
// SA-Opus, S02 step 7 (the spike report of P7): the numbers of s02-spike-report.md, read from the records only (unlocked;
// no rating, search or generation):
// - the six equality reports `docs/improve-generating/evidence/frozen/V4-P7E-<composite>-<tier>/p7.json`;
// - the timing report `docs/improve-generating/evidence/frozen/V4-P7/p7.json`;
// - the raw item logs `tests/artifacts/ig-proto/frozen/V4-P7/time-<composite>/items.jsonl` (per item `refMs`, `candMs`,
//   `same`, `capped`), split by kernel case, round and capped pairs;
// - the invocation rows `tests/artifacts/ig-proto/frozen/V4-P7/invocations.jsonl`.
// Writes s02-numbers.json and s02-numbers.md beside this script.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s02-numbers.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT } from './s2-lib.mjs';

const EVIDENCE = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen');
const RAW = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen', 'V4-P7');
const COMPOSITES = ['p7-c1', 'p7-c1r5', 'p7-c1r5c5'];
const json = (/** @type {string} */ p) => JSON.parse(readFileSync(p, 'utf8'));
const lines = (/** @type {string} */ p) => readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
const r3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
const r4 = (/** @type {number} */ x) => Math.round(x * 10000) / 10000;
/** @param {number[]} xs @returns {number} */
const geo = (xs) => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);

const timing = json(join(EVIDENCE, 'V4-P7', 'p7.json'));
const out = { composites: /** @type {any[]} */ ([]), invocations: lines(join(RAW, 'invocations.jsonl')).map((r) => ({
  step: r.step, countedSeconds: r.countedSeconds, nodeSeconds: r.nodeSeconds, quietS: r.quietS, horizonS: r.horizonS, killed: r.killed, exit: r.exit, done: r.done,
})) };
for (const c of COMPOSITES) {
  const tiers = Object.fromEntries(['quick', 'full'].map((tier) => {
    const e = json(join(EVIDENCE, `V4-P7E-${c}-${tier}`, 'p7.json')).equal;
    return [tier, {
      verdict: e.verdict, items: e.items, ended: e.ended, equal: e.equal, notEqual: e.notEqual.length, errors: e.errors.length,
      censored: e.censored.length, missing: e.missing.length, problems: e.problems.length, lists: e.coverage.lists,
      reference: e.coverage.reference, complete: e.coverage.complete, budget: e.coverage.budget.length,
      memory: e.coverage.memory.map((/** @type {any} */ m) => ({ fixture: m.fixture, refBytes: m.refBytes, listBytes: m.listBytes, representation: m.representation, ok: m.ok })),
    }];
  }));
  const t = timing.time[c];
  const ends = lines(join(RAW, `time-${c}`, 'items.jsonl')).filter((l) => l.type === 'item-end');
  const items = ends.map((l) => {
    const [, , caseId, subset, round] = l.item.split(':');
    return { id: l.item, caseId, subset: Number(subset), round: Number(round), ...l.result, ms: l.ms };
  });
  /** @param {any[]} group */
  const summary = (group) => {
    const ref = group.reduce((a, i) => a + i.refMs, 0);
    const cand = group.reduce((a, i) => a + i.candMs, 0);
    return { n: group.length, capped: group.filter((i) => i.capped === 'both').length, refS: r3(ref / 1000), candS: r3(cand / 1000), ratio: r4(ref / cand), geo: r4(geo(group.map((i) => i.refMs / i.candMs))), minRatio: r4(Math.min(...group.map((i) => i.refMs / i.candMs))), maxRatio: r4(Math.max(...group.map((i) => i.refMs / i.candMs))) };
  };
  const cases = [...new Set(items.map((i) => i.caseId))];
  out.composites.push({
    composite: c,
    equality: tiers,
    timing: { verdict: t.verdict, items: t.items, ended: t.ended, refS: r3(t.refMs / 1000), candS: r3(t.candMs / 1000), ratio: r4(t.ratio), geoRatio: r4(t.geoRatio), capped: t.capped.length, notSame: t.notSame.length, invalid: t.invalid.length, missing: t.missing.length, errors: t.errors.length, censored: t.censored.length, problems: t.problems.length },
    go: timing.go[c],
    all: summary(items),
    byCase: Object.fromEntries(cases.map((k) => [k, summary(items.filter((i) => i.caseId === k))])),
    byRound: Object.fromEntries([0, 1, 2].map((k) => [k, summary(items.filter((i) => i.round === k))])),
    cappedPairs: summary(items.filter((i) => i.capped === 'both')),
    ratedPairs: summary(items.filter((i) => i.capped === 'none')),
    otherCapped: items.filter((i) => i.capped !== 'both' && i.capped !== 'none').length,
    sameAll: items.every((i) => i.same === true),
  });
}
const here = join(ROOT, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-opus');
// The reference's counters on the same 30 kernel inputs (V4-S2K, r4c): a proxy, not an actual cost ratio (SA-Astra's S02
// review, finding 2): `undoEntries` counts every popped trail entry (column-uncover markers too, which relink no list);
// `staticRows - liveRows` counts dead rows of R4's first piece-column pass only; six nonzeros per row is an approximation.
const kernel = json(join(EVIDENCE, 'V4-S2K', 'kernel.json'));
const M = (/** @type {number} */ x) => Math.round(x / 1e4) / 100;
/** @type {any[]} */
const counters = kernel.perCase.map((/** @type {any} */ c) => {
  const s = c.sums;
  const dead = s.staticRows - s.liveRows;
  const updates = 6 * (s.kills + s.undoEntries);
  return {
    caseId: c.caseId, staticM: M(s.staticRows), liveM: M(s.liveRows), liveShare: r3(s.liveRows / s.staticRows), deadM: M(dead),
    killsM: M(s.kills), undoM: M(s.undoEntries), updatesM: M(updates), updatesPerDead: Math.round((updates / dead) * 10) / 10,
  };
});
/** @type {any} */ (out).counters = counters;
writeFileSync(join(here, 's02-numbers.json'), `${JSON.stringify(out, null, 2)}\n`.replace(/\n/g, '\r\n'));
const md = [
  '# S02: the numbers of the P7 spike report (SA-Opus, s02-numbers.mjs)',
  '',
  '| Composite | quick: items, equal, lists / reference steps | full: items, equal, lists / reference steps | timing: ref s, cand s, ratio, geo, capped pairs | go |',
  '|---|---|---|---|---|',
  ...out.composites.map((c) => `| ${c.composite} | ${c.equality.quick.items}, ${c.equality.quick.equal}, ${c.equality.quick.lists} / ${c.equality.quick.reference} | ${c.equality.full.items}, ${c.equality.full.equal}, ${c.equality.full.lists} / ${c.equality.full.reference} | ${c.timing.refS}, ${c.timing.candS}, ${c.timing.ratio}, ${c.timing.geoRatio}, ${c.timing.capped} | ${c.go.go ? 'yes' : 'no'} |`),
  '',
  '| Composite | Case | n | capped | ref s | cand s | ratio | geo | min | max |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...out.composites.flatMap((c) => Object.entries(c.byCase).map(([k, v]) => `| ${c.composite} | ${k} | ${v.n} | ${v.capped} | ${v.refS} | ${v.candS} | ${v.ratio} | ${v.geo} | ${v.minRatio} | ${v.maxRatio} |`)),
  '',
  '| Composite | Pairs | n | ref s | cand s | ratio | geo |',
  '|---|---|---:|---:|---:|---:|---:|',
  ...out.composites.flatMap((c) => [['capped both', c.cappedPairs], ['rated both', c.ratedPairs], ['round 0', c.byRound[0]], ['round 1', c.byRound[1]], ['round 2', c.byRound[2]]].map(([k, v]) => `| ${c.composite} | ${k} | ${v.n} | ${v.refS} | ${v.candS} | ${v.ratio} | ${v.geo} |`)),
  '',
  `Invocations: ${out.invocations.map((i) => `${i.step} ${i.countedSeconds} s (horizon ${i.horizonS}, quiet ${i.quietS}, done ${i.done})`).join('; ')}.`,
  '',
  '| Case (V4-S2K, reference) | R4 first-pass static / live rows (M) | live share | first-pass dead rows (M) | kills / all undo entries (M) | proxy 6 x (kills + undoEntries) (M) | proxy / first-pass dead rows |',
  '|---|---|---:|---:|---|---:|---:|',
  ...counters.map((c) => `| ${c.caseId} | ${c.staticM} / ${c.liveM} | ${c.liveShare} | ${c.deadM} | ${c.killsM} / ${c.undoM} | ${c.updatesM} | ${c.updatesPerDead} |`),
  '',
].join('\n');
writeFileSync(join(here, 's02-numbers.md'), md.replace(/\n/g, '\r\n'));
process.stdout.write(md);

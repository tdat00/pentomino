// @ts-check
// SA-Opus, break-tasks: checks that the Hell 1 entries of prior-s3-v1 (plan 4.1) are reproduced from committed files
// only (the published fr-base pilot journals of V4-S2 and IGP-05's families), with verdicts.mjs's median, the rule
// T06a gives the developer. Read-only, unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-prior-check.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const V = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'verdicts.mjs')).href);
const lines = (/** @type {string} */ file) => readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
const round6 = (/** @type {number} */ x) => Math.round(x * 1e6) / 1e6;
const PLAN = { 196: 0.4, 215: 0.404412, 256: 0.358108, 300: 0.443429, 324: 0.347222, 360: 0.331514, 400: 0.368421, 420: 0.390244,
  480: 0.297161, 484: 0.2875, 576: 0.219512, 676: 0.2 };
const PILOTS = { '14x14-hell-1': 196, '20x20-hell-1': 400, '24x24-hell-1': 576, '26x26-hell-1': 676 };
/** @type {Record<number, { share: number, source: string, n: number }>} */
const got = {};
for (const [cell, area] of Object.entries(PILOTS)) {
  const all = lines(join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2', 'fr-base', `pilot-${cell}.calls.jsonl`));
  /** @type {Map<string, any>} */
  const starts = new Map();
  /** @type {Map<number, number[]>} */
  const perRep = new Map();
  for (const l of all) {
    if (l.t === 'start') {
      starts.set(l.call, l);
    }
  }
  let n = 0;
  for (const l of all) {
    if (l.t !== 'end' || !Number.isFinite(l.locate?.wc)) {
      continue;
    }
    const s = starts.get(l.call);
    const rep = Number(String(s.row).split('~')[1]);
    perRep.set(rep, [...(perRep.get(rep) ?? []), l.locate.wc / s.K]);
    n += 1;
  }
  const shares = [0, 1, 2, 3, 4].map((rep) => V.median(/** @type {number[]} */ (perRep.get(rep))));
  got[area] = { share: round6(V.median(shares)), source: `${cell} fr-base`, n };
}
const families = ['families-windows.jsonl', 'families-failed-sets.jsonl']
  .flatMap((n) => lines(join(ROOT, 'docs', 'improve-generating', 'evidence', 'provisional', 'IGP-05', n)))
  .filter((f) => f.level === 'hell-1');
for (const cell of [...new Set(families.map((f) => f.case))]) {
  const fs = families.filter((f) => f.case === cell);
  /** @type {Map<string, number[]>} */
  const bySeed = new Map();
  let n = 0;
  for (const f of fs) {
    const values = f.probes.filter((/** @type {any} */ p) => p.eligible && p.inBand).map((/** @type {any} */ p) => p.count / f.set.K);
    n += values.length;
    if (values.length > 0) {
      bySeed.set(f.set.seed, [...(bySeed.get(f.set.seed) ?? []), V.median(values)]);
    }
  }
  const area = fs[0].set.area;
  if (got[area] === undefined) {
    got[area] = { share: round6(V.median([...bySeed.values()].map((v) => V.median(v)))), source: `${cell} IGP-05 (${fs.length} families, ${bySeed.size} seeds)`, n };
  }
}
let bad = 0;
for (const [area, want] of Object.entries(PLAN)) {
  const g = got[Number(area)];
  const ok = g !== undefined && g.share === want;
  bad += ok ? 0 : 1;
  process.stdout.write(`hell-1@${area}: ${g?.share} (${g?.source}, n ${g?.n}) plan ${want} ${ok ? 'ok' : 'DIFFERS'}\n`);
}
process.stdout.write(bad === 0 ? 'bt-prior-check: all 12 Hell 1 entries reproduced\n' : `bt-prior-check: ${bad} entries differ\n`);

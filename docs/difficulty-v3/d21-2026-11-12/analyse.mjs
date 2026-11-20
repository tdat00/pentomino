// D21 analysis of the jsonl files written by register.mjs / flow.mjs (reads only).
//   node ./docs/difficulty-v3/d21-2026-11-12/analyse.mjs <file.jsonl> [--sequences] [--puzzles <n>]
// Prints, per label: the set and fold events, one line per accepted puzzle (the selectClues call that made it)
// and, with --sequences, the whole rating sequence of those calls as `index:clues/score`.
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const file = argv[0];
const sequences = argv.includes('--sequences');
const combos = argv.includes('--combos');
const row = argv.includes('--row');
const limit = argv.includes('--puzzles') ? Number(argv[argv.indexOf('--puzzles') + 1]) : Infinity;
const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
const labels = [...new Set(lines.map((l) => l.label ?? l.tag.split('/')[0]))];

const median = (/** @type {number[]} */ xs) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length === 0 ? null : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const round1 = (/** @type {number | null} */ x) => (x === null ? null : Math.round(x * 10) / 10);

for (const label of labels) {
  const events = lines.filter((l) => l.kind === 'event' && l.label === label);
  const calls = lines.filter((l) => l.kind === 'call' && l.tag.startsWith(`${label}/`));
  const byTag = new Map(calls.map((c) => [c.tag, c]));
  const start = events.find((e) => e.ev === 'start');
  const set = events.find((e) => e.ev === 'set');
  const end = events.find((e) => e.ev === 'end');
  const candidates = events.filter((e) => e.ev === 'candidate');
  const accepted = events.filter((e) => e.ev === 'accepted');
  console.log(`## ${label}: ${start.levelId} ${start.cols}x${start.rows} seed ${start.seedText} quantity ${start.quantity}`);
  console.log(`set attempt ${set?.attempt} K ${set?.K} setMs ${set?.setMs}; fold ${end?.status} accepted ${end?.accepted} `
    + `scores ${JSON.stringify(end?.scores)} foldMs ${end?.foldMs} totalMs ${end?.totalMs}`);
  console.log(`candidates ${candidates.length}: ${candidates.filter((c) => c.outcome !== 'ok').length} failed, `
    + `${candidates.length - accepted.filter((a) => a.from !== null).length} not accepted as such`);
  const puzzles = [];
  if (set !== undefined) {
    puzzles.push({ slot: 1, call: byTag.get(`${label}/set/${set.attempt}`), ms: set.setMs });
  }
  for (const a of accepted) {
    if (a.from === null) {
      continue;
    }
    const slotMs = candidates.filter((c) => c.slot === a.from.slot).reduce((sum, c) => sum + c.ms, 0);
    puzzles.push({ slot: a.slot, call: byTag.get(`${label}/slot/${a.from.slot}/${a.from.attempt}`), ms: slotMs });
  }
  for (const p of puzzles.slice(0, limit)) {
    const c = p.call;
    if (c === undefined) {
      console.log(`puzzle ${p.slot}: no call recorded`);
      continue;
    }
    const { min, max } = c.target;
    const hi = max === null ? Infinity : max;
    const centre = (min + hi) / 2;
    const half = (hi - min) / 4;
    const rs = c.ratings;
    const inBandIdx = rs.map((r, i) => (r.s >= min && r.s < hi ? i + 1 : 0)).filter((i) => i > 0);
    const times = rs.map((r) => r.t);
    const below = rs.filter((r) => r.s < centre - half).length;
    const above = rs.filter((r) => r.s > centre + half).length;
    console.log(`puzzle ${p.slot} [${c.tag}] K ${c.K} band [${min}, ${hi}) central [${centre - half}, ${centre + half}] ratings ${rs.length} `
      + `firstInBand ${inBandIdx[0] ?? null} inBand ${inBandIdx.length} best(result rating index) ${c.result.ri} result ${c.result.s} `
      + `with ${c.result.n} clues; <central ${below} >central ${above}; score ${Math.min(...rs.map((r) => r.s))}..${Math.max(...rs.map((r) => r.s))}; `
      + `clues ${Math.min(...rs.map((r) => r.c))}..${Math.max(...rs.map((r) => r.c))}; saturated ${rs.filter((r) => r.sat).length}/${rs.length}; `
      + `ratingMs median ${round1(median(times))} max ${round1(Math.max(...times))} sum ${round1(times.reduce((a, b) => a + b, 0))}; `
      + `callMs ${Math.round(c.ms)} wallMs(slot) ${p.ms}`);
    if (sequences) {
      console.log(`  ${rs.map((r, i) => `${i + 1}:${r.c}/${r.s}`).join(' ')}`);
    }
  }
  if (combos) {
    // Distinct (clues, U, score, B, branchTrials, saturated) over every rating of the listed puzzles' calls.
    const tally = new Map();
    for (const p of puzzles.slice(0, limit)) {
      for (const r of p.call?.ratings ?? []) {
        const key = `clues ${r.c} U ${r.u} score ${r.s} B ${r.b} branchTrials ${r.bt} saturated ${r.sat}`;
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
    }
    for (const [key, count] of [...tally].sort()) {
      console.log(`  combo ${key}: ${count}`);
    }
  }
  if (row) {
    // One markdown row per label (Q6/Q7): the listed puzzles' calls, and every call of the label.
    const centralOf = (/** @type {any} */ c) => {
      const hi = c.target.max ?? Infinity;
      return c.result.ok && Math.abs(c.result.s - (c.target.min + hi) / 2) <= (hi - c.target.min) / 4;
    };
    const used = puzzles.slice(0, limit).map((p) => p.call).filter((c) => c !== undefined);
    const exhausted = used.filter((c) => c.ratings.length >= 48 && !centralOf(c));
    const allExhausted = calls.filter((c) => c.ratings.length >= 48 && !centralOf(c));
    const sides = exhausted.map((c) => {
      const hi = c.target.max ?? Infinity;
      const centre = (c.target.min + hi) / 2;
      const half = (hi - c.target.min) / 4;
      const below = c.ratings.some((r) => r.s < centre - half);
      const above = c.ratings.some((r) => r.s > centre + half);
      const bestSide = c.result.ok ? (c.result.s < centre - half ? 'below' : 'above') : 'none in band';
      return `${bestSide}${below && above ? ' (candidates on both sides)' : ''}`;
    });
    const slotMs = puzzles.slice(0, limit).map((p) => p.ms);
    const ratingMs = used.flatMap((c) => c.ratings.map((r) => r.t));
    console.log(`ROW | ${label} | ${used.length} | ${exhausted.length} | median ratings ${median(used.map((c) => c.ratings.length))} `
      + `| all calls ${calls.length}, ${allExhausted.length} exhausted 48 | median rating ms ${round1(median(ratingMs))} `
      + `| ms per puzzle ${Math.round(slotMs.reduce((a, b) => a + b, 0) / Math.max(1, slotMs.length))} (set ${set?.setMs}, fold ${end?.foldMs}) `
      + `| side ${[...new Set(sides)].join('; ') || '-'}`);
  }
}

// D21 simulation of the proposed early-stop rule on recorded rating sequences (offline; nothing is implemented
// in the product). Rule, as asked: stop at the first rating i at which
//   (1) at least one rated candidate is in the band,
//   (2) all rated candidates (in band or not) lie on the same side of the central half of the band, and
//   (3) the last N ratings gave no in-band candidate nearer to the centre than the best so far;
// then return the best in-band candidate in the order of `ranked()` (|score - centre|, then the clue key).
// The central half is |score - centre| <= (max - min) / 4, as in clues.js. Unbounded bands are skipped.
//   node ./docs/difficulty-v3/d21-2026-11-12/simulate.mjs <files...> [--ns 4,8,12] [--puzzles] [--list]
//   --puzzles: one line per accepted puzzle (the call that produced it); --list: every call the rule changes or misses.
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const files = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--ns'));
const ns = (argv.includes('--ns') ? argv[argv.indexOf('--ns') + 1] : '4,8,12').split(',').map(Number);
const wantPuzzles = argv.includes('--puzzles');
const wantList = argv.includes('--list');
const wantSides = argv.includes('--sides');

/**
 * @param {any} call
 * @param {number} n The rule's N.
 * @returns {{ stop: number, score: number, h: string } | null} null when the rule never fires.
 */
export function simulate(call, n) {
  const { min } = call.target;
  const max = call.target.max ?? Infinity;
  if (!Number.isFinite(max)) {
    return null;
  }
  const centre = (min + max) / 2;
  const half = (max - min) / 4;
  let best = null;
  let stall = 0;
  let below = false;
  let above = false;
  let central = false;
  for (let i = 0; i < call.ratings.length; i += 1) {
    const r = call.ratings[i];
    if (r.s < centre - half) {
      below = true;
    } else if (r.s > centre + half) {
      above = true;
    } else {
      central = true;
    }
    let improved = false;
    if (r.s >= min && r.s < max) {
      const d = Math.abs(r.s - centre);
      if (best === null || d < best.d) {
        improved = true;
        best = { d, r };
      } else if (d === best.d && r.kr < best.r.kr) {
        best = { d, r };
      }
    }
    stall = improved ? 0 : stall + 1;
    if (best !== null && !central && !(below && above) && stall >= n) {
      return { stop: i + 1, score: best.r.s, h: best.r.h };
    }
  }
  return null;
}

/** @param {any} call */
const isCentral = (call) => {
  const max = call.target.max ?? Infinity;
  return call.result.ok && Number.isFinite(max) && Math.abs(call.result.s - (call.target.min + max) / 2) <= (max - call.target.min) / 4;
};

/** @param {any} call @param {number} n */
function compare(call, n) {
  const sim = simulate(call, n);
  const total = call.ratings.length;
  if (sim === null || !call.result.ok) {
    return { fired: false };
  }
  const same = sim.h === call.result.h;
  return {
    fired: true,
    earlier: sim.stop < total,
    stop: sim.stop,
    total,
    score: sim.score,
    same,
    sameScore: sim.score === call.result.s,
    missed: sim.stop < total && isCentral(call),
    saved: Math.max(0, total - sim.stop),
  };
}

const all = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
  const calls = lines.filter((l) => l.kind === 'call');
  all.push({ file, lines, calls });
}

for (const { file, lines, calls } of all) {
  const finite = calls.filter((c) => Number.isFinite(c.target.max ?? Infinity));
  console.log(`## ${file}: ${calls.length} calls, ${finite.length} with a finite band, `
    + `${finite.filter((c) => c.ratings.length >= 48).length} with at least 48 ratings, `
    + `${finite.filter((c) => c.mode === 'require').length} in require mode`);
  console.log('| N | fired (stop <= MP07 stop) | earlier than MP07 | result changed (clues) | result changed (score) | missed a central result | ratings saved |');
  console.log('|---|---|---|---|---|---|---|');
  for (const n of ns) {
    const rows = finite.map((c) => ({ c, v: compare(c, n) }));
    const fired = rows.filter((r) => r.v.fired);
    const earlier = fired.filter((r) => r.v.earlier);
    const changed = earlier.filter((r) => !r.v.same);
    const changedScore = earlier.filter((r) => !r.v.sameScore);
    const missed = fired.filter((r) => r.v.missed);
    const saved = earlier.reduce((s, r) => s + r.v.saved, 0);
    console.log(`| ${n} | ${fired.length} | ${earlier.length} | ${changed.length} | ${changedScore.length} | ${missed.length} | ${saved} |`);
    if (wantList) {
      for (const r of [...new Set([...changed, ...missed])]) {
        console.log(`  N=${n} ${r.c.tag}: rule stops at ${r.v.stop} with score ${r.v.score}; MP07 stops at ${r.v.total} with score ${r.c.result.s} `
          + `(rating ${r.c.result.ri}); central ${isCentral(r.c)}; missed ${r.v.missed}`);
      }
    }
  }
  if (wantSides) {
    console.log('| call | mode | ratings | <central | central | >central | in band | below band | above band | MP07 result (rating #) |');
    console.log('|---|---|---|---|---|---|---|---|---|---|');
    for (const c of finite.filter((x) => x.ratings.length >= 48)) {
      const { min } = c.target;
      const max = c.target.max;
      const centre = (min + max) / 2;
      const half = (max - min) / 4;
      const rs = c.ratings;
      const cnt = (/** @type {(r: any) => boolean} */ f) => rs.filter(f).length;
      console.log(`| ${c.tag} | ${c.mode} | ${rs.length} | ${cnt((r) => r.s < centre - half)} | ${cnt((r) => Math.abs(r.s - centre) <= half)} | `
        + `${cnt((r) => r.s > centre + half)} | ${cnt((r) => r.s >= min && r.s < max)} | ${cnt((r) => r.s < min)} | ${cnt((r) => r.s >= max)} | `
        + `${c.result.ok ? `${c.result.s} (#${c.result.ri})` : c.result.reason} |`);
    }
  }
  if (wantPuzzles) {
    const labels = [...new Set(lines.filter((l) => l.kind === 'event').map((l) => l.label))];
    for (const label of labels) {
      const events = lines.filter((l) => l.kind === 'event' && l.label === label);
      const set = events.find((e) => e.ev === 'set');
      const byTag = new Map(calls.map((c) => [c.tag, c]));
      const puzzleCalls = [];
      if (set !== undefined) {
        puzzleCalls.push({ slot: 1, call: byTag.get(`${label}/set/${set.attempt}`) });
      }
      for (const a of events.filter((e) => e.ev === 'accepted' && e.from !== null)) {
        puzzleCalls.push({ slot: a.slot, call: byTag.get(`${label}/slot/${a.from.slot}/${a.from.attempt}`) });
      }
      console.log(`### ${label}: accepted puzzles`);
      console.log(`| puzzle | MP07: ratings, returned score (rating #) | ${ns.map((n) => `N=${n}: stop, score, same clues?`).join(' | ')} |`);
      console.log(`|---|---|${ns.map(() => '---').join('|')}|`);
      for (const { slot, call } of puzzleCalls) {
        if (call === undefined) {
          continue;
        }
        const cells = ns.map((n) => {
          const sim = simulate(call, n);
          if (sim === null) {
            return 'not fired';
          }
          return `${sim.stop}, ${sim.score}, ${sim.h === call.result.h ? 'yes' : 'NO'}${sim.stop >= call.ratings.length ? ' (at MP07 stop)' : ''}`;
        });
        console.log(`| ${slot} | ${call.ratings.length}, ${call.result.s} (#${call.result.ri}) | ${cells.join(' | ')} |`);
      }
    }
  }
}

if (all.length > 1) {
  const calls = all.flatMap((a) => a.calls);
  const finite = calls.filter((c) => Number.isFinite(c.target.max ?? Infinity));
  console.log(`## TOTAL over ${all.length} files: ${calls.length} calls, ${finite.length} with a finite band, `
    + `${finite.filter((c) => c.ratings.length >= 48).length} with at least 48 ratings, `
    + `${finite.filter((c) => c.mode === 'require').length} in require mode`);
  console.log('| N | fired | earlier than MP07 | result changed (clues) | result changed (score) | missed a central result | ratings saved |');
  console.log('|---|---|---|---|---|---|---|');
  for (const n of ns) {
    const fired = finite.map((c) => compare(c, n)).filter((v) => v.fired);
    const earlier = fired.filter((v) => v.earlier);
    console.log(`| ${n} | ${fired.length} | ${earlier.length} | ${earlier.filter((v) => !v.same).length} | ${earlier.filter((v) => !v.sameScore).length} | `
      + `${fired.filter((v) => v.missed).length} | ${earlier.reduce((s, v) => s + v.saved, 0)} |`);
  }
}

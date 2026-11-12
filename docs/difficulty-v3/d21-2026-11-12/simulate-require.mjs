// D21 variant of the early-stop simulation for `require` mode: the rule sees the FINAL result of every candidate whose
// finish ran right after its rating (the repaired set's score when a repair rating followed, else the raw score), and
// the raw score of the others. Same conditions as simulate.mjs otherwise. Repair ratings come from `repairs` of the
// recorded calls (register.mjs); a repair made after profile 48 (the reserve stop) is not attributed to a candidate.
//   node ./docs/difficulty-v3/d21-2026-11-12/simulate-require.mjs <files...> [--ns 4,8,12]
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const files = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--ns'));
const ns = (argv.includes('--ns') ? argv[argv.indexOf('--ns') + 1] : '4,8,12').split(',').map(Number);
const calls = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l)))
  .filter((l) => l.kind === 'call' && l.mode === 'require' && Number.isFinite(l.target.max ?? Infinity));

/** @param {any} call @param {number} n */
function simulate(call, n) {
  const { min, max } = call.target;
  const centre = (min + max) / 2;
  const half = (max - min) / 4;
  let best = null;
  let stall = 0;
  let below = false;
  let above = false;
  let central = false;
  for (let i = 1; i <= call.ratings.length; i += 1) {
    const raw = call.ratings[i - 1];
    const inBand = raw.s >= min && raw.s < max;
    const repair = inBand && Math.abs(raw.s - centre) <= half ? call.repairs.find((x) => x.after === i) : undefined;
    // The effective score: the final one of a finished candidate, else the raw one; a failed finish leaves the band.
    const s = repair === undefined ? raw.s : repair.s;
    const effInBand = s >= min && s < max;
    if (s < centre - half) {
      below = true;
    } else if (s > centre + half) {
      above = true;
    } else {
      central = true;
    }
    let improved = false;
    if (effInBand) {
      const d = Math.abs(s - centre);
      if (best === null || d < best.d) {
        best = { d, s };
        improved = true;
      }
    }
    stall = improved ? 0 : stall + 1;
    if (best !== null && !central && !(below && above) && stall >= n) {
      return { stop: i, score: best.s };
    }
  }
  return null;
}

console.log(`${calls.length} require calls with a finite band`);
console.log('| N | fired earlier than MP07 | returned score differs from MP07 | worse (further from the centre) | missed a central final result | ratings saved |');
console.log('|---|---|---|---|---|---|');
for (const n of ns) {
  let fired = 0;
  let differs = 0;
  let worse = 0;
  let missed = 0;
  let saved = 0;
  for (const c of calls) {
    const sim = simulate(c, n);
    if (sim === null || !c.result.ok || sim.stop >= c.ratings.length) {
      continue;
    }
    const { min, max } = c.target;
    const centre = (min + max) / 2;
    fired += 1;
    saved += c.ratings.length - sim.stop;
    if (sim.score !== c.result.s) {
      differs += 1;
    }
    if (Math.abs(sim.score - centre) > Math.abs(c.result.s - centre)) {
      worse += 1;
    }
    if (Math.abs(c.result.s - centre) <= (max - min) / 4 && Math.abs(sim.score - centre) > (max - min) / 4) {
      missed += 1;
    }
  }
  console.log(`| ${n} | ${fired} | ${differs} | ${worse} | ${missed} | ${saved} |`);
}

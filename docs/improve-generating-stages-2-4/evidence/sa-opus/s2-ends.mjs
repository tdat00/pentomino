// @ts-check
// SA-Opus, round 1: how every selection call of V4-S2 ended (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-ends.mjs
// Counts, over every arm and row, the calls without an end line (closed by a worker termination), the end results by
// arm and stage, the locate results with their no-window proofs, and the canonical re-ratings (rescue and phase E).
import { armShards, arms, callsOf, rowJournal } from './s2-lib.mjs';

/** @type {Record<string, number>} */
const res = {};
/** @type {Record<string, number>} */
const loc = {};
/** @type {Record<string, number>} */
const rer = {};
let unended = 0;
let calls = 0;
for (const arm of arms()) {
  for (const s of armShards(arm)) {
    for (const r of s.rows) {
      const j = rowJournal(arm, s.shard, r.rowKey);
      for (const c of callsOf(j.lines ?? []).values()) {
        calls += 1;
        if (!c.end) {
          unended += 1;
          continue;
        }
        const k = `${arm}:${c.start?.stage}:${c.end.result}`;
        res[k] = (res[k] ?? 0) + 1;
        const l = `${c.end.locate?.result}|${c.end.locate?.noWindowProof}`;
        loc[l] = (loc[l] ?? 0) + 1;
        if (c.end.rerates) rer[arm] = (rer[arm] ?? 0) + c.end.rerates;
      }
    }
  }
}
process.stdout.write(`calls ${calls}, without an end line ${unended}\n`);
process.stdout.write(`end results by arm and stage: ${JSON.stringify(res)}\n`);
process.stdout.write(`locate result | no-window proof: ${JSON.stringify(loc)}\n`);
process.stdout.write(`canonical re-ratings by arm: ${JSON.stringify(rer)}\n`);

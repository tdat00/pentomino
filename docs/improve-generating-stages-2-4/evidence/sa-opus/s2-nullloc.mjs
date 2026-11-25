// @ts-check
// SA-Opus, round 1: which ended calls have no locate result (`end.locate.result` null), by arm, stage and budget stop
// (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-nullloc.mjs
import { armShards, arms, callsOf, rowJournal } from './s2-lib.mjs';

/** @type {Record<string, number>} */
const out = {};
for (const arm of arms()) {
  for (const s of armShards(arm)) {
    for (const r of s.rows) {
      for (const c of callsOf(rowJournal(arm, s.shard, r.rowKey).lines ?? []).values()) {
        if (!c.end || c.end.locate?.result !== null) continue;
        const k = `${arm}:${c.start?.stage}:${c.end.result}:${c.end.locate?.budgetStop ? 'budget stop' : 'no budget stop'}`;
        out[k] = (out[k] ?? 0) + 1;
      }
    }
  }
}
process.stdout.write(`${JSON.stringify(out)}\n`);

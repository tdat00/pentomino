// @ts-check
// SA-Opus, round 1: the frozen round's account (read-only, unlocked): the counted seconds of every invocation log under
// tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl, plus the off-log seconds of the register (check-list 3.2: T10a's
// 55.4 s and the killed V4-S2 invocation's 32 s, 87.4 s since 2026-11-23), against the grant of 749 counted minutes.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-account.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT } from './s2-lib.mjs';

const OFF_LOG_S = 87.4;
const GRANT_MIN = 749;
const root = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen');
let logged = 0;
for (const task of readdirSync(root).sort()) {
  const file = join(root, task, 'invocations.jsonl');
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
  const s = lines.reduce((sum, l) => sum + l.countedSeconds, 0);
  const killed = lines.filter((l) => l.killed).length;
  logged += s;
  process.stdout.write(`${task.padEnd(8)} ${String(lines.length).padStart(3)} invocations, ${killed} killed, ${s.toFixed(3)} counted s\n`);
}
const account = logged + OFF_LOG_S;
process.stdout.write(`logged ${logged.toFixed(3)} s; off-log ${OFF_LOG_S} s; account ${account.toFixed(3)} s = ${(account / 60).toFixed(2)} min of ${GRANT_MIN} granted; left ${(GRANT_MIN - account / 60).toFixed(2)} min\n`);

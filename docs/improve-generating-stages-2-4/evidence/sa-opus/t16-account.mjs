// @ts-check
// SA-Opus, T16 step 5 (stages 2 to 4 pack): B6 and the round's account. Every frozen-round plan's invocation rows
// (`tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl`, the lock helper's records) against the approval its
// execution log re-read (the guard asked and the cap on the account), the round's final account (logged plus the 87.4 s
// off-log of V4-S2's stopped invocation, ruling of 2026-11-23), and the invocations that did not finish their step.
// Unlocked: it reads records only; it writes its outputs beside itself.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-account.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const RAW = 'tests/artifacts/ig-proto/frozen';
const OFF_LOG_S = 87.4;
const GRANT_MIN = 1725;
const sha256 = (/** @type {string} */ t) => createHash('sha256').update(t, 'utf8').digest('hex');
const crlf = (/** @type {string} */ t) => `${t.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;
const r3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
const min1 = (/** @type {number} */ s) => Math.round(s / 6) / 10;

// The approvals of this pack's plans as their execution logs re-read them (tasks/improve-generating-stages-2-4/S01-S07):
// the guard asked (requestedAdditionalGuardS) and the cap on the account, ceil((logged before + 87.4 + guard) / 60).
const APPROVALS = {
  'V4-S2B': { approval: 'D-S24-26 (Q-S24-4 (a), 2026-11-23)', guardS: 1694.6240407041143, capMin: 201, log: 'S01-run-v4-s2b.md' },
  'V4-P7': { approval: 'D-S24-28 (up to 20 min)', guardS: 1162.1718749999993, capMin: 206, log: 'S02-run-v4-p7-and-spike-report.md' },
  'V4-S3P': { approval: 'D-S24-27 (rows) and Q-S03 (a) (proofs), 2026-11-24 07:41', guardS: 10416.597, capMin: 374, log: 'S03-run-v4-s3p.md' },
  'V4-LIVE': { approval: 'Q-S04 (a), 2026-11-24 10:09', guardS: 2634.330247546194, capMin: 282, log: 'S04-run-v4-live.md' },
  'V4-S4': { approval: 'Q-S06 (a), 2026-11-24 11:16 (grant raised to 1,725)', guardS: 88911.48638503549, capMin: 1725, log: 'S06-run-v4-s4.md' },
  'V4-S4C': { approval: 'Q-S07 (a), 2026-11-24 20:04 (measurement only)', guardS: 43921.28276965763, capMin: 1443, log: 'S07-run-v4-s4c.md' },
};

/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
const tasks = readdirSync(join(ROOT, RAW)).filter((t) => existsSync(join(ROOT, RAW, t, 'invocations.jsonl'))).map((task) => {
  const p = `${RAW}/${task}/invocations.jsonl`;
  const text = readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  inputs.push({ path: p, sha256Lf: sha256(text) });
  const rows = text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
  /** @type {Record<string, number>} */
  const perStep = {};
  for (const r of rows) {
    perStep[r.step] = (perStep[r.step] ?? 0) + 1;
  }
  const multi = Object.entries(perStep).filter(([, n]) => n > 1).map(([step, n]) => `${step} x${n}`);
  return {
    task, invocations: rows.length, steps: Object.keys(perStep).length, multi,
    countedS: r3(rows.reduce((s, r) => s + r.countedSeconds, 0)),
    killed: rows.filter((r) => r.killed).length, nonZeroExit: rows.filter((r) => r.exit !== 0).length,
    notDone: rows.filter((r) => r.done === false).length, decisions: [...new Set(rows.map((r) => r.budget?.decision))],
    maxHorizonS: Math.max(...rows.map((r) => r.horizonS)), quietS: [...new Set(rows.map((r) => r.quietS))],
    taskCapS: [...new Set(rows.map((r) => r.budget?.taskCapS))], roundCapS: [...new Set(rows.map((r) => r.budget?.roundCapS))],
    roundBeforeS: rows[0].budget?.roundCountedS ?? null, start: rows[0].start, end: rows[rows.length - 1].end,
  };
}).sort((a, b) => a.start.localeCompare(b.start));

let logged = 0;
let offLog = 0;
const plans = tasks.map((t) => {
  logged += t.countedS;
  // V4-S2's stopped invocation (87.4 s, off the log) belongs to the round from V4-S2 on.
  offLog = t.task === 'V4-S2' ? OFF_LOG_S : offLog;
  const a = /** @type {Record<string, any>} */ (APPROVALS)[t.task];
  const afterS = r3(logged + offLog);
  return {
    ...t, loggedAfterS: r3(logged), accountAfterMin: min1(afterS),
    ...(a ? {
      approval: a.approval, guardS: r3(a.guardS), capMin: a.capMin, log: a.log,
      withinGuard: t.countedS <= a.guardS, withinCap: afterS / 60 <= a.capMin, withinTaskCap: t.taskCapS.every((c) => t.countedS <= c),
    } : {}),
  };
});
const finalS = r3(logged + OFF_LOG_S);
const result = {
  script: `${HERE}/t16-account.mjs`, offLogS: OFF_LOG_S, grantMin: GRANT_MIN,
  finalAccount: { loggedS: r3(logged), offLogS: OFF_LOG_S, totalS: finalS, minutes: min1(finalS), grantMin: GRANT_MIN, withinGrant: finalS / 60 <= GRANT_MIN },
  plans, inputs: { entries: inputs.length, sha256Lf: sha256(JSON.stringify(inputs)), files: inputs },
};
writeFileSync(join(ROOT, HERE, 't16-account.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const md = [
  '# T16: B6 and the round\'s account (every frozen-round plan\'s invocation rows)',
  '',
  '| Task | Invocations (steps) | Counted s | Killed | Exit not 0 | Step not finished in that invocation | Max horizon s | Logged after (s) | Account after (min) | Approval | Guard s | Within guard | Cap (min) | Within cap |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|---:|---|',
  ...plans.map((p) => `| ${p.task} | ${p.invocations} (${p.steps}) | ${p.countedS} | ${p.killed} | ${p.nonZeroExit} | ${p.notDone} | ${p.maxHorizonS} | ${p.loggedAfterS} | ${p.accountAfterMin} | ${p.approval ?? 'v4 pack'} | ${p.guardS ?? '-'} | ${p.withinGuard ?? '-'} | ${p.capMin ?? '-'} | ${p.withinCap ?? '-'} |`),
  '',
  `Final account: ${result.finalAccount.loggedS} s logged + ${OFF_LOG_S} s off-log = ${finalS} s = ${result.finalAccount.minutes} of ${GRANT_MIN} counted minutes.`,
  '',
  'Steps that took more than one invocation (the runner repeats a step until its shard is done):',
  '',
  ...plans.filter((p) => p.multi.length > 0).map((p) => `- ${p.task}: ${p.multi.join(', ')}.`),
].join('\n');
writeFileSync(join(ROOT, HERE, 't16-account.md'), crlf(md), 'utf8');
process.stdout.write(`t16-account: ${inputs.length} invocation logs (sha256 of the index ${result.inputs.sha256Lf}); final ${result.finalAccount.loggedS} s logged + ${OFF_LOG_S} = ${finalS} s = ${result.finalAccount.minutes} of ${GRANT_MIN} min\n`);
for (const p of plans) {
  process.stdout.write(`  ${p.task}: ${p.invocations} inv (${p.steps} steps), ${p.countedS} s, killed ${p.killed}, exit!=0 ${p.nonZeroExit}, notDone ${p.notDone}, after ${p.accountAfterMin} min${p.approval ? `; guard ${p.guardS} ${p.withinGuard}, cap ${p.capMin} ${p.withinCap}, taskCap ${p.taskCapS} ${p.withinTaskCap}` : ''}\n`);
}

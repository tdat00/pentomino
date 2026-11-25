# S04: Run `V4-LIVE` (the live deadline on real rows, its receipt and binding)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.5, §8.2 S-4, §8.3; N-V4-13; `plans/V4-LIVE.json` (T11c of the v4 pack, unchanged); D-P24-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T12b |
| Depends on | T12b (`freeze.json`), T09a to T09c (the identity record, the receipt and its acceptance), T08c (the verification cases) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator |
| Estimate | machine: formal 35.12 projected / 43.91 guard counted minutes; timing proxy 4-5; plus one locked verification of about a minute (no allocation); developer 0 h |

## Goal

Prove the live deadline on real requests of the frozen arm before stage 4 relies on it: ten `fr-frozen` requests
(14x14 Nightmare and 26x26 Hell 1, reps 0-4) answer within 120 s with the reserve held, the scripted cases pass on both
bounded twins, and the receipt is accepted as the binding `V4-S4` requires.

## Authority and fixed points

- **Owner stop: `V4-LIVE`'s cap** at its turn (plan §8.2 S-4: 35.12 / 43.91 formal; 284-294 on the account at the
  timing-proxy spend in this order, §8.3).
- The plan file is T11c's (`runnable: false`, `blockedBy: ["N-V4-03", "N-V4-13"]` are informational: the runner reads
  the steps and the prerequisites, which pass once T12b wrote `freeze.json`); its steps: `prerequisites`,
  `firewall-snapshot`, `trees` (`fr-frozen`), `rows-fr-frozen-live-14x14-nightmare` and
  `rows-fr-frozen-live-26x26-hell-1` (locked, row limit 260 s), `publish-fr-frozen`, `live-receipt`, `accept-live`,
  `firewall-check`.
- The receipt binds the verification record of the task `V4-LIVE-verify` (D-P24-06): its `state.json` and the identity
  record `identity.json` that every self-test run writes (T09a: the producer, the frozen source, the group, the
  selected cases and the trees they loaded). This task produces it first, in one locked invocation of the fifteen
  `LIVE_CASES` (T09a, exported by `tools/ig-proto/live-deadline.mjs`): a second invocation replaces both files, so the
  fifteen cases run together, and nothing of the harness or the trees changes between that invocation and the run.
- Run rules of the check-list §3.2; records written once (§3.3).

## Scope

- Create (by the verification): `tests/artifacts/ig-proto/frozen/V4-LIVE-verify/self-test/state.json` and `identity.json`.
- Create (by the run): `tests/artifacts/ig-proto/frozen/V4-LIVE/`; `docs/improve-generating/evidence/frozen/V4-LIVE/`:
  `fr-frozen/live-14x14-nightmare.runs.json` and `live-26x26-hell-1.runs.json` with their `.md` and calls files,
  `inputs/live-deadline/`, `live-deadline.json`, `live-deadline.accepted.json`.
- Do not change: any code, plan or earlier record. Guards: G1, G2.

## Steps

1. **Pre-checks.** Check-list §3.2's run checks, the first block (no runner is active); `git status --short -- core
   generator` prints nothing; `node tools\ig-proto\manifest.mjs
   check-prerequisites --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"` prints `prerequisites: pass`;
   `node tools\ig-proto\freeze.mjs check --label frozen --source-label "frozen 3fc65f4"` prints `freeze: check pass (7
   checks; ...)`.
2. **The live verification** (locked verification, no allocation). Check-list §3.1's selection block with `$Id =
   'V4-LIVE-verify'`, `$GroupArgs = @('--v4')`, `$Locked = $true` and `$Required` the exported set itself:
   `$Required = @(node --input-type=module -e "const m = await import('./tools/ig-proto/live-deadline.mjs'); for (const n of m.LIVE_CASES) console.log(n);")`
   (the fourteen `live fr-frozen-live-test: ...` and `live fr-frozen-none-live-test: ...` cases and `fz: the live
   deadline on the frozen trees`; the block stops if a name is missing from the group or listed twice). Expected:
   fifteen `PASS` lines, `self-test: 15 passed, 0 failed`, `IG V4-LIVE-verify cases exit=0`, `cases: 15 passed, as
   required`; then `tests\artifacts\ig-proto\frozen\V4-LIVE-verify\self-test\identity.json` exists with `task`
   `V4-LIVE-verify`, `label` `frozen`, `group` `v4` and the fifteen names in `selected`. A failure stops here (report; a
   fix is a new identity, check-list §3.3).
3. **The approval re-read.** `node tools\ig-proto\manifest.mjs approval --plan V4-LIVE --label frozen --source-label
   "frozen 3fc65f4"`; `requestedAdditionalGuardS` 2634.330 (43.905504 counted minutes); the cap on the account is
   `ceil((roundCountedSBeforeApproval + 87.4 + 2634.330) / 60)`.
4. **STOP: ask the owner** (Discord, through the orchestrator), and wait. Text to relay: "Before stage 4, ten real
   requests check that the new time limit holds (every answer within 120 s). It costs about 4 to 5 counted minutes (at
   most 44 by the formal guard); the cap on the account is `<cap>` of the 749 granted, so no raise. (a) Approve
   (recommended: stage 4 cannot start without this proof); (b) not now." Record the answer and its message id. Only (a)
   continues.
5. **Dry run.** `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-LIVE.json -Label frozen
   -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes 747`: seven `unlocked` lines and two `go` lines.
6. **Start detached.** `New-Item -ItemType Directory -Force tests\artifacts\ig-proto\frozen\V4-LIVE | Out-Null`; with the
   orchestrator's `powershell` tool in `mode: "async", detach: true`: `pwsh -NoProfile -File tools\ig-proto\run-task.ps1
   -Plan tools\ig-proto\plans\V4-LIVE.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper
   tools\ig-proto\lock\ig-lock.ps1 -ApprovedRoundMinutes 747 *> tests\artifacts\ig-proto\frozen\V4-LIVE\run-1.log`. Then
   check-list §3.2's run checks: the second block with `$Plan = 'V4-LIVE'` and `$Log =
   'tests\artifacts\ig-proto\frozen\V4-LIVE\run-1.log'` (the runner alive, its log started), and, after the first locked
   invocation ends, the third block (`quietS` 15 or 45 and `horizonS` at most 885, separately).
7. **Completion.** The log shows two `arm: published fr-frozen/live-<cell>: 5 rows, <m> journal lines`, `receipt:
   live-deadline pass -> docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json`, `accepted:
   docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json sha256 <hash> ->
   docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json`, `firewall: OK`, exit 0. Then `node
   tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json
   --current fr-frozen,fr-frozen-none --label frozen --source-label "frozen 3fc65f4"` prints `binding: pass`.
8. **On a stop.** A `live-receipt` that exits 2: `fail` (a row over 120 s or below 0, killed at the row limit, an
   incorrect or erroneous row, a set stage over 48 s on either set path, a failed verification case) means the live
   deadline did not hold: report the receipt's `reasons` and `rows`; the SAs rule jointly (a defect is fixed under a new
   identity and the epoch is proved again; the owner is asked for any new measured scope). `incomplete` (a missing or
   invalid row, a journal not closed, a missing or stale verification record, a stale tree, a changed producer, a runs
   file that differs from its raw shard): report; after the ruling, the missing input is produced (for example step 2
   again, when no harness or tree changed) and the plan resumes from `live-receipt` with `-Only
   prerequisites,firewall-snapshot,trees,live-receipt,accept-live,firewall-check`, dry-run first (a `fail` or
   `incomplete` receipt is replaced by the tool; a passing one never). Row steps that stopped: `arm.mjs publish --task
   V4-LIVE --arm fr-frozen --done-only` first (T01a), then the ruling.
9. **The account**, as S01's step 7, in the Execution log and the next progress report.

## Tests

None (a run).

## Documentation

The orchestrator's progress report (the answer, the account, the receipt's verdict and its ten rows in one table).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's checks | repository root | `prerequisites: pass`; `freeze: check pass (7 checks; ...)` | 5 min |
| step 2's verification | PowerShell 7 at the repository root | 15 `PASS`; `IG V4-LIVE-verify cases exit=0`; `cases: 15 passed, as required`; `identity.json` with the fifteen names | 5 min |
| step 3's `approval` | repository root | the JSON line; the cap at most 749 | 1 min |
| step 5's dry run | repository root | two `go` | 2 min |
| step 6's run (detached) | repository root | exit 0; receipt `pass`; binding written; `firewall: OK` | about 4 to 5 counted minutes |
| step 7's `check-binding` | repository root | `binding: pass` | 2 min |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- **STOP for the owner** at step 4 (the cap); before step 6 when the cap exceeds the grant or a step is not `go`.
- Stop and report at: a failing verification case (step 2); a non-zero exit of the runner; a receipt that does not pass.
- Rulings are the SAs' joint decisions under the owner's delegation; the owner only for a new measured scope or a
  change of one of his recorded decisions.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S04-B01 | Real requests of the frozen arm answer within 120 s with the reserve held, the scripted cases hold on both twins, and stage 4 may use its short row limit | the receipt `pass`; the binding | `live-deadline.json`, `.accepted.json` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S04-T01 | The verification state holds the fifteen `LIVE_CASES`, all passing, and its identity record names the producer, the frozen source, group `v4` and the trees tested | step 2 | `V4-LIVE-verify/self-test/state.json`, `identity.json` |
| S04-T02 | Ten rows published; the receipt `live-deadline pass` with the five fields; the binding accepted `--by V4-LIVE` and `check-binding --current fr-frozen,fr-frozen-none` `pass` | steps 7 | the files and lines |
| S04-T03 | Exit 0 with `firewall: OK`; G1, G2 empty | the log; the guards | `run-1.log` |

## Checklist (the executor confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green (none: a run)
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the executor's reply)

The start and end times; the owner's answer; the files written; the gate results with numbers; each AC row with its
evidence; the questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator)

| Item | Value |
|---|---|
| Start, end, duration | pre-checks 09:24 +07:00; owner stop 09:27-10:09; runner launched about 10:10, finished 10:15:30 (exit 0); about 51 min with the owner wait, run about 6 min |
| Owner's answer (date, message id) | (a), 2026-11-24 10:09:39 +07:00, Discord ai-ws-1 message 1574623003696824381 ("Q-s04 a"), asked in message 1574612096656740518 |
| Approval re-read (line; cap on the account) | `{"plan":"V4-LIVE","spentS":14186.131,"assumedEarlierGuardS":0,"roundCountedSBeforeApproval":14186.131,"requestedAdditionalGuardS":2634.330247546194,"requestedCumulativeRoundMinutes":281}`; cap ceil((14186.131 + 87.4 + 2634.330) / 60) = 282 of the 749 granted; dry run `-ApprovedRoundMinutes 747`: 7 unlocked, 2 go, forecast 2,107 s |
| Verification (seconds; cases) | V4-LIVE-verify, locked, `--v4` group: `self-test: 15 passed, 0 failed (50.13 s)`, `IG V4-LIVE-verify cases exit=0 seconds=50.267 quiet=15`, `cases: 15 passed, as required`; identity.json task V4-LIVE-verify, label frozen, group v4, 15 selected |
| Counted minutes of the run; the round's account after it | 284.917 s (4.75 min): 14x14-nightmare 93.435, 26x26-hell-1 191.482; quietS 45 (idle declaration expired), horizonS 885, exit 0. Round account 14471.048 s logged + 87.4 s off-log = 14558.448 s = 242.6 of 749 counted minutes |
| Receipt and binding | `receipt: live-deadline pass` (sha256 14e5bf0b...), verdict pass, workCutoffMs 115000, responseBoundMs 120000, reserveChecked true; 10 rows valid, 10 accepted each, ledgers complete; response 5.6-11.9 s (14x14 Nightmare), 13.2-41.2 s (26x26 Hell 1); `live-deadline.accepted.json` acceptedBy V4-LIVE; `check-binding --current fr-frozen,fr-frozen-none` `binding: pass`; 10 rows published (1647 / 1758 journal lines) |
| Questions and rulings | Q-S04 to the owner, answered (a); no SA ruling needed |
| Commit | this task's commit |
| Issues and named items | none; run log `firewall: OK, 289 production files unchanged since the snapshot of V4-LIVE`; G1, G2 empty |

# S01: Run `V4-S2B` and read it

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.6 (`V4-S2B`), §7 (the controls' risk), §8.2 S-1, §8.3; D-S24-16, D-S24-26 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T02c |
| Depends on | T02c (the plan `tools/ig-proto/plans/V4-S2B.json` of T02a; `fit-read.mjs` of T02b and T02c) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator (the run, steps 1 to 7); SA-Opus and SA-Astra (the reading, step 8) |
| Estimate | machine: formal 22.59 projected / 28.24 guard counted minutes; timing proxy 16.0 to 20.0 counted minutes; developer 0 h |

## Goal

Stage 2 piloted only two of the ten Nightmare controls; on 26x26 the preview's lower bound was 0.881, just under the
0.9 that stage 4 requires, and one failed control stops phase 2. This run measures the eight unpiloted controls on the
no-screen arm `fr-none` (reps 0 to 4, fitting seeds) so that a control at risk is seen before the freeze, not after 8 to
9 hours of stage 4 (the owner's approval D-S24-26, 2026-11-23).

## Authority and fixed points

- Approved by the owner on 2026-11-23 16:30 (Q-S24-4 (a), D-S24-26): 40 rows, 22.59 projected / 28.24 guard counted
  minutes, inside the 749 granted; the account is re-read before the run (check-list §3.2).
- Run rules of the check-list §3.2: dry run first; `-ApprovedRoundMinutes 747` while the grant is 749; started detached;
  a running runner is never killed; a stop is resumed only after a ruling.
- Fixed: the plan file is the one T02a wrote (`generatedBy` `manifest.mjs write-plan`); it is never edited.
- The reading is "a fitting warning, not a five-seed no-regression verdict" (plan §8.2 T02).

## Scope

- Create (by the run): `tests/artifacts/ig-proto/frozen/V4-S2B/` (raw, git-ignored), `docs/improve-generating/evidence/frozen/V4-S2B/fr-none/pilot-<cell>.runs.json`, `.runs.md`, `.calls.jsonl` or `.calls-summary.jsonl` for the eight cells;
  by step 7: `docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json|md` and
  `fit-read-prefixes-fr-none.json|md`; by step 8: `docs/improve-generating-stages-2-4/s01-reading.md` (the SAs').
- Do not change: any code, plan or earlier record. Guards: G1, G2; `git status --short` lists only the paths above.

## Steps

1. **Pre-checks** (orchestrator). Check-list §3.2's run checks, the first block (no runner is active; a matching or
   unidentifiable runner is a stop, never terminated), and no production change is in progress (D-V4-11: `git status
   --short -- core generator` prints nothing).
   `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S2B --label frozen --source-label "frozen 3fc65f4"`
   prints `prerequisites: pass`.
2. **The approval re-read.** `node tools\ig-proto\manifest.mjs approval --plan V4-S2B --label frozen --source-label
   "frozen 3fc65f4"` prints `{ plan: 'V4-S2B', spentS, ..., roundCountedSBeforeApproval, requestedAdditionalGuardS:
   1694.624..., requestedCumulativeRoundMinutes }`. The cap on the account is `ceil((roundCountedSBeforeApproval + 87.4 +
   1694.624) / 60)`; with the account of 2026-11-23 (10,252.712 s logged) it is **201**. It must be at most the grant in
   force (749): then no question is asked (approved, D-S24-26); otherwise stop and ask the owner for a raise. Record the
   line and the cap in the Execution log and in the next progress report.
3. **Dry run.** `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2B.json -Label frozen
   -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes 747`. Expected: five `[dry run] <id>: unlocked` lines and
   eight `[dry run] rows-fr-none-pilot-<cell>: go, horizon <h> s, allowance <a> s, forecast so far <f> s` lines, `<h>`
   885 for `3x29`, `18x18`, `18x20`, `20x20` and `20x21`, then 762 (`32x15`), 640 (`22x22`) and 481 (`24x24`), and the
   line `[dry run] forecast of the plan: 1,356 s counted (allocation 1,380 s, guard 1,725 s)` (T02a's figures, before
   any invocation of `V4-S2B`); any `stop` is reported, the run is not started. Ruling R-P24-02: the dry run adds each
   locked step's forecast (`projectS` + 45 s) to the plan's counted total, so its later horizons are set by the plan's
   own guard, `min(885, 1.25 x 23 x 60 - forecast - 55)` (`lib/budget.mjs:85-90`), not by the round's 747. The run
   itself computes each horizon from the counted seconds actually logged (`run-task.ps1:107`), and `arm.mjs run`
   starts a row only when its 260-s limit and 10 s fit in what is left of the horizon (`arm.mjs:177`): a row is never
   cut by a horizon, and a row that does not fit waits for the step's next invocation. The plan stops (exit 4, `STOP
   (budget)` or no progress, the recorded rows kept) only when its counted total nears 1,398 s (1,725 - 55 - 272) while
   rows remain: about 23.3 counted minutes against the timing proxy's 16 to 20 and the formal 22.59; that stop is
   handled as step 6 says and its continuation needs the owner's minutes.
4. **Start detached.** `New-Item -ItemType Directory -Force tests\artifacts\ig-proto\frozen\V4-S2B | Out-Null`, then with
   the orchestrator's `powershell` tool in `mode: "async", detach: true`:
   `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2B.json -Label frozen -SourceLabel
   'frozen 3fc65f4' -LockHelper tools\ig-proto\lock\ig-lock.ps1 -ApprovedRoundMinutes 747 *>
   tests\artifacts\ig-proto\frozen\V4-S2B\run-1.log`. Record the shell id and PID the tool returns; within one minute,
   check-list §3.2's run checks, the second block, with `$Plan = 'V4-S2B'` and `$Log =
   'tests\artifacts\ig-proto\frozen\V4-S2B\run-1.log'`: the runner is alive and its log has started.
5. **First completed invocation.** The run checks' third block: when `tests\artifacts\ig-proto\frozen\V4-S2B\invocations.jsonl`
   has its first line (written when the first locked invocation ends), check `quietS` (45, or 15 under a valid idle
   declaration) and `horizonS` at most 885, separately; a different value stops the checking and is reported (the
   runner is not killed).
6. **Completion.** The log ends with the runner's finish and exit 0; the `publish-fr-none` step printed eight lines
   `arm: published fr-none/pilot-<cell>: 5 rows, <m> journal lines`; `firewall-check` printed `firewall: OK`. On a stop:
   keep every file, report the log's last 40 lines and the stopped step, and wait for a ruling (check-list §3.2); after a
   stop inside a row step, `node tools\ig-proto\arm.mjs publish --task V4-S2B --arm fr-none --done-only --label frozen
   --source-label "frozen 3fc65f4"` publishes the done shards first (T01a).
7. **The readings** (unlocked):
   `node tools\ig-proto\fit-read.mjs preview --task V4-S2B --arm fr-none --label frozen --source-label "frozen 3fc65f4"`
   and `node tools\ig-proto\fit-read.mjs prefixes --task V4-S2B --arm fr-none --budget nightmare=10000000000 --label
   frozen --source-label "frozen 3fc65f4"`. Run them once the plan has completed (step 6); after a stop, only when the
   SAs rule that the publication is final: each record is written once (D-P24-07). On a complete run whose rows are
   valid they print `(8 cells, 0 problems, 0 unexpected)` and `(40 rows, 0 missing, 0 identity problems, 0 incomplete,
   ...)`; any other count is a warning for step 8, not a stop of the reading. The two commands were first checked on
   real records, `V4-S2`'s `fr-none` arm through their `io` seam (ruling R-P24-04: 8 cells, 0 problems, 26x26
   Nightmare's lower bound 0.881 as in stage 2; 40 rows, 821 calls, 0 missing, 0 incomplete, 0 ambiguous). Then the
   account: the sum of `countedSeconds` of
   `tests\artifacts\ig-proto\frozen\V4-S2B\invocations.jsonl` (the run's counted minutes) and the round's new account
   (logs plus 87.4 s off-log), in the Execution log and the next progress report.
8. **The SAs' reading** (SA-Opus drafts, SA-Astra reviews; joint text). `docs/improve-generating-stages-2-4/s01-reading.md`
   (CRLF, UTF-8 without BOM) with: per control cell, today ten and after ten (of 5), the five ratios, geo, the lower
   bound and whether it is at least 0.9 (the preview, "a fitting warning"); per cell, the calls `affected` and
   `potentially-affected` against 10 G and the largest call's work; the list of warnings (a lower bound below 0.9, a
   cell whose after-ten is below 5, any affected or potentially affected call, and every entry of the two records'
   `problems`, `missing`, `unexpected`, incomplete, unreadable and ambiguous rows, and every row with a non-empty
   `identity`, SA-Astra's review R2-03); and for each warning the SAs' joint
   decision under the owner's delegation, recorded as such: (a) no change (with the reason), (b) a change of a frozen
   value within plan §4.1's scope before T06 (named, with its consequence), or (c) a stop for the owner when it needs a
   new measured scope or changes one of his recorded decisions. **Every declared row/pair must be present, unique,
   correctly identified and valid. Every missing, unexpected, invalid, censored, erroneous, unreadable or ambiguous
   input is a warning requiring an SA ruling** (SA-Astra's review R03). No warning: the note says "no warning; the
   freeze values of plan §4.1 stand for the controls".

## Tests

None (a run and a reading).

## Documentation

`s01-reading.md` as step 8; the orchestrator's progress report (the account, the cap, the result in one paragraph).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's `check-prerequisites` | repository root | `prerequisites: pass` | 2 min |
| step 2's `approval` | repository root | the JSON line; cap on the account 201 at the 2026-11-23 account | 1 min |
| step 3's dry run | repository root | eight `go` | 2 min |
| step 4's run (detached) | repository root | exit 0; 8 shards published; `firewall: OK` | about 16 to 20 counted minutes (wall clock longer by the lock waits) |
| step 7's two `fit-read.mjs` commands | repository root | `fit-read: wrote docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json (8 cells, <p> problems, <u> unexpected)` and `fit-read: wrote .../fit-read-prefixes-fr-none.json (40 rows, <m> missing, <d> identity problems, <i> incomplete, ...)` | 2 min |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- Stop and report before: starting the run when the cap on the account exceeds the grant in force (step 2), or when the
  dry run is not `go` for every row step (step 3).
- Stop and report at: any non-zero exit of the runner; a first invocation with `horizonS` above 885; any warning of
  step 8 that the SAs route to the owner.
- A `QUESTION:` (from the SAs to the owner, through the orchestrator) only for a new measured scope or a change of one
  of his recorded decisions; every other warning is decided jointly by the SAs under the owner's delegation.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S01-B01 | The eight unpiloted controls are measured on the no-screen arm within the approved cap | the plan's invocation rows; the cap of step 2 | `invocations.jsonl`; the Execution log |
| S01-B02 | Every control at risk is named before the freeze, with the SAs' decision | `s01-reading.md` | the note |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S01-T01 | 40 rows recorded and published, 5 per cell | the eight `runs.json` | their `rows` |
| S01-T02 | The two `fit-read` records exist, hold one prefixes row per declared key (40) and every pair of the 8 cells, and every problem, identity problem, missing, unexpected, incomplete or ambiguous entry they list has an SA ruling in the note | their summaries; `s01-reading.md` | the JSON files; the note |
| S01-T03 | The runner exited 0 with `firewall: OK`; no file of the guards changed | the log; G1, G2 | `run-1.log`; empty outputs |

## Checklist (the executor confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green (none: a run)
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the executor's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator)

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Approval re-read (line; cap on the account) | |
| Counted minutes of the run; the round's account after it | |
| Questions and rulings | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |

# S03: Run `V4-S3P` (the four proofs and the uncapped Hell 1 check)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.3 (a candidate epoch), §4.6 (`V4-S3P`), §8.2 S-3, §8.3; N-V4-03, N-V4-21 (b); D-S24-19, D-S24-24, D-S24-27 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T10 |
| Depends on | T10 (the plan `tools/ig-proto/plans/V4-S3P.json` and its four item manifests) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator |
| Estimate | machine: formal 71.20 projected / 89.00 guard (the proofs) + 67.69 / 84.61 (the 20 Hell 1 rows) counted minutes; timing proxy 20.0-22.0 + 20.0-22.0; developer 0 h |

## Goal

Prove the candidate epoch (T08a's four trees) with the round's P-1 passes, each receipt passing with its replay block
and accepted `--by V4-S3`, and measure the 20 uncapped Hell 1 requests that T11 reads against the freeze's budgets and
bound before anything is recorded in `freeze.json`.

## Authority and fixed points

- **Owner stop: the proofs' cap.** The 20 Hell 1 rows are approved (2026-11-23, Q-S24-5 (a), D-S24-27); the four proofs
  are asked at their gate (plan §8.2 S-3, §8.3). The plan runs both; it starts only after the owner's answer.
- Run rules of the check-list §3.2: dry run first; `-ApprovedRoundMinutes 747` while the grant is 749; started detached;
  a running runner is never killed; a stop resumes only after a ruling, with `-Only` from the stopped step.
- N-V4-21 (b): every frozen arm with a call budget needs a P-1 generation its configuration completes; the `require`
  budgets (Nightmare 32 G, Hell 1 40 G; D-S24-23, D-S24-25) were set so that `12x12-nightmare`'s P-1 generation, whose
  records replayed at 5.8 G and 12.6 G units on `fr-base`, can complete.
- Records are written once; the epoch's receipts and bindings stay even if T11 rejects the epoch (check-list §3.3).

## Scope

- Create (by the run): `tests/artifacts/ig-proto/frozen/V4-S3P/` (raw); `docs/improve-generating/evidence/frozen/V4-S3P/`:
  `parity-<arm>.receipt.json` and `parity-<arm>.accepted.json` for the four arms, `inputs/parity-<arm>/`, and
  `fr-frozen-none-uncapped/pilot-<cell>.runs.json`, `.runs.md` and the calls files of the four Hell 1 cells.
- Do not change: any code, plan or earlier record. Guards: G1, G2; `git status --short` lists only these paths.

## Steps

1. **Pre-checks.** Check-list §3.2's run checks, the first block (no runner is active); `git status --short -- core
   generator` prints nothing (D-V4-11);
   `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S3P --label frozen --source-label "frozen 3fc65f4"`
   prints `prerequisites: pass`; `node tools\ig-proto\freeze.mjs check --label frozen --source-label "frozen 3fc65f4"`
   prints `freeze: check pass (6 checks; ...)` with the tree ids of T08a's NOTE line (the epoch did not move).
2. **The approval re-read.** `node tools\ig-proto\manifest.mjs approval --plan V4-S3P --label frozen --source-label
   "frozen 3fc65f4"` prints `roundCountedSBeforeApproval` and `requestedAdditionalGuardS` (10416.597 at T10's figures:
   proofs 5340.000, Hell 1 rows 5076.597). The cap on the account is `ceil((roundCountedSBeforeApproval + 87.4 +
   requestedAdditionalGuardS) / 60)`: 374 to 379 at the timing-proxy spend of S01 and S02 (plan §8.3), 394 if their guards
   were spent. It must be at most the grant in force (749).
3. **STOP: ask the owner** (Discord, through the orchestrator), and wait. Text to relay (the orchestrator translates):
   "Stage 3 needs four short proof runs of the frozen arms before the freeze is written (the 20 Hell 1 requests you
   approved on 2026-11-23 run in the same plan). The proofs cost about 20 to 22 counted minutes (at most 89 by the
   formal guard); with the Hell 1 requests the plan's cap on the account is `<cap>` of the 749 you granted, so no raise.
   (a) Approve the four proofs (recommended: without them the freeze cannot be recorded and stage 4 cannot start);
   (b) not now (stage 3 waits)." Record the answer and the message id in the Execution log. Only (a) continues.
4. **Dry run.** `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S3P.json -Label frozen
   -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes 747`: thirteen `[dry run] <id>: unlocked` lines and eight
   `go` lines (`parity-fr-frozen`, `parity-fr-frozen-none`, `parity-fr-frozen-uncapped`, `parity-fr-frozen-none-uncapped`
   and the four `rows-fr-frozen-none-uncapped-pilot-<cell>`), horizon 885 s; any `stop` is reported and the run is not
   started.
5. **Start detached.** `New-Item -ItemType Directory -Force tests\artifacts\ig-proto\frozen\V4-S3P | Out-Null`, then
   with the orchestrator's `powershell` tool in `mode: "async", detach: true`: `pwsh -NoProfile -File
   tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S3P.json -Label frozen -SourceLabel 'frozen 3fc65f4'
   -LockHelper tools\ig-proto\lock\ig-lock.ps1 -ApprovedRoundMinutes 747 *> tests\artifacts\ig-proto\frozen\V4-S3P\run-1.log`.
   Record the shell id and PID the tool returns; then check-list §3.2's run checks, the second block, with `$Plan =
   'V4-S3P'` and `$Log = 'tests\artifacts\ig-proto\frozen\V4-S3P\run-1.log'`.
6. **First completed invocation.** The run checks' third block: when `tests\artifacts\ig-proto\frozen\V4-S3P\invocations.jsonl`
   has its first line (written when the first locked invocation ends), check `quietS` (45, or 15 under a valid idle
   declaration) and `horizonS` at most 885, separately.
7. **Completion.** The log shows, in order: four `receipt: parity pass -> docs/improve-generating/evidence/frozen/V4-S3P/parity-<arm>.receipt.json`
   and four `accepted: ... -> .../parity-<arm>.accepted.json` lines; four `arm: published
   fr-frozen-none-uncapped/pilot-<cell>: 5 rows, <m> journal lines`; `firewall: OK`; the runner's exit 0. Then, for each
   arm: `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S3P/parity-<arm>.accepted.json
   --current <arm> --label frozen --source-label "frozen 3fc65f4"` prints `binding: pass`, and each receipt's `blocks`
   are `{ parity: 'pass', replay: 'pass' }`.
8. **On a stop.** Keep every file; report the log's last 40 lines and the stopped step. A `receipt-<arm>` that exits 2
   with an `incomplete` replay block (`no record obtained`, as `fr-p5`'s in V4-S2) or a `fail` is not run again: the
   SAs rule jointly under the owner's delegation (N-V4-21 (b): the configuration does not complete its P-1 generation;
   the epoch is then rejected and replaced under a new identity, plan §4.3, or a frozen value is changed before T12a);
   a stop inside a row step: `arm.mjs publish --task V4-S3P --arm fr-frozen-none-uncapped --done-only` first (T01a),
   then the ruling (check-list §3.2).
9. **The account.** The sum of `countedSeconds` of the run's `invocations.jsonl`, and the round's new account (logs plus
   87.4 s off-log), in the Execution log and the next progress report.

## Tests

None (a run).

## Documentation

The orchestrator's progress report (the owner's answer, the account, the four receipts and the published rows).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's three checks | repository root | `prerequisites: pass`; `freeze: check pass` | 5 min |
| step 2's `approval` | repository root | the JSON line; the cap at most 749 | 1 min |
| step 4's dry run | repository root | eight `go` | 2 min |
| step 5's run (detached) | repository root | exit 0; four receipts `pass`, four bindings; 20 rows published; `firewall: OK` | about 40 to 44 counted minutes (wall clock longer by the lock waits) |
| step 7's four `check-binding` | repository root | `binding: pass` each | 4 min |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- **STOP for the owner** at step 3 (the proofs' scope and cap); before step 5 when the cap exceeds the grant (a raise)
  or a dry-run step is not `go`.
- Stop and report at: a non-zero exit of the runner; a first invocation above 885 s; a receipt that does not pass.
- A ruling (step 8) is the SAs' joint decision under the owner's delegation, recorded in the check-list's register;
  the owner is asked only for a new measured scope or a change of one of his recorded decisions.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S03-B01 | The four frozen arms are proved identical in the three observer modes with a replayed generation, inside the owner's approved cap | the receipts and bindings; the approval | `V4-S3P/parity-*.json`; the Execution log |
| S03-B02 | The 20 uncapped Hell 1 requests are published for T11 | the runs files | `V4-S3P/fr-frozen-none-uncapped/` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S03-T01 | Four receipts `pass` (`blocks` parity and replay `pass`), four bindings accepted `--by V4-S3`, `check-binding --current <arm>` `pass` | step 7 | the files and lines |
| S03-T02 | 20 rows recorded and published, 5 per cell | the four runs files | their `rows` |
| S03-T03 | The runner exited 0 with `firewall: OK`; G1, G2 empty | the log; the guards | `run-1.log` |

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
| Start, end, duration | 2026-11-24 07:42:21 +07:00 (runner launched) to 08:21:07 +07:00 (exit 0); about 39 min wall clock; pre-checks and the dry run 07:06-07:08, the owner stop 07:08-07:41 |
| Owner's answer (date, message id) | (a), 2026-11-24 07:41:32 +07:00, Discord ai-ws-1 message 1574585730338922549 ("Q-s03 a"), asked in message 1574577154224820358 |
| Approval re-read (line; cap on the account) | roundCountedSBeforeApproval 11887.323, requestedAdditionalGuardS 10416.597 (proofs 5340.000, Hell 1 rows 5076.597); cap ceil((11887.323 + 87.4 + 10416.597) / 60) = 374 of the 749 granted; dry run `-ApprovedRoundMinutes 747`: 13 unlocked, 8 go, 0 stop |
| Counted minutes of the run; the round's account after it | 2298.808 s (38.31 min): parity 321.088 / 321.504 / 321.142 / 320.558; Hell 1 rows 14x14 522.096, 20x20 182.864, 24x24 150.346, 26x26 159.210; every invocation quietS 15 (idle declaration), horizonS 885, exit 0. Round account 14186.131 s logged + 87.4 s off-log = 14273.531 s = 237.9 of 749 counted minutes |
| Receipts and bindings | four receipts `parity pass`, blocks `{ parity: pass, replay: pass }`: fr-frozen f8c819d1, fr-frozen-none d0210095, fr-frozen-uncapped 5c4bfaf3, fr-frozen-none-uncapped ee18d8f8; four `parity-<arm>.accepted.json` with acceptedBy V4-S3; `check-binding --current <arm>` `binding: pass` for all four; 20 Hell 1 rows published (5 per cell; 3148 / 2197 / 1649 / 1751 journal lines) |
| Questions and rulings | Q-S03 to the owner, answered (a); no SA ruling needed |
| Gates re-run by the orchestrator | run log: `firewall: OK, 289 production files unchanged since the snapshot of V4-S3P`, `Plan V4-S3P finished: task counted 2,299 s, round counted 14,186 s`; four check-binding pass; G1, G2 empty; git status lists only docs/improve-generating/evidence/frozen/V4-S3P/ (28 files) |
| Commit | this task's commit |
| Issues and named items | none |

# S02: Run `V4-P7` and write the spike report

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.6 (`V4-P7`), §6 T6, §8.2 S-2, §8.3; `report.md` §3; D-S24-15, D-S24-22, D-S24-28; pack decision D-P24-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T05b |
| Depends on | T05b (`tools/ig-proto/plans/V4-P7.json`, the equality reports) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator (the run, steps 1 to 6); SA-Opus and SA-Astra (the spike report, step 7) |
| Estimate | machine: formal 15.50 projected / 19.37 guard counted minutes for three composites (5.17 / 6.46 for one, 10.33 / 12.91 for two); timing proxy 11.4 to 12.9 for three; developer 0 h |

## Goal

Time the composites proved equal to the reference (T05b) on 90 paired items each, and record whether P7 goes to the
phase-1 production work (go at x1.04, fixed before the measurement). The frozen round keeps the reference kernel
whatever the result (D-S24-22): this run informs phase 1 only.

## Authority and fixed points

- D-S24-28 (owner, 2026-11-23): up to 20 counted minutes; the plan's guard is 19.37 minutes for three composites and the
  runner's task cap 1.25 x its allocation (16 min, so 20 min); the account is re-read before the run.
- D-P24-05: go per composite when `quickEqual && fullEqual && timing.verdict === 'measured' && timing.notSame.length
  === 0 && timing.ratio >= 1.04`, the equality reports bound to the timed trees (T03c); D-S24-22: a passing composite is
  a candidate for phase 1 only; no speed credit in this round.
- Run rules of the check-list §3.2 (dry run first, `-ApprovedRoundMinutes 747`, detached, never killed, resume by a
  ruling).

## Scope

- Create (by the run): `tests/artifacts/ig-proto/frozen/V4-P7/` (raw), `docs/improve-generating/evidence/frozen/V4-P7/p7.json`
  and `p7.md` (the `report` step); by step 7 `docs/improve-generating-stages-2-4/s02-spike-report.md` (the SAs').
- Do not change: any code, plan or earlier record. Guards: G1, G2; `git status --short` lists only the paths above.

## Steps

**No eligible candidate** (SA-Astra's review R08): when T05b ended with no eligible composite and wrote no
`V4-P7.json`, steps 1 to 6 are skipped; step 7 is the only step, its report records "no eligible candidate; no timing
run; 0 counted measurement minutes" with the equality reports' verdicts per composite, the run-specific acceptance
criteria (S02-B01, S02-T01, S02-T02) are not applicable, and T06a may proceed.

1. **Pre-checks**: check-list §3.2's run checks, the first block (no runner is active); no production change in
   progress; `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-P7 --label frozen --source-label "frozen
   3fc65f4"` prints `prerequisites: pass`.
2. **The approval re-read**: `node tools\ig-proto\manifest.mjs approval --plan V4-P7 --label frozen --source-label
   "frozen 3fc65f4"`; the cap on the account `ceil((roundCountedSBeforeApproval + 87.4 + requestedAdditionalGuardS) /
   60)` must be at most the grant in force (749), and `requestedAdditionalGuardS` at most 1,200 s (the owner's 20
   minutes); otherwise stop and ask the owner. Record the line and the cap.
3. **Dry run**: `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-P7.json -Label frozen
   -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes 747`: every `time-<composite>` step `go`.
4. **Start detached**: `New-Item -ItemType Directory -Force tests\artifacts\ig-proto\frozen\V4-P7 | Out-Null`; with
   `mode: "async", detach: true`: `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-P7.json
   -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper tools\ig-proto\lock\ig-lock.ps1 -ApprovedRoundMinutes 747 *>
   tests\artifacts\ig-proto\frozen\V4-P7\run-1.log`. Then check-list §3.2's run checks, the second block, with `$Plan =
   'V4-P7'` and `$Log = 'tests\artifacts\ig-proto\frozen\V4-P7\run-1.log'`.
5. **First completed invocation**: the run checks' third block: the first row of
   `tests\artifacts\ig-proto\frozen\V4-P7\invocations.jsonl` shows `quietS` 45 (or 15) and `horizonS` at most 885.
6. **Completion**: exit 0; each `bind-<composite>` step printed `p7-probe: <composite> bound to its quick and full
   equality reports`; the `report` step printed `p7-probe: wrote docs/improve-generating/evidence/frozen/V4-P7/p7.json`
   and one go line per composite (`p7-probe: <composite> go <yes|no> (ratio <r or n/a>, quick <ok or reason>, full <ok
   or reason>, timing <verdict>)`); `firewall: OK`. The run's counted minutes (the sum of its invocation rows) and the
   round's new account go to the Execution log and the next progress report. On a stop: keep every file, report, wait
   for a ruling.
7. **The spike report** (SA-Opus drafts, SA-Astra reviews; joint text), `docs/improve-generating-stages-2-4/s02-spike-report.md`:
   per composite the equality counts of both tiers (items, equal, the memory coverage: each fixture's reference bytes,
   list bytes and representation), the timing (the verdict; when `measured`, the reference and candidate sums, the
   ratio, the geometric mean of the per-item ratios; otherwise the missing, error, censored, invalid and differing
   ids), and go or no by D-P24-05; the conclusion for N-V4-05's phase 1 ("candidate for the phase-1 production work, with
   its own equality, fixture, test and memory gates" for a go composite; "no P7 item for phase 1" otherwise); and the
   statement that the four frozen arms keep the reference kernel (D-S24-22). With no eligible candidate: the text of
   the branch above.

## Tests

None (a run and a report).

## Documentation

`s02-spike-report.md` as step 7; the orchestrator's progress report.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's `check-prerequisites` | repository root | `prerequisites: pass` | 2 min |
| step 2's `approval` | repository root | the JSON line; the guard at most 1,200 s; the cap on the account within the grant | 1 min |
| step 3's dry run | repository root | every `time-*` step `go` | 2 min |
| step 4's run (detached) | repository root | exit 0; `p7.json` written; `firewall: OK` | about 11 to 13 counted minutes for three composites |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- Stop and report before: starting the run when the guard exceeds 1,200 s or the cap exceeds the grant (step 2), or when
  a step is not `go` (step 3).
- Stop and report at: a non-zero exit; a timing item whose two ratings are not `same` (a `p7.json` `notSame` entry):
  that composite's go is `no` and the pack author rules on it.
- A `QUESTION:` to the owner only for more machine time than the 20 minutes approved.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S02-B01 | P7's spike ends with a go or no-go per composite, decided by the rule fixed before the measurement, within the owner's 20 minutes (not applicable with no eligible candidate) | `p7.json`; the invocation rows | the files; the Execution log |
| S02-B02 | The frozen arms keep the reference kernel | the spike report; no variant of the frozen family names a `p7-*` variant | `s02-spike-report.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S02-T01 | 90 items ended per composite timed; the verdicts and ratios computed from the declared items only (not applicable with no eligible candidate) | `p7.json` `time` | the file |
| S02-T02 | The runner exited 0 with `firewall: OK`; no file of the guards changed (not applicable with no eligible candidate) | the log; G1, G2 | `run-1.log`; empty outputs |

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
| Start, end, duration | 2026-11-24 04:25 +07:00 (pre-checks, base `6666666`); the run 04:26-04:40 (detached, shell `v4-p7-run1`, runner PID 19088, exit 0); the SAs' spike report 04:42-05:12; accepted 2026-11-24 05:10 +07:00 |
| Waiting for rulings | none (the SAs' spike report, about 30 min, one review round) |
| Approval re-read (line; cap on the account) | `{"plan":"V4-P7","spentS":11086.156,"assumedEarlierGuardS":0,"roundCountedSBeforeApproval":11086.156,"requestedAdditionalGuardS":1162.1718749999993,"requestedCumulativeRoundMinutes":205}`; guard 1,162.2 s <= 1,200 (the owner's 20 minutes, D-S24-28); cap on the account ceil((11,086.156 + 87.4 + 1,162.172) / 60) = 206 <= 749 |
| Counted minutes of the run; the round's account after it | 801.167 counted s (13.35 min; time-p7-c1 273.17, time-p7-c1r5 269.628, time-p7-c1r5c5 258.4; each quietS 15, horizonS <= 885, killed false, exit 0); the round's account 11,887.323 s logged + 87.4 s off-log = 11,974.7 s (199.6 of 749 counted minutes) |
| Questions and rulings | none; go per D-P24-05: `p7-c1` no (ratio 0.7293), `p7-c1r5` no (0.7449), `p7-c1r5c5` no (0.8071), each quick ok, full ok, timing measured, 90 of 90 pairs, none differing; the SAs' joint spike report `docs/improve-generating-stages-2-4/s02-spike-report.md` (SA-Astra's two explanation corrections applied verbatim); N-V4-05 closed: no P7 item for phase 1; the frozen arms keep the reference kernel (D-S24-22) |
| Gates re-run by the orchestrator | steps 1-3: no runner active; `git status -- core generator` empty; prerequisites pass; dry run 3 `go` (885, 835, 525 s; forecast 930 s); step 4: runner alive, log started; step 5: first invocation quietS 15, horizonS 885; step 6: exit 0, the three `bind-*` steps bound, `report` wrote `V4-P7/p7.json` with three go lines, `firewall: OK, 289`; G1, G2 empty |
| Commit | this task's commit |
| Issues and named items | N-V4-05 closed (check-list §6.1) |

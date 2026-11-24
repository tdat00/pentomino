# S07: Run `V4-S4C` (the uncapped comparators and the final verdict)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §8.2 S-7, §8.3, §6 T7; plan v4 stage 4 (RV3-04's comparators, the final verdict, phase 0's line); T11f of the v4 pack (`resolveComparators`, `manifest.mjs:2397`); D-V4-20 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S06 |
| Depends on | S06 (`tools/ig-proto/plans/V4-S4C.json`, `class-selection.json`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator |
| Estimate | machine: formal 585.62 projected / 732.02 guard counted minutes (at T11g's prices; the resolved plan's own figures rule); timing proxy 169.8-182.8 counted minutes; developer 0 h |

## Goal

Measure each comparator cell on the uncapped twin of the arm its class ships (RV3-04), then write the global verdict
record `docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json` and `.md`, whose phase-0 line (`Phase 0: pass.`,
`Phase 0: FAIL (...)` or `Phase 0: INCOMPLETE (...)`) is what T16 reports to the owner.

## Authority and fixed points

- **Owner stop: its scope** at its turn (plan §8.2 S-7: approval of the scope; a raise only if its minimum exceeds the
  grant then active; §8.3: 1,441 to 1,497 on the account at the timing-proxy spend, below S06's grant if S06 underspent).
- The plan file is the one `resolve-comparators` wrote (`generatedBy` its command; steps: `prerequisites`,
  `firewall-snapshot`, `trees`, the comparator rows of the 19 cells, a `publish-<arm>` per resolved twin, `verdict-input
  --purpose final`, `verdicts`, `firewall-check`); never edited.
- The harness window (D-V4-20) holds until the final verdict is written: no edit of `lib/`, `data/` or a top-level
  `.mjs`/`.ps1` of `tools/ig-proto/`.
- Run rules of the check-list §3.2 (grant `G` of S06: runs pass `G - 2`); a stopped comparator collection as in step 7,
  never a closure (the closure route is `V4-S4`'s only, SA-Astra's review R2-08).

## Scope

- Create (by the run): `tests/artifacts/ig-proto/frozen/V4-S4C/`; `docs/improve-generating/evidence/frozen/V4-S4C/<twin>/*.runs.json`
  and their `.md` and calls files; `tools/ig-proto/plans/verdicts/V4-S4F.verdict-manifest.json`;
  `docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json` and `verdicts.md`; on an owner decision to stop the
  comparator collection only, `docs/improve-generating-stages-2-4/s07-stop.md` (step 7).
- Do not change: any code or earlier record. Guards: G1, G2 (new files only).

## Steps

1. **The approval re-read.** `node tools\ig-proto\manifest.mjs approval --plan V4-S4C --label frozen --source-label
   "frozen 3fc65f4"`; the cap on the account `ceil((roundCountedSBeforeApproval + 87.4 + requestedAdditionalGuardS) /
   60)`; compare with the grant in force `G`.
2. **STOP: ask the owner** (Discord), and wait. Text to relay: "The last run of stage 4 measures, for each of the 19
   cells, the same search without its safety limits, to show what the limits cost. It takes about `<proxy>` counted
   minutes (up to `<guard>` by the formal guard); the cap on the account is `<cap>`, `<within | above>` your grant of `G`.
   (a) Approve (recommended: the final verdict and phase 0's answer need it); (b) not now." If the cap exceeds `G`, the
   question asks for the raise to at least `<cap>`. Record the answer and the message id. When `V4-S4`'s selection
   record already reads `Phase 0: FAIL (...)`, as it does (control 26x26 Nightmare; ruling R-P24-19), relay instead the
   text of `docs/improve-generating-stages-2-4/s06-reading.md` §6: it states the result first, then asks the same
   question, its recommendation (a) resting on completion of the predeclared comparisons and final-purpose evidence,
   not on assumed deployment of the other boards. Approval of S07 is measurement approval only; the recorded FAIL and
   phase-2 block remain.
3. **Pre-checks.** Check-list §3.2's run checks, the first block (no runner is active); `git status --short -- core
   generator` empty; `node tools\ig-proto\manifest.mjs
   check-prerequisites --plan V4-S4C --label frozen --source-label "frozen 3fc65f4"` prints `prerequisites: pass` (the
   variants, the selection receipt and its `selection` proof).
4. **Dry run.** `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S4C.json -Label frozen
   -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes <G - 2>`: every row step `go`.
5. **Start detached.** `New-Item -ItemType Directory -Force tests\artifacts\ig-proto\frozen\V4-S4C | Out-Null`; with the
   orchestrator's `powershell` tool in `mode: "async", detach: true`: `pwsh -NoProfile -File tools\ig-proto\run-task.ps1
   -Plan tools\ig-proto\plans\V4-S4C.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper
   tools\ig-proto\lock\ig-lock.ps1 -ApprovedRoundMinutes <G - 2> *> tests\artifacts\ig-proto\frozen\V4-S4C\run-1.log`,
   where `<G - 2>` is the number (the grant in force less 2; with no new grant, S06's). Record the shell id and PID the
   tool returns; then check-list §3.2's run checks: the second block with `$Plan = 'V4-S4C'` and `$Log =
   'tests\artifacts\ig-proto\frozen\V4-S4C\run-1.log'`, and, after the first locked invocation ends, the third block
   (`quietS`, `horizonS` at most 885, separately). The 3-hour figure is a timing proxy, never a kill timeout. A resume
   logs to its own next `run-<n>.log` (`run-2.log`, ...).
6. **Completion.** One `arm: published <twin>/<shard>: <n> rows, ...` line per shard; `verdict-input` writing
   `tools/ig-proto/plans/verdicts/V4-S4F.verdict-manifest.json`; `verdicts: wrote
   docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json`; `firewall: OK`; exit 0. Read the phase-0 line from
   `verdicts.md` (`Phase 0: ...`) and report it verbatim.
7. **On a stop** (check-list §3.2, §3.4): keep every file; report the log's last 40 lines, the stopped step and the
   account; publish the done shards of every resolved twin with `node tools\ig-proto\arm.mjs publish --task V4-S4C --arm
   <twin> --done-only --label frozen --source-label "frozen 3fc65f4"` (T01a); then wait for the ruling. A collection
   stopped at its recorded ceiling goes to the owner (stop or raise). **On an owner decision to stop comparator
   collection** (SA-Astra's review R2-08, verbatim): "preserve the existing activation, selection and V4-S4 closure
   unchanged. Record the exact owner instruction and all missing comparator rows. Do not invoke `close --collection
   initial` as a comparator closure. If every required arm has the publication/identity evidence needed by
   `verdict-input`, the owner may authorize the unlocked finalization suffix, retaining missing comparator pairs as
   unknown/incomplete. Otherwise report the measured stop and obtain the joint SA ruling for the unavailable finalization
   path; do not create fake runs files or edit the frozen harness inside D-V4-20's window." Concretely: `close` is never
   run in S07 (`manifest.mjs` `CLOSE_PATHS` and `closeCommand`, lines 1941-1946 and 2027-2077, know only `V4-S4`'s
   activation and its closure); the orchestrator writes `docs/improve-generating-stages-2-4/s07-stop.md` (CRLF, UTF-8
   without BOM) with the owner's instruction verbatim (its message id and time) and, per twin, the published comparator
   rows and the declared rows without one; the precondition is that every `publish-<twin>` arm of the plan has at least
   one `docs/improve-generating/evidence/frozen/V4-S4C/<twin>/*.runs.json` whose `meta.trees[<twin>].treeId` is a string
   (`verdict-input` refuses `not published <arm>` otherwise, `manifest.mjs:2593-2595`). When it holds and the owner
   authorizes it, resume `-Only prerequisites,firewall-snapshot,trees,verdict-input,verdicts,firewall-check` (excluding a
   complete immutable step; dry-run that exact selection first; no row step after the stop; an existing immutable final
   artifact is a stop for the named ruling); the missing pairs stay unknown or incomplete in the verdicts. When it does
   not hold, report the measured stop; the SAs rule jointly on the finalization path.
8. **The account**: the round's final account (logs plus 87.4 s off-log) against the grant, in the Execution log and the
   progress report.

## Tests

None (a run).

## Documentation

The orchestrator's progress report with the phase-0 line verbatim and the account.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's `approval` | repository root | the JSON line; the cap | 1 min |
| step 3's `check-prerequisites` | repository root | `prerequisites: pass` | 2 min |
| step 4's dry run | repository root | every row step `go` | 5 min |
| step 5's run (detached) | repository root | exit 0; the lines of step 6 | about 3 hours |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- **STOP for the owner** at step 2 (the scope; a raise only if needed).
- Stop and report at: a non-zero exit; a first invocation above 885 s; a collection stopped at its ceiling (the owner).

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S07-B01 | The final verdict and phase 0's line exist, on the frozen arms and their uncapped comparators, within the owner's approval | `verdicts.json`, `verdicts.md` | the files |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S07-T01 | The comparator rows published per resolved twin | the runs files | their `rows` |
| S07-T02 | `V4-S4F/verdicts.json` and `.md` written; exit 0 with `firewall: OK` | the log | `run-<n>.log` |

## Checklist (the executor confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green (none: a run)
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the executor's reply)

The start and end times; the owner's answer; the files written; the phase-0 line; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator)

| Item | Value |
|---|---|
| Start, end, duration | approval re-read 19:12 +07:00; SA reading (R-P24-19) 19:13-19:58; owner stop 19:58-20:04; runner launched 20:05:50, finished 22:47 (exit 0); about 2 h 42 min of run |
| Owner's answer (date, message id) | (a), 2026-11-24 20:04:31 +07:00, Discord ai-ws-1 message 1574772706199732236 ("q-s07 a"), asked in message 1574771959026421935 with the SAs' joint text (s06-reading.md §6, R-P24-19): measurement approval only |
| Approval re-read (line; cap on the account) | `{"plan":"V4-S4C","spentS":42514.439,"assumedEarlierGuardS":0,"roundCountedSBeforeApproval":42514.439,"requestedAdditionalGuardS":43921.28276965763,"requestedCumulativeRoundMinutes":1441}`; cap ceil((42514.439 + 87.4 + 43921.283) / 60) = 1,443, within the grant 1,725; prerequisites pass; dry run `-ApprovedRoundMinutes 1723`: 8 unlocked, 19 go, 0 stop, forecast 35,137 s |
| Counted minutes of the run; the round's final account | 9,670.158 s (161.17 min) in 23 invocations (19 locked steps), all exit 0, none killed, quietS 45, horizonS at most 885 (first invocation rows-fr-frozen-uncapped-val-14x14-nightmare: 45 / 885). Round final account 52,184.597 s logged + 87.4 s off-log = 52,271.997 s = 871.2 of 1,725 counted minutes |
| Phase-0 line | `Phase 0: FAIL (control 26x26-nightmare: fail)` (V4-S4F/verdicts.md, purpose final; 5 arms, 99 runs files, 19 P5 pairs; declared rows 1120, published 1500, missing 0); class verdicts unchanged from V4-S4; P5 over the 19 declared pairs: 0 false stops, 0 unknown, 0 unexpected rows; lost completions 0 except 14x14-hell-1: 2; 19 shards published (fr-frozen-uncapped 3, fr-frozen-none-uncapped 16) |
| Commit | this task's commit |
| Issues and named items | none new; the FAIL and the 26x26 decision go to T16 (R-P24-19); `firewall: OK`; G1, G2 empty; the harness window (D-V4-20) closes with this final verdict |

# S06: Run `V4-S4` (stage 4's validation: proofs, rows, the class selection, the comparators' plan)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §8.2 S-6, §8.3, §6 T7; plan v4 stage 4; T11c, T11e, T11f of the v4 pack; D-V4-20 (the harness window); N-V4-19 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S05 |
| Depends on | S05 (`plans/V4-S4.json`, the activation record) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | the orchestrator |
| Estimate | machine: formal 1,185.49 projected / 1,481.86 guard counted minutes (allocation 1,186 minutes; with S4-6, 1,244 and 1,554.33); timing proxy 464.3-509.8 counted minutes, 8 to 9 hours of wall clock with the lock waits; developer 0 h |

## Goal

Run stage 4's validation on the frozen arms: the four P-1 proofs of `V4-S4P`, the 80 groups of request rows (1,120
declared rows; `fr-frozen` and `fr-frozen-none` with the 130-s row limit, today's arm `log-link` with 260 s), their
publication, the selection verdict input, the class selection (`verdicts.mjs`), and the comparators' plan `V4-S4C.json`.

## Authority and fixed points

- **Owner stop: the raise.** `V4-S4` needs a cumulative cap above the 749 granted (plan §8.3: a minimum of about 1,726 to
  1,737 at the timing-proxy spend). The orchestrator asks after S05's activation; nothing locked runs before his answer.
  Once he grants a cap `G`, runs pass `-ApprovedRoundMinutes G - 2` (check-list §3.2, while the off-log total stays 87.4 s).
- The plan file is the one `activate` wrote (`generatedBy` `manifest.mjs activate`; 102 steps, 84 locked at S05's
  figures); never edited, never recompiled.
- **The harness window** (D-V4-20, check-list §3.3): no edit of `tools/ig-proto/lib/`, `data/` or a top-level `.mjs`
  or `.ps1` while the plan runs, and none from its `verdicts` step until S07's final verdict.
- **A stopped collection** (check-list §3.4): its done shards are published first (`arm.mjs publish --task V4-S4 --arm
  <arm> --done-only` for each arm, T01a); a closure (`manifest.mjs close --collection initial --reason <text>`) only on
  the owner's instruction, with the published and the missing rows listed; after a closure, no row step of the closed
  collection runs.
- Run rules of §3.2: dry run first; started detached; a running runner is never killed; a stop is resumed only after a
  ruling, with the stopped run's parameters and `-Only` from the stopped step (never a complete step).

## Scope

- Create (by the run): `tests/artifacts/ig-proto/frozen/V4-S4/`, `.../V4-S4P/`; `docs/improve-generating/evidence/frozen/V4-S4P/`
  (four receipts and bindings, inputs), `docs/improve-generating/evidence/frozen/V4-S4/<arm>/*.runs.json` (and `.md`,
  calls files) for `fr-frozen`, `fr-frozen-none`, `log-link`, `class-selection.json` and the verdict records beside it;
  `tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json`; `tools/ig-proto/plans/V4-S4C.json`.
- Do not change: any code or earlier record. Guards: G1, G2 (new files only).

## Steps

1. **The approval re-read.** `node tools\ig-proto\manifest.mjs approval --plan V4-S4 --label frozen --source-label
   "frozen 3fc65f4"`: `requestedAdditionalGuardS` 88911.486 (1,481.858106 counted minutes; 93259.650 with S4-6); the
   cap on the account `ceil((roundCountedSBeforeApproval + 87.4 + requestedAdditionalGuardS) / 60)`.
2. **STOP 2: ask the owner** (Discord), and wait. Text to relay: "Stage 4 is the long validation run: about 8 to 9 hours
   of machine time (about 464 to 510 counted minutes measured the way earlier runs were; up to 1,482 by the formal
   guard). Your current grant is 749 counted minutes; the run needs the cumulative cap raised to at least `<cap>`. Two of
   the ten Nightmare control boards have small margins in the fitting runs: 32x15 (about the same speed as today's search
   on five seeds) and 26x26 (about 12 % faster, with one slow seed); if either falls below the required 0.9 no-regression
   bound at stage 4, phase 2 stops for a decision, while every other verdict of the run stands. (a)
   Raise the cap to `<cap>` and run (recommended: this is the validation the whole round leads to); (b) raise it to a
   value you choose of at least `<cap>`; (c) not now. Sudoku's difficulty-v3 keeps priority; tell us if it has nothing
   scheduled until a time (the waits shorten)." Record the answer, the new grant `G` and the message id. Only (a) or (b)
   continues; the check-list §1 account paragraph is updated by the orchestrator with `G`.
3. **Pre-checks.** Check-list §3.2's run checks, the first block (no runner is active); `git status --short -- core
   generator` empty; `node tools\ig-proto\manifest.mjs
   check-prerequisites --plan V4-S4 --label frozen --source-label "frozen 3fc65f4"` prints `prerequisites: pass`.
4. **Dry run.** `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S4.json -Label frozen
   -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes <G - 2>`: 18 `unlocked` lines and 84 `go` lines (89 with
   S4-6); any `stop` is reported.
5. **Start detached.** `New-Item -ItemType Directory -Force tests\artifacts\ig-proto\frozen\V4-S4 | Out-Null`; with the
   orchestrator's `powershell` tool in `mode: "async", detach: true`: `pwsh -NoProfile -File tools\ig-proto\run-task.ps1
   -Plan tools\ig-proto\plans\V4-S4.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper
   tools\ig-proto\lock\ig-lock.ps1 -ApprovedRoundMinutes <G - 2> *> tests\artifacts\ig-proto\frozen\V4-S4\run-1.log`,
   where `<G - 2>` is the number (the owner's new grant less 2). Record the shell id and PID the tool returns; then the
   run checks' second block with `$Plan = 'V4-S4'` and `$Log = 'tests\artifacts\ig-proto\frozen\V4-S4\run-1.log'`,
   and, after the first locked invocation ends, the third block (`quietS`, `horizonS` at most 885, separately). The
   8-9-hour figure is a timing proxy, never a kill timeout: the task and round caps and the owner's no-kill rule govern.
   Progress reports follow the owner's interval (the
   `progress-report` skill), each with the steps done, the counted minutes so far and the account.
6. **Completion.** The log shows the four `receipt: parity pass -> docs/improve-generating/evidence/frozen/V4-S4P/parity-<arm>.receipt.json`
   and `accepted: ...` lines; the three publish steps (`arm: published <arm>/<shard>: <n> rows, ...`, one line per
   shard); `verdict-input` writing `tools/ig-proto/plans/verdicts/V4-S4.verdict-manifest.json`; `verdicts: wrote
   docs/improve-generating/evidence/frozen/V4-S4/class-selection.json`; `resolve-comparators` writing
   `tools/ig-proto/plans/V4-S4C.json`; `firewall: OK`; exit 0.
7. **On a stop** (check-list §3.2, §3.4): keep every file; report the log's last 40 lines, the stopped step and the
   account; publish the done shards of every arm with `--done-only`; then wait for the ruling. A collection stopped at
   its recorded ceiling goes to the owner (close or raise); a receipt that does not pass goes to the SAs' joint ruling.
   **After an owner-authorized closure** (check-list §3.2): publish every done shard first, write the closure with the
   owner's exact reason (`node tools\ig-proto\manifest.mjs close --collection initial --reason <his text> --label frozen
   --source-label "frozen 3fc65f4"`), then resume only the unlocked selection and finalization suffix, provided every
   mandatory proof binding of `V4-S4P` passed (otherwise the proof stop is routed first and no selection is invented)
   and every arm that `verdict-input` reads has a published runs file with its tree identity (`verdict-input` refuses
   `not published <arm>`, `manifest.mjs:2593-2595`; an early stop can leave a whole arm unpublished even after every
   done shard is published; otherwise report the measured stop and the SAs rule jointly on the finalization path, with
   no fake runs file and no harness edit inside D-V4-20's window; SA-Astra's review R2-08):
   `-Only prerequisites,firewall-snapshot,trees,verdict-input,verdicts,resolve-comparators,firewall-check`, excluding a
   step already complete and immutable; dry-run that exact selection first (`-DryRun` with the same `-Only`); no row
   step and no default incomplete-shard publish step is selected after the closure; an immutable selection or final
   artifact that already exists is a stop for the named ruling, never overwritten. The resumed run logs to the next
   `run-<n>.log`.
8. **The account**, as S01's step 7, in the Execution log and the progress report; the class selection's summary (the
   classes, the shipped arm proposed per class) in one paragraph for the owner.

## Tests

None (a run).

## Documentation

The orchestrator's progress reports; the check-list §1 account paragraph with the new grant.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1's `approval` | repository root | the JSON line; the cap | 1 min |
| step 3's `check-prerequisites` | repository root | `prerequisites: pass` | 2 min |
| step 4's dry run | repository root | 84 `go` (89 with S4-6) | 5 min |
| step 5's run (detached) | repository root | exit 0; the lines of step 6 | 8 to 9 hours |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- **STOP 2 for the owner** at step 2 (the raise). Also for him: a collection stopped at its recorded ceiling (close it,
  with the missing rows listed, or raise).
- Stop and report at: a non-zero exit; a receipt that does not pass; a first invocation above 885 s.
- No harness edit from the `verdicts` step until S07's final verdict (D-V4-20).

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S06-B01 | Stage 4's validation is measured on the frozen arms within the owner's raised cap, and each class gets its proposed shipped arm | the class selection; the account | `class-selection.json`; the Execution log |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| S06-T01 | Four `V4-S4P` receipts `pass`, bindings accepted | the files | the receipts |
| S06-T02 | The declared rows published (or, after a closure, the missing ones listed in `closure.json`) | the runs files; the closure | the files |
| S06-T03 | `class-selection.json` and `plans/V4-S4C.json` written; exit 0 with `firewall: OK` | the log | `run-<n>.log` |

## Checklist (the executor confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green (none: a run)
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the executor's reply)

The start and end times; the owner's answer and the new grant; the files written; the gate results with numbers; each
AC row with its evidence; the questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator)

| Item | Value |
|---|---|
| Start, end, duration | approval re-read 10:28 +07:00; owner stop 10:28-11:16; runner launched 11:18:28, finished 19:07 (exit 0); about 7 h 49 min of run |
| Owner's answer (new grant, date, message id) | (a), the cumulative cap raised to 1,725 counted minutes; 2026-11-24 11:16:58 +07:00, Discord ai-ws-1 message 1574639945073557515 ("Q-s06 a"), asked in message 1574627604114317464; check-list §1 updated (commit c439cff); runs pass `-ApprovedRoundMinutes 1723` |
| Approval re-read (line; cap on the account) | `{"plan":"V4-S4","spentS":14471.048,"assumedEarlierGuardS":0,"roundCountedSBeforeApproval":14471.048,"requestedAdditionalGuardS":88911.48638503549,"requestedCumulativeRoundMinutes":1724}`; cap ceil((14471.048 + 87.4 + 88911.486) / 60) = 1,725; prerequisites pass; dry run `-ApprovedRoundMinutes 1723`: 18 unlocked, 84 go, 0 stop, forecast 71,129 s |
| Counted minutes of the run; the round's account after it | 28,043.391 s (467.39 min) in 94 invocations (84 locked steps; eight steps took more than one: six took two, and the two 14x14 Hell 1 steps took three; corrected at T16), all exit 0, none killed, quietS 45, horizonS at most 885. Round account 42,514.439 s logged + 87.4 s off-log = 42,601.839 s = 710.0 of 1,725 counted minutes |
| Stops, rulings, resumes | none. Results: four V4-S4P receipts `parity pass`, four bindings `binding: pass`; 1,120 declared rows published, 0 missing (fr-frozen 35, fr-frozen-none 19, log-link 26 runs files); verdict-input: selection V4-S4, 3 arms, 80 runs files, 0 P5 pairs; class selection: n-small failed (faster: geometric mean 0.9981, lower bound 0.9953) ships fr-frozen-none; n-mid admitted (2.3007 / 2.168; work pass) ships fr-frozen; n-upper inconclusive (work unknown; faster 1.7905 / 1.6836) ships fr-frozen-none; n-large inconclusive (work unknown; faster 1.5867 / 1.5415) ships fr-frozen-none; hell-1 failed (faster 0.9986 / 0.9959) ships fr-frozen-none; controls: 9 of 10 pass, 26x26-nightmare fails no regression (geometric mean 1.0006, lower bound 0.8864 < 0.9), 32x15-nightmare passes (1.054 / 0.9127); Master identity 16 of 16 pass; Hell 1 report: 26x26, 20x20, 24x24 candidates, 14x14 not (10 of 20 reach ten); `Phase 0: FAIL (control 26x26-nightmare: fail)`; resolve-comparators: 19 cells, fr-frozen-uncapped, fr-frozen-none-uncapped, V4-S4C allocation 586 min; `firewall: OK` |
| Commit | this task's commit |
| Issues and named items | the named risk of Q-S06 occurred: control 26x26-nightmare below the 0.9 no-regression bound, so phase 2 stops for a decision (plan §8.2); routed to the SAs before S07's owner question; G1, G2 empty |

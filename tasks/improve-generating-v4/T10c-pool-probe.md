# T10c: Pool probe: one rating's time at 1, 2, 4 and 8 concurrent workers (P8)

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P8 ("A probe in the frozen round (one rating's time at 1, 2, 4 and 8 concurrent workers) decides whether P8 is worth more work"), §5.1 stage 2 ("the P8 probe"); review RV1-05, RV1-16, RV1-17 (R17), RV2-01, RV2-04 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T10b |
| Depends on | T10b (T10a's corpus; T10b's process items are not used) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 4 min allocated (guard 300 s) |

## Goal

P8 is parked because one rating took 9 to 28 % longer at eight workers than at four (R23). This task builds the
probe that measures that contention directly, on the frozen source and the same ratings at every width, with workers
that the parent starts together, bounds, cuts and always terminates, and runs it once with one round so that stage 2
can price its full run.

## Authority and fixed points

- Plan §3 P8: the default width stays four; every gate is read at four workers; the probe only decides whether P8
  is worth more work; it measures time and judges nothing.
- R17: `width-probe.mjs run` accepts `--cases` (default `26x26-nightmare`) and `--rounds` (default 3); an item is
  `(caseId, width)` for the widths 1, 2, 4, 8; the width workers speak `{ type: 'ready' }`, `{ type: 'go' }`, `{ type:
  'result', ms }` and `{ type: 'error', message }`, with `workerData` `{ treeRoot, items, rounds }`; the parent handles
  an error or an early exit and its cut, and terminates and awaits every worker in `finally`; the child closes its port
  after its one terminal message; a partial width is `censored`, never a pass.
- R05: the item log, identity and resume rules of `lib/items.mjs`; an item is admitted when `elapsedS() + 120 <=
  horizonS - 15` (the reserve of a width item; `--rounds` above 3 exits 1 with `width-probe: --rounds above 3 needs a
  new reserve`) and cut at `horizonS - 15`.
- The probe rates with the `base` tree (the frozen source unchanged).

## Scope

- Create: `tools/ig-proto/width-probe.mjs`; `tools/ig-proto/lib/width-worker.mjs`; `tools/ig-proto/lib/width-worker-test.mjs`
  (step 6); `tools/ig-proto/plans/V4-T10c.json`.
- Change: `tools/ig-proto/kernel-probe.mjs` (export `kernelCorpus(engine, caseIds)`, step 1),
  `tools/ig-proto/lib/items.mjs` (export `runCustomItems`, step 2), `tools/ig-proto/self-test.mjs` (three `--items`
  cases), `tools/ig-proto/README.md` (a paragraph).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T10c --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib/lanes.mjs tools/ig-proto/lib/lane-worker.mjs`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T10c --label frozen`.
1. **`kernelCorpus(engine, caseIds)`** in `kernel-probe.mjs`: T10a's corpus as plain data, `{ caseId, boardRows,
   pieces, clues, idx }[]` (so that it can be posted to a worker); the `v4-kernel` items keep computing their own
   subset as T10a wrote them.
2. **`runCustomItems(o, dispatch)`** in `lib/items.mjs`: `runProcessItems`'s rules (T10b steps 1.1 to 1.3 and 1.5)
   with the dispatch given by the caller: `logStart` is written before `dispatch(item, { cutAtS })` is called (RV2-04),
   which returns a promise of `{ status: 'completed' | 'censored' | 'error', result }` and must settle by `cutAtS`
   (seconds from the process start) plus 5 s; the runner writes exactly one `logEnd` per item (a rejected promise ends
   it `error` with the message); every line goes through T04a's line helpers with the run's `identityHash` (RV2-01);
   the runner admits an item when `elapsedS() + o.reserveS <= horizonS - 15` and passes `cutAtS = horizonS - 15`.
   Items without `outDir` skip T10b's output-folder rule.
3. **`lib/width-worker.mjs`** (a `node:worker_threads` worker): from `workerData` `{ treeRoot, items, rounds }` it
   loads the engine with `loadEngine(treeRoot)`, creates its own main workspace, posts `{ type: 'ready' }`, waits for
   `{ type: 'go' }`, rates every item `rounds` times in order (`boardFromRows` once per item; `e.difficulty.rate`; an
   `IncompleteRatingError` counts as a rating), timing each with `performance.now()`, posts `{ type: 'result', ms }`
   (or `{ type: 'error', message }` on an exception) and closes its port.
4. **`width-probe.mjs`** (`// @ts-check`): `node tools\ig-proto\width-probe.mjs run --task <T> --label frozen
   --source-label <SL> [--cases <ids>] [--rounds <n>] [--horizon-s <H>]` and `node tools\ig-proto\width-probe.mjs
   report --task <T> --label frozen --source-label <SL>`. `--cases` uses `parseCases` of `kernel-probe.mjs` with the
   default `26x26-nightmare`; `--rounds` an integer from 1 to 3 (default 3). Items, in order: for each case, the
   widths 1, 2, 4, 8, id `run:base:<caseId>:<width>:<rounds>`, kind `width`, variant `base`, payload `{ caseId, width,
   rounds }` (no invocation value: the cut is the execution envelope, R2-03). The dispatch is the export `widthDispatch({ workerFile,
   workerData, width, cutAtS })` (`run` passes `lib/width-worker.mjs`; the self-test passes its scripted file). The
   dispatch of a width `w`: `w` workers with
   `workerData` `{ treeRoot: <base root>, items: kernelCorpus(e, [caseId]), rounds }`; wait for every `ready`, send `go`
   to all, collect every `result`; an `error` message, an early `exit` or the cut (`cutAtS`) terminates every worker
   and ends the item `error` (the first two) or `censored` (the cut); a `finally` terminates and awaits every worker.
   The completed result: `{ caseId, width: w, rounds, expected: rounds * items * w, observed: <the ratings timed>,
   medianMs, p90Ms, ms }` (`p90Ms` the value at index `Math.ceil(0.9 * n) - 1` of the ascending list). `report`
   (unlocked) writes `evidence/frozen/<task>/width.json` and `width.md`: per case and width the median, the p90,
   `expected` and `observed`, and `slowdown = medianMs(w) / medianMs(1)`; the machine (`os.cpus().length`, the first
   CPU's `model`, `os.totalmem()`); the line "Context: R23 measured one rating 9 to 28 % longer at eight workers than at
   four. The probe decides whether P8 is worth more work (plan P8); every gate stays at four workers."; and `width:
   complete` or `width: incomplete (<items>)`.
5. **Plan** `plans/V4-T10c.json`: `"allocationMinutes": 4`, `"optionalMinutes": 0`; steps `firewall-snapshot`
   (unlocked), `trees` (`tools\ig-proto\lib\tree.mjs build base`, unlocked), `run` (locked, `repeatUntilDone` true,
   `projectS` 120, `minHorizonS` 150, `invocations` 1, node `tools\ig-proto\width-probe.mjs run --task V4-T10c
   --rounds 1`, state `V4-T10c\run\state.json`), `report` (unlocked, `tools\ig-proto\width-probe.mjs report --task
   V4-T10c`), `firewall-check` (unlocked). Forecast 120 + 45 = 165 s within 240 s. One round prices stage 2's run of
   three rounds and two cases (T11c's plan `V4-S2`).
6. **Self-test** cases (Tests table), with a scripted worker file `tools/ig-proto/lib/width-worker-test.mjs` (created
   by this task; it answers `ready`, then on `go` posts `result`, `error` or nothing, as `workerData.script` says) and
   `label: 'selftest'`; they run unlocked (no rating).
7. **README.md**: a paragraph "Pool probe (V4-T10c)".
8. Run, after the unlocked checks pass, in one PowerShell session at the root:

   ```powershell
   $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10c.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T10c run-task exited ' + $LASTEXITCODE) }
   ```

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --items` | `width: barrier and result` | the width dispatch with the scripted worker file, width 4, script `result` | all four `ready` before one `go`; the item `completed`; every worker exited after the call |
| same | `width: error and early exit` | width 2, one worker scripted `error`; then width 2, one worker scripted to exit before `ready` | both items end `error`; every worker exited |
| same | `width: cut` | width 2, script `nothing` (no terminal message), `horizonS = elapsedS() + 17` | the item ends `censored` within 10 s; every worker exited |
| run of step 8 | the width report | `26x26-nightmare`, widths 1, 2, 4, 8, one round | `width: complete`; `expected` and `observed` 6, 12, 24, 48; `slowdown` of width 1 equal to 1 |

The probe's numbers are measurements: no value of `slowdown` is a failure.

## Documentation

`tools/ig-proto/README.md` (step 7).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T10c` | root | every `--items` case passes | 3 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T10c.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes <approved> -DryRun` | root | the locked step `go`; forecast 165 s, allocation 240 s, guard 300 s | 1 min |
| step 8 | root | `width: complete`; `Plan V4-T10c finished: task counted <= 300 s` | each invocation at most 285 s |
| `node tools\ig-proto\firewall.mjs check --task V4-T10c --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: running more widths, cases or rounds than step 5 says (the machine is shared; Sudoku's
  difficulty-v3 keeps priority); step 8 if the dry run says `stop`.
- Stop and report after: `width: incomplete`.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10c-B01 | The P8 question has a direct, repeatable measurement on the frozen source | `width.md` | `evidence/frozen/V4-T10c/width.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10c-T01 | The same ratings at every width, started together; workers always terminated | the three cases; review of the `go` barrier | self-test output; diff |
| T10c-T02 | Nothing else changed; formats | guards; `npm run check` | command output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-17 18:22:50 +07:00 (dispatch, base `2712614`) to 18:57:09 +07:00 (acceptance): 34 min 19 s; the developer's own times 18:22:48-18:42:39 (my locked `--v4` re-run waited about 12 min behind Sudoku) |
| Waiting for rulings | about 2 min (SA-Opus's review, 18:44-18:46; no QUESTION) |
| Agent id, model | `7e66cfe6-a675-4fb8-ad92-5f243a32facb`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 95 calls; 24,021,229 input, 135,879 output, 23,646,765 cache-read |
| AI credits | 465.95 |
| Questions and rulings | none from the developer. SA-Opus ruled "accept T10c": the refactor of `runProcessItems`' shared start (`beginRun`, `refusal`, `checkOutDir`) keeps behaviour, proved by T10b's cases; the extra locked `--v4` case with real workers is allowed locked verification; settling by `cutAtS` + 5 s is the dispatch's job and a hung dispatch resumes `censored`, never a pass; one round with a cold first rating is enough to price stage 2's three-round run (T11c), where P8 is decided (N-V4-02); ruling row with the results, pack amendment `1512922` |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `--v4` through the lock helper (`V4-T10c verify`): 33 passed, 0 failed, `IG … exit=0 seconds=54.658` (`width: the real worker and the dispatch`); `--items`: 124 passed; `--frozen`: 10 passed; `check-edits --all`: 34 `ok`, no other line; firewall `check` (V4-T10c): 289 production files unchanged; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib/lanes.mjs tools/ig-proto/lib/lane-worker.mjs`: empty; V4-T10a and V4-T10b evidence unchanged; stage-1 `evidence-check`: unchanged (20 files); `check-binding`: pass; `npm run check`: OK. The plan (the developer's run, `-ApprovedRoundMinutes 92`): dry run `go`; `width: complete` on 26x26-nightmare, one round, expected = observed 6, 12, 24, 48; medians 557.4, 587.1, 654.6 and 853.5 ms (slowdown 1, 1.0532, 1.1744, 1.5312); wall 62.81 s, node 16.059 s, lock wait 46.751 s, counted 61.059 s; round 2,852.851 s before, 2,913.910 s after (2,969.31 s with the 55.4 s register row), of 5,520 s |
| Commit | this task's commit, `improve-generating T10c: Pool probe: one rating's time at 1, 2, 4 and 8 concurrent workers` |
| Issues and named items | none new; width 8 is 1.30 times width 4 (R23 had 1.09 to 1.28); P8 is decided in stage 2's three-round run (N-V4-02) |

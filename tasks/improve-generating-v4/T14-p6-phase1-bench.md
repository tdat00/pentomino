# T14: Phase-1 bench of P6: the generation time of the old and the new version, the memory checks and the chart

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P6 ("Measured on today's search: T10 x1.32 on 26x26 Nightmare and x1.12 to 1.18 on Master"), §4 (T10 in Node at four workers), §6 phase 1 (gate: "gates read at four workers; both memory checks"); decisions OD-P2, D-V4-07; named item N-V4-12, which this task closes; the owner's decision of 2026-11-18 about 11:57 (`measure=a`, check-list §5) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit the orchestrator names at dispatch: `<C>`, the commit under test |
| Depends on | T12 and T13 (accepted); the owner's separate allowance of 45 counted minutes (check-list §1); the two worktrees the orchestrator prepares (step 0) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3.5 h; machine about 35 counted minutes projected, within the owner's separate allowance of 45 counted minutes (not the frozen round's cap) |

## Goal

The owner asked for a pull request that states the puzzle generation time of the old version (`main`, `3fc65f4`) and
the new one (this branch, whose only production change is P6, T12). This task measures both in one session on this
machine with the production bench at four workers, proves that the new version makes the same puzzles, reads both
memory checks of plan §6's phase-1 gate (which closes N-V4-12), and publishes `compare.json`, `compare.md` and a chart
for the pull request.

## Authority and fixed points

- The owner's decision (2026-11-18, about 11:57 +07:00, `measure=a`, check-list §5): SA-Opus's design, seven cells
  times five seeds, about 34 counted minutes; **45 counted minutes approved as a separate allowance**, not drawn from
  the frozen round's cumulative cap of 749 (D-V4-02 stays the frozen round's); then the pull request, not merged, with
  a chart in place of screenshots.
- What differs: between `3fc65f4` and `<C>` only `core/engine/clues.js`, `core/engine/difficulty.js` and
  `core/engine/types.js` differ in the production and bench code (step 2 checks it). P6 changes no puzzle (plan §3
  P6, OD-P2), so the two runs of one seed are equal, or prefix-equal when one side stopped earlier on the request's own
  wall-clock limits, and never different.
- The bench: `tools/calibrate.mjs` with the shared `tools/bench/` runner and the production generation client, as
  MP12b1 ran it: `--profile landscape` (seeds `landscape/<case>/<rep>`), four workers, cold, one fresh process per row
  (so `peakProcessBytes` is the whole-process peak, workers included), Node `--max-old-space-size=2048`. Its results
  are **Node screening evidence**, never a browser qualification (D39), and every output says so.
- The two memory checks of the phase-1 gate are the bench's own (`tools/bench/report.js`, `evaluateCell`):
  `peak-process-memory` (the whole process at most `CRITERIA.processBytes`, 1.5 GiB) and `byte-accounting` (the
  accounted peak at most `workerCount x WORKER_LIMIT_BYTES + MAIN_BUDGET_BYTES`, 1,196 MiB at four workers), with
  `model-too-large` 0.
- The lock (check-list §3.2): every bench invocation runs through `tools\ig-proto\lock\ig-lock.ps1`'s
  `Invoke-IgNode -Repo pentomino` with `-LimitSeconds` at most 900, one locked invocation at a time on this machine,
  Sudoku's difficulty-v3 first. The quiet period is 45 s: no idle declaration is in force, and `-IdleQuietSeconds 15`
  is passed only so that one, if the owner gives it, applies (§3.2). The bench is not a run plan: `run-task.ps1` does
  not run it, and this task's ledger (steps 3 and 4) applies the runner's rule instead: counted = node seconds +
  min(lock wait, 45).
- Record-once (§3.3): a report, a checkpoint and the ledger are written once and extended only by a resume of the same
  command; a checkpoint is never discarded (`--restart`) and no file is edited by hand.

## Scope

- Create: `tools/ig-proto/phase1/p6-bench.mjs` (step 3), `tools/ig-proto/phase1/p6-bench.ps1` (step 4); evidence in
  `docs/improve-generating/evidence/phase1/P6-bench/` (step 6: the four reports, `ledger.jsonl`, `compare.json`,
  `compare.md`, `chart.svg`, `chart.html`; step 7: `chart.png`).
- Change: `tools/ig-proto/self-test.mjs` (cases appended to `--items`), `tools/ig-proto/README.md` (a new section).
- Raw files (git-ignored): `tests/artifacts/ig-proto/phase1/P6-bench/` (the bench's outputs and checkpoints, the live
  ledger).
- Do not change: everything else, the production code, the bench, the worktrees, the frozen-round plans and evidence.
  Guards: `node tools\ig-proto\firewall.mjs check --task V4-T14 --label frozen`, expected `files unchanged`; `git
  status --short -- core generator tests tools/bench tools/calibrate.mjs tools/node-worker.mjs tools/ig-proto/lib
  tools/ig-proto/data tools/ig-proto/plans tools/ig-proto/variants tools/ig-proto/lock docs/improve-generating/evidence/frozen`,
  expected no output; `git -C Q:\git\pentomino-t14-old status --short` and `git -C Q:\git\pentomino-t14-new status
  --short`, expected no output.

## Steps

0. **Prepared by the orchestrator before dispatch** (the developer checks them and never creates, moves or removes a
   worktree): two detached worktrees outside the repository,

   ```powershell
   git -C Q:\git\pentomino worktree add --detach Q:\git\pentomino-t14-old 3fc65f4681a53d3984d9218c15efbf696cc3a1a5
   git -C Q:\git\pentomino worktree add --detach Q:\git\pentomino-t14-new <C>
   ```

   `<C>` is the full commit under test, named in the dispatch prompt: the branch's HEAD at dispatch, whose production
   code is T12's. The new side is pinned to it, so the measured code does not depend on the main worktree, where this
   task writes its files. The orchestrator removes both worktrees after acceptance (`git worktree remove`).
1. `node tools\ig-proto\firewall.mjs snapshot --task V4-T14 --label frozen`.
2. **The sources** (read-only, unlocked); each must hold, else stop:
   - `git -C Q:\git\pentomino-t14-old rev-parse HEAD` prints `3fc65f4681a53d3984d9218c15efbf696cc3a1a5` and `git -C
     Q:\git\pentomino-t14-new rev-parse HEAD` prints `<C>`; `git -C <each> status --short` prints nothing;
   - `git diff --name-only 3fc65f4 <C> -- core generator tools/bench tools/calibrate.mjs tools/node-worker.mjs
     tools/record-fixtures.mjs package.json` prints exactly `core/engine/clues.js`, `core/engine/difficulty.js` and
     `core/engine/types.js`;
   - `node --version` is recorded in the final report (MP12b1 ran v26.13.0; both sides run the same Node).
3. **`tools/ig-proto/phase1/p6-bench.mjs`** (new; ESM, `// @ts-check`, JSDoc as in the harness; pure functions
   exported, the command line at the end; it imports `summarize`, `evaluateCell`, `returnedEveryArrangement` and
   `CRITERIA` from `tools/bench/report.js`, `WORKER_LIMIT_BYTES` and `MAIN_BUDGET_BYTES` from
   `core/browser/worker-pool.js`, `FROZEN_DIGEST` from `lib/paths.mjs`, and `sha256`, `writeJson`, `writeText` and
   `writeJsonl` from `lib/records.mjs`):
   - constants: `OLD_COMMIT` `3fc65f4681a53d3984d9218c15efbf696cc3a1a5`; `OLD_DIGEST` = `FROZEN_DIGEST`
     (`e181df2c...`); `GROUPS` `{ A: ['14x14-master', '26x26-master', '26x26-expert', '26x26-nightmare',
     '10x10-nightmare'], B: ['12x12-nightmare', '18x18-nightmare'] }`; `ORDER` `[['A', 'old'], ['A', 'new'], ['B',
     'new'], ['B', 'old']]`; `SEEDS` 5; `ALLOWANCE_S` 2700; `QUIET_MAX_S` 45; `LIMIT_MAX_S` 900; `LIMIT_MIN_S` 300;
     `RAW` `tests/artifacts/ig-proto/phase1/P6-bench`; `EVIDENCE` `docs/improve-generating/evidence/phase1/P6-bench`
     (both under the repository root);
   - `readLedger(text)`: one JSON object per line with the fields of step 4; any other non-empty line throws
     `p6-bench: ledger line <n> is unreadable`;
   - `nextLimit(rows)`: `spent` = the sum of the rows' `countedSeconds`; `limitS = Math.min(900, Math.floor(2700 -
     spent - 45))`; returns `{ spent, limitS, allowed: limitS >= 300 }`. An invocation counts at most its limit plus
     45 s, so it can never take the ledger above 2,700 s;
   - `pairRuns(oldRuns, newRuns)`: pairs the ordinary runs of the two sides by `caseId` and `rep`, reps 0 to 4, seed
     `landscape/<caseId>/<rep>` on both; a run without its pair, another seed or a duplicate throws `p6-bench: unpaired
     run <caseId> #<rep>`;
   - `identity(oldRun, newRun)`: `equal` when `details` deep-equal; `prefix` when the shorter `details.puzzles` is the
     start of the longer one, element by element, and, if both sides accepted a puzzle, `details.area`, `K`, `sizes`,
     `setAttempt` and `initialG` are equal (a side without an accepted puzzle is a prefix of any other); else `differ`
     with the first differing path (for example `details.puzzles[3].score`). `resultDigest(run)` is
     `sha256(JSON.stringify(run.details))`;
   - `cellStats(runs)`, from `summarize` (median: the mean of the two middle values for an even count; p95: the nearest
     rank, `ceil(0.95 n)`, which is the maximum at n 5): `n`; `tenOfN` (`acceptedCount >= 10` or
     `returnedEveryArrangement(run)`, out of n); T1 over every run; T10 over the runs that reached ten (conditional,
     with its own n); response; `accepted`, the distribution `{ <accepted count>: <runs> }`; `peakProcessMax` and
     `peakAccountedMax`; the statuses, values and limits of `evaluateCell(runs)`'s checks `peak-process-memory`,
     `byte-accounting` and `model-too-large`; `interrupted`, the count of interrupted runs;
   - `pairedRatios(pairs)`: per pair `old / new` of T1, of T10 and of `T10 - T1` (both sides reached ten) and of the
     response; per metric `{ n, median, min, max }`, and `median: null` below n 3;
   - `compareReports({ reports, ledger, newCommit })`: the checks of step 6, then per cell and per level (Master: the two
     Master cells; Expert: its cell; Nightmare: the four Nightmare cells; the pairs pooled) the statistics of each side,
     the ratios and the identity counts; the memory checks of both sides; the identities of every report
     (their `meta`: `sourceCommit`, `sourceDigest`, `versions`, `browserOrNode`, `platform`, `hardware` with `execArgv`,
     `workerCount`, `lifecycle`, `matrixDigest`, `startedAt`, `finishedAt`); the ledger (its rows, the counted total,
     the allowance). It reads no clock, so the same inputs give the same bytes;
   - `renderMarkdown(result)` and `renderChart(result)`, which returns `{ svg, html }` (step 6);
   - the command line: `node tools\ig-proto\phase1\p6-bench.mjs next-limit` prints `p6-bench: <spent> s counted of
     2700; next limit <limit> s` and exits 0, or prints `p6-bench: STOP (allowance): <spent> s counted of 2700; less
     than 300 s left for an invocation` and exits 4; `node tools\ig-proto\phase1\p6-bench.mjs compare --new-commit <C>`
     writes the files of step 6 and exits 0, or prints `p6-bench: <reason>` on stderr and exits 1 with nothing written.
4. **`tools/ig-proto/phase1/p6-bench.ps1`** (new) `-Group A|B -Side old|new -NewCommit <C> [-DryRun]`, run from the
   repository root:
   - checks the side's worktree (`Q:\git\pentomino-t14-old` or `Q:\git\pentomino-t14-new`): `rev-parse HEAD` equal
     to `3fc65f4681a53d3984d9218c15efbf696cc3a1a5` or `-NewCommit`, `status --short` empty; else it throws;
   - runs `node tools\ig-proto\phase1\p6-bench.mjs next-limit`: its exit 4 ends the script with exit 4, nothing run;
     its limit is the invocation's `-LimitSeconds`;
   - the node arguments: `@('--max-old-space-size=2048', '<worktree>\tools\calibrate.mjs', '--profile', 'landscape',
     '--workers', '4', '--seeds', '5', '--cases', '^(<the cells of the group, joined by |>)$', '--fresh-process',
     '--output', '<repository root>\tests\artifacts\ig-proto\phase1\P6-bench\<Side>\<Group>')`, absolute paths (the
     bench writes `<output>-<date>.json` and `.md`, and `<output>.checkpoint.jsonl`);
   - `-DryRun` prints the worktree check, the limit and the command line, and runs nothing;
   - else it dot-sources `tools\ig-proto\lock\ig-lock.ps1`, takes `$start = Get-Date`, runs `Invoke-IgNode -Repo
     pentomino -Task "V4-T14 $Group $Side" -NodeArgs $nodeArgs -LimitSeconds $limit -IdleQuietSeconds 15
     -InformationVariable helperInfo` inside `try`/`catch` and reads the helper exactly as `run-task.ps1` (lines 117 to
     137) does: `seconds=` and `quiet=` from its `IG` line; killed when the message matches `second limit reached`;
     the exit code from `$global:LASTEXITCODE` otherwise; then `$end = Get-Date`;
   - appends one line to the raw ledger `tests\artifacts\ig-proto\phase1\P6-bench\ledger.jsonl` (UTF-8 without BOM,
     `ConvertTo-Json -Compress`, LF) with the fields `task` (`V4-T14`), `group`, `side`, `commit`, `limitS`, `start`
     and `end` (ISO 8601 UTC), `wallSeconds`, `nodeSeconds` (the limit when killed, else the printed seconds, else 0),
     `lockWaitSeconds` (the wall time less the node seconds, at least 0), `quietS`, `countedSeconds` (node seconds +
     min(lock wait, 45)), `killed` and `exit`; then it prints `V4-T14 <group> <side>: exit <e>, counted <c> s; ledger
     <total> s of 2700`;
   - exits with the bench's exit code (0 when every row is recorded, 2 when incomplete), 3 when killed, 4 on the
     allowance stop.
5. **The runs** (locked), in this order, one at a time, each after a `-DryRun` of the same line (ABBA: drift between
   the groups cancels):

   ```powershell
   $c = '<C>'
   pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group A -Side old -NewCommit $c
   pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group A -Side new -NewCommit $c
   pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group B -Side new -NewCommit $c
   pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group B -Side old -NewCommit $c
   ```

   - Expected, from MP12b1's reps 0 to 4 of the same cells (an earlier source of the same algorithm): group A about
     440 s and group B about 570 s on the old side, a little less on the new one; about 2,090 counted seconds (34.8
     minutes) in all.
   - Each line must end with exit 0. **Resume rule:** after exit 2 or 3 the same line runs again, after its `-DryRun`
     (the bench resumes its checkpoint: its finished rows are kept and an unfinished row runs again); it is a new
     ledger line; a group and side are finished before the next line starts. Never `--restart`, never a deleted
     checkpoint, report or ledger line. A second exit 3 of the same group and side, an exit 1 or `calibrate: cannot
     resume`, and an exit 4 are stop points.
6. **`compare`** (unlocked, once the four lines ended with exit 0): `node tools\ig-proto\phase1\p6-bench.mjs compare
   --new-commit <C>`. It refuses the whole comparison, writing nothing, unless:
   - each side and group has exactly one report `<RAW>\<Side>\<Group>-<date>.json` with `format`
     `pentomino-bench-report`, `complete: true`, in its `meta` `kind` `node`, `profile` `landscape`, `workerCount` 4
     and `lifecycle` `cold`, and runs of exactly the group's cases, five reps each with the seeds
     `landscape/<caseId>/<rep>`;
   - the old reports' `meta.sourceCommit` is `3fc65f4681a53d3984d9218c15efbf696cc3a1a5` and `meta.sourceDigest` is
     `FROZEN_DIGEST`, the new ones' `meta.sourceCommit` is `<C>`, and all four have one `meta.browserOrNode`,
     `meta.platform` and `meta.hardware` (`cpu`, `logicalCores`, `totalMemoryBytes`, `node`, and `execArgv` with
     `--max-old-space-size=2048`);
   - every pair is `equal` or `prefix` (a `differ` is a stop point);
   - the raw ledger is readable, has at least one line per side and group, and totals at most 2,700 s;
   - every report's text is CRLF only and holds no drive-letter path.

   It then writes into `<EVIDENCE>`: the four reports and their `.md` copied byte for byte as
   `<Side>\<Group>-<date>.json` and `.md`; `ledger.jsonl` (`writeJsonl`, CRLF); `compare.json` (`writeJson`);
   `compare.md`; `chart.svg` and `chart.html` (`writeText`). An output that exists with other bytes is refused
   (`p6-bench: <file> exists with other bytes`); the same inputs rewrite the same bytes.
   - `compare.md`: a banner (the two commits and digests, Node and its flags, the machine, the dates of the four
     reports, and "Node screening evidence at four workers, cold, one fresh process per request; not a browser
     qualification (D39)"); per cell a table of the old and the new side: n, ten of n, T1 median and p95, T10 median
     and p95 (conditional, with n), response median, p95 and max, the accepted distribution, the process and accounted
     peaks; then the paired ratios old/new (median [min-max] n) of T1, T10, T10 - T1 and the response; per level the
     pooled ratios; the identity (`<k> pairs equal, <p> prefix-equal, 0 different`, then each pair's two result digests
     in a `<details>` table); the two memory checks and `model-too-large` of each side; the ledger (invocations,
     counted seconds, the allowance); and the reading "with n 5 the nearest-rank p95 is the maximum".
   - `chart.svg` and `chart.html`: one horizontal row per cell in the order of `GROUPS`, two bars each, old
     (`#9e9e9e`) and new (`#1f77b4`), whose length is the median response time on a log10 axis from 1 to 200 s (ticks
     1, 2, 5, 10, 20, 50, 100 and 200 s); the two medians at the ends of the bars and the paired response ratio
     `xR.RR [min-max] n 5` at the right; the title "Puzzle generation time per request (median response, five seeds
     per cell): main 3fc65f4 against <the first 7 characters of C> (P6)"; a subtitle with Node, four workers, cold, the
     CPU and the date; the footer "Node screening evidence, not a browser qualification. The same puzzles on both
     sides: <k> of 35 pairs equal, <p> prefix-equal."; 1200 x 720 pixels, the system sans-serif font, no external
     resource (`chart.html` holds the SVG inline, with `margin: 0`).
7. **The chart image** (unlocked, a few seconds, after step 6):

   ```powershell
   $ev = (Resolve-Path 'docs\improve-generating\evidence\phase1\P6-bench').Path
   $profileDir = Join-Path (Resolve-Path 'tests\artifacts').Path 'ig-proto\selftest\t14-edge'
   $url = 'file:///' + ($ev -replace '\\', '/') + '/chart.html'
   Start-Process -Wait -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', "--user-data-dir=$profileDir", '--window-size=1200,720', "--screenshot=$ev\chart.png", $url)
   Remove-Item -Recurse -Force $profileDir
   ```

   `chart.png` must exist, be larger than 10 KB, and show the seven rows with both bars and their labels (view it).
   The scratch profile keeps the user's Edge profile untouched.
8. **Self-test** cases appended to `--items` (Tests table); **README.md**: a new section "Phase-1 bench of P6
   (V4-T14)": the purpose, the two scripts, the order and the resume rule, the ledger, the outputs, and the statement
   that the results are Node screening evidence.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic run records (`newRunRecord` of `tools/bench/report.js`)
and temporary files under `tests/artifacts/ig-proto/selftest/p6/`, deleted at the end of each case; no bench runs.

| Case name | Input | Expected |
|---|---|---|
| `p6: pairs and identity` | old and new runs of two cells: equal `details`; the new side with ten puzzles and the old with the first seven of them; a changed `score` in the fourth puzzle; a run without its pair | `equal`; `prefix`; `differ` with `details.puzzles[3].score`; throws `p6-bench: unpaired run <caseId> #<rep>` |
| `p6: statistics and ratios` | five and twenty synthetic runs; pairs with and without ten on both sides | the p95 of five values is their maximum and of 1 to 20 is 19; T10 only over the runs with ten, with its n; the ratios old/new with median, min, max and n, and `median: null` below n 3 |
| `p6: the memory checks` | at four workers, accounted peaks of 1,196 MiB and of 1,196 MiB + 1 byte; process peaks of 1.5 GiB and of 1.5 GiB + 1 byte; a run without a process peak | `pass` and `fail`; `pass` and `fail`; `not-measured` |
| `p6: the ledger and the next limit` | ledgers of 0, 1,800 and 2,400 counted seconds; a ledger with an unreadable line | limits 900 and 855, then `allowed: false` (255 s); throws `p6-bench: ledger line <n> is unreadable` |
| `p6: inputs are refused` | an incomplete report; `workerCount` 2; an old report whose digest is not `FROZEN_DIGEST`; a new report of another commit; two reports for one side and group; a report with a drive-letter path | each refused with its reason, nothing written |
| `p6: the chart` | the result of seven synthetic cells | the SVG has seven rows with two bars each, the ratio texts and the footer; `chart.html` embeds it; the same input gives the same bytes |

## Documentation

`tools/ig-proto/README.md` (step 8). The pull request's text is the orchestrator's, from `compare.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T14` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T14` | root | 10 passed | 1 min |
| the four lines of step 5, each after its `-DryRun` | root | exit 0 each; the ledger at most 2,700 s | each at most its limit, 900 s, plus the lock wait |
| `node tools\ig-proto\phase1\p6-bench.mjs compare --new-commit <C>` | root | exit 0; the files of step 6 | 1 min |
| step 7 | root | `chart.png`, larger than 10 KB | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T14 --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |
| the guards of the Scope | root | no output | 1 min |

## Stop points and questions

- Stop and report before: an invocation that the ledger refuses (exit 4: the orchestrator asks the owner); a pair that
  differs (P6 must change no puzzle: report the cell, the seed and the first differing path); a memory check that fails
  on either side; a second exit 3 of one group and side; an exit 1 or `calibrate: cannot resume`; a source check of
  step 2 that fails; anything that would write into a worktree, a production file or the frozen-round evidence.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T14-B01 | The pull request can state the generation time of the old (`3fc65f4`) and the new (`<C>`) version per cell and per level, measured in one session on one machine at four workers: medians, nearest-rank p95, maxima and paired ratios | `compare.md`, `compare.json` | evidence files |
| T14-B02 | The new version makes the same puzzles | every pair `equal` or `prefix`, none `differ` | `compare.md` |
| T14-B03 | Phase 1's gate is read at four workers: both memory checks pass on both sides and `model-too-large` is 0 (N-V4-12 closed) | `compare.md` | evidence files |
| T14-B04 | The machine time stays within the owner's separate allowance of 45 counted minutes, and a chart is ready for the pull request | `ledger.jsonl`; `chart.png` | evidence files |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T14-T01 | The sources are pinned and verified: two clean worktrees at `3fc65f4` and `<C>`, the old digest equal to the frozen source's, the bench code identical, only P6's three files different | step 2; the reports' `meta` | command output |
| T14-T02 | Every bench invocation ran through the lock helper with its limit from the ledger, and every attempt is a ledger line; no silent re-run | `ledger.jsonl`; the helper's `IG` lines | command output |
| T14-T03 | The comparison refuses inconsistent inputs, and its pairing, statistics, memory checks, ledger rule and chart are tested | the six cases | self-test output |
| T14-T04 | Nothing else changed; formats | the guards; the firewall; `npm run check` | command output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; the ledger (each invocation's limit, node
seconds, lock wait, quiet and counted seconds, and the total against 2,700); the per-cell and per-level results of
`compare.md` (old and new medians, p95 and paired ratios), the identity counts and the memory checks; each AC row with
its evidence; the questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |

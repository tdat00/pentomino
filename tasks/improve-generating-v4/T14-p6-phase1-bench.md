# T14: Phase-1 bench of P6: the generation time of the old and the new version, the memory checks and the chart

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P6 ("Measured on today's search: T10 x1.32 on 26x26 Nightmare and x1.12 to 1.18 on Master"), §4 (T10 in Node at four workers), §6 phase 1 (gate: "gates read at four workers; both memory checks"); decisions OD-P2, D-V4-07; named item N-V4-12, which this task closes; the owner's decision of 2026-11-18 about 11:57 (`measure=a`, check-list §5); SA-Astra's review of 2026-11-18 12:18 to 12:38 (check-list §5) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit the orchestrator names at dispatch: `<C>`, the commit under test |
| Depends on | T12 and T13 (accepted); the owner's separate allowance of 45 counted minutes (check-list §1); the two worktrees the orchestrator prepares (step 0) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 4.5 h; machine about 37 counted minutes projected, within the owner's separate allowance of 45 counted minutes (not the frozen round's cap) |

## Goal

The owner asked for a pull request that states the puzzle generation time of the old version (`main`, `3fc65f4`) and
the new one (this branch, whose only production change is P6, T12). This task measures both in one session on this
machine with the production bench at four workers, checks observed puzzle identity to the strength supported by the
production reports, reads both memory checks of plan §6's phase-1 gate (which closes N-V4-12), and publishes
`compare.json`, `compare.md` and a chart for the pull request.

## Authority and fixed points

- The owner's decision (2026-11-18, about 11:57 +07:00, `measure=a`, check-list §5): SA-Opus's design, seven cells
  times five seeds; **45 counted minutes approved as a separate allowance**, not drawn from the frozen round's
  cumulative cap of 749 (D-V4-02 stays the frozen round's); then the pull request, not merged, with a chart in place
  of screenshots.
- What differs: between `3fc65f4` and `<C>` only `core/engine/clues.js`, `core/engine/difficulty.js` and
  `core/engine/types.js` differ in the production and bench code (step 2 checks it). P6 changes no puzzle (plan §3
  P6, OD-P2); T12's parity tests and the unchanged fixtures are the compatibility evidence. A bench run records the
  production identity of its result in `details.resultDigest` (`tools/bench/runner.js`: the SHA-256 of the ordered
  layout keys, clue keys and scores) and per puzzle only a summary (`details.puzzles`): equal digests at equal
  accepted counts establish equal output; matching summaries at unequal counts are metric-prefix agreement only, not
  puzzle-prefix identity.
- The bench: `tools/calibrate.mjs` with the shared `tools/bench/` runner and the production generation client, as
  MP12b1 ran it: `--profile landscape` (seeds `landscape/<case>/<rep>`), four workers, cold, one fresh process per row
  (so `peakProcessBytes` is the whole-process peak, workers included), Node `--max-old-space-size=2048`. The landscape
  profile's diagnostic sampling runs after the timed T1, T10 and response interval of a row, but it takes invocation
  time and counts in the whole-process peak. The results are **Node screening evidence**: five requests per cell give
  descriptive results, never a browser qualification (D39), and every output says so.
- The two memory checks of the phase-1 gate are the bench's own (`tools/bench/report.js`, `evaluateCell`):
  `peak-process-memory` (the whole process at most `CRITERIA.processBytes`, 1.5 GiB) and `byte-accounting` (the
  accounted peak at most `workerCount x WORKER_LIMIT_BYTES + MAIN_BUDGET_BYTES`, 1,196 MiB at four workers); each must
  be `pass`, and `model-too-large` 0.
- The lock (check-list §3.2): every bench invocation runs through `tools\ig-proto\lock\ig-lock.ps1`'s
  `Invoke-IgNode -Repo pentomino` with `-LimitSeconds` at most 900, one locked invocation at a time on this machine,
  Sudoku's difficulty-v3 first. The quiet period is 45 s: no idle declaration is in force, and `-IdleQuietSeconds 15`
  is passed only so that one, if the owner gives it, applies (§3.2). The bench is not a run plan: `run-task.ps1` does
  not run it, and this task's ledger (steps 3 and 4) applies the runner's rule instead: counted = node seconds +
  min(lock wait, 45), with a reservation written before each invocation.
- Record-once (§3.3): a report, a checkpoint, the ledger and a reservation are written once and extended only by a
  resume; a checkpoint is never discarded (`--restart`), no evidence is deleted, and no file is edited by hand.

## Scope

- Create: `tools/ig-proto/phase1/p6-bench.mjs` (step 3), `tools/ig-proto/phase1/p6-bench.ps1` (step 4); evidence in
  `docs/improve-generating/evidence/phase1/P6-bench/` (step 6: the four terminal reports and their `.md`,
  `ledger.jsonl`, `compare.json`, `compare.md`, `chart.svg`, `chart.html`; step 7: `chart.png`).
- Change: `tools/ig-proto/self-test.mjs` (cases appended to `--items`), `tools/ig-proto/README.md` (a new section).
- Raw files (git-ignored), `tests/artifacts/ig-proto/phase1/P6-bench/` (`<RAW>`): the bench's outputs and checkpoints
  under `<Side>\`, the live ledger `ledger.jsonl`, and the reservation `pending.json` while an invocation runs.
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
   exported, the command line at the end). It imports `summarize`, `evaluateCell`, `returnedEveryArrangement`,
   `validateRunRecord` and `CRITERIA` from `tools/bench/report.js`, `WORKER_LIMIT_BYTES` and `MAIN_BUDGET_BYTES` from
   `core/browser/worker-pool.js`, `FROZEN_DIGEST` from `lib/paths.mjs`, and `sha256`, `writeJson`, `writeText` and
   `writeJsonl` from `lib/records.mjs`.
   - Constants: `OLD_COMMIT` `3fc65f4681a53d3984d9218c15efbf696cc3a1a5`; `OLD_DIGEST` = `FROZEN_DIGEST`
     (`e181df2c...`); `GROUPS` `{ A: ['14x14-master', '26x26-master', '26x26-expert', '26x26-nightmare',
     '10x10-nightmare'], B: ['12x12-nightmare', '18x18-nightmare'] }`; `ORDER` `[['A', 'old'], ['A', 'new'], ['B',
     'new'], ['B', 'old']]`; `SEEDS` 5; `ALLOWANCE_S` 2700; `QUIET_MAX_S` 45; `LIMIT_MAX_S` 900; `LIMIT_MIN_S` 300;
     `RAW` `tests/artifacts/ig-proto/phase1/P6-bench`; `EVIDENCE` `docs/improve-generating/evidence/phase1/P6-bench`
     (both under the repository root); `SAMPLING_FIELDS` `['sampleFailures', 'sampleUnrateable']` (the landscape
     sampling's fields of `details`, never part of an identity).
   - `readLedger(text)`: every non-empty line is a JSON object with exactly the fields of step 4, `group` and `side` of
     `GROUPS` and `old`/`new`, `commit` 40 hexadecimal characters, `limitS`, `wallSeconds`, `nodeSeconds`,
     `lockWaitSeconds` and `countedSeconds` finite and not negative, `quietS` an integer or `null`, `killed` a boolean,
     `exit` an integer or `null`, `report` and `reportSha256` strings or `null`; any other line throws `p6-bench: ledger
     line <n> is unreadable`.
   - `nextLimit(rows)`: `spent` = the sum of the rows' `countedSeconds`; `limitS = Math.min(900, Math.floor(2700 -
     spent - 45))`; `allowed` when `limitS >= 300`. An invocation is charged at most its limit plus 45 s, so the ledger
     can never pass 2,700 s.
   - `checkCheckpoint(text, { group, side, commit })` (before a resume; `commit` is the side's expected commit,
     `OLD_COMMIT` or the new commit, passed explicitly): the header line parses with `format`
     `pentomino-bench-checkpoint`, `kind` `node`, `workers` 4, `lifecycle` `cold` and `freshProcess` true; every
     further line parses as `{ kind: 'run', run }` with `validateRunRecord(run)` empty, `probeKind` `generation`, a case
     of the group, a rep from 0 to 4, the seed `landscape/<caseId>/<rep>`, `sourceCommit` the side's commit,
     `sourceDigest` and `versions` equal to the header's, and no duplicate case and rep; an unreadable or truncated
     line, a duplicate or another identity throws `p6-bench: checkpoint <side>/<group> line <n>: <reason>`. The bench's
     own reader skips such lines silently; this check does not allow that.
   - `preflight({ rows, pending, group, side, checkpoint, resumeInstructed, newCommit, completedReport = null })`, the
     decision before an invocation, in this order: a reservation exists: `stop` 5 (`an invocation is not reconciled:
     pending.json`); a ledger line names another commit than `OLD_COMMIT` for side `old` or `newCommit` for side `new`:
     `stop` 8 (`ledger source does not match this comparison`); the group and side has a ledger line with `exit` 0:
     exactly one such line is required, and `completedReport` (`{ path, sha256, report }`, which the command line
     computes from the existing file's raw bytes and parsed JSON, or `null` when the file is absent) must have that
     line's path and SHA-256 and pass `validateReport(report, { side, group, newCommit })`: then `complete` (its line
     and report), else `stop` 8, and the helper never runs; its last line has `exit` 2 and `resumeInstructed` is false:
     `stop` 9 (`<group> <side> ended incomplete (exit 2); a resume needs the pack author's instruction`); it has two
     lines with `killed`: `stop` 6 (`a second timeout of <group> <side>`); a checkpoint exists and
     `checkCheckpoint(checkpoint, { group, side, commit: <OLD_COMMIT or newCommit> })` throws: `stop` 8; `nextLimit`
     not allowed: `stop` 4 (`<spent> s counted of 2700; less than 300 s left for an invocation`); else `run` with
     `limitS`.
   - `pairRuns(oldRuns, newRuns)`: pairs the runs of the two sides by `caseId` and `rep`, reps 0 to 4, seed
     `landscape/<caseId>/<rep>` on both; a run without its pair, another seed or a duplicate throws `p6-bench: unpaired
     run <caseId> #<rep>`.
   - `identity(oldRun, newRun)`, on `details` without `SAMPLING_FIELDS`: when both sides accepted at least one puzzle,
     a differing set summary (`area`, `K`, `sizes`, `setAttempt`, `initialG`) or a differing common puzzle summary is
     `differ` with its first differing path (for example `details.puzzles[3].score`); at equal positive accepted counts
     both production `details.resultDigest` values are required: unequal digests are `differ` even when every summary
     agrees, matching digests and summaries are `equal`; at unequal positive counts matching common summaries are
     `metric-prefix-only` ("puzzle-prefix identity not established"); a side without an accepted puzzle makes the pair
     `no-puzzle-evidence`; a missing required summary or digest is `incomplete`. Only `equal` is an identity pass.
     `resultDigest(run)` returns `run.details.resultDigest`.
   - `cellStats(runs)`, from `summarize` (median: the mean of the two middle values for an even count; p95: the nearest
     rank, `ceil(0.95 n)`, the maximum of the sample at n 5): `n`; `tenOfN`, the runs with `acceptedCount >= 10`, out of
     n; `tenOrProvenAllOfN`, the runs with ten or `returnedEveryArrangement(run)`, out of n, never labelled "ten"; T1
     over the runs with a finite positive `firstReadyMs`; T10 over the runs with ten and a finite positive
     `tenthReadyMs` (conditional, its n beside); the response over the runs with a finite positive `responseMs`;
     `accepted`, the distribution `{ <accepted count>: <runs> }`; `peakProcessMax` and `peakAccountedMax`; the
     statuses, values and limits of `evaluateCell(runs)`'s checks `peak-process-memory`, `byte-accounting` and
     `model-too-large`; `samplingErrors`, the count of the errors of phase `sampling` (post-timing diagnostics).
   - `pairedRatios(pairs)`: per pair `old / new` of T1, of T10 and of `T10 - T1` (both sides reached ten) and of the
     response, only where both endpoints are finite and positive; per metric `{ n, median, min, max, excluded }`, and
     `median: null` below n 3.
   - `validateReport(report, { side, group, newCommit })` and `compareReports({ reports, ledger, pending, newCommit })`:
     the checks of step 6, then per cell and per level (Master: the two Master cells; Expert: its cell; Nightmare: the
     four Nightmare cells; the pairs pooled) the statistics of each side, the ratios, the identity categories, the
     memory checks of both sides, the identities of every report (its `meta`: `sourceCommit`, `sourceDigest`,
     `versions`, `browserOrNode`, `platform`, `hardware` with `execArgv`, `workerCount`, `lifecycle`, `matrixDigest`,
     `startedAt`, `finishedAt`), and the ledger (its lines, the counted total, the allowance). It reads no clock, so the
     same inputs give the same bytes.
   - `renderMarkdown(result)` and `renderChart(result)`, which returns `{ svg, html }` (step 6).
   - The command line: `node tools\ig-proto\phase1\p6-bench.mjs preflight --group <G> --side <S> --new-commit <C>
     [--resume-instructed]` reads the raw ledger, `pending.json`, the group's checkpoint and, for a successful ledger
     line, its terminal report (the SHA-256 of its raw bytes and its parsed JSON), calls `preflight`, prints the
     decision and exits 0 for `run` (`p6-bench: run <G> <S> with a limit of <limit> s; <spent> s counted of 2700`), 7
     for `complete` (`p6-bench: <G> <S> is complete (ledger line <n>, <report>); nothing to run`) and the stop's code
     for `stop` (`p6-bench: STOP (<kind>): <reason>`), 1 for a usage error; `node tools\ig-proto\phase1\p6-bench.mjs
     compare --new-commit <C>` writes the files of step 6 and exits 0, or prints `p6-bench: <reason>` on stderr and
     exits 1 with nothing written.
4. **`tools/ig-proto/phase1/p6-bench.ps1`** (new) `-Group A|B -Side old|new -NewCommit <C> [-ResumeInstructed]
   [-DryRun]`, run from the repository root:
   - checks the side's worktree (`Q:\git\pentomino-t14-old` or `Q:\git\pentomino-t14-new`): `rev-parse HEAD` equal
     to `3fc65f4681a53d3984d9218c15efbf696cc3a1a5` or `-NewCommit`, `status --short` empty; else exit 1;
   - runs `preflight` (with `--resume-instructed` when `-ResumeInstructed` is given): exit 7 prints the line and ends
     the script with exit 0 (a completed group runs no helper invocation and rewrites no report); any other non-zero
     exit ends the script with that exit; exit 0 gives the invocation's `-LimitSeconds`;
   - the node arguments: `@('--max-old-space-size=2048', '<worktree>\tools\calibrate.mjs', '--profile', 'landscape',
     '--workers', '4', '--seeds', '5', '--cases', '^(<the cells of the group, joined by |>)$', '--fresh-process',
     '--output', '<repository root>\tests\artifacts\ig-proto\phase1\P6-bench\<Side>\<Group>')`, absolute paths (the
     bench writes `<output>-<date>.json` and `.md`, and `<output>.checkpoint.jsonl`);
   - `-DryRun` prints the worktree check, the preflight and the command line, runs nothing, and exits 0 when the
     preflight was `run` or `complete`, else with the preflight's exit;
   - for a real run, it loads the repository helper in this PowerShell process,
     `. (Join-Path $PSScriptRoot '..\lock\ig-lock.ps1')`; a loading failure exits 1 before the reservation is created
     or anything starts;
   - then, before the helper runs: it creates `<RAW>\pending.json` exclusively (`[IO.File]::Open(<path>, 'CreateNew')`;
     an existing file is exit 5) with the fields `id` (a new GUID), `task` (`V4-T14`), `group`, `side`, `commit`,
     `limitS`, `reservedS` (`limitS + 45`) and `createdAt`;
   - then `$global:LASTEXITCODE = 0`, `$start = Get-Date`, and `Invoke-IgNode -Repo pentomino -Task "V4-T14 $Group
     $Side" -NodeArgs $nodeArgs -LimitSeconds $limit -IdleQuietSeconds 15 -InformationVariable helperInfo` inside
     `try`/`catch`, then `$end = Get-Date`. The duration evidence: the helper's `IG ... exit=<e> seconds=<s>
     quiet=<q>` line (it prints it before it throws on a non-zero exit) gives the node seconds `<s>` and the exit `<e>`;
     the recognized timeout (the message matches `second limit reached`) gives node seconds = the limit, `killed`, and
     exit `null`; any other exception without an `IG` line is an **accounting stop**: the reservation stays, no ledger
     line is written, zero is never substituted, and the script exits 5 with `V4-T14 <G> <S>: STOP (accounting):
     <message>; pending.json kept`. A non-timeout failure never exits 0, whatever `$LASTEXITCODE` holds;
   - after exit 0 of the bench: the terminal report is the single `<RAW>\<Side>\<Group>-*.json` written since `$start`
     (none or several: exit 1, the reservation kept); its path relative to the repository and the SHA-256 of its raw
     bytes (`Get-FileHash -Algorithm SHA256`) go into the ledger line; after exit 2 or a timeout both are `null`;
   - appends one line to `<RAW>\ledger.jsonl` (UTF-8 without BOM, `ConvertTo-Json -Compress`, LF;
     `[IO.File]::AppendAllText`, which closes the file) with the fields `id` (the reservation's), `task` (`V4-T14`),
     `group`, `side`, `commit`, `limitS`, `start` and `end` (ISO 8601 UTC), `wallSeconds`, `nodeSeconds`,
     `lockWaitSeconds` (the wall time less the node seconds, at least 0), `quietS`, `countedSeconds` (node seconds +
     min(lock wait, 45)), `killed`, `exit`, `report` and `reportSha256`; only then it deletes `pending.json`, and
     prints `V4-T14 <G> <S>: exit <e>, counted <c> s; ledger <total> s of 2700`;
   - exits 0 when the bench recorded every row, 2 when it ended incomplete, 3 when killed (exit 1, 4, 5, 6, 8 and 9 as
     above).
5. **The runs** (locked). Each group and side runs only after its predecessors completed: its dry run first, any
   non-zero exit stops the sequence; then the real line, whose exit is inspected before anything else. Exit 0 completes
   it. Exit 3 allows one retry of the same line (its preflight counts the earlier kills from the ledger and checks the
   checkpoint strictly); a second kill, and an exit 1, 4, 5, 6, 8 or 9, stop. Exit 2 (incomplete or interrupted) stops
   too: a resume needs the pack author's instruction, relayed by the orchestrator, and then runs the same line with
   `-ResumeInstructed`; it never undoes an owner's interruption by itself. Never `--restart`, never a deleted
   checkpoint, report, reservation or ledger line.

   ```powershell
   $c = '<C>'
   foreach ($p in @(@('A', 'old'), @('A', 'new'), @('B', 'new'), @('B', 'old'))) {
     $g, $s = $p
     $tries = 0
     do {
       $tries += 1
       pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group $g -Side $s -NewCommit $c -DryRun
       if ($LASTEXITCODE -ne 0) { throw "STOP: the dry run of $g $s exited $LASTEXITCODE" }
       pwsh -NoProfile -File tools\ig-proto\phase1\p6-bench.ps1 -Group $g -Side $s -NewCommit $c
       $e = $LASTEXITCODE
     } while ($e -eq 3 -and $tries -lt 2)
     if ($e -ne 0) { throw "STOP: $g $s exited $e" }
   }
   ```

   - The order is block-order counterbalancing: group A runs old then new and group B new then old. It reduces one
     order imbalance but does not cancel temporal drift within a cell; `compare.md` reports it as a limitation.
   - Expected, from MP12b1's reps 0 to 4 of the same cells (an earlier source of the same algorithm), with each row's
     start and landscape sampling (2 to 6 s a row): group A about 470 s and group B about 610 s on the old side, a
     little less on the new one; about 2,220 counted seconds (37 minutes) in all.
6. **`compare`** (unlocked, once the four groups and sides completed): `node tools\ig-proto\phase1\p6-bench.mjs compare
   --new-commit <C>`. It refuses publication, writing nothing and keeping the raw evidence, unless:
   - there is no `<RAW>\pending.json`; the ledger is readable, totals at most 2,700 s, and has for each group and side
     exactly one line with `exit` 0, whose `report` exists and has the recorded raw-byte SHA-256 (that terminal report
     is used, whatever other dated reports lie beside it as raw evidence);
   - each terminal report has `format` `pentomino-bench-report` and `complete: true`, and in its `meta` `kind` `node`,
     `profile` `landscape`, `workerCount` 4 and `lifecycle` `cold`; the old ones' `meta.sourceCommit` is
     `3fc65f4681a53d3984d9218c15efbf696cc3a1a5` and `meta.sourceDigest` is `FROZEN_DIGEST`; the new ones'
     `meta.sourceCommit` is `<C>` and both have one `meta.sourceDigest`; old and new have one `meta.matrixDigest` within
     each group; all four have one `meta.browserOrNode`, `meta.platform` and `meta.hardware` (`cpu`, `logicalCores`,
     `totalMemoryBytes`, `node`, and `execArgv` with `--max-old-space-size=2048`);
   - every expected row (the group's cells times reps 0 to 4) is present once and passes `validateRunRecord`, has
     `probeKind` `generation`, `measurementValid: true`, `interrupted: false`, its declared case, rep and seed, and
     `sourceCommit`, `sourceDigest`, `versions`, `browserOrNode`, `platform`, `workerCount` and `lifecycle` equal to its
     report's `meta`; its errors are only of phase `sampling` (kept as post-timing diagnostics); a request with ten
     puzzles has a finite positive `tenthReadyMs`, and every request has a finite positive `responseMs`
     (`complete: true` alone does not prove valid measurements: a failed child row is complete too);
   - no pair is `differ` or `incomplete` (a `differ` is a stop point);
   - both memory checks are `pass` on every cell of both sides (not merely not failed) and `model-too-large` is 0;
   - every report's text is CRLF only and holds no drive-letter path.

   It then writes into `<EVIDENCE>`: the four terminal reports and their `.md` copied byte for byte as
   `<Side>\<Group>-<date>.json` and `.md`; `ledger.jsonl` (`writeJsonl`, CRLF); `compare.json` (`writeJson`);
   `compare.md`; `chart.svg` and `chart.html` (`writeText`). An output that exists with other bytes is refused
   (`p6-bench: <file> exists with other bytes`); the same inputs rewrite the same bytes.
   - `compare.md`: a banner (the two commits and digests, Node and its flags, the machine, the dates of the four
     reports, and "Node screening evidence at four workers, cold, one fresh process per request; not a browser
     qualification (D39)"); per cell a table of the old and the new side: n, ten of n, ten or proven-all of n, T1
     median and p95, T10 median and p95 (conditional, with n), response median, p95 and max, the accepted
     distribution, the process and accounted peaks, the sampling errors; then the paired ratios old/new (median
     [min-max] n, and the excluded pairs) of T1, T10, T10 - T1 and the response; per level the pooled ratios; the
     identity: `<k>` pairs `equal` (production digests and summaries), `<m>` `metric-prefix-only` ("puzzle-prefix
     identity not established"), `<z>` `no-puzzle-evidence`, 0 `differ`, then each pair's two production digests in a
     `<details>` table, and the sentence "T12's parity tests and the unchanged fixtures remain the compatibility
     evidence"; the two memory checks and `model-too-large` of each side; the ledger (invocations, counted seconds, the
     allowance); and the limitations: "Five requests per cell provide descriptive results only; the nearest-rank p95 is
     the maximum of the available sample. Response medians include partial responses: each side's ten of n stands
     beside it. The landscape profile's diagnostic sampling runs after the T1, T10 and response timing, but it takes
     invocation time and counts in the whole-process peak memory. The order (A old then new, B new then old) reduces
     one order imbalance but does not cancel temporal drift within a cell."
   - `chart.svg` and `chart.html`: one horizontal row per cell in the order of `GROUPS`, two bars each, old
     (`#9e9e9e`) and new (`#1f77b4`), whose length is the median response time on a log10 axis from 1 to 200 s (ticks
     1, 2, 5, 10, 20, 50, 100 and 200 s); at the end of each bar its median and its side's ten of n (`65.3 s, 5/5
     ten`); the paired response ratio `xR.RR [min-max] n <n>` at the right; the title "Puzzle generation time per
     request (median response, five seeds per cell): main 3fc65f4 against <the first 7 characters of C> (P6)"; a
     subtitle with Node, four workers, cold, the CPU and the date; the footer "Node screening evidence, not a browser
     qualification. Production-digest equality established on `<k>` of 35 pairs; `<m>` pairs have metric-prefix
     agreement only and `<z>` have no common puzzle evidence. Prefix identity is not established by those summaries.";
     1200 x 720 pixels, the system sans-serif font, no external resource (`chart.html` holds the SVG inline, with
     `margin: 0`).
7. **The chart image** (unlocked, after step 6), bounded and cleaned up:

   ```powershell
   $ev = (Resolve-Path 'docs\improve-generating\evidence\phase1\P6-bench').Path
   $profileDir = Join-Path (Resolve-Path 'tests\artifacts').Path ('ig-proto\selftest\t14-edge-' + [guid]::NewGuid().ToString('N'))
   $url = 'file:///' + ($ev -replace '\\', '/') + '/chart.html'
   $edgeArgs = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', "--user-data-dir=$profileDir", '--window-size=1200,720', "--screenshot=$ev\chart.png", $url)
   $edge = $null
   $launch = Get-Date
   try {
     $edge = Start-Process -PassThru -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList $edgeArgs
     if (-not $edge.WaitForExit(60000)) { throw 'STOP: Edge did not finish within 60 s' }
     if ($edge.ExitCode -ne 0) { throw "STOP: Edge exited $($edge.ExitCode)" }
   } finally {
     if ($edge) {
       # The helper's pattern (tools\ig-proto\lock\ig-lock.ps1): the recorded process and its descendants, by PID only;
       # here only msedge.exe processes created since the launch, so that no unrelated process is ever stopped.
       $rootExited = $edge.HasExited
       $all = Get-CimInstance Win32_Process
       $owned = [Collections.Generic.List[int]]::new(); $owned.Add([int]$edge.Id)
       for ($i = 0; $i -lt $owned.Count; $i++) {
         foreach ($child in $all | Where-Object { $_.ParentProcessId -eq $owned[$i] -and $_.Name -eq 'msedge.exe' -and $_.CreationDate -ge $launch }) {
           if (-not $owned.Contains([int]$child.ProcessId)) { $owned.Add([int]$child.ProcessId) }
         }
       }
       for ($i = $owned.Count - 1; $i -ge 0; $i--) {
         if ($i -eq 0 -and $rootExited) { continue }
         Stop-Process -Id $owned[$i] -Force -ErrorAction SilentlyContinue
       }
       $watch = @(for ($i = 0; $i -lt $owned.Count; $i++) { if (-not ($i -eq 0 -and $rootExited)) { $owned[$i] } })
       $deadline = (Get-Date).AddSeconds(15)
       do {
         $alive = @($watch | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
         if ($alive.Count -gt 0) { Start-Sleep -Milliseconds 250 }
       } while ($alive.Count -gt 0 -and (Get-Date) -lt $deadline)
       if ($alive.Count -gt 0) { throw "STOP: owned Edge processes survived: $($alive -join ', ')" }
     }
     if (Test-Path $profileDir) { Remove-Item -Recurse -Force $profileDir }
     if (Test-Path $profileDir) { throw "STOP: the Edge profile $profileDir could not be removed" }
   }
   ```

   The owned processes (the recorded Edge process and its `msedge.exe` descendants created since the launch, by PID)
   are stopped, children before parents, and awaited for at most 15 s before the profile is removed; a surviving owned
   process or a profile that cannot be removed fails the screenshot gate, and no unrelated process is ever stopped. Only
   after Edge ended with exit 0 within 60 s and the cleanup succeeded: `chart.png` must exist, be larger than 10 KB, and
   show the seven rows with both bars and their labels (view it). The scratch profile keeps the user's Edge profile
   untouched.
8. **Self-test** cases appended to `--items` (Tests table); **README.md**: a new section "Phase-1 bench of P6
   (V4-T14)": the purpose, the two scripts, the preflight, the reservation and the ledger, the order and the resume
   rule, the outputs, the identity categories, and the statement that the results are Node screening evidence.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, on synthetic run records (`newRunRecord` of `tools/bench/report.js`)
and temporary files under `tests/artifacts/ig-proto/selftest/p6/`, deleted at the end of each case; no bench runs and
no generation runs.

| Case name | Input | Expected |
|---|---|---|
| `p6: pairs and identity` | old and new runs of two cells: equal summaries and equal production digests; equal summaries and different production digests; ten puzzles against the first seven of the same summaries; a changed `score` in the fourth common puzzle; an empty side; a nonempty side without its digest; differing `sampleFailures` only; a run without its pair | `equal`; `differ`; `metric-prefix-only`; `differ` with `details.puzzles[3].score`; `no-puzzle-evidence`; `incomplete`; `equal`; throws `p6-bench: unpaired run <caseId> #<rep>` |
| `p6: statistics and ratios` | five and twenty synthetic runs; pairs with and without ten on both sides; a nine-puzzle request that proved every arrangement; a pair with a non-positive endpoint | the p95 of five values is their maximum and of 1 to 20 is 19; T10 only over the runs with ten, with its n; `tenOfN` excludes the nine-puzzle request and `tenOrProvenAllOfN` counts it; the ratios old/new with median, min, max, n and `excluded`, and `median: null` below n 3 |
| `p6: the memory checks` | at four workers, accounted peaks of 1,196 MiB and of 1,196 MiB + 1 byte; process peaks of 1.5 GiB and of 1.5 GiB + 1 byte; a run without a process peak | `pass` and `fail`; `pass` and `fail`; `not-measured`, which refuses publication |
| `p6: the ledger, the reservation and the preflight` | ledgers of 0, 1,800 and 2,400 counted seconds; a line with a negative or non-finite duration; a reservation present; a group with a valid `exit` 0 line and its terminal report; a completed line of another commit; a completed line whose terminal report is missing, or whose bytes changed; a last line with `exit` 2, without and with `resumeInstructed`; two kills; a checkpoint with a truncated line, a duplicate row, a row of another commit, and a row whose source digest or versions differ from its header | `run` with limits 900 and 855, then `stop` 4 (255 s); throws `ledger line <n> is unreadable`; `stop` 5; `complete`; `stop` 8 (`ledger source does not match this comparison`); `stop` 8 each; `stop` 9, then `run`; `stop` 6; `stop` 8 for each checkpoint defect |
| `p6: inputs are refused` | a report whose rows are failed child records but `complete: true`; a row whose metadata differs from its report's; a row with a non-sampling error; a missing process memory; `workerCount` 2; an old report whose digest is not `FROZEN_DIGEST`; a new report of another commit; the new reports with two source digests; a terminal report whose SHA-256 differs from its ledger line; a reservation left; a report with a drive-letter path | each refused with its reason, nothing written |
| `p6: the chart` | the result of seven synthetic cells with `<k>`, `<m>` and `<z>` identity counts | the SVG has seven rows with two bars each, the ten of n texts, the ratio texts and the footer with the three counts; `chart.html` embeds it; the same input gives the same bytes |

## Documentation

`tools/ig-proto/README.md` (step 8). The pull request's text is the orchestrator's, from `compare.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T14` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T14` | root | 10 passed | 1 min |
| the sequence of step 5 | root | every group and side exit 0; the ledger at most 2,700 s; no `pending.json` left | each invocation at most its limit, 900 s, plus the lock wait |
| `node tools\ig-proto\phase1\p6-bench.mjs compare --new-commit <C>` | root | exit 0; the files of step 6 | 1 min |
| step 7 | root | Edge exit 0 within 60 s; `chart.png` larger than 10 KB; no profile folder left | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T14 --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |
| the guards of the Scope | root | no output | 1 min |

## Stop points and questions

- Stop and report before: any stop of the preflight or the sequence (exit 1, 2, 4, 5, 6, 8 or 9, or a second exit 3);
  an allowance stop (exit 4: the orchestrator asks the owner); an accounting stop (exit 5: the reservation stays until
  the pack author rules on it); a resume after exit 2 (it needs the pack author's instruction); a pair that differs or
  whose evidence is incomplete (report the cell, the seed and the first differing path or the missing field); a memory
  check that is not `pass` on either side; a refused `compare`; a source check of step 2 that fails; anything that
  would write into a worktree, a production file or the frozen-round evidence.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T14-B01 | The pull request can state the generation time of the old (`3fc65f4`) and the new (`<C>`) version per cell and per level, measured in one session on one machine at four workers, as descriptive results: medians, nearest-rank p95 (the sample maximum at n 5), maxima, ten of n and paired ratios, with the limitations stated | `compare.md`, `compare.json` | evidence files |
| T14-B02 | Equal-count, nonempty pairs establish puzzle-output equality through matching production result digests and summaries. Partial/no-puzzle pairs are reported as inconclusive identity evidence, never asserted prefix-identical. No observed difference is accepted. T12's parity tests and unchanged fixtures remain the compatibility evidence | the identity section of `compare.md` | evidence files |
| T14-B03 | Phase 1's gate is read at four workers: both memory checks are `pass` on both sides and `model-too-large` is 0 (N-V4-12 closed) | `compare.md` | evidence files |
| T14-B04 | The machine time stays within the owner's separate allowance of 45 counted minutes, and a chart is ready for the pull request | `ledger.jsonl`; `chart.png` | evidence files |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T14-T01 | The sources are pinned and verified: two clean worktrees at `3fc65f4` and `<C>`, the old digest equal to the frozen source's, the bench code identical, only P6's three files different | step 2; the reports' `meta` | command output |
| T14-T02 | Every bench invocation ran through the lock helper with its limit from the ledger, behind a reservation, and every attempt is a ledger line; no silent re-run, no unaccounted invocation | `ledger.jsonl`; the helper's `IG` lines; no `pending.json` | command output |
| T14-T03 | The comparison refuses invalid or inconsistent inputs, and its pairing, identity, statistics, memory checks, ledger, reservation, preflight and chart are tested | the six cases | self-test output |
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
`compare.md` (old and new medians, p95, ten of n and paired ratios), the identity counts and the memory checks; each
AC row with its evidence; the questions and rulings; the deviations; and the named items for later.

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

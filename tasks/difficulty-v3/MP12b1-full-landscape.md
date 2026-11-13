# MP12b1 — Full landscape with v3 (gate GL-P3, full part)

| Header | Value |
|---|---|
| ID | MP12b1 (second part of the report's MP12; MP12b2 adds the search evidence, the Hell report, the owner's questions and the lock) |
| Depends on | MP12a (accepted and committed: the knobs and caps after the slice, `docs/difficulty-v3/calibration-slice-<date>.md`, `docs/difficulty-v3/landscape-v3/`) |
| Estimated size | Medium: about 300–500 changed lines (the aggregation script with its self-test about 250, the shard table, the aggregate; no product code); about 45–60 minutes of developer work plus machine time: about 9.5–14.5 hours in bounded invocations under the lock protocol (cross-review TP20; the waits for the Sudoku repository come on top): about 3–8 hours for the 80 cases that are not Hell, about 2.5 hours for the 25 Hell prescreens, and the 20-request Hell runs of owner decision P-OD6 (D37 (c)): about 40 minutes for each boundary case (at most one per Hell level) and up to about 40 minutes for each Hell case whose prescreen made a puzzle (expected at most three); projected again after the first 20 cases and with the Hell run plan |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (the full landscape, "kept even where availability is poor"), RES-26, RES-35; clarifications PROC-P1 (a), SA2-Q-P09 (branch A), P-OD1 and P-OD3, P-OD5 (D36) in part H, Part I D37, answered (c), with owner decision P-OD6 in part H (the Hell population; cross-review TP08); check-list §4.2 D21, D29, D36, D37 and §7 (the shared-machine lock protocol); cross-review TP20, TP25, TP27, TP30 (the layout of MP12b2's change round), TP31 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, MP12 tranche and its re-verification) |
| Gates owned | GL-P3 (full landscape; check-list §7) |
| Implementation status | Not started |

## Goal & business context

MP12a made the 18 cells of the v2 baseline meet the owner's criteria. Before the v3 rating and the generation are
locked, the owner wants the evidence on the whole landscape the Generator offers: all board-and-level cases of the
landscape matrix, from 6 x 10 to 26 x 26 and from Very easy to Hell 3 (RES-25, SA2-4 JC07), kept "even where
availability is poor". This task runs it and aggregates it. Its lists (cells without a puzzle, cells whose scores never
reach the central half of their band, cells with too many census estimates) are what MP12b2 puts to the owner and
measures further before the lock.

The Hell levels are expected to fail on most boards (`clarifications.md` Part I, D36, answered (a), owner decision
P-OD5; MP09d2's record `docs/difficulty-v3/d21-v3-<date>.md`): a request whose calibrations are all unrateable runs to
the time limit, about 2 minutes, without a puzzle, so 20 requests of a failing Hell case cost about 40 minutes. Hell
cases are therefore first measured with 3 requests (a prescreen). The owner decided which of them then get all 20
(`clarifications.md` Part I, D37, answered (c); owner decision P-OD6): every case whose prescreen made a puzzle, and
the boundary case of each Hell level; the others stay at 3 requests (cross-review TP08: three requests without a
puzzle are not the accepted population and prove nothing on their own). A cell without a puzzle is reported as "no
puzzle observed in N requests", never as "cannot be made".

## Scope

### In scope

- Gate GL-P3, full part: every case of `buildLandscapeMatrix`, 20 repetitions (Hell cases by the rule below), in
  shards run by MP12a's launcher under the lock; the 18 cases of MP12a's final round reused when their source identity
  equals this landscape's (below).
- The shard table `docs/difficulty-v3/landscape-v3-full/shards-<date>.md`, the aggregation script
  `docs/difficulty-v3/landscape-v3-full/aggregate.mjs` (new, with its self-test; TP27) and the aggregation
  `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json` and `aggregate-<date>.md` with the protocol coverage and
  the three lists.

### Out of scope

- The search evidence, the Hell report, the owner's questions, the record `calibration-<date>.md`, design §7.8 and
  the lock (MP12b2).
- Any knob, cap, `K60`, `SHARES`, area or algorithm change (RES-25; MP12b2's ordered change round, if any).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Heavy runs exactly as written below, each through the helper `Invoke-Dv3Timed` of check-list §7 "Shared-machine lock
  protocol" (cross-review TP20; save it verbatim as `tests/artifacts/MP12b1/dv3-lock.ps1` and dot-source it in every
  call): one bounded invocation per acquisition of the lock (at most 590 s), at least 15 s between releasing the lock
  and taking it again (the helper waits), never a lock held across a series. Every shard runs through MP12a's launcher
  `docs/difficulty-v3/landscape-v3/launch.mjs` (read-only; its contract is MP12a's "Run control"): staged under
  `tests/artifacts/MP12b1/landscape/`, resumed by the identical command after the scheduled pause (launcher exit 3),
  published once into `docs/difficulty-v3/landscape-v3-full/` by `launch.mjs publish`. The dispatch of this task is
  its slot; the lock interleaves its invocations with the Sudoku repository's. Write the plan of each batch of cases
  (cases, expected wall time) into the shard table before starting it.
- A command stopped at the helper's limit, a launcher exit 1 or 2, or a refused publication stops the work: report it.
  Never kill a running invocation, never lower `--seeds`, use `--restart`, change a seed or drop a completed row; never
  delete the checkpoint of an unpublished shard.
- Records are written once; nothing under `docs/difficulty-v3/landscape-v3/`, `baseline-v2/` or the earlier records is
  edited. UTF-8 without BOM, CRLF (normalise tool-written files before the hand-off), no absolute path in a record.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md` or the reports.

## Inputs & context

- Knobs and caps: read `SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID` (`core/engine/policy.js`) and `SHARES`
  (`core/engine/levels.js:18`) from the tree; they are MP12a's final values (its record §5).
- MP12a's record `docs/difficulty-v3/calibration-slice-<date>.md` and its final round folder
  `docs/difficulty-v3/landscape-v3/r<k>/` (18 reports); MP09d2's record `docs/difficulty-v3/d21-v3-2026-11-12.md`
  (§2 the Hell outcomes, §4 the availability probe, §6 the cells v3 could not make and how long each request ran).
- The landscape matrix (`tools/bench/calibration-reference.js:214`, `buildLandscapeMatrix`): at `a85ed55` 105 cases
  on 16 boards — 6x10 (6 levels), 3x29 (7), 10x10 (6), 12x12 (6), 14x14 (7), 15x15b10 (7), 16x16 (6), 15x20 (7), 18x18
  (7), 18x20 (6), 20x20 (6), 20x21 (6), 32x15 (7), 22x22 (7), 24x24 (7), 26x26 (7); every case rotation 0, uniqueness
  `any`, quantity 10, seed `landscape/<case id>/<rep>`. List them:

  ```powershell
  node -e "import('./tools/bench/calibration-reference.js').then(m=>console.log(m.buildLandscapeMatrix({seeds:20}).cases.map(c=>c.id).join('\n')))"
  if ($LASTEXITCODE -ne 0) { throw 'case list failed' }
  ```

  Use the printed list (a difference from 105 is recorded, not forced). A case is a Hell case when its level id
  starts with `hell-`.
- The tools (MP11, `a85ed55`): the reports carry, per accepted puzzle, `clues`, `U`, the score, `level`, `censored`
  and the v3 metric subset; per cell (`calibration.cells` of each landscape report), `requestInBandRate`, `v3` (score
  summary `{ n, min, median, p95, max }`, G, Cmax, tier and solution histograms, census estimates, `provedZero`; null
  when the cell accepted no v3 puzzle, `tools/bench/calibration-reference.js:346-363`) and `sampledUnrateable`; the
  Markdown has the v3 table. `aggregateLandscape(runs, matrix)` and `renderLandscapeMarkdown(...)`
  (`tools/bench/calibration-reference.js`) aggregate any set of run records; every report's `meta` has
  `sourceDigest`, `versions` and `sourceCommit`.
- The tree's source identity, to compare with a report's `meta` (no lock: nothing is generated):

  ```powershell
  node --input-type=module -e "import { readFileSync } from 'node:fs'; import { computeSourceDigest } from './tools/bench/report.js'; import { currentVersions } from './tools/record-fixtures.mjs'; console.log(JSON.stringify({ sourceDigest: await computeSourceDigest((p) => readFileSync(p, 'utf8')), versions: currentVersions() }))"
  if ($LASTEXITCODE -ne 0) { throw 'identity failed' }
  ```

### Shards (gate GL-P3, full part)

One case per shard, run by MP12a's launcher in bounded invocations under the lock, then published once:

```powershell
. tests\artifacts\MP12b1\dv3-lock.ps1
$date = '<date>'; $case = '16x16-hard'; $seeds = 20   # a Hell prescreen: $seeds = 3
$name = if ($seeds -eq 3) { "$case-s3-$date" } else { "$case-$date" }
$stage = "tests/artifacts/MP12b1/landscape/$name"
$node = @('--max-old-space-size=2048', 'docs/difficulty-v3/landscape-v3/launch.mjs', 'run', '--profile', 'landscape',
  '--workers', '4', '--seeds', "$seeds", '--fresh-process', '--cases', "^$case$", '--output', $stage)
do {
  $r = Invoke-Dv3Timed -Task "MP12b1 $name" -NodeArgs $node
  if ($r.TimedOut) { throw "MP12b1 ${name}: the 590 s limit was reached; stop and report" }
} while ($r.Exit -eq 3)
if ($r.Exit -ne 0) { throw "MP12b1 ${name}: launcher exit $($r.Exit); stop and report" }
node docs/difficulty-v3/landscape-v3/launch.mjs publish $stage docs/difficulty-v3/landscape-v3-full --seeds "$seeds"
if ($LASTEXITCODE -ne 0) { throw "MP12b1 ${name}: publish refused" }
```

`<date>` is the date the shard starts, kept for all its invocations. The published report is
`docs/difficulty-v3/landscape-v3-full/<case>-<date>.json|.md` (20 requests) or `<case>-s3-<date>.json|.md` (a Hell
prescreen of 3 requests).

- Order: smallest boards first, and within a board from the lowest level; the large boards last; the Hell cases after
  all others.
- **Hell cases** (D36; D37 answered (c), owner decision P-OD6; cross-review TP08), after all other cases:
  1. **Prescreen** all 25 Hell cases: `$seeds = 3`, published as `<case>-s3-<date>` (about 6 minutes per case when
     every request fails; about 2.5 hours in all). The cases, with their active cells: Hell 1 on 14x14 (196),
     15x15b10 (215), 16x16 (256), 15x20 (300), 18x18 (324), 18x20 (360), 20x20 (400), 20x21 (420), 32x15 (480), 22x22
     (484), 24x24 (576) and 26x26 (676); Hell 2 on the nine boards from 15x20 to 26x26; Hell 3 on 32x15, 22x22, 24x24
     and 26x26.
  2. **The run plan (P-OD6)**, per Hell level, from the prescreen table (case, active cells, requests, accepted
     puzzles, failure reasons, minutes):
     - every case with at least one accepted puzzle in its prescreen: `$seeds = 20`, published as `<case>-<date>`,
       like any other case;
     - the **boundary case**, the case with the fewest active cells among the level's cases whose prescreen accepted
       no puzzle: `$seeds = 20` (about 40 minutes when every request fails). Exactly one per level, none when every
       prescreen of the level made a puzzle; when its 20 requests make a puzzle, it is reported with its request
       completion rate and no further boundary case is run (P-OD6 names one per level);
     - every other case stays at its prescreen: its `-s3` report is its evidence, labelled "reduced (D37, P-OD6): no
       puzzle observed in 3 requests" and read with the boundary case of its level.
  3. Write the prescreen table and the run plan into the shard table, then run the plan; no answer is needed.
- **Expected from MP09d2's record** (`docs/difficulty-v3/d21-v3-2026-11-12.md` §4 and §6; a projection, never a
  reason to skip a prescreen): Hell 1 was made only on the 164-cell board (13 x 13 with 5 blocked; 2 of 3 attempts),
  not on 300 cells (15x20, 14 set attempts), 400 or 484 cells, where every profile was capped; Hell 2 was not made on
  the 266-cell board (19 x 14: rated profiles, all above the band) nor on 300, 324, 400 or 484 cells; Hell 3 on none
  of 450, 480, 484 or 576 cells (all capped). Puzzles are therefore expected, if at all, only for Hell 1 on 14x14,
  15x15b10 and 16x16, and the boundary cases are expected to be one of these or 15x20 for Hell 1, 15x20 for Hell 2
  and 32x15 for Hell 3.
- Never run a case twice with 20 requests; never delete a `-s3` report (it is a record).
- Record per invocation in `shards-<date>.md`: the published name, start, end, seconds, launcher exit, the checkpoint
  rows after it (the launcher's last line) and the lock wait; per case the publish line (publication deletes the
  staged checkpoint).
- **Reuse of the slice by source identity** (cross-review TP25): for each of the 18 GV2 cases, MP12a's final-round
  report `docs/difficulty-v3/landscape-v3/r<k>/<case>-<date>.json` counts as that case's evidence when its
  `meta.sourceDigest` and `meta.versions` equal the tree's (the identity command above, run before the first shard)
  and it ran with the same flags (`--profile landscape --workers 4 --seeds 20 --fresh-process`, the default
  `--max-active`). Equality of the measured identity is what matters: MP12a's `meta.sourceCommit` may end with
  `+uncommitted-changes`, because its knob edits were not committed while it measured; the shard table names MP12a's
  commit as the committed counterpart. Otherwise run the case like the others.
- Wall time: expect about 3–8 hours for the cases that are not Hell, about 2.5 hours for the 25 Hell prescreens,
  about 40 minutes for each boundary case (at most three, about 2 hours) and up to about 40 minutes for each Hell case
  with a puzzle (expected at most three): about 9.5–14.5 hours, plus the lock waits and 15 s per invocation. Write a
  projection into the shard table after the first 20 cases and again with the Hell run plan, and give both in the
  reply.

### The aggregation script `docs/difficulty-v3/landscape-v3-full/aggregate.mjs` (new; TP27)

A durable script (CRLF, `// @ts-check`), run as `node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --full
docs/difficulty-v3/landscape-v3-full --slice docs/difficulty-v3/landscape-v3/r<k> --date <date>` or with
`--self-test`. It:

1. **Reads the prescreens first** (the protocol input; cross-review TP31): for each of the 25 Hell cases of
   `buildLandscapeMatrix({ seeds: 20 })`, exactly one prescreen `<case>-s3-YYYY-MM-DD.json` in the full folder itself
   (never its subfolders), validated like any selected report (step 4) with N = 3: `complete`, its rows of the case
   exactly the reps 0 to 2, none interrupted, the shared source identity. A Hell case without exactly one valid
   prescreen is `missing` or `invalid`, and the protocol of its level cannot be derived: the script stops on the gap
   (step 5).
2. **Derives the protocol (P-OD6)** of each case from the prescreens only: N = 20 for a case that is not Hell; per
   Hell level, N = 20 for every case whose prescreen accepted a puzzle; the **boundary case** of the level is the case
   with the fewest active cells (ties in matrix order) among the level's cases whose prescreen accepted no puzzle, and
   it needs N = 20 whatever its 20-request report shows: a boundary case that makes a puzzle in its full run stays the
   boundary, and no second case is promoted; every other Hell case needs N = 3 ("reduced (D37, P-OD6)", with the
   boundary case of its level).
3. **Selects one report per case**, by name, never by reading every JSON file of a folder, in the folder itself (not
   its subfolders): for N = 20, the 20-request report `<case>-YYYY-MM-DD.json` of the full folder, else, for a GV2
   case, the slice report `<case>-YYYY-MM-DD.json` of the slice folder; for N = 3, the prescreen read in step 1. Two
   files that match one pattern are an error, and so is a 20-request report of a case whose protocol is N = 3 (a run
   outside the P-OD6 plan: `invalid`, reported). A prescreen of a case that needs 20 is read for the protocol but its
   runs are never appended to the aggregate's run list beside the selected 20-request report: its 3 requests are the
   first 3 of the 20 (same seeds), so appending both would count them twice (TP08).
4. **Validates every report it reads** (TP27), before the selection is used: the chosen report is `complete`; its
   rows of the case are exactly the reps 0 to N - 1 (a 3-request report never stands for a case that requires 20); no
   row is interrupted; every report read (the prescreens and the chosen reports, a reused slice report included) has
   the same `meta.sourceDigest` and `meta.versions`. Each case gets a status: `measured` (N = 20, valid), `reduced
   (D37, P-OD6)` (N = 3, valid), `missing` (no report where the protocol needs one) or `invalid` (a report that fails
   a check). A partial or missing report is never a D37 waiver and never becomes "no puzzle observed" evidence because
   its file exists.
5. **Stops on a gap**: when a case is `missing` or `invalid`, it prints the coverage table and exits 2 without writing
   the durable files; the task then runs the missing case or reports to the orchestrator (an unresolved measurement
   goes to the orchestrator before the lock).
6. **Otherwise** keeps the chosen reports' `runs`, calls `aggregateLandscape(runs, buildLandscapeMatrix({ seeds: 20 }))`
   and `renderLandscapeMarkdown(...)`, and writes, once and CRLF, into the `--full` folder (here
   `docs/difficulty-v3/landscape-v3-full/`; an ordered change round of MP12b2 passes its own folder, with the GV2
   reports in its subfolder `slice/` as `--slice`); it refuses to overwrite an existing aggregate:
   - `aggregate-<date>.json`: `{ aggregate, coverage, lists, source }` (`source` is the shared `sourceDigest` and
     `versions`; `coverage` has one entry per case in matrix order, `{ caseId, requiredN, reps, report, boundaryCase,
     status, recorded, requested }`, with `report` the repository-relative path of the selected report JSON (null when
     none), `reps` the number of its completed distinct reps of the case, `boundaryCase` the boundary case id of a Hell
     case's level or null, and `recorded` and `requested` the aggregator's own counts; MP12b2 reads `report` for its
     Hell companion);
   - `aggregate-<date>.md`: the rendered landscape; then the **protocol coverage table** (every case id with the
     required N, the completed distinct reps, the selected report, for a Hell case the boundary case of its level, the
     status, and the shared aggregator's own `runs.recorded / runs.requested`, which stays "3 / 20" for a reduced case
     because the aggregate keeps its 20-request criteria; a note explains both); then the three lists below, each a
     table with board, area, level, requests, accepted puzzles, `requestCompletionRate` and the yield (MP12a's
     measures) and the v3 score summary (unavailable when `v3` is null).

The lists (exact rules; a missing value is unavailable, never 0, and never throws):

1. **Cells without a puzzle**: no selected run of the case accepted a puzzle (then `v3` is null); written "no puzzle
   observed in N requests" with N the protocol's requests (3 for a reduced Hell case), the failure reasons of its runs
   (`partialReason`) and, for a reduced case, "reduced (D37, P-OD6)" with the boundary case of its level and that
   case's result. This list is the input of MP12b2's owner question; it never says "cannot be made".
2. **One-sided cells**: `v3 !== null`, a finite band (`level(id).max` finite), `v3.score.n > 0`, and
   (`v3.score.max < c - h` or `v3.score.min > c + h`), with `c = (min + max) / 2` and `h = (max - min) / 4` of
   `level(id)` (every accepted score lies on one side of the central half).
3. **Census cells**: `v3 !== null` and `v3.censored.share > 0.05` (P-OD1).

`--self-test` runs the selection, validation and list rules on synthetic reports, writes nothing, and exits 1 on any
difference:

- (a) a valid reduced zero-puzzle Hell cell (prescreen complete, reps 0-2, no puzzle, not the boundary case): status
  `reduced (D37, P-OD6)`, in list 1 as "no puzzle observed in 3 requests", the aggregator's "3 / 20" shown beside it;
- (b) a complete positive cell (reps 0-19 with puzzles): `measured`, not in list 1, lists 2 and 3 evaluated on its
  `v3`;
- (c) a missing cell, and an unfinished one (`complete: false`): `missing` and `invalid`, exit 2, nothing written;
- (d) a cell with `v3: null` given to lists 2 and 3: not listed and no exception (SA2's probe threw on the literal
  rule of the first text);
- (e) a Hell case whose prescreen made a puzzle but which has no 20-request report: `missing`;
- (f) per level, the boundary case is the one with the fewest active cells among the cases without a prescreen
  puzzle, and it requires 20;
- (g) the boundary case's prescreen accepted no puzzle and its 20-request report accepted some (TP31): it stays the
  boundary of its level, `measured` with N = 20; the next larger case without a prescreen puzzle stays `reduced (D37,
  P-OD6)` with N = 3, and no second case of the level requires 20;
- (h) a case whose prescreen made a puzzle, with its valid 20-request report: the aggregate's run list holds its 20
  runs once (`recorded` 20, not 23); its prescreen is read for the protocol only;
- (i) a Hell case without a prescreen, and a reduced case that also has a 20-request report: `missing` and `invalid`
  (the protocol of the first one's level cannot be derived; the second report is outside the plan), exit 2, nothing
  written.

## Files to create/modify

| File | Change |
|---|---|
| `docs/difficulty-v3/landscape-v3-full/` (new) | the published shard reports, `shards-<date>.md`, `aggregate.mjs` (with its self-test), `aggregate-<date>.json`, `aggregate-<date>.md` |

Exclusive ownership while active: the folder above; scratch under `tests/artifacts/MP12b1/` (the helper's copy
`dv3-lock.ps1`, the staged reports and checkpoints). MP12a's `launch.mjs` is used read-only. Documentation slot: none
(the measured parameters and the lock are MP12b2's). Must not edit: code, tests, fixtures, MP12a's record and
folders, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`.

## Implementation steps

1. List the cases; print the tree's identity and decide the slice reuse; write the aggregation script and run its
   self-test; save the lock helper.
2. Run the cases (each shard through the launcher under the lock, then published; Hell cases last: the 25 prescreens,
   then the run plan of P-OD6, written into the shard table with the prescreen table: the 20-request runs of the Hell
   cases with a puzzle and of the boundary case of each Hell level); project the remaining time after 20 cases; keep
   the shard table.
3. Aggregate (one validated report per case); on exit 2, run the missing case or report it; then the aggregate files
   with the protocol coverage table and the three lists.
4. The quick set under the lock; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b1-B01 | The whole offered landscape is measured with v3, with coverage, request completion rates, times, census estimates and the proved-guess rule, and kept even where availability is poor (Hell cases by P-OD6: 20 requests where the prescreen made a puzzle and for the boundary case of each level; the others the 3-request prescreen, labelled reduced) | the aggregate files; the shard table |
| MP12b1-B02 | The cells without a puzzle ("no puzzle observed in N requests"), the cells that never reach the central half of their band and the cells with too many census estimates are listed with their numbers, ready for the owner's questions of MP12b2 | the three lists |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b1-T01 | Every shard ran through MP12a's launcher under the lock helper, each invocation in the shard table (times, launcher exit, rows, lock wait), every resume the identical command after exit 3; every report was published once by `launch.mjs publish`; no checkpoint of a published case is left and none was deleted before publication | the shard table; `git status` |
| MP12b1-T02 | The aggregation script reads and validates the 25 prescreens first and derives the P-OD6 protocol from them alone (a boundary case keeps its role whatever its full run shows), then takes exactly one validated report per case by its rules (a prescreen is never appended beside the 20-request report of the same case; one source identity across every report read, reused slice reports included; TP31), uses the tools' `aggregateLandscape` over their runs and the full matrix, writes the protocol coverage table, and its lists guard null values (TP27); it wrote nothing while a case was missing or invalid | `aggregate.mjs`; the aggregate files |
| MP12b1-T03 | The quick set (under the lock) and `npm run check` pass; the folder's files are CRLF without BOM | command output |
| MP12b1-T04 | The 25 Hell prescreens ran before any other Hell run; every Hell case with a puzzle in its prescreen and exactly one boundary case per Hell level (the fewest active cells among the level's cases without a puzzle; none when every prescreen of the level made a puzzle) have a 20-request report; every other Hell case is reduced, with its boundary case named | the shard table; the coverage table |
| MP12b1-T05 | `aggregate.mjs --self-test` passes its cases (a) to (i); a slice report was reused only by equal source identity, with MP12a's commit named | command output; the shard table |

## Test plan

### Exact commands

The shards as written above. Then:

```powershell
node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --self-test
if ($LASTEXITCODE -ne 0) { throw 'aggregation self-test failed' }
$k = 0   # MP12a's final round (its record); 1 or 2 when that round was later
$date = Get-Date -Format 'yyyy-MM-dd'
node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --full docs/difficulty-v3/landscape-v3-full --slice "docs/difficulty-v3/landscape-v3/r$k" --date $date
if ($LASTEXITCODE -ne 0) { throw "aggregation exit ${LASTEXITCODE}: a case is missing or invalid, or an error" }
. tests\artifacts\MP12b1\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP12b1 quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the protocol coverage, the total machine time with the lock waits
  apart, the summary of the per-board results, the Hell run plan (the prescreen table, the boundary cases), the
  reduced Hell cases and the three lists.
- Handoff to MP12b2: the aggregate files and the shard table; the three lists; the source identity the landscape ran
  on (`sourceDigest`, `versions`) and its commit.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |

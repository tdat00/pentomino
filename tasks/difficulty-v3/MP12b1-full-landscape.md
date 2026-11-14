# MP12b1 — Full landscape with v3 (gate GL-P3, full part)

| Header | Value |
|---|---|
| ID | MP12b1 (second part of the report's MP12; MP12b2 adds the search evidence, the Hell report, the owner's questions and the lock of the tuple; MP12b3 sets the Hell areas and completes the lock) |
| Depends on | MP12a (accepted and committed, closed by `MP12a-close-addendum.md`: the knobs and caps after the slice, `docs/difficulty-v3/calibration-slice-<date>.md`, `docs/difficulty-v3/landscape-v3/`) |
| Estimated size | Medium: about 300–500 changed lines (the aggregation script with its self-test about 250, the shard table, the aggregate; no product code); about 45–60 minutes of developer work plus machine time: about 7.5–12.5 hours in bounded invocations under the lock protocol (cross-review TP20; the waits for the Sudoku repository come on top): about 3–8 hours for the 80 cases that are not Hell, about 2.5 hours for the 25 Hell prescreens, and the 20-request Hell runs of owner decision P-OD9 (only for a Hell case whose prescreen made a puzzle; up to about 40 minutes each, expected at most three); projected again after the first 20 cases and with the Hell run plan |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (the full landscape, "kept even where availability is poor"), RES-26, RES-35; clarifications PROC-P1 (a), SA2-Q-P09 (branch A), P-OD1 and P-OD3, P-OD5 (D36) in part H, Part I D37, answered (c), with owner decision P-OD6 in part H (the Hell population; cross-review TP08), **changed by P-OD9** (Part H; the plan author's answer to PR-P1 in Part I: D36 decided (i), the boundary case dropped, the stop rule); check-list §4.2 D21, D29, D36, D37, D38 and §7 (the shared-machine lock protocol); cross-review TP20, TP25, TP27, TP30 (the layout of MP12b2's change round), TP31 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, MP12 tranche and its re-verification) |
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
cases are therefore first measured with 3 requests (a prescreen). The owner has decided D36 (P-OD9, recorded in the
plan author's answer to PR-P1): option (i), stop offering what v3 cannot make. So only a Hell case whose prescreen
made a puzzle is run with all 20 requests; a case that makes no puzzle in three requests is not offered and needs no
further evidence (the 20-request boundary case of D37 (c) is dropped). MP12b3 then sets the Hell levels' `AREAS` from
the 20-request runs of this task (check-list D39). A cell without a puzzle is reported as "no puzzle observed in N
requests", never as "cannot be made".

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
  the lock (MP12b2); the Hell `AREAS` and the fail-fast (MP12b3).
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
- **Stops (owner decision P-OD9, check-list D38).** The task stops for the owner only for a correctness failure or
  when it would have to change a recorded decision. A performance or availability observation (a cell without
  puzzles, a slow cell, a low request completion rate, many census estimates) is never a stop: it is a named item with
  its numbers in the shard table and the aggregate's lists, for MP12b2's record. The stops of the rule above are
  run-control failures for the orchestrator, not owner questions.
- Records are written once; nothing under `docs/difficulty-v3/landscape-v3/`, `baseline-v2/` or the earlier records is
  edited. UTF-8 without BOM, CRLF (normalise tool-written files before the hand-off), no absolute path in a record.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md` or the reports.

## Inputs & context

- Knobs and caps: read `SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID` (`core/engine/policy.js`) and `SHARES`
  (`core/engine/levels.js:18`) from the tree; they are MP12a's final values (its record §9 "Handoff" and §6, round 2):
  `SCORE_V3` `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 3]`, `weights { G: 5, info: 0.5 }`, `penalty { few: 1,
  many: 2 }`; `DEDUCE.census` 80,000,000, the other `DEDUCE` fields, `K60`, `SHARES`, `POLICY_ID` (`mixed-v2`) and
  `STALL_LIMIT` (12) unchanged since MP06b and MP07.
- MP12a's record `docs/difficulty-v3/calibration-slice-<date>.md` and its final round folder
  `docs/difficulty-v3/landscape-v3/r2/` (18 reports, source digest `34cea386…`, the round-2 tuple); MP09d2's record
  `docs/difficulty-v3/d21-v3-2026-11-12.md` (§2 the Hell outcomes, §4 the availability probe, §6 the cells v3 could
  not make and how long each request ran).
- The landscape matrix (`tools/bench/calibration-reference.js:214`, `buildLandscapeMatrix`): at `a85ed55` and still at
  `55c0c61` 105 cases on 16 boards (25 of them Hell cases) — 6x10 (6 levels), 3x29 (7), 10x10 (6), 12x12 (6), 14x14
  (7), 15x15b10 (7), 16x16 (6), 15x20 (7), 18x18 (7), 18x20 (6), 20x20 (6), 20x21 (6), 32x15 (7), 22x22 (7), 24x24
  (7), 26x26 (7); every case rotation 0, uniqueness `any`, quantity 10, seed `landscape/<case id>/<rep>`. List them:

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
- **Hell cases** (D36 decided (i) and the Hell population of owner decision P-OD9, which changes D37 (c); cross-review
  TP08), after all other cases:
  1. **Prescreen** all 25 Hell cases: `$seeds = 3`, published as `<case>-s3-<date>` (about 6 minutes per case when
     every request fails; about 2.5 hours in all). The cases, with their active cells: Hell 1 on 14x14 (196),
     15x15b10 (215), 16x16 (256), 15x20 (300), 18x18 (324), 18x20 (360), 20x20 (400), 20x21 (420), 32x15 (480), 22x22
     (484), 24x24 (576) and 26x26 (676); Hell 2 on the nine boards from 15x20 to 26x26; Hell 3 on 32x15, 22x22, 24x24
     and 26x26.
  2. **The run plan (P-OD9)**, from the prescreen table (case, active cells, requests, accepted puzzles, failure
     reasons, minutes):
     - every case with at least one accepted puzzle in its prescreen: `$seeds = 20`, published as `<case>-<date>`,
       like any other case;
     - every other case stays at its prescreen: its `-s3` report is its evidence, labelled "reduced (P-OD9): no puzzle
       observed in 3 requests". It is not run again and not offered after MP12b3 (no boundary case: the 20-request
       boundary run of D37 (c) is dropped where the prescreen made nothing).
  3. Write the prescreen table and the run plan into the shard table, then run the plan; no answer is needed.
- **Expected from MP09d2's record** (`docs/difficulty-v3/d21-v3-2026-11-12.md` §4 and §6; a projection, never a
  reason to skip a prescreen): Hell 1 was made only on the 164-cell board (13 x 13 with 5 blocked; 2 of 3 attempts),
  not on 300 cells (15x20, 14 set attempts), 400 or 484 cells, where every profile was capped; Hell 2 was not made on
  the 266-cell board (19 x 14: rated profiles, all above the band) nor on 300, 324, 400 or 484 cells; Hell 3 on none
  of 450, 480, 484 or 576 cells (all capped). Puzzles are therefore expected, if at all, only for Hell 1 on 14x14,
  15x15b10 and 16x16, so at most three 20-request Hell runs.
- Never run a case twice with 20 requests; never delete a `-s3` report (it is a record).
- Record per invocation in `shards-<date>.md`: the published name, start, end, seconds, launcher exit, the checkpoint
  rows after it (the launcher's last line) and the lock wait; per case the publish line (publication deletes the
  staged checkpoint).
- **Reuse of the slice by source identity** (cross-review TP25): for each of the 18 GV2 cases, MP12a's final-round
  report `docs/difficulty-v3/landscape-v3/r2/<case>-<date>.json` counts as that case's evidence when its
  `meta.sourceDigest` equals the tree's and its `meta.versions` equal the tree's on the four keys `algo`, `policy`,
  `rng` and `model` (the identity command above, run before the first shard; the reports also carry `app`, which
  `currentVersions()` lacks: MP12a's record §1.1 item 1), and it ran with the same flags (`--profile landscape
  --workers 4 --seeds 20 --fresh-process`, the default `--max-active`). Equality of the measured identity is what
  matters: MP12a's `meta.sourceCommit` ends with `+uncommitted-changes`, because its knob edits were not committed
  while it measured; the shard table names MP12a's commit as the committed counterpart. At `55c0c61` the tree's digest
  is the reports' digest `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918` (checked by SA1 at the
  resume), so the 18 cases are reused unless a later commit changed a file of `SOURCE_FILES`. Otherwise run the case
  like the others.
- Wall time: expect about 3–8 hours for the cases that are not Hell, about 2.5 hours for the 25 Hell prescreens and
  up to about 40 minutes for each Hell case with a puzzle in its prescreen (expected at most three): about 7.5–12.5
  hours, plus the lock waits and 15 s per invocation. Write a projection into the shard table after the first 20 cases
  and again with the Hell run plan, and give both in the reply.

### The aggregation script `docs/difficulty-v3/landscape-v3-full/aggregate.mjs` (new; TP27)

A durable script (CRLF, `// @ts-check`), run as `node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --full
docs/difficulty-v3/landscape-v3-full --slice docs/difficulty-v3/landscape-v3/r2 --date <date>` or with
`--self-test`. It:

1. **Reads the prescreens first** (the protocol input; cross-review TP31): for each of the 25 Hell cases of
   `buildLandscapeMatrix({ seeds: 20 })`, exactly one prescreen `<case>-s3-YYYY-MM-DD.json` in the full folder itself
   (never its subfolders), validated like any selected report (step 4) with N = 3: `complete`, its rows of the case
   exactly the reps 0 to 2, none interrupted, the shared source identity. A Hell case without exactly one valid
   prescreen is `missing` or `invalid`, and its protocol cannot be derived: the script stops on the gap (step 5).
2. **Derives the protocol (P-OD9)** of each case from the prescreens only: N = 20 for a case that is not Hell; for a
   Hell case, N = 20 when its prescreen accepted a puzzle, else N = 3 ("reduced (P-OD9)"). No case is promoted to 20
   for any other reason (the boundary case of D37 (c) is dropped).
3. **Selects one report per case**, by name, never by reading every JSON file of a folder, in the folder itself (not
   its subfolders): for N = 20, the 20-request report `<case>-YYYY-MM-DD.json` of the full folder, else, for a GV2
   case, the slice report `<case>-YYYY-MM-DD.json` of the slice folder; for N = 3, the prescreen read in step 1. Two
   files that match one pattern are an error, and so is a 20-request report of a case whose protocol is N = 3 (a run
   outside the P-OD9 plan: `invalid`, reported). A prescreen of a case that needs 20 is read for the protocol but its
   runs are never appended to the aggregate's run list beside the selected 20-request report: its 3 requests are the
   first 3 of the 20 (same seeds), so appending both would count them twice (TP08).
4. **Validates every report it reads** (TP27), before the selection is used: the chosen report is `complete`; its
   rows of the case are exactly the reps 0 to N - 1 (a 3-request report never stands for a case that requires 20); no
   row is interrupted; every report read (the prescreens and the chosen reports, a reused slice report included) has
   the same `meta.sourceDigest` and `meta.versions`. Each case gets a status: `measured` (N = 20, valid), `reduced
   (P-OD9)` (N = 3, valid), `missing` (no report where the protocol needs one) or `invalid` (a report that fails a
   check). A partial or missing report is never a reduction and never becomes "no puzzle observed" evidence because
   its file exists.
5. **Stops on a gap**: when a case is `missing` or `invalid`, it prints the coverage table and exits 2 without writing
   the durable files; the task then runs the missing case or reports to the orchestrator (an unresolved measurement
   goes to the orchestrator before the lock).
6. **Otherwise** keeps the chosen reports' `runs`, calls `aggregateLandscape(runs, buildLandscapeMatrix({ seeds: 20 }))`
   and `renderLandscapeMarkdown(...)`, and writes, once and CRLF, into the `--full` folder (here
   `docs/difficulty-v3/landscape-v3-full/`; an ordered change round of MP12b2 passes its own folder, with the GV2
   reports in its subfolder `slice/` as `--slice`); it refuses to overwrite an existing aggregate:
   - `aggregate-<date>.json`: `{ aggregate, coverage, lists, source }` (`source` is the shared `sourceDigest` and
     `versions`; `coverage` has one entry per case in matrix order, `{ caseId, area, requiredN, reps, report, status,
     recorded, requested }`, with `area` the case's active cells, `report` the repository-relative path of the selected
     report JSON (null when none), `reps` the number of its completed distinct reps of the case, and `recorded` and
     `requested` the aggregator's own counts; MP12b2 reads `report` for its Hell companion, and MP12b2 and MP12b3 read
     `area`, `requiredN` and `status` for the Hell availability, check-list D39);
   - `aggregate-<date>.md`: the rendered landscape; then the **protocol coverage table** (every case id with its
     active cells, the required N, the completed distinct reps, the selected report, the status, and the shared
     aggregator's own `runs.recorded / runs.requested`, which stays "3 / 20" for a reduced case because the aggregate
     keeps its 20-request criteria; a note explains both); then the three lists below, each a table with board, area,
     level, requests, accepted puzzles, `requestCompletionRate` and the yield (MP12a's measures) and the v3 score
     summary (unavailable when `v3` is null).

The lists (exact rules; a missing value is unavailable, never 0, and never throws):

1. **Cells without a puzzle**: no selected run of the case accepted a puzzle (then `v3` is null); written "no puzzle
   observed in N requests" with N the protocol's requests (3 for a reduced Hell case), the failure reasons of its runs
   (`partialReason`) and, for a reduced case, "reduced (P-OD9)". This list is the input of MP12b2's Hell availability
   record; it never says "cannot be made".
2. **One-sided cells**: `v3 !== null`, a finite band (`level(id).max` finite), `v3.score.n > 0`, and
   (`v3.score.max < c - h` or `v3.score.min > c + h`), with `c = (min + max) / 2` and `h = (max - min) / 4` of
   `level(id)` (every accepted score lies on one side of the central half).
3. **Census cells**: `v3 !== null` and `v3.censored.share > 0.05` (P-OD1; for the full landscape a listed finding,
   PR-P1), each with its share; a share above 0.25 is marked "above 25 %" (MP12b2 puts that cell to the owner).

`--self-test` runs the selection, validation and list rules on synthetic reports, writes nothing, and exits 1 on any
difference:

- (a) a valid reduced zero-puzzle Hell cell (prescreen complete, reps 0-2, no puzzle): status `reduced (P-OD9)`, in
  list 1 as "no puzzle observed in 3 requests", the aggregator's "3 / 20" shown beside it;
- (b) a complete positive cell (reps 0-19 with puzzles): `measured`, not in list 1, lists 2 and 3 evaluated on its
  `v3`;
- (c) a missing cell, and an unfinished one (`complete: false`): `missing` and `invalid`, exit 2, nothing written;
- (d) a cell with `v3: null` given to lists 2 and 3: not listed and no exception (SA2's probe threw on the literal
  rule of the first text);
- (e) a Hell case whose prescreen made a puzzle but which has no 20-request report: `missing`;
- (f) the Hell cases of one level whose prescreens accepted no puzzle all require 3, the smallest of them included
  (no boundary case, P-OD9);
- (g) a Hell case whose prescreen accepted no puzzle but which also has a 20-request report: `invalid` (a run outside
  the P-OD9 plan), exit 2, nothing written;
- (h) a case whose prescreen made a puzzle, with its valid 20-request report: the aggregate's run list holds its 20
  runs once (`recorded` 20, not 23); its prescreen is read for the protocol only;
- (i) a Hell case without a prescreen: `missing` (its protocol cannot be derived), exit 2, nothing written;
- (j) a census cell with a share of 0.30: in list 3, marked "above 25 %".

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
   then the run plan of P-OD9, written into the shard table with the prescreen table: the 20-request runs of the Hell
   cases whose prescreen made a puzzle); project the remaining time after 20 cases; keep the shard table.
3. Aggregate (one validated report per case); on exit 2, run the missing case or report it; then the aggregate files
   with the protocol coverage table and the three lists.
4. The quick set under the lock; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b1-B01 | The whole offered landscape is measured with v3, with coverage, request completion rates, times, census estimates and the proved-guess rule, and kept even where availability is poor (Hell cases by P-OD9: 20 requests where the prescreen made a puzzle; the others the 3-request prescreen, labelled reduced) | the aggregate files; the shard table |
| MP12b1-B02 | The cells without a puzzle ("no puzzle observed in N requests"), the cells that never reach the central half of their band and the cells with too many census estimates (above 25 % marked) are listed with their numbers, ready for MP12b2's record, its owner questions and MP12b3's Hell availability | the three lists |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b1-T01 | Every shard ran through MP12a's launcher under the lock helper, each invocation in the shard table (times, launcher exit, rows, lock wait), every resume the identical command after exit 3; every report was published once by `launch.mjs publish`; no checkpoint of a published case is left and none was deleted before publication | the shard table; `git status` |
| MP12b1-T02 | The aggregation script reads and validates the 25 prescreens first and derives the P-OD9 protocol from them alone, then takes exactly one validated report per case by its rules (a prescreen is never appended beside the 20-request report of the same case; one source identity across every report read, reused slice reports included; TP31), uses the tools' `aggregateLandscape` over their runs and the full matrix, writes the protocol coverage table with each case's area, and its lists guard null values (TP27); it wrote nothing while a case was missing or invalid | `aggregate.mjs`; the aggregate files |
| MP12b1-T03 | The quick set (under the lock) and `npm run check` pass; the folder's files are CRLF without BOM | command output |
| MP12b1-T04 | The 25 Hell prescreens ran before any other Hell run; every Hell case with a puzzle in its prescreen has a 20-request report; every other Hell case is reduced (P-OD9) and has no 20-request report | the shard table; the coverage table |
| MP12b1-T05 | `aggregate.mjs --self-test` passes its cases (a) to (j); a slice report was reused only by equal source identity (digest and the four version keys), with MP12a's commit named | command output; the shard table |

## Test plan

### Exact commands

The shards as written above. Then:

```powershell
node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --self-test
if ($LASTEXITCODE -ne 0) { throw 'aggregation self-test failed' }
$k = 2   # MP12a's final round (its record §6 and §9)
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
  apart, the summary of the per-board results, the Hell run plan (the prescreen table and the 20-request runs), the
  reduced Hell cases, the three lists and the named items (P-OD9: performance and availability observations with
  their numbers, no owner question).
- Handoff to MP12b2: the aggregate files and the shard table; the three lists; the source identity the landscape ran
  on (`sourceDigest`, `versions`) and its commit.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP12b1: Full landscape with v3 (gate GL-P3, full part)`) |
| Start | 2026-11-13 21:15 (+07:00) |
| End | 2026-11-14 10:08 developer; 10:32 orchestrator commit |
| Duration | 12 h 52 min developer, almost all machine time: 229 launcher invocations, 38,022 s (10.56 h) of machine time under the lock (20,475 s for the 62 non-Hell cases, 8,920 s for the 25 Hell prescreens, 8,627 s for the three 20-request Hell runs); lock waits 4,132 s (longest 330.8 s) while the Sudoku repository ran its recovery steps; about 20 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 288 model calls; 77,508,495 input tokens (77,089,312 cache reads); 194,448 output tokens |
| AI credits | about 1,070 (developer) |
| Verification | Developer: every shard through `launch.mjs` under `Invoke-Dv3Timed`, exits 0 or 3, none stopped at 590 s; 90 reports published once, no checkpoint left; source digest `34cea386…` in all 105 reports (18 slice reports reused by equal digest and version keys); `aggregate.mjs --self-test` 34/34; a dry run with three cases missing exited 2 and wrote nothing; quick set 1,340/1,340 (23.3 s) under the lock; `npm run check` OK; format checks of the folder. Orchestrator re-run: quick set exit 0 (23.4 s, lock wait 0 s); `npm run check` OK; `aggregate.mjs --self-test` 34/34; `git status` shows only the new folder besides the analysts' documents |
| Acceptance | MP12b1-B01, B02 and T01..T05 met. 105 cases: 62 non-Hell measured with 20 requests, 18 reused from the slice, 25 Hell prescreens (3 requests); prescreens with a puzzle: 14x14 Hell 1 (1 puzzle), 24x24 Hell 1 (2), 26x26 Hell 1 (25), each run again with 20 requests: 5 puzzles and 0 % complete, 13 and 0 %, 134 and 45 % complete; the other 22 Hell cases reduced (P-OD9, no 20-request run). Lists: no puzzle 22 cells (the reduced Hell cases); never central 0; census estimates above 5 % in 31 cells, above 25 % in 20 (all 15 Nightmare cells, 24x24 and 26x26 Master, the three Hell 1 cells with puzzles). C3 holds (`provedZero` 0 in all 83 cells with v3 data); C4 is list 3; C1, C2, C5 remain MP12a's on the reused slice |
| Issues & resolutions | Named items (shard table §5), for MP12b2: (1) seven non-Hell cells below 90 % request completion: 6x10 very-easy 65 %, 6x10 easy 85 %, Nightmare 12x12 85 %, 14x14 55 %, 15x15b10 55 %, 16x16 75 %, 15x20 75 %; (2) Hell 1 availability is not contiguous (puzzles on 14x14, 24x24 and 26x26, none on 15x15b10 to 22x22) and no Hell case reaches 90 % (best 45 %); (3) 70 of 1,726 requests exceeded `TIME.responseMs` 120 s (maximum 229 s), cause not investigated; (4) the tools' "Outcome: blocked" counts a reduced case's 3 requests against 20 and applies the old reference timing bounds (noted in the aggregate); (5) MS05b3 (Sudoku) ran short cells without the lock during 22 of these cases (112 windows, 351 s): no conclusion can move (SA1), recorded with a re-run safeguard in MP12b2's dispatch addendum. The aggregate was regenerated once before hand-off to correct its note on reduced cases |
| Handoff | MP12b2 (after the owner's pause, P-OD11): the aggregate and the three lists (20 cells above 25 % census estimates are owner questions), the D39 data (Hell 1 meets the completion criterion nowhere), the named items above, and the overlap addendum. Owner decision P-OD11: Pentomino pauses after this part until the Sudoku repository reaches MS07e; PR-P2 asks the plan author for a time-complexity review |

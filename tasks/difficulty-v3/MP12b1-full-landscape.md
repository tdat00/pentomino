# MP12b1 — Full landscape with v3 (gate GL-P3, full part)

| Header | Value |
|---|---|
| ID | MP12b1 (second part of the report's MP12; MP12b2 adds the search evidence, the Hell report, the owner's questions and the lock) |
| Depends on | MP12a (accepted and committed: the knobs and caps after the slice, `docs/difficulty-v3/calibration-slice-<date>.md`, `docs/difficulty-v3/landscape-v3/`) |
| Estimated size | Small–Medium: about 100–250 changed lines (the aggregation output and the shard table; no code); about 30–45 minutes of developer work plus machine time: about 6–11 hours in shards of at most 10 minutes (the 25 Hell prescreens about 2.5 hours of it), plus the 20-request Hell runs of owner decision P-OD6 (D37 (c)): about 40 minutes for each boundary case (at most one per Hell level) and up to about 40 minutes for each Hell case whose prescreen made a puzzle |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (the full landscape, "kept even where availability is poor"), RES-26, RES-35; clarifications PROC-P1 (a), SA2-Q-P09 (branch A), P-OD1 and P-OD3, P-OD5 (D36) in part H, Part I D37, answered (c), with owner decision P-OD6 in part H (the Hell population; cross-review TP08); check-list §4.2 D21, D29, D36, D37 |
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
  shards; the 18 cases of MP12a's final round reused when the code and knobs are unchanged.
- The shard table `docs/difficulty-v3/landscape-v3-full/shards-<date>.md` and the aggregation
  `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json` and `aggregate-<date>.md` with the three lists.

### Out of scope

- The search evidence, the Hell report, the owner's questions, the record `calibration-<date>.md`, design §7.8 and
  the lock (MP12b2).
- Any knob, cap, `K60`, `SHARES`, area or algorithm change (RES-25; MP12b2's ordered change round, if any).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Heavy runs exactly as written below. **Announce every batch of shards to the orchestrator before starting it** (the
  Sudoku repository runs in parallel on the same machine; never two heavy runs at once): list the cases of the batch and
  the expected wall time, and start only when the orchestrator says the machine is free. A batch is at most about 60
  minutes; every command runs attached and finishes within 10 minutes; a shard that would not is stopped (stop the
  attached command, or its process by PID; the row in progress is lost, the finished rows stay in the checkpoint) and
  resumed later by the same command. Never delete a checkpoint of an unfinished shard.
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
- The landscape matrix (`tools/bench/calibration-reference.js:214`, `buildLandscapeMatrix`): at HEAD `7604eff` 105
  cases on 16 boards — 6x10 (6 levels), 3x29 (7), 10x10 (6), 12x12 (6), 14x14 (7), 15x15b10 (7), 16x16 (6), 15x20
  (7), 18x18 (7), 18x20 (6), 20x20 (6), 20x21 (6), 32x15 (7), 22x22 (7), 24x24 (7), 26x26 (7). List them:

  ```powershell
  node -e "import('./tools/bench/calibration-reference.js').then(m=>console.log(m.buildLandscapeMatrix({seeds:20}).cases.map(c=>c.id).join('\n')))"
  if ($LASTEXITCODE -ne 0) { throw 'case list failed' }
  ```

  Use the printed list (a difference from 105 is recorded, not forced). A case is a Hell case when its level id
  starts with `hell-`.
- The tools (MP11): the reports carry, per accepted puzzle, `clues`, `U`, the score, `level`, `censored` and the v3
  metric subset; per cell, `v3` (score summary `{ n, min, median, p95, max }`, G, Cmax, tier and solution
  histograms, census estimates, `provedZero`) and `sampledUnrateable`; the Markdown has the v3 table.
  `aggregateLandscape(runs, matrix)` and `renderLandscapeMarkdown(...)` (`tools/bench/calibration-reference.js`)
  aggregate any set of run records.

### Shards (gate GL-P3, full part)

One case per shard:

```powershell
node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "^16x16-hard$" --output docs\difficulty-v3\landscape-v3-full\16x16-hard
if ($LASTEXITCODE -ne 0) { throw 'GL-P3 full shard 16x16-hard incomplete' }
```

- Order: smallest boards first, and within a board from the lowest level; the large boards last; the Hell cases after
  all others.
- **Hell cases** (D36; D37 answered (c), owner decision P-OD6; cross-review TP08), after all other cases:
  1. **Prescreen** all 25 Hell cases: `--seeds 3` with `--output docs\difficulty-v3\landscape-v3-full\<case>-s3`
     (about 6 minutes per case when every request fails; about 2.5 hours in all). The cases, with their active
     cells: Hell 1 on 14x14 (196), 15x15b10 (215), 16x16 (256), 15x20 (300), 18x18 (324), 18x20 (360), 20x20 (400),
     20x21 (420), 32x15 (480), 22x22 (484), 24x24 (576) and 26x26 (676); Hell 2 on the nine boards from 15x20 to
     26x26; Hell 3 on 32x15, 22x22, 24x24 and 26x26.
  2. **The run plan (P-OD6)**, per Hell level, from the prescreen table (case, active cells, requests, accepted
     puzzles, failure reasons, minutes):
     - every case with at least one accepted puzzle in its prescreen: `--seeds 20` into
       `docs\difficulty-v3\landscape-v3-full\<case>` like any other case;
     - the **boundary case**, the case with the fewest active cells among the level's cases whose prescreen accepted
       no puzzle: `--seeds 20` into `<case>` (about 40 minutes when every request fails). Exactly one per level, none
       when every prescreen of the level made a puzzle; when its 20 requests make a puzzle, it is reported with its
       hit rate and no further boundary case is run (P-OD6 names one per level);
     - every other case stays at its prescreen: its `-s3` report is its evidence, labelled "reduced (D37, P-OD6): no
       puzzle observed in 3 requests" and read with the boundary case of its level.
  3. Report the prescreen table and the run plan to the orchestrator with the announcement of the next batch, then
     run the plan; no further answer is needed.
- **Expected from MP09d2's record** (`docs/difficulty-v3/d21-v3-2026-11-12.md` §4 and §6; a projection, never a
  reason to skip a prescreen): Hell 1 was made only on the 164-cell board (13 x 13 with 5 blocked; 2 of 3 attempts),
  not on 300 cells (15x20, 14 set attempts), 400 or 484 cells, where every profile was capped; Hell 2 was not made on
  the 266-cell board (19 x 14: rated profiles, all above the band) nor on 300, 324, 400 or 484 cells; Hell 3 on none
  of 450, 480, 484 or 576 cells (all capped). Puzzles are therefore expected, if at all, only for Hell 1 on 14x14,
  15x15b10 and 16x16, and the boundary cases are expected to be one of these or 15x20 for Hell 1, 15x20 for Hell 2
  and 32x15 for Hell 3.
- Never run a case twice with 20 requests; never delete a `-s3` report (it is a record).
- Record per shard in `shards-<date>.md`: command, start, end, duration, exit code, runs recorded; after a case
  completes, delete its `.checkpoint.jsonl`.
- **Reuse of the slice**: for each of the 18 GV2 cases, if MP12a's final round ran on the same code and knobs (the
  report's `versions` and `sourceDigest` equal those of a full-landscape shard of this task, and `git log` shows no
  change of `core/` since that round), its report counts as that case's evidence; say so in the shard table.
  Otherwise run the case like the others.
- Wall time: expect about 3–8 hours for the cases that are not Hell, about 2.5 hours for the 25 Hell prescreens,
  about 40 minutes for each boundary case (at most three, about 2 hours) and up to about 40 minutes for each Hell case
  with a puzzle (expected at most three). Give the orchestrator a projection after the first 20 cases and again with
  the Hell run plan.

### The aggregation

A scratch script `tests/artifacts/MP12b1/aggregate.mjs` takes **one report per case**, chosen by this rule and printed
in the coverage table: the report written with `--output docs\difficulty-v3\landscape-v3-full\<case>` (20 requests)
when it exists; else the one written with `--output ...\<case>-s3` only for a Hell case that P-OD6 leaves at 3
requests (no puzzle in its prescreen and not the boundary case of its level); else the reused slice report of the
case (above). A `-s3` report of a case that also has a 20-request report is never read: its 3 requests are the first
3 of the 20 (same seeds), so reading both would count them twice (TP08). Never select reports by listing every JSON
file of the folder. A case without a report is listed as missing.
The script keeps the chosen reports' `runs` and calls `aggregateLandscape(runs, buildLandscapeMatrix({ seeds: 20 }))`
and the Markdown renderer. It writes (durable, CRLF):

- `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json`: the aggregate object.
- `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.md`: the rendered landscape, then a coverage table (every case
  id with runs recorded / requested; the boundary and the reduced Hell cases marked, each reduced case with the
  boundary case of its level), then the three lists below, each as a table with board, area, level, requests,
  accepted puzzles, the hit rate and yield fields MP12a used, and the v3 score summary.

The lists (exact rules):

1. **Cells without a puzzle**: no run of the case accepted a puzzle; written "no puzzle observed in N requests" with N
   the requests of the chosen report (3 for a reduced Hell case), the failure reasons of its runs and, for a reduced
   case, "reduced (D37, P-OD6)" with the boundary case of its level and that case's result. This list is the input of
   MP12b2's owner question; it never says "cannot be made".
2. **One-sided cells**: a finite band (`level(id).max` finite), `v3.score.n >= 1`, and `v3.score.max < c - h` or
   `v3.score.min > c + h`, with `c = (min + max) / 2` and `h = (max - min) / 4` of `level(id)` (every accepted score
   lies on one side of the central half; input of MP12b2's stall re-examination).
3. **Census cells**: `v3.censored.share > 0.05` (P-OD1).

## Files to create/modify

| File | Change |
|---|---|
| `docs/difficulty-v3/landscape-v3-full/` (new) | the shard reports, `shards-<date>.md`, `aggregate-<date>.json`, `aggregate-<date>.md` |

Exclusive ownership while active: the folder above; scratch under `tests/artifacts/MP12b1/`. Documentation slot: none
(the measured parameters and the lock are MP12b2's). Must not edit: code, tests, fixtures, MP12a's record and
folders, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`.

## Implementation steps

1. List the cases; decide the slice reuse; announce the first batch.
2. Run the batches (Hell cases last: the 25 prescreens, then the run plan of P-OD6, reported with the prescreen
   table: the 20-request runs of the Hell cases with a puzzle and of the boundary case of each Hell level); project
   the remaining time after 20 cases; keep the shard table.
3. Aggregate (one report per case, by the selection rule); write the aggregate files with the coverage table and the
   three lists.
4. `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b1-B01 | The whole offered landscape is measured with v3, with coverage, hit rates, times, census estimates and the proved-guess rule, and kept even where availability is poor (Hell cases by P-OD6: 20 requests where the prescreen made a puzzle and for the boundary case of each level; the others the 3-request prescreen, labelled reduced) | the aggregate files; the shard table |
| MP12b1-B02 | The cells without a puzzle ("no puzzle observed in N requests"), the cells that never reach the central half of their band and the cells with too many census estimates are listed with their numbers, ready for the owner's questions of MP12b2 | the three lists |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b1-T01 | Every case has a complete report (or a reduced Hell prescreen report as P-OD6 allows, or an incomplete cell listed); every shard is in the shard table; no checkpoint of a finished case is left | the shard table; `git status` |
| MP12b1-T02 | The aggregation takes exactly one report per case by the selection rule (never a `-s3` report beside the 20-request report of the same case), uses the tools' `aggregateLandscape` over their runs and the full matrix; reused slice reports and reduced Hell cases are named; the lists follow their exact rules | scratch script; the aggregate files |
| MP12b1-T04 | The 25 Hell prescreens ran before any other Hell run; every Hell case with a puzzle in its prescreen and exactly one boundary case per Hell level (the fewest active cells among the level's cases without a puzzle; none when every prescreen of the level made a puzzle) have a 20-request report; every other Hell case is reduced, with its boundary case named | the shard table; the coverage table |
| MP12b1-T03 | `npm run test:quick` and `npm run check` pass; the folder's files are CRLF without BOM | command output |

## Test plan

### Exact commands

The shards as written above (announced batches). Then:

```powershell
node tests\artifacts\MP12b1\aggregate.mjs
if ($LASTEXITCODE -ne 0) { throw 'aggregation failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the coverage, the total machine time, the summary of the
  per-board results, the Hell run plan (the prescreen table, the boundary cases), the reduced Hell cases and the three
  lists.
- Handoff to MP12b2: the aggregate files and the shard table; the three lists; the revision the landscape ran on.

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

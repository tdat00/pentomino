# MP12b — Full landscape with v3, the final evidence and the lock

| Header | Value |
|---|---|
| ID | MP12b (second part of the report's MP12; the **lock** of the v3 rating and generation) |
| Depends on | MP12a (accepted and committed: the knobs and caps after the slice, `docs/difficulty-v3/calibration-slice-<date>.md`, `docs/difficulty-v3/landscape-v3/`) |
| Estimated size | Medium: about 200–400 changed lines (the record, design §7.8; re-pins only if a change round is ordered); about 40–60 minutes of developer work plus machine time: the full landscape, about 3–8 hours in shards of at most 10 minutes |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (the full landscape, the record, the lock), RES-01 (what the lock means), RES-26, RES-35; clarifications PROC-P1 (a), SA2-Q-P09 (branch A), P-OD1 and P-OD3 (part H: their outcome is recorded here for the whole landscape); check-list §4.2 D21, D29 |
| Gates owned | GL-P3 (full landscape); GA-P2 (the final `npm test`); GF-P2 and GA-P2 again only in an ordered change round (check-list §7) |
| Implementation status | Not started |

## Goal & business context

MP12a made the 18 cells of the v2 baseline meet the owner's criteria. Before the v3 rating and the generation are
locked, the owner wants the evidence on the whole landscape the Generator offers: all 105 board-and-level cases on 16
boards, from 6 x 10 to 26 x 26 and from Very easy to Hell 3 (RES-25, SA2-4 JC07), kept "even where availability is
poor". This task runs it, writes the calibration record, updates the design document with the measured parameters,
and **locks**: after this task no knob, cap, rule, counter, clue-search setting, `SHARES` or `K60` may change without
a new model, algorithm or policy id and a new qualification (RES-01); MP13a to MP17 must not change any rating or
generated puzzle.

## Scope

### In scope

- Gate GL-P3, full part: the 105 cases of `buildLandscapeMatrix` with 20 repetitions, in shards; the 18 cases of
  MP12a's final round are reused when the code and knobs are unchanged.
- The record `docs/difficulty-v3/calibration-<date>.md` (the whole calibration: the slice rounds by reference, the full
  landscape, the final values, the lock).
- `docs/design-detail.md` §7.8 (measured v3 parameters and availability; the lock).
- The final full suite (GA-P2) and `record-fixtures --check` as the lock's evidence.

### Out of scope

- A knob or cap change, unless the orchestrator orders a change round after a finding (below).
- Any algorithm change (RES-25: not allowed without a new decision).

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
  `docs/difficulty-v3/landscape-v3/r<k>/` (18 reports).
- The landscape matrix (`tools/bench/calibration-reference.js:214`, `buildLandscapeMatrix`): at HEAD `7604eff` 105
  cases on 16 boards — 6x10 (6 levels), 3x29 (7), 10x10 (6), 12x12 (6), 14x14 (7), 15x15b10 (7), 16x16 (6), 15x20
  (7), 18x18 (7), 18x20 (6), 20x20 (6), 20x21 (6), 32x15 (7), 22x22 (7), 24x24 (7), 26x26 (7). List them:

  ```powershell
  node -e "import('./tools/bench/calibration-reference.js').then(m=>console.log(m.buildLandscapeMatrix({seeds:20}).cases.map(c=>c.id).join('\n')))"
  if ($LASTEXITCODE -ne 0) { throw 'case list failed' }
  ```

  Use the printed list (a difference from 105 is recorded, not forced).
- The tools (MP11): the reports carry, per accepted puzzle, `clues`, `U`, the score, `level`, `censored` and the v3
  metric subset; per cell, `v3` (score summary, G, Cmax, tier and solution histograms, census estimates,
  `provedZero`) and `sampledUnrateable`; the Markdown has the v3 table. `aggregateLandscape(runs, matrix)` and
  `renderLandscapeMarkdown(...)` (`tools/bench/calibration-reference.js`) aggregate any set of run records.

### Shards (gate GL-P3, full part)

One case per shard:

```powershell
node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "^22x22-hell-3$" --output docs\difficulty-v3\landscape-v3-full\22x22-hell-3
if ($LASTEXITCODE -ne 0) { throw 'GL-P3 full shard 22x22-hell-3 incomplete' }
```

- Order: smallest boards first, and within a board from the lowest level; the large boards and the hell levels last
  (their requests may use the full time limit of about 2 minutes each, so one case can need several resumed shards).
- Record per shard: command, start, end, duration, exit code, runs recorded; after a case completes, delete its
  `.checkpoint.jsonl`.
- **Reuse of the slice**: for each of the 18 GV2 cases, if MP12a's final round ran on the same code and knobs (the
  report's `versions` and `sourceDigest` equal those of a full-landscape shard of this task, and `git log` shows no
  change of `core/` since that round), its report counts as that case's evidence; say so in the record. Otherwise run
  the case like the others.
- Wall time: the slice took MP12a's measured time for 18 cases; expect the full landscape to take about 3–8 hours.
  Give the orchestrator a projection after the first 20 cases.

### The aggregation and the record `docs/difficulty-v3/calibration-<date>.md`

A scratch script (`tests/artifacts/MP12b/aggregate.mjs`) reads every report JSON of `landscape-v3-full/` (and the
reused slice reports), keeps their `runs`, and calls `aggregateLandscape(runs, buildLandscapeMatrix({ seeds: 20 }))`
and the Markdown renderer. The record (English, CRLF) contains:

1. Header: date, code revision, Node version, CPU count, the final knobs and caps (as literals), the commands, the
   shard table (or its summary with a link to an appendix table), total machine time.
2. Coverage: every case id with its runs recorded / requested; incomplete cells listed (never skipped silently).
3. Per board and level: the request in-band rate (hit rate), the yield, T10 median and p95, peak memory, the v3
   score distribution (median, p95), the G, `info`, Cmax, `deductionTier` and `solutions` distributions, the
   census-estimate share, `provedZero` (must be 0), unrateable samples, partial and incomplete outcomes.
4. The criteria of RES-25 on the GV2 boards (from MP12a's final round, by reference with the numbers) and, for the
   other boards, the level ordering and the Hard and Expert hit rates as reported facts (no baseline exists: never
   compared with an invented one).
5. P-OD1 (census estimates per cell over the whole landscape against the 5 % rule), P-OD2 (capped paths: none, or the
   cells), P-OD3 (the penalty outcome of MP12a).
6. The final values and every change since MP08 (from MP12a's record), with the reasons.
7. The lock statement (RES-01; below).
8. Findings for the owner (cells with poor availability, orderings that fail outside the GV2 boards, census estimates
   above 5 %, long times), or "none".

### Findings and an ordered change round

A finding is reported in the reply before the lock; the orchestrator decides. If it orders a change round: the change
(within the ranges of RES-18 and SA2-Q-P09 branch A, as MP12a's "Choosing a change"), the knob-dependent re-pins, the
affected cells and the 18 slice cases again under `landscape-v3-full/change-1/`, then GF-P2
(`node tools\record-fixtures.mjs --replace --reason "P3: v3 calibration (final)"`, `--check`) and GA-P2; all of it
recorded. Without an order, nothing changes.

### The lock (RES-01, RES-25)

- Evidence: `node tools\record-fixtures.mjs --check` passes and `npm test` passes (GA-P2, final) on the locked tree;
  `git --no-pager diff --stat` shows no change under `core/` or `tools/` in this task (unless a change round ran).
- Statement, in the record and in design §7.8: "The `difficulty-v3` rating (`SCORE_V3`, `DEDUCE`), the clue search
  (`gen-v3`), `K60`, `SHARES` and `POLICY_ID` are locked at <revision>. Any later change of a weight, a cap, a band, a
  rule of the deduction ladder, the census, a counter, the clue search, `SHARES` or `K60` needs a new model, algorithm
  or policy id and a new qualification."

### `docs/design-detail.md` §7.8 (after MP09d2's edits)

Replace the provisional sentence on the v3 knobs with the measured parameters: the final `SCORE_V3` and `DEDUCE`
values, `K60` and `SHARES` (unchanged or changed, with the reason), the hit rates and availability in two or three
sentences with a link to `docs/difficulty-v3/calibration-<date>.md`, the census-estimate share, and the lock
statement. §7.9 and §7.10 keep pointing to `policy.js` for the values (no copy of numbers that could drift).

## Files to create/modify

| File | Change |
|---|---|
| `docs/difficulty-v3/landscape-v3-full/` (new) | the shard reports |
| `docs/difficulty-v3/calibration-<date>.md` (new) | the record |
| `docs/design-detail.md` | §7.8 |
| knob values, re-pins, fixtures | only in an ordered change round (as MP12a) |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12b/`. Documentation slot: design
§7.8. Must not edit: algorithm code; MP12a's record and folders; `player/samples/sample-pack.json`,
`tests/fixtures/puzzlecode-v1.json`.

## Implementation steps

1. List the cases; decide the slice reuse; announce the first batch.
2. Run the batches; project the remaining time after 20 cases; keep the shard table.
3. Aggregate; write the record; report findings and wait for the orchestrator's decision.
4. Without a change round: `record-fixtures --check`, the final `npm test` (announced), design §7.8, the lock
   statement; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b-B01 | The whole offered landscape (105 cases) is measured with v3, with coverage, hit rates, times, census estimates and the proved-guess rule, and kept even where availability is poor | the record §2-§3 |
| MP12b-B02 | The owner's criteria hold on the GV2 boards, and every other cell is reported as a fact; findings reach the owner before the lock | the record §4, §8 |
| MP12b-B03 | The v3 rating and generation are locked, and the design document says what the lock means | the record §7; design §7.8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b-T01 | Every case has a complete report (or an incomplete cell listed); every shard is in the shard table; no checkpoint of a finished case is left | the record; `git status` |
| MP12b-T02 | The aggregation uses the tools' `aggregateLandscape` over all runs and the full matrix; reused slice reports are named | scratch script; the record |
| MP12b-T03 | `record-fixtures --check` and the final `npm test` pass on the locked tree; no `core/` or `tools/` change in this task without an ordered change round | command output; diff |
| MP12b-T04 | Design §7.8 has the measured parameters and the lock statement; `npm run test:quick` and `npm run check` pass; records CRLF without BOM | review; command output |

## Test plan

### Exact commands

The shards as written above (announced batches). Then:

```powershell
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
# announced: the final full suite (GA-P2), about 5-10 minutes
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the coverage, the total machine time, the summary of the
  per-board results, the findings and the lock revision.
- Handoff to MP13a to MP17: the lock revision; from now on no rating or generated puzzle may change (check-list §6);
  MP17 compares its final evidence with this record.

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

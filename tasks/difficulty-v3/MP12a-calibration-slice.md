# MP12a — Calibration slice: the GV2 cases again with v3, and the knob changes

| Header | Value |
|---|---|
| ID | MP12a (first part of the report's MP12; MP12b1 runs the full landscape, MP12b2 the search evidence and the lock) |
| Depends on | MP11 (accepted and committed: the landscape records carry the v3 measures; the slow test exists); MP09d2 (v3 active); MP06b and MP06c (the GV2 baseline, the probe and fit records) |
| Estimated size | Medium: about 200–500 changed lines (knob values and their pins, re-pinned v3 tables, the record); about 45–60 minutes of developer work plus machine time: 30–60 minutes per round, at most three rounds |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (run, criteria, what P3 may change), RES-18 (formula, invariants, the JR-P3 ranges), RES-05 and C5 (the 5 % census rule), RES-10 (caps), RES-14 (regenerated requests, here captured once per round), RES-26 (v3 tests), RES-35 (AR1); clarifications PROC-P1 (a), SA2-Q-P09 (branch A), JR-P3, **P-OD1** (census 10,000,000 revisited here), **P-OD2** (work 760,000,000 accepted), **P-OD3** (the penalty re-examined here), **P-OD5** (D36: cells v3 cannot make) in part H, Part I D21 and D36; check-list §4.2 D19, D21, D29, D36; cross-review SP06, SP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) |
| Gates owned | GL-P3 (slice), and GF-P2 and GA-P2 again when this task changes a knob (check-list §7) |
| Implementation status | Not started |

## Goal & business context

The owner asked that Hard be really hard, and that the levels be measured and fitted before they are locked
(PROC-P1 (a)). The knobs of the v3 score were fitted in MP06c on puzzles that the v2 generator had made; now v3 makes
the puzzles itself (aiming at the centre of the band, MP07, and requiring a proved real choice at Hard and above,
MP09c). This task measures the same 18 board-and-level cells as the v2 baseline (GV2), compares them, checks the
owner's criteria, and changes the knobs within the approved ranges where a criterion fails, recording every change
with its before and after data.

Three owner decisions are revisited here (part H of `clarifications.md`): **P-OD1** — the census budget stays at
10,000,000 and is revisited at this calibration on v3-generated puzzles (by the 5 % rule of C5); **P-OD2** — the work
cap 760,000,000 is accepted (it stays unless a capped path appears); **P-OD3** — the initial fit switched the few/many
penalty off, (0, 0), against the intent of SA1-Q-P1 ("the few/many penalty stays"): this task re-examines the penalty
on v3-generated puzzles and reports the comparison.

## Scope

### In scope

- Gate GL-P3, slice part: the 18 GV2 cases with v3, in rounds; `rate-probe` on the regenerated matching requests.
- The criteria evaluation per round; the knob search within the ranges; the changes (`SCORE_V3`, `DEDUCE`, and `K60`,
  `POLICY_ID` or `SHARES` only when needed, SA2-Q-P09 branch A) with their pins.
- After the last knob change of this task: the re-pins of the knob-dependent v3 tests, then GF-P2 and GA-P2.
- The record `docs/difficulty-v3/calibration-slice-<date>.md`; the landscape reports under
  `docs/difficulty-v3/landscape-v3/`.

### Out of scope

- The full landscape (MP12b1), the search evidence, the Hell report and the lock (MP12b2); the design document's
  measured values of §7.8 (MP12b2 writes them once, after the lock).
- Any algorithm change: a new estimator, a multi-order aggregation, dropping a diagnostic, a carving redesign, moving
  band edges — not allowed without a new decision (RES-25). A knob outside its range needs a new answer from the plan
  author: stop and report.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Heavy runs: the landscape shards, the probe runs, the slow test, `tools/record-fixtures.mjs` and `npm test`, exactly
  as written below. **Announce each round to the orchestrator before starting it** (the Sudoku repository runs in
  parallel on the same machine; never two heavy runs at once): list the shards and probe commands of the round and the
  expected wall time (30–60 minutes), and start only when the orchestrator says the machine is free. Every command
  runs attached and finishes within 10 minutes; a shard that would not is stopped after its current row and resumed
  by the same command (its checkpoint makes it resumable).
- Records are written once and never overwritten: each round has its own folder; a correction is a new file.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md`, the reports, the earlier records (`probe-2026-11-12.md`, `fit-2026-11-12.md`,
  `baseline-v2/`, `probe-corpus-2026-11-12/`) or `docs/calibration/`. UTF-8 without BOM, CRLF (normalise every
  tool-written JSON and Markdown before the hand-off), no trailing whitespace, no absolute path in a record.

## Inputs & context

### Values at the start (read them from the tree; do not assume)

- `SCORE_V3` in `core/engine/policy.js` (written by MP08 from `docs/difficulty-v3/fit-2026-11-12.md` §3 and the owner's
  P-OD3 (a)): expected `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 2]`, `weights { G: 5, info: 0.5 }`, `penalty {
  few: 0, many: 0 }`.
- `DEDUCE` (MP06b, pinned in `tests/policy.test.js`): `{ lookaheadWidth: 4, nodes: 30000, solutions: 8, work:
  760000000, census: 10000000, memoryBytes: 33554432 }`.
- `K60` (`core/engine/policy.js`, `const K60 = [6, 7.5, 8.5, 10, 11.5, 13, 16, 24, 32, 43, 58, 78];`) and `POLICY_ID`
  (`'mixed-v2'`); `SHARES` (`core/engine/levels.js:18`, `const SHARES = [0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.14, 0.1,
  0.06, 0.04, 0.04];`).
- Findings to re-examine (`fit-2026-11-12.md` §8 and MP06c's log): the Normal-to-Hard margin is one point on three
  boards; `rule[2] = rule[3]`; four knobs sit on a range edge (`base.max` 12, `base.scale` 3, `weights.info` 0.5,
  penalty (0, 0)); the Hard hit rate of corpus A was capped by `Gproved` (12x12-hard 16/50, 18x20-hard 7/50); with
  uniqueness required, no v2-made 18 x 20 Hard, Expert or Master puzzle had a proved guess (20/20 `Gproved = 0`).

### The fit ranges and invariants (RES-18; JR-P3 (a), plan author)

Hard invariants: `base.max + max(rule) <= 16`; `rule[0] = rule[1] = 0 <= rule[2] <= rule[3]`;
`0 <= penalty.few <= penalty.many`; weights >= 0. Ranges: `base.max` 8-12, `base.scale` 3-12, `rule[2] <= rule[3]`
with `base.max + rule[3] <= 16`, `weights.G` 0-8, `weights.info` 0.5-6, `0 <= penalty.few <= penalty.many <= 8`.
What P3 may change (SA2-Q-P09 branch A): the `SCORE_V3` knobs within these ranges; the `DEDUCE` caps (RES-10); `K60`
and `SHARES` when needed to keep hit rates; every change recorded with before and after data; a `K60` change bumps
`POLICY_ID` (for example `'mixed-v3'`, RES-01). A capped path stays unrateable whatever the caps (RES-04).

### The cases (GV2, RES-14)

The 18 cases of `docs/difficulty-v3/baseline-v2/` (`<case>-2026-11-12.json|.md`): 6x10, 10x10 and 12x12 with easy,
normal, hard, expert and master; 18x20 with hard, expert and master. List them with the command of MP06b
(`tasks/difficulty-v3/MP06b-probe-and-v2-baseline.md`, "Cases of GV2") and use the printed list.

### One round r (r = 0, 1, 2; at most three rounds in this task)

1. Shards (one case per shard; the output folder of the round keeps every report; nothing is overwritten):

   ```powershell
   node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "^6x10-easy$" --output docs\difficulty-v3\landscape-v3\r0\6x10-easy
   if ($LASTEXITCODE -ne 0) { throw 'GL-P3 slice shard 6x10-easy (r0) incomplete' }
   ```

   and the same for every case. Record per shard: command, start, end, duration, exit code, runs recorded. After a
   shard completes, delete its `.checkpoint.jsonl` (the report JSON keeps every run).
2. The probe corpus of the round ("The probe corpus of a round" below): capture the 90 requests once, rate the
   captured packs with the `prod` label, merge into the round's `final.jsonl`. Exit 2 of a capture marks a partial
   request and an identity mismatch is marked in the manifest: record both, never substitute (RES-14).
3. Evaluate the criteria below from the reports and the probe lines; write the round's section of the record.
4. If every criterion holds and the penalty question is settled, the round is final (no change). Otherwise choose a
   knob change (below), apply it, re-pin the knob-dependent unit tables first (see "Pinned tests"), run the
   between-round checks of "Test order around a knob change" (fixture-independent files and the slow test only), and
   start round r + 1. After round 2, a criterion that still fails is a finding for the owner: stop and report it with
   the data (SA2-Q-P09); do not start a fourth round.

### Criteria (RES-25; per round)

| ID | Criterion | How |
|---|---|---|
| C1 | Levels are ordered: on each of the four boards the median accepted v3 score strictly increases with the requested level | the accepted puzzles' scores of the round's reports (MP11's `details.puzzles[].score`) |
| C2 | Hard and Expert keep their hit rate: each Hard and Expert cell with a GV2 baseline has a hit rate of at least its GV2 hit rate minus 10 percentage points | hit rate = the report's request in-band rate (`requestInBandRate`: the share of the 20 requests that completed ten in-band puzzles), compared with the same field of `baseline-v2/<case>-2026-11-12.json`; also report the puzzle yield (accepted / 200) of both |
| C3 | Hard and above need a proved real choice | `v3.provedZero` is 0 in every cell (MP11), and the slow test passes |
| C4 | The census rule (C5, P-OD1): in every level and board cell, at most 5 % of the accepted puzzles are census estimates (`censored: true`) | MP11's `v3.censored.share` per cell |
| C5 | No capped path: no line of the round's `final.jsonl` is classified `capped` (these puzzles were rated complete at the same caps during generation, so a capped line is a defect to report), and no landscape sample is unrateable | `final.jsonl` (classified first, MP06b A1.3 step 1) and `sampledUnrateable` |

Also record per round (RES-25): per cell the distributions of G, `info`, Cmax, `deductionTier`, `solutions` and the
v3 score; the hit rate and yield; time per run (T10 median and p95) and the peak memory; the census-estimate,
partial and incomplete outcomes; the order-noise table from the `prod` lines (`--orders 5 --tie-orders 3`: per cell,
the spread of G and of the v3 score across orders, as in `probe-2026-11-12.md`); the probe manifest summary (requests,
exit codes, accepted puzzles, identity matches).

### The probe corpus of a round (cross-review SP06; MP06b Amendment A1, adapted)

Every observation of a round is made on packs captured once; nothing is regenerated for a rating run, and no output
file is ever overwritten.

- **Requests**: the 18 GV2 cases x reps 0-4 (90), request id `A-<case id>-r<rep>`, each generated exactly as
  `rate-probe --landscape` builds it (MP06b A1.1: `version` 1, the case's `boardRows`, `rotation`, `levelId`,
  `quantity` 10, `seedText` = `seedFor(case, rep)`, `batchIndex` 1, `batchSeed` = seedText + `#1`, the case's
  `uniqueness`, `versions` = `currentVersions()`) and captured with `node tools\generate.mjs --recipe <recipe file>
  --workers 4 --max-active <case maxActive> --output <pack file>`.
- **The round's corpus** (durable, written once): `docs/difficulty-v3/landscape-v3/r<k>/probe/packs/<request>.json`;
  `docs/difficulty-v3/landscape-v3/r<k>/probe/manifest.json` with the fields of MP06b A1.1 (one row per request, also
  for a request without puzzles; `identity.expected` = the `details.resultDigest` of the run with the same seed in this
  round's report `landscape-v3/r<k>/<case>-<date>.json`; `finalDeduce` = the six `DEDUCE` fields of the tree, the
  production tuple of the round); and `docs/difficulty-v3/landscape-v3/r<k>/probe/final.jsonl`, the `prod` lines merged
  as MP06b A1.5 (manifest order, then pack order; `request` and `corpus` in front; each request exactly `accepted`
  lines; `(request, puzzleId)` unique).
- **Labels** (outputs `tests\artifacts\MP12a\r<k>\runs\<label>\<request>.jsonl`: scratch, never overwritten; the
  label names the budget tuple, and the record gives each label's tuple):

  | Label | Packs | Options | Purpose |
  |---|---|---|---|
  | `prod` | all | `--orders 5 --tie-orders 3`, no `--deduce` | the authoritative lines of the round (`final.jsonl`), the order noise, C5 |
  | `cap-1g` | packs with a `capped` `prod` line | `--deduce '{"work":1000000000,"nodes":2000000}'` | cap inputs (C5) |
  | `cap-10g` | packs still `capped`, or with a count cutoff, under `cap-1g` | `--deduce '{"work":10000000000,"nodes":20000000}'` | the same, once more (A1's complete-diagnostic rule) |
  | `census-20m`, `census-40m`, `census-80m` | the packs of the cells above 5 % (C4) | `--deduce '{"census":X}'` with X = 20,000,000, 40,000,000, 80,000,000, in this order | the census budget (C4) |

- **Classification first** (MP06b A1.3 step 1): every line is `error`, `complete`, `capped` or `none`, and a
  `complete` line whose `deduction.search.stop` is `node-cap` or `work-cap` is a count cutoff. Only `complete` lines
  are read for `first` or `census`; a missing value is never read as 0; every table counts the other classes in their
  own columns.
- **The driver**: copy `tests/artifacts/MP06b/corpus.mjs`, `lib.mjs` and `run-logged.mjs` to `tests/artifacts/MP12a/`
  and adapt them: corpus A only; the round's folders (`CORPUS_DIR`, `RUNS_DIR`, `RECIPES_DIR` per round); `expected`
  from the round's report; the labels above. If those scratch files are gone, write the equivalent to MP06b
  Amendment A1 (A1.1, A1.2, A1.5, A1.6). Groups per board, so that each command stays under 10 minutes; expected
  about 10-20 minutes for the captures and 10-15 for `prod` per round.
- **The fit input** (C1, C2): copy `tests/artifacts/MP06c/fit.mjs` and `lib.mjs` to `tests/artifacts/MP12a/fit/`,
  set `CORPUS_DIR` to the round's `probe/` folder (its `loadData` checks the manifest, `finalDeduce` against the
  pinned `DEDUCE` and the `(request, puzzleId)` join) and the distance origin to `tupleOf(SCORE_V3)` of the tree (the
  current knobs, not MP06c's starting values); fit only the `complete` lines of requests whose `identity.match` is
  true, and list the others. If those scratch files are gone, write the equivalent to MP06c "The fit".
- **Verification under the chosen tuple**: a `DEDUCE` change is pinned in `policy.js` before the next round, whose
  `prod` label then measures it as the production tuple; a change chosen in round 2 cannot be verified in this task
  and is not made: report it.

### The stall stop and cells v3 cannot make (D21, D36)

- Report the `STALL_LIMIT` in force with its D21-V3 record (MP09d2, `docs/difficulty-v3/d21-v3-<date>.md`) and
  whether that record says "inert on the v3 corpus" (MP12b2 then re-examines the rule on the landscape). The slice has
  no Hell case.
- A GV2 cell that makes no puzzle in the final round, after the changes of this task, is a finding for the owner with
  the options of D36 (plan author, P-OD5): (i) stop offering the level for that board area (the plan author's
  recommendation for levels v3 cannot make), or (iii) a separate engine project; option (ii), a different contract,
  is defined for Hell levels only and does not apply here. The finding gives the cell, the v2 and v3 hit rates and
  yields, and why the requests failed (the report's failure reasons); MP12b2's search evidence adds the refused and
  unrateable profiles of the GV2 Hard, Expert and Master cells.

### Choosing a change (check-list D29)

- **C4 fails** (P-OD1): rate the captured packs of the failing cells with the labels `census-20m`, then `census-40m`,
  then `census-80m` (the override changes only the probe's measurement, never the generation); take the smallest
  budget at which every cell is at most 5 % (numerator: `complete` lines with `deduction.census.complete === false`;
  denominator: `complete` lines of the cell), and record the cost (deduction time median, p95 and maximum). If
  80,000,000 is not enough, keep 10,000,000 and report the cells to the owner (as D19). A new census value is a
  `DEDUCE` change, verified by the next round (above).
- **C5 fails** (P-OD2): for the packs with a `capped` `prod` line, run `cap-1g` and, for the packs still `capped` or
  with a count cutoff under it, `cap-10g`; set `work` and `nodes` by D19's rule (twice the largest main-search value
  of the complete diagnostic lines, `search.work - census.work` and `search.nodes - census.nodes`, rounded up to
  10,000,000 or 10,000) and record it; P-OD2's 760,000,000 stays unless that rule gives more. A line still `capped`
  under `cap-10g` is not an observed maximum: it gives no cap value and is an unresolved failure for the owner (D36,
  P-OD2); a count cutoff is a lower bound, left out of the maxima and listed. Unrateable landscape samples
  (`sampledUnrateable`) are reported per cell; their clue sets are not captured, so they are evidence for the owner,
  not cap inputs.
- **C1 or C2 fails**: re-score the `complete` lines of the round's `final.jsonl` with `breakdownV3(metrics, knobs)`
  (`core/engine/difficulty.js`, MP08) over the grid of MP06c (`tasks/difficulty-v3/MP06c-initial-fit.md`, "The
  fit": the same grid, the same hit definition including `Gproved >= 1` for Hard and above, the same constraint and
  lexicographic objective, but with **distance to the current knobs** instead of the starting values), through the
  fit input of "The probe corpus of a round". The best admissible set is the candidate. A re-score
  predicts, it does not prove: the next round measures it. When the knobs alone cannot meet C2 on a cell (the
  candidate's predicted hit rate stays below the bound), a change of `SHARES` (the level's initial clue share) or of
  `K60` (the piece count, with a `POLICY_ID` bump) may be tried in the next round; record the reason.
- **The penalty (P-OD3)**: in round 0, re-score the `complete` lines of `final.jsonl` with the current knobs and with
  the best set of the grid that has a nonzero penalty (`penalty.few >= 1`); if that set meets C1 and its predicted
  mean hit rate is at most 1 percentage point below the current knobs', make it the candidate of round 1 (the intent
  of SA1-Q-P1) and measure it; otherwise keep (0, 0). Either way the record gives the comparison (the two sets, their
  predicted and, when run, measured hit rates per cell), and the reply states it for the owner.

### Pinned tests (RES-26; check-list D23)

A knob change moves only the knob-dependent pins: `tests/policy.test.js` (`SCORE_V3` and, when changed, `DEDUCE`,
`K60`, `SHARES`, `POLICY_ID` pins), `tests/difficulty-v3.test.js` (the worked-example table of the knobs and the
recipes' v3 characterisation values: recompute them with `breakdownV3` from the pinned deduction values, never copy
an implementation's output without checking it against the formula), the v3 clue tests that MP09d2 listed as
knob-dependent, and, after GF-P2, the generation fixtures and `tests/fixtures/ui-flow-recipes.json` (check-list D21:
a UI-flow recipe that stops completing is reported and the orchestrator holds the commit until the owner decides).
Any other failing test is reported, not edited.

### Test order around a knob change (cross-review TP06)

The recorded generation fixtures and the UI-flow recipes keep the old knobs until GF-P2, which runs once, after the
final round. Before it, the files that read those fixtures or run the recorded recipe fail by design: a score or share
change moves the recorded keys and scores, and a `K60` or `POLICY_ID` change makes `checkRecipe`
(`tools/generate.mjs:276-279`) refuse the recipe at once. Re-pinning the unit tables cannot make them pass. So:

- **Between rounds** (after a change, before the next round), only these checks, and they must pass:

  ```powershell
  node --test --test-skip-pattern=slow tests\policy.test.js tests\difficulty.test.js tests\difficulty-v3.test.js tests\clues.test.js tests\tasks.test.js tests\worker-pool.test.js
  if ($LASTEXITCODE -ne 0) { throw 'between-round checks failed' }
  node --test --test-name-pattern="^slow: v3 generation" tests\difficulty-v3.test.js
  if ($LASTEXITCODE -ne 0) { throw 'slow v3 test failed' }
  ```

  These files read only static fixtures (`polyominoes.js`, `clue-recipes.js`, `hand-authored-pack.json` and the frozen
  `puzzlecode-v1.json`), never the generated ones. Do not run the fixture-dependent files below or `npm run
  test:quick` as a gate between rounds. A quick-set run between rounds is optional and is diagnostic output only: save
  it as `tests/artifacts/MP12a/r<k>-quick-diagnostic.txt`, never stop on it and never edit a test because of it.
- **After the final round, when a knob changed**: GF-P2, then the strict checks (the fixture-dependent files of
  MP09d2's Phase E, then the whole quick set), then GA-P2 by MP09d2's Phase F procedure (below). Everything after GF-P2
  must pass.
- **Without any knob change** there is no GF-P2 and no GA-P2; `npm run test:quick` must pass as it is.

### GF-P2 and GA-P2 (only when this task changed a knob)

After the last change of this task and its final round (announced; GF-P2 about 2 s per command, the fixture-dependent
files and the quick set about 2-4 minutes, GA-P2 about 5-10 minutes; each command under 10 minutes):

```powershell
node tools\record-fixtures.mjs --replace --reason "P3: v3 calibration (slice)"
if ($LASTEXITCODE -ne 0) { throw 'record-fixtures failed' }
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
git --no-pager diff --stat -- tests/fixtures player/samples

# strict after GF-P2: the fixture-dependent files, then the whole quick set
node --test --test-skip-pattern=slow tests\generate.test.js tests\cli.test.js tests\puzzlecode-cli.test.js tests\generation-client.test.js tests\calibration.test.js tests\benchmark-matrix.test.js tests\player-load.test.js tests\rate-probe.test.js tests\generator-state.test.js tests\generator-controller.test.js tests\pack.test.js
if ($LASTEXITCODE -ne 0) { throw 'fixture-dependent tests failed after GF-P2' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed after GF-P2' }

# GA-P2: the first run is kept as evidence; then the UI-flow migration; the final run is the verdict
New-Item -ItemType Directory -Force tests\artifacts\MP12a | Out-Null
npm test 2>&1 | Tee-Object -FilePath tests\artifacts\MP12a\ga-p2-first.txt
"GA-P2 first run: exit $LASTEXITCODE"
# Read the failures. Allowed: UI-flow expectations of recipes that completed (all quantity puzzles, no notice); migrate
# their expect.pieces, expect.puzzles and expect.scores in tests\fixtures\ui-flow-recipes.json. Anything else (a recipe
# that does not complete, a slow D36 test of tests\clues.test.js, any other test) stops the task here: report it (D21,
# D36).
node --test tests\generator-controller.test.js
if ($LASTEXITCODE -ne 0) { throw 'GA-P2: UI-flow recipes still fail after the migration' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'GA-P2: the final npm test failed' }
```

Stop and report if `npm test` approaches 10 minutes (AGENTS.md); do not raise a limit.

### The record `docs/difficulty-v3/calibration-slice-<date>.md`

1. Header: date, code revision per round, Node version, CPU count, the knobs and caps at the start, the `STALL_LIMIT`
   in force (with "inert on the v3 corpus" when MP09d2's record says so).
2. Per round: the shard table (command, start, end, duration, exit, runs), the probe corpus (the manifest summary,
   each label with its budget tuple, the commands and outcomes, the classification counts), the criteria table C1-C5
   (pass or fail with the numbers), the per-cell measures listed above, the GV2 comparison table (per cell: GV2 hit
   rate and yield, v3 hit rate and yield, difference, the C2 bound), and the order-noise table.
3. The changes: for each, the knob, the old and new value, the reason, the predicted and the measured effect.
4. P-OD1, P-OD2 and P-OD3: the outcome of each, with its numbers.
5. Findings for the owner (or "none"; a cell v3 cannot make with the D36 options), and the values handed to MP12b1.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/policy.js` | `SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID` values only (when changed) |
| `core/engine/levels.js` | `SHARES` values only (when changed) |
| `tests/policy.test.js`, `tests/difficulty-v3.test.js`, the knob-dependent clue tests (MP09d2's list, the replaced 15 x 20 slow test among them), `tests/fixtures/ui-flow-recipes.json` | re-pins (when a knob changed) |
| `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` | by the tool (GF-P2, when a knob changed) |
| `docs/difficulty-v3/landscape-v3/` (new) | the round folders `r0/`, `r1/`, `r2/` with the shard reports and each round's `probe/` corpus (`packs/`, `manifest.json`, `final.jsonl`) |
| `docs/difficulty-v3/calibration-slice-<date>.md` (new) | the record |
| `docs/design-detail.md`, `docs/design-brief.md` | only when a value changes (documentation slot) |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12a/`. Documentation slot
(cross-review SP07: the living documents describe the current values at every commit), only when this task changes a
value: design §7.8, one sentence saying that the knobs and caps in `core/engine/policy.js` are those of the slice
(link to the record; MP12b2 writes the measured parameters after the lock); for a `K60` or `SHARES` change, the
values that design §7.4 and §7.5 quote, and the brief's table "Levels and typical boards" (its example piece counts,
recomputed with `pieceCountRange(levelId, area)` of `core/engine/policy.js` for the boards and levels of the table).
Without a change: none. Must not edit: algorithm code, `player/samples/sample-pack.json`,
`tests/fixtures/puzzlecode-v1.json` (check-list D20).

## Implementation steps

1. Read the inputs; list the cases; announce round 0.
2. Round 0: shards, probe, evaluation, the P-OD3 comparison.
3. If needed: the change, the re-pins, the between-round checks and the slow test ("Test order around a knob change";
   no fixture-dependent file and no quick set as a gate); announce and run the next round.
4. After the final round, when a knob changed: GF-P2, the strict post-GF-P2 checks, GA-P2 (all in "GF-P2 and GA-P2");
   without a change: `npm run test:quick`. Then the record and `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12a-B01 | On the four GV2 boards, generated levels are ordered, Hard and Expert keep their hit rate within 10 points of v2, and every Hard-or-above puzzle has a proved real choice — or the failing cells are reported to the owner with data | the record's final criteria table |
| MP12a-B02 | The owner's three questions are answered with numbers: the census budget (P-OD1), the work cap (P-OD2), the penalty (P-OD3) | record §4 |
| MP12a-B03 | Every knob change is within the approved ranges and recorded with its before and after data | record §3; the diff of `policy.js` and `levels.js` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12a-T01 | Every shard of every round is recorded (command, times, exit, runs); the reports are under `landscape-v3/r<k>/` and none was overwritten; no checkpoint file is left | the record; `git status` |
| MP12a-T02 | Each round's probe corpus follows "The probe corpus of a round": every request captured once and listed in the manifest (also without puzzles), identity matches and mismatches recorded, every rating run on the captured packs under a label naming its budget tuple, no output overwritten, `final.jsonl` merged with the count and `(request, puzzleId)` checks, lines classified before any `first` or `census` value is read | the corpus folders; the record; the scratch driver |
| MP12a-T03 | The knob search follows MP06c's grid, hit definition, constraint and objective (distance to the current knobs), on the `complete` lines of identity-matched requests only; a raised cap comes only from complete diagnostic lines | the record; the scratch scripts |
| MP12a-T04 | After a knob change: only knob-dependent pins changed; between rounds only the fixture-independent checks and the slow test gated the next round (TP06); after the final round GF-P2 with the reason "P3: v3 calibration (slice)", `--check`, the fixture-dependent files and the quick set pass, and GA-P2 passes with only completed UI-flow recipes migrated (first run kept in `tests/artifacts/MP12a/ga-p2-first.txt`) | gate record |
| MP12a-T05 | `npm run test:quick` and `npm run check` pass; the record and the reports are CRLF without BOM | command output |

## Test plan

### Exact commands

The rounds as written above (announced), with the between-round checks of "Test order around a knob change" after a
change, and GF-P2 and GA-P2 as written there when a knob changed. Then, on the final tree:

```powershell
node --test --test-skip-pattern=slow tests\policy.test.js tests\difficulty.test.js tests\difficulty-v3.test.js tests\clues.test.js tests\tasks.test.js tests\worker-pool.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
node --test --test-name-pattern="^slow: v3 generation" tests\difficulty-v3.test.js
if ($LASTEXITCODE -ne 0) { throw 'slow v3 test failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

On a tree with a knob change, `npm run test:quick` runs only after GF-P2 (before it, it fails by design).

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the final criteria table, every change with its reason, the
  P-OD1, P-OD2 and P-OD3 outcomes, the `STALL_LIMIT` in force, the machine time per round, and any finding for the
  owner.
- Handoff to MP12b1: the knobs and caps after this task, the record path, the last round's folder (its 18 reports are
  the slice evidence of the lock), and whether GF-P2 and GA-P2 ran.

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

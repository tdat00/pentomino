# MP12a — Calibration slice: the GV2 cases again with v3, and the knob changes

| Header | Value |
|---|---|
| ID | MP12a (first part of the report's MP12; MP12b runs the full landscape and locks) |
| Depends on | MP11 (accepted and committed: the landscape records carry the v3 measures; the slow test exists); MP09d2 (v3 active); MP06b and MP06c (the GV2 baseline, the probe and fit records) |
| Estimated size | Medium: about 200–500 changed lines (knob values and their pins, re-pinned v3 tables, the record); about 45–60 minutes of developer work plus machine time: 30–60 minutes per round, at most three rounds |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (run, criteria, what P3 may change), RES-18 (formula, invariants, the JR-P3 ranges), RES-05 and C5 (the 5 % census rule), RES-10 (caps), RES-14 (regenerated requests), RES-26 (v3 tests), RES-35 (AR1); clarifications PROC-P1 (a), SA2-Q-P09 (branch A), JR-P3, **P-OD1** (census 10,000,000 revisited here), **P-OD2** (work 760,000,000 accepted), **P-OD3** (the penalty re-examined here) in part H; check-list §4.2 D19, D21, D29 |
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

- The full landscape and the lock (MP12b); the design document's §7.8 measured values (MP12b writes them once, after
  the lock).
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
2. Probe on the regenerated requests (RES-14; reps 0-4 of every case; outputs are scratch):

   ```powershell
   node tools\rate-probe.mjs --landscape 6x10-easy --reps 0-4 --workers 4 --expect docs\difficulty-v3\landscape-v3\r0\6x10-easy-<date>.json --orders 5 --tie-orders 3 --output tests\artifacts\MP12a\r0\A-6x10-easy.jsonl
   ```

   with the production `DEDUCE` (no `--deduce`); exit 2 marks an identity mismatch or a partial request: record it,
   never substitute. Split a command that would pass 10 minutes (`--reps 0-1`, then `2-4`).
3. Evaluate the criteria below from the reports and the probe lines; write the round's section of the record.
4. If every criterion holds and the penalty question is settled, the round is final (no change). Otherwise choose a
   knob change (below), apply it, run `npm run test:quick` (re-pin first, see "Pinned tests") and the slow test, and
   start round r + 1. After round 2, a criterion that still fails is a finding for the owner: stop and report it with
   the data (SA2-Q-P09); do not start a fourth round.

### Criteria (RES-25; per round)

| ID | Criterion | How |
|---|---|---|
| C1 | Levels are ordered: on each of the four boards the median accepted v3 score strictly increases with the requested level | the accepted puzzles' scores of the round's reports (MP11's `details.puzzles[].score`) |
| C2 | Hard and Expert keep their hit rate: each Hard and Expert cell with a GV2 baseline has a hit rate of at least its GV2 hit rate minus 10 percentage points | hit rate = the report's request in-band rate (`requestInBandRate`: the share of the 20 requests that completed ten in-band puzzles), compared with the same field of `baseline-v2/<case>-2026-11-12.json`; also report the puzzle yield (accepted / 200) of both |
| C3 | Hard and above need a proved real choice | `v3.provedZero` is 0 in every cell (MP11), and the slow test passes |
| C4 | The census rule (C5, P-OD1): in every level and board cell, at most 5 % of the accepted puzzles are census estimates (`censored: true`) | MP11's `v3.censored.share` per cell |
| C5 | No capped path: no probe line of the round is classified capped, and no landscape sample is unrateable | the probe lines (`deduction.path === 'capped'`) and `sampledUnrateable` |

Also record per round (RES-25): per cell the distributions of G, `info`, Cmax, `deductionTier`, `solutions` and the
v3 score; the hit rate and yield; time per run (T10 median and p95) and the peak memory; the census-estimate,
partial and incomplete outcomes; the order-noise table from the probe (`--orders 5 --tie-orders 3`: per cell, the
spread of G and of the v3 score across orders, as in `probe-2026-11-12.md`).

### Choosing a change (check-list D29)

- **C4 fails** (P-OD1): with the round's probe lines, re-rate the census-estimate puzzles of the failing cells with
  `--deduce '{"census":20000000}'`, then 40,000,000, then 80,000,000 (the slice has no captured packs: regenerate with
  `--landscape <case> --reps 0-4 --expect <report>` and `--deduce`; the override changes only the probe's measurement,
  never the generation); take the smallest budget at
  which every cell is at most 5 %, and record the cost (deduction time median, p95 and maximum). If 80,000,000 is not
  enough, keep 10,000,000 and report the cells to the owner (as D19). A new census value is a `DEDUCE` change.
- **C5 fails** (P-OD2): re-measure the capped lines with `--deduce '{"work":1000000000,"nodes":2000000}'`; set
  `work` and `nodes` by D19's rule (twice the largest main-search value, rounded up to 10,000,000 or 10,000) and
  record it; P-OD2's 760,000,000 stays unless that rule gives more.
- **C1 or C2 fails**: re-score the round's probe lines (complete paths only) with `breakdownV3(metrics, knobs)`
  (`core/engine/difficulty.js`, MP08) over the grid of MP06c (`tasks/difficulty-v3/MP06c-initial-fit.md`, "The
  fit": the same grid, the same hit definition including `Gproved >= 1` for Hard and above, the same constraint and
  lexicographic objective, but with **distance to the current knobs** instead of the starting values). The scratch
  tools of MP06c (`tests/artifacts/MP06c/fit.mjs`, `lib.mjs`) may be copied to `tests/artifacts/MP12a/` and pointed
  at the round's lines; if they are gone, write the equivalent. The best admissible set is the candidate. A re-score
  predicts, it does not prove: the next round measures it. When the knobs alone cannot meet C2 on a cell (the
  candidate's predicted hit rate stays below the bound), a change of `SHARES` (the level's initial clue share) or of
  `K60` (the piece count, with a `POLICY_ID` bump) may be tried in the next round; record the reason.
- **The penalty (P-OD3)**: in round 0, re-score the probe lines with the current knobs and with the best set of the
  grid that has a nonzero penalty (`penalty.few >= 1`); if that set meets C1 and its predicted mean hit rate is at most
  1 percentage point below the current knobs', make it the candidate of round 1 (the intent of SA1-Q-P1) and measure
  it; otherwise keep (0, 0). Either way the record gives the comparison (the two sets, their predicted and, when run,
  measured hit rates per cell), and the reply states it for the owner.

### Pinned tests (RES-26; check-list D23)

A knob change moves only the knob-dependent pins: `tests/policy.test.js` (`SCORE_V3` and, when changed, `DEDUCE`,
`K60`, `SHARES`, `POLICY_ID` pins), `tests/difficulty-v3.test.js` (the worked-example table of the knobs and the
recipes' v3 characterisation values: recompute them with `breakdownV3` from the pinned deduction values, never copy
an implementation's output without checking it against the formula), the v3 clue tests that MP09d2 listed as
knob-dependent, and, after GF-P2, the generation fixtures and `tests/fixtures/ui-flow-recipes.json` (check-list D21:
a UI-flow recipe that stops completing is reported and the orchestrator holds the commit until the owner decides).
Any other failing test is reported, not edited.

### GF-P2 and GA-P2 (only when this task changed a knob)

After the last change of this task and its final round:

```powershell
node tools\record-fixtures.mjs --replace --reason "P3: v3 calibration (slice)"
if ($LASTEXITCODE -ne 0) { throw 'record-fixtures failed' }
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }
```

(announced; about 5–10 minutes; stop and report if `npm test` approaches 10 minutes).

### The record `docs/difficulty-v3/calibration-slice-<date>.md`

1. Header: date, code revision per round, Node version, CPU count, the knobs and caps at the start.
2. Per round: the shard table (command, start, end, duration, exit, runs), the probe commands and outcomes, the
   criteria table C1-C5 (pass or fail with the numbers), the per-cell measures listed above, the GV2 comparison table
   (per cell: GV2 hit rate and yield, v3 hit rate and yield, difference, the C2 bound), and the order-noise table.
3. The changes: for each, the knob, the old and new value, the reason, the predicted and the measured effect.
4. P-OD1, P-OD2 and P-OD3: the outcome of each, with its numbers.
5. Findings for the owner (or "none"), and the values handed to MP12b.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/policy.js` | `SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID` values only (when changed) |
| `core/engine/levels.js` | `SHARES` values only (when changed) |
| `tests/policy.test.js`, `tests/difficulty-v3.test.js`, the knob-dependent clue tests, `tests/fixtures/ui-flow-recipes.json` | re-pins (when a knob changed) |
| `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` | by the tool (GF-P2, when a knob changed) |
| `docs/difficulty-v3/landscape-v3/` (new) | the round folders `r0/`, `r1/`, `r2/` with the shard reports |
| `docs/difficulty-v3/calibration-slice-<date>.md` (new) | the record |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12a/`. Documentation slot: none
(MP12b writes design §7.8 after the lock). Must not edit: algorithm code, `player/samples/sample-pack.json`,
`tests/fixtures/puzzlecode-v1.json` (check-list D20).

## Implementation steps

1. Read the inputs; list the cases; announce round 0.
2. Round 0: shards, probe, evaluation, the P-OD3 comparison.
3. If needed: the change, the re-pins, `npm run test:quick`, the slow test; announce and run the next round.
4. After the final round: GF-P2 and GA-P2 when a knob changed; the record; `npm run test:quick`; `npm run check`.

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
| MP12a-T02 | The probe's identity check passed for every regenerated request, or each mismatch is recorded | probe outputs; the record |
| MP12a-T03 | The knob search follows MP06c's grid, hit definition, constraint and objective (distance to the current knobs) | the record; the scratch script |
| MP12a-T04 | After a knob change: only knob-dependent pins changed; GF-P2 with the reason "P3: v3 calibration (slice)", `--check` passes and GA-P2 (`npm test`) passes | gate record |
| MP12a-T05 | `npm run test:quick` and `npm run check` pass; the record and the reports are CRLF without BOM | command output |

## Test plan

### Exact commands

The rounds as written above (announced). Then:

```powershell
node --test --test-skip-pattern=slow tests\policy.test.js tests\difficulty-v3.test.js tests\clues.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
node --test --test-name-pattern="^slow: v3 generation" tests\difficulty-v3.test.js
if ($LASTEXITCODE -ne 0) { throw 'slow v3 test failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the final criteria table, every change with its reason, the
  P-OD1, P-OD2 and P-OD3 outcomes, the machine time per round, and any finding for the owner.
- Handoff to MP12b: the knobs and caps after this task, the record path, the last round's folder (its 18 reports are
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

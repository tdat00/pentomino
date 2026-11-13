# MP09d2 — Activate v3: `rate` and `MODEL`, the pinned tests, D21-V3, GF-P2 and GA-P2

| Header | Value |
|---|---|
| ID | MP09d2 (second part of the activation; MP09d1 built `measureV3` and the v2 names) |
| Depends on | MP09d1 (accepted and committed: `measureV3`, `rateV2`, the v2 names); MP09c (the clue-selection handling); MP09b (the v3 pack reader and summary claims); MP08 (`scoreV3`, `SCORE_V3`) |
| Estimated size | Large: about 800–1,100 changed lines (difficulty.js about 30, tools about 20, tests about 320–420, the D36 and D21-V3 scripts about 280 (copied from this file), documents about 170; the re-recorded fixtures and the captures are generated and not counted); about 60–80 minutes of active work plus the gates in announced blocks (Phase C about 50–130 minutes in three blocks: C1 Hell outcomes and replacements about 20–60, C2 availability about 10–25, C3 D21-V3 about 20–45; GF-P2 seconds; GA-P2 about 5–10 minutes) |
| Owner role | Engine |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-19 (measurement, rating and v2 retention), RES-04 (statuses, `IncompleteRatingError`, no v3 "+"), RES-05 (census, `censored`), RES-20 (types and protocol), RES-24 (tests and fixtures moved by P2), RES-34 (engine total on twin inputs), RES-35 (AR1: generated puzzles only); RES-15a (the stall stop) and its "Later tasks" (`clarifications.md` Part I, D21, with the orchestrator note of 18:30: the v3 re-validation belongs to this task); clarifications SA2-Q-P02, SA1-Q-P1, C1 (b) (owner), AR1, P-OD4; Part I D36 (Hell levels unrateable under v3), answered (a) by the plan author with four precisions for this task, owner decision P-OD5 in part H; check-list §4.2 D9, D11, D20 to D23, D36; cross-review SP01-SP03 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) and TP02-TP04 (third pass: Phase B diagnostic only; D21-V3 screening and certification; the 164-cell board) |
| Gates owned | D21-V3 with the D36 measurements of Phase C (C1, C2, C3), GF-P2, GA-P2 (check-list §7) |
| Implementation status | Not started |

## Goal & business context

This is the switch the owner asked for ("make Hard really hard"): from this task on, every rating the engine computes
is a `difficulty-v3` rating built on how a person solves (forced placements, deductions, real guesses), with the
knobs fitted in MP06c and written in MP08. Generation, set calibration, the worker `rate` task and the fixtures use it.
Newly generated Hard-or-above puzzles require at least one proved decisive guess (AR1, applied by MP09c in clue
selection). Imported and older puzzles are not filtered, and `rate` itself never refuses a rating: a rating whose
census did not finish is a labelled estimate (`censored: true`), even at Hard or above with `Gproved === 0`.

Stored puzzles never change: a `difficulty-v2` claim in a pack or a link stays as it was (MP09b reads it as legacy),
and the v2 functions stay available under their v2 names (MP09d1) for the frozen Player sample, the probe and the
legacy tests. A rating whose census did not finish carries `censored: true` (C1 (b), owner), and a puzzle whose
deduction is capped before its first solution is unrateable (`IncompleteRatingError`, SA2-Q-P02, owner); v3 never
shows "+".

The stall stop of clue selection (RES-15a, `STALL_LIMIT = 12`) was measured on `difficulty-v2` sequences only. After
the switch and before the fixtures are re-recorded, this task measures it on v3 sequences (gate D21-V3: an exact
screening of the `any`-mode calls and, for the `require`-mode calls, the actual final results with the stop at 12 and
16 compared with a run without it) and keeps 12 or raises it to 16 by a fixed rule. Because generated puzzles change,
the generation fixtures are then re-recorded under the pre-approved gate GF-P2 and the full suite runs under GA-P2.

The Hell levels are the other measurement of this task (`clarifications.md` Part I, D36, answered (a) by the plan
author; owner decision P-OD5). A capped deduction search gives no rating (SA2-Q-P02), and SA1's probe found every v3
rating of the Hell sets of large boards capped, so under v3 those levels most likely cannot be made. This task
activates v3 anyway, records every Hell failure with numbers (profiles spent, all unrateable, time), replaces the two
Hell tests that cannot pass any more by the highest level the same board completes, keeps one test that shows the
failure, and measures on the smallest boards whether Hell can be made at all. What happens to the Hell levels (stop
offering them, a different contract, or a separate engine project) is the owner's decision at MP12; nothing is
published from this branch before then.

## Scope

### In scope

- `core/engine/difficulty.js`: `MODEL = 'difficulty-v3'`; `rate` in v3 (from MP09d1's `measureV3` and MP08's
  `scoreV3`); the module header.
- `tools/record-fixtures.mjs` (`verifySample`).
- The pinned tests of RES-24 and of MP07, re-evaluated as listed below (check-list D23); new tests of `rate` in v3;
  the worker round trip of RES-20.
- Gates D21-V3 (the stall limit on v3 sequences of the cells that complete under v3; at most the raise of
  `STALL_LIMIT` from 12 to 16 by the rule below), GF-P2 and GA-P2; the UI-flow expectations of
  `tests/fixtures/ui-flow-recipes.json` (check-list D21).
- The D36 measurements and their consequences (answer (a), "Hell levels under v3" below): the Hell outcome captures,
  the replacement of the recipe `square-22x22-hell-3` and of MP07's 15 x 20 Hell 2 slow test, one new slow test that
  pins an unrateable calibration, the availability probe, and their record.
- Documents: `docs/design-detail.md`, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`,
  `DEVELOPERGUIDE.vn.md`.

### Out of scope

- `measureV3`, the v2 names, the probe's `v2` field and the protocol round trips (MP09d1).
- The derived display rating and the estimate note in the apps (MP10a, MP10b); the code-size record and the browser
  page (MP09e); calibration tooling (MP11); any knob or `DEDUCE` value (MP06b, MP08, MP12a, MP12b).
- `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json` (check-list D20: byte-for-byte unchanged).
- `core/engine/deduce.js`, `policy.js`, `pack.js`, `puzzlecode*.js`, `clues.js` (a defect found there goes back to its
  owner task as a fix round). The one exception is the value of `STALL_LIMIT` in `clues.js` under the D21-V3 rule.
- Lowering `STALL_LIMIT`, or any value other than 12 or 16 (that needs a new answer of the plan author).
- Any change of the Hell levels' areas, of the caps or of what the Generator offers, and a fail-fast for set requests
  whose calibrations are all unrateable (D36: the owner decides at MP12, and MP12 proposes the fail-fast with
  measured numbers). Hell rating sequences made from v2 ratings (never).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity; `difficulty.js` imports only `tiling.js`, `levels.js`, `policy.js` and `deduce.js`; none of the
  words `LIMITS`, `QUALIFICATION`, `enabledMaxActive`, `deriveLimits` in it.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace. Tool-written fixtures are already CRLF; check them
  and every hand-edited JSON with the one-liner of check-list §3.
- This task owns D21-V3 (with the D36 measurements of Phase C), GF-P2 and GA-P2: run the D21 drivers, the D36
  scripts, `tools/record-fixtures.mjs` and `npm test` only as written in the test plan, in the order of the phases.
  **Announce to the orchestrator before starting each gate block** (the Sudoku repository runs in parallel on the same
  machine; never two heavy runs at once): give the block's commands and expected wall time (C1 about 20–60 minutes,
  timed; C2 about 10–25 minutes, which reports no times and so needs no timing slot, but still loads the processor;
  C3 about 20–45 minutes; every command at most 10 minutes; GF-P2 seconds; GA-P2 about 5–10 minutes) in your plan,
  and start a block only when the orchestrator says the machine is free.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or
  `docs/difficulty-v3/`, except the evidence this task creates: the new folder `docs/difficulty-v3/d21-v3-<date>/` and
  the new record `docs/difficulty-v3/d21-v3-<date>.md` (`<date>` is the run date, `YYYY-MM-DD`). The D21 folder
  `docs/difficulty-v3/d21-2026-11-12/` and its record are read only: its drivers are run from where they are. A test
  that is not listed below and fails after the switch is not edited: report it.

## Inputs & context

### Current code (anchors at HEAD `041ff83` (MP09d1, after MP09a1 to MP09c); find moved lines by the quoted text)

- `core/engine/difficulty.js` after MP09d1: `MODEL` (line 48, `export const MODEL = 'difficulty-v2';`),
  `UnsatisfiableError` (51), `IncompleteRatingError` (64, MP09c), `scoreV2` (85), `breakdownV3(m, knobs = SCORE_V3)`
  (106) and `scoreV3(m)` (139) of MP08, `measureV2` (154), `measureV3(board, pieces, clues, ws, limits = { deduce:
  DEDUCE, dlx: SCORE.caps })` (213; MP09d1; returns `{ metrics: MetricsV3, saturated: false }`, throws
  `UnsatisfiableError` or `IncompleteRatingError`), `rateV2` (308; writes `model: 'difficulty-v2'` literally at 311),
  `rate` (322; its body is the one line `return rateV2(board, pieces, clues, ws);`), `inBand` (332).
- `core/engine/deduce.js`: `measureDeduction(model, limits = DEDUCE, diagnostics = {})` (line 280) returns the
  `DeductionResult` `{ path, first, search: { Gt, nodes, work, stop }, count: { S, limit, exhausted, solutions },
  census: { complete, undecided, nodes, work } | null }`; `first` = `{ F, E, rules: { R1 … R9 }, deductionTier, G,
  Gproved, info, Cmax, Dmax, choices, rows, census }`. `path` is `'complete'`, `'capped'` or `'none'`.
- `core/engine/clues.js`, `core/engine/tasks.js`, `tests/clues.test.js`, `tests/tasks.test.js` and
  `tools/record-fixtures.mjs` import `rate` (now v3); `tools/bench/app.js` imports `MODEL`; `tools/bench/runner.js`
  imports `inBand`; `tools/rate-probe.mjs` already uses `rateV2` for its `v2` field (MP09d1).
- `tools/record-fixtures.mjs`: `currentVersions()` (line 71: `model: MODEL`), `buildSample` (125), `verifySample`
  (194-235; line 223 `const fresh = rate(board, pack.pieces, puzzle.clues, ws);` and the JSON comparison with the
  stored rating).
- `core/engine/clues.js` (MP07, MP09c): `const STALL_LIMIT = 12;` (line 62); `rateSubset` returns `'spent'` for an
  unrateable or AR1-refused subset (a profile without a candidate); the stall test (line 415) is
  `rated.length - nearestAt >= STALL_LIMIT` and counts rated candidates only. When it fires, `afterProfile` returns
  `chooseBest()`: in `any` mode the best raw candidate; in `require` mode it finishes candidates through
  `makeUnique(board, pieces, layout, c.clues, rng, ws, rowLimit)` (line 293, the search's own rng) and returns the
  nearest final result, or null when every repair failed, and the search then goes on from a changed rng state. That
  is why D21-V3 certifies `require`-mode calls by reruns (below).
- `tools/generate.mjs` `checkRecipe` (276-279): a recipe whose `versions` differ from the build's throws a
  `RangeError` ("the recipe needs model difficulty-v2, this build has difficulty-v3" between the switch and GF-P2,
  while the recorded recipe still says `difficulty-v2`), so every test that runs the recipe fails by design until
  GF-P2; this check is never weakened (TP02).

### `rate` in v3 (RES-19; RES-04; C1 (b))

`measureV3` is MP09d1's (its steps, errors and the `MetricsV3` key order are in design §7.10). This task makes it the
rating:

```text
rate(board, pieces, clues, ws):
  { metrics } = measureV3(board, pieces, clues, ws); score = scoreV3(metrics)
  return { model: MODEL, score, level: levelForScore(score).id, saturated: false, [censored: true,] metrics }
  // key order model, score, level, saturated, censored (only when metrics.censusComplete is false; never
  // `censored: false`), metrics; it throws IncompleteRatingError for a capped path and UnsatisfiableError as today
MODEL = 'difficulty-v3'
```

- `rate` never returns `saturated: true` (no v3 "+", RES-04); the DLX diagnostic in the metrics never enters the
  score.
- The v2 functions stay as MP09d1 left them: `scoreV2`, `measureV2`, `rateV2` (`model: 'difficulty-v2'` written
  literally). Callers after this task: `verifySample` for a v2 sample (the gen-v2 Player sample, D20), the probe's
  `v2` field, legacy tests. Generation and the apps never call them.

### Tools

- `tools/record-fixtures.mjs` `verifySample` (194-235; line 223 `const fresh = rate(board, pack.pieces,
  puzzle.clues, ws);` and the JSON comparison with the stored rating): the fresh rating of puzzle i is `rateV2(...)`
  when `puzzle.rating?.model === 'difficulty-v2'` (the gen-v2 Player sample, D20) and `rate(...)` otherwise; an
  `IncompleteRatingError` from `rate` is rethrown as
  `` new Error(`puzzle ${i}: unrateable, the deduction path was capped (${e.counters.stop})`, { cause: e }) ``, which
  stops `--create`, `--replace` and `--check` with exit code 1 and names the puzzle (RES-04). Everything else in the
  tool is unchanged (`currentVersions()` at line 71 now reports `model: 'difficulty-v3'` through `MODEL`).

### Tests: the treatment of every pinned test (RES-24, MP07 handoff; check-list D23)

Intended contract changes (only these; anything else that fails is reported):

| File | Test or item | Treatment |
|---|---|---|
| `tests/difficulty.test.js` | 'a complete layout scores zero with zero counters' | the v2 deep-equal through `rateV2` with `model: 'difficulty-v2'`; the v3 deep-equal of `rate` is the new 'Zero' case below |
| `tests/difficulty.test.js` | 'forced placements keep B = 0 and score 2U'; 'metrics carry actual counters and the diagnostics R and H' | switch them to `rateV2` (v2 legacy, values unchanged); MP09d1 tests the v3 measurement of these inputs |
| `tests/difficulty.test.js` | MP09d1's 'the v2 rating keeps its results under its v2 names' (lines 331-351) | keep every `rateV2` pin of lines 331-347 unchanged; remove only the final loop of lines 348-350 (`for (const input of inputs) { assert.equal(JSON.stringify(rate(...input, ws)), JSON.stringify(rateV2(...input, ws))); }`): it holds only while `rate` delegates to `rateV2`, and after the switch the two differ by design (the model at least). The live side is covered by the new v3 cases 'Key order' (the same 7-clue input) and 'Zero' below. Edit it in step 3, before Phase A (cross-review TP13); `rateV2` is unchanged |
| `tests/clues.test.js` | 'repeated subsets are rejected before rating'; 'a band no subset reaches fails without relabelling and within 64 ratings'; 'the beam search finds a band the count-guided stage missed'; 'a uniqueness repair that leaves the band is not accepted' (MP07's version); MP07's real-rate cases 'any, centre reconstruction', 'any, end of search', 'unbounded' | inject `rate: rateV2` (v2 seam, D23) into each `run`/`traced` context and use `rateV2` wherever the test rates directly (for example `inBand(rateV2(board, pieces, repaired, ws), target)`, `assert.deepEqual(result.rating, rateV2(...))`); targets, seeds and values unchanged. Reason: their targets and seeds were chosen for v2 scores (under the starting knobs nightmare and Hell 1 become reachable on 10 x 6, and refused subsets would change the `onRate` counts) |
| `tests/clues.test.js` | 'every reachable level gets an in-band subset of the witness'; 'required uniqueness returns a proven, in-band certificate'; 'selection is deterministic for a seed and honours excluded clue keys'; 'generated ratings are the same under piece id, color and order permutations' | unchanged code, now v3. If one level or case fails with its seed under the fitted knobs: try the seeds `<seed>-1` to `<seed>-9` in order, use the first with which every assertion of that test passes, and record the replaced seed and the failure in the reply; if none passes, stop and report (a calibration finding for MP12) |
| `tests/clues.test.js` | 'published recipes still hold' | v2 part through `rateV2`: `score === recipe.score` and `level === id` (the `score` field of `tests/fixtures/clue-recipes.js` is the v2 score); v3 part through `rate`: `level === levelForScore(score).id`, `saturated === false`, no `censored`, `metrics.solutions === 'unique'`, `metrics.censusComplete === true`; `certify(...)` unique as today. The v3 values are pinned once, in `tests/difficulty-v3.test.js` (row below) |
| `tests/clues.test.js` | 'slow: a large required-unique request is never accepted on a cutoff' | target `level('hell-1')` (chosen for v2) becomes `{ min: 0, max: Infinity, share: 0.1 }`; every assertion stays (`any` ok with certificate null, `certify(..., 2000)` not unique; `require` gives `{ ok: false, reason: 'uniqueness-not-proved' }`). Reference with the starting knobs: `any` returns its first rated subset (a census estimate, `censored: true`), `require` finishes in about 10 s. Under v3 Hell 1 is refused for this twin strip (every subset has `Gproved = 0`), so the old target would fail |
| `tests/clues.test.js` | MP07's 'stall, a search that needs ten ratings still reaches the central result (10 x 6 Master)' | inject `rate: rateV2` into its `traced` context (D23): its ten calls and the score 48 were measured on v2 (the Q10 regression of D21) |
| `tests/clues.test.js` | MP07's 'slow: stall, a 15 x 20 Hell 2 calibration (K = 50) still reaches the central result' | replaced (D36 (a), precision 2) by the two slow tests of "Hell levels under v3": the same board and seed at the highest level whose set attempt 0 succeeds and whose serial flow makes 10 of 10 puzzles under v3 (found in Phase C1), and 'slow: an unrateable calibration ends not-in-band with no puzzle (D36)' on the old input. The old values (score 126, 2 clues, the central half) were v2 values of the D21 regression and are not kept |
| `tests/clues.test.js` | MP07's scripted stall tests: 'stall, stops after 12 non-improving one-sided ratings and not before'; 'stall, not with a central candidate seen or candidates on both sides'; 'stall, returns the best by ranked order'; 'stall, require mode counts raw ratings and returns the repaired final result'; 'stall, an unbounded band never stops on a stall' | unchanged while `STALL_LIMIT` is 12 (scripted v2-like ratings without `Gproved`); re-pinned only when D21-V3 raises the limit to 16, with the values of the D21-V3 section |
| `tests/fixtures/clue-recipes.js` | the comment above `CLUE_RECIPES` | "per level the clued piece IDs of a puzzle that `selectClues` accepted in `require` mode under `difficulty-v2`; `score` is that v2 score; the `difficulty-v3` values are pinned in `tests/difficulty-v3.test.js`". Pieces and scores unchanged (MP02a to MP05 pin deduction values on these lists) |
| `tests/difficulty-v3.test.js` | MP08's recipe characterisation | add: for each recipe, `rate(board, pieces, clues, ws).score` equals the pinned value, and `rate(...).metrics` has the mapped `U`, `deductionTier`, `G`, `info` and `solutions` |
| `tests/generate.test.js` | `FAKE_RATING` (49-55) | becomes the valid v3 literal below (score and level unchanged) |
| `tests/generate.test.js` | 'keeps the witness, produces an in-band calibration puzzle and proves it in require mode' (478) | if attempt 0 fails under the fitted knobs (the analysts' starting-knob run: `require: not-in-band`), assert the same properties on `firstSetAttempt(request({ uniqueness }), 10).result` (the lowest successful attempt) and record the attempt used; if none of the ten succeeds, stop and report |
| `tests/worker-pool.test.js` | line 815 `assert.equal(rating.model, 'difficulty-v2');` | `'difficulty-v3'`, plus `JSON.stringify(rating) === JSON.stringify(rate(<same board, pieces, clues>, ws))` |
| `tests/puzzlecode-cli.test.js` | `assertLine` (line 146: `assert.deepEqual(puzzle.rating ?? null, data.rating, 'rating claim');`) | compare with the summary of a v3 claim (RES-22): `data.rating?.model === 'difficulty-v3'` gives `{ model, score, level, saturated: false }` plus `censored: true` when the claim has it; other claims unchanged |
| `tests/pack.test.js` | 'the generated sample pack re-serialises byte for byte' (line 576: `assert.equal(pack.value.puzzles[0].rating.model, 'difficulty-v2');`) | `'difficulty-v3'`: GF-P2 re-records the sample under v3; the empty warnings and the byte-for-byte re-serialisation stay. Edit it after GF-P2, before Phase E (SA1, with TP13: the file reads the re-recorded sample) |
| `tests/rate-probe.test.js` | 'one line per puzzle with the fields in the fixed order and the definitions of raw and intervals' (pack mode on the re-recorded `tests/fixtures/generated-sample-pack.json`) | line 71 `assert.equal(line.sourceModel, 'difficulty-v2');` → `'difficulty-v3'`; line 77 `assert.equal(line.v2.score, line.storedScore);` → `assert.equal(line.v2.score, scoreV2(line.v2.metrics.U, line.v2.metrics.B));` (the stored score is now a v3 score; the `v2` field stays the probe's own `rateV2` re-rating; import `scoreV2` from `../core/engine/difficulty.js`); line 101 `assert.equal(lines[2].deduction.raw.G, 1, 'the Hard puzzle has one guess node');` → `assert.ok(lines[2].deduction.raw.G >= 1, 'the Hard puzzle has a guess node (AR1)');` (index 2 stays the Hard sample: `SAMPLE_LEVELS` of `tools/record-fixtures.mjs:37`). The rest of the file is unchanged. Edit it after GF-P2, before Phase E (SA1, with TP13) |
| `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` | | re-recorded by GF-P2 only |
| `tests/fixtures/ui-flow-recipes.json` | `expect` of each recipe (read by `tests/generator-controller.test.js:750-785` and three browser pages) | set from the GA-P2 run for every recipe that completes (all `quantity` puzzles, no notice): `expect.pieces`, `expect.puzzles`, `expect.scores`. A recipe that ends with a notice or a partial batch keeps its `expect` and its `quantity` (never reduced: the quantity-3 fallback of D21 option (a) was not chosen); it is a finding for the owner, the task stops before the final `npm test` and the orchestrator holds the commit. The recipe `square-22x22-hell-3` is replaced in Phase C1 (D36 (a), precision 2; "Hell levels under v3"): same board, rotation, seed, uniqueness and quantity 10, at the level found there, named `square-22x22-<level id>`; its `expect` is set from the GA-P2 run like the others, and D21's requirement "10 of 10, no `N-PARTIAL`" now applies to it |

`FAKE_RATING` (valid by every rule of MP09b's reader; it is never re-rated):

```js
const FAKE_RATING = /** @type {import('../core/engine/types.js').Rating} */ ({
  model: 'difficulty-v3',
  score: 30,
  level: 'hard',
  saturated: false,
  metrics: {
    U: 5, R: 25, H: 3, B: 0, branchTrials: 0, rowTrials: 0, dlxStop: 'solution', searchStop: 'exhausted', F: 5, E: 0,
    rules: { R1: 5, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0 }, deductionTier: 1, tier: 1, G: 0, info: 0,
    Cmax: 0, Dmax: 0, Gt: 0, nodes: 1, work: 0, S: 1, solutionLimit: 8, solutions: 'unique', censusComplete: true,
    censusUndecided: 0, censusNodes: 0, censusWork: 0, Gproved: 0,
  },
});
```

### New tests of `rate` in v3 (`tests/difficulty.test.js` unless stated)

| Case | Set-up | Expected |
|---|---|---|
| Key order | the 10 x 6 classic witness, 7 clues (`layout.slice(0, 7)`) | `Object.keys(rate(...))` is `model, score, level, saturated, metrics` (not censored); `rate(...).metrics` deep-equals `measureV3(...).metrics`; `score === scoreV3(metrics)`, `level === levelForScore(score).id`, `model === 'difficulty-v3'` |
| Zero | the complete layout of 'a complete layout scores zero with zero counters' | `rate` deep-equals `{ model: 'difficulty-v3', score: 0, level: 'very-easy', saturated: false, metrics: <MP09d1's zero metrics> }` with `JSON.stringify` equality (key order) |
| Census estimate in `rate` | the 41-I strip of MP09d1's census case (`boardFromRows(Array(5).fill('#'.repeat(41)))`, 41 copies of I, clues `witness.slice(0, 4)`) | `Object.keys(rate(...))` is `model, score, level, saturated, censored, metrics`; `censored === true`; `metrics.censusComplete === false`; `score === scoreV3(metrics)`; `metrics.Gproved === 0` (MP09d1's reference), and the rating is returned whatever its level: `rate` never refuses a rating, only generation does (AR1, SP01) |
| Unsatisfiable and invariance | the existing 'unsatisfiable clue sets are refused instead of rated' and 'ratings ignore piece ids, colors and input order' | unchanged code: they now test v3 `rate` (same messages; invariance) |
| `tests/tasks.test.js` | a `rate` task on the 7-clue case through `executeTask` | equals `rate(...)` (the existing line 95 already checks it; keep it) |

### D21-V3: the stall limit on v3 sequences (gate; after the switch, before GF-P2)

Origin: `clarifications.md` Part I, D21, "Later tasks", moved to this task by the orchestrator (note of 2026-11-12
18:30, cross-review SP03): re-run the D21 simulation on v3 rating sequences for N = 8, 12 and 16 on the same cells
and populations; only a raise of `STALL_LIMIT` is allowed; a changed N comes before the fixtures are re-recorded.

**What is measured.** For every `selectClues` call of the D21 drivers, the rating sequence the search makes without
the stall stop (the counterfactual baseline): the drivers run under a preload that records each call with the D21
observer (`docs/difficulty-v3/d21-2026-11-12/register.mjs`: the `onRate` sequence, i.e. the rated candidates only, as
the stall counter counts them after MP09c) and disables the stall stop in memory (`STALL_LIMIT = Infinity`; no
product file changes). The baseline is then read in three parts, which `split.mjs` separates (cross-review TP03):

- **A, screening of the `any`-mode calls (exact).** `simulate.mjs` replays RES-15a on each recorded sequence for
  N = 8, 12 and 16 and, where the rule fires, returns the best raw candidate. In `any` mode that is exactly what the
  product's stop returns (a final result is the raw subset), so its column "missed a central result" (the rule stops
  before the end of a call whose baseline result lies in the central half of the band) is exact.
- **B, certification of the `require`-mode calls (exact).** In `require` mode the stop hands the candidates to the
  uniqueness repair (`chooseBest`, "Current code"): the final result may be a repaired, re-rated set (possibly
  central), or every repair fails and the search goes on. `simulate.mjs` computes none of this, so on these calls it
  only screens: its raw triggers are reported, never decided on. Each such call with a finite band is rerun with the
  stall stop at 12 (the product) and at 16 (`stall16.mjs`) by `rerun.mjs`, and `certify.mjs` compares the actual
  final results with the baseline by tag. A rerun is identical to the baseline up to the first rating at which the
  rule holds on the baseline sequence (until then both runs make the same decisions and the same rng draws), so
  `certify.mjs` computes that rating with the rule of `simulate.mjs`, checks the identical prefix, and classifies
  each call: never fired (the rerun must equal the baseline), fired with the same final result, lost central final
  result (the baseline result is central and the rerun's result is not: a score outside the central half, or no
  result), other changed result (any other difference after the firing: another clue set that is still central, a
  central score that moved inside the central half, or a change of a result that was not central; cross-review TP14:
  RES-15 asks for a central result, not for the baseline's puzzle), or not reproducible (a rerun that differs where
  it must not). `certify.mjs --self-test` checks this classification on synthetic calls before it is used. In this
  population the `require`-mode calls are the 30 per level of `pop.mjs --recipe-board` and four real-rating vectors
  of `vectors.mjs` (`required-easy`, `required-hard`, `required-master`, `repair-seed3-require`; `unbounded-require`
  has no finite band); the flow and `--cell` captures run in `any` mode.
- **Controls.** The nine vector calls that rate with scripted `difficulty-v2` doubles (`vec/tie-0`, `vec/req-0`,
  `vec/req-2`, `vec/req-3`, `vec/req-3-excluded`, `vec/budget-0`, `vec/budget-1`, `vec/none-0-any`,
  `vec/none-0-require`; `vectors.mjs` lines 46-56) test the mechanics of the rule, not v3: they get their own table
  and never count in A or B.

SA1 tried these scripts on HEAD `041ff83` with `rate` switched to v3 in memory (`pop.mjs --recipe-board 4` and
`vectors.mjs`): the split gave 24 + 5 `require`-mode calls and the 9 controls; `certify.mjs` compared 28 calls, all
identical to the baseline; with the limit lowered to 4 for the trial only, one call fired after 5 ratings, kept the
identical 5-rating prefix and changed its result, as the classification expects.

The preload, a new file `docs/difficulty-v3/d21-v3-<date>/nostall.mjs`, exactly:

```js
// D21-V3 preload (MP09d2): the D21 observer (../d21-2026-11-12/register.mjs) plus a load hook that disables the
// RES-15a stall stop in memory (STALL_LIMIT = Infinity), so that every selectClues call records the rating sequence
// the search makes without the stall stop. No product file is changed. Use: node --import <this file> <driver> ...
import '../d21-2026-11-12/register.mjs';
import { registerHooks } from 'node:module';

const FROM = 'const STALL_LIMIT = 12;';

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.endsWith('/core/engine/clues.js')) {
      return result;
    }
    const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    if (source.split(FROM).length !== 2) {
      throw new Error('D21-V3 hook: the STALL_LIMIT line was not found exactly once');
    }
    return { ...result, source: source.replace(FROM, 'const STALL_LIMIT = Infinity;') };
  },
});
```

Both hooks only replace text in the source they receive, so their order does not matter. The observer writes one
JSON line per call (`kind: 'call'`: `target`, `mode`, `ratings` with the raw scores, `repairs`, `result`) and per
driver event. In `any` mode every entry of `repairs` is a refused subset rating (AR1: a rating not followed by
`onRate`); an unrateable subset leaves no entry (its rating throws).

The preload of the reruns at N = 16, `$v/stall16.mjs`, exactly (the reruns at N = 12 use the plain D21 observer
`$d/register.mjs`: 12 is the product's limit):

```js
// D21-V3 preload (MP09d2; cross-review TP03): the D21 observer (../d21-2026-11-12/register.mjs) plus a load hook that
// sets the RES-15a stall limit to 16 in memory, for the certification reruns at N = 16 (the product's 12 needs no
// hook). No product file is changed. Use: node --import <this file> <driver> ...
import '../d21-2026-11-12/register.mjs';
import { registerHooks } from 'node:module';

const FROM = 'const STALL_LIMIT = 12;';

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.endsWith('/core/engine/clues.js')) {
      return result;
    }
    const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    if (source.split(FROM).length !== 2) {
      throw new Error('D21-V3 hook: the STALL_LIMIT line was not found exactly once');
    }
    return { ...result, source: source.replace(FROM, 'const STALL_LIMIT = 16;') };
  },
});
```

The split, `$v/split.mjs`, exactly:

```js
// D21-V3 (MP09d2; cross-review TP03): splits the no-stall captures for the two analyses. simulate.mjs is exact only in
// `any` mode, where the stall stop returns the best raw candidate; in `require` mode the stop hands the candidates to
// the uniqueness repair, so those calls are certified by reruns (rerun.mjs, certify.mjs). The nine vector calls that
// rate with scripted difficulty-v2 doubles are mechanics controls, never v3 evidence. For each input <name>.jsonl this
// writes <out>/screen/<name>.jsonl (every line except require-mode call lines and controls), <out>/require/<name>.jsonl
// (the require-mode call lines that are not controls; only when there are some) and, for the controls,
// <out>/controls/vectors-scripted.jsonl. It never overwrites a file. Prints one count line per input.
//   node ./<this folder>/split.mjs <out dir> <files...>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const CONTROLS = new Set(['vec/tie-0', 'vec/req-0', 'vec/req-2', 'vec/req-3', 'vec/req-3-excluded', 'vec/budget-0',
  'vec/budget-1', 'vec/none-0-any', 'vec/none-0-require']);

const [out, ...files] = process.argv.slice(2);
if (out === undefined || files.length === 0) {
  throw new Error('usage: split.mjs <out dir> <files...>');
}
/** @param {string} file @param {string[]} lines */
const write = (file, lines) => {
  if (existsSync(file)) {
    throw new Error(`${file} exists: split never overwrites`);
  }
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, lines.map((l) => `${l}\r\n`).join(''));
};
/** @type {string[]} */
const controls = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n').map((l) => l.trimEnd()).filter((l) => l !== '');
  const screen = [];
  const require = [];
  for (const line of lines) {
    const l = JSON.parse(line);
    if (CONTROLS.has(l.tag)) {
      controls.push(line);
    } else if (l.kind === 'call' && l.mode === 'require') {
      require.push(line);
    } else {
      screen.push(line);
    }
  }
  write(join(out, 'screen', basename(file)), screen);
  if (require.length > 0) {
    write(join(out, 'require', basename(file)), require);
  }
  console.log(`${basename(file)}: ${screen.length} screen lines, ${require.length} require calls`);
}
if (controls.length > 0) {
  const found = new Set(controls.map((l) => JSON.parse(l).tag));
  const missing = [...CONTROLS].filter((t) => !found.has(t));
  if (missing.length > 0) {
    throw new Error(`control calls missing: ${missing.join(', ')}`);
  }
  write(join(out, 'controls', 'vectors-scripted.jsonl'), controls);
  console.log(`controls: ${controls.length} lines`);
}
```

The certification reruns, `$v/rerun.mjs`, exactly (the calls, arguments, tags and rng seeds of the `require`-mode
calls of `$d/pop.mjs --recipe-board` (its lines 30-41) and of the four real-rating `require` vectors of
`$d/vectors.mjs` (lines 72-74 and 80), in their order):

```js
// D21-V3 certification reruns (MP09d2; cross-review TP03): the `require`-mode calls with a finite band of the D21-V3
// population that use the product's rating, with the arguments and tags of their drivers: pop.mjs --recipe-board
// <count> (per level, k below min(count, 30)) and the four real-rating require vectors of vectors.mjs. Run it under
// ../d21-2026-11-12/register.mjs (N = 12, the product) and under stall16.mjs (N = 16); certify.mjs compares the final
// results with the no-stall baseline. Environment: D21_OUT (jsonl file), D21_ROOT (tree, default the working dir).
//   node --import <preload> ./<this folder>/rerun.mjs --recipe-board 200
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { boardFromRows } = await imp('core/engine/board.js');
const { selectClues } = await imp('core/engine/clues.js');
const { level } = await imp('core/engine/levels.js');
const { createRng } = await imp('core/engine/rng.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');
const { RECIPE_BOARD_ROWS, recipeWitness } = await imp('tests/fixtures/clue-recipes.js');
const { CLASSIC_PENTOMINOES } = await imp('tests/fixtures/polyominoes.js');

const argv = process.argv.slice(2);
const count = Number(argv.includes('--recipe-board') ? argv[argv.indexOf('--recipe-board') + 1] : '200');
const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const board = boardFromRows([...RECIPE_BOARD_ROWS]);
const pieces = [...CLASSIC_PENTOMINOES];
const layout = recipeWitness();
/** @param {string} tag @param {object} o */
const call = (tag, o) => {
  globalThis.__d21Tag = tag;
  selectClues({ board, pieces, layout, uniqueness: 'require', excludeClueKeys: new Set(), ws, ...o });
};

// pop.mjs --recipe-board: the require part, in its order (level, then k)
for (const id of ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']) {
  for (let k = 0; k < Math.min(count, 30); k += 1) {
    call(`pop/recipe/${id}/require/${k}`, { target: level(id), rng: createRng(`pop-${id}-require-${k}`) });
  }
}
// vectors.mjs: the real-rating require calls with a finite band ('unbounded-require' has none)
for (const id of ['easy', 'hard', 'master']) {
  call(`vec/required-${id}`, { target: level(id), rng: createRng(`req-${id}`) });
}
call('vec/repair-seed3-require', { target: { min: 36, max: 38, share: 0.3 }, rng: createRng('seed3') });
```

The certification, `$v/certify.mjs`, exactly:

```js
// D21-V3 certification (MP09d2; cross-review TP03, TP14): for every `require`-mode call with a finite band of the
// no-stall baseline (split.mjs's require/ files), the final result of the same call rerun with STALL_LIMIT 12 and 16
// (rerun.mjs). A rerun is identical to the baseline up to the first rating at which the stall rule holds on the
// baseline sequence (the rule of simulate() in ../d21-2026-11-12/simulate.mjs); there the rule fires and hands the
// candidates to the uniqueness repair. A fired call keeps its final result (same), loses the central half (lost: the
// baseline result lies in the central half of its band and the rerun's result does not, or the rerun has none), or
// changes it otherwise (changed: for example another clue set that is still central, or a change of a result that
// was not central). A call whose rerun differs from the baseline before the rule fires (or at all, when it never
// fires) is not reproducible: the decision then stops. ASCII Markdown on stdout; exit 1 when a baseline call has no
// rerun or a rerun has no baseline.
//   node ./<this folder>/certify.mjs --base <require files...> --n12 <file> --n16 <file>
//   node ./<this folder>/certify.mjs --self-test   (synthetic calls; exit 1 on a wrong classification)
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const at = (/** @type {string} */ flag) => argv.indexOf(flag);
/** @param {string[]} files @returns {Map<string, any>} the call lines by tag */
function callsOf(files) {
  /** @type {Map<string, any>} */
  const map = new Map();
  for (const file of files) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (line.trim() === '') {
        continue;
      }
      const c = JSON.parse(line);
      if (c.kind !== 'call') {
        continue;
      }
      if (map.has(c.tag)) {
        throw new Error(`${file}: the tag ${c.tag} occurs twice`);
      }
      map.set(c.tag, c);
    }
  }
  return map;
}
/**
 * The number of ratings after which the stall rule with limit n first holds on a recorded sequence, or null when it
 * never holds (the counting of simulate() in ../d21-2026-11-12/simulate.mjs and of RES-15a in clues.js).
 * @param {any} call @param {number} n
 */
function fireAt(call, n) {
  const { min, max } = call.target;
  const centre = (min + max) / 2;
  const half = (max - min) / 4;
  let best = Infinity;
  let stall = 0;
  let below = false;
  let above = false;
  let central = false;
  for (let i = 0; i < call.ratings.length; i += 1) {
    const s = call.ratings[i].s;
    if (s < centre - half) {
      below = true;
    } else if (s > centre + half) {
      above = true;
    } else {
      central = true;
    }
    let improved = false;
    if (s >= min && s < max && Math.abs(s - centre) < best) {
      improved = true;
      best = Math.abs(s - centre);
    }
    stall = improved ? 0 : stall + 1;
    if (best !== Infinity && !central && !(below && above) && stall >= n) {
      return i + 1;
    }
  }
  return null;
}
/** @param {any} c @returns {boolean} true when the call has a result in the central half of its band */
const central = (c) => c.result.ok
  && Math.abs(c.result.s - (c.target.min + c.target.max) / 2) <= (c.target.max - c.target.min) / 4;
/** @param {any} a @param {any} b */
const sameResult = (a, b) => (a.result.ok
  ? b.result.ok && a.result.h === b.result.h && a.result.s === b.result.s
  : !b.result.ok && a.result.reason === b.result.reason);
/** @param {any} a @param {any} b @param {number} k */
const samePrefix = (a, b, k) => b.ratings.length >= k
  && a.ratings.slice(0, k).every((/** @type {any} */ r, /** @type {number} */ i) => r.s === b.ratings[i].s && r.h === b.ratings[i].h);
/** @param {any} c */
const show = (c) => (c.result.ok ? `ok ${c.result.s} (${c.result.n} clues, ${c.result.h})` : c.result.reason);
/**
 * @param {any} b the baseline call @param {any} x its rerun @param {number} n the stall limit of the rerun
 * @returns {{ kind: 'none' | 'same' | 'lost' | 'changed' | 'irreproducible', stop: number | null, verdict: string }}
 */
function classify(b, x, n) {
  const stop = fireAt(b, n);
  if (stop === null) {
    return x.ratings.length === b.ratings.length && samePrefix(b, x, b.ratings.length) && sameResult(b, x)
      ? { kind: 'none', stop, verdict: '' }
      : { kind: 'irreproducible', stop, verdict: 'NOT REPRODUCIBLE: the rule never fires on the baseline sequence' };
  }
  if (!samePrefix(b, x, stop)) {
    return { kind: 'irreproducible', stop, verdict: `NOT REPRODUCIBLE: the rerun differs before rating ${stop}` };
  }
  if (sameResult(b, x)) {
    return { kind: 'same', stop, verdict: '' };
  }
  if (central(b) && !central(x)) {
    return { kind: 'lost', stop, verdict: `LOST CENTRAL: fired after rating ${stop}` };
  }
  return { kind: 'changed', stop, verdict: `changed: fired after rating ${stop}` };
}

function selfTest() {
  // Hard band [17, 25): centre 21, central half [19, 23]. Thirteen raw ratings of 18 (one-sided, nearest 3 from the
  // first one), then a central 21: with N = 12 the rule fires after rating 13; with N = 16 it never fires.
  const target = { min: 17, max: 25, share: 0.4 };
  /** @param {number[]} scores @param {string} p */
  const seq = (scores, p) => scores.map((s, i) => ({ s, c: 5, h: `${p}${i}` }));
  const base = { kind: 'call', tag: 'self', mode: 'require', target, ratings: seq([...Array(13).fill(18), 21], 'r'),
    result: { ok: true, s: 21, n: 6, h: 'base21' } };
  /** @param {any} result @param {any[]} [ratings] */
  const rerun = (result, ratings = base.ratings.slice(0, 13)) => ({ ...base, ratings, result });
  const edge = { ...base, ratings: seq(Array(13).fill(18), 'r'), result: { ok: true, s: 18, n: 5, h: 'r0' } };
  const early = { ...base, ratings: seq([18, 21], 'q'), result: { ok: true, s: 21, n: 6, h: 'q1' } };
  const cases = /** @type {[string, number, any, any, string][]} */ ([
    ['a different central puzzle at 21', 12, base, rerun({ ok: true, s: 21, n: 7, h: 'other21' }), 'changed'],
    ['a different central puzzle at 20', 12, base, rerun({ ok: true, s: 20, n: 6, h: 'other20' }), 'changed'],
    ['a loss to 18', 12, base, rerun({ ok: true, s: 18, n: 5, h: 'r0' }), 'lost'],
    ['no result', 12, base, rerun({ ok: false, reason: 'uniqueness-not-proved' }), 'lost'],
    ['the same result', 12, base, rerun({ ...base.result }), 'same'],
    ['a rerun that differs before the firing rating', 12, base,
      rerun({ ok: true, s: 21, n: 7, h: 'other21' }, base.ratings.map((r, i) => (i === 4 ? { ...r, h: 'zz' } : r)).slice(0, 13)),
      'irreproducible'],
    ['a change of a result that was not central', 12, edge, { ...edge, result: { ok: true, s: 17, n: 4, h: 'x' } }, 'changed'],
    ['never fires (N = 16), identical rerun', 16, base, { ...base }, 'none'],
    ['never fires (N = 16), another result', 16, base, { ...base, result: { ok: true, s: 21, n: 7, h: 'other21' } },
      'irreproducible'],
    ['never fires (a central rating), identical rerun', 12, early, { ...early }, 'none'],
  ]);
  let wrong = 0;
  for (const [name, n, b, x, want] of cases) {
    const got = classify(b, x, n).kind;
    console.log(`${got === want ? 'ok' : 'WRONG'} - ${name}: ${got}${got === want ? '' : ` (expected ${want})`}`);
    wrong += got === want ? 0 : 1;
  }
  console.log(`${cases.length - wrong} of ${cases.length} synthetic cases classified as expected`);
  process.exitCode = wrong === 0 ? 0 : 1;
}

function main() {
  if (at('--base') !== 0 || at('--n12') < 2 || at('--n16') !== at('--n12') + 2 || argv.length !== at('--n16') + 2) {
    throw new Error('usage: certify.mjs --base <require files...> --n12 <file> --n16 <file> | --self-test');
  }
  const base = callsOf(argv.slice(1, at('--n12')));
  const tags = [...base.keys()].filter((t) => typeof base.get(t).target.max === 'number' && base.get(t).mode === 'require');
  let failed = false;
  const rows = [];
  const notes = [];
  for (const [n, file] of [[12, argv[at('--n12') + 1]], [16, argv[at('--n16') + 1]]]) {
    const rerun = callsOf([String(file)]);
    const missing = tags.filter((t) => !rerun.has(t));
    const extra = [...rerun.keys()].filter((t) => !tags.includes(t));
    if (missing.length > 0 || extra.length > 0) {
      notes.push(`- N=${n}: ${missing.length} baseline calls without a rerun (${missing.slice(0, 5).join(', ')}), `
        + `${extra.length} reruns without a baseline (${extra.slice(0, 5).join(', ')})`);
      failed = true;
    }
    const r = { compared: 0, fired: 0, same: 0, lost: 0, changed: 0, irreproducible: 0 };
    for (const tag of tags.filter((t) => rerun.has(t))) {
      const b = base.get(tag);
      const x = rerun.get(tag);
      const { kind, stop, verdict } = classify(b, x, Number(n));
      r.compared += 1;
      r.fired += stop === null ? 0 : 1;
      if (kind !== 'none') {
        r[kind] += 1;
      }
      if (verdict !== '') {
        notes.push(`- N=${n} ${tag}: baseline ${show(b)} after ${b.ratings.length} rated; rerun ${show(x)} after `
          + `${x.ratings.length} rated (${verdict})`);
      }
    }
    rows.push(`| ${n} | ${r.compared} | ${r.fired} | ${r.same} | ${r.lost} | ${r.changed} | ${r.irreproducible} |`);
  }
  console.log(`## Certification of the require-mode calls (${tags.length} with a finite band)`);
  console.log('| N | compared | fired | fired, same final result | lost central final result | other changed results | not reproducible |');
  console.log('|---|---|---|---|---|---|---|');
  for (const row of rows) {
    console.log(row);
  }
  for (const note of notes) {
    console.log(note);
  }
  process.exitCode = failed ? 1 : 0;
}

if (argv.length === 1 && argv[0] === '--self-test') {
  selfTest();
} else {
  main();
}
```

**Population** (the D21 record `docs/difficulty-v3/d21-measurements-2026-11-12.md`, "Commands and artefacts", with v3
in place of v2): one serial process per capture (the drivers run in the main thread; no worker pool), in this order,
each within 10 minutes (AGENTS.md). D36 (a), precision 3: the population is the cells that **complete under v3**:
the fourteen captures of the table, plus one capture per Phase C1 cell that made all its puzzles (the replacement
cells of the recipe and of the slow test, and any Hell cell of C1 that completed), with the arguments of its C1
capture and the name `<C1 name>-nostall`. A cell that made no puzzle in C1 is not captured here: it has no rated
sequence, and no Hell sequence is ever made from v2 ratings. Every capture is written to `$v/nostall/<name>.jsonl`.

| Capture (`<name>.jsonl`) | Driver | Arguments | Limit (s) |
|---|---|---|---|
| `cell-10x6-hard` | `flow.mjs` | `--board 10x6 --level hard --seed t18-rect-a --quantity 5 --label cell-10x6-hard` | 600 |
| `cell-10x6-master` | `flow.mjs` | `--board 10x6 --level master --seed t18-rect-a --quantity 5 --label cell-10x6-master` | 600 |
| `cell-12x12-master` | `flow.mjs` | `--board 12x12 --level master --seed t18-big-a --quantity 5 --label cell-12x12-master` | 600 |
| `cell-18x20-hard` | `flow.mjs` | `--board 18x20 --level hard --seed t18-big-a --quantity 5 --label cell-18x20-hard` | 600 |
| `cell-18x20-master` | `flow.mjs` | `--board 18x20 --level master --seed t18-big-a --quantity 5 --label cell-18x20-master` | 600 |
| `generation-case` | `flow.mjs` | `--board 10x6 --level hard --seed fixture-set-0 --quantity 10 --label generation-case` | 600 |
| `ui-default-10x6-normal` | `flow.mjs` | `--recipe default-10x6-normal --label default-10x6-normal` | 600 |
| `ui-heart-n10-master` | `flow.mjs` | `--recipe heart-n10-master --label heart-n10-master` | 600 |
| `vectors` | `vectors.mjs` | (none) | 600 |
| `pop-recipe-board` | `pop.mjs` | `--recipe-board 200` | 600 |
| `pop-10x6-hard` | `pop.mjs` | `--cell 10x6:hard --sets 20 --seeds 10` | 600 |
| `pop-10x6-master` | `pop.mjs` | `--cell 10x6:master --sets 20 --seeds 10` | 600 |
| `pop-12x12-master` | `pop.mjs` | `--cell 12x12:master --sets 10 --seeds 6` | 600 |
| `pop-12x12-expert` | `pop.mjs` | `--cell 12x12:expert --sets 10 --seeds 6` | 600 |
| `<C1 name>-nostall` | `flow.mjs` | the arguments of the C1 capture, label `<C1 name>-nostall` | 600 |

Not repeated, with the reason in the record: `fixtures-check` (`record-fixtures --check` compares with the v2
fixtures before GF-P2 and fails by design; its selection calls are those of the generation case and the sample pack)
and the timed runs of the D21 record (`hell3-pool-*`, `hell3-q10-pre`, `hell3-q3-certify`); the Hell outcomes and
times are Phase C1's.

Then, after the split, the two certification reruns (B), each one serial capture into `$v/rerun/<name>.jsonl`:

| Capture (`<name>.jsonl`) | Preload | Driver | Arguments | Limit (s) |
|---|---|---|---|---|
| `n12` | `$d/register.mjs` (N = 12, the product) | `$v/rerun.mjs` | `--recipe-board 200` | 600 |
| `n16` | `$v/stall16.mjs` | `$v/rerun.mjs` | `--recipe-board 200` | 600 |

Expected wall times (SA1's trial with `--recipe-board 4`, extrapolated): `pop-recipe-board` about 4-5 minutes (most
of it in the 230 master calls), each rerun about 1.5 minutes (184 calls). A `pop-recipe-board` capture or a rerun
stopped at its limit leaves calls without a partner, so `certify.mjs` exits 1 and the decision stops: report it; never
shrink the population or raise a limit.

**Reading the result.** `simulate.mjs` prints a table per file and, over several files, a TOTAL table with the
columns `fired`, `earlier than MP07`, `result changed (clues)`, `result changed (score)`, `missed a central result`
and `ratings saved`; on these no-stall captures "MP07" means the end of the recorded call, so `earlier than MP07`
counts the calls that the rule would stop before their end. The TOTAL heading also counts the calls "in require
mode", which is 0 for the screening files. `certify.mjs` prints one row per N with the columns `compared`, `fired`,
`fired, same final result`, `lost central final result`, `other changed results` and `not reproducible`, then one
line per call that fired with another result or is not reproducible, and exits 1 when a baseline call has no rerun
or a rerun has no baseline. With missed(N) = A's TOTAL `missed a central result` at N plus B's `lost central final
result` at N, the decision is the first row that applies:

| Evidence | Decision |
|---|---|
| `split.mjs` failed; or the TOTAL heading of `simulate.md` counts a call in require mode; or `certify.mjs` exited 1; or B has a call `not reproducible` at N = 12 or 16 | stop before GF-P2 and report: a defect of the measurement, not a result |
| A's TOTAL `fired` at N = 12 is 0 and B's `fired` at N = 12 is 0 (the rule fires nowhere) | keep `STALL_LIMIT = 12`; no code or test changes; the record says "inert on the v3 corpus", and MP12 re-examines the rule with the landscape data (D36 (a), precision 3) |
| missed(12) = 0 | keep `STALL_LIMIT = 12`; no code or test changes |
| missed(12) > 0 and missed(16) = 0 | raise to 16 (below), before GF-P2 |
| missed(16) > 0 | stop before GF-P2 and report the `--list` lines of `simulate.md` and the call lines of `certify.md`: a new answer of the plan author is needed; no other value is tried |

N = 8 is reported (A, and the raw `require` table) and never lowers the limit. The raw triggers of
`simulate-require-raw.md` and the controls table `simulate-controls.md` are reported in the record and never enter
the decision.

**Raising to 16** (only by the rule above):

- `core/engine/clues.js`: `const STALL_LIMIT = 12;` becomes `const STALL_LIMIT = 16;` (the only edit of that file;
  adjust its comment if it names 12); design §6.10 states 16 and the record.
- `tests/clues.test.js`, MP07's scripted stall tests (the analysts' reference run with the limit 16; result clues and
  scores do not change): 'stall, stops after 12 …' becomes 'stall, stops after 16 …' with `flat.rated.length` 13 → 17,
  `late` 25 → 29 (the result is still `late.rated[12]`), `lateStart` 18 → 22, `outOfBand` 13 → 17, `again` 13 → 17;
  'stall, not with a central candidate seen …' unchanged (48, 48, 13); 'stall, returns the best by ranked order'
  14 → 18; 'stall, require mode …' `run.rated.length` 13 → 17, `run.calls.slice(0, 13)` → `slice(0, 17)`,
  `run.calls.length` 14 → 18, repairs `['YVNWZ:21']` and `['YVNWZ:25']` unchanged; 'unbounded' unchanged; each
  message that counts the limit says 16 (and "15 non-improving ratings are not enough" where it says 11).
- MP09c's vectors in `tests/clues.test.js`: S8 unchanged (48 calls); S8s 47 calls (17 `5:17/1*`, 20 `6:30/0`, 10
  `4:capped`; last call `LUVWZ:17/1*`; result `LYNWZ`, 17); ST1 20 calls (the 16 listed, then `YPVTF:18/1* PVT:18/1*
  PVTFX:18/1* IPVTF:18/1*`; result `YPVF`, 18); ST2 18 calls (the 14 listed, then `INFWZX:18/1* TNFWX:18/1* INFW:18/1*
  IUNFWX:18/1*`; result `YPTZ`, 18), for both lists.
- Re-run Phase A of the test plan before GF-P2.

### Hell levels under v3 (D36, answered (a); owner decision P-OD5)

The evidence (SA1's probe, `clarifications.md` Part I, D36): the sets the D21 flow builds for 22x22 Hell 1, Hell 2
and Hell 3, 15x20 and 18x18 Hell 2 and 24x24 Hell 3 were rated with `measureDeduction` and the pinned `DEDUCE`; 26 of
27 ratings were capped (`work-cap` at 760,000,000, about 1.6-2.6 s each), so were 3 of 3 with ten times the work cap
and 5 of 5 with `lookaheadWidth: 0`. Under v3 these calibrations are expected to end `not-in-band` after 20 spent
profiles (MP09c's S5b). The plan author's answer (a) gives this task four precisions: (1) record every Hell failure
of the recipe and the slow test with its outcome (profiles spent, all `path-capped`, time); (2) replace the recipe and
the slow test by the highest level the same board completes under v3, and keep one test pinning an unrateable
calibration; (3) run D21-V3 on the cells that complete (the population above); (4) an availability probe of a few
minutes. This task changes no cap, level, area or offering, and implements no fail-fast (MP12 proposes one).

`$v` is `docs/difficulty-v3/d21-v3-<date>`, `$d` is `docs/difficulty-v3/d21-2026-11-12` (read only).

**The observer of C1 and C2**, `$v/spent.mjs`, exactly:

```js
// D36 observer (MP09d2): the D21 observer (../d21-2026-11-12/register.mjs) plus, after each selectClues call line,
// one line { kind: 'spent', tag, capped, cappedWork }: the profiles of that call whose rating was unrateable
// (IncompleteRatingError, code 'rating-incomplete') and the work their searches spent. The stall stop stays on (the
// production rule). No product file is changed. Use: node --import <this file> <driver> ...
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '../d21-2026-11-12/register.mjs';

const root = resolve(process.env.D21_ROOT ?? '.');
const out = process.env.D21_OUT;
const { rate: defaultRate } = await import(pathToFileURL(join(root, 'core', 'engine', 'difficulty.js')).href);
const observe = globalThis.__d21Tap;

globalThis.__d21Tap = (/** @type {any} */ ctx, /** @type {(c: any) => any} */ inner) => {
  const rate = ctx.rate ?? defaultRate;
  let capped = 0;
  let cappedWork = 0;
  const counting = {
    ...ctx,
    rate: (/** @type {any} */ b, /** @type {any} */ p, /** @type {any[]} */ clues, /** @type {any} */ w) => {
      try {
        return rate(b, p, clues, w);
      } catch (e) {
        if (/** @type {any} */ (e)?.code === 'rating-incomplete') {
          capped += 1;
          cappedWork += /** @type {any} */ (e).counters?.work ?? 0;
        }
        throw e;
      }
    },
  };
  const result = observe(counting, inner);
  if (out !== undefined) {
    appendFileSync(out, `${JSON.stringify({ kind: 'spent', tag: globalThis.__d21Tag, capped, cappedWork })}\r\n`);
  }
  return result;
};
```

The D21 observer writes the `call` line inside `observe`, so each `spent` line follows its `call` line. A profile of
a call is then rated (`ratings`), refused by AR1 (`repairs`: in `any` mode every entry is a rating not followed by
`onRate`) or unrateable (`capped`).

**The availability driver of C2**, `$v/avail.mjs`, exactly (TP04: `--blocked` builds the 164-cell board of
`deterministicBoard(164)`; SA1 ran it once on 13x13 with 5 blocked: 164 active cells, label `avail-13x13b5-hell-1`,
a valid set attempt):

```js
// D36 availability probe (MP09d2): set attempts 0 to n - 1 of one board and level under v3, observed by spent.mjs
// (the rated, refused and unrateable profiles of each calibration). Reports no times. A board `WxH` is columns x rows;
// `--blocked <n>` blanks the last n cells of the last row, as rectRows in tools/bench/calibration-reference.js
// (deterministicBoard(164) is 13 x 13 with 5 blocked: 164 cells). Environment: D21_OUT (jsonl file), D21_ROOT (tree to
// measure, default the working directory).
//   node --import ./<this folder>/spent.mjs ./<this folder>/avail.mjs --board 13x13 --blocked 5 --level hell-1 --seed t18-big-a --attempts 3
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { boardFromRows } = await imp('core/engine/board.js');
const { setAttempt } = await imp('core/engine/generate.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
}
const [, w, h] = /^(\d+)x(\d+)$/.exec(args.get('board') ?? '') ?? [];
const cols = Number(w);
const rows = Number(h);
const blocked = Number(args.get('blocked') ?? 0);
const levelId = args.get('level');
const seedText = args.get('seed');
const attempts = Number(args.get('attempts') ?? 3);
const label = `avail-${args.get('board')}${blocked > 0 ? `b${blocked}` : ''}-${levelId}`;
const boardRows = Array.from({ length: rows }, (_, y) => (y === rows - 1 && blocked > 0
  ? '#'.repeat(cols - blocked) + '.'.repeat(blocked)
  : '#'.repeat(cols)));
const board = boardFromRows(boardRows);
const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
const event = (/** @type {object} */ e) => globalThis.__d21Event({ label, ...e });
event({ ev: 'start', levelId, seedText, attempts, cols, rows, blocked, area: cols * rows - blocked });
for (let j = 0; j < attempts; j += 1) {
  globalThis.__d21Tag = `${label}/set/${j}`;
  try {
    const r = setAttempt({ board, rotation: 0, levelId, seedText, uniqueness: 'any', execution }, j);
    event({
      ev: 'set-attempt', j, ok: r.ok, reason: r.ok ? null : r.reason, K: r.ok ? r.set.pieces.length : null,
      calibrationScore: r.ok ? (r.calibration.rating?.score ?? null) : null,
    });
  } catch (e) {
    event({ ev: 'set-attempt', j, ok: false, reason: `error: ${/** @type {Error} */ (e).message}` });
  }
}
event({ ev: 'end' });
```

**The summary**, `$v/summarise.mjs` (reads only; write it to this contract): `node ./$v/summarise.mjs <files...>`
prints Markdown, per file a heading with the file name, then (a) a table of its `call` lines in file order with the
columns `Call` (the `tag`), `Rated` (`ratings.length`), `Refused (AR1)` (`repairs.length`), `Capped` (`capped` of the
`spent` line that follows; `?` when there is none), `Best score` (the largest `ratings[].s`, `-` when none), `In band`
(some rated score in `[target.min, target.max)`, `target.max` null meaning no upper edge), `Result` (`ok <s> (<n>
clues)` or the `reason`); (b) one bullet per driver line with `ev` equal to `start`, `set-attempt`, `set`, `set-done`
or `end` (the line without `kind` and `tag`; flow-pool lines have `atMs`); (c) a total line: calls, rated, refused,
capped, set attempts ok and failed. ASCII output only.

**Phase C1 (announced; timed): the Hell outcomes and the replacements.** Every capture below runs
`node --import ./$v/spent.mjs ./$d/flow.mjs <arguments>` into `$v/hell/<name>.jsonl`, except the first, which runs
`node ./$d/flow-pool.mjs <arguments>` (the real two-worker flow; no preload). Run them in this order, before any
edit of the recipe:

| Capture | Arguments | Limit (s) | For |
|---|---|---|---|
| `hell-22x22-hell-3-pool` | `--recipe square-22x22-hell-3 --quantity 10` | 300 | the recipe in the two-worker flow: its notice, puzzles and end time (precision 1) |
| `hell-22x22-hell-3` | `--recipe square-22x22-hell-3 --quantity 10 --label hell-22x22-hell-3` | 300 | the recipe, serial: each set attempt with its profiles and time (precision 1) |
| `hell-15x20-hell-2` | `--board 15x20 --level hell-2 --seed t18-big-a --quantity 1 --label hell-15x20-hell-2` | 180 | MP07's slow test (its set attempt 0) (precision 1) |
| `hell-22x22-hell-1` | `--board 22x22 --level hell-1 --seed t18-big-a --quantity 5 --label hell-22x22-hell-1` | 180 | the Hell cells of the D21 reach table |
| `hell-22x22-hell-2` | `--board 22x22 --level hell-2 --seed t18-big-a --quantity 5 --label hell-22x22-hell-2` | 180 | as above |
| `hell-32x15-hell-3` | `--board 32x15 --level hell-3 --seed t18-big-a --quantity 5 --label hell-32x15-hell-3` | 180 | as above |
| `hell-18x18-hell-2` | `--board 18x18 --level hell-2 --seed t18-big-a --quantity 5 --label hell-18x18-hell-2` | 180 | as above |
| `hell-24x24-hell-3` | `--board 24x24 --level hell-3 --seed t18-big-a --quantity 5 --label hell-24x24-hell-3` | 180 | as above |

Then the replacement search (precision 2), stall stop on, one capture at a time:

1. **The recipe** (board 22 x 22, seed `t18-big-a`, quantity 10): for each level in the order `hell-2`, `hell-1`,
   `nightmare`, `master`, `expert`, `hard` (the levels offered on 484 cells below `hell-3`): skip a level whose
   `hell-22x22-<level>` capture made no set (the set phase does not depend on the quantity); otherwise capture
   `repl-22x22-<level>` with `--board 22x22 --level <level> --seed t18-big-a --quantity 10 --label repl-22x22-<level>`
   (limit 600 s). A level is a candidate when its `end` event has `status: 'complete'` and `accepted: 10`. For the
   first candidate, edit the recipe in `tests/fixtures/ui-flow-recipes.json`: `name` becomes
   `square-22x22-<level>` and `levelId` becomes `<level>`; nothing else changes (`expect` is migrated in GA-P2). Then
   run `node ./$d/flow-pool.mjs --recipe square-22x22-<level> --quantity 10` into
   `$v/hell/repl-22x22-<level>-pool.jsonl` (limit 300 s): the level is chosen when the last line has `ev: 'end'`,
   `puzzles: 10` and `notice: null`. Otherwise restore the recipe and continue with the next level. No level chosen:
   stop and report.
2. **The slow test** (board 15 x 20, seed `t18-big-a`, set attempt 0; precision 2 asks for 10 of 10 here too,
   cross-review third pass): for each level in the order `hell-1`, `nightmare`, `master`, `expert`, `hard`, `normal`
   (offered on 300 cells below `hell-2`), capture `repl-15x20-<level>` with `--board 15x20 --level <level> --seed
   t18-big-a --quantity 10 --label repl-15x20-<level>` (limit 600 s). The first level whose `set-attempt` event with
   `j: 0` has `ok: true` and whose `end` event has `status: 'complete'` and `accepted: 10` is chosen; its `set` event
   gives `K` and `calibrationScore`. A capture stopped at its limit does not qualify its level. No level chosen: stop
   and report. The unit test below stays a calibration test (set attempt 0 only).
3. **The unrateable input**: the old input (15 x 20, `hell-2`, `t18-big-a`, attempt 0) when, in `hell-15x20-hell-2`,
   the call tagged `hell-15x20-hell-2/set/0` has no rating, no refused entry, `capped` above 0 and the result
   `not-in-band`, and the `set-attempt` event with `j: 0` has `reason: 'not-in-band'`. Otherwise use the first capture
   of the C1 table (in its order) whose attempt 0 meets the same conditions, and record the choice; none: stop and
   report.

The two slow tests in `tests/clues.test.js`, in place of MP07's 15 x 20 Hell 2 test (import `inBand` from
`../core/engine/difficulty.js` if the file does not import it yet):

```js
test('slow: a 15 x 20 <Level> calibration (K = <K>) is in band under v3 (D36: replaces the Hell 2 case)', () => {
  const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
  const set = setAttempt({ board: boardFromRows(Array(20).fill('#'.repeat(15))), rotation: 0, levelId: '<level id>',
    seedText: 't18-big-a', uniqueness: 'any', execution }, 0);
  assert.ok(set.ok);
  assert.equal(set.set.pieces.length, <K>);
  assert.equal(set.calibration.rating.model, 'difficulty-v3');
  assert.ok(inBand(set.calibration.rating, level('<level id>')));
  assert.equal(set.calibration.rating.score, <calibrationScore>);
  assert.equal(set.calibration.clues.length, <clues>);
});

test('slow: an unrateable calibration ends not-in-band with no puzzle (D36)', () => {
  const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
  const set = setAttempt({ board: boardFromRows(Array(20).fill('#'.repeat(15))), rotation: 0, levelId: 'hell-2',
    seedText: 't18-big-a', uniqueness: 'any', execution }, 0);
  assert.deepEqual(set, { ok: false, reason: 'not-in-band' });
});
```

`<Level>`, `<level id>`, `<K>` and `<calibrationScore>` come from step 2; `<clues>` from one run of the test (a
characterisation: these values move with the knobs and are re-pinned by MP12). The second test keeps the old input
unless step 3 chose another (then its board, level and seed). That every profile of it was unrateable is the evidence
of `hell-15x20-hell-2`, not an assertion (`setAttempt` has no rate seam). Run both once after the edit:
`node --test --test-name-pattern="15 x 20|unrateable calibration" tests\clues.test.js` (part of the C1 block; about
1-2 minutes).

**Phase C2 (announced; reports no times): the availability probe** (precision 4). For Hell 1, Hell 2 and Hell 3, the
smallest board each is offered on (`AREAS` in `core/engine/levels.js`: 164, 266 and 450 cells) and one mid-size
board, three set attempts each, seed `t18-big-a`: `node --import ./$v/spent.mjs ./$v/avail.mjs --board <board>
[--blocked <n>] --level <level> --seed t18-big-a --attempts 3` into `$v/avail/<name>.jsonl`, limit 300 s each.

| Capture | Board (active cells) | Level |
|---|---|---|
| `avail-13x13b5-hell-1` | 13x13 with `--blocked 5` (164: `deterministicBoard(164)` of `tools/bench/calibration-reference.js`, TP04) | `hell-1` |
| `avail-20x20-hell-1` | 20x20 (400) | `hell-1` |
| `avail-19x14-hell-2` | 19x14 (266) | `hell-2` |
| `avail-20x20-hell-2` | 20x20 (400) | `hell-2` |
| `avail-25x18-hell-3` | 25x18 (450) | `hell-3` |
| `avail-22x22-hell-3` | 22x22 (484; Hell 3 is not offered below 450) | `hell-3` |

**Summaries**: `node ./$v/summarise.mjs <the C1 files> | Set-Content $v/hell-summary.md` and the same for the C2
files into `$v/avail-summary.md`.

**The record** `docs/difficulty-v3/d21-v3-<date>.md` ("D21-V3 and D36: the stall limit and the Hell levels under
v3"), English, CRLF:

1. Header: date, `git rev-parse HEAD` (the working tree of MP09d2 on top of it), Node version, CPU count, `DEDUCE`,
   `SCORE_V3`, `STALL_LIMIT` at the start; the `runs.md` table.
2. Hell outcomes (precision 1): per C1 Hell capture, the set attempts made and, per attempt, its outcome, the profiles
   rated, refused and capped, and its time; the batch outcome; for `hell-22x22-hell-3-pool`, the notice, the puzzles
   and the end time of the two-worker flow. A capture stopped at its limit is labelled reduced.
3. Replacements (precision 2): every level tried on each board with its outcome; the chosen recipe level with its
   serial and two-worker results; the chosen slow-test level with `K`, the score and the clues; the unrateable test's
   input with its C1 evidence.
4. Availability (precision 4): per board (with its active area from the `start` event) and level, the attempts and
   their outcomes, the profiles rated, refused and capped, the best score seen with its level, and whether it was in
   band; then one or two sentences: Hell is out of reach only on the large boards, everywhere measured, or reachable
   on the boards listed.
5. D21-V3 (precision 3; TP03): per capture the calls, finite-band calls, rated candidates, `repairs` entries and
   results, and the count lines of `split.txt`; A: the TOTAL table of `simulate.md` (screening of the `any`-mode
   calls, exact) with its `--list` lines; B: the table and call lines of `certify.md` (the `require`-mode calls
   rerun at 12 and 16); the raw `require` table of `simulate-require-raw.md` (reported only); the controls table of
   `simulate-controls.md` (mechanics of the rule on scripted `difficulty-v2` doubles, outside the v3 evidence);
   missed(12) and missed(16) with their parts A and B; the decision, with "inert on the v3 corpus" when the second
   row of the decision table applies.
6. For MP12: the (board, level) cells that v3 could not make in sections 2 and 4, and how long each request ran before
   it failed (serial set attempts; the two-worker flow), for the owner's question and the fail-fast proposal.

## Files to create/modify

### Exclusive ownership

- `core/engine/difficulty.js` (`MODEL`, `rate`, the module header); `tools/record-fixtures.mjs` (`verifySample` and
  its imports only).
- The test files and fixtures of the table above, only as listed; `tests/fixtures/generation-case.json` and
  `tests/fixtures/generated-sample-pack.json` through the tool only; in `tests/fixtures/ui-flow-recipes.json` the
  `name` and `levelId` of the replaced recipe (Phase C1) and the `expect` migration of GA-P2; in `tests/clues.test.js`
  the two slow tests of "Hell levels under v3" in place of MP07's 15 x 20 Hell 2 test.
- The evidence (new): `docs/difficulty-v3/d21-v3-<date>/` (`nostall.mjs`, `stall16.mjs`, `split.mjs`, `rerun.mjs`,
  `certify.mjs`, `spent.mjs`, `avail.mjs`, `summarise.mjs`; the captures under `hell/`, `avail/`, `nostall/` and
  `rerun/`; the split under `split/` (`screen/`, `require/`, `controls/`); `runs.md`, `split.txt`, `hell-summary.md`,
  `avail-summary.md`, `simulate.md`, `simulate-require-raw.md`, `simulate-controls.md`, `certify-self-test.txt`,
  `certify.md`) and the record `docs/difficulty-v3/d21-v3-<date>.md`; `tests/artifacts/MP09d2/` (the Phase B
  diagnostic and the first GA-P2 run; not committed); only when D21-V3 raises the limit: the `STALL_LIMIT` line of
  `core/engine/clues.js` and the stall-test values of `tests/clues.test.js` listed in the D21-V3 section.
- The documents of the documentation slot.

Must not edit: `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`, `core/engine/deduce.js`,
`policy.js`, `pack.js`, `clues.js` (except the `STALL_LIMIT` line by the D21-V3 rule), `puzzlecode*.js`,
`generate.js`, `tasks.js`, `tools/rate-probe.mjs`, the apps, `docs/difficulty-v3/d21-2026-11-12/` and its record.

### Documentation slot

`docs/design-detail.md`:

- Line 24 ("pending evidence" table): `` `difficulty-v2`, `gen-v3` as specified `` becomes `` `difficulty-v3` (knobs
  from the fit of MP06c, locked by the calibration of MP12), `gen-v3` as specified ``.
- Glossary (45-46): "Score / level" names `difficulty-v3` (§7.10); "Saturated rating" becomes "a stored
  `difficulty-v2` rating whose search-effort term hit its cap (shown with "+"); `difficulty-v3` ratings are never
  saturated (§7.3)"; add "Estimate (censored rating): a v3 rating whose census of the guesses did not finish within its
  work budget; undecided alternatives count as failing, so the score is an upper estimate, stored with
  `censored: true` (§7.10)".
- §1.2 row R3 (84): `difficulty-v3` (§7.10); puzzles are accepted in band, aiming at the centre of the band (§6.10),
  and, for generated puzzles at Hard or above, only with a proved decisive guess (§7.6); imported puzzles and stored
  claims are not filtered.
- §2 decision record: D10 "Difficulty formula" becomes `difficulty-v3` (§7.10): score = base(U) + rule term (hardest
  deduction tier) + guess term (decisive guesses G and their information) − the few/many penalty, rounded once;
  `difficulty-v2` (D = round(2U + 8·log10(1 + B_eff))) stays the legacy score of stored claims; rationale: the score
  follows how people solve (plan §1.3, "make Hard really hard"). D11 becomes: the deduction solver of §7.9 under
  deterministic node, work and census caps; a capped path is unrateable; one canonical DLX traversal (5,000 branch
  trials or 50,000 row trials) stays as a stored diagnostic (B). D13: v3 scores are never saturated; an unfinished
  census is stored as `censored: true`; no "≥" display.
- §4.1 types: the engine produces `RatingV3` only; `RatingV2` describes stored claims.
- §4.2 `difficulty.js` block (486-491, as MP09d1 left it): `MODEL = 'difficulty-v3'`; `rate(...): RatingV3` (throws
  `UnsatisfiableError` or `IncompleteRatingError`); remove "returns `rateV2` until the activation".
- §5.4 (780): `rating.model` (`difficulty-v3`; packs carrying `difficulty-v2` and `difficulty-v1` ratings are accepted
  and shown as claims).
- §6.10 (MP07 and MP09c text): the rating line refers to §7.10; line 1379 ("A saturated rating at 484 cells costs ≤ ~4
  s") becomes the v3 cost with a reference to the probe record `docs/difficulty-v3/probe-<date>.md` (MP06b); the
  stall-stop paragraph cites the D21-V3 record `docs/difficulty-v3/d21-v3-<date>.md` and states the limit it kept or
  set (12 or 16), with "inert on the v3 corpus" when the record says so.
- §7.1 Metrics: replace the table by the score inputs of v3 (U, `deductionTier`, G, `info`, `solutions`) and a list of
  the stored diagnostics (`R`, `H`, the DLX fields, `searchStop`, `F`, `E`, `rules`, `tier`, `Cmax`, `Dmax`, `Gt`,
  `nodes`, `work`, `S`, `solutionLimit`, the census fields, `Gproved`), with a pointer to §7.10 for the order.
- §7.2: title "Formula `difficulty-v2` (legacy)"; a first sentence: stored `difficulty-v2` claims and the frozen
  puzzle-code rebuild use this formula (`scoreV2`); new ratings use §7.10. The rest unchanged.
- §7.3: title "Caps, saturation and unrateable puzzles": v3 uses the `DEDUCE` caps; a path capped before its first
  solution is unrateable (`IncompleteRatingError`, never a "+" rating; generation spends one profile on it, §6.10);
  an unfinished census gives a stored estimate (`censored: true`); the DLX diagnostic keeps its caps and its pinned
  B = 5,000 but never enters the v3 score; saturation and "+" remain only for stored v2 claims.
- §7.5, after the availability bullets (D36 (a); interim until the owner's MP12 decision): "Under `difficulty-v3` the
  reachability condition above is the v2 bound `2·(Kmax − 1) + 30`. A capped rating gives no score (§7.3): the Hell
  levels measured in `docs/difficulty-v3/d21-v3-<date>.md` could not be made on the boards listed there, and a request
  for one ends with no puzzle. The intervals are reviewed with the v3 calibration (§7.8)." (Adjust the last part to
  the measured result of record section 4.)
- §7.7: D is a pure function of board rows, piece shapes, clue cells, `DEDUCE`, `SCORE_V3` and the model id; bump the
  model id (`difficulty-v4`, …) when a knob, a cap, a band, a rule of the ladder, the census or a counter changes.
- §7.8: `difficulty-v2` was final for release 1 and is now the legacy model; the v3 knobs come from the initial fit
  (`docs/difficulty-v3/fit-<date>.md`) and are locked after MP12 (`docs/difficulty-v3/calibration-<date>.md`).
- §7.9 (as MP09d1 left it): "`measureV3` (§7.10) calls it for every rating".
- §7.10 (MP08 and MP09d1): title "Formula and rating `difficulty-v3`" (drop "not yet the rating"); add `rate` with
  the key order and `censored`, and `rateV2` for legacy uses.
- §13.2 row `difficulty` (about 2647): add the `rate` cases (key order, zero, census estimate, invariance); the v2
  worked examples are kept as legacy.

`docs/design-brief.md`, "Levels and typical boards" (line 35): after "One shared scoring method supplies **estimates,
not promised solving times**.", add: "The score follows how a person solves: forced placements, deductions of
growing depth and real guesses. The Generator makes puzzles at Hard and above only when they need at least one real
guess; imported puzzles are rated but not filtered, and a rating whose count of the guesses did not finish is marked
as an estimate. Puzzles made before this version keep their stored score." (SP01: the proved-guess rule is a rule of
generation, not of the rating.)

`USERGUIDE.md` "Difficulty" bullet (line 132) and `USERGUIDE.vn.md` "Độ khó" bullet (line 123): one sentence each,
for example "The score counts the pieces to place, the hardest deduction needed and the real guesses (choices where
an option fails); puzzles the Generator makes at Hard and above always need at least one real guess. Puzzles made
before this version keep their stored score." and natural Vietnamese with the guide's terms (for example "Điểm tính
theo số mảnh cần đặt, bước suy luận khó nhất cần dùng và số lần phải đoán thật (lựa chọn có phương án sai); đề do
trình tạo đề tạo ra từ mức Khó trở lên luôn cần ít nhất một lần đoán thật. Các đề tạo trước phiên bản này giữ nguyên
điểm đã lưu.").

`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`, "Code layout", after the `deduce.js` sentence:
"`core/engine/difficulty.js` computes the `difficulty-v3` rating from it (`measureV3`, `rate`) and keeps the v2
functions (`scoreV2`, `measureV2`, `rateV2`) for stored claims, fixtures and the rating probe." (and the Vietnamese
equivalent).

## Implementation steps

1. `difficulty.js`: `MODEL`, `rate` in v3, the header comment ("Shared difficulty rating (`difficulty-v3`, design
   §7.10) …; the v2 functions are kept for stored claims").
2. `tools/record-fixtures.mjs` `verifySample`.
3. The new tests; the intended contract changes of the table, except the fixtures and the UI-flow expectations (the
   removal of the delegation loop of 'the v2 rating keeps its results under its v2 names' among them: Phase A runs
   that test).
4. Phase A (test plan): the fixture-independent targeted tests; they must pass. This is the only pre-GF-P2 gate on
   the tests (TP02).
5. Phase B: the quick set before GF-P2, as a labelled diagnostic only (TP02): save its output, list its failing
   names in the reply, and go on whatever it shows. Files that read the recorded fixtures or run the recorded recipe
   fail by design until GF-P2 (the recipe's model version is refused by `checkRecipe`; TAP also lists their parent
   suites). Never edit a test because of this output; Phase E is the verdict.
6. Phase C1 (announced; timed): create `$v/spent.mjs` exactly; the C1 Hell captures in table order; the replacement
   search (recipe, then slow test, then the unrateable input); the recipe edit and its two-worker check; the two slow
   tests of "Hell levels under v3" and their one run.
7. Phase C2 (announced; reports no times): create `$v/avail.mjs` exactly; the six availability captures; write
   `$v/summarise.mjs` and the two summaries.
8. Phase C3 (announced): create `$v/nostall.mjs`, `$v/stall16.mjs`, `$v/split.mjs`, `$v/rerun.mjs` and
   `$v/certify.mjs` exactly; the no-stall captures (the fourteen of the table and the `-nostall` captures of the C1
   cells that completed); the split; `simulate.md` (A), `simulate-require-raw.md` and `simulate-controls.md`;
   `certify.mjs --self-test` (TP14); the two certification reruns and `certify.md` (B); apply the decision table
   (raise to 16 only by its rule, then re-run Phase A); write `docs/difficulty-v3/d21-v3-<date>.md`.
9. Phase D: announce and run GF-P2.
10. Phase E: strict, after GF-P2: the two re-pins of the table that read the re-recorded sample
    (`tests/pack.test.js` line 576, `tests/rate-probe.test.js` lines 71, 77 and 101), then the fixture-dependent
    files, then the quick set; everything passes.
11. Phase F: announce and run GA-P2: the first `npm test` is kept as evidence; migrate only the UI-flow expectations
    of recipes that completed (the replaced recipe among them); `node --test tests\generator-controller.test.js`; the
    final `npm test` is the gate verdict. A recipe that does not complete, or any other unexpected failure, stops the
    task before the final `npm test`: report it.
12. Documents; `npm run test:quick` and `npm run check` again.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09d2-B01 | Every new rating, from `rate` and in generation, is a `difficulty-v3` rating built on the deduction measure, and `rate` never refuses a rating (an unfinished census gives a labelled estimate, even at Hard or above with `Gproved === 0`); generated puzzles at Hard and above have a proved decisive guess (generation acceptance, MP09c); imported puzzles and stored claims are not filtered | the `rate` tests (the census estimate among them); every Hard puzzle of the re-recorded generation fixture has `metrics.Gproved >= 1` |
| MP09d2-B02 | An estimate is marked (`censored: true`) and a capped puzzle is unrateable; no v3 rating shows "+" | census-estimate test; MP09d1's capped tests through `rate` |
| MP09d2-B03 | Stored puzzles, claims, links and codes are unchanged; the Player sample and the code goldens are byte-identical | `git diff --stat`; the unchanged golden tests |
| MP09d2-B04 | The stall stop of clue selection is checked on v3 sequences of the cells that complete under v3 before the fixtures are re-recorded: an exact screening of the `any`-mode calls, and for the `require`-mode calls the actual final results with the stop at 12 and 16 compared with a run without it (a raw trigger alone never decides); the limit stays 12 (marked "inert on the v3 corpus" when the rule fires nowhere, for MP12 to re-examine), or becomes 16 by the stated rule; no other value is taken; no Hell sequence is made from v2 ratings; the scripted `difficulty-v2` vectors are reported only as mechanics controls | `docs/difficulty-v3/d21-v3-<date>.md` |
| MP09d2-B05 | The owner can see with numbers what v3 does to the Hell levels (D36 (a)): every Hell failure of the recipe and the slow test (profiles spent, all unrateable, time); the recipe and the slow test replaced by the highest level the same board completes, the recipe making 10 of 10 in the real two-worker flow; one test that keeps the unrateable calibration visible; and whether Hell can be made on the smallest boards it is offered on | the record, sections 2-4 and 6; the two slow tests; GA-P2 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09d2-T01 | `rate` returns `RatingV3` in the stated key order with `censored: true` exactly when `censusComplete` is false, never `saturated: true`, and lets `IncompleteRatingError` and `UnsatisfiableError` through; `MODEL` and `currentVersions().model` are `difficulty-v3` | new tests |
| MP09d2-T02 | Every intended contract change of the table is made, and no other existing test is edited | `git diff --stat`; the reply's list |
| MP09d2-T03 | GF-P2: fixtures re-recorded with the reason "P2: difficulty-v3", `record-fixtures --check` passes, `versions.model` is `difficulty-v3`; GA-P2: the first `npm test` output is kept, only UI-flow expectations of recipes that completed are migrated (never a quantity), and the final `npm test` passes; a recipe that does not complete is reported for the owner (D21, D36) and the final run is not made | gate record; `tests/artifacts/MP09d2/ga-p2-first.txt` |
| MP09d2-T04 | `verifySample` checks the gen-v2 Player sample with `rateV2` and v3 samples with `rate`; an unrateable sample puzzle stops the tool with its index | tests (`tests/player-load.test.js` line 261 `assert.deepEqual(verifySample(JSON.parse(sampleText)), []);` and `tests/generate.test.js` line 752 pass in Phase E) |
| MP09d2-T05 | `npm run test:quick` and `npm run check` pass; the quick-set duration before and after is reported (an increase above 50 % is a finding) | command output |
| MP09d2-T06 | Documents updated as listed, both languages in step | review |
| MP09d2-T07 | D21-V3: `nostall.mjs`, `stall16.mjs`, `split.mjs`, `rerun.mjs` and `certify.mjs` exactly as given; the captures of the population table and one `-nostall` capture per C1 cell that completed, each within its limit (a stopped capture is labelled reduced in `runs.md`), never overwritten; the split with its count lines (`split.txt`); `simulate.md` from `simulate.mjs --ns 8,12,16 --list` over `split/screen/` only (its TOTAL counts no call in require mode); `simulate-require-raw.md` and `simulate-controls.md` reported separately; `certify.mjs --self-test` prints "10 of 10 synthetic cases classified as expected" (`certify-self-test.txt`; TP14: a different but still central result is an other changed result, never a lost one); the reruns `rerun/n12.jsonl` and `rerun/n16.jsonl` and `certify.md` (exit 0, no call not reproducible); the record gives per capture the calls, finite-band calls, rated candidates, `repairs` entries and results, the screening TOTAL, the certification table, the controls table, missed(12) and missed(16) with their parts, and the decision ("inert on the v3 corpus" when it applies); `STALL_LIMIT` is 12, or 16 with exactly the listed test changes, before GF-P2 | the D21-V3 folder and record; `git diff` |
| MP09d2-T08 | Phase A passes before GF-P2; the Phase B output is kept as a labelled diagnostic (`tests/artifacts/MP09d2/phase-b-diagnostic.txt`, failing names listed in the reply) and gates nothing; no test is edited because of it; after GF-P2 the fixture-dependent files and the quick set pass (Phase E, strict); the recipe version check of `tools/generate.mjs` is not weakened (TP02) | Phase A, B and E output; `git diff` |
| MP09d2-T09 | D36: `spent.mjs` and `avail.mjs` exactly as given and `summarise.mjs` to its contract; every C1 and C2 capture in `runs.md` with its outcome; the 164-cell availability row on 13x13 with 5 blocked (TP04); the replacement rules applied in order with every level tried recorded, both replacement levels qualified by 10 of 10 puzzles; the recipe edit changes only `name` and `levelId` and its `flow-pool.mjs` check ends with 10 puzzles and no notice; the replaced slow test pins the values of the chosen level; the unrateable test deep-equals `{ ok: false, reason: 'not-in-band' }`; both slow tests pass once in C1 and in GA-P2 | the folder and the record; `git diff`; command output |

## Test plan

### Exact commands

The targeted runs skip the `slow:` tests (FP06); they run in GA-P2. Run the phases in order; each block of a phase
checks its own exit codes (SP02: no fail-fast command before the step that can repair its failure).

```powershell
# Phase A: fixture-independent checks (must pass; the only pre-GF-P2 gate on the tests, TP02)
node --test --test-skip-pattern=slow tests\difficulty.test.js tests\difficulty-v3.test.js tests\clues.test.js tests\tasks.test.js tests\worker-pool.test.js
if ($LASTEXITCODE -ne 0) { throw 'Phase A: fixture-independent tests failed' }

# Phase B: diagnostic only, never a gate (TP02). Before GF-P2 the files that read the recorded fixtures or run the
# recorded recipe fail by design (checkRecipe refuses the recipe's model version; TAP also reports their parent
# suites). Keep the output, list the failing names in the reply, never throw on it, never edit a test because of it.
New-Item -ItemType Directory -Force tests\artifacts\MP09d2 | Out-Null
node --test --test-skip-pattern=slow --test-reporter=tap "tests/**/*.test.js" *> tests\artifacts\MP09d2\phase-b-diagnostic.txt
"Phase B (diagnostic): exit $LASTEXITCODE"
Select-String -Path tests\artifacts\MP09d2\phase-b-diagnostic.txt -Pattern '^\s*not ok \d+ - (.+?)\s*(#.*)?$' | ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique

# Phase C: gates D21-V3 and the D36 measurements, three announced blocks (C1 about 20-60 minutes, timed; C2 about
# 10-25 minutes, no times; C3 about 20-45 minutes). Create the scripts of "Hell levels under v3" and of "D21-V3"
# with their exact texts first.
$d = 'docs/difficulty-v3/d21-2026-11-12'
$v = 'docs/difficulty-v3/d21-v3-<date>'
New-Item -ItemType Directory -Force "$v/hell", "$v/avail", "$v/nostall", "$v/rerun" | Out-Null
if (-not (Test-Path "$v/runs.md")) { "| Capture | Start | End | Seconds | Outcome |`r`n|---|---|---|---|---|" | Set-Content "$v/runs.md" }
function Capture([string]$out, [string]$preload, [string]$script, [string[]]$argList, [int]$seconds) {
  if (Test-Path $out) { throw "$out exists: a capture is never overwritten (delete it only to repeat this capture on purpose, and say so in the record)" }
  $env:D21_OUT = $out
  $nodeArgs = @()
  if ($preload -ne '') { $nodeArgs += @('--import', "./$preload") }
  $nodeArgs += @("./$script") + $argList
  $start = Get-Date
  $p = Start-Process node -ArgumentList $nodeArgs -NoNewWindow -PassThru
  $null = $p.Handle
  if ($p.WaitForExit($seconds * 1000)) { $outcome = "exit $($p.ExitCode)" } else { Stop-Process -Id $p.Id; $p.WaitForExit(); $outcome = "stopped at the $seconds s limit (reduced)" }
  $end = Get-Date
  "| $out | $($start.ToString('HH:mm:ss')) | $($end.ToString('HH:mm:ss')) | $([int]($end - $start).TotalSeconds) | $outcome |" | Add-Content "$v/runs.md"
  Remove-Item Env:D21_OUT
}
# C1, one line per row of the C1 table in its order, then the replacement search, for example:
Capture "$v/hell/hell-22x22-hell-3-pool.jsonl" '' "$d/flow-pool.mjs" @('--recipe','square-22x22-hell-3','--quantity','10') 300
Capture "$v/hell/hell-22x22-hell-3.jsonl" "$v/spent.mjs" "$d/flow.mjs" @('--recipe','square-22x22-hell-3','--quantity','10','--label','hell-22x22-hell-3') 300
Capture "$v/hell/hell-15x20-hell-2.jsonl" "$v/spent.mjs" "$d/flow.mjs" @('--board','15x20','--level','hell-2','--seed','t18-big-a','--quantity','1','--label','hell-15x20-hell-2') 180
# ... the other Hell rows; then, by the replacement rules (example level only):
Capture "$v/hell/repl-22x22-nightmare.jsonl" "$v/spent.mjs" "$d/flow.mjs" @('--board','22x22','--level','nightmare','--seed','t18-big-a','--quantity','10','--label','repl-22x22-nightmare') 600
# after the recipe edit (name square-22x22-nightmare, levelId nightmare):
Capture "$v/hell/repl-22x22-nightmare-pool.jsonl" '' "$d/flow-pool.mjs" @('--recipe','square-22x22-nightmare','--quantity','10') 300
Capture "$v/hell/repl-15x20-hell-1.jsonl" "$v/spent.mjs" "$d/flow.mjs" @('--board','15x20','--level','hell-1','--seed','t18-big-a','--quantity','10','--label','repl-15x20-hell-1') 600
# the two slow tests, once:
node --test --test-name-pattern="15 x 20|unrateable calibration" tests\clues.test.js
if ($LASTEXITCODE -ne 0) { throw 'Phase C1: the two slow tests failed' }
# C2, one line per row of the C2 table, for example:
Capture "$v/avail/avail-13x13b5-hell-1.jsonl" "$v/spent.mjs" "$v/avail.mjs" @('--board','13x13','--blocked','5','--level','hell-1','--seed','t18-big-a','--attempts','3') 300
Capture "$v/avail/avail-20x20-hell-1.jsonl" "$v/spent.mjs" "$v/avail.mjs" @('--board','20x20','--level','hell-1','--seed','t18-big-a','--attempts','3') 300
# summaries
node "./$v/summarise.mjs" @(Get-ChildItem "$v/hell/*.jsonl" | Sort-Object Name | ForEach-Object { "$v/hell/$($_.Name)" }) | Set-Content "$v/hell-summary.md"
if ($LASTEXITCODE -ne 0) { throw 'Phase C2: summarise.mjs failed (hell)' }
node "./$v/summarise.mjs" @(Get-ChildItem "$v/avail/*.jsonl" | Sort-Object Name | ForEach-Object { "$v/avail/$($_.Name)" }) | Set-Content "$v/avail-summary.md"
if ($LASTEXITCODE -ne 0) { throw 'Phase C2: summarise.mjs failed (avail)' }
# C3, one line per row of the D21-V3 population table, then one per completed C1 cell, for example:
Capture "$v/nostall/cell-10x6-hard.jsonl" "$v/nostall.mjs" "$d/flow.mjs" @('--board','10x6','--level','hard','--seed','t18-rect-a','--quantity','5','--label','cell-10x6-hard') 600
Capture "$v/nostall/vectors.jsonl" "$v/nostall.mjs" "$d/vectors.mjs" @() 600
Capture "$v/nostall/pop-recipe-board.jsonl" "$v/nostall.mjs" "$d/pop.mjs" @('--recipe-board','200') 600
Capture "$v/nostall/repl-22x22-nightmare-nostall.jsonl" "$v/nostall.mjs" "$d/flow.mjs" @('--board','22x22','--level','nightmare','--seed','t18-big-a','--quantity','10','--label','repl-22x22-nightmare-nostall') 600
# the split (TP03): screening (any mode), require-mode calls, scripted controls; it never overwrites
$files = @(Get-ChildItem "$v/nostall/*.jsonl" | Sort-Object Name | ForEach-Object { "$v/nostall/$($_.Name)" })
node "./$v/split.mjs" "$v/split" @files | Set-Content "$v/split.txt"
if ($LASTEXITCODE -ne 0) { throw 'Phase C3: split.mjs failed (a stop row of the decision table)' }
# A: the screening of the any-mode calls (exact); its TOTAL heading must count 0 calls in require mode
$screen = @(Get-ChildItem "$v/split/screen/*.jsonl" | Sort-Object Name | ForEach-Object { "$v/split/screen/$($_.Name)" })
node "./$d/simulate.mjs" @screen --ns 8,12,16 --list | Set-Content "$v/simulate.md"
if ($LASTEXITCODE -ne 0) { throw 'Phase C3: simulate.mjs failed (screen)' }
# the raw triggers of the require-mode calls (reported only) and the mechanics controls (a separate table)
$req = @(Get-ChildItem "$v/split/require/*.jsonl" | Sort-Object Name | ForEach-Object { "$v/split/require/$($_.Name)" })
node "./$d/simulate.mjs" @req --ns 8,12,16 --list | Set-Content "$v/simulate-require-raw.md"
if ($LASTEXITCODE -ne 0) { throw 'Phase C3: simulate.mjs failed (require, raw)' }
node "./$d/simulate.mjs" "$v/split/controls/vectors-scripted.jsonl" --ns 8,12,16 --list | Set-Content "$v/simulate-controls.md"
if ($LASTEXITCODE -ne 0) { throw 'Phase C3: simulate.mjs failed (controls)' }
# B: the certification reruns of the require-mode calls at N = 12 (the product) and N = 16, then the comparison;
# certify.mjs checks its own classification first (TP14: "10 of 10 synthetic cases classified as expected")
node "./$v/certify.mjs" --self-test | Set-Content "$v/certify-self-test.txt"
if ($LASTEXITCODE -ne 0) { throw 'Phase C3: certify.mjs --self-test failed (a defect of the script; report it)' }
Capture "$v/rerun/n12.jsonl" "$d/register.mjs" "$v/rerun.mjs" @('--recipe-board','200') 600
Capture "$v/rerun/n16.jsonl" "$v/stall16.mjs" "$v/rerun.mjs" @('--recipe-board','200') 600
node "./$v/certify.mjs" --base @req --n12 "$v/rerun/n12.jsonl" --n16 "$v/rerun/n16.jsonl" | Set-Content "$v/certify.md"
"certify: exit $LASTEXITCODE (1 is a stop row of the decision table)"
# Apply the decision table; when raising to 16, edit as listed and re-run Phase A.

# Phase D: gate GF-P2 (announced; about 2 s each)
node tools\record-fixtures.mjs --replace --reason "P2: difficulty-v3"
if ($LASTEXITCODE -ne 0) { throw 'record-fixtures failed' }
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
git --no-pager diff --stat -- tests/fixtures player/samples

# Phase E: strict, after GF-P2: first the two re-pins of the table that read the re-recorded sample (tests\pack.test.js
# line 576, tests\rate-probe.test.js lines 71, 77 and 101), then the fixture-dependent files (TP02), then the quick set
node --test --test-skip-pattern=slow tests\generate.test.js tests\cli.test.js tests\puzzlecode-cli.test.js tests\generation-client.test.js tests\calibration.test.js tests\benchmark-matrix.test.js tests\player-load.test.js tests\rate-probe.test.js tests\generator-state.test.js tests\generator-controller.test.js tests\pack.test.js
if ($LASTEXITCODE -ne 0) { throw 'Phase E: fixture-dependent tests failed after GF-P2' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'Phase E: quick set failed after GF-P2' }

# Phase F: gate GA-P2 (announced; about 5-10 minutes in all, each command under 10 minutes)
New-Item -ItemType Directory -Force tests\artifacts\MP09d2 | Out-Null
npm test 2>&1 | Tee-Object -FilePath tests\artifacts\MP09d2\ga-p2-first.txt
"GA-P2 first run: exit $LASTEXITCODE"
# Read the failures. Allowed: UI-flow expectations of recipes that completed (all quantity puzzles, no notice; the
# replaced square-22x22-<level> recipe among them); migrate their expect.pieces, expect.puzzles and expect.scores in
# tests\fixtures\ui-flow-recipes.json. Anything else (a recipe that does not complete, either D36 slow test, any other
# test) stops the task here: report it (D21, D36).
node --test tests\generator-controller.test.js
if ($LASTEXITCODE -ne 0) { throw 'GA-P2: UI-flow recipes still fail after the migration' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'GA-P2: the final npm test failed' }

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

`runs.md`, `split.txt`, `simulate.md`, `simulate-require-raw.md`, `simulate-controls.md`, `certify-self-test.txt`,
`certify.md` and the two summaries are written by PowerShell: check them with the one-liner of check-list §3 (CRLF,
no BOM) and fix them before the reply (the files under `split/` are written by `split.mjs` with CRLF). If `npm test`
approaches 10 minutes, stop it and report (AGENTS.md); do not raise a limit.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record: the Phase B diagnostic's failing names (no
  gate); the D36 results (the Hell outcomes with profiles and times, the levels tried and chosen for the recipe and
  the slow test, the unrateable test's input, the availability table and its conclusion); the D21-V3 decision (the
  screening TOTAL rows for N = 8, 12 and 16, the certification rows for N = 12 and 16 with their call lines, the
  controls table, missed(12) and missed(16), the limit kept or set, "inert on the v3 corpus" if so, the captures
  stopped at their limit); the reason text, the old and new `versions`, which of `pieceKeys`, `layoutKeys`,
  `clueKeys` and `scores` moved, the new sample-pack scores and levels, the UI-flow outcomes (pieces, puzzles,
  scores, notices, durations), any seed or attempt replaced under the fallback rules with its reason, the quick-set
  and `npm test` counts and durations, and `git diff --stat` showing that `player/samples/sample-pack.json` and
  `tests/fixtures/puzzlecode-v1.json` are unchanged. If the task stopped on a D21 or D36 finding, the reply says which
  phase it reached and what is left.
- Handoff to MP09e: generated claims are v3 with full metrics; codes carry summaries; the Hell outcomes of record
  sections 2 and 4 (MP09e skips a Hell request they show to fail). To MP10a and MP10b: the `rate` worker task returns
  `RatingV3` or fails with `rating-incomplete`. To MP11 and MP12: the list of tests whose v3 values move with the knobs
  (`tests/difficulty-v3.test.js` tables, the v3 clue tests with any replaced seeds, the replaced 15 x 20 slow test, the
  fixtures, `tests/fixtures/ui-flow-recipes.json` with the replaced recipe), the `STALL_LIMIT` in force with its
  D21-V3 record and whether it was inert (MP12a and MP12b report it; MP12 re-examines an inert rule), and record
  section 6 (the cells v3 could not make and their times to failure) for MP12's owner question and fail-fast proposal.

## Amendment B1 (after dispatch: cross-review TP13, TP14, TP15; SA1's check of the Phase E files)

The task was dispatched before these corrections; they are already written into the sections above. What changed:

1. **TP13** ("Tests: the treatment of every pinned test"): MP09d1's 'the v2 rating keeps its results under its v2
   names' (`tests/difficulty.test.js:331-351`) keeps its `rateV2` pins (lines 331-347); only its final loop (lines
   348-350, `JSON.stringify(rate(...)) === JSON.stringify(rateV2(...))`) is removed, in step 3, before Phase A.
2. **TP14** ("D21-V3" and the embedded `certify.mjs`): a fired call whose rerun returns another result that is still
   in the central half is an "other changed result", not a "lost central final result" (`lost` now needs
   `central(b) && !central(x)`). `certify.mjs` has a `--self-test` mode with ten synthetic calls (among them a
   different central puzzle at 21, a different central score of 20, a loss to 18 and no result); Phase C3 runs it
   before the reruns and stores `certify-self-test.txt`; it must print "10 of 10 synthetic cases classified as
   expected". SA1 ran the new script on the trial captures of `041ff83` (`--recipe-board 4` and `vectors.mjs`): the
   same table as the old script (28 compared, nothing fired at N = 12 or 16).
3. **Phase E files** (SA1, found while checking TP13): two files of the Phase E list pin `difficulty-v2` values of the
   re-recorded sample and fail by design after GF-P2. They are now rows of the table, edited after GF-P2 and before
   Phase E: `tests/pack.test.js` line 576 (`'difficulty-v2'` → `'difficulty-v3'`) and `tests/rate-probe.test.js`
   lines 71, 77 and 101 of its first pack-mode test (the model, the v2 score against `scoreV2(U, B)` instead of the
   stored score, and `G >= 1` for the Hard sample). The check-list ownership row of MP09d2 lists both.
4. **TP15** (MP09e, not this task): in MP09e's commands, `$skipHell3 = $false` goes just before line 320 (`if (-not
   $skipHell3) ...`), and `$skipHell3 = $true` only by its comment. It is passed to MP09e's developer as an addendum
   (`docs/difficulty-v3/claude-opus-5.5/7-response-to-second-pass.md`); MP09e's file is unchanged.

AMENDMENT B1 READY

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP09d2: Activate v3: rate and MODEL, the pinned tests, D21-V3, GF-P2 and GA-P2`) |
| Start | 2026-11-12 20:45 (+07:00) |
| End | 2026-11-13 06:02 developer; 06:06 orchestrator review and commit |
| Duration | about 1 h 37 min developer active (20:45-22:19 and 05:59-06:02); the 7 h 40 min from 22:19 to 05:59 had no model call (the machine was asleep overnight) and is not counted; about 4 min review (with the orchestrator's full `npm test`) |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 241 model calls; 61,862,331 input tokens (61,154,050 cache reads); 189,033 output tokens |
| AI credits | about 978 (developer) |
| Verification | Developer: phase A 128/128 (4.9 s); C1, C2 and C3 captures all exit 0; GF-P2 `record-fixtures --replace --reason "P2: difficulty-v3"` and `--check` OK; after the rate-probe migration `node --test --test-skip-pattern=slow tests\rate-probe.test.js` 14/14 (2.9 s), `npm run check` OK, `npm run test:quick` 1256/1256 (26.2 s), final GA-P2 `npm test` 1275/1275 (85 s; the two D36 slow tests 21.5 s and 43.1 s). Orchestrator re-run under the timing lock: `npm run check` OK, `record-fixtures --check` OK, `npm test` 1275/1275 (85.5 s). Quick set +33% wall-clock against HEAD (19.8 s to 26.4 s), under the 50% threshold |
| Acceptance | MP09d2-B* and MP09d2-T* met; B04/T07 (D21-V3) and B05/T09 (D36) are evidenced in `docs/difficulty-v3/d21-v3-2026-11-12.md` and its folder. Diff reviewed: `rate` returns `scoreV3(measureV3(...))` with `model` `difficulty-v3`, `level` from `levelForScore`, `saturated: false` and `censored: true` exactly when the census is unfinished; `MODEL` is `difficulty-v3`; `verifySample` re-rates a v2-claiming sample with `rateV2` and names a capped puzzle by index; `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json` unchanged. D21-V3: `STALL_LIMIT` stays 12 (screening of 1878 `any` calls at N = 8/12/16 fired 23/10/4 and missed central 3/0/0; certification of 184 `require` calls fired 0, lost 0). D36: only Hell 1 on the 164-cell board was made (2 of 3 attempts), every larger Hell cell capped; recipe `square-22x22-hell-3` replaced by `square-22x22-nightmare` (10 of 10, 4.7 s in the two-worker flow); MP07's 15 x 20 Hell 2 slow test replaced by 15 x 20 Nightmare (K 24, score 67, 4 clues) plus one unrateable-calibration slow test. GF-P2 moved the generation-case scores to 23,19,23,19,19,23,23,19,20,23 and the sample Easy/Normal/Hard to 11/12/19 |
| Issues & resolutions | (1) Dispatch addendum TP13/TP14 (SA2 third pass): the TP13 loop removed before phase A; `lost` defined for `certify.mjs`. (2) Amendment B1 sent mid-run (SA1-1): re-pins of `tests/pack.test.js` line 576 and `tests/rate-probe.test.js` lines 71, 77 and 101, and `certify.mjs --self-test`; the developer's own first `certify.mjs` was replaced by B1's text before the reruns. (3) Unlisted failure `tests/rate-probe.test.js:363` (`line.v2.level === 'easy'`, a v2 pin on a v3-generated puzzle): the developer stopped by the stop rule; the orchestrator authorized the migration to `levelForScore(line.v2.score).id` (same class as B1). (4) The stale `core/engine/types.js` sentence "still produces `RatingV2` only" corrected. (5) Fallback of step 3: 22x22 `hell-3` attempt 0 is the unrateable input, because the old 15 x 20 `hell-2` input had one rated profile. (6) `record-fixtures` `main` has no try/catch, so an unrateable sample exits 1 through an uncaught throw with a clear message (left as is, not task-owned). (7) No cheap direct test shows that `rate` lets `IncompleteRatingError` through; covered by the capped tests of `measureV3` and the D36 slow tests. (8) Overnight pause 22:19-05:59 (machine asleep), no effect on results |
| Handoff | MP09e: GC-P2 format evidence on v3 (TP15: `$skipHell3 = $false` before the override). MP12a and MP12b2 re-pin when a knob changes: the 15 x 20 Nightmare slow-test values (K 24, score 67, 4 clues), the recipe `expect` scores, the unrateable test input and the fixture scores. Record section 6 lists every Hell cell v3 could not make with its seconds: the evidence for MP12's owner question (i)/(ii)/(iii) and the fail-fast proposal. The only Hell cell v3 made is Hell 1 on the 164-cell board |

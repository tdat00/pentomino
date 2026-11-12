# MP09d2 — Activate v3: `rate` and `MODEL`, the pinned tests, GF-P2 and GA-P2

| Header | Value |
|---|---|
| ID | MP09d2 (second part of the activation; MP09d1 built `measureV3` and the v2 names) |
| Depends on | MP09d1 (accepted and committed: `measureV3`, `rateV2`, the v2 names); MP09c (the clue-selection handling); MP09b (the v3 pack reader and summary claims); MP08 (`scoreV3`, `SCORE_V3`) |
| Estimated size | Medium–Large: about 450–650 changed lines (difficulty.js about 30, tools about 20, tests about 250–350, documents about 150; the re-recorded fixtures are generated and not counted); about 45–60 minutes plus the gate (about 5–15 minutes) |
| Owner role | Engine |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-19 (measurement, rating and v2 retention), RES-04 (statuses, `IncompleteRatingError`, no v3 "+"), RES-05 (census, `censored`), RES-20 (types and protocol), RES-24 (tests and fixtures moved by P2), RES-34 (engine total on twin inputs); clarifications SA2-Q-P02, SA1-Q-P1, C1 (b) (owner), AR1; check-list §4.2 D9, D11, D20 to D23 |
| Gates owned | GF-P2, GA-P2 (check-list §7) |
| Implementation status | Not started |

## Goal & business context

This is the switch the owner asked for ("make Hard really hard"): from this task on, every rating the engine computes
is a `difficulty-v3` rating built on how a person solves (forced placements, deductions, real guesses), with the
knobs fitted in MP06c and written in MP08. Generation, set calibration, the worker `rate` task and the fixtures use it;
Hard and above already require a proved decisive guess (MP09c).

Stored puzzles never change: a `difficulty-v2` claim in a pack or a link stays as it was (MP09b reads it as legacy),
and the v2 functions stay available under their v2 names (MP09d1) for the frozen Player sample, the probe and the
legacy tests. A rating whose census did not finish carries `censored: true` (C1 (b), owner), and a puzzle whose
deduction is capped before its first solution is unrateable (`IncompleteRatingError`, SA2-Q-P02, owner); v3 never
shows "+".

Because generated puzzles change, the generation fixtures are re-recorded under the pre-approved gate GF-P2 and the
full suite runs under GA-P2.

## Scope

### In scope

- `core/engine/difficulty.js`: `MODEL = 'difficulty-v3'`; `rate` in v3 (from MP09d1's `measureV3` and MP08's
  `scoreV3`); the module header.
- `tools/record-fixtures.mjs` (`verifySample`).
- The pinned tests of RES-24 and of MP07, re-evaluated as listed below (check-list D23); new tests of `rate` in v3;
  the worker round trip of RES-20.
- Gates GF-P2 and GA-P2; the UI-flow expectations of `tests/fixtures/ui-flow-recipes.json` (check-list D21).
- Documents: `docs/design-detail.md`, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`,
  `DEVELOPERGUIDE.vn.md`.

### Out of scope

- `measureV3`, the v2 names, the probe's `v2` field and the protocol round trips (MP09d1).
- The derived display rating and the estimate note in the apps (MP10a, MP10b); the code-size record and the browser
  page (MP09e); calibration tooling (MP11); any knob or `DEDUCE` value (MP06b, MP08, MP12a, MP12b).
- `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json` (check-list D20: byte-for-byte unchanged).
- `core/engine/deduce.js`, `policy.js`, `pack.js`, `puzzlecode*.js`, `clues.js` (a defect found there goes back to its
  owner task as a fix round).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity; `difficulty.js` imports only `tiling.js`, `levels.js`, `policy.js` and `deduce.js`; none of the
  words `LIMITS`, `QUALIFICATION`, `enabledMaxActive`, `deriveLimits` in it.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace. Tool-written fixtures are already CRLF; check them
  and every hand-edited JSON with the one-liner of check-list §3.
- This task owns GF-P2 and GA-P2: run `tools/record-fixtures.mjs` and `npm test` only as written in the test plan,
  once the quick set passes except for the fixture-dependent tests. **Announce to the orchestrator before starting
  the gate** (the Sudoku repository runs in parallel on the same machine; never two heavy runs at once): give the gate
  commands and the expected wall time (about 5–15 minutes) in your plan, and start only when the orchestrator says
  the machine is free.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or
  `docs/difficulty-v3/`. A test that is not listed below and fails after the switch is not edited: report it.

## Inputs & context

### Current code (anchors at HEAD `3fd99ff` plus MP08 to MP09d1; find moved lines by the quoted text)

- `core/engine/difficulty.js` after MP09d1: `MODEL` (`export const MODEL = 'difficulty-v2';`), `UnsatisfiableError`,
  `IncompleteRatingError` (MP09c), `scoreV2`, `measureV2`, `rateV2` (writes `model: 'difficulty-v2'` literally),
  `rate` (today `return rateV2(board, pieces, clues, ws);`), `measureV3(board, pieces, clues, ws, limits?)` (MP09d1;
  returns `{ metrics: MetricsV3, saturated: false }`, throws `UnsatisfiableError` or `IncompleteRatingError`),
  `inBand`, and MP08's `breakdownV3(m, knobs = SCORE_V3)` and `scoreV3(m)`.
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
  `new Error(\`puzzle ${i}: unrateable, the deduction path was capped (${e.counters.stop})\`, { cause: e })`, which
  stops `--create`, `--replace` and `--check` with exit code 1 and names the puzzle (RES-04). Everything else in the
  tool is unchanged (`currentVersions()` at line 71 now reports `model: 'difficulty-v3'` through `MODEL`).

### Tests: the treatment of every pinned test (RES-24, MP07 handoff; check-list D23)

Intended contract changes (only these; anything else that fails is reported):

| File | Test or item | Treatment |
|---|---|---|
| `tests/difficulty.test.js` | 'a complete layout scores zero with zero counters' | the v2 deep-equal through `rateV2` with `model: 'difficulty-v2'`; the v3 deep-equal of `rate` is the new 'Zero' case below |
| `tests/difficulty.test.js` | 'forced placements keep B = 0 and score 2U'; 'metrics carry actual counters and the diagnostics R and H' | switch them to `rateV2` (v2 legacy, values unchanged); MP09d1 tests the v3 measurement of these inputs |
| `tests/clues.test.js` | 'repeated subsets are rejected before rating'; 'a band no subset reaches fails without relabelling and within 64 ratings'; 'the beam search finds a band the count-guided stage missed'; 'a uniqueness repair that leaves the band is not accepted' (MP07's version); MP07's real-rate cases 'any, centre reconstruction', 'any, end of search', 'unbounded' | inject `rate: rateV2` (v2 seam, D23) into each `run`/`traced` context and use `rateV2` wherever the test rates directly (for example `inBand(rateV2(board, pieces, repaired, ws), target)`, `assert.deepEqual(result.rating, rateV2(...))`); targets, seeds and values unchanged. Reason: their targets and seeds were chosen for v2 scores (under the starting knobs nightmare and Hell 1 become reachable on 10 x 6, and refused subsets would change the `onRate` counts) |
| `tests/clues.test.js` | 'every reachable level gets an in-band subset of the witness'; 'required uniqueness returns a proven, in-band certificate'; 'selection is deterministic for a seed and honours excluded clue keys'; 'generated ratings are the same under piece id, color and order permutations' | unchanged code, now v3. If one level or case fails with its seed under the fitted knobs: try the seeds `<seed>-1` to `<seed>-9` in order, use the first with which every assertion of that test passes, and record the replaced seed and the failure in the reply; if none passes, stop and report (a calibration finding for MP12) |
| `tests/clues.test.js` | 'published recipes still hold' | v2 part through `rateV2`: `score === recipe.score` and `level === id` (the `score` field of `tests/fixtures/clue-recipes.js` is the v2 score); v3 part through `rate`: `level === levelForScore(score).id`, `saturated === false`, no `censored`, `metrics.solutions === 'unique'`, `metrics.censusComplete === true`; `certify(...)` unique as today. The v3 values are pinned once, in `tests/difficulty-v3.test.js` (row below) |
| `tests/clues.test.js` | 'slow: a large required-unique request is never accepted on a cutoff' | target `level('hell-1')` (chosen for v2) becomes `{ min: 0, max: Infinity, share: 0.1 }`; every assertion stays (`any` ok with certificate null, `certify(..., 2000)` not unique; `require` gives `{ ok: false, reason: 'uniqueness-not-proved' }`). Reference with the starting knobs: `any` returns its first rated subset (a census estimate, `censored: true`), `require` finishes in about 10 s. Under v3 Hell 1 is refused for this twin strip (every subset has `Gproved = 0`), so the old target would fail |
| `tests/fixtures/clue-recipes.js` | the comment above `CLUE_RECIPES` | "per level the clued piece IDs of a puzzle that `selectClues` accepted in `require` mode under `difficulty-v2`; `score` is that v2 score; the `difficulty-v3` values are pinned in `tests/difficulty-v3.test.js`". Pieces and scores unchanged (MP02a to MP05 pin deduction values on these lists) |
| `tests/difficulty-v3.test.js` | MP08's recipe characterisation | add: for each recipe, `rate(board, pieces, clues, ws).score` equals the pinned value, and `rate(...).metrics` has the mapped `U`, `deductionTier`, `G`, `info` and `solutions` |
| `tests/generate.test.js` | `FAKE_RATING` (49-55) | becomes the valid v3 literal below (score and level unchanged) |
| `tests/generate.test.js` | 'keeps the witness, produces an in-band calibration puzzle and proves it in require mode' (478) | if attempt 0 fails under the fitted knobs (the analysts' starting-knob run: `require: not-in-band`), assert the same properties on `firstSetAttempt(request({ uniqueness }), 10).result` (the lowest successful attempt) and record the attempt used; if none of the ten succeeds, stop and report |
| `tests/worker-pool.test.js` | line 815 `assert.equal(rating.model, 'difficulty-v2');` | `'difficulty-v3'`, plus `JSON.stringify(rating) === JSON.stringify(rate(<same board, pieces, clues>, ws))` |
| `tests/puzzlecode-cli.test.js` | `assertLine` (line 146: `assert.deepEqual(puzzle.rating ?? null, data.rating, 'rating claim');`) | compare with the summary of a v3 claim (RES-22): `data.rating?.model === 'difficulty-v3'` gives `{ model, score, level, saturated: false }` plus `censored: true` when the claim has it; other claims unchanged |
| `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` | | re-recorded by GF-P2 only |
| `tests/fixtures/ui-flow-recipes.json` | `expect` of each recipe (read by `tests/generator-controller.test.js:750-785` and three browser pages) | set from the GA-P2 run for every recipe that completes deterministically (`expect.pieces`, `expect.puzzles`, `expect.scores`); a recipe that ends with a notice or a partial batch follows check-list D21 |

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
| Census estimate in `rate` | the 41-I strip of MP09d1's census case (`boardFromRows(Array(5).fill('#'.repeat(41)))`, 41 copies of I, clues `witness.slice(0, 4)`) | `Object.keys(rate(...))` is `model, score, level, saturated, censored, metrics`; `censored === true`; `metrics.censusComplete === false`; `score === scoreV3(metrics)` |
| Unsatisfiable and invariance | the existing 'unsatisfiable clue sets are refused instead of rated' and 'ratings ignore piece ids, colors and input order' | unchanged code: they now test v3 `rate` (same messages; invariance) |
| `tests/tasks.test.js` | a `rate` task on the 7-clue case through `executeTask` | equals `rate(...)` (the existing line 95 already checks it; keep it) |

## Files to create/modify

### Exclusive ownership

- `core/engine/difficulty.js` (`MODEL`, `rate`, the module header); `tools/record-fixtures.mjs` (`verifySample` and
  its imports only).
- The test files and fixtures of the table above, only as listed; `tests/fixtures/generation-case.json` and
  `tests/fixtures/generated-sample-pack.json` through the tool only.
- The documents of the documentation slot.

Must not edit: `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`, `core/engine/deduce.js`,
`policy.js`, `pack.js`, `clues.js`, `puzzlecode*.js`, `generate.js`, `tasks.js`, `tools/rate-probe.mjs`, the apps.

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
  and at Hard or above only with a proved decisive guess (§7.6).
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
  s") becomes the v3 cost with a reference to the probe record `docs/difficulty-v3/probe-<date>.md` (MP06b).
- §7.1 Metrics: replace the table by the score inputs of v3 (U, `deductionTier`, G, `info`, `solutions`) and a list of
  the stored diagnostics (`R`, `H`, the DLX fields, `searchStop`, `F`, `E`, `rules`, `tier`, `Cmax`, `Dmax`, `Gt`,
  `nodes`, `work`, `S`, `solutionLimit`, the census fields, `Gproved`), with a pointer to §7.10 for the order.
- §7.2: title "Formula `difficulty-v2` (legacy)"; a first sentence: stored `difficulty-v2` claims and the frozen
  puzzle-code rebuild use this formula (`scoreV2`); new ratings use §7.10. The rest unchanged.
- §7.3: title "Caps, saturation and unrateable puzzles": v3 uses the `DEDUCE` caps; a path capped before its first
  solution is unrateable (`IncompleteRatingError`, never a "+" rating; generation spends one profile on it, §6.10);
  an unfinished census gives a stored estimate (`censored: true`); the DLX diagnostic keeps its caps and its pinned
  B = 5,000 but never enters the v3 score; saturation and "+" remain only for stored v2 claims.
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
growing depth and real guesses; Hard and above always need at least one real guess. Puzzles made before this version
keep their stored score."

`USERGUIDE.md` "Difficulty" bullet (line 132) and `USERGUIDE.vn.md` "Độ khó" bullet (line 123): one sentence each,
for example "The score counts the pieces to place, the hardest deduction needed and the real guesses (choices where
an option fails); Hard and above always need at least one real guess. Puzzles made before this version keep their
stored score." and natural Vietnamese with the guide's terms (for example "Điểm tính theo số mảnh cần đặt, bước suy
luận khó nhất cần dùng và số lần phải đoán thật (lựa chọn có phương án sai); từ mức Khó trở lên luôn cần ít nhất một
lần đoán thật. Các đề tạo trước phiên bản này giữ nguyên điểm đã lưu.").

`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`, "Code layout", after the `deduce.js` sentence:
"`core/engine/difficulty.js` computes the `difficulty-v3` rating from it (`measureV3`, `rate`) and keeps the v2
functions (`scoreV2`, `measureV2`, `rateV2`) for stored claims, fixtures and the rating probe." (and the Vietnamese
equivalent).

## Implementation steps

1. `difficulty.js`: `MODEL`, `rate` in v3, the header comment ("Shared difficulty rating (`difficulty-v3`, design
   §7.10) …; the v2 functions are kept for stored claims").
2. `tools/record-fixtures.mjs` `verifySample`.
3. The new tests; the intended contract changes of the table, except the fixtures.
4. `node --test --test-skip-pattern=slow tests\difficulty.test.js tests\difficulty-v3.test.js tests\clues.test.js
   tests\tasks.test.js tests\worker-pool.test.js tests\generate.test.js tests\puzzlecode-cli.test.js`; then
   `npm run test:quick`: only the tests that read the old fixtures may fail (`tests\generate.test.js` "recorded
   generation fixture", `tests\cli.test.js`, `tests\generation-client.test.js` "one and four workers reproduce the
   recorded recipe …", `tests\puzzlecode-cli.test.js` recipe runs, the smoke-matrix test of the calibration runner).
5. Announce and run the gate (test plan): GF-P2, then GA-P2; the UI-flow expectations; D21 where it applies.
6. Documents; `npm run test:quick` and `npm run check` again.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09d2-B01 | Every new rating is a `difficulty-v3` rating built on the deduction measure; Hard and above need a proved decisive guess | tests; the re-recorded Hard fixture |
| MP09d2-B02 | An estimate is marked (`censored: true`) and a capped puzzle is unrateable; no v3 rating shows "+" | census-estimate test; MP09d1's capped tests through `rate` |
| MP09d2-B03 | Stored puzzles, claims, links and codes are unchanged; the Player sample and the code goldens are byte-identical | `git diff --stat`; the unchanged golden tests |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09d2-T01 | `rate` returns `RatingV3` in the stated key order with `censored: true` exactly when `censusComplete` is false, never `saturated: true`, and lets `IncompleteRatingError` and `UnsatisfiableError` through; `MODEL` and `currentVersions().model` are `difficulty-v3` | new tests |
| MP09d2-T02 | Every intended contract change of the table is made, and no other existing test is edited | `git diff --stat`; the reply's list |
| MP09d2-T03 | GF-P2: fixtures re-recorded with the reason "P2: difficulty-v3", `record-fixtures --check` passes, `versions.model` is `difficulty-v3`; GA-P2: `npm test` passes (or D21 applied and reported) | gate record |
| MP09d2-T04 | `verifySample` checks the gen-v2 Player sample with `rateV2` and v3 samples with `rate`; an unrateable sample puzzle stops the tool with its index | tests (`tests/player-load.test.js` line 249, `tests/generate.test.js` line 752 pass) |
| MP09d2-T05 | `npm run test:quick` and `npm run check` pass; the quick-set duration before and after is reported (an increase above 50 % is a finding) | command output |
| MP09d2-T06 | Documents updated as listed, both languages in step | review |

## Test plan

### Exact commands

The targeted runs skip the `slow:` tests (FP06); they run in GA-P2.

```powershell
node --test --test-skip-pattern=slow tests\difficulty.test.js tests\difficulty-v3.test.js tests\clues.test.js tests\tasks.test.js tests\worker-pool.test.js tests\generate.test.js tests\puzzlecode-cli.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed (the recipe-run cases may fail until GF-P2)' }
npm run test:quick
# expected before the gate: only the tests that read the old fixtures fail (step 4)

# Gate GF-P2 (announced; about 2 s each)
node tools\record-fixtures.mjs --replace --reason "P2: difficulty-v3"
if ($LASTEXITCODE -ne 0) { throw 'record-fixtures failed' }
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
git --no-pager diff --stat -- tests/fixtures player/samples

# Gate GA-P2 (announced; about 5-10 minutes, must stay under 10)
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed (see the UI-flow recipes and D21)' }

# after editing tests\fixtures\ui-flow-recipes.json from the GA-P2 run (part of the gate; about 3 minutes)
node --test tests\generator-controller.test.js
if ($LASTEXITCODE -ne 0) { throw 'UI-flow recipes still fail' }

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

If `npm test` approaches 10 minutes, stop it and report (AGENTS.md); do not raise a limit.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record: the reason text, the old and new `versions`, which
  of `pieceKeys`, `layoutKeys`, `clueKeys` and `scores` moved, the new sample-pack scores and levels, the UI-flow
  outcomes (pieces, puzzles, scores, notices, durations), any seed or attempt replaced under the fallback rules with
  its reason, the quick-set and `npm test` counts and durations, and `git diff --stat` showing that
  `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json` are unchanged.
- Handoff to MP09e: generated claims are v3 with full metrics; codes carry summaries. To MP10a and MP10b: the `rate`
  worker task returns `RatingV3` or fails with `rating-incomplete`. To MP11 and MP12: the list of tests whose v3
  values move with the knobs (`tests/difficulty-v3.test.js` tables, the v3 clue tests with any replaced seeds, the
  fixtures, `tests/fixtures/ui-flow-recipes.json`).

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

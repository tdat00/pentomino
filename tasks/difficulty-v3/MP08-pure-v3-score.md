# MP08 — Pure v3 score: `breakdownV3`, `scoreV3`, `SCORE_V3` and the v3 types

| Header | Value |
|---|---|
| ID | MP08 |
| Depends on | MP07 (accepted and committed); reads the fit record of MP06c (`docs/difficulty-v3/fit-<date>.md`) |
| Estimated size | Medium: about 380–580 changed lines (difficulty.js about 60, policy.js about 15, types.js about 60, rate-probe.mjs about 20, tests about 230–330 with the carried R8 pin, documents about 60); about 40–55 minutes |
| Owner role | Engine |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-18 (formula, invariants, ranges), RES-19 (`MetricsV3`), RES-20 (types), RES-26 (quick part of `tests/difficulty-v3.test.js`), RES-07 (R8; the carried pin); clarifications SA2-Q-P01, SA2-Q-P13, SA1-Q-P1, JR-P3 (a), PROC-P1 (a); check-list §4.2 D15, D18 (traceability only) |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

The v3 score turns the deduction measurement into a number: a base for the pieces left to place, a term for the
hardest deduction rule the solver needed, a term per decisive guess, and a small penalty for puzzles with several
solutions. Its knobs were fitted on real generated puzzles in MP06c. This task writes that formula and its production
knob values as pure, tested code next to the v2 score, with the types of the v3 rating. Nothing uses it for ratings
yet: `rate()` stays v2 until MP09d2 switches it on, so no rating, puzzle or document a user sees changes.

The formula guarantees the owner's rule "Hard and above need a real choice": with the hard invariants below, a puzzle
without a decisive guess (G = 0) can never reach 17, the lower edge of Hard.

## Scope

### In scope

- `core/engine/policy.js`: `SCORE_V3` with the values of the MP06c fit.
- `core/engine/difficulty.js`: new exports `breakdownV3` and `scoreV3` only.
- `core/engine/types.js`: `MetricsV2`, `MetricsV3`, `RatingV2`, `RatingV3`, `Rating` as their union; `Metrics` kept
  as an alias of `MetricsV2`.
- `tools/rate-probe.mjs`: `scoreWithKnobs` delegates to `breakdownV3` (check-list D18).
- New `tests/difficulty-v3.test.js` (quick part); `tests/policy.test.js` (the `SCORE_V3` pin).
- `tests/deduce-rules.test.js`: one added test, the R8 other-pockets pin carried from the MP04 review (below).
- `docs/design-detail.md` §4.1, §4.2 and a new §7.10.

### Out of scope

- `MODEL`, `rate`, `measure`, `score` and every caller: unchanged (MP09d1 renames the v2 functions and MP09d2 switches
  `rate`).
- `measureV3` (MP09d1) and the `censored` flag on ratings (MP09d2); `IncompleteRatingError` (MP09c); pack and code
  claims (MP09b).
- The slow part of `tests/difficulty-v3.test.js` (MP11); changing knob values after this task (MP12a, MP12b only).
- `core/engine/deduce.js`: unchanged (the carried R8 pin is a test only); the existing tests of
  `tests/deduce-rules.test.js`, the X7 board included, stay exactly as they are.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- `difficulty.js` and `policy.js` stay pure; no new engine file. None of the words `LIMITS`, `QUALIFICATION`,
  `enabledMaxActive`, `deriveLimits` in `difficulty.js` or `types.js`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no test name containing `slow`.
- Run only the commands of the test plan; never stage, commit, stash, reset, push or switch branches; never edit
  `tasks/difficulty-v3/`, the reports or the records under `docs/difficulty-v3/`.

## Inputs & context

### The knob values (how to obtain and pin them)

Open the newest `docs/difficulty-v3/fit-<date>.md` (written by MP06c and committed). Its section 3 "Proposed knobs"
gives a `SCORE_V3` literal. Copy those numbers exactly into `SCORE_V3` below, and cite the record's file name in a
comment above the constant and in the design §7.10 text. Before writing them, check them against the invariants and
ranges below; if the record is missing, has no literal, or proposes a value that breaks an invariant or a range,
stop and report it to the orchestrator (do not choose values yourself). The starting values of RES-18 are used only
for the formula vectors of the tests, passed explicitly as the second argument.

```js
// core/engine/policy.js, next to SCORE (which stays v2 and keeps its pin)
export const SCORE_V3 = Object.freeze({
  model: 'difficulty-v3',
  base: Object.freeze({ max: <fit>, scale: <fit> }),
  rule: Object.freeze([0, 0, <fit rule[2]>, <fit rule[3]>]),   // by deductionTier 0..3 (SA2-Q-P13 (a))
  weights: Object.freeze({ G: <fit>, info: <fit> }),
  penalty: Object.freeze({ few: <fit>, many: <fit> }),
});
```

- **Hard invariants** (RES-18; tested): `base.max + max(rule) <= 16`; `rule[0] = rule[1] = 0 <= rule[2] <= rule[3]`;
  `0 <= penalty.few <= penalty.many`; `weights.G >= 0`, `weights.info >= 0`.
- **Experimental ranges** (JR-P3 (a), plan author): `base.max` 8-12, `base.scale` 3-12, `weights.G` 0-8,
  `weights.info` 0.5-6, `penalty.many <= 8` (and `rule[2] <= rule[3]`).
- **Starting values** (RES-18; tests only): `base { max: 12, scale: 6 }`, `rule [0, 0, 2, 4]`,
  `weights { G: 6, info: 4 }`, `penalty { few: 2, many: 4 }`.

### The formula (RES-18)

```text
breakdownV3(m, knobs = SCORE_V3), m = { U, deductionTier, G, info, solutions } (other fields ignored):
  base      = knobs.base.max * (1 - Math.exp(-m.U / knobs.base.scale))
  rule      = knobs.rule[m.deductionTier]
  guess     = knobs.weights.G * m.G + knobs.weights.info * m.info
  penalty   = m.solutions === 'few' ? knobs.penalty.few : m.solutions === 'many' ? knobs.penalty.many : 0
  unrounded = base + rule + guess - penalty          // evaluated in exactly this order
  score     = m.U === 0 ? 0 : Math.max(0, Math.round(unrounded))
  returns { base, rule, guess, penalty, unrounded, score }
scoreV3(m) = breakdownV3(m).score                     // production knobs only
```

- Input checks (`RangeError`, like `score(U, B)`): `U` a non-negative integer; `deductionTier` an integer 0-3; `G` a
  non-negative integer; `info` a finite number >= 0; `G === 0` requires `info === 0` (a valid tuple, RES-04);
  `solutions` one of `'unique'`, `'few'`, `'many'`, `'unknown'` (`'unknown'` has no penalty). The knobs are not
  validated here (the tests validate `SCORE_V3`; the probe validates its own knobs).
- One implementation for the score and the later Generation Steps table (RES-30): `scoreV3` never re-implements the
  terms.
- `info` is the full double the measurement computed; it is **not quantised**. `JSON.stringify` and `JSON.parse`
  keep every finite number exactly, so `breakdownV3` of stored metrics reproduces the stored score exactly. Only the
  score is rounded; screens show `info` with at most 6 decimals as presentation only.
- Why G = 0 never reaches Hard: `base < base.max` for every U, so `base + rule < base.max + max(rule) <= 16`; the
  guess term is 0 and the penalty is >= 0, so the rounded score is at most 16.

### Mapping a deduction result to the formula's inputs

For a `DeductionResult` `d` of `measureDeduction` (MP02a-MP05) on the model of board, pieces and clues:
`U = pieces.length - clues.length`, `deductionTier = d.first.deductionTier`, `G = d.first.G`,
`info = d.first.info`, `solutions = d.count.solutions`. MP09d1's `measureV3` uses the same mapping; the raw
(pre-census) values are `G = d.first.choices.length` and `info = sum of log2(c)` over `d.first.choices`.

### The v3 types (RES-19, RES-20)

```js
/** MetricsV2: today's `Metrics` (U, B, branchTrials, rowTrials, stop, R, H), unchanged; `Metrics` stays as an alias. */
/**
 * @typedef {object} MetricsV3                       fixed field order; every field present in a computed rating
 * @property {number} U @property {number} R @property {number} H
 * @property {number} B @property {number} branchTrials @property {number} rowTrials
 * @property {'solution' | 'branch-cap' | 'row-cap'} dlxStop
 * @property {'exhausted' | 'solution-limit' | 'node-cap' | 'work-cap'} searchStop
 * @property {number} F @property {number} E
 * @property {{ R1: number, R2: number, R3: number, R4: number, R5: number, R6: number, R7: number, R8: number, R9: number }} rules
 * @property {0 | 1 | 2 | 3} deductionTier @property {0 | 1 | 2 | 3 | 4} tier
 * @property {number} G @property {number} info @property {number} Cmax @property {number} Dmax
 * @property {number} Gt @property {number} nodes @property {number} work
 * @property {number} S @property {number} solutionLimit
 * @property {'unique' | 'few' | 'many' | 'unknown'} solutions
 * @property {boolean} censusComplete @property {number} censusUndecided @property {number} censusNodes
 * @property {number} censusWork @property {number} Gproved
 */
/** RatingV2: { model: 'difficulty-v2', score, level, saturated, metrics: MetricsV2 } (today's Rating). */
/** RatingV3: { model: 'difficulty-v3', score, level, saturated: false, censored?: true, metrics: MetricsV3 }. */
/** Rating = RatingV2 | RatingV3, discriminated by `model`; `RatingClaim` keeps its optional metrics. */
```

Write each `@property` on its own line in the file (the compact form above is for reading). Field meanings: RES-19
table, copied in the type's comments: `U`, `R`, `H` as v2; `B`, `branchTrials`, `rowTrials`, `dlxStop` the v2 DLX
diagnostic (`dlxStop` is the v2 `stop`, renamed); `searchStop` how the deduction search ended; `F`, `E` final-path
placements by R1-R3 and R6 kills; `rules` final-path counts; `deductionTier` 0-3 and `tier` 0-4; `G`, `info`, `Cmax`,
`Dmax` the decisive values; `Gt`, `nodes`, `work` search totals including setup and census; `S`, `solutionLimit`,
`solutions` the count; `censusComplete`, `censusUndecided`, `censusNodes`, `censusWork`, `Gproved` the census
(`Gproved` = final-path guess nodes with an alternative proved impossible; equal to G when the census is complete; not
a score input).

### The probe (check-list D18)

`tools/rate-probe.mjs` exports `scoreWithKnobs(m, knobs)`, which today computes the same formula locally and returns
`{ base, rule, guess, penalty, unrounded, score }`. Keep its export, its knob validation (invariants: an input error;
ranges: the `outsideRanges` flag) and its tests; replace only its arithmetic by `breakdownV3(m, knobs)`.

### Test vectors (starting knobs passed explicitly; computed by the analysts' reference)

| ID | U | tier | G | info | solutions | base | rule | guess | penalty | unrounded | score |
|---|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|
| W1 | 6 | 1 | 1 | 1 | unique | 7.585447 | 0 | 10 | 0 | 17.585447 | 18 |
| W2 | 6 | 2 | 1 | 1 | unique | 7.585447 | 2 | 10 | 0 | 19.585447 | 20 |
| W3 | 6 | 3 | 1 | 1 | unique | 7.585447 | 4 | 10 | 0 | 21.585447 | 22 |
| W4 | 6 | 1 | 2 | 2 | unique | 7.585447 | 0 | 20 | 0 | 27.585447 | 28 |
| W5 | 6 | 2 | 2 | 2 | unique | 7.585447 | 2 | 20 | 0 | 29.585447 | 30 |
| W6 | 6 | 3 | 2 | 2 | unique | 7.585447 | 4 | 20 | 0 | 31.585447 | 32 |
| Z0 | 0 | 0 | 0 | 0 | unique | 0 | 0 | 0 | 0 | 0 | 0 |
| G0a | 200 | 3 | 0 | 0 | unique | 12.000000 | 4 | 0 | 0 | 16.000000 | 16 |
| G0b | 200 | 3 | 0 | 0 | few | 12.000000 | 4 | 0 | 2 | 14.000000 | 14 |
| G0c | 200 | 3 | 0 | 0 | many | 12.000000 | 4 | 0 | 4 | 12.000000 | 12 |
| G0d | 5 | 2 | 0 | 0 | unknown | 6.784821 | 2 | 0 | 0 | 8.784821 | 9 |
| L3 | 7 | 3 | 2 | 1 + log2(3) | unique | 8.263161 | 4 | 22.339850 | 0 | 34.603011 | 35 |
| P1 | 1 | 0 | 0 | 0 | many | 1.842219 | 0 | 0 | 4 | -2.157781 | 0 |

Compare the doubles with a tolerance of 1e-6 and the integer fields exactly. G0a: the unrounded value is just below
16 (base < 12), so the score is 16, not 17.

### Carried from MP04 review: R8 other-pockets pin

R8 (check-list D15; `core/engine/deduce.js` `ruleR8`, line 1240 at HEAD `60575a4`) first checks the **other
pockets**: a trial row is killed when a component other than the row's own has a size that the pieces left without
the row's piece cannot fill. That is the quoted line 1289:

```js
bad = i !== pocket && (compSize[i] > top || reachMinus[base + compSize[i]] === 0);
```

In the MP04 review a mutant without this check survived every test and about 80,000 random boards. This task adds
one test that pins it; `deduce.js` does not change. The board R8o must be measured with `{ ...DEDUCE,
lookaheadWidth: 0 }`: with the production width 4, R6 makes every kill (R6 22, R7 0, R8 0, E 22, tier 2) and R8
never runs, as in the existing test "R8 with lookaheadWidth 0 tries every neck and still finds only sound kills (P8)".

- Board `boardFromRows(['#.##.###.##', '###..##...#'])` (14 cells); pieces `[L4, D, L3, S4, M]`, the constants at
  the top of `tests/deduce-rules.test.js` (4 + 2 + 3 + 4 + 1 = 14 cells); no clues.
- Expected (the analysts' reference and the current `deduce.js` agree, checked on 2026-11-12):

  | Field | Value |
  |---|---|
  | DLX count, `countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found` | 2 |
  | `path`, `S`, `solutions`, `exhausted`, `stop` | `'complete'`, 2, `'few'`, true, `'exhausted'` |
  | `Gt`, `nodes` | 1, 3 |
  | `F`; R1 to R9 | 4; R1 4, R2 0, R3 0, R4 0, R5 0, R6 0, **R7 12, R8 9**, R9 0 |
  | `E`, `deductionTier` | 0, 3 |
  | `G`, `Gproved`, `choices`, final-path census `[c, kLow, f, u]` | 0, 0, `[2]`, `[[2, 2, 0, 0]]` |
  | `info`, `Cmax`, `Dmax` | 0, 0, 0 |
  | `result.census` | `{ complete: true, undecided: 0, nodes: 0, work: 0 }` |

- The mutant (for the review only; never create it in the repository): with the quoted line replaced by
  `bad = false;`, the same measurement gives **R7 5, R8 5** and every other field unchanged, so the pinned R7 12 and
  R8 9 fail it.
- The test, added directly after the test "R8 with lookaheadWidth 0 tries every neck and still finds only sound kills
  (P8)" (it uses the file's `build`, `flat`, `boardFromRows`, `countSolutions`, `measureDeduction` and `DEDUCE`;
  `assert` is `node:assert/strict`):

  ```js
  test('R8 checks the other pockets against the pieces left without the trial row (R8o, lookaheadWidth 0)', () => {
    const puzzle = { board: boardFromRows(['#.##.###.##', '###..##...#']), pieces: [L4, D, L3, S4, M], clues: [] };
    assert.equal(countSolutions(build(puzzle), { cap: Infinity, rowTrialLimit: Infinity }).found, 2);
    const result = measureDeduction(build(puzzle), { ...DEDUCE, lookaheadWidth: 0 }, { verifyUndo: true });
    assert.deepEqual(flat(result), {
      path: 'complete', S: 2, solutions: 'few', exhausted: true, stop: 'exhausted', Gt: 1, nodes: 3,
      census: [[2, 2, 0, 0]],
      F: 4, R1: 4, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 12, R8: 9, R9: 0, E: 0, tier: 3, G: 0, Gproved: 0,
      choices: [2], info: 0, Cmax: 0, Dmax: 0,
    });
    assert.deepEqual(result.census, { complete: true, undecided: 0, nodes: 0, work: 0 });
  });
  ```

- X7 (the MP04 board the review also asked about) is already pinned with the confirmed values: the `BOARDS` entry
  `id: 'X7'` (line 191: R6 4, R7 2, G 1, `Gproved` 1, census `[[2, 1, 1, 0], [2, 2, 0, 0], [2, 2, 0, 0]]`), checked by
  the test "R7 counts only the pieces with a live row inside a pocket as its candidates (X7)", and its DLX count 4 by
  the test "the DLX counts of the rule boards, and tier 3 exactly when R7 + R8 + R9 is nonzero". Add nothing for it.
- If the new test fails on the unchanged `deduce.js`, do not change a value: report the actual record to the
  orchestrator (check-list D11).

## Files to create/modify

### Exclusive ownership

- `core/engine/policy.js` (`SCORE_V3` only), `core/engine/difficulty.js` (`breakdownV3`, `scoreV3` and their imports
  only), `core/engine/types.js` (the rating and metrics typedefs only).
- `tools/rate-probe.mjs` (`scoreWithKnobs` only).
- `tests/difficulty-v3.test.js` (new), `tests/policy.test.js` (a new `SCORE_V3` test; the `SCORE` pin unchanged).
- `tests/deduce-rules.test.js` (the carried R8 pin, one added test; no existing test edited).
- `docs/design-detail.md` §4.1, §4.2, new §7.10.

### Documentation slot

- §4.1 (types block, lines 259-263): `MetricsV2` (today's `Metrics`), `MetricsV3`, `RatingV2`, `RatingV3`, `Rating`
  as their union (engine ratings stay v2 until MP09d2).
- §4.2 `policy.js` block (line 366): `SCORE_V3` with its shape; `difficulty.js` block (line 482): `breakdownV3`,
  `scoreV3` ("defined; `rate` stays v2 until the v3 activation").
- New §7.10 "Formula `difficulty-v3` (defined; not yet the rating)": the formula, the knobs with their values and the
  fit record they come from, the invariants with the G = 0 argument, the experimental ranges (JR-P3 (a)), the one
  rounding, the exact JSON round trip, the worked examples of the production knobs.

## Implementation steps

1. `policy.js`: `SCORE_V3` from the fit record (after checking it).
2. `difficulty.js`: `breakdownV3` and `scoreV3` with the input checks; JSDoc.
3. `types.js`: the typedefs; keep `Metrics` and the existing typedef names working.
4. `rate-probe.mjs`: delegate the arithmetic of `scoreWithKnobs`.
5. Tests (test plan), including the carried R8 pin; design §4.1, §4.2, §7.10; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP08-B01 | A puzzle without a decisive guess can never reach Hard under the production knobs, whatever its size, deduction tier and number of solutions | invariant grid test |
| MP08-B02 | The production knobs are exactly the fitted values of the MP06c record, inside the plan author's ranges | policy test; review against the record |
| MP08-B03 | No rating, puzzle or document a user sees changes | `rate` untouched; quick set green |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP08-T01 | `breakdownV3` computes the terms in the stated order with one rounding; `scoreV3` is `breakdownV3(m).score` | tests W1-P1 |
| MP08-T02 | Invalid inputs throw `RangeError` (each check of the list) | tests |
| MP08-T03 | `SCORE_V3` is deeply frozen, pinned, within the invariants and ranges; `SCORE` is unchanged | policy test |
| MP08-T04 | A JSON round trip of metrics reproduces the breakdown and score exactly (info = log2(3); an unrounded value within 1e-9 of a half-integer) | tests |
| MP08-T05 | `scoreWithKnobs` gives the same results as before (its existing tests pass unchanged) | rate-probe tests |
| MP08-T06 | Types as specified; `npm run test:quick` and `npm run check` pass; design §4.1, §4.2, §7.10 updated | review; command output |
| MP08-T07 | The R8 other-pockets pin (carried from the MP04 review): the new test of `tests/deduce-rules.test.js` passes with exactly the values of the carried section (R7 12, R8 9 with `lookaheadWidth: 0`; the mutant gives R7 5, R8 5); `core/engine/deduce.js` and the existing tests of that file are unchanged | test output; `git --no-pager diff --stat` |

## Test plan

### Required test cases

`tests/difficulty-v3.test.js` (quick; no test name containing `slow`):

| Case | Expected |
|---|---|
| Formula vectors | `breakdownV3(m, START)` for W1-P1 of the table (START = the starting knobs), every field |
| `scoreV3` | equals `breakdownV3(m, SCORE_V3).score` for every tuple of the grid |
| Invariant grid (production knobs) | over U in {1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 400}, tier 0-3, G in {0, 1, 2, 3, 5, 8}, info = 0 when G = 0 else each of {G, G * log2(3), G * 3.5, G * log2(28)}, solutions in {unique, few, many, unknown}: G = 0 gives a score <= 16; `unrounded === base + rule + guess - penalty` (same order); `score === (U === 0 ? 0 : Math.max(0, Math.round(unrounded)))`; the penalty is 0 / few / many / 0 by `solutions` |
| JSON round trip | metrics with `info = 1 + Math.log2(3)` and metrics built so that the unrounded score is within 1e-9 of 20.5 (with START, U 6, tier 2, G 1, unique: `info = (20.5 - 5e-10 - (base + 2 + 6)) / 4`, about 1.2286383, gives unrounded 20.4999999995 and score 20): after `JSON.parse(JSON.stringify(m))` the breakdown is identical and `info` is the same double |
| Census estimate (CF1) | board `boardFromRows(['####', '####', '####'])`, pieces F (classic pentomino), M (monomino), L4 (`[[0,0],[1,0],[2,0],[0,1]]`), D (domino), no clues (U 4, deduction tier 3, `many`); `measureDeduction(model, { ...DEDUCE, census: 0 })` gives the estimate (census incomplete; info 3.0444 = log2(11/4) + log2(3)), `measureDeduction(model)` the decisive values (info 2.0444), the raw values from `choices` `[11, 6]` (info 6.0444); with the same U, tier and solutions: score(decisive) <= score(estimate) <= score(raw), for START and for `SCORE_V3` (START gives 26, 30, 42) |
| Worked examples (production knobs) | U = 6, binary guesses, unique: one guess (G 1, info 1) and two guesses (G 2, info 2) for tier 1, 2, 3: pin the six scores computed from the formula with `SCORE_V3`, and give them in the reply with the hand computation |
| Recipes (characterisation) | the six clue recipes of `tests/fixtures/clue-recipes.js` on the 10 x 6 board (`RECIPE_BOARD_ROWS`, `recipeWitness()`, `CLASSIC_PENTOMINOES`): `scoreV3` of the mapped deduction result; pin the six values (they move with the knobs in MP12; no monotonicity is asserted, part D item 5) and list them in the reply |
| Input checks | U = -1, U = 1.5, tier 4, G = -1, info = NaN, info = -1, G = 0 with info 1, solutions `'two'`: each throws `RangeError` |

`tests/policy.test.js`: a new test "difficulty-v3 knobs": `SCORE_V3` deep-equals the fitted literal; it and its
nested objects and arrays are frozen; the invariants and the experimental ranges hold. The existing `SCORE` test is
unchanged.

`tests/deduce-rules.test.js`: the test of the carried section "R8 checks the other pockets against the pieces left
without the trial row (R8o, lookaheadWidth 0)", verbatim.

### Exact commands

```powershell
node --test tests\difficulty-v3.test.js tests\policy.test.js tests\rate-probe.test.js tests\deduce-rules.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; `rate` and every rating output are unchanged; the R8 pin is in place.
- Handoff to MP09a1-MP09d2: the `SCORE_V3` values and the record they come from; the signatures `breakdownV3(m, knobs =
  SCORE_V3)` and `scoreV3(m)`; the input mapping from a `DeductionResult`; the type names; the pinned worked examples
  and recipe values (re-pinned in MP12 when the knobs change).

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

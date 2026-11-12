# MP09d1 — `measureV3` and the v2 functions under their v2 names (no switch yet)

| Header | Value |
|---|---|
| ID | MP09d1 (first part of the activation; MP09d2 switches `rate`) |
| Depends on | MP09c (accepted and committed); MP08 (`breakdownV3`, `scoreV3`, `SCORE_V3`, the v3 typedefs); MP09b (the v3 pack reader); MP06b (the `DEDUCE` values) |
| Estimated size | Medium: about 350–500 changed lines (difficulty.js about 110, tools about 5, tests about 200–300, documents about 50); about 35–50 minutes |
| Owner role | Engine |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-19 (measurement, rating and v2 retention), RES-04 (statuses, `IncompleteRatingError`, no v3 "+"), RES-05 (census), RES-20 (types and protocol), RES-34 (engine total on twin inputs); clarifications SA2-Q-P02, SA1-Q-P1, C1 (b) (owner); check-list §4.2 D11, D22 |
| Gates owned | none (no output changes: `rate` stays v2 until MP09d2) |
| Implementation status | Not started |

## Goal & business context

The owner asked for a rating that follows how a person solves ("make Hard really hard"). The solver (MP02a to MP05)
and the score (MP08) exist; this part builds the **measurement** that turns a puzzle into the stored `difficulty-v3`
metrics, `measureV3`, and gives the old functions their v2 names so that stored `difficulty-v2` claims, the frozen
Player sample and the probe keep a stable v2 rating after the switch. Nothing a user sees changes here: `rate` stays
`difficulty-v2` until MP09d2 switches it, so this part is proven by its own tests while every existing output stays
byte-for-byte the same.

## Scope

### In scope

- `core/engine/difficulty.js`: `measureV3`; `score` and `measure` renamed `scoreV2` and `measureV2` (bodies
  unchanged); the new `rateV2`; `rate` keeps its v2 result by calling `rateV2`.
- The importers of the renamed functions: `tests/difficulty.test.js`, `tests/puzzlecode.test.js:9`,
  `tools/rate-probe.mjs` (its `v2` field).
- New tests of `measureV3` and `rateV2`; the protocol round trips of v3 claims (RES-20).
- Documents: `docs/design-detail.md` §4.2, §7.9, §7.10, §13.2.

### Out of scope

- `MODEL`, `rate` in v3, `tools/record-fixtures.mjs`, the pinned tests and fixtures, the gates GF-P2 and GA-P2, the
  brief and the guides (MP09d2).
- `core/engine/deduce.js`, `policy.js`, `pack.js`, `puzzlecode*.js`, `clues.js`, `tasks.js`, the apps.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity; `difficulty.js` imports only `tiling.js` (`isValidLayout`, `buildModel`, `solveFirst`, as today),
  `levels.js`, `policy.js` and `deduce.js`; none of the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive`,
  `deriveLimits` in it.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no test name containing `slow`.
- Run only the commands of the test plan (no gate); never stage, commit, stash, reset, push or switch branches; never
  edit `tasks/difficulty-v3/`, the reports, `docs/difficulty-v3/` or any fixture.

## Inputs & context

### Current code (anchors at HEAD `3fd99ff` plus MP08 and MP09c; find moved lines by the quoted text)

- `core/engine/difficulty.js`: `MODEL` (18: `export const MODEL = 'difficulty-v2';`), `UnsatisfiableError` (21),
  MP09c's `IncompleteRatingError`, `score(U, B)` (37), `measure(board, pieces, clues, ws, limits = SCORE.caps)`
  (58-100: U = 0 check, `buildModel`, the `rows === 0` check with the message `piece ${...} has no legal placement`,
  `solveFirst`, `B: saturated ? SCORE.caps.branch : Math.min(run.branchTrials, SCORE.caps.branch)`), `rate` (109-113),
  `inBand` (121), and MP08's `breakdownV3(m, knobs = SCORE_V3)` and `scoreV3(m)`.
- `core/engine/deduce.js`: `measureDeduction(model, limits = DEDUCE, diagnostics = {})` returns the
  `DeductionResult` `{ path, first, search: { Gt, nodes, work, stop }, count: { S, limit, exhausted, solutions },
  census: { complete, undecided, nodes, work } | null }`; `first` = `{ F, E, rules: { R1 … R9 }, deductionTier, G,
  Gproved, info, Cmax, Dmax, choices, rows, census }`. `path` is `'complete'`, `'capped'` or `'none'`; `first` and
  `census` are non-null exactly when `path === 'complete'`.
- Importers of the renamed functions: `tests/difficulty.test.js:5` (`measure`, `score`),
  `tests/puzzlecode.test.js:9` (`import { score as liveScore }`), `tools/rate-probe.mjs` (`import { rate } from
  '../core/engine/difficulty.js';` and `const rating = rate(board, pieces, clues, ws);`, which fills the line's `v2`
  field). `core/engine/clues.js`, `core/engine/tasks.js`, `tools/record-fixtures.mjs` and their tests import `rate`,
  which keeps its name and its v2 result in this part.

### `measureV3` (RES-19; RES-04; C1 (b))

```text
measureV3(board, pieces, clues, ws, limits = { deduce: DEDUCE, dlx: SCORE.caps }) -> { metrics: MetricsV3, saturated: false }
  1. U = pieces.length - clues.length. U = 0: if not isValidLayout(board, pieces, clues): throw
     UnsatisfiableError('the clues are not a complete valid layout'); else return the zero metrics below.
  2. model = buildModel(board, pieces, clues, ws) once; bits = sum of log2(1 + placementsPerPiece[i]) over the free
     pieces; a free piece with 0 placements throws UnsatisfiableError(`piece ${id} has no legal placement`) (as today).
  3. d = measureDeduction(model, limits.deduce) while the model is live.
     d.path === 'none'   -> throw new UnsatisfiableError('the clues have no solution')
     d.path === 'capped' -> throw new IncompleteRatingError('the deduction path was capped',
                                { nodes: d.search.nodes, work: d.search.work, stop: d.search.stop })
  4. run = solveFirst(model, { rowTrialLimit: limits.dlx.rows, branchTrialLimit: limits.dlx.branch }) on the same
     model (the DLX diagnostic, v2 meaning). dlxStop = 'solution' when run.layout !== null; otherwise, if
     run.exhausted: throw new Error('internal: the DLX diagnostic found no solution where the deduction found one');
     else dlxStop = run.stop === 'row-limit' ? 'row-cap' : 'branch-cap'.
     B = dlxStop === 'solution' ? Math.min(run.branchTrials, SCORE.caps.branch) : SCORE.caps.branch.
  5. metrics, in exactly this key order (the order of `MetricsV3`, MP08; `rules` in R1 … R9 order, an owned copy):
     U, R: model.freeCells, H: bits / U, B, branchTrials: run.branchTrials, rowTrials: run.rowTrials, dlxStop,
     searchStop: d.search.stop, F, E, rules, deductionTier, tier: (G > 0 ? 4 : deductionTier), G, info, Cmax, Dmax
     (all from d.first), Gt, nodes, work (from d.search), S: d.count.S, solutionLimit: d.count.limit,
     solutions: d.count.solutions, censusComplete: d.census.complete, censusUndecided: d.census.undecided,
     censusNodes: d.census.nodes, censusWork: d.census.work, Gproved: d.first.Gproved

zero metrics (U = 0): { U: 0, R: 0, H: 0, B: 0, branchTrials: 0, rowTrials: 0, dlxStop: 'solution',
  searchStop: 'exhausted', F: 0, E: 0, rules: { R1: 0, …, R9: 0 }, deductionTier: 0, tier: 0, G: 0, info: 0, Cmax: 0,
  Dmax: 0, Gt: 0, nodes: 0, work: 0, S: 1, solutionLimit: limits.deduce.solutions, solutions: 'unique',
  censusComplete: true, censusUndecided: 0, censusNodes: 0, censusWork: 0, Gproved: 0 }
```

- The fields are those today's `measure` already reads: `model.placementsPerPiece[i]`, `model.freeCells`,
  `run.layout`, `run.exhausted`, `run.stop` (`'row-limit'` or the branch limit), `run.branchTrials`,
  `run.rowTrials` (`difficulty.js:61-95`); use the same expressions.
- The DLX diagnostic never enters the score or `saturated`; `limits.dlx` lowers its caps for tests only (B stays
  pinned to `SCORE.caps.branch` = 5,000 when capped, as in v2).
- `measureV3` never returns `solutions: 'none'` (a rating has a first solution) and never sets `saturated`.
- Engine functions stay total on direct inputs with twins (RES-34): no shape check here.

### The v2 functions under their v2 names (RES-19; check-list D22)

- `scoreV2(U, B)` and `measureV2(board, pieces, clues, ws, limits = SCORE.caps)`: today's `score` and `measure`,
  renamed, bodies unchanged. `SCORE` in `policy.js` stays the v2 constant (pinned by `tests/policy.test.js:371`).
- `rateV2(board, pieces, clues, ws)`: today's `rate` body with `model: 'difficulty-v2'` written literally (so that it
  stays v2 when MP09d2 changes `MODEL`): `{ model: 'difficulty-v2', score, level, saturated, metrics }` with v2 metrics
  `{ U, B, branchTrials, rowTrials, stop, R, H }`.
- `rate(board, pieces, clues, ws)` in this part: `return rateV2(board, pieces, clues, ws);` (its JSDoc says "v2
  until the activation, MP09d2"). `MODEL` stays `'difficulty-v2'`.
- `tools/rate-probe.mjs`: the `v2` field is filled from `rateV2(board, pieces, clues, ws)` (import `rateV2` instead of
  `rate`); the same values as before.

### New tests

Values marked "reference" come from the analysts' reference run of this specification on the MP05/MP06a `deduce.js`
(check-list D11); write `DEDUCE.solutions` rather than 8 in literals. Board and piece fixtures as in
`tests/difficulty.test.js` today (`board60` and the classic witness `layout`).

| File | Case | Set-up | Expected |
|---|---|---|---|
| `tests/difficulty.test.js` | Key order | the 10 x 6 classic witness, 7 clues (`layout.slice(0, 7)`) | `Object.keys(measureV3(...).metrics)` is the 28 `MetricsV3` names in order; `Object.keys(metrics.rules)` is R1 … R9; `saturated === false`; `U` 5, `R` 25, `H` as the existing v2 test computes it |
| `tests/difficulty.test.js` | Zero metrics | the complete layout of the existing zero test | `measureV3` deep-equals `{ metrics: <the zero metrics>, saturated: false }` and `JSON.stringify` equality (key order); an incomplete or invalid full layout throws `UnsatisfiableError` |
| `tests/difficulty.test.js` | Forced placement | 3 x 2 board, P and a monomino M clued at (0, 0) (the existing v2 test's input) | reference: `U 1, R 5, H 1, B 0, branchTrials 0, dlxStop 'solution', searchStop 'exhausted', F 1, E 0, rules.R1 1` (others 0), `deductionTier 1, tier 1, G 0, info 0, Cmax 0, Dmax 0, Gt 0, nodes 1, S 1, solutions 'unique', censusComplete true, censusUndecided 0, censusNodes 0, censusWork 0, Gproved 0`; `scoreV3(metrics) === breakdownV3(metrics).score` |
| `tests/difficulty.test.js` | Twin pieces (engine total) | 2 x 5 board `['#####', '#####']`, two I pentominoes with ids `a` and `b`, no clues | reference: `S 2, solutions 'few', searchStop 'exhausted', F 1, rules.R1 1, G 0, Gproved 0, Gt 1, nodes 3, censusComplete true` (the one guess is free: both alternatives solve) |
| `tests/difficulty.test.js` | Capped path | `measureV3(board60, pieces, [], ws, { deduce: { ...DEDUCE, nodes: 0 }, dlx: SCORE.caps })`; and with `{ ...DEDUCE, work: 0 }` | throws `IncompleteRatingError` with `code 'rating-incomplete'`, `reason 'path-capped'`, `counters.stop` `'node-cap'` (with `counters.nodes` 0) and `'work-cap'`; never pin `counters.work` |
| `tests/difficulty.test.js` | Census estimate | the 41-I strip of the slow clue test (`boardFromRows(Array(5).fill('#'.repeat(41)))`, 41 copies of I with ids `i0` … `i40`, witness from `solveFirst(buildModel(...), { rowTrialLimit: 1e6 })`), clues `witness.slice(0, 4)` | `metrics.censusComplete === false`, `censusUndecided > 0`, `Gproved <= G`, `solutions === 'many'`, `S === DEDUCE.solutions`; reference (census budgets 10 to 80 million): about 0.1–0.5 s, undecided about 800, G 34, Gproved 0 |
| `tests/difficulty.test.js` | Cut census | the 10 x 6 classic set with clues `layout.slice(0, 2)`, `limits = { deduce: { ...DEDUCE, census: 0 }, dlx: SCORE.caps }` | `censusComplete === false` exactly when `censusUndecided > 0`; `Gproved <= G`; `saturated === false` |
| `tests/difficulty.test.js` | DLX diagnostic caps | the 10 x 6 classic set, clues `layout.slice(0, 2)`; `limits.dlx = { branch: 3, rows: 50000 }` and the default | capped: `dlxStop 'branch-cap'`, `branchTrials 3`, `B 5000`; every deduction field equals that of the default call (the DLX never enters the score); `saturated === false` in both |
| `tests/difficulty.test.js` | v2 under its v2 names | `rateV2` on the 3 x 2 case and the 7-clue case; `rate` on the same inputs | `rateV2` gives the existing v2 values (`model: 'difficulty-v2'`, `score` 2, `B` 0, …) and `JSON.stringify(rate(...)) === JSON.stringify(rateV2(...))` in this part |
| `tests/protocol.test.js` 'worker messages' | v3 claim through the worker boundary | a `result` reply whose value is MP09b's `V3_ESTIMATE` literal (a v3 rating with `censored: true` and full metrics) | `parseWorkerMessage` accepts it and `JSON.stringify` of the value is unchanged (no field dropped or reordered) |
| `tests/protocol.test.js` 'puzzle-code payloads' | v3 claims in a payload | an `encodePuzzleCode` snapshot whose `rating` is `V3_ESTIMATE`, and one whose rating is the summary `{ model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, censored: true }` | `validatePayload` copies both claims field for field (`readRatingClaim` keeps `censored` and the metrics) |

The existing tests 'worked (U, B) to D examples' and 'saturation reports the effective B apart from the actual
counters' rename `score` → `scoreV2` and `measure` → `measureV2`, values unchanged (an intended contract change of
this part); every other existing test stays as it is and passes unchanged.

## Files to create/modify

### Exclusive ownership

- `core/engine/difficulty.js` (`measureV3`, the v2 names, `rate` delegating to `rateV2`); `tools/rate-probe.mjs` (the
  `v2` field and its import only).
- `tests/difficulty.test.js`, `tests/puzzlecode.test.js` (line 9 only), `tests/protocol.test.js` (new cases only).
- `docs/design-detail.md` (the sections of the documentation slot).

Must not edit: any fixture, `MODEL`, `tools/record-fixtures.mjs`, `core/engine/deduce.js`, `policy.js`, `pack.js`,
`clues.js`, `puzzlecode*.js`, `generate.js`, `tasks.js`, the apps.

### Documentation slot (`docs/design-detail.md`)

- §4.2 `difficulty.js` block (about line 486): add `measureV3(b, pieces, clues, ws, limits?)`, `scoreV2`,
  `measureV2`, `rateV2` (legacy `difficulty-v2`); `rate` "returns `rateV2` until the activation (MP09d2)".
- §7.9: "Nothing calls it yet …" becomes "`measureV3` (§7.10) calls it; the rating does not use it until the
  activation".
- §7.10 (MP08's "Formula `difficulty-v3` (defined; not yet the rating)"): add the measurement: the steps of
  `measureV3`, the zero metrics, the `MetricsV3` key order, `IncompleteRatingError` for a capped path, the DLX
  diagnostic and its pinned B; keep "not yet the rating".
- §13.2 row `difficulty` (about line 2647): the `measureV3` cases (zero, forced placement, twins, capped, census
  estimate, cut census, DLX diagnostic, key order) and the v2 names.

## Implementation steps

1. `difficulty.js`: the renames, `rateV2`, `rate` delegating, `measureV3` (steps 1 to 5).
2. Importers: `tests/difficulty.test.js` (import line and the two renamed tests), `tests/puzzlecode.test.js:9`
   (`import { scoreV2 as liveScore } from '../core/engine/difficulty.js';`), `tools/rate-probe.mjs`.
3. New tests (test plan); documents; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09d1-B01 | The v3 measurement of a puzzle exists and is tested on forced, guessed, twin, capped and estimated cases, so that MP09d2 can switch the rating on | new tests |
| MP09d1-B02 | Nothing a user sees changes: every rating, generated puzzle, fixture and code stays the same | the unchanged quick set; no fixture changed |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09d1-T01 | `measureV3` follows steps 1 to 5 exactly (errors, DLX diagnostic, B pinning, key order, owned `rules`) | new tests; review |
| MP09d1-T02 | `scoreV2`, `measureV2`, `rateV2` reproduce today's v2 results exactly; `rate` returns exactly `rateV2`'s result; `SCORE` and `MODEL` unchanged | legacy tests |
| MP09d1-T03 | The probe's `v2` field comes from `rateV2` with unchanged values (`tests/rate-probe.test.js` passes unchanged) | tests |
| MP09d1-T04 | The protocol round trips keep v3 claims with `censored` and full metrics exactly | protocol tests |
| MP09d1-T05 | No existing test changes except the two renamed v2 tests, the import lines and `tests/puzzlecode.test.js:9`; the targeted run, `npm run test:quick` and `npm run check` pass | command output; `git diff --stat` |
| MP09d1-T06 | `docs/design-detail.md` §4.2, §7.9, §7.10 and §13.2 updated as listed | review |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests\difficulty.test.js tests\difficulty-v3.test.js tests\protocol.test.js tests\puzzlecode.test.js tests\rate-probe.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the new tests and states that no output changed.
- Handoff to MP09d2: `measureV3(board, pieces, clues, ws, limits?)` with its errors, the zero metrics, `rateV2`, and
  the reference values that MP09d2's `rate` tests reuse.

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

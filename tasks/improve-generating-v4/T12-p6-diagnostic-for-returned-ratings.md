# T12: P6: the DLX diagnostic only for returned ratings (phase 1, production)

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P6 (OD-P2: "Compute them for the accepted puzzle ... not for the profiles of the search. Scores are identical."), §6 phase 1 ("identical puzzles"; "fixtures unchanged; `npm test`"), §6 "Rating equality", §9 ("P6 and the replay steps"); decision D-V4-07; drift DR-O07; review RV1-20 (R20), RV1-25 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11g |
| Depends on | none of T01a to T11g in content (D-V4-11); runs after T11g in this repository |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min of benchmark allocation (the test suites and fixture checks are verification, run through the lock helper, check-list §3.2) |

## Goal

Every rating of the clue search runs a DLX traversal whose only use is four diagnostic fields; on today's search it
is 10 to 23 % of the rating time (R22). This change skips it in the search ratings that nobody observes and computes
it once for the rating the search returns, so the generator gets the same puzzles with the same stored ratings,
faster.

## Authority and fixed points

- OD-P2 and plan §3 P6; D-V4-07: a search rating skips the diagnostic only when the call has no `rate` seam, no
  `record` and no `onRate`; `conclude` completes the returned rating, which then equals `rate()` of its clues, key
  order included; a lean rating never leaves `selectClues`.
- Unchanged: every score, `saturated`, every decision of the search, the work units charged (`charge` meters the
  deduction work; the diagnostic was never charged), every stored rating, both fixtures, the Generation steps (they
  replay with a recorder and therefore with the diagnostic, DR-O07), the strict pack reader (it keeps refusing any
  `dlxStop` other than `solution`, `branch-cap` and `row-cap`, so a lean rating can never be stored).
- No timing run is part of this task: P6's effect on today's search was measured (IGP-04, R22); the production
  timing at four workers and the memory checks are read with the next bench run (named item N-V4-12).

## Scope

- Change: `core/engine/difficulty.js` (`measureV3Core`, two new exports), `core/engine/clues.js` (`rateWith`,
  `conclude`), `core/engine/types.js` (`MetricsV3.dlxStop` JSDoc), `tests/difficulty.test.js`, `tests/clues.test.js`,
  `docs/design-detail.md` (step 5).
- Do not change: everything else. Guard: `git status --short` lists only the six files above.

## Steps

1. **`difficulty.js`**:
   - `measureV3Core(board, pieces, clues, ws, limits, keepDetail, withDlx = true)`: when `withDlx` is false (and
     `U > 0`) it does not call `solveFirst`; the metrics then have `B: 0`, `branchTrials: 0`, `rowTrials: 0`,
     `dlxStop: 'skipped'` in their usual positions, everything else as today. The JSDoc names the new parameter.
   - `export function rateLean(board, pieces, clues, ws)`: `ratingOf(measureV3Core(board, pieces, clues, ws, {
     deduce: DEDUCE, dlx: SCORE.caps }, false, false).metrics)`; JSDoc: "The search rating of `selectClues` (P6):
     `rate()` without the DLX diagnostic; the same score, errors and work; never stored."
   - `export function completeDiagnostic(board, pieces, clues, rating, ws)`: returns `rating` itself when
     `rating.metrics?.dlxStop !== 'skipped'`; else builds `buildModel(board, pieces, clues, ws)`, runs `solveFirst(model,
     { rowTrialLimit: SCORE.caps.rows, branchTrialLimit: SCORE.caps.branch })`, derives `dlxStop` and `B` exactly as
     `measureV3Core` does (the same internal error when an exhausted search finds no solution), and returns `{
     ...rating, metrics: { ...rating.metrics, B, branchTrials: run.branchTrials, rowTrials: run.rowTrials, dlxStop }
     }` (the spread keeps every key in place).
2. **`clues.js`** (`import` `completeDiagnostic` and `rateLean` from `./difficulty.js`):
   - `rateWith` (lines 272-276): the last branch becomes `(b, p, c, w) => ({ rating: (onRate === undefined ?
     rateLean : rate)(b, p, c, w), detail: null })`; update the comment above it ("without a seam, a recorder or
     `onRate` the search rates without the DLX diagnostic (P6); `conclude` completes the returned rating").
   - `conclude` (lines 537-545): returns `{ ...r, rating: completeDiagnostic(board, pieces, r.clues, r.rating, ws),
     skips: { subsets: subsetSkips.slice(), repairs: repairSkips.slice() } }`.
3. **`types.js`** line 82: `@property {'solution' | 'branch-cap' | 'row-cap' | 'skipped'} dlxStop The v2 \`stop\`,
   renamed; 'skipped' only in the search ratings of selectClues (P6), never stored.`
4. **Tests** (Tests table).
5. **`docs/design-detail.md`**:
   - the `difficulty.js` API block (lines 527-535): two lines after `rateDetailed`:
     `export function rateLean(b: Board, pieces: Piece[], clues: Pose[], ws: Workspace): RatingV3;   // §6.10, P6: rate() without the DLX diagnostic (B, branchTrials, rowTrials 0, dlxStop 'skipped'); the search's own ratings, never stored`
     and `export function completeDiagnostic(b: Board, pieces: Piece[], clues: Pose[], rating: RatingV3, ws: Workspace): RatingV3;   // fills the diagnostic of a lean rating; any other rating is returned as it is`;
   - `MetricsV3` (line 268): `dlxStop: 'solution' | 'branch-cap' | 'row-cap' | 'skipped'` with the comment `// v2 DLX diagnostic; 'skipped' only inside the search (§6.10), never stored`;
   - §6.10, a new bullet after **Recorders (RES-28)**: "**DLX diagnostic of the search (P6, OD-P2).** Without a `rate`
     seam, a recorder and `onRate`, the profiles and the repair ratings of a call are rated by `rateLean`: the same
     score, `saturated`, errors and work as `rate`, without the DLX diagnostic (`B`, `branchTrials` and `rowTrials`
     0, `dlxStop` `'skipped'`), which never enters the score or a decision of the search. `conclude` gives the
     returned rating its diagnostic (`completeDiagnostic`, one traversal on the returned clues), so the result's
     rating equals `rate()` of its clues, key order included, and a lean rating never leaves the call; the strict
     pack reader refuses `dlxStop` `'skipped'`. With a seam, a recorder or `onRate` every rating has the diagnostic as
     before, so the recorded ratings of the Generation steps (§6.12) keep the canonical DLX diagnostic fields; the
     visible score table is unchanged. The work meter is unchanged.";
   - §7.10 **Measurement**, step 4: append "(`rateLean` skips this step: `B`, `branchTrials` and `rowTrials` 0,
     `dlxStop` `'skipped'`)"; and after the **Rating (`rate`)** paragraph a paragraph: "**Lean rating
     (`rateLean`, `completeDiagnostic`).** `rateLean` is `rate` without step 4, for the search of §6.10 only.
     `completeDiagnostic(board, pieces, clues, rating, ws)` runs step 4 on a new model of the same clues and returns a
     new rating with its four fields completed (the input is not changed); the result equals `rate()` of the clues.
     Any rating without `dlxStop` `'skipped'` is returned as it is.";
   - the paragraph at line 1705 ("Every other field of `rating.metrics` is a stored diagnostic ..."): add the
     sentence "The ratings of the clue search carry no DLX diagnostic until `conclude` completes the returned one
     (§6.10)."
   - the test table rows `difficulty` and `clues` (around line 3064): name the new tests.
   `docs/design-brief.md`, `README.md` and the four guides do not describe the diagnostic of the search (checked by
   the pack author with a search for `solveFirst`, `DLX diagnostic` and `dlxStop`); repeat that search and report
   its result; if a sentence states that every search rating runs the diagnostic, correct it in both languages.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/difficulty.test.js` | `rateLean skips only the DLX diagnostic and completeDiagnostic restores rate()` | the recipe board (`RECIPE_BOARD_ROWS`), `CLASSIC_PENTOMINOES`, the clues of each of the six `CLUE_RECIPES` (`very-easy` to `master`: `recipeWitness().filter((p) => recipe.pieces.includes(p.piece))`), and the complete witness (U = 0) | for each recipe: equal `score`, `level`, `saturated` and `censored`; lean `dlxStop` `'skipped'` and `B`, `branchTrials`, `rowTrials` 0; every other metric equal; `JSON.stringify(completeDiagnostic(board, pieces, clues, lean, ws))` equals `JSON.stringify(rate(...))`; `completeDiagnostic` of a full rating returns the same object; U = 0: `rateLean` deep-equals `rate` |
| same | `a lean rating is refused as a stored claim` | `tests/fixtures/generated-sample-pack.json` with its first puzzle's `rating.metrics.dlxStop` set to `'skipped'` | `validatePack` is not ok and an issue message contains `dlxStop must be solution, branch-cap or row-cap` |
| `tests/clues.test.js` | `P6: the returned rating carries the DLX diagnostic and the puzzles are those of an observed search` | `selectClues({ board, pieces, layout, target: level(L), rng: createRng('p6-' + L), uniqueness: U, excludeClueKeys: new Set(), ws })` for `(L, U)` = `('easy', 'any')`, `('normal', 'any')`, `('hard', 'require')`; then the same call with `onRate: (c, r) => seen.push(r)` | each result `ok`; `JSON.stringify(result.rating)` equals `JSON.stringify(rate(board, pieces, result.clues, ws))`; the observed call's result deep-equals the unobserved one; every rating in `seen` has `dlxStop` other than `'skipped'` |
| `tests/clues.test.js` | `tests/clues.test.js:820`'s test (D21's counting) | unchanged | still passes (it rates through a scripted `rate` seam, which P6 leaves as it is; ruling of 2026-11-18) |

## Documentation

`docs/design-detail.md` (step 5). No user-visible change: no guide, no release note.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `Invoke-IgNode -Repo pentomino -Task 'T12 quick' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')` (check-list §3.2; the same as `npm run test:quick`) | root | exit 0, 0 failures | 5 min (the helper's 300 s; about 35 s) |
| `Invoke-IgNode -Repo pentomino -Task 'T12 full' -NodeArgs @('--test', 'tests/**/*.test.js')` (the same as `npm test`) | root | exit 0, 0 failures | 5 min (the helper's 300 s; about 125 s) |
| `Invoke-IgNode -Repo pentomino -Task 'T12 fixtures' -NodeArgs @('tools\record-fixtures.mjs', '--check')` | root | `record-fixtures: OK` | 5 min |
| `Invoke-IgNode -Repo pentomino -Task 'T12 replay case' -NodeArgs @('tools\record-fixtures.mjs', '--replay-case', '--check')` | root | `record-fixtures: replay case OK` | 5 min |
| `npm run check` | root | exit 0 | 2 min |
| `git status --short` | root | only the six files of the Scope | 1 min |

## Stop points and questions

- Stop and report before: changing `pack.js`, the fixtures or any other file outside the Scope; a fixture check that
  fails (a diagnosis gate: P6 must change no puzzle; report the first differing field).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T12-B01 | The generator makes the same puzzles with the same stored ratings | both fixture checks; the `clues.test.js` P6 case | command output |
| T12-B02 | The search no longer runs the DLX diagnostic for ratings nobody sees | review of `rateWith`; the lean test | diff; test output |
| T12-B03 | Recorded ratings keep the canonical DLX diagnostic fields; the visible score table of the Generation steps is unchanged | `tests/replay.test.js` green (recorders get full ratings) | the full-suite output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T12-T01 | A lean rating never leaves `selectClues` and is refused if stored | the P6 case; the claim test | test output |
| T12-T02 | Work units unchanged (the replay meter tests stay green) | `npm test` | test output |
| T12-T03 | The living specification describes the code | step 5 | diff of `docs/design-detail.md` |
| T12-T04 | Nothing else changed; formats | `git status --short`; `npm run check` | command output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |

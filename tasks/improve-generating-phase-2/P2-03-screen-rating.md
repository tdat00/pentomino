# P2-03: The screen rating with its certificate, composed with P6

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 (`difficulty.js`), §4.4 (P2 row); P2-T02 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-03` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; the pack commit (`difficulty.js` is this task's alone) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: locked focused runs |

## Goal

`gen-v4` rates its probes under a lowered main-work limit `W` (P2's screen). This task adds that rating to
`difficulty.js` in the three forms the search uses (lean for P6, full, detailed for recorders) and the certificate
test. A certified screen rating is the canonical rating; a screen-capped one is only a direction (P2-04).

## Authority and fixed points

- `core/engine/difficulty.js` at the base: `measureV3Core(board, pieces, clues, ws, limits, keepDetail, withDlx = true)`
  (312, private), `rate` (420), `rateDetailed` (436), `rateLean` (450), `completeDiagnostic` (466), `ratingOf` (478).
- Frozen form: `ig-select-v4.js:427-462` (`screenLimits = { deduce: { ...DEDUCE, work: W }, dlx: SCORE.caps }`) and the
  certificate at `:503-505` (`m.work - m.censusWork > W` is screen-capped). The frozen `v4-3` edit is the detailed form.
- `rate`, `rateDetailed`, `rateLean` and their lines stay unchanged (P2-12d anchors the trace on their first lines).

## Scope

- Change `core/engine/difficulty.js` (steps 2-3), `docs/design-detail.md` §7.9.
- Create `tests/screen-rating.test.js`.
- Do not change: anything else. Guard: G-PROTECTED, G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/difficulty.js', 'tests/screen-rating.test.js', 'docs/design-detail.md',
    'tasks/improve-generating-phase-2/P2-03-screen-rating.md')
  ```

## Steps

1. Preflight: `git --no-pager diff --exit-code --stat HEAD -- core/engine/difficulty.js tests` prints nothing.
2. Append to `core/engine/difficulty.js`, after `completeDiagnostic`:

   ```js
   /**
    * A search rating under a lowered main-work limit (`gen-v4`'s screen, design §7.9): the measurement of `rateLean`
    * (`mode` 'lean'), `rate` ('full') or `rateDetailed` ('detailed') with `DEDUCE.work` replaced by `work`. Throws as
    * they do; an `IncompleteRatingError` is a capped path. With `work === DEDUCE.work` the result equals theirs.
    * @param {Board} board
    * @param {Piece[]} pieces
    * @param {Pose[]} clues
    * @param {Workspace} ws
    * @param {number} work Main-work limit, an integer from 1 to `DEDUCE.work`.
    * @param {'lean' | 'full' | 'detailed'} mode
    * @returns {{ rating: RatingV3, detail: RatingDetail | null }}
    */
   export function rateWithLimits(board, pieces, clues, ws, work, mode) {
     const limits = { deduce: { ...DEDUCE, work }, dlx: SCORE.caps };
     const { metrics, detail } = measureV3Core(board, pieces, clues, ws, limits, mode === 'detailed', mode !== 'lean');
     return { rating: ratingOf(metrics), detail };
   }

   /**
    * P2's certificate: a rating made under the main-work limit `work` is the canonical rating when its main-phase work
    * (`work - censusWork`) is at most `work`; otherwise it is screen-capped (a direction, never accepted or shown).
    * @param {MetricsV3} metrics
    * @param {number} work
    * @returns {boolean}
    */
   export function screenCertified(metrics, work) {
     return metrics.work - metrics.censusWork <= work;
   }
   ```

   The first line `export function rateWithLimits(board, pieces, clues, ws, work, mode) {` is an anchor of P2-12d and
   must stay exactly so. Throw `RangeError('work must be an integer from 1 to DEDUCE.work')` first when `work` is not
   an integer in that range (add this check as the function's first statement).
3. No other change in `difficulty.js`.
4. Tests below; the locked focused gate.

## Tests

The corpus is the six `CLUE_RECIPES` of `tests/fixtures/clue-recipes.js` on `RECIPE_BOARD_ROWS` with
`CLASSIC_PENTOMINOES` and `recipeWitness()` (as `tests/difficulty.test.js` builds them), one workspace
`createWorkspace(MAIN_WORKSPACE_BYTES)`.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/screen-rating.test.js` | `at the canonical limit the screen rating is the canonical rating` | each recipe, `work = DEDUCE.work` | `rateWithLimits(..., 'lean').rating` deep-equals `rateLean`; `'full'` deep-equals `rate`; `'detailed'` deep-equals `rateDetailed` (rating and detail); `detail` is `null` for lean and full |
| same | `a certified screen rating equals the canonical rating` | each recipe; `w = rate(...).metrics.work - rate(...).metrics.censusWork` (its own main work) | `screenCertified(metrics, w)` true and the lean rating at `work = w` deep-equals `rateLean` |
| same | `below its main work a rating is screen-capped or capped` | each recipe with main work above 1; `work = 1` | either `rateWithLimits` throws `IncompleteRatingError`, or it returns and `screenCertified(rating.metrics, 1)` is false |
| same | `P6 composes: a completed lean screen rating equals rate` | each recipe, `work = DEDUCE.work`, lean | `completeDiagnostic(board, pieces, clues, lean, ws)` deep-equals `rate(...)` |
| same | `an invalid limit throws` | `work` 0, 1.5, `DEDUCE.work + 1` | `RangeError` |
| `tests/difficulty.test.js`, `tests/difficulty-v3.test.js` (unchanged) | existing | | pass |

## Documentation

`docs/design-detail.md` §7.9: one paragraph "The screen (phase 2)": `rateWithLimits` rates under a lowered main-work
limit `W`; the certificate is `work - censusWork <= W`; a certified rating equals the canonical rating; a screen-capped
rating steers the search only and is never accepted, shown or scored; `gen-v4` uses `W` = 190,000,000 on Nightmare
boards of 196 to 256 active cells (`screen-v4-v1`) and the canonical limit elsewhere (not yet live).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --check core\engine\difficulty.js` | root | exit 0 | 30 s |
| locked focused: `--test tests/screen-rating.test.js tests/difficulty.test.js tests/difficulty-v3.test.js` | §3.3 | `# fail 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- `QUESTION:` if the canonical-limit equality fails for any recipe (it would mean `measureV3Core` depends on more than
  `limits`), or if a recipe has main work 0 so the cap case cannot be built (then report which).

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-03-B01 | No user-visible change; existing ratings unchanged | the focused gate (`difficulty` suites) | gate output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-03-T01 | P2-T02: certified screen ratings deep-equal canonical ones on the corpus; P6 composes (lean, completed, detailed) | `tests/screen-rating.test.js` | test output |
| P2-03-T02 | The anchor line of step 2 exists verbatim once | `Select-String -SimpleMatch` | command output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] `docs/design-detail.md` §7.9 updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; helper lines and pass counts; each AC row with its evidence; questions and
deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w3, 203f5ca727301df0a7b1a976748c571189d60db4 (rebased onto gen-v4 after P2-01) |
| Start, end, duration | dispatched 2026-11-25 22:01 +07:00 (developer 22:01:53 to 22:05:26); accepted and merged 22:09; about 8 min |
| Waiting for rulings | none |
| Agent id, model | 6a24813c-8721-4c6d-bf89-f9e2e1ce24ac, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 15; 889,564 / 9,356 / 810,090 |
| AI credits | 37.32 |
| Questions and rulings | none; three minor deviations accepted by the orchestrator (non-behavioural): RangeError check placed first as the task text requires; the cap case skips recipes with main work <= 1 (none occurred); G-PROTECTED base 97a6326 as the pack writes |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 4 files); rebased onto c4d74b4 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked `IG P2-03 merge exit=0 seconds=105.928 quiet=45`, screen-rating + difficulty + difficulty-v3 39/39 pass, 0 fail/cancelled/todo |
| Commit (slot), commit on `gen-v4` | slot 5b5f13e, rebased ec8c583; gen-v4 ec8c5830ddf586acdae0e089a9b3d56905472af8 |
| Issues and named items | none; W 190,000,000 and screen-v4-v1 are documented only, applied by later tasks |

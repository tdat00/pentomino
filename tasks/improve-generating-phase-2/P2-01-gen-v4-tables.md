# P2-01: `gen-v4.js`: the frozen values, the route, the per-set rule and the family predicate

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1, §4.2, §4.3, §4.4 (P4, P5), §4.5 values; D-P2-05, D-P2-06, D-P2-07; P2-T08 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-01` from the `gen-v4` head at the start (the pack commit); G-PROTECTED base `97a6326` |
| Lane; starts when merged | S; the pack commit |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: locked focused runs |

## Goal

One DOM-free module holds every value and pure rule the freeze fixed for `gen-v4`:

- the table ids;
- the route predicate;
- the per-set prior rule of Hell 1;
- the algorithm-family predicate.

Later tasks read them. Nothing uses the module yet: the route stays off (`GEN_V4_LIVE = false`) until the cutover
(P2-15), so no puzzle, record or text changes.

## Authority and fixed points

- **Values.**
  - `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` (`values`, `bounds`);
  - `tools/ig-proto/data/prior-s3-v1.json` (`cells`);
  - the selection: `n-mid` (Nightmare 196 to 256 active cells) is the only screened class (plan §4.3,
    `screen-v4-v1`).
- **Frozen code mirrored here** (read only):
  - `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:57-63` (`SKIP_BOUNDS_V4`), `:82-88` (`callBudgetOf`),
    `:199-205` (`priorCount`), `:949-950` (start and step);
  - the frozen per-set rule `igPriorOf`: edit `ps-7` of `tools/ig-proto/variants/v4-ps.json`;
  - the level filter `ps-levels` (`['hell-1']`).
- **The per-set rule** (R1, plan §4.4 P4 row, verbatim): "On Hell 1, apply the frozen per-set rule to the batch's usable
  calibration: its solution and clue poses must be self-consistent for the current board/pieces, its rating must name
  the target level, and the current `require` mode additionally needs `certificate.status === 'unique'`. A valid
  `igWindow.wc` supplies the clamped start for every ordinary candidate [...] Otherwise use the table."
  - Self-consistency stays the client's `usableCalibration`; the pure function below takes an already usable
    calibration.
- **The route** (plan §4.2, D-P2-05): `gen-v4` for `hell-1`, and for `nightmare` unless the board is exactly 26 by 26 with
  676 active cells. Every other level keeps `gen-v3`.
- **Do not wire** the module into any caller in this task.

## Scope

- **Create:**
  - `core/engine/gen-v4.js` (step 2);
  - `tests/gen-v4.test.js` (Tests).
- **Change:**
  - `tools/bench/report.js`: add `'core/engine/gen-v4.js'` to `SOURCE_FILES` (step 3);
  - `docs/design-detail.md`: the module tree (line 169) and §7.6 only (Documentation).
- **Do not change:** every other file. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/gen-v4.js', 'tests/gen-v4.test.js', 'tools/bench/report.js', 'docs/design-detail.md',
    'tasks/improve-generating-phase-2/P2-01-gen-v4-tables.md')
  ```

## Steps

1. **Preflight.** `git --no-pager diff --exit-code --stat 97a6326 -- core tests tools/bench docs/design-detail.md`
   prints nothing (exit 0); otherwise `QUESTION:`.
2. **Create `core/engine/gen-v4.js`** with `// @ts-check`, a header comment naming plan v4 P1 to P5 and phase 2 §4.1, and
   exactly these exports, each with JSDoc.

   Write every `export const` on its own line, character for character as shown: the measurement copies (P2-12b, P2-12d) anchor
   on these lines. Import only `./board.js` and `./policy.js`.

   **Switch and table ids:**
   - `export const GEN_V4_LIVE = false;` (comment: "P2-15 sets it to true together with `ALGO_ID = 'gen-v4'`").
   - `export const PRIOR_TABLE_ID = 'prior-s3-v1';`, `export const SCREEN_TABLE_ID = 'screen-v4-v1';`,
     `export const BUDGET_TABLE_ID = 'budget-s3-v1';`, `export const DEADLINE_ID = 'deadline-s3-v1';`.

   **Values:**
   - `export const PRIOR = Object.freeze({ ... })`: the 27 keys of `tools/ig-proto/data/prior-s3-v1.json` `cells`
     (`'<level>@<active cells>'`, for example `'nightmare@196'`), each mapped to its `share` number written literally
     (for example `'nightmare@196': 0.190476`). Keys in the file's order.
   - `export const NO_PRIOR_STEP = 8;` (the frozen `U0`).
   - `export const SCREEN_W = 190000000;` and `export const SCREEN_AREAS = Object.freeze([196, 256]);`.
   - `export const CALL_BUDGET = Object.freeze({ any: Object.freeze({ nightmare: 10000000000, 'hell-1': 40000000000 }), require: Object.freeze({ nightmare: 32000000000, 'hell-1': 40000000000 }) });`
   - `export const SET_ATTEMPTS_BOUND = 4;`, `export const RERATE_MAX = 4;`.
   - `export const PER_SET_LEVELS = Object.freeze(['hell-1']);`
   - `export const DEADLINE = Object.freeze({ reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 });`
   - `export const SKIP_BOUNDS_V4 = Object.freeze({ subsets: 2192, repairs: 64 });`

   **The route:**
   - `export function isFull26(board)`: `board.width === 26 && board.height === 26 && activeCount(board) === 676`
     (`activeCount` from `./board.js`).
   - `export function isGenV4Route(levelId, board)`: `levelId === 'hell-1' || (levelId === 'nightmare' && !isFull26(board))`.
   - `export function usesGenV4(levelId, board)`: `GEN_V4_LIVE && isGenV4Route(levelId, board)`.

   **Screen, budget and start:**
   - `export function screenWOf(levelId, area)`: `SCREEN_W` when `levelId === 'nightmare'` and
     `SCREEN_AREAS[0] <= area <= SCREEN_AREAS[1]`, else `DEDUCE.work` (`./policy.js`; 760,000,000 means no screen).
   - `export function callBudgetOf(uniqueness, levelId)`: `CALL_BUDGET[uniqueness]?.[levelId]` when it is a positive
     number, else `Infinity`.
   - `export function priorStart(levelId, area, K)`: `null` when `K < 3` or the key `${levelId}@${area}` is absent;
     else `Math.min(K - 2, Math.max(1, Math.round(PRIOR[key] * K)))`.
   - `export function startOf(prior, K)`: `{ c0: Math.min(K - 2, Math.max(1, prior ?? K - NO_PRIOR_STEP)), step0: prior === null ? NO_PRIOR_STEP : 1 }`
     (the frozen `ig-select-v4.js:949-950`; `prior` is `null` or an integer).

   **The per-set rule and the family:**
   - `export function perSetPrior(cal, levelId, uniqueness)`: the body of the frozen `igPriorOf`, verbatim. Return
     `{}` when any of these holds:
     - `cal` is `undefined` or `null`;
     - `cal.rating === null`;
     - `cal.rating.level !== levelId`;
     - `uniqueness === 'require' && cal.certificate?.status !== 'unique'`.

     Otherwise `const wc = cal.igWindow?.wc;` and return `Number.isInteger(wc) && wc >= 1 ? { igPrior: wc } : {}`. It
     never reads `seenLayouts`, `seenClues` or any key. JSDoc: the caller applies it only when
     `PER_SET_LEVELS.includes(levelId)` and only to a usable calibration.
   - `export function isV4Family(algo)`:
     `typeof algo === 'string' && (algo === 'gen-v4' || /^gen-v4-proto:[a-z0-9][a-z0-9-]{0,39}$/.test(algo))`.
3. **`SOURCE_FILES`.** In `tools/bench/report.js` `SOURCE_FILES` (lines 37-49), insert `'core/engine/gen-v4.js', `
   directly after `'core/engine/generate.js', ` on line 39. Change nothing else in that file: the tail line
   `'tools/bench/responsiveness.js', 'tools/bench/calibration-reference.js',` must stay the last entry line.
4. **Tests.** Write the tests below and run the focused gate.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/gen-v4.test.js` | `the prior table equals prior-s3-v1` | read `tools/ig-proto/data/prior-s3-v1.json` | 27 keys; `PRIOR[k] === cells[k].share` for every key; no extra key; `PRIOR_TABLE_ID === json.id` |
| same | `the route: Hell 1 and Nightmare except the full 26x26` | `rectangle(26, 26)`, `rectangle(13, 52)` (676 cells), `rectangle(25, 26)`, `rectangle(10, 10)` (`board.js`), and a 26x26 `boardFromRows` board with one `.` cell (675) | `isGenV4Route('nightmare', b)` false only for `rectangle(26, 26)`; true for the others; `'hell-1'` true for all; `'master'`, `'hell-2'` false |
| same | `the route is off until the cutover` | any board | `GEN_V4_LIVE === false`; `usesGenV4('nightmare', rectangle(10, 10)) === false` |
| same | `the screen applies on Nightmare 196 to 256 cells only` | areas 144, 145, 195, 196, 256, 257, 324, 325, 359, 360 | `screenWOf('nightmare', a)` is 190,000,000 for 196 and 256 only (and every area between); 760,000,000 elsewhere; `'hell-1'` 760,000,000 at 196 |
| same | `the call budget by mode and level` | (`any`,`nightmare`), (`any`,`hell-1`), (`require`,`nightmare`), (`require`,`hell-1`), (`any`,`master`) | 1e10, 4e10, 3.2e10, 4e10, `Infinity` |
| same | `the start with and without a prior cell` | `priorStart('nightmare', 196, 21)`; `priorStart('nightmare', 197, 21)`; `priorStart('nightmare', 196, 2)`; `startOf(null, 9)`; `startOf(null, 5)`; `startOf(4, 21)` | 4; null; null; `{ c0: 1, step0: 8 }`; `{ c0: 1, step0: 8 }`; `{ c0: 4, step0: 1 }` |
| same | `the frozen values` | constants | `SET_ATTEMPTS_BOUND` 4, `RERATE_MAX` 4, `PER_SET_LEVELS` deep-equals `['hell-1']`, `SKIP_BOUNDS_V4` `{ subsets: 2192, repairs: 64 }`, `DEADLINE` as step 2, table ids as step 2 |
| same | `the per-set rule follows the frozen igPriorOf` | `cal = { rating: { level: 'hell-1' }, certificate: { status: 'unique' }, igWindow: { wc: 6 } }`; the same with `certificate.status 'multiple'`; with `rating.level 'nightmare'`; with `rating: null`; with `igWindow: { wc: 0 }`; with `igWindow` absent; `cal` `undefined` | with `('hell-1', 'require')`: `{ igPrior: 6 }`; `{}` (and `{ igPrior: 6 }` with `'any'`); `{}`; `{}`; `{}`; `{}`; `{}` |
| same | `isV4Family` | `'gen-v4'`, `'gen-v4-proto:p2-none'`, `'gen-v4-proto:'`, `'gen-v3'`, `undefined` | true, true, false, false, false |
| `tests/benchmark-report.test.js` (unchanged) | `the source digest ... covers every engine file` | new engine file | passes because step 3 lists it |

- `priorStart('nightmare', 196, 21)`: `round(0.190476 x 21) = 4`.
- `startOf(null, 9)`: `clamp(9 - 8, 1, 7) = 1`.

## Documentation

`docs/design-detail.md`:

- **The module tree (line 169):** add `gen-v4.js` to the `core/engine` line that lists `clues.js  generate.js ...`.
- **§7.6:** add one paragraph "Phase 2 (`gen-v4`), not yet live", after the section's last text line. It lists:
  - the module `core/engine/gen-v4.js` and the table ids;
  - the screen rule (190 M on Nightmare 196 to 256 active cells), the budgets, the bound 4 and the deadline values;
  - the route predicate, the per-set rule (Hell 1 only) and the family predicate.

  It states that the route stays off until the cutover.

No other document.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| step 1 preflight | slot root | no output, exit 0 | 30 s |
| `node --check core\engine\gen-v4.js` | slot root | exit 0 | 30 s |
| locked focused gate: `-NodeArgs @('--test', 'tests/gen-v4.test.js', 'tests/benchmark-report.test.js')` | §3.3 | `# fail 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | each prints its OK line | 2 min |

## Stop points and questions

- `QUESTION:` (check-list §3.6) when any of these holds:
  - `prior-s3-v1.json` has other than 27 cells;
  - `freeze.json` `values` differ from step 2;
  - the frozen `ps-7` body differs from step 2;
  - an existing test pins `SOURCE_FILES`' length.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-01-B01 | No user-visible change: the route is off | `GEN_V4_LIVE` test; focused gate | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-01-T01 | The prior table equals `prior-s3-v1` exactly | `the prior table equals prior-s3-v1` | test output |
| P2-01-T02 | The route predicate and the 26x26 exception (P2-T08's boundaries) | the route and screen tests | test output |
| P2-01-T03 | Budgets, bound, deadline, skip bounds, start rule equal the freeze | the value tests | test output |
| P2-01-T04 | The per-set rule is the frozen `igPriorOf`; the family predicate is exact | the per-set and family tests | test output |
| P2-01-T05 | `SOURCE_FILES` lists the new module; formats and guards pass | `benchmark-report.test.js`; §3.4 | gate output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed (G-WORKTREE output)
- [ ] Tests added and green; the focused gate green
- [ ] `docs/design-detail.md` line 169 and §7.6 updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the focused helper line (`IG ... seconds=`) and the pass counts;
- each AC row with its evidence;
- the questions, rulings and deviations, and the named items.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w1, 203f5ca727301df0a7b1a976748c571189d60db4 |
| Start, end, duration | dispatched 2026-11-25 22:01 +07:00; developer 22:01:53 to 22:06:04; accepted 22:20; about 19 min |
| Waiting for rulings | none |
| Agent id, model | d48d683a-a92f-4948-a18a-82fb670ab40d, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 17; 987,882 / 15,277 / 910,634 |
| AI credits | 43.69 |
| Questions and rulings | none; no deviations |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | static guards in the slot (G-PROTECTED, G-WORKTREE, G-FORMAT, G-CHECK); merge gate after rebase: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT and the locked focused gate tests/gen-v4.test.js + tests/benchmark-report.test.js (results in the bookkeeping) |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | none; developer note: hostMarginMs 1000 follows the task text (not in freeze.json deadline; consistent with P2-10/P2-11a) |

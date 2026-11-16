# MP02b — R3 contradiction check, R6 lookahead, E, recipe characterisation

| Header | Value |
|---|---|
| ID | MP02b |
| Depends on | MP02a (accepted and committed) |
| Estimated size | Medium: about 350–550 changed lines (module about 150–200, tests about 150–250, documents about 40) |
| Owner role | Engine |
| Milestone | M1 — deduction solver |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-03, RES-06 (rows R3 and R6), RES-08, RES-10, RES-11 (items 4, 5), RES-32 row MP02; check-list §4.2 D4, D6, D8, D11 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The v3 rating counts real guesses; a guess that a person would never need must not be counted. Two deductions remove
most of them:

- **R3, pockets (contradiction check).** The free cells fall into closed regions ("pockets"). A pocket whose size is
  not the total size of some of the remaining pieces can never be filled: the position is dead. People see this at a
  glance (a three-cell hole when only pentominoes are left).
- **R6, dead placements (lookahead).** "If I put this piece here, the board breaks at once": a placement whose forced
  consequences (R1, R2 and the pocket check) end in a contradiction is impossible and is removed. The number of
  placements removed this way on the solution path is E, which the v3 score will use.

With these two rules the Hard recipe of the test fixtures needs two guesses instead of three, and a small unsolvable
board is proved unsolvable without any guess. This task adds the R3 contradiction check and R6 to the solver of
MP02a, re-pins the values that change, and pins the six recipes as a characterisation of this ladder version.

## Scope

### In scope

- `core/engine/deduce.js`: the R3 contradiction check (in the ladder and in the lookahead closure), R6, E, four new
  workspace slots and their setup.
- `tests/deduce.test.js`: the re-pinned values (an intended contract change, check-list D8) and the new cases.
- `docs/design-detail.md` §7.9: the two rules, the closure, E, the slots.

### Out of scope

- R3 **place** (forcing the one piece that fits a pocket), R4 and R5 (MP03); R7-R9 (MP04); the census (MP05).
- Any caller of `measureDeduction`; `DEDUCE` values (`lookaheadWidth` stays 4); every file outside the ownership list.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Native ES module, `// @ts-check`, JSDoc; pure, no RNG; none of the words `LIMITS`, `QUALIFICATION`,
  `enabledMaxActive`, `deriveLimits` in `deduce.js`; no test name containing `slow`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.
- Run only the commands of the test plan; never stage, commit, stash, reset, push or switch branches; never edit
  `tasks/difficulty-v3/` or the reports.

## Inputs & context

### What MP02a delivered

`measureDeduction(model, limits = DEDUCE, diagnostics = {})` in `core/engine/deduce.js` (read the module first):

- the slot table that drives the memory precheck and the allocation (`deduce.colStart`, `colRows`, `colCount`, `live`,
  `covered`, `trail`, `alt`, `altBase`, `picked`, `guessC`, `guessPlaced`);
- the state with `select`, `kill`, `mark` and `undo` (all changes on the trail; the selected row is killed too);
- the ladder R1 (cell columns ascending), R2 (piece columns ascending), restarting at R1 after any change, returning
  FIXPOINT, CONTRADICTION or STOPPED; the work check at the start of every pass;
- the MRV search, the first-path snapshot (`F = R1 + R2 + R3`, `E = R6`, `deductionTier` from the counts), the count,
  the three statuses, the node and work caps, `verifyUndo`;
- `tests/deduce.test.js` with the data tables of V1-V7, C1-C10, the recipes and the random oracle.

Model facts: cell columns `0 .. NC - 1` are the free cells in row-major order; `model.cellColumn[y * width + x]` is the
column of board cell (x, y) or -1 (blocked or clued); `model.pieceSizes[p]` is the size of free piece `p`, whose
column is `NC + p`; pieces are edge-connected.

### R3, pocket contradiction check (RES-06)

A **component** is a 4-connected set of uncovered cell columns (neighbours: x ± 1 or y ± 1 inside the board, with a
cell column >= 0 that is not covered). The pieces still to place are the uncovered piece columns. A component is
dead when its size is not the sum of a sub-multiset of the remaining piece sizes (this includes a component smaller
than the smallest remaining piece); then the position is a **contradiction**.

```text
r3(): returns CONTRADICTION or NO_CHANGE          // MP03 adds the placement step
  total = sum of pieceSizes[p] over the pieces p with covered[NC + p] = 0
  top = min(total, NC)
  reach[0 .. top] = 0; work += top + 1
  for each uncovered piece p, ascending:            // 0/1 knapsack over the remaining pieces
    w = pieceSizes[p]
    for s = top down to w: work += 1
      if reach[s - w] !== 0: reach[s] |= 2           // s = w + a sum of one or more other pieces
      if s === w:            reach[s] |= 1           // s = this piece alone
  stamp += 1
  for c0 = 0 .. NC - 1:
    if covered[c0] or seen[c0] === stamp: continue
    breadth-first search from c0 over the component (seen[c] = stamp when queued; work += 1 per cell taken from
    the queue); size = number of cells
    if size > top or reach[size] === 0: return CONTRADICTION
  return NO_CHANGE
```

`reach[s]` bit 1 means "s is the size of one remaining piece", bit 2 "s is the sum of two or more remaining pieces";
`reach[s] === 0` means no sub-multiset sums to s. The board coordinates of cell column c come from a `cellIndex` map
built at setup (`cellIndex[cellColumn[i]] = i` for every board index i with `cellColumn[i] >= 0`; x = i % width, y =
Math.floor(i / width)). A failed R3 check is a contradiction and is never counted in `rules`.

### R6, dead placement (RES-06)

```text
r6(): returns STOPPED or the number of rows killed (0 = no change)
  for c = 0 .. C - 1:                                // cell and piece columns, ascending
    if covered[c] or colCount[c] > limits.lookaheadWidth: continue
    killed = 0
    for k = colStart[c] .. colStart[c + 1] - 1:      // the column's rows, ascending
      work += 1; r = colRows[k]; if !live[r]: continue
      work += 1
      m = mark(); select(r); out = closure(); undo(m)
      if out === STOPPED: return STOPPED
      if out === CONTRADICTION: kill(r); killed += 1
    if killed > 0: return killed                     // the first column with a kill ends the application
  return 0

closure(): the cheap ladder, never counted
  loop:
    if work > limits.work: stop = 'work-cap'; return STOPPED
    R1 as in the ladder (select forced cells, restart; a column with no live row is CONTRADICTION)
    R2 likewise for pieces
    r3() === CONTRADICTION: return CONTRADICTION
    return FIXPOINT                                   // never R4-R9, never R6 again
```

- A cap inside the closure stops the whole measurement (`work-cap`); a closure stopped by a cap proves nothing and
  kills nothing.
- A killed row stays killed for the rest of the column's loop; the later trials see the reduced state.
- `lookaheadWidth: 0` disables R6 (an uncovered column with no live row is a contradiction found by R1 or R2 first).
- R6 is tier 2; its count is the number of rows killed; `E = R6` on the final path.

### The ladder after this task

```text
loop:
  work check
  R1 (cells)  -> select, R1 += 1, restart
  R2 (pieces) -> select, R2 += 1, restart
  R3 check    -> CONTRADICTION
  R6          -> STOPPED, or k > 0 kills: R6 += k (when counting), restart
  return FIXPOINT
```

MP03 inserts R3 place after the check, and R4 and R5 before R6.

### New slots (add them to the slot table, so the memory precheck counts them)

| Slot | Type | Length | Holds |
|---|---|---|---|
| `deduce.cellIndex` | Int32 | NC | board index of each cell column (setup: work += width * height) |
| `deduce.queue` | Int32 | NC | breadth-first queue |
| `deduce.seen` | Int32 | NC | visit stamps; zeroed at setup (work += NC); the stamp counter starts at 0 in every measurement |
| `deduce.reach` | Uint8 | NC + 1 | the knapsack bits of R3 |

### Re-pinned values (intended contract change, check-list D8)

Every value not listed stays as MP02a pinned it (V1, V4, V7, C1-C10; C3's `first` remains equal to V2's).

| # | MP02a value | MP02b value |
|---|---|---|
| V2 (`rect(3, 1)`; M, D) | E 0, tier 1, R6 0 | E 1 (R6 1), tier 2; F 1, G 1, choices `[2]`, few, Gt 1, nodes 3 unchanged |
| V3 (`rect(10, 1)`; M, D, I3, I4) | E 0, tier 1 | E 5 (R6 5), tier 2; G 3, choices `[4, 3, 2]`, many, Gt 7, nodes 15 unchanged |
| V5 (`rect(3, 2)`; I3, L3) | none, Gt 1, nodes 3 | none, Gt 0, nodes 1 (R6 proves it at the root; N2) |
| V6 (`['#...#', '#...#', '##.##']`; D, I3, L3) | none, Gt 1, nodes 3 | none, Gt 0, nodes 1 (two 4-cell pockets; 4 is not a sum of {2, 3, 3}) |

Recipes (12 classic pentominoes on `RECIPE_BOARD_ROWS`, clues from `recipeWitness()`), all complete, S 1, unique,
exhausted, F = R1:

| Recipe | U | F | E (R6) | tier | G | choices | info (4 decimals) | Cmax | Dmax | Gt | nodes |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| very-easy | 3 | 3 | 0 | 1 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| easy | 4 | 4 | 0 | 1 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| normal | 5 | 5 | 1 | 2 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| hard | 7 | 5 | 4 | 2 | 2 | `[3, 5]` | 3.9069 | 5 | 2 | 2 | 9 |
| expert | 8 | 5 | 4 | 2 | 3 | `[7, 10, 9]` | 9.2992 | 10 | 4 | 5 | 40 |
| master | 10 | 4 | 3 | 2 | 6 | `[6, 2, 7, 5, 7, 6]` | 14.1066 | 7 | 6 | 84 | 431 |

This table characterises this ladder version; it is not a monotonicity theorem (the recipe clue sets are not nested,
`tests/fixtures/clue-recipes.js:31-38`), and MP03 re-pins it.

### New cases (verified with the reference implementation)

| # | Case | Expected |
|---|---|---|
| N1 | V6 with `{ ...DEDUCE, lookaheadWidth: 0 }` | none, Gt 0, nodes 1: the R3 check alone proves it at the root |
| N2 | V5 with `{ ...DEDUCE, lookaheadWidth: 0 }` | none, Gt 1, nodes 3: without R6 the search needs a guess node |
| N3 | V2 and V3 with `{ ...DEDUCE, lookaheadWidth: 0 }` | E 0, tier 1 and every other value as MP02a pinned them |
| N4 | V2, V3, V5 and the six recipes with `{ verifyUndo: true }` | deep-equal to the results without it; no throw (the lookahead's undo restores the state exactly) |
| N5 | the random oracle of MP02a, unchanged | still passes (the count equals DLX with R3 and R6 active) |

## Files to create/modify

### Exclusive ownership

- `core/engine/deduce.js`.
- `tests/deduce.test.js` (the re-pinned values of this task and the new cases; nothing else changes).

### Documentation slot

`docs/design-detail.md` §7.9: add R3 (contradiction check: components, the knapsack bits, tier 1, a contradiction is
not counted) and R6 (lookahead width, the cheap closure R1, R2 and the R3 check, kills counted as E, tier 2, a cap
stops the measurement) to the rule table and the ladder description; list the new slots. No other document changes.

## Implementation steps

1. Add the four slots to the slot table and their setup (the `cellIndex` map, zeroed `seen`, the stamp counter).
2. Implement `r3()` (check only) and call it in the ladder after R2.
3. Implement the closure and `r6()`; call R6 in the ladder after R3; count R6 only when the ladder counts.
4. Re-pin the values of the tables above in `tests/deduce.test.js` and add N1-N4.
5. Update design §7.9; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP02b-B01 | A dead pocket is recognised without a guess: a board whose pockets cannot be filled is proved unsolvable at the root | V6, N1 |
| MP02b-B02 | A placement that breaks the board at once is removed by lookahead and counted in E, so no guess is spent on it | V2, V3, V5, N2, N3 |
| MP02b-B03 | The six recipes are characterised with this ladder (fewer guesses than with R1 and R2 alone: the Hard recipe needs 2 instead of 3) | recipe table |
| MP02b-B04 | Nothing a player or the Generator sees changes: no caller uses the solver yet and every existing test passes | `npm run test:quick` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP02b-T01 | The ladder order is R1, R2, R3 check, R6; R3 also runs in the closure; the closure never runs R4-R9 or R6 and never counts | review |
| MP02b-T02 | The re-pinned V2, V3, V5, V6 values and the recipe table reproduce exactly; V1, V4, V7 and C1-C10 are unchanged | `deduce` tests |
| MP02b-T03 | N1-N3 reproduce (`lookaheadWidth: 0` disables R6; the R3 check alone proves V6) | `deduce` tests |
| MP02b-T04 | N4: `verifyUndo` finds no mismatch after any lookahead trial | `deduce` tests |
| MP02b-T05 | The random oracle passes unchanged | `deduce` tests |
| MP02b-T06 | The four new slots are in the slot table: the memory precheck counts them; the MP02a buffer-accounting tests pass unchanged | `deduce` tests; review |
| MP02b-T07 | Work is charged for the setup map, the zeroing, every knapsack update, every queued cell and every trial selection; the closure checks the work cap at every pass | review |
| MP02b-T08 | design §7.9 updated; `npm run test:quick` and `npm run check` pass; CRLF; no file outside the ownership list changed | command output; review |

## Test plan

### Exact commands

```powershell
node --test tests\deduce.test.js
if ($LASTEXITCODE -ne 0) { throw 'deduce tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases (`tests/deduce.test.js`)

| Case | Expected result |
|---|---|
| Re-pinned vectors | V2, V3, V5, V6 as in "Re-pinned values"; V1, V4, V7, C1-C10 unchanged |
| Recipes | the MP02b recipe table, every column, plus S 1, unique, exhausted |
| R3 alone | N1 |
| R6 needed | N2 |
| Lookahead off | N3 |
| Lookahead undo | N4 |
| Oracle | N5 (the existing test, unchanged) |

Change only the expected values that this task lists; a test that fails for any other reason is a defect to fix in
the code or to report (check-list D11).

## Definition of done & handoff

- Every criterion has its evidence; the quick set and the check pass; nothing outside the ownership list changed.
- Handoff to MP03: where R3's component list is built (MP03 places a piece in a pocket from it), how the ladder steps
  are ordered in the code, the slot table, and any deviation from this specification.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP02b: R3 contradiction check, R6 lookahead, E, recipe characterisation`) |
| Start | 2026-11-12 13:16 (+07:00) |
| End | 2026-11-12 13:25 developer; 13:30 orchestrator review and commit |
| Duration | 9 min developer (543 s); about 5 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 44 model calls; 4,826,670 input tokens (4,703,467 cache reads); 49,094 output tokens |
| AI credits | about 127 (developer) |
| Verification | Developer: `node --test tests\deduce.test.js` 14/14 (about 1 s); `npm run test:quick` 1,131/1,131 (17.3 s); `npm run check` OK; `git diff --check` clean; a scratch mutation sweep under `tests\artifacts\MP02b\` (deleted) caught the removed R3 check, the dropped R6 undo, uncounted R6, an unbounded knapsack and a missing `stamp += 1`. Orchestrator re-run: deduce 14/14, `npm run test:quick` 1,131/1,131 (18 s), `npm run check` OK |
| Acceptance | MP02b-B01..B04 and MP02b-T01..T08 met. Diff reviewed: `ruleR3` (0/1 knapsack over the remaining piece sizes, breadth-first pockets, never counted), `closure` (R1, R2, R3 check only, uncounted, work cap at every pass), `ruleR6` (first column with at most `lookaheadWidth` live rows that yields a contradiction; kills persist within the column), four new slots in `slotTable`; V2, V3, V5, V6 and the recipe table re-pinned as the task's intended contract change; V1, V4, V7 and C1-C10 unchanged |
| Issues & resolutions | T07 is a review item: a mutant that removes the closure's work-cap check is not caught by any test (the cap is checked at the next ladder pass anyway); verified by review, accepted. Decisions accepted: `ruleR6` returns NONE / APPLIED / STOPPED and counts internally; `closure` returns NONE / CONTRADICTION / STOPPED; knapsack work added in bulk (`top - w + 1` per piece, equal to one unit per update); design section 7.9 notes that the R3 scratch slots need no undo. No anchor moved, no vector disputed |
| Handoff | Ladder: R1, R2, `ruleR3()` (check), `ruleR6(counting)`. MP03 inserts R3 place right after the check (inside `ruleR3`, where `queue[0 .. tail - 1]` holds the pocket and `reach[tail] === 1` means one remaining piece fits exactly) and R4, R5 before R6; R6 counts in `rules[5]`. New slots `deduce.cellIndex`, `deduce.queue`, `deduce.seen` (Int32, NC) and `deduce.reach` (Uint8, NC + 1); `slotTable(R, C, NZ, NP, NC)`. The test "the R3 check is never counted and only R1, R2 and R6 have counts" must be updated by MP03 when R3 place starts counting; the `flat` helper now reports R6 |

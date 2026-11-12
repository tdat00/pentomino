# MP03 — R3 place, R4 and R5, rule boards and the soundness oracle

| Header | Value |
|---|---|
| ID | MP03 |
| Depends on | MP02b (accepted and committed) |
| Estimated size | Medium: about 400–650 changed lines (module about 150–200, tests about 250–400, documents about 40) |
| Owner role | Engine |
| Milestone | M1 — deduction solver |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-06 (rows R3, R4, R5; the shared kernel; the near-miss), RES-08, RES-09, RES-11 (item 5 and `tests/deduce-rules.test.js`), RES-32 row MP03; clarifications SA2-Q-P12 (a); check-list §4.2 D4, D8, D11 (traceability only) |
| Implementation status | Not started |

## Goal & business context

Three more deductions that people use, so that the v3 rating does not count them as guesses:

- **R3 place** (tier 1). A pocket that only one remaining piece can fill (its size is the size of one remaining
  piece and no combination of two or more remaining pieces), and exactly one placement covers the whole pocket: that
  piece goes there.
- **R4, a piece claims cells** (tier 2). If every remaining placement of a piece covers a cell, the piece will cover
  that cell, so no other piece can use it.
- **R5, a cell claims a piece** (tier 2). If every remaining placement over a cell belongs to one piece, that piece
  covers the cell, so its placements elsewhere are impossible.

The task also creates `tests/deduce-rules.test.js`: one positive board per new rule, the near-miss boards on which
R3 must not place, and a soundness oracle that compares the deduction count with the exact DLX count, so that no
rule can ever remove a placement of any solution.

## Scope

### In scope

- `core/engine/deduce.js`: R3 place after the R3 check, R4 and R5 between R3 and R6, three new slots.
- New `tests/deduce-rules.test.js`.
- `tests/deduce.test.js`: the re-pinned values listed below (an intended contract change, check-list D8).
- `docs/design-detail.md` §7.9.

### Out of scope

- R7, R8, R9 and the tier diagnostic `tier` (MP04); the census (MP05); any caller; `DEDUCE`.
- Cell-to-cell pairings (`every live row of cell A covers cell B`): excluded by SA2-Q-P12 (a).
- Grouping pieces of the same shape: rules work on labelled pieces (RES-09).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Native ES modules, `// @ts-check`, JSDoc; pure, no RNG; none of the words `LIMITS`, `QUALIFICATION`,
  `enabledMaxActive`, `deriveLimits` in `deduce.js`; no test name containing `slow`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.
- Run only the commands of the test plan; never stage, commit, stash, reset, push or switch branches; never edit
  `tasks/difficulty-v3/` or the reports.

## Inputs & context

### What MP02a and MP02b delivered

`core/engine/deduce.js` (read it first): the slot table and memory precheck; `select`, `kill`, `mark`, `undo`; the
ladder R1, R2, R3 check, R6 (restart at R1 after any change; work check at every pass); the closure (R1, R2, R3 check,
never counted); the MRV search, the first-path snapshot, the count, the statuses, the caps; `verifyUndo`.
`r3()` computes the remaining-size knapsack bits `reach[s]` (bit 1: s is the size of one remaining piece; bit 2: s is
a sum of two or more remaining pieces; 0: not reachable) and the components of uncovered cells, seeded in ascending
cell column, so the seed `c0` of a component is its lowest cell column. `tests/deduce.test.js` holds the data tables
(V1-V7, C1-C10, N1-N5, recipes) and the random oracle.

Rows: `rowStart[r + 1] - rowStart[r] - 1` is the number of cells of row `r`; `rowPiece[r]` its free-piece index;
piece `p`'s column is `NC + p`. Pieces are edge-connected.

### R3 place (RES-06)

After the check has passed for **every** component, in component order (ascending seed):

```text
for each component (c0, size), in order:
  if reach[size] !== 1: continue                   // fillable by two or more pieces (or by none)
  n = 0; found = -1
  for k = colStart[c0] .. colStart[c0 + 1] - 1:     // the rows over the component's first cell
    work += 1; r = colRows[k]
    if live[r] and rowStart[r + 1] - rowStart[r] - 1 === size: n += 1; found = r
  if n === 1: select(found); return PLACED          // ladder: R3 += 1 when counting, restart
return NO_CHANGE
```

Why it is sound: a component is separated from the other free cells by covered or blocked cells, and a placement is
connected, so the pieces that fill the component lie inside it and their sizes add up to `size`; `reach[size] === 1`
means exactly one piece fills it; that piece's placement covers the first cell and has exactly `size` cells, so it is
the one found. With no such row nothing is placed (the position is dead and another rule or the search proves it).
The closure keeps the **check only** (it never places). Keep the components of the last check in two slots
(`deduce.compFirst`, `deduce.compSize`).

### R4, a piece claims cells (RES-06)

```text
r4(): returns the number of rows killed (0 = no change)
  for p = 0 .. NP - 1, with pc = NC + p uncovered:
    nLive = 0; first = -1
    for each row r of colRows[pc] (work += 1 per entry), live only:
      nLive += 1; if first === -1: first = r
      for each cell column c of r (every entry but the last): mark[c] += 1; work += 1
    killed = 0
    for each cell column c of first, ascending (work += 1 each), when nLive > 0:
      if mark[c] !== nLive: continue                 // not common to every live row of p
      for each row r2 of colRows[c] (work += 1 per entry):
        if live[r2] and rowPiece[r2] !== p: kill(r2); killed += 1
    reset: for each live row r of p, for each cell column c of r: mark[c] = 0; work += 1
    if killed > 0: return killed                     // ladder: R4 += killed when counting, restart
  return 0
```

Sound: piece `p` must be placed, so it covers every cell common to all its live rows; another piece's row on such a
cell is impossible. The kills touch other pieces only, so `p`'s live rows (and the reset) are unchanged.

### R5, a cell claims a piece (RES-06)

```text
r5(): returns the number of rows killed
  for c = 0 .. NC - 1, uncovered:
    P = -1; one = true
    for each row r of colRows[c] (work += 1 per entry), live only:
      if P === -1: P = rowPiece[r] else if rowPiece[r] !== P: one = false; break
    if !one or P === -1: continue
    killed = 0
    for each live row r of colRows[NC + P] (work += 1 per entry):
      if r does not cover c (scan its cell columns, work += 1 per entry): kill(r); killed += 1
    if killed > 0: return killed                     // ladder: R5 += killed when counting, restart
  return 0
```

Sound: cell `c` must be covered and only `P` can cover it, so `P`'s placements that miss `c` are impossible.

R4 and R5 may share one kernel ("every live row of column A contains column B: kill the live rows of B that are not
rows of A"), enabled only for (A a piece, B a cell) and (A a cell, B a piece); no cell-to-cell pairing (SA2-Q-P12
(a)). The behaviour must equal the two definitions above, including the scan orders and "the first piece or cell with
a kill ends the application".

### The ladder after this task

```text
loop:
  work check
  R1 (cells)          -> select, R1 += 1, restart
  R2 (pieces)         -> select, R2 += 1, restart
  R3 check            -> CONTRADICTION
  R3 place            -> select, R3 += 1, restart
  R4 (pieces)         -> k kills: R4 += k, restart
  R5 (cells)          -> k kills: R5 += k, restart
  R6                  -> STOPPED, or k kills: R6 += k, restart
  return FIXPOINT
closure (unchanged): R1, R2, R3 check
```

Counts are added only when the ladder counts (the search's ladder); tiers: R3 1, R4 and R5 2. `F = R1 + R2 + R3`.

### New slots (add them to the slot table)

| Slot | Type | Length | Holds |
|---|---|---|---|
| `deduce.compFirst` | Int32 | NC | seed (lowest cell column) of each component of the last R3 check |
| `deduce.compSize` | Int32 | NC | size of each component |
| `deduce.mark` | Int32 | NC | R4 counters; zeroed at setup (work += NC) and returned to zero after each piece |

### Re-pinned values in `tests/deduce.test.js` (intended contract change, check-list D8)

Every value not listed stays as MP02b pinned it (V1, V4, V5, V6, V7, C1-C10 with C3's `first` equal to V2's, N1, N2,
N4, N5).

| # | MP02b value | MP03 value |
|---|---|---|
| V2 | E 1 (R6 1), R4 0, tier 2 | R4 1, E 0 (R6 0), tier 2; F 1, G 1, choices `[2]`, few, Gt 1, nodes 3 unchanged |
| V3 | E 5 (R6 5), R4 0 | R4 3, R6 2 (E 2), tier 2; G 3, choices `[4, 3, 2]`, many, Gt 7, nodes 15 unchanged |
| N3 (V2, V3 with `lookaheadWidth: 0`) | E 0, tier 1 | E 0, tier 2, R4 1 (V2) and R4 3 (V3); the rest unchanged |

Recipes, all complete, S 1, unique, exhausted; R2, R3 and R5 are 0 in every recipe:

| Recipe | U | F (R1) | R4 | E (R6) | tier | G | choices | info (4 decimals) | Cmax | Dmax | Gt | nodes |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| very-easy | 3 | 3 | 0 | 0 | 1 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| easy | 4 | 4 | 0 | 0 | 1 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| normal | 5 | 5 | 9 | 0 | 2 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| hard | 7 | 5 | 19 | 1 | 2 | 2 | `[3, 5]` | 3.9069 | 5 | 2 | 2 | 9 |
| expert | 8 | 5 | 9 | 3 | 2 | 3 | `[7, 10, 9]` | 9.2992 | 10 | 4 | 5 | 40 |
| master | 10 | 4 | 19 | 0 | 2 | 6 | `[6, 2, 7, 5, 7, 6]` | 14.1066 | 7 | 6 | 84 | 431 |

### Rule boards (verified with the reference implementation)

Pieces as in MP02a (`pc(id, cells)`; M, D, D2, I3, L3, I4), plus `O4 = pc('O4', [[0, 0], [1, 0], [0, 1], [1, 1]])`,
`T4 = pc('T4', [[0, 0], [1, 0], [2, 0], [1, 1]])`, and `P`, `U`, `L` from `CLASSIC_PENTOMINOES`. No clues.

| # | Board, pieces | DLX count | Expected with this task's ladder |
|---|---|---:|---|
| B1 R3 place | `boardFromRows(['##.###', '##.###', '#.....'])`; P, U, M (a P-shaped 5-cell pocket and a 3 x 2 region) | 2 | few, S 2, exhausted; Gt 1, nodes 3; F 2 (R1 1, R3 1), R4 4, R5 0, E 0, tier 2; G 1, choices `[2]`, Dmax 1; `rowPose(model, first.rows[0])` = `{ piece: 'P', x: 0, y: 0, turn: 3, mirrored: true }` (R3 places P first) |
| B2 R4 | `rect(5, 1)`; I4, M | 2 | few, S 2; Gt 1, nodes 3; F 1 (R1 1), R4 3, R5 0, E 0, tier 2; G 1, choices `[2]` |
| B3 R5 | `boardFromRows(['###', '###', '###', '.#.'])`; O4, L3, I3 | 2 | few, S 2; Gt 1, nodes 3; F 2 (R1 2), R4 19, R5 4, E 0, tier 2; G 1, choices `[2]` |
| B4 R5, unique | `boardFromRows(['###', '###', '.##', '.##'])`; T4, L, M | 1 | unique, exhausted; Gt 0, nodes 1; F 3 (R1 3), R4 2, R5 4, R6 2 (E 2), tier 2; G 0 |
| K1 R3 near-miss | `boardFromRows(['##.##', '##.##'])`; O4, M, L3 (two 4-cell pockets; 4 = O4 alone = M + L3) | 8 | many, S 8, stop `solution-limit`; Gt 3, nodes 11; F 1 (R1 1), R3 0, R4 0, R5 0, E 0, tier 1; G 2, choices `[2, 4]`, Dmax 1 |
| K2 R3 near-miss, two dominoes | the same board; O4, D, D2 (RES-06: one square tetromino and two dominoes) | 8 | the same values as K1: no placement by R3 |

For comparison (not to be pinned here): with the MP02b ladder B1 has R1 2, R6 5 and B2 E 3; with R1 and R2 alone B1
needs G 2. A random search of 200,000 small boards found no board on which R5 fires while R4 never does on the final
path (R4 runs first), so B3 and B4 show R5 after R4.

### The soundness oracle (RES-11)

On tiny boards every solution is enumerated by DLX, and no rule may remove a placement of any solution. Because each
solution of an exhaustive search is reached through exactly one branch, the deduction count equals the DLX count if
and only if no rule ever removed a row of a solution on that solution's own branch:

```js
const expected = countSolutions(model, { cap: Infinity, rowTrialLimit: Infinity }).found;
const r = measureDeduction(model, { ...DEDUCE, solutions: Math.max(2, expected + 1) }, { verifyUndo: true });
assert.equal(r.count.S, expected);
assert.equal(r.count.exhausted, true);
```

`tests/deduce-rules.test.js` runs it on B1-B4, K1, K2 and the MP02a vectors V1-V6 (rectangular, masked, clued and
repeated-shape boards); the random oracle of `tests/deduce.test.js` (unchanged) runs it on 274 random boards with the
full ladder.

## Files to create/modify

### Exclusive ownership

- `core/engine/deduce.js`.
- `tests/deduce-rules.test.js` (new).
- `tests/deduce.test.js` (the re-pinned values of this task only).

### Documentation slot

`docs/design-detail.md` §7.9: add R3 place, R4 and R5 to the rule table, with their conditions (the knapsack bits,
"exactly one placement covers the pocket", piece/cell pairs only), tiers and counts; the ladder order R1, R2, R3, R4,
R5, R6; the new slots. No other document changes.

## Implementation steps

1. Add the three slots to the slot table (zero `mark` at setup).
2. Keep the components of the R3 check; add R3 place after the check in the ladder (not in the closure).
3. Add R4 and R5 (separately or through the shared kernel) between R3 and R6.
4. Re-pin the listed values in `tests/deduce.test.js`; write `tests/deduce-rules.test.js`.
5. Update design §7.9; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP03-B01 | A pocket that only one remaining piece can fill is filled without a guess, and only then: the near-miss pockets that two pieces could also fill are left alone | B1, K1, K2 |
| MP03-B02 | A piece that must cover a cell keeps the other pieces off it, without a guess | B2, recipes |
| MP03-B03 | A cell that only one piece can reach claims that piece; no rule ever removes a placement of any solution | B3, B4; the oracle |
| MP03-B04 | Nothing a player or the Generator sees changes: no caller uses the solver yet and every existing test passes | `npm run test:quick` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP03-T01 | The ladder order is R1, R2, R3 check, R3 place, R4, R5, R6; the closure is unchanged (R1, R2, R3 check); R3, R4 and R5 are counted only by the counting ladder | review |
| MP03-T02 | B1-B4, K1 and K2 reproduce exactly, including the first pose of B1 | `deduce-rules` tests |
| MP03-T03 | The oracle passes on B1-B4, K1, K2 and V1-V6, and the random oracle of `tests/deduce.test.js` passes unchanged | `deduce-rules`, `deduce` tests |
| MP03-T04 | The re-pinned V2, V3, N3 values and the recipe table reproduce; every other pinned value is unchanged | `deduce` tests |
| MP03-T05 | No cell-to-cell pairing exists; R4 and R5 work on labelled pieces (no shape grouping, no `canonicalKey` import) | review |
| MP03-T06 | The three new slots are in the slot table; the buffer-accounting and memory-limit tests pass unchanged; `verifyUndo` finds no mismatch | `deduce` tests |
| MP03-T07 | design §7.9 updated; `npm run test:quick` and `npm run check` pass; CRLF; no file outside the ownership list changed | command output; review |

## Test plan

### Exact commands

```powershell
node --test tests\deduce.test.js tests\deduce-rules.test.js
if ($LASTEXITCODE -ne 0) { throw 'deduce tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases

`tests/deduce-rules.test.js` (new; imports as in `tests/deduce.test.js`; each model on a fresh
`createWorkspace(MAIN_WORKSPACE_BYTES)`):

| Case | Expected result |
|---|---|
| R3 places a piece in a pocket | B1, every listed field, and the first pose |
| R4 | B2 |
| R5 | B3 and B4 |
| R3 near-misses | K1 and K2: R3 is 0 and the other listed values hold |
| Soundness oracle | the oracle snippet on B1-B4, K1, K2, V1-V6 |
| Labelled pieces | K2 and V4 count the two dominoes as two pieces (S as DLX) |

`tests/deduce.test.js`: the re-pinned values only (V2, V3, N3, recipes).

## Definition of done & handoff

- Every criterion has its evidence; the quick set and the check pass; nothing outside the ownership list changed; no
  pinned value was changed except the listed ones.
- Handoff to MP04: where R7-R9 go in the ladder (after R6), the slot table, the component and knapsack helpers that
  R7 and R8 can reuse, and any deviation from this specification.

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

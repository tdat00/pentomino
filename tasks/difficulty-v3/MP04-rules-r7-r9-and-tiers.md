# MP04 — R7 parity, R8 neck, R9 pair exclusion, tier 3

| Header | Value |
|---|---|
| ID | MP04 |
| Depends on | MP03 (accepted and committed) |
| Estimated size | Medium–Large: about 600–900 changed lines (module about 350–450, tests about 250–350, documents about 40); about 40–60 minutes |
| Owner role | Engine |
| Milestone | M1 — deduction solver |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-07, RES-08, RES-10 (work units, memory), RES-11 (`tests/deduce-rules.test.js`), RES-32 row MP04; check-list §4.2 D4, D6, D8, D11, D14, D15, D16 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The last three deductions of the ladder, all tier 3 ("hard deductions"):

- **R7, parity.** Colour the board like a chessboard. Every placement covers a known number of dark and light cells,
  so a closed region with more dark than light cells can only be filled by pieces whose placements make up that
  imbalance. A region that no choice of pieces can balance is impossible; a placement that would leave a region
  impossible to balance is removed. This is the classic "mutilated chessboard" argument.
- **R8, neck.** A region joined to the rest only through one cell (an articulation cell): a placement over that cell
  cuts the free area into pieces, and if one of the resulting regions has a size that the remaining pieces cannot
  fill, the placement is impossible. R6 already tries narrow cells; R8 tries the wide necks.
- **R9, pair exclusion.** Two cells that only the same two pieces can reach, and no single placement covers both: the
  two pieces are needed there, so their placements elsewhere are impossible (the "hidden pair" of Sudoku).

With these, `deductionTier` can reach 3. After this task the solver is complete except the census (MP05). Nothing a
player or the Generator sees changes: no caller uses the solver yet.

## Scope

### In scope

- `core/engine/deduce.js`: R7, R8 and R9 after R6 in the ladder (never in the closure), their slots and the setup of
  the cell colours.
- `tests/deduce-rules.test.js`: the six new rule boards, the oracle on them, a second random oracle with
  parity-sensitive shapes.
- `tests/deduce.test.js`: the re-pinned values listed below (an intended contract change, check-list D8).
- `docs/design-detail.md` §7.9.

### Out of scope

- The census, `Gproved`, decisive G and info (MP05); the `tieOrder` diagnostic (MP06a); any caller; `DEDUCE`.
- The diagnostic `tier` (4 when G > 0): it belongs to the v3 metrics (MP09c), not to `DeductionResult`.
- Grouping pieces of the same shape: rules work on labelled pieces (RES-09).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Native ES modules, `// @ts-check`, JSDoc; pure, no RNG; none of the words `LIMITS`, `QUALIFICATION`,
  `enabledMaxActive`, `deriveLimits` in `deduce.js`; no test name containing `slow`.
- No allocation per row, node or trail entry: every buffer is a `deduce.*` slot of the workspace, listed in
  `slotTable` (RES-10).
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.
- Run only the commands of the test plan; never stage, commit, stash, reset, push or switch branches; never edit
  `tasks/difficulty-v3/` or the reports.

## Inputs & context

### What MP02a, MP02b and MP03 delivered

`core/engine/deduce.js` (read it first; the MP03 handoff in its Execution log names the helpers): `slotTable(R, C, NZ,
NP)` drives the memory precheck and the allocation; `select`, `kill`, `mark`, `undo`; rule steps return `NONE`,
`APPLIED` or `CONTRADICTION` and `ladder(counting)` calls them in order, restarting at R1 after any change, with the
work check at the start of every pass; the closure (R1, R2, the R3 check, never counted); `r3()` with the knapsack
bits `reach[s]` (bit 1: one remaining piece has size s; bit 2: two or more remaining pieces sum to s) and the
components (seeds in ascending cell column, `compFirst`, `compSize`); R3 place, R4, R5, R6; `cellIndex` (board index
of each cell column), `queue`, `seen` with its stamp counter, `mark`; the MRV search, the first-path snapshot
(`deductionTier` from the counts: 3 if `R7 + R8 + R9 > 0`, else 2 if `R4 + R5 + R6 > 0`, else 1 if `R1 + R2 + R3 > 0`,
else 0), the count, the statuses and the caps.

Model facts: cell columns `0 .. NC - 1` are the free cells; `model.cellColumn[y * width + x]` is the column of board
cell (x, y) or -1; free piece `p` has column `NC + p` and size `model.pieceSizes[p]`; the last entry of a row is its
piece column, the others are its cell columns; a row's cells are edge-connected.

### Work units (RES-10)

One unit per row-column incidence visited, per cell visited by a component or articulation search, per DP state
update and per trial. The work check stays where MP02a put it (start of every ladder pass, before every child node,
check-list D6); tests never pin an exact `work` value. A rule application that exceeds the cap simply finishes; the
next check stops the measurement with `work-cap` (an R7 dynamic programme may also stop early and then changes
nothing; see below).

### R7, parity (RES-07; check-list D14)

Setup, once per measurement after the existing setup:

```text
colour(c) = +1 when ((x + y) & 1) === 0 (dark), else -1, for the board cell (x, y) of cell column c
rowImb[r] = sum of colour(c) over the cell columns c of row r          // work += 1 per entry
pieceK[p] = |rowImb[r]| of any row r of piece p (0 when p has no row)
```

Rotations and reflections keep a shape's colouring and a translation by an odd step swaps it, so every row of piece
`p` has `rowImb` equal to `+pieceK[p]` or `-pieceK[p]`.

```text
r7(): returns CONTRADICTION or the number of rows killed (0 = no change)
  components of the uncovered cells, seeds ascending (as r3): compFirst[i], compSize[i],
    compImb[i] = sum of colour over the component, compOf[c] = i         // work += 1 per cell
  for i = 0 .. nComp - 1:                                               // pass 1: contradictions
    gather(i)
    if not reachable(cand, none, compSize[i], compImb[i]): return CONTRADICTION
  for i = 0 .. nComp - 1:                                               // pass 2: kills
    gather(i); A = sum of the candidates' sizes; slack = A - compSize[i]
    for each candidate j (ascending piece) and each option o of j:
      if slack === 0 and j has exactly one option: continue            // every candidate is needed: no kill possible
      if not reachable(cand, j, compSize[i] - size(j), compImb[i] - o): mark (j, o)
    kill every live row r of a marked (j, o) with compOf[first cell of r] === i and rowImb[r] === o
    if killed > 0: return killed                                       // the first component with a kill ends R7
  return 0

gather(i): the candidates of component i: for each uncovered piece p ascending, scan the rows of column NC + p
  (work += 1 per entry); a live row r is inside component i when compOf[rowCols[rowStart[r]]] === i (a row is
  connected and its cells are uncovered, so its first cell decides). Candidate p has the options
  { rowImb[r] : r live and inside i } (a subset of { -pieceK[p], +pieceK[p] }, or { 0 }). Pieces with no live row
  inside i are not candidates.

reachable(cand, skip, tArea, tImb): is there a set of candidates other than `skip`, each used at most once with one
  of its options, whose sizes add up to tArea and whose options add up to tImb?
  A = sum of sizes and K = sum of pieceK over the candidates other than skip
  if tArea < 0 or tArea > A or |tImb| > K: return false
  slack = A - tArea
  if tArea <= slack: mode = INCLUDED, D = tArea                         // track the area placed inside
  else:              mode = EXCLUDED, D = slack                         // track the area left outside
  W = 2 * K + 1; grid[a][d] for a = 0 .. D and d = 0 .. W - 1 (d stands for the imbalance d - K); all 0; grid[0][K] = 1
  for each candidate (size s, options O) other than skip, ascending:
    next = all 0; work += (D + 1) * W
    for every (a, d) with grid[a][d] = 1:
      INCLUDED: next[a][d] = 1                                          // the piece goes elsewhere
                for o in O: if a + s <= D: next[a + s][d + o] = 1       // the piece goes inside with option o
      EXCLUDED: if a + s <= D: next[a + s][d] = 1                       // the piece goes elsewhere
                for o in O: next[a][d + o] = 1                          // inside with option o
    grid = next
  return grid[D][K + tImb] === 1
```

- Both modes compute exactly the same answer; the orientation keeps the area dimension at `min(tArea, slack)`.
- Every check of pass 2 uses the candidates gathered before any kill of this application; the kill set does not
  depend on the order of the checks.
- Before each `reachable` call, if `work > limits.work`, R7 returns 0 (no change): a programme stopped by the cap
  proves nothing; the ladder's next check stops the measurement.
- Sound: the pieces that fill a component lie inside it (rows are connected), so the component's area and imbalance
  are a sum over some candidates, each placed once with one of its live options inside the component. R7 never uses
  intervals (they are allowed only as an over-approximation; the exact programme is required here).
- Pass 1 also catches an area that the candidates cannot fill (a component that only small pieces can enter).

### R8, neck (RES-07; check-list D15)

```text
r8(): returns the number of rows killed (0 = no change)
  components of the uncovered cells, seeds ascending (compOf, compSize), with the cells of component i listed
    contiguously (for example in the breadth-first order of `queue`)              // work += 1 per cell
  articulation cells: isArt[c] = 1 when removing c splits its component (iterative Tarjan low-link: a non-root c with
    a child v and low[v] >= disc[c]; a root with two or more children)           // work += 1 per cell visited and
                                                                                  // per neighbour examined
  for a = 0 .. NC - 1 with covered[a] = 0, isArt[a] = 1 and colCount[a] > limits.lookaheadWidth:
    killed = 0
    for each live row r of colRows[a], ascending (work += 1 per entry, + 1 per trial):
      p = rowPiece[r]
      reach' = the knapsack bits of r3 over the uncovered pieces other than p (top' = min(total - size(p), NC));
               computed once per distinct piece size per R8 application and reused
      bad = some component i other than compOf[a] has compSize[i] > top' or reach'[compSize[i]] === 0
      if not bad:
        stamp += 1; seen[c] = stamp for every cell column c of r                  // r's cells are removed
        for each cell c0 of component compOf[a] with seen[c0] !== stamp:
          breadth-first search from c0 over uncovered cells with seen !== stamp (stamping them); n = cells reached
          if n > top' or reach'[n] === 0: bad = true; stop
      if bad: kill(r); killed += 1
    if killed > 0: return killed                       // the first articulation cell with a kill ends R8
  return 0
```

- This is exactly "remove r's cells, compute the residual components, apply the R3 contradiction check with r's piece
  removed": the components other than `compOf[a]` do not change, only the pieces that must fill them do.
- Do **not** `select` the trial row: selection kills every crossing row and on a 20 x 18 board with 18-cell pieces
  costs tens of thousands of units per trial (the reference measured 172 million units for one rating with
  selection, 0.6 million without).
- R8 never reports a contradiction itself: a cell whose rows are all killed is found by R1 at the next pass.
- Cells with at most `lookaheadWidth` live rows are R6's; with `lookaheadWidth: 0` R8 tries every articulation cell.

### R9, pair exclusion (RES-07; check-list D16)

```text
r9(): returns the number of rows killed (0 = no change)
  for each uncovered cell column c: the distinct pieces of its live rows (stop at a third; work += 1 per entry);
    sup1[c] < sup2[c] when there are exactly two, else sup1[c] = -1
  L = the cells with exactly two supporting pieces, ascending
  for each a in L, for each b after a in L (work += 1 per pair):
    if (sup1[b], sup2[b]) !== (sup1[a], sup2[a]): continue
    if some live row of colRows[a] covers b: continue                  // work += 1 per entry scanned
    killed = 0
    for P in (sup1[a], sup2[a]), for each live row r of colRows[NC + P], ascending:
      if r covers neither a nor b: kill(r); killed += 1                // work += 1 per entry scanned
    if killed > 0: return killed                                       // the first pair with a kill ends R9
  return 0
```

- Sound: a and b must be covered, only P and Q can cover them, and no single placement covers both, so one of the two
  pieces covers a and the other covers b; a placement of P or Q that covers neither is impossible.
- Cells with one supporting piece never give a kill here: R5 runs first, so every live row of such a piece covers
  that cell, and any partner cell of the same piece then shares a row with it.
- Regression: board `###/###` with a domino D and the square O4: cells (0, 0) and (0, 1) are both covered by the
  vertical domino at x = 0, so they are **not** a pair; an implementation without the "covers both" test kills the
  square at x = 1, which belongs to a solution (DLX counts two solutions).

### The ladder after this task

```text
loop:
  work check
  R1 (cells)   -> select, R1 += 1, restart
  R2 (pieces)  -> select, R2 += 1, restart
  R3 check     -> CONTRADICTION
  R3 place     -> select, R3 += 1, restart
  R4           -> k kills: R4 += k, restart
  R5           -> k kills: R5 += k, restart
  R6           -> STOPPED, or k kills: R6 += k, restart
  R7           -> CONTRADICTION, or k kills: R7 += k, restart
  R8           -> k kills: R8 += k, restart
  R9           -> k kills: R9 += k, restart
  return FIXPOINT
closure (unchanged): R1, R2, R3 check
```

Counts are added only when the ladder counts. Tiers: R7, R8, R9 are tier 3; `deductionTier` is 3 when any of them is
nonzero on the final path (the snapshot already computes it).

### New slots (add them to `slotTable`; the memory precheck counts them)

`Tsz` is the sum of `model.pieceSizes` over the free pieces. In every `reachable` call D <= floor(Tsz / 2) and
K <= Tsz.

| Slot | Type | Length | Holds |
|---|---|---|---|
| `deduce.rowImb` | Int32 | R | colour imbalance of each row (setup) |
| `deduce.pieceK` | Int32 | NP | `pieceK[p]` (setup) |
| `deduce.compOf` | Int32 | NC | component of each uncovered cell (R7, R8) |
| `deduce.compImb` | Int32 | NC | imbalance of each component (R7) |
| `deduce.candPiece` | Int32 | NP | candidates of the current component (R7) |
| `deduce.candOpts` | Uint8 | NP | option bits of each candidate: 1 for `+pieceK` (or 0), 2 for `-pieceK` (R7) |
| `deduce.parity` | Uint8 | 2 * (floor(Tsz / 2) + 1) * (2 * Tsz + 1) | the two grids of `reachable` |
| `deduce.disc`, `deduce.low`, `deduce.dfsStack` | Int32 | NC each | articulation search (R8) |
| `deduce.dfsNext` | Uint8 | NC | next neighbour to examine, 0 to 4 (R8) |
| `deduce.isArt` | Uint8 | NC | articulation flags (R8) |
| `deduce.reachMinus` | Uint8 | NP * (NC + 1) | knapsack bits without one piece of a given size (R8) |
| `deduce.minusRow` | Int32 | NP | row of `reachMinus` for each piece, -1 when not computed in this application (R8) |
| `deduce.sup1`, `deduce.sup2`, `deduce.pairCells` | Int32 | NC each | supports and the list L (R9) |

The names may differ if the handoff of MP03 shows an existing slot that can be shared (for example `compFirst` and
`compSize` from MP03); every buffer stays in the slot table. On a 26 x 26 board the parity slot is under 1 MB.

### Re-pinned values in `tests/deduce.test.js` (intended contract change, check-list D8)

Every value not listed stays as MP03 pinned it (V1, V2, V4, V5, V6, V7, the node and stop values of C1-C10 with C3's
`first` equal to V2's, N1, N2, N4, N5, the recipes very-easy, easy and normal).

| # | MP03 value | MP04 value |
|---|---|---|
| V3 (`rect(10, 1)`; M, D, I3, I4) | R4 3, R6 2 (E 2), tier 2 | R4 1, R6 3 (E 3), R7 3, R8 6, R9 0, tier 3; F 1 (R1 1), G 3, choices `[4, 3, 2]`, many, Gt 7, nodes 15 unchanged |
| N3 (V3 with `lookaheadWidth: 0`) | R4 3, E 0, tier 2 | R4 1, R7 3, R8 9, E 0, tier 3; the rest unchanged (V2 with `lookaheadWidth: 0` unchanged: R4 1, E 0, tier 2) |
| C7-C10 | first paths with V3's MP03 rule counts | the same node, stop and count values; any `first` compared with V3 uses V3's MP04 counts |

Recipes (12 classic pentominoes on `RECIPE_BOARD_ROWS`, clues from `recipeWitness()`), all complete, S 1, unique,
exhausted; R2, R3 and R9 are 0 in every recipe:

| Recipe | U | F (R1) | R4 | R5 | E (R6) | R7 | R8 | tier | G | choices | info (4 decimals) | Cmax | Dmax | Gt | nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|
| very-easy | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| easy | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| normal | 5 | 5 | 9 | 0 | 0 | 0 | 0 | 2 | 0 | `[]` | 0 | 0 | 0 | 0 | 1 |
| hard | 7 | 5 | 19 | 0 | 2 | 0 | 58 | 3 | 2 | `[2, 5]` | 3.3219 | 5 | 2 | 2 | 8 |
| expert | 8 | 5 | 9 | 0 | 8 | 5 | 101 | 3 | 3 | `[2, 6, 2]` | 4.5850 | 6 | 4 | 5 | 18 |
| master | 10 | 6 | 0 | 45 | 12 | 0 | 152 | 3 | 4 | `[4, 2, 7, 2]` | 6.8074 | 7 | 3 | 37 | 145 |

As before, this table characterises the ladder version and is not a monotonicity theorem.

### Rule boards (verified with the reference implementation)

Pieces as in MP02a and MP03 (`pc(id, cells)`: M, D, I3, L3, I4, O4, T4), plus
`S4 = pc('S4', [[1, 0], [2, 0], [0, 1], [1, 1]])`, `L4 = pc('L4', [[0, 0], [1, 0], [2, 0], [0, 1]])`,
`T4b = pc('T4b', [[0, 0], [1, 0], [2, 0], [1, 1]])` (a second piece of T4's shape, a direct input with twins as RES-09
allows in engine tests) and `P`, `T`, `L`, `Y`, `U` from `CLASSIC_PENTOMINOES`. No clues. Rule counts not listed are 0.

| # | Board, pieces | DLX count | Expected with this task's ladder | For comparison (MP03 ladder, not pinned) |
|---|---|---:|---|---|
| P7 R7 contradiction | `boardFromRows(['.###', '####', '####', '###.'])`; D, O4, L4, S4 (a 4 x 4 board without two opposite dark corners: 6 dark, 8 light cells; every piece covers as many dark as light cells) | 0 | none, exhausted; Gt 0, nodes 1: R7 proves it at the root | none, Gt 1, nodes 8 |
| N7 R7 negative | `boardFromRows(['###.###', '.#...#.'])`; T4, T4b (two separated T-shaped regions with imbalance +2 each; either piece can fill either) | 2 | few, S 2, exhausted; Gt 1, nodes 3; F 1 (R1 1), R7 0, tier 1; G 1, choices `[2]`: summing both candidates as mandatory in one region would wrongly reject it | the same |
| P8 R8 | `boardFromRows(['####', '####', '...#', '####', '####', '####'])`; T, L, Y, P, M (an hourglass: the neck cell (3, 2) is an articulation cell with more than 4 live rows) | 1 | unique, exhausted; Gt 1, nodes 5; F 4 (R1 2, R2 2), R4 4, E 6 (R6 6), R8 35, R7 0, R9 0, tier 3; G 1, choices `[4]`, info 2, Cmax 4, Dmax 0 | unique; Gt 3, nodes 17; G 1, choices `[9]` |
| N8 R8 negative | `boardFromRows(['####', '####', '.#.#', '####', '####', '####'])`; T, L, Y, P, D (the two halves are joined in two places: no neck) | 4 | few, S 4, exhausted; Gt 4, nodes 26; F 4 (R1 4), R5 21, E 3 (R6 3), R7 0, R8 0, R9 0, tier 2; G 1, choices `[13]`, info 3.7004 | the same first path; Gt 6, nodes 36 |
| P9 R9 | `rect(4, 3)`; P, D, U | 4 | few, S 4, exhausted; Gt 2, nodes 15; F 2 (R1 2), R4 8, R9 8, R7 0, R8 0, E 0, tier 3; G 1, choices `[12]`, info 3.5850, Cmax 12, Dmax 0 | Gt 3, nodes 20; G 2, choices `[12, 5]` |
| K9 R9 regression | `rect(3, 2)`; D, O4 | 2 | few, S 2, exhausted; Gt 1, nodes 3; F 1 (R1 1), R4 5, R9 0, tier 2; G 1, choices `[2]` | the same |

B1-B4, K1 and K2 of MP03 keep their MP03 values with this ladder (re-run them; nothing to re-pin).

### The oracles

- The oracle snippet of MP03 (count with `{ ...DEDUCE, solutions: Math.max(2, expected + 1) }` and
  `{ verifyUndo: true }` equals the DLX count, search exhausted) runs on P7, N7, P8, N8, P9, K9 as well as on B1-B4,
  K1, K2 and V1-V6.
- The random oracle of `tests/deduce.test.js` (seed `'deduce-oracle'`) stays unchanged and passes with the full ladder
  (reference: 274 boards; R7, R8 and R9 nonzero on 9, 10 and 2 final paths).
- New in `tests/deduce-rules.test.js`, a **parity-sensitive random oracle**: the same generator and order of `rng`
  calls as the MP02a oracle, with `rng = createRng('deduce-oracle-parity')`, 300 trials,
  `SHAPES_PARITY = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]]` (monomino, domino, L-tromino, T-tetromino, X-pentomino),
  `1 + rng.int(5)` pieces, `w = 3 + rng.int(3)`, `h = 3 + rng.int(3)`; everything else as in MP02a (skip when the
  area exceeds `w * h`, block random cells, one clue when `rng.int(2) === 0` and it fits, one shared workspace).
  Assert, for every board, the count, `exhausted` and `verifyUndo`; and that the sample is not weak: at least 200
  boards, 40 with a solution, 20 with two or more, 15 with a clue, and R7, R8 and R9 nonzero on at least 10, 10 and 2
  final paths. Reference: 257 boards, 58 with a solution, 36 with two or more, 24 with a clue, 88 repeating a shape;
  R7, R8, R9 nonzero on 18, 17 and 4 final paths.

### Cost (reference measurements, not pinned)

Total work per rating with the full ladder, reference implementation: master recipe 3.8 million units; three unique
20 x 18 master and three nightmare puzzles at most 16.6 million (R7 at most 0.5, R8 at most 0.9, R9 at most 0.2
million; R6 up to 6 million); four unique 26 x 26 master and nightmare puzzles at most 8.6 million. `DEDUCE.work` is
50 million until MP06b measures it. Report a rating of the recipes or the boards above that exceeds 20 million units
as a finding.

## Files to create/modify

### Exclusive ownership

- `core/engine/deduce.js`.
- `tests/deduce-rules.test.js`.
- `tests/deduce.test.js` (the re-pinned values of this task only).

### Documentation slot

`docs/design-detail.md` §7.9: add R7, R8 and R9 to the rule table (conditions, tier 3, counts as killed rows, R7
contradiction not counted), the colouring and `pieceK`, the oriented exact programme of R7, R8's trial without
selection, R9's two-piece supports and the "covers both" test, the ladder order R1 to R9, `deductionTier` up to 3, the
new slots. No other document changes.

## Implementation steps

1. Add the slots to `slotTable` (with the `Tsz` formula for `deduce.parity`); compute `rowImb` and `pieceK` at setup.
2. Implement `r7()` with `gather` and `reachable`; add it after R6 in the ladder.
3. Implement the articulation search and `r8()`; add it after R7.
4. Implement `r9()`; add it after R8.
5. Re-pin the listed values in `tests/deduce.test.js`; add the boards, the oracle cases and the parity oracle to
   `tests/deduce-rules.test.js`.
6. Update design §7.9; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP04-B01 | A board that the chessboard colouring makes impossible is proved impossible without a guess, and two separated regions that either of two pieces can fill are not rejected | P7, N7 |
| MP04-B02 | A placement over a neck that would cut off a region the remaining pieces cannot fill is removed; a narrow passage that is not a neck removes nothing | P8, N8 |
| MP04-B03 | Two cells that only the same two pieces can reach remove those pieces' other placements, but only when no single placement covers both cells | P9, K9 |
| MP04-B04 | No rule ever removes a placement of any solution, on rectangular, masked, clued, parity-sensitive and repeated-shape boards | the oracles |
| MP04-B05 | Nothing a player or the Generator sees changes: no caller uses the solver yet and every existing test passes | `npm run test:quick` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP04-T01 | The ladder order is R1, R2, R3 check, R3 place, R4, R5, R6, R7, R8, R9; the closure is unchanged; R7-R9 are counted only by the counting ladder; `deductionTier` is 3 exactly when R7 + R8 + R9 > 0 on the final path | review; `deduce-rules` tests |
| MP04-T02 | R7 is the exact programme above (both orientations, no interval shortcut that changes an answer); its checks use the candidates gathered before any kill; it returns no change when the work cap is exceeded before a programme | review; P7, N7 |
| MP04-T03 | R8 tries only articulation cells with more than `lookaheadWidth` live rows, without selecting the trial row; R9 uses cells with exactly two supporting pieces and the "covers both" test | review; P8, N8, P9, K9 |
| MP04-T04 | P7, N7, P8, N8, P9 and K9 reproduce exactly; B1-B4, K1 and K2 keep their MP03 values | `deduce-rules` tests |
| MP04-T05 | The oracles pass: the snippet on every rule board and V1-V6; the unchanged random oracle; the new parity oracle with the listed minimums | `deduce`, `deduce-rules` tests |
| MP04-T06 | The re-pinned V3, N3 and recipe values reproduce; every other pinned value is unchanged | `deduce` tests |
| MP04-T07 | Every new buffer is a slot in `slotTable`; the buffer-accounting and memory-limit tests pass unchanged; `verifyUndo` finds no mismatch | `deduce` tests |
| MP04-T08 | Design §7.9 updated; `npm run test:quick` and `npm run check` pass; CRLF; no file outside the ownership list changed | command output; review |

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

`tests/deduce-rules.test.js` (each model on a fresh `createWorkspace(MAIN_WORKSPACE_BYTES)`, except the shared one of
each random oracle):

| Case | Expected result |
|---|---|
| R7 proves a parity contradiction at the root | P7 |
| R7 keeps two separated regions | N7 |
| R8 removes neck placements | P8, every listed field |
| R8 without a neck | N8 |
| R9 pair exclusion | P9 |
| R9 needs the "covers both" test | K9 (and the oracle on it) |
| MP03 boards unchanged | B1-B4, K1, K2 with their MP03 values |
| Soundness oracle | the snippet on P7, N7, P8, N8, P9, K9, B1-B4, K1, K2, V1-V6 |
| Parity random oracle | 300 trials of `'deduce-oracle-parity'`, every board, and the minimums |

`tests/deduce.test.js`: the re-pinned values only (V3, N3, C7-C10 comparisons with V3, recipes).

## Definition of done & handoff

- Every criterion has its evidence; the quick set and the check pass; nothing outside the ownership list changed; no
  pinned value was changed except the listed ones.
- The reply gives the work totals of the six recipes with the full ladder (from a throw-away script under
  `tests/artifacts/MP04/`, deleted afterwards or left there; it is git-ignored).
- Handoff to MP05: where the ladder and the search keep the per-node state that the census needs (the guess node's
  alternatives in `alt`, `altBase`, `guessC`), how a sub-search could be run from a node with the same ladder, and any
  deviation from this specification.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP04: R7 parity, R8 neck, R9 pair exclusion, tier 3`) |
| Start | 2026-11-12 13:39 (+07:00) |
| End | 2026-11-12 13:59 developer; 14:04 orchestrator review and commit |
| Duration | 20 min developer (1,190 s); about 5 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 82 model calls; 15,193,800 input tokens (14,930,578 cache reads); 141,039 output tokens |
| AI credits | about 356 (developer) |
| Verification | Developer: `node --test tests\deduce.test.js tests\deduce-rules.test.js` 31/31 (2.05 s); `npm run test:quick` 1,148/1,148 (16.7 s); `npm run check` OK; `git diff --check` clean; scratch runs (deleted) of an instrumented engine on about 14,000 more random boards at widths 4 and 0 and on 26 x 25, 20 x 18, 26 x 26 stress boards: no DLX mismatch, no `parity` slot overflow; recipe work with the full ladder: 500 / 567 / 2,539 / 109,787 / 392,463 / 3,976,231. Orchestrator re-run: targeted 31/31, `npm run test:quick` 1,148/1,148 (17 s), `npm run check` OK |
| Acceptance | MP04-B01..B05 and MP04-T01..T08 met; every task vector reproduced (P7, N7, P8, N8, P9, K9; parity oracle 257 boards, 58/36/24 solvable/multiple/clued, R7/R8/R9 on 18/17/4 paths, equal to the reference). Diff reviewed: R7, R8, R9 after R6 in the counting ladder only, 18 new buffers all in `slotTable`, `deductionTier` 3 exactly when R7 + R8 + R9 > 0 |
| Issues & resolutions | (1) The task text predates MP03's code: `slotTable` is now `(R, C, NZ, NP, NC, Tsz)`, R3 place is a separate `ruleR3Place`, and since R6's closure overwrites the R3 pocket records, R7 and R8 relabel pockets themselves (`labelPockets`). (2) The test "R7-R9 have no counts yet" was necessarily replaced by "F counts R1-R3, E counts R6 and the tier is the highest tier with a count"; V3's 15 nodes and C1-C10 unchanged. (3) Added board X7 (`['..#.##','###.##','###.##']`, T4, I3, D, L3, M: R6 4, R7 2, DLX 4) and a stepped work-cap test with `verifyUndo`; X7's rule counts come from this implementation, cross-checked by the DLX count only: **open item for the analyst cross-review: confirm X7 with the reference implementation**. (4) Mutation sweep: 24 mutants, 21 killed; two equivalent (`r8-width-check-dropped`, `r7-mode-excluded-bug`); `r8-no-other-pockets-minus` survives: R8's "other pockets" condition is implemented as specified but no board pins it (it needs a consistent board with at least 3 pockets): **open item: a pinning board, to be supplied by the analyst**. (5) Decisions accepted: R7 kill marks in bits 4 and 8 of `candOpts`; `compFirst`/`compSize` reused; R8 uses `queue` for pocket cells and `dfsStack` for trial floods; R8 charges `+pockets` work per trial |
| Handoff | Per node, `branch()` writes the alternatives into `alt[altBase[depth] .. altBase[depth + 1])` and sets `guessC[depth]`, `guessPlaced[depth]`, `depth`. A sub-search from a node: `mark()`, `select(alt[i])`, a ladder with `counting = false`, `undo(m)`; `search()` hard-codes `ladder(true)` and the shared `work` counter, so the census needs its own search/ladder entry and its own work budget (the ladder checks `work > limits.work`). R7-R9 scratch is rewritten before it is read (no undo needed). `deductionTier` is 3 exactly when R7 + R8 + R9 > 0 on the final path; the diagnostic tier 4 is not added |

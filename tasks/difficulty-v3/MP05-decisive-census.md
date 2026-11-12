# MP05 — Decisive census, the upper estimate and `Gproved`

| Header | Value |
|---|---|
| ID | MP05 |
| Depends on | MP04 (accepted and committed) |
| Estimated size | Medium–Large: about 500–800 changed lines (module about 200–300, tests about 250–400, documents about 40); about 40–60 minutes |
| Owner role | Engine |
| Milestone | M2 — decisive guesses |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-03 ("Count"), RES-04 (result shape, metric domain, `Dmax`), RES-05 (census), RES-10 (census budget, totals), RES-11 (`tests/deduce-census.test.js`), RES-35 (`Gproved`, MP05 part), RES-32 row MP05; clarifications SA1-Q-P1 (B), AR1; check-list §4.2 D3, D5, D8, D11, D13, D17 (traceability only) |
| Implementation status | Not started |

## Goal & business context

The owner decided that a guess counts only when it is **decisive**: a choice point where at least one alternative
fails. Choosing freely between alternatives that all lead to a solution is not a difficulty (SA1-Q-P1, branch B).
This task adds the **census**: for every guess node on the path to the first solution, how many alternatives are
proved solvable, proved impossible or still undecided. The rating's G, info, Cmax and Dmax then count only the
decisive nodes. When the census cannot finish within its work budget, the values are a labelled **upper estimate**
(an undecided alternative is treated as failing), and the result says so.

The task also adds `Gproved`, the number of guess nodes with an alternative **proved** impossible (AR1, owner). The
Generator will later refuse a Hard-or-above candidate with `Gproved = 0` (MP09c); this task delivers the metric.
`Gproved` is not a score input.

Nothing a player or the Generator sees changes: no caller uses the solver yet.

## Scope

### In scope

- `core/engine/deduce.js`: the census after the count, the decisive values in `first`, `first.Gproved`,
  `first.census`, `result.census`, the census budget, the census nodes and work in the totals, typedefs.
- New `tests/deduce-census.test.js`.
- `tests/deduce.test.js` and `tests/deduce-rules.test.js`: the re-pinned values listed below (an intended contract
  change, check-list D8).
- `docs/design-detail.md` §7.9.

### Out of scope

- `DEDUCE` values (MP06b measures and may raise `census`); the probe tool and `tieOrder` (MP06a).
- The `censored` flag, `MetricsV3`, the acceptance rule for Hard targets (MP09b, MP09c); the estimate note in the
  apps (MP10b).
- Any caller; any rule change.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Native ES modules, `// @ts-check`, JSDoc; pure, no RNG; none of the words `LIMITS`, `QUALIFICATION`,
  `enabledMaxActive`, `deriveLimits` in `deduce.js`; no test name containing `slow`.
- Every buffer is a `deduce.*` slot listed in `slotTable`; no allocation per row, node or trail entry.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.
- Run only the commands of the test plan; never stage, commit, stash, reset, push or switch branches; never edit
  `tasks/difficulty-v3/` or the reports.

## Inputs & context

### What exists (read `core/engine/deduce.js` first)

`measureDeduction(model, limits = DEDUCE, diagnostics = {})` with the full ladder R1-R9 (MP04). `search()` runs the
ladder at a node and calls `branch()` at a fixpoint; `branch()` takes the MRV column, stores its live rows in
`alt[altBase[depth] .. altBase[depth + 1] - 1]` (ascending row index), records `guessC[depth]` (c) and
`guessPlaced[depth]` (rows selected before the node), and tries the alternatives in order, each as a child node
(node cap, then `nodes += 1`, then the work check, then `mark`, `select`, `search`, `undo`). At the first solution
`snapshot()` builds `first` from the rule counters, `guessC`, `guessPlaced` and `picked`. The search then continues
(the **count**) until `limits.solutions` solutions, exhaustion or a cap. `DEDUCE.census` is 10,000,000 (MP02a,
check-list D13); `limits.census` is validated (integer >= 0 or Infinity) and unused so far.

### Result shape after this task (RES-04)

```text
DeductionResult = {
  path:   'complete' | 'capped' | 'none',
  first:  FirstPath | null,          // non-null iff path === 'complete'
  search: { Gt, nodes, work, stop: 'exhausted' | 'solution-limit' | 'node-cap' | 'work-cap' },
  count:  { S, limit, exhausted, solutions: 'unique' | 'few' | 'many' | 'unknown' | 'none' },
  census: { complete, undecided, nodes, work } | null    // non-null iff path === 'complete'
}
FirstPath  = { F, E, rules: { R1, R2, R3, R4, R5, R6, R7, R8, R9 }, deductionTier: 0 | 1 | 2 | 3,
               G, Gproved, info, Cmax, Dmax, choices: number[], rows: number[], census: CensusNode[] }
CensusNode = { c, kLow, f, u }       // one per guess node of the final path, aligned with choices
```

- `choices` stays **raw**: the c of every final-path guess node, root first. `census[i]` belongs to `choices[i]`.
- `kLow + f + u = c`: kLow alternatives proved solvable (at least 1, the path's own), f proved impossible (subtree
  exhausted without a solution), u undecided.
- A node is **counted** iff `kLow < c`. With u = 0 that means f >= 1; with u > 0 an undecided alternative is treated
  as failing.
- `G` = number of counted nodes; `info` = sum of `log2(c / kLow)` over the counted nodes, in path order; `Cmax` = the
  largest c of a counted node; `Dmax` = `guessPlaced` of the **deepest counted** node (the pieces placed before it,
  clues excluded); all four are 0 when no node is counted (the metric domain: G = 0 implies info = Cmax = Dmax = 0).
- `Gproved` = number of final-path guess nodes with f >= 1. `Gproved <= G`; with a complete census `Gproved = G`.
- `result.census = { complete: (sum of u) === 0, undecided: sum of u, nodes, work }`, where `nodes` and `work` are
  the census's share (below).
- `count` (S, limit, exhausted, solutions), `search.stop`, `search.Gt`, F, E, `rules`, `deductionTier` and `rows`
  never change because of the census.

### The census (RES-05; check-list D17)

Sources, cheapest first:

1. **Before the path's own alternative**: at a final-path node, every alternative tried before the path's own was
   exhausted without a solution (otherwise the first solution would lie there): f.
2. **The count continuation**: after the first solution the search returns into the final-path nodes and tries their
   later alternatives. For such an alternative: a solution found in its subtree: kLow; its subtree exhausted without a
   solution: f; the count stopped inside it (solution limit or a cap) without a solution there: u. Alternatives the
   count never reached stay u.
3. **Existence probes** for every alternative still undecided, nodes in path order (root first), alternatives in
   canonical (ascending row) order, under the census budget `limits.census`.

```text
at the first solution (S becomes 1), besides the snapshot:
  finalDepth = depth; finalOpen = depth
  for d = 0 .. depth - 1: copy alt[altBase[d] .. altBase[d + 1] - 1] to pathAlt (pathAltBase[d] .. ), pathOwn[d] = the
    index of the alternative being tried at depth d, pathPlaced[d] = guessPlaced[d];
    status[i] = FAILED for i < own, SOLVABLE for i = own, UNDECIDED for i > own

in branch() at depth d (the depth before the increment), after the child of alternative i returns:
  if first !== null and d < finalOpen and i > pathOwn[d]:
    status = SOLVABLE if S grew during the child, else UNDECIDED if the child returned STOP, else FAILED
at the end of branch() at depth d: if d < finalOpen: finalOpen = d     // this final-path node is done

after search() returns, when path === 'complete' (also after a node or work cap stopped the count):
  censusStart = work; censusLimit = censusStart + limits.census; censusNodes = 0; stopped = false
  if some status is UNDECIDED:
    m0 = mark()
    run the ladder (not counting) at the root, with the census check          // the replay of the final path
    for d = 0 .. finalDepth - 1, while not stopped:
      for each alternative i of node d, ascending, with status UNDECIDED, while not stopped:
        if work > censusLimit: stopped = true; break
        censusNodes += 1; m = mark(); select(pathAlt[pathAltBase[d] + i]); out = probe(); undo(m)
        status = SOLVABLE when out === FOUND, FAILED when out === NONE; STOPPED leaves it UNDECIDED (and stopped = true)
      if not stopped: select(the path's own alternative of node d); run the ladder (not counting, census check)
    undo(m0)
  compute the CensusNode of each final-path node, G, info, Cmax, Dmax and Gproved from the statuses; replace the raw
    values of `first`; result.census = { complete, undecided, nodes: censusNodes, work: work - censusStart }

probe(): FOUND, NONE or STOPPED; the existence search, stopping at its first solution
  run the ladder (not counting, census check): STOPPED -> STOPPED (stopped = true); CONTRADICTION -> NONE
  no uncovered column -> FOUND
  the MRV column and its live rows, ascending (in `alt` from the current depth on; the main search is finished)
  for each alternative: if work > censusLimit: stopped = true, return STOPPED
                        censusNodes += 1; mark, select, out = probe(), undo; if out !== NONE: return out
  return NONE
```

- **Census check**: while the census runs, the ladder's work check compares `work` with `censusLimit` instead of
  `limits.work`, and exceeding it stops the census (`stopped`), never the measurement: `search.stop` keeps the value
  of the main search. The R6 closure uses the same check.
- **The census needs no replay when nothing is undecided** (for example a unique puzzle whose count was exhausted):
  then `census.nodes` and `census.work` are 0 and the values equal the raw ones at no extra cost.
- `limits.nodes` and `limits.work` cap only the main search; `limits.census` caps the census (replay and probes). A
  count stopped by a cap does not stop the census.
- **Totals** (check-list D17): `search.nodes` = the main search's nodes + `census.nodes`; `search.work` includes
  `census.work`; `search.Gt` counts the main search's guess nodes only. The node cap of D5 bounds the main search's
  nodes (`search.nodes - census.nodes <= limits.nodes`).
- The replay reaches the same states as the main search did (the ladder is deterministic); the probes count no rules
  and change neither `first` nor S.
- With `limits.census: 0` no probe runs (the census stops at its first check), so u keeps the value left by sources
  1 and 2: a deterministic "budget cut" for tests.

### New slots (add them to `slotTable`)

| Slot | Type | Length | Holds |
|---|---|---|---|
| `deduce.altAt` | Int32 | NP + 2 | index of the alternative being tried at each depth |
| `deduce.pathAlt` | Int32 | R | alternatives of the final-path nodes (disjoint, at most R in total) |
| `deduce.pathAltBase` | Int32 | NP + 2 | start of each final-path node's alternatives |
| `deduce.pathOwn` | Int32 | NP + 2 | index of the path's own alternative |
| `deduce.pathPlaced` | Int32 | NP + 2 | `guessPlaced` of each final-path node |
| `deduce.status` | Uint8 | R | status of each final-path alternative (0 undecided, 1 failed, 2 solvable) |

### Re-pinned values (intended contract change, check-list D8)

The census replaces the raw G, info, Cmax and Dmax by the decisive ones (check-list D3 ends here); `choices` stays
raw. `first.Gproved` and `first.census` appear; `result.census` is non-null on every complete path. `census.work`
is pinned only as 0 or "> 0". Rule counts, F, E, `deductionTier`, `rows`, `count`, `search.stop` and `search.Gt` are
unchanged everywhere.

`tests/deduce.test.js` (every other value as MP04 pinned it; `census` null on V5, V6, C1, C2, C5, C6):

| # | MP04 value | MP05 value |
|---|---|---|
| V1, V7 | G 0 | unchanged; Gproved 0, `first.census` `[]`, `census` `{ complete: true, undecided: 0, nodes: 0, work: 0 }` |
| V2 (and C4, N3 with V2) | G 1, info 1, Cmax 2 | G 0, info 0, Cmax 0, Dmax 0, Gproved 0; choices `[2]`; `first.census` `[{ c: 2, kLow: 2, f: 0, u: 0 }]`; census complete, nodes 0, work 0; nodes 3 |
| V3 | G 3, info 4.5850, Cmax 4, Dmax 2; nodes 15 | G 0, info 0, Cmax 0, Dmax 0, Gproved 0; choices `[4, 3, 2]`; `first.census` `[{ c: 4, kLow: 4, f: 0, u: 0 }, { c: 3, kLow: 3, f: 0, u: 0 }, { c: 2, kLow: 2, f: 0, u: 0 }]`; census complete, nodes 6, work > 0; **nodes 21**; Gt 7 |
| N3 (V3 with `lookaheadWidth: 0`) | G 3; nodes 15 | the same census as V3; G 0; nodes 21 |
| V4 | G 1, info 2, Cmax 4 | G 0, info 0, Cmax 0; `first.census` `[{ c: 4, kLow: 4, f: 0, u: 0 }]`; census nodes 0; nodes 5 |
| C3 (V2, `nodes: 2`) | nodes 2; `first` equal to V2's | **nodes 3** (2 + 1 probe); census complete, nodes 1, work > 0; `first` equal to V2's MP05 `first`; stop `node-cap`, S 1, `unknown` |
| C7 (V3, `nodes: 4`) | nodes 4 | **nodes 18** (4 + 14); census complete, nodes 14; G 0; stop `node-cap`, S 1, `unknown` |
| C8 (V3, `nodes: 5`) | nodes 5 | **nodes 18** (5 + 13); census complete, nodes 13; G 0; S 2, `few`, `node-cap` |
| C9 (V3, `solutions: 2`) | nodes 5 | **nodes 18** (5 + 13); census complete, nodes 13; G 0; S 2, `many` |
| C10 (V3, `solutions: 30`) | nodes 41 | nodes 41; census complete, nodes 0, work 0; G 0 |
| Recipes | G, info, Cmax, Dmax of MP04 | unchanged (unique, count exhausted: no probe); Gproved = G; `first.census`: hard `[[2, 1, 1, 0], [5, 1, 4, 0]]`, expert `[[2, 1, 1, 0], [6, 1, 5, 0], [2, 1, 1, 0]]`, master `[[4, 1, 3, 0], [2, 1, 1, 0], [7, 1, 6, 0], [2, 1, 1, 0]]` (as `[c, kLow, f, u]`), `[]` for the others; census nodes 0, work 0 |

`tests/deduce-rules.test.js` (rule counts, nodes and statuses unchanged; census nodes 0 and work 0 on every board):

| # | MP04 value | MP05 value |
|---|---|---|
| B1 | G 1, info 1, Cmax 2, Dmax 1 | G 0, info 0, Cmax 0, Dmax 0, Gproved 0; census `[[2, 2, 0, 0]]` |
| B2, B3, N7, K9 | G 1, info 1, Cmax 2 | G 0, info 0, Cmax 0, Gproved 0; census `[[2, 2, 0, 0]]` |
| B4 | G 0 | unchanged; census `[]` |
| K1, K2 | G 2, info 3, Cmax 4, Dmax 1 | G 0, info 0, Cmax 0, Dmax 0, Gproved 0; census `[[2, 2, 0, 0], [4, 4, 0, 0]]` |
| P8 | G 1, info 2, Cmax 4 | unchanged; Gproved 1; census `[[4, 1, 3, 0]]` |
| N8 | G 1, info 3.7004, Cmax 13 | G 1, info 2.7004 (log2 13/2), Cmax 13, Dmax 0, Gproved 1; census `[[13, 2, 11, 0]]` |
| P9 | G 1, info 3.5850, Cmax 12 | G 1, info 2 (log2 12/3), Cmax 12, Dmax 0, Gproved 1; census `[[12, 3, 9, 0]]` |
| P7 | none | `census` null |

### Census fixtures (verified with the reference implementation)

Pieces as in MP02a, MP03 and MP04 (`pc(id, cells)`; M, D, I3, L3, I4, T4, S4, L4) and `F` from
`CLASSIC_PENTOMINOES`. No clues. `[c, kLow, f, u]` per node.

| # | Board, pieces, limits | Expected |
|---|---|---|
| CF1 budget cut | `rect(4, 3)`; F, M, L4, D; `{ ...DEDUCE, census: 0 }` | S 8, `many`, `solution-limit`; Gt 6, nodes 19; choices `[11, 6]`; census nodes `[[11, 4, 0, 7], [6, 2, 4, 0]]`; G 2, Gproved 1, info 3.0444 (log2 11/4 + log2 6/2), Cmax 11, Dmax 1; `census` `{ complete: false, undecided: 7, nodes: 0 }`, work > 0 |
| CF1 complete | the same with `DEDUCE` (and with `census: Infinity`) | the same count and Gt; **nodes 32**; census nodes `[[11, 8, 3, 0], [6, 2, 4, 0]]`; G 2, Gproved 2, info 2.0444 (log2 11/8 + log2 3), Cmax 11, Dmax 1; `census` `{ complete: true, undecided: 0, nodes: 13 }`. Raw: G 2, info 6.0444 (log2 11 + log2 6) |
| CF2 free node | `boardFromRows(['####', '.###', '####'])`; I3, T4, L3, M; `DEDUCE` | S 8, `many`; Gt 6, nodes 18; choices `[4, 3]`; census `[[4, 4, 0, 0], [3, 2, 1, 0]]`: the root is free and not counted; G 1, Gproved 1, info 0.5850 (log2 3/2), Cmax 3, Dmax 1; census nodes 3. With `census: 0`: `[[4, 3, 0, 1], [3, 2, 1, 0]]`, G 2, Gproved 1, info 1, Cmax 4, Dmax 1, undecided 1, nodes 15 |
| CF3 Dmax | `boardFromRows(['###.##', '######', '######'])`; I4, D, L4, L3, S4; `DEDUCE` | S 8, `many`; Gt 4, nodes 22; choices `[6, 3, 4]`; census `[[6, 3, 3, 0], [3, 3, 0, 0], [4, 4, 0, 0]]`; G 1, Gproved 1, info 1, Cmax 6, **Dmax 0** (only the root is counted; raw Dmax 3); census nodes 7. With `census: 0`: `[[6, 1, 3, 2], [3, 2, 0, 1], [4, 4, 0, 0]]`, G 2, Gproved 1, info 3.1699, Cmax 6, Dmax 1, undecided 3, nodes 15 |
| V3 budget cut | V3 with `census: 0` | census `[[4, 2, 0, 2], [3, 3, 0, 0], [2, 2, 0, 0]]`; G 1, Gproved 0, info 1, Cmax 4, Dmax 0; undecided 2, nodes 15. Decisive (default budget): G 0; raw: G 3, info 4.5850 |

## Files to create/modify

### Exclusive ownership

- `core/engine/deduce.js`.
- `tests/deduce-census.test.js` (new).
- `tests/deduce.test.js` and `tests/deduce-rules.test.js` (the re-pinned values of this task only).

### Documentation slot

`docs/design-detail.md` §7.9: the census (the three sources, the statuses, the budget and the census check, the
replay), counted nodes, the decisive G, info, Cmax and Dmax, `Gproved` (AR1: not a score input; it gates generated
Hard-or-above puzzles from MP09c on), the upper estimate when the census is incomplete, `result.census`, the totals
(D17), the new slots. No other document changes.

## Implementation steps

1. Add the slots; extend the typedefs (`FirstPath.Gproved`, `DeductionResult.census`).
2. At the snapshot, save the final path's nodes and initial statuses; in `branch()`, record the continuation's
   outcomes for the final-path nodes.
3. Implement the census check in the ladder, the replay and `probe()`; compute the decisive values and
   `result.census`; add the census nodes to `search.nodes`.
4. Re-pin the listed values; write `tests/deduce-census.test.js`.
5. Update design §7.9; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP05-B01 | A free choice between alternatives that all solve the puzzle is not counted as a guess; a choice where some alternative fails is counted, weighted by `log2(c / kLow)` | CF2, N8, P9, V2, V4 |
| MP05-B02 | On a unique puzzle the decisive values equal the raw ones and cost nothing extra | recipes (census nodes 0, work 0) |
| MP05-B03 | When the census budget runs out, the values are an upper estimate between the decisive and the raw values, and the result says so (`complete: false`, the number undecided) | CF1, CF3, V3 with `census: 0` |
| MP05-B04 | `Gproved` counts only the guesses with an alternative proved impossible; it never exceeds G and equals G when the census is complete | CF1 (1 then 2), CF2, CF3, V3 |
| MP05-B05 | Nothing a player or the Generator sees changes: no caller uses the solver yet and every existing test passes | `npm run test:quick` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP05-T01 | The three sources in the specified order; probes in path order and ascending alternatives; the census check stops the census, never the measurement; no replay when nothing is undecided | review; census tests |
| MP05-T02 | `census` is non-null iff the path is complete; `kLow + f + u = c` at every node; `first.census` aligned with `choices` | census tests |
| MP05-T03 | Counted nodes, G, info (path order), Cmax, Dmax (deepest counted node) and Gproved as specified; the metric domain holds | census tests |
| MP05-T04 | Totals: `search.nodes` = main + census nodes, `search.work` includes census work, `search.Gt` unchanged; a count stopped by a node cap still runs the census (C7, C8) | `deduce` tests |
| MP05-T05 | All re-pinned values reproduce; every other pinned value is unchanged; rule counts, F, E, tiers, `rows`, `count` and `search.stop` are unchanged everywhere | `deduce`, `deduce-rules` tests |
| MP05-T06 | Determinism (two calls deep-equal); `verifyUndo` finds no mismatch with the census (replay and probes) | census tests |
| MP05-T07 | Every new buffer is a slot; buffer-accounting and memory-limit tests pass; design §7.9 updated; `npm run test:quick` and `npm run check` pass; CRLF; no file outside the ownership list changed | command output; review |

## Test plan

### Exact commands

```powershell
node --test tests\deduce.test.js tests\deduce-rules.test.js tests\deduce-census.test.js
if ($LASTEXITCODE -ne 0) { throw 'deduce tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases

`tests/deduce-census.test.js` (new; imports as in `tests/deduce.test.js`; each model on a fresh
`createWorkspace(MAIN_WORKSPACE_BYTES)`):

| Case | Expected result |
|---|---|
| Unique puzzle: kLow 1, u 0, values equal the raw ones, no extra cost | the hard, expert and master recipes: every node `kLow: 1, u: 0`; G, info, Cmax from `choices`; census nodes 0 and work 0 |
| A free node is not counted | CF2 (root `[4, 4, 0, 0]`); V2 and V4 give G 0 |
| A node with a failing alternative counts `log2(c / kLow)` | N8 (info 2.7004), P9 (info 2), CF1 complete (info 2.0444) |
| Budget cut: u > 0, `complete: false`, an estimate between decisive and raw, raw `choices` unchanged | CF1 with `census: 0` (info 3.0444 between 2.0444 and 6.0444); CF3 with `census: 0` (G 2 between 1 and 3, info 3.1699 between 1 and 6.1699); V3 with `census: 0` (G 1 between 0 and 3) |
| `Gproved` counts exactly the nodes with f >= 1, at most G; equal to G with an unlimited budget | CF1 (`census: 0`: Gproved 1, G 2; `census: Infinity`: Gproved 2, G 2), CF2, CF3, V3 |
| Census work and nodes are in the totals | V3: census nodes 6, `search.nodes` 21 = 15 + 6, `search.work >= census.work > 0` |
| A count stopped by a cap does not stop the census | C7: stop `node-cap`, census complete with 14 nodes, G 0 |
| `Dmax` is the placement depth before the deepest counted node | CF3 complete: Dmax 0 (raw 3); CF3 with `census: 0`: Dmax 1 |
| Metric domain | every result above with G 0 has info, Cmax and Dmax 0 |
| Determinism and undo | CF1 twice deep-equal; CF1, CF3 and V3 with `{ verifyUndo: true }` deep-equal to the runs without it |

`tests/deduce.test.js` and `tests/deduce-rules.test.js`: the re-pinned values only.

## Definition of done & handoff

- Every criterion has its evidence; the quick set and the check pass; nothing outside the ownership list changed; no
  pinned value was changed except the listed ones.
- The reply gives, for the six recipes and V3, the census nodes and work and the total work (a throw-away script
  under `tests/artifacts/MP05/`).
- Handoff to MP06a: the final `DeductionResult` shape (with an example), where the MRV column is chosen (for
  `tieOrder`), the census budget behaviour, and any deviation from this specification.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP05: Decisive census, the upper estimate and Gproved`) |
| Start | 2026-11-12 14:01 (+07:00) |
| End | 2026-11-12 14:22 developer (including one fix round); 14:30 orchestrator review and commit |
| Duration | 21 min developer (1,250 s, of which the fix round about 2.5 min); about 8 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 95 model calls; 19,226,292 input tokens (18,927,871 cache reads); 142,306 output tokens |
| AI credits | about 406 (developer) |
| Verification | Developer: `node --test tests\deduce.test.js tests\deduce-rules.test.js tests\deduce-census.test.js` 45/45 (2.9 s); `npm run test:quick` 1,162/1,162 (16.9 s); `npm run check` OK; scratch mutation sweep of 22 census mutants, 21 killed (the survivor only changes `work`, not pinned); re-run after the fix round with identical pinned values. Orchestrator re-run: targeted 45/45, `npm run test:quick` 1,162/1,162 (17 s), `npm run check` OK |
| Acceptance | MP05-B01..B05 and MP05-T01..T07 met. Diff reviewed: census sources (kept path, branch alternatives, probes in path order), census check `overWork` against `censusStart + limits.census` (stops the census only), `result.census = { complete, undecided, nodes, work }` non-null iff `path === 'complete'`, `Gproved` = final-path nodes with f >= 1, decisive G/info/Cmax/Dmax, totals per D17 (`search.nodes`/`search.work` include the census; the D5 node cap bounds the main search), six new slots in `slotTable` |
| Issues & resolutions | (1) Fix round (orchestrator request, defect dating from MP02a, also recorded there): `mark()` returned a fresh `{ trail, picked }` object per call, against RES-10 "no allocation per node"; now `trailLength * markSpan + pickedLength` with `markSpan = NP + 2` (bound (R + C + 1)(NP + 2), far below 2^53), decoded in `undo`; `search()`'s per-node `rules.set(savedRules.subarray(...))` replaced by a plain loop. Remaining allocations are once per call or per final-path node (`snapshot`, `path.census.push`, `result`, `validateLimits`) or diagnostic-only (`copyState`, `copies`); `rules`/`savedRules` stay once-per-call outside `slotTable` (MP02a's accepted deviation). (2) Assertions adapted per D17: caps test `search.nodes - census.nodes <= limits.nodes`; the "work cap stops a search that has started" test compares the main search's own share. (3) X7 (MP04's added board) re-pinned to G 1, Gproved 1, info 1, Cmax 2, Dmax 0, census `[[2,1,1,0],[2,2,0,0],[2,2,0,0]]`: open item, confirmation by the analyst's reference requested. (4) Differences from the task text: probes use `alt` from depth 0 (the main search has finished); the replay stops after the last undecided alternative (statuses identical, only `census.work` differs); work checks before each probe and in the probe loop turn a false fixpoint inside R7 into STOPPED; the section 4.2 `deduce.js` type block of `docs/design-detail.md` also updated. (5) Added tests: probes equal the exhaustive-count census on about 100 random boards; with an infinite census budget `first` is identical for node, work and solution cuts on CF1, CF2, CF3 and V3; a path-order sweep on CF3 |
| Handoff | `first` keys `F, E, rules, deductionTier, G, Gproved, info, Cmax, Dmax, choices, rows, census`; `census[i] = { c, kLow, f, u }` aligned with `choices[i]`; `result.census = { complete, undecided, nodes, work }` or `null`. For MP09b: `censored` = `!census.complete`. For MP06a/MP06b: the main search's share is `search.nodes - census.nodes` and `search.work - census.work`; the census budget counts from the work at the census start and may overshoot by one ladder pass; `census: 0` gives census nodes 0 but work > 0 (the replay's root ladder). Data points: V3 census work 39,823 for 6 nodes, C7 98,369 for 14 nodes, CF1 37,781 for 13 nodes; a larger budget only refines statuses |

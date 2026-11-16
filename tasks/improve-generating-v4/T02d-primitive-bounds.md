# T02d: `gen-v4` prototype: the begin line of every primitive and its proved bound (IG-P-Q37)

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (rule (c5) faster, with IG-P-Q37's sentence: the work is the consumed selection work, judged on bounds), §5.1 ("Observers"; "Parity passes"), §7 (IG-P-Q37); decision D-V4-17 (IG-P-Q37's rule); review RV3-01 (IG-P-Q37 point 3 "Instrumentation", point 5), RV4-01 (the R9 term), RV4-08 (the cost wording) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T02c |
| Depends on | T02c |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (small real ratings and counts on one set; verification through the lock helper) |

## Goal

A worker killed inside a rating or a uniqueness count leaves that primitive's work unreported. IG-P-Q37 bounds it
instead of reading it as zero or as unknown: one journal line before every primitive names the call, the kind and a
proved upper bound of the units that primitive can charge. The line is written with `appendFileSync` before the
primitive starts, so it survives the kill; the work ledger (T09c) then brackets the request's consumed work between
its reported units and those units plus the bound of the one open primitive.

## Authority and fixed points

- IG-P-Q37 (plan author, 2026-11-16, `docs/improve-generating/clarifications.md` at `288669b`; plan §7), point 3:
  "One journal line before every rating and every uniqueness count, repairs included, at the seam where T07a already
  checks the budget: the call, the kind and `bound`, a proved upper bound of the units that primitive can charge (its
  limits plus the overshoot of the limit check ...). The journal writes with `appendFileSync`, so the line survives
  the kill. No counter inside a primitive, no change to the kernel, to cancellation or to P5's meter." Point 5: the
  line joins the observer-parity passes (puzzles, work units and skip ordinals unchanged).
- **The derivation of `bound`** (pack author; the code at `3fc65f4`):
  - *A count* charges its `rowTrials` (`core/engine/clues.js:180-181`); the DLX solver tests `rowTrials >= rowLimit`
    before each increment (`core/engine/dlx.js:299-307`), so a count charges at most the `rowLimit` passed to
    `makeUnique` (`clues.js:269`, `countRowLimit(board)`). Its bound is that `rowLimit`.
  - *A rating* charges `metrics.work`, the deduction's main plus census work (the journal's `tuple[4] + tuple[5]`;
    an `IncompleteRatingError` reports `counters.work` at its stop). `measureDeduction` (`core/engine/deduce.js:280`)
    compares `work` with its limit only at checks: the ladder's and the closure's `overWork()` at every pass
    (`deduce.js:839-850`, `:858`, `:1450`), R7's checks before every `reachable` (`:1102`, `:1128`), the search's
    check before every alternative (`:1623`), the probes' (`:1699`, `:1756`) and the setup's (`:1826`). The census sets
    its limit to the work at its start plus `limits.census` (`:1746-1747`). So the charge is at most `setup + work
    limit + census limit + 2 x (P + U)`: the setup's work (`:364-407`); after the search's last passing check, at most
    one stretch `P` between two checks and one full unwind `U`; the same again after the census's last passing check.
    A stretch is a contiguous part of one ladder pass (every pass starts with a check), so it runs each rule at most
    once; R7's check returns `NONE` without stopping (`:1102`, `:1128`), so R8, R9, `fewestColumn` and `listRows` may
    follow it inside the same stretch; a chain of returns pops disjoint parts of the trail, at most `U` together.
  - *The stretch* `P` between two consecutive checks is at most the sum, over every rule of the ladder, of the work
    one application can add (each a bound of that function's `work +=` sites on the model): `select` `L + 2 NZ`
    (its row, the columns of its cells, each killed row once); `undo` `U = R + C + NZ`; R1 and R2 `C + K + select`;
    R3 check `(NC + 1)(NP + 1) + NC`; R3 place `NZ + select`; R4 `R + 4 NZ + NP L + L K` (a cell is common to the live
    rows of at most one piece without a kill); R5 `3 NZ + R + (L - 1)(R + NZ)` (a full scan of a piece only for the at
    most `L - 1` cells common to its live rows); R6 outside its closures `3 NZ + select + undo`; R7 `NC + 2 NC (R + NP)
    + 2 R + NZ + 2 NP + (NP + 1)(NC + 1)(2 Tsz + 1)` (the pockets' gathers that have no check between them, one
    `reachable`, whose table has at most `(NC + 1)(2 Tsz + 1)` entries, and the kill scans); R8 `9 NC + NP + NZ (2 + 2
    NC + L) + NP^2 + NP (NC + 1)(NP + 1) + NZ`; R9 `3 NZ + NC^2 / 2 + 3 (NC^2 / 2) K L` (`:1344-1438`: at most `NC^2 /
    2` cell pairs, each charging 1, `coversBoth` at most `K L` and, for a pair that qualifies without a kill, the two
    piece-column scans of `:1387-1406` at most `2 K (L - 1)`; the support scan and the kills at most `3 NZ`; review 4
    (R4-01) showed that a coefficient 1 on the product misses those scans); `fewestColumn` and `listRows` `C + K`. Here `R` rows, `C` columns, `NC` free cells, `NP` free pieces, `NZ` nonzeros, `L` the longest row, `K` the
    longest column and `Tsz` the free pieces' total size (a piece's colour imbalance is at most its size).
  - *Without enumerating the model*, in O(board area + pieces) (`activeCount` scans the board's cells) plus one journal
    write, both inside the measured durations of a timed row, the seam uses upper bounds that every term is
    non-decreasing in: `NC` = the board's active cells less the clued pieces' cells, `NP` the free
    pieces, `Tsz` their total size, `L` the largest free piece's size plus 1 (its piece column), `C = NC + NP`, `R = 8
    NP NC` (at most 8 orientations of a free piece anchored on a free cell), `NZ = 8 NC (Tsz + NP)` and `K = 8 x max(Tsz,
    NC)` (a cell column holds at most 8 placements per cell of every free piece; a piece column at most 8 per free
    cell).
  - *Magnitude, not a claim of feasibility* (IG-P-Q37 point 4): with no clue, the canonical bound is about 1.13 G units
    on a carved 10x10 Nightmare set, 1.85 G on 12x12, 3.7 G on 14x14, 8.0 G on 16x16, 15.3 G on 18x18 and 242 G on
    26x26 (`docs/improve-generating/evidence/drift/claude-opus-5.5/bound-cheap.mjs`, with the R9 term above); the R9
    and R8 terms dominate, and the bound shrinks with every clue. The width is reported from the stage-2 journals (T09e, N-V4-03).
- The line is an observer: it changes no result, no control flow and no charge (plan §5.1 "Observers").

## Scope

- Change: `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js` (steps 1 to 3), `tools/ig-proto/self-test.mjs`
  (three `--v4` cases), `tools/ig-proto/README.md` (a paragraph).
- Do not change: everything else (no variant manifest, no production file, no kernel file). Guards: `node
  tools\ig-proto\firewall.mjs check --task V4-T02d --label frozen`, expected `files unchanged`; `git status --short --
  core generator tests tools/bench tools/ig-proto/variants/*.json`, expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T02d --label frozen`.
1. **Module level** of `ig-select-v4.js`: add `activeCount` to the import from `./board.js` (or `import { activeCount }
   from './board.js';` when there is none) and, beside T02a's `igCapsLine` and `igCountLine`:

   ```js
   /** The begin line of a primitive (IG-P-Q37): written before it starts, so it survives a kill. */
   export const igBeginLine = (callId, kind, bound) => igLedgerLine({ t: 'begin', call: callId, kind, bound });

   /**
    * A proved upper bound of the units one rating can charge (IG-P-Q37; derivation in task T02d, R9 as corrected in
    * review 4): the setup, the work and census limits, and twice the largest stretch between two limit checks of
    * deduce.js plus a full undo, from upper bounds of the model's sizes that need no enumeration.
    * @param {{ width: number, height: number }} board
    * @param {{ id: string, cells: unknown[] }[]} pieces
    * @param {{ piece: string }[]} clues
    * @param {{ work: number, census: number }} limits
    * @returns {number}
    */
   export function igRatingBound(board, pieces, clues, limits) {
     const clued = new Set(clues.map((c) => c.piece));
     const free = pieces.filter((p) => !clued.has(p.id)).map((p) => p.cells.length);
     const cluedCells = pieces.filter((p) => clued.has(p.id)).reduce((s, p) => s + p.cells.length, 0);
     const A = board.width * board.height;
     const NC = activeCount(board) - cluedCells;
     const NP = free.length;
     const Tsz = free.reduce((s, n) => s + n, 0);
     const L = Math.max(0, ...free) + 1;
     const C = NC + NP;
     const R = 8 * NP * NC;
     const NZ = 8 * NC * (Tsz + NP);
     const K = 8 * Math.max(Tsz, NC);
     const sel = L + 2 * NZ;
     const U = R + C + NZ;
     const P = sel + U + (C + K + sel) + ((NC + 1) * (NP + 1) + NC) + (NZ + sel) + (R + 4 * NZ + NP * L + L * K)
       + (3 * NZ + R + (L - 1) * (R + NZ)) + (3 * NZ + sel + U)
       + (NC + 2 * NC * (R + NP) + 2 * R + NZ + 2 * NP + (NP + 1) * (NC + 1) * (2 * Tsz + 1))
       + (9 * NC + NP + NZ * (2 + 2 * NC + L) + NP * NP + NP * (NC + 1) * (NP + 1) + NZ)
       + (3 * NZ + (NC * NC) / 2 + 3 * ((NC * NC) / 2) * K * L) + (C + K);
     const setup = 3 * NZ + R + C + A + 2 * NC + NP;
     return Math.ceil(setup + limits.work + limits.census + 2 * (P + U));
   }
   ```

2. **The rating seam**: the first statement of `rateOnce` (T02a step 4.3) is

   ```js
   igBeginLine(call.id, mode === 'screen' && screened ? 'screen' : 'rate',
     igRatingBound(board, pieces, clues, mode === 'screen' && screened ? screenLimits.deduce : DEDUCE));
   ```

   (T07a later puts `checkBudget();` before it, so that a stopped primitive writes no begin line.)
3. **The count seams** (the frozen `finish` of T02a step 4.6): right before `const repaired = makeUnique(`, the line
   `igBeginLine(call.id, 'count', rowLimit);`; and the hook `onAdd` becomes `(addedId, list) => { if (record !==
   undefined) { steps.push({ addedId, clues: ownPoses(sortLike(layout, list)) }); } if (list.length <= K - 2) {
   igBeginLine(call.id, 'count', rowLimit); } }` (always defined: `makeUnique` counts again exactly when the list has
   at most `pieces.length - 2` clues, `clues.js:177-212`).
4. **Self-test** cases (Tests table) in the `--v4` group; **README.md**: a paragraph "Begin lines and bounds
   (V4-T02d)": the line, its kinds, the two bounds and the derivation in short, and that the work ledger is T09c's.

## Tests

All in `tools/ig-proto/self-test.mjs --v4` (locked: real counts and small real ratings).

| Case name | Input | Expected |
|---|---|---|
| `bound: every primitive is announced` | `v4Call('begin', { prior: null, screen: () => 'cap', canon: (c) => synthetic(c <= 3 ? 100 - 10 * c : 60), uniqueness: 'require' })` (screen-capped probes, re-ratings and a real repair with counts) | in the call's journal order, every `p` line is immediately preceded by a `begin` of kind `screen` or `rate` and every `count` line by a `begin` of kind `count` whose `bound` equals `countRowLimit(board)` of the tree's `clues.js`; every `bound` is a finite number from 0; no `begin` line follows the last completion line before `end` |
| `bound: no real rating exceeds its bound` | the `k15Set()` set and the clue subsets of its first 3, 6 and 9 layout poses; for each, `measureV3(board, pieces, clues, ws, { deduce: { ...DEDUCE, work: w, census: c }, dlx: SCORE.caps })` of the tree with `w` in 0, 1, 1,000 and 1,000,000 and `c` in 0 and 1,000 (an `IncompleteRatingError`'s `counters.work`, else `metrics.work`) | each of the 24 charges is at most `igRatingBound(board, pieces, clues, { work: w, census: c })`; the case prints the largest observed `charge - w - c` beside the smallest `bound - w - c`; the case is a sanity check of the implementation on real charges, not a proof of the inequality (the proof is the derivation of the Authority section) |
| `bound: the journal changes no result` | the first case's call once with `IG_LOG_DIR` set and once with it deleted from `process.env` | the two `result`s deep-equal (clues, rating, certificate, `skips`, `igWindow`); no journal file is written by the second |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error | 2 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T02d verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T02d')` (check-list §3.2) | root | fifteen cases pass (T02a's three, T02b's five, T02c's four and these three), exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\firewall.mjs check --task V4-T02d --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a kernel file, a variant manifest or the formula of step 1.
- `QUESTION:` when a real rating of case 2 charges more than its bound (the derivation is then wrong: report the
  subset, the limits, the charge and the bound); when a case of T02a to T02c fails after this change.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02d-B01 | Every rating and uniqueness count of a `gen-v4` call is announced, before it starts, with a proved upper bound of the units it can charge | case 1; the derivation (R9 as corrected in review 4) | self-test output; this task |
| T02d-B02 | The line changes no result (an observer) | case 3 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02d-T01 | A count's bound is its row limit; a rating's bound is the formula of step 1 with the limits of its kind | case 1; diff | self-test output; diff |
| T02d-T02 | No real rating exceeds its bound at limits where the overshoot dominates (a sanity check) | case 2 | self-test output |
| T02d-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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

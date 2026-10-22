# T09 — Shared score, clue selection, and proof-status certificates

**ID:** T09  
**Depends on:** T02, T04, T07  
**Estimated size:** 900–1,400 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §6.10–§6.11, §7.1–§7.4, §13.2.

## Goal & business context

Every accepted puzzle must actually match its displayed level. The optional “Require one solution” control must be backed by proof, while normal play must not wait for a uniqueness check.

## Scope

**In scope:** score measurement, target-band checks, bounded clue search, counterexample-guided uniqueness and certificate semantics.  
**Out of scope:** worker scheduling, generation attempt ordering and UI badges.

## Inputs & context

```ts
type Metrics={U:number;B:number;branchTrials:number;rowTrials:number;
 stop:'solution'|'branch-cap'|'row-cap';R:number;H:number};
type Rating={model:'difficulty-v2';score:number;level:string;
 saturated:boolean;metrics:Metrics};
type Certificate={status:'unique'|'multiple'|'not-proved'|'unsatisfiable';
 model:'dlx-v1';rowLimit:number;verified:boolean};
MODEL='difficulty-v2';
measure(board,pieces,clues,ws):{metrics:Metrics;saturated:boolean};
score(U:number,B:number):number;
rate(board,pieces,clues,ws):Rating;
inBand(r:Rating,target:Level):boolean;
selectClues(ctx:{board;pieces;layout:Pose[];target:Level;rng:Rng;
 uniqueness:'any'|'require';excludeClueKeys:ReadonlySet<string>;ws:Workspace}):
 {ok:true;clues:Pose[];rating:Rating;certificate:Certificate|null} |
 {ok:false;reason:'not-in-band'|'uniqueness-not-proved'};
makeUnique(board,pieces,layout,clues,rng,ws,rowLimit):Pose[]|null;
certify(board,pieces,clues,ws,rowLimit):Certificate;
```

Board, Piece and Pose use the shared contracts: integer x-right/y-down cells; mirror, clockwise turn, normalize, translate. T07 provides `buildModel`, `solveFirst`, `countSolutions`, `clueKey` and complete solution witnesses.

Score:

```text
U = K - number of clues; R = unfilled active cells
H = mean log2(1+L_i), over remaining pieces' legal placement counts
canonical DLX: stop at first solution, 5000 branch trials or 50000 row trials
if solution reached: B_eff=min(actual branchTrials,5000); saturated=false
if either work cap stops first: B_eff=5000; saturated=true
D = Math.round(2U + 8*log10(1+B_eff)), once at the end
U=0 => D=0,H=0,B=0,zero counters and stop='solution';
any L_i=0 or an exhausted zero-solution search => invalid/unsatisfiable
```

Actual counters and stop reason remain distinct from effective B. No wall-clock value enters the score. A watchdog interruption produces no rating. A saturated value is a defined bounded estimate, not a uniqueness or existence proof; generated clue subsets have a validated witness.

Bands: edges `0,8,12,17,25,37,53,77,112,162,235,341`; higher edges `round(10*1.45**(L-1.5))`. Level L occupies `[edgeL,edge(L+1))`. Index mapping VE/E/N/H/X/M/NM=0..6; Hell-n=6+n. Shares `.62,.54,.46,.38,.30,.22,.14,.10,.06`, then `.04`.

Clue search:

1. Begin `G=clamp(round(target.share*K),1,K-2)`.
2. At each of at most eight count changes, sample four seeded, distinct subsets of G witness pieces; skip repeated subsets and excluded clue keys.
3. Rate each. If all are below the band, try G−1; if all above, G+1; otherwise move to beam search. Do not revisit an already-tried count indefinitely.
4. Bounded beam width4 over adding/removing/swapping clues; at most **64 distinct profiles total**, including the first stage. Rank by distance to the band, then distance to its center, then deterministic clue key.
5. Accept only `target.min <= score < target.max`. No highest-level exception and no closest-match relabeling.
6. In `any` mode return `certificate:null`; proof work is scheduled later.
7. In `require`, call `makeUnique`, re-rate the changed clues, and accept only if still in band and proven unique.

`makeUnique`: count up to two raw completions. One found + exhausted proves unique. If at least two are found, take a witness different from the planted layout, identify unfixed pieces whose footprints differ, and add the smallest such planted piece (seeded tie). Repeat only while G≤K−2. A cutoff with fewer than two is inconclusive. Optional removal of added clues must preserve uniqueness **and both band edges**, not merely the upper edge.

Certificates use row limit 10,000 for active area≤200, otherwise2,000:

| Evidence | Result |
|---|---|
| One + exhausted | unique |
| At least two | multiple |
| Zero + exhausted | unsatisfiable |
| Zero/one + cutoff | not-proved |

No board-symmetry quotient applies to proofs. Set `verified:true` only for computation in this runtime.

## Files to create/modify

`core\engine\difficulty.js`, `core\engine\clues.js`; `tests\difficulty.test.js`, `tests\clues.test.js`, `tests\certificates.test.js`.

## Implementation steps

1. Implement score and measurement, including model-stop conversion and diagnostics.
2. Implement raw certificates and bounded uniqueness repair.
3. Implement deterministic count-guided sampling and beam fallback.
4. Add actual compatible witnesses to clue fixtures; refuse invalid supplied layouts.

## Acceptance criteria — Business

- **BAC-1:** Generated puzzles display their actual estimated level, never the requested label on an out-of-band result.
- **BAC-2:** Normal puzzles are ready before uniqueness checks; required-unique puzzles are never accepted on a cutoff.
- **BAC-3:** Starting pieces are a solvable subset of the witness, with at least one clue and two pieces left.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\difficulty.test.js" "tests\clues.test.js" "tests\certificates.test.js"` passes.
- **TAC-2:** Worked `(U,B_eff)->D`: `(0,0)->0`, `(3,0)->6`, `(4,3)->13`, `(5,10)->18`, `(11,999)->46`, `(12,5000)->54`, `(40,5000)->110`, `(41,5000)->112`, `(66,5000)->162`.
- **TAC-3:** Row-cap saturation with actual B<5,000 stores both values correctly. ID/color/input-order permutations preserve generated-puzzle ratings.
- **TAC-4:** Tests exercise repeated subset rejection, beam fallback, no-in-band failure and a uniqueness repair that leaves the band.
- **TAC-5:** `node tools\check-conventions.mjs` passes; no clocks, DOM, runtime dependencies or unbounded search.

## Test plan

Use tiny internal problems for exact unique/multiple/unsatisfiable counts, a symmetric-piece duplicate-pose case, and a reflected alternative that must count as a second raw solution. Include a forced-placement fixture with B=0 and score2U. Never assert that removing clues must raise the score.

## Definition of done & handoff

T10 invokes these functions for both set calibration and every puzzle. T14 reuses `certify` in idle jobs. Publish successful small clue recipes for later integration fixtures.

## Execution log

| Field | Value |
| --- | --- |
| Status | Done (one non-blocking interpretation sent to the owner for confirmation) |
| Start | 2026-10-22 20:22:54 (+07:00) |
| End | 2026-10-22 20:32:06 (+07:00) |
| Duration | 9 min 12 s |
| Model | claude-sonnet-5.5 (sub-agent `T09-difficulty`, general-purpose); ran in parallel with T08, T11 |
| Token usage | 41 model calls; 3,653,944 input (3,546,572 cache read), 61,473 output |
| AI credits | 123.78 AIU (from orchestrator usage store, keyed by sub-agent id) |

**Verification (orchestrator re-run):** `npm run test:quick` → 337 pass / 0 fail (task tests: 32 pass, ~3.8 s); `npm run check` OK. (Transient `pack.test.js` failures seen mid-run came from T11's in-progress files and were gone once T11 finished.)

**Acceptance:** BAC-1..3 and TAC-1..5 pass. All nine `(U, B_eff) → D` vectors plus `(8,0) → 16`; branch/row caps store B=5000 with `saturated:true`; ratings invariant under id renames, colours and piece/clue order; very-easy..master each produce an in-band subset on the 12-piece fixture while nightmare/hell-1 fail without relabelling; 205-cell strip with 2,000-row limit → `uniqueness-not-proved`; repair that leaves the band (3 → 4 clues, score 36 → 24) → `not-in-band`.

**Issues & resolutions:**
- Repair is allowed only while clue count ≤ K−2, so `makeUnique` returns null for K=2; fixtures use K=3 and K=12.
- Added optional trailing `limits` argument to `measure` (default `SCORE.caps`) solely to test row-cap saturation on small fixtures; added optional `onRate(clues, rating)` diagnostic callback to the `selectClues` context.
- Large-board `require` test is named "slow" (~3 s) so `test:quick` skips it.
- Optional post-repair clue removal not implemented (marked optional; `makeUnique` has no band information).
- Interpretation (sent to owner for confirmation, non-blocking): uniqueness-repair re-ratings (step 7) are not counted toward the 64-profile search budget (steps 1–4), so a candidate found in band is never discarded for budget alone. Reason precedence: any null `makeUnique` → `uniqueness-not-proved`; repair that only left the band → `not-in-band`.

**Handoff:** `difficulty.js` → `MODEL`, `score(U, B)`, `measure(board, pieces, clues, ws, limits?)`, `rate` (level id via `levelForScore`), `inBand`, `UnsatisfiableError` (`code:'unsatisfiable'`, for any `L_i = 0` or exhausted zero-solution search; `ModelError` propagates for invalid clues). `clues.js` → `selectClues(ctx)` (`ctx.target` is a Level or `{min, max, share}`), `makeUnique(...)` (given clues first, then added), `certify(...)` → `{status, model:'dlx-v1', rowLimit, verified:true}` (reusable by T14), `countRowLimit(board)` (10,000 if active area ≤ 200, else 2,000). Fixture `tests\fixtures\clue-recipes.js` → `RECIPE_BOARD_ROWS`, `recipeWitness()`, `CLUE_RECIPES` (e.g. master = `YW`, score 43).

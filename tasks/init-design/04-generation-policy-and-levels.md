# T04 — Final generation policy, level bands, and feasibility

**ID:** T04  
**Depends on:** T02  
**Estimated size:** 800–1,300 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §6.2, §6.4, §7.2–§7.5, §8.3; D9, D32, D35–D40.

## Goal & business context

Users must see truthful available levels and piece counts for their board. Replace every historical 10–18-piece assumption with the final area-dependent policy.

## Scope

**In scope:** `mixed-v2`, counts, size histograms, level metadata, enabled limits, qualification flags and deterministic budgets.  
**Out of scope:** carving, solver scoring execution, device detection through browser APIs, and lifting qualification gates without reports.

## Inputs & context

Required exports:

```ts
// levels.js
type Level={id:string;label:string;index:number;min:number;max:number;
 share:number;areas:[number,number]};
level(id:string):Level;
levelForScore(score:number):Level;
offeredLevels(area:number):Level[];
// policy.js
POLICY_ID='mixed-v2';
enabledMaxActive(device:{phone:boolean;largeBoards:boolean}):number;
kMin(area:number):number; kMax(area:number):number;
minAreaForCount(k:number):number;
sizeWindow(area:number,k:number):[number,number];
histogramFeasible(area:number,k:number,o?:{window?:[number,number];
 avail?:(s:number)=>number;smallCap?:number}):boolean;
pieceCountRange(levelId:string,area:number):number[]|null;
planSizes(area:number,k:number,rng:Rng,o?:sameHistogramOptions):number[]|null;
```

Level indices and exact intervals:

| L / id | Band `[min,max)` | Initial clue share | Offered area, inclusive |
|---|---|---:|---|
| 0 very-easy | 0–8 | .62 | 30–87 |
| 1 easy | 8–12 | .54 | 32–215 |
| 2 normal | 12–17 | .46 | 36–348 |
| 3 hard | 17–25 | .38 | 41–Infinity |
| 4 expert | 25–37 | .30 | 50–Infinity |
| 5 master | 37–53 | .22 | 59–Infinity |
| 6 nightmare | 53–77 | .14 | 81–Infinity |
| 7 hell-1 | 77–112 | .10 | 164–Infinity |
| 8 hell-2 | 112–162 | .06 | 266–Infinity |
| 9 hell-3 | 162–235 | .04 | 450–Infinity |
| 10 hell-4 | 235–341 | .04 | 744–Infinity |

`e0=0`; `eL=Math.round(10*1.45**(L-1.5))`. Hell-n uses L=6+n and continues for score classification. Generation never exceeds 676 cells, so Hell-4+ is never offered in a supported request. For dynamically classified higher Hell levels, use share .04 and a non-generatable interval `[Infinity,Infinity]` until a versioned generation policy defines it. Do not invent count anchors beyond the listed ones.

```text
K60 = [6,7.5,8.5,10,11.5,13,16,24,32,43,58,78]
Kcap = Infinity below Hell-1; then [42,62,92,140,210]
mid = min(K60[L]*(A/60)^.28, Kcap[L])
w = max(.75,.06*mid)
kMin(A)=ceil(.75*sqrt(A))
kMax(A)=largest K<=floor(A/4.5) with minAreaForCount(K)<=A
window = inclusive [round(mid-w),round(mid+w)]
         intersect [kMin,min(kMax,Kcap)]
if intersection empty, try clamp(round(mid),kMin,min(kMax,Kcap))
if level not offered: null
otherwise return every histogram-feasible integer in window
```

Availability is the frozen, gap-free table above, not a recomputation of the older centre inequalities.

`μ=A/K`; sizes are `[max(3,floor(.6μ)),ceil(1.5μ)]`. At most `floor(.4K)` pieces have size 3–4. Hole-free availability: `{3:2,4:5,5:12,6:35,7:107,8:363,9:1248,10:4460}`; larger sizes may be capped at the requested K for planning.

Feasibility requires integer counts with Σc=K, Σs·c=A, each count within availability and c3+c4 within the small cap. Enumerate constrained sizes 3–6; for the remainder in `[max(lo,7),hi]`, check the attainable sum interval. Respect overrides, including remaining availability after earlier macro parts; use a bounded DP fallback if that interval shortcut’s “enough shapes at each size” precondition is not met.

`planSizes`: start with the smallest feasible histogram under these constraints; repeatedly increment a smallest eligible piece until area A is reached; then try 3K random paired ±1 transfers, keeping every constraint, and shuffle. Return null on infeasibility, never loop indefinitely. RNG API: `int(n)`, `shuffle`, no global randomness.

Checks:

```text
K:       6  8  10 12 13 16 18 20 24 30 36 42 48 54 60 66 80 90
minArea:26 35 44 54 58 72 81 92 116 152 188 224 260 296 338 380 478 548
A / kMin-kMax: 60/6-13,100/8-21,144/9-28,196/11-37,
256/12-47,360/15-63,484/17-80,576/18-94,676/20-108
60: VE6-7,E7-8,N8-9,H9-11,X11-12,M12-13
360: H16-18,X18-20,M20-23,NM25-28,H1 37-42,H2 50-56
484: H3 73-80; 676: H3 80-90
```

`qualification.js` exports immutable `QUALIFICATION={bq0,bq1,bq2,bq3}`; each value is `{status:'not-run'|'blocked'|'fail'|'pass',report:string|null}` and ships as not-run/null. Normal desktop576 requires bq1 pass; phone484 requires bq3 pass; removing the experimental label requires bq2 pass. BQ-0 is the release gate, not an area uplift. This administrative state is never a score/seed input.

```text
LIMITS: minActive30,maxSide32,designMaxActive576,
 releaseMaxActive484 (576 only after BQ-1),
 phoneMaxActive360 (484 only after BQ-3),
 largeBoardMaxActive676,maxBatch10
enabledMaxActive: phone always uses phone cap; else largeBoards?676:release cap.
SCORE: model difficulty-v2, weights U2/B8, caps branch5000/rows50000.
TIME: target60000, dispatchStop115000, response120000 milliseconds.
BUDGETS:
carveSteps6000,carveTries24,macroPartitions30,macroSteps3000,sizePlans6,
rateBranch5000,rateRows50000,countRowsSmall10000,countRowsLarge2000,
clueSubsets64,lnsSteps8,lnsRowsMacro3000,lnsRowsFlat5000,
restartMaxArea150,restartBase2000,tilingTotal100000,slotAttempts12,
maxRows600000,maxNodes5000000,workspaceBytes160*1048576,
scratchBytes32*1048576,cacheBytes32*1048576,
verifyRows2000000,progressEvery50000,historyKeys1000.
```

## Files to create/modify

`core\engine\policy.js`, `core\engine\levels.js`, `core\engine\qualification.js`; `tests\policy.test.js`, `tests\levels.test.js`.

## Implementation steps

1. Implement level lookup/classification and the frozen intervals; reject malformed/nonpositive Hell suffixes.
2. Implement bounds, overridden histogram feasibility and deterministic size plans.
3. Add default device caps and immutable budget data.
4. Exhaustively check nonempty offered ranges over A=30–676; do not remove valid counts through a hidden slack rule.

## Acceptance criteria — Business

- **BAC-1:** A 60-cell board offers Very Easy–Master; 360 offers Hard–Hell-2; 484 offers Hard–Hell-3.
- **BAC-2:** Displayed count ranges match the anchor checks and never permit duplicate/undersized pieces to bypass feasibility.
- **BAC-3:** Unqualified desktops/phones retain 484/360 limits; experimental desktop mode reaches 676 without silently raising phone limits.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\policy.test.js" "tests\levels.test.js"` passes.
- **TAC-2:** Histogram feasibility agrees with an independent small DP, including overrides and exhausted small-shape availability.
- **TAC-3:** `planSizes` always sums to A, respects every bound and reproduces its output for a fixed RNG stream.
- **TAC-4:** All band edges, every availability boundary and generated Hell IDs are covered; unsupported generation levels return null.
- **TAC-5:** `node tools\check-conventions.mjs` passes; no browser APIs, clocks or dependencies enter the engine. No qualification flag is enabled by this task.

## Test plan

Test exact-minimum inventories, a sum just below minimum, classic 12×5 histogram support, 360/Hard large pieces, and all 30–676 offered ranges. Treat cutoff/ceiling tables as policy, not human-difficulty proofs. All correctness assertions are work/seed based, never timing based.

## Definition of done & handoff

T05 consumes LIMITS; T08 consumes plans/budgets; T09 consumes score bands; UIs consume the public functions rather than duplicating formulas. T24 alone may later change gate data with qualification evidence.

# Plan version 2 and its addendum (Pentomino): analysis, phase 1

Analyst: Opus (claude-opus-5.5), 2026-11-15. Independent phase-1 analysis; Astra's files not read.

**Inputs.**

- **Plan:** `plan.md` at `240398f`: version 2 (sections 0 to 8, from `e47eb30`) and the section 9 addendum. Also
  the answers to IG-P-Q17 and IG-P-Q18 in `clarifications.md`.
- **Evidence:**
  - `evidence/provisional/summary.md` (rows R00 to R33);
  - the audit addendum in `clarifications.md`;
  - the IGP-01 and IGP-02 records;
  - `docs/difficulty-v3/calibration-2026-11-15.md` at `13d61fd`;
  - `core/engine/deduce.js` (identical at `13d61fd`, `cd5d17f` and this branch).

**What was run.** Nothing timed, and nothing generated. Two read-only scripts read the committed IGP-01 and
IGP-02 records: one for the batch decomposition in Q2, one checking for rule counters, used in Q1. Both live
outside the repository.

**Labels.**

- *Measured* (provisional) is a row or record of the round.
- *Derived* is computed from such records.
- *Projection* depends on a stated assumption.

## 1. Answers to section 9.4

### Q1. C1: the exact virtual charge for R4 and `fewestColumn`, and where it does not extend

**Where the cap is checked.** This decides what "equal work" must mean.

- `overWork()` runs at the top of `ladder` (`deduce.js:1450`) and at each pass of `closure` (`:858`), which R6
  calls (`:897`).
- `work > workLimit` is tested inside R7 (`:1102`, `:1128`), in the probes (`:1699`), in `replayLadder`
  (`:1726`) and in the census (`:1756`).
- R1 to R5, R8 and R9 contain no check. For those rules a virtual charge only has to equal the scan's charge
  **as a sum per call**, with the same kills in the same order: same trail, same `colCount`. A cap can only fall
  between rules, never inside them.

**R4's charge** (`:709`). For each uncovered piece p, in ascending order:

- `colLen(pc)` units for walking every row of the piece column, dead rows included;
- 5 units per live row for marking, and 5 per live row for the reset (every row is five cells plus the piece
  column);
- 5 units for the first live row's cells;
- `colLen(c)` for each cell column that all live rows share;
- the kills' own row lengths.

`colCount[pc]` is already the number of live rows, kept by `kill` (`:432`) and `undo` (`:482`). So a piece
that claims no cell costs `colLen(pc) + 10 * colCount[pc] + 5` units, an O(1) charge. The first piece that
claims a cell must still scan its claimed columns for real, in the order of its first live row, so that the
kills and the trail are identical.

Two ways to avoid the marking passes:

- **(a) Live-row lists on the piece columns.** `kill` and `undo` unlink and relink on one column: O(1) more.
  Only live rows are visited, and the dead rows are charged from the static length. This is exact, and the
  upkeep is small.
- **(b) A per-piece "claims nothing" cache.** A dirty flag set in `kill` and `undo` invalidates it. It holds
  only for pieces with an empty claimed set; a non-empty set depends on other pieces' rows. A placement
  (`select`, `:444`) kills rows of nearly every piece, because every piece has rows over the five placed
  cells. So (b) pays only across runs of kill steps (R4, R5) between placements. That ratio is not in any
  record: MP12b1 keeps `F` and `E` but not R4 or R5, and PM4 keeps no rule counters. An `instr`-style counting
  run would give it.

**`fewestColumn`** (`:1541`) charges C per call, a static number. Buckets of columns by live-row count (one
bitset per count; the lowest set bit; a popcount for the ties; the t-th set bit for `tieOrder`) return the
same column and `mrvCount`, and C is charged virtually. The cost is about six bucket moves in every `kill` and
`undo`, which are the hottest code: `select` 17.5 to 20.0 %, `undo` 7.9 % (R30, indicative). PM2 did not
isolate `fewestColumn`, which may be inlined. Measure its share first, with a PM2 rerun under reduced inlining
(for example `--max-inlined-bytecode-size=0`); do not build it before.

**Where the same treatment extends.** It applies to every scan that charges one unit per row visited and whose
dead rows neither stop it nor change state:

- `liveRowOf`, used by R1 and R2 (`:510`): the charge is the static position of the first live row;
- R5's two scans (`:782`): the charge runs up to the static position of the exit;
- `listRows` (`:1577`).

`forcedColumn`'s per-column units (`:528`) can be served from an ordered set of columns with at most one live
row, charging the position of the first such column plus 1.

**Where it does not extend simply:**

- R6, through `closure`: the cap is checked at every pass, so the charge must be reproduced as **prefix sums**
  at each check, not as one total.
- R7: two checks inside it, and its `reachable` flood charges per cell visited. An incremental pocket labelling
  must charge what the flood would visit, which needs a maintained component structure: a large change.
- R8: the same flood dependence through the necks.
- The census and the probes: explicit checks.

R9 and R3 need a separate reading before anything is claimed for them.

**Memory.** Lists, caches and buckets are Int32 arrays of size R, NP or C, and must enter `memoryBytes`.

**Gain.** R4 is 16.5 to 16.6 % of rating time (R30, indicative). Removing all of it gives x1.20, which is the
ceiling of Fable's guess, not a likely value.

- *Likely* (Projection): x1.05 to 1.15 from (a), plus at most x1.05 from (b).
- *Range* x1.03 to 1.20; small boards (10x10, 12x12, short columns) sit at the low end.
- *Proof route:* the sum-equality argument above, plus `DeductionResult` equality on PM4's corpus.

**Recommendation:** prototype (a) inside the P7 spike.

### Q2. C2 and R13: the batch's waves, from the journals (no new run)

Derived from `IGP-01/after/*.calls.jsonl` and `*.runs.json`; medians over the requests that reached ten. The
first wave column reproduces R13's after medians exactly.

| Cell | n | Batch calls ok / failed | Concurrency (call-ms / span, of 4) | Waves (T10 - T1) / median call | Ideal waves (calls / 4) | Longest call / median call | Longest call / batch span |
|---|---:|---|---:|---:|---:|---:|---:|
| 12x12 Nightmare | 3 | 10 / 0 | 3.30 | 3.38 | 2.50 | 2.26 | 0.67 |
| 14x14 Nightmare | 3 | 14 / 0 | 3.42 | 6.24 | 3.50 | 4.01 | 0.65 |
| 15x15b10 Nightmare | 3 | 14 / 0 | 3.52 | 4.85 | 3.50 | 2.98 | 0.59 |
| 26x26 Nightmare | 6 | 10 / 0 | 3.58 | 4.12 | 2.50 | 3.28 | 0.76 |
| 26x26 Hell 1 | 3 | 13 / 0 | 3.51 | 3.84 | 3.25 | 2.34 | 0.61 |
| 14x14 Master | 5 | 13 / 0 | 2.90 | 6.18 | 3.25 | 5.16 | 0.68 |
| 26x26 Master | 5 | 12 / 0 | 3.38 | 4.97 | 3.00 | 3.81 | 0.81 |

**Answer.** The extra waves are the **tail of successful calls**, not failed calls, idle workers or the fold:

- no batch call failed in any request;
- concurrency is 2.9 to 3.6 of 4;
- the longest call alone spans 59 to 81 % of the batch, at 2.3 to 5.2 times the median call.

Two things the journal does not explain:

- why a request makes 10 to 14 successful calls for nine slots. It could be the fold rejecting duplicates, or
  results past the ninth. The consumer's decision per call must be recorded.
- the "2.25" of the analyses, which assumed nine calls of equal length.

**Consequence for C2.** Spare candidates consumed in a fixed (slot, candidate) order cannot shorten a span set
by a long call that comes first in that order. They pay only together with a deterministic per-call work budget
(P5) that ends long calls, so that the next candidate in order takes the slot.

- *Model* (Projection): with a per-call budget at about twice the median call's work, the batch span becomes
  about (calls / 4 + 1) median calls.
- *Batch:* about x1.0 to 1.45 (14x14 Nightmare and 14x14 Master the most; Hell 1 26x26 none).
- *T10:* x1.0 to 1.35.
- *Costs:* the CPU of the discarded candidates, and lost completion wherever the budget cuts a call that
  would have succeeded.

C2 is therefore P5 plus spares. It belongs to `gen-v4` (Nightmare and Hell) and needs IG-P-Q02 to fix the
budget's form first.

### Q3. C3: correlation of the DLX diagnostic with the v3 score

**It cannot be computed from the records.** None of the committed v3 records carries the diagnostic:

- MP12b1's accepted puzzles keep `{deductionTier, G, Gproved, info, Cmax, Dmax, solutions, censusComplete,
  censusUndecided, F, E, nodes, work}`;
- PM4's profiles keep the canonical outcome, score and work;
- the journal tuples (`ig-log.js:189`) have no `B`, `branchTrials` or `rowTrials`.

Only `docs/difficulty-v3/baseline-v2/` records `branchTrials`, and that is with rating-v2 scores.

**Cheapest measurement.** Re-rate PM4's stored profiles with the diagnostic recorded: set, order and count
identify each subset. It is untimed CPU and needs no lock, but it is not now (no machine runs).

**Bound.**

- The search side's floor is about one rating per accepted puzzle, against three to four today (R12, R19).
  So C3 can give at most x2 to 3 on the search side, and about x1.1 to 1.4 with real prediction errors
  (Projection).
- It matters most on the capped side, where a wrong "below" costs a 2 s cap.
- It conflicts with P6 only by name: the predictor is a separate DLX call of milliseconds.

**Verdict:** measure the correlation first. No prototype arm before it shows a rank correlation that separates
the sides of the band per area class.

### Q4. C4: counting exact state repeats

**Feasible** with an `instr`-style edit: test-side find and replace on `deduce.js`, as `variants/instr.json`
already does.

- *What to hash:* at each `branch` node, the state that `sameState` (`:428`) compares: `covered`, `live` and
  `picked`. Zobrist keys can be updated in `select`, `kill` and `undo`; a counting run may simply hash in full.
- *What to count:* repeats per rating, split between the main search, the census and the probes, with the work
  of the repeated subtrees.
- *Cells:* where the cap binds. PM4's start-count profiles of 14x14 and 15x15b10 Nightmare and Hell 1 26x26
  (76 to 100 % capped), and 12x12's complete windows.
- *Rule counters:* the same run should record R1 to R9 per rating, which Q1 needs.

**Prior.** A repeat needs two partial tilings of one region by the same pieces, which is common in pentomino
packing. But an exact memo must re-search whenever the cap could fall inside a stored subtree, and the census
statuses (`:1634`) must come out equal.

**Recommendation:** count first. Design the memo only if repeated subtrees carry, say, more than 20 % of the
capped profiles' work.

### Q5. Hell 1 after C1 to C5, and the frozen round

Projection. The starting points are measured without the screen: Hell 1 26x26 at 34.2 s and 20x20 at 42.9 s
(n 2 each).

| Factor | Likely | Range | Basis |
|---|---:|---|---|
| P6 on the prototype | 1.02 | 1.0 to 1.05 | E:F x1.01 with eight workers; DLX 3.6 to 10.2 % on complete windows (PM2) |
| Kernel: P7 as C1 + C5 (+ C4 if it holds) | 1.3 | 1.1 to 1.8 | kernel 95.7 to 96.3 % (R24); C1 above; C5 on `select` / `undo` |
| C2 with a per-call budget | 1.1 | 1.0 to 1.3 | Q2 (Hell 1 26x26 has a short tail) |
| C3 | 1.0 | 1.0 to 1.4 | unmeasured |
| Prior from PM1's windows (20x20 only) | 1.4 | 1.2 to 1.6 | the locate walk of 6 to 7 probes, with one to three canonical caps of about 2 s, drops to about 2 (IG-P-Q18 addendum) |
| P11 (phase 4) | 1.5 | 1.3 to 2 | on the kernel, close to the request at k = 96 % |

| Cell | Today | After `gen-v4` (measured) | After C1 to C5 and the prior, no P11: likely (range) | With P11 | Browser by the planning rule (5 s + 4 x Node): no P11 / with P11 |
|---|---|---|---|---|---|
| Hell 1 26x26 | 108.7 s, 9 of 20 | 34.2 s (n 2) | 23 s (10 to 31) | 16 s (5 to 24) | 99 s / 67 s |
| Hell 1 20x20 | no set in 115 s | 42.9 s (n 2) | 21 s (8 to 33) | 14 s (4 to 25) | 89 s / 61 s |

**Reading.**

- The browser median of 60 s needs about 13.75 s in Node. That is reached only on the fast side of the range,
  or with P11 and the prior together (20x20).
- Progressive delivery (OD-P5) stays the only route that does not depend on unmeasured factors. I agree with
  section 9.3.
- The ratings behind these Hell 1 puzzles are mostly census estimates: 20 of 20 on 26x26 without the screen,
  7 of 20 on 20x20 (R27).

**Changes to the frozen round's content.** No step moves; four additions:

1. The journal records the slot, the candidate index and the consumer's decision per batch call (C2), and the
   DLX diagnostic per completed rating (C3).
2. One untimed `instr` counting run: state repeats (C4) and rule counters (C1).
3. The P7 spike covers C1 (a) and C5, with equality on PM4's corpus.
4. A PM2 rerun on 12x12 Nightmare and Hell 1 26x26 with reduced inlining, to attribute `fewestColumn`.

## 2. The candidates

| Id | Mechanism | Identity risk | Gain on the current source (model) | Cost to build / to measure | Dependence on MP12b3 to MP17 | Recommendation |
|---|---|---|---|---|---|---|
| C1 | R4 without marking passes (live-row lists; optional per-piece cache); exact charge as a sum | low: no cap check inside R4; same kills, same trail; corpus equality | x1.03 to 1.20 (likely 1.05 to 1.15; R4 16.5 %) | about 150 to 300 lines of `deduce.js` (test-side first) / a PM2-style timing | `deduce.js` is locked (MP12b2); none expected | **prototype** in the P7 spike |
| C2 | spare candidates in a fixed (slot, candidate) order, with P5's per-call budget | new `algo`; fold sequence must equal the serial one | T10 x1.0 to 1.35 (tail model, Q2) | small in the harness / one PM3 arm per class | none; needs IG-P-Q02 | **prototype** after IG-P-Q02, as a frozen PM3 arm |
| C3 | DLX predictor for the locate phase and the choice among subsets | new `algo`; acceptance stays canonical | at most x2 to 3 on the search side; likely x1.1 to 1.4 | an untimed re-rating of PM4's corpus and a correlation script | none | **measure first** |
| C4 | memo of failed sub-states within one rating | high: cap inside a stored subtree; census statuses | unknown; none if repeats are rare | small counting edit; the memo is large | none | **count first**, park the memo |
| C5 | tighter `select` / `undo` loops, then P11 | none (implementation) | `select` + `undo` 25 to 28 %: x1.1 to 1.15 if 1.5 to 2 times faster | small to medium / PM2 | none | **prototype after C1** (same loops) |

**On "Correction to P7's version 2 note".** Agreed, and checked in the code: `select` (`:444`) is the row
placement and its kills. The column choice is `fewestColumn` (`:1541`), whose share is unknown.

## 3. The version 2 body

### 3.1 Section 0 and section 9.1 against the evidence

**Verified.** Every figure of the two tables in section 0.1:

- R02 to R08, R10 to R14, R19 to R23, R25, R27, R32 and R33;
- the plan v1 quotes (`plan.md` v1 lines 93, 95, 97 and 266 to 275);
- section 2.3's 160 capped start-count profiles and the 3.8 to 10.9 / 0.8 to 4.2 profiles per call (R12);
- P3's "31 of 48 calls moved up, 30 after a capped probe". This holds with `locate.result = hit` above `c0`;
  counting windows as well, it is 37 and 36;
- section 4's browser figures (planning rule);
- section 9.1's `cd5d17f` to `13d61fd` identity (no file of `core/`, `generator/` or `tools/` differs), and
  its figures from `calibration-2026-11-15.md`: 334 of 441 (75.7 %), 52.8 on 14x14, 136.3 s, 105.1 s,
  84.5 % and 97.0 % estimated ratings, `[Infinity, Infinity]`, `13x13b5` at 7 clues.

The F1/F2 false-stop counts were read at that record's section but not recounted.

**Findings.**

| Id | Where | Issue | Correction |
|---|---|---|---|
| F1 | 4, "What this means" 1 | "solved ... on 196 to 324 cells ... on three cells and three seeds each": only 14x14 (196) and 15x15b10 (215) lie in that class; 16x16, 15x20 and 18x18 were not run (R09); 3 of 3 bounds completion only above 37 % (one-sided 95 %); no p95 | "on the two measured cells of the class, n 3 each; completion and p95 unestablished" |
| F2 | P2's `W_screen` table, row 196 to 324 | "no useful rating lost on 14x14 and 15x15b10": PM4 had 0 useful ratings on 14x14 (0 of 0) and 2 on 15x15b10 (R15); the class's 256 to 324-cell boards are unmeasured | state 0 of 0 and 0 of 2; mark the row provisional for the unmeasured boards |
| F3 | 0.1 "P2 gain", P2's table, row Hell 1 | "negative on Hell", "the screen is slower (x0.88)": n 2, per-seed 0.67 and 1.08 straddle 1 | the decision stands on the same-set shift and on PM1's 16 of 47 windows above 380 M; the speed is "not shown to pay" |
| F4 | P6, version 2 | "On the prototype the DLX share is 3.3 to 4.0 % (R30)": R30 is PM2's corpus of today's search on 10x10 and 12x12; on complete windows (the prototype's kind) DLX is 3.6 % (10x10) and 10.2 % (12x12); P6 alone was never run on the prototype (E:F includes eight workers) | P6 after `gen-v4`: likely a few per cent, up to about 10 % on 12x12-like cells (unmeasured) |
| F5 | 6 against 0.1 and 4 | first phase "1.0 to 1.3" (section 6) against "1.0 to 1.5" (0.1, 4.4; R25: 0.93 to 1.53) | one figure |
| F6 | 0.1, 26x26 Nightmare | "as estimated or slightly better": T10 11.9 s against 15.5 to 17.8 s, paired x2.01 against the analysts' implied x1.05 to 1.2 (audit erratum 3); measured with the 190 M screen, while P2's table gives cells of 360 or more no screen until measured | "better than estimated, with the screen; the default arm (no screen) is unmeasured" |
| F7 | 0.1, dead end | "confirmed": within the broad 30 to 60 % only; below the per-cell ranges (39.7 and 37.1 % against 41 to 52 and 44 to 56 %); 12x12 at 18.7 % against 4 to 10 % (audit erratum 7) | "confirmed on 196 to 215 cells; underestimated on 12x12", which helps explain 12x12's x9.3 |
| F8 | P10, 4 point 2 | "live generation reaches ten in about 34 to 43 s wherever a window exists": two boards, two requests each; 14x14 and 24x24 Hell 1 (R28's failing sets) never ran at request level | "on 20x20 and 26x26, n 2 each" |
| F9 | 4, the `gen-v4` call | "0 to 4 window profiles": means 0.84 to 4.15, p90 3 to 13, max 27 (R12) | add the tail |
| F10 | 9.2, 18x18 to 24x24 | "x1.5 to 2 (Projection from 26x26)": the 26x26 factor is with the 190 M screen, which P2's table does not give these classes by default; 18x18 (324 cells, 58 % capped at the start) belongs to the 196 to 324 class, not to 26x26's | project 18x18 with 14x14 and 15x15b10, and 18x20 to 24x24 from a no-screen arm still to run |
| F11 | 9.2, 10x10 | "about unchanged (no dead end)": PM4's sample shows 0 % capped at the start, the report's section 8 10 %; 51 % of 10x10's accepted puzzles lie above the start count (Opus cross-review 1.2), so P4's table may still save probes | "unmeasured; P4 may help" |
| F12 | 8, nested family | "K below about 12 ... 3x29, 10x10": their K is 19 and 18 | name the measure meant, or drop the two boards |

**Staleness.** The source is the measured one (9.1), so there is no transfer assumption. MP12b3 to MP17 still
come before the freeze, and the plan says so.

### 3.2 Phases, gates and scope

I agree with:

- the scope rule (P1 to P5 for Nightmare and Hell only);
- `W_screen` as a table under rule (c5);
- dropping the parallel P1 variant;
- P8 as an opt-in;
- raising P7 behind a spike;
- closing Hell 3;
- letting phase 1 run alongside phase 2.

Issues:

1. **Phase 0's completion gate on at least ten seeds is weak.**
   - 9 of 10 bounds completion only above 61 %, and a nearest-rank p95 of ten values is the maximum.
   - OD-P4 judges offers on 20 requests at 90 %.
   - I propose 20 seeds on the headline cells (18 of 20 bounds above 72 %, 20 of 20 above 86 %).
2. **Two thresholds are undefined.** "No regression on the passing cells" (phase 0's gate) has no number, and
   neither has (c5)'s "faster". The 0.5-clue tolerance is a choice, not a fit to data.
3. **The browser factor is unmeasured and seems pessimistic.** The planning rule turns today's 26x26 Nightmare
   (18.6 s) into 79 s, yet section 4 says the cell "passes today". Either the rule overstates the browser or
   the verdict is Node-only. The factor decides Hell 1, 10x10 and 12x12, and OD-P5 and OD-P7.
4. **Hell 1 on 196 and 576 cells.** R28 found eligible windows on 4 of 4 failing 14x14 sets and 3 of 4 24x24
   sets. Section 6's landscape names 215 to 676 cells and the frozen PM3 names 26x26 and 20x20 only.
5. **The frozen round's size is not stated** (Projection, from the measured T10s):
   - 20 seeds on 8 cells and their arms: about 2.5 h;
   - the before arm on the failing cells: about 3.6 h, unless difficulty-v3's frozen landscape serves;
   - non-regression: about 1 h;
   - the reduced PM1: about 1.7 h;
   - the spikes and probes: about 0.5 h;
   - in all about 5 to 9 h, against this round's 2.7 h.

### 3.3 The answers to IG-P-Q17 and IG-P-Q18, and the later-round items

**IG-P-Q17.** Agree.

- *Two rules:* (a) at the set level, with OD-P6, and (c5) for the screen.
- *(c1) dropped:* it can only hold by serving fewer sets.
- *(c4)* adopted at under 10 % of T10.
- *The arm that P2's table selects counts.*
- *Caveat:* the tolerance and "faster" need numbers (3.2 item 2), and the frozen arms need 20 seeds.

**IG-P-Q18.** Agree with all three parts:

- 1 (a): Hell 3 closed, a 47 to 84-point gap at the cap;
- 2: position (ii), with no PM3 for Hell 2 before PM1 records its central share;
- 3 (a): Hell 1 on 215 to 484 cells joins phase 3, OD-P6 first.

Add the 196 and 576-cell question (3.2 item 4).

**Later-round items** (`summary.md`, "Later round"):

- R09: frozen PM3. Agree.
- PM1: OD-P8, reduced. Agree. Keep part 3 (the failing Hell 1 sets), which feeds P4's table on 14x14 and
  24x24.
- P7 and the other D-IG9 items: the spike. Agree.
- D-IG7: frozen. Agree.
- The Hell 2 PM3: not now. Agree.

## 4. Speed before and after on the current source

T10 median in Node at four workers. Today is MP12b1, which is the `rating-v3` runtime (9.1).

| Cell | Today (ten of 20) | After `gen-v4` (Measured, provisional) | After all, likely (range) | Browser by the planning rule, after all (Projection) | Kind |
|---|---|---|---|---|---|
| 14x14 Nightmare | 113.0 s (11) | 8.9 s, n 3, 3 of 3 | 6.8 s (3.2 to 8.8) | 32 s (18 to 40) | after all: Projection (R31) |
| 15x15b10 Nightmare | 86.2 s (11) | 8.5 s, n 3, 3 of 3 | 6.4 s (3.1 to 8.3) | 31 s (17 to 38) | Projection (R31) |
| 12x12 Nightmare, no screen (default) | 62.1 s (17) | 16.5 s, n 6, 6 of 6 | 12.5 s (6.0 to 16.2) | 55 s (29 to 70) | Projection (R31) |
| 12x12 Nightmare, 190 M (OD-P7) | as above | 9.0 s, n 6 | 6.8 s (3.3 to 8.8) | 32 s | Projection (R31) |
| 26x26 Nightmare | 18.6 s (20) | 11.9 s, n 6 (190 M; the default arm is unmeasured) | 9.1 s (4.3 to 11.7) | 41 s | Projection (R31) |
| 16x16, 15x20 Nightmare | 79.8 s, 40.1 s (15 each) | not run (R09) | Fable 6 to 9 s | - | Projection only |
| 10x10 Nightmare | 24.0 s (19) | not run | 18.5 s (13.4 to 21.9), P7 only | 79 s | Projection |
| Hell 1 26x26 | 108.7 s (9) | 34.2 s, n 2 (no screen) | 23 s (10 to 31); 16 s with P11 | 99 s; 67 s | Projection (1, Q5) |
| Hell 1 20x20 | no set in 115 s | 42.9 s, n 2, 2 of 2 | 21 s (8 to 33); 14 s with P11 | 89 s; 61 s | Projection (1, Q5) |
| 14x14 / 26x26 Master | 2.57 / 8.36 s (20) | out of `gen-v4`'s scope | P6 x1.18 / x1.12 (Measured), with P7: 1.7 / 5.8 s | 12 / 28 s | Projection |

**Availability.** Completion after `gen-v4` is 3 of 3 or 6 of 6 on every Nightmare cell measured, against
11 to 17 of 20 today on the failing ones. The one-sided 95 % lower bounds are 37 % (3 of 3) and 61 % (6 of 6),
so a 90 % claim needs the frozen round. Hell 1 is withdrawn today (D39); after `gen-v4` it is generable in Node
on two boards (2 of 2 each), with no offer before OD-P4's gates.

## 5. Owner decisions

| Decision | Options | Evidence | Recommendation |
|---|---|---|---|
| IG-P-Q02 | (a) two budgets, reported; (b) one request deadline with a reserved batch share; (c) two budgets plus progressive delivery | 70 of 1,726 responses over 120 s today; calls up to 136.3 s (9.1); after `gen-v4` the set stage is 0.14 to 0.26 of T10; batch tails 2.3 to 5.2 times the median call (Q2) | **(b) now**: a 115 s request deadline with the set stage capped at about 40 % of it, P5's attempt limit, and a per-call work budget; the per-call budget is also what C2 needs |
| OD-P5 | (a) yes for Hell 1, and for 10x10 and 12x12 if the browser fails; (b) no; (c) decide after browser data | Hell 1 after `gen-v4`: 34 to 43 s in Node, 142 to 177 s by the rule; reaching 60 s needs factors at the top of their ranges (Q5) | **(a) in principle**; set the first-puzzle criterion (median and p95) and the count shown on time-out after a browser calibration |
| OD-P6 | (a) accept the set-level rule; (b) today's start counts; (a) after a blind play comparison | +1 to +3 clues at the median on Nightmare and Hell 1 (R32); (b) keeps today's failures (14x14: no in-band rating below +3) | **(a), conditionally**: per-cell two-sided reporting and the (c4) arm in the frozen PM3; the blind comparison (one Nightmare and one Hell 1 cell, a stated protocol) before phase 3's offers |
| OD-P7 | (a) no screen on up to 144 cells; (b) 190 M there | 12x12 x1.56 for +0.75 clues (n 6); by the rule 55 s (no screen, after all) against 32 s | **(a) as default**; decide after the P7 spike and a measured browser factor; the screen if the default misses 60 s |
| OD-P8 | approve or not the rest of PM1 tranche 1, reduced to Hell 1 and Hell 2 | Hell 1's P4 table on 215 to 484 cells; Hell 2's central share is unknown | **approve**, part 3 included; estimate it (most of the 9 worker-hours) before the budget |
| OD-P3, OD-P4 | as version 2 | IG-P-Q18 | agree |

## 6. Questions for Fable

- **IG-P-Q19.** Do 14x14 (196 cells) and 24x24 (576 cells) belong to `gen-v4`'s Hell 1 route and the frozen
  PM3? R28 found eligible windows on 4 of 4 and 3 of 4 of their failing sets, while section 6 names 215 to 676
  cells and the frozen PM3 only 26x26 and 20x20.
- **IG-P-Q20.** Will the frozen PM3 use 20 seeds on the headline cells (OD-P4's 20 at 90 %; ten gives no p95)?
  Will difficulty-v3's frozen landscape serve as the before arm? And what machine envelope does the round get
  (about 5 to 9 h by 3.2 item 5)?
- **IG-P-Q21.** The numbers behind three rules: phase 0's "no regression", (c5)'s "faster", and its 0.5-clue
  tolerance. Fixed now, or fitted from the frozen PM3?
- **IG-P-Q22.** The planning rule gives today's 26x26 Nightmare 79 s, yet section 4 says it passes. Should the
  factor be calibrated before OD-P5 and OD-P7, from existing browser records of offered cells or from a small
  browser probe in the frozen round?
- **IG-P-Q23.** C2 needs P5's per-call budget. May the frozen PM3 carry a spare-candidate arm with a
  deterministic per-call work budget once IG-P-Q02 is decided, and is its extra CPU acceptable in principle?

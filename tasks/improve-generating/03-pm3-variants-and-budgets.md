# IGP-03 — PM3 variants (W 95 and 380 M, no screen, arity 3) and the P5 budget inputs

| Header | Value |
|---|---|
| ID | IGP-03 |
| Depends on | IGP-01 (accepted and committed); IGP-02 (accepted): its per-`W` figures and its canonical cost by clue offset are read from `IGP-02/pm4.json` |
| Estimated size | Medium: about 330 new lines (the arity-3 branch of `ig-select-proto.js` about 60, `budgets.mjs` 120, `compare.mjs` additions 120, four manifests, the plan); about 1.5 to 2.5 hours of developer work; machine time about 23 minutes (allocation 28, a margin for slower rows), plus 5 for the optional shard |
| Owner role | Measurement prototype |
| Confirms or refutes | IG-P-Q09: work per accepted puzzle at 95, 190 and 380 M and without the screen on 14x14 and 12x12 Nightmare (R16); IG-P-Q17: how much of the speed-up and of the clue-count shift is the screen's, and how the shift depends on `W` (R32, R33); IG-P-Q08: the arity-3 set stage, every probe counted, with an idealised call-level T1 bound only (R20); IG-P-Q10: inputs for P5's per-level budgets (R21); the re-rating cost (R18); whether 380 M removes IGP-01's mixed 26x26 Master result (R07) |
| Design refs | `clarifications.md` IG-P-Q01 (re-rating), Q08, Q09, Q10, Q17 and its addendum after IGP-02; plan §3 P1 (parallel variant), P2, P3, P5; check-list §4 D-IG5, D-IG7, D-IG8, D-IG12 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

IGP-01 ran the prototype at one screen value per level. The plan author wants the final `W_screen` per level and area
class to minimise the total work per accepted puzzle (screens, canonical re-ratings, yield), with 95 M kept as a
control (IG-P-Q09); a parallel bracketing variant only for the set stage, adopted only if it gains after counting every
probe it rates (IG-P-Q08); and P5's budgets fitted per level from measured call costs (IG-P-Q10). This task gives first
inputs for those three on the cells where they matter most. Its samples are small (two seeds per cell and arm): PM4's
corpus (IGP-02) carries most of the `W` economics.

After IGP-02 the plan author is asked whether the prototype may move the accepted puzzles to more clues inside the band
(IG-P-Q17 and its addendum). PM4 found in-band ratings rare and dear at today's start count on 12x12, 14x14 and
15x15b10 Nightmare and Hell 1 26x26 and common two to four clues higher, and IGP-01's prototype served some requests on
sets today's search gives up on. This task therefore also runs the prototype without the screen (`W_screen` at the
canonical limit, 760 M) on 14x14 and 12x12 Nightmare. Beside the before arm and the screened arms on matched seeds, it
splits the gain and the shift between the search without the screen (P1, P3 on canonical caps, P4) and the screen (P2,
and P3's reading of a screen cap). It recommends no `W_screen`: that choice waits for the answer to IG-P-Q17.

## Scope

### In scope

- Variants `p1p5-w095`, `p1p5-w380`, `p1p5-w760` and `p1p5-main-a3`, with the arity-3 branch of
  `ig-select-proto.js` (the no-screen variant needs no code, §3).
- `budgets.mjs`; the per-`W`, split, shift, offset and arity-3 sections of `compare.mjs`; `plans/IGP-03.json`; the
  records.

### Out of scope

- Changing the default path of the prototype (with `a3` false the code path is IGP-01's).
- Hell 1 at 190 M, the W variants on other cells, a request-level scheduling model of the arity-3 variant (later
  round).
- The window re-rating variant (D-IG7's other reading), deferred after the IGP-02 review. On IGP-01's journals its
  trigger (phase A ends without a hit, the bracket closed, the `loAbove` probe screen-capped) occurs on 2 of the 39
  calls on 12x12 Nightmare, 7 of 48 on 14x14 and 10 of 47 on Hell 1 26x26. It re-rates probes one clue below the
  window count, so it acts on the clue-count shift and is measured with the criterion that IG-P-Q17's answer chooses.
  A prototype of such a criterion (for example the addendum's (c4)) is out of scope too, unless the owner adds it.

## Repository rules

The check-list §3 and §7. Locked commands through the runner only; no git.

## Inputs & context

- IGP-01's prototype (`ig-select-proto.js`), its arms `before` (`log`) and `after` (`p1p5-main`, W 190 M on Nightmare)
  and their published records.
- The set stage: `setAttempt` runs one `selectClues` call per attempt; the pool runs attempts in parallel and consumes
  the lowest successful one (`generate.js:86-147`); the journal tags these calls `stage: 'set'` with their `attempt`.
- IGP-01's records: `before|after/<shard>.runs.json` (per request `details.setAttempt`, `details.igSetKey`,
  `details.K`, `details.puzzles[].clues`), the journals, whose `start` lines carry `stage`, `attempt`, `K`,
  `startCount` (today's start count), `priorCount` and `W`, and `compare-r2.json` (the population section, the format
  of the per-`W` population table).
- IGP-02's `pm4.json`: per cell `perW.<W>` (`usefulLost`, `cost`, `perUseful`) and `costByOffset.<bucket>` (`n`,
  `capped`, `cappedShare`, `useful`, `msMedian`; buckets `<0`, `0` to `4` and `>4` of the offset from the start
  count). `pm4.mjs` is not modified (IGP-02's `run.json` pins its hash).

## Design

### 1. Variants

| Variant | Extends | Params | Purpose |
|---|---|---|---|
| `p1p5-w095` | `p1p5` | `W { default: 95000000 }` | the control (IG-P-Q09) |
| `p1p5-w380` | `p1p5` | `W { default: 380000000 }` | the upper value |
| `p1p5-w760` | `p1p5` | `W { default: 760000000 }` | no screen (§3): the split of IG-P-Q17's addendum |
| `p1p5-main-a3` | `p1p5-main` | `a3: true` | the arity-3 set stage (IG-P-Q08) |

### 2. Arity-3 set stage (`IG.a3` and `ctx.igStage === 'set'`)

It replaces only the bisection of phase A; the gallop stays sequential.

```text
while no hit and both ends known and hiBelow - loAbove > 1:
  g = hiBelow - loAbove
  counts = distinct values of loAbove + max(1, floor(g / 4)), loAbove + floor(g / 2), loAbove + max(1, floor(3 g / 4)),
           kept inside (loAbove, hiBelow), ordered middle, lower, upper          # one fixed probe tree
  rate every count of the round on the family (fam(c)), all of them, journaled under phase 'locate-a3'
  then, in the same order, afterProfile for each; a final result ends the call (the remaining probes were wasted and
  stay in the journal)
  the first IN or IN-REFUSED in that order is the hit; else loAbove = the largest above-side count of the round (or
  the old one), hiBelow = the smallest below-side count (or the old one); if they cross, keep only the middle
  probe's side
  journal the round: { probes: [{ count, side, ms }], serialMs: sum of ms, criticalMs: max of ms }
```

The probes and their subsets depend only on the family order, never on the width. The record gives every probe, the
wasted ones included, and per set-stage call the rounds with their serial and critical times. Its T1 figure is an
**idealised call-level Projection**: for the call that produced the request's set (the lowest successful attempt), T1
minus Σ over its rounds of (serialMs − criticalMs), assuming that three lanes were idle for each round. The real set
stage already runs attempts in parallel on the pool and consumes them in order, so this is a lower bound on T1, not a
measured gain; the record states the assumption and shows how many attempts were in flight when the winning call ran
(from the journal). Nothing is adopted from it (IG-P-Q08).

### 3. No-screen arm (`p1p5-w760`)

`W` equal to `DEDUCE.work` (760 M, `core/engine/policy.js`) makes `screened` false in `ig-select-proto.js` (`const
screened = W < DEDUCE.work`): `rateScreen` returns the canonical rating, `recordRating` gets `W` null, a capped probe is
journaled `capped` (not `scap0`) and reads as too few clues (P3 on a canonical cap), no probe is screen-capped and
nothing is re-rated. Everything else is IGP-01's prototype (the same prior, phases and early stop), so the arm needs no
code. `compare.mjs` checks its journals (every `start` line has `W` 760,000,000; no `scap0`, `scap1` or `over` outcome;
no re-rating) and fails otherwise. Its rows can be slower than the screened arms': every capped probe costs a full
canonical rating (about 2 s on these cells, PM4).

### 4. P5 budget inputs (`budgets.mjs`)

`node tools\ig-proto\budgets.mjs --arms IGP-01/after,IGP-03/w095,IGP-03/w380,IGP-03/w760,IGP-03/a3 --label <L>`: from
the journals, per arm, cell and stage, each call's cumulative work in probe order (screens and re-ratings); for budgets
B = 1, 2, 4, 6, 8 and 12 G units: `okBeyond` (the share of ok calls whose cumulative work passed B before their result:
such a call would have been stopped at B, but it might still have returned an earlier retained candidate, and a probe
already running when B passes overshoots it), `failedAbove` (the work of failed calls above B), unfinished calls apart;
the median work rate per arm (units per ms over all tuples) to show B in seconds. Writes
`docs/improve-generating/evidence/<L>/IGP-03/budgets.json|md`. It changes no search: P5's budgets stay recorded, not
enforced (D-IG9), and the record says these are inputs, not fitted budgets.

### 5. Comparison

`compare.mjs` accepts task-qualified arms (`IGP-01/after`) and pairs matched seeds only; `--pm4 IGP-02` names the PM4
record it reads. Pairs: `IGP-01/before:w095`, `IGP-01/before:w380`, `IGP-01/before:w760`, `IGP-01/after:w095`,
`IGP-01/after:w380`, `IGP-01/after:w760` and `IGP-01/after:a3`. It adds:

- per `W` (95, 190 from IGP-01, 380, and none: the w760 arm) and cell: T10 and response (`summarize`), completion,
  work per accepted puzzle, profiles per accepted puzzle, capped probes (screen-capped; canonically capped for w760),
  re-ratings per call and their share of work, useful ratings lost (screen-capped probes whose canonical re-rating was
  in band), unfinished calls, and the `W` with the least median work per accepted puzzle on these two seeds (R16,
  descriptive), with IGP-02's figures for the cell and `W` beside it (`pm4.json` `cells.<case>.perW.<W>`: useful
  ratings lost, `cost.saving`, `perUseful`);
- per `W` and cell, the population of the accepted puzzles (R32, as IGP-01's `compare-r2`): clue share p10 / median /
  p90, U, score position and central share, beside the before arm and MP12b1's 20 reps, so that the dependence of the
  clue-count shift and of the speed-up on `W` is read together;
- the split (R33) on 14x14 and 12x12 Nightmare, and on Hell 1 26x26 when its optional shard ran: T10 (by the
  check-list §5 rule, response time and completion where an arm lacks T10, as on 14x14 Nightmare reps 0-1 today) and
  median clue share for the before arm, w760, w380, w190 (IGP-01's after arm) and w095, with the paired factors before
  → w760 (the search without the screen) and w760 → w190 (the screen), each with its n;
- the two parts of the clue-count shift (IG-P-Q17's addendum), per arm and cell: (i) the set each request was served on
  (`details.setAttempt`, `details.igSetKey`), counting the requests served on an earlier set than the before arm's;
  (ii) on requests served on the same set (equal `igSetKey`), the difference of the median accepted clue count against
  the before arm and against the w760 arm, per request and its median;
- clue offsets from today's start count (the `startCount` of the journals' `start` lines; PM4's buckets): per arm and
  cell, the accepted puzzles by offset, and the probes by offset (count, capped share, in-band share, median ms) beside
  IGP-02's canonical cost by offset of the cell (`pm4.json` `cells.<case>.costByOffset`);
- 26x26 Master at 380 M against IGP-01's after arm (190 M) and before arm on reps 0-4: screen-capped probes, the paired
  T10 ratio and the accepted puzzles by offset (R07);
- for `a3`: probes per set-stage call against IGP-01's after arm on the same seeds (wasted probes included), the
  rounds, serial and critical ms, the idealised call-level T1 bound and the measured T1 of both arms (R20).

Every split, shift and offset table is labelled a two-seed indication. No `W_screen` is recommended: R16's minimiser is
descriptive, and the choice per level waits for the answer to IG-P-Q17 and the frozen round.

## Cells, seeds and sample sizes

| Arm | Variant | Cells and reps | Row limit R | Paired with (matched seeds) |
|---|---|---|---:|---|
| w095 | `p1p5-w095` | 14x14-nightmare 0-1; 12x12-nightmare 0-1 | 260 s | IGP-01 before and after, reps 0-1 |
| w380 | `p1p5-w380` | the same; and 26x26-master 0-4 (shard `fast-master`) | 260 s; 90 s for 26x26-master | IGP-01 before and after, reps 0-1 (26x26-master: 0-4) |
| a3 | `p1p5-main-a3` | 14x14-nightmare 0-1; 26x26-hell-1 0-1 | 260 s | IGP-01 after, reps 0-1 |
| w760 | `p1p5-w760` | 14x14-nightmare 0-1; 12x12-nightmare 0-1 | 260 s | IGP-01 before and after, reps 0-1 |
| w760, optional shard | `p1p5-w760` | 26x26-hell-1 0-1 | 260 s | IGP-01 before and after, reps 0-1 |

Four workers; one row per invocation on the 260 s shards (check-list §7); the five 26x26 Master rows share a 90 s shard
(added after the IGP-01 review: does W = 380 M remove that cell's mixed result and its screen-capping?). Each arm's
accepted ratings are verified canonically (`verify.mjs`; for w760 this checks the tree, its ratings being canonical
already). The optional shard runs only when the orchestrator passes `-IncludeOptional`: with the owner's approval of
extra round minutes, or when at least 97 minutes are left in the round at dispatch (check-list §7).

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/variants/p1p5-w095.json`, `p1p5-w380.json`, `p1p5-w760.json`, `p1p5-main-a3.json` | new |
| `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js` | the arity-3 branch only |
| `tools/ig-proto/budgets.mjs` | new |
| `tools/ig-proto/compare.mjs` | task-qualified arms; the per-`W`, split, shift, offset and arity-3 sections; the w760 journal check |
| `tools/ig-proto/self-test.mjs` | arity-3 cases in `--proto` |
| `tools/ig-proto/plans/IGP-03.json` | new |
| `docs/improve-generating/evidence/provisional/IGP-03/` | new records |

## Implementation steps

1. The arity-3 branch, with self-test cases: on the synthetic curve of IGP-01 (no prior, K = 15, `a3` on, stage
   `set`), the first round after the gallop probes the counts 4, 2 and 5 (`g = 6` between 1 and 7: 1 + 3, 1 + 1, 1 + 4)
   in that order and hits at 4; the two other probes are journaled as rated; with `a3` on and stage `batch` the path is
   IGP-01's. `rerate` other than `end` still throws (the window reading is deferred).
2. Re-run `self-test.mjs --proto`: the IGP-01 cases still pass unchanged (the default path).
3. `budgets.mjs`, the comparison additions with the w760 journal check of §3, the plan; run it; `npm run check`; the
   firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-03.json` (allocation 28 minutes, `optionalMinutes` 6; the runner adds `--label`
and `--source-label`; arm steps are `tools/ig-proto/arm.mjs run --task IGP-03 ... --workers 4 --row-limit-s 260`
unless stated):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-03` | | |
| trees | no | `tools/ig-proto/lib/tree.mjs build base p1p5-w095 p1p5-w380 p1p5-w760 p1p5-main-a3` | | |
| self-test-proto | yes, once | `tools/ig-proto/self-test.mjs --proto` | 135 | `IGP-03/self-test/state.json` |
| w095-14x14, w095-12x12 | yes, until done | `--arm w095 --shard <case> --variant p1p5-w095 --cases <case>:0-1` | 330 | `IGP-03/w095/<case>/state.json` |
| w380-14x14, w380-12x12 | yes, until done | the same with `--arm w380 --variant p1p5-w380` | 330 | |
| w380-master | yes, until done | `--arm w380 --shard fast-master --variant p1p5-w380 --cases 26x26-master:0-4 --row-limit-s 90` | 120 | `IGP-03/w380/fast-master/state.json` |
| a3-14x14, a3-hell1 | yes, until done | `--arm a3 --shard <case> --variant p1p5-main-a3 --cases 14x14-nightmare:0-1` and `26x26-hell-1:0-1` | 330 | |
| w760-14x14, w760-12x12 | yes, until done | the same as w095 with `--arm w760 --variant p1p5-w760` | 330 | `IGP-03/w760/<case>/state.json` |
| w760-hell1 | yes, until done; optional | `--arm w760 --shard 26x26-hell-1 --variant p1p5-w760 --cases 26x26-hell-1:0-1` | 330 | `IGP-03/w760/26x26-hell-1/state.json` |
| verify | yes, until done | `tools/ig-proto/verify.mjs --task IGP-03 --arm w095,w380,w760,a3` | 210 | `IGP-03/verify/state.json` |
| publish (each arm) | no | `tools/ig-proto/arm.mjs publish --task IGP-03 --arm <arm>` | | |
| budgets | no | `tools/ig-proto/budgets.mjs --arms IGP-01/after,IGP-03/w095,IGP-03/w380,IGP-03/w760,IGP-03/a3` | | |
| compare | no | `tools/ig-proto/compare.mjs --task IGP-03 --pairs IGP-01/before:w095,IGP-01/before:w380,IGP-01/before:w760,IGP-01/after:w095,IGP-01/after:w380,IGP-01/after:w760,IGP-01/after:a3 --reference mp12b1 --pm4 IGP-02` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-03` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-03 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

`-IncludeOptional` is added only under the rule stated in "Cells, seeds and sample sizes".

Projection: sixteen rows on the 260 s shards (one per invocation, check-list §7) and five 26x26 Master rows in one 90 s
invocation. The screened arms run at about IGP-01's after-arm speed (14x14 Nightmare about 10 s, 12x12 about 8 s, Hell
1 26x26 about 35 s, 26x26 Master about 14 s per request). The w760 arm is slower: pricing every screen-capped probe of
IGP-01's after-arm journals as a canonical cap at PM4's median time (about 2.2 s) gives 2.8 to 3.3 times the rating
time on 14x14 Nightmare and 2.1 to 2.2 on 12x12 for reps 0-1 (an upper estimate for the same path, a Projection), so
about 18 to 25 s and 10 to 23 s per request; a search without the screen that fared like today's would take up to
today's 157 to 185 s on 14x14. In all about 390 s of rows with their overhead, one verify invocation (about 100 s),
the self-test (about 30 s): nineteen locked commands, about 8.5 minutes of node time and 14 of quiet periods, 23
minutes in all (allocation 28; about 30 if the w760 rows took today's time). The optional shard (Hell 1 26x26 without
the screen: 1.4 to 1.5 times the after arm's rating time on the same pricing, about 55 to 60 s per request) adds two
rows and about 40 s of verification (about 5 minutes).

## Record formats

- Published arms, `verify-<arm>.json|md` (as IGP-01).
- `budgets.json`: `{ meta, budgets: [1e9, 2e9, 4e9, 6e9, 8e9, 12e9], arms: { '<arm>': { workPerMs, cells: { '<case>': {
  '<stage>': { okCalls, failedCalls, unfinishedCalls, okBeyond: { '<B>': share }, failedAbove: { '<B>': units } } } } } }
  }`; `budgets.md` with one table per cell and the caveats of §4.
- `compare.json|md` with the per-`W` table (R16, IGP-02's figures beside), the per-`W` population table (R32), the
  split table (R33), the two shift tables (sets served; the same-set clue shift), the offset tables beside PM4's cost
  by offset, the 26x26 Master table (R07), the arity-3 table (R20, labelled a Projection) and the re-rating figures
  (R18); the split, shift and offset tables labelled two-seed indications.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-03-B01 | On 14x14 and 12x12 Nightmare, work per accepted puzzle, T10 and completion are given at 95, 190 and 380 M and without the screen on matched seeds, with the losses (re-ratings, useful ratings lost) and IGP-02's figures beside them, labelled as two-seed indications; no `W_screen` is recommended | `compare.md` |
| IGP-03-B02 | The arity-3 set stage is measured counting every probe, wasted ones included; its T1 figure is labelled an idealised call-level Projection with its assumption | `compare.md` |
| IGP-03-B03 | P5's budget inputs per cell and stage exist for six budgets, with their caveats | `budgets.md` |
| IGP-03-B04 | The split (R33) on 14x14 and 12x12 Nightmare: the factors before → w760 → w190 with their n, the population per arm, the two parts of the shift (sets served; the same-set clue shift) and the accepted puzzles and probes by clue offset beside PM4's cost by offset, labelled a two-seed indication | `compare.md` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-03-T01 | With `a3` false the prototype's path is IGP-01's (the IGP-01 self-test cases pass unchanged; `rerate` other than `end` still throws); the new self-test cases pass; the w760 journals pass the check of §3 | self-test output; `compare.md` |
| IGP-03-T02 | Every accepted rating of every arm equals its canonical rating | `verify-<arm>.md` |
| IGP-03-T03 | Locked commands within their bounds, in `invocations.jsonl`; no started row rerun; records per the check-list §3; `npm run check` and the firewall check pass | runner log; command output |

## Test plan

The `--proto` self-test with the new cases; the verify steps; the run plan.

## Definition of done & handoff

- The reply gives the per-`W` table, the split and the two parts of the shift, the 26x26 Master result, the arity-3
  result with its label, the budget table, the counted machine time and the lock waits.
- Handoff to IGP-07 and to the next report on IG-P-Q17: `compare.json`, `budgets.json`.

## Follow-up IGP-03h: the no-screen arm on Hell 1, and more 12x12 seeds (optional)

IGP-03's optional shard did not run: the round had 93.1 minutes left at its dispatch, under the rule's 97. It becomes
a follow-up with its own task id, so that IGP-03's published records stay as they are; after the IGP-05 review it gains
two optional parts. It runs after IGP-06 and before IGP-07 (check-list §7): the required part when at least 8 minutes
are left in the round, the optional parts too (`-IncludeOptional`) when at least 20 are left; otherwise they are
frozen-round items. It needs no measurement code: the variants `p1p5-w760` and `p1p5-main` and every tool exist; a
report-only addition to `compare.mjs` is allowed for part 2. Its tree ids differ from IGP-03's if IGP-04 changed
`ig-select-proto.js` (the `withP6` call); the default path stays IGP-01's, and the records name the tree ids.

1. *Required.* Hell 1 26x26, reps 0-1, without the screen: R33 on Hell 1 (IG-P-Q17, the addendum after IGP-03). The
   record gives the split before → no screen → 380 M (IGP-01's after arm), the sets served, the same-set clue shift and
   the clue offsets beside PM4's cost by offset, labelled a two-seed indication.
2. *Optional.* Hell 1 20x20, reps 0-1, without the screen (added after the IGP-05 review): the first request-level
   indication on a Hell 1 cell of 215 to 484 cells. Today's search makes no set there: MP12b1's prescreen
   (`docs/difficulty-v3/landscape-v3-full/20x20-hell-1-s3-2026-11-14.json`) delivered no puzzle in three requests, each
   stopped at the 115 s time limit. PM1 found in-band, eligible ratings in all four of its families, 7 to 14 clues
   above today's start count, two of eleven above 380 M of main work. The prior table has no entry for this cell, so
   the prototype starts at K − 8 (`U0`) and searches down. The record gives ten of n, T1, T10 or the response, the
   accepted puzzles' clue shares, offsets and score positions, and MP12b1's prescreen outcome beside them. If
   `compare.mjs` drops a cell without a before partner, it gains an arm-only section (report only).
3. *Optional.* 12x12 Nightmare, reps 2-5, without the screen (`w760`) and at 190 M (`main`, variant `p1p5-main`): four
   more seeds for the screen's speed factor and its same-set clue shift, on which (c5) of IG-P-Q17's addendum after
   IGP-03 rests (two seeds there). `main` rep 2 must reproduce IGP-01's after arm (equal `resultDigest`; a difference is
   a stop). The record gives, per seed, the T10 ratio no screen / 190 M and the same-set clue shift 190 M − no screen,
   beside IGP-03's reps 0 and 1.

No `W_screen` is recommended.

The run plan `tools/ig-proto/plans/IGP-03h.json` (allocation 6 minutes, `optionalMinutes` 12; arm steps are
`tools/ig-proto/arm.mjs run --task IGP-03h ... --workers 4 --row-limit-s 260`):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-03h` | | |
| trees | no | `tools/ig-proto/lib/tree.mjs build base p1p5-w760 p1p5-main` | | |
| w760-hell1 | yes, until done | `--arm w760 --shard 26x26-hell-1 --variant p1p5-w760 --cases 26x26-hell-1:0-1` | 130 | `IGP-03h/w760/26x26-hell-1/state.json` |
| w760-hell1-20x20 | yes, until done; optional | `--arm w760 --shard 20x20-hell-1 --variant p1p5-w760 --cases 20x20-hell-1:0-1` | 260 | `IGP-03h/w760/20x20-hell-1/state.json` |
| w760-12x12 | yes, until done; optional | `--arm w760 --shard 12x12-nightmare --variant p1p5-w760 --cases 12x12-nightmare:2-5` | 60 | `IGP-03h/w760/12x12-nightmare/state.json` |
| main-12x12 | yes, until done; optional | `--arm main --shard 12x12-nightmare --variant p1p5-main --cases 12x12-nightmare:2-5` | 50 | `IGP-03h/main/12x12-nightmare/state.json` |
| verify | yes, until done | `tools/ig-proto/verify.mjs --task IGP-03h --arm w760` | 90 | `IGP-03h/verify-w760/state.json` |
| verify-main | yes, until done; optional | `tools/ig-proto/verify.mjs --task IGP-03h --arm main` | 40 | `IGP-03h/verify-main/state.json` |
| publish-w760 | no | `tools/ig-proto/arm.mjs publish --task IGP-03h --arm w760` | | |
| publish-main | no; optional | `tools/ig-proto/arm.mjs publish --task IGP-03h --arm main` | | |
| compare | no | `tools/ig-proto/compare.mjs --task IGP-03h --pairs IGP-01/before:w760,IGP-01/after:w760 --reference mp12b1 --pm4 IGP-02` | | |
| compare-c5 | no; optional | `tools/ig-proto/compare.mjs --task IGP-03h --pairs main:w760 --reference mp12b1 --out-dir docs/improve-generating/evidence/provisional/IGP-03h/c5` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-03h` | | |

Projection. Part 1: two rows of about 55 to 60 s (IGP-01's after arm on these seeds, 42.2 and 37.2 s, times 1.4 to 1.5,
the pricing of the projection under Commands), each in its own invocation, and the verify invocation: about 5 minutes.
Part 2: two rows of at most the 115 s time limit each, in their own invocations: about 4 to 6 minutes. Part 3: eight
rows of about 5 to 15 s (IGP-03: 9.2 s without the screen, 7.9 s at 190 M), two to an invocation where the horizon
admits them, and `verify-main`: about 6 minutes. In all about 16 minutes (allocation 18 with the optional parts).
Records under `docs/improve-generating/evidence/provisional/IGP-03h/` (the arms, `verify-<arm>.json|md`,
`compare.json|md`, `c5/compare.json|md`). Acceptance: IGP-03-T02 and T03 for these arms, the w760 journal check of §3,
part 3's identity check, and the content of parts 1 to 3 in the comparisons.
## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IGP-03 ACCEPT, no fixes; the `compare.md` arity-3 wording is corrected in IGP-04's step 0) |
| Start | 2026-11-15 02:28 (+07:00) |
| End | 2026-11-15 03:06 developer (plan 02:47-03:04, exit 0); 03:20 author acceptance; orchestrator commit |
| Duration | 38 min developer; 13 locked invocations (node 364.6 s, counted 949.6 s of the 28 min allocation); IGP-03-dev 1 run (46.2 s counted); priority waits 648.3 s; round counted 6,212 s of 10,800 s |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (pack author review, opus-ig); claude-opus-5.5 (orchestrator) |
| Token usage | 100 model calls; 26,752,573 input tokens (26,342,722 cache reads); 157,115 output tokens |
| AI credits | about 523 (developer) |
| Verification | New variants `p1p5-w095`, `p1p5-w380`, `p1p5-w760`, `p1p5-main-a3`, `budgets.mjs`, `plans/IGP-03.json`; arity-3 branch in `ig-select-proto.js`; `compare.mjs` study sections and the no-screen journal check; self-test 15/15; 295/295 accepted ratings equal canonical; the w760 journals carry no screen outcome; the a3 arm reproduces IGP-01's after-arm puzzles on all four requests (`resultDigest`, `igPuzzleKeys`); `npm run check` passes; firewall 279 production files unchanged. Harness hashes: shards `a76d9d72…`, report-only `compare` re-run `1cc49822…`. Evidence: `docs/improve-generating/evidence/provisional/IGP-03/` |
| Acceptance | B01-B04, T01-T03 met (developer; confirmed by the pack author) |
| Issues & resolutions | (1) Two-seed indications, T10 / work per accepted puzzle: 14x14 Nightmare today 0 of 2 reach ten (response 170.8 s), 95 M 4.64 s, 190 M 7.21 s, 380 M 11.22 s, no screen 17.73 s; 12x12 Nightmare today 50.4 s, 95 M 6.12 s, 190 M 7.94 s, 380 M 10.15 s, no screen 9.15 s. No W recommended. (2) **R33 split:** 12x12 before -> no screen x8.06 at today's median clue share (0.211 = MP12b1), no screen -> 190 M x1.14 with one more clue; 14x14 every arm serves set 0 (today attempts 1 and 3) and accepts at +2 to +4 clues, the screen adds x2.6 with no same-set clue shift. Added to IG-P-Q17 as a second addendum by the pack author (new option (c5); the first addendum overstated the shift's share). (3) 26x26 Master at 380 M: screen caps 39 -> 4 of about 520 probes, the per-seed result stays mixed (0.54-2.24, geometric mean 0.98); the prototype accepts about one clue fewer than today. (4) Arity 3 (projection): no gain on identical results (Hell 1 T1 9.12 s against 8.55 s). (5) P5 inputs: no call failed; share of ok calls beyond 1 G 14-15 % (190 M), 37-40 % (no screen). (6) Deviations accepted: 13 invocations instead of 19 (two fast rows per invocation, no bound loosened); `compare.json` overwritten by a report-only re-run before the reply (rule clarified in the check-list; arm rows, journals and states never rewritten); tree ids changed by the arity-3 edit with default behaviour unchanged; per-case sections once per study arm; extra field `okOvershoot`. The optional Hell 1 no-screen step becomes IGP-03h |
| Handoff | IGP-04 (amended): depends on IGP-03; pair arms by seed, never by tree id; arm E must reproduce IGP-01's after-arm digests on both seeds or the task stops; step 0 fixes the arity-3 wording in `compare.mjs`; about 23 min likely, allocation 28. IGP-03h (Hell 1 no screen, about 5 min) after IGP-06 if at least 8 min remain. IGP-07 projects R31 from the no-screen arm and covers R32/R33 |

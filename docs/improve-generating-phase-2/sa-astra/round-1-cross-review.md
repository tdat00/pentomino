# Phase 2, round 1 cross-review — SA-Astra

| Item | Value |
|---|---|
| Author | SA-Astra |
| Repository, branch, inspected commit | `pentomino`, `gen-v4`, `7c1bad226830667fa6626ff97c960ca3bddd7794` |
| Reviewed | SA-Opus's `round-1-analysis.md`; his cross-review, especially the superseding coordination in §8 |
| Status | Cross-review complete; technical reconciliation accepted by both SAs on 2026-11-25; owner questions Q-P2-1 and Q-P2-5 remain |
| Evidence notation | [V] read/recomputed from the repository; [A] proposal, forecast or assumption |
| Authority | The owner's request and D-S24-35; plan v4 remains binding. Neither old analysis nor frozen evidence is rewritten. |

## 1. Conclusion

The two initial prices described different studies, not competing measurements of one study. The reconciled
recommendation has 998 unconditional request observations and an allowance for 15 conditional uncapped twins:
**1,013 planned rows**, four proof bundles, eight resource replays and six browser checks. Its projection is
**651.913 counted minutes**, with **810.767 guard minutes**, rounded independently by stage to **410 + 402 = 812
minutes**. This is a spend envelope, not an assurance of completion [A].

I accept conditional P5 twins with the exact outcome accounting in §3.3, the 140 non-table sentinel rows, the
50-row `require` design, the original validation seeds as a source-port replication, and `screen-v4-v1`. We
retain the fixed three-cell (c5) panel. No table is refitted. The non-table timings are explicitly weak
adjacent-cell proxies: their full-row-limit stress scenario needs 1,303 minutes, not 812 [A].

SA-Opus independently reproduced all 1,013 row prices and both schedules, then accepted these details in his
cross-review §8.6. I accept his final plain-language refinement of the no-window texts (§6 below). No technical
disagreement remains.

The Generator retains two separate user-action clocks; the gen-v4 automatic CLI/bench request has the shared
46/115/120-s scope. Both get a real host response guard. Exact legacy routes, historical phase-0 FAIL, closed
Hell 1 offers and old record compatibility remain unchanged.

## 2. Agreements and corrections to SA-Opus's analysis

These are source checks, not acceptance merely because the other report says so. Most corrections below have
already been accepted in his cross-review §8.

| Subject | Cross-review finding and agreed direction | Evidence at the inspected commit |
|---|---|---|
| Port strategy | Port the frozen semantic path, not its patch composition as production runtime. Preserve P6. Select P1–P5 only through one board/level route predicate; keep today's search on lower levels and the full 26x26 Nightmare board. | [V] `plan.md` v4 §3, §6, §9; `stage4-report.md:366–368`; `variants/fr-frozen*.json` |
| 26x26 user effect | The Generator currently caps desktops at 484 and phones at 360 active cells; that does **not** make the route irrelevant to users. CLI `maxActive` defaults to 676. Withdraw the proposed exception for every board above 576. | [V] `generator/state.js:322–324`, `core/engine/qualification.js`; `tools/generate.mjs:40,63,204–206,548–562` |
| Exact predicate | Nightmare, normalized `board.width === 26`, `board.height === 26`, 676 active cells. Rotation does not change it. An arbitrary 676-cell shape or a masked 26x26 is not the exception. Apply the route to calibration, batch and completion/replay paths. | [V] D-S24-35 in `request.md:35–40`; normalized board fields; [A] common predicate |
| Existing host deadline | `TIME.responseMs` being defined is not an implemented hard guard. The client calls `finish(job)` before awaited pack assembly. The new guard must return the accepted, validated prefix without awaiting a blocked assembly and reject late results. | [V] `policy.js:69`; `generation-client.js:1172–1217`; `variants/live.json` `lv-14`–`lv-19` |
| Clock domains | Generator jobs use `Date.now`; the pool uses `performance.now`. Do not pass an epoch reading as a monotonic origin. Human-separated set and puzzle actions get fresh origins; no clock spans the pause. | [V] `generator/jobs.js:201,303–440`; `worker-pool.js:132–135,630–647` |
| Combined requests | Keep the 46-s set reserve and one 115/120-s scope for automatic **gen-v4-route** CLI/bench requests. The reserve protects a following batch, not a standalone action. Legacy-route lower levels and 26x26 retain their old search/timer scope. | [V] `generate.mjs:530–562`; `live.json` `lv-9`–`lv-14`; [A] explicit route-scoped production API |
| Completion gate | At least 18 of 20, not 20 of 20. Missing/invalid rows are not passes. Report responses beyond 120 s separately; use capped T10 in the ratios. Hell 1 is reported, not an offer or a blocking phase-2 gate. | [V] governing plan `:589–645`; frozen verdicts |
| Prior coverage | Exact lookup, otherwise K−8/step 8, remains the algorithm. We need real non-table-path observations. The 29/295 and 20/236 figures are counts of W≤H rectangles, not user-frequency estimates. | [V] own audit; `levels.js:22–34`; `prior-s3-v1.json`; `ig-select-v4.js:194–205` |
| Identity | Seven gen-v4 keys: `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`, `screenTable`. Budgets, bound, route and deadlines belong to the immutable algo definition, not an eighth key. | [V] frozen seven-key contract in `variants/v4.json`; [A] same production contract |
| Table IDs | `prior-s3-v1`; new **`screen-v4-v1`**, because only 196–256-cell Nightmare boards use 190 M. Reusing `screen-s3-v1` would name a different table, which also screens upper/large classes. | [V] `V4-S3/freeze.json:57–106`; `V4-S4F/verdicts.json`; [A] production ID |
| Replay null | A stored `igPrior: null` means omit the explicit override on replay so table lookup applies. Passing an explicit null disables the table and is wrong. The completion pass takes no per-set override. | [V] `v4.json` `pv-17`; `v4-ps.json`; `ig-select-v4.js:194–205` |
| Legacy records | Read by the record's own version shape. Retain the old fixture unchanged; gen-v3 replay is unavailable with `set-versions`, not invalid/corrupt. Do not restamp old set origins, lose histories, or trust reloaded session-only calibration. Include the running table tuple in the replay-cache identity. | [V] `pack.js`, `replay.js`, `generator/state.js:72,983–985`, `generator/ui/replay-cache.js`; governing plan §9 |
| Budget/replay limit | “At most 2 × 40 G” is not a replay-work bound. The budget is tested before the next primitive and can overshoot in the last one; replay also charges its event stream. Derive and verify the replay allowance from actual replay/counter evidence. | [V] `ig-select-v4.js:407–426,624–638,1302–1325`; `v4-p5.json` |
| Prior `require` work | `require` ran in parity/replay and earlier pilots. No stage-4 validation row used it. The qualification of the original claim matters. | [V] T04/T07 and parity items; `stage4-report.md:189–190` |
| Reach claims | Zero observed false stops does not validate the four-attempt bound: it never fired naturally. Stage 4 also did not exercise budget stops or rescue/tail re-rating. Add focused real-engine and scripted boundary cases; report zero reach honestly. | [V] `stage4-report.md:157–204,281–291` (F2/F4/F7) |
| Worker width | Production pools are 1, 2 and 4. Width 8 is a fold simulation, not a real eight-worker pool or a browser performance test. | [V] `worker-pool.js:75`; phase-1 P1-02 |
| Hell 1 diagnostics | Keep the offer override in an identified measurement copy, not a latent production option. No phase-3 offer work enters this change. | [V] `variants/instr.json`; governing phase-2 scope |

The CLI/bench clock sentence above deliberately says **gen-v4-route**. Applying it globally to Master or the
legacy 26x26 exception would widen the change and undermine the promised legacy isolation.

## 3. Reconciled validation design

### 3.1 Fixed primary population

All generation rows use four workers, cold requests, quantity ten, no post-request landscape sampling and an
identified source/observer configuration. `today` means phase-1 source `6b94ffb`, not a relabelled frozen
`3fc65f4` timing [A]. Source digests and event/work/skip receipts are checked before reading ratios.

| Component | Cells × repetitions × arms | Rows |
|---|---|---:|
| Shipped Nightmare/Hell 1 paths | 19 × 20 × 1; full 26x26 Nightmare uses the legacy route | 380 |
| Today's Nightmare controls | 10 × 20 × 1, including 26x26 | 200 |
| Legacy Master identity | 16 × 5 × 2 | 160 |
| Fixed n-mid no-screen comparator | 3 × 20 × 1 | 60 |
| Primary subtotal | | **800** |
| Non-table sentinels (§3.4) | 3 × 20 × 2 + 1 × 20 | **140** |
| `require` (§3.5) | 2 Nightmare × 5 × 3 + 2 Hell 1 × 5 × 2 | **50** |
| Separate port smoke (§3.2) | 8 × 1 | **8** |
| Conditional uncapped twins | 10 historical triggers + allowance for 5 new triggers | **15 planned** |
| Total planned | 998 unconditional + 15 conditional | **1,013** |

- Frozen repeat seeds are `landscape/<cell>/<rep>`, reps **20–39**; Master **20–24**.
- This is a **source-port replication**, not independent confirmation. No value is fitted on these observations.
  Reps 40–59 remain reserved. I withdraw my fresh 60–79 recommendation.
- The fixed screen panel stays `14x14-nightmare`, `15x15b10-nightmare`, `16x16-nightmare`. Apply all of plan §5.2:
  ≥15 matched sets per cell, equal cell/seed weights, clue and completion conditions, wall-time ratio and lower
  bound, no cell below 1.0, and non-worsening consumed-work intervals. Missing or inconclusive work never passes.
- The five formerly failing Nightmare cells and original controls keep their predeclared §5.2 gates. Master is
  identity, not an invented 18/20 gate. `10x10-master` rep 24's historical four-puzzle `layouts-not-found` outcome
  is an identity case, not an excuse to drop the row [V, corresponding `V4-S4/log-link` row].
- All four Hell 1 cells belong in the repeat/report even though they remain unoffered. The full 26x26 Nightmare
  legacy exception also belongs in the control/identity records. Neither can silently disappear to reduce cost.

### 3.2 Proof before performance interpretation

1. Four proof bundles before the main campaign: observer parity, certified screen/canonical equivalence,
   table/per-set/replay identity and legacy-route isolation, using the existing proof structure. The price proxy is
   the **observed** four S4 parity invocations, not their original reserve quote. It is not a promise that a new
   corpus completes in exactly that time [A].
2. Eight separate no-record smoke requests at rep 20:
   `14x14-nightmare`, `10x10-nightmare`, `18x18-nightmare`, `22x22-nightmare`, `26x26-nightmare`,
   `20x20-hell-1`, `15x20-nightmare`, `10x10-master`.
   They are correctness observations, not extra samples pooled into the 20-row performance cohort.
3. Then compare **every eligible measured row** with its reference before any performance ratio is interpreted.
   The shipped-path reference is frozen `fr-frozen` for n-mid and `fr-frozen-none` for the other gen-v4 cells.
   Today's controls and the legacy 26x26/Master routes use `log-link`/phase-1 legacy source. The n-mid
   no-screen counterfactual uses `fr-frozen-none`; eligible uncapped twins use the matching selected arm's
   `V4-S4C` uncapped row. The new non-table/`require` rows have no frozen same-cell oracle; use their proof
   inputs and paired controls, never invent that equality.
4. Require the same deterministic puzzle keys; P6 is not permission for different keys. Where the clock cuts a
   request, compare its genuine common prefix and record the truncation. An empty/no-set prefix provides **no
   positive equality evidence**. The frozen gen-v4 references include nine 115-s cuts on 14x14 Hell 1, reps
   21, 26, 27, 30, 31, 34, 36, 37, 38, and rep 33's reserve cut [V, own audit].
5. Per-call primitive work and skip equality comes from matched proof inputs/receipts. Aggregate speculative
   request work can differ when a faster source or deadline cancels different in-flight work. Published puzzle
   keys alone do not prove work parity.

“Before timing” cannot mean a full 460-row proof prepass followed by rerunning all 460 rows for free. The first
two steps precede the performance cohort; step 3 gates interpretation of the same observations. The eight smoke
rows are intentionally separately budgeted and do not inflate the performance sample size.

### 3.3 Conditional P5 twins: accept, with exact accounting

I accept SA-Opus's predeclared trigger, with two precision fixes. The eligible main population is the **360**
shipped gen-v4 original rows (excluding legacy 26x26) plus **80** gen-v4 non-table rows, not Master or today's
legacy rows. The 20 bounded `require` rows already have unconditional twins in §3.5.

For each eligible row, schedule an uncapped production-copy twin if the bounded production row **or its matching
frozen row** shows:

- fewer than ten accepted puzzles;
- a **set** attempt ending `no-window-*`, or the four-attempt bound firing;
- any call budget stop;
- a reserve cut, work deadline or host response bound.

A missing required outcome/reach field is unknown, never inferred zero. A twin removes the call budget, the
four-attempt bound and the live combined deadline, keeps today's two timers, and otherwise retains the same
source, seeds, prior/screen, request and pool settings. New non-table rows simply have no historical counterpart.
The historical ten triggers are all 14x14 Hell 1; the audit binds their exact reps and uncapped responses.

**Why conditional pairs suffice for these endpoints.** The current definitions are:
- false stop: bounded `partialReason` starts `set:no-window-` and the uncapped arm finds a set;
- lost completion: uncapped reaches ten, bounded does not
  [V, `verdicts.mjs:1366–1441`; `reachedTen` at `:167–169`].

For a valid bounded row reaching ten, the lost-completion predicate is false. A valid row without a set-bound
reason cannot be a false stop. These are **analytical zero contributions**, not observed uncapped pairs and not
proof that P5 did no internal/speculative work. Every remaining outcome that can contribute to either endpoint
gets a new twin. The additional historical/action triggers are useful diagnostics. No frozen timing or work is
adopted under P6.

Do **not** feed missing twins to the unchanged `p5Stops` reader and convert its `unknown` to success: that reader
requires both rows of every declared pair. The production report needs explicit columns for eligible bounded
rows, analytically settled zero rows, observed twin pairs, false/lost counts and unresolved required twins.
The coverage categories are disjoint: analytical-only rows have both endpoints settled and no measured twin;
a row with an observed diagnostic twin is counted in the observed-pair category even if its zero was already
deducible. A row whose false-stop contribution alone is zero still needs its twin when loss remains unresolved.
No claimed `20 pairs` when only ten or zero were measured. The original frozen report stays unchanged.

Fifteen is a **priced allowance**, not a sampling quota. The approved predicate covers all eligible rows.
More than fifteen triggers is a finding/reprice against remaining authorized funds; never omit a required twin
to fit the quote. Stop for the owner if the rest cannot be funded, and mark the endpoint incomplete. The scoped
maximum is 440 main twins, not an assertion that fifteen will always suffice.

### 3.4 Non-table sentinels: accept 140 rows, with narrow claims

| Cell | Runtime class | Arms and fixed additional gate |
|---|---|---|
| 11x11 Nightmare | n-small, no screen | Today/gen-v4 ×20; gen-v4 ≥18/20 and paired capped-T10 lower bound ≥0.9 |
| 18x19 Nightmare | class gap, no screen | Same; do not inherit 18x18's historical tail treatment merely by adjacency |
| 21x21 Nightmare | n-large, no screen | Same |
| 15x15 Nightmare, full board | n-mid, screen | Gen-v4 ×20; completion sentinel ≥18/20 |

The paired gates are declared before these new cells run. We do not know that today's source completes these
three boards merely because a nearby control did. Report that baseline as observed, and any gate failure returns
to the owner before the broad stage. No nearest-area fit or silent route change is authorized.

The full 15x15 sentinel is **not added to the fixed (c5) admission panel**: it has no no-screen counterpart and
therefore cannot independently establish screen speed/work non-worsening or clue tolerance. This avoids
pretending a missing arm passes §5.2 or changing the frozen class population. If the owner wants it to be a
fourth (c5) validation cell, predeclare and price its additional 20 no-screen rows before timing. The current
recommendation does not do so.

Own enumeration [V]: desktop 29/295 (9.83%) prior-covered W≤H rectangles; phone 20/236 (8.47%). Ordered W,H counts
are 51/576 and 35/462. No measured user-frequency distribution exists here.

### 3.5 Largest-board `require`: accept 50 rows

- Nightmare 22x22 and 32x15: five requests each on `6b94ffb`, gen-v4, gen-v4 uncapped: 30 rows.
- Hell 1 22x22 and 32x15: five each on gen-v4 and uncapped, diagnostic copy only: 20 rows.
- `uniqueness: require`, quantity ten, four workers, `maxActive: 484`, seeds
  `ig-p2/require/<cell>/<rep>`, reps 0–4.
- Read these before the broad repeat. Record set finding, ten reached, responses, budget/deadline stops,
  uniqueness proof and bound/glue reach. Five requests are a diagnostic, not a new 18/20 admission.
- A finding requiring a different frozen value, lost `require` guarantee, changed route or larger grant stops
  for the appropriate ruling. No assumption that the ANY timings price REQUIRE.

My original proposal omitted today's Nightmare arm; I accept that correction. Hell 1 stays because N-V4-15
includes the 40 G `require` case and its per-set prior, not only Nightmare's 32 G case.

### 3.6 Reach counters and cancellation

Agreed resolution of Q-P2-S6: keep the minimal integer budget/bound/rerate counts in the production selection
result, without `record`/`onRate` and without constructing rating detail. They account for completed calls.
Use **identified measurement-copy instrumentation in both arms** for the detailed call/primitive start/end,
unsettled call linkage and work intervals. Completed-call counters alone cannot bound work abandoned by
cancellation or prove that a missing completion did no work.

The observer parity gate proves the same puzzle keys, primitive work, skips and folded outcomes on matched
inputs. It does not prove zero timing overhead. Label the timing/trace configuration, apply it consistently to
both arms, and keep public-browser deadline checks on the actual shipping build. Never turn on full provenance
merely to collect reach: that would disable the P6 path being measured. No absent `rerate` or bound event counts
as exercised coverage.

## 4. One price and its derivation

Command, from the repository:

```powershell
node docs\improve-generating-phase-2\evidence\sa-astra\round1-cross-audit.mjs
```

The script reads 99 published row files/1,500 historical rows and the invocation journals, evaluates only
T11g's **pure** pricing block in a VM, and enumerates every proposed row. It does not import the manifest/tree
builder, run an engine, generate a puzzle, replay a record or take a measurement.

### 4.1 Calibration of the old estimates

| Historical row work only | Actual counted min | Node residual per row, excluding proof steps | My initial 1.25×median proxy, counted min | Mean+1 proxy, counted min | Mean+2 proxy, counted min |
|---|---:|---:|---:|---:|---:|
| V4-S4, 1,120 rows | 444.041 | 0.987 s | 480.212 | 447.282 | 465.949 |
| V4-S4C, 380 rows | 161.169 | 1.084 s | 187.514 | 160.618 | 167.735 |

These rows exclude the four parity invocations. SA-Opus's 2.1 s residual included them; my original per-cell
1.25×median proxy was conservative and repeated many quiet periods. The four proof invocations actually cost
**1,400.916 counted seconds = 23.349 minutes**, not my initial 71.2-minute counted/89-minute guard reserve quote.
Their 1.25 guard is 29.186 minutes [V].

The final projection uses measured matching-cell **mean response +2 s/request**, no P6 speedup credit.
The two seconds are a conservative assumption, not a measurement of new production overhead. REQUIRE rows
use their full 130/260-s row limits. Ten known conditional twins use their **matching trigger-row** responses
(sum 1,394.968 s), not the all-cell median; five additional unknown twins use 260 s each.

The four new non-table cells have no measurements. Their price proxies are explicitly 10x10, 18x18, 20x21 and
15x15b10 respectively; these are **not evidence of no-prior runtime**. The risk stage exists partly to expose
that assumption before the broad campaign.

### 4.2 Executable scheduling assumptions

- Sequential fresh-process requests; internal pool four. Pair arms within each cell/rep, alternating arm order.
  Screen/no-screen counterparts are interleaved as well.
- A new stage driver may continue across cell/arm boundaries inside an invocation and checkpoint each row.
  This is **not** a claim that today's one-cell emitted T11g steps share a quiet period.
- Each invocation: 2-s startup assumption, 885-s horizon, admission only while
  `elapsed + rowLimitS + 10 <= 885`, helper kill at 900 s, 45-s quiet counted. No idle declaration is assumed.
- Row limits: 130 s for the combined gen-v4 path; 260 s for today's/uncapped/legacy paths. The 10-s margin is an
  admission/projection assumption, not permission to exceed the helper bound.
- Counted = node + quiet; guard = 1.25 × counted. The guard is a spend cap, **not an execution ceiling**.
  Source/binding/checkpoint rules apply on every resume. Never rerun a completed observation to fill a budget.
- Proof bundles, resource replays and browser checks precede the broad stage. Every test stays ≤600 s; each
  browser check ≤60 s, with six ≤120-s helper invocations plus quiet budgeted here.

### 4.3 Stage totals

| Stage | Contents | Planned rows | Projected row invocations | Total counted min | Total guard min | Proposed authorization |
|---|---|---:|---:|---:|---:|---:|
| A | Proofs/smoke; `require`; non-table sentinels; 3x29, 32x15 and 22x22 paired controls; resource/browser checks | 318 | 23 | 330.656 | 409.195 | **410 min** |
| B | Remaining primary matrix, including all fixed (c5) pairs, other controls, Master, Hell 1 and legacy 26x26; conditional twins | 695 | 26 | 321.258 | 401.572 | **402 min** |
| Total | No broad stage after an unresolved risk-stage failure | **1,013** | **49 row invocations** | **651.913** | **810.767** | **812 min** |

Items in stage A: proof counted 1,400.916 s/guard 1,751.145 s; resource replay forecast counted 533 s/guard
666.25 s (two groups of four items, reserve-based); browser enforced node+quiet ceiling 990 s. Detailed stage
and row schedules, assumptions and sources are in `round1-cross-audit.json`.

If every non-table row consumes its full row limit instead of the adjacent-cell forecast, the combined guard
is **1,302.491 minutes**, rounded to **1,303**. This stress calculation shows why the proposed 812-minute
envelope is not an assurance that every requested observation finishes. Additional triggers or slow unknown
paths require a stop/reprice, not a favorable statistic from a truncated sample.

### 4.4 Account and authorization

The frozen account is **52,271.997 s = 871.19995 min** of **1,725**; nominal balance **853.80005 min** [V].
The new proposed allowance is 812 min. With explicit scope extension it would bring the maximum combined spend
to **1,683.19995 min**, leaving **41.80005 min** under the old numeric ceiling; a rounded equivalent minimum
ceiling is 1,684 min. Therefore no numeric increase to 1,725 is necessary **if the owner explicitly repurposes
its remaining scope**. There is no automatic rollover authorization.

Recommendation: approve a separate phase-2 scope/ledger for **812 counted minutes**, stages 410/402; the owner
may instead expressly authorize taking those 812 from the old balance. The plan must state which account is
charged. The old 480/945/1,126 and interim 852 quotes are superseded, not added together.

## 5. Corrections to my own analysis

| Original point | Correction |
|---|---|
| Fresh validation reps 60–79 | Withdrawn in favor of 20–39/20–24 for a no-retuning source-port replication. Fresh independent confirmation is a different study. |
| Standalone 46-s set cut | Withdrawn. Frozen `igLiveOf` requires a supplied origin; only the automatic bench path supplies it. UI actions keep separate 115/120-s scopes. |
| 360 unconditional uncapped rows | Replaced by the fixed conditional design, with analytical zeros distinguished from measured pairs and no dropped required twins. |
| 40 `require` rows, no today's arm | 50 rows, adding today's search on both Nightmare boards; Hell 1 remains diagnostic. |
| Missing-prior fallback listed only as a risk | Add 140 explicitly scoped sentinel observations. Do not extrapolate their timing from adjacency as a verified fact. |
| Four proof bundles at original reserve price | Use the observed 23.349 counted minutes as the proxy; its guard is 29.186 minutes. |
| One-cell quiet penalties and 1.25×median forecast | Mean+2, an enumerated heterogeneous stage schedule, observed proof cost, declared unknown-case allowances. Revised quote 812, not 945. |
| Earlier coordination objection to public no-window names | I was wrong: `ig-select-v4.js:1079` maps internal `below-to-one`/`above-to-max` to transported `below`/`above`; `v4-p5.json` produces `set:no-window-below/above`. Keep both internal and public vocabularies as frozen. |
| Real 26x26 legacy replay in the normal test suite | Keep small/scripted route tests in `npm test`; put the real large-board proof under the priced lock bundle, respecting the 600-s suite limit. |
| Request citation `:54–55` | The phase-1-prefix/PR note is lines 53–54; line 55 does not exist. D-S24-35 is separately at lines 35–40. |

The immutable original reports remain evidence of our initial reasoning, not the current recommendation.

## 6. User-visible wording: agreed precision correction

SA-Opus's neutral `screenCapped`, `rerate`, `rerateCapped` and `budget` strings are acceptable. Reuse the
existing time-limit N-NOSET text for a reserve cut. Retain advice to retry/change level/change board.

His earlier “every clue count tried” and “too hard to rate” overclaim:
`below-to-one`/`above-to-max` name the search's terminal direction, not a global monotonic proof. Rescue can
replace a screened ABOVE observation with a canonical BELOW one; a cap is not a score proving difficulty
(`ig-select-v4.js:475–501,1071–1080,1119–1174`) [V]. I accept his final plain-language refinement, removing
“window” jargon while preserving the accuracy correction. Our recommendation for the owner is:

| Key | English | Vietnamese |
|---|---|---|
| `notice.N-NOSET.below` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went down to one clue without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã giảm tới một mảnh đặt sẵn mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `notice.N-NOSET.above` | Couldn't create a {level} piece set for this board: on the first four piece sets tried, the search went up to the largest allowed number of clues without finding a {level} puzzle. Try again, choose another level, or change the board. | Không tạo được bộ mảnh mức {level} cho bàn này: với bốn bộ mảnh thử đầu tiên, việc tìm kiếm đã tăng tới số mảnh đặt sẵn tối đa cho phép mà không tìm được đề mức {level}. Hãy thử lại, chọn mức khác, hoặc đổi bàn. |
| `replay.step.noWindow.below` | The search reduced the number of clues to one without finding a clue set at this level. | Việc tìm kiếm đã giảm số mảnh đặt sẵn tới một mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |
| `replay.step.noWindow.above` | The search increased the number of clues to the allowed maximum without finding a clue set at this level. | Việc tìm kiếm đã tăng số mảnh đặt sẵn tới mức tối đa cho phép mà không tìm được nhóm mảnh đặt sẵn đạt mức này. |

The exact UI/replay strings in all languages and the old absolute “no early stop” statement go to the owner
with the plan. Updating that now-false statement is mandatory if P5 ships; retaining an impossibility claim is
not an option.

## 7. Merged questions and disposition

### Owner

| ID | Question, options, recommendation |
|---|---|
| **Q-P2-1** (absorbs my Q-P2-01 and his Q-P2-2) | Approve the declared conditional study and **812 counted minutes**, stages 410 then 402 after the risk readout? Recommend a distinct phase-2 account; alternatively explicitly authorize use of 812 from the old 853.80005-minute balance without raising 1,725. The new non-table timings are weak proxies; fully reserving their row limits gives a 1,303-minute stress allowance instead. More observations than funded stop incomplete. Or defer. |
| **Q-P2-5** | Approve the merged EN/VI strings, with the four neutral replacements in §6, and the documentation change from the absolute “no early stop” wording? Recommend these accurate search-outcome texts; the owner may substitute equally accurate wording. This is not a request to change the frozen bound or thresholds. |

### SAs jointly

| ID | Disposition |
|---|---|
| Q-P2-S1 | Resolved: seven keys; immutable algo owns budget/deadline/bound/route. |
| Q-P2-S2 | Resolved by both SAs: `screen-v4-v1`. |
| Q-P2-A1 / Q-P2-4 | Withdrawn/resolved: the owner's exact full-26x26 Nightmare exception, not an expanded >576 rule. |
| Q-P2-A2 / Q-P2-3 | Withdrawn/resolved: separate human-action clocks; combined gen-v4 automatic scope; real host guard. |
| Q-P2-S5 | Resolved: original validation seeds as port replication; no fit; 40–59 reserved. |
| Q-P2-S4 | Resolved: targeted proof/smoke before the matrix, then all-row equality before ratio interpretation; no P6 key exception. |
| Q-P2-A3 | I accept conditional P5 with the exact report/unknown/allowance rules of §3.3; fixed (c5) panel and 50-row REQUIRE agreed. |
| Q-P2-S3 | I accept 140 sentinel rows and fixed gates, with §3.4's non-table/15x15 scope clarification. |
| Q-P2-S6 | Resolved: minimal production counts plus symmetric, parity-checked measurement-copy primitive/cancellation trace (§3.6). |
| Final coordination | SA-Opus accepted the 812-minute schedule, conditional accounting, sentinel scope, telemetry split and accuracy correction (his §8.6). I accept his plain-language refinement in §6. All SA-joint questions are resolved. No new measurement is authorized by our agreement. |

No supervisor question is raised by these implementation/proof choices. A finding that needs a frozen value
changed, a governing-plan exception or a new interpretation of an owner decision is not resolved by the
developer: stop and escalate through the orchestrator.

## 8. Evidence and validation

| Evidence | Content / exact command |
|---|---|
| `evidence/sa-astra/round1-cross-audit.mjs`, `.json`, `.md` | Independent source/row/price/coverage reconciliation; command in §4; 99 row files, 1,500 historical rows, 1,013 proposed rows, 125 input hashes; no engine invocation |
| `evidence/sa-astra/round1-audit.mjs`, `.json`, `round1-validation.txt` | Original independent evidence, unchanged |
| SA-Opus `round-1-analysis.md`, `round-1-cross-review.md` §8 | Original counterpart and latest converged positions; his evidence scripts were read, not executed or overwritten |
| SA-Opus `evidence/sa-opus/p2-xr-verify-astra.mjs`, `.md` | Independent verification: 1,013 of 1,013 row prices equal, both schedules equal; 948 mean+2 rows, 55 row-limit rows, ten matching-twin+2 rows |
| `V4-S4` / `V4-S4C` published row files and raw invocation journals | Source responses, exact frozen trigger reps, row-only overhead and actual proof timings |
| `manifest.mjs:428–810` | Pure pricing constants, simulations and budget/ceiling distinction; not imported as a module |
| Governing `plan.md:589–645,660–700,776–829` | Statistical population, phase-2 scope/gates, replay/compatibility |
| `round1-cross-validation.txt` | Final syntax, explicit file-format, owned-scope/source guard and `npm run check` results, written after agreement |

The price-audit files retain their proposal-time status, as the snapshot SA-Opus independently checked; the
subsequent agreement is recorded here and in his §8.6. Their numbers and bytes have not been revised to imply
new measurements.

The audit's raw/LF input index and row-to-source paths are in the JSON record. No generation, rating, replay,
tree-building or timed experiment was run for this review. No production/test changes, commit or push.

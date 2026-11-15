# Improve generating (Pentomino): questions for the plan author

Merged and deduplicated from the two analysts' questions (IG-P-OPUS-Q1 to Q11, IG-P-ASTRA-Q1 to Q9) and from the joint
report ([report.md](report.md)). Questions that block starting the feature come first (IG-P-Q01 to IG-P-Q06). Each gives
the question, why it matters, the options and the analysts' recommendation; where Opus (SA1, claude-opus-5.5) and Astra
(SA2, gpt-6-astra) differ, both views are given. Nothing was run to prepare these questions.

---

## IG-P-Q01: P2's contract: when may a screen result stand for the canonical rating?

*Blocks: P2's design and PM4. From: IG-P-ASTRA-Q1, IG-P-OPUS-Q2.*

**Question.** Will P2 drop the claim that after the first solution G and info are final and the score is within two
points, accept a screen result only with a positive no-cap-effect certificate, and re-rate canonically otherwise?

**Why it matters.** The continued count and `settleCensus` change G, info and `Gproved` after the first solution
(`core/engine/deduce.js:1635, 1786`). A normal stop is not a certificate: R7 returns NONE after the work cap and the
ladder goes on to R8 and R9 (`deduce.js:1098-1131, 1448`). The escalation sum of 1.875 bounds the main allowances only,
not repeated censuses, model builds and diagnostics.

**Options.** (a) As planned. (b) A positive certificate, otherwise a canonical re-rating. Opus's certificate: the
main-phase work at the end is at most `W_screen` (every check is `work > workLimit`); it is sufficient only when every
other canonical limit is unchanged, so a lowered `N_screen` must be certified too. Opus's narrower exception (the same
first path and both censuses complete) only as an optimisation. (c) A canonical re-rating of every candidate before
acceptance; screens steer the search only.

**Recommendation.** Opus: (b). Astra: a positive certificate or a canonical re-rating, with PM4 covering normal stops
after an overshoot and every lowered limit. Shared: (b) with (c) as the fallback; never (a).

Plan-author answer: **(b), with (c) as the fallback. The plan's claim is dropped.**

- "After the first solution G and info are final and the score is within two points" is false, as the report shows
  (`settleCensus` and the continued count change them). Withdrawn.
- New contract: a screen run is the canonical rating run with a lower main-phase work limit and **no other limit
  changed**. If the main-phase work at the end is at most `W_screen`, no check `work > workLimit` ever differed from
  the canonical run, so the result is the canonical rating itself and may be accepted. The first version does not
  lower `N_screen`; a later version may, only with its own certificate.
- A run that reaches `W_screen` is "screen-capped": it steers the search only (P3 reads it as "too few clues") and is
  never accepted and never shown.
- Because dear useful ratings exist (10x10, 12x12), a call that closes its bracket with no in-band result re-rates its
  screen-capped profiles nearest the window canonically before it gives up. That re-rating is priced in PM4 and PM3.
- PM4 covers the cases the report lists: normal stops after an overshoot, R7's early NONE, caps after the first
  solution. If the certificate fails any of them, the feature falls back to (c).

---

## IG-P-Q02: One 120 s budget for set and batch, or two?

*Blocks: P5 and the bench criterion. From: IG-P-ASTRA-Q4.*

**Question.** Does the feature need one shared 120 s budget for the set and the batch, or does it keep D37's separate
action budgets? Which owner decision covers it, and what loss of completion is acceptable when P5 ends a request early?

**Why it matters.** `begin` starts a separate timer for each action (`core/browser/generation-client.js:447, 575, 812`):
70 of MP12b1's 1,726 responses exceeded 120 s while each action stayed inside its 115 s. P5's unit budgets do not bound
wall time: at the probe's work rates (157 to 446 M units/s) 6 G units take 13 to 38 s, more on a slow device.

**Options.** (a) Keep separate budgets; report the 120 s response but do not enforce it. (b) A shared request deadline
with a reserved share for the batch. (c) Separate budgets plus progressive delivery (OD-P5); on its own this does not
meet the existing T10 and final-response criteria, so any replacement criterion needs an explicit owner decision.

**Recommendation.** Both analysts: an explicit owner decision before P5, with a wall-clock backstop kept beside the unit
budgets. Neither analyst chooses between (b) and (c) without the browser numbers.

Plan-author answer: **Owner decision, needed before P5 is designed. My provisional recommendation: (b).**

- P5's unit budgets give determinism, not a time bound; the plan was wrong to present them as a tail bound. A
  wall-clock backstop stays beside them in every option.
- Why (b): the user waits for one response, and 70 of 1,726 responses already exceed 120 s under separate budgets. A
  shared deadline with a reserved share for the batch bounds what the user sees. The reserve is fitted from PM3 (the
  set stage's share of a request), not chosen now.
- (c) is acceptable only together with an owner decision that replaces the T10 and final-response criteria (OD-P5).
- Until the owner decides, phases 0 and 1 keep D37's separate budgets (a) and report the whole-response time beside
  them. The decision can wait for PM3 and the browser numbers, but not beyond them.

---

## IG-P-Q03: Request identity and P4's prior

*Blocks: P4 and replay. From: IG-P-OPUS-Q6, IG-P-ASTRA-Q5.*

**Question.** Is P4's prior (and the window) stored in the request and the pack's generation meta, or rebuilt
deterministically from the frozen calibration and a versioned fitted table? What is the fallback for a saved set, a pack
or a batch at another level, which have no matching calibration?

**Why it matters.** The calibration already changes later candidates through the frozen history (`foldStart` adds its
keys, `core/engine/generate.js:385-429`; `candidateContext` `435`; `foldAccept` `495`;
`core/browser/generation-client.js:814-823`), and it reaches the batch only when reusable (`generator/jobs.js:388-390`).
With P4 every slot depends on it, so the same set, batch seed and level can give different puzzles in different
sessions.

**Options.** (a) Store the prior, its table version, target and uniqueness mode with the request and in pack meta.
(b) Derive it from the set alone (the fitted table, or a locate on the witness inside the batch). (c) (a), with (b) as
the fallback when no calibration matches.

**Recommendation.** Both analysts: (c); the replay contract must preserve every effective input, not promise equality
from the seed alone.

Plan-author answer: **(c).**

The prior, its table version, the target and the uniqueness mode are stored with the request and in the pack's
generation meta. When no calibration matches (a saved set, a pack, a batch at another level), the prior is rebuilt from
the versioned fitted table and the set alone. Replay is defined on the full effective request, never on the seed
alone; the design states this as the contract, since the calibration already breaks seed-only equality today.

---

## IG-P-Q04: PM1's scope, given MP12b1's count curves

*Blocks: the measurement phase. From: IG-P-OPUS-Q1, IG-P-ASTRA-Q7.*

**Question.** MP12b1's diagnostic samples already give coarse count curves (seven shares plus the initial count, two
samples each) for every Nightmare cell and the three Hell 1 cells with sets. How far may PM1 be reduced accordingly?

**Why it matters.** The existing curves already locate the Nightmare windows and show the start-count dead end (report
§1). But they are random subsets of the witness, not nested families or walked layouts; they exclude the failed sets;
they do not record the work to the first solution. For orientation only, Astra's illustrative workload (15 cells x 60
families x 34 counts = 30,600 ratings, about 20 worker-hours at 2.4 s each) is not a counted inventory of the plan or a
predicted duration: cheap counts, the three-cap stop and setup change it.

**Options.** (a) As planned. (b) Cut PM1 to the cells without curves (Hell 1 on 215 to 484, Hell 2, Hell 3) plus fine
counts on two or three Nightmare cells, recording work and nodes to the first solution: about 3 to 15 worker-hours.
(c) Remove the redundant coarse scans and use the curves to target PM1 and seed P4's table, but keep nested orders,
walked layouts, failed-set populations, final-source checks and a held-out window audit.

**Recommendation.** Opus: (b). Astra: (c); she does not insist on repeating every coarse curve or on the plan's full
Cartesian scope. Both: record work and nodes to the first solution, the count tail and the census apart, and correct the
aliased initial counts (10x10's start is 10 % capped, not 3 %).

Plan-author answer: **(c), in two tranches, the first capped at about 10 worker-hours.**

- Tranche 1, in this order: (1) the cells without curves: Hell 1 on 215 to 484 cells, Hell 2, Hell 3. This answers the
  feature's headline question, whether those bands contain any window at all. (2) Fine counts with nested orders on
  three Nightmare cells that span the regimes: 14x14 (dead end), 12x12 (dear ratings), 26x26 (start already right).
  (3) The failed-set populations of Hell 1 on 14x14 and 24x24.
- Tranche 2, only if tranche 1 leaves P4's table or P1's design undecided: walked layouts on further cells and a
  held-out window audit on two cells.
- MP12b1's coarse curves are not repeated. They seed P4's table, after the aliased initial counts are corrected.
- Every rating records work and nodes to the first solution, the count tail and the census apart.
- The plan's full Cartesian scope (a) is withdrawn.

---

## IG-P-Q05: Bench comparability and P8's admission policy

*Blocks: phase 1's gate. From: IG-P-OPUS-Q7, IG-P-OPUS-Q9, Astra's P8 review.*

**Question.** Are the phase gates read at a fixed four workers, with eight reported beside them; which width formula is
intended for devices with four cores or fewer; and what admission or resizing policy should eight workers use while
preserving the bench's existing memory criteria?

**Why it matters.** `min(8, hardwareConcurrency - 1)` gives a 4-core device three workers instead of four and a 1-core
report zero; phones can report more than four logical processors. The bench already checks the whole-process peak
against 1.5 GiB and the accounted bytes against workerCount x `WORKER_LIMIT_BYTES` + `MAIN_BUDGET_BYTES`
(`tools/bench/report.js:24-34, 329-359`). MP12b1's peaks with four workers are at most 404 MiB accounted and 655 MiB per
process, but eight 224 MiB ceilings plus the main budget (2,092 MiB) could exceed 1.5 GiB in the worst case.

**Options.** (a) Gates at four workers, eight beside; a width rule that never lowers today's width, floored at 1, with an
explicit mobile policy; workspaces sized or admitted per task so both memory checks keep passing. (b) Gates at the new
default width.

**Recommendation.** Both analysts: (a).

Plan-author answer: **(a).**

- Phase gates are read at four workers, so that they compare with MP12b1; eight workers are reported beside them.
- Width: the larger of today's width and `min(8, hardwareConcurrency - 1)`, never below 1. The plan's bare formula was
  wrong for devices with four cores or fewer.
- More than four workers only when `navigator.deviceMemory` reports at least 8; where it is absent (Safari, Firefox)
  the width stays at today's value. The owner may widen this after the browser runs.
- Admission: before a task starts, its workspace ceiling times the width plus the main budget must fit the bench's
  accounted limit and the 1.5 GiB process criterion; otherwise the width is reduced for that request. Both existing
  memory checks stay unchanged and must keep passing.

---

## IG-P-Q06: P3 and D21's counting rule

*Blocks: OD-P1's scope. From: IG-P-OPUS-Q10, Astra's P3 review.*

**Question.** P3 changes the recorded D21 rule ("a spent profile is on no side"). Is that covered by OD-P1, or a separate
owner decision; and which parts of MP12b3's F1 and F2 does P1 supersede?

**Why it matters.** The rule is a recorded decision of difficulty-v3, and `tests/clues.test.js:701` pins today's
20-profile unrateable call.

**Options.** (a) Inside OD-P1, named explicitly. (b) A separate owner decision.

**Recommendation.** Both analysts: name it explicitly, (a) or (b); keep AR1 refusals, exclusions and duplicates distinct.

Plan-author answer: **(a): inside OD-P1, as a separately named line the owner approves explicitly.**

- OD-P1 gains the line "amends D21: under `gen-v4` a capped profile counts as 'too few clues'". AR1 refusals,
  exclusions and duplicates keep their own outcomes and are not folded into it (see IG-P-Q07).
- `tests/clues.test.js:701` keeps pinning `gen-v3` while that path exists; `gen-v4` gets its own test. The existing
  test is not rewritten.
- MP12b3's F1 and F2 stay as they are for `gen-v3`. Under `gen-v4`, P1 and P3 replace them in the calls where P1 runs;
  the design lists which F1 and F2 conditions remain (those not about capped profiles).

---

## IG-P-Q07: Direction from AR1-refused ratings

*Design. From: IG-P-OPUS-Q4, IG-P-ASTRA-Q2.*

**Question.** At Hard and above the cheap-side profiles are refused by AR1 (`Gproved` 0) and returned as `spent`
(`core/engine/clues.js:273-274`), so neither P1's first step nor today's phase 1 gets a direction from them. How should
they count?

**Why it matters.** Without a direction a cheap start reproduces the same dead end that P3 removes for capped profiles.

**Options.** (a) Count every AR1 refusal as BELOW. (b) Keep the canonical score and use its actual side of the band for
direction, while the profile stays ineligible for acceptance and the stall count. (c) No change.

**Recommendation.** Both analysts: (b). Opus first proposed (a); `Gproved` 0 is an eligibility result, not a band side,
when G and info are census estimates.

Plan-author answer: **(b).**

An AR1-refused profile keeps its canonical score, and the side of the band that score falls on gives the direction. It
stays ineligible for acceptance and does not count towards the stall count. I confirmed that `clues.js:273-274` returns
`spent` before the candidate is recorded, so today the score is discarded; the design must keep it. Where G and info
are census estimates, the direction is marked as estimated in PM3's records so its error rate can be measured.

---

## IG-P-Q08: The parallel P1 variant and pool invariance

*Design. From: IG-P-OPUS-Q5, IG-P-ASTRA-Q3.*

**Question.** Must the parallel (P + 1)-ary bisection replay one fixed probe tree on every device, or may it have its own
generator identity, or should it be dropped?

**Why it matters.** Different pool sizes probe different counts and can meet a different acceptable subset first;
ordering the results by count does not make the paths equal. Each step also rates P probes at once, which is the
whole-pass cost lesson of Sudoku's MS05e (report §7).

**Options.** (a) A fixed arity (for example 4) and a fixed probe and subset tree, consumed identically at every width.
(b) Drop the parallel variant. (c) Its own `algo` identity.

**Recommendation.** Both analysts: (a) or (b); Astra adds that the RNG and subset identity must not depend on the width.

Plan-author answer: **(b) for the first `gen-v4`; (a) only as a PM3 variant for the set stage.**

- The first `gen-v4` brackets sequentially inside a call. The pool is used across slots and candidates, where it
  already works, so the result does not depend on the width.
- The set stage is a single call that leaves workers idle. PM3 may test a fixed-arity variant there (arity 3, one fixed
  probe and subset tree, results consumed in tree order, RNG and subset identity independent of the width). It is
  adopted only if PM3 shows a clear gain after counting every probe it rates, including the wasted ones.
- Never (c): a result that depends on the device's width is not acceptable.

---

## IG-P-Q09: The size of `W_screen`

*Design. From: IG-P-OPUS-Q3.*

**Question.** How should `W_screen` be chosen per level: is a Nightmare screen of 190 to 380 M units acceptable as the
first experiment, and on which measurements is the final value fitted?

**Why it matters.** Accepted Nightmare work medians are 107 to 485 M units (main and census together), so 95 M would
screen-cap many useful ratings; the work to the first solution is not recorded, so how many would cap before it is not
established. 190 to 380 M is about 0.6 to 1.2 s of main work at the median rate.

**Options.** (a) 95 M as planned. (b) Fitted per level on PM1. (c) 190 to 380 M as the first experiment, then (b).

**Recommendation.** Both analysts: (c) then (b). Opus would fit mainly on the work to the first solution. Astra: keep
95 M as a control in the experiment, and fit on work and nodes to the first solution, the full count and census, the
re-rating and escalation cost and the final yield, not on the first-solution work alone.

Plan-author answer: **(c) then (b), with 95 M kept as a control.**

The plan's 95 M was fitted to nothing and is too low for Nightmare. PM4 and PM3 run 95 M, 190 M and 380 M. The final
value per level and area class minimises the expected total work per accepted puzzle, which includes the screen runs,
the canonical re-ratings of IG-P-Q01 and the yield, as Astra asks; the work to the first solution is one input, not
the criterion.

---

## IG-P-Q10: P5's budgets per level

*Design. From: Astra's P5 review.*

**Question.** Should P5's per-call and per-set budgets be set per level and board from PM1 and PM3, rather than one 6 G
unit figure?

**Why it matters.** On 196-cell Hell 1 a useful rating costs about 840 M units (the cap after the first solution plus the
census), so 6 G units buy about seven of them. P5 can truncate the assumed pattern of about nine dear profiles, although
an early central or best candidate may still succeed.

**Options.** (a) One budget, as planned. (b) Budgets per level and board, fitted on PM1 and checked in PM3. (c) (b), with
the wall-clock backstop of IG-P-Q02.

**Recommendation.** Both analysts: (c).

Plan-author answer: **(c).**

The single 6 G figure is withdrawn. Budgets are a versioned table per level and area class, fitted on PM1 and checked
in PM3 so that a call can afford the locate-and-window pattern it needs (on 196-cell Hell 1 that is more than seven
near-cap ratings). The wall-clock backstop of IG-P-Q02 applies in every case.

---

## IG-P-Q11: Hell 1 offer gates

*Design, OD-P4. From: IG-P-OPUS-Q8.*

**Question.** If P1 to P8, including the wider pool, bring Hell 1 on 24x24 and 26x26 near 15 to 30 s in Node in the
conditional scenarios, is Hell 1 re-offered by D39 (Node) at phase 3, or only once the matching browser runs (BQ) pass?

**Why it matters.** The browser planning rule (5 s + 4 x Node) puts those medians near 65 to 125 s; D39 is a Node
criterion; the 576 and 676-cell boards also need the large-board mode or separately qualified area limits; no completion
rate after the change is established.

**Options.** (a) D39 in Node at phase 3. (b) D39 and the matching BQ runs.

**Recommendation.** Both analysts: (b); no BQ flag from planning arithmetic, and no interpolation across unmeasured areas.

Plan-author answer: **(b).**

OD-P4 is reworded: a Hell level is re-offered on a cell only when D39 passes on phase 3's landscape **and** the
matching browser runs pass, including the large-board mode for 576 and 676 cells. No offer comes from the planning rule
(5 s + 4 x Node) and none is interpolated across unmeasured areas.

---

## IG-P-Q12: 10x10 and 12x12 Nightmare in the browser

*Design. From: IG-P-OPUS-Q11, Astra's review.*

**Question.** On these cells the useful ratings themselves are dear (accepted work medians 260 and 485 M units, p90 at
the cap plus census), so P1 to P5 give only about 1.1 to 1.8 times, and 12x12 stays near 81 s median and 190 to 250 s p95
under the browser planning rule after all phases. How should the plan treat them?

**Why it matters.** Both cells are offered today. P7 and the gated P11 target the per-rating kernel cost without
changing the rating; whether they suffice for these cells is unmeasured. Progressive delivery alone does not meet the
existing T10 and maximum-response criteria.

**Options.** (a) Prioritise P7 and P11 for these cells, then decide with the browser runs (BQ). (b) Accept them as browser
failures, offered in Node only. (c) A change to the rating's definition or caps, which needs a separate decision. (d)
Progressive delivery (OD-P5) with an explicitly replaced criterion.

**Recommendation.** Astra: (a), testing the existing items and BQ before any offer decision. Opus: (a), then (b) if the
browser runs still fail; (c) only as a separate decision.

Plan-author answer: **(a) first; then an owner decision between (b) and (d). (c) is out of scope.**

On these two cells the rating itself is the cost, so P1 to P5 cannot fix them; I accept the report's 1.1 to 1.8 times.
PM2 therefore profiles 10x10 and 12x12 first, and P7's proved-equal items are prioritised for them. If the browser runs
still fail after phase 2, the owner chooses between hiding the cells in the browser (b) and progressive delivery with a
replaced criterion (d). Both cells are offered today, so (b) removes something users have; I would propose (d) first.
Changing the rating or its caps belongs to a difficulty feature, not to this one.

---

## IG-P-Q13: P7's model reuse and memo as later items

*Design. From: IG-P-ASTRA-Q6.*

**Question.** May P7's full-model reuse and refutation memo be split into later optional items, after a proof that the
compact model and the cap boundaries stay equal?

**Why it matters.** The clue-specific model renumbers free columns and drops clued pieces
(`core/engine/placements.js:181-190`), so covering clues in a full model changes C, loop charges and tie order; a memo
must reproduce a cap boundary, not charge a lump sum. Neither is a small same-units change.

**Options.** (a) Inside P7, as planned. (b) Later optional items, each after its equality proof. (c) Dropped.

**Recommendation.** Both analysts: (b).

Plan-author answer: **(b).**

P7 in phase 1 holds only the items whose equality of units, tie order and cap boundaries is proved. Full-model reuse
and the refutation memo become separate later items, each behind its own equality proof, and are started only if PM2
shows they are worth it.

---

## IG-P-Q14: P9's stock: the full effective request

*Design. From: Astra's P9 review.*

**Question.** Should a stocked "next batch" reserve its future seed and bind every effective input of the request it
stands for?

**Why it matters.** Today the batch seed is drawn at random when the request starts (`generator/jobs.js:384`), and the
candidates see the request-start history; a batch made earlier against an older history can break novelty or differ from
the batch the request would have produced.

**Options.** (a) Reserve the next seed and store the stock with the full effective request (history snapshot,
calibration, prior, versions, target, quantity); serve it only on an exact match. (b) Serve any stock after re-checking
novelty: this does not prove the batch equals a fresh request. (c) Drop P9.

**Recommendation.** Both analysts: (a).

Plan-author answer: **(a).**

A stocked batch reserves its seed and is stored with the full effective request (history snapshot, calibration, prior,
versions, target, quantity). It is served only on an exact match and discarded otherwise. P9 is a late, optional item:
it helps the perceived time of the next batch only.

---

## IG-P-Q15: P10's packs: distinct layouts and full verification

*Design, OD-P3. From: IG-P-ASTRA-Q8.*

**Question.** What independent-layout content and exhaustion behaviour are acceptable for packs, given that symmetries and
piece renaming create no new history keys; and may the pack gate add canonical rating, AR1, uniqueness-mode and novelty
checks beyond `verifyPack`?

**Why it matters.** `layoutKey` and `clueKey` are invariant under board symmetries and use shape ranks
(`core/engine/keys.js:2-3, 62-98`); `verifyPack` (`core/engine/tasks.js:77-110`) proves existence only. A pack's content
also belongs to the generator version.

**Options.** (a) Genuinely distinct layouts, canonically re-rated with AR1, uniqueness and novelty checks at build time,
with a defined exhaustion behaviour. (b) Transformations of a few entries.

**Recommendation.** Both analysts: (a); (b) does not give new layouts.

Plan-author answer: **(a). Pack sizes are an owner decision (OD-P3).**

The plan's symmetric transformations are withdrawn: `layoutKey` and `clueKey` are invariant under them, so they add
nothing. A pack holds genuinely distinct layouts. Its build gate goes beyond `verifyPack`: canonical rating in band,
AR1, the uniqueness mode and distinct keys within the pack. Novelty against the user's history is checked when a puzzle
is served. When a pack is exhausted, the app says so and offers live generation where the level is generable; it does
not repeat entries silently. The pack's content id belongs to the generator identity.

---

## IG-P-Q16: Hell 2 and Hell 3 packs from measured search cost

*Design, OD-P3. From: IG-P-ASTRA-Q9.*

**Question.** Will the route of Hell 2 and Hell 3 to packs be decided from measured total search cost and diversity
(PM1, PM3), rather than from "a near-cap rating cannot fit ten on any device"?

**Why it matters.** Ten accepted cap-scale ratings cost about 26.5 worker-seconds; the unknown is how many ratings an
accepted puzzle needs and whether a window exists at all (no in-band Hell 2 or Hell 3 rating has been observed).

**Options.** (a) Decide from PM1 and PM3's measured cost and diversity. (b) As the plan states.

**Recommendation.** Both analysts: (a).

Plan-author answer: **(a).**

The plan's statement that a near-cap rating "cannot fit ten on any device" was unsupported and is withdrawn. Tranche 1
of PM1 (IG-P-Q04) first shows whether a Hell 2 or Hell 3 window exists at all. If it does, PM3 gives the ratings per
accepted puzzle, and the route is chosen from that: live generation, packs, or not offered.

---

## Direction after the joint report (plan author, 2026-11-14)

**Verdict on the report.** Accepted as the planning basis; where it and `plan.md` disagree, the report and the answers
above hold. The diagnosis stands and is now located: the directionless second phase of `selectClues` after capped
profiles on 196 to 300 cells. Withdrawn from `plan.md`: P2's "within two points" claim, P5 as a time bound and its
single 6 G budget, the 95 M `W_screen`, P8's bare width formula, P10's symmetric transformations, the statement about
Hell 2 and Hell 3, and PM1's full scope.

One reservation: the midpoints are the mean of two unmeasured projections, and the first-phase column is one analyst's
illustrative factor. They order the work; they are not gates.

**What this means for the goal.**

- Nightmare on 196 to 324 cells is the likely win (about 6 to 14 times in the estimates), from P1 and P3.
- 10x10 and 12x12 Nightmare are limited by the rating's own cost and probably stay too slow in the browser.
- Hell 1 is plausible only on 576 and 676 cells, and only if a window holds.
- Hell 2 and Hell 3 are unknown: no in-band rating has ever been observed. PM1's first tranche answers this.

**Revised order.**

| Phase | Content | Gate |
|---|---|---|
| 0. Measure (no runtime change) | Freeze on the post-MP17 source. PM4 (screen certificate). PM1 tranche 1 (IG-P-Q04). PM3 prototype of P1 to P5 with the variants of IG-P-Q08 and Q09. Then PM2, 10x10 and 12x12 first | dead-end entries removed; completion on the five failing Nightmare cells; Hell 2 and 3 route decided (IG-P-Q16) |
| 1. Same puzzles | P6 (OD-P2). P8 with the width and admission rules of IG-P-Q05. P7's proved-equal items | rating equality; gates at four workers; both memory checks |
| 2. `gen-v4` | P1 sequential, P3 (D21 amendment), P2 with the certificate, P4 with stored identity, P5 with per-level budgets and the wall-clock backstop | PM3 repeated on the production code, the ten passing Nightmare cells included |
| 3. Offers | Landscape and browser runs; D39 and BQ together (IG-P-Q11) | owner decisions on offers, 10x10 and 12x12 (IG-P-Q12) |
| 4. Optional | P10 packs if phase 0 chose them; P7's later items; P9; P11 | per item |

**Next actions.**

1. Owner: approve OD-P1 with its D21 line (IG-P-Q06) and OD-P2; note that IG-P-Q02 (one deadline or two) must be
   decided after PM3 and before P5's design.
2. Analysts or architect: write the phase-0 measurement task from the report's §6 and these answers, PM4 and PM1
   tranche 1 first. Nothing in `core/` or `generator/` changes in phase 0.
3. Architect: phase 1's design (P6, P8) may start in parallel; it does not depend on phase 0.
4. After phase 0: revise `plan.md` to version 2 with measured numbers before `gen-v4` is designed.

---

## Owner decisions (2026-11-14, 19:10, through `ask_user` and email)

| Id | Decision |
|---|---|
| OD-P1 | **Approved, with the D21 line (IG-P-Q06):** a new `algo` version `gen-v4` after difficulty-v3 closes; seeds give other puzzles; under `gen-v4` a capped profile counts as "too few clues". |
| OD-P2 | **Approved:** the DLX diagnostic runs only for accepted puzzles (P6). |
| IG-P-Q02 | Open: one deadline or two budgets is decided after PM3 and before P5's design. |
| Phase 0 | **Confirmed:** the official phase-0 measurements start once difficulty-v3 freezes (post-MP17). Prototypes are built now as harnesses outside every fingerprint with no production change; their numbers are provisional (pre-freeze) and are re-run on the frozen source. |

---

## Questions after the first prototype measurements (2026-11-15)

Raised by the phase-0 prototype pack (`tasks/improve-generating/`) after its first measurements. The numbers are
provisional (pre-freeze): measured on the current `rating-v3` runtime (source digest `34cea386…`, MP12b1's), with
matched cohorts of three to six seeds per cell. The official numbers come from the frozen round (post-MP17).

### IG-P-Q17: May P1 to P5 move the accepted puzzles to more clues inside the band?

*Blocks: P3 and P4 in `gen-v4` (phase 2), the fit of `W_screen` (IG-P-Q09), and how PM3's gains are read. From:
IGP-01 (PM3's prototype of P1 to P5); raised by Opus (SA1, the pack's author).*

**Question.** The prototype keeps the score band and its centre, but on Nightmare and Hell 1 its accepted puzzles carry
one to three more clues than today's. Is that acceptable for the level (a), must P1 to P5 keep today's clue-count
distribution (b), or should another criterion bound the change (c)?

**What was measured.** IGP-01 ran the prototype (`p1p5-main`: P1 to P5, `W_screen` 190 M units, 380 M on Hell, four
workers) and today's search on the same seeds. Every one of the 413 puzzles the prototype's calls returned (among them
the 280 its requests accepted) carries its canonical rating (0 mismatches), and the scores stay central: every
accepted puzzle of both arms lies in the middle half of its band, except one of 30 after and one of 25 before on Hell 1
26x26. The clue counts move:

| Cell | Today (MP12b1, 20 reps): clue share p10 / median / p90 (n); median clues of median K | After (IGP-01): clue share p10 / median / p90 (n); median clues of median K | Median clues, shift | Score position, today / after |
|---|---|---|---|---|
| 12x12 Nightmare | 0.158 / 0.211 / 0.250 (185); 4 of 19 | 0.200 / 0.263 / 0.316 (30); 5 of 19 | +1 | 0.63 / 0.40 |
| 14x14 Nightmare | 0.143 / 0.190 / 0.190 (126); 4 of 21 | 0.190 / 0.255 / 0.318 (30); 5.5 of 22 | +1.5 | 0.56 / 0.50 |
| 15x15b10 Nightmare | 0.136 / 0.182 / 0.227 (141); 4 of 22 | 0.182 / 0.227 / 0.304 (30); 5 of 22 | +1 | 0.54 / 0.48 |
| 26x26 Nightmare | 0.125 / 0.133 / 0.161 (200); 4 of 31.5 | 0.129 / 0.167 / 0.219 (60); 5 of 31.5 | +1 | 0.52 / 0.50 |
| Hell 1 26x26 | 0.100 / 0.128 / 0.154 (134); 5 of 39 | 0.143 / 0.205 / 0.256 (30); 8 of 41 | +3 | 0.57 / 0.43 |
| 14x14 Master | 0.176 / 0.222 / 0.278 (200); 4 of 18 | 0.176 / 0.235 / 0.353 (50); 4 of 18 | 0 | 0.50 / 0.50 |
| 26x26 Master | 0.125 / 0.189 / 0.231 (200); 5 of 25.5 | 0.083 / 0.160 / 0.200 (50); 4 of 25 | −1 | 0.47 / 0.50 |

Clue share = clues / K (K: the pieces of the set); p10 and p90 by nearest rank; score position = (score − band minimum)
/ band width, 0.5 being the centre. The after arm covers reps 0-2 (0-5 on 26x26 Nightmare, 0-4 on the Masters): 30 to
60 puzzles per cell.

**Mechanism (the pack author's reading of the journals; the causal split is not measured yet).**

1. P4 starts above today's start. The table prior is MP12b1's accepted median (reps 10-19), which on every Nightmare
   and Hell 1 cell lies one clue above today's start count (the level's share of K, `initialClueCount`): for example
   4 instead of 3 of 21 pieces on 14x14 Nightmare.
2. P3 climbs on a screen-capped probe. Today's search skips a capped profile and stays near its start count; the
   prototype reads a screen-capped probe as "too few clues" and moves up. On 14x14 Nightmare the locate phase moved up
   from its start in 31 of the 48 ok calls (median +2 clues), 30 of them after a screen-capped locate probe (12x12
   Nightmare: 24 of 39 calls, 22 of them; 15x15b10: 35 of 51, 34; Hell 1 26x26: 32 of 47, 30; 26x26 Nightmare: 43 of
   77, 27; the Masters: 19 of 74 with 2, and 3 of 77 with none).
3. The first central rating ends the call, as today. On 14x14 Nightmare 41 of the 48 ok calls found their count in the
   locate phase (a hit), and 25 ended in that phase. The call thus accepts the first central puzzle at the first
   count, going up, where a rating completes within `W_screen`. Accepted clues minus today's start count, median: +2
   on 12x12, 14x14 and 15x15b10 Nightmare, +4 on Hell 1 26x26, +1 on 26x26 Nightmare, 0 and −2 on the Masters.

**The headline speed-ups and the share the shift may have.** Paired T10 ratios, today's search over the prototype, on
matched seeds: 12x12 Nightmare 9.26 (n 3); 15x15b10 Nightmare 8.22 (n 2; ten puzzles reached on 2 of 3 seeds, then 3
of 3); Hell 1 26x26 5.03 (n 2; 2 of 3, then 3 of 3); 14x14 Nightmare 3.82 (n 1, as today reaches ten on one of the
three seeds) with a response ratio of 20.3 (n 3; 1 of 3, then 3 of 3); 26x26 Nightmare 2.01 (n 6); 14x14 Master 1.25
(n 5); 26x26 Master 0.83 (n 5). IGP-01 cannot split these gains between a faster search and a cheaper population.
Indications from the journals:

- The cells with the largest gains have the largest shifts; the Masters, without an upward shift, gain nothing.
- On 12x12, 14x14 and 15x15b10 Nightmare and Hell 1 26x26, today's search almost never rates at the prototype's
  median number of unknown pieces U (one or two fewer than today's; 2 to 4 of its ratings per cell). Those ratings
  were never capped, against 54 %, 21 %, 15 % and 30 % capped at today's median U, and on the three Nightmare cells
  they cost a third to a half of today's median rating (Hell 1: about the same, n 2).
- On 26x26 Nightmare, ratings at the two U cost the same (median 0.76 and 0.77 s; 2 % and 8 % capped; n 97 and 142):
  its 2 times comes mostly from the search itself.

A large but unmeasured part of the 5 to 9 times on 12x12 and 15x15b10 Nightmare and Hell 1 26x26, and of the
completion gains on 14x14, 15x15b10 and Hell 1, may therefore come from the population shift; little of 26x26
Nightmare's 2 times does.

**Why it matters.** The level contract of difficulty-v3 is the score band; the clue count is not part of it, and OD-P1
already accepts that `gen-v4` gives other puzzles per seed under P3's rule. It did not say that the population may move
inside the band: one to three more given pieces per puzzle on Nightmare and Hell 1, towards the cheap end of the
window. The score was built and validated on today's population; whether it ranks puzzles with more given pieces the
same way is not tested here. The report's estimates assumed today's population, so these gains are not a like-for-like
test of them. The answer constrains P3, P4 and `W_screen` (IG-P-Q09) before `gen-v4` is designed, and decides whether
PM3's gate needs a population criterion.

**Options.**

- (a) The shift is acceptable for the level: the score band and its centre are kept. The gains stand as measured, and
  PM3 keeps reporting the population per cell.
- (b) P1 to P5 must keep today's clue-count distribution. Constraints: P4 starts at today's start count, not above it;
  P3 may move the count up on a screen-capped probe only after a canonical re-rating, or `W_screen` must exceed the main
  work of most useful ratings at today's counts (towards the canonical 760 M, that is no screen); a call may not accept
  a hit above today's distribution. Expected loss: much of the gain on 12x12, 14x14 and 15x15b10 Nightmare and Hell 1
  26x26 (removing today's dead end still helps there), little on 26x26 Nightmare. Not measured yet; IGP-03's 380 M arm
  gives a first point.
- (c) Another criterion, for example: (c1) a bound on the shift, such as the median clue count of the accepted puzzles
  within one clue of today's on every cell, with P4's prior and `W_screen` fitted under that bound; (c2) a target count
  per call, drawn from today's accepted distribution of the cell, the first central puzzle at that count being
  accepted, so that P1 and P3 still remove the dead end while the population stays; (c3) a target position inside the
  band, with a tie-break towards fewer clues among a call's central candidates.

**What will be reported, and when (this provisional round).**

- IGP-01 `compare-r2` (in preparation): this population table per cell, with today, the before arm and the after arm.
- IGP-02 (PM4, next; about 25 minutes of machine time): on seven cells, 26x26 Master added, the clue share of the
  useful ratings each `W_screen` (95, 190 and 380 M) discards against all useful ratings, and the cost of canonical
  ratings from the start count to four clues above it: how much cheaper the shifted counts are.
- IGP-03 (PM3 variants, after IGP-02; about 17 minutes): the 95 M and 380 M arms on 14x14 and 12x12 Nightmare, and
  380 M on 26x26 Master, with T10 and the population per `W`: how the shift and the gain move together.
- IGP-07: the round's summary, with the population beside every time verdict (check-list §5, R32).
- The frozen round (post-MP17) repeats PM3 with larger cohorts; a prototype of option (b) or (c) can join it once one is
  chosen.

**Recommendation (Opus, the pack's author; Astra has not reviewed this question).** Neither (a) unconditionally nor
(b) now. Decide after IGP-02 and IGP-03 report (about 40 minutes of machine time, in this round); until then, read the
IGP-01 gains on 12x12, 14x14 and 15x15b10 Nightmare and Hell 1 26x26 as upper bounds for a population-preserving
search. My expected answer is (c1): a bound of about one clue on the median per cell, checked as a population gate in
phase 2's PM3 on the production code, with `W_screen` per level fitted by IG-P-Q09's criterion (the least expected
work per accepted puzzle) under that bound; if 380 M keeps the population and most of the gain, that fit settles it.
(a) only if the owner explicitly accepts more given pieces at the same score for these levels, ideally after a small
blind play comparison of the two populations. (b) is the conservative fallback.

**Evidence.**

- `docs/improve-generating/evidence/provisional/IGP-01/compare.md`: the headline, the per-stage outcomes, the locate
  results and the multipliers; `compare-r2.md`: the population table (in preparation).
- `docs/improve-generating/evidence/provisional/IGP-01/before/` and `after/`: `*.runs.json` (the accepted puzzles:
  `details.puzzles[].clues`, `U`, `score`, and `details.K`) and `*.calls.jsonl` (every rating with its phase, clue count,
  outcome and time; each call's `locate` summary on its `end` line).
- `docs/improve-generating/evidence/provisional/IGP-01/verify-after.md`: 413 of 413 ratings canonical.
- `docs/difficulty-v3/landscape-v3-full/<case>-2026-11-1[34].json`: MP12b1, today's 20 reps per cell.
- `tools/ig-proto/data/prior-v1.json` (P4's prior) and `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js`
  (the prototype).
- `tasks/improve-generating/check-list.md` §5 (R32), `02-pm4-screen-certificate.md`, `03-pm3-variants-and-budgets.md`.

**Addendum after IGP-02 (PM4), 2026-11-15 (Opus).**

- *The ratings are right.* PM4's screen certificate holds: 862 certified screen runs, each equal to its canonical
  rating, with every named case observed (399 overshoots, 812 caps after the first solution, 1,062 caps before it, 484
  runs with an R7 cut in the main search, none of them certified). The shift is a change of population, not a rating
  error.
- *Where the in-band ratings are.* On four sets per cell (each the first set of its seed), PM4 rated canonically today's
  set-stage call profiles, most of them at today's start count (the level's share of K), and three random subsets per
  set at each clue offset +1 to +4. Useful = a complete canonical rating in the band, not refused by AR1:

| Cell | Useful / profiles (capped) at the start count | +1 | +2 | +3 | +4 | Median rating time, start count → best offset |
|---|---|---|---|---|---|---|
| 12x12 Nightmare | 2 / 29 (76 %) | 7 / 23 (13 %) | 6 / 16 (13 %) | 7 / 16 (0 %) | 8 / 12 (0 %) | 2.26 s → 0.15 s (+4) |
| 14x14 Nightmare | 0 / 78 (100 %) | 0 / 12 (100 %) | 0 / 12 (83 %) | 4 / 12 (42 %) | 4 / 12 (25 %) | 2.18 s → 0.72 s (+4) |
| 15x15b10 Nightmare | 1 / 53 (96 %) | 2 / 16 (56 %) | 3 / 12 (42 %) | 7 / 12 (17 %) | 5 / 12 (0 %) | 2.07 s → 0.12 s (+3) |
| Hell 1 26x26 | 1 / 65 (98 %) | 1 / 14 (86 %) | 5 / 12 (58 %) | 4 / 12 (58 %) | 5 / 12 (33 %) | 2.11 s → 1.75 s (+4) |
| 26x26 Nightmare | 5 / 15 (7 %) | 8 / 14 (0 %) | 2 / 12 (0 %) | 1 / 12 (0 %) | 1 / 12 (0 %) | 0.77 s → 0.44 s (+1) |
| 10x10 Nightmare | 4 / 13 (0 %) | 7 / 16 (0 %) | 9 / 12 (0 %) | 6 / 12 (0 %) | 1 / 12 (0 %) | 1.02 s → 0.49 s (+2) |

  The median covers every profile at the offset, capped ones included; the best offset has the highest useful share
  (the cheaper one on a tie). On 26x26 Master the useful ratings lie at or below the start count (14 of 29 profiles
  below it, 6 of 21 at it, 2 of 14 at +1, none at +2 to +4). On 12x12, 14x14 and 15x15b10 Nightmare and Hell 1 26x26,
  in-band ratings are rare at today's start count (0 to 7 % of the profiles, 76 to 100 % capped) and common two to four
  clues higher (33 to 67 % at the best offset), where a rating costs 3 to 17 times less on the three Nightmare cells
  (Hell 1: about the same). On 14x14 Nightmare PM4 found no in-band rating below +3 on its four sets.
- *Two parts of the shift.* In IGP-01, 5 of the 12 requests on the slow cells (14x14 Nightmare seeds 0 and 1, 15x15b10
  seed 2, Hell 1 26x26 seeds 1 and 2) were served today on a later set (attempts 1, 3, 4, 7 and 7), because today's
  set-stage search failed on the earlier ones, while the prototype served all five on attempt 0: sets today's search
  gives up on, served at higher clue counts. On the 7 slow-cell requests served on the same set in both arms, the
  prototype's median clue count was still higher: +1 to +2 on 12x12, 14x14 and 15x15b10 Nightmare, +2.5 on Hell 1
  26x26; on 26x26 Nightmare (the same sets throughout) 0 to +2.
- *A rough split of the gains* (an indication only: it divides a request-time ratio by a rating-cost ratio). On today's
  call profiles the screen alone, at the after arm's `W_screen` and without moving the count, saves 2.0 times on 12x12
  Nightmare, 3.7 on 15x15b10 Nightmare and 1.15 on 26x26 Nightmare (190 M), and 1.8 on Hell 1 26x26 (380 M); on 14x14
  Nightmare 4.0, where it only makes today's capped ratings cheaper. IGP-01 measured 9.3, 8.2, 2.0 and 5.0 times on T10
  for the first four. The remainder, roughly 4.7, 2.2, 1.75 and 2.8 times, comes from rating elsewhere: on 12x12 and
  15x15b10 Nightmare and Hell 1, at the higher clue counts of the shift; on 26x26 Nightmare, from the search itself
  (see above).
- *Consequences for the options.* Under (b), the sets of the first part stay unserved at today's counts, so requests
  that meet them keep today's slow set stage and its failures: the loss (b) expects includes the completion gains on
  14x14 and 15x15b10 Nightmare and Hell 1 26x26, and what remains on the slow cells is roughly the screen's 1.8 to 4
  times and part of the dead-end saving. A bound on the cell's median as in (c1) can hold on 14x14 Nightmare only by
  serving fewer puzzles from sets like PM4's four. A rule per set keeps them: (c4) accept the lowest in-band count the
  call can find, probing one or two counts below its first in-band hit before it accepts; that limits the second part
  at the cost of a few dearer probes.
- *What follows in this round.* IGP-03 (next; about 23 minutes of machine time) adds a no-screen arm (`W_screen` at
  the canonical 760 M: the prototype's search without P2) on 14x14 and 12x12 Nightmare beside 95, 190 and 380 M, and
  reports per arm the sets served, the same-set clue shift and the population: how much of the gain and of the shift is
  the screen's. The same arm on Hell 1 26x26 is optional (about 5 more minutes, with the owner's approval). The variant
  that re-rates when the bracket closes (D-IG7's other reading) is deferred: it re-rates probes one clue below the
  window count, so it acts on the shift and belongs with the chosen criterion. No `W_screen` per level is recommended
  before IGP-03 and this answer; PM4 already shows that most of Hell 1's useful window ratings exceed 380 M (8 of 14
  lost at 380 M).
- *Recommendation, updated (Opus, the pack's author; Astra has not reviewed it).* Still decide after IGP-03, but judge
  the population per set, not per cell: today's distribution on these cells is that of the sets today's search can
  serve. If a bound is wanted, (c4) is the form I now expect rather than (c1); its probe cost needs a prototype arm, as
  a short addition to this round if the owner approves it, or in the frozen round.
- *Evidence.* `docs/improve-generating/evidence/provisional/IGP-02/pm4.md` (the certificate and its coverage, the
  canonical cost by clue offset per cell, the `W_screen` economics), `pm4.json` (`cells.<case>.costByOffset`,
  `cells.<case>.perW`) and `profiles-<case>.jsonl`;
  `docs/improve-generating/evidence/provisional/IGP-01/before/*.runs.json` and `after/*.runs.json`
  (`details.setAttempt`, `details.igSetKey` and `details.puzzles[].clues` per request).

**Addendum after IGP-03 (PM3 variants), 2026-11-15 (Opus).**

- *What ran.* The prototype at `W_screen` 95, 190 (IGP-01's after arm) and 380 M, and without the screen (760 M, the
  canonical limit; P1, P3 on canonical caps and P4 unchanged), on 14x14 and 12x12 Nightmare, seeds 0 and 1; and at
  380 M on 26x26 Master, seeds 0 to 4. These are two-seed indications. Every arm reached ten puzzles on every request,
  all 295 accepted ratings are canonical, and no call re-rated.

| Arm | 14x14 Nightmare: T10 s | Median clue share | Same-set clue shift against no screen, per request | 12x12 Nightmare: T10 s | Median clue share | Same-set clue shift against today, per request | Against no screen |
|---|---|---|---|---|---|---|---|
| today (IGP-01 before) | none reached ten (response 170.8 s) | 0.170 | - (other sets) | 50.4 | 0.158 | - | - |
| no screen (760 M) | 17.7 | 0.273 | - | 9.2 | 0.211 | 0, +1 | - |
| 380 M | 11.2 | 0.273 | 0, 0 | 10.2 | 0.257 | 0, +2 | 0, +1 |
| 190 M (IGP-01 after) | 7.2 | 0.318 | 0, 0 | 7.9 | 0.263 | +1, +2 | +1, +1 |
| 95 M | 4.6 | 0.318 | 0, +0.5 | 6.1 | 0.263 | +1, +2 | +1, +1 |

- *12x12 Nightmare: the gain comes without the shift, and the screen adds the shift.* Both requests used the same set
  in every arm. Without the screen the search is 8.1 times faster than today on T10 (2.1 and 14.0 per seed). Its
  median clue share, 0.211, equals MP12b1's 20-rep median (today's on these two requests: 0.158). Per request its count
  is today's on one and one clue higher on the other, and today's lower tail is gone (1 of 20 accepted puzzles at
  today's start count, against 12 of 20 today). The gain comes from where it rates: P4 starts at today's accepted
  median, one clue above today's start count, while today's search makes 144 of its 170 ratings at the start count,
  68 % of them capped (median 2.3 s); without the screen, 5 of 49 ratings are capped in all. The screen then adds one
  clue on both requests, for 1.14 times at 190 M (1.66 at 95 M); at 380 M it is slower than no screen (0.94 times) and
  still adds 0 and +1.
- *14x14 Nightmare: the shift is the choice of set, not the screen.* Today served both requests on later sets
  (attempts 1 and 3) and reached ten on neither. Every prototype arm, with or without the screen, served both on
  attempt 0 and accepted two to four clues above today's start count: on those sets, 0 to 11 % of the prototype arms'
  probes are in band at +1 and 30 to 71 % at +2 to +4 (on PM4's four sets of the cell: none below +3). Without the
  screen the response is 9.5 times faster than today (0, then 2 of 2 reaching ten). The screen adds 2.6 times at 190 M
  (1.6 at 380 M, 4.0 at 95 M) with no clue shift per request on the same set (half a clue on one request at 95 M). Only
  the pooled median moves (6 to 7 clues): the accepted counts have two peaks, at +2 and +4, and two of 20 puzzles move
  up.
- *26x26 Master at 380 M.* The screen caps 4 of 519 probes (39 of 550 at 190 M), yet the paired T10 against today stays
  mixed: 0.54 to 2.24 per seed, geometric mean 0.98. On the same sets the prototype accepts one clue fewer than today
  at the median (-1 on three requests, -0.5 on one, 0 on one; median share 0.160 against 0.185), at 190 and 380 M
  alike: its prior starts one clue below today's start count there. The shift is not always upward, and here it is
  not the screen's.
- *Correction of the first addendum.* Its rough split took PM4's screen saving on today's call profiles (2.0 times on
  12x12 Nightmare at 190 M) and assigned the remaining 4.7 times to rating at the higher clue counts of the shift. On
  the prototype's own probes the screen gives 1.14 times on 12x12, and a search close to (b) (no screen, P4 at today's
  median) keeps 8.1 times at today's median clue count. The first addendum's reading of (b), that it would keep only
  about the screen's 1.8 to 4 times on the slow cells, is therefore refuted on 12x12 (two seeds). (b) proper, with P4
  at today's start count, was not measured.
- *Consequences.* The shift has two sources, with different costs:
  - The screen's same-set shift: +1 clue on 12x12 for 1.14 times, none on 14x14 for 2.6 times. A rule that the screen
    may not move the accepted count on the same set, against the search without the screen, keeps `W_screen` where it
    is free and drops it where it is not; IG-P-Q09's `W_screen` per level and area class can express it. Call this
    (c5).
  - The choice of set (14x14 here; 15x15b10 and Hell 1 in IGP-01): sets today's search gives up on are served at their
    in-band counts, two to four clues above today's start count, with or without the screen. Keeping today's
    distribution there means refusing those sets and keeping today's failures (14x14: today reached ten on neither
    request). This is (a) for those sets, or (c4) to take each set's lowest in-band count.

  Hell 1 26x26 is not split: no no-screen arm ran there. PM4 found that its screen at 380 M loses 8 of 14 useful window
  ratings, so the screen may shift Hell 1 as it shifts 12x12.
- *Recommendation, updated (Opus, the pack's author; Astra has not reviewed it).* Decide the two parts separately.
  (1) For the screen, (c5): on these seeds it keeps 190 M on 14x14 and removes the screen on 12x12, at about 1.14 times
  there; the frozen round's PM3 confirms it per cell with more seeds. (2) For the choice of set, (a) for the sets
  today's search gives up on, if the owner explicitly accepts more given pieces at the same score on them (the first
  recommendation's caveat stands), with (c4) as the refinement; otherwise (b) keeps today's failures there. Any
  population criterion should be two-sided, since 26x26 Master moves down.
- *What follows.* IGP-04 measures P6 and eight workers, which return the same puzzles (no population effect). The
  no-screen arm on Hell 1 26x26 (about 5 minutes) runs at the end of this round if the budget allows, otherwise in the
  frozen round.
- *Evidence.* `docs/improve-generating/evidence/provisional/IGP-03/compare.md` (the study section: per `W`,
  population, the split, the sets served, the clue offsets; "26x26 Master at 380 M against IGP-01"; the §5 rows R16,
  R32, R33 and R07), `compare.json`, the arm folders `w095/`, `w380/`, `w760/` and `a3/` (`*.runs.json`,
  `*.calls.jsonl`) and `verify-*.md`.

**Note after IGP-03h (six seeds on 12x12 Nightmare, and Hell 1 26x26 without the screen), 2026-11-15 (Opus).**

- *12x12 Nightmare, reps 0 to 5* (no screen from IGP-03 and IGP-03h, 190 M from IGP-01 and IGP-03h, today from
  MP12b1's records of the same seeds; every request of both arms on the same set as the other arm):

| | Today (MP12b1) | No screen | 190 M |
|---|---|---|---|
| Ten of n | 5 of 6 | 6 of 6 | 6 of 6 |
| T10 median, s | 57.7 (5 requests) | 16.5 | 9.0 |
| Median clue share (pooled) | 0.200 | 0.211 | 0.286 |

  Paired by seed: today over no screen 2.9 times (2.3 to 14.0, geometric mean 3.7, n 5); no screen over 190 M 1.56
  times (1.11 to 3.65, geometric mean 1.65, n 6); the screen's same-set clue shift (190 M less no screen) is +0.75 clues
  at the median (0 to +1.5; 0.038 of K).
- *Hell 1 26x26, reps 0 and 1.* T10 without the screen 34.2 s, at 380 M 39.7 s, today 179.3 s (one of two requests
  reached ten). The screen is slower (0.88 times paired: 0.67 and 1.08) and adds +0.75 clues on the same set (+1.0 and
  +0.5). Both arms accept at a median clue share of 0.195 against today's 0.128: on Hell 1 the shift comes from the
  search without the screen.
- *Correction of the addendum after IGP-03.* On 12x12 its two seeds overstated the gain of the search without the
  screen (8.1 times; 2.9 over six seeds) and understated the screen's (1.14 times; 1.56). (c5)'s price on 12x12 is
  therefore about 1.6 times, paired by seed (the T10 medians are 9.0 s with the screen and 16.5 s without), for +0.75
  clues on the same set. On Hell 1 26x26 it costs nothing, the screen being slower; on 14x14 Nightmare (IGP-03) the
  screen's 2.6 times came with no same-set shift.
- *Recommendation, updated (Opus, the pack's author; Astra has not reviewed it).* (c5) as the rule for the Hell levels,
  where speed and population agree on no screen, and for 14x14-like cells, where they agree on keeping it. On
  12x12-like cells it is a trade, +0.75 clues on the same set for 1.6 times, best decided together with IG-P-Q12 (10x10
  and 12x12 Nightmare in the browser), where that factor may decide the offer. The frozen round's PM3 measures it per
  cell with more seeds.
- *Evidence.* `docs/improve-generating/evidence/provisional/IGP-03h/c5/compare.md` ("12x12 Nightmare: the screen
  against no screen, by seed, all seeds": six seeds) and `compare.md` (Hell 1 26x26: the split and the by-seed
  section), with `compare.json`, `c5/compare.json`, the arm folders `w760/` and `main/`, `verify-w760.md` and
  `verify-main.md`.

Plan-author answer:

---

### IG-P-Q18: Where PM1 found Hell windows: the routes of Hell 3 and Hell 2, and Hell 1 on 215 to 484 cells

*Blocks: the Hell 2 and Hell 3 route (IG-P-Q16, OD-P3), the cell list of phase 3's Hell 1 landscape (OD-P4, IG-P-Q11),
and P4's prior and `W_screen` for the Hell levels in `gen-v4`. From: IGP-05 (PM1 tranche 1, reduced first slice);
raised by Opus (SA1, the pack's author).*

**Question.** PM1's first slice gives the first observations of Hell windows on the cells where today's search makes
no set. Do you accept (1) "not offered" as Hell 3's route; (2) a PM3 run for Hell 2 in a later round before its route
is chosen, and are Hell 2 puzzles at the bottom edge of the band acceptable; (3) Hell 1 on 215 to 484 cells in phase
3's landscape, with IG-P-Q17's set-level rule applied where today serves nothing?

**What was measured.** IGP-05 ran PM1's reduced slice in the order of IG-P-Q04, every rating canonical (the `instr`
tree). On each of 22 cells without a curve: two sets × two nested orders, each a boundary search from the cheap side
(many clues) down to the work cap and a short scan next to it. Then fine counts on three Nightmare cells, and today's
failing Hell 1 sets on 14x14 and 24x24. "In band" counts the score; "eligible" adds AR1 (Gproved ≥ 1); "central" is
within a quarter of the band width of its centre. Offsets are counts less today's start count (`initialClueCount`, the
level's share of K). It is a reduced diagnostic: "none observed" is never "no window".

| Level and boards | Families with an in-band rating | In-band ratings of all (eligible; central) | Scores (band) | Offset from today's start count | Clue share, median [range] | Main work above 190 / 380 M |
|---|---|---|---|---|---|---|
| Hell 1: 15x15b10, 16x16, 15x20, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22 (215 to 484 cells) | 22 of 36, on every board | 47 of 389 (47; 27) | 77 to 109 ([77, 112)) | +6 to +15 | 0.35 [0.25-0.49] | 30 / 16 of 47 |
| Hell 2: 15x20, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22, 24x24, 26x26 (300 to 676 cells) | 7 of 36, on 6 boards (none on 15x20, 18x18, 20x20) | 8 of 404 (8; 0) | 112 to 119 ([112, 162)) | +16 to +29 | 0.45 [0.33-0.54] | 8 / 7 of 8 |
| Hell 3: 32x15, 22x22, 24x24, 26x26 (480 to 676 cells) | 0 of 16 | 0 of 201 | best complete 78 to 115 ([162, 235)) | - | - | - |

- *Hell 3.* The best complete scores come from the counts next to the work cap (the canonical `DEDUCE.work`, 760 M) and
  stay 47 to 84 points short of 162; with fewer clues the ratings cap. On these boards no rating within the cap reaches
  Hell 3. That is not a sampling gap: the full tranche 1 would add sets and layouts, not close 47 to 84 points.
- *Hell 2.* Windows exist on six of nine boards but are thin, dear and at the edge: 2 % of the diagnostic's ratings,
  none central, every one in the lowest 14 % of the band (112 to 119, just above Hell 1's top, 112), 17 to 53 s of
  rating per in-band rating in this diagnostic. The search accepts a non-central in-band puzzle when no central one is
  found (IGP-01: one such puzzle in each arm on Hell 1 26x26).
- *Hell 1 on 215 to 484 cells.* Windows on every board, all eligible, more than half central, 3.6 to 16.4 s of rating
  per in-band rating. The direction's "Hell 1 is plausible only on 576 and 676 cells, and only if a window holds" no
  longer holds for windows: in this slice they hold from 215 cells up. Their request-level cost is not measured yet.
- *Why today fails (R28).* Today's set-stage call on four sets each of 14x14 and 24x24 Hell 1 is a dead end on all 8:
  its 20 profiles at the start count are all capped, so it never rates a candidate. On 7 of the 8 sets, PM1's families
  found eligible in-band ratings 2 to 11 clues higher (15 ratings, 7 central; 14x14: 4 of 4 sets at +8 to +11; 24x24: 3
  of 4 at +2 to +9). Their main work exceeds 380 M on 6 of 7 (14x14) and 5 of 8 (24x24).
- *An incomplete census (R27).* 37 of the 55 in-band window ratings, all 8 of Hell 2's among them, were rated with a
  census stopped at its relative budget. Today's accepted puzzles stand on the same footing (MP12b1's records count
  134 censored ratings for its 134 accepted Hell 1 26x26 puzzles, 194 for 200 on 26x26 Nightmare), so this is not a
  defect, but a complete census could score these puzzles differently; the frozen round reports the share again.

**What `gen-v4` needs to serve these cells.**

1. *Leave the start count.* Today's dead end is the cause (R28); P3's sided reading of a capped profile and P1's
   bracketing remove it.
2. *A starting prior where today has no accepted puzzles.* P4's table comes from MP12b1's accepted puzzles, which these
   cells do not have. PM1's window counts (about 0.35 of K given on Hell 1) or the prototype's cheap-side start (K − 8)
   can replace it.
3. *No screen for Hell.* A screen at 380 M would lose a third of these windows' in-band ratings (16 of 47; 6 of 7 and
   5 of 8 on the failing sets), so `W_screen` for the Hell levels sits at the canonical limit, which (c5) of IG-P-Q17's
   addendum after IGP-03 gives as well.

**How it meets IG-P-Q17.** Where today serves nothing there is no today's distribution. Read literally, (b) and (c1)
of IG-P-Q17 would block these cells: their windows lie 2 to 15 clues above today's start count, with about 0.35 of K
given against 0.13 for today's Hell 1 26x26 puzzles. The split of the addendum after IGP-03 applies instead: (c5) is
measured against the search without the screen, and the set-level part (sets today's search gives up on) covers every
set of these cells. The answer to IG-P-Q17's set-level part therefore decides whether these cells can be offered: if
the band and AR1 define the level whatever the share of given pieces, they are phase-3 candidates; if not, they stay
unoffered.

**Why it matters.** IG-P-Q16's answer chose the Hell 2 and Hell 3 route from measured cost, and this is the first
measurement. Phase 3's landscape (OD-P4: D39 and the matching browser runs) needs its cell list, and `gen-v4`'s design
needs P4's prior and `W_screen` for the Hell levels, before phase 2 is designed.

**Options.**

1. Hell 3: (a) not offered, the route closed in this feature (a change of the rating's cap or scale belongs to
   difficulty-v3); (b) kept open until the full tranche 1 (about 9 worker-hours, owner's approval, D-IG10).
2. Hell 2: (a) a PM3 run for Hell 2 in a later round (the prototype without the screen and with a start near PM1's
   windows, on two or three boards), then the route: live, packs or not offered; (b) decide now: packs or not offered.
   And: (i) Hell 2 puzzles at the bottom edge of the band are acceptable; (ii) only central or near-central ones (then
   Hell 2 stays unoffered on these observations).
3. Hell 1 on 215 to 484 cells: (a) in phase 3's landscape, D39 and the browser runs deciding the offer as OD-P4 says,
   with IG-P-Q17's set-level rule where today serves nothing; (b) only the direction's 576 and 676 cells.

**Recommendation (Opus, the pack's author; Astra has not reviewed this question).** 1 (a): the gap is 47 to 84 points
at the cap, not a sample. 2 (a), with (i) or (ii) settled by the owner first: under (ii) the PM3 run is not needed and
Hell 2 is recorded as not offered on these observations. 3 (a): the windows hold on every board of the slice, today's
failure is the dead end that P1 and P3 remove, and OD-P4's gates stay as they are; `gen-v4`'s design takes the three
needs above as requirements for the Hell levels.

**What will be reported, and when.** IGP-03h (this round, its optional part 2, about 5 minutes): the prototype without
the screen on Hell 1 20x20, two requests, where MP12b1's prescreen made no puzzle in three requests, each stopped at
the 115 s time limit; reported as an addendum here. IGP-07: the round's summary (R27 to R29). The frozen round
(post-MP17): PM1 again, and the rest of tranche 1 if approved.

**Evidence.**

- `docs/improve-generating/evidence/provisional/IGP-05/pm1.md`: part 1 per cell and pooled by level, by offset and main
  work; part 2's fine counts; part 3's failure classes; the limitations. `pm1.json`; `families-windows.jsonl`,
  `families-scan.jsonl` and `families-failed-sets.jsonl` (every rating, with `censored`); `discoveries.jsonl` (the 93
  in-band ratings with their full inputs, so that each can be re-rated).
- `docs/difficulty-v3/landscape-v3-full/<case>-s3-2026-11-14.json`: MP12b1's prescreens of these cells (no set made);
  `<case>-2026-11-1[34].json`: today's accepted puzzles and their `ratingCensoredCount`.
- `tasks/improve-generating/05-pm1-tranche1-slice.md` (the reduced design and its limits) and
  `03-pm3-variants-and-budgets.md` ("Follow-up IGP-03h").

**Addendum after IGP-03h (request level on Hell 1 20x20), 2026-11-15 (Opus).**

- *What ran.* The prototype without the screen (`p1p5-w760`: P1 and P3 on canonical caps; no table prior exists for this
  cell, so each call starts at K − 8) on Hell 1 20x20, seeds 0 and 1 (K 42 and 38, today's start count 4), four
  workers. Every accepted rating of the arm is canonical (`verify-w760`: 117 of 117).
- *Result.* Both requests reached ten: T1 6.0 and 8.3 s, T10 48.9 and 36.9 s (median 42.9 s). On the same seeds
  MP12b1's prescreen made no puzzle; each request stopped at the 115 s time limit.
- *The accepted puzzles (20).* Clue share p10 / median / p90 0.289 / 0.357 / 0.405 (PM1's windows on this cell: 0.296 /
  0.370 / 0.444); 6 to 18 clues above today's start count, median 10.5 (PM1: 7 to 14, median 11); scores 77 to 103,
  19 of 20 central (PM1's windows: 6 of 11). The census was incomplete for 7 of the 20 (Hell 1 26x26 without the
  screen: 20 of 20; MP12b1: 134 of 134).
- *How the search got there.* Each call walks down from K − 8 (30 to 34 clues): its first probes are refused by AR1 or
  lie below the band, then a probe near 6 to 10 clues caps, and the bisection follows. The first in-band rating came at
  the 6th to 7th probe (median), at 14 to 15 clues (+10 to +11), after one to three canonical caps of about 2 s each. A
  start near PM1's windows (need 2 above) would skip most of that walk.
- *Hell 1 26x26 without the screen* (IGP-03h, part 1): T10 34.2 s against 39.7 s at 380 M and 179.3 s today; the
  screen does not pay on Hell 1 (0.88 times) and adds +0.75 clues on the same set; work per accepted puzzle 4,380 M
  units against today's 26,843 M. Need 3 (no screen for Hell) costs nothing there.
- *Reading.* This is the first request-level evidence on a Hell 1 board of 215 to 484 cells. A search with P1 and P3,
  without the screen and without a prior, served Hell 1 20x20 in about 43 s in Node on both requests, where today's
  search serves nothing in 115 s, and its puzzles lie in PM1's windows. It supports part 3 (a) of the recommendation.
  It is no offer: OD-P4's gates stay (D39 on phase 3's landscape, 20 requests with 90 % completion, and the matching
  browser runs).
- *Evidence.* `docs/improve-generating/evidence/provisional/IGP-03h/compare.md` ("Hell 1 20x20: arm only, no before
  partner": per request, the populations beside PM1, locate and calls per stage, every call's locate path; the Hell 1
  26x26 study and by-seed sections), `compare.json`, `w760/20x20-hell-1.runs.json` and `.calls.jsonl`,
  `w760/26x26-hell-1.*`, `verify-w760.md`; MP12b1's prescreen
  `docs/difficulty-v3/landscape-v3-full/20x20-hell-1-s3-2026-11-14.json`.

Plan-author answer:

---

## Phase-0 provisional round: closed (2026-11-15)

*A status note from the phase-0 prototype pack (Opus, SA1, the pack's author). It raises no question and has no answer
line; the open items are IG-P-Q17 and IG-P-Q18 above and the owner decision IG-P-Q02.*

**Status.** The provisional (pre-freeze) round of the pack (`tasks/improve-generating/`) is closed: IGP-00 to IGP-07
and the follow-up IGP-03h are accepted; the check-list holds the table in §5 and the sign-off in §8. The round counted
9,771.5 s of its 10,800 s of machine time; the remaining 1,028.5 s is not carried over, and no timed run remains. The
prototypes are harnesses under `tools/ig-proto/`: nothing in `core/`, `generator/` or any fingerprint changed.

**Summary.** `docs/improve-generating/evidence/provisional/summary.md` (with `summary.json`; commit `8fb9664`) is the
input of "Next actions" 4 above (plan version 2 with measured numbers). For each row R00 to R33 it gives the estimate,
the measured value with its completion, kind, formula and record, and a descriptive verdict; R31 (after all phases) is
a Projection with its assumptions. The rows that bear most on plan version 2 are R02 to R08 with R32 (P1 to P5 and the
population), R14 (the screen certificate), R22 to R25 (the first phase), and R27 and R28 (Hell). The values are
provisional: the current `rating-v3` runtime, two to six seeds per cell. The verdicts say where a value lies and
validate nothing, and the population of the accepted puzzles (R32) stands beside every time verdict. The official
phase-0 numbers come from the frozen round (owner decision "Phase 0").

**Open questions and what they block.**

- **IG-P-Q17** (two addenda and a note above; unanswered): P3 and P4 in `gen-v4`, the fit of `W_screen` (IG-P-Q09)
  and how PM3's gains are read: whether the P1 to P5 times (R02 to R08) stand with the population shift beside them
  (R32, R33), and which population rule of the options (a) to (c5) above `gen-v4` is built to. The later-round item
  D-IG7 below waits for it.
- **IG-P-Q18** (one addendum above; unanswered): the Hell 2 and Hell 3 route (IG-P-Q16, OD-P3), the cell list of
  phase 3's Hell 1 landscape (OD-P4, IG-P-Q11), and P4's prior and `W_screen` for the Hell levels in `gen-v4`. The
  later-round PM3 run for Hell 2 waits for its part 2.
- **IG-P-Q02** (owner decision; the plan author's provisional answer is (b), a shared request deadline): P5's design
  and the bench criterion. Its trigger, "after PM3", is met by the provisional PM3 (IGP-01 and IGP-03; the frozen
  round repeats it), so the decision is due before P5 is designed. Rows R13, R20, R21, R23 and R02 to R08 bear on it.

**Later-round items and what each needs.**

- The rest of PM1 tranche 1 (D-IG10; about 9 worker-hours, 2.5 h on four lanes): the owner's approval.
- A PM3 run for Hell 2 (the prototype without the screen, started near PM1's windows, on two or three boards): the
  plan author's answer to IG-P-Q18, part 2 (a).
- The window re-rating variant (D-IG7) and option (b) proper of IG-P-Q17 (P4 at today's start count): the plan
  author's answer to IG-P-Q17.
- 16x16 and 15x20 Nightmare after P1 to P5 (R09, D-IG9): the frozen round.
- P7 itself, the per-set calibration prior, P5's enforced budgets and attempt limit, P8's width and admission rules,
  PM1 tranche 2 (walked layouts and the held-out window audit), the error rate of estimated AR1 directions, and the
  browser runs (D-IG9): a later design decision, or the frozen round.

**Frozen-round preconditions** (check-list §6; `tools/ig-proto/README.md`, "Re-run index").

1. difficulty-v3 frozen after MP17, and `improve-generating` brought onto that source by the orchestrator.
2. The pack author's maintenance before any run. The anchored edits are re-checked with
   `node tools\ig-proto\lib\tree.mjs check-edits --all` and re-derived where MP12b3, MP13a, MP14a and MP14b moved them
   (`core/engine/clues.js`, `core/engine/generate.js`, `core/engine/policy.js`, `tools/calibrate.mjs`). `identity.mjs`
   and `compare.mjs` are changed to report "different source" instead of failing, since MP12b1 is then another source
   (`summary.mjs` already does so for R00).
3. The round approved, with its sample sizes and its own machine budget: the plans carry the reps, a frozen plan may
   widen them, and the plan author may change the sizes and the order (PM4, PM1, PM3, PM2). The lock protocol of
   check-list §7 applies, difficulty-v3 first.
4. Cells from the frozen catalogue `data/boards-v1.json`; a cell the frozen source no longer offers runs as a
   diagnostic offer (D-IG13).

Then one command per task and `node tools\ig-proto\summary.mjs --label frozen`; the records go to
`docs/improve-generating/evidence/frozen/`, and nothing provisional is overwritten.

---

## Audit addendum: report.md and plan.md against the provisional measurements (2026-11-15)

*An independent read-only audit compared `plan.md` and `report.md` with the round's `summary.md`; Opus checked each item
against the records. Rows are `summary.md`'s; every number is provisional (pre-freeze). No new question.*

1. Master: `report.md:34, 53, 81-83` expect 2.1 to 2.4 times from P6 to P8 alone. P6 with eight workers measured x0.93
   (14x14) and x1.10 (26x26), n 4 each, on this 16-logical-core machine (R25): at most x1.67 and x1.97 with P7 at 1.8.
2. P2, "about nothing on 10x10 and 12x12" (`report.md:141`): it holds on 10x10 (x1.0 to 1.1, R17), not on 12x12: x2.0
   at 190 M on today's call profiles, net of re-rating the lost useful ratings (R17), and x1.56 on the prototype over
   six seeds, with +0.75 clues on the same set (R33).
3. P1 and P4 "add little" where the start count is right (`report.md:28-29, 140, 143`: x1.0 to 1.15 and x1.05 to 1.15).
   On 26x26 Nightmare P1 to P5 gave x2.01 per seed (n 6, 0.69 to 3.91; R06), with P2 at x1.1 (R17) and no dead end
   today (R10: 0 %); it comes with +1 clue at the median (R32), and no arm isolates P1 or P4.
4. P6: x1.03 to 1.2 at Nightmare (`report.md:145`) against x1.32 on 26x26 Nightmare (n 4; Master x1.148, R22). "Up to
   1.67 times less time on completed ratings" (`plan.md:95`) against 9.9 to 22.8 % of rating time saved (R22; x1.41
   gross, IGP-04 `compare.json`); DLX is 3.3 to 4.0 % of PM2's rating time (R30), at most 10.2 % in a class.
5. P8: "up to 2 times on machines with 8 or more cores" (`plan.md:97`; batch x1.3 to 1.9, `report.md:147`) against
   batch x1.26 (Nightmare) and x0.95 (Master), set stage x0.94 and x0.72 on this machine, where one rating runs 9 to
   28 % slower at eight workers than at four (R23).
6. Premises in this file: P1 to P5 give 10x10 and 12x12 only 1.1 to 1.8 times, and both probably stay too slow in the
   browser (`:333, 349, 468`). 12x12 measured x9.3 with the shift (R05, R32) and x2.9 without the screen (R33); 10x10
   has no request-level run, and nothing has run in a browser. "Hell 1 plausible only on 576 and 676 cells" (`:469`)
   holds neither for windows (R27) nor for 20x20 in Node (R33: 2 of 2 reached ten, T10 42.9 s), as IG-P-Q18 notes.
7. R10's "inside" uses the broad 30 to 60 %. Against the per-cell ranges of `report.md:242` (14x14 41 to 52 %, 15x15b10
   44 to 56 %) both measured shares, 39.7 and 37.1 %, are below; for 12x12 the report gives 5 to 10 % (`:142`) and 4 to
   5 % (`:243`), and the measured 18.7 % is above both.
8. R29: the estimates 0.89, 0.53 and 0.10 come from `claude-opus-5.5/2-cross-review.md` §1.2 (lines 82, 81, 93), not
   from "report §1" as `summary.md` and the check-list's §5 cite; the numbers stand, and `summary.md` is unchanged.
9. Verdict words that read more than the data: R03's "inside" rests on 3 of 3 requests per cell (a one-sided 95 % lower
   bound of 37 % on completion); R22's Master "outside" is 0.002 below the range (14x14 1.18 inside); R07's "between"
   hides 26x26 Master's paired x0.83 (geometric mean 0.91, n 5, 0.38 to 2.13; IGP-03 `compare.json`), a possible
   slowdown, with -1 clue at the median (R32).

**Coverage gaps.** R09 (16x16, 15x20 Nightmare) not measured; P7 unmeasured, so R24, R25 and R31 are Projections; no
browser run, and 10x10 never at request level; PM1 tranche 1 at about 0.8 of about 10 worker-hours; no Hell 2 PM3 run;
two to six seeds per cell, so no usable p95 (the printed one is the maximum), and completion on three requests against
OD-P4's 20 at 90 %; non-regression thin: of the cells that pass today, only 26x26 Nightmare and two of 16 Master cells.
Which P1 to P5 numbers count, the screen's with its shift or the search without the screen, is IG-P-Q17's decision.

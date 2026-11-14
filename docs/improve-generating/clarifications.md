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

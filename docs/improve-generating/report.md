# Improve generating (Pentomino): joint analysis report on the plan

| Field | Value |
|---|---|
| Plan | [plan.md](plan.md), by Fable |
| Analysts | SA1 claude-opus-5.5 ("Opus", lead of this report) and SA2 gpt-6-astra ("Astra", reviewer of this report) |
| Source | Worktree `improve-generating` at `cd5d17f`: MP12b1's full landscape (`gen-v3`, `mixed-v2`, `difficulty-v3`, 80 M census) |
| Detail | Opus: [1-analysis](claude-opus-5.5/1-analysis.md), [1-speed-summary](claude-opus-5.5/1-speed-summary.md), [2-cross-review](claude-opus-5.5/2-cross-review.md). Astra: [1-analysis](gpt-6-astra/1-analysis.md), [1-speed-summary](gpt-6-astra/1-speed-summary.md), [2-cross-review](gpt-6-astra/2-cross-review.md) |
| Questions | [clarifications.md](clarifications.md): IG-P-Q01 to IG-P-Q16, blocking ones first |

**Every number after "today" is an estimate. Nothing was run for this report or for the analyses behind it: no
generation, test, benchmark, qualification or timing.** "Today" is Measured by MP12b1 and committed
(`docs/difficulty-v3/landscape-v3-full/`, Node, four workers, EPYC 7763, 20 requests per cell, 3 for the Hell
prescreens); the rest is Derived arithmetic on those reports or a Projection. **One exception:** §7 refers to Sudoku's
MS05e and CV6-05 evidence, which is committed in the sudoku repository, branch `improve-generating`, commit `ef8a9cc`
(paths in §7), not in this one; Opus read it, Astra did not review it. Where this report and a phase-1 or phase-2 file
disagree, this report holds (§8).

---

## 1. Summary

- **The plan's diagnosis is right, and the committed reports locate the waste.** On the 196 to 300-cell Nightmare boards
  78 to 89 % of the diagnostic samples at the start count are capped. If those witness samples represent production and
  the profiles of a call are independent (a Projection), 37 to 63 % of calls begin with four capped profiles and fall into
  `selectClues`' directionless phase 2: up to 16 more samples at the same count (`core/engine/clues.js:466-475`). A
  heuristic puts that dead end at about 30 to 60 % of today's batch workload there; P1 and P3 remove it, and P3 also
  changes later count choices. On 360 to 676 cells and on 3x29 the start count already holds about half or more of the
  accepted puzzles (45 to 93 %), so P1 and P4 add little there.
- **Planning midpoints for T10 in Node** (the mean of the two analysts' final values, both shown in §2; not a consensus
  forecast): 14x14 Nightmare 113 s → 59 s after the first phase (P6, P7, P8; Opus's illustrative factor) → 8 s after all
  phases (14 times; envelope 2 to 30 s); 15x15b10 86 → 6.8 s; 16x16 80 → 7.3 s; 12x12 62 → 19 s (3.3 times; its useful
  ratings are dear; Opus 16, Astra 21.7); the 360 to 676-cell Nightmare cells 12 to 24 → 5 to 8 s (2.3 to 3.7 times);
  Master 2.1 to 2.4 times from P6 to P8 alone.
- **Hell 1**, conditional on a window: 15 s (Opus) or 25 to 30 s (Astra) on 576 and 676 cells after all phases, with no
  established completion or tail; on 196 cells no offer is justified on current evidence; the other Hell cells stay
  unknown until PM1.
- **Availability:** every incomplete Nightmare and Hell 1 request of MP12b1 ended on the time limit, none on exhausted
  layouts. Opus expects 90 % or more completion in Node on the five failing Nightmare cells after all phases; Astra holds
  completion unknown until PM3 and qualification.
- **Correctness:** P2's screen needs a positive no-cap certificate (a normal stop is not one); P5's unit budgets do not
  bound wall time, and set and batch each get their own 115 s deadline; P10's symmetric transformations give no new
  layouts and `verifyPack` proves existence only; the calibration already changes later candidates (request identity).
- **Measure first:** PM4 and a targeted PM1 built on MP12b1's count curves (scope disputed, §6), then a P1 to P5
  prototype (PM3), before the full P7 kernel work.

| Headline cell | Today T10 median / p95, s (ten of 20) | After first phase (Opus's illustrative / 1.9) | After all phases: midpoint; tail span | Speed-up | Opus; Astra (all phases, median) | Envelope after all | Confidence |
|---|---|---|---|---|---|---|---|
| 14x14 Nightmare | 113.0 / 151.6 (11) | 59 / 80 | 8.0; 11 - 17 | 14 x | 8.0; 7.94 | 2.2 - 30 | low (Opus: low to medium) |
| 15x15b10 Nightmare | 86.2 / 141.6 (11) | 45 / 75 | 6.8; 10 - 16 | 13 x | 6.3; 7.22 | 1.7 - 26 | low (Opus: low to medium) |
| 12x12 Nightmare | 62.1 / 176.1 (17) | 33 / 93 | 19; 46 - 61 | 3.3 x | 16; 21.70 | 4.3 - 45 | low |
| 26x26 Nightmare | 18.6 / 31.4 (20) | 9.8 / 16.5 | 7.9; 12 - 19 | 2.4 x | 7.0; 8.84 | 1.9 - 14 | low |
| Master, 16 cells | 1.2 - 9.0 / 1.7 - 18.4 (20) | 0.55 - 3.69 / 0.77 - 7.45 (0.4 t + 0.09) | the same: P1 - P5 neutral | 2.1 - 2.4 x | t / 2.5; 0.3 + (t - 0.3) / 2.5 | 0.21 - 7.0 | low |
| Hell 1 26x26 | 108.7 / 167.6 (9) | 57 / 88 (Opus) | 15 or 25 - 30, if a window holds | 3.6 - 7 x | 15; 25 - 30 | 7 - 100 | very low |

---

## 2. Speed, before and after

Reading rules.

- *Today:* Measured T10 median / conditional p95 (requests that reached ten) and the number of requests of 20 that
  reached ten, from the per-cell reports `docs/difficulty-v3/landscape-v3-full/<cell>-2026-11-1[34].json` and
  `aggregate-2026-11-14.md`.
- *First phase* = plan phase 1: P6, P8 and the proved-equal items of P7; same puzzles. Shown: Opus's illustrative
  today / 1.9, median and p95. Astra accepted only the named examples 113 → 61 s (14x14) and 62 → 32 s (12x12) as
  low-confidence orientation, not a fitted uniform factor or a p95 rule. Master: the mean of Opus's t / 2.5 and Astra's
  0.30 + (t - 0.30) / 2.5, that is 0.4 t + 0.09; P1 to P5 are neutral there, so its two columns agree.
- *All phases* = plus phase 2 (P1 to P5 as `gen-v4`), eight workers, a cold fresh request; P9 to P11 are not included.
- *Midpoint* = the mean of the two analysts' final medians (Opus's 2-cross-review §5, Astra's 2-cross-review §6): an
  editorial planning midpoint, not a consensus forecast. *Tail span* = the union of Opus's tail point (today's p95 /
  (F x 2.2), at least 1.5 times his median) and Astra's two sensitivities (2.2 times her median; her median times today's
  p95 / median): tail scenarios, not a projected p95 or a maximum-response bound. *Envelope* = the union of both
  analysts' high-benefit to low-benefit median scenarios.
- *Confidence:* low for every future number, very low for Hell 1. Astra holds that agreement within 15 % does not raise
  it; Opus would rate 14x14, 15x15b10 and 16x16 low to medium, because the dead end that dominates them is visible in the
  reports.

| Cell (cells) | Today T10 median / p95 (ten of 20) | After first phase | After all phases: midpoint; tail span | Speed-up (all) | Envelope after all | Confidence | Opus; Astra after all, and why they differ |
|---|---|---|---|---|---|---|---|
| Master 60 - 100 (3 cells) | 1.16 - 9.00 / 1.69 - 16.44 (20) | 0.55 - 3.69 / 0.77 - 6.67 | the same | 2.1 - 2.4 x | 0.21 - 7.0 | low | Opus t / 2.5; Astra 0.30 + (t - 0.30) / 2.5 |
| Master 144 - 324 (6) | 2.57 - 5.96 / 6.83 - 18.41 (20) | 1.12 - 2.47 / 2.82 - 7.45 | the same | 2.3 - 2.4 x | 0.48 - 4.7 | low | as above |
| Master 360 - 676 (7) | 3.39 - 8.36 / 5.26 - 16.64 (20) | 1.45 - 3.43 / 2.19 - 6.75 | the same | 2.3 - 2.4 x | 0.63 - 6.5 | low | as above |
| Nightmare 3x29 (87) | 5.31 / 7.64 (20) | 2.8 / 4.0 | 2.5; 3.3 - 6.3 | 2.1 x | 0.6 - 4.2 | low | 2.2; 2.84: Opus credits the screen; Astra keeps today's count search and a startup floor |
| Nightmare 10x10 (100) | 24.04 / 68.44 (19) | 13 / 36 | 9.7; 24 - 31 | 2.5 x | 2.3 - 18 | low | 8.4; 10.98: Opus credits better count placement (x 1.3); Astra prices dear window profiles and 2.75 batch waves |
| Nightmare 12x12 (144) | 62.14 / 176.07 (17) | 33 / 93 | 19; 46 - 61 | 3.3 x | 4.3 - 45 | low | 16; 21.70: same mechanism (useful ratings near the cap); Astra prices four window profiles at about 1.6 s and 2.75 waves |
| Nightmare 14x14 (196) | 112.98 / 151.64 (11) | 59 / 80 | 8.0; 11 - 17 | 14 x | 2.2 - 30 | low (Opus: low to medium) | 8.0; 7.94: agree |
| Nightmare 15x15b10 (215) | 86.23 / 141.56 (11) | 45 / 75 | 6.8; 10 - 16 | 13 x | 1.7 - 26 | low (Opus: low to medium) | 6.3; 7.22 |
| Nightmare 16x16 (256) | 79.84 / 135.44 (15) | 42 / 71 | 7.3; 12 - 17 | 11 x | 1.8 - 29 | low (Opus: low to medium) | 6.8; 7.72 |
| Nightmare 15x20 (300) | 40.09 / 111.21 (15) | 21 / 59 | 6.6; 14 - 22 | 6.1 x | 1.4 - 27 | low | 5.1; 8.01: Opus takes the geometric mean of the two phase-1 models; Astra the call model with waves |
| Nightmare 18x18 (324) | 37.25 / 134.52 (20) | 20 / 71 | 6.1; 17 - 27 | 6.1 x | 1.2 - 25 | low | 4.6; 7.55: as 15x20 |
| Nightmare 18x20 (360) | 16.80 / 63.12 (20) | 8.8 / 33 | 4.9; 12 - 24 | 3.4 x | 0.9 - 12 | low | 3.2; 6.50: Opus credits the screen on a 35 % capped start; Astra keeps about four window profiles per call |
| Nightmare 20x20 (400) | 20.14 / 113.97 (19) | 11 / 60 | 5.7; 17 - 45 | 3.5 x | 0.9 - 15 | low | 3.5; 7.92: as 18x20 |
| Nightmare 20x21 (420) | 24.17 / 47.92 (20) | 13 / 25 | 6.5; 12 - 16 | 3.7 x | 1.6 - 17 | low | 5.8; 7.13 |
| Nightmare 32x15 (480) | 11.57 / 37.87 (20) | 6.1 / 20 | 5.1; 13 - 19 | 2.3 x | 1.2 - 8.6 | low | 4.4; 5.74 |
| Nightmare 22x22 (484) | 17.28 / 33.93 (20) | 9.1 / 18 | 6.0; 11 - 15 | 2.9 x | 1.5 - 12 | low | 5.4; 6.65 |
| Nightmare 24x24 (576) | 18.65 / 57.29 (20) | 9.8 / 30 | 6.6; 17 - 23 | 2.8 x | 1.5 - 14 | low | 5.5; 7.61 |
| Nightmare 26x26 (676) | 18.61 / 31.38 (20) | 9.8 / 16.5 | 7.9; 12 - 19 | 2.4 x | 1.9 - 14 | low | 7.0; 8.84 |
| Hell 1 14x14 (196) | none: 0 of 20 (5 puzzles; response max 229 s) | unknown (Opus: the set stage likely still fails) | 35 (Opus) or 55 - 65 (Astra), if a window holds; may hit P5's call budget | | 17 - 210 | very low | No offer justified on current evidence (both). Opus: unlikely in this feature; Astra: future success unestablished |
| Hell 1 24x24 (576) | none: 0 of 20 (13 set time limits) | unknown (Opus: likely still none; the start count is fully capped) | 15 (Opus) or 25 - 30 (Astra), if a window holds | | 7 - 100 | very low | Opus between the two phase-1 models; Astra Opus's phase-1 construction plus 10 - 20 % for batch waves |
| Hell 1 26x26 (676) | 108.72 / 167.59 (9) | 57 / 88 (Opus's / 1.9); completion unknown | 15 (Opus) or 25 - 30 (Astra), if a window holds | 3.6 - 7 x | 7 - 100 | very low | as 24x24 |
| Hell 1 on 215 - 484 (9 cells), Hell 2 (9), Hell 3 (4) | no set in 3 requests each; response about 115 s | unchanged | unknown; P5 ends a request without a window early | | | none | agree: PM1 first |

**The model, in one paragraph.** Both analysts now price a call (a locate, a prior, window profiles to a final in the
central half of the band, `clues.js:338-342, 404-411`, and screened caps) instead of dividing the request by uniform
factors (Astra's phase-1 model, which she withdraws in [her 2-cross-review §0 - §2](gpt-6-astra/2-cross-review.md)). "About
four window profiles" is a scenario parameter, not a floor in the code: `afterProfile` can return on the first central
eligible result. The remaining differences: Astra charges 2.75 four-worker waves for the nine batch slots where Opus
charges 2.25; where the start count is already right, Opus scales today's profile cost by the screen's saving on the
capped share, while Astra keeps the window profiles per call; and the tail shape (both shown). Derived inputs: the
count-curve tables of [Opus's 2-cross-review §1.2](claude-opus-5.5/2-cross-review.md) (with §8's corrections) and the
sampler and paired-request checks of [Astra's 2-cross-review §1 - §2](gpt-6-astra/2-cross-review.md).

---

## 3. Availability (completion), separate from speed

| Cell | Ten of 20 today (Measured) | After all phases: Opus | After all phases: Astra | What it depends on |
|---|---|---|---|---|
| Nightmare 12x12, 14x14, 15x15b10, 16x16, 15x20 | 17, 11, 11, 15, 15; every failure a time limit | about 19 to 20 of 20 in Node | unknown until PM3 and qualification | removal of the dead end; the window density at the new counts; correlated sets, novelty and history; P5 not ending calls early |
| Nightmare, the other ten cells | 19 to 20 | the same; protect | the same; protect | non-regression (PM3 includes them) |
| Hell 1 26x26 | 9 (11 time limits) | about 17 to 19 in Node | unknown | the window density at 5 to 7 clues (not sampled); census estimates (all 152 accepted Hell 1 puzzles); the large-board mode |
| Hell 1 24x24 | 0 (13 set time limits) | a timing candidate | unknown | as 26x26, plus a start count that is fully capped |
| Hell 1 14x14 | 0 | unlikely | unestablished | useful ratings near the cap (about 840 M units); P5's call budget can truncate the assumed pattern |
| Hell 1 on 215 - 484, Hell 2, Hell 3 | no set | unknown | unknown | PM1 windows; packs (P10) only with genuinely distinct layouts |

Neither analyst offers a cell on these estimates; phase 3's landscape, D39 and the browser gates decide. Browser
(planning rule 5 s + 4 x Node, not a measurement): after all phases every Nightmare median meets 60 s except 12x12's
(about 81 s). At the lower end of the tail spans most p95s meet 115 s; at the upper end (today's p95 / median ratio kept,
one of Astra's two sensitivities) 10x10 (up to about 129 s) and 20x20 (up to about 185 s) miss it, and 12x12 misses
across its span (about 190 to 250 s). Hell 1 misses its median and tail. 70 of 1,726 MP12b1 responses exceeded 120 s
(43 Nightmare, 27 Hell 1) while each action stayed inside its own 115 s; that contract is IG-P-Q02.

---

## 4. Per plan item

| Item | Expected gain (both analysts) | Same puzzles? | Main risks | Measure before / after |
|---|---|---|---|---|
| P1 bracketing | with P3, removes the dead end on 196 - 300 cells (a heuristic 30 - 60 % of today's batch workload); x 1.0 - 1.15 where the start count is right | no: `gen-v4` | §5 item 2; non-monotone windows; endpoints and small K | before: targeted PM1; after: PM3 |
| P2 screen | the capped share at the start count (3 - 89 %) times the cap's cost less the screen's; about nothing on 10x10 and 12x12, whose useful ratings would be re-rated | no; acceptance stays canonical | §5 item 1; a `W_screen` of 95 M is low for Nightmare | before: PM4 with certificate cases; work and nodes to the first solution |
| P3 capped = too few clues | most of P1's gain on 196 - 300 cells; on 12x12 and 18x18 the dead end is a heuristic 5 - 10 % of the workload, but P3 also changes later count choices | no | D21's counting rule changes; AR1 refusals stay apart | PM3: dead-end entries per call |
| P4 count prior | x 1.05 - 1.15 on the batch where the start is right; more on 100 - 300 cells | no | §5 item 3 | PM3; replay tests |
| P5 budgets | no speed; bounds tails only with a wall-clock contract | no | §5 item 4 | PM3: budget against clock |
| P6 DLX for accepted only | x 1.03 - 1.2 at Nightmare, x 1.15 - 1.6 at Master | identical scores (OD-P2) | no saving on profiles capped before the first solution; accepted puzzles need full metrics | rating equality |
| P7 same-units kernel | x 1.1 - 1.8 (likely 1.3) | identical if units, ties and caps are equal | §5 item 5 | PM2 first |
| P8 wider pool | batch x 1.3 - 1.9 (likely 1.6), set stage x 1.0 - 1.3 | identical when no deadline cuts in | §5 item 6 | 1, 2, 4, 8 workers; memory peaks |
| P9 idle stock | the next batch near zero on a stock hit | identical only when the full effective request matches | §5 item 7 | hit ratio |
| P10 prepared packs | no generation on a matching preverified untransformed hit; lookup, validation and rendering unmeasured; transformed entries need re-rating | content (OD-P3) | §5 item 8 | PM1 windows; pack verification |
| P11 WebAssembly | x 1.3 - 2 on the remaining kernel share | identical if equal | as P7 | PM2 after phase 2 |

---

## 5. Correctness risks, merged

1. **P2's screen.** After the first solution, the continued count and `settleCensus` change G, info and `Gproved`
   (`core/engine/deduce.js:1635, 1786`), so the plan's "score within two points" row is false. A normal stop is no
   certificate either: R7 returns NONE after the work cap and the ladder goes on to R8 and R9
   (`deduce.js:1098-1131, 1448`). Accept a screen result only with a positive no-cap certificate, otherwise re-rate
   canonically. Opus's certificate (the main-phase work at the end is at most `W_screen`, since every check is
   `work > workLimit`) is a sufficient special case only when every other canonical limit is unchanged; if `N_screen` is
   lowered too, it must be certified as well. The escalation sum of 1.875 bounds main allowances only, not repeated
   censuses, builds and diagnostics.
2. **P1 and P3 direction.** A cheap-side profile refused by AR1 is returned as `spent` and gives no direction
   (`clues.js:273-274`): use its score's actual side, keep it ineligible for acceptance and the stall count. A parallel
   bisection must consume one fixed probe and subset tree on every pool size.
3. **Request identity (P4, replay).** The calibration already changes later candidates through the frozen history
   (`core/engine/generate.js:385-429, 435, 495`; `core/browser/generation-client.js:814-823`); P4 adds a direct
   dependency. The prior, the prior-table version, target and uniqueness must be stored or rebuilt deterministically.
4. **P5 and wall time.** Units are not seconds (the probe's work rate spans 157 to 446 M units/s, so 6 G units is 13 to
   38 s); `begin` starts a separate 115 s timer for the set and the batch (`generation-client.js:447, 575, 812`); on
   196-cell Hell 1, 6 G units buy about seven near-cap ratings, fewer than the assumed locate-and-window pattern,
   although an early central or best candidate may still succeed.
5. **P7 equality.** The clue-specific model renumbers free columns and drops clued pieces
   (`core/engine/placements.js:181-190`), so "build once, cover clues" changes C, loop charges and tie order; a memo must
   reproduce cap boundaries, not charge a lump sum.
6. **P8 width and memory.** `min(8, hardwareConcurrency - 1)` gives a 4-core device three workers instead of four and
   needs a floor of 1. The bench already checks two memory criteria (`tools/bench/report.js:24-34, 329-359`): the
   whole-process peak against 1.5 GiB, and accounted bytes against workerCount x `WORKER_LIMIT_BYTES` +
   `MAIN_BUDGET_BYTES`. Workspaces grow lazily (`core/engine/workspace.js:177-197`); MP12b1's peaks with four workers are
   at most 404 MiB accounted and 655 MiB per process, but eight 224 MiB ceilings plus the main budget (2,092 MiB) could
   exceed 1.5 GiB in the worst case, so eight workers need an admission or resizing policy.
7. **P9 seeds and history.** The next batch's seed is random (`generator/jobs.js:384`). A stock serves the same puzzles
   only if the full effective request matches: seed, history, calibration, prior, versions, target and quantity; novelty
   alone, rechecked after the history changed, does not prove that.
8. **P10 layouts and verification.** `layoutKey` and `clueKey` are invariant under board symmetries and use shape ranks
   (`core/engine/keys.js:2-3, 62-98`): rotations, reflections and piece renaming give no new layouts. `verifyPack`
   (`core/engine/tasks.js:77-110`) proves existence only, not difficulty, AR1, the uniqueness mode or ten distinct
   entries. The pack's content belongs to the version.

---

## 6. Measurement plan

In this order; nothing here has been run.

1. **Freeze** on the post-MP17 source and decisions (F1 and F2, census, offers), with tuple, policy and provenance.
2. **PM4 first** (cheap): screen against canonical ratings, including normal stops after an overshoot, R7's early NONE,
   post-first-solution caps and a lowered `N_screen`; record main work and nodes to the first solution, the count tail
   and the census apart.
3. **PM1, targeted.** MP12b1's diagnostic samples already give coarse count curves at seven shares plus the initial count
   for every Nightmare cell and the three Hell 1 cells with sets (correct the aliased initial counts: 10x10's start is
   10 % capped, not 3 %). **Disagreement on scope.** Opus would cut PM1 to the cells without curves (Hell 1 on 215 to 484,
   Hell 2, Hell 3) plus fine counts on two or three Nightmare cells, about 3 to 15 worker-hours. Astra also supports
   removing redundant coarse scans, but would keep nested orders, walked layouts, failed sets, the final source and a
   held-out window audit. For orientation only, her illustrative workload of 15 cells x 60 families x 34 counts = 30,600
   ratings at 2.4 s is about 20 worker-hours (5 on four lanes): not a counted plan inventory or a predicted duration.
4. **PM3**, a P1 to P5 prototype: per call, profiles by outcome (capped, below, in band, central, above, AR1-spent) and by
   count relative to the start; entries into phase 2 (the dead end); window profiles per accepted puzzle; set-stage
   calls; completion with stop reasons; 4 and 8 workers side by side.
5. **PM2** after PM3, before the full P7 work (both analysts: do not spend P7's budget before P1 to P5's feasibility).
6. **Landscape and browser gates** (phase 3); no BQ flag from planning arithmetic.

---

## 7. Interaction with difficulty-v3

- **The baseline moves.** MP12b2 (offers, cells whose census estimates exceed 25 %), MP12b3 (F1 and F2 fail-fast, which
  P3 supersedes where P1 runs) and MP13 to MP17 change the source the feature starts from. D39 applied to MP12b1 would
  hide every Hell level; offers come from phase 3's landscape and the browser gates.
- **Versions.** Pentomino has an `algo` field (`gen-v3`), so P1 to P5 become `gen-v4` and re-derived areas a new policy
  id. The gap is request identity, not the version: the prior, the calibration and the history snapshot must be stored
  or reproducible (§5 item 3).
- **MS05e and CV6-05 (Sudoku; committed in the sudoku repository, branch `improve-generating`, commit `ef8a9cc`; read by
  Opus only).** Fable set aside Sudoku's guided sign pool today (CV6-05, Q1(b), in
  `docs/difficulty-v3/clarifications-resolved.md`; report `docs/difficulty-v3/cv6-guided-sign-dig-2026-11-14.md`;
  evidence `docs/difficulty-v3/evidence/MS05e/`; all three in the sudoku repository). Pentomino has no sign dig, so the
  code does not apply. The shared general lesson does: price complete passes, escalations and rejected work against the
  exact outcome. Here that means P1's parallel probes (P ratings per step) and P2's escalations, which re-rate useful
  profiles much as the pool re-rated its losers (it raised the ratings per removal from 1.15 to about `SIGN_POOL`).
  Opus's further reading, not endorsed by Astra: as MS05e's diagnosis gate did, measure the miss split exactly before
  production edits; here that is PM3's dead-end split, keeping in mind that an end-state share is not the coverage of an
  intervention.

---

## 8. Corrections to the phase-1 and phase-2 files

- **Opus.** 10x10's start count is 10 % capped, not 3 %, and 20x20's start count holds 45 % of its accepted puzzles, not
  54 % or more. The dead-end estimate counts the failures of phase 2 as `p (1 - p^16) / (1 - p)` (not `min(16, p / (1 - p))`)
  and a capped profile at the measured 1.9 to 2.4 s (not 2.65 s with a census it does not run); the shares of the batch
  workload proxy become about 41 to 52 % (14x14), 44 to 56 % (15x15b10), 29 to 37 % (16x16), 49 to 61 % (15x20), 9 to
  11 % (18x18) and 4 to 5 % (12x12), a heuristic that does not cap P3's benefit. The calibration already changes more
  than slot 1; units are not the same time everywhere and a unit budget does not bound 115 s; "p95 stays below 45 s"
  contradicted Opus's own 12x12 row; that useful profiles cap before the first solution is not established; P10's key
  quotient and `verifyPack`'s scope were missed; the bench already measures both memory criteria; the first-phase 1.9 is
  Opus's assumption; the 95 % and 85 to 95 % completion figures are hypotheses for PM3, not conclusions.
- **Astra.** The uniform P1 and P4 factors and the pooled capped share (now count-specific), Hell 1's four profiles per
  candidate with every window successful (now Opus's dearer construction), and the uniform pool factor on the set stage.

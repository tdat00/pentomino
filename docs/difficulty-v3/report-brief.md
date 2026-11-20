# difficulty-v3 (Pentomino) — brief report

| | |
|---|---|
| Date | 2026-11-12, 06:47 to 12:25 (local time, +07:00) |
| Who | orchestrator: GitHub Copilot CLI (Claude Opus 5.5) · analysts: **claude-opus-5.5** (Claude Opus 5.5, long context, max reasoning; lead author of the joint report) and **gpt-6-astra** (GPT-6 Astra, long context, max reasoning) · plan author: **claude-fable-5-2** · implementers, later: claude-sonnet-5.5 sub-agents |
| Code examined | `77e62cb` (branch `rating-v3`); the answers are in `04e7e90` and the acceptance answers in `e73712f` (documents only) |
| State | **analysis done and accepted; no code changed.** The joint report, signed by both analysts, was accepted by the plan author (`clarifications.md` part G, `e73712f`) and by the owner (11:50); the acceptance answers C1-C6 and the addition AR1 are applied. It is the basis of the task pack `tasks/difficulty-v3/`, now being written |
| Details | [`report-detailed.md`](report-detailed.md) (the joint report and implementation spec: RES-01 to RES-35, errata E01-E45, tasks, gates, risks, traceability, acceptance answers); [`clarifications-resolved.md`](clarifications-resolved.md) (every question and its answer; all decisions in part E; the acceptance concerns with their answers in part F; AR1 and the acceptance in part G) |

## What was asked

Make **Hard really hard**: today a puzzle rated Hard may need no guess at all. Carry out in full the plan
[`plan.md`](plan.md), written by claude-fable-5-2 after auditing the code: a deduction solver with rules R1-R9 and a
probe tool (P0), clue selection aimed at the centre of the band (P1), the rating model `difficulty-v3` in packs, codes
and both apps (P2; fixed: a fully forced puzzle caps at Normal, several solutions lower the score, band edges frozen),
calibration (P3) and **Generation Steps**, a replay of how each puzzle was made (P4).

Two analysts verify the plan against the code independently, review each other, respond and write one joint report;
open questions go to the plan author and the owner; then a task pack for claude-sonnet-5.5 sub-agents. The owner's
rules: full scope; the plan's approval-gate runs are pre-approved and run by the task that needs them; every new
design decision goes to the owner.

## Result in brief

- **Why Hard is not hard** (reproduced by both analysts): the v2 score `2U + 8 log10(1 + B)` counts DLX branches B. On
  a 20x18 board three Hard puzzles have U 9-10 and B 0, 0 and 2: forced puzzles rated Hard. B also depends on the
  search order (one Hard puzzle: B from 3 to 14 under six orders).
- **The plan's direction is sound, but it cannot be carried out literally**: two base maxima (12 and 16; 16 lets a
  forced puzzle reach Hard), rule R9 and half of R3 unsound as written, metrics that cannot rebuild the score, a node
  cap that does not bound the work, a wrong protocol warning, incomplete P1 and P4 contracts, tests and gate commands
  that cannot work as written. The joint report gives 35 resolutions and 45 errata.
- **The new score**: `base(U)` (at most 12) + a rule bonus for the hardest deduction tier used (0, 0, 2, 4) +
  `6·G + 4·info` (starting weights) − a small penalty for several solutions. Without a counted guess a puzzle scores
  at most 16, so it is never Hard. **G counts decisive guesses only**: with a complete census, a guess counts when one
  of its alternatives is proved to fail, so a free choice between solutions adds nothing; when this census cannot
  finish within its work limit, an undecided alternative counts as failing and the score is published as a labelled
  upper estimate, marked `censored` in packs and codes. A puzzle the Generator makes for Hard or above needs one
  guess with an alternative **proved** to fail (`Gproved >= 1`, added at acceptance): an estimate alone never makes a
  generated puzzle Hard. A search stopped by its cap before the first solution gives no rating: the candidate is
  skipped, and v3 has no "+" mark.
- **The weights must be fitted**: with the plan's starting weights the six 10x6 test puzzles rate 5, 6, 9, 38, 66
  and 104 in a partial prototype (Hard, Expert and Master two bands too high), and real guesses have 2 to 28
  alternatives, not about 2. A probe fits the weights within ranges set by the plan author before v3 is switched on;
  they are locked after the calibration run, before Generation Steps.

## What will change (UI/UX)

- **Players**: a generated Hard-or-above puzzle has at least one choice proved decisive. An imported puzzle rated
  with an incomplete census shows an upper estimate, not proof that a decisive choice was necessary. Puzzles with an
  old rating (v1 or v2) are shown re-rated on the new scale with a note giving the original; their codes and links do
  not change. An estimated score says so ("decisive estimate: n alternatives undecided within the work limit"; from a
  puzzle code, "decisive estimate"). A pack, link or code whose piece set has two pieces of the same shape (mirror
  images count as the same shape) is refused with a message in English and Vietnamese; before, it opened with a
  warning.
- **Generator**: clue selection stops early on a result in the central half of the band, otherwise takes the best
  result after 48 of its 64 trials. Each puzzle card gets a **How it was made** button: a dialog replays the
  generation step by step (set, layout, clue trials, uniqueness repairs) with a score table for every rated step, or
  states "steps not available for this puzzle". Re-rating and replay run on the existing worker pool and never cancel
  a generation. A saved piece set with two pieces of the same shape is removed at start-up with a one-time notice in
  English and Vietnamese.
- **Packs** keep the full v3 metrics (at most 4 KiB per claim) and the provenance of each puzzle
  (`generation.made`, `generation.setOrigin`). Puzzle codes carry a short summary claim: a 10x6 code grows from about
  46 to about 160 characters, a 20x18 code from about 154 to about 275; all still fit a QR code.

## Decisions

| topic | decision | by |
|---|---|---|
| scope and gates | full plan P0-P4; gate runs pre-approved and run by the task that needs them; new design decisions go to the owner | owner |
| guess measure (SA1-Q-P1) | decisive guesses; an unfinished census gives a labelled upper estimate; the penalty for several solutions stays | owner |
| search capped before the first solution (SA2-Q-P02) | unrateable, candidate skipped; no "+" in v3; caps set so that no path of the probe corpus is capped up to Master on boards up to 20x18 | owner |
| two pieces of the same shape (SA2-Q-P03 / SA1-Q-P6) | an error everywhere: packs, codes, Generator import, Player route | owner |
| calibration freedoms (SA2-Q-P09) | weights within the ranges, caps, K60 and SHARES may change in P3, every change recorded | owner |
| base and rule bonus (SA2-Q-P01, SA2-Q-P13) | base at most 12; bonus 0 / 2 / 4 by deduction tier; a forced puzzle scores at most 16 | plan author |
| fit ranges and timing (JR-P3, PROC-P1) | experimental ranges; fit before activation, lock before P4, regression run at the end | plan author |
| clue search (SA2-Q-P04, SA2-Q-P05) | real band centre, central-half stop, 16 trials kept in reserve; uniform clue sampling | plan author |
| codes and packs (SA1-Q-P3) | summary claims in codes, full metrics in packs | plan author |
| old ratings (SA1-Q-P2, JR-P1) | v2 and v1 claims re-rated for display with a note; the stored claim never changes | plan author |
| provenance (SA1-Q-P4, AUTH-P1, JR-P2, SA2-Q-P10) | `generation.made` and `generation.setOrigin`; skip lists capped at 64 and 16 entries | plan author |
| background requests (JR-P4) | one method on the existing worker client; no second worker pool | plan author |
| other points | R4/R5 per piece and cell only; one search order; no rule-based Player hints; all 14 plan corrections accepted | plan author |
| estimate mark in codes (C1) | `censored: true` on estimated v3 claims, full and summary; a code shows "decisive estimate" | owner |
| saved sets with two same-shape pieces (C4) | removed with a one-time notice in both languages | owner |
| proved decisive guess (AR1) | new metric `Gproved`; the Generator refuses a Hard-or-above candidate with `Gproved = 0`; imports not filtered | owner |
| other acceptance points (C2, C3, C5, C6) | clue search as specified (the reserve of 16 is only the stop point); release notes in the final record; 5 % of a level's probe puzzles per board as the estimate threshold; no objection to the retired twin tests | plan author |

All decisions with their wording: [`clarifications-resolved.md`](clarifications-resolved.md), parts E, F and G.

**Acceptance answers** (report §8.2; part F of `clarifications.md`): every answer follows the analysts'
recommendations (C1 and C4 decided by the owner). AR1 (part G) was added by the owner during the plan author's review.
The plan author's condition, that C1, C4 and AR1 are written down before MP05 starts, is met by the report and the
task pack.

## Timeline

| time | what was done | found | decided |
|---|---|---|---|
| 06:27 | plan committed (`77e62cb`, branch `rating-v3`) | | |
| 06:47 | brief; both analysts start independently | | |
| before 07:05 | | | owner: full scope P0-P4; gate runs pre-approved; new design decisions to the owner |
| 07:00 – 07:08 | baselines at HEAD: quick set 1,110 tests in about 16 s, `npm run check` 1.1 s, all green | two quick runs at once collide in `tests/artifacts/` | one test run at a time per working tree |
| 07:20 – 07:24 | independent reports | diagnosis confirmed; base 16 breaks "forced caps at Normal"; R9 and R3 "place" unsound; protocol warning wrong; starting weights far from the data | |
| 07:46 – 07:55 | cross-reviews | | |
| 08:06 – 08:14 | responses; final positions and merged task breakdowns | four questions disputed: decisive guesses, capped search, identical shapes, calibration freedoms | |
| 08:30 | all questions collected in `clarifications.md` (orchestrator) | | |
| 08:46 | joint report drafted (claude-opus-5.5) | | |
| 08:52 | | | owner pauses the task pack until the plan author has reviewed the joint reports |
| 09:12 | gpt-6-astra's check of the joint report | 13 required changes | |
| 09:46 – 09:48 | changes applied, co-signed, documents committed (`e6b0ead`) | | |
| 10:00 | answers committed (`04e7e90`) | | the plan author answers every question; the owner decides the four disputed rows and forbids identical shapes |
| 10:02 – 10:45 | joint report finalised with the answers (RES-34 added, MP04b dropped); this brief | six points for confirmation at acceptance | |
| by 11:05 | gpt-6-astra's check of the final report | four exact corrections (FC01-FC04); agrees with the recommendations on the six points | |
| 11:07 – 11:15 | corrections applied; both analysts signed (`2721a46`) | | |
| 11:49 | answers to part F and AR1 committed (`e73712f`) | | the plan author answers C1-C6 and accepts the report; the owner decides C1, C4 and AR1 |
| 11:50 | | | the owner accepts; task pack and implementation may proceed |
| 11:52 – 12:25 | acceptance applied to the report (RES-35 added) and to this brief; task pack started | | |

## Planned tasks

One developer at a time, strictly in this order; each task ends with the quick tests and `npm run check`, and the
orchestrator commits each accepted task on `rating-v3`; nothing is pushed. The task pack dispatches the larger tasks in
parts of about 20-60 minutes each (MP02a-b, MP06a-b, MP09a-c, MP10a-b, MP12a-b, MP13a-b, MP14a-b, MP15a-b, MP16a-b).

| task | what | size, agent h | gate |
|---|---|---|---|
| MP01 | model metadata for the solver | S-M, 1-2 | |
| MP02 | deduction core: R1, R2, R3 check, R6, guesses, statuses, work and memory caps | L, 5-8 | |
| MP03 | rules R3 place, R4, R5 | M, 3-4 | |
| MP04 | rules R7, R8, R9, tiers, soundness oracle | L, 5-7 | |
| MP05 | decisive census, the estimate and `Gproved` | L, 4-7 | |
| MP06 | probe tool, order study, caps, candidate weights, v2 baseline | M, 3-6 | GV2 |
| MP07 | centre-seeking clue selection, `gen-v3` | M-L, 3-5 | GF-P1, GA-P1 |
| MP08 | v3 score and breakdown, fitted weights, types | M, 2-3 | |
| MP09 | activate v3 in rating, packs and codes; the proved-guess rule; same-shape sets refused everywhere | L, 9-13 | GF-P2, GA-P2, GC-P2 |
| MP10 | re-rated display of v1 and v2 claims, estimate note, background request method | L, 6-10 | GC-P2 |
| MP11 | calibration tooling, slow test | M-L, 3-5 | |
| MP12 | calibration run; weights **locked** | M, 3-5 | GL-P3 |
| MP13 | provenance in packs | L, 7-10 | GF-P4 |
| MP14 | recorders and rating detail | L, 6-9 | |
| MP15 | replay engine and worker task | L, 7-10 | |
| MP16 | Generation Steps dialog | L, 6-9 | GB-P4 |
| MP17 | final regression evidence, release notes | M, 2-4 | GZ |

## Effort

**Estimate**: 75-117 agent hours of development for the 17 tasks (gpt-6-astra's engineering estimate of the draft
scope: 88-139 hours), plus machine time for the gates: GV2 1-3 hours, GL-P3 several hours (the full landscape of 105
cases on 16 boards has never been run; estimated 5-13 hours of shards of at most 10 minutes).

**Main risks**: unsound rules that remove a solution (guarded by an all-solutions oracle); the Hard hit rate on large
boards; frequent census estimates or unrateable candidates at high levels (measured by MP06, reported to the owner);
packs and links with two same-shape pieces that opened before and are now refused; rating cost per candidate.

**So far** (analysis only):

| agent | model | AI credits | tokens in / out |
|---|---|--:|--:|
| claude-opus-5.5 (analyst, joint report) | Claude Opus 5.5 | 7,596.95 | 184,137,328 / 1,229,170 |
| gpt-6-astra (analyst, checks) | GPT-6 Astra | 12,221.42 | 37,289,131 / 397,246 |
| orchestrator | Claude Opus 5.5 | 2,733.53 | 38,627,391 / 154,729 |
| **total** | | **22,551.90** | **260,053,850 / 1,781,145** |

Measured at 10:38 from the local usage records (input tokens include cached reads). The figures cover both
repositories, Pentomino and Sudoku, whose difficulty-v3 analyses ran together; the plan author's answers are not
included.

## What acceptance covered

The plan author (part G of `clarifications.md`) and the owner (11:50) accepted the specification RES-01 to RES-35 as
the basis of the task pack, the task order, sizes, gates and effort above, and the answers to the six points of report
§8.2 with the addition AR1. The task pack is now written (a check-list and one file per task) and the tasks are then
carried out one at a time.

## Documents

| file | content |
|---|---|
| `report-brief.md` | this file |
| [`report-detailed.md`](report-detailed.md) | the joint report and implementation spec: baseline and verified findings, resolutions RES-01 to RES-35, errata, tasks and gates, risks and effort, traceability, acceptance answers, sign-off |
| [`clarifications-resolved.md`](clarifications-resolved.md) | every question of both analysts with the plan author's answers and the owner's decisions; part E: the decisions in one place; part F: the acceptance concerns and their answers; part G: AR1 and the acceptance |
| [`plan.md`](plan.md) | the plan (claude-fable-5-2) |
| [`claude-opus-5.5/`](claude-opus-5.5/) `1-report.md` … `3-response-to-review.md` | independent analysis → review of the other report → response |
| [`gpt-6-astra/`](gpt-6-astra/) `1-report.md` … `5-check-of-final-report.md` | independent analysis → review → response → check of the joint report → check of the final report (FC01-FC04, applied) |
| [`../../tasks/difficulty-v3/`](../../tasks/difficulty-v3/) | the task pack: `check-list.md` and one file per task |

The analysts' probe scripts and raw data are not part of the repository; the reports quote every number they rely on.

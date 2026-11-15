# Improve generating (Pentomino): questions for the plan author

This file holds the **open questions** for the plan author, the owner's decisions and the plan author's notes on each
plan version. At the owner's request (2026-11-15) answered questions are removed once the analysts have checked the
answers. The full text of IG-P-Q01 to IG-P-Q28 with their answers, the plan author's direction of 2026-11-14 and the
plan author's positions on IG-P-D1 to IG-P-D7 is in this file at commit `1731c6b`; `plan.md` and the reports cite them
by ID. The answers to IG-P-Q25 to IG-P-Q28 and the corrections C1 to C18 accepted from the joint report on version 3
go into the next revision of `plan.md`, together with the answers to the open questions below.

---

## Owner decisions (2026-11-14, 19:10, through `ask_user` and email)

| Id | Decision |
|---|---|
| OD-P1 | **Approved, with the D21 line (IG-P-Q06):** a new `algo` version `gen-v4` after difficulty-v3 closes; seeds give other puzzles; under `gen-v4` a capped profile counts as "too few clues". |
| OD-P2 | **Approved:** the DLX diagnostic runs only for accepted puzzles (P6). |
| IG-P-Q02 | Open: one deadline or two budgets is decided after PM3 and before P5's design. |
| Phase 0 | **Confirmed:** the official phase-0 measurements start once difficulty-v3 freezes (post-MP17). Prototypes are built now as harnesses outside every fingerprint with no production change; their numbers are provisional (pre-freeze) and are re-run on the frozen source. |

---

## Plan version 2 (plan author, 2026-11-15)

`plan.md` is revised to version 2 from the provisional round, as "Next actions" 4 asked. Its section 0 gives the
estimate against the measurement and the changes; the audit addendum below is taken into it. In short:

- **Better than estimated:** the search (P1, P3, P4, and P2 where it pays) on the failing Nightmare cells, and
  the Hell 1 windows. **As estimated:** Hell 1 26x26 and 26x26 Nightmare. **Worse:** P6 against the plan's
  figure, P8, the first phase as a whole, Master (no gain), Hell 2 and Hell 3.
- **Changed:** P1 to P5 only at Nightmare and the Hell levels; `W_screen` as a table under (c5); the parallel P1
  variant dropped; P8 demoted to an opt-in; P7 raised, with a spike in the frozen round; Hell 3 closed; phase 1
  no longer has to precede `gen-v4`.
- **Owner decisions now open:** IG-P-Q02 (due), OD-P5, OD-P6, OD-P7, OD-P8 (plan section 7).

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

---

## Owner decisions (2026-11-15, after the plan author's positions; through `ask_user` and email)

The owner approved all seven decisions as the plan author and the analysts recommend, with the plan author's
conditions as written in each answer above.

| Id | Decision |
|---|---|
| IG-P-D1 (IG-P-Q02) | **(b)** one end-to-end request deadline (115 s generation stop inside a hard 120 s response bound) with a reserved batch share fitted as a frozen-round pilot parameter, deterministic work caps first and the wall clock as backstop, a cut response returning the puzzles accepted so far, lost completions counted against the uncapped search; the separate budgets stay until the pilot has run. |
| IG-P-D2 (OD-P5) | **(a)** progressive presentation now, in fold order, with the history policy stated; a service level (b) only later, for named cells with measured browser first-puzzle times. |
| IG-P-D3 (OD-P6) | **(a)** the level is the score band, the centre rule and AR1; two-sided population reporting beside every timing, (c4) measured, and a blind play comparison before any phase-3 offer (Hell 1 on 14x14 shown as the extreme case). |
| IG-P-D4 (OD-P7) | **(a)** no screen by default on Nightmare up to 144 cells. |
| IG-P-D5 (OD-P8) | **(a)** in stages after the frozen source receipt: the data-only inventory first, then the Hell 1 cells (14x14 and 24x24 included), then the Hell 2 cells for the central share; Hell 3 cells dropped. |
| IG-P-D6 (OD-P9) | **(a) with (i) and (ii)**: Hell 2 and Hell 3 closed for this feature as a scope decision; 24x24 and 14x14 Hell 1 get request-level arms in the frozen round as candidate populations, not offers. |
| IG-P-D7 (OD-P10) | **(a)** a separately priced, staged frozen-round manifest after source preparation, the browser calibration as its optional first stage; nothing of the provisional round carries over. |

---

## Plan version 3 (plan author, 2026-11-15)

`plan.md` is revised to version 3 from the joint report on version 2, the answers IG-P-Q19 to IG-P-Q24 and the
owner decisions IG-P-D1 to IG-P-D7. It is one current document: the "version 2" notes and the section 9
addendum are merged into their sections, and version 2 stays at commit `240398f`. It ran nothing and changes no
gate.

- **Changed:** forecasts at four workers from one sensitivity formula (section 4); C2 withdrawn; the per-set
  prior promoted to a Hell 1 pilot arm; Hell 2 and Hell 3 closed as a scope decision; Hell 1's candidate range
  196 to 676 cells; the admission statistics fixed before the validation seeds run (section 5.2); a staged
  frozen round with 20 validation seeds (section 5.1); the browser column labelled as a sensitivity.
- **Corrections:** the 22 items of the joint report's (e) are taken in.
- **Still to come to the owner:** the frozen round's price after source preparation, and the phase-3 decisions
  (plan section 7).

---

## The plan author on the plan-v3 joint report (2026-11-15)

- **Corrections C1 to C18 are accepted** and go into the next revision of `plan.md` as written. I recomputed
  C2's rows: Hell 1 26x26 17.4 s (11.6 to 27.5) and 20x20 21.8 s (14.5 to 34.5). C1's `locateCount` replaces
  my pseudocode, which left `lo` unset when the first result was not BELOW.
- **JV3-P20, a correction to this log.** "It ran nothing and changes no gate" in my note on version 3 was too
  short. Version 3 ran nothing, but it refines the gates (the admission statistics of 5.2, the completion
  gate, the staged round). No gate has been evaluated and none has passed.
- **JV3-P10.** My caution on 14x14 Hell 1 (IG-P-Q21, IG-P-D3) guessed K at about 21. The sets have K 32 to 34
  and their windows lie at 11 to 14 clues, that is 0.34 to 0.44 of K, not "half the pieces or more". It is
  still the extreme case for the blind play comparison, and IG-P-D3 stands.
- **The global completion gate.** It stays global, as Astra reads it: one failing headline cell stops phase 2.
  A per-cell fallback to the legacy path would be a new proposal and is not made here.
- **Answers IG-P-Q25 to IG-P-Q28** above change the manifest's content and stage order, not its approval
  (OD-P10). No owner decision is needed.

---

## Analysts on the answers to IG-P-Q25 to IG-P-Q28 (2026-11-15)

Opus (SA1) and Astra (SA2) checked the answers independently against the source at `e5bb721`, the owner decisions
IG-P-D1 to IG-P-D7, the joint report and the plan, and endorsed each other's follow-ups. **IG-P-Q27 and the plan
author's note on the joint report are accepted. IG-P-Q25, IG-P-Q26 and IG-P-Q28 are accepted with one follow-up each
(IG-P-Q29 to IG-P-Q31 below). No owner decision is needed.**

- **IG-P-Q26.** The minimum of 15 matched sets is reachable (both arms served the same set on 6 of 6 provisional
  12x12 requests and 2 of 2 Hell 1 26x26; a request that is served but does not reach ten still counts as a matched
  set), though it is not guaranteed. The 120 s cap does not clash with the 115 s stop: under the single request
  deadline a completed T10 is at most 115 s, so only failed requests enter at 120 s.
- **IG-P-Q28.** The anchors hold at `e5bb721` (`clues.js:45-53` and `270-276`, `generate.js:273-281`); the app and the
  generator pass no observer.
- **Note for the next revision (no answer needed).** With Master identity at five seeds, stage 4 is about 3.4 to
  4.2 h (Projection), not 4.2 to 4.9 h.

## Open questions (analysts, 2026-11-15)

Both analysts agree on the three questions below; none needs a run to be answered.

### IG-P-Q29: Which arm does the completion gate judge? (follow-up to IG-P-Q26)

*Raised by Opus (SA1), endorsed by Astra (SA2). Affects phase 0's gate and what ships per class.*

**Question.** The screen classes run both arms on the 20 validation seeds, and a class is admitted only if every
validated cell passes. A shortfall on 16x16, which has never run the new search, can make the 196 to 324-cell class
"inconclusive", so 14x14 and 15x15b10 would ship without the screen. Section 5.2's completion gate (18 of 20 requests
reach ten, no dead-end entry) does not say which arm it judges, so a cell could pass on the arm it will not ship.

**Joint recommendation.** Judge each failing cell's completion gate, and the no-regression bound, on the arm its class
ships after the (c5) verdict: the screen arm if the class is admitted, otherwise no screen. Missing evidence for that
arm makes the cell incomplete, never a pass.

Plan-author answer:

### IG-P-Q30: Does the global completion gate now cover the Hell 1 headline cells? (follow-up to IG-P-Q25)

*Raised by Astra (SA2), endorsed by Opus (SA1). Affects phase 0's gate.*

**Question.** The answer to IG-P-Q25 lists the failing headline cells as the five Nightmare cells and "Hell 1 26x26,
20x20, and 24x24 and 14x14 if admitted", with an absolute gate of 18 of 20 requests reaching ten. Read with section 5.2
("one failing headline cell stops phase 2"), this extends the global completion gate to Hell 1. Version 3 limits that
gate to the failing Nightmare cells (section 5.2 and phase 0's gate), and Hell 1's offer goes through OD-P4 (D39 plus
the browser runs) in phase 3. Is the extension intended?

**Joint recommendation.** Keep the global gate on the failing Nightmare cells. Report Hell 1's 18-of-20 result, but do
not make it a new global blocker of phase 2 without an explicit gate change. Leaving out the 20x20 baseline is a budget
choice, not a proof from three failed requests.

Plan-author answer:

### IG-P-Q31: Completing the observer contract (follow-up to IG-P-Q28)

*Raised by Astra (SA2), with Opus's (SA1) addition; endorsed by both. Affects stage 1's preparation and `gen-v4`.*

**Question.** The answer says "an observer never changes a result or a loop's control flow". A throwing `record` or
`charge` propagates unchanged and so does change the control flow, which replay's cancellation and work limits rely
on. The answer also does not name the repair-uniqueness charges (`onCount: charge`, `clues.js:461` at `e5bb721`) or
the replay consumer. Should the contract be stated as below?

**Joint recommendation.**

- Invariance holds for observers that return normally; an exception thrown by an observer propagates unchanged through
  the engine.
- The repair-uniqueness charges are kept, and every rating attempt is charged once, before its event.
- `core/engine/replay.js` joins the consumers to check: it is the only caller that passes `record`, `replaySkips` and
  `charge` (`replay.js:419, 441` at `e5bb721`), and it is where a skip list recorded under one version (`gen-v3` or
  `gen-v4`) must be refused when replayed under the other.

Plan-author answer:

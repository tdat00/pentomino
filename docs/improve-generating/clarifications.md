# Improve generating (Pentomino): questions for the plan author

This file holds the **open questions** for the plan author, the owner's decisions and the plan author's notes on each
plan version. At the owner's request (2026-11-15) answered questions are removed once the analysts have checked the
answers. The full text of IG-P-Q01 to IG-P-Q28 with their answers, the plan author's direction of 2026-11-14 and the
plan author's positions on IG-P-D1 to IG-P-D7 is in this file at commit `1731c6b`; IG-P-Q29 to IG-P-Q31 with their
answers are at commit `f768220`, IG-P-Q32 to IG-P-Q35 with their answers at commit `854a69d`, and the question
IG-P-Q36 at commit `b7e5dff`. `plan.md` and the reports cite them by ID. Plan version 4 has taken in the answers to
IG-P-Q25 to IG-P-Q35, the corrections C1 to C18 accepted from the joint report on version 3 and the resolution of
IG-P-Q36 below. IG-P-Q37 is the open work-accounting disagreement raised during task-pack review on 2026-11-16;
only the affected work-condition rule awaits that answer.

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
(IG-P-Q29 to IG-P-Q31, since answered; text at `f768220`). No owner decision is needed.**

- **IG-P-Q26.** The minimum of 15 matched sets is reachable (both arms served the same set on 6 of 6 provisional
  12x12 requests and 2 of 2 Hell 1 26x26; a request that is served but does not reach ten still counts as a matched
  set), though it is not guaranteed. The 120 s cap does not clash with the 115 s stop: under the single request
  deadline a completed T10 is at most 115 s, so only failed requests enter at 120 s.
- **IG-P-Q28.** The anchors hold at `e5bb721` (`clues.js:45-53` and `270-276`, `generate.js:273-281`); the app and the
  generator pass no observer.
- **Note for the next revision (no answer needed).** With Master identity at five seeds, stage 4 is about 3.4 to
  4.2 h (Projection), not 4.2 to 4.9 h.

---

## Plan version 4 (plan author, 2026-11-15)

`plan.md` is revised to version 4. It takes in corrections C1 to C18 of the joint report on version 3, the
answers IG-P-Q25 to IG-P-Q31 and the analysts' note on stage 4's price. Version 3 is `plan.md` at commit
`8d795f8` (before the cleanup). Version 4 ran nothing. It refines the gates; no gate has been evaluated
and none has passed. No owner decision is needed.

- **Changed in section 5:** today's arm only where a gate needs it; Master identity on five seeds per cell;
  rule (c5) fails closed (minimum of matched sets, the 120 s endpoint, unlisted classes, the resampling
  recipe); the completion gate judges the arm a class ships; Hell 1's 18 of 20 is a reported candidate result,
  not a gate of phase 2; PM1's Hell 1 work feeds P4's table and stays in stage 5; stage 3 freezes the whole
  production configuration; the observer, replay and provenance contract joins the preconditions.
- **Changed in section 4:** `gamma` acts on the batch time only, so Hell 1 26x26 is 17.4 s (11.6 to 27.5) and
  20x20 is 21.8 s (14.5 to 34.5); 20x20 does not reach 13.75 s inside its range.
- **Changed in section 3:** P1's `locateCount` is the measured prototype's contract; P7 keeps the memory-limit
  outcome; no fail-fast exists (P-OD12).

---

## Analysts on the answers to IG-P-Q29 to IG-P-Q31 and plan version 4 (2026-11-15)

Opus (SA1) and Astra (SA2) checked the answers and version 4 (`plan.md` at `f768220`) independently against the joint
report on version 3, the answers, the analysts' notes and the source at `e5bb721`, and endorsed each other's
follow-ups. **IG-P-Q29, IG-P-Q30 and IG-P-Q31 are accepted. Version 4 takes in C1 to C18, the section 4 rows, the
answers IG-P-Q25 to IG-P-Q31 and the stage-4 note correctly. Its edits raised four follow-ups, IG-P-Q32 to IG-P-Q35,
since answered (text at `854a69d`). No owner decision is needed.**

- **Anchors.** `replay.js:413/435/175` are right at `471583a`, the fetched `rating-v3` tip; the same lines are
  419/441/181 at `e5bb721`, its local descendant (MP15a2). `plan.md` cites no `replay.js` line, so nothing changes.
- **Format (no answer needed).** Line 37 of `plan.md` is 160 characters long (since wrapped).

---

## Plan version 4, revised (plan author, 2026-11-15)

`plan.md` takes in the answers IG-P-Q32 to IG-P-Q35. It stays version 4; nothing else changed and nothing ran.

- **Section 5.2:** the matched set's definition; admission of a class requires its screen arm to pass the cell
  gates; both arms run all 20 seeds in a screen class.
- **Sections 5.1 and 6:** a `gen-v4` build replays `gen-v4` records only; `gen-v3` records are "unavailable" by
  version; the table versions join the version comparison.
- **Section 5.2, Hell 1:** a validation result excludes only its own board.
- **Format:** the overlong line 37 is wrapped.

---

## Analysts on the answers to IG-P-Q32 to IG-P-Q35 and the revised version 4 (2026-11-15)

Opus (SA1) and Astra (SA2) checked the answers and `plan.md` at `854a69d` independently against the source at
`e5bb721`. **All four answers are accepted, and the revised version 4 reflects them without a substantive
inconsistency. Version 4 is ready as the planning basis, subject to the one Low follow-up IG-P-Q36 (resolved
below). No owner decision is needed.**

- **Notes for the next edit (no answer needed).** Line 606 of `plan.md` is 136 characters long; break it after "uses
  the screen.". Line 625 states two of the three board states of IG-P-Q33; it may add "a validated board that
  reached 18 of 20 enters it".

---

## IG-P-Q36: resolved by the analysts on the owner's delegation (2026-11-15)

The owner (22:12): "không cần trả lời từ fable, giao 2 agent opus và astra chốt phương án" (no answer from the plan
author is needed; the two analysts settle the option). Opus (SA1) and Astra (SA2) chose **option (3)**: keep the
original five-key shape for `gen-v3` records and require the two table versions for `gen-v4` records. Option (3)
keeps the answer to IG-P-Q34 as written, needs no second preflight comparison (as (1) would) and does not overload
`POLICY_ID`, the offer policy (as (2) would).

- **Contract.** The stored `versions` keys depend on the record's `algo`: a `gen-v4` record has today's five keys
  (`pack.js:62` at `e5bb721`) plus P4's table version and the `W_screen` table version (names for the design, for
  example `priorTable` and `screenTable`); every other record, `gen-v3` included, has exactly the five. The reader
  (`versionsProblem`, `copyVersions`) checks and copies the key set of the record's own `algo`; a valid record of
  either shape is kept and survives a load and a save deep-equal; a record of the wrong shape is dropped with a
  warning, as today (RES-27). A `gen-v4` build's `provenanceVersions()` returns all seven keys; `sameVersions`
  compares the five, and the two table versions when both sides are `gen-v4`; any difference gives "unavailable"
  (`set-versions` at the set stage, `record-versions` at the candidate stage) before any skip is applied. Builds
  older than `gen-v4` keep dropping seven-key records as foreign (out of scope).
- **Tests.** Under a `gen-v4` build `tests/fixtures/replay-case.json` loads with no provenance problem, keeps
  `generation.setOrigin` and `generation.made` deep-equal through a load and a save, and replays as "unavailable"
  with the reason `set-versions`. Negative cases: a `gen-v4` record without a table version, and a `gen-v3` record
  with one, are dropped with a `versions:` problem; a `gen-v4` record made under another table version is
  "unavailable".
- **`plan.md` (version 4), edited by the orchestrator with both analysts' agreement:** section 5.1 gains the bullet
  "Provenance shape (IG-P-Q36)"; section 6's replay test states the refusal case and the two negative cases;
  section 5.2's Hell 1 bullet names all three board states (IG-P-Q33); the overlong line of rule (c5) is wrapped;
  section 7 notes that IG-P-Q36 was resolved by the analysts on the owner's delegation. No other text changed.

## Open questions

### IG-P-Q37: work acceptance when a speculative worker is terminated inside a primitive

**Addressee:** the plan author (supervisor, SA-Fable).

**Raised by:** SA-Astra (reviewer), against SA-Opus (pack author), during `break-tasks` review round 3,
2026-11-16. This is the supervisor escalation of Q-RV3-01, not a new owner decision or an adopted change to the plan.

**Decision needed:** which work-acceptance rule binds plan §5.2's "Work units per accepted puzzle are reported
beside it and may not be worse with the screen" when the pool kills a worker inside a primitive?

**Context and current state.**

Plan §5.2, rule (c5), faster (`docs\improve-generating\plan.md:600-602`), says:

> **Rule (c5), faster.** Wall time binds: the geometric mean of the per-seed T10 ratio (no screen over screen)
> is at least 1.15, and its one-sided 90 % lower bound, resampled by seed, is above 1.0. Work units per
> accepted puzzle are reported beside it and may not be worse with the screen.

The same section makes an inconclusive screen class use no screen; that arm still has to pass its own cell gates.
The question is the work quantity and the evidence needed for its non-worsening condition, not the wall-time,
completion or clue-population thresholds.

At `3fc65f4`, `core\browser\worker-pool.js:293-325` implements `abortEntry` by calling `discard` for a busy slot;
`discard` calls that worker's `terminate()`. Outstanding speculative tasks are aborted on exit by the set,
completion and batch controllers (`core\browser\generation-client.js:696-699,1080,1172-1175` at the same commit).
The primitive's work is reported after it returns, including a reported work-cap outcome
(`core\engine\clues.js:173-212,322-344` at `3fc65f4`). A kill inside the primitive can therefore leave consumed
work without its terminal counter report. Both SAs accept this operational behaviour.

All pack evidence below is the frozen copy under
`docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\`, not the live task pack.
Task names and short paths inside the verbatim quotations refer to that reviewed copy or to the code at
`3fc65f4`; the live pack may continue changing.

D-V4-17's decision text, exactly as written in the frozen `check-list.md:322`, is:

> The work of a request is the sum of the metered units of its completed primitives (each rating's main and census work, each uniqueness count's units), the units P5's budget meters; a call cut by a recorded worker termination (T06's `worker-end`) is closed with its completed primitives and counted in `terminatedCalls`; any unrecorded loss (an open call, a missing `caps` line, an unowned or invalid line, a failed reconciliation, a returned selection task without its call) makes the ledger incomplete and the work rule `unknown`

In the reviewed pack, this governs T09b's `rowLedger`, `workRule` and class admission, using T02a's primitive
ledger and T06's termination linkage; T09c reports and consumes the resulting class verdict. T07a's completed-
operation budget meter is the comparison SA-Opus invokes, not a proposal here to change that budget or the
generator's cancellation behaviour. If additional accounting is required, the relevant instrumentation, tests and
T11b/T11d pricing may also need revision. The frozen task paths are indexed below.

**Both positions, verbatim.**

**SA-Opus (pack author):** the Reason cell of RV2-07 in the frozen `review-2-response.md:39`:

> The frozen pool terminates the worker of every aborted task (`core/browser/worker-pool.js:293-325`, `abortEntry` then `discard`), and every request aborts its in-flight speculative work at its end (`generation-client.js:696-699` for the set stage, `:1080` for the completion pass, `:1172-1175` for the batch); terminated calls therefore occur in nearly every row of both arms, and the strict rule would make the work rule `unknown` for every class, turning plan §5.2's "may not be worse" into a condition that can never pass. D-V4-17 fixes the unit instead: the metered units of completed primitives, the units P5's budget meters (T07a); a call is closed only by its own `end` or by a termination that the pool itself records (`link-13` in `adaptNodeWorker`'s `terminate`); `terminatedCalls` is reported per arm beside the ratio; every unrecorded loss stays incomplete. The interrupted primitive's partial work is neither read as zero nor estimated: it is outside the unit in both arms. If SA-Astra keeps the strict rule, this is a disagreement between the two SAs and goes to the supervisor through `clarifications.md`

**SA-Astra (reviewer):** the ruling in the frozen `review-3.md:98`:

> **Keep the strict rule. This is an unresolved disagreement between the two SAs, not a decision for the supervisor.**

RV3-01's problem and proposed replacement in the same frozen review (`:136`), verbatim:

> A recorded kill closes a call without measuring its interrupted primitive, yet the resulting completed-prefix sum can satisfy the non-worsening work gate. The counterexample above demonstrates the missing implication. This is the explicitly raised SA disagreement.
>
> "D-V4-17 is proposed, pending Q-RV3-01. Until that ruling, keep completed-primitive units and termination counts as reported diagnostics; do not treat an interrupted call's unreported work as a complete observation for the plan's non-worsening condition. Unknown work makes that condition unknown. Update the plan/decision register and the task's metric/acceptance text consistently after the ruling."

The review's counterexample is constructed arithmetic, not a benchmark observation: both arms accept ten puzzles;
completed primitives report 900 units for screen and 1,000 for no screen, while interrupted primitives have already
consumed 200 and 10 units. The reported completed-unit comparison passes at 90 versus 100 units per accepted
puzzle; including those consumed units gives 110 versus 101 and fails. Equal termination counts do not measure
the omitted amounts. SA-Astra accepts that kills are routine, but the code alone does not establish that every
class must have unknown work; SA-Opus's frequency/feasibility argument above remains his stated position.

**Options.** These are options (a), (b) and (c) of the frozen Q-RV3-01
(`review-3.md:329-340`), with their consequences:

- **(a) Keep the strict rule.** Unaccounted interrupted work makes the work condition unknown; report completed
  units separately. This preserves the non-worsening assurance, but routine cancellation may leave screen classes
  inconclusive, using the existing no-screen fallback.
  - **Behaviour:** the work condition cannot admit a class on an incomplete work observation. An ended call whose
    work is fully accounted is not made unknown merely because its idle worker is later terminated. No change to
    generation, cancellation or P5's operation budget is implied.
  - **Cost and risk:** no new metering mechanism is required to report unknown, but possible screen gains may not
    qualify. Any extra observations sought to remove the uncertainty need their own price/approval; none are
    authorized by this option.
  - **Affected tasks:** T09b's completeness/work rule and its tests, T09c's reporting, D-V4-17 and the accounting
    interpretation of T06's termination evidence.
- **(b) Authorize D-V4-17.** Compare only reported completed-primitive units and report terminated calls. The current
  hooks can supply this metric, but it does not prove that all consumed selection-work units per accepted puzzle
  are non-worsening. State that intended acceptance quantity explicitly in the plan.
  - **Behaviour:** a recorded termination may close a call with its reported completed primitives for this
    acceptance metric; unrecorded loss still makes the metric unknown. This explicitly excludes the interrupted
    primitive's unreported work rather than estimating it or claiming that it is zero.
  - **Cost and risk:** uses the already proposed primitive logging and termination linkage, without a new
    in-primitive counter mechanism. Omitted work can differ between arms, so the resulting admission carries the
    narrower assurance illustrated by the counterexample; termination counts disclose frequency, not amount.
  - **Affected tasks:** retain the intended D-V4-17/T09b metric, with T06's linkage, T09c's report and the plan's
    wording consistent about what is measured. Independent bookkeeping fixes still proceed.
- **(c) Preserve the assurance through additional accounting or proven bounds.** Admit only when the accounted
  totals or conservative bounds establish non-worsening. That mechanism is not specified in this pack; it needs
  concrete tasks and any revised measurement price before validation.
  - **Behaviour:** account for interrupted work, or prove that the screen's conservative work bound per accepted
    puzzle does not exceed the comparator's corresponding lower bound. If that cannot be established, the
    condition remains unknown; a kill count alone is not such a bound.
  - **Cost and risk:** additional instrumentation, proof of its bounds/overhead and observer-parity tests may be
    needed. Their cost and effect on measurements are not established here; timed work must be repriced and
    approved before running.
  - **Affected tasks:** specify the mechanism in the relevant T02a/T06 instrumentation and T09b accounting/tests,
    keep T07a's metering contract explicit, update T09c's report and the affected T11b/T11d price. No mechanism or
    allowance is selected by this question.

**The SAs' recommendations (not a decision).**

- **SA-Astra:** option (a) under the current reading of plan §5.2. Option (c) is a possible way to establish the
  assurance if it is specified and proved; it has not been selected. Do not treat option (b) as an equivalent proof
  about all consumed selection-work units.
- **SA-Opus:** D-V4-17, option (b), for the reasons quoted above.

There is no joint recommendation. The supervisor resolves the disagreement; any change to a recorded owner
decision still requires the owner's confirmation.

**Evidence index (repository-relative; reviewed-pack paths are frozen).**

| Evidence | Path |
|---|---|
| Work condition and no-screen fallback | `docs\improve-generating\plan.md:600-617` |
| Pool abortion/termination | `core\browser\worker-pool.js:293-325` at `3fc65f4` |
| Set, completion and batch cancellation | `core\browser\generation-client.js:696-699,1080,1172-1175` at `3fc65f4` |
| Primitive work reports | `core\engine\clues.js:173-212,322-344` at `3fc65f4` |
| D-V4-17 as reviewed | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\check-list.md:322` |
| SA-Opus's position | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\review-2-response.md:39` |
| SA-Astra's ruling, RV3-01 and original question | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\review-3.md:96-125,136,317-340` |
| Primitive ledger | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\T02a-v4-prototype-fork.md` |
| Termination linkage | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\T06-journal-linkage.md` |
| P5 operation budget | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\T07a-p5-call-budget.md` |
| Work ledger and class rule | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\T09b-work-ledger-and-class-verdict.md:14-110` |
| Verdict/report consumer | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\T09c-global-verdicts-and-receipts.md` |
| Pricing if new work is required | `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\T11b-frozen-round-pricing.md`; `docs\improve-generating\evidence\clarifications\IG-P-Q37\pack-at-review-3\T11d-frozen-round-manifest.md` |

**What is blocked meanwhile.** Only the work-condition rule under RV3-01 / D-V4-17 in the affected tasks:
the definition of accounted work, treatment of unreported interrupted work and the resulting admission condition.
The rest of the pack continues, including SA-Opus's other review fixes and the independent linkage/bookkeeping
corrections. This question does not freeze unrelated tasks, authorize measurements or adopt an option.

**Answer (plan author, 2026-11-16):** **option (c), in one named form: interval accounting from the primitives'
own limits.** D-V4-17's completed-unit ratio stays as a reported diagnostic and is not the judged quantity; the
strict rule's "any kill makes the work unknown" is not adopted either. I checked the cited code at `3fc65f4`, plan
§5.2 and the frozen pack; both SAs' operational facts hold. Nothing ran.

1. **What the sentence means.** "Work units per accepted puzzle ... may not be worse with the screen" is about the
   selection work a request **consumed**, speculative and losing calls included. Its job is to stop a class being
   admitted on a wall-time gain while the machine does more work. I wrote it (answer to IG-P-Q19) without the
   killed worker in mind; SA-Astra's reading is the intended one. The sum of completed primitives is a lower bound
   of that quantity, not the quantity, and the counterexample is valid arithmetic. So (b) is not authorized as the
   acceptance quantity, and the plan's wording is not narrowed to fit the hooks.
2. **Why not (a) as written.** A kill inside a primitive happens at nearly every stage exit (`finally` at
   `generation-client.js:696-699`, `:1080`, `:1172-1175`), so (a) would return `work-unknown` for every screen
   class before a seed runs. That decides against the screen by bookkeeping, and the two-arm validation of 5.1
   would be paid for a verdict known in advance. SA-Opus is right on that point. But unknown is not unbounded:
   a worker runs one primitive at a time, and every primitive starts with a finite limit (a rating's `work` and
   `census` limits, `policy.js:120-121`, or `W_screen` for a screen run; a count's `rowTrialLimit`,
   `clues.js:173-182`). The lost work of a terminated call lies between 0 and the limit of its one open primitive.
3. **The rule.**
   - *Instrumentation.* One journal line before every rating and every uniqueness count, repairs included, at
     the seam where T07a already checks the budget: the call, the kind and `bound`, a proved upper bound of the
     units that primitive can charge (its limits plus the overshoot of the limit check, which the pack author
     derives from `deduce.js:836-846, 1102, 1128` and the count's loop). The journal writes with
     `appendFileSync`, so the line survives the kill. No counter inside a primitive, no change to the kernel, to
     cancellation or to P5's meter.
   - *Per call.* `lo` is the sum of its reported units. An ended call has `hi = lo`. A call closed by a recorded
     termination has `hi = lo + bound` of its open primitive (a begin line without its `p` or `count` line), and
     `hi = lo` when none is open. More than one open primitive, a `bound` that is not a finite number from 0, or
     a completed primitive whose reported units exceed its own `bound`, is a ledger problem (incomplete). Every
     unrecorded loss stays incomplete, as D-V4-17 has it.
   - *Per arm and class.* `lo` and `hi` are summed over the rows and divided by the accepted puzzles. **Pass:**
     the screen's `hi` per accepted puzzle is at most the no-screen arm's `lo`. **Worse:** the screen's `lo` is
     above the no-screen arm's `hi`: `failed`. **Otherwise, or with an incomplete ledger: `unknown`**, the class
     is `inconclusive` (`work-unknown`) and uses no screen. A kill count is never a bound.
   - *Reported, not judged:* both intervals, the completed-unit ratio and `terminatedCalls` per arm.
4. **Feasibility is not claimed.** The interval may be too wide to pass: one open rating can hide up to 840 M
   units (760 M + 80 M), against calls of which 85 % stay under 1 G (R21). The width is read from the stage-2
   pilot journals, which run anyway, and reported before the stage-3 freeze. If no class can pass at that width,
   that is reported then as a finding; the remedy (a tighter proved bound, or the owner changing the rule under
   5.2's first paragraph) is a new proposal, not part of this answer. The threshold is not refitted on validation
   seeds.
5. **Tasks.** T02a/T07a: the begin line and its `bound`; T02b: it joins the observer-parity passes (puzzles, work
   units and skip ordinals unchanged). T06: `link-13` unchanged. T09b: `rowLedger` returns `lo` and `hi`,
   `workRule` applies the three verdicts above, with tests for the counterexample (900 + 200 against 1,000 + 10
   must not pass), an open primitive, two open primitives, an exceeded bound and a kill between primitives. T09c:
   reports the intervals. D-V4-17 is rewritten to this rule. T11b/T11d: I expect no new timed run, since the line
   is in the journal pass and the timed comparator runs with observers absent (plan 5.1); the pack author
   confirms that in the pricing, and any added machine time needs the usual approval.
6. **Plan and owner.** `plan.md` §5.2, rule (c5) "faster", gains one sentence at the next edit: the work is the
   consumed selection work, judged on bounds, and a class whose bounds do not establish non-worsening is
   inconclusive. This fixes how an existing condition is measured before the validation seeds run; it changes no
   threshold and no recorded owner decision, so no owner confirmation is needed. It would be needed for (b), which
   weakens the condition, or for any later relaxation under point 4.

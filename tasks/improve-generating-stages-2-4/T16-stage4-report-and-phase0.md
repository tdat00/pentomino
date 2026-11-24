# T16: The stage-4 report and phase 0's decision (N-V4-06)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §1 (goal), §6 (B1-B6, T7, T8), §7, §8.2 T16, §8.4 (what follows), §9 (N-V4-16, N-V4-17); N-V4-06 of the v4 pack |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S07 |
| Depends on | S07 (the final verdict record; if the owner declined S07, `V4-S4`'s selection record, ruling R-P24-19) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | SA-Opus drafts, SA-Astra reviews; one joint report (no code, no test, no harness edit) |
| Estimate | SAs; machine 0 min (unlocked reads; scratch scripts in the SAs' evidence folders) |

## Goal

Give the owner phase 0's answer (N-V4-06) with the evidence behind it, re-read the named items that only the frozen
arms can answer (N-V4-16, N-V4-17), and state what follows.

## Authority and fixed points

- The verdicts are the records' (`docs/improve-generating/evidence/frozen/V4-S4F/verdicts.json` and `.md`, its phase-0
  line verbatim; `V4-S4/class-selection.json`); the report restates and explains them, never recomputes a verdict with
  another rule. If S07 did not run (the owner's (b)), the record is `V4-S4/verdicts.json` and `.md` (purpose
  `selection`), and the report says that the final-purpose record and P5's comparisons were not measured.
- The SAs' joint reading of `V4-S4` (`docs/improve-generating-stages-2-4/s06-reading.md`, ruling R-P24-19): the
  control failure of 26x26 Nightmare (point estimates near parity, the lower bound 0.8864 below 0.9), the options for
  the failing item and the SAs' provisional recommendation. The legacy route is a provisional option to be reconsidered
  with the final record and P5 results, not an accepted production configuration. Any owner-approved exception must
  state its scope and remaining implementation, compatibility/replay, N-V4-15 and production-validation gates. Current
  class selections, the recorded FAIL and Hell 1 offer/qualification rules remain unchanged.
- Plan §6: B1 (the five failing Nightmare cells at least 18 of 20, no dead end), B2 (controls 18 of 20 and lower bound
  at least 0.9, 18x18 included; Master identity), B3 (each class's rule (c5) verdict with its deciding condition), B4
  (the reserve and deadline frozen and proved), B5 (Hell 1 per board, the population two-sided per cell, P5's lost
  completions and false stops per cell), B6 (no run beyond its cap); T7, T8.
- N-V4-16: P5's bound and glue on real no-window requests (stage 2 saw none); N-V4-17: the mechanisms' reach on the
  frozen arms (in the freeze: the screen by class, the prior, the per-set prior on Hell 1, rescue re-rating; (c4) and the
  bracket close are off, so their counts must be zero).
- The owner decides what follows phase 0 (plan §8.4); a failing or incomplete item is decided jointly by the SAs under
  the owner's delegation before any refit, with his confirmation if one of his recorded decisions would change; no
  class is refitted on validation seeds.
- The harness window ends with S07's final verdict; the readers here are unlocked and change nothing.

## Scope

- Create: `docs/improve-generating-stages-2-4/stage4-report.md` (CRLF, UTF-8 without BOM); scratch scripts and outputs
  under `docs/improve-generating-stages-2-4/evidence/sa-opus/` and `evidence/sa-astra/` (`t16-*.mjs`, `.json`, `.md`).
- Do not change: code, plans, variants, run records. Guards: G1, G2.

## Steps

1. **The verdicts** (from `V4-S4F/verdicts.json`; without S07, from `V4-S4/verdicts.json`): the phase-0 line verbatim; per class, its (c5) verdict and deciding
   condition and the shipped arm; B1's five cells (reached ten of 20, the arm, dead ends); B2's controls (reached ten,
   the lower bound, pass) and the Master identity per cell with its timing; B5's Hell 1 table per board, the population
   per cell (both sides) and the `p5` records (false stops, lost completions, unknown pairs) per cell. Without S07, the
   selection record's empty `p5` array means **not measured**, not zero false stops or lost completions. List the 19
   resolved comparator cells as unmeasured/unknown (380 uncapped rows if none ran). Do not claim a `V4-S4F`
   final-purpose record or a closed harness window. N-V4-16/N-V4-17 and the deadline reading may still use the existing
   bounded-arm records, with their limitations (ruling R-P24-19).
2. **B4 and the deadline in stage 4** (SA-Opus's scratch `t16-deadline.mjs`): `deadlineViolation(run, {
   responseBoundMs: 120000 })` (`verdicts.mjs:196`) over every published row of `fr-frozen` and `fr-frozen-none` in
   `V4-S4`; the rows by `partialReason` (`set:reserve-cut`, `time-limit`, `response-bound`, `set:no-window-*`, others);
   the receipt of `V4-LIVE`.
3. **N-V4-16** (SA-Opus's scratch `t16-p5.mjs`, reading the raw journals of `V4-S4/fr-frozen*` and the published rows):
   per arm and cell, the set attempts by result (`below-to-one`, `above-to-max`, in-band, a budget stop with
   `end.locate.budgetStop`), the requests whose attempts 0-3 all ended without a window on the same side, the rows whose
   `partialReason` is `set:no-window-<side>` (the bound fired), and the glue: requests whose attempts 0-3 each ended
   without a window on the same side but whose row is not `set:no-window-<side>` (a finding if any); the budget stops of
   `require` calls (none expected: stage 4 runs `any`).
4. **N-V4-17** (SA-Astra's scratch `t16-reach.mjs`): per arm and cell, calls with `locate.close` and with `locate.c4`
   (expected 0), the rescue re-ratings, the `start` lines' `W` against the class value of `freeze.json` (190 M on the
   screen arm's 196-324 and 360+ Nightmare boards; `DEDUCE.work` elsewhere and on `fr-frozen-none`), the table prior and
   the per-set prior on Hell 1 batch calls.
5. **B6 and the account**: every plan's invocation rows against its approval; the round's final account; the runs that
   stopped and their rulings.
6. **The report** `docs/improve-generating-stages-2-4/stage4-report.md`: a summary (phase 0's line, the decision asked
   of the owner, at most 10 lines); the sections of steps 1 to 5 with their tables; the findings and the joint SA
   decisions taken under the delegation; **phase 0's decision for the owner** (N-V4-06): pass, fail or incomplete, with
   the options and the SAs' recommendation; **what follows** (plan §8.4): on a pass, phase 1's P7 items if S02's spike
   passed (N-V4-05), phase 2's `gen-v4` in production (N-V4-07, with N-V4-15 measured first and the validation repeated
   on the production code), phase 3's offers after the blind play comparison (N-V4-08, N-V4-09), phase 4 (N-V4-11),
   N-V4-01, N-V4-04 and N-V4-10 when the owner asks; on a fail or an incomplete result, the failing item and its joint
   decision before any refit (for the 26x26 Nightmare control: the options and the recommendation of
   `s06-reading.md` §4, re-read with the final record and P5's results, and the owner's question with those options).
   Approval or deferral of S07 is not the 26x26 scope/admission decision. Keep phase 2 blocked until that decision is
   recorded and its required gates are specified; preserve the original FAIL rather than recomputing it on a reduced
   control set (ruling R-P24-19). Both SAs sign it.
7. **The owner's answer**: the orchestrator relays the summary and the decision on Discord and records his answer in the
   check-list's register.

## Tests

None (a report). The scratch scripts print their inputs' hashes and are kept with their outputs.

## Documentation

`stage4-report.md`; the orchestrator's progress report.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| the SAs' scratch scripts | repository root | their outputs under `evidence/sa-*/` | - |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2 | repository root | print nothing | 1 min |

## Stop points and questions

- **The owner**: phase 0's result and what follows (N-V4-06); any new measured scope.
- A finding that would change one of his recorded decisions goes to him with the SAs' joint recommendation.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T16-B01 | The owner receives phase 0's answer with B1 to B6's evidence and the options for what follows | the report; the relay | `stage4-report.md`; the progress report |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T16-T01 | Every number of the report comes from a cited record or a kept scratch output | the report's citations | the report |
| T16-T02 | N-V4-16 and N-V4-17 re-read on the frozen arms (plan §6 T8) | steps 3 and 4 | the report |
| T16-T03 | No code, plan or run record changed | G1, G2 | empty outputs |

## Checklist (the executor confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green (none: a report)
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the SAs' reply)

Phase 0's line; the decision asked of the owner; the findings; the files written.

## Execution log (filled by the orchestrator)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-24 22:51 +07:00 to 2026-11-25 00:55 +07:00; about 2 h 4 min (SA-Opus draft; SA-Astra N-V4-17 in parallel; one review round T16-R1 to R5) |
| Agents, models | SA-Opus a607e081 (claude-opus-5.5, drafter); SA-Astra 56d9faa7 (gpt-6-astra, N-V4-17 reader and reviewer) |
| Owner's answer (date, message id) | (a), 2026-11-25 06:25:48 +07:00, Discord ai-ws-1 message 1574929061115863041 ("Qt-16 a"), asked in message 1574846062135353425 (stage4-report.md §7.3); recorded as D-S24-35; phase 1's optional question not answered, phase 1 not started |
| Commit | this task's commit |
| Issues and named items | `Phase 0: FAIL (control 26x26-nightmare: fail)` (V4-S4F, purpose final). Joint findings F1 to F7: F1 26x26 Nightmare to the owner (uncapped twin information-only lower bound 0.8987); F2 N-V4-16 stays open for phase 2's validation (the bound never fired); F3 14x14 Hell 1's two lost completions from the 115-s stop, by design; F4 no budget stop (largest Nightmare call 8.39 G of 10 G); F5 population reported for phase 3; F6 N-V4-15 with the production pack; F7 re-rating unexercised, no change. Round final account 871.2 of 1,725 counted minutes; G1, G2 empty |

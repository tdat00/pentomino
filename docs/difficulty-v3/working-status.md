# difficulty-v3 (Pentomino): working status at the pause, 2026-11-13 17:52

| | |
|---|---|
| State at | 2026-11-13 17:52 (+07:00), the owner's pause order |
| For | the plan author, claude-fable-5-2 (Fable), who reviews the progress before the next direction (`clarifications.md` PR-P1) |
| Written by | an agent of the orchestrator (GitHub Copilot CLI), from the repository files and the orchestrator's facts at the pause |
| Branch | `rating-v3`; HEAD `f33aa71` before the pause-state commit, equal to `origin/rating-v3` |
| Method | Every number comes from the file named beside it, or from the orchestrator's facts (marked "orchestrator"). "Not recorded" means that no file and no fact gives it. Times are local (+07:00). Paths are repository-relative; a bare file name such as `clarifications.md` is in `docs/difficulty-v3/`. The orchestrator's session checkpoints 001-004 (outside the repository) were read for the shared process only |

## 1. Snapshot

### 1.1 The pause

- The owner paused all work on 2026-11-13 at 17:52 (`clarifications.md` PR-P1). The MP12a developer was cancelled at
  about 17:49 by the pause. No timing lock is held and no node process is running (orchestrator).
- Branch `rating-v3`, HEAD `f33aa71` (2026-11-13 12:23), equal to `origin/rating-v3`.
- The pause state is committed on `rating-v3` in the commit that adds this document. That commit holds the whole
  working tree of section 1.4. MP12a is incomplete in it, and its Execution log is empty. The orchestrator then pushes
  `origin rating-v3` (owner's order).
- 22 of the 35 task parts are committed: MP01 to MP11 (`tasks/difficulty-v3/check-list.md` §1 and "Orchestrated
  execution summary"). Implementation started on 2026-11-12 at 12:58 (MP01's Execution log).
- At 18:03, after the pause, the owner split the clarifications: `clarifications.md` now keeps only the open question
  PR-P1; every resolved question moved unchanged, with the same ids and part letters, to
  `clarifications-resolved.md` (Parts A to I).

### 1.2 Roles

| Role | Who | Writes |
|---|---|---|
| Owner | the human (@ledat_microsoft) | decisions during implementation: `clarifications-resolved.md` Part H, P-OD1 to P-OD8 |
| Plan author | Fable (claude-fable-5-2) | `plan.md`; the answers in `clarifications-resolved.md` Parts A to G and Part I (D21, D36); the open question PR-P1 |
| Orchestrator | GitHub Copilot CLI | dispatches agents, re-verifies each task, reviews the diff, fills each Execution log, commits locally, sends progress mails |
| SA1 | claude-opus-5.5, analyst | the task pack `tasks/difficulty-v3/`; `claude-opus-5.5/`; the cross-review of the Sudoku pack |
| SA2 | gpt-6-astra, analyst | the cross-review of this pack, `gpt-6-astra/6-review-of-task-pack.md`; the Sudoku pack |
| Developers | claude-sonnet-5.5, one per task part | the code, tests and records of a part; strictly one part at a time in this repository (the Sudoku repository runs in parallel on the same machine) |
| Consolidated analysis | SA1 (lead) and SA2 | `report-detailed.md` (RES-01 to RES-35, errata E01-E45) and `report-brief.md` |

### 1.3 Commits of difficulty-v3 on `rating-v3`

Each accepted task part has one commit, made by the orchestrator (section 3). The other commits:

| Commit | Time | Content |
|---|---|---|
| `77e62cb` | 2026-11-12 06:27 | `plan.md` (Fable) |
| `e6b0ead` | 2026-11-12 09:48 | the analysts' reports, cross-reviews, joint report and `clarifications.md` |
| `04e7e90` | 2026-11-12 10:00 | Fable's answers |
| `2721a46` | 2026-11-12 11:16 | final joint report, brief, acceptance concerns (Part F) |
| `e73712f` | 2026-11-12 11:49 | Fable's answers to Part F, AR1 and the acceptance (Part G) |
| `6ba2f3a` | 2026-11-12 12:58 | accepted report and the first pack files (check-list, MP01 to MP03) |
| `7604eff` | 2026-11-12 15:39 | P-OD1 and P-OD2; SA2's first review of the pack |
| `60575a4` | 2026-11-12 16:13 | P-OD3 |
| `b70069a` | 2026-11-12 18:30 | pack files MP08 to MP17; SA1's response to FP01-FP10; SA2's second pass (SP01-SP19) |
| `cd2e079` | 2026-11-13 08:03 | pack: cross-review rounds 2 and 3 (SP01-SP19, TP01-TP19), MP12b and MP15a split, D36 and D37 |
| `f33aa71` | 2026-11-13 12:23 | pack: MP12 cross-review (TP20-TP29); Execution-log times of MP10b2 and MP11 corrected |

### 1.4 Content of the pause-state commit (the working tree at the pause)

| Group | Files | State |
|---|---|---|
| MP12a: code and pins | `core/engine/policy.js` (`SCORE_V3.rule[3]` 2 to 3, `penalty` (0, 0) to (1, 2), `DEDUCE.census` 10,000,000 to 80,000,000); `tests/policy.test.js`; `tests/difficulty-v3.test.js` (worked examples, a new penalty test, recipe characterisation hard 25, expert 31, master 38); `tests/clues.test.js` (15 x 20 Nightmare slow test: score 67 to 66 in round 1, then 70 with 3 clues instead of 4 in round 2) | done for round 2 |
| MP12a: fixtures | `tests/fixtures/generation-case.json` and `tests/fixtures/generated-sample-pack.json` (GF-P2, rewritten at 17:44); `tests/fixtures/ui-flow-recipes.json` (`expect.scores` of `default-10x6-normal` from round 1; `heart-n10-master` and `square-22x22-nightmare` migrated again at 17:48) | the GA-P2 migration is not verified (section 2.2) |
| MP12a: documents | `docs/design-detail.md` (§4.2, §7.8, §7.9, §7.10; last written 17:19); `docs/difficulty-v3/calibration-slice-2026-11-13.md` (new, last written 17:19) | P-OD8 and the round-2 gates are not recorded yet |
| MP12a: data and tools | `docs/difficulty-v3/landscape-v3/`: `launch.mjs`, `criteria.mjs`, rounds `r0/`, `r1/` and `r2/` (each with 18 reports as `.json` and `.md`, and `probe/` with `manifest.json`, `final.jsonl` and 90 packs) | complete |
| Pack edits (SA1) | `tasks/difficulty-v3/MP12b1-full-landscape.md` and `MP12b2-search-evidence-and-lock.md` (TP30-TP33); Amendment L1 in MP13a, MP13b, MP14a, MP14b, MP15a1, MP15a2, MP15b, MP16a, MP16b and MP17; `check-list.md` (§7 helper wait 20 minutes; the D29, GL-P3, GS-P3 and ownership rows for TP30-TP33) | verified by SA2 ("MP12 VERIFIED") |
| Reviews | `gpt-6-astra/6-review-of-task-pack.md` (section "MP12b final verification", TP34, "MP12 VERIFIED"); `claude-opus-5.5/7-response-to-second-pass.md` §11 ("MP12b FIXED") and §12 (the schedule question, the orchestrator's decision, "L1 APPLIED") | |
| Clarifications | the rows P-OD7 and P-OD8; the owner's split of 18:03 (`clarifications.md` with PR-P1, new `clarifications-resolved.md`) | |
| This document | `docs/difficulty-v3/working-status.md` | new |

Not in the commit: `tests/artifacts/` is git-ignored (check-list §3). It holds MP12a's scratch: the copy of the lock
helper, the run logs, the fit inputs and `tests/artifacts/MP12a/ga-p2-r2-first.txt`.

## 2. At a glance

### 2.1 Summary

| Item | State |
|---|---|
| Progress | 22 of 35 parts committed (MP01-MP11). Milestones M1 to M6 done (deduction solver, decisive guesses, measured fit, centre-seeking generation, v3 active, display rating); M7 (calibrated and locked) in progress; M8 to M10 not started (check-list §1) |
| v3 in the product | active since MP09d2 (`eea5fed`): `rate` returns `difficulty-v3`; `MODEL = 'difficulty-v3'` (`core/engine/difficulty.js`); `ALGO_ID = 'gen-v3'` (`core/engine/version.js`) |
| Current part | MP12a, the calibration slice: three rounds done; the owner accepted the two remaining C4 failures (P-OD7, P-OD8); the closing steps were cut by the pause (section 2.2) |
| Knobs in the tree | `SCORE_V3`: `base { max: 12, scale: 3 }`, `rule [0, 0, 2, 3]`, `weights { G: 5, info: 0.5 }`, `penalty { few: 1, many: 2 }`. `DEDUCE`: `{ lookaheadWidth: 4, nodes: 30000, solutions: 8, work: 760000000, census: 80000000, memoryBytes: 33554432 }`. `K60`, `SHARES` and `POLICY_ID` (`mixed-v2`) unchanged. `STALL_LIMIT` 12 (`core/engine/policy.js`, `core/engine/clues.js`) |
| Slice criteria, round 2 | C1, C2, C3 and C5 pass. C4 holds in 16 of 18 cells; it fails in 18x20-master (11.0 %, accepted by P-OD7) and 10x10-master (7.0 %, accepted by P-OD8) (`calibration-slice-2026-11-13.md` §7.1) |
| Waiting on the plan author | PR-P1: the direction after the pause, and any difference of section 5 that is not accepted (`clarifications.md`) |
| Waiting on the owner | the order to resume; at MP12b2, the D36 choice (i), (ii) or (iii) for each cell v3 cannot make, and the fail-fast proposal; the Player-sample question of check-list D20 (no task owns it); the release decision (check-list §9) |
| Waiting on the orchestrator | after the resume: the close of MP12a (section 2.2), then MP12b1; MP12b2 later takes the TP34 note |
| Remaining | 13 parts: MP12a (close), MP12b1, MP12b2, MP13a to MP17. About 25-35 hours of serial work (orchestrator's estimate before the pause; section 7) |
| Effort so far (MP01-MP11) | developer time 544 minutes, about 9 h (the sum of the logged developer durations); about 7,844 AI credits (the sum of the logged "about" values, developers only); MP12a not recorded. Report §6.2 estimated 75-117 agent hours for the 17 report tasks |

### 2.2 MP12a at the pause

| Time (2026-11-13) | Step | Result | Source |
|---|---|---|---|
| after 12:23 | dispatched on `f33aa71`, with the TP29 addendum; the dispatch time is not recorded | | record §1.1 |
| 12:30-13:31 | round 0 on the old tuple (`rule [0, 0, 2, 2]`, penalty (0, 0), census 10,000,000): shards 12:30:17-13:12:00, probe corpus to 13:30:41 | C4 fails in five cells; the census labels show that 80,000,000 is not enough for 18x20-master (12 %), so the D19 rule keeps 10,000,000; the P-OD3 comparison makes `[12, 3, 2, 3, 5, 0.5, 1, 2]` the candidate of round 1 | record §2.4, §2.6, §2.7 |
| before 13:40 | the `SCORE_V3` change, its re-pins, the between-round checks | targeted 164/164, slow tests pass | record §3.1-§3.3 |
| 13:40-14:14 | round 1 | completion rates and yields equal to round 0 in every cell; C4 fails in the same five cells (6x10-master 33.0 %, 10x10-master 17.0 %, 12x12-master 12.5 %, 18x20-expert 25.5 %, 18x20-master 67.0 %); no change left for C4, so no round on an unchanged tuple | record §5.3, §5.7 |
| after round 1 | GF-P2 and GA-P2 on the round-1 tuple | `npm test` 1,360/1,360 (112.3 s); superseded by round 2 | record §8.1-§8.3 |
| 14:35 | P-OD7: census raised to 80,000,000; 18x20-master's remaining estimates accepted | | `clarifications-resolved.md` Part H |
| before 16:39 | the census change, its re-pins, the between-round checks | targeted 164/164, slow tests pass; 15 x 20 Nightmare 66 to 70, 4 to 3 clues | record §3.4 |
| 16:39-17:11 | round 2: shards 16:39:39-17:03:42, captures and `prod` ratings 17:04:08-17:10:57 | C4 fails in 10x10-master (7.0 %, 14 of 200) and 18x20-master (11.0 %, the accepted exception); the task stops by its orders | record §6.3, §6.7 |
| after round 2 | state check | `record-fixtures --check` OK; `npm test` 1,360 tests, 1,358 pass, 2 fail (the `scores` of two UI-flow recipes) | record §8.4 |
| 17:19 | the record and the design text last written | | file times |
| 17:25, 17:44 | P-OD8 asked, then answered (a): 10x10-master's estimates accepted; census stays 80,000,000; MP12a closes | | `clarifications-resolved.md` Part H |
| 17:44 | GF-P2: both generation fixtures rewritten | | orchestrator; file times |
| 17:45:18-17:47:22 | first GA-P2 run (`npm test`) | 1,361 tests, 1,358 pass, 3 fail: the `scores` of `heart-n10-master` and `square-22x22-nightmare`, and `tests/site-tools.test.js` (EPERM when its cleanup hook removed a folder under `tests/artifacts/`) | `tests/artifacts/MP12a/ga-p2-r2-first.txt` (not tracked) |
| 17:48 | the two recipes migrated (`expect.scores` only) | | orchestrator; file time |
| 17:48:16-17:48:22 | `tests/site-tools.test.js` run again alone | exit 0 | orchestrator; `tests/artifacts/MP12a/r2/site-tools.log` (not tracked) |
| about 17:49 | developer cancelled by the pause | | orchestrator |

Remaining to close MP12a (orchestrator; record §8.5):

1. Verify the GA-P2 migration: the UI-flow file, then the final `npm test`, each under the lock.
2. The quick set, `npm run check`, the two self-tests (`launch.mjs --self-test`, `criteria.mjs --self-test`),
   `node tools/record-fixtures.mjs --check` and the format check of the record, the reports and the scripts.
3. Write into the record the P-OD8 decision and the round-2 GF-P2 and GA-P2 sections (its §8.4, §8.5 and §9 still say
   that MP12b1 and MP12b2 wait for the owner). Correct `docs/design-detail.md`: §7.8 still says "`DEDUCE` unchanged",
   and §7.9 names only the 18x20-master exception.
4. The orchestrator's review, the Execution log, the check-list rows and the task commit.

Not recorded: whether the 17:44 GF-P2 changed the content of the fixtures recorded after round 1 (record §8.5 expected
no change); MP12a's developer time, tokens and AI credits.

## 3. Task progress

### 3.1 The 35 parts, in pack order

Status is the task commit, made by the orchestrator after its review. Date is the git commit time. Developer time and
AI credits are those of the task's Execution log (developer only; the orchestrator's review is not counted). The titles
are those of check-list §1.

| ID | Title | Status | Date | Developer time | AI credits | Result | Notes |
|---|---|---|---|---|---|---|---|
| MP01 | Model metadata for the deduction solver | `32cf0f4` | 2026-11-12 13:04 | 3 min | about 56 | nine fields on the model for the solver; no output change | - |
| MP02a | Deduction core: state, R1 and R2, search, statuses, caps, memory | `424f9e2` | 2026-11-12 13:16 | 11 min | about 199 | `measureDeduction`; provisional `DEDUCE` (nodes 20,000, work 50,000,000) | 3.2 |
| MP02b | R3 contradiction check, R6 lookahead, E, recipe characterisation | `a22b2d4` | 2026-11-12 13:27 | 9 min | about 127 | R3 check, R6, E; recipe values re-pinned | - |
| MP03 | R3 place, R4 and R5, rule boards and the soundness oracle | `53531ec` | 2026-11-12 13:35 | 7 min | about 150 | R3 place, R4, R5 with an all-solutions oracle; no cell-to-cell pairing | - |
| MP04 | R7, R8, R9, tiers, rule counts, oracle on every rule | `7004175` | 2026-11-12 14:00 | 20 min | about 356 | R7 parity, R8 neck, R9 pair exclusion; tier 3 exactly when R7 + R8 + R9 > 0 | 3.2 |
| MP05 | Decisive census, the upper estimate and `Gproved` | `6b772a9` | 2026-11-12 14:25 | 21 min, one fix round | about 406 | census nodes `{ c, kLow, f, u }`, decisive G and info, `Gproved` | 3.2 |
| MP06a | Probe tool `tools/rate-probe.mjs` and the `tieOrder` diagnostic | `3fd99ff` | 2026-11-12 14:43 | 16 min | about 346 | the probe tool (836 lines) and `tieOrder` | 3.2 |
| MP06b | Probe and GV2 runs, the `DEDUCE` values and the probe record | `3bd53bc` | 2026-11-12 15:31 | 45 min (machine about 19 min) | about 443 | GV2 baseline (18 cases); `nodes` 30,000, `work` 760,000,000, `census` 10,000,000; two owner findings (P-OD1, P-OD2) | 3.2 |
| MP06c | Initial fit of the v3 knobs and the RES-35 counts | `7ddb259` | 2026-11-12 15:55 | 14 min | about 235 | knobs `12 / 3 / [0, 0, 2, 2] / 5 / 0.5 / (0, 0)`; mean hit rate 56.5 % against 14.8 % for the starting knobs; the penalty finding (P-OD3) | 3.2 |
| MP07 | Centre-seeking clue selection, the `SelectContext.rate` seam, `gen-v3` | `2b4c5b9` | 2026-11-12 18:30 | 65 min in three rounds | about 1,115 | RES-15 acceptance; D21 answered by the stall stop RES-15a, `STALL_LIMIT` 12 | 3.2 |
| MP08 | Pure v3 score, breakdown, `SCORE_V3` and types | `05fa958` | 2026-11-12 18:40 | 8 min | about 178 | `breakdownV3`, `scoreV3`; `SCORE_V3` from the fit; the G = 0 bound is 14 | - |
| MP09a1 | Two pieces of the same shape refused in packs, links and puzzle codes | `dfea36d` | 2026-11-12 19:14 | 12 min | about 327 | error `duplicate-shape` in packs, codes, the Player's route and the Generator's import, in English and Vietnamese | 3.2 |
| MP09a2 | Saved Generator sets with two pieces of the same shape: removal and a one-time notice | `69b7253` | 2026-11-12 19:20 | 5 min | about 99 | removal with the notice `M-DUPLICATE-SETS`, saved once at start-up | - |
| MP09b | v3 claims in packs and codes: `censored`, `Gproved` checks, v2 legacy, summary claims | `a80274b` | 2026-11-12 19:34 | 12 min | about 236 | strict v3 claims (28 metric keys); v2 claims legacy; summary claims in codes | - |
| MP09c | Unrateable and unproved candidates in clue selection (RES-04, AR1; the D21 counting rule) | `d156f5b` | 2026-11-12 19:50 | 6 min | about 124 | `IncompleteRatingError`; spent profiles; the AR1 refusal; `rating-incomplete` | 3.2 |
| MP09d1 | `measureV3` and the v2 functions under their v2 names (no switch yet) | `041ff83` | 2026-11-12 19:59 | 8 min | about 169 | `measureV3`, `scoreV2`, `measureV2`, `rateV2`; no output change | - |
| MP09d2 | Activate v3: `rate` and `MODEL`, the pinned tests, D21-V3, GF-P2 and GA-P2 | `eea5fed` | 2026-11-13 06:06 | about 1 h 37 min (7 h 40 min of machine sleep not counted) | about 978 | v3 active; `npm test` 1,275/1,275; D21-V3 keeps `STALL_LIMIT` 12; D36 replacements | 3.2 |
| MP09e | GC-P2 format evidence: the 676-cell code sizes and the duplicate-shape browser check | `335e6f9` | 2026-11-13 08:05 | about 1 h 33 min (25 min of it a flake baseline) | about 547 | 26 x 26 summary-claim codes at most 415 symbols, QR version 14-M; the duplicate-shape page check; KI-1 found | 3.2 |
| MP10a | Auxiliary request method on the generation client and the Player's pool | `e3ac752` | 2026-11-13 08:20 | 14 min | about 237 | `core/browser/auxiliary.js`; `worker-pool.js` unchanged | - |
| MP10b1 | Derived display rating: the shared rules and the Player | `ed54ecc` | 2026-11-13 08:47 | 24 min in two rounds | about 617 | `core/browser/display-rating.js`; the Player, print and share show re-rated v1/v2 claims with a note | 3.2 |
| MP10b2 | Derived display rating in the Generator; the browser pages and gate GC-P2 (display) | `30232a5` | 2026-11-13 10:05 | 45 min | about 717 | six browser pages pass; Amendment D1 closes KI-1 (20 of 20 page runs) | 3.2 |
| MP11 | Calibration tooling for v3 and the slow v3 test | `a85ed55` | 2026-11-13 10:18 | 9 min | about 182 | v3 measures in the landscape records; slow test: medians strictly increase on 10x6 and 12x12, `Gproved >= 1` at Hard and above | 3.2 |
| MP12a | Calibration slice: the GV2 cases again with v3, and the knob changes | in the pause-state commit, incomplete: three rounds and P-OD8 done; the GA-P2 verification, the final checks, the record's P-OD8 and gate sections, the review, the Execution log and the task commit are missing | 2026-11-13, runs 12:30-17:48 | not recorded | not recorded | C1, C2, C3, C5 pass; C4 with two owner-accepted exceptions; `rule[3]`, the penalty and the census changed | 2.2, 3.2 |
| MP12b1 | Full landscape with v3 (gate GL-P3, full part) | not started | - | - | - | - | 7 |
| MP12b2 | Search evidence (gate GS-P3), the Hell report, the owner's questions and the lock | not started | - | - | - | - | 7 |
| MP13a | Provenance in the engine and in packs | not started | - | - | - | - | 7 |
| MP13b | Provenance in the client, the Generator and the CLI; the replay fixture (GF-P4) | not started | - | - | - | - | 7 |
| MP14a | Rating detail channel, clue-stage recorders and the replay of skips | not started | - | - | - | - | 7 |
| MP14b | Set and layout recorders; recorder identity | not started | - | - | - | - | 7 |
| MP15a1 | Replay runs: preflight, the stage runs, the work meter, the bounds and the final comparison | not started | - | - | - | - | 7 |
| MP15a2 | Replay steps: the step table, the score data, the final step and the byte bound | not started | - | - | - | - | 7 |
| MP15b | Replay worker task, protocol and client | not started | - | - | - | - | 7 |
| MP16a | Generation Steps dialog: model, dialog, board highlight and score table | not started | - | - | - | - | 7 |
| MP16b | Generation Steps: card button, wiring, browser page (GB-P4) and documents | not started | - | - | - | - | 7 |
| MP17 | Final compatibility and regression evidence, release notes (gate GZ) | not started | - | - | - | - | 7 |

### 3.2 Notes per part

- **MP02a and MP05.** MP05's review found a defect from MP02a: `mark()` allocated an object per call, against RES-10
  ("no allocation per node"). It was fixed in MP05's fix round and recorded in both logs.
- **MP04.** Two open items went to the analysts: confirm the values of board X7, and supply a board that pins R8's
  "other pockets" condition. Both are closed: X7 is pinned with confirmed values, and MP08 added the R8 pin (board R8o;
  `tasks/difficulty-v3/MP08-pure-v3-score.md`; check-list D15).
- **MP06a.** The orchestrator documented `tieOrder` in design §4.2 and §7.9, outside the task's slot.
- **MP06b.** SA2's FP01 and FP05 led to Amendment A1 before phase 2b: a captured corpus, every observation classified
  first, caps from complete observations only, the cohort re-rated under the final tuple. Two owner findings: `work`
  above 500,000,000 (P-OD2) and the 5 % census rule not met (P-OD1). The machine time was about ten times below the
  estimate. The Execution log section was missing for a while after the amendment was appended.
- **MP06c.** The fit switched the penalty off (P-OD3). Four knobs sit on a range edge. In the v2-made corpus the Hard hit
  rates were capped by `Gproved` (12x12-hard 16/50, 18x20-hard 7/50), and with uniqueness required no 18x20 puzzle had a
  decisive guess (`fit-2026-11-12.md` §8, findings 2, 3 and 7).
- **MP07.** Held for D21: about 2 h 10 min elapsed for 65 min of developer work; the D21 measurements that the plan
  author asked for took 33 min and about 694 credits. With RES-15a the Hell 3 recipe pins `[172 x 10]` and `npm test`
  fell from 151.6 s to 65.7 s.
- **MP09a1.** `#pack=` is no longer a Player route, so the pack-link case is tested through `openSample` and
  `readPack`. Design §7.9 and §11 item 11 were corrected outside the slot.
- **MP09c.** One quick-test failure under machine load (the Sudoku lock was held); its name was not captured; two
  re-runs passed.
- **MP09d2.** Addenda TP13 and TP14 at dispatch; Amendment B1 mid-run. The developer stopped on an unlisted failure
  (`tests/rate-probe.test.js:363`, a v2 pin on a v3-generated puzzle); the orchestrator authorised its migration. D36:
  only Hell 1 on the 164-cell board was made (2 of 3 attempts); the recipe `square-22x22-hell-3` became
  `square-22x22-nightmare`; MP07's 15 x 20 Hell 2 slow test became a 15 x 20 Nightmare test plus one
  unrateable-calibration test. The quick set got 33 % slower (19.8 s to 26.4 s), under the 50 % threshold. The machine
  slept from 22:19 to 05:59.
- **MP09e.** TP15 addendum. KI-1 found (section 4.3). The page `puzzle-code-acceptance` had failed deterministically in
  its Generator journey since MP09d2, on a rating mismatch that MP09e's `claimsOf` rule fixed.
- **MP10b1.** The printed notes are about 136-152 mm wide, wider than the 92 mm frames: fixed in the task with
  `fitDetailLine` (orchestrator decision; `core/browser/print-sheet.js` added to the task). Five MP10a tests opened the
  packs without claims (`rating: null`) because the v2 claims now start display requests.
- **MP10b2.** Amendment D1 (KI-1). `tests/browser/player-load.js` had not passed since MP09a1 (its 21 monominoes were
  refused as duplicate shapes); it was rebuilt with 21 distinct polyominoes.
- **MP11.** One quick-set failure on a timing-derived verdict (`tests/calibration.test.js:393`) right after the slow run;
  it passed alone and on re-runs.
- **MP12a.** The launcher given in the task could never publish (its version check lacked the `app` key): a one-line fix
  in `launch.mjs`, no check weakened. TP29 addendum applied (exit 2 on an interrupt; self-test 23 of 23).
  `criteria.mjs` printed medians rounded to whole numbers: fixed, no verdict changed (record §1.1).

## 4. Issues and the resolution chosen

"Part H" and "Part I" are those of `clarifications-resolved.md`. "Record" is `calibration-slice-2026-11-13.md`.

### 4.1 Owner decisions during implementation (P-OD1 to P-OD8)

| ID | When | What happened | Options | Decision | Decided by | Recorded in |
|---|---|---|---|---|---|---|
| P-OD1 | 2026-11-12 15:37 | MP06b: the 5 % census rule (Part F C5) is not met at 20, 40 or 80 million (at 80 million 10x10-master is still 3/50) | (a) keep 10,000,000 and look again at MP12; (b) 40,000,000; (c) 80,000,000 | (a); revisited in MP12a and superseded by P-OD7 | owner | Part H; `probe-2026-11-12.md` §6, §9 |
| P-OD2 | 2026-11-12 15:37 | `DEDUCE.work` = 760,000,000 is above the 500,000,000 reporting threshold of RES-10 (deduction median 2.8 ms, p95 83 ms, maximum 986 ms) | (a) accept; (b) a lower cap | (a). In MP12a C5 passed in all rounds; the largest main-search work is 58.6 % of the cap | owner | Part H; probe §9; record §4.2 |
| P-OD3 | 2026-11-12 16:02 | MP06c's fit sets the few/many penalty to (0, 0), against SA1-Q-P1 ("the few/many penalty stays") | (a) the fitted knobs with (0, 0), MP12 looks again; (b) `12 / 4 / 4 / 4 / 5 / 0.5 / (1, 2)` (55.5 %, no hit in 18x20-hard); (c) other | (a). MP12a round 0 then adopted (1, 2) with `rule[3]` 3 by the task's rule (section 4.6) | owner; the change by the task rule | Part H; `fit-2026-11-12.md` §3, §8; record §2.7, §4.3 |
| P-OD4 | 2026-11-12 18:09 | D21 (section 4.2) | (a) to (d) | (d), as answered by Fable | owner confirmed Fable's answer ("kiểm tra và tiếp tục") | Part H; Part I D21 |
| P-OD5 | 2026-11-12 19:09 | D36 (section 4.2) | (a) to (d) | (a), with four MP09d2 precisions | the owner delegated ("fable"); Fable answered | Part H; Part I D36 |
| P-OD6 | 2026-11-12 21:55 | D37 (section 4.2) | (a) to (c) | (c) | owner | Part H; Part I D37 |
| P-OD7 | 2026-11-13 14:35 | MP12a rounds 0 and 1: C4 fails in five cells at 10,000,000; at 80,000,000 four cells are at most 5 % on the probe corpus, 18x20-master stays at 12-14 %; cost of 80,000,000: deduction median +10 ms, p95 +100 ms | keep 10,000,000 and accept the estimates; raise to 80,000,000 and accept 18x20-master; Fable answers | raise `DEDUCE.census` to 80,000,000 and accept 18x20-master's remaining estimates; verified by round 2 | owner | Part H; record §3.4, §4.1 |
| P-OD8 | asked 2026-11-13 17:25, answered 17:44 | MP12a round 2: 10x10-master has 14 of 200 census estimates (7.0 %), outside the exception; 18x20-master 11.0 %; the probe corpus has 10x10-master at 2 of 50; the three-round ceiling is used up | (a) accept 10x10-master too and close at 80,000,000; (b) a fourth round with a larger census (for example 160,000,000); (c) Fable answers | (a): census stays 80,000,000; MP12a closes | owner | Part H; record §6.5, §6.7, §7.2 |

### 4.2 Questions for the plan author during implementation (D21, D36, D37)

| ID | Raised | What happened | Options | Decision | Decided by | Recorded in, and outcome |
|---|---|---|---|---|---|---|
| D21 | 2026-11-12 16:37, orchestrator (MP07 held) | Under centre-seeking acceptance, Hell 3 on 22x22 (K = 73) cannot reach the central half (the highest v2 score 174 is below 180.25): 48 ratings per puzzle, 42 times slower, and the UI flow ends `N-PARTIAL` with 9 of 10 puzzles | (a) recipe quantity 3; (b) first in band when the centre is unreachable; (c) keep the recipe; (d) a measured early-stop rule | (d): amendment RES-15a, the stall stop, `STALL_LIMIT` = 12 on raw ratings, in MP07 (Fable withdrew N = 8: two misses) | Fable, after 14 measurement questions (`d21-measurements-2026-11-12.md`); owner P-OD4 | Part I D21; check-list D21; MP07's log. The Hell 3 flow then made 10 of 10 at 172 in about 56 s. D21-V3 ran in MP09d2 (moved from MP09c by the orchestrator after SP03): 1,878 `any`-mode calls fired 23, 10 and 4 times at N = 8, 12 and 16 and missed 3, 0 and 0 central results; 184 `require`-mode calls fired 0 times; 12 stays (`d21-v3-2026-11-12.md` §5.5) |
| D36 | 2026-11-12, SA1 | Hell levels on large boards are unrateable under v3: 26 of 27 probe ratings capped, also at ten times the work cap (32-46 s each) | (a) activate as specified, MP12 proposes; (b) an engine investigation first; (c) raise the work cap; (d) reopen SA2-Q-P02 | (a). (c) and (d) rejected; (b) not inside this plan. MP12 puts to the owner (i) stop offering, (ii) a different contract, or (iii) a separate engine project, and proposes a fail-fast. Fable recommends (i), with (iii) as later work | Fable (P-OD5) | Part I D36; check-list D36. MP09d2: v3 made Hell only for Hell 1 on the 164-cell board (2 of 3 attempts); every larger Hell cell was capped or above its band (`d21-v3-2026-11-12.md` §4, §6). Interim: the branch offers Hell levels it cannot make |
| D37 | 2026-11-12, SA1 from TP08 | 25 of the 105 landscape cases are Hell cases; 20 requests each would cost up to about 17 hours | (a) 20 requests for every case; (b) a 3-request prescreen; (c) (b) plus 20 requests for the boundary case of each Hell level | (c) | owner (P-OD6) | Part I D37; check-list D37; MP12b1 |

### 4.3 Known issue, amendments and addenda

| Item | When | What happened | Options | Decision | Decided by | Recorded in |
|---|---|---|---|---|---|---|
| KI-1 | MP09e, 2026-11-13 | `tests/browser/puzzle-code-acceptance.html` failed intermittently in old checks: a module worker emitted `error` soon after creation. It predates rating-v3 (HEAD `cd2e079`: 3 of 10 runs failed; MP09e's page 2 of 10; 23 of 32 runs passed overall) | one respawn in `core/browser/worker-pool.js`, or a pause in the page's cleanup | recorded as a known issue, then closed by Amendment D1 in MP10b2 | orchestrator (record); SA1 (placement, `7-response-to-second-pass.md` §9) | check-list "Known issues"; MP09e and MP10b2 logs |
| D1 | MP10b2, before dispatch | the fix of KI-1 | - | `worker-pool.js` retries a task once, 100 ms later (`LOAD_RETRY_DELAY_MS`) on a new worker, when its worker fires a plain `error` before any reply; 20 of 20 consecutive page runs passed. MP17 runs the page with no re-run allowance | SA1 wrote it; orchestrator adopted | MP10b2 "Amendment D1" and log; design §8.1 |
| L1 | 2026-11-13 (request of 13:17) | MP13a to MP17 were written before the lock protocol; their command blocks ran tests directly | SA1: a side stream in a second worktree (guards G1-G4 and a new MP16c), or serial; L1 is needed in both | serial; Amendment L1 applied to the ten files (every timed command through `Invoke-Dv3Timed`); the helper's wait limit 20 minutes (SA1 proposed 30) | orchestrator | `7-response-to-second-pass.md` §12; "Amendment L1" in MP13a-MP17; check-list §7 |
| A1 | MP06b, 2026-11-12 | SA2's FP01 (a wrong capped-path statistic) and FP05 (a corpus that was neither immutable nor replayable) | - | a captured corpus `probe-corpus-2026-11-12/`, classification first, caps from complete observations, the cohort re-rated under the final tuple | SA1 wrote it | MP06b "Amendment A1"; check-list D19 |
| B1 | MP09d2, mid-run | SA1's check of the Phase E files | - | four more re-pins and `certify.mjs --self-test` | SA1; sent by the orchestrator | MP09d2 "Amendment B1" |
| Addenda | at dispatch | corrections after a task file was frozen | - | TP01 (MP09c); TP13 and TP14 (MP09d2); TP15 and SA1's moved-anchor note (MP09e); TP29 (MP12a). TP34 is still to be passed, as an addendum at MP12b2's dispatch (SA2: "an MP12b2 implementation note" for the change round's step 5) | orchestrator | the logs; `6-review-of-task-pack.md` TP34 |

### 4.4 Cross-review findings that changed tasks

SA1 accepted every finding of SA2; none was disputed (`cd2e079` commit message; `7-response-to-second-pass.md` §11).

| Pass | Findings | What changed | Recorded in |
|---|---|---|---|
| First (2026-11-12) | FP01-FP10: 4 Blockers, 3 Major, 3 Minor | Amendment A1 (FP01, FP05); MP09a split into MP09a1 and MP09a2, with the migration of the quick tests that built twin sets (FP02) and a removal notice that is saved once so it does not repeat on reload (FP03); v2 legacy claims keep admitted metrics (FP04); targeted runs skip the slow tests (FP06); the brief in the ownership lists (FP07) | `6-review-of-task-pack.md` §2-§4; `claude-opus-5.5/6-response-to-task-pack-review.md`; check-list D19, D25 |
| Second | SP01-SP19 | among them: the D21 v3 re-validation moved from MP09c to MP09d2 (SP03); the display-rating start-up (SP04, SP05); MP12's probe corpus captured once (SP06); the documentation slots (SP07); MP15a split into MP15a1 and MP15a2 (SP08-SP10); MP12b split into MP12b1 and MP12b2 (SP16); GZ and the browser runner (SP17-SP19) | `7-response-to-second-pass.md` §1-§3; `cd2e079` |
| Third | TP01-TP19 | TP01 (MP09c wording); TP02-TP05 and TP13-TP15 (MP09d2, MP09e); TP06 (the test order around a knob change in MP12a); TP07 (the search observer); TP08 (became D37); TP09-TP12 (replay); TP16-TP19 (MP10; TP18 puts `core/browser/auxiliary.js` in `SOURCE_FILES`) | same; check-list D12 |
| MP12 tranche | TP20-TP28 | the shared lock helper and the resumable landscape launcher (TP20); diagnostic samples never gate C5 (TP21); C2 decided by the request completion rate, never by puzzle rescores, and no round on an unchanged tuple (TP22); the Hell companion captures HL (TP23); the fail-fast check (TP24); final-source evidence for the lock (TP25); the four D36 and fixture re-pins (TP26); null metrics and the D37 waiver (TP27); stale stall wording (TP28) | review "MP12 tranche"; response §10; `f33aa71` |
| Re-verification | TP29-TP33 | TP29 (MP12a addendum); an ordered change round evaluates C1-C5 again (TP30); prescreens read for the protocol only (TP31); a change round reruns the complete population (TP32); script and data paths of a change round (TP33) | review "MP12 re-verification" and "MP12b final verification"; response §11 (both in the pause-state commit) |
| Final | TP34, Minor | a path note for the copied probe driver in a change round | review "MP12b final verification" |

### 4.5 Orchestrator decisions

| Decision | When | Why | Recorded in |
|---|---|---|---|
| Fix the print overflow inside MP10b1 with `fitDetailLine` | 2026-11-13, during MP10b1 | the printed notes (about 136-152 mm) were wider than the 92 mm frames | MP10b1 log |
| Record KI-1 as a known issue, then close it by Amendment D1 in MP10b2 | 2026-11-13 | a pre-existing flaky page | check-list "Known issues" |
| Move the D21 v3 re-validation from MP09c to MP09d2 | 2026-11-12 18:30 | SP03: no v3 rater exists before MP09d1 and MP09d2 | Part I D21 (orchestrator note); check-list D21 |
| Authorise the migration of `tests/rate-probe.test.js:363` in MP09d2 | during MP09d2 | an unlisted failure of the same class as B1 | MP09d2 log |
| Stay serial: decline SA1's side stream (MP13a-MP16b in a second worktree beside MP12b1) | 2026-11-13 | the Sudoku repository is the critical path (about 40 Sudoku tasks left); a third lock user would slow Sudoku's runs | response §12 |
| Accept MP12a's "no round 2 on an unchanged tuple" | 2026-11-13, after round 1 | TP22's rule; superseded by P-OD7 | record §5.7 |
| Lock rules: one bounded command per lock, 15 s between release and re-take, a 20-minute wait limit | 2026-11-13 | a 590 s run of the other repository nearly reached the 10-minute limit | check-list §7 |

### 4.6 MP12a's round decisions

| Point | Rule applied | Decision | By | Record |
|---|---|---|---|---|
| Round 0, C4 | MP12a "Choosing a change" (D19): try 20, 40 and 80 million on the captured packs; if 80 million is not enough, keep 10,000,000 and report | 80,000,000 not enough (18x20-master 12 %): census kept, cells reported | task rule | §2.6 |
| Round 0, the penalty (P-OD3) | adopt the best grid set with `penalty.few >= 1` if it meets C1 and its predicted puzzle rescore hit rate is at most 1 point below the current knobs | `[12, 3, 2, 3, 5, 0.5, 1, 2]`: C1 met, 99.2037 % against 100 % (0.80 points), lowest cell 93.75 %; adopted for round 1 | task rule (developer) | §2.7, §3.1 |
| After round 1 | TP22: never a round on an unchanged tuple; a criterion still failing goes to the owner | no round 2 at 10,000,000; C4 reported | orchestrator accepted | §5.7 |
| Round 1 to 2 | owner's decision | census 80,000,000; round 2 verifies it | owner (P-OD7) | §3.4 |
| After round 2 | the orders given with P-OD7: any other cell failing C4 stops the task; three rounds at most | stop, no value chosen, no fourth round | task orders | §6.7 |
| Work cap | D19 applies only to the packs of a failed C5 | 760,000,000 unchanged | task rule | §4.2 |
| Close | owner's decision | accept 10x10-master's estimates; close at 80,000,000 | owner (P-OD8) | Part H |

### 4.7 Incidents

| Incident | Effect | Handling | Recorded in |
|---|---|---|---|
| The machine slept from 2026-11-12 22:19 to 2026-11-13 05:59 | MP09d2 stopped for 7 h 40 min | the time is excluded from the logs | MP09d2 log |
| The progress-mail service has failed with 502, 503 and 504 since 2026-11-12 22:16 | no mail reports | reports given in the CLI | orchestrator |
| Wrong Execution-log times | the logs of MP09d2, MP09e and MP10a were corrected in `ed54ecc`, those of MP10b2 and MP11 in `f33aa71` | corrected | commit messages |
| Earlier log times | the logs of MP01 to MP09d1 give orchestrator commit times 1 to 15 minutes after the git commit times (for example MP01: log 13:12, commit 13:04; MP08: log 18:55, commit 18:40) | not corrected; section 3 uses the git times | `git log`; the logs |
| Load-sensitive quick tests | one unnamed failure in MP09c's review under machine load; one in MP11 (`tests/calibration.test.js:393`) | passed on re-runs; recorded | MP09c and MP11 logs |
| `tests/site-tools.test.js` EPERM | MP12a's first round-2 GA-P2 run: the test's cleanup hook could not remove `tests/artifacts/site-tools-*` | run again alone: exit 0; not in any record yet | `tests/artifacts/MP12a/ga-p2-r2-first.txt`, `r2/site-tools.log` (not tracked) |
| A broken browser page | `tests/browser/player-load.js` had not passed since MP09a1 | rebuilt in MP10b2 | MP10b2 log |
| The pause | the owner's order at 17:52; the MP12a developer cancelled at about 17:49 | this record and the pause-state commit | `clarifications.md` PR-P1; orchestrator |

## 5. Differences from the original design

Compared: Fable's `plan.md` (2026-11-11), the consolidated report `report-detailed.md` as accepted (`e73712f`, applied in
`6ba2f3a`) and the accepted task pack (`6ba2f3a`; the later task files were committed with their tasks up to MP07, and MP08 to MP17 in `b70069a`), against the tree at
the pause. The rows have ids so that PR-P1 can refer to them.

The column "Fable" says:

- **approved**: answered by Fable, or part of the report Fable accepted (Parts A to G, D21, D36). The owner's decisions
  taken before the acceptance (SA1-Q-P1, SA2-Q-P02, SA2-Q-P03, SA2-Q-P09, C1, C4, AR1) are in this class: Part G
  accepts the report "including the owner's four decisions", and AR1 came from Fable's own review.
- **not reviewed**: decided after the acceptance without the plan author (by the owner, the orchestrator, the analysts
  or a task rule).

### 5.1 Knob values

| # | Item | Original (reference) | Now | Reason | Decided by | Fable | Recorded in |
|---|---|---|---|---|---|---|---|
| K1 | `base.max` | plan P2.1: 12 in the equation, 16 in the `SCORE_V3` constant | 12 | 16 lets a forced puzzle reach Hard | Fable (SA2-Q-P01 (a)) | approved | Part A; RES-18 |
| K2 | `base.scale` | plan P2.1: 6; RES-18 start 6 | 3, the lower edge of the range 3-12 | the MP06c fit: with 6, 120 of 148 Easy lines fall below Easy and 170 of 200 Master lines reach Nightmare or above | fit rule (MP06c), written by MP08 | range approved (JR-P3); value not reviewed | `fit-2026-11-12.md` §3, §8; design §7.10 |
| K3 | `rule` | plan P2.1: tier 1 0, tier 2 2, tier 3 or more 4 (tier 4 meant a guess); RES-18 `[0, 0, 2, 4]` by deduction tier 0-3 | `[0, 0, 2, 2]` (MP06c, MP08), then `[0, 0, 2, 3]` (MP12a round 1) | deduction tier only; the values from the fit; `rule[3]` 3 came with the best grid set that has a penalty | Fable (the meaning, SA2-Q-P13); fit; MP12a's rule | meaning approved; values not reviewed | Part C; fit §3; record §2.7, §3.1 |
| K4 | `weights` | plan P2.1: a = 6 (G), b = 4 (info), "starting point" | `G` 5, `info` 0.5 (the lower edge of 0.5-6) | the fit: 56.5 % mean hit rate against 14.8 % for the starting knobs on corpus A | fit, MP08 | ranges approved; values not reviewed | fit §3 |
| K5 | penalty | plan P2.1: few 2, many 4; RES-18 (2, 4); SA1-Q-P1: "the fixed few/many penalty stays" | (0, 0) from MP08 to MP12a round 0 (P-OD3); (1, 2) from round 1 | the fit on v2-made puzzles switched it off; MP12a's rule restored it, at 0.80 points of predicted fit and no measured difference | owner (P-OD3); then MP12a's rule | not reviewed | Part H; record §4.3 |
| K6 | the bound of a puzzle without a decisive guess | plan P2.1: base + rule at most 16 | at most 14 (12 + 2) from MP08; at most 15 (12 + 3) since MP12a round 1 | follows K1 and K3 | - | the invariant approved | design §7.10 |
| K7 | the information term | plan P2.1: `b · Σ log2(c_i)` over every guess on the final path | `Σ log2(c_i / kLow_i)` over the decisive (counted) guess nodes; an unfinished census gives an upper estimate | free choices among solutions must add nothing | owner (SA1-Q-P1 (B)) | approved | RES-05 |
| K8 | `DEDUCE.nodes` | plan P0.2: 20,000 | 30,000 | D19: twice the largest node count of the probe corpus (12,594), rounded up | D19 rule (MP06b) | rule approved (RES-10); value not reviewed | `probe-2026-11-12.md` §9 |
| K9 | `DEDUCE.work` | none in the plan (a node cap only) | 760,000,000 | a node cap does not bound the work (RES-10); D19: twice 377,809,504, rounded up; above the 500,000,000 threshold | RES-10; owner (P-OD2) | rule approved; value not reviewed | probe §9; Part H |
| K10 | `DEDUCE.census` | none in the plan | 10,000,000 (P-OD1), then 80,000,000 (P-OD7); 10x10-master and 18x20-master accepted above 5 % (P-OD7, P-OD8) | the 5 % rule (Part F C5; criterion C4 in MP12a) | owner | not reviewed | Part H P-OD1, P-OD7, P-OD8 |
| K11 | `DEDUCE.memoryBytes` | none in the plan | 32 MiB, still provisional | the memory bound of RES-10; the largest peak was 20,785,413 bytes on 26 x 26 | RES-10 | approved | probe §9; design §7.9 |
| K12 | `lookaheadWidth`, `solutions` | 4 and 8 | unchanged | - | - | - | `core/engine/policy.js` |
| K13 | `STALL_LIMIT` | none | 12 | D21 | Fable (D21), owner (P-OD4); kept by D21-V3 | approved | Part I D21 |
| K14 | `K60`, `SHARES`, `POLICY_ID` | plan §5: may be revisited in P3 | unchanged | no availability failure in the slice | - | - | record §1, §9 |

### 5.2 Rating contracts

| # | Item | Original (reference) | Now | Reason | Decided by | Fable | Recorded in |
|---|---|---|---|---|---|---|---|
| R1 | What a guess is | plan P0.2: every guess node on the path to the first solution (raw) | decisive guesses, proved by a census; an unfinished census publishes a labelled upper estimate, `censored: true` | a free choice between solutions is not a difficulty | owner (SA1-Q-P1 (B), C1 (b)) | approved | RES-05 |
| R2 | A real choice for Hard and above | plan §1.3; plan P3: "no Hard+ puzzle has G = 0" | new metric `Gproved` (not a score input); the Generator refuses a Hard-or-above candidate with `Gproved` = 0; imports are not filtered | an estimate alone must not make a generated puzzle Hard | owner (AR1, from Fable's review) | approved | RES-35; MP09c; record C3 (`provedZero` 0) |
| R3 | A capped search | plan P2.1: `saturated = stop === 'node-cap'`, the "+" mark; plan P3 step 4: lower `nodes`, saturation acceptable at Hell | a path capped before its first solution is unrateable (`IncompleteRatingError`); v3 never sets `saturated` | never invent a guess count | owner (SA2-Q-P02 (a)) | approved | RES-04 |
| R4 | The result | plan P0.2: `DeductionMetrics` with one `stop` | `DeductionResult { path, first, search, count, census }`; claims carry 28 `MetricsV3` keys | the plan's metrics could not rebuild the score (part D item 2) | analysts; Fable accepted part D | approved | RES-04; MP09b |
| R5 | The rules | plan P0.2b: R1-R9 as written; R4, R5 and R9 group identical shapes | sound forms of R9 and of R3 "place"; R7 with optional allocation; R4 and R5 on piece/cell pairs only; labelled pieces | unsound as written | Fable (part D items 1 and 10; SA2-Q-P12) | approved | RES-06, RES-07 |
| R6 | Identical shapes | plan P0.2b: interchangeable pieces by `canonicalKey` | a set with two pieces of the same shape is an error at every entry (packs, links, codes, both apps); saved sets with such a pair are removed with a one-time notice; task MP04b dropped | owner | owner (SA2-Q-P03, C4 (b)) | approved | RES-34; MP09a1, MP09a2 |
| R7 | Search order | plan §5: a median of three tie-break orders if G varies by more than about 1 at Hard | one canonical order, no automatic median. Measured in the slice: at Hard G differs by up to 2 and the score by up to 12 (12x12-hard, round 2); at Master by 6 to 13 (round 2) | an aggregation needs its own decision | Fable (SA2-Q-P06 (a)) | rule approved; the measured spread not reviewed | RES-13; record §2.5, §5.4, §6.4, §7.2 |
| R8 | Recipe test | plan P0.2: G and Gt non-decreasing over the six recipes | a characterisation of fixed puzzles; monotonicity tested on generated puzzles (the slow test) | old v2 recipes are not a monotone v3 corpus | Fable (part D item 5) | approved | RES-11, RES-26 |
| R9 | Hell levels | plan: Hell rated, saturation acceptable | Hell made only for Hell 1 on the 164-cell board; every larger Hell board measured was capped or above its band; the levels are still offered (interim); the owner chooses (i), (ii) or (iii) at MP12b2 | a consequence of R3 | Fable (D36 (a)), owner (P-OD5) | approved | Part I D36; `d21-v3-2026-11-12.md` §4, §6 |

### 5.3 Clue search and generation

| # | Item | Original (reference) | Now | Reason | Decided by | Fable | Recorded in |
|---|---|---|---|---|---|---|---|
| C1 | Acceptance | plan P1: return at once within ±(max - min) / 4 of the band centre or when `profiles >= limit - 16`, else `ranked(target, inBand)[0]` | RES-15: a central final result (after any repair) stops; else the best final result at profile 48; lazy best-first, repairs memoised; unbounded bands keep first in band | repairs and unbounded bands | Fable (SA2-Q-P04, C2) | approved | RES-15; MP07 |
| C2 | Stall stop | none | RES-15a, `STALL_LIMIT` 12 on raw ratings; spent profiles neither advance nor reset the counter | the centre of Hell 3 on 22x22 is unreachable (D21) | Fable; owner (P-OD4) | approved | Part I D21; MP07, MP09c |
| C3 | Clue sampling | plan P1 step 2: weighted by placement counts | uniform | the direction was not validated (argued the wrong way) | Fable (SA2-Q-P05) | approved | RES-16 |
| C4 | Unrateable and unproved candidates | none | each costs a profile and is neutral for the count steering; "Hard or above" is `target.min >= 17` | R2, R3 | owner; Fable (D21 counting) | approved | MP09c; check-list D10 |
| C5 | Hell recipes and tests | the recipe `square-22x22-hell-3` and MP07's 15 x 20 Hell 2 slow test | `square-22x22-nightmare`; a 15 x 20 Nightmare slow test and an unrateable-calibration slow test | D36 precision 2 | Fable (D36) | approved | MP09d2 log |
| C6 | Algorithm id | plan: not stated | `gen-v3` from P1 | part D item 13 | Fable | approved | RES-17 |

### 5.4 Formats and apps

| # | Item | Original (reference) | Now | Reason | Decided by | Fable | Recorded in |
|---|---|---|---|---|---|---|---|
| F1 | Puzzle codes | plan P2.4: no change; a v3 claim as JSON text with all metrics | a summary claim `{ model, score, level, saturated: false, censored? }`; on 26 x 26 at most 415 symbols and QR version 14-M | code length | Fable (SA1-Q-P3 (b)); owner (C1 (b)) | approved | RES-22; `codes-2026-11-13.md` |
| F2 | Packs | plan P2.3 | strict v3 claims with cross-field checks (`censored`, `Gproved`); v2 claims legacy, keeping admitted nonstandard metrics; at most 4,096 bytes and depth 8 | FP04 | Fable (report); SA (FP04) | approved; FP04 not reviewed | RES-21; MP09b |
| F3 | Old ratings | plan P2.5: v2 claims re-rated in the Player's pool | v2 and v1 claims; a derived display rating with a note, never stored; one auxiliary queue on the existing pool that never cancels a generation | | Fable (SA2-Q-P08, JR-P1 (a), JR-P4 (a)) | approved | RES-23, RES-29; MP10a-MP10b2 |
| F4 | The Player's built-in sample | plan gates: re-record `generated-sample-pack.json` | `player/samples/sample-pack.json` stays byte-for-byte as the source of the frozen v1 code goldens; whether it should show v3 puzzles is open for the owner | keep the goldens | pack (check-list D20) | not reviewed | check-list D20 |
| F5 | Code goldens | plan P2: re-record the goldens that embed ratings | the v2 goldens kept as history; v3 cases added | part D item 6 | Fable | approved | RES-24 |
| F6 | Provenance (not built yet) | plan P4.1: a per-puzzle field `made` | `generation.made` and `generation.setOrigin`; skip lists capped at 64 and 16 ordinals, else `'overflow'` | a new per-puzzle field breaks every current reader | Fable | approved | RES-27 |
| F7 | Worker pool | plan: no change | one load retry after 100 ms (Amendment D1) | KI-1, a flaky page that predates rating-v3 | SA1, orchestrator | not reviewed | MP10b2 |
| F8 | Print captions | plan: not covered | detail lines shortened with an ellipsis to the heading width on paper (`fitDetailLine`) | the new notes were wider than the frames | orchestrator (MP10b1) | not reviewed | MP10b1 log; design §11.15 |

### 5.5 Calibration and gates

The owner's criterion C5 of Part F (the 5 % census rule) is criterion C4 in MP12a; MP12a's C5 is "no capped path"
(check-list D29). This section uses MP12a's names.

| # | Item | Original (reference) | Now | Reason | Decided by | Fable | Recorded in |
|---|---|---|---|---|---|---|---|
| G1 | Order of the work | plan §4: P0, P1, P2, P3; plan P4 "Order": P4.1 and P4.2 do not depend on v3 and can ship first | PROC-P1 (a): an initial fit before the activation (MP06c), the lock before P4 (MP12b2), a regression run after P4 (MP17); P4 work (MP13a-MP16b) waits for the lock | measure before activating | Fable (PROC-P1) | approved | RES-14, RES-25; check-list "PROC-P1" |
| G2 | The calibration run | plan P3 step 3: one `calibrate.mjs --profile landscape` run and `rate-probe` over the same packs, knobs adjusted until the criteria hold | MP12a: the 18 GV2 cells (four boards) in at most three rounds of 360 requests (20 seeds), with `rate-probe` on 90 captured requests; MP12b1: the full landscape, 105 cases on 16 boards, 20 repetitions (Hell by D37); MP12b2: search evidence (GS-P3), the Hell report, the owner's questions and the lock; MP12b3 only if the owner chooses D36 (i) | the full landscape (SA2-4 JC07); split after SP16 | analysts; Fable accepted RES-25 | RES-25 approved; the split and MP12b3 not reviewed | RES-25; check-list D29, D35; MP12a, MP12b1, MP12b2 |
| G3 | C1, levels ordered | plan P3: "on every board size" | median v3 score strictly increasing on the four GV2 boards (6x10, 10x10, 12x12, 18x20); MP17 adds every offered level on 10x6 and 20x18 (plan §7 "Final") | the GV2 matrix has a baseline | analysts | approved (RES-25) | D29; record §6.3, §7.1 |
| G4 | C2, Hard and Expert | plan P3: "hit rates at hard/expert stay >= the v2 ones within ~10 points"; RES-25: hit rate at least the GV2 hit rate minus 10 points | decided by the request completion rate (`requestCompletionRate`), never by puzzle rescores; slice: eight cells at 100.0 % against GV2 100.0 % | a rescore measures the score, not the generation | SA2 (TP22); SA1 accepted | not reviewed | D29; review "MP12 tranche" TP22 |
| G5 | C3, a real choice | plan P3: "Hard needs G >= 1 everywhere" | `provedZero` 0 in every Hard-or-above cell (AR1), plus the slow test | AR1 | owner (AR1) | approved | RES-26, RES-35; record §6.3, §7.1 |
| G6 | C4, census estimates | none in the plan; Fable (Part F C5): "5 % of a level's accepted probe puzzles, per level and board cell of the MP06 corpus" | the same 5 % applied to v3-generated cells; two cells accepted above it: 18x20-master (11.0 %) and 10x10-master (7.0 %) | 80,000,000 is not enough in these cells | owner (P-OD7, P-OD8) | the 5 % approved; the exceptions not reviewed | Part H; record §6.3, §6.5 |
| G7 | C5, capped paths | plan P3 step 4: saturation acceptable at Hell | no capped path among the canonical re-ratings of accepted puzzles; diagnostic samples never gate (TP21); slice: 896 of 896 complete | RES-04 | owner (SA2-Q-P02); SA2 (TP21) | approved; TP21 not reviewed | D29 |
| G8 | Rounds and changes | plan P3: "Adjust `SCORE_V3` knobs until ..."; RES-25 "What P3 may change": knobs within ranges, `DEDUCE` caps, `K60` and `SHARES` (with a `POLICY_ID` bump) | MP12a: rule-chosen changes (census by D19, the penalty by P-OD3's comparison, MP06c's grid for an ordering failure, one `SHARES` or `K60` trial with the orchestrator's go-ahead), never a round on an unchanged tuple, at most three rounds, then the owner. MP12b2 changes nothing unless the orchestrator orders a change round; a change round reruns the complete population in new folders (TP32) and evaluates C1-C5 again (TP30) | bounded machine time; one evidence trail | analysts (TP22, TP30, TP32); owner (P-OD7 for round 2) | RES-25 approved; the round rules not reviewed | D29; MP12a, MP12b2 |
| G9 | Hell population | RES-25: 20 repetitions per case | a 3-request prescreen of the 25 Hell cases; 20 requests for each case whose prescreen made a puzzle and for the boundary case of each Hell level | about 17 hours at 20 requests | owner (P-OD6, D37 (c)) | not reviewed (Part I D37 was answered by the owner) | Part I D37; MP12b1 |
| G10 | Machine time | report §6.2: the slice 1-3 h, the full landscape 4-10 h | slice rounds about 25 to 30 minutes each, plus lock waits; MP12b1 estimated at 9.5-14.5 h; a change round about 12-18 h more | Hell runs to the time limit; the lock protocol | analysts | not reviewed | record §2.8, §5.7, §6.7; MP12b1 header; response §12.4 |
| G11 | Approval gates | plan §3 rules 1 and 2: `npm test`, calibration runs and fixture re-recording are APPROVAL GATE items, ask first | gates pre-approved by the owner and run by the owning task (GF-P2 and GA-P2 in MP09d2 and in MP12a) | owner delegation | owner | not reviewed | check-list §7 heading |

### 5.6 Task structure

| Stage | Parts | Source |
|---|---|---|
| Plan | steps P0.1 to P4.4 for one implementing agent, one commit per step (plan §3 rule 7, §7) | `plan.md` |
| Report | 17 tasks, MP01 to MP17; MP04b (quotienting identical shapes) dropped before acceptance, when the owner refused such sets (SA2-Q-P03, RES-34) | report §5; check-list §1 |
| Accepted pack (`6ba2f3a`) | 27 dispatched parts | check-list at `6ba2f3a` |
| Now | 35 parts: MP06c (the fit) separate from MP06b; MP09a as MP09a1 and MP09a2 (D25); the activation as MP09c, MP09d1, MP09d2 and MP09e (D24, D25); MP10b as MP10b1 and MP10b2 (D27); MP12b as MP12b1 and MP12b2 (SP16); MP15a as MP15a1 and MP15a2 (SP08-SP10). Conditional: MP12b3 if the owner chooses D36 (i). Declined: SA1's MP16c and side stream | check-list §1 (the paragraph after the index); response §12 |
| Amendments | RES-15a (D21, MP07); A1 (MP06b); B1 (MP09d2); D1 (MP10b2); L1 (MP13a-MP17) | section 4.3 |
| Addenda at dispatch | TP01; TP13, TP14; TP15; TP29; TP34 pending | section 4.3 |

### 5.7 Tooling added

| Tool | Original | Now | Why | Decided by | Recorded in |
|---|---|---|---|---|---|
| `tools/rate-probe.mjs` | plan P0.3 | built (MP06a) with `--knobs` and the `tieOrder` diagnostic | as planned; `tieOrder` for the order-noise table | plan; D18 | check-list D18 |
| Probe corpus | none | `docs/difficulty-v3/probe-corpus-2026-11-12/`, captured once with a manifest | replayable evidence (FP05) | A1 | check-list D19 |
| Lock helper `Invoke-Dv3Timed` | none | text in check-list §7, saved per task as `tests/artifacts/<task>/dv3-lock.ps1` | the shared machine and the Sudoku repository | TP20; L1 | check-list §7 |
| Landscape launcher | none | `docs/difficulty-v3/landscape-v3/launch.mjs`: resumable shards, publish checks; one-line fix in MP12a; used read-only by MP12b1 and MP12b2 | bounded shards under the lock | TP20 | MP12a; record §1.1 |
| Criteria script | none | `docs/difficulty-v3/landscape-v3/criteria.mjs` with a self-test | C1-C5 by script | TP21, TP22 | MP12a |
| Aggregation script | none | `docs/difficulty-v3/landscape-v3-full/aggregate.mjs` (MP12b1, not written yet) | the full landscape | TP27 | MP12b1 |
| D21 drivers | none | `docs/difficulty-v3/d21-2026-11-12/` and `docs/difficulty-v3/d21-v3-2026-11-12/` (observers, `simulate`, `certify`, `avail`) | D21 and D36 evidence | Fable's measurement questions; MP09d2 | check-list §7 "D21-V3" |
| Bench tools | plan: `calibrate.mjs --profile landscape` | `tools/bench/runner.js`, `report.js`, `calibration-reference.js` with v3 columns; `clues` instead of `G` | RES-25 tooling | report | check-list D28; MP11 |

### 5.8 Scope changes and deferred items

| Item | Original | Now | Decided by | Fable | Recorded in |
|---|---|---|---|---|---|
| Hell levels | rated, saturation acceptable | made only for Hell 1 on the 164-cell board in MP09d2; the owner chooses (i), (ii) or (iii) at MP12b2 (R9) | owner, Fable (D36) | approved | Part I D36 |
| Identical shapes | handled inside the solver | refused at every entry (R6); a new user-visible error | owner (SA2-Q-P03; C4 (b) for saved sets) | approved | RES-34 |
| Old ratings re-rated | v2 claims | v2 and v1 claims, display only (F3) | Fable (JR-P1) | approved | RES-23 |
| Out of scope (RES-33) | some in the plan | rule-based Player hints; placement-weighted sampling; a compact v3 code codec; a production median over search orders; quotienting identical shapes; a v3 "+"; a second worker pool; replaying stages 4-6 of completion-pass puzzles | Fable and owner | approved | RES-33 |
| A separate engine project for Hell | none | option (iii) of D36; Fable recommends it as later work | Fable | approved as an option | Part I D36 |
| Player sample in v3 | plan gates re-record the generated sample | not done; open owner question (F4) | pack | not reviewed | check-list D20 |
| Design §7.8 measured values | plan: docs in the same change | written once by MP12b2 after the lock | pack | not reviewed | MP12a "Out of scope" |
| Release | plan §7 "Final" | the merge of `rating-v3` is the owner's decision; check-list §9 release record empty | owner | - | check-list §9 |

### 5.9 Process rules

| Rule | Original | Now | Decided by | Recorded in |
|---|---|---|---|---|
| Who builds | plan: one implementing agent (§3, §7) | an orchestrator; two analysts wrote and cross-reviewed the pack; one developer agent (claude-sonnet-5.5) per part, strictly serial in this repository; the Sudoku repository in parallel on the same machine | the accepted pack | check-list header "Execution" |
| Reviews and commits | plan §3 rule 7: one commit per step, quick tests green | the orchestrator re-verifies each part, reviews the diff, fills the Execution log and commits one commit per accepted part; the pause-state commit holds MP12a incomplete | the accepted pack; owner (pause) | check-list §2 "Per-task protocol and commits"; section 1.4 |
| Push | check-list: "nothing is pushed" | `rating-v3` is pushed to `origin` so that Fable can read and answer | orchestrator | `git log` (HEAD equals `origin/rating-v3`) |
| Approval | plan §3: ask first for slow runs and fixtures | gates pre-approved; design decisions are asked of the owner and never adopted from a recommendation without his answer | owner | check-list §7 heading; the orchestrator's notes (outside the repository) |
| Machine sharing | none | the lock protocol (`dv3-timing.lock` for this repository, `dv3-sudoku.lock` for Sudoku): one bounded command per lock (at most 590 s here), at least 15 s between release and re-take, a 20-minute wait limit, one pentomino test process at a time; earlier (2026-11-12) a heavy-run rule of the orchestrator | TP20, L1, orchestrator | check-list §7 |
| Task files | not in the plan | frozen at dispatch; later corrections go to the developer as binding addenda | orchestrator | section 4.3 |
| Execution logs | not in the plan | times, model, tokens and AI credits; machine sleep excluded | orchestrator | the task files |
| Questions | plan: ask the owner | questions for Fable in `clarifications.md`, pushed; since 18:03 `clarifications.md` keeps only open questions and `clarifications-resolved.md` the history | owner | both files |

### 5.10 Approval summary

| Class | Rows |
|---|---|
| Approved by Fable (answered by him, or in the report he accepted) | K1, K6, K7, K11, K13; R1-R6, R8, R9; C1-C6; F1, F2 (except its FP04 part), F3, F5, F6; G1, G3, G5; the RES-25 parts of G2, G7 and G8; the RES-33 scope; the 5 % of G6; the meaning of K3; the ranges of K2 and K4; the rules of K8 and K9; the rule of R7 |
| Decided without the plan author | K2, K3, K4 values (fit, MP12a rule); K5 (P-OD3, then MP12a's rule); K8, K9 values (D19, P-OD2); K10 (P-OD1, P-OD7, P-OD8); the measured spread of R7; F2's FP04 part; F4 (D20); F7 (D1); F8 (`fitDetailLine`); G2's split and MP12b3; G4 (TP22); G6's two exceptions; G7's TP21; G8's round rules; G9 (P-OD6); G10; G11; the task structure (5.6); the tooling (5.7) except the probe; the process rules (5.9) |

## 6. Open items and risks

### 6.1 Questions waiting

| Item | For | State | Recorded in |
|---|---|---|---|
| PR-P1: the direction (close MP12a, then MP12b1, MP12b2, MP13a-MP17, or a change) and any difference of section 5 not accepted | Fable | open | `clarifications.md` PR-P1 |
| D36: (i) stop offering the levels v3 cannot make, (ii) a different contract, (iii) a separate engine project; and the fail-fast proposal (F1: end a set request after a set attempt whose calibration had every profile unrateable; F2: end a selection call after its first four profiles are all unrateable; F1 + F2) | owner, at MP12b2; Fable recommends (i), with (iii) as later work | asked at MP12b2 with its evidence | Part I D36; MP12b2 "The fail-fast proposal" |
| D20: should the Player's built-in sample show v3 puzzles | owner | open | check-list D20 |
| Release: merging `rating-v3` | owner | after MP17; the release record of check-list §9 is empty | check-list §9 |
| TP34: the path note for a change round's copied probe driver | orchestrator | to be passed as an addendum at MP12b2's dispatch (SA2: "an MP12b2 implementation note" for the change round's step 5) | `6-review-of-task-pack.md` TP34 |
| Sudoku PR-S1 and CV6-03 (c) | Fable, the owner | open in the Sudoku repository; that work shares this machine and its lock | the Sudoku repository's `clarifications.md` |

### 6.2 Known issues and loose ends

| Item | State | Who closes it |
|---|---|---|
| Stale text: design §7.8 says the slice left "`DEDUCE` unchanged"; design §7.9 names only the 18x20-master exception; design §4.2 and the comment in `core/engine/policy.js` say `SCORE_V3` is "defined but not yet the rating" (stale since MP09d2); a paragraph of §7.9 is duplicated (since MP08) | in the pause-state tree | MP12a's close for the P-OD8 text; MP12b2 writes §7.8; MP17 corrects stale sentences (D35) |
| The record `calibration-slice-2026-11-13.md` still says it waits for the owner (§8.5, §9) and has no P-OD8, GF-P2 or GA-P2 section for round 2 | last written 17:19 | MP12a's close |
| `tests/site-tools.test.js` EPERM on cleanup under a full run | seen once (17:45); passed alone | not assigned |
| Load-sensitive quick tests (`tests/calibration.test.js:393`, one unnamed in MP09c) | passed on re-runs | not assigned |
| The branch offers Hell levels that v3 cannot make on large boards | interim, by D36 | the owner's choice at MP12b2 (MP12b3 under (i)) |
| Work headroom: the largest main-search work of the slice is 58.6 % of `work` and its largest node count 70.8 % of `nodes` (10x10-master) | larger boards come in MP12b1 | MP12b1, MP12b2 (C5) |
| The progress-mail service fails (502, 503, 504) | reports in the CLI | orchestrator |
| KI-1 | closed by D1 (20 of 20); MP17 runs the page with no re-run allowance | MP17 |

### 6.3 Riskiest coming parts

| Part | Risk | Evidence |
|---|---|---|
| MP12b1 | the longest run: 9.5-14.5 h of machine time in bounded commands under the lock, shared with the Sudoku work; the first v3 measurement of the census share, the work and the node counts on the 12 boards outside the slice; a cell with too many census estimates or a capped prod line becomes an MP12b2 finding | MP12b1 header and "Goal"; record §7.2 item 4 |
| MP12b2 | the owner's D36 answer; any failed criterion on the full landscape can lead to an ordered change round (about 12-18 h more, a rerun of the complete population); it writes the lock | MP12b2 header; D29 |
| MP13a-MP15b | provenance and replay must reproduce the locked generation exactly (RES-27 to RES-29); MP15a1 and MP16a are sized Large (700-850 and 800-1,000 changed lines) | task headers |
| MP16b, MP17 | browser pages (GB-P4, the full page set) on a shared machine; MP17 accepts no re-run of `puzzle-code-acceptance` | MP17; check-list D35 |

### 6.4 Evidence still to produce

- MP12a: the final `npm test`, `npm run check`, the self-tests and the format check on the round-2 tree, and the record
  sections for P-OD8, GF-P2 and GA-P2.
- GL-P3, full part (MP12b1): 105 cases; the three lists (no puzzle, never central, too many census estimates).
- GS-P3 (MP12b2): the search evidence R, A, H and HL; the Hell report; the fail-fast table; the record
  `calibration-<date>.md` and design §7.8; the lock.
- D21: "MP12 reports, per Hell cell, the ratings per puzzle and the generation time under v3" (MP12b2).
- The order-noise table of the full landscape. Whether a Hard puzzle with a unique solution and a decisive guess exists
  on 18 x 20 (fit finding 7: none in the v2-made corpus B): measured by GS-P3's population R (`--uniqueness require`
  on 18x20 Hard, Expert and Master, MP12b2).
- GF-P4, GB-P4 and GZ (MP13b, MP16b, MP17); the plan §6 probe on 10x6 and 20x18 (MP17).

## 7. Remaining plan

In order, one part at a time in this repository. Developer times are the task headers; machine time is under the lock
protocol, and the waits for the Sudoku repository come on top.

| # | Part | Developer time | Machine time | Waits on |
|---|---|---|---|---|
| 1 | MP12a (close) | not recorded | not recorded (after round 1: GF-P2 and GA-P2 about 5 minutes, the final commands 4 minutes; record §8.3) | nothing |
| 2 | MP12b1 | 45-60 min | 9.5-14.5 h | MP12a's commit |
| 3 | MP12b2 | 60-90 min | GS-P3 R and A 20-40 min, H 25 min, HL 60-90 min, availability about 16 min if needed, lock about 10 min; a change round about 12-18 h more | the owner's D36 answer; TP34 addendum |
| - | MP12b3 (only under D36 (i)) | not written | not recorded | the owner's choice; the analysts write it |
| 4 | MP13a | 50-60 min | - | the lock |
| 5 | MP13b | 50-60 min | plus GF-P4 | |
| 6 | MP14a | 55-60 min | - | |
| 7 | MP14b | 40-50 min | - | |
| 8 | MP15a1 | about 60 min | - | |
| 9 | MP15a2 | 45-60 min | - | |
| 10 | MP15b | about 40 min | - | |
| 11 | MP16a | about 60 min | - | |
| 12 | MP16b | 50-60 min | plus GB-P4 | |
| 13 | MP17 | 50-60 min | 70-100 min (GZ) | |

Totals from MP12a's commit (SA1, `7-response-to-second-pass.md` §12.4, serial): MP12b1 and MP12b2 13.5-20 h; MP13a-MP16b
5-7 h at the commit-to-commit pace of MP08-MP11; MP17 2-2.7 h; about 20.5-30 h, or about 32.5-48 h with a change
round. The orchestrator's estimate before the pause: about 25-35 h of serial work, if nothing else stops and the
machine stays awake. For comparison, the 22 committed parts used about 544 minutes of developer time (section 3.1).

## 8. Points for the plan author's review

1. **Direction (PR-P1).** Close MP12a and continue in order, or change course. SA1 proposed a side stream for MP13a-MP16b
   (saving about 3-6 h; plan P4 "Order" allows P4.1 and P4.2 first); the orchestrator kept the serial order because the
   Sudoku work is the critical path (`7-response-to-second-pass.md` §12).
2. **The score tuple to lock (K2-K5).** `base.scale` 3 and `weights.info` 0.5 are on the lower edges of their
   ranges; `base.max` 12 on the upper edge. The penalty (1, 2) with `rule[3]` 3 came back by MP12a's rule at 0.80 points
   of predicted fit, and "the measured data do not separate the two tuples" (record §7.2 item 3). Is this the tuple to
   lock, and are values on range edges acceptable?
3. **The census and the 5 % rule (K10, G6).** Your C5 answer set 5 % per cell of the MP06 corpus. The owner raised the
   census to 80,000,000 and accepted 10x10-master (7.0 %) and 18x20-master (11.0 %). MP12b1 will measure the 12 other boards.
   How should a cell above 5 % on the full landscape be treated: a finding for the owner, a change round, or accepted
   as estimates with their note?
4. **Order noise (R7).** Plan §5 asked for a median of three orders "if G varies by more than ~1 at Hard". In the slice
   G varies by 2 at 12x12-hard (3 of 50 lines; score spread 12). SA2-Q-P06 (a) chose one canonical order, and RES-25
   forbids multi-order aggregation without a new decision. Confirm, or reopen.
5. **Hell levels (R9, D36).** Only Hell 1 on the 164-cell board was made under v3. Your recommendation is (i). An
   early owner answer would shape MP12b1's Hell runs (25 prescreens, about 2.5 h, plus up to about 2 h of boundary runs).
6. **Criteria that changed after the acceptance (G4, G8, G9).** C2 by request completion rate instead of hit rate
   (TP22); no round on an unchanged tuple; a change round reruns the whole population (TP32); the Hell population of
   D37 (c). None of these was reviewed by you.
7. **Product changes outside the design (F7, F8, F4).** The worker-pool load retry (D1), the shortened print captions
   (`fitDetailLine`), and the Player sample kept in v2 (D20, open for the owner).
8. **Process (5.9).** Gates are pre-approved by the owner, unlike plan §3's "ask first"; the plan's one-agent,
   one-commit-per-step model became 35 serial parts with an orchestrator. Any objection affects how the remaining 13
   parts run.

## 9. Where to find things

| What | Path |
|---|---|
| Plan | `docs/difficulty-v3/plan.md` |
| Consolidated analysis | `docs/difficulty-v3/report-detailed.md`, `docs/difficulty-v3/report-brief.md` |
| Open questions | `docs/difficulty-v3/clarifications.md` (PR-P1) |
| Resolved questions and decisions | `docs/difficulty-v3/clarifications-resolved.md` (Parts A-I; P-OD1-P-OD8 in Part H; D21, D36, D37 in Part I) |
| Task index, decisions D1-D37, gates, lock helper, known issues, summary table | `tasks/difficulty-v3/check-list.md` |
| Task files and Execution logs | `tasks/difficulty-v3/MP*.md` |
| SA1 (claude-opus-5.5) | `docs/difficulty-v3/claude-opus-5.5/` (`6-response-to-task-pack-review.md`, `7-response-to-second-pass.md`, `d36-hell-probe.txt`) |
| SA2 (gpt-6-astra) | `docs/difficulty-v3/gpt-6-astra/` (`5-check-of-final-report.md`, `6-review-of-task-pack.md`) |
| v2 baseline (GV2) | `docs/difficulty-v3/baseline-v2/` |
| Probe and caps (MP06b) | `docs/difficulty-v3/probe-2026-11-12.md`, `docs/difficulty-v3/probe-corpus-2026-11-12/` |
| Initial fit (MP06c) | `docs/difficulty-v3/fit-2026-11-12.md` |
| D21 | `docs/difficulty-v3/d21-measurements-2026-11-12.md`, `docs/difficulty-v3/d21-2026-11-12/` |
| D21-V3 and D36 measurements (MP09d2) | `docs/difficulty-v3/d21-v3-2026-11-12.md`, `docs/difficulty-v3/d21-v3-2026-11-12/` |
| Code sizes (MP09e) | `docs/difficulty-v3/codes-2026-11-13.md` |
| Calibration slice (MP12a) | `docs/difficulty-v3/calibration-slice-2026-11-13.md`; `docs/difficulty-v3/landscape-v3/` (`launch.mjs`, `criteria.mjs`, `r0/`, `r1/`, `r2/`) |
| MP12a scratch (not tracked) | `tests/artifacts/MP12a/` (`dv3-lock.ps1`, `ga-p2-first.txt`, `ga-p2-r2-first.txt`, `notes.md`) |
| Knobs and caps | `core/engine/policy.js` (`SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID`); `core/engine/clues.js` (`STALL_LIMIT`); `core/engine/levels.js` (`SHARES`) |
| Design | `docs/design-detail.md` (§4.2, §7.8, §7.9, §7.10, §8.1, §11.15), `docs/design-brief.md` |
| Fixtures moved by GF-P2 and GA-P2 | `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json`, `tests/fixtures/ui-flow-recipes.json` |
| This status | `docs/difficulty-v3/working-status.md` |

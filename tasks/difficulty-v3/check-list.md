# difficulty-v3 (Pentomino) — task index and overall acceptance

**Scope:** production implementation of the accepted difficulty-v3 design for Pentomino ("make Hard really hard"): a
deduction solver that measures a puzzle the way people solve it (rules R1-R9, decisive guesses), the v3 rating model
in which Hard and above need a real choice, centre-seeking clue selection, the measured fit and the calibration lock,
the refusal of piece sets with two pieces of the same shape, the derived display rating, and the Generator's
Generation Steps replay.
**Status:** implementation in progress, one part at a time (the Done column of §1 and the execution summary at the end
are the record). Every task file is written: 35 parts, MP01 to MP17 (§1). The first cross-review of the
pack by gpt-6-astra (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, FP01-FP10) is answered in
`docs/difficulty-v3/claude-opus-5.5/6-response-to-task-pack-review.md`; the second and third passes (SP01-SP19,
TP01-TP12) in `docs/difficulty-v3/claude-opus-5.5/7-response-to-second-pass.md`.
**Traceability:** [`docs/difficulty-v3/report-detailed.md`](../../docs/difficulty-v3/report-detailed.md) (resolutions
RES-01 to RES-35, errata E01-E45, task breakdown §5), accepted by the plan author (`clarifications.md` part G, commit
`e73712f`) and by the owner (2026-11-12, 11:50);
[`docs/difficulty-v3/report-brief.md`](../../docs/difficulty-v3/report-brief.md);
[`docs/difficulty-v3/clarifications.md`](../../docs/difficulty-v3/clarifications.md) (answers, parts E, F and G);
[`docs/difficulty-v3/plan.md`](../../docs/difficulty-v3/plan.md).
**Execution:** one `claude-sonnet-5.5` general-purpose developer sub-agent per dispatched task, strictly one task at a
time in this repository, on the branch `rating-v3`; nothing is pushed. The Sudoku repository runs its own task pack at
the same time on this machine (§2, §7).
**Code base:** HEAD `e73712f`. Line anchors in the tasks refer to that commit; a later task sees the changes of the
earlier ones and finds an anchor by the quoted text when the line has moved.

Each task contains the contracts, data shapes, constants, algorithms and test vectors it needs, copied from the
report. The RES numbers are traceability, not instructions to research the design again. Checkboxes in §1 mean
"implementation accepted and committed", not "task document exists". A task whose file is not written yet is named in
plain text; its row is the planned scope of report §5.1 and is refined when its file is written.

## 1. Task index

| Done | ID | File | Title | Depends on | Size | Owner role | Milestone | Wave |
|---|---|---|---|---|---|---|---|---:|
| [x] | MP01 | [MP01](MP01-model-metadata.md) | Model metadata for the deduction solver | none | Small | Engine | M1 deduction solver | 1 |
| [x] | MP02a | [MP02a](MP02a-deduction-core.md) | Deduction core: state, R1 and R2, search, statuses, caps, memory | MP01 | Large | Engine | M1 | 2 |
| [x] | MP02b | [MP02b](MP02b-pocket-check-and-lookahead.md) | R3 contradiction check, R6 lookahead, E, recipe characterisation | MP02a | Medium | Engine | M1 | 3 |
| [x] | MP03 | [MP03](MP03-rules-r3-place-r4-r5.md) | R3 place, R4 and R5, rule boards and the soundness oracle | MP02b | Medium | Engine | M1 | 4 |
| [x] | MP04 | [MP04](MP04-rules-r7-r9-and-tiers.md) | R7, R8, R9, tiers, rule counts, oracle on every rule | MP03 | Large | Engine | M1 | 5 |
| [x] | MP05 | [MP05](MP05-decisive-census.md) | Decisive census, the upper estimate and `Gproved` | MP04 | Large | Engine | M2 decisive guesses | 6 |
| [x] | MP06a | [MP06a](MP06a-rate-probe-tool.md) | Probe tool `tools/rate-probe.mjs` and the `tieOrder` diagnostic | MP05 | Medium | Tools | M3 measured fit | 7 |
| [x] | MP06b | [MP06b](MP06b-probe-and-v2-baseline.md) | Probe and GV2 runs, the `DEDUCE` values and the probe record | MP06a | Medium + machine time | Measurement | M3 | 8 |
| [x] | MP06c | [MP06c](MP06c-initial-fit.md) | Initial fit of the v3 knobs and the RES-35 counts | MP06b | Small–Medium | Measurement | M3 | 9 |
| [x] | MP07 | [MP07](MP07-centre-seeking-clues.md) | Centre-seeking clue selection, the `SelectContext.rate` seam, `gen-v3` | MP06c | Medium–Large | Engine | M4 centre-seeking generation | 10 |
| [x] | MP08 | [MP08](MP08-pure-v3-score.md) | Pure v3 score, breakdown, `SCORE_V3` and types | MP07 | Medium | Engine | M5 v3 active | 11 |
| [x] | MP09a1 | [MP09a1](MP09a1-duplicate-shapes-refused.md) | Two pieces of the same shape refused in packs, links and puzzle codes | MP08 | Medium–Large | Engine and Player | M5 | 12 |
| [x] | MP09a2 | [MP09a2](MP09a2-saved-sets-notice.md) | Saved Generator sets with two pieces of the same shape: removal and a one-time notice | MP09a1 | Small | Generator | M5 | 13 |
| [x] | MP09b | [MP09b](MP09b-v3-claims-in-packs-and-codes.md) | v3 claims in packs and codes: `censored`, `Gproved` checks, v2 legacy, summary claims | MP09a2 | Medium | Engine | M5 | 14 |
| [x] | MP09c | [MP09c](MP09c-unrateable-and-unproved-candidates.md) | Unrateable and unproved candidates in clue selection (RES-04, AR1; the D21 counting rule) | MP09b | Medium | Engine | M5 | 15 |
| [x] | MP09d1 | [MP09d1](MP09d1-measure-v3-and-v2-names.md) | `measureV3` and the v2 functions under their v2 names (no switch yet) | MP09c | Medium | Engine | M5 | 16 |
| [x] | MP09d2 | [MP09d2](MP09d2-activate-v3.md) | Activate v3: `rate` and `MODEL`, the pinned tests, D21-V3, GF-P2 and GA-P2 | MP09d1 | Large + gates | Engine | M5 | 17 |
| [x] | MP09e | [MP09e](MP09e-code-format-evidence.md) | GC-P2 format evidence: the 676-cell code sizes and the duplicate-shape browser check | MP09d2 | Small–Medium + gate | QA | M5 | 18 |
| [x] | MP10a | [MP10a](MP10a-auxiliary-requests.md) | Auxiliary request method on the generation client and the Player's pool | MP09e | Medium | Browser integration | M6 display rating | 19 |
| [x] | MP10b1 | [MP10b1](MP10b1-display-rating-player.md) | Derived display rating: the shared rules and the Player | MP10a | Large | Apps | M6 | 20 |
| [ ] | MP10b2 | [MP10b2](MP10b2-display-rating-generator-and-pages.md) | Derived display rating in the Generator; the browser pages and gate GC-P2 (display) | MP10b1 | Medium–Large + gate | Apps | M6 | 21 |
| [ ] | MP11 | [MP11](MP11-calibration-tooling.md) | Calibration tooling for v3 and the slow v3 test | MP10b2 | Medium | Tools | M7 calibrated and locked | 22 |
| [ ] | MP12a | [MP12a](MP12a-calibration-slice.md) | Calibration slice: the GV2 cases again with v3, and the knob changes | MP11 | Medium + machine time | Measurement | M7 | 23 |
| [ ] | MP12b1 | [MP12b1](MP12b1-full-landscape.md) | Full landscape with v3 (gate GL-P3, full part) | MP12a | Small–Medium + machine time | Measurement | M7 | 24 |
| [ ] | MP12b2 | [MP12b2](MP12b2-search-evidence-and-lock.md) | Search evidence (gate GS-P3), the Hell report, the owner's questions and the lock | MP12b1 | Medium + machine time | Measurement | M7 | 25 |
| [ ] | MP13a | [MP13a](MP13a-provenance-engine.md) | Provenance in the engine and in packs | MP12b2 (the lock) | Medium–Large | Engine | M8 provenance and recorders | 26 |
| [ ] | MP13b | [MP13b](MP13b-provenance-apps-and-fixture.md) | Provenance in the client, the Generator and the CLI; the replay fixture (GF-P4) | MP13a | Medium + gate | Apps and tools | M8 | 27 |
| [ ] | MP14a | [MP14a](MP14a-detail-channel-and-clue-recorders.md) | Rating detail channel, clue-stage recorders and the replay of skips | MP13b | Medium–Large | Engine | M8 | 28 |
| [ ] | MP14b | [MP14b](MP14b-set-and-layout-recorders.md) | Set and layout recorders; recorder identity | MP14a | Medium | Engine | M8 | 29 |
| [ ] | MP15a1 | [MP15a1](MP15a1-replay-runs.md) | Replay runs: preflight, the stage runs, the work meter, the bounds and the final comparison | MP14b | Large | Engine | M9 Generation Steps | 30 |
| [ ] | MP15a2 | [MP15a2](MP15a2-replay-steps.md) | Replay steps: the step table, the score data, the final step and the byte bound | MP15a1 | Medium | Engine | M9 | 31 |
| [ ] | MP15b | [MP15b](MP15b-replay-worker-task.md) | Replay worker task, protocol and client | MP15a2 | Medium | Browser integration | M9 | 32 |
| [ ] | MP16a | [MP16a](MP16a-replay-dialog.md) | Generation Steps dialog: model, dialog, board highlight and score table | MP15b | Large | Generator UI | M9 | 33 |
| [ ] | MP16b | [MP16b](MP16b-dialog-wiring-and-documents.md) | Generation Steps: card button, wiring, browser page (GB-P4) and documents | MP16a | Medium + gate | Generator UI | M9 | 34 |
| [ ] | MP17 | [MP17](MP17-final-evidence.md) | Final compatibility and regression evidence, release notes (gate GZ) | MP16b | Medium + machine time | QA and release | M10 verified | 35 |

Sizes: Small about 100–300 changed lines; Medium about 300–800; Large about 800–1,600 (tests and documents included,
generated data excluded). "Machine time" marks a gate of up to several hours of shards (§7), which comes on top of the
developer's working time. Each dispatched part is sized for about 20–60 minutes of developer-agent time; report §6.2
gives the agent hours per report task (75–117 in total, a generous upper estimate).

Report tasks and dispatched parts: MP02 = MP02a + MP02b; MP06 = MP06a + MP06b + MP06c; MP09 = MP09a1 + MP09a2 + MP09b +
MP09c + MP09d1 + MP09d2 + MP09e (the report's MP09a is MP09a1 + MP09a2; D25); MP10 = MP10a + MP10b1 + MP10b2 (the
report's MP10b is MP10b1 + MP10b2; D27); MP12 = MP12a + MP12b1 + MP12b2 (the report's MP12b is MP12b1 + MP12b2,
split after cross-review SP16); MP13 = MP13a + MP13b; MP14 = MP14a + MP14b; MP15 = MP15a1 + MP15a2 + MP15b (the
report's MP15a is MP15a1 + MP15a2, split after cross-review SP08-SP10); MP16 = MP16a + MP16b. The other tasks are
dispatched whole. The quotient task MP04b of earlier drafts is dropped: a set with two pieces of the same shape is
refused (RES-34).

## 2. Ready waves

All 35 waves are sequential: one task at a time in this repository.

| Wave | Task | Why it cannot share a wave |
|---:|---|---|
| 1 | MP01 | changes the `Model` that MP02a reads; edits `docs/design-detail.md` |
| 2 | MP02a | creates `core/engine/deduce.js`, `tests/deduce.test.js` and `DEDUCE`, which every later solver task edits |
| 3 | MP02b | edits `deduce.js`, `tests/deduce.test.js` and design §7.9 |
| 4 | MP03 | the same files, plus the new `tests/deduce-rules.test.js` |
| 5 | MP04 | the same files |
| 6 | MP05 | `deduce.js` and design §7.9; the new `tests/deduce-census.test.js` |
| 7 | MP06a | `deduce.js` (`tieOrder`); the probe tool reads the finished solver |
| 8 | MP06b | runs the probe and GV2 on the integrated solver; sets `DEDUCE`; design §7.9 values |
| 9 | MP06c | reads MP06b's probe lines; writes the fit record that MP08 reads |
| 10 | MP07 | `clues.js`, `version.js`, the generation fixtures (GF-P1, GA-P1), which later tasks pin |
| 11 | MP08 | `difficulty.js`, `policy.js`, `types.js`, `tests/policy.test.js`; one carried pin in `tests/deduce-rules.test.js` |
| 12 | MP09a1 | `pack.js`, the code modules, the Player, both apps' locales, the brief and the guides |
| 13 | MP09a2 | `generator/state.js`, `generator/app.js`, the Generator locales, the brief and the guides |
| 14 | MP09b | `pack.js`, the code modules and their tests, the brief |
| 15 | MP09c | `difficulty.js`, `clues.js`, `tasks.js` and their tests |
| 16 | MP09d1 | `difficulty.js`, `tests/difficulty.test.js`, `tests/protocol.test.js`, design §7.10 |
| 17 | MP09d2 | `difficulty.js`, every pinned rating test and fixture (GF-P2, GA-P2) |
| 18 | MP09e | the code-size record and the browser page `tests/browser/puzzle-code-acceptance.js` (GC-P2 format) |
| 19 | MP10a | `core/browser/auxiliary.js` (new), `generation-client.js`, `player/state.js` and their tests |
| 20 | MP10b1 | `core/browser/display-rating.js` (new), the print texts, the Player's state and views, the user guides |
| 21 | MP10b2 | the Generator's state, jobs and cards; the browser pages (GC-P2 display); the user guides |
| 22 | MP11 | `tools/bench/*`, the calibration tests, the slow test |
| 23 | MP12a | knob values; the GL-P3 slice |
| 24 | MP12b1 | the full landscape (GL-P3, full part) under `docs/difficulty-v3/landscape-v3-full/` |
| 25 | MP12b2 | the search evidence (GS-P3), the Hell report and the owner's questions, the fixtures again only in an ordered change round, and the lock |
| 26 | MP13a | after the lock: `clues.js`, `generate.js`, `types.js`, `pack.js` (provenance) |
| 27 | MP13b | the client, the Generator's state and jobs, `tools/record-fixtures.mjs` (GF-P4) |
| 28 | MP14a | `difficulty.js`, `clues.js`, `types.js` (detail channel, clue recorders, skip replay) |
| 29 | MP14b | `generate.js`, `carve.js`, `tiling.js`, `types.js` (set and layout recorders) |
| 30 | MP15a1 | `replay.js` (new: the runs), `policy.js` (`REPLAY`), `tools/bench/report.js`, `tests/replay.test.js` (new) |
| 31 | MP15a2 | `replay.js` (the steps), `tests/replay.test.js` |
| 32 | MP15b | `protocol.js`, `tasks.js`, the client |
| 33 | MP16a | the dialog modules, `svg-board.js`, the Generator's locales and styles |
| 34 | MP16b | the card, `generator/app.js`, `generator/state.js`, the browser page (GB-P4), the documents |
| 35 | MP17 | the final record; every gate run again (GZ) |

The living documents (`docs/design-brief.md`, `docs/design-detail.md`, `README.md`, the user and developer guides in
both languages) have one writer at a time, which the sequential order guarantees. A dependency means an accepted and
committed task, not a file that appeared in the tree. The chain runs in parallel with the Sudoku chain; their gate
runs never overlap (§7).

### Exclusive ownership

| Task | Owns (creates or edits) | Must not edit |
|---|---|---|
| MP01 | `core/engine/tiling.js` (`Model` typedef, `buildModel`, exported `assertLive`), `core/engine/workspace.js` (header comment only), `tests/tiling.test.js`; docs: `docs/design-detail.md` §4.2 (`workspace.js` and `tiling.js` blocks) | `placements.js`, `dlx.js`, every output; other tests |
| MP02a | `core/engine/deduce.js` (new), `core/engine/policy.js` (`DEDUCE` only), `tests/deduce.test.js` (new), `tests/policy.test.js` (the `DEDUCE` pin only), `tools/bench/report.js` (one `SOURCE_FILES` entry); docs: `docs/design-detail.md` §3.1 (engine list), §4.2 (`policy.js` block, new `deduce.js` block), new §7.9 | `tiling.js`, `difficulty.js`, `clues.js`, every generation and rating path |
| MP02b | `core/engine/deduce.js`, `tests/deduce.test.js`; docs: design §7.9 | `policy.js` and everything MP02a must not edit |
| MP03 | `core/engine/deduce.js`, `tests/deduce.test.js` (re-pinned values only), `tests/deduce-rules.test.js` (new); docs: design §7.9 | as MP02b |
| MP04 | `core/engine/deduce.js`, `tests/deduce.test.js` (re-pinned values only), `tests/deduce-rules.test.js`; docs: design §7.9 | as MP02b |
| MP05 | `core/engine/deduce.js`, `tests/deduce.test.js` and `tests/deduce-rules.test.js` (re-pinned values only), `tests/deduce-census.test.js` (new); docs: design §7.9 | as MP02b |
| MP06a | `tools/rate-probe.mjs` (new), `tests/rate-probe.test.js` (new), `core/engine/deduce.js` (`tieOrder` only), `tests/deduce.test.js` (one `tieOrder` case); docs: `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | `policy.js`; records |
| MP06b | `DEDUCE` values in `core/engine/policy.js` and their pin in `tests/policy.test.js`, `docs/difficulty-v3/probe-<date>.md`, `docs/difficulty-v3/baseline-v2/` and `docs/difficulty-v3/probe-corpus-2026-11-12/` (new: captured packs, `manifest.json`, `final.jsonl`; Amendment A1); docs: design §7.9 (the `DEDUCE` values) | engine code other than the values; the guides |
| MP06c | `docs/difficulty-v3/fit-<date>.md` (new); scratch under `tests/artifacts/MP06c/` | every other file |
| MP07 | `core/engine/clues.js`, `core/engine/version.js`, `tests/clues.test.js`, `tests/cli.test.js` and `tests/player-load.test.js` (one listed change each), `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` (by the tool); docs: design §5.4, §5.5, §6.10, §6.11, §7.6, §13.2, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md` (one sentence) | `difficulty.js`, `deduce.js`, `generate.js`, `tools/record-fixtures.mjs`, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json` (D20) |
| MP08 | `core/engine/difficulty.js` (new exports only), `SCORE_V3` in `core/engine/policy.js`, `core/engine/types.js`, `tools/rate-probe.mjs` (`scoreWithKnobs` only), `tests/difficulty-v3.test.js` (new), `tests/policy.test.js`, `tests/deduce-rules.test.js` (one added test: the R8 other-pockets pin carried from the MP04 review; no existing test edited) | every caller of `rate`; `core/engine/deduce.js` |
| MP09a1 | `core/engine/pack.js` (duplicate-shape check), `core/engine/types.js` (`Issue.params`), `core/engine/puzzlecode.js`, `core/engine/puzzlecode-v1.js` (error mapping only), `core/engine/puzzlecode-input.js`, `core/browser/puzzle-code-client.js`, `core/browser/puzzle-code-dialog.js`, `player/strings.js`, `player/locale.*.js`, `generator/locale.*.js` (`code.error.duplicateShape` only), their tests (the twin-set migrations of FP02 included); docs: design §5.3, §9.8, `docs/design-brief.md` (sharing), the user guides | rating code; `generator/state.js` |
| MP09a2 | `generator/state.js` (`restoreState`, `duplicateShapeRefusal`, `saveRestoreCleanup`), `generator/app.js` (one call), `generator/locale.*.js` (the notice keys), `tests/generator-state.test.js`; docs: design §10.7, `docs/design-brief.md` (Generator), the user guides | engine files |
| MP09b | `core/engine/pack.js` (v3 claims, `censored`, `Gproved` checks, v2 legacy reader and writer), `core/engine/puzzlecode.js` (summary claims), `tests/pack.test.js`, `tests/puzzlecode.test.js`; docs: design §5.2, §5.3, §9.8, `docs/design-brief.md` (the puzzle-code paragraph) | `difficulty.js` |
| MP09c | `core/engine/difficulty.js` (`IncompleteRatingError` only), `core/engine/clues.js` (RES-04 and RES-35 handling; the stall counter counts rated candidates, D21 counting rule), `core/engine/tasks.js` (`rating-incomplete`), `tests/clues.test.js` and `tests/tasks.test.js` (new cases); docs: design §4.2, §6.10, §6.11, §7.6, §8.1, §13.2 | fixtures; `rate`; `deduce.js`; the value of `STALL_LIMIT` |
| MP09d1 | `core/engine/difficulty.js` (`measureV3`, the v2 names), `tools/rate-probe.mjs` (`v2` field), `tests/difficulty.test.js`, `tests/puzzlecode.test.js` (line 9), `tests/protocol.test.js` (new cases); docs: design §4.2, §7.9, §7.10, §13.2 | fixtures; `MODEL`; `tools/record-fixtures.mjs` |
| MP09d2 | `core/engine/difficulty.js` (`MODEL`, `rate`), `tools/record-fixtures.mjs` (`verifySample`), the pinned tests of its table (`tests/difficulty.test.js`, `tests/difficulty-v3.test.js`, `tests/clues.test.js`, `tests/fixtures/clue-recipes.js` comment, `tests/generate.test.js`, `tests/worker-pool.test.js`, `tests/puzzlecode-cli.test.js`, `tests/pack.test.js` (line 576 only), `tests/rate-probe.test.js` (the first pack-mode test only), `tests/fixtures/ui-flow-recipes.json`), the generation fixtures by the tool; D36 (P-OD5): the replaced recipe (`name`, `levelId`) and the two slow tests of `tests/clues.test.js` in place of MP07's 15 x 20 Hell 2 test; the D21-V3 and D36 evidence (new: `docs/difficulty-v3/d21-v3-<date>/` with `nostall.mjs`, `stall16.mjs`, `split.mjs`, `rerun.mjs`, `certify.mjs`, `spent.mjs`, `avail.mjs`, `summarise.mjs` and the captures, and `docs/difficulty-v3/d21-v3-<date>.md`); only when D21-V3 raises it: the `STALL_LIMIT` line of `core/engine/clues.js` and the listed stall-test values; docs: design §1-§7 (§7.5 the interim Hell sentence) and §13.2 as listed, `docs/design-brief.md`, the user and developer guides | `deduce.js`, `clues.js` (except that line), `pack.js`, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`, `docs/difficulty-v3/d21-2026-11-12/`; the Hell levels' areas, caps and offerings |
| MP09e | `docs/difficulty-v3/codes-<date>.md` (new), `tests/browser/puzzle-code-acceptance.js` (the duplicate-shape check); scratch under `tests/artifacts/MP09e/` | engine and app code |
| MP10a | `core/browser/auxiliary.js` (new), `core/browser/generation-client.js`, `player/state.js` (the queue and `submitAuxiliary`), `tests/auxiliary.test.js` (new), `tests/generation-client.test.js` and `tests/player-load.test.js` (new cases), `tools/bench/report.js` (one `SOURCE_FILES` entry, `core/browser/auxiliary.js`; TP18); docs: design §8.1, the developer guides' code layout if it lists the browser modules | `core/browser/worker-pool.js`, the apps' UI and locale files, engine files |
| MP10b1 | `core/browser/display-rating.js` (new), `core/browser/print-texts.js` (the note texts), `core/browser/print-dialog.js` (`puzzleDetails` notes), `player/state.js`, `player/app.js`, `player/ui/rating-dom.js`, `player/ui/puzzle-list.js`, `tests/display-rating.test.js` (new), `tests/player-load.test.js`, `tests/print-details.test.js`; docs: design §7.7 and the Player sections of §11, `docs/design-brief.md` (the Player sentence), the user guides' Player part | the Generator, the browser pages, engine files, `core/browser/auxiliary.js` |
| MP10b2 | `generator/state.js` (`displayRatings`), `generator/jobs.js` (the scheduler), `generator/ui/puzzle-panel.js` (cards and print captions), `generator/app.js` (only if the client must be passed on), `tests/generator-import.test.js`, `tests/generator-state.test.js`, the six browser pages of its table; scratch under `tests/artifacts/MP10b2/`; docs: design §10, `docs/design-brief.md` (levels), the user guides' Generator part | the Player, `core/browser/display-rating.js`, the texts, engine files, other pages |
| MP11 | `tools/bench/runner.js`, `tools/bench/report.js`, `tools/bench/calibration-reference.js`, `tests/calibration.test.js`, `tests/benchmark-report.test.js`, `tests/difficulty-v3.test.js` (slow part) | `policy.js` |
| MP12a | knob values in `core/engine/policy.js` (`SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID`) and `SHARES` in `core/engine/levels.js` (only when changed), the knob-dependent pins (`tests/policy.test.js`, `tests/difficulty-v3.test.js`, the clue tests MP09d2 lists, `tests/fixtures/ui-flow-recipes.json`), the generation fixtures by the tool, `docs/difficulty-v3/landscape-v3/`, `docs/difficulty-v3/calibration-slice-<date>.md` (new) | algorithm code, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json` |
| MP12b1 | `docs/difficulty-v3/landscape-v3-full/` (new: the shard reports, `shards-<date>.md`, `aggregate-<date>.json` and `.md`); scratch under `tests/artifacts/MP12b1/`; no documentation slot | code, tests, fixtures, MP12a's record and folders, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json` |
| MP12b2 | `docs/difficulty-v3/search-<date>/` (new: `observe.mjs`, `summary.mjs`, the GS-P3 captures, `runs.md`, `summary.md`, `stall-simulate.md`), `docs/difficulty-v3/calibration-<date>.md` (new); knob values, `STALL_LIMIT`, re-pins and fixtures only in an ordered change round; scratch under `tests/artifacts/MP12b2/`; docs: design §7.8 (the lock), §7.5 (the Hell sentence), `docs/design-brief.md` (one sentence, only by its rule) | algorithm code outside a change round, MP12a's and MP12b1's records and folders, MP09d2's folder, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json` |
| MP13a | `core/engine/clues.js` (skip ordinals, `SKIP_BOUNDS`, `skips` on results), `core/engine/generate.js` (`made` on candidates, `provenanceVersions`, `capSkips`), `core/engine/types.js` (provenance types), `core/engine/pack.js` (`PROVENANCE`, `provenanceProblem`, `readProvenance`, the writer fallback), `tests/clues.test.js`, `tests/generate.test.js`, `tests/pack.test.js`; docs: design §5.2, §5.5, §6.10, `docs/design-brief.md` (one sentence, "Limits, waiting, and sharing"; SP07) | `core/browser/`, `generator/`, `player/`, `tools/`, the fixtures |
| MP13b | `core/browser/generation-client.js`, `tools/generate.mjs` (one line), `generator/state.js`, `generator/jobs.js`, `tools/record-fixtures.mjs` (`--replay-case`), `tests/fixtures/replay-case.json` (new, by gate GF-P4), `tests/generation-client.test.js`, `tests/cli.test.js`, `tests/generator-state.test.js`, `tests/generator-controller.test.js`, `tests/generate.test.js`; docs: design §5.5, §10.5, §13 (fixtures), `docs/design-brief.md` (one sentence, "Generator: make a challenge"; SP07) | `core/engine/`, `player/`, the UI modules, the other fixtures |
| MP14a | `core/engine/difficulty.js` (`rateDetailed`), `core/engine/clues.js` (`record`, `recordSource`, `replaySkips`, `SkipReplayError`, the events, the `hooks` `{ onAdd, onCount }` of `makeUnique`, the work meter `SelectContext.charge`), `core/engine/tiling.js` (only `countSolutions` returns `rowTrials`; cross-review SP09), `core/engine/types.js` (`RatingDetail`, `ClueEvent`), `tests/replay-recorders.test.js` (new), `tests/difficulty.test.js`, `tests/tiling.test.js` (case 16); docs: design §6.10, §7.9 | `generate.js`, `carve.js`, the rest of `tiling.js` (MP14b's) |
| MP14b | `core/engine/generate.js` (the recorders and `Observe.charge` on every `selectClues` call, the hidden calibration included), `core/engine/carve.js`, `core/engine/tiling.js` (`lnsWalk`; after MP14a), `core/engine/types.js` (set and layout events), `tests/replay-recorders.test.js`; docs: design §6.5, §6.7 | `clues.js`, `difficulty.js` (MP14a's) |
| MP15a1 | `core/engine/replay.js` (new: `ReplayCancelledError`, `runReplay`, the typedefs), `REPLAY` in `core/engine/policy.js`, `tests/policy.test.js` (the `REPLAY` pin), `tools/bench/report.js` (one `SOURCE_FILES` entry), `tests/replay.test.js` (new); docs: design §6.12 (new, first part), §4.2, §13.2 | every other engine file |
| MP15a2 | `core/engine/replay.js` (`replayPuzzle`, `Step`, `ReplayResult`, the step builders, `finalStep`, `breakdownOf`), `tests/replay.test.js` (its cases; MP15a1's unchanged); docs: design §6.12 (the steps part), §4.2, §13.2 | every other engine file; `policy.js` |
| MP15b | `core/engine/protocol.js`, `core/engine/tasks.js` (the `replayPuzzle` kind), `core/browser/generation-client.js` (`replayPuzzle` on the auxiliary path), `tests/protocol.test.js`, `tests/tasks.test.js`, `tests/generation-client.test.js`; docs: design §8.1 | the apps |
| MP16a | `generator/ui/replay-model.js` (new), `generator/ui/replay-dialog.js` (new), `core/browser/svg-board.js` (`highlightedIds`), the Generator's locales (the D34 keys), `generator/generator.css`, `tests/replay-model.test.js` (new); docs: design §6.12 (views and table), §11.11 | `generator/app.js`, `generator/ui/puzzle-panel.js` (MP16b's) |
| MP16b | `generator/ui/puzzle-panel.js`, `generator/app.js`, `generator/state.js` (`replaySourceOf`), fixes of the dialog modules proven by the page, `generator/generator.css` (`.card-replay` only), `tests/generator-state.test.js`, `tests/browser/replay.html` and `tests/browser/replay.js` (new), `tests/browser/rendering.js`; scratch under `tests/artifacts/MP16b/`; docs: design §10.5, `docs/design-brief.md`, the user and developer guides, `README.md` | the engine, the replay, the client, the protocol, the Player |
| MP17 | `docs/difficulty-v3/final-<date>.md` (new, with the release notes); justified corrections of documents and tests only (MP17's rule, D35); scratch under `tests/artifacts/MP17/` | `core/`, `tools/`, `generator/`, `player/`, `tests/fixtures/` |

The detailed file lists of each task refine this table. A file that is not listed needs the orchestrator's approval
before a developer edits it.

### Per-task protocol and commits

1. Step 0 (orchestrator, once): verify that `rating-v3` is checked out at `e73712f`, and commit the acceptance revision
   of `docs/difficulty-v3/report-detailed.md` and `docs/difficulty-v3/report-brief.md` together with this pack
   `tasks/difficulty-v3/` (message `difficulty-v3: accepted report and task pack`). Nothing is pushed.
2. The orchestrator launches the developer of the next task with the task file and this check-list. A task that owns a
   gate (§7) runs its gate only when the Sudoku repository runs no gate, landscape or timing run.
3. The developer implements, runs the commands of the task and replies with the evidence of §8. It never stages,
   commits, stashes, resets, pushes or switches branches, and never edits this pack, an Execution log,
   `docs/difficulty-v3/plan.md`, `clarifications.md`, the two reports or the analysts' folders.
4. The orchestrator re-runs `npm run test:quick` and `npm run check` on the tree (never while another run uses this
   checkout), reviews the diff against the task's acceptance tables, fills the task's Execution log and the summary
   table below, and commits **once per accepted task** on `rating-v3`, with only that task's files and its log update.
   Message: `difficulty-v3 MPnn: <title>`, with the part suffix where there is one (for example
   `difficulty-v3 MP02a: Deduction core`). Nothing is pushed. For a gate task the orchestrator reviews the recorded
   gate evidence instead of repeating a run of hours.
5. A rejected task goes back to its developer (or to a new one with the review notes); a defect found by a later task
   goes back to the owner of the file as a fix round recorded in both logs. A later task never changes an earlier
   task's pinned value to make its own test pass, unless its task file lists that value as an intended contract change
   (§4.2 D8).

## 3. Shared working conventions

These are the repository's own rules (`AGENTS.md`, `DEVELOPERGUIDE.md` "Develop and test" and "How to contribute") and
the report's RES-01.

- **Modules.** Native ES modules with JSDoc types and `// @ts-check` on the first line; no build step and no
  dependency (Node 22 or newer; this machine has Node 26). Modules loaded by a page or a worker use `.js`; Node-only
  tools use `.mjs`. 2-space indent, single quotes and semicolons, as the surrounding code.
- **Engine purity.** `core/engine/*.js` has no DOM, storage, clock, network or randomness other than an injected `Rng`.
  A rating is a pure function of board, pieces, clues and the model constants; `measureDeduction` uses no RNG.
- **Engine guards** (tests fail otherwise): every `core/engine/*.js` file is listed in `SOURCE_FILES` of
  `tools/bench/report.js` (`tests/benchmark-report.test.js:281-283`); no engine file other than `policy.js` and
  `qualification.js` contains the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive` or `deriveLimits`, not even in a
  comment (`tests/bq-limits.test.js:116-122`).
- **Determinism.** No result depends on piece ids, colours, input order or the number of workers; maps and sets are
  iterated in a defined order.
- **Strings.** Every visible text has a key in both packs (`generator/locale.en.js` and `generator/locale.vi.js`,
  `player/locale.en.js` and `player/locale.vi.js`; printing texts in `core/browser/print-texts.js`), with the same keys
  and `{placeholders}` (the i18n tests check it), in natural Vietnamese.
- **Living documents in the same task.** When behaviour, storage, URLs or the UI change, the task updates
  `docs/design-brief.md` and `docs/design-detail.md`, and the user guide (`USERGUIDE.md`, `USERGUIDE.vn.md`) or the
  developer guide (`DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`) it belongs to, in English and Vietnamese, in the same
  task. `README.md` stays a short English overview. No absolute path in any document.
- **History stays as written.** Never edit `docs/init-design/`, `docs/calibration/`, `docs/regenerate-puzzle/`,
  `tasks/init-design/`, `tasks/regenerate-puzzle/`, `docs/difficulty-v3/plan.md`, `clarifications.md`, the reports or
  the analysts' folders. A task writes only the new dated records its task file names under `docs/difficulty-v3/`
  (for example `probe-<date>.md`), once; a correction is a new file. The calibration runner's `--output` always points
  under `docs/difficulty-v3/`, never under `docs/calibration/`.
- **Tests.** While working, run the task's own test files with `node --test --test-skip-pattern=slow <files>` (a named
  file still runs its `slow:` tests unless they are skipped; they belong to the gate that runs `npm test`; cross-review
  FP06); at the end run `npm run test:quick` and then `npm run check` from the repository root. Run `npm test`,
  `tools/calibrate.mjs`, `tools/record-fixtures.mjs`, the probe at scale or a browser page **only** in the task that
  owns that gate (§7). Every test run finishes within 10 minutes and every browser check within 1 minute (`AGENTS.md`):
  a longer run has an error; cancel it and investigate. Never two runs at once in this checkout (they share
  `tests/artifacts/`). Never weaken, skip, delete or rewrite a test to make a run pass; an edit of an existing test that
  the task lists as an intended contract change is allowed; any other failing test is reported.
- **Files on disk.** UTF-8 without BOM, CRLF line endings, a final newline, no trailing whitespace, no tab
  indentation. Git has `core.autocrlf=true` and `core.safecrlf=true`: a file with mixed endings cannot be staged. Files
  written by tools (fixtures, records) are normalised to CRLF before the hand-off. Check a file with
  `node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');console.log(/[^\r]\n/.test(t)?'LF found':'CRLF only')" <file>`.
- **Native command failures.** In PowerShell a failed `node` or `npm` does not stop the next command: check
  `$LASTEXITCODE` after each one and stop on a nonzero value.
- **Processes and scratch.** Stop only processes the task started, by PID. No scratch file in the repository: run
  artefacts go under `tests/artifacts/<task id>/` (git-ignored), never into an OS temporary folder. Install nothing.

## 4. Decisions taken for this pack

### 4.1 Design decisions (all answered; report §1 and §8)

| Question | Decision | By | RES | Parts |
|---|---|---|---|---|
| SA1-Q-P1 | decisive guesses; an unfinished census publishes a labelled upper estimate; the few/many penalty stays | owner | RES-05 | MP05, MP06b, MP08, MP10b1, MP10b2, MP16a |
| SA2-Q-P02 | a capped path is unrateable (`IncompleteRatingError`, reason `path-capped`); no v3 "+"; caps set so that no probe path is capped up to master on boards up to 20x18 | owner | RES-04, RES-10 | MP02a, MP06b, MP09c (handling), MP09d1 (thrown), MP09d2 (rating), MP10b1, MP10b2 |
| SA2-Q-P03 / SA1-Q-P6 | two pieces of the same shape are an error at every entry (`duplicate-shape`); engine functions stay total on direct inputs and count labelled pieces | owner | RES-09, RES-34 | MP02a (labelled counting), MP09a1 (refusal), MP09a2 (saved sets) |
| SA2-Q-P09 | knobs within the ranges, caps, `K60` and `SHARES` may change in P3, every change recorded | owner | RES-25 | MP12a, MP12b1, MP12b2 |
| C1 | `censored: true` on v3 ratings, claims and summary claims exactly when the census is unfinished | owner | RES-05, RES-19, RES-21 to RES-23 | MP09b (claims and codes), MP09d2 (ratings), MP10b1 and MP10b2 (display) |
| C4 | a saved set with two pieces of the same shape is removed with a one-time notice in English and Vietnamese | owner | RES-34 | MP09a2 (notice and startup save) |
| AR1 | metric `Gproved`; a generated Hard-or-above candidate needs `Gproved >= 1` | owner | RES-35 | MP05 (metric), MP06b and MP06c (counts), MP07 (seam), MP09c (rule), MP11, MP14a (event), MP17 |
| SA2-Q-P01 | starting values: base maximum 12, rule term 0 / 2 / 4 (the fit chooses within the JR-P3 ranges) | plan author | RES-18 | MP06c, MP08 |
| SA2-Q-P04, C2 | centre-seeking acceptance as written; the reserve of 16 is the stop point at profile 48; repairs memoised | plan author | RES-15 | MP07 |
| SA2-Q-P05 / SA1-Q-P5 | uniform clue sampling | plan author | RES-16 | MP07 |
| SA2-Q-P06 | one canonical search order | plan author | RES-13 | MP06a, MP06b |
| SA2-Q-P07 / SA1-Q-P3 | summary claims in puzzle codes | plan author | RES-22 | MP09b |
| SA2-Q-P08 / SA1-Q-P2, JR-P1 | derived display rating with a note, for v2 and v1 claims | plan author | RES-23 | MP10b1, MP10b2 |
| SA2-Q-P10 / SA1-Q-P4, JR-P2 | `generation.made` and `generation.setOrigin`; "steps not available for this puzzle" | plan author | RES-27, RES-30, RES-31 | MP13a, MP13b, MP15a1, MP15a2, MP16a, MP16b |
| SA2-Q-P11 | no rule-based Player hints | plan author | RES-33 | - |
| SA2-Q-P12 | R4 and R5 on piece/cell pairs only | plan author | RES-06 | MP03 |
| SA2-Q-P13 | the rule term uses the hardest deduction tier | plan author | RES-08, RES-18 | MP04, MP08 |
| AUTH-P1 | provenance record confirmed; encoding (a), capped integer lists | plan author | RES-27 | MP13a |
| JR-P3 | the knob ranges are experimental ranges, with `rule[2] <= rule[3]` | plan author | RES-18, RES-25 | MP06c (fit), MP08, MP12a |
| JR-P4 | auxiliary request method on the existing client and pool | plan author | RES-23, RES-29 | MP10a, MP15b |
| PROC-P1 | fit before activation, lock before P4, regression after P4 | plan author | RES-14, RES-25 | MP06b, MP06c (initial fit), MP08, MP12b2 (the lock), MP17 |
| C3 | release notes in `docs/difficulty-v3/final-<date>.md`; the guides state the refusal | plan author | RES-32, RES-34 | MP09a1, MP09a2, MP17 |
| C5 | the 5 % rule per level and board cell of the MP06 corpus | plan author | RES-05 | MP06b |
| C6 | no objection | plan author | RES-24, RES-34 | MP09a1 |
| part D 1-14 | accepted (errata E01-E45 of the report) | plan author | report §4 | as listed there |

### 4.2 Implementation decisions of this pack

| # | Decision |
|---|---|
| D1 | The report tasks are dispatched in the parts of §1; their scope, order and gates are unchanged. |
| D2 | MP02a and MP02b output `rules` with all nine keys, nonzero only for the rules implemented so far, and `deductionTier` from those counts; MP03 and MP04 add the remaining rules without changing the result shape. |
| D3 | Until MP05: `census: null`, `first.census: []`, no `Gproved` field, and G, info, Cmax and Dmax are the raw values over every final-path guess node (`info` is the sum of `log2 c`). |
| D4 | Ladder semantics: the rules are tried in the order R1 to R9; the first rule that changes the state ends the pass and the ladder restarts at R1. Each rule scans in ascending column, component or piece order and acts on the first place where it can change the state (details in the task files). |
| D5 | Node cap: before entering a node, if `nodes === limits.nodes` the search stops with `node-cap`, otherwise `nodes += 1`. The root is node 1; `nodes: 0` stops before the root. The reported `nodes` never exceeds the cap. |
| D6 | Work cap: `work > limits.work` stops the search with `work-cap`; checked after the setup, at the start of every ladder pass (that is, after every rule application) and before every child node, so work may exceed the cap by one rule application at most. Tests never pin an exact `work` value. |
| D7 | Signature `measureDeduction(model, limits = DEDUCE, diagnostics = {})`. `limits` has exactly the six fields of `DEDUCE`. `diagnostics` is for tests and the probe only: `verifyUndo` (MP02a) and `tieOrder` (MP06a); production callers pass nothing. RES-12 calls `tieOrder` a limit; it is a diagnostic here so that `limits` keeps the frozen shape of `DEDUCE`. |
| D8 | Characterisation values (the six recipes and the small boards of `tests/deduce.test.js`) are pinned per ladder version: MP02b, MP03, MP04 and MP05 re-pin exactly the values their task file lists, as an intended contract change. No other change of a pinned value is allowed. |
| D9 | `SelectContext.rate` (MP07): an optional test and diagnostics seam with the signature of `rate`; production callers never set it. |
| D10 | "Hard or above" in the RES-35 rule is `target.min >= bandEdge(3)` (= 17), because `SelectContext.target` carries no level index. |
| D11 | The test vectors come from the analysts' reference implementation of the task specification (outside the repository). The specification in the task wins: a disagreement between the specification, a vector and an implementation is reported to the orchestrator with a trace, never settled by silently changing a side. |
| D12 | Every new `core/engine/*.js` file is added to `SOURCE_FILES` in `tools/bench/report.js` by the task that creates it: `deduce.js` (MP02a) and `replay.js` (MP15a1). MP10a also adds `core/browser/auxiliary.js`, which the benchmarked generation client imports (cross-review TP18). |
| D13 | `DEDUCE` is written whole in MP02a, `census` included, and pinned once in `tests/policy.test.js`; MP05 reads `census`; MP06b changes values and the pin with the evidence. |
| D14 | R7 (MP04) is an exact oriented dynamic programme over the candidates of one component: it tracks the area placed inside when `tArea <= slack`, else the area left outside; both orientations give the same answer. Pass 1 checks every component for a contradiction, pass 2 kills, and the first component with a kill ends R7; every check of an application uses the candidates gathered before any kill; with slack 0 a candidate with one option is never tested; when `work > limits.work` before a programme, R7 returns no change. |
| D15 | R8 (MP04) never selects its trial row: the other components are checked by size against the knapsack without one piece of the row's size (memoised per size per application), the breadth-first search runs only inside the row's component with the row's cells stamped as removed, only articulation cells with more than `lookaheadWidth` live rows are tried, and the first cell with a kill ends R8. The other-components check is pinned by MP08's carried test (board R8o with `lookaheadWidth: 0`: R7 12, R8 9; without the check R7 5, R8 5). |
| D16 | R9 (MP04) looks at cells with exactly two supporting pieces, pairs in (a, b) lexicographic order, with the "covers both" test; the first pair with a kill ends R9. |
| D17 | Census totals (MP05): `search.nodes` counts main and census nodes and `search.work` includes the census work; `Gt` counts the main search only; the D5 node cap bounds the main search. In census mode the ladder's work check uses `censusStart + limits.census` and stops only the census; `census: 0` runs no probe (a deterministic budget cut for tests); nothing is replayed when no alternative is undecided. |
| D18 | `tieOrder` t (MP06a) picks, among the n tied minimal-count columns in ascending order, the one at position `t mod n`, in the main search and in the census probes. Until MP08, the probe's `--knobs` uses a local copy of the RES-18 formula (`scoreWithKnobs`); MP08 replaces it with `breakdownV3`. |
| D19 | Caps and the fit (MP06b, MP06c): `work` = the smallest multiple of 10 million that is at least twice the largest main-search work of the corpus, never below 50 million (above 500 million is a finding); `nodes` = the smallest multiple of 10,000 at least twice the largest main-search node count, never below 20,000; `census` by the 5 % rule of C5 trying 20, 40 and 80 million, else 10 million kept and the cells reported. MP06c's grid, constraint, objective and tie-breaks are those written in its task file. Amended by MP06b's Amendment A1 (cross-review FP01, FP05): every probe observation is classified (complete path, capped path, none, error) before its fields are read; the old capped-path share comes from a run under the old `DEDUCE` (`path === 'capped'`), with count cutoffs reported separately; the caps come from complete high-cap observations only (a still-capped path is re-measured once, else reported as an MP06b-B03 failure); after the caps are chosen the whole cap cohort is re-rated under the exact final tuple; the C5 numerator counts complete paths with an unfinished census; every rating run reads packs captured once under `docs/difficulty-v3/probe-corpus-2026-11-12/` with a manifest, and MP06c reads `final.jsonl` joined to the manifest by `(request, puzzleId)`. |
| D20 | The Player sample `player/samples/sample-pack.json` is the source of the frozen v1 puzzle-code goldens (`tests/fixtures/puzzlecode-v1.json`), which stay unchanged (RES-22, part D item 6). It therefore stays byte-for-byte as it is: GF-P1 (MP07) and GF-P2 (MP09d2; MP12a and MP12b2 when they change a knob) re-record only `tests/fixtures/`, and `tests/player-load.test.js` no longer requires the Player sample to equal the generated fixture (MP07). Whether the Player's built-in sample should show v3 puzzles later is an open question for the owner (it needs the goldens' source moved to a frozen copy first). |
| D21 | **Decided 2026-11-12 18:09: option (d), amendment RES-15a "stall stop" in MP07 with `STALL_LIMIT = 12` on raw ratings (plan author's answer in `docs/difficulty-v3/clarifications.md` Part I after the [D21 measurements](../../docs/difficulty-v3/d21-measurements-2026-11-12.md); owner P-OD4). The `square-22x22-hell-3` recipe stays at quantity 10 and must complete 10 of 10; MP09d2 (moved from MP09c by the orchestrator after cross-review SP03: no v3 rater exists before MP09d1/MP09d2) re-runs the D21 simulation on v3 sequences for N = 8, 12 and 16, after the switch and before GF-P2, and may only raise the limit; MP12 reports ratings per puzzle and times per Hell cell.** Original finding F-MP07-1: with centre-seeking, a request whose band centre cannot be reached spends 48 ratings on every puzzle. Under v2 this is the case for Hell 3 on the 22 x 22 UI-flow recipe of `tests/fixtures/ui-flow-recipes.json` (K = 73, so D <= 2 x 72 + 30 = 174 < 180.25, the lower edge of the central half): the analysts' reference run found 9 of 10 puzzles within the time limit (`N-PARTIAL`), so the slow test `tests/generator-controller.test.js` "slow: square-22x22-hell-3" fails and would depend on machine speed. Options: (a) accept the cost and reduce that recipe to `quantity` 3 (`expect.puzzles` 3 and the scores of the run), in MP07 and again where MP09d2 or MP12b re-pin it; MP12 reports hell-level times under v3; (b) the plan author amends RES-15 (for example, first in band when no clue count the set allows can reach the central half) before MP07 is accepted; (c) keep the recipe: rejected, a time-dependent test. Analysts' recommendation: (a). Until decided, a developer who meets it leaves the recipe unchanged and reports the outcome, and the orchestrator holds the commit. The same rule applies to any UI-flow recipe that stops completing in MP09d2 or MP12b. |
| D22 | `rateV2(board, pieces, clues, ws)` (MP09d1) is today's `rate` under its v2 name: it returns exactly today's `difficulty-v2` rating (`model`, `score`, `level`, `saturated`, `metrics` with `U`, `B`, `branchTrials`, `rowTrials`, `stop`, `R`, `H`). Only `verifySample` for a v2 sample (the gen-v2 Player sample, D20), the probe's `v2` field and legacy tests call it; generation and the apps never do. |
| D23 | Tests of the clue-search mechanics that pin v2-specific targets, seeds or scores (listed in MP09d2) inject `rate: rateV2` through the `SelectContext.rate` seam and keep their values. Tests of production behaviour call `rate` (v3) and pin only properties that do not depend on the knobs, or values computed with `breakdownV3` from pinned deduction values, so that a knob change in MP12 re-pins only the tables MP09d2 lists (in MP12a, or in an ordered change round of MP12b2). |
| D24 | Gate GC-P2's format part runs in MP09e, after the activation (MP09d2): the 676-cell code-size record and the duplicate-shape check of `tests/browser/puzzle-code-acceptance.js`. MP09c adds the clue-selection handling of unrateable and unproved candidates before the activation, while `rate` is still v2, so it changes no output. |
| D25 | Parts that keep the quick set green (cross-review answer, `docs/difficulty-v3/claude-opus-5.5/6-response-to-task-pack-review.md`): the report's MP09a is dispatched as MP09a1 (refusal in packs, links, codes, the Player and the Generator's import, with the migration of every quick test that built twin sets) and MP09a2 (the Generator's saved sets: removal, the one-time notice and the startup save of C4 (b)); the activation is dispatched as MP09d1 (`measureV3` and the v2 names, no output change) and MP09d2 (`rate` and `MODEL` in v3, the re-pins and the gates GF-P2 and GA-P2). |
| D26 | Auxiliary requests (MP10a; RES-29, JR-P4 (a)): a new module `core/browser/auxiliary.js` (`createAuxiliaryQueue`) serves the generation client (`submitAuxiliary`) and the Player's store; `core/browser/worker-pool.js` is unchanged. An auxiliary task waits while a main request (generation or verification) is active and never begins or cancels one; it runs under the newest ended request token, else bootstraps an idle-only token; a new main request or its own signal aborts it (`PoolAbortError('cancelled')`); any other abort puts it back in the waiting list unreported; non-abort errors pass through; the kinds are an allow-list (`rate`; MP15b adds `replayPuzzle` for the Generator). It shares the pool's FIFO idle queue with lazy certificates and never cancels or supersedes them; no certificate latency is promised (cross-review SP05). |
| D27 | Derived display rating (MP10b1, MP10b2; RES-23, JR-P1 (a)): the shared rules are in `core/browser/display-rating.js` (MP10b1): only `difficulty-v2` and `difficulty-v1` claims are re-rated; the key is `` `${progressFingerprint}|${MODEL}` ``; a scheduler (`createDisplayRatings`) sends one `rate` request at a time through `submitAuxiliary`, the puzzle on show first, keeps rated and failed entries (at most 1,000), submits again after an abort it did not cause, and marks later wishes unavailable after `worker-unavailable`; a failed or unavailable entry shows the stored claim with "Could not be re-rated", a pending one the claim alone (cross-review SP04); the notes are `rating.note.rerated`, `rating.note.notRerated`, `rating.note.estimate` (count `censusUndecided`) and `rating.note.estimateShort` (summary claims). The Player's card renderer and the Generator's wish builder react to the start-up state and to a reply alone (SP04). MP10b1 does the Player, print and share; MP10b2 the Generator and the browser pages of GC-P2 (display). The stored claim is never changed. |
| D28 | Calibration records (MP11; RES-25, RES-26): accepted puzzles are recorded as `{ clues, U, score, level, saturated, censored, metrics }` (`clues` was `G`; `metrics` is the v3 subset, null for another model) and profile samples gain the v3 fields; readers use `x.clues ?? x.G`, so old records stay readable; each landscape cell gets a `v3` block with `provedZero` (accepted Hard-or-above puzzles with `Gproved === 0`) and the census-estimate share; `ratingCensoredCount` and `sampledUnrateable` are counted. The slow test "slow: v3 generation orders the levels on 10x6 and 12x12, and every Hard-or-above puzzle has a proved guess" is run once by MP11 (§7). |
| D29 | Calibration rounds (MP12a, MP12b1, MP12b2; RES-25, SA2-Q-P09 branch A, P-OD1 to P-OD3): MP12a runs the 18 GV2 cases with v3 in at most three rounds under `docs/difficulty-v3/landscape-v3/r<n>/` with the criteria C1 (levels ordered on the four GV2 boards), C2 (Hard and Expert hit rate at least the GV2 rate minus 10 points), C3 (`provedZero` 0), C4 (at most 5 % census estimates per cell) and C5 (no capped path); a failing criterion chooses the change by MP12a's rules (census 20, 40 or 80 million; caps by D19's rule; knobs re-fitted on MP06c's grid by distance to the current knobs; `SHARES`, or `K60` with a `POLICY_ID` bump; the penalty comparison of P-OD3 in round 0); after round 2 a failing criterion is a finding for the owner. MP12b1 runs the full landscape and aggregates it under `docs/difficulty-v3/landscape-v3-full/`; MP12b2 adds the search evidence (GS-P3), the Hell report and the owner's questions (D36), records everything in `calibration-<date>.md`, changes nothing unless the orchestrator orders a change round, and writes the lock (or hands the lock to MP12b3 when the owner chooses D36 (i)). |
| D30 | Provenance (MP13a, MP13b, MP14a; RES-27, AUTH-P1 (a)): MP13a records skip ordinals (a subset ordinal for each executed `tried.add` of `rateSubset`; a repair ordinal for each executed `finish` in `require` mode, taken at its start; memoised results get none) within `SKIP_BOUNDS` (2,128 subset and 64 repair ordinals, from the loop limits of `clues.js`, pinned against `PROVENANCE`), writes `made` on candidates, and adds `PROVENANCE = { schema: 1, subsetSkips: 64, repairSkips: 16, subsetOrdinals: 2128, repairOrdinals: 64 }`, `provenanceProblem` and `readProvenance` to `pack.js` (an invalid record is removed with the warning `provenance-ignored`) with the writer fallback (drop `made` when the pack would pass the JSON-node or byte limit, else `invalid-json` or `pack-too-large`). MP13b writes `setOrigin` and `made` in the client and the Generator, adds one line to `tools/generate.mjs` and the `--replay-case` mode of `tools/record-fixtures.mjs` (gate GF-P4). MP14a adds `replaySkips`: every recorded skip must be consumed exactly, else `SkipReplayError` (`unreachable` or `unused`). |
| D31 | Repair events (MP14a; the report leaves a repair that adds several clues open): `makeUnique` gains an optional `onAdd`; each added clue emits one `repair` event, and the events of one finish share a `repairSequence`; only the last carries `rating`, `detail` and `accepted`, and `reason` when refused (`not-proved`, `path-capped`, `no-proved-guess`, `out-of-band` or `excluded`); earlier events have `accepted: null`; a successful zero-add finish emits none (its count is charged), and a failed zero-add finish (`makeUnique` fails before adding a clue) emits one failure event (`addedId: null`, `accepted: false`, `reason: 'not-proved'`), shown without a piece name (MP16a; cross-review SP14). |
| D32 | Set and layout recorders (MP14b): `carveFlat` keeps its signature (its callers report the accepted regions); the walk emits `{ stage: 'layout', kind: 'start', start, layout }` (`start` is `'witness'` or `'restart'`) before its moves; `observe` is a parameter of `setAttempt` and `puzzleCandidate`, `record` of `carveMacro`, `carveFlatSet` and `lnsWalk`; with no observer every output is identical. |
| D33 | Replay runs and steps (MP15a1, MP15a2): `Step` gains `detail` (the event's data for the dialog) and `board.placed` items are `{ id, cells, pose }`; the statuses and reasons are those of MP15a1; `REPLAY` (provisional `{ maxSteps: 4096, maxBytes: 4 * 1048576, work: 256 * (DEDUCE.work + DEDUCE.census) }`, measured by MP15a1 and MP15a2 on the replay fixture) bounds the replay only and changes no rating or generated puzzle. |
| D34 | Generation Steps dialog (MP16a, MP16b): the pure module `generator/ui/replay-model.js` (views, the compact filter, step sentences, score-table rows) sits beside `generator/ui/replay-dialog.js`; the locale keys are MP16a's `replay.*` list, in English and Vietnamese; the card's third button and the app wiring are MP16b's. |
| D35 | Final evidence (MP17): the lock commit is the latest commit whose message starts with `difficulty-v3 MP12b` (MP12b2, or MP12b3 when the owner chooses D36 (i)); "no scoring change since the lock" is shown by unchanged `levels.js`, `version.js` and `deduce.js`, a `policy.js` diff that only adds `REPLAY`, the locked values equal to the MP12b2 record (`calibration-<date>.md`), both fixture checks and `npm test`; the plan §6 probe is completed by runs of every offered level on 10x6 and 20x18, whose claims are re-rated and compared; every browser page runs; MP17 corrects only stale document sentences and test names, comments or expectations that follow an accepted task's intended contract, and reports anything else as a defect for the owning task. |
| D36 | **Decided: option (a)** (`docs/difficulty-v3/clarifications.md` Part I, D36, answered by the plan author; owner decision P-OD5 in part H, the owner delegated the answer). Under v3 with the pinned `DEDUCE`, the sets the D21 flow builds for Hell cells on large boards (22x22 Hell 1-3, 15x20 and 18x18 Hell 2, 24x24 Hell 3) are unrateable (26 of 27 probe ratings capped, also at ten times the work cap). v3 is activated as specified; MP09d2 (1) records every Hell failure of the recipe and the slow test (profiles spent, all `path-capped`, time), (2) replaces the recipe `square-22x22-hell-3` and MP07's 15 x 20 Hell 2 slow test by the highest level the same board completes (the recipe keeps quantity 10 and D21's "10 of 10, no `N-PARTIAL`") and adds one slow test pinning an unrateable calibration, (3) runs D21-V3 only on cells that complete under v3 (no Hell sequence from v2; if the stop fires nowhere, 12 stays, "inert on the v3 corpus", and MP12 re-examines the rule), (4) records an availability probe (Hell 1, 2 and 3 on their smallest boards, 164 (13 x 13 with 5 blocked, `deterministicBoard(164)`; TP04), 266 and 450 cells, and a mid-size board, three set attempts each). MP12 puts to the owner, for every (board area, level) v3 cannot make: (i) stop offering it (the plan author's recommendation), (ii) a different contract (reopens SA2-Q-P02 for Hell only), or (iii) a separate engine project; and proposes a fail-fast for set requests whose calibrations are all unrateable, with measured numbers. Rejected: (c) raising the work cap, (d) reopening SA2-Q-P02 now; (b) is not done inside this plan. Interim: the branch offers Hell levels it cannot make until the MP12 decision; nothing is published before MP12 and MP17. |
| D37 | **Decided: option (c)** (`docs/difficulty-v3/clarifications.md` Part I, D37; owner decision P-OD6 in part H; cross-review TP08). The Hell population of GL-P3 (full): 25 of the 105 landscape cases are Hell cases. MP12b1 runs the 3-request prescreen of every Hell case first; then, per Hell level, 20 requests for every case whose prescreen made a puzzle and for the boundary case (the fewest active cells among the level's cases whose prescreen made none; exactly one per level, none when every prescreen made a puzzle); every other Hell case stays at 3 requests, reported "no puzzle observed in 3 requests" and labelled "reduced (D37, P-OD6)" with the boundary case of its level, never "cannot be made" (MP12b1-T04). Expected from MP09d2's record (`d21-v3-2026-11-12.md` §4 and §6): only Hell 1 on the smallest boards can make a puzzle. The aggregate takes one report per case (never a `-s3` report beside the 20-request report of the same case); MP12b2's owner question states the evidence each row rests on (MP12b2-B03). |

## 5. Business traceability

The owner's request, "make Hard really hard", and the decisions of plan §1.3: **N1** a rating reflects how people
solve: forced placements, deductions, real choices; **N2** Hard and above need at least one real choice; **N3**
generated puzzles aim at the centre of the requested band; **N4** the levels are measured and fitted before activation
and locked before Generation Steps; **N5** stored puzzles, claims, links and codes keep working, and a stored claim is
never changed; **N6** the Generator can replay how a puzzle was made (Generation Steps).

| Requirement or decision | Implemented by | Accepted by |
|---|---|---|
| N1 deduction-based measure | MP01 (model views), MP02a (state, R1, R2, guesses), MP02b (R3 check, R6), MP03 (R3 place, R4, R5), MP04 (R7-R9, tiers), MP08 (the carried R8 pin) | MP01-B01, MP02a-B01 to B04, MP02b-B01 to B03, MP03-B01 to B03; MP04; MP08-T07 |
| N1 decisive guesses (SA1-Q-P1) | MP05 | MP05 |
| N2 a real choice for Hard and above (AR1) | MP05 (`Gproved`), MP06c (the `Gproved = 0` counts), MP08 (G = 0 stays below Hard), MP09c (the acceptance rule), MP09d2 (active), MP17 (evidence) | MP05, MP06c-B03, MP08, MP09c-B01, MP09d2-B01, MP17 |
| N3 centre-seeking clues | MP07 | MP07 |
| N3 the stall stop RES-15a (D21, P-OD4) | MP07 (the rule, `STALL_LIMIT = 12`), MP09c (spent profiles neither advance nor reset the counter), MP09d2 (gate D21-V3: the limit checked on v3 sequences, kept or raised to 16), MP12a and MP12b2 (the limit in force, the Hell cells reported, the rule re-examined when MP09d2 found it inert) | MP07; MP09c-B02, MP09c-T08; MP09d2-B04, MP09d2-T07; MP12a, MP12b2 |
| Hell levels under v3 (D36, decided (a), P-OD5; D37, decided (c), P-OD6) | MP09d2 (records every Hell failure, replaces the recipe and the slow test by the highest level that completes 10 of 10, keeps one unrateable-calibration test, runs the availability probe), MP09e (the fewest-clue sample follows the D36 skip rule), MP12a, MP12b1 (availability per board and level: the Hell prescreen, then 20 requests where a puzzle is made and for the boundary case of each Hell level (P-OD6); "no puzzle observed in N requests") and MP12b2 (the owner question (i), (ii) or (iii) per cell without a puzzle, with the evidence it rests on; the fail-fast proposal) | MP09d2-B05, MP09d2-T09; MP09e-T02; MP12a; MP12b1-B01, MP12b1-T01, MP12b1-T02, MP12b1-T04; MP12b2-B03 |
| N4 measured fit and lock (PROC-P1, JR-P3, SA2-Q-P09) | MP06a, MP06b, MP06c, MP08, MP11, MP12a, MP12b1, MP12b2 | MP06b, MP06c-B01 to B03, MP12b1, MP12b2 |
| N5 compatibility; two pieces of the same shape refused (SA2-Q-P03 / SA1-Q-P6, C1, C4, C6) | MP02a to MP06c and MP08 change no output, and MP07 changes generated puzzles only through its versioned gates GF-P1 and GA-P1 (§6); MP09a1, MP09a2, MP09b, MP09c, MP09d1, MP09d2, MP09e, MP10b1, MP10b2 | MP01-B02, MP02a-B05, MP02b-B04, MP03-B04; MP09a1-B01 to MP10b2; MP17 |
| N6 Generation Steps (SA2-Q-P10, AUTH-P1, JR-P2, JR-P4) | MP13a to MP16b | MP13b, MP15a1, MP15a2, MP16b |
| Unrateable capped paths (SA2-Q-P02) | MP02a (the `capped` status), MP06b (caps), MP09c (handling), MP09d1 (thrown by `measureV3`), MP09d2 (by `rate`), MP10b1 and MP10b2 (display) | MP02a-T05; MP06b-B03, MP09c-B02, MP09d2-B02, MP10b1 |
| Final evidence and release notes (PROC-P1, C3 (a), AR1) | MP17 | MP17-B01 to MP17-B05 |

## 6. Technical acceptance (every task)

- The task's own commands pass, then `npm run test:quick` and `npm run check` from the repository root.
- Engine purity and the engine guards of §3 hold; `tests/benchmark-report.test.js` and `tests/bq-limits.test.js` pass.
- Before MP09d2 no rating or generation output changes, except MP07's own versioned change with its gates GF-P1 and
  GA-P1: MP01 to MP06c add non-production code, values and records, MP09c adds handling that no v2 rating reaches,
  MP09d1 adds `measureV3` beside the v2 rating, and nothing in generation or rating calls `measureDeduction` before
  MP09d2.
- After the lock (end of MP12b2, or of MP12b3 when the owner chooses D36 (i)) no rating or generated puzzle changes
  (MP13a to MP17).
- Determinism: two runs give equal results; worker counts 1 and 4 give the same packs where a test covers it.
- The living documents and guides are in step, in both languages; UTF-8 without BOM, CRLF, no trailing whitespace, no
  absolute path in a document.
- No heavy run outside the owned gate; no historical file edited; no test weakened.

## 7. Gates (pre-approved; run by the owning task)

Commands run from the repository root in PowerShell, attached and monitored, checking `$LASTEXITCODE` after each. A
gate task names its gate run (commands, shards, expected duration) in its plan before starting it; the orchestrator
dispatches gate tasks only while the Sudoku repository runs no gate, landscape or timing run, so that timing-sensitive
runs of the two repositories never overlap. Long runs are split into shards of at most 10 minutes (calibration shards
selected with `--cases`); the task records the command, start, end, duration and result of each shard.

| Gate | Task | Command or check | Record |
|---|---|---|---|
| routine | every task | `npm run test:quick`; `npm run check` | counts, failures, duration (in the reply) |
| GV2 | MP06b (runs, caps, census), MP06c (fit; reads the records only) | `node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "<regex>" --output docs\difficulty-v3\baseline-v2`, shards over the boards 6x10, 10x10, 12x12 and 18x20 from easy to master; then MP06b's Amendment A1: every probe request generated once and captured, identity checked against `resultDigest` (RES-14), and every rating run (`old`, `diag`, `base`, census trials, `final`) made on the captured packs with `tools\rate-probe.mjs --pack` | MP06b: `docs/difficulty-v3/probe-2026-11-12.md` (GV2 baseline, identity, cost, the old and final capped-path and count-cutoff shares, census shares, order noise, distributions, `Gproved = 0` counts) and `docs/difficulty-v3/probe-corpus-2026-11-12/` (captured packs, `manifest.json`, `final.jsonl`); MP06c: `docs/difficulty-v3/fit-<date>.md` (proposed knobs, hit rates, confusion matrices, the RES-35 `Gproved = 0` rejection counts) |
| GF-P1, GA-P1 | MP07 | `node tools\record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"`; then `npm test` | old and new versions; why pieces, layouts or clue keys moved (in the task record and the reply) |
| D21-V3 | MP09d2 (after the switch, before GF-P2), with the D36 measurements (P-OD5) | three blocks. C1 (timed): the Hell outcomes of the recipe `square-22x22-hell-3` (two-worker `flow-pool.mjs` and serial `flow.mjs`), of MP07's 15 x 20 Hell 2 input and of the other Hell cells of the D21 reach table under the observer `docs/difficulty-v3/d21-v3-<date>/spent.mjs` (180-300 s each), then the replacement search (serial captures, 600 s each; the chosen recipe checked in the two-worker flow, 300 s). C2 (no times): the availability probe `avail.mjs` (6 runs, 300 s each). C3: the D21 drivers of `docs/difficulty-v3/d21-2026-11-12/` (`flow.mjs`, `vectors.mjs`, `pop.mjs`) under `docs/difficulty-v3/d21-v3-<date>/nostall.mjs` (the D21 observer with the stall stop disabled in memory) on the cells that complete under v3 (14 captures plus one per completed C1 cell, 600 s each); then (TP03) `split.mjs` (the `any`-mode calls, the `require`-mode calls, the nine scripted v2 controls), `simulate.mjs --ns 8,12,16 --list` on the `any`-mode calls (screening, exact), the two reruns of the `require`-mode calls at N = 12 and 16 (`rerun.mjs`, about 1.5 minutes each, 600 s limit) and `certify.mjs` (actual final results against the no-stall baseline); `STALL_LIMIT` stays 12 (marked "inert on the v3 corpus" when the rule fires nowhere) or becomes 16 by the rule of MP09d2 (only a raise; misses at N = 16, a non-reproducible rerun or a missing partner stop the task) | `docs/difficulty-v3/d21-v3-<date>.md` (Hell outcomes, replacements, availability, the screening TOTAL rows for N = 8, 12, 16, the certification rows for N = 12, 16, the controls table, the decision, the cells for MP12) and the folder `docs/difficulty-v3/d21-v3-<date>/` (the scripts, `hell/`, `avail/`, `nostall/`, `split/`, `rerun/`, `runs.md`, the summaries, `simulate*.md`, `certify.md`) |
| GF-P2, GA-P2 | MP09d2; MP12a after a knob change; MP12b2 (the final `npm test`, and GF-P2 only in an ordered change round) | `node tools\record-fixtures.mjs --replace --reason "P2: difficulty-v3"`; the recipe expectations by hand; v3 code cases added, v2 code goldens kept; then `npm test` | the changed expectations and why |
| GC-P2 | MP09e (format and the duplicate-shape refusal), MP10b2 (display) | the 676-cell code matrix and `tests/browser/puzzle-code-acceptance.html`; share and print browser checks with derived ratings and the estimate note, with and without n | `docs/difficulty-v3/codes-<date>.md`; check results |
| slow test | MP11 | `node --test --test-name-pattern="^slow: v3 generation" tests\difficulty-v3.test.js`, once, announced (about 2–8 minutes) | duration and the per-board diagnostics (in the reply) |
| GL-P3 | MP12a (slice), MP12b1 (full) | the GV2 slice again with `--output docs\difficulty-v3\landscape-v3`; then the full landscape (`--profile landscape --seeds 20 --fresh-process --output docs\difficulty-v3\landscape-v3-full`, all 105 cases on 16 boards; the 25 Hell cases by P-OD6 (D37 (c)): a 3-request prescreen, then 20 requests where a puzzle is made and for the boundary case of each Hell level, the others reduced) in shards selected by `--cases`; `rate-probe` on regenerated matching requests verified against `resultDigest` | MP12a: `docs/difficulty-v3/calibration-slice-<date>.md`; MP12b1: `docs/difficulty-v3/landscape-v3-full/` (`shards-<date>.md`, `aggregate-<date>.json` and `.md`: every case id, coverage, incomplete, capped and partial outcomes, times; Hard and Expert compared only on cells with a GV2 baseline), summarised in MP12b2's `docs/difficulty-v3/calibration-<date>.md` |
| GS-P3 | MP12b2 | the search-evidence captures: `docs\difficulty-v3\d21-2026-11-12\flow.mjs` under the observer `docs\difficulty-v3\search-<date>\observe.mjs` for the populations R (`require`, 6x10 and 18x20), A (`any`, the four GV2 boards, Hard to Master) and H (the Hell cells of D21), and S (only when MP09d2 found the stall stop inert) under MP09d2's `nostall.mjs`; one serial process per capture, 300-600 s each, in announced blocks (R and A about 20-40 minutes, H up to 25 minutes); then `summary.mjs` with its self-test | `docs/difficulty-v3/search-<date>/` (the captures, `runs.md`, `summary.md`, `stall-simulate.md`); sections 6-10 of `docs/difficulty-v3/calibration-<date>.md` (search evidence, Hell report, stall stop, the cells v3 cannot make with the owner's question, the fail-fast proposal) |
| GF-P4 | MP13b | the new replay-fixture mode of `tools\record-fixtures.mjs` writes `tests/fixtures/replay-case.json`; then `npm test` | the fixture's provenance |
| GB-P4 | MP16b | `tests/browser/replay.html` (main and keys phases), `rendering.html`, `generator-flow.html` and `acceptance.html`, with MP16b's runner (trusted keys, one evidence directory per page and phase; cross-review SP19) | check results |
| GZ | MP17 | before the announcement only the lock inspection (the diff of the locked constants, printed values); in the gate: the fixture checks (`node tools\record-fixtures.mjs --check` and `--replay-case --check`; cross-review SP18); `npm test`; the plan §6 probe and runs of every offered level on 10x6 and 20x18 (`tools/generate.mjs`, small counts, a fresh attempt directory with a checked manifest; SP17), their claims re-rated; a small `rate-probe` run on 10x6 and 20x18; every page of `tests/browser/` in the main phase plus the keys and narrow phases of `puzzle-code-acceptance` and the keys phase of `replay` (MP16b's runner; SP19) | `docs/difficulty-v3/final-<date>.md`, with the release notes |

**Browser checks** run in headless Microsoft Edge through CDP, with the native client and the environment rules of
`tasks/regenerate-puzzle/check-list.md` §7 (same Edge installation, external-module pages that set `data-result` and
`data-summary`). Ports for this pack: HTTP `88NN` and CDP `93NN`, where NN is the two-digit task number (MP09e 8809 and
9309, MP10b2 8810 and 9310, MP16b 8816 and 9316, MP17 8817 and 9317); server
`node tools/serve.mjs --port 88NN --prefix /pentomino/`; throwaway profile `tests\artifacts\edge-MPnn\`. Record the
server and browser PIDs, stop them by PID and remove the profile afterwards, also on failure. If a port is busy, report
it; never stop someone else's process.

## 8. Evidence and sign-off

Each developer's final reply gives:

1. The changed files (created, edited) and the statement that nothing else changed.
2. The public API and contracts delivered for the next task (signatures, data shapes, constants).
3. Every command run and its outcome (test counts, pass and fail, duration).
4. The acceptance IDs it believes are met, and any it could not meet, with the reason.
5. Issues met and the solution chosen; any deviation from the task, with its reason.
6. Remaining risks or follow-ups for later tasks.
7. For a gate task: the gate commands, shards, durations, results and record paths.

The orchestrator independently re-runs each task's quick checks and fills the task's empty Execution log: Status,
Start, End, Duration, Model, Token usage, AI credits, Verification, Acceptance, Issues & resolutions, Handoff. A pinned
value is never changed to match an implementation: a mismatch is a defect of the implementation, or an evidenced
finding for the orchestrator (§4.2 D11).

## 9. Release decision record

| Gate | Status | Evidence / remaining action |
|---|---|---|
| MP01 to MP17 accepted and committed | | |
| GV2 baseline and probe (MP06b) | | |
| GF-P1, GA-P1 (MP07) | | |
| GF-P2, GA-P2, GC-P2 (MP09d2, MP09e, MP10b2, MP12a, MP12b1, MP12b2) | | |
| GL-P3 slice, full landscape and the lock (MP12a, MP12b1, MP12b2) | | |
| GF-P4 (MP13b) | | |
| GB-P4 (MP16b) | | |
| GZ final evidence and release notes (MP17) | | |
| Generated Hard-or-above puzzles have `Gproved >= 1` (AR1) | | |
| Full `npm test` | | |
| EN / VI review of the new strings | | |
| Documents in step (both languages) | | |
| Release verdict (merging `rating-v3` is the owner's decision; nothing is pushed) | | |

The orchestrator owns this record.

## Orchestrated execution summary

| Task | Status | Duration | AI credits | Commit |
|---|---|---|---|---|
| MP01 | Accepted | 3 min developer + 6 min review | about 56 | `difficulty-v3 MP01` |
| MP02a | Accepted | 11 min developer + 5 min review | about 199 | `difficulty-v3 MP02a` |
| MP02b | Accepted | 9 min developer + 5 min review | about 127 | `difficulty-v3 MP02b` |
| MP03 | Accepted | 7 min developer + 3 min review | about 150 | `difficulty-v3 MP03` |
| MP04 | Accepted | 20 min developer + 5 min review | about 356 | `difficulty-v3 MP04` |
| MP05 | Accepted | 21 min developer (1 fix round) + 8 min review | about 406 | `difficulty-v3 MP05` |
| MP06a | Accepted | 16 min developer + 5 min review | about 346 | `difficulty-v3 MP06a` |
| MP06b | Accepted (owner findings reported) | 45 min developer (machine about 19 min) + 6 min review | about 443 | `difficulty-v3 MP06b` |
| MP06c | Accepted (penalty finding to the owner, P-OD3) | 14 min developer + 6 min review | about 235 | `difficulty-v3 MP06c` |
| MP07 | Accepted after D21 = (d), RES-15a | 65 min developer in three rounds (incl. 33 min D21 measurements) + 10 min review | about 1,115 | `difficulty-v3 MP07` |
| MP08 | Accepted | 8 min developer + 6 min review | about 178 | `difficulty-v3 MP08` |
| MP09a1 | Accepted | 12 min developer + 7 min review | about 327 | `difficulty-v3 MP09a1` |
| MP09a2 | Accepted | 5 min developer + 4 min review | about 99 | `difficulty-v3 MP09a2` |
| MP09b | Accepted | 12 min developer + 5 min review | about 236 | `difficulty-v3 MP09b` |
| MP09c | Accepted | 6 min developer + 8 min review | about 124 | `difficulty-v3 MP09c` |
| MP09d1 | Accepted | 8 min developer + 5 min review | about 169 | `difficulty-v3 MP09d1` |
| MP09d2 | Accepted | about 1 h 37 min developer + 4 min review | about 978 | `difficulty-v3 MP09d2` |
| MP09e | Accepted (known flake recorded) | about 1 h 33 min developer (incl. 25 min flake baseline) + 10 min review | about 547 | `difficulty-v3 MP09e` |
| MP10a | Accepted | 14 min developer + 2 min review | about 237 | `difficulty-v3 MP10a` |
| MP10b1 | Accepted (print overflow fixed in the task) | 24 min developer in two rounds + 5 min review | about 617 | `difficulty-v3 MP10b1` |
| MP10b2 | | | | |
| MP11 | | | | |
| MP12a | | | | |
| MP12b1 | | | | |
| MP12b2 | | | | |
| MP13a | | | | |
| MP13b | | | | |
| MP14a | | | | |
| MP14b | | | | |
| MP15a1 | | | | |
| MP15a2 | | | | |
| MP15b | | | | |
| MP16a | | | | |
| MP16b | | | | |
| MP17 | | | | |
| **Totals** | | | | |

### Known issues (orchestrator)

| Id | Found in | Issue | Status |
|---|---|---|---|
| KI-1 | MP09e | `tests/browser/puzzle-code-acceptance.html` fails intermittently in old checks (BA09, once BA05, once the first BA01 check): a module worker emits `error` shortly after creation ("Puzzle code processing failed"; CDP shows a canceled `Script` request near a `terminate()`). Pre-existing: HEAD `cd2e079`'s page 3 of 10 runs, MP09e's page 2 of 10, 23 of 32 runs passed overall | Open; a follow-up fix is to be assigned (candidates: one respawn in `core/browser/worker-pool.js`, or a pause in the page's `check` cleanup). Until then MP10b2 and MP17 treat one failure of this signature as the known flake and re-run the page once |

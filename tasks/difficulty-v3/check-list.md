# difficulty-v3 (Pentomino) — task index and overall acceptance

**Scope:** production implementation of the accepted difficulty-v3 design for Pentomino ("make Hard really hard"): a
deduction solver that measures a puzzle the way people solve it (rules R1-R9, decisive guesses), the v3 rating model
in which Hard and above need a real choice, centre-seeking clue selection, the measured fit and the calibration lock,
the refusal of piece sets with two pieces of the same shape, the derived display rating, and the Generator's
Generation Steps replay.
**Status:** task documents in preparation: MP01, MP02a, MP02b and MP03 are written (for review by gpt-6-astra); the
other parts follow; implementation has not started.
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
| [ ] | MP01 | [MP01](MP01-model-metadata.md) | Model metadata for the deduction solver | none | Small | Engine | M1 deduction solver | 1 |
| [ ] | MP02a | [MP02a](MP02a-deduction-core.md) | Deduction core: state, R1 and R2, search, statuses, caps, memory | MP01 | Large | Engine | M1 | 2 |
| [ ] | MP02b | [MP02b](MP02b-pocket-check-and-lookahead.md) | R3 contradiction check, R6 lookahead, E, recipe characterisation | MP02a | Medium | Engine | M1 | 3 |
| [ ] | MP03 | [MP03](MP03-rules-r3-place-r4-r5.md) | R3 place, R4 and R5, rule boards and the soundness oracle | MP02b | Medium | Engine | M1 | 4 |
| [ ] | MP04 | MP04-rules-r7-r9-and-tiers.md (planned) | R7, R8, R9, tiers, rule counts, oracle on every rule | MP03 | Large | Engine | M1 | 5 |
| [ ] | MP05 | MP05-decisive-census.md (planned) | Decisive census, the upper estimate and `Gproved` | MP04 | Large | Engine | M2 decisive guesses | 6 |
| [ ] | MP06a | MP06a-rate-probe-tool.md (planned) | Probe tool `tools/rate-probe.mjs` and the `tieOrder` diagnostic | MP05 | Medium | Tools | M3 measured fit | 7 |
| [ ] | MP06b | MP06b-probe-and-v2-baseline.md (planned) | Probe and GV2 runs, `DEDUCE` values, candidate knobs, record | MP06a | Medium + machine time | Measurement | M3 | 8 |
| [ ] | MP07 | MP07-centre-seeking-clues.md (planned) | Centre-seeking clue selection, the `SelectContext.rate` seam, `gen-v3` | MP06b | Medium–Large | Engine | M4 centre-seeking generation | 9 |
| [ ] | MP08 | MP08-pure-v3-score.md (planned) | Pure v3 score, breakdown, `SCORE_V3` and types | MP07 | Medium | Engine | M5 v3 active | 10 |
| [ ] | MP09a | MP09a-duplicate-shapes-refused.md (planned) | Two pieces of the same shape refused at every entry; the saved-set notice | MP08 | Large | Engine and apps | M5 | 11 |
| [ ] | MP09b | MP09b-v3-claims-in-packs-and-codes.md (planned) | v3 claims in packs and codes: `censored`, `Gproved` checks, v2 legacy | MP09a | Medium | Engine | M5 | 12 |
| [ ] | MP09c | MP09c-activate-v3.md (planned) | Activate v3: `measureV3`, `rate`, `IncompleteRatingError`, the `Gproved` rule, pinned tests | MP09b | Large | Engine | M5 | 13 |
| [ ] | MP10a | MP10a-auxiliary-requests.md (planned) | Auxiliary request method on the generation client and pool | MP09c | Medium | Browser integration | M6 display rating | 14 |
| [ ] | MP10b | MP10b-derived-display-rating.md (planned) | Derived display rating and the estimate note in both apps | MP10a | Large | Apps | M6 | 15 |
| [ ] | MP11 | MP11-calibration-tooling.md (planned) | Calibration tooling and the slow v3 test | MP10b | Medium | Tools | M7 calibrated and locked | 16 |
| [ ] | MP12a | MP12a-calibration-slice.md (planned) | The GV2 slice again with v3, and the knob changes | MP11 | Medium + machine time | Measurement | M7 | 17 |
| [ ] | MP12b | MP12b-full-landscape-and-lock.md (planned) | Full landscape, final fixtures and the lock | MP12a | Medium + machine time | Measurement | M7 | 18 |
| [ ] | MP13a | MP13a-provenance-engine.md (planned) | Provenance in the engine and packs | MP12b | Medium–Large | Engine | M8 provenance and recorders | 19 |
| [ ] | MP13b | MP13b-provenance-apps.md (planned) | Provenance in the apps, the CLI client and the replay fixture | MP13a | Medium | Apps and tools | M8 | 20 |
| [ ] | MP14a | MP14a-detail-channel-and-clue-recorders.md (planned) | Rating detail channel and the clue-stage recorders | MP13b | Medium | Engine | M8 | 21 |
| [ ] | MP14b | MP14b-set-and-layout-recorders.md (planned) | Set and layout recorders; recorder identity | MP14a | Medium | Engine | M8 | 22 |
| [ ] | MP15a | MP15a-replay-engine.md (planned) | Replay engine | MP14b | Large | Engine | M9 Generation Steps | 23 |
| [ ] | MP15b | MP15b-replay-worker-task.md (planned) | Replay worker task, protocol and client | MP15a | Medium | Browser integration | M9 | 24 |
| [ ] | MP16a | MP16a-replay-dialog.md (planned) | Generation Steps dialog and score table | MP15b | Large | Generator UI | M9 | 25 |
| [ ] | MP16b | MP16b-dialog-wiring-and-documents.md (planned) | Card button, browser page, GB-P4 and documents | MP16a | Medium | Generator UI | M9 | 26 |
| [ ] | MP17 | MP17-final-evidence.md (planned) | Final compatibility and regression evidence, release notes | MP16b | Medium | QA and release | M10 verified | 27 |

Sizes: Small about 100–300 changed lines; Medium about 300–800; Large about 800–1,600 (tests and documents included,
generated data excluded). "Machine time" marks a gate of up to several hours of shards (§7), which comes on top of the
developer's working time. Each dispatched part is sized for about 20–60 minutes of developer-agent time; report §6.2
gives the agent hours per report task (75–117 in total, a generous upper estimate).

Report tasks and dispatched parts: MP02 = MP02a + MP02b; MP06 = MP06a + MP06b; MP09 = MP09a + MP09b + MP09c;
MP10 = MP10a + MP10b; MP12 = MP12a + MP12b; MP13 = MP13a + MP13b; MP14 = MP14a + MP14b; MP15 = MP15a + MP15b;
MP16 = MP16a + MP16b. The other tasks are dispatched whole. The quotient task MP04b of earlier drafts is dropped: a set
with two pieces of the same shape is refused (RES-34).

## 2. Ready waves

All 27 waves are sequential: one task at a time in this repository.

| Wave | Task | Why it cannot share a wave |
|---:|---|---|
| 1 | MP01 | changes the `Model` that MP02a reads; edits `docs/design-detail.md` |
| 2 | MP02a | creates `core/engine/deduce.js`, `tests/deduce.test.js` and `DEDUCE`, which every later solver task edits |
| 3 | MP02b | edits `deduce.js`, `tests/deduce.test.js` and design §7.9 |
| 4 | MP03 | the same files, plus the new `tests/deduce-rules.test.js` |
| 5 | MP04 | the same files |
| 6 | MP05 | `deduce.js` and design §7.9; the new `tests/deduce-census.test.js` |
| 7 | MP06a | `deduce.js` (`tieOrder`); the probe tool reads the finished solver |
| 8 | MP06b | runs the probe and GV2 on the integrated solver; sets `DEDUCE`; developer guides |
| 9 | MP07 | `clues.js`, `version.js`, the generation fixtures (GF-P1, GA-P1), which later tasks pin |
| 10 | MP08 | `difficulty.js`, `policy.js`, `types.js`, `tests/policy.test.js` |
| 11 | MP09a | `pack.js`, the code modules, both apps' locales and the guides |
| 12 | MP09b | `pack.js`, the code modules and their tests |
| 13 | MP09c | `difficulty.js`, `clues.js`, every pinned rating test and fixture (GF-P2, GA-P2, GC-P2) |
| 14 | MP10a | `generation-client.js`, `worker-pool.js` and their tests |
| 15 | MP10b | both apps' state, UI and locales (GC-P2 display) |
| 16 | MP11 | `tools/bench/*`, the calibration tests, the slow test |
| 17 | MP12a | knob values; the GL-P3 slice |
| 18 | MP12b | the full landscape, the fixtures again and the lock |
| 19–27 | MP13a to MP17 | after the lock; each edits `generate.js`, `clues.js`, `types.js`, `pack.js`, the Generator or the replay files that its neighbour edits |

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
| MP05 | `core/engine/deduce.js`, `tests/deduce.test.js` (re-pinned values only), `tests/deduce-census.test.js` (new); docs: design §7.9 | as MP02b |
| MP06a | `tools/rate-probe.mjs` (new), `tests/rate-probe.test.js` (new), `core/engine/deduce.js` (`tieOrder` only) | `policy.js`; records |
| MP06b | `DEDUCE` values in `core/engine/policy.js` and their pin in `tests/policy.test.js`, `docs/difficulty-v3/probe-<date>.md` and `docs/difficulty-v3/baseline-v2/` (new), `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | engine code other than the values |
| MP07 | `core/engine/clues.js`, `core/engine/version.js`, `tests/clues.test.js`, `tests/generate.test.js`, `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json`; docs: design §5.5, §6.10, §6.11, §7.6, `docs/design-brief.md` | `difficulty.js`, `deduce.js` |
| MP08 | `core/engine/difficulty.js` (new exports only), `SCORE_V3` in `core/engine/policy.js`, `core/engine/types.js`, `tests/difficulty-v3.test.js` (new), `tests/policy.test.js` | every caller of `rate` |
| MP09a | `core/engine/pack.js` (duplicate-shape check), `core/engine/types.js` (`Issue.params`), `core/engine/puzzlecode.js`, `core/engine/puzzlecode-v1.js` (error mapping only), `core/engine/puzzlecode-input.js`, `core/browser/puzzle-code-client.js`, `core/browser/puzzle-code-dialog.js`, `player/strings.js`, both apps' locales, `generator/state.js` (saved-set restore and notice), `generator/app.js` (notice), their tests; docs of RES-34 | rating code |
| MP09b | `core/engine/pack.js` (v3 claims, `censored`, `Gproved` checks, v2 legacy), `core/engine/puzzlecode.js` (summary claims), `tests/pack.test.js`, `tests/puzzlecode.test.js`; docs: design §5, §9 | `difficulty.js` |
| MP09c | `core/engine/difficulty.js`, `core/engine/clues.js` (RES-04 and RES-35 handling), `tools/record-fixtures.mjs` (RES-04 handling), `tests/difficulty.test.js`, `tests/clues.test.js`, `tests/fixtures/clue-recipes.js`, `tests/generate.test.js`, `tests/worker-pool.test.js`, `tests/protocol.test.js`, `tests/browser/puzzle-code-acceptance.js`, the generation fixtures; docs: design §7, `docs/design-brief.md`, the guides | `deduce.js` (a solver defect goes back to its owner) |
| MP10a | `core/browser/generation-client.js`, `core/browser/worker-pool.js` (only if needed), `tests/generation-client.test.js`, `tests/worker-pool.test.js`; docs: design §8.1 | app files |
| MP10b | `player/state.js`, `player/app.js`, `player/strings.js`, Player locales, `generator/state.js`, `generator/jobs.js`, `generator/ui/puzzle-panel.js`, `generator/strings.js`, Generator locales, `core/browser/print-dialog.js`, their tests; docs: design §7.7, the user guides | engine files |
| MP11 | `tools/bench/runner.js`, `tools/bench/report.js`, `tools/bench/calibration-reference.js`, `tests/calibration.test.js`, `tests/benchmark-report.test.js`, `tests/difficulty-v3.test.js` (slow part) | `policy.js` |
| MP12a, MP12b | knob values in `core/engine/policy.js` (`SCORE_V3`, `DEDUCE`, `K60`, `POLICY_ID`), `SHARES` in `core/engine/levels.js`, the generation fixtures, `tests/difficulty-v3.test.js`, `docs/difficulty-v3/calibration-<date>.md`, `docs/difficulty-v3/landscape-v3/`, `docs/difficulty-v3/landscape-v3-full/`; docs: design §7.8 | algorithm code |
| MP13a to MP17 | as report §5.1, refined in each task file | rating and generation outputs (after the lock) |

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
- **Tests.** While working, run the task's own test files with `node --test <files>`; at the end run
  `npm run test:quick` and then `npm run check` from the repository root. Run `npm test`, `tools/calibrate.mjs`,
  `tools/record-fixtures.mjs`, the probe at scale or a browser page **only** in the task that owns that gate (§7).
  Every test run finishes within 10 minutes and every browser check within 1 minute (`AGENTS.md`): a longer run has an
  error; cancel it and investigate. Never two runs at once in this checkout (they share `tests/artifacts/`). Never
  weaken, skip, delete or rewrite a test to make a run pass; an edit of an existing test that the task lists as an
  intended contract change is allowed; any other failing test is reported.
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
| SA1-Q-P1 | decisive guesses; an unfinished census publishes a labelled upper estimate; the few/many penalty stays | owner | RES-05 | MP05, MP06b, MP08, MP10b, MP16a |
| SA2-Q-P02 | a capped path is unrateable (`IncompleteRatingError`, reason `path-capped`); no v3 "+"; caps set so that no probe path is capped up to master on boards up to 20x18 | owner | RES-04, RES-10 | MP02a, MP06b, MP09c, MP10b |
| SA2-Q-P03 / SA1-Q-P6 | two pieces of the same shape are an error at every entry (`duplicate-shape`); engine functions stay total on direct inputs and count labelled pieces | owner | RES-09, RES-34 | MP02a (labelled counting), MP09a |
| SA2-Q-P09 | knobs within the ranges, caps, `K60` and `SHARES` may change in P3, every change recorded | owner | RES-25 | MP12a, MP12b |
| C1 | `censored: true` on v3 ratings, claims and summary claims exactly when the census is unfinished | owner | RES-05, RES-19, RES-21 to RES-23 | MP09b, MP09c, MP10b |
| C4 | a saved set with two pieces of the same shape is removed with a one-time notice in English and Vietnamese | owner | RES-34 | MP09a |
| AR1 | metric `Gproved`; a generated Hard-or-above candidate needs `Gproved >= 1` | owner | RES-35 | MP05, MP06b, MP07 (seam), MP09c, MP11, MP14a, MP17 |
| SA2-Q-P01 | base maximum 12; rule term 0 / 2 / 4 | plan author | RES-18 | MP08 |
| SA2-Q-P04, C2 | centre-seeking acceptance as written; the reserve of 16 is the stop point at profile 48; repairs memoised | plan author | RES-15 | MP07 |
| SA2-Q-P05 / SA1-Q-P5 | uniform clue sampling | plan author | RES-16 | MP07 |
| SA2-Q-P06 | one canonical search order | plan author | RES-13 | MP06a, MP06b |
| SA2-Q-P07 / SA1-Q-P3 | summary claims in puzzle codes | plan author | RES-22 | MP09b |
| SA2-Q-P08 / SA1-Q-P2, JR-P1 | derived display rating with a note, for v2 and v1 claims | plan author | RES-23 | MP10b |
| SA2-Q-P10 / SA1-Q-P4, JR-P2 | `generation.made` and `generation.setOrigin`; "steps not available for this puzzle" | plan author | RES-27, RES-30, RES-31 | MP13a, MP13b, MP15a, MP16a |
| SA2-Q-P11 | no rule-based Player hints | plan author | RES-33 | - |
| SA2-Q-P12 | R4 and R5 on piece/cell pairs only | plan author | RES-06 | MP03 |
| SA2-Q-P13 | the rule term uses the hardest deduction tier | plan author | RES-08, RES-18 | MP04, MP08 |
| AUTH-P1 | provenance record confirmed; encoding (a), capped integer lists | plan author | RES-27 | MP13a |
| JR-P3 | the knob ranges are experimental ranges, with `rule[2] <= rule[3]` | plan author | RES-18, RES-25 | MP06b, MP08, MP12a |
| JR-P4 | auxiliary request method on the existing client and pool | plan author | RES-23, RES-29 | MP10a, MP15b |
| PROC-P1 | fit before activation, lock before P4, regression after P4 | plan author | RES-14, RES-25 | MP06b, MP08, MP12b, MP17 |
| C3 | release notes in `docs/difficulty-v3/final-<date>.md`; the guides state the refusal | plan author | RES-32, RES-34 | MP09a, MP17 |
| C5 | the 5 % rule per level and board cell of the MP06 corpus | plan author | RES-05 | MP06b |
| C6 | no objection | plan author | RES-24, RES-34 | MP09a |
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
| D12 | Every new `core/engine/*.js` file is added to `SOURCE_FILES` in `tools/bench/report.js` by the task that creates it: `deduce.js` (MP02a) and `replay.js` (MP15a). |
| D13 | `DEDUCE` is written whole in MP02a, `census` included, and pinned once in `tests/policy.test.js`; MP05 reads `census`; MP06b changes values and the pin with the evidence. |

## 5. Business traceability

The owner's request, "make Hard really hard", and the decisions of plan §1.3: **N1** a rating reflects how people
solve: forced placements, deductions, real choices; **N2** Hard and above need at least one real choice; **N3**
generated puzzles aim at the centre of the requested band; **N4** the levels are measured and fitted before activation
and locked before Generation Steps; **N5** stored puzzles, claims, links and codes keep working, and a stored claim is
never changed; **N6** the Generator can replay how a puzzle was made (Generation Steps).

| Requirement or decision | Implemented by | Accepted by |
|---|---|---|
| N1 deduction-based measure | MP01 (model views), MP02a (state, R1, R2, guesses), MP02b (R3 check, R6), MP03 (R3 place, R4, R5), MP04 (R7-R9, tiers) | MP01-B01, MP02a-B01 to B04, MP02b-B01 to B03, MP03-B01 to B03; MP04 |
| N1 decisive guesses (SA1-Q-P1) | MP05 | MP05 |
| N2 a real choice for Hard and above (AR1) | MP05 (`Gproved`), MP08 (G = 0 stays below Hard), MP09c (the acceptance rule), MP17 (evidence) | MP05, MP08, MP09c, MP17 |
| N3 centre-seeking clues | MP07 | MP07 |
| N4 measured fit and lock (PROC-P1, JR-P3, SA2-Q-P09) | MP06a, MP06b, MP08, MP11, MP12a, MP12b | MP06b, MP12b |
| N5 compatibility; two pieces of the same shape refused (SA2-Q-P03 / SA1-Q-P6, C1, C4, C6) | MP02a to MP08 change no output; MP09a, MP09b, MP09c, MP10b | MP01-B02, MP02a-B05, MP02b-B04, MP03-B04; MP09a to MP10b; MP17 |
| N6 Generation Steps (SA2-Q-P10, AUTH-P1, JR-P2, JR-P4) | MP13a to MP16b | MP13b, MP15a, MP16b |
| Unrateable capped paths (SA2-Q-P02) | MP02a (the `capped` status), MP06b (caps), MP09c (handling), MP10b (display) | MP02a-T05; MP06b, MP09c, MP10b |

## 6. Technical acceptance (every task)

- The task's own commands pass, then `npm run test:quick` and `npm run check` from the repository root.
- Engine purity and the engine guards of §3 hold; `tests/benchmark-report.test.js` and `tests/bq-limits.test.js` pass.
- Before MP09c no rating or generation output changes, except MP07's own versioned change with its gates GF-P1 and
  GA-P1: MP01 to MP06b add non-production code and values, and nothing in generation or rating calls
  `measureDeduction` before MP09c.
- After the lock (end of MP12b) no rating or generated puzzle changes (MP13a to MP17).
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
| GV2 | MP06b | `node --max-old-space-size=2048 tools\calibrate.mjs --profile landscape --workers 4 --seeds 20 --fresh-process --cases "<regex>" --output docs\difficulty-v3\baseline-v2`, shards over the boards 6x10, 10x10, 12x12 and 18x20 from easy to master; then `node tools\rate-probe.mjs` on regenerated matching requests, verified against `resultDigest` (RES-14) | `docs/difficulty-v3/probe-<date>.md`: hit rates, times, distributions, capped and estimate shares, `Gproved = 0` counts, identity checks |
| GF-P1, GA-P1 | MP07 | `node tools\record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"`; then `npm test` | old and new versions; why pieces, layouts or clue keys moved (in the task record and the reply) |
| GF-P2, GA-P2 | MP09c; again in MP12b after the last knob change | `node tools\record-fixtures.mjs --replace --reason "P2: difficulty-v3"`; the recipe expectations by hand; v3 code cases added, v2 code goldens kept; then `npm test` | the changed expectations and why |
| GC-P2 | MP09c (format and the duplicate-shape refusal), MP10b (display) | the 676-cell code matrix and `tests/browser/puzzle-code-acceptance.html`; share and print browser checks with derived ratings and the estimate note, with and without n | `docs/difficulty-v3/codes-<date>.md`; check results |
| GL-P3 | MP12a (slice), MP12b (full) | the GV2 slice again with `--output docs\difficulty-v3\landscape-v3`; then the full landscape (`--profile landscape --seeds 20 --fresh-process --output docs\difficulty-v3\landscape-v3-full`, all 105 cases on 16 boards) in shards selected by `--cases`; `rate-probe` on regenerated matching requests verified against `resultDigest` | `docs/difficulty-v3/calibration-<date>.md`: every case id, coverage, incomplete, capped and partial outcomes, times; Hard and Expert compared only on cells with a GV2 baseline |
| GF-P4 | MP13b | the new replay-fixture mode of `tools\record-fixtures.mjs` writes `tests/fixtures/replay-case.json`; then `npm test` | the fixture's provenance |
| GB-P4 | MP16b | `tests/browser/replay.html` and the affected dialog and share pages | check results |
| GZ | MP17 | `npm test`; the affected browser pages; the plan §6 probe and a small `rate-probe` run on 10x6 and 20x18 | `docs/difficulty-v3/final-<date>.md`, with the release notes |

**Browser checks** run in headless Microsoft Edge through CDP, with the native client and the environment rules of
`tasks/regenerate-puzzle/check-list.md` §7 (same Edge installation, external-module pages that set `data-result` and
`data-summary`). Ports for this pack: HTTP `88NN` and CDP `93NN`, where NN is the two-digit task number (MP09c 8809 and
9309, MP10b 8810 and 9310, MP16b 8816 and 9316, MP17 8817 and 9317); server
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
| GF-P2, GA-P2, GC-P2 (MP09c, MP10b, MP12b) | | |
| GL-P3 slice, full landscape and the lock (MP12a, MP12b) | | |
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
| MP01 | | | | |
| MP02a | | | | |
| MP02b | | | | |
| MP03 | | | | |
| MP04 | | | | |
| MP05 | | | | |
| MP06a | | | | |
| MP06b | | | | |
| MP07 | | | | |
| MP08 | | | | |
| MP09a | | | | |
| MP09b | | | | |
| MP09c | | | | |
| MP10a | | | | |
| MP10b | | | | |
| MP11 | | | | |
| MP12a | | | | |
| MP12b | | | | |
| MP13a | | | | |
| MP13b | | | | |
| MP14a | | | | |
| MP14b | | | | |
| MP15a | | | | |
| MP15b | | | | |
| MP16a | | | | |
| MP16b | | | | |
| MP17 | | | | |
| **Totals** | | | | |

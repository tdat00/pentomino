# Plan version 4 (Pentomino): code drift at `3fc65f4`

Analyst: Opus (claude-opus-5.5), 2026-11-16, 13:43 to 14:19. A read-only check for the owner's question "compare the
analysed plan with the current code base; are there breaking changes? If none, break tasks." Astra's file 7 was not
read.

**Basis.**

- Plan: `plan.md` version 4 (unchanged since `b174079`), `clarifications.md` (IG-P-Q36; IG-P-Q34 at `854a69d`),
  `plan-v3-joint-report.md`, `speed-main-v3-v4.md`, `evidence/provisional/summary.md`, the executed pack
  `tasks/improve-generating/` and the harness `tools/ig-proto/`.
- Source: the worktree, `improve-generating` at `d1ae8dd`, rebased on `origin/main` `3fc65f4` (the merge-base).
  Outside `docs/improve-generating/`, `tasks/improve-generating/` and `tools/ig-proto/` it equals `3fc65f4`
  (`git diff 3fc65f4 d1ae8dd`). The plan's own bases: `cd5d17f` (MP12b1's runtime: the provisional numbers and the
  lines of section 2.1), `6122dc9` (MP14b: section 5.1) and `e5bb721` (MP15a2: the offers and the analysts' last
  check of the answers).
- Drift range: the 27 non-merge commits of `cd5d17f..3fc65f4`. After `e5bb721` the production code changed in MP15b
  (`0d5c257`), MP16a and MP16b (`27840d5`, `3a2f14e`), MP18a and MP18b (`3d36592`, `9239a39`) and `07406cf`. MP17
  (`43312ad`) changed only two fixtures of a browser test page; the other commits are pack wording.
- Method: `git diff`, `git show` and `git grep` at the four commits. The read-only script
  `evidence/drift/claude-opus-5.5/refs.mjs` prints the lines of every reference at `cd5d17f`, `6122dc9`, `e5bb721`
  and `3fc65f4`; with `--edits` it locates every anchored edit of `tools/ig-proto/variants/*.json` at `cd5d17f` and
  `3fc65f4`, with its enclosing function. `node tools\ig-proto\lib\tree.mjs check-edits --all` and
  `node tools\ig-proto\boards.mjs check` only read. No test, timing, build or browser ran.

**Labels.** *Fact*: read from the code or a committed record. *Derived*: a reading of the control flow or
arithmetic. *Projection*: rests on a stated assumption. Classes: **B**, breaking (the plan must change and the change
needs the owner or the plan author); **A**, an adjustment the pack author absorbs inside the plan; **N**, no impact.

## Verdict

**Breaking changes: yes, one (DR-O01).**

- **What did not change.** No number, cap, offer, gate or owner decision that plan v4 relies on has changed. The lock
  values, the withdrawn Hell availability and the MP12b1 baselines are as the plan states (DR-O12, DR-O13). Every
  contract claim of section 5.1 still holds at `3fc65f4` (DR-O14). Every anchored edit of the prototypes still
  matches (DR-O15).
- **What is new.** The Generation steps feature (MP15b to MP18b, `07406cf`). The plan does not name it, yet it
  consumes the replay that `gen-v4` changes. It makes a plan-author answer, IG-P-Q34 ("one running version"), visible
  to users: on the first `gen-v4` release, every piece set and puzzle made before it shows "steps not available", and
  so does every new puzzle made on a piece set saved before it. That consequence has not been put to the owner for
  `gen-v4`: question Q-O1 (section 5).
- **Adjustments.** DR-O02 to DR-O11 are for the pack author. The largest:
  - the Generation steps adaptation to the new search (DR-O02);
  - the split of the replay fixture and of its tool (DR-O03);
  - the provenance shape beyond the version keys (DR-O04);
  - the replay's cost for the new levels (DR-O05);
  - P6 against the replay steps (DR-O07).
- **Break tasks?** The answer to Q-O1 changes only phase 2's replay and provenance rule and their tests. Phase 0 (the
  frozen round) and phase 1 (P6, progressive presentation) do not depend on it.

## 1. Findings

| ID | Commits and files | Plan | Class | Evidence at `3fc65f4` | Handling |
|---|---|---|---|---|---|
| DR-O01 | `27840d5`, `3a2f14e` (MP16a, MP16b); `3d36592`, `9239a39` (MP18a, MP18b, P-OD14); `07406cf`. `core/engine/replay.js`, `generator/ui/replay-cache.js`, `generator/ui/replay-model.js`, `generator/app.js`, `generator/state.js` | 5.1 "One running version (IG-P-Q34)", "Provenance shape (IG-P-Q36)"; 6 "Replay" | **B** | One `ALGO_ID` (`version.js:4`). `sameVersions` compares the five ids (`replay.js:180-183`). A set origin made under other versions gives `set-versions` before any stage runs (`:329-331`), a puzzle record `record-versions` (`:360-362`). An `unavailable` result is shown as the stored puzzle alone (`replay-model.js:806-812`; P-OD14 Q2 (a), Q3 (a)), with "The piece set was made by another version of the generator." (`locale.en.js:284`, `locale.vi.js:279`). A new puzzle's steps use the origin of the set on show (`state.js:199-205`), so a set saved before the release gives `set-versions` for every later puzzle on it. The saved steps are keyed by `ALGO_ID` and `APP_VERSION` (`replay-cache.js:71-77`); every generated puzzle is replayed in the background and kept, 8 entries (`app.js:145-159`, `storage.js:46-47`). The replay fixture is a Hard puzzle (`replay-case.json:13-14`), a level `gen-v4` generates identically | The plan must state what the release does to existing steps; the choice is the owner's (Q-O1). The answer fixes `sameVersions`, IG-P-Q36's reader and tests, the refusal-case fixture, the release notes and both user guides |
| DR-O02 | `e5bb721` (MP15a2), `0d5c257` (MP15b), `27840d5`, `3d36592`. `core/engine/replay.js`, `core/engine/types.js`, `generator/ui/replay-model.js`, `generator/ui/generation-steps.js`, `generator/locale.*.js`, `USERGUIDE*.md`, design §6.12 | 5.1 "checked against the consumers" | A | The step builder throws on an event kind it does not know (`replay.js:828-893`); the worker task would then fail and the section show "failed". `ClueEvent` allows the phases `sample`, `seed` and `beam` and the `unrateable` reason `path-capped` only (`types.js:320-335`). The sentences are per kind (`replay-model.js:284-329`; `locale.en.js:303-326` and the vi file). The user guide lists the stages (`USERGUIDE.md:152-162`). MP15b's task, protocol kind and client method only carry the record (`tasks.js:196-198`, `protocol.js:619-627, 719-724`, `generation-client.js:1269-1281`) | Add to 5.1's consumer list the step builder, `replay-model.js` with its texts (en, vi), the Generation steps section, design §6.12 and the guides. Map each new event of `gen-v4` (a locate probe, a screen-capped `TOO_FEW` profile, a rescue re-rating, a budget end, a set attempt without a window) to a kind, phase and reason with a sentence in both languages. A screen-capped step has no score, like `unrateable`, so P2's "never shown" (as a rating) holds. Phase 2 re-runs `tests/browser/replay.html` (GB-P4, GB-P5) |
| DR-O03 | `7d2f7f6` (MP13b), `cb54ce5`, `e5bb721`, `0d5c257`, `27840d5`, `3d36592`. `tools/record-fixtures.mjs`, `tests/*.test.js` | 5.1 "the tests that expect `matched` move to a new `gen-v4` fixture"; 6 "Replay" | A | `replay-case.json` is read by five test files (`replay.test.js:27`, `replay-model.test.js:33`, `generation-client.test.js:959`, `protocol.test.js:55`, `tasks.test.js:615`), not only `replay.test.js:142`. `record-fixtures.mjs --replay-case --check` fails when the recorded versions differ from the running ids (`record-fixtures.mjs:521-522`); it runs in the quick set (`generate.test.js:912`) and in GZ. So an unchanged `gen-v3` file fails both under a `gen-v4` build | Version the replay-case mode: a `gen-v4` case beside the frozen `gen-v3` file, which is then checked only as the refusal case. A fixture that exercises the new search needs a Nightmare board (the new path runs only at Nightmare and Hell 1; today's fixture is Hard 10x6, 2.6 s to regenerate), within the quick set's time; MP17's named items (no real `unrateable` step and no real skip in any fixture) apply to it. `generated-sample-pack.json`, re-recorded under `gen-v4`, is also read by `tests/browser/replay.js:153` |
| DR-O04 | `77a4ff3` (MP13a), `0d5c257`. `core/engine/pack.js`, `core/engine/generate.js`, `core/engine/protocol.js` | 5.1 "Provenance shape (IG-P-Q36)"; 3 P4 "Identity (IG-P-Q03)" | A | The reader checks `gen-v3`'s skip bounds on every record, whatever its `algo`: `PROVENANCE` (`pack.js:49-55`) equals `SKIP_BOUNDS` (`clues.js:88-92`), with ordinals below 2,128 and 64, at most 64 and 16 kept (`skipsProblem`, `pack.js:1194-1205`; `capSkips`, `generate.js:291-295`). `made` has an exact key set (`MADE_CANDIDATE_KEYS`, `pack.js:57-59`). The replay builds the candidate's context from `made` alone (`replay.js:429-441`), and the wire carries only `setOrigin` and the puzzle's `made` (`protocol.js:620`, `generation-client.js:1274-1277`). Every reader goes through `pack.js` (`replay.js:311`, `state.js:980`, `generation-client.js:792, 948`, `pack.js:1415`) | Extend IG-P-Q36's per-`algo` shape to the skip bounds and to whatever P4's per-set prior adds to `made` (or derive the prior from the replayed calibration), with test cases. Already true at `e5bb721`, so not new since the analysts' check, but inside the range |
| DR-O05 | `cb54ce5` (MP15a1), `07406cf`. `core/engine/policy.js`, `core/browser/storage.js`, `generator/app.js` | 4 (costs); 5.1 (the untimed `record` pass) | A | `REPLAY` (`policy.js:125-136`): 4,096 steps, 4 MiB, work 256 x (760 M + 80 M); "provisional test defaults, measured on the replay fixture", derived from `gen-v3`'s 64 profile and 64 repair ratings per call. One measured Nightmare replay: 20x18, 1.7 s, 40 steps, 125 KB (`final-2026-11-15.md:490-501`). The cache refuses an entry above 600 KiB (`storage.js:47`). A replay re-runs the winning set attempt with its calibration, then the candidate (`replay.js:417-441`): ten puzzles replay ten calibrations | Re-derive `REPLAY.work` from P5's budget table. In the frozen round's untimed `record` pass, replay the accepted puzzles of the headline cells and report the status, steps, bytes, work and time, and the share above 600 KiB. *Projection, unmeasured:* successful Hell calls rated 6.2 and 9.4 profiles on average (plan P1) and a capped canonical profile costs about 2.1 s (plan 2.2), so a replay, two such calls, takes seconds to tens of seconds, and the ten background replays of a Hell 1 batch are of the order of the batch's own compute. If the measured cost passes a bound the pack author sets, the prefetch at those levels goes to the owner (`07406cf` was set on `gen-v3`'s costs) |
| DR-O06 | `07406cf`, `0d5c257`. `generator/app.js`, `core/browser/worker-pool.js` | 5.1 stage 1 (browser calibration, IG-P-Q23); 6 phase 3 (browser runs) | A | The Generator page queues the steps of every new puzzle on the idle queue; they run once the generation ends (`app.js:148-159`, `generation-client.js:466`). A new request preempts them by terminating their workers (`worker-pool.js:294-309`, `315-325`, `546`; `final-2026-11-15.md:490-492`), which are then created again for it. The bench page (`tools/bench`) has no replay | Each browser run names its harness. On the Generator page both arms run with the prefetch in the same state, and the state is reported |
| DR-O07 | `66bbed9` (MP14a), `e5bb721` (MP15a2). `core/engine/difficulty.js`, `core/engine/replay.js`, `tests/replay.test.js` | 3 P6; 6 phase 1 ("fixtures unchanged; `npm test`") | A | The anchor of `p6-1` is now in `measureV3Core` (`difficulty.js:285`, the DLX call at `:326`), shared by `rate` and `rateDetailed` (`:399`, `:415`). The replay compares the stored claim's full metrics (`sameRating`, `replay.js:280-288`). `replay.test.js:1111` requires the measuring step's rating to deep-equal the stored claim (design §6.12, the final step) | If P6 drops the DLX diagnostic from every search rating, the measuring `rated` step lacks `B`, `branchTrials`, `rowTrials` and `dlxStop`, and that test fails. P6 restores the diagnostic for the accepted puzzle and the calibration puzzle and, when `record` is set, for every rating the steps show; or the pack author rules on the §6.12 invariant. The score table shows no DLX field (`replay-model.js:379-440`), so nothing visible changes |
| DR-O08 | `77a4ff3`, `66bbed9`, `6122dc9`. `tools/ig-proto/variants/p1p5.json`, `log.json` and their `files/` | 5.1 "The rebase is semantic" | A | `igSelectProto` (`ig-select-proto.js:104`) returns `{ ok, clues, rating, certificate }` without `skips` (`:302`, `:331`) and reads no `record`, `charge`, `replaySkips` or `recordSource`. `puzzleCandidate` calls `capSkips(sel.skips)` (`generate.js:272`), so on `3fc65f4` the `p1p5` trees throw a `TypeError` at their first accepted candidate (Derived; `check-edits` passes). The `log` trees pass `rate: seam` (`ig-log.js:298-302`), which takes priority over `rateDetailed` (`clues.js:270-276`), so under `record` their events carry `detail: null` | Rebuild the prototype on `selectClues`, as 5.1 requires; this is the failure the parity passes must catch. The logging seam must not use `ctx.rate` where a journal needs the detail |
| DR-O09 | MP13a to MP15b. `clues.js`, `generate.js`, `policy.js`, `difficulty.js`, `generation-client.js`, `tests/clues.test.js` | 2.1; 3 P3, P7, C3; 6 | A | Section 2: the lines moved as the joint report on version 3 found at `6122dc9`, except `generation-client.js`, which MP15b moved again by 8 lines. Two `deduce.js` ranges were imprecise already at `cd5d17f` | Re-derive at the freeze from section 2's table, and correct the two ranges (`ruleR4`, `reachable`) |
| DR-O10 | `2f2035e` (MP12b3), `43312ad`. `generator/state.js`, `generator/index.html`, `USERGUIDE*.md`, `docs/design-brief.md` | 6 phase 3 ("`AREAS` re-derived by D39's rule"); OD-P4 | A | The Generator lists Very easy to Nightmare only (`LISTED_LEVEL_IDS`, `state.js:122`). The page metadata says "seven levels" (`index.html:15, 20-21, 31-32`). The guides and the brief say that no Hell level is offered (`USERGUIDE.md:145-146`, `design-brief.md:35`). MP17's named items: the `N-LEVELS` "above" notice and `N-UNIQUE-EXP` are dead paths while no Hell level is listed, and BQ's "at least 60 seeds for Hell-1 at the largest area" has no subject (`final-2026-11-15.md:481-486`) | If OD-P4 grants a Hell 1 offer, phase 3 also changes the level list, the notices, the metadata, the guides (en, vi), the brief and the BQ seeds. Its new `POLICY_ID` also makes earlier steps unavailable (DR-O01) |
| DR-O11 | `5ee9269` (P-OD12), `43312ad` (release notes). `docs/design-detail.md` | 3 P5 "Bounded set attempts"; 2.2 point 6 | A | The release notes say "No early stop was built for sets that cannot be rated (a decision of the owner)" (`final-2026-11-15.md:552-553`); design §7.5 says the same (`design-detail.md:1800`). P5's bounded set attempts end a request "with a notice instead of running to the stop" | State P-OD12's rule (no mechanism with an observed false stop) as the admission condition of the bounded attempts. Count their false stops against the uncapped search in the frozen round. Bring the change of the user-facing statement to the owner with that evidence |
| DR-O12 | `13d61fd`, `2f2035e`, `43312ad`, `0ed8800`, `2daf57c`; MP17's record | 1 (non-goals), 4, 5.1, 7 | N | MP17's lock check (`final-2026-11-15.md:115-125`): `DEDUCE` work 760,000,000, census 80,000,000, memory 32 MiB; `K60`; `SHARES`; `STALL_LIMIT` 12; the v3 knobs; Hell 1 to 3 at `[Infinity, Infinity]`; versions `gen-v3`, `mixed-v3`, `xoshiro128ss-v1`, `difficulty-v3`. `levels.js`, `version.js` and `deduce.js` are unchanged since the lock; `policy.js` only adds `REPLAY`. MP17 carries four findings: Nightmare completion of 85, 55, 55, 75 and 75 %, 43 Nightmare responses of the 70 over 120 s, the 136.3 s call and the census confound (`:460-478`). They are the plan's numbers. `0ed8800` is pack wording (the three deduction tiers); P-OD14 changes the interface only | None. The freeze is at `3fc65f4` or later: difficulty-v3 ended with MP18b and the merge of pull request #10, not with MP17 (plan header and 5.1) |
| DR-O13 | `13d61fd`, `2f2035e`, MP13a to MP18b, `07406cf` | 2, 4 ("Today") | N | Between `cd5d17f` and the lock `2f2035e` only `levels.js` (the Hell areas), `policy.js` (`POLICY_ID` `mixed-v2` to `mixed-v3`, comments), the Generator's Hell entries and the bench's Hell rows changed. The later commits add observers, the replay and the interface. GZ's two fixture checks replay identically (`final-2026-11-15.md:130-136`) | MP12b1's provisional "today" still describes the Nightmare and Master search of `3fc65f4`; only the source digest differs (`identity.mjs`, `compare.mjs`: "different source", already a precondition) |
| DR-O14 | MP13a to MP15b | 5.1 (the contract) | N | `selectClues` and the generator carry skip replay, recorders, `charge` and provenance (`clues.js:45-53, 258-276, 329-344, 461`; `generate.js:28-39, 108-160, 205-283`). `replay.js` is still the only caller that passes `record`, `replaySkips` and `charge` (`:417-419`, `:431-441`). `tasks.js:162, 171` pass none, and MP15b's task calls `replayPuzzle` (`tasks.js:196-198`). The versions are compared before any skip is applied (`replay.js:329-362`). A throwing observer propagates (`rateOnce`, `clues.js:329-344`); the replay's stop and cancellation rely on it (`replay.js:375-384`). `onCount: charge` is kept (`clues.js:461`). The fixture pins `gen-v3`, `mixed-v3` and `difficulty-v3` (Hard 10x6, `require`) | None |
| DR-O15 | `2f2035e`, MP13a to MP15a1. `tools/ig-proto/` | 5.1 preconditions (anchors, D-IG13) | N | `check-edits --all`: 14 of 14 variants match. Every find anchor occurs once at `3fc65f4`, in the same function as at `cd5d17f`, except `p6-1`, now in `measureV3Core` (section 3). `boards.mjs check`: 25 catalogue cells are not offered at `3fc65f4` (12 Hell 1, 9 Hell 2, 4 Hell 3); every other cell is identical. `diag-1` is still the only area gate of generation (`policy.js:339`) | None beyond DR-O08: D-IG13's diagnostic offers cover the hidden Hell 1 cells |
| DR-O16 | none (before the range) | 1 (goal), 4 (browser column), 6 phase 3 | N (not drift) | The Generator page accepts at most 484 cells on a desktop until BQ-1 passes and 360 on a phone until BQ-3 passes (`policy.js:24-47`; `qualification.js`: every gate `not-run`; `state.js:323`: `largeBoards: false`). 577 to 676 cells only through `tools/generate.mjs` (design D36, `design-detail.md:144`) | For the pack author: 24x24 and 26x26 (Hell 1 26x26, 26x26 Nightmare) are command-line cells. Their browser sensitivities, and any phase-3 browser run on them, concern the bench page, not the Generator page |

## 2. Re-verified references

The lines of plan v4, sections 2 to 6, and of the answers it cites (`refs.mjs`, part 1). "Same" repeats the cell to its
left.

| Plan reference (section) | What | `cd5d17f` | `6122dc9` | `e5bb721` | `3fc65f4` | Status |
|---|---|---|---|---|---|---|
| `clues.js:432-464` (2.1) | phase 1 of `selectClues`: spent profiles leave `below` and `above` at 0 and end it | 432-464 | 653-685 | same | 653-685 | moved; logic unchanged |
| `clues.js:429-464` (2.1) | start at `initialClueCount(share, K)`; `COUNT_CHANGES` 8, `SAMPLES_PER_COUNT` 4 | 429; 64, 63 | 650; 81, 80 | same | 650; 81, 80 | moved |
| `clues.js:273-274` (2.1) | AR1 refusal returns `spent` | 273-274 | 420-425 | same | 420-425 (with the `rejected` event) | moved |
| `levels.js:18` (2.1) | `SHARES` | 18 | 18 | 18 | 18 | unchanged |
| `deduce.js:1102, 1128` (2.1, P7) | R7's direct work checks | 1102, 1128 | same | same | 1102, 1128 | unchanged |
| `generate.js:554` (2.1) | `dispatchOrder` | 554 | 638 | 638 | 638 | moved |
| `policy.js:87` (2.1) | `slotAttempts: 12` | 87 | 88 | 88 | 88 | moved |
| `generation-client.js:1057-1085` (2.1) | the speculative dispatch and fold loop | 1057-1085 | 1098-1126 | same | 1106-1134 | moved twice (MP15b: +8) |
| `generation-client.js:447, 575, 812` (2.1) | `begin()`, the set job's and the batch's timers | 447, 575, 812 | 462, 590, 842 | same | 470, 598, 850 | moved twice |
| state report 2.2 and 1.9 (2.1) | `docs/difficulty-v3/generator-state-2026-11-14.md` | present | same | same | unchanged | unchanged |
| `ig-select-proto.js:450-722` (P1) | the locate contract (harness) | - | - | - | 450-722 at `d1ae8dd` | unchanged |
| IGP-05 `pm1.md:48` (P2) | Hell 1 at 380 M: 16 of 47 | - | - | - | 48 at `d1ae8dd` | unchanged |
| `tests/clues.test.js:701` (P3, 6) | the D21 test of capped and refused profiles | 701 (helper), 703 (test) | 818, 820 | same | 818, 820 | moved; cite 820 |
| `deduce.js:1448` (P7) | `ladder` | 1448 | same | same | 1448 | unchanged |
| `deduce.js:709-778` (P7) | `ruleR4` | 709-773 | same | same | 709-773 | unchanged; R4 ends at 773 (775 opens R5's comment) |
| `deduce.js:858` (P7) | R6, `closure`, its work check | 856, 858 | same | same | 856, 858 | unchanged |
| `deduce.js:1013-1075` (P7) | R7's `reachable` | 1013-1084 | same | same | 1013-1084 | unchanged; the function ends at 1084 |
| `deduce.js:432, 444, 482` (P7) | `kill`, `select`, `undo` | 432, 444, 482 | same | same | 432, 444, 482 | unchanged |
| `deduce.js:302-309` (P7) | the slot-table sum and `model-too-large` | 302-309 | same | same | 302-309 | unchanged |
| `limits.memoryBytes` 32 MiB (P7) | `policy.js` | 121 | 122 | 122 | 122 | same value |
| `difficulty.js:240-253` (C3) | the capped throw, then the DLX call | 245, 253 | 317, 326 | same | 316-322, 326 (`measureV3Core`) | moved |
| `tests/fixtures/replay-case.json` (5.1, 6) | pins `gen-v3` | absent | present | same | Hard 10x6 `require` | unchanged |
| `core/engine/replay.js` (5.1) | the observer caller | absent | absent | 419, 441 | 419, 441 | unchanged |
| `clues.js:45-53, 270-276`; `generate.js:273-281` (IG-P-Q28, at `e5bb721`) | the observers of `SelectContext`; the rating seam; `made` and `provenanceVersions` | absent | 45-53, 270-276; 273-281 | same | same | unchanged |
| `version.js:4`; `replay.js:180-183`; `tests/replay.test.js:142` (IG-P-Q34) | the one `ALGO_ID`; `sameVersions`; the `matched` case | 4; -; - | 4; -; - | 4; 180-183; 142 | same | unchanged |
| `pack.js:62` (IG-P-Q36) | `VERSION_KEYS` | absent | 62 | 62 | 62 | unchanged |

## 3. The prototypes' anchored edits

`check-edits --all` on the worktree (`3fc65f4`'s code): every variant matches. `refs.mjs --edits` finds each find
anchor once in `git show 3fc65f4:<file>`, in the function it was in at `cd5d17f`. It does not build the chain, so it
skips `p1p5-1` and `p1p5-2`, whose anchors are in the text that `log-4` appends; `check-edits` covers them.

| Variant | Own edits (file: line at `cd5d17f` to `3fc65f4`, enclosing function) | `check-edits` |
|---|---|---|
| `base` | `meta-1` (`tools/calibrate.mjs`, unchanged) | 1 edit matches |
| `instr` | `instr-1` to `instr-5` (`deduce.js`, unchanged: 335, 1598, 1102, 1128, 1814); `instr-7` (`tools/bench/runner.js:726`, unchanged); `diag-1` (`policy.js:325` to `339`, `pieceCountPlan`) | 11 match, the same functions |
| `log` | `log-1` (`clues.js:207` to `257`, `selectClues`), `log-2` (466 to 687), `log-3` (521 to 742), `log-5` (`generate.js:114` to `138`, `setAttempt`), `log-6` (191 to 237, `puzzleCandidate`), `log-7` (230 to 311, `completionCandidate`), `log-8` (`calibrate.mjs:376`, unchanged) | 19 match, the same functions |
| `log-p6`, `log-p6-w8` | compositions of the above with `p6` and `w8` | 21 and 22 match |
| `p1p5` and its six descendants | `p1p5-1`, `p1p5-2`, applied to the text appended by `log-4` | 21 each; `p1p5-main-p6-w8` 24 |
| `p6` | `p6-1` (`difficulty.js:253` to `326`) | 4 match; `measureV3` to `measureV3Core`, now shared with `rateDetailed` (DR-O07) |
| `w8` | `w8-1` (`worker-pool.js:75`, unchanged) | 3 match |
| every tree but `base` | `meta-2` (the tail of `SOURCE_FILES` in `tools/bench/report.js`, which now lists `replay.js`) | matches |

What the textual check cannot see is DR-O08: on `3fc65f4` the `p1p5` trees fail at the first accepted candidate, and
the `log` trees record no detail under `record`. Plan 5.1's semantic rebase already covers both. `boards.mjs check`
lists only the 25 Hell cells that the source no longer offers (DR-O15).

## 4. Generation steps under `gen-v4` (the orchestrator's item 2)

- **History (B, DR-O01).** Under the plan as written, the first `gen-v4` release makes the steps of every earlier set
  and puzzle, and of new puzzles on earlier saved sets, "not available". The presentation is P-OD14's (Q2 (a),
  Q3 (a)). Whether the release should do this is Q-O1.
- **The cache.** The key is two hashes of the replay request plus `ALGO_ID` and `APP_VERSION`
  (`replay-cache.js:71-77`). A `gen-v4` build never shows a step table saved under `gen-v3`, even a `matched` one; the
  8 saved entries leave by LRU (`storage.js`, `touchReplay`). Nothing to decide.
- **New stages (A, DR-O02).** The locate probes, screen-capped profiles, rescue re-ratings and budget ends need event
  kinds or reasons, a step builder that knows them (today it throws), sentences in English and Vietnamese, design
  §6.12 and the guides. This is inside the plan's scope (adopting the consumers of the replay) and inside P-OD14 ("the
  steps that generated the puzzle"). Hiding some of them would depart from P-OD14 and would be the owner's.
- **Cost (A, DR-O05, DR-O06).** The background replay of every generated puzzle (`07406cf`) costs more at Nightmare
  and Hell 1 under `gen-v4`. It is measured first; it goes to the owner only above a bound.

## 5. Question for the owner

**Q-O1. Generation steps of the piece sets and puzzles made before `gen-v4`.**

- *Why now.* IG-P-Q34 (b), "one running version", is the plan author's answer of 2026-11-15 22:03, checked on
  `e5bb721`, before the steps were in the interface: MP16a's dialog came at 22:47, P-OD14's table on 2026-11-16, and
  `07406cf`'s background replay and cache at 13:09. Plan v4 does not name the Generation steps.
- *What the plan as written does* (Derived from the code at `3fc65f4`):
  1. On the first `gen-v4` release, the section of every piece set and puzzle made before it says "The steps of this
     puzzle cannot be replayed. The piece set was made by another version of the generator." and shows one row: the
     stored puzzle with its score. This includes Very easy to Master, which `gen-v4` generates identically (plan
     section 3, "Scope").
  2. Every new puzzle made after the release on a piece set saved before it shows the same, for as long as that set
     is used: its set stage is `set-versions`, and a partial replay is `unavailable`.
  3. The 8 saved step tables are no longer found and leave by LRU.
  4. The same happens to every earlier record at phase 3, whose offers bring a new `POLICY_ID`. For every `gen-v4`
     record of any level it also happens at any change of P4's or `W_screen`'s table version, which IG-P-Q36
     compares whenever both records are `gen-v4`.
- *Already accepted.* The release notes of pull request #10 (`steps-table-2026-11-16.md:151-161`) and the design
  brief (`design-brief.md:29`) say that a set or puzzle made by an earlier version shows no steps. OD-P1 accepts that
  seeds give other puzzles under `gen-v4`.
- *Options.*
  - **(a) Keep IG-P-Q34 (b) as written.**
    - No work beyond stating it in the plan, the `gen-v4` release notes and both user guides.
    - The presentation is P-OD14's, and the refusal-case fixture stays the Hard `replay-case.json`.
    - Items 1 to 4 apply.
  - **(b) Keep the steps where the search does not change.**
    - A `gen-v4` build also replays `gen-v3` records of Very easy to Master, whose search `gen-v4` keeps; the plan's
      scope test proves the same puzzles. The table versions are compared only for Nightmare and Hell 1 records.
    - `gen-v3` Nightmare records, and sets made at Nightmare, stay unavailable.
    - The version rule becomes a list of accepted versions per level in `replay.js` and `pack.js`, with tests.
      Today's Hard fixture would then replay `matched`, so the refusal case needs another record, for example a
      `gen-v3` Nightmare one.
    - Phase 3's new `POLICY_ID` still makes records unavailable, unless the rule also accepts the old policy id for
      the levels whose areas did not change.
    - No new search code: one phase-2 task (Analysis).
  - **(c) Keep the steps of every `gen-v3` record.**
    - The replay picks the search by the record's `algo`: a `gen-v3` record of any level, Nightmare included, runs on
      the legacy search, which `gen-v4` keeps for Very easy to Master anyway.
    - This is IG-P-Q34's option (a), which the plan author rejected as "two replayable search paths in one build".
    - The legacy search must then stay equal to `gen-v3` at Nightmare as well, pinned by a `gen-v3` Nightmare replay
      fixture.
    - The same policy-id point as (b); more tests than (b).
- *Who decides.* The owner: a user-visible behaviour the request leaves open. (b) and (c) change the plan author's
  answer IG-P-Q34, whose technical rule the plan author may then confirm.

## 6. Files

- This file.
- `docs/improve-generating/evidence/drift/claude-opus-5.5/refs.mjs`: the read-only script of sections 2 and 3
  (`node docs/improve-generating/evidence/drift/claude-opus-5.5/refs.mjs --edits`). It reads `git show` output and
  writes nothing.

## 7. Addendum: cross-review of Astra's file 7 (2026-11-16, 14:21 to 14:24)

The sections above stay as written; where they differ, this addendum supersedes them. **Verdict after the
cross-review: breaking changes: no.** Final count: 0 B, 12 A (DR-O01 to DR-O11, DR-O17), 5 N (DR-O12 to DR-O16).

- **DR-O01: B to A; Q-O1 is withdrawn.** The behaviour is decided in recorded text, and no level is excepted:
  - plan v4 5.1, IG-P-Q34 (`plan.md:518-519`): "A `gen-v4` build replays `gen-v4` records only. A `gen-v3` record
    is "unavailable" by version (`set-versions`); it is never reinterpreted."
  - the release notes adopted with pull request #10 (`steps-table-2026-11-16.md:157-159`): "A puzzle whose steps
    cannot all be replayed (an imported puzzle, one made by an earlier version, or one made on a piece set saved by
    an earlier version) keeps the section, which says that its steps are not available and shows the stored puzzle
    with its score."
  - P-OD14 Q3 (a) (`check-list.md:319`) fixes only the presentation: "any `unavailable` replay, including partial
    provenance such as a set saved before set origins, is presented as the stored-puzzle row only".

  P-OD14 Q3 alone would leave open which records are unavailable; IG-P-Q34 and the release notes close it, for a
  Very easy to Master puzzle made under `gen-v3` and for a new puzzle on a set saved under it alike. A per-level
  compatibility rule (the former options (b) and (c)) would be a new proposal, not a consequence of the drift. What
  remains is A: state the consequence in plan 5.1, in the `gen-v4` release notes and in both user guides, which now
  say the steps are kept "also after a reload" (`USERGUIDE.md:156`).
- **DR-O17 (A), Astra's DR-A09, adopted; it corrects items 3 and 4 of the former Q-O1.** `replayKeyOf` hashes the
  running `ALGO_ID` and `APP_VERSION` (constant `1.0.0`) and the stored record, not the running
  `provenanceVersions()`, and the controller serves a saved result without replaying (`replay-model.js:967-972`).
  After a change of a table version alone the key does not change, so up to 8 saved `matched` tables would still be
  shown, bypassing IG-P-Q36's comparison. The key, or a check before a hit is served, must include the running
  tuple with both table versions, with a table-version-only test.
- **DR-O06 (A) absorbs Astra's DR-A10.** The client ends the job, which releases the auxiliary work, before
  `assemblePack` (`generation-client.js:1172-1185`), so background replays can start while the response is still
  being assembled. The bench digest does not cover the Generator's interface and cache, so a browser receipt pins
  the app snapshot as well.
- **DR-O11 stays A.** P-OD12 decided which fail-fast MP12b3 builds into `gen-v3`: "**no fail-fast** ... only "none"
  meets the rule that a mechanism with an observed false stop is not proposed. MP12b3 builds nothing of its part B"
  (`check-list.md:317`; D40, `:364`: "It is part of `gen-v3`"). Plan v4 proposes the bounded set attempts for the new
  `algo` that OD-P1 approved (`plan.md:325-327`: "When the first attempts all fail on the same side, the request ends
  with a notice instead of running to the stop"), freezes the "bounded-attempt policy" at stage 3 and validates
  "with P5 and the one deadline active and the uncapped search as the comparator for lost completions"
  (`plan.md:543-544`); IG-P-D1 counts "lost completions ... against the uncapped search". Compatible. The handling
  stands: count the bounded attempts' false stops apart from completion, report them when the policy is frozen, and
  change the user-facing statement (release notes, design 7.5) only with that evidence.
- **No disagreement** on Astra's other findings: DR-A01 to DR-A04 are DR-O12, DR-O13, DR-O09 and DR-O15; DR-A05 is
  DR-O04 with DR-O08; DR-A06 is DR-O14 (its wording "the only direct production caller" is better); DR-A07 is DR-O02;
  DR-A11 is DR-O05; DR-A12 is DR-O03. Astra keeps `ruleR4` at 709-778 and `reachable` at 1013-1075; the functions
  end at 773 and 1084 (section 2), a precision point only.
- **Mine, not in Astra's file:** DR-O07 (P6 against `replay.test.js:1111`), the `log` seam of DR-O08
  (`detail: null`), DR-O10 (a Hell 1 offer needs more than `AREAS`), DR-O11 and DR-O16 (the Generator page's board
  limits).

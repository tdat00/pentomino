# Pentomino difficulty-v3 — resume analysis after PR-P1 (pack revision)

| Field | Value |
|---|---|
| Date | 2026-11-13 (+07:00), after the plan author's answer to PR-P1 |
| Author | SA1, claude-opus-5.5 (author of the pentomino pack) |
| Source revision | `55c0c61` ("review from fable"), parent `a25960c` (the pause state); branch `rating-v3`, equal to `origin/rating-v3` |
| Inputs read | PR-P1 with the plan author's answer and P-OD9; `docs/difficulty-v3/working-status.md` (all); `tasks/difficulty-v3/check-list.md`; the task files MP12a (closing part), MP12b1, MP12b2, MP13a, MP13b, MP14a, MP14b, MP15a1, MP15a2, MP15b, MP16a, MP16b, MP17; `docs/difficulty-v3/calibration-slice-2026-11-13.md`; `core/engine/` (`policy.js`, `levels.js`, `clues.js`, `generate.js`, `difficulty.js`, `pack.js`, `protocol.js`, `tasks.js`, `types.js`, `carve.js`, `tiling.js`), `core/browser/generation-client.js`, `generator/state.js`, `generator/jobs.js`, `tools/bench/` (`report.js`, `runner.js`, `calibration-reference.js`, the BQ matrices), `tools/generate.mjs`, `tools/record-fixtures.mjs`, the tests they name, `docs/difficulty-v3/landscape-v3/` (`launch.mjs`, `criteria.mjs`) |
| Changed | `tasks/difficulty-v3/` (check-list, MP12b1, MP12b2, MP13a to MP17; new: MP12a closing addendum, MP12b3), `docs/difficulty-v3/clarifications.md`, `docs/difficulty-v3/clarifications-resolved.md`, this file |
| Not changed | code, tests, fixtures, generated files; `plan.md`, the reports, `working-status.md`, every record; the frozen MP12a task file; the Done column, the release record (except MP12b3 added to two gate rows and two new rows: the Hell availability, the open D20 question) and the execution summary (except the new MP12b3 row) |
| Runs | read-only `git` and `node -e` reads (the source identity, the landscape boards and cases, the Hell areas); `npm run check` (OK). No test, generation, landscape or timing run |

## 1. Summary

The revision brings the pack in line with the plan author's answer to PR-P1 and the owner decision P-OD9:

- **Records.** PR-P1 moved unchanged to `clarifications-resolved.md` Part I; P-OD9 added to Part H; D36 recorded as
  decided (i) and D37 as changed by P-OD9. `clarifications.md` keeps no open question for the plan author and lists the
  owner's open questions (D20; the questions MP12b2 will put with evidence).
- **Check-list.** 36 parts (MP12b3 added); the stop and review rules of P-OD9 (new subsection, D38); D36 decided (i);
  D20 with the plan author's recommendation, still open; new decisions D39 (Hell areas), D40 (fail-fast), D41
  (population R); D29 and D35 amended for the lock split (MP12b2 locks the tuple, MP12b3 completes the lock).
- **MP12a close.** A binding addendum (`MP12a-close-addendum.md`), because the task file is frozen.
- **MP12b1, MP12b2.** Amended for P-OD9 and PR-P1 (Hell reduced, no boundary case, no D36 question, the change-round
  rule, census handling, population R, the lock of the tuple, R7, TP34).
- **MP12b3.** Written (no longer conditional): the Hell `AREAS`, `POLICY_ID` `mixed-v3`, the fail-fast and the
  `require` rule as the owner answers at MP12b2, the end of the lock.
- **MP13a to MP17.** Anchors moved to `55c0c61`; the lock is complete at MP12b3; the `unrateable` reason where the
  fail-fast is built; MP17 with the two lock records, the plan §6 probe statement, the "no re-run allowance" of KI-1,
  R7 and the release notes on availability, fail-fast and population R.

No new question for the plan author. The owner's open question now is D20; MP12b2 will put four more with evidence.

## 2. Code state at `55c0c61`

### 2.1 Identity and the locked values

| Item | At `55c0c61` | Where |
|---|---|---|
| Source digest | `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`, equal to the 18 round-2 reports | `tools/bench/report.js` `computeSourceDigest` over `SOURCE_FILES` (lines 37-46) |
| Versions | `gen-v3`, `mixed-v2`, `xoshiro128ss-v1`, `difficulty-v3` | `currentVersions()` (`tools/record-fixtures.mjs:70`; it has no `app`, the reports do) |
| `SCORE_V3` | base `{ max: 12, scale: 3 }`, rule `[0, 0, 2, 3]`, weights `{ G: 5, info: 0.5 }`, penalty `{ few: 1, many: 2 }` | `core/engine/policy.js:60-66` |
| `DEDUCE.census` | 80,000,000 | `core/engine/policy.js:120` |
| `K60`, `POLICY_ID`, `STALL_LIMIT` | `K60` line 124 (unchanged values), `POLICY_ID` `'mixed-v2'` line 17, `STALL_LIMIT` 12 | `policy.js`, `clues.js:62` |
| Diff since `f33aa71` | `policy.js`, three tests, the two generation fixtures, `ui-flow-recipes.json` (exactly what MP12a's close addendum expects) | `git diff --stat f33aa71 HEAD` |

The tuple to lock is the tree's: `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)`. MP12a's close must not touch a
file of `SOURCE_FILES` (not even a comment), or MP12b1 loses the reuse of the 18 slice reports and MP12b2's
`Assert-CriteriaSource` fails; the stale comment of `SCORE_V3` therefore waits for MP12b3.

### 2.2 Availability, landscape and BQ matrices

- `AREAS` (`core/engine/levels.js:22-34`): Hell 1 `[164, Infinity]`, Hell 2 `[266, Infinity]`, Hell 3
  `[450, Infinity]`, Hell 4 `[744, Infinity]`. The typedef already allows `[Infinity, Infinity]` ("never generated");
  `pieceCountPlan` returns null outside the interval, `setAttempt` throws `RangeError` ("level … is not offered for …
  cells") and the client refuses with `level-unavailable`. Nothing reads availability on the read side: packs, links
  and codes made earlier keep opening (P-OD9's "still open" needs no code).
- `generator/state.js`: `LISTED_LEVEL_IDS` (line 114) is a frozen list "up to Hell-3"; `describeLevels` (715) gives
  the reasons `larger`/`smaller`; `restoreState` keeps a stored level only when listed (1045); the `N-UNIQUE-EXP`
  notice (820-823) does not check availability.
- The landscape (`buildLandscapeMatrix`): 105 cases on 16 boards (`6x10`, `3x29`, `10x10`, `12x12`, `14x14`,
  `15x15b10`, `16x16`, `15x20`, `18x18`, `18x20`, `20x20`, `20x21`, `32x15`, `22x22`, `24x24`, `26x26`); 25 Hell cases
  (Hell 1 on 12 boards from 196 cells, Hell 2 on 9 from 300, Hell 3 on 4 from 480). `20x20` and `32x15` come only from
  Hell rows of `REFERENCE_ROWS`, so retiring Hell rows without care would drop two boards and break
  `tests/calibration.test.js` (MP12b3 A5 keeps them).
- BQ matrices: Hell cases in `bq-0.json` 13 of 43, `bq-1.json` 9 of 18, `bq-2.json` 9 of 18, `bq-3.json` 8 of 14
  (360 to 676 cells); `checkMatrix` (`tools/bench/runner.js:110`, issue at 180) rejects a case that is not offered.
- `referencePolicyAgreement` compares both ends of a row's K with the policy within one piece: a row cut short by a new
  Hell end would fail it unless its K is recomputed (MP12b3 A5 does).

### 2.3 Facts the fail-fast rests on

- `selectClues` (`core/engine/clues.js:207`): `rateSubset` (249-283) returns `'spent'` for both an unrateable and an
  AR1-refused subset; `afterProfile` (387) is called once per profile; the failure result is at line 550
  (`uniqueness-not-proved` or `not-in-band`). An all-unrateable call ends today after 20 profiles with `not-in-band`
  (pinned by `tests/clues.test.js:703`).
- `setAttempt` already returns `{ ok: false, reason: cal.reason }`; `firstSetAttempt` (`generate.js:148-160`) has one
  caller, `tools/record-fixtures.mjs` (fixture recording); the CLI and the apps use the client, whose ordered scan
  ("The lowest successful attempt wins", `generation-client.js:647`) and `finally` abort fit F1 directly.
- The worker protocol does not validate set-attempt reasons (`parseWorkerMessage` passes `value` through), so a new
  reason needs no protocol change. The Generator's failure notice is one line in `generator/jobs.js:349` (`N-NOSET`).

### 2.4 Stale items found and where they are fixed

| Item | Fixed by |
|---|---|
| `core/engine/policy.js:58` "Defined but not yet the rating …" (stale since MP09d2); header comment `mixed-v2` | MP12b3 A3 (not MP12a's close: source digest) |
| Design §4.2 `SCORE_V3` comment "defined but not yet the rating"; §7.9 duplicated `verifyUndo`/`tieOrder` sentences | MP12a close addendum, step 6 |
| Design §7.5 interim D36 paragraph; §7.5, §10.3, brief, guides "to Hell 3"; README "ten levels" | MP12b3 A9 |
| MP09d2's availability observations (`eea5fed`) cannot be reused: MP12a changed `policy.js` | MP12b2 runs the availability probe again (TP25) |
| `currentVersions()` lacks `app` | MP12b1 compares the four version keys (already written) |
| `tests/benchmark-report.test.js:281-283` → 289-299 | check-list §3, MP15a1 |
| Line anchors of MP13a to MP17 (quoted at `60575a4`/`a80274b`) | §2.5 below |
| Leftover `tests/artifacts/site-tools-g8E02D` and `site-tools-z15ANF` (the EPERM incident; git-ignored) | none; left as they are (MP12a close and MP12b3 handle an EPERM as written) |

### 2.5 Anchor checks of the tasks not done

Every anchor below was checked at `55c0c61`; the left value is the old one, the right the new one. Anchors not listed
were found where the task says.

| Task | Moved anchors (old → new) | Checked unchanged |
|---|---|---|
| MP13a | `pack.js` `generation` read 978-979 → 1112; `readJsonObject` 323-337 → 340; `serializePack` 1292-1306 → 1481-1495; `createPack` `copyClaimJson` 1352-1354 → 1542; `if (generation !== null)` 1045 → 1181; `difficulty.js` `MODEL` 18 → 49; `clues.js` `rateSubset` 205-215 → 249-259; `completionCandidate` 222 → 224; `foldAccept` 486 → 495; `withAccepted(s, best)` 531-532 → 527-528; `PuzzleCandidate` 181-189 → 238-246; design §5.5 787 → 841, §6.10 1345 → 1399, §5.2 row 669 → 706; `tests/clues.test.js:303` → 327 | `PUZZLE_FIELDS` 55, `MAX_JSON_*` 38/39/30, `version.js:4`, `policy.js:17`, `rng.js:6-7`, `calibrationCandidate` 345, `foldStart` 385 |
| MP13b | design §13 fixtures 2659 → 2848, §10.5 2170 → 2354; client `generationMeta` 340 → 346, `finishSet` 665 → 686, `SetJobResult` 102 → 104, `BatchInput` 44 → 46, `checkBatch` 703 → 726, `generateBatch` 763 → 784, `checkOutcome` 872 → 893, `accept` 859 → 875, `generationMeta` call 1123 → 1143; `generator/state.js` `GeneratorState` 38-64 → 39, `freshSetExtras` 480 → 514, `withoutSet` 1624 → 1699, `removeAllPuzzles` 1484 → 1559, `SavedSet` 25 → 27, `savedSetOf` 854 → 888, `readSavedSet` 885 → 919, `acceptSet` 546 → 580, `PERSISTED_KEYS` 1091 → 1150, `generationOf` 1300 → 1375; `jobs.js` `generateSet` 255 → 302, `addMore` 316 → 354 | `tools/generate.mjs:562`, `:575` |
| MP14a | design §7.9 1647 → 1741, §6.10 1345 → 1399 | the event and seam names |
| MP14b | `carve.js` success return 552 → 550 (`if (allOk) return …`); design §6.5 1051 → 1105, §6.7 1212 → 1266 | `generate.js:86`, `:172`; `carve.js` 494, 514, 523, 281, 71; `tiling.js:498` |
| MP15a1 | `tests/benchmark-report.test.js:281-283` → 289-299; design §6.11 1425 → 1493 | `types.js:22`, `board.js:63`, `tests/bq-limits.test.js:116-122` |
| MP15b | `executeTask` 152 → 153; `GenerationClient` typedef 150 → 152; design §8.1 1764 → 1935 | `protocol.js` 17, 34-37, 397, 571, 660, 845-850 |
| MP16a | design §11.11 2443 → 2632 | `svg-board.js` 31, 467, 780; `tests/generator-i18n.test.js:23`; `share-dialog.js:288` |
| MP16b | `createCard` 287 → 317 (listeners 298-310 → 328-340); `mountPuzzlePanel` 156 → 186; `app.js` client 120 → 122, panel call 139 → 141, language handler 302 → 304, `destroy` 400 → 402; `puzzle-code-acceptance.js:33` → 34-35, `press` 2018-2023 → 2046-2050; design §10.5 2170 → 2354; developer guide "Code layout" 91 → 92; README "Features" 13-24 → 13-28 | user guides' Generator part (EN 41, VN 40) |
| MP17 | `K60` 109 → 124; `offeredLevels(360)` statement; the lock commit and records | `SHARES` line 18 |

## 3. Changes to the pack, and why

| File | Change | Why |
|---|---|---|
| `docs/difficulty-v3/clarifications-resolved.md` | Header; P-OD9 row (Part H); "Owner decision (P-OD9): (i)" at the end of D36; "Changed by P-OD9" at the end of D37; PR-P1 appended unchanged (same id) to Part I | The file's own rule: an answered question moves there unchanged; the owner decision is recorded where the others are |
| `docs/difficulty-v3/clarifications.md` | PR-P1 removed (moved); header names P-OD1 to P-OD9 and PR-P1; a short list of the owner's open questions (D20; MP12b2's four); "No question is open for the plan author" | Nothing in the answer needs the plan author again; D20 stays open as asked |
| `tasks/difficulty-v3/check-list.md` | Status (36 parts, link to this file); traceability to `clarifications-resolved.md`; anchors at `55c0c61`; §1 MP12b3 row, waves renumbered (MP13a 27 … MP17 36), MP13a depends on MP12b3; the parts paragraph (MP12 = four parts; the MP12a addendum); §2 waves; ownership rows MP12b2 (design §7.8 only) and MP12b3 (new); new subsection "Stops and reviews from the resume on"; §3 anchor; §4.1 rows P-OD9 and PR-P1; §4.2 D20, D29, D35, D36, D37 appended (history kept) and D38 to D41 new; §5 rows; §6 lock sentence; §7 GF-P2/GA-P2, GL-P3, GS-P3 rows and the MP12b3 ports; §9 rows (incl. D20 open); the execution summary row MP12b3 | P-OD9 and PR-P1; the new part; the review and stop rules; D20 open |
| `tasks/difficulty-v3/MP12a-close-addendum.md` (new) | The four closing steps of working-status §2.2 as binding orders: start check (identity, digest), fixture `--check` only, GA-P2 verification (UI-flow file, final `npm test`, the recipe scores, the EPERM exception), the quick set, the record (§7.2 finding, §8.5-§8.9, §9 "Handoff" with P-OD8, PR-P1 and the named items), design §7.8 (census change and exceptions; R7 known limitation), §7.9 (P-OD8; duplicates removed), §4.2 comment; no file of `SOURCE_FILES` touched | The task file is frozen at dispatch; P-OD8 and the answer must be recorded; the lock depends on the unchanged digest |
| `tasks/difficulty-v3/MP12b1-full-landscape.md` | P-OD9: 3-request prescreen of the 25 Hell cases, 20 requests only where it made a puzzle, no boundary case; the stop rule; reuse by digest and four version keys; the aggregate contract (coverage entries with `area`, `requiredN`, `status`, used by D39; list 3 marks "above 25 %"); self-tests, steps, acceptance; time 7.5-12.5 h | PR-P1 point 1; D39 needs the coverage fields |
| `tasks/difficulty-v3/MP12b2-search-evidence-and-lock.md` | No D36 question; the Hell evidence and the derived areas of D39 (table for MP12b3); population R with two extra captures per empty 18x20 cell and options (R-a), (R-b), (R-c); census above 5 % a finding, above 25 % to the owner; the fail-fast table as an owner question (F1, F2, F1 + F2, none; recommendation F1 + F2; notice draft EN/VN); the change-round rule of PR-P1; the availability probe now required (TP25); TP34 path note; lock of the tuple, design §7.8 with R7, the handoff to MP12b3; acceptance and test plan | PR-P1 points 1-3; the lock split |
| `tasks/difficulty-v3/MP12b3-hell-availability-and-fail-fast.md` (new) | Part A (always): D39 derivation checked against MP12b2's §9, `AREAS`, `POLICY_ID` `mixed-v3`, the two stale comments, `LISTED_LEVEL_IDS`, the reference rows (retired and split rows, 16 boards kept), the BQ matrices, the test table, a regression test that old packs still open, the documents. Part B (as answered): the `unrateable` result, F2, F1 in the serial and pooled paths, the notice, tests, documents. Part C (only with (R-a)): the `require` rule. Part D: GF-P2 (policy id only), GA-P2, the page(s) with MP16b's runner, the record `availability-<date>.md`, the §7.8 completion sentence | P-OD9: MP12b3 is no longer conditional; F1 + F2 and population R as PR-P1 asks |
| MP13a | Depends on MP12b3; lock wording; anchors; the `SelectResult` union may include `unrateable` (F2's early failure return gets no `skips`) | D35, D40 |
| MP13b | Anchors; GF-P4's time reference (MP12b3's log); the 10x6 Hard `require` recipe stays offered (an A0 of 60 or less would need an addendum) | D41 |
| MP14a | Anchors; F2 emits four `unrateable` events and no `selected` (case 8 extended, only when built) | D40 |
| MP14b, MP15b, MP16a, MP16b | Anchors (MP16b: MP12b3 edits `generator/state.js` too) | — |
| MP15a1 | Anchors; `setAttempt` may fail with `unrateable` (a replay failure there is the mismatch `set`) | D40 |
| MP17 | Lock commit always MP12b3's (checked by its subject); two records (MP12b2's values, MP12b3's availability); `lock-values.mjs` prints the Hell areas; `POLICY_ID` `mixed-v3`; `offeredLevels(360)` before and after; `MISS` exceptions from the availability record; the plan §6 probe statement; "no re-run allowance" for every run (KI-1, D1); R7 in the record; findings with the open named items; release notes on levels offered, fail-fast, population R, estimates above 5 %; `K60` line 124 | PR-P1 point 3 item 6, row F7, row R7; D35 |

## 4. Decisions applied, not questions

These follow from the plan, the answer or the records; they are written into the pack and are not put to anyone.

1. **The lock is split** (D35): MP12b2 locks the tuple (`SCORE_V3`, `DEDUCE`, `STALL_LIMIT`, `K60`, `SHARES`) and
   writes design §7.8; MP12b3 completes it (availability, policy id, fail-fast, `require` rule). The lock commit is
   always `difficulty-v3 MP12b3` now; MP17 checks its subject.
2. **`POLICY_ID` becomes `mixed-v3` in MP12b3**: design §5.4 ("Any change to … availability interval … requires a new
   id"), RES-01 ("Versions"), and D29's own precedent for `K60` and `SHARES`. Blast radius checked: `policy.js:17` and
   its header, the pin `tests/policy.test.js:343`, the two generation fixtures through GF-P2 (diff = the policy value
   only), design §5.4 and the §6.4 heading. `player/samples/sample-pack.json` keeps `mixed-v2` (D20).
3. **F1 and F2 stay inside `gen-v3`** (no algorithm id change): `gen-v3` is unreleased and the lock is not complete
   until MP12b3 (precedent: MP09c's unrateable handling and RES-15a changed `gen-v3` behaviour without a new id). A
   changed fixture puzzle or UI-flow recipe is a false stop and stops MP12b3.
4. **D39** turns "meets the same completion criterion as the other levels" into a rule: N = 20, `measured`, and
   `requestInBandRate` at least 0.9 (design §7.8: 90 % of the requests complete); a contiguous run from the smallest
   meeting case; the level's old lower end kept when no smaller case failed; `Infinity` as the upper end when the run
   reaches the largest case; contiguity between Hell levels (D35 of the design). MP12b2 computes it, MP12b3 applies it
   and stops on a difference.
5. **The Generator's list** follows `LISTED_LEVEL_IDS`' own definition ("levels the generator can ever offer"): a
   Hell level made nowhere leaves the list, as Hell 4 does today; a stored level or saved calibration that names it
   falls back as any unlisted id does (no migration). Locale keys stay (imported puzzles still name the levels).
6. **The reference table** keeps "row for row": rows wholly outside the new areas move to `RETIRED_REFERENCE_ROWS`; a
   cut row is split, its offered part taking the policy's K (the agreement check then holds), and the landscape keeps
   its 16 boards (the deterministic 20 x 24 board can join only if Hell 1 or 2 ends at 480 cells; recorded).
7. **The BQ matrices** lose only the cases no longer offered; the release-1 BQ records stay. Which level then carries
   the "60 seeds at the largest area" rule is a named item for a later qualification (not in difficulty-v3).
8. **The D36 slow test** (`tests/clues.test.js:564`) follows MP12a's re-pin table on the inputs still offered; if none
   is, it becomes a refusal test (the intended effect of P-OD9, not a stop); MP09c's scripted test keeps pinning the
   all-unrateable failure mode.
9. **Population R (R-a)** is built as a refusal at the same places as an unoffered level (engine `RangeError`, client
   `level-unavailable`, Generator message `M-UNIQUE-NOT-OFFERED`); the owner sets A0; (R-c) needs an addendum.
10. **Stops and reviews** (D38) are written once in the check-list and referenced by MP12b1 to MP12b3; the older task
    texts' "stop" wording that concerns correctness or a recorded decision stays (MP13a's loop bounds, MP15b's pool
    rule, MP17's lock and AR1 checks).

## 5. Dispatch order from now on

Strictly serial in this repository; the Sudoku repository shares the machine through the lock helper of check-list §7.

| # | Task | Prerequisites | Given with | Review |
|---:|---|---|---|---|
| 1 | MP12a (close) | this revision committed | the frozen task file and its TP29 developer addendum as dispatched, plus `MP12a-close-addendum.md` (binding) | orchestrator |
| 2 | MP12b1 | MP12a committed (`difficulty-v3 MP12a`) | the task file | orchestrator |
| 3 | MP12b2 | MP12b1 committed | the task file | analysts: the lock (SA1 and SA2) |
| — | owner | MP12b2's reply | the questions it asks (fail-fast; population R when asked; census cells above 25 %; a non-Hell cell without a puzzle if any) | the orchestrator records the answers in `clarifications-resolved.md` Part H (P-OD10 onward) |
| 4 | MP12b3 | MP12b2 committed; the answers recorded; an analyst addendum when the owner chose (R-c) or extended (i) to a non-Hell cell | the task file and the answers by id (with A0 for (R-a)) | analysts (SA1 and SA2) |
| 5-8 | MP13a, MP13b, MP14a, MP14b | the previous part committed | the task file | orchestrator |
| 9 | MP15a1 | MP14b committed | the task file | analysts (the replay comparison) |
| 10-13 | MP15a2, MP15b, MP16a, MP16b | the previous part committed | the task file | orchestrator |
| 14 | MP17 | MP16b committed; the D20 answer if the owner gave one (no task either way) | the task file | orchestrator; the release verdict is the owner's |

## 6. Dispatch briefs

What the orchestrator passes beyond the task file and the check-list:

- **MP12a (close).** The three documents of row 1. The developer starts from the committed tree (nothing of MP12a is
  uncommitted); it re-saves the lock helper (the 20-minute wait); it must not edit any file of `SOURCE_FILES`; GF-P2
  is `--check` only. Commit message `difficulty-v3 MP12a: Calibration slice: the GV2 cases again with v3, and the knob
  changes`.
- **MP12b1.** Confirm the MP12a commit and that the source digest is still `34cea386…`; the expected machine time
  (7.5-12.5 hours, bounded invocations, lock waits on top); the 25 Hell prescreens run first; a launcher stop or exit
  is a run-control failure for the orchestrator, not an owner question. Leave the two `site-tools-*` folders alone.
- **MP12b2.** The owner questions are asked in the reply and recorded without waiting; the task does not wait for the
  answers. The availability probe must run (the reuse check fails by design). The change round only by the rule of
  PR-P1; if the orchestrator orders one, the projection of 12-18 hours goes to the orchestrator first. The lock is
  reviewed by both analysts before the commit.
- **MP12b3.** The owner's answers verbatim with their Part H ids: the fail-fast choice (F1, F2, F1 + F2 or none), the
  population-R choice ((R-a) with A0, (R-b), or "not asked"), any census or non-Hell answer. The derived-area table
  of MP12b2's record §9 is the reference. Browser ports 8812/9312, MP16b's runner (its code block is in MP16b's task
  file). Both analysts review it.
- **MP13a.** Whether MP12b3 built the fail-fast (the `SelectResult` union and F2's early return).
- **MP13b.** The gate's time reference is MP12b3's `npm test`; when (R-a) was built, confirm A0 is above 60.
- **MP14a.** Whether F2 was built (case 8's extension).
- **MP14b, MP15a2, MP15b, MP16a, MP16b.** Nothing beyond the task file.
- **MP15a1.** Whether the fail-fast was built (a set failure in the replay is the mismatch `set`, whatever its
  reason). Reviewed by the analysts.
- **MP17.** The paths of the two lock records (MP12b2's `calibration-<date>.md`, MP12b3's `availability-<date>.md`);
  the open named items of both; the owner's D20 answer if any (the sample stays byte-for-byte either way unless the
  owner orders a task); machine time 70-100 minutes plus lock waits.

## 7. Questions

- **For the plan author:** none. Everything the revision needed is in the plan, the answer to PR-P1 and the records.
- **For the owner, open now:** check-list D20 (the Player's built-in sample; the plan author recommends leaving it
  byte-for-byte). Written in `docs/difficulty-v3/clarifications.md` ("Not questions for the plan author") and in the
  check-list §4.2 D20 and §9.
- **For the owner, at MP12b2 (asked by that task with its numbers):** the fail-fast (D40); population R (D41); any
  landscape cell above 25 % census estimates (D29); a cell that is not Hell without a puzzle, if any (D39). Listed in
  `clarifications.md` beside D20.

## 8. Risks and residual items

- **Hell 1 below 196 cells.** No landscape case lies between 164 and 195 cells; D39 keeps 164 when the 196-cell case
  meets. MP12b2's availability probe on 164 cells is reported beside it. A poor probe result there is an availability
  finding (named item), not a change of D39.
- **A 17th landscape board.** Only when Hell 1 or Hell 2 ends at 480 cells (the 32 x 15 case meets, 22 x 22 does not);
  harmless and recorded (MP12b3 A5).
- **F1 and the fixtures.** F1 also applies to `firstSetAttempt`, which records the fixtures: a fixture whose attempt 0
  was entirely unrateable would change. GF-P2's diff shows it and MP12b3 stops (a false stop), as written.
- **Test re-pins in MP12b3** depend on the derived areas, which are unknown until MP12b1: the A7 table gives the rule
  per test, and any other failing test is a stop.
- **Time.** A change round of MP12b2 would add 12-18 hours of machine time.

## 9. Estimates for the remaining parts

| Part | Developer time | Machine time under the lock (waits for the Sudoku repository on top) |
|---|---|---|
| MP12a close | 20-30 min | 10-15 min |
| MP12b1 | 45-60 min | 7.5-12.5 h |
| MP12b2 | 60-90 min | about 2-3.5 h (upper bound about 9 h) |
| MP12b3 | 60-90 min | 20-45 min (more when the D36 slow test needs re-observations) |
| MP13a to MP16b (nine parts) | about 7.5-8.5 h | MP13b's GF-P4 search (from minutes up to about 2 h), MP16b's GB-P4 (about 10 min) |
| MP17 | 50-60 min | 70-100 min |
| **Total** | **about 12-14 h** | **about 12-20 h** (plus 12-18 h if a change round is ordered) |

## 10. For the cross-reviewer (SA2, gpt-6-astra)

Under P-OD9 the analysts review only MP12b2's lock, MP12b3 and MP15a1. Please check:

1. `tasks/difficulty-v3/MP12b3-hell-availability-and-fail-fast.md` (new, whole): D39's rule and its implementation,
   the reference-row split and the 16 boards, the test table A7, F1 and F2 against MP12b2's `failfast.mjs`
   definitions, part C, part D (GF-P2 diff, GA-P2 without migrations, MP16b's runner), the record.
2. `tasks/difficulty-v3/MP12b2-search-evidence-and-lock.md`: "The Hell availability", "Population R", "Census
   estimates above 5 %", "The fail-fast proposal", the change-round rule, the lock statement and design §7.8 (R7).
3. `tasks/difficulty-v3/check-list.md`: "Stops and reviews from the resume on", §4.2 D29, D35 to D41, the §1 and §2
   rows of MP12b3.
4. `tasks/difficulty-v3/MP12a-close-addendum.md`: the digest constraint and the record and design texts that the lock
   relies on (R7, census exceptions).
5. `tasks/difficulty-v3/MP15a1-replay-runs.md`: the one added sentence on `unrateable`.
6. For completeness only (orchestrator-checked parts): MP12b1 (P-OD9 protocol), MP13a, MP14a and MP17 (the lock
   records, the plan §6 probe statement, the "no re-run allowance").

PENTOMINO PACK READY

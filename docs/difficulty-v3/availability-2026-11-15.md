# Hell availability, the fail-fast decision and the end of the lock (MP12b3, 2026-11-15)

Record of MP12b3 (gates GF-P2 and GA-P2, and the browser page `generator-editor`). English, written once. It completes the
lock that `docs/difficulty-v3/calibration-2026-11-15.md` (MP12b2) began: from the commit `difficulty-v3 MP12b3` on, no rating
and no generated puzzle changes. Every number comes from that record, from the aggregate it names or from a command logged in
section 7. The Hell levels are retired because of a limit of the present clue search, not because their bands are proved
unreachable under v3 (plan author's review PR-P2).

## 1. Header

| Item | Value |
|---|---|
| Date and machine | 2026-11-15 (+07:00), from 15:12; the locked runs 15:23 to 15:46. AMD EPYC 7763 64-Core Processor, 16 logical cores, 64 GiB; Windows, Node v26.13.0; Microsoft Edge 157.0.4341.60 (headless, for the page) |
| Code revision | `5ee9269` on `rating-v3` (HEAD; its parent `13d61fd` is MP12b2 with SA2's lock fixes PLK01-PLK05); working tree clean at the start apart from the git-ignored `tests/artifacts/` |
| Evidence the areas rest on | the aggregate in force, `docs/difficulty-v3/landscape-v3-full/aggregate-2026-11-14.json` (MP12b1; MP12b2 ordered no change round), and the calibration record sections 6 (population R), 9 (Hell availability), 10 (the fail-fast) and 13.2 (the questions to the owner) |
| Owner decisions applied | P-OD9 (check-list D36 (i): stop offering what v3 cannot make; the rule D39); P-OD12 (the fail-fast: none); P-OD13 (the census estimates above 25 %: accepted). Population R raised no question (calibration record section 6 and 13.2, question 2) |
| Identity at the start | `sourceDigest` `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`; versions `algo` `gen-v3`, `policy` `mixed-v2`, `rng` `xoshiro128ss-v1`, `model` `difficulty-v3`: the identity MP12b2 recorded |
| Lock helper and runner | `Invoke-Dv3Timed` of check-list section 7, saved as `tests/artifacts/MP12b3/dv3-lock.ps1` (equal to the check-list block and to MP12b2's copy; SHA-256 `7918D4A2EA1E0EA80F5E66B22C1C004A2663161E6866A6BF1568177F29A1075C`); the page runner `tests/artifacts/MP12b3/pages.mjs` is the code block of MP16b's "Running the pages", verbatim. Every command of more than about 10 s ran through the helper, one per acquisition of the lock |

## 2. The derivation of the Hell areas (A1)

The rule (check-list D39), applied to the aggregate in force by `tests/artifacts/MP12b3/derive.mjs` (read-only; output kept as
`tests/artifacts/MP12b3/derive-output.txt`): a case meets the criterion when its `requiredN` is 20, its status is `measured` and
its cell's `requestInBandRate` is at least 0.90 (design section 7.8: at least 18 of 20 requests complete ten in-band puzzles).
A reduced case (3 requests, no puzzle; P-OD9) never meets it. A level that no case meets is `[Infinity, Infinity]`; otherwise
the interval runs from the smallest meeting case to the end of the run of meeting cases, and Hell 2 is intersected with Hell 1
and Hell 3 with Hell 2.

**Hell 1** (before: `[164, Infinity]`)

| Case | Area | N (requests) | Status | `requestInBandRate` | Meets |
|---|---|---|---|---|---|
| 14x14-hell-1 | 196 | 20 | measured | 0.0 % | no |
| 15x15b10-hell-1 | 215 | 3 | reduced (P-OD9) | unavailable | no |
| 16x16-hell-1 | 256 | 3 | reduced (P-OD9) | unavailable | no |
| 15x20-hell-1 | 300 | 3 | reduced (P-OD9) | unavailable | no |
| 18x18-hell-1 | 324 | 3 | reduced (P-OD9) | unavailable | no |
| 18x20-hell-1 | 360 | 3 | reduced (P-OD9) | unavailable | no |
| 20x20-hell-1 | 400 | 3 | reduced (P-OD9) | unavailable | no |
| 20x21-hell-1 | 420 | 3 | reduced (P-OD9) | unavailable | no |
| 32x15-hell-1 | 480 | 3 | reduced (P-OD9) | unavailable | no |
| 22x22-hell-1 | 484 | 3 | reduced (P-OD9) | unavailable | no |
| 24x24-hell-1 | 576 | 20 | measured | 0.0 % | no |
| 26x26-hell-1 | 676 | 20 | measured | 45.0 % | no |

**Hell 2** (before: `[266, Infinity]`)

| Case | Area | N (requests) | Status | `requestInBandRate` | Meets |
|---|---|---|---|---|---|
| 15x20-hell-2 | 300 | 3 | reduced (P-OD9) | unavailable | no |
| 18x18-hell-2 | 324 | 3 | reduced (P-OD9) | unavailable | no |
| 18x20-hell-2 | 360 | 3 | reduced (P-OD9) | unavailable | no |
| 20x20-hell-2 | 400 | 3 | reduced (P-OD9) | unavailable | no |
| 20x21-hell-2 | 420 | 3 | reduced (P-OD9) | unavailable | no |
| 32x15-hell-2 | 480 | 3 | reduced (P-OD9) | unavailable | no |
| 22x22-hell-2 | 484 | 3 | reduced (P-OD9) | unavailable | no |
| 24x24-hell-2 | 576 | 3 | reduced (P-OD9) | unavailable | no |
| 26x26-hell-2 | 676 | 3 | reduced (P-OD9) | unavailable | no |

**Hell 3** (before: `[450, Infinity]`)

| Case | Area | N (requests) | Status | `requestInBandRate` | Meets |
|---|---|---|---|---|---|
| 32x15-hell-3 | 480 | 3 | reduced (P-OD9) | unavailable | no |
| 22x22-hell-3 | 484 | 3 | reduced (P-OD9) | unavailable | no |
| 24x24-hell-3 | 576 | 3 | reduced (P-OD9) | unavailable | no |
| 26x26-hell-3 | 676 | 3 | reduced (P-OD9) | unavailable | no |

| Level | Interval of its own cases | After the contiguity step |
|---|---|---|
| Hell 1 | `[Infinity, Infinity]` | `[Infinity, Infinity]` |
| Hell 2 | `[Infinity, Infinity]` | `[Infinity, Infinity]` |
| Hell 3 | `[Infinity, Infinity]` | `[Infinity, Infinity]` |

Hell 4 remains `[744, Infinity]` (above every board an app accepts, 676 cells at most); Hell 5+ remain `[Infinity, Infinity]` (never generated, as before).

**Match with the calibration record section 9: identical.** The 25 case rows above equal the 25 rows of that section's three tables
line by line (compared with `Compare-Object`: no difference), and the interval table equals its table "Written by MP12b3 as". No stop.

## 3. What changed (part A)

**3.1 `AREAS` (`core/engine/levels.js`).**

| Level | Before | After |
|---|---|---|
| very-easy, easy, normal, hard, expert, master, nightmare | `[30, 87]`, `[32, 215]`, `[36, 348]`, `[41, Infinity]`, `[50, Infinity]`, `[59, Infinity]`, `[81, Infinity]` | unchanged |
| hell-1 | `[164, Infinity]` | `[Infinity, Infinity]` |
| hell-2 | `[266, Infinity]` | `[Infinity, Infinity]` |
| hell-3 | `[450, Infinity]` | `[Infinity, Infinity]` |
| hell-4 | `[744, Infinity]` | unchanged |
| hell-5 and beyond | `[Infinity, Infinity]` | unchanged |

**3.2 The policy id and two stale comments (`core/engine/policy.js`).** `POLICY_ID` is `mixed-v3` (design section 5.4: an availability
change needs a new id). The header comment says `mixed-v3` and that it differs from `mixed-v2` only in availability. The stale sentence of
the `SCORE_V3` comment ("Defined but not yet the rating: `rate` stays `difficulty-v2` until the v3 activation.") is gone; the comment says
the knobs are the locked v3 knobs. No other line of the file changed: `SCORE_V3`, `DEDUCE`, `K60`, `K_CAP_FROM_HELL_1`, `SHARES`,
`STALL_LIMIT`, `deduce.js`, `difficulty.js` and `version.js` are untouched.

**3.3 The Generator's list (`generator/state.js`).** `LISTED_LEVEL_IDS` before: `very-easy`, `easy`, `normal`, `hard`, `expert`, `master`,
`nightmare`, `hell-1`, `hell-2`, `hell-3` (10); after: the first seven (Very easy to Nightmare), the levels offered on some area from 30 to 676
(a test pins it). No locale key changed (`level.name.hell-1` to `hell-3` still name the levels of imported puzzles) and no migration was added:
a stored `levelId` or a saved set's `calibrationFor` that names a level no longer listed is handled as any unlisted id (the default level, `null`).

**3.4 The reference table and the landscape (`tools/bench/calibration-reference.js`).** All 14 Hell rows (Hell 1 six, Hell 2 five, Hell 3
three) lie wholly outside their empty interval and moved, unchanged, to the new export `RETIRED_REFERENCE_ROWS`; no row was split, so no
forecast part and no 20 x 24 board arose. `REFERENCE_ROWS` went from 56 to 42 rows. `landscapeBoards()` takes the boards of both lists and
keeps the 16 boards of `cd5d17f` (`6x10`, `3x29`, `10x10`, `12x12`, `14x14`, `15x15b10`, `16x16`, `15x20`, `18x18`, `18x20`, `20x20`, `20x21`,
`32x15`, `22x22`, `24x24`, `26x26`; `20x20` and `32x15` come only from retired rows). `buildLandscapeMatrix()` is unchanged and gives 80 cases
(105 before), none at a Hell level; `referenceFor` searches `REFERENCE_ROWS` only.

**3.5 The BQ matrices (`tools/bench/matrices/bq-0.json` to `bq-3.json`).** Every case whose level is no longer offered on its board was
removed (all of them Hell cases) and nothing else (no seed, no repetition, no other case; two-space JSON, CRLF, final newline; each file
equals its `HEAD` version minus the Hell cases, checked case by case):

| Matrix | Removed | Cases before | Cases after |
|---|---|---|---|
| `bq-0.json` | 13: `d22x22-hell-1`, `-2`, `-3`; `d32x15-hell-1`, `-2`, `-3`; `dheart432-hell-1`, `-2`; `dirr466-hell-1`, `-2`, `-3`; `p18x20-hell-1`, `-2` | 43 | 30 |
| `bq-1.json` | 9: `d24x24-hell-1`, `-2`, `-3`; `d32x18-hell-1`, `-2`, `-3`; `dirr558-hell-1`, `-2`, `-3` | 18 | 9 |
| `bq-2.json` | 9: `d26x26-hell-1`, `-2`, `-3`; `d32x21-hell-1`, `-2`, `-3`; `dirr658-hell-1`, `-2`, `-3` | 18 | 9 |
| `bq-3.json` | 8: `pheart363-hell-1`, `-2`; `p22x22-hell-1`, `-2`, `-3`; `pirr466-hell-1`, `-2`, `-3` | 14 | 6 |

39 cases removed, 54 kept. The release-1 BQ records under `docs/calibration/` stay as written. The BQ rule "at least 60 seeds for Hell-1 at the
largest area" (design section 8.7) has no subject now: named item 1.

**3.6 The tests (A7, A8).** Every expected value follows the new `AREAS` and the rule, checked by hand. With the areas of A1 only two states
occur: the levels that are not Hell keep theirs, and Hell 1, 2 and 3 are *retired* (not listed, no row, no notice, refused by `setAttempt`
with a `RangeError`); "listed, not offered here" occurs nowhere, so no disabled Hell row is asserted.

| Test | Change | Why |
|---|---|---|
| `tests/levels.test.js` | the `AREAS` copy (Hell 1, 2, 3 `[Infinity, Infinity]`); "availability boundaries are exact" checks a retired level as offered on no area from 30 to 676; "business examples": `ids(360)`, `ids(484)`, `ids(676)` are `IDS.slice(3, 7)` (Hard to Nightmare); "lowest and highest level per area band": the rows of 215 to 450 cells end at `nightmare` | the intended contract change of P-OD9 |
| `tests/policy.test.js` | the four anchor rows `hell-1@360`, `hell-2@360`, `hell-3@484`, `hell-3@676` moved to "is null where a level is not offered"; "Hell caps bound the count" became "Hell 1, 2 and 3 are retired: no count at the largest area (P-OD9)" (null at 676); `POLICY_ID` `mixed-v3` | the levels are retired, so their ranges are null; the new policy id |
| `tests/bq-limits.test.js` | "Heart 363 is offered Hard to Nightmare and no board from 30 to 676 cells is offered Hell-3 (P-OD9)" | no area offers Hell 3 |
| `tests/bq0-matrix.test.js` | level lists (large desktop boards and Heart 432: Hard to Nightmare; phones 18x20: Hard and Nightmare); the 60-seed test is "has at least 20 seeds per cell; no Hell level is offered (P-OD9)"; the planning test's seed check names `d22x22-hard` (its seeds are distinct and as many as its `repetitions`, 20) and asserts that `planRuns` has no row of `d22x22-hell-1` | the edited matrix; the rule has no subject |
| `tests/bq-higher-matrix.test.js` | `SIX` is `['hard', 'master', 'nightmare']` and `FOUR` `['hard', 'nightmare']` (the names stay, with a comment); `p22x22` and `pirr466` are `FOUR`; the case counts are 9, 9 and 6; the 60-seed test keeps the 20-seed check of every case and its largest-area check and asserts that no case is a Hell level | the edited matrices |
| `tests/calibration.test.js` | 42 rows; `referenceFor('hell-1', 600)` and `referenceFor('hell-3', 470)` are `undefined` and their values (`nodeS` 48.6, the boards) are read from `RETIRED_REFERENCE_ROWS`; new: the 14 retired rows lie wholly outside their level's areas; new: `landscapeBoards()` has exactly the 16 ids and `buildLandscapeMatrix()` 80 cases, none at a Hell level | retired rows; the landscape of A5 |
| `tests/generator-state.test.js` | the 360 list is Hard to Nightmare and Hell 3 has no row (`undefined`, it was reason `larger`); the `N-UNIQUE-EXP` test: `hell-1` on 240 and 195 cells moves to `nightmare` with no notice; new: `LISTED_LEVEL_IDS` equals the levels offered on some area from 30 to 676 and is the seven named levels | retired level: not listed |
| `tests/generator-level-help.test.js` | `levelHelp('pieces', 'hell-1', 676)` is `null` (no plan, so the cap line shows nowhere) | retired level |
| `tests/clues.test.js` | the slow 22 x 22 `hell-3` test became a quick one that asserts the `RangeError` "level hell-3 is not offered for 484 cells" from `setAttempt` (no re-pin run: every input of MP09d2's C1 order is a Hell cell, so none is offered); MP09c's scripted test "unproved or unrateable subsets, none usable: 20 distinct subsets spent, no onRate" is unchanged and keeps pinning 20 profiles and `not-in-band` | the real-case premise is retired: named item 2 |
| `tests/browser/generator-editor.js` | the row count is `LISTED_LEVEL_IDS.length` (7); "360 squares offer Hard to Nightmare"; the Require check asserts that no row exists for `hell-1`, `hell-2`, `hell-3` at 360 cells and that no `N-UNIQUE-EXP` appears (names say so) | retired levels have no row |
| `tests/generator-import.test.js` (A8, one case) | a pack whose puzzle carries a `difficulty-v2` claim of `hell-1` on a 24 x 24 board (the frozen golden `large` of `tests/fixtures/puzzlecode-v1.json`): the code reads, `parsePack` reads its pack `ok` with the claim kept, the Generator imports it as an Imported set and one display-rating wish (`rate`) is asked and answered | packs and links made before still open; deviation from "20 x 20" in section 8 |

Not affected, and passing unchanged: `tests/cli.test.js:155`, `tests/puzzlecode-cli.test.js:540`, `tests/benchmark-matrix.test.js:58`,
`tests/generation-client.test.js:284`, `tests/protocol.test.js:219`, the level labels of `tests/player-i18n.test.js` and
`tests/generator-i18n.test.js`, `tests/fixtures/puzzlecode-v1.json`, `tests/clues.test.js:265`, `tests/puzzlecode-acceptance.test.js:401`,
`tests/generator-state.test.js` `nearestOfferedLevel('hell-3', 60)`, `tests/difficulty.test.js`, `tests/display-rating.test.js`,
`tests/puzzlecode.test.js`, `tests/policy.test.js` `pieceCountRange('hell-3', 449)` and the default 60-cell board's "Levels above Master need a
larger board." (`tests/generator-state.test.js`), and `tests/fixtures/ui-flow-recipes.json` (no recipe changed).

**3.7 The documents (A9).** `docs/design-detail.md`: sections 1.2 (R13, R14), 2 (D8, D14, D35), 4.2 (the `policy.js` and `levels.js` blocks), 5.2 (the generation-policy paragraph and its example),
5.4 and 5.5 (`mixed-v3`, the example), 6.4 (heading, Kcap and examples), 6.11 (the
`N-UNIQUE-EXP` note and the population-R limitation), 7.5 (the availability row, the range-of-levels table, the Hell availability paragraph,
the limitation of P-OD12, and the 14 Hell rows of the parameter table under "Measured before difficulty-v3, no longer offered"), 7.8 (the census
sentence of P-OD13, and the lock bullet's parenthesis and completion sentence), 8.7 (the matrices and the matrix rules), 10.3 and 10.7 (the level
table, the `N-UNIQUE-EXP` notes), 13.2 (the `policy` and `levels` rows), 13.4 (the nightly subset), 14.2 item 7; `docs/design-brief.md` (the
Require clause, the difficulty sentence, the two table rows: 18x20 Hard to Nightmare "Hard 16–18; Nightmare 25–28", 22x22 Hard to Nightmare
"Hard 17–19; Nightmare 27–30", the counts recomputed with `pieceCountRange`); `USERGUIDE.md` and `USERGUIDE.vn.md` (seven levels, the table "to
Nightmare" / "đến Ác mộng", the difficulty sentence in both languages); `README.md` (seven levels); the meta texts of `index.html` (four) and
`generator/index.html` (five). The sweep (`Select-String` of the task over the guides, the brief, the design, the README and the two pages): every
hit either follows the new table or is historical. Historical or ladder definitions kept as written: the ladder and band tables (R2, D9, D12, D34,
the K60 and Kcap formula, sections 7.4 and the v2 reachability bound), the clue-search rationale of sections 6.10 to 6.11 (the stall stop's
Hell 3 example, the certificate evidence), the puzzle-code title rule (Hell labels of stored claims), the Player's 22 x 22 Hell-3 pack check
(packs still open), the risk row of section 14.1 and Appendix A. `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` state no level count or Hell
availability (one unrelated hit, "mixed-version graph"), so they did not change.

## 4. Parts B and C: not built

**Part B, the fail-fast: not built (owner decision P-OD12, none).** Of the measured rules only "none" meets the zero-observed-false-stop rule
(calibration record section 10: F1 2 false stops in 7 triggers, F2 17 in 67, F1 + F2 5 in 21; at Nightmare F2 lost 11 of its 18 triggered calls
and F1 + F2 4 of 4). So no `unrateable` result, no `FAIL_FAST_PROFILES`, no notice, and no change of `clues.js`, `generate.js`, `types.js`,
`core/browser/`, `generator/jobs.js`, `tools/generate.mjs` or the locales. The limitation is written in design section 7.5: a calibration whose clue
subsets are all unrateable still ends `not-in-band` after 20 spent profiles, and a set request whose attempts all end so runs to its time limit with
no puzzle (in the two-worker flow `N-NOSET` after the 115 s dispatch stop). Building a mechanism needs the owner's explicit override of P-OD12 and an
addendum to MP12b3's task.

**Part C, `require` at Hard and above: not built (population R needed no question).** Every 18x20 cell made puzzles with `--uniqueness require`
(calibration record section 6: Hard 2 of 10 in its request, `partial`, `difficulty-not-found`; Expert and Master 10 of 10). So no
`REQUIRE_FROM_HARD_MAX_AREA`, no `uniquenessOffered`, no `M-UNIQUE-NOT-OFFERED`, no refusal, no locale change. The measured limitation is written in
design section 6.11 (and section 14.2, item 7).

## 5. Census estimates above 25 %: accepted (owner decision P-OD13)

The estimated ratings of the 17 cells that are not Hell with more than 25 % census estimates stay at `DEDUCE.census` 80,000,000, with the estimate
note and the `censored` flag, as P-OD7 and P-OD8 accepted 18x20 and 10x10 Master. The 17 (calibration record 13.2, question 3): Nightmare on 3x29
(96.0 %), 10x10 (97.0 %), 12x12 (76.8 %), 14x14 (38.1 %), 15x15b10 (34.0 %), 16x16 (39.2 %), 15x20 (49.2 %), 18x18 (49.0 %), 18x20 (49.5 %),
20x20 (57.0 %), 20x21 (54.0 %), 32x15 (63.5 %), 22x22 (63.5 %), 24x24 (84.5 %) and 26x26 (97.0 %); Master on 24x24 (28.5 %) and 26x26 (39.5 %). The
three Hell 1 cells (14x14: 5 of 5 puzzles, 24x24: 13 of 13, 26x26: 134 of 134) are historical: Hell 1 is offered nowhere. No code change; design
section 7.8 says so in one clause.

## 6. GF-P2: the policy id only

`node tools/record-fixtures.mjs --replace --reason "P3: Hell availability (D36 (i), P-OD9), policy mixed-v3"` wrote `fixture-set-0`; `--check`: OK.
`git --no-pager diff -- tests/fixtures player/samples` (kept as `tests/artifacts/MP12b3/gf-p2-diff.txt`) shows exactly two changed lines:

| File | Line |
|---|---|
| `tests/fixtures/generation-case.json` | `"policy": "mixed-v2"` to `"policy": "mixed-v3"` (`versions`) |
| `tests/fixtures/generated-sample-pack.json` | `"policy": "mixed-v2"` to `"policy": "mixed-v3"` (`generation.policy`) |

**No puzzle changed**: no piece, clue, layout key or score moved in either fixture; `player/samples/sample-pack.json` and
`tests/fixtures/puzzlecode-v1.json` are unchanged. Both fixtures stay CRLF without BOM.

## 7. The gates

Every command through `Invoke-Dv3Timed`, one per acquisition of the lock, with its 15 s gap; the lock wait is measured apart from the command's time.
The Sudoku repository ran its own gates under `dv3-sudoku.lock` during the whole task.

| Invocation (label) | Command | Result | Start-end | Seconds | Lock wait (s) |
|---|---|---|---|---|---|
| MP12b3 targeted tests | `node --test --test-skip-pattern=slow` on the ten files of the task (`levels`, `policy`, `bq-limits`, `bq0-matrix`, `bq-higher-matrix`, `calibration`, `generator-state`, `generator-level-help`, `generator-import`, `clues`) | exit 0; 202 tests, 202 pass | 15:23:52-15:24:00 | 8.1 | 20.1 |
| MP12b3 GF-P2 replace | `node tools/record-fixtures.mjs --replace --reason "..."` | exit 0; wrote `fixture-set-0` | 15:30:12-15:30:13 | 1.2 | 80.2 |
| MP12b3 GF-P2 check | `node tools/record-fixtures.mjs --check` | exit 0; `record-fixtures: OK` | 15:30:28-15:30:30 | 2.0 | 0.0 |
| MP12b3 fixture-dependent files | `node --test --test-skip-pattern=slow` on the 11 files of the task (`generate`, `cli`, `puzzlecode-cli`, `generation-client`, `calibration`, `benchmark-matrix`, `player-load`, `rate-probe`, `generator-state`, `generator-controller`, `pack`); TAP in `tests/artifacts/MP12b3/fixture-dependent.txt` | exit 0; 318 tests, 40 suites, 318 pass | 15:32:18-15:32:38 | 20.0 | 65.1 |
| MP12b3 quick set | `node --test --test-skip-pattern=slow "tests/**/*.test.js"`; TAP in `tests/artifacts/MP12b3/quick-set.txt` | exit 0; 1,345 tests, 124 suites, 1,345 pass, 0 fail | 15:35:34-15:35:57 | 23.4 | 160.2 |
| MP12b3 GA-P2 | `node --test "tests/**/*.test.js"` (the final `npm test`; its first run, TAP in `tests/artifacts/MP12b3/ga-p2-first.txt`) | exit 0; 1,364 tests, 125 suites, 1,364 pass, 0 fail, 0 cancelled, 0 skipped; no `EPERM` in the cleanup of `tests/site-tools.test.js` | 15:41:09-15:43:11 | 122.1 | 285.5 |
| MP12b3 page generator-editor | `node tests/artifacts/MP12b3/pages.mjs --task MP12b3 --http 8812 --cdp 9312 --evidence tests/artifacts/MP12b3/pages/1 generator-editor` | exit 0; `PASS generator-editor [main] 2 s, result pass, "PASS 29/29", errors 0`; no CSP violation and no uncaught error (the page's own check and the runner's error list are empty); the runner stopped its server and Edge by PID and removed the profile `tests/artifacts/edge-MP12b3/`; ports 8812 and 9312 are free | 15:45:36-15:45:45 | 9.0 | 130.2 |

Totals: 7 invocations, 185.8 s of command time, 741.3 s of lock wait (the longest 285.5 s; none near the 20 minutes). Single test files that ended
within 10 seconds, `derive.mjs` and the conventions checks ran outside the helper while the work was in progress. No UI-flow recipe changed; no
migration was needed. The counts against MP12b2's final run (1,360 tests; quick 1,340): +5 quick tests (two in `calibration`, one each in
`generator-state` and `generator-import`, and the converted `clues` test, which was `slow:` before) and the converted slow test leaving the slow tier:
1,364 and 1,345.

## 8. Notes for the cross-review

1. **A8's board.** The task's example is a `difficulty-v2` claim of `hell-2` on a 20 x 20 board "built like that file's other packs"; every pack the file
   builds is 6 x 10 and no 20 x 20 pack exists among the fixtures. The test uses the frozen 24 x 24, 40-piece golden of `tests/fixtures/puzzlecode-v1.json`
   (`large`: a `difficulty-v2` claim of `hell-1`, score 102): a Hell level that was offered on its 576 cells until now and is offered on no board
   after this task, with no pack built by hand and no fixture touched. The behaviour asserted is the one the task lists.
2. The names `SIX` and `FOUR` in `tests/bq-higher-matrix.test.js` are kept as the task's table gives them (their values are now three and two levels),
   with a one-line comment.
3. Edits beyond the task's list of design places, each a sentence that would otherwise say the opposite of the code: the R14 row (hell-1 37–42 is the
   formula's count, not offered), the Kcap bullet and the examples bullet of section 6.4, and the nightly subset of section 13.4 ("hard and
   nightmare", the levels offered there).
4. Writing the tests, no assertion was weakened beyond the stated contract change; no test was skipped or deleted (one `slow:` test became a quick test
   by the table's rule).

## 9. The identity of the locked tree and the lock

`sourceDigest` (`computeSourceDigest` over `SOURCE_FILES`) and `currentVersions()` printed after the final `npm test`:

```text
{"sourceDigest":"f74c1cad56dfb457af53ac8ce310bc366c1944e58ff6a25cd4eecf19dc2949ba","versions":{"algo":"gen-v3","policy":"mixed-v3","rng":"xoshiro128ss-v1","model":"difficulty-v3"}}
```

The digest changed from `34cea386…77918` (MP12b2's) because `core/engine/levels.js` and `core/engine/policy.js` changed; `policy` is `mixed-v3`, every
other version is as at MP12b2. The only files of `core/` and `tools/` that changed are `core/engine/levels.js` (`AREAS`), `core/engine/policy.js`
(`POLICY_ID` and two comments), `tools/bench/calibration-reference.js` and the four BQ matrices; `generator/state.js` changed only in
`LISTED_LEVEL_IDS` and its comment.

**Statement.** MP12b3 completes the lock. The `difficulty-v3` rating (`SCORE_V3`, `DEDUCE`), the clue search (`gen-v3`, `STALL_LIMIT`), `K60`, `SHARES` and
the availability (the Hell `AREAS`: no Hell level is offered on any board up to 676 cells, P-OD9; the policy id `mixed-v3`) are locked at the commit
`difficulty-v3 MP12b3`: no fail-fast (P-OD12) and `require` unchanged (population R made puzzles). From that commit on no rating and no generated puzzle
changes (MP13a to MP17). Any later change of a weight, a cap, a band, an availability interval, a rule of the deduction ladder, the census, a counter, the
clue search, `SHARES` or `K60` needs a new model, algorithm or policy id and a new qualification (RES-01). The offered levels for MP17's probe:
`offeredLevels(60)` is Very easy to Master and `offeredLevels(360)` Hard, Expert, Master and Nightmare. No failure reason `unrateable` exists: the
`SelectResult` of MP13a and the events of MP14a keep `not-in-band` and `uniqueness-not-proved`.

## 10. Named items for MP17 (owner decision P-OD9: findings with their numbers, no stop)

1. **The BQ rule for Hell-1 (design section 8.7).** "At least 60 seeds for Hell-1 at the largest area" has no subject while no Hell level is offered; the four matrices
   lost their 39 Hell cases. Which level is the slowest at the largest areas, and whether 576 cells still need BQ-1, is for a later qualification outside
   difficulty-v3.
2. **The fail-fast limitation (P-OD12), for the release notes.** A calibration whose clue subsets are all unrateable ends `not-in-band` after 20 spent profiles
   (about 2.1 s per capped rating, calibration record section 10), and a set request whose attempts all end so runs to its time limit and ends with no puzzle
   (`N-NOSET` after the 115 s dispatch stop in the two-worker flow). It can still happen below Hell: Nightmare on 12x12, 14x14, 15x15b10, 16x16 and 15x20
   completes below 90 % of its requests (calibration record section 13.1). The slow 22 x 22 `hell-3` real case is retired; MP09c's scripted test pins the
   all-unrateable call.
3. **The population-R limitation, for the release notes.** With `--uniqueness require`, 18x20 Hard made 2 of 10 puzzles in its request (`partial`,
   `difficulty-not-found`; the repair of a Hard candidate almost always destroys its only decisive guess); Expert and Master made 10 of 10.
4. **Dead paths while no Hell level is listed.** The `N-LEVELS` "above" notice shows on no board of 81 cells or more any more (no listed level lies above
   Nightmare); `N-UNIQUE-EXP` cannot appear (the code, `FIRST_HELL_INDEX` and the locale texts stay for a later policy).
5. **The landscape without Hell cases.** The landscape matrix has 80 cases (105 before): `tools/calibrate.mjs --cases` and `tools/rate-probe.mjs --landscape`
   find no Hell case id (for example `14x14-hell-1`). The evidence stays in the MP12b1 and MP12b2 reports and in `RETIRED_REFERENCE_ROWS`.
6. **The census acceptance (P-OD13).** 17 non-Hell cells ship with the estimate note and the `censored` flag (section 5).
7. **A later search.** The Hell areas are re-derived by the same rule (check-list D39) if the clue search improves (`docs/improve-generating/plan.md`, not
   authorised); the bands are not shown to be unreachable (PR-P2).

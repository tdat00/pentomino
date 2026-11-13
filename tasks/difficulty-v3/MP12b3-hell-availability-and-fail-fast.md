# MP12b3 — Hell availability (D36 (i)), the fail-fast and the end of the lock

| Header | Value |
|---|---|
| ID | MP12b3 (fourth part of the report's MP12; no longer conditional since owner decision P-OD9; it completes the lock that MP12b2 began, check-list D35) |
| Depends on | MP12b2 (accepted and committed: the record `docs/difficulty-v3/calibration-<date>.md` with the derived Hell areas of its §9, the aggregate in force, the lock of the tuple); the owner's answers to MP12b2's questions (the fail-fast; population R when it was asked; any other), recorded by the orchestrator in `docs/difficulty-v3/clarifications-resolved.md` Part H and named in the dispatch |
| Estimated size | Large: part A about 600–900 changed lines (`levels.js` about 15, `policy.js` about 5, `generator/state.js` about 10, `tools/bench/calibration-reference.js` about 60, the four BQ matrices (cases removed), tests about 250, documents about 150, the record about 120); part B, when built, about 250–350 more (`clues.js` about 25, `generate.js` about 15, the client about 15, `generator/jobs.js` about 10, locales 4, tests about 150, documents about 50); part C, when built, about 150–250 more. About 60–90 minutes of developer work plus about 20–30 minutes of machine time under the lock (GF-P2, the fixture-dependent files, the quick set, `npm test`, one or two browser pages) |
| Owner role | Engine and Generator |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/clarifications-resolved.md` Part H P-OD9 and Part I PR-P1 (the plan author's answer) and D36 (decided (i)); `docs/difficulty-v3/report-detailed.md` RES-01 ("Versions": `POLICY_ID` becomes `mixed-v3` when P3 changes a table of the policy), RES-25 (calibration and lock); design-detail §5.4 (an availability change needs a new policy id), §7.5 (availability, D35), §7.8 (acceptance: at least 90 % of the requests complete); check-list §4.2 D20, D29, D35, D36, D38, D39, D40, D41 and §7 |
| Gates owned | GF-P2 (the generation fixtures re-recorded for the new policy id only; their puzzles must not change), GA-P2 (the final `npm test`), the browser page `generator-editor` (and `generator-flow` when part B is built) |
| Implementation status | Not started |

## Goal & business context

The owner asked that Hard be really hard and that every level the Generator offers be one it can make. Under v3 a
capped search gives no rating (SA2-Q-P02), so on large boards the Hell levels cannot be rated and requests for them
end after two minutes without a puzzle (D36). The owner has decided (P-OD9): stop offering what v3 cannot make. This
task sets the board areas of the Hell levels from the landscape that MP12b1 measured: a Hell level stays offered only
where its 20-request run completed as the other levels must; elsewhere it is not offered, and a Hell level made
nowhere is never generated (`[Infinity, Infinity]`). The Generator's level list, the design, the brief and both user
guides follow. Packs and links made earlier still open, and their puzzles are re-rated for display as before.

When the owner agreed at MP12b2, it also builds the fail-fast (the plan author recommends F1 + F2): a request whose
difficulty ratings all reach their work limits ends in seconds with a clear notice, because irregular boards can still
meet such sets after the Hell levels are hidden. When the owner accepted the population-R outcome, it stops offering
`require` (a proven unique solution) at Hard and above on the areas the owner set.

Then the lock is complete: from this task's commit on, MP13a to MP17 change no rating and no generated puzzle.

## Scope

### In scope

- **Part A (always): the Hell areas.** `AREAS` of `core/engine/levels.js` by check-list D39; `POLICY_ID` to
  `mixed-v3` (design §5.4: availability is part of the policy); the Generator's level list; the reference table and
  the landscape boards of `tools/bench/calibration-reference.js`; the four BQ matrices; the tests that pin the old
  areas; design-detail, the brief, the user guides and the README; the stale `SCORE_V3` comment of
  `core/engine/policy.js`.
- **Part B (only as the owner answered at MP12b2): the fail-fast** F1, F2 or F1 + F2 (check-list D40).
- **Part C (only when the owner accepted option (R-a) of MP12b2): `require` at Hard and above** not offered from the
  owner's area (check-list D41).
- **Part D (always): the end of the lock.** GF-P2 for the new policy id, GA-P2, the browser page(s), the record
  `docs/difficulty-v3/availability-<date>.md` (new) and the lock sentence of design §7.8.

### Out of scope

- Any change of `SCORE_V3`, `DEDUCE`, `K60`, `SHARES`, `STALL_LIMIT`, a band or a rating: the tuple is locked
  (MP12b2).
- The areas of a level that is not Hell, unless an addendum carries the owner's answer for such a cell (MP12b2 §9).
- A new browser qualification (BQ runs), and option (iii), a faster first-solution search: later work outside
  difficulty-v3.
- Re-running the landscape or any measurement of MP12b: the areas come from the recorded evidence.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Save the helper `Invoke-Dv3Timed` of check-list §7 verbatim as `tests/artifacts/MP12b3/dv3-lock.ps1` and dot-source
  it in every call. Every test run, every `tools/record-fixtures.mjs` run and every browser page goes through it: one
  bounded command per acquisition of the lock, at most 590 s, at least 15 s between releasing the lock and taking it
  again (the helper waits). Only `npm run check`, the CRLF check, the derivation script of part A (it reads JSON
  files) and, while you work, a single test file that ends within 10 seconds run without it.
- **Stops (owner decision P-OD9, check-list D38).** Stop and report for a correctness failure: a test that fails and
  is not in the tables below, a generated puzzle or fixture puzzle that changes, a derived area that differs from
  MP12b2's record, an owner answer that this task cannot implement as written. A performance or availability
  observation is a named item in the record, never a stop.
- Browser pages: headless Microsoft Edge through CDP with the runner of MP16b: copy the code block of its "Running the
  pages" verbatim to `tests/artifacts/MP12b3/pages.mjs` (scratch; it serves the repository, uses the profile
  `tests\artifacts\edge-MP12b3\` from `--task`, stops its own processes by PID, removes the profile, also on failure,
  and refuses a busy port) and run it with `--task MP12b3 --http 8812 --cdp 9312`, one page per lock (the commands
  below). If it fails on this machine, report the error rather than changing the procedure; a busy port is reported,
  never freed by stopping someone else's process.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md`, `clarifications-resolved.md`, the reports, the earlier records or `docs/calibration/` (the
  release-1 qualification records stay as written). UTF-8 without BOM, CRLF, final newline, no trailing whitespace,
  no absolute path in a document.

## Inputs & context

Line anchors are at HEAD `55c0c61` (MP12a's close, MP12b1 and MP12b2 change no code): find a moved line by the
quoted text.

- **The evidence.** The aggregate in force: MP12b1's `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json`,
  or the change round's `docs/difficulty-v3/landscape-v3-change-1/aggregate-<date>.json` when MP12b2 ran one
  (`{ aggregate, coverage, lists, source }`). Its `coverage` gives per case `caseId`, `area`, `requiredN` and `status`
  (`measured` or `reduced (P-OD9)`); `aggregate.cells` gives per case (`caseId`) the `requestInBandRate`. MP12b2's
  record §9 gives the derived areas, one table per Hell level; §6 population R and the owner question; §10 the
  fail-fast table and the owner question; §13 the named items.
- **The owner's answers** (the dispatch names them): the fail-fast (F1, F2, F1 + F2 or none) and, when it was asked,
  population R ((R-a) with the area A0, (R-b) or (R-c)).
- `core/engine/levels.js`: `const AREAS = [` (lines 22-34; Hell 1 `[164, Infinity]`, Hell 2 `[266, Infinity]`, Hell 3
  `[450, Infinity]`, Hell 4 `[744, Infinity]`); the typedef already reads "`[Infinity, Infinity]` = never generated"
  (line 13), and `levelAt` gives `[Infinity, Infinity]` to every level beyond the table; `offeredLevels(area)` (line
  109) tests `area >= AREAS[i][0] && area <= AREAS[i][1]`.
- `core/engine/policy.js`: header comment (line 2, "Final generation policy `mixed-v2` …"); `POLICY_ID = 'mixed-v2'`
  (line 17); the comment of `SCORE_V3` (line 58: "Defined but not yet the rating: `rate` stays `difficulty-v2` until
  the v3 activation.", stale since MP09d2); `pieceCountPlan` returns null outside `lv.areas` (line 325), so
  `pieceCountRange` is null and `setAttempt` throws `RangeError('level <id> is not offered for <area> cells')`
  (`core/engine/generate.js:93-96`), and the client refuses with `level-unavailable`
  (`core/browser/generation-client.js`, `checkSet`, line 534).
- `generator/state.js`: `LISTED_LEVEL_IDS` (line 114, comment "Levels the generator can ever offer (areas up to 676):
  Very easy … Hell-3."), `describeLevels` (line 715: a level not offered gets the reason `'larger'` when the area is
  below `areas[0]`, else `'smaller'`), `nearestOfferedLevel` (line 386), `generationBlock` (line 1322,
  `M-LEVEL-NOT-OFFERED`), the `N-UNIQUE-EXP` notice (lines 820-823: `require`, a Hell level, more than
  `UNIQUE_STANDARD_AREA` = 200 cells), `restoreState` keeps a stored `levelId` only when it is listed (line 1045).
- `tools/bench/calibration-reference.js`: `REFERENCE_ROWS` (line 80, "The §7.5 table, row for row": 56 rows, the Hell
  rows at lines 126-141), `landscapeBoards()` (line 190: the boards of the rows), `buildLandscapeMatrix` (line 214:
  every board times `offeredLevels(board.area)`), `referenceFor` (line 241). At `55c0c61` the landscape has 105 cases
  on 16 boards; the boards `20x20` and `32x15` come only from Hell rows (`hell-2 301-420` and `hell-3 450-484`).
- `tools/bench/runner.js`: `checkMatrix` (line 110) adds the issue "`<level>` is not offered for a board of `<area>`
  cells" (line 180). The BQ matrices `tools/bench/matrices/bq-0.json` to `bq-3.json` (CRLF JSON) hold Hell cases on
  boards of 360 to 676 cells; `tests/bq0-matrix.test.js` and `tests/bq-higher-matrix.test.js` require every case to be
  offered and pin the level lists.
- Part B: `core/engine/clues.js` (`SelectResult`, lines 45-48; `STALL_LIMIT`, line 62; `selectClues`, line 207;
  `rateSubset`, lines 249-283, which spends a profile on an `IncompleteRatingError`; `afterProfile`, line 387;
  the failure result, line 550); `core/engine/generate.js` (`setAttempt` returns `{ ok: false, reason: cal.reason }`;
  `firstSetAttempt`, lines 148-160; `puzzleCandidate` and `completionCandidate` return `{ fail: sel.reason }`, lines
  204 and 242); `core/browser/generation-client.js` (`SetJobResult` near line 103; `generateSet`, the ordered scan
  "The lowest successful attempt wins" at line 647); `generator/jobs.js` (`generateSet`, line 302, `N-NOSET` at line
  349); `tools/generate.mjs` (line 559, "no … piece set was found (reason)"). MP09c's quick test "unproved or
  unrateable subsets, none usable: 20 distinct subsets spent, no onRate" (`tests/clues.test.js:703`) pins today's
  all-unrateable call: 20 profiles, `not-in-band`.

### Part A: the Hell areas (always; check-list D39)

**A1. The derivation.** For each Hell level L in `hell-1`, `hell-2`, `hell-3`, from the aggregate in force:

```text
cases(L)  = the coverage entries of L, in ascending area (the landscape has no two cases of L with one area)
meets(c)  = c.requiredN === 20 and c.status === 'measured' and requestInBandRate(cell of c) >= 0.9
            // design §7.8: at least 90 % of the requests complete with ten in-band puzzles (18 of 20); a reduced case
            // (3 requests, no puzzle; P-OD9) never meets it
if no case of L meets:                    AREAS[L] = [Infinity, Infinity]
else:
  a1 = the smallest area of a case that meets
  b  = the largest area such that every case of L with area in [a1, b] meets   // the run of meeting cases from a1
  lo = a1 when a case of L with a smaller area exists (it did not meet), else the current lower end of L (164, 266, 450)
  hi = Infinity when b is the area of the largest case of L, else b
  AREAS[L] = [lo, hi]
contiguity (D35, levels offered contiguously): AREAS[hell-2] = AREAS[hell-2] ∩ AREAS[hell-1],
  then AREAS[hell-3] = AREAS[hell-3] ∩ AREAS[hell-2]; an empty intersection is [Infinity, Infinity]
Hell 4 and beyond: unchanged ([744, Infinity] never meets an area of 676 or less)
```

Write a scratch script `tests/artifacts/MP12b3/derive.mjs` that reads the aggregate and prints, per level, the table
(case, area, N, status, rate, meets) and the interval; compare it with MP12b2's record §9 line by line. A difference is
a stop (report both tables). The lower end below the smallest landscape case (164 to 195 for Hell 1) is kept by this
rule only when that smallest case meets; MP12b2's availability probe on 164 cells is evidence beside it, not a
substitute for a 20-request run.

**A2. `core/engine/levels.js`.** Write the three intervals into `AREAS`; nothing else in the file changes.

**A3. The policy id and two stale comments** (`core/engine/policy.js`). `POLICY_ID` becomes `'mixed-v3'` (design §5.4:
"Any change to … availability interval … requires a new id"; `mixed-v2` was released with the old intervals; RES-01,
check-list D29's precedent for `K60` and `SHARES`). The header comment says `mixed-v3` and that it differs from
`mixed-v2` only by the Hell areas of §7.5. The `SCORE_V3` comment drops the stale sentence of line 58 and says the
knobs are the locked v3 knobs (the fit and the calibration slice). No other line of `policy.js` changes; `K60`,
`K_CAP_FROM_HELL_1`, `SHARES` and every count rule stay (a pinned `pieceCountRange` of an offered level does not move).

**A4. The Generator's level list** (`generator/state.js`). `LISTED_LEVEL_IDS` follows its own definition, "levels the
generator can ever offer (areas up to 676)": the named levels and each Hell level whose new interval contains an area
from 30 to 676, in level order (a Hell level with `[Infinity, Infinity]` is not listed, as Hell 4 is not today).
Write the frozen array by hand from the new `AREAS` and update its comment. A level that stays listed keeps the reasons
"needs a larger board" and "needs a smaller board" of `describeLevels` (a closed Hell interval gives "needs a smaller
board" above its end). A stored `levelId` or a saved set's `calibrationFor` that names a level no longer listed is
handled as any unlisted id today (the default level; `calibrationFor: null`); add no migration. Keep every locale key
(`level.name.hell-2` and `hell-3` still name the levels of imported puzzles).

**A5. The reference table and the landscape** (`tools/bench/calibration-reference.js`). `REFERENCE_ROWS` stays "the
§7.5 table, row for row", now of offered bands only. For each Hell row with band `[aMin, aMax]` and its level's new
interval `[lo, hi]`:

- a row wholly inside the interval stays as it is;
- a row wholly outside moves, unchanged, to a new exported `RETIRED_REFERENCE_ROWS` (comment: "measured before
  difficulty-v3, no longer offered: D36 (i), P-OD9");
- a row that straddles an end is split. The offered part `[max(aMin, lo), min(aMax, hi)]` stays in `REFERENCE_ROWS`
  with: `k` = the exact policy's K over that part (`referencePolicyAgreement({ ...row, aMin: p, aMax: q }).policyK`;
  every other row agrees with the policy within one piece, so this is the same source, and the agreement test and
  `aggregateLandscape`'s policy check then hold exactly); `sizes`, `g0`, `nodeS`, `planS` and the note as in the
  table; `boards` = the row's measured boards whose area lies in the part, else `null` (a forecast, as the other
  `n/m` rows). The rest of the band (one part, or two when both ends cut it) goes to `RETIRED_REFERENCE_ROWS` with the
  row's other values and all its measured boards (the evidence as measured);
- `landscapeBoards()` takes the boards of both lists, so the landscape keeps the 16 boards of `55c0c61` (`20x20` and
  `32x15` come only from Hell rows) and stays comparable with MP12b1's. A forecast part adds the deterministic board of
  its upper end as today; that is a board of the 16 except when Hell 1 or Hell 2 ends at 480 cells (the 20 x 24 board
  then joins the landscape: record it). `buildLandscapeMatrix` is unchanged and drops by itself the Hell cases that
  are no longer offered; `referenceFor` searches `REFERENCE_ROWS` only.

**A6. The BQ matrices** (`tools/bench/matrices/bq-0.json` to `bq-3.json`). Remove every case whose level is no longer
offered on its board (`checkMatrix` reports it otherwise); change nothing else (no seed, no repetitions, no other case),
keeping the files' format (two-space JSON, CRLF). The release-1 BQ records under `docs/calibration/` stay as written.
Named item for MP17 and the owner: the BQ rule "at least 60 seeds for Hell-1 at the largest area" (design §8.7) has no
subject where Hell 1 is no longer offered, and which level is the slowest there, and whether 576 cells still need
BQ-1, is for a later qualification outside difficulty-v3.

**A7. The tests that pin the old areas** (intended contract changes of P-OD9; every expected value comes from the new
`AREAS` and the rule, checked by hand, never copied from a failing run without that check). Which rows apply depends
on the derived areas: change an assertion only when it fails after A2 to A6, or when it names a level and area that
are no longer offered; an assertion that still holds stays as it is.

| Test | Change |
|---|---|
| `tests/levels.test.js`: the `AREAS` copy (line 10), "availability boundaries are exact", "business examples", "lowest and highest level per area band" | the new intervals; a level with `[Infinity, Infinity]` is checked as offered on no area from 30 to 676 instead of at its ends (`offeredLevels(Infinity)` throws); the area rows of 164 to 676 cells by the new table |
| `tests/policy.test.js`: the anchor rows `['hell-1', 360, 37, 42]`, `['hell-2', 360, 50, 56]`, `['hell-3', 484, 73, 80]`, `['hell-3', 676, 80, 90]` (line 192); "Hell caps bound the count" (lines 239-243); the `POLICY_ID` pin (line 343) | a row whose level is no longer offered at its area moves to the test "is null where a level is not offered"; a cap test moves to the largest area where its level is still offered and the cap binds, else it asserts `pieceCountRange` null there and says so in its name; `POLICY_ID` `'mixed-v3'` |
| `tests/bq-limits.test.js` "Heart 363 is never offered Hell-3; 484 and larger boards are" (line 106) | the Heart 363 list and the Hell 3 areas of the new table |
| `tests/bq0-matrix.test.js` (the level lists of lines 77-104, the 60-seed test of line 111), `tests/bq-higher-matrix.test.js` (`SIX`, `FOUR`, the Heart lists, the case counts 18, 18 and 14, the 60-seed test of line 137) | the level lists and counts follow the edited matrices; "every level is offered" and "covers every offered level" stay; the 60-seed assertions apply to "Hell-1 at the largest area" only where Hell 1 is offered there, and the test names say so |
| `tests/calibration.test.js` "every row of the design table is present and inside its level's offered areas" (line 22: 56 rows, `referenceFor('hell-1', 600)`, `referenceFor('hell-3', 470)`) | the new row count; the two examples move to rows that stay offered, or, for a retired band, `referenceFor` is `undefined` and the row is found in `RETIRED_REFERENCE_ROWS` with its values (`nodeS` 48.6, the boards); "the exact policy agrees" (line 46), "boards … include 32x15" (line 70) and "every reference row has … a cell" (line 104) must pass unchanged |
| `tests/generator-state.test.js` "a 60-cell board offers … and 360 offers Hard to Hell 2" (line 93), "Require one solution warns only on large Hell boards" (line 179), `describeLevels(676).length` | the 360 list and reasons of the new table; a Hell example moves to an area where a Hell level is offered above 200 cells, or, when none is, the test asserts that no Hell level is offered there and its name says so; new: `LISTED_LEVEL_IDS` equals the ids offered on at least one area from 30 to 676 |
| `tests/generator-level-help.test.js` "piece-count help follows the policy plan and ends on the table range" (line 43: `levelHelp('pieces', 'hell-1', 676)`, the cap line "Most for this level" 42) | the largest area where Hell 1 is offered and the cap line still shows; if it shows nowhere, the assertion becomes `levelHelp` null at 676, with a message that says so |
| `tests/clues.test.js` "slow: an unrateable calibration ends not-in-band with no puzzle (D36)" (line 564: 22 x 22 `hell-3`) | MP12a's table "The D36 and fixture re-pins" (its row "The unrateable calibration", command B under the lock), applied only to the inputs of MP09d2's C1 order that are still offered: the first whose attempt 0 is all capped becomes the test's board and level (seed and attempt unchanged). If none is offered or none is all capped, that is the intended effect of P-OD9, not a stop: the test becomes a quick one that `setAttempt` refuses 22 x 22 `hell-3` (`RangeError`, "level hell-3 is not offered for 484 cells"), named so, and the failure mode of an unrateable calibration stays pinned by MP09c's scripted test of line 703 (and part B's tests); a named item in the record |
| `tests/browser/generator-editor.js` "levels: 360 squares offer Hard to Hell 2" (line 399), "The Require unique solution switch … warning on large Hell boards" (line 528) | the 360 list of the new table; the Hell 1 click and the `N-UNIQUE-EXP` check move to a board where a Hell level is offered above 200 cells, or, when none is, the check asserts the Hell rows are disabled there; run the page (part D) |

Any other failing test is a stop. Not affected (checked at `55c0c61`): `tests/cli.test.js:155` and
`tests/puzzlecode-cli.test.js:540` (Hell 3 on 10 x 6 stays refused), `tests/benchmark-matrix.test.js:58`,
`tests/generation-client.test.js:284`, `tests/protocol.test.js:219` (the protocol accepts any valid level id), the
level labels of `tests/player-i18n.test.js` and `tests/generator-i18n.test.js`, the frozen
`tests/fixtures/puzzlecode-v1.json` (a `hell-1` golden: codes do not check availability).

**A8. Packs and links made earlier** need no code change: the pack reader and the codes never check availability,
v2 and v1 claims are re-rated for display (MP10b1, MP10b2) and v3 claims shown as stored. Add one quick test to
`tests/generator-import.test.js` that shows it after the change: a pack whose puzzle claims a Hell level that is no
longer offered on its board (a `difficulty-v2` claim of `hell-2` on a 20 x 20 board, built like that file's other
packs) reads `ok`, keeps its claim, is imported by the Generator as an Imported set, and gets a display-rating wish.

**A9. The documents** (both languages where there are two):

- `docs/design-detail.md`: §7.5 — the "Offered for A in" row, the table "Resulting range of levels", the paragraph
  "Reachability under `difficulty-v3` (D36; interim …)" replaced by the rule of D39 and the measured result (per Hell
  level, its areas and the evidence, with links to the calibration record and this task's record), and the Hell rows
  of the final parameter table (offered bands only, split as in A5; the retired rows under a short heading "Measured
  before difficulty-v3, no longer offered (D36 (i), P-OD9)"); §5.4 (`mixed-v3`, "packs made before it carry
  `mixed-v2`"); the §6.4 heading; §4.2 (the `levels.js` block: "both ends may be `Infinity`: never offered"); §8.7
  "Matrix rules" (its example and the 60-seed rule's subject); §10.3 "Level table" ("Very easy … <the last listed
  level>"); §13.2, the `policy` row (the anchor rows); §1.2 R13 and §2 D35 (one clause each: "under `difficulty-v3`
  the Hell levels are offered only where the v3 rating can make them, D36 (i), owner decision P-OD9"). Historical
  rationale and evidence (§7.4's band-ratio note, §14, Appendix A) stay as written.
- `docs/design-brief.md`: the table "Levels and typical boards" (the 18 × 20 and 22 × 22 rows: available levels and
  example piece counts, recomputed with `pieceCountRange`), the sentence on "Require unique solution … experimental for
  Hell puzzles above 200 squares" when no Hell level is offered above 200 cells, and one sentence: "Hell levels are
  offered only on the board sizes where the current rating can make them; packs and links made before still open."
- `USERGUIDE.md` and `USERGUIDE.vn.md`: "A table lists every level from Very easy to Hell 3" (EN line 61, VN line 59)
  with the last listed level; the "Difficulty" paragraph gets the sentence of the brief.
- `README.md` line 16, "makes puzzles from a set at ten levels": the number of listed levels.
- Sweep: `Select-String -Path README.md, USERGUIDE.md, USERGUIDE.vn.md, DEVELOPERGUIDE.md, DEVELOPERGUIDE.vn.md,
  docs\design-brief.md, docs\design-detail.md -Pattern 'Hell|hell-|Địa ngục|mixed-v2|ten levels'`; every hit either
  follows the new table or is historical (say which in the reply).

### Part B: the fail-fast (only as the owner answered; check-list D40)

The semantics are MP12b2's (its "The fail-fast proposal" and `failfast.mjs`), so the owner's answer means exactly what
its table measured. Build only what the owner chose. With "none", skip this part: the design (§7.5) and the record say
that a request whose ratings all reach their work limits still runs to the time limit (named item for MP17's release
notes).

- **The result `unrateable`** (with F1, F2 or both). `selectClues` returns `{ ok: false, reason: 'unrateable' }`
  exactly when the call spent at least one profile and every profile it spent was unrateable (`IncompleteRatingError`;
  none rated, none refused by AR1). `rateSubset` returns `'spent'` for both kinds, so count the unrateable profiles in
  its `catch` beside `profiles`. Without F2 this is decided at the end of the search (today's line 550, before the
  `uniqueness-not-proved` and `not-in-band` outcomes: such a call has no candidate). `SelectResult` (line 47) and
  `SetAttemptResult` (`core/engine/types.js:221`) gain the reason; `FailReason` (`generate.js:23`) does not.
- **F2**: a constant `FAIL_FAST_PROFILES = 4` next to `STALL_LIMIT`, with a one-line comment; in `afterProfile`
  (line 387), for a spent profile, the call returns the `unrateable` result when `profiles === FAIL_FAST_PROFILES` and
  all of them were unrateable. A rated or refused profile among the first four, or fewer than four profiles in the
  whole call, never fires it. No RNG draw, rating or order of any other call changes (each call has its own stream).
- **Candidates** (`puzzleCandidate`, `completionCandidate`): `{ fail: sel.reason === 'unrateable' ? 'not-in-band' :
  sel.reason }`, so the batch fold, its failure tallies and its notices are unchanged.
- **F1**: `setAttempt` already passes the calibration's reason on (`{ ok: false, reason: cal.reason }`).
  `firstSetAttempt(req, maxAttempts = 32, attempt = setAttempt)` (the third parameter a test seam, like
  `SelectContext.rate`; `tools/record-fixtures.mjs` is its caller) ends at the first attempt whose reason is
  `unrateable` and returns `{ result: null, failures }`. In the client's `generateSet`, the ordered scan of the
  resolved prefix returns `{ status: 'failed', reason: 'unrateable', failures: tally() }` at the first attempt index
  whose result is a failure with that reason, before any later index is read (the lowest-index rule: a later success
  never overrides it, whatever the pool width; the `finally` block aborts the attempts in flight).
  `SetJobResult.reason` and its comment (line 103) gain `unrateable`. With F2 only, a set attempt cut by F2 is one
  failed attempt (`unrateable` in the tally) and the request goes on as today.
- **The notice**: `generator/jobs.js` shows a new notice `N-NOSET-UNRATEABLE` (outcome, warning) for a failed set
  request with reason `unrateable`, else `N-NOSET` as today; its text is the owner's wording, else MP12b2's draft:
  EN "Couldn't create a {level} piece set for this board: the difficulty ratings it tried reached their work limits.
  Choose another level or change the board." VN "Không tạo được bộ mảnh mức {level} cho bàn này: các lần đo độ khó đã
  thử đều chạm giới hạn tính toán. Hãy chọn mức khác hoặc đổi bàn." Both locales, the same keys and placeholders.
  `tools/generate.mjs` prints the reason as today (`(unrateable)`); no other CLI change.
- **No id change**: F1 and F2 end failing requests earlier and change no accepted puzzle where no false stop occurs
  (MP12b2's table); they are part of `gen-v3`, whose lock completes with this task (check-list D35, D40). Evidence:
  GF-P2 shows no puzzle change and `npm test` keeps every UI-flow recipe; a change there is a false stop: stop.
- **Tests** (intended contract change and new cases): `tests/clues.test.js` line 703, the `unrateable` variant: with
  F2, 4 profiles and `{ ok: false, reason: 'unrateable' }`; with F1 only, 20 profiles and that reason (the `refused`
  variant stays 20 and `not-in-band`); new: F2 does not fire when the fourth profile is refused (`[21, 0]`) or rated,
  and a call with three unrateable profiles then a rated in-band one still succeeds; `tests/generate.test.js`:
  `firstSetAttempt` with a scripted seam (attempt 0 `unrateable`, attempt 1 `ok`) returns no result and one failure,
  and a call without `unrateable` keeps today's lowest success; `tests/generation-client.test.js` with the scripted
  harness: attempt 0 `unrateable` and attempt 1 `ok` resolved first, the request fails with `unrateable`; attempt 0
  `ok` and attempt 1 `unrateable`, it succeeds; attempt 0 `not-in-band`, attempt 1 `unrateable`, attempt 2 `ok`, it
  fails at 1; `tests/generator-controller.test.js`: the failed set with `unrateable` gives `N-NOSET-UNRATEABLE` (beside
  the `time-limit` row of line 171). When the D36 slow test of `tests/clues.test.js:564` still runs (A7: Hell 3 still
  offered on 484 cells), its expected reason becomes `unrateable` if attempt 0's calibration was entirely unrateable:
  re-observe it by MP12a's command B and pin what it shows.
- **Documents**: design §6.5 (a set request ends at its first attempt whose calibration was entirely unrateable), §6.10
  (F2 and the `unrateable` result), §10.3 ("No set within the time limit" bullet) and §10.7 (the notice row), §14.2
  item 3; the user guides (the notice, both languages).

### Part C: `require` at Hard and above (only when the owner accepted (R-a); check-list D41)

With the owner's area A0 (the dispatch gives it):

- `core/engine/levels.js`: `export const REQUIRE_FROM_HARD_MAX_AREA = <A0 - 1>` and `export function
  uniquenessOffered(levelId, area, uniqueness)`: true for `'any'`; for `'require'`, true when `level(levelId).index <
  3` or `area <= REQUIRE_FROM_HARD_MAX_AREA`.
- Refusals where a level that is not offered is refused today: `setAttempt` throws the same kind of `RangeError`
  ("unique solutions at <level> are not offered for <area> cells"); the client's `checkSet` and `checkBatch` throw
  `GenerationError('level-unavailable', …)`; the CLI then exits 1 with that message.
- The Generator: `generationBlock` returns a new message `M-UNIQUE-NOT-OFFERED` (EN "{level} with a required unique
  solution is not offered for a board with {area} playable squares.", VN "Mức {level} với yêu cầu lời giải duy nhất
  không áp dụng cho bàn có {area} ô chơi được."), checked after `M-LEVEL-NOT-OFFERED`; the switch stays as it is.
- Tests: the function at the boundary A0 - 1 and A0, Normal at A0 still offered; the client refusal; the Generator
  message; the CLI exit 1.
- Documents: design §6.11 (the uniqueness policy), §7.5 (one sentence), §2 D14, §10.7 (the message row); the brief's
  "Require unique solution" sentence; the user guides (both languages).
- With (R-b) or no question: nothing here; the design (§6.11) and the record state the known limitation. With (R-c):
  stop and ask for an addendum.

### Part D: the end of the lock (always)

After parts A to C and their targeted tests:

1. **GF-P2 for the policy id**: `node tools\record-fixtures.mjs --replace --reason "P3: Hell availability (D36 (i),
   P-OD9), policy mixed-v3"`, then `--check`. `git --no-pager diff -- tests/fixtures` must show only the `policy`
   value of `tests/fixtures/generation-case.json` (`versions`) and of `tests/fixtures/generated-sample-pack.json`
   (`generation.policy`); any other change (a piece, a clue, a score) is a stop. `player/samples/sample-pack.json` and
   `tests/fixtures/puzzlecode-v1.json` never change.
2. **The strict checks after GF-P2** (MP12a's list): the fixture-dependent files, then the quick set.
3. **GA-P2**: the final `npm test`, its first run kept as `tests/artifacts/MP12b3/ga-p2-first.txt`. No UI-flow recipe
   may change (no migration is allowed here): a failure is a stop. One exception: an EPERM of `tests/site-tools.test.js`
   in its cleanup, handled as MP12a's closing addendum says (that file alone, then `npm test` once more, both recorded).
4. **The browser pages**, one per lock: `generator-editor` (main phase), and `generator-flow` when part B was built.
5. **The identity of the locked tree** (`sourceDigest`, `versions` with `policy` `mixed-v3`), printed after `npm test`
   and recorded.
6. **The record** `docs/difficulty-v3/availability-<date>.md` (new, English, CRLF): the header (date, revision, the
   owner decisions applied: P-OD9 and the answers to MP12b2's questions); the derivation tables (A1) and their match
   with MP12b2's §9; `AREAS` before and after; the policy id; the Generator's list before and after; the reference
   rows retired or split; the BQ cases removed (per matrix) with the named item of A6; every test changed, with its
   reason (A7, B, C); the test of A8; part B and part C as built (the owner's answer, the code, the tests) or "not
   built" with the reason; the gates (commands, start, end, seconds, lock waits, counts); the identity; the lock
   completion statement (below); the named items for MP17.
7. **Design §7.8**: after MP12b2's lock statement, one sentence: "MP12b3 completed the lock: the Hell availability of
   §7.5 (P-OD9), the policy id `mixed-v3`[, the fail-fast of §6.5 and §6.10][, `require` at Hard and above up to
   <A0 - 1> cells]; from the commit `difficulty-v3 MP12b3` on, no rating and no generated puzzle changes."
8. `npm run check` last.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/levels.js` | `AREAS` (A2); part C: `REQUIRE_FROM_HARD_MAX_AREA`, `uniquenessOffered` |
| `core/engine/policy.js` | `POLICY_ID` `'mixed-v3'`, the header comment, the `SCORE_V3` comment (A3) |
| `generator/state.js` | `LISTED_LEVEL_IDS` and its comment (A4); part C: `generationBlock` |
| `tools/bench/calibration-reference.js` | `REFERENCE_ROWS`, `RETIRED_REFERENCE_ROWS`, `landscapeBoards` (A5) |
| `tools/bench/matrices/bq-0.json`, `bq-1.json`, `bq-2.json`, `bq-3.json` | cases no longer offered removed (A6) |
| the tests of A7, `tests/generator-import.test.js` (A8) | as the table says |
| part B: `core/engine/clues.js`, `core/engine/generate.js`, `core/engine/types.js` (`SetAttemptResult`), `core/browser/generation-client.js`, `generator/jobs.js`, `generator/locale.en.js`, `generator/locale.vi.js`, `tests/clues.test.js`, `tests/generate.test.js`, `tests/generation-client.test.js`, `tests/generator-controller.test.js` | as part B says |
| part C: `core/engine/generate.js`, `core/browser/generation-client.js`, `generator/state.js`, the Generator locales, their tests | as part C says |
| `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` | by the tool (GF-P2; the policy id only) |
| `docs/design-detail.md`, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`, `README.md` | A9, B, C, D7 |
| `docs/difficulty-v3/availability-<date>.md` (new) | the record (D6) |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12b3/` (the helper, `derive.mjs`,
the page runner copies and evidence, the TAP files) and the Edge profile `tests\artifacts\edge-MP12b3\`. Must not edit:
`SCORE_V3`, `DEDUCE`, `K60`, `SHARES`, `STALL_LIMIT`, `core/engine/deduce.js`, `core/engine/difficulty.js`,
`core/engine/version.js`, `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`,
`tests/fixtures/ui-flow-recipes.json`, the MP12 records and folders, `docs/calibration/`.

### Documentation slot

- `docs/design-detail.md`: §7.5 (availability, the D36 paragraph, the Hell rows of the parameter table), §5.4, the
  §6.4 heading, the §4.2 `levels.js` block, §8.7, §10.3, §13.2 (the `policy` row), §1.2 R13, the §2 D35 row, and
  §7.8 (the completion sentence after MP12b2's lock statement; MP12b2 owns the rest of §7.8); part B: §6.5, §6.10,
  §10.3, §10.7, §14.2; part C: §6.11, §7.5, the §2 D14 row, §10.7.
- `docs/design-brief.md` (line 27 and the table "Levels and typical boards", lines 42-43), `USERGUIDE.md`,
  `USERGUIDE.vn.md`, `README.md` (line 16), as A9, B and C say.

## Implementation steps

1. Read the inputs and the owner's answers; save the helper; write `derive.mjs` and compare its tables with MP12b2's
   record §9 (A1).
2. Part A: `AREAS`, the policy id and comments, the Generator's list, the reference rows, the BQ matrices, the tests
   of A7 and A8 (targeted runs under the lock).
3. Part B and part C as the answers say, with their tests (targeted runs under the lock).
4. The documents (A9, B, C).
5. Part D: GF-P2, the strict checks, GA-P2, the browser page(s), the identity, the record, design §7.8,
   `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b3-B01 | The Generator offers a Hell level only on the board areas where v3 made it as reliably as the other levels (at least 90 % of 20 requests complete), and nowhere else; a Hell level made nowhere is not listed | `levels.js`; the record's derivation tables; the Generator's list; the editor page |
| MP12b3-B02 | Packs and links made before still open, keep their stored claims and are re-rated for display as before | A8's test; the unchanged reader and display tests |
| MP12b3-B03 | When the owner agreed: a set request whose ratings all reach their work limits ends early with a clear notice in both languages, and no puzzle that a request made before changes | part B's tests; GF-P2's diff; `npm test` |
| MP12b3-B04 | When the owner accepted it: `require` at Hard and above is refused, with a message, from the owner's area | part C's tests |
| MP12b3-B05 | The design, the brief, both user guides and the README describe the new availability, and the lock is complete | the documents; design §7.8; the record |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b3-T01 | `AREAS` equals the intervals of D39 computed from the aggregate in force, and they equal MP12b2's record §9 | `derive.mjs` output; the record |
| MP12b3-T02 | `POLICY_ID` is `mixed-v3`; `SCORE_V3`, `DEDUCE`, `K60`, `SHARES`, `STALL_LIMIT`, `deduce.js`, `difficulty.js` and `version.js` are unchanged; the stale `SCORE_V3` comment is gone | `git --no-pager diff` |
| MP12b3-T03 | `LISTED_LEVEL_IDS` equals the levels offered on some area from 30 to 676 (a test); the landscape keeps the 16 boards of `55c0c61` (A5); every BQ case is offered and only the cases no longer offered were removed | tests; the record |
| MP12b3-T04 | Only the tests of A7, A8 and parts B and C changed, each as its row says and listed in the reply; no test was weakened beyond the stated contract change | the diff; the reply |
| MP12b3-T05 | Part B, when built, follows MP12b2's definitions: `unrateable` exactly for all-unrateable calls, F2 at four profiles, F1 by the lowest attempt index in the serial and the pooled paths, candidates mapped to `not-in-band` | part B's tests |
| MP12b3-T06 | GF-P2 changed only the `policy` values of the two fixtures; `--check`, the strict checks, the quick set and the final `npm test` pass under the lock; the browser page(s) pass (the runner's `PASS` line, no CSP violation, no uncaught error) | the gate record; the TAP file; the page evidence |
| MP12b3-T07 | The record exists with every section of D6; design §7.8 has the completion sentence; `npm run check` passes; every written file is CRLF without BOM | the files; command output |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP12b3\dv3-lock.ps1
# targeted, after part A (add the files of parts B and C when built)
$r = Invoke-Dv3Timed -Task 'MP12b3 targeted tests' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/levels.test.js', 'tests/policy.test.js', 'tests/bq-limits.test.js', 'tests/bq0-matrix.test.js',
  'tests/bq-higher-matrix.test.js', 'tests/calibration.test.js', 'tests/generator-state.test.js',
  'tests/generator-level-help.test.js', 'tests/generator-import.test.js', 'tests/clues.test.js')
if ($r.Exit -ne 0) { throw 'targeted tests failed' }

# part D: GF-P2 (the policy id), then the strict checks, then GA-P2
$r = Invoke-Dv3Timed -Task 'MP12b3 GF-P2 replace' -NodeArgs @('tools/record-fixtures.mjs', '--replace', '--reason',
  'P3: Hell availability (D36 (i), P-OD9), policy mixed-v3')
if ($r.Exit -ne 0) { throw 'record-fixtures failed' }
$r = Invoke-Dv3Timed -Task 'MP12b3 GF-P2 check' -NodeArgs @('tools/record-fixtures.mjs', '--check')
if ($r.Exit -ne 0) { throw 'fixture check failed' }
git --no-pager diff -- tests/fixtures player/samples
$r = Invoke-Dv3Timed -Task 'MP12b3 fixture-dependent files' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/generate.test.js', 'tests/cli.test.js', 'tests/puzzlecode-cli.test.js', 'tests/generation-client.test.js',
  'tests/calibration.test.js', 'tests/benchmark-matrix.test.js', 'tests/player-load.test.js', 'tests/rate-probe.test.js',
  'tests/generator-state.test.js', 'tests/generator-controller.test.js', 'tests/pack.test.js')
if ($r.Exit -ne 0) { throw 'fixture-dependent tests failed after GF-P2' }
$r = Invoke-Dv3Timed -Task 'MP12b3 quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick set failed' }
$r = Invoke-Dv3Timed -Task 'MP12b3 GA-P2' -NodeArgs @('--test', '--test-reporter=spec',
  '--test-reporter-destination=stdout', '--test-reporter=tap',
  '--test-reporter-destination=tests/artifacts/MP12b3/ga-p2-first.txt', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'the final npm test failed: read ga-p2-first.txt and report (only the EPERM exception)' }

# the browser page(s), one page per lock, with MP16b's runner copied to pages.mjs (main phase)
$pages = @('generator-editor')   # add 'generator-flow' when part B was built
for ($i = 0; $i -lt $pages.Count; $i++) {
  $t = Invoke-Dv3Timed -Task "MP12b3 page $($pages[$i])" -NodeArgs @('tests/artifacts/MP12b3/pages.mjs', '--task',
    'MP12b3', '--http', '8812', '--cdp', '9312', '--evidence', "tests/artifacts/MP12b3/pages/$($i + 1)", $pages[$i])
  if ($t.TimedOut -or $t.Exit -ne 0) { throw "page run $($pages[$i]) failed, stopped at the limit or did not start" }
}

node --input-type=module -e "import { readFileSync } from 'node:fs'; import { computeSourceDigest } from './tools/bench/report.js'; import { currentVersions } from './tools/record-fixtures.mjs'; console.log(JSON.stringify({ sourceDigest: await computeSourceDigest((p) => readFileSync(p, 'utf8')), versions: currentVersions() }))"
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases

The rows of A7 (as contract changes), A8, part B's and part C's cases as written there, and:

1. `LISTED_LEVEL_IDS` equals `[...new Set(range(30, 676).flatMap((a) => offeredLevels(a).map((l) => l.id)))]` in level
   order (`tests/generator-state.test.js`).
2. `landscapeBoards().map((b) => b.id)` contains the 16 ids of `55c0c61` (`6x10`, `3x29`, `10x10`, `12x12`, `14x14`,
   `15x15b10`, `16x16`, `15x20`, `18x18`, `18x20`, `20x20`, `20x21`, `32x15`, `22x22`, `24x24`, `26x26`) and no other
   id except the `20x24` board of A5 (`tests/calibration.test.js`); every row of `RETIRED_REFERENCE_ROWS` lies wholly
   outside its level's interval, and every split row's offered part agrees exactly with the policy's K.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the derivation tables, the new `AREAS`, the changed tests with
  their reasons, the parts built (B, C) or not with the reason, the gate record (commands, counts, durations, lock
  waits), the browser results, the identity of the locked tree and the named items (the BQ rule of A6 among them).
- Handoff to MP13a to MP17: the lock is complete at this task's commit (check-list D35); the policy id is `mixed-v3`;
  the offered levels of 10 x 6 and 20 x 18 for MP17 (`offeredLevels(60)`, `offeredLevels(360)`); the failure reason
  `unrateable` of `selectClues` when part B was built (MP13a's `SelectResult`, MP14a's events); this task's record
  for MP17's release notes (the levels and boards no longer offered, the notices).

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |

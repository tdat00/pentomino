# MP12b3 — Hell availability (D36 (i)), the fail-fast decision (none, P-OD12) and the end of the lock

| Header | Value |
|---|---|
| ID | MP12b3 (fourth part of the report's MP12; no longer conditional since owner decision P-OD9; it completes the lock that MP12b2 began, check-list D35) |
| Depends on | MP12b2 (accepted and committed with SA2's lock fixes PLK01-PLK05: the record `docs/difficulty-v3/calibration-2026-11-15.md` with the derived Hell areas of its §9, the aggregate in force (MP12b1's; no change round ran), the lock of the tuple); the owner's answers to MP12b2's questions in `docs/difficulty-v3/clarifications-resolved.md` Part H: **P-OD12** (the fail-fast: none) and **P-OD13** (the census estimates above 25 %: accepted); population R needed no question (section "Owner decisions applied" below) |
| Estimated size | Medium–Large: parts A and D only (parts B and C are not built): about 600–900 changed lines (`levels.js` about 15, `policy.js` about 5, `generator/state.js` about 10, `tools/bench/calibration-reference.js` about 60, the four BQ matrices (cases removed), the level-count texts of two pages about 10, tests about 250, documents about 170, the record about 120). About 50–80 minutes of developer work plus about 15–25 minutes of machine time under the lock (GF-P2, the fixture-dependent files, the quick set, `npm test`, one browser page) |
| Owner role | Engine and Generator |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/clarifications-resolved.md` Part H P-OD9, P-OD12 and P-OD13 and Part I PR-P1 (the plan author's answer) and D36 (decided (i)); Part I PR-P2 (the plan author's review: the withdrawal of the Hell levels is a limit of the present search, not a proof that their bands are unreachable under v3); `docs/difficulty-v3/report-detailed.md` RES-01 ("Versions": `POLICY_ID` becomes `mixed-v3` when P3 changes a table of the policy), RES-25 (calibration and lock); design-detail §5.4 (an availability change needs a new policy id), §7.5 (availability, D35), §7.8 (acceptance: at least 90 % of the requests complete); check-list §4.1 (P-OD12, P-OD13), §4.2 D20, D29, D35, D36, D38, D39, D40, D41 and §7 |
| Gates owned | GF-P2 (the generation fixtures re-recorded for the new policy id only; their puzzles must not change), GA-P2 (the final `npm test`), the browser page `generator-editor` (no `generator-flow`: no fail-fast is built, P-OD12) |
| Implementation status | Not started |

## Owner decisions applied (binding; 2026-11-15)

MP12b2's record and the owner's answers fix every choice this task left open. Where a sentence below still states a
rule for another outcome (a finite Hell interval, F1 or F2, the option (R-a)), it describes no work of this task.

- **Hell areas (check-list D39; MP12b2's record §9).** No Hell case meets the completion criterion: the three cases
  that made puzzles completed 0 %, 0 % and 45 % of their 20 requests (`14x14-hell-1`, `24x24-hell-1`,
  `26x26-hell-1`), and the other 22 Hell cases are `reduced (P-OD9)`. So `AREAS` becomes `[Infinity, Infinity]` for
  Hell 1, 2 and 3: every Hell level is **retired** (offered on no board, not listed). Hell 4 and beyond keep
  `[744, Infinity]` (D39), above every board an app accepts (676 cells at most). The Generator lists the seven named
  levels, Very easy to Nightmare. Your derivation (A1) must give exactly this, or you stop.
- **The fail-fast: none (owner decision P-OD12; check-list D40).** Part B builds nothing: no `unrateable` result, no
  `FAIL_FAST_PROFILES`, no notice, no change of `clues.js`, `generate.js`, `types.js`, the client, `generator/jobs.js`
  or the locales, and no fail-fast test (`tests/clues.test.js` changes only as A7 says). The limitation is written in
  design §7.5 and in the record (part B below).
- **Population R: no question (check-list D41; MP12b2's record §6 and §13.2).** Every 18x20 cell made puzzles with
  `--uniqueness require` (Hard 2 of 10 in its request, `partial`, `difficulty-not-found`; Expert and Master 10 of 10).
  Part C builds nothing; design §6.11 and the record state the measured limitation (part C below).
- **Census estimates above 25 %: accepted (owner decision P-OD13).** The 17 cells that are not Hell keep their
  estimated ratings at `DEDUCE.census` 80,000,000, with the estimate note and the `censored` flag; the three Hell 1
  cells are historical (Hell 1 is withdrawn). No code changes; design §7.8 says so in one clause (A9).
- **No cell that is not Hell lacks a puzzle (MP12b2's record §9).** Only the Hell levels change; no addendum.

## Goal & business context

The owner asked that Hard be really hard and that every level the Generator offers be one it can make. Under v3 a
capped search gives no rating (SA2-Q-P02), so on large boards the Hell levels cannot be rated and requests for them
end after two minutes without a puzzle (D36). The owner has decided (P-OD9): stop offering what v3 cannot make. The
plan author's review (PR-P2) adds that this is a limit of the present clue search, not a proof that the Hell bands are
unreachable under v3; the documents below say so. This
task sets the board areas of the Hell levels from the landscape that MP12b1 measured: a Hell level stays offered only
where its 20-request run completed as the other levels must; elsewhere it is not offered, and a Hell level made
nowhere is never generated (`[Infinity, Infinity]`). MP12b2's record finds that no Hell level qualifies on any board,
so after this task the Generator offers Very easy to Nightmare only. The Generator's level list, the design, the
brief, both user guides, the README and the pages' descriptions follow. Packs and links made earlier still open, and
their puzzles, Hell ones included, are re-rated for display as before.

The owner answered MP12b2's other questions: no fail-fast mechanism is built (P-OD12: each proposed mechanism stopped
requests that would have succeeded), so a set request whose ratings all reach their work limits still runs to its
time limit, and the documents say so; `require` (a proven unique solution) stays offered as it is, because every
18x20 cell made puzzles with it (population R), and the design states the measured limitation; the cells with more
than 25 % census estimates are accepted (P-OD13), and the design says so.

Then the lock is complete: from this task's commit on, MP13a to MP17 change no rating and no generated puzzle.

## Scope

### In scope

- **Part A (always): the Hell areas.** `AREAS` of `core/engine/levels.js` by check-list D39; `POLICY_ID` to
  `mixed-v3` (design §5.4: availability is part of the policy); the Generator's level list; the reference table and
  the landscape boards of `tools/bench/calibration-reference.js`; the four BQ matrices; the tests that pin the old
  areas; design-detail, the brief, the user guides, the README and the level-count texts of `index.html` and
  `generator/index.html`; the stale `SCORE_V3` comment of `core/engine/policy.js`.
- **Part B: the fail-fast. Not built (owner decision P-OD12: none).** Only the limitation is written (part B below).
- **Part C: `require` at Hard and above. Not built (population R needed no question).** Only the measured limitation
  is written (part C below).
- **Part D (always): the end of the lock.** GF-P2 for the new policy id, GA-P2, the browser page `generator-editor`,
  the record `docs/difficulty-v3/availability-<date>.md` (new) and the lock sentence of design §7.8.

### Out of scope

- Any change of `SCORE_V3`, `DEDUCE`, `K60`, `SHARES`, `STALL_LIMIT`, a band or a rating: the tuple is locked
  (MP12b2). No census change either (P-OD13 accepted the estimates at the unchanged budget).
- The areas of a level that is not Hell (MP12b2's record §9: every such cell made puzzles).
- Any fail-fast or `require` rule (P-OD12; population R needed no question), and any locale change.
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

Line anchors are at HEAD `cd5d17f` (checked by SA1 on 2026-11-15: every anchor quoted below holds there; MP12b2
changed no code, its record §12): find a moved line by the quoted text.

- **The evidence.** The aggregate in force: MP12b1's `docs/difficulty-v3/landscape-v3-full/aggregate-2026-11-14.json`
  (MP12b2 ran no change round, its record §2 and §11) (`{ aggregate, coverage, lists, source }`). Its `coverage` gives
  per case `caseId`, `area`, `requiredN` and `status` (`measured` or `reduced (P-OD9)`); `aggregate.cells` gives per
  case (`caseId`) the `requestInBandRate`. MP12b2's record `docs/difficulty-v3/calibration-2026-11-15.md`: §9 the
  derived areas, one table per Hell level (all three `[Infinity, Infinity]`) and "A cell that is not Hell without a
  puzzle: none"; §6 population R (no question); §10 the fail-fast check (no mechanism proposable); §13.1 the named
  items; §13.2 the questions answered by P-OD12 and P-OD13.
- **The owner's answers** (`clarifications-resolved.md` Part H; check-list §4.1): P-OD12 (the fail-fast: none) and
  P-OD13 (the census estimates above 25 %: accepted); population R was not asked (section "Owner decisions applied").
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
  every board times `offeredLevels(board.area)`), `referenceFor` (line 241). At `cd5d17f` the landscape has 105 cases
  on 16 boards; the boards `20x20` and `32x15` come only from Hell rows (`hell-2 301-420` and `hell-3 450-484`).
- `tools/bench/runner.js`: `checkMatrix` (line 110) adds the issue "`<level>` is not offered for a board of `<area>`
  cells" (line 180). The BQ matrices `tools/bench/matrices/bq-0.json` to `bq-3.json` (CRLF JSON) hold Hell cases on
  boards of 360 to 676 cells; `tests/bq0-matrix.test.js` and `tests/bq-higher-matrix.test.js` require every case to be
  offered and pin the level lists.
- Not built (P-OD12), for reference only: part B would have edited `core/engine/clues.js` (`selectClues`, line 207;
  `afterProfile`, line 387; the failure result, line 550), `core/engine/generate.js`, the client and
  `generator/jobs.js`. They stay as they are. MP09c's quick test "unproved or unrateable subsets, none usable: 20
  distinct subsets spent, no onRate" (`tests/clues.test.js:703`) keeps pinning today's all-unrateable call: 20
  profiles, `not-in-band`.
- Pages: the level count "ten levels" is in the meta texts of `generator/index.html` (lines 15, 20, 21, 31 and 32:
  `description`, `og:title`, `og:description`, `twitter:title`, `twitter:description`) and of the root `index.html`
  (lines 17, 18, 28 and 29); no test reads them and `npm run check` does not check their words.

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
substitute for a 20-request run. **Expected (MP12b2's record §9):** no case of Hell 1, 2 or 3 meets (Hell 1:
`14x14-hell-1` 0 %, `24x24-hell-1` 0 %, `26x26-hell-1` 45.0 %, nine cases reduced; Hell 2 and Hell 3: every case
reduced), so all three intervals are `[Infinity, Infinity]` before and after the contiguity step.

**A2. `core/engine/levels.js`.** Write the three intervals into `AREAS` (Hell 1, 2 and 3 `[Infinity, Infinity]`; Hell 4
keeps `[744, Infinity]`); nothing else in the file changes.

**A3. The policy id and two stale comments** (`core/engine/policy.js`). `POLICY_ID` becomes `'mixed-v3'` (design §5.4:
"Any change to … availability interval … requires a new id"; `mixed-v2` was released with the old intervals; RES-01,
check-list D29's precedent for `K60` and `SHARES`). The header comment says `mixed-v3` and that it differs from
`mixed-v2` only in availability: the Hell areas of §7.5 (no Hell level is offered on any board up to 676 cells). The
`SCORE_V3` comment drops the stale sentence of line 58 and says the knobs are the locked v3 knobs (the fit and the
calibration slice). No other line of `policy.js` changes; `K60`, `K_CAP_FROM_HELL_1`, `SHARES` and every count rule
stay (a pinned `pieceCountRange` of an offered level does not move; the Hell caps are now reached by no request).

**A4. The Generator's level list** (`generator/state.js`). `LISTED_LEVEL_IDS` follows its own definition, "levels the
generator can ever offer (areas up to 676)": the named levels and each Hell level whose new interval contains an area
from 30 to 676, in level order (a Hell level with `[Infinity, Infinity]` is not listed, as Hell 4 is not today). With
the areas of A1 that is the seven named levels, `very-easy` to `nightmare`, and the comment ends "Very easy …
Nightmare.". Write the frozen array by hand from the new `AREAS`. A stored `levelId` or a saved set's
`calibrationFor` that names a level no longer listed is handled as any unlisted id today (the default level;
`calibrationFor: null`); add no migration. Keep every locale key (`level.name.hell-1` to `hell-3` still name the
levels of imported puzzles).

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
- `landscapeBoards()` takes the boards of both lists, so the landscape keeps the 16 boards of `cd5d17f` (`20x20` and
  `32x15` come only from Hell rows) and stays comparable with MP12b1's. A forecast part adds the deterministic board of
  its upper end as today; that is a board of the 16 except when Hell 1 or Hell 2 ends at 480 cells (the 20 x 24 board
  then joins the landscape: record it). `buildLandscapeMatrix` is unchanged and drops by itself the Hell cases that
  are no longer offered; `referenceFor` searches `REFERENCE_ROWS` only.
- **With the areas of A1:** every one of the 14 Hell rows (Hell 1 six, Hell 2 five, Hell 3 three; lines 126-141) lies
  wholly outside its empty interval and moves, unchanged, to `RETIRED_REFERENCE_ROWS`; no row is split, so no forecast
  part and no 20 x 24 board arise. `REFERENCE_ROWS` keeps the 42 other rows, the landscape keeps its 16 boards and
  `buildLandscapeMatrix()` gives the 80 cases that are not Hell.

**A6. The BQ matrices** (`tools/bench/matrices/bq-0.json` to `bq-3.json`). Remove every case whose level is no longer
offered on its board (`checkMatrix` reports it otherwise): with the areas of A1, every Hell case. Change nothing else
(no seed, no repetitions, no other case), keeping the files' format (two-space JSON, CRLF). The release-1 BQ records
under `docs/calibration/` stay as written. Named item for MP17 and the owner: the BQ rule "at least 60 seeds for
Hell-1 at the largest area" (design §8.7) has no subject now that Hell 1 is offered nowhere, and which level is the
slowest at the largest areas, and whether 576 cells still need BQ-1, is for a later qualification outside
difficulty-v3.

**A7. The tests that pin the old areas** (intended contract changes of P-OD9; every expected value comes from the new
`AREAS` and the rule, checked by hand, never copied from a failing run without that check). Which rows apply depends
on the derived areas: change an assertion only when it fails after A2 to A6, or when it names a level and area that
are no longer offered; an assertion that still holds stays as it is.

After A2, each Hell level is in one of three states at a test's area, and every changed assertion says which state it
checks (cross-review RP02). **With the areas of A1 only two occur: the levels that are not Hell keep their state, and
Hell 1, 2 and 3 are retired at every area; "listed, not offered here" occurs nowhere, so no Hell row, disabled or not,
remains to assert.**

- **offered** (its new interval contains the area): what a test asserts about it there stays as it is;
- **listed, not offered here** (a finite interval that misses the area): the level keeps its row in `describeLevels`
  and in the Generator, disabled, with the reason `larger` below its lower end or `smaller` above its upper end;
  `pieceCountRange` is null there and `setAttempt` refuses a request (`RangeError`, "level <id> is not offered for
  <area> cells"; the client `level-unavailable`);
- **retired** (`[Infinity, Infinity]`): the level is not in `LISTED_LEVEL_IDS` (A4), so it has no row, no
  `describeLevels` entry and no notice anywhere (`generator/state.js:715-720`, `generator/ui/level-panel.js:218`); a
  request is refused as above.

Never assert a disabled row for a retired level, never assert a refusal where the level is still offered, and never
change `AREAS` or list a retired level again to make a test pass.

| Test | Change |
|---|---|
| `tests/levels.test.js`: the `AREAS` copy (line 10), "availability boundaries are exact", "business examples", "lowest and highest level per area band" | the new intervals; a level with `[Infinity, Infinity]` is checked as offered on no area from 30 to 676 instead of at its ends (`offeredLevels(Infinity)` throws); the area rows of 164 to 676 cells by the new table. With A1: the copy's Hell 1, 2 and 3 entries are `[Infinity, Infinity]`; `ids(360)`, `ids(484)` and `ids(676)` are `IDS.slice(3, 7)` (Hard to Nightmare); the rows of 215 to 450 cells end at `nightmare`; "levels carry exact ids, bands, shares and areas" (line 20) reads the copy and passes with it |
| `tests/policy.test.js`: the anchor rows `['hell-1', 360, 37, 42]`, `['hell-2', 360, 50, 56]`, `['hell-3', 484, 73, 80]`, `['hell-3', 676, 80, 90]` (line 192); "Hell caps bound the count" (lines 239-243); the `POLICY_ID` pin (line 343) | a row whose level is no longer offered at its area moves to the test "is null where a level is not offered"; a cap test moves to the largest area where its level is still offered and the cap binds, else it asserts `pieceCountRange` null there and says so in its name (with A1: all four rows move, and the cap test asserts `pieceCountRange` null at 676 for Hell 1, 2 and 3, named so); `POLICY_ID` `'mixed-v3'` |
| `tests/bq-limits.test.js` "Heart 363 is never offered Hell-3; 484 and larger boards are" (line 106) | the Heart 363 list and the Hell 3 areas of the new table (with A1: Heart 363 offers Hard to Nightmare, and no area offers Hell 3; the name says so) |
| `tests/bq0-matrix.test.js` (the level lists of lines 77-104, the 60-seed test of line 111, the planning test "plans one cancel probe per cell and one generation row per seed" of lines 122-127), `tests/bq-higher-matrix.test.js` (`SIX`, `FOUR`, the Heart lists, the case counts 18, 18 and 14, the 60-seed test of line 137) | the level lists and counts follow the edited matrices; "every level is offered" and "covers every offered level" stay; the 60-seed assertions apply to "Hell-1 at the largest area" only where Hell 1 is offered there, and the test names say so. The bq0 planning test keeps its two counts (one cancel probe per case and one generation row per repetition, over the edited matrix) and its seed check of `d22x22-hell-1` while that case stays; when A6 removed it, the seed check names the retained `d22x22-hard` (Hard is not a Hell level; 20 repetitions): its generation seeds are distinct and as many as its `repetitions`, and `planRuns(matrix)` has no row of `d22x22-hell-1` (cross-review RP03). No test is skipped, and no seed or repetition of a retained case changes. `bq-higher-matrix.test.js`'s planning test (line 149) has no case id and stays. With A1 (A6 removes 13 Hell cases from `bq-0.json`, 9 from `bq-1.json`, 9 from `bq-2.json` and 8 from `bq-3.json`, leaving 30, 9, 9 and 6): in bq0 the large desktop boards cover Hard to Nightmare and line 82's `includes('hell-3')` becomes "no Hell level", Heart 432 is `['hard', 'expert', 'master', 'nightmare']` and the phones run 18x20 at `['hard', 'nightmare']`; in bq-higher `SIX` becomes `['hard', 'master', 'nightmare']`, `FOUR` `['hard', 'nightmare']`, `p22x22` and `pirr466` are `FOUR` and the counts are 9, 9 and 6; every test name drops the Hell levels. The 60-seed rule has no subject in any matrix: bq0's test of line 111 and bq-higher's of line 137 keep the 20-seed check of every case (and bq-higher its largest-area check, line 140), replace the Hell-1 assertions (bq0 lines 115-119; bq-higher lines 142 and 145) by "no case is a Hell level", and are renamed so ("…; no Hell level is offered (P-OD9)"); the bq0 planning test's seed check names `d22x22-hard` |
| `tests/calibration.test.js` "every row of the design table is present and inside its level's offered areas" (line 22: 56 rows, `referenceFor('hell-1', 600)`, `referenceFor('hell-3', 470)`) | the new row count (42 with A1); the two examples move to rows that stay offered, or, for a retired band, `referenceFor` is `undefined` and the row is found in `RETIRED_REFERENCE_ROWS` with its values (`nodeS` 48.6, the boards); with A1 both examples are retired bands; "the exact policy agrees" (line 46), "boards … include 32x15" (line 70) and "every reference row has … a cell" (line 104) must pass unchanged |
| `tests/generator-state.test.js` "a 60-cell board offers … and 360 offers Hard to Hell 2" (line 93), "Require one solution warns only on large Hell boards" (line 179), `describeLevels(676).length` | the 360 list of the new table (with A1: `hard` to `nightmare`, and the test's name says "Hard to Nightmare"); a reason is asserted only for a listed level (for a retired one, `describeLevels(360).find((l) => l.id === id)` is `undefined`; with A1 line 101's `hell-3` reason `larger` becomes that `undefined`, since Hell 3 is retired); `describeLevels(676).length` stays equal to `LISTED_LEVEL_IDS.length`. The `N-UNIQUE-EXP` test (`withBoard` moves the level to the nearest offered one, `generator/state.js:412`): its Hell example moves to a board where a Hell level is offered above 200 cells, or, when none is, the test asserts that the level moved off Hell and no notice appears there, with a name that says so (with A1 none is: `hell-1` on the 240-cell board moves to `nightmare`, with no notice); new: `LISTED_LEVEL_IDS` equals the ids offered on at least one area from 30 to 676 |
| `tests/generator-level-help.test.js` "piece-count help follows the policy plan and ends on the table range" (line 43: `levelHelp('pieces', 'hell-1', 676)`, the cap line "Most for this level" 42) | the largest area where Hell 1 is offered and the cap line still shows; if it shows nowhere, the assertion becomes `levelHelp` null at 676, with a message that says so (with A1 it shows nowhere: `levelHelp` returns null when `pieceCountPlan` is null, `generator/ui/level-help.js:55-58`) |
| `tests/clues.test.js` "slow: an unrateable calibration ends not-in-band with no puzzle (D36)" (line 564: 22 x 22 `hell-3`) | By the state of Hell 3 at 484 cells (cross-review RP02). **Still offered:** the test stays as it is: A2 to A6 change neither its set nor its rating (`pieceCountRange` inside an interval does not depend on the interval's ends, `POLICY_ID` is no RNG input, and the tuple is locked), so a failure after A2 to A6 is a stop. **Not offered (listed elsewhere or retired):** the test fails with the `RangeError` of `setAttempt`; apply MP12a's table "The D36 and fixture re-pins" (its row "The unrateable calibration", command B under the lock) to the inputs of MP09d2's C1 order that are still offered: the first whose attempt 0 is all capped becomes the test's board and level (seed and attempt unchanged). If none is offered or none is all capped, that is the intended effect of P-OD9, not a stop: the real-case premise is retired, and the test becomes a quick one that `setAttempt` refuses 22 x 22 `hell-3` (`RangeError`, "level hell-3 is not offered for 484 cells", true in this branch only), named so; the failure mode of an unrateable calibration stays pinned by MP09c's scripted test of line 703; a named item in the record. **With A1:** Hell 3 is retired and every input of MP09d2's C1 order is a Hell cell, so none is offered: the test becomes that quick refusal test, with no re-pin run |
| `tests/browser/generator-editor.js` "levels: a table compares every level; a 60-cell board offers Very easy to Master and explains the rest" (line 385: `radios().length` 10, "one row per listed level"), "levels: 360 squares offer Hard to Hell 2" (line 399), "The Require unique solution switch … warning on large Hell boards" (line 528) | the row count is `LISTED_LEVEL_IDS.length` (7 with A1; the 60-cell assertions stay); the 360 list of the new table (the enabled radios: a listed Hell level that is not offered at 360 is a disabled row, a retired one has no row); the Hell 1 click and the `N-UNIQUE-EXP` check move to a board where a Hell level is offered above 200 cells. When none is, the check asserts at 360 what the states give: each listed Hell level's row present and disabled (a click leaves the level unchanged, no `N-UNIQUE-EXP`), and no row at all (`input[value="hell-1"]` absent) for a retired Hell level; the test name says which. **With A1:** the 360 list is `hard` to `nightmare` (line 404), and the switch check asserts at 360 that no row exists for `hell-1`, `hell-2` or `hell-3` and that no `N-UNIQUE-EXP` appears; both names say so. Run the page (part D) |

Any other failing test is a stop. Not affected (checked at `cd5d17f`): `tests/cli.test.js:155` and
`tests/puzzlecode-cli.test.js:540` (Hell 3 on 10 x 6 stays refused), `tests/benchmark-matrix.test.js:58`,
`tests/generation-client.test.js:284`, `tests/protocol.test.js:219` (the protocol accepts any valid level id), the
level labels of `tests/player-i18n.test.js` and `tests/generator-i18n.test.js`, the frozen
`tests/fixtures/puzzlecode-v1.json` (a `hell-1` golden: codes do not check availability),
`tests/clues.test.js:265` (a Hell 1 band as a `selectClues` target, no availability check),
`tests/puzzlecode-acceptance.test.js:401` (the printed code of a hand-authored Hell 1 puzzle),
`tests/generator-state.test.js:247` (`nearestOfferedLevel('hell-3', 60)` stays `master`), `tests/difficulty.test.js:47`
and `tests/display-rating.test.js:55` (bands and display, not availability), `tests/puzzlecode.test.js:567` and `:733`
(level labels and titles of codes), `tests/policy.test.js:206` (`pieceCountRange('hell-3', 449)` stays null),
`tests/generator-state.test.js:112` (the default 60-cell board keeps "Levels above Master need a larger board."), and
`tests/fixtures/ui-flow-recipes.json` (no recipe uses a Hell level). With A1 no board of 81 cells or more shows the
`N-LEVELS` "above" notice any more (`generator/state.js:810`: no listed level lies above Nightmare); no test pins it
there.

**A8. Packs and links made earlier** need no code change: the pack reader and the codes never check availability,
v2 and v1 claims are re-rated for display (MP10b1, MP10b2) and v3 claims shown as stored. Add one quick test to
`tests/generator-import.test.js` that shows it after the change: a pack whose puzzle claims a Hell level that is no
longer offered on its board (a `difficulty-v2` claim of `hell-2` on a 20 x 20 board, built like that file's other
packs) reads `ok`, keeps its claim, is imported by the Generator as an Imported set, and gets a display-rating wish.

**A9. The documents** (both languages where there are two). The texts follow the areas of A1 and the owner's decisions
(P-OD9, P-OD12, P-OD13); the numbers quoted are those of the calibration record
(`docs/difficulty-v3/calibration-2026-11-15.md`).

- `docs/design-detail.md`:
  - §7.5 — the "Offered for A in" row (Hell 1, 2 and 3: never, `[Infinity, Infinity]`; Hell 4 as it is); the table
    "Resulting range of levels" (the highest level is Nightmare from 81 cells on); the paragraph "Reachability under
    `difficulty-v3` (D36; interim …)" replaced by the rule of D39 and the measured result (per Hell level: no case met
    90 % of its requests; Hell 1 reached 45 % on 26x26 and 0 % on 14x14 and 24x24, and the 22 other Hell cases made no
    puzzle in their three requests; links to the record §9 and this task's record; stated as a limit of the present
    search, not of the bands, PR-P2), followed by the limitation of P-OD12: "No fail-fast is built (owner decision
    P-OD12; the record §10: every measured rule also stopped requests that would have succeeded). A calibration whose
    clue subsets are all unrateable still ends `not-in-band` after 20 spent profiles, and a set request whose attempts
    all end so runs to its time limit with no puzzle (in the two-worker flow `N-NOSET` after the 115 s dispatch
    stop)."; and the 14 Hell rows of the final parameter table under a short heading "Measured before difficulty-v3, no
    longer offered (D36 (i), P-OD9)" (as in A5).
  - §7.8 — the census bullet (line 1737) gets one sentence: "The 17 cells above 25 % that are not Hell (all 15
    Nightmare cells, Master on 24x24 and 26x26) were accepted by the owner at the unchanged census budget of 80
    million, with the estimate note and the `censored` flag (P-OD13); the three Hell 1 cells are historical, Hell 1
    being offered nowhere (§7.5)." The lock bullet is completed by part D, step 7.
  - §6.11 — beside `N-UNIQUE-EXP` (line 1509): "No Hell level is offered under `mixed-v3` (§7.5), so the notice cannot
    appear while that holds; it stays for a later policy." Then the population-R limitation: "With `require`, 18x20
    Hard made 2 of 10 puzzles in its request (`partial`, `difficulty-not-found`: the repair of a Hard candidate almost
    always destroys its only decisive guess); Expert and Master made 10 of 10 (the calibration record §6 and item 7).
    The rule is unchanged: every cell made puzzles, so no owner question arose."
  - one clause each in §2 D14 (line 122: under `mixed-v3` every offered level is below Hell, so `require` is standard
    wherever a level is offered; its large-board limitation is in §6.11), §10.3 (line 2330: "Very easy … Nightmare";
    line 2334: `N-UNIQUE-EXP` "(not shown while no Hell level is listed)"), §10.7 (line 2413, the same note) and §14.2
    item 7 (line 2966: no Hell level is offered under `mixed-v3`; below Hell, `require` on a large board can still end
    `partial`, as 18x20 Hard in §6.11).
  - §5.4 (`mixed-v3`, "packs made before it carry `mixed-v2`"); the §6.4 heading; §4.2 (the `levels.js` block: "both
    ends may be `Infinity`: never offered"); §8.7 "Matrix rules" (its example uses a level that is still offered, and
    the 60-seed rule says that it has no subject while no Hell level is offered: the named item of A6); §13.2, the
    `policy` row (the anchor rows); §1.2 R13 and §2 D35 (one clause each: "under `difficulty-v3` no Hell level is
    offered: the present generator made none at the required rate on any board (D39), a limit of its search rather
    than a proof that their bands are unreachable (PR-P2), D36 (i), owner decision P-OD9"). Historical rationale and
    evidence (§7.4's band-ratio note, §14.1, Appendix A) stay as written.
- `docs/design-brief.md`: the table "Levels and typical boards" (line 42: `| 18×20 rectangle | 360 | Hard–Nightmare |
  Hard 16–18; Nightmare 25–28 |`; line 43: `| 22×22 rectangle | 484 | Hard–Nightmare | Hard 17–19; Nightmare 27–30 |`;
  the counts are `pieceCountRange` at `cd5d17f`, checked by SA1, and the developer recomputes them); line 27, "Require
  unique solution—experimental for Hell puzzles above 200 squares, where it may find no result": the Hell clause goes,
  and the sentence says that on large boards it may find fewer puzzles than asked; and one sentence in the difficulty
  paragraph: "The current generator offers no Hell level on any board: it could not make Hell puzzles reliably, a
  limit of its present search rather than of the levels; Hell puzzles in packs and links made before still open."
  Line 35 ("Nightmare/Hell starts with very few pieces") stays: it describes the ladder, which keeps its Hell rungs for
  puzzles made before.
- `USERGUIDE.md` and `USERGUIDE.vn.md`: line 25, "at ten levels" / "ở mười mức độ" → "at seven levels" / "ở bảy mức
  độ"; "A table lists every level from Very easy to Hell 3" (EN line 61) → "… to Nightmare", "từ Rất dễ đến Địa ngục 3"
  (VN line 59) → "… đến Ác mộng"; the "Difficulty" paragraph gets the sentence of the brief (in Vietnamese in the
  guide's own terms).
- `README.md` line 16, "makes puzzles from a set at ten levels" → "at seven levels".
- The page meta texts, "at ten levels" → "at seven levels": `generator/index.html` lines 15, 20, 21, 31 and 32, and the
  root `index.html` lines 17, 18, 28 and 29 (nothing else in the two pages changes).
- Sweep (every hit either follows the new table or is historical; say which in the reply):

  ```powershell
  Select-String -CaseSensitive -Pattern 'Hell|hell-|Địa ngục|mixed-v2|ten levels|mười mức' -Path README.md,
    USERGUIDE.md, USERGUIDE.vn.md, DEVELOPERGUIDE.md, DEVELOPERGUIDE.vn.md, docs\design-brief.md,
    docs\design-detail.md, index.html, generator\index.html
  ```

### Part B: the fail-fast — not built (owner decision P-OD12; check-list D40)

The owner chose **none** (P-OD12, 2026-11-15). Of MP12b2's measured rules only "none" meets the
zero-observed-false-stop rule (the record §10: F1 had 2 false stops in 7 triggers, F2 17 in 67, F1 + F2 5 in 21; at
Nightmare F2 lost 11 of its 18 triggered calls and F1 + F2 4 of 4). So this task builds nothing of the fail-fast: no
`unrateable` result, no `FAIL_FAST_PROFILES`, no `N-NOSET-UNRATEABLE`, and no change of `selectClues`, `rateSubset`,
`afterProfile`, `setAttempt`, `firstSetAttempt`, `puzzleCandidate`, `completionCandidate`, the client's ordered scan,
`SetJobResult`, `generator/jobs.js`, `tools/generate.mjs` or the locales, and no fail-fast test (`tests/clues.test.js`
changes only as A7 says). The fixture and recipe protections stay as they are (part D: GF-P2 and GA-P2 change no
puzzle).

This task writes the limitation instead, in design §7.5 (A9's text) and in the record (part D, step 6): a calibration
whose clue subsets are all unrateable still ends `not-in-band` after 20 spent profiles, and a set request whose
attempts all end so runs to its time limit and ends with no puzzle (`N-NOSET`); a named item for MP17's release notes.
`tests/clues.test.js:703` (20 profiles, `not-in-band`) stays as it is and keeps pinning the all-unrateable call (A7
turns the line-564 test into a quick refusal test).

The build instructions of the other choices (F1, F2, F1 + F2) are withdrawn; they remain in this file at `cd5d17f`.
Building any of them needs the owner's explicit override of P-OD12 and an addendum to this task (the record §13.2,
question 1).

### Part C: `require` at Hard and above — not built (no population-R question; check-list D41)

Population R made puzzles in every 18x20 cell (the record §6: with `--uniqueness require`, Hard made 2 of 10 puzzles in
its request, `partial` with reason `difficulty-not-found`; Expert and Master 10 of 10), so MP12b2 asked no question (the
record §13.2, question 2) and D41's rule is not built: no `REQUIRE_FROM_HARD_MAX_AREA`, no `uniquenessOffered`, no
`M-UNIQUE-NOT-OFFERED`, no refusal in `setAttempt`, the client or the CLI, and no locale change. `require` stays as it
is at every offered level.

This task writes the limitation instead, in design §6.11 (A9's text) and in the record: with `require`, a Hard request
on a large board can end `partial` (18x20: 2 of 10; the repair of a Hard candidate almost always destroys its only
decisive guess; the record §13.1, item 7); a named item for MP17's release notes. The build instructions of (R-a) are
withdrawn; they remain in this file at `cd5d17f`.

### Part D: the end of the lock (always)

After part A and its targeted tests (parts B and C are not built):

1. **GF-P2 for the policy id**: `node tools\record-fixtures.mjs --replace --reason "P3: Hell availability (D36 (i),
   P-OD9), policy mixed-v3"`, then `--check`. `git --no-pager diff -- tests/fixtures` must show only the `policy`
   value of `tests/fixtures/generation-case.json` (`versions`) and of `tests/fixtures/generated-sample-pack.json`
   (`generation.policy`); any other change (a piece, a clue, a score) is a stop. `player/samples/sample-pack.json` and
   `tests/fixtures/puzzlecode-v1.json` never change.
2. **The strict checks after GF-P2** (MP12a's list): the fixture-dependent files, then the quick set.
3. **GA-P2**: the final `npm test`, its first run kept as `tests/artifacts/MP12b3/ga-p2-first.txt`. No UI-flow recipe
   may change (no migration is allowed here): a failure is a stop. One exception: an EPERM of `tests/site-tools.test.js`
   in its cleanup, handled as MP12a's closing addendum says (that file alone, then `npm test` once more, both recorded).
4. **The browser page**, one per lock: `generator-editor` (main phase); no `generator-flow`, since no fail-fast is built
   (P-OD12).
5. **The identity of the locked tree** (`sourceDigest`, `versions` with `policy` `mixed-v3`), printed after `npm test`
   and recorded.
6. **The record** `docs/difficulty-v3/availability-<date>.md` (new, English, CRLF): the header (date, revision, the
   owner decisions applied: P-OD9, P-OD12 and P-OD13, and that population R raised no question); the derivation tables
   (A1) and their match with MP12b2's §9; `AREAS` before and after; the policy id; the Generator's list before and
   after; the reference rows retired (all 14 Hell rows, none split); the BQ cases removed (per matrix: 13, 9, 9 and 8)
   with the named item of A6; every test changed, with its reason (A7), and the line-564 test's named item; the
   test of A8; part B "not built" (P-OD12) with the limitation written in design §7.5, and part C "not built" (no
   population-R question) with the limitation written in design §6.11; the census acceptance (P-OD13: the 17 cells
   that are not Hell, as listed in MP12b2's record §13.2, question 3; the three Hell 1 cells historical); the gates
   (commands, start, end, seconds, lock waits, counts); the identity; the lock completion statement (below); the named
   items for MP17 (A6's BQ rule; the fail-fast limitation; the population-R limitation; the `N-LEVELS` "above" notice
   that no board of 81 cells or more shows any more).
7. **Design §7.8**: in the lock bullet, the parenthesis that names what MP12b3 completes ("… the policy id and, when the
   owner agreed, the fail-fast and the population-R outcome") becomes "(the Hell `AREAS`, P-OD9; the policy id
   `mixed-v3`; no fail-fast, P-OD12; `require` unchanged)", and after MP12b2's lock statement one sentence: "MP12b3
   completed the lock: the Hell availability of §7.5 (P-OD9: no Hell level is offered on any board up to 676 cells),
   the policy id `mixed-v3`, no fail-fast (P-OD12; the limitation in §7.5) and `require` unchanged (population R made
   puzzles; the limitation in §6.11); from the commit `difficulty-v3 MP12b3` on, no rating and no generated puzzle
   changes."
8. `npm run check` last.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/levels.js` | `AREAS` (A2) |
| `core/engine/policy.js` | `POLICY_ID` `'mixed-v3'`, the header comment, the `SCORE_V3` comment (A3) |
| `generator/state.js` | `LISTED_LEVEL_IDS` and its comment (A4) |
| `tools/bench/calibration-reference.js` | `REFERENCE_ROWS`, `RETIRED_REFERENCE_ROWS`, `landscapeBoards` (A5) |
| `tools/bench/matrices/bq-0.json`, `bq-1.json`, `bq-2.json`, `bq-3.json` | cases no longer offered removed (A6) |
| the tests of A7, `tests/generator-import.test.js` (A8) | as the table says |
| `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` | by the tool (GF-P2; the policy id only) |
| `docs/design-detail.md`, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md`, `README.md` | A9, D7 |
| `index.html`, `generator/index.html` | the meta texts "at ten levels" only (A9) |
| `docs/difficulty-v3/availability-<date>.md` (new) | the record (D6) |

Parts B and C are not built (P-OD12; no population-R question): `core/engine/clues.js`, `core/engine/generate.js`,
`core/engine/types.js`, `core/browser/`, `generator/jobs.js`, `tools/generate.mjs`, the locales of both apps and
`tests/clues.test.js:703`, `tests/generate.test.js`, `tests/generation-client.test.js` and
`tests/generator-controller.test.js` do not change.

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12b3/` (the helper, `derive.mjs`,
the page runner copies and evidence, the TAP files) and the Edge profile `tests\artifacts\edge-MP12b3\`. Must not edit:
`SCORE_V3`, `DEDUCE`, `K60`, `SHARES`, `STALL_LIMIT`, `core/engine/deduce.js`, `core/engine/difficulty.js`,
`core/engine/version.js`, `player/samples/sample-pack.json` (check-list D20, kept by owner decision P-OD10),
`tests/fixtures/puzzlecode-v1.json`, `tests/fixtures/ui-flow-recipes.json`, the MP12 records and folders,
`docs/calibration/`.

### Documentation slot

- `docs/design-detail.md`: §7.5 (availability, the D36 paragraph with the limitation of P-OD12, the Hell rows of the
  parameter table), §5.4, the §6.4 heading, the §4.2 `levels.js` block, §6.11 (the `N-UNIQUE-EXP` note and the
  population-R limitation), §8.7, §10.3, §10.7 (the `N-UNIQUE-EXP` row), §13.2 (the `policy` row), §14.2 item 7, §1.2
  R13, the §2 D14 and D35 rows, and §7.8 (the census sentence of P-OD13, and the lock bullet's parenthesis and
  completion sentence; MP12b2 owns the rest of §7.8).
- `docs/design-brief.md` (line 27, the difficulty paragraph and the table "Levels and typical boards", lines 42-43),
  `USERGUIDE.md` and `USERGUIDE.vn.md` (lines 25 and 61 / 59, the "Difficulty" paragraph), `README.md` (line 16), and
  the meta texts of `index.html` and `generator/index.html`, as A9 says.

## Implementation steps

1. Read the inputs and the owner's decisions (P-OD9, P-OD12, P-OD13); save the helper; write `derive.mjs` and compare
   its tables with MP12b2's record §9 (A1).
2. Part A: `AREAS`, the policy id and comments, the Generator's list, the reference rows, the BQ matrices, the tests
   of A7 and A8 (targeted runs under the lock).
3. Parts B and C: nothing to build (P-OD12; no population-R question); their limitations are written with the
   documents.
4. The documents (A9, with the limitations of parts B and C).
5. Part D: GF-P2, the strict checks, GA-P2, the browser page, the identity, the record, design §7.8,
   `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b3-B01 | The Generator offers a Hell level only on the board areas where v3 made it as reliably as the other levels (at least 90 % of 20 requests complete), and nowhere else; a Hell level made nowhere is not listed. With the evidence of MP12b2 (its record §9) that is no Hell level on any board: Hell 1, 2 and 3 are not listed, and every level that is not Hell keeps its areas | `levels.js`; the record's derivation tables; the Generator's list; the editor page |
| MP12b3-B02 | Packs and links made before still open, keep their stored claims and are re-rated for display as before | A8's test; the unchanged reader and display tests |
| MP12b3-B03 | No fail-fast is built (owner decision P-OD12): no puzzle that a request made before changes, and the design and the record state the limitation (a set request whose ratings all reach their work limits runs to its time limit and ends with no puzzle) | GF-P2's diff; `npm test`; design §7.5; the record |
| MP12b3-B04 | `require` stays as it is at every offered level (population R made puzzles in every 18x20 cell; no question was asked), and the design and the record state the limitation (18x20 Hard made 2 of 10 puzzles with `require`) | the unchanged code; design §6.11; the record |
| MP12b3-B05 | The design, the brief, both user guides, the README and the meta texts of the two pages describe the new availability, and the lock is complete | the documents; design §7.8; the record |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b3-T01 | `AREAS` equals the intervals of D39 computed from the aggregate in force (Hell 1, 2 and 3 `[Infinity, Infinity]`; Hell 4 `[744, Infinity]` unchanged), and they equal MP12b2's record §9 | `derive.mjs` output; the record |
| MP12b3-T02 | `POLICY_ID` is `mixed-v3`; `SCORE_V3`, `DEDUCE`, `K60`, `SHARES`, `STALL_LIMIT`, `deduce.js`, `difficulty.js` and `version.js` are unchanged; the stale `SCORE_V3` comment is gone | `git --no-pager diff` |
| MP12b3-T03 | `LISTED_LEVEL_IDS` equals the levels offered on some area from 30 to 676 (a test): the seven named levels; the landscape keeps the 16 boards of `cd5d17f` and its matrix the 80 cases that are not Hell (A5); every BQ case is offered and only the cases no longer offered (all Hell cases: 13, 9, 9 and 8) were removed | tests; the record |
| MP12b3-T04 | Only the tests of A7 and A8 changed, each as its row says and listed in the reply; no test was weakened beyond the stated contract change | the diff; the reply |
| MP12b3-T05 | Parts B and C are not built: `core/engine/clues.js`, `core/engine/generate.js`, `core/engine/types.js`, `core/browser/`, `generator/jobs.js`, `tools/generate.mjs` and the locales of both apps are unchanged, and `tests/clues.test.js:703` still pins 20 profiles and `not-in-band` | `git --no-pager diff --stat`; the test |
| MP12b3-T06 | GF-P2 changed only the `policy` values of the two fixtures; `--check`, the strict checks, the quick set and the final `npm test` pass under the lock; the browser page passes (the runner's `PASS` line, no CSP violation, no uncaught error) | the gate record; the TAP file; the page evidence |
| MP12b3-T07 | The record exists with every section of D6; design §7.8 has the census sentence (P-OD13), the lock bullet's parenthesis and the completion sentence; `npm run check` passes; every written file is CRLF without BOM | the files; command output |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP12b3\dv3-lock.ps1
# targeted, after part A (parts B and C are not built)
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

# the browser page, one page per lock, with MP16b's runner copied to pages.mjs (main phase)
$pages = @('generator-editor')   # no generator-flow: no fail-fast is built (P-OD12)
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

The rows of A7 (as contract changes), A8, and:

1. `LISTED_LEVEL_IDS` equals `[...new Set(range(30, 676).flatMap((a) => offeredLevels(a).map((l) => l.id)))]` in level
   order (`tests/generator-state.test.js`).
2. `landscapeBoards().map((b) => b.id)` contains the 16 ids of `cd5d17f` (`6x10`, `3x29`, `10x10`, `12x12`, `14x14`,
   `15x15b10`, `16x16`, `15x20`, `18x18`, `18x20`, `20x20`, `20x21`, `32x15`, `22x22`, `24x24`, `26x26`) and no other
   id (A5 splits no row) (`tests/calibration.test.js`); every row of `RETIRED_REFERENCE_ROWS` (the 14 Hell rows) lies
   wholly outside its level's interval, and `buildLandscapeMatrix()` has 80 cases, none of them at a Hell level.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the derivation tables, the new `AREAS`, the changed tests with
  their reasons, parts B and C "not built" with their reasons (P-OD12; no population-R question) and the limitation
  texts written, the gate record (commands, counts, durations, lock waits), the browser result, the identity of the
  locked tree and the named items (the BQ rule of A6 among them).
- Handoff to MP13a to MP17: the lock is complete at this task's commit (check-list D35); the policy id is `mixed-v3`;
  the offered levels of 10 x 6 and 20 x 18 for MP17 (`offeredLevels(60)`: Very easy to Master; `offeredLevels(360)`:
  Hard, Expert, Master and Nightmare); no failure reason `unrateable` exists (part B not built: MP13a's `SelectResult`
  and MP14a's events keep `not-in-band` and `uniqueness-not-proved`); this task's record for MP17's release notes (the
  Hell levels no longer offered, the limitations of P-OD12 and of population R, the census acceptance of P-OD13).

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

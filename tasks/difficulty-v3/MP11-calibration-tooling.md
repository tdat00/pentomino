# MP11 — Calibration tooling for v3 and the slow v3 test

| Header | Value |
|---|---|
| ID | MP11 (the report's MP11) |
| Depends on | MP10b2 (accepted and committed); MP09d2 (`rate` is v3); MP08 (`tests/difficulty-v3.test.js` exists with its quick part) |
| Estimated size | Medium: about 400–600 changed lines (tools about 150, tests about 250–350, documents about 30); about 45–60 minutes plus one announced slow-test run (about 2–8 minutes) |
| Owner role | Tools |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (tooling paragraph), RES-26 (the slow part), RES-35 (AR1: every generated Hard-or-above puzzle has `Gproved >= 1`), RES-14 (no pack capture; regenerated requests); clarifications PROC-P1 (a), SA2-Q-P09, AR1 (owner); check-list §4.2 D28 |
| Gates owned | none of §7; the task's own slow test is run once, announced like a gate |
| Implementation status | Not started |

## Goal & business context

The levels must be measured on the real engine before they are locked (owner's process decision PROC-P1 (a)): MP12
re-runs the score landscape with v3 and compares it with the v2 baseline. The calibration tools still record and
report v2 quantities (the v2 "saturated" share, a clue count called `G`), so they cannot show what the owner asked to
see: the v3 score, the decisive guesses G and their information, the hardest deduction tier, the solution count, how
many ratings are estimates, and that every generated Hard-or-above puzzle has at least one proved real choice (AR1,
owner).

This task makes the tools record and report the v3 measures, keeps every old record readable, and adds the slow test
that generates puzzles at every level on two boards and checks that the levels are ordered and that Hard and above
always need a proved real choice.

## Scope

### In scope

- `tools/bench/runner.js`: the accepted-puzzle details (`clues` instead of `G`, the v3 measures), the profile samples
  (`clues`, the v3 measures, unrateable samples counted), `ratingCensoredCount`.
- `tools/bench/report.js`: `ratingCensoredCount` in the run record (optional for old records) and in the report.
- `tools/bench/calibration-reference.js`: `aggregateLandscape` (clue counts from `clues ?? G`; the per-cell v3 block)
  and the Markdown landscape (the v3 table).
- Tests: `tests/calibration.test.js`, `tests/benchmark-report.test.js`, the slow part of `tests/difficulty-v3.test.js`.
- Documents: `docs/design-detail.md` §7.8 (what the landscape reports), `DEVELOPERGUIDE.md` and
  `DEVELOPERGUIDE.vn.md` (one sentence where `calibrate.mjs` is described, lines 75-76).

### Out of scope

- Any knob, cap, `K60`, `SHARES` or `POLICY_ID` (MP12a, MP12b); any engine or app file.
- Running `tools/calibrate.mjs` at scale (GL-P3 is MP12's); `npm test` (no gate here).
- Records under `docs/calibration/` (history, never edited).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Node tools use `.mjs` for entry points; `tools/bench/*.js` are ES modules shared with the browser benchmark page:
  keep them free of Node-only imports.
- Old records stay readable: every reader accepts records written before this task (with `G` as the clue count, without
  `ratingCensoredCount`, without v3 fields).
- The slow test's name starts with `slow:` so `npm run test:quick` skips it; run it once as written in the test plan.
  **Announce that run to the orchestrator before starting it** (the Sudoku repository runs in parallel on the same
  machine; never two heavy runs at once): expected wall time about 2–8 minutes, and it must stay under 10 minutes.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or
  `docs/difficulty-v3/`. UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

### Code (anchors at HEAD `041ff83`; MP09d2 to MP10b2 do not change `tools/bench/`)

- `tools/bench/runner.js:676-702`: after a run, `run.details = { area, K, sizes, setAttempt, initialG, policy,
  puzzles: kept.map((v) => ({ G: v.puzzle.clues.length, U: sizes.length - v.puzzle.clues.length, score:
  v.puzzle.rating?.score ?? null, level: …, saturated: … })), resultDigest }` (the `G` here is the **clue count**,
  lines 689-695). `run.ratingSaturatedCount` (603). `sampleProfiles` (402-460): diagnostic samples of a witness, rated
  with the `rate` task on a fresh pool; each sample is `{ A, K, G: job.g, U: K - job.g, score, inBand, saturated,
  branchTrials, rowTrials, ratingMs, certificateStatus: 'not-checked', sample }` (440-442; `G` = clue count again); a
  failed rating counts in `failures` and its first three errors go to `record.errors`; samples are sorted by `a.G - b.G`
  (456).
- `tools/bench/report.js`: `RunRecord` typedef (about 60-98), `newRunRecord` (101-149), `validateRunRecord` (162-206;
  fields added later are accepted when missing, for example `layoutsExhausted`), `evaluateCell` (304; its
  `saturatedAccepted`, 432), the certificate table of `renderMarkdown` (609-612).
- `tools/bench/calibration-reference.js`: `scoreGroups` (342-358), `aggregateLandscape` (367 onward; the cell field
  `G: { initial, accepted }` at 427-430 reads `p.G` of the details; `saturation` 431-434; `sampledInBandRate` 435),
  `renderLandscapeMarkdown` (the cell table at 596-605, the score groups at 615-618).
- `tests/calibration.test.js`: fixture records with the old `G` (about 144-177); "samples feed score distributions …"
  (208-220, asserts `c.G.accepted` at 219); "the landscape profile samples distinct clue counts …" (369-394: runs
  `tools/calibrate.mjs` in-process on `^6x10-very-easy$` with one seed and two workers, and reads `s.G` at 383 and 388,
  and the sample keys at 387). `tests/benchmark-report.test.js:265`, "run records are validated structurally".
- The v3 rating (MP09d2): `{ model: 'difficulty-v3', score, level, saturated: false, censored?: true, metrics }`;
  `metrics` (design §7.10 order) includes `U`, `deductionTier`, `G`, `info`, `Cmax`, `Dmax`, `Gt`, `nodes`, `work`,
  `S`, `solutionLimit`, `solutions` (`'unique' | 'few' | 'many' | 'unknown'`), `censusComplete`, `censusUndecided`,
  `censusNodes`, `censusWork`, `Gproved`, and the DLX diagnostic `B`, `branchTrials`, `rowTrials`, `dlxStop`. A `rate`
  task can fail with `rating-incomplete` (an unrateable puzzle, RES-04).
- Generation in-process (for the slow test): `firstSetAttempt(req, maxAttempts = 32)` (`core/engine/generate.js:148`;
  `req = { board, rotation, levelId, seedText, uniqueness, execution }`, returns `{ result: { set, calibration, attempt
  } | null, failures }`) and `runFold(ctx)` (593; `ctx = { set, calibration, targetLevelId, quantity, batchSeed,
  uniqueness, seenLayouts, seenClues, execution }`; returns the fold state whose `accepted` is the list of accepted
  `PuzzleCandidate`s `{ layout, layoutKey, clueKey, clues, rating, certificate }`); `execution = { main:
  createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) }`
  (`core/engine/workspace.js`); `offeredLevels(area)` and `level(id)` (`core/engine/levels.js`; `level(id).index` is the
  ladder index); `rectRows(cols, rows)` (`tools/bench/calibration-reference.js:150`). Offered levels: 10 x 6 (60 cells)
  very-easy to master; 12 x 12 (144 cells) easy to nightmare.

### Record fields (RES-25; check-list D28)

Accepted puzzles, `run.details.puzzles[i]` (written by the runner from now on):

```js
{ clues, U, score, level, saturated, censored, metrics }
// clues: the number of clues (was G); U: pieces to place; censored: rating.censored === true;
// metrics: for a difficulty-v3 rating the subset, in this order:
//   { deductionTier, G, Gproved, info, Cmax, Dmax, solutions, censusComplete, censusUndecided, F, E, nodes, work }
//   null for any other model
```

Profile samples, `run.samples[i]`:

```js
{ A, K, clues, U, score, inBand, saturated, censored, deductionTier, G, Gproved, censusComplete, branchTrials,
  rowTrials, ratingMs, certificateStatus, sample }
// clues = job.g (was G); G, Gproved, deductionTier, censusComplete from rating.metrics (null when absent);
// branchTrials, rowTrials as today (the DLX diagnostic stays in the v3 metrics)
```

- An unrateable sample (`errorCode(e) === 'rating-incomplete'`) is counted in `record.details.sampleUnrateable` (0 by
  default) besides the existing `failures` and error list.
- `run.ratingCensoredCount` = the accepted puzzles with `censored: true` (beside `ratingSaturatedCount`, which stays
  and is 0 for v3).
- Readers: wherever a record's clue count is read, use `x.clues ?? x.G` (old records); sort samples by that value.

### Report additions (RES-25)

- `report.js`: `RunRecord.ratingCensoredCount` (`newRunRecord` default 0; `validateRunRecord` accepts it missing or a
  finite number, like the 2026-10-23 fields); `evaluateCell` adds `censoredAccepted` (sum); the certificate table gets
  a column "census estimates" (`censoredAccepted/acceptedTotal`).
- `calibration-reference.js`, per cell of `aggregateLandscape`:
  - rename the cell field `G` (clue counts: `initial`, `accepted`) to `clues`, reading `p.clues ?? p.G`;
  - add `v3` (null when no accepted puzzle has v3 metrics): `{ accepted, score: summarize(scores), G: histogram,
    info: summarize, Cmax: histogram, tier: histogram of deductionTier, solutions: histogram, censored: { count,
    share }, provedZero: <accepted puzzles of level index >= 3 with Gproved === 0> }` (`summarize` and `histogram` are
    the module's helpers);
  - samples: `sampledUnrateable` (sum of `sampleUnrateable`).
- `renderLandscapeMarkdown`: a table "v3 measures per cell" after the cell table: `| Cell | Accepted | Score median |
  Score p95 | G median | info median | Cmax max | Tier 0/1/2/3 | Solutions unique/few/many/unknown | Census estimates
  | Hard+ with Gproved = 0 |`; a cell without v3 data shows "-" in each column.

### The slow test (RES-26; AR1)

In `tests/difficulty-v3.test.js` (MP08's file), one test:

```text
test('slow: v3 generation orders the levels on 10x6 and 12x12, and every Hard-or-above puzzle has a proved guess')
  execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) }
  for (cols, rows) of [(10, 6), (12, 12)]:
    board = boardFromRows(rectRows(cols, rows)); id = `${cols}x${rows}`
    for lv of offeredLevels(cols * rows):
      seedText = `v3-slow/${id}/${lv.id}`
      found = firstSetAttempt({ board, rotation: 0, levelId: lv.id, seedText, uniqueness: 'any', execution })
      if found.result === null: record a miss of 3 and continue
      s = runFold({ set: found.result.set, calibration: found.result.calibration, targetLevelId: lv.id, quantity: 3,
                    batchSeed: `${seedText}#1`, uniqueness: 'any', seenLayouts: new Set(), seenClues: new Set(), execution })
      hits = s.accepted.length; misses = 3 - hits; scores = s.accepted.map((c) => c.rating.score)
      every accepted c with levelIndex(lv.id) >= 3 (Hard or above): c.rating.metrics.Gproved >= 1   (AR1, RES-35)
      every accepted c: c.rating.model === 'difficulty-v3' and c.rating.saturated === false
    the medians of the levels with at least one puzzle strictly increase with the level index (per board)
  t.diagnostic(one line per board and level: hits, misses, scores, Gproved values, seconds)
```

`levelIndex(id)` is `level(id).index` (`core/engine/levels.js`; Hard is 3, Hell 3 is 9). Fixed seeds
make the test deterministic; it pins no score (the knobs move in MP12). A level with no puzzle on a board is reported
in the diagnostic, not asserted (RES-26 records hit and miss counts); the test asserts that each board has at least
four levels with puzzles. If the run takes more than 8 minutes on this machine, report it (MP12 may need to reduce the
levels); do not change the quantity or the boards.

## Files to create/modify

| File | Change |
|---|---|
| `tools/bench/runner.js` | details, samples, `ratingCensoredCount`, `sampleUnrateable` |
| `tools/bench/report.js` | `ratingCensoredCount`, `censoredAccepted`, the certificate table |
| `tools/bench/calibration-reference.js` | `clues`, the `v3` block, `sampledUnrateable`, the v3 table |
| `tests/calibration.test.js`, `tests/benchmark-report.test.js` | intended changes and new cases |
| `tests/difficulty-v3.test.js` | the slow test (append; do not touch the quick part) |
| `docs/design-detail.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` | documents |

Exclusive ownership while active: the files above. Documentation slot: design §7.8 (the bullet on what
`calibrate.mjs` reports, lines 1612-1614) and the developer guides' `calibrate.mjs` sentence. Must not edit:
`core/engine/policy.js`, `core/engine/levels.js`, the generation fixtures, `docs/calibration/`.

### Intended contract changes of existing tests (only these)

| Test | Change |
|---|---|
| `tests/calibration.test.js:208-220` | `c.G.accepted` becomes `c.clues.accepted` (the fixture records keep `G`: this proves old records stay readable) |
| `tests/calibration.test.js:369-394` | `s.G` becomes `s.clues` (383, 388) and the expected sample keys (387) are the new list above (the field filter of line 387 lists the new names) |

### Documents

- `docs/design-detail.md` §7.8, the `calibrate.mjs` bullet: it reports per cell the v3 score distribution, the decisive
  guesses G and their information, Cmax, the hardest deduction tier, the solution counts, the share of census
  estimates and the Hard-or-above puzzles without a proved guess (always 0 by RES-35), next to the in-band hit rate,
  rating cost and certificate outcomes; records written before v3 stay readable; output under
  `docs/difficulty-v3/` for this change.
- `DEVELOPERGUIDE.md` (75-76) and `DEVELOPERGUIDE.vn.md` (the same place): "The landscape report shows the v3 measures
  per cell (score, decisive guesses, deduction tier, census estimates)." and the Vietnamese equivalent.

## Implementation steps

1. `runner.js`, `report.js`, `calibration-reference.js`.
2. The intended test changes; new cases; `node --test --test-skip-pattern=slow tests\calibration.test.js
   tests\benchmark-report.test.js`.
3. The slow test; announce; run it once (test plan); record its diagnostic.
4. Documents; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP11-B01 | The calibration report shows the v3 measures per board and level, including how many ratings are estimates and that no generated Hard-or-above puzzle lacks a proved real choice | `tests/calibration.test.js`; the Markdown of the in-process run |
| MP11-B02 | Generated levels are ordered on 10 x 6 and 12 x 12, and every generated Hard-or-above puzzle has at least one proved real choice | the slow test's run |
| MP11-B03 | Reports written before this change can still be read and aggregated | old-record tests |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP11-T01 | Records carry `clues` and the v3 subset in the stated order; samples carry `clues` and the v3 fields; `sampleUnrateable` and `ratingCensoredCount` are recorded | tests |
| MP11-T02 | `validateRunRecord` accepts records with and without `ratingCensoredCount`; `aggregateLandscape` reads `clues ?? G` | tests |
| MP11-T03 | The cell's `v3` block and the Markdown v3 table are computed as specified; cells without v3 data show "-" | tests |
| MP11-T04 | The slow test passes once in under 10 minutes and is skipped by `npm run test:quick`; its diagnostic is in the reply | command output |
| MP11-T05 | Only the listed existing tests change; `npm run test:quick` and `npm run check` pass; documents in both languages | diff; command output; review |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests\calibration.test.js tests\benchmark-report.test.js tests\difficulty-v3.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }

# announced: the slow test once (about 2-8 minutes; must stay under 10)
node --test --test-name-pattern="^slow: v3 generation" tests\difficulty-v3.test.js
if ($LASTEXITCODE -ne 0) { throw 'slow v3 test failed' }

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases

1. `tests/benchmark-report.test.js`: a record without `ratingCensoredCount` is valid; with `ratingCensoredCount: 2` it
   is valid; with `'2'` it is not; `evaluateCell` sums `censoredAccepted`; the certificate table shows the column.
2. `tests/calibration.test.js`: new-format records (`clues`, v3 `metrics`, `censored`) aggregate into `clues.accepted`
   and the `v3` block (score summary, the G, Cmax, tier and solution histograms, the censored count and share, and
   `provedZero` counting only level index >= 3); a mix of old and new records aggregates their clue counts together; a
   cell without v3 data has `v3: null` and the Markdown shows "-"; `sampledUnrateable` sums the details.
3. The in-process calibration test (369) after the intended change: the sample keys and `s.U === s.K - s.clues`;
   each sample has a `censored` boolean and `deductionTier` in 0-3 (or null for an unrateable-free run).
4. The slow test as specified.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the slow test's diagnostic table (hits, misses, scores, Gproved per
  board and level), its duration, and the test counts.
- Handoff to MP12a: the landscape JSON and Markdown now carry the v3 measures; the slow test is part of `npm test`
  (GA-P2 runs it); D21-like outcomes (a level without puzzles) are listed for MP12's knob work.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP11: Calibration tooling for v3 and the slow v3 test`) |
| Start | 2026-11-13 10:06 (+07:00) |
| End | 2026-11-13 10:15 developer; 10:18 orchestrator commit |
| Duration | 9 min developer (the slow test 101 s under the timing lock); about 3 min review (with the orchestrator's slow-test run) |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 62 model calls; 8,882,478 input tokens (8,701,362 cache reads); 49,304 output tokens |
| AI credits | about 182 (developer) |
| Verification | Developer: targeted `node --test --test-skip-pattern=slow` (calibration, benchmark-report, difficulty-v3) 62/62 (7.6 s); the slow test under the timing lock 1/1 (101.4 s, lock wait 0 s); `npm run test:quick` 1339/1339 on the second run (the first run had one timing-verdict failure, below); `npm run check` OK; `record-fixtures --check` OK. Orchestrator re-run: targeted 62/62; `test:quick` 1339/1339; `check` OK; `record-fixtures --check` OK; the slow test under the timing lock 1/1 (102 s) |
| Acceptance | MP11-B01..B03 and T01..T05 met. Diff reviewed: the runner records `clues`, the 13 v3 measures in design order, `censored`, `ratingCensoredCount` and the unrateable samples (`rating-incomplete`); `validateRunRecord` accepts a missing or numeric `ratingCensoredCount`; `aggregateLandscape` reads `clues ?? G` (old records stay readable), adds the per-cell `v3` block (`censored`, `provedZero` for Hard and above) and `sampledUnrateable`, and the Markdown "v3 measures per cell" table; the certificate table gains "census estimates"; `SOURCE_FILES` keeps MP10a's entry. Slow test, 3 hits and 0 misses at every level: medians 10x6 6, 9, 12, 23, 31, 44 and 12x12 10, 13, 19, 34, 45, 65 (strictly increasing); every Hard-or-above puzzle has `Gproved >= 1` (1 to 7); 12x12 Nightmare costs 92.8 of the 101 s |
| Issues & resolutions | (1) One `npm run test:quick` run failed once on "the smoke matrix writes valid reports..." (`tests/calibration.test.js:393`): a cell verdict `fail` instead of `node-screening-only`, a timing-derived verdict, right after the slow run; it passed alone before, on the immediate rerun and in the orchestrator's run; recorded as a load-sensitive quick test, not caused by MP11. (2) Moved anchors: design §7.8's `calibrate.mjs` bullet at 1736-1738 (task: 1612-1614), the guides' sentence at 77-78 (task: 75-76). (3) The intended change at `calibration.test.js:387` is an exact sorted key-set check of the 17 sample keys (stricter than the field count). (4) `histogram` sorts strings too, so the tier and solutions histograms work. (5) `provedZero` uses the cell's requested level (equal to the puzzle's level for validated in-band puzzles). (6) A small `isCensored(rating)` helper in `runner.js` |
| Handoff | MP12a: each landscape cell has `clues`, `v3` (null without v3 data) and `sampledUnrateable`; run records have `ratingCensoredCount`; `details.puzzles[]` and `samples[]` have the new shapes; the Markdown has the "v3 measures per cell" table and `benchmark-report` the "census estimates" column. The slow test runs in `npm test` (GA-P2), pins no score, uses seeds `v3-slow/<board>/<level>`; its scores above are MP12's starting point; 12x12 Nightmare is where its time goes; it covers no Hell level |

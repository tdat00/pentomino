# MP06a — Probe tool `tools/rate-probe.mjs` and the `tieOrder` diagnostic

| Header | Value |
|---|---|
| ID | MP06a |
| Depends on | MP05 (accepted and committed) |
| Estimated size | Medium: about 450–700 changed lines (tool about 300–400, deduce.js about 30, tests about 150–250, guides about 30); about 40–60 minutes |
| Owner role | Tools |
| Milestone | M3 — measured fit |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-12 (probe tool), RES-13 (order noise), RES-14 (regenerated requests and `resultDigest`), RES-18 (the formula used by `--knobs`), RES-32 row MP06; check-list §4.2 D7, D18 (traceability only) |
| Implementation status | Not started |

## Goal & business context

Before the new rating is switched on, the team must see what it would say about real generated puzzles: how many
real choices Hard puzzles contain, how much a rating costs on large boards, how often the census stops early, and how
the old (v2) and new (v3) levels compare. This task builds the instrument: a read-only command-line probe that rates
every puzzle of a pack, or of freshly generated or regenerated requests, with the old rating, the deduction solver
and (for exploration) candidate v3 knobs, and prints one JSON line per puzzle. MP06b runs it at scale.

It also adds the `tieOrder` diagnostic to `measureDeduction`, so the probe can measure how much G and info depend on
the solver's tie rule (RES-13). Production never uses it. No rating, puzzle or document a user sees changes.

## Scope

### In scope

- New `tools/rate-probe.mjs` (CLI and exported functions).
- `core/engine/deduce.js`: the `diagnostics.tieOrder` option only.
- New `tests/rate-probe.test.js`; one `tieOrder` case in `tests/deduce.test.js`.
- `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: the probe command and the deduction solver module.

### Out of scope

- Running the probe at scale, GV2, `DEDUCE` values, the record (MP06b).
- The production v3 formula (MP08: it later replaces the tool's local formula by `breakdownV3`).
- Any change of `rate`, `selectClues`, generation, packs or apps.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Node-only tool: `.mjs`, `// @ts-check`, JSDoc, native ES modules, no dependency. The tool is read-only: it writes
  only stdout, stderr and the file given with `--output`.
- `deduce.js` stays pure; none of the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive`, `deriveLimits` in it.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no test name containing `slow`.
- Run only the commands of the test plan (no probe run at scale; the tests use the small fixture and one small
  regeneration); never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/` or the
  reports.

## Inputs & context

### Existing pieces to reuse (anchors at HEAD; find moved lines by the quoted text)

- `tools/generate.mjs`: `export async function run(argv, overrides = {})` (line 510) runs a whole generation through
  the production client and worker pool; with no `--output` and no `--code` it writes the pack JSON to
  `overrides.stdout`; `overrides.readText` replaces file reading, so a recipe can be passed in memory
  (`run(['--recipe', 'probe-recipe', '--workers', n], { readText: () => JSON.stringify(recipe), stdout, stderr })`).
  Exit codes 0 complete, 2 partial, 1 failure. `checkRecipe` (line 221) requires the fields `version` (1),
  `boardRows`, `rotation`, `levelId`, `quantity`, `seedText`, `batchIndex`, `batchSeed` (= `seedText + '#' +
  batchIndex`), `uniqueness` and `versions` (equal to `currentVersions()` of `tools/record-fixtures.mjs`).
- `core/engine/pack.js`: `parsePack(text)` (line 1130), `validatePack(input)` (1078).
- `core/engine/board.js`: `boardFromRows(rows)`.
- `core/engine/difficulty.js`: `rate(board, pieces, clues, ws)` (line 109, v2 until MP09c), `measure`, `SCORE` caps
  from `core/engine/policy.js` (`SCORE.caps = { branch: 5000, rows: 50000 }`, line 51).
- `core/engine/tiling.js`: `buildModel(board, pieces, clues, ws)`, `solveFirst(model, { rng, rowTrialLimit,
  branchTrialLimit })` (line 165, returns `{ layout, rowTrials, branchTrials, exhausted, stop }`).
- `core/engine/deduce.js`: `measureDeduction(model, limits = DEDUCE, diagnostics = {})` and the `DeductionResult` of
  MP05 (`path`, `first` with raw `choices` and `census`, `search`, `count`, `census`).
- `core/engine/rng.js`: `createRng(seedText, label = '')`.
- `core/engine/workspace.js`: `createWorkspace(MAIN_WORKSPACE_BYTES)`; a workspace has `bytes()` and `peakBytes()`.
- `core/engine/levels.js`: `levelForScore(score)`.
- `core/engine/hash.js`: `sha256Hex`, `canonicalJson`. `tools/bench/runner.js`: `validateAccepted(set, puzzles,
  levelId)` (line 310) returns `{ valid: [{ index, puzzle, layoutKey, clueKey }], problems }`; `seedFor(c, rep)`
  (line 94) = `c.seeds?.[rep] ?? \`${c.seedPrefix}/${c.id}/${rep}\``; the run record's
  `details.resultDigest` (lines 696-700) is
  `sha256Hex(canonicalJson({ layoutKeys, clueKeys, scores }))` over the valid accepted puzzles in order, `scores`
  being `rating.score` (null when absent).
- `tools/bench/calibration-reference.js`: `buildLandscapeMatrix({ seeds })` (line 214): case ids
  `<board id>-<level id>` (board id `<cols>x<rows>`, for example `6x10`, `18x20`), `boardRows`, `rotation: 0`,
  `levelId`, `maxActive: 676`, `quantity: 10`, `uniqueness: 'any'`, `seedPrefix: 'landscape'`, `repetitions`. The
  runner generates exactly like `tools/generate.mjs` (`generateSet` then `generateBatch` with batch index 1 and the
  set's calibration puzzle, `tools/bench/runner.js:511-535`), so a landscape run is regenerated by a recipe with
  these fields and the seed `seedFor(case, rep)`.
- A calibration report (`<base>-<date>.json` written by `tools/calibrate.mjs`) holds its run records in `runs`; each
  record has `caseId`, `seed`, `partialReason`, `acceptedCount` and `details.resultDigest`.

### The `tieOrder` diagnostic (RES-12, RES-13; check-list D7)

`diagnostics.tieOrder`: an integer >= 0, default 0 (canonical). Any other value is a `RangeError`. In the MRV choice
of the main search and of the census probes: let `m` be the smallest live count among the uncovered columns and
`T` the uncovered columns with exactly `m` live rows, in ascending column order (cell columns come first); the
canonical rule picks `T[0]`; with `tieOrder = t` the search picks `T[t % T.length]`. Nothing else changes (the
replay of the census follows the recorded path). Production callers never pass it.

### CLI (RES-12)

```text
usage: node tools/rate-probe.mjs --pack <file.json> [options]
       node tools/rate-probe.mjs <generation flags of tools/generate.mjs> [options]
       node tools/rate-probe.mjs --landscape <case id> --reps <a>-<b> [--expect <report.json>] [--workers N] [options]
options  --orders k        DLX diagnostic under k seeded orders (default 5; 0 = none)
         --tie-orders k    deduction under the tie variants 0 .. k-1 (default 1 = canonical only)
         --knobs <json>    v3 scores for these SCORE_V3 knobs (JSON text or a file name; exploration only)
         --deduce <json>   overrides of DEDUCE fields (JSON text or a file name), for example {"census":0}
         --output <file>   JSON lines to this file instead of stdout (its folder is created when missing)
Exit codes: 0 every puzzle probed; 2 a generation was partial or an identity check failed (lines are still written);
1 invalid input or no pack.
```

- **Modes.** `--pack`: read with `parsePack`; a pack with issues is an input error. Generation flags (`--board`,
  `--cols`, `--rows`, `--preset`, `--n`, `--rotation`, `--level`, `--count`, `--seed`, `--uniqueness`,
  `--batch-index`, `--max-active`, `--recipe`, `--workers`): passed unchanged to `run` of `tools/generate.mjs` with
  stdout captured; its exit code 1 is an input error, 2 a partial pack (probe it and exit 2). `--landscape`: the case
  from `buildLandscapeMatrix({ seeds: 20 })` (unknown id: input error), each rep `a .. b` (`0 <= a <= b <= 19`)
  regenerated through an in-memory recipe (`version: 1`, the case's `boardRows`, `rotation`, `levelId`,
  `quantity: 10`, `seedText: seedFor(case, rep)`, `batchIndex: 1`, `batchSeed: seedText + '#1'`, `uniqueness`,
  `versions: currentVersions()`), `--workers` (default 4) passed through.
- **Identity** (RES-14): for a landscape rep, `digest` = `sha256Hex(canonicalJson({ layoutKeys, clueKeys, scores }))`
  over `validateAccepted({ board, pieces }, pack.puzzles, levelId).valid` (board from `boardFromRows(pack.board.rows)`,
  pieces from the pack); with `--expect`, `expected` is the `details.resultDigest` of the report's run with the same
  `caseId` and `seed` (null when absent) and `match` is `digest === expected` (null without an expected digest). A
  mismatch is reported on stderr and gives exit code 2; it never stops the probe (MP06b records it).
- **Own flags and generation flags** must not overlap; a flag given twice is an input error.

### One JSON line per puzzle (field order fixed; RES-12)

```text
{ puzzleId, board: { width, height, active }, sourceModel, storedScore, identity,
  v2: { score, level, saturated, metrics },
  deduction: { path, first, search, count, census, raw, intervals },
  orders: { B, G, info, summary },
  v3?: { score, level, breakdown, knobs },
  timing: { buildMs, dlxMs, deduceMs }, modelSize: { rows, nonzeros, bytes } }
```

| Field | Content |
|---|---|
| `puzzleId` | `puzzle.id` |
| `board` | `width`, `height`, `active` (number of active cells) |
| `sourceModel`, `storedScore` | `puzzle.rating?.model ?? null`, `puzzle.rating?.score ?? null` |
| `identity` | `{ mode: 'pack' \| 'generated' \| 'landscape', caseId, rep, seed, digest, expected, match }`; fields that do not apply are null (digest only in landscape mode) |
| `v2` | `rate(board, pieces, clues, ws)` of `difficulty.js` (v2 until MP09c; MP09c switches the tool to `measureV2`/`scoreV2`) |
| `deduction` | the canonical `measureDeduction(model, { ...DEDUCE, ...deduceOverrides })` result (`first.rows` included); `raw = { G, info, Cmax }` from `first.choices` (all nodes, `info` = sum of `log2 c`); `intervals` = one `[log2(c / (c - f)), log2(c / kLow)]` per `first.census` node; `raw` and `intervals` null when the path is not complete |
| `orders` | `B`: for i = 0 .. k - 1, `solveFirst(model, { rng: createRng(seedText, 'order/' + i), rowTrialLimit: SCORE.caps.rows, branchTrialLimit: SCORE.caps.branch })`, B = `min(branchTrials, SCORE.caps.branch)` when a layout was found, else `SCORE.caps.branch`; `seedText` = `puzzle.seed ?? puzzle.id`. `G`, `info`: the decisive values for tie orders 0 .. k' - 1 (entry 0 = the canonical result). `summary`: `{ B, G, info }` each `{ min, median, max }` (median of an even count = the lower middle value) or null for an empty list |
| `v3` | only with `--knobs`: `scoreWithKnobs(metrics, knobs)` (below) and `level = levelForScore(score).id`, with the knobs echoed |
| `timing` | milliseconds (`performance.now()`) of `buildModel`, the canonical v2 rating, the canonical deduction; never compared |
| `modelSize` | `rows` = `model.rowCount`, `nonzeros` = `model.rowStart[model.rowCount]`, `bytes` = `ws.peakBytes()` after the canonical deduction |

A puzzle whose deduction is not complete still gets a line (`deduction.path` `'capped'` or `'none'`); a thrown error
(for example an unsatisfiable puzzle) gives a line with `error: { name, message }` in place of the rating fields and
does not stop the probe.

### `--knobs`: the local v3 formula (RES-18, exploration only)

Export `scoreWithKnobs(m, knobs)` with `m = { U, deductionTier, G, info, solutions }` (U = pieces minus clues; the
others from the canonical deduction) and knobs of the shape of `SCORE_V3`:

```text
SCORE_V3 shape: { model: 'difficulty-v3', base: { max, scale }, rule: [r0, r1, r2, r3],
                  weights: { G, info }, penalty: { few, many } }
starting values: base { max: 12, scale: 6 }, rule [0, 0, 2, 4], weights { G: 6, info: 4 }, penalty { few: 2, many: 4 }

base    = base.max * (1 - exp(-U / base.scale))
rule    = rule[deductionTier]
guess   = weights.G * G + weights.info * info
penalty = solutions === 'few' ? penalty.few : solutions === 'many' ? penalty.many : 0
score   = U === 0 ? 0 : max(0, round(base + rule + guess - penalty))
returns { base, rule, guess, penalty, unrounded: base + rule + guess - penalty, score }
```

- Hard invariants (an input error otherwise): `base.max + max(rule) <= 16`; `rule[0] = rule[1] = 0 <= rule[2] <=
  rule[3]`; `0 <= penalty.few <= penalty.many`; weights >= 0.
- Experimental ranges (JR-P3 (a)): `base.max` 8-12, `base.scale` 3-12, `weights.G` 0-8, `weights.info` 0.5-6,
  `penalty.many <= 8`. Knobs outside a range are allowed for exploration: the line's `v3.knobs` carries
  `outsideRanges: true` and stderr warns once.
- Worked examples with the starting knobs, U = 6, binary guesses (G 1, info 1 per guess, unique): one guess 18, 20, 22
  for deduction tier 1, 2, 3; two guesses (G 2, info 2) 28, 30, 32.

### Exports (for tests and MP06b)

`run(argv, overrides)` (exit code; `overrides` as in `tools/generate.mjs`: `stdout`, `stderr`, `readText`,
`writeText`, `workerFactory`), `parseProbeArgs(argv)`, `probePack(pack, options, context)` (returns the line objects),
`scoreWithKnobs(m, knobs)`, `landscapeDigest(pack, levelId)`.

## Files to create/modify

### Exclusive ownership

- `tools/rate-probe.mjs` (new), `tests/rate-probe.test.js` (new).
- `core/engine/deduce.js` (`tieOrder` only), `tests/deduce.test.js` (one `tieOrder` case).
- `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md` ("Develop and test").

### Documentation slot

`DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`, section "Develop and test": a bullet **Rating probe** after
"Performance and calibration" with the three command forms, the options, "one JSON line per puzzle, read-only,
diagnostics only" and the exit codes; and one sentence in "Code layout" that `core/engine/deduce.js` is the
deduction solver of the v3 rating (design §7.9). Natural Vietnamese with the guide's existing terms. No other
document changes (the probe record is MP06b's).

## Implementation steps

1. Add `tieOrder` to the diagnostics typedef and to the MRV choice (main search and census probes); validate it.
2. Write the tool: argument parsing (own flags, pass-through flags), the three modes, the per-puzzle probe, the
   identity digest, `scoreWithKnobs`, JSON-lines output, exit codes, usage text.
3. Write `tests/rate-probe.test.js` and the `tieOrder` case; update both developer guides; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP06a-B01 | One command rates every puzzle of a pack, a fresh request or a landscape run with the old rating, the deduction solver (raw and decisive values, census, `Gproved`) and, on request, candidate v3 knobs | probe tests |
| MP06a-B02 | A regenerated landscape request is checked against the recorded run before its puzzles are used as the same puzzles | identity tests |
| MP06a-B03 | Nothing a player or the Generator sees changes; production never uses `tieOrder` | `npm run test:quick`; review |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP06a-T01 | Every line parses and has the fields above in the fixed order; `raw`, `intervals`, `orders` and `summary` follow the definitions; the median of an even count is the lower middle value | probe tests |
| MP06a-T02 | `tieOrder: 0` deep-equals the default result; another value gives a valid result (same count and status, a valid first layout) and an invalid value throws `RangeError` | `deduce` test |
| MP06a-T03 | `scoreWithKnobs` reproduces the worked examples, refuses invalid knobs and flags out-of-range ones | probe tests |
| MP06a-T04 | Landscape mode builds the recipe from the matrix, computes the digest of the runner and reports `match` true or false (exit 2 on a mismatch) | probe tests |
| MP06a-T05 | Two runs give identical lines apart from `timing`; the tool writes nothing but stdout, stderr and `--output` | probe tests; review |
| MP06a-T06 | Developer guides updated in both languages; `npm run test:quick` and `npm run check` pass; CRLF; no file outside the ownership list changed | command output; review |

## Test plan

### Exact commands

```powershell
node --test tests\rate-probe.test.js tests\deduce.test.js
if ($LASTEXITCODE -ne 0) { throw 'probe tests failed' }
node tools\rate-probe.mjs --pack tests\fixtures\generated-sample-pack.json --orders 2 --tie-orders 2 --output tests\artifacts\MP06a\sample.jsonl
if ($LASTEXITCODE -ne 0) { throw 'probe run failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

### Required test cases

`tests/rate-probe.test.js` (quick; the whole file well under a minute):

| Case | Expected result |
|---|---|
| Pack mode | `run(['--pack', 'tests/fixtures/generated-sample-pack.json', '--orders', '2'], { stdout })`: exit 0; one line per puzzle; every field present; `orders.B.length` 2; `identity.mode` `'pack'`; `deduction.path` `'complete'` |
| Tie orders | `--tie-orders 2`: `orders.G.length` 2 and `orders.G[0]` equals `deduction.first.G` |
| Knobs | `scoreWithKnobs` on the six worked examples; an invalid knob set throws; `--knobs` with the starting knobs adds `v3` to every line |
| Census override | `--deduce '{"census":0}'` is applied (every line's `deduction.census` has `nodes` 0) |
| Landscape identity | `--landscape 6x10-easy --reps 0-0 --workers 1 --expect <file>`: with a report file written by the test under `tests/artifacts/rate-probe-test/` whose run has the regenerated digest, `match` true and exit 0; with a wrong digest, `match` false and exit 2 |
| Input errors | a missing pack file, an unknown case id, `--reps 3-1`, a flag given twice, invalid `--knobs` JSON: exit 1 with a message on stderr |
| Determinism | two pack-mode runs give equal lines after removing `timing` |

`tests/deduce.test.js`: `tieOrder` 0 deep-equals the default on V3 and the master recipe; `tieOrder` 1 and 2 on the
master recipe give `unique`, `exhausted` and a first path whose `rowPose` layout with the clues passes
`isValidLayout`; `tieOrder: -1` and `1.5` throw `RangeError`.

## Definition of done & handoff

- Every criterion has its evidence; the quick set and the check pass; nothing outside the ownership list changed.
- The reply includes the first line of `tests/artifacts/MP06a/sample.jsonl` and the probe's wall time on the fixture.
- Handoff to MP06b: the exact commands for pack, generation and landscape modes, the line format, how `--expect`
  finds a run, the exit codes, and the time per puzzle observed on the fixture.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP06a: Probe tool tools/rate-probe.mjs and the tieOrder diagnostic`) |
| Start | 2026-11-12 14:25 (+07:00) |
| End | 2026-11-12 14:42 developer; 14:47 orchestrator review and commit |
| Duration | 16 min developer (968 s); about 5 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 78 model calls; 15,245,768 input tokens (14,958,246 cache reads); 124,656 output tokens |
| AI credits | about 346 (developer) |
| Verification | Developer: `node --test tests\rate-probe.test.js tests\deduce.test.js` 29/29 (2.7 s); the plan's sample run `--pack tests\fixtures\generated-sample-pack.json --orders 2 --tie-orders 2 --output tests\artifacts\MP06a\sample.jsonl` exit 0, 3 lines (0.24 s); `npm run test:quick` 1,177/1,177 (20 s); `npm run check` OK; extra small landscape runs `6x10-easy` reps 0-1 (1.3 s) and `6x10-hard` rep 0 with orders 5, tie-orders 3 (3.5 s; about 1 ms build, 1 ms deduction, 1 ms DLX per puzzle); `landscapeDigest` cross-checked against the runner formula on three live reps; a mutation ignoring `tieOrder` fails its test. Orchestrator re-run: targeted 29/29, `npm run test:quick` 1,177/1,177 (19 s), `npm run check` OK; no absolute path in the new files |
| Acceptance | MP06a-B01..B03 and MP06a-T01..T06 met. Diff reviewed: `tieOrder` validated (`RangeError`), applied only among tied fewest-row columns at position `t mod n` in the search and the census probes, no extra work, default 0 identical to the canonical rule; the probe tool is a Node-only `.mjs` with `run`, `parseProbeArgs`, `probePack`, `scoreWithKnobs`, `landscapeDigest` exports, JSON-lines output in the spec order |
| Issues & resolutions | (1) `docs/design-detail.md` (the `measureDeduction` signature in section 4.2 and the limits paragraph of section 7.9) still documented `diagnostics` as `verifyUndo` only; the task's documentation slot did not include it. Orchestrator fix: both places now document `tieOrder` (AGENTS.md: the specification follows the code). (2) The tool is 836 lines against the "about 300-400" estimate, mostly JSDoc typedefs and argument checks; accepted. (3) Developer decisions accepted: a fresh workspace per puzzle, order build, deduction (`modelSize.bytes` = `peakBytes()` right after it), tie variants, DLX orders, then v2 `rate` (so `dlxMs` includes the rating's own build); `orders.G`/`orders.info` hold null for an incomplete variant and summaries skip nulls; an error line keeps `puzzleId`, `board`, `sourceModel`, `storedScore`, `identity` and adds `error`; `--orders` 0-1000, `--tie-orders` 1-1000; `--knobs` needs the full `SCORE_V3` shape; `--output` is rewritten after each pack; extra exports `STARTING_KNOBS`, `checkKnobs`, `USAGE`. (4) Early observation: in one `6x10-hard` landscape rep, 7 of 10 v2-Hard puzzles have decisive G = 0 (relevant to AR1 and MP06b/MP06c) |
| Handoff | Commands: `node tools\rate-probe.mjs --pack f.json [options]`; `--board 6x10 --level hard --count 10 --uniqueness require --seed S --workers 4 [options]`; `--landscape 6x10-easy --reps 0-4 --workers 4 --expect docs\difficulty-v3\baseline-v2\6x10-easy-<date>.json [options]`. Options `--orders k`, `--tie-orders k`, `--knobs json`, `--deduce '{"work":1000000000,"nodes":2000000}'` (any subset of the six `DEDUCE` fields, integers, no `Infinity`), `--output file`. JSON lines ending in LF; `v3` only with `--knobs`. `--expect` takes the first run in `runs` with the same `caseId` and seed (`landscape/<id>/<rep>`) and reads `details.resultDigest`; missing gives `expected`/`match` null and a stderr note. Exit 0 all probed; 2 any rep partial, without pack or mismatched (also Ctrl+C); 1 bad input or no pack. `tieOrder` API: `measureDeduction(model, limits, { tieOrder: t })`. Timing: about 3 ms per 6 x 10 puzzle plus generation; bigger boards not measured yet |

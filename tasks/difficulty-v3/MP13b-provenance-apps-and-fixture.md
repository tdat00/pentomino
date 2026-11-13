# MP13b — Provenance in the client, the Generator and the CLI; the replay fixture (GF-P4)

| Header | Value |
|---|---|
| ID | MP13b (second part of the report's MP13) |
| Depends on | MP13a (accepted and committed: `candidate.made`, `provenanceVersions`, `PROVENANCE`, `provenanceProblem`, `readProvenance`, the writer fallback) |
| Estimated size | Medium: about 500–700 changed lines (client about 70, Generator about 110, CLI 1, recorder about 120, tests about 250, documents about 30) plus the generated fixture; about 50–60 minutes plus the gate |
| Owner role | Apps and tools |
| Milestone | M8 — provenance and recorders |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-27 ("Set origin", "The origin travels with the candidate", the fixture of gate GF-P4), §5.3 GF-P4; clarifications JR-P2 (a), SA2-Q-P10 (a) (plan author); check-list §4.2 D30, §7 |
| Gates owned | **GF-P4**: the new replay-fixture mode of `tools/record-fixtures.mjs` writes `tests/fixtures/replay-case.json`, then `npm test` |
| Implementation status | Not started |

## Goal & business context

MP13a gave every engine candidate its origin record. This task makes the records reach the packs people keep: the
generation client writes `generation.setOrigin` and `generation.made` into the packs it builds (the CLI's output
included), and the Generator keeps them for the set on show and its saved sets and writes them when it exports or
shares a pack. It also records a small pack through the ordinary client path as the fixture the replay tests of MP15a1
and the browser page of MP16b use (gate GF-P4).

The set origin is written once, when the set is made, and never re-stamped (plan author, JR-P2 (a)): a set made by
an older Generator keeps no origin rather than a wrong one. No rating, puzzle, history key or batch outcome changes.

## Scope

### In scope

- `core/browser/generation-client.js`: `setOrigin` on set results and packs; `BatchInput.setOrigin`; the `made` map
  of a batch (accepted event, result, pack); the shape check in `checkOutcome`.
- `tools/generate.mjs`: pass the set origin to the batch (one line).
- `generator/state.js`: `setOrigin` and `puzzleMade` in the state, the saved sets and the export.
- `generator/jobs.js`: keep the set origin of a new set; pass it to every batch; store each accepted puzzle's record.
- `tools/record-fixtures.mjs`: the `--replay-case` mode; `tests/fixtures/replay-case.json` (new, written by the gate).
- Tests: `tests/generation-client.test.js`, `tests/generator-state.test.js`, `tests/generator-controller.test.js`,
  `tests/generate.test.js` (the recorder test only), `tests/cli.test.js` (one case).
- Documents: `docs/design-detail.md` §5.5 (who writes the keys), §10.5 (the Generator keeps them) and the fixtures
  paragraph of §13 (line 2848 at HEAD: "**Fixtures** live in `tests/fixtures/`.").

### Out of scope

- The engine records and pack checks (MP13a); the recorders (MP14a, MP14b); the replay (MP15a1, MP15a2, MP15b); any UI
  (MP16a, MP16b). No visible change in either app.
- Puzzle codes: they carry no provenance (RES-27). The Player ignores `generation`.
- Re-stamping: `generationOf` keeps writing the current versions in its existing keys (`algo`, `policy`, …), exactly
  as today; only the two new keys are added.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Run only the commands of the test plan. `tools/record-fixtures.mjs` with `--replay-case --search` or `--create`, and
  `npm test`, run **only** as gate GF-P4 (below), announced first. Never stage, commit, stash, reset, push or switch
  branches; never edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- **Amendment L1 (lock; orchestrator decision 2026-11-13).** The Sudoku repository runs on the same machine. Save the
  helper `Invoke-Dv3Timed` of check-list §7 ("Shared-machine lock protocol") verbatim as
  `tests/artifacts/MP13b/dv3-lock.ps1` and dot-source it in every call. Every test run, every
  `tools/record-fixtures.mjs` run that generates puzzles (`--search`, `--create`, `--check` once the file exists) and
  `npm test` go through it, as written in the test plan and the gate: one bounded command per acquisition of the
  lock, at most 590 s, at least 15 s between releasing the lock and taking it again (the helper waits), never a lock
  held across a series of commands. Only `npm run check`, the CRLF check, the `--replay-case --check` before the gate
  (it stops at "file missing") and, while you work, a single test file that ends within 10 seconds run without it. A
  command that the helper stops at its limit has an error: report it, never rerun it outside the helper. Two
  exceptions: a `--search` stopped there is resumed like its exit 1, from the seed after its last printed line; an
  `npm test` stopped there runs again as two commands, the quick set and
  `--test --test-name-pattern=slow tests/**/*.test.js`, both recorded. The reply gives each invocation's label, exit,
  seconds and lock wait.
- The fixture is written by the tool, normalised to CRLF by it (`toFileText`), and never edited by hand.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

Anchors are at HEAD `55c0c61` (checked in the resume revision); MP12b3 edits `generator/state.js` (the level list)
and, with the fail-fast, `core/browser/generation-client.js` and `generator/jobs.js`; MP13a edits the engine: find
moved lines by the quoted text.

### From MP13a

- Every `PuzzleCandidate` has `made` (`{ schema: 1, kind: 'candidate' | 'calibration' | 'completion', … }`).
- `provenanceVersions()` and `capSkips()` (`core/engine/generate.js`); `PROVENANCE`, `provenanceProblem(kind,
  value)` (`kind` `'setOrigin'` or `'made'`; returns a message or null) and `readProvenance(generation, puzzleIds)`
  (`core/engine/pack.js`); `createPack` and `serializePack` leave `made` out near the limits; the reader drops invalid
  records with a `provenance-ignored` warning.
- Record shapes (RES-27):

  ```text
  setOrigin = { schema: 1, seed, level, attempt, uniqueness, versions: { algo, policy, rng, seedScheme, ratingModel } }
  made      = { [puzzleId]: Made }
  ```

### Generation client (`core/browser/generation-client.js`)

- `generationMeta(p)` (line 346) builds the `generation` object in a fixed key order ending with
  `meta.uniqueness = p.uniqueness; meta.createdAt = p.createdAt;`. Add two optional parameters `p.setOrigin`
  (`SetOrigin`) and `p.made` (`Record<string, Made>`) and, after `createdAt`, write `meta.setOrigin` (a copy) when
  given and `meta.made` (a copy) when given and not empty. Existing keys and their order are unchanged.
- `finishSet(request, value)` (line 686): build

  ```js
  const setOrigin = { schema: 1, seed: request.seedText, level: request.levelId, attempt: value.attempt,
    uniqueness: request.uniqueness, versions: provenanceVersions() };
  ```

  pass it to `generationMeta` and return it: `{ status: 'complete', set, calibration, attempt, setOrigin, pack }`.
  `SetJobResult` (typedef near line 104) gains `@property {SetOrigin} [setOrigin] Present with status complete.`
- `BatchInput` (typedef near line 46) gains `@property {SetOrigin} [setOrigin] Origin of the set, as its set result
  gave it; written into the pack unchanged.` `checkBatch` (line 726): when `input.setOrigin !== undefined` and
  `provenanceProblem('setOrigin', input.setOrigin) !== null`, throw `GenerationError('invalid-input', 'setOrigin is not
  a valid set origin')` (inside the existing `try`, so the history detail is attached); return it in the request.
- `generateBatch` (line 784): a local `/** @type {Record<string, Made>} */ const made = {};`.
  - `checkOutcome` (line 893): a valid candidate also needs `provenanceProblem('made', value.made) === null`;
    otherwise the existing `GenerationError('internal', 'The worker sent an invalid puzzle candidate', detail())`.
  - `accept(candidate)` (line 875): after building `puzzle`, `made[puzzle.id] = candidate.made;` and the
    `onAccepted` event gains `made: candidate.made`. Calibration reuse (`for (const calibration of state.accepted)`)
    and the completion pass go through `accept` too.
  - The result gains `made` (a copy of the map: one record per accepted puzzle) and the batch pack's
    `generationMeta(…)` call (line 1143) gains `setOrigin: request.setOrigin` and `made`.
  - `AcceptedEvent` gains `@property {Made} made`; `BatchJobResult` gains `@property {Record<string, Made>} made`.
  - `GenerationError` details are unchanged (the Generator takes the records from the accepted events).
- Imports: `provenanceVersions` from `../engine/generate.js` (already imported from there), `provenanceProblem`
  from `../engine/pack.js`; the typedefs `SetOrigin` and `Made` from `../engine/types.js`.

### CLI (`tools/generate.mjs`)

In the `client.generateBatch({ … })` call (line 562), after `setAttempt: set.attempt,` add `setOrigin:
set.setOrigin,`. Its packs then carry both keys; `tests/cli.test.js` compares runs with `semantic()` (all but
`createdAt`), so the records must be equal for 1 and 4 workers.

### Generator (`generator/state.js`, `generator/jobs.js`)

State and storage:

- `GeneratorState` (typedef at line 39) gains `@property {SetOrigin | null} setOrigin How the set on show was
  made (RES-27); null for an imported set or a set saved by an older version.` and `@property {Readonly<Record<string,
  Made>>} puzzleMade Origin record of each puzzle, by puzzle id.`; `defaultGeneratorState` sets `setOrigin: null`
  and `puzzleMade: {}`; `freshSetExtras()` (line 514) adds `puzzleMade: {}`; `withoutSet` (line 1699) adds
  `setOrigin: null`; `removeAllPuzzles` (line 1559) adds `puzzleMade: {}`.
- `SavedSet` (typedef near line 27) gains `@property {SetOrigin} [setOrigin]` and `@property {Record<string, Made>}
  [made] Records of the stored puzzles.`
- `savedSetOf(state)` (line 888): add `setOrigin` when not null and `made` = the records of `state.puzzles` that have
  one (omitted when empty).
- `readSavedSet(saved)` (line 919): `const provenance = readProvenance({ setOrigin: dto.setOrigin, made: dto.made },
  new Set(puzzles.map((p) => p.id)));` and return `setOrigin: provenance.setOrigin` and `puzzleMade:
  provenance.made`; problems are ignored (storage is not a pack; nothing is shown). Its return typedef gains both.
  `restoreState` (`Object.assign(state, current)`) and `gotoSet` (`...read`) then carry them without further change.
- `acceptSet(state, accepted)` (line 580): `accepted` gains `setOrigin?: SetOrigin | null`; the new state has
  `setOrigin: accepted.setOrigin ?? null` (the spread of `freshSetExtras()` already empties `puzzleMade`).
  `importPuzzle` passes no origin for a new set (`imported` carving, fresh seed); a puzzle imported into the set on
  show keeps the state's origin and gets no record.
- `PERSISTED_KEYS` (line 1150) adds `'setOrigin'` and `'puzzleMade'`.
- `generationOf(state, puzzles, createdAt)` (line 1375): after `generation.createdAt = createdAt;` write
  `generation.setOrigin` (a copy) when `state.setOrigin !== null`, and `generation.made` = the records of `puzzles`
  found in `state.puzzleMade` (omitted when none). `buildPack`, `visiblePack` and `packFits` need no change
  (`serializePack` leaves `made` out near the limit, so `packFits` never drops a puzzle for its record).

Jobs (`generator/jobs.js`):

- `generateSet(request)` (line 302): `acceptSet(s, { set, calibration, setSeed: request.seed, calibrationFor: {
  levelId, uniqueness }, trusted: true, setOrigin: result.setOrigin ?? null })`.
- `addMore()` (line 354): in the `client.generateBatch({ … })` input add `...(state.setOrigin === null ? {} : {
  setOrigin: state.setOrigin })`. Note: the local variable `made` in `addMore` is `state.calibrationFor`; name the new
  record map differently (for example `records`). In `onAccepted`, when the puzzle is admitted, also store
  `records[event.puzzle.id] = event.made` and update `puzzleMade: { ...s.puzzleMade, [event.puzzle.id]: event.made }`
  in the same `store.update`; in the final `finish(revision, …)`, set `puzzleMade` to the previous map plus the
  records (from `records` and `result?.made`) of the kept puzzles only.

### The replay fixture (`tools/record-fixtures.mjs`, gate GF-P4)

A new mode, independent of the existing fixtures:

```text
node tools/record-fixtures.mjs --replay-case --search [--from <n>] [--dir <path>]
node tools/record-fixtures.mjs --replay-case --create --seed <n> | --check | --replace --seed <n> --reason <text> [--dir <path>]
```

- File `replay-case.json` in the fixture directory; `--create` refuses an existing file (before generating);
  `--replace` needs a non-empty `--reason`; `--check` regenerates and compares, never writes (the same rules and exit
  codes as the existing modes: 0 success, 1 refused or differs, 2 usage). `--seed <n>` is required by `--create` and
  `--replace`, and `--from <n>` is optional for `--search` (default 0); both take an integer from 0 to 49 (otherwise
  exit 2).
- Generation goes through the ordinary client path: `createGenerationClient(createPool({ size: 1, workerFactory:
  nodeWorkerFactory() }), { createdAt: () => '2026-01-01T00:00:00.000Z' })` (imports as in `tools/generate.mjs`:
  `createPool` from `../core/browser/worker-pool.js`, `nodeWorkerFactory` from `./node-worker.mjs`); close the pool
  in a `finally`.
- Recipe: board 10 x 6 (`BOARD_ROWS`), rotation 0, level `'hard'`, uniqueness `'require'`, quantity 4, set seeds
  `replay-case-<n>` for n = 0 … 49 (offered after MP12b3: its Hell areas do not touch 60 cells, and a `require` rule of
  check-list D41 starts far above them; if the owner's area A0 were 60 or less, ask the orchestrator for an addendum).
  For each n:

  ```text
  set = generateSet({ boardRows, rotation, levelId, seedText, uniqueness, maxActive: 676 })   // must be complete
  b1  = generateBatch({ set: set.set, rotation, targetLevelId: levelId, quantity, setSeed: seedText, batchIndex: 1,
                        uniqueness, seenLayouts: [], seenClues: [], calibration: set.calibration,
                        setLevel: levelId, setAttempt: set.attempt, setOrigin: set.setOrigin })
        // must be complete, and its first puzzle must be the reused calibration (b1.made[first id].kind === 'calibration')
  b2  = generateBatch({ …the same, batchIndex: 2, seenLayouts: b1.seenLayouts, seenClues: b1.seenClues, no calibration })
        // must be complete
  ```

  Seed n meets the conditions when all three calls are complete and b1's first puzzle is the reused calibration; it
  **qualifies** when it also has a `candidate` record with a non-empty `skips.subsets` in `b1.made` or `b2.made`.
- `--search` (bounded and resumable; cross-review SP07, SA2's assessment: a seed costs a set and two batches, so the
  search over 50 seeds has no small upper bound) writes nothing. From `--from` upward it prints one line per seed,
  `replay-case-<n>: ok|failed <reason>, subset skip yes|no, <ms> ms`, and stops at the first seed that qualifies
  ("selected replay-case-<n>", exit 0), after seed 49 ("no seed with a subset skip", exit 0), or when 540 seconds have
  passed, checked between seeds ("stopped at the 540 s bound; continue with --from <next>", exit 1). The selection
  rule, applied by you from the printed lines of all runs: the first n (from 0) that qualifies; when no n in 0 … 49
  qualifies, the first n that meets the conditions (the fixture then has no subset skip: say so); when no n meets
  them, report it (do not change the recipe on your own).
- `--create --seed <n>` and `--replace --seed <n>` generate seed n once, check the conditions again (exit 1 with the
  failed condition when they do not hold) and write the file; they print whether it has a subset skip.
- File content (two-space JSON, CRLF, final newline, via `toFileText`):

  ```text
  { "version": 1, "recipe": { boardRows, rotation, levelId, uniqueness, quantity, seedText },
    "versions": currentVersions(), "packs": [ b1.pack, b2.pack ] }
  ```

- `--check` regenerates the recorded seed only (no search) and compares the whole JSON text; a version mismatch
  reports "recorded versions differ … (approved change needs --replace)" like the existing check.
- `main` becomes `async` (the client is asynchronous); inside the existing guard `if (process.argv[1] && import.meta.url
  === pathToFileURL(process.argv[1]).href) { … }` (the last lines of the file), the call becomes
  `main(process.argv.slice(2)).then((code) => { process.exitCode = code; });`. The guard stays: `tools/generate.mjs`,
  `tools/rate-probe.mjs`, `tools/calibrate.mjs` and three test files import this module, and importing it must not run
  `main` (no module imports `main` itself; `tests/generate.test.js` runs the tool as a process). The existing modes
  behave exactly as before, and the existing `--check` (without `--replay-case`) does not read the new file. Update the
  header comment (lines 2-12) with the new mode.

## Files to create/modify

| File | Change |
|---|---|
| `core/browser/generation-client.js` | as above |
| `tools/generate.mjs` | one line |
| `generator/state.js` | as above |
| `generator/jobs.js` | as above |
| `tools/record-fixtures.mjs` | the `--replay-case` mode; async `main` |
| `tests/fixtures/replay-case.json` | new; written only by the gate command |
| `tests/generation-client.test.js` | cases 1–6 |
| `tests/cli.test.js` | case 7 |
| `tests/generator-state.test.js` | cases 8–12 |
| `tests/generator-controller.test.js` | case 13 |
| `tests/generate.test.js` | case 14 (the recorder test) |
| `docs/design-detail.md` | §5.5, §10.5, the fixtures paragraph of §13 |
| `docs/design-brief.md` | one sentence (documentation slot; cross-review SP07) |

Exclusive ownership while this task runs: the files above. Do not edit `core/engine/` (report a defect of MP13a to the
orchestrator instead), `player/`, the UI modules or the other fixtures.

### Documentation slot

- §5.5: who writes the keys (the client for the CLI and the Generator; `setOrigin` once, when the set is made, never
  re-stamped; `made` for every accepted puzzle) and that an imported set has no origin.
- §10.5 "Step 3: Create puzzles" (line 2354): the Generator keeps each set's origin and each puzzle's record with the
  saved set and writes them into exported and shared packs (used by Generation Steps, MP16b).
- §13 fixtures paragraph: `tests/fixtures/replay-case.json` and its recorder mode.
- `docs/design-brief.md`, "Generator: make a challenge", the paragraph that starts "Board edits never delete work"
  (AGENTS.md: both living specifications change with a storage change; cross-review SP07), one sentence: "Each saved
  piece set also keeps how it and its puzzles were made, and the packs the Generator exports or shares carry that
  record (the puzzle codes of links do not); a set imported from a link or a code has none."

## Implementation steps

1. Client: `generationMeta`, `finishSet`, `checkBatch`, `checkOutcome`, `accept`, the result and the typedefs.
2. CLI line; Generator state and jobs.
3. Recorder mode (without running `--search` or `--create`); the tests; `--replay-case --check` must fail cleanly
   ("file missing") until the gate writes the file — the quick test of case 14 that needs the file is added in step 5.
4. Run the targeted tests and the quick set; then announce and run gate GF-P4.
5. After the gate: add case 14's `--replay-case --check` assertion, run the targeted test file again and the quick
   set, then `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP13b-B01 | Packs made by the CLI and exported or shared by the Generator say how their set and each puzzle were made, so Generation Steps can replay them | cases 2, 7, 10 |
| MP13b-B02 | The Generator keeps the records across reloads, set switching and saved sets; a set made by an older version, or imported, simply has none | cases 8, 9, 11 |
| MP13b-B03 | A set's origin is written once and never re-stamped with newer versions | cases 1, 10 |
| MP13b-B04 | Nothing else changes: the same puzzles, the same history, the same pack keys, and no puzzle is dropped because of a record (the writer fallback of MP13a) | cases 3, 6, 12; the unchanged quick set |
| MP13b-B05 | The replay fixture exists, was recorded through the ordinary client path, and replays identically (`--check`) | gate GF-P4; case 14 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP13b-T01 | `finishSet` writes `setOrigin` with the request's seed, level, uniqueness and winning attempt and the running versions; the set pack carries it after `createdAt` | case 1 |
| MP13b-T02 | A batch's pack carries `setOrigin` from the input unchanged and `made` with exactly one valid record per accepted puzzle; the calibration has `kind: 'calibration'` | cases 2, 3 |
| MP13b-T03 | An invalid `setOrigin` input is `invalid-input`; a worker candidate without a valid `made` is `internal` | cases 4, 5 |
| MP13b-T04 | Records are equal for pool widths 1 and 4 (the existing `semantic()` comparisons include `generation`) | case 6; existing real-engine tests |
| MP13b-T05 | Saved sets round-trip `setOrigin` and `made`; invalid stored records are dropped silently; older stored sets load with `setOrigin: null` and `puzzleMade: {}` | cases 8, 9 |
| MP13b-T06 | `generationOf` writes the records of exactly the exported puzzles and the set origin unchanged | case 10 |
| MP13b-T07 | The recorder mode follows the create/check/replace rules, the bounded resumable search (540 s, `--from`) and the selection rule; GF-P4 evidence recorded with every search line | case 14; gate record |

## Test plan

### Exact commands (while working)

```powershell
. tests\artifacts\MP13b\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP13b targeted tests' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/generation-client.test.js', 'tests/cli.test.js', 'tests/generator-state.test.js',
  'tests/generator-controller.test.js', 'tests/generate.test.js')
if ($r.Exit -ne 0) { throw 'targeted tests failed' }
$r = Invoke-Dv3Timed -Task 'MP13b quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

### Gate GF-P4 (pre-approved; announce it to the orchestrator before starting)

Announce in your reply plan: "GF-P4: `record-fixtures --replay-case --search` (each run at most 540 s, resumed with
`--from` until a seed is selected), `--create --seed <n>`, `--check`, then `npm test` (about as long as the last full
run in the MP12b3 Execution log)". The Sudoku repository runs in parallel on the same machine: start after the
orchestrator's go; each command then goes through the lock helper (Amendment L1), which interleaves the gate with the
Sudoku repository's runs.

```powershell
New-Item -ItemType Directory -Force tests\artifacts\MP13b | Out-Null
. tests\artifacts\MP13b\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP13b GF-P4 search 0' -NodeArgs @('tools/record-fixtures.mjs', '--replay-case', '--search')
"search: exit $($r.Exit)"
# exit 1 (the tool's 540 s bound): the same command with '--from', '<next>' and the label 'MP13b GF-P4 search <next>',
# until a seed is selected or seed 49 is done; the helper prints the tool's lines to the console (keep them for the
# reply); then choose n by the selection rule from all the printed lines
$r = Invoke-Dv3Timed -Task 'MP13b GF-P4 create' -NodeArgs @('tools/record-fixtures.mjs', '--replay-case', '--create',
  '--seed', '<n>')
if ($r.Exit -ne 0) { throw 'replay fixture not recorded' }
node -e "const t=require('fs').readFileSync('tests/fixtures/replay-case.json','utf8');console.log(/[^\r]\n/.test(t)?'LF found':'CRLF only')"
$r = Invoke-Dv3Timed -Task 'MP13b GF-P4 check' -NodeArgs @('tools/record-fixtures.mjs', '--replay-case', '--check')
if ($r.Exit -ne 0) { throw 'replay fixture does not replay' }
$r = Invoke-Dv3Timed -Task 'MP13b GF-P4 npm test' -NodeArgs @('--test', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'npm test failed' }
```

The helper bounds each command at 590 s (Amendment L1). Record in the reply: the search lines (every seed tried, with
its outcome and time), the chosen seed, whether it has a subset skip, the record kinds of the eight puzzles, the file
size, the versions, each command's duration and lock wait, and the `npm test` counts.

### Required test cases

`tests/generation-client.test.js` (scripted harness `harness()` and the real-engine harness `realHarness()` of the
file):

1. `generateSet` with attempt 1 winning (the existing first test): `result.value.setOrigin` deep-equals `{ schema: 1,
   seed: 'fixture-set-0', level: 'hard', attempt: 1, uniqueness: 'any', versions: provenanceVersions() }`, and
   `pack.generation.setOrigin` equals it; the keys of `pack.generation` are the old keys in the old order followed by
   `setOrigin`.
2. A scripted batch with `setOrigin` in the input: `result.pack.generation.setOrigin` deep-equals the input; `made` has
   one entry per accepted puzzle id, each `provenanceProblem('made', …) === null`; `result.made` equals it; every
   `onAccepted` event carries its puzzle's record.
3. Real engine, `runRecipe(1)`: the first puzzle (the reused calibration) has `{ schema: 1, kind: 'calibration' }`,
   the others `kind: 'candidate'` with `slot` and `attempt` of their fold position; ids, history keys and scores are
   those of `recipe.expected` (unchanged).
4. `generateBatch` with `setOrigin: { …valid, schema: 2 }` rejects with `GenerationError` `invalid-input`, and the
   error carries the history detail.
5. A scripted worker answer that is a valid candidate without `made` (delete it from a real candidate) makes the batch
   fail with `internal` "The worker sent an invalid puzzle candidate".
6. The existing real-engine width tests (`semantic(one.batch.pack)` against `semantic(four.batch.pack)`) now compare
   `generation.made` and `generation.setOrigin` too: they must pass unchanged; add one assertion that
   `one.batch.pack.generation.made` is not empty.

`tests/cli.test.js`:

7. A CLI run (the existing in-process `runCli` with the recipe): the output pack has `generation.setOrigin` (seed and
   level of the recipe) and a `made` record for every puzzle, valid per `provenanceProblem`.

`tests/generator-state.test.js`:

8. `savedSetOf` then `readSavedSet` returns the same `setOrigin` and `puzzleMade` (only for stored puzzles);
   `restoreState(serializeState(state))` keeps both for the set on show and for a saved set reached by `gotoSet`.
9. A stored set without the fields (older storage) loads with `setOrigin: null` and `puzzleMade: {}`; a stored set
   with a malformed `setOrigin` or `made` entry loads with that record dropped and the puzzles kept.
10. `generationOf(state, puzzles, createdAt)` writes the state's `setOrigin` unchanged (also when its versions differ
    from the running code's: never re-stamped) and `made` only for the given puzzles; without records neither key is
    written; the keys before `createdAt` are unchanged.
11. `acceptSet` without an origin and `importPuzzle` of a new set give `setOrigin: null`; `removeAllPuzzles` empties
    `puzzleMade`; `withoutSet` (through `removeAllSets`) clears both.
12. After `removePuzzle` the export (`buildPack`) has no record for the removed puzzle and keeps the others'; `packFits`
    needs no case here (the writer fallback is tested in MP13a, cases 18-20).

`tests/generator-controller.test.js`:

13. With the file's job-controller harness: a new set's state has the client's `setOrigin`; the next batch request
    receives `setOrigin` in its input; after the batch every kept puzzle has its record in `puzzleMade`, and a puzzle
    the duplicate guard drops has none.

`tests/generate.test.js` (the test "the recorder refuses to overwrite, requires a reason to replace, and --check
replays cleanly"):

14. After the gate: `run('--replay-case', '--check')` exits 0, `run('--replay-case', '--create', '--seed', '0')` exits
    1 with "already exist", `run('--replay-case', '--replace', '--seed', '0')` (no reason) exits 2,
    `run('--replay-case', '--create')` (no seed) and `run('--replay-case', '--search', '--from', '50')` exit 2, and the
    existing assertions stay (never run `--search` itself in a test; the refused and usage runs exit before any
    generation). Report the duration of the `--check` run: when it alone takes more than 15 seconds, move that one
    assertion into its own test whose name ends with " (slow)" (as the `fixture-set-1` test of the same file does), so
    that `npm run test:quick` skips it and `npm test` keeps it (cross-review SP07); the other runs stay in the quick
    test.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record of GF-P4 and the test counts.
- Handoff to MP14a and MP15a1: packs from the client carry `generation.setOrigin` and `generation.made`; the Generator
  state has `setOrigin` and `puzzleMade`; `tests/fixtures/replay-case.json` holds two batch packs of one 10 x 6 Hard
  `require` set (seed in its `recipe`), with a calibration record and candidate records (and a subset skip if the
  reply says so).

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

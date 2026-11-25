# P2-12d: The copies' trace layer

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.6 (the trace), §7.1; D-P2-10; P2-T10, P2-T14 (part); review-1 R5; review-2 R2-02 (the header per destination); `contracts.md` C1 to C3 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-12d` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-12b (the copies) and P2-08 (`generate.js` is final) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: one locked trace self-check (at most 300 s) |

## Goal

Every measured copy journals each selection call and each rating and uniqueness count inside it, in the frozen work
ledger's format. A primitive's proved upper bound is written before it starts, and its units when it ends. So
`rowLedger` of `tools/ig-proto/verdicts.mjs` judges a row's coverage and closure with its own proved rules, and a
row's work is an interval even when tasks are cancelled. The trace changes no result.

## Authority and fixed points

- **`contracts.md` C1 to C3** fix the line formats: the worker journal (C1), the link journal (C2) and the row line
  (C3). This task produces C1, and installs the frozen producers of C2 and C3 unchanged.
- **The frozen reader** is `rowLedger(lines, linkLines)` and `parseLines(text, file)` of `tools/ig-proto/verdicts.mjs`
  (lines 618-850), with `pairPrimitives` of `tools/ig-proto/lib/ledger.mjs`. Their rules decide the format:
  - one `caps` line with `count: true` per call that has any other line;
  - `begin` before every primitive, with `kind` `'rate'`, `'screen'` or `'count'` and a finite `bound` of 0 or more;
    at most one primitive pending;
  - a rating closes with a `p` line whose `tuple[4] + tuple[5]` are its units; `tuple[2]` `'error'` or `'unsat'` is
    unquantified (an incomplete row);
  - a count closes with a `count` line with `units`;
  - the `end` line's `work`, `profiles` and `locate.countWork` must equal the sums of the call's lines;
  - a call's `start.stage` is `'set'`, `'batch'` or `'completion'`, and `start.attempt` matches the link journal's
    task identity.
- **The frozen edits reused verbatim** (checked at `6b94ffb` and `97a6326` by
  `docs/improve-generating-phase-2/evidence/sa-opus/p2-link-anchors.mjs`: 22 of 22 apply):
  - `log-5`, `log-6` and `log-7` of `tools/ig-proto/variants/log.json`: `igStage` in the three `selectClues({` contexts
    of `generate.js`; `log-8`: the row line of `tools/calibrate.mjs` (C3);
  - `link-1` to `link-17` of `tools/ig-proto/variants/link.json`: `igAttempt`, the client's link journal, the worker
    terminations (C2);
  - `instr-7` of `tools/ig-proto/variants/instr.json`: `igSetKey` and `igPuzzleKeys` in the bench details, which the
    comparator's equality reads;
  - the file `tools/ig-proto/variants/files/link/core/browser/ig-link.js`, byte for byte (after `lf`).
- **The rating bound** is the frozen `igRatingBound` (`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:257-278`,
  IG-P-Q37). A count's bound is its row limit, as frozen line 629.
- **The anchors** exist once at the pack's base and in the phase-1 head:
  - `export function selectClues(ctx) {` (`core/engine/clues.js`: the dispatcher of P2-02, today's search at `6b94ffb`);
  - `export function rate(board, pieces, clues, ws) {`, `export function rateDetailed(board, pieces, clues, ws) {` and
    `export function rateLean(board, pieces, clues, ws) {` (`core/engine/difficulty.js`);
  - `export function rateWithLimits(board, pieces, clues, ws, work, mode) {` (P2-03; not at `6b94ffb`);
  - `    const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 2 });`
    (`core/engine/clue-primitives.js` after P2-02; `core/engine/clues.js` at `6b94ffb`);
  - `  const rerate = (p, phase) => {` and
    `    for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {`
    (`core/engine/select-v4.js`, kept by P2-04 for this layer).
- **Dead ends and re-rating starts.** The frozen selector wrote `igPhase('p2')` before phase C when nothing was rated
  (`ig-select-v4.js:1214-1218`), which `cellGate('failing', ...)` counts as a dead end. It also counted re-rating
  starts. P2-04 deleted both; this layer writes them back as the C1 `phase` and `rerate` lines.

## Scope

- **Create, under `tools/ig-proto/phase2/`:**
  - `files/p2-trace/core/engine/p2-trace.js`: the trace module (step 1);
  - `files/p2-link/core/browser/ig-link.js`: the frozen file, copied byte for byte;
  - `variants/p2-link.json`, `variants/p2-trace.json` and `variants/p2-trace-today.json` (step 2);
  - `trace.test.mjs` (step 4).
- **Change:** `variants/p2-gen4.json` and `variants/p2-today.json`, their `extends` only (step 3).
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/files/p2-trace/core/engine/p2-trace.js',
    'tools/ig-proto/phase2/files/p2-link/core/browser/ig-link.js', 'tools/ig-proto/phase2/variants/p2-link.json',
    'tools/ig-proto/phase2/variants/p2-trace.json', 'tools/ig-proto/phase2/variants/p2-trace-today.json',
    'tools/ig-proto/phase2/variants/p2-gen4.json', 'tools/ig-proto/phase2/variants/p2-today.json',
    'tools/ig-proto/phase2/trace.test.mjs', 'tasks/improve-generating-phase-2/P2-12d-trace-layer.md')
  ```

## Steps

1. **`p2-trace.js`** (`// @ts-check`; it exists only in copies). Imports: `appendFileSync` (`node:fs`), `threadId`
   (`node:worker_threads`), `activeCount` (`./board.js`), `DEDUCE` (`./policy.js`). It must not import
   `./difficulty.js`.
   - **Writing.** `write(line)` appends `JSON.stringify(line) + '\n'` to
     `${IG_LOG_DIR}/${IG_ROW ?? 'unrowed'}.${process.pid}.${threadId}.jsonl`, and does nothing without `IG_LOG_DIR`
     (the frozen `ig-log.js` lines 43-50). `at` values are `performance.timeOrigin + performance.now()`.
   - **The worker header (review-2 R2-02, verbatim).** "Ensure a worker header once per absolute destination filename,
     before its first non-header line. Also call this ensure operation at module load when logging is enabled, so a
     loaded but unused worker has a journal. A later change of `IG_LOG_DIR` or `IG_ROW` creates a new destination with
     its own first header. Nothing is written without `IG_LOG_DIR`; sequence numbering remains per thread."
     - The header is `{ t: 'worker', pid: process.pid, threadId, at }` (C1). A module-level `Set` holds the absolute
       destination filenames that have their header; `write(line)` first ensures the header of its current destination.
     - Every thread that loads the engine then has its journal file, which P2-13r's `missing worker journal` check
       needs.
   - **State.** A module-level `sequence` (from 0) and `current` (the open call or `null`). A call is
     `{ id, work, profiles, countWork, pending }`, with `id = \`${row}:${process.pid}:${threadId}:${sequence}\``.
   - **`export function p2TraceCall(ctx, run)`.**
     - Without `IG_LOG_DIR` it returns `run()`.
     - Otherwise: increment `sequence`; write
       `{ t: 'start', call, stage: ctx.igStage ?? 'other', attempt: ctx.igAttempt ?? null, level: ctx.target?.id ?? null, A: activeCount(ctx.board), at }`,
       then `{ t: 'caps', call, count: true }`; set `current`.
     - Run `run()`. On a return, write
       `{ t: 'end', call, result: res.ok === true ? 'ok' : String(res.reason), work, profiles, locate: { countWork }, igNoWindow: res.igNoWindow ?? null, budgetStop: (res.counters?.budgetStops ?? 0) > 0, clueCount: res.ok === true ? res.clues.length : null, at }`.
       On a throw, write the same with `result: 'error'`, `igNoWindow: null`, `budgetStop: false`, `clueCount: null`,
       then rethrow.
     - Restore the previous `current` in a `finally`.
   - **`export function p2TraceRating(board, pieces, clues, work, run, Capped)`.** `run` returns a rating, or
     `{ rating, detail }`; `Capped` is the `IncompleteRatingError` class, passed by `difficulty.js`.
     - Without a `current` call, or with a pending primitive (a nested rating), it returns `run()` and writes nothing.
     - Otherwise it writes
       `{ t: 'begin', call, kind: work < DEDUCE.work ? 'screen' : 'rate', bound: ratingBound(board, pieces, clues, { ...DEDUCE, work }) }`
       and marks the primitive pending.
     - It runs `run()` and writes `{ t: 'p', call, i: profiles, tuple: [phase, count, outcome, score, mainWork, censusWork] }`,
       with `phase` `'call'` and `count` `clues.length`:

       | `run()` | `outcome` | `score` | `mainWork` | `censusWork` |
       |---|---|---|---|---|
       | returns (the rating `m = (result.rating ?? result).metrics`) | `'rated'` | the rating's `score` | `m.work - m.censusWork` | `m.censusWork` |
       | throws a `Capped` | `'capped'` | `null` | `error.counters.work` | `0` |
       | throws anything else | `'error'` | `null` | `0` | `0` |

     - Then `profiles += 1`, `work += mainWork + censusWork`, the pending mark is cleared, and the result is returned
       or the error rethrown.
   - **`export function p2TraceCount(rowLimit, run)`.** Without a `current` call it returns `run()`. Otherwise it writes
     `{ t: 'begin', call, kind: 'count', bound: rowLimit }`, runs `run()`, then writes
     `{ t: 'count', call, units: result.rowTrials }` and adds the units to `countWork`. A throw leaves the primitive
     pending and rethrows; the call's `end` then has no closing line for it, and `rowLedger` reports it.
   - **`export function p2TracePhase(name)`** writes `{ t: 'phase', call, phase: name, at }`, and
     **`export function p2TraceRerate(phase)`** writes `{ t: 'rerate', call, phase, at }`. Both write nothing outside a
     call.
   - **`export function ratingBound(board, pieces, clues, limits)`:** the body of the frozen `igRatingBound`, verbatim.
2. **The manifests** (every edit verbatim where it says so; `find` texts end with `\n` where the anchor is a line):

   | Manifest | `extends` | `files` | Edits | `params` |
   |---|---|---|---|---|
   | `p2-link` | `["base"]` | `["p2-link"]` | `log-5`, `log-6`, `log-7`, `log-8`, then `link-1` to `link-17` in the order of `link.json`, then `instr-7`: each object copied verbatim from its frozen manifest | `{ "link": true }` |
   | `p2-trace` | `["p2-link"]` | `["p2-trace"]` | the `tr-*` edits below | `{ "trace": "p2-trace-v1" }` |
   | `p2-trace-today` | `["p2-link"]` | `["p2-trace"]` | the `tt-*` edits below | `{ "trace": "p2-trace-v1" }` |

   The `tr-*` edits (the `gen-v4` source):
   - `tr-1` `core/engine/clues.js`: `export function selectClues(ctx) {\n` becomes
     `export function selectClues(ctx) {\n  return p2TraceCall(ctx, () => p2SelectClues(ctx));\n}\n\nfunction p2SelectClues(ctx) {\n`.
   - `tr-2`, `tr-3`, `tr-4` `core/engine/difficulty.js`: each of `rate`, `rateDetailed`, `rateLean` the same way, for
     example `export function rate(board, pieces, clues, ws) {\n` becomes
     `export function rate(board, pieces, clues, ws) {\n  return p2TraceRating(board, pieces, clues, DEDUCE.work, () => p2Rate(board, pieces, clues, ws), IncompleteRatingError);\n}\n\nfunction p2Rate(board, pieces, clues, ws) {\n`
     (`p2RateDetailed`, `p2RateLean`).
   - `tr-5` `core/engine/difficulty.js`: `export function rateWithLimits(board, pieces, clues, ws, work, mode) {\n`
     becomes the same with `work` in place of `DEDUCE.work` and `p2RateWithLimits(board, pieces, clues, ws, work, mode)`.
   - `tr-6` `core/engine/clue-primitives.js`: the count line becomes
     `    const c = p2TraceCount(rowLimit, () => countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 2 }));`
   - `tr-7`, `tr-8`, `tr-9` (appends): `\nimport { p2TraceCall } from './p2-trace.js';\n` to `clues.js`,
     `\nimport { p2TraceRating } from './p2-trace.js';\n` to `difficulty.js`, and
     `\nimport { p2TraceCount } from './p2-trace.js';\n` to `clue-primitives.js`.
   - `tr-10` `core/engine/select-v4.js`: `  const rerate = (p, phase) => {\n` becomes
     `  const rerate = (p, phase) => {\n    p2TraceRerate(phase);\n`.
   - `tr-11` the same file: the phase C `for` line (with its `\n`) becomes
     `    if (rated.length === 0) {\n      p2TracePhase('p2');\n    }\n` followed by that same line.
   - `tr-12` (append) to `select-v4.js`: `\nimport { p2TracePhase, p2TraceRerate } from './p2-trace.js';\n`.

   The `tt-*` edits (the `today` source, `6b94ffb`): `tt-1` = `tr-1`; `tt-2` to `tt-4` = `tr-2` to `tr-4`; `tt-6` =
   `tr-6` on `core/engine/clues.js`; `tt-7` appends `\nimport { p2TraceCall, p2TraceCount } from './p2-trace.js';\n`
   to `clues.js`; `tt-8` = `tr-8`. There is no `rateWithLimits` there.
3. **The chains.** In `p2-gen4.json`, `extends` becomes `["p2-trace"]`; in `p2-today.json`, `["p2-trace-today"]`.
   Every other copy of P2-12b extends one of these, so every measured copy is traced and linked.
4. **`trace.test.mjs`** (`node:test`). One `before` hook builds the copy `p2-gen4` into
   `tests/artifacts/ig-proto/phase2/self-test/trace-<start ms>/p2-gen4` with P2-12b's `buildCopy`, rehearsed while
   `version.js` says `gen-v3`. Then it sets `process.env.IG_LOG_DIR` and `process.env.IG_ROW` to the first case's
   folder and name, and only then imports the copy's modules with `pathToFileURL`, so the module load writes the
   worker line there. Each case sets `IG_LOG_DIR` to its own empty folder and `IG_ROW` to its own name, and removes
   both at its end. An `after` hook removes the self-test folder.
5. **Gates.** The copy checks, then the locked trace self-check.

## Tests

`journal(dir)` reads every file of the case's folder whose name does not end `.link.jsonl` or `.row.jsonl`, in name
order, with `parseLines` of `verdicts.mjs`; a problem fails the case.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/trace.test.mjs` | `a set attempt journals a complete call` | the copy's `setAttempt({ board: rectangle(10, 6), rotation: 0, levelId: 'hard', seedText: 'p2-12d', uniqueness: 'any', execution }, 0)` | `rowLedger(lines, [{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }])`: `complete` true, `calls` 1, `ended` 1, `lo === hi`, `lo > 0`; the `start` line has `stage: 'set'`, `attempt: 0` |
| same | `a batch candidate names its slot and attempt` | the copy's `puzzleCandidate(ctx, 2, 1)` on the set of the previous case | the `start` line has `stage: 'batch'`, `attempt: '2/1'` |
| same | `the traced units equal the metered charge` | the set attempt with `observe.charge` collecting units | the sum of the charges equals `rowLedger(...).lo` |
| same | `the trace changes no result` | the set attempt with and without `IG_LOG_DIR` | deep-equal results |
| same | `the first line of a journal is the worker line` | the journal file of the first case | its first line is `{ t: 'worker', pid: process.pid, threadId: 0, at }` (the test's own thread) |
| same | `each destination begins with its worker header` | one imported trace module; the set attempt of the first case with `IG_LOG_DIR` folder `a` and `IG_ROW` `row-a`, then again with folder `b` and `IG_ROW` `row-b` | both journal files begin with the worker header, and each holds exactly one `worker` line |
| same | `a require call journals its counts` | the same set attempt with `uniqueness: 'require'` | at least one `count` line; `complete` true; `countWork` equals the `end` line's `locate.countWork` |
| same | `the end line keeps the raw no-window side and the budget stop` | the context that P2-05a's `run(name, spec)` builds (copy its helpers `k15`, `synthetic` and `fromCount` from `tests/select-v4.test.js`), with the copy's modules and the copy's `selectClues` in place of `selectCluesV4`; the specs of `below1` (target `level('nightmare')`) and `budget-any-54` | `end` lines `{ result: 'not-in-band', igNoWindow: 'below', budgetStop: false }` and `{ result: 'ok', igNoWindow: null, budgetStop: true }` |
| same | `re-rating starts are journaled` | the P2-05a vector cases (through the copy's `selectClues`, as the previous case) whose JSONL `kinds` hold `rescue:` or `rerate:` entries | per case, the `rerate` lines by `phase` equal the number of those `kinds` entries by phase |
| same | `the dead-end line is in place` | `planTree('p2-gen4')`'s `core/engine/select-v4.js` | it contains `if (rated.length === 0) {\n      p2TracePhase('p2');\n    }\n` directly before the phase C `for` line |
| same | `ratingBound equals the frozen bound` | two clue lists of the set attempt's layout; `{ ...DEDUCE }` and `{ ...DEDUCE, work: 190000000 }` | equal to `igRatingBound` imported from `tests/artifacts/ig-proto/tree-frozen/fr-frozen/core/engine/ig-select-v4.js` |
| same | `the link layer is the frozen one` | `p2-link.json` and the frozen manifests; the two `ig-link.js` files | each edit deep-equals the frozen object with its id; `lf` of the two files equal |
| same | `every measured copy is traced` | `planTree` of the five `gen-v4` copies and `p2-today` | each chain holds `p2-link` and `p2-trace` (or `p2-trace-today`); each `params.trace` is `p2-trace-v1` |

## Documentation

None here; P2-17 documents the trace in `tools/ig-proto/README.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\phase2\copies.mjs check --source gen-v4 @flag` and `... check --source today --root Q:\git\pentomino-p2-today` (G-COPIES) | slot root, unlocked | two `copies: OK` lines | 2 min |
| locked trace self-check: `Invoke-IgNode -Repo pentomino -Task 'P2-12d trace' -LimitSeconds 300 -QuietSeconds 45 -NodeArgs @('--test', 'tools/ig-proto/phase2/trace.test.mjs', 'tools/ig-proto/phase2/copies.test.mjs')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** after the first locked run when a ledger is incomplete: give its `problems`. The pack author
  rules before the format changes; `contracts.md` is frozen.
- **`QUESTION:`** when:
  - an anchor does not match exactly once;
  - a frozen edit does not apply to the merged sources;
  - the traced units and the metered charge differ.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12d-B01 | Every measured row's work can be bounded and checked by the frozen ledger rules, and the trace changes nothing | the ledger and no-change cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12d-T01 | R5: C1 lines that `rowLedger` judges complete; identity per task; the raw no-window side and budget stop at the call's end | the trace cases | test output |
| P2-12d-T02 | Traced units equal metered units | the charge case | test output |
| P2-12d-T03 | The link, row and key edits are the frozen ones | the link case | test output |
| P2-12d-T04 | Every measured copy carries the layer | the chain case; G-COPIES | test and command output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the locked self-check green
- [ ] Both copy checks OK
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the copy checks and the helper line;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |

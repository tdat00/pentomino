# P2-16a: Integrated worker cases and the pre-seal gate list

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §6 P2-T06, P2-T13; D-P2-13; review-1 R11; review-2 R2-03 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-16a` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-15 (`gen-v4` live) and P2-13a (the seal command named in the gate list) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: locked runs and the full suite (the final integrated gate) |

## Goal

With `gen-v4` live, a real request gives the same puzzles at real pool widths 1, 2 and 4, and in the width-8 fold
simulation. The CLI's shared scope is off on the full 26x26 board. The ordered list of gates that P2-18 runs before
sealing is written once, with exact commands.

## Authority and fixed points

- **R11, verbatim:** "Add a gen-v4 request on the same fixed small Nightmare recipe/seed at real pool widths **1, 2,
  4**, comparing its consumed keys; retain width 8 as a fold simulation. A clock-cut case is reported as a prefix, not
  exact full-request equality."
- **D-P2-13:** pools stay 1 to 4 (`core/browser/worker-pool.js:75`); width 8 is the fold simulation.
- **The fold simulation** is `describe('deterministic parallel simulation')` of `tests/generate.test.js`
  (lines 774-835 at the base): `simulate(ctx, memo, width, orderSeed)` and `summary`.
- **The glue** through real workers is P2-16c's; it is not repeated here.

## Scope

- **Create:** `tests/real-worker.test.js` and `docs/improve-generating-phase-2/evidence/P2-16a/gates.md`.
- **Change tests**, new cases only: `tests/generate.test.js` (at the end of `describe('deterministic parallel simulation')`)
  and `tests/cli.test.js` (at the end of the file).
- **Do not change:** production code (a defect found here is a `QUESTION:`) and anything else. Guard: G-PROTECTED, and
  G-WORKTREE with

  ```powershell
  $Allowed = @('tests/real-worker.test.js', 'tests/generate.test.js', 'tests/cli.test.js',
    'docs/improve-generating-phase-2/evidence/P2-16a/gates.md', 'tasks/improve-generating-phase-2/P2-16a-integrated-cases.md')
  ```

## Steps

1. **`tests/real-worker.test.js`**, case `slow: gen-v4 gives the same puzzles at real pool widths 1, 2 and 4`.
   - For each width `w` of 1, 2 and 4:
     - `pool = createPool({ size: w, workerFactory: nodeWorkerFactory() })` and `client = createGenerationClient(pool)`;
     - `set = await client.generateSet({ boardRows: rectRows(10, 10), rotation: 0, levelId: 'nightmare', seedText: 'p2-16a/widths', uniqueness: 'any', maxActive: 676 })`;
     - `batch = await client.generateBatch({ set: set.set, rotation: 0, targetLevelId: 'nightmare', quantity: 3, setSeed: 'p2-16a/widths', batchIndex: 1, uniqueness: 'any', seenLayouts: [], seenClues: [], calibration: set.calibration, setLevel: 'nightmare', setAttempt: set.attempt, setOrigin: set.setOrigin })`;
     - `pool.close()` in a `finally`.
   - Compare across widths: the set's piece keys, and the ordered `layoutKey`, `clueKey` and score of the accepted
     puzzles.
     - When every run is `complete`, they must be equal.
     - When any run's reason is `time-limit` (a clock cut), the lists must be equal on their common prefix, and the case
       prints `p2-16a: clock cut at width <w>; prefix <n> compared`.
   - Also assert that every accepted candidate's `made.versions.algo` is `gen-v4`.
2. **`tests/generate.test.js`**, at the end of `describe('deterministic parallel simulation')`: case
   `slow: gen-v4 fold sizes 1, 2, 4 and 8 agree on 10x10 Nightmare`. It runs `setAttempt` on `rectangle(10, 10)` with
   `levelId: 'nightmare'`, `seedText: 'p2-16a/fold'` and `uniqueness: 'any'`, then the existing `simulate` at widths 1,
   2, 4 and 8, orders `a` and `b`, against `runFold(ctx)`, with `quantity` 3, as the existing case does.
3. **`tests/cli.test.js`**, at the end: case `the CLI scope is off on the full 26x26 board`.
   `cliScope({ newScope: (r) => ({ origin: 0, setCutAt: r ? 46000 : null }) }, 'nightmare', rectRows(26, 26))` is
   `undefined`.
4. **`gates.md`**: the ordered list of P2-18's pre-seal gates, each with its exact command, where it runs, its expected
   output and its limit:
   1. the full suite (locked, 600 s);
   2. every phase-2 test file in one locked runner:
      `-NodeArgs @('--test', 'tools/ig-proto/phase2/trace-reader.test.mjs', 'tools/ig-proto/phase2/binding.test.mjs', 'tools/ig-proto/phase2/p2.test.mjs', 'tools/ig-proto/phase2/copies.test.mjs', 'tools/ig-proto/phase2/trace.test.mjs', 'tools/ig-proto/phase2/proofs.test.mjs', 'tools/ig-proto/phase2/proofs-prior-legacy.test.mjs', 'tools/ig-proto/phase2/replay-probe.test.mjs', 'tools/ig-proto/phase2/glue.test.mjs', 'tools/ig-proto/phase2/browser-run.test.mjs')`
      (600 s);
   3. `tools\record-fixtures.mjs --check`, `--replay-case --check --recipe hard`, `--replay-case --check --recipe screen`
      and `--replay-case --refusal` (each locked, 600 s);
   4. `npm run check`;
   5. G-PROTECTED;
   6. G-COPIES for `gen-v4` (no flag) and for `today`;
   7. the copies' builds: `copies.mjs build --source gen-v4` and `copies.mjs build --source today --root Q:\git\pentomino-p2-today`;
   8. `p2.mjs plan --out docs\improve-generating-phase-2\evidence\plan`;
   9. `p2.mjs seal --commit <HEAD> --today-root Q:\git\pentomino-p2-today --plan docs\improve-generating-phase-2\evidence\plan\plan.json --out docs\improve-generating-phase-2\evidence\seal`.
5. **Gates (review-2 R2-03, verbatim).** Run the focused production tests and the full production suite. Write the
   complete pre-seal gate list in `gates.md`, but do not execute its gate 2 in this task: some listed tooling files may
   not yet be merged. P2-18 runs that complete list after every development task is accepted. Existing conditional
   merge gates still run the tooling tests available on the rebased branch.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/real-worker.test.js` | `slow: gen-v4 gives the same puzzles at real pool widths 1, 2 and 4` | step 1 | equal keys at every width (or equal prefixes with the printed cut); `gen-v4` versions |
| `tests/generate.test.js` | `slow: gen-v4 fold sizes 1, 2, 4 and 8 agree on 10x10 Nightmare` | step 2 | every width and order equals the serial fold |
| `tests/cli.test.js` | `the CLI scope is off on the full 26x26 board` | step 3 | `undefined` |

## Documentation

`gates.md` only.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/real-worker.test.js', 'tests/cli.test.js', 'tests/generate.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| the full suite (the final integrated gate) | §3.3 | `# fail 0`, `# cancelled 0`, within 600 s | 600 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when a case fails on production code (no production edit here), when the widths disagree without a
  clock cut, or when a slow case takes more than 120 s.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16a-B01 | The same request gives the same puzzles whatever the number of workers | the width cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16a-T01 | P2-T06 and R11: real widths 1, 2 and 4, and width 8 by the fold simulation, with `gen-v4` live | cases | test output |
| P2-16a-T02 | The pre-seal gate list exists with exact commands | `gates.md` | file |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the full suite green (gate 2 of `gates.md` is written, not run: P2-18 runs it)
- [ ] `gates.md` written
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the helper lines and the pass counts, with the slow cases' seconds;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w3, 6c039dec1f04072b0e8bcdf52b0c2347ab58485b |
| Start, end, duration | dispatched 2026-11-26 01:46 +07:00 (developer 01:46:45 to 01:54:43); accepted 01:56 |
| Waiting for rulings | none |
| Agent id, model | 73574cdc-c3d8-4795-93ec-ccf12c82f701, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 40; 3,489,873 / 28,457 / 3,366,634 |
| AI credits | 92.93 |
| Questions and rulings | none; six minor deviations accepted by the orchestrator (layoutKey and clueKey from batch.seenLayouts and seenClues, scores from accepted; the gen-v4 version assertion on candidate records only, at least one per run; the width case passes no scope as step 1 lists; one cut message per cut run; gates.md expected outputs from the code and the copy checks; cases placed in the existing describe blocks) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards; merge gate with the locked full suite (full-suite point) and G-COPIES (results in the bookkeeping); developer: locked focused 60/60 (123.592 s), locked full suite 1629/1629 (138.641 s), G-PROTECTED, G-WORKTREE, G-FORMAT (4 files), G-CHECK OK, copies 195 and 32 edits; slow cases: fold sizes 95.7 s, real pool widths 23.5 s |
| Commit (slot), commit on `gen-v4` | this commit; its SHA on gen-v4 in the bookkeeping |
| Issues and named items | the fold case takes about 95 s against the 120-s stop point (load sensitive); gate 2 of gates.md runs only when all ten phase-2 test files exist (P2-12c's proofs test) |

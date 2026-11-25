# P2-16c: The real no-window glue on a scripted-rating copy

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.6 (N-V4-16, "keep the real-worker synthetic-ratings test"), §6 P2-T05; D-P2-10; review-1 R11; review-2 R2-02, R2-03 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-16c` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-12d (the traced/tagged copies) and P2-09. |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: one locked glue proof (at most 300 s) |

## Goal

A test drives four same-side no-window ends through the whole real chain:

- the selector's raw side;
- `setAttempt`'s translation;
- the protocol, the worker pool and real worker threads;
- the client's bound and the public terminal reason.

Only the ratings are scripted. A deliberately broken translation must fail the test, so a lost no-window reason can
never pass as zero reach (N-V4-16).

## Authority and fixed points

- **R11, verbatim:** "In a test-only copy, script only the rating outcomes. Keep the production `executeTask`,
  `setAttempt`, no-window translation, protocol, worker pool and client. Force four same-side failures through that
  chain and assert the raw selector side, transported reason, client firing and public terminal reason. A deliberately
  broken translation must fail the test. Budget-stop and no-window cases are separate." And: "The mixed-side worker
  script must actually forward its unscripted attempt to the real handler."
- **The seams.** The production selector (P2-04) takes the test seams `rateScreen(clues)` and
  `rate(board, pieces, clues, ws)`, as P2-05a's `run` uses them. The glue copy installs them only for the scripted set
  attempts, inside the worker.
- **The copy chain (review-2 R2-03, verbatim).** `p2-glue` extends the traced and linked `p2-gen4`. The context tags and
  raw journal are mandatory. Never skip the raw-side comparison; missing trace is a failed proof.
  - The seams of step 1 need `ctx.igStage` and `ctx.igAttempt`, which only the copies' log and link edits add (P2-12d;
    `contracts.md` C1).
- **The anchors:**
  - `export function selectCluesV4(ctx) {` (`core/engine/select-v4.js`, P2-04);
  - the text `` `no-window-${cal.igNoWindow}` `` (`core/engine/generate.js` `failureOf`, P2-06).
- **The synthetic rating** is P2-05a's `synthetic(score, { work })`:
  `{ model: 'difficulty-v3', score, level: 'st', saturated: false, metrics: { work, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: 'exhausted', Gproved: 1, censusComplete: true } }`.

## Scope

- **Create** under `tools/ig-proto/phase2/`:
  - `variants/p2-glue.json` and `variants/p2-glue-broken.json`;
  - `files/p2-glue/core/engine/p2-glue.js`;
  - `glue.test.mjs`.
- **Do not change:** anything else, `copies.mjs` included (the test builds the two copies with P2-12b's `buildCopy`).
  Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/variants/p2-glue.json', 'tools/ig-proto/phase2/variants/p2-glue-broken.json',
    'tools/ig-proto/phase2/files/p2-glue/core/engine/p2-glue.js', 'tools/ig-proto/phase2/glue.test.mjs',
    'tasks/improve-generating-phase-2/P2-16c-no-window-glue.md')
  ```

## Steps

1. **`p2-glue.js`** (copy-only, `// @ts-check`): `export function glueSeams(ctx)`.
   - It reads `process.env.P2_GLUE_SCRIPT`, a JSON object from set-attempt index to `'below'`, `'above'` or `'budget'`.
     Worker threads see the parent's environment.
   - When `ctx.igStage === 'set'` and the script has an entry for `ctx.igAttempt`, it returns the seams:
     - `'below'`: `rateScreen` and `rate` return `synthetic(0)`, below every band;
     - `'above'`: both return `synthetic(200)`, above Nightmare's band;
     - `'budget'`: both return `synthetic(54, { work: 6000000000 })`. This is in Nightmare's band; after two
       ratings the work passes the 10 G `any` budget, so a budget stop follows.
   - Otherwise it returns `{}`, and the real selector runs: the forwarded, unscripted attempt.
2. **`p2-glue.json`:** `extends: ["p2-gen4"]`, `files: ["p2-glue"]`, `params: { "glue": true }`, and these edits:
   - `gl-1` `core/engine/select-v4.js`: `export function selectCluesV4(ctx) {\n` becomes
     `export function selectCluesV4(ctx) {\n  ctx = { ...ctx, ...glueSeams(ctx) };\n`;
   - `gl-2` (append) to `select-v4.js`: `\nimport { glueSeams } from './p2-glue.js';\n`.
3. **`p2-glue-broken.json`:** `extends: ["p2-glue"]`, with the edit `gb-1` on `core/engine/generate.js`:
   `` `no-window-${cal.igNoWindow}` `` becomes `cal.reason`, a translation that loses the side.
4. **`glue.test.mjs`** (`node:test`).
   - **Set-up.** A `before` hook builds `p2-glue` and `p2-glue-broken` with `buildCopy` into
     `tests/artifacts/ig-proto/phase2/self-test/glue-<ms>/`, rehearsed while `version.js` says `gen-v3`. It imports each
     copy's `createGenerationClient`, `createPool` and the `nodeWorkerFactory` of its `tools/node-worker.mjs`.
   - **Each case:**
     - sets `P2_GLUE_SCRIPT`, `IG_LOG_DIR` (its own folder, as an absolute path; `contracts.md` C1) and `IG_ROW`;
     - creates `createPool({ size: 4, workerFactory })` and `createGenerationClient(pool, { maxSetAttempts: 8 })`;
     - runs `generateSet({ boardRows: rectRows(10, 10), rotation: 0, levelId: 'nightmare', seedText: 'p2-16c/<case>', uniqueness: 'any', maxActive: 676 })`;
     - closes the pool.
   - **`assertGlue(result, journalLines, side)`**, with `side` the scripted `'below'` or `'above'`, returns the list of
     discrepancies, one string per failed check:
     - the raw side (review-2 R2-02, verbatim): For each k from 0 to 3, find the unique C1 start with
       `stage === 'set'` and `attempt === k`, then its end by equal `call`. Require `end.igNoWindow === side`. A missing
       or duplicate match is a discrepancy. Stage and attempt are not read from end lines. These four checks always
       run; P2-12d is a prerequisite (R2-03).
     - the transported reason, for each attempt k from 0 to 3: the entry of `result.trail.attempts` whose `attempt` is
       k (the list is in arrival order) has `reason` `` `no-window-${side}` ``;
     - the firing, once: `result.trail.boundFired` is true;
     - the public reason, once: `result.reason` is `` `no-window-${side}` ``.
5. **Gates.** Run the locked glue proof (Commands).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/glue.test.mjs` | `four below ends fire the bound through the real chain` | `p2-glue`; script `{ 0: 'below', 1: 'below', 2: 'below', 3: 'below' }` | `{ status: 'failed', reason: 'no-window-below' }`; `trail.boundFired` true; `assertGlue` returns no discrepancy |
| same | `four above ends fire the bound through the real chain` | the same with `'above'` | `no-window-above`; no discrepancy |
| same | `mixed sides do not fire; the next attempt runs the real selector` | script `{ 0: 'below', 1: 'below', 2: 'below', 3: 'above' }` | `trail.boundFired` false; attempt 4 was dispatched and ran unscripted (its C1 `start` line with `stage: 'set'`, `attempt: 4`); the result is not `no-window-*` |
| same | `a budget stop is not a no-window end` | script `{ 0: 'budget', 1: 'budget', 2: 'budget', 3: 'budget' }` | the set completes with attempt 0; `counters.budgetStops` at least 1; no `no-window` reason; `trail.boundFired` false |
| same | `a broken translation fails the glue check` | `p2-glue-broken` with the four `'below'` | `trail.boundFired` false; `assertGlue(result, lines, 'below')` returns 6 discrepancies: the four transported reasons (`not-in-band`, the side lost), the firing and the public reason; all four raw-side checks pass |

## Documentation

None here; P2-17 documents the glue proof in `tools/ig-proto/README.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| the locked glue proof: `-NodeArgs @('--test', 'tools/ig-proto/phase2/glue.test.mjs')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| G-COPIES (with its phase-aware flag) | §3.4 | two `copies: OK` lines | 2 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** when a case shows a real discrepancy on `p2-glue`: that is a glue defect for the pack author.
- **`QUESTION:`** when an anchor does not match once, or when the copy's worker cannot see `P2_GLUE_SCRIPT`.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16c-B01 | The early stop reaches the user through real workers, with its side | the below and above cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16c-T01 | R11: raw side, transported reason, firing and public reason through the production chain; only ratings scripted | the cases | test output |
| P2-16c-T02 | A broken translation is caught; budget stops are apart; an unscripted attempt is forwarded | the broken, budget and mixed cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] The locked glue proof green
- [ ] G-FORMAT, G-CHECK, G-PROTECTED, G-COPIES pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the helper line and the pass counts;
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

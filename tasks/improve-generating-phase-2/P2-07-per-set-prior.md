# P2-07: The per-set prior: transport and the serial path

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 interfaces (`igPrior`), §4.4 P4 row (R1); D-P2-07; review-1 R8 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-07` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-06 (it writes the client's import of `PER_SET_LEVELS` and `perSetPrior`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: locked focused runs |

## Goal

On Hell 1, every ordinary candidate's locate starts from the window count of the set's calibration puzzle: P4's per-set
prior, under the frozen rule. The value travels from the client through the worker protocol into the selection context.
The serial engine path `runFold` applies the same rule, so a caller of the serial API never falls back to the table.
Nightmare and every other level use the table; the completion pass never takes the override.

## Authority and fixed points

- **The rule** is P2-01's `perSetPrior(cal, levelId, uniqueness)` in `core/engine/gen-v4.js`, applied only when
  `PER_SET_LEVELS.includes(levelId)`. This task adds no rule of its own: both call sites below use that expression.
- **Frozen edits being ported** (`tools/ig-proto/variants/v4-ps.json`, `v4.json`):
  - `ps-1`: the calibration's `igWindow`;
  - `ps-2` and `ps-3`: the protocol;
  - `ps-4`: the task;
  - `ps-5` and `ps-6`: the client's dispatch;
  - `pv-5`: the context of `puzzleCandidate`.

  `made.igPrior` (`pv-6`) is P2-08's.
- **R1 (plan §4.4 P4 row), verbatim:** "On Hell 1, apply the frozen per-set rule to the batch's usable calibration: its
  solution and clue poses must be self-consistent for the current board/pieces, its rating must name the target level,
  and the current `require` mode additionally needs `certificate.status === 'unique'`. A valid `igWindow.wc` supplies
  the clamped start for every ordinary candidate, including candidates on different layouts and later batches where
  the calibration's keys are already seen. Do not compare the calibration's original uniqueness mode or require an
  unseen calibration. Otherwise use the table. The completion pass takes no per-set override; calibration remains
  session-only."
- **Self-consistency.**
  - On the client it is today's `usableCalibration` (`generation-client.js:433-446`), applied by `checkBatch` (806).
  - On the serial path, the caller passes a calibration from `setAttempt`, which is self-consistent by construction;
    `foldStart` does not check it either.
- **Hell 1 on the shipping client (R8).** `checkBatch` (lines 760-815) checks no area offer; only `checkSet` (575-580)
  refuses an unoffered level. So a scripted-pool Hell 1 batch runs on the shipping client, and this task adds no offer
  switch and does not touch `AREAS`.
- **The worker side.** The proof that a dispatched `igPrior` reaches the selector and the stored record needs `gen-v4`
  active. It is P2-12e's end-to-end case on the labelled diagnostic copy (R8), named in the acceptance criteria below.
- **No Generator change.** `generator/jobs.js:391-393` does not change: Hell 1 is not offered there (phase 3).

## Scope

- **Change:**
  - `core/engine/generate.js`: `setAttempt`, `puzzleCandidate`, `runFold`, and the import block;
  - `core/engine/tasks.js`: the `puzzleCandidate` task;
  - `core/engine/protocol.js`: `PAYLOAD_FIELDS.puzzleCandidate`, `PAYLOADS.puzzleCandidate`;
  - `core/engine/types.js`: `BatchContext`, the `Puzzle` doc;
  - `core/browser/generation-client.js`: two places in `generateBatch`;
  - `docs/design-detail.md` §6.9.
- **Change tests:** `tests/protocol.test.js`, `tests/tasks.test.js`, `tests/generation-client.test.js`,
  `tests/generate.test.js`, new cases only, at the places below.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/generate.js', 'core/engine/tasks.js', 'core/engine/protocol.js', 'core/engine/types.js',
    'core/browser/generation-client.js', 'tests/protocol.test.js', 'tests/tasks.test.js', 'tests/generation-client.test.js',
    'tests/generate.test.js', 'docs/design-detail.md', 'tasks/improve-generating-phase-2/P2-07-per-set-prior.md')
  ```

## Steps

1. **`generate.js`, imports.** Add `import { PER_SET_LEVELS, perSetPrior } from './gen-v4.js';` to the import block. If a
   line importing from `./gen-v4.js` already exists, add the two names to it in alphabetical order instead.
2. **`setAttempt` (`ps-1`).** The calibration object gains `igWindow: cal.igWindow ?? null,` directly after its
   `certificate: cal.certificate,` line. `gen-v3` gives `null`.
3. **`puzzleCandidate` (`pv-5`).** In its `selectClues({ ... })` context, directly after `replaySkips,`, add
   `...(ctx.igPrior === undefined ? {} : { igPrior: ctx.igPrior }),`. `completionCandidate` does not pass it.
4. **`runFold`, the serial path (R8).** Replace its line `const frozen = candidateContext(ctx, s);` with

   ```js
   const frozen = {
     ...candidateContext(ctx, s),
     ...(PER_SET_LEVELS.includes(ctx.targetLevelId) ? perSetPrior(ctx.calibration, ctx.targetLevelId, ctx.uniqueness) : {}),
   };
   ```

   `candidateContext` itself does not change: the client calls it too and applies the rule in step 7.
5. **`tasks.js` (`ps-4`).** In the `puzzleCandidate` task, in the object built with `seenClues: new Set(p.seenClues),`,
   add `...(p.igPrior === undefined ? {} : { igPrior: p.igPrior }),` directly after that line.
6. **`protocol.js` (`ps-2`, `ps-3`).**
   - `PAYLOAD_FIELDS.puzzleCandidate` gains `optional: ['igPrior']`.
   - `PAYLOADS.puzzleCandidate` reads
     `const igPrior = o.igPrior === undefined ? null : readInt(ctx, o.igPrior, 'payload.igPrior', 1, 128);`, adds
     `igPrior` to its `includes(undefined)` list, and returns `...(igPrior === null ? {} : { igPrior })`.
7. **`generation-client.js`, `generateBatch` (`ps-5`, `ps-6`).**
   - Directly after the closing `};` of `const base = { ... };` (lines 852-860), add one line:
     `const prior = PER_SET_LEVELS.includes(levelId) ? perSetPrior(request.calibration, levelId, uniqueness) : {};`
   - The `puzzleCandidate` dispatch (line 903) becomes `runTask(job, 'puzzleCandidate', { ...base, ...prior, slot, attempt }, controller.signal, onWorker)`.
   - The completion pass's payload (`payloadBase`, from line 989) does not change.
   - Do not edit the import line: P2-06 wrote it with both names.
8. **`types.js`.** `BatchContext` gains `@property {number} [igPrior] The per-set override of P4 (gen-v4, Hell 1).`;
   the `Puzzle` typedef notes that a session calibration may carry `igWindow`, which is never stored in a pack.
9. **Tests.** Write the cases below and run the focused gate.

## Tests

| Test file, place | Case name | Input | Expected |
|---|---|---|---|
| `tests/protocol.test.js`, after the test `candidate sets need matching witness and region lengths and bounded history` | `puzzleCandidate accepts an optional igPrior from 1 to 128` | `PAYLOADS.puzzleCandidate()` plus `igPrior` 1, 128; absent; 0, 129, 1.5, `'3'` | 1 and 128 kept; absent gives no field; the others refused at path `payload.igPrior` |
| `tests/tasks.test.js`, after the test `a long internal batch seed is used whole, not truncated to 64 code points` | `an igPrior payload is accepted and today's search ignores it` | the `puzzleCandidate` payload of the test `setAttempt and puzzleCandidate equal the direct engine calls`, plus `igPrior: 5` | the result deep-equals the same task without `igPrior` (a regression check on `gen-v3`; the transport proof is P2-12e's) |
| `tests/generation-client.test.js`, directly after the test `a full history fails preflight without eviction or dispatch` (line 740) | `Hell 1 candidates carry the calibration's window count; the completion pass does not` | `harness({ handler: (t) => (t.kind === 'puzzleCandidate' ? { value: { fail: 'not-in-band' } } : undefined) })`; `batchInput({ targetLevelId: 'hell-1', quantity: 2, calibration: hell })` with `hell = { ...fixture().calibration, rating: { ...fixture().calibration.rating, level: 'hell-1' }, igWindow: { wc: 6 } }` | partial `difficulty-not-found`; puzzle #1 is the calibration; every `h.tasks` of kind `puzzleCandidate` (12 or more) has `payload.igPrior === 6`; no task of another kind has `igPrior` |
| same, next | `the prior applies when the calibration's keys are already seen` | the same, with `seenLayouts` holding the calibration's layout key and `seenClues` its clue key (`layoutKey` and `clueKey` of `core/engine/keys.js` on `fixture().set`) | the calibration is not reused (no accepted puzzle has its id); every `puzzleCandidate` payload still has `igPrior: 6` |
| same, next | `require needs a unique certificate today, whatever mode made the set` | `uniqueness: 'require'`; `hell` with `certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 10000, verified: true }`, then with `certificate: { ...that, status: 'multiple' }` | `igPrior: 6` in every payload; with `multiple`: no payload has `igPrior` |
| same, next | `Nightmare uses the table` | `targetLevelId: 'nightmare'`, `hell` with `rating.level: 'nightmare'` | no payload has `igPrior` |
| `tests/generate.test.js`, at the end of `describe('calibration reuse and history capacity')`, after the test `each seen-key set holds at most 1,000 entries and the request is refused up front` | `runFold applies the per-set prior on Hell 1, as the client does` | `priors(ctx)`: run `runFold(ctx, (c) => { seen.push(c.igPrior); return { fail: 'not-in-band' }; })` and return `seen`. Contexts: `ctxFor({ targetLevelId: 'hell-1', quantity: 2, calibration: calibration({ rating: { ...FAKE_RATING, level: 'hell-1' }, igWindow: { wc: 6 } }) })`; the same with `seenLayouts: new Set([layoutKey(board, pieces, base)])`; with `uniqueness: 'require'` (certificate `null`); with `uniqueness: 'require'` and a `unique` certificate; with `targetLevelId: 'nightmare'` and `rating.level: 'nightmare'`; with `calibration: undefined` | first, second and fourth: nonempty, every entry `6`; third, fifth and sixth: nonempty, every entry `undefined` |

## Documentation

`docs/design-detail.md` §6.9 gets one paragraph at the section's end:

- the per-set prior of `gen-v4` on Hell 1 (R1's rule in substance);
- the `igPrior` payload field (an integer from 1 to 128), on the client and on the serial `runFold` path alike;
- the completion pass takes none;
- not yet live.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/protocol.test.js', 'tests/tasks.test.js', 'tests/generation-client.test.js', 'tests/generate.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when:
  - an existing test pins the exact payload keys of `puzzleCandidate`, or the exact key set of a `BatchContext`;
  - the scripted Hell 1 batch is refused before any dispatch (contrary to the authority above);
  - P2-06's import line is missing `PER_SET_LEVELS` or `perSetPrior`.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-07-B01 | Hell 1 candidates start from the set's own window count, through the client and the serial API alike; other levels are unchanged | client and `runFold` cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-07-T01 | R1's rule exactly: the level, the current `require` certificate, no key or layout condition, no completion override | client cases | test output |
| P2-07-T02 | The serial path applies the same rule (R8) | the `runFold` case | test output |
| P2-07-T03 | The protocol accepts only an integer from 1 to 128 | protocol case | test output |
| P2-07-T04 | Today's search is unaffected by an `igPrior` | tasks case | test output |
| P2-07-T05 | Deleting the client's transport line fails a test | the dispatch cases read the dispatched payload | test output |
| P2-07-T06 | The worker side (protocol, task, context, selector start, `made.igPrior`) is proved end to end | P2-12e's `prior-replay` bundle: its dispatched prior, stored prior and selector-start checks | P2-12e's rehearsal record and P2-18's `E/proofs/prior-replay/result.json` (later tasks; this row is closed when P2-12e is accepted) |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added at their places and green; the focused gate green
- [ ] `docs/design-detail.md` §6.9 updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence (T06: named as P2-12e's)

## Final report

- the start and end times, and the files changed;
- the helper lines and the pass counts;
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

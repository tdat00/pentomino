# P2-12e: Proof bundles 3 and 4: prior and replay, legacy route

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.2 (four proof bundles), §7.3 step 1, §4.2 (the legacy exception), §4.4 P4, §4.7; D-P2-05, D-P2-07, D-P2-09, D-P2-12; P2-T07, P2-T08; review-1 R8, R10, R11; review-2 R2-03; `contracts.md` C14 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-12e` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-12d (the traced copies; P2-07 and P2-08 are merged before it) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: two locked rehearsals (at most 300 s each) |

## Goal

Two more scripted proofs run before any timed row (P2-18):

- **Prior and replay:** on Hell 1, the calibration's window count travels from the client through the worker into the
  selector's start and into the stored record; every `gen-v4` record carries its seven keys and replays `matched`.
- **The legacy route:** Master, the full 26x26 Nightmare board and an ordinary small board return today's puzzles
  through the `gen-v4` build, and a 26x26 Nightmare candidate replays `matched`.

## Authority and fixed points

- **The runner and the record** are P2-12b's: `proofs.mjs` loads `proof-<bundle>.mjs` on invocation;
  `run({ out, quick, root, trees })` returns `{ status, cases, counts, copies }`; `result.json` has the `contracts.md`
  C14 format. `proof-prior-replay` returns `copies: ['p2-gen4-diag']`; `proof-legacy` returns
  `copies: ['p2-gen4', 'p2-today']`.
- **R8, verbatim:** "The transport assertion reads the dispatched `igPrior` and, on the active gen-v4 copy, the
  resulting stored candidate prior; deleting the transport line must fail it." This bundle is the case that
  P2-07-T06 names.
- **R10 and R11.**
  - A replay sample must be nonempty. A seed with no accepted puzzle, or with no ordinary candidate where one is
    required, is `not-measured`, and the bundle fails; it is never an empty "every replay matched" pass.
  - The bundle replays at least one ordinary 26x26 Nightmare legacy candidate and requires `matched`.
- **The rule being proved** is P2-01's `perSetPrior(cal, levelId, uniqueness)`, applied when
  `PER_SET_LEVELS.includes(levelId)`, and `startOf(prior, K)`.
- **The client's API.** `client.replayPuzzle(input)` resolves with `{ status, reason, stages, compared, work, steps }`
  (`core/engine/replay.js:944-953`). Its input is `{ set, puzzle, setOrigin, made }`, as
  `tests/generation-client.test.js`'s replay cases build it.
- **The copies.** `p2-gen4-diag` offers Hell 1 on any area (D-P2-11); `p2-gen4` and `p2-today` are P2-12b's. Each
  bundle uses a copy's own modules: its `createGenerationClient`, its `createPool`, and the `nodeWorkerFactory` of its
  `tools/node-worker.mjs`, with 4 workers.
- **Seeds:** `p2-proof/<cell>/<i>`.

## Scope

- **Create** under `tools/ig-proto/phase2/`: `proof-prior-replay.mjs`, `proof-legacy.mjs` and
  `proofs-prior-legacy.test.mjs`.
- **Change:** `tools/ig-proto/phase2/proofs.mjs`, its last block only (step 4; ruling on P2-12e, 2026-11-26).
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/proof-prior-replay.mjs', 'tools/ig-proto/phase2/proof-legacy.mjs',
    'tools/ig-proto/phase2/proofs-prior-legacy.test.mjs', 'tools/ig-proto/phase2/proofs.mjs',
    'tasks/improve-generating-phase-2/P2-12e-proof-bundles-prior-legacy.md')
  ```

## Steps

1. **`proof-prior-replay.mjs`**, on the copy `p2-gen4-diag`.
   - **Requests:** `14x14-hell-1` and `20x20-hell-1`, two seeds each, and `14x14-nightmare`, two seeds; uniqueness
     `any`. Each is `generateSet`, then `generateBatch` with `quantity` 4 and the set's calibration.
   - **The dispatched prior.** Wrap the pool's `run` before the client is created, to record each `puzzleCandidate`
     payload's `igPrior`. For Hell 1, each must equal `perSetPrior(calibration, 'hell-1', 'any').igPrior`; for
     Nightmare, none has one.
   - **The stored prior.** Every accepted `made.kind === 'candidate'` record has `igPrior` equal to the dispatched
     value on Hell 1, and `null` on Nightmare.
   - **The selector's start.** For the first Hell 1 candidate of each seed, call the copy's `puzzleCandidate(ctx, slot, attempt, { record })`
     with that candidate's `ctx`, slot, attempt and `igPrior`. Its first `rated` or `unrateable` event of
     `phase: 'locate'` must have `Math.min(K - 2, Math.max(1, igPrior))` clues.
   - **Versions.** Every record's `versions` has the seven keys, with `priorTable: 'prior-s3-v1'` and
     `screenTable: 'screen-v4-v1'`.
   - **Replay.** `client.replayPuzzle` of every accepted puzzle returns `status: 'matched'`, and each seed has at least
     one replayed ordinary candidate (the nonempty rule).
   - **A Hell 1 seed whose calibration gives no per-set prior** (`perSetPrior` returns no `igPrior`) is `not-measured`,
     and the bundle fails: R8 needs a transported prior on every Hell 1 seed (ruling on P2-12e, 2026-11-26).
   - **`--quick`** runs the first seed of `14x14-hell-1` and of `14x14-nightmare`.
2. **`proof-legacy.mjs`**, on the copies `p2-gen4` and `p2-today`, each through its own client.
   - **Requests:** `10x10-master`, `26x26-master`, `26x26-nightmare`, and the 10x6 Hard board of
     `tests/fixtures/generation-case.json`; two seeds each, `quantity` 3.
   - **Equal per seed:** the set's pieces, and the ordered `layoutKey`, `clueKey` and score of the accepted puzzles.
     The versions differ (`gen-v4` against `gen-v3`) and are not compared.
   - **Replay (R11).** On the `p2-gen4` copy, `client.replayPuzzle` of the accepted `26x26-nightmare` puzzles with
     `made.kind === 'candidate'` must return `matched`. At least one such puzzle per seed is required; otherwise the
     case is `not-measured`.
   - **`--quick`** runs the first seed of each of the four cells.
3. **`proofs-prior-legacy.test.mjs`:** the synthetic cases below.
4. **The runner guard (ruling on P2-12e, 2026-11-26).** `proofs.mjs` awaited `main` at its top level, so a bundle that
   imports `compare` from it waited on itself (`unsettled top-level await`, exit 13). Its last block becomes:

   ```js
   if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
     // No top-level await: a bundle imports `compare` from this module, which must finish evaluating first.
     main(process.argv.slice(2)).then((code) => {
       process.exitCode = code;
     }, (error) => {
       console.error(`proofs: ${error instanceof Error ? error.message : String(error)}`);
       process.exitCode = 2;
     });
   }
   ```

   Every bundle imports `compare` statically, `import { compare } from './proofs.mjs';`; the `?as-bundle` form is
   removed. A bundle may import the helpers of `proof-prior-replay.mjs` (`bundleStatus`, `caseStatus`, `openCopy`,
   `moduleOf`, `squareRows`) instead of duplicating them.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/proofs-prior-legacy.test.mjs` | `a dispatched prior that does not reach the record fails` | case records: dispatched `igPrior` 6, stored `igPrior` `null` | `fail`, naming the record |
| same | `an empty replay sample is not measured` | a seed with no accepted puzzle; a 26x26 seed whose accepted puzzles are all `calibration` | `not-measured`; the bundle status `fail` |
| same | `a start count different from the prior fails` | a locate event of 5 clues for `igPrior` 6 and `K` 20 | `fail` |
| same | `legacy differences are reported by path` | two accepted lists differing in the second `clueKey` | `fail`, `accepted.1.clueKey` |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| the rehearsal copies: `node tools\ig-proto\phase2\copies.mjs build --source gen-v4 @flag` and `... build --source today --root Q:\git\pentomino-p2-today` | slot root, unlocked | one line per copy | 3 min |
| locked focused gate: `-NodeArgs @('--test', 'tools/ig-proto/phase2/proofs-prior-legacy.test.mjs')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| locked rehearsal, each of `prior-replay` and `legacy`: `Invoke-IgNode -Repo pentomino -Task 'P2-12e <bundle> quick' -LimitSeconds 300 -QuietSeconds 45 -NodeArgs @('tools\ig-proto\phase2\proofs.mjs', '<bundle>', '--out', 'tests\artifacts\ig-proto\phase2\rehearsal\<bundle>', '--quick')` | §3.3 | exit 0; `result.json` `status: 'pass'` | 300 s each |
| the merge gate's full runs (the orchestrator, on the merged tree; ruling on P2-12e, 2026-11-26): the same command without `--quick` (task `'P2-12e <bundle> full'`), `-LimitSeconds 600` for `prior-replay` and `300` for `legacy` | §3.3 | exit 0; `status: 'pass'`; no case `not-measured`; the helper's node seconds recorded in the execution log as P2-18's expected cost. The seeds are fixed, so this is P2-18's work. A kill or a `not-measured` case stops for a ruling before P2-18 | 600 s; 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** when a rehearsal fails. A prior that does not reach the record or the start, a replay that does
  not match, or a legacy difference is a defect for the pack author.
- **`QUESTION:`** when the copy's pool cannot be wrapped before the client is created.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12e-B01 | Hell 1's per-set prior reaches the search and the record; the legacy routes keep today's puzzles; `gen-v4` records replay | the rehearsals | `tests/artifacts/ig-proto/phase2/rehearsal/<bundle>/result.json` (reported, not committed) |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12e-T01 | R8: dispatched prior, stored prior and the selector's start, end to end on the diagnostic copy | the prior-replay bundle; its tests | rehearsal record; test output |
| P2-12e-T02 | R10 and R11: nonempty replay samples; a 26x26 Nightmare legacy candidate `matched` | the bundles; the tests | rehearsal record; test output |
| P2-12e-T03 | P2-T07 and P2-T08 on real requests | the rehearsals | rehearsal record |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] Two quick rehearsals pass
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- each rehearsal's helper line, status and counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w1, cf24d8529a8e996ac246833e37bb4c4c181c4d29 |
| Start, end, duration | dispatched 2026-11-26 00:52 +07:00 (developer 00:52:47 to 01:11:09; fix round to about 01:28); accepted 01:29 |
| Waiting for rulings | about 9 min (six deviations and the P2-18 cost question, SA-Opus) |
| Agent id, model | 9c46e096-b9bd-471a-9ad9-a1c3f3f389e4, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 58; 7,756,476 / 53,958 / 7,446,528 |
| AI credits | 205.90 |
| Questions and rulings | no QUESTION; six deviations ruled by SA-Opus (pack amendment fe07977, P2-12e and P2-12c task files): 1, the proofs.mjs top-level await deadlocked a bundle importing compare; fixed in proofs.mjs (main(...).then(...)), carried by P2-12e with proofs.mjs added to $Allowed; proof-legacy.mjs uses the plain import; 2, --quick runs recorded in the task text; 3, a Hell 1 seed without a per-set prior is not-measured (task text); 4 to 6 accepted (sentinel-stopped selector-start check; shared helpers importable from proof-prior-replay.mjs; scratch removed). The merge gate runs both bundles in full, locked, without --rehearse-cutover (prior-replay 600 s, legacy 300 s), as P2-18's expected cost |
| Fix rounds | 1 (the proofs.mjs fix and the plain import) |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 5 files); rebased onto 1369fd2 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked every phase-2 test file `IG P2-12e merge exit=0 seconds=64.292 quiet=45`, 153/153 pass, 0 fail/cancelled/todo; G-COPIES 195 and 32 edits (no flag); full bundles on the rebased tree, locked, no flag: `IG P2-12e legacy full exit=0 seconds=60.577 quiet=45` (10/10 cases pass, notMeasured 0, 4 candidates replayed matched) and `IG P2-12e prior-replay full exit=0 seconds=436.855 quiet=45` (6/6 pass, notMeasured 0; 14x14 Hell 1 115.7 and 106.1 s, 20x20 Hell 1 56.6 and 138.9 s, 14x14 Nightmare 11.1 and 7.2 s): P2-18's expected cost, within its 900 s; then 40d7730 (P2-13f task text only) landed, so rebased onto it and re-ran the phase-2 gate `IG P2-12e merge exit=0 seconds=63.075 quiet=45`, 153/153, copies 195 and 32 |
| Commit (slot), commit on `gen-v4` | rebased 86813c6; gen-v4 86813c611982fd5e5dfccce05db43e9677f2f471 |
| Issues and named items | P2-12c's bundles import compare plainly (the proofs.mjs fix); the full run's cost is measured in this merge gate; the 14x14 Hell 1 seed has a heavy tail (frozen runs: 9 of 20 requests cut at 115 s) |

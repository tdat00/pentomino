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
- **Do not change:** anything else, `proofs.mjs` included. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/proof-prior-replay.mjs', 'tools/ig-proto/phase2/proof-legacy.mjs',
    'tools/ig-proto/phase2/proofs-prior-legacy.test.mjs', 'tasks/improve-generating-phase-2/P2-12e-proof-bundles-prior-legacy.md')
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
2. **`proof-legacy.mjs`**, on the copies `p2-gen4` and `p2-today`, each through its own client.
   - **Requests:** `10x10-master`, `26x26-master`, `26x26-nightmare`, and the 10x6 Hard board of
     `tests/fixtures/generation-case.json`; two seeds each, `quantity` 3.
   - **Equal per seed:** the set's pieces, and the ordered `layoutKey`, `clueKey` and score of the accepted puzzles.
     The versions differ (`gen-v4` against `gen-v3`) and are not compared.
   - **Replay (R11).** On the `p2-gen4` copy, `client.replayPuzzle` of the accepted `26x26-nightmare` puzzles with
     `made.kind === 'candidate'` must return `matched`. At least one such puzzle per seed is required; otherwise the
     case is `not-measured`.
3. **`proofs-prior-legacy.test.mjs`:** the synthetic cases below.

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

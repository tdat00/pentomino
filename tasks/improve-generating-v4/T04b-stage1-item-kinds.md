# T04b: Stage-1 item kinds: selection, generation and replay items, with their work ledger

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Observers"; "Parity passes"; "One running version"), §6 ("Replay", "Observers"); decisions D-V4-06, D-V4-14; review RV1-04, RV1-05 (R05), RV1-06, RV2-02, RV2-14 (R2-14), RV2-07 (R2-07, per item), RV4-02, RV5-02 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T04a |
| Depends on | T04a (and T02d's begin lines) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure and filesystem cases, unlocked; the kinds run for real in T04e) |

## Goal

The stage-1 receipt compares each prototype arm's results, skips, total work and recorded detail across observer
modes, and replays its own records. This task writes the three supervised item kinds that produce that evidence, the
work ledger they report (rating work and uniqueness-count work, from the journal, with its completeness), the charge
sequence of the observed modes, the detail counts of recorded ratings, and the pack files of generation items, written
only after a successful batch into a prepared folder.

## Authority and fixed points

- Review R2-14 (accepted): every instrumented observation returns `ratingWork`, `countWork`, `totalWork` and its
  completeness, `totalWork = ratingWork + countWork`; count work is journaled independently of a caller's `charge`
  (T02a's `caps` and `count` lines); a genuinely absent mode installs no caller hook; observed modes return their
  charge sequence; the detail counts are explicit.
- Review R2-07 (accepted) for one item: a ledger is complete only when its journal declares the count capability, the
  call has exactly one start and one matching end, every rating and count line belongs to the call with finite,
  nonnegative values, and the per-call sums reconcile with the end line; unknown work is never zero.
- Review RV2-02 (accepted): a generation item prepares its folders before its pool starts, refuses an existing pack
  for an unstarted item and writes and hashes the pack only after a successful batch.
- `tools/node-worker.mjs` wires the engine task handler to `parentPort` when it is loaded in any worker thread
  (`tools/node-worker.mjs:47-51`), so a lane worker never imports it; it starts it as a nested worker by path.
- T01b's audit stays true for `lib/lane-worker.mjs` and the new `lib/ledger.mjs` and `lib/packs.mjs` (no label read, no
  import from `../../../core/`).

## Scope

- Create: `tools/ig-proto/lib/ledger.mjs` (step 1), `tools/ig-proto/lib/packs.mjs` (step 2).
- Change: `tools/ig-proto/lib/lane-worker.mjs` (the kinds of steps 3 to 5), `tools/ig-proto/self-test.mjs` (two
  `--items` cases), `tools/ig-proto/README.md` (T04a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T04b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/ig-proto/variants tools/ig-proto/plans tools/ig-proto/lib/items.mjs tools/ig-proto/lib/lanes.mjs`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T04b --label frozen`.
1. **`lib/ledger.mjs`** (`// @ts-check`, pure): `export function itemLedger(lines, route)` with `lines` the parsed
   journal lines of one item's `logDir` (every `.jsonl` file, file order then line order) and `route` one of `new`
   (a Nightmare or Hell 1 target in a `v4`-family tree), `legacy` (another target through the journaled route) and
   `legacy-recorded` (another target with a recorder: the frozen search runs without the journal). It returns `{
   complete, ratingWork, countWork, totalWork, calls, problems }`, `totalWork = ratingWork + countWork` when both are
   known, else `null`, and `complete` true only when `problems` is empty. Problems, by route:
   - `new`: not exactly one `start` line; no `end` line with that `call`; no `caps` line with that `call` (`absent
     count capability`); a `p` or `count` line of another `call`; a `tuple[4]`, `tuple[5]` or `units` that is not a
     finite number from 0; `sum of p work <a> differs from end.work <b>`; `sum of counts <a> differs from
     end.locate.countWork <b>` (`end.locate.countWork` absent: `absent count total`); the problems of
     `pairPrimitives` (below) over the call's lines (IG-P-Q37: a real-call check of the proved bounds on every
     stage-1 item); a primitive still pending at the `end` line, whatever the end's `result`: `unfinished primitive
     <call>` (a stage-1 item is never killed).
   - `legacy` and `legacy-recorded` also: a `p` line whose outcome `tuple[2]` is `unsat` or `error`: `unquantified
     <outcome> <call> <index>` (`<index>` its position among the call's `p` lines).
   - `export function pairPrimitives(callLines, call)` (pure; RV4-02; T09c's request ledger uses it too), over one
     call's lines in their order, with at most one primitive pending: a `begin` whose `kind` is not `rate`, `screen`
     or `count`: `invalid begin <call> <index>`; a `begin` whose `bound` is not a finite number from 0: `invalid bound
     <call>`; a `begin` while one is pending: `overlapping begin <call> <index>` (a problem that no later line
     removes; the new `begin` becomes the pending one); a `p` line closes a pending primitive of kind `rate` or
     `screen`, a `count` line one of kind `count`; a `p` or `count` line with no pending primitive of its kind:
     `unpaired <t> line <call>`; a `p` line whose outcome `tuple[2]` is `unsat` or `error` carries zero
     placeholders, not measured units (`recordRating` of `ig-log.js` sets them only for a returned rating or an
     `IncompleteRatingError`): `unquantified <outcome> <call> <index>`; a completed primitive whose units
     (`tuple[4] + tuple[5]`, or `units`) exceed its `bound`: `bound exceeded <call> <index>`. `<index>` is the
     primitive's position among the call's `begin` lines, from 0. Returns `{ problems, lo, open }`: `lo` the sum of
     the completed, quantified primitives' finite units; `open` `{ kind, bound, index }` of the primitive still
     pending after the last line, else `null`.
   - `legacy`: not exactly one `start`; no matching `end`; no `caps` line with `call: null`; a `p` line of another
     call; a value that is not a finite number from 0; `sum of p work <a> differs from end.work <b>`. The count lines
     (`call: null`) are summed; their total is cross-checked through the charged mode (T04c).
   - `legacy-recorded`: `ratingWork` is unknown (`null`, problem `ratings not journaled on the recorded route`); the
     count lines are summed. This route's work evidence is its charged total (T04c).
   - Ruling of 2026-11-17 (the first execution's readings, accepted): the texts of the unspecified problems are
     `expected one start line, found <n>`, `no end line <call>`, `duplicate end <call>`, `invalid work <call>` (once)
     and `foreign <t> line <call>` (on `new` also a `begin` of another call; on the legacy routes a `count` line whose
     `call` is not null); `calls` is the number of `start` lines; a work that cannot be known is `null` (not exactly one
     `start` off the recorded route, no count capability, an invalid value, the recorded route's rating work), while
     known partial sums stay beside `complete: false`; `pairPrimitives` reports `unquantified` only for a `p` line that
     closes a pending primitive (an unpaired one gives `unpaired p line` only).
2. **`lib/packs.mjs`** (`// @ts-check`): `export function preparePackPath(packPath)`: throws
   `Error('unexpected existing pack <path>')` when the file exists, else creates `dirname(packPath)` recursively;
   `export function writePackFile(packPath, pack)`: writes `text = JSON.stringify(pack)`, reads the file back,
   compares its SHA-256 with the SHA-256 of `text` (a difference throws `Error('pack write mismatch')`) and returns that
   hash.
3. **`v4-select`** in `lib/lane-worker.mjs` (payload `{ boardRows, levelId, seedText, mode, logDir, row, route }`,
   `mode` one of `absent`, `charge`, `record`; `route` set by the manifest, T04c): `carved = firstCarvedSet(engine, {
   boardRows, levelId, seedText })` (not `ok`: return `{ outcome: 'no-set', reason: carved.reason }`);
   `postSet(setInfo(carved))`; `mkdirSync(logDir, { recursive: true })`; `process.env.IG_LOG_DIR = logDir`,
   `process.env.IG_ROW = row` (both deleted in a `finally`); the context `{ board: carved.board, pieces:
   carved.set.pieces, layout: carved.set.witness, target: engine.levels.level(levelId), rng:
   engine.rng.createRng(engine.rng.normalizeSeedText(seedText), 'select'), uniqueness: 'require', excludeClueKeys:
   new Set(), ws, igStage: 'set' }`; mode `absent` adds nothing; modes `charge` and `record` add `charge: (u) => {
   chargeUnits.push(u); }`; mode `record` also adds `record: (ev) => { events.push(ev); }`. Then `res =
   engine.clues.selectClues(ctx)`, the ledger `itemLedger(<the logDir's lines>, route)` (`route` `base` gives no
   ledger: `null`), and the detail counts of record mode: `rated` and `rejected` the numbers of events of those kinds,
   `scored = rated + rejected`, `missing` the scored events whose `detail` is `null`, and `rechecked` for the first
   `Math.min(2, scored)` scored events in event order: `clues = event.clueIds.map((id) => carved.set.witness.find((p)
   => p.piece === id))`, `o = engine.difficulty.rateDetailed(carved.board, carved.set.pieces, clues, ws)`, `{ sequence:
   event.sequence, kind: event.kind, equal: isDeepStrictEqual(o.rating, event.rating) && isDeepStrictEqual(o.detail,
   event.detail) }`. Return `{ outcome: 'ok', ok: res.ok, reason: res.ok ? null : res.reason, clues: res.ok ?
   res.clues.length : null, score: res.ok ? res.rating.score : null, skips: res.skips ?? null, igWindow: res.igWindow
   ?? null, digest: <sha256 hex of JSON.stringify(res)>, route, ledger, chargeUnits: <the array, null in absent
   mode>, charges: <its length or null>, units: <its sum or null>, events: <count in record mode, else null>,
   eventsDigest: <record mode: sha256 hex of JSON.stringify(events), else null>, eventKinds: <sorted distinct kinds or
   null>, eventPhases: <sorted distinct phases present or null>, maxSequence: <largest sequence or null>, detail:
   <record mode: { rated, rejected, scored, missing, rechecked }, else null>, ms }`.
4. **`v4-generate`** (payload `{ boardRows, rotation, levelId, seedText, uniqueness, maxActive, quantity, packPath,
   logDir, row }`): before the pool starts, `mkdirSync(logDir, { recursive: true })` and `preparePackPath(packPath)`
   (an existing pack makes the item an `error`); `createPool` and `createGenerationClient` imported by file URL from
   the tree's `core/browser/worker-pool.js` and `core/browser/generation-client.js`; `process.env.IG_LOG_DIR`/`IG_ROW`
   set as in step 3 before the pool is created (nested workers copy the environment) and deleted in the `finally` that
   also calls `pool.close()`; the pool `createPool({ size: 1, workerFactory: () => adaptWorker(new Worker(join(
   workerData.treeRoot, 'tools', 'node-worker.mjs'))) })` where `adaptWorker` is a private copy of `adaptNodeWorker`
   (`tools/node-worker.mjs:19-36`); `client = createGenerationClient(pool, { createdAt: () =>
   '2026-01-01T00:00:00.000Z' })`. `set = await client.generateSet({ boardRows, rotation, levelId, seedText,
   uniqueness, maxActive })`; `set.status !== 'complete'`: return `{ outcome: 'no-set', setStatus: set.status,
   reason: set.reason ?? null }`. Batch 1 exactly as `generateReplaySeed` builds it (`tools/record-fixtures.mjs:
   423-434`, with `quantity` from the payload): `b1`; `b1.pack === undefined`: return `{ outcome: 'no-pack',
   batchStatus: b1.status, reason: b1.reason ?? null }`; else `packSha256 = writePackFile(packPath, b1.pack)` and
   return `{ outcome: 'ok', batchStatus: b1.status, reason: b1.reason ?? null, puzzles: b1.accepted.length, made:
   b1.accepted.map((p) => b1.made[p.id]?.kind ?? null), packSha256 }`.
5. **`v4-replay`** (payload `{ packPath, puzzleIndex }`): the tree's `core/engine/pack.js` and
   `core/engine/replay.js` imported by file URL; one scratch workspace (`engine.workspace.createWorkspace(
   engine.workspace.SCRATCH_WORKSPACE_BYTES)`), created at the first replay. No pack file: return `{ outcome:
   'no-record', reason: 'no pack' }`; the text's SHA-256 is `packSha256`; `validatePack(JSON.parse(text))` not `ok`:
   throw `Error('the pack is not valid')`; no puzzle at `puzzleIndex`: return `{ outcome: 'no-record', reason: 'no
   puzzle', packSha256 }`; else `input = { set: <setOfPack as tests/replay.test.js:38-46 with
   engine.board.boardFromRows>, puzzle, generation: pack.generation }`, `r = replayPuzzle(input, { ws, scratch },
   engine.policy.REPLAY)`; return `{ outcome: 'ok', kind: pack.generation.made?.[puzzle.id]?.kind ?? null, status:
   r.status, reason: r.reason, stages: r.stages, work: r.work, steps: r.steps.length, bytes:
   replay.utf8Length(JSON.stringify(r.steps)), detailStep: r.steps.at(-1)?.args?.detailStep ?? null, packSha256,
   ms }`.
6. **Self-test** cases appended to `--items` (Tests table).
7. **README.md**: T04a's section gains the three kinds, the result fields, the ledger rules of step 1 and the pack
   rule of step 2.

## Tests

All in `tools/ig-proto/self-test.mjs --items`; they run no rating, generation or replay.

| Case name | Input | Expected |
|---|---|---|
| `items: pack files (filesystem only)` | `path` = `<artifactDir('selftest', 'items-packs')>/raw/packs/p.pack.json` in a fresh folder; `preparePackPath(path)`; `writePackFile(path, FIXTURE.packs[0])` (`tests/fixtures/replay-case.json`); then `preparePackPath(path)` again | the nested `packs` folder is created; the returned hash equals the SHA-256 of `JSON.stringify(FIXTURE.packs[0])`; `JSON.parse` of the file deep-equals the pack; the second call throws `unexpected existing pack` |
| `items: item ledger` | `itemLedger` on synthetic lines: (a) `new`: `start` (call `c`), `caps` (`c`), then `begin` (kind `rate`, bound 10) and a `p` line of work 3 (`tuple[4]` 3, `tuple[5]` 0), `begin` (`screen`, 10) and a `p` of 4, `begin` (`count`, 10) and a `count` of 5, `begin` (`count`, 10) and a `count` of 0, `end` with `work: 7` and `locate.countWork: 5`; (b) the same without `end`; (c) without `caps`; (d) with a `count` of -1; (e) with `end.work` 8; (f) `new` with no `count` line, no `count` begin and `locate.countWork: 0`; (g) `legacy`: `caps` (`null`), `start`, `p` of 2, `count` (`null`) of 6, `end` with `work: 2`; (h) `legacy-recorded`: `caps` (`null`), `count` (`null`) of 6; (i) (a) with the first begin's `bound` 2; (j) (a) without its first `begin`; (k) (a) with a `begin` (`rate`, 10) right before `end`; (l) (a) with the first begin's `bound` `null`; (m) (a) with a second `begin` (`rate`, 10) right after the first; (n) (a) with the first `p` line's outcome `error` and its `tuple[4]` 0; (o) (a) with `end.result` `'error'` and a `begin` (`count`, 10) right before `end`; (p) (g) with its `p` line's outcome `unsat` | (a) complete, `ratingWork` 7, `countWork` 5, `totalWork` 12; (b) to (e) not complete, each naming its problem; (f) complete, `countWork` 0, `totalWork` 7; (g) complete, `countWork` 6, `totalWork` 8; (h) not complete, `ratingWork` null, `countWork` 6, `totalWork` null; (i) not complete, `bound exceeded c 0` (the first `begin`, index 0); (j) not complete, `unpaired p line c`; (k) not complete, `unfinished primitive c`; (l) not complete, `invalid bound c`; (m) not complete, `overlapping begin c 1`; (n) not complete, the problems include `unquantified error c 0`; (o) not complete, `unfinished primitive c`; (p) not complete, a problem starting `unquantified unsat` |

## Documentation

`tools/ig-proto/README.md` (step 7).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T04b` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T04b` | root | the ten `--frozen` cases pass (T01b's audit covers `lib/lane-worker.mjs`) | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T04b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing `lib/items.mjs`, `lib/lanes.mjs`, a variant or a production file.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04b-B01 | Every stage-1 observation reports its total work with its completeness, its charge sequence and the detail counts of its recorded ratings; unknown work is never zero | case 2; the result shape of step 3 | self-test output; diff |
| T04b-B02 | A generation item never overwrites a pack and writes one only after a successful batch | case 1; step 4 | self-test output; diff |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04b-T01 | The ledger rules of step 1, explicit zero count included | case 2 | self-test output |
| T04b-T02 | The pack folder is prepared and the written pack hashed | case 1 | self-test output |
| T04b-T03 | The lane worker reads no label and never imports `tools/node-worker.mjs`; absent mode installs no caller hook | code review; T01b's audit case | diff; self-test output |
| T04b-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-17 07:10:13 +07:00 (dispatch, base `5158729`) to 07:32:29 +07:00 (acceptance): 22 min 16 s; the developer's own times 07:10:34-07:25:37 |
| Waiting for rulings | about 7 min (07:25:37 report to 07:32 ruling); no developer wait (no fix round) |
| Agent id, model | `4868875b-b9ce-4f2b-9760-8b7af9e4fdb3`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 57 calls; 9,786,442 input, 91,360 output, 9,550,128 cache-read |
| AI credits | 245.93 |
| Questions and rulings | No `QUESTION:`. The developer's eight readings (problem texts, unknown work `null`, extra `foreign` strictness, `unquantified` only for paired `p` lines, worker details, case inputs, cited lines), three named items and three gaps were relayed to the pack author; all accepted (07:32); the `maxSequence` check (record row only) and the worker-module audit of `ledger.mjs` and `packs.mjs` moved to T04c; T09c rule 6 names the unpaired case; pack amendment `c0195e8` |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `--items`: 9 passed, 0 failed; `--frozen`: 10 passed; `check-edits`: 18 `ok`; firewall `check`: 289 production files unchanged; the guard `git status -- core generator tests tools/ig-proto/variants tools/ig-proto/plans tools/ig-proto/lib/items.mjs tools/ig-proto/lib/lanes.mjs`: no output; `npm run check`: OK. The developer also ran three small locked smokes (legacy 6x10 hard; new route 10x10 Nightmare, node 43 s; generate then replay): equal digests across modes, complete ledgers, `charge.units` equal to the ledger's total work, replays `matched` |
| Commit | this task's commit, `improve-generating T04b: Stage-1 item kinds: selection, generation and replay items, with their work ledger` |
| Issues and named items | None new. For T04e: a parity call took 43 s on the 10x10 Nightmare smoke, under the 120 s `v4-select` reserve; a censored parity item would make stage 1 incomplete and stop for a ruling, by design |

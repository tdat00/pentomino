# T04a: Bounded, identity-checked measurement items: the runner

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stage 1 "Preparation"; "Parity passes"), §5.2 (the protocol of bounded invocations); decisions D-V4-02, D-V4-14; review RV1-05 (R05), RV1-20, RV2-01 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T03 |
| Depends on | T03 (serial order; it uses T01a's frozen label) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (synthetic worker cases only; they run unlocked) |

## Goal

Every later measurement of the frozen round (stage-1 parity and replay, the per-set prior check, the kernel and pool
probes) runs as a list of items. This task writes the runner they share and the item log every runner writes: each
item has a stable id, runs in a supervised worker that the parent cuts before the lock helper's 300-second limit, is
journaled before it starts and when it ends, with the run's identity on every line, and is never rerun once it has
ended; a resumed step refuses to continue on another source, tree, harness or item list, and stops on an item that
started but never ended. The stage-1 item kinds are T04b's. Nothing is measured here.

## Authority and fixed points

- Review R05 (accepted): stable item ids; state identity (`frozenCommit`, source digest, tree ids, harness hash, item
  manifest hash) compared before resuming; `item-start` before dispatch and one terminal `item-end` (`completed`,
  `censored` or `error`); a started item without an end is interrupted evidence that needs a ruling; ended items are
  never rerun; real work runs in supervised workers (`lib/lanes.mjs`, `lib/lane-worker.mjs`) with a stated
  admission reserve per kind and a cut no later than `horizonS - 15`; the 300-second helper limit is not raised.
- Review RV2-01 (accepted): every log line, terminal lines included, carries the same immutable `identityHash` as its
  start; no reader accepts an unbound terminal line. Every item-log writer of the pack (this runner, T10b's process
  items, T10c's custom items) writes the line shapes of step 1 through the helpers of step 1.
- The existing lane kinds keep their rules (`lib/lanes.mjs:1-6`: `rate` admitted when `e + 30 <= H`, cut after 30 s as
  a defect; `call` admitted when `e + 120 <= H - 15`, cut at `H - 15` as `censored`); the IGP plans that use them do
  not change.
- `run-task.ps1` (unchanged) reads a step's `state.json`: `done`, `lastInvocation.start`, `lastInvocation.seconds` and
  the sum of `lastInvocation.progress` values (0 stops the plan with exit 4); a non-zero node exit makes the lock helper
  throw and the plan stop with exit 1 (`run-task.ps1:126-160`).
- T01b's audit stays true: `lib/lane-worker.mjs` reads no label (`SOURCE_KIND`, `sourceRoot(`) and imports nothing from
  `../../../core/`.

## Scope

- Create: `tools/ig-proto/lib/items.mjs` (step 1).
- Change: `tools/ig-proto/lib/lanes.mjs` (step 2), `tools/ig-proto/lib/lane-worker.mjs` (the test kinds, step 3),
  `tools/ig-proto/self-test.mjs` (a group `--items`, step 4), `tools/ig-proto/README.md` (step 5).
- Do not change: everything else, `run-task.ps1` and the plans included. Guards:
  `node tools\ig-proto\firewall.mjs check --task V4-T04a --label frozen`, expected `files unchanged`;
  `git status --short -- core generator tests tools/ig-proto/variants tools/ig-proto/plans tools/ig-proto/run-task.ps1`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T04a --label frozen`.
1. **`lib/items.mjs`** (`// @ts-check`; header comment naming this task and reviews R05 and RV2-01). Imports:
   `appendFileSync`, `existsSync`, `mkdirSync`, `readFileSync` from `node:fs`; `join` from `node:path`; `createLanes`
   from `./lanes.mjs`; `artifactDir`, `elapsedS`, `FROZEN_COMMIT` from `./paths.mjs`; `harnessInfo`, `sha256`,
   `sourceDigest`, `writeJson` from `./records.mjs`; `ensureTree` from `./tree.mjs`. Exports:
   - `export const ITEM_LANES = Object.freeze({ 'v4-select': 2, 'v4-generate': 1, 'v4-replay': 2 });` (lanes per
     group; any other kind, the test kinds included, 1).
   - `@typedef {{ id: string, kind: string, variant: string, payload: Record<string, unknown> }} Item`.
   - `export function manifestHash(items)`: `sha256(JSON.stringify(items.map((i) => [i.id, i.kind, i.variant,
     i.payload])))`.
   - `export async function itemIdentity(items)`: `{ frozenCommit: FROZEN_COMMIT, sourceDigest: await sourceDigest(),
     treeIds: <an object whose keys are the distinct variants of the items in sorted order, each with the value
     (await ensureTree(v)).treeId>, harnessHash: harnessInfo().harnessHash, manifestHash: manifestHash(items) }`.
   - `export const identityHash = (identity) => sha256(JSON.stringify(identity));`
   - The line helpers, the only way any runner writes an item log (`at` is ISO text; each is one `appendFileSync` of
     `JSON.stringify(line) + '\n'`):
     `export function logStart(path, hash, item)` writes `{ type: 'item-start', identityHash: hash, item: item.id,
     kind: item.kind, variant: item.variant, at }`; `export function logSpawn(path, hash, itemId, pid)` writes `{
     type: 'item-spawn', identityHash: hash, item: itemId, pid, at }`; `export function logEnd(path, hash, itemId,
     status, result, ms)` writes `{ type: 'item-end', identityHash: hash, item: itemId, status, result, ms, at }`.
   - `export function readItemLog(path)`: `[]` when the file is absent, else one parsed object per non-empty line; a
     line that does not parse throws `Error('items: malformed log line <n>')`.
   - `export function resumePlan(items, lines, identity, stateIdentity)` (pure). Returns `{ refuse: <reason> }` at the
     first rule that fails, in this order, else `{ pending, ended }`:
     1. two items with one id: `duplicate item id <id>`;
     2. `stateIdentity` not null and a field of `identity` differs: `identity mismatch (<first differing field in the
        order frozenCommit, sourceDigest, treeIds, harnessHash, manifestHash>)`;
     3. a line whose `identityHash` is absent or differs from `identityHash(identity)`: `identity mismatch (log line
        <n>)`;
     4. a line whose `type` is not `item-start`, `item-spawn` or `item-end`: `unknown log line <n>`; a line whose
        `item` is not an item id: `unknown item <id>`;
     5. a second `item-start`, a second `item-spawn` or a second `item-end` for one item: `duplicate log entry for
        <id>`;
     6. an `item-spawn` or `item-end` without an earlier `item-start`, or an `item-spawn` after the item's
        `item-end`: `out-of-order log entry for <id>`;
     7. an `item-start` without an `item-end`: `interrupted item <id> needs a ruling`.
     `pending` = the items without an `item-end`, in item order; `ended` = the number of items with one.
   - `export async function runItems(o)` with `o = { task, step, label, horizonS, items, limits?, testKinds?,
     identity? }` (`identity` replaces `itemIdentity(items)` in the self-test only). Returns `{ exitCode, done,
     progress, refused }`:
     1. `dir = artifactDir(label, task, step)` (created); `logPath = join(dir, 'items.jsonl')`; `statePath =
        join(dir, 'state.json')`; `startedAt` = the process start as ISO text (as `self-test.mjs:962`).
     2. `identity = o.identity ?? await itemIdentity(items)`, `hash = identityHash(identity)`; the earlier state's
        `identity` (or null when there is no state file); `plan = resumePlan(items, readItemLog(logPath), identity,
        earlier)`. On `refuse`: write `items: STOP: <reason>` to stderr, write nothing, return `{ exitCode: 3, done:
        false, progress: 0, refused }`.
     3. Groups: the pending items cut into runs of consecutive items with the same `variant` and `kind`. For each group
        in order: if its first item would not be admitted now (the admission rule of step 2 for its kind), stop;
        else `lanes = await createLanes({ variant, size: ITEM_LANES[kind] ?? 1, horizonS, limits, testKinds })`,
        `await lanes.runAll(jobs, { onStart, onEnd })` with `jobs = group.map((i) => ({ kind: i.kind, ...i.payload
        }))`, then `await lanes.close()`; stop after a group in which a job was not admitted or an item ended
        `censored` (the horizon is reached). `onStart(j)` calls `logStart(logPath, hash, item)`; `onEnd(j, result)`
        calls `logEnd(logPath, hash, item.id, status, result, ms)` with `status` `censored` for the outcome
        `censored`, `error` for `error` and `defect`, else `completed`, and `ms` from the job's start.
     4. State (always written after step 3): `{ format: 'ig-proto-state', version: 1, task, step, label, identity,
        done: <every item has an item-end>, items: { done: <items with an item-end>, total: items.length },
        lastInvocation: { start: startedAt, end: <ISO>, seconds: <elapsedS() rounded to 0.001>, horizonS, progress:
        { items: <item-end lines written by this invocation>, verified: <1 when no item was pending at step 2, else
        0> } } }`. Return `{ exitCode: 0, done, progress: items + verified, refused: null }`.
2. **`lib/lanes.mjs`**:
   - `DEFAULT_LIMITS` gains `itemReserveS: Object.freeze({ 'v4-select': 120, 'v4-generate': 245, 'v4-replay': 120 })`
     and the header comment the line "a v4 item kind starts only when e + reserve(kind) <= H - 15 s and is cut at H -
     15 s, recorded `censored` (reserves: v4-select 120 s, v4-generate 245 s, v4-replay 120 s)".
   - In `runAll`: `const isItem = (kind) => Object.hasOwn(lim.itemReserveS, kind);`; admission `job.kind === 'rate' ?
     ... : isItem(job.kind) ? e + lim.itemReserveS[job.kind] <= horizon - lim.callCutMarginS : isCall(job.kind) ?
     ... : true`; the supervisor's cut branch tests `(isCall(entry.kind) || isItem(entry.kind)) && e >= horizon -
     lim.callCutMarginS` (the censored value is unchanged).
   - `runAll(jobs, hooks = {})`: `hooks.onStart?.(next)` right before `postMessage`; `hooks.onEnd?.(index, value)`
     right after `results[index] = value` in `settle`. Without hooks the behaviour is today's.
   - `limits.itemReserveS` given by a caller replaces the whole table (the self-test passes small values).
3. **`lib/lane-worker.mjs`**: test kinds, only with `workerData.testKinds === true`: `test-ok` returns `{ outcome:
   'ok', echo: p.echo }`; `test-throw` throws `Error('test-throw')`; `test-hold` is unchanged.
4. **Self-test** group `--items` (switch added to `parseArgs`; with it only `itemCases` runs; default task
   `V4-T04a`). The cases call `runItems` with `label: 'selftest'`, `task: 'items-<case number>'`, items of the variant
   `base`, `testKinds: true`, `identity: ID` (`ID = { frozenCommit: 'c', sourceDigest: 'd', treeIds: { base: 't' },
   harnessHash: 'h', manifestHash: manifestHash(items) }`) and delete their artifact folder first. Cases in the
   Tests table.
5. **README.md**: a section "## Bounded measurement items (task pack v4)": the item fields, the three log line
   shapes, the state, the resume rules (step 1, in order), the reserve and cut table below, the exit code 3 and that a
   refused or interrupted step needs a ruling (never a rerun).

   | Kind | Admitted when (e: elapsed s, H: horizon) | Cut | Lanes |
   |---|---|---|---|
   | `v4-select` | e + 120 <= H - 15 | at H - 15, `censored` | 2 |
   | `v4-generate` | e + 245 <= H - 15 | at H - 15, `censored` | 1 (its pool has 1 worker) |
   | `v4-replay` | e + 120 <= H - 15 | at H - 15, `censored` | 2 |

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --items` | `items: completion and verification resume` | items `t1`, `t2` of kind `test-ok` (payload `{ echo: 1 }`, `{ echo: 2 }`), `horizonS` 285; run twice | first run: `exitCode` 0, `done` true, `progress` 2; the log lines are, in order, start `t1`, end `t1`, start `t2`, end `t2`, every line with `identityHash` equal to `identityHash(ID)`, both ends `completed` with `result.echo` 1 and 2; `resumePlan` on that log gives `{ pending: [], ended: 2 }`; the second run: `exitCode` 0, `done` true, `progress` 1 (`verified` 1), the log byte-equal to after the first run (no redispatch) |
| same | `items: worker error` | item `t1` of kind `test-throw` | `exitCode` 0, `done` true; the end line has `status: 'error'`, the run's `identityHash` and `result.message` containing `test-throw` |
| same | `items: parent cut` | items `h1` (`test-hold`, payload `{ profiles: 0 }`) and `t2` (`test-ok`), `horizonS = elapsedS() + 3`, `limits: { callMinRemainS: 0, callCutMarginS: 1 }` | the call returns within 10 s; `h1` ends `censored`; `t2` has no line; `done` false; `progress` 1 |
| same | `items: identity mismatch` | case 1's items run once in this case's folder, then again with `ID.harnessHash` changed to `'h2'` | the second run: `exitCode` 3, `refused` `identity mismatch (harnessHash)`; the log and the state files are byte-equal to after the first run |
| same | `items: interrupted start refused` | a log written with `logStart` only for `t1` | `exitCode` 3, `refused` `interrupted item t1 needs a ruling`; the log is unchanged |
| same | `items: resume rules (pure)` | `resumePlan` on: duplicate item ids; an end line without `identityHash`; a line of an unknown item; two `item-end` lines of one item; an end without a start; a spawn after the end; a log with start, spawn and end of `t1` and nothing of `t2` | the reasons of rules 1, 3, 4, 5, 6 and 6 in that order; `{ pending: [t2], ended: 1 }` |

## Documentation

`tools/ig-proto/README.md` (step 5).

## Commands and gates

The `--items` cases run only test kinds (no rating, generation, uniqueness count or replay), so they run unlocked
(check-list §3.2).

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T04a` | root | six cases pass, exit 0 | 3 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T04a` | root | the ten `--frozen` cases pass | 2 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T04a verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--task', 'V4-T04a-lanes', '--only', '1,7')` (check-list §3.2; default cases 1 `paths and fingerprint guard` and 7 `lanes: order, supervisor, admission`, which runs real `rate` jobs) | root | two cases pass, exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\firewall.mjs check --task V4-T04a --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing `run-task.ps1`, a plan, a variant or a production file.
- `QUESTION:` when an existing lane case fails after step 2; when the supervisor cannot cut a held item within 10 s.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04a-B01 | No stage-1 or later measurement can be rerun silently, mixed across sources or trees, or outlive the lock helper's limit, and a finished step resumes as a pure verification | cases 1 to 6 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T04a-T01 | Start before dispatch, one terminal end, every line bound to the run's identity, never rerun; the state's fields as step 1.4 | cases 1, 2 | self-test output |
| T04a-T02 | The parent cuts at `H - 15` and records `censored` | case 3 | self-test output |
| T04a-T03 | Identity mismatch and interrupted starts refuse without writing | cases 4, 5 | self-test output |
| T04a-T04 | The resume rules in their order, `item-spawn` included | case 6 | self-test output |
| T04a-T05 | Existing lane kinds unchanged | the lane cases of the default group | helper output |
| T04a-T06 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |

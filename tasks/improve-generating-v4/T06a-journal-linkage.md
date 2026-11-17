# T06a: Journal linkage of the batch and accept timelines

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P5 ("What the budget arm is (IG-P-Q22)": "The journals first get the dispatch, selection, completion, consumption and discard linkage they lack"; IG-P-D1 conditions 1 to 4), §5.1 stage 2 ("the journal linkage"); decision D-V4-08; review RV1-01, RV1-22, RV2-17, RV3-07 (the timeline's link input) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T05 |
| Depends on | T05 |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 4 min allocated (guard 300 s) |

## Goal

P5's budget arm and the one-deadline reserve can only be judged if the journals show, for every candidate task of a
batch, when it was dispatched, when the fold awaited it, when it completed, whether it was consumed or discarded, and
when each accepted puzzle reached the caller. This task adds that linkage as a composable variant `link`, the accept
timeline to the run records, and a report that shows idle workers behind an awaited call. T06b adds to the same
variant what the work ledger (T09c) needs to close every selection call of a request. The plan and the evidence of
this task keep the name `V4-T06`.

## Authority and fixed points

- Plan §3 P5 (IG-P-Q22) and IG-P-D1 (conditions 2 and 4: a clock stop changes how many puzzles a response holds,
  never which; lost completions are counted against the uncapped search); check-list D-V4-08 (these timelines feed
  the post-hoc deadline projection of T09d, a labelled projection that is not a deadline gate; the live deadline is
  N-V4-13's).
- The linkage observes; it changes no dispatch, fold or result. The `link` variant composes after `log` like `p6`
  does (`extends: ["log"]`); its anchors are lines that the `v4-ps` edits do not touch.

## Scope

- Create: `tools/ig-proto/variants/link.json`, `log-link.json`, `v4-link.json`, `v4-ps-link.json`;
  `tools/ig-proto/variants/files/link/core/browser/ig-link.js`; `tools/ig-proto/linkage.mjs`;
  `tools/ig-proto/plans/V4-T06.json`.
- Change: `tools/ig-proto/self-test.mjs` (`--items` cases), `tools/ig-proto/README.md` (a section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T06 --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench`, expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T06 --label frozen`.
1. **`ig-link.js`** (`// @ts-check`, header comment naming this task; copy-only):

   ```js
   import { appendFileSync } from 'node:fs';

   let batch = 0;
   let lastAwait = '';
   /** @type {Set<string>} */
   const consumed = new Set();
   const now = () => performance.timeOrigin + performance.now();

   /** @param {object} line */
   function write(line) {
     const env = globalThis.process?.env;
     if (env?.IG_LOG_DIR === undefined) {
       return;
     }
     appendFileSync(`${env.IG_LOG_DIR}/${env.IG_ROW ?? 'unrowed'}.link.jsonl`, `${JSON.stringify(line)}\n`);
   }

   /** @param {string} batchSeed @param {number} quantity */
   export function igLinkStart(batchSeed, quantity) {
     batch += 1;
     lastAwait = '';
     consumed.clear();
     write({ t: 'link', ev: 'start', batch, batchSeed, quantity, at: now() });
   }

   /** @param {string} ev @param {Record<string, unknown>} data */
   export function igLink(ev, data) {
     if (ev === 'await') {
       const k = `${data.slot}/${data.attempt}`;
       if (k === lastAwait) {
         return;
       }
       lastAwait = k;
     }
     if (ev === 'consume') {
       consumed.add(`${data.slot}/${data.attempt}`);
     }
     write({ t: 'link', ev, batch, ...data, at: now() });
   }

   /** @param {Map<string, { done: boolean }>} cache @param {string} status @param {string | undefined} reason @param {number} accepted */
   export function igLinkEnd(cache, status, reason, accepted) {
     for (const [k, entry] of cache) {
       if (!consumed.has(k)) {
         const [slot, attempt] = k.split('/').map(Number);
         write({ t: 'link', ev: 'discard', batch, slot, attempt, done: entry.done, at: now() });
       }
     }
     write({ t: 'link', ev: 'end', batch, status, reason: reason ?? null, accepted, at: now() });
   }
   ```

2. **`variants/link.json`**: `"id": "link"`, `"extends": ["log"]`, `"description"`: "Batch linkage journal (V4-T06,
   plan P5 IG-P-Q22): dispatch, await, completion, consumption and discard of every candidate task, and the accept
   timeline in the run records. Composed after log; it changes no result.", `"files": ["link"]`, `"params": {
   "link": true }`, and the edits:

   | Id | File | Find | Replace |
   |---|---|---|---|
   | `link-1` | `core/engine/generate.js` | `    igStage: 'batch',\n` | the same line, then the line `    igAttempt: <the template literal of slot and attempt>,` (JSON below) |
   | `link-2` | `core/browser/generation-client.js` | append | `\n// ig-proto, variant link (V4-T06): the batch linkage journal.\nimport { igLink, igLinkEnd, igLinkStart } from './ig-link.js';\n` |
   | `link-3` | `core/browser/generation-client.js` | `      cache.set(key(slot, attempt), entry);\n      inflight += 1;\n` | the same, then `      igLink('dispatch', { slot, attempt, inflight });\n` |
   | `link-4` | `core/browser/generation-client.js` | `        Object.assign(entry, { done: true, ok: true, value });\n        inflight -= 1;\n` | the same, then `        igLink('complete', { slot, attempt, ok: true, inflight, outcome: isObject(value) && typeof value.fail === 'string' ? value.fail : 'candidate' });\n` |
   | `link-5` | `core/browser/generation-client.js` | `        Object.assign(entry, { done: true, ok: false, error });\n        inflight -= 1;\n` | the same, then `        igLink('complete', { slot, attempt, ok: false, inflight, outcome: 'error' });\n` |
   | `link-6` | `core/browser/generation-client.js` | `        const awaited = foldNext(state);\n` | the same, then `        igLink('await', awaited === null ? { slot: null, attempt: null } : { slot: awaited.slot, attempt: awaited.attempt });\n` |
   | `link-7` | `core/browser/generation-client.js` | `        progress({ slot: awaited.slot, attempt: awaited.attempt });\n` | `        igLink('consume', { slot: awaited.slot, attempt: awaited.attempt, result: state.accepted.length > before ? 'accepted' : 'fail' in outcome ? outcome.fail : 'rejected', accepted: state.accepted.length });\n` then the found line |
   | `link-8` | `core/browser/generation-client.js` | `      for (const calibration of state.accepted) {\n        accept(calibration);\n      }\n` | `      igLinkStart(batchSeed, quantity);\n      for (const calibration of state.accepted) {\n        accept(calibration);\n        igLink('calibration', { accepted: accepted.length });\n      }\n` |
   | `link-9` | `core/browser/generation-client.js` | `      throw toFault(e, detail());\n    } finally {\n      controller.abort();\n      finish(job);\n    }\n` | `      throw toFault(e, detail());\n    } finally {\n      controller.abort();\n      igLinkEnd(cache, status, reason, accepted.length);\n      finish(job);\n    }\n` |
   | `link-10` | `tools/bench/runner.js` | `  run.responseMs = s.tDone - s.t0;\n` | the same, then `  run.igSetMs = s.set?.status === 'complete' ? s.tSet - s.t0 : null;\n  run.igAcceptedMs = kept.map((v) => s.acceptedAt[v.index] - s.t0);\n` |

   The manifest entry of `link-1` is exactly:

   ```json
   { "id": "link-1", "file": "core/engine/generate.js", "find": "    igStage: 'batch',\n",
     "replace": "    igStage: 'batch',\n    igAttempt: `${slot}/${attempt}`,\n" }
   ```

   The batch call's journal `start` line then carries `attempt: "<slot>/<attempt>"` (it is `null` for batch calls
   today). If a `find` of the table is not unique or not found, stop with `QUESTION:` (the pack author checked each
   at the base). `link-10` writes the two timeline fields on every run record, outside the block that needs a set
   (`runner.js:704`): a run without a set has `igSetMs: null` and `igAcceptedMs: []`; a run record without the fields
   is uninstrumented (an older arm), never a measured failure.
3. **Composed variants** (each `"edits": []`, `"files": []`, `"params": {}`, a one-line description):
   `log-link.json` `"extends": ["log", "link"]`; `v4-link.json` `"extends": ["v4", "link"]`; `v4-ps-link.json`
   `"extends": ["v4-ps", "link"]`.
4. **`linkage.mjs`** (`node tools\ig-proto\linkage.mjs report --task <T> --arms <a,b> --pool <n> --label frozen
   --source-label <SL>`): for each arm, every `*.link.jsonl` under `artifactDir(label, task, arm)/<shard>/logs/`, and
   the arm's published rows (`evidence/<label>/<task>/<arm>/*.runs.json`). Export `export function linkSummary(lines,
   pool)` returning, per batch, `{ dispatched, completed, consumed: { accepted, rejected, fail: { <reason>: n } },
   discarded: { done, inflight }, awaits, awaitMs, idleWorkerMs, problems: [] }` (ruling of 2026-11-17: one object
   whose fields are the totals over the lines' batches, equal to the batch's for a single batch, with `batches`, the
   same object for each batch apart). An await period runs from an
   `await` line to the first of the `consume` line of the same slot and attempt and the batch's `end` line (a
   discard or an abort does not end it; the wait counts up to the end); `awaitMs` is the total of the periods;
   `idleWorkerMs` is the sum over the periods of `(pool - inflight) x dt`, `inflight` stepping at every `dispatch` and
   `complete` line up to the period's end (a `complete` line after the batch's `end` is ignored for the integration);
   `problems` lists a consumed task that was never dispatched or completed, a dispatched task with neither `complete`
   nor `discard`, and a batch without `end`. The report `evidence/frozen/<task>/linkage.json|md` (meta block; one row
   per run: arm, row, the summary, `igSetMs`, `igAcceptedMs`, and `attemptsMatched`: every worker journal `start`
   line of stage `batch` in that row has an `attempt` string that was dispatched) and the verdict `linkage: pass`
   when no batch has a problem, every run's timeline is valid by `timelineProblem(run, linkLines)` (with the row's own
   link lines) and `attemptsMatched` holds;
   `linkage: incomplete <rows>` when a run lacks a timeline field; else `linkage: fail <reasons>`. The export
   `timelineProblem(run, linkLines)` (RV2-17, RV3-07) returns `null`, `'incomplete'` or a reason, by outcome, reading
   the row's link lines for its batch: a missing `igSetMs` or
   `igAcceptedMs` field, or a `responseMs` that is not a finite number from 0: `'incomplete'` (never a fabricated
   zero); no set (`igSetMs === null`): valid when `igAcceptedMs` is empty, `acceptedCount === 0` and `linkLines` has no
   `start` line (no batch ran); a set and no acceptance: valid when `igSetMs` is a finite number from 0,
   `igAcceptedMs` is empty and `acceptedCount === 0`; with acceptances: `igSetMs` a finite number with `igSetMs <=
   igAcceptedMs[0]`, `igAcceptedMs.length === acceptedCount`, the list non-decreasing and every value at most
   `responseMs`.
5. **Plan** `plans/V4-T06.json`: `"allocationMinutes": 4`; steps `firewall-snapshot`, `trees` (`build log-link
   v4-link v4-ps-link`), `arm-log-link` (locked, `repeatUntilDone` true, `projectS` 60, `minHorizonS` 110,
   `invocations` 1, `tools\ig-proto\arm.mjs run --task V4-T06 --arm log-link --shard s1 --variant log-link --workers
   4 --cases 26x26-nightmare:0-1 --row-limit-s 90`, state `V4-T06\log-link\s1\state.json`), `arm-v4-link` (the same
   with `v4-link`, `projectS` 40), `publish-log-link`, `publish-v4-link`, `report` (`tools\ig-proto\linkage.mjs report
   --task V4-T06 --arms log-link,v4-link --pool 4`), `firewall-check`.
6. **Self-test** cases of the Tests table, appended to the `--items` group (pure).
7. **README.md**: a section "## Batch linkage (V4-T06)": the events, the file name, the variants, the report and its
   verdict.
8. Run the plan with the stage-1 allowance, in one PowerShell session at the root:

   ```powershell
   $lock = 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T06.json -Label frozen -SourceLabel 'frozen 3fc65f4' -LockHelper $lock -ApprovedRoundMinutes <approved>
   if ($LASTEXITCODE -ne 0) { throw ('STOP: V4-T06 run-task exited ' + $LASTEXITCODE) }
   ```

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --items` | `link: summary of a synthetic batch` | `linkSummary(lines, 4)` on: `start`; `dispatch` 1/0 (inflight 1) at 0, `dispatch` 1/1 (inflight 2) at 0, `await` 1/0 at 1, `complete` 1/1 (inflight 1) at 10, `complete` 1/0 (inflight 0, outcome `candidate`) at 30, `consume` 1/0 `accepted` at 31, `discard` 1/1 (`done` true) at 32, `end` at 32 (times are the lines' `at`, in ms) | `dispatched` 2; `completed` 2; `consumed.accepted` 1; `discarded` `{ done: 1, inflight: 0 }`; `awaits` 1; `awaitMs` 30; `idleWorkerMs` 2 x 9 + 3 x 20 + 4 x 1 = 82; `problems` empty |
| same | `link: an awaited task discarded at the end` | `linkSummary(lines, 4)` on: `start`; `dispatch` 1/0 (inflight 1) at 0, `await` 1/0 at 1, `discard` 1/0 (`done` false) at 31, `end` at 31, then a late `complete` 1/0 (inflight 0) at 40 | `dispatched` 1; `discarded` `{ done: 0, inflight: 1 }`; `awaits` 1; `awaitMs` 30; `idleWorkerMs` 3 x 30 = 90; `problems` empty |
| same | `link: timelines by outcome` | `timelineProblem(run, linkLines)` of: (a) no set: `{ igSetMs: null, igAcceptedMs: [], acceptedCount: 0, responseMs: 40000 }` with `linkLines` `[]`; (a2) the same with `linkLines` `[{ t: 'link', ev: 'start', batch: 1 }]`; (b) a set and no acceptance: `igSetMs` 20,000, `igAcceptedMs: []`, `acceptedCount: 0`, `responseMs` 120,000; (c) an ordinary row: `igSetMs` 20,000, `igAcceptedMs` `[30000, 35000]`, `acceptedCount` 2, `responseMs` 40,000; (d) (c) without `igSetMs`; (e) (c) with `igSetMs` 31,000; (f) (c) with `acceptedCount` 3 | (a), (b), (c) `null`; (a2) a reason (a no-set row with a batch); (d) `'incomplete'`; (e) and (f) a reason |
| run of step 8 | `linkage` verdict | the two arms on `26x26-nightmare:0-1` | `linkage: pass` |

## Documentation

`tools/ig-proto/README.md` (step 7).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error; report the printed counts | 2 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T06` | root | every `--items` case passes, exit 0 | 3 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-T06.json -Label frozen -SourceLabel 'frozen 3fc65f4' -ApprovedRoundMinutes <approved> -DryRun` | root | both locked steps `go`; forecast 190 s, allocation 240 s, guard 300 s | 1 min |
| step 8 | root | `linkage: pass`; `Plan V4-T06 finished: task counted <= 300 s` | each invocation at most 285 s |
| `node tools\ig-proto\firewall.mjs check --task V4-T06 --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: the locked run if the dry run says `stop`; any change to a production file or to
  `v4`, `v4-ps`, `log`.
- Stop and report after: `linkage: fail` (a diagnosis gate: the reasons and the affected rows).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06a-B01 | Every candidate task of a batch is linked from dispatch to consumption or discard, on today's search and on `gen-v4` | `linkage: pass` | `evidence/frozen/V4-T06/linkage.md` |
| T06a-B02 | Idle workers behind an awaited call are measurable (IG-P-Q22's condition for a prefetch variant) | `idleWorkerMs` per batch | `linkage.json` |
| T06a-B03 | Every run record carries its set and accept timeline (with or without a set), the input of the labelled post-hoc projection (D-V4-08) | `igSetMs`, `igAcceptedMs` | the arms' `*.runs.json` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06a-T01 | The linkage changes no result: `log-link` rows have the same `resultDigest` as T04e's `log` rows on the same seeds | compare the published rows | `linkage.md` (a line per seed) |
| T06a-T02 | The summary arithmetic | self-test case | self-test output |
| T06a-T03 | Timelines are judged by outcome, with the row's own link lines | the case `link: timelines by outcome` | self-test output |
| T06a-T04 | Nothing else changed; formats | guards; `npm run check` | command output |

For T06a-T01 add to the report one line per seed: the `resultDigest` of `log-link` and of T04e's `log` arm
(`evidence/frozen/V4-T04/log/*.runs.json`, written by T04e), and `equal` or `differs`; a difference is a stop
(`QUESTION:`).

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

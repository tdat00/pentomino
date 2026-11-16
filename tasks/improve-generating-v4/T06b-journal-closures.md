# T06b: Journal closures for the work ledger: task identities and confirmed worker terminations

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.2 (rule (c5) faster, IG-P-Q37: a call closed by a recorded termination), §3 P5 ("the dispatch, selection, completion, consumption and discard linkage"), §7 (IG-P-Q37); decision D-V4-17; review RV2-07 (R2-07), RV3-07 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T06a |
| Depends on | T06a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (variant edits and unlocked cases; no rating, no generation) |

## Goal

The work ledger (T09c) closes every selection call of a request by its own `end` line or by the confirmed termination
of its worker, and matches every task that returned to its own call. This task records what that needs in the `link`
variant: the outcome of every set attempt and completion task that returned, with the identity of its call, and every
worker termination, confirmed only when the termination has completed.

## Authority and fixed points

- R2-07 (review 2) and RV3-07 (review 3), accepted: a termination request is written when it is requested and can
  never close a call; the closing `worker-end` line is written only when `worker.terminate()`'s promise fulfils, with
  the worker's `pid` and `threadId` captured before the request; a rejection is written as `worker-end-failed`.
  Completion calls carry an identity, not only a count: the layout key that `completionCandidate` already computes
  (`const key = layoutKey(board, pieces, layout)`, `core/engine/generate.js:307`) becomes the call's `igAttempt`
  (`"c/<key>"`), and the client records the same key, computed with `layoutKey` of `core/engine/keys.js:330` from the
  request's set (`const { set, ... } = request`, `core/browser/generation-client.js:824`; a `PieceSet` has `board`
  and `pieces`, `core/engine/types.js:35-37`) and the layout it sends (`:1048`), with the dispatch and with the
  outcome. A layout of `unused` is a complete arrangement of the enumeration, so its key exists; the helper still
  returns `null` instead of throwing, so that the journal can never change the batch.
- IG-P-Q37 (plan author, point 5): the termination record's accounting role is unchanged (it records the termination;
  it adds no counter); the confirmation above only fixes when the closing line is written.
- The linkage observes; it changes no dispatch, fold or result. Every `find` of the table occurs exactly once in its
  file of the `link` chain (the pack author checked `link-11` to `link-16` on `3fc65f4` with the `instr` and `log`
  edits applied: `docs/improve-generating/evidence/drift/claude-opus-5.5/v4-anchors-list.mjs`).

## Scope

- Change: `tools/ig-proto/variants/link.json` (the edits of step 2), `tools/ig-proto/variants/files/link/core/browser/ig-link.js`
  (step 1), `tools/ig-proto/linkage.mjs` (step 3), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T06a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T06b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/node-worker.mjs`, expected
  no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T06b --label frozen`.
1. **`ig-link.js`** gains one import line after its `node:fs` import, `import { layoutKey } from '../engine/keys.js';`,
   and these exports:

   ```js
   /** The identity of a completion task and of its call: 'c/' and the layout key, or null (never throws). */
   export function igCompletionKey(set, layout) {
     try {
       return 'c/' + layoutKey(set.board, set.pieces, layout);
     } catch {
       return null;
     }
   }

   /** The identity and destination of a worker, captured before its termination is requested (RV3-07). */
   export function igWorkerId(worker) {
     const env = globalThis.process?.env;
     return { pid: globalThis.process?.pid ?? null, threadId: worker.threadId, dir: env?.IG_LOG_DIR, row: env?.IG_ROW ?? 'unrowed' };
   }

   /** @param {'worker-end-request' | 'worker-end' | 'worker-end-failed'} ev @param {ReturnType<typeof igWorkerId>} id @param {unknown} [error] */
   export function igLinkWorker(ev, id, error) {
     if (id.dir === undefined) {
       return;
     }
     const line = { t: 'link', ev, pid: id.pid, threadId: id.threadId, at: now(),
       ...(error === undefined ? {} : { error: String(error instanceof Error ? error.message : error) }) };
     appendFileSync(`${id.dir}/${id.row}.link.jsonl`, `${JSON.stringify(line)}\n`);
   }
   ```

2. **Edits** appended to `variants/link.json` (`"description"` gains "; closures for the work ledger (V4-T06b)"):

   | Id | File | Find | Replace |
   |---|---|---|---|
   | `link-11` | `core/browser/generation-client.js` | `        emit(hooks.onProgress, {\n          revision: job.revision, job: /** @type {const} */ ('set'), stage: 'carving', attempt: j, elapsedMs: clock.now() - job.startedAt,\n` | `        igLink('set-complete', { attempt: j, outcome: isObject(value) && value.ok === true ? 'ok' : isObject(value) ? String(value.reason) : 'invalid' });\n` then the found text |
   | `link-12` | `core/browser/generation-client.js` | `              Object.assign(entry, { done: true, ok: true, value });\n              job.wake?.();\n` | `              Object.assign(entry, { done: true, ok: true, value });\n              igLink('completion-complete', { index: entries.indexOf(entry), key: igCompletionKey(set, layout), valueKey: isObject(value) && typeof value.layoutKey === 'string' ? 'c/' + value.layoutKey : null, outcome: isObject(value) && typeof value.fail === 'string' ? value.fail : 'candidate' });\n              job.wake?.();\n` |
   | `link-13` | `tools/node-worker.mjs` | `    terminate: () => {\n      worker.terminate().catch(() => {});\n    },\n` | `    terminate: () => {\n      const igId = igWorkerId(worker);\n      igLinkWorker('worker-end-request', igId);\n      worker.terminate().then(() => igLinkWorker('worker-end', igId), (e) => igLinkWorker('worker-end-failed', igId, e));\n    },\n` |
   | `link-14` | `tools/node-worker.mjs` | append | `\n// ig-proto, variant link (V4-T06b): confirmed worker terminations for the work ledger.\nimport { igLinkWorker, igWorkerId } from '../core/browser/ig-link.js';\n` |
   | `link-15` | `core/browser/generation-client.js` | `            const layout = unused[launched];\n            launched += 1;\n` | the same, then `            igLink('completion-dispatch', { index: launched - 1, key: igCompletionKey(set, layout) });\n` |
   | `link-16` | `core/engine/generate.js` | `    igStage: 'completion',\n` | `    igStage: 'completion',\n    igAttempt: 'c/' + key,\n` |
   | `link-17` | `core/browser/generation-client.js` | append | `\n// ig-proto, variant link (V4-T06b): completion keys.\nimport { igCompletionKey } from './ig-link.js';\n` |

   `link-11` and `link-12` record the outcome of every set attempt and completion task that returned (`ok`, a
   selection reason, or a pre-selection reason such as `carve` or `layout`); `link-13` records every termination;
   `link-15` and `link-16` give each completion task and its call the same identity. `layout` and `entry` in
   `link-12` are the constants of the dispatch loop the callback closes over (`generation-client.js:1047-1048`).
3. **`linkage.mjs`**: `linkSummary(lines, pool)` also returns `setCompletes`, `completionDispatches`,
   `completionCompletes`, `workerEndRequests`, `workerEnds`, `workerEndFailures` (the counts of those lines) and
   `completionKeyMismatches` (the `completion-complete` lines whose string `valueKey` differs from `key`); the report's
   verdict is `linkage: fail` also when a row has a key mismatch.
4. **Self-test** cases appended to `--items` (Tests table); **README.md**: T06a's section gains the closure lines,
   the confirmed termination and the completion identity.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, unlocked (no rating, no generation).

| Case name | Input | Expected |
|---|---|---|
| `link: a confirmed worker termination` | `const dir = fresh(join(SELFTEST_DIR, 'logs', 'link-worker-end'))`; `adaptNodeWorker` imported from `pathToFileURL(join((await ensureTree('log-link')).root, 'tools', 'node-worker.mjs')).href` (`ensureTree`, `tools/ig-proto/lib/tree.mjs:322`); the case writes `join(dir, 'idle.mjs')` holding `import { parentPort } from 'node:worker_threads'; parentPort.on('message', () => {});`; `process.env.IG_LOG_DIR = dir`, `process.env.IG_ROW = 'w'`; `const w = new Worker(pathToFileURL(join(dir, 'idle.mjs'))); const id = w.threadId; adaptNodeWorker(w).terminate();` then `join(dir, 'w.link.jsonl')` polled every 50 ms for up to 2 s until it holds two lines; in `finally` the two variables are deleted, as in the case `log equals base; journal` | the file holds `worker-end-request` then `worker-end`, both with `pid === process.pid` and `threadId === id`, the end's `at` at least the request's; no `worker-end-failed` |
| `link: closure lines counted` | `linkSummary` of: two `set-complete`; one `completion-dispatch`; two `completion-complete`, one with `valueKey` equal to `key` and one with another `valueKey`; three `worker-end-request`, two `worker-end` and one `worker-end-failed` | `setCompletes` 2, `completionDispatches` 1, `completionCompletes` 2, `workerEndRequests` 3, `workerEnds` 2, `workerEndFailures` 1, `completionKeyMismatches` 1 |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs build log-link v4-link v4-ps-link --label frozen` and `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | built; one `ok` line per declared variant, no error | 3 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T06b` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T06b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- `QUESTION:` when a `find` of the table is not found or not unique in its file of the `link` chain.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06b-B01 | Every set attempt and completion task that returned is recorded with its outcome and the identity of its call; every worker termination is recorded, and confirmed only when it has completed | the two cases; the edits | self-test output; `link.json` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06b-T01 | The confirmed `worker-end` carries the identity captured before the request and comes after it | case 1 | self-test output |
| T06b-T02 | The closure lines are counted and a completion key mismatch fails the linkage | case 2 | self-test output |
| T06b-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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

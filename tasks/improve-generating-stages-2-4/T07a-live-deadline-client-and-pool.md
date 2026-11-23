# T07a: The live request deadline in the client and the pool (`live`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.5 (Mechanism), §4.3 (composition: "a new `live` variant (N-V4-13)"), §8.2 T07; N-V4-13 of `tasks/improve-generating-v4/check-list.md` §6; plan v4 IG-P-D1; D-S24-12, D-S24-14; this pack's D-P24-01, D-P24-04 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T06b |
| Depends on | T06b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min of benchmark (one locked verification of a few seconds) |

## Goal

Today a request runs two separate 115-s clocks: the set stage's and then the batch's, so a Hell 1 request can answer
after 200 s. The freeze's deadline (`deadline-s3-v1`) gives the request one clock from its start: the set stage is cut
at 46 s (the reserve of 0.6 kept for the batch), and both stop at 115 s from the start. This task adds the client and
pool half of the `live` variant; T07b adds the host's hard 120-s bound and T07c the scripted cases.

## Authority and fixed points

- Plan §4.5: "one origin per request shared by the set stage and the batch; the set stage is cut at `(1 - reserve) x 115
  s` = 46 s with its own failure reason; at 115 s the batch stops, outstanding tasks are cancelled with their closure
  lines (ledgers stay complete) and the response holds the fold-order prefix of accepted puzzles ... The clock may
  shorten the prefix, never change which puzzle fills a slot. Legacy levels keep today's paths."
- D-P24-04: the cut set stage returns `{ status: 'failed', reason: 'reserve-cut', failures }` (a bench row's
  `partialReason` `set:reserve-cut`); the stop at 115 s keeps today's `time-limit`.
- The origin is a reading of the client's own clock, given by the host as `igOrigin` (T07b passes the row's `s.t0`); a
  missing, non-finite or later origin is ignored (today's path). The pool's existing stop (`expire`, `checkDeadline` at
  `TIME.dispatchStopMs` = 115000 from `startedAt`, `core/browser/worker-pool.js` of the trees) does the 115-s stop: only
  its start moves to the origin.
- The cut is checked after `v4-p5`'s bound and the ordered scan (a resolved lower success still wins; an earlier
  fault still ends the request as today) and before any new attempt is launched; a success of a higher attempt while a
  lower one is still running does not win over the cut (the lowest successful attempt must be known).
- Inert under `liveDeadline: null` (the variant's own parameter) and for every level the parameter does not list.
- The anchors below were checked to occur exactly once in the built trees `v4-link`, `fr-base`, `fr-p5`, `fr-ps` and
  `v4-ps-link`, and in memory in the composition of T08a (`docs/improve-generating-stages-2-4/evidence/sa-opus/bt-variants.mjs`
  with `--draft`, which also parses every touched file as a module).

## Scope

- Create: `tools/ig-proto/variants/live.json`.
- Change: `tools/ig-proto/self-test.mjs`: three cases appended to `v4Cases` (`--v4`).
- Change: `tools/ig-proto/README.md`: the subsection `### The live request deadline (T07a to T07c)` of `## The frozen
  family (stages 2 to 4 pack)`.
- Do not change: every other variant, `lib/`, `data/`, `plans/`. Guards: G1, G2, G3 (G3 lists the three files).

## Steps

1. Create `tools/ig-proto/variants/live.json` exactly (T07b appends five edits to its `edits` array):

   ```json
   {
     "id": "live",
     "extends": ["v4-link"],
     "description": "Frozen family (stages 2 to 4 pack T07a, T07b; plan 4.5, N-V4-13): the live request deadline. With IG.liveDeadline listing the level and the host origin igOrigin, the set stage and the batch share one 115-s clock from the request start, the set stage is cut at origin + setStageCapMs (reserve-cut), and the host returns the accepted prefix by origin + responseBoundMs; inert with liveDeadline null.",
     "edits": [
       {
         "id": "lv-1",
         "file": "core/browser/worker-pool.js",
         "find": "    beginRequest({ requestId, revision, onTimeout }) {\n",
         "replace": "    beginRequest({ requestId, revision, onTimeout, igOrigin }) {\n"
       },
       {
         "id": "lv-2",
         "file": "core/browser/worker-pool.js",
         "find": "      const request = { requestId, revision, startedAt: clock.now(), timer: null, onTimeout, ended: false, timedOut: false };\n      request.timer = clock.setTimeout(() => expire(request), TIME.dispatchStopMs);\n",
         "replace": "      // ig-proto, variant live (stages 2 to 4 pack T07a, plan 4.5): the 115-s clock may start at an earlier reading of\n      // the same clock (the host request's origin, shared by the set stage and the batch); never at a later one.\n      const igNow = clock.now();\n      const igStart = typeof igOrigin === 'number' && Number.isFinite(igOrigin) && igOrigin <= igNow ? igOrigin : igNow;\n      const request = { requestId, revision, startedAt: igStart, timer: null, onTimeout, ended: false, timedOut: false };\n      request.timer = clock.setTimeout(() => expire(request), Math.max(0, igStart + TIME.dispatchStopMs - igNow));\n"
       },
       {
         "id": "lv-3",
         "file": "core/browser/generation-client.js",
         "find": "  function begin(revision) {\n",
         "replace": "  function begin(revision, igLive = null) {\n"
       },
       {
         "id": "lv-4",
         "file": "core/browser/generation-client.js",
         "find": "      pool.beginRequest({\n        requestId,\n        revision: tag,\n",
         "replace": "      pool.beginRequest({\n        requestId,\n        revision: tag,\n        ...(igLive === null ? {} : { igOrigin: igLive.origin }),\n"
       },
       {
         "id": "lv-5",
         "file": "core/browser/generation-client.js",
         "find": "    const maxAttempts = options.maxSetAttempts ?? Infinity;\n    const job = begin(input.revision);\n",
         "replace": "    const maxAttempts = options.maxSetAttempts ?? Infinity;\n    // ig-proto, variant live (T07a): the request's origin and the set stage's cut at origin + setStageCapMs (plan 4.5).\n    const igLive = igLiveOf(input, request.levelId, clock);\n    const job = begin(input.revision, igLive);\n    const igCut = igLive === null ? null : clock.setTimeout(() => job.wake?.(), Math.max(0, igLive.setCutAt - clock.now()));\n"
       },
       {
         "id": "lv-6",
         "file": "core/browser/generation-client.js",
         "find": "        while (winner < 0 && inflight.size < size && next < maxAttempts) {\n",
         "replace": "        // ig-proto, variant live (T07a): after the bound and the ordered scan, the reserve's cut ends the set stage.\n        if (igLive !== null && clock.now() >= igLive.setCutAt) {\n          return { status: 'failed', reason: 'reserve-cut', failures: tally() };\n        }\n        while (winner < 0 && inflight.size < size && next < maxAttempts) {\n"
       },
       {
         "id": "lv-7",
         "file": "core/browser/generation-client.js",
         "find": "      for (const c of inflight.values()) {\n        c.abort();\n      }\n      finish(job);\n",
         "replace": "      for (const c of inflight.values()) {\n        c.abort();\n      }\n      if (igCut !== null) {\n        clock.clearTimeout(igCut);\n      }\n      finish(job);\n"
       },
       {
         "id": "lv-8",
         "file": "core/browser/generation-client.js",
         "find": "    const job = begin(input.revision);\n    const frozen = candidateContext(ctx, state);\n",
         "replace": "    const job = begin(input.revision, igLiveOf(input, levelId, clock));\n    const frozen = candidateContext(ctx, state);\n"
       },
       {
         "id": "lv-9",
         "file": "core/browser/generation-client.js",
         "append": "\n// ig-proto, variant live (stages 2 to 4 pack T07a, plan 4.5, N-V4-13): the live request deadline. With\n// IG.liveDeadline listing the request's level and a host origin `igOrigin` (a reading of the client's clock, not\n// later than now), the set stage and the batch share that origin: the pool stops both at origin + 115 s, and the set\n// stage is cut at origin + setStageCapMs with the reason `reserve-cut`. Otherwise null: today's two separate timers.\nimport { IG as IG_LIVE } from '../engine/ig-params.js';\n\n/**\n * @param {any} input The SetInput or BatchInput.\n * @param {string} levelId\n * @param {{ now: () => number }} clock\n * @param {any} [live] IG.liveDeadline by default.\n * @returns {{ origin: number, setCutAt: number } | null}\n */\nexport function igLiveOf(input, levelId, clock, live = IG_LIVE.liveDeadline) {\n  const origin = input?.igOrigin;\n  if (live === undefined || live === null || !Array.isArray(live.levels) || !live.levels.includes(levelId)\n    || typeof live.setStageCapMs !== 'number' || !Number.isFinite(live.setStageCapMs)\n    || typeof origin !== 'number' || !Number.isFinite(origin) || origin > clock.now()) {\n    return null;\n  }\n  return { origin, setCutAt: origin + live.setStageCapMs };\n}\n"
       }
     ],
     "files": [],
     "params": { "liveDeadline": null }
   }
   ```

2. Build and check: `node tools\ig-proto\lib\tree.mjs build live --label frozen --source-label "frozen 3fc65f4"` prints
   `live <treeId> <copyDigest> built`; `check-edits --all` prints `ok live: 66 edits match` (the 57 of `v4-link` and
   `lv-1` to `lv-9`).
3. Append the three cases of the Tests table to `v4Cases`, with the code below (helpers of the file: `engine`,
   `browserModule`, `harness`, `settle`, `track` from `./lib/fake-pool.mjs`, `same`, `assert`; `ROOT` and
   `readFileSync` are imported by the file). Add this constant next to `BAND` (`self-test.mjs:8178`):

   ```js
   /** The generation fixture of tests/fixtures/generation-case.json (read, never written): a 6x10 'hard' request (T07a). */
   const LIVE_RECIPE = () => JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'generation-case.json'), 'utf8'));
   ```

   Case 1, `live: the pool starts a request at its origin`:

   ```js
   async run() {
     const { createPool, PoolAbortError } = await browserModule(await engine('live'), 'worker-pool');
     const recipe = LIVE_RECIPE();
     const h = harness(createPool, { size: 1 });
     /** @type {any[]} */
     const timeouts = [];
     const onTimeout = (/** @type {any} */ info) => timeouts.push(info);
     const task = (/** @type {number} */ requestId, /** @type {string} */ revision) => ({
       requestId, revision, kind: 'setAttempt',
       payload: { boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', attempt: 0 },
     });
     const stopsAfter = async (/** @type {string} */ what, /** @type {number} */ requestId, /** @type {number} */ ms) => {
       const t = track(h.pool.run(task(requestId, `r${requestId}`)));
       await settle();
       h.clock.advance(ms - 1);
       await settle();
       assert(t.state === 'pending', `${what}: the task ended ${ms - 1} ms after the dispatch (${t.state})`);
       h.clock.advance(1);
       await settle();
       assert(t.state === 'rejected' && t.error instanceof PoolAbortError && t.error.reason === 'deadline',
         `${what}: the task is ${t.state} (${t.error?.reason}) ${ms} ms after the dispatch`);
     };
     h.pool.beginRequest({ requestId: 1, revision: 'r1', onTimeout, igOrigin: h.clock.now() - 100000 });
     await stopsAfter('an origin 100 s back', 1, 15000);
     h.pool.beginRequest({ requestId: 2, revision: 'r2', onTimeout });
     await stopsAfter('no origin', 2, 115000);
     h.pool.beginRequest({ requestId: 3, revision: 'r3', onTimeout, igOrigin: h.clock.now() + 5000 });
     await stopsAfter('a later origin', 3, 115000);
     h.pool.beginRequest({ requestId: 4, revision: 'r4', onTimeout, igOrigin: h.clock.now() - 200000 });
     const late = track(h.pool.run(task(4, 'r4')));
     await settle();
     assert(late.state === 'rejected' && late.error instanceof PoolAbortError && late.error.reason === 'deadline',
       `an origin 200 s back: the first dispatch is ${late.state} (${late.error?.reason})`);
     same(timeouts.map((t) => t.elapsedMs), [115000, 115000, 115000, 200000], 'the elapsed times the pool reported');
     h.pool.close();
   },
   ```

   Case 2, `live: igLiveOf rule`:

   ```js
   async run() {
     const { igLiveOf } = await browserModule(await engine('live'), 'generation-client');
     const clock = { now: () => 5000 };
     const T = { id: 'deadline-test', levels: ['hard'], reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 };
     same(igLiveOf({ igOrigin: 1000 }, 'hard', clock, T), { origin: 1000, setCutAt: 47000 }, 'a listed level with an origin');
     same(igLiveOf({ igOrigin: 5000 }, 'hard', clock, T), { origin: 5000, setCutAt: 51000 }, 'an origin equal to now');
     for (const [what, input, levelId, live] of /** @type {[string, any, string, any][]} */ ([
       ['an unlisted level', { igOrigin: 1000 }, 'easy', T],
       ['no origin', {}, 'hard', T],
       ['a NaN origin', { igOrigin: Number.NaN }, 'hard', T],
       ['a later origin', { igOrigin: 5001 }, 'hard', T],
       ['no set-stage cap', { igOrigin: 1000 }, 'hard', { ...T, setStageCapMs: undefined }],
       ['a null parameter', { igOrigin: 1000 }, 'hard', null],
     ])) {
       assert(igLiveOf(input, levelId, clock, live) === null, `${what}: ${JSON.stringify(igLiveOf(input, levelId, clock, live))}`);
     }
     assert(igLiveOf({ igOrigin: 1000 }, 'hard', clock) === null, 'the live tree (liveDeadline null) gave a deadline');
   },
   ```

   Case 3, `live: inert without its parameter`:

   ```js
   async run() {
     const tree = await engine('live');
     const { createPool } = await browserModule(tree, 'worker-pool');
     const { createGenerationClient } = await browserModule(tree, 'generation-client');
     const recipe = LIVE_RECIPE();
     const h = harness(createPool, { size: 4 });
     const client = createGenerationClient(h.pool, { clock: h.clock, createdAt: () => '2026-01-01T00:00:00.000Z' });
     const origin = h.clock.now() - 100000;
     const r = track(client.generateSet({
       igOrigin: origin, boardRows: recipe.boardRows, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: 'any', maxActive: 676,
     }));
     await settle();
     h.clock.advance(46000);
     await settle();
     assert(r.state === 'pending', `the set stage ended at 46 s without a live deadline: ${JSON.stringify(r.value)}`);
     h.clock.advance(68999);
     await settle();
     assert(r.state === 'pending', 'the set stage ended before 115 s after its own start');
     h.clock.advance(1);
     await settle();
     same([r.value?.status, r.value?.reason], ['failed', 'time-limit'], 'the set stage at 115 s after its own start');
     h.pool.close();
   },
   ```

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--v4`) | `live: the pool starts a request at its origin` | the `live` tree's pool on the fake clock (`harness`, size 1, every task held); four requests: origin 100 s back, none, 5 s ahead, 200 s back | the task stops 15 s, 115 s and 115 s after its dispatch for the first three; the fourth's first dispatch is refused with `deadline`; `onTimeout` reports `elapsedMs` 115000, 115000, 115000, 200000 |
| same | `live: igLiveOf rule` | `igLiveOf(input, levelId, clock, live)` with `clock.now()` 5000 and the test table | `{ origin: 1000, setCutAt: 47000 }` and `{ origin: 5000, setCutAt: 51000 }`; null for an unlisted level, no origin, NaN, a later origin, no cap, a null parameter, and the `live` tree's default |
| same | `live: inert without its parameter` | the `live` tree's client, a set request with `igOrigin` 100 s back, every attempt held | still pending at 46 s and at 115 s - 1 ms after its own start; `failed`, `time-limit` at 115 s after its own start |

## Documentation

README, subsection `### The live request deadline (T07a to T07c)` of `## The frozen family (stages 2 to 4 pack)`: the
mechanism (one origin `igOrigin` from the host; the pool's 115-s stop from that origin; the set stage's cut at origin +
`setStageCapMs` with `reserve-cut`; legacy levels and `liveDeadline: null` keep today's two timers); the parameter
`liveDeadline { id, levels, reserve, setStageCapMs, generationStopMs, responseBoundMs, hostMarginMs }`; the edits
`lv-1` to `lv-9` (T07b adds `lv-10` to `lv-19`).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T07a --label frozen` | repository root, first | `firewall: snapshot of S24-T07a` | 1 min |
| `node tools\ig-proto\lib\tree.mjs build live --label frozen --source-label "frozen 3fc65f4"` | repository root | `live <treeId> <copyDigest> built` | 3 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; `ok live: 66 edits match` | 3 min |
| check-list §3.1's selection block with `$Id = 'S24-T07a'`, `$GroupArgs = @('--v4')`, `$Locked = $true`, `$Required = @('live: the pool starts a request at its origin', 'live: igLiveOf rule', 'live: inert without its parameter')` | PowerShell 7 at the repository root | three `PASS` lines with the names above; `self-test: 3 passed, 0 failed`; `IG S24-T07a cases exit=0`; `cases: 3 passed, as required` | 5 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T07a --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

## Stop points and questions

- Stop and report when an anchor of `lv-1` to `lv-8` is not found once, or when case 1 shows a stop at another time
  than the table's: the pool's stop is today's code with a moved start; a different behaviour is a `QUESTION:`.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07a-B01 | A request's set stage and batch can share one 115-s clock from the request start, and the set stage can be cut at 46 s, while every level without the parameter keeps today's behaviour | the three cases | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07a-T01 | `live` builds; its nine edits match once | `build`; `check-edits` | the lines |
| T07a-T02 | The pool's stop starts at a valid origin and ignores a later or missing one; `igLiveOf` follows its table; the variant is inert with `liveDeadline: null` | the three cases | the PASS lines |
| T07a-T03 | The `v4` chain did not move; `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the case indices, the helper's seconds);
each AC row with its evidence; the questions and rulings; the deviations; and the named items for later.

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

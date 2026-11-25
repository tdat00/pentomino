# Variant chains of the shipped frozen arms (SA-Opus, phase-2 analysis)

Command: `node docs\improve-generating-phase-2\evidence\sa-opus\p2-variant-chain.mjs` (read-only).
Source: `tools/ig-proto/variants/*.json` at the base of `gen-v4`. The harness applies each chain to the frozen source `3fc65f4`.
The chain order is a depth-first resolution of `extends` (parents first, each variant once); the harness's own order is in
`tools/ig-proto/variant.mjs`.

## fr-frozen

Chain: `base` → `instr` → `log` → `v4` → `link` → `v4-link` → `fr-base` → `v4-ps` → `v4-p5` → `live` → `p5-mode` → `ps-levels` → `fr-frozen`.

### base (0 edits)

The worktree's core/, tools/ and package.json with only the no-git edit of tools/calibrate.mjs (meta-1). Its source digest is the worktree's.

### instr (9 edits)

Instrumentation: work and nodes at the first solution and R7 work-limit cuts (igTake), test-side puzzle keys in run records, diagnostic offers. No rating changes.

Params: `{"variant":"instr","diagnosticOffers":true}`

- `core/engine/deduce.js` (replace, instr-1): 'let first = null;'
- `core/engine/deduce.js` (replace, instr-2): 'first = snapshot();'
- `core/engine/deduce.js` (replace, instr-3): 'if (work > workLimit) {'
- `core/engine/deduce.js` (replace, instr-4): 'if (work > workLimit) {'
- `core/engine/deduce.js` (replace, instr-5): 'function result() {'
- `core/engine/deduce.js` (append, instr-6): + /** @type {?{ workFirst: number, nodesFirst: number, r7Cut: number, r7CutCensus: number }} Instrumentation of
- `tools/bench/runner.js` (replace, instr-7): 'resultDigest: sha256Hex(canonicalJson({'
- `core/engine/policy.js` (replace, diag-1): 'if (area < lv.areas[0] || area > lv.areas[1]) return null;'
- `core/engine/policy.js` (append, diag-2): + import { IG } from './ig-params.js';

### log (8 edits; adds the files of `variants/files/log`)

Today's search with durable per-probe logs (ig-log.js): same results as the instr and base trees.

Params: `{"variant":"log","logAccepted":false,"p6":false}`

- `core/engine/clues.js` (replace, log-1): 'export function selectClues(ctx) {'
- `core/engine/clues.js` (replace, log-2): '// Phase 2: when every phase-1 sample was skipped, seed the beam afresh.'
- `core/engine/clues.js` (replace, log-3): 'let beam = ranked(target, rated).slice(0, BEAM_WIDTH);'
- `core/engine/clues.js` (append, log-4): + // ig-proto dispatch (variant log): the exported search is today's search, logged per probe.
- `core/engine/generate.js` (replace, log-5): 'const cal = selectClues({'
- `core/engine/generate.js` (replace, log-6): 'return { fail: 'layout' };'
- `core/engine/generate.js` (replace, log-7): 'const rng = createRng(ctx.batchSeed, 'completion/${key}');'
- `tools/calibrate.mjs` (replace, log-8): 'const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));'

### v4 (21 edits; adds the files of `variants/files/v4`)

gen-v4 prototype on the frozen selectClues (V4-T02a): Nightmare and Hell 1 targets use selectCluesV4, the others the frozen search. W 190 M.

Params: `{"logAccepted":true,"U0":8,"rerateMax":4,"W":{"default":190000000},"priorTable":"prior-v1","screenTable":"w190"}`

- `core/engine/clues.js` (replace, v4-1): 'import { igDispatch, igPhase } from './ig-log.js';'
- `core/engine/clues.js` (replace, v4-2): 'return igDispatch(ctx, selectCluesV3);'
- `core/engine/difficulty.js` (append, v4-3): + // ig-proto, variant v4 (V4-T02a): the detail channel of a screened rating, from the same measurement.
- `core/engine/clues.js` (replace, v4-4): 'onCount: charge,'
- `core/engine/version.js` (replace, pv-1): '// @ts-check'
- `core/engine/version.js` (replace, pv-2): 'export const ALGO_ID = 'gen-v3';'
- `core/engine/generate.js` (replace, pv-3): 'import { ALGO_ID } from './version.js';'
- `core/engine/generate.js` (replace, pv-4): 'return { algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, seedScheme: SEED_SCHEME, ratingModel: MODEL };'
- `core/engine/generate.js` (replace, pv-5): 'recordSource: 'candidate','
- `core/engine/generate.js` (replace, pv-6): 'skips: capSkips(sel.skips),'
- `core/engine/pack.js` (replace, pv-7): 'const VERSION_KEYS = ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel'];'
- `core/engine/pack.js` (replace, pv-8): 'function versionsProblem(v) {'
- `core/engine/pack.js` (replace, pv-9): 'const o = /** @type {Record<string, unknown>} */ (v);'
- `core/engine/pack.js` (replace, pv-10): 'function skipsProblem(v) {'
- `core/engine/pack.js` (replace, pv-11): 'return ordinalsProblem('subsets', o.subsets, PROVENANCE.subsetSkips, PROVENANCE.subsetOrdinals)'
- `core/engine/pack.js` (replace, pv-12): 'const shape = exactKeysProblem(v, kind === 'candidate' ? MADE_CANDIDATE_KEYS : MADE_PLAIN_KEYS);'
- `core/engine/pack.js` (replace, pv-13): 'return skipsProblem(o.skips) ?? versionsProblem(o.versions);'
- `core/engine/pack.js` (replace, pv-14): 'ratingModel: /** @type {string} */ (v.ratingModel),'
- `core/engine/pack.js` (replace, pv-15): 'skips: skips === 'overflow' ? skips : { subsets: skips.subsets.slice(), repairs: skips.repairs.slice() },'
- `core/engine/replay.js` (replace, pv-16): '&& a.ratingModel === b.ratingModel;'
- `core/engine/replay.js` (replace, pv-17): 'uniqueness: m.uniqueness,'

### link (17 edits; adds the files of `variants/files/link`)

Batch linkage journal (V4-T06, plan P5 IG-P-Q22): dispatch, await, completion, consumption and discard of every candidate task, and the accept timeline in the run records. Composed after log; it changes no result; closures for the work ledger (V4-T06b).

Params: `{"link":true}`

- `core/engine/generate.js` (replace, link-1): 'igStage: 'batch','
- `core/browser/generation-client.js` (append, link-2): + // ig-proto, variant link (V4-T06): the batch linkage journal.
- `core/browser/generation-client.js` (replace, link-3): 'cache.set(key(slot, attempt), entry);'
- `core/browser/generation-client.js` (replace, link-4): 'Object.assign(entry, { done: true, ok: true, value });'
- `core/browser/generation-client.js` (replace, link-5): 'Object.assign(entry, { done: true, ok: false, error });'
- `core/browser/generation-client.js` (replace, link-6): 'const awaited = foldNext(state);'
- `core/browser/generation-client.js` (replace, link-7): 'progress({ slot: awaited.slot, attempt: awaited.attempt });'
- `core/browser/generation-client.js` (replace, link-8): 'for (const calibration of state.accepted) {'
- `core/browser/generation-client.js` (replace, link-9): 'throw toFault(e, detail());'
- `tools/bench/runner.js` (replace, link-10): 'run.responseMs = s.tDone - s.t0;'
- `core/browser/generation-client.js` (replace, link-11): 'emit(hooks.onProgress, {'
- `core/browser/generation-client.js` (replace, link-12): 'Object.assign(entry, { done: true, ok: true, value });'
- `tools/node-worker.mjs` (replace, link-13): 'terminate: () => {'
- `tools/node-worker.mjs` (append, link-14): + // ig-proto, variant link (V4-T06b): confirmed worker terminations for the work ledger.
- `core/browser/generation-client.js` (replace, link-15): 'const layout = unused[launched];'
- `core/engine/generate.js` (replace, link-16): 'igStage: 'completion','
- `core/browser/generation-client.js` (append, link-17): + // ig-proto, variant link (V4-T06b): completion keys.

### v4-link (0 edits)

gen-v4 prototype with the batch linkage journal (V4-T06): the same puzzles as v4, plus the linkage lines and the accept timeline.

### fr-base (0 edits)

Frozen-round base arm (V4-T08): v4-link with the plan's W_screen table by class (Hell 1 none, Nightmare up to 144 cells none, 196 to 324 cells 190 M, 360 and more none, every unlisted class none).

Params: `{"screenClasses":{"hell-1":null,"n-small":null,"n-mid":190000000,"n-large":null},"screenTable":"tab-default"}`

### v4-ps (7 edits)

gen-v4 prototype with the per-set prior (V4-T05, plan P4 item 2): the calibration's window count starts every candidate's locate.

Params: `{"perSetPrior":true}`

- `core/engine/generate.js` (replace, ps-1): 'certificate: cal.certificate,'
- `core/engine/protocol.js` (replace, ps-2): ''seenLayouts', 'seenClues', 'slot', 'attempt'],'
- `core/engine/protocol.js` (replace, ps-3): 'return [set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt].includes(u'
- `core/engine/tasks.js` (replace, ps-4): 'seenClues: new Set(p.seenClues),'
- `core/browser/generation-client.js` (replace, ps-5): 'seenClues: [...frozen.seenClues],'
- `core/browser/generation-client.js` (replace, ps-6): ''puzzleCandidate', { ...base, slot, attempt }'
- `core/browser/generation-client.js` (append, ps-7): + // ig-proto, variant v4-ps (V4-T05): the per-set prior of plan P4 item 2, under the match rule of

### v4-p5 (3 edits)

P5 pilot arm (V4-T07b): a 2 G-unit budget per Nightmare and Hell 1 selection call and a bound of 4 set attempts on a no-window side.

Params: `{"callBudget":{"default":2000000000},"setAttemptsBound":4}`

- `core/engine/generate.js` (replace, p5-1): 'if (!cal.ok) {'
- `core/browser/generation-client.js` (replace, p5-2): '// The lowest successful attempt wins: scan the resolved prefix in order.'
- `core/browser/generation-client.js` (append, p5-3): + // ig-proto, variant v4-p5 (V4-T07b): bounded set attempts (plan P5). The request ends when the first

### live (19 edits)

Frozen family (stages 2 to 4 pack T07a, T07b; plan 4.5, N-V4-13): the live request deadline. With IG.liveDeadline listing the level and the host origin igOrigin, the set stage and the batch share one 115-s clock from the request start, the set stage is cut at origin + setStageCapMs (reserve-cut), and the host returns the accepted prefix by origin + responseBoundMs; inert with liveDeadline null.

Params: `{"liveDeadline":null}`

- `core/browser/worker-pool.js` (replace, lv-1): 'beginRequest({ requestId, revision, onTimeout }) {'
- `core/browser/worker-pool.js` (replace, lv-2): 'const request = { requestId, revision, startedAt: clock.now(), timer: null, onTimeout, ended: false, timedOut:'
- `core/browser/generation-client.js` (replace, lv-3): 'function begin(revision) {'
- `core/browser/generation-client.js` (replace, lv-4): 'pool.beginRequest({'
- `core/browser/generation-client.js` (replace, lv-5): 'const maxAttempts = options.maxSetAttempts ?? Infinity;'
- `core/browser/generation-client.js` (replace, lv-6): 'while (winner < 0 && inflight.size < size && next < maxAttempts) {'
- `core/browser/generation-client.js` (replace, lv-7): 'for (const c of inflight.values()) {'
- `core/browser/generation-client.js` (replace, lv-8): 'const job = begin(input.revision);'
- `core/browser/generation-client.js` (append, lv-9): + // ig-proto, variant live (stages 2 to 4 pack T07a, plan 4.5, N-V4-13): the live request deadline. With
- `tools/bench/runner.js` (replace, lv-10): 's.t0 = clock.now();'
- `tools/bench/runner.js` (replace, lv-11): 'maxActive: caseDef.maxActive,'
- `tools/bench/runner.js` (replace, lv-12): 's.batch = await client.generateBatch({'
- `tools/bench/runner.js` (replace, lv-13): '},'
- `tools/bench/runner.js` (append, lv-14): + // ig-proto, variant live (stages 2 to 4 pack T07b, plan 4.5, N-V4-13): the host's hard response bound. With
- `core/browser/generation-client.js` (replace, lv-15): 'const pack = await assemblePack({'
- `core/browser/generation-client.js` (replace, lv-16): 'const detail = () => ({ accepted: accepted.slice(), seenLayouts: [...state.seenLayouts], seenClues: [...state.'
- `core/browser/generation-client.js` (replace, lv-17): 'if (accepted.length > 0) {'
- `core/browser/generation-client.js` (replace, lv-18): 'replayPuzzle,'
- `core/browser/generation-client.js` (append, lv-19): + // ig-proto, variant live (stages 2 to 4 pack T07b): the synchronous pack validator of the prefix snapshot (th

### p5-mode (2 edits)

Frozen family (stages 2 to 4 pack T06b, plan 4.4): P5's call budget by uniqueness mode and level, IG.callBudget = { id, any: { <level>: units }, require: { <level>: units } }, given to the copy's search as the call's igBudget; inert without that parameter.

- `core/engine/clues.js` (replace, fz-1): 'return selectCluesV4(ctx);'
- `core/engine/clues.js` (append, fz-2): + // ig-proto, variant p5-mode (stages 2 to 4 pack T06b, plan 4.4): P5's call budget by uniqueness mode and leve

### ps-levels (2 edits)

Frozen family (stages 2 to 4 pack T06b, plan 4.1): the per-set prior of v4-ps only on the levels of IG.perSetLevels; on every level without that parameter.

- `core/browser/generation-client.js` (replace, fz-3): 'const igPrior = igPriorOf(request.calibration, levelId, uniqueness);'
- `core/browser/generation-client.js` (append, fz-4): + // ig-proto, variant ps-levels (stages 2 to 4 pack T06b, plan 4.1): the per-set prior only on the levels liste

### fr-frozen (0 edits)

Frozen arm (stages 2 to 4 pack T08a; plan v4 stage 3, N-V4-03; plan 4.1-4.5): the freeze with the screen by class (screen-s3-v1), the prior prior-s3-v1, the per-set prior on Hell 1, P5 by mode (budget-s3-v1) and the bound of 4, the live deadline (deadline-s3-v1), rescue re-rating, no (c4), no ranker, the reference kernel.

Params: `{"priorTable":"prior-s3-v1","screenTable":"screen-s3-v1","screenClasses":{"hell-1":null,"n-small":null,"n-mid":190000000,"n-large":190000000},"rerate":"rescue","rerateMax":4,"c4":false,"callBudget":{"id":"budget-s3-v1","any":{"nightmare":10000000000,"hell-1":40000000000},"require":{"nightmare":32000000000,"hell-1":40000000000}},"setAttemptsBound":4,"liveDeadline":{"id":"deadline-s3-v1","levels":["nightmare","hell-1"],"reserve":0.6,"setStageCapMs":46000,"generationStopMs":115000,"responseBoundMs":120000,"hostMarginMs":1000},"perSetLevels":["hell-1"]}`

Edits per file:

- `core/browser/generation-client.js`: 31
- `core/browser/worker-pool.js`: 2
- `core/engine/clues.js`: 9
- `core/engine/deduce.js`: 6
- `core/engine/difficulty.js`: 1
- `core/engine/generate.js`: 11
- `core/engine/pack.js`: 9
- `core/engine/policy.js`: 2
- `core/engine/protocol.js`: 2
- `core/engine/replay.js`: 2
- `core/engine/tasks.js`: 1
- `core/engine/version.js`: 2
- `tools/bench/runner.js`: 7
- `tools/calibrate.mjs`: 1
- `tools/node-worker.mjs`: 2

## fr-frozen-none

Chain: `base` → `instr` → `log` → `v4` → `link` → `v4-link` → `fr-base` → `v4-ps` → `v4-p5` → `live` → `p5-mode` → `ps-levels` → `fr-frozen` → `fr-frozen-none`.

### base (0 edits)

The worktree's core/, tools/ and package.json with only the no-git edit of tools/calibrate.mjs (meta-1). Its source digest is the worktree's.

### instr (9 edits)

Instrumentation: work and nodes at the first solution and R7 work-limit cuts (igTake), test-side puzzle keys in run records, diagnostic offers. No rating changes.

Params: `{"variant":"instr","diagnosticOffers":true}`

- `core/engine/deduce.js` (replace, instr-1): 'let first = null;'
- `core/engine/deduce.js` (replace, instr-2): 'first = snapshot();'
- `core/engine/deduce.js` (replace, instr-3): 'if (work > workLimit) {'
- `core/engine/deduce.js` (replace, instr-4): 'if (work > workLimit) {'
- `core/engine/deduce.js` (replace, instr-5): 'function result() {'
- `core/engine/deduce.js` (append, instr-6): + /** @type {?{ workFirst: number, nodesFirst: number, r7Cut: number, r7CutCensus: number }} Instrumentation of
- `tools/bench/runner.js` (replace, instr-7): 'resultDigest: sha256Hex(canonicalJson({'
- `core/engine/policy.js` (replace, diag-1): 'if (area < lv.areas[0] || area > lv.areas[1]) return null;'
- `core/engine/policy.js` (append, diag-2): + import { IG } from './ig-params.js';

### log (8 edits; adds the files of `variants/files/log`)

Today's search with durable per-probe logs (ig-log.js): same results as the instr and base trees.

Params: `{"variant":"log","logAccepted":false,"p6":false}`

- `core/engine/clues.js` (replace, log-1): 'export function selectClues(ctx) {'
- `core/engine/clues.js` (replace, log-2): '// Phase 2: when every phase-1 sample was skipped, seed the beam afresh.'
- `core/engine/clues.js` (replace, log-3): 'let beam = ranked(target, rated).slice(0, BEAM_WIDTH);'
- `core/engine/clues.js` (append, log-4): + // ig-proto dispatch (variant log): the exported search is today's search, logged per probe.
- `core/engine/generate.js` (replace, log-5): 'const cal = selectClues({'
- `core/engine/generate.js` (replace, log-6): 'return { fail: 'layout' };'
- `core/engine/generate.js` (replace, log-7): 'const rng = createRng(ctx.batchSeed, 'completion/${key}');'
- `tools/calibrate.mjs` (replace, log-8): 'const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));'

### v4 (21 edits; adds the files of `variants/files/v4`)

gen-v4 prototype on the frozen selectClues (V4-T02a): Nightmare and Hell 1 targets use selectCluesV4, the others the frozen search. W 190 M.

Params: `{"logAccepted":true,"U0":8,"rerateMax":4,"W":{"default":190000000},"priorTable":"prior-v1","screenTable":"w190"}`

- `core/engine/clues.js` (replace, v4-1): 'import { igDispatch, igPhase } from './ig-log.js';'
- `core/engine/clues.js` (replace, v4-2): 'return igDispatch(ctx, selectCluesV3);'
- `core/engine/difficulty.js` (append, v4-3): + // ig-proto, variant v4 (V4-T02a): the detail channel of a screened rating, from the same measurement.
- `core/engine/clues.js` (replace, v4-4): 'onCount: charge,'
- `core/engine/version.js` (replace, pv-1): '// @ts-check'
- `core/engine/version.js` (replace, pv-2): 'export const ALGO_ID = 'gen-v3';'
- `core/engine/generate.js` (replace, pv-3): 'import { ALGO_ID } from './version.js';'
- `core/engine/generate.js` (replace, pv-4): 'return { algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, seedScheme: SEED_SCHEME, ratingModel: MODEL };'
- `core/engine/generate.js` (replace, pv-5): 'recordSource: 'candidate','
- `core/engine/generate.js` (replace, pv-6): 'skips: capSkips(sel.skips),'
- `core/engine/pack.js` (replace, pv-7): 'const VERSION_KEYS = ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel'];'
- `core/engine/pack.js` (replace, pv-8): 'function versionsProblem(v) {'
- `core/engine/pack.js` (replace, pv-9): 'const o = /** @type {Record<string, unknown>} */ (v);'
- `core/engine/pack.js` (replace, pv-10): 'function skipsProblem(v) {'
- `core/engine/pack.js` (replace, pv-11): 'return ordinalsProblem('subsets', o.subsets, PROVENANCE.subsetSkips, PROVENANCE.subsetOrdinals)'
- `core/engine/pack.js` (replace, pv-12): 'const shape = exactKeysProblem(v, kind === 'candidate' ? MADE_CANDIDATE_KEYS : MADE_PLAIN_KEYS);'
- `core/engine/pack.js` (replace, pv-13): 'return skipsProblem(o.skips) ?? versionsProblem(o.versions);'
- `core/engine/pack.js` (replace, pv-14): 'ratingModel: /** @type {string} */ (v.ratingModel),'
- `core/engine/pack.js` (replace, pv-15): 'skips: skips === 'overflow' ? skips : { subsets: skips.subsets.slice(), repairs: skips.repairs.slice() },'
- `core/engine/replay.js` (replace, pv-16): '&& a.ratingModel === b.ratingModel;'
- `core/engine/replay.js` (replace, pv-17): 'uniqueness: m.uniqueness,'

### link (17 edits; adds the files of `variants/files/link`)

Batch linkage journal (V4-T06, plan P5 IG-P-Q22): dispatch, await, completion, consumption and discard of every candidate task, and the accept timeline in the run records. Composed after log; it changes no result; closures for the work ledger (V4-T06b).

Params: `{"link":true}`

- `core/engine/generate.js` (replace, link-1): 'igStage: 'batch','
- `core/browser/generation-client.js` (append, link-2): + // ig-proto, variant link (V4-T06): the batch linkage journal.
- `core/browser/generation-client.js` (replace, link-3): 'cache.set(key(slot, attempt), entry);'
- `core/browser/generation-client.js` (replace, link-4): 'Object.assign(entry, { done: true, ok: true, value });'
- `core/browser/generation-client.js` (replace, link-5): 'Object.assign(entry, { done: true, ok: false, error });'
- `core/browser/generation-client.js` (replace, link-6): 'const awaited = foldNext(state);'
- `core/browser/generation-client.js` (replace, link-7): 'progress({ slot: awaited.slot, attempt: awaited.attempt });'
- `core/browser/generation-client.js` (replace, link-8): 'for (const calibration of state.accepted) {'
- `core/browser/generation-client.js` (replace, link-9): 'throw toFault(e, detail());'
- `tools/bench/runner.js` (replace, link-10): 'run.responseMs = s.tDone - s.t0;'
- `core/browser/generation-client.js` (replace, link-11): 'emit(hooks.onProgress, {'
- `core/browser/generation-client.js` (replace, link-12): 'Object.assign(entry, { done: true, ok: true, value });'
- `tools/node-worker.mjs` (replace, link-13): 'terminate: () => {'
- `tools/node-worker.mjs` (append, link-14): + // ig-proto, variant link (V4-T06b): confirmed worker terminations for the work ledger.
- `core/browser/generation-client.js` (replace, link-15): 'const layout = unused[launched];'
- `core/engine/generate.js` (replace, link-16): 'igStage: 'completion','
- `core/browser/generation-client.js` (append, link-17): + // ig-proto, variant link (V4-T06b): completion keys.

### v4-link (0 edits)

gen-v4 prototype with the batch linkage journal (V4-T06): the same puzzles as v4, plus the linkage lines and the accept timeline.

### fr-base (0 edits)

Frozen-round base arm (V4-T08): v4-link with the plan's W_screen table by class (Hell 1 none, Nightmare up to 144 cells none, 196 to 324 cells 190 M, 360 and more none, every unlisted class none).

Params: `{"screenClasses":{"hell-1":null,"n-small":null,"n-mid":190000000,"n-large":null},"screenTable":"tab-default"}`

### v4-ps (7 edits)

gen-v4 prototype with the per-set prior (V4-T05, plan P4 item 2): the calibration's window count starts every candidate's locate.

Params: `{"perSetPrior":true}`

- `core/engine/generate.js` (replace, ps-1): 'certificate: cal.certificate,'
- `core/engine/protocol.js` (replace, ps-2): ''seenLayouts', 'seenClues', 'slot', 'attempt'],'
- `core/engine/protocol.js` (replace, ps-3): 'return [set, targetLevelId, quantity, batchSeed, uniqueness, seenLayouts, seenClues, slot, attempt].includes(u'
- `core/engine/tasks.js` (replace, ps-4): 'seenClues: new Set(p.seenClues),'
- `core/browser/generation-client.js` (replace, ps-5): 'seenClues: [...frozen.seenClues],'
- `core/browser/generation-client.js` (replace, ps-6): ''puzzleCandidate', { ...base, slot, attempt }'
- `core/browser/generation-client.js` (append, ps-7): + // ig-proto, variant v4-ps (V4-T05): the per-set prior of plan P4 item 2, under the match rule of

### v4-p5 (3 edits)

P5 pilot arm (V4-T07b): a 2 G-unit budget per Nightmare and Hell 1 selection call and a bound of 4 set attempts on a no-window side.

Params: `{"callBudget":{"default":2000000000},"setAttemptsBound":4}`

- `core/engine/generate.js` (replace, p5-1): 'if (!cal.ok) {'
- `core/browser/generation-client.js` (replace, p5-2): '// The lowest successful attempt wins: scan the resolved prefix in order.'
- `core/browser/generation-client.js` (append, p5-3): + // ig-proto, variant v4-p5 (V4-T07b): bounded set attempts (plan P5). The request ends when the first

### live (19 edits)

Frozen family (stages 2 to 4 pack T07a, T07b; plan 4.5, N-V4-13): the live request deadline. With IG.liveDeadline listing the level and the host origin igOrigin, the set stage and the batch share one 115-s clock from the request start, the set stage is cut at origin + setStageCapMs (reserve-cut), and the host returns the accepted prefix by origin + responseBoundMs; inert with liveDeadline null.

Params: `{"liveDeadline":null}`

- `core/browser/worker-pool.js` (replace, lv-1): 'beginRequest({ requestId, revision, onTimeout }) {'
- `core/browser/worker-pool.js` (replace, lv-2): 'const request = { requestId, revision, startedAt: clock.now(), timer: null, onTimeout, ended: false, timedOut:'
- `core/browser/generation-client.js` (replace, lv-3): 'function begin(revision) {'
- `core/browser/generation-client.js` (replace, lv-4): 'pool.beginRequest({'
- `core/browser/generation-client.js` (replace, lv-5): 'const maxAttempts = options.maxSetAttempts ?? Infinity;'
- `core/browser/generation-client.js` (replace, lv-6): 'while (winner < 0 && inflight.size < size && next < maxAttempts) {'
- `core/browser/generation-client.js` (replace, lv-7): 'for (const c of inflight.values()) {'
- `core/browser/generation-client.js` (replace, lv-8): 'const job = begin(input.revision);'
- `core/browser/generation-client.js` (append, lv-9): + // ig-proto, variant live (stages 2 to 4 pack T07a, plan 4.5, N-V4-13): the live request deadline. With
- `tools/bench/runner.js` (replace, lv-10): 's.t0 = clock.now();'
- `tools/bench/runner.js` (replace, lv-11): 'maxActive: caseDef.maxActive,'
- `tools/bench/runner.js` (replace, lv-12): 's.batch = await client.generateBatch({'
- `tools/bench/runner.js` (replace, lv-13): '},'
- `tools/bench/runner.js` (append, lv-14): + // ig-proto, variant live (stages 2 to 4 pack T07b, plan 4.5, N-V4-13): the host's hard response bound. With
- `core/browser/generation-client.js` (replace, lv-15): 'const pack = await assemblePack({'
- `core/browser/generation-client.js` (replace, lv-16): 'const detail = () => ({ accepted: accepted.slice(), seenLayouts: [...state.seenLayouts], seenClues: [...state.'
- `core/browser/generation-client.js` (replace, lv-17): 'if (accepted.length > 0) {'
- `core/browser/generation-client.js` (replace, lv-18): 'replayPuzzle,'
- `core/browser/generation-client.js` (append, lv-19): + // ig-proto, variant live (stages 2 to 4 pack T07b): the synchronous pack validator of the prefix snapshot (th

### p5-mode (2 edits)

Frozen family (stages 2 to 4 pack T06b, plan 4.4): P5's call budget by uniqueness mode and level, IG.callBudget = { id, any: { <level>: units }, require: { <level>: units } }, given to the copy's search as the call's igBudget; inert without that parameter.

- `core/engine/clues.js` (replace, fz-1): 'return selectCluesV4(ctx);'
- `core/engine/clues.js` (append, fz-2): + // ig-proto, variant p5-mode (stages 2 to 4 pack T06b, plan 4.4): P5's call budget by uniqueness mode and leve

### ps-levels (2 edits)

Frozen family (stages 2 to 4 pack T06b, plan 4.1): the per-set prior of v4-ps only on the levels of IG.perSetLevels; on every level without that parameter.

- `core/browser/generation-client.js` (replace, fz-3): 'const igPrior = igPriorOf(request.calibration, levelId, uniqueness);'
- `core/browser/generation-client.js` (append, fz-4): + // ig-proto, variant ps-levels (stages 2 to 4 pack T06b, plan 4.1): the per-set prior only on the levels liste

### fr-frozen (0 edits)

Frozen arm (stages 2 to 4 pack T08a; plan v4 stage 3, N-V4-03; plan 4.1-4.5): the freeze with the screen by class (screen-s3-v1), the prior prior-s3-v1, the per-set prior on Hell 1, P5 by mode (budget-s3-v1) and the bound of 4, the live deadline (deadline-s3-v1), rescue re-rating, no (c4), no ranker, the reference kernel.

Params: `{"priorTable":"prior-s3-v1","screenTable":"screen-s3-v1","screenClasses":{"hell-1":null,"n-small":null,"n-mid":190000000,"n-large":190000000},"rerate":"rescue","rerateMax":4,"c4":false,"callBudget":{"id":"budget-s3-v1","any":{"nightmare":10000000000,"hell-1":40000000000},"require":{"nightmare":32000000000,"hell-1":40000000000}},"setAttemptsBound":4,"liveDeadline":{"id":"deadline-s3-v1","levels":["nightmare","hell-1"],"reserve":0.6,"setStageCapMs":46000,"generationStopMs":115000,"responseBoundMs":120000,"hostMarginMs":1000},"perSetLevels":["hell-1"]}`

### fr-frozen-none (0 edits)

Frozen arm (stages 2 to 4 pack T08a): fr-frozen with no screen in any class (screen-s3-none); everything else frozen.

Params: `{"screenTable":"screen-s3-none","screenClasses":{"hell-1":null,"n-small":null,"n-mid":null,"n-large":null}}`

Edits per file:

- `core/browser/generation-client.js`: 31
- `core/browser/worker-pool.js`: 2
- `core/engine/clues.js`: 9
- `core/engine/deduce.js`: 6
- `core/engine/difficulty.js`: 1
- `core/engine/generate.js`: 11
- `core/engine/pack.js`: 9
- `core/engine/policy.js`: 2
- `core/engine/protocol.js`: 2
- `core/engine/replay.js`: 2
- `core/engine/tasks.js`: 1
- `core/engine/version.js`: 2
- `tools/bench/runner.js`: 7
- `tools/calibrate.mjs`: 1
- `tools/node-worker.mjs`: 2


# T02a: `gen-v4` prototype on the frozen `selectClues`: the fork, the screen and the locate

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P1 (`locateCount`), P2 (screen and certificate), P3 (a capped profile is a sided result), P4 (table prior), §5.1 ("The prototype on the frozen source": the rebuild is semantic; "Observers"), §6 phase 2 ("Nightmare and Hell 1 only"), §9; decisions D-V4-03, D-V4-04, D-V4-06; review RV1-03, RV1-04, RV1-11, RV2-14 (R2-14: the ledger lines), RV2-19 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T01b |
| Depends on | T01b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (synthetic cases only) |

## Goal

The provisional prototype replaced `selectClues` wholesale and, on the frozen source, fails at its first accepted
candidate (it returns no `skips`, drift DR-O08). This task rebuilds it as a fork of the frozen `selectClues`, so that
the frozen skip replay, recorders and their detail channel, work meter, repairs, centre rule and result shape stay as
they are, and P1 to P4 are added where the plan puts them. Only Nightmare and Hell 1 targets use it; every other level,
Hell 2 and Hell 3 included, keeps the frozen search. The provenance of the prototype's records is T02c's.

## Authority and fixed points

- Plan §3 P1 (the pseudocode of `locateCount`; the rescue with `rerateMax`), P2's contract (a screened run whose
  main-phase work is at most `W_screen` is the canonical rating; a run above it is screen-capped, steers only and is
  never accepted), P3, P4 (the table prior; `step0 = 1` with a prior, `U0` without); §6 phase 2 and IG-P-D6: Hell 2
  and Hell 3 are closed for this feature, so the scope is Nightmare and Hell 1.
- The measured prototype `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js` (read-only) is the
  reference for the shell `igSelectProto` (lines 104-137), phase A (450-726), phase B (728-757), phase C (759-765),
  phase D (805-827) and phase E (829-840), and for the helpers `nearestFirst` (79-81) and `priorCount` (89-95).
- The frozen `selectClues` is `core/engine/clues.js:257-773` at the base (the same text in
  `tests/artifacts/ig-proto/frozen-source/core/engine/clues.js`). Its contracts stay: `SelectContext` and
  `SelectResult` (clues.js:31-62), the `record` events (`core/engine/types.js:316-335`) with their `detail` from the
  same measurement, one `charge` per rating attempt and per repair count, before the event; `replaySkips` and
  `SkipReplayError`; `conclude`.
- RV1-04: a recorded rating keeps its detail from the same deduction (no second solve to fill it), on the new path
  and on the legacy path; the logging seam is never installed over the detailed path.
- Untouched: the `p1p5*` variants, `ig-select-proto.js`, `ig-log.js`, every production file.

## Scope

- Create:
  - `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js` (the fork, steps 1 to 7).
  - `tools/ig-proto/variants/v4.json`, `v4-w760.json`, `v4-w095.json`, `v4-w380.json` (step 8).
- Change: `tools/ig-proto/self-test.mjs` (a `--v4` group, step 9), `tools/ig-proto/README.md` (a section, step 10).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T02a --label frozen`,
  expected `files unchanged`; `git status --short -- tools/ig-proto/variants/files/p1p5 tools/ig-proto/variants/files/log tools/ig-proto/variants/p1p5.json tools/ig-proto/variants/log.json core generator`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T02a --label frozen`.
1. **Module** `ig-select-v4.js`: `// @ts-check`, a header comment naming this task, plan §3 P1 to P4 and D-V4-03 to
   D-V4-06, then exactly these imports:

   ```js
   import { appendFileSync } from 'node:fs';
   import { threadId } from 'node:worker_threads';

   import { activeCount } from './board.js';
   import { countRowLimit, makeUnique, SkipReplayError } from './clues.js';
   import { igRateDetailedWithLimits, IncompleteRatingError, inBand, measureV3, MODEL, rate, rateDetailed, scoreV3 } from './difficulty.js';
   import { IG } from './ig-params.js';
   import { endCall, igPhase, recordRating, startCall, withP6 } from './ig-log.js';
   import { clueKey } from './keys.js';
   import { bandEdge, levelForScore } from './levels.js';
   import { BUDGETS, DEDUCE, SCORE } from './policy.js';
   import { isValidLayout } from './tiling.js';
   ```

   `clues.js` and this module import each other (edit `v4-1`): no top-level statement of this module may read an
   import of `clues.js`; they are used only inside functions. The `log` trees run on Node only (`ig-log.js` imports
   `node:fs` too). `ig-params.js` is written by the tree builder from the
   variant's `params` (`tree.mjs:244-248`); `igRateDetailedWithLimits` is appended to the copy's `difficulty.js` by
   edit `v4-3`.
2. **Module-level definitions** (in this order):
   - The constants of `clues.js:77-85` except `SMALL_AREA`: `BEAM_WIDTH = 4`, `STALL_LIMIT = 12`,
     `SAMPLES_PER_COUNT = 4`, `COUNT_CHANGES = 8`, `MOVES_PER_MEMBER = 8`, `CENTRE_RESERVE = 16`.
   - `export const SKIP_BOUNDS_V4 = Object.freeze({ subsets: 2192, repairs: 64 });` (D-V4-04; literals because of the
     import cycle).
   - `class Final { constructor(res) { this.res = res; } }` and `const clamp = (x, lo, hi) => Math.min(hi,
     Math.max(lo, x));`.
   - Private copies of `bandDistance` (clues.js:222-229), `ranked` (234-240), `noProvedGuess` (245-249) and
     `sortLike` (781-784).
   - `export function nearestFirst(list, wc)`: the text of `ig-select-proto.js:79-81`.
   - `function priorCount(ctx, K)`: the text of `ig-select-proto.js:89-95`.
   - `export function v4Target(target) { return target.min >= bandEdge(6) && target.min < bandEdge(8); }` (53 to 111:
     Nightmare and Hell 1; Hell 2 starts at 112).
   - `const eventPhase = (phase) => (phase === 'p2' ? 'seed' : phase);` (the journal keeps the prototype's phase
     names, which `compare.mjs` reads; the events use `seed`, the frozen name of that phase, D-V4-06).
   - The work ledger (review R2-14, R2-07): count work is journaled by this module, independently of a caller's
     `charge`, on the file and row naming of `ig-log.js:42-48`:

     ```js
     function igLedgerLine(line) {
       const dir = process.env.IG_LOG_DIR;
       if (dir === undefined) {
         return;
       }
       const row = process.env.IG_ROW ?? 'unrowed';
       appendFileSync(`${dir}/${row}.${process.pid}.${threadId}.jsonl`, `${JSON.stringify(line)}\n`);
     }
     /** The capability line of a selection call: its count work is journaled (null: the legacy route's call). */
     export const igCapsLine = (callId) => igLedgerLine({ t: 'caps', call: callId, count: true });
     /** One uniqueness count of a repair, with its row trials (the units `charge` receives). */
     export const igCountLine = (callId, units) => igLedgerLine({ t: 'count', call: callId, units });
     ```
3. **`export function selectCluesV4(ctx)`** = the text of `igSelectProto` (ig-select-proto.js:104-137) with two
   changes: the search call is `withP6(ctx, () => searchV4(ctx, call, loc, W, call.priorCount, (r) => { logged = r;
   }), call)` (no inner `try`: `searchV4` handles `Final` itself), and `loc` gains `tables: { prior: IG.priorTable ??
   null, screen: IG.screenTable ?? null }` and `countWork: 0` (written on the journal's `end` line with `locate`);
   right after `startCall`, `igCapsLine(call.id)`. With `IG.p6` false
   (the `log` parameter) `withP6` only calls the search.
4. **`function searchV4(ctx, call, loc, W, prior, markNoWindow)`**, in this order:
   1. The frozen text of `clues.js:258-321` unchanged (the destructuring of `ctx`, `replay`, `source`, `K`, the two
      `RangeError` checks, `limit`, `rowLimit`, `seam`, `rateWith`, `refuseUnproved`, `finite`, `centre`, `halfWidth`,
      `tried`, `rated`, `inBandList`, `finals`, `profiles`, `unproved`, the ordinal and skip-replay counters,
      `origins`, the stall state, `bandOf`, `ownPoses`, `idsOf`).
   2. Then: `const screened = W < DEDUCE.work; const rerateMax = IG.rerateMax; const bandCentre = finite ? centre :
      target.min; const probes = []; const sideOfScore = (score) => (score < target.min ? 'below' : score >=
      target.max ? 'above' : 'in');` and, with its JSDoc `/** @type {(count: number) => number[]} The nested family
      of phase A, assigned there. */`, `let fam;` (RV1-11: `step` and the (c4) probe of T08 call it after phase A
      assigns it).
   3. Instead of the frozen `rateOnce` (clues.js:322-344), these closures:

      ```js
      const rateCanonical = (clues) => (ctx.igCanonical !== undefined
        ? { rating: ctx.igCanonical(clues), detail: null } : rateWith(board, pieces, clues, ws));
      const screenLimits = { deduce: { ...DEDUCE, work: W }, dlx: SCORE.caps };
      const rateScreen = (clues) => {
        if (ctx.igScreen !== undefined) {
          return { rating: ctx.igScreen(clues, W), detail: null };
        }
        if (seam !== undefined) {
          return { rating: seam(board, pieces, clues, ws), detail: null };
        }
        if (!screened) {
          return rateCanonical(clues);
        }
        if (record !== undefined) {
          return igRateDetailedWithLimits(board, pieces, clues, ws, screenLimits);
        }
        const { metrics } = measureV3(board, pieces, clues, ws, screenLimits);
        const value = scoreV3(metrics);
        return {
          rating: {
            model: MODEL, score: value, level: levelForScore(value).id, saturated: false,
            ...(metrics.censusComplete ? {} : { censored: true }), metrics,
          },
          detail: null,
        };
      };
      // One rating attempt: journaled, charged once before any event, and classified (P2's certificate).
      const rateOnce = (clues, mode, phase) => {
        let detail = null;
        let rating;
        try {
          rating = recordRating(call, phase, clues.length, () => {
            const o = mode === 'screen' ? rateScreen(clues) : rateCanonical(clues);
            detail = o.detail;
            return o.rating;
          }, mode === 'screen' && screened ? W : null);
        } catch (error) {
          if (!(error instanceof IncompleteRatingError)) {
            throw error;
          }
          charge?.(error.counters.work);
          return { capped: true, screenCapped: mode === 'screen' && screened };
        }
        const m = rating.metrics;
        charge?.(typeof m?.work === 'number' && Number.isFinite(m.work) ? m.work : 0);
        if (mode === 'screen' && screened && m.work - m.censusWork > W) {
          return { capped: true, screenCapped: true };
        }
        return { capped: false, rating, detail };
      };
      ```

      A screened run that passes the certificate is the canonical measurement, so its detail from
      `igRateDetailedWithLimits` is the canonical detail; a screen-capped run reports no rating and no detail.
   4. The frozen text of `clues.js:346-387` unchanged (`subsetSkipped`, `repairSkipped`, `verifyConsumed`).
   5. Instead of the frozen `rateSubset` (clues.js:389-437), `rateSubset(idx, phase)`: the frozen text up to and
      including the `skip` branch, with these lines after `subsetOrdinal += 1;`:

      ```js
      if (ordinal >= SKIP_BOUNDS_V4.subsets) {
        throw new Error(`ig-select-v4: subset ordinal ${ordinal} reaches the bound ${SKIP_BOUNDS_V4.subsets}`);
      }
      ```

      then `const out = rateOnce(clues, 'screen', phase); profiles += 1;` and a probe `p = { n: probes.length,
      ordinal, phase, count: clues.length, idx, clues, key, kind: 'rated', dir: 'above', screenCapped: false, rerated:
      false, score: null, cand: null }` pushed on `probes`, then:
      - `out.capped`: `p.kind = 'too-few'`, `p.screenCapped = out.screenCapped`; the event `{ stage: 'clues', kind:
        'unrateable', source, phase: eventPhase(phase), sequence: ordinal, clueIds: idsOf(clues), reason:
        out.screenCapped ? 'screen-capped' : 'path-capped', band: bandOf() }`; return `p`.
      - else, with `const { rating, detail } = out;`: `p.score = rating.score`, `p.dir = sideOfScore(rating.score)`;
        refused by AR1 (`refuseUnproved && noProvedGuess(rating)`): `p.kind = 'ar1'`, the frozen `rejected` event
        with `phase: eventPhase(phase)` and `detail`; return `p`.
      - else `onRate` and the frozen `rated` event (`phase: eventPhase(phase)`, `rating`, `detail`), `p.cand = { idx,
        clues, rating, key, seq: ordinal }`, `rated.push(p.cand)`; return `p`.
   6. The frozen text of `clues.js:439-648` (`finish`, `conclude`, `finishOnce`, `central`, `chooseBest`,
      `afterProfile`, `sample`) with three changes. In `finish`, the `makeUnique` hook `onCount: charge` becomes
      `onCount: (u) => { igCountLine(call.id, u); loc.countWork += u; charge?.(u); }` (the count is journaled with or
      without a caller's `charge`; no hook of the caller is installed). In `decide`: `const out = rateOnce(clues, 'canonical', 'repair'); if
      (out.capped) { return { final: null, outcome: refusal('path-capped') }; }` replaces the frozen `rateOnce` call
      and its null test (the frozen code then reads `({ rating, detail } = out)`). In `conclude`: the returned object
      is `{ ...r, skips: { subsets: subsetSkips.slice(), repairs: repairSkips.slice() }, igWindow: { c0: loc.c0, wc:
      loc.wc, hit: loc.hit, hiBelow: loc.hiBelow, loAbove: loc.loAbove, probes: loc.probes, result: loc.result, proof:
      loc.noWindowProof } }`.
   7. `step(idx, phase)`: the text of `ig-select-proto.js:414-430` with `rateSubset` for `probe`.
      `rerate(p, phase)`: `p.rerated = true; call.rerates += 1; const out = rateOnce(p.clues, 'canonical', phase);`
      (no ordinal, no profile, D-V4-04); `out.capped`: the event `unrateable` with `sequence: p.ordinal`, `phase:
      eventPhase(phase)`, `reason: 'path-capped'`, and return `{ count: p.count, kind: 'too-few', dir: 'above', cand:
      null, score: null, screenCapped: false }`; else, with `const { rating, detail } = out;` and `const refused =
      refuseUnproved && noProvedGuess(rating);`, the `rejected` event (when `refused`, reason `no-proved-guess`) or the
      `rated` event (with `sequence: p.ordinal`, `phase: eventPhase(phase)`, `rating`, `detail`, `clueIds:
      idsOf(p.clues)`, `band: bandOf()`) and return `{ count: p.count, kind: refused ? 'ar1' : 'rated', dir:
      sideOfScore(rating.score), score: rating.score, screenCapped: false, cand: refused ? null : { idx: p.idx, clues:
      p.clues, rating, key: p.key, seq: p.ordinal } }`. `adopt(r)`: the text of `ig-select-proto.js:433-445`.
   8. The search, inside `try { ... } catch (e) { if (e instanceof Final) { return conclude(e.res); } throw e; }`:
      - Phase A: the text of `ig-select-proto.js:450-726` without `bisectA3` and without the `useA3` branch of
        `bisect`, where `const fam = ...` (line 453) becomes the assignment `fam = ...` at the same point (the shuffle
        keeps its place in the rng sequence); `failNoWindow(proof)` is the prototype's with `verifyConsumed();` as its
        first statement.
      - Phase B: `ig-select-proto.js:728-757`. Phase C: `ig-select-proto.js:759-765` (journal phase `p2`).
      - `neighbours`: the frozen text of `clues.js:699-740`.
      - Phase D: `ig-select-proto.js:805-827`; phase E: `ig-select-proto.js:829-840`. The two `return best;` (lines
        826 and 839) become `return conclude(best);`; the end is `verifyConsumed();` and `return { ok: false, reason:
        unproved ? 'uniqueness-not-proved' : 'not-in-band' };`.
5. **Ordinals.** One subset-ordinal sequence (D-V4-04): every `rateSubset` call takes the next ordinal in call order;
   a repeated subset takes none; `rerate` takes none. The bound holds for every set of at most 128 pieces (the pack
   format's `MAX_PIECES`, so every generated or imported set), whatever the target: phase A has at most 27 `side`
   calls (one first side; a march of at most 7 sides, since 1 + 2 + ... + 64 = 127 covers any count from 1 to 126;
   a bisection of at most 6 sides over the march's last gap of at most 64; and, after a rescue, at most 7 + 6 more),
   each of at most two ordinals (family subset, then a sample), plus at most two for T08's (c4) probe: at most 56;
   phases B, C and D use at most the frozen 2,128 (32 + 16 + 65 x 32); so every ordinal is below 2,184 < 2,192. A
   larger input makes the assertion of step 4.5 fail the call, never a silent overflow.
6. **Events** (D-V4-06): the kinds stay the frozen ones; the `phase` of an event is `locate`, `window`, `seed`,
   `beam`, `rescue` or `rerate` (T08 adds `close` and `below`); the `unrateable` reasons are `path-capped` and
   `screen-capped`. A rated or rejected event has the detail of its own measurement whenever a recorder is set and no
   synthetic seam (`ctx.rate`, `ctx.igScreen`, `ctx.igCanonical`) replaces the rating.
7. **Detail export** (in the copy's `difficulty.js`, edit `v4-3`; RV1-04, R04):

   ```js

   // ig-proto, variant v4 (V4-T02a): the detail channel of a screened rating, from the same measurement.
   /**
    * @param {Board} board
    * @param {Piece[]} pieces
    * @param {Pose[]} clues
    * @param {Workspace} ws
    * @param {{ deduce: DeductionLimits, dlx: { branch: number, rows: number } }} limits
    * @returns {{ rating: RatingV3, detail: RatingDetail }}
    */
   export function igRateDetailedWithLimits(board, pieces, clues, ws, limits) {
     const { metrics, detail } = measureV3Core(board, pieces, clues, ws, limits, true);
     return { rating: ratingOf(metrics), detail: /** @type {RatingDetail} */ (detail) };
   }
   ```

8. **Variants.**
   - `v4.json`: `"id": "v4"`, `"extends": ["log"]`, `"description"`: "gen-v4 prototype on the frozen selectClues
     (V4-T02a): Nightmare and Hell 1 targets use selectCluesV4, the others the frozen search. W 190 M.",
     `"files": ["v4"]`, `"paramFiles": { "prior": "data/prior-v1.json" }`, `"params": { "logAccepted": true, "U0": 8,
     "rerateMax": 4, "W": { "default": 190000000 }, "priorTable": "prior-v1", "screenTable": "w190" }`, and the edits:

     | Id | File | Find | Replace |
     |---|---|---|---|
     | `v4-1` | `core/engine/clues.js` | `import { igDispatch, igPhase } from './ig-log.js';\n` | the same line, then `import { igCapsLine, igCountLine, selectCluesV4, v4Target } from './ig-select-v4.js';\n` |
     | `v4-2` | `core/engine/clues.js` | `  return igDispatch(ctx, selectCluesV3);\n` | `  if (v4Target(ctx.target)) {\n    return selectCluesV4(ctx);\n  }\n  igCapsLine(null);\n  return ctx.record !== undefined ? selectCluesV3(ctx) : igDispatch(ctx, selectCluesV3);\n` |
     | `v4-3` | `core/engine/difficulty.js` | append | the block of step 7 |
     | `v4-4` | `core/engine/clues.js` | `      onCount: charge,\n` | `      onCount: (u) => { igCountLine(null, u); charge?.(u); },\n` |

     With a recorder the legacy route calls the frozen search directly (its native detailed path); the journaled
     route is for unobserved calls (RV1-04). An explicit `ctx.rate` seam keeps its priority in both routes and on the
     screened path (RV2-19). `v4-2` and `v4-4` give the legacy route its ledger lines (a `caps` line and one `count`
     line per count, with `call: null`); its ratings are journaled by `igDispatch` when no recorder is set.
   - `v4-w760.json` (`"extends": ["v4"]`, `"params": { "W": { "default": 760000000 }, "screenTable": "none" }`: no
     screen), `v4-w095.json` (`W` 95,000,000, `screenTable` `w095`) and `v4-w380.json` (`W` 380,000,000,
     `screenTable` `w380`). Each with `"edits": []`, `"files": []` and a one-line description.
9. **Self-test** `--v4`: add the switch to `parseArgs`'s switches; with it only the group `v4Cases` runs; the default
   task is `V4-T02a`. `v4Call(name, spec)` is a copy of `protoCall` (self-test.mjs:521-551) whose default `variant` is
   `'v4'`; it uses `k15Set()` unchanged and calls the tree's `e.clues.selectClues`, which sends `BAND` (`min` 55) to
   `selectCluesV4`. Cases in the Tests table.
10. **README.md**: a section "## The `gen-v4` prototype on the frozen source (task pack v4)": the fork and the lines
    it keeps, the dispatch rule (Nightmare and Hell 1; the recorded legacy route), the four variants and their `W`, the
    journal phases (`locate`, `rescue`, `window`, `p2`, `beam`, `rerate`, `repair`) and the event phases and reasons
    of D-V4-06, the ordinal bound of step 5, the detail export, and the ledger lines (`caps`, `count`) with the
    end line's `locate.countWork`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --v4` | `v4: tree, dispatch and bounds` | `ensureTree` of `v4`, `v4-w760`, `v4-w095`, `v4-w380`; the `v4` tree's `ig-select-v4.js`, `clues.js`, `difficulty.js`, `tools/bench/report.js` | `v4` chain `base>instr>log>v4`; `SKIP_BOUNDS_V4.subsets === SKIP_BOUNDS.subsets + 64` and `SKIP_BOUNDS_V4.repairs === SKIP_BOUNDS.repairs`; `v4Target` false for `min` 52, true for 53, 55, 77 and 111, false for 112 and 162; `typeof igRateDetailedWithLimits === 'function'`; `params.W.default` 190,000,000 / 760,000,000 / 95,000,000 / 380,000,000; `report.js` contains `core/engine/ig-select-v4.js` |
| same | `v4: P1 locate, rescue and re-rating order (synthetic)` | the `nearestFirst` check and the eleven calls of the provisional case `proto: P1 locate, rescue and re-rating order (synthetic)` (self-test.mjs:587-653), with `v4Call` for `protoCall` and the same arguments | every expected value of that case unchanged; `nearestFirst` imported from the `v4` tree's `ig-select-v4.js` |
| same | `v4: the result carries skips and the window` | `v4Call('window6', { prior: 6, screen: down })` with `down` as in that case | `result.ok` true; `result.skips` deep-equals `{ subsets: [], repairs: [] }`; `result.igWindow` deep-equals `{ c0: 6, wc: 4, hit: 4, hiBelow: null, loAbove: null, probes: 4, result: 'hit', proof: null }`; the `end` line's `locate.tables` deep-equals `{ prior: 'prior-v1', screen: 'w190' }` and `locate.countWork` is 0; the journal has exactly one `caps` line, `{ t: 'caps', call: <the start line's call>, count: true }`, and no `count` line (`any` mode counts nothing) |

The third row follows from the probes `6, 5, 3, 4` (scores 40, 50, 70, 60 in the band 55 to 70): the 4-clue probe is
central and ends the call through `Final` inside phase A, so `hiBelow` and `loAbove` are not written (as in the
prototype). If a run differs, report the probe list (`QUESTION:`); do not change the test. The detail path (step 3's
recorded screen and the recorded legacy route) is proved on real calls in the approved stage-1 runs (T04e, with the checks of T04a to T04d), not
here: the synthetic seams have no detail by design.

## Documentation

`tools/ig-proto/README.md` (step 10). No production document changes.

## Commands and gates

The `--v4` group runs through the lock helper (check-list §3.1 and §3.2): from T02b on it runs real uniqueness counts,
and this task's cases run with it.

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs build v4 v4-w760 v4-w095 v4-w380 --label frozen` | root | four lines `<id> <treeId> <copyDigest> built` | 3 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error; report the printed counts | 2 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T02a verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T02a')` (check-list §3.2) | root | three cases pass, exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T01b` | root | the `--frozen` cases still pass | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T02a --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a `p1p5*` or `log` variant, `ig-select-proto.js`, `ig-log.js` or a production
  file (none is needed).
- `QUESTION:` when a ported case gives other values than the provisional case; when the frozen text at a cited line
  range differs from this task's description.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02a-B01 | The frozen round can measure P1 to P4 on the frozen source with the frozen contracts in place | the three `--v4` cases | self-test output |
| T02a-B02 | Very easy to Master, Hell 2 and Hell 3 keep the frozen search in the prototype's trees | `v4Target` in case 1; the edit `v4-2` | self-test output; diff |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02a-T01 | The locate, rescue and re-rating sequences equal the measured prototype's on the same synthetic inputs | case 2, expected values unchanged | self-test output |
| T02a-T02 | Results carry `skips` and `igWindow`; every rating attempt goes through `rateOnce` (one `charge`, before the event) | case 3; review of `rateOnce`, `rateSubset`, `rerate`, `decide` | self-test output; diff |
| T02a-T03 | Event kinds, phases, reasons and the detail rule as step 6 (D-V4-06) | review against `types.js:316-335` and step 3 | diff |
| T02a-T04 | Ordinal bound and assertion as step 5; `fam` declared before `step` | case 1; review | self-test output; diff |
| T02a-T05 | Nothing else changed; formats | guards; `npm run check` | command output |

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

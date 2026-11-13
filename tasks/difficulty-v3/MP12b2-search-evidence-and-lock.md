# MP12b2 — Search evidence, the Hell report, the owner's questions and the lock

| Header | Value |
|---|---|
| ID | MP12b2 (third part of the report's MP12; the **lock** of the v3 rating tuple, which MP12b3 completes) |
| Depends on | MP12b1 (accepted and committed: `docs/difficulty-v3/landscape-v3-full/` with the aggregate and its three lists) |
| Estimated size | Medium–Large: about 600–1,000 changed lines (`observe.mjs` given, `summary.mjs` about 150, `flow-case.mjs` about 20 changed lines of a copy, `failfast.mjs` with its self-test about 200, the record about 300, design §7.8 about 30; re-pins only in an ordered change round); about 60–90 minutes of developer work plus machine time under the lock protocol (cross-review TP20; the waits for the Sudoku repository and at least 15 s per lock release come on top). Expected, with the upper bound of the limits in brackets: GS-P3 R and A 20 captures, 20–40 minutes [190], plus two more captures for each 18x20 cell of R without a puzzle (PR-P1), up to 6 [57]; H five, 25 minutes [25]; HL 20 diagnostic replays, 60–90 minutes [190] (TP23); the availability probe again, six captures, about 16 minutes [57] (TP25: MP12a changed `core/engine/policy.js` after `eea5fed`, so MP09d2's observations cannot be reused); the final lock commands about 10 minutes. An ordered change round reruns the complete population (TP30, TP32): about 12–18 hours more (the landscape 7.5–12.5 hours, the slice probe corpus 20–35 minutes, GS-P3 about 2–3 hours, re-pins, checks, GF-P2 and GA-P2 about 30 minutes), projected to the orchestrator before it starts |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (the record: repaired candidates, capped outcomes; the lock), RES-01 (what the lock means), RES-26, RES-35; RES-15a and Part I D21 ("MP12 reports, per Hell cell, the ratings per puzzle and the generation time under v3"); Part I D36 and P-OD5, **decided (i) by P-OD9** (no D36 question here; the fail-fast table is still put to the owner); clarifications PROC-P1 (a), SA2-Q-P09 (branch A), P-OD1, P-OD2, P-OD3; Part I D37 and P-OD6, changed by P-OD9 (the Hell population); **Part I PR-P1** (the plan author's answer: the tuple to lock, R7, the census findings, population R, the change-round rule); check-list §4.2 D21, D29, D35 to D41 and §7 (the shared-machine lock protocol); cross-review SP16, SP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) and TP20, TP23, TP24, TP25, TP26, TP28 (its MP12 tranche), TP30, TP32, TP33 (its re-verification), TP34 (its final verification) |
| Gates owned | GS-P3 (search evidence, new; check-list §7); GA-P2 (the final `npm test`); GF-P2 and GA-P2 again only in an ordered change round |
| Implementation status | Not started |

## Goal & business context

The calibration record must say not only what the landscape produced but how the search got there (RES-25:
repaired candidates, capped outcomes; cross-review SP16): how many clue sets were rated, refused for lack of a proved
guess (AR1), unrateable, repaired, per selection and per accepted puzzle. The plan author also asked for the Hell
cells' ratings per puzzle and generation time under v3 (D21), and for a measured fail-fast proposal, so that a request
that cannot succeed ends in seconds with a clear notice instead of after two minutes. MP09d2 found the stall stop
**not** inert: it fired on 10 `any`-mode calls at N = 12 and `STALL_LIMIT` stays 12 (its record §5.5). Population S,
the re-examination of an inert rule, is therefore skipped on this source, and the record says why (cross-review TP28).

The owner has decided D36 (P-OD9, recorded in the plan author's answer to PR-P1): option (i), stop offering what v3
cannot make. This task therefore asks no D36 question: it records the Hell evidence and derives, by the rule of
check-list D39, the Hell areas that MP12b3 sets. It still puts three things to the owner, with their numbers: the
fail-fast table (the plan author recommends F1 + F2, built in MP12b3); population R, the 18x20 Hard, Expert and Master
requests with `--uniqueness require`, because it decides whether "Hard is really hard" holds on large boards when a
unique solution is required (in the v2-made corpus none of those puzzles had a decisive guess); and a landscape cell
with more than 25 % census estimates, if there is one.

Then the task writes the calibration record and **locks the tuple** `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)`
with `DEDUCE`, `STALL_LIMIT`, `K60` and `SHARES` (the plan author's answer to PR-P1: this tuple, unless MP12b1 broke
C1 or C3): after it no knob, cap, rule, counter, clue-search setting, `SHARES` or `K60` may change without a new
model, algorithm or policy id and a new qualification (RES-01). MP12b3 completes the lock with the changes decided
for availability (the Hell `AREAS`, the fail-fast when the owner agrees, the population-R outcome when the owner
accepts it); from MP12b3's commit on, MP13a to MP17 must not change any rating or generated puzzle (check-list D35).

## Scope

### In scope

- Gate GS-P3: the search-evidence captures (populations R, A, H, the Hell companion HL and, only when a recorded D21
  decision says "inert on the v3 corpus", S), their summary and self-test, and the fail-fast check `failfast.mjs` with
  its self-test.
- The evidence provenance and the availability probe again under the final tuple (cross-review TP25; MP09d2's
  observations cannot be reused, see "Evidence provenance and the final tuple").
- The stall re-examination (only under that recorded decision; skipped on this source, TP28).
- The Hell availability record and the derived areas of check-list D39 (no owner question); the owner questions on the
  fail-fast, on population R and on census cells above 25 %, in the record and the reply.
- The record `docs/difficulty-v3/calibration-<date>.md` (the whole calibration: MP12a and MP12b1 by reference with
  their numbers, the search evidence, the Hell report, the questions, the final values, the lock).
- `docs/design-detail.md` §7.8 (measured parameters, R7 as a known limitation, the census findings and the lock).
- The lock's evidence: `record-fixtures --check` and the final `npm test` (GA-P2).

### Out of scope

- A knob, cap, `STALL_LIMIT` or fixture change, unless the orchestrator orders a change round (below).
- The Hell `AREAS`, design §7.5, the guides, the fail-fast and the population-R outcome: MP12b3 implements them from
  this task's record and the owner's answers.
- Any algorithm change (RES-25: not allowed without a new decision).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Heavy runs exactly as written below, each through the helper `Invoke-Dv3Timed` of check-list §7 "Shared-machine lock
  protocol" (cross-review TP20; save it verbatim as `tests/artifacts/MP12b2/dv3-lock.ps1` and dot-source it in every
  call): one capture or command per acquisition of the lock, at most 590 s (the capture limits below), at least 15 s
  between releasing the lock and taking it again (the helper waits), never a lock held across a series. The dispatch
  of this task is its slot; the lock interleaves its runs with the Sudoku repository's. Write the plan of each block
  (captures, expected wall time) into `runs.md` before starting it.
- A capture that reaches its own limit is a recorded outcome ("stopped at the limit", reduced, its lines kept); any
  other command stopped at its limit, an unexpected exit or a changed source identity inside a block stops the work:
  report it.
- **Stops and questions (owner decision P-OD9, check-list D38).** The task stops for the owner only for a correctness
  failure or when it would have to change a recorded decision. A performance or availability finding (a slow cell, a
  cell without puzzles, a capture that made nothing, a census share above 5 %) is a named item with its numbers in the
  record (§13), never a stop. The owner questions of this task (the fail-fast, population R, a census cell above 25 %)
  are put in the reply; the task does not wait for their answers: it locks the tuple, and the orchestrator gives the
  answers to MP12b3.
- Records are written once; nothing under `docs/difficulty-v3/landscape-v3/`, `landscape-v3-full/`, `baseline-v2/`,
  `d21-2026-11-12/`, `d21-v3-2026-11-12/` or the earlier records is edited. UTF-8 without BOM, CRLF, no absolute path
  in a record.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md` or the reports.

## Inputs & context

- MP12b1: `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json|.md` (the protocol coverage and the three
  lists: cells without a puzzle, one-sided cells, census cells), `shards-<date>.md` and the published reports (the
  selected report of each case is named in the coverage table); the source identity the landscape ran on.
- MP12a: `docs/difficulty-v3/calibration-slice-<date>.md` (criteria, changes, P-OD1 to P-OD3 outcomes, P-OD7 and
  P-OD8, the PR-P1 rows of its §8.6, findings), the
  launcher `docs/difficulty-v3/landscape-v3/launch.mjs` and its "Run control" (used read-only, only in an ordered
  change round), its table "The D36 and fixture re-pins" (TP26), and, for an ordered change round only, its criteria
  script `docs/difficulty-v3/landscape-v3/criteria.mjs` (read-only), "The probe corpus of a round" with its adapted
  driver under `tests/artifacts/MP12a/`, and the final round's folder `docs/difficulty-v3/landscape-v3/r2/` behind
  record §4 (TP30).
- MP09d2: `docs/difficulty-v3/d21-v3-2026-11-12.md` (the `STALL_LIMIT` decision, "inert on the v3 corpus" or not,
  the Hell outcomes, the availability probe, the two-worker time of the failing Hell recipe) and its folder
  `docs/difficulty-v3/d21-v3-2026-11-12/` (`nostall.mjs`, `spent.mjs`, `avail.mjs`, `summarise.mjs`; its `Capture`
  function is replaced here by one on the lock helper). Its outcome: `STALL_LIMIT` stays 12 and the rule is not inert
  (it fired on 10 `any`-mode calls at N = 12, §5.5), so population S is skipped and record §8 says why; of the Hell
  cells it measured, only Hell 1 on the 164-cell board made a puzzle (§4, §6); the recipe is `square-22x22-nightmare`
  and MP07's 15 x 20 slow test runs Nightmare (§3).
- The D21 drivers, read only and run from where they are: `docs/difficulty-v3/d21-2026-11-12/register.mjs` (the
  observer: one `call` line per `selectClues` call with `target`, `mode`, `ratings` (the `onRate` sequence: `s`, `c`,
  `t` …), `repairs`, `ms` and `result` (`ok`, `s`, `n`, `ri` = 1-based index of the result among the rated subsets,
  null when the result is not a rated subset, `cert`)), `flow.mjs` (`--board <cols>x<rows> --level <id> --seed <text>
  --quantity <n> [--uniqueness require] --label <name>`: the serial set request and one batch, with `set-attempt`
  (`j`, `ok`, `reason`, `ms`), `set` (`K`, `calibrationScore`, `setMs`) and `end` (`status`, `accepted`, `scores`,
  `setMs`, `foldMs`, `totalMs`) events) and `simulate.mjs`. `flow.mjs --board` takes only a full rectangle; the
  companion HL uses `flow-case.mjs` (below), a copy that takes a landscape case id.

### The observer `docs/difficulty-v3/search-<date>/observe.mjs` (exactly)

```js
// MP12b2 search observer (cross-review SP16, TP07): the D21 observer (../d21-2026-11-12/register.mjs) plus, after
// each selectClues call line, one line { kind: 'attempts', tag, list, finishes } with every rating attempt and every
// finish of the call, in order. No product file is changed: a load hook brackets the `finish` closure of
// core/engine/clues.js in memory, so repair ratings and repair outcomes are known, never inferred.
//   list: { ph, f, c, o, s, g, t, cc, w, ms } per rating attempt. ph: 'raw' (a search subset) or 'repair' (the
//     re-rating of a repaired set inside finish f; f is null for 'raw'); c: clues; o: 'rated' (a raw subset passed to
//     onRate, or a repair rating that passed AR1), 'refused' (Gproved 0 at Hard or above, AR1), 'capped' (the rating
//     threw IncompleteRatingError); s, g, t, cc: score, Gproved, deductionTier, censusComplete; w: metrics.work, or
//     counters.work of a capped rating; ms: the elapsed time of this rating alone (0.1 ms).
//   finishes: { f, c0, ri, o, c1, s, sel, ms } per finish (at most one per candidate). c0: clues of the candidate;
//     ri: its 1-based index among the raw rated subsets; o: 'raw' (any mode), 'unique' (require: already unique, the
//     raw subset is the result), 'repaired' (require: clues added, re-rated and accepted), 'not-unique' (the repair
//     gave up), 'capped' or 'refused' (the repair rating), 'rejected' (the repaired set left the band or has an
//     excluded key); c1, s: clues and score of the final result (null when none); sel: true for the finish whose
//     result the call returned (object identity); ms: the elapsed time of the finish (repair and re-rating).
// Use: node --import <this file> <driver>
import { appendFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '../d21-2026-11-12/register.mjs';

const root = resolve(process.env.D21_ROOT ?? '.');
const out = process.env.D21_OUT;
const { rate: defaultRate } = await import(pathToFileURL(join(root, 'core', 'engine', 'difficulty.js')).href);
const { bandEdge } = await import(pathToFileURL(join(root, 'core', 'engine', 'levels.js')).href);
const observe = globalThis.__d21Tap;

const FINISH = '  const finish = (c) => {';
registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (!url.endsWith('/core/engine/clues.js')) {
      return result;
    }
    const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
    if (source.split(FINISH).length !== 2) {
      throw new Error('MP12b2 observer: the finish closure of selectClues was not found exactly once');
    }
    globalThis.__mp12FinishHooked = true;
    const bracket = '  const finish = (c) => (globalThis.__mp12Finish === undefined ? finishInner(c)'
      + ' : globalThis.__mp12Finish(c, finishInner));\n  const finishInner = (c) => {';
    return { ...result, source: source.replace(FINISH, bracket) };
  },
});

/** @param {number} started */
const since = (started) => Math.round((performance.now() - started) * 10) / 10;

globalThis.__d21Tap = (/** @type {any} */ ctx, /** @type {(c: any) => any} */ inner) => {
  if (globalThis.__mp12FinishHooked !== true) {
    throw new Error('MP12b2 observer: core/engine/clues.js was loaded before the observer');
  }
  const rate = ctx.rate ?? defaultRate;
  const hardOrAbove = ctx.target.min >= bandEdge(3);
  /** @type {any[]} */
  const list = [];
  /** @type {any[]} */
  const finishes = [];
  /** @type {any[][]} the clue arrays passed to onRate, in order */
  const rated = [];
  /** @type {Map<any, any>} the result object of each accepted finish */
  const results = new Map();
  /** @type {any} */
  let current = null;
  const counting = {
    ...ctx,
    rate: (/** @type {any} */ b, /** @type {any} */ p, /** @type {any[]} */ clues, /** @type {any} */ w) => {
      const entry = {
        ph: current === null ? 'raw' : 'repair', f: current === null ? null : current.f, c: clues.length, o: 'pending',
        s: null, g: null, t: null, cc: null, w: null, ms: 0,
      };
      list.push(entry);
      const started = performance.now();
      try {
        const r = rate(b, p, clues, w);
        const m = r.metrics ?? {};
        Object.assign(entry, {
          s: r.score, g: m.Gproved ?? null, t: m.deductionTier ?? null, cc: m.censusComplete ?? null, w: m.work ?? null,
        });
        if (entry.ph === 'repair') {
          entry.o = hardOrAbove && entry.g === 0 ? 'refused' : 'rated';
        }
        return r;
      } catch (e) {
        entry.o = /** @type {any} */ (e)?.code === 'rating-incomplete' ? 'capped' : 'error';
        entry.w = /** @type {any} */ (e)?.counters?.work ?? null;
        throw e;
      } finally {
        entry.ms = since(started);
      }
    },
    onRate: (/** @type {any[]} */ clues, /** @type {any} */ rating) => {
      const last = list[list.length - 1];
      if (last !== undefined && last.ph === 'raw' && last.o === 'pending') {
        last.o = 'rated';
      }
      rated.push(clues);
      ctx.onRate?.(clues, rating);
    },
  };
  const finishTap = (/** @type {any} */ c, /** @type {(c: any) => any} */ finishInner) => {
    const entry = {
      f: finishes.length, c0: c.clues.length, ri: rated.indexOf(c.clues) + 1 || null, o: 'pending', c1: null, s: null,
      sel: false, ms: 0,
    };
    finishes.push(entry);
    const before = list.length;
    const started = performance.now();
    current = entry;
    /** @type {any} */
    let result;
    try {
      result = finishInner(c);
    } finally {
      current = null;
      entry.ms = since(started);
    }
    const inside = list.slice(before);
    if (result !== null) {
      entry.c1 = result.clues.length;
      entry.s = result.rating.score;
      entry.o = ctx.uniqueness === 'any' ? 'raw' : result.clues === c.clues ? 'unique' : 'repaired';
      results.set(entry, result);
    } else if (inside.length === 0) {
      entry.o = 'not-unique';
    } else {
      const last = inside[inside.length - 1];
      entry.o = last.o === 'capped' || last.o === 'refused' ? last.o : 'rejected';
    }
    return result;
  };
  globalThis.__mp12Finish = finishTap;
  /** @type {any} */
  let result;
  try {
    result = observe(counting, inner);
  } finally {
    globalThis.__mp12Finish = undefined;
  }
  for (const a of list) {
    if (a.o === 'pending') {
      a.o = 'refused';
    }
  }
  for (const f of finishes) {
    f.sel = results.get(f) === result;
  }
  if (out !== undefined) {
    appendFileSync(out, `${JSON.stringify({ kind: 'attempts', tag: globalThis.__d21Tag, list, finishes })}\r\n`);
  }
  return result;
};
```

Repairs are observed, never inferred (cross-review TP07): a rating made inside a `finish` call is a `repair` attempt
of that finish, and the finish entry says what happened to the candidate and whether its result is the one the call
returned (`sel`, by object identity). The register's `result.ri` cannot tell a repair: a repaired set may itself be
one of the rated subsets (the `repair-ri-0` case below), and a call may return a later raw result after a refused
repair (`S4`). Each attempt carries its own elapsed `ms` (in the register's `ratings`, `t` is the time between
successful raw ratings; in `list`, `t` is the deduction tier): the time per unrateable rating is the `ms` of the
`capped` attempts.

Definitions used by the summary and the record:

- **Repair attempt**: a finish in `require` mode (`o` other than `raw`); denominator of the repair rates.
- **Successful repair**: a finish with `o === 'repaired'` (clues added, re-rated, in band, AR1 passed).
- **Result from a repair**: a call whose selected finish (`sel`) has `o === 'repaired'`; denominator: the
  `require`-mode calls with `result.ok`.

### The summary `docs/difficulty-v3/search-<date>/summary.mjs` (write it to this contract)

- `node ./<folder>/summary.mjs <files...>` reads the JSONL files (lines of kind `call`, `attempts`, `event`; pairs each
  `attempts` line with the `call` line before it, which has the same `tag`) and prints Markdown, ASCII only. Per file,
  one row with: selection calls (`any` and `require`); raw attempts by outcome (`rated`, `refused`, `capped`); repair
  attempts by the outcome of their rating (`rated`, `refused`, `capped`); finishes by outcome (`raw`, `unique`,
  `repaired`, `not-unique`, `capped`, `refused`, `rejected`); successful repairs over repair attempts; results from a
  repair over the `require`-mode calls with a result; set attempts ok and failed; accepted puzzles (`end.accepted`; in
  a file without an `end` event, the `slot` of its last `accepted` event, else the `fold-start` event's
  `fromCalibration`, else 0, marked censored with `*`: puzzles accepted from the calibration have no `accepted`
  event); attempts per accepted puzzle (all attempts of the file's completed calls, raw and repair, divided by the
  file's own accepted puzzles, marked `*` when censored; `-` when none: unavailable, never 0); the share of `capped`
  among all attempts; the median and largest `work` and `ms` of the capped attempts and the median and largest `ms` of
  the rated ones; call time (`ms` of the `call` line) median and maximum; `setMs`, `foldMs` and `totalMs` of the `end`
  event (an `end` with status `set-failed` has only `setMs`: accepted 0, `foldMs` `-`, `totalMs` = `setMs`; a file
  with a `start` but no `end` event shows "stopped at the limit", the `set` event's `setMs` when there is one, and the
  completed calls only; a file without a `start` event, such as the self-test's own file, shows `-` in the columns of
  set attempts, accepted puzzles, attempts per accepted puzzle and the three times). Then a TOTAL row per population
  folder (`require`, `any`, `hell`, `hell-landscape`, `stall`); a ratio is never formed across files of different
  populations. Every column states its denominator in the header.
- `--self-test` (run as `node --import ./<folder>/observe.mjs ./<folder>/summary.mjs --self-test` with `D21_OUT` set
  to a new file under `tests/artifacts/MP12b2/`) imports, only in this mode and with dynamic `import()` from
  `D21_ROOT` (default the working directory) as `register.mjs` does: `core/engine/board.js` (`boardFromRows`),
  `core/engine/clues.js` (`selectClues`), `core/engine/difficulty.js` (`IncompleteRatingError`),
  `core/engine/levels.js` (`levelForScore`), `core/engine/rng.js` (`createRng`), `core/engine/workspace.js`
  (`createWorkspace`, `MAIN_WORKSPACE_BYTES`), `tests/fixtures/clue-recipes.js` (`RECIPE_BOARD_ROWS`,
  `recipeWitness`) and `tests/fixtures/polyominoes.js` (`CLASSIC_PENTOMINOES`). It calls `selectClues` four times on
  the 10 x 6 recipe fixtures of `tests/clues.test.js` (`boardFromRows([...RECIPE_BOARD_ROWS])`,
  `[...CLASSIC_PENTOMINOES]`, `recipeWitness()`) with the literal Hard target `{ min: 17, max: 25, share: 0.38 }`
  (today's `level('hard')`, written out so that a `SHARES` change of MP12a cannot move the cases),
  `uniqueness: 'require'`, `excludeClueKeys: new Set()`, `ws: createWorkspace(MAIN_WORKSPACE_BYTES)`, the rng of the
  table, and a scripted `rate`: an entry `[score, Gproved]` returns `{ model: 'difficulty-v3', score, level:
  levelForScore(score).id, saturated: false, metrics: { U: pieces.length - clues.length, Gproved } }`, `'capped'`
  throws `new IncompleteRatingError('the deduction path was capped', { nodes: 5, work: 7, stop: 'work-cap' })`, a
  clue count without an entry throws an `Error`. `globalThis.__d21Tag` is set to the case name before each call.
  Then it reads the file back and asserts, per case: the `attempts` line's `list`, each attempt written
  `<ph>:<c>:<o>` and joined with spaces; its `finishes`, each written `<c0>@<ri>:<o>`, then `><c1>` when `c1` is not
  null, then `*` when `sel` is true, joined with spaces; the returned `result.clues.map((c) => c.piece).join('')`; the
  `call` line's `result.ri`; and that every attempt has a number `ms >= 0` (the analysts' reference run at
  `041ff83`):

  | Case | rng | Rate | Attempts | Finishes | Returned clues | `ri` |
  |---|---|---|---|---|---|---|
  | `S4` | `repair-2` | `{ 5: [21, 1], 6: [21, 0], 7: [21, 0], 8: [21, 0], 9: [21, 0] }` | `raw:5:rated repair:6:refused raw:5:rated` | `5@1:refused 5@2:unique>5*` | `YUVWZ` | 2 |
  | `S4ok` | `repair-2` | `{ 5: [21, 1], 6: [21, 1], 7: [21, 1], 8: [21, 1], 9: [21, 1] }` | `raw:5:rated repair:6:rated` | `5@1:repaired>6*` | `IYTWZX` | `null` |
  | `S6` | `repair-2` | `{ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' }` | `raw:5:rated repair:6:capped raw:5:rated` (the capped attempt has `w` 7) | `5@1:capped 5@2:unique>5*` | `YUVWZ` | 2 |
  | `repair-ri-0` (TP07) | `repair-ri-0` | every count `[18, 1]` | with `STALL_LIMIT` 12: `raw:5:rated raw:5:rated raw:5:rated raw:5:rated raw:4:rated raw:5:rated raw:5:rated raw:4:rated raw:4:rated raw:5:rated raw:6:rated raw:5:rated raw:6:rated repair:5:rated`; with 16 (when MP09d2 raised it): the same 13 raw attempts, then `raw:6:rated raw:5:rated raw:4:rated raw:6:rated`, then `repair:5:rated` | `4@5:repaired>5*` | `IUTWX` | 3 (the repaired set equals raw rating 3: `ri` alone would miss this repair) |

  In every case `result.ok` is true. The self-test then runs the summary code itself on its file; its row must show:
  4 selection calls, all `require`; raw attempts 18 `rated` (22 with `STALL_LIMIT` 16), none `refused` or `capped`;
  repair ratings 2 `rated`, 1 `refused`, 1 `capped`; finishes 2 `unique`, 2 `repaired`, 1 `refused`, 1 `capped`;
  successful repairs 2 of 6 repair attempts; results from a repair 2 of 4 calls with a result.

  The self-test exits 1 on any difference, printing it; a difference is a defect of the observer or the summary
  (or of the selection code: report it with the trace), never settled by changing an expected value.

### GS-P3: the captures

`$s` is `docs/difficulty-v3/search-<date>`, `$d` is `docs/difficulty-v3/d21-2026-11-12`. Every capture runs
`node --import ./$s/observe.mjs ./$d/flow.mjs <arguments>` (HL: `./$s/flow-case.mjs`) into
`$s/<population>/<name>.jsonl` with the `Capture` function of the test plan: it refuses to overwrite, runs the capture
through `Invoke-Dv3Timed` (one capture per lock; the helper stops the whole process tree at the capture's limit) and
writes a row to `$s/runs.md` with the lock wait. One serial process per capture. The folder names are the
populations: `require` (R), `any` (A), `hell` (H), `hell-landscape` (HL), `stall` (S).

| Population | Captures | Arguments | Limit (s) |
|---|---|---|---|
| R (`require`; repaired candidates, RES-25; population R of PR-P1) | `r-6x10-<level>` for `easy`, `normal`, `hard`, `expert`, `master`; `r-18x20-<level>` for `hard`, `expert`, `master` (the cells of MP06b's corpus B); for an 18x20 cell whose capture accepted no puzzle, also `r-18x20-<level>-1` and `-2` (seeds `.../1`, `.../2`) | `--board <board> --level <level> --seed probe-require/<board>-<level>/0 --uniqueness require --quantity 10 --label <name>` | 570 |
| A (`any`; AR1 refusals and unrateable profiles) | `a-<board>-<level>` for the boards `6x10`, `10x10`, `12x12`, `18x20` and the levels `hard`, `expert`, `master` | `--board <board> --level <level> --seed search/<board>-<level>/0 --quantity 5 --label <name>` | 570 |
| H (Hell cells of D21) | `h-22x22-hell-3` (`--quantity 10`); `h-32x15-hell-3`, `h-24x24-hell-3`, `h-15x20-hell-2`, `h-18x18-hell-2` (`--quantity 5`) | `--board <board> --level <level> --seed t18-big-a --quantity <n> --label <name>` | 300 |
| HL (the Hell companion; cross-review TP23) | `hl-<case id>` for the 20 Hell cases of the landscape that H does not cover: Hell 1 on all 12 boards, Hell 2 on 18x20, 20x20, 20x21, 32x15, 22x22, 24x24 and 26x26, Hell 3 on 26x26 | `--case <case id> --rep <rep> --quantity 10 --label hl-<case id>` (`flow-case.mjs`; the rep by the rule below) | 180 when the case's selected report accepted no puzzle; 570 when it accepted some |

Blocks: R and A together (expected 20–40 minutes, plus up to six extra R captures of 570 s at most), then H (25
minutes: these requests usually fail at their limit), then HL (expected 60–90 minutes), then the availability probe
(about 17 minutes; it runs at the resume, below). A capture stopped at its limit is labelled reduced in `runs.md` and
keeps its lines.

### The Hell companion HL (cross-review TP23)

MP12b1's reports give each Hell cell's request outcomes and times, not the generation profiles behind them: a run
record keeps the accepted puzzles' final metrics (`details.puzzles[]`), `ratingCensoredCount` counts accepted
estimates, and the diagnostic samples are another population; none counts the ratings, refused or capped profiles or
repairs of the search, and the record has no set and fold split. The five H captures cover their own cells only, and
no Hell 1 cell. HL adds one labelled diagnostic replay for each of the other 20 Hell cases; it is not an independent
landscape request and never pools with the landscape's numbers.

- **The driver** `$s/flow-case.mjs` (new): `Copy-Item $d/flow.mjs $s/flow-case.mjs`, then two edits and no other. (1)
  The six usage lines of the header comment (from `// D21 driver` to `--seed t18-big-a --quantity 5`) become `// MP12b2
  HL driver (cross-review TP23): flow.mjs with its argument block replaced by a landscape case; the rest is unchanged.`
  and `//   node --import ./<folder>/observe.mjs ./<folder>/flow-case.mjs --case 14x14-hell-1 --rep 0 --quantity 10`;
  the `// Environment:` line stays. (2) The lines from `let boardRows;` to the line `const label = …;` (inclusive) are
  replaced by:

  ```js
  const { buildLandscapeMatrix } = await imp('tools/bench/calibration-reference.js');
  const { seedFor } = await imp('tools/bench/runner.js');
  const caseId = args.get('case');
  const rep = Number(args.get('rep'));
  const c = buildLandscapeMatrix({ seeds: 20, maxActive: 676 }).cases.find((/** @type {any} */ x) => x.id === caseId);
  if (c === undefined || c.rotation !== 0 || !Number.isInteger(rep) || rep < 0 || rep >= c.repetitions) {
    console.error(`flow-case: no unrotated landscape case "${caseId}" with rep ${args.get('rep')}`);
    process.exit(1);
  }
  const boardRows = c.boardRows;
  const levelId = c.levelId;
  const seedText = seedFor(c, rep);
  const quantity = Number(args.get('quantity') ?? c.quantity);
  const uniqueness = c.uniqueness;
  const label = args.get('label') ?? `hl-${c.id}`;
  ```

  So the case's own rows are used (`15x15b10` keeps its blocked cells), the set seed is the landscape's
  `landscape/<case id>/<rep>` and the batch seed `<set seed>#1` as `flow.mjs` already does (the landscape's
  `batchIndex` 1). The unused `readFileSync` import and `rect` helper stay, so `git --no-pager diff --no-index
  $d/flow.mjs $s/flow-case.mjs` shows only the two edits; the record quotes its `--stat`. The analysts checked the
  block at `a85ed55` without generating: `--case 15x15b10-hell-1 --rep 3` gives 15 x 15 with 215 active cells,
  `hell-1`, seed `landscape/15x15b10-hell-1/3`, quantity 10, `any`, label `hl-15x15b10-hell-1`; a rep of 20, -1, 1.5
  or none, or an unknown case, exits 1. Run `node --check $s/flow-case.mjs` and one refused call (`--case none --rep
  0`, exit 1, no `D21_OUT` file written) before the block. The events and the tags `<label>/set/<j>` and
  `<label>/slot/<slot>/<attempt>` are those of `flow.mjs`.
- **The rep**: from the case's selected report (MP12b1's coverage table; its `runs[]` with `probeKind` `generation`,
  fields `rep` and `acceptedCount`), the lowest rep that accepted 10 puzzles; else the lowest rep that accepted any;
  else rep 0.
- **The manifest** `$s/hell-landscape/manifest.json` (CRLF), one entry per capture: `caseId`, `rep`, `seedText`, the
  selected report's file, the rep rule used (`complete`, `some-puzzle` or `none`), that run's `acceptedCount`,
  `details.K` (null when its set request failed) and `partialReason`, the quantity and the limit, the capture's file,
  its outcome (from `runs.md`) and its final event (the `end` event's `status` and `accepted`, or "stopped at the
  limit" with the censored accepted count), and the source identity of the block (below).
- **What it gives**, per cell, in its own columns: the ratings per accepted puzzle (the capture's attempts over its own
  accepted puzzles, `*` when censored, unavailable when it accepted none); the profiles a failed calibration spent and
  their outcomes; the time per capped and per rated rating; set, fold and total time from its events. The landscape's
  request completion rate and response times stay in separate columns from MP12b1's report. A ratio never divides one
  population's count by another population's accepted puzzles.
- **A capture without a puzzle**: a cell whose selected report accepted puzzles but whose HL capture accepted none
  within 570 s has no measurable ratio within the bound. That is an availability finding (P-OD9): record it as a named
  item in §7 and §13 with the capture's numbers (attempts, outcomes, times) and the landscape's request completion rate
  beside it, and go on; it is no stop.

### Evidence provenance and the final tuple (cross-review TP25)

- **Identity of each population.** Before and after each block (R and A, H, HL, the availability probe), print the
  tree's identity with the function `Identity` of the test plan (`sourceDigest` over `SOURCE_FILES` and `versions`,
  then `git rev-parse HEAD` and whether `git status --porcelain -- core tools` is empty) into `runs.md`. The
  `sourceDigest` and `versions` must equal those of MP12b1's landscape (its aggregate's `source`; after an ordered
  change round, the change round's aggregate); a different identity means the tree changed after the landscape: stop
  and report (only an ordered change round changes it). Each record table names its population and that identity.
- **MP09d2's observations.** Its Hell captures and availability probe (`d21-v3-2026-11-12/hell/`, `avail/`) ran on the
  working tree that MP09d2 committed as `eea5fed`. They count as evidence of the final tuple only when the engine and
  the knobs are unchanged since then: `git --no-pager diff --stat eea5fed -- core/engine` and `git status --porcelain
  -- core/engine` print nothing, `versions` are `gen-v3`, `mixed-v2`, `xoshiro128ss-v1`, `difficulty-v3`, and the knob
  literals of MP09d2's record §1 (`DEDUCE`, `SCORE_V3`, `STALL_LIMIT` 12; the captures ran before that commit) equal
  the tree's; the record quotes that output as the reuse argument. At the resume (`55c0c61`) the check fails:
  MP12a changed `SCORE_V3` (`rule[3]`, the penalty) and `DEDUCE.census` in `core/engine/policy.js` after `eea5fed`.
  So the availability probe runs again under the final tuple (below), and MP09d2's observations stay in the record as
  historical, side by side, never pooled with the new observations.
- **The availability probe again** (only when that check fails): the six captures of MP09d2's record §4 under the
  final tuple, with its seed and exact boards, three set attempts each, into
  `$s/avail/avail-<board>[b<n>]-<level>.jsonl` (MP09d2's file names; preload
  `./docs/difficulty-v3/d21-v3-2026-11-12/spent.mjs`, script
  `./docs/difficulty-v3/d21-v3-2026-11-12/avail.mjs`, arguments `--board <WxH> [--blocked <n>] --level <id> --seed
  t18-big-a --attempts 3`, limit 570 s each; they took 97-288 s, 999 s in all): `13x13 --blocked 5` `hell-1` (164
  cells, `deterministicBoard(164)`), `20x20` `hell-1`, `19x14` `hell-2` (266), `20x20` `hell-2`, `25x18` `hell-3`
  (450), `22x22` `hell-3`. Then `node ./docs/difficulty-v3/d21-v3-2026-11-12/summarise.mjs <the six files>` into
  `$s/avail-summary.md`. The record keeps set attempts apart from full quantity-10 requests.
- **Areas from final-tuple observations only.** The Hell areas derived below (check-list D39) come from observations
  of the final tuple: the landscape (its 20-request runs and its prescreens), H, HL and the availability probe run
  again. MP09d2's older results stay beside them for comparison, never as interchangeable samples. An area boundary is
  an observed availability choice, not a proof that every shape of an area is impossible.

### The stall re-examination (only when a recorded D21 decision says "inert on the v3 corpus"; TP28)

The test plan sets `$runStallRecheck = $false` and turns it to `$true` only from the recorded D21 decision: MP09d2's
record §5.5, or the decision of a later ordered change round, stating that the rule is "inert on the v3 corpus".
Never derive it by searching for the word "inert": the record has it in negative statements too. On this source
(MP09d2 §5.5: not inert, 10 firings at N = 12) S is skipped, nothing of S runs, and record §8 says why.

Population S: the one-sided cells of MP12b1's list 2 on rectangular boards (skip `15x15b10`), at most 8, those with
the most accepted puzzles first. Each runs `node --import ./<MP09d2 folder>/nostall.mjs ./$d/flow.mjs --board
<cols>x<rows> --level <level> --seed search-stall/<case id>/0 --quantity 5 --label s-<case id>` into
`$s/stall/s-<case id>.jsonl` (570 s), then `node ./$d/simulate.mjs <the S files> --ns 8,12,16 --list` into
`$s/stall-simulate.md`. The decision table of MP09d2 applies unchanged: N = 12 stops no call early, or misses no
central result: keep 12 (record "inert on the landscape" in the first case); N = 12 misses and N = 16 does not: raise
to 16 only through an ordered change round (MP09d2's listed re-pins, then GF-P2 and GA-P2, before the lock); N = 16
misses: report, a new answer of the plan author is needed. When list 2 is empty, record that the rule has no cell to
act on in the landscape.

### The Hell availability (D36 decided (i), owner decision P-OD9; check-list D39)

For every (board area, level) of MP12b1's list 1, and every Hell cell of populations H and HL that made no puzzle: a
table with board, area, level, requests, the failure reasons, the profiles per failed calibration and their outcomes
(from H and HL, and from the availability probe where the cell was measured), and the time a request ran before it
failed (serial: `setMs` per set attempt; two-worker flow: MP09d2's recipe measurement). Each row says "no puzzle
observed in N requests" with its N, and "reduced (P-OD9)" where MP12b1 kept 3 requests; each row names its population
and source identity (TP25); the record never calls a cell impossible (cross-review TP08).

**The evidence the areas rest on.** The record states it above the table, per Hell level: the cases whose prescreen
made a puzzle (20 requests each, with their request completion rates); the cases kept at the 3-request prescreen
("reduced (P-OD9)": a case that makes no puzzle in three requests is not offered and needs no further evidence, the
plan author's answer to PR-P1); populations H and HL; and the availability probe run again under the final tuple on
the smallest offered areas, which the landscape does not contain (164, 266 and 450 cells), with MP09d2's results
beside it as history (`docs/difficulty-v3/d21-v3-2026-11-12.md` §4 and §6: Hell 1 made on the 164-cell board, 2 of 3
attempts, and on no board of 300 cells or more; Hell 2 not made on 266 cells or more; Hell 3 on none of 450 to 576
cells). Each row names its source (a landscape case with its N, an H or HL capture, an availability capture) and its
failure mode: every profile unrateable (capped), or rated profiles only above the band.

**The derived areas (check-list D39).** Per Hell level, a table of its landscape cases in ascending area: case,
area, N, status, `requestInBandRate` of its cell (unavailable for a reduced case) and "meets" (yes exactly when N is 20,
the status is `measured` and the rate is at least 0.90: at least 18 of the 20 requests completed ten in-band puzzles,
the acceptance of design §7.8 that the other levels are held to). Under it, the interval that D39 gives, written as
MP12b3 will write it in `AREAS` (`[lo, hi]`, `hi` `Infinity` when the run of meeting cases reaches the level's
largest case, or `[Infinity, Infinity]`), after the contiguity step of D39 (a Hell level is offered only where the
level below it is). No owner question: the owner decided (i). MP12b3 applies this table and stops if its own
computation differs. The reply gives the table.

**A cell that is not Hell without a puzzle** (not expected: every GV2 cell made puzzles, and Nightmare completes on
22x22 and 15x20): a named finding in §9 and §13 with its numbers. The reply names it for the orchestrator, who asks
the owner whether P-OD9's (i) applies to it as well (MP12b3 then gets an addendum); without that answer MP12b3 changes
only the Hell levels. It is no stop.

### Population R: `--uniqueness require` on 18x20 at Hard, Expert and Master (PR-P1)

The plan author wants this measurement reported, because it decides whether "Hard is really hard" holds on large
boards when a unique solution is required: in the v2-made corpus B none of those puzzles had a decisive guess
(`fit-2026-11-12.md` §8, finding 7). The captures `r-18x20-hard`, `r-18x20-expert` and `r-18x20-master` of
population R (one request of 10 puzzles each, 570 s) are the first evidence. For each of the three cells whose
capture accepted no puzzle, two more captures follow in the same block: seeds `probe-require/18x20-<level>/1` and
`/2`, labels `r-18x20-<level>-1` and `-2`, the other arguments unchanged, 570 s each, so that the outcome rests on
three requests, the evidence P-OD9 asks of a Hell case. Record per cell: the requests, the accepted puzzles, the
search outcomes (rated, refused for lack of a proved guess, capped), the repairs and their outcomes, the times.

When a cell made no puzzle in its three requests, the outcome is put to the owner with these numbers, not worked
around (the plan author: "Hard and above are not offered with `require` on those areas"):

- (R-a) accept: Hard and above (level index 3 or more) with `--uniqueness require` stop being offered on boards from
  A0 active cells, the area the owner sets; the record proposes 360, the smallest area measured without a puzzle, and
  names 201, the area above which `require` is already experimental for Hell puzzles (design §2 D14; the notice
  `N-UNIQUE-EXP` of `generator/state.js`). Implemented in MP12b3 (its part C, check-list D41);
- (R-b) keep offering them: such a request ends without a puzzle, recorded as a known limitation (design §6.11 and
  the release notes of MP17);
- (R-c) another answer of the owner.

When every cell made a puzzle the record reports the numbers and no question is asked; a cell with 1 to 9 puzzles in
its request is a named availability finding (P-OD9), no question.

### Census estimates above 5 % (PR-P1; check-list D29)

From list 3 of the aggregate in force: every cell above 5 % census estimates is a listed finding with its share in
record §5; its puzzles ship with the estimate note and the `censored` flag (AR1 already guarantees a generated
Hard-or-above puzzle a proved decisive guess, so an estimate can overstate a score but cannot invent the level's
defining property). A cell above 25 % is put to the owner with the cost of a larger census from MP12a's record (§4.1
and §6.5: the shares at 10, 20, 40 and 80 million on the slice cells and the deduction time they cost); no larger
census is measured here, and no census change is made in MP12b (PR-P1).

### The fail-fast proposal (an owner question; built in MP12b3 when the owner agrees)

From H and HL, from the availability probe, from MP09d2's records (history) and from R and A (the check against
false stops). After P-OD9 the Hell levels stop being offered where v3 cannot make them, but irregular boards can still
meet unrateable sets (the plan author, PR-P1), so the proposal stays:

1. Numbers: per Hell cell, the time per unrateable rating (the `ms` of the `capped` attempts: median, largest; TP07),
   the profiles a failed calibration spends (expected 20: MP09c's S5b), the set attempts a request makes before the
   limit, and the time to failure serial and in the two-worker flow (about 115 s, `TIME.dispatchStopMs`).
2. Mechanisms, each with its predicted time to failure from these numbers, serial and two-worker kept apart, and any
   time saving labelled a counterfactual estimate: **F1** a set request ends after the first set attempt whose
   calibration had no rated profile and every profile unrateable; **F2** a selection call ends after its first four
   profiles (the first phase) are all unrateable; **F1 + F2** both, where F1 reads the calibration as F2 has cut it.
3. The false-stop check `$s/failfast.mjs` (new, durable; cross-review TP24), over every capture of R, A, H and HL (the
   `attempts` lines, each paired with the `call` line before it; tags `<label>/set/<j>` for set attempt j and
   `<label>/slot/<slot>/<attempt>` for the batch; the `set-attempt` and `end` events). Only a file with an `end`
   event is a **completed baseline**; a capture stopped at its limit is censored after its last event. Definitions:
   - **F2** fires on a call whose first four raw attempts (`ph: 'raw'`, in order) exist and are all `capped`; it is a
     false stop when that call's `result.ok` is true. Every call line is complete, so F2 has no unknown outcome.
   - **F1** fires in a file at the first `<label>/set/<j>` whose raw attempts (all calls with that tag, in order) are
     not empty and all `capped`. It is a false stop when a later `set-attempt` event of the file has `ok: true`; else a
     correct stop when the file is a completed baseline; else **unknown** (a censored tail).
   - **F1 + F2** walks the set attempts in order on the **effective prefix**: each call that F2 fires on is cut to its
     first four raw attempts. If a cut call had `result.ok` true, the combination has a false stop there (and later
     events no longer describe what would happen: stop walking the file). Else F1 fires at the first set attempt whose
     effective raw attempts are not empty and all `capped`, and the outcome is judged as for F1, counting the set
     attempt itself when it was `ok`. If F1 never fires, F2's cuts of batch calls are judged as for F2.
   - Report per mechanism: completed baselines evaluated, triggers, observed false stops, correct stops and unknown
     outcomes. Only completed baselines count toward "no false stop observed in N completed baselines"; unknowns stay
     visible and never establish safety; never write that a finite corpus proves no request could succeed. A
     mechanism is proposable only with zero observed false stops; qualifying an implementation is later work.
   - `--self-test` (pure, no file) checks four synthetic files and exits 1 on any difference: (a) attempt 0 has four
     capped raw attempts then a rated out-of-band one and fails, attempt 1 succeeds, `end` present: F1 0 false stops,
     F2 0, F1 + F2 1 (SA2's case); (b) a completed request whose every attempt is all capped (`end` status
     `set-failed`): F1 and F1 + F2 one correct stop each, F2 no false stop; (c) a call with four capped raw attempts
     then a rated in-band one, `result.ok` true: F2 1 false stop, F1 none, F1 + F2 1; (d) F1 fires at attempt 0 in a
     file without `end` and no later success: unknown 1, false stops 0, completed baselines 0.
4. The notice F1 would show when a set request ends, an observation, not a statement of impossibility, in English and
   Vietnamese (draft for the owner; MP12b3 uses the owner's wording, else this one): "Couldn't create a {level} piece
   set for this board: the difficulty ratings it tried reached their work limits. Choose another level or change the
   board." / "Không tạo được bộ mảnh mức {level} cho bàn này: các lần đo độ khó đã thử đều chạm giới hạn tính toán.
   Hãy chọn mức khác hoặc đổi bàn." F2 alone adds no notice: a batch call it cuts is one failed candidate, and the
   batch keeps its notices.

The owner chooses F1, F2, F1 + F2 or none; the plan author recommends F1 + F2 (end a selection call after four
profiles that are all unrateable, and end a set request after an attempt whose calibration was entirely
unrateable). A mechanism with an observed false stop is not proposed. MP12b3 builds the chosen mechanism before the
lock is complete, within `gen-v3` (check-list D35, D40); with "none", nothing is built and MP12b3 records the
limitation (design §7.5, MP17's release notes).

### The record `docs/difficulty-v3/calibration-<date>.md`

English, CRLF:

1. Header: date, code revision, Node version, CPU count, the final knobs and caps (as literals), `STALL_LIMIT`, the
   commands, total machine time (MP12a, MP12b1, MP12b2) and the lock waits; the source identity of each population
   (the landscape, R and A, H, HL, the availability probe) with the reuse argument for MP09d2's observations or the
   statement that they were measured again (TP25).
2. Coverage (the coverage table of the aggregate in force, by reference with its totals: MP12b1's, or the change
   round's after an ordered change round; the Hell run plan of P-OD9: the Hell cases run with 20 requests and the
   reduced Hell cases; HL's manifest: case, rep, rule and limit per capture).
3. Per board and level (from the aggregate in force): request completion rate (MP12a's `requestCompletionRate`, MP11's
   `requestInBandRate`), yield, T10 median and p95, peak memory, the v3 score distribution (median, p95), the G,
   `info`, Cmax, `deductionTier` and `solutions` distributions, the census-estimate share, `provedZero` (must be 0),
   unrateable diagnostic samples (with their denominator, never as accepted puzzles), partial and incomplete outcomes;
   a missing value is shown as unavailable.
4. The criteria of RES-25 on the GV2 boards: the C1-C5 table of the GV2 reports measured on the locked tree, after
   `Assert-CriteriaSource` passed on their folder (test plan; TP30): MP12a's final round, by reference with the
   numbers, when no change round ran; after an ordered change round, the change round's own table
   (`landscape-v3-change-1/criteria-<date>.md`), which replaces that reference (MP12a's table stays as history,
   labelled with its identity). For the other boards, the level ordering and the Hard and Expert request completion
   rates as reported facts (never compared with an invented baseline).
5. P-OD1 (census estimates per cell over the whole landscape against the 5 % rule; list 3 of the aggregate in force:
   every cell above 5 % listed with its share, shipped with the estimate note and the `censored` flag; a cell above
   25 % with the owner question of "Census estimates above 5 %"), P-OD2 (capped paths of accepted puzzles: none, or the
   cells, from the `final.jsonl` behind §4; the unrateable profiles of the search evidence), both recomputed after a
   change round; P-OD3 (MP12a's outcome, labelled with MP12a's tuple).
6. Search evidence (GS-P3, cross-review SP16): the summary tables of R, A, H and HL, each population in its own table
   with its denominators and source identity; repaired candidates (RES-25; TP07): the repair attempts, the successful
   repairs and the results from a repair of R, each with its denominator, and the finish outcomes; the time per rated
   and per capped rating; the self-test result. Censored rows keep their `*`. Then **population R on 18x20** (PR-P1):
   per Hard, Expert and Master cell the requests (one, or three when the first made no puzzle), the accepted puzzles,
   the search and repair outcomes and the times, and, when a cell made no puzzle in three requests, the owner question
   with options (R-a), (R-b) and (R-c).
7. Hell report (D21): per Hell cell, from H or HL (one capture each): the ratings per accepted puzzle and the
   generation time (set, fold, total), or the failure with its profiles and time; beside it, in separate columns, the
   aggregate's request completion rate and response times for the landscape cases (none for H's seed `t18-big-a`);
   the `STALL_LIMIT` in force. A count of one population is never divided by another population's accepted puzzles;
   the availability probe's set attempts stay apart from quantity-10 requests.
8. The stall stop: MP09d2's D21-V3 decision (on this source: not inert, 10 firings at N = 12; `STALL_LIMIT` 12;
   population S skipped, with that reason) and, only when a recorded decision said inert, the re-examination S
   (captures, the TOTAL rows for N = 8, 12 and 16, the decision).
9. Hell availability (D36 decided (i), P-OD9): the evidence statement, the table of the cells without a puzzle, the
   derived areas of check-list D39 for MP12b3, and the cells that are not Hell without a puzzle (named findings).
10. The fail-fast proposal: the numbers, F1, F2 and F1 + F2 with the completed baselines, triggers, observed false
    stops, correct stops and unknown outcomes of `failfast.md`, the self-test result, the notice, the plan author's
    recommendation (F1 + F2) and the owner question.
11. The final values and every change since MP08 (from MP12a's record, and the change round's when one ran), with the
    reasons.
12. The lock statement (below).
13. Findings and questions for the owner: the named items of P-OD9 (cells with poor availability, orderings that fail
    outside the GV2 boards, census estimates above 5 %, long times, an HL capture without a puzzle, a fail-fast or
    stall finding), the known limitation R7 (one canonical search order, no median: the plan author's answer to PR-P1;
    the order-noise numbers of MP12a's record §6.4), and the owner questions of this task (the fail-fast; population R
    when a cell made no puzzle; a census cell above 25 %; a cell that is not Hell without a puzzle), or "none".

### Findings and an ordered change round (cross-review TP25, TP26, TP30, TP32, TP33)

A finding is reported in the reply before the lock; the orchestrator decides. **When a change round is ordered (the
plan author's answer to PR-P1, owner decision P-OD9; check-list D29):** only when C1 (levels ordered) or C3
(`Gproved >= 1` at Hard and above) fails in a cell that stays offered, or when C2 fails, that is, a Hard or Expert
request completion rate falls more than its 10 points below GV2. Never for census estimates (a cell above 5 % is a
listed finding, above 25 % an owner question, and no census change is made in MP12b), never for a Hell cell (P-OD9:
MP12b3 stops offering what v3 cannot make), never for any other performance or availability finding (a named item).
A C3 failure is also a correctness failure (AR1 refuses such candidates): stop and report it with the puzzles.
Without an order, nothing changes. If the orchestrator orders a change round, the task does the following in this
order and records each step (the record and the change round's `runs.md`):

1. **Enumerate before changing.** The record names the change (within the ranges of RES-18 and SA2-Q-P09 branch A,
   as MP12a's "Choosing a change", or the `STALL_LIMIT` raise of the re-examination) and the evidence it affects,
   which is all of it. Every allowed change edits a file of `SOURCE_FILES` (`tools/bench/report.js:37-46`: `policy.js`,
   `levels.js`, `clues.js` and the rest of the engine), so the source identity changes, and MP12b1's `aggregate.mjs`
   accepts one shared identity only. A change round therefore runs the complete population again, with no narrower
   variant in this pack (TP32): the 25 Hell prescreens and the P-OD9 plan derived again from them, every other
   landscape case, the 18 GV2 cases with the slice criteria and their probe corpus (TP30), R, A, H, HL, the
   availability probe and the fail-fast table. An earlier report is never copied or re-stamped; reusing cases across
   identities would need its own data contract, outside this pack. Before the runs, the orchestrator gets the
   projection: the landscape 7.5–12.5 hours, the probe corpus 20–35 minutes, GS-P3 about 2–3 hours, the re-pins,
   checks, GF-P2 and GA-P2 about 30 minutes: about 10–16 hours, plus the lock waits.
2. **The change and its re-pins**: MP12a's "Pinned tests" and its table "The D36 and fixture re-pins" (TP26), each
   pin settled as that table says, its commands A and B run with this task's helper and folders
   (`tests\artifacts\MP12b2\dv3-lock.ps1`, `tests/artifacts/MP12b2/change-1/d36/`, task labels `MP12b2 change-1 …`).
   A semantic failure (a request that no longer succeeds, a premise that no longer holds) stops: never a re-pin.
3. **The between-round checks** of MP12a's "Test order around a knob change", under the lock (the
   fixture-independent files and the slow tests only; before GF-P2 the fixture-dependent files and the quick set fail
   by design and gate nothing; TP06).
4. **The landscape again**, by MP12b1's shard procedure (its order and its Hell prescreens and P-OD9 plan) with the
   block below: staged under `tests/artifacts/MP12b2/change-1/landscape/`, the 18 GV2 cases published into
   `docs/difficulty-v3/landscape-v3-change-1/slice/` (the layout of an MP12a round folder), every other case into
   `docs/difficulty-v3/landscape-v3-change-1/`, the invocations in its `shards-<date>.md`. Then the block's
   `aggregate.mjs` call writes the change aggregate into that folder, with the `slice` subfolder as `--slice` (the full
   folder is searched without its subfolders: MP12b1 step 3).
5. **The slice criteria again** (TP30). MP12a's "The probe corpus of a round" for the same 90 requests (the 18 GV2
   cases x reps 0-4), with the change round's GV2 reports as `expected`, the label `prod` only (the change round tunes
   nothing; the cap and census labels belong to MP12a's search), every capture and rating command through
   `Invoke-Dv3Timed -LimitSeconds 570`. The driver is MP12a's adapted copy (`tests/artifacts/MP12a/corpus.mjs` and
   `lib.mjs`), copied to `tests/artifacts/MP12b2/change-1/` with `CORPUS_DIR`
   `docs/difficulty-v3/landscape-v3-change-1/slice/probe`, `RUNS_DIR` `tests/artifacts/MP12b2/change-1/runs`,
   `RECIPES_DIR` `tests/artifacts/MP12b2/change-1/recipes` and the run log
   `tests/artifacts/MP12b2/change-1/runlog.jsonl`; when MP12a's copies are gone, it is written again from MP06b
   Amendment A1, as MP12a says. **Path note (cross-review TP34):** the copies sit one folder deeper than MP12a's, so in
   them only (never in MP12a's originals or in `criteria.mjs`): the six `../../../core/...` and `../../../tools/...`
   imports of `corpus.mjs` (its lines 13-18 at the resume) and the repository root of `lib.mjs` (three parent steps at
   its lines 15-23) take four parent steps; `ROUND_DIR` is the change round's `slice/` folder, and the round and date
   settings (`MP12A_ROUND`, `MP12A_DATE`) are replaced by this round's; the expected-report lookup (`corpus.mjs:116`,
   `` `${ROUND_DIR}/${d.caseId}-${DATE}.json` ``) selects the unique dated report of the case in the new `slice/`
   (shards may start on different dates), never MP12a's folder. Print the resolved paths of `ROOT`, `ROUND_DIR`,
   `CORPUS_DIR`, `RUNS_DIR` and `RECIPES_DIR` and check them before the first capture. The packs, `manifest.json` and
   `final.jsonl` go to `slice/probe/`; a capture that
   exits 2 or an identity mismatch is recorded, never substituted (RES-14); no result of an earlier tuple stands in
   for these inputs. Then the read-only `criteria.mjs` on that folder, the unchanged GV2 baseline and the new
   `final.jsonl`, into `docs/difficulty-v3/landscape-v3-change-1/criteria-<date>.md` (block below; without `--fit`:
   MP12a's fit and P-OD3 stay labelled with MP12a's tuple). `slice/` holds exactly one report per GV2 case, as an
   MP12a round folder does, so the script runs unchanged; it refuses a dated report of any other case in its round
   folder, so the parent folder is never its `--round`. The diagnostic samples stay apart (TP21).
6. **GS-P3 again** (TP33): the test plan's block with the data root `$data = "$s/change-1"`, `$full` the change
   aggregate (so `Identity` and HL's selected reports come from it) and `$criteriaFolder` the change round's `slice`
   folder. The scripts stay at `$s` and are never copied: `observe.mjs` imports `../d21-2026-11-12/register.mjs`
   relative to its own folder. Captures, the HL manifest (a new one: the first manifest's case ids would skip every
   capture), `runs.md`, `summary.md`, `failfast.md` and `avail-summary.md` go under `$data`; the availability probe
   runs, since the engine changed and the reuse check fails by itself.
7. **Stops before the record and the lock**: a `missing` or `invalid` case of the change aggregate; an input error of
   `criteria.mjs` (exit 1); a criterion of the new C1-C5 table that fails or is unavailable in a cell that stays
   offered (with its numbers; the disposition of an earlier table is never carried over to changed results); a
   semantic failure: report to the orchestrator before the lock. An availability result that changed (a level made or
   lost on an area), an HL capture without a puzzle and any other performance or availability observation are named
   items (P-OD9), no stop: the Hell areas of D39 are derived again from the change aggregate. P-OD5, P-OD6 as changed
   by P-OD9, and P-OD9 stay as decided, no threshold changes, and no fail-fast is implemented here.
8. **The record from current-tuple evidence** (TP30): §3 from the change aggregate; §4 the change round's C1-C5 table
   (`criteria-<date>.md`), replacing the reference to MP12a's final round, after `Assert-CriteriaSource` (test plan)
   passed on the `slice` folder; §5 P-OD1 from the change aggregate's list 3 and P-OD2 from the new `final.jsonl` and
   search evidence, P-OD3 labelled with MP12a's tuple; §6, §7, §9 and §10 from `$data`, the derived areas and the owner
   questions refreshed from these results only. The earlier tables stay in the record as history, side by side,
   labelled with their identity.
9. **GF-P2, the strict post-GF-P2 checks and GA-P2**, exactly as MP12a's "GF-P2 and GA-P2" block with this task's
   helper and the reason `P3: v3 calibration (final)`; the first `npm test` is kept in
   `tests/artifacts/MP12b2/ga-p2-first.txt`.

```powershell
. tests\artifacts\MP12b2\dv3-lock.ps1
$c1 = 'docs/difficulty-v3/landscape-v3-change-1'
$gv2 = @(@('6x10', '10x10', '12x12') | ForEach-Object { $b = $_; @('easy', 'normal', 'hard', 'expert', 'master') |
  ForEach-Object { "$b-$_" } }) + @('18x20-hard', '18x20-expert', '18x20-master')
# step 4, one shard per case in MP12b1's order (a Hell prescreen: $seeds = 3), for example:
$date = '<date>'; $case = '6x10-hard'; $seeds = 20
$name = if ($seeds -eq 3) { "$case-s3-$date" } else { "$case-$date" }
$target = if ($gv2 -contains $case) { "$c1/slice" } else { $c1 }
$stage = "tests/artifacts/MP12b2/change-1/landscape/$name"
$node = @('--max-old-space-size=2048', 'docs/difficulty-v3/landscape-v3/launch.mjs', 'run', '--profile', 'landscape',
  '--workers', '4', '--seeds', "$seeds", '--fresh-process', '--cases', "^$case$", '--output', $stage)
do {
  $r = Invoke-Dv3Timed -Task "MP12b2 change-1 $name" -NodeArgs $node
  if ($r.TimedOut) { throw "MP12b2 change-1 ${name}: the 590 s limit was reached; stop and report" }
} while ($r.Exit -eq 3)
if ($r.Exit -ne 0) { throw "MP12b2 change-1 ${name}: launcher exit $($r.Exit); stop and report" }
node docs/difficulty-v3/landscape-v3/launch.mjs publish $stage $target --seeds "$seeds"
if ($LASTEXITCODE -ne 0) { throw "MP12b2 change-1 ${name}: publish refused" }
# step 4, after every case ($today names the aggregate and the criteria table)
$today = Get-Date -Format 'yyyy-MM-dd'
node docs/difficulty-v3/landscape-v3-full/aggregate.mjs --full $c1 --slice "$c1/slice" --date $today
if ($LASTEXITCODE -ne 0) { throw 'the change aggregate has a gap or an error: stop and report' }
# step 5, after the probe corpus
$today = Get-Date -Format 'yyyy-MM-dd'
node docs/difficulty-v3/landscape-v3/criteria.mjs --round "$c1/slice" --baseline docs/difficulty-v3/baseline-v2 `
  --final "$c1/slice/probe/final.jsonl" | Set-Content "$c1/criteria-$today.md"
if ($LASTEXITCODE -ne 0) { throw 'criteria.mjs: input error; stop and report' }
```

### The lock (RES-01, RES-25)

- Evidence: on the locked tree, under the lock helper, `node tools\record-fixtures.mjs --check` passes and the final
  `npm test` (GA-P2, `node --test "tests/**/*.test.js"`) passes; `git --no-pager diff --stat` shows no change under
  `core/` or `tools/` in this task (unless a change round ran); the source identity printed after the final
  `npm test` equals the identity of the record's evidence (MP12b1's landscape, or the change round's), and the GV2
  reports behind record §4 carry it too (`Assert-CriteriaSource`; TP30).
- Statement, in the record and in design §7.8: "The `difficulty-v3` rating (`SCORE_V3`, `DEDUCE`), the clue search
  (`gen-v3`, `STALL_LIMIT`), `K60` and `SHARES` are locked at the commit of MP12b2 (`difficulty-v3 MP12b2`); MP12b3
  completes the lock with the availability decided by the owner (the Hell `AREAS`, P-OD9; the policy id and, when the
  owner agreed, the fail-fast and the population-R outcome), and from its commit on no rating or generated puzzle
  changes. Any later change of a weight, a cap, a band, an availability interval, a rule of the deduction ladder, the
  census, a counter, the clue search, `SHARES` or `K60` needs a new model, algorithm or policy id and a new
  qualification." Name the commit by its message, not by a hash (the orchestrator makes it after the reply).

## Files to create/modify

| File | Change |
|---|---|
| `docs/difficulty-v3/search-<date>/` (new) | `observe.mjs`, `summary.mjs`, `flow-case.mjs` (TP23), `failfast.mjs` (TP24), the captures under `require/`, `any/`, `hell/`, `hell-landscape/` (with `manifest.json`) and, when run, `avail/` (TP25) and `stall/`; `runs.md`, `summary.md`, `failfast.md`, `avail-summary.md` (when `avail/` ran), `stall-simulate.md` (when S ran); `change-1/` (the data root of an ordered change round, same layout, no scripts; TP33) |
| `docs/difficulty-v3/landscape-v3-change-1/` (new, only in an ordered change round) | the change round's published landscape reports and Hell prescreens, `shards-<date>.md`, `aggregate-<date>.json` and `.md`, `criteria-<date>.md`; `slice/` with the 18 GV2 reports and `probe/` (`packs/`, `manifest.json`, `final.jsonl`) (TP30, TP32) |
| `docs/difficulty-v3/calibration-<date>.md` (new) | the record |
| `docs/design-detail.md` | §7.8 |
| knob values, `STALL_LIMIT`, re-pins, fixtures | only in an ordered change round |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12b2/` (the lock helper
`dv3-lock.ps1`, the self-test file, `handoff-check/`, and in a change round `change-1/`: the landscape staging, the
D36 re-observations, the probe driver copy, its runs, recipes and run log). Documentation slot: design §7.8 (below).
Design §7.5, `docs/design-brief.md` and the guides are MP12b3's (the Hell areas and their consequences). Must not
edit: algorithm code (outside a change round), MP12a's and MP12b1's records, folders and scripts (`launch.mjs`,
`criteria.mjs`, `aggregate.mjs` are run, never changed), MP09d2's folder and the D21 folder `d21-2026-11-12/` (its
`flow.mjs` is copied, never edited), `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`.

### `docs/design-detail.md` §7.8 (after MP12a's close)

Replace the provisional sentence on the v3 knobs with the measured parameters: the final `SCORE_V3` and `DEDUCE`
values (the tuple `12 / 3 / [0, 0, 2, 3] / G 5 / info 0.5 / (1, 2)`, `census` 80,000,000), `K60` and `SHARES`
(unchanged), `STALL_LIMIT`, the request completion rates and availability in two or three sentences with a link to
`docs/difficulty-v3/calibration-<date>.md`, the census-estimate share (the cells above 5 %, listed with their shares;
their puzzles carry the estimate note), and the lock statement. Keep the bullet "Known limitation: one search order
(R7)" that MP12a's close wrote, with a link to the new record. Leave the Hell areas to MP12b3 (it rewrites §7.5 and
adds its own sentence to §7.8). §7.9 and §7.10 keep pointing to `policy.js` for the values (no copy of numbers that
could drift).

## Implementation steps

1. Read the inputs; save the lock helper; create `observe.mjs` exactly, write `summary.mjs`, copy and edit
   `flow-case.mjs`, write `failfast.mjs`; run the summary and fail-fast self-tests, `node --check` and the refused
   `flow-case.mjs` call (all quick, no lock: nothing is generated).
2. The identity (`Identity`) against MP12b1's aggregate; the reuse check for MP09d2's observations (TP25).
3. Write each block's plan into `runs.md`, then run the blocks one capture per lock: R + A (with the two extra
   captures of each 18x20 R cell that made no puzzle), then H, then HL (the rep rule and the manifest), then the
   availability probe (the reuse check fails at the resume); the identity before and after each block; summarise
   (`summary.md`, `avail-summary.md`) and run `failfast.mjs` into `failfast.md`.
4. The stall re-examination only when `$runStallRecheck` is true (on this source it is false: S is skipped and the
   record says why).
5. The Hell availability with the derived areas of D39, population R, the census cells, the fail-fast proposal; the
   record (§4 only after the test plan's synthetic handoff check and `Assert-CriteriaSource` on the folder behind it,
   TP30). A change round runs only when the orchestrator orders it by the rule of "Findings and an ordered change
   round" (with its own data root, TP33).
6. Under the lock helper, `record-fixtures --check`, the final `npm test`, the quick set; the identity after them;
   design §7.8 and the lock statement; `npm run check`. Then the reply, with the owner questions (the fail-fast;
   population R when a cell made no puzzle; a census cell above 25 %; a cell that is not Hell without a puzzle) and the
   table of derived areas for MP12b3; the task does not wait for the answers.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b2-B01 | The calibration record shows how the search reached its puzzles: rated, refused (AR1), unrateable and repair ratings, successful repairs, per selection and per accepted puzzle, for `require` and `any` cells | record §6; the summary |
| MP12b2-B02 | Every Hell cell of the landscape is reported from a capture of its own population (H or HL; TP23) with ratings per accepted puzzle and generation time under v3, or its failure with numbers, censoring shown; the landscape's request completion rates stay in their own columns (D21) | record §7; `hell-landscape/manifest.json` |
| MP12b2-B03 | The record gives, for every cell without a puzzle, the facts with the evidence each rests on (P-OD9: its requests; the smallest areas measured under the final tuple; TP25), and the Hell areas that check-list D39 derives for MP12b3 (no D36 question: decided (i)); the owner gets a measured fail-fast proposal stated as "no false stop observed in N completed baselines" with its unknown outcomes and the plan author's recommendation (TP24), population R's outcome on 18x20 with three requests per cell without a puzzle (PR-P1), and every census cell above 25 % | record §5, §6, §9, §10, §13; `failfast.md`; the reply |
| MP12b2-B04 | The stall stop follows the recorded D21 decision: on this source (not inert) S is skipped with the reason; S runs only under a recorded "inert" decision, and `STALL_LIMIT` stays 12 or is raised to 16 only by the rule (TP28) | record §8 |
| MP12b2-B05 | The v3 rating tuple is locked on the tree whose identity the evidence carries; the design document says what the lock means, that MP12b3 completes it, and states R7 as a known limitation | record §12, §13; design §7.8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b2-T01 | `observe.mjs` exactly as given (repairs observed through the `finish` bracket, each attempt timed; TP07); `summary.mjs` to its contract (censored rows marked, one TOTAL row per population folder); the self-test passes with the four cases of the table (`repair-ri-0` among them) and the summary row of its own file | command output |
| MP12b2-T02 | Every capture of R, A, H, HL (and `avail/` and S when run) ran through `Invoke-Dv3Timed`, one capture per lock, within its limit, and is in `runs.md` with its outcome and lock wait, never overwritten; the identity before and after each block equals the landscape's; the summary's denominators are stated (TP20, TP25) | `runs.md`; the folder |
| MP12b2-T03 | The stall decision follows the recorded D21 decision and MP09d2's table: `$runStallRecheck` is set only from that decision, never by a text search; a raise happens only in an ordered change round with GF-P2 and GA-P2 (TP28) | record §8; the test plan; diff |
| MP12b2-T04 | `failfast.mjs --self-test` passes its four cases (SA2's combined case, an all-capped completed request, an F2-lost successful call, a censored tail); `failfast.md` gives F1, F2 and F1 + F2 over R, A, H and HL with completed baselines, triggers, observed false stops, correct stops and unknown outcomes (TP24) | command output; `failfast.md` |
| MP12b2-T05 | `record-fixtures --check` and the final `npm test` pass on the locked tree under the lock helper; no `core/` or `tools/` change in this task without an ordered change round; a change round ran only under the rule of PR-P1 (C1 or C3 failing in a cell that stays offered, or C2 failing) and followed its nine steps: the complete population again in new folders (TP32), the slice criteria from a new probe corpus with `criteria.mjs` and record §4 replaced by that table (TP30), GS-P3 under its own data root with the scripts at `$s` (TP33) and the copied probe driver adapted as the path note says (TP34), every stop reported before the lock (TP25, TP26) | command output; diff; record |
| MP12b2-T06 | Design §7.8 has the measured parameters, the census findings, R7 as a known limitation and the lock statement; `npm run test:quick` and `npm run check` pass; records CRLF without BOM | review; command output |
| MP12b2-T07 | `flow-case.mjs` differs from `flow.mjs` only by the two edits (the record quotes the `--stat`); HL has one capture for each of the 20 Hell cases outside H, its rep by the rule and its manifest entry; no ratio divides one population's count by another's accepted puzzles (TP23) | `hell-landscape/`; record §7 |
| MP12b2-T08 | MP09d2's observations count as final-tuple evidence only with the quoted reuse argument (it fails at the resume); the availability probe ran again into `avail/`, and the derived areas of D39 come from final-tuple observations only (TP25) | record §1, §9; `avail-summary.md` |
| MP12b2-T09 | The criteria table of record §4 comes from GV2 reports with the locked tree's identity: the synthetic handoff check refused the old passing table (GV2 95 %, old 90 %, new 80 %) and `Assert-CriteriaSource` passed on the folder behind §4 (TP30) | command output; record §4 |
| MP12b2-T10 | Each 18x20 cell of population R whose first capture made no puzzle has its two extra captures (seeds `/1`, `/2`) in `require/`, through the capture function, with their rows in `runs.md` (PR-P1) | `require/`; `runs.md`; record §6 |
| MP12b2-T11 | The derived areas of record §9 follow check-list D39 exactly (the meeting rule, the interval, the contiguity step), one table per Hell level, from the coverage and cells of the aggregate in force | record §9; the aggregate |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP12b2\dv3-lock.ps1   # check-list §7 "Shared-machine lock protocol", saved verbatim
$s = 'docs/difficulty-v3/search-<date>'   # the scripts: observe.mjs, summary.mjs, flow-case.mjs, failfast.mjs
$data = $s   # the data root of captures and tables; "$s/change-1" in an ordered change round (TP33)
$d = 'docs/difficulty-v3/d21-2026-11-12'
$v = 'docs/difficulty-v3/d21-v3-2026-11-12'   # MP09d2's folder (read only)
$full = 'docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json'   # MP12b1's; a change round: its own aggregate
$criteriaFolder = 'docs/difficulty-v3/landscape-v3/r2'   # MP12a's final round; a change round: its slice folder
New-Item -ItemType Directory -Force "$data/require", "$data/any", "$data/hell", "$data/hell-landscape",
  'tests\artifacts\MP12b2' | Out-Null

# self-tests and checks: nothing is generated, no lock
$env:D21_OUT = 'tests/artifacts/MP12b2/selftest.jsonl'
if (Test-Path $env:D21_OUT) { Remove-Item $env:D21_OUT }
node --import "./$s/observe.mjs" "./$s/summary.mjs" --self-test
if ($LASTEXITCODE -ne 0) { throw 'summary self-test failed' }
Remove-Item Env:D21_OUT
node "./$s/failfast.mjs" --self-test
if ($LASTEXITCODE -ne 0) { throw 'failfast self-test failed' }
node --check "./$s/flow-case.mjs"
if ($LASTEXITCODE -ne 0) { throw 'flow-case.mjs does not parse' }
git --no-pager diff --no-index --stat "$d/flow.mjs" "$s/flow-case.mjs"
$env:D21_OUT = 'tests/artifacts/MP12b2/refused.jsonl'
node --import "./$s/observe.mjs" "./$s/flow-case.mjs" --case none --rep 0
if ($LASTEXITCODE -ne 1 -or (Test-Path $env:D21_OUT)) { throw 'flow-case.mjs did not refuse an unknown case' }
Remove-Item Env:D21_OUT

# runs.md, the identity and the capture function
if (-not (Test-Path "$data/runs.md")) {
  Set-Content "$data/runs.md" '| Capture | Start | End | Seconds | Outcome | Lock wait (s) |', '|---|---|---|---|---|---|'
}
$ref = (Get-Content $full -Raw | ConvertFrom-Json).source
function Identity([string]$When) {
  $json = node --input-type=module -e "import { readFileSync } from 'node:fs'; import { computeSourceDigest } from './tools/bench/report.js'; import { currentVersions } from './tools/record-fixtures.mjs'; console.log(JSON.stringify({ sourceDigest: await computeSourceDigest((p) => readFileSync(p, 'utf8')), versions: currentVersions() }))"
  if ($LASTEXITCODE -ne 0) { throw 'identity failed' }
  $id = $json | ConvertFrom-Json
  $head = git rev-parse HEAD
  $clean = @(git status --porcelain -- core tools).Count -eq 0
  $now = (Get-Date).ToString('HH:mm:ss')
  $versions = $id.versions | ConvertTo-Json -Compress
  Add-Content "$data/runs.md" ("| identity $When | $now | $now | 0 | digest $($id.sourceDigest), versions $versions, " +
    "HEAD $head, core and tools clean: $clean | - |")
  $differs = @('algo', 'policy', 'rng', 'model' | Where-Object { $id.versions.$_ -ne $ref.versions.$_ })
  if ($id.sourceDigest -ne $ref.sourceDigest -or $differs.Count -gt 0) {
    throw "identity $When differs from the landscape's: stop and report"
  }
}
function Capture([string]$Out, [string]$Preload, [string]$Script, [string[]]$ArgList, [int]$Seconds) {
  if (Test-Path -LiteralPath $Out) {
    throw "$Out exists: a capture is never overwritten (delete it only to repeat this capture on purpose, and say so)"
  }
  $r = Invoke-Dv3Timed -Task "MP12b2 $(Split-Path -Leaf $Out)" -LimitSeconds $Seconds -Environment @{ D21_OUT = $Out } `
    -NodeArgs (@('--import', "./$Preload", "./$Script") + $ArgList)
  $outcome = if ($r.TimedOut) { "stopped at the $Seconds s limit (reduced)" } else { "exit $($r.Exit)" }
  Add-Content "$data/runs.md" ("| $Out | $($r.Start.ToString('HH:mm:ss')) | $($r.End.ToString('HH:mm:ss')) | " +
    "$($r.Seconds) | $outcome | $($r.WaitedSeconds) |")
  if (-not $r.TimedOut -and $r.Exit -ne 0) { throw "$Out ended with exit $($r.Exit): stop and report" }
  $outcome
}

# block R + A: one line per capture of the table, in its order, for example:
Add-Content "$data/runs.md" '| plan R + A: the 20 captures of the table, 570 s each at most, expected 20-40 minutes | | | | | |'
Identity 'before R + A'
$null = Capture "$data/require/r-6x10-hard.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board', '6x10', '--level', 'hard',
  '--seed', 'probe-require/6x10-hard/0', '--uniqueness', 'require', '--quantity', '10', '--label', 'r-6x10-hard') 570
$null = Capture "$data/any/a-12x12-master.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board', '12x12', '--level', 'master',
  '--seed', 'search/12x12-master/0', '--quantity', '5', '--label', 'a-12x12-master') 570
# population R on 18x20 (PR-P1): two more requests for each cell whose first capture accepted no puzzle
foreach ($lv in 'hard', 'expert', 'master') {
  $first = "$data/require/r-18x20-$lv.jsonl"
  $ends = @(Get-Content $first | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.kind -eq 'event' -and $_.ev -eq 'end' })
  $acc = @(Get-Content $first | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.kind -eq 'event' -and $_.ev -eq 'accepted' })
  $made = if ($ends.Count -gt 0) { [int]$ends[-1].accepted } else { $acc.Count }
  if ($made -gt 0) { continue }
  foreach ($n in 1, 2) {
    $null = Capture "$data/require/r-18x20-$lv-$n.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board', '18x20', '--level',
      $lv, '--seed', "probe-require/18x20-$lv/$n", '--uniqueness', 'require', '--quantity', '10', '--label',
      "r-18x20-$lv-$n") 570
  }
}
Identity 'after R + A'

# block H: the five captures of the table, for example:
Add-Content "$data/runs.md" '| plan H: the 5 captures of the table, 300 s each, expected 25 minutes | | | | | |'
Identity 'before H'
$null = Capture "$data/hell/h-22x22-hell-3.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board', '22x22', '--level',
  'hell-3', '--seed', 't18-big-a', '--quantity', '10', '--label', 'h-22x22-hell-3') 300
Identity 'after H'

# block HL (TP23): the 20 Hell cases outside H, the rep by the rule, the manifest rewritten after each capture
$hl = @('14x14-hell-1', '15x15b10-hell-1', '16x16-hell-1', '15x20-hell-1', '18x18-hell-1', '18x20-hell-1',
  '20x20-hell-1', '20x21-hell-1', '32x15-hell-1', '22x22-hell-1', '24x24-hell-1', '26x26-hell-1', '18x20-hell-2',
  '20x20-hell-2', '20x21-hell-2', '32x15-hell-2', '22x22-hell-2', '24x24-hell-2', '26x26-hell-2', '26x26-hell-3')
$coverage = (Get-Content $full -Raw | ConvertFrom-Json).coverage
$mf = "$data/hell-landscape/manifest.json"
$manifest = [Collections.Generic.List[object]]::new()
if (Test-Path $mf) { foreach ($e in @(Get-Content $mf -Raw | ConvertFrom-Json)) { $manifest.Add($e) } }   # a resume
Add-Content "$data/runs.md" '| plan HL: 20 captures, 180 s (no puzzle in the landscape) or 570 s, expected 60-90 minutes | | | | | |'
Identity 'before HL'
foreach ($case in $hl) {
  if (@($manifest | Where-Object caseId -EQ $case).Count -gt 0) { continue }   # captured before a resume
  $report = @($coverage | Where-Object caseId -EQ $case)[0].report
  $runs = @((Get-Content $report -Raw | ConvertFrom-Json).runs |
    Where-Object { $_.caseId -eq $case -and $_.probeKind -eq 'generation' } | Sort-Object rep)
  $rule = 'complete'; $pick = @($runs | Where-Object acceptedCount -GE 10)
  if ($pick.Count -eq 0) { $rule = 'some-puzzle'; $pick = @($runs | Where-Object acceptedCount -GE 1) }
  if ($pick.Count -eq 0) { $rule = 'none'; $pick = @($runs | Where-Object rep -EQ 0) }
  $run = $pick[0]
  $limit = if ($rule -eq 'none') { 180 } else { 570 }
  $out = "$data/hell-landscape/hl-$case.jsonl"
  $outcome = Capture $out "$s/observe.mjs" "$s/flow-case.mjs" @('--case', $case, '--rep', "$($run.rep)", '--quantity',
    '10', '--label', "hl-$case") $limit
  $events = @(Get-Content $out | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object kind -EQ 'event')
  $end = @($events | Where-Object ev -EQ 'end')
  $acc = @($events | Where-Object ev -EQ 'accepted')
  $fs = @($events | Where-Object ev -EQ 'fold-start')
  if ($end.Count -gt 0) {
    $accepted = [int]$end[-1].accepted
    $final = [ordered]@{ status = $end[-1].status; accepted = $accepted; censored = $false }
  } else {
    $accepted = if ($acc.Count -gt 0) { [int]$acc[-1].slot }
      elseif ($fs.Count -gt 0) { [int]$fs[0].fromCalibration } else { 0 }
    $final = [ordered]@{ status = 'stopped at the limit'; accepted = $accepted; censored = $true }
  }
  $manifest.Add([ordered]@{ caseId = $case; rep = $run.rep; seedText = "landscape/$case/$($run.rep)"; report = $report
    rule = $rule; acceptedCount = $run.acceptedCount; K = $run.details.K; partialReason = $run.partialReason
    quantity = 10; limitS = $limit; capture = $out; outcome = $outcome; final = $final; source = $ref })
  $text = (ConvertTo-Json @($manifest) -Depth 6) -replace "`r?`n", "`r`n"
  [IO.File]::WriteAllText((Join-Path (Get-Location) $mf), "$text`r`n")
  if ($rule -ne 'none' -and $accepted -eq 0) {
    # an availability finding, no stop (P-OD9): record it as a named item and go on
    Add-Content "$data/runs.md" "| named item: hl-$case accepted no puzzle within $limit s; its landscape report made some (P-OD9) | | | | | |"
  }
}
Identity 'after HL'

# the availability probe again, only when MP09d2's observations cannot be reused (TP25)
$engineDiff = @(git --no-pager diff --stat eea5fed -- core/engine)
if ($LASTEXITCODE -ne 0) { throw 'git diff failed' }
$engineDiff += @(git status --porcelain -- core/engine)
$reuse = $engineDiff.Count -eq 0 -and $ref.versions.algo -eq 'gen-v3' -and $ref.versions.policy -eq 'mixed-v2' -and
  $ref.versions.rng -eq 'xoshiro128ss-v1' -and $ref.versions.model -eq 'difficulty-v3'
Add-Content "$data/runs.md" "| MP09d2 observations reusable (core/engine unchanged since eea5fed, same versions): $reuse | | | | | |"
if (-not $reuse) {
  New-Item -ItemType Directory -Force "$data/avail" | Out-Null
  Add-Content "$data/runs.md" '| plan availability: 6 captures, 570 s each at most, expected 17 minutes | | | | | |'
  Identity 'before availability'
  foreach ($a in @(@('13x13', 5, 'hell-1'), @('20x20', 0, 'hell-1'), @('19x14', 0, 'hell-2'), @('20x20', 0, 'hell-2'),
      @('25x18', 0, 'hell-3'), @('22x22', 0, 'hell-3'))) {
    $board, $blocked, $level = $a
    $name = if ($blocked -gt 0) { "avail-${board}b${blocked}-${level}" } else { "avail-${board}-${level}" }
    if (Test-Path "$data/avail/$name.jsonl") { continue }   # captured before a resume (its row is in runs.md)
    $argList = @('--board', $board)
    if ($blocked -gt 0) { $argList += @('--blocked', "$blocked") }
    $argList += @('--level', $level, '--seed', 't18-big-a', '--attempts', '3')
    $null = Capture "$data/avail/$name.jsonl" "$v/spent.mjs" "$v/avail.mjs" $argList 570
  }
  Identity 'after availability'
  $av = @(Get-ChildItem "$data/avail/*.jsonl" | Sort-Object Name | ForEach-Object { "$data/avail/$($_.Name)" })
  node "./$v/summarise.mjs" @av | Set-Content "$data/avail-summary.md"
  if ($LASTEXITCODE -ne 0) { throw 'summarise.mjs failed' }
}

# summary and fail-fast over R, A, H and HL (no lock: nothing is generated)
$files = @('require', 'any', 'hell', 'hell-landscape' | ForEach-Object {
  $pop = $_; Get-ChildItem "$data/$pop/*.jsonl" | Sort-Object Name | ForEach-Object { "$data/$pop/$($_.Name)" } })
node "./$s/summary.mjs" @files | Set-Content "$data/summary.md"
if ($LASTEXITCODE -ne 0) { throw 'summary failed' }
node "./$s/failfast.mjs" @files | Set-Content "$data/failfast.md"
if ($LASTEXITCODE -ne 0) { throw 'failfast failed' }

# population S (TP28): only under a recorded D21 decision "inert on the v3 corpus"; on this source it stays $false
$runStallRecheck = $false   # set to $true by hand only from that recorded decision, never from a text search
if ($runStallRecheck) {
  New-Item -ItemType Directory -Force "$data/stall" | Out-Null
  Identity 'before S'
  # one line per chosen cell, for example:
  $null = Capture "$data/stall/s-20x20-expert.jsonl" "$v/nostall.mjs" "$d/flow.mjs" @('--board', '20x20', '--level',
    'expert', '--seed', 'search-stall/20x20-expert/0', '--quantity', '5', '--label', 's-20x20-expert') 570
  Identity 'after S'
  $stall = @(Get-ChildItem "$data/stall/*.jsonl" | Sort-Object Name | ForEach-Object { "$data/stall/$($_.Name)" })
  node "./$d/simulate.mjs" @stall --ns 8,12,16 --list | Set-Content "$data/stall-simulate.md"
  if ($LASTEXITCODE -ne 0) { throw 'simulate.mjs failed' }
}

# record §4 (TP30): its C1-C5 table must come from GV2 reports measured on this tree; the synthetic check first
$gv2 = @(@('6x10', '10x10', '12x12') | ForEach-Object { $b = $_; @('easy', 'normal', 'hard', 'expert', 'master') |
  ForEach-Object { "$b-$_" } }) + @('18x20-hard', '18x20-expert', '18x20-master')
function Assert-CriteriaSource([string]$Folder, $Tree) {
  foreach ($c in $gv2) {
    $f = @(Get-ChildItem -LiteralPath $Folder -File |
      Where-Object { $_.Name -match "^$([regex]::Escape($c))-\d{4}-\d{2}-\d{2}\.json$" })
    if ($f.Count -ne 1) { throw "${Folder}: not exactly one report of $c" }
    $meta = (Get-Content -LiteralPath $f[0].FullName -Raw | ConvertFrom-Json).meta
    $differs = @('algo', 'policy', 'rng', 'model' | Where-Object { $meta.versions.$_ -ne $Tree.versions.$_ })
    if ($meta.sourceDigest -ne $Tree.sourceDigest -or $differs.Count -gt 0) {
      throw "$($f[0].Name) of $Folder was not measured on this tree: its criteria table cannot stand in record §4"
    }
  }
}
$hc = 'tests/artifacts/MP12b2/handoff-check'   # GV2 95 %: an old tuple's 90 % passes C2, the new tuple's 80 % fails it
foreach ($x in @(@('old', 'digest-old', 0.9), @('new', 'digest-new', 0.8))) {
  $name, $digest, $rate = $x
  New-Item -ItemType Directory -Force "$hc/$name" | Out-Null
  foreach ($c in $gv2) {
    $cell = [ordered]@{ caseId = $c; requestInBandRate = $rate; gv2RequestInBandRate = 0.95 }
    $report = [ordered]@{ meta = [ordered]@{ sourceDigest = $digest; versions = $ref.versions }
      calibration = [ordered]@{ cells = @($cell) } }
    [IO.File]::WriteAllText((Join-Path (Get-Location) "$hc/$name/$c-2026-01-01.json"), (ConvertTo-Json $report -Depth 6))
  }
}
$newTree = [pscustomobject]@{ sourceDigest = 'digest-new'; versions = $ref.versions }
$kept = $true
try { Assert-CriteriaSource "$hc/old" $newTree } catch { $kept = $false }
if ($kept) { throw 'the handoff check kept the old passing C2 table' }
Assert-CriteriaSource "$hc/new" $newTree
Assert-CriteriaSource $criteriaFolder $ref

# the lock: each command under the lock helper, then the identity of the locked tree
$r = Invoke-Dv3Timed -Task 'MP12b2 fixture check' -NodeArgs @('tools/record-fixtures.mjs', '--check')
if ($r.Exit -ne 0) { throw 'fixture check failed' }
$r = Invoke-Dv3Timed -Task 'MP12b2 GA-P2 final npm test' -NodeArgs @('--test', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'the final npm test failed' }
$r = Invoke-Dv3Timed -Task 'MP12b2 quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick set failed' }
Identity 'of the locked tree'
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

Boards are columns x rows, as in the landscape and `flow.mjs` (`6x10` is the GV2 board of 6 columns and 10 rows;
`20x20-expert` above is only an example of a list-2 cell). `node --test "tests/**/*.test.js"` is `npm test`
(`package.json`); a command stopped at the 590 s limit, or `$r.Exit` null, is a failure to report (AGENTS.md); never
raise a limit. In an ordered change round the block runs again with `$data = "$s/change-1"`, `$full` the change
round's aggregate and `$criteriaFolder` its `slice` folder; the scripts stay at `$s` (TP33). Without a change round,
`Assert-CriteriaSource` on MP12a's final round fails only if MP12b1 could not reuse the slice by identity: then the
criteria need a current-tuple evaluation (steps 5 and 8 of the change round), and the task stops and reports. After a
stop that was reported, and only when the orchestrator lets the task go on, a block resumes with its next capture: R,
A and H by their remaining lines (`Capture` refuses an existing file), HL and the availability block by running them
again (they skip the cases already in the manifest and the files already captured); the identity rows are written
again.

`runs.md`, `summary.md`, `failfast.md`, `avail-summary.md`, `hell-landscape/manifest.json` and `stall-simulate.md` are
written by PowerShell 7 (UTF-8 without BOM, CRLF): check them with the one-liner of check-list §3 and fix them before
the reply. The analysts ran this block at `a85ed55` on a stub tree (stub drivers and tools, a private lock folder,
`<date>` and `<k>` replaced, four and then three HL cases): the rep rule (`complete` rep 1, `some-puzzle` rep 2, `none`
rep 0 at 180 s), the censored count (calibration 1 + accepted events to slot 3 gives 3), a `set-failed` end, the HL
stop with the manifest kept (since P-OD9 a named item, not a stop), the availability branch with MP09d2's six file
names and arguments, S skipped, the lock
commands and the identity rows all behaved as written; a rerun skipped the HL cases of the manifest and the
availability files already captured. A second pass on the same tree, after an engine change and with the three change
round values (TP33), put every capture, a new HL manifest (all three cases captured again, from the change round's
reports), the availability probe and the derived tables under `change-1/`, loaded the scripts from `$s`, left the first
pass's files as they were, accepted the change round's `slice` folder and refused MP12a's final round under the new
identity; the synthetic 95/90/80 check refused the old passing table in both passes (TP30). A forgotten `$full` fails
closed: `Identity` stops on the changed digest.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the self-test results (summary, fail-fast), the identity rows and
  the reuse statement, the record §4 source check (TP30), the summary tables, the Hell report (H and HL with the
  manifest), the stall decision, the Hell availability with its evidence statement and the derived areas of D39,
  population R, the census cells, the fail-fast proposal with its outcome categories, the named items, the owner
  questions (each with its numbers and options), the machine time with the lock waits, and the lock statement.
- Handoff to MP12b3 (always; check-list D35): the record, the derived areas of D39, the aggregate in force, the
  owner questions; the orchestrator adds the owner's answers (recorded in `clarifications-resolved.md` Part H) to
  MP12b3's dispatch. MP12b3 completes the lock; from its commit on no rating or generated puzzle may change
  (check-list §6), and MP17 compares its final evidence with this record and MP12b3's.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |

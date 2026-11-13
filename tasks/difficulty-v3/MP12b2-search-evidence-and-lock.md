# MP12b2 — Search evidence, the Hell report, the owner's questions and the lock

| Header | Value |
|---|---|
| ID | MP12b2 (third part of the report's MP12; the **lock** of the v3 rating and generation) |
| Depends on | MP12b1 (accepted and committed: `docs/difficulty-v3/landscape-v3-full/` with the aggregate and its three lists) |
| Estimated size | Medium–Large: about 600–1,000 changed lines (`observe.mjs` given, `summary.mjs` about 150, `flow-case.mjs` about 20 changed lines of a copy, `failfast.mjs` with its self-test about 200, the record about 300, design §7.5 and §7.8 about 30; re-pins only in an ordered change round); about 60–90 minutes of developer work plus machine time under the lock protocol (cross-review TP20; the waits for the Sudoku repository and at least 15 s per lock release come on top). Expected, with the upper bound of the limits in brackets: GS-P3 R and A 20 captures, 20–40 minutes [190]; H five, 25 minutes [25]; HL 20 diagnostic replays, 60–90 minutes [190] (TP23); the availability probe again only when MP09d2's observations cannot be reused, six captures, about 16 minutes [57] (TP25); the final lock commands about 10 minutes. A change round, when ordered, is budgeted on its own from its enumerated evidence |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (the record: repaired candidates, capped outcomes; the lock), RES-01 (what the lock means), RES-26, RES-35; RES-15a and Part I D21 ("MP12 reports, per Hell cell, the ratings per puzzle and the generation time under v3"); Part I D36 and P-OD5 (the owner's question and the fail-fast proposal; the stall rule re-examined here only under a recorded "inert" decision); clarifications PROC-P1 (a), SA2-Q-P09 (branch A), P-OD1, P-OD2, P-OD3; Part I D37 and P-OD6 (the Hell population; the owner question states its evidence); check-list §4.2 D21, D29, D35, D36, D37 and §7 (the shared-machine lock protocol); cross-review SP16, SP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) and TP20, TP23, TP24, TP25, TP26, TP28 (its MP12 tranche) |
| Gates owned | GS-P3 (search evidence, new; check-list §7); GA-P2 (the final `npm test`); GF-P2 and GA-P2 again only in an ordered change round |
| Implementation status | Not started |

## Goal & business context

The calibration record must say not only what the landscape produced but how the search got there (RES-25:
repaired candidates, capped outcomes; cross-review SP16): how many clue sets were rated, refused for lack of a proved
guess (AR1), unrateable, repaired, per selection and per accepted puzzle. The plan author also asked for the Hell
cells' ratings per puzzle and generation time under v3 (D21), for the owner's decision on every board-and-level cell
that v3 cannot make (D36), and for a measured fail-fast proposal, so that a request that cannot succeed ends in
seconds with a clear notice instead of after two minutes. MP09d2 found the stall stop **not** inert: it fired on 10
`any`-mode calls at N = 12 and `STALL_LIMIT` stays 12 (its record §5.5). Population S, the re-examination of an inert
rule, is therefore skipped on this source, and the record says why (cross-review TP28).

Then the task writes the calibration record and **locks**: after it no knob, cap, rule, counter, clue-search setting,
`SHARES` or `K60` may change without a new model, algorithm or policy id and a new qualification (RES-01); MP13a to
MP17 must not change any rating or generated puzzle.

## Scope

### In scope

- Gate GS-P3: the search-evidence captures (populations R, A, H, the Hell companion HL and, only when a recorded D21
  decision says "inert on the v3 corpus", S), their summary and self-test, and the fail-fast check `failfast.mjs` with
  its self-test.
- The evidence provenance and, when MP09d2's observations cannot be reused, its availability probe again under the
  final tuple (cross-review TP25).
- The stall re-examination (only under that recorded decision; skipped on this source, TP28).
- The owner's question on the cells v3 cannot make (D36) and the fail-fast proposal, in the record and the reply.
- The record `docs/difficulty-v3/calibration-<date>.md` (the whole calibration: MP12a and MP12b1 by reference with
  their numbers, the search evidence, the Hell report, the questions, the final values, the lock).
- `docs/design-detail.md` §7.8 (measured parameters and the lock) and §7.5 (the Hell sentence of MP09d2 updated with
  the measured result); `docs/design-brief.md` only by the rule of the documentation slot.
- The lock's evidence: `record-fixtures --check` and the final `npm test` (GA-P2).

### Out of scope

- A knob, cap, `STALL_LIMIT` or fixture change, unless the orchestrator orders a change round (below).
- Implementing the owner's choice on the cells v3 cannot make, or the fail-fast: if the owner chooses option (i), the
  analysts write task part MP12b3 from this task's numbers, and the lock moves to it (below).
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
- Records are written once; nothing under `docs/difficulty-v3/landscape-v3/`, `landscape-v3-full/`, `baseline-v2/`,
  `d21-2026-11-12/`, `d21-v3-2026-11-12/` or the earlier records is edited. UTF-8 without BOM, CRLF, no absolute path
  in a record.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md` or the reports.

## Inputs & context

- MP12b1: `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json|.md` (the protocol coverage and the three
  lists: cells without a puzzle, one-sided cells, census cells), `shards-<date>.md` and the published reports (the
  selected report of each case is named in the coverage table); the source identity the landscape ran on.
- MP12a: `docs/difficulty-v3/calibration-slice-<date>.md` (criteria, changes, P-OD1 to P-OD3 outcomes, findings), the
  launcher `docs/difficulty-v3/landscape-v3/launch.mjs` and its "Run control" (used read-only, only in an ordered
  change round), and its table "The D36 and fixture re-pins" (TP26).
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
| R (`require`; repaired candidates, RES-25) | `r-6x10-<level>` for `easy`, `normal`, `hard`, `expert`, `master`; `r-18x20-<level>` for `hard`, `expert`, `master` (the cells of MP06b's corpus B) | `--board <board> --level <level> --seed probe-require/<board>-<level>/0 --uniqueness require --quantity 10 --label <name>` | 570 |
| A (`any`; AR1 refusals and unrateable profiles) | `a-<board>-<level>` for the boards `6x10`, `10x10`, `12x12`, `18x20` and the levels `hard`, `expert`, `master` | `--board <board> --level <level> --seed search/<board>-<level>/0 --quantity 5 --label <name>` | 570 |
| H (Hell cells of D21) | `h-22x22-hell-3` (`--quantity 10`); `h-32x15-hell-3`, `h-24x24-hell-3`, `h-15x20-hell-2`, `h-18x18-hell-2` (`--quantity 5`) | `--board <board> --level <level> --seed t18-big-a --quantity <n> --label <name>` | 300 |
| HL (the Hell companion; cross-review TP23) | `hl-<case id>` for the 20 Hell cases of the landscape that H does not cover: Hell 1 on all 12 boards, Hell 2 on 18x20, 20x20, 20x21, 32x15, 22x22, 24x24 and 26x26, Hell 3 on 26x26 | `--case <case id> --rep <rep> --quantity 10 --label hl-<case id>` (`flow-case.mjs`; the rep by the rule below) | 180 when the case's selected report accepted no puzzle; 570 when it accepted some |

Blocks: R and A together (expected 20–40 minutes), then H (25 minutes: these requests usually fail at their limit),
then HL (expected 60–90 minutes), then the availability probe only when MP09d2's observations cannot be reused (about
17 minutes; below). A capture stopped at its limit is labelled reduced in `runs.md` and keeps its lines.

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
- **A stop**: a cell whose selected report accepted puzzles but whose HL capture accepted none within 570 s has no
  measurable ratio within the bound: stop and report to the orchestrator before the record.

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
  the tree's; the record quotes that output as the reuse argument (at `a85ed55` both git commands print nothing;
  MP12a changes `core/engine` only when it changes a knob). Otherwise they stay in the record as historical, side by
  side, and never pool with the new observations.
- **The availability probe again** (only when that check fails): the six captures of MP09d2's record §4 under the
  final tuple, with its seed and exact boards, three set attempts each, into
  `$s/avail/avail-<board>[b<n>]-<level>.jsonl` (MP09d2's file names; preload
  `./docs/difficulty-v3/d21-v3-2026-11-12/spent.mjs`, script
  `./docs/difficulty-v3/d21-v3-2026-11-12/avail.mjs`, arguments `--board <WxH> [--blocked <n>] --level <id> --seed
  t18-big-a --attempts 3`, limit 570 s each; they took 97-288 s, 999 s in all): `13x13 --blocked 5` `hell-1` (164
  cells, `deterministicBoard(164)`), `20x20` `hell-1`, `19x14` `hell-2` (266), `20x20` `hell-2`, `25x18` `hell-3`
  (450), `22x22` `hell-3`. Then `node ./docs/difficulty-v3/d21-v3-2026-11-12/summarise.mjs <the six files>` into
  `$s/avail-summary.md`. The record keeps set attempts apart from full quantity-10 requests.
- **Boundaries from final-tuple observations only.** The proposed area boundaries of option (i) (below) come from
  observations of the final tuple: the landscape, H, HL and, when rerun, the availability probe, or MP09d2's when the
  reuse argument holds. Older results stay beside them for comparison, never as interchangeable samples. A boundary is
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

### The owner's question: cells v3 cannot make (D36, P-OD5)

For every (board area, level) of MP12b1's list 1, and every Hell cell of populations H and HL that made no puzzle: a
table with board, area, level, requests, the failure reasons, the profiles per failed calibration and their outcomes
(from H and HL, and from the availability probe where the cell was measured), and the time a request ran before it
failed (serial: `setMs` per set attempt; two-worker flow: MP09d2's recipe measurement). Each row says "no puzzle
observed in N requests" with its N, and "reduced (D37, P-OD6)" where MP12b1 kept 3 requests, with the boundary case of
its level; each row names its population and source identity (TP25); the record never calls a cell impossible
(cross-review TP08).

**The evidence the question rests on (D37, owner decision P-OD6).** The record states it above the table, per Hell
level: the boundary case (board, active cells and the result of its 20 requests); the cases whose prescreen made a
puzzle (20 requests each, with their request completion rates); the cases kept at the 3-request prescreen ("reduced
(D37, P-OD6)", read with the boundary case); populations H and HL; and the measurements of the smallest offered areas,
which the landscape does not contain: MP09d2's (`docs/difficulty-v3/d21-v3-2026-11-12.md` §4 and §6) when the reuse
argument of "Evidence provenance and the final tuple" holds, else the availability probe run again under the final
tuple, with MP09d2's results beside it as history. MP09d2 found: Hell 1 made on the 164-cell board (13 x 13 with 5
blocked: 2 of 3 attempts, calibration scores 93 and 103) and on no board of 300 cells or more (every profile capped);
Hell 2 not made on the 266-cell board (19 x 14: 26 rated profiles, all above the band, and 102 capped) or on 300, 324,
400 and 484 cells; Hell 3 on none of 450, 480, 484 and 576 cells (all capped). Each row names its source (a landscape
case with its N, an H or HL capture, an availability capture) and its failure mode: every profile unrateable (capped),
or rated profiles only above the band. For option (i) the record gives, per level, the largest area with an observed
puzzle and the smallest area without one, each with its N and source, from final-tuple observations only: (i) moves
the level's `areas` interval (`core/engine/levels.js`, `AREAS`: Hell 1 from 164, Hell 2 from 266 and Hell 3 from 450
cells, none with an upper end).

Then the options, word for word from the plan author's answer (`clarifications.md` Part I, D36), each with its
consequence:

- (i) stop offering it: raise or close the level's `areas` interval so that the Generator no longer shows a level it
  cannot produce (`core/engine/levels.js`, design §7.5, the brief, both user guides; packs and links made earlier still
  open and are re-rated for display as decided). **The plan author's recommendation.**
- (ii) keep the level for those areas under an explicitly different contract ("beyond the measured range: the search
  budget was exhausted"), shown as such and never as a score; this reopens SA2-Q-P02 for Hell levels only and needs the
  owner's explicit decision.
- (iii) a separate engine project (D36 option (b)): a faster first-solution search for boards with 30 or more free
  pieces, with its own corpus, fit and qualification; not part of difficulty-v3.

The plan author's recommendation, quoted: "(i), with (iii) as later work if Hell levels matter, because (ii)
reintroduces a label the rating cannot back."

The reply puts the question to the orchestrator, who relays the owner's answer. The task then continues:

- **(i)**: stop before the lock; the analysts write MP12b3 ("stop offering the levels v3 cannot make") from this
  table; MP12b3 changes the areas, the tests that pin them, design §7.5, the brief and the guides, and takes over the
  lock steps below (its commit message also starts with `difficulty-v3 MP12b`, check-list D35).
- **(ii) or (iii)**: recorded in the record (§9) as the owner's answer with its follow-up outside this pack; this task
  continues with the lock. The levels stay offered, so the brief gets the sentence of the documentation slot.

### The fail-fast proposal (D36; a proposal, not implemented)

From H and HL, from MP09d2's records and from R and A (the check against false stops):

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
4. The notice it would show, an observation, not a statement of impossibility, in English and Vietnamese (draft for
   the owner; the wording of an implementation is later work): "No <level> puzzle was found within the search limits:
   the difficulty ratings tried reached their work limits." / "Không tìm thấy đề mức <level> trong giới hạn tìm kiếm:
   các lần đo độ khó đã thử đều chạm giới hạn tính toán."

The owner decides; implementing it is a later task (it changes generation, so after the lock it needs a new
algorithm id).

### The record `docs/difficulty-v3/calibration-<date>.md`

English, CRLF:

1. Header: date, code revision, Node version, CPU count, the final knobs and caps (as literals), `STALL_LIMIT`, the
   commands, total machine time (MP12a, MP12b1, MP12b2) and the lock waits; the source identity of each population
   (the landscape, R and A, H, HL, the availability probe) with the reuse argument for MP09d2's observations or the
   statement that they were measured again (TP25).
2. Coverage (MP12b1's coverage table, by reference with its totals; the Hell run plan of P-OD6: the boundary case of
   each level and the reduced Hell cases named; HL's manifest: case, rep, rule and limit per capture).
3. Per board and level (from MP12b1's aggregate): request completion rate (MP12a's `requestCompletionRate`, MP11's
   `requestInBandRate`), yield, T10 median and p95, peak memory, the v3 score distribution (median, p95), the G,
   `info`, Cmax, `deductionTier` and `solutions` distributions, the census-estimate share, `provedZero` (must be 0),
   unrateable diagnostic samples (with their denominator, never as accepted puzzles), partial and incomplete outcomes;
   a missing value is shown as unavailable.
4. The criteria of RES-25 on the GV2 boards (MP12a's final round, by reference with the numbers) and, for the other
   boards, the level ordering and the Hard and Expert request completion rates as reported facts (never compared with
   an invented baseline).
5. P-OD1 (census estimates per cell over the whole landscape against the 5 % rule; MP12b1's list 3), P-OD2 (capped
   paths of accepted puzzles: none, or the cells; the unrateable profiles of the search evidence), P-OD3 (MP12a's
   outcome).
6. Search evidence (GS-P3, cross-review SP16): the summary tables of R, A, H and HL, each population in its own table
   with its denominators and source identity; repaired candidates (RES-25; TP07): the repair attempts, the successful
   repairs and the results from a repair of R, each with its denominator, and the finish outcomes; the time per rated
   and per capped rating; the self-test result. Censored rows keep their `*`.
7. Hell report (D21): per Hell cell, from H or HL (one capture each): the ratings per accepted puzzle and the
   generation time (set, fold, total), or the failure with its profiles and time; beside it, in separate columns,
   MP12b1's request completion rate and response times for the landscape cases (none for H's seed `t18-big-a`); the
   `STALL_LIMIT` in force. A count of one population is never divided by another population's accepted puzzles; the
   availability probe's set attempts stay apart from quantity-10 requests.
8. The stall stop: MP09d2's D21-V3 decision (on this source: not inert, 10 firings at N = 12; `STALL_LIMIT` 12;
   population S skipped, with that reason) and, only when a recorded decision said inert, the re-examination S
   (captures, the TOTAL rows for N = 8, 12 and 16, the decision).
9. Levels v3 cannot make (D36): the evidence statement (P-OD6), the table, the options with their consequences, the
   plan author's recommendation and the owner's answer when it is given.
10. The fail-fast proposal: the numbers, F1, F2 and F1 + F2 with the completed baselines, triggers, observed false
    stops, correct stops and unknown outcomes of `failfast.md`, the self-test result and the notice.
11. The final values and every change since MP08 (from MP12a's record), with the reasons.
12. The lock statement (below).
13. Findings for the owner (cells with poor availability, orderings that fail outside the GV2 boards, census
    estimates above 5 %, long times, a fail-fast or stall finding), or "none".

### Findings and an ordered change round (cross-review TP25, TP26)

A finding is reported in the reply before the lock; the orchestrator decides. Without an order, nothing changes. If it
orders a change round, the task does the following in this order and records each step (the record and `runs.md`):

1. **Enumerate before changing.** The record names the change (within the ranges of RES-18 and SA2-Q-P09 branch A,
   as MP12a's "Choosing a change", or the `STALL_LIMIT` raise of the re-examination) and the evidence it affects. A
   change of a `SCORE_V3` weight, a band, a cap, `DEDUCE`, `K60`, `SHARES`, `POLICY_ID` or `STALL_LIMIT` reaches every
   generation case and every population: the whole landscape (MP12b1's run plan, the Hell prescreens and the P-OD6
   plan included, and the 18 slice cases), R, A, H, HL, the availability probe and the fail-fast table. A narrower set
   needs a written dependency argument that the orchestrator accepts before the runs. The orchestrator also gets the
   machine-time projection of the enumerated runs (a whole landscape is MP12b1's 9.5–14.5 hours) before they start.
2. **The change and its re-pins**: MP12a's "Pinned tests" and its table "The D36 and fixture re-pins" (TP26), each
   pin settled as that table says, its commands A and B run with this task's helper and folders
   (`tests\artifacts\MP12b2\dv3-lock.ps1`, `tests/artifacts/MP12b2/change-1/d36/`, task labels `MP12b2 change-1 …`).
   A semantic failure (a request that no longer succeeds, a premise that no longer holds) stops: never a re-pin.
3. **The between-round checks** of MP12a's "Test order around a knob change", under the lock (the
   fixture-independent files and the slow tests only; before GF-P2 the fixture-dependent files and the quick set fail
   by design and gate nothing; TP06).
4. **The affected evidence again, in new paths, never overwriting and never pooling two tuples**: the landscape by
   MP12b1's shard procedure and MP12a's launcher (staging `tests/artifacts/MP12b2/change-1/landscape/`, published
   into `docs/difficulty-v3/landscape-v3-change-1/`), then MP12b1's `aggregate.mjs --full
   docs/difficulty-v3/landscape-v3-change-1 --slice docs/difficulty-v3/landscape-v3-change-1 --date <date>` (the
   selected-report map and the aggregate rebuilt, written into that folder); then GS-P3's affected populations under
   `$s/change-1/` with the same folder names (`require/`, `any/`, `hell/`, `hell-landscape/`, `avail/`), the summary
   and `failfast.mjs` on them, and the owner's question refreshed from these results only. The provenance rules
   above apply with the change round's landscape identity. The earlier results stay in the record as history, side by
   side, labelled with their identity.
5. **GF-P2, the strict post-GF-P2 checks and GA-P2**, exactly as MP12a's "GF-P2 and GA-P2" block with this task's
   helper and the reason `P3: v3 calibration (final)`; the first `npm test` is kept in
   `tests/artifacts/MP12b2/ga-p2-first.txt`.
6. **Stops before the lock**: a `missing` or `invalid` case of the new aggregate, an HL stop, a semantic failure, or
   an availability decision that changed (a level made or lost on an area, against the owner's question as asked):
   report to the orchestrator. P-OD5 and P-OD6 stay as decided, and no fail-fast is implemented here.

### The lock (RES-01, RES-25)

- Evidence: on the locked tree, under the lock helper, `node tools\record-fixtures.mjs --check` passes and the final
  `npm test` (GA-P2, `node --test "tests/**/*.test.js"`) passes; `git --no-pager diff --stat` shows no change under
  `core/` or `tools/` in this task (unless a change round ran); the source identity printed after the final
  `npm test` equals the identity of the record's evidence (MP12b1's landscape, or the change round's).
- Statement, in the record and in design §7.8: "The `difficulty-v3` rating (`SCORE_V3`, `DEDUCE`), the clue search
  (`gen-v3`, `STALL_LIMIT`), `K60`, `SHARES` and `POLICY_ID` are locked at <revision>. Any later change of a weight, a
  cap, a band, a rule of the deduction ladder, the census, a counter, the clue search, `SHARES` or `K60` needs a new
  model, algorithm or policy id and a new qualification."

## Files to create/modify

| File | Change |
|---|---|
| `docs/difficulty-v3/search-<date>/` (new) | `observe.mjs`, `summary.mjs`, `flow-case.mjs` (TP23), `failfast.mjs` (TP24), the captures under `require/`, `any/`, `hell/`, `hell-landscape/` (with `manifest.json`) and, when run, `avail/` (TP25) and `stall/`; `runs.md`, `summary.md`, `failfast.md`, `avail-summary.md` (when `avail/` ran), `stall-simulate.md` (when S ran); `change-1/` only in an ordered change round |
| `docs/difficulty-v3/landscape-v3-change-1/` (new, only in an ordered change round) | the change round's published landscape reports, shard table and aggregate |
| `docs/difficulty-v3/calibration-<date>.md` (new) | the record |
| `docs/design-detail.md` | §7.8; §7.5 (the Hell sentence) |
| `docs/design-brief.md` | only by the rule below |
| knob values, `STALL_LIMIT`, re-pins, fixtures | only in an ordered change round |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12b2/` (the lock helper
`dv3-lock.ps1`, the self-test file, the change round's staging). Documentation slot:
design §7.8 (below); design §7.5, the sentence MP09d2 added about the Hell levels, updated with the measured result
(which levels and boards v3 could not make) and, once given, the owner's answer; `docs/design-brief.md` "Levels and
typical boards", one sentence, only when the owner keeps levels v3 cannot make on offer ((ii) not yet implemented, or
(iii)): "Hell levels are listed for the boards in the table, but the current rating cannot measure them on the boards
named in the design notes, so a request for one ends without a puzzle." (cross-review SP07). Must not edit: algorithm
code (outside a change round), MP12a's and MP12b1's records, folders and scripts (`launch.mjs`, `criteria.mjs`,
`aggregate.mjs` are run, never changed), MP09d2's folder and the D21 folder `d21-2026-11-12/` (its `flow.mjs` is
copied, never edited), `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`.

### `docs/design-detail.md` §7.8 (after MP09d2's edits)

Replace the provisional sentence on the v3 knobs with the measured parameters: the final `SCORE_V3` and `DEDUCE`
values, `K60` and `SHARES` (unchanged or changed, with the reason), `STALL_LIMIT`, the request completion rates and
availability in two or three sentences with a link to `docs/difficulty-v3/calibration-<date>.md`, the census-estimate
share, and the lock statement. §7.9 and §7.10 keep pointing to `policy.js` for the values (no copy of numbers that
could drift).

## Implementation steps

1. Read the inputs; save the lock helper; create `observe.mjs` exactly, write `summary.mjs`, copy and edit
   `flow-case.mjs`, write `failfast.mjs`; run the summary and fail-fast self-tests, `node --check` and the refused
   `flow-case.mjs` call (all quick, no lock: nothing is generated).
2. The identity (`Identity`) against MP12b1's aggregate; the reuse check for MP09d2's observations (TP25).
3. Write each block's plan into `runs.md`, then run the blocks one capture per lock: R + A, then H, then HL (the rep
   rule and the manifest), then the availability probe only when the reuse check failed; the identity before and
   after each block; summarise (`summary.md`, `avail-summary.md`) and run `failfast.mjs` into `failfast.md`.
4. The stall re-examination only when `$runStallRecheck` is true (on this source it is false: S is skipped and the
   record says why).
5. The owner's question and the fail-fast proposal; the record (§9 waits for the answer); report findings and the
   question, and wait for the orchestrator's decision (an ordered change round runs as its section says).
6. Without option (i): under the lock helper, `record-fixtures --check`, the final `npm test`, the quick set; the
   identity after them; design §7.8 and §7.5 (and the brief by its rule), the lock statement; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b2-B01 | The calibration record shows how the search reached its puzzles: rated, refused (AR1), unrateable and repair ratings, successful repairs, per selection and per accepted puzzle, for `require` and `any` cells | record §6; the summary |
| MP12b2-B02 | Every Hell cell of the landscape is reported from a capture of its own population (H or HL; TP23) with ratings per accepted puzzle and generation time under v3, or its failure with numbers, censoring shown; the landscape's request completion rates stay in their own columns (D21) | record §7; `hell-landscape/manifest.json` |
| MP12b2-B03 | The owner gets, for every cell v3 cannot make, the facts with the evidence each rests on (P-OD6: its requests, the boundary case of its level; the smallest areas measured under the final tuple or MP09d2's with the reuse argument; TP25) and the three options with the plan author's recommendation, and a measured fail-fast proposal stated as "no false stop observed in N completed baselines" with its unknown outcomes (D36, TP24) | record §9, §10; `failfast.md`; the reply |
| MP12b2-B04 | The stall stop follows the recorded D21 decision: on this source (not inert) S is skipped with the reason; S runs only under a recorded "inert" decision, and `STALL_LIMIT` stays 12 or is raised to 16 only by the rule (TP28) | record §8 |
| MP12b2-B05 | The v3 rating and generation are locked on the tree whose identity the evidence carries, and the design document says what the lock means | record §12; design §7.8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b2-T01 | `observe.mjs` exactly as given (repairs observed through the `finish` bracket, each attempt timed; TP07); `summary.mjs` to its contract (censored rows marked, one TOTAL row per population folder); the self-test passes with the four cases of the table (`repair-ri-0` among them) and the summary row of its own file | command output |
| MP12b2-T02 | Every capture of R, A, H, HL (and `avail/` and S when run) ran through `Invoke-Dv3Timed`, one capture per lock, within its limit, and is in `runs.md` with its outcome and lock wait, never overwritten; the identity before and after each block equals the landscape's; the summary's denominators are stated (TP20, TP25) | `runs.md`; the folder |
| MP12b2-T03 | The stall decision follows the recorded D21 decision and MP09d2's table: `$runStallRecheck` is set only from that decision, never by a text search; a raise happens only in an ordered change round with GF-P2 and GA-P2 (TP28) | record §8; the test plan; diff |
| MP12b2-T04 | `failfast.mjs --self-test` passes its four cases (SA2's combined case, an all-capped completed request, an F2-lost successful call, a censored tail); `failfast.md` gives F1, F2 and F1 + F2 over R, A, H and HL with completed baselines, triggers, observed false stops, correct stops and unknown outcomes (TP24) | command output; `failfast.md` |
| MP12b2-T05 | `record-fixtures --check` and the final `npm test` pass on the locked tree under the lock helper; no `core/` or `tools/` change in this task without an ordered change round; an ordered change round followed its six steps with new paths (TP25, TP26) | command output; diff; record |
| MP12b2-T06 | Design §7.8 has the measured parameters and the lock statement, §7.5 the measured Hell result; the brief follows its rule; `npm run test:quick` and `npm run check` pass; records CRLF without BOM | review; command output |
| MP12b2-T07 | `flow-case.mjs` differs from `flow.mjs` only by the two edits (the record quotes the `--stat`); HL has one capture for each of the 20 Hell cases outside H, its rep by the rule and its manifest entry; no ratio divides one population's count by another's accepted puzzles (TP23) | `hell-landscape/`; record §7 |
| MP12b2-T08 | MP09d2's observations count as final-tuple evidence only with the quoted reuse argument; otherwise the availability probe ran again into `avail/` and the boundaries of option (i) come from final-tuple observations only (TP25) | record §1, §9; `avail-summary.md` |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP12b2\dv3-lock.ps1   # check-list §7 "Shared-machine lock protocol", saved verbatim
$s = 'docs/difficulty-v3/search-<date>'
$d = 'docs/difficulty-v3/d21-2026-11-12'
$v = 'docs/difficulty-v3/d21-v3-2026-11-12'   # MP09d2's folder (read only)
$full = 'docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json'   # MP12b1's aggregate
New-Item -ItemType Directory -Force "$s/require", "$s/any", "$s/hell", "$s/hell-landscape", 'tests\artifacts\MP12b2' |
  Out-Null

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
if (-not (Test-Path "$s/runs.md")) {
  Set-Content "$s/runs.md" '| Capture | Start | End | Seconds | Outcome | Lock wait (s) |', '|---|---|---|---|---|---|'
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
  Add-Content "$s/runs.md" ("| identity $When | $now | $now | 0 | digest $($id.sourceDigest), versions $versions, " +
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
  Add-Content "$s/runs.md" ("| $Out | $($r.Start.ToString('HH:mm:ss')) | $($r.End.ToString('HH:mm:ss')) | " +
    "$($r.Seconds) | $outcome | $($r.WaitedSeconds) |")
  if (-not $r.TimedOut -and $r.Exit -ne 0) { throw "$Out ended with exit $($r.Exit): stop and report" }
  $outcome
}

# block R + A: one line per capture of the table, in its order, for example:
Add-Content "$s/runs.md" '| plan R + A: the 20 captures of the table, 570 s each at most, expected 20-40 minutes | | | | | |'
Identity 'before R + A'
$null = Capture "$s/require/r-6x10-hard.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board', '6x10', '--level', 'hard',
  '--seed', 'probe-require/6x10-hard/0', '--uniqueness', 'require', '--quantity', '10', '--label', 'r-6x10-hard') 570
$null = Capture "$s/any/a-12x12-master.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board', '12x12', '--level', 'master',
  '--seed', 'search/12x12-master/0', '--quantity', '5', '--label', 'a-12x12-master') 570
Identity 'after R + A'

# block H: the five captures of the table, for example:
Add-Content "$s/runs.md" '| plan H: the 5 captures of the table, 300 s each, expected 25 minutes | | | | | |'
Identity 'before H'
$null = Capture "$s/hell/h-22x22-hell-3.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board', '22x22', '--level',
  'hell-3', '--seed', 't18-big-a', '--quantity', '10', '--label', 'h-22x22-hell-3') 300
Identity 'after H'

# block HL (TP23): the 20 Hell cases outside H, the rep by the rule, the manifest rewritten after each capture
$hl = @('14x14-hell-1', '15x15b10-hell-1', '16x16-hell-1', '15x20-hell-1', '18x18-hell-1', '18x20-hell-1',
  '20x20-hell-1', '20x21-hell-1', '32x15-hell-1', '22x22-hell-1', '24x24-hell-1', '26x26-hell-1', '18x20-hell-2',
  '20x20-hell-2', '20x21-hell-2', '32x15-hell-2', '22x22-hell-2', '24x24-hell-2', '26x26-hell-2', '26x26-hell-3')
$coverage = (Get-Content $full -Raw | ConvertFrom-Json).coverage
$mf = "$s/hell-landscape/manifest.json"
$manifest = [Collections.Generic.List[object]]::new()
if (Test-Path $mf) { foreach ($e in @(Get-Content $mf -Raw | ConvertFrom-Json)) { $manifest.Add($e) } }   # a resume
Add-Content "$s/runs.md" '| plan HL: 20 captures, 180 s (no puzzle in the landscape) or 570 s, expected 60-90 minutes | | | | | |'
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
  $out = "$s/hell-landscape/hl-$case.jsonl"
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
    $accepted = if ($acc.Count -gt 0) { [int]$acc[-1].slot } elseif ($fs.Count -gt 0) { [int]$fs[0].fromCalibration } else { 0 }
    $final = [ordered]@{ status = 'stopped at the limit'; accepted = $accepted; censored = $true }
  }
  $manifest.Add([ordered]@{ caseId = $case; rep = $run.rep; seedText = "landscape/$case/$($run.rep)"; report = $report
    rule = $rule; acceptedCount = $run.acceptedCount; K = $run.details.K; partialReason = $run.partialReason
    quantity = 10; limitS = $limit; capture = $out; outcome = $outcome; final = $final; source = $ref })
  $text = (ConvertTo-Json @($manifest) -Depth 6) -replace "`r?`n", "`r`n"
  [IO.File]::WriteAllText((Join-Path (Get-Location) $mf), "$text`r`n")
  if ($rule -ne 'none' -and $accepted -eq 0) { throw "hl-${case}: the landscape made puzzles, the replay none: stop and report" }
}
Identity 'after HL'

# the availability probe again, only when MP09d2's observations cannot be reused (TP25)
$engineDiff = @(git --no-pager diff --stat eea5fed -- core/engine)
if ($LASTEXITCODE -ne 0) { throw 'git diff failed' }
$engineDiff += @(git status --porcelain -- core/engine)
$reuse = $engineDiff.Count -eq 0 -and $ref.versions.algo -eq 'gen-v3' -and $ref.versions.policy -eq 'mixed-v2' -and
  $ref.versions.rng -eq 'xoshiro128ss-v1' -and $ref.versions.model -eq 'difficulty-v3'
Add-Content "$s/runs.md" "| MP09d2 observations reusable (core/engine unchanged since eea5fed, same versions): $reuse | | | | | |"
if (-not $reuse) {
  New-Item -ItemType Directory -Force "$s/avail" | Out-Null
  Add-Content "$s/runs.md" '| plan availability: 6 captures, 570 s each at most, expected 17 minutes | | | | | |'
  Identity 'before availability'
  foreach ($a in @(@('13x13', 5, 'hell-1'), @('20x20', 0, 'hell-1'), @('19x14', 0, 'hell-2'), @('20x20', 0, 'hell-2'),
      @('25x18', 0, 'hell-3'), @('22x22', 0, 'hell-3'))) {
    $board, $blocked, $level = $a
    $name = if ($blocked -gt 0) { "avail-${board}b${blocked}-${level}" } else { "avail-${board}-${level}" }
    if (Test-Path "$s/avail/$name.jsonl") { continue }   # captured before a resume (its row is in runs.md)
    $argList = @('--board', $board)
    if ($blocked -gt 0) { $argList += @('--blocked', "$blocked") }
    $argList += @('--level', $level, '--seed', 't18-big-a', '--attempts', '3')
    $null = Capture "$s/avail/$name.jsonl" "$v/spent.mjs" "$v/avail.mjs" $argList 570
  }
  Identity 'after availability'
  $av = @(Get-ChildItem "$s/avail/*.jsonl" | Sort-Object Name | ForEach-Object { "$s/avail/$($_.Name)" })
  node "./$v/summarise.mjs" @av | Set-Content "$s/avail-summary.md"
  if ($LASTEXITCODE -ne 0) { throw 'summarise.mjs failed' }
}

# summary and fail-fast over R, A, H and HL (no lock: nothing is generated)
$files = @('require', 'any', 'hell', 'hell-landscape' | ForEach-Object {
  $pop = $_; Get-ChildItem "$s/$pop/*.jsonl" | Sort-Object Name | ForEach-Object { "$s/$pop/$($_.Name)" } })
node "./$s/summary.mjs" @files | Set-Content "$s/summary.md"
if ($LASTEXITCODE -ne 0) { throw 'summary failed' }
node "./$s/failfast.mjs" @files | Set-Content "$s/failfast.md"
if ($LASTEXITCODE -ne 0) { throw 'failfast failed' }

# population S (TP28): only under a recorded D21 decision "inert on the v3 corpus"; on this source it stays $false
$runStallRecheck = $false   # set to $true by hand only from that recorded decision, never from a text search
if ($runStallRecheck) {
  New-Item -ItemType Directory -Force "$s/stall" | Out-Null
  Identity 'before S'
  # one line per chosen cell, for example:
  $null = Capture "$s/stall/s-20x20-expert.jsonl" "$v/nostall.mjs" "$d/flow.mjs" @('--board', '20x20', '--level',
    'expert', '--seed', 'search-stall/20x20-expert/0', '--quantity', '5', '--label', 's-20x20-expert') 570
  Identity 'after S'
  $stall = @(Get-ChildItem "$s/stall/*.jsonl" | Sort-Object Name | ForEach-Object { "$s/stall/$($_.Name)" })
  node "./$d/simulate.mjs" @stall --ns 8,12,16 --list | Set-Content "$s/stall-simulate.md"
  if ($LASTEXITCODE -ne 0) { throw 'simulate.mjs failed' }
}

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
raise a limit. In an ordered change round, the same functions run with `$s/change-1` in place of `$s` for the
populations, `Identity` compared with the change round's aggregate. After a stop that was reported, and only when the
orchestrator lets the task go on, a block resumes with its next capture: R, A and H by their remaining lines
(`Capture` refuses an existing file), HL and the availability block by running them again (they skip the cases
already in the manifest and the files already captured); the identity rows are written again.

`runs.md`, `summary.md`, `failfast.md`, `avail-summary.md`, `hell-landscape/manifest.json` and `stall-simulate.md` are
written by PowerShell 7 (UTF-8 without BOM, CRLF): check them with the one-liner of check-list §3 and fix them before
the reply. The analysts ran this block at `a85ed55` on a stub tree (stub drivers and tools, a private lock folder,
`<date>` replaced, four and then three HL cases): the rep rule (`complete` rep 1, `some-puzzle` rep 2, `none` rep 0 at
180 s), the censored count (calibration 1 + accepted events to slot 3 gives 3), a `set-failed` end, the HL stop with
the manifest kept, the availability branch with MP09d2's six file names and arguments, S skipped, the lock commands
and the identity rows all behaved as written; a rerun skipped the HL cases of the manifest and the availability files
already captured.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the self-test results (summary, fail-fast), the identity rows and
  the reuse statement, the summary tables, the Hell report (H and HL with the manifest), the stall decision, the
  owner's question with its table and evidence statement, the fail-fast proposal with its outcome categories, the
  findings, the machine time with the lock waits, and (after the lock) the lock revision.
- Handoff to MP13a to MP17: the lock revision; from now on no rating or generated puzzle may change (check-list §6);
  MP17 compares its final evidence with this record. If the owner chose option (i), the handoff is to MP12b3 instead,
  which locks.

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

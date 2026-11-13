# MP12b2 — Search evidence, the Hell report, the owner's questions and the lock

| Header | Value |
|---|---|
| ID | MP12b2 (third part of the report's MP12; the **lock** of the v3 rating and generation) |
| Depends on | MP12b1 (accepted and committed: `docs/difficulty-v3/landscape-v3-full/` with the aggregate and its three lists) |
| Estimated size | Medium: about 350–600 changed lines (two scripts about 150, the record about 250, design §7.5 and §7.8 about 30; re-pins only in an ordered change round); about 50–60 minutes of developer work plus machine time: gate GS-P3 about 45–90 minutes in announced blocks, the final `npm test` about 5–10 minutes |
| Owner role | Measurement |
| Milestone | M7 — calibrated and locked |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-25 (the record: repaired candidates, capped outcomes; the lock), RES-01 (what the lock means), RES-26, RES-35; RES-15a and Part I D21 ("MP12 reports, per Hell cell, the ratings per puzzle and the generation time under v3"); Part I D36 and P-OD5 (the owner's question and the fail-fast proposal; an inert stall rule re-examined here); clarifications PROC-P1 (a), SA2-Q-P09 (branch A), P-OD1, P-OD2, P-OD3; Part I D37 and P-OD6 (the Hell population; the owner question states its evidence); check-list §4.2 D21, D29, D35, D36, D37; cross-review SP16, SP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`, second pass) |
| Gates owned | GS-P3 (search evidence, new; check-list §7); GA-P2 (the final `npm test`); GF-P2 and GA-P2 again only in an ordered change round |
| Implementation status | Not started |

## Goal & business context

The calibration record must say not only what the landscape produced but how the search got there (RES-25:
repaired candidates, capped outcomes; cross-review SP16): how many clue sets were rated, refused for lack of a proved
guess (AR1), unrateable, repaired, per selection and per accepted puzzle. The plan author also asked for the Hell
cells' ratings per puzzle and generation time under v3 (D21), for the owner's decision on every board-and-level cell
that v3 cannot make (D36), and for a measured fail-fast proposal, so that a request that cannot succeed ends in
seconds with a clear notice instead of after two minutes. When MP09d2 found the stall stop inert on its corpus, the
rule is re-examined here on the landscape cells where it can matter.

Then the task writes the calibration record and **locks**: after it no knob, cap, rule, counter, clue-search setting,
`SHARES` or `K60` may change without a new model, algorithm or policy id and a new qualification (RES-01); MP13a to
MP17 must not change any rating or generated puzzle.

## Scope

### In scope

- Gate GS-P3: the search-evidence captures (populations R, A, H and, when needed, S), their summary and self-test.
- The stall re-examination (only when MP09d2's record says "inert on the v3 corpus").
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
- Heavy runs exactly as written below. **Announce each block of GS-P3 and the final `npm test` to the orchestrator
  before starting it** (the Sudoku repository runs in parallel on the same machine; never two heavy runs at once):
  give the captures and the expected wall time; these runs report times, so start only when the orchestrator says the
  machine is free. Every command runs attached, in its own process with its time limit, under 10 minutes.
- Records are written once; nothing under `docs/difficulty-v3/landscape-v3/`, `landscape-v3-full/`, `baseline-v2/`,
  `d21-2026-11-12/`, `d21-v3-<date>/` or the earlier records is edited. UTF-8 without BOM, CRLF, no absolute path in
  a record.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, `plan.md`,
  `clarifications.md` or the reports.

## Inputs & context

- MP12b1: `docs/difficulty-v3/landscape-v3-full/aggregate-<date>.json|.md` (the three lists: cells without a puzzle,
  one-sided cells, census cells) and `shards-<date>.md`.
- MP12a: `docs/difficulty-v3/calibration-slice-<date>.md` (criteria, changes, P-OD1 to P-OD3 outcomes, findings).
- MP09d2: `docs/difficulty-v3/d21-v3-2026-11-12.md` (the `STALL_LIMIT` decision, "inert on the v3 corpus" or not,
  the Hell outcomes, the availability probe, the two-worker time of the failing Hell recipe) and its folder
  `docs/difficulty-v3/d21-v3-2026-11-12/` (`nostall.mjs`, the `Capture` function of its test plan). Its outcome:
  `STALL_LIMIT` stays 12 and the rule is not inert (it fired on 10 `any`-mode calls at N = 12, §5.5), so population
  S is skipped and record §8 says why; of the Hell cells it measured, only Hell 1 on the 164-cell board made a puzzle
  (§4, §6); the recipe is `square-22x22-nightmare` and MP07's 15 x 20 slow test runs Nightmare (§3).
- The D21 drivers, read only and run from where they are: `docs/difficulty-v3/d21-2026-11-12/register.mjs` (the
  observer: one `call` line per `selectClues` call with `target`, `mode`, `ratings` (the `onRate` sequence: `s`, `c`,
  `t` …), `repairs`, `ms` and `result` (`ok`, `s`, `n`, `ri` = 1-based index of the result among the rated subsets,
  null when the result is not a rated subset, `cert`)), `flow.mjs` (`--board <cols>x<rows> --level <id> --seed <text>
  --quantity <n> [--uniqueness require] --label <name>`: the serial set request and one batch, with `set-attempt`
  (`j`, `ok`, `reason`, `ms`), `set` (`K`, `calibrationScore`, `setMs`) and `end` (`status`, `accepted`, `scores`,
  `setMs`, `foldMs`, `totalMs`) events) and `simulate.mjs`.

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
  repair over the `require`-mode calls with a result; set attempts ok and failed; accepted puzzles (`end.accepted`);
  attempts per accepted puzzle (all attempts of the file, raw and repair, divided by the accepted puzzles; `-` when
  none); the share of `capped` among all attempts; the median and largest `work` and `ms` of the capped attempts and
  the median and largest `ms` of the rated ones; call time (`ms` of the `call` line) median and maximum; `setMs`,
  `foldMs` and `totalMs` of the `end` event (an `end` with status `set-failed` has only `setMs`: accepted 0, `foldMs`
  `-`, `totalMs` = `setMs`; a file without an `end` event shows "stopped at the limit"). Then a TOTAL row per
  population folder. Every column states its denominator in the header.
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
`node --import ./$s/observe.mjs ./$d/flow.mjs <arguments>` into `$s/<population>/<name>.jsonl` with the `Capture`
function of the test plan (MP09d2's, with its folder `$s`; it refuses to overwrite, stops the process at its limit
and writes a row to `$s/runs.md`), one serial process per capture. The folder names are the populations: `require`
(R), `any` (A), `hell` (H), `stall` (S).

| Population | Captures | Arguments | Limit (s) |
|---|---|---|---|
| R (`require`; repaired candidates, RES-25) | `r-6x10-<level>` for `easy`, `normal`, `hard`, `expert`, `master`; `r-18x20-<level>` for `hard`, `expert`, `master` (the cells of MP06b's corpus B) | `--board <board> --level <level> --seed probe-require/<board>-<level>/0 --uniqueness require --quantity 10 --label <name>` | 600 |
| A (`any`; AR1 refusals and unrateable profiles) | `a-<board>-<level>` for the boards `6x10`, `10x10`, `12x12`, `18x20` and the levels `hard`, `expert`, `master` | `--board <board> --level <level> --seed search/<board>-<level>/0 --quantity 5 --label <name>` | 600 |
| H (Hell cells of D21) | `h-22x22-hell-3` (`--quantity 10`); `h-32x15-hell-3`, `h-24x24-hell-3`, `h-15x20-hell-2`, `h-18x18-hell-2` (`--quantity 5`) | `--board <board> --level <level> --seed t18-big-a --quantity <n> --label <name>` | 300 |

Blocks: R and A together (expected 20–40 minutes), then H (expected up to 25 minutes: these requests usually fail at
their limit). A capture stopped at its limit is labelled reduced in `runs.md` and keeps its lines.

### The stall re-examination (only when MP09d2's record says "inert on the v3 corpus")

Population S: the one-sided cells of MP12b1's list 2 on rectangular boards (skip `15x15b10`), at most 8, those with
the most accepted puzzles first. Each runs `node --import ./<MP09d2 folder>/nostall.mjs ./$d/flow.mjs --board
<cols>x<rows> --level <level> --seed search-stall/<case id>/0 --quantity 5 --label s-<case id>` into
`$s/stall/s-<case id>.jsonl` (600 s), then `node ./$d/simulate.mjs <the S files> --ns 8,12,16 --list` into
`$s/stall-simulate.md`. The decision table of MP09d2 applies unchanged: N = 12 stops no call early, or misses no
central result: keep 12 (record "inert on the landscape" in the first case); N = 12 misses and N = 16 does not: raise
to 16 only through an ordered change round (MP09d2's listed re-pins, then GF-P2 and GA-P2, before the lock); N = 16
misses: report, a new answer of the plan author is needed. When list 2 is empty, record that the rule has no cell to
act on in the landscape. When MP09d2's record was not inert, skip S and record why.

### The owner's question: cells v3 cannot make (D36, P-OD5)

For every (board area, level) of MP12b1's list 1, and every Hell cell of population H that made no puzzle: a table
with board, area, level, requests, the failure reasons, the profiles per failed calibration and their outcomes (from
H, and from MP09d2's availability probe where the cell was measured), and the time a request ran before it failed
(serial: `setMs` per set attempt; two-worker flow: MP09d2's recipe measurement). Each row says "no puzzle observed in
N requests" with its N, and "reduced (D37, P-OD6)" where MP12b1 kept 3 requests, with the boundary case of its level;
the record never calls a cell impossible (cross-review TP08).

**The evidence the question rests on (D37, owner decision P-OD6).** The record states it above the table, per Hell
level: the boundary case (board, active cells and the result of its 20 requests); the cases whose prescreen made a
puzzle (20 requests each, with their hit rates); the cases kept at the 3-request prescreen ("reduced (D37, P-OD6)",
read with the boundary case); population H; and MP09d2's measurements of the smallest offered areas, which the
landscape does not contain (`docs/difficulty-v3/d21-v3-2026-11-12.md` §4 and §6): Hell 1 was made on the 164-cell
board (13 x 13 with 5 blocked: 2 of 3 attempts, calibration scores 93 and 103) and on no board of 300 cells or more
(every profile capped); Hell 2 was not made on the 266-cell board (19 x 14: 26 rated profiles, all above the band,
and 102 capped) or on 300, 324, 400 and 484 cells; Hell 3 on none of 450, 480, 484 and 576 cells (all capped). Each
row names its source (a landscape case with its N, an H capture or an MP09d2 capture) and its failure mode: every
profile unrateable (capped), or rated profiles only above the band. For option (i) the record gives, per level, the
largest area with an observed puzzle and the smallest area without one, each with its N and source: (i) moves the
level's `areas` interval (`core/engine/levels.js`, `AREAS`: Hell 1 from 164, Hell 2 from 266 and Hell 3 from 450
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

From H, from MP09d2's records and from R and A (the check against false stops):

1. Numbers: per Hell cell, the time per unrateable rating (the `ms` of the `capped` attempts: median, largest; TP07),
   the profiles a failed calibration spends (expected 20: MP09c's S5b), the set attempts a request makes before the
   limit, and the time to failure serial and in the two-worker flow (about 115 s, `TIME.dispatchStopMs`).
2. Mechanisms, each with its predicted time to failure from these numbers: **F1** a set request ends after the first
   set attempt whose calibration had no rated profile and every profile unrateable; **F2** a selection call ends
   after its first four profiles (the first phase) are all unrateable; **F1 + F2**.
3. The false-stop check, a scratch script under `tests/artifacts/MP12b2/` over every capture of R, A and H (the
   `attempts` lines, each paired with the `call` line before it; tags `<label>/set/<j>` for set attempt j and
   `<label>/slot/<slot>/<attempt>` for the batch; `set-attempt` events): **F1** fires in a file at the first tag
   `<label>/set/<j>` whose raw attempts (`ph: 'raw'`) are not empty and all `capped`; it is a false stop when a later
   `set-attempt` event of the same file has `ok: true`. **F2** fires on a call whose first four raw attempts are all
   `capped` (these are its first four profiles); it is a false stop when that call's `result.ok` is true. Report per
   mechanism the firings, the false stops and the evidence size (files, set attempts, calls). A mechanism is
   proposable only with zero false stops in this evidence.
4. The notice it would show, in English and Vietnamese, for example "No <level> puzzle can be made for this board: its
   difficulty cannot be measured within the limits." / "Không thể tạo đề mức <level> cho bàn này: không đo được độ
   khó trong giới hạn cho phép."

The owner decides; implementing it is a later task (it changes generation, so after the lock it needs a new
algorithm id).

### The record `docs/difficulty-v3/calibration-<date>.md`

English, CRLF:

1. Header: date, code revision, Node version, CPU count, the final knobs and caps (as literals), `STALL_LIMIT`, the
   commands, total machine time (MP12a, MP12b1, MP12b2).
2. Coverage (MP12b1's coverage table, by reference with its totals; the Hell run plan of P-OD6: the boundary case of
   each level and the reduced Hell cases named).
3. Per board and level (from MP12b1's aggregate): hit rate, yield, T10 median and p95, peak memory, the v3 score
   distribution (median, p95), the G, `info`, Cmax, `deductionTier` and `solutions` distributions, the census-estimate
   share, `provedZero` (must be 0), unrateable samples, partial and incomplete outcomes.
4. The criteria of RES-25 on the GV2 boards (MP12a's final round, by reference with the numbers) and, for the other
   boards, the level ordering and the Hard and Expert hit rates as reported facts (never compared with an invented
   baseline).
5. P-OD1 (census estimates per cell over the whole landscape against the 5 % rule; MP12b1's list 3), P-OD2 (capped
   paths of accepted puzzles: none, or the cells; the unrateable profiles of the search evidence), P-OD3 (MP12a's
   outcome).
6. Search evidence (GS-P3, cross-review SP16): the summary tables of R, A and H with their denominators; repaired
   candidates (RES-25; TP07): the repair attempts, the successful repairs and the results from a repair of R, each
   with its denominator, and the finish outcomes; the time per rated and per capped rating; the self-test result.
7. Hell report (D21): per Hell cell, the ratings per accepted puzzle and the generation time (set, fold, total), or
   the failure with its profiles and time; the `STALL_LIMIT` in force. The ratings per puzzle come from MP12b1's
   20-request reports of the Hell cases with a puzzle (expected: Hell 1 on the smallest boards only, P-OD6); the
   failures from population H, MP12b1's reports and MP09d2's record §6.
8. The stall stop: MP09d2's D21-V3 decision and, when it was inert, the re-examination S (captures, the TOTAL rows for
   N = 8, 12 and 16, the decision).
9. Levels v3 cannot make (D36): the evidence statement (P-OD6), the table, the options with their consequences, the
   plan author's recommendation and the owner's answer when it is given.
10. The fail-fast proposal.
11. The final values and every change since MP08 (from MP12a's record), with the reasons.
12. The lock statement (below).
13. Findings for the owner (cells with poor availability, orderings that fail outside the GV2 boards, census
    estimates above 5 %, long times, a fail-fast or stall finding), or "none".

### Findings and an ordered change round

A finding is reported in the reply before the lock; the orchestrator decides. If it orders a change round: the change
(within the ranges of RES-18 and SA2-Q-P09 branch A, as MP12a's "Choosing a change", or the `STALL_LIMIT` raise of the
re-examination), the knob-dependent re-pins, the between-round checks of MP12a's "Test order around a knob change"
(fixture-independent files and the slow test only: before GF-P2 the fixture-dependent files and the quick set fail by
design and gate nothing; cross-review TP06), the affected cells and the 18 slice cases again under
`landscape-v3-full/change-1/`, then GF-P2 (`node tools\record-fixtures.mjs --replace --reason "P3: v3 calibration
(final)"`, `--check`), the strict post-GF-P2 checks and GA-P2, exactly as MP12a's "GF-P2 and GA-P2" block (its first
`npm test` kept in `tests/artifacts/MP12b2/ga-p2-first.txt`); all of it recorded. Without an order, nothing changes.

### The lock (RES-01, RES-25)

- Evidence: `node tools\record-fixtures.mjs --check` passes and `npm test` passes (GA-P2, final) on the locked tree;
  `git --no-pager diff --stat` shows no change under `core/` or `tools/` in this task (unless a change round ran).
- Statement, in the record and in design §7.8: "The `difficulty-v3` rating (`SCORE_V3`, `DEDUCE`), the clue search
  (`gen-v3`, `STALL_LIMIT`), `K60`, `SHARES` and `POLICY_ID` are locked at <revision>. Any later change of a weight, a
  cap, a band, a rule of the deduction ladder, the census, a counter, the clue search, `SHARES` or `K60` needs a new
  model, algorithm or policy id and a new qualification."

## Files to create/modify

| File | Change |
|---|---|
| `docs/difficulty-v3/search-<date>/` (new) | `observe.mjs`, `summary.mjs`, the captures under `require/`, `any/`, `hell/` and (when run) `stall/`, `runs.md`, `summary.md`, `stall-simulate.md` |
| `docs/difficulty-v3/calibration-<date>.md` (new) | the record |
| `docs/design-detail.md` | §7.8; §7.5 (the Hell sentence) |
| `docs/design-brief.md` | only by the rule below |
| knob values, `STALL_LIMIT`, re-pins, fixtures | only in an ordered change round |

Exclusive ownership while active: the files above; scratch under `tests/artifacts/MP12b2/`. Documentation slot:
design §7.8 (below); design §7.5, the sentence MP09d2 added about the Hell levels, updated with the measured result
(which levels and boards v3 could not make) and, once given, the owner's answer; `docs/design-brief.md` "Levels and
typical boards", one sentence, only when the owner keeps levels v3 cannot make on offer ((ii) not yet implemented, or
(iii)): "Hell levels are listed for the boards in the table, but the current rating cannot measure them on the boards
named in the design notes, so a request for one ends without a puzzle." (cross-review SP07). Must not edit: algorithm
code (outside a change round), MP12a's and MP12b1's records and folders, MP09d2's folder,
`player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`.

### `docs/design-detail.md` §7.8 (after MP09d2's edits)

Replace the provisional sentence on the v3 knobs with the measured parameters: the final `SCORE_V3` and `DEDUCE`
values, `K60` and `SHARES` (unchanged or changed, with the reason), `STALL_LIMIT`, the hit rates and availability in two
or three sentences with a link to `docs/difficulty-v3/calibration-<date>.md`, the census-estimate share, and the lock
statement. §7.9 and §7.10 keep pointing to `policy.js` for the values (no copy of numbers that could drift).

## Implementation steps

1. Read the inputs; create `observe.mjs` exactly and write `summary.mjs`; run the self-test (it is quick and needs no
   slot).
2. Announce and run block R + A; then block H; summarise.
3. The stall re-examination when needed (announced; its own block).
4. The owner's question and the fail-fast proposal; the record (§9 waits for the answer); report findings and the
   question, and wait for the orchestrator's decision.
5. Without option (i) and without a change round: `record-fixtures --check`, the final `npm test` (announced),
   design §7.8 and §7.5 (and the brief by its rule), the lock statement; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP12b2-B01 | The calibration record shows how the search reached its puzzles: rated, refused (AR1), unrateable and repair ratings, successful repairs, per selection and per accepted puzzle, for `require` and `any` cells | record §6; the summary |
| MP12b2-B02 | The Hell cells are reported with ratings per puzzle and generation time under v3, or their failure with numbers (D21) | record §7 |
| MP12b2-B03 | The owner gets, for every cell v3 cannot make, the facts with the evidence each rests on (P-OD6: its requests, the boundary case of its level, MP09d2's measurements) and the three options with the plan author's recommendation, and a measured fail-fast proposal that stops no request that would succeed (D36) | record §9, §10; the reply |
| MP12b2-B04 | The stall stop is re-examined on the landscape when MP09d2 found it inert; it stays 12 or is raised to 16 only by the rule | record §8 |
| MP12b2-B05 | The v3 rating and generation are locked, and the design document says what the lock means | record §12; design §7.8 |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP12b2-T01 | `observe.mjs` exactly as given (repairs observed through the `finish` bracket, each attempt timed; TP07); `summary.mjs` to its contract; the self-test passes with the four cases of the table (`repair-ri-0` among them) and the summary row of its own file | command output |
| MP12b2-T02 | Every capture of R, A, H (and S when run) is in `runs.md` with its outcome, within its limit, never overwritten; the summary's denominators are stated | the folder |
| MP12b2-T03 | The stall decision follows MP09d2's table; a raise happens only in an ordered change round with GF-P2 and GA-P2 | record §8; diff |
| MP12b2-T04 | The fail-fast check evaluates each mechanism's stop condition on the `attempts` lines of every capture and counts false stops | record §10; scratch script |
| MP12b2-T05 | `record-fixtures --check` and the final `npm test` pass on the locked tree; no `core/` or `tools/` change in this task without an ordered change round | command output; diff |
| MP12b2-T06 | Design §7.8 has the measured parameters and the lock statement, §7.5 the measured Hell result; the brief follows its rule; `npm run test:quick` and `npm run check` pass; records CRLF without BOM | review; command output |

## Test plan

### Exact commands

```powershell
$s = 'docs/difficulty-v3/search-<date>'
$d = 'docs/difficulty-v3/d21-2026-11-12'
$v = 'docs/difficulty-v3/d21-v3-<date>'   # MP09d2's folder (read only; its nostall.mjs for population S)
New-Item -ItemType Directory -Force "$s/require", "$s/any", "$s/hell", "$s/stall", 'tests\artifacts\MP12b2' | Out-Null
$env:D21_OUT = 'tests/artifacts/MP12b2/selftest.jsonl'
if (Test-Path $env:D21_OUT) { Remove-Item $env:D21_OUT }
node --import "./$s/observe.mjs" "./$s/summary.mjs" --self-test
if ($LASTEXITCODE -ne 0) { throw 'self-test failed' }
Remove-Item Env:D21_OUT

# MP09d2's Capture function, with the folder $s
if (-not (Test-Path "$s/runs.md")) { "| Capture | Start | End | Seconds | Outcome |`r`n|---|---|---|---|---|" | Set-Content "$s/runs.md" }
function Capture([string]$out, [string]$preload, [string]$script, [string[]]$argList, [int]$seconds) {
  if (Test-Path $out) { throw "$out exists: a capture is never overwritten (delete it only to repeat this capture on purpose, and say so in the record)" }
  $env:D21_OUT = $out
  $nodeArgs = @()
  if ($preload -ne '') { $nodeArgs += @('--import', "./$preload") }
  $nodeArgs += @("./$script") + $argList
  $start = Get-Date
  $p = Start-Process node -ArgumentList $nodeArgs -NoNewWindow -PassThru
  $null = $p.Handle
  if ($p.WaitForExit($seconds * 1000)) { $outcome = "exit $($p.ExitCode)" } else { Stop-Process -Id $p.Id; $p.WaitForExit(); $outcome = "stopped at the $seconds s limit (reduced)" }
  $end = Get-Date
  "| $out | $($start.ToString('HH:mm:ss')) | $($end.ToString('HH:mm:ss')) | $([int]($end - $start).TotalSeconds) | $outcome |" | Add-Content "$s/runs.md"
  Remove-Item Env:D21_OUT
}

# announced block R + A (one line per capture of the table, in its order), for example:
Capture "$s/require/r-6x10-hard.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board','6x10','--level','hard','--seed','probe-require/6x10-hard/0','--uniqueness','require','--quantity','10','--label','r-6x10-hard') 600
Capture "$s/any/a-12x12-master.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board','12x12','--level','master','--seed','search/12x12-master/0','--quantity','5','--label','a-12x12-master') 600
# announced block H, for example:
Capture "$s/hell/h-22x22-hell-3.jsonl" "$s/observe.mjs" "$d/flow.mjs" @('--board','22x22','--level','hell-3','--seed','t18-big-a','--quantity','10','--label','h-22x22-hell-3') 300
$files = @('require', 'any', 'hell') | ForEach-Object { $p = $_; Get-ChildItem "$s/$p/*.jsonl" | Sort-Object Name | ForEach-Object { "$s/$p/$($_.Name)" } }
node "./$s/summary.mjs" @files | Set-Content "$s/summary.md"
if ($LASTEXITCODE -ne 0) { throw 'summary failed' }

# only when MP09d2's record says "inert on the v3 corpus": announced block S, one line per chosen cell, for example:
Capture "$s/stall/s-20x20-expert.jsonl" "$v/nostall.mjs" "$d/flow.mjs" @('--board','20x20','--level','expert','--seed','search-stall/20x20-expert/0','--quantity','5','--label','s-20x20-expert') 600
$stall = @(Get-ChildItem "$s/stall/*.jsonl" | Sort-Object Name | ForEach-Object { "$s/stall/$($_.Name)" })
node "./$d/simulate.mjs" @stall --ns 8,12,16 --list | Set-Content "$s/stall-simulate.md"
if ($LASTEXITCODE -ne 0) { throw 'simulate.mjs failed' }

# the lock (announced: the final npm test)
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

Boards are columns x rows, as in the landscape and `flow.mjs` (`6x10` is the GV2 board of 6 columns and 10 rows;
`20x20-expert` above is only an example of a list-2 cell).

`runs.md`, `summary.md` and `stall-simulate.md` are written by PowerShell: check them with the one-liner of check-list
§3 (CRLF, no BOM) and fix them before the reply. If `npm test` approaches 10 minutes, stop it and report.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the self-test result, the summary tables, the Hell report, the
  stall decision, the owner's question with its table, the fail-fast proposal, the findings, and (after the lock) the
  lock revision.
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

# IGP-00 — Harness foundation: copies, variants, bounded runners, lanes, records, identity

| Header | Value |
|---|---|
| ID | IGP-00 |
| Depends on | none (the pack committed, check-list §2 step 0) |
| Estimated size | Large: about 1,300 new lines in `tools/ig-proto/` (tree builder 250, variants and `ig-log.js` 300, engine/sets/calls 200, lanes with supervisor 200, records/firewall/boards/budget 200, arm driver 250, runner 150, identity 100, self-test 250); about 3 to 4 hours of developer work; machine time about 9 minutes (six locked commands) |
| Owner role | Measurement prototype (harness) |
| Confirms or refutes | R00: the harness reproduces MP12b1 (same seed, same set and puzzles), and its instrumentation and logging change nothing |
| Design refs | check-list §3 (fingerprint check, no git, tree identity, determinism, records), §4 D-IG1 to D-IG3, D-IG11 to D-IG13, §7 (lock protocol, exit protocol, bounds, budget); plan §5; `clarifications.md` "Direction after the joint report" and the owner decisions of 2026-11-14 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

Every later task measures puzzle generation through patched copies of the source, never through production code
(owner: "only prototype code that checks puzzle generation"). This task builds that machinery once and proves it is
faithful and safe: a copy without engine edits has the worktree's source digest; the same seed gives MP12b1's set and
puzzles as far as the records can establish it; the instrumented and logging copies change nothing; every locked
command ends within its horizon; no git command runs; nothing started is silently rerun; and the budget guard stops
before the round's allocation is passed.

## Scope

### In scope

- The tree builder and the variants `base`, `instr` and `log`, with the "meta" edits every tree gets, and the copy-only
  logger `ig-log.js` with durable per-probe journaling.
- The engine loader, the carve-only set constructor, the call and rating helpers, the lanes with their supervisor.
- `firewall.mjs`, `boards.mjs` with the frozen catalogue `data/boards-v1.json`, the records helper, the budget helper.
- The arm driver (`arm.mjs run|publish|status`), the run-plan runner (`run-task.ps1`), the identity check, the
  self-test, `tools/ig-proto/README.md`.

### Out of scope

- The prototype search and the variants `p1p5-*`, `p6`, `w8` (IGP-01, IGP-03, IGP-04); `compare.mjs`, `verify.mjs`
  (IGP-01); PM4, PM1 and PM2 scripts (IGP-02, IGP-05, IGP-06).
- Any edit outside `tools/ig-proto/` and the evidence folder; any git command.

## Repository rules

- Read `AGENTS.md`, the check-list §3 (conventions) and §7 (lock, exit and budget protocol) first.
- Every command that may run longer than 10 s goes through the runner (`run-task.ps1`), which calls `Invoke-IgNode`.
  Never use the difficulty-v3 wrappers; never run generation or ratings outside the wrapper.
- No production file is edited, not even for a moment: copies only. No git command at all.

## Inputs & context

- `tools/calibrate.mjs`: `run(argv, overrides)` (line 454); `--matrix <file>`, `--workers`, `--fresh-process`,
  `--no-cancel-probe`, `--child-limit-s`, `--output <base>`; exit 0 when every requested row is recorded (a child that
  crashed or hit its limit still yields a recorded row), 2 when stopped or incomplete, 1 on invalid input.
  `childMain` (line 371) runs one row in a fresh process; `readSource` (lines 241-252) runs `git rev-parse` and `git
  status`, which every tree removes from its copy.
- `tools/bench/runner.js`: `BenchCase.seeds` (line 42), `seedFor` (line 94), `checkMatrix`/`validateMatrix` (lines
  110, 217), `details.resultDigest` over the accepted layout keys, clue keys and scores (lines 726-730),
  `details.puzzles[]` in acceptance order (lines 715-725).
- `tools/bench/calibration-reference.js`: `buildLandscapeMatrix` (line 214), whose case ids are MP12b1's.
- `core/engine/generate.js`: `setAttempt` (line 86; `const cal = selectClues({` at line 114); `MACRO_MIN_MEAN = 6.5`
  (line 60); streams `set/<attempt>` with the derived `macro`, `flat` and `cal` streams (`derive` ignores the parent's
  consumption, `core/engine/rng.js:23`).
- `core/engine/clues.js`: `selectClues` (line 207) and its `SelectContext.rate` seam (lines 39-40); phase 2 at the
  comment of line 466; the beam at line 521.
- `core/engine/deduce.js`: `measureDeduction` (line 280), `let first = null;` (line 335), `ruleR7`'s two early `return
  NONE` on `work > workLimit` (lines 1102-1104 and 1128-1130), `first = snapshot();` (line 1598), `function result() {`
  (line 1814).
- `core/engine/policy.js`: `pieceCountPlan` returns null when the level is not offered on the area (line 327).
- `core/engine/difficulty.js`: `measureV3(board, pieces, clues, ws, limits)` (line 214), `rate` (line 325),
  `IncompleteRatingError` with `counters { nodes, work, stop }` (lines 65-77).
- MP12b1's reports: `docs/difficulty-v3/landscape-v3-full/<case>-2026-11-1[34].json` and
  `docs/difficulty-v3/landscape-v3/r2/`, `meta.sourceDigest`
  `34cea38645e079478ff3463c67c72d2701a0fe84983fc3bda5dd5d3b33377918`.

## Design

### 1. Layout of `tools/ig-proto/`

```text
tools/ig-proto/
  README.md                 purpose, fingerprint and no-git rules, layout, commands, record formats
  run-task.ps1              run-plan runner (lock wrapper, exit protocol, budget guard, accounting)
  arm.mjs                   request-level arms: one-row calibrate runs of a tree, with admission and journal
  identity.mjs              identity of arms against MP12b1 (set and accepted prefix)
  firewall.mjs              snapshot and check of the production files
  boards.mjs                writes or checks data/boards-v1.json
  self-test.mjs             self-tests (run under the lock)
  data/boards-v1.json       frozen board catalogue (every landscape case of this source)
  lib/paths.mjs             roots, labels, constants
  lib/records.mjs           CRLF writers, meta block, banner, hashing
  lib/budget.mjs            invocation totals and budget decisions (shared with run-task.ps1's checks)
  lib/tree.mjs              tree builder (API and CLI)
  lib/engine.mjs            loads a tree's modules
  lib/sets.mjs              case boards, carve-only sets
  lib/calls.mjs             recorded calls, screened and canonical ratings, window subsets
  lib/lanes.mjs             worker-thread lanes with admission and a supervisor
  lib/lane-worker.mjs       the lane worker
  variants/<id>.json        variant manifests
  variants/files/<name>/... copy-only files mirrored into a tree
  plans/IGP-NN.json         run plans
```

### 2. Tree builder (`lib/tree.mjs`)

A tree is `tests/artifacts/ig-proto/tree/<variant>/`: a copy of `core/`, `tools/` without `tools/ig-proto/`, and
`package.json`, then the "meta" edits, the variant's edits and its files.

- **Manifest** `variants/<id>.json`: `{ "id", "extends": [ids], "description", "edits": [ { "id", "file", "find",
  "replace" } or { "id", "file", "append" } ], "files": [names], "params": {}, "paramFiles": {} }` (`paramFiles` is
  IGP-01's). `extends` resolves depth first, each ancestor once, in order; edits apply in chain order; `params` merge
  shallowly along the chain (later keys win) and gain `variant: <id>`.
- **Edits.** File text is normalised to LF before matching. A `find` anchor must occur exactly once in the current text;
  an `append` adds its text once at the end. A missing or repeated anchor throws `edit <edit id> (<variant>): anchor
  found <n> times in <file>; re-derive this edit for the current source` and leaves no tree behind. Files are written
  with LF (the source digest ignores line endings, `tests/benchmark-report.test.js:289`).
- **Meta edits, in every tree including `base`** (they touch no `SOURCE_FILES` entry):

  | Edit | File | Find (exact) | Replace |
  |---|---|---|---|
  | meta-1 | `tools/calibrate.mjs` | the three lines of `readSource` from `    commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();\n` through `    commit += dirty === '' ? '' : '+uncommitted-changes';\n` | `    commit = process.env.IG_SOURCE_LABEL \|\| 'ig-proto';\n` |

- **Meta edit in every tree except `base`:** `meta-2` appends the tree's added `core/engine/` files (at least
  `core/engine/ig-params.js`) to the copy's `SOURCE_FILES` in `tools/bench/report.js` (anchor: `  'tools/bench/responsiveness.js',
  'tools/bench/calibration-reference.js',\n]);\n`, the last line of the list), so that the copy's own source digest
  covers them.
- **Files.** Every file under `variants/files/<name>/` is copied to the same relative path in the tree; it must not
  overwrite a copied source file.
- **Params.** Every variant except `base` gets `core/engine/ig-params.js`:

  ```js
  // @ts-check
  // Generated by tools/ig-proto/lib/tree.mjs for the variant "<id>"; do not edit.
  export const IG = Object.freeze(<the merged params as JSON>);
  ```

- **Identity.** `ig-tree.json` in the tree root: `{ format: 'ig-proto-tree', version: 1, variant, chain, treeId,
  worktree: { sourceLabel, sourceDigest, versions }, copyDigest, edits: [{ id, file, before, after }], files: { path:
  sha256 }, params, builtAt }`. `treeId` is the SHA-256 over the LF-normalised content of every copied source file, the
  resolved manifests, the copy-only files and the parameter files; `copyDigest` is the copy's `computeSourceDigest`
  (from its own `tools/bench/report.js`, reading files under the tree root); `before`/`after` are the SHA-256 of each
  edited file.
- **Reuse.** `ensureTree(id)` reuses a tree whose `ig-tree.json` has the current `treeId`; otherwise it deletes the
  folder and builds it again. The arm driver and the lanes refuse to work on a tree whose `treeId` differs from the one
  their shard or checkpoint recorded (§6, §7).
- **CLI.** `node tools\ig-proto\lib\tree.mjs build <id>...` prints `<id> <treeId> <copyDigest> built|reused`;
  `check-edits --all|<id>...` applies the edits in memory to the worktree's texts and prints every edit that does not
  match (exit 1 when any); `list` prints each variant and its chain. All accept and ignore `--label` and
  `--source-label`.

### 3. The variants of this task

- **`base`**: the meta edit only. Required: `copyDigest` equals the worktree's source digest.
- **`instr`** (instrumentation, test-side puzzle keys and diagnostic offers; no rating changes):

  | Edit | File | Find (exact) | Replace or append |
  |---|---|---|---|
  | instr-1 | `core/engine/deduce.js` | `  let first = null;\n` | the anchor followed by `  let igWorkFirst = -1;\n  let igNodesFirst = -1;\n  let igR7Cut = 0;\n  let igR7CutCensus = 0;\n` |
  | instr-2 | `core/engine/deduce.js` | `        first = snapshot();\n` | the anchor followed by `        igWorkFirst = work;\n        igNodesFirst = nodes;\n` |
  | instr-3 | `core/engine/deduce.js` | `      if (work > workLimit) {\n        return NONE;\n      }\n      if (!reachable(n, -1, compSize[i], compImb[i])) {\n` | the same with `        if (inCensus) {\n          igR7CutCensus += 1;\n        } else {\n          igR7Cut += 1;\n        }\n` before `        return NONE;\n` |
  | instr-4 | `core/engine/deduce.js` | `          if (work > workLimit) {\n            return NONE;\n          }\n          const imbalance = option === OPT_PLUS ? pieceK[p] : -pieceK[p];\n` | the same with `            if (inCensus) {\n              igR7CutCensus += 1;\n            } else {\n              igR7Cut += 1;\n            }\n` before `            return NONE;\n` |
  | instr-5 | `core/engine/deduce.js` | `  function result() {\n` | the anchor followed by `    igLast = { workFirst: igWorkFirst, nodesFirst: igNodesFirst, r7Cut: igR7Cut, r7CutCensus: igR7CutCensus };\n` |
  | instr-6 | `core/engine/deduce.js` | append | `\n/** @type {?{ workFirst: number, nodesFirst: number, r7Cut: number, r7CutCensus: number }} Instrumentation of the last measurement (ig-proto). */\nlet igLast = null;\n\n/** Returns and clears the instrumentation of the last measurement (null when there was none). */\nexport function igTake() {\n  const value = igLast;\n  igLast = null;\n  return value;\n}\n` |
  | instr-7 | `tools/bench/runner.js` | `      resultDigest: sha256Hex(canonicalJson({\n` | `      igSetKey: sha256Hex(canonicalJson(set.pieces.map((p) => p.cells))),\n      igPuzzleKeys: kept.map((v) => sha256Hex(canonicalJson({ layoutKey: v.layoutKey, clueKey: v.clueKey }))),\n` followed by the anchor |
  | diag-1 | `core/engine/policy.js` | `  if (area < lv.areas[0] \|\| area > lv.areas[1]) return null;\n` | `  if (IG.diagnosticOffers !== true && (area < lv.areas[0] \|\| area > lv.areas[1])) return null;\n` |
  | diag-2 | `core/engine/policy.js` | append | `\nimport { IG } from './ig-params.js';\n` |

  Params: `{ "variant": "instr", "diagnosticOffers": true }`. Every reader of the instrumentation calls `igTake()` right
  after a rating attempt in the same thread, so a stale value can never be read (a measurement that stops before
  `result()`, or a clue set with no free piece, yields null). `workFirst` and `nodesFirst` are -1 when the run never
  reached a first solution (a capped run); null means no instrumentation (the `base` tree, or no measurement). `r7Cut`
  counts R7's early NONE answers caused by the work limit in the **main search** (with the canonical limit, 0 unless
  the run was capped); `r7CutCensus` counts those of the census, whose budget is relative (`deduce.js:1746-1747`,
  `inCensus`), so they are normal whenever the census stops early (IGP-00's `log` arm shows them on 37 of its 128
  ratings with an estimated census). PM4's R7 coverage uses `r7Cut` only (amendment after the IGP-00 review: the first
  version counted both in one field). Diagnostic offers change nothing on an offered cell (D-IG13). `instr-7` is a
  test-side metadata seam: it adds to every run record's `details` the set key and one key per accepted puzzle in
  acceptance order (both computed from values the runner already holds; extra `details` fields pass
  `validateRunRecord`, `tools/bench/report.js:166-213`), so that two keyed arms can be compared puzzle by puzzle
  (check-list §3 "Determinism"). The `base` tree stays unedited and has no keys.
- **`log`** (extends `instr`; today's search with durable per-probe logs):

  | Edit | File | Find (exact) | Replace or append |
  |---|---|---|---|
  | log-1 | `core/engine/clues.js` | `export function selectClues(ctx) {\n` | `export function selectCluesV3(ctx) {\n` |
  | log-2 | `core/engine/clues.js` | `  // Phase 2: when every phase-1 sample was skipped, seed the beam afresh.\n` | `  if (rated.length === 0) {\n    igPhase('p2');\n  }\n` followed by the anchor (the loop below runs only then) |
  | log-3 | `core/engine/clues.js` | `  let beam = ranked(target, rated).slice(0, BEAM_WIDTH);\n` | `  igPhase('beam');\n` followed by the anchor |
  | log-4 | `core/engine/clues.js` | append | the dispatch block below |
  | log-5 | `core/engine/generate.js` | `  const cal = selectClues({\n    board,\n` | `  const cal = selectClues({\n    igStage: 'set',\n    igAttempt: attempt,\n    board,\n` |
  | log-6 | `core/engine/generate.js` | `    return { fail: 'layout' };\n  }\n  const sel = selectClues({\n` | the same with `    igStage: 'batch',\n` added after the last line |
  | log-7 | `core/engine/generate.js` | ``  const rng = createRng(ctx.batchSeed, `completion/${key}`);\n  const sel = selectClues({\n`` | the same with `    igStage: 'completion',\n` added after the last line |
  | log-8 | `tools/calibrate.mjs` | `  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));\n` | the anchor followed by the row check below |

  Row check (log-8): `arm.mjs` sets the original row identity before it calls calibrate (§7); the child inherits it,
  checks it against the row it was given, and journals it, so that a one-row run's local `rep` 0 never names the row:

  ```js
    if (process.env.IG_LOG_DIR !== undefined) {
      if (process.env.IG_ROW === undefined || process.env.IG_SEED !== input.spec.seed) {
        throw new Error(`ig-proto: row identity mismatch (IG_ROW ${process.env.IG_ROW}, IG_SEED ${process.env.IG_SEED}, seed ${input.spec.seed})`);
      }
      appendFileSync(`${process.env.IG_LOG_DIR}/${process.env.IG_ROW}.row.jsonl`, `${JSON.stringify({ t: 'row', row: process.env.IG_ROW, seed: input.spec.seed, caseId: input.spec.caseId, localRep: input.spec.rep, pid: process.pid })}\n`);
    }
  ```

  Dispatch block (log-4):

  ```js

  // ig-proto dispatch (variant log): the exported search is today's search, logged per probe.
  import { igDispatch, igPhase } from './ig-log.js';

  /**
   * @param {SelectContext} ctx
   * @returns {SelectResult}
   */
  export function selectClues(ctx) {
    return igDispatch(ctx, selectCluesV3);
  }
  ```

  Files: `log`. Params: `{ "variant": "log", "logAccepted": false, "p6": false }`.

### 4. The copy-only logger `ig-log.js`

Runs inside a tree only. It imports `node:fs`, `node:path`, `node:worker_threads` (`threadId`), `boardToRows` and
`activeCount` (`./board.js`), `rate`, `IncompleteRatingError` and `UnsatisfiableError` (`./difficulty.js`), `igTake`
(`./deduce.js`), `bandEdge` and `initialClueCount` (`./levels.js`), `IG` (`./ig-params.js`).

- **Journal.** Without `IG_LOG_DIR` nothing is written. With it, every event is one JSON line appended at once (open,
  append, close: it survives the termination of the worker or the process) to
  `${IG_LOG_DIR}/${IG_ROW}.${process.pid}.${threadId}.jsonl`; `at` is `performance.timeOrigin + performance.now()`.
  `IG_ROW` is the original row key `<case>~<rep>` that `arm.mjs` sets (never calibrate's local `rep`, which is 0 in a
  one-row run); the child's `row` line (log-8, file `<IG_ROW>.row.jsonl`) binds it to the seed and the process id.
  - `{ t: 'start', call, v: 1, variant, row, stage, attempt, level, min, max, K, A, startCount, priorCount, W, at }`
    (`call` = `<row>:<pid>:<threadId>:<sequence>`; `stage` from `ctx.igStage`, else `other`; `priorCount` and `W` are
    the prototype's, null here);
  - `{ t: 'phase', call, phase, at }` at every phase entry (`p1` at the start, `p2`, `beam`; the prototype adds its
    own), whether or not a rating follows;
  - `{ t: 'p', call, i, tuple }` after every completed rating attempt, with tuple `[phase, count, outcome, score,
    mainWork, censusWork, workFirst, nodesFirst, nodes, censusNodes, stop, r7Cut, ms, flags]`: `score` null without a
    rating; `mainWork = metrics.work - metrics.censusWork` for a rating, `error.counters.work` for a capped one;
    `censusWork` and `censusNodes` 0 without a census; `workFirst`, `nodesFirst`, `r7Cut` (main search only) from
    `igTake()` (null when it returns null; -1 for no first solution); `nodes = metrics.nodes` or `counters.nodes`;
    `stop = metrics.searchStop` or `counters.stop`; `ms` with three decimals; `flags`: `e` when the census is incomplete
    (an estimate), `r` when refused by AR1, `c` when `r7CutCensus > 0`;
  - `{ t: 'end', call, result, score, clueCount, ms, work, profiles, rerates, accepted, at }`: `result` is `ok`,
    `not-in-band`, `uniqueness-not-proved`, `no-window` or `error`; `work` sums mainWork and censusWork; `accepted` is
    `{ boardRows, pieces, clues, rating }` of an ok result when `IG.logAccepted`, else null.
  - A call with a `start` line and no `end` line is **unfinished** (its worker was terminated or its request ended):
    its completed probes count, and the time after its last line is reported as unknown unfinished work.
- **Outcomes.** `capped` (canonical `IncompleteRatingError`), `unsat` (`UnsatisfiableError`); for a rating: `ar1` when
  `ctx.target.min >= bandEdge(3)` and `metrics.Gproved === 0`; else `below` (score < min), `above` (score >= max),
  `central` (in band and `|score - centre| <= (max - min) / 4` for a finite band, every in-band score for an unbounded
  one), `in` (other in band). With a screen `W` (IGP-01): `scap0` (`IncompleteRatingError` under `W < DEDUCE.work`),
  `scap1` (a rating with main work above `W` and stop `work-cap`), `over` (a rating with main work above `W` and another
  stop).
- **API.** `igPhase(name)`; `startCall(ctx)`; `recordRating(call, phase, count, fn, W)` (runs `fn()`, journals the
  tuple, returns the rating or rethrows the error unchanged); `endCall(call, result)`; `igDispatch(ctx, v3)`:
  `startCall`, `igPhase('p1')`, `v3({ ...ctx, rate: (b, p, c, ws) => recordRating(call, <current phase>, c.length, ()
  => (ctx.rate ?? rate)(b, p, c, ws), null) })`, `endCall`; an exception is journaled with `result: 'error'` and
  rethrown. A dead-end entry of today's search is a `phase: 'p2'` line; its dead-end profiles are its `p2` tuples.
- **Overhead.** The self-test measures the cost of one journal append; IGP-01 reports appends × that cost beside the
  timings, and the `log` / `base` time ratio of the identity check.

### 5. Engine, boards, sets, calls and lanes

- `lib/engine.mjs` `loadEngine(treeRoot)`: dynamic imports (file URLs) of the tree's `core/engine/` modules `board`,
  `carve`, `clues`, `deduce`, `difficulty`, `generate`, `hash`, `keys`, `levels`, `policy`, `rng`, `tiling`,
  `workspace`, and of `tools/bench/calibration-reference.js` and `tools/bench/report.js`; returns them with `root`.
- `boards.mjs write` (unlocked, run once in this task) writes `data/boards-v1.json`: `{ version: 1, source: { label,
  sourceDigest }, cases: { '<case id>': { id, boardRows, rotation, levelId, maxActive, quantity, uniqueness, seedPrefix,
  area } } }`: for every case of the worktree's `buildLandscapeMatrix({ seeds: 1 })`
  (`tools/bench/calibration-reference.js:214-235`), all of its `BenchCase` fields except `repetitions`, plus the area.
  `boards.mjs check` lists the differences between the catalogue and the current source (informational on the frozen
  source). The catalogue is committed and never rewritten silently: `write` refuses an existing file unless `--replace`
  is given on the pack author's instruction.
- `lib/sets.mjs`:
  - `caseBoard(caseId)`: the catalogue entry; an unknown id throws.
  - `carveSet(engine, { boardRows, levelId, seedText, attempt })`: `setAttempt`'s carve without its calibration call, in
    the same order: board, area, `createRng(normalizeSeedText(seedText), 'set/<attempt>')`, `pieceCountRange` (the
    tree's, with diagnostic offers), `k = ks[rng.int(ks.length)]`, `carveMacro` when `area / k >= 6.5` (the constant of
    `generate.js:60`), else or on null `carveFlatSet`, `finalizeSet`, `validateSet`. Returns `{ ok: true, board, set,
    area, K, attempt, calRng: rng.derive('cal'), offeredInSource }` (`offeredInSource` from the **worktree's**
    `pieceCountRange`, imported read-only) or `{ ok: false, reason }`.
  - `firstCarvedSet(engine, { boardRows, levelId, seedText, maxAttempts = 8 })`: the first attempt from 0 whose carve
    succeeds.
- `lib/calls.mjs`:
  - `screenRating(engine, board, pieces, clues, ws, W)`: `measureV3(board, pieces, clues, ws, { deduce: { ...DEDUCE,
    work: W }, dlx: SCORE.caps })` and a rating built exactly as `rate()` builds it (`difficulty.js:325-334`). Required:
    with `W = DEDUCE.work` it deep-equals `rate()`.
  - `rateRecord(engine, { board, pieces, clues, ws, W, levelId, idx })`: one canonical (no `W`) or screened rating and
    its record: the tuple fields of §4 by name plus `r7CutCensus`, `level`, `side` and `ar1` (against the band of the
    optional `levelId`; without it the outcome is `rated`), `censored`, `solutions`, `rating` (for a rating) or
    `details` (`{ nodes, work, stop }` from the error's `counters`, for a capped one).
  - `recordedCall(engine, { set, levelId, rng, ws, onProfile })`: today's `selectClues` of the tree on the witness,
    `uniqueness 'any'`, no exclusion, with a `rate` seam that records every rating (`rateRecord` fields plus `idx`, the
    witness positions of the clues, found by piece id) and passes each record to `onProfile` as it completes. Returns
    `{ result: { ok, reason, clueCount, score }, profiles }`. It runs on `instr` (PM4, PM1) or `base` (PM2, whose
    records then have null instrumentation) only, and throws on a tree whose chain includes `log`: there its seam would
    consume `igTake()` before the journal does.
  - `windowSubsets(engine, { set, seedText, offsets, perCount, startCount })`: for each `g = startCount + offset` within
    1 to K - 2 and `s < perCount`: `createRng(normalizeSeedText(seedText), 'ig/window/<g>/<s>')`, shuffle the witness
    positions, keep the first `g`, sorted.
- `lib/lanes.mjs` and `lib/lane-worker.mjs`:
  - `createLanes({ variant, size = 4, horizonS, limits, testKinds })`: `size` worker threads on the tree of `variant`
    (`ensureTree`; `treeId` recorded), each with a main workspace (`createWorkspace(MAIN_WORKSPACE_BYTES)`); `horizonS`
    is the invocation's horizon H (check-list §7), measured from the process start. `limits` (overrides of the 30 s and
    120 s rules) and `testKinds` (synthetic job kinds) are for the self-test only and are never passed by a measuring
    script; `setHorizon(s)` may only lower the horizon (`min` with the current one).
  - Job kinds: `rate` `{ boardRows, pieces, clues, W?, levelId?, idx? }` → `rateRecord`; `call` `{ caseId, levelId,
    boardRows, seedText, maxAttempts, window?: { offsets, perCount } }` → `firstCarvedSet`, `recordedCall` with `calRng`
    (each profile posted to the host as it completes), then the window subsets rated canonically.
  - Admission, with e the elapsed time: a `rate` job starts only when e + 30 s ≤ H; a `call` job only when e + 120 s ≤
    H − 15 s. The supervisor (the host thread) cuts a `rate` job running longer than 30 s (a defect: the job and its
    inputs are recorded, the task stops) and a `call` job at H − 15 s: it terminates the lane, records the call
    `censored` with every profile received, and starts no further job on that lane in this invocation.
  - `runAll(jobs)` returns `{ results, done }` in job order (`undefined` for jobs not admitted). An exception inside a
    job becomes `{ outcome: 'error', message }`; the lane goes on.

### 6. Records, firewall and budget helpers

- `lib/paths.mjs`: `ROOT = fileURLToPath(new URL('../../../', import.meta.url))` (three parents of
  `tools/ig-proto/lib/`); the self-test checks that `ROOT` holds `package.json` and `tools/ig-proto/`. `LABELS =
  ['provisional', 'frozen']`; `artifactDir(label, task, ...parts)` under `tests/artifacts/ig-proto/<label>/<task>/`;
  `treeDir(variant)`; `evidenceDir(label, task)` under `docs/improve-generating/evidence/<label>/<task>/`;
  `MP12B1_DIGEST`; `mp12b1Report(caseId)` (the full folder, then `landscape-v3/r2`).
- `lib/records.mjs`: `writeJson`, `writeText`, `writeJsonl` (CRLF, final newline, no trailing whitespace; each refuses a
  text that contains the worktree's absolute root or a drive-letter path); `buildMeta({ task, label, kind, trees })`
  returns the check-list §3 `meta` (source label from `--source-label`, worktree digest by `computeSourceDigest`,
  versions by `currentVersions()` plus `APP_VERSION`, firewall hash, harness hash and file hashes, machine from
  `node:os`, invocation totals from `lib/budget.mjs`); `banner(meta)`; `sha256File`. No git.
- `firewall.mjs snapshot|check --task <T> --label <L>`: hashes every file under `core/`, `generator/`, `player/`,
  `tests/` without `tests/artifacts/`, `tools/` without `tools/ig-proto/`, and the root files (`index.html`,
  `redirect.js`, `package.json`, `.gitignore`, `.gitattributes`, `.editorconfig`); `snapshot` writes
  `tests/artifacts/ig-proto/<L>/<T>/firewall-before.json`; `check` compares and exits 1 on any added, removed or changed
  file, printing them.
- `lib/budget.mjs`: reads every `invocations.jsonl` of a label; returns the round's and a task's counted seconds;
  `decide({ task, allocationS, minHorizonS, approvals })` computes the allowance left A and the horizon H (check-list
  §7) and returns `{ decision: 'go', horizonS }` or `{ decision: 'stop', reason }` (used by `run-task.ps1` through
  `node tools\ig-proto\lib\budget.mjs decide ...`, a quick unlocked call). `projectS` never enters the decision.

### 7. Arm driver (`arm.mjs`)

```text
node tools\ig-proto\arm.mjs run --task <T> --arm <A> --shard <S> --variant <V> --workers <1-8>
     --cases <case>:<a>-<b>[,<case>:<a>-<b>...] --row-limit-s <R> --label <L> --source-label <SL> --horizon-s <H>
     [--max-rows <n>] [--dry-run]
node tools\ig-proto\arm.mjs publish --task <T> --arm <A> --label <L> --source-label <SL>
node tools\ig-proto\arm.mjs status --task <T> --arm <A> --shard <S> --label <L> [--check-rows]
```

`run`, in one process (one locked invocation; its clock starts when the process starts):

1. `ensureTree(V)`; the shard folder is `tests/artifacts/ig-proto/<L>/<T>/<A>/<S>/`. The first invocation writes
   `shard.json`: task, arm, shard, variant, workers, row limit, the cases with their catalogue entries, and per row its
   key `<case>~<rep>` (the original rep), its seed `landscape/<case>/<rep>`, and the one-row case of step 3; plus
   `treeId`, `copyDigest` and `harnessHash`. A later invocation with other flags (`--horizon-s`, `--max-rows` and
   `--dry-run` excepted: they limit one invocation), another `treeId` or another `harnessHash` exits 1 before measuring
   (`the shard's flags, tree or harness changed`).
2. The journal `rows.jsonl` holds `started` and `recorded` lines. A row that has `started` and no `recorded` line (a
   killed or crashed invocation) makes the driver exit 1 (`row <key> was started and not recorded: fix round needed`);
   it never reruns it.
3. For each row not yet started, in order: admission when e + R + 10 s ≤ H (e: elapsed time; and fewer than
   `--max-rows` rows ran in this invocation, a test option); otherwise stop. The row:
   - its one-row case is built explicitly from the catalogue entry: `{ id: <case id>, boardRows, rotation, levelId,
     maxActive, quantity: 10, uniqueness: 'any', seedPrefix: 'landscape', repetitions: 1, seeds: [<seed>] }` (the
     driver asserts that the entry's `id` is the case id and its `seedPrefix` is `landscape`); the matrix `{ version:
     1, profile: 'smoke', cases: [<that case>] }` is checked by the tree's `checkMatrix` (`tools/bench/runner.js:110`;
     it requires `id` and `seedPrefix` even with explicit seeds, lines 145-191) and written to
     `<shard>/rows/<case>~<rep>/matrix.json`; the object checked is the object written. `profile: 'smoke'` runs no
     landscape profile sampling: MP12b1's rows ran it after the timed interval (`runner.js:850-857`), so response
     times compare, but MP12b1's `peakProcessBytes` include the sampling;
   - append `started`; set `process.env.IG_LOG_DIR = <shard>/logs`, `IG_ROW = <case>~<rep>`, `IG_SEED = <seed>` and
     `IG_SOURCE_LABEL` (the calibrate child inherits them); import the tree's `tools/calibrate.mjs` and await
     `run(['--matrix', <file>, '--workers', W, '--fresh-process', '--no-cancel-probe', '--child-limit-s', R, '--output',
     <shard>/rows/<case>~<rep>/report])`;
   - check the row: the report holds exactly one run, its `seed` is the row's seed and its `caseId` the case id; in a
     `log`-chain tree, `<IG_ROW>.row.jsonl` exists and names the same seed. A failed check is recorded and exits 1;
   - append `recorded` with the row key, the original rep, the seed, the run's local `rep` (0), `responseMs`,
     `acceptedCount`, `partialReason`, `calibrateCode` and `censoredAtR` (its errors name the child limit). A row
     censored at R on a shard with R = 260 is a defect (the application's own action limits end a request earlier):
     exit 1 after recording it.
4. Write `state.json`: `{ task, arm, shard, label, done, recorded, expected, treeId, harnessHash, lastInvocation: {
   start, end, seconds, horizonS, progress: { rows } } }`; exit 0 (check-list §7 exit protocol). `--dry-run` writes the
   matrices of the rows, checks them, and exits before any run.

`publish` (unlocked) reads every shard of the arm whose `state.done` is true (else exit 1) and writes, through the
records writers: `docs/improve-generating/evidence/<L>/<T>/<A>/<S>.runs.json` (`{ meta, shard, rows: [{ rowKey,
caseId, rep, seed, localRep, run }] }` in row order: `rep` is the original rep, `localRep` the run record's own `rep`,
and every reader joins rows by `rowKey` or seed, never by `run.rep`), `<S>.runs.md` (a table per case: row key, seed,
T1, T10, response, accepted, partial reason, censored), and `<S>.calls.jsonl`: the journal lines of the shard's logs
sorted by row, file and line, without the `accepted` blocks (they stay in the artifacts for `verify.mjs`); above 5 MB,
the `row`, `start` and `end` lines only, as `<S>.calls-summary.jsonl`, with a note.

### 8. Runner (`run-task.ps1`)

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-NN.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1" `
  [-Only <step ids>] [-IncludeOptional] [-ApprovedRoundMinutes <n>] [-ApprovedTaskMinutes <n>] [-DryRun]
```

- `#Requires -Version 7`; `$ErrorActionPreference = 'Stop'`; `Set-Location (Join-Path $PSScriptRoot '..\..')`;
  dot-source `-LockHelper`.
- Plan schema: `{ "task": "IGP-NN", "allocationMinutes": n, "optionalMinutes": m, "steps": [ { "id", "locked",
  "repeatUntilDone", "optional", "projectS", "invocations", "minHorizonS", "node": [ ... ], "state": "<path under
  tests/artifacts/ig-proto/<label>/>" } ] }` (`optionalMinutes`, default 0, joins the allocation with
  `-IncludeOptional`). `projectS` is the forecast of the step's node seconds and `invocations` the expected number of
  locked invocations (default 1); both feed only `-DryRun`, which adds 45 s per expected invocation and passes the
  running forecast to `budget.mjs decide --forecast-s` (a real invocation always passes 0). The `projectS` values of the
  task files' plan tables are indicative; the developer may restate them under this definition. `minHorizonS` is the
  step's smallest unit of work: for an `arm.mjs run` step R + 20 s (110 s on the fast shards, 280 s on slow cells); for
  `self-test.mjs` 120 s; 60 s for steps that only rate (`verify.mjs`, PM4 `screens`, PM1 `windows` and `scan`); 150 s
  for steps that run calls (PM4 `calls`, PM1 `failed-sets`, PM2 `run`). The runner appends `--label <Label>
  --source-label <SourceLabel>` to every `node` list, and `--horizon-s <H>` to every locked one.
- Unlocked step: `node @args`; a non-zero exit stops the runner.
- Locked step: before each invocation, `lib/budget.mjs decide` with the task allocation, the step's `minHorizonS` and
  the approvals; `stop` ends the runner with exit code 4 and the printed reason. Otherwise `Invoke-IgNode -Repo
  pentomino -Task "<task> <step>" -NodeArgs (@('--max-old-space-size=2048') + $args + @('--horizon-s', H))`, then read
  the state file. Repeat while `repeatUntilDone` and `done` is false; an invocation that recorded no progress
  (`lastInvocation.progress` all zero) ends the runner with exit code 4. Any exception of the helper (a non-zero exit, a
  kill at 300 s) ends the runner: no retry.
- After each locked invocation append to `tests/artifacts/ig-proto/<Label>/<task>/invocations.jsonl`: `{ task, step,
  start, end, wallSeconds, nodeSeconds, lockWaitSeconds, countedSeconds, horizonS, killed, exit, done, budget }`. Node
  seconds: the state file's new `lastInvocation.seconds`; for a failed invocation without it, the seconds the helper
  printed for the node process (`IG <task> exit=<n> seconds=<s>`, captured from its information stream, for example
  with `-InformationVariable`), 300 when killed, 0 when node never started. Never the wall time: waiting for
  difficulty-v3 is never charged (amendment after the IGP-00 review). Lock wait = wall − node; counted = node +
  min(lock wait, 45).
- Print the round's and the task's counted totals after each step. `-DryRun` evaluates the budget decisions of the plan
  against the current log, adds the steps' `projectS` as a forecast, and prints both without running anything.

### 9. Identity (`identity.mjs`)

`node tools\ig-proto\identity.mjs --task IGP-00 --arms base,log --label <L>` reads the published rows of the arms and
MP12b1's reports of the same cases, joins them by seed, and writes
`docs/improve-generating/evidence/<L>/IGP-00/identity.json|md`:

- per seed and per pair of runs (MP12b1 and `base`, MP12b1 and `log`, `base` and `log`): the level reached under the
  check-list §3 rule and its evidence: **puzzle identity** (equal `details.resultDigest` at equal accepted counts,
  partial responses included; or, between two keyed arms, equal `igSetKey` and an equal common prefix of
  `igPuzzleKeys`), else **metric-prefix agreement** (set summary, then per puzzle in order `clues` (a count), `U`,
  `score`, `metrics.work`, `metrics.nodes`), with the accepted counts, the common prefix length and, on a
  disagreement, the first differing field. In this task no pair has keys on both sides (`base` and MP12b1 have none),
  so where the counts differ the record says "metric-prefix agreement; puzzle identity not established";
- per seed: `acceptedCount`, `firstReadyMs`, `tenthReadyMs`, `responseMs` of MP12b1 and of each arm;
- per arm: the tree's `treeId` and `copyDigest`; the time ratio arm / MP12b1 per seed and its median; `log` / `base`
  per seed and its median (the logging overhead);
- the `log` arm's call journal per row: calls, unfinished calls, stages and phases seen, and the row line's seed.

Exit 1 after writing when a digest differs at equal accepted counts, when a set summary or a common metric prefix
differs, when a row line names another seed, or when `base`'s `copyDigest` differs from the worktree's digest.

### 10. Self-test (`self-test.mjs`)

Each case prints `PASS <name>` or `FAIL <name>: <reason>`; the script writes its `state.json` (`done`, results,
`lastInvocation.seconds`) and exits 1 on any failure. Its bound: about 60 s; it carves and rates only small cases.
`--only <cases>` runs a subset, for development only (under the lock when a case rates); acceptance evidence is a full
run under the runner.

1. Paths and fingerprint guard: `ROOT` is the repository root; no path under `tools/ig-proto/` is in `SOURCE_FILES`; no
   file under `tools/ig-proto/` and no tree's copy of `tools/calibrate.mjs` contains a call that starts git.
2. Trees: `base` has the worktree's digest; `instr` and `log` build; their `copyDigest` differs from `base`'s; a change
   of one param or of a copy-only file changes `treeId` (and, for an added engine file, `copyDigest`); a synthetic
   manifest with a missing anchor and one with a repeated anchor throw and name their edit.
3. Sets: on `10x10-easy` (catalogue), seeds `ig-selftest/sets/0` to `/2`: for each attempt 0 to 3 where the `base`
   tree's `setAttempt` is ok, `carveSet` gives the same `set`, and today's `selectClues` with `calRng` gives the
   calibration's clues.
4. Instr equality: corpus = on `10x10-hard`, seeds `ig-selftest/instr/0` and `/1`: window subsets at offsets -1, 0, 1,
   2 from the start count, 2 each; plus 2 subsets of `12x12-nightmare` (seed `ig-selftest/instr/n`) at its start count.
   `base` and `instr` give deep-equal ratings, or errors of the same class with equal `counters`; every complete `instr`
   rating has `0 <= workFirst <= mainWork`, and `r7Cut` 0 unless its stop is `work-cap` (canonical limit; census cuts go
   to `r7CutCensus`); after each rating `igTake()` returns a value once and then null.
5. Log equality and journal: `setAttempt` for attempts 0 and 1 of two `10x10-hard` seeds gives deep-equal results in
   `base` and `log`; with `IG_LOG_DIR` under `tests/artifacts/ig-proto/selftest/logs`, the journal has a `start`, phase
   lines, `p` lines and an `end` per call; a call interrupted inside a worker (a synthetic worker terminated after its
   second probe) leaves `start`, two `p` lines and no `end`; the cost of one append is measured and recorded.
6. Screen rating: on the corpus of case 4, `screenRating(W = DEDUCE.work)` deep-equals `rate()`.
7. Lanes: four lanes on `instr` rate the corpus; the results, without `ms`, equal the in-process `instr` results in job
   order. A synthetic `call` job held past a short test deadline is cut, recorded `censored` with the profiles it had
   streamed, and its lane takes no further job.
8. Arm driver, without generation: `--dry-run` for `26x26-nightmare:0-1,14x14-master:0-1`; the test reads the
   matrices the driver wrote (not an example built apart) and checks that the tree's `checkMatrix` accepts each, that
   each has one case with `id` the case id, `seedPrefix` `landscape`, `repetitions` 1 and `seeds`
   `[landscape/<case>/<rep>]`, and that `shard.json` lists the row keys `26x26-nightmare~0`, `26x26-nightmare~1`,
   `14x14-master~0`, `14x14-master~1` with those seeds; a synthetic journal with a `started` row and no `recorded` line
   makes `run` exit 1; changed flags make it exit 1; `--horizon-s 40` with R = 90 admits no row and reports progress 0.
9. Writers and budget: `writeJson` and `writeText` outputs pass `checkText` of `tools/check-conventions.mjs`, use CRLF
   and refuse an absolute path. `budget.mjs decide` on synthetic logs: task allocation 600 s with 420 s counted and the
   round at 1,000 s gives A = 330 s and H = 275 s: `go` with H 275 for `minHorizonS` 110, and `stop` for `minHorizonS`
   280 although that step's `projectS` (90) would fit (the forecast never decides); a round at 10,700 s gives `stop` for
   every step, and `go` with an approval.

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/README.md`, `run-task.ps1`, `arm.mjs`, `identity.mjs`, `firewall.mjs`, `boards.mjs`, `self-test.mjs` | new |
| `tools/ig-proto/lib/paths.mjs`, `records.mjs`, `budget.mjs`, `tree.mjs`, `engine.mjs`, `sets.mjs`, `calls.mjs`, `lanes.mjs`, `lane-worker.mjs` | new |
| `tools/ig-proto/data/boards-v1.json` | new (by `boards.mjs write`) |
| `tools/ig-proto/variants/base.json`, `instr.json`, `log.json`; `variants/files/log/core/engine/ig-log.js` | new |
| `tools/ig-proto/plans/IGP-00.json` | new |
| `docs/improve-generating/evidence/provisional/IGP-00/` | new: identity records and the published arms |

Must not edit: anything else. Scratch: `tests/artifacts/ig-proto/`.

## Implementation steps

1. `paths.mjs`, `records.mjs`, `firewall.mjs`, `boards.mjs` (write the catalogue), `tree.mjs` and the three manifests;
   `tree.mjs check-edits --all` and `build base instr log` (unlocked, seconds).
2. `ig-log.js`, `engine.mjs`, `sets.mjs`, `calls.mjs`, the lanes.
3. `budget.mjs`, `arm.mjs`, `identity.mjs`, `run-task.ps1`, the plan.
4. `self-test.mjs`; run the plan; fix until every case passes and the identity holds.
5. `npm run check`; the firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-00.json` (allocation 9 minutes; the runner adds `--label` and `--source-label`):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-00` | | |
| trees | no | `tools/ig-proto/lib/tree.mjs build base instr log` | | |
| self-test | yes, once | `tools/ig-proto/self-test.mjs` | 105 | `IGP-00/self-test/state.json` |
| resume-test | yes, until done | `tools/ig-proto/arm.mjs run --task IGP-00 --arm resume --shard s1 --variant log --workers 4 --cases 6x10-very-easy:0-2 --row-limit-s 90 --max-rows 1` | 60 | `IGP-00/resume/s1/state.json` |
| resume-check | no | `tools/ig-proto/arm.mjs status --task IGP-00 --arm resume --shard s1 --check-rows` | | |
| identity-base | yes, until done | `tools/ig-proto/arm.mjs run --task IGP-00 --arm base --shard s1 --variant base --workers 4 --cases 26x26-nightmare:0-1,14x14-master:0-1 --row-limit-s 90` | 120 | `IGP-00/base/s1/state.json` |
| identity-log | yes, until done | the same with `--arm log --variant log` | 120 | `IGP-00/log/s1/state.json` |
| publish | no | `tools/ig-proto/arm.mjs publish --task IGP-00 --arm base`, then `--arm log` (two steps) | | |
| identity | no | `tools/ig-proto/identity.mjs --task IGP-00 --arms base,log` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-00` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-00.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-00 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

The resume test runs three cheap rows, one per invocation (`--max-rows 1`), and proves that a normal stop resumes with
exit 0 and `done` false. `status --check-rows` then asserts three distinct journal row ids `6x10-very-easy~0`, `~1` and
`~2`, each with a `row` line naming the seed `landscape/6x10-very-easy/<rep>` of its own rep, a recorded run with that
seed and local rep 0, and `recorded` lines whose original `rep` and `localRep` keep the two apart; it exits 1
otherwise. The four identity seeds reached ten in MP12b1 (responses 8.3, 27.4, 11.3 and 3.0 s), so each can reach
puzzle identity by digest when the arm reaches ten too.

## Record formats

- `identity.json`: `{ meta, arms: { base: { treeId, copyDigest, rows: [...] }, log: { ... } }, seeds: [{ case, seed,
  rep, mp12b1: { accepted, t1, t10, response, resultDigest, set }, base: {...}, log: {...}, pairs: { '<a>~<b>': {
  level: 'puzzle-identity' | 'metric-prefix', countsEqual, digestEqual, keyPrefixEqual, setSummaryEqual,
  metricPrefixLength, firstDifference } }, ratioBase, ratioLog, ratioLogBase }], summary: { seeds, puzzleIdentity,
  metricPrefixOnly, failures, medianRatioBase, medianRatioLog, medianLogOverhead, appendCostMs }, journal: { '<row>': {
  calls, unfinished, stages, phases, rowSeed } } }`.
- `identity.md`: the banner; a table per seed with the level reached per pair; the medians; the verdict "R00: holds"
  (with how many seeds reached puzzle identity and how many only metric-prefix agreement) or the failing rows.
- Published arms: `IGP-00/<arm>/s1.runs.json|md`, `s1.calls.jsonl` (`log` only).

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-00-B01 | The harness measures generation only through copies; no production file changed; no git command ran; the harness is outside every fingerprint | self-test case 1; the firewall check; `npm run check` |
| IGP-00-B02 | Same seed, same set and puzzles as far as it can be established: the unpatched copy and the logging copy agree with MP12b1 on four seeds, by digest where the accepted counts are equal, otherwise by metric prefix, each named (R00) | `identity.md` |
| IGP-00-B03 | Every locked command ran under `Invoke-IgNode`, within its horizon, and is accounted for; the budget guard and the no-rerun rule work | `invocations.jsonl`; self-test cases 8 and 9; the resume test and its check |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-00-T01 | `base`'s `copyDigest` equals the worktree's source digest (`34cea386…`); every other tree's differs; `treeId` follows every input; `check-edits --all` matches every edit | self-test case 2; command output |
| IGP-00-T02 | The instrumentation changes no rating, `igTake()` never yields a stale value, and the logging changes no result (cases 4 and 5); `screenRating` at the canonical cap equals `rate` (case 6) | self-test output |
| IGP-00-T03 | Lanes return results in job order equal to in-process results; the supervisor cuts a call before the horizon and keeps its streamed profiles (case 7); the carve-only set equals `setAttempt`'s (case 3) | self-test output |
| IGP-00-T04 | The arm driver builds and checks the exact one-row matrices it runs, admits rows by the horizon, exits 0 with `done` false on a normal stop and resumes, keeps the original row key, rep and seed apart from calibrate's local rep, refuses a changed shard, tree or harness, stops on a started row without its record, and publishes CRLF records without absolute paths | resume test and `--check-rows`; case 8; `publish` output |
| IGP-00-T05 | The runner gives every locked invocation a horizon from the allowance left, logs node seconds, lock wait, counted seconds, the horizon and the budget decision, stops with exit 4 when the horizon is below the step's minimum or an invocation made no progress, and never retries after an exception | `invocations.jsonl`; case 9; `-DryRun` output; code review |
| IGP-00-T06 | `npm run check` passes; the firewall check passes; under `tools/`, only `tools/ig-proto/` changed | command output |

## Test plan

The self-test (cases 1 to 9) and the resume test under the runner; the identity run; `npm run check`; the firewall
check. A failing case is fixed in the harness, never by changing a production file or loosening an equality.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the identity table, the logging overhead (median `log` / `base`
  and the append cost), the counted machine time and the lock waits.
- Handoff to IGP-01: the trees `instr` and `log`, `ig-log.js` (IGP-01 adds the prototype's API), the arm driver, the
  lanes, the budget guard and the runner.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IGP-00 ACCEPT; code fixes folded into IGP-01's step 0) |
| Start | 2026-11-14 21:00 (+07:00) |
| End | 2026-11-14 21:56 developer (runner plan 21:45:01-21:55:39, exit 0); 22:10 author acceptance; orchestrator commit |
| Duration | 56 min developer; six locked invocations through the runner (node 137.9 s, counted 407.9 s = 137.9 + 6 x 45 s; priority wait 496.5 s, not counted) |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (pack author review, opus-ig); claude-opus-5.5 (orchestrator) |
| Token usage | 113 model calls; 28,722,141 input tokens (28,179,695 cache reads); 235,703 output tokens |
| AI credits | about 653 (developer) |
| Verification | `tools/ig-proto/` (README, `run-task.ps1`, `arm.mjs`, `identity.mjs`, `firewall.mjs`, `boards.mjs`, `self-test.mjs`, `lib/` paths/records/budget/tree/engine/sets/calls/lanes/lane-worker, `data/boards-v1.json` with 105 cases, `plans/IGP-00.json`, variants `base`/`instr`/`log` with `ig-log.js`); self-test 9/9 under the runner (23.9 s); **R00 holds**: on all 4 seeds `resultDigest` equal at 10/10 accepted for MP12b1~base, MP12b1~log and base~log; median time ratios base/MP12b1 1.014, log/MP12b1 1.031, log/base 1.022; one journal append 0.307 ms; the base copy's digest `34cea386…` equals the worktree's (MP12b1's source). `npm run check` passes; firewall: 279 production files unchanged; no tracked file changed. Evidence: `docs/improve-generating/evidence/provisional/IGP-00/` |
| Acceptance | B01-B03 and T01-T06 met (developer; confirmed by the pack author's read-only review) |
| Issues & resolutions | (1) Debugging used 7 locked invocations under the dev ids IGP-98/IGP-99 (about 41 s node) whose records the developer deleted; disclosed here and reconstructed by the orchestrator as one line in `tests/artifacts/ig-proto/provisional/IGP-00-dev/invocations.jsonl` (counted 356 s = 41 + 7 x 45, `reconstructed: true`) so the round guard counts it; new rule: debug runs go through the runner as `<task>-dev` and their records are never deleted. (2) Failed invocations were charged wall time including the priority wait (spec bug): corrected in 00 section 8 and check-list section 7 to node seconds (300 if killed, 0 if never started) plus 45 s grace; no IGP-00 record affected. (3) Accepted additions: optional `levelId` on `rateRecord`; lanes `setHorizon` (may only lower), `limits`, `testKinds` and self-test `--only` (development only); plan-step `invocations` and `budget.mjs --forecast-s` (dry-run only). (4) `IncompleteRatingError` carries `counters`; spec fixed. `-SourceLabel` stays `cd5d17f (worktree 0e1283e)` for the provisional round. (5) New author finding: `r7Cut` mixes census-phase cuts (37 of 231 complete ratings, all census cuts); split into `r7Cut` and `r7CutCensus` with a `c` journal flag, in IGP-01's step 0 before IGP-02 |
| Handoff | IGP-01 step 0 before any locked invocation: the charging fix, the R7 split and `c` flag, the `recordedCall` guard (refuse a `log` tree), `setHorizon` lower-only, README updates; self-test runs IGP-00's cases 1-9 then `--proto` in one invocation |

# ig-proto: harness of the improve-generating phase-0 prototype pack

Test-side tooling that measures puzzle generation through patched **copies** of the source (the `core/` and `tools/`
folders), never through the production modules. It exists for the prototype pack in
`tasks/improve-generating/` and its estimates in `docs/improve-generating/report.md`. Every number it produces is
**provisional (pre-freeze)** until the pack is re-run on the frozen source (check-list §6).

Nothing here is a production file: the code lives in `tools/ig-proto/` (outside `SOURCE_FILES`, the published site and
the `tests/**/*.test.js` glob), patched copies, logs and checkpoints in `tests/artifacts/ig-proto/` (git-ignored) and
records in `docs/improve-generating/evidence/<label>/<task>/`.

## Rules

- **Copies, never edits.** A variant is a copy of `core/`, `tools/` (without `tools/ig-proto/`) and `package.json` with
  anchored text edits and added files. An anchor must occur exactly once, otherwise the build stops and names the edit.
  No production file is ever edited, not even for a moment. `firewall.mjs` proves it (SHA-256 of every production file).
- **No git.** No script runs a git command, read-only ones included. Identity comes from content: the source digest of
  `SOURCE_FILES`, the firewall manifest, the tree identities and a source label the runner receives
  (`-SourceLabel`). Every tree patches its copy of `tools/calibrate.mjs` so that its `readSource` runs no git (edit
  `meta-1`).
- **Every long command goes through the lock wrapper.** `run-task.ps1` calls `Invoke-IgNode` of the low-priority
  helper; difficulty-v3 has priority on the machine. Commands that take seconds and rate nothing (building a tree, the
  firewall, publishing, the identity report) run directly. Never run timing or generation outside the wrapper.
- **Bounded invocations.** A locked invocation ends by its horizon `H` (at most 285 s) by construction; the wrapper's
  kill at 300 s is a defect, never the sharder. Nothing started is rerun automatically.
- Node tools are `.mjs` with `// @ts-check`, 2-space indent, single quotes, semicolons; files are CRLF without BOM.
  A record is written once; a correction is a new file with a suffix (`-r2`).

## Layout

| Path | Role |
|---|---|
| `run-task.ps1` | run-plan runner: lock wrapper, exit protocol, budget guard, accounting |
| `plans/IGP-NN.json` | run plans (`allocationMinutes`, `optionalMinutes`, `steps`; a step has `id`, `locked`, `repeatUntilDone`, `optional`, `projectS`, `minHorizonS`, `invocations` (a dry-run forecast only), `node`, `state`) |
| `arm.mjs` | request-level arms: one-row calibrate runs of a tree (`run`, `publish`, `status`) |
| `identity.mjs` | identity of the arms against MP12b1 (`identity.json` and `identity.md`) |
| `fit-prior.mjs`, `data/prior-v1.json` | P4's table prior, fitted from MP12b1's reps 10-19 (IGP-01) |
| `verify.mjs` | every accepted prototype rating against its canonical rating (IGP-01) |
| `compare.mjs` | paired comparison on matched seeds (IGP-01); with task-qualified arms (`IGP-01/before:w095`) a study (IGP-03): per-W, population, split, shift, offset, 26x26 Master and arity-3 sections beside IGP-02's PM4 record, and the check of the no-screen journals; with arms of the P6 or eight-worker variants (IGP-04) a factor study: factors of T10, T1, the batch and the response per pair and cell, prefix identity per pair, P6's work saving from the call journals, the first-phase Projection, both memory criteria, and arm E against IGP-01's after arm |
| `budgets.mjs` | P5's budget inputs per arm, cell and stage from the journals: `budgets.json|md` (IGP-03; unlocked) |
| `compare-r2.mjs` | corrected comparison record of IGP-01 (`compare-r2.json|md`): puzzle population per cell, like-with-like caveats, the n = 1 and mixed-cell readings; analysis of the published runs only, unlocked |
| `pm4.mjs` | PM4 (IGP-02): `calls`, `screens` (locked) and `report` (unlocked): the screen certificate and the `W_screen` economics |
| `pm1.mjs` | PM1 tranche 1, reduced first slice (IGP-05): `windows`, `scan`, `failed-sets` (locked) and `report` (unlocked) |
| `pm2.mjs`, `pm2-worker.mjs` | PM2 (IGP-06): `run` (locked) and `summarize` (unlocked): where canonical rating time goes on 10x10 and 12x12 Nightmare, by phase, category and function, from a supervised profiled worker; the worker file also holds the classification and reduction the host reuses |
| `firewall.mjs` | snapshot and check of the production files |
| `boards.mjs` | writes or checks `data/boards-v1.json`, the frozen board catalogue |
| `self-test.mjs` | self-tests, run under the lock |
| `lib/paths.mjs` | roots, labels, constants, flag parser |
| `lib/records.mjs` | CRLF writers, the `meta` block, the banner, hashes, the harness identity |
| `lib/budget.mjs` | invocation totals and budget decisions |
| `lib/tree.mjs` | tree builder (API and CLI) |
| `lib/engine.mjs` | loads a tree's modules |
| `lib/sets.mjs` | catalogue boards and carve-only sets |
| `lib/calls.mjs` | recorded calls, screened and canonical ratings, window subsets |
| `lib/lanes.mjs`, `lib/lane-worker.mjs` | worker-thread lanes with admission and a supervisor |
| `variants/<id>.json` | variant manifests; `variants/files/<name>/...` copy-only files |

## Trees (variants)

| Variant | Extends | What it adds |
|---|---|---|
| `base` | none | only `meta-1`; its `copyDigest` is the worktree's source digest |
| `instr` | `base` | instrumentation of `deduce.js` (`igTake()`: work and nodes at the first solution, R7 work-limit cuts), test-side puzzle keys in the run records (`details.igSetKey`, `details.igPuzzleKeys`), diagnostic offers (`IG.diagnosticOffers`: the offer check of `pieceCountPlan` is bypassed, D-IG13) |
| `log` | `instr` | today's search logged per probe (`core/engine/ig-log.js`): the exported `selectClues` dispatches to the unchanged search |
| `p1p5` | `log` | the prototype of P1 to P5 (`core/engine/ig-select-proto.js`, IGP-01): `selectClues` is the prototype; `W` 190 M for every level; the P4 table prior (`paramFiles`) |
| `p1p5-main` | `p1p5` | the same with `W` 380 M for the Hell levels (D-IG5): the arm of the headline |
| `p1p5-w095`, `p1p5-w380` | `p1p5` | `W` 95 M (the control) and 380 M for every level (IGP-03) |
| `p1p5-w760` | `p1p5` | `W` 760 M, the canonical limit: no screen, so a capped probe is a canonical cap (IGP-03) |
| `p1p5-main-a3` | `p1p5-main` | `a3: true`: the arity-3 bisection of phase A in the set stage (IGP-03) |
| `p6` | none | edits only, composed after `log`, never alone: P6 (OD-P2), `measureV3` skips the DLX diagnostic while `igDlx.skip` is on, and `withP6` (`ig-log.js`) turns it on around the search and recomputes the diagnostic once for the returned result, so the rating equals the canonical one (IGP-04) |
| `w8` | none | edits only: `MAX_POOL_SIZE` 8, without P8's width and admission rules: an unadmitted throughput upper bound (IGP-04) |
| `log-p6`, `log-p6-w8`, `p1p5-main-p6-w8` | `log`; `log`; `p1p5-main`, each with `p6` (and `w8`) | today's search with P6, with P6 and eight workers, and the headline prototype with P6 and eight workers (IGP-04) |

Every variant except `base` gets `core/engine/ig-params.js` (`IG`, the merged params) and lists its added engine files
in the copy's `SOURCE_FILES` (`meta-2`), so that the copy's own source digest tells variants apart. `treeId` is the
SHA-256 over every copied source text, the resolved manifests, the copy-only files, the parameter files and the files of
`paramFiles`. A manifest's `paramFiles` (`{ "prior": "data/prior-v1.json" }`, paths relative to `tools/ig-proto/`) puts
the `cells` of the JSON file under `params.prior` and the file into `treeId`.

```powershell
node tools\ig-proto\lib\tree.mjs list
node tools\ig-proto\lib\tree.mjs check-edits --all      # lists every edit whose anchor no longer matches
node tools\ig-proto\lib\tree.mjs build base instr log p1p5 p1p5-main p1p5-w095 p1p5-w380 p1p5-w760 p1p5-main-a3 log-p6 log-p6-w8 p1p5-main-p6-w8   # prints: <id> <treeId> <copyDigest> built|reused
```

## Commands

```powershell
# the whole plan of a task (locked steps wait for a quiet slot; the runner stops with exit 4 on a budget stop)
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-00.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1" `
  [-Only <step ids>] [-IncludeOptional] [-ApprovedRoundMinutes <n>] [-ApprovedTaskMinutes <n>] [-DryRun]

node tools\ig-proto\firewall.mjs snapshot|check --task IGP-00 --label provisional
node tools\ig-proto\boards.mjs write|check
node tools\ig-proto\arm.mjs run --task T --arm A --shard S --variant V --workers 4 --cases 26x26-nightmare:0-1 `
  --row-limit-s 90 --label provisional --source-label <label> --horizon-s 285 [--max-rows n] [--dry-run]
node tools\ig-proto\arm.mjs publish --task T --arm A --label provisional --source-label <label>
node tools\ig-proto\arm.mjs status --task T --arm A --shard S --label provisional [--check-rows]
node tools\ig-proto\identity.mjs --task IGP-00 --arms base,log --label provisional
node tools\ig-proto\self-test.mjs --label selftest [--only 1,3] [--proto] [--p6] [--task T]   # cases that generate or rate need the lock; --p6 runs every case
node tools\ig-proto\fit-prior.mjs [--replace]       # recomputes data\prior-v1.json; exit 1 when it differs (unlocked)
node tools\ig-proto\verify.mjs --task T --arm A[,A2] --label provisional --source-label <label> --horizon-s 285   # locked
node tools\ig-proto\compare.mjs --task T --pairs before:after --reference mp12b1 --label provisional                # unlocked
node tools\ig-proto\compare.mjs --task IGP-03 --pairs IGP-01/before:w095,IGP-01/after:a3 --reference mp12b1 --pm4 IGP-02 --label provisional   # study
node tools\ig-proto\compare.mjs --task IGP-04 --pairs A:B,B:C,A:C,E:F --reference mp12b1 --label provisional      # factors (P6, eight workers), identity, memory
node tools\ig-proto\compare.mjs --task IGP-04 --reproduce E:IGP-01/after --label provisional                      # exit 1 when E's puzzles differ from IGP-01's after arm
node tools\ig-proto\budgets.mjs --arms IGP-01/after,IGP-03/w095 --label provisional [--task IGP-03]                # unlocked
```

`--only` (a subset of the self-test's cases), `limits` and `testKinds` of `createLanes`, and `setHorizon` are for the
self-test and for debugging only; a measuring script never passes them. `setHorizon(s)` may only lower the horizon of
the lanes. A debugging run that rates or generates also goes through the runner, with a scratch plan whose task id is
`<task>-dev` (its invocations count in the round's total, not in the task's cap); its records are never deleted.

### Exit protocol

A locked script exits 0 whenever it recorded its work, finished or not; its `state.json` says `done`, keeps the inner
tool's codes (`calibrateCodes`) and reports `lastInvocation.progress`. It exits 1 only on an error or a stop. The runner
repeats a `repeatUntilDone` step while it exits 0 with `done: false`; an invocation without progress is a stop
(exit 4). `-DryRun` evaluates the budget decisions of the plan and adds the steps' `projectS` (and 45 s per expected
invocation, the plan step's `invocations`) as a forecast; budget.mjs takes it as `--forecast-s`, which only a dry run
passes: a forecast never decides a real invocation.

### Budget guard (D-IG11)

Before every locked invocation the runner calls `node tools\ig-proto\lib\budget.mjs decide ...`: the allowance left is
`A = min(1.25 x the task's allocation - its counted total, 10,800 s - the round's counted total)`, each cap raised by an
approval, and the horizon is `H = min(285, A - 45 - 10)`. When `H` is below the step's `minHorizonS` the runner stops
with exit 4 and prints what it needs. The invocation line (`tests/artifacts/ig-proto/<label>/<task>/invocations.jsonl`)
has the step, the times, node seconds, lock wait (wall - node), counted seconds (node + min(lock wait, 45)), the
horizon and the decision. **Charging.** The node seconds come from the step's state file; for a failed invocation
without a fresh state they are the seconds the lock helper printed (`IG <task> exit=<n> seconds=<s>`, captured with
`-InformationVariable`), 300 when the helper killed the process, 0 when node never started. Never the wall time: the
wait for difficulty-v3 is not charged, only the 45 s grace of the quiet period.

### Bounds inside a locked invocation

With `e` the seconds since the node process started: an arm row starts only when `e + R + 10 <= H` (calibrate's child
limit `R`); a lane `rate` job only when `e + 30 <= H` and is a defect when it runs longer than 30 s; a lane `call` job
only when `e + 120 <= H - 15`, and it is cut at `H - 15`, recorded `censored` with every profile it had streamed, its
lane taking no further job.

## Records

- `arm.mjs run` writes, per shard, `shard.json` (flags, rows, `treeId`, `copyDigest`, `harnessHash`), `rows.jsonl`
  (`started` and `recorded` lines; a started row without a `recorded` line stops every later invocation), the one-row
  matrices (`rows/<case>~<rep>/matrix.json`, the objects checked by the tree's `checkMatrix`), calibrate's reports and
  `state.json`. The original rep stays in the row key and the seed (`landscape/<case>/<rep>`); calibrate's own `rep` of
  a one-row run is always 0 (`localRep`).
- `arm.mjs publish` writes `<S>.runs.json|md` and, for a tree with a journal, `<S>.calls.jsonl` (the journal lines,
  without the `accepted` blocks; above 5 MB the `row`, `start` and `end` lines only, as `<S>.calls-summary.jsonl`).
- `identity.mjs` compares, per seed and per pair of runs, at the strongest level the records can establish: **puzzle
  identity** (equal `details.resultDigest` at equal accepted counts, or, between two keyed arms, equal `igSetKey` and an
  equal common prefix of `igPuzzleKeys`), else **metric-prefix agreement** (set summary, then `clues`, `U`, `score`,
  `metrics.work`, `metrics.nodes` per puzzle). The record then says "puzzle identity not established".
- Every JSON record has the `meta` block of check-list §3 (`lib/records.mjs` `buildMeta`) and every Markdown record
  starts with the provisional banner.

## Journal of the `log` tree

With `IG_LOG_DIR` set (and `IG_ROW`, the row key), `ig-log.js` appends one JSON line per event, at once (open, append,
close), to `<IG_LOG_DIR>/<IG_ROW>.<pid>.<threadId>.jsonl`: `start`, `phase`, `p` (one per completed rating attempt, with
the tuple `[phase, count, outcome, score, mainWork, censusWork, workFirst, nodesFirst, nodes, censusNodes, stop, r7Cut,
ms, flags]`) and `end`. A call with a `start` line and no `end` line is unfinished: its worker was terminated or its
request ended. Without `IG_LOG_DIR` nothing is written. The row check of the child (`log-8`) writes
`<IG_ROW>.row.jsonl`, which binds the row key to the seed and the process id.

**The R7 fields.** `workFirst` and `nodesFirst` are -1 when the run never reached a first solution (a capped run) and
null on a tree without `igTake` (`base`). `r7Cut` counts R7's early answers caused by the work limit in the **main
search** (with the canonical limit it is 0 unless the run was capped); the cuts of the census, whose budget is
relative to the work at its start, are `r7CutCensus` (`rateRecord` has both; the tuple keeps `r7Cut`). The flags string
holds `e` (the census is incomplete, a rating is an estimate), `r` (refused by AR1) and `c` (`r7CutCensus > 0`). PM4's R7
coverage reads `r7Cut` only.

`recordedCall` (lib/calls.mjs) refuses a tree whose chain includes `log` (it reads the tree's `ig-tree.json`): its rate
seam consumes `igTake()` before the journal does. Use `instr` or `base`.

## The prototype of P1 to P5 and the comparison (IGP-01)

`variants/files/p1p5/core/engine/ig-select-proto.js` (a copy-only file, never imported by production code) has the
contract of `selectClues`: phase A locates the clue count on one nested family of subsets (P1, with the P4 prior, else
K - U0 clues), every probe is rated under the lowered main-work limit `W` (P2: a run that stayed within `W` has the
canonical rating, a run above it is screen-capped and never accepted), a screen-capped probe reads as "too few clues"
(P3), a call whose canonical ratings show no window ends at once as `no-window` (P5) after one rescue (a canonical
re-rating of the screen-capped locate probes nearest the window count), then today's window loop, dead end and beam run
from the window count, and a call that ends without a candidate re-rates the nearest screen-capped probes canonically.
At most `rerateMax` (4) canonical re-ratings per call, rescue and end together. Its journal adds the phases `locate`,
`rescue`, `window` and `rerate`, `W` and `priorCount` on the `start` line, and `locate` (`c0`, `prior`, `probes`,
`result`, `hit`, `hiBelow`, `loAbove`, `wc`, `noWindowProof`, `rescue`) and the accepted result (`accepted`, for
`verify.mjs`) on the `end` line. Test seams (self-test only): `ctx.igScreen(clues, W)`, `ctx.igCanonical(clues)`,
`ctx.igPrior` and `ctx.igW`. The rescue re-rates every screen-capped locate probe the allowance leaves, then acts on the
canonical results: an in-band result is the window hit and, when AR1-eligible, a candidate; rescued results below or
above the band steer the bracket only (they are no candidates), while the re-ratings of phase E join the candidates on
either side.

`fit-prior.mjs` writes `data/prior-v1.json` (the median clue share of the accepted puzzles of MP12b1's reps 10-19 per
`<level>@<area>`); `verify.mjs` rates every accepted rating of an arm canonically on `base` and exits 1 on a difference;
`compare.mjs` pairs the arms seed by seed (matched cohorts) and writes `compare.json|md`: the headline cells, the
identity of the before arm against MP12b1, the stage tables and the multipliers (dead-end share, window profiles,
re-ratings, locate profiles and proofs, work per accepted puzzle, waves, set-stage share, start-count capped share).

## PM4: the screen certificate and the `W_screen` economics (IGP-02)

`pm4.mjs` measures P2's screen on real profiles; it runs on the `instr` tree and changes nothing but `DEDUCE.work`.

```powershell
node tools\ig-proto\pm4.mjs calls   --shard <name> --cases <id>[,<id>...] --label <L> [--run-id <id>] [--task <T>]   # locked
node tools\ig-proto\pm4.mjs screens --shard <name> --cases <id>[,<id>...] --label <L> [--run-id <id>] [--task <T>]   # locked
node tools\ig-proto\pm4.mjs report  --label <L> [--run-id <id>] [--task <T>]                                         # unlocked
```

- **Corpus.** Seven cells (`10x10`, `12x12`, `14x14`, `15x15b10`, `26x26` Nightmare, `26x26-hell-1`, `26x26-master`), four
  sets each (seeds `ig-pm4/<case>/<i>`). A set's call profiles are every canonical rating of today's set-stage call
  (`recordedCall` with the set's `calRng`); the window profiles are three subsets each at the start count + 1 to + 4.
- **Screens.** Every profile is rated again at 95, 190 and 380 M, and, when its canonical rating is complete with a known
  first solution, at three boundary limits taken from its own record (main work - 1, work to the first solution - 1, the
  middle of the count tail; a coinciding limit is rated once and keeps both kinds). Classes: `certified` (a rating with
  main work <= `W`: must deep-equal the canonical rating, else a violation and a stop), `scap0` (capped before the first
  solution), `scap1` (a rating with main work > `W` and stop `work-cap`), `over` (a rating with main work > `W` and another
  stop). R7 coverage counts `r7Cut` of the main search only; `r7CutCensus` is reported apart.
- **Runs and shards.** `--run-id main` (the default: seven cells) or `dry` (`10x10-nightmare`, one set); the manifest is fixed in
  `pm4.mjs`. The first invocation writes `tests/artifacts/ig-proto/<L>/<task>/<run-id>/run.json` (manifest, `treeId`, harness
  hash) and every later one checks it, so `pm4.mjs` must not change between the first `calls` and the `report`. A shard is a
  name with an immutable cell list (`calls-<shard>-state.json`, `screens-<shard>-state.json`); a cell belongs to one shard of a
  kind. Per-cell files: `<case>/calls.json` (sets with pieces and witness, canonical profiles, window profiles) and
  `<case>/screens.checkpoint.jsonl` (one line per finished screen; `screens` resumes from it). A `calls` invocation that
  started calls and wrote no result stops the next one (a started observation without its record).
- **Report.** `report` requires every manifest cell in exactly one done `calls` shard and one done `screens` shard, checks every
  profile's three fixed screens and the certified-class invariants, and writes `pm4.json`, `pm4.md` and
  `profiles-<case>.jsonl` to `docs/improve-generating/evidence/<L>/IGP-02/` (for the `main` run of task `IGP-02` only; a `dry`
  run or a developer's run writes to `<run>/report/` under `tests/artifacts/`). It exits 1 when a violation exists.
- **Economics** (per cell and `W`, on today's call profiles; window profiles apart): class shares, useful ratings lost
  (canonical complete, in band, not refused by AR1, and not certified), where the losses lie (clue share and offset from the
  start count of the lost useful ratings against all useful ones), misdirections (screen-capped profiles whose canonical side
  is below the band or in it), cost ratio, net ratio, P2 saving and the cost per useful rating, the share with main work <=
  `W`, the work to the first solution, the start-count capped share and the canonical cost by clue offset from the start count.
- **Developer runs.** `--task IGP-02-dev` (with `--run-id dry` or `dev<n>`) keeps every file under
  `tests/artifacts/ig-proto/<L>/IGP-02-dev/`; locked ones go through `run-task.ps1` with a scratch plan of task `IGP-02-dev`.

## PM3 variants, the no-screen arm, arity 3 and the budget inputs (IGP-03)

- **Variants.** `p1p5-w095`, `p1p5-w380` and `p1p5-w760` differ from `p1p5` only in `W`. At `W` = `DEDUCE.work` (760 M) the
  prototype's `screened` is false: `rateScreen` is the canonical rating, `recordRating` gets `W` null, a capped probe is
  journaled `capped` (not `scap0`) and reads as too few clues (P3 on a canonical cap), nothing is screen-capped or
  re-rated. `compare.mjs` checks these journals (every `start` line has `W` 760,000,000; no `scap0`, `scap1`, `over`;
  no `rescue` or `rerate` tuple) and exits 1 otherwise.
- **Arity 3** (`p1p5-main-a3`, `IG.a3` and `ctx.igStage === 'set'`). Only the bisection of phase A changes: a round rates up
  to three counts of the family (middle, lower, upper quarter point of the bracket, distinct and inside it), all of them,
  journaled in phase `locate-a3`, then reads them in that order through `afterProfile` (a final result ends the call: the
  probes not yet read stay rated, so they are wasted); the first in-band result in that order is the hit, else the bracket
  takes the largest above-side and the smallest below-side count (crossing results keep the middle probe's side). The
  `locate` summary of the `end` line gets `rounds`: `{ probes: [{ count, side, ms }], serialMs, criticalMs, consumed }`.
  With `a3` false, or in another stage, the path is IGP-01's; `rerate` other than `end` still throws.
- **Study mode of `compare.mjs`.** An arm may be `<task>/<arm>` (`IGP-01/before:w095`); pairs use matched seeds only and the
  identity check against MP12b1 applies to the `log` arm only. The study sections are labelled two-seed indications:
  per W (work per accepted puzzle with and without the set stage, profiles, capped probes, re-ratings, re-rated probes in
  band, PM4's figures from `--pm4 <task>`), population (R32), the split (R33), the sets each request was served on and the
  same-set clue shift, accepted puzzles and probes by clue offset beside PM4's cost by offset, 26x26 Master at 380 M (R07)
  and the arity-3 table (R20: probes counted with the wasted ones, rounds, the idealised call-level T1 bound, a
  Projection). No `W_screen` is recommended.
- **`budgets.mjs`** reads the journals of the arms and writes P5's budget inputs for B = 1, 2, 4, 6, 8 and 12 G units per arm,
  cell and stage (`ok beyond B`, `failed above B`, unfinished calls apart) with the median work rate to show B in seconds. It
  changes no search: the budgets stay recorded, not enforced.
- **Harness hash.** `compare.mjs`, `budgets.mjs` and `self-test.mjs` are driver scripts: the shards of an arm refuse to
  continue once any of them changed, so they are final before the first shard starts.

## PM1 tranche 1, reduced first slice (IGP-05)

`pm1.mjs` runs canonical ratings of nested clue families on the `instr` tree (diagnostic offers, D-IG13); it changes nothing
but the clue subsets it rates.

```powershell
node tools\ig-proto\pm1.mjs windows     --cases <ids> --sets 2 --orders 2 --label <L> [--run-id <id>] [--task <T>]   # locked
node tools\ig-proto\pm1.mjs scan        --cases <ids> --sets 2 --orders 2 --label <L> [--run-id <id>] [--task <T>]   # locked
node tools\ig-proto\pm1.mjs failed-sets --cases <ids> --sets 4 --orders 2 --label <L> [--run-id <id>] [--task <T>]   # locked
node tools\ig-proto\pm1.mjs report      --label <L> [--run-id <id>] [--task <T>]                                      # unlocked
```

- **Families.** A family is a set (seed `ig-pm1/<case>/<i>`, or `ig-pm1/<case>/fs/<i>` in part 3: the first of eight attempts
  whose carve succeeds) and an order `o` (`createRng(normalizeSeedText(seed), 'ig-pm1/order/<o>')` shuffling the witness
  positions); `clues(c)` is the first `c` positions, sorted, so the counts of a family are nested. A count is rated once:
  the algorithms replay from the ratings made so far, so a family's checkpoint is its list of probes.
- **Lanes.** Four lanes, one family per lane (four `createLanes` objects of size 1, never more: eight would inflate the
  measured time per rating by 9-28 % on this machine). Every probe is a canonical `rate` job admitted by its bound
  (check-list §7). `progress.json` (header with `treeId` and harness hash; the in-flight families and the completed ones that
  wait for an earlier family) is rewritten after every probe; `families.jsonl` gets completed families in the fixed order
  (cells, sets, orders) only; `discoveries.jsonl` gets every in-band rating with its full inputs at once.
- **Parts.** `windows` (part 1): boundary search from the cheap side (more clues) by doubling, bisection, then a scan of
  the five counts above the boundary; results `boundary`, `no-cap`, `capped-at-cheap-side`, `no-set`, `error`. `scan` (part 2):
  every count from K - 8 down to 1, stopped by three consecutive capped counts. `failed-sets` (part 3): today's
  set-stage call per set (`call` job, one per lane, profiles streamed; a call cut at the horizon is `censored`), its
  failure classified (`censored`, `in-band-refused`, `limit` at 64 profiles, `dead-end`: no rated candidate, every profile
  capped or refused, `never-in-band`, `other`), then the part-1 algorithm on two orders of every set whose call made no
  puzzle (a censored call included; a set without a carve has none). A call is never rerun.
- **Flags per part.** The first invocation of a part writes its `state.json` header (cells, sets, orders, `treeId`,
  `harnessHash`); every later one checks it and exits 1 on a difference. `--horizon-s` is the runner's; `--max-probes N` is a
  test option and only the first invocation of a part honours it (it stops after N probes, so that a plan step that repeats
  the same arguments resumes the family from its checkpoint and finishes it).
- **Records.** Artifacts under `tests/artifacts/ig-proto/<L>/IGP-05/<run-id>/<part>/` (`state.json`, `progress.json`,
  `families.jsonl`, `discoveries.jsonl`, `calls.json`). The report writes `docs/improve-generating/evidence/<L>/IGP-05/`
  (`pm1.json`, `pm1.md`, `families-<part>.jsonl`, `discoveries.jsonl`) for the `main` run of task `IGP-05` and
  `<run-id>/report/` under the artifacts otherwise. It checks the fixed order, the boundary pairs and that every in-band
  rating is in `discoveries.jsonl`; a harness hash that differs from a part's header (a report-only change) is recorded in
  `pm1.json` and `pm1.md`, both hashes named. Families or calls not run (the budget guard stopped a part) are listed as
  "not reached (budget)", never as "none observed".
- **Offsets and main work.** Every rating carries `startCount` (`startCountFor`, as PM4) and `offset` = count - start count;
  the report gives in-band and eligible ratings by PM4's offset buckets (`<0`, `0` to `4`, `>4`), part 2 beside PM4's
  useful share of the same cell, and the share of in-band and eligible ratings whose main work exceeds 95, 190 and 380 M.
- **Developer runs.** `--task IGP-05-dev` (any `--run-id`) keeps every file under `tests/artifacts/ig-proto/<L>/IGP-05-dev/`;
  locked ones go through `run-task.ps1` with a scratch plan of task `IGP-05-dev`.

## PM2 rating profile on 10x10 and 12x12 Nightmare (IGP-06)

`pm2.mjs` and `pm2-worker.mjs` profile canonical ratings on the `base` tree (no instrumentation, no copy edit); they change
no rating, they only observe.

```powershell
node tools\ig-proto\pm2.mjs run       --run-id <main|dry> --label <L> [--task <T>]   # locked
node tools\ig-proto\pm2.mjs summarize --run-id <main|dry> --label <L> [--task <T>]   # unlocked
```

- **Runs.** The manifest is fixed in `pm2.mjs`: `main` = `10x10-nightmare` and `12x12-nightmare`, three sets each (seeds
  `ig-pm2/<case>/<i>`); `dry` = `10x10-nightmare`, one set (seed `ig-pm2/dry/0`). The first `run` writes
  `tests/artifacts/ig-proto/<L>/IGP-06/<run-id>/run.json` (manifest, `treeId`, harness hash); every later one checks it and
  exits 1 on a difference. `--task IGP-06-dev` (run ids `dry` or `dev<n>`) keeps every file under
  `tests/artifacts/ig-proto/<L>/IGP-06-dev/`.
- **Stage 1, corpus** (`corpus.jsonl`). Today's set-stage call of each set, with its window subsets (offsets 1 to 4, three
  subsets each), as `call` jobs on up to six lanes of the `base` tree, in waves of one call per lane. A call has a `started`
  line before its dispatch and a `recorded` line after it (the set's `boardRows` and `pieces`, every profile's `clues` and
  canonical outcome; a call cut at `H - 15` is `censored` with the profiles it streamed). A started call without its
  recorded line stops the task (exit 1); nothing is rerun.
- **Stage 2, profiles** (`<case>/ratings.jsonl`). Once the corpus is complete, one worker thread (`pm2-worker.mjs`) rates
  every corpus profile in order, one canonical `rate()` each, under the V8 CPU profiler of its own inspector `Session`
  (sampling interval 1000 µs, one profile per rating). The host admits a rating only when `e + 30 s <= H`, journals `started`
  and `recorded`, and cuts a rating that runs longer than 30 s with `worker.terminate()` (a `cut` line, exit 1: a defect). The
  worker reduces each profile to an attribution; the first five ratings of each cell keep their raw profile
  (`<case>/raw-<index>.cpuprofile`, URLs reduced to file names inside the tree) so that `summarize` can reduce them again on
  the host with a different traversal. Every tenth rating of a cell is also rated once without the profiler (alternately
  before and after the profiled run): the profiling overhead. The profiled rating must equal its corpus rating (class,
  score, main and census work), else exit 1.
- **Attribution** (integer µs). A sample is charged the time to the next sample. Its *phase* is the first marker among the
  frame and its ancestors: `census` (`runProbes`, `settleCensus`, `probe`, `replayLadder`), else `dlx` (`solveFirst`, and every
  function of the `dlx` category), else `model` (`buildModel`, and every function of the `model` category), else `search`
  (`measureDeduction`, `search`, `branch`), else `other` (scoring, the harness, `(program)`, GC). The profiler does not report
  inlined frames and V8 inlines `measureDeduction` into `measureV3` once it is hot, which leaves the search's `search` frames
  without their parent (a dev run put 99.9 % of a capped rating in `other` under the literal rule): the main search's own
  recursion is therefore a `search` marker, and the model and DLX files are markers of their phases. Time in a `deduce.js`
  function that no marker could place stays in `other` and is reported as `unplaced`. A sample's *category* comes from the
  function and file (`ladder`, `state`, `control`, `model`, `dlx`, `gc`, `other`; the rules are `CATEGORY_RULES` in
  `pm2-worker.mjs`). `(idle)` samples are not rating time. The denominator is the attributed rating time of the profiled
  corpus.
- **`summarize`** merges the `recorded` attributions per cell and per profile class (call profiles and window subsets, each
  complete or capped) and writes `pm2.json` and `pm2.md` (to `docs/improve-generating/evidence/<L>/IGP-06/` for the `main` run
  of task `IGP-06`, else to `<run-id>/report/` under the artifacts): phase, category and phase x category tables, the top 30
  functions, the kernel share k (`search` and `census`), P7's hypothetical sensitivity 1 / (1 - k + k / s) for s = 1.25, 1.5, 2
  and 3, the kernel speed-up needed for the factors 1.1, 1.3, 1.8, 1.87 and 1.91 (or "not reachable"), the `dlx` share beside
  IGP-04's P6 figures, the profiling overhead and the checks (every table adds up to the rating time within 1 %; the host
  reduction of each raw profile equals the worker's). It exits 1 on a failed check. A harness hash that differs from the run's
  (a report-only change of `pm2.mjs`) is recorded in the summary, not a stop.
- **Harness hash.** `pm2.mjs` and `pm2-worker.mjs` are driver scripts: `run` refuses to continue once either changed.

## Re-running on the frozen source

`node tools\ig-proto\lib\tree.mjs check-edits --all` lists every anchored edit that no longer matches (the pack author
re-derives them), then each task's plan runs with `-Label frozen` (check-list §6). The catalogue
`data/boards-v1.json` is frozen and never rewritten silently (`boards.mjs write` refuses an existing file unless
`--replace` is given on the pack author's instruction).

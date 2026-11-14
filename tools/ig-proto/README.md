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
| `compare.mjs` | paired before/after comparison on matched seeds (IGP-01) |
| `compare-r2.mjs` | corrected comparison record of IGP-01 (`compare-r2.json|md`): puzzle population per cell, like-with-like caveats, the n = 1 and mixed-cell readings; analysis of the published runs only, unlocked |
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

Every variant except `base` gets `core/engine/ig-params.js` (`IG`, the merged params) and lists its added engine files
in the copy's `SOURCE_FILES` (`meta-2`), so that the copy's own source digest tells variants apart. `treeId` is the
SHA-256 over every copied source text, the resolved manifests, the copy-only files, the parameter files and the files of
`paramFiles`. A manifest's `paramFiles` (`{ "prior": "data/prior-v1.json" }`, paths relative to `tools/ig-proto/`) puts
the `cells` of the JSON file under `params.prior` and the file into `treeId`.

```powershell
node tools\ig-proto\lib\tree.mjs list
node tools\ig-proto\lib\tree.mjs check-edits --all      # lists every edit whose anchor no longer matches
node tools\ig-proto\lib\tree.mjs build base instr log p1p5 p1p5-main   # prints: <id> <treeId> <copyDigest> built|reused
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
node tools\ig-proto\self-test.mjs --label selftest [--only 1,3] [--proto] [--task T]   # cases that generate or rate need the lock
node tools\ig-proto\fit-prior.mjs [--replace]       # recomputes data\prior-v1.json; exit 1 when it differs (unlocked)
node tools\ig-proto\verify.mjs --task T --arm A[,A2] --label provisional --source-label <label> --horizon-s 285   # locked
node tools\ig-proto\compare.mjs --task T --pairs before:after --reference mp12b1 --label provisional                # unlocked
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

## Re-running on the frozen source

`node tools\ig-proto\lib\tree.mjs check-edits --all` lists every anchored edit that no longer matches (the pack author
re-derives them), then each task's plan runs with `-Label frozen` (check-list §6). The catalogue
`data/boards-v1.json` is frozen and never rewritten silently (`boards.mjs write` refuses an existing file unless
`--replace` is given on the pack author's instruction).

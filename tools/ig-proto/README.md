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
| `identity.mjs` | identity of the arms against MP12b1 (`identity.json` and `identity.md`); a pair with `mp12b1` on another source is `different-source` with `sameResult`, not a failure, and a seed MP12b1 did not run fails only under `provisional` (V4-T01b) |
| `fit-prior.mjs`, `data/prior-v1.json` | P4's table prior, fitted from MP12b1's reps 10-19 (IGP-01) |
| `verify.mjs` | every accepted rating of an arm against its canonical rating (IGP-01); its record names the task's own criterion (`IGP-01-T02`, `IGP-03-T02` for IGP-03 and IGP-03h, `IGP-04-T01`) and says "accepted prototype ratings" for a prototype arm (`p1p5-*`) and "accepted ratings" for an arm of today's search (`log*`) |
| `compare.mjs` | paired comparison on matched seeds (IGP-01); with task-qualified arms (`IGP-01/before:w095`) a study (IGP-03): per-W, population, split, shift, offset, 26x26 Master and arity-3 sections beside IGP-02's PM4 record, and the check of the no-screen journals; with arms of the P6 or eight-worker variants (IGP-04) a factor study: factors of T10, T1, the batch and the response per pair and cell, prefix identity per pair, P6's work saving from the call journals, the first-phase Projection, both memory criteria, and arm E against IGP-01's after arm; IGP-03h adds the arm-only section (`--pm1`), the by-seed screen against no screen across tasks and `--reproduce` with `--common-seeds` (see the re-run index) |
| `budgets.mjs` | P5's budget inputs per arm, cell and stage from the journals: `budgets.json|md` (IGP-03; unlocked) |
| `compare-r2.mjs` | corrected comparison record of IGP-01 (`compare-r2.json|md`): puzzle population per cell, like-with-like caveats, the n = 1 and mixed-cell readings; analysis of the published runs only, unlocked |
| `pm4.mjs` | PM4 (IGP-02): `calls`, `screens` (locked) and `report` (unlocked): the screen certificate and the `W_screen` economics |
| `pm1.mjs` | PM1 tranche 1, reduced first slice (IGP-05): `windows`, `scan`, `failed-sets` (locked) and `report` (unlocked) |
| `pm2.mjs`, `pm2-worker.mjs` | PM2 (IGP-06): `run` (locked) and `summarize` (unlocked): where canonical rating time goes on 10x10 and 12x12 Nightmare, by phase, category and function, from a supervised profiled worker; the worker file also holds the classification and reduction the host reuses |
| `summary.mjs` | the estimate-vs-measured summary (IGP-07): reads the records of IGP-00 to IGP-06 and IGP-03h and the invocation logs, writes `summary.json|md` (rows R00 to R33 with their descriptive verdicts, R31's Projection, the round's counted machine time, the later-round list and the open plan-author questions); unlocked, generates and times nothing |
| `firewall.mjs` | snapshot and check of the production files |
| `snapshot.mjs` | hash manifest of the frozen source snapshot: `record` (once) and `verify` (task pack v4, V4-T01a; see "Frozen source") |
| `receipt.mjs` | the frozen source receipt (V4-T01b; `--label frozen` only): `receipt.json` and `receipt.md` in `evidence/frozen/V4-T01b/`; unlocked, see "Source-dependent imports (V4-T01b)" |
| `pm1-inventory.mjs` | the data-only inventory of PM1's existing records (V4-T03; `--label frozen` only): `inventory.json` and `inventory.md` in `evidence/frozen/V4-T03/`; unlocked, see "PM1 inventory (V4-T03)" |
| `boards.mjs` | writes or checks `data/boards-v1.json`, the frozen board catalogue |
| `self-test.mjs` | self-tests, run under the lock |
| `lib/paths.mjs` | roots, labels, constants, the source kind (`SOURCE_KIND`, `sourceRoot`), flag parser |
| `lib/records.mjs` | CRLF writers, the `meta` block, the banner, hashes, the harness identity |
| `lib/budget.mjs` | invocation totals and budget decisions |
| `lib/tree.mjs` | tree builder (API and CLI) |
| `lib/engine.mjs` | loads a tree's modules |
| `lib/fake-pool.mjs` | the scripted worker pool of `tests/generation-client.test.js` ported with the tree's `createPool` as a parameter: `settle`, `createFakeClock`, `FakeWorker`, `harness`, `track` (V4-T07b; see "P5 bounded set attempts (V4-T07b)") |
| `lib/sets.mjs` | catalogue boards and carve-only sets; `offeredInSource` comes from the tree's own `levels.js` (V4-T01b) |
| `lib/calls.mjs` | recorded calls, screened and canonical ratings, window subsets |
| `lib/lanes.mjs`, `lib/lane-worker.mjs` | worker-thread lanes with admission and a supervisor; the lane worker also runs the three stage-1 item kinds (V4-T04b) |
| `lib/items.mjs` | the runner of bounded, identity-checked measurement items and the item-log line helpers (V4-T04a; see "Bounded measurement items") |
| `lib/ledger.mjs` | the work ledger of an item from its journal lines, and `pairPrimitives` (V4-T04b; see "Stage-1 item kinds"); pure |
| `lib/packs.mjs` | the pack file of a generation item: `preparePackPath` and `writePackFile` (V4-T04b) |
| `lib/proof.mjs` | the typed proof receipt of the frozen round: `proofEnvelope`, `proofCheck`, `LIVE_DEADLINE_FIELDS` and `STAGE1_COVERAGE_EXTRA` (V4-T04d), and its accepted binding: `acceptedBinding`, `checkAccepted` and `ACCEPTED_FORMAT` (V4-T04f; see "Stage 1 checks (task pack v4)"); pure apart from the evidence reads of `readRepoFile` |
| `v4-check.mjs`, `plans/V4-T04.parity.json`, `plans/V4-T04.replay.json`, `plans/V4-T04.json` | the stage-1 checks (V4-T04c, V4-T04d, V4-T04f): `run` expands an item manifest and runs its items; the parity and replay verdicts; `summary` writes the stage-1 receipt; `pm4-gate` is the early PM4 check; `evidence-check`, `accept` and `check-binding` are the accepted binding's commands; the plan of the stage-1 runs; see "Stage 1 checks (task pack v4)" |
| `variants/<id>.json` | variant manifests; `variants/files/<name>/...` copy-only files |
| `variants/v4-ps.json`, `plans/V4-T05.json`, `plans/V4-T05.prior-gen.json`, `plans/V4-T05.prior-replay.json` | the per-set prior arm `v4-ps` and the plan and manifests of its run (V4-T05); the verdict is `v4-check.mjs prior-verdict`; see "The per-set prior (V4-T05)" |
| `variants/link.json`, `variants/log-link.json`, `variants/v4-link.json`, `variants/v4-ps-link.json`, `variants/files/link/`, `linkage.mjs`, `plans/V4-T06.json` | the batch linkage journal and its report (V4-T06): the variant `link` and its three compositions, `ig-link.js`, `linkage.mjs report` and the plan of its run; see "Batch linkage (V4-T06)" |
| `variants/v4-p5.json`, `variants/v4-p5-w8-test.json`, `variants/v4-link-w8-test.json` | the P5 pilot arm `v4-p5` (the call budget and the bounded set attempts) and the two test-only width-8 trees (V4-T07b); see "P5 bounded set attempts (V4-T07b)" |
| `variants/fr-base.json`, `fr-screen.json`, `fr-none.json`, `fr-close.json`, `fr-c4.json`, `fr-ps.json`, `fr-p5.json` | the seven frozen-round arms of stage 2 (V4-T08); see "Frozen-round arms (V4-T08)" |

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
| `link` | `log` | the batch linkage journal (V4-T06, V4-T06b; see "Batch linkage (V4-T06)"): `core/browser/ig-link.js` and seventeen edits (`link-1` to `link-17`); composed after `log`, it changes no result |
| `log-link`, `v4-link`, `v4-ps-link` | `log` and `link`; `v4` and `link`; `v4-ps` and `link` | today's search, the `gen-v4` prototype and the `gen-v4` prototype with the per-set prior, each with the linkage journal and the accept timeline (V4-T06); no edit of their own |
| `v4-p5` | `v4-link` | P5's pilot arm (V4-T07b): `callBudget` 2,000,000,000 units for every Nightmare and Hell 1 call and `setAttemptsBound` 4, with three edits (`p5-1` to `p5-3`); see "P5 bounded set attempts (V4-T07b)" |
| `v4-p5-w8-test`, `v4-link-w8-test` | `v4-p5` and `w8`; `v4-link` and `w8` | test only (V4-T07b): the same trees with `MAX_POOL_SIZE` 8 (`w8-1`) for the width-8 scripted cases; never an arm or a plan step |
| `fr-base` | `v4-link` | the frozen-round base arm (V4-T08): the plan's default `W_screen` table by class (`screenClasses`, `screenTable` `tab-default`); no edit |
| `fr-screen`, `fr-none` | `fr-base` | the screen in every class (`tab-screen`) and no screen in any class (`tab-none`) (V4-T08) |
| `fr-close`, `fr-c4` | `fr-base` | bracket-close re-rating (`rerate: 'close'`, D-IG7) and the (c4) probe (`c4: true`) (V4-T08) |
| `fr-ps`, `fr-p5` | `fr-base` and `v4-ps`; `fr-base` and `v4-p5` | the per-set prior and P5's budget and bounded set attempts on the `fr-base` table (V4-T08) |

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
node tools\ig-proto\receipt.mjs --label frozen --source-label "frozen 3fc65f4"      # unlocked, writes receipt.json|md (V4-T01b)
node tools\ig-proto\arm.mjs run --task T --arm A --shard S --variant V --workers 4 --cases 26x26-nightmare:0-1 `
  --row-limit-s 90 --label provisional --source-label <label> --horizon-s 285 [--max-rows n] [--dry-run]
node tools\ig-proto\arm.mjs publish --task T --arm A --label provisional --source-label <label>
node tools\ig-proto\arm.mjs status --task T --arm A --shard S --label provisional [--check-rows]
node tools\ig-proto\identity.mjs --task IGP-00 --arms base,log --label provisional
node tools\ig-proto\self-test.mjs --label selftest [--only 1,3] [--proto] [--p6] [--frozen] [--items] [--task T]   # cases that generate or rate need the lock; --p6 runs every case; --frozen runs only the frozen-source group and --items only the measurement-items group (both unlocked)
node tools\ig-proto\fit-prior.mjs [--replace]       # recomputes data\prior-v1.json; exit 1 when it differs (unlocked)
node tools\ig-proto\verify.mjs --task T --arm A[,A2] --label provisional --source-label <label> --horizon-s 285   # locked
node tools\ig-proto\compare.mjs --task T --pairs before:after --reference mp12b1 --label provisional                # unlocked
node tools\ig-proto\compare.mjs --task IGP-03 --pairs IGP-01/before:w095,IGP-01/after:a3 --reference mp12b1 --pm4 IGP-02 --label provisional   # study
node tools\ig-proto\compare.mjs --task IGP-04 --pairs A:B,B:C,A:C,E:F --reference mp12b1 --label provisional      # factors (P6, eight workers), identity, memory
node tools\ig-proto\compare.mjs --task IGP-04 --reproduce E:IGP-01/after --label provisional                      # exit 1 when E's puzzles differ from IGP-01's after arm
node tools\ig-proto\compare.mjs --task IGP-03h --reproduce main:IGP-01/after --common-seeds --label provisional   # only the seeds both arms ran
node tools\ig-proto\compare.mjs --task IGP-03h --pairs IGP-01/before:w760,IGP-01/after:w760 --reference mp12b1 --pm4 IGP-02 --pm1 IGP-05 --label provisional   # study with an arm-only cell
node tools\ig-proto\compare-r2.mjs --task IGP-01 --label provisional                                               # unlocked
node tools\ig-proto\budgets.mjs --arms IGP-01/after,IGP-03/w095 --label provisional [--task IGP-03]                # unlocked
node tools\ig-proto\summary.mjs --label provisional [--root <evidence folder>]                                    # unlocked, writes summary.json|md
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
lane taking no further job. The three item kinds of `lib/items.mjs` have their own reserves (see "Bounded measurement
items").

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

## Estimate-vs-measured summary (IGP-07)

`summary.mjs` reads the published records under `docs/improve-generating/evidence/<label>/` (or `--root`), the invocation
logs of the label and `docs/improve-generating/clarifications.md`, and writes `summary.json` and `summary.md` into the same
folder. It exits 1 when a required record is missing and names the task. It generates, rates and times nothing, so it runs
unlocked (`plans/IGP-07.json`: the firewall snapshot, `summary.mjs`, the firewall check; the runner adds `--label` and
`--source-label`).

- **Rows.** One table with the estimate, the measured provisional value with its completion, its kind and formula, the record
  and the descriptive verdict of every row R00 to R33 of the check-list §5. The estimates are the table of §5 copied into the
  script; every measured value is read from a record. R09 is "later round".
- **Verdicts.** The rules are one table, `RULES` in `summary.mjs`, and `summary.md` prints it in its section "Verdict rules" so
  that the frozen round reproduces it. A time is **below both**, **between** (each analyst's value widened by 1.35) or **above
  both**, and **inconclusive** with fewer than three after-arm requests that reached ten in the matched cohort (check-list §5;
  a paired factor is printed with its n and is "no factor estimate" below n = 3). A stated range is **inside** or **outside**
  (with the margin to the nearer edge); a point value widened by 1.35 is **below**, **inside** or **above**; the screen
  certificate, the required agreement (R00), a hypothesis (R11) and the memory criteria (R26) **hold** or **fail**; a row that
  uses the unmeasured P7 is a **Projection**; a row without an estimate is "measured (no estimate)". R32 and R33 carry no
  verdict. The verdicts validate nothing: the report's midpoints are not gates.
- **R31** is a Projection: the after arm's T10 median of IGP-01 divided by the first-phase factor (E:F's, 1.01 for every cell;
  the smallest to the largest measured P6 x eight-worker factor is the range) and by P7's assumption (1.3; 1.1 to 1.8), with
  A:C's factors of today's search as references, and, for 14x14 and 12x12 Nightmare and Hell 1 26x26, the same Projection from
  the no-screen arm.
- **R23** takes the per-rating slowdown at eight workers from the journals of IGP-04's arms B and C (identical calls matched by
  key, as `compare.mjs` matches A and B), and names the machine from the record's `meta.machine`.
- **Machine time.** The counted time per task and per `<task>-dev` run, from the `invocations.jsonl` files of the label, and the
  unused remainder of the round (10,800 s less the counted total). Waits for difficulty-v3 beyond the 45 s quiet period are
  never counted.

## Re-run index (check-list §6)

The frozen round (after MP17, `improve-generating` on the frozen source) repeats every task with one command and then the
summary. Records go to `docs/improve-generating/evidence/frozen/`; nothing provisional is overwritten. `<label>` is the
source label given to the runner (`-SourceLabel`) and `<lock helper>` the path of the low-priority helper the orchestrator
names.

1. **Anchors (no lock).** `node tools\ig-proto\lib\tree.mjs check-edits --all` lists every anchored edit that no longer
   matches the source: the edits of `core/engine/clues.js`, `core/engine/generate.js`, `core/engine/policy.js` and
   `tools/calibrate.mjs` are expected to need new anchors after MP12b3, MP13a, MP14a and MP14b. **Anchor maintenance** is a
   maintenance change of `tools/ig-proto/variants/` made by the pack author (the manifest or the copy-only file edited, then
   `tree.mjs build ...` and `check-edits --all` repeated until nothing is listed, and the change recorded in the task's
   Execution log); a task's developer never does it. **Required before the frozen round** (the pack author's frozen-round
   maintenance, check-list §6 step 1): `identity.mjs` and `compare.mjs` report "different source" instead of failing when the
   source digest differs from MP12b1's. In the provisional round the source is MP12b1's, so a difference is a real failure and
   stays one. The plans of IGP-00, IGP-01, IGP-03 and IGP-04 run their own self-test steps.
2. **One command per task**, in the plan author's order (PM4, PM1, PM3, PM2):

   ```powershell
   pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-0N.json -Label frozen `
     -SourceLabel <label> -LockHelper <lock helper> [-IncludeOptional]
   ```

   | Task | Plan | Reads (records and arms of other tasks) | Writes (under `evidence/frozen/`) | Notes |
   |---|---|---|---|---|
   | IGP-00 | `plans/IGP-00.json` | none | `IGP-00/identity.json|md`, the arms `base` and `log` | see the note on MP12b1 below |
   | IGP-02 (PM4) | `plans/IGP-02.json` | none | `IGP-02/pm4.json|md`, `profiles-<case>.jsonl` | a certificate violation exits 1 |
   | IGP-05 (PM1) | `plans/IGP-05.json` | none | `IGP-05/pm1.json|md`, `families-<part>.jsonl`, `discoveries.jsonl` | the rest of tranche 1 needs the owner's approval (D-IG10) |
   | IGP-01 | `plans/IGP-01.json` | none (the plan builds its trees) | the arms `before` and `after`, `verify-after`, `compare.json|md` | then `node tools\ig-proto\compare-r2.mjs --task IGP-01 --label frozen` (the population record the summary reads) |
   | IGP-03 | `plans/IGP-03.json` | IGP-01's arms (`IGP-01/before`, `IGP-01/after`), IGP-02's `pm4.json` | the arms `w095`, `w380`, `w760`, `a3`, `verify-<arm>`, `budgets.json|md`, `compare.json|md` | pairs are task-qualified (`IGP-01/before:w095`) |
   | IGP-06 (PM2) | `plans/IGP-06.json` | none | `IGP-06/pm2.json|md` | |
   | IGP-03h | `plans/IGP-03h.json` | IGP-01's arms, IGP-03's `w760` arm, IGP-02, IGP-05 | the arms `w760` and `main`, `verify-w760`, `verify-main`, `compare.json|md`, `c5/compare.json|md` | `-IncludeOptional` for the Hell 1 20x20 and the extra 12x12 seeds; the `main` arm must reproduce IGP-01's after arm on the seeds both ran |
   | IGP-04 | `plans/IGP-04.json` | IGP-01's after arm (arm E must reproduce it) | the arms `A`, `B`, `C`, `E`, `F`, `verify-<arm>`, `compare.json|md` | a difference between E and IGP-01's after arm stops the task |
   | IGP-07 | `plans/IGP-07.json` | every record above | `summary.json|md` | `node tools\ig-proto\summary.mjs --label frozen` does the same without the runner |

   The plan author may change the order and the sample sizes of the frozen round (the plans carry the reps; a frozen plan may
   widen them) with the round's own budget; the dependencies in the table are the only ones.
3. **Summary.** `node tools\ig-proto\summary.mjs --label frozen` (or the IGP-07 plan through the runner).

On the frozen source the "before" arms measure the frozen `gen-v3` and MP12b1 is a different source (check-list §6; the
required step 1 above). `summary.mjs` already reports R00 as "different source" when `identity.json` says the source digest
is not MP12b1's (`meta.source.equalsMp12b1Source`). Cells come from the frozen catalogue `data/boards-v1.json` (never
rewritten silently: `boards.mjs write` refuses an existing file unless `--replace` is given on the pack author's
instruction); a cell the frozen source no longer offers runs as a "diagnostic offer" (D-IG13) and is labelled so.

### The `compare.mjs` options of IGP-03 and IGP-03h

- `--pairs <before>:<after>[,...]` with `<arm>` of `--task` or `<task>/<arm>`. Arms of different tasks are paired by seed
  (matched seeds only) and by role (the variant), never by tree id: `IGP-01/before:w760` pairs IGP-01's before arm with this
  task's `w760`. A task-qualified arm makes the run a study (per-W, population, split (R33), shift, offset, 26x26 Master and
  arity-3 sections); an arm of a P6 or eight-worker variant makes it a factor study (IGP-04).
- `--pm4 <task>` and `--pm1 <task>` name the task whose `pm4.json` or `pm1.json` the study reads: PM4's cost by clue offset and
  per-W figures, and PM1's windows beside an arm-only cell.
- **Arm-only section.** A cell of the task's own arms that no pair covers (a cell without a before partner, Hell 1 20x20 in
  IGP-03h): per request the outcome, T1, T10 or the response, the accepted puzzles' population and offsets, the locate probes
  and the first in-band profile per call, MP12b1's outcome (a prescreen that made no set) and, with `--pm1`, PM1's windows on the
  same cell.
- **Screen against no screen by seed** (`screenBySeed`): over every arm of the roles `main` (190 M, 380 M on Hell) and `w760` (no
  screen) of every pair, with the per-seed T10 ratio, the same-set clue shift and today's MP12b1 record. A seed that two arms of
  one role both ran must give equal puzzles (`resultDigest`), else the run exits 1.
- `--reproduce <arm>:<task>/<arm>` runs no pairs: the first arm's puzzles must equal the reference arm's on every seed
  (`resultDigest`, set key, puzzle keys); it prints `puzzles equal` or `DIFFERS (<note>)` per seed and exits 1 when any differs
  (IGP-04: arm E against `IGP-01/after`; IGP-03h: `main` against `IGP-01/after`).
- `--common-seeds`, with `--reproduce`: only the seeds both arms ran are compared; the seeds the reference never ran are listed
  as not compared and do not fail (IGP-03h's `main` runs reps 2 to 5, IGP-01's after arm reps 0 to 2).
- `--out-dir <folder>` writes `compare.json|md` to that folder instead of the task's evidence folder (IGP-03h's `c5/`).

## Frozen source (task pack v4)

The frozen round of `tasks/improve-generating-v4/` measures the difficulty-v3 merge `3fc65f4`, whatever later commits
change in the working tree (D-V4-01). The harness reads that source from a verified snapshot folder, never from the
worktree, whenever it runs with `--label frozen`.

- **The snapshot** is `tests/artifacts/ig-proto/frozen-source/` (git-ignored): `core/`, `tools/` and `package.json` of
  `3fc65f4`. The developer extracts it once with read-only git (D-V4-12; the harness runs no git) into the absent
  folder, and records its hash manifest, the committed evidence
  `docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json` (hash rule `lf-text`: SHA-256 of every text
  file with LF line ends, of a file with a NUL byte as it is, so the manifest does not depend on the line endings of the
  extraction; entries sorted by path, and the digest of that list). From the repository root:

  ```powershell
  $dir = 'tests\artifacts\ig-proto\frozen-source'
  $manifest = 'docs\improve-generating\evidence\frozen\V4-T01a\snapshot-manifest.json'
  if ((Test-Path $dir) -and (Test-Path $manifest)) {
    node tools\ig-proto\snapshot.mjs verify
    if ($LASTEXITCODE -ne 0) { throw ('STOP: the snapshot differs from its manifest (exit ' + $LASTEXITCODE + '); report the output') }
  } elseif (Test-Path $dir) {
    throw 'STOP: an unverified snapshot folder exists without its manifest; report it; do not reuse, merge or delete it'
  } elseif (Test-Path $manifest) {
    throw 'STOP: the manifest exists without its folder; report it'
  } else {
    New-Item -ItemType Directory -Force -Path 'tests\artifacts\ig-proto' | Out-Null
    git archive --format=zip -o 'tests\artifacts\ig-proto\frozen-source.zip' 3fc65f4 core tools package.json
    if ($LASTEXITCODE -ne 0) { throw ('STOP: git archive exited ' + $LASTEXITCODE) }
    Expand-Archive -Path 'tests\artifacts\ig-proto\frozen-source.zip' -DestinationPath $dir
    Remove-Item 'tests\artifacts\ig-proto\frozen-source.zip'
    node tools\ig-proto\snapshot.mjs record
    if ($LASTEXITCODE -ne 0) { throw ('STOP: snapshot record exited ' + $LASTEXITCODE + '; the folder stays unverified') }
    node tools\ig-proto\snapshot.mjs verify
    if ($LASTEXITCODE -ne 0) { throw ('STOP: snapshot verify exited ' + $LASTEXITCODE) }
  }
  ```

  The folder is created from an absent folder or verified against its manifest; an unverified folder stops the work and is
  never merged into, overwritten or deleted without the pack author's ruling.
- **`snapshot.mjs record | verify`** (no git). `record` hashes the folder into the manifest once and refuses
  (`snapshot: the manifest exists`, exit 1) when the manifest exists. `verify` re-hashes the folder and prints
  `snapshot: verified (<n> files)` (exit 0), or the first ten missing, extra or changed paths (exit 1); it refuses a
  manifest whose `hashRule` is not `lf-text` (`snapshot: the manifest's hash rule is not lf-text`, exit 1). `--help` or no
  argument prints the usage (exit 0); any other argument prints it and exits 2. The module loads without the folder and
  without the manifest; `verifySnapshot()` and `compareSnapshot(entries, manifest)` are what the tree builder and the
  self-test call.
- **`--label frozen` is the only selector.** In a process started with it, `lib/paths.mjs` sets `SOURCE_KIND` to
  `frozen` and `sourceRoot()` is the snapshot (it throws `frozen source missing: run the snapshot step of V4-T01a` when
  the folder is absent). `sourceDigest()` and `sourceVersions()` (`lib/records.mjs`) then read the snapshot; the `meta`
  block of every record gains `source.kind`, `source.frozenCommit` and `source.equalsFrozenSource`, its label text is
  `frozen (3fc65f4)` and the Markdown banner starts **Frozen source** `3fc65f4`. `tree.mjs` verifies the snapshot against
  its manifest before it collects a source (a differing folder stops it: `frozen source differs from its manifest`),
  builds under `tests/artifacts/ig-proto/tree-frozen/<variant>/` and requires `base`'s `copyDigest` to be the benchmark
  digest of `3fc65f4`, `e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b` (`FROZEN_DIGEST`):

  ```powershell
  node tools\ig-proto\snapshot.mjs verify
  node tools\ig-proto\lib\tree.mjs build base instr log --label frozen
  node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen
  node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T03   # ten cases (T01a's six, T01b's three, T03's one), unlocked
  ```

  The worker-thread modules do not read the label: a worker receives its tree in `workerData.treeRoot`, and the
  tree is built from the selected source. `lib/sets.mjs` takes the offer of a cell from that tree's engine (see
  "Source-dependent imports (V4-T01b)").
- **The `frozen` label has a round cap of 0.** `budget.mjs decide` takes the round's cap from `roundLimitS(label)`: 0 s for
  `frozen`, 10,800 s for `provisional`, each raised by an approval. Every locked frozen step therefore stops (exit 4)
  unless the runner gets `-ApprovedRoundMinutes <n>` from the orchestrator (D-V4-02); the cap is cumulative over the
  frozen round.
- **Provisional commands behave as before.** With `--label provisional`, or no label, every tool reads the worktree,
  writes its trees under `tests/artifacts/ig-proto/tree/<variant>/` and keeps the 10,800 s round cap.

### Source-dependent imports (V4-T01b)

Under `--label frozen` every source-dependent value comes from the frozen source, also inside worker threads. A worker
receives `treeRoot` in `workerData` and does not inherit `--label frozen` from the process arguments, so no module a
worker loads (`lib/lane-worker.mjs`, `lib/calls.mjs`, `lib/sets.mjs`, `lib/engine.mjs`, and the two modules the lane worker
loads for the stage-1 item kinds, `lib/ledger.mjs` and `lib/packs.mjs`; V4-T04c) may read `SOURCE_KIND`, call
`sourceRoot(` or import from `../../../core/` (a self-test case checks their text).

- **Offers.** `carveSet` (`lib/sets.mjs`) sets `offeredInSource` from the engine it carves with: `area` inside
  `engine.levels.level(levelId).areas`, with a non-empty piece-count range. The engine is loaded from a tree and a tree
  is built from the selected source, so the area interval is that source's `AREAS`. The tree's own policy still chooses
  the piece counts, so the `instr` tree's diagnostic offers (D-IG13) carve a cell the source does not offer and report
  `offeredInSource: false`; the `base` tree answers `not-offered` for it.
- **Identity.** `identity.mjs` reports a pair with `mp12b1` on a source other than MP12b1's as level `different-source`
  with `sameResult` (no problem found by the comparison), listed as `different source, same result` or `different source,
  other result`. A seed MP12b1 did not run is a failure only under `provisional`; otherwise its runs start without
  `mp12b1` and the arms are compared among themselves. `pairResult(nameA, runA, nameB, runB, sameSource)` is the pair
  rule.
- **Receipt.** `node tools\ig-proto\receipt.mjs --label frozen --source-label "frozen 3fc65f4"` (unlocked) writes
  `docs/improve-generating/evidence/frozen/V4-T01b/receipt.json` and `receipt.md`: the verified snapshot with its manifest's
  files and digest, the frozen commit, the computed and the expected source digest, the versions, the anchored edits of
  every variant, the catalogue cells the frozen source no longer offers (`notOffered`, `added`, `differs`; the 25 Hell
  cells at `3fc65f4`) and the audit below. It exits 0 when the snapshot is verified, the digest equals `FROZEN_DIGEST`
  and no variant has an edit error; another label exits 1.
- **Audit.** Every static import in `tools/ig-proto/**/*.mjs` from outside `tools/ig-proto/`:

  | Module | Import | Class | Frozen-label handling |
  |---|---|---|---|
  | `lib/records.mjs` | `computeSourceDigest`, `currentVersions`, `APP_VERSION` | source-dependent | read from `sourceRoot()` (T01a) |
  | `lib/sets.mjs` | `pieceCountRange` | source-dependent | removed; the engine's own `levels.js` (step 1) |
  | `boards.mjs` | `buildLandscapeMatrix` | source-dependent | provisional tool; the frozen catalogue check is `receipt.mjs`'s, from `sourceRoot()` |
  | `budgets.mjs`, `compare-r2.mjs`, `compare.mjs`, `fit-prior.mjs`, `identity.mjs`, `pm2.mjs`, `pm4.mjs`, `summary.mjs` | `median`, `percentile`, `summarize` | harness statistics | none needed: pure arithmetic, not part of a measured source |
  | `self-test.mjs` | `SOURCE_FILES`, `checkText` | harness checks | none needed: a guard of the harness and the convention checker |
  | `lib/records.mjs` | `checkText` | harness check | none needed |

  The search that lists them, at any depth (`lib/*.mjs` reaches the root with `../../../`; a line the table does not
  name is a question for the pack author). At V4-T01b it finds twelve lines, all in the table; dynamic imports are
  tree- or `sourceRoot()`-based:

  ```powershell
  Select-String -Path tools\ig-proto\*.mjs, tools\ig-proto\lib\*.mjs -Pattern "from '(\.\./)+(core|generator|player|bench|record-fixtures|check-conventions|calibrate|node-worker|serve)"
  ```

### PM1 inventory (V4-T03)

`node tools\ig-proto\pm1-inventory.mjs --label frozen --source-label "frozen 3fc65f4"` (unlocked; any other label exits 1)
reads the provisional records `docs/improve-generating/evidence/provisional/IGP-05/families-failed-sets.jsonl`,
`families-scan.jsonl` and `families-windows.jsonl`, never rewritten, and writes `inventory.json` (the `meta` block, the
totals, the alternate rows, the populations, the four facts of IG-P-Q24 and the inputs with their SHA-256 over LF line
ends) and `inventory.md` in `docs/improve-generating/evidence/frozen/V4-T03/`. An alternate row is a rated probe whose
score `levelForScore` of the frozen `core/engine/levels.js` reads as a Hell level other than its family's, and
`offeredAtFrozen` comes from that file's `offeredLevels`. It rates, generates, counts and replays nothing, so it runs
without the lock, and it opens no route: Hell 2 and Hell 3 stay closed (IG-P-D6). It exits 1 when one of the four facts
is not found.

## The `gen-v4` prototype on the frozen source (task pack v4)

`variants/v4.json` (chain `base>instr>log>v4`, with the copy-only file `variants/files/v4/core/engine/ig-select-v4.js`)
rebuilds the prototype as a fork of the frozen `selectClues` (V4-T02a). The provisional `p1p5` prototype replaced
`selectClues` wholesale and, on the frozen source, returned no `skips` at its first accepted candidate (drift DR-O08);
the `p1p5*` variants, `ig-select-proto.js` and `ig-log.js` stay as they are.

- **The fork.** `selectCluesV4` is the shell of the provisional `igSelectProto` (`startCall`, `withP6`, `endCall`);
  `searchV4` keeps the frozen text of `clues.js:257-773` for the destructuring of the context, the two `RangeError`
  checks, `rateWith` (the `ctx.rate` seam and the recorder's `rateDetailed`), the skip replay (`subsetSkipped`,
  `repairSkipped`, `verifyConsumed`, `SkipReplayError`), `finish` (the repairs and their events), `conclude`,
  `finishOnce`, `central`, `chooseBest`, `afterProfile`, `sample` and `neighbours`. It adds P1 (phase A: the locate on
  one nested family with the rescue), P2 (the screen `W` and its certificate: a screened run whose main-phase work is at
  most `W` is the canonical rating, a run above it is screen-capped, steers only and is never accepted), P3 (a
  screen-capped profile reads as "too few clues") and P4 (the table prior; `step0` is 1 with a prior, `U0` without). The
  result has the frozen `skips` and `igWindow` (`c0`, `wc`, `hit`, `hiBelow`, `loAbove`, `probes`, `result`, `proof`).
  Every rating attempt goes through `rateOnce`: one `charge`, before any event; a repair's re-rating is a canonical
  attempt journaled as phase `repair`.
- **Dispatch (D-V4-03).** The copy's `selectClues` (edit `v4-2`) sends a target with `min` from `bandEdge(6)` to
  `bandEdge(8)` (53 to 111: Nightmare and Hell 1, `v4Target`) to `selectCluesV4`. Every other target (below Nightmare,
  Hell 2 from 112, Hell 3) keeps the frozen search: directly when a recorder (`ctx.record`) is set, so that the frozen
  search keeps its native detailed path (the logging seam is never installed over it, RV1-04), through `igDispatch` (the
  journal) otherwise. An explicit `ctx.rate` seam keeps its priority in both routes and on the screened path (RV2-19).
- **Variants.** `v4` (`W` 190,000,000, `priorTable` `prior-v1` from `data/prior-v1.json`, `screenTable` `w190`, `U0` 8,
  `rerateMax` 4), `v4-w760` (`W` 760,000,000, the canonical limit: no screen, `screenTable` `none`), `v4-w095` (`W`
  95,000,000, `w095`) and `v4-w380` (`W` 380,000,000, `w380`). The last three differ from `v4` by parameters only and
  have their own `treeId`; the chain of each is `base>instr>log>v4>...`.
- **Journal phases** (the `ig-log.js` tuples and `phase` lines): `locate`, `rescue`, `window`, `p2` (the seed phase: the
  journal keeps the prototype's name, which `compare.mjs` reads), `beam`, `rerate` and `repair`.
- **Events (D-V4-06).** The frozen kinds only (`rated`, `unrateable`, `rejected`, `skip`, `repair`, `selected`). The event
  `phase` is `locate`, `window`, `seed` (the frozen name of the journal's `p2`), `beam`, `rescue` or `rerate` (T08 adds
  `close` and `below`). The `unrateable` reasons are `path-capped` (the canonical cap) and `screen-capped`. A re-rating
  event carries the `sequence` of the probe it re-rates. A rated or rejected event has the detail of its own measurement
  whenever a recorder is set and no synthetic seam (`ctx.rate`, `ctx.igScreen`, `ctx.igCanonical`) replaces the rating.
- **Ordinals (D-V4-04).** One subset-ordinal sequence: every `rateSubset` call takes the next ordinal in call order; a
  repeated subset and a re-rating take none. `SKIP_BOUNDS_V4` is `{ subsets: 2192, repairs: 64 }`, the frozen 2,128 and
  64 more. For any set of at most 128 pieces phase A has at most 27 `side` calls of at most two ordinals each, plus at most
  two for T08's (c4) probe (56 in all), and phases B, C and D use at most the frozen 2,128, so every ordinal is below
  2,184; a larger input makes the assertion in `rateSubset` fail the call (`ig-select-v4: subset ordinal ... reaches the
  bound`), never a silent overflow.
- **Detail export.** Edit `v4-3` appends `igRateDetailedWithLimits(board, pieces, clues, ws, limits)` to the copy's
  `difficulty.js`: the rating and its `detail` from the same measurement (`measureV3Core` with `keepDetail`, no second
  solve). With a recorder the screened path uses it; a screened run that passes the certificate is the canonical
  measurement, so its detail is the canonical detail, and a screen-capped run has no rating and no detail.
- **Work ledger (review R2-14).** `ig-select-v4.js` journals count work itself, on the file and row naming of `ig-log.js`,
  whether or not a caller has a `charge`: a `{ "t": "caps", "call", "count": true }` line right after the `start` line, and
  one `{ "t": "count", "call", "units" }` line per uniqueness count of a repair (`units` is what `charge` receives, the row
  trials). The `end` line's `locate.countWork` is the sum of the units of the call, and `locate.tables` is `{ prior,
  screen }` of the variant's parameters (`priorTable`, `screenTable`; null when absent). The legacy route has the same
  lines with `call: null` (edits `v4-2` and `v4-4`), and its ratings are journaled by `igDispatch` when no recorder is set.
- **Self-test.** The `--v4` group (T02a onwards) runs only the cases of the gen-v4 prototype and runs through the lock
  helper, as a later task's cases run real uniqueness counts and deductions:

  ```powershell
  node tools\ig-proto\lib\tree.mjs build v4 v4-w760 v4-w095 v4-w380 --label frozen
  node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen
  . 'C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1'
  Invoke-IgNode -Repo pentomino -Task 'V4-T02a verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T02a')
  ```

### Provenance of the `gen-v4` prototype

The edits `pv-1` to `pv-17` of `variants/v4.json` (V4-T02c, inherited by every `v4`-family arm) give the prototype the
provenance contract of plan 5.1 (IG-P-Q34, IG-P-Q36) that phase 2 ports to production (N-V4-07). They are copy-only
edits of `version.js`, `generate.js`, `pack.js` and `replay.js` of the trees; no production file changes.

- **Algo id (D-V4-05).** Each tree has its own experimental id, `gen-v4-proto:<variant id>` (`ALGO_ID` is built from
  `IG.variant`): `gen-v4-proto:v4`, `gen-v4-proto:v4-w760`, `gen-v4-proto:v4-w095`, `gen-v4-proto:v4-w380` and, from
  V4-T05, `gen-v4-proto:v4-ps`. A receipted variant is never edited: a changed configuration is a new variant id, of at
  most 40 characters. The `log` tree and the trees below it keep `gen-v3`.
- **Seven keys.** `provenanceVersions()` of a `v4`-family arm has today's five keys (`algo`, `policy`, `rng`,
  `seedScheme`, `ratingModel`) and `priorTable` and `screenTable`, the variant's `params.priorTable` and
  `params.screenTable` (`'none'` when absent; `v4-w760` has `screenTable` `none`). Every other tree has exactly the five.
- **The family.** A record is `gen-v4` exactly when its `versions.algo` is the production id `gen-v4` or matches
  `gen-v4-proto:<variant id>` (1 to 40 characters from `a-z`, `0-9` and `-`, the first a letter or a digit). Every other
  algo string, `gen-v40` and `gen-v4-proto:` included, keeps the five-key reader and the `gen-v3` bounds.
- **`igPrior`.** A `gen-v4` candidate entry of `generation.made` has the field `igPrior` after `skips`: null (the
  table prior of its `priorTable` is used) or an integer from 1 to 128 (the per-set prior of the request,
  `BatchContext.igPrior`). The arm `v4-ps` (V4-T05; see "The per-set prior (V4-T05)") adds the transport that sets it;
  every other `v4`-family arm has `igPrior: null`. Replay passes a recorded integer `igPrior` to the candidate's request.
  A `gen-v3` candidate has no `igPrior`; a calibration or completion entry has none either.
- **Per-algo shape and bounds.** The reader checks the shape of the record's own algo: a `gen-v4` `setOrigin` and
  candidate have the seven version keys and a `gen-v4` candidate the eleven keys of its entry; a `gen-v3` record has the
  five version keys and the ten keys of today. A `gen-v4` record's subset ordinals are below 2,192 and its repair
  ordinals below 64 (D-V4-04); a `gen-v3` record keeps 2,128 and 64. The 64-entry subset list and the 16-entry repair
  list limits stay for both.
- **Load and save.** The reader copies the keys of the record's own shape, so a valid record of either shape survives a
  `validatePack`, a `serializePack` and a `parsePack` unchanged; a record of the wrong shape (for example `igPrior` on a
  `gen-v3` entry, or a `gen-v4` entry without it) is dropped with a `provenance-ignored` warning, as today.
- **Comparison and replay.** The replay's version comparison includes `priorTable` and `screenTable` (both undefined on
  a `gen-v3` pair, so that comparison is unchanged). A record of another arm, of another prior or screen table, or of
  `gen-v3` is "unavailable" before any skip is applied and before any work (`set-versions` for the set record,
  `record-versions` for the candidate record, `work` 0).
- **Frozen readers.** The `base`, `instr`, `log` and `p1p5*` trees keep the five-key reader: they drop a `gen-v4`
  record with a warning.
- **Self-test.** The four cases `v4: provenance versions per arm`, `v4: provenance reader by the record's own algo`,
  `v4: old and new records load and save` and `v4: version and table refusal before any work` run in the `--v4` group
  (through the lock helper, task id `V4-T02c`); the replay fixture `tests/fixtures/replay-case.json` is read, never
  written.

### Begin lines and bounds (V4-T02d)

IG-P-Q37 (D-V4-17): a worker killed inside a rating or a uniqueness count leaves that primitive's work unreported, so
the work condition of rule (c5) is judged on bounds. Before every rating and every uniqueness count of a `gen-v4` call
`ig-select-v4.js` journals one line, `{ "t": "begin", "call", "kind", "bound" }`, with `appendFileSync` (it survives the
kill). The line is an observer: no result, charge, skip ordinal or control flow changes (the case `bound: the journal
changes no result` runs a call with and without a journal).

- **Kinds.** `screen` (a rating under the lowered limit `W`: the locate, window, seed and beam probes), `rate` (a
  canonical rating: the re-ratings of the rescue and of phase E, the repairs' re-ratings, and every probe of an arm with
  no screen) and `count` (a uniqueness count of a repair). The completion line (`p` or `count`) follows the begin line at
  once; a begin line without one is the one open primitive of a killed call. A repair writes `count` before
  `makeUnique` and again from its `onAdd` hook whenever another count follows (the list has at most `pieces.length - 2`
  clues), so every `count` line has its begin line.
- **A count's bound** is the `rowLimit` passed to `makeUnique` (`countRowLimit(board)`): the DLX solver tests
  `rowTrials >= rowLimit` before each increment, so a count charges at most that many row trials.
- **A rating's bound**, `igRatingBound(board, pieces, clues, limits)`, is `setup + limits.work + limits.census + 2 (P +
  U)`: `measureDeduction` compares its work with the limit only at checks (every ladder and closure pass, R7 before each
  `reachable`, the search before each alternative, the census probes), so a rating overshoots by at most one stretch `P`
  between two checks (every rule of the ladder once: `select`, R1 to R9, `fewestColumn`, `listRows`) and one full unwind
  `U`, after the search's last passing check and again after the census's. The terms come from upper bounds of the
  model's sizes that need no enumeration: `NC` free cells (active cells less the clued pieces' cells), `NP` free pieces,
  `Tsz` their total size, `L` the largest free piece's size plus 1, `C = NC + NP`, `R = 8 NP NC`, `NZ = 8 NC (Tsz + NP)`
  and `K = 8 max(Tsz, NC)`. The limits are `screenLimits.deduce` (work `W`) for `screen` and the canonical `DEDUCE` for
  `rate`. The formula and the derivation of each term are in the task V4-T02d, with the R9 term of review 4. A bound's
  magnitude is not a claim of feasibility: with no clue it is about 1.13 G units on a carved 10x10 Nightmare set and
  shrinks with every clue; its width is reported from the stage-2 journals (T09e).
- **The work ledger** that reads these lines (`lo` and `hi` per call, the one open primitive of a terminated call) is
  T09c's; this task only writes them.
- **Test seams.** The bound describes the native rating path. Under a test seam (`ctx.rate`, `ctx.igScreen`,
  `ctx.igCanonical`) a begin line keeps its kind and bound while the seam rates as it likes, so such lines prove
  nothing; no measured row sets a seam, so only self-test journals carry them.
- **Self-test.** `v4Call(name, spec)` accepts `spec.uniqueness` (default `any`) and `spec.journal` (default `true`;
  `false` makes the folder but leaves `IG_LOG_DIR` and `IG_ROW` unset) and returns `files`, the journal files written. The
  three cases `bound: every primitive is announced`, `bound: no real rating exceeds its bound` (30 real ratings of the
  K = 15 set at small limits, one of them reaching the census overshoot: a sanity check on real charges, not a proof) and
  `bound: the journal changes no result`
  run in the `--v4` group (through the lock helper, task id `V4-T02d`).

### P5 call budget (V4-T07a)

P5 makes a `gen-v4` call end by its work, not by the clock: `ig-select-v4.js` meters every unit `charge` receives (the
main plus census work of every rating, the row trials of every uniqueness count) and stops the call when the budget is
spent. The budget is `ctx.igBudget` when set, else `callBudgetOf(IG.callBudget, target)`: the table's value for the
target's level id, else its `default`, and infinite (never stops) without a table or a positive number, so every arm
without `IG.callBudget` (every arm of this pack until T07b's `v4-p5`) behaves as before and the metering only observes.

- **Checks.** Before every rating (search, re-rating and repair ratings, as the first statement of `rateOnce`, before
  its begin line), before the first count of a repair (before its begin line) and before every further count (in the
  `onAdd` hook of `makeUnique`, before its begin line). A stopped primitive writes no begin line (IG-P-Q37), so a
  journal has as many `begin` lines as `p` and `count` lines. The check is `spent >= budget`: the running primitive
  finishes and is charged in full (the overshoot is recorded), and after exhaustion no operation starts.
- **The end.** The search catches the stop at its top level. With `uniqueness: 'require'` the result is the best
  already finished final result of the finals cache (the existing centre and tie order, no new work: `chooseBest` is
  not called, because it would repair). With `uniqueness: 'any'` the result is `chooseBest()`, which does no work in
  that mode (`finish` returns the raw subset: no rating, no count, no rng draw), so the call ends with its best
  waiting in-band candidate (plan P5: "the call ends with its best result"; review R10: "if it can perform new work";
  V4-T07b). Without a result the call ends `{ ok: false, reason: 'not-in-band' }`. A repair interrupted by the stop is
  never accepted (its candidate stays unfinished), no event records the budget end (the event kinds stay those of
  D-V4-06; an `any` result is announced by its `selected` event, as every result is), and the skip verification and
  the observers' exceptions are kept (`verifyConsumed()` runs before either result).
- **Journal.** The `end` line's `locate` block has `spent` (the units metered, always) and, only when the budget ended
  the call, `budgetStop: { limit, spent, overshoot }` (`overshoot = spent - limit`). The `count` lines and
  `locate.countWork` are T02a's and T02d's and keep their meaning.
- **Seams** (self-test only): `ctx.igBudget` (a number) replaces the table; `ctx.igChargeKinds` (an array) receives one
  kind per metered unit, `rate:<journal phase>` (`rate:locate`, `rate:window`, `rate:p2`, `rate:beam`, `rate:rescue`,
  `rate:rerate`, `rate:repair`) or `count`.
- **Self-test.** `v4Call(name, spec)` also accepts `spec.extra` (merged last into the context; `extra.charge: true`
  installs a `charge` that logs its units) and returns `chargeLog` and `kinds` (`extra.igChargeKinds`). The three cases
  `p5: call budget stops deterministically`, `p5: budget sweep (S1, S2)` (budgets at the prefix sums of the unbudgeted
  charge log: the charge log and the kinds of each run are the unbudgeted prefix) and `p5: budget end with unfinished
  candidates, every observer mode` run in the `--v4` group (through the lock helper, task id `V4-T07a`).

### P5 bounded set attempts (V4-T07b)

A set request whose first attempts all end without a window on the same side stops with a notice that names the side,
instead of running to the clock (plan P5, review RV1-09). The mechanism exists only in the pilot arm `v4-p5`
(`variants/v4-p5.json`, an extension of `v4-link`); today's search and every other arm keep P-OD12 ("no fail-fast in
`gen-v3`"): only `selectCluesV4`, that is, Nightmare and Hell 1 targets, reports a side, so a legacy target never meets
the bound.

- **The side.** When `IG.setAttemptsBound` is set, `failNoWindow` of `ig-select-v4.js` returns `{ ok: false, reason:
  'not-in-band', igNoWindow: 'below' | 'above' }` (`'below'` for a bracket that marched down to one clue, `'above'`
  otherwise); without the parameter the result is the T02a one and the field is absent (D-V4-05: the existing `v4` arms
  are unchanged, and the journaled result is unchanged in both). Edit `p5-1` makes the set attempt (`setAttempt` of
  `core/engine/generate.js`, which a worker runs for one attempt; `firstSetAttempt`, its serial loop, sees the same
  reason) report `no-window-below` or `no-window-above` instead of `not-in-band` when it meets the field; every other
  reason is untouched, so a failure of any other kind, or of a legacy target, never counts.
- **The bound.** `igSetBound(results)` (edit `p5-3`, an export of the copy's `core/browser/generation-client.js`) returns
  the common `no-window-<side>` reason when the attempts 0 to `IG.setAttemptsBound - 1` have all resolved as `fail` with
  that same reason, else `null`. Edit `p5-2` calls it in `generateSet` after the cancel and deadline checks and before
  the ordered winner scan, so that the outcome cannot depend on the order the attempts finish in: an attempt beyond the
  bound that finishes early cannot win at one pool width and lose at another. When it fires the request ends `{ status:
  'failed', reason: 'no-window-<side>', failures }`; a success or any other failure among the first attempts, or two
  different sides, leaves the request as today.
- **The pilot values** are the pack author's (D-V4-13); stage 2 fits the table and stage 3 freezes it (N-V4-03): a call
  budget of 2,000,000,000 units for every Nightmare and Hell 1 call (R21: 5 % of successful prototype calls passed 2 G,
  none 6 G) and a bound of 4 set attempts (the four-worker pool's first wave).
- **False stops** (a request the bound ends although a later attempt would have produced a set) are counted by T09d
  against the uncapped arm (IG-P-D1, plan section 9); this task only builds the mechanism.
- **Test-only trees.** The frozen `core/browser/worker-pool.js` has `MAX_POOL_SIZE = 4` and `createPool` rejects a larger
  size, so the width-8 cases run in `v4-p5-w8-test` and `v4-link-w8-test` (`extends` the tree and `w8`, one added edit
  `w8-1`); they are never an arm or a plan step, and no production limit or default changes.
- **Self-test.** `lib/fake-pool.mjs` ports the scripted pool of `tests/generation-client.test.js` (`harness(createPool,
  options)` takes the tree's `createPool`). `scriptedSet(variant, width, script)` runs one set request on the pool and
  client of one tree, loaded by file URL (the `-w8-test` tree for width 8): a `setAttempt` task is answered at once when
  `script[attempt].now` is true and held otherwise, then the held task with the lowest attempt is answered until the
  request resolves; `atEveryWidth` runs a script at the widths 1, 2, 4 and 8, checks the expected outcome and that the
  first wave dispatched `width` attempts, and that the outcomes are equal. The nine cases of the `--v4` group
  (`p5: no-window side` to `p5: budget end in any mode returns the best waiting candidate`) run through the lock
  helper, task id `V4-T07b`; `p5: a budget-stopped call replays its skips` proves that a call ended by its budget with
  a finished final result replays its recorded skips to the same result and still refuses an unused skip ordinal. That
  final exists because the 4-clue hit is central, so its repair is finished at once (`uniqueness: 'require'`), and the
  repaired rating (56) is in the band but not central, so the call goes on until the budget ends it in the middle of a
  later repair. `p5: budget end in any mode returns the best waiting candidate` cuts T07a's S2 call in `any` mode at
  every point of its unbudgeted run: the charge log is the unbudgeted prefix, the result is the best waiting in-band
  candidate (or `not-in-band` when none waits), and its `selected` event names a waiting candidate. T07a's case `p5:
  budget end with unfinished candidates, every observer mode` also asserts, in the record mode, that no event of kind
  `repair` was recorded (a repair the budget stopped records nothing).

## Bounded measurement items (task pack v4)

`lib/items.mjs` (V4-T04a; reviews R05 and RV2-01; D-V4-14) is the runner every later measurement of the frozen round
shares: a list of items, each run in a supervised lane worker (`lib/lanes.mjs`), journaled before it starts and when it
ends, and never rerun once it has ended. It measures nothing itself; the three stage-1 item kinds (V4-T04b) are
described in "Stage-1 item kinds" below.

- **An item** is `{ id, kind, variant, payload }`: a stable id (unique in the list), the lane job kind, the variant
  whose tree runs it and the job's own fields (the item's `kind` wins over a payload key `kind`). Consecutive pending
  items of one variant and kind form a group that
  shares one set of lanes (`v4-select` and `v4-replay` 2 lanes, `v4-generate` 1 because its pool has 1 worker, every
  other kind, the test kinds included, 1). `runItems({ task, step, label, horizonS, items })` writes
  `tests/artifacts/ig-proto/<label>/<task>/<step>/items.jsonl` and `state.json`.
- **The identity** is `{ frozenCommit, sourceDigest, treeIds, harnessHash, manifestHash }` (`itemIdentity`): the frozen
  commit, the source digest, the tree id of every variant of the list (keys in sorted order), the harness hash and the
  hash of the item list (`manifestHash`: id, kind, variant and payload of every item). It holds only the experiment's
  inputs, never an invocation's remaining time. `identityHash` is the SHA-256 of its JSON text.
- **The item log** has three line shapes, every one with the run's `identityHash`, ISO text in `at`, one append each,
  written only by `logStart`, `logSpawn` and `logEnd` (the item-log writers of T10b and T10c use the same helpers):

  ```json
  { "type": "item-start", "identityHash": "...", "item": "<id>", "kind": "...", "variant": "...", "at": "..." }
  { "type": "item-spawn", "identityHash": "...", "item": "<id>", "pid": 1234, "at": "..." }
  { "type": "item-end", "identityHash": "...", "item": "<id>", "status": "completed|censored|error", "result": {}, "ms": 0, "at": "..." }
  ```

  `item-start` is written before dispatch (before a child process is spawned), `item-spawn` at most once, for a runner
  that spawns a child (lane workers write none), and `item-end` once. The status is `censored` for the outcome
  `censored` (the parent cut the item at `H - 15`), `error` for `error` and `defect`, else `completed`. A reader
  accepts no line without the run's `identityHash`, terminal lines included.
- **The state** (`state.json`, rewritten at the end of every invocation that did not refuse): `format`, `version`,
  `task`, `step`, `label`, the `identity`, `done` (every item has an `item-end`), `items: { done, total }` and
  `lastInvocation: { start, end, seconds, horizonS, progress: { items, verified } }`: `items` counts the `item-end`
  lines this invocation wrote, `verified` is 1 when no item was pending (a finished step resumes as a pure
  verification). `run-task.ps1` reads `done`, `lastInvocation.start`, `lastInvocation.seconds` and the sum of the
  `progress` values.
- **Resume rules** (`resumePlan`, pure; in this order, the first that fails refuses; log lines count from 1):
  1. two items with one id: `duplicate item id <id>`;
  2. the earlier state's identity differs from today's in a field (order `frozenCommit`, `sourceDigest`, `treeIds`,
     `harnessHash`, `manifestHash`): `identity mismatch (<field>)`;
  3. a line without the run's `identityHash`, or with another: `identity mismatch (log line <n>)`;
  4. a line of another type: `unknown log line <n>`; a line of an item that is not in the list: `unknown item <id>`;
  5. a second `item-start`, `item-spawn` or `item-end` of one item: `duplicate log entry for <id>`;
  6. an `item-spawn` or `item-end` without an earlier `item-start`, or an `item-spawn` after the `item-end`:
     `out-of-order log entry for <id>`;
  7. an `item-start` without an `item-end`: `interrupted item <id> needs a ruling`.

  Otherwise the pending items are those without an `item-end` and the ended ones are never dispatched again.
- **A refusal exits 3.** The step prints `items: STOP: <reason>` on stderr and writes nothing, so the lock helper throws
  and the plan stops. A refused or interrupted step needs a ruling, never a rerun. A malformed log line
  (`items: malformed log line <n>`, a partly written last line included) is thrown as an error, which stops the step too.
- **Reserve and cut.** The three item kinds are admitted by a reserve and cut by the parent at `H - 15` (with `e` the
  seconds since the node process started and `H` the invocation's horizon); the reserves are
  `DEFAULT_LIMITS.itemReserveS` of `lib/lanes.mjs`, which `runItems` also checks before it starts the lanes of a group.
  The existing kinds keep their rules (`rate`: `e + 30 <= H`, a defect after 30 s; `call`: `e + 120 <= H - 15`, cut at
  `H - 15`). After a group in which a job was not admitted or an item ended `censored`, the invocation starts no
  further group; the next invocation continues with the items that have no `item-end`.

  | Kind | Admitted when | Cut | Lanes |
  |---|---|---|---|
  | `v4-select` | `e + 120 <= H - 15` | at `H - 15`, `censored` | 2 |
  | `v4-generate` | `e + 245 <= H - 15` | at `H - 15`, `censored` | 1 (its pool has 1 worker) |
  | `v4-replay` | `e + 120 <= H - 15` | at `H - 15`, `censored` | 2 |

- **Self-test.** `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T04a`
  runs forty-one cases without the lock: six on synthetic worker kinds (no rating, generation, uniqueness count or replay),
  one that computes the run identity (`itemIdentity`) of the frozen trees and runs nothing, V4-T04b's two (the pack
  files, on the file system only, and the item ledger, on synthetic journal lines; see below), V4-T04c's nine (the
  `checks:` cases, on synthetic rows; see "Stage 1 checks"), V4-T04d's eight (the `proof:` cases), V4-T04f's eleven (the
  `accept:` cases; see "The accepted binding (V4-T04f)"), V4-T05's one (`items: per-set prior verdict`, on synthetic
  rows; see "The per-set prior (V4-T05)") and V4-T06's three (the `link:` cases, on synthetic journal lines and run
  records; see "Batch linkage (V4-T06)"). Each running case uses
  the scratch task `items-<n>` of the label `selftest`. The test kinds exist only with `testKinds`: `test-ok` returns
  `{ outcome: 'ok', echo }`, `test-throw` throws, `test-hold` blocks the worker for good and is a call kind of the lanes
  (the existing rule admits and cuts it), and `test-item` blocks the same way but is not a call kind, so only the item
  rules (a reserve table that names it, passed as `limits.itemReserveS`) admit and cut it.

### Stage-1 item kinds (V4-T04b)

The three kinds run in the lane worker (`lib/lane-worker.mjs`), on the tree of the item's variant. They are the
evidence of the stage-1 receipt: results, skips, total work and recorded detail compared across observer modes, and
the prototype's own records replayed. The worker never reads the label and never imports the tree's
`tools/node-worker.mjs` (loaded in any worker thread it wires the engine task handler to `parentPort`); a generation
item starts it as a nested worker by path, through a private copy of `adaptNodeWorker`. The kinds run for real in
T04e; the self-test runs none of them.

- **`v4-select`**, payload `{ boardRows, levelId, seedText, mode, logDir, row, route }`: `selectClues` of the tree on the
  first carved set of the case (`uniqueness` `require`, the rng stream `select`), with the journal of this thread
  pointed at `logDir` and `row` (`IG_LOG_DIR` and `IG_ROW`, removed afterwards). `mode`: `absent` installs no caller
  hook, `charge` a charge meter that collects the units it receives, `record` the charge meter and an event recorder.
  `route` (set by the manifest, T04c) is `new` (a Nightmare or Hell 1 target in a `v4`-family tree), `legacy` (another
  target through the journaled route), `legacy-recorded` (another target with a recorder) or `base` (no ledger). A set
  that does not carve returns `{ outcome: 'no-set', reason }`; a mode or route outside the lists above is an error.
  Result (`outcome: 'ok'`): `ok`, `reason`, `clues`, `score`, `skips`, `igWindow`, `digest` (SHA-256 of the result's
  JSON), `route`, `ledger` (below; `null` for `base`), `chargeUnits`, `charges` and `units` (the charge sequence, its
  length and its sum; `null` in `absent`), and for `record` only (else `null`) `events`, `eventsDigest`, `eventKinds`,
  `eventPhases`, `maxSequence` and `detail`: `{ rated, rejected, scored, missing, rechecked }`, `scored = rated +
  rejected`, `missing` the scored events with no detail, `rechecked` the first `min(2, scored)` scored events, each
  re-rated by `rateDetailed` and compared (`{ sequence, kind, equal }`); then `ms`, the time of `selectClues`.
- **`v4-generate`**, payload `{ boardRows, rotation, levelId, seedText, uniqueness, maxActive, quantity, packPath,
  logDir, row }`: the set and batch 1 of a case through the tree's generation client with a one-worker pool and a fixed
  metadata clock, as `tools/record-fixtures.mjs` `generateReplaySeed` builds them (batch 1 with the set's calibration,
  `quantity` from the payload). The log folder and the pack folder are prepared before the pool starts (an existing
  pack makes the item an `error`), the journal variables are set before the pool is created (the nested worker copies
  the environment) and removed with the pool's `close()`. Results: `{ outcome: 'no-set', setStatus, reason }`,
  `{ outcome: 'no-pack', batchStatus, reason }` (the batch returned no pack: nothing is written) or `{ outcome: 'ok',
  batchStatus, reason, puzzles, made, packSha256 }`, `made` the record kind of each accepted puzzle.
- **`v4-replay`**, payload `{ packPath, puzzleIndex }`: `replayPuzzle` of one puzzle of a written pack (the tree's own
  `pack.js` and `replay.js`, one scratch workspace made at the first replay, the tree's `REPLAY` limits). No pack file:
  `{ outcome: 'no-record', reason: 'no pack' }`; a pack that does not validate throws; no puzzle at the index:
  `{ outcome: 'no-record', reason: 'no puzzle', packSha256 }`; else `{ outcome: 'ok', kind, status, reason, stages,
  work, steps, bytes, detailStep, packSha256, ms }` (`packSha256` is the SHA-256 of the file's text, to be compared with
  the generation item's).
- **The pack rule** (`lib/packs.mjs`, RV2-02). `preparePackPath(path)` throws `unexpected existing pack <path>` when the
  file exists, else creates its folder; `writePackFile(path, pack)` writes `JSON.stringify(pack)` (never over an
  existing file), reads it back and returns its SHA-256, or throws `pack write mismatch` when the file differs. A pack
  is written only after a batch that returned one.
- **The ledger** (`lib/ledger.mjs`, reviews R2-14 and R2-07; D-V4-17). `itemLedger(lines, route)` reads the parsed
  lines of the item's `logDir` (every `.jsonl` file, in file-name order, then line order) and returns `{ complete,
  ratingWork, countWork, totalWork, calls, problems }`: `ratingWork` and `countWork` are the sums of the journal's
  rating units (`tuple[4] + tuple[5]` of the `p` lines) and count units (`units` of the `count` lines), `totalWork =
  ratingWork + countWork`, `calls` the number of `start` lines, `complete` true only without a problem. A work that
  cannot be known is `null`, never zero: a journal without exactly one `start` line (route `new` or `legacy`), a value
  that is not a finite number from 0, a journal that does not declare the count capability (no `caps` line of its call
  with `count: true`) and, on the recorded route, the ratings. Problems by route:
  - `new`: not exactly one `start` line; no `end` line of the call (or two); no `caps` line of the call; a `p`, `begin`
    or `count` line of another call; `invalid work <call>`; `sum of p work <a> differs from end.work <b>`; `sum of
    counts <a> differs from end.locate.countWork <b>` (`absent count total` when the end line has none); the problems of
    `pairPrimitives`; `unfinished primitive <call>` when a primitive is still pending at the `end` line, whatever the
    end's `result` (a stage-1 item is never killed).
  - `legacy`: the same, except that the call's `caps` and `count` lines have `call: null`, there are no begin lines and no
    count total on the end line, and a rating whose outcome is `unsat` or `error` is `unquantified <outcome> <call>
    <index>` (the `p` line's position among the call's `p` lines).
  - `legacy-recorded`: the frozen search runs without the journal, so `ratingWork` is `null` (problem `ratings not
    journaled on the recorded route`) and the `count` lines (`call: null`) are summed; its work evidence is its charged
    total.
- **`pairPrimitives(callLines, call)`** (pure; T09c's request ledger imports it unchanged) pairs the `begin` lines of one
  call with their completion lines, at most one primitive pending, and returns `{ problems, lo, open }`: `lo` the sum
  of the completed, quantified primitives' finite units, `open` `{ kind, bound, index }` of the primitive still pending
  after the last line, else `null`. Its problems, with `<index>` the primitive's position among the call's `begin`
  lines from 0: `invalid begin <call> <index>` (a kind other than `rate`, `screen` or `count`), `invalid bound <call>`
  (not a finite number from 0), `overlapping begin <call> <index>` (a `begin` while one is pending; no later line
  removes it, and the new `begin` is the pending one), `unpaired <t> line <call>` (a `p` line closes a pending `rate` or
  `screen`, a `count` line a pending `count`), `unquantified <outcome> <call> <index>` (a `p` line whose outcome is
  `unsat` or `error` carries zero placeholders, not measured units) and `bound exceeded <call> <index>` (units above the
  primitive's `bound`).

## Stage 1 checks (task pack v4)

`v4-check.mjs` (V4-T04c, V4-T04d and V4-T04f; reviews R06, R2-14, RV3-02, R4-03 and RV5-01; D-V4-14 and D-V4-18) holds the tool that
runs the stage-1 item manifests, the two verdicts that judge them and the stage-1 receipt. Its subcommands are `run`
(T04c), `summary` and `pm4-gate` (T04d; see "The stage-1 receipt") and `evidence-check`, `accept` and `check-binding` (T04f;
see "The accepted binding (V4-T04f)"). The verdicts are pure exports.

- **Manifests.** `plans/V4-T04.parity.json` (step `parity`, 23 `v4-select` items) and `plans/V4-T04.replay.json` (step
  `replay`, 9 items) have the format `{ "format": "ig-proto-items", "version": 1, "task", "step", "rows": [...] }`.
  Parity rows (`seedText` `ig-v4/parity/<caseId>`): `v4` on `14x14-master`, `12x12-nightmare`, `26x26-nightmare` and
  `26x26-hell-1` with the modes `absent`, `charge`, `record`; `base` on `14x14-master` with `absent` and `record`;
  `v4-w760`, `v4-w095` and `v4-w380` on `12x12-nightmare`. Replay rows (`seedText` `ig-v4/replay/<caseId>`): for
  `14x14-master`, `12x12-nightmare` and `14x14-nightmare` one `v4-generate` row of `v4` (`quantity` 2) and one
  `v4-replay` row (`puzzles` 2). The third case was `26x26-nightmare` until the ruling of 2026-11-17 (no set under
  `require` with one pool worker within the 115-second request deadline); that first observation is archived in
  `V4-T04/replay-a1/` and `stage1-a1.json`.
- **`run`.** `node tools\ig-proto\v4-check.mjs run --task <T> --step <S> --manifest <path> --label frozen --source-label
  <SL> [--horizon-s <H>]` (any other label: `v4-check: --label frozen only`, exit 1). The raw folders derive from the
  manifest (`tests/artifacts/ig-proto/frozen/<task>/<step>/logs/` and `packs/`), so a manifest runs only under its own
  task and step: a mismatch writes `v4-check: manifest <path> is <task>/<step>, not <T>/<S>` and exits 1 before any
  write. Otherwise `run` builds the trees of the manifest's variants (`ensureTree`, as the item identity would), calls
  `expandManifest(manifest, rawDir, isV4)` and gives the items to `runItems` (`lib/items.mjs`) with `horizonS` (default
  285), and exits with its exit code (0, or 3 for a refused resume). A manifest that does not expand (a row of another
  kind, a mode outside `absent`, `charge`, `record`, a repeated item id) exits 1 with `v4-check: <reason>`.
- **Expansion** (`expandManifest`, pure apart from the catalogue read of `caseBoard`). A `v4-select` row gives one item
  per mode, `<step>:<variant>:<caseId>:<seedText>:<mode>`, with a `route`: `base` when the variant's tree chain does not
  contain `v4`; `new` when the level is `nightmare` or `hell-1`; `legacy-recorded` for the mode `record`; else `legacy`.
  A `v4-generate` row gives `<step>:<variant>:<caseId>:<seedText>:gen` (the set and batch 1, `uniqueness` `require`, the
  pack at `packs/<safe id>.pack.json`). A `v4-replay` row gives `...:puzzle-<i>` items for `i` below `puzzles`, whose
  `packPath` is the pack of the generation item `<packStep ?? step>:<variant>:<caseId>:<seedText>:gen` in that step's raw
  folder. `<safe id>` is the id with every character outside `[A-Za-z0-9._-]` replaced by `_`.
- **Rows.** A verdict reads the items joined with their `item-end` lines: `{ item, variant, caseId, seedText, mode,
  route, status, result }` (`status` `completed`, `censored`, `error`, or `missing` without an end line; `seedText` from
  the manifest row; `result` the end line's). A verdict returns `{ verdict, reasons, rows }`, `verdict` one of `pass`,
  `fail`, `incomplete`; `fail` wins over `incomplete`. Generation and replay rows are told apart by their item id
  (`...:gen`, `...:puzzle-<i>`), a replay row is matched to its generation row by variant, case and `seedText`.
- **`parityVerdict(rows)`**, per (variant, case) group. The required modes are `absent`, `charge`, `record` (`absent`
  and `record` for `base`) and must be in the rows (else `incomplete`); a `missing` or `censored` row is `incomplete`; an
  `error` row or an outcome other than `ok` is `fail`. Then, by the group's route:
  - `new` (all three modes): every ledger complete (else `incomplete`, `no complete work evidence`); the `digest` of
    every mode equal; `ledger.totalWork` equal in every mode; in `charge` and `record` `units === ledger.totalWork` and
    `chargeUnits` deep-equal between the two; the `record` row's `maxSequence` below 2,192.
  - `legacy` (`absent` and `charge` on `legacy`, `record` on `legacy-recorded`, whose ledger is not read): the `absent`
    and `charge` ledgers complete; the `digest` of every mode equal; the two ledgers' `totalWork` equal; `charge`'s
    `units === ledger.totalWork`; `record`'s `units === charge.units` and its `chargeUnits` deep-equal to `charge`'s; the
    `record` row's `maxSequence` below 2,128.
  - every `record` row: `events > 0`; `detail.scored === detail.rated + detail.rejected`; `detail.missing === 0` (else
    `fail`); `detail.scored === 0` is `incomplete` (`no completed scored event`); else `detail.rechecked.length ===
    Math.min(2, detail.scored)` and every `equal` true (else `fail`).
  - `base` (the legacy identity case): its `absent` digest equals `v4`'s on the same case, its `record` `eventsDigest`
    and `units` equal `v4`'s (a difference in the recorded total is `base recorded total <n> differs from v4's <m>`);
    its `record` row has the detail rules above.

  Only complete ledgers are read as work evidence: the sums of an incomplete ledger are never compared. The `absent` and
  `charge` rows record no event, so their `maxSequence`, `events`, `eventKinds` and `eventPhases` are `null` and are not read.
- **`replayVerdict(rows)`.** A generation row `ok` with `puzzles >= 1` has records; `no-set`, `no-pack` or no puzzle is
  `incomplete` (`no record obtained for <case>`); `censored` or `missing` is `incomplete`; `error` is `fail`. A replay
  row: outcome `no-record` is not a proof; a `packSha256` different from its generation row's is `fail`; status `matched`
  is a full proof when `detailStep` is an integer (else `fail`); `incomplete` is a finding (listed in `reasons` as
  `finding <item>: incomplete (reason <r>, work <w>, bytes <b>)`, not a proof); `mismatch` or `unavailable` is `fail`; a
  `censored` or `missing` replay item is `incomplete`, an `error` one `fail`. Each generation case needs one `candidate`
  replay with a full proof, else `incomplete` (`no matched candidate replay for <case>`); `pass` needs no `fail` and
  every case proven; no rows is `incomplete`.
- **Self-test.** Nine `checks:` cases appended to `--items` (synthetic rows, no run, unlocked): the manifest expansion
  (23 and 9 items, routes, packs), the manifest addressing, the parity cases (the new route and its sequence bound, equal
  rating work with unequal count work, the unequal absent total, the incomplete ledger, the detail counts, the legacy
  route with `base`) and the replay proofs.

### The stage-1 receipt (V4-T04d)

Every prerequisite of a gate is one typed receipt, checked against an expectation built apart from it (reviews R2-09,
RV3-06 and R4-03; D-V4-18). `lib/proof.mjs` holds the format and the check; `v4-check.mjs` writes the first receipt.

- **The envelope.** `proofEnvelope({ kind, verdict, source, harnessHash, arms, coverage, evidence, fields })` returns
  `{ format: 'ig-v4-proof', version: 1, kind, verdict, source: { frozenCommit, sourceDigest }, harnessHash, arms: [{ id,
  treeId, paramsHash }], coverage: { expected, observed, missing, censored }, evidence: [{ path, sha256 }], ...fields }`.
  `verdict` is `pass`, `fail` or `incomplete`; `paramsHash` is the SHA-256 of `JSON.stringify(params)` of the arm's
  `ig-tree.json`; an evidence `sha256` is the text hash with LF line ends (`sha256File`) at write time and its `path` is
  relative to the repository root with `/`; `fields` are the kind's own fields, spread into the root (a field named like
  an envelope field is refused). `LIVE_DEADLINE_FIELDS` (`live`, `postHoc`, `workCutoffMs`, `responseBoundMs`,
  `reserveChecked`) are the fields of the kind `live-deadline`; a `deadline-projection` receipt never passes as one.
- **`proofCheck(receipt, expected, readFile = readRepoFile)`** returns `{ status, reasons }`, with `expected = { kind,
  source, harnessHash, arms, coverage: { expected }, fields }` built apart from the receipt. The checks run in this
  order and the first that finds a reason decides: a missing or malformed envelope field, another `format`, `version` or
  `kind`: `incomplete` (`not a <kind> receipt`); `verdict: 'fail'`: `fail`, with the receipt's own `reasons` (else its
  `line`); another `verdict` than `pass`: `incomplete`; `source` not equal: `incomplete` (`stale source`); no
  `expected.harnessHash`: `incomplete` (`no producer binding`); another `harnessHash`: `incomplete` (`producer
  changed`); an expected arm absent or with another `treeId` or `paramsHash`: `incomplete` (`stale arm <id>`); an
  expected coverage id that is not observed, or any `missing` or `censored` id: `incomplete` (`coverage gap <ids>`); an
  evidence file that `readFile` does not find or whose text hash differs: `incomplete` (`evidence changed <path>`); a
  field of `expected.fields` that is not deep-equal to the receipt's: `incomplete` (`<field> is <value>`); else `pass`.
  A failure of substance (`fail`) is kept apart from missing or stale evidence (`incomplete`).
- **Stored identities.** `stepEvidence(task, step, manifestPath, isV4, { historical })` reads `state.json` and `items.jsonl` of
  `tests/artifacts/ig-proto/frozen/<task>/<step>/` and returns `{ identity, rows, problems }`. The identity is the one
  stored in the state, never a fresh one, and an observation is never relabelled. Problems: no state; a `manifestHash`
  that differs from the declared manifest's; a log line whose `identityHash` differs from the state's; another
  `frozenCommit` or `sourceDigest` than the frozen ones; a stored tree id that is not the current tree's (`stale tree
  <variant> (<stored> vs <current>)`; with `historical: true` (T04f) the stored tree ids are not compared with today's
  trees, every other check stays). `rows` are the joined rows of the two verdicts, one per item of each manifest
  row, in order.
- **Order of the plans** (T04e). `plans/IGP-02.json` under `-Label frozen` first (its records go to
  `evidence/frozen/IGP-02/`, the certificate re-proved on R14's cases), then a passing `pm4-gate`, then
  `plans/V4-T04.json`. Both plans are dry-run first with `-ApprovedRoundMinutes`. V4-T04's forecast is 1,095 s of node
  time plus 45 s of quiet period per locked invocation (nine, 405 s), 1,500 s, which is its allocation (25 min), with a
  guard of 1,875 s. Its steps: the firewall snapshot, the trees, the `--frozen` and `--items` self-tests (unlocked), the
  default and `--v4` self-tests, the two identity arms (`base`, `log`), their publishing and `identity.mjs`, the parity
  and replay steps (`v4-check run`, locked, `repeatUntilDone`), `summary` and the firewall check.
- **`summary`.** `node tools\ig-proto\v4-check.mjs summary --task <T> --label frozen --source-label <SL>` (unlocked; any
  other label exits 1) captures the inputs, judges the blocks and writes `evidence/frozen/<T>/stage1.json` (the receipt,
  kind `stage1`, with `meta`, `blocks` and `line`) and `stage1.md`; it exits 0 whenever the record was written.
  Captured inputs (R4-03), written under `evidence/frozen/<T>/inputs/` before the blocks are judged:
  `<variant>.ig-tree.json` for every variant of the two steps' stored identities and for `instr` is the tree's
  `ig-tree.json` as built, only when its tree id equals the stored one (else no copy, and the stale tree makes the
  step's block, or the `pm4` block for `instr`, incomplete); `harness.json` is `harnessInfo()`, only when its hash is the
  parity step's stored `harnessHash` (else `producer changed since the observation` in the `inputs` block). The blocks,
  each `{ verdict, reasons, rows }`:
  - `source`: the snapshot verified, the digest the frozen one and every variant's edits planned on the frozen sources;
    `pass` or `fail` (`sourceVerdict`).
  - `identity`: `evidence/frozen/<T>/identity.json` against the seeds `landscape/26x26-nightmare/0` and `/1`,
    `landscape/14x14-master/0` and `/1`. `incomplete` without the record, with other seeds or while a seed has no MP12b1
    run (`withoutMp12b1 <n>`: under the frozen label such a seed is compared among the arms only, which proves nothing for
    DR-O13); `fail` on a failure of the record, a seed whose `mp12b1~base` pair has no `sameResult: true` or whose
    `base~log` level is not `puzzle-identity`; else `pass` (`identityVerdict`).
  - `pm4`: `evidence/frozen/IGP-02/pm4.json` and the `screens-all-state.json` of its `main` run, against the frozen commit
    and digest, the `main` run and the captured `instr` tree id. `incomplete` without them or before the screens step is
    `done`; `fail` on a violation, no certified run, a coverage gap, a certified run that differs from its canonical
    rating, or another source, run or tree (`pm4Verdict`).
  - `self-test`: the states of `<T>`, `<T>v4`, `<T>f` and `<T>i`; `pass` when each is `done` and every result passed
    (`selfTestVerdict`).
  - `parity` and `replay`: `stepEvidence`, then `parityVerdict` and `replayVerdict`; a problem of `stepEvidence` makes the
    block `incomplete`; the findings of a passing replay stay in its `reasons` and are listed in `stage1.md`.
  - `inputs`: `incomplete` for a capture reason or a `missing input <path>` of the evidence index.

  `stage1Verdict(blocks)` is `Stage 1: holds.` when every block passes, `Stage 1: STOP (<block>: <reasons>; ...)` when a
  block fails and else `Stage 1: INCOMPLETE (...)`. **`INCOMPLETE` is not a failure**: evidence is missing, stale or not
  yet produced (nothing run, a censored item, a stale tree, another producer); `STOP` is a failure of substance. The
  receipt's verdict is `pass`, `fail` or `incomplete` accordingly. Its `source.sourceDigest` and `harnessHash` are the
  parity step's stored ones; its `arms` are the variants of the two steps with their stored tree id and the `paramsHash`
  of the captured copy (`null` without one); its coverage is every item id of the two manifests, then
  `STAGE1_COVERAGE_EXTRA` (the four identity seeds, `pm4` and the four self-test ids), observed when an item ended
  `completed`, an identity seed has its `mp12b1~base` and `base~log` pairs, the `pm4` block is not incomplete or a
  self-test state is `done`; its `evidence` is `stage1Inputs(task, variants)`: the two manifests, the states and logs of the
  two steps, the identity, PM4 and self-test records and the captured copies, never a tree folder, a variant file or a
  harness file (a path that does not exist is left out). T04f accepts the receipt into an immutable binding (see "The
  accepted binding (V4-T04f)").
- **`pm4-gate`.** `node tools\ig-proto\v4-check.mjs pm4-gate --label frozen --source-label <SL>` is the early, read-only
  PM4 check that T04e runs between its two plans (RV5-01). It reads only the two IGP-02 records, through
  `pm4GateEvidence(instrTreeId, readFile)`, takes the expected `instr` tree id from `planTree('instr')` on the frozen
  sources (never from the record) and neither reads nor writes `inputs/` or the stage-1 receipt. A snapshot, digest or
  plan error prints `pm4-gate: incomplete (<reason>)` and exits 2; otherwise it prints `pm4-gate: pass` (exit 0) or
  `pm4-gate: <verdict> (<reasons>)` (exit 2).
- **Self-test.** Eight `proof:` cases appended to `--items`: the typed and bound receipt (the pack's cases (a) to (i) and
  the order of `proofCheck`'s checks), the stored identities (a synthetic step folder of the scratch task
  `V4-T04d-selftest`, removed afterwards), the PM4 block, the early PM4 gate, the explicit input index, the stage-1 line,
  the identity block and the assembly of the stage-1 receipt (`judgeStage1`, on synthetic data).

### The accepted binding (V4-T04f)

A later consumer trusts a receipt only through its accepted binding (reviews RV3-06 and R4-03; D-V4-18), never through
the receipt's own coverage, a tree folder, a variant file or today's harness. `lib/proof.mjs` holds the format and the
two functions; `v4-check.mjs` writes and checks the stage-1 binding.

- **The format.** `{ format: 'ig-v4-accepted', version: 1, receipt: { path, sha256 }, expected: { kind, source: {
  frozenCommit, sourceDigest }, harnessHash, arms: [{ id, treeId, paramsHash }], coverage: { expected }, fields },
  params: { <variant>: <the captured params> }, acceptedAt, acceptedBy }`. `receipt.sha256` is the text hash with LF line
  ends (`sha256Text`) of the receipt file; `expected` is the `proofCheck` expectation, declared apart from the receipt;
  `harnessHash` is the producer of the observations, kept after unrelated harness work.
- **`acceptedBinding(o, readFile = readRepoFile)`** reads the receipt at `o.receiptPath`, builds the expectation from `o`
  (`harnessHash`, `arms`, `coverage` as a list of ids, `fields`) and the frozen source, runs `proofCheck` and throws
  `accept: <status> (<reasons>)` unless it passes; a missing receipt throws `accept: missing receipt <path>`. It
  returns the binding; it writes nothing.
- **`checkAccepted(binding, { readFile = readRepoFile, current })`** returns `{ status, reasons }`; every refusal is
  `incomplete`. The order: the format and version (`not an accepted binding`); the receipt exists (`missing receipt
  <path>`); the receipt's hash (`receipt changed <path>`); `proofCheck` of the receipt against the stored expectation,
  which hashes every evidence file (`evidence changed <path>`, `producer changed`, a coverage gap, ...); then the arms
  of `current` (today's `{ id, treeId, paramsHash }`, only the arms a consumer names): `unbound arm <id>` when the
  binding does not name it, `stale arm <id>` when its tree or parameters differ. Without `current` no tree is read.
- **`stage1Expectation(task)`** (`accept` uses it) builds the stage-1 expectation from the stored identities of the two
  steps (`stepEvidence` with `historical: true`; a problem is `accept: <step>: <problem>`; two producers:
  `accept: two producers`), the captured tree copies `evidence/frozen/<task>/inputs/<variant>.ig-tree.json` (T04d; one
  arm per variant of the identities, in sorted order, with the stored tree id and the hash of the copy's `params`; no
  copy: `accept: no captured tree metadata for <variant>`; a copy whose tree id differs from the stored one: `accept:
  captured tree <variant> differs from the observation (<stored> vs <copy>)`; two stored ids: `accept: two trees for
  <variant>`) and the two manifests (the coverage is their item ids, then `STAGE1_COVERAGE_EXTRA`), with the field `line`
  `Stage 1: holds.`.
- **Commands** (unlocked; `--label frozen` only, any other label: `v4-check: --label frozen only`, exit 1; paths are
  relative to the repository root):
  - `evidence-check --receipt <path> --label frozen --source-label <SL>` hashes each evidence file of the receipt:
    `evidence: unchanged (<n> files)`, exit 0, or `evidence: changed <paths joined by ', '>`, exit 2 (an absent file is
    changed).
  - `accept --task <T> --receipt <path> --binding <path> --by <text> --label frozen --source-label <SL>` writes the
    binding of a receipt of the kind `stage1` and prints `accepted: <receipt> sha256 <hash> -> <binding>` (exit 0).
    **A binding is written once and never rewritten**: an existing `--binding` file exits 1 (`v4-check: binding <path>
    exists (an accepted binding is never rewritten)`); another kind exits 1 (`v4-check: accept knows the kinds stage1`);
    a receipt that does not bind exits 1 with the reason of `stage1Expectation` or `acceptedBinding`.
  - `check-binding --binding <path> [--current <ids>] --label frozen --source-label <SL>` prints `binding: pass` (exit 0)
    or `binding: <status> (<reasons joined by '; '>)` (exit 2); `--current` builds each comma-separated variant's tree
    (`ensureTree`) and compares its `treeId` and the hash of its `params`; a missing binding is `incomplete` (`missing
    binding <path>`).
- **The stage-1 binding** is `docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json`, accepted from
  `stage1.json` (not from `stage1-a1.json`, the archived first observation). The receipt and its inputs are never
  edited: a correction is a new file with a suffix.
- **Historical namespaces** (check-list §3.1, D-V4-18). The task folders `IGP-02`, `V4-T04`, `V4-T04v4`, `V4-T04f` and
  `V4-T04i` (stage 1) and `V4-S2P` (the parity passes and P-0 of `V4-S2`) are records that a binding hashes: no later run,
  verification or self-test uses their ids. `self-test.mjs` refuses the four stage-1 self-test ids under `--label frozen`
  once their `self-test/state.json` exists (`HISTORICAL_SELFTEST`, `reservedTaskProblem(label, task, stateExists,
  historical = HISTORICAL_SELFTEST)`: `self-test: <task> is a historical stage-1 record; use another --task`, exit 3,
  nothing written); `main(argv, { historical })` takes the reserved ids as an option so that a case proves the wiring on a
  scratch id, never on a real stage-1 id; a later task verifies
  under its own id (for example `V4-T04f-verify`). `summary --task V4-T04` and the `V4-T04` plans are never run again.
- **Self-test.** Eleven `accept:` cases appended to `--items` (temporary files under `tests/artifacts/ig-proto/selftest/accept/`):
  a passing receipt is bound; the receipt's own coverage does not define the requirement; another producer is refused;
  a binding survives later work (no tree folder, variant file or harness file is read); changes and stale arms; the
  expectation comes from the captured inputs (and `historical`); a binding is never rewritten; the historical namespaces
  are reserved; `evidence-check`; `check-binding`; `main` refuses a reserved id before any write (the scratch id
  `V4-reserved-selftest`, with a control run that does write).

### The per-set prior (V4-T05)

`variants/v4-ps.json` (chain `base>instr>log>v4>v4-ps`, `params.perSetPrior` true, algo id `gen-v4-proto:v4-ps`) is the
per-set prior of plan P4 item 2 (D-V4-09): the calibration's window count `wc` starts the locate of every candidate of
the batch. Seven copy-only edits carry it. `setAttempt` returns the calibration's `igWindow` (`ps-1`); the client's
`igPriorOf(calibration, levelId, uniqueness)` (`ps-5` to `ps-7`) adds `igPrior: <wc>` to every `puzzleCandidate` payload
under the match rule of `calibrationCandidate`: the calibration's `rating.level` is the target level, in `require` mode
its certificate is `unique`, and `wc` is an integer of at least 1. Without a match no field is sent, the candidate uses
the table prior (`priorCount` of `ig-select-v4.js`), and the completion payload never carries one. The protocol accepts
the optional field (an integer from 1 to 128; `ps-2`, `ps-3`) and `tasks.js` passes it to `puzzleCandidate` (`ps-4`);
T02c's edits record it as `made.igPrior` and pass a recorded one back at replay, so a replay starts at the same count.
The `v4-generate` item result gains `calibrationWindow` (the calibration's `igWindow`) and `madeRecords` (the `made`
record of every accepted puzzle). `node tools\ig-proto\v4-check.mjs prior-verdict --task V4-T05 --label frozen
--source-label <SL>` (unlocked) joins the rows of the steps `prior-gen` (one `v4-generate` row, `14x14-nightmare`,
`seedText` `ig-v4/prior/14x14-nightmare`, `quantity` 3) and `prior-replay` (`v4-replay` of its three puzzles, `packStep`
`prior-gen`), reads the `start` lines of stage `batch` of the generation item's journal and writes
`evidence/frozen/V4-T05/prior.json|md`. `priorVerdict(rows, starts)` is `pass` when the generation item completed with
`w = calibrationWindow.wc` an integer, every `candidate` of `madeRecords` has `igPrior` equal to `w` and `versions.algo`
`gen-v4-proto:v4-ps`, every start line has `priorCount` `min(K - 2, max(1, w))`, there is at least one candidate and one
batch start line, and `replayVerdict` passes; `incomplete` when no candidate was obtained, a row is missing or censored
or no batch start line was journaled; else `fail`. The command prints `prior: <verdict>` (with the reasons when not
`pass`) and exits 0 once the record is written. `plans/V4-T05.json` (6 minutes allocated) runs the two locked steps and
the verdict through the runner; the self-test case `items: per-set prior verdict` is appended to `--items`.

## Batch linkage (V4-T06)

The variant `link` (`variants/link.json`, extends `log`, `params.link` true; copy-only file
`variants/files/link/core/browser/ig-link.js`) journals every candidate task of a batch from dispatch to consumption or
discard, on today's search and on the `gen-v4` prototype. It observes only: it changes no dispatch, fold or result. Ten
edits carry it: `link-1` gives the batch call's journal `start` line the attempt string `"<slot>/<attempt>"` (`attempt`
was `null` for batch calls; the set stage keeps its number); `link-2` to `link-9` call `ig-link.js` from the batch job
of `core/browser/generation-client.js`; `link-10` adds `igSetMs` (the set's end, `null` without a complete set) and
`igAcceptedMs` (the accept time of every valid puzzle, in order) to every run record of `tools/bench/runner.js`,
measured from the start of the request like `responseMs`, with or without a set. A run record without the two fields is
uninstrumented (an older arm), never a measured failure. Seven more edits (V4-T06b) record what the work ledger needs
to close every selection call of a request: `link-11` and `link-12` the outcome of every set attempt and completion
task that returned, `link-13` and `link-14` every worker termination of `tools/node-worker.mjs`, `link-15` the dispatch
of every completion task, `link-16` the identity of a completion call in the worker journal and `link-17` the import
of the key helper in the client.

With `IG_LOG_DIR` set (and `IG_ROW`) the batch writes `<IG_LOG_DIR>/<IG_ROW>.link.jsonl`, one line at a time, each with
`t: 'link'`, `ev`, `batch` (1 in a row's process) and `at` (ms since the epoch): `start` (`batchSeed`, `quantity`);
`calibration` (the calibration puzzle was accepted); `dispatch` (`slot`, `attempt`, `inflight` after the launch);
`await` (the task the fold waits for, once per task; `slot` and `attempt` are `null` when it waits for nothing);
`complete` (`ok`, `inflight` after the return, `outcome`: `candidate`, a candidate failure such as `not-in-band` or
`layout`, or `error`); `consume` (the fold took the task: `result` is `accepted`, `rejected` or the candidate failure;
`accepted` is the count so far); `discard` (a task the fold never consumed, with `done`: whether it had returned) and
`end` (`status`, `reason`, `accepted`). Without `IG_LOG_DIR` nothing is written. `log-link`, `v4-link` and `v4-ps-link`
are the compositions with `log`, `v4` and `v4-ps` (no edit of their own).

The closure lines (V4-T06b) go to the same file and are not part of a batch's timeline: `set-complete` (`attempt`,
`outcome`: `ok`, a selection reason, a pre-selection reason such as `carve` or `layout`, or `invalid`) for every set
attempt that returned; `completion-dispatch` (`index`, `key`) and `completion-complete` (`index`, `key`, `valueKey`,
`outcome`: `candidate` or the failure) for every task of the completion pass after a `layouts-not-found` stop; and
`worker-end-request`, `worker-end` and `worker-end-failed` (`pid`, `threadId`, and `error` for the last) for every
worker termination. A completion task's identity is `key`, `"c/"` and the layout key that the client computes with
`layoutKey` from the request's set and the layout it sends (`null`, never an exception, when it cannot); the worker
journal's `start` line of that call carries the same string as `attempt` (`link-16`), and `valueKey` is `"c/"` and the
layout key of the candidate that came back (`null` without one). A termination request closes nothing: `worker-end` is
written only when the promise of `worker.terminate()` has fulfilled, with the `pid` and `threadId` of the worker and
the folder and row captured before the request, and a rejection is written as `worker-end-failed`. A task that never
returned writes no outcome line, and a termination that has not completed writes no `worker-end`.

`node tools\ig-proto\linkage.mjs report --task <T> --arms <a,b> --pool <n> --label frozen --source-label <SL>`
(unlocked) reads, per arm, the published rows (`evidence/frozen/<T>/<arm>/*.runs.json`) and, from
`tests/artifacts/ig-proto/frozen/<T>/<arm>/<shard>/logs/`, each row's `<row>.link.jsonl` and worker journals, and writes
`evidence/frozen/<T>/linkage.json|md`: per run the summary, `igSetMs`, `igAcceptedMs`, `attemptsMatched` (every worker
journal `start` line of stage `batch` names an attempt that was dispatched) and the problems found. `linkSummary(lines,
pool)` (exported) returns `dispatched`, `completed`, `consumed` (`accepted`, `rejected`, `fail` by reason), `discarded`
(`done`, `inflight`), `awaits`, `awaitMs`, `idleWorkerMs` and `problems`, as totals over the batches of the lines and
per batch in `batches`; at the top level only it also counts the closure lines of the whole row: `setCompletes`,
`completionDispatches`, `completionCompletes`, `workerEndRequests`, `workerEnds` and `workerEndFailures`, and
`completionKeyMismatches`, the `completion-complete` lines whose string `valueKey` differs from `key`. An await period
runs from an `await` line to the first later `consume` of the same task or the
batch's `end` line (a discard or an abort does not end it); `idleWorkerMs` sums `(pool - inflight) x dt` over the
periods, `inflight` stepping at every `dispatch` and `complete` line up to the period's end (a `complete` after `end` is
ignored there). A problem is a consumed task that was never dispatched or never completed, a dispatched task with
neither `complete` nor `discard`, a batch without `end`, or a line without a valid time. `timelineProblem(run,
linkLines)` (exported) returns `null`, `'incomplete'` (a missing `igSetMs` or `igAcceptedMs`, or a `responseMs` that is
not a finite number from 0) or a reason, by outcome: no set (`igSetMs` null) is valid with no accepted puzzle and no
batch `start` line; a set with no acceptance is valid with an empty list; otherwise the list has one non-decreasing time
per accepted puzzle, the first not before the set and the last not after the response.

The verdict is `linkage: pass` when no batch has a problem, every run's timeline is valid, `attemptsMatched` holds for
every row, a complete set has a batch `start` line, no link file lacks a published row, no completion task returned a
candidate of another layout key than its own, and each `log-link` row has the
`resultDigest` of the same seed in T04e's `log` arm (`evidence/frozen/V4-T04/log/`, read only; the report lists one line
per seed with `equal` or `differs`); `linkage: incomplete <rows>` (exit 2) when a run lacks a timeline field or an arm
has no published row; else `linkage: fail <reasons>` (exit 1). The report is written in every case. `plans/V4-T06.json`
(4 minutes allocated) runs `log-link` and `v4-link` on `26x26-nightmare:0-1` with four workers and then the report.
The self-test cases `link: summary of a synthetic batch`, `link: an awaited task discarded at the end` and `link:
timelines by outcome` are appended to `--items`, and with the closure lines (V4-T06b) `link: a confirmed worker
termination`, `link: closure lines counted` and `link: the completion key helper`.

## Frozen-round arms (V4-T08)

Stage 2 compares a fixed set of arms on fitting seeds (plan section 5.1). This task adds the last three mechanisms to the
`gen-v4` prototype, `selectCluesV4` of `variants/files/v4/core/engine/ig-select-v4.js`, each behind a parameter, and names
the arms. A mechanism acts only with its parameter, so every earlier arm keeps its behaviour and its id (D-V4-05), and
only Nightmare and Hell 1 targets reach them (D-V4-03). The `v4`-family tree ids moved with the edit of the shared file,
as with every earlier edit of it: the variant ids and parameters did not change, and the P-0 pass of the stage-2 plan
re-checks the stage-1 results on the final trees.

- **The `W_screen` class table** (`IG.screenClasses`). `screenClass(levelId, area)` gives the class of a target, with
  `area` the active cells of the board: `hell-1` (Hell 1, every board), `n-small` (Nightmare, up to 144 cells), `n-mid`
  (Nightmare, 196 to 324 cells) and `n-large` (Nightmare, 360 cells and more); every other target and area is `null`
  (Nightmare 145 to 195 and 325 to 359 cells, and every other level). `classW(table, levelId, area)` gives the call's
  screen limit: the class's number when it is positive and below the canonical limit `DEDUCE.work` (760 M), else
  `DEDUCE.work`, that is, no screen. A `null` class, a class the table does not list and a `null`, zero, negative,
  non-number or too large entry all fail closed to no screen; without a table (`IG.screenClasses` absent) it returns
  `undefined` and the call keeps `IG.W` as before. The limit of a call is `ctx.igW`, else `classW(...)`, else
  `IG.W[<level id>]`, else `IG.W.default`. `screenTable` names the table in the record's `versions.screenTable` and in the
  journal's `locate.tables.screen`.
- **Bracket close** (`IG.rerate: 'close'`, D-IG7's other reading). When the first phase-A bisection ends with a closed
  bracket (`loAbove`, the highest count rated above the band, and `hiBelow`, the next count, rated below it) and the
  probe at `loAbove` was screen-capped and not yet re-rated, that probe is re-rated canonically, once, from the shared
  allowance `rerateMax` (the journal phase `close`, the event phase `close`, no ordinal). An in-band result is the hit
  (`noWindowProof` `closed-in`): its candidate is offered to the centre rule at once and may end the call; any other
  result replaces the probe's result at that count and the call goes on as without the parameter. The `end` line's
  `locate.close` is `{ count, side, kind }` (`side`: `in`, `below` or `above`; `kind`: `rated`, `ar1` or `too-few`),
  absent when no re-rating was made.
- **The (c4) probe** (`IG.c4: true`). Before the first in-band locate result of a call is accepted (a count above one),
  one subset one clue below it is rated: the family subset first, then a sample when the family subset is skipped (the
  journal phase `below`, the event phase `below`; at most two subset ordinals). When both counts are in band, the lower
  one is offered to the centre rule first, and a central result ends the call at the lower count (`locate.hit` and `wc`
  are that count; `locate.probes` counts only the locate probes). The `end` line's `locate.c4` is `{ count, side, kind }`
  (`side` also `skip` when both subsets were skipped, then `kind` is `null`). The probe is made once per call.
- **Journal.** The phases `close` and `below` join the frozen `rated` and `unrateable` events and the journal's `phase`
  lines; a re-rating or probe tuple has the phase name in its first field, as the other phases. The `compare.mjs` family
  (provisional) does not read them.
- **The seven arms** (`variants/fr-*.json`, each with no edit and no file of its own; `fr-base` extends `v4-link`, the
  instrumented `gen-v4` prototype with the linkage journal; each has its own algo id `gen-v4-proto:<arm id>`):

  | Arm | Extends | Parameters |
  |---|---|---|
  | `fr-base` | `v4-link` | `screenClasses` `{ hell-1: null, n-small: null, n-mid: 190 M, n-large: null }`, `screenTable` `tab-default`: the plan's default table (OD-P7: no screen up to 144 cells; 360 cells and more: none until both arms have run) |
  | `fr-screen` | `fr-base` | the screen in every class: `hell-1` 380 M, the three Nightmare classes 190 M, `screenTable` `tab-screen` (an unlisted area still has none) |
  | `fr-none` | `fr-base` | no screen in any class, `screenTable` `tab-none` |
  | `fr-close` | `fr-base` | `rerate: 'close'` |
  | `fr-c4` | `fr-base` | `c4: true` |
  | `fr-ps` | `fr-base`, `v4-ps` | the per-set prior (`perSetPrior` true; the `ps-*` edits) on the `fr-base` table |
  | `fr-p5` | `fr-base`, `v4-p5` | P5's 2 G call budget and the bound of 4 set attempts (the `p5-*` edits) on the `fr-base` table |

  The legacy arm of stage 2 is `log-link` (today's search with the linkage journal, V4-T06). The class table, the
  re-rating at bracket close, the (c4) probe, the arm names and their algo ids are contracts of the stage-2 plans
  (T11a to T11g) and of the freeze (N-V4-03).
- **Self-test.** Three cases of the `--v4` group (through the lock helper, task id `V4-T08`): `fr: class table` (the
  classes and limits at every boundary, the fail-closed entries, the parameters of the seven trees, the screen limit of
  a real call's `start` line per arm and level), `fr: bracket-close re-rating (synthetic)` and `fr: (c4) probe
  (synthetic)` (the ordinals of the family subset and of the sample, with the skip and the double skip).

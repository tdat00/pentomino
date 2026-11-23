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
- **No git.** No script runs a git command, read-only ones included (one exception: `phase1/p6-bench.ps1` reads `HEAD` and the status of
  its two worktrees, V4-T14). Identity comes from content: the source digest of
  `SOURCE_FILES`, the firewall manifest, the tree identities and a source label the runner receives
  (`-SourceLabel`). Every tree patches its copy of `tools/calibrate.mjs` so that its `readSource` runs no git (edit
  `meta-1`). The self-test's guard (`paths and fingerprint guard`) also matches
  `git -C <dir> <command>`, a quoted `-C` path and calls inside expressions, reads its sample texts from
  `data/git-guard-cases.json` (a file it does not scan), and exempts exactly `phase1/p6-bench.ps1` (N-V4-20).
- **Every long command goes through the lock wrapper.** `run-task.ps1` calls `Invoke-IgNode` of the low-priority
  helper; difficulty-v3 has priority on the machine. Commands that take seconds and rate nothing (building a tree, the
  firewall, publishing, the identity report) run directly. Never run timing or generation outside the wrapper.
- **Bounded invocations.** A locked invocation ends by its horizon `H` (at most 885 s) by construction; the helper's
  kill at 900 s (the owner's limit of 2026-11-17, V4-T11h; it was 300 s) is a defect, never the sharder. Nothing started
  is rerun automatically.
- Node tools are `.mjs` with `// @ts-check`, 2-space indent, single quotes, semicolons; files are CRLF without BOM.
  A record is written once; a correction is a new file with a suffix (`-r2`).

## Layout

| Path | Role |
|---|---|
| `run-task.ps1` | run-plan runner: lock wrapper, exit protocol, budget guard, accounting |
| `lock/ig-lock.ps1`, `lock/lock-check.ps1` | the pentomino copy of the shared lock helper (limit up to 900 s, the idle quiet period) and its unlocked check in a scratch `TEMP` (V4-T11h; see "The owner's lock rules (2026-11-17)") |
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
| `lib/lanes.mjs`, `lib/lane-worker.mjs` | worker-thread lanes with admission and a supervisor; the lane worker also runs the three stage-1 item kinds (V4-T04b) and the kernel-probe kind `v4-kernel` (V4-T10a) |
| `lib/items.mjs` | the runner of bounded, identity-checked measurement items and the item-log line helpers (V4-T04a; see "Bounded measurement items"), and `runProcessItems`, its process-item runner (V4-T10b; see "Kernel probe (V4-T10a)"), and `runCustomItems`, the same rules with a dispatch the caller gives (V4-T10c; see "Pool probe (V4-T10c)") |
| `lib/ledger.mjs` | the work ledger of an item from its journal lines, and `pairPrimitives` (V4-T04b; see "Stage-1 item kinds"); pure |
| `lib/packs.mjs` | the pack file of a generation item: `preparePackPath` and `writePackFile` (V4-T04b) |
| `lib/proof.mjs` | the typed proof receipt of the frozen round: `proofEnvelope`, `proofCheck`, `LIVE_DEADLINE_FIELDS` and `STAGE1_COVERAGE_EXTRA` (V4-T04d), and its accepted binding: `acceptedBinding`, `checkAccepted` and `ACCEPTED_FORMAT` (V4-T04f; see "Stage 1 checks (task pack v4)"); pure apart from the evidence reads of `readRepoFile` |
| `v4-check.mjs`, `plans/V4-T04.parity.json`, `plans/V4-T04.replay.json`, `plans/V4-T04.json` | the stage-1 checks (V4-T04c, V4-T04d, V4-T04f): `run` expands an item manifest and runs its items; the parity and replay verdicts; `summary` writes the stage-1 receipt; `pm4-gate` is the early PM4 check; `evidence-check`, `accept` and `check-binding` are the accepted binding's commands; the plan of the stage-1 runs; see "Stage 1 checks (task pack v4)" |
| `variants/<id>.json` | variant manifests; `variants/files/<name>/...` copy-only files |
| `variants/v4-ps.json`, `plans/V4-T05.json`, `plans/V4-T05.prior-gen.json`, `plans/V4-T05.prior-replay.json` | the per-set prior arm `v4-ps` and the plan and manifests of its run (V4-T05); the verdict is `v4-check.mjs prior-verdict`; see "The per-set prior (V4-T05)" |
| `variants/link.json`, `variants/log-link.json`, `variants/v4-link.json`, `variants/v4-ps-link.json`, `variants/files/link/`, `linkage.mjs`, `plans/V4-T06.json` | the batch linkage journal and its report (V4-T06): the variant `link` and its three compositions, `ig-link.js`, `linkage.mjs report` and the plan of its run; see "Batch linkage (V4-T06)" |
| `variants/v4-p5.json`, `variants/v4-p5-w8-test.json`, `variants/v4-link-w8-test.json` | the P5 pilot arm `v4-p5` (the call budget and the bounded set attempts) and the two test-only width-8 trees (V4-T07b); see "P5 bounded set attempts (V4-T07b)" |
| `variants/fr-base.json`, `fr-screen.json`, `fr-none.json`, `fr-close.json`, `fr-c4.json`, `fr-ps.json`, `fr-p5.json` | the seven frozen-round arms of stage 2 (V4-T08); see "Frozen-round arms (V4-T08)" |
| `verdicts.mjs`, `data/verdict-manifest.schema.md`, `data/verdict-manifest.example.json` | the admission statistics of plan section 5.2 (V4-T09a onwards): the row level (valid rows, completion apart from the deadline, per-puzzle evidence), the pairing and the class statistics of rule (c5) (V4-T09b: matched sets, the clue, faster and no-regression rules), the work ledger of a request, the work rule and the class verdict (V4-T09c), the global verdicts (V4-T09d: the cell gates on the shipped arm, Master identity, the Hell 1 report, P5's stops, the post-hoc projection, the population and phase 0's verdict), and the verdict tool (V4-T09e: the bound prerequisites, the class-selection receipt, the work report and the records it writes) with the manifest those statistics read and its example; the statistics are pure, the tool reads the records the manifest names; see "Admission statistics (V4-T09a)" |
| `kernel-probe.mjs`, `variants/r4c.json`, `plans/V4-T10a.json`, `plans/V4-T10b.json` | the kernel probe (V4-T10a, V4-T10b): R4 visit and mutation counters in the `r4c` tree, the `v4-kernel` items that compare its complete deduction with the `instr` tree's, the `fewestColumn` profile of child processes under reduced inlining, the `counters` and `profile` (locked) and `report` (unlocked) commands and the plans of the runs; see "Kernel probe (V4-T10a)" |
| `width-probe.mjs`, `lib/width-worker.mjs`, `lib/width-worker-test.mjs`, `plans/V4-T10c.json` | the pool probe (V4-T10c): one rating's time at 1, 2, 4 and 8 concurrent workers on the frozen source, the width dispatch, its worker and the scripted worker of its self-test, the `run` (locked) and `report` (unlocked) commands and the plan of the run; see "Pool probe (V4-T10c)" |
| `manifest.mjs`, `data/frozen-round-v1.json`, `plans/V4-S2.json`, `plans/V4-LIVE.json`, `plans/V4-S4.universe.json`, `plans/V4-S4X.template.json`, `plans/items/` | the frozen-round matrix (V4-T11a onwards): the requests of stages 2 to 5 as data and the pure rules that expand them into groups of request rows with their row limits, state paths and collections, `controlsFrom` and `conditionalActivated`; the pricing (V4-T11b); the plan compiler (V4-T11c: `compile` writes the plans `V4-S2` and `V4-LIVE`, the priced universe of stage 4, the template of the second validation and the item manifests of the parity passes and of the isolated P-0) and the prerequisites gate (`check-prerequisites`); the stage-4 collections (V4-T11e: `activate` writes the activation record, `plans/V4-S4.json` and `plans/V4-S4C.template.json` once, `close` the closure record); the comparators and the verdict inputs (V4-T11f: `resolve-comparators`, `verdict-input`); the manifest for the owner (V4-T11g: `price` writes `evidence/frozen/V4-T11/manifest.json|md`, `approval` prints one approval request); unlocked, nothing in it runs; see "Frozen-round matrix (V4-T11a)" |
| `phase1/p6-bench.mjs`, `phase1/p6-bench.ps1`, `phase1/chart-png.ps1` | the phase-1 bench of P6 (V4-T14, not a run plan): the pure rules and the `preflight` and `compare` commands, the locked invocation of one group on one side, and the chart image; see "Phase-1 bench of P6 (V4-T14)" |

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
| `r4c` | `instr` | test-side R4 visit and mutation counters in the record of `igTake()` (V4-T10a; nine edits `r4c-1` to `r4c-9`; see "Kernel probe (V4-T10a)"): the deduction result is unchanged |

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
# the whole plan of a task (locked steps wait for a quiet slot; the runner stops with exit 4 on a budget stop); the lock helper is
# the pentomino copy (V4-T11h): the runner passes -LimitSeconds 900 -IdleQuietSeconds 15, which the shared helper refuses
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-00.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper tools\ig-proto\lock\ig-lock.ps1 `
  [-Only <step ids>] [-IncludeOptional] [-ApprovedRoundMinutes <n>] [-ApprovedTaskMinutes <n>] [-DryRun]

pwsh -NoProfile -File tools\ig-proto\lock\lock-check.ps1 [-Detail] [-Keep] [-HarnessCheck]      # unlocked (V4-T11h), a scratch TEMP per run, about two minutes, run alone and after the other gates; prints lock-check: <n> cases ok

node tools\ig-proto\firewall.mjs snapshot|check --task IGP-00 --label provisional
node tools\ig-proto\boards.mjs write|check
node tools\ig-proto\receipt.mjs --label frozen --source-label "frozen 3fc65f4"      # unlocked, writes receipt.json|md (V4-T01b)
node tools\ig-proto\arm.mjs run --task T --arm A --shard S --variant V --workers 4 --cases 26x26-nightmare:0-1 `
  --row-limit-s 90 --label provisional --source-label <label> --horizon-s 285 [--max-rows n] [--dry-run]
node tools\ig-proto\arm.mjs publish --task T --arm A --label provisional --source-label <label> [--done-only]
node tools\ig-proto\arm.mjs status --task T --arm A --shard S --label provisional [--check-rows]
node tools\ig-proto\identity.mjs --task IGP-00 --arms base,log --label provisional
node tools\ig-proto\self-test.mjs --label selftest [--only 1,3] [--proto] [--p6] [--frozen] [--items] [--task T]   # cases that generate or rate need the lock; --p6 runs every case; --frozen runs only the frozen-source group and --items only the measurement-items group (both unlocked)
node tools\ig-proto\self-test.mjs [--frozen | --items | --v4] --list --label frozen   # prints "<index> <name>" per case of the group; runs nothing, writes nothing (unlocked)
node tools\ig-proto\fit-prior.mjs [--replace]       # recomputes data\prior-v1.json; exit 1 when it differs (unlocked)
node tools\ig-proto\freeze.mjs check --label frozen --source-label "frozen 3fc65f4"   # unlocked (T08b): the six checks of the four frozen trees against the freeze's constants
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
node tools\ig-proto\verdicts.mjs --manifest <verdict manifest> --label frozen --source-label <label>              # unlocked (V4-T09e), writes verdicts.json|md and, for a selection, class-selection.json
node tools\ig-proto\kernel-probe.mjs counters --task T --label frozen --source-label <label> [--cases <ids>]      # locked (V4-T10a), run by its plan
node tools\ig-proto\kernel-probe.mjs profile --task T --label frozen --source-label <label> [--cases <ids>]       # locked (V4-T10b), run by its plan; profile-child is its child process
node tools\ig-proto\kernel-probe.mjs report --task T --label frozen --source-label <label> [--cases <ids>]        # unlocked (V4-T10a, V4-T10b), writes kernel.json|md
node tools\ig-proto\manifest.mjs compile --label frozen --source-label <label>                                    # unlocked (V4-T11c), writes the plans, the templates and the item manifests under plans\
node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE --label frozen --source-label <label>         # unlocked (V4-T11c), the gate of a plan: exit 1 and the reasons when it is blocked
node tools\ig-proto\manifest.mjs activate --collection initial [--approve-optional S4-6] --label frozen --source-label <label>   # unlocked (V4-T11e), once, on the owner's authorization: writes the activation record, plans\V4-S4.json and plans\V4-S4C.template.json
node tools\ig-proto\manifest.mjs close --collection initial --reason <text> --label frozen --source-label <label> # unlocked (V4-T11e), once, on the owner's instruction: writes the closure record listing the declared rows not published
node tools\ig-proto\manifest.mjs price --label frozen --source-label <label>                                      # unlocked (V4-T11g), writes evidence\frozen\V4-T11\manifest.json|md: the priced, staged manifest for the owner
node tools\ig-proto\manifest.mjs approval --plan V4-S2 [--after <ids>] [--optional] --label frozen --source-label <label>   # unlocked (V4-T11g), one JSON line: the approval request re-read now; exit 1 for a plan priced later
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
approval, and the horizon is `H = min(885, A - 45 - 10)` (the owner's 900-s limit less 15 s; 45 s is the full quiet period, 10 s is
slack). When `H` is below the step's `minHorizonS` the runner stops
with exit 4 and prints what it needs. The invocation line (`tests/artifacts/ig-proto/<label>/<task>/invocations.jsonl`)
has the step, the times, node seconds, lock wait (wall - node), the quiet period the helper used (`quietS`, from its printed
line; `null` when absent), counted seconds (node + min(lock wait, 45)), the
horizon and the decision. **Charging.** The node seconds come from the step's state file; for a failed invocation
without a fresh state they are the seconds the lock helper printed (`IG <task> exit=<n> seconds=<s> quiet=<q>`, captured with
`-InformationVariable`), 900 when the helper killed the process, 0 when node never started. Never the wall time: the
wait for difficulty-v3 is not charged, only the lock wait up to 45 s (a 15-s quiet period under the idle declaration is charged as the time waited).

### Bounds inside a locked invocation

With `e` the seconds since the node process started: an arm row starts only when `e + R + 10 <= H` (calibrate's child
limit `R`); a lane `rate` job only when `e + 30 <= H` and is a defect when it runs longer than 30 s; a lane `call` job
only when `e + 120 <= H - 15`, and it is cut at `H - 15`, recorded `censored` with every profile it had streamed, its
lane taking no further job. The three item kinds of `lib/items.mjs` have their own reserves (see "Bounded measurement
items"). The helper kills the whole process tree at its limit, 900 s (the runner's `-LimitSeconds`), so `H`, at most 885 s, ends
an invocation 15 s before a kill that is a defect.

### The owner's lock rules (2026-11-17)

On 2026-11-17 at 21:33 the owner decided that a locked invocation may last up to 900 s (it was 300 s), that its quiet period is 15 s
when Sudoku's difficulty-v3 has nothing scheduled and 45 s otherwise, and that timed requests stay sequential (one locked invocation at
a time on this machine, four workers per request row). V4-T11h carries the rules into the helper, the runner, the budget and the price
(check-list §3.2, D-V4-19).

- **The copy.** `lock/ig-lock.ps1` is a copy of the shared helper (`C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1`)
  with the rules for `-Repo pentomino` only. The shared helper also serves Sudoku's improve-generating work and is never edited: its
  default, its refusal of more than 300 s and its printed line stay. Both use the same two lock files in `$env:TEMP`
  (`dv3-sudoku.lock`, `dv3-timing.lock`) and the same priority rule, which is how the two repositories coordinate: a run starts only
  after both locks have been absent continuously for the quiet period, and difficulty-v3 keeps priority. The copy accepts
  `-LimitSeconds` up to 900 (more throws `a locked invocation is limited to 900 s`; `-Repo sudoku` is still refused above 300), adds
  `-IdleQuietSeconds` (0 is off; at most `-QuietSeconds`; `-Repo pentomino` only) and prints
  `IG <task> exit=<code> seconds=<s> quiet=<q>`, `<q>` being the quiet period it used. `run-task.ps1` calls it with `-LimitSeconds 900
  -IdleQuietSeconds 15`; given the shared helper as `-LockHelper`, the first locked step stops on the unknown parameter before anything
  runs. A locked verification invocation keeps the default limit of 300 s.
- **The idle declaration.** Only the owner knows difficulty-v3's schedule. When he states that it has nothing scheduled until a time,
  at most 24 h ahead, the orchestrator writes `$env:TEMP\dv3-idle.json` (`format` `dv3-idle`, `version` 1, `setAt`, `idleUntil`) and
  deletes it when he says difficulty-v3 is scheduled again; no task, test or check creates it, `dv3-sudoku-seen.txt` or a lock file in
  the real `$env:TEMP`. `Test-IgIdle` is true only while the file is a top-level JSON object with that format and a numeric `version` 1,
  its `setAt` and `idleUntil` are strings of ISO 8601 form (a case-sensitive pattern checked before the .NET parser, which alone accepts
  `11/17/2026 21:00:00`), `setAt <= now < idleUntil`, `idleUntil - setAt <= 24 h`, and `dv3-sudoku-seen.txt` is absent or holds an ISO
  time before `setAt`; every other value and every exception is false.
- **Fail-closed rules.** The short quiet is chosen at the start of an acquisition attempt only when `-IdleQuietSeconds` is positive,
  the full quiet has not been forced in this invocation and `Test-IgIdle` is true. The declaration is rechecked on every pass of the
  wait and before acquiring: from the first failed check the invocation uses the full quiet and never the short one again. Every
  sight of `dv3-sudoku.lock`, in the wait or at the collision check after the helper has acquired its own lock, writes the UTC time to
  `dv3-sudoku-seen.txt` (which keeps the short quiet off for later invocations until a new declaration is set) and forces the full
  quiet; a sight of either lock restarts the quiet period. After acquiring, a short quiet is rechecked once more before node starts:
  when it is no longer valid the lock is released and the wait resumes with the full quiet. When the sight cannot be recorded (five
  attempts) the helper throws before node starts. No statement, an unknown, expired or unreadable declaration and one contradicted by a
  difficulty-v3 run cost only time.
- **Counting and prices.** The runner keeps charging `node + min(lock wait, 45)` per invocation (a 15-s quiet period is charged as the
  time waited), counts a killed invocation as 900 node seconds and records the quiet period it used (`quietS`). Prices and budget
  decisions reserve 45 s per invocation (`QUIET_S`) whether or not difficulty-v3 will be idle (unknown when a plan is approved): the
  idle quiet can lower the quiet-period part of the spend, never the price. The horizon is `min(885, A - 45 - 10)` and the ceiling of
  a unit 945 s. Under these rules `V4-S2` is allocated 560 minutes (73 steps) and `V4-LIVE` 36 minutes (9 steps), and the five rows of
  the first stage-2 row step (`rows-fr-base-pilot-26x26-hell-1`, 260-s limit) take two invocations: four rows, then one.
- **`lock/lock-check.ps1`** (unlocked, about two minutes, `node -e 0` only; **run it alone, after the other gates and with nothing else
  running**, because it asserts wall-clock waits with margins of 0.3 to 1 s; `-Detail` adds the measured numbers, `-Keep` leaves the
  scratch folders) runs each case in a child `pwsh` whose `TEMP` is a fresh folder under this run's own scratch root
  `tests\artifacts\ig-proto\selftest\lock\<yyyyMMddTHHmmss>-<PID>` (no run deletes another run's folders; the run folder is removed at the
  end unless `-Keep` or a case failed; the real `TEMP` is never read or written), with `-QuietSeconds 6 -IdleQuietSeconds 2` (the logic of
  45 and 15 s at about a seventh of the time) and `-LimitSeconds 30`, and prints `lock-check: <case> ok` per case, then
  `lock-check: 13 cases ok`: (a) no declaration,
  (b) a valid one, (c) a valid one with the Sudoku lock seen after `setAt`, (d) expired, (e) unparseable, (f) of 25 h, (g) another
  format, (h) the Sudoku lock in the wait (four runs: the case as written, a wait with no declaration, the lock there at the start,
  and the lock appearing right after the last poll so that only the collision check meets it), (i) the limits and refusals, (j) the
  kill at the limit (no node process left, the lock file removed), (k) a declaration that expires in the wait, (l) one deleted in the
  wait and (m) times written as `MM/dd/yyyy HH:mm:ss`. Direct checks of `Test-IgIdle` beside (b), (c) and (e) cover the accepted and
  the refused shapes. Each child appends `<UTC time> <stage>` lines to `progress.txt` in its folder (`prelude`, `before-call`,
  `after-call`, `result`). A child that times out (150 s) or exits nonzero is reported after the `FAIL` line, before its tree is killed,
  with its last progress marker, the files of its folder with their sizes (a `dv3-*.lock` file with its content) and its process tree (PID,
  name and command line from `Win32_Process`), then its partial stdout and stderr (awaited at most 5 s after the kill); its folder is kept.
  `-HarnessCheck` runs only `z-harness-timeout` (a child that sleeps 20 s, with a grandchild node, under a harness timeout of 5 s): it
  must print that report, leave no process of the tree and exit 1 (2 when the harness itself misbehaves); it is not one of the 13 cases.

## Records

- `arm.mjs run` writes, per shard, `shard.json` (flags, rows, `treeId`, `copyDigest`, `harnessHash`), `rows.jsonl`
  (`started` and `recorded` lines; a started row without a `recorded` line stops every later invocation), the one-row
  matrices (`rows/<case>~<rep>/matrix.json`, the objects checked by the tree's `checkMatrix`), calibrate's reports and
  `state.json`. The original rep stays in the row key and the seed (`landscape/<case>/<rep>`); calibrate's own `rep` of
  a one-row run is always 0 (`localRep`).
- `arm.mjs publish` writes `<S>.runs.json|md` and, for a tree with a journal, `<S>.calls.jsonl` (the journal lines,
  without the `accepted` blocks; above 5 MB the `row`, `start` and `end` lines only, as `<S>.calls-summary.jsonl`).
  **Publication is written once** (N-V4-19, stages 2 to 4 pack T01a): both modes keep a
  complete publication (`arm: kept <arm>/<shard>: already published`), refuse a partial one (`arm: incomplete publication
  <arm>/<shard>: a ruling is required`) and refuse a shard whose stored producer differs from today's tree or harness
  (`arm: producer changed ...`), before writing anything; the runs JSON is written last. **`--done-only`** publishes every
  done shard and names every shard that is not done (`arm: not published <arm>/<shard>: not done (<r> of <e> rows
  recorded; its rows count as missing)`); it is run for every arm of a stopped plan before a closure, an activation
  reading or a fit. The default mode still refuses a shard that is not done.
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
names (`tools\ig-proto\lock\ig-lock.ps1` from V4-T11h on).

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
  . .\tools\ig-proto\lock\ig-lock.ps1
  Invoke-IgNode -Repo pentomino -Task 'V4-T02a verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T02a')
  ```

  (From V4-T11h on the helper is the pentomino copy, dot-sourced at the repository root; before it the shared helper
  `C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1` was.)

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
described in "Stage-1 item kinds" below, `runProcessItems`, which runs an item as a child process instead of a lane
job (V4-T10b), in "The `fewestColumn` profile (V4-T10b)", and `runCustomItems`, which runs an item through a dispatch the
caller gives (V4-T10c), in "Pool probe (V4-T10c)".

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
- **Reserve and cut.** The item kinds (the three of stage 1 and `v4-kernel`) are admitted by a reserve and cut by the
  parent at `H - 15` (with `e` the seconds since the node process started and `H` the invocation's horizon); the reserves
  are `DEFAULT_LIMITS.itemReserveS` of `lib/lanes.mjs`, which `runItems` also checks before it starts the lanes of a group.
  The existing kinds keep their rules (`rate`: `e + 30 <= H`, a defect after 30 s; `call`: `e + 120 <= H - 15`, cut at
  `H - 15`). After a group in which a job was not admitted or an item ended `censored`, the invocation starts no
  further group; the next invocation continues with the items that have no `item-end`.

  | Kind | Admitted when | Cut | Lanes |
  |---|---|---|---|
  | `v4-select` | `e + 120 <= H - 15` | at `H - 15`, `censored` | 2 |
  | `v4-generate` | `e + 245 <= H - 15` | at `H - 15`, `censored` | 1 (its pool has 1 worker) |
  | `v4-replay` | `e + 120 <= H - 15` | at `H - 15`, `censored` | 2 |
  | `v4-kernel` (V4-T10a) | `e + 90 <= H - 15` | at `H - 15`, `censored` | 1 |

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

`v4-check.mjs` (V4-T04c, V4-T04d, V4-T04f and V4-T11d; reviews R06, R2-14, RV3-02, R3-02, R4-03, RV5-01 and RV5-03; D-V4-14 and D-V4-18) holds the tool that
runs the stage-1 item manifests, the two verdicts that judge them, the stage-1 receipt and the receipts of the parity and P-0
passes. Its subcommands are `run`
(T04c), `summary` and `pm4-gate` (T04d; see "The stage-1 receipt"), `evidence-check`, `accept` and `check-binding` (T04f;
see "The accepted binding (V4-T04f)") and `receipt` (T11d; see "Parity and P-0 receipts (V4-T11d)"). The verdicts are pure exports.

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
    binding of a receipt of the kind `stage1` and prints `accepted: <receipt> sha256 <hash> -> <binding>` (exit 0); T11d
    adds the kinds `parity` and `p0-identity`, which also need `--step <S> --manifest <path>` (see "Parity and P-0
    receipts (V4-T11d)").
    **A binding is written once and never rewritten**: an existing `--binding` file exits 1 (`v4-check: binding <path>
    exists (an accepted binding is never rewritten)`); another kind exits 1 (`v4-check: accept knows the kinds stage1,
    parity, p0-identity`; N-V4-13 adds `live-deadline`); a receipt that does not bind exits 1 with the reason of
    `stage1Expectation`, `stepExpectation` or `acceptedBinding`.
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

### Parity and P-0 receipts (V4-T11d)

Every arm used later needs a typed parity receipt (P-1), and `v4` needs a proof that its stage-1 results still hold on the
final trees (P-0). Both are receipts of a finished step under `tests/artifacts/ig-proto/frozen/<T>/<S>/` and of its manifest
(reviews R3-02, RV3-02 and RV5-03; D-V4-18 and D-V4-19); the compiled plan `V4-S2` (and, from T11e, `V4-S4`) calls them
(`receipt-<arm>`, `accept-<arm>`, `receipt-p0`, `accept-p0`).

- **`receipt --kind <parity | p0-identity> --task <T> --step <S> --manifest <path> --arm <A> [--baseline <binding>]
  [--require-pass] --label frozen --source-label <SL>`** (unlocked). A missing option, another kind or `p0-identity`
  without `--baseline` writes the reason on stderr and exits 1, with nothing written. Otherwise it captures the step's inputs,
  writes `evidence/frozen/<T>/<S>.receipt.json` (a passing receipt is written once: an existing passing receipt, or one that does
  not parse, is refused with exit 1 and nothing is written; a `fail` or `incomplete` receipt is written again, from the same
  observations; a stopped plan resumes as check-list §3.2 says) and prints `receipt:
  <kind> <verdict> -> <path>`; a receipt that is not `pass` also gets one stderr line with its first reasons. It exits 0 once
  the receipt is written; **with `--require-pass` it exits 2 when the verdict is `fail` or `incomplete`, after the receipt
  is written** (the evidence first), which stops the plan (`run-task.ps1` stops on any non-zero unlocked step).
  `--arm` names the arm the receipt is for (the plans' `current` ids name it): it must be one of the step's observed
  variants, else the receipt is `incomplete` (`arm <A> is not among the observed variants (...)`).
- **Captured inputs** (`captureStepInputs(task, step, identity)`, R4-03, as T04d's for stage 1), before the receipt, under
  `evidence/frozen/<T>/inputs/<S>/`: `<variant>.ig-tree.json` for every variant of the stored `identity.treeIds`, only when
  the tree as built now has the stored id (else no copy and the reason `stale tree <variant> (<stored> vs <current>)`), and
  `harness.json`, only when `harnessInfo().harnessHash` is the stored `harnessHash` (else `producer changed since the
  observation`). It returns `{ copies, reasons }`; a reason makes the receipt `incomplete`. No tree folder, variant file or
  harness file is listed as evidence.
- **The blocks.** `isV4` is `(variant) => variant !== 'base'` (every other variant of a parity manifest has `v4` in its chain),
  so the routes and the manifest hash equal the run's without reading a tree folder. `stepEvidence(T, S, M, isV4)` reads the
  step (its problems make the receipt `incomplete`). The `parity` block is T04c's `parityVerdict`, unchanged, over the
  selection rows (the rows that have a mode: a P-1 step also holds a generation item and its replays, whose rows have no
  route and would put their (variant, case) group in `parityVerdict`'s failing mixed-route case). Kind `parity` adds the
  `replay` block, T04c's `replayVerdict` over the whole step; kind `p0-identity` adds the `baseline` block and needs no
  generation or replay item. The verdict is `fail` when a block fails, else `incomplete` when a block, the step or an input
  is incomplete, else `pass`.
- **`baselineVerdict(rows, baseRows, params)`** (pure). Rows are joined by `variant|caseId|seedText|mode`, never by the
  storage item id (the historical ids are `parity:...`, the P-0 ones `p0-v4:...`). Per `absent` row of the step: no baseline
  row is `fail` (`no baseline for <key>`); a row that is not `completed` or lacks a string `result.digest` on either side is
  `incomplete` (`no result digest for <key> (now|baseline)`); other `result.digest`s are `fail` (`result changed <key>`).
  `eventsDigest` is `null` in absent mode and is never read; the modes `charge` and `record` are not compared (their
  equality is the parity block's). `params` is `[{ variant, now, baseline }]`, the hashes of each variant's parameters now
  (the captured copy) and in the stage-1 binding: a `null` baseline is `fail` (`no baseline parameters for <variant>`), a
  different hash `fail` (`parameters changed <variant>`; a variant without a copy has `now` `null`). `fail` wins over
  `incomplete`; no `absent` row at all is `incomplete` (`no absent rows to compare`), never a vacuous pass. It returns
  `{ verdict, reasons, rows: [{ key, now, baseline, equal }] }`.
- **The baseline** is read only through the stage-1 accepted binding (`--baseline
  docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json`): `checkAccepted(binding, { current: [] })` (a
  binding that is not `pass`, or missing, makes the block `incomplete`, `baseline binding: <reasons>`; stage 1 holds and
  `current: []` is declared because the harness work of T05 to T10 moved the `v4`-family tree ids while the parameters
  stayed, D-V4-05), then the stage-1 parity step is read as a historical observation (`stepEvidence('V4-T04', 'parity',
  'tools/ig-proto/plans/V4-T04.parity.json', isV4, { historical: true })`: its stored tree ids are not compared with today's).
  Nothing under the stage-1 namespaces is written. The receipt's evidence lists the binding and the stage-1 parity `items.jsonl`.
- **The receipt** is `proofEnvelope({ kind, verdict, source, harnessHash, arms, coverage, evidence, fields })` with `source` the
  frozen commit and the step's stored `sourceDigest`, `harnessHash` the stored producer, `arms` every variant of the stored
  `treeIds` (`{ id, treeId: stored, paramsHash }` of the captured copy, `null` without one), `coverage` the manifest's item
  ids (`observed` those that ended `completed`, `censored` those that ended so), `evidence` (repository-relative paths and
  `sha256File`) the step's `items.jsonl` and `state.json`, the manifest, every captured copy and `harness.json` and, for
  P-0, the baseline binding and the stage-1 `items.jsonl` (a file that does not exist is `missing input <path>`, which makes the
  receipt `incomplete`), and the fields `blocks` (`{ parity, replay }` or `{ parity, baseline }`, the verdicts), `details`
  (each block as `{ verdict, reasons, rows }`; step rows as `{ item, status, detail }`, as stage 1's), `identities` (`{ now:
  <the stored identity>, baseline: <the stage-1 stored identity, or null> }`) and `reasons` (the step's problems, then `<block>:
  <reason>` of every block that is not `pass`, then the input reasons, each once; empty on `pass`). Reasons are written without
  the worktree's absolute path.
- **`accept`** gains the kinds `parity` and `p0-identity` (the dispatch is on the receipt's `kind`; `--step` and `--manifest`
  are required for them, else exit 1). `stepExpectation(T, S, M, kind)` builds the expectation from the step's stored identity
  read as a historical observation (every manifest, log and source check stays, no comparison with today's trees; a problem
  is `accept: <problem>`), the producer from the stored `harnessHash`, the arms and the captured parameters from the copies under
  `inputs/<S>/` by T04f's rule (`accept: no captured tree metadata for <variant>`; `accept: captured tree <variant> differs from
  the observation (<stored> vs <copy>)`), the coverage from the manifest's item ids and the fields from the kind: `{ blocks: {
  parity: 'pass', replay: 'pass' } }` or `{ blocks: { parity: 'pass', baseline: 'pass' } }`. A consumer checks a parity binding
  with `current: [<arm>]`; the P-0 binding (`V4-S2P/p0-v4.accepted.json`) with `current: ['v4']` against the final trees, while the
  stage-1 binding stays `current: []` (`check-binding --current v4` against it reports `stale arm v4` by design).
- **Self-test.** Twelve cases appended to `--items`, on synthetic step folders under the scratch task `V4-T11d-selftest` (raw
  folder and evidence folder removed after each case): the absent digests decide, not the events digests; storage ids do not
  matter; a missing baseline fails closed; a required pass stops the plan; each kind has its blocks; the stage-1 files keep their
  hashes; a parity binding from the stored identity; a P-0 binding names the baseline block; the baseline binding and the results
  decide the baseline block (changed results, other or missing parameters, a missing baseline row, changed or missing binding,
  another arm); the inputs are captured only when they are what the observation stored; a P-0 receipt over a synthetic
  copy of the real stage-1 results, run against the real stage-1 binding (read only: its hashes are compared before and after);
  and a passing receipt is written once (a second run, also with `--require-pass`, and a receipt that does not parse are refused
  with exit 1, the receipt and every captured input byte-identical; an `incomplete` receipt is replaced).

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

The stage-4 arms of the matrix are written by the stages 2 to 4 pack (see `## The frozen family`).

## The frozen family (stages 2 to 4 pack)

The variants, tables and checks of the freeze of plan v4's stage 3 and of the stage-4 runs; plan
`docs/improve-generating-stages-2-4/plan.md`, pack `tasks/improve-generating-stages-2-4/`.

### The prior table prior-s3-v1 (T06a)

`data/prior-s3-v1.json` is P4's table prior of the freeze: 27 cells, the 15 `nightmare@<area>` entries of `prior-v1.json` copied unchanged and a
complete Hell 1 table of 12 `hell-1@<area>` entries (the start is `clamp(round(share x K), 1, K - 2)`, the prototype's `priorCount`). It is written
by `fit-prior-s3.mjs` from committed records only (it reads, rates nothing and runs unlocked), with the SHA-256 of every file read in its `source`.
Seeds of the fitting reps only (plan 4.7): no validation, Master or second-validation rep is read.

- **Piloted boards** (`14x14-hell-1`, `20x20-hell-1`, `24x24-hell-1`, `26x26-hell-1`; areas 196, 400, 576, 676): from
  `evidence/frozen/V4-S2/fr-base/pilot-<cell>.calls.jsonl`, every call whose `end` line has a finite `locate.wc`; per rep (0 to 4, the `start` line's
  `row`) the median of `wc / K`; the share is the median of the five per-rep medians, rounded to 6 decimals (`pilotShare`).
- **The other eight areas** (215, 256, 300, 324, 360, 420, 480, 484): from IGP-05's `families-windows.jsonl` and `families-failed-sets.jsonl`, the
  `hell-1` families of the case; per family the median of `count / K` of the probes that are `eligible && inBand` (a family without one is skipped);
  per seed the median of its families'; the share is the median over the seeds, rounded to 6 decimals (`familyShare`).
- **Check and write.** Without `--write` the file must exist and equal the recomputed table (exit 0, `reproduced`, else 1); `--write` writes it and
  refuses an existing file: written once, a different table is a new id (`prior-s3-v2`), never a rewrite.

  ```
  node tools\ig-proto\fit-prior-s3.mjs --label frozen --source-label <SL>
  node tools\ig-proto\fit-prior-s3.mjs --write --label frozen --source-label <SL>
  ```

  `fr-frozen` loads the table through `paramFiles.prior` with `priorTable` `prior-s3-v1` (T08a).
- **Self-test.** Two cases of the `--items` group: `prior-s3: the rules on synthetic records` (both rules and the two refusals) and `prior-s3: the
  table of plan 4.1` (27 cells, the 12 shares of the plan, the 15 Nightmare entries equal to `prior-v1`'s, the pilots' counts 68, 75, 70, 64).

### The budget by mode and the per-set levels (T06b)

Two small variants, the frozen-family edits of plan 4.3 that T08a composes into the four frozen variants; each is inert without its parameter and
changes no file of the `v4` chain (`check-binding --current v4` stays `pass`). Neither is an arm of its own.

- **`p5-mode`** (extends `v4`; edits `fz-1`, `fz-2` in `core/engine/clues.js`): P5's call budget by uniqueness mode and level. The parameter is
  `IG.callBudget = { id, any: { <level id>: units }, require: { <level id>: units } }` (the freeze: `any` Nightmare 10 G, Hell 1 40 G; `require`
  Nightmare 32 G, Hell 1 40 G). The copy-only search reads `ctx.igBudget ?? callBudgetOf(IG.callBudget, target)` and no edit can reach it, so the
  dispatch `selectClues` calls `igModeBudget(ctx)`, which gives the search the call's `igBudget`. An absent or non-positive entry is no budget
  (`Infinity`); a seam `igBudget` already on the context wins. Without a table of the mode shape (undefined, null, or the level-keyed shape of `v4-p5`,
  with no `any` and no `require` key) the context is returned unchanged, and the object is never mutated.
- **`ps-levels`** (extends `v4-ps`; edits `fz-3`, `fz-4` in `core/browser/generation-client.js`): the per-set prior only on the levels of
  `IG.perSetLevels` (the freeze: `['hell-1']`), through `igPerSetLevel(levelId)`; an unlisted level gets no `igPrior` and falls back to the table
  prior. Without the parameter (undefined or null) the prior applies on every level as in `v4-ps`; a value that is not an array lists no level.
- **Self-test.** Three cases of the `--v4` group (through the lock helper): `fz: budget by uniqueness mode (rule)`, `fz: p5-mode is inert without its
  parameter` (`v4` and `p5-mode` give the same budgeted and unbudgeted results) and `fz: per-set prior levels (rule)`. The real frozen parameters are
  T08c's cases.

### The live request deadline (T07a to T07c)

The `live` variant (extends `v4-link`) is the client and pool half of N-V4-13's live request deadline (plan 4.5); T07a adds `lv-1` to `lv-9`, T07b adds
`lv-10` to `lv-19` (the host's hard response bound) and T07c its scripted-pool cases. Today a request runs two separate 115-s clocks, the set stage's and
then the batch's; with the parameter both share one clock from the request start.

- **The origin.** The host gives `igOrigin`, a reading of the client's own clock taken at the request start (T07b passes the row's `s.t0`). The pool's
  `beginRequest({ requestId, revision, onTimeout, igOrigin })` (`lv-1`, `lv-2`) starts its request at `igOrigin` when it is a finite number not later than
  now, and arms the stop `TIME.dispatchStopMs` (115 s) after it, at once when that time has passed; a missing, non-finite or later origin is ignored
  (today's start). `expire` and `checkDeadline` are unchanged.
- **The set stage's cut.** `igLiveOf(input, levelId, clock, live = IG.liveDeadline)` (`lv-9`) returns `{ origin, setCutAt: origin + setStageCapMs }`, or
  `null` when the parameter is null or lacks the level or a finite cap, or the input's origin is missing, not finite or later than now. The set stage
  (`lv-5` to `lv-7`) passes the origin to the pool, arms a timer that wakes it at `setCutAt`, and after `v4-p5`'s bound and the ordered scan, and before
  any new attempt, returns `{ status: 'failed', reason: 'reserve-cut', failures }` (a bench row's `partialReason` `set:reserve-cut`) once the cut has
  passed. The batch (`lv-8`) shares the origin; the generation stop at 115 s keeps today's `time-limit`.
- **The parameter** `liveDeadline { id, levels, reserve, setStageCapMs, generationStopMs, responseBoundMs, hostMarginMs }` (the freeze: `deadline-s3-v1`,
  `['nightmare', 'hell-1']`, 0.6, 46000, 115000, 120000, 1000), default `null`: the variant is inert without it and for every level it does not list.
- **The host's hard response bound** (T07b, `lv-10` to `lv-14`). `igBoundStart(s, caseDef, clock, client)` in the copy's `tools/bench/runner.js`
  starts at the request origin (`s.t0`, before the set call; the host passes it as `igOrigin` to `generateSet` and `generateBatch`) and, for a level the
  parameter lists, fires at `t0 + responseBoundMs - hostMarginMs` (119 s): it cancels the client and ends the request at once. In the set phase the
  response is `{ status: 'failed', reason: 'response-bound', failures: {} }` (`partialReason` `set:response-bound`), even while the set still assembles its
  pack. In the batch phase it is the client's prefix snapshot `client.igPrefix()` (`lv-16`, `lv-18`): `{ status: 'partial', reason: 'response-bound',
  accepted, made, seenLayouts, seenClues, pack }`, the batch's own accepted prefix with its provenance and seen histories, and for a non-empty prefix a
  pack assembled at once from the same parts as the batch's final assembly and validated by the synchronous `validatePack` (an invalid pack throws
  `GenerationError('internal')`). After the bound the host never awaits the batch, its pool tasks or its pack assembly; a result that settles first is
  returned unchanged, and the timer is cleared on every terminal path. For a level the parameter does not list, the promises are returned unchanged.
- **The assembly gate** (`lv-15`, `lv-17`): the client option `igAssemblyGate(phase)` (`'set'` or `'batch'`, returning a promise) is awaited just before the
  set's and the batch's `assemblePack`, so that scripted cases (T07c) can hold an assembly beyond the bound. A test seam: the bench and the product never
  set it.
- **`live-test`** (`extends ['live', 'w8']`, test only, never an arm, a plan step or a binding's `current` id): the deadline on the fixture level `hard`
  (`deadline-test`, `levels ['hard']`) with the eight-worker pool limit, for the scripted cases. The case factories `hostBoundCase(variant)` and
  `liveCases(variant)` are run again by T08c on the bounded frozen twins.
- **The scripted cases** (T07c, the factory `liveCases(variant)` of `self-test.mjs`, run on `live-test`; its helper `batchFixture(variant)` chooses, as
  `fixture()` of `tests/generation-client.test.js` does, ten real candidates of the generation fixture from the tree's own engine, so that attempt 0 of
  slot `s` gives the `s`-th puzzle of the fold). Six cases on the scripted pool (`lib/fake-pool.mjs`, the fake clock):
  - *the set stage is cut by the reserve*: with the origin, every attempt held gives `reserve-cut` at 46 s (pending at 45.999 s, every held worker
    terminated); a higher success while attempt 0 runs does not stop the cut; a success of attempt 0 at 45 s completes; without an origin the stop is the
    request's own 115 s;
  - *one clock from the request start and the prefix at the stop*: a batch started 40 s after the origin stops at origin + 115 s with the three answered
    puzzles (`partial`, `time-limit`), every held task cancelled and late messages changing nothing; without an origin it stops at its own 115 s;
  - *the same puzzles at widths 1, 2, 4 and 8 without a cut*: the ten fold puzzles in the same order at every pool width;
  - *a cut leaves a prefix of the same fold at every width*: with every task answered 30 s after it is sent, the stop at 115 s leaves a prefix of the same
    fold of 3, 6, 10 and 10 puzzles at widths 1, 2, 4 and 8 (`partial`/`time-limit` at widths 1 and 2, `complete` at 4 and 8); a `NOTE` line prints the
    lengths and the end times;
  - *the deadline applies to the listed levels only* (`igLiveOf`: the level `hard` yes, `easy` and a request without an origin no);
  - *the host bound around a held assembly*: with `igBoundStart` of the tree's runner and the assembly gate, (a) a batch whose own pack assembly is held
    beyond the bound gets its response at origin + 119 s exactly (`partial`, `response-bound`, the three fold puzzles, a valid pack) while its own
    promise stays pending, and after the release its own result (`partial`, `time-limit`) has the same `made`, seen histories and pack as the response,
    which does not change; (b) a set whose pack assembly is held after a success at 10 s ends the set phase at 119 s with `response-bound`, and the
    release changes nothing.
- **Self-test.** Eleven cases of the `--v4` group: `live: the pool starts a request at its origin`, `live: igLiveOf rule`, `live: inert without its
  parameter`, `live live-test: the host's hard response bound`, `live: the host bound is inert without its parameter` and the six scripted cases above
  (`live live-test: ...`).

### The four frozen variants (T08a)

The four stage-4 arms of `data/frozen-round-v1.json` are four manifests with no edit and no file of their own: they share the one edit set of their chain
and differ only in parameters (`variants/fr-frozen.json`, `fr-frozen-none.json`, `fr-frozen-uncapped.json`, `fr-frozen-none-uncapped.json`). Each algo id is
`gen-v4-proto:<variant>` (at most 36 characters; the longest is `gen-v4-proto:fr-frozen-none-uncapped`).

| Arm | Extends | Role |
|---|---|---|
| `fr-frozen` | `fr-base`, `v4-ps`, `v4-p5`, `live`, `p5-mode`, `ps-levels` | the freeze |
| `fr-frozen-none` | `fr-frozen` | the freeze without any screen |
| `fr-frozen-uncapped` | `fr-frozen` | the comparator of `fr-frozen` (RV3-04): no call budget, no set-attempt bound, no live deadline |
| `fr-frozen-none-uncapped` | `fr-frozen-none` | the comparator of `fr-frozen-none` (RV3-04), uncapped the same way |

- **The chain** of `fr-frozen` is `base > instr > log > v4 > link > v4-link > fr-base > v4-ps > v4-p5 > live > p5-mode > ps-levels > fr-frozen`
  (`lib/tree.mjs` `chainOf`: depth first, ancestors first, each once). Its 90 edits are the 57 of `fr-base`, 7 of `v4-ps`, 3 of `v4-p5`, 19 of `live`, 2 of
  `p5-mode` and 2 of `ps-levels`. Parameters merge in chain order and `paramFiles` override by name, so its `prior` is `data/prior-s3-v1.json` (T06a)
  instead of `v4`'s `prior-v1`.
- **The parameters of `fr-frozen`** (plan 4.1, D-P24-02):

  | Parameter | Value |
  |---|---|
  | `priorTable` | `prior-s3-v1` (27 cells) |
  | `screenTable`, `screenClasses` | `screen-s3-v1`; `hell-1` none, `n-small` none, `n-mid` 190 M, `n-large` 190 M |
  | `rerate`, `rerateMax`, `c4` | `rescue`, 4, `false` |
  | `callBudget` | `budget-s3-v1`; `any` Nightmare 10 G, Hell 1 40 G; `require` Nightmare 32 G, Hell 1 40 G |
  | `setAttemptsBound` | 4 |
  | `liveDeadline` | `deadline-s3-v1`; levels `nightmare` and `hell-1`, `reserve` 0.6, `setStageCapMs` 46000, `generationStopMs` 115000, `responseBoundMs` 120000, `hostMarginMs` 1000 |
  | `perSetLevels` | `['hell-1']` (the per-set prior of `v4-ps`, on Hell 1 only) |

- **The differences.** `fr-frozen-none` differs from `fr-frozen` only in `screenTable` (`screen-s3-none`) and `screenClasses` (no class has a screen).
  Each uncapped twin differs from the arm it judges only in `callBudget`, `setAttemptsBound` and `liveDeadline`, all three `null`, which makes each inert:
  `igModeBudget` leaves the context, `igSetBound` does not fire, `igLiveOf` and `igBoundStart` keep today's two timers.
- **Runtime classes.** `ig-select-v4.js` keeps four classes (`n-small` up to 144 cells, `n-mid` 196 to 324, `n-large` 360 and more, `hell-1`); the freeze's
  `n-mid` (196 to 256 cells) and `n-upper` (257 to 324) both fall in the runtime `n-mid`, at 190 M. T08b checks it per comparator cell.
- **A candidate epoch** until T12b records it in `freeze.json`: the four trees are proved by `V4-S3P` and read by T11, and nothing else depends on their tree
  ids until then.
- **Self-test.** One case of the `--v4` group (through the lock helper): `fr: the four frozen variants and their differences` (the chain, the parameters
  above, the differences, the uncapped twins, each algo id), which prints a `NOTE` line with the four tree ids and parameter hashes.

### The freeze checks (T08b)

`freeze.mjs` holds the freeze of plan 4.1 and 4.2 as constants (`FREEZE_CLASSES`, `FREEZE_BOUNDS`, `FREEZE_TABLES`, `FREEZE_VALUES`, `FROZEN_VARIANTS`;
`classOf(levelId, area)` gives the class of a board) and proves the four frozen trees against them before the record `freeze.json` exists (T12b writes it
once; `check` writes nothing, builds or reuses the trees, rates nothing and runs unlocked). The 19 comparator cells of the initial collection, each in one
class:

| Class | Cells | Bounds | `W` of `fr-frozen` (`fr-frozen-none`: none) |
|---|---|---|---|
| `n-small` | `3x29`, `10x10`, `12x12` Nightmare | Nightmare, 1 to 144 cells | none |
| `n-mid` | `14x14`, `15x15b10`, `16x16` Nightmare | Nightmare, 196 to 256 | 190 M |
| `n-upper` | `15x20`, `18x18` Nightmare | Nightmare, 257 to 324 | 190 M |
| `n-large` | `18x20`, `20x20`, `20x21`, `32x15`, `22x22`, `24x24`, `26x26` Nightmare | Nightmare, 360 and more | 190 M |
| `hell-1` | `14x14`, `20x20`, `24x24`, `26x26` Hell 1 | Hell 1, any area | none |

The six checks, in this order (a failure is a question for the pack author, never a changed constant):

1. `classes`: T11e's pure `activation` over the default expansion and the published `V4-S2` pilots gives 19 comparator cells, both conditional boards
   (24x24 and 14x14 Hell 1) activated, and `freezeMismatch` (`activate`'s own refusal) finds no cell outside a class, in two classes or unmeasured.
2. `bounds`: every cell's catalogue level and area fall in its class by `FREEZE_BOUNDS`.
3. `runtime W`: for each of the 19 cells on `fr-frozen` and on `fr-frozen-none`, the tree's own `classW` returns the class value (190 M, or `DEDUCE.work`
   for none), so the runtime classes (`n-mid` covers 196 to 324) apply the freeze's.
4. `parameters`: the tables, `callBudget`, `setAttemptsBound`, `c4`, `rerate`, `rerateMax`, `perSetLevels` and `liveDeadline` of `fr-frozen` are the
   values; `setStageCapMs` is `round((1 - reserve) x generationStopMs)`, and `generationStopMs` and `responseBoundMs` are the tree's `TIME.dispatchStopMs`
   and `TIME.responseMs`; `fr-frozen-none` has `screen-s3-none` and four null classes.
5. `differences`: each uncapped twin differs from its arm exactly in the matrix's `comparatorDifferences` (`callBudget`, `liveDeadline`,
   `setAttemptsBound`), all null; the two screen arms differ only in `screenClasses` and `screenTable`.
6. `prior`: `data/prior-s3-v1.json` is reproduced by `computePriorS3` and is `fr-frozen`'s `prior`.

```
node tools\ig-proto\freeze.mjs check --label frozen --source-label <SL>
```

It prints `freeze: <name> pass (<detail>)` per check, then `freeze: check pass (6 checks; <variant> <first 12 hex of the tree id>, ...)` and exits 0, or
`freeze: check failed (<n> of 6)` and exits 1. `readPilots` and `freezeMismatch` of `manifest.mjs` are exported for it (no other change).

- **Self-test.** One case of the `--items` group: `freeze: classes, bounds and values` (`classOf` at every bound, the 19 distinct cells, the two arms of
  each class, each cell in its class, the five class ids of `W`).

## Admission statistics (V4-T09a)

The statistics of plan section 5.2 are fixed in code before any validation seed runs (the provisional seeds are
fitting data). `verdicts.mjs` holds their row level; V4-T09b adds the pairing and the class statistics, V4-T09c the work
ledger and the class verdict, V4-T09d the global verdicts and V4-T09e the verdict tool, which reads a verdict manifest
(`data/verdict-manifest.schema.md`: the purpose, the collection, the hashed runs files and tree ids, the expected P5
pairs and the accepted prerequisite bindings). Missing, invalid, censored or erroneous data is incomplete evidence and
never a pass; an invalid puzzle or pack is a correctness failure. The module loads the record schema
(`validateRunRecord`) from the frozen source (`sourceRoot('frozen')`), so it needs the snapshot of V4-T01a.

- **Run status** (`runStatus(run, { quantity })`, one run record of `tools/bench/report.js`; the first match wins, and
  `problems` names the conditions of the winning status).
  1. `invalid`: `validateRunRecord` returns a problem; `probeKind` is not `generation`; `acceptedCount` is not an integer
     from 0; `responseMs` is not a finite number from 0; or `acceptedCount >= quantity` and `tenthReadyMs` is not a
     finite number from 0 to `responseMs`.
  2. `incorrect` (a correctness failure, apart from missing evidence): an `errors` entry of phase `validation` (codes
     `invalid-puzzle`, `invalid-pack`) or `certificates` (`unexpected-unsatisfiable`), or `partialReason`
     `invalid-accepted`.
  3. `censored` (no measurement exists, never a measured failure): `measurementValid` false, `interrupted` true, or an
     `errors` entry of phase `host` (a `child-timeout` or another child failure, the runner's host error).
  4. `error`: any other `errors` entry (a typed generation fault of phase `set` or `batch`, a `sampling` error).
  5. `valid`: none of these. A normal measured failure is valid: `partialReason` `set:<reason>` (`set:not-in-band`,
     `set:no-window-below`, `set:time-limit`) or a batch reason (`time-limit`, `partial`) with fewer than ten puzzles.
- **Published rows** (`{ rowKey, caseId, rep, seed, localRep, run }`, `arm.mjs publish`). `ingestRow(row, { quantity })`
  returns `{ rowKey, caseId, rep, seed, run, status, problems }`: `invalid` also when `run.caseId` or `run.seed` is not
  the row's, else the status of its run. Only `valid` rows enter a statistic.
- **Completion and the capped time, apart from the deadline** (D-V4-16; plan section 5.2, one endpoint). A valid row
  reaches ten (`reachedTen`) when `acceptedCount >= quantity`, whatever its time. Its capped T10 (`cappedT10`) is
  `Math.min(tenthReadyMs, capMs)` when it reaches ten, else `capMs` (120,000 ms). A deadline violation
  (`deadlineViolation`) is `responseMs > responseBoundMs` (120,000 ms), reported apart and enforced by the live-deadline
  receipt (N-V4-13), never by the completion count: a request with ten puzzles at 125 s completes, enters the ratio
  statistics at 120 s and is one deadline violation. `completion(rows, { quantity, capMs, responseBoundMs })` over
  ingested rows returns `{ requests, statuses, reachedTen, deadlineViolations, p95Ms }`; the two counts are over valid
  rows only, `statuses` counts every row by status.
- **The p95 tail observation.** Over exactly 20 valid rows, the second-largest uncapped T10 (a nearest-rank p95 of 20),
  a row that did not reach ten being larger than every number; `null` when that second-largest is such a row or when the
  cell does not have exactly 20 valid rows. It is reported, never gated.
- **Per-puzzle evidence** (`puzzleEvidence(run)` returns `{ keys, clues }`, each `null` when complete or the reason it
  is not). The `instr` variant writes `run.details.igPuzzleKeys` (one SHA-256 hex key per accepted puzzle, in order) and
  the runner `run.details.K` and `run.details.puzzles[].clues`. A valid row with `acceptedCount` 0 has complete evidence
  (an empty list) whatever `details` holds. Otherwise the keys must be an array (`missing puzzle keys`) of exactly
  `acceptedCount` entries (`puzzle keys: <length> of <acceptedCount>`), each 64 lower-case hex digits (`malformed puzzle
  key <index>`) and all distinct (`duplicate puzzle key <index>`, the later one); and `K` an integer from 1 (`missing
  K`) with a `puzzles` array (`missing clue counts`) of exactly `acceptedCount` entries (`clues: <length> of
  <acceptedCount>`), each `clues` an integer from 0 to `K` (`clue out of range at <index>`). Missing per-puzzle evidence
  is never equality and never a zero difference: the consumers (V4-T09b to V4-T09d) make the affected statistic or gate
  incomplete. The functions are fail-closed beyond the table: a missing option (`quantity`, `capMs`,
  `responseBoundMs`) throws, `cappedT10` throws on a request with ten puzzles and no T10 (not a valid row), and a run
  whose `acceptedCount` is not an integer from 0 has incomplete evidence.
- **Pairing** (V4-T09b; `pairRows(rowsA, rowsB, reps)` over the ingested rows of one cell; class use: A the screen arm,
  B the no-screen arm; no-regression use: A after, B today's). Two rows are the same request when `caseId`, `rep` and
  `seed` are equal, and the manifest declares each cell's replicates (`reps`, a non-empty list of distinct integers).
  A **pair** exists at a declared rep only where each arm has exactly one row, both are `valid` and their case and seed
  agree; it is `{ rep, seed, a, b }` (the ingested rows), in the order of `reps`. Every other state is a pairing
  problem, a string in `problems`, and the statistic that needs the pair is incomplete: `missing row: side <a|b> rep
  <r>` (a declared replicate without a row), `duplicate rows: side <a|b> rep <r> has <n>` (two rows of one arm at one
  rep, whatever their seeds), `status <status>: side <a|b> rep <r> (<first problem>)` (a row that is not `valid`),
  `seed differs at rep <r>: ...` and `case differs at rep <r>: ...` (the arms disagree at one rep; a rep has one seed)
  and `row outside the declared replicates: side <a|b> rep <r>`. An `incorrect` row is also a correctness failure,
  listed in `incorrect` as `{ side: 'a' | 'b', rep }` wherever it stands (a duplicate or an undeclared row does not hide
  it). Rows that were not ingested (`ingestRow`), or repeated or missing reps, throw.
- **Matched sets** (IG-P-Q35, RV3-08; `matchedSets(pairs)`). The per-set clue value is the median of
  `run.details.puzzles[].clues` (`median`: of an even list the mean of its two middle values). A pair is a **matched set**
  when the arms' `run.details.igSetKey` (written by the `instr` variant) are strings and equal, both arms accepted at
  least one puzzle and both have complete clue evidence (`puzzleEvidence(run).clues` is `null`); it is
  `{ rep, seed, screen, noScreen, d }` with `d = screen - noScreen`. A pair that meets the first two conditions but not
  the clue evidence is an **evidence problem**: it is not a matched set and is listed in `evidence` as `{ rep, side,
  problem }`, one entry per side (the problem is `puzzleEvidence`'s text, for example `clues: 0 of 10`), and T09c makes
  the class inconclusive by it; its completion outcome stays in the completion record. Any other pair (no set key, two
  set keys, a request without puzzles on one arm) is simply not a matched set. Incomplete clue evidence is never read as
  a zero difference.
- **The clue rule** (`clueRule(matched)`, pooled over the matched sets of every cell of the class): `{ n, medianDiff,
  moved2, pass }` with `moved2` the number of sets with `Math.abs(d) >= 2` and `pass = n > 0 && medianDiff <= 0.5 && 5 *
  moved2 <= n`; with no matched set `medianDiff` is `null` and `pass` false.
- **Resampling** (`mulberry32(seed)`; `fasterRule` and `noRegression`). `resamples` resamples of the declared
  replicate indices with replacement, each drawing `reps.length` indices `Math.floor(rand() * reps.length)` from one
  `mulberry32(resampleSeed)` stream; the same drawn indices apply to every cell of the class and a resample's value is the
  geometric mean (`geoMean`: `Math.exp` of the mean of `Math.log`) over every (cell, drawn index) pair. The lower bound is
  the value at index `Math.ceil(0.1 * resamples) - 1` of the ascending list (the 10th percentile; the plan uses 10,000
  resamples and writes the seed in the manifest).
- **Ratios and the faster rule** (`ratiosOf(pairs, reps, { quantity, capMs })`, `fasterRule(ratiosByCell, reps, {
  resamples, resampleSeed })`). A rep's ratio is `cappedT10(b.run) / cappedT10(a.run)`, no screen over screen in class
  use, so a request that did not reach ten enters at `capMs` (one endpoint for both arms: a failed arm can at best tie).
  `ratiosOf` returns the ratios in the order of `reps` and `null` for a rep without a pair. `fasterRule` returns `{
  geoMean, lower, cellGeoMeans, pass }`: the geometric mean over all (cell, rep) pairs, the resampled lower bound, each
  cell's own geometric mean, and `pass = geoMean >= 1.15 && lower > 1.0 &&` every cell's geometric mean `>= 1.0`.
- **No regression** (`noRegression(ratios, reps, { resamples, resampleSeed })`): the same recipe for one cell, with the
  ratio today over after (A after, B today's); `{ geoMean, lower, pass }`, `pass = lower >= 0.9`.
- **Fail closed beyond the table.** `median` of nothing and `geoMean` of nothing, of a zero or of a non-finite number
  throw; `fasterRule` and `noRegression` throw on a series that is not one ratio above 0 per declared rep (a `null` from
  `ratiosOf` is incomplete evidence, which the caller judges first, as the class procedure of V4-T09c does at its
  rule 2), on a cell-less input, and on `resamples` that is not a positive integer or a `resampleSeed` that is not an
  integer; `ratiosOf` throws on a missing `quantity` or `capMs` and on two pairs at one rep. `reachedTen` and
  `cappedT10` (which calls it) throw on a missing or invalid `quantity`, as `runStatus`, `completion` and `ratiosOf` do
  (V4-T09c): without it every row would read as "never reached ten".
- **The work ledger of a request** (V4-T09c; IG-P-Q37, D-V4-17; RV3-07, RV4-02). A worker killed inside a rating or a
  uniqueness count leaves that primitive's units unreported, but never unbounded: the primitive started with the proved
  bound of its `begin` line (V4-T02d). `parseLines(text, file)` returns `{ lines, problems }` for one journal file: an
  empty last line is ignored and every other line that is not a JSON object (a line cut by a kill, an empty line, a
  value that is not an object) is the problem `unparseable line <n> of <file>`, `n` from 1; the caller (T09e) joins
  these problems to its row's ledger. `rowLedger(lines, linkLines)` (`lines`: every line of the row's worker journals,
  each file's lines in file order; `linkLines`: the lines of `<rowKey>.link.jsonl`, `null` when the file is absent)
  returns `{ complete, problems, calls, ended, terminated, open, lo, hi, ratingWork, countWork }`, `complete` being
  true only without a problem. **The interval:** per call, `lo` is the sum of its completed primitives' reported units
  (every completed rating's `tuple[4] + tuple[5]`, every completed count's `units`); an ended call has `hi = lo`; a call
  closed by a confirmed termination has `hi = lo +` the `bound` of its one open primitive, and `hi = lo` when none is
  open (a kill between primitives). The row's `lo`, `hi`, `ratingWork` and `countWork` sum over the closed calls (an
  unclosed call adds nothing and is a problem); `calls` is the number of `start` lines, `ended` and `terminated` count
  the two kinds of closed call and `open` the open primitives whose bound `hi` adds; a bound that is not a finite number
  from 0 makes `hi` infinite. The numbers of an incomplete ledger are the best the lines allow, never evidence: nothing
  missing is read as zero work. **The ten rules**, each problem a string in `problems` (a repeated problem is listed
  once):
  1. `no linkage`: `linkLines` is `null`.
  2. `duplicate start <call>`: a call is one `start` line (a call id is `<row>:<pid>:<threadId>:<sequence>`).
  3. `unowned <t> line <call>`: a `p`, `phase`, `caps`, `begin`, `count` or `end` line whose `call` has no `start` line
     (a `call` of `null` included: the legacy route's `caps` and `count` lines are unowned).
  4. `invalid work <call>`: a `p` tuple whose `tuple[4]` or `tuple[5]`, or a `count` whose `units`, is not a finite
     number from 0.
  5. `missing caps <call>`: a call with an `end`, `p`, `begin` or `count` line and not exactly one `caps` line with
     `count: true` (a call with a `start` line and no other work line has no such problem).
  6. The problems of `pairPrimitives` (`lib/ledger.mjs`, imported unchanged): at most one primitive pending per call;
     `invalid begin <call> <index>`, `invalid bound <call>`, `overlapping begin <call> <index>` (at once, never removed
     by a later completion), `unpaired <t> line <call>`, `unquantified <outcome> <call> <index>` (a paired `p` line of
     outcome `unsat` or `error`: zero placeholders, not measured work; `capped` ratings are quantified) and `bound
     exceeded <call> <index>`, the index being the primitive's position among the call's `begin` lines.
  7. `duplicate end <call>`; and `open call <call>`: a call without an `end` line is closed only by a `worker-end` link
     line (`ev` exactly `worker-end`: never `worker-end-request` or `worker-end-failed`) whose `threadId` equals the
     call id's second field from the end, whose `pid` equals its third field from the end and whose `at` is at least the
     call's `start` `at`. A worker that died before its termination was requested has `threadId` -1: it closes no call,
     so its calls stay open (incomplete, never zero work).
  8. `reconcile <call>: <field> <sum> != <end value>` for an ended call: `work` (the sum of its `p` lines' units),
     `profiles` (their number) and `countWork` (the sum of its `count` units, an explicit 0 without one, against the
     `end` line's `locate.countWork`, which must be a finite number from 0); and `unfinished primitive <call>`: an ended
     call, whatever its result, with an open primitive (only a confirmed termination carries a bound).
  9. `unattributed call <call>`: a call whose stage is not `set`, `batch` or `completion` (`other`: no `igStage`).
  10. Every returned task matches its own ended call by identity, never by count: a `set-complete` link line with a
      selection outcome (not `carve` or `internal`) needs exactly one ended call of stage `set` whose `attempt` equals
      its `attempt` (`unmatched set attempt <j>`); a `complete` line with `ok: true` and an outcome other than `layout`
      one of stage `batch` whose `attempt` is `<slot>/<attempt>` (`unmatched batch candidate <slot>/<attempt>`); a
      `completion-complete` line with an outcome other than `layout` one of stage `completion` whose `attempt` is its
      `key` (`unmatched completion task <key>`), and a string `valueKey` must equal `key` (`completion key mismatch
      <index>`). A call answers at most one task; a completed call that answers none (speculative) counts in the sums
      but never stands in for another task's missing call.
- **The work rule** (`workRule(screenRows, noScreenRows)`, rows `{ ingested, ledger }`: T09a's `ingestRow` and
  `rowLedger`'s result). Per arm `{ lo, hi, accepted, loRatio, hiRatio, completedRatio, complete, rows, terminatedCalls }`:
  `lo`, `hi` and `terminatedCalls` summed over the rows, `accepted` the accepted puzzles of the valid rows, the ratios
  per accepted puzzle (`null` with none; `completedRatio` is `loRatio`, D-V4-17's former quantity), `complete` when every
  row is valid and every ledger complete. The verdict (IG-P-Q37): `unknown` when an arm is not complete or has no
  accepted puzzle; else `pass` when `screen.hiRatio <= noScreen.loRatio`; else `worse` when `screen.loRatio >
  noScreen.hiRatio`; else `unknown` (the intervals overlap: the class is inconclusive and uses no screen). Both
  intervals, the completed-unit ratio and `terminatedCalls` are reported, not judged; a kill count is never a bound.
- **The class verdict** (`classVerdict(input)`, `input = { cells: [{ cell, screenRows, noScreenRows, screenLedgers,
  noScreenLedgers, screenCellGate }], reps, resamples, resampleSeed, quantity, capMs }`; the rows are T09a's ingested
  rows, a ledger map goes from a `rowKey` to `rowLedger`'s result and a row without one has `ledger: { complete: false,
  problems: ['no journal'], lo: 0, hi: 0 }`; `screenCellGate` is T09d's, computed on the screen arm). It returns the
  first condition that decides, in this order (`decidedBy` in parentheses; `null` for `admitted`):
  1. (`correctness`) a pairing has an `incorrect` row: `failed`;
  2. (`incomplete-validation`) a pairing has a problem: `inconclusive`;
  3. (`evidence`) `matchedSets` of a cell has an `evidence` entry: `inconclusive`;
  4. (`matched-sets`) a cell has fewer than 15 matched sets with distinct seeds: `inconclusive`;
  5. (`clue`) the clue rule over the matched sets of every cell fails: `failed`;
  6. (`faster`) the faster rule over the ratios of every cell fails: `failed`;
  7. (`work`) `workRule` over every row of the class: `worse` is `failed`, `unknown` is `inconclusive` with `decidedBy`
     `work-unknown`;
  8. (`completion`) on a cell, the screen arm's valid rows reaching ten (`reachedTen`) are fewer than the no-screen
     arm's less 1: `failed`;
  9. (`cell-gate`) a cell's `screenCellGate` is `fail`: `failed`; else `incomplete`: `inconclusive`;
  else `admitted`. It returns `{ verdict, decidedBy, clue, faster, work, evidence, completion, problems }`:
  `completion` is `{ [cell]: { screen, noScreen } }` (the two counts of rule 8), `evidence` the entries of rule 3 with
  their `cell`, `problems` the pairing problems, the evidence entries and the problems of every incomplete ledger, each
  prefixed with its cell. Every statistic that can be computed is returned whichever condition decides (`faster` is
  `null` while a pairing problem leaves a rep without a ratio); the options are validated before any condition.
- **The global procedure** (V4-T09d; plan section 5.2, IG-P-Q29, Q30, Q32, Q33; section 3, P5; section 6's gate row). With
  the class verdicts, phase 0 needs the arm each cell ships, the gates judged on that arm, Master identity, the Hell 1
  report, P5's false stops and lost completions over the declared pairs, and the prerequisites. All of it is pure and
  fail-closed: a missing or malformed option throws, and missing evidence is `incomplete`, never a pass. The arm of a
  class is `shippedArm(verdict, cls)`: `cls.screen` when the class verdict is `admitted`, else `cls.noScreen` (a failed,
  an inconclusive and an unlisted class use no screen); each failing Nightmare cell and each control is judged on its
  shipped arm, and a failed or inconclusive class does not fail phase 0 when its no-screen arm passes the cell gates.
- **Dead ends** (`deadEnds(lines)`, the parsed lines of a row's journals): the number of distinct `call` ids with a `phase`
  line whose `phase` is `p2`, the frozen phase-2 entry, which the prototype journals under the same name (a `p2` line
  without a call id is one more entry: the safe side).
- **Cell gates** (`cellGate(kind, rows, { reps, quantity, capMs, responseBoundMs, todayRows, journals, resamples,
  resampleSeed })`; `kind` `failing` (a failing Nightmare cell: `journals` is needed) or `control` (`todayRows`, `capMs`
  and the resampling options are needed); `rows` the shipped arm's ingested rows). Returns `{ verdict, reasons,
  reachedTen, deadEnds, deadlineViolations, p95Ms, noRegression }`; the first condition that matches decides:
  1. an `incorrect` row of the shipped arm, wherever it stands: `fail`;
  2. three or more valid requests that do not reach ten (plan section 5.1, "Stopping": the verdict is settled at the
     third failure, so 18 of 20 must reach ten): `fail`;
  3. a failing cell with a dead-end entry (`deadEnds`) in a valid row's journal: `fail` (a row that is not valid is not
     read);
  4. `incomplete`: a failing cell with a declared rep without exactly one valid row (`missing row: rep <r>`, `duplicate
     rows: rep <r> has <n>`, `status <status>: rep <r>`, `row outside the declared replicates: rep <r>`) or a valid row
     without its journal (`journals[rowKey]` absent or `null`: `no journal: row <rowKey>`); a control with any problem of
     `pairRows(rows, todayRows, reps)` (A the shipped arm, B today's: the texts of `missing row: side b rep 7` and the
     others), before any statistic, so `noRegression` is never called on a rep without a pair (ruling of 2026-11-17,
     T09b's report); a ratio that is not above 0 is incomplete too;
  5. a control: `noRegression(ratiosOf(pairs, reps, { quantity, capMs }), reps, { resamples, resampleSeed })` over the
     ratio today over after; a lower bound below 0.9: `fail`;
  6. else `pass`.
  `reachedTen` counts the valid requests at declared reps that hold ten puzzles; `deadEnds` is the sum over the valid
  rows' journals (`null` for a control); `noRegression` is `{ geoMean, lower, pass }` whenever the control's pairing is
  complete (`null` otherwise). The deadline violations and the p95 (T09a's `completion`, over the declared reps) are
  reported beside the gate and judge nothing.
- **Master identity** (`masterIdentity(todayRows, afterRows, reps)`; RV2-08, RV3-08, RV4-08) returns `{ verdict,
  differences: [{ rep, seed, field }], problems }`. The pairing is `pairRows(afterRows, todayRows, reps)`, so in its
  problem texts side a is the after arm and side b today's; an `incorrect` row is a `fail`; any other pairing problem is
  `incomplete`. On a pair, a side whose `puzzleEvidence(run).keys` is not `null` is `incomplete` (`puzzle keys <today|after>
  rep <r>: <problem>`; equal empty or short key lists are never equality); else the accepted counts must be equal
  (`field` `acceptedCount`) and the ordered key lists deep-equal (`field` `igPuzzleKeys[<first differing index>]`), one
  difference per rep. A valid row with no accepted puzzle has the key list `[]` and its `details` are not read. A
  difference fails the cell whatever else is missing (a settled failure beats a missing row); the text orders the
  evidence before the counts, so a count difference on a side whose keys are incomplete stays `incomplete`. Every
  declared Master cell's result enters phase 0.
- **Hell 1** (`hell1Report(rows, { reps, quantity })`): `{ requests, valid, reachedTen, candidate }` over the rows at the
  declared reps, `candidate` being `reachedTen >= 18`; a report only, never a gate and never a veto (IG-P-Q30); it is not
  an input of `phase0Verdict`.
- **P5's stops** (`p5Stops(boundedRows, uncappedRows, { quantity, cell, reps })`; RV1-13, RV2-18, RV3-03, P-OD12). The
  manifest's `p5` entry `{ cell, bounded, uncapped, reps }` declares one pair per rep, the bounded and the uncapped row
  of the cell at that rep with the seed `landscape/<cell>/<rep>`. A pair is `unknown` (its reason in `unknownReps`) when
  either side's row is missing (`missing <side> row`), duplicated (`duplicate <side> rows (<n>)`), of another seed, not
  `valid` (`<side> row is <status> (...)`) or not linked (no `igSetMs` field: `<side> row is not linked (no igSetMs)`);
  a pair with no row on either side is `unknown` with the reason `missing`, never an empty success. On a known pair a
  **false stop** is a bounded row whose `partialReason` starts with `set:no-window-` while the uncapped row's `igSetMs` is
  a finite number (whatever its count), and a **lost completion** is an uncapped row that reached ten while the bounded
  row did not. A row that is not of the cell or not at a declared rep is listed in `unexpected` (`{ side, rowKey,
  caseId, rep }`) and not counted. It returns `{ cell, declared, pairs, falseStops, lostCompletions, unknown,
  falseStopReps, lostReps, unknownReps, unexpected }` (`declared` the number of reps, `pairs` the known pairs, so
  `declared = pairs + unknown`). The loss count is a report, not a threshold (IG-P-D1 condition 4: counted, not assumed).
- **The post-hoc projection** (`deadlineProjection(rows, { reserve, deadlineMs = 115000, quantity })`; R01, D-V4-08). Per
  valid row `{ rep, seed, postHoc: true, status, setCut, served, completed, lost }` with `setCut = igSetMs > (1 - reserve)
  * deadlineMs` (a request without a set is not cut), `served = 0` when cut, else the `igAcceptedMs` not after
  `deadlineMs`, `completed = served >= quantity` and `lost = acceptedCount >= quantity && !completed`; a row without the
  linkage fields is `not-linked` and one with a timeline that is not numbers `invalid-timeline` (both with `null`
  numbers). The result is `{ kind: 'deadline-projection', label: 'post-hoc projection; not a live deadline gate', rows,
  skipped }` (`skipped`: the rows that are not valid). It estimates accepted prefixes of recorded runs and proves neither
  the cancellation of dispatched work, nor the response assembly, nor the 120-s bound: it has no verdict, it is not an
  input of `phase0Verdict` and it is never a prerequisite.
- **Population** (`population(rows, { quantity })`; plan section 3, P3: two-sided beside every timing). Per cell (the
  rows' `caseId`): `{ completion: { requests, valid, reachedTen }, rows, puzzles, clueShare, scorePosition,
  censusEstimateShare, evidenceProblems }`. The statistics read the valid rows with complete per-puzzle evidence
  (`puzzleEvidence(run).clues` is `null`, every puzzle has a finite `score` and a `level` whose band is finite, and
  `ratingCensoredCount` is a count when present); the other valid rows are listed apart in `evidenceProblems` (`{ rowKey,
  rep, problem }`) and read nowhere; a row with no accepted puzzle contributes nothing and its `details` are not read.
  `clueShare` is `clues / K` and `scorePosition` is `(score - min) / (max - min)` with the band of the puzzle's `level`
  (the frozen `core/engine/levels.js`), each `{ median, min, max }` over the pooled puzzles (`null` without one);
  `censusEstimateShare` is `ratingCensoredCount` summed over the rows used over their `acceptedCount` summed (`null`
  without an accepted puzzle). Completion counts every row of the cell. A report that judges nothing.
- **Phase 0** (`phase0Verdict({ purpose, classes, cells, controls, masters, p5, prerequisites })`; plan section 6's gate
  row; RV2-08, RV3-03; IG-P-D1 condition 4). `classes` `[{ id, verdict }]` (`admitted`, `failed`, `inconclusive` or `null`:
  no verdict), `cells`, `controls` and `masters` `[{ cell, verdict }]` (`verdict` `pass`, `fail` or `incomplete`: the
  results of `cellGate` and `masterIdentity` with their cell), `p5` the `p5Stops` results, `prerequisites` T09e's `{
  [name]: { status, reasons } }`. `fail` when an item fails (a failing cell, control or Master cell on its shipped arm,
  or a prerequisite); else, with `purpose: 'selection'`, `incomplete` whose first `deciding` entry is `uncapped comparator
  collection pending`: a selection is never a final admission (the other open items follow it); else, with `purpose:
  'final'`, `pass` only when every class has a verdict, every failing cell, control and Master cell passes, every
  declared P5 pair is known (`p5Stops`' `unknown` is 0; at least one pair is declared) and every prerequisite passes,
  `stage1` and `liveDeadline` included (a prerequisite that is absent is `incomplete`); else `incomplete`. It returns
  `{ verdict, deciding }`: `deciding` lists the items that decide, each `<item>: <status>` (the failing ones for a `fail`,
  the open ones for an `incomplete`, every item for a `pass`). The Hell 1 report and the projection are not inputs.
- **The verdict tool** (V4-T09e; `node tools\ig-proto\verdicts.mjs --manifest <path> --label frozen --source-label <SL>`,
  unlocked). It reads the verdict manifest (`data/verdict-manifest.schema.md`; `data/verdict-manifest.example.json` is a
  working one over T06a's published records) and the records it names, and writes under
  `docs/improve-generating/evidence/frozen/<manifest.task>/`: `verdicts.json` (the meta block, the manifest with its
  SHA-256, the files read and their problems per arm, every class verdict with its statistics and work block, the cells,
  controls, Master cells, Hell 1, P5's stops, the prerequisites, the selection, the phase-0 line, the projection and the
  population), `verdicts.md` (one section per class with its work table, the cells on the arm each ships, the controls,
  Master identity, Hell 1, P5's stops, the prerequisites with their reasons, the phase-0 line and, under its own heading
  "Post-hoc projection; not a live deadline gate", the projection per arm and reserve) and, for the purpose `selection`,
  `class-selection.json`. Exit 0 when the records are written, whatever the verdicts; exit 1 for a refused manifest or
  command (an unreadable or malformed manifest; a `task` that is a historical observation namespace; an arm that a class,
  control, Master cell, P5 entry or the projection names but the manifest does not declare; a named record (the
  activation, closure, freeze or selection receipt) that is missing, is not a JSON object or whose SHA-256 differs from the
  manifest's; a live-deadline prerequisite that is not a live-deadline binding). The code is `verdictRecords(manifest, io,
  manifestRef)` (pure over the reader `io = { readText, list, harnessHash, currentOf }`; the self-test feeds it a
  repository in memory) and `main`.
  - **Decided records are written once** (check-list section 3.3; `decidedRecord(purpose, { selection, verdicts })`). An
    interim record of the task is replaced: a selection that is `incomplete` is superseded once the collection is closed,
    a phase 0 that is `incomplete` once a prerequisite is accepted. A decided one is never overwritten, and a correction
    is a new manifest `task`. Four refusals, each exit 1 with nothing written: `main` prints `verdicts: a final selection
    exists: <path>` when the purpose is `selection` and the task's `class-selection.json` has `verdict` `pass`, and
    `verdicts: a decided phase 0 exists: <path>` when the purpose is `final` and its `verdicts.json` has `phase0.verdict`
    `pass` or `fail` (an existing record that is not JSON is refused too: `an unreadable record exists`);
    `verdictRecords` throws `the closure belongs to another activation` when the closure record's `activation.sha256` is
    not the SHA-256 of the manifest's `collection.activation` (a closure that names no activation included), and, for a
    `final` manifest, `the selection is not final` when its selection receipt's `verdict` is not `pass`. The raw journals
    under `tests/artifacts/ig-proto/frozen/` are git-ignored but the receipts bind them by hash: keep them until phase 0
    is decided; a deleted one makes the result `incomplete` (`evidence changed`), never a pass.
  - **Rows.** Per arm, every `*.runs.json` of `docs/improve-generating/evidence/<label>/<arm.task>/<arm.arm>/` and every
    file `arm.files` declares, each row through `ingestRow`. A file whose SHA-256 differs from the manifest's (`changed
    evidence`), that `arm.files` does not declare (`undeclared evidence`), that is missing (`missing evidence`), that is not
    JSON or has no rows, or whose `meta.trees.<arm.variant>.treeId` is not `arm.treeId` (`stale tree`) makes each of its
    rows `invalid` (`<problem> <path>` first in its problems) and the rows are not counted as published. `rowLedger`
    runs on the rows of the class arms only: per row, every file `<rowKey>.*.jsonl` in the `logs` folder of every shard
    folder of the arm (`tests/artifacts/ig-proto/<label>/<arm.task>/<arm.arm>/<shard>/logs/`) other than
    `<rowKey>.row.jsonl` and `<rowKey>.link.jsonl` through `parseLines`, and the link lines of `<rowKey>.link.jsonl`; the
    unparseable lines of either join the row's ledger. A row with neither has no journal (no ledger: `no journal`); a
    legacy-route row (`log-link`) has no `caps` or `begin` lines and always reads as incomplete (`work-unknown`).
  - **Calls.** Per class: `classVerdict` over its cells, each cell's `screenCellGate` the verdict of `cellGate` on the
    screen arm (`failing` for a `failingCells` cell, with the screen arm's journals; `control` for a `controls` cell, with
    the rows of the entry's `today` arm; `pass` for any other cell), and `shippedArm`. Each `failingCells` cell and each
    `controls` entry is judged on the shipped arm of the class whose `cells` contain it (a cell no class contains is
    `incomplete`, `no class ships <cell>`); each `masters` entry by `masterIdentity(todayRows, afterRows, masterReps)`;
    each `hell1` cell by `hell1Report` on that shipped arm (on every arm with rows of the cell when no class contains it);
    each `p5` entry by `p5Stops` over the rows of its cell and its declared reps; each arm of `deadlineProjection.arms` and
    reserve by `deadlineProjection`; each arm by `population`; and `phase0Verdict` over the results. An arm's rows are
    its ingested rows of the cell. `quantity`, `capMs`, `responseBoundMs`, `resamples`, `resampleSeed` and the reps are the
    manifest's.
  - **Bound prerequisites** (`prerequisites(declared, { readJson, readFile, currentOf })`; R2-09, RV3-06, D-V4-18). Each
    declared `{ binding, current }` is `checkAccepted(binding, { readFile, current })`, `current` holding, for each arm id
    it names, today's `{ id, treeId, paramsHash }` from `currentOf` (the tree id of `ensureTree(id)` and the SHA-256 of
    `JSON.stringify` of its `ig-tree.json` `params`); the historical stage-1 binding is declared with `current: []`, so
    unrelated harness work does not change it (its producer is the stored one). The live-deadline binding is refused
    first, by throwing `verdicts: the live-deadline prerequisite must be a live-deadline binding`, unless its
    `expected.kind` is `live-deadline` and its `expected.fields` deep-equal `LIVE_DEADLINE_FIELDS`: a projection can never
    satisfy it. A binding file that is absent is `incomplete` (`missing binding <path>`, and no tree is asked for), one
    that is not JSON `incomplete` (`unreadable binding <path>`) and one whose current tree cannot be read `incomplete`
    (`current tree unreadable: ...`). It returns `{ stage1, liveDeadline, 'parity:<binding path>': ... }`, each `{ status,
    reasons }` and a key only when declared (`phase0Verdict` reads an absent one as `incomplete`).
  - **The class-selection receipt** (`classSelection(manifest, results, inputs)`; RV3-04, RV3-06, D-V4-20): one `ig-v4-proof`
    envelope of the kind `class-selection` for the purpose `selection`. `selection.classes` is `[{ id, verdict, decidedBy,
    shipped }]` and `selection.cells` `{ <cell>: { class, shipped } }` (at the envelope's root; `shipped` the arm id, the
    screen arm for an admitted class, else the no-screen arm), `collection` is `{ activationSha256, closureSha256, missing
    }` and `reasons` explains an incomplete one. `evidence` holds every file read with its SHA-256: the verdict manifest,
    the activation, closure and freeze records (the freeze is the activation's `epoch.freeze`; the example has neither),
    every runs file, every journal and every link file; `arms` every arm of the manifest with the tree id and the SHA-256 of
    `JSON.stringify(meta.trees.<variant>.params)` of its runs files (`null` for an arm with no readable file or with two
    trees); `harnessHash` is today's. `declared` is the activation's `declaredRows` (every `<arm>/<cell>~<rep>` of the
    classes' arms, cells and `validationReps` when there is no activation, the example only) and `published` the
    `<arm>/<rowKey>` of the rows of the files that passed the checks above. **The closure rule:** `verdict` is `pass` (a
    final selection) when no declared row is missing, or when a closure is given whose `missing` is exactly the declared
    rows that are not published (in any order); then, with a closure, `coverage.expected` is the declared rows less the
    closed ones, `coverage.missing` is empty and `collection.missing` lists the closed rows, so that `proofCheck` against
    the expectation built from the same records passes. Otherwise it is `incomplete` (`closure does not match` first when
    a closure is given, then `missing <row>` per row): an interim report is never a selection. Changing the manifest, a
    runs file, a journal or a link file after the receipt is written makes `proofCheck` `incomplete`
    (`evidence changed <path>`).
  - **A final verdict keeps its selection** (RV3-03). With `purpose: 'final'` the manifest names the selection receipt
    (`selection: { path, sha256 }`); `selectionChanges(receipt.selection, recomputed)` lists the cells whose class or
    shipped arm, recomputed from the records, differs from `selection.cells` (or that only one side names), and
    `finalPhase0` then makes the phase-0 verdict `fail` with `selection changed <cell>` for each, before any other failing
    item. The line is `phase0Line(phase0, prerequisites)`: `Phase 0: pass.`, `Phase 0: INCOMPLETE (...)` or `Phase 0:
    FAIL (...)`, the `deciding` items joined by `; `, a prerequisite followed by its reasons. The tool does not re-verify
    the receipt's own proof (T11f's `resolve-comparators` does); the record keeps the receipt's `verdict`.
  - **The work report** (`workReport(work, rows)`; IG-P-Q37, D-V4-17). T09c's `workRule` result with, per arm, `width`
    (`hiRatio - loRatio`, `null` when the arm accepted no puzzle), `open` (the open primitives: the sum of `ledger.open`
    over the arm's rows, which `workRule` does not carry) and `unbounded` (an invalid bound made `hi` infinite; the report
    prints `unbounded`). The work table of each class in `verdicts.md` lists per arm the rows, the accepted puzzles,
    `loRatio`, `hiRatio`, the width, `completedRatio`, `terminatedCalls`, the open primitives and whether the arm is
    complete; the intervals are reported, the verdict is the work rule's. The stage-2 journals' width per class is the
    reading of N-V4-14.
- **Self-test.** Four cases appended to the `--items` group (`verdicts: basic rows`, `verdicts: completion and the
  deadline apart`, `verdicts: run status`, `verdicts: per-puzzle evidence`), on synthetic rows built from the frozen
  `newRunRecord` (the helper `verdictKit()` of `self-test.mjs` loads `verdicts.mjs` and the frozen record builders on
  first use, so the other groups do not need the snapshot). V4-T09b appends eight more (`verdicts: basic statistics`,
  `pairing problems`, `matched sets`, `incomplete clue populations are not zero differences`, `the clue rule is pooled`,
  `faster rule and its floor`, `failed requests at the common endpoint`, `no regression`): the pairing problems, the
  matched sets, the pooled clue rule, the shared resampling, the per-cell floor, the common endpoint and the no-regression
  bound, on the same synthetic rows. V4-T09c appends 30 (through the same `verdictKit()`; the literal journal lines of its
  ledger cases are built by `ledgerLines()`, the class inputs by `synthClass`): the `ledger:` cases (open and killed
  calls, the count capability, the omitted losing attempt, overlapping begins that no completion repairs, unquantified
  ratings, an unfinished primitive, a work-cap rating, exceeded and invalid bounds, the confirmed termination, the
  reconciliation, tasks matched by identity, unowned lines, no linkage and `parseLines`), the `work:` cases (the
  counterexample of IG-P-Q37, pass and worse, nothing missing read as no work) and the `class:` cases (each condition
  of the procedure, their order, and the missing `quantity` of `reachedTen` and `cappedT10`). V4-T09d appends 11 (the
  rows of an arm by `armRows`, its journals by `journalsOf`, the Master and P5 sides by `masterSide` and `p5Side` and a
  phase-0 input in which every item passes by `greenPhase0`): `verdicts: fallback arm` (the shipped arm and the failing
  cell's gate: the stop at the third failure, the dead end, the journal, the order of the conditions), `one failing global
  Nightmare cell`, `Master identity on complete keys`, `Hell 1 is reported, not a veto`, `the projection is never a
  deadline gate`, `P5 stops over the declared pairs`, `a selection is not a final admission`, `final admission needs the
  whole comparison`, `dead ends`, `the control gate` (a control judges no regression only on complete pairs) and
  `population per cell`. V4-T09e appends 8 (the in-memory repository by `memoryRepo`, accepted bindings by `boundReceipt`
  and a synthetic collection by `toolWorld`: one class of one cell, two arms of 20 requests with their runs files,
  journals and link files): `verdicts: bound prerequisites` (a receipt changed after its acceptance, a projection as the
  live-deadline binding, a stale arm, a wrong producer, a complete live binding and a historical one after the harness
  changed, an absent binding), `class selection` (published rows, a missing row, a closure of exactly that row and of
  another), `the selection binds its inputs` (the evidence of the receipt, one byte of a journal and of the manifest, the
  activation, closure and freeze records), `a final verdict keeps its selection`, `decided records are written once` (the
  rule on each record, a closure of another activation, a selection receipt that is not final), `the work report` (the intervals, the
  open primitives, the report's table and the journals of `c~1` against `c~10`), `records that are not what the manifest
  declares` (changed, undeclared, stale and missing runs files, a named record that differs, an unknown arm) and `each cell
  is judged on the arm its class ships` (a dead end in the screen arm; a control, a Master cell, P5's pairs, Hell 1 and the
  projection through the declared arms).

## Kernel probe (V4-T10a)

Plan P7's C1 (an incremental R4) must start from measured R4 behaviour. `kernel-probe.mjs` measures it on a test-side
tree and proves on every probed input that measuring changes nothing in the complete deduction. `deduce.js` does not
change in production.

- **The `r4c` tree** (`variants/r4c.json`, extends `instr`; nine edits `r4c-1` to `r4c-9` of `core/engine/deduce.js`, no
  file and no parameter). The record of `igTake()` gains `r4`, nine integers of one measurement: `calls` (R4
  invocations), `pieces` (piece visits: every piece not yet covered at an invocation, whether or not it kills),
  `staticRows` (the sum of the visited pieces' column lengths), `liveRows` (the sum of their live rows), `dirtyPieces`,
  `countChanged`, `r4Kills` (rows R4 killed), `kills` (every `kill(r)`, whatever the rule) and `undoEntries` (trail entries
  undone). The `instr` fields keep their names, so every caller of `instr-1` to `instr-6` works; the `instr` tree's record
  has no `r4`.
- **The epoch rule** (RV1-18). A piece is dirty at an R4 visit when its live rows changed since its previous visit in the
  same measurement; its first visit is dirty. A per-piece epoch (`igEpoch[rowPiece[r]]`) is incremented by every
  live-row removal (`kill`) and every restoration (the `x >= 0` branch of `undo`), and a visit compares it with the epoch
  it saw last. The number of live rows is a separate statistic, `countChanged`: a removal and a restoration between two
  visits leave the number as it was and the piece dirty, which a count alone would miss. So `countChanged <= dirtyPieces <=
  pieces`. `epochDirty(trace)` (exported) is the rule on a synthetic trace of `['visit', p]`, `['kill', p]` and
  `['restore', p]` steps (the count of a piece starts at 0) and returns `{ dirty, countChanged }`.
- **The complete deduction compared** (RV1-19; plan P7: no rating changes). A `v4-kernel` item measures one window subset
  in the `r4c` tree and in the `instr` tree on the same model input: `firstCarvedSet` of the case in the `r4c` engine,
  `windowSubsets` with the offsets 1, 2 and 3 and two subsets each (six subsets, index 0 to 5), then in each tree
  `igTake()`, `buildModel`, `measureDeduction(model, DEDUCE)` in the tree's own main workspace and `igTake()`; a thrown
  error becomes `{ error, message }`. The two complete `DeductionResult`s, not a public rating, are compared with
  `isDeepStrictEqual` right after the second returns. The result is `{ outcome: 'ok', g, idx, same, r4, ms }` (`r4` is
  `null` when the measurement threw), `{ outcome: 'no-set', reason }` when the case does not carve or `{ outcome:
  'no-subset' }` when the index has no subset.
- **The kind** `v4-kernel`, payload `{ boardRows, levelId, seedText, subsetIndex, otherRoot }` (`otherRoot` is the `instr`
  tree's root, loaded in the worker once per root with its own workspace): one lane, reserve 90 s (admitted while `e + 90
  <= H - 15`, cut at `H - 15`, `censored`). The case list is part of the item manifest and so of the state identity;
  `--horizon-s` is the execution envelope, so a resume keeps the identity.
- **Commands.**

  ```
  node tools\ig-proto\kernel-probe.mjs counters --task <T> --label frozen --source-label "frozen 3fc65f4" [--cases <ids>] [--horizon-s <H>]
  node tools\ig-proto\kernel-probe.mjs report --task <T> --label frozen --source-label "frozen 3fc65f4" [--cases <ids>]
  ```

  `counters` (locked) runs the items `counters:r4c:<caseId>:ig-v4/kernel/<caseId>:<i>` (`i` from 0 to 5) with `runItems`
  (step `counters`: `items.jsonl` and `state.json` under `tests/artifacts/ig-proto/frozen/<T>/counters/`). `--cases` is a
  comma-separated list of catalogue ids, default `14x14-nightmare,26x26-nightmare` (`parseCases`: an unknown id, an empty
  entry or a repeated id is refused, exit 1, `kernel-probe: unknown case id <id>`); `report` needs no list for a run of
  another one: without `--cases` it takes the default list or, when the state's manifest hash is of another list, the
  cases the item log names (`loggedCases`, in order of first appearance), and refuses a state that is none of these
  or whose identity or trees are not the experiment's. A historical namespace of check-list 3.1 is refused as `--task`.
  `report` (unlocked) writes `evidence/frozen/<T>/kernel.json` and `kernel.md` from the item logs, one block per step
  folder that exists under `tests/artifacts/ig-proto/frozen/<T>/` (`counters` for V4-T10a, `profile` for V4-T10b, both for
  a task that ran both; no folder of either is a refusal). The counters block is the item table, per case
  the sums of the counters with `dirtyPieces / pieces` and `countChanged / pieces`, and one verdict line:
  `counters: equal` (every item `completed` with `same: true`), `counters: incomplete (<items>)` (an item is missing or
  censored: the probe did not finish; this wins over a difference) or `counters: DIFFER (<items>)` (a completed item
  whose two results differ, an `error` item, or one that measured nothing: `no-set`, `no-subset`). `counterVerdict(ids,
  lines)` is that function on the item-log lines. The exit is 0 once the record is written, whatever the verdict.
- **Plan** `plans/V4-T10a.json`: 5 minutes allocated; `counters` is locked (150 s projected, 2 invocations, forecast 240 s
  with the quiet periods); the trees, the report and the firewall steps are unlocked.
- **Self-test.** `--items`: `kernel: the epoch rule`, `kernel: case list` (the items, the identity and the reserve of the
  kind) and `kernel: report verdicts` (the verdict function, the rows and the sums, and the cases of a log, on synthetic
  lines). `--v4` (locked):
  `kernel: r4c counters and the complete deduction` (the corpus's first two subsets through both trees, the deep equality
  over the whole corpus, and the lane worker's item against a direct measurement).

### The `fewestColumn` profile (V4-T10b)

`fewestColumn` must be attributed before anyone works on it (plan P7: diagnostic only; the rating code does not change).
The profile is a CPU profile of the canonical ratings of T10a's corpus, taken in child processes started with
`--cpu-prof --no-turbo-inlining` (reduced inlining, so that a function inlined into its caller still has its own node).

- **Process items** (`runProcessItems` of `lib/items.mjs`, RV2-04). An item's payload is `{ argv, outDir }` (`outDir` a path
  relative to the repository root with `/`); `runProcessItems({ task, step, label, horizonS, items, reserveS })` runs the
  pending items one at a time in order, each admitted while `e + reserveS <= H - 15`; `reserveS`, `horizonS` and the cut
  are the execution envelope, never part of an item or of the identity (R2-03). The identity, `resumePlan` and refusals
  are `runItems`' (exit 3 and nothing written). Per item: the `item-start` line is written **before** the child is
  spawned (durable intent), the `item-spawn` line with its PID when the child has started, and the item ends exactly
  once: an error before the child started (`code` null and the message) at once; else at the child's `close` (every
  stdio stream ended): `censored` when the parent cut it, `completed` for exit code 0 with `result: { stdout }` (the
  last non-empty stdout line parsed as JSON, or null), `error` with `{ code, stderr }` (the last 2,000 characters)
  otherwise; an `error` event after the start is kept as `result.error`. The parent cuts a running child at `H - 15`
  (`child.kill()`, awaited), stops the run after a cut item, and a `finally` kills and awaits every child still running,
  so that no child outlives its locked invocation. A crash of the parent leaves a start line without an end, which the
  next invocation refuses (`interrupted item <id> needs a ruling`): a started item is never rerun.
- **The output-folder rule.** For every pending item (one without any log line) `abs(outDir)` must be absent or an empty
  folder, else the step refuses with `unexpected output in <outDir> for unstarted item <id>` (exit 3, nothing written, the
  folder kept); the folders are then created. A completed or interrupted item's folder is never emptied or written. A
  payload of another shape (an argument that is not a string, an `outDir` that is absolute, has `..` or `\`, or is
  shared by two items) throws before anything is written.
- **The items** (`profileItems(caseIds, { task, sourceLabel })`): one per case, id
  `profile:instr:<caseId>:ig-v4/kernel/<caseId>`, kind `process`, variant `instr`, payload `{ outDir, argv }` with
  `outDir` `tests/artifacts/ig-proto/frozen/<T>/profile/out/<caseId>` and `argv` `--cpu-prof --cpu-prof-dir <outDir>
  --no-turbo-inlining tools/ig-proto/kernel-probe.mjs profile-child --case <caseId> --task <T> --label frozen
  --source-label <SL>`; no argument depends on the invocation (no horizon), so a resume keeps the identity.
- **Commands.**

  ```
  node tools\ig-proto\kernel-probe.mjs profile --task <T> --label frozen --source-label "frozen 3fc65f4" [--cases <ids>] [--horizon-s <H>]
  node tools\ig-proto\kernel-probe.mjs profile-child --case <id> --task <T> --label frozen --source-label "frozen 3fc65f4"
  ```

  `profile` (locked) takes the cases as `counters` does (default `14x14-nightmare,26x26-nightmare`), runs the items with
  `runProcessItems` (step `profile`, reserve 120 s, `items.jsonl` and `state.json` under
  `tests/artifacts/ig-proto/frozen/<T>/profile/`) and then `rebuildProfiles(<T>)`. `profile-child` (`--case` required, an
  unknown id exits 1) loads the `instr` tree, rates the six window subsets of the case's first carved set (T10a's corpus)
  with `rate()` (an `IncompleteRatingError` counts as a rating) and prints one JSON line `{ caseId, ratings, ms }`; Node
  writes its `.cpuprofile` into the item's `outDir` when the child exits.
- **The derived records.** `rebuildProfiles(task)` reads the item log of step `profile` and writes `profile/profile.jsonl`
  whole, never appending (a second call writes the same bytes, LF line ends): for each completed item in order, exactly one
  `*.cpuprofile` file in its `outDir` gives `{ item, caseId, file, sha256, totalMs, deduceMs, fewestColumnMs, share }`; a
  node's self time is the sum of the `timeDeltas` (µs) of the samples that name it, over 1,000, `totalMs` sums every node,
  `deduceMs` the nodes whose file ends `core/engine/deduce.js`, `fewestColumnMs` the nodes named `fewestColumn` and
  `share` is `fewestColumnMs / deduceMs`. No file or several give `{ item, caseId, error: 'profile files: <n>' }`, a file
  that is no profile `{ item, caseId, error: 'profile unreadable: <message>' }`. A censored, errored or unstarted item
  gives no record.
- **The report's profile block.** Per case the item's status, the child's `ratings` and `ms`, the record and the note
  "reduced-inlining profile, diagnostic only (plan P7)", and one verdict line: `profile: complete` (every item completed
  with a record) or `profile: incomplete (<cases>)` (an item is missing, censored, an error or an evidence error). Each
  block finds its cases from its own state: the default list, else the cases its item log names (`loggedCases` for
  `counters`, `loggedProfileCases` for `profile`), the first whose items reproduce that state's `identity.manifestHash`;
  none refuses (exit 1). `--cases` applies to the counters block only; the profile block needs `--source-label`, because
  the label is an argument of its items. `kernel.json` keeps the counters fields at the top level as before and holds the
  profile block under `profile`; a report of a task with one block writes that block only.
- **Plan** `plans/V4-T10b.json`: 4 minutes allocated; `profile` is locked (150 s projected, 1 invocation, forecast 195 s
  with the quiet period); the snapshot, the `instr` tree, the report and the firewall steps are unlocked.
- **Self-test** (`--items`, unlocked: the children are `node -e` programs that rate nothing, under
  `tests/artifacts/ig-proto/selftest/`): `process items: completion and error`, `log before spawn, spawn error without exit`
  (including a spawn that throws at once and a child that reads its own start line), `trailing stdout after exit`,
  `cut and cleanup`, `a started item is never rerun`, `an unstarted item with output is refused`, `resume and
  verification`, and `profile: identity without the horizon`, `the derived records are rebuilt`, `report verdict and blocks`.
  `--v4` (locked) adds `profile: the child process and its profile file`: the real child of `10x10-nightmare` under
  `--cpu-prof --no-turbo-inlining`, run by `runProcessItems` into the scratch label, with its one profile file and the
  record `rebuildProfiles` derives from it (a path that no `--items` case can reach: those children rate nothing).

### Pool probe (V4-T10c)

Plan P8 (a wider pool) is parked because one rating took 9 to 28 % longer at eight workers than at four (R23). The probe
measures that contention directly: the same ratings of the frozen source at 1, 2, 4 and 8 concurrent workers. It decides
whether P8 is worth more work (plan P8) and judges nothing: the default width stays four and every gate is read at four.

- **The items** (`widthItems(caseIds, rounds)`): for each case, in order, the widths 1, 2, 4 and 8, id
  `run:base:<caseId>:<width>:<rounds>`, kind `width`, variant `base` (the frozen source unchanged), payload `{ caseId, width,
  rounds }`. No payload field depends on the invocation (the cut is the execution envelope, R2-03), so a resume keeps the
  identity. The corpus of a case is T10a's: `kernelCorpus(engine, caseIds)` of `kernel-probe.mjs` returns the six window
  subsets of the case's first carved set as plain data `{ caseId, boardRows, pieces, clues, idx }`, which survives a
  structured clone and is posted to the workers (the `v4-kernel` items keep computing their own subset).
- **Custom items** (`runCustomItems(o, dispatch)` of `lib/items.mjs`): `runProcessItems`' rules with a dispatch the caller
  gives. The identity, `resumePlan` and refusals are `runItems`' (exit 3 and nothing written); an item whose payload names an
  `outDir` follows T10b's output-folder rule, one that does not skips it; an item is admitted while `elapsedS() + reserveS <=
  horizonS - 15`; the `item-start` line is written before `dispatch(item, { cutAtS })` is called, with `cutAtS = horizonS - 15`
  (seconds since the process start); the dispatch returns a promise of `{ status: 'completed' | 'censored' | 'error', result }`
  that must settle by `cutAtS` plus 5 s and owns what it started; the runner writes exactly one `item-end` per item (a throw, a
  rejected promise or any other settlement ends it `error` with `{ outcome: 'error', message }`), stops after a `censored` item
  and never reruns a started one. Every line goes through the line helpers with the run's `identityHash` (RV2-01). The state and
  the return value are those of `runProcessItems`.
- **The width dispatch** (`widthDispatch({ workerFile, workerData, width, cutAtS })` of `width-probe.mjs`; `run` passes
  `lib/width-worker.mjs`, the self-test its scripted file). It starts `width` worker threads with `workerData { treeRoot, items,
  rounds }`, waits for every `{ type: 'ready' }`, sends `{ type: 'go' }` to all (the barrier: the workers rate together), and
  collects every `{ type: 'result', ms }`. An `{ type: 'error', message }` message, an error or an exit of a worker before its
  result, or a result whose `ms` is not a list of numbers ends the item `error`; the cut (`cutAtS`) ends it `censored` (a
  partial width is never a pass); in every case a `finally` terminates and awaits every worker. The completed result is
  `{ caseId, width, rounds, expected, observed, medianMs, p90Ms, ms }`: `expected = rounds x items x width`, `observed` the
  ratings timed, `ms` their times in ms worker by worker, `medianMs` the median (the mean of the two middle values for an even
  count, to four decimals) and `p90Ms` the value at index `ceil(0.9 n) - 1` of the ascending list. An error result is `{ outcome:
  'error', message, caseId, width }`, a censored one `{ outcome: 'censored', cutAtS, caseId, width, ready, results }`.
- **The worker** (`lib/width-worker.mjs`): loads the tree's engine with `loadEngine(treeRoot)`, creates its own main workspace,
  posts `ready`, and on `go` rates every item `rounds` times in order (`boardFromRows` once per item; `rate()`, an
  `IncompleteRatingError` counts as a rating), timing each rating with `performance.now()`; it posts its one terminal message
  (`result`, or `error` on an exception) and closes its port.
- **Commands.**

  ```
  node tools\ig-proto\width-probe.mjs run --task <T> --label frozen --source-label "frozen 3fc65f4" [--cases <ids>] [--rounds <1 to 3>] [--horizon-s <H>]
  node tools\ig-proto\width-probe.mjs report --task <T> --label frozen --source-label "frozen 3fc65f4"
  ```

  `run` (locked) takes the cases as `parseCases` does, with the default `26x26-nightmare`, and the rounds from 1 to 3 (default
  3; `--rounds` above 3 exits 1 with `width-probe: --rounds above 3 needs a new reserve`); it runs the items with
  `runCustomItems` (step `run`, reserve 120 s, `items.jsonl` and `state.json` under `tests/artifacts/ig-proto/frozen/<T>/run/`).
  A historical namespace of check-list 3.1 is refused as `--task`. `report` (unlocked) takes neither cases nor rounds: it takes
  the default case with the rounds the item log names, or the cases the log names (in order of first appearance), or, with no
  line, the default case with rounds 1 to 3, the first whose items reproduce the state's `identity.manifestHash`; none refuses
  (exit 1), as does a line of another `identityHash`, a state that is not of the frozen source or a stale `base` tree. It writes
  `evidence/frozen/<T>/width.json` and `width.md`: per case and width the median, the p90, `expected`, `observed` and `slowdown`
  (`medianMs(w) / medianMs(1)` to four decimals, 1 for width 1; none without a complete width 1), the machine
  (`os.cpus().length`, the first CPU's `model`, `os.totalmem()`), the context line "R23 measured one rating 9 to 28 % longer at
  eight workers than at four. The probe decides whether P8 is worth more work (plan P8); every gate stays at four workers.",
  and one verdict line: `width: complete` (every item completed with every expected rating timed) or `width: incomplete
  (<items>)` (an item is missing, censored, an error, or its result is not the item's or timed fewer ratings than expected).
  `width.json` also keeps each item's raw times. The exit is 0 once the record is written, whatever the verdict; no value of
  `slowdown` is a failure.
- **Plan** `plans/V4-T10c.json`: 4 minutes allocated; `run` is locked (120 s projected, 1 invocation, forecast 165 s with the
  quiet period, rounds 1 so that one round prices stage 2's run of three rounds and two cases); the snapshot, the `base` tree,
  the report and the firewall steps are unlocked. T11c's plan `V4-S2` prices its `width` step from the `item-end` lines of
  `V4-T10c/run` and runs the same commands with `--rounds 3`.
- **Self-test** (`--items`, unlocked: the workers are `lib/width-worker-test.mjs`, a scripted file that answers `ready`, then on
  `go` posts `result`, `error` or nothing, as `workerData.script` says, and keeps a heartbeat in shared memory so that a worker
  that was not terminated shows): `width: barrier and result` (every worker ready before the one `go`, the times, the
  statistics, every worker stopped after the call), `width: error and early exit` (a worker's error, an exit before `ready`, a
  malformed result), `width: cut` (the item ends `censored` within 10 s and the run stops), `width: items, statistics and the
  corpus` (the items, the identity, the median and the percentile, the plain-data corpus against T10a's subsets),
  `custom items: the runner rules` and `width: report verdicts and blocks`. `--v4` (locked) adds `width: the real worker and the
  dispatch`: two real workers on `10x10-nightmare`, one round, and the error path of the real worker (a path that no `--items`
  case can reach: those workers rate nothing).

## Frozen-round matrix (V4-T11a)

The owner approves the frozen round as an enumerated manifest (OD-P10). `data/frozen-round-v1.json` writes the requests of stages 2 to
5 as data and `manifest.mjs` holds the pure rules that expand them into groups of request rows: the conservative stage-4 matrix of
review R14 (every validated Nightmare and Hell 1 cell measured with both twins of the frozen arm, because the class table is unknown
before stage 3; today's arm only where a gate needs it; the uncapped comparator of the arm each cell ships; the conditional Hell 1
boards; a fresh cohort for a second validation). The matrix is the priced universe, not a measurement plan: nothing in it runs, rates,
generates or reads a measured row of the round (unlocked). `self-test.mjs` loads `manifest.mjs` on first use, because it imports
`verdicts.mjs` (and so the frozen source) for `runStatus` and `reachedTen`.

- **The data** (`version` 1): `resampleSeed` 20261116, `resamples` 10,000 and `workers` 4 (four workers per request row); `reps`
  (`[from, to]`): `pilot` 0 to 4, `validation` 20 to 39, `master` 20 to 24, `secondValidation` 40 to 59, `liveDeadline` 0 to 4;
  `rowLimitS`: `default` 260, `liveDeadline` 130; `arms`, `comparatorDifferences`, `cells` and `stage2` below. The fitting seeds are
  the provisional reps 0 to 5 and MP12b1's reps 10 to 19: the pilots and the live receipt use fitting seeds by design (stage 2 is
  "on fitting seeds"), the validation, Master and second-validation reps start above 19 and the second cohort does not overlap the
  first. The optional paired factor (S4-6) uses reps 20 to 24, a constant of `manifest.mjs`: five of the validation seeds, as the
  plan's "five seeds per cell" (the data has no key for it); the live receipt's cells (`14x14-nightmare`, `26x26-hell-1`) are a
  constant too.
- **The arms.** `log-link` (stage 4: today's search with the linkage journal) and the seven stage-2 arms `fr-base`, `fr-screen`,
  `fr-none`, `fr-close`, `fr-c4`, `fr-ps`, `fr-p5` (T08) exist as variants; each is `{ variant: <its id>, stage }`, so a group's
  arm is its variant (a group carries no `variant` field; `shipped-uncapped` has none). The four stage-4 arms are created at the
  freeze (N-V4-03), named here with their `settings` (`prior`, `screen`, `c4`, `rerate`, `callBudget`, `setAttemptsBound`,
  `liveDeadline`): `fr-frozen` (screen `frozen`, budget and bound `frozen`, deadline true), `fr-frozen-none` (screen `none`, otherwise
  as `fr-frozen`), and their uncapped comparators `fr-frozen-uncapped` and `fr-frozen-none-uncapped` (`comparatorOf` the twin;
  `callBudget` and `setAttemptsBound` null, `liveDeadline` false). A comparator differs from its twin only in the keys of
  `comparatorDifferences` (`callBudget`, `setAttemptsBound`, `liveDeadline`): `expandMatrix` checks it first and throws
  `manifest: comparator <arm> differs from <twin> in <key>` (also for an unknown twin, and for a twin with no comparator arm).
- **The cells.** `failingNightmare` (`14x14`, `15x15b10`, `12x12`, `16x16`, `15x20`), `hell1Validated` (`26x26`, `20x20`),
  `hell1Conditional` (`24x24`, `14x14`) and `master` (the 16 `*-master` cases of the catalogue in catalogue order).
- **Stage 2** (`stage2`, each item `{ id, text, groups: [{ arm, cells }] }`, pilot reps): S2-1 `fr-base`, `fr-ps` on `26x26-hell-1`
  and `20x20-hell-1`; S2-2 `fr-screen`, `fr-none` on the Nightmare cells `10x10`, `12x12`, `14x14`, `15x15b10`, `16x16`, `15x20`,
  `26x26` and on `26x26-hell-1`; S2-3 `fr-c4`, `fr-base` on `14x14-nightmare` and `26x26-nightmare`; S2-4 `fr-close`, `fr-base` on
  `12x12-nightmare`, `14x14-nightmare` and `26x26-hell-1`; S2-5 `fr-base` on `24x24-hell-1` and `14x14-hell-1`; S2-6 `fr-p5`,
  `fr-base` on `14x14-nightmare`, `26x26-hell-1` and `20x20-hell-1`. The probes and the parity passes are steps of T11c's plans,
  not request rows.
- **`expandMatrix(data, inputs)`** with `inputs = { controls, secondValidationBoards }` returns `{ groups, items, counts }`.
  `controls` (required: the completion-passing Nightmare cells, never a failing cell) and `secondValidationBoards` (default: every
  `hell1Validated` and `hell1Conditional` board, the conservative price; an empty list is allowed) are lists of distinct cells; a
  malformed range of `reps`, a missing row limit, an unknown arm or a repeated cell throws `manifest: ...`. The items, in this
  order: S2-1 to S2-6; S4-1 headline (both twins on each failing cell); S4-2 Hell 1 (both twins on each validated board); S4-3
  controls (both twins and `log-link` on each control); S4-C comparator (one group of arm `shipped-uncapped`, task `V4-S4C`, on every
  cell of S4-1, S4-2 and S4-3, resolved after the class verdicts by T11f to `fr-frozen-uncapped` or `fr-frozen-none-uncapped`);
  S4-4 Master identity (`fr-frozen` and `log-link` on each Master cell, master reps); S4-5 conditional Hell 1 (the twins and
  `shipped-uncapped` on each `hell1Conditional` cell); S4-6 optional paired factor (`log-link` on each failing cell, reps 20 to
  24); S4-7 conditional second validation (the twins and `shipped-uncapped` on each second-validation board, reps 40 to 59); `live`
  (`fr-frozen` on the two live cells, the live-deadline reps; the receipt of N-V4-13).
- **A group** is `{ id, task, arm, cell, from, to, rows, stage, cohort, shard, rowLimitS, optional, items, collection, comparator }`:
  `rows = to - from + 1`; `id` is `<task>/<arm>/<shard>`; its **key** (`groupKey(group)`) is `task|arm|shard|from|to`; `items` are the
  ids of the items that list it. **Dedupe:** two items that need the same key (the same task, arm, shard and reps) share one group
  and only add their id to its `items` (for example `fr-base` on `14x14-nightmare`, reps 0 to 4, lists `S2-3`, `S2-4`, `S2-6`).
  `stage` is 2 for the stage-2 items and 4 for every other item, the live receipt included (its arm is a stage-4 arm; its
  `collection` keeps it apart). `optional` is true for S4-5 and S4-6.
- **State paths** (RV2-11): the task by stage (`V4-S2` for stage 2, `V4-LIVE`, `V4-S4` for the first validation's twins, controls,
  Master rows and paired factor, `V4-S4C` for its comparators, `V4-S4X` for the second validation, `V4-S4XC` for its comparators)
  and the shard `<cohort>-<cell>`, the cohort being that of the reps (`pilot`, `live`, `val`, `master`, `factor`, `second`); the state
  is `<task>\<arm>\<shard>\state.json`, so a pilot, a validation and a second validation of one arm and cell never share a folder.
- **Row limits** (RV2-10): 130 s only for a stage-4 group of an arm whose settings have `liveDeadline: true` (`fr-frozen`,
  `fr-frozen-none`), which runs only after an accepted live-deadline binding; 260 s for every other group: today's `log-link`, the
  `shipped-uncapped` comparators (no live deadline; separate set and batch timers), the stage-2 arms and the `live` rows themselves
  (a violation must be observed, not cut by the wrapper). A wrapper-censored control is unknown evidence (`p5Stops`, T09d), never
  a proof that the bounded arm lost nothing.
- **Collections** (RV3-04, D-V4-20): `stage2`; `live`; `initial` (S4-1 to S4-4 and the comparators of S4-1 to S4-3); `conditional`
  (S4-5, run only when T11e activates the board by `conditionalActivated`); `optional` (S4-6, run only with the owner's approval);
  `second` (S4-7, a template until N-V4-04). A comparator group (`comparator: true`, arm `shipped-uncapped`) is never part of a
  validation plan: it belongs to its collection's comparator task (`V4-S4C` for `initial` and `conditional`, `V4-S4XC` for `second`)
  and is resolved only from that collection's final selection (T11f).
- **`counts`**: `{ total, stages, items }`, each `{ groups, rows }` (an item counts the groups it lists, so the items do not sum to
  the total). With one control, the matrix has 115 groups and 1,220 rows: stage 2 33 groups and 165 rows, the other items as
  `matrix: counts` lists them. With the ten controls of today's reports (below) it has 151 groups and 1,940 rows (stage 4: 118
  groups and 1,775 rows).
- **`controlsFrom(reports, failing)`** returns the Nightmare cells of the catalogue, other than `failing`, in catalogue order,
  whose MP12b1 report has at least 18 runs with `runStatus(withoutSampling(run), { quantity: 10 }).status === 'valid'` that reach
  ten puzzles (`reachedTen`, whatever their time, D-V4-16). `reports` is `mp12b1Report` or a map from case id to what it
  returns (`{ path, report }` or the report); a cell without a report is no control. **`withoutSampling(run)`** returns a copy of
  the run whose `errors` omit every entry of `phase` `sampling`, the run itself unchanged: the landscape profile's diagnostic
  sampling runs after the timed interval and records up to three failures of its own sampled ratings (`tools/bench/runner.js:467-474`,
  `:852-858`), so its `sampling/rating-incomplete` entries say nothing about the request, and the frozen-round arms never run it
  (`verdicts.mjs` and `runStatus` are unchanged); any other error entry, a `batch` one for example, still makes a run an error. On
  today's reports the controls are the ten Nightmare cells `3x29`, `10x10`, `18x18`, `18x20`, `20x20`, `20x21`, `32x15`, `22x22`,
  `24x24` and `26x26` (the five failing cells have 11 to 17 such runs).
- **`conditionalActivated(runs)`** takes the published run records of one conditional board's S2-5 pilot (`fr-base`, reps 0 to 4;
  none is `[]`) and returns `{ activated, valid, reachingTen }`: `valid` counts the runs whose `runStatus` is `valid`,
  `reachingTen` those of them that reach ten, `activated` is `reachingTen >= 3`; a missing or invalid run is never a completion.
- **Readers.** T11c compiles the plans from the groups (and takes `controls` from `controlsFrom`), T11e activates the initial
  collection from them (and reads `conditionalActivated`) and T11f resolves the comparators and writes the verdict inputs from the
  expansion; T11b's pricing (the subsection below) reads the same reports for `refS` through `withoutSampling`; T11g's manifest (the last
  subsection) prices the plans and the universe built from them.
- **Self-test** (`--items`, unlocked, synthetic: the data file and copies of it, T09a's `newRunRecord` rows): `matrix: a screen class
  with a headline and a control`, `every validated cell has its fallback`, `the comparator keeps the frozen prior`, `a later prior
  change on 14x14 and 24x24`, `dedupe`, `controls from the reports` (with a cell whose runs carry sampling entries only, a cell
  whose runs also carry a `batch` error, and `withoutSampling` itself), `row limits by group`, `disjoint state paths`,
  `collections`, `conditional activation`, `counts` (worked by hand), `the data file` (the recipe, the reps against the fitting
  seeds, the catalogue, the variants) and `the inputs and the data are checked`.

### Pricing (V4-T11b)

The owner approves the frozen round by its price (OD-P10), so the price is the schedule that will execute: one emitted step at a time
(a separately emitted locked step never shares an invocation or a quiet period, R15, R2-12), under the admission rules, lanes, cut and
quiet periods of the runners, with the observations it predicts completed and censored, a hard ceiling from the bounds the code enforces
beside the projection, and the fields with which the orchestrator asks the owner for a cumulative cap. Everything is a pure export of
`manifest.mjs` (unlocked): nothing in it executes any part of the round, and a number is never adjusted to look smaller.

- **The rules simulated.** *Request rows* (`arm.mjs`, the row loop): a row starts while `e + rowLimitS + 10 <= H`. *Bounded items*
  (T04a `runItems` and `lanes.mjs`): consecutive items of one kind and variant form a group run on `ITEM_LANES[kind]` lanes (1 for any
  other kind); a group starts only when its first item is admitted at the current time (`e + reserveS <= H - 15`); each item starts on
  the earliest free lane while `t + reserveS <= H - 15`; an item that is not admitted ends the invocation after the group has drained;
  a completed group drains before the next starts; an item still running at the cut `H - 15` is stopped there and ends `censored` (never
  re-run: T04a's `resumePlan` treats an ended item as done); the margin of 15 s covers the kill and the close. *Process and custom
  items* (T10b, T10c): one at a time, admitted while `e + reserveS <= H - 15`, cut at `H - 15`. The horizon of an invocation is `H` = 885 s
  (`lib/budget.mjs`: `MAX_HORIZON_S`, the owner's 900-s limit less 15 s, which `decide` lowers only when the allowance is short; 285 s before
  V4-T11h) and one quiet period of 45 s per invocation (`QUIET_S`, reserved even where the idle quiet is 15 s: whether difficulty-v3 will be
  idle is unknown when a plan is approved, so the price is fail-closed; `run-task.ps1` counts `node + min(lock wait, 45)` and its dry-run
  forecast adds `projectS + 45 x invocations` per locked step).
- **The overhead assumptions** (the pack author's, D-V4-13; a manifest prints them): 2 s of start-up per invocation (`startupS`) and
  3 s per item group for its lanes and trees (`groupStartS`). A request row takes `projectedRowS` (R15's planning projection, not a bound);
  an item takes the mean measured seconds of its kind and variant (T11c reads them from the item logs), else its reserve. The row margin
  of 10 s and the time a row takes after its limit are assumptions too: no code enforces them as a deadline (RV4-05). `PRICING` holds
  these values and the bounds below as data (the simulations read them; no task names the export yet).
- **A reserve is never a duration or a ceiling** (RV3-05, RV4-05): it controls admission only. The hard ceiling of a step comes from the
  bounds the code enforces: the lock helper kills an invocation at 900 node seconds and `run-task.ps1` counts at most 45 quiet seconds per
  invocation; an invocation that records no progress stops the plan (`run-task.ps1`), so every invocation that does not stop it ends at
  least one unit (a row, or an item: its first admitted item completes or is censored at the cut, and an ended item never runs again).
  A step of `units` rows or items has therefore at most `units` invocations: `ceilingInvocations = units` and `ceilingS = units x 945`.
  A request row has no enforced end inside an invocation (`arm.mjs` only admits it; `calibrate.mjs` cuts the request, then the parent
  reads, validates and publishes without a bound), so no tighter row ceiling is claimed. A step of zero units is never emitted (T11c) and
  is refused here. The step's guard, `1.25 x countedS` (the runner's 1.25 x allocation), is a budget, not a promise that every
  observation completes.
- **The begin line adds no timed run** (IG-P-Q37, point 5): it is one `appendFileSync` after O(board area + pieces) arithmetic before each
  rating and count (T02d), inside the durations the pricing reads (T04e's items ran with it); the work-interval rule adds none either.
- **Projection inputs.** `refS(caseId)` is the median of `responseMs / 1000` over the valid `generation` runs of the cell's MP12b1 report
  (`mp12b1Report`): `runStatus` of `withoutSampling(run)`, the landscape's sampling entries being set aside (ruling of 2026-11-17,
  T11a's QUESTION 1; a valid request that stops short counts, whatever its puzzles); `null` without a report or without a valid run. An
  optional second argument, a lookup function like `mp12b1Report`, is the self-test's seam. `factor()` is `summary.medianRatioBase` of
  `evidence/frozen/V4-T04/identity.json` (read only; 1.0236 today), 1 when the file is absent (the manifest says so), and a present file
  without a positive value throws. `projectedRowS({ refS, factor, rowLimitS })` is `1.25 x factor x refS`, or `rowLimitS` when `refS` is
  `null`; it is not clamped (the simulation cuts the row).
- **`simulateRows({ rows, rowS, rowLimitS, horizonS = 885, startupS = 2 })`**: invocations until every row ran; in each, `e = startupS`, and
  while rows remain and `e + rowLimitS + 10 <= horizonS`: `e += min(rowS, rowLimitS + 10)` (a row with `rowS > rowLimitS` is cut by the
  runner and counted `censored`, else `completed`); the invocation's `nodeS` is its final `e`. An invocation that admits no row returns
  `{ admissible: false, reason: 'a row of <rowLimitS> s does not fit a horizon of <horizonS> s' }`; else `{ admissible: true,
  invocations: [{ rows, nodeS }], nodeS, quietS: 45 x invocations, countedS: nodeS + quietS, guardS: 1.25 x countedS, completed, censored }`.
- **`simulateItems({ groups, horizonS = 885, startupS = 2, groupStartS = 3, cutMarginS = 15 })`**: `groups` in order, each `{ kind, variant,
  lanes, reserveS, durationsS }`. Per invocation `e = startupS`; for each group with items left: if `e + reserveS > horizonS - cutMarginS`
  the invocation ends; else `e += groupStartS`, every lane is free at `e`, and the items left are placed in order, each on the lane that
  is free first at time `t` while `t + reserveS <= horizonS - cutMarginS`; it runs to `t + durationsS[i]`, and when that is past the cut
  it ends at the cut, `censored` (else `completed`); at the first item not admitted the group stops placing; `e` becomes the latest lane
  end (the drain); a group with items left ends the invocation, a finished group passes on to the next. `nodeS` of an invocation is its
  final `e`; its entry is `{ items, nodeS }`. An invocation that places no item returns `{ admissible: false, reason: '<kind> needs
  <reserveS> s; the horizon <horizonS> s admits none' }`: never a forced item, and the whole step is then not priced.
  `simulateProcess({ durationsS, reserveS, horizonS, startupS })` is `simulateItems` with one group of one lane (kind `process`) and
  `groupStartS` 0.
- **`stepPrice(step)`** for an emitted step `{ type: 'rows' | 'items' | 'process', ... }` (the simulation's input as its fields; any other
  field, T11c's `cases`, is ignored) returns `{ admissible, projectS: nodeS, invocations, quietS, countedS, guardS, ceilingS,
  ceilingInvocations, completed, censored, schedule }`: `invocations` is the **count** of locked invocations (the `45 x invocations` of
  `run-task.ps1`'s forecast and of T11c's `allocationMinutes`), `schedule` the simulation's per-invocation list, `ceilingS = units x 945`
  with `units` the rows, the items of all groups or the durations. An inadmissible step is `{ admissible: false, reason }`: no invocation
  is priced. **`price(steps)`** is the sum of the step prices over the same fields, `steps` listing each step price and `inadmissible`
  (`[{ index, reason }]`) the steps that are not priced; with any such step `admissible` is false, the plan is not priceable and its totals
  cover the priced steps only (never the plan's price). **`approvalFields({ roundCountedSBeforeApproval, requestedAdditionalGuardS })`**
  echoes both inputs and adds `requestedCumulativeRoundMinutes = ceil((roundCountedSBeforeApproval + requestedAdditionalGuardS) / 60)`
  (RV2-13, D-V4-02: the round has one cumulative cap, `roundLimitS('frozen')` is 0 and each approval adds minutes; prior invocation records
  are never deleted or reset).
- **Inputs are checked** (fail closed, `manifest: <name> must be ...`): a count of rows or a lane count that is not a positive integer, a
  time, reserve or duration that is not a positive number, a horizon above 885 (the ceiling rests on the runner's bounds), an empty list of
  groups or durations, an unknown step type, a negative or missing approval input and a `refS` that is neither `null` nor a positive number.
- **Readers.** T11c emits each step's `price` input and takes `projectS` and `invocations` from `stepPrice` (and `rowS` from
  `projectedRowS`); T11g (the last subsection below) prices each step of the plans and the universe with `stepPrice` and asks each approval with `approvalFields`.
- **Self-test** (`--items`, unlocked, pure): `price: rows, one per invocation at 260 s`, `rows at 130 s`, `two sequential 120-s process items
  fit one invocation`, `a 200-s process item with a 120-s reserve`, `an item past the cut is censored`, `two lanes differ from one` (with
  unequal durations, so that the earliest free lane is told from round-robin), `two separately emitted steps`, `an inadmissible group`,
  `groups run in order and drain`, `approval fields`, `projection label and fallback` (with `factor()`), `refS reads the timed runs` (on
  18x18 Nightmare's real MP12b1 report, whose 20 runs carry sampling entries only, and on synthetic reports), `the 900-s cap (owner,
  2026-11-17)` (twenty 55-s rows share two invocations of twelve and eight rows at the default horizon 885, and the 120-s and 200-s items one;
  the cases of the earlier horizon pass `horizonS: 285` where they rely on it) and `the inputs are checked`.

### Plans, the isolated P-0 and the prerequisites gate (V4-T11c)

The frozen round is a sequence of plans in the order of R2-11 (as amended by review 3). `manifest.mjs compile` writes the plans that can
be fixed now, the priced universe of stage 4, the template of the second validation and the item manifests the plans name; nothing in
this section executes any plan, rating, pool or measurement (unlocked). The matrix of the previous sections gives the groups, T11b's
`stepPrice` the price of every locked step, and the measured seconds come from the item logs of earlier tasks.

- **Files.** `compile --label frozen --source-label <SL>` writes 16 files and prints one `wrote <path>` line per file, then `compile: 16
  files` (the notes, each plan's allocation and the items priced at their reserve, go to stderr): `plans/V4-S2.json`,
  `plans/V4-LIVE.json`; `plans/V4-S4.universe.json` and `plans/V4-S4X.template.json`; `plans/items/V4-S2P.p0-v4.json`,
  `plans/items/V4-S2P.parity-<arm>.json` (the seven stage-2 arms) and `plans/items/V4-S4P.parity-<arm>.json` (`fr-frozen`,
  `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped`). A plan or template carries `"generatedBy": "manifest.mjs compile"`;
  the command refuses (exit 1, nothing written) when an existing target lacks it (an item manifest: `"format": "ig-proto-items"` and a
  `task` of `V4-S2P` or `V4-S4P`) or when a step is not admissible (`manifest: <n> step(s) not admissible: <plan>/<step>: <reason>`), and
  otherwise replaces its own files, so a second run prints the same 16 lines. `compilePlans(expansion, priceOf, { durations })` returns
  `{ plans, templates, itemManifests }`, each keyed by file name (`options.rowSOf`, `options.stage1Parity` are seams; the defaults are
  `projectedRowS` of the cell's MP12b1 median and `plans/V4-T04.parity.json`).
- **A plan** is `{ task, generatedBy, runnable, blockedBy, prerequisites, allocationMinutes, optionalMinutes, steps }` (`planOf`:
  `allocationMinutes` is the ceiling in minutes of the required locked steps' `projectS + 45 x invocations`, `optionalMinutes` the same for
  the optional ones). A **step** is `{ id, locked, node, state, repeatUntilDone, projectS, minHorizonS, invocations, optional, price,
  dependsOn, consumes, produces, expect, exitOn }` (`state`, `repeatUntilDone`, `projectS`, `minHorizonS`, `invocations` and `price` for
  locked steps only): `node` is the argv of `run-task.ps1` (the script path with backslashes first, then one word per element; the runner
  appends `--label`, `--source-label` and, for a locked step, `--horizon-s`); `price` is the simulation's input (the plan's `projectS` and
  `invocations` are `stepPrice` of it); `consumes` and `produces` are paths relative to the root with `/`; `exitOn` is `a nonzero exit
  stops the plan (run-task.ps1)`. Every locked step has `repeatUntilDone: true`, its full `state` path and `minHorizonS`: `rowLimitS + 12`
  for a row step, 270 for a P-1 parity step, 150 for the P-0, the counters, the profile and the width run.
- **Builders** (pure exports, reused by T11e and T11f): `rowStep(group, priceOf, rowS)` (`arm.mjs run` with the group's arguments, the
  variant of `arms[<arm>].variant` in the data file or the group's own `variant`, `--workers` from the data; a group of no rows throws
  `manifest: a row step needs at least one row (<key>)`), `parityManifest(task, arm)`, `itemGroups(manifest, durations)`,
  `parityPass(task, arm, priceOf, durations)` (`parity-<arm>`, `receipt-<arm>` with `--require-pass`, `accept-<arm>` `--by` the plan of
  the stage) and `planOf`. `priceOf` is `stepPrice` (a wrapper gets the step id as a second argument).
- **`V4-S2`** (`runnable: true`; prerequisite: the stage-1 accepted binding with `current: []`), in order, the proofs first so that a
  failed or incomplete proof stops the plan before any request row runs: `prerequisites` (the gate), `firewall-snapshot`, `trees`, the
  isolated P-0 (`p0-v4`, `receipt-p0` with `--kind p0-identity --require-pass --baseline` the stage-1 binding, `accept-p0`), the P-1
  pass of each of `fr-base`, `fr-screen`, `fr-none`, `fr-close`, `fr-c4`, `fr-ps` and `fr-p5` under `V4-S2P` (`parity-<arm>`,
  `receipt-<arm>`, `accept-<arm>`: nine `v4-select` items, one `v4-generate` and its two `v4-replay` items, 12 items), a `rowStep` of
  each of the 33 stage-2 groups, `publish-<arm>`, the probes (`kernel-counters` 30 items, `kernel-profile` 2, `kernel-report`, `width` 8
  items of three rounds, `width-report`) and `firewall-check`. **`V4-LIVE`** (`runnable: false`, `blockedBy: ['N-V4-03', 'N-V4-13']`)
  has the same shape for the two `live` groups on `fr-frozen`, with the snapshot its `firewall-check` needs, `live-receipt` (`live-deadline.mjs
  receipt --task V4-LIVE --require-pass`, a mandatory proof like the others) and `accept-live`; its prerequisites are the variant
  `fr-frozen`, the files `evidence/frozen/V4-S3/freeze.json` and `tools/ig-proto/live-deadline.mjs`, and the accepted P-0 binding with
  `current: ['v4']`.
- **The isolated P-0** (RV3-02, D-V4-19): `plans/items/V4-S2P.p0-v4.json` is `plans/V4-T04.parity.json` (its 8 rows, 23 items) under the
  task `V4-S2P` and the step `p0-v4`, with the state `V4-S2P\p0-v4\state.json`: it reads the stage-1 manifest and the stage-1 raw
  files, never writes under `V4-T04`. Its `p0-identity` receipt (T11d) is a required pass and its accepted binding a prerequisite of
  `V4-LIVE` and of every stage-4 plan; the existence of the stage-1 receipt is never a substitute.
- **The universe and the template** (`runnable: false`, `template: true`, no `node`): `V4-S4.universe.json` has `collections` `initial`,
  `conditional`, `optional` and `second`, each `{ groups, comparators }`, every group with its row step's `price` (the input, `rowS` from
  the cell's projection), `projectS` and `invocations`; its comparators keep the arm `shipped-uncapped` (T11f resolves it);
  `V4-S4X.template.json` holds the S4-7 twins and comparators (task `V4-S4XC`) and `blockedBy: ['N-V4-04']`. No executable stage-4 plan is
  compiled here: `V4-S4` is written at the activation (T11e).
- **Prices.** Each step is priced alone as it runs. The seconds of an item are the mean `ms / 1000` per `<kind>/<variant>` over the
  `item-end` lines of `V4-T04/parity`, `V4-T04/replay`, `V4-T10a/counters`, `V4-T10b/profile` and `V4-T10c/run` (`durationsFromLogs`; the
  kind and variant are those of the item's `item-start` line, every status counts, a width item takes three times the one-round mean); a
  kind or variant without a measure takes its reserve, and the group says so (`durationSource` `reserve`; `reservePriced(plans)` lists
  them): today every P-1 pass of the seven stage-2 arms, which no earlier task ran. The probes' populations are those of their commands
  (T10a's six subsets of each of five cases, T10b's two cases, T10c's four widths of two cases) and each probe step's `price` input
  records its `cases`, equal to the `--cases` of its `node`.
- **The prerequisites gate.** `check-prerequisites --plan <id> --label frozen --source-label <SL>` checks the `prerequisites` of
  `plans/<id>.json` and prints `prerequisites: pass` (exit 0) or `prerequisites: blocked (<reason>; ...)` (exit 1); every plan's first
  step runs it, and the runner stops the plan at a nonzero unlocked step. `checkPrerequisites(list, { variants, exists, readJson,
  currentOf })` (async, pure core) returns `{ status, reasons, line }`: `{ type: 'variant', id }` passes when the id is in
  `listVariants()` (else `variant <id> missing`), `{ type: 'file', path }` when the file exists (else `missing file <path>`), `{ type:
  'accepted', path, current, kind?, fields? }` when the binding exists (else `missing binding <path>`), `checkAccepted` passes with
  today's tree of each `current` id, its `expected.kind` is `kind` (else `<path> is not a <kind> binding`) and, for `fields:
  'LIVE_DEADLINE_FIELDS'`, its `expected.fields` equal T04d's `LIVE_DEADLINE_FIELDS` (else `<path> lacks the live-deadline fields`); `{ type:
  'selection', path, activation }` (V4-T11f, below) when the class-selection receipt at `path` passes `proofCheck` against the expectation of the
  activation record (else `selection: <reason>`); another type is `unknown prerequisite <type>`. A parity, P-0, stage-1 or live-deadline receipt is
  a prerequisite only through its accepted binding (RV3-06); the class-selection receipt is checked against records the gate reads itself. Today
  `V4-S2` passes and `V4-LIVE` is blocked on `fr-frozen`, `freeze.json`, `live-deadline.mjs` and the P-0 binding, as it must be.
- **PowerShell readers.** A rows step's `price` holds `rows` and `rowS`, keys that differ only in case, which PowerShell 7's
  `ConvertFrom-Json` refuses. `run-task.ps1` therefore reads a plan with `ConvertFrom-Json -AsHashtable` (line 39; the state files and the
  budget decisions are read as before, and every earlier plan reads as before: the dry run of `plans/V4-T10c.json` is identical), and any
  PowerShell reader of a compiled plan, template or manifest must do the same. The plans of T11e and T11f use the same step builder.
- **Self-test** (`--items`, unlocked, pure): the `compile:` cases `no unresolved argument`, `producers before consumers`, `P-0 is isolated
  and required` (and every P-1 pass, the proofs-first order of `V4-S2` and the required live receipt), `no executable stage-4 plan`, `disjoint state paths`, `each step priced as it runs`, `bounded steps
  resume` (the first row step, five rows of 201.5 s at a 260-s limit, needs two invocations at horizon 885: four rows, then one),
  `populations as priced` (the probes' items built by their own modules, the row steps' `--cases` parsed by `arm.mjs`),
  `blocked plans refuse` (bindings built by `acceptedBinding` over temporary receipts), `the measured seconds and the reserve` and `only
  its own files are written`.

### Stage-4 collections: the activation and the closure (V4-T11e)

The stage-4 validation measures one declared collection, fixed before it runs (R3-04, RV4-07, D-V4-20): its required cells, the
conditional boards whose five-seed pilots qualified and the optional items the owner approved. The priced universe
(`plans/V4-S4.universe.json`, T11c) stays as it is, with the conservative price of every option apart; the activation writes the collection
that is measured. Everything here is data and pure functions (unlocked): nothing runs a plan, a rating, a pool or a measurement, and the
commands write records that are never rewritten. T11e itself runs neither command on the repository's records.

- **The order is data first, then time** (RV4-07, check-list 3.4). The owner decides the optional item S4-6 and authorizes the data-only
  `activate`, which writes the activation record, the plan `V4-S4` and its price; only then does the orchestrator ask the owner for the
  timed allowance with `approval --plan V4-S4` (T11g), and no locked step runs before that approval. `activate` runs after stage 2, the
  freeze and the live-deadline binding exist, on the orchestrator's go; `close` runs only on the owner's instruction.
- **`activation(expansion, { pilots, approvedOptional, epoch })`** (pure) returns `{ format: 'ig-v4-activation', version: 1, collection:
  'initial', epoch, conditional, optional, groups, declaredRows, comparatorCells }` (`activate` adds `createdAt`). `pilots` maps each
  `hell1Conditional` board to the run records of its S2-5 pilot (a board without a key, or with `[]`, has none; a key that is no conditional
  board throws), `approvedOptional` lists the optional items approved (a subset of `['S4-6']`: any other id throws, and so does a repeated
  one), `epoch` is `{ data, freeze, universe }`, each `{ path, sha256 }`.
  - `conditional`: per board `{ cell, activated, valid, reachingTen, pilotRuns }`, `conditionalActivated` of its runs (at least three valid
    requests reaching ten; a missing or invalid run is never a completion) and `pilotRuns` the number of run records read.
  - `optional`: `{ approved, notApproved }`, the optional items of the matrix split by the approval.
  - `groups`: `[{ key, origin }]` with `key` = `groupKey(group)` and `origin` the group's collection: every non-comparator group of
    collection `initial`, those of collection `conditional` on an activated board and those of collection `optional` whose item is approved,
    in the matrix's order. `declaredRows`: `<arm>/<rowKey>` (`rowKey` = `<cell>~<rep>`, `arm.mjs`) for every rep of those groups (a row
    listed twice throws). `comparatorCells`: `[{ cell, from, to, rows, shard }]`, the comparator groups of `initial` and of the activated
    boards. On today's controls (ten) with no activated board and no approval it has 76 groups, 1,040 declared rows (reps 20 to 39) and 17
    comparator cells, the cells of S4-1, S4-2 and S4-3; no rep from 40 to 59, no `factor-` or `second-` shard and no conditional board.
- **`activationPlans(expansion, record, priceOf, { activationSha256, durations, rowSOf, activationPath })`** (pure) returns `{ plan,
  template }` built from the record's groups. The plan `V4-S4` (`generatedBy` `manifest.mjs activate`, `runnable: true`) has the steps, in
  order: `prerequisites` (the gate), `firewall-snapshot`, `trees` (`build log-link fr-frozen fr-frozen-none fr-frozen-uncapped
  fr-frozen-none-uncapped`), the P-1 pass of the four stage-4 arms under `V4-S4P` (`parity-<arm>`, `receipt-<arm>`, `accept-<arm>`: the
  proofs before the rows, as in `V4-S2`, so that a failed proof stops the plan after minutes), a `rowStep` of every selected group, the
  `publish-<arm>` steps, `verdict-input` (T11f: `manifest.mjs verdict-input --purpose selection`, after every publish and accept step),
  `verdicts` (`verdicts.mjs --manifest tools\ig-proto\plans\verdicts\V4-S4.verdict-manifest.json`, producing
  `evidence/frozen/V4-S4/class-selection.json`), `resolve-comparators` (T11f: `manifest.mjs resolve-comparators`, writing
  `plans/V4-S4C.json`) and `firewall-check`. **Every selected group is required**: its row step has `optional: false` whatever its origin
  (the matrix marks the conditional and optional groups optional; `run-task.ps1` selects the steps without `optional`), so it enters
  `allocationMinutes` (`optionalMinutes` is 0) and a default run and a default approval cover exactly `declaredRows`. No row is a comparator
  row: no `node` has `shipped-uncapped` and no shard is `factor-` or `second-` unless approved or activated. The prerequisites are the four
  variants, the freeze file and the activation record, and three accepted bindings: stage 1 (`current: []`), P-0 (`current: ['v4']`) and
  the live deadline (`kind: 'live-deadline'`, `fields: 'LIVE_DEADLINE_FIELDS'`, `current: ['fr-frozen', 'fr-frozen-none']`); the parity
  bindings are produced by the plan itself. Every step follows T11c's rules (an argv array, every locked step `repeatUntilDone` with its
  `state` and `minHorizonS`; `rowStep`, `parityPass` and `planOf`). The template `plans/V4-S4C.template.json` is `{ task: 'V4-S4C',
  generatedBy: 'manifest.mjs activate', template: true, runnable: false, activationSha256, cells }`: one `{ cell, from, to, rows,
  rowLimitS: 260, shard, candidates: ['fr-frozen-uncapped', 'fr-frozen-none-uncapped'], price }` per comparator cell of the record, `price`
  being the simulation input of its row step at the cell's projection (`{ type: 'rows', rows, rowS, rowLimitS }`), and nothing else: no cell
  of an unactivated option and none of the second validation (it stays T11c's template until N-V4-04). T11f resolves the template from a
  final selection of the same activation.
- **`activate --collection initial [--approve-optional <ids>] --label frozen --source-label <SL>`** (`activateCommand(argv, paths)`).
  Refusals, in this order, each exit 1 with nothing written: `activation exists: an activation is never rewritten`, a missing
  `--collection` or one other than `initial` (`only the initial collection is activated here; the second is N-V4-04's`), a missing freeze
  file (`evidence/frozen/V4-S3/freeze.json`) or universe, an existing `plans/V4-S4.json` or `plans/V4-S4C.template.json`, an id that cannot be
  approved, a pilot row published twice, and a step that is not admissible; and, once the record and the plans are built and before anything is
  written, **a freeze file whose classes do not name exactly the record's comparator cells** (V4-T11f). The freeze file is read with the shape
  check of `resolve-comparators` (`<path> is not a freeze file: its classes must be [{ id, cells, screen, noScreen }]` refuses); then every
  comparator cell must be in exactly one class and every class cell must be a comparator cell, else `manifest: the freeze file's classes do not
  match the comparator cells of the collection (<parts>)`, `<parts>` joined by `; `, in this order and only when not empty: `not in a class
  <cells>` (comparator cells of no class, in the record's order), `in more than one class <cells>` (in the record's order; a cell listed twice in
  one class counts, as T09e refuses such a manifest) and `not measured <cells>` (class cells that are no comparator cell, sorted), each list
  joined by `, `. The reason: `resolve-comparators` refuses a comparator cell that no class ships (`no shipped arm for <cell>`), and a class cell
  that stage 4 does not measure would leave its class inconclusive (T09e), and the record is never rewritten. It reads the pilots (`evidence/frozen/V4-S2/fr-base/*.runs.json`: the
  `run` of every row of a conditional board with a pilot rep, `reps.pilot`, 0 to 4; rows of other reps or cases are not read; no folder, no
  runs), hashes the data file, the freeze file and the universe with `sha256File`, builds the record and the plans (the controls of
  today's reports, the measured durations of the item logs and the cell projections as `compile` takes them) before anything is written,
  then writes the record, the plan and the template, in that order. It prints `activation: <n> groups, <m> declared rows, <k> comparator
  cells; conditional <cell>: <activated> (<reachingTen> of <valid> valid); ...; optional approved <ids>` and `V4-S4: allocation <a> min,
  optional 0 min; ask the owner with approval --plan V4-S4 before any run` (the files written, and a note for each board that has no published
  pilot run, go to stderr: that board is then not activated, and the record is never rewritten, so the orchestrator gives its go after
  stage 2 has published the pilots). The record is the owner's
  decision on the optional scope fixed in a file; the template carries the SHA-256 of that file (`sha256File`).
- **`close --collection initial --reason <text> --label frozen --source-label <SL>`** (`closeCommand(argv, paths)`) on the owner's
  instruction: `published` is `<arm>/<rowKey>` of every row of `evidence/frozen/V4-S4/<arm>/*.runs.json` (the arm is the folder; a file that
  is not JSON or has no list of rows publishes nothing, as the verdict tool reads it, and is told on stderr), `missing` the declared rows of
  the activation record that are not published, in their order. It refuses (exit 1, nothing written) a closure that exists (`closure
  exists: a closure is never rewritten`), another collection or a missing reason, a record that is not an activation, and an empty `missing`
  (`nothing to close`); else it writes `closure.json` = `{ format: 'ig-v4-closure', version: 1, collection: 'initial', activation: {
  path, sha256 }, missing, reason, createdAt }` and prints `closure: <n> missing rows`. A selection is final only by complete publication or
  by this record, and the comparators are resolved only from that collection's final selection (T11f, T09e).
- **Readers.** T09e reads `activation.epoch.freeze`, `declaredRows` and the closure's `activation.sha256` and `missing`; T11f resolves
  the template, builds `verdict-input` from the record and the plan and checks the selection against them; T11g prices the plan with
  `approval --plan V4-S4` once it exists.
- **Self-test** (`--items`, unlocked, synthetic: the default expansion with T09a's run records, scratch records under
  `tests/artifacts/ig-proto/selftest/collections`): `activate: the default initial collection`, `an activated conditional board`, `the selected
  scope is required` (the optional flag is reset, the rows the runner's default rule selects equal `declaredRows`, the allocation includes
  the added steps), `optional items only with approval`, `never rewritten` (`activateCommand` twice, the refusals, the pilot readings, the
  printout), `a complete producer chain` (every consumed path produced earlier or declared, only the five real variants, the proofs before
  the rows, the gate understanding every prerequisite), `the inputs are checked`, `close: exactly the missing rows` and `the freeze names
  exactly the comparator cells` (V4-T11f: the cases that run `activate` write a freeze file whose classes name the comparator cells of the
  activation they make; the refusals leave nothing written).

### Comparators and verdict inputs (V4-T11f)

The comparator of a cell is the uncapped twin of the arm its class ships, so it can only be chosen from a final class selection of the
same collection (R2-11 steps 5 and 6, R3-03, R3-04, RV3-06). T11f resolves the comparator template of T11e into the concrete plan `V4-S4C`
and writes the two verdict manifests (T09a's schema) that T09e's `verdicts.mjs` reads. All of it reads records and writes data (unlocked):
nothing here runs a plan, a rating, a pool or a measurement, and nothing is written under `docs/improve-generating/evidence/frozen/` by a
self-test.

- **`closureOf(activationPath, activationSha256, { readFile })`** reads `closure.json` in the folder of the activation record (T11e's `close`
  writes it there; no plan names a closure argument): `null` when the file is absent, else `{ ref: { path, sha256 }, record }` with `path`
  repository-relative with `/` and `sha256` as `sha256File`. A text that is not an object with a list of strings `missing` throws `an
  unreadable closure exists: <path>`, and a record whose `activation.sha256` is not the record's throws `the closure belongs to another
  activation: <path>`; a closure is never read as no closure and never read for another activation. `resolve-comparators`, `verdict-input`
  and the `selection` prerequisite read the closure only through it (a throw refuses the command, `<command>: <message>`, exit 1, nothing
  written, or blocks the prerequisite).
- **`publishedRuns({ task, arm, variant }, { readFile, list, who })`** lists every `*.runs.json` of
  `evidence/frozen/<task>/<arm>/` with its SHA-256 and reads `meta.trees.<variant>`, which every file that carries it must carry alike (two
  different values throw `<who>: two trees in the runs of <arm>`); a file that is not JSON or carries no tree is listed and gives no
  identity (the verdict tool judges its rows invalid, T09e), and an arm with no file, or none with a tree, is `null`.
- **`selectionExpectation({ activation, activationSha256, closure, closureSha256, freeze, runsMeta, harnessHash })`** is the expectation of the
  class-selection receipt (T09e), built apart from it (RV3-06): the kind, the frozen source, today's harness (the selection is written by
  `verdicts.mjs` in the same plan), the distinct screen and no-screen arms of the freeze file's classes in sorted order with the tree id and the
  SHA-256 of `JSON.stringify(params)` of `runsMeta[<arm>]` (the arm's `meta.trees.<variant>`, one value or the list of its runs files' values,
  which must be equal: `resolve: two trees in the runs of <arm>`), `coverage.expected` the declared rows less the
  closure's `missing`, and `fields.collection` `{ activationSha256, closureSha256 (null without a closure), missing }`. **`selectionInputs(
  activationPath, io)`** reads those records (the activation record, `closureOf`, the freeze file `epoch.freeze` names, `publishedRuns` of each
  class arm under `V4-S4`, `harnessInfo()`) and returns the expectation; a missing record throws.
- **`resolveComparators(template, selection, expectation, io)`** (pure) and **`resolve-comparators --selection <receipt> --activation <record>
  --out <plan> --label frozen --source-label <SL>`**. The refusals, in this order, each `resolve-comparators: <reason>` on stderr, exit 1,
  nothing written: a template whose `task` is not `V4-S4C` (`not a V4-S4C template`), one whose `activationSha256` is not the record's
  (`the template belongs to another activation`), a receipt that does not pass `proofCheck` against the expectation (`the selection is not
  final (<reasons>)`: an interim report, a stale tree or parameters, another producer, a declared row not observed, changed evidence, another
  kind), a template cell the selection ships no arm for (`no shipped arm for <cell>`: the cell is not in `selection.cells`, or its shipped arm
  is neither `fr-frozen` nor `fr-frozen-none`; `activate` makes the first case impossible for a freeze file it accepted, see above), a missing
  receipt, template or record, a closure of another activation or an unreadable one,
  a class arm with no published runs, and an `--out` that exists and lacks `"generatedBy": "manifest.mjs resolve-comparators"`. Otherwise
  `fr-frozen` resolves to `fr-frozen-uncapped` and `fr-frozen-none` to `fr-frozen-none-uncapped`, and the plan `V4-S4C` (`runnable: true`) has the
  steps `prerequisites`, `firewall-snapshot`, `trees` (`build` the resolved variants), a `rowStep` per template cell (`--task V4-S4C --arm
  <resolved> --variant <resolved> --shard <the template's> --cases <cell>:<from>-<to> --row-limit-s 260`, state
  `V4-S4C\<resolved>\<shard>\state.json`, required, the row limit the data's `rowLimitS.default` whatever the template says, priced at the
  template's `rowS`), `publish-<resolved>` per resolved arm, `verdict-input`
  (`--purpose final --activation <record> --selection <receipt> --out tools\ig-proto\plans\verdicts\V4-S4F.verdict-manifest.json`), `verdicts`
  (producing `evidence/frozen/V4-S4F/verdicts.json` and `.md`) and `firewall-check`; its prerequisites are the resolved variants, the receipt
  (`file`) and `{ type: 'selection', path, activation }`. The command prints `wrote <path>` and `resolve-comparators: <n> cells, <variants>;
  V4-S4C: allocation <a> min`, and a second run replaces its own plan with the same bytes.
- **The `selection` prerequisite** (`checkPrerequisites`, T11c): `{ type: 'selection', path, activation }` passes when `proofCheck` passes for
  the receipt at `path` against `selectionInputs(activation)`; every reason, a thrown one (a closure of another activation, no published runs)
  included, is `selection: <reason>` in `prerequisites: blocked (...)`. `readFile`, `list` and `harnessHash` of the gate's `io` serve this type
  only (the defaults read the repository and today's harness), and the gate step of a plan consumes the activation record the entry names.
- **`verdictInput(purpose, { activation, activationRef, closureRef, selectionRef, freeze, expansion, published, comparatorPlan, data })`** (pure,
  `published(arm)` is `publishedRuns` or a stand-in) and **`verdict-input --purpose <selection | final> --activation <record> [--selection
  <receipt>] --out <path> --label frozen --source-label <SL>`**: the manifest of T09a's schema, `task` `V4-S4` (`selection`) or `V4-S4F`
  (`final`), `label` `frozen`, `quantity` 10, `capMs` and `responseBoundMs` 120,000, `resampleSeed` and `resamples` of the data file (20261116,
  10,000), `validationReps` 20 to 39, `masterReps` 20 to 24, `collection` `{ activation, closure }` (`{ path, sha256 }`, the closure `null`
  without one), `selection` (final only: the receipt's `{ path, sha256 }`), `arms` (the activation's arms `fr-frozen`, `fr-frozen-none`,
  `log-link` and, for `final`, the resolved comparator arms read from the plan's row steps: `id` the arm's name, `task`, `arm`, `variant`,
  `treeId` of its runs files and every `*.runs.json` with its SHA-256), `classes` of the freeze file, `failingCells` (the data's five),
  `controls` (`{ cell, today: 'log-link' }` per cell of S4-3), `masters` (`{ cell, today: 'log-link', after: 'fr-frozen' }` per cell of S4-4),
  `hell1` (the validated boards and the activated conditional boards), `p5` (`selection`: `[]`, so T09d never passes its phase 0; `final`: one
  `{ cell, bounded, uncapped, reps }` per cell of the comparator plan, `bounded` the comparator's `comparatorOf` twin and `reps` those of its
  `--cases`), `deadlineProjection` (`fr-frozen`, `fr-frozen-none`, reserves 0.3, 0.4, 0.5, 115,000 ms) and `prerequisites` (stage 1 with
  `current: []`, the parity bindings of the four stage-4 arms under `V4-S4P` and the P-0 binding with `current: ['v4']`, the live-deadline
  binding with `current: ['fr-frozen', 'fr-frozen-none']`). A declared arm without a published runs file throws `verdict-input: not
  published <arm>`; refusals of the command, each `verdict-input: <reason>`, exit 1, nothing written: another label, a purpose that is neither,
  a missing `--activation` or `--out`, `final` without `--selection` (and `selection` with one), a missing receipt, comparator plan
  (`plans/V4-S4C.json`) or record, and the throws above. The manifest has no time stamp: the same records give the same bytes. The class
  selection binds the manifest by its SHA-256 (T09e), so a manifest rewritten with other content after a decided selection makes that
  selection `evidence changed`, which `resolve-comparators` refuses.
- **Readers.** T09e's `verdicts.mjs` reads both manifests; the plans of T11e (`resolve-comparators`, `verdict-input` of `V4-S4`) and the plan
  `V4-S4C` name the commands; T11g's `approval --plan V4-S4C` reads the plan this resolution writes (it exits 1 before it exists).
- **Self-test** (`--items`, unlocked, synthetic: the default expansion, receipts built by T09e's `classSelection`, runs files in memory,
  scratch records under `tests/artifacts/ig-proto/selftest/resolve`): `resolve: comparators from a final selection`, `an interim selection is
  refused` (an incomplete receipt, a forged pass without a row, another tree, other parameters, another producer, changed evidence, another
  kind, a cell with no shipped arm), `a closed collection resolves` (the closure `close` writes), `the template belongs to its activation`,
  `verdict input: selection and final`, `verdict input: not published`, `closure: beside its activation`, `resolve: the commands` (both commands
  and the dispatcher), `the selection prerequisite`, `the expectation is built apart from the receipt` and `the expectation fits the receipt
  the verdict tool writes` (T09e's `verdictRecords` writes the receipt, with and without a closure).

### The manifest for the owner (V4-T11g)

The owner approves the frozen round only as a separately priced, staged manifest made after source preparation (OD-P10, plan 5.1 "Budget").
`price` writes it and `approval` asks each approval; both are unlocked, read records and run nothing. The task ends at the owner: nothing
of stages 2 to 5, the parity passes, the probes, the live-deadline receipt or the browser calibration runs before the owner approves that plan's
price, and each approval is asked again with `approval --plan <id>` when it is needed (never from the quote).

- **`price --label frozen --source-label <SL>`** reads the compiled plans `V4-S2` and `V4-LIVE`, the universe `V4-S4.universe.json` and the
  second-validation template `V4-S4X.template.json` (T11c), the matrix data, the identity record (the factor, 1 when it is absent), T03's
  `inventory.json` (the line `PM1 inventory: missing` when it is absent), every `invocations.jsonl` of the label (the counted time spent), IGP-05's
  `families-*.jsonl` and IGP-02's `profiles-*.jsonl` (stage 5), the MP12b1 reports (the cells without a median), the item logs of the earlier tasks
  (the measured seconds) and `docs/improve-generating/plan.md` (the passages it quotes), and writes `docs/improve-generating/evidence/frozen/V4-T11/manifest.json`
  (the `meta` block, every input with its path and SHA-256, every plan, step, group and item with its numbers and commands, the approval requests)
  and `manifest.md`. It prints `wrote <path>` twice and a one-line summary; a second run replaces its own two files (the `createdAt` moves).
- **`manifestOf({ plans, universe, s4x, stage5, browser, spentS, inventory, context })`** (pure) applies T11b's `stepPrice` to the price input of
  every locked step and every group, and gives for each plan (required steps, optional steps, all, and by kind of step), each collection of the
  universe (the groups, the comparators, the total, each item, each conditional board apart, S4-6 apart) the projected counted seconds, the guard
  (`1.25 x`), the ceiling (T11b's `units x 945`, in minutes the sum over 60 rounded up) and the predicted completed and censored observations.
  The initial total excludes the conditional boards and S4-6, which are `options` with their own prices. A step or group that is not priceable
  throws. `context` carries what the sections quote or compare (every key optional): the matrix data, the catalogue (for N-V4-18's saving), the
  cells without an MP12b1 median, the four P-1 passes of `V4-S4` (priced at their reserves, as T11e prices them), the plan's quotes, the measured
  seconds and the factor. The record also holds the comparison of section 8: the same request rows at the horizon 885 s and at the pre-T11h
  horizon 285 s, the causes of the initial collection by item and across items, and N-V4-18's conditional saving.
- **Not priced here** (R3-05, RV3-05). `stage5Items` gives each stage-5 item an indication, never a price: S5-1 and S5-2 are, per cell of the
  catalogue's Hell 1 and Hell 2 levels, `60 x` the mean probes per family of the cell in IGP-05's families `x` its mean probe `ms / 1000 / 4` (10 sets x 3
  layouts x 2 orders at four lanes), so a cell with no family in IGP-05's records (`26x26-hell-1`) is listed without an indication and never
  estimated; S5-3 is `1.25 x` the sum of `canonical.ms / 1000` of PM4's profiles; S5-4 is data only (0); S5-5 has none. `manifestOf` keeps every one
  `priced: false`, `pricedBy: 'N-V4-04'`, with no ceiling and no approval request. `browserInput` gives B-1's Node part (the frozen `base` tree on
  `10x10-nightmare`, `12x12-nightmare`, `26x26-nightmare` and `14x14-master`, reps 0 to 4, row limit 260 s, each row at the planning projection),
  which is priced like any request rows; B-1's browser part and B-2 (the Generator page on `10x10`, `12x12` Nightmare and `14x14` Master) are projected as
  `4.5 x` the node seconds of the matching Node rows, labelled a bench-page factor for B-1, and their ceilings are unpriced until N-V4-01.
- **`approvalFor({ spentS, earlierGuardS, guardS })`** (pure) returns `{ spentS, assumedEarlierGuardS, roundCountedSBeforeApproval,
  requestedAdditionalGuardS, requestedCumulativeRoundMinutes }` (RV2-13): the counted seconds already spent plus the guards of the earlier
  approvals (assumed spent to their guard) plus the guard asked for, over 60, rounded up. **`planGuardS(plan, { optional })`** is the sum of the
  guards of a plan's locked steps (`--optional` adds the optional ones). The manifest's approval list is the chain `V4-S2` (exact), `V4-LIVE`
  (exact), `V4-S4` (an indication: the initial groups and the four P-1 passes, asked after its data-only activation), `V4-S4C`, `V4-S4X` and
  `V4-S4XC` (indications), each entry assuming the guards above it spent; the options raise the later caps when chosen.
- **`approval --plan <id> [--after <ids>] [--optional] --label frozen --source-label <SL>`** prints one JSON line `{ plan, spentS,
  assumedEarlierGuardS, roundCountedSBeforeApproval, requestedAdditionalGuardS, requestedCumulativeRoundMinutes }` for the plan file
  `plans/<id>.json`: `spentS` is re-read now from the invocation logs (`readInvocations('frozen')`), the guards come from the plans' prices, `--after`
  names the plan files (comma-separated) whose guards are assumed spent. A plan that has no file yet exits 1 with `approval: <id> is priced at its
  <activation | resolution>; ask then` (`V4-S4` and `V4-S4X` at their activation, `V4-S4C` and `V4-S4XC` at their resolution); another unknown plan,
  an `--after` with no file and another label are refused (`approval: <reason>`, exit 1, nothing printed). The seconds that are in no log (T10a's
  deleted scratch run, the register's 55.4 s) are not in `spentS`, which is the budget guard's own reading; the manifest says so and gives the cap
  with them (`requestedCumulativeRoundMinutesWithOffLog` in `manifest.json`).
- **`manifest.md`** has eight sections: (1) the price per plan, collection and item, with the unpriced items; (2) what the owner approves, now and later;
  (3) the plans, their steps, commands and prerequisites, and the named items that unblock them; (4) seeds, limits, concurrency and the rules quoted
  from the plan; (5) the browser calibration and its labels; (6) the risks of plan section 8 (and section 9's replay prefetch) that bear on the price,
  quoted by `planQuotes` and failing if a passage moved; (7) T11b's pricing rules and the overhead assumptions; (8) the difference from the plan's
  indication of stage 4 (3.4 to 4.2 h), each cause with its minutes.
- **Self-test** (`--items`, unlocked): `approval: re-read and cumulative` (the pure core, the command on synthetic plans and on the real ones),
  `price: stage 5 is not priced here`, `price: the universe keeps its options apart`, `price: ceilings beside projections` and `price: the text quotes
  the plan and the manifest is written` (`planQuotes`, and `price` on the real records into a scratch folder). The dry runs of the plans are the
  gate of the task: `approval` then `run-task.ps1 -DryRun` with the requested cumulative cap (a dry run without `-LockHelper`, the only run that may
  pass a cap above the granted one), and a last dry run with the counted minutes already spent, rounded down, which stops honestly.

### Written plans (stages 2 to 4 pack)

`manifest.mjs write-plan --plan <id> --label frozen --source-label <SL>` writes `plans/<id>.json` (and its item manifests under
`plans/items/`) once, `generatedBy` `manifest.mjs write-plan`, from `writtenPlan(id)`, which uses T11c's `rowStep`, `parityPass`, `planOf` and
`stepPrice` and the step builders `gateStep`, `firewallSnapshotStep`, `treesStep`, `publishStep` and `firewallCheckStep` (exported for it); an
existing plan or item manifest is refused (`plan exists: a plan is never rewritten`), and `compile` is never run again (N-V4-02). Plans:
`V4-S2B` (the control pilot: `fr-none` on the eight unpiloted Nightmare controls, reps 0 to 4, 40 rows at 260 s, prerequisite the accepted P-1
binding of `fr-none`; allocation 23 min, guard 28.24 min). Self-test (`--items`, unlocked): `write-plan: V4-S2B`.
`V4-P7` (T05b): the P7 timing probe, `write-plan --plan V4-P7 --candidates <ids>`: per composite an unlocked step `bind-<id>` (its quick and
full equality reports bound to the tree to be timed) and one locked step `time-<id>` of 90 paired `p7-time` items (one lane, reserve 90 s,
priced at V4-S2K's item times x 1.25), then `report`; prerequisites the composites and their quick and full equality reports; three
composites: allocation 16 min, guard 19.37 min (the owner's 20 minutes, D-S24-28); no eligible composite, no plan. Self-test (`--items`,
unlocked): `write-plan: V4-P7`.

## The fitting reader (stages 2 to 4 pack, T02b and T02c)

`fit-read.mjs` is a read-only tool: the SAs' readings of the control pilot (S01, on `V4-S2B`) and of the proposed budgets (T11, on `V4-S3P`)
are commands, not hand reads. It runs unlocked and never changes a published or raw file.

```
node tools\ig-proto\fit-read.mjs preview --task <T> --arm <A> --label frozen --source-label <SL>
node tools\ig-proto\fit-read.mjs prefixes --task <T> --arm <A> --budget <level>=<units>[,<level>=<units>...] [--bound <n>] --label frozen --source-label <SL>
```

- **The declared grid** (`fitScope`): the rows of the plan's `arm.mjs run` steps of the arm, `--cases <cell>:0-4` (the fitting reps 0 to 4),
  each key `<cell>~<rep>` once, with its case, rep, seed `landscape/<cell>/<rep>` and shard. Only these rows are read.
- **`preview`** reads every `*.runs.json` of `evidence/frozen/<task>/<arm>/` and MP12b1's report of each cell (`mp12b1Report`), checks each row's
  declared identity (`declaredRowProblem`: key, case, rep and seed, also of its run, before `ingestRow`) and writes, per cell, the ten counts
  of today's search and of the run, the five ratios, their geometric mean and the lower bound of the no-regression check (`previewCell`).
  A missing, duplicate, invalid, censored or incorrect row, or a missing MP12b1 report or run, is a problem of its pair: the ratio, the lower
  bound and the verdict of that cell are then null. It is a fitting warning on five seeds and a different time, never the stage-4
  no-regression verdict.
- **`prefixes`** reads, for every declared key (a missing one included), its publication (`publicationOf`, which reads `<shard>.runs.md`), the raw `state.json`, the shard
  declaration `shard.json`, the row identity `logs/<rowKey>.row.jsonl`, the worker journals `logs/<rowKey>.*.jsonl` and the linkage
  `logs/<rowKey>.link.jsonl`. Its row holds `rowStatus` (`missing`, `duplicate`, `invalid` or `ingestRow`'s), `complete` (the work ledger of
  `rowLedger`), `unreadable` (a journal line that does not parse) and the calls' prefixes against the `--budget` levels (`callPrefixes`) and,
  with `--bound`, the attempt bound's firing (`boundFirings`); the parse, ledger and prefix problems are listed once each in `problems`. A
  missing linkage keeps the problem `no linkage`: nothing missing is read as zero work or as a complete ledger.
- **The row identity** (`rawIdentityProblems`, kept apart in `identity`, never merged into `problems`): the declared-row problem, then the
  shard declaration and the row header checked against the declared task, arm, shard, case, rep and seed and against the publication's `meta`
  (the shard's tree, copy and producer identities). Every identity field must be a non-empty string, and exactly one matching shard entry and
  one row header must exist: a missing, malformed, duplicate or mismatched identity is a row problem, never a clear row under T11's read gate.
- **The gate's text** (plan section 8.2, T11): the reader accumulates main, census and uniqueness units in primitive order and identifies
  any recorded next primitive whose selection-call spent total before it is at least the proposed budget; a terminated call whose completed
  total already reaches the budget is potentially affected, even without a following begin line; a running primitive is not assumed cut by
  P5: the check is between primitives, not inside one.
- **Records**: `evidence/frozen/<task>/fit-read-<command>-<arm>.json` and `.md`, each written once (an existing one is refused). The JSON
  holds `meta`, the declared, missing and unexpected rows, the cells or the rows with the `summary` (declared, present, missing, unexpected,
  identity rows, incomplete, unreadable and ambiguous rows, affected, potentially affected and ambiguous calls, bound firings) and `inputs`:
  every file read (the plan first) with its sha256. Refused, writing nothing: a label other than `frozen`, a missing `--task` or `--arm`, a
  historical namespace (`IGP-02`, `V4-T04*`, `V4-S2`, `V4-S2P`, `V4-S2K`, `V4-S2W`), a plan that does not exist, a malformed grid, an
  existing record, a `--budget` entry that is not `<level>=<integer above 0>` and a `--bound` that is not an integer from 1 to 32.
- **Missing, invalid or ambiguous evidence is a warning with its reason, never zero work or a clear reading; the records are written once;
  the verdict words belong to the SAs' readings (S01, T11)**, not to the tool.
- **Self-test** (`--items`, unlocked): `fit-read: the declared grid`, `fit-read: preview of a cell`, `fit-read: call prefixes`, `fit-read: the
  four-attempt bound` (T02b, the pure functions) and `fit-read: prefixes of a declared grid`, `fit-read: preview of a declared grid`,
  `fit-read: command refusals` (T02c, the commands on private fixtures under `tests/artifacts/ig-proto/selftest/`; `io` carries the private
  folders and `mp12b1` the report seam).

## P7's spike (stages 2 to 4 pack, T03a to T05b)

P7 may make the rating kernel faster only if every result stays identical: the complete `DeductionResult` (its work units, node counts,
caps, tie order, undo paths) and the memory-limit outcome. `p7-probe.mjs` declares the corpora and the two worker kinds that compare a
candidate tree with the reference tree `base` (`P7_REFERENCE`) and time them in pairs; its pure helpers (`MEMORY_MANIFEST`,
`MEMORY_SETTINGS`, `memoryManifest`, `fixtureInput`, `workInputs`, `limitsFor`, `outcomeOf`) are in `lib/p7-core.mjs`, so that a lane worker
imports no label-reading module. T03a builds the item declarations and the two item kinds; T03b adds the experiment declaration, its checks
and the verdicts, T03c the bindings, the go rule and the commands.

- **The corpora and the tiers** (`P7_CORPUS_VERSION` `p7-corpus-v1`; `equalDeclarations(candidate, tier)`, repository paths only): T10a's
  kernel corpus (the five `P7_KERNEL_CASES`, six window subsets each: 30 items), PM4's profiles (`tests/artifacts/ig-proto/frozen/IGP-02/main/<cell>/calls.json`,
  read-only; the seven `P7_PM4_CELLS`, each set with pieces: the first four profiles per set in `quick`, 112 items, all of them in `full`, 676 items;
  in `full` the first profile of a set also carries one `screen:<W>` setting per key of `screenValues`, 123 in 28 sets) and the memory fixtures
  (five fixture items, the sequence item and the capacity item: 7 items). `quick` has 149 items, `full` 713. `timeDeclarations(candidate)` has
  `P7_ROUNDS` (3) rounds of the 30 kernel inputs: 90 `p7-time` items. `runtimeItems` is the one conversion of a declaration to runtime items
  (the tree paths become `otherRoot` and `inputRoot`).
- **The input constructor of the kernel inputs**: the tree `instr` (`P7_INPUT_CONSTRUCTOR`), the rule `kernel-window-v1` (`P7_INPUT_RULE`:
  `firstCarvedSet` with the seed `ig-v4/kernel/<case>`, then `windowSubsets` with offsets 1 to 3, two per offset, subset index 0 to 5) and the
  catalogue `data/boards-v1.json` (`P7_CATALOGUE`). The same board, pieces and clues go to `base` and to the candidate, and the construction is
  outside every timed interval. `base` cannot build the Hell 1 inputs (`lib/sets.mjs` returns `not-offered` for a null piece-count range,
  and the frozen level-7 area interval is infinite), whereas `instr`'s diagnostic offers carve them; a construction failure (`no-set`,
  `no-subset`) is a probe defect, never evidence against a candidate.
- **The settings** (`settingsOf(tier)`; `limitsFor`): `canonical` (the tree's `DEDUCE`), `tie1` (`tieOrder` 1), `undo` (`verifyUndo`),
  `work-half`, `work-minus1`, `work-ref` (the main work of the reference's canonical run, which is `search.work` less the census's work),
  `census-half`, `mem-below` (the reference slot bytes less one), `mem-ref` and `mem-fast` (the reference bytes plus the candidate's extra list
  bytes, less one and exactly), `screen:<W>` (a PM4 screening limit) and `fixture` (a memory fixture at the canonical limit). A setting that
  needs a reference value the canonical outcome did not give is `inapplicable`; a setting whose limit does not exist for the item is `skipped`.
- **The memory fixture manifest** (`data/p7-memory-fixtures.json`, computed on the frozen engine by
  `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-p7-memory.mjs`): fully active boards tiled by equal rectangles, no clue, at the canonical
  limit of 33,554,432 bytes:

  | Fixture | Rows | Nonzeros | Columns | Arena bytes | Reference slot bytes | At 32 MiB |
  |---|---:|---:|---:|---:|---:|---|
  | `mem-small` | 672 | 4,032 | 72 | 126,772 | 41,543 | lists |
  | `mem-mid` | 16,896 | 101,376 | 288 | 3,106,996 | 857,735 | lists |
  | `mem-near-lists` | 1 | 4,047 | 4,047 | 323,827 | 33,072,156 | lists |
  | `mem-near-reference` | 34 | 68,578 | 4,034 | 2,130,514 | 33,107,689 | reference (the slots fit, the lists do not) |
  | `mem-above` | 34 | 69,122 | 4,066 | 2,147,410 | 33,630,537 | `model-too-large` |

  No valid product input reaches 32 MiB (a 676-cell model stays under about 27 MB of slots), so the near-limit models are synthetic, as the
  precheck's formula allows; their limits are the canonical `DEDUCE` with `work` and `census` bounded to 20,000,000 each. The manifest also holds
  the nine-step `sequence` (one fresh main workspace per tree: growth, a smaller model after growth, a reference-only call, the near-limit
  fallback, the rejected model) and two `capacity` entries (a workspace of 5,183,547 bytes, which holds the arena, the slots and the lists, and one of
  5,183,546).
- **The equality rule**: an item's two outcomes (`outcomeOf`: the structured clone of the result, or the error's name, `code`, message and
  details) are equal when `isDeepStrictEqual` holds, an error included; `model-too-large` is decided on the reference slot table exactly as today,
  and a model-construction error is compared, never skipped.
- **The item kinds** (`lib/lane-worker.mjs`; reserves 120 s and 90 s in `lib/lanes.mjs`, lanes 2 and 1 in `lib/items.mjs`): `p7-equal` runs the
  reference (`otherRoot`) and this thread's tree on one input under each setting and records `same`, `compared`, `skipped`, `inapplicable`, the
  first three `differing` settings, `refBytes`, `extraBytes` and a `steps` row per compared step (the candidate's `representation`, `listBytes`,
  workspace bytes and capacity, the step's `memoryBytes`, both errors or null). Its sources are `kernel`, `pm4`, `memory`, `memory-sequence` (steps
  `seq-<i>`) and `memory-capacity` (steps `cap-<i>`); a `memory` item first requires the arena and the reference slot bytes of the manifest and ends
  `error` on a mismatch. `p7-time` rates one kernel input in each tree, each timed around `difficulty.rate` alone, the order alternating with the
  round (even: reference first), and records `refMs`, `candMs`, `same` and `capped`. A rating that throws `IncompleteRatingError` (a capped deduction
  path, which the generator charges and goes on from) is a timed rating: a capped rating on both trees is a timed pair (`capped: 'both'`, `same`
  true when the errors' `counters` are equal too), on one tree only `same: false`; any other thrown error is an `error` item.
- **The experiment declaration** (`declareRun`; `experiment.json` under `<raw task>/<step>/`, written before the first dispatch and refused when
  changed, `checkDeclaration`: `the declaration of <task>/<step> changed (<field>): a ruling is required`): the candidate and reference trees (repository
  paths only), the tier and rounds, the input constructor (`instr`, the rule `kernel-window-v1`, the tree identity), the corpus version and the index of its
  inputs by hash (the seven `calls.json` of the PM4 cells, `data/p7-memory-fixtures.json` and the catalogue `data/boards-v1.json` for `equal`; the
  catalogue alone for `time`), the producer (frozen commit, source digest, harness hash) and the complete ordered item declarations. One conversion
  (`runtimeItems`) serves run, resume and report. `readRun(task, step)` reads the declaration, the item log, the state and an index of the files it read.
- **The required corpus** (`P7_COUNTS`: `quick` 30 kernel + 112 PM4 + 7 memory items, `full` 30 + 676 + 7, `time` 90; `corpusCounts`, `corpusInputPaths`):
  `expectedCorpus(command, candidate, tier)` recomputes the items, the counts, the input hashes and the constructor from their sources at every check, never from
  the declaration. A unit test may give a small corpus of its own to `runProblems` and the verdicts; the commands always use `expectedCorpus`, so a shortened
  corpus can never certify `p7-corpus-v1`.
- **The shared checks** (`runProblems`, in this order): no declaration; the declaration is of the expected task, step, command, candidate and tier; the corpus
  counts; the declared items and constructor against the required corpus; the corpus version; the corpus input index (empty, missing, changed or unexpected
  entries); no state; the state's manifest hash, tree id and producer against the declaration; the item log through `resumePlan` (duplicates, an identity
  that differs, unknown items, a missing or extra start, an interrupted item).
- **The verdicts** (pure). `equalVerdict` lists, per declared item, `missing`, `censored`, `errors` (an `error` end, or a completed one whose outcome is not
  `ok`: a construction failure is a probe defect), `notEqual` (with `diagnostics`, the first differing settings), `duplicates` and `unexpected` ends; its
  `verdict` is `incomplete` with any problem, else `not-equal`, else `incomplete` for any missing, error, censored, duplicate or unexpected end or an
  incomplete memory coverage, else `equal`. The coverage rule (D-P24-05): every memory fixture, sequence step and capacity step (16 entries) has the
  representation the manifest expects (`lists`, `reference` or, with a null representation, `model-too-large`), no `lists` step breaks `refBytes + listBytes <=
  memoryBytes` or `wsBytes + listBytes <= capacityBytes` (`budget`), every memory item ended, and at least one normal (non-memory) step runs the fast path.
  `timeVerdict` is `measured` only for the complete 90 declared items, each a completed `ok` outcome with `same` true and finite positive `refMs` and
  `candMs`; a pair that differs or has an invalid time is `failed` (`notSame`, `invalid`), a missing, censored or error item or any problem is `incomplete`;
  only a `measured` verdict has `refMs`, `candMs`, `ratio` (`refMs / candMs`) and `geoRatio` (the geometric mean of the pairs' ratios), never a ratio of a
  subset. A pair whose deduction path was capped on both trees (`capped: 'both'`) is timed like any other and listed in `capped`, never a problem.
- **The bindings** (`equalityEvidencePaths(candidate, tier)`, `equalityBinding(report, { tier, candidate, reference, fileHash, requiredInputs })`, pure). The
  twelve required paths of an equality run are its `experiment.json`, `state.json` and `items.jsonl` (under
  `tests/artifacts/ig-proto/frozen/V4-P7E-<candidate>-<tier>/equal/`) and the nine corpus inputs (`corpusInputPaths('equal')`); a report must list each of
  them exactly once, whatever else it lists. A binding is `{ ok: true }` or `{ ok: false, reason }`, checked in this order: no report; the verdict is not
  `equal`; the report is of another tier; it was made on another candidate or reference tree (the identities `declared` in the report against the trees now
  looked up, or the ones a timing run declared); it used another corpus version; its memory coverage is incomplete; it binds no input; a required path is
  not bound, or bound more than once; then every listed input is hashed again (`the <tier> report's input <path> is missing` or `changed`).
- **The go rule** (`goDecision({ quick, full, timing })`, D-P24-05): `go = quick.ok && full.ok && timing.verdict === 'measured' && timing.notSame.length === 0
  && timing.ratio >= P7_GO_RATIO` (1.04); `reasons` lists the failed parts (`quick: <reason>`, `full: <reason>`, `timing <verdict>`, `differing <n>`,
  `ratio <r> below 1.04`).
- **The commands** (`node tools\ig-proto\p7-probe.mjs <command> ... --label frozen --source-label <SL>`; a refusal prints `p7-probe: <reason>` on stderr, exits
  1 and writes nothing; the historical task ids of check-list §3.1 are refused):
  - `equal --candidate <variant> --tier <quick | full> --task V4-P7E-<candidate>-<tier> [--horizon-s <H>]` (locked verification): declares the run
    (`declareRun`, step `equal`; an existing `experiment.json` must equal the fresh declaration, else the run is refused with no dispatch), then runs the
    pending items (horizon 285 s by default) and prints `p7-probe: equal <candidate> <tier>: <ended> of <total> items ended, done <true|false>`.
  - `bind --candidate <variant> --task V4-P7` (unlocked): reads both equality reports (`docs/improve-generating/evidence/frozen/V4-P7E-<candidate>-<tier>/p7.json`)
    **before any tree is looked up**: a missing one refuses `<candidate> cannot be timed: no <tier> equality report` (an unparseable one: `the <tier> equality
    report is unreadable`) and nothing is created, even when the candidate has no manifest yet; only then are the candidate and reference trees looked up and
    both reports bound against them. `time` refuses a candidate whose quick and full equality reports are not `equal` on the same candidate and reference trees
    and corpus, or whose inputs are missing or changed.
  - `time --candidate <variant> --task V4-P7 [--horizon-s <H>]` (locked): the same refusals as `bind`, then as `equal` with the step `time-<candidate>`.
  - `report --task <V4-P7E-<candidate>-<tier> | V4-P7>` (unlocked): writes `docs/improve-generating/evidence/frozen/<task>/p7.json` and `p7.md`, replacing an
    earlier report of the task and never touching the raw observations. For an equality run: `equalVerdict` of the run (the read problems added), and the
    inputs are the run's files (`readRun`) followed by the declaration's corpus inputs. For `V4-P7`: the candidates are the `time-<candidate>` steps of
    `tools/ig-proto/plans/V4-P7.json` (the declared set, never the folders that exist); per candidate its `timeVerdict`, both equality bindings checked
    against the trees the time run declared (the identities actually timed) and `goDecision`; the inputs are the run's files, the declared corpus inputs and
    the two equality reports that exist. The markdown holds the verdicts, the coverage table of the memory fixtures (reference bytes, list bytes,
    representation), the diagnostics and the problems; `V4-P7` prints one `p7-probe: <c> go <yes|no> (ratio, quick, full, timing)` line per candidate.
    `report` refuses a task without a run (`report needs a run: <task> has none (...)`: no `experiment.json`, `state.json` or `items.jsonl` of the equality
    run, or no `time-<candidate>` run of any declared candidate) before any tree is looked up, and writes nothing.
- **Runs**: the equality runs are locked verification under the task ids `V4-P7E-<candidate>-<tier>`; the timing run is `V4-P7` (S02).
- **`p7-c1` (T03d)**: R4 on ordered live-row lists (a circular doubly linked list per column over the positions of `colRows`, sentinel `NZ + c`),
  unlinked in `kill` and relinked in `undo`, charging the reference's units; the lists are local to one deduction call, decided after the reference
  slots exist, and used only while the reference slots plus them stay within `limits.memoryBytes` and the arena's bytes plus them within its capacity
  (`igListArrays`; `igListBytes(model) = 4 (3 NZ + 2 C)`); each call reports `igRepresentation` and `igListBytes` in its diagnostics object;
  `verifyUndo` also checks the lists.
- **`p7-c1r5` (T04)**: `p7-c1` plus R5 on the live-row lists (the cell column scanned to the second piece, charged `k - colStart[c] + 1` at the
  break; the claimed piece's column scanned on its list). A spike variant, never an arm.
- **`p7-c1r5c5` (T05a)**: `p7-c1r5` plus C5: `select` kills each covered column's live rows from its list, `liveRowOf` takes the list's head (charged
  `j - colStart[c] + 1`), `listRows` copies the list (charged the column's length). The third and last composite; a spike variant, never an arm.
- **Self-test**: `--items` (unlocked): `p7: settings, work inputs and limits`, `p7: outcomes, fixtures and declarations`, `p7: the experiment declaration`,
  `p7: equality verdict`, `p7: timing verdict`, `p7: bindings and go`; `--v4` (locked): `p7: equality
  items of base against base`, `p7: timing items of base against base`, `p7: C1 memory rule (p7-c1)`.

## Phase-1 bench of P6 (V4-T14)

Not a run plan (`run-task.ps1` does not run it): the production bench of the old version (main `3fc65f4`) and the new one (the commit
under test, whose only production change is P6, T12), for the owner's pull request, and the reading of plan section 6's phase-1 gate
(both memory checks) that closes N-V4-12. The results are **Node screening evidence**: five requests per cell are descriptive, never a
browser qualification (D39); every output says so.

- **Scripts.** `phase1/p6-bench.mjs` holds the pure rules (the ledger, the preflight, the checkpoint check, the pairing, the identity
  of a pair, the statistics, the memory checks, the two renderers) and the commands `preflight` and `compare`; `phase1/p6-bench.ps1
  -Group A|B -Side old|new -NewCommit <C> [-ResumeInstructed] [-DryRun]` is one locked invocation; `phase1/chart-png.ps1` renders the
  chart (`-SelfTest`; `-EvidenceDir <folder>` renders another folder than the task's evidence). They run from the repository root.
- **The two sides** are detached worktrees beside the repository, prepared by the orchestrator and never touched by the scripts: `pentomino-t14-old`
  at `3fc65f4` and `pentomino-t14-new` at the full commit under test. `p6-bench.ps1` checks `HEAD` and `git status --short` of its side
  (read-only git, the one exception to "No git") and runs that worktree's own `tools/calibrate.mjs`, so the measured code does not depend on the
  main worktree: `node --max-old-space-size=2048 <worktree>\tools\calibrate.mjs --profile landscape --workers 4 --seeds 5 --cases '^(<cells>)$'
  --fresh-process --output <RAW>\<side>\<group>` (cold, one fresh process per request, seeds `landscape/<case>/0` to `4`). Group A is
  `14x14-master`, `26x26-master`, `26x26-expert`, `26x26-nightmare` and `10x10-nightmare`; group B is `12x12-nightmare` and `18x18-nightmare`.
  The order is A old, A new, B new, B old: block-order counterbalancing, which reduces one order imbalance and does not cancel temporal drift.
- **The allowance.** The owner's separate allowance of 45 counted minutes (2,700 s; 2026-11-18, `measure=a`), apart from the frozen round's
  cap. Every invocation goes through `Invoke-IgNode -Repo pentomino` of `lock/ig-lock.ps1` with `-IdleQuietSeconds 15` (the quiet period stays
  45 s unless the owner's idle declaration holds). Raw files (git-ignored): `tests/artifacts/ig-proto/phase1/P6-bench/` (`<RAW>`: `<side>/<group>-<date>.json|md`,
  `<side>/<group>.checkpoint.jsonl`, `ledger.jsonl`, and `pending.json` while an invocation runs). The ledger has one line per invocation
  (`id`, `task`, `group`, `side`, `commit`, `limitS`, `start`, `end`, `wallSeconds`, `nodeSeconds`, `lockWaitSeconds`, `quietS`,
  `countedSeconds` = node seconds + min(lock wait, 45), `killed`, `exit`, `report`, `reportSha256`); a killed invocation counts as its
  limit. The limit of an invocation is `min(900, floor(2700 - spent - 45))` and below 300 s the preflight stops (exit 4): an invocation is
  charged at most its limit plus 45 s, so the ledger cannot pass 2,700 s. No ledger line, reservation, checkpoint or report is ever deleted
  or rewritten, and `--restart` is never used.
- **Preflight** (`p6-bench.mjs preflight --group <G> --side <S> --new-commit <C> [--resume-instructed]`, always called by the script):
  exit 0 `run` (it prints the limit), 7 `complete` (the group and side has exactly one `exit 0` ledger line whose terminal report has the recorded
  path and SHA-256 and passes the checks of `compare`: nothing runs and no report is rewritten), 5 a reservation exists, 8 a ledger line of
  another commit, a completed group whose report is missing or changed, or a checkpoint that does not read strictly (a truncated line, a
  duplicate row, a row of another commit, a row whose source digest or versions differ from its header: the bench's own reader skips such lines
  silently), 9 the last line of the group ended `exit 2` (a resume needs the pack author's instruction, then `-ResumeInstructed`), 6 a second timeout, 4 the allowance, 1 a
  usage error.
- **The invocation** (`p6-bench.ps1`): worktree check, preflight, the lock helper loaded (a failure exits 1 before anything is created), the
  reservation `pending.json` created exclusively with `[IO.File]::Open(CreateNew)` (`id`, `task`, `group`, `side`, `commit`, `limitS`, `reservedS`,
  `createdAt`), the helper call, then the ledger line and only then the removal of the reservation. Node seconds and the exit come from the helper's `IG ... exit=<e> seconds=<s> quiet=<q>` line
  (printed before it throws on a non-zero exit); the recognised timeout (`second limit reached`) counts the limit and exits 3 (one retry of the
  same line is allowed, a second kill stops); an exception without an `IG` line is an **accounting stop**: exit 5, the reservation stays, no
  ledger line, zero is never substituted. Exit 0 needs exactly one `<RAW>\<side>\<group>-*.json` written since the start (else exit 1 and the
  reservation stays); 2 the bench ended incomplete; a failure of any other kind never exits 0.
- **`compare --new-commit <C>`** (unlocked, after the four lines): refuses (`p6-bench: <reason>`, exit 1, nothing written) unless there is
  no reservation, the ledger totals at most 2,700 s with exactly one `exit 0` line per group and side, every terminal report has its ledger SHA-256 and
  passes the checks (`complete`, cold four-worker `landscape` run of node, the commits and digests, one matrix digest per group, one new source digest,
  one `browserOrNode`, `platform` and `hardware` with `--max-old-space-size=2048`, every expected row present once, valid, uninterrupted,
  `generation`, its metadata equal to its report's, only `sampling` errors, a finite positive T10 for a ten-puzzle request and a finite positive
  response; `complete: true` alone does not prove valid rows, a failed child row is complete too), no pair is `differ` or `incomplete`, both
  memory checks (`peak-process-memory` at most 1.5 GiB, `byte-accounting` at most 1,196 MiB at four workers) and `model-too-large` are
  `pass` on every cell of both sides, and every report's text is CRLF only without a drive-letter path. It writes `<Side>/<Group>-<date>.json|md`
  (byte copies), `ledger.jsonl`, `compare.json`, `compare.md`, `chart.svg` and `chart.html` into
  `docs/improve-generating/evidence/phase1/P6-bench/`; an output that exists with other bytes is refused and the same inputs rewrite the same bytes.
- **Identity of a pair** (old and new run of one seed; only `equal` passes): `equal` when both sides accepted the same positive number of puzzles with the
  same set summary, the same puzzle summaries and the same production `details.resultDigest` (the SHA-256 of the ordered layout keys, clue keys and
  scores); `differ` on any difference (the first differing path is reported, a stop point), also two different digests under equal summaries;
  `metric-prefix-only` at unequal counts when the common summaries match (puzzle-prefix identity is not established); `no-puzzle-evidence` when a
  side accepted none; `incomplete` when a required summary or digest is missing. The landscape sampling fields of `details` are no part of an identity.
  T12's parity tests and the unchanged fixtures remain the compatibility evidence.
- **Statistics**: per cell and per level (the pairs pooled) the medians, nearest-rank p95 (the maximum at n 5), maxima, `ten of n`
  (requests with ten puzzles), `ten or proven-all of n`, the accepted distribution, T1, T10 (conditional on ten, with its n) and the response, the
  paired ratios old/new of T1, T10, T10 - T1 and the response (median [min-max] n and the excluded pairs; the median is `null` below three pairs),
  the peaks and the sampling errors (the landscape profile's diagnostic sampling runs after the timed interval but takes invocation time and counts in the
  whole-process peak).
- **The chart** (`chart-png.ps1`, after `compare`): headless Edge renders `chart.html` to `chart.png` (1200 x 720) in a unique scratch profile
  `tests/artifacts/ig-proto/selftest/t14-edge-<guid>`, bounded to 60 s. This Edge's launcher exits at once while the browser it started, its child,
  takes the screenshot, so the script waits until every verified descendant has exited. Only processes whose ownership was verified are stopped
  or awaited: `Select-IgOwned` takes the `msedge.exe` descendants of the recorded root from one `Win32_Process` snapshot (created at or after
  the launch, and not after an exited parent's exit; the name and the time are preliminary filters), `Confirm-IgOwned` keeps a candidate only when the
  process that holds its PID now has its start time (UTC ticks at CIM's microsecond precision, compared exactly) through a handle kept until the cleanup ends,
  and fails the gate when that cannot be established; `Get-IgStopOrder` stops children first (`Stop-Process -Id <verified Id>`), then the root only while alive.
  A survivor, an unverifiable process, a profile folder that cannot be removed or a `chart.png` that is missing or not larger than 10 KB fails the gate.
- **Self-test**: six `--items` cases (`p6: pairs and identity`, `p6: statistics and ratios`, `p6: the memory checks`, `p6: the ledger, the
  reservation and the preflight`, `p6: inputs are refused`, `p6: the chart`) on synthetic rows, with scratch files under
  `tests/artifacts/ig-proto/selftest/p6/`; `chart-png.ps1 -SelfTest` has six synthetic cases on the two ownership functions (no process is started, stopped or awaited).

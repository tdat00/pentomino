# IGP-06 — PM2 rating profile on 10x10 and 12x12 Nightmare

| Header | Value |
|---|---|
| ID | IGP-06 |
| Depends on | IGP-00 (accepted and committed); IGP-03 and IGP-04 (accepted): their results are read for the report |
| Estimated size | Small: about 300 new lines (`pm2.mjs` and `pm2-worker.mjs`); about 1 to 2 hours of developer work; machine time about 8 minutes (a dry invocation and one or two main invocations, three budgeted) |
| Owner role | Measurement prototype |
| Confirms or refutes | report §4 P7 (x 1.1-1.8, likely 1.3): a hypothetical kernel-speed sensitivity from the measured rating-time shares (R24); IG-P-Q12: where rating time goes on the two cells whose useful ratings are dear (R30); the DLX diagnostic's share (P6's basis, a cross-check of IGP-04) |
| Design refs | plan §3 P7, P11, §5 PM2; `clarifications.md` IG-P-Q12 (PM2 profiles 10x10 and 12x12 first), Q13 (P7's later items only after PM2); check-list §4 D-IG9, D-IG12 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

On 10x10 and 12x12 Nightmare the useful ratings themselves are dear, so P1 to P5 help little there and only a faster
kernel (P7, later P11) can; the plan author asks for PM2 on these two cells first (IG-P-Q12). This task samples a CPU
profile of canonical ratings of a realistic corpus (the profiles of today's set-stage calls and window subsets on both
cells) and attributes rating time to phases (search, census, model build, DLX diagnostic) and to functions. It changes
no rating: it only observes. Its P7 figure is a sensitivity ("if the kernel were s times faster"), not a measured
improvement.

## Scope

### In scope

- `pm2.mjs` (`run`, `summarize`) and `pm2-worker.mjs` (the supervised profiled rating worker); two cells; a dry run;
  the records.

### Out of scope

- Counting repeated exact states inside a rating (a later round: it needs instrumentation of the solver); carving and
  layout work (not rating time); browser profiles; any kernel change.

## Repository rules

The check-list §3 and §7. Locked commands through the runner only; no git.

## Inputs & context

- Function names of `core/engine/deduce.js` (nested in `measureDeduction`): `colour`, `kill`, `select`, `mark`, `undo`,
  `liveRowOf`, `forcedColumn`, `queueCell`, `fillSums`, `ruleR3`, `ruleR3Place`, `ruleR4`, `ruleR5`, `overWork`,
  `closure`, `ruleR6`, `neighbourCell`, `labelPockets`, `gather`, `reachable`, `ruleR7`, `findNecks`, `ruleR8`,
  `ruleR9`, `coversBoth`, `ladder`, `snapshot`, `keepPath`, `fewestColumn`, `listRows`, `branch`, `search`, `probe`,
  `replayLadder`, `runProbes`, `settleCensus`, `result`.
- `core/engine/tiling.js` (`buildModel`, `solveFirst`), `core/engine/placements.js`, `core/engine/dlx.js`,
  `core/engine/difficulty.js` (`measureV3`, `rate`).
- IGP-00's lanes (`call` jobs, admission and supervisor), `firstCarvedSet`, `recordedCall`, `windowSubsets`,
  `rateRecord`. On the `base` tree `igTake` does not exist, so the instrumentation fields of the records are null; this
  task does not need them.
- Node's `node:inspector/promises`: a `Session` connected inside a worker thread profiles that thread.

## Design

### Runs

A run's manifest is fixed in `pm2.mjs`: `main` = cells `10x10-nightmare` and `12x12-nightmare`, three sets each (seeds
`ig-pm2/<case>/<i>`); `dry` = `10x10-nightmare`, one set (seed `ig-pm2/dry/0`). The first invocation of a run writes
`tests/artifacts/ig-proto/<L>/IGP-06/<run-id>/run.json` (the manifest, the `base` tree's `treeId`, the harness hash);
every invocation checks that file against the manifest, the tree and the harness and exits 1 on a difference. The two
runs never share files.

### `pm2.mjs run`

`node tools\ig-proto\pm2.mjs run --run-id <main|dry> --label <L> --horizon-s <H>`, in one locked invocation, two
stages, resumable between any two units of work:

1. **Corpus** (lanes on the `base` tree). Per cell and set, in a fixed order, a `call` job with its window (offsets 1
   to 4, three subsets each), admitted and cut by the lanes' rules (check-list §7). Each call has a `started` line in
   `<run-id>/corpus.jsonl` before dispatch and a `recorded` line after (the set's inputs; every profile's `boardRows`,
   `pieces`, `clues` and canonical outcome; a call cut before the horizon is recorded `censored` with the profiles it
   streamed). A `started` call without its `recorded` line stops the task (exit 1); nothing is rerun. The corpus is
   complete when every call of the manifest is recorded; its profiles are ordered by cell, set and profile.
2. **Profile** (once the corpus is complete). One worker thread (`pm2-worker.mjs`) on the `base` tree, supervised by
   the host. For each corpus profile in order, the host admits it only when e + 30 s ≤ H, appends `{ t: 'started',
   index }` to `<run-id>/<case>/ratings.jsonl`, and posts its inputs; the worker starts the profiler in its own thread
   (`Profiler.enable`, `Profiler.setSamplingInterval` 1000 µs, `Profiler.start`), runs one canonical `rate()`, stops
   the profiler, reduces the profile to the attribution below, and posts it with the rating's outcome and wall ms; the
   host appends `{ t: 'recorded', index, outcome, ms, attribution }`. The host cuts a rating that runs longer than 30 s
   (`worker.terminate()`, a line `{ t: 'cut', index }`, exit 1: a defect). A `started` rating without its `recorded`
   line (a killed invocation) stops the task; nothing is rerun. The raw profiles of the first five ratings of each cell
   are also kept (`<case>/raw-<index>.cpuprofile`) to check the reduction.
3. `state.json`: `{ done, corpus: { calls, recorded }, profiled: { '<case>': n }, lastInvocation: { start, end, seconds,
   horizonS, progress: { calls, ratings } } }`; exit 0 (check-list §7 exit protocol).

### Attribution (in the worker, per rating) and `pm2.mjs summarize`

Self time per sample (the profile's `samples` and `timeDeltas`), attributed along two dimensions:

- **Phase**, from the sample's stack (its ancestors in the profile tree): `census` when an ancestor is `runProbes`,
  `settleCensus`, `probe` or `replayLadder`; else `dlx` when an ancestor is `solveFirst`; else `model` when an ancestor
  is `buildModel`; else `search` when an ancestor is `measureDeduction`; else `other` (scoring, the harness, GC).
  Shared functions (the ladder rules, `select`, `undo`) are thus charged to the phase they ran in.
- **Function** (name and file), and the categories `ladder` (`forcedColumn` to `ladder` and `colour`, `liveRowOf`,
  `overWork`), `state` (`select`, `kill`, `mark`, `undo`), `control` (`fewestColumn`, `listRows`, `branch`, `search`,
  `snapshot`, `keepPath`, `measureDeduction`, `result`, the census drivers), `model`, `dlx`, `gc` (`(garbage
  collector)`), `other`.

`node tools\ig-proto\pm2.mjs summarize --run-id <id> --label <L>` (unlocked) merges the `recorded` attributions. The
denominator is the rating time of the profiled corpus (the sum of the attributed self time of all recorded ratings).
Outputs per cell: ms and share per phase, per category, and per phase × category; the top 30 functions with self ms and
share; the ratings profiled (complete and capped). It checks that phases and categories each add up to the total within
1 %, and that a host-side reduction of each kept raw profile equals the worker's attribution of that rating. The P7
sensitivity is Derived and hypothetical: with the kernel share k (the `search` and `census` phases), a kernel s times
faster in the same units gives 1 / (1 − k + k / s) on rating time; the record gives it for s = 1.25, 1.5, 2 and 3, and
the kernel speed-up needed for the report's x 1.1, 1.3 and 1.8. The `dlx` share is reported beside IGP-04's P6 factor.

**Additions after the IGP-03 and IGP-04 reviews (report only).**

- *By profile class.* Besides the whole corpus, the phase shares, the kernel share k and the P7 sensitivity are given
  for today's call profiles and for the window subsets (offsets 1 to 4) apart, and within each for complete and capped
  ratings apart. The complete ratings of the window subsets are the closest to the prototype's mix (IGP-03: without
  the screen, 5 of 49 ratings capped on 12x12 Nightmare), and R31 applies P7 to the prototype's times.
- *What P7 must reach.* After IGP-04, P6 and eight workers give about 1.0 on the prototype, so P7 is the remaining
  first-phase lever. The needed kernel speed-up is also given for the rating-time factors 1.87 (÷1.9 on the
  prototype) and 1.91 (÷1.9 on today's 12x12 Nightmare), per class, with "not reachable" when 1 / (1 − k) is at or
  below the factor.
- *P6 beside it.* The `dlx` share per class is set beside IGP-04's P6 figures: 10 to 23 % of rating time saved on
  today's search (A:B), and about 0 to 7 % on the prototype (Derived in the IGP-04 review: E:F's twin-call rating
  ratio, 0.86, divided by the eight-worker slowdown of B:C's twin calls, 0.80 to 0.92).

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/pm2.mjs`, `tools/ig-proto/pm2-worker.mjs` | new |
| `tools/ig-proto/plans/IGP-06.json` | new |
| `tools/ig-proto/README.md` | one section (PM2) |
| `docs/improve-generating/evidence/provisional/IGP-06/` | new: `pm2.json`, `pm2.md` |

## Implementation steps

1. `pm2.mjs` and `pm2-worker.mjs`; the dry run through the runner, then `summarize --run-id dry` (its checks must pass).
2. The plan; the main run; `summarize`; `npm run check`; the firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-06.json` (allocation 8 minutes; the runner adds `--label`, `--source-label` and,
for locked steps, `--horizon-s`; `minHorizonS` 150 for both locked steps, which run calls):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-06` | | |
| tree | no | `tools/ig-proto/lib/tree.mjs build base` | | |
| dry | yes, until done | `tools/ig-proto/pm2.mjs run --run-id dry` | 90 | `IGP-06/dry/state.json` |
| summarize-dry | no | `tools/ig-proto/pm2.mjs summarize --run-id dry` | | |
| run | yes, until done | `tools/ig-proto/pm2.mjs run --run-id main` | 330 | `IGP-06/main/state.json` |
| summarize | no | `tools/ig-proto/pm2.mjs summarize --run-id main` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-06` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-06.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-06 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

Projection: dry run about 35 s (one invocation); main run: corpus about 60 to 150 s, then profiles about 40 s (10x10,
about 100 ratings) and 130 s (12x12, about 120 ratings), in one or two invocations (two budgeted). Three locked
commands, about 5.5 minutes of node time and 2.5 of quiet periods.

## Record formats

- `pm2.json`: `{ meta, samplingIntervalUs: 1000, corpus: { calls, censored, profiles }, cells: { '<case>': { ratings: {
  complete, capped }, ratingMs, phases: { '<phase>': { ms, share } }, categories: { '<name>': { ms, share } },
  phaseByCategory: { ... }, top: [{ function, file, ms, share }], kernelShare, p7Sensitivity: { '<s>': factor },
  neededKernelSpeedup: { '1.1': s, '1.3': s, '1.8': s, '1.87': s, '1.91': s }, dlxShare, byClass: { '<call|window>':
  { '<complete|capped>': { ratings, ratingMs, phases, kernelShare, p7Sensitivity, neededKernelSpeedup, dlxShare } } },
  reductionCheck: { rawProfiles, equal } } } }`.
- `pm2.md`: the banner; the phase and category tables of both cells; the top functions; the P7 sensitivity table,
  labelled hypothetical; notes: the sampling profiler adds a little time and attributes inlined functions to their
  callers; carving and layout work are outside the denominator.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-06-B01 | Where rating time goes on 10x10 and 12x12 Nightmare, by phase and by function, so that P7's items can be ranked (IG-P-Q12, Q13) | `pm2.md` |
| IGP-06-B02 | P7's hypothetical sensitivity from the measured kernel share, set against the report's x 1.1-1.8, never presented as a measured gain | `pm2.md` |
| IGP-06-B03 | The kernel share and the P7 sensitivity per profile class (call profiles and window subsets; complete and capped), the kernel speed-up needed for 1.87 and 1.91 or "not reachable", and the `dlx` share beside IGP-04's P6 figures | `pm2.md` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-06-T01 | The profiled work is canonical rating only, on the `base` tree, of a corpus made by the production call path; nothing is changed | code review |
| IGP-06-T02 | Phases come from stack ancestry, so the census includes the ladder and state work done inside it; phases and categories each add up to the total within 1 %; the worker's reduction equals the host-side reduction of the kept raw profiles | `pm2.json`; summarize output |
| IGP-06-T03 | Every profiled rating ran in the supervised worker under the 30 s cut, with a `started` and a `recorded` line; every corpus call has both lines; locked commands within their horizons, in `invocations.jsonl`; records per the check-list §3 (profile URLs reduced to repository-relative file names); `npm run check` and the firewall check pass | `ratings.jsonl`; `corpus.jsonl`; runner log; command output |

## Test plan

The dry run and its `summarize` (sums within 1 %, reduction check) before the main run; the main run's `summarize`
repeats both checks.

## Definition of done & handoff

- The reply gives both cells' phase and category shares, the kernel share, the P7 sensitivity, the counted machine
  time and the lock waits.
- Handoff to IGP-07: `pm2.json` (R24, R30).

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

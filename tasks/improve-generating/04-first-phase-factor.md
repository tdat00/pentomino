# IGP-04 — First-phase factor: P6, and eight workers as an unadmitted upper bound

| Header | Value |
|---|---|
| ID | IGP-04 |
| Depends on | IGP-01 (accepted and committed); IGP-03 (accepted): `ig-select-proto.js` carries the arity-3 branch, so the `p1p5` tree ids differ from IGP-01's while the default path is unchanged |
| Estimated size | Medium: about 200 new lines (two manifests with edits, three compositions, the P6 branch of `ig-log.js` and its call in `ig-select-proto.js`, factor, identity and memory sections of `compare.mjs`, the plan); about 1 to 2 hours of developer work; machine time about 28 minutes |
| Owner role | Measurement prototype |
| Confirms or refutes | report §4: P6 x 1.03-1.2 at Nightmare and x 1.15-1.6 at Master (R22); P8's batch x 1.3-1.9 and set stage x 1.0-1.3 as an **unadmitted upper bound** (R23); the first-phase factor ÷1.9 (Opus's illustrative assumption) with P7 still assumed (R25, a Projection); both memory criteria at eight workers (R26) |
| Design refs | plan §3 P6, P8; report §2 ("first phase"), §4, §5 item 6; `clarifications.md` IG-P-Q05 (gates at four workers, eight beside; the width and admission rules), owner decision OD-P2 (P6 approved); check-list §4 D-IG2, D-IG9, D-IG12 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

The report's "after first phase" column divides today's times by 1.9: P6 (the DLX diagnostic only for accepted
puzzles), P7 (a same-units kernel) and P8 (a wider pool), all giving the same puzzles. That factor was one analyst's
illustration. This task measures P6 in isolation on today's search (the fast cells, arms A and B), the combined P6 ×
eight-worker factor on today's search (A and C) and on the prototype (E and F; this pair changes both P6 and the width,
so it does not isolate P6), with the same puzzles required, and records both bench memory criteria at eight workers.
P7 is not prototyped (IGP-06 gives a sensitivity only).

Eight workers here are **not** P8 as the plan author accepted it: IG-P-Q05 sets the width to the larger of today's
width and `min(8, hardwareConcurrency - 1)`, above four only with `deviceMemory` of at least 8, and admits a task only
when its workspace ceiling times the width plus the main budget fits both memory checks. This task raises
`MAX_POOL_SIZE` to 8 without that admission, so its numbers are an unadmitted throughput upper bound, labelled so
everywhere; a memory criterion that fails is a finding, never a reason to relax a check.

## Scope

### In scope

- Variants `p6` and `w8` and the compositions `log-p6`, `log-p6-w8`, `p1p5-main-p6-w8`; the P6 branch of `ig-log.js`.
- Five arms, their verification and identity, the factor and memory analysis.

### Out of scope

- P8's width rule and admission policy (phase-1 design), P7 and P11; browser runs; widths other than four and eight.

## Repository rules

The check-list §3 and §7. Eight-worker arms run only under the wrapper like every other arm; no git.

## Inputs & context

- `core/engine/difficulty.js:253-262`: `measureV3` runs `solveFirst` (the DLX diagnostic) after every completed
  deduction; it fills `B`, `branchTrials`, `rowTrials` and `dlxStop` only, which never enter the score (`scoreV3`,
  line 140). Capped profiles never reach it.
- `core/browser/worker-pool.js:75` `MAX_POOL_SIZE = 4`; `tools/calibrate.mjs:160` limits `--workers` to it;
  `WORKER_LIMIT_BYTES` (line 70) and `MAIN_BUDGET_BYTES`; `tools/bench/report.js:24-34` (`processBytes` 1.5 GiB) and
  329-359 (accounted limit = worker count × `WORKER_LIMIT_BYTES` + `MAIN_BUDGET_BYTES`).
- MP12b1's peaks with four workers: at most 404 MiB accounted and 655 MiB per process (report §5 item 6); eight 224 MiB
  ceilings plus the main budget give 2,092 MiB accounted in the worst case.
- Tree ids (after the IGP-03 review): IGP-03 added the arity-3 branch to `ig-select-proto.js`, and this task adds the
  `withP6` call, so the `p1p5-main` tree of arm E differs from IGP-01's (`treeId` 6e1ff491…). The default path is
  unchanged: IGP-03's `a3` arm reproduced IGP-01's after-arm puzzles on all four of its requests (equal `resultDigest`
  and `igPuzzleKeys`). Arms pair by seed, never by tree id; every record names its tree ids.

## Design

### 1. Variants

- **`p6`** (edits only; composed, never alone):

  | Edit | File | Find (exact) | Replace or append |
  |---|---|---|---|
  | p6-1 | `core/engine/difficulty.js` | `  const run = solveFirst(model, { rowTrialLimit: limits.dlx.rows, branchTrialLimit: limits.dlx.branch });\n` | `  const run = igDlx.skip ? { layout: [], exhausted: false, stop: 'skipped', branchTrials: 0, rowTrials: 0 } : solveFirst(model, { rowTrialLimit: limits.dlx.rows, branchTrialLimit: limits.dlx.branch });\n` |
  | p6-2 | `core/engine/difficulty.js` | append | `\n/** P6 prototype switch (ig-proto): the search skips the DLX diagnostic; the returned result gets it back. */\nexport const igDlx = { skip: false };\n` |

  Params `{ "p6": true, "logAccepted": true }`.
- **`w8`**: edit `w8-1` in `core/browser/worker-pool.js`, find `export const MAX_POOL_SIZE = 4;\n`, replace `export const
  MAX_POOL_SIZE = 8;\n`. No params.
- **Compositions:** `log-p6` extends `log`, `p6`; `log-p6-w8` extends `log`, `p6`, `w8`; `p1p5-main-p6-w8` extends
  `p1p5-main`, `p6`, `w8`.

### 2. The P6 branch (`ig-log.js`, used by `igDispatch` and by the prototype)

- `ig-log.js` imports `difficulty.js` as a namespace (`import * as difficulty`), so trees without `p6` still load;
  `difficulty.igDlx` is undefined there and the branch is off.
- `withP6(ctx, run)`: when `IG.p6`, sets `igDlx.skip = true`, runs the search, and restores `false` in a `finally`
  (other tasks of the worker, such as `rate`, keep the canonical diagnostic). For an ok result it recomputes the
  diagnostic once on the returned clues: `solveFirst(buildModel(board, pieces, clues, ws), { rowTrialLimit:
  SCORE.caps.rows, branchTrialLimit: SCORE.caps.branch })`, fills `B`, `branchTrials`, `rowTrials` and `dlxStop` exactly
  as `measureV3` does (lines 253-262, including the error when no solution is found where the deduction found one),
  and returns the result with the completed rating. `igDispatch` wraps `v3` in it; the prototype calls it around its
  search.
- Required: every accepted rating of a `p6` arm deep-equals its canonical rating (`verify.mjs`), and the identity rule
  of the check-list §3 holds between each `p6` arm and its non-`p6` arm.

### 3. Arms

| Arm | Variant | Workers | Cells and reps | Row limit R |
|---|---|---:|---|---:|
| A | `log` | 4 | fast: 26x26-nightmare 0-3, 26x26-master 0-3, 14x14-master 0-3; slow: 12x12-nightmare 0-1 | 90 s; 260 s |
| B | `log-p6` | 4 | fast only | 90 s |
| C | `log-p6-w8` | 8 | fast; 12x12-nightmare 0-1 | 90 s; 260 s |
| E | `p1p5-main` | 4 | 14x14-nightmare 0-1 | 260 s |
| F | `p1p5-main-p6-w8` | 8 | 14x14-nightmare 0-1 | 260 s |

A and E are run again here (not taken from IGP-01) so that each factor compares runs of one session. E also checks the
prototype's default path after the arity-3 and `withP6` changes: its puzzles must equal IGP-01's after arm on both seeds
(`resultDigest`; a difference is a stop). MP12b1's responses on A's fast seeds total about 150 s; 12x12 Nightmare reps
0-1 about 100 s (IGP-01's before arm: 73.0 and 27.9 s); 14x14 Nightmare after P1-P5 takes about 6 to 9 s per request
(IGP-01's after arm: 5.5 and 8.9 s; IGP-03's 190 M T10 median 7.2 s).

### 4. Factors, identity and memory (`compare.mjs` additions)

Pairs `A:B` (P6 alone on today's search, fast cells: the only isolated P6 factor), `B:C` (the eight-worker bound,
fast cells), `A:C` (P6 x eight, fast cells and 12x12), `E:F` (P6 x eight on the prototype, 14x14: a combined factor,
not P6 alone). For each pair and cell, the median of the paired per-seed ratios (before / after), matched seeds only,
with completion beside, on:

| Quantity | Meaning | §5 row |
|---|---|---|
| T10 | the whole first phase on ten puzzles (both reached ten) | R22, R23 |
| T1 | the set stage (P8's "set x 1.0-1.3") | R23 |
| T10 − T1 | the batch (P8's "batch x 1.3-1.9") | R23 |
| response | every request | |

The first-phase factor (R25) is a Projection: A:C's T10 factor × the P7 assumption (1.3; range 1.1 to 1.8), set against
÷1.9; the same on E:F. Every eight-worker figure carries the label "unadmitted upper bound". P6's work saving is also
given from the call journals of A and B (Σ rating ms per call with and without the diagnostic), a finer measure than
the request ratio. Identity: prefix identity (check-list §3; every arm here runs a keyed tree) between A and B, A and
C, and E and F on every seed, and digest identity between E and IGP-01's after arm (required; a difference is a stop).
Memory, per row of every arm: `peakAccountedBytes` against worker count × `WORKER_LIMIT_BYTES` + `MAIN_BUDGET_BYTES`
(constants read from the arm's tree) and `peakProcessBytes` against 1.5 GiB; pass or fail and the maximum per arm
(R26).

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/variants/p6.json`, `w8.json`, `log-p6.json`, `log-p6-w8.json`, `p1p5-main-p6-w8.json` | new |
| `tools/ig-proto/variants/files/log/core/engine/ig-log.js` | `withP6`; `igDispatch` uses it |
| `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js` | wraps its search in `withP6` |
| `tools/ig-proto/compare.mjs` | factors, identity across arms (E against IGP-01's after arm included), memory; the arity-3 note of the IGP-03 study (step 0) |
| `tools/ig-proto/self-test.mjs` | a `--p6` case |
| `tools/ig-proto/plans/IGP-04.json` | new |
| `docs/improve-generating/evidence/provisional/IGP-04/` | new records |

## Implementation steps

0. Fix from the IGP-03 review, first: in `compare.mjs`, the arity-3 section of the IGP-03 study no longer states "their
   puzzles differ (the arity-3 probe order changes the random stream)"; it states per seed whether the two arms' puzzles
   are identical, from `resultDigest`. On IGP-03's four requests they are identical, so its T1 comparison is between
   runs with the same results. IGP-03's published record stays as it is; its execution log carries the correction.
1. The manifests and `withP6`; a `--p6` self-test case: on the corpus of IGP-00's case 4, a `log-p6` call returns a
   rating that deep-equals the `log` call's, and the profiles inside it skipped the diagnostic (the check is the
   equality; the skipped calls are counted).
2. The comparison additions; the plan; run it; `npm run check`; the firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-04.json` (allocation 28 minutes; the runner adds `--label` and
`--source-label`; arm steps are `tools/ig-proto/arm.mjs run --task IGP-04 ...`):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-04` | | |
| trees | no | `tools/ig-proto/lib/tree.mjs build base log log-p6 log-p6-w8 p1p5-main p1p5-main-p6-w8` | | |
| self-test | yes, once | `tools/ig-proto/self-test.mjs --p6` | 105 | `IGP-04/self-test/state.json` |
| A-fast, B-fast, C-fast | yes, until done | `--arm <A,B,C> --shard fast --variant <log, log-p6, log-p6-w8> --workers <4,4,8> --cases 26x26-nightmare:0-3,26x26-master:0-3,14x14-master:0-3 --row-limit-s 90` | 330 | `IGP-04/<arm>/fast/state.json` |
| A-12x12, C-12x12 | yes, until done | `--arm <A,C> --shard 12x12-nightmare --variant <log, log-p6-w8> --workers <4,8> --cases 12x12-nightmare:0-1 --row-limit-s 260` | 330 | |
| E, F | yes, until done | `--arm <E,F> --shard 14x14-nightmare --variant <p1p5-main, p1p5-main-p6-w8> --workers <4,8> --cases 14x14-nightmare:0-1 --row-limit-s 260` | 330 | |
| verify | yes, until done | `tools/ig-proto/verify.mjs --task IGP-04 --arm B,C,F` | 150 | `IGP-04/verify/state.json` |
| publish (each arm) | no | `tools/ig-proto/arm.mjs publish --task IGP-04 --arm <arm>` | | |
| compare | no | `tools/ig-proto/compare.mjs --task IGP-04 --pairs A:B,B:C,A:C,E:F --reference mp12b1` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-04` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-04.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-04 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

Projection (restated after IGP-03): fast shards about 150 to 190 s each (A, B, C; one or two invocations each), 12x12
rows 28 to 73 s for A and less for C, 14x14 rows about 6 to 9 s for E and less for F, one verify invocation (about 90
s), the self-test (about 60 s). Rows share an invocation when the horizon admits them (IGP-03 used 13 locked
invocations instead of 19), so about 12 to 16 locked commands: about 13 minutes of node time (per-row process start
included) and 9 to 12 of quiet periods, about 23 minutes likely; the allocation stays 28 minutes.

## Record formats

- Published arms and `verify-<arm>.json|md` (as IGP-01).
- `compare.json`: per pair and cell `{ factors: { t10, t1, batch, response }, n, completion, identity, label }`;
  `firstPhase: { measured: { today, prototype }, p7Assumption: { likely: 1.3, low: 1.1, high: 1.8 }, projection,
  against: 1.9 }`; `memory: { '<arm>': { workers, accountedLimit, maxAccounted, processLimit, maxProcess, pass } }`.
  `compare.md` with one table per pair, the labels, and the memory table.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-04-B01 | P6's factor is measured in isolation on today's search (A:B, matched seeds, the same puzzles), and the combined P6 × eight-worker factor on today's search (A:C) and on the prototype (E:F), each labelled as what it is | `compare.md` |
| IGP-04-B02 | Eight workers are measured as an unadmitted throughput upper bound, labelled so, never reported as the accepted P8 policy | `compare.md` |
| IGP-04-B03 | The ÷1.9 assumption is set against measured P6 × the eight-worker bound with P7 assumed, as a Projection; both memory criteria are reported at eight workers | `compare.md` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-04-T01 | Prefix identity holds between A and B, A and C, E and F on every seed, and E's puzzles equal IGP-01's after arm on both seeds (`resultDigest`); every accepted rating of B, C, F equals its canonical rating | `compare.md`; `verify-<arm>.md` |
| IGP-04-T02 | Without `p6` in the chain the trees load and behave as before (the IGP-00 and IGP-01 self-tests pass); `igDlx.skip` is restored after every call | self-test output; code review |
| IGP-04-T03 | Locked commands within their horizons, in `invocations.jsonl`; records per the check-list §3; `npm run check` and the firewall check pass | runner log; command output |

## Test plan

The `--p6` self-test case; the IGP-00 self-test and `--proto` again (no regression); the verify steps; the run plan.

## Definition of done & handoff

- The reply gives the factor tables with their labels, the memory table, the projected first-phase factor, the counted
  machine time and the lock waits.
- Handoff to IGP-07: `compare.json` (R22, R23, R25, R26).

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IGP-04 ACCEPT, no fixes; the `verify.mjs` wording goes to IGP-07) |
| Start | 2026-11-15 03:21 (+07:00) |
| End | 2026-11-15 05:35 developer (plan 03:36-05:34, mostly priority waits); 05:42 author acceptance; orchestrator commit |
| Duration | 2 h 14 min elapsed, mostly waiting behind difficulty-v3; 11 locked invocations (node 762 s, counted 1,257 s of the 28 min allocation); no dev runs; priority waits 5,636 s beyond the quiet period, not counted; round counted 7,469 s of 10,800 s |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (pack author review, opus-ig); claude-opus-5.5 (orchestrator) |
| Token usage | 125 model calls; 34,387,340 input tokens (34,010,788 cache reads); 138,539 output tokens |
| AI credits | about 573 (developer) |
| Verification | Step 0: `compare.mjs` states the a3 puzzles from `resultDigest` per seed (identical / differ / not established). New variants `p6`, `w8`, `log-p6`, `log-p6-w8`, `p1p5-main-p6-w8`; `withP6` in `ig-log.js`, used by `ig-select-proto.js`; `compare.mjs` factor mode and `--reproduce`; self-test 18/18 (`igDlx.skip` restored in a `finally`). Arm E reproduces IGP-01's after arm on both seeds (digest, set key, puzzle keys). Prefix identity on every seed (A:B 12/12, B:C 12/12, A:C 14/14, E:F 2/2); arm A equals MP12b1 by digest on all 14 seeds; accepted ratings canonical (B 190, C 356, F 37). Memory: every arm passes the accounted and the 1.5 GiB process checks (arm C peak 450 / 914 MiB). `npm run check` passes; firewall 279 production files unchanged. Evidence: `docs/improve-generating/evidence/provisional/IGP-04/` |
| Acceptance | B01-B03, T01-T03 met (developer; confirmed by the pack author) |
| Issues & resolutions | (1) Factors (median per-seed T10): P6 alone (A:B) 1.32 on 26x26 Nightmare, 1.18 on 14x14 Master, 1.12 on 26x26 Master; width 8 alone (B:C) 1.13, 0.77, 0.97; combined A:C 12x12 Nightmare 0.99, 26x26 Nightmare 1.53, Masters 0.93 / 1.10; prototype E:F 1.01. P6 work saving 9.9-22.8 % of rating time on today's search. (2) **The /1.9 first-phase assumption is refuted as a general factor:** reached only on 26x26 Nightmare; on the prototype P6 plus eight workers add about nothing (P7 would need 1.87); IGP-07's R31 rule amended (likely factor 1.01, range 0.93-1.53). (3) Author finding: at eight workers each identical rating takes 9-28 % longer than at four on this 16-logical-core VM; R23 is machine-specific; IG-P-Q05's admission would refuse eight 224 MiB workers anyway (2,092 MiB worst case against 1,536 MiB). (4) Deviations accepted: E and its reproduction first, `--p6` runs all 18 cases, A does not journal accepted ratings (A:B slightly conservative), verify text "IGP-01-T02" (cosmetic, fixed in IGP-07's `verify.mjs`), 11 invocations instead of 12-16, one PowerShell string-replace edit (files verified) |
| Handoff | IGP-05 (amended): clue offsets of every rating and in-band/eligible ratings by offset; the share of main work above 95 / 190 / 380 M; four lanes only; budget-stopped families reported as "not reached (budget)"; new row IGP-05-B05. Budget: 55.5 min left against 36 min projected (IGP-05 23, IGP-06 8, IGP-03h 5) |

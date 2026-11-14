# IGP-03 — PM3 variants (W 95 and 380 M, arity 3) and the P5 budget inputs

| Header | Value |
|---|---|
| ID | IGP-03 |
| Depends on | IGP-01 (accepted and committed); IGP-02's per-`W` losses are read when present |
| Estimated size | Medium: about 300 new lines (the arity-3 and window-rerate branches of `ig-select-proto.js` about 90, `budgets.mjs` 120, `compare.mjs` additions 60, four manifests, the plan); about 1 to 2 hours of developer work; machine time about 17 minutes (allocation 22, a margin for slower rows), plus 4 for the optional step |
| Owner role | Measurement prototype |
| Confirms or refutes | IG-P-Q09: work per accepted puzzle at 95, 190 and 380 M on 14x14 and 12x12 Nightmare (R16); IG-P-Q08: the arity-3 set stage, every probe counted, with an idealised call-level T1 bound only (R20); IG-P-Q10: inputs for P5's per-level budgets (R21); the re-rating cost (R18); how the accepted puzzles' clue counts depend on `W` (R32); whether 380 M removes IGP-01's mixed 26x26 Master result (R07) |
| Design refs | `clarifications.md` IG-P-Q01 (re-rating), Q08, Q09, Q10; plan §3 P1 (parallel variant), P5; check-list §4 D-IG5, D-IG7, D-IG8, D-IG12 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

IGP-01 ran the prototype at one screen value per level. The plan author wants the final `W_screen` per level and area
class to minimise the total work per accepted puzzle (screens, canonical re-ratings, yield), with 95 M kept as a
control (IG-P-Q09); a parallel bracketing variant only for the set stage, adopted only if it gains after counting every
probe it rates (IG-P-Q08); and P5's budgets fitted per level from measured call costs (IG-P-Q10). This task gives first
inputs for those three on the cells where they matter most. Its samples are small (two seeds per cell and arm): PM4's
corpus (IGP-02) carries most of the `W` economics.

## Scope

### In scope

- Variants `p1p5-w095`, `p1p5-w380`, `p1p5-main-a3` and, optional, `p1p5-w190-rerate-window`, with the two new
  branches of `ig-select-proto.js`.
- `budgets.mjs`; the per-`W` and arity-3 sections of `compare.mjs`; `plans/IGP-03.json`; the records.

### Out of scope

- Changing the default path of the prototype (with `a3` false and `rerate` `end` the code path is IGP-01's).
- Hell 1 at 190 M, the W variants on other cells, a request-level scheduling model of the arity-3 variant (later
  round).

## Repository rules

The check-list §3 and §7. Locked commands through the runner only; no git.

## Inputs & context

- IGP-01's prototype (`ig-select-proto.js`), its arms `before` (`log`) and `after` (`p1p5-main`, W 190 M on Nightmare)
  and their published records.
- The set stage: `setAttempt` runs one `selectClues` call per attempt; the pool runs attempts in parallel and consumes
  the lowest successful one (`generate.js:86-147`); the journal tags these calls `stage: 'set'` with their `attempt`.

## Design

### 1. Variants

| Variant | Extends | Params | Purpose |
|---|---|---|---|
| `p1p5-w095` | `p1p5` | `W { default: 95000000 }` | the control (IG-P-Q09) |
| `p1p5-w380` | `p1p5` | `W { default: 380000000 }` | the upper value |
| `p1p5-main-a3` | `p1p5-main` | `a3: true` | the arity-3 set stage (IG-P-Q08) |
| `p1p5-w190-rerate-window` (optional) | `p1p5` | `rerate: 'window'` | the other reading of the re-rating rule (D-IG7) |

### 2. Arity-3 set stage (`IG.a3` and `ctx.igStage === 'set'`)

It replaces only the bisection of phase A; the gallop stays sequential.

```text
while no hit and both ends known and hiBelow - loAbove > 1:
  g = hiBelow - loAbove
  counts = distinct values of loAbove + max(1, floor(g / 4)), loAbove + floor(g / 2), loAbove + max(1, floor(3 g / 4)),
           kept inside (loAbove, hiBelow), ordered middle, lower, upper          # one fixed probe tree
  rate every count of the round on the family (fam(c)), all of them, journaled under phase 'locate-a3'
  then, in the same order, afterProfile for each; a final result ends the call (the remaining probes were wasted and
  stay in the journal)
  the first IN or IN-REFUSED in that order is the hit; else loAbove = the largest above-side count of the round (or
  the old one), hiBelow = the smallest below-side count (or the old one); if they cross, keep only the middle
  probe's side
  journal the round: { probes: [{ count, side, ms }], serialMs: sum of ms, criticalMs: max of ms }
```

The probes and their subsets depend only on the family order, never on the width. The record gives every probe, the
wasted ones included, and per set-stage call the rounds with their serial and critical times. Its T1 figure is an
**idealised call-level Projection**: for the call that produced the request's set (the lowest successful attempt), T1
minus Σ over its rounds of (serialMs − criticalMs), assuming that three lanes were idle for each round. The real set
stage already runs attempts in parallel on the pool and consumes them in order, so this is a lower bound on T1, not a
measured gain; the record states the assumption and shows how many attempts were in flight when the winning call ran
(from the journal). Nothing is adopted from it (IG-P-Q08).

### 3. Window re-rating (optional variant)

With `IG.rerate === 'window'`: when phase A ends without a hit, both ends known, `hiBelow - loAbove == 1` and the
`loAbove` probe screen-capped, the screen-capped probes are re-rated canonically right away in the order of IGP-01
phase E (distance to `wc`, then the higher count, then probe order), as many as the call's shared allowance leaves
(`rerateMax` in all, D-IG7), each becoming a candidate through `afterProfile`; then phase B starts. The end-of-call
rule still applies to the screen-capped probes not yet re-rated, with what remains of the allowance.

### 4. P5 budget inputs (`budgets.mjs`)

`node tools\ig-proto\budgets.mjs --arms IGP-01/after,IGP-03/w095,IGP-03/w380,IGP-03/a3 --label <L>`: from the journals,
per arm, cell and stage, each call's cumulative work in probe order (screens and re-ratings); for budgets B = 1, 2, 4,
6, 8 and 12 G units: `okBeyond` (the share of ok calls whose cumulative work passed B before their result: such a call
would have been stopped at B, but it might still have returned an earlier retained candidate, and a probe already
running when B passes overshoots it), `failedAbove` (the work of failed calls above B), unfinished calls apart; the
median work rate per arm (units per ms over all tuples) to show B in seconds. Writes
`docs/improve-generating/evidence/<L>/IGP-03/budgets.json|md`. It changes no search: P5's budgets stay recorded, not
enforced (D-IG9), and the record says these are inputs, not fitted budgets.

### 5. Comparison

`compare.mjs` accepts task-qualified arms (`IGP-01/after`) and pairs matched seeds only. Pairs:
`IGP-01/before:w095`, `IGP-01/before:w380`, `IGP-01/after:w095`, `IGP-01/after:w380`, `IGP-01/after:a3`, and
`IGP-01/after:rerate-window` when run. It adds:

- per `W` (95, 190 from IGP-01, 380) and cell: T10 and response (`summarize`), completion, work per accepted puzzle,
  profiles per accepted puzzle, screen-capped probes, re-ratings per call and their share of work, useful ratings lost
  (screen-capped probes whose canonical re-rating was in band), unfinished calls, and the `W` with the least median work
  per accepted puzzle on these two seeds (R16, descriptive), with IGP-02's per-`W` losses beside it when present;
- per `W` and cell, the population of the accepted puzzles (R32, as IGP-01's `compare-r2`): clue share p10 / median /
  p90, U, score position and central share, beside the before arm and MP12b1's 20 reps, so that the dependence of the
  clue-count shift and of the speed-up on `W` is read together;
- for `a3`: probes per set-stage call against IGP-01's after arm on the same seeds (wasted probes included), the
  rounds, serial and critical ms, the idealised call-level T1 bound and the measured T1 of both arms (R20).

## Cells, seeds and sample sizes

| Arm | Variant | Cells and reps | Row limit R | Paired with (matched seeds) |
|---|---|---|---:|---|
| w095 | `p1p5-w095` | 14x14-nightmare 0-1; 12x12-nightmare 0-1 | 260 s | IGP-01 before and after, reps 0-1 |
| w380 | `p1p5-w380` | the same; and 26x26-master 0-4 (shard `fast-master`) | 260 s; 90 s for 26x26-master | IGP-01 before and after, reps 0-1 (26x26-master: 0-4) |
| a3 | `p1p5-main-a3` | 14x14-nightmare 0-1; 26x26-hell-1 0-1 | 260 s | IGP-01 after, reps 0-1 |
| rerate-window (optional) | `p1p5-w190-rerate-window` | 12x12-nightmare 0-1 | 260 s | IGP-01 after, reps 0-1 |

Four workers; one row per invocation on the 260 s shards (check-list §7); the five 26x26 Master rows share a 90 s shard
(added after the IGP-01 review: does W = 380 M remove that cell's mixed result and its screen-capping?). Each arm's
accepted ratings are verified canonically (`verify.mjs`).

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/variants/p1p5-w095.json`, `p1p5-w380.json`, `p1p5-main-a3.json`, `p1p5-w190-rerate-window.json` | new |
| `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js` | the arity-3 and window-rerate branches only |
| `tools/ig-proto/budgets.mjs` | new |
| `tools/ig-proto/compare.mjs` | task-qualified arms; the per-`W` and arity-3 sections |
| `tools/ig-proto/self-test.mjs` | arity-3 and window-rerate cases in `--proto` |
| `tools/ig-proto/plans/IGP-03.json` | new |
| `docs/improve-generating/evidence/provisional/IGP-03/` | new records |

## Implementation steps

1. The branches, with self-test cases: on the synthetic curve of IGP-01 (no prior, K = 15, `a3` on, stage `set`), the
   first round after the gallop probes the counts 4, 2 and 5 (`g = 6` between 1 and 7: 1 + 3, 1 + 1, 1 + 4) in that
   order and hits at 4; the two other probes are journaled as rated; with `a3` on and stage `batch` the path is
   IGP-01's. The window re-rating case: the screen-capped `loAbove` probe is re-rated before phase B.
2. Re-run `self-test.mjs --proto`: the IGP-01 cases still pass unchanged (the default path).
3. `budgets.mjs`, the comparison additions, the plan; run it; `npm run check`; the firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-03.json` (allocation 22 minutes, `optionalMinutes` 4; the runner adds `--label`
and `--source-label`; arm steps are `tools/ig-proto/arm.mjs run --task IGP-03 ... --workers 4 --row-limit-s 260`
unless stated):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-03` | | |
| trees | no | `tools/ig-proto/lib/tree.mjs build base p1p5-w095 p1p5-w380 p1p5-main-a3 p1p5-w190-rerate-window` | | |
| self-test-proto | yes, once | `tools/ig-proto/self-test.mjs --proto` | 135 | `IGP-03/self-test/state.json` |
| w095-14x14, w095-12x12 | yes, until done | `--arm w095 --shard <case> --variant p1p5-w095 --cases <case>:0-1` | 330 | `IGP-03/w095/<case>/state.json` |
| w380-14x14, w380-12x12 | yes, until done | the same with `--arm w380 --variant p1p5-w380` | 330 | |
| w380-master | yes, until done | `--arm w380 --shard fast-master --variant p1p5-w380 --cases 26x26-master:0-4 --row-limit-s 90` | 120 | `IGP-03/w380/fast-master/state.json` |
| a3-14x14, a3-hell1 | yes, until done | `--arm a3 --shard <case> --variant p1p5-main-a3 --cases 14x14-nightmare:0-1` and `26x26-hell-1:0-1` | 330 | |
| rerate-window-12x12 | yes, until done; optional | `--arm rerate-window --shard 12x12-nightmare --variant p1p5-w190-rerate-window --cases 12x12-nightmare:0-1` | 330 | |
| verify | yes, until done | `tools/ig-proto/verify.mjs --task IGP-03 --arm w095,w380,a3` | 150 | `IGP-03/verify/state.json` |
| verify-rerate-window | yes, until done; optional | `tools/ig-proto/verify.mjs --task IGP-03 --arm rerate-window` | 90 | `IGP-03/verify-rerate-window/state.json` |
| publish (each arm) | no | `tools/ig-proto/arm.mjs publish --task IGP-03 --arm <arm>` | | |
| budgets | no | `tools/ig-proto/budgets.mjs --arms IGP-01/after,IGP-03/w095,IGP-03/w380,IGP-03/a3` | | |
| compare | no | `tools/ig-proto/compare.mjs --task IGP-03 --pairs IGP-01/before:w095,IGP-01/before:w380,IGP-01/after:w095,IGP-01/after:w380,IGP-01/after:a3 --reference mp12b1` (plus `IGP-01/after:rerate-window` when run) | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-03` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-03.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-03 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

Projection: twelve rows on the 260 s shards (one per invocation, check-list §7) and five 26x26 Master rows in one 90 s
invocation; at IGP-01's measured after-arm speed (14x14 Nightmare about 10 s, 12x12 about 8 s, Hell 1 26x26 about 35
s, 26x26 Master about 14 s per request) about 250 s of rows with their overhead, one verify invocation (about 60 s),
the self-test (about 30 s): fifteen locked commands, about 6 minutes of node time and 11 of quiet periods, 17 minutes
in all (allocation 22); the optional arm adds two rows and one verify invocation (about 4 minutes).

## Record formats

- Published arms, `verify-<arm>.json|md` (as IGP-01).
- `budgets.json`: `{ meta, budgets: [1e9, 2e9, 4e9, 6e9, 8e9, 12e9], arms: { '<arm>': { workPerMs, cells: { '<case>': {
  '<stage>': { okCalls, failedCalls, unfinishedCalls, okBeyond: { '<B>': share }, failedAbove: { '<B>': units } } } } } }
  }`; `budgets.md` with one table per cell and the caveats of §4.
- `compare.json|md` with the per-`W` table (R16), the per-`W` population table (R32), the arity-3 table (R20, labelled a
  Projection) and the re-rating figures (R18).

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-03-B01 | On 14x14 and 12x12 Nightmare, work per accepted puzzle, T10 and completion are given at 95, 190 and 380 M on matched seeds, with the losses (re-ratings, useful ratings lost), labelled as two-seed indications beside PM4's corpus | `compare.md` |
| IGP-03-B02 | The arity-3 set stage is measured counting every probe, wasted ones included; its T1 figure is labelled an idealised call-level Projection with its assumption | `compare.md` |
| IGP-03-B03 | P5's budget inputs per cell and stage exist for six budgets, with their caveats | `budgets.md` |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-03-T01 | With `a3` false and `rerate` `end`, the prototype's path is IGP-01's (the IGP-01 self-test cases pass unchanged); the new self-test cases pass | self-test output |
| IGP-03-T02 | Every accepted rating of every arm equals its canonical rating | `verify-<arm>.md` |
| IGP-03-T03 | Locked commands within their bounds, in `invocations.jsonl`; no started row rerun; records per the check-list §3; `npm run check` and the firewall check pass | runner log; command output |

## Test plan

The `--proto` self-test with the new cases; the verify steps; the run plan.

## Definition of done & handoff

- The reply gives the per-`W` table, the arity-3 result with its label, the budget table, the counted machine time and
  the lock waits.
- Handoff to IGP-07: `compare.json`, `budgets.json`.

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

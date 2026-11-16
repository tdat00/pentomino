# T11b: Frozen-round pricing: the simulated schedule and the approval fields

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Budget": "Priced after stage 1 from an enumerated manifest (commands, populations, repetitions, limits, validation, grace, concurrency)"; "Each task has a ceiling"); decisions IG-P-D7 (OD-P10), D-V4-02, D-V4-17 (IG-P-Q37 adds no timed run); review RV1-15 (R15), RV2-12 (R2-12), RV2-13, RV3-05, RV4-05, RV4-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11a |
| Depends on | T11a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure functions; synthetic cases, unlocked) |

## Goal

The owner approves the frozen round by its price, so the price must be the schedule that will execute: the same
steps, the same admission rules, the same lanes, the same cut and the same quiet periods. This task writes the pricing
as a simulation of one emitted step at a time under the runners' own rules, with the observations it predicts
completed and censored, a hard ceiling from the enforced bounds beside the projection, and the fields with which the
orchestrator asks the owner for a cumulative round cap.

## Authority and fixed points

- R15 (round 1) and R2-12 (review 2), accepted: a step's price is the simulation of that step alone; a separately
  emitted locked step never shares an invocation or a quiet period. The rules simulated:
  - request rows (`tools/ig-proto/arm.mjs:175`): a row starts while `e + rowLimitS + 10 <= H`;
  - bounded items (T04a `runItems`): consecutive items with one kind and variant form a group run on `ITEM_LANES[kind]`
    lanes (1 for any other kind); a group starts only when its first item is admitted at the current time (`e +
    reserveS <= H - 15`); each item starts on the earliest free lane while `t + reserveS <= H - 15`; an item that is not
    admitted ends the invocation after the group has drained; a completed group drains before the next starts; an
    item still running at the cut `H - 15` is stopped there and ends `censored` (never re-run: T04a's `resumePlan`
    treats an ended item as done); the cut margin of 15 s covers the kill and the close;
  - process and custom items (T10b, T10c): one at a time, admitted while `e + reserveS <= H - 15`, cut at `H - 15` as
    above (T10b step 1.4);
  - the horizon of an invocation `H = 285` s (`tools/ig-proto/lib/budget.mjs:11` and `:88`, with enough allowance)
    and one quiet period of 45 s per invocation (`budget.mjs:12`; `run-task.ps1`'s dry-run forecast adds `projectS +
    45 x invocations` per locked step).
- Overhead assumptions (pack author; the manifest prints them): 2 s of start-up per invocation (`startupS`), 3 s per
  item group for its lanes and trees (`groupStartS`). Durations: a request row takes `projectedRowS` (R15's planning
  projection `1.25 x factor x refS`, not a bound); an item takes the mean measured seconds of its kind and variant
  (T11g reads them), else its reserve. The row admission margin of 10 s (`arm.mjs:175`) and the time a row takes after
  its limit are projection assumptions too: no code enforces them as a deadline (RV4-05).
- RV3-05 and RV4-05 (accepted): a reserve controls admission only; it is never a duration or a ceiling. The hard
  ceiling of a step comes from the bounds the code enforces: the lock helper kills an invocation at 300 node seconds
  (check-list §3.2) and `run-task.ps1` counts at most 45 quiet seconds per invocation (`run-task.ps1:137-139`); an
  invocation that records no progress stops the plan (`:152-154`), so every invocation that does not stop it ends at
  least one unit (a row, or an item: its first admitted item completes or is censored at the cut, and an ended item
  never runs again). A step of `units` rows or items therefore has at most `units` invocations: `ceilingInvocations =
  units` and `ceilingS = units x 345`. A request row has no enforced end inside an invocation (`arm.mjs:175` only
  admits it; `calibrate.mjs:327-367` cuts the request, then the parent reads, validates and publishes without a
  bound), so no tighter row ceiling is claimed. A step of zero units is never emitted (T11c). The step's guard (`1.25 x countedS`) is a budget, not a promise that every observation completes.
- IG-P-Q37 (point 5): the begin line adds no timed run, step or quiet period: it is one `appendFileSync` after
  O(board area + pieces) arithmetic before each rating and count (T02d), inside the durations the pricing reads
  (T04e's items ran with it).
- RV2-13 and D-V4-02: the frozen round has one cumulative cap (`roundLimitS('frozen')` is 0 and each approval adds
  minutes, `budget.mjs:84`); a request states the counted seconds already spent, the additional guard and the
  cumulative cap that covers both, `requestedCumulativeRoundMinutes = Math.ceil((roundCountedSBeforeApproval +
  requestedAdditionalGuardS) / 60)`; prior invocation records are never deleted or reset.

## Scope

- Change: `tools/ig-proto/manifest.mjs` (the pricing exports of steps 1 to 4), `tools/ig-proto/self-test.mjs` (cases
  appended to `--items`), `tools/ig-proto/README.md` (T11a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11b --label frozen`.
1. **Projection inputs** (exports of `manifest.mjs`): `refS(caseId)`: the median of `responseMs / 1000` over the
   valid `generation` runs (T09a's `runStatus`) of the cell's MP12b1 report (`mp12b1Report(caseId)`), `null` without
   a report; `factor()`: `summary.medianRatioBase` of `evidence/frozen/V4-T04/identity.json`, 1 when absent (the
   manifest says so); `projectedRowS({ refS, factor, rowLimitS })`: `1.25 * factor * refS`, or `rowLimitS` when `refS`
   is `null`.
2. **`simulateRows({ rows, rowS, rowLimitS, horizonS = 285, startupS = 2 })`**: invocations until every row ran; in
   each, `e = startupS`, and while rows remain and `e + rowLimitS + 10 <= horizonS`: `e += Math.min(rowS, rowLimitS +
   10)` (a row with `rowS > rowLimitS` is cut by the runner and counted `censored`, else `completed`); the
   invocation's `nodeS` is its final `e`. An invocation that admits no row returns `{ admissible: false, reason:
   'a row of <rowLimitS> s does not fit a horizon of <horizonS> s' }`. Else `{ admissible: true, invocations: [{ rows,
   nodeS }], nodeS, quietS: 45 * invocations.length, countedS: nodeS + quietS, guardS: 1.25 * countedS, completed,
   censored }`.
3. **`simulateItems({ groups, horizonS = 285, startupS = 2, groupStartS = 3, cutMarginS = 15 })`**: `groups` in order,
   each `{ kind, variant, lanes, reserveS, durationsS }`. Per invocation `e = startupS`; for each group with items left:
   if `e + reserveS > horizonS - cutMarginS` the invocation ends; else `e += groupStartS`, every lane is free at `e`,
   and the items left are placed in order, each on the lane that is free first at time `t`, when `t + reserveS <=
   horizonS - cutMarginS`; it then runs to `end = t + durationsS[i]`, and when `end > horizonS - cutMarginS` it ends
   at `horizonS - cutMarginS`, counted `censored` (else `completed`); at the first item not admitted the group stops
   placing; `e` becomes the latest lane end (the drain); a group with items still left ends the invocation, a
   finished group passes on to the next. `nodeS` of an invocation is its final `e`. An invocation that places no item
   returns `{ admissible: false, reason: '<kind> needs <reserveS> s; the horizon <horizonS> s admits none' }`, never a
   forced item. The other fields as `simulateRows`. `simulateProcess({ durationsS, reserveS, horizonS, startupS })` is
   `simulateItems` with one group of one lane and `groupStartS: 0`.
4. **`stepPrice(step)`** for an emitted step `{ type: 'rows' | 'items' | 'process', ... }` (the simulation's input as
   its fields): `{ admissible, projectS: nodeS, invocations, quietS, countedS, guardS, ceilingS }` with `ceilingS` the
   ceiling of the Authority section (`units x 345`, `units` the number of rows or items), `ceilingInvocations`
   (`units`) and the
   simulation's `completed` and `censored`. `price(steps)`: the sum of the step prices, inadmissible steps listed
   apart (they make the plan not priceable). **`approvalFields({ roundCountedSBeforeApproval,
   requestedAdditionalGuardS })`**: the three fields of RV2-13.
5. **Self-test** cases appended to `--items` (Tests table).
6. **README.md**: T11a's section gains the pricing rules of the Authority section and step 2 to 4 verbatim in
   substance, with the overhead assumptions.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure.

| Case name | Input | Expected |
|---|---|---|
| `price: rows, one per invocation at 260 s` | `stepPrice({ type: 'rows', rows: 20, rowS: 55, rowLimitS: 260 })` | 20 invocations of 57 s; `projectS` 1,140; `quietS` 900; `countedS` 2,040; `guardS` 2,550; `completed` 20; `ceilingInvocations` 20; `ceilingS` 20 x 345 = 6,900 |
| `price: rows at 130 s` | `simulateRows` with `rowLimitS` 130 and (a) 4 rows of 40 s; (b) 2 rows of 130 s; (c) 3 rows of 130 s | (a) one invocation, `nodeS` 162 (rows start at 2, 42, 82, 122); (b) one invocation, `nodeS` 262; (c) two invocations |
| `price: two sequential 120-s process items fit one invocation` | `simulateProcess({ durationsS: [120, 120], reserveS: 120 })`; `stepPrice` of the same step | one invocation, `nodeS` 242 (starts at 2 and 122), `completed` 2, `censored` 0; `ceilingS` 690 |
| `price: a 200-s process item with a 120-s reserve` | `stepPrice({ type: 'process', durationsS: [200], reserveS: 120 })` | `projectS` 202; `countedS` 247; `ceilingS` 345 (at least the projection; never 167) |
| `price: an item past the cut is censored` | `simulateProcess({ durationsS: [120, 200], reserveS: 120 })` | one invocation, `nodeS` 270 (the second item, admitted at 122, is stopped at the cut 270); `completed` 1, `censored` 1; `countedS` 315 |
| `price: two lanes differ from one` | `simulateItems({ groups: [{ kind: 'v4-select', variant: 'v4', lanes: 2, reserveS: 120, durationsS: [60, 60, 60, 60] }] })`; the same with `lanes: 1` | two lanes: one invocation, `nodeS` 125; one lane: two invocations, `nodeS` 185 and 65, `quietS` 90 |
| `price: two separately emitted steps` | `price` of two steps `{ type: 'process', durationsS: [60], reserveS: 120 }` | two invocations, `quietS` 90 |
| `price: an inadmissible group` | `simulateItems({ groups: [{ kind: 'v4-generate', variant: 'v4', lanes: 1, reserveS: 245, durationsS: [100] }], horizonS: 250 })` | `admissible` false with the reason; no invocation priced |
| `price: approval fields` | `approvalFields({ roundCountedSBeforeApproval: 600, requestedAdditionalGuardS: 1200 })` | `requestedCumulativeRoundMinutes` 30 (not 20), the two inputs echoed |
| `price: projection label and fallback` | `projectedRowS({ refS: 40, factor: 1.1, rowLimitS: 260 })`, `projectedRowS({ refS: null, factor: 1, rowLimitS: 130 })` | 55 (within 1e-9); 130 |

## Documentation

`tools/ig-proto/README.md` (step 6).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11b` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing an admission rule or an overhead assumption of the Authority section.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11b-B01 | The price of a step is the schedule the runners execute, with its predicted censored observations and a ceiling from enforced bounds beside it, and an inadmissible step is never priced as one invocation | the ten cases | self-test output |
| T11b-B02 | An approval request states the time already spent and asks for a cumulative cap | case 9 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11b-T01 | Request rows, lanes, process items, the cut and separate steps simulated by the runners' rules; ceilings from enforced bounds (RV3-05) | cases 1 to 8 | self-test output |
| T11b-T02 | Nothing else changed; formats | guards; `npm run check` | command output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |

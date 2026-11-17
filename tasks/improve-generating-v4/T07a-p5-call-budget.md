# T07a: P5 in the prototype: the per-call work budget

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §3 P5 ("A work budget per selection call"), §5.1 stage 2 ("the P5 budget arm"), §6 ("Determinism of budgets"); decisions D-V4-05, D-V4-08; review RV1-10 (R10) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T06b |
| Depends on | T06b (and T02d's begin lines) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (synthetic ratings and real counts on one small set; verification through the lock helper) |

## Goal

P5 makes a selection call's outcome independent of the clock: a call ends when its work budget in units is spent, and
returns its best already finished result or `not-in-band`. This task builds that budget in the prototype, checked
before every rating and every uniqueness count, repairs included, so that a replay meters the same units and stops at
the same point; the arm that sets a budget is T07b's.

## Authority and fixed points

- Plan §3 P5: "When it is used up the call ends with its best result or `not-in-band`"; §6: "the same request ends the
  same way on a slow and a fast machine".
- Review R10 (accepted): the budget accounts for every rating, re-rating and uniqueness count; it is checked before
  each such operation, repairs included; the running operation finishes and is charged in full (the overshoot is
  recorded); after exhaustion no operation starts; the result is the best already finished final result of the
  finals cache, by the existing centre and tie order, or `not-in-band`; the lazy `chooseBest` is not called after
  exhaustion when it can perform new work (R10: "if it can perform new work after exhaustion"; in `any` mode it cannot,
  so T07b step 1b calls it there: ruling of 2026-11-17, T07b's report); an unfinished repair is never accepted; skip
  verification and observer exceptions are kept; the budget end is recorded apart from an unrateable rating.
- D-V4-05 (check-list §4): the change is inert for every arm without `IG.callBudget` and without the `ctx.igBudget`
  seam (an infinite budget never stops; the added hooks only observe), so the `v4` arms keep their ids; the P-0 parity
  pass of T11c's plan `V4-S2` (manifest `V4-S2P.p0-v4.json`, receipt of T11d) re-checks `v4`'s stage-1 results (T04e)
- `makeUnique` (`core/engine/clues.js:173-212`) calls `onCount` right after each count and `onAdd` after each added
  clue, right before its next count when `current.length <= pieces.length - 2`.

## Scope

- Change: `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js` (steps 1 to 4); `tools/ig-proto/self-test.mjs`
  (`v4Call`'s spec, helpers, three cases); `tools/ig-proto/README.md` (a paragraph).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T07a --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants/*.json`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T07a --label frozen`.
1. **Module level** of `ig-select-v4.js`: `class BudgetStop {}` and

   ```js
   /** @param {any} table @param {{ id?: string }} target @returns {number} */
   export function callBudgetOf(table, target) {
     if (table === undefined || table === null) {
       return Infinity;
     }
     const v = table[/** @type {string} */ (target.id)] ?? table.default;
     return typeof v === 'number' && v > 0 ? v : Infinity;
   }
   ```

2. **Meter** in `searchV4`, right after the definitions of T02a's step 4.2: `const budget = ctx.igBudget ??
   callBudgetOf(IG.callBudget, target); let spent = 0; loc.spent = 0;` and

   ```js
   // Every metered unit (P5, R10): charged to the observer and the budget, with its kind for the test seam.
   const meter = (u, kind) => {
     spent += u;
     loc.spent = spent;
     ctx.igChargeKinds?.push(kind);
     charge?.(u);
   };
   // T02a's count hook, now also metered (the journal line and loc.countWork stay as T02a wrote them).
   const meterCount = (u) => {
     igCountLine(call.id, u);
     loc.countWork += u;
     meter(u, 'count');
   };
   const checkBudget = () => {
     if (spent >= budget) {
       throw new BudgetStop();
     }
   };
   ```

   In `rateOnce` (T02a step 4.3): `checkBudget();` is the first statement, for every phase, before T02d's
   `igBeginLine(...)` statement (a stopped primitive writes no begin line, IG-P-Q37); both `charge?.(...)` calls
   become `meter(<the same units>, 'rate:' + phase)`.
3. **Repairs** (the frozen `finish` of T02a step 4.6): `checkBudget();` is the first statement of the `require`
   branch, before `const ordinal = repairOrdinal;` (so before T02d's begin line of the first count, which stays right
   before `const repaired = makeUnique(`); the `makeUnique` hooks become `{ onAdd: (addedId, list) => { if (record !==
   undefined) { steps.push({ addedId, clues: ownPoses(sortLike(layout, list)) }); } if (list.length <= K - 2) {
   checkBudget(); igBeginLine(call.id, 'count', rowLimit); } }, onCount: meterCount }` (the check, then the begin
   line, stand right before the next count; `meterCount` replaces T02a's hook, so a count is journaled once and
   charged once).
4. **The end.** A private `bestFinished()`:

   ```js
   // The best final result already finished (R10): the existing centre and tie order, no new work.
   const bestFinished = () => {
     let pick = null;
     let pickDistance = Infinity;
     for (const c of (finite ? ranked(target, inBandList) : inBandList)) {
       const final = finals.get(c.idx.join(','));
       if (final === undefined || final === null) {
         continue;
       }
       const distance = finite ? Math.abs(final.rating.score - centre) : 0;
       if (pick === null || distance < pickDistance) {
         pick = final;
         pickDistance = distance;
       }
     }
     return pick;
   };
   ```

   The top-level `catch` of the search (T02a step 4.8) tests `BudgetStop` before `Final`: `if (e instanceof
   BudgetStop) { loc.budgetStop = { limit: budget, spent, overshoot: spent - budget }; const best = bestFinished();
   if (best !== null) { return conclude(best); } verifyConsumed(); return { ok: false, reason: 'not-in-band' }; }`.
   No event is recorded for the budget end (the journal's `locate.budgetStop` records it; the event kinds stay those
   of D-V4-06). Corrected by T07b step 1b (ruling of 2026-11-17, T07b's report): in `any` mode the branch calls
   `chooseBest()` in place of `bestFinished()`, because `finish` returns the raw subset there and does no work, so the
   call ends with its best waiting in-band candidate (plan P5: "its best result").
5. **Seams** (JSDoc of `selectCluesV4`, with the other seams): `ctx.igBudget` (a number) replaces the table;
   `ctx.igChargeKinds` (an array) receives one kind per metered unit: `rate:<journal phase>` or `count`.
6. **Self-test**: `v4Call(name, spec)` (`spec.uniqueness` and `spec.journal` are T02d's) accepts `spec.extra` (an
   object merged last into the context) and returns `chargeLog` (the units given to a `charge` it installs when
   `spec.extra.charge` is `true`, replaced by its own function) and `kinds` (`spec.extra.igChargeKinds`). A helper
   `prefix(L)` returns the prefix sums `P[0] = 0, P[j] = L[0] + ... + L[j-1]`, and `m(P, B)` the least `j` with
   `P[j] >= B` (`L.length` when none). Cases in the Tests table.
7. **README.md**: a paragraph "P5 call budget (V4-T07a)": the units, the checks (every rating, before the first count
   of a repair, before every further count), the end rule (best finished final or `not-in-band`), the journal fields
   `locate.spent` and `locate.budgetStop` (the `count` lines and `locate.countWork` are T02a's), the two seams.

## Tests

`S1 = { prior: null, screen: () => 'cap', canon: (c) => synthetic(c <= 3 ? 100 - 10 * c : 60), uniqueness: 'require' }`
(every probe is screen-capped, so the locate re-rates; a repaired set of 4 or more clues stays central, so the
unbudgeted call ends with a winner); `S2 = { prior: null, screen: (c) => synthetic(c === 4 ? 56 : 100 - 10 * c), canon:
(c) => synthetic(c === 4 ? 56 : 100 - 10 * c), uniqueness: 'require' }` (56 is in the band 55 to 70 but not central,
so in-band candidates wait unfinished). Categories of a kind log: search (`rate:locate`, `rate:window`, `rate:p2`,
`rate:beam`), re-rating (`rate:rescue`, `rate:rerate`), first count (a `count` not preceded by a `count`), count after
count, repair rating (`rate:repair`).

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --v4` | `p5: call budget stops deterministically` | twice `v4Call('budget', { prior: null, screen: () => 'cap', canon: (c) => synthetic(100 - 10 * c), extra: { igBudget: 1520000000 } })`; once the same without `extra` (one name for all three: the name feeds the rng stream and the journal's `row`; ruling of 2026-11-17, T07a's report) | with the budget: `counts('locate')` `[7, 13]`, no `rescue` tuple, `end.locate.budgetStop` deep-equals `{ limit: 1520000000, spent: 1520000000, overshoot: 0 }`, `result` `{ ok: false, reason: 'not-in-band' }` with no other field, the two runs' `result` and `stable` journals equal; without the budget: `counts('rescue')` `[13, 7]` |
| same | `p5: budget sweep (S1, S2)` | for S in S1, S2: the unbudgeted run U with `extra: { charge: true, igChargeKinds: [] }` gives `L`, `K` (kinds) and `n = L.length`; the sweep indices = index 0, index `n - 1` and the first three indices of each category; for each sweep index `i`: the run with `extra: { charge: true, igChargeKinds: [], igBudget: B }`, `B = P[i]` | U: `L.length === K.length`; across S1 and S2 every category has at least one index; for each `i`: the run's `chargeLog` deep-equals `L.slice(0, m(P, B))` and its `kinds` equal `K.slice(0, m(P, B))`; its result is either `ok` with `inBand(rating)` and `certificate.status === 'unique'`, or `{ ok: false, reason }` with `reason` `not-in-band` or `uniqueness-not-proved`; `end.locate.budgetStop` is present exactly when `m(P, B) < n`, and then deep-equals `{ limit: B, spent: P[m(P, B)], overshoot: P[m(P, B)] - B }`; in every run's journal the number of `begin` lines equals the number of `p` lines plus `count` lines (a stopped primitive writes no begin line, T02d) |
| same | `p5: budget end with unfinished candidates, every observer mode` | S2 with `B = P[f]`, `f` the index of the first `count` of `K`: (A) no observer; (B) `charge` only; (C) `charge` and `record` | A, B and C results deep-equal and are `{ ok: false, reason: 'not-in-band' }`; B's and C's charge logs equal `L.slice(0, f)`; C's events contain at least two `rated` events with a score from 55 to 69.99 (two or more in-band candidates were waiting) and no `selected` event |

If the coverage assertion of the second row fails, report the two kind logs (`QUESTION:`); the scenarios are the pack
author's to change. The first row's numbers follow from the synthetic cap's 760,000,000 units per capped rating: two
capped locate probes spend 1,520,000,000 units, and the next rating meets the check.

## Documentation

`tools/ig-proto/README.md` (step 7).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error | 2 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T07a verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T07a')` (check-list §3.2) | root | every `--v4` case passes (those of the earlier tasks, T02d's included, and these three), exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T07a` | root | every `--items` case passes | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T07a --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a production file, a variant manifest or the legacy dispatch.
- `QUESTION:` when a case of T02a, T02b or T02c fails after this change (the budget must be inert without a budget).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07a-B01 | A `gen-v4` call ends deterministically when its work budget is spent, with its best finished result or `not-in-band`, never with an unfinished repair | cases 1 to 3 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T07a-T01 | No operation starts after exhaustion; one charge per operation; the charge log is the unbudgeted prefix | case 2 | self-test output |
| T07a-T02 | Exhaustion before a search rating, a re-rating, a first count, a count after a count and a repair rating, each covered | case 2's coverage | self-test output |
| T07a-T03 | Equal results in every observer mode; unfinished in-band candidates are not accepted | case 3 | self-test output |
| T07a-T04 | Inert without a budget | T02a's to T02d's cases pass | helper output |
| T07a-T05 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | 2026-11-17 12:41:48 +07:00 (dispatch, base `9f5fb57`) to 13:01:13 +07:00 (acceptance): 19 min 25 s; the developer's own times 12:42:12-12:55:16 |
| Waiting for rulings | about 6 min (12:55:16 report to 13:01 ruling); no developer wait (no fix round) |
| Agent id, model | `b77c2308-5b1d-4cc1-993d-1731188dda8b`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 77 calls; 12,605,525 input, 67,661 output, 12,400,900 cache-read |
| AI credits | 242.82 |
| Questions and rulings | No `QUESTION:`. The moved `v4`-family tree ids (`check-binding --current v4` stale), three deviations, four named items and three gaps were relayed to the pack author; all accepted (13:01): the move is intended (no parameters changed; consumers of the stage-1 binding declare `current: []`; P-0 re-checks the final trees; the register lists the ids); case 16's text corrected; T07b gains a budget-stopped replay case (T07b-T05) and a no-repair-event assert; T11d's Authority notes the move; pack amendment `69e7473` |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `--v4` through the lock helper (`V4-T07a-verify`): 18 passed, 0 failed, `IG … exit=0 seconds=7.786` (P5 sweeps S1 5 operations / 5 budgets, S2 55 / 10); `--items`: 44 passed; `--frozen`: 10 passed; `check-edits`: `v4` 40 edits, no error; stage-1 `evidence-check`: unchanged (20 files); `check-binding`: pass (`--current v4`: stale, exit 2, intended); firewall `check` (V4-T07a): 289 production files unchanged; `npm run check`: OK. No machine time counted (round 2,724 s of 5,520 s) |
| Commit | this task's commit, `improve-generating T07a: P5 in the prototype: the per-call work budget` |
| Issues and named items | The `v4`-family tree ids moved (v4 `006431d6…` to `61729ef5…` and six others; check-list register); none new |

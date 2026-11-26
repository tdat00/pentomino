# P2-04: `select-v4.js`: the port of the frozen selector

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 (`select-v4.js`), §4.4 (port contract, P1 to P5 rows); D-P2-04, D-P2-07 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-04` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | S; P2-02 and P2-03 |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: locked focused runs |

## Goal

`core/engine/select-v4.js` is the frozen `gen-v4` search as production code: the same decisions, ratings, skip
ordinals and rng draws as `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js` under the `fr-frozen`
parameters, without journals, `IG` globals or Node imports, with P6 kept, and with two production observer events
(a no-window end and a budget stop) for the Generation steps view. The dispatcher gets its `gen-v4` branch, which
stays off until P2-15. P2-05a and P2-05b prove the behaviour.

## Authority and fixed points

- Source of truth: the frozen file (1,320 lines) under the `fr-frozen` parameters (`docs/improve-generating-phase-2/
  evidence/sa-opus/p2-variant-chain.md`, section `fr-frozen`): `rerate: 'rescue'`, `rerateMax: 4`, `c4: false`, the
  budget by mode (the frozen `p5-mode` edit `fz-1`/`fz-2` gives the call its budget), the prior table, the screen by
  route. Its `(c4)` probe (lines 863-882) and its bracket-close re-rating (lines 1099-1121) are **not** ported (both
  off in the freeze).
- Port contract (plan §4.4): for identical selector-call inputs and observer/skip configuration, the frozen primitive
  work and skip ordinals; P6 changes no decision (the DLX diagnostic never enters a score).
- Production observers keep their contracts: `rate` seam, `record`, `recordSource`, `onRate`, `replaySkips`, `charge`
  (`core/engine/clues.js:32-55`). Without a seam, `record` or `onRate`, every rating is lean (P6) and `conclude`
  completes the returned rating with `completeDiagnostic` (as `clues.js:541-552`).

## Scope

- Create `core/engine/select-v4.js`, `tests/select-v4.test.js` (smoke cases of step 6).
- Change `core/engine/clues.js` (the dispatcher only, step 5), `tools/bench/report.js` (step 4),
  `docs/design-detail.md` §6.10 (Documentation).
- Do not change: anything else. Guard: G-PROTECTED, G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/select-v4.js', 'core/engine/clues.js', 'tests/select-v4.test.js', 'tools/bench/report.js',
    'docs/design-detail.md',
    'tasks/improve-generating-phase-2/P2-04-select-v4-port.md')
  ```

## Steps

1. Preflight: `git --no-pager diff --exit-code --stat HEAD -- core tests tools` prints nothing.
2. Create `core/engine/select-v4.js` by copying the frozen file's lines 46-1320 and applying exactly this
   transformation table (nothing else changes; keep comments, adjusted to name production symbols):

   | Frozen | Production |
   |---|---|
   | imports (lines 22-33) | `activeCount` (`./board.js`); `countRowLimit, makeUnique, SkipReplayError, bandDistance, ranked, noProvedGuess, sortLike` (`./clue-primitives.js`); `completeDiagnostic, IncompleteRatingError, inBand, rate, rateDetailed, rateLean, rateWithLimits, screenCertified` (`./difficulty.js`); `callBudgetOf, priorStart, RERATE_MAX, screenWOf, SKIP_BOUNDS_V4, startOf` (`./gen-v4.js`); `clueKey` (`./keys.js`); `bandEdge` (`./levels.js`); `BUDGETS, DEDUCE` (`./policy.js`); `isValidLayout` (`./tiling.js`). No `node:` import, no `ig-params.js`, no `ig-log.js` |
   | `SKIP_BOUNDS_V4` (57-63), `callBudgetOf` (82-88), `screenClass`/`classW` (97-129), `priorCount` (199-205), `v4Target` (213-215) | delete (they come from `gen-v4.js`; the route is the dispatcher's) |
   | the local `bandDistance`, `ranked`, `noProvedGuess`, `sortLike` (135-182) | delete (from `clue-primitives.js`) |
   | `igLedgerLine`, `igCapsLine`, `igCountLine`, `igBeginLine`, `igRatingBound` (220-278) | delete |
   | `selectCluesV4` (290-318) | `export function selectCluesV4(ctx)`: `K = ctx.pieces.length`; `W = ctx.screenW ?? screenWOf(ctx.target.id, activeCount(ctx.board))` (`screenW`: a test seam, units); `prior = K < 3 ? null : ctx.igPrior === undefined ? priorStart(ctx.target.id, activeCount(ctx.board), K) : ctx.igPrior === null ? null : Math.min(K - 2, Math.max(1, ctx.igPrior))`; `loc = { c0: null, probes: 0, result: null, hit: null, hiBelow: null, loAbove: null, wc: null, noWindowProof: null, rescue: [], countWork: 0 }`; return `searchV4(ctx, loc, W, prior)` (no `startCall`, `endCall`, `withP6`, `markNoWindow`) |
   | `searchV4(ctx, call, loc, W, prior, markNoWindow)` | `searchV4(ctx, loc, W, prior)`; a local `let rerates = 0;` replaces `call.rerates`; a local `counters = { budgetStops: 0, screenCapped: 0, rescueReratings: 0, tailReratings: 0 }` |
   | `rateWith` (344-348) | production's form: `seam !== undefined ? seam : record !== undefined ? rateDetailed : (onRate === undefined ? rateLean : rate)` (as `clues.js:277-280`) |
   | `rerateMax = IG.rerateMax` (395) | `RERATE_MAX` |
   | `budget = ctx.igBudget ?? callBudgetOf(IG.callBudget, target)` (404) | `const budget = ctx.budget ?? callBudgetOf(uniqueness, target.id);` (`ctx.budget`: a test seam, units) |
   | `meter` (409-414) | drop `ctx.igChargeKinds?.push(kind)`; keep `spent`, `loc.spent`, `charge?.(u)` |
   | `meterCount` (417-421) | `loc.countWork += u; meter(u, 'count');` (no journal line) |
   | `rateCanonical` (432-433) | `const rateCanonical = (clues) => rateWith(board, pieces, clues, ws);` |
   | `rateScreen` (441-462) | `ctx.rateScreen !== undefined` -> `{ rating: ctx.rateScreen(clues, W), detail: null }`; `seam !== undefined` -> seam; `!screened` -> `rateCanonical(clues)`; else `rateWithLimits(board, pieces, clues, ws, W, record !== undefined ? 'detailed' : onRate === undefined ? 'lean' : 'full')` |
   | `rateOnce` (474-511) | keep `checkBudget()` first; delete `igBeginLine(...)` and `recordRating(...)` (call the rating directly); keep the metering; the screen-capped test uses `!screenCertified(m, W)`; when it returns `{ capped: true, screenCapped: true }` add `counters.screenCapped += 1;` (also for a screened `IncompleteRatingError`) |
   | `finish` (617-711) | delete the two `igBeginLine(...)` calls; keep `checkBudget()` before `makeUnique` and in `onAdd` |
   | `conclude` (716-731) | keep `verifyConsumed()` and the `selected` event above the return; return exactly the object below (R7; the window is read through `loc`) |
   | `step` (855-891) | delete the `(c4)` block (863-882) |
   | `rerate` (898-924) | first line exactly `  const rerate = (p, phase) => {`; replace `call.rerates += 1` with `rerates += 1`; after a returned rating, `counters.rescueReratings += 1` when `phase === 'rescue'`, `counters.tailReratings += 1` when `phase === 'rerate'` |
   | every `igPhase(...)` call | delete |
   | phase A start (949-950) | `const { c0, step0 } = startOf(prior, K);` |
   | `failNoWindow` (1071-1081) | first `record?.({ stage: 'clues', kind: 'no-window', source, side: noWindow === 'below-to-one' ? 'below' : 'above' });` (a production observer event, D-P2-10), then return `{ ok: false, reason: 'not-in-band', igNoWindow: noWindow === 'below-to-one' ? 'below' : 'above', counters: { ...counters } }` |
   | the close block (1099-1121) | delete (keep `let proof = null;`) |
   | `call.rerates < rerateMax` / `>=` | `rerates < RERATE_MAX` / `>=` |
   | phase C (1214-1220) | delete the `if (rated.length === 0) { igPhase('p2'); }` block; the next line must read exactly `    for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {` |
   | the final failure (1300-1301) | `return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band', counters: { ...counters } };` |
   | the `BudgetStop` branch (1304-1313) | first `counters.budgetStops = 1;` then `record?.({ stage: 'clues', kind: 'budget', source });`; the failure return carries `counters` as above |

   The `conclude` return object, verbatim (R7):

   ```js
   return {
     ...r,
     rating: completeDiagnostic(board, pieces, r.clues, r.rating, ws),
     skips: { subsets: subsetSkips.slice(), repairs: repairSkips.slice() },
     igWindow: {
       c0: loc.c0, wc: loc.wc, hit: loc.hit, hiBelow: loc.hiBelow,
       loAbove: loc.loAbove, probes: loc.probes,
       result: loc.result, proof: loc.noWindowProof,
     },
     counters: { ...counters },
   };
   ```

   The two observer events are the only additions to the frozen behaviour. A `record` observer receives them; they
   change no result, work or skip (P2-T03). Their tests are P2-05b's. Their `types.js` documentation is P2-09's.

   `loc.budgetStop` and `loc.c4`/`loc.close` are journal-only: delete them. Keep `SAMPLES_PER_COUNT` and the other
   constants of lines 50-55. Keep `eventPhase` (`'p2'` events are `seed`).
3. JSDoc: `selectCluesV4` documents the production context additions: `igPrior` (`undefined`: the table; `null`: no
   prior; an integer: the per-set override, clamped to 1 to K - 2), `rateScreen`, `screenW` and `budget` (tests only),
   and the result additions `igWindow`, `counters`, and `igNoWindow` (`'below'` or `'above'`) on a no-window failure.
4. `tools/bench/report.js` line 43: insert `'core/engine/select-v4.js', ` directly before `'core/engine/sharecode.js', `.
5. In `core/engine/clues.js`, change the dispatcher body to:

   ```js
     return usesGenV4(ctx.target.id ?? '', ctx.board) ? selectCluesV4(ctx) : selectCluesV3(ctx);
   ```

   with `import { usesGenV4 } from './gen-v4.js';` and `import { selectCluesV4 } from './select-v4.js';`. The first
   line `export function selectClues(ctx) {` stays.
6. `tests/select-v4.test.js` (smoke only; P2-05a and P2-05b add the behaviour suite): the cases below.
7. The prototype-hook gate (below), the anchor checks and the locked focused gate.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tests/select-v4.test.js` | `a gen-v4 call returns an in-band result with its window` | the recipe board (`tests/fixtures/clue-recipes.js`), `target: level('master')` with `id` (a Master band is reachable on 10x6), `uniqueness: 'any'`, seed `'p2-04/a'`, real ratings | `ok: true`; `inBand(rating, target)`; `igWindow.wc` an integer 1 to 10; `counters` all 0 (no screen on 60 cells); `rating.metrics.dlxStop !== 'skipped'` (completed) |
| same | `a no-window call names its side` | same board; `rateScreen` and `rate` seams returning score 0 for every subset (always below) | `{ ok: false, reason: 'not-in-band', igNoWindow: 'below' }` |
| same | `the dispatcher keeps today's search while the route is off` | a Nightmare-target context on `rectangle(10, 10)` | `selectClues` result deep-equals `selectCluesV3` result |
| every existing test | unchanged | | pass |

## Documentation

`docs/design-detail.md` §6.10: a subsection "`gen-v4`'s search (phase 2, not yet live)": the locate on one nested
family from the prior start (P1, P4), sided profiles and the AR1 direction, screen ratings with the certificate (P2),
capped profiles as directions (P3), the rescue and tail re-ratings sharing an allowance of four, the per-call budget
and the no-window sides (P5), and that the window, seed, beam, centre and stall rules are today's (§6.10 above).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --check core\engine\select-v4.js` | slot root | exit 0 | 30 s |
| the prototype-hook gate (R7): the PowerShell block below this table | slot root | no throw | 30 s |
| the two anchor lines (`const rerate = (p, phase) => {` and the phase C `for` line) | `Select-String -SimpleMatch` | one hit each | 30 s |
| locked focused gate: `--test tests/select-v4.test.js tests/clues.test.js tests/benchmark-report.test.js` | §3.3 | `# fail 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

The prototype-hook gate as typed in PowerShell:

```powershell
$hits = @(Select-String -LiteralPath (Join-Path $root 'core\engine\select-v4.js') -Pattern 'IG\.|ig-log|ig-params|node:|igBeginLine|igPhase|recordRating|startCall|endCall|markNoWindow')
if ($hits.Count) { throw 'QUESTION: an unmapped prototype hook remains' }
```

## Stop points and questions

- `QUESTION:` when a frozen line uses a symbol this table does not map, when a production observer contract would
  change, or when an existing test fails.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-04-B01 | No user-visible change while the route is off | dispatcher test; full suite | gate output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-04-T01 | The transformation table is applied and nothing else | the `Select-String` gate; review of the diff against the frozen file | command output |
| P2-04-T02 | P6 kept: lean search ratings, completed result rating | smoke case 1 | test output |
| P2-04-T03 | The two anchor lines exist verbatim | `Select-String -SimpleMatch` | command output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] `docs/design-detail.md` §6.10 updated (a subsection at the section's end, before the blank line preceding `### 6.11`)
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

Start and end times; files changed; the transformation table with any line you could not map; helper lines and pass
counts; each AC row with its evidence; questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w1, df7261576074fa267aab660b023ad6971b5f61fd |
| Start, end, duration | dispatched 2026-11-25 22:27 +07:00 (developer 22:27:24 to about 22:40, doc fix to 22:46:51); accepted 22:54; about 27 min |
| Waiting for rulings | about 6 min (deviations 3 and 5 and the module-tree mention, SA-Opus) |
| Agent id, model | 877421ad-c97c-41ab-a69d-d91596453a90, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 76; 10,374,486 / 57,035 / 10,038,473 |
| AI credits | 241.42 |
| Questions and rulings | no QUESTION; seven deviations sent to SA-Opus, all accepted: (1) ctx.target.id ?? ''; (2) r.rating cast as RatingV3; (3) the no-window event after verifyConsumed() and Object.assign(loc, …), where the frozen failNoWindow wrote markNoWindow (frozen 1072-1074); (4) clamp deleted; (5) rescue/tail re-rating counters after const { rating, detail } = out;, so a capped re-rating is not counted (frozen 902-909; P2-05a rescue:<n>:rated|rejected); (6) production-wording comments; (7) rateScreen wrapped. Documentation fix ruled by SA-Opus: design-detail.md line 169 lists select-v4.js; the clues.js API entry (555-567) names the selectCluesV4 dispatch and adds the selectCluesV4 signature |
| Fix rounds | 1 (the ruled documentation fix) |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 6 files); rebased onto 0183938 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked focused `IG P2-04 merge exit=0 seconds=55.722 quiet=45`, 81/81 pass, 0 fail/cancelled/todo; link anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | rebased 6c35eda; gen-v4 6c35edaffecc374665d48f949c3e258c0aea2800 |
| Issues and named items | bandDistance import and the kind/phase parameters kept unused per the table (ruled); the no-window and budget event types in types.js are P2-09; parity with the frozen selector, the two new event kinds and the last-event assertion are P2-05b |

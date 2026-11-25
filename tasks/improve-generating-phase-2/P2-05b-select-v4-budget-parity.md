# P2-05b: `select-v4.js`: budget stops, no-window events, skips and the frozen parity check

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.4 (P5 budget, the port contract), §4.6 (events), §6 P2-T03, P2-T04; D-P2-04, D-P2-10 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-05b` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | S; P2-05a (the same test file) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: locked focused runs and one locked parity run (at most 600 s) |

## Goal

P5's per-call budget is pinned, and so are two more behaviours:

- **The budget's check before every primitive:** an exact stop, and the one allowed overshoot by a count already
  started.
- **The two production observer events:** `no-window` with its side, and `budget`.

Skip replay is pinned on the same vectors. Production also equals the frozen selector on nine real calls of real sets.

## Authority and fixed points

- **Vectors and expected values.** Read P2-05a's "Authority" first: the same helpers (`k15`, `synthetic`, `BAND`,
  `DOWN`, `fromCount`, `run`, `observables`), and the expected values copied as literals from
  `docs/improve-generating-phase-2/evidence/sa-opus/p2-05-vectors.jsonl`.
  - The three `budget-require-overshoot` lines are, in file order, the budgets 760010100, 760000003 and 760000002.
  - This task uses the second and third lines. Their name, and so their rng label, is `budget-require-overshoot`.
- **The budget rule** (frozen `ig-select-v4.js` `checkBudget`):
  - before every rating and every uniqueness count, the call stops when `spent >= budget`;
  - a primitive that started below the budget runs to its end and may overshoot;
  - in `any` mode the stop returns the best waiting in-band candidate; in `require` mode only a finished unique final.
- **R7.** Assert exact units, never "at most 300" when a real count can be the last primitive.
- **The frozen trees** `tests/artifacts/ig-proto/tree-frozen/fr-frozen/` and `.../fr-frozen-none/` are read only, through
  the slot's junction (check-list §3.7). They were built 2026-11-23; `fr-frozen`'s `ig-tree.json` `treeId` is
  `b3e530b1bca515e551f240faccc327f9868da0f475a60761986faf4884b781f7`. The parity check imports their
  `core/engine/ig-select-v4.js`.

## Scope

- **Change:** `tests/select-v4.test.js` (add the cases below).
- **Change only for a defect:** `core/engine/select-v4.js`.
- **Create:** `docs/improve-generating-phase-2/evidence/P2-05b/port-parity.mjs` and its logs `parity.log` and
  `helper.log`.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tests/select-v4.test.js', 'core/engine/select-v4.js',
    'docs/improve-generating-phase-2/evidence/P2-05b/port-parity.mjs',
    'docs/improve-generating-phase-2/evidence/P2-05b/parity.log', 'docs/improve-generating-phase-2/evidence/P2-05b/helper.log',
    'tasks/improve-generating-phase-2/P2-05b-select-v4-budget-parity.md')
  ```

## Steps

1. **The test cases.** Add the cases below to `tests/select-v4.test.js`, describe `gen-v4 budget, events and skips`,
   reusing P2-05a's helpers. `NIGHTMARE` is `level('nightmare')` (band 53 to 77).
2. **The parity script.** Write `E/P2-05b/port-parity.mjs`, a scratch script (`// @ts-check`) run from the slot root.
   - **Cells.** `10x10-nightmare` (frozen tree `fr-frozen-none`), `14x14-nightmare` and `15x15b10-nightmare` (tree
     `fr-frozen`), `15x20-nightmare` (tree `fr-frozen-none`).
     - The board is `rectRows` of `tools/bench/calibration-reference.js` for rectangles, and `15x15b10` from
       `tools/ig-proto/data/boards-v1.json`.
     - Two seeds each, `p2-05/<cell>/0` and `p2-05/<cell>/1`, uniqueness `any`.
     - Plus `10x10-nightmare` with seed `p2-05/require/0` and `require`.
   - **The set.** Copy `setAttempt`'s lines 113-135 (`core/engine/generate.js`) with `attempt = 0` and the level
     `nightmare`, using production modules. The selection rng is `rng.derive('cal')` of that same `rng` object, made
     once per selector by rebuilding the rng and repeating the same draws.
   - **The production call.** `selectCluesV4({ board, pieces, layout: witness, target: level('nightmare'), rng, uniqueness, excludeClueKeys: new Set(), ws: createWorkspace(MAIN_WORKSPACE_BYTES), charge })`.
   - **The frozen call.** Import `selectCluesV4`, `level` and `createWorkspace` from the frozen tree. Use the same
     context plus `igBudget: callBudgetOf(uniqueness, 'nightmare')`, the production value.
   - **Compare:**
     - `ok`, and the piece ids of `clues`;
     - `skips`;
     - the `igWindow` fields `c0`, `wc`, `hit`, `hiBelow`, `loAbove`, `probes`, `result` and `proof`;
     - `rating.score` and every `rating.metrics` field of the frozen rating (production's completed rating is a
       superset; P6);
     - `certificate`;
     - the summed `charge` units;
     - on a failure, `reason` and `igNoWindow`.
   - **Output.** Write `parity.log` itself (CRLF, UTF-8): one line per call, `parity <cell> <seed> <equal|differ <first path>> units <n>`,
     then a last line `parity: <equal> of <n> equal`. Exit 0 only when all are equal.
3. **Run it locked** (Commands) and keep the logs. A difference is a port defect: stop and report before changing
   `select-v4.js`.

## Tests

| Case name | `spec` (P2-05a's `run`) | Expected literals |
|---|---|---|
| `any mode: the budget stops before the fourth rating and returns the best waiting candidate` | name `budget-any-54`: `{ target: NIGHTMARE, screen: () => synthetic(54, { work: 100 }), budget: 250 }` | ok; 7 clues; score 54; `igWindow { c0: 7, wc: 7, hit: 7, hiBelow: null, loAbove: null, probes: 1, result: 'hit', proof: null }`; seam calls `['screen:7', 'screen:7', 'screen:7']` (exactly three ratings); charges `[100, 100, 100]` (exactly 300); `counters.budgetStops` 1; events `other` `['budget', 'selected']` |
| `require mode: the stop returns no unfinished candidate` | name `budget-require-54`: the same with `uniqueness: 'require'` | not ok, `not-in-band`; charges `[100, 100, 100]`; `counters.budgetStops` 1; `other ['budget']` |
| `require mode: a central candidate finishes inside the budget` | name `budget-require-65`: `{ target: NIGHTMARE, uniqueness: 'require', screen: () => synthetic(65, { work: 100 }), budget: 150 }` | ok; 7 clues; score 65; charges `[100, 33]` (the real count, 33 units); `counters.budgetStops` 0 |
| `a count that starts below the budget runs to its end` | name `budget-require-overshoot`: `{ uniqueness: 'require', screen: DOWN, budget: 760000003 }` | ok; 4 clues; charges `[1, 760000000, 1, 515]` (sum 760000517, above the budget: the count's actual units); `counters.budgetStops` 0 |
| `the stop comes before a primitive at the budget` | name `budget-require-overshoot`: the same with `budget: 760000002` | not ok, `not-in-band`; charges `[1, 760000000, 1]` (no count starts); `counters.budgetStops` 1; `other ['budget']` |
| `a no-window end names its side in the event` | names `below1` and `above13` of P2-05a | the last event is `{ stage: 'clues', kind: 'no-window', source: 'candidate', side: 'below' }` and `... side: 'above' }` respectively; the results equal the same calls without `record` |
| `the events are observers only` | `budget-any-54` and `below1`, each with and without `record` | equal results, counters and charges |
| `an excluded first probe is skipped and replays exactly` | name `skip`: capture the clues of the first `rateScreen` call of `run('skip', { screen: DOWN })`; then `run('skip', { screen: DOWN, exclude: new Set([clueKey(board, set.pieces, captured)]) })` | the second call: ok; 4 clues; `skips { subsets: [0], repairs: [] }`; `other ['skip', 'selected']`; charges `[1, 760000000, 1]` |
| `the recorded skips replay the same result` | name `skip`: `{ screen: DOWN, replay: { subsets: [0], repairs: [] } }` | the same result and skips as the previous case |
| `an unused replay entry throws` | name `skip`: `{ screen: DOWN, replay: { subsets: [0, 2000], repairs: [] } }` | throws `SkipReplayError` with message `recorded subsets skip 2000 is unused` |

The three `skip` rows use one name, so the same rng label: the frozen run used `skip-base`, `skip`, `skip-replay` and
`skip-replay-unused` as names, with identical outcomes. Use `skip` for all three.

## Documentation

None (P2-04 wrote §6.10).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/select-v4.test.js')` | §3.3 | `# fail 0` | 300 s |
| locked parity: `Invoke-IgNode -Repo pentomino -Task 'P2-05b parity' -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @('docs\improve-generating-phase-2\evidence\P2-05b\port-parity.mjs') -InformationVariable info`; then write the `IG` line held in `$info` to `helper.log` with `[IO.File]::WriteAllText` (CRLF, UTF-8 without BOM) | §3.3 | `parity.log` last line `parity: 9 of 9 equal`; `IG P2-05b parity exit=0` | 600 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** after the first focused run, or after the first parity run, when a case or a call differs. The
  pack author rules before any change to `select-v4.js`.
- **`QUESTION:`** when the frozen trees are missing through the junction, or their `treeId` differs from the one above.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-05b-B01 | The ported search makes the frozen decisions on real sets | parity check | `E/P2-05b/parity.log` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-05b-T01 | P5: the check before every primitive, the exact stop, the overshoot of a started count, the mode rules | the five budget cases | test output |
| P2-05b-T02 | The `no-window` and `budget` events: sides, order, observers only | the event cases | test output |
| P2-05b-T03 | Skips: ordinal 0, exact replay, an unused entry refused | the skip cases | test output |
| P2-05b-T04 | Production equals frozen on 9 real calls: decisions, ratings, skips, units | parity check | `parity.log`, `helper.log` |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] Parity 9 of 9 equal; logs kept
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the defects fixed, each with its case and ruling;
- the parity result and the helper seconds;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |

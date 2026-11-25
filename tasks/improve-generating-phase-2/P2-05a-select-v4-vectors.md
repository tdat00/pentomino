# P2-05a: `select-v4.js`: the frozen synthetic vectors

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.4 (P1 to P3, the port contract), §6 P2-T03, P2-T04; D-P2-04 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-05a` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | S; P2-04 |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: locked focused runs |

## Goal

The production selector is pinned on the frozen selector's own synthetic vectors: the locate, march, bisect and AR1
refusal, the no-window sides and their proofs, the rescue and tail re-ratings, the window, seed and beam phases, and
the observers. Every input and every expected value is literal in this task; the developer designs no fixture.

## Authority and fixed points

- **Source of the vectors.**
  - The frozen v4 synthetic cases, `tools/ig-proto/self-test.mjs:11175-11258` (`v4: P1 locate, rescue and re-rating
    order`; `v4: the result carries skips and the window`), with their helpers: `synthetic` (9829-9832), `BAND`
    (9835), `k15Set` (9841-9856), `v4Call` (10307-10349), `DOWN`, `REBRACKETED` (10464-10466).
  - Do not import or run the frozen self-test from production tests (R7).
- **The expected values** are the frozen selector's actual outputs on the same inputs.
  - The pack author computed them on the `fr-frozen` tree:
    `docs/improve-generating-phase-2/evidence/sa-opus/p2-05-vectors.mjs`, run locked, output
    `docs/improve-generating-phase-2/evidence/sa-opus/p2-05-vectors.jsonl` (one JSON line per case `name`).
  - Copy each expected value from the line of the same `name` into the test **as a literal**. The test must not read
    the JSONL file.
- **Production seams** (P2-04's table) against the frozen ones:

  | Production | Frozen |
  |---|---|
  | `rateScreen(clues, W)` | `igScreen` |
  | `rate(board, pieces, clues, ws)` | `igCanonical` |
  | `screenW` | `igW` |
  | `budget` | `igBudget` |
  | `igPrior` | `igPrior` |

- **The production additions** to the frozen results, and nothing else:
  - `counters` on every result;
  - the `no-window` event (before a no-window failure returns) and the `budget` event (P2-04);
  - the completed `rating` of an ok result: its `score` is unchanged.

## Scope

- **Change:** `tests/select-v4.test.js` (add the cases below; P2-04's smoke cases stay).
- **Change only for a defect:** `core/engine/select-v4.js`. A test that shows a port defect is fixed there, and every fix
  is listed in the final report.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tests/select-v4.test.js', 'core/engine/select-v4.js',
    'tasks/improve-generating-phase-2/P2-05a-select-v4-vectors.md')
  ```

## Steps

1. **Helpers** at the top of the new block in `tests/select-v4.test.js`, verbatim in substance:
   - `k15()`: the K = 15 set, rebuilt with production modules exactly as
     `docs/improve-generating-phase-2/evidence/sa-opus/p2-k15-seed.mjs` does:
     - `board = boardFromRows(Array.from({ length: 10 }, () => '#'.repeat(10)))`;
     - `stream = createRng(normalizeSeedText('ig-selftest/proto/k15/1'), 'set/0')`;
     - `ks = pieceCountRange('master', 100)`; `k = ks[stream.int(ks.length)]`;
     - `carved = (100 / k >= 6.5 ? carveMacro(board, k, stream.derive('macro'), BUDGETS) : null) ?? carveFlatSet(board, k, stream.derive('flat'), BUDGETS)`;
     - `set = finalizeSet(board, carved.regions, carved.regionOf ?? null)`.

     Assert `set.pieces.length === 15` and the sorted piece sizes `[5,5,5,5,5,6,6,6,6,7,7,8,9,10,10]`.
   - `synthetic(score, { work = 1, Gproved = 1, stop = 'exhausted' } = {})`, returning
     `{ model: 'difficulty-v3', score, level: 'st', saturated: false, metrics: { work, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: stop, Gproved, censusComplete: true } }`.
   - `const BAND = Object.freeze({ id: 'st-band', min: 55, max: 70, share: 0.3 });`
   - `DOWN = (c) => (c <= 2 ? 'cap' : synthetic(100 - 10 * c))`; `capAll = () => 'cap'`.
   - `fromCount(fn, clues, log, kind)`:
     - push `` `${kind}:${clues.length}` `` to `log`;
     - `r = fn(clues.length)`;
     - when `r === 'cap'`, throw `new IncompleteRatingError('synthetic cap', { nodes: 1, work: DEDUCE.work, stop: 'work-cap' })`;
     - else return `r`.
   - `run(name, spec)`. It calls `selectCluesV4` with:
     - `board`, `pieces: set.pieces`, `layout: set.witness`;
     - `target: spec.target ?? BAND`, `uniqueness: spec.uniqueness ?? 'any'`;
     - `rng: createRng(normalizeSeedText('ig-selftest/proto/p1'), \`selftest/${name}\`)`;
     - `excludeClueKeys: spec.exclude ?? new Set()`, `ws: createWorkspace(MAIN_WORKSPACE_BYTES)`;
     - `igPrior: spec.prior ?? null`, `screenW: 190000000`;
     - `rateScreen: (clues) => fromCount(spec.screen, clues, log, 'screen')`;
     - `rate: (b, p, clues) => fromCount(spec.canon ?? spec.screen, clues, log, 'canon')`;
     - the `budget` and `replaySkips` of `spec` when given;
     - `charge: (u) => charges.push(u)`, `record: (ev) => events.push(ev)`.

     It returns `{ result, error, log, charges, events }`, catching a throw into `error`.
   - `observables(r)`, returning:
     - `probes`: per phase, the clue counts `ev.clueIds.length` of the events of kind `rated`, `unrateable` or
       `rejected`, in order;
     - `kinds`: those events as `` `${ev.phase}:${ev.clueIds.length}:${ev.kind}${ev.reason === undefined ? '' : ':' + ev.reason}` ``;
     - `other`: the kinds of the other events;
     - `seamCalls`: `log`;
     - `charges`.
2. **The cases** of the table below. Each asserts, as literals copied from the JSONL line of its `name`:
   - `result.ok`, `result.reason`, `result.igNoWindow` (missing is `null`);
   - `result.clues.length` and `result.rating.score` for ok results;
   - `result.igWindow` and `result.skips` (deep-equal; absent on failures);
   - `probes`, `kinds`, `seamCalls` and `charges` (deep-equal);
   - `other`: the JSONL's `otherEvents` with `'no-window'` appended when the result has `igNoWindow`.

   Each also asserts `result.counters` by this rule over the JSONL `kinds`:
   - `screenCapped`: the entries ending `:unrateable:screen-capped`;
   - `rescueReratings`: the entries `rescue:<n>:rated` or `rescue:<n>:rejected`;
   - `tailReratings`: the entries `rerate:<n>:rated` or `rerate:<n>:rejected`;
   - `budgetStops`: 0.
3. **The observer cases** and **the throwing observers** below.
4. **The locked focused gate.** A failing case is a port defect only after you check that the case's literals match the
   JSONL line. Stop and report before changing `select-v4.js` (Stop points).

## Tests

All rows are in `tests/select-v4.test.js`, describe `gen-v4 frozen vectors (K = 15)`. "JSONL" is
`p2-05-vectors.jsonl`. The counters are the rule of step 2's values.

| Case name | `spec` | Key expected literals (the rest from the JSONL line) | Counters `screenCapped / rescue / tail` |
|---|---|---|---|
| `noprior` | `{ screen: DOWN }` | ok; 4 clues; score 60; `igWindow { c0: 7, wc: 4, hit: 4, hiBelow: null, loAbove: null, probes: 3, result: 'hit', proof: null }`; `probes.locate [7, 1, 4]`; charges `[1, 760000000, 1]` | 1 / 0 / 0 |
| `prior6` | `{ prior: 6, screen: DOWN }` | ok; 4 clues; `igWindow { c0: 6, wc: 4, hit: 4, hiBelow: null, loAbove: null, probes: 4, result: 'hit', proof: null }`; `skips { subsets: [], repairs: [] }`; `probes.locate [6, 5, 3, 4]` | 0 / 0 / 0 |
| `overwork` | `{ screen: (c) => (c === 7 ? synthetic(30, { work: 190000001, stop: 'work-cap' }) : DOWN(c)), canon: DOWN }` | not ok, `not-in-band`; `probes.locate [7, 13, 10, 8]`; `probes.window`, `probes.beam`, `probes.rerate [7, 7, 7, 7]` and `kinds` (68 entries) from JSONL | 35 / 0 / 4 |
| `ar1in` | `{ screen: (c) => (c === 4 ? synthetic(60, { Gproved: 0 }) : DOWN(c)) }` | not ok; `probes.locate [7, 1, 4]`; the third `kinds` entry `locate:4:rejected:no-proved-guess`; 65 `kinds` from JSONL | 1 / 0 / 0 |
| `below1` | `{ screen: () => synthetic(30) }` | not ok, `not-in-band`, `igNoWindow 'below'`; `probes.locate [7, 1]`; no `window` phase; `other ['no-window']` | 0 / 0 / 0 |
| `above13` | `{ screen: () => synthetic(90) }` | not ok, `igNoWindow 'above'`; `probes.locate [7, 13]`; `other ['no-window']` | 0 / 0 / 0 |
| `confirmed` | `{ screen: capAll, canon: () => synthetic(90) }` | not ok, `igNoWindow 'above'`; `probes.locate [7, 13]`, `probes.rescue [13, 7]`; seam calls `['screen:7', 'screen:13', 'canon:13', 'canon:7']` | 2 / 2 / 0 |
| `heuristic` | `{ prior: 2, screen: capAll, canon: () => synthetic(90) }` | not ok, `igNoWindow 'above'`; `probes.locate [2, 3, 5, 9, 13]`, `probes.rescue [13, 9, 5, 3]`; no `rerate` phase | 5 / 4 / 0 |
| `rebracketed` | `{ screen: capAll, canon: (c) => synthetic(100 - 10 * c) }` | not ok, `not-in-band`, `igNoWindow null`; `probes.locate [7, 13, 1, 4, 5, 6]`, `probes.rescue [13, 7]`, `probes.rerate [7, 7]`, `probes.seed` (16 entries of 7), `probes.window` (27 entries) from JSONL | 49 / 2 / 2 |
| `rescuedin` | `{ screen: capAll, canon: (c) => synthetic(c === 13 ? 60 : 90) }` | ok; 13 clues; score 60; `igWindow { c0: 7, wc: 13, hit: 13, hiBelow: null, loAbove: null, probes: 2, result: 'hit', proof: 'rescued-in' }`; `probes.rescue [13, 7]` | 2 / 2 / 0 |
| `rescuedrefused` | `{ screen: capAll, canon: (c) => (c === 13 ? synthetic(60, { Gproved: 0 }) : synthetic(90)) }` | not ok; `probes.rescue [13, 7]` with `rescue:13:rejected:no-proved-guess`; `probes.window [13, 13, 13, 13]`, `probes.seed` (15 entries of 13), `probes.rerate [13, 13]` | 21 / 2 / 2 |
| `require-rebracketed` | `{ uniqueness: 'require', screen: capAll, canon: (c) => synthetic(100 - 10 * c) }` | not ok; `probes` and `kinds` (54 entries) from JSONL | 50 / 2 / 2 |
| `require-down` | `{ uniqueness: 'require', screen: DOWN }` | ok; 4 clues; score 60; `igWindow { c0: 7, wc: 4, hit: 4, hiBelow: 7, loAbove: 1, probes: 3, result: 'hit', proof: null }`; `other ['repair', 'repair', 'selected']`; charges `[1, 760000000, 1, 10000, 1, 513, 154, 1, 1, 418]` (real count units) | 1 / 0 / 0 |
| `observers do not change the result (P2-T03)` | for `require-rebracketed` and `require-down`, three calls each with the same name: no `charge` and no `record`; `charge` only; `charge` and `record` | the three results deep-equal (`ok`, `clues`, `rating.score`, `skips`, `igWindow`, `counters`); the summed charges of the second and third calls are equal (`38000000004` and `760011090`) | as above |
| `a throwing charge propagates at once` | `{ screen: capAll, canon: (c) => synthetic(100 - 10 * c) }` with `charge` throwing `new Error('charge-stop')` at its third call (name `throw-charge`) | the call throws that error; exactly 3 charges `[760000000, 760000000, 1]`; 2 rating events | - |
| `a throwing record propagates at once` | the same input with `record` throwing `new Error('record-stop')` at its second event (name `throw-record`) | the call throws that error; exactly 2 events; charges `[760000000, 760000000]` | - |

## Documentation

None (P2-04 wrote §6.10).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/select-v4.test.js')` | §3.3 | `# fail 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** after the first focused run if any vector fails. Report the case, its literal and the actual
  value. The pack author rules before `select-v4.js` changes.
- **`QUESTION:`** when the K = 15 set's sizes differ from step 1, or when a JSONL line is missing for a case.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-05a-B01 | The ported search makes the frozen selector's decisions on its own vectors | the vector cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-05a-T01 | P1 to P3: start, march, bisect, AR1, no-window sides, rescue, tail, window, seed, beam, require repairs pinned by literals | the 13 vector cases | test output |
| P2-05a-T02 | P2-T03: observers change no result, units or skips; throwing observers propagate at once | observer and throwing cases | test output |
| P2-05a-T03 | The production counters follow the stated rule | every case's counters assertion | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Every literal copied from the JSONL line of its name
- [ ] Tests added and green; the focused gate green
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the defects fixed in `select-v4.js`, each with its failing case and the ruling;
- the focused helper line and pass counts;
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

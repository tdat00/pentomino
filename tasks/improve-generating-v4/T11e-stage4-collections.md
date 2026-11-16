# T11e: Stage-4 collections: the activation, the concrete validation plan and the closure record

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stage 4; "Hell 1 on 24x24 and 14x14 as five-seed pilots"; "Stopping (IG-P-Q32)"; "Each task has a ceiling"), §5.2 (every screen class runs both arms; the comparator); decisions IG-P-D7 (OD-P10), D-V4-18, D-V4-19, D-V4-20; review RV1-14 (R14), RV1-17, RV2-11 (R2-11), RV3-04 (R3-04), RV4-07 (R4-07) |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11d |
| Depends on | T11d; T11a (`expandMatrix`, `conditionalActivated`), T11c (`rowStep`, `parityPass`, `planOf`, the universe) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (data and pure functions; synthetic cases, unlocked) |

## Goal

The stage-4 validation must measure one declared collection, fixed before it runs: its required cells, the
conditional boards whose pilots qualified and the optional items the owner approved. This task writes the activation
record and, from it, the concrete validation plan `V4-S4` and the comparator template of exactly that collection; and
the closure record with which a collection stopped at its recorded ceiling is declared closed, so that an interim
report is never taken for a final one.

## Authority and fixed points

- Review R3-04 (accepted): "Keep the priced universe separate from the activated measurement collection. Before
  compiling/running a concrete validation plan, record its configuration/epoch, required cells, approved optional
  items and conditional cells whose five-seed pilots reached ten on at least three valid requests. Missing/invalid
  rows are not counted as completions. Preserve the conservative price of unactivated options separately." "The
  initial `V4-S4` plan contains only its activated twins, today's controls and Master rows. It contains no
  `shipped-uncapped` row. Its comparator template contains exactly that initial collection's comparator cells and
  reps; it contains neither unactivated optional cells nor second-validation reps." "Distinguish a collection still in
  progress from one explicitly closed at its recorded ceiling." "Use disjoint task/state namespaces for initial and
  second validation and their comparator collections. Do not change a receipted configuration in place."
- D-V4-20 (check-list §4) and R4-07 (review 4, accepted): the activation and the closure are written once (each
  command refuses an existing record). The order is data first, then time: the owner decides the optional items and
  authorizes the data-only `activate`; `activate` writes the activation record, the concrete plan and its price; only
  then the orchestrator asks the owner for the timed allowance with `approval --plan V4-S4` (T11g), and no locked step
  runs before that approval. Every group selected into the activation is required for that collection: its row step
  has `optional: false` and enters the plan's `allocationMinutes`, so a default run (`run-task.ps1` selects the steps
  without `optional`, `:81-82`) and a default approval cover exactly `declaredRows`; the record keeps each group's
  origin (`initial`, `conditional` or `optional`). `close` runs only on the owner's instruction (check-list §3.4).
- The second validation (S4-7) is not activated here: it stays T11c's template until N-V4-04.
- Every emitted step follows T11c's step rules (RV4-04): `node` an argv array of words, every locked step with
  `repeatUntilDone: true`, its `state` and its explicit `minHorizonS`, built with `rowStep`, `parityPass` and `planOf`.
- The prerequisites of the activated plan are accepted bindings (T11c's `accepted` type): the stage-1 binding, the
  P-0 binding (`current: ['v4']`) and the live-deadline binding (`kind: 'live-deadline'`, `fields:
  'LIVE_DEADLINE_FIELDS'`, `current: ['fr-frozen', 'fr-frozen-none']`).

## Scope

- Change: `tools/ig-proto/manifest.mjs` (steps 1 to 3), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T11a's section).
- Do not change: everything else (no activation or closure is written by this task outside the self-test folder).
  Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11e --label frozen`, expected `files unchanged`; `git
  status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data
  tools/ig-proto/plans docs/improve-generating/evidence`, expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11e --label frozen`.
1. **`activation(expansion, { pilots, approvedOptional, epoch })`** (pure export): `pilots` maps each
   `hell1Conditional` board to the run records of its S2-5 pilot (possibly `[]`); `approvedOptional` a subset of
   `['S4-6']`; `epoch` `{ data, freeze, universe }`, each `{ path, sha256 }`. It returns the record `{ format:
   'ig-v4-activation', version: 1, collection: 'initial', epoch, conditional: [{ cell, activated, valid, reachingTen,
   pilotRuns }], optional: { approved, notApproved }, groups: [{ key, origin }], declaredRows: [<arm>/<rowKey>],
   comparatorCells: [{ cell, from, to, rows, shard }] }`: the groups are every non-comparator group of collection
   `initial`, those of collection `conditional` on an activated board (`conditionalActivated(pilots[cell])`, T11a),
   and those of collection `optional` whose items are approved (`origin` the group's collection); `declaredRows` lists `<arm>/<rowKey>` (`rowKey` =
   `<cell>~<rep>`, `tools/ig-proto/arm.mjs:48`) for every rep of those groups; `comparatorCells` are the comparator
   groups of collection `initial` and of the activated conditional boards.
2. **`manifest.mjs activate --collection initial [--approve-optional <ids>] --label frozen --source-label <SL>`**:
   - Refuses (exit 1, nothing written) when `docs/improve-generating/evidence/frozen/V4-S4/activation.json` exists
     (`activation exists: an activation is never rewritten`), when `--collection` is not `initial` (`only the initial
     collection is activated here; the second is N-V4-04's`), or when the freeze file or `tools/ig-proto/plans/V4-S4.universe.json`
     is missing.
   - `pilots`: for each conditional board, the `run` of every row with that `caseId` and `rep` from 0 to 4 in the
     files `docs/improve-generating/evidence/frozen/V4-S2/fr-base/*.runs.json` (`{ meta, shard, rows }`, rows `{
     rowKey, caseId, rep, seed, localRep, run }`, `arm.mjs:263-267`); `epoch` the SHA-256 (`sha256File`) of
     `tools/ig-proto/data/frozen-round-v1.json`, the freeze file and the universe.
   - Writes the activation record (step 1, with `createdAt`), then `tools/ig-proto/plans/V4-S4.json` = `planOf({
     task: 'V4-S4', generatedBy: 'manifest.mjs activate', runnable: true, blockedBy: [], prerequisites, steps })`:
     prerequisites the variants `fr-frozen`, `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped`, the
     files freeze and activation, and the three accepted bindings of the Authority section; steps `prerequisites`,
     `firewall-snapshot`, `trees` (`build log-link fr-frozen fr-frozen-none fr-frozen-uncapped
     fr-frozen-none-uncapped`), the `rowStep` of every activated group with `optional: false` whatever its origin (none
     of arm `shipped-uncapped`), the
     `publish-<arm>` steps, `parityPass('V4-S4P', a, ...)` for the four stage-4 arms, `verdict-input` (unlocked,
     `tools\ig-proto\manifest.mjs verdict-input --purpose selection --activation
     docs/improve-generating/evidence/frozen/V4-S4/activation.json --out
     tools\ig-proto\plans\verdicts\V4-S4.verdict-manifest.json`, `dependsOn` every publish and accept step),
     `verdicts` (unlocked, `tools\ig-proto\verdicts.mjs --manifest
     tools\ig-proto\plans\verdicts\V4-S4.verdict-manifest.json`, `produces`
     `docs/improve-generating/evidence/frozen/V4-S4/class-selection.json`), `resolve-comparators` (unlocked,
     `tools\ig-proto\manifest.mjs resolve-comparators --selection
     docs/improve-generating/evidence/frozen/V4-S4/class-selection.json --activation
     docs/improve-generating/evidence/frozen/V4-S4/activation.json --out tools\ig-proto\plans\V4-S4C.json`, T11f),
     `firewall-check`; and `tools/ig-proto/plans/V4-S4C.template.json` = `{ task: 'V4-S4C', generatedBy: 'manifest.mjs
     activate', template: true, runnable: false, activationSha256: <sha256File of the activation record>, cells: [{
     cell, from, to, rows, rowLimitS: 260, shard, candidates: ['fr-frozen-uncapped', 'fr-frozen-none-uncapped'], price
     }] }` (exactly `comparatorCells`; `price` the row step's at the cell's projection).
   - Prints `activation: <n> groups, <m> declared rows, <k> comparator cells; conditional <cell>: <activated>
     (<reachingTen> of <valid> valid); optional approved <ids>` and `V4-S4: allocation <a> min, optional 0 min; ask
     the owner with approval --plan V4-S4 before any run`.
3. **`manifest.mjs close --collection initial --reason <text> --label frozen --source-label <SL>`**: reads the
   activation record; `published` = `<arm>/<rowKey>` of every row of `docs/improve-generating/evidence/frozen/V4-S4/<arm>/*.runs.json`;
   `missing` = `declaredRows` not in `published`, in their order. Refuses (exit 1) when
   `docs/improve-generating/evidence/frozen/V4-S4/closure.json` exists or `missing` is empty (`nothing to close`).
   Else writes `closure.json` = `{ format: 'ig-v4-closure', version: 1, collection: 'initial', activation: { path,
   sha256 }, missing, reason, createdAt }` and prints `closure: <n> missing rows`.
4. **Self-test** cases appended to `--items` (Tests table); **README.md**: T11a's section gains the activation, its
   rules, the concrete plan and template, and the closure.

## Tests

All in `tools/ig-proto/self-test.mjs --items`; `activation` and the plan builders on the default expansion with
synthetic pilots (T09a's `newRunRecord` rows); the commands on temporary records under `artifactDir('selftest',
'collections')` through injected paths (`activate` and `close` export `activateCommand(argv, paths)` and
`closeCommand(argv, paths)` taking the record, plan and runs paths; `main` passes the real ones).

| Case name | Input | Expected |
|---|---|---|
| `activate: the default initial collection` | no conditional board with three valid runs reaching ten; `approvedOptional: []` | no group of a conditional board or of S4-6; no `declaredRows` entry with a rep from 40 to 59; the plan has no `node` with `shipped-uncapped` and no shard `factor-` or `second-`; `comparatorCells` are exactly the cells of S4-1, S4-2 and S4-3 with reps 20 to 39 |
| `activate: an activated conditional board` | the pilot of `24x24-hell-1`: three valid runs reaching ten and two valid short | its twins in the plan (task `V4-S4`, shard `val-24x24-hell-1`) and its cell in `comparatorCells`; `14x14-hell-1` absent; `conditional` lists both boards with their counts |
| `activate: the selected scope is required` | the pilot of `24x24-hell-1` activating it and `approvedOptional: ['S4-6']` | every row step of the plan has `optional: false`; `optionalMinutes` 0; the union of `<arm>/<cell>~<rep>` over the row steps that `run-task.ps1`'s default rule selects (no `optional`) equals `declaredRows`; `allocationMinutes` includes the `24x24-hell-1` and `factor-` steps; `groups` records their origins `conditional` and `optional` |
| `activate: optional items only with approval` | `approvedOptional: ['S4-6']`; then `[]` | with: the `log-link` groups of shard `factor-<cell>` reps 20 to 24, `optional.approved` `['S4-6']`; without: none, `optional.notApproved` `['S4-6']` |
| `activate: never rewritten` | `activateCommand` twice on the same paths | the second returns 1 with `activation exists`; the record, plan and template are byte-equal to after the first |
| `activate: a complete producer chain` | the plan of the first case | every path a step consumes is produced by an earlier step or is a prerequisite; every `node` names only the variants `log-link`, `fr-frozen`, `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped` |
| `close: exactly the missing rows` | an activation of four declared rows and runs files publishing three; then four | `closure.missing` is the fourth row and `closure.activation.sha256` the record's; then returns 1 with `nothing to close` |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11e` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\manifest.mjs activate --collection second --label frozen --source-label "frozen 3fc65f4"` | root | exit 1 with `only the initial collection is activated here; the second is N-V4-04's`; nothing written | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11e --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- The real `activate` and `close` are not run in this task: `activate` runs after stage 2, the freeze and the
  live-deadline binding, with the orchestrator's go once the owner has decided the optional items and authorized the
  data-only activation; the plan it writes runs only after the owner has approved its timed allowance (`approval
  --plan V4-S4`, T11g); `close` only on the owner's instruction (check-list §3.4).
- Stop and report before: changing a collection rule or the activation threshold.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11e-B01 | The validation measures one declared collection: its required cells, the conditional boards that qualified and the optional items the owner approved, fixed before it runs | cases 1 to 4 | self-test output |
| T11e-B02 | A collection is final only by complete publication or by an explicit closure listing exactly what is missing | case 7 | self-test output |
| T11e-B03 | The owner first decides the optional scope of a data-only activation, then approves the timed allowance of the plan it wrote; a default run and approval cover exactly the declared rows (R4-07) | case 3; the printout of step 2 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11e-T01 | Records are never rewritten; the plan has a complete producer chain and only real variant ids | cases 5 and 6 | self-test output |
| T11e-T02 | Nothing else changed; formats | guards; `npm run check` | command output |

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

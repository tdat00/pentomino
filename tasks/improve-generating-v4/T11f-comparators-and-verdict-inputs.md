# T11f: Comparators and verdict inputs: resolution from a final selection, the selection and final manifests

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("The timed comparator"), §5.2 (the class verdicts; which arm is judged; the comparator; P5's false stops), §6 phase 0's gate; decisions IG-P-D1, D-V4-08, D-V4-16, D-V4-18, D-V4-19, D-V4-20; drift DR-O11; review RV1-12, RV1-14 (R14), RV2-11 (R2-11 steps 5 and 6), RV3-03 (R3-03), RV3-04 (R3-04), RV3-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11e |
| Depends on | T11e; T09a (the verdict-manifest schema), T09e (`classSelection`'s envelope), T04d (`proofCheck`), T11c (`rowStep`, `planOf`, `checkPrerequisites`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 4 h (3 h, 0.5 h for `closureOf`: ruling of 2026-11-17 on T11e's named item, and a fix round of 0.5 h after its report for step 5: ruling of 2026-11-17 on its QUESTION 1), machine 0 min (pure functions and readers; synthetic cases, unlocked) |

## Goal

The comparator of a cell is the uncapped twin of the arm its class ships, so it can only be chosen from a final class
selection of the same collection. This task writes the resolution that turns the activated collection's comparator
template into the concrete plan `V4-S4C`, and the two verdict manifests: the selection manifest, whose phase-0 line
can never pass, and the final manifest, which declares every expected P5 pair and binds the selection it is based on.

## Authority and fixed points

- R2-11 steps 5 and 6 (accepted): `resolve-comparators` reads only a final, bound class-selection receipt and emits
  the concrete comparator plan with the actual arm and variant per cell and per-cell state paths; the verdict manifest
  names the real published files with their SHA-256 and the prerequisites through their accepted bindings.
- R3-03 (accepted): "Final-purpose input declares the expected P5 cells and replicate/seed identities from the active
  collection." "Pass the declared reps/identities into `p5Stops`; do not infer the expected population from whatever
  rows happen to exist." The selection manifest has `purpose: 'selection'` and `p5: []` (T09d never passes phase 0
  on it).
- R3-04 (accepted): "Resolve it only against that collection's bound final selection." "An initial selection cannot
  resolve a second-validation template." The template carries the SHA-256 of its activation record (T11e).
- RV3-06: the selection's expectation is built from records the resolver reads itself: the activation and closure
  records, the freeze file's class arms with the tree id and the parameter hash in their published runs files'
  `meta.trees.<variant>` (immutable), today's harness hash (the selection is written by `verdicts.mjs` in the same
  plan, T09e) and the frozen source.
- The comparators run with row limit 260 (T11a, RV2-10) under task `V4-S4C`; the arm folders are the resolved
  variants, one configuration per arm folder. Every emitted step follows T11c's step rules (RV4-04): `node` an argv
  array of words, every locked step with `repeatUntilDone: true`, its `state` and its explicit `minHorizonS`.

## Scope

- Change: `tools/ig-proto/manifest.mjs` (steps 1 to 3), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T11a's section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11f --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data tools/ig-proto/plans docs/improve-generating/evidence`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11f --label frozen`.
1. **`selectionExpectation({ activation, activationSha256, closure, closureSha256, freeze, runsMeta, harnessHash })`**
   (pure export): `{ kind: 'class-selection', source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
   harnessHash, arms: <for each distinct arm of freeze.classes' screen and noScreen arms, in sorted order: { id,
   treeId: runsMeta[id].treeId, paramsHash: sha256(JSON.stringify(runsMeta[id].params)) }>, coverage: { expected:
   activation.declaredRows less closure?.missing }, fields: { collection: { activationSha256, closureSha256:
   closureSha256 ?? null, missing: closure?.missing ?? [] } } }`; `runsMeta[id]` is `meta.trees.<variant>` of the arm's
   published runs files (all equal; two different values throw `Error('resolve: two trees in the runs of <arm>')`).
   **`closureOf(activationPath, activationSha256, { readFile })`** (pure export, `readFile` by default `readRepoFile`;
   ruling of 2026-11-17 on T11e's named item: T11e's `close` writes the closure record beside the activation record,
   `docs/improve-generating/evidence/frozen/V4-S4/closure.json`, and the plans name no closure argument): it reads
   `closure.json` in the folder of `activationPath` and returns `null` when that file is absent, else `{ ref: { path,
   sha256 }, record }` (`path` repository-relative with `/`, `sha256` as `sha256File`); a text that does not parse as an
   object whose `missing` is a list of strings throws `Error('an unreadable closure exists: <path>')`, and a record
   whose `activation.sha256` is not `activationSha256` throws `Error('the closure belongs to another activation:
   <path>')`. The closure of this step's expectation (`closure`, `closureSha256`), the `selection` prerequisite (step 2)
   and `verdict-input`'s `closureRef` (step 3) are read through it, with `activationSha256` the `sha256File` of the
   activation record; a throw refuses the command (`<command>: <message>`, exit 1, nothing written) or blocks the
   prerequisite (`blocked (selection: <message>)`).
2. **`resolveComparators(template, selection, expectation, { readFile })`** (pure export) and **`manifest.mjs
   resolve-comparators --selection <receipt> --activation <record> --out <plan> --label frozen --source-label <SL>`**:
   - the template's `task` other than `V4-S4C`: `not a V4-S4C template`; its `activationSha256` other than the
     activation record's SHA-256: `the template belongs to another activation`;
   - `proofCheck(selection, expectation, readFile)` not `pass`: `the selection is not final (<reasons>)` (an interim
     report is never a selection);
   - per template cell, `shipped = selection.selection.cells[cell]?.shipped` (the envelope root, T09e): `fr-frozen`
     resolves to `fr-frozen-uncapped`, `fr-frozen-none` to `fr-frozen-none-uncapped`, anything else: `no shipped arm
     for <cell>`;
   - each refusal: stderr `resolve-comparators: <reason>`, exit 1, nothing written. Else the plan `V4-S4C` =
     `planOf({ task: 'V4-S4C', generatedBy: 'manifest.mjs resolve-comparators', runnable: true, blockedBy: [],
     prerequisites: <the resolved variants; { type: 'file', path: <selection> }; { type: 'selection', path:
     <selection>, activation: <record> }>, steps })`, steps `prerequisites`; `firewall-snapshot`; `trees` (`build
     <the resolved variants>`); per cell `rowStep` of `{ task: 'V4-S4C', arm: <resolved>, variant: <resolved>, cell,
     from, to, rows, shard: <the template's>, rowLimitS: 260 }` (state `V4-S4C\<resolved>\<shard>\state.json`);
     `publish-<resolved>` per resolved arm; `verdict-input` (`tools\ig-proto\manifest.mjs verdict-input --purpose final
     --activation <record> --selection <selection> --out tools\ig-proto\plans\verdicts\V4-S4F.verdict-manifest.json`);
     `verdicts` (`tools\ig-proto\verdicts.mjs --manifest tools\ig-proto\plans\verdicts\V4-S4F.verdict-manifest.json`);
     `firewall-check`. It refuses to overwrite a file without its own `generatedBy`.
   - `checkPrerequisites` (T11c) gains the type `selection` `{ type: 'selection', path, activation }`: it rebuilds the
     expectation of step 1 from the records and passes when `proofCheck` passes, else `blocked (selection: <reasons>)`.
3. **`verdictInput(purpose, { activation, activationRef, closureRef, selectionRef, freeze, expansion, published,
   comparatorPlan })`** (pure export) and **`manifest.mjs verdict-input --purpose <selection | final> --activation
   <record> [--selection <receipt>] --out <path> --label frozen --source-label <SL>`**: T09a's schema with `task`
   `V4-S4` (selection) or `V4-S4F` (final); `label` `frozen`; `purpose`; `quantity` 10; `capMs` and `responseBoundMs`
   120,000; `resampleSeed` 20261116; `resamples` 10,000; `validationReps` 20 to 39; `masterReps` 20 to 24;
   `collection: { activation: activationRef, closure: closureRef }` (each `{ path, sha256 }`, the closure `null` when
   there is none); `selection` (final only): `selectionRef`; `arms`: every arm of the activation's groups (and, for
   `final`, every resolved comparator arm) with `id` (the arm's name, as in step 1; the classes, controls, masters,
   `p5` and `deadlineProjection` name arms by it, T09a's schema), `task`, `arm`, `variant`, `treeId` (its runs
   files' `meta.trees`) and
   `files: [{ path, sha256 }]` (every `*.runs.json` of `docs/improve-generating/evidence/frozen/<task>/<arm>/`,
   `sha256File`); `classes` from the freeze file; `failingCells` (T11a's `failingNightmare`); `controls` (`{ cell,
   today: 'log-link' }` per control cell); `masters` (`{ cell, today: 'log-link', after: 'fr-frozen' }` per Master
   cell); `hell1` (the validated boards and the activated conditional boards); `p5`: `selection` `[]`; `final` one
   entry per cell of the comparator plan, `{ cell, bounded: <the shipped twin>, uncapped: <its comparator>, reps:
   [from, ..., to] }`; `deadlineProjection` `{ arms: ['fr-frozen', 'fr-frozen-none'], reserves: [0.3, 0.4, 0.5],
   deadlineMs: 115000 }`; `prerequisites`: `stage1` `{ binding:
   'docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json', current: [] }`, `parity` `[{ binding:
   'docs/improve-generating/evidence/frozen/V4-S4P/parity-<arm>.accepted.json', current: [<arm>] }` for the four
   stage-4 arms, then `{ binding: 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current:
   ['v4'] }]`, `liveDeadline` `{ binding: 'docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json',
   current: ['fr-frozen', 'fr-frozen-none'] }`. A declared arm without a published file throws `verdict-input: not
   published <arm>`; `final` without `--selection` exits 1; nothing is written then.
4. **Self-test** cases appended to `--items` (Tests table); **README.md**: T11a's section gains the resolution, its
   refusals and the two manifests.
5. **`activate` checks the freeze file's classes** (fix round after the report; ruling of 2026-11-17 on QUESTION 1:
   its default (a) stands, so every comparator cell needs a class, and a class cell that stage 4 does not measure would
   leave its class inconclusive, T09e): in `activateCommand` (T11e), once the record and the plans are built and before
   anything is written, the freeze file at `paths.freeze` is parsed with `readFreeze`'s shape check (`<path> is not a
   freeze file: ...` refuses) and its class cells are compared with the cells of the record's `comparatorCells`. It
   refuses (stderr `manifest: the freeze file's classes do not match the comparator cells of the collection (<parts>)`,
   exit 1, nothing written) with `<parts>` joined by `; `, in this order and only when not empty: `not in a class
   <cells>` (comparator cells of no class, in the record's order), `in more than one class <cells>` (in the record's
   order; a cell listed twice in one class counts too, as T09e refuses such a manifest), `not measured <cells>` (class cells that are no comparator cell, sorted), each list joined by `, `. T11e's
   cases write a freeze file whose classes name the comparator cells of the activation each case makes; the README's
   activation section gains the rule.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure, with temporary files under `artifactDir('selftest',
'resolve')`. `A` = a T11e activation over the default expansion with no conditional board and no optional item; `S`
= a class-selection receipt built with T09e's `classSelection` over synthetic published rows of every declared row,
shipping `fr-frozen` on `14x14-nightmare` and `fr-frozen-none` on `26x26-hell-1`; `X` = `selectionExpectation` from
the same records; A's template = `activationPlans(<the expansion>, A, stepPrice, { activationSha256 }).template`
(T11e) with `activationSha256` the `sha256File` of A written to a temporary file.

| Case name | Input | Expected |
|---|---|---|
| `resolve: comparators from a final selection` | `resolveComparators(<A's template>, S, X)` | the row steps of `14x14-nightmare` and `26x26-hell-1` use `--arm fr-frozen-uncapped --variant fr-frozen-uncapped --shard val-14x14-nightmare` and `--arm fr-frozen-none-uncapped ... --shard val-26x26-hell-1`; states `V4-S4C\fr-frozen-uncapped\val-14x14-nightmare\state.json` and `V4-S4C\fr-frozen-none-uncapped\val-26x26-hell-1\state.json`; no `node` contains `<` or `shipped-uncapped` |
| `resolve: an interim selection is refused` | (a) S with one declared row missing and no closure; (b) S bound to another `fr-frozen` tree id than the runs files'; (c) S without `26x26-hell-1` in `selection.cells` | (a) and (b) `the selection is not final (...)`; (c) `no shipped arm for 26x26-hell-1`; nothing written |
| `resolve: a closed collection resolves` | a closure listing the missing row of (a), S built with that closure | `pass`; the plan is written; `X.coverage.expected` lacks the closed row and `X.fields.collection.missing` lists it |
| `resolve: the template belongs to its activation` | A's template with `activationSha256` changed; T11c's `V4-S4X.template.json` | `the template belongs to another activation`; `not a V4-S4C template` |
| `verdict input: selection and final` | `verdictInput('selection', ...)` and `verdictInput('final', ...)` over A, S and the plan of case 1 | selection: `purpose` `selection`, `p5` `[]`, no `selection` field; final: `selection.sha256` S's, `p5` `[{ cell: '14x14-nightmare', bounded: 'fr-frozen', uncapped: 'fr-frozen-uncapped', reps: [20, ..., 39] }, ...]` with one entry per comparator cell; both: `prerequisites.stage1.current` `[]`, the P-0 parity entry with `current: ['v4']`, `arms[].id` equal to `arms[].arm`, `arms[].files[].sha256` equal to the files' |
| `verdict input: not published` | the final input with one comparator arm's runs file absent | throws `verdict-input: not published <arm>` |
| `closure: beside its activation` | `closureOf` on a temporary folder holding A: (a) no `closure.json`; (b) the closure that T11e's `closeCommand` writes there for A; (c) that closure with `activation.sha256` changed; (d) the text `{` | (a) `null`; (b) `ref.sha256` the file's `sha256File` and `record.missing` its rows; (c) throws `the closure belongs to another activation`; (d) throws `an unreadable closure exists` |
| `activate: the freeze names exactly the comparator cells` | T11e's world, the pilot of `24x24-hell-1` activating it: (a) a freeze file whose classes name the 17 comparator cells of the initial collection only; (b) one naming those, `24x24-hell-1` and `14x14-hell-1`; (c) one naming the record's 18 comparator cells with `14x14-nightmare` in two classes; (d) one naming the 18 once each | (a) to (c) return 1, stderr `manifest: the freeze file's classes do not match the comparator cells of the collection (not in a class 24x24-hell-1)`, `(not measured 14x14-hell-1)` and `(in more than one class 14x14-nightmare)`, nothing written; (d) returns 0 and writes the record, the plan and the template |

## Documentation

`tools/ig-proto/README.md` (step 4).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11f` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11f --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a refusal rule or the content of a verdict manifest.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11f-B01 | The comparator is chosen only from a final, bound selection of the same collection | cases 1 to 4 | self-test output |
| T11f-B02 | The final verdict declares every expected P5 pair and the selection it rests on; the selection manifest cannot admit | case 5 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11f-T01 | The verdict manifests read only real, hashed records | cases 5 and 6 | self-test output |
| T11f-T02 | Nothing else changed; formats | guards; `npm run check` | command output |
| T11f-T03 | A collection's closure is read only beside its own activation record, and a closure of another activation or an unreadable one refuses | case 7 | self-test output |
| T11f-T04 | An activation is written only over a freeze file whose classes name exactly its comparator cells, each in one class | case 8 | self-test output |

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

# T08b: The freeze's constants and checks (`freeze.mjs check`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.1, §4.2 (`freeze.json`; "The encoding checks the file against T11e's pure `activation` on the published pilots (both conditional boards) before writing it"), §4.3 (Runtime classes: "a pure check proves, for every comparator cell, that the runtime `W` of `fr-frozen` and `fr-frozen-none` equals its verdict class's value in 4.1"), §6 T2, §8.2 T08; N-V4-03; this pack's D-P24-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T08a |
| Depends on | T08a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2 h, machine 0 min (unlocked: it builds or reuses trees and reads records; no rating) |

## Goal

The freeze record (T12b) must hold exactly the plan's classes and values, and the frozen trees must apply them. This task
writes `tools/ig-proto/freeze.mjs` with the freeze as constants and a `check` command that proves, before anything is
recorded: the classes name exactly the 19 comparator cells of the initial collection, each once; every cell falls in
its class by the bounds; the runtime `W_screen` of both screen arms equals the class value; the trees' parameters are
the freeze's; the twins differ only as the matrix declares; the prior file is reproduced.

## Authority and fixed points

- Plan §4.2's `freeze.json` gives the classes (ids, cells in this order, `screen` `fr-frozen`, `noScreen`
  `fr-frozen-none`), the bounds, the table ids and the values; D-P24-08: `freeze.mjs` holds them as constants equal to
  §4.1 and §4.2.
- The comparator cells come from T11e's pure `activation(expansion, { pilots, approvedOptional, epoch })`
  (`manifest.mjs:1680`) over `expandMatrix(matrixData(), { controls: controlsFrom(mp12b1Report,
  data.cells.failingNightmare) })` with the published pilots (`readPilots`, `manifest.mjs:1863`, of
  `docs/improve-generating/evidence/frozen/V4-S2/fr-base/`), exactly as `activateCommand` builds them
  (`manifest.mjs:1993-2003`); the comparison is `activate`'s own `freezeMismatch` (`manifest.mjs:2265`). The pack
  author's read-only check (`docs/improve-generating-stages-2-4/evidence/sa-opus/s3-activation.mjs`) gives 19
  comparator cells, 80 groups, 1,120 declared rows, both conditional boards activated (24x24: 5 of 5 valid reaching
  ten; 14x14: 4 of 5).
- The runtime `W` is `classW(IG.screenClasses, levelId, area)` of the tree's `core/engine/ig-select-v4.js` (`classW`
  returns `DEDUCE.work`, no screen, for a null or unlisted class); a class value null means `DEDUCE.work`.
- The deadline's numbers relate as `setStageCapMs = round((1 - reserve) x generationStopMs)` (46000 = 0.4 x 115000),
  `generationStopMs` = `TIME.dispatchStopMs` and `responseBoundMs` = `TIME.responseMs` of the tree's `policy.js`
  (115000 and 120000).
- `readPilots` and `freezeMismatch` are made exports of `manifest.mjs` without any other change (the `export` keyword
  only); `activate` keeps using them as before.

## Scope

- Create: `tools/ig-proto/freeze.mjs`.
- Change: `tools/ig-proto/manifest.mjs`: `function readPilots(` becomes `export function readPilots(` and `function
  freezeMismatch(` becomes `export function freezeMismatch(` (nothing else).
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `itemCases` (`--items`).
- Change: `tools/ig-proto/README.md`: the subsection `### The freeze checks (T08b)`; the `## Commands` block gains the
  `freeze.mjs check` line.
- Guards: G1, G2, G3 (the four files).

## Steps

1. Create `tools/ig-proto/freeze.mjs` (`// @ts-check`; header comment: "The freeze of plan v4's stage 3 (N-V4-03;
   stages 2 to 4 pack T08b, T12a and T12b; plan 4.1 and 4.2 of docs/improve-generating-stages-2-4/plan.md): the classes,
   bounds, table ids and values as constants, the checks of the four frozen trees against them (`check`, unlocked: it
   builds or reuses trees and reads records, it rates nothing), and (T12b) the record freeze.json, written once." and the
   usage line `node tools\ig-proto\freeze.mjs check --label frozen --source-label <SL>`). Imports: `readFileSync` from
   `node:fs`; `join` from `node:path`; `pathToFileURL` from `node:url`; `isDeepStrictEqual` from `node:util`;
   `activation`, `controlsFrom`, `expandMatrix`, `freezeMismatch`, `matrixData`, `readPilots` from `./manifest.mjs`;
   `computePriorS3`, `PRIOR_S3_FILE` from `./fit-prior-s3.mjs`; `evidenceDir`, `mp12b1Report`, `parseArgs` from
   `./lib/paths.mjs`; `lf`, `sha256` from `./lib/records.mjs`; `loadCatalogue` from `./lib/sets.mjs`; `ensureTree` from
   `./lib/tree.mjs`.
2. Export these constants, exactly:

   ```js
   export const FROZEN_VARIANTS = Object.freeze(['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped']);
   const SCREEN = 'fr-frozen';
   const NO_SCREEN = 'fr-frozen-none';
   export const FREEZE_CLASSES = Object.freeze([
     { id: 'n-small', cells: ['3x29-nightmare', '10x10-nightmare', '12x12-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
     { id: 'n-mid', cells: ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
     { id: 'n-upper', cells: ['15x20-nightmare', '18x18-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
     { id: 'n-large', cells: ['18x20-nightmare', '20x20-nightmare', '20x21-nightmare', '32x15-nightmare', '22x22-nightmare', '24x24-nightmare', '26x26-nightmare'], screen: SCREEN, noScreen: NO_SCREEN },
     { id: 'hell-1', cells: ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1'], screen: SCREEN, noScreen: NO_SCREEN },
   ]);
   export const FREEZE_BOUNDS = Object.freeze({
     'n-small': ['nightmare', 1, 144], 'n-mid': ['nightmare', 196, 256], 'n-upper': ['nightmare', 257, 324],
     'n-large': ['nightmare', 360, null], 'hell-1': ['hell-1', 1, null],
   });
   export const FREEZE_TABLES = Object.freeze({ screen: 'screen-s3-v1', prior: 'prior-s3-v1', budget: 'budget-s3-v1', deadline: 'deadline-s3-v1' });
   export const FREEZE_VALUES = Object.freeze({
     W: { 'n-small': null, 'n-mid': 190000000, 'n-upper': 190000000, 'n-large': 190000000, 'hell-1': null },
     callBudget: { any: { nightmare: 10000000000, 'hell-1': 40000000000 }, require: { nightmare: 32000000000, 'hell-1': 40000000000 } },
     setAttemptsBound: 4,
     deadline: { reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000 },
     c4: false, rerate: 'rescue', rerateMax: 4, ranker: null, perSetLevels: ['hell-1'],
   });
   ```

3. Export `classOf(levelId, area)`: the id of the first `FREEZE_BOUNDS` entry `[level, lo, hi]` with `levelId ===
   level && area >= lo && (hi === null || area <= hi)`, else `null`.
4. Export `async function freezeChecks()` returning `{ checks, trees }`: `trees` maps each of `FROZEN_VARIANTS` to `{
   treeId, paramsHash }` (`(await ensureTree(id)).treeId`, `sha256(JSON.stringify(tree.params))`); `checks` is a list of
   `{ name, pass, detail }`, in this order:
   1. `classes`: the record of `activation(expansion, { pilots: readPilots(evidenceDir('frozen', 'V4-S2', 'fr-base'),
      data), approvedOptional: [], epoch })` with `data = matrixData()`, `expansion = expandMatrix(data, { controls:
      controlsFrom(mp12b1Report, data.cells.failingNightmare) })` and a placeholder epoch (`{ path: 'placeholder',
      sha256: '0'.repeat(64) }` for `data`, `freeze` and `universe`; nothing is written); pass when
      `freezeMismatch({ classes: FREEZE_CLASSES }, record.comparatorCells.map((c) => c.cell))` is empty, there are 19
      comparator cells and every `record.conditional` entry is activated; `detail` the mismatch parts or `19 comparator
      cells; conditional 24x24-hell-1 true, 14x14-hell-1 true`;
   2. `bounds`: every cell of every class has `classOf(cases[cell].levelId, cases[cell].area) === class.id`
      (`cases = loadCatalogue().cases`); `detail` the cells that do not;
   3. `runtime W`: for `fr-frozen` and `fr-frozen-none`, import `classW` from the tree's `core/engine/ig-select-v4.js`
      and `DEDUCE` from its `core/engine/policy.js` (`pathToFileURL(join(tree.root, ...))`); for each class and cell,
      `w = classW(tree.params.screenClasses, levelId, area)`; the expected value is the class's `FREEZE_VALUES.W`
      for `fr-frozen` and null for `fr-frozen-none`; null expects `w === DEDUCE.work`; `detail` `38 cells` or the
      differing `<variant> <cell> <w>`;
   4. `parameters`: `fr-frozen`'s params have `priorTable` `FREEZE_TABLES.prior`, `screenTable` `FREEZE_TABLES.screen`,
      `callBudget` deep-equal to `{ id: FREEZE_TABLES.budget, ...FREEZE_VALUES.callBudget }`, `setAttemptsBound`,
      `c4`, `rerate`, `rerateMax`, `perSetLevels` equal to `FREEZE_VALUES`'s, `liveDeadline` deep-equal to `{ id:
      FREEZE_TABLES.deadline, levels: ['nightmare', 'hell-1'], ...FREEZE_VALUES.deadline, hostMarginMs: 1000 }`;
      `setStageCapMs === Math.round((1 - reserve) * generationStopMs)`; `generationStopMs` and `responseBoundMs` equal
      `TIME.dispatchStopMs` and `TIME.responseMs` of the tree's `policy.js`; `fr-frozen-none`'s `screenTable` is
      `screen-s3-none` and its four classes are null; `detail` the first difference;
   5. `differences`: the parameter keys (without `variant`) whose values differ (`isDeepStrictEqual`) between
      `fr-frozen` and `fr-frozen-uncapped`, and between `fr-frozen-none` and `fr-frozen-none-uncapped`, are each the
      sorted `data.comparatorDifferences` (`callBudget`, `liveDeadline`, `setAttemptsBound`), with the three null in
      the uncapped twins; between `fr-frozen` and `fr-frozen-none` they are `screenClasses`, `screenTable`;
   6. `prior`: `lf(readFileSync(PRIOR_S3_FILE, 'utf8')).trimEnd() === lf(JSON.stringify(computePriorS3(), null,
      2)).trimEnd()` and `fr-frozen`'s `params.prior` deep-equals `computePriorS3().cells`.
5. `main(argv)`: the command `check` with values `label`, `source-label`: runs `freezeChecks()`, prints one line per
   check, `freeze: <name> pass (<detail>)` or `freeze: <name> FAIL (<detail>)`, then `freeze: check pass (6 checks;
   fr-frozen <first 12 hex of the tree id>, fr-frozen-none <...>, fr-frozen-uncapped <...>, fr-frozen-none-uncapped
   <...>)` and returns 0, or `freeze: check failed (<n> of 6)` and returns 1; any other command prints `usage: freeze.mjs
   check --label frozen --source-label <SL>` and returns 1 (T12b adds `write`). Guard with `if (process.argv[1] &&
   import.meta.url === pathToFileURL(process.argv[1]).href)` like `fit-prior.mjs`.
6. In `manifest.mjs`, add `export` to `readPilots` (line 1863 at the base) and to `freezeMismatch` (line 2265).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `freeze: classes, bounds and values` | `classOf` of (`nightmare`, 87), (`nightmare`, 144), (`nightmare`, 145), (`nightmare`, 195), (`nightmare`, 196), (`nightmare`, 256), (`nightmare`, 257), (`nightmare`, 324), (`nightmare`, 325), (`nightmare`, 359), (`nightmare`, 360), (`nightmare`, 676), (`hell-1`, 196), (`hard`, 100); `FREEZE_CLASSES` | `n-small`, `n-small`, null, null, `n-mid`, `n-mid`, `n-upper`, `n-upper`, null, null, `n-large`, `n-large`, `hell-1`, null; 19 cells, all distinct; every class `screen` `fr-frozen`, `noScreen` `fr-frozen-none`; every cell's `classOf` of its catalogue level and area is its class; `FREEZE_VALUES.W` has the five class ids |

The full checks run as the command `freeze.mjs check` (unlocked) in the gates.

## Documentation

README: the subsection `### The freeze checks (T08b)`: the constants (one table: class, cells, bounds, `W`), the six
checks and what each proves, the command line; `## Commands` gains `node tools\ig-proto\freeze.mjs check --label frozen
--source-label "frozen 3fc65f4"`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T08b --label frozen` | repository root, first | `firewall: snapshot of S24-T08b` | 1 min |
| `node tools\ig-proto\freeze.mjs check --label frozen --source-label "frozen 3fc65f4"` | repository root (unlocked) | six `freeze: <name> pass` lines; `freeze: check pass (6 checks; ...)` with the four tree ids of T08a's NOTE | 5 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T08b --horizon-s 285` | repository root (unlocked) | every case `PASS`, `freeze: classes, bounds and values` among them | 5 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"` | repository root | `prerequisites: blocked (missing file docs/improve-generating/evidence/frozen/V4-S3/freeze.json; missing file tools/ig-proto/live-deadline.mjs)`, exit 1 (the variant `fr-frozen` is no longer missing; T09a and T12b add the two files) | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T08b --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the four files | 1 min |

## Stop points and questions

- Stop and report when a check fails: the constants are the plan's and the trees T08a's; a failing check means a wrong
  variant, a moved record or a plan error, and is a `QUESTION:` with the check's detail (never a changed constant).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08b-B01 | Before the freeze is recorded, one command proves that its classes cover the measured cells exactly and that the trees apply its values | `freeze.mjs check` | its output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T08b-T01 | The six checks pass on T08a's trees | the command | the lines |
| T08b-T02 | `classOf` and the constants as the Tests table says | `--items` | the PASS line |
| T08b-T03 | `manifest.mjs` changed only by two `export` keywords; `npm run check`, the firewall and G1 to G3 pass | `git diff tools/ig-proto/manifest.mjs`; the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the six check lines); each AC row with its
evidence; the questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-24 05:43 +07:00 (dispatch, base `80581ca`); 2026-11-24 05:54 +07:00 (accepted); the developer reported 05:43:53-05:47:02 |
| Waiting for rulings | about 5 min (the pack author's review) |
| Agent id, model | `368cffd0-3cab-436b-b978-49d612c7ad44`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 30 calls; 2,688,849 input, 21,324 output, 2,594,965 cache-read tokens |
| AI credits | 70.74 (developer only) |
| Questions and rulings | no QUESTION; the six open details accepted by SA-Opus as ruling R-P24-12 (the 19-cell and activation rule is step 4.1's; unknown flags are refused by `parseArgs` for every command); two README phrases routed to T12b |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `freeze.mjs check`: six checks pass (classes 19 comparator cells, conditional 24x24-hell-1 and 14x14-hell-1 activated; bounds; runtime W 38 cells; parameters prior-s3-v1, screen-s3-v1, budget-s3-v1, deadline-s3-v1; differences; prior 27 cells; trees b3e530b1bca5, fa903f397ef6, 96ef38e2fd6d, e31d829dee8d); `self-test --items --task S24-T08b-orch`: 225 passed, 0 failed (35.3 s); `check-prerequisites --plan V4-LIVE`: blocked (missing freeze.json and live-deadline.mjs), as expected; `manifest.mjs` diff: the two `export` keywords only; `firewall check --task S24-T08b`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the four Scope files |
| Commit | this task's commit |
| Issues and named items | none |

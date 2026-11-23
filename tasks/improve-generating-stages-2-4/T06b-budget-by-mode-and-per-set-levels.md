# T06b: P5's call budget by uniqueness mode and the per-set prior's level filter (`p5-mode`, `ps-levels`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.1 (P5 call budget by mode; per-set prior on Hell 1 only), §4.3 ("frozen-family-only edits: the budget lookup by uniqueness mode ... and the per-set prior's level filter"), §4.4 (Lookup), §8.2 T06; D-S24-11, D-S24-13, D-S24-23, D-S24-25; this pack's D-P24-01 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T06a |
| Depends on | T06a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min of benchmark (one locked verification of a few seconds) |

## Goal

The freeze gives P5 a different budget per uniqueness mode (`any`: Nightmare 10 G, Hell 1 40 G; `require`: Nightmare
32 G, Hell 1 40 G) and turns the per-set prior on for Hell 1 only. Today the prototype reads one budget per level
(`callBudget { <level>: units, default }`) and the per-set prior on every level. This task adds the two frozen-family
edits as two small variants, each inert without its parameter, so that T08a can compose them into the four frozen
variants without touching the `v4` chain.

## Authority and fixed points

- Plan §4.4: "The call's budget is read from `callBudget[mode][level]`, `mode` being the call's uniqueness; an absent
  entry is no budget. The check stays where it is: before every rating and every uniqueness count, `spent >= budget`
  ends the call (`ig-select-v4.js:422-426`)". The parameter's shape (D-P24-02): `{ "id": "budget-s3-v1", "any": {
  "nightmare": 10000000000, "hell-1": 40000000000 }, "require": { "nightmare": 32000000000, "hell-1": 40000000000 } }`.
- The search reads its budget as `ctx.igBudget ?? callBudgetOf(IG.callBudget, target)` (copy-only file
  `tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:404`); an edit cannot target that copy-only file
  (`lib/tree.mjs` `planTree` applies edits to the copied sources only; check-list §3.1), so the budget by mode is given
  to the search through the call's `igBudget`, set in the copy's dispatch `selectClues` of `core/engine/clues.js`
  (D-P24-01). `callBudgetOf` is unchanged: with the mode-shaped table and no `igBudget` it would find no level key and
  return `Infinity`, which is why the dispatch must set `igBudget` whenever the table has the mode shape.
- Plan §4.1: per-set prior "on, Hell 1 only" (`perSetLevels: ['hell-1']`). The per-set prior is `v4-ps`'s
  (`variants/v4-ps.json` edits `ps-5` to `ps-7`): `igPriorOf` returns `{}` or `{ igPrior: wc }`, spread into the
  `puzzleCandidate` payload; with `{}` the candidate falls back to the table prior (`priorCount`,
  `ig-select-v4.js:199-205`).
- Inert without the parameter (plan §4.3: "each inert under a null parameter"): with `IG.callBudget` undefined or null,
  or of the level-keyed shape of `v4-p5` (no `any` and no `require` key), the context is unchanged; with
  `IG.perSetLevels` undefined or null, the per-set prior applies on every level as in `v4-ps`.
- No file of the `v4` chain changes: `check-binding --current v4` stays `pass` (plan §4.3).

## Scope

- Create: `tools/ig-proto/variants/p5-mode.json`, `tools/ig-proto/variants/ps-levels.json`.
- Change: `tools/ig-proto/self-test.mjs`: three cases appended to `v4Cases` (`--v4`).
- Change: `tools/ig-proto/README.md`: the subsection `### The budget by mode and the per-set levels (T06b)` in the
  section `## The frozen family (stages 2 to 4 pack)` (T06a).
- Do not change: every other variant (G2), the copy-only files under `tools/ig-proto/variants/files/`, `lib/tree.mjs`.
  Guards: G1, G2, G3 (G3 lists the four files of the Scope).

## Steps

1. Create `tools/ig-proto/variants/p5-mode.json` exactly (two-space indent; the `find` text was checked to occur once
   in the built trees `v4`, `fr-p5`, `fr-ps` and `v4-ps-link`, and `clues.js` imports nothing from `ig-params.js` in
   them):

   ```json
   {
     "id": "p5-mode",
     "extends": ["v4"],
     "description": "Frozen family (stages 2 to 4 pack T06b, plan 4.4): P5's call budget by uniqueness mode and level, IG.callBudget = { id, any: { <level>: units }, require: { <level>: units } }, given to the copy's search as the call's igBudget; inert without that parameter.",
     "edits": [
       {
         "id": "fz-1",
         "file": "core/engine/clues.js",
         "find": "    return selectCluesV4(ctx);\n",
         "replace": "    return selectCluesV4(igModeBudget(ctx));\n"
       },
       {
         "id": "fz-2",
         "file": "core/engine/clues.js",
         "append": "\n// ig-proto, variant p5-mode (stages 2 to 4 pack T06b, plan 4.4): P5's call budget by uniqueness mode and level.\n// IG.callBudget = { id, any: { <level id>: units }, require: { <level id>: units } }; an absent or non-positive entry\n// is no budget. Without such a table (undefined, null, or the level-keyed shape of v4-p5) the context is unchanged.\nimport { IG as IG_FZ } from './ig-params.js';\n\n/**\n * @param {any} ctx The SelectContext of a gen-v4 call.\n * @param {any} [table] IG.callBudget by default.\n * @returns {any} ctx itself, or a copy whose igBudget is the call's budget in units (Infinity for none).\n */\nexport function igModeBudget(ctx, table = IG_FZ.callBudget) {\n  if (ctx.igBudget !== undefined || table === undefined || table === null\n    || (table.any === undefined && table.require === undefined)) {\n    return ctx;\n  }\n  const v = table[ctx.uniqueness]?.[ctx.target.id];\n  return { ...ctx, igBudget: typeof v === 'number' && v > 0 ? v : Infinity };\n}\n"
       }
     ],
     "files": [],
     "params": {}
   }
   ```

2. Create `tools/ig-proto/variants/ps-levels.json` exactly (the `find` text is `ps-5`'s replacement; it occurs once in
   the built trees `fr-ps` and `v4-ps-link`):

   ```json
   {
     "id": "ps-levels",
     "extends": ["v4-ps"],
     "description": "Frozen family (stages 2 to 4 pack T06b, plan 4.1): the per-set prior of v4-ps only on the levels of IG.perSetLevels; on every level without that parameter.",
     "edits": [
       {
         "id": "fz-3",
         "file": "core/browser/generation-client.js",
         "find": "    const igPrior = igPriorOf(request.calibration, levelId, uniqueness);\n",
         "replace": "    const igPrior = igPerSetLevel(levelId) ? igPriorOf(request.calibration, levelId, uniqueness) : {};\n"
       },
       {
         "id": "fz-4",
         "file": "core/browser/generation-client.js",
         "append": "\n// ig-proto, variant ps-levels (stages 2 to 4 pack T06b, plan 4.1): the per-set prior only on the levels listed in\n// IG.perSetLevels (the freeze: ['hell-1']); without the parameter (undefined or null), on every level as in v4-ps.\nimport { IG as IG_PSL } from '../engine/ig-params.js';\n\n/**\n * @param {string} levelId\n * @param {any} [levels] IG.perSetLevels by default.\n * @returns {boolean}\n */\nexport function igPerSetLevel(levelId, levels = IG_PSL.perSetLevels) {\n  return levels === undefined || levels === null || (Array.isArray(levels) && levels.includes(levelId));\n}\n"
       }
     ],
     "files": [],
     "params": {}
   }
   ```

3. Build and check: `node tools\ig-proto\lib\tree.mjs build p5-mode ps-levels --label frozen --source-label "frozen
   3fc65f4"` prints `p5-mode <treeId> <copyDigest> built` and `ps-levels <treeId> <copyDigest> built`;
   `check-edits --all` prints `ok p5-mode: 42 edits match` (the 40 of `v4` and `fz-1`, `fz-2`) and `ok ps-levels: 49
   edits match` (the 47 of `v4-ps` and `fz-3`, `fz-4`), and every other variant's line as before.
4. Append the three cases of the Tests table to `v4Cases` (at the end, after T03d's memory case), using
   the helpers that exist: `engine(variant)` (`self-test.mjs:87`), `treeModule(tree, name)` (`:8715`),
   `browserModule(tree, name)` (`:8872`), `v4Call(name, spec)` (`:8647`), `synthetic(score)` (`:8172`), `same`,
   `assert`.

## Tests

All three are appended to `v4Cases` (`--v4`, locked verification).

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` | `fz: budget by uniqueness mode (rule)` | `const { igModeBudget } = await treeModule(await engine('p5-mode'), 'clues')`; `T = { id: 'budget-test', any: { nightmare: 10, 'hell-1': 40 }, require: { nightmare: 32, 'hell-1': 0 } }`; `c(u, id) = { uniqueness: u, target: { id, min: 53, max: 77 } }` | `igModeBudget(c('any', 'nightmare'), T).igBudget` 10; `c('any', 'hell-1')` 40; `c('require', 'nightmare')` 32; `c('require', 'hell-1')` `Infinity` (0 is no budget); `c('any', 'st-band')` `Infinity` (absent); for `x = { ...c('any', 'nightmare'), igBudget: 5 }`, `igModeBudget(x, T) === x`; for `y = c('any', 'nightmare')`: `igModeBudget(y, null) === y`, `igModeBudget(y, { default: 2000000000 }) === y`, `igModeBudget(y) === y` (the `p5-mode` tree has no `callBudget`), and after `igModeBudget(y, T)` the object `y` still has no `igBudget` key (not mutated) |
| `self-test.mjs` | `fz: p5-mode is inert without its parameter` | `spec = { prior: null, screen: () => 'cap', canon: (k) => synthetic(100 - 10 * k) }` (the spec of `p5: call budget stops deterministically`); `v4Call('fz-inert', { ...spec, extra: { igBudget: 1520000000 } })` with `variant` `'v4'` and with `variant` `'p5-mode'`; then both without `extra` | budgeted: on both trees `counts('locate')` `[7, 13]`, `end.locate.budgetStop` `{ limit: 1520000000, spent: 1520000000, overshoot: 0 }`, `result` `{ ok: false, reason: 'not-in-band' }`, and the two results deep-equal; unbudgeted: on both `counts('rescue')` `[13, 7]`, no `budgetStop`, and the two results deep-equal |
| `self-test.mjs` | `fz: per-set prior levels (rule)` | `const { igPerSetLevel } = await browserModule(await engine('ps-levels'), 'generation-client')`; the tree's `core/browser/generation-client.js` text | `igPerSetLevel('hell-1', ['hell-1'])` true; `('nightmare', ['hell-1'])` false; `('hell-1', [])` false; `('hell-1', null)` true; `('nightmare', 'hell-1')` false (not an array); `igPerSetLevel('nightmare')` true (the `ps-levels` tree has no `perSetLevels`); the text holds `const igPrior = igPerSetLevel(levelId) ? igPriorOf(request.calibration, levelId, uniqueness) : {};` once and `const igPrior = igPriorOf(` no more |

The budget and the per-set filter on the real frozen parameters (both modes, both levels, the uncapped twins, the
payloads) are T08c's cases.

## Documentation

README, subsection `### The budget by mode and the per-set levels (T06b)` of `## The frozen family (stages 2 to 4
pack)`: the two variants, their edits (`fz-1` to `fz-4`), the parameter shapes (`callBudget { id, any: {...}, require:
{...} }`, `perSetLevels: [...]`), the rule "an absent or non-positive entry is no budget; a seam `igBudget` wins", that
both are inert without their parameter, and that they are composed only by the frozen variants (T08a).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T06b --label frozen` | repository root, first | `firewall: snapshot of S24-T06b` | 1 min |
| `node tools\ig-proto\lib\tree.mjs build p5-mode ps-levels --label frozen --source-label "frozen 3fc65f4"` | repository root | two `built` lines | 3 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error; `ok p5-mode: 42 edits match`; `ok ps-levels: 49 edits match` | 3 min |
| check-list §3.1's selection block with `$Id = 'S24-T06b'`, `$GroupArgs = @('--v4')`, `$Locked = $true`, `$Required = @('fz: budget by uniqueness mode (rule)', 'fz: p5-mode is inert without its parameter', 'fz: per-set prior levels (rule)')` | PowerShell 7 at the repository root | three `PASS` lines with the names above; `self-test: 3 passed, 0 failed`; `IG S24-T06b cases exit=0`; `cases: 3 passed, as required` | 5 min |
| `node tools\ig-proto\v4-check.mjs check-binding --binding docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --current v4 --label frozen --source-label "frozen 3fc65f4"` | repository root | `binding: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T06b --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the four files | 1 min |

## Stop points and questions

- Stop and report when an anchor of `fz-1` or `fz-3` is not found once (`check-edits` prints `edit fz-<n> (...): anchor
  found <n> times`): the anchors are the built trees' text at the base; a different text is a `QUESTION:`.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06b-B01 | The frozen variants can give `require` calls their own finite budget and keep the per-set prior to Hell 1, without changing any arm measured so far | the rule cases; `check-binding --current v4`; the inert case | the PASS lines; `binding: pass` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T06b-T01 | `p5-mode` and `ps-levels` build; their four edits match once | `build`; `check-edits` | the lines |
| T06b-T02 | `igModeBudget` and `igPerSetLevel` give the Tests table's values; `p5-mode` without its parameter gives the `v4` tree's results | the three cases | the PASS lines |
| T06b-T03 | The `v4` chain did not move; `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the indices of the three cases and the
helper's seconds); each AC row with its evidence; the questions and rulings; the deviations; and the named items for
later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-24 05:17 +07:00 (dispatch, base `6085c33`); 2026-11-24 05:21 +07:00 (accepted); the developer reported 05:17:12-05:18:54 |
| Waiting for rulings | none |
| Agent id, model | `73aa96a0-7433-4c59-8b1f-f3461bf56846`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 16 calls; 1,022,735 input, 11,715 output, 970,668 cache-read tokens |
| AI credits | 34.44 (developer only) |
| Questions and rulings | none. The developer's notes (case 38 loops over both trees and also asserts no `budgetStop` unbudgeted; case 39 reads the tree's client through `tree.e.root` as `treeModule` does; the README wording) are test and wording details that change no behaviour |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `build p5-mode ps-levels`: both reused (`e17b6153...`, `b51ed8b4...`); `check-edits --all`: `ok p5-mode: 42`, `ok ps-levels: 49`, `ok v4: 40`, `ok v4-ps: 47`, `ok v4-ps-link: 64 edits match`; the locked selection block (`--v4`, `S24-T06b-orch`): the three `fz:` cases PASS, `IG ... exit=0 seconds=0.855 quiet=15`, `cases: 3 passed, as required`; P-0 binding pass; `firewall check --task S24-T06b`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the four Scope files |
| Commit | this task's commit |
| Issues and named items | T08a composes `p5-mode` and `ps-levels` into the frozen variants; T08c tests them on the real frozen parameters |

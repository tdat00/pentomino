# T02a: The plan writer (`manifest.mjs write-plan`) and the plan `V4-S2B`

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.6 (plans to add; T11c's exported functions; never `compile`), §4.7 (seeds), §8.2 T02; D-S24-16, D-S24-26; pack decision D-P24-03 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T01b |
| Depends on | T01b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (pure plan building and a dry run, unlocked) |

## Goal

The pack needs three new plans (`V4-S2B`, `V4-P7`, `V4-S3P`) built exactly as T11c's compiled plans are, priced by
T11g's rules, written once and never by `manifest.mjs compile` (which would rewrite `V4-S2` and `V4-LIVE`). This task
adds a `write-plan` command with one builder per plan and writes the first plan, `V4-S2B`: the control pilot of the
eight Nightmare controls that stage 2 did not pilot, on the arm `fr-none`, reps 0 to 4 (owner's approval D-S24-26).

## Authority and fixed points

- Plan §4.6: `V4-S2B` = "`fr-none` rows on 3x29, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22 and 24x24 Nightmare, reps 0-4
  (40 rows, row limit 260 s); `publish-fr-none`", prerequisites "the variant `fr-none`; its accepted P-1 binding
  `V4-S2P/parity-fr-none.accepted.json` (`current: ['fr-none']`)", formal price 22.59 projected / 28.24 guard counted
  minutes. The builder must reproduce exactly the figures of `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-plans.mjs`:
  `allocationMinutes` 23 and `planGuardS` 1,694.624 s (28.243734 min).
- Fixed: `manifest.mjs compile` is never run (N-V4-02); `plans/V4-S2.json`, `plans/V4-LIVE.json`,
  `plans/V4-S4.universe.json`, `plans/V4-S4X.template.json` and every file of `plans/items/` existing at `57ef5cf` stay
  byte for byte (G2). The plan's steps follow T11c's rules (an argv array, every locked step `repeatUntilDone` with its
  state and `minHorizonS`; prices by `stepPrice`).
- Pack decision D-P24-03: `generatedBy` `manifest.mjs write-plan`; a plan file is written once.

## Scope

- Change: `tools/ig-proto/manifest.mjs`: `export` before the five step builders `gateStep` (line 1123),
  `firewallSnapshotStep` (1129), `firewallCheckStep` (1134), `treesStep` (1139), `publishStep` (1144); a new section
  `// ---- Written plans (stages 2 to 4 pack, T02a) ----` placed after `writeCompiled` (line 1509-1536) with the constant
  `WRITE_PLAN_GENERATED_BY`, the function `writtenPlan` and the command `writePlanCommand`; `main` (line 3744): the new
  command `write-plan` in `commands` and in the refusal text; the usage comment at the top of the file (the command
  list) gains the `write-plan` line.
- Create: `tools/ig-proto/plans/V4-S2B.json` (written by the command, never by hand).
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `itemCases` (`--items`), and one assertion of the existing
  case `activate: the inputs are checked`, whose unknown-command text gains `write-plan` (step 4; ruling R-P24-02).
- Change: `tools/ig-proto/README.md`: a new subsection `### Written plans (stages 2 to 4 pack)` after the section
  `### The manifest for the owner (V4-T11g)` (line 2530).
- Do not change: every other file. Guards: G1, G2, G3; G3 lists only `tools/ig-proto/manifest.mjs`,
  `tools/ig-proto/self-test.mjs`, `tools/ig-proto/README.md` and `tools/ig-proto/plans/V4-S2B.json`.

## Steps

1. Add `export` to the five `const` step builders named in the Scope; nothing else in them changes.
2. Add the section (after `writeCompiled`):

   ```js
   // ---- Written plans (stages 2 to 4 pack, T02a; D-P24-03) ----
   // The plans of the stages 2 to 4 pack are built with T11c's functions and written once by `write-plan`; `compile` is never run
   // again (N-V4-02). T05b adds `V4-P7` and T10 adds `V4-S3P` to `writtenPlan`.

   export const WRITE_PLAN_GENERATED_BY = 'manifest.mjs write-plan';
   /** The eight Nightmare controls that stage 2 did not pilot, in the plan's order (plan 4.6). */
   const S2B_CELLS = Object.freeze(['3x29-nightmare', '18x18-nightmare', '18x20-nightmare', '20x20-nightmare', '20x21-nightmare',
     '32x15-nightmare', '22x22-nightmare', '24x24-nightmare']);
   const PARITY_FR_NONE = `${EVIDENCE}/V4-S2P/parity-fr-none.accepted.json`;

   /**
    * The plan `id` as `write-plan` writes it, with the item manifests it names (file name under `plans/items/` to content).
    * @param {string} id `V4-S2B` (T02a; T05b adds `V4-P7`, T10 adds `V4-S3P`).
    * @param {{ priceOf?: PriceOf, rowSOf?: (group: Group) => number, durations?: Record<string, number> }} [o] `rowSOf`: the
    *   projected seconds of one row of a group, by default `projectedRowS` of the cell's MP12b1 median (`refS`) and the stage-1
    *   factor (`factor`), as `compile` takes them.
    * @returns {{ plan: ReturnType<typeof planOf>, itemManifests: Record<string, any> }}
    */
   export function writtenPlan(id, { priceOf = stepPrice, rowSOf, durations } = {}) { ... }
   ```

   The body: `const rowS = rowSOf ?? ((g) => projectedRowS({ refS: refS(g.cell), factor: factor(), rowLimitS: g.rowLimitS }))`
   (compute `factor()` once); `durations` defaults to `durationsFromLogs()` when the plan needs it (not for `V4-S2B`).
   For `id === 'V4-S2B'`:
   - `prerequisites = [{ type: 'accepted', path: PARITY_FR_NONE, current: ['fr-none'] }]`;
   - `rows = S2B_CELLS.map((cell) => rowStep({ task: 'V4-S2B', arm: 'fr-none', shard: \`pilot-${cell}\`, cell, from: 0, to: 4,
     rows: 5, rowLimitS: 260 }, priceOf, rowS({ cell, rowLimitS: 260 })))` (pass the group fields `rowStep` reads; give the
     object the JSDoc cast `/** @type {any} */` if `Group` requires more fields);
   - `plan = planOf({ task: 'V4-S2B', generatedBy: WRITE_PLAN_GENERATED_BY, runnable: true, blockedBy: [], prerequisites,
     steps: [gateStep('V4-S2B', prerequisites), firewallSnapshotStep('V4-S2B'), treesStep(['fr-none']), ...rows,
     publishStep('V4-S2B', 'fr-none', rows), firewallCheckStep('V4-S2B')] })`; `itemManifests = {}`.
   Any other id throws `manifest: unknown written plan <id>` (for example `manifest: unknown written plan V4-XX`); this
   text never changes when T05b and T10 add their plans (SA-Astra's review R19).
3. Add `export async function writePlanCommand(argv, { plansDir = join(IG_DIR, 'plans') } = {})`: parse `values: ['plan',
   'label', 'source-label']`; refusals (each `refuseCommand('write-plan', <reason>)`, exit 1, nothing written), in this
   order: `--label frozen only` when the label is not `frozen`; `needs --plan <id> (one of V4-S2B)` when it is absent
   (the usage text lists the plans `writtenPlan` knows: T05b makes it `(one of V4-S2B, V4-P7)`, T10 `(one of V4-S2B,
   V4-P7, V4-S3P)`); the builder's throw
   message for an unknown id (without the `manifest: ` prefix); `plan exists: a plan is never rewritten (<rel path>)` when
   `plans/<id>.json` exists; `item manifest exists: <rel path>` for each item manifest that exists. Then write the plan
   with `writeJson(join(plansDir, \`${id}.json\`), plan)` and each item manifest with `writeJson(join(plansDir, 'items',
   name), value)`, and print `write-plan: wrote <rel path> (<n> steps, <k> locked; allocation <a> min, optional <o> min)`
   (`<n>` all steps, `<k>` the locked ones, `<a>` `plan.allocationMinutes`, `<o>` `plan.optionalMinutes`), then one line
   `write-plan: wrote <rel path>` per item manifest; return 0.
4. In `main`, add `'write-plan': (a) => writePlanCommand(a)` to `commands` and `write-plan` to the list of the refusal
   text `unknown command ...`, at its end: `unknown command <command> (compile, check-prerequisites, activate, close,
   resolve-comparators, verdict-input, price, approval, write-plan)`. The existing case `activate: the inputs are
   checked` of `self-test.mjs` checks that text (the assertion labelled `an unknown command lists the eight`, line 6843
   at `83c78c1`): replace that one line by

   ```js
         same([unknown.code, unknown.err], [1, 'manifest: unknown command nope (compile, check-prerequisites, activate, close, resolve-comparators, verdict-input, price, approval, write-plan)\n'], 'an unknown command lists the nine');
   ```

   and change nothing else in that case; its name, by which the gates select it, stays (ruling R-P24-02).
5. Run (unlocked) `node tools\ig-proto\manifest.mjs write-plan --plan V4-S2B --label frozen --source-label "frozen 3fc65f4"`.
   Expected: `write-plan: wrote tools/ig-proto/plans/V4-S2B.json (13 steps, 8 locked; allocation 23 min, optional 0 min)`.
   A second run prints `write-plan: plan exists: a plan is never rewritten (tools/ig-proto/plans/V4-S2B.json)` on stderr
   and exits 1.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs` (`--items`) | `write-plan: V4-S2B` | `writtenPlan('V4-S2B')` (the default `rowSOf`, reading MP12b1's reports and the stage-1 factor of this machine) | `plan.task` `V4-S2B`; `generatedBy` `manifest.mjs write-plan`; `runnable` true; `prerequisites` deep-equal `[{ type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-none.accepted.json', current: ['fr-none'] }]`; step ids in order `prerequisites, firewall-snapshot, trees, rows-fr-none-pilot-3x29-nightmare, rows-fr-none-pilot-18x18-nightmare, rows-fr-none-pilot-18x20-nightmare, rows-fr-none-pilot-20x20-nightmare, rows-fr-none-pilot-20x21-nightmare, rows-fr-none-pilot-32x15-nightmare, rows-fr-none-pilot-22x22-nightmare, rows-fr-none-pilot-24x24-nightmare, publish-fr-none, firewall-check`; the `trees` node `['tools\\ig-proto\\lib\\tree.mjs', 'build', 'fr-none']`; every row step `locked` true, `repeatUntilDone` true, `minHorizonS` 272, `optional` false, its node ending `'--workers', '4', '--cases', '<cell>:0-4', '--row-limit-s', '260'` and its state `V4-S2B\\fr-none\\pilot-<cell>\\state.json`; `allocationMinutes` 23, `optionalMinutes` 0; `Math.round(planGuardS(plan) * 1000) / 1000` = 1694.624; `itemManifests` `{}` |
| same case | (refusals) | `writtenPlan('V4-XX')` | throws `manifest: unknown written plan V4-XX` |
| same case | (command, scratch folder) | `writePlanCommand(['--plan', 'V4-S2B', '--label', 'frozen', '--source-label', 'self-test'], { plansDir: <fresh folder under tests/artifacts/ig-proto/selftest/write-plan> })` twice | the first returns 0 and writes `<folder>/V4-S2B.json` whose parse deep-equals `writtenPlan('V4-S2B').plan`; the second returns 1 and leaves the file's bytes unchanged |
| same file (`--items`), existing case | `activate: the inputs are checked` (its assertion `an unknown command lists the nine`, step 4) | `m.main(['nope'])` | exit 1; stderr `manifest: unknown command nope (compile, check-prerequisites, activate, close, resolve-comparators, verdict-input, price, approval, write-plan)\n` |

## Documentation

`tools/ig-proto/README.md`, new subsection `### Written plans (stages 2 to 4 pack)`: "`manifest.mjs write-plan --plan
<id> --label frozen --source-label <SL>` writes `plans/<id>.json` (and its item manifests under `plans/items/`) once,
`generatedBy` `manifest.mjs write-plan`, from `writtenPlan(id)`, which uses T11c's `rowStep`, `parityPass`, `planOf` and
`stepPrice` and the step builders `gateStep`, `firewallSnapshotStep`, `treesStep`, `publishStep` and
`firewallCheckStep` (exported for it); an existing plan or item manifest is refused (`plan exists: a plan is never
rewritten`), and `compile` is never run again (N-V4-02). Plans: `V4-S2B` (the control pilot: `fr-none` on the eight
unpiloted Nightmare controls, reps 0 to 4, 40 rows at 260 s, prerequisite the accepted P-1 binding of `fr-none`;
allocation 23 min, guard 28.24 min)." T05b and T10 add their plans to this paragraph.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T02a --label frozen` | repository root, first | `firewall: snapshot of S24-T02a` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T02a --horizon-s 285` | repository root (unlocked) | every case `PASS`; `self-test: <n> passed, 0 failed` | 5 min |
| `node tools\ig-proto\manifest.mjs write-plan --plan V4-S2B --label frozen --source-label "frozen 3fc65f4"` | repository root | as step 5 | 1 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S2B --label frozen --source-label "frozen 3fc65f4"` | repository root | `prerequisites: pass` | 2 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2B.json -Label frozen -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes 747` | repository root | five `[dry run] <id>: unlocked` lines; eight `[dry run] rows-fr-none-pilot-<cell>: go, horizon <h> s, allowance <a> s, forecast so far <f> s` lines, `<h>` 885 for `3x29`, `18x18`, `18x20`, `20x20` and `20x21`, then 762 (`32x15`), 640 (`22x22`) and 481 (`24x24`); the last line `[dry run] forecast of the plan: 1,356 s counted (allocation 1,380 s, guard 1,725 s)`. The dry run adds each locked step's forecast (`projectS` + 45 s) to the plan's counted total, so the later horizons are set by the plan's own guard (1.25 x 23 min = 1,725 s; `lib/budget.mjs:85-90`: `min(885, 1,725 - forecast - 55)`), not by the round's 747 (ruling R-P24-02) | 2 min |
| `node tools\ig-proto\manifest.mjs approval --plan V4-S2B --label frozen --source-label "frozen 3fc65f4"` | repository root | one JSON line with `requestedAdditionalGuardS` 1694.6240407041143 (to the printed precision) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T02a --label frozen` | repository root, last | `firewall: OK, <n> production files unchanged since the snapshot of S24-T02a` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the four files of the Scope | 1 min |

## Stop points and questions

- Stop and report before: running the plan (`run-task.ps1` without `-DryRun`): that is S01, the orchestrator's.
- Stop and report when the written plan's `allocationMinutes` is not 23 or its guard is not 1,694.624 s: a price that
  differs from the approved one is a `QUESTION:` (the owner approved 22.59 / 28.24).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02a-B01 | The control pilot the owner approved exists as a runnable plan with exactly the approved scope and price | the case; the dry run; `approval` | the PASS line; the outputs |
| T02a-B02 | No compiled plan or record is rewritten | G2 | its empty output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02a-T01 | `writtenPlan('V4-S2B')` gives the steps, nodes, states, horizons and prices of the Tests table | `--items` | the PASS line |
| T02a-T02 | `write-plan` writes once and refuses a second write | the case and step 5 | the outputs |
| T02a-T03 | `check-prerequisites` passes; the dry run gives `go` for the eight row steps at 747 | the commands | their outputs |
| T02a-T04 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
| Start, end, duration | 2026-11-23 23:32 +07:00 (dispatch, base `83c78c1`); 2026-11-23 23:47 +07:00 (accepted); 15 min. The developer reported 23:32:19-23:35:48 and, after the ruling, 23:44:08-23:44:43 |
| Waiting for rulings | about 8 min (QUESTION 1 at 23:36, ruling relayed about 23:44) |
| Agent id, model | `f6899ad0-9d1d-4b7b-add0-cd8c70da46d4`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 37 calls; 2,600,312 input, 20,995 output, 2,446,712 cache-read tokens |
| AI credits | 83.86 (developer only) |
| Questions and rulings | QUESTION 1 (case 181 expected the eight-command list; `write-plan` makes nine): ruling R-P24-02 by SA-Opus, option (a), the one assertion replaced, the case name kept; the same ruling corrected the expected dry-run horizons (885 s for five rows, then 762, 640, 481 s: the plan's own guard of 1,725 s, `lib/budget.mjs:85-90`, not the 747 cap); pack amendment `2038cd6` (T02a, S01, check-list §5.4) |
| Fix rounds | 0 (the ruling round only) |
| Gates re-run by the orchestrator | `self-test --items --task S24-T02a-orch`: 208 passed, 0 failed (31.9 s); `write-plan --plan V4-S2B` again: refused, exit 1, file unchanged; `check-prerequisites --plan V4-S2B`: pass; dry run at 747: eight rows `go` (horizons 885 x5, 762, 640, 481), `forecast of the plan: 1,356 s counted (allocation 1,380 s, guard 1,725 s)`; `approval --plan V4-S2B`: spentS 10,252.712, requestedAdditionalGuardS 1,694.624, requestedCumulativeRoundMinutes 200; firewall OK (289); `npm run check` OK; G1, G2 empty; G3 the four Scope files |
| Commit | this task's commit |
| Issues and named items | for T05b and T10 (already in their scope): adding `V4-P7` and `V4-S3P` to `writtenPlan` also updates the unknown-command text of case 181 and the README paragraph |

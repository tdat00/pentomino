# T11c: Frozen-round plans: the compiler, the isolated P-0 manifest and the prerequisites gate

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (stages 2 to 5; "Parity passes"; "The timed comparator"; "Each task has a ceiling"), §5.2 (which arm is judged; the comparator); decisions IG-P-D7 (OD-P10), D-V4-08, D-V4-14, D-V4-18, D-V4-19, D-V4-20; review RV1-01 (R01), RV1-06 (R06), RV1-14 (R14), RV1-17, RV2-11 (R2-11), RV2-12 (R2-12), RV3-02, RV3-04, RV3-06, RV3-09, RV4-04 (R4-04), RV4-05, RV4-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11b |
| Depends on | T11b; T04c, T04d and T04f (`v4-check.mjs`, `lib/proof.mjs`: `checkAccepted`, `LIVE_DEADLINE_FIELDS`); T09e (`verdicts.mjs`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3.5 h (3 h, then a fix round of 0.5 h after its report: ruling of 2026-11-17), machine 0 min (data and pure functions; synthetic cases and dry runs, unlocked) |

## Goal

The frozen round must be executable as concrete plans: every step with its complete Node arguments, state path, lock
status, dependencies, expected output and exit condition, every consumed artifact produced by an earlier step or
declared as a prerequisite, and every plan priced as it will run. This task writes the compiler of the plans that can
be fixed now (stage 2 with its isolated P-0 pass, and the live-deadline plan), the priced universe of stage 4 and the
second-validation template (both non-executable), the parity item manifests and the prerequisites gate, which checks
receipts only through their accepted bindings. T11d writes the receipts the plans call; T11e activates the stage-4
collection; T11f resolves its comparators.

## Authority and fixed points

- R2-11 (accepted), the order of the round, as amended by review 3: (1) stage 2: the request rows, the P-1 parity pass
  of every stage-2 arm with its receipt and accepted binding, the isolated P-0 pass of `v4` with its `p0-identity`
  receipt and accepted binding, and the probes; (2) after the freeze (N-V4-03) and the live deadline's implementation
  (N-V4-13): `V4-LIVE` and its accepted live-deadline binding; (3) with the accepted P-0 and live-deadline bindings:
  T11e's `activate` writes the concrete `V4-S4` of exactly the activated collection; (4) its class selection (T09e);
  (5) T11f's `resolve-comparators` writes `V4-S4C` from that selection; (6) the final verdict input (T11f) and the
  global verdict (T09e). The second validation stays a template until N-V4-04.
- RV3-02 (accepted), D-V4-19: P-0 runs from its own manifest `tools/ig-proto/plans/items/V4-S2P.p0-v4.json`: the
  stage-1 parity corpus (`tools/ig-proto/plans/V4-T04.parity.json`: its 23 items, cases, variants, seeds and modes)
  with `task` `V4-S2P` and `step` `p0-v4`, executed under the same task and step (T04c refuses any other), state
  `V4-S2P\p0-v4\state.json`. The stage-1 manifest, raw logs, states and receipts are only read. The P-0 receipt is
  `--kind p0-identity` with `--require-pass` (T11d), and its accepted binding is a prerequisite of `V4-LIVE` and of
  every stage-4 plan; the existence of the stage-1 receipt is never a substitute.
- RV3-04 (accepted), D-V4-20: no executable stage-4 plan is compiled here. `V4-S4.universe.json` is the priced
  universe (every stage-4 group of T11a with its collection; `runnable: false`, `template: true`); `V4-S4X.template.json`
  is not executable until N-V4-04. No executable `node` names `shipped-uncapped`.
- RV3-06 (accepted), D-V4-18: a receipt is a prerequisite only through its accepted binding (T04f's `checkAccepted`).
- The future dependencies are named items (check-list §6), each with its artifact: N-V4-03 the variants `fr-frozen`,
  `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped` and
  `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` (`{ classes: [{ id, cells, screen, noScreen }] }`);
  N-V4-13 the live deadline in `fr-frozen` and `fr-frozen-none`, the tool `tools/ig-proto/live-deadline.mjs receipt
  --task V4-LIVE` writing `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json` (kind `live-deadline`,
  T04d's `LIVE_DEADLINE_FIELDS`) and the kind `live-deadline` of `v4-check accept`; N-V4-04 the adoption record
  `docs/improve-generating/evidence/frozen/V4-S5/adoption.json`.
- A P-1 parity pass of an arm (R06): T04c's item manifest format with the three observer modes on `12x12-nightmare`,
  `26x26-hell-1` and `14x14-master` (9 `v4-select` items) and one `v4-generate` on `12x12-nightmare` (quantity 2) with
  its 2 `v4-replay` items (12 items; `seedText` `ig-v4/parity/<caseId>` and `ig-v4/replay/<caseId>` as T04c's).
- Prices are T11b's `stepPrice` of each emitted step (R2-12): the plan's `allocationMinutes` is the ceiling in minutes
  of the required steps' `projectS + 45 x invocations`, `optionalMinutes` the same for the optional steps
  (`run-task.ps1` adds them with `-IncludeOptional`).

## Scope

- Change: `tools/ig-proto/manifest.mjs` (steps 1 to 3), `tools/ig-proto/self-test.mjs` (cases appended to `--items`),
  `tools/ig-proto/README.md` (T11a's section), `tools/ig-proto/run-task.ps1` (line 39 only, step 6).
- Create (by the `compile` command of step 2, kept): `tools/ig-proto/plans/V4-S2.json`, `V4-LIVE.json`,
  `V4-S4.universe.json`, `V4-S4X.template.json`, and the item manifests `tools/ig-proto/plans/items/V4-S2P.p0-v4.json`,
  `V4-S2P.parity-<arm>.json` (the seven stage-2 arms) and `V4-S4P.parity-<arm>.json` (the four stage-4 arms).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T11c --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench tools/ig-proto/variants tools/ig-proto/lib tools/ig-proto/data tools/ig-proto/plans/V4-T04.parity.json tools/ig-proto/plans/V4-T04.replay.json`,
  expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T11c --label frozen`.
1. **The plan builders** (pure exports of `manifest.mjs`, reused by T11e and T11f). A plan is `{ task, generatedBy,
   runnable, blockedBy, prerequisites, allocationMinutes, optionalMinutes, steps }`; a step is `{ id, locked, node,
   state, repeatUntilDone, projectS, minHorizonS, invocations, optional, price, dependsOn, consumes, produces, expect,
   exitOn }` (`state`, `projectS`, `minHorizonS`, `invocations` and `price` for locked steps; `price` is the
   simulation's input and result; `exitOn` is `'a nonzero exit stops the plan (run-task.ps1)'`; `expect` the line the
   step prints on success; paths in `consumes` and `produces` are relative to the root with `/`). Every `node` is the
   argv array of `run-task.ps1` (as in `plans/IGP-00.json`): the script path relative to the root with backslashes
   (`tools\\ig-proto\\<script>.mjs` in JSON), then one element per word; below, a command is written as its words
   separated by spaces. The runner appends `--label`, `--source-label` and, to a locked step, `--horizon-s`
   (`run-task.ps1:87`, `:120`). Every locked step (RV4-04) has `repeatUntilDone: true` (the runner stops a step whose
   first invocation leaves it unfinished otherwise, `run-task.ps1:155-157`), its full `state` path and an explicit
   `minHorizonS`: `rowLimitS + 12` for a row step, 270 for a P-1 parity step (its manifest has a `v4-generate` item,
   reserve 245), 150 for the P-0, kernel-counter, profile and width steps.
   - `rowStep(group, priceOf, rowS)`: a group with `rows < 1` throws `Error('manifest: a row step needs at least one
     row (<group key>)')` (RV4-05); else id `rows-<arm>-<shard>`, locked, `node` `tools\ig-proto\arm.mjs run --task
     <task> --arm <arm> --shard <shard> --variant <variant> --workers 4 --cases <cell>:<from>-<to> --row-limit-s
     <rowLimitS>` (`<variant>` is the data file's `arms[<arm>].variant`, the arm's own id: T11a's groups carry no
     `variant`), `state` `<task>\<arm>\<shard>\state.json`, `repeatUntilDone` true, `minHorizonS` `rowLimitS + 12`,
     `price` of `{ type: 'rows', rows, rowS, rowLimitS }`, `optional` the group's `optional` (T11e overrides it).
   - `parityPass(task, arm, priceOf, durations)`: three steps. `parity-<arm>` (locked; `node`
     `tools\ig-proto\v4-check.mjs run --task <task> --step parity-<arm> --manifest
     tools\ig-proto\plans\items\<task>.parity-<arm>.json`; `state` `<task>\parity-<arm>\state.json`; `repeatUntilDone`
     true; `minHorizonS` 270; `price` of `{ type: 'items', groups }` from the manifest's groups in order (9
     `v4-select` items on 2 lanes with reserve 120, 1 `v4-generate` on 1 lane with reserve 245, 2 `v4-replay` on 2 lanes
     with reserve 120) and `durations`); `receipt-<arm>` (unlocked; `tools\ig-proto\v4-check.mjs receipt --kind parity --task <task> --step
     parity-<arm> --manifest tools\ig-proto\plans\items\<task>.parity-<arm>.json --arm <arm> --require-pass`;
     `produces` `docs/improve-generating/evidence/frozen/<task>/parity-<arm>.receipt.json`); `accept-<arm>` (unlocked;
     `tools\ig-proto\v4-check.mjs accept --task <task> --step parity-<arm> --manifest
     tools\ig-proto\plans\items\<task>.parity-<arm>.json --receipt
     docs/improve-generating/evidence/frozen/<task>/parity-<arm>.receipt.json --binding
     docs/improve-generating/evidence/frozen/<task>/parity-<arm>.accepted.json --by <plan task>`; `produces` the
     binding).
   - `planOf({ task, generatedBy, runnable, blockedBy, prerequisites, steps })`: adds `allocationMinutes` and
     `optionalMinutes` (the Authority rule).
2. **`export function compilePlans(expansion, priceOf, { durations })`** returns `{ plans, templates, itemManifests }`:
   - **`V4-S2`** (`runnable: true`, `blockedBy: []`, `prerequisites: [{ type: 'accepted', path:
     'docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json', current: [] }]`): `prerequisites`
     (unlocked, `tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S2`); `firewall-snapshot`; `trees`
     (`tools\ig-proto\lib\tree.mjs build base instr r4c v4 v4-w760 v4-w095 v4-w380 log-link fr-base fr-screen fr-none
     fr-close fr-c4 fr-ps fr-p5`: every variant a step of the plan runs, the probes' `instr` and `r4c` included); `rowStep` of every stage-2 group (task `V4-S2`, `rowS` `projectedRowS(...)`); per arm an
     unlocked `publish-<arm>` (`tools\ig-proto\arm.mjs publish --task V4-S2 --arm <arm>`, `dependsOn` its row steps,
     `produces` `docs/improve-generating/evidence/frozen/V4-S2/<arm>/`); `parityPass('V4-S2P', a, ...)` for each of
     `fr-base`, `fr-screen`, `fr-none`, `fr-close`, `fr-c4`, `fr-ps`, `fr-p5`; the P-0 steps: `p0-v4` (locked; `node`
     `tools\ig-proto\v4-check.mjs run --task V4-S2P --step p0-v4 --manifest
     tools\ig-proto\plans\items\V4-S2P.p0-v4.json`; `state` `V4-S2P\p0-v4\state.json`; `repeatUntilDone` true;
     `minHorizonS` 150; `price` of `{ type: 'items', groups }` from its 23 `v4-select` items in their variant groups,
     2 lanes, reserve 120),
     `receipt-p0` (unlocked; `tools\ig-proto\v4-check.mjs receipt --kind p0-identity --task V4-S2P --step p0-v4
     --manifest tools\ig-proto\plans\items\V4-S2P.p0-v4.json --arm v4 --baseline
     docs/improve-generating/evidence/frozen/V4-T04/accepted-binding.json --require-pass`; `produces`
     `docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.receipt.json`) and `accept-p0` (unlocked;
     `tools\ig-proto\v4-check.mjs accept --task V4-S2P --step p0-v4 --manifest tools\ig-proto\plans\items\V4-S2P.p0-v4.json --receipt
     docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.receipt.json --binding
     docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json --by V4-S2`); the probes: locked
     `kernel-counters` (`tools\ig-proto\kernel-probe.mjs counters --task V4-S2K --cases
     10x10-nightmare,12x12-nightmare,14x14-nightmare,26x26-nightmare,26x26-hell-1`, state `V4-S2K\counters\state.json`,
     `price` of `{ type: 'items', groups: [{ kind: 'v4-kernel', variant: 'r4c', lanes: 1, reserveS: 90, durationsS:
     <30 entries: six subsets of each of the five cases, T10a> }] }`), locked `kernel-profile`
     (`tools\ig-proto\kernel-probe.mjs profile --task V4-S2K --cases 14x14-nightmare,26x26-nightmare`, the two cases
     of T10b's default written out, state `V4-S2K\profile\state.json`, `price` of `{ type: 'process', durationsS: <2
     entries>, reserveS: 120 }`), unlocked `kernel-report` (`tools\ig-proto\kernel-probe.mjs report --task V4-S2K`),
     locked `width` (`tools\ig-proto\width-probe.mjs run --task V4-S2W --cases 26x26-nightmare,14x14-nightmare
     --rounds 3`, state `V4-S2W\run\state.json`, `price` of `{ type: 'process', durationsS: <8 entries: widths 1, 2, 4
     and 8 of each case, T10c>, reserveS: 120 }`), unlocked `width-report` (`tools\ig-proto\width-probe.mjs report
     --task V4-S2W`); `firewall-check`. Each probe step's `price` input records its `cases`, equal to the `--cases`
     of its `node`. The proofs come first (ruling of 2026-11-17, T11c's report: a failed or incomplete proof then stops the
     plan before any request row runs): the steps are emitted in the order `prerequisites`, `firewall-snapshot`, `trees`,
     the P-0 steps, the P-1 passes (in the order of the arms above), the row steps, the `publish-<arm>` steps, the probes
     and `firewall-check`.
   - **`V4-LIVE`** (`runnable: false`, `blockedBy: ['N-V4-03', 'N-V4-13']`, `prerequisites`: `{ type: 'variant', id:
     'fr-frozen' }`, `{ type: 'file', path: 'docs/improve-generating/evidence/frozen/V4-S3/freeze.json' }`, `{ type:
     'file', path: 'tools/ig-proto/live-deadline.mjs' }`, `{ type: 'accepted', path:
     'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current: ['v4'] }`): `prerequisites`;
     `firewall-snapshot` (its `firewall-check` needs it: ruling of 2026-11-17, T11c's QUESTION 3); `trees` (`build
     fr-frozen`); the `live` groups as `rowStep`s (task `V4-LIVE`, row limit 260); `publish-fr-frozen`; `live-receipt`
     (unlocked, `tools\ig-proto\live-deadline.mjs receipt --task V4-LIVE --require-pass`, a mandatory proof, D-V4-19;
     `produces` `docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json`; `expect` `receipt: live-deadline
     pass -> docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json`, N-V4-13); `accept-live` (unlocked,
     `tools\ig-proto\v4-check.mjs accept --task V4-LIVE --receipt
     docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json --binding
     docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json --by V4-LIVE`); `firewall-check`.
   - **`V4-S4.universe.json`** (`templates`): `{ task: 'V4-S4', generatedBy: 'manifest.mjs compile', template: true,
     runnable: false, collections: { initial, conditional, optional, second } }`, each collection `{ groups: [<group,
     with its row step's price>], comparators: [<comparator group, with the price of its row step at the cell's
     projection>] }`; no `node`.
   - **`V4-S4X.template.json`** (`templates`): `{ task: 'V4-S4X', generatedBy: 'manifest.mjs compile', template: true,
     runnable: false, blockedBy: ['N-V4-04'], groups: <the S4-7 twins>, comparators: <the S4-7 comparator groups, task
     `V4-S4XC`> }`; no `node`.
   - **`itemManifests`**: `V4-S2P.p0-v4.json` = `plans/V4-T04.parity.json` with `task` `V4-S2P` and `step` `p0-v4`,
     rows unchanged; `V4-S2P.parity-<a>.json` for the seven stage-2 arms and `V4-S4P.parity-<a>.json` for `fr-frozen`,
     `fr-frozen-none`, `fr-frozen-uncapped` and `fr-frozen-none-uncapped` (the P-1 manifest of the Authority section,
     `task` the file's task, `step` `parity-<a>`).
3. **`manifest.mjs compile --label frozen --source-label <SL>`**: `expandMatrix` (T11a, `controls` from
   `controlsFrom(mp12b1Report, data.cells.failingNightmare)`, `secondValidationBoards` the default), the durations (the mean `ms / 1000` per `kind/variant` over the `item-end`
   lines of the frozen steps `V4-T04/parity`, `V4-T04/replay`, `V4-T10a/counters`, `V4-T10b/profile` and
   `V4-T10c/run`; a `width` item takes three times T10c's one-round mean; a kind or variant without a measure takes its
   reserve and the plan says so), `compilePlans`, then writes the files and prints one line `wrote <path>` per file
   it wrote, then `compile: <n> files` (RV3-09: the count is the files actually written; with the lists above, 2
   plans, 2 templates and 12 item manifests, 16). It refuses (exit 1, nothing written) when an existing target file
   lacks `"generatedBy": "manifest.mjs compile"` (an item manifest: `"format": "ig-proto-items"` and a `task` of
   `V4-S2P` or `V4-S4P`) or when a step is not admissible (T11b), naming them.
4. **`manifest.mjs check-prerequisites --plan <id> --label frozen --source-label <SL>`** (the plan file
   `tools/ig-proto/plans/<id>.json`) and its pure core `checkPrerequisites(list, { variants, exists, readJson,
   currentOf })` (`currentOf(id)` returns `{ id, treeId, paramsHash }` of today's tree: `(await ensureTree(id)).treeId`
   and the SHA-256 of `JSON.stringify(params)`): a `variant` entry passes when the id is in `variants`
   (`listVariants()`); a `file` entry when `exists(path)`; an `accepted` entry `{ type: 'accepted', path, current,
   kind?, fields? }` when the file exists (else `missing binding <path>`), `checkAccepted(readJson(path), { current:
   current.map(currentOf) })` passes (else its reasons), the binding's `expected.kind` equals `kind` when given (else
   `<path> is not a <kind> binding`) and, for `fields: 'LIVE_DEADLINE_FIELDS'`, its `expected.fields` deep-equals
   `LIVE_DEADLINE_FIELDS` (else `<path> lacks the live-deadline fields`). Another type: `unknown prerequisite <type>`.
   It prints `prerequisites: pass` (exit 0) or `prerequisites: blocked (<reason>; ...)` (exit 1). A blocked plan's run
   stops at its first step (`run-task.ps1`: a nonzero unlocked step stops the plan).
5. **Self-test** cases appended to `--items` (Tests table); **README.md**: T11a's section gains the plans, their order,
   the isolated P-0, the universe and the templates, and the prerequisites gate.
6. **The runner reads the plans** (ruling of 2026-11-17, T11c's QUESTION 1, option (a)). A rows step's `price` holds `rows`
   and `rowS`, keys that differ only in case, which PowerShell 7's `ConvertFrom-Json` refuses. `tools/ig-proto/run-task.ps1`
   line 39 becomes `$planObj = Get-Content -LiteralPath $planPath -Raw | ConvertFrom-Json -AsHashtable` (case-sensitive
   keys); nothing else in the runner changes (the state files and the budget decisions are read as before). Every plan
   under `tools/ig-proto/plans/` uses exactly the key names the runner reads and has no two keys that differ only in case
   outside these price inputs (checked by the pack author), so the earlier plans read as before. The README replaces the
   open point with the rule: a PowerShell reader of a compiled plan, template or manifest uses `-AsHashtable`.

## Tests

All in `tools/ig-proto/self-test.mjs --items`, pure, on `compilePlans` of the default expansion with synthetic
durations (`{ 'v4-select/*': 30, 'v4-generate/*': 120, 'v4-replay/*': 30 }`).

| Case name | Input | Expected |
|---|---|---|
| `compile: no unresolved argument` | every `node` of every plan | an array of strings; none contains `<`, `>`, `resolved after` or `shipped-uncapped`; its first element is a script that exists (`existsSync`) or `tools\ig-proto\live-deadline.mjs` (string values), a `file` prerequisite of `V4-LIVE`; `accept-p0`'s first element is `tools\ig-proto\v4-check.mjs`; the two templates have no `node` |
| `compile: producers before consumers` | the plans `V4-S2` and `V4-LIVE` in that order | every path a step consumes is produced by an earlier step of its plan, by an earlier plan, or is a `file` or `accepted` prerequisite of its plan |
| `compile: P-0 is isolated and required` | the P-0 manifest and steps | the manifest has `task` `V4-S2P`, `step` `p0-v4` and the 8 rows of `V4-T04.parity.json` with equal `(kind, variant, caseId, seedText, modes)`, which expand to the same 23 `(variant, caseId, seedText, mode)` items; `p0-v4`'s `node` has `--task V4-S2P --step p0-v4` and `state` `V4-S2P\p0-v4\state.json`; `receipt-p0` follows it with `--kind p0-identity` and `--require-pass`; `accept-p0` follows the receipt; `V4-LIVE`'s prerequisites contain `{ type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current: ['v4'] }`; in `V4-S2` the steps after `trees` are `p0-v4`, `receipt-p0`, `accept-p0`, then `parity-<arm>`, `receipt-<arm>` and `accept-<arm>` of the seven arms in order, all before the first `rows-` step; `V4-LIVE`'s `live-receipt` has `--require-pass` (ruling of 2026-11-17) |
| `compile: no executable stage-4 plan` | `plans` and `templates` | `plans` holds only `V4-S2` and `V4-LIVE`; the universe and the S4X template have `runnable: false` and no `node`; the universe's `initial.comparators` are every comparator group of collection `initial`, and its `second` collection holds every S4-7 group |
| `compile: disjoint state paths` | every locked step of the two plans | no two share `state`; `V4-S2\fr-base\pilot-14x14-nightmare\state.json` and `V4-S2P\p0-v4\state.json` exist; no state is under `V4-T04\` |
| `compile: each step priced as it runs` | every locked step | `projectS` and `invocations` equal `stepPrice(step.price)`'s; `allocationMinutes` the ceiling of the required steps' `projectS + 45 x invocations` over 60, `optionalMinutes` the same for the optional ones |
| `compile: bounded steps resume` | every locked step of the two plans; then T11b's `stepPrice` of the `p0-v4` step's price input with every duration set to 120 s | each has `repeatUntilDone: true`, a `state` and `minHorizonS` `rowLimitS + 12` (rows), 270 (P-1 parity), 150 (`p0-v4`, `kernel-counters`, `kernel-profile`, `width`); the second input needs at least two invocations, which the emitted `repeatUntilDone` allows (a step without it stops after an unfinished first invocation, `run-task.ps1:155-157`) |
| `compile: populations as priced` | the probe steps of `V4-S2`; then `rowStep` of a group with `rows: 0` | `kernel-counters`: `--cases` names five ids and its price input 30 durations; `kernel-profile`: `--cases 14x14-nightmare,26x26-nightmare` and 2 durations; `width`: `--cases 26x26-nightmare,14x14-nightmare --rounds 3` and 8 durations; each price input's `cases` equals its `--cases`; then throws `manifest: a row step needs at least one row` |
| `compile: blocked plans refuse` | `checkPrerequisites` of `V4-LIVE`'s list with synthetic `variants`, `exists`, `readJson` and `currentOf`, and a binding built by T04f's `acceptedBinding` over a temporary receipt: (a) `fr-frozen` missing; (b) everything present and the P-0 receipt changed after acceptance; (c) everything present and bound; (d) an `accepted` entry with `kind: 'live-deadline'` whose binding's `expected.kind` is `deadline-projection` | (a) `blocked (variant fr-frozen missing; ...)`; (b) `blocked (receipt changed <path>)`; (c) `pass`; (d) `blocked (<path> is not a live-deadline binding)` |

## Documentation

`tools/ig-proto/README.md` (step 5).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task V4-T11c` | root | every `--items` case passes, exit 0 | 3 min |
| `node tools\ig-proto\manifest.mjs compile --label frozen --source-label "frozen 3fc65f4"` | root | one `wrote <path>` line per file of the Scope's list, then `compile: 16 files`; exit 0 | 2 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"` | root | `prerequisites: blocked (variant fr-frozen missing; ...)`, exit 1 (expected: the stage-4 arms are later work) | 1 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-S2.json -Label frozen -SourceLabel 'frozen 3fc65f4' -DryRun` (step 6) | root | exit 0; one `[dry run]` line per step, the last `[dry run] forecast of the plan: 40,085 s counted (allocation 40,140 s, guard 50,175 s)`; with no approval given every locked step says `stop` with its budget reason, and nothing runs | 2 min |
| the same dry run of `tools\ig-proto\plans\V4-LIVE.json` | root | exit 0; the last line `[dry run] forecast of the plan: 2,389 s counted (allocation 2,400 s, guard 3,000 s)` | 1 min |
| the same dry run of `tools\ig-proto\plans\V4-T10c.json`, captured before the edit of step 6 and after it | root | the two outputs are identical (the runner reads an earlier plan as before) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T11c --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing the order of the round, a prerequisite or a named item's artifact.
- `QUESTION:` when a stage-2 step is not admissible (T11b) or a measured duration is missing for a kind the plans use.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11c-B01 | The frozen round's fixed part is a sequence of concrete plans in the order of R2-11; nothing that depends on a later result can run before it exists, and no stage-4 measurement plan exists before its collection is activated | cases 1 to 4 and 9; the `check-prerequisites` command | self-test output; command output |
| T11c-B02 | P-0 measures in its own namespace and is a required, accepted proof before the live deadline and validation | case 3 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T11c-T01 | Disjoint state paths and prices of the emitted steps; every bounded step can resume and runs the population it is priced on (RV4-04) | cases 5 to 8 | self-test output |
| T11c-T02 | The compiler writes only its own files and reports the files it wrote | the `compile` command; the diff | command output; diff |
| T11c-T03 | Nothing else changed; formats | guards; `npm run check` | command output |
| T11c-T04 | The runner reads the compiled plans (each dry-run forecast is the plan's price) and every earlier plan as before (ruling of 2026-11-17) | the three dry runs | command output |

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

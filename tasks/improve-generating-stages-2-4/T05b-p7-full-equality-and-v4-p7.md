# T05b: P7: the full equality runs and the plan `V4-P7`

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.6 (`V4-P7`: "the spike's timing probe: at most three composites x 90 paired items, one lane, reserve 90 s; up to 20 counted minutes approved (D-S24-28)"; prerequisites "the spike's variants and its equality records"), §6 T6, §8.2 T03-T05; D-S24-15, D-S24-28; pack decisions D-P24-03, D-P24-05 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T05a |
| Depends on | T05a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2 h, machine 0 min allocated (the full equality runs: about 45 to 50 min of locked verification per composite, the six Hell 1 kernel inputs included) |

## Goal

Before any composite is timed, it must be equal to the reference on the full tier too: all of PM4's 676 profiles at
canonical limits, PM4's cap boundaries on the first profile of every set, T10a's corpus at every setting and the seven
memory items (713 items, T03a). This task runs those equality runs for the composites that passed their quick tier and
writes the timing plan `V4-P7` for the composites that pass both, priced by T11g's rules within the owner's 20 counted
minutes; with no eligible composite it writes no plan.

## Authority and fixed points

- D-S24-28 (owner, 2026-11-23): up to 20 counted minutes for `V4-P7`, at most three composites (15.50 projected / 19.37
  guard for three); the runner's task cap is 1.25 x the plan's allocation (`lib/budget.mjs` `decide`), 20 minutes for
  three composites (allocation 16).
- D-P24-05: a composite not equal on both tiers (verdict `equal` and memory coverage complete) is dropped (it leaves
  the reference) and is not timed; a timing step runs only after an unlocked `bind-<c>` step proved that both equality
  reports bind to the tree to be timed (T03c's `bind`; a file's mere existence is not a prerequisite of timing, SA-Astra's
  review R07).
- SA-Astra's review R08: when no composite is eligible, `V4-P7.json` is not created; S02 then only writes its report
  ("no eligible candidate; no timing run; 0 counted measurement minutes") and T06a may proceed.
- Pricing (`j1-numbers.mjs` §2, the approved figure): per composite one item group `{ kind: 'p7-time', variant:
  <composite>, lanes: 1, reserveS: 90, durationsS }`, `durationsS` = the 30 `itemMs` of
  `docs/improve-generating/evidence/frozen/V4-S2K/kernel.json` `rows`, each `x 1.25 / 1000` (`PROJECTION_FACTOR`), repeated
  for the rounds 0, 1, 2 (90 values, the order of T03a's `timeDeclarations`, converted by `runtimeItems`); each
  composite's step priced alone by `stepPrice`.
  Expected: one composite allocation 6 min, guard 6.46 min; two 11 and 12.91; three 16 and 19.369531 (1,162.172 s).
- Fixed: `write-plan` writes once (D-P24-03); `compile` is never run.

## Scope

- Create (by the runs): `docs/improve-generating/evidence/frozen/V4-P7E-<composite>-full/p7.json` and `p7.md` for each
  composite whose quick report is `equal`; `tools/ig-proto/plans/V4-P7.json` (by `write-plan`).
- Change: `tools/ig-proto/manifest.mjs`: `writtenPlan` gains `V4-P7` and the option `candidates`; `writePlanCommand`
  gains the value `--candidates`; the usage text of `write-plan` becomes `needs --plan <id> (one of V4-S2B, V4-P7)`; the
  refusal text of an unknown id stays `manifest: unknown written plan <id>` (T02a; its `writtenPlan('V4-XX')` case is
  unchanged).
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `itemCases`.
- Change: `tools/ig-proto/README.md`: the paragraph of `### Written plans (stages 2 to 4 pack)` gains `V4-P7`.
- Do not change: every other file. Guards: G1, G2, G3 (G3 lists the files above).

## Steps

1. **The full equality runs.** For each composite in the order `p7-c1`, `p7-c1r5`, `p7-c1r5c5` whose
   `V4-P7E-<composite>-quick/p7.json` has `equal.verdict` `equal` and `equal.coverage.complete` true: the loop of
   Commands and gates with `--tier full` and the task `V4-P7E-<composite>-full`, then its `report`, then
   `node tools\ig-proto\p7-probe.mjs bind --candidate <composite> --task V4-P7 --label frozen --source-label "frozen
   3fc65f4"` (unlocked; it must print `p7-probe: <composite> bound to its quick and full equality reports`). A composite
   whose full report is not `equal` with complete coverage, or that does not bind, is reported (stop point) and dropped.
2. In `writtenPlan(id, { ..., candidates })`, `id === 'V4-P7'`:
   - `candidates` must be a non-empty list of distinct ids, each one of `p7-c1`, `p7-c1r5`, `p7-c1r5c5`, at most three,
     in that order; otherwise throw `manifest: V4-P7 needs one to three of p7-c1, p7-c1r5, p7-c1r5c5, in order`;
   - read `docs/improve-generating/evidence/frozen/V4-S2K/kernel.json`; `durationsS` as in the Authority section;
   - `prerequisites` = for each candidate `{ type: 'variant', id: <c> }`, `{ type: 'file', path:
     'docs/improve-generating/evidence/frozen/V4-P7E-<c>-quick/p7.json' }`, `{ type: 'file', path:
     'docs/improve-generating/evidence/frozen/V4-P7E-<c>-full/p7.json' }`;
   - steps: `gateStep('V4-P7', prerequisites)`, `firewallSnapshotStep('V4-P7')`, `treesStep(['base', ...candidates])`,
     then per candidate first `unlockedStep(\`bind-${c}\`, [\`${IG}p7-probe.mjs\`, 'bind', '--candidate', c, '--task',
     'V4-P7'], { dependsOn: ['trees'], consumes: [\`${EVIDENCE}/V4-P7E-${c}-quick/p7.json\`,
     \`${EVIDENCE}/V4-P7E-${c}-full/p7.json\`], produces: [], expect: \`p7-probe: ${c} bound to its quick and full equality
     reports\` })`, then `lockedStep({ id: \`time-${c}\`, node: [\`${IG}p7-probe.mjs\`, 'time', '--candidate', c, '--task',
     'V4-P7'], state: \`V4-P7\\time-${c}\\state.json\`, minHorizonS: PROBE_MIN_HORIZON_S, price: { type: 'items', groups:
     [{ kind: 'p7-time', variant: c, lanes: ITEM_LANES['p7-time'], reserveS: DEFAULT_LIMITS.itemReserveS['p7-time'],
     durationsS, durationSource: 'V4-S2K item times x 1.25' }] }, dependsOn: [\`bind-${c}\`], consumes: [treeFile('base'),
     treeFile(c)], produces: [\`${RAW}/V4-P7/time-${c}/experiment.json\`, \`${RAW}/V4-P7/time-${c}/state.json\`,
     \`${RAW}/V4-P7/time-${c}/items.jsonl\`], expect: 'the state has done: true (every item has ended)' }, priceOf)`, then
     `unlockedStep('report', [\`${IG}p7-probe.mjs\`,
     'report', '--task', 'V4-P7'], { dependsOn: candidates.map((c) => \`time-${c}\`), consumes: candidates.map((c) =>
     \`${RAW}/V4-P7/time-${c}/items.jsonl\`), produces: [\`${EVIDENCE}/V4-P7/p7.json\`, \`${EVIDENCE}/V4-P7/p7.md\`], expect:
     'p7-probe: wrote docs/improve-generating/evidence/frozen/V4-P7/p7.json' })`, `firewallCheckStep('V4-P7')`;
   - `plan = planOf({ task: 'V4-P7', generatedBy: WRITE_PLAN_GENERATED_BY, runnable: true, blockedBy: [], prerequisites,
     steps })`, `itemManifests = {}`.
3. `writePlanCommand` parses `candidates` (comma-separated) and passes it; `--candidates` is refused for another plan
   (`--candidates belongs to V4-P7`).
4. Write the plan: `node tools\ig-proto\manifest.mjs write-plan --plan V4-P7 --candidates <the composites equal on both
   tiers, comma-separated, in order> --label frozen --source-label "frozen 3fc65f4"`. Expected with three:
   `write-plan: wrote tools/ig-proto/plans/V4-P7.json (11 steps, 3 locked; allocation 16 min, optional 0 min)` (with
   one composite: 7 steps, 1 locked, allocation 6 min; with two: 9 steps, 2 locked, 11 min). With no eligible
   composite, this step is not run and no plan is written (R08).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `write-plan: V4-P7` | `writtenPlan('V4-P7', { candidates: ['p7-c1', 'p7-c1r5', 'p7-c1r5c5'] })` | step ids `prerequisites, firewall-snapshot, trees, bind-p7-c1, time-p7-c1, bind-p7-c1r5, time-p7-c1r5, bind-p7-c1r5c5, time-p7-c1r5c5, report, firewall-check`; the `trees` node ends `'build', 'base', 'p7-c1', 'p7-c1r5', 'p7-c1r5c5'`; each `bind-*` step unlocked with its node ending `'bind', '--candidate', <c>, '--task', 'V4-P7'`; each `time-*` step locked, `dependsOn` `[bind-<c>]`, `minHorizonS` 150, one item group of 90 durations with `lanes` 1 and `reserveS` 90; `allocationMinutes` 16; `Math.round(planGuardS(plan) * 1000) / 1000` = 1162.172 (the case computes it from `kernel.json`, so it reads this machine's V4-S2K record) |
| same case | (one candidate) | `writtenPlan('V4-P7', { candidates: ['p7-c1'] })` | `allocationMinutes` 6; the guard in minutes rounded to 2 decimals 6.46 |
| same case | (refusals) | `candidates: []`, `['p7-c1r5', 'p7-c1']`, `['p7-x']` | each throws `manifest: V4-P7 needs one to three of p7-c1, p7-c1r5, p7-c1r5c5, in order` |

## Documentation

README, `### Written plans (stages 2 to 4 pack)`: "`V4-P7` (T05b): the P7 timing probe, `write-plan --plan V4-P7
--candidates <ids>`: per composite an unlocked step `bind-<id>` (its quick and full equality reports bound to the tree
to be timed) and one locked step `time-<id>` of 90 paired `p7-time` items (one lane, reserve 90 s, priced at V4-S2K's
item times x 1.25), then `report`; prerequisites the composites and their quick and full equality reports; three
composites: allocation 16 min, guard 19.37 min (the owner's 20 minutes, D-S24-28); no eligible composite, no plan."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T05b --label frozen` | repository root, first | `firewall: snapshot of S24-T05b` | 1 min |
| the full equality runs: `$Composites = @('p7-c1', 'p7-c1r5', 'p7-c1r5c5')` reduced to the composites whose quick report is `equal` with complete coverage (in this order); then `. .\tools\ig-proto\lock\ig-lock.ps1; foreach ($c in $Composites) { $task = "V4-P7E-$c-full"; for ($i = 1; $i -le 16; $i += 1) { Invoke-IgNode -Repo pentomino -Task "$task equal $i" -NodeArgs @('tools\ig-proto\p7-probe.mjs', 'equal', '--candidate', $c, '--tier', 'full', '--task', $task, '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--horizon-s', '285'); if ((Get-Content -Raw "tests\artifacts\ig-proto\frozen\$task\equal\state.json" \| ConvertFrom-Json).done) { break } }; node tools\ig-proto\p7-probe.mjs report --task $task --label frozen --source-label 'frozen 3fc65f4'; node tools\ig-proto\p7-probe.mjs bind --candidate $c --task V4-P7 --label frozen --source-label 'frozen 3fc65f4' }` | PowerShell 7 at the repository root | each invocation `exit=0`; each run's last `done true`; each report `equal.verdict` `equal` with `equal.coverage.complete` true; each `bind` line `p7-probe: <c> bound to its quick and full equality reports` | about 45 to 50 min per composite (at most sixteen invocations of 300 s each) |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T05b --horizon-s 285` | repository root (unlocked) | every case `PASS` | 5 min |
| step 4's `write-plan` | repository root | as step 4 | 1 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-P7 --label frozen --source-label "frozen 3fc65f4"` | repository root | `prerequisites: pass` | 2 min |
| `pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\V4-P7.json -Label frozen -SourceLabel 'frozen 3fc65f4' -DryRun -ApprovedRoundMinutes 747` | repository root | every `time-*` step `go`; the unlocked steps listed | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T05b --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the files of the Scope | 1 min |

## Stop points and questions

- Stop and report when a full equality item is not `same`, a full report is `incomplete`, or `bind` refuses (the item
  and its `differing` list from `p7.json`'s `equal.diagnostics`, or the problems, or the refusal): that composite is dropped from the plan unless the pack author rules a
  fix round (a fresh observation identity; no ended item is rerun).
- **No eligible composite** (SA-Astra's review R08): when no composite is equal on both tiers with complete coverage and
  bound, step 4 and the plan's gates (write-plan, check-prerequisites, dry run) are not run and `V4-P7.json` is not
  created; the task is accepted with that documented result, S02 only writes its report ("no eligible candidate; no
  timing run; 0 counted measurement minutes") and T06a may proceed.
- Stop and report before: running `V4-P7` (S02 is the orchestrator's).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the plan's guard for three composites is not
  1,162.172 s (the approved price is 19.37 minutes); the task looks wrong or contradicts the code; an ambiguity changes
  behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the scope; a recorded
  decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T05b-B01 | Only composites proved equal on both tiers, as the trees to be timed, are timed, within the owner's 20 minutes; with none, no plan exists | the full reports and `bind` lines; the plan's guard; the dry run; or the documented no-candidate result | `p7.json` files; `V4-P7.json` or its absence |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T05b-T01 | Outcome (1): the full equality reports are `equal` with complete coverage and bind, for the composites in the plan; outcome (2): no eligible composite and no plan | the reports; `bind`; the folder `tools/ig-proto/plans` | `V4-P7E-<c>-full/p7.json` |
| T05b-T02 | `writtenPlan('V4-P7', ...)` gives the Tests table's steps and prices | `--items` | the PASS line |
| T05b-T03 | Outcome (1) only: `check-prerequisites` passes; the dry run gives `go` at 747 | the commands | their outputs |
| T05b-T04 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (each equality report's counts and helper
seconds); each AC row with its evidence; the questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-24 02:50 +07:00 (dispatch, base `5dcd1b4`); 2026-11-24 04:25 +07:00 (accepted); 96 min. The developer reported 02:50:04-04:23:28 |
| Waiting for rulings | none |
| Agent id, model | `21395897-d821-45f5-a029-907534dece99`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 60 calls; 5,077,195 input, 22,383 output, 4,992,806 cache-read tokens |
| AI credits | 93.40 (developer only) |
| Questions and rulings | none; outcome (1): the three composites equal on the full tier and bound. The developer's notes (the missing-`--candidates` refusal printed without the `manifest: ` prefix, as `refuseCommand` already does; two extra command-refusal assertions) change no behaviour |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `self-test --items --task S24-T05b-orch`: 222 passed, 0 failed (35.1 s); the full reports: `p7-c1`, `p7-c1r5`, `p7-c1r5c5` each `equal`, coverage complete, 713 of 713 equal, 0 problems (the developer's locked full runs: 11, 11 and 10 invocations, 1,683.4, 1,655.9 and 1,570.8 helper seconds, locked verification without allocation); `check-prerequisites --plan V4-P7`: pass; dry run at 747: `time-p7-c1`, `time-p7-c1r5`, `time-p7-c1r5c5` go (horizons 885, 835, 525 s), forecast 930 s counted (allocation 960 s, guard 1,200 s); `approval --plan V4-P7`: spentS 11,086.156, requestedAdditionalGuardS 1,162.172, requestedCumulativeRoundMinutes 205; P-0 binding pass; `firewall check --task S24-T05b`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the Scope paths |
| Commit | this task's commit |
| Issues and named items | none; S02 times all three composites |

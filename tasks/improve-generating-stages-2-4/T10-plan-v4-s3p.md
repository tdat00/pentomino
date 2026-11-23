# T10: The plan `V4-S3P` (`write-plan --plan V4-S3P`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.6 (`V4-S3P`: "P-1 passes of the four frozen arms (48 items; receipts `--require-pass`; bindings `--by V4-S3`); then `fr-frozen-none-uncapped` rows on the four Hell 1 boards, reps 0-4 (20 rows; approved, D-S24-27), and their publish (D-S24-24)"; prerequisites "the four variants (the candidate epoch); the P-0 binding"; 71.20 / 89.00 (+ 67.69 / 84.61) counted minutes), §8.2 T10; D-S24-19, D-S24-24, D-S24-27; this pack's D-P24-03 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T09c |
| Depends on | T09c |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 1 h, machine 0 min (unlocked) |

## Goal

The candidate epoch (T08a's four trees) needs its four P-1 proofs, and the freeze's Hell 1 budget needs the 20-request
uncapped check that T11 reads. Both run as one plan, `V4-S3P`, written by T02a's `write-plan` with T11c's builders.

## Authority and fixed points

- D-P24-03 and T02a: `writtenPlan(id)` builds the plan, `write-plan` writes it and its item manifests once
  (`generatedBy` `manifest.mjs write-plan`); `compile` is never run (N-V4-02).
- The proofs are `parityPass('V4-S3P', arm, priceOf, durations)` for each of the four arms in the order `fr-frozen`,
  `fr-frozen-none`, `fr-frozen-uncapped`, `fr-frozen-none-uncapped` (`manifest.mjs:1074`): the locked `parity-<arm>`
  (manifest `tools\ig-proto\plans\items\V4-S3P.parity-<arm>.json`, `parityManifest('V4-S3P', arm)`, 12 items: the
  selection cases, one generation, one replay), the unlocked `receipt-<arm>` with `--require-pass` and the unlocked
  `accept-<arm>` with `--by V4-S3`.
- The Hell 1 check is four `rowStep`s of the arm `fr-frozen-none-uncapped` (variant from `data/frozen-round-v1.json`),
  shards `pilot-<cell>` for `14x14-hell-1`, `20x20-hell-1`, `24x24-hell-1`, `26x26-hell-1`, reps 0-4, row limit 260 s,
  then `publish-fr-frozen-none-uncapped` (D-S24-24: published before T11 reads it).
- The pack author's computation with the same exported functions at the base
  (`docs/improve-generating-stages-2-4/evidence/sa-opus/bt-plans.mjs`, `bt-plans.md`): allocation 139 minutes; guard
  10416.597 s (173.609948 counted minutes; proofs 89.000, Hell 1 rows 84.609948); parity steps `projectS` 978.000, 2
  invocations, `minHorizonS` 270; Hell 1 rows `projectS` 737.810, 1304.000, 737.830, 1011.638 with 1, 2, 1, 2
  invocations, `minHorizonS` 272. `durationsFromLogs()` reads the five fixed historical `DURATION_LOGS`
  (`manifest.mjs:839-840,967-969`), not new P7 runs. Under this pack those logs and the parity reserves/lanes do not
  change; the default prices must reproduce the stated values. A difference is diagnosed and ruled, not silently
  attributed to P7.

## Scope

- Change: `tools/ig-proto/manifest.mjs`: `writtenPlan` gains `V4-S3P` (the usage text of `write-plan` becomes `needs
  --plan <id> (one of V4-S2B, V4-P7, V4-S3P)`; the refusal of an unknown id stays `manifest: unknown written plan <id>`).
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `itemCases`.
- Create (by the command): `tools/ig-proto/plans/V4-S3P.json` and `tools/ig-proto/plans/items/V4-S3P.parity-fr-frozen.json`,
  `V4-S3P.parity-fr-frozen-none.json`, `V4-S3P.parity-fr-frozen-uncapped.json`, `V4-S3P.parity-fr-frozen-none-uncapped.json`.
- Change: `tools/ig-proto/README.md`: `### Written plans (stages 2 to 4 pack)` gains `V4-S3P`.
- Guards: G1, G2 (new files only), G3 (the eight files).

## Steps

1. In `writtenPlan` (T02a's section of `manifest.mjs`), add constants and the branch for `id === 'V4-S3P'`:

   ```js
   /** The four stage-4 arms in the order of their P-1 passes, and the Hell 1 boards of the uncapped check (plan 4.6). */
   const S3P_ARMS = Object.freeze(['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped']);
   const S3P_HELL = Object.freeze(['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']);
   ```

   - `prerequisites = [...S3P_ARMS.map((id) => ({ type: 'variant', id })), { type: 'accepted', path: P0_BINDING, current:
     ['v4'] }]` (`P0_BINDING`, `manifest.mjs:819`);
   - `proofs = S3P_ARMS.flatMap((arm) => parityPass('V4-S3P', arm, priceOf, durations ?? durationsFromLogs()))`;
   - `rows = S3P_HELL.map((cell) => rowStep({ task: 'V4-S3P', arm: 'fr-frozen-none-uncapped', shard: \`pilot-${cell}\`,
     cell, from: 0, to: 4, rows: 5, rowLimitS: 260 }, priceOf, rowS({ cell, rowLimitS: 260 })))`;
   - `plan = planOf({ task: 'V4-S3P', generatedBy: WRITE_PLAN_GENERATED_BY, runnable: true, blockedBy: [], prerequisites,
     steps: [gateStep('V4-S3P', prerequisites), firewallSnapshotStep('V4-S3P'), treesStep(S3P_ARMS), ...proofs, ...rows,
     publishStep('V4-S3P', 'fr-frozen-none-uncapped', rows), firewallCheckStep('V4-S3P')] })`;
   - `itemManifests = Object.fromEntries(S3P_ARMS.map((arm) => [\`V4-S3P.parity-${arm}.json\`, parityManifest('V4-S3P', arm)]))`.

   The refusal of an unknown id stays `manifest: unknown written plan <id>` (T02a); only the usage text gains `V4-S3P`.
2. Run (unlocked) `node tools\ig-proto\manifest.mjs write-plan --plan V4-S3P --label frozen --source-label "frozen
   3fc65f4"`. Expected: `write-plan: wrote tools/ig-proto/plans/V4-S3P.json (21 steps, 8 locked; allocation 139 min,
   optional 0 min)` and four `write-plan: wrote tools/ig-proto/plans/items/V4-S3P.parity-<arm>.json` lines.
3. Run `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S3P --label frozen --source-label "frozen
   3fc65f4"`: `prerequisites: pass`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `write-plan: V4-S3P` | `writtenPlan('V4-S3P')` | `plan.task` `V4-S3P`; `generatedBy` `manifest.mjs write-plan`; `runnable` true; `prerequisites` deep-equal the four `variant` entries and `{ type: 'accepted', path: 'docs/improve-generating/evidence/frozen/V4-S2P/p0-v4.accepted.json', current: ['v4'] }`; step ids in order `prerequisites, firewall-snapshot, trees`, then for each arm `parity-<arm>, receipt-<arm>, accept-<arm>`, then `rows-fr-frozen-none-uncapped-pilot-14x14-hell-1`, `...-20x20-hell-1`, `...-24x24-hell-1`, `...-26x26-hell-1`, `publish-fr-frozen-none-uncapped, firewall-check` (21); the `trees` node builds the four arms; `accept-fr-frozen`'s node ends `'--by', 'V4-S3'`; `receipt-fr-frozen`'s node ends `'--arm', 'fr-frozen', '--require-pass'`; each row node ends `'--cases', '<cell>:0-4', '--row-limit-s', '260'` with `--variant fr-frozen-none-uncapped`; `allocationMinutes` 139; `Math.round(planGuardS(plan) * 1000) / 1000` 10416.597; `itemManifests` has the four names, each deep-equal to `parityManifest('V4-S3P', arm)` |
| same case | (refusal) | `writtenPlan('V4-XX')` | throws `manifest: unknown written plan V4-XX` (T02a's oracle, unchanged) |

## Documentation

README, `### Written plans (stages 2 to 4 pack)`: "`V4-S3P` (T10): the four P-1 proofs of the candidate epoch (bindings
`--by V4-S3`) and the 20 uncapped Hell 1 rows of `fr-frozen-none-uncapped` (D-S24-27), published for T11."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T10 --label frozen` | repository root, first | `firewall: snapshot of S24-T10` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T10 --horizon-s 285` | repository root (unlocked) | every case `PASS` | 5 min |
| `node tools\ig-proto\manifest.mjs write-plan --plan V4-S3P --label frozen --source-label "frozen 3fc65f4"` | repository root | as step 2 | 1 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-S3P --label frozen --source-label "frozen 3fc65f4"` | repository root | `prerequisites: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T10 --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the eight files | 1 min |

The dry run and the approval re-read are S03's (the proofs' cap is the owner's).

## Stop points and questions

- Stop and report if `write-plan` reports another number of steps or locked steps, or another allocation or guard than
  139 minutes and 10416.597 s: the five `DURATION_LOGS` and the parity reserves and lanes do not change under this pack,
  so a difference is diagnosed and ruled by the pack author, never attributed to P7 and never written as a plan.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10-B01 | The proofs of the candidate epoch and the approved Hell 1 check are one plan, priced by the round's rules, ready for the owner's approval of the proofs | the case; the command's line | the outputs |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T10-T01 | `writtenPlan('V4-S3P')` gives the steps, nodes, prerequisites, prices and item manifests of the Tests table | `--items` | the PASS line |
| T10-T02 | The plan and its four item manifests are written once; `check-prerequisites` passes | the commands | their output |
| T10-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the allocation, the guard); each AC row with
its evidence; the questions and rulings; the deviations; and the named items for later.

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

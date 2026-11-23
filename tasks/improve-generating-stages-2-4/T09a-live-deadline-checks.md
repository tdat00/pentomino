# T09a: The live verification's identity record and the live-deadline row and verification checks

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.5 (Receipt and acceptance: "binding the verification records and the ten `V4-LIVE` rows"), §4.8 (N-V4-13), §6 T4, §8.2 T09; N-V4-13; D-V4-18 (typed receipts); this pack's D-P24-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T08c |
| Depends on | T08c |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (unlocked; synthetic cases) |

## Goal

The live-deadline receipt (T09b) may certify the frozen arms only from evidence that is bound to the code and the trees
it actually tested, and only rows that are valid, of the declared requests, within the bound and with the reserve held.
This task adds the two foundations: (1) every self-test run writes an identity record beside its state (the producer,
the frozen source, the group, the selected case names and the trees it loaded, at execution time), so that the live
verification of S04 is bound to its trees; (2) `tools/ig-proto/live-deadline.mjs` with its constants and the pure
checks of the rows, of their journals and of the verification.

## Authority and fixed points

- SA-Astra's review R12 (the row rule, verbatim): "Judge complete published row objects with `ingestRow`, not `{
  rowKey, run }` alone. Match exactly the ten declared case/rep/seed keys, each once; reject unexpected rows.
  Invalid/censored/missing observations make coverage incomplete; correctness failures and measured deadline
  violations fail. A passing row must be valid, have finite nonnegative `responseMs <= 120000`, and match its declared
  generation request. For a completed set, require finite `igSetMs` in `[0, 48000]`. A batch/complete response cannot
  use null or missing `igSetMs`. For a failed set, require a valid set-stage terminal reason and `responseMs <= 48000`;
  this includes `set:reserve-cut`. Thus the existing 2-second assembly allowance is explicit and applies on both
  successful and failed set paths. Read the corresponding raw journals/linkage, require their ledger closure/identity
  checks and bind their hashes. Missing or unparseable closure evidence is incomplete, not `reserveChecked`."
- SA-Astra's review R13 (the verification record): "The live verification writes its producer hash, frozen
  commit/digest, selected exact case names and the tree IDs/parameter hashes of the tested bounded arms and test
  derivatives at execution time. Its record is separate from or extends the state without changing historical states.
  Require task `V4-LIVE-verify`, label `frozen`, the expected group, unique required passing cases and `done: true`."
  Today's state (`self-test.mjs:10212-10222`) holds names, pass flags and times only; this task adds a separate file
  `self-test/identity.json` and leaves `state.json` and its format unchanged.
- `ingestRow(row, { quantity })` (`verdicts.mjs:139`) judges a published row `{ rowKey, caseId, rep, seed, localRep, run
  }` with `runStatus` (`verdicts.mjs:87`): `invalid`, `incorrect`, `censored`, `error` or `valid`, and checks the run's
  `caseId` and `seed` against the row's. `rowLedger(lines, linkLines)` (`verdicts.mjs:696`) gives `complete` and
  `problems` for one row's worker journals (`logs/<rowKey>.<pid>.<thread>.jsonl`) and link file
  (`logs/<rowKey>.link.jsonl`); `parseLines` reads a JSONL text with its problems.
- `V4-LIVE` (`tools/ig-proto/plans/V4-LIVE.json`, compiled by T11c of the v4 pack, unchanged) runs `fr-frozen` on
  `14x14-nightmare` reps 0-4 (shard `live-14x14-nightmare`) and `26x26-hell-1` reps 0-4 (shard `live-26x26-hell-1`),
  row limit 260 s; `arm.mjs` gives every row the seed `landscape/<caseId>/<rep>` (`arm.mjs:60`) and the key
  `<caseId>~<rep>`.
- The live verification (S04) runs the `LIVE_CASES` of the `--v4` group under the task `V4-LIVE-verify` (D-P24-06):
  T07c's factory (six cases) and T07b's `hostBoundCase` on both bounded twins' test variants (T08c), and `fz: the live
  deadline on the frozen trees` (T08c), fifteen cases.

## Scope

- Change: `tools/ig-proto/self-test.mjs`: `main` writes `self-test/identity.json` after `state.json` (step 1); two cases
  appended to `itemCases` (`--items`).
- Create: `tools/ig-proto/live-deadline.mjs` (this task: the constants of step 3, `LIVE_DECLARED` among them, and the pure
  checks `rowChecks`, `twinDerivationProblems`, `verifyChecks`; T09b adds the receipt).
- Change: `tools/ig-proto/README.md`: the subsection `### The live-deadline receipt (T09a to T09c)` of `## The frozen
  family (stages 2 to 4 pack)`; the self-test paragraph of `## Commands` names `identity.json`.
- Guards: G1, G2, G3 (the three files).

## Steps

1. **The identity record.** In `main` of `tools/ig-proto/self-test.mjs`, right after the `writeJson(... 'state.json'
   ...)` call (`self-test.mjs:10212-10222` at the base), add:

   ```js
   // The identity of this run (stages 2 to 4 pack T09a, R13): the producer, the source, the group, the cases run and the
   // trees they loaded, at execution time; a separate file, so that historical states keep their format.
   writeJson(join(artifactDir(label, task, 'self-test'), 'identity.json'), {
     format: 'ig-selftest-identity', version: 1, task, label,
     group: on.has('items') ? 'items' : on.has('v4') ? 'v4' : on.has('frozen') ? 'frozen' : 'default',
     selected: results.map((r) => r.name),
     harnessHash: harnessInfo().harnessHash,
     frozenCommit: label === 'frozen' ? FROZEN_COMMIT : null,
     sourceDigest: label === 'frozen' ? await sourceDigest() : null,
     trees: Object.fromEntries(Object.keys(engines).sort().map((variant) => [variant, {
       treeId: engines[variant].tree.treeId,
       copyDigest: engines[variant].tree.copyDigest,
       paramsHash: sha256(JSON.stringify(engines[variant].tree.params ?? null)),
     }])),
     startedAt, endedAt: new Date().toISOString(),
   });
   ```

   (`engines` is the module's map of the trees `engine(variant)` loaded in this run; `harnessInfo`, `sha256`,
   `sourceDigest`, `FROZEN_COMMIT`, `writeJson`, `artifactDir` are imported already.)
2. Create `tools/ig-proto/live-deadline.mjs` (`// @ts-check`; header comment: "The live-deadline receipt (N-V4-13;
   stages 2 to 4 pack T09a to T09c; plan 4.5): kind `live-deadline` with the fields LIVE_DEADLINE_FIELDS, binding the
   live verification of S04 and the ten rows of V4-LIVE, for both bounded twins. Unlocked: it reads records, copies the
   inputs it binds and writes the receipt once; it rates nothing."). Imports for this task: `isDeepStrictEqual` from
   `node:util`; `FROZEN_COMMIT`, `FROZEN_DIGEST` from `./lib/paths.mjs`; `ingestRow`, `rowLedger` from `./verdicts.mjs`.
3. Export the constants:

   ```js
   export const LIVE_ARMS = Object.freeze(['fr-frozen', 'fr-frozen-none']);
   export const LIVE_TWINS = Object.freeze(['fr-frozen-live-test', 'fr-frozen-none-live-test']);
   export const LIVE_VERIFY_TASK = 'V4-LIVE-verify';
   export const FREEZE_PATH = 'docs/improve-generating/evidence/frozen/V4-S3/freeze.json';
   export const LIVE_SET_MS = 48000;
   export const LIVE_RESPONSE_MS = 120000;
   /** The ten declared requests of V4-LIVE: `fr-frozen`, 14x14 Nightmare and 26x26 Hell 1, reps 0-4. */
   export const LIVE_DECLARED = Object.freeze(['14x14-nightmare', '26x26-hell-1'].flatMap((caseId) => [0, 1, 2, 3, 4]
     .map((rep) => Object.freeze({ rowKey: `${caseId}~${rep}`, caseId, rep, seed: `landscape/${caseId}/${rep}` }))));
   export const LIVE_ROWS = Object.freeze(LIVE_DECLARED.map((d) => d.rowKey));
   const FACTORY_CASES = Object.freeze([
     'the set stage is cut by the reserve', 'one clock from the request start and the prefix at the stop',
     'the same puzzles at widths 1, 2, 4 and 8 without a cut', 'a cut leaves a prefix of the same fold at every width',
     'the deadline applies to the listed levels only', 'the host bound around a held assembly',
     "the host's hard response bound",
   ]);
   /** The fifteen self-test cases of the live verification (T07b, T07c, T08c), on both bounded twins. */
   export const LIVE_CASES = Object.freeze([
     ...LIVE_TWINS.flatMap((v) => FACTORY_CASES.map((n) => `live ${v}: ${n}`)),
     'fz: the live deadline on the frozen trees',
   ]);
   export const LIVE_COVERAGE = Object.freeze([...LIVE_ROWS, ...LIVE_CASES.map((n) => `self-test:${n}`)]);
   /** Each bounded twin's frozen parent (T08c): the twin extends its parent and `w8`, nothing else (R2-06). */
   export const LIVE_TWIN_OF = Object.freeze({ 'fr-frozen-live-test': 'fr-frozen', 'fr-frozen-none-live-test': 'fr-frozen-none' });
   /** The one parameter a twin may change: its test deadline, also on the fixture level 'hard' (T08c). */
   export const LIVE_TEST_DEADLINE = Object.freeze({
     id: 'deadline-test', levels: Object.freeze(['hard', 'nightmare', 'hell-1']), reserve: 0.6, setStageCapMs: 46000,
     generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000,
   });
   ```

   `LIVE_TEST_DEADLINE` is the `liveDeadline` of T08c's two test variants exactly.

4. Export `rowChecks(rows, journals)` (pure). `rows`: every published row of the runs files (`{ rowKey, caseId, rep,
   seed, localRep, run }`), in file order; `journals`: `Record<rowKey, { lines: any[], links: any[] | null, problems:
   string[] }>` (the parsed raw journals of each row; `problems` the read and parse problems). Returns `{ observed,
   failures, incomplete, table }`:
   - identity: a row whose `rowKey` is not in `LIVE_ROWS` adds `unexpected row <rowKey>` to `incomplete`; a second row
     of a key adds `row <rowKey> is published <n> times`; a row whose `caseId`, `rep` or `seed` differs from its
     `LIVE_DECLARED` entry adds `row <rowKey> is not its declared request`; such rows are not judged further;
   - `const g = ingestRow(row, { quantity: 10 })`: `g.status` `invalid` or `censored` adds `row <rowKey>: <status>:
     <problems joined by '; '>` to `incomplete`; `incorrect` or `error` adds the same text to `failures`; a run with an
     error of code `child-timeout` adds `row <rowKey>: killed at the row limit` to `failures` whatever its status;
   - the bound (every row with a finite `run.responseMs`): `responseMs` below 0 or above `LIVE_RESPONSE_MS` adds `row
     <rowKey>: response <ms> ms outside [0, 120000]` to `failures`;
   - the reserve: when `run.partialReason` starts with `set:` (a failed set), `responseMs` above `LIVE_SET_MS` adds `row
     <rowKey>: the set stage ended at <ms> ms, over 48000` to `failures`; otherwise (a completed set) `run.igSetMs` not a
     finite number adds `row <rowKey>: no igSetMs for a completed set` to `incomplete`, and one outside `[0, 48000]`
     adds `row <rowKey>: set stage <ms> ms outside [0, 48000]` to `failures`;
   - the journals: `journals[rowKey]` absent, or with `problems`, adds `row <rowKey>: unreadable journals: <problems>`
     to `incomplete`; else `rowLedger(lines, links)` not `complete` adds `row <rowKey>: journal not closed: <problems>`
     to `incomplete`;
   - `observed`: the declared keys present once, of their declared request, whose status is `valid` and that added
     nothing to `incomplete`; `table`: `{ rowKey, status, responseMs, igSetMs, partialReason, acceptedCount,
     ledgerComplete }` per declared key present, in `LIVE_ROWS` order.
5. Export `twinDerivationProblems(parents, twins)` (pure; SA-Astra's review R2-06). `parents` and `twins`:
   `Record<id, info | undefined>`, each `info` a tree's `ig-tree.json` as captured (T09b; `lib/tree.mjs:317-329`: `{
   variant, chain, treeId, copyDigest, edits: [{ id, ... }], files: { <path>: <sha256> }, params }`). Returns the
   problems, for each of `LIVE_TWINS` in order, `p = parents[LIVE_TWIN_OF[twin]]`, `d = twins[twin]`:
   - `no captured tree metadata for <parent>` when `p` is absent; `no captured tree metadata for <twin>` when `d` is
     absent (and nothing else for that twin);
   - `the test derivative <twin> is not <parent> with w8` unless `isDeepStrictEqual(d.chain, [...p.chain, 'w8', twin])`
     (the twin's manifest chain is its parent's, then `w8`, then itself: no other parent, no other ancestor);
   - `the test derivative <twin> has an edit other than w8-1` unless the edit ids `d.edits.map((e) => e.id)` equal `[...
     p.edits.map((e) => e.id).filter((id) => id !== 'meta-2'), 'w8-1', 'meta-2']` (no own edit; `meta-2` is the
     builder's generated last edit);
   - `the test derivative <twin> adds a file` unless `isDeepStrictEqual(Object.keys(d.files).sort(),
     Object.keys(p.files).sort())`;
   - `the test derivative <twin> changes a parameter other than liveDeadline` unless the two `params` without their
     `variant` and `liveDeadline` keys are deep-equal;
   - `the test derivative <twin> has another test deadline` unless `isDeepStrictEqual(d.params.liveDeadline,
     LIVE_TEST_DEADLINE)`.
6. Export `verifyChecks({ state, identity, freezeVariants, parents, twins, harnessHash })` (pure). `state` and `identity`
   the verification's two records (or null); `freezeVariants` `freeze.json`'s `variants`; `parents` and `twins` the
   captured `ig-tree.json` of the two frozen arms and of the two test derivatives (T09b; a twin only when its `treeId`
   equals the identity's); `harnessHash` the runs' producer. Returns `{ observed, failures, incomplete }`:
   - `incomplete`: `no verification identity` (null `identity`) or `no verification state` (null `state`), and then
     nothing else; `the verification identity is not ig-selftest-identity version 1` unless `identity.format ===
     'ig-selftest-identity' && identity.version === 1`; `the verification identity lacks <field>` for each of
     `selected` (an array), `harnessHash`, `startedAt`, `endedAt` (strings) and `trees` (an object) that is not of that
     type; `the verification record is <task>/<label>/<group>, not V4-LIVE-verify/frozen/v4` unless
     `identity.task === LIVE_VERIFY_TASK && identity.label === 'frozen' && identity.group === 'v4'` and `state.task ===
     LIVE_VERIFY_TASK && state.label === 'frozen'`; `the verification ran another producer` (`identity.harnessHash !==
     harnessHash`); `the verification ran another source` (`identity.frozenCommit !== FROZEN_COMMIT ||
     identity.sourceDigest !== FROZEN_DIGEST`); for each of `LIVE_ARMS`: `the verification tested another tree <id>` when
     `identity.trees[id]` is absent or its `treeId` or `paramsHash` differs from `freezeVariants[id]`; for each of
     `LIVE_TWINS`: the same text when `identity.trees[id]?.treeId !== twins[id]?.treeId` or `twins[id]` is absent; then
     `twinDerivationProblems(parents, twins)`, so that a twin whose recorded tree id equals the captured one is still
     refused when it is not its frozen parent with `w8` and its test deadline; `the verification selected <name> <n>
     times` for a `LIVE_CASES` name selected more than once;
   - `failures`: `the live verification is not done` when `state.done !== true`; `self-test case <name> failed:
     <reason>` for each `LIVE_CASES` name with a `pass: false` result;
   - `observed`: `self-test:<name>` for each `LIVE_CASES` name selected once with a `pass: true` result (a name never
     selected is missing, not observed).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `live-deadline: row checks` | ten clean rows of `LIVE_DECLARED` built with `matrixRun(caseId, rep, 10, { igSetMs: 30000 })` (`responseMs` 31000) and, for each key, `journals[key]` the closed ledger of the `ledger:` cases (`ledgerLines()`: call `<key>:1:2:1` = `S(c, 'set', 0, 10), C(c), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10), E(c, 160, 2, 0)`; links `[{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }]`; problems `[]`); then one variant at a time: (1) row 3 `responseMs` 120001; (2) row 4 `responseMs` -1; (3) row 5 an error `{ phase: 'host', code: 'child-timeout', message: 'x' }`; (4) row 6 `partialReason` `error:internal` with an error `{ phase: 'batch', code: 'internal', message: 'x' }`; (5) row 7 `measurementValid: false`; (6) row 8 `interrupted: true`; (7) row 9 with `seed` `landscape/14x14-nightmare/9` on both the row and its run; (8) row 1 `igSetMs: null` with `partialReason` null; (9) row 2 rebuilt as `matrixRun('14x14-nightmare', 2, 0, { partialReason: 'set:reserve-cut', igSetMs: null, responseMs: 110000 })`; (10) the same with `responseMs` 46000; (11) row 0 published twice; (12) an extra row `14x14-nightmare~7`; (13) row 0 without its link file (`links` null); (14) row 1 with `igSetMs` 48001 | clean: ten observed, no failure, nothing incomplete; (1) and (2) one failure each (`response ... outside [0, 120000]`); (3) failure `killed at the row limit` (and the row `censored` in `incomplete`); (4) one failure (`error`); (5) and (6) `censored` in `incomplete`, nine observed; (7) `row 26x26-hell-1~4 is not its declared request` in `incomplete`; (8) `no igSetMs for a completed set` in `incomplete`; (9) failure `the set stage ended at 110000 ms, over 48000`; (10) no failure, nothing incomplete for that row (a clean reserve cut); (11) `row 14x14-nightmare~0 is published 2 times`; (12) `unexpected row 14x14-nightmare~7`; (13) `journal not closed: no linkage`; (14) failure `set stage 48001 ms outside [0, 48000]` |
| same | `live-deadline: verification checks` | `state` `{ task: 'V4-LIVE-verify', label: 'frozen', done: true, results: <the fifteen LIVE_CASES names, pass true> }`; `identity` `{ format: 'ig-selftest-identity', version: 1, task: 'V4-LIVE-verify', label: 'frozen', group: 'v4', selected: <the fifteen names>, harnessHash: 'h', frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST, trees: { 'fr-frozen': { treeId: 't1', paramsHash: 'p1' }, 'fr-frozen-none': { treeId: 't2', paramsHash: 'p2' }, 'fr-frozen-live-test': { treeId: 'd1' }, 'fr-frozen-none-live-test': { treeId: 'd2' } }, startedAt: 'a', endedAt: 'b' }`; `freezeVariants` with `t1`/`p1` and `t2`/`p2`; `parents` `{ 'fr-frozen': P1, 'fr-frozen-none': P2 }` with `P1 = { variant: 'fr-frozen', chain: ['base', 'fr-frozen'], treeId: 't1', copyDigest: 'c1', edits: [{ id: 'meta-1' }, { id: 'a-1' }, { id: 'meta-2' }], files: { 'core/engine/ig-params.js': 'x1' }, params: { variant: 'fr-frozen', callBudget: 1, liveDeadline: 'frozen' } }` and `P2` the same with `fr-frozen-none` and `t2`; `twins` `{ 'fr-frozen-live-test': D1, 'fr-frozen-none-live-test': D2 }` with `D1 = { variant: 'fr-frozen-live-test', chain: ['base', 'fr-frozen', 'w8', 'fr-frozen-live-test'], treeId: 'd1', copyDigest: 'e1', edits: [{ id: 'meta-1' }, { id: 'a-1' }, { id: 'w8-1' }, { id: 'meta-2' }], files: { 'core/engine/ig-params.js': 'y1' }, params: { variant: 'fr-frozen-live-test', callBudget: 1, liveDeadline: LIVE_TEST_DEADLINE } }` and `D2` the same with `fr-frozen-none`, `fr-frozen-none-live-test` and `d2`; `harnessHash` `'h'`; then one variant at a time: (1) `identity.task` `S24-T09a`; (2) `identity.label` `selftest`; (3) `identity.trees['fr-frozen-live-test'].treeId` `d9` (a stale test tree); (4) `harnessHash` `'g'` (a changed producer); (5) `identity` null; (6) `identity.sourceDigest` `'x'` (mixed source digests); (7) one case `pass: false`; (8) `done: false`; (9) one name selected twice; (10) one name not selected; (11) `identity.format` `'x'`; (12) `identity` without `endedAt`; (13) `D1.chain` `['base', 'fr-frozen-none', 'w8', 'fr-frozen-live-test']` (the wrong parent; the recorded and captured tree ids still equal); (14) `D1.edits` with `{ id: 'x-1' }` before `w8-1` (an extra edit); (15) `D1.params.callBudget` 2 (an unauthorized parameter); (16) `D1.params.liveDeadline` with `levels: ['hard']`; (17) `D1.files` with the extra path `core/engine/x.js`; (18) `parents['fr-frozen']` absent | clean: fifteen observed, no failure, nothing incomplete; then (1) `incomplete` with `the verification record is S24-T09a/frozen/v4, not V4-LIVE-verify/frozen/v4`; (2) the same text with `V4-LIVE-verify/selftest/v4`; (3) `the verification tested another tree fr-frozen-live-test`; (4) `the verification ran another producer`; (5) `no verification identity`; (6) `the verification ran another source`; (7) a failure `self-test case <name> failed: ...`; (8) a failure `the live verification is not done`; (9) `the verification selected <name> 2 times`; (10) fourteen observed (the fifteenth missing); (11) `the verification identity is not ig-selftest-identity version 1`; (12) `the verification identity lacks endedAt`; (13) `the test derivative fr-frozen-live-test is not fr-frozen with w8`; (14) `the test derivative fr-frozen-live-test has an edit other than w8-1`; (15) `the test derivative fr-frozen-live-test changes a parameter other than liveDeadline`; (16) `the test derivative fr-frozen-live-test has another test deadline`; (17) `the test derivative fr-frozen-live-test adds a file`; (18) `no captured tree metadata for fr-frozen` |
| the gate (unlocked) | the identity record | the `--items` run of this task's gate | `tests\artifacts\ig-proto\frozen\S24-T09a\self-test\identity.json` exists with `format` `ig-selftest-identity`, `task` `S24-T09a`, `label` `frozen`, `group` `items`, `selected` equal to the state's result names, `harnessHash` today's, `frozenCommit` the frozen commit |

## Documentation

README: the subsection `### The live-deadline receipt (T09a to T09c)`: the identity record of every self-test run
(fields; a separate file; historical states unchanged); the declared rows, the cases and the coverage (25 ids); the row
rule (the statuses, the bound, the reserve on both set paths, the journals); the verification rule (the identity
record's format and fields, the trees, and each test derivative's derivation: its frozen parent with `w8` and its test
deadline only, checked on the captured `ig-tree.json`). `## Commands`: the
self-test line says "writes `self-test/state.json` and `self-test/identity.json`".

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T09a --label frozen` | repository root, first | `firewall: snapshot of S24-T09a` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T09a --horizon-s 285` | repository root (unlocked) | every case `PASS`, the two cases above among them | 5 min |
| `$i = Get-Content -Raw tests\artifacts\ig-proto\frozen\S24-T09a\self-test\identity.json \| ConvertFrom-Json; $s = Get-Content -Raw tests\artifacts\ig-proto\frozen\S24-T09a\self-test\state.json \| ConvertFrom-Json; "$($i.format) $($i.task) $($i.label) $($i.group) $(@($i.selected).Count -eq @($s.results).Count)"` | repository root | `ig-selftest-identity S24-T09a frozen items True` | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T09a --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

## Stop points and questions

- Stop and report if `plans/V4-LIVE.json`'s row steps differ from the Authority section's description: the plan file is
  fixed (G2) and the checks follow it.
- Send `QUESTION:` to the pack author (through the orchestrator) when: a clean synthetic row is not `valid` for
  `ingestRow` or the closed ledger is not `complete` for `rowLedger`; the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09a-B01 | Only valid rows of the ten declared requests, answered within 120 s with the reserve held on both set paths and with closed journals, can count; a verification counts only when it is bound to the producer, the source and the trees it tested | the two cases | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T09a-T01 | `rowChecks`, `twinDerivationProblems` (through `verifyChecks`) and `verifyChecks` give the Tests table's results, the reviewers' counterexamples included (a twin with a consistent tree id but the wrong parent, an extra edit or another parameter) | `--items` | the PASS lines |
| T09a-T02 | Every self-test run writes `self-test/identity.json`; `state.json` keeps its format | the identity gate | its output |
| T09a-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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

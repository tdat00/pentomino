# T02b: The fitting reader, part 1: the declared grid, the no-regression preview and the call prefixes (pure)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §8.2 T02 ("its reading script: the no-regression preview against MP12b1's reps 0-4, and the uncapped call prefixes read against the proposed 10 G limit"), §8.2 T11 (the read gate), §4.4, §4.7 (fitting reps only); pack decision D-P24-07 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T02a |
| Depends on | T02a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure functions; unlocked) |

## Goal

Two readings decide whether the frozen values may be written: whether the controls that stage 2 did not pilot keep
today's speed on the no-screen arm (S01, on `V4-S2B`), and whether the proposed P5 budgets and attempt bound could
have stopped an observed call or request (S01 at 10 G; T11 on `V4-S3P`'s uncapped Hell 1 rows at 40 G with the
four-attempt bound). This task writes the pure core of one read-only tool for both, `tools/ig-proto/fit-read.mjs`:
the declared grid of a plan, the validated preview of one cell, the call prefixes of one row and the bound. Missing,
invalid or ambiguous evidence is always reported with its reason and never becomes a completion, zero work or a clear
reading. T02c adds the two commands and their records.

## Authority and fixed points

- Plan §8.2 T02 and S-1: the preview is "a fitting warning, not a five-seed no-regression verdict"; `fr-none` does not
  enforce the 10 G budget, so its calls' prefixes are read against it.
- T11's read gate (plan §8.2, D-S24-24), restated: "The reader accumulates main, census and uniqueness units in
  primitive order. It identifies any recorded next primitive whose selection-call spent total before it is at least the
  proposed budget; a terminated call whose completed spent total already reaches the budget is flagged as potentially
  affected, even without a following begin line. A currently running primitive is not assumed cut by P5: the check is
  between primitives, not inside one." And: "The reader also tests the first-four same-side no-window condition from
  the set-call ends."
- SA-Astra's review R03 (the contract, verbatim where quoted): "Export `fitScope(plan, arm)`, returning the
  duplicate-free declared `{ rowKey, caseId, rep, seed }` grid from the plan's `arm.mjs run` steps for that arm ...
  Reject an absent arm, duplicate declaration or any fitting rep outside 0-4. The seed is exactly
  `landscape/<caseId>/<rep>`." "Require exactly one row for each declared key, a matching case/rep/seed, and
  `ingestRow(row, { quantity: 10 }).status === 'valid'`. Judge today's MP12b1 record with `runStatus` after
  `withoutSampling` and require the same seed. A duplicate, missing, malformed, incorrect, censored or erroneous member
  contributes no ratio and is reported with its reason; it never becomes a completion. Null, zero or non-finite ratios
  cannot pass." "Reject duplicate/unowned starts, duplicate ends, primitive ordering/type errors and invalid units as
  ambiguous, preserving the reasons. Legitimate pre-selection failures/terminated calls keep the existing ledger
  semantics."
- The no-regression quantity is T09b's of the v4 pack (`verdicts.mjs`): per rep `cappedT10(today) / cappedT10(after)`,
  today being MP12b1's run of the same seed with its sampling phase removed (`manifest.mjs` `withoutSampling`); its
  lower bound is `noRegression(ratios, reps, { resamples: 10000, resampleSeed: 20261116 })`. `ingestRow`
  (`verdicts.mjs:139`) and `runStatus` (`verdicts.mjs:87`) judge a row and a run record.
- The work units of a call are those of the journal: a `p` line's `tuple[4] + tuple[5]` (main and census work) and a
  `count` line's `units`, each paired with the `begin` line before it (`verdicts.mjs` `rowLedger`, line 696; the
  pairing of `docs/improve-generating-stages-2-4/evidence/sa-astra/review-records.mjs` `parseCalls`, lines 41-66).
- The plans' row steps: `V4-S2B`'s `rows-fr-none-pilot-<cell>` and `V4-S3P`'s `rows-fr-frozen-none-uncapped-pilot-<cell>`
  run `arm.mjs run ... --arm <arm> --shard pilot-<cell> ... --cases <cell>:0-4` (T02a, T10); `arm.mjs` gives the seed
  `landscape/<caseId>/<rep>` (`arm.mjs:60`) and the key `<caseId>~<rep>`.

## Scope

- Create: `tools/ig-proto/fit-read.mjs` with the exported pure functions `fitScope`, `declaredRowProblem`,
  `previewCell`, `callPrefixes`, `boundFirings` (T02c adds the commands to this file).
- Change: `tools/ig-proto/self-test.mjs`: four cases appended to `itemCases` (`--items`).
- Do not change: every other file. Guards: G1, G2, G3; G3 lists only `tools/ig-proto/fit-read.mjs` and
  `tools/ig-proto/self-test.mjs` (the README section is T02c's).

## Steps

1. Create `tools/ig-proto/fit-read.mjs` (`// @ts-check`, the harness's conventions; a header comment naming T02b and
   T02c and the two usage lines of T02c). Imports for this task: `cappedT10`, `geoMean`, `ingestRow`, `noRegression`,
   `reachedTen`, `runStatus` from `./verdicts.mjs`; `withoutSampling` from `./manifest.mjs`.
2. `export function fitScope(plan, arm)`: from every step of `plan.steps` whose `node[0]` ends with `arm.mjs` and whose
   `node[1]` is `run` and whose `--arm` value is `arm`, read `--shard` and each comma-separated `--cases` entry
   `<caseId>:<from>-<to>`; return `[{ rowKey: \`${caseId}~${rep}\`, caseId, rep, seed: \`landscape/${caseId}/${rep}\`,
   shard }]` for `rep` from `from` to `to`, in step order. Throws `fit-read: the plan <plan.task> has no rows of <arm>`
   when nothing is declared, `fit-read: <rowKey> is declared twice`, `fit-read: rep <rep> of <caseId> is not a fitting
   rep (0-4)`, and `fit-read: bad --cases entry <entry>` for an entry that does not match `^([^:]+):(\d+)-(\d+)$`.
3. `export function declaredRowProblem(declared, row)` (pure; SA-Astra's review R2-03, shared by both commands): null
   when the published `row` is the declared one, else `wrong declared identity (<field> <JSON seen>, declared <JSON
   want>)` for the first differing field of: `row.rowKey` against `declared.rowKey`, `row.caseId` against
   `declared.caseId`, `row.rep` against `declared.rep`, `row.seed` against `declared.seed`, and, when `row.run` is an
   object, `run.caseId` against `declared.caseId` and `run.seed` against `declared.seed` (the field names `run.caseId`,
   `run.seed`). `ingestRow` compares the run with its own row only (`verdicts.mjs:139-159`), so a row and run that agree
   on another seed pass it; this check runs first, and a row it rejects is `invalid` and never yields a ratio or a clear
   reading.
   `export function previewCell(cell, declared, published, todayRuns, { quantity = 10, capMs = 120000 } = {})`:
   `declared` the cell's entries of `fitScope`, `published` every published row of the arm whose `caseId` or `rowKey`
   names the cell (duplicates included), `todayRuns` MP12b1's run records of the cell (`report.runs`). Per declared
   rep, in rep order, a pair `{ rep, ratio, problem }`, `problem` the first that applies:
   - `no published row` / `<n> published rows` (not exactly one row with the declared `rowKey`);
   - `declaredRowProblem(declared entry, row)` when not null;
   - `after <status>: <problems joined by '; '>` (`ingestRow(row, { quantity }).status !== 'valid'`);
   - `no MP12b1 run` / `<n> MP12b1 runs` (not exactly one run with `probeKind === 'generation'` and that `rep`);
   - `MP12b1 seed <seed>` (its `seed` is not the declared seed);
   - `today <status>: <problems>` (`runStatus(withoutSampling(run), { quantity }).status !== 'valid'`);
   - `ratio <x>` (the ratio `cappedT10(withoutSampling(today), { quantity, capMs }) / cappedT10(after.run, { quantity,
     capMs })` is not a finite number above 0).
   `ratio` is the ratio when `problem` is null, else null. Returns `{ cell, declared: declared.length, pairs, todayTen,
   afterTen, ratios, geo, lower, pass, problems }`: `todayTen` and `afterTen` count the reps without problem whose run
   reached ten (`reachedTen`); `ratios` the pairs' ratios (null for a problem); `geo` `geoMean` of the non-null ratios
   or null; `problems` `['rep <r>: <problem>', ...]`; `lower` and `pass` from `noRegression(ratios, reps, { resamples:
   10000, resampleSeed: 20261116 })` only when every declared rep has a ratio and there are five, else both null.
4. `export function callPrefixes(lines, budgets)`: `lines` the journal lines of one row (every worker file of the row in
   file-name order, lines in order; never the `.link.jsonl` file), `budgets` a level id to units (for example `{
   nightmare: 10000000000 }`). Calls are keyed by `call`: a second `start` of a call makes it `ambiguous` (`duplicate
   start`); a line of the types `p`, `count`, `begin`, `end`, `phase`, `caps` whose `call` has no `start` is collected
   in the row-level list `unowned` (the call ids, once each) and makes the return's `problems` hold `unowned <t> line
   <call>`. For each call in the order of its `start` line: `level` = `start.level`, `stage` = `start.stage`, `attempt`
   = `start.attempt ?? null`, `budget` = `budgets[level] ?? null`; walk its lines in order: a `begin` line opens a
   primitive (one already open: problem `begin while a primitive is open`); a `p` line (units `tuple[4] + tuple[5]`) or
   a `count` line (units `units`) closes it (none open: problem `<t> without an open primitive`); units that are not
   finite numbers from 0 give the problem `invalid units`; a second `end` gives `duplicate end`; before each `begin`,
   `spentBefore` is the total so far; `firstAffected` is the 0-based index (in begin order) of the first `begin` whose
   `spentBefore >= budget`, else null; `spent` the total of the closed primitives; `ended` whether an `end` exists;
   `open` whether a primitive is open after the last line; `endResult` `end?.locate?.result ?? null`. When the call
   ended, `spent !== end.work + end.locate.countWork` gives the problem `end mismatch`. Status: `ambiguous` when the
   call has a problem (its `problems` keep every reason); else `no-budget` when `budget === null`; else `affected` when
   `firstAffected !== null`; else `potentially-affected` when `!ended && spent >= budget`; else `clear`. Returns `{
   calls: [{ call, level, stage, attempt, budget, spent, ended, open, firstAffected, endResult, status, problems }],
   unowned, problems }` (the row-level `problems`; a terminated call keeps the ledger's semantics: it is not ambiguous
   for being open).
5. `export function boundFirings(calls, bound)`: from the `set`-stage calls of one row (`callPrefixes(...).calls`): the
   bound fires when the calls of attempts 0 to `bound - 1` all exist, none is `ambiguous`, all ended, and all have
   `endResult` `below-to-one` (side `below`) or all `above-to-max` (side `above`). Returns `{ fires, side, attempts }`
   (`attempts` the number of set calls of the row; `side` null when it does not fire).

## Tests

All four cases are appended to `itemCases` (`--items`, unlocked). The rows are schema-valid (`verdictKit`, `matrixRun`,
`self-test.mjs:953-1035`); `D(cell)` is `fitScope` of a two-step synthetic plan `{ task: 'V4-XX', steps: [{ node:
['tools\\ig-proto\\arm.mjs', 'run', '--task', 'V4-XX', '--arm', 'a', '--shard', 'pilot-x', '--cases', 'x:0-4'] }, {
node: ['tools\\ig-proto\\arm.mjs', 'run', '--task', 'V4-XX', '--arm', 'b', '--shard', 'pilot-y', '--cases', 'y:0-4']
}] }` for arm `a`.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` | `fit-read: the declared grid` | `fitScope(plan, 'a')`; `fitScope(plan, 'z')`; a plan whose two steps both declare `x:0-4` for arm `a`; a plan with `x:0-5`; a plan with `--cases x` | five entries `{ rowKey: 'x~<r>', caseId: 'x', rep: r, seed: 'landscape/x/<r>', shard: 'pilot-x' }`; the throws `fit-read: the plan V4-XX has no rows of z`, `fit-read: x~0 is declared twice`, `fit-read: rep 5 of x is not a fitting rep (0-4)`, `fit-read: bad --cases entry x` |
| same | `fit-read: preview of a cell` | `previewCell('x', D('x'), published, today)` with `published[r] = { rowKey: 'x~<r>', caseId: 'x', rep: r, seed: 'landscape/x/<r>', localRep: 0, run: await matrixRun('x', r, 10, { tenthReadyMs: A[r], responseMs: A[r] }) }` for `A = [10000, 10000, 30000, 80000, 50000]` and `today[r] = await matrixRun('x', r, 10, { tenthReadyMs: T[r], responseMs: T[r] })` for `T = [10000, 20000, 30000, 40000, 50000]`; then one variant at a time: rep 3's row published twice; rep 2's row with `seed` `landscape/x/9` (row and run, which agree); rep 0's row with `rep` 5; rep 1's run `measurementValid: false`; rep 4's row removed; rep 0's MP12b1 run with `seed` `landscape/y/0`; rep 1's run with an error `{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }` | `ratios` `[1, 2, 1, 0.5, 1]`; `geo` 1 (to 1e-12); `todayTen` 5, `afterTen` 5; `problems` `[]`; `lower` and `pass` equal `noRegression([1, 2, 1, 0.5, 1], [0, 1, 2, 3, 4], { resamples: 10000, resampleSeed: 20261116 })`'s; then in turn `rep 3: 2 published rows`, `rep 2: wrong declared identity (seed "landscape/x/9", declared "landscape/x/2")`, `rep 0: wrong declared identity (rep 5, declared 0)`, `rep 1: after censored: measurementValid is false`, `rep 4: no published row`, `rep 0: MP12b1 seed landscape/y/0`, `rep 1: after incorrect: ...`; in each variant that rep's ratio null, `lower` and `pass` null |
| same | `fit-read: call prefixes` | one call `c1` of level `nightmare`: `start`, `begin`, `p` with `tuple[4]` 6e9 and `tuple[5]` 0, `begin`, `count` with `units` 3e9, `begin`, `p` 2e9 + 0, `end` with `work` 8e9 and `locate.countWork` 3e9; budgets `{ nightmare: 9000000000 }`; then: the same with budget 9,000,000,001; a call `c2`: `start`, `begin`, `p` 5e9, `begin`, no `end`, budget 5e9 and then 6e9; a call `c3`: `start`, `begin`, `p` 7e9, no `end`, budget 6e9; `start`, `begin`, `begin`, `p` 1; `start`, `begin`, `p` 5 + 0, `end` with `work` 4 and `locate.countWork` 0; `c1` with two `start` lines; `c1` with two `end` lines; a `p` line of call `zz` without a start; `c1` with a `count` line of `units` -1; `start`, `p` 1 (no `begin`) | `c1`: `spent` 11e9, `ended` true, `firstAffected` 2 (the third begin starts at 9e9 >= 9e9), status `affected`; `firstAffected` null, status `clear`; `c2`: `ended` false, `open` true, `firstAffected` 1, `affected`; then `firstAffected` null, `spent` 5e9, `clear`; `c3`: `potentially-affected`; then `ambiguous` with `begin while a primitive is open`; `ambiguous` with `end mismatch`; `ambiguous` with `duplicate start`; `ambiguous` with `duplicate end`; the return's `unowned` `['zz']` and `problems` `['unowned p line zz']`; `ambiguous` with `invalid units`; `ambiguous` with `p without an open primitive` |
| same | `fit-read: the four-attempt bound` | set calls attempts 0-3 all `endResult` `below-to-one`, bound 4; then attempts 0-2 `below-to-one` and 3 `above-to-max`; attempts 0-3 `above-to-max`; attempt 2 missing; attempts 0-3 `below-to-one` and 4 `hit`; attempt 1 `ambiguous` | `{ fires: true, side: 'below', attempts: 4 }`; `fires` false; side `above`; `fires` false, `attempts` 3; `fires` true, `attempts` 5; `fires` false |

## Documentation

None in this task: T02c writes the README section with the commands.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T02b --label frozen` | repository root, first | `firewall: snapshot of S24-T02b` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T02b --horizon-s 285` | repository root (unlocked) | every case `PASS`, the four above among them | 5 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T02b --label frozen` | repository root, last | `firewall: OK, <n> production files unchanged since the snapshot of S24-T02b` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the two files | 1 min |

## Stop points and questions

- Send `QUESTION:` to the pack author (through the orchestrator) when: a schema-valid synthetic row is not `valid` for
  `ingestRow`; the task looks wrong or contradicts the code; an ambiguity changes behaviour or a contract; a gate fails
  for a reason not covered here; a change is needed outside the scope; a recorded decision would change. Never decide
  such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02b-B01 | A fitting reading counts only the declared, uniquely published, valid rows of the plan whose identity is the declared one (a row and run that agree on another seed, rep or case included), paired with today's valid run of the same seed; every other member is reported with its reason and never becomes a completion or a clear reading | the preview and grid cases | the PASS lines |
| T02b-B02 | The prefix rule is the gate's, between primitives, with terminated calls flagged when their completed total reaches the budget, and every malformed journal made ambiguous with its reason | the prefix case | its PASS line |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02b-T01 | `fitScope`, `declaredRowProblem` (through `previewCell`), `previewCell`, `callPrefixes` and `boundFirings` return the Tests table's values | `--items` | the PASS lines |
| T02b-T02 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
| Start, end, duration | 2026-11-23 23:47 +07:00 (dispatch, base `ce85819`); 2026-11-23 23:57 +07:00 (accepted); 11 min. The developer reported 23:47:20-23:50:24 |
| Waiting for rulings | about 4 min (the pack author's review of the developer's open details) |
| Agent id, model | `0392a3de-977d-47ff-9028-1b99c7d2ad42`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 21 calls; 1,536,024 input, 21,123 output, 1,466,376 cache-read tokens |
| AI credits | 53.20 (developer only) |
| Questions and rulings | no QUESTION; the developer's five open details (late firewall snapshot, `fitScope` refusals, `invalid start line <index>`, `boundFirings` on `set` calls only, `declaredRowProblem` on a non-object) accepted by SA-Opus as ruling R-P24-03, which also amends T02c (each row problem listed once); pack amendment committed before this task's commit |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `self-test --items --task S24-T02b-orch`: 212 passed, 0 failed (31.7 s; cases 209-212 PASS); `firewall check --task S24-T02b`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 `M self-test.mjs`, `?? fit-read.mjs` |
| Commit | this task's commit |
| Issues and named items | later tasks take the firewall snapshot first (R-P24-03); `fitScope` refuses a single-rep `--cases` entry that `arm.mjs` accepts (no plan of this pack uses one) |

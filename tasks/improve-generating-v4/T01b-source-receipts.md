# T01b: Source receipts: different-source identity, the frozen reference policy and the source receipt

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (preconditions: the identity receipt, `identity.mjs` and `compare.mjs` reporting "different source" instead of failing, cells the frozen source hides run as explicit diagnostic offers (D-IG13)), §9; decisions D-V4-01, D-V4-12; drift DR-O15; review RV1-24 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T01a |
| Depends on | T01a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2 h, machine 0 min (nothing rates or times) |

## Goal

Under the frozen label every source-dependent value must come from the frozen source, also inside worker threads,
and MP12b1 must be reported as a different source with whether its puzzles are the same, instead of a failure. This
task fixes the one harness module that still reads the working tree's policy, records an audit of every other static
import, and writes the source receipt that the manifest (T11g) cites.

## Authority and fixed points

- Plan §5.1 preconditions and D-IG13; RV1-24: "Carry that source identity through workerData/engine context; do not
  rely on workers inheriting `--label frozen` in argv."
- `lib/sets.mjs:6` imports the working tree's `pieceCountRange` for `offeredInSource` (`sets.mjs:67-76`). The fix
  reads the offer from the carving engine itself: the engine is loaded from a tree, and a tree is built from the
  selected source (T01a), so its `levels.js` holds that source's `AREAS`. The tree's own policy (with the `instr`
  diagnostic offers) still chooses the piece counts.
- Worker threads receive `treeRoot` in `workerData` (`lib/lanes.mjs:35`); no module that a worker loads may read
  `SOURCE_KIND`.

## Scope

- Create: `tools/ig-proto/receipt.mjs` (step 4); evidence `docs/improve-generating/evidence/frozen/V4-T01b/receipt.json`
  and `receipt.md`.
- Change: `tools/ig-proto/lib/sets.mjs` (step 1), `tools/ig-proto/identity.mjs` (step 2), `tools/ig-proto/self-test.mjs`
  (three cases in `frozenCases`), `tools/ig-proto/README.md` (the audit table, step 3).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T01b --label frozen`,
  expected `files unchanged`; `git status --short -- core generator tests tools/bench`, expected no output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T01b --label frozen`.
1. **`lib/sets.mjs`**: remove the import of `pieceCountRange as worktreePieceCountRange` (line 6). In `carveSet`,
   `offeredInSource` becomes `const lv = engine.levels.level(levelId); const offeredInSource = area >= lv.areas[0] &&
   area <= lv.areas[1] && ks !== null && ks.length > 0;` (the area check that the tree's policy skips under the
   `instr` diagnostic offers, `diag-1`), and the returned object uses it. The header comment of `carveSet` names this
   rule.
2. **`identity.mjs`**:
   - A seed that MP12b1 did not run is a failure only under `provisional`; under any other label the seed's runs start
     without `mp12b1` and the arms are compared among themselves.
   - The MP12b1 report's digest check applies only when MP12b1 ran the seed.
   - Export `export function pairResult(nameA, runA, nameB, runB, sameSource)` (the body of the existing loop's pair
     branch): a pair with `mp12b1` on a different source keeps the comparison it made: `{ ...result, level:
     'different-source', sameResult: result.problems.length === 0, problems: [] }`.
   - The Markdown lists, per seed, `different source, same result` or `different source, other result` for such pairs.
   - Ruling of 2026-11-17 (the first execution's deviations, accepted): the `different-source` rule applies when either
     name is `mp12b1`; the summary gains `differentSource` (seeds with a `different-source` pair),
     `differentSourceSameResult` (those whose `mp12b1~` pairs all have `sameResult: true`) and `withoutMp12b1` (seeds
     without an MP12b1 run), and `metricPrefixOnly` excludes them; the verdict line gains a clause only when
     `differentSource` or `withoutMp12b1` is non-zero. T04d's `identityVerdict` reads `withoutMp12b1`.
3. **Audit** (README section "### Source-dependent imports (V4-T01b)"): a table of every static import in
   `tools/ig-proto/**/*.mjs` from outside `tools/ig-proto/` with its class:

   | Module | Import | Class | Frozen-label handling |
   |---|---|---|---|
   | `lib/records.mjs` | `computeSourceDigest`, `currentVersions`, `APP_VERSION` | source-dependent | read from `sourceRoot()` (T01a) |
   | `lib/sets.mjs` | `pieceCountRange` | source-dependent | removed; the engine's own `levels.js` (step 1) |
   | `boards.mjs` | `buildLandscapeMatrix` | source-dependent | provisional tool; the frozen catalogue check is `receipt.mjs`'s, from `sourceRoot()` |
   | `budgets.mjs`, `compare-r2.mjs`, `compare.mjs`, `fit-prior.mjs`, `identity.mjs`, `pm2.mjs`, `pm4.mjs`, `summary.mjs` | `median`, `percentile`, `summarize` | harness statistics | none needed: pure arithmetic, not part of a measured source |
   | `self-test.mjs` | `SOURCE_FILES`, `checkText` | harness checks | none needed: a guard of the harness and the convention checker |
   | `lib/records.mjs` | `checkText` | harness check | none needed |

   The developer re-runs the search `Select-String -Path tools\ig-proto\*.mjs, tools\ig-proto\lib\*.mjs -Pattern
   "from '(\.\./)+(core|generator|player|bench|record-fixtures|check-conventions|calibrate|node-worker|serve)"` (any
   depth: `lib/*.mjs` reaches the root with `../../../`; it also matches the `from` line of a multi-line import) and
   reports any line the table does not list (`QUESTION:`). Ruling of 2026-11-17: the first execution's pattern
   (`'\.\./(\.\./)?(...)`) missed three-level paths; the README gives this pattern and its result (twelve lines, all in
   the table); dynamic imports are tree- or `sourceRoot()`-based.
4. **`receipt.mjs`** (new; `node tools\ig-proto\receipt.mjs --label frozen --source-label <SL>`; another label: exit 1):
   writes `evidence/frozen/V4-T01b/receipt.json` (`meta` from `buildMeta({ task: 'V4-T01b', label: 'frozen', kind:
   'receipt' })`) holding:
   - `snapshot`: the result of `verifySnapshot()` (T01a) and the manifest's `files` and `digest`;
   - `frozenCommit`, `sourceDigest` (computed), `expectedDigest` (`FROZEN_DIGEST`), `digestEqual`;
   - `versions` (from `sourceVersions()`);
   - `checkEdits`: one entry per variant of `listVariants()` with the number of edits applied and `errors` (from
     `planTree(id, { errors, sources: collectSources() })`);
   - `catalogue`: the differences between `data/boards-v1.json` and the cases of the frozen source, computed as
     `boards.mjs`'s `check` command computes them but with `buildLandscapeMatrix({ seeds: 1 })` imported by file URL
     from `sourceRoot()`'s `tools/bench/calibration-reference.js`, as `{ notOffered: [<case ids>], added: [], differs:
     [] }`;
   - `audit`: the rows of step 3.
   And `receipt.md` ("Frozen source receipt (V4-T01b)", the banner, one table per block). Exit 0 when the snapshot is
   verified, `digestEqual` is true and every variant has no error; else exit 1 with the reason.
   Ruling of 2026-11-17 (the first execution's deviations, accepted): `meta.rerun` is the receipt's own command; when
   the snapshot is not verified the tool writes nothing and exits 1 (its sources cannot be read); when only the digest
   or an edit check fails it writes both files and exits 1.
5. **Self-test** cases (Tests table) appended to `frozenCases`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --frozen` | `frozen: identity of a different source` | `pairResult('mp12b1', a, 'base', b, false)` for two run records that differ in `details.resultDigest` at equal counts | `level: 'different-source'`, `sameResult: false`, `problems: []` |
| same | `frozen: offers come from the tree's source` | `carveSet` (seed `ig-v4/offer/0`, attempt 0) with the frozen `base` engine on `caseBoard('26x26-nightmare')` and on `caseBoard('26x26-hell-1')`, and with the frozen `instr` engine on `caseBoard('26x26-hell-1')` | `base` on 26x26 Nightmare: `ok: true`, `offeredInSource: true`; `base` on 26x26 Hell 1: `{ ok: false, reason: 'not-offered' }` (Hell 1 is offered on no board at `3fc65f4`); `instr` on 26x26 Hell 1: `ok: true` (the diagnostic offers) with `offeredInSource: false` |
| same | `frozen: worker modules do not read the label` | the text of `lib/lane-worker.mjs`, `lib/calls.mjs`, `lib/sets.mjs`, `lib/engine.mjs` | none contains `SOURCE_KIND`, `sourceRoot(` or an import from `../../../core/` |

## Documentation

`tools/ig-proto/README.md` (step 3).

## Commands and gates

These cases carve one set each and rate nothing; they run unlocked (check-list §3.2).

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\receipt.mjs --label frozen --source-label "frozen 3fc65f4"` | root | `receipt.json` and `receipt.md` written; snapshot verified; `digestEqual: true`; every variant without error; `notOffered` lists the 25 Hell cells (12 `hell-1`, 9 `hell-2`, 4 `hell-3`) | 2 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T01b` | root | the nine `--frozen` cases pass (T01a's six and these three), exit 0 | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T01b --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: changing a module outside `tools/ig-proto/`.
- `QUESTION:` when the audit search finds an import the table does not list, or the catalogue differences are other
  than the 25 Hell cells.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01b-B01 | MP12b1 is reported as a different source, with whether its puzzles are the same, instead of a failure | `frozen: identity of a different source` | self-test output |
| T01b-B02 | Every source-dependent value of a frozen run comes from the frozen source, in workers too | the offer case; the worker-module case; the audit | self-test output; `receipt.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01b-T01 | The source receipt is complete | `receipt.json` blocks | `evidence/frozen/V4-T01b/receipt.json` |
| T01b-T02 | The catalogue check is recorded | `catalogue.notOffered` has the 25 Hell case ids and nothing else differs | `receipt.json` |
| T01b-T03 | Nothing else changed; formats | guards; `npm run check` | command output |

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
| Start, end, duration | 2026-11-17 04:47:19 +07:00 (dispatch, base `0ef440e`) to 05:02:03 +07:00 (acceptance): 14 min 44 s; the developer's own times 04:47:35-04:54:20 and, after the rulings, 05:01:35-05:01:48 |
| Waiting for rulings | about 7 min (04:54:20 report to 05:01 relay of the rulings) |
| Agent id, model | `399ff908-2088-47bd-84e8-8346d83a0f96`, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 57 calls; 8,461,058 input, 56,149 output, 8,071,022 cache-read |
| AI credits | 234.36 |
| Questions and rulings | No `QUESTION:`. The developer's five deviations, two named items and two honest gaps were relayed to the pack author; all accepted (05:00); the README's import search changed to any depth (fix round); T04d's `identityVerdict` is `incomplete` while `withoutMp12b1 > 0` (new case 7) and T04e's identity gate requires 0; pack amendment `77505d8` |
| Fix rounds | 1 (the README's search pattern) |
| Gates re-run by the orchestrator | `receipt.mjs --label frozen`: reproduces the developer's `receipt.json` except `meta` (run aside, the developer's files restored byte-identical); snapshot verified (88 files), `digestEqual` true, 14 of 14 variants without error, 25 not offered (12 `hell-1`, 9 `hell-2`, 4 `hell-3`), 0 added, 0 differ; `self-test --frozen`: 9 passed, 0 failed; `check-edits --all --label frozen`: 14 `ok`; the any-depth import search: 12 lines, all in the audit table; firewall `check`: 289 production files unchanged; the guard `git status`: no output; `npm run check`: OK |
| Commit | this task's commit, `improve-generating T01b: Source receipts: different-source identity, the frozen reference policy and the source receipt` |
| Issues and named items | None new (the developer's named items were ruled "no change" and "accept as is") |

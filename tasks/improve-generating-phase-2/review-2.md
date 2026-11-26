# Phase-2 task pack: review 2

| Item | Value |
|---|---|
| Reviewer | SA-Astra |
| Base | `97a6326a5ff149ad27f667c777987fe73df35d07`, `gen-v4` |
| Reviewed | The uncommitted revision of 36 task files, `check-list.md`, `contracts.md`, and the parallel schedule |
| Result | **Changes requested:** six groups below. The approved population, price and texts are unchanged. |
| Evidence | `evidence/sa-astra/review-2-audit.mjs`, `.json` |
| Measurements | None: no generation, rating, replay, browser run or counted machine time |

`[V]` means checked against the files or reproduced by the audit; `[A]` means an estimate, not a measurement.
The executable probes below reproduce consequences of the written contracts; they are not tests of phase-2 code
that has not yet been implemented.

## 1. What is accepted

- [V] R1's schedule is restored, including its row-limit admission rule, not just its row totals:

  | Stage | Rows | Row invocations | Counted min | Guard min | Authorized min |
  |---|---:|---:|---:|---:|---:|
  | A | 318 | 23 | 330.655824 | 409.194780 | 410 |
  | B | 695 | 26 | 321.257629 | 401.572036 | 402 |
  | Total | 1,013 | 49 | 651.913452 | 810.766816 | 812 |

  A group 1 has the eight smoke requests and then three REQUIRE requests. All 49 groups admit their next row at
  their projected elapsed time under `elapsed + rowLimitS + 10 <= 885`. The eight resource items are one invocation,
  two lanes and two groups; the six browser checks have six 120-second limits. **812 remains a spend cap**, not a
  guarantee: slower observations or extra twins can exhaust it.
- [V] There are 31 development tasks before measurement, four measurement/readout tasks and the publication task:
  36 files. Development estimates total **78.25 h**, including P2-22's 0.5 h; no task exceeds 3 h. The dependency
  data currently give a 23.5-h estimated longest path. They do not yet describe an executable parallel schedule
  because of R2-03.
- [V] The nine approved EN/VI locale rows and both guide sentences match the final plan. No wording change is
  requested.
- [V] The revised PowerShell invocation, timeout accounting, stage separation, committed owner-aware A readout,
  phase-aware copy checks, full-suite points, publication checks and truthful CI statement address substantial
  parts of review 1. The developer still does not commit, rebase or merge.
- **Correction to my review 1 R8:** [V] `checkBatch` does **not** enforce offers; only `checkSet` does
  (`core/browser/generation-client.js:575-580,760-815`). P2-07's scripted Hell 1 batch tests are valid. The diagnostic
  copy is needed for the real Hell 1 set-generation proof, not for those scripted batch tests.

### Review-1 disposition

| Finding | This review |
|---|---|
| R1 schedule | Applied; independently replayed above |
| R2 wrapper/accounting | Wrapper applied; residual log capture and terminal accounting in R2-06 |
| R3 persistence/activation | Main design applied; identity validation in R2-04, overflow arithmetic in R2-06 |
| R4 comparator | Cohorts/oracles/stages applied; producer data and resource consumers in R2-01 and R2-05 |
| R5 trace | Format/primitive adaptation applied; per-destination header and end-line join in R2-02 |
| R6 triggers | OR predicate applied; coverage and natural-reach reading still need R2-01/R2-02 |
| R7 selector | Applied: corrected conclusion, literal vectors, budget/overshoot/skip cases |
| R8 prior | Applied, subject to the runnable proof dependency in R2-03; correction above |
| R9 guard lifetime | Applied |
| R10 replay/cutover | API/nonempty sample/cutover enumeration applied; final resource gate needs R2-05 |
| R11 real glue/widths | Widths applied; glue's execution prerequisites and raw read need R2-02/R2-03 |
| R12 browser | Page/runner separation applied; early unit-test input and report path need R2-03/R2-05 |
| R13 binding/guards | Guard improvements applied; seal and row identity checks need R2-04 |
| R14 gates/publication | Applied; defer the premature complete-tool runner as R2-03 specifies |
| R15 parallel | Isolation/merge rules accepted in principle; four missing producer prerequisites in R2-03 |

## 2. R2-01: preserve the produced reach evidence and report all 440 eligible rows

### Evidence and effect

[V] `P2-13r-trace-reader.md:59-63` gives `rowWork` twelve fields, then deliberately projects them to ten in
`workLedger`. `P2-13d-rows-and-publication.md:108-112` persists
`workLedger(rowWork(...))`, dropping `outcomes` and `rerateStarts`. P2-13c explicitly requires both and treats their
absence as unknown. C5, correctly, instead says to persist the **rowWork result**. Following the driver task
therefore loses N-V4-16/F7 evidence on every real row.

[V] P2-13c's `coverage` lists a mere twin row line before its unknown/incomplete checks; its B8 step says to read
the final B snapshot, although **140 of the 440 eligible bounded rows belong to A**. Its historical rule also
needs to distinguish an absent required oracle from the deliberately nonexistent oracle of a new sentinel.

### Exact replacements

1. In P2-13d step 3.5, replace the computation with:

   > Compute `ledger = rowWork(join(raw, 'journal'), { row: fileKey, seed, acceptedCount: run.acceptedCount })`.
   > Persist the complete C9 result, including `outcomes` and `rerateStarts`, in C5. Use `workLedger(ledger)` only
   > when constructing the input to the frozen statistical functions; never when storing or publishing the row.

   In P2-13b, use that ten-field adapter at its statistical boundary. No frozen function changes.

2. Replace P2-13c's historical applicability and coverage bullets with:

   > A row in the original validation cells requires its declared frozen counterpart and the bound F2/F4 readings.
   > A missing required counterpart or reading is unknown. A `non-table` sentinel has no historical counterpart
   > by design: its historical side is `not-applicable`, and its trigger is evaluated on production alone.
   >
   > Classify coverage only after validating the bounded observation and, when present, the twin against the
   > sealed source and receipt bindings. A row line alone is not a valid measured pair. Unknown required evidence,
   > or an invalid, erroneous, censored or interrupted required observation, is `unresolved` and cannot become an
   > analytical zero. Otherwise a valid measured twin gives `observed-pair`. A triggered row without its required
   > valid twin is `unresolved`. Only a fully settled, untriggered row without a measured twin is `analytic-only`:
   > reached ten implies zero lost completion; no set-bound reason implies zero false stops. Count the two
   > endpoints separately, without mixing observed pairs and analytical zeros.

3. Replace P2-13c step 3 with:

   > B8 reads both final snapshots, `E/rows/A.jsonl` and `E/rows/B.jsonl`. Its coverage cohort is exactly the
   > 360 original shipped gen-v4 rows excluding full 26x26 Nightmare, plus the 80 shipped sentinel rows:
   > 140 eligible bounded rows in A and 300 in B. Join their twins by cell, repetition, seed and uniqueness,
   > not by group or slot key. Smoke, REQUIRE, Master and the no-screen comparator are not added to this cohort.
   > Glue and reach are separate per-component/arm/cell readings, so those diagnostic cohorts are not lost or
   > silently pooled. Any unresolved eligible row leaves B8 incomplete.

4. Add focused integration cases to the existing `p2.test.mjs`, not a new suite:

   | Case | Expected |
   |---|---|
   | Fake calibrate emits a raw no-window outcome and a rescue start; runGroup, publish, then the real P5 reader | Both fields survive; the trigger and reach are observed, not unknown |
   | A valid new sentinel with no historical oracle and all production trigger fields settled | No historical unknown; analytical zero only when untriggered |
   | An original-cell counterpart is missing; separately, a twin line is present but its receipt is invalid | Unresolved in each case |
   | One required A twin is missing while every B twin exists | B8 includes all 440 and is incomplete, naming the A key |

## 3. R2-02: derive natural glue reach from raw outcomes, and join actual C1 fields

### Evidence and effect

[V] P2-13c step 1 counts natural matches from **transported** `trail.sameSide`. Four raw below ends whose
translation is broken leave that field null: the report still calls the natural path unexercised. It also applies
the expected public-bound reason without excluding the uncapped arm.

[V] P2-16c step 4 looks for `stage` and `attempt` on an `end` line. C1 puts those on **start**, not end. The
specified lookup finds no raw side even on a correct trace. C11 has the same shorthand and an array-position
ambiguity: the client trail is in arrival order, not attempt-index order.

[V] C1 and P2-12d write the worker header only at module load, while `trace.test.mjs` and the observer proof reuse
the imported module over several `IG_LOG_DIR`/`IG_ROW` destinations. Every later destination can begin with
`start`, contradicting the first-line contract.

### Exact replacements

1. Replace P2-13c's `glue(rows)` definition and C11's N-V4-16 paragraph with:

   > Derive a natural same-side match from the raw ended set calls for attempts 0, 1, 2 and 3: all four must
   > exist and have the same non-null `igNoWindow` side. A known pre-selection failure is not a no-window end.
   > Keep raw-match count, client `sameSide` count, bound firings and public `set:no-window-*` count as separate
   > columns. A disagreement is evidence, not zero reach.
   >
   > Join each raw outcome to the client entry by its `attempt` field, never by the array index; retain the
   > client's `arrival` ordering. Compare an actual transported reason with `no-window-<raw side>`. Missing
   > required transport is unresolved unless explained by the declared higher-priority cancellation/time cut;
   > it is still listed. Report the priority explanation separately from unexplained defects.
   >
   > For bound-enabled gen-v4 routes, reconcile every raw first-four match with the client condition, firing and
   > public reason; list a mismatch as declared-priority or unexplained. On `p2-uncapped` and
   > `p2-uncapped-diag`, firing/public-bound expectations are not applicable: continuing after four same-side
   > ends is intended. Still compare their raw and transported per-attempt reasons. Print `unexercised` only
   > when complete raw evidence establishes zero natural matches.

2. Replace P2-16c's raw-side check with:

   > For each k from 0 to 3, find the unique C1 start with `stage === 'set'` and `attempt === k`, then its end
   > by equal `call`. Require `end.igNoWindow === side`. A missing or duplicate match is a discrepancy. Stage and
   > attempt are not read from end lines. These four checks always run; P2-12d is a prerequisite (R2-03).

   The broken translation still expects six discrepancies: four transported reasons, firing, public reason;
   all four raw-side checks pass.

3. Replace C1's worker-row timing and P2-12d's worker-line paragraph with:

   > Ensure a worker header once per absolute destination filename, before its first non-header line. Also call
   > this ensure operation at module load when logging is enabled, so a loaded but unused worker has a journal.
   > A later change of `IG_LOG_DIR` or `IG_ROW` creates a new destination with its own first header. Nothing is
   > written without `IG_LOG_DIR`; sequence numbering remains per thread.

4. Add these focused cases to the existing tests:
   - raw sides all below, arrival order `[2, 0, 3, 1]`, transported reasons all `not-in-band`: one raw natural
     match, four transport discrepancies, **not** unexercised;
   - the same raw match on a correctly translated uncapped row that later succeeds: no missing-bound defect;
   - one imported trace module, two successive row/folder destinations: both files begin with their worker header.

## 4. R2-03: repair four actual prerequisite defects without abandoning parallelism

[V] The dependency data omit all four producers in the audit's `dependencyCounterexamples`. This is not a
same-file conflict: a file or required context field does not exist on a permitted task base.

### Exact replacements

1. **Shared proof runner.** P2-12e depends only on P2-12d but invokes P2-12c's `proofs.mjs` and
   `proofs.test.mjs`. Preserve independent bundle implementation by moving the small common runner earlier:

   > P2-12b also creates `tools/ig-proto/phase2/proofs.mjs`: move P2-12c step 1, including the exported `compare`,
   > verbatim into P2-12b. Add that path to P2-12b's scope and `$Allowed`, and remove it from P2-12c's create
   > list and `$Allowed`. Test `compare`'s equal/differing-path cases in `copies.test.mjs`; bundle modules remain
   > dynamically loaded only on invocation. P2-12c and P2-12e create only their own bundles and test files.
   > P2-12e's focused test command names only `proofs-prior-legacy.test.mjs`, not P2-12c's future test file.
   > Both retain P2-12d as their start prerequisite.

   Move the existing runner effort, not a new runner or task. Reallocate the estimates between P2-12b/P2-12c if
   necessary, keeping each at most 3 h, and regenerate the parallel model from the amended ownership.

2. **Glue requires context tagging, not just optional journals.** P2-16c installs its seams only for
   `ctx.igStage === 'set'` and `ctx.igAttempt`. C1 and P2-12d identify the latter as fields introduced by the
   log/link edits. Before P2-12d, `p2-glue` extends an untraced `p2-gen4`; the seams never run. Replace its start row:

   > `join; P2-12d (the traced/tagged copies) and P2-09.`

   Replace "The copy chain":

   > `p2-glue` extends the traced and linked `p2-gen4`. The context tags and raw journal are mandatory. Never
   > skip the raw-side comparison; missing trace is a failed proof.

   Remove the conditional "glue's raw side" rerun rule from check-list §3.7 and the no-trace alternatives in the
   task. Retain the post-cutover rerun. Update §1 and the schedule dependency data.

3. **The early browser-runner unit test must use its own page.** Replace its `sourcesOf` input with:

   ```javascript
   sourcesOf('tools/ig-proto/phase2/fixtures/browser-selftest.html',
     ['tools/ig-proto/phase2/fixtures/browser-selftest.js'])
   ```

   Keep the shipping-source assertions and assert both fixture paths are bound. The real deadline page is
   created later by P2-16b, which depends on this runner. Do not introduce a dependency cycle.

4. **Do not execute future tooling tests in P2-16a.** Replace its step 5:

   > Run the focused production tests and the full production suite. Write the complete pre-seal gate list in
   > `gates.md`, but do not execute its gate 2 in this task: some listed tooling files may not yet be merged.
   > P2-18 runs that complete list after every development task is accepted. Existing conditional merge gates
   > still run the tooling tests available on the rebased branch.

   Remove the task's `gate 2 of gates.md` command row and the corresponding checklist requirement. This retains
   the full final gate without serializing unrelated development.

The three-lane/five-slot approach, source/artifact isolation, C/S/T merge preference and owner-authorized parallel
execution are otherwise accepted. The first three tasks P2-01/P2-03/P2-13r remain independent.

## 5. R2-04: bind the source actually measured and verify receipts before reuse

### Evidence and effect

[V] P2-13a checks a copy against its own metadata, but never explicitly requires
`p2-copy.inputDigest === inputDigest(readSources(the declared current source root))` or `rehearsal === false`.
A stale, internally consistent copy can therefore enter a fresh seal. Its seal inventories phase2 tools but not
the imported frozen comparator/tree-builder code (`verdicts.mjs:17-27`, `lib/tree.mjs:13-15`).

[V] C5 resume accepts any existing report/receipt pair containing one generation run. Publication hashes the row
file, but this does not verify its receipt hash, report hash, seed, copy or source epoch. P2-13b checks journal
hashes only for B1. Rows/status records have no seal identity; after a new seal, the same keys can be silently
skipped as already done. These are gaps in the already agreed source-binding rule, not a request for a second
validation framework.

### Exact replacements

1. Add to P2-13a's seal refusals and fields:

   > Every measured copy must have `rehearsal === false`, its expected source/id/root, and an `inputDigest` equal
   > to `inputDigest(readSources(root))` of the production root or the verified today root, as applicable.
   > Verify its actual copy digest against both `ig-tree.json` and `p2-copy.json`.
   >
   > Store `runtimeDigest` per copy by importing that copy's `tools/bench/report.js` and calling its
   > `computeSourceDigest(path => readFileSync(join(copyRoot, path), 'utf8'))`. Use the copy's own SOURCE_FILES,
   > which includes trace additions. Do not equate this runtime fingerprint with the whole-tree `copyDigest`.
   >
   > Bind the reused tooling too: include `tools/ig-proto/` and `tools/bench/`, `tools/calibrate.mjs`,
   > `tools/node-worker.mjs`, and `tools/test-server.mjs` in the input inventory, deduplicating paths. Require
   > `verifySnapshot().ok` and include the manifest at `SNAPSHOT_MANIFEST` in the sealed inputs
   > (`tools/ig-proto/snapshot.mjs:83-98`, `lib/paths.mjs:24`): the comparator dynamically loads that verified
   > snapshot's bench schema and level ladder. Do not hash writable raw-output folders. `seal --check` repeats
   > these checks.
   >
   > The seal is write-once: identical bytes may be acknowledged; a different existing seal is refused.
   > A new source epoch stops for the scoped ruling already required by check-list §3.5. That ruling names
   > separate evidence/raw paths and the affected reruns; it does not reset or discard the cumulative ledger.

2. Add `sealSha256` to C4 receipts, C5 start/terminal/row records and C7 reservations/ledger lines. Add:

   > Before resume, skip, publication or statistical use, require the row's seal identity to equal the active
   > seal. A foreign epoch is refused, never reused or relabelled. Verify the row's `receipt` SHA-256, the
   > receipt's report and journal hashes, and the receipt key/variant/copy identity against the sealed plan.
   > Require the sole generation run's `caseId`, `seed`, uniqueness and request quantity to match the row;
   > its `sourceDigest` equals the sealed copy's `runtimeDigest`, and its source label equals the declared
   > `${variant} ${seal.commit}`. The published `run` must deep-equal that extracted raw generation run.
   >
   > Resume uses these same checks, not file existence alone. A started row with absent or mismatched evidence
   > becomes interrupted with the specific cause and is never rerun silently. Any bad binding found when
   > reading a published observation makes the affected endpoint incomplete; no ratio is qualified from it.
   > Use one verifier from the driver/report path, not separate inconsistent implementations.

   Apply the same rule to the four proof results before S1 passes: their root source digest and each used copy's
   tree id must match the seal, and `quick` must be false. A passing rehearsal or a stale passing result is not a
   qualification proof. Keep those source fields explicit and identical in the common runner and S1's contract.

3. Add synthetic tests to `p2.test.mjs`: stale-but-self-consistent copy input digest; rehearsal copy at seal;
   changed reused comparator input; mismatched raw report hash/seed; and an old-seal terminal key after a new
   seal. Each must fail/refuse before measurement or qualification, without launching an engine.

## 6. R2-05: resource and browser gates must consume the actual receipts

[V] P2-13b's A4 accepts "measured or a declared not-measured", so it can mark an unmeasured resource endpoint
complete. P2-14b correctly exits 3 for it, but P2-19 deliberately records that exit and continues to the readout:
the report must retain the shortfall so C12 demands the owner's continuation.

[V] A5 reads `E/browser/receipt.json`. No task produces that aggregate: P2-16e and P2-19 write the six individual
`E/browser/<check>/receipt.json` files. Thus a successful browser sequence still leaves A5 incomplete.

### Exact replacement for A4/A5 in P2-13b

> **A4:** Read `E/replay-probes/receipt.json` and verify the eight fixed item identities and their sealed source
> bindings. Pass only if all eight are `measured`, each has a nonempty replayed ordinary-candidate sample, every
> replay is matched, and every margin is `ok`. Any `failed` item makes the gate fail. Missing, not-measured,
> censored or not-started required items make it incomplete. Keep all item details in either case. A declared
> shortfall is not a successful gate.
>
> **A5:** Read `E/browser/<check>/receipt.json` for exactly `set-bound`, `batch-prefix`, `late-fence`,
> `fresh-after-pause`, `no-window-texts` and `screen-capped-step`. Verify their page/check identities and source
> hashes against the sealed shipping build. Require `status: 'pass'` and each check's completed `CHECK-END`
> reading at most 60 seconds. Missing receipts or duration/source evidence make the gate incomplete; an
> observed fail/timeout/error makes it fail. Do not read or require `E/browser/receipt.json`.
>
> C12 therefore requires `Owner continuation:` for either failed or incomplete A4/A5 before stage B.

Replace the existing missing-browser test with a missing **individual** receipt. Add one resource test with seven
measured items and one not-measured item: A4 incomplete, and `checkReadout` refuses B without the owner line.
One test with all six valid individual browser receipts must pass without an aggregate file.

In P2-19 steps 2 and 3, change both catch-filter expressions to
`'^STOP: (accounting|ledger|seal|reservation)'`. A missing source/admission precondition is not an ordinary
recorded probe failure to continue past.

## 7. R2-06: finish the small execution/accounting contracts

### A. Terminal records do not carry the invocation field being counted

[V] P2-13a step 4 counts terminal status lines "with that invocation id"; C5 places the id only on start lines.
The literal terminal-field filter yields zero, while a key join yields one in the audit's single-row example.
Replace the `rowsWritten` definition with:

> Count terminal keys whose unique durable C5 start names this invocation, joining by key within the same seal
> and stage. Never filter terminal records for an undeclared invocation field. Recovered terminals retain the
> original start association; they do not represent another engine invocation or change an old duration line.

Add a start/done example and a recovered prior-invocation example to the existing wrapper tests.

### B. Overflow groups omit their invocation startup allowance

[V] The approved schedule includes 2 seconds per row invocation in addition to row prices. P2-13c's
`sum(260 x keys + 45)` omits it. Replace the formula with:

> `repriceCountedS = sum over overflow groups of (2 + 260 * group.length + 45)`.
> Give its separate guard projection as `1.25 * repriceCountedS`; the ledger still admits at the enforced
> invocation limit, never at the price estimate. For four groups of three twins, counted is **3,308 s**, guard
> is **4,135 s**. Keep the pending fixed groups in the continuation quote.

Change the 17-trigger test's expected 3,300 to 3,308. No approved base row, invocation or 812-minute cap changes.

### C. P2-15 still promises logs without an executable capture mechanism

[V] P2-15 step 2 requires `search-hard.log` and `search-screen.log`, but uses record-fixtures directly through
`Invoke-IgNode`. The already reproduced R2 stdout behavior still applies; P2-14a adds no log option.
Use a child-owning capture wrapper, not `Tee-Object`. Add the following complete block to P2-15 for the two searches:

```powershell
$root = 'Q:\git\pentomino-p2-w<n>' # the assigned slot, substituted before dispatch
Set-Location -LiteralPath $root
[Environment]::CurrentDirectory = $root
$ErrorActionPreference = 'Stop'
. (Join-Path $root 'tools\ig-proto\lock\ig-lock.ps1')
$E = Join-Path $root 'docs\improve-generating-phase-2\evidence'
$capture = @'
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const [log, ...args] = process.argv.slice(1);
mkdirSync(dirname(log), { recursive: true });
const fd = openSync(log, 'w');
let result;
try {
  result = spawnSync(process.execPath, ['tools\\record-fixtures.mjs', ...args], { stdio: ['ignore', fd, fd] });
} finally {
  closeSync(fd);
  const text = readFileSync(log, 'utf8').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  writeFileSync(log, text, 'utf8');
}
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
'@
foreach ($recipe in 'hard', 'screen') {
  Invoke-IgNode -Repo pentomino -Task "P2-15 search $recipe" -LimitSeconds 600 -QuietSeconds 45 -NodeArgs @(
    '--input-type=module', '-e', $capture, (Join-Path $E "P2-15\search-$recipe.log"),
    '--replay-case', '--search', '--recipe', $recipe)
  if ($LASTEXITCODE -ne 0) { throw "QUESTION: search $recipe failed" }
}
```

The existing two evidence scripts must likewise write their named CRLF logs themselves before printing their
summary. Keep their output/seed choices and stop conditions unchanged. No production logger or new framework is
needed. A killed search remains a failed gate; its partial log is not a selected fixture.

## 8. Proportionality and integration convention

[A] **78.25 h is a defensible revised work estimate, not a measured cost or a commitment of AI credits.** Much of
the increase specifies implementation/proof work already required by the accepted plan; it is not additional
product scope. I do not request another task split or new framework. Reuse the frozen statistics, the existing
trace reader and one row-binding verifier, and add the few cross-boundary tests above. Shared formats alone did
not prove that their producer and consumer instructions agreed.

[A] The 8-10 h elapsed model depends on the stated 0.15-0.25 work multiplier, assumed test durations, no fix rounds
and no Sudoku wait. It must remain labelled a scenario, not an independently established delivery promise.
Regenerate it after R2-03; do not model task bodies as independent merely because they edit different files.

Add this sentence under "A failed merge gate" to preserve one implementation commit per task:

> Fixes on an unmerged private task branch are folded by the orchestrator into that task's candidate commit
> (`git commit --amend`), followed by rebase and the complete merge gate again; the developer never commits.
> Never amend a commit already fast-forwarded to `gen-v4`.

No finding needs a new owner decision, changes D-P2-15/D-P2-16, or authorizes a measurement, push or merge.
Acceptance is withheld until the producer/consumer and prerequisite defects are corrected.

## 9. Evidence and reproduction

```powershell
Set-Location -LiteralPath 'Q:\git\pentomino'
[Environment]::CurrentDirectory = 'Q:\git\pentomino'
node tasks\improve-generating-phase-2\evidence\sa-astra\review-2-audit.mjs
npm run check
git --no-pager diff --exit-code 97a6326 -- core generator player tests tools package.json index.html docs/improve-generating-phase-2/plan.md
```

The audit records 51 input hashes, the 36 estimates, the approved locale comparison, the literal dependency data,
all 49 schedule replays, and the small contract counterexamples. Its input-index SHA-256 is
`abe9036592eac9adc938dbb868af64014fa859b0a75927c2b75c73c8c6c90ecd`.
Validation: the audit and its syntax check pass; all 59 reviewed PowerShell blocks parse; all 53 pack, review and
related evidence files pass the explicit format check; `npm run check` passes; the protected-source/final-plan diff
is empty.
No earlier audit or measured record was overwritten; no source or test was edited; no commit was made.

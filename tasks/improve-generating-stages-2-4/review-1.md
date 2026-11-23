# SA-Astra: task-pack cross-review, round 1

Base: `57ef5cf`. Reviewed the working-tree checklist and all 30 task files against the final plan,
the inherited rules, the actual harness and the frozen `3fc65f4` source.

**Verdict: changes requested. 22 findings: 10 P1, 11 P2, 1 P3.**

P1 means a broken gate, a false acceptance, a resource/identity violation or a bypass of an agreed stop.
P2 means a mandatory evidence/test/implementation contract is incomplete. P3 is an editorial correction.
All findings below are **verified** by source inspection or the explicitly identified static/synthetic check;
no engine outcome or new timing measurement is assumed to have been tested.

## What is sound

- The normal-path order, owner approvals, 749-minute grant, 87.4-second off-log adjustment, 747 run cap,
  reference-kernel decision, `require` 32/40 G, and exclusion of N-V4-18 follow the final plan.
- I reconstructed the task files' manifests, including the three prose-specified P7 manifests, in memory.
  All anchors match and every affected module parses: 14 variants, including 84 edits per frozen arm,
  9/10/13 for the P7 composites and 70/71 for `live`/`live-test`. This is syntax/anchor evidence, not
  execution of the proposed algorithms. `prior-s3-v1.json` is correctly pending T06a.
- All 12 Hell 1 shares reproduce from the original records. The four pilot sample counts are 68, 75,
  70 and 64. No correction to the approved values is requested.
- Recomputed guards: S2B 28.243734 minutes; four proofs 89.000000; Hell rows 84.609948; combined S3P
  173.609948; three P7 composites 19.369531. Allocations 23, 139 and 16 agree.
- The activation has 80 groups, 1,120 rows and 19 comparator cells without S4-6. Both conditional Hell
  boards activate. Its 102 steps/84 locked steps and the S4 prices agree with the pack.
- The traceability matrix names all plan sections, but the implementations do not yet discharge T1,
  T3, T4 and T6: see R05, R09-R13 and R18.

The checks are reproducible with:

```powershell
Set-Location 'Q:\git\pentomino'
node --experimental-vm-modules docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review-checks.mjs --label frozen
node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-prior-check.mjs
```

The first command writes only `evidence\sa-astra\bt-review-checks.json`; the second writes nothing.
The first script's `anchors`, `gitGuard`, `pm4Totals`, `prices`, `activation`, `p7Memory`,
`hostBound`, `liveRows`, `widthTrace` and `fitIndex` are the evidence cited below.

## R01 (P1): finish the stopped-publication/resume contract

**Locations:** T01a Authority, steps 2-3, Tests and ACs; checklist §3.2; S01/S03/S04/S06/S07 stop paths.

T01a preserves the default publisher byte-for-byte, but a normal resume eventually calls that default
publisher. It rewrites shards already published by `--done-only`, including their `meta.createdAt`
and current producer metadata (`arm.mjs:245-293`). The new mode also treats a lone `.runs.json` as a
complete publication, although the writer creates it before the markdown and journal. Finally, its
new path does not check the stored shard producer/tree against the metadata it is about to publish.
A stopped observation must not be relabelled after a harness/tree fix.

**Replace the default-path fixed point and step-2/3 publication rules with:**

> Both publish modes preserve the bytes of a complete existing publication. The default still refuses
> a shard whose state is not done; `--done-only` skips and names it. Neither mode overwrites an
> existing published shard on a resumed plan.
>
> `publishShard(name)` declares `const dir = join(armDir, name)` inside the helper. Before a new
> publication, compare the stored `shard.treeId`, `shard.copyDigest` and `shard.harnessHash` with the
> metadata to be published; refuse a mismatch without writing any output. Never substitute today's
> producer for the observation's producer.
>
> Compute all publication contents before writing. A complete existing publication consists of its
> runs JSON, runs markdown and the journal file named by that markdown, when a journal is required.
> If only part exists, refuse with `arm: incomplete publication <arm>/<shard>: a ruling is required`;
> do not label it `kept`. Write the runs JSON last as the completion marker. Recovery from a partial
> write is explicitly ruled and never rewrites an existing complete record.

**Add the integration case** `publish: stopped shards, resume and immutable outputs`: synthetic
shards A done, B not done, C done; C pre-published. Run the new mode, finish B synthetically, then
run the default publisher. A and C must retain their exact bytes; B is the only new publication.
Also test a lone runs JSON and a mismatched shard producer/tree: exit 1, no new output.
Use a private `S24-T01a-dev` fixture namespace, never V4-S2 as the first integration test.
The existing pure planner cases remain useful but do not test this path.

## R02 (P1): the git guard matches the test source it adds

**Locations:** T01b steps 1-2, Scope and Tests.

The proposed scan includes `self-test.mjs`. The literal sample
`'$head = @(& git -C $worktree rev-parse HEAD)'` in that file matches the new regex, as does the
literal `spawnSync('git', ...)` example. The mandatory case fails on itself. The author's check
scanned the old file, before those fixtures were inserted. Verified by `gitGuard`: old source
false, proposed fixture source true. A quoted `-C` path containing a space is also missed.

**Replace the fixture placement instructions with:**

> Create `tools/ig-proto/data/git-guard-cases.json`, an array of `[text, expectedBoolean]` pairs
> containing the nine examples below and two additional positive examples:
> `$head = @(& git -C "Q:\a b" rev-parse HEAD)` and `& git.exe -C 'Q:\a b' status`.
> Read that JSON in the guard case. Do not put executable-looking sample strings into any scanned
> `.mjs`, `.js` or `.ps1` file, and do not exempt `self-test.mjs`.

**Use this regex, or an equivalently verified one, in step 1:**

```js
const GIT_CALL = /(?:execFileSync|execSync|spawnSync|spawn|execFile|exec|fork)\(\s*['"`]git(?:\.exe)?\b|(?:^|[;|({&]|\$\(|@\()\s*&?\s*git(?:\.exe)?\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)\s+)?(?:rev-parse|status|log|diff|show|add|commit|push|ls-files)\b/m;
```

Add the JSON to Scope/G3. Keep the one named exception. Change B01's unbounded claim "every call
form" to "the explicitly tested native and JavaScript call forms, including `-C` and expressions".
The gate must scan the actual edited source, not a pre-edit copy.

## R03 (P1): the fitting reader can turn unusable or absent evidence into a clear fit

**Locations:** T02b steps 2-6 and Tests; S01 step 8; T11 steps 1/5.

`previewCell` selects the first matching rep without validating rows or pairing seeds. `reachedTen`
only reads the count; it deliberately expects an already valid row (`verdicts.mjs:139-190`).
The prefixes command iterates only existing done shards, rather than a declared grid, and its
summary drops the ledger's reasons. S01's warning list omits ambiguity, unreadability and missing
pairs. T11 checks `complete`/`unreadable`, but those are journal properties, not the validity of
the 20 published run records. A censored row can have a fully closed journal.

**Add this contract to T02b before steps 2-6:**

> Export `fitScope(plan, arm)`, returning the duplicate-free declared `{ rowKey, caseId, rep, seed }`
> grid from the plan's `arm.mjs run` steps for that arm. The command reads
> `tools/ig-proto/plans/<task>.json`. Reject an absent arm, duplicate declaration or any fitting
> rep outside 0-4. The seed is exactly `landscape/<caseId>/<rep>`.
>
> Join all published files before computing a cell. Require exactly one row for each declared key,
> a matching case/rep/seed, and `ingestRow(row, { quantity: 10 }).status === 'valid'`. Judge today's
> MP12b1 record with `runStatus` after `withoutSampling` and require the same seed. A duplicate,
> missing, malformed, incorrect, censored or erroneous member contributes no ratio and is reported
> with its reason; it never becomes a completion. Null, zero or non-finite ratios cannot pass.
>
> Emit one prefixes row for every declared key, including a missing/not-done one. Read its
> publication, shard declaration, row identity, worker journals and linkage. Preserve parsing and
> `rowLedger` problems in `problems`; do not call a missing linkage an empty successful ledger.
> Return `rowStatus`, `complete` and `unreadable` separately. Reject duplicate/unowned starts,
> duplicate ends, primitive ordering/type errors and invalid units as ambiguous, preserving the
> reasons. Legitimate pre-selection failures/terminated calls keep the existing ledger semantics.
>
> Include `inputs: [{ path, sha256 }]` for every file actually read, using `sha256File`, plus a
> declared/missing/unexpected row summary. Missing or ambiguous evidence is a fitting warning,
> never zero work or a clear budget reading.

Use the existing `matrixRun`/`verdictKit` helpers (`self-test.mjs:953-1035`) for schema-valid
synthetic runs, rather than the incomplete run objects currently in the table.
Add cases for a duplicate rep, wrong seed, `measurementValid: false`, missing shard/publication,
unowned primitive and malformed linkage. Their preview lower bound/pass are null, or their
prefix row is incomplete/ambiguous, with the exact problem reported.

**Append to S01's warnings and T11's gate:**

> Every declared row/pair must be present, unique, correctly identified and valid. Every missing,
> unexpected, invalid, censored, erroneous, unreadable or ambiguous input is a warning requiring
> an SA ruling. T11 cannot choose (A) from a mere total of 20 rows or 20 complete ledgers.

## R04 (P1): C1's storage guard does not enforce the worker budget

**Location:** T03b `c1-1`, `c1-7`, Tests and memory AC; inherited by T04/T05a.

The `useLists` expression is inserted before the reference slot allocation
(`frozen-source\core\engine\deduce.js:310-315`). `ws.bytes()` at that point excludes any reference
slots about to grow. The external arrays are never charged to that workspace, and a previous
model's `WeakMap` entry remains even when the new call falls back. Subsequent reference allocations
therefore do not know that storage exists (`workspace.js:175-214`).

The synthetic byte counterexample is exact: before 4,000, new reference slots 1,000, list storage
500, capacity 5,499. The proposed guard admits lists and the reference fits, but the combined
storage is 5,500. Grow-only reuse and a later reference-only model are additional unguarded paths.
This is not a measured physical-memory claim; it disproves the proposed arithmetic.

**Replace the storage decision/cache design in T03b with this requirement and provide its exact
anchored edits before giving the task to a developer:**

> Preserve the reference memory precheck and allocate its reference slots in the reference order.
> Only then decide whether the extra representation fits both the current model's deduction limit
> and the workspace/worker capacity, including all retained extra storage and allocation growth.
> A previous model's list storage must not survive unaccounted into the next model build or a
> reference fallback. Do not retain the current untracked grow-only `WeakMap` design.
>
> The simple permitted implementation is call-local list arrays, allocated after the reference
> views, with no cross-call cache. When the combined storage does not fit, allocate no lists and
> run the unchanged reference loops. A failed auxiliary allocation also falls back without changing
> the reference memory-limit outcome. Report auxiliary storage separately in the probe's diagnostics.

Add tests for: first allocation, growth after earlier models, a large-list call followed by a
reference-only call, and a reference-fitting/list-not-fitting model. Assert both the budget and
complete outcome equality, not just the formula `igListBytes`. Update the estimate/split if this
no longer fits T03b's three hours. No frozen arm receives this code.

## R05 (P2): near-32-MiB models and non-vacuous fast/fallback coverage are not specified

**Locations:** T03a corpus/settings and Tests; T05b full gate; checklist T6 traceability.

Plan §6 T6 explicitly requires near-32-MiB models. Varying `limits.memoryBytes` around an arbitrary
model's size is not evidence that the corpus includes such models. No concrete near-limit input,
expected reference byte count, growth sequence or fast/fallback exercise assertion is supplied.
`mem-fast` can even use a limit above the canonical 32 MiB, and equality alone does not establish
which representation ran.

**Add to the full-tier specification:**

> The pack supplies a deterministic named memory-boundary fixture manifest, including concrete
> model inputs and their expected reference slot bytes, with at least one reference-fitting model
> within 512 KiB below 32 MiB and a reference-rejected model above 32 MiB. Test them at the actual
> canonical 32-MiB limit, as well as the exact reference/list boundaries. The manifest also specifies
> the reuse sequence required by R04. These fixtures are equality verification, not timing items.
>
> The report records each fixture's reference bytes, auxiliary bytes and representation used.
> At least one normal model must execute the fast path and at least one fitting reference model
> must execute the fallback; absence of either is incomplete coverage, not equality proved.
> Missing memory fixtures make the full verdict incomplete and exclude the candidate from timing.

The author must put the fixture path, deterministic construction/input values, expected byte
counts, item IDs and assertions into the task, not leave the developer to "find a near-limit model".
No new timing allowance is requested here. Adjust the full-loop maximum/estimate to the declared
verification corpus; do not silently keep 706 as the final item count after adding fixtures.

## R06 (P2): complete P7's report and worker contracts; `screenValues` returns a Map

**Location:** T03a steps 3-10.

The report takes only `--task`, but the task never specifies where it gets the candidate, tier
and complete expected item manifest. Those must not be inferred from the items that happened
to end. Also `screenValues` returns `Map<number, string[]>` (`pm4.mjs:241-265`): interpolating each
iteration value produces `screen:95000000,fixed`, not `screen:95000000`.
The main-work boundary inputs need correction too: `DeductionResult.search.work` includes census
work (`deduce.js:1747,1811,1820-1822`). Using that total as the main-work cap can put
`work-minus1` after the entire main search rather than at its boundary.

Verified existing coverage: 30 kernel items, 112 PM4 quick profiles and 676 full profiles; the
current first-profile-only rule yields 123 numeric screen settings across 28 sets.

**Replace the ambiguous parts of steps 5/8/9 with:**

> The worker imports `limitsFor` and `outcomeOf` from `../p7-probe.mjs`. Its measured outcome wraps
> model construction as well as `measureDeduction`, so a model-construction error participates in
> equality. If canonical deduction returned an error, do not dereference `.result.search`; compare
> the canonical error and explicitly mark dependent work settings inapplicable. Unexpected failure
> to derive a required memory fixture's bytes makes that item incomplete/error, not skipped success.
> Define `refCensusWork = result.census?.work ?? 0` and
> `refWork = result.search.work - refCensusWork` before `limitsFor`: its `refWork` is main work.
> Thus the main `work-half`, `work-minus1` and `work-ref` limits are derived from main work, while
> `census-half` is derived from census work. Add an adapter test with total work 107 and census
> work 100: the main boundary inputs are 7, giving limits 3, 6 and 7, not 53, 106 and 107.
>
> PM4 screen settings are
> `[...screenValues(record, calls.limits.work).keys()].map((W) => \`screen:${W}\`)`.
> Reject an unknown setting or a non-finite/non-integer/negative `screen:<W>`.
>
> Before the first dispatch, persist an immutable experiment declaration under
> `<raw task>/<step>/experiment.json`: candidate, reference, tier/rounds, corpus version, input
> hashes, complete ordered item declarations and the producer/tree identities. Store repository
> paths, not absolute roots. Define the conversion to runtime payloads once and use it for run,
> resume and report. Refuse a changed declaration on resume.
>
> `report` reads this declaration and the stored item identity/state/log. It validates expected
> coverage, duplicate/order/identity errors and captured inputs before judging. Missing declaration
> or invalid logs produce an incomplete report with reasons; the expected set never comes from
> observed ends. Reports bind the declarations/logs and identify their producer; they do not
> relabel old outcomes with today's tree or harness metadata.

The exact declaration shape, helper signatures and refusal text belong in the revised task.
Add tests for the Map-to-setting conversion, a missing declaration, a deleted final item,
a duplicate end, a changed manifest and a model-construction error.

## R07 (P1): P7 can print `go yes` for unequal or unusable timing results

**Locations:** T03a step 10; T05b prerequisites; D-P24-05; S02.

`timeVerdict` says measured whenever all 90 items ended; an ended item may be `error` or `censored`
(`lib/items.mjs:219-223`). The go predicate checks neither that verdict nor `notSame`.
For two equal equality reports, 90 timing ends, ratio 1.04 and one differing pair, the specified
predicate prints yes. S02 separately says that same case must be no. The file-only prerequisites
also cannot reject a stale or non-equal equality report.

**Replace the timing/go rule everywhere with:**

> `timeVerdict` is `measured` only for the complete declared 90 unique items, each with a
> structurally valid completed outcome, `outcome: 'ok'`, `same: true`, and finite positive
> `refMs`/`candMs`. Otherwise it is incomplete or failed, with explicit missing/error/censored/
> differing IDs. Never calculate an admission ratio from a subset; an unusable aggregate is null.
>
> `go = quickEqual && fullEqual && timing.verdict === 'measured'
> && timing.notSame.length === 0 && timing.ratio >= 1.04`.
>
> Quick and full equality must refer to the actual timed candidate/reference identities and the
> required corpus/coverage. Before timing, validate those identities and passing verdicts, not just
> the existence of two JSON files. After timing, the report repeats this binding check.

Add explicit pure tests: one `same: false` among 90 otherwise valid 104/100-ms pairs gives no-go;
one missing, censored or error item gives no-go; zero/non-finite time gives no-go; a different
candidate tree behind a passing equality file blocks timing. Keep the approved 90-item timing
scope and 20-minute ceiling.

## R08 (P2): a dropped P7 candidate is allowed, but the task ACs require it to pass

**Locations:** T03b/T04/T05a acceptance; T05b no-candidate branch; S02.

D-P24-05 permits a failed candidate to leave the reference. The three implementation tasks instead
require every quick item equal, and S02 unconditionally requires a plan even when T05b says not
to write one. A valid no-candidate result cannot satisfy the pack as written.

**Add this branch to the affected tasks and index:**

> A candidate task is accepted with either complete equality or a documented dropped-candidate
> result ruled by the pack author. Keep the failed/incomplete observations. Do not time a dropped
> candidate. A descendant of a dropped composite is not implemented or measured automatically:
> the pack author records whether the remaining composite tasks are skipped or gives a specific
> corrected task/identity.
>
> When T05b has no eligible candidate, do not create `V4-P7.json`. S02 skips steps 1-6, performs
> only its report step, records "no eligible candidate; no timing run; 0 counted measurement
> minutes", and satisfies its run-specific ACs as not applicable. T06a may then proceed.

Replace unconditional equality/plan/run ACs with these two explicit outcomes. A fix round still
requires a fresh observation identity; no existing ended item is rerun.

## R09 (P1): the hard response bound bypasses assembly and does not cover the set promise

**Locations:** T07b goal, `lv-10` to `lv-13`, Tests; T09a's claimed proof.

The timer is installed only after `generateSet` returns. That promise includes asynchronous
`finishSet`/`assemblePack` (`generation-client.js:715-757`); cancelling workers does not settle a
set assembly stuck there. The batch race's fallback returns accepted puzzles with `made: {}`,
empty seen histories and no pack. It therefore bypasses, rather than proves, assembly at the
bound. The normal client assembles a pack for every non-empty prefix
(`generation-client.js:1195-1228`), and the bench only validates it when present
(`runner.js:644-652`). The synthetic `hostBound` check reproduces one accepted puzzle, empty
`made` and no pack at 119,000 ms.

**Replace the host design, not just its explanatory comment:**

> The hard-bound controller starts at the same request origin before the set call, covers both
> the set and batch phases including assembly, and is cleared on every terminal path.
> A non-empty returned prefix retains its corresponding provenance and seen-key histories and
> has a valid assembled pack. The response timestamp closes after that result is available,
> not when a synthetic no-pack object wins a race. A bound during the set phase also terminates
> the request; it cannot wait indefinitely for set assembly.
>
> The author supplies the exact client/host snapshot/assembly interfaces and anchored edits
> implementing this contract. Do not retain `resolve({ ... made: {}, seenLayouts: [],
> seenClues: [] })` as a substitute for returning the prefix.
>
> Test a held set/assembly, a held batch, a non-empty prefix during assembly and a late acceptance
> after the bound. Verify response time, cancellation, unchanged common-slot puzzle IDs,
> non-empty-prefix pack validity, and one matching recipe entry per candidate.

The 1-second host margin is an implementation allowance, not proof that arbitrary assembly
finished inside it. The tests/receipt must observe the actual assembled response. Split T07b if
the corrected coherent change exceeds three hours. This is completion of plan §4.5/T4, not a
request to change the 46/115/120-second policy.

## R10 (P2): pin every scripted prefix and run the hard-bound case on both frozen twins

**Locations:** T07c case 4, Tests and ACs; T08c; T09a `LIVE_CASES`; S04.

Only width 1's length is pinned; widths 2/4/8 merely log a note and may return an arbitrarily short
prefix while passing. Plan §4.5 and T4 require each expected scripted prefix. Moreover the hard-bound
case runs on `live-test`, not both composed frozen twins; the five-case factory omits it.

The pure dispatch trace of the supplied 30-second/5-second script, using the actual
`dispatchOrder` (`generate.js:638-666`), is:

| Width | Prefix length | Terminal time from origin | Status |
|---|---:|---:|---|
| 1 | 3 | 115000 | partial/time-limit |
| 2 | 6 | 115000 | partial/time-limit |
| 4 | 10 | 90000 | complete |
| 8 | 10 | 60000 | complete |

This is a source-derived scheduling calculation, not execution of the engine fixture.

**Replace the lone length assertion with:**

```js
same(lengths, { 1: 3, 2: 6, 4: 10, 8: 10 }, 'the pinned prefix at each width');
```

Assert the corresponding statuses and `want.slice(0, length)` too. After R09, make its corrected
hard-bound case a reusable factory case and run it for both `fr-frozen-live-test` and
`fr-frozen-none-live-test`. Add both exact names to `LIVE_CASES`; update the coverage/count
oracles and S04 selection consistently. Pin the known matching calibration rather than allowing
"1, or 0 if its level is not hard" to conceal a changed fixture.

## R11 (P2): the pure W table check does not satisfy the real-call requirement

**Locations:** checklist §2.1 T3 row; T08c Tests; T08b runtime-W check.

The checklist explicitly substitutes T08b's pure check for plan §6 T3's real calls. T08c has no
start-line W assertions. The two requirements coexist: pure coverage of all 19 cells and real
call transport per class. `selectCluesV4` reads the actual W at
`ig-select-v4.js:290-294`; testing `classW` alone cannot establish that path.

**Add a T08c case named `fz: W reaches real calls in every frozen class`:**

> Use valid carved inputs for `10x10-nightmare`, `14x14-nightmare`, `15x20-nightmare`,
> `26x26-nightmare` and `26x26-hell-1`, representing the five verdict classes. The deterministic
> seed is `landscape/<cell>/0`; obtain the input with `firstCarvedSet` and the catalogue board/level,
> not a mismatched board/piece set. A missing carved input is a failed fixture, not a skipped class.
> Call the tree's exported `clues.selectClues` with synthetic below-band rating seams, no `igW`
> override, `uniqueness: 'any'`, and its real target level. Read its journal `start.W`.
> On `fr-frozen` expect `[DEDUCE.work, 190000000, 190000000, 190000000, DEDUCE.work]`;
> on `fr-frozen-none` expect `DEDUCE.work` for all five. Require one observed start for each case.

Specify the exact fixture/helper code in the task and include the case in the locked gate.
Keep T08b's 38-cell pure check. Change the traceability row to name both checks, not an exemption.

## R12 (P1): the live receipt can certify invalid rows and a reserve cut at 110 seconds

**Location:** T09a Authority, `rowChecks`, `liveReceipt`, Tests.

The prescribed row checks admit negative responses, censored/interrupted rows and a wrong seed
under a correct `rowKey`. A complete row with `igSetMs: null` also passes. Most directly:
`partialReason: 'set:reserve-cut'`, `igSetMs: null`, `responseMs: 110000` passes and sets
`reserveChecked: true`. It is not a 46-second reserve cut. These counterexamples are in `liveRows`.

**Replace the row rule with:**

> Judge complete published row objects with `ingestRow`, not `{ rowKey, run }` alone. Match exactly
> the ten declared case/rep/seed keys, each once; reject unexpected rows. Invalid/censored/missing
> observations make coverage incomplete; correctness failures and measured deadline violations
> fail. A passing row must be valid, have finite nonnegative `responseMs <= 120000`, and match its
> declared generation request.
>
> For a completed set, require finite `igSetMs` in `[0, 48000]`. A batch/complete response cannot
> use null or missing `igSetMs`. For a failed set, require a valid set-stage terminal reason and
> `responseMs <= 48000`; this includes `set:reserve-cut`. Thus the existing 2-second assembly
> allowance is explicit and applies on both successful and failed set paths.
>
> Read the corresponding raw journals/linkage, require their ledger closure/identity checks and
> bind their hashes. Missing or unparseable closure evidence is incomplete, not `reserveChecked`.
> The configured deadline fields must match the freeze and both actual bounded trees. Preserve
> the five required `LIVE_DEADLINE_FIELDS` exactly in the acceptance expectation.

Add the counterexamples above, duplicate/unexpected rows, missing `igSetMs`, and a missing worker
closure to the table. Use schema-valid `matrixRun` fixtures. A clean reserve-cut fixture has a
response of 46,000 ms (or a stated valid assembly time through 48,000), not the table's inherited
100,000 ms. Ten row keys alone do not prove this receipt.

## R13 (P1): live verification is not bound to the code/trees it actually tested

**Locations:** T09a `verifyChecks`/capture; T09b `liveExpectation`; S04.

`self-test.mjs:10212-10222` writes names/pass flags/times but no producer, tree or selected-case
identity. Copying that state later and hashing it does not bind it to the frozen trees. T09a takes
the producer from freshly published runs and reads current trees; T09b trusts those metadata
copies. An old passing state, or even a state of another task/label with the same names, can certify
new frozen code. The receipt also compares producers but not every runs file's frozen source or
stored raw observation identity; `arm.mjs publish` builds metadata at publication time.

**Add an explicit verification-record contract before S04:**

> The live verification writes its producer hash, frozen commit/digest, selected exact case names
> and the tree IDs/parameter hashes of the tested bounded arms and test derivatives at execution
> time. Its record is separate from or extends the state without changing historical states.
> Require task `V4-LIVE-verify`, label `frozen`, the expected group, unique required passing cases
> and `done: true`.
>
> Both receipt construction and `liveExpectation` independently validate that recorded identity
> against the freeze, the expected derivative composition and the stored identities of the ten
> row observations. Current metadata may be captured only when it matches the observation.
> Every runs file must have the frozen source and agree with its raw shard identity.
> Missing/stale/malformed identity is incomplete; no current file supplies a missing past identity.
>
> Bind the verification record, raw row identity records, captured metadata and required input
> index. Acceptance verifies that the complete required evidence index is present; it must not
> accept a receipt whose `evidence: []` omits all verification inputs.

Add `self-test.mjs` identity-writing changes to the responsible task's Scope and give the exact
record shape there. Tests must cover a wrong task/label, stale test tree, changed producer,
missing recorded identity, mixed source digests and an omitted verification file. The generic
`proofCheck` validates only listed evidence (`lib/proof.mjs:161-167`); it cannot infer a missing
mandatory evidence file for this kind.

## R14 (P2): the advertised receipt/accept CLI ACs are not exercised

**Locations:** T09a T02 and Tests; T09b T02 and Tests; T02b T02.

T09b's case calls `acceptedBinding` directly. It still passes if `v4-check accept` rejects the
`live-deadline` kind, requires `--step`, or never writes the output. T09a tests only the missing-task
refusal, not exit 2, immutable passing receipts or captured inputs. T02b's single historical-task
refusal cannot prove its other refusal ACs.

**Add command-level cases, in private fixture namespaces:**

> `live-deadline: CLI receipt and accept`: produce all synthetic identity-bound inputs, invoke the
> receipt command with `--require-pass`, then the actual `v4-check accept` dispatch with the same
> argument shape as `plans/V4-LIVE.json` and no kind/step/manifest flags. Expect exit 0 and a binding
> that `checkAccepted` accepts for both frozen identities.
>
> A measured bound failure writes a fail receipt and exits 2; a missing required input writes an
> incomplete receipt and exits 2. A second attempt to write a passing receipt or existing binding
> is refused and changes no bytes, including captured inputs. Malformed stored receipts are refused.
>
> `fit-read: command refusals`: existing output, zero/non-integer budget, invalid bound, wrong
> label and historical task each exit 1 and write nothing.

Provide exported command seams/private path injection, fixture names and cleanup in Scope/Steps,
as existing receipt command tests do. Never build these fixtures under V4-LIVE or historical
evidence. Keep the pure cases, but do not cite them as execution of a CLI they bypass.

## R15 (P1): T11's branch B weakens the agreed affected-settings stop

**Locations:** T11 step 5(B)/(C), B01, Stop points; T12 dependency/stop.

The quoted gate requires the smallest necessary matched bounded experiment before accepting
affected settings. Branch B instead permits a value to "settle it" and makes measurement conditional
on "if ... needed". The example is the Hell 1 budget, which the owner has explicitly fixed at 40 G.
The fallback wording at the end of the task does not make that branch executable without inference.

**Replace step 5(B)/(C) and the corresponding AC with:**

> **(B) A correction/refit is proposed:** stop; the joint SA ruling names the exact correction,
> its evidence and its replacement epoch/tasks. It does not itself accept settings whose observed
> path remains affected or uncertain. Any change to the owner's recorded 32/40-G `require` policy,
> allowance or approved scope needs his confirmation before it is applied.
>
> **(C) A path is affected or the required determination remains missing/ambiguous:** before
> accepting those settings, specify the smallest matched bounded experiment, its cases/reps/arms,
> new task/manifest and price; obtain the owner's approval and execute/read it. An uncapped prefix
> or a new P-1 proof is not a substitute for that comparison.
>
> T12 starts only after a jointly signed acceptance of the final epoch and all evidence required
> by this gate. A proposal, new table hash or passing parity proof alone does not authorize freezing.

Keep the gate's existing caveat: no measured zero-loss claim from uncapped prefixes; V4-LIVE and
every declared S4C comparison remain mandatory.

## R16 (P2): T11 asks for published packs that the row runner does not produce

**Locations:** T11 step 2; T16 transport reading where applicable.

`arm.mjs:176-178,245-291` produces row reports and journals, not packs. The accepted journal payload
has board/pieces/clues/rating, not `made` (`ig-log.js:222-228`), and publication removes that payload
in any case. `priorVerdict` reads `madeRecords` from a different path, a generation item whose pack
was explicitly saved (`v4-check.mjs:461-518`, `lib/lane-worker.mjs:180-243`). V4-S3P's request rows
are not those items.

**Replace the unsupported part of T11 step 2 with:**

> Identify the winning set call by the valid row's `run.details.setAttempt`, its matching
> `set-complete` linkage and its unique set-stage start/end. Read its successful rating score
> and `end.locate.wc`. For a matching Hell 1 calibration, every batch start has
> `priorCount = clamp(wc, 1, K - 2)`; otherwise it has the table prior. Require complete
> attribution and report counts/mismatches per cell.
>
> These row runs do not persist candidate `made` records or packs. Report stored-recipe transport
> as not observed in this row dataset; do not apply `priorVerdict` to it or claim a pack check.
> Cite the separate controlled transport/provenance checks for the code path, distinguishing
> them from request-row evidence.

If the author intends a stronger row-level `made` assertion, specify its producer, exact stored
fields/path and test before S03, rather than making T11 discover absent data after the run.
This does not authorize a new measured scope.

## R17 (P1): retain the full recipe-identity rule on a replacement epoch

**Locations:** checklist §3.3 candidate epoch; T11 branch B; T12 replacement dependency.

The pack reduces the final plan's rule to versioned parameters/new trees/new proofs. That is
insufficient for a budget-only refit: `versions` stores algo, prior and screen IDs, not the budget
or deadline ID (`variants\v4.json:33-40,61-69`). The same old recipe could be replayed under new
effective search settings without an identity refusal. This was explicitly resolved in the final
plan §4.3; its full constraint must reach the developer.

**Insert the final plan's rule, without weakening it:**

> The four reserved names are compiled references, not an exemption from D-V4-05. A parameter-only
> refit may retain them only with a distinctly versioned effective configuration, new tree/parameter
> identities and fresh proof tasks; earlier observations, receipts and bindings remain immutable.
> A result-changing code edit for the same parameters requires a new variant identity.
> Every replay-relevant change must be distinguishable by the stored experimental recipe identity,
> not merely hashes outside that recipe.
>
> If the existing compiled references cannot express the replacement, stop for a joint SA ruling
> on the versioned variant/plan mapping. Do not recompile historical plans, silently rename their
> references, overwrite a binding or reuse an observed namespace. Additional measured scope needs
> the owner's approval.

T12's replacement route also needs a revised task naming its actual constants/proof paths;
its default hard-coded V4-S3P bindings cannot stand in for a different epoch.

## R18 (P2): the freeze's fit index omits the evidence that fitted W and P5

**Location:** T12 `FIT_INPUTS`, `write`, Tests and T01/B01.

The 17-path list includes prior inputs and narrative/derived reports, but no S2 screen/no-screen
work records or the SA scripts/input indices used to fit W and the budgets. It also omits T11's
transport/projection script inputs. Hashing a narrative citation is not hashing the cited evidence.
Verified by `fitIndex`. Plan §4.2 requires the hash of every input and script that fitted a value.

**Extend the record contract with:**

> `fit` is a validated transitive input index, not just `FIT_INPUTS`' top-level documents.
> Include the input indices and fitting scripts of the accepted analyses/reviews, the
> `fit-read` input indices from R03, T11's transport/projection scripts and their indexed inputs,
> and the prior generator's sources. Recompute immutable observation/derived-input hashes at
> freeze time and refuse a missing or changed input. Some historical indices also name mutable
> harness source paths: for those, bind an immutable copy of the indexed source epoch, with
> original path, source commit, captured path and the indexed hash. Do not compare today's
> deliberately edited harness against the old hash or relabel today's code as the old producer.
> The orchestrator/developer may capture the original blob with read-only git before the freeze;
> the harness itself still runs no git. Specify those capture paths and commands in the task.
>
> At minimum include the existing Astra `analyze-records.mjs`, `freeze-inputs.mjs`,
> `review-records.mjs`, `input-index.json`, `review-input-index.json`, their fitted outputs,
> and the accepted Opus fitting scripts/indices named by the joint report. The author enumerates
> the latter exact paths in this task. Existing indices use `sha256Lf`; interpret it explicitly,
> do not relabel it as a raw-byte hash.
>
> The record identifies the fitting records/reps actually used; exclusion text is not a filter.
> A validation/Master-validation/second-validation observation in a fitting input is refused.
> Hashing a source file containing other reps does not authorize fitting those reps.

Add a test that removes one work input or changes one indexed byte: `write` refuses before
creating either freeze file. Keep original input files untouched.

## R19 (P2): extending `writtenPlan` breaks T02a's existing refusal test

**Locations:** T02a step 2 and refusal test; T05b Scope/Steps; T10 step 1 and refusal test.

T02a pins `manifest: write-plan knows the plans V4-S2B`. T05b changes that message and only adds
a new case; T10 changes it again. The earlier case is still run by every `--items` gate.

**Use one stable error contract in all three tasks:**

> Unknown plan ID: `manifest: unknown written plan <id>`. The command's usage text lists the
> plans currently supported. The `writtenPlan('V4-XX')` tests always expect
> `manifest: unknown written plan V4-XX`; adding a supported plan does not change this oracle.

Alternatively explicitly update every earlier affected test in each later task's Scope/Steps,
but do not leave contradictory exact expectations in the pack.

## R20 (P2): move case listing before the first index-selected task and remove placeholders

**Locations:** checklist §3.1; T03a/T06b/T07a/T07b and later command tables; T07c step 1.

The supplied gate commands contain non-executable `<the new index>` strings. Before T07c the
developer must count a large, changing array; afterwards several commands still require manual
selection of a growing set. A wrong `--only` can run zero cases and exit 0
(`self-test.mjs:10188-10227`).

**Move the already specified `--list` implementation from T07c into T01b**, including its Scope,
Tests and README change, and replace manual index selection with this common rule:

> Each task gives its exact list of required case names. A PowerShell block invokes `--v4 --list`,
> parses `^(\d+) (.+)$`, requires exactly one match for every required name, builds the
> comma-separated numeric selection and passes that string to `Invoke-IgNode`. Missing or
> duplicate names stop before the locked call. No literal angle-bracket placeholder remains in
> an executable gate. Compare the returned PASS names/count with the required names.

Supply that block once in checklist §3.1, and give the literal name array in each task.
S04 uses the exported `LIVE_CASES` set, after R10, rather than a manually counted twelve.

## R21 (P2): complete the process, closure and S4C run instructions

**Locations:** S01 pre-check; checklist §3.2/§3.4; S06 stop path; S07 steps 5/7.

`Get-Process pwsh` does not expose a script command line and cannot prove that no runner exists.
S07's start/stop instructions refer to S06 instead of supplying its own command. The closed
collection route forbids row steps but never names the suffix that produces the final selection.
The first `invocations.jsonl` entry is written after a locked invocation, so it is not an immediate
readiness check (`run-task.ps1:113-159`).

**Replace/extend the common instructions with:**

> Before any edit/run, inspect active `pwsh.exe` runner processes using
> `Get-CimInstance Win32_Process`, filtering `CommandLine` for `run-task\.ps1` and excluding the
> checking process. A matching or unidentifiable relevant runner is a stop, not proof of idleness.
> Do not terminate it. After detached launch, retain the returned shell ID/PID and verify that
> process is alive and its own log has started. Check the first completed invocation's quiet and
> horizon separately.
>
> After an owner-authorized closure, publish every done shard first, write the closure with the
> exact owner reason, and resume only the remaining unlocked selection/finalization suffix.
> For S4 that suffix is `prerequisites,firewall-snapshot,trees,verdict-input,verdicts,
> resolve-comparators,firewall-check`, excluding any already immutable completed step.
> This suffix presupposes that all mandatory proof bindings passed; otherwise route the proof
> stop first, without inventing a passing selection.
> No row or default incomplete-shard publish step is selected after closure. Dry-run that exact
> selection first. If an immutable selection/final artifact already exists, stop for the named
> ruling rather than overwrite it.

Provide the concrete `Get-CimInstance`/selection blocks, and give S07 its own complete
`New-Item` and detached `run-task.ps1 -Plan tools\ig-proto\plans\V4-S4C.json ...` command, using
the active `G - 2` run cap and its own fresh `run-<n>.log`. Do not present an 8-9-hour timing
proxy as a kill timeout: the task/round caps and the owner's no-kill rule still govern.

## R22 (P3): correct small fixed-point claims and counts

**Locations and exact corrections:**

1. T06a Scope/gates: replace "five files" with **"four files"**: the generator, prior JSON,
   self-test and README.
2. T01b Tests: replace "the 50 files" with **"all files selected by the guard's scan"**.
   The author's own header says 53 at the base, and R02 adds an unscanned JSON fixture.
3. T10 Authority/Stops: replace the suggestion that P7 moves `durationsFromLogs()` with:

   > `durationsFromLogs()` reads the five fixed historical `DURATION_LOGS`
   > (`manifest.mjs:839-840,967-969`), not new P7 runs. Under this pack those logs and the
   > parity reserves/lanes do not change; the default prices must reproduce the stated values.
   > A difference is diagnosed and ruled, not silently attributed to P7.

4. D-P24-05's error equality text: include **`code`** alongside name, message and details,
   matching T03a's actual outcome shape.

## Acceptance of the revision

No new owner question is raised by these findings: they restore the agreed plan and make its
technical tasks executable. Any proposed relaxation of a mandatory gate, new measured scope or
change to a recorded owner decision still follows the existing approval procedure.

The author should update the affected steps, scopes, tests, ACs, case counts, traceability rows
and estimates together. The counterexamples above should become regression cases, not
developer `QUESTION:` surprises. I will re-review the revised text and changed static checks;
I have not executed the proposed rating/generation/uniqueness/replay tests or any timed run.

## Evidence and validation

- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review-checks.mjs`
- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review-checks.json`
- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review-validation.txt`
- The code locations cited above are at `57ef5cf`, or in the verified `3fc65f4` frozen source.
- The JSON records hashes of all 31 reviewed pack files and the principal harness inputs.
- Formatting and `npm run check` results are recorded in the validation file.

Only this review and my new evidence files were written. No other task file, shared plan,
production/test/harness file, historical observation or other architect's file was edited.
No git command, locked invocation or engine run was performed.

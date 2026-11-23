# SA-Astra: task-pack cross-review, round 2

Base: `57ef5cf`. Reviewed the revised 34-task pack and `review-1-response.md`.

**Verdict: changes requested. Nine remaining findings: four P1, four P2, one P3.**

The revision is substantially better. The helper-location adaptation of R06 is accepted, as is
the T12a/T12b adaptation of R15. R09's client-level assertions are a reasonable placement, but
the actual controller still does not enforce its promised batch response bound.

## Checks and disposition of review 1

**Verified:** the index has exactly 34 distinct tasks, its links resolve, the estimates total
64.5 developer hours and every individual developer estimate is at most three hours.
All 14 variant compositions have matching anchors and parse in memory: frozen arms 85 edits,
live test derivatives 86, no-window test 87, `live` 71, `live-test` 72, P7 composites 9/10/13.
The prior file remains correctly pending T06a. No tree was built for these checks.

The five memory fixtures' rows, nonzeros, columns, reference slot bytes, arena bytes and list
bytes reproduce from the frozen source's pure formulas. The near-limit differences are
482,276 and 446,743 bytes below 32 MiB, and 76,105 bytes above. I did not run their deductions.
The revised 500-byte storage test rejects capacity 5,499 and accepts 5,500, after reference
slots are accounted; there is no cross-call list cache.

The machine allowances and owner stops remain unchanged. The new P7 `bind` steps are unlocked.
The formal guards still reproduce: S2B 28.243734 minutes; S3P 173.609948; three P7 composites
19.369531. The no-candidate route now correctly avoids a timing plan/run.

I read all of the four repaired files: `check-list.md`, S03, T06a and T09c. Their encoding,
line endings, paths, index/register values and relevant code blocks are intact; I found no
residual character-swap damage. T09c does have a semantic test-oracle issue below, not evidence
of a mechanical character swap.

| Earlier finding | Disposition |
|---|---|
| R01 publication/resume | closed |
| R02 self-matching git guard | closed; all eleven samples and the edited source checked |
| R03 fitting evidence | partial: preview/grid improved; prefixes still miss identity checks (R2-03) |
| R04 P7 storage | closed |
| R05 near-limit coverage | closed as a fixture specification; outcome reporting still needs R2-05 |
| R06 P7 contracts | partial; `lib/p7-core.mjs` accepted; R2-01, R2-04 and R2-05 remain |
| R07 P7 go | predicate fixed; proof validation/binding incomplete (R2-04) |
| R08 dropped/no candidate | closed |
| R09 live hard bound | not closed (R2-02) |
| R10 scripted prefixes/twins | widths pinned and both twins included; host cases depend on R2-02 |
| R11 real-call W | closed |
| R12 live row rules | closed |
| R13 verification identity | substantially fixed; expected derivative composition still absent (R2-06) |
| R14 command tests | added; a few executable fixture/oracle gaps remain (R2-03, R2-05, R2-06) |
| R15 affected-settings stop | closed, including the T12 split adaptation |
| R16 absent row packs | closed |
| R17 recipe-visible identity | closed |
| R18 transitive fit index | substantially fixed; split/capture details remain (R2-07) |
| R19 stable refusal oracle | closed |
| R20 case selection | closed |
| R21 process/closure instructions | process and launch checks fixed; unsupported comparator closure remains (R2-08) |
| R22 fixed counts/claims | closed; two new small inconsistencies in R2-09 |

## R2-01 (P1): P7's candidate engine cannot construct the declared Hell 1 corpus

**Locations:** T03a steps 9-10, its base-against-base case; T03b declaration; T03c/T04/T05a.

This is a newly identified source-contract error, also present in the earlier specification.
The P7 candidates extend `base`. T03a tells the worker to carve with its candidate engine
"exactly as `kernelItem`". But `base` does not offer Hell 1:

- `lib/sets.mjs:44-51` calls that engine's `policy.pieceCountRange` and returns `not-offered`
  for a null range; `firstCarvedSet` then returns `no-carve` after eight attempts.
- The frozen level-7 area interval is `[Infinity, Infinity]`
  (`frozen-source\core\engine\levels.js:22-34`), and the frozen policy enforces it.
- The existing self-test explicitly checks this:
  `self-test.mjs:607-617` expects `base` on 26x26 Hell 1 to be `not-offered`.
- T10a's `r4c` extends `instr`, whose `diag-1`/`diag-2` edits enable diagnostic offers.
  The new P7 composites do not inherit those edits.

Thus six kernel items per equality tier return `no-set`, regardless of whether the kernel is
correct. The new unit case tests only the 10x10 kernel input and misses this. This cannot be
treated as a legitimate dropped optimization.

**Replace the corpus-construction rule with:**

> Construct T10a's kernel inputs using the fixed frozen `instr` input-construction engine, with
> the original `ig-v4/kernel/<case>` seeds and subset rule. The input constructor is independent
> of the candidate. Bind its tree identity, the catalogue and its construction rule/version in
> the experiment declaration. Pass the same resulting board, pieces and clues to `base` and
> the candidate.
>
> The deductions/ratings being compared and timed remain `base` versus the candidate; do not
> add instrumentation to the reference or candidate to work around an input-offer problem.
> Input construction remains outside the timed rating interval.
>
> Add the 26x26 Hell 1 kernel input to the base-against-base verification case. It must produce
> a usable input and completed equal comparisons, not `no-set`/`no-subset`. A corpus-construction
> failure is a probe defect requiring a ruling, not evidence against every candidate.

Provide the concrete constructor/ref fields and worker wiring in T03a/T03b. This preserves the
30-input/90-item timing scope and existing pricing basis.

## R2-02 (P1): the adapted controller still waits indefinitely for batch assembly, and two host tests cannot reach it

**Locations:** T07b `lv-14`, `hostRow`, `hostBoundCase`; T07c's assembled-prefix case;
D-P24-04 and the corresponding ACs.

### The batch bound is not a bound

`igBoundStart.batch` still executes `const value = await promise`. The timer cancels the client
but supplies no bounded completion path for this await. In the actual client, `finish(job)`
sets `job.running = false` before batch assembly, and `cancel()` acts only while the job is
running (`generation-client.js:498-502,1175-1208,1282-1289`). Cancellation during that assembly
therefore does not settle it.

I executed only the literal proposed wrapper with a fake clock and a controlled promise:
it remains pending at 120,000 ms and returns at 125,000 ms when that promise is released.
An unreleased promise remains pending. The `batchBound` evidence records this.

T07c's test holds the fake clock at 119,000 while real timers finish validation. Its timestamp
does not establish an upper bound on the wait. Fifty microtask turns are not an observable
assembly boundary and cannot replace a controlled assembly seam.

### The held-set cases end through the 46-second reserve

Removing the pool's 115-second timer does not remove the client's `igCut`. In `hostRow` modes
`set` and `assembly`, all set attempts are still held when the 46-second reserve timer wakes
the client. `clock.advance(118999); await settle()` resolves the set through `reserve-cut`,
before the 119-second host bound. Consequently case (b)'s pending assertion is false, and
case (c)'s release is too late to enter set assembly. The claim that the host bound is the
only possible terminal path is incorrect.

**Replace the implementation/test contract with:**

> On the host cutoff, complete the response from controlled prefix state without awaiting the
> original batch/assembly promise. The prefix must retain its real provenance, histories and
> valid pack. Supply the exact snapshot/assembly interface and anchored edits that do this;
> cancellation followed by an unbounded await is not an implementation of the hard bound.
> A suitable design is a client prefix snapshot that can be assembled without waiting for the
> pending asynchronous batch completion, or an already assembled snapshot maintained before
> acceptance. Do not restore the former empty-provenance/no-pack fallback.
>
> Test a batch assembly deliberately held beyond 120 seconds: the response must already be
> available by the bound, with its valid prefix, while releasing the old promise later changes
> nothing. Drive the fake clock through 120 seconds; do not freeze it at 119 while waiting.
>
> Test a directly held set promise at the controller seam separately. For the real set-assembly
> case, resolve a successful attempt before 46 seconds, wait for an explicit assembly-entered
> signal, hold that assembly and advance through the host bound. Keep the ordinary all-attempts-
> held case as a 46-second `reserve-cut` case. Replace the magic microtask count with a controlled
> assembly gate.

The location of puzzle/recipe assertions at client level is accepted. What is not accepted is
the remaining unbounded path. Keep the 46/115/120-second policy; split the implementation task
again if its corrected design no longer fits three hours.

## R2-03 (P1): prefixes still do not validate the row against its declaration or read its raw identity

**Locations:** T02c step 4, fixtures and Tests; T11 step 1.

The preview validates the declared identity, but the prefixes command only calls
`ingestRow(row)`. That function compares the run's case/seed with its containing row, not with
`fitScope` (`verdicts.mjs:139-161`). A row keyed `14x14-nightmare~0` whose row and run both name
`landscape/14x14-nightmare/20` is still `valid`; the new evidence reproduces this.

T02c also quotes the requirement to read the shard declaration and row identity, but its
actual step reads only `state.json` and journals excluding `.row.jsonl`. It never specifies
reading/checking `shard.json` or that row identity. The synthetic fixture deliberately contains
neither. The resulting valid/complete/problemless row is precisely what T11 now accepts.

**Replace the prefixes join/check part of step 4 with:**

> Use a shared `declaredRowProblem(declared, row)` check in both commands: the row's key, case,
> rep and seed must match the declared entry before `ingestRow`. A mismatched row is `invalid`
> with `wrong declared identity`; it cannot produce a clear fitting row.
>
> Read and hash `<rawDir>/<shard>/shard.json` and `<rowKey>.row.jsonl`. Require the declaration's
> task/arm/case/rep/seed and the raw row identity to agree with the publication. Compare the
> stored shard tree/copy/producer identities with the publication's metadata. A missing,
> malformed or mismatched identity is a row problem. Keep these checks separate from ledger
> closure and preserve all their reasons in the output.

Add complete synthetic shard/header/metadata fixtures and negative cases for a self-consistent
wrong seed, wrong rep/case, missing row identity and mismatched raw producer. T11 must pause on
each. Legitimate pre-selection failures still follow the existing ledger rules.

Also make the preview command fixture actually write `mp12b1-x.json` before the `io.mp12b1`
seam names it: `inputs` hashes the real file. Give each refusal scenario its own fresh fixture
and create the existing-output condition inside that case; it must not rely on another test's
output or let that existing output mask the malformed-flag refusal being tested.

## R2-04 (P1): P7 reports still accept incomplete protocol/producer/corpus evidence

**Locations:** T03b steps 4-6 and Tests, then `bind`/`time`/`report`.

The corrected numerical go predicate is good. Its proof inputs still have four holes:

1. The verdict checks end records but not their start/order protocol. The new positive fixture
   consists of end records alone. The real pure `resumePlan` rejects such a log with
   `out-of-order log entry for n0`; the new verdict specification accepts it.
2. `state.identity.harnessHash`, `frozenCommit` and `sourceDigest` are not compared with the
   declaration's producer. Matching the log hash to the state and the item hash to the declaration
   does not establish that producer relationship. A declaration can name a different producer
   while all specified hash checks still hold.
3. Equality checks the seven memory declarations, but not the complete kernel/PM4 declaration.
   The positive eight-item fixture can claim `p7-corpus-v1` and equality; `equalityBinding` checks
   the version string and memory coverage, not the required full corpus. Production validation
   needs an independently expected manifest, not just a self-consistent shortened declaration.
4. `report.meta.inputs` contains only the three `readRun` files. `equalityBinding` therefore
   does not recheck the PM4/memory input hashes stored inside `declaration.corpus.inputs`, and
   no mandatory input-list completeness check prevents an empty list from passing that loop.

**Add this validation contract:**

> Derive the expected item identity from the recorded declaration and its independently expected
> corpus specification. Compare every identity field, including the recorded producer/source,
> and run `resumePlan` or the same full start/end/order/duplicate validation before judging.
> A missing start, unexpected start, producer/source mismatch or interrupted item is incomplete.
>
> Production `report`/`bind` validates the complete ordered declarations/settings against the
> required corpus: 30 kernel inputs, the 112/676 PM4 profiles and the seven memory items, plus the
> fixed input-constructor identity of R2-01; timing has the prescribed 90 item identities.
> Pure unit fixtures may inject a small expected manifest explicitly, but that test seam is not
> used by the production commands and cannot certify `p7-corpus-v1`.
>
> Bind and recheck the complete required corpus input index as well as experiment/state/log files.
> Missing, changed or omitted required entries are incomplete. A timing report also binds the
> equality reports and declaration inputs it used to decide go.

Change the positive fixtures to valid start/end sequences. Add negative cases for an end without
a start, a producer/source mismatch, omitted PM4/kernel coverage with recomputed hashes, an empty
input index and one changed corpus file. All must block timing/go. Do not change the 1.04 rule.

## R2-05 (P2): finish two executable P7 interfaces

**Locations:** T03a step 9 and its memory/error test; T03b refusal gates; T03c stop report.

- T03a asks the test to inspect the reference error of `mem-above`'s `fixture` step, but the
  specified step shape contains no reference outcome/error. `differing` is empty when both
  errors are equal. The report similarly has no `differing` field at the location T03c names.
- T03b's negative `time`/`bind` gates use `p7-c1` before T03c creates its manifest. The specified
  evaluation obtains `await treeRef(candidate)` before calling `equalityBinding`, so it can fail
  on the missing variant rather than the pinned `no quick equality report` refusal.

**Exact changes:**

> Add `referenceError` and `candidateError` to each comparison step (the normalized error object
> or null), including equal error outcomes. The `mem-above` test asserts its exact `referenceError`
> and equality of the two error objects. Keep full unequal outcomes in the existing `differing`
> list. Either carry that list into the report's per-item diagnostics, or make T03c/T04/T05a
> explicitly read it from the named item-end in `items.jsonl`; do not name a nonexistent
> `p7.json.differing`.
>
> In `bind` and `time`, check existence/readability of both equality reports before building or
> looking up candidate/reference trees. Missing quick evidence returns
> `p7-probe: p7-c1 cannot be timed: no quick equality report`, with no run directory created.
> Test this when the candidate manifest does not yet exist.

These are interface/ordering corrections, not new measured cases or an allowance change.

## R2-06 (P2): live proof validation still omits the expected derivative composition

**Locations:** T09a `verifyChecks`; T09b captures; T09c `liveExpectation` and its first test.

The new identity record fixes most of R13. But the advertised independent check of the
**expected derivative composition** is not implemented. Both readers merely compare a test
tree ID with a recorded/captured test tree ID. They never establish that this test tree is
the frozen parent plus only T08c's allowed deadline override and `w8`.

**Add to the identity/capture/acceptance rules:**

> Bind each test derivative to its corresponding frozen parent and the exact permitted
> derivation: `fr-frozen-live-test` extends `fr-frozen` and `w8`;
> `fr-frozen-none-live-test` extends `fr-frozen-none` and `w8`; no own edits/files, and only
> the declared test deadline parameter override. Record the parent's frozen tree/parameter
> identity and capture the derivation metadata needed to check this independently.
> Receipt and acceptance reject a wrong parent, an extra edit or an unauthorized parameter
> difference, even if the recorded test tree ID equals the captured one.
> Validate the identity record's format/version as well as its task, label, group and fields.

The author must state the exact added record fields/checks in T09a-T09c, not just repeat the
authority paragraph. Add a negative fixture with an internally consistent test-tree identity
but the wrong frozen parent/extra edit.

**Correct the producer fixture in T09c:** it currently changes only a runs file's harness hash
to `g` and expects `the runs files name 2 producers`. Step 2 first compares that file with its raw
shard, so the actual first error is `runs file <path> differs from its raw shard`.
For the mixed-producer test, change both that runs file and its corresponding raw shard to `g`;
keep the single-file mutation as a separate raw-identity mismatch case.

## R2-07 (P2): complete the fit-index split and make captures obey the file contract

**Locations:** T12a Scope/Steps/FIT_INPUTS/gates; T12b step 1.

Four precise corrections remain:

1. **Imports at the right task.** T12a calls `readRepoFile` and `sha256Text`, but T08b's
   `freeze.mjs` imports neither and T12a adds no imports. T12b only adds `readRepoFile` later.
   Add in T12a:

   ```js
   import { readRepoFile } from './lib/proof.mjs';
   ```

   and add `sha256Text` to its `./lib/records.mjs` import. T12b extends these imports rather
   than redeclaring them. T12a's own gates must run before T12b exists.

2. **Hash the T11 scripts themselves.** Add these exact paths to `FIT_INPUTS`:

   ```text
   docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport.mjs
   docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection.mjs
   ```

   Their input indices do not automatically include the scripts: the rule is "every file it
   read", not "the executing script". They are expressly required by the adopted R18 contract.

3. **Required predecessor evidence.** T12a follows T11's signed completion. Replace the allowance
   for an absent T11 input index with:

   > Both T11 indices and their scripts must exist before T12a is accepted. The only expected
   > outstanding real-index problems at this point are named mutable harness sources awaiting
   > their captures in T12b. A missing T11 artifact is a stop, not an accepted future dependency.

4. **Capture text safely.** `git show ... > destination` writes Git's blob bytes directly, with
   no existence/exit check or CRLF normalization, while the pack requires CRLF UTF-8-no-BOM.
   Its relevant contract is normalized-text SHA-256, not raw-byte identity.

   > Refuse an existing capture; read the blob with read-only `git --no-pager show`, require
   > exit 0, normalize that text to CRLF/UTF-8 without BOM and verify its `sha256Lf` against the
   > indexed original before writing once. Record this as a normalized text capture of the
   > named commit/path, not a byte-for-byte Git-blob copy. The harness still runs no git.

Provide the complete replacement capture block and test an already-existing destination or
failed read: no existing file is truncated. Original observations remain untouched.

## R2-08 (P2): S07 prescribes a comparator closure that the harness does not support

**Locations:** S07 step 7; S06's closure suffix; checklist §3.2.

`manifest.mjs close --collection initial` only reads/writes V4-S4:
`CLOSE_PATHS` (`manifest.mjs:1941-1946`) and `closeCommand` (`:2027-2077`) compare the activation's
bounded/today rows, not V4-S4C's comparator rows. At S07 it either says `nothing to close` or
`closure exists`; changing the original closure would invalidate the already-bound selection.
There is no comparator-close command in this pack.

There is also a precondition on either finalization suffix: `verdictInput` refuses an arm with
no published file/tree (`manifest.mjs:2593-2602`). An early owner stop can leave an entire arm
unpublished, even after every done shard has been published.

**Replace S07's automatic closure/finalization instruction with:**

> On an owner decision to stop comparator collection, preserve the existing activation,
> selection and V4-S4 closure unchanged. Record the exact owner instruction and all missing
> comparator rows. Do not invoke `close --collection initial` as a comparator closure.
> If every required arm has the publication/identity evidence needed by `verdict-input`, the
> owner may authorize the unlocked finalization suffix, retaining missing comparator pairs as
> unknown/incomplete. Otherwise report the measured stop and obtain the joint SA ruling for
> the unavailable finalization path; do not create fake runs files or edit the frozen harness
> inside D-V4-20's window.

Add the same publication precondition to S06's post-closure suffix. A routed measured stop is
allowed by the plan's goal; no fabricated evidence or unsupported close operation is necessary.

## R2-09 (P3): remove the remaining small contract inconsistencies

1. T03c's G3 row must include `tools/ig-proto/self-test.mjs`, as its Scope already does.
2. T09b's clean CLI test writes **seven** input copies, not five: four trees, harness, state,
   identity. Prefer asserting the complete expected input-path set, so R2-06's additions do not
   leave another stale count.
3. T09a's Scope names an exported `declaredRows` function which no step creates or reader uses.
   Remove that name; the defined API is `LIVE_DECLARED` plus `rowChecks` and `verifyChecks`.
4. T05b's pricing paragraph still names `timeItems`; replace it with `timeDeclarations`
   (converted by `runtimeItems`), the API T03a actually defines.

## Evidence and next review

The new evidence is:

- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review2-checks.mjs`
- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review2-checks.json`
- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review2-validation.txt`

Command:

```powershell
Set-Location 'Q:\git\pentomino'
node --experimental-vm-modules docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review2-checks.mjs --label frozen
```

It uses source reads, in-memory syntax/anchor checks, pure formulas and controlled promises;
no engine/rating/search/generation/replay runs, tree builds or git commands. It writes only its
new evidence JSON. Formatting and `npm run check` results are in the validation file.

These corrections do not request a new machine allowance or alter the frozen policy. I accept
the two unproblematic adaptations and the fixes marked closed above; I cannot sign off the pack
until the remaining code/fixture contracts are completed. Do not resolve R2-02 by weakening the
hard deadline or dropping required provenance.

# Task-pack review 1 — SA-Astra

**Changes requested.** I read the check-list and all 27 task files at `97a6326`, checked the relevant code, and
reviewed SA-Opus's `sa-opus/parallel-schedule.md`. The three-lane approach is viable after the interface and
ownership changes below; the current pack is not executable yet.

The owner's parallel-running decision (`1575100035077771386`, 2026-11-25 17:45:12 +07:00) is accepted. It does
not authorize a shorter quiet period, simultaneous timed requests, a larger ledger, developer commits or a PR merge.

## Summary and evidence

- **59 developer hours is the correct sum**, including P2-22's half hour; every current task is at most three hours.
  The parallel proposal's revised P2-05 at **3.25 hours** is not.
- The nine EN/VI locale keys and both guide sentences match D-P2-16. The overall plan/decision traceability is good.
- The implementation of the measurement schedule differs from the approved price: splitting smoke adds 47 counted
  seconds; eight serial replay invocations add 803 seconds under the same 120-s/item assumption. Combined, A's
  guard becomes **426.903 minutes**, not 409.195; the independently rounded stages become **427 + 402 = 829**.
  This is arithmetic, not a new measured estimate or a request for another grant. Restore the approved execution
  model rather than silently changing the 410/402 allocation.
- A literal `pwsh -File ... -NodeArgs @(...)` probe **fails**: `--out` is parsed as an ambiguous PowerShell parameter.
  Invoking the script with `&` passes all four Node arguments correctly.
- The helper's child stdout does **not** enter its surrounding `Tee-Object` pipeline: a matching `ProcessStartInfo`
  probe logs only the helper marker, not the Node marker.
- All 37 fenced PowerShell blocks parse. Parsing alone does not detect those execution problems.
- No engine, rating, replay, browser or timed measurement ran during this review.

Reproduction/evidence, from the repository root:

```powershell
node tasks\improve-generating-phase-2\evidence\sa-astra\review-audit.mjs
pwsh -NoProfile -File tasks\improve-generating-phase-2\evidence\sa-astra\argument-probe.ps1 -Stage A -Item proof-observer -NodeArgs @('proofs.mjs', 'observer', '--out', 'evidence')
& .\tasks\improve-generating-phase-2\evidence\sa-astra\argument-probe.ps1 -Stage A -Item proof-observer -NodeArgs @('proofs.mjs', 'observer', '--out', 'evidence')
```

`evidence/sa-astra/review-audit.json` binds the reviewed inputs, prices, task totals and approved texts.
`stdio-probe.log` contains only `helper-marker`; the child also printed `child-marker` to the tool output.

## R1 — Restore the priced schedule and item concurrency

**Files:** P2-13a, P2-14, P2-18, P2-19, P2-20, check-list §3.5.

The approved A group 1 contains **eight smoke rows and three REQUIRE rows**, with projected node time
806.127389 s. Creating a separate group 0 makes A have 24 row invocations and a 410.173947-minute guard even
before the replay change. P2-19's steps say groups 1–23 while its checklist still says 2–23.

The 533-s replay quote is two successive four-item groups with **two item lanes**, within one projected
invocation. P2-19 instead invokes eight items serially, each with a separate quiet period. At the same assumed
120 seconds/item that is `8 × (120 + 2 + 45) = 1,336 s`, not 533.

**Replace the scheduling rules with:**

> Keep `stages.A.schedule` and `stages.B.schedule` from the approved audit unchanged; do not add A group 0.
> A group 1 executes its eight smoke requests first, verifies their positive port-equality results in-process,
> and only then executes its three REQUIRE rows. A failed/missing smoke proof stops before the first REQUIRE
> row. P2-18 retains those three REQUIRE observations without interpreting or repeating them. P2-19 runs the
> remaining groups **2–23** and reads the complete REQUIRE cohort.
>
> Resource probes use two successive four-item groups with **two lanes**, with the original 885-s horizon,
> admission reserve and cut rules. Add `replay-probe.mjs --all --out <dir>` to execute that schedule and checkpoint
> every item. The 120 seconds/item remains a price proxy/admission reserve, not a duration guarantee or a hard
> item deadline. A started/censored item is never silently repeated; only not-started items may resume.
> P2-19 invokes the replay bundle through the ledger, not eight separately locked commands.
>
> The stage caps stay A 410 and B 402. Any different execution schedule needs a recomputed manifest and a
> ruling before execution; do not continue printing the old price against a different schedule.

Update P2-18's title/scope to name the three already-recorded REQUIRE observations. This is bookkeeping within
the approved order and population, not an additional measurement. B's boundary after group 22 is sound for
trigger selection: all eligible bounded rows exist then; group 23 still holds **19 Master rows and four twins**.

## R2 — Make the PowerShell invocations and accounting actually executable

**Files:** P2-13a, P2-18–P2-20 and every example using native `pwsh -File ... -NodeArgs`.

The negative argument probe is not hypothetical. Also, `Invoke-IgNode` throws on nonzero exit; on a timeout it
throws **before** printing an `IG` line (`ig-lock.ps1:108–114`). The current straight-line wrapper therefore
skips `ledger --append` on precisely the failed runs that must be charged.

**Replace the command/wrapper contract with:**

> Invoke `run-group.ps1` as a PowerShell script in the already-fresh tool process:
> `& (Join-Path $root 'tools\ig-proto\phase2\run-group.ps1') ... -NodeArgs @(...)`.
> Do not pass an array through native `pwsh -File`. Define separate `Rows` and `Item` parameter sets: `-Group`
> is mandatory only for rows; `-Item`, `-NodeArgs` and the item's limit belong to items.
>
> The wrapper uses `try/catch/finally`. Preserve the original invocation error. In `finally`, append the actual
> `IG` duration even when the child exited nonzero; on the helper's identified limit timeout append
> `nodeSeconds = limitS`, `killed = true`, the timeout exit and 45 quiet seconds. An unclassified failure with
> no usable duration remains an explicit accounting stop with its reservation intact. Remove a reservation
> only after its ledger record is durable, then rethrow/return the original failure. A failed item cannot appear
> successful merely because the ledger append exited zero.
>
> Validate authorization against the sealed stage map, **A=410, B=402**; do not trust a caller-supplied number.
> In particular `-Stage B -Authorization 410` is refused. No borrowing unused A minutes for B.
>
> Check every native exit immediately, including `publish`, `ledger --status`, `git rev-parse`, and `gh pr view`.
> Do not let a successful report command hide a failed publication.

The scripts whose console output is evidence, particularly `browser-run.mjs`, must **write their own CRLF
UTF-8 log/JSON receipt** to an explicit `--out`/`--log` path. `Tee-Object` around the helper is not a capture of
its Node child's stdout. Keep `Tee-Object` for the helper line only.

Add fake-invoker tests for success, nonzero exit, identified timeout, unknown missing duration, duplicate pending
reservation, and wrong stage authorization. No real helper/engine is needed for these tests.

## R3 — Define resumable rows, immutable publications and conditional activation

**Files:** P2-13a/P2-13c, P2-18–P2-20.

There are deterministic failures in the current flow:

- P2-18 publishes `A.jsonl`; P2-19 publishes more bytes to that same path, but `publish` expressly refuses them.
  P2-20 likewise publishes B both before and after the twins.
- Five unused allowance slots remain `open` when only ten twins are required; they must not become missing
  observations or invalid board names.
- Filling a sealed `plan.json` would break its digest. There is no command to schedule twins beyond the five slots.
- A row checkpoint exists only **after** the child returns. A killed parent can leave a started observation
  indistinguishable from an unstarted row.
- A deferred group gets only one later retry, irrespective of how much work remains.

**Replace the persistence/activation contract with:**

> A group retains its own deferred keys. Reinvoke that group until all its active keys are terminal, or the
> ledger refuses admission; do not move its rows implicitly into another group and do not limit recovery to one
> retry. Persist an atomic row-start record before launch and a terminal record afterwards. Resume reconciles
> existing child reports/checkpoints; a started row without a terminal result is recorded interrupted/censored
> or stops for a ruling, never automatically generated again.
>
> Pass calibrate `--output <raw>/<fileKey>/report`: its argument is a **base name**, not a directory
> (`tools/calibrate.mjs:16–18`). Read `<raw>/<fileKey>/report.json`.
>
> Publish write-once snapshots into distinct paths. P2-18 publishes its first-group snapshot under
> `E/rows-smoke/`; P2-19 publishes the completed A snapshot under `E/rows/`. Before twin activation P2-20
> publishes B's prefix under `E/rows-before-twins/`, and afterwards publishes final B under `E/rows/`.
> Give the twin command both A's snapshot and the explicit bounded-B snapshot path. Partial/stopped snapshots
> have distinct immutable names, not an overwrite of a completed snapshot. Reports bind the exact snapshot hashes.
>
> `plan.json` stays immutable. `twins` writes a separate immutable activation receipt containing the parent
> plan/seal hashes, bounded/frozen input hashes, predicate version, actual required keys, allowance-slot mapping,
> inactive slots and any overflow groups. `run-group` resolves conditional slots through that receipt and verifies
> it against the sealed plan. Unused allowance slots are **not observations** and do not make a report incomplete.
> More than 15 uses the declared 440-row eligible universe, a recorded reprice and additional groups; it is not
> silently truncated. State the actual command to run those groups.
>
> Keep raw evidence bindings: per-row report and journal inventory/hashes, and the invocation that produced them.
> Self-tests use an explicit isolated root under `tests\artifacts\ig-proto\phase2\self-test\`; they never create,
> erase or amend the real ledger, seal, activation or publications.
>
> Before any B reservation, require the committed stage-A readout for this seal/report, with both SA
> acceptances and the exact verdict `Stage B: PROCEED`. A failed/incomplete A gate additionally requires its
> recorded owner continuation decision. Missing, stale or STOP readouts refuse B. P2-19 writes those binding
> fields; test the refusal cases without launching an engine.

The one-row matrix's `repetitions: 1, seeds: [seed]` **is supported**; do not rewrite that working part.

## R4 — Scope the comparator and enforce the real equality exceptions

**File:** P2-13b, with P2-18/P2-19's stage gates.

`acceptedCount < 10` does not mean “clock cut”: the known `10x10-master` rep 24 has four puzzles and
`layouts-not-found`. Also, an extra n-mid conditional twin needs `fr-frozen-uncapped`, not the hard-coded
`fr-frozen-none-uncapped`. Smoke and main rows reuse case/rep/arm and must not enter the same cohort.

**Replace the comparator rules with:**

> Preserve `component` in each row (or join it by the sealed plan key before grouping). Smoke is a separate
> correctness cohort and is excluded from all statistical/population/completion cohorts. REQUIRE and the
> conditional twins are also separate from the main ANY cohorts. Test that 19 main rows plus a smoke row is
> still an incomplete 20-row cohort.
>
> Prefix equality is allowed only for a documented wall-clock truncation on either side:
> `time-limit`, `set:time-limit`, `set:reserve-cut`, `response-bound`, or `set:response-bound`.
> Without such a cause require equal counts, ordered keys and semantic result digest, including deterministic
> short outcomes such as Master rep 24. Missing keys are missing evidence; an empty prefix is not a positive
> proof. Do not waive a deterministic budget/no-window/other mismatch merely because the row has fewer than ten.
>
> For an uncapped n-mid twin use the matching `V4-S4C/fr-frozen-uncapped` row; elsewhere use
> `fr-frozen-none-uncapped`. New sentinel/REQUIRE cells have no frozen oracle.
>
> Declare expected gates per report stage. Smoke requires all four proofs and eight valid positive smoke
> comparisons. A requires its three controls, four sentinels, the complete diagnostic REQUIRE record, resource
> receipts, browser receipts and memory; it does not fail merely because B's main cells have not run. B requires
> the complete declared main/cohort gates and conditional coverage. Missing expected inputs are incomplete;
> future-stage gates are “not due”, not an accidental success or an A-stage veto.

Keep the existing `verdicts.mjs` statistical functions unchanged. Its `cellGate(kind, rows, options)` signature
is correct; `resultDigest` contains layout keys, clue keys and scores, not version metadata. Those are not findings.
Write the concrete `rowWork` → ledger adapter (`complete`, `problems`, `lo`, `hi`, `terminated`, etc.) rather than
leaving a known interface mismatch as a developer stop.

## R5 — Make the trace a coverage proof and an independent glue observation

**Files:** P2-12b/P2-12c, the proposed P2-13r, P2-13b/P2-13c.

The trace currently wraps `clues.selectClues`, but the observer proof calls the copy's
`select-v4.selectCluesV4` directly. No call context is installed, so the rating wrappers deliberately record
nothing. The trace also lacks ordered task/attempt identity and drops the selector's raw `igNoWindow`, making
the N-V4-16 reader depend on the very transported reason whose loss it must detect.

**Replace the trace/proof contract with:**

> The traced proof calls the active copy's **`clues.selectClues` dispatcher**, not an unwrapped direct selector.
> Give every proof case its own journal directory/`IG_ROW`, so its units cannot include earlier cases.
> Compare outputs for no-observer, charge, and record+charge runs. Compare metered units between observable
> charge runs and the traced primitive sum; do not compare a nonexistent no-observer charge sum to zero.
>
> Add copy-side task context around `executeTask`'s `setAttempt`, `puzzleCandidate` and `completionCandidate`
> branches (`core/engine/tasks.js:155–191`). Link each selector call to the RPC/task identity and the ordered
> set attempt, batch slot/attempt or completion input. Call-end records retain raw `igNoWindow`, budget-stop
> and outcome independently of `failureOf` and the client's public reason.
>
> The parent/task registry and row-exit receipt account for every dispatched/started/completed/terminated task,
> including pre-selection failures. Reconcile this inventory with the per-worker journal inventory. Missing
> files/calls, malformed/duplicate primitives, inconsistent totals, or unproved closure make work incomplete,
> never zero. A known terminated open primitive contributes its proved upper bound; “complete” means complete
> interval evidence, not that every call ended normally. Primitive identity is `(file, call, p)`, not `p` alone.
>
> Reconcile N-V4-16 from those **raw ordered calibration outcomes** against the client trail and public row
> reason. A lost no-window reason must appear as a glue discrepancy, not as zero natural reach.

Add negative fixtures for a missing whole worker journal, empty evidence despite accepted puzzles, an unmatched
completed task, wrong transported side, and a call that ended without its primitive-end line. Existing frozen
`lib/ledger.mjs`/`rowLedger` supply the coverage/closure model; use their proved rules, not a weaker sum-only test.
The early tooling lane may start only after this schema and its fixtures are frozen.

## R6 — Implement every conditional trigger, including unknowns

**File:** P2-13c; producer fields in P2-06/P2-12a/P2-12b.

The specified `triggered` function omits a no-window **individual set attempt**, only checking the request's final
reason/bound. The four-entry trail cannot observe a later no-window attempt. It also omits `set:time-limit`
and `set:response-bound`.

**Replace the trigger rule with:**

> For each of the 360 original and 80 sentinel eligible rows, use the exact approved OR predicate on production
> and historical evidence: fewer than ten; any set-attempt no-window outcome (including attempts beyond 3);
> bound firing; any call budget stop; any set/batch reserve/work/host clock cut. Include both set-prefixed and
> batch forms of the terminal reasons.
>
> Retain all-attempt no-window counts/identities in the trace/row summary, separate from the four-entry glue trail.
> The historical rows' missing telemetry is not silently zero: bind the signed frozen F2/F4 reach readings to
> their exact published dataset when using their established zero counts.
>
> Unknown required evidence has its own unresolved coverage entry; it cannot produce an analytical-only zero or
> suppress a required twin. A reached-ten row has zero **lost completion**; a row without a set-bound reason has
> zero **false stop**. Analytical-only coverage requires both endpoints settled and no measured twin.

Add cases for a no-window attempt followed by success, a no-window attempt after index 3, both set-prefixed
clock reasons, missing production reach, and a reached-ten row with an observed diagnostic twin.

## R7 — Correct the selector transformation and finish the scripted vectors

**Files:** P2-04/P2-05.

The `conclude` replacement names bare `c0`, `wc`, `hit`, `hiBelow`, `loAbove`, `probes`, `result`, `proof`,
`rating` and `skips`; those are not its local bindings. Frozen `:716–731` deliberately reads the window through `loc`.
Use this exact return object while retaining the existing `verifyConsumed` and `selected` event above it:

```js
return {
  ...r,
  rating: completeDiagnostic(board, pieces, r.clues, r.rating, ws),
  skips: { subsets: subsetSkips.slice(), repairs: repairSkips.slice() },
  igWindow: {
    c0: loc.c0, wc: loc.wc, hit: loc.hit, hiBelow: loc.hiBelow,
    loAbove: loc.loAbove, probes: loc.probes,
    result: loc.result, proof: loc.noWindowProof,
  },
  counters: { ...counters },
};
```

Replace the escaped-alternation check with:

```powershell
$hits = @(Select-String -LiteralPath (Join-Path $root 'core\engine\select-v4.js') -Pattern 'IG\.|ig-log|ig-params|node:|igBeginLine|igPhase|recordRating|startCall|endCall|markNoWindow')
if ($hits.Count) { throw 'QUESTION: an unmapped prototype hook remains' }
```

`IG\.\|ig-log...` searches for literal pipes, not alternatives. The frozen file really has 1,320 lines; its range
is not a truncation defect.

P2-05 cannot delegate fixture design with “a script where the rescue used 3”, “result per script”, “several in-band
scores” or “derive the expected sequence”. **Replace those rows with literal input maps and expected outcomes
in the pack before dispatch.** Use the checked-in synthetic vectors in `self-test.mjs:9930–9994` as the starting
point, adapting their K/start counts explicitly, not importing/running the frozen self-test from production tests.
In particular:

- Failed results do not carry `igWindow`; the AR1-refusal test must observe its locate/window events or probe
  sequence rather than read `result.igWindow.hit` from a failure.
- A 100-unit scripted rating does not bound a real uniqueness-count primitive to 100. For the 250-unit budget
  test, fix every scripted score to the noncentral in-band value **54**, so the budget fires before finishing/counting,
  and assert exactly three 100-unit ratings and 300 charged units. Test a count overshoot separately against its
  actual count units; never assert “≤300” when a real count can be the last primitive.
- Give each rescue/tail/seed/beam case the complete screen/canonical maps, prior, excluded keys and expected
  event/probe sequence. A range or “raw subset or failure” is not a proof of the named branch.

## R8 — Make prior transport testable and cover the serial entry point

**Files:** P2-07, P2-12c/P2-16a.

`checkBatch`/set validation reject unoffered Hell 1 before a scripted pool is used (`generation-client.js:579`).
Also, returning the same result with and without `igPrior` while gen-v3 ignores it would pass if the transport
assignment were deleted. The task describes the serial path but only updates the client/worker path.

**Replace the test/implementation rule with:**

> Keep P2-07's pure prior-rule and protocol parsing tests on the shipping modules. Run the Hell 1 client/worker
> transport cases through the labelled diagnostic rehearsal copy when it exists; do not add a production offer
> switch or silently broaden `AREAS`. The transport assertion reads the dispatched `igPrior` and, on the active
> gen-v4 copy, the resulting stored candidate prior; deleting the transport line must fail it.
>
> Apply the same frozen eligibility rule in the serial `generateBatch` candidate path. The current mode's
> certificate rule, seen-calibration reuse and completion-pass exclusion are identical to the client path.
> A matching Hell 1 calibration must not silently fall back to the table merely because the serial API was used.

Name these later proof cases and their dependency explicitly in P2-07's ACs. Put the saved-steps cache test in
the existing **`tests/replay-model.test.js`**; its `replayKeyOf` cases already exist around line 1289. Do not leave
P2-08 to discover a file and expand its own allow-list.

## R9 — Fix response-guard lifetime and existing test doubles

**Files:** P2-10/P2-11.

Clearing the single guard when a composite set promise wins disables the following batch's bound. Conversely,
keeping a **legacy** set guard until the outer set+batch `finally` can cancel the batch at the old set's deadline.
The P2-11 test says the timer is cleared after the set; the shared-clock implementation must not do that.
`jobs.addMore` already has a local `guard` for duplicate admission (`jobs.js:403`); use another name.

**Replace the lifetime rule with:**

> Call the response guard variable **`responseGuard`**. A composite gen-v4 set+batch keeps its one timer until
> the whole operation ends; a successful set phase only clears that phase's pending callback. Standalone and
> legacy actions clear their own guard when the action settles, before a following action creates its guard.
> The UI action creates one scope, never an epoch `Date.now` origin.
>
> Adapt every existing injected controller/CLI client fixture that the new calls require (`newScope`, `clock`,
> `prefixSnapshot`), keeping its existing assertions. `fakeClient` in `tests/generator-controller.test.js:74–108`
> currently has none of them; “new cases only” cannot prohibit this necessary fixture update.

Tests must distinguish composite set completion followed by an unsettled batch, and a long legacy set followed
by a batch that legitimately runs beyond the old set's deadline. Retain the held-set and held-batch cases.

## R10 — Fix replay API fields, pre-cutover defaults and known cutover edits

**Files:** P2-14/P2-15.

P2-14 changes the default Hard file to `replay-case-v4.json`, forbids writing it until P2-15, then immediately
requires `--replay-case --check` to pass. That file does not exist. Its probe also reads `events` from
`client.replayPuzzle`; that API returns **`steps`** (`replay.js:598–605,952`).

**Replace with:**

> Before cutover, the default Hard check uses `replay-case.json`; in the gen-v4 family it uses
> `replay-case-v4.json`. An explicit `--file` always wins; the refusal mode always reads the old fixture.
> Screen discovery reads `result.steps`, `step.args.phase` and `step.args.reason`.
>
> Resource probes record `result.steps.length`, `utf8Length(JSON.stringify(result.steps))`, and `result.work`.
> A probe needs the declared nonempty matched sample; no set/puzzle or no ordinary candidate is **not measured**,
> never an empty “every replay matched” pass. Preserve its failure/shortfall and stop for the defined readout,
> rather than inventing records or retrying another seed without the stated rule.

Replace P2-15's open-ended test-edit permission:

> Enumerate the known cutover changes now: the live-route test; the dispatcher test's live gen-v4 target;
> `provenanceVersions`' seven-key expectation; `cliScope`'s live Nightmare result; the refusal mode's new OK line;
> and the five matched-fixture readers. Pin the existing gen-v3 **selector** tests with `selectCluesV3` where
> that is their actual subject. Do not reroute arbitrary generation tests to 26x26 to make them pass, change
> geometry while retaining unrelated expectations, or enlarge `$Allowed` after discovering failures.
> Any other failure stops for a scoped ruling.

A 26x26 replacement can turn a small test into a large search and does not preserve the old test's meaning.

## R11 — Prove the real no-window glue and real pool widths

**Files:** P2-16a, P2-12c.

The proposed worker injects an already-translated `no-window-below` answer. It bypasses selector → `setAttempt`
translation and therefore repeats the original N-V4-16 coverage gap. Its simultaneous `budgetStops: 1` is also
not a genuine no-window termination. The new width test simulates every width; it does not test gen-v4 at
1/2/4 **real** workers.

**Replace with:**

> In a test-only copy, script only the rating outcomes. Keep the production `executeTask`, `setAttempt`,
> no-window translation, protocol, worker pool and client. Force four same-side failures through that chain and
> assert the raw selector side, transported reason, client firing and public terminal reason. A deliberately
> broken translation must fail the test. Budget-stop and no-window cases are separate.
>
> Add a gen-v4 request on the same fixed small Nightmare recipe/seed at real pool widths **1, 2, 4**, comparing
> its consumed keys; retain width 8 as a fold simulation. A clock-cut case is reported as a prefix, not exact
> full-request equality.
>
> The legacy proof bundle also replays at least one ordinary candidate on the **26x26 Nightmare legacy route**
> in the gen-v4 build and requires `matched`; generating the same keys alone is not the plan's legacy replay proof.

The prior/replay proof must assert a nonempty ordinary-candidate sample for each declared case. “Every candidate
has the prior” and “every replay matched” are not passes when generation produced no candidate.

The mixed-side worker script must actually forward its unscripted attempt to the real handler; its current
`?? { fail }` fallback never does so.

## R12 — Make the six browser checks concrete and exercise the advertised paths

**File:** P2-16b.

Use the existing `watchdog.js` mounting/clock pattern rather than designing another app harness. That file
passes the **same scaled clock to both pool and client**. The app forces `quantity = 1` (`app.js:32,98`);
the task never sets three, yet expects three streamed puzzles. A worker that never answers normally exercises
the 115-s stop, not the 119-s hard response guard.

**Replace the relevant checks/setup with:**

> Construct `clock = scaledClock(systemClock, 20)` once and pass it to `createPool`, `createGenerationClient`
> and the response guard through `client.clock()`. Reuse the watchdog page's real-app DOM fixture and call
> `createGeneratorApp(doc, { client, pool, storage, address: false, ... })`.
>
> Use a named, valid committed fixture for each scripted successful set/candidate; specify the exact pack/puzzle
> index and worker handshake/response envelope in the task. Do not make the developer invent valid geometry.
> `set-bound`: show the initial set, allow the next set attempt to succeed, then hold **set assembly**. Assert
> the typed hard-bound failure at virtual 119 s and the unchanged displayed set.
> `batch-prefix`: use the real one-puzzle-per-press action, accept one puzzle, hold **batch assembly**, and assert
> that one puzzle and its history survive with N-PARTIAL. The multi-puzzle prefix remains covered in the client
> unit test.
>
> Each check has an explicit per-check 60-s watchdog even when the runner executes all six. Emit a durable
> JSON/log receipt containing the six names, status, duration and shipping-build source bindings.
> Cleanup is in `finally`: close the owned browser and server and remove the owned profile on failure/timeout
> too; any process termination is limited to that invocation's PID tree.

The existing server API and Edge pipe approach are usable; the issue is the incomplete fixture/wiring contract,
not a reason to add another dependency or browser framework.

## R13 — Complete source binding and phase-aware guards

**Files:** P2-12b/P2-13a, check-list, pre-seal task.

**Add this exact binding rule:**

> Seal the phase-2 driver, PS wrapper, variants, trace, proof/comparator/P5/replay/browser implementations and
> their fixed inputs, in addition to production `SOURCE_FILES`, copies and the plan. Browser receipts bind
> `generator/jobs.js`, locales and replay model/cache as well. A changed reader/driver cannot retain an old
> receipt as if the measurement configuration were unchanged.
>
> Verify the today worktree is clean and its runtime matches the recorded `6b94ffb` fingerprint. `buildTree`
> supports the supplied source map, but its `info.worktree` describes the invoking harness worktree
> (`tree.mjs:303–318`), not necessarily the supplied baseline root. The phase-2 wrapper records the actual
> input-root/base/digest explicitly; do not mislabel the today copy with the candidate's origin.
>
> Before P2-15, G-COPIES uses `--rehearse-cutover`; after cutover it does not. Its expected proto-id anchors
> cannot match an unrehearsed `ALGO_ID = 'gen-v3'`.

The new trace file **is** added to copy fingerprints by the existing tree builder's meta-2 logic; no builder fork
is needed. Preserve the supported `sources`/`manifests`/`filesRoot`/`dest` API.

**G-PROTECTED also needs its stated “base files” semantics.** The new parallel proposal is under the protected
`docs/improve-generating-phase-2/sa-opus/` prefix but is absent from `97a6326`. Committing that approved review
evidence would make today's unfiltered diff fail every task. Exclude additions in this particular historical
guard, e.g. add **`--diff-filter=CDMRTUXB`** to its `git diff --no-renames`; retain G-WORKTREE's exact allow-list
for all new work. Deleting, renaming or modifying a protected base file must still fail. An approved amendment
to an existing protected document requires an explicit updated guard baseline/ruling, not an informal exception.

## R14 — Reduce repeated gates; keep publication and bookkeeping honest

**Shared rules and P2-18/P2-22.**

The 21 explicit full-suite gates, repeated by the orchestrator, already imply **at least 42 full suites** before
pre-seal/merge gates. At the historical 122 + 45 seconds that is about 117 counted verification minutes; it is
not part of the 812 grant, but it is real wall-clock/lock contention.

**Replace check-list §3.3's blanket full-suite rule with:**

> Each task runs its declared focused selectors in one runner; the orchestrator re-runs that focused gate.
> Use the full suite at the shared-primitives integration, cutover and final integrated gate, and when a focused
> result requires broader investigation. Documentation-only tasks run their static/document gates, not an engine
> suite. At parallel joins run the combined affected selectors; do not add a full suite after every unrelated
> tooling merge. Keep the 600-s suite and 60-s browser-check limits.

For P2-18 replace the two-commit sequence:

> Write and bind the plan/seal before execution; do not commit an intermediate P2-18 state. Their digests enter
> the first reservation/receipt. Commit the task's plan, seal, proofs, observations and log once after acceptance.

For P2-22 replace “CI of the push”:

> The current workflow runs on `main` or manual dispatch, not a `gen-v4` push (`.github/workflows/pages.yml:1–4`).
> Report the sealed local gates and query only runs matching the pushed SHA. “No matching run; none expected”
> is truthful; do not claim a stale branch run is this push's CI, and never dispatch the deployment workflow.
> Check `gh pr view`'s exit and assert its actual `headRefOid` equals `git rev-parse HEAD`.

For P2-17's optional README line use:

> Nightmare uses the `gen-v4` search except on the full 26×26 board; its bounded set search can stop early with a reason.

Keep D-P2-16's approved UI/guide sentences unchanged. **59 is arithmetic, not yet a trustworthy completion
estimate while these contracts are unresolved.** Re-estimate affected tooling tasks after the fixes; do not
force them under three hours by leaving choices to the developer. The reduced gates and existing-harness reuse
are the straightforward savings; there is no evidence for promising unchanged AI credits.

## R15 — Parallel execution: accept the three-lane strategy, with these prerequisites

**Reviewed proposal:** `docs/improve-generating-phase-2/sa-opus/parallel-schedule.md` (17:47 draft).

Its main separation is real:
- after P2-01, the selector chain and client/records chain can work independently while the route is inert;
- the tooling chain can start early on a **frozen trace/row/activation contract**, without new production code;
- P2-09 and P2-11 must stay serial in the client lane because both modify `jobs.js` and controller tests;
- the joins before copy/proof integration and cutover are necessary.

Do not treat the current table alone as an executable execution plan. **Replace/add these rules:**

> Record the owner's 17:45 decision as D-P2-17, with message `1575100035077771386`. Use three developer lanes
> (maximum three active developers in this schedule); no additional owner approval for option B is pending.
> The 45-s quiet and sequential locked runs remain. Remove the idle-based elapsed/savings claims from the
> approved execution forecast; no idle declaration exists.
>
> Every command block assigns its lane's literal absolute root before `Set-Location`; `$repo` is not inherited
> across tool processes. Every file-tool read/edit targets that root, not the primary checkout. The dispatch/resume
> names the exact wave/lane base SHA. Main-worktree commands remain orchestrator-only.
>
> Create verified **read-only** junctions only for `frozen-source` and `tree-frozen`. Never share writable
> `phase2/trees`, journals, profiles, ledgers or self-test folders between lanes. Timed runs use the same repo lock.
>
> Before lane T starts, write the complete schemas/API contracts required by R3–R6 and make its imports/test
> fixtures independent of not-yet-created copies, selectors and clients. Future execution-only dependencies are
> loaded only at execution, with synthetic adapters for the unit tests; do not run a real seal or row in lane T.
>
> Moving P2-09's selector events/test also removes `tests/select-v4.test.js` and `core/engine/select-v4.js` from
> lane C's scope and focused command until the join: those files do not exist on C's wave-1 base. Put the two
> observer events into the selector port/proof contract without leaving a 3.25-hour task; split/rebalance a
> coherent slice if necessary, with every resulting task ≤3 h.
> Wave-2/3 merge gates use G-COPIES with `--rehearse-cutover`; only the cutover and later joins omit it.
>
> Give parallel proof/replay/browser work its own test files where the proposal separates ownership.
> Move P2-16b's developer-guide additions entirely to P2-17, including its allow-list and gates. P2-17's
> documentation of the concurrently built browser command uses the frozen interface, not a read of a file
> absent from its base; merge C, S, then T and verify those links/commands after integration.
>
> List the exact shared-file exceptions: non-adjacent `SOURCE_FILES` entries and named `design-detail.md`
> sections. Preserve each task's own documented changes; API/module-tree edits are not replaced merely by the
> generic “append at section end” rule. Any runtime-file or test-helper overlap not listed forces serialization.
>
> The orchestrator commits accepted lane tasks, rebases/merges in the stated order, runs the join gates, and
> records the final SHAs after rebase. Developers never commit, merge or rebase. Shared checklist bookkeeping
> stays on the integration worktree. Treat the proposed per-wave bookkeeping commit as an explicit execution
> convention, not a developer task or a measured-source change.

Update every affected task's header, dependencies, scope, paths and commands—not just the wave table. The
nominal 29.75-hour critical-path calculation is a dependency estimate, **not an observed elapsed-time or
credit forecast**, and must be recomputed after the blocking task changes. Wave 4 remains exclusive for the
cutover/fixture searches. Measurements and the stage-A/owner stop stay serial after development.

## Review disposition

The approved feature, texts and 812-minute authorization do not need to be reopened to fix these defects.
The pack needs one correction round, including its parallel execution contracts, before acceptance or wave 0.
No commit was made by the reviewer.

Validation (2026-11-25 18:21:36–18:21:38 +07:00): the audit and its syntax check pass; `npm run check` passes;
all 33 pack/review/evidence files have strict UTF-8/no BOM, CRLF, no trailing whitespace and a final newline;
protected runtime/tests/specification and the final plan are unchanged. Input-index SHA-256:
`0bd8bc4f393c448990142f772ee0fb29b91439e871bb511a10240245c189b2d8` (47 inputs).

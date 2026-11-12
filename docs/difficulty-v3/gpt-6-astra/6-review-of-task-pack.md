# Pentomino difficulty-v3 — first review of the task pack

| Field | Value |
|---|---|
| Date | 2026-11-12; inventory at 14:49, plus MP09c's late arrival at 14:57 (+07:00) |
| Reviewer | SA2, gpt-6-astra |
| Author reviewed | SA1, claude-opus-5.5 |
| Basis | Accepted `docs/difficulty-v3/report-detailed.md`, RES-01 to RES-35; `clarifications.md`, especially parts E-G |
| Code examined | `6b772a9` initially; MP06a was committed as `3fd99ff` during the review and its handoff was read again |
| Result | **4 Blocker, 3 Major, 3 Minor findings.** Correct the affected tasks before dispatch; this is not sign-off on the unfinished pack |
| Changes made | This review only; no task, checklist, implementation or execution log edited; nothing staged or committed |

## 1. Reviewed versions and limits

All paths in the first table are under `tasks/difficulty-v3/`. Times are the files' **LastWriteTime**, on
2026-11-12, in +07:00. A handoff review checks the contract a later task receives; it is not another implementation
review of the completed task.

| File | LastWriteTime | Scope |
|---|---|---|
| `check-list.md` | 14:43:27.170 | whole checklist; the changed status and summary rows re-read after MP06a |
| `MP01-model-metadata.md` | 13:04:03.619 | Handoff |
| `MP02a-deduction-core.md` | 14:24:49.437 | Handoff |
| `MP02b-pocket-check-and-lookahead.md` | 13:27:09.886 | Handoff |
| `MP03-rules-r3-place-r4-r5.md` | 13:35:41.963 | Handoff |
| `MP04-rules-r7-r9-and-tiers.md` | 14:00:27.335 | Handoff |
| `MP05-decisive-census.md` | 14:24:45.620 | Handoff; census fixtures used to check downstream vectors |
| `MP06a-rate-probe-tool.md` | 14:43:26.067 | downstream API, output and command contracts; accepted Execution log and Handoff |
| `MP06b-probe-and-v2-baseline.md` | 13:44:49.269 | whole task |
| `MP06c-initial-fit.md` | 13:45:59.899 | whole task |
| `MP07-centre-seeking-clues.md` | 14:12:45.999 | whole task |
| `MP08-pure-v3-score.md` | 14:18:15.545 | whole task |
| `MP09a-duplicate-shapes-refused.md` | 14:25:16.934 | whole task |
| `MP09b-v3-claims-in-packs-and-codes.md` | 14:28:21.211 | whole task |
| `MP09c-unrateable-and-unproved-candidates.md` | 14:57:45.178 | whole task; arrived while this review was being written |

The specification versions read were `docs/difficulty-v3/report-detailed.md` (LastWriteTime 12:23:19.008) and
`docs/difficulty-v3/clarifications.md` (11:49:43.689). `AGENTS.md` was read. The source and test anchors below name
the evidence used.

**MP09c-MP17 had no task files at the 14:49 inventory.** The late MP09c file was then read in full; it splits
unrateable/unproved handling from activation, now assigned to a future MP09d. The remaining files, MP09d-MP17, are
outside this pass. Their checklist rows were checked for allocation and dependencies, not approved as executable
tasks. A second pass must read them when written. GC-P2, GL-P3, GF-P4, GB-P4 and GZ are not verified here merely
because their names appear in the checklist.

All inventoried task files passed the read-only UTF-8/no-BOM, CRLF, final-newline and trailing-whitespace checks.
No test suite, generation, calibration or browser run was started by this review. Two small in-memory probes,
described below, wrote no files and took about 0.19 s and 0.46 s of measured application time.

## 2. Blockers

### FP01 — MP06b derives the wrong capped-path statistic and does not verify the production-cap corpus

**Severity: Blocker.** Affects MP06b, its handoff to MP06c, and checklist D19.

**Location.** MP06b:133-157, especially the check at 142-144; MP06c:46-54.

MP06b calls a puzzle capped at the old values when the high-cap run's `mainWork > 50000000` or
`mainNodes > 20000`. These counters include the search **after the first solution**. RES-04 distinguishes a capped
first path from a capped solution count. A first solution found cheaply followed by a long count can exceed those
thresholds and still be rateable under the old caps. The proposed statistic therefore reports count cutoffs as
unrateable paths.

The delivered solver makes this distinction explicitly: `result()` in `core/engine/deduce.js` sets `path` to
`'complete'` whenever S >= 1. The MP05 handoff and `tests/deduce-census.test.js`, especially the test beginning
at line 329, also distinguish the main search, count and census.

There are two further gaps in the same verification:

- A capped-path line has `first: null` and `census: null`; an error line has no deduction result. The subtraction at
  MP06b:135-136 and estimate calculation at 145-146 cannot be applied to every corpus line as written.
- Only selected census cells are re-probed. The handoff can mix high diagnostic caps, the original census budget,
  and several trial budgets. It does not provide one corpus measured under the exact `DEDUCE` that MP08/MP09c will
  use. A capped diagnostic run is also only a lower observation of the work needed, not a proof that twice its
  observed work completes the path.

**Required correction.** Keep D19's cap-selection heuristic, but replace its evidence procedure by this contract:

1. Classify every observation as complete path, capped path, exhausted/no path, or error before reading `first` or
   `census`. A missing value is not zero.
2. Measure the old capped-path share by actually rating the fixed inputs under the old `DEDUCE`; the numerator is
   `path === 'capped'`. Report count cutoffs separately.
3. Use complete high-cap observations for the cap heuristic. A diagnostic path that is still capped must be
   re-measured with a sufficient diagnostic budget or reported as an unresolved failure of MP06b-B03; do not exclude
   it and claim that the corpus passed.
4. After selecting all production caps, re-rate the entire cap cohort under that exact tuple. Require every
   required sample to have a complete first path, or report the failed acceptance explicitly.
5. Compute the C5 numerator only among complete paths, with non-null census data. Supply MP06c one authoritative,
   final-cap row per sample, plus the old/trial observations separately. MP06c must not silently proceed on a
   cap-cohort failure or mix measurements from different budgets.

Record the old and final observed path shares, count shares, errors, budget tuples and numerators/denominators.
The extra read-only rating passes belong to MP06b's announced probe run; update its wall-time allowance.

### FP02 — MP09a overlooks two successful codec tests that use 128 identical pieces

**Severity: Blocker.** Affects MP09a's fixture migration and quick-test acceptance.

**Location.** MP09a's fixture list and test plan, particularly 231-239.

Replacing `repeatedShapes` and changing the property generator is not the whole migration. These existing tests
construct 128 copies of one octomino and require successful encoding:

- `tests/puzzlecode.test.js:718-743`, **"raw: the count-only stress pack of 1,024 cells and 128 pieces needs no
  exact-cover model"**;
- `tests/puzzlecode.test.js:1266-1290`, **"deflate: auto mode keeps the shortest core and raw wins every tie"**.

After the specified pack-boundary check, those encodes fail with `duplicate-shape`. They are not listed as intended
contract changes. The first test's compact-code length and constant-placement-count assertions also depend on
all pieces having the same shape.

**Required correction.** Explicitly own both changes and provide a shared, distinct-shape stress fixture:

```js
const rows = Array.from({ length: 16 }, () => '#'.repeat(64));
const pieces = v1.catalogueShapes(8).slice(0, 128).map((cells, i) => ({
  id: v1.labelFor(i), label: v1.labelFor(i), color: v1.colorFor(i), cells,
}));
```

This is a count-only pack, with no supplied solution. It retains 1,024 active cells and 128 connected, pairwise
distinct pieces. Use `v1.measureFreePlacements` for the frozen v2 claim as before; compare H against the mean of
`log2(1 + count)` over the live counter's per-piece counts, not the identical-piece formula.

A read-only probe verified that this fixture is accepted and round-trips with 128 distinct shapes. At the examined
code, with the original v2 claim and default identity:

| Quantity | Observed |
|---|---:|
| R | 1024 |
| H | 12.477212990727637 |
| Raw compact core | 112 symbols |
| Automatic core | 34 symbols, version 2 |
| Raw escaped core after H + 1 | 398 symbols |
| Automatic escaped core | 271 symbols, version 2 |

Replace the old `< 80` compact assertion with an explicit, justified expectation for this fixture. Keep the
compression comparison and raw-on-tie assertions. The old 849,920-row twin calculation may remain as a direct
count-only engine case, but not as a successfully imported/encoded pack. No frozen golden needs editing: the
24 x 24 golden was separately checked and has 40 pieces of 40 distinct shapes.

Also make the property-corpus construction bounded and explicit in the task rather than leaving "generates sets
without twins" as an instruction to redesign it. Keep the unaffected coverage obligations; do not reduce their
thresholds to make a smaller corpus pass.

### FP03 — MP09a's "one-time" notice repeats when the user simply reloads

**Severity: Blocker.** Affects MP09a and owner decision C4 (b).

**Location.** MP09a:130-147 and MP09a-T04.

The task removes invalid sets in the restored in-memory state, leaves the notice transient, and says that the
next save prevents repetition. Startup does not perform that save:

- `generator/state.js:1079-1087`, `loadGeneratorState`, reads and restores only;
- `createPersistence` starts with `dirty = false`; its subscriber at 1153-1161 sets it only for a changed persisted
  field;
- `flush()` and `destroy()` write only when a timer is pending;
- `generator/app.js:96-108, 284-288` creates persistence and flushes on hiding, but does not mark the restored cleanup
  dirty.

A read-only probe creating a store with the removal notice, then calling `flush()` and `destroy()` without an
edit, produced **zero storage writes**. A user who opens, reads the notice and reloads can therefore get the same
notice again, with the supposedly removed sets still in storage.

**Required correction.** Persist the cleaned snapshot once at startup when restore reports this removal. Reuse
`persistence.saveNow()` after persistence is wired, conditional on the restore-cleanup flag/notice; keep the notice
visible and keep existing storage-failure handling. Expand the `generator/app.js` ownership condition accordingly:
it is needed for startup cleanup, not only if a notice is cleared.

Test the real startup path or its directly called helper with a fake storage: load the offending stored snapshot,
perform no user edit, close/reload, and observe a cleaned stored snapshot and no second notice. Keep the existing
save/restore and language-switch tests. A failed storage write must not throw or claim that cleanup was durably
saved; its existing failure feedback remains.

### FP04 — MP09b's legacy reader and unchanged v2 writer silently lose claim data

**Severity: Blocker.** Affects MP09b; RES-21 and the stored-claim invariant.

**Location.** MP09b:101-106.

The task deliberately makes v2 metrics opaque bounded legacy JSON, but also requires the v2 writer to keep today's
fixed seven-field copy. `core/engine/pack.js:1202-1207` copies only `U`, `B`, `branchTrials`, `rowTrials`, `stop`,
`R`, `H` for every v2 claim. `createPack` and `serializePack` both use that writer.

The read-only writer probe used a claim which the proposed legacy reader will accept:

```json
{"model":"difficulty-v2","score":9,"level":"easy","metrics":{"oldCounter":7,"nested":{"note":"keep"}}}
```

Today's unchanged writer produced:

```json
{"model":"difficulty-v2","score":9,"level":"easy","metrics":{}}
```

Today's strict reader would refuse the input; **the proposed reader change makes this a new data-loss path**.
The task's existing legacy-reader test would not catch it because it does not require the opaque claim to survive
both writer paths.

**Required correction.** Resolve "v2 as today" as follows:

> Preserve the canonical fixed order and bytes for ordinary seven-field v2 metrics. For a legacy v2 metrics object
> that is not exactly that seven-key shape, use the same detached bounded-JSON copy as a v1 legacy claim. Preserve
> every admitted key and value; do not manufacture missing fields or discard extensions.

An exact-key-shape test is sufficient to choose the writer path; it must not reinstate strict metric-value reading
for legacy claims. Add read/create/serialize/read round trips for extra keys, missing old keys and nested opaque
metrics, alongside unchanged normal-v2 fixture bytes and the frozen code goldens. This preserves both accepted
intents: legacy claims are not rewritten and normal v2 encodings remain stable.

## 3. Major findings

### FP05 — The probe handoff is not an immutable, replayable corpus

**Severity: Major.** Affects MP06b/MP06c; downstream use of the now-delivered MP06a contract.

MP06a's accepted handoff says `--output` is **rewritten** after each pack, not appended across invocations.
MP06b:113-129 suggests splitting a case into `--reps 0-1` and `--reps 2-4` without prescribing different output
names or a merge. Corpus B has two requests per cell, while MP06c:46-48 names only
`B-<board>-<level>.jsonl`. Reusing that name loses the first invocation. Re-probing with another census budget has
the same risk.

Furthermore, the JSON lines contain board dimensions and measured results, not board rows, pieces and clues.
They cannot re-rate the exact original input. Regenerating a request can differ near deadlines; RES-14 explicitly
requires enough accepted-puzzle data when identity cannot be established. The task only leaves ignored scratch
outputs and does not define the durable input/evidence manifest. A zero-puzzle request also has no puzzle line.

**Required correction.**

- Capture the generated pack once per request and record its case, rep/seed, requested level, exit/partial status,
  accepted count and identity comparison, even when it yields no puzzle.
- Use unique filenames containing the request or rep range and the budget/run label. Never overwrite the old,
  diagnostic, census-trial or final-cap observations; merge in canonical request/puzzle order and assert no lost or
  duplicated sample keys.
- Run all budget comparisons against the captured inputs, not fresh generation. MP06b can use the existing
  `tools/generate.mjs` `run` override and `probePack`/`landscapeDigest` exports in its allowed driver; MP06a need
  not be reopened merely to do this.
- Give MP06c a manifest selecting exactly the final-cap files of FP01, with a precise replacement/join key, rather
  than a folder of competing runs. Preserve the input data and manifest needed to reproduce the evidence under an
  explicitly owned dated path in `docs/difficulty-v3/`; scratch scripts may stay ignored.

Update the exact commands, artifact paths, ownership and expected time together. The old baseline reports remain
the source of baseline request statistics, not a substitute for the re-rating inputs.

### FP06 — Two "quick-only" task commands actually run the slow codec sweeps

**Severity: Major.** Affects MP09a, MP09b and the checklist's targeted-test convention.

MP09a:243 and MP09b:190 invoke `node --test ... tests\puzzlecode.test.js` without a skip pattern. That file contains
`slow:` tests at 1472, 1492, 1645 and 1693. Merely running a named file does not exclude them. MP09a even says that
these sweeps run later in MP09c, contradicting its command.

**Required correction.** Use this prefix in both targeted commands, retaining their file lists:

```powershell
node --test --test-skip-pattern=slow <the task's test files>
```

Make the same prefix the default targeted-test convention in checklist §3. Unfiltered execution belongs to the
announced GA-P2 gate in MP09c. No extra gate or approval is needed for the corrected quick commands.

### FP07 — MP09a and MP09b omit the living design brief from ownership

**Severity: Major.** Affects both tasks' documentation slots and checklist ownership.

MP09a changes accepted imports and startup behavior; MP09b changes claims and code output. Their documentation
slots list only `docs/design-detail.md` (and, for MP09a, the user guides). `AGENTS.md` requires **both**
`docs/design-brief.md` and `docs/design-detail.md` to change with behavior, storage, URLs or UI. Deferring the brief
to MP09c does not satisfy this per-commit rule.

**Required correction.** Give both tasks sequential ownership of `docs/design-brief.md`:

- MP09a: extend the distinct-shape rule beyond generated sets, and describe refusal of imports and the one-time
  saved-set removal notice.
- MP09b: state summary v3 claims in codes versus full metrics in packs, retention of the estimate flag, and
  unchanged legacy claims. Do not promise the display-note UI before MP10b implements it.

Keep the existing detailed-spec and bilingual guide slots. Add the brief to each technical acceptance row.

## 4. Minor findings

### FP08 — MP07-B02 forbids the fallback that the task explicitly tests

**Severity: Minor.** MP07:289 says an "off-centre or out-of-band repair never stops the search". The specified
`req-3` test correctly returns an off-centre repaired score of 21 at profile 48.

Replace MP07-B02 by:

> Required-unique puzzles are judged after repair: an off-centre repair does not cause an early central-window stop;
> an out-of-band repair is never returned; an off-centre in-band repair may be the fallback at profile 48 or at the
> end; an already-used clue set is never returned.

The algorithm and test vectors need no change.

### FP09 — The checklist has not fully incorporated MP06c and the existing files

**Severity: Minor.** Correct these structural references without changing the orchestrator's Done marks or
completed execution records:

- Header: implementation has started and MP01-MP06a are accepted; the pack is still being completed.
- §1: link the existing MP08/MP09a/MP09b files instead of calling them planned.
- The report-to-parts map must say `MP06 = MP06a + MP06b + MP06c`.
- §4.1: AR1 rejection counts, JR-P3's fit and PROC-P1's initial-fit evidence belong to MP06c, not just MP06b.
  Label base 12/rule 0/2/4 as **starting** values; the later JR-P3 ranges govern the fit.
- §5 N4 must include MP06c and its acceptance. N5's "MP02a to MP08 change no output" needs the MP07 exception that
  §6 already states.
- §7 GV2's record column must distinguish MP06b's probe/cap record from MP06c's fitted rejection counts and fit
  record.
- Ask the orchestrator to add the missing empty MP06c row to the execution summary, preserving all filled cells.
- Incorporate the late MP09c/MP09d split: MP09c owns the refusal handling and has no gate; MP09d owns activation
  and its gates. Update the old `MP09c-activate-v3.md` row, subsequent dependencies, gate owners and forward
  references in MP06a-MP09b when MP09d is written. Define the D24 referenced by the new MP09c file.

The task chain itself is sequential and correctly orders the baseline and fit before centre seeking and activation.
The split is acceptable; it does not reopen the accepted design.

### FP10 — MP09c needs narrower AR1 wording and two edge-case tests

**Severity: Minor.** The late MP09c's Goal says the Generator "must not make such a puzzle" immediately after
describing an estimated Hard rating. AR1 does not ban every estimate: an unfinished census with `Gproved >= 1`
remains eligible. The actual `noProvedGuess` algorithm in the task is correct.

Replace that sentence by:

> The Generator must not accept a Hard-or-above candidate whose rating has no proved decisive guess, even when
> its estimated score is in band. A labelled estimate with `Gproved >= 1` is still eligible.

Add these precise cases to the test plan:

- The proved result of S2 also carries `censored: true`, with `Gproved: 1`; it must still be returned. Keep the
  existing non-censored proved case too. This prevents a future implementation from filtering all estimates.
- For S7, exercise the **repair** catch as well as the subset catch: use H, `require`, seed `repair-2`, return a
  proved score 21 for five clues, and throw a retained `RangeError` object when the first repair has six clues.
  Assert that `selectClues` throws that exact object, not a failed-selection result. The current always-throwing
  S7 seam reaches only a subset rating, so it cannot evidence MP09c-T04's repair behavior.

No algorithm, gate or fixed decision changes are needed.

## 5. Contracts confirmed and work for the second pass

| Area | First-pass conclusion |
|---|---|
| Delivered model and deduction API | The later tasks use the delivered metadata and `measureDeduction(model, limits, diagnostics)`; no incompatible result-shape assumption found |
| Census, `Gproved` and MP08 vectors | The MP05 fixtures agree with the CF1 choices `[11, 6]`, complete/estimated information, and Gproved semantics used later; no need to reopen MP05 |
| Formula and ranges | MP08 preserves full-double information, one rounding, the accepted knob ranges and `base.max + max(rule) <= 16`; the valid G = 0 invariant is correctly covered |
| Centre seeking | MP07 follows accepted C2: final-result comparison, memoised repairs, repaired-key exclusion, no centre for an unbounded band, unchanged 64 subset profiles; FP08 is wording only |
| C1 | MP09b correctly carries `censored: true` in full and summary claims, validates its relation to `censusComplete`, and omits false on writing |
| AR1 and unrateable paths | The late MP09c correctly prepares subset/repair refusal, spent-profile accounting, neutral steering, the reserve check after a spent profile, and the worker error. Activation is now MP09d; add FP10's edge-case coverage |
| Duplicate-shape boundary | Canonical free-shape comparison, null guard, issue parameters and bilingual error paths are specified correctly; FP02 and FP03 close the missing test and startup consequences |
| Frozen code compatibility | Keeping the old Player sample as the source of the unchanged v2 goldens is acceptable; it is not a reason to block this pack |
| Gates already executable | GV2 has a case selector, `--workers 4`, an output base, shard bounds and an announce rule. The 18 selected cases were confirmed by a read-only matrix listing. GF-P1/GA-P1 have commands, times and records |
| Ownership | One task at a time prevents simultaneous file ownership conflicts; add the specific document/artifact ownership of FP05 and FP07 |

The existing task sizes are broadly credible as active developer time plus the separately stated gate time.
Before dispatching MP09a, incorporate the concrete fixture migration and startup fix; do not leave their discovery
to a developer faced with a failing quick suite. MP06c's grid has 365,400 knob sets (up to 328,860,000 A-corpus
score evaluations at 900 puzzles, before quantiles and sorting), so its "seconds" estimate is not acceptance
evidence: measure a bounded prefix and keep the full fit within the existing ten-minute command rule.

The second pass must check the actual remaining files for:

- MP09d: integration of MP09c's handling with the real v3 measurement, v2 importer updates, GC-P2's executable
  code matrix/browser commands, and all changed pinned tests. Check that the split's new gate owners and
  dependencies are propagated throughout the pack.
- MP10a/MP15b: the existing-client auxiliary method, bootstrap on a cold or timed-out client, cancellation and
  overlap tests; no second pool.
- MP12: actual GL-P3 shard commands, worker count, times, coverage records, calibration freedoms within the
  accepted ranges, and the lock before P4.
- MP13: `generation.made`/`generation.setOrigin`, the **64/16** provenance bounds, overflow and pack-size behavior.
- MP14-MP16: recorder identity, detail channel, `Gproved` events/table, replay bounds and truthful failure states,
  bilingual UI, and their precise heavy/browser gate commands.
- MP17: final regression only, no refit, and release notes in `docs/difficulty-v3/final-<date>.md` as C3 decided.

No finding requires reopening an owner decision. FP04 clarifies the compatible reader/writer contract; all other
required changes implement already accepted behavior or make its evidence valid.

**Sign-off:** first pass complete; **not signed for dispatch of the affected tasks until FP01-FP07 are resolved**.
MP07, MP08 and MP09c have no algorithmic blocker in this pass. MP09d-MP17 remain unreviewed.

## Second pass

Date: 2026-11-12. Reviewer: SA2, gpt-6-astra. Initial source revision: `60575a4`; MP07 is in progress and
frozen. No implementation, task file or execution log is edited by this review. The newer owner decisions
P-OD1-P-OD3 in `clarifications.md` Part H are included: census 10 million pending calibration, work 760 million,
and the fitted zero penalty pending the MP12 comparison.

### Priority tranche: MP08 and MP09

The following complete task files were reviewed. LastWriteTime is on 2026-11-12 in +07:00.

| File under `tasks/difficulty-v3/` | LastWriteTime | Disposition |
|---|---|---|
| `MP08-pure-v3-score.md` | 17:31:00.998 | No blocking contract issue; the fitted values and carried R8 pin are consistent |
| `MP09a1-duplicate-shapes-refused.md` | 15:43:35.011 | FP02/FP06/FP07 incorporated, including the additional twin fixtures and bounded property migration |
| `MP09a2-saved-sets-notice.md` | 15:32:03.138 | FP03/FP07 incorporated; startup save and failure path now have explicit ownership and tests |
| `MP09b-v3-claims-in-packs-and-codes.md` | 15:33:26.273 | FP04/FP06/FP07 incorporated; opaque legacy metrics retained and summary estimate flag preserved |
| `MP09c-unrateable-and-unproved-candidates.md` | 15:33:26.178 | FP10 incorporated as S2b/S7b; subset/repair accounting remains consistent |
| `MP09d1-measure-v3-and-v2-names.md` | 15:32:47.196 | Measurement, v2 importer inventory and protocol contracts checked |
| `MP09d2-activate-v3.md` | 15:32:02.546 | SP01 and SP02 below |
| `MP09e-code-format-evidence.md` | 16:02:06.511 | Matrix, code framing, share-preparer interface and browser ownership checked |

#### SP01 — Scope the proved-guess promise to generated puzzles

**Severity: Major.** MP09d2's Goal, MP09d2-B01, design-brief text and both user-guide sentences say that Hard and
above always need a proved/real guess, without limiting this to generated puzzles. That is not the accepted AR1
contract. `rate` and derived display ratings remain unfiltered; an unfinished census can produce a Hard-or-above
estimate with `Gproved === 0`. The task's own 41-I-strip rating case exercises that distinction.

**Fix:** say, consistently, "Newly generated Hard-or-above puzzles require at least one proved decisive guess.
Imported and older puzzles are not filtered; an unfinished-census rating is a labelled estimate." Keep the
unfiltered `rate` algorithm and its estimate test. MP09d2-B01 must separately require a v3 measurement from `rate`
and a proved guess from **generation acceptance**. Do not repair the wording by rejecting such ratings in `rate`.
MP10's display documentation should use the same distinction.

#### SP02 — The activation command sequence aborts on the expected old-fixture failures

**Severity: Major.** MP09d2's exact targeted command includes `tests/generate.test.js` and
`tests/puzzlecode-cli.test.js`, which consume the old recipe/fixtures. It then unconditionally throws on nonzero
exit, before GF-P2 can replace those fixtures. The implementation steps expressly allow those same
fixture-dependent failures before GF-P2. The GA-P2 command similarly throws before the instructed UI-flow
expectation update.

**Fix:** split the sequence explicitly:

1. Run the measurement, scripted-selection and other fixture-independent checks first, with ordinary fail-fast
   handling.
2. Record pre-GF fixture-dependent failures as expected only against the task's named allow-list; any other
   failure stops the task. Run the announced GF-P2.
3. Run the complete targeted command with strict exit checking after the fixtures exist.
4. For GA-P2, retain the first full-suite failure evidence, permit only the listed UI-flow expectation migration
   after inspecting it, then obtain a passing verification of the changed tests and a clear aggregate gate verdict.
   D21 remains an owner-controlled exception, not permission to turn arbitrary failures green.

The task must give executable commands for this ordering, rather than a fail-fast script which cannot reach its
own repair step.

MP08-MP09 REVIEWED

### Remaining reviewed versions

The remainder was read in full. Times below are LastWriteTime on 2026-11-12, +07:00; paths are under
`tasks/difficulty-v3/` unless stated otherwise. The priority tranche above was completed before the new D21 answer
arrived at 18:11. That answer is covered separately by SP03; the earlier checkpoint does not approve an impossible
placement of its new gate.

| File | LastWriteTime | Scope |
|---|---|---|
| `check-list.md` | 17:31:01.088; D21 amendment re-read at 18:11:43.281 | index, ownership, D19-D35, traceability, gates; no Done cell edited |
| `MP06b-probe-and-v2-baseline.md` | 15:31:34.761 | Amendment A1 and completed handoff; verification of FP01/FP05 |
| `MP06c-initial-fit.md` | 15:55:05.799 | input contract and completed handoff |
| `MP07-centre-seeking-clues.md` | 15:32:47.153 | FP08 disposition and downstream contracts only; frozen |
| `MP10a-auxiliary-requests.md` | 16:07:14.196 | whole task |
| `MP10b1-display-rating-player.md` | 16:10:35.013 | whole task |
| `MP10b2-display-rating-generator-and-pages.md` | 16:12:54.064 | whole task |
| `MP11-calibration-tooling.md` | 16:17:05.258 | whole task |
| `MP12a-calibration-slice.md` | 16:20:44.257 | whole task |
| `MP12b-full-landscape-and-lock.md` | 16:22:18.453 | whole task |
| `MP13a-provenance-engine.md` | 16:56:27.926 | whole task |
| `MP13b-provenance-apps-and-fixture.md` | 17:14:41.037 | whole task |
| `MP14a-detail-channel-and-clue-recorders.md` | 16:45:53.669 | whole task |
| `MP14b-set-and-layout-recorders.md` | 16:48:12.667 | whole task |
| `MP15a-replay-engine.md` | 16:55:02.992 | whole task |
| `MP15b-replay-worker-task.md` | 16:54:00.055 | whole task |
| `MP16a-replay-dialog.md` | 16:58:54.268 | whole task |
| `MP16b-dialog-wiring-and-documents.md` | 17:00:59.791 | whole task |
| `MP17-final-evidence.md` | 17:20:38.336 | whole task |
| `docs/difficulty-v3/claude-opus-5.5/6-response-to-task-pack-review.md` | 15:43:50.527 | whole response, verified against the amended tasks |
| `docs/difficulty-v3/report-detailed.md` | 12:23:19.008 | accepted contracts and task/gate ownership |
| `docs/difficulty-v3/clarifications.md` | 18:11:43.309 | accepted answers, Parts E-G, P-OD1-P-OD4 and the new Part I answer |

No test, generation, timing, browser or calibration run was started in this second pass. Source reads were used to
check the named APIs and the existing startup, renderer, solver, recorder, protocol and harness behavior. The
working-tree MP07 edits were not changed or treated as a new accepted implementation.

### Verification of SA1's FP01-FP10 dispositions

| Finding | Second-pass disposition |
|---|---|
| FP01 | Resolved in Amendment A1: classification, real old-cap observation, complete diagnostic inputs and one final-cap cohort; count-cutoff handling is an acceptable addition |
| FP02 | Resolved in MP09a1: both 128-piece tests and the further affected twin fixtures are explicitly owned; the property migration is bounded |
| FP03 | Resolved in MP09a2: startup calls `saveRestoreCleanup`, with a durable write and a storage-failure test |
| FP04 | Resolved in MP09b: ordinary v2 ordering stays; nonstandard admitted legacy metrics survive both writer paths |
| FP05 | Resolved for MP06b/MP06c: captured inputs, unique labelled runs, manifest, join key and authoritative final observations; SP06 identifies a recurrence in MP12 |
| FP06 | Resolved in the corrected codec commands and the checklist's targeted-test convention |
| FP07 | Resolved for MP09a1/a2/b; SP07 identifies the same documentation ownership gap in later tasks |
| FP08 | Resolved in MP07-B02; RES-15a is now a separate, later authorised amendment, not a reason to reopen FP08 |
| FP09 | Resolved in the current index, parts map, ownership and traceability; execution marks remain the orchestrator's |
| FP10 | Resolved: narrowed Goal, eligible estimate case S2b and repair-error propagation case S7b |

All ten dispositions are accepted. This closes the **first-pass** findings; it is not acceptance of the new
second-pass contracts below.

### Findings continued

#### SP03 — The new D21 v3 revalidation is assigned before a v3 rater exists

**Severity: Blocker.** New evidence during this review: P-OD4 / `clarifications.md` Part I, accepted at 18:09.
Affects MP09c, MP09d1/d2, MP11/MP12 and checklist D21/D24.

The answer assigns the N = 8, 12, 16 simulation on **v3 rating sequences** to MP09c. But MP09c explicitly adds
handling while `rate` is still v2, owns no heavy gate, and must not edit `rate`. `measureV3` does not arrive until
MP09d1; `rate` and `MODEL` switch in MP09d2. The current task cannot run the required production-v3 experiment.
It also has no command, output directory or time allowance for that experiment. The ordinary v2 sequences used by
MP07 are not substitute evidence.

**Fix:** have the orchestrator and plan author correct this ownership explicitly, preferably to MP09d2 after the
switch and before its final fixture/full-suite gates, or to a named post-activation subpart. Give it the D21 case
population, an executable no-stall counterfactual capture/simulation procedure, N = 8/12/16, workers, time bounds,
artifact paths and an announced gate. Keep N >= 12; choose 16 only if its measured misses are zero; if neither
allowed value works, report rather than invent a larger or smaller value. Include skipped, capped and AR1-refused
profiles in the accounting tests: none advances or resets the stall counter. A changed N must precede the relevant
fixture refresh. MP12 must receive and report the chosen N and the Hell-cell measurement (SP16).

Do not silently reassign an author's explicit answer or duplicate `measureV3` inside MP09c. MP07 remains frozen.
This is the finding that needs to go back to the **plan author/orchestrator** now.

#### SP04 — The display-rating tasks miss startup and renderer invalidation

**Severity: Major.** MP10b1, "Where the Player shows it"; MP10b2, "What to build in the Generator".

- The Generator instructions only subscribe to future `set`/`puzzles` reference changes. The app creates its store
  from `loadGeneratorState` **before** creating the controller (`generator/app.js:96,123`), and
  `store.subscribe` does not immediately call its listener (`generator/state.js:179-190`). An untouched restored
  set therefore never supplies its initial wishes, contrary to MP10b2-B01 and test 3.
- The Player card renderer returns early when its `drawn` inputs are unchanged
  (`player/ui/puzzle-list.js:176-190`). None is `displayRatings`. Updating the call to `setRating` inside the later
  loop is insufficient: a reply that changes only the display-rating map leaves the card on its old scale.
- MP10b1-B02 says a puzzle that cannot be re-rated gets the failure note, but the display table and no-worker tests
  deliberately suppress it for a settled `unavailable` result. RES-23 says a rating error keeps the claim **with**
  "could not be re-rated"; this exception is not stated there.

**Fix:** call the Generator's wish builder once on controller construction, then subscribe and unsubscribe on
destroy; include `displayRatings` in the Player card renderer's invalidation state. Add tests that start from a
restored store with no user edit and that deliver a derived rating with no navigation/language/verification change.
Use the failure note for a settled unavailable request too, or obtain and state an explicit exception consistently
in the business criterion, display table, documents and tests. Pending entries may still show the claim without a
failure note.

#### SP05 — Auxiliary tests require mutually incompatible queue states

**Severity: Major.** MP10a, required cases 5 and 7, and its “never delay … a certificate” promise.

Case 7 asks for a **running** auxiliary request while a main request is active, then expects `cancelAll()` not to
settle it. Under rules 1-4 this cannot be the intended fixture: an auxiliary request submitted during main work
waits, and starting main work after an auxiliary request marks it `byMain` and cancels it. Case 5 likewise needs to
separate aborting a waiting request beside main work from aborting a running request after main work.

There is a second overstatement: both certificates and auxiliaries use the same FIFO `idleQueue`
(`core/browser/worker-pool.js:483-498,562-564`). They do not cancel one another, but one idle job can wait for
another; unchanged `worker-pool.js` cannot prove zero delay for every certificate.

**Fix:** test waiting-auxiliary cancellation while a held main task completes unchanged; separately test a running
auxiliary under an ended token alongside a held idle certificate. Exercise `cancelAll`/`recycle` and re-queue with
**no active main request**; exercise new-main cancellation separately and require rejection. State the accepted
RES-29 promise (“never cancels or supersedes certificates”), rather than a stronger certificate latency guarantee.
Main-work priority and prompt cancellation remain required.

#### SP06 — MP12 reintroduces destructive probe splits and leaves the fit input implicit

**Severity: Major.** MP12a, "One round", step 2 and "Choosing a change"; MP12b's ordered change round.

The command writes `A-<case>.jsonl`, then advises splitting `--reps 0-4` into `0-1` and `2-4` without different
filenames or a merge. `rate-probe` rewrites its output (`tools/rate-probe.mjs:647`); the second command loses the
first observations. Census trials need distinct names too. This is FP05 again, after that finding was correctly
fixed for MP06. MP06c's actual fit also expects a manifest and `(request, puzzleId)` joins, whereas MP12a hands it
raw per-command JSONL files and merely says to point the script at them.

**Fix:** prescribe unique `<round>-<case>-r<range>-<budget>.jsonl` paths, a request manifest (including empty and
partial requests), canonical merging, duplicate/missing-key checks and an explicit adapter to the fit input. Fit
only complete, identity-matched observations; classify failures before reading `first` or `census`. Preserve every
old/trial/final file and budget tuple. Regeneration remains allowed by RES-14, but an identity mismatch is not
silently treated as the same puzzle. Apply A1's complete-diagnostic rule when selecting raised caps; a still-capped
diagnostic is not an observed maximum. Specify the final verification under the exact chosen tuple.

#### SP07 — Later documentation slots conflict with the same-commit rule

**Severity: Minor.** MP10b1, MP12a, MP13a/b and their checklist ownership rows.

MP10b1 changes visible Player behavior but leaves the living brief to MP10b2. MP12a may change production knobs,
caps, `K60` or `SHARES` yet says its documentation slot is “none”. MP13a/b change pack metadata and saved state while
explicitly excluding the brief. `AGENTS.md` requires both living specifications to change in the same behavioral,
storage or format change.

**Fix:** give these tasks narrow sequential ownership of `docs/design-brief.md` and the relevant
`docs/design-detail.md` facts. MP12a may leave the final measured landscape narrative to MP12b, but must keep current
behavior and values/references correct immediately. Do not repair this by editing historical reports. This repeats
the ownership issue of FP07, not a request for unrelated prose.

#### SP08 — Replay discards an ordinary multi-puzzle pack's valid provenance

**Severity: Blocker.** MP13a's `readProvenance` validity table versus MP15a's first algorithm line and fixture tests.

MP13a rejects a whole `made` map when it has more keys than `puzzleIds.size`. MP15a accepts the pack's whole
`generation` object but calls:

```js
readProvenance(generation, new Set([puzzle.id]))
```

Each GF-P4 pack has four puzzles and four records. The map is therefore rejected before replay; even the
calibration record vanishes. MP15a's case 1 (“every puzzle of both fixture packs is matched”) cannot pass as written.
MP15b's one-entry wire payload masks this defect; it does not repair the public engine API.

**Fix:** after bounded structural validation, project the requested puzzle's **own** `made` entry into a one-entry
object for per-puzzle validation, preserving errors on that entry and `setOrigin`; or explicitly provide all pack
puzzle ids to the full-map reader. Keep MP13a's whole-pack validation at the actual pack boundary. Test the same
puzzle with full multi-entry generation metadata and with the one-entry worker form; their results must agree.
Do not weaken the test by passing a hand-filtered object everywhere while the API still promises whole-pack input.

#### SP09 — Replay's work meter does not count the work specified by RES-29

**Severity: Blocker.** MP14a/b accounting, MP15a `record(event)` and `REPLAY.work`, checklist D31/D33.

MP15a returns from `record` for hidden calibration events **before** accounting for their work. Capped ratings
emit `unrateable` with no detail, so their potentially large spent work is also zero. Uniqueness work is guessed as
one `countRowLimit(board)` per emitted repair event: `makeUnique` actually calls `countSolutions` in a loop
(`core/engine/clues.js`, `makeUnique`), including the final count and successful zero-add repairs which emit no
event. A bound per count is neither the actual trial count nor necessarily an upper bound on the whole finish.

Thus a candidate replay can spend its set calibration and several expensive failed ratings while the meter
hardly moves. This is not the accepted “sum of work of every rating, census included, plus every uniqueness
repair's trial counters, plus one per recorder event”.

**Fix:** add a precise accounting channel in MP14a/b, separate from visible steps. Charge each rating once,
successful or capped, and each actual uniqueness count's trial value, including zero-add finishes. Charge before
filtering calibration events; avoid double-counting the census already in `search.work`. Check the bound at every
accounting/event boundary and propagate the private stop sentinel. Make the measured total available to MP15a's
case 13 through a defined diagnostic/result contract. Add tight-cap tests that stop during a hidden calibration,
a capped rating and a zero-add repair. The fix implements RES-29; it is not permission to change solver counters.

#### SP10 — The byte bound is applied after buffering the trace and can be exceeded

**Severity: Major.** MP15a's algorithm, step construction and case 8.

The algorithm buffers all raw events, completes both expensive runs and only then converts and checks bytes.
More importantly, it reserves the final step's serialized size but never checks that the final step alone fits:
`steps.push(final)` is unconditional. A small positive `maxBytes` below that size returns an over-budget result.
Neither custom limits nor an early STOP have a complete state contract: internal `'to-run'` is not a public
`StageState`, and a byte-truncated result may retain the full comparison state.

**Fix:** define and validate the limit domain; account for retained event/step bytes incrementally rather than
unbounded buffering. Reject an impossible caller limit before running when the mandatory stored-final step cannot
fit; do not silently exceed the bound or omit that promised step. Count the chosen serialized representation
consistently. On any incomplete trace, expose only public stage states
and do not present its final endpoint as verified. Test a limit smaller than the final step, an early set-stage
STOP, byte exhaustion during recording, and the maximum retained bytes.

#### SP11 — The final step loses clues without solutions and discards available census detail

**Severity: Major.** MP15a's final-step row; MP16a's board and score-table consumers; RES-29/RES-30.

- The final step places the stored solution “or none” and carries only clue **ids**. MP16a obtains clue poses from
  `board.placed`. In an `omitSolutions` pack there are no such placements, although `puzzle.clues` still contains
  the given poses: the stored puzzle's final board loses its clues.
- The final step always has `detail: null`, even after a matched replay. RES-30 requires the final puzzle's table
  to use the recorded choices/census when available. The selected event identifies the winning subset/repair, so
  its detail is available; deliberately dropping it makes the final table say “not available” unnecessarily.

**Fix:** include the known clue placements in the final board even when no solution is stored; never invent the
remaining placements. For a matched full claim, attach the selected subset or last selected-repair detail from the
same measurement. Keep unavailable data null for an unavailable replay/summary as appropriate. Test the final
board of an omitted-solution pack and the final guess-node table of both an unrepaired and repaired winner.

#### SP12 — A legacy v2 metrics object is not proof that its breakdown can be calculated

**Severity: Major.** MP15a's `breakdown` rule and MP16a's legacy-table rule, after MP09b/FP04.

MP09b deliberately admits opaque bounded v2 metrics, including `{ oldCounter: 7 }`. MP15a nevertheless constructs
`2 * U` and `8 * log10(1 + B)` for **any** v2 claim with metrics. Missing or nonnumeric U/B produces NaN (then null
after JSON serialization), violates the plain-finite-JSON step contract and can show a fabricated/broken table.
The first-pass compatibility fix must not be undone by this later consumer.

**Fix:** calculate the frozen v2 terms only when their required inputs are finite numbers in the valid arithmetic
domain. Otherwise keep the original total, use `breakdown: null` and label the terms unavailable. Do not reject or
rewrite the legacy claim. Add missing, extended and nonnumeric legacy-metric cases to replay and table tests.

#### SP13 — Two trace tests contradict the valid calibration and repair sequences

**Severity: Major.** MP15a case 2 and MP16b Part A checks 1-2.

MP14a emits rated stage 5, repair stage 6, then further rated/selected stage 5 events in execution order.
MP15a's “stages never decrease” assertion therefore rejects a normal `require` trace; even a last repair followed
by `selected` is 6 -> 5. Sorting the trace to satisfy that assertion would destroy its meaning.

MP16b opens the **first** generated card, then requires a stage-4 retile. The first accepted puzzle can be the
reused calibration, and MP15a explicitly requires that puzzle to have **no stage 4**.

**Fix:** assert the chronological event contract, allowing the specified stage-5/6 interleaving, with final stage 7
last. For the retile UI test, select a puzzle whose `made.kind === 'candidate'` and pin a bounded fixture/seed that
provides one. Test the calibration card separately and require no retile stage. Keep the explicit unavailable
stage assertions; do not make generation perform a fictitious walk.

#### SP14 — D31's zero-add repair exception and its text need one consistent definition

**Severity: Minor.** Checklist D31, MP14a repair paragraph/case 7 and MP16a's locale variants.

MP14a correctly specifies an event for a repair which fails before adding a clue (`addedId: null`,
`reason: 'not-proved'`). But D31 and case 7 say a finish that adds no clue emits none. Every rejection sentence in
MP16a also takes `{piece}`, without a no-piece variant.

**Fix:** state “successful zero-add finish emits none; failed zero-add finish emits one failure event” in all three
places, and give the no-piece failure a locale sentence that does not render “null” as a piece name. Test that exact
event and both languages. Account for the successful zero-add work separately (SP09).

#### SP15 — Compact mode silently drops the final tie-break of `ranked`

**Severity: Minor.** MP16a's compact filter and synthetic case 1, against RES-30.

RES-30 names the P1 `ranked` comparator. It orders by band distance, centre distance, then canonical clue key
(`core/engine/clues.js`, `ranked`). MP16a uses only the first two fields and declares every score-distance tie
not an improvement. A later tied score with a smaller clue key is a strict improvement under the named comparator.

**Fix:** either carry/recompute the same canonical clue key and apply the full comparator, with a tied-score
regression case, or explicitly record that compact mode uses only a score-distance projection rather than claiming
to use `ranked`. The former follows the accepted contract without a new choice. Do not change generation's tie-break.

#### SP16 — The calibration pack has no producer for required search/repair evidence

**Severity: Major.** MP11's record schema; MP12a/b's record requirements; RES-25 and the new D21 answer.

RES-25 asks the calibration record to include repaired candidates. Part I now also requires ratings per puzzle and
generation time for every Hell cell. MP11 records only each accepted puzzle's final clue count/rating and independent
profile samples; neither records how many subset/repair ratings the search spent, nor whether/how a candidate was
repaired. A final `metrics.work` is the cost of one rating, not the cost or profile count of the whole search.
MP12's record outlines cannot recover the missing facts from those fields.

**Fix:** explicitly allocate a bounded measurement producer before the lock: extend the diagnostic instrumentation
or reuse the D21 capture method, with defined counters and denominators (subset ratings, repair ratings, rejected/
capped profiles, successful repairs; per selection and/or per accepted puzzle). Give the relevant `require`
population as well as the Hell cases, commands, artifact paths, worker count and timing slot. Teach the reporting
task to consume that evidence and assert a small known multi-repair vector. If the evidence is intentionally
omitted, that needs a stated acceptance change, not a claim that RES-25/D21 were completed.

#### SP17 — GZ can pass on missing outputs or read a stale pack from an earlier run

**Severity: Major.** MP17's generation loop, `summarise.mjs`, probe loop and MP17-T03.

The loop reuses `tests/artifacts/MP17/<name>.json`. A no-result CLI run writes no file; it does not remove a previous
file. The summary can therefore read a previous run's pack beside the new exit/time. If files really are absent,
the summary simply continues and can exit 0 with **zero** Hard-or-above puzzles and no failures. It does not check
the expected 12 unique run identities, exit/output/count consistency or an explicit approved-miss list.
Conversely, the probe loop unconditionally opens p1/p2/p3, even though the task expressly permits an evidenced
empty run in a low-availability cell.

**Fix:** use a fresh attempt directory, or remove only this run's named outputs before each invocation; record an
output digest alongside the invocation. Validate the complete run manifest, expected names/seeds/counts, output
presence and 0/2/1 exit semantics. An empty/partial result must be an explicit finding or an approved exception linked
to MP12b, never a successful coverage proof. Require nonzero proved-Hard evidence before making MP17-B01's observed
claim. Probe only current produced packs and record skipped-empty inputs explicitly. Keep unavailable levels visible
in the verdict and the release record.

#### SP18 — GZ runs heavy fixture regeneration before announcing the gate

**Severity: Major.** MP17, "The lock checks (step 1, before the announcement)", and implementation steps 1-2.

That allegedly light step includes both `record-fixtures --check` and `--replay-case --check`. Both regenerate
puzzles; the latter performs the real set and two batches of MP13b's recipe. These are explicitly GZ gate commands,
not source inspection, and can overlap the other repository's timing run under the written order.

**Fix:** only git inspection and printing locked constants may precede the announcement. Acquire the orchestrator's
exclusive heavy-run slot **before either fixture check**, include them in the announced duration, and then perform
the checks/full suite/runs. Keep per-command exit checks and the ten-minute limit. Apply the same rule to retries;
“--check” means no fixture writes, not no expensive computation.

#### SP19 — The referenced browser driver cannot prove the keyboard criteria, and GZ omits phases

**Severity: Major.** MP16b keyboard check; MP10b2/MP16b/MP17 browser evidence and GZ's “every page” claim.

The native client in `tasks/regenerate-puzzle/check-list.md` §7 only navigates and polls; it sends no
`Input.dispatchKeyEvent`. Synthetic DOM key events do not prove native Tab traversal or Escape closing a modal.
The repository already has a trusted-key handshake in
`tests/browser/puzzle-code-acceptance.js:2018-2045` (`data-stage="key-..."`), but the tasks do not give a driver for it.
GZ opens that page with no query, so it only runs `phase=main`: its keys and 390 px/coarse-pointer phases are skipped.

There are also evidence gaps in the copied driver: it writes fixed `browser.json`/`browser.png` names (one output
directory per page/phase is needed), and several older pages expose their counts in `#summary` rather than
`data-summary` (for example `rendering.js:725-727`, `generator-flow.js:988-990`,
`acceptance.js:717-720`). Polling only `dataset.summary` cannot record those promised counts.

**Fix:** supply a ready-to-run bounded CDP driver/extension for the known key handshake and use trusted
Tab/Shift+Tab/Enter/Escape in the replay check. Add explicit GZ runs for main, keys and narrow; set the narrow
viewport and touch emulation and record each phase separately. Use per-page/per-phase artifact directories and a
`data-summary`/`#summary` fallback. Give the exact invocations, expected time and cleanup behavior, not a new
browser-automation design exercise for the developer. Known hardware-blocked checks remain honestly blocked.

### Assessment of D26-D35 and remaining execution risks

| Decision | Assessment |
|---|---|
| D26 auxiliary module, no second pool | Mechanism accepted; repair the contradictory fixtures and overly strong certificate wording (SP05) |
| D27 shared display scheduler | Factoring and claim preservation accepted; startup, invalidation and settled-unavailable presentation need SP04 |
| D28 calibration record additions | `clues ?? G` compatibility and v3 columns are consistent; add the missing search evidence of SP16 |
| D29 bounded calibration rounds | Ranges, caps, owner escalation and P-OD1-P-OD3 review are consistent; repair corpus persistence/fit handoff (SP06) |
| D30 provenance, skip replay, CLI one-line handoff | Accepted; preserve 64/16 encoding caps, 2,128/64 ordinal bounds and writer fallback; fix the per-puzzle/full-map mismatch (SP08) |
| D31 repair events and extra failure reasons | Useful and compatible implementation detail; make the zero-add exception explicit and expose actual cost (SP09/SP14) |
| D32 walk `start`, `carveFlat` signature retained | Accepted: the start supplies the layout replay needs; caller-side successful-region events suffice without changing the recursive carve API |
| D33 `Step.detail`, placement objects, replay bounds | Useful shape refinement; the present metering/byte/final-step algorithm is not accepted (SP09-SP12) |
| D34 pure replay model beside DOM dialog | Accepted separation; fix trace tests, comparator fidelity and browser proof (SP13/SP15/SP19) |
| D35 regression-only MP17 and release-notes section | Scope accepted; fix coverage/stale outputs and gate scheduling (SP17/SP18/SP19) |

The sequential ownership model is sound: none of these tasks needs a concurrent writer in this repository. Commands
generally specify `--workers 4` where the tool supports it, shard/checkpoint handling, output paths and announce rules.
The exceptions are the new D21 revalidation and the issues above; adding the word “gate” without an executable
procedure is not enough.

The 20-60 minute sizes are plausible for most coding parts **after** these contracts are repaired. MP15a presently
bundles API projection, exact comparison, partial-state construction, accounting and output-budget design into one
60-minute task; it is not ready for a developer without further design work. Consider two sequential parts once the
contracts are fixed. Keep measurement wall time separate from developer time. In particular, MP13b's search over
50 seeds can perform a set and two timed batches per seed: “a few minutes” is not an upper bound. Give that search
a resumable/bounded procedure or a measured accepted seed before its GF-P4 dispatch, and verify that the added
recorder assertion fits the promised 60-second quick-test allowance.

The new D21 stop changes neither the provenance integer upper bounds nor AR1's intent, but its final value must be
measured on v3 before the lock. The 5 % census criterion, zero-penalty comparison and accepted 760-million work cap
remain P-OD1-P-OD3 decisions, not invitations to reopen the score model.

**Second-pass result: 3 Blocker, 13 Major, 3 Minor findings (SP01-SP19).**

**Blockers:** SP03 (D21 gate scheduled before the v3 rater), SP08 (whole-pack provenance rejected by replay),
SP09 (replay work bound does not meter the accepted computation).

**Sign-off:** second pass complete; **not signed for dispatch of the affected tasks until their findings are
resolved**. The first-pass FP01-FP10 dispositions are accepted. No task, checklist, implementation or execution log
was edited. The plan-author follow-up is SP03; the other required fixes implement already accepted contracts or make
their evidence executable, without changing an owner decision.

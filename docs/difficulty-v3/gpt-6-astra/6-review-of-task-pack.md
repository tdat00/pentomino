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

## Third pass

### MP09c: SP03 counting rule and dispatch check

**Basis.** HEAD `a80274b` (MP09b), MP07 at `2b4c5b9`, and `clarifications.md` Part I, D21. No implementation
file was changed. The selector at HEAD is identical to MP07's committed selector.

| File | LastWriteTime (2026-11-12, +07:00) | Scope |
|---|---|---|
| `tasks/difficulty-v3/MP09c-unrateable-and-unproved-candidates.md` | 18:41:36 | Whole task, including the revised S8, S8s, ST1 and both ST2 lists |
| `docs/difficulty-v3/clarifications.md` | 19:09:46 | D21 counting rule and re-validation placement; D36/P-OD5 read for the next part |
| `docs/difficulty-v3/claude-opus-5.5/7-response-to-second-pass.md` | 19:00:08 | SP01-SP03 response; the remaining dispositions were not present in this version |

**SP03, selector part: accepted.** MP07 sets `nearestAt = profiles` at `core/engine/clues.js:356` and tests
`profiles - nearestAt >= STALL_LIMIT` at line 369. That must change when MP09c introduces spent profiles:
`nearestAt = rated.length` and `rated.length - nearestAt >= STALL_LIMIT` implement Part I's rule exactly.
Refused and unrateable profiles update no side flag or nearest state, do not advance the stall counter, and
still consume the separate profile reserve. Moving v3 re-validation to MP09d2 is also correct; its executable
procedure is checked in the next part, not signed off by this selector check.

The output-identity claim is correct **while no profile is spent**. Each successful `rateSubset` increments
`profiles` and pushes one candidate before `afterProfile` runs. Skips do neither; repairs do neither. Therefore
`profiles === rated.length` at every relevant call. Production v2 ratings have no `Gproved` and never throw the
new error, so the change preserves MP07's existing production outputs and RNG consumption.

A short read-only Node probe applied the task's changes **in memory**, not to repository code. It reproduced:

| Vector | Calls | `onRate` | Result clues | With the old profile-based stall counter |
|---|---:|---:|---|---|
| S8 | 48 | 37 | `LYNWZ` | Still 48; the above-band rated candidates disable the stall, isolating the reserve stop |
| S8s | 34 | 13 | `LYNWZ` | 13 calls |
| ST1 | 16 | 13 | `YPVF` | 13 calls, result `PVTF` |
| ST2, refused score 21 | 14 | 13 | `YPTZ` | 13 calls |
| ST2, refused score 30 | 14 | 13 | `YPTZ` | 13 calls |
| S1, all refused | 20 | 0 | No result | 20 calls |
| S5b, all unrateable | 20 | 0 | No result | 20 calls |

S8's groups were exactly 17 rated five-clue, 20 rated six-clue and 11 capped four-clue profiles; the last was
`LNWZ:capped`. S8s's groups were 13 rated, 15 refused and six capped profiles, ending at `LYFWZ`. Twenty
additional no-spent controls produced identical results, seam-call traces and notifications with the original
MP07 selector and the in-memory specification. This verifies the task vectors, not an implementation or a gate;
no full suite, fixture recording or timing-sensitive run was performed.

**MP09b compatibility: accepted.** AR1 filters generated candidates only, not imported claims, and keeps a
`censored: true` candidate with `Gproved >= 1`. The committed strict reader (`core/engine/pack.js:768-940`) permits
that combination, checks `Gproved <= G`, and requires equality when the census is complete. MP09c does not alter
the wire shape. Its deliberately partial `v3Rating` objects are selector-seam doubles, **not valid full v3 pack
claims**; keep them local to these tests and use MP09b's complete fixtures at a pack/protocol boundary.
`IncompleteRatingError` is caught only at the two intended rating points; the new worker reply uses the existing
free-string error-code contract. The unchanged legacy rating path is retained.

#### TP01 — "Nothing changes below Hard" is too broad

**Severity: Minor.** MP09c, "Consequences" third bullet and MP09c-B03.

S5c correctly requires an unrateable Normal profile to be spent. Thus only the **AR1 refusal**, not the new
unrateable handling, is disabled below Hard. Replace the bullet with:

> Below Hard the `Gproved` refusal does not apply; an unrateable profile is still spent (S5c). Ratings without
> `Gproved` are never refused by AR1. While `rate` remains v2, production outputs and fixtures are unchanged.

Make B03 say the same. This is wording only; the pseudocode, test vectors and counted-stall rule are unambiguous
and executable.

**MP09c sign-off:** no Blocker or Major finding; dispatch may proceed. TP01 is an editorial correction, not a
change of policy, algorithm or test expectations.

MP09c VERIFIED

### MP09d1, MP09d2 and MP09e

| File under `tasks/difficulty-v3/` | LastWriteTime (2026-11-12, +07:00) | Disposition |
|---|---|---|
| `MP09d1-measure-v3-and-v2-names.md` | 15:32:47 | No blocking finding |
| `MP09d2-activate-v3.md` | 19:23:42 | SP01 accepted; SP02/SP03 need the corrections below |
| `MP09e-code-format-evidence.md` | 19:23:56 | Format contract accepted; the D36 command branch needs an editorial correction |

MP09d1 preserves the v2 function bodies, makes `rateV2`'s model literal independent of `MODEL`, and maps the
deduction result to all 28 strict v3 metrics. Its rename list includes the frozen-code score comparison and the
probe's v2 column. The error paths, census flags and DLX diagnostic agree with MP09b. A small inline check also
confirmed that MP09d2's actual `FAKE_RATING` literal passes the committed strict pack reader. No gate was run.

**SP01: closed.** The Goal, B01, census-estimate test and living-document slots now distinguish generation
acceptance from rating/import. `rate` may return an estimate with `Gproved === 0`; generated Hard-or-above puzzles
may not use it.

**D36/P-OD5: substantially applied.** The task now owns the Hell-failure captures, a same-board replacement recipe
proved to make ten puzzles in serial and in the two-worker flow, a retained unrateable-calibration test, an
availability probe, and the completed-cell D21-V3 pass. It does not silently raise caps, reduce the recipe quantity,
fabricate v3 ratings from old Hell results, or change offerings. The interim publication restriction is explicit.
The 15 x 20 replacement test remains a calibration test; its selection capture currently asks only for one puzzle.
Part I precision 2 says "with 10 of 10 puzzles": use quantity ten and require a complete ten-puzzle capture when
qualifying that replacement level too, while keeping the final unit test focused on calibration.

#### TP02 — Phase B still stops before the fixture migration it permits

**Severity: Major; SP02 not closed.** MP09d2, Test plan, Phase B, and MP09d2-T08.

There are three concrete problems with the six-name allow-list:

1. TAP reports enclosing failed suites as well as leaves. The parser collects them, but `runs`
   (`tests/cli.test.js:135`), `real engine through the pool` (`tests/generation-client.test.js:807`),
   `Node runner end to end` (`tests/calibration.test.js:281`) and `run with --code`
   (`tests/puzzlecode-cli.test.js:423`) are not allowed. An inline TAP reproduction using the exact parser and
   an allowed failing recipe leaf rejected its parent `runs`.
2. Two more fixture-dependent leaves are not allowed: `tests/generate.test.js:734` ("a second batch with carried
   history ...", which compares the rerun with `RECIPE.expected` at line 748) and line 764 ("the recorder refuses
   to overwrite ...", whose first assertion requires `--check` to return zero before GF-P2).
3. Before GF-P2 the old recipe's model version is necessarily wrong. `tools/generate.mjs:275-278` throws
   `RangeError('the recipe needs model difficulty-v2, this build has difficulty-v3')`. That also breaks the
   recipe-argument test at `tests/cli.test.js:95` and recipe flag cases, and contradicts the instruction to stop
   on **any** exception even in an allowed test.

**Correction:** keep Phase A as the fail-fast pre-migration check; run fixture-dependent test files only after
GF-P2, when Phase E runs them strictly. A pre-migration full quick run may be retained as labelled diagnostic
output, not as this incomplete allow-list gate. Update T08 and the implementation steps accordingly. Do not
weaken the final full quick/full-suite verdict or the recipe version check.

#### TP03 — The reused simulator cannot certify a repaired final result

**Severity: Major; remaining SP03 gate issue.** MP09d2, D21-V3 decision table and Phase C3.

`d21-2026-11-12/simulate.mjs:25-61` returns the best **raw** candidate's score and key when the stall condition
fires. `compare` (lines 73-91) labels an earlier stop a missed central result solely because the baseline final
result is central. It never evaluates `chooseBest`, repair success, or the repaired score. In `require` mode an
earlier `chooseBest` can return that same central repaired result, or fail and continue. Neither case is the
miss the script reports. For example, thirteen raw scores of 18 in Hard can trigger a repair to 21; comparing
their raw 18 with a later baseline final 21 wrongly labels the centre as missed.

**Correction:** use the simulation as a screening result. Before applying the raise/stop decision to a positive
`require`-mode result, compare the actual final results under N = 12 and N = 16 with the no-stall baseline for
the same input. The affected populations are `pop-recipe-board` and the real-rating require vectors: give their
bounded rerun commands/load hook and compare by tag. Only an observed lost central final result may drive this
decision; report conservative raw triggers separately.

Also keep the nine scripted `difficulty-v2` vector cases in `vectors.mjs:23-52` as mechanics controls, outside
the production-v3 TOTAL or explicitly in a separate table. The current observer records no model field and the
task currently calls the combined TOTAL v3 evidence.

#### TP04 — The promised 164-cell availability boundary is replaced by 165

**Severity: Minor.** MP09d2, C2's first row; checklist D36.

The absence of a 164-cell rectangle with sides at most 32 does not make a supported 164-cell board impossible.
`deterministicBoard(164)` already returns `{ cols: 13, rows: 13, blocked: 5 }`
(`tools/bench/calibration-reference.js:163`); `rectRows` builds it. A read-only check confirmed exactly 164
active cells, no generation-validation errors, and Hell 1 offered.

**Correction:** use that board for D36 precision 4, extending `avail.mjs` with an area or blocked-cell input
(or explicitly constructing these rows). Keep three attempts, the seed and the budget unchanged. Name the capture
`avail-13x13b5-hell-1`; record active area, not only the bounding rectangle. The other boundary rows are correct.

#### TP05 — The fewest-clue sample still has two conflicting fallback recipes

**Severity: Minor.** MP09e, "Samples" and Exact commands.

The old paragraph says Hell 3 falls back to Hell 2; the D36 paragraph says skip Hell 2 and use Nightmare, then
Master. The exact command block still unconditionally runs Hell 3, even when the new D36 rule says to skip it.

**Correction:** remove the superseded Hell-2 fallback and make the command block follow the D36 decision:
documented skip or one Hell-3 attempt, then Nightmare and, only if needed, Master. Retain Hard -> Expert for the
long-code sample. Also update the checklist's business-traceability row "Hell levels under v3 (D36, open)";
the decision is (a)/P-OD5, not an answer still to be obtained.

**MP09d sign-off:** MP09d1 can proceed. MP09d2 needs TP02 and TP03 corrected before dispatch; the D36 boundary
and MP09e wording fixes need no new owner decision. The SP01 correction and the placement of D21-V3 after
activation/before GF-P2 are accepted.

MP09d BLOCKED: TP02, TP03

### Remaining published fixes: MP10, MP12 and the split replay engine

| File under `tasks/difficulty-v3/` | LastWriteTime (2026-11-12, +07:00) | Reviewed correction |
|---|---|---|
| `MP10a-auxiliary-requests.md` | 19:01:17 | SP05: reachable waiting/running cases and the FIFO certificate contract |
| `MP10b1-display-rating-player.md` | 19:04:52 | SP04: startup, card invalidation, unavailable note; SP07: same-task brief |
| `MP10b2-display-rating-generator-and-pages.md` | 19:05:13 | SP04: initial wishes for restored state and the browser redraw check |
| `MP12a-calibration-slice.md` | 19:33:02 | SP06: captured corpus, labels, manifest, identity join and fit adapter; SP07: documentation slot |
| `MP12b1-full-landscape.md` | 19:35:18 | New split, full-landscape population and aggregate |
| `MP12b2-search-evidence-and-lock.md` | 19:42:00 | SP16: observer, repair evidence, stall re-examination and fail-fast proposal |
| `MP14a-detail-channel-and-clue-recorders.md` | 19:52:12 | SP09/SP14: separate accounting and explicit zero-add semantics |
| `MP14b-set-and-layout-recorders.md` | 19:52:52 | SP09: pass the meter through the hidden set calibration |
| `MP15a1-replay-runs.md` | 19:58:56 | SP08-SP10/SP13: projection, bounded runs, stage states and chronological events |
| `MP15a2-replay-steps.md` | 19:58:57 | SP10-SP13: byte reservation, final clues/detail, legacy terms and interleaving |

**Accepted corrections.** SP04 and SP05 are implemented in the task contracts and their tests. SP06's original
overwrite/implicit-fit defects are corrected: packs are captured once, each budget has a separate path, missing
or mismatched identities remain visible, and the fit consumes the manifest-joined complete observations.
SP08's one-entry projection fixes the full-pack API without weakening whole-pack validation. SP09 now meters
successful, refused and capped ratings, every actual uniqueness count (including zero-add finishes), and hidden
calibration events, without counting census work twice. The recorder identities and throwing-meter tests are
specified. SP11 is corrected in the engine by final clue placements and `args.detailStep`; SP13's engine tests
now allow stage-5/6 interleaving and omit the calibration walk.

The split into MP15a1/MP15a2 is useful. Its new internal `ReplayRun`, however, needs TP09 below; its byte
algorithm still needs TP10. The final UI consumers and pack-wide propagation are checked separately.

#### TP06 — MP12a repeats the pre-fixture test-order problem after a knob change

**Severity: Major.** MP12a, "One round" step 4, Implementation step 3 and the placement of GF-P2.

After changing a knob and re-pinning unit tables, the task requires `npm run test:quick` before the next round.
But the generation fixtures are regenerated only after the **last** round. A score/share change can change the
recorded clue keys and scores; a `K60`/`POLICY_ID` change also makes the old recipe fail its version check
immediately. Re-pinning the unit tables alone cannot make that full quick command pass.

**Correction:** between rounds run the listed fixture-independent policy/difficulty/clue checks and the owned
slow v3 test; defer fixture-dependent/full quick tests until GF-P2 at the final tuple. Alternatively explicitly
own GF-P2 after each change, but do not require a green old-fixture run before it. The final quick suite and GA-P2
remain strict. Apply the same ordering to any ordered change round in MP12b2.

#### TP07 — The new search observer cannot derive its promised repair and timing statistics

**Severity: Major; SP16 only partly closed.** MP12b2, observer, summary, self-test and fail-fast proposal.

The inference "`result.ok && result.ri === null` means a successful repair" misses a repaired result that is also
one of the previously rated subsets. A bounded in-memory probe on MP07's committed selector found this on its
**first** case (about 19 ms): recipe board, target Hard, `require`, seed `repair-ri-0`, constant score 18:
the returned candidate was repaired from `IUTX` to `IUTWX`, but the final key is raw rating **3 of 13**.
The proposed summary counts no successful repair. These no-spent mechanics are unchanged by MP09c.

Nor does the final `call.result` identify a failed/refused repair: S4 itself returns a later successful raw
candidate after refusing the earlier repair. The current attempt shape merges raw and repair refusals/caps.
Finally, no attempt carries elapsed time: its `t` is deduction tier, not milliseconds. The promised median/largest
time **per unrateable rating**, needed for F1/F2's predictions, cannot be recovered from aggregate `call.ms` or
the old observer's intervals between successful raw ratings.

**Correction:** in the read-only measurement hook, explicitly bracket `finish` calls, retain raw-vs-repair phase
and acceptance/selected identity, and time each rating attempt separately. Do not infer repair ownership from
key membership or the final success flag. Extend the self-test with the `repair-ri-0` case above, alongside
S4/S4ok/S6, and define the successful-repair denominator. This changes measurement only, not production counters.

#### TP08 — Three Hell repetitions are not the approved full landscape

**Severity: Major; needs the plan author's/owner's approval if retained.** MP12b1, Goal and Shards.

The accepted full landscape uses at least 20 fixed seeds per cell. D36 precision 4 authorises three set attempts
for MP09d2's small availability probe; it does not authorise replacing MP12's full Hell cells by three runs.
Labelling the three-run report reduced is honest, but does not make GL-P3 complete or prove "cells v3 cannot make".
A rare successful request may simply not occur in the first three seeds.

**Correction:** use the three-run block as a prescreen only, retaining the 20-run gate, or obtain an explicit
population waiver before dispatch and carry it into the gate, record and lock criteria. Say "no puzzle observed
in N requests", not proven impossibility. When a prescreen is followed by 20 runs, the aggregate must select the
20-run report only; never count its first three seeds again from the `-s3` report. Prescribe that per-case
selection rather than reading every JSON report in the folder.

#### TP09 — `ReplayRun.set` is not plain JSON

**Severity: Major.** MP15a1, ReplayRun contract, MP15a1-T05 and required case 13.

The new internal result returns `set: r.set`, a real `PieceSet`. Its board has `active: Uint8Array`
(`core/engine/types.js:22`, `core/engine/board.js:63`). Therefore
`JSON.parse(JSON.stringify(run))` cannot deep-equal `run`, even on the first matched fixture. MP15a2 legitimately
needs that engine set and deliberately omits it from the public result.

**Correction:** keep the internal `PieceSet`. Require the JSON round trip for `events` and the non-set result
fields; retain a structured-clone/determinism check for the whole internal run. Require full plain JSON for
`ReplayResult` in MP15a2/MP15b. Do not make a developer change the engine Board representation to satisfy this test.

#### TP10 — The byte reserve is not always maximal, and array framing is uncounted

**Severity: Major; SP10 not closed.** MP15a2, Algorithm and required cases 5-6; corresponding event-byte wording
in MP15a1.

`finalStep(input, 'unavailable', maxSteps - 1)` is not the largest final step for a small step limit: JSON `null`
is four bytes, whereas index `0` is one. An inline check of the specified step shape gave 202 reserved bytes
for `maxSteps = 1`, but 205 for the actual unavailable final step, or **207** for its one-element `steps` array.
Also, summing `JSON.stringify(step)` lengths omits the array's brackets and separators: N steps cost another
N + 1 bytes.

**Correction:** define the bound as `utf8Length(JSON.stringify(steps))`; reserve the larger of the final forms
with `detailStep: null` and with the largest allowed index, plus the two brackets. Charge one comma per added
non-final step as well as that step's bytes. Apply a consistent conservative framing count to the retained-event
guard. Test exact-fit/one-byte-less limits with `maxSteps = 1`, an unavailable result, and a multi-step trace.
The existing preflight rejection and cleared comparison state on a byte cut are otherwise correct.

#### TP11 — Finite legacy inputs can still produce an infinite term

**Severity: Major; remaining edge/test contradiction in SP12.** MP15a2, `breakdownOf`, v2 branch and case 4.

`U = Number.MAX_VALUE` is finite and nonnegative, so it passes the proposed guard, but `2 * U` is `Infinity`
and becomes null in JSON. MP09b deliberately allows such finite opaque legacy numbers.

**Correction:** after computing the legacy terms, require the **results** to be finite too; otherwise use
`breakdown: null` and keep the original total. Use this valid finite-overflow input in case 4 and its UI equivalent.
Replace case 4's existing `U: Infinity` input: it is not valid pack JSON and, even with a null breakdown, its
unchanged stored claim in the final step contains Infinity, contradicting the same case's whole-result JSON
round-trip assertion. Do not silently rewrite that claim to make the test pass.

### MP16a: the final table, zero-add wording and compact ordering

Reviewed `tasks/difficulty-v3/MP16a-replay-dialog.md`, LastWriteTime **20:00:41**.

SP15 is corrected: the compact filter now uses band distance, centre distance and canonical clue key. Its new
tied-score/smaller-key case distinguishes it from the old two-key projection. The unbounded-band treatment agrees
with the committed comparator's effective key tie-break. SP11's final detail pointer and stored-clue placements
are carried into the dialog; SP12's null-breakdown display is explicit. SP14 now has a no-piece failure sentence
and a separate stopped-stage label.

#### TP12 — Finish the UI tests for the newly added final/zero-add/stopped cases

**Severity: Minor.** MP16a, required cases 3, 7 and 8.

The prose has the fixes, but the test plan still checks a real `rated` table rather than the final step's
`detailStep` lookup, and does not explicitly require the synthetic zero-add failure. Case 8 still says that
stages without steps are unavailable, although an early limit now produces `stopped`.

**Correction:** add (1) a final step whose own detail is null and whose `detailStep` points to a real measured
step, checking the same guess-node rows; (2) `added: null`, `accepted: false`, `reason: 'not-proved'`, checking
`failedBeforeClue` in both languages and no "null" piece name; (3) an early-limit result with empty stopped stages,
checking `replay.stage.stopped`, distinct from unavailable. No new behavior or owner decision is needed.

### Third-pass checkpoint (20:14)

**Findings so far: 0 Blocker, 8 Major, 4 Minor (TP01-TP12).** MP09c is verified and has been dispatched with
TP01 passed to its developer. MP09d1 has no blocking finding. MP09d2 is not ready until TP02/TP03 are resolved.

This is not final sign-off on the remaining pack. At this checkpoint the response file still ends after
SP01-SP03 (LastWriteTime 19:00:08), and the following revisions have not yet been published:

- MP13a/MP13b's remaining SP07 documentation correction (files still 16:56:27 / 17:14:41).
- MP16b's candidate/calibration browser distinction and native-key proof (still 17:00:59; SP13/SP19).
- MP17's coverage, stale-output protection, gate announcement and browser-phase fixes (still 17:20:38;
  SP17-SP19).
- Final checklist/split-task propagation and the complete response to SP04-SP19.

The next check covers those published revisions, the final dispositions, and any corrections to TP01-TP12.
Only this review file has been edited; no task, checklist, production code, fixture or execution log was changed
by the reviewer. All probes were short and in memory; no heavy gate ran.

### Critical-path re-verification: MP09d2 READY at 20:29

Scope: MP09d2 and MP09e's TP05 change only, against committed HEAD `041ff83`. Reviewed versions:

| File | LastWriteTime (2026-11-12, +07:00) |
|---|---|
| `tasks/difficulty-v3/MP09d2-activate-v3.md` | 20:26:45.832 |
| `tasks/difficulty-v3/MP09e-code-format-evidence.md` | 20:11:05.846 |
| `docs/difficulty-v3/claude-opus-5.5/7-response-to-second-pass.md` | 20:28:57.095 |

**TP02's ordering fix is accepted.** Phase A is the only pre-GF test gate, Phase B is a saved diagnostic,
and Phase E runs all eleven named files strictly, then the whole quick set. All eleven files exist.
`checkRecipe` is unchanged at `tools/generate.mjs:275-279`, explicitly protected by T08 and outside the task's
owned changes. The newly committed delegation test creates a separate, small migration omission (TP13 below).

**The identical-prefix property is correct, including spent profiles.** In committed `clues.js:248-285`,
a capped/refused subset increments `profiles` but neither calls `onRate` nor enters `rated`.
`afterProfile` changes its side/nearest state only for a candidate and tests
`rated.length - nearestAt >= STALL_LIMIT` (`clues.js:384-418`). A spent profile cannot turn a false stall
condition true. Both variants retain the same profile-48 reserve, central check, memoised repairs and RNG
operations. Therefore the only first divergence can occur after the rated candidate that first satisfies the
N-dependent condition, and the logged prefix through that candidate is identical. If the condition never holds,
the whole run is identical. After a firing whose repairs fail, further RNG draws may differ: the script correctly
does not require the later prefix to match.

Eight short scripted probes of the actual committed selector, with only the constant changed in memory, confirmed
that property in `any` and `require` modes, at N = 12 and 16, with two capped profiles and one AR1 refusal, and
without spent profiles. Both the rated prefix and the RNG-call trace matched. The first firings were at rated
candidate 13 and 17; the no-stall baseline had 45 rated candidates. Total probe time was about 81 ms.

**The new scripts are executable and their input mapping is correct.** Their literal fenced sources were executed
with in-memory filesystem/module doubles (no generation and no files written). `rerun.mjs` reproduces exactly the
184 finite-band, real-rating require inputs of `pop.mjs --recipe-board 200` and `vectors.mjs`: same tag, seed,
target, board, pieces and layout. The split removes all require calls from A and separates the nine scripted
controls. Both preloads change only the single guarded constant. Certification exercised identical results,
a genuine central loss and a missing partner; the latter exits 1. Its classification of a changed but still
central result needs TP14.

**Bounds and D36.** The new captures are serial, independently capped at 600 s; C1's other captures are
180-300 s, and C2's six runs are 300 s with three attempts each. The 20-45 minute C3 estimate explicitly includes
the two approximately 1.5-minute reruns; all blocks require the orchestrator's slot. The 15 x 20 replacement now
requires attempt 0 to succeed and ten of ten puzzles. `--blocked 5` produces the specified 164-cell board and
label. TP04 is closed. MP09e now has one Hell-3/Nightmare/Master order with the documented skip; no Hell-2
fallback remains. TP05 is closed, subject only to TP15's non-blocking initialization clarification.

#### TP13 — The just-committed v2-delegation assertion still fails Phase A

**Severity: Major.** MP09d2's pinned-test table, against `tests/difficulty.test.js:331-351`.

MP09d1 added "the v2 rating keeps its results under its v2 names". Its final loop, lines 348-350, asserts
`JSON.stringify(rate(...)) === JSON.stringify(rateV2(...))`. That is deliberately true before activation and
necessarily false afterwards (the model alone differs). MP09d2's table does not authorise migrating this test,
and Phase A runs it before any gate. The "only these; anything else ... is reported" rule therefore stops the task.

**Exact fix:** add this named test to the table. Preserve all `rateV2` pins at lines 331-347; remove the obsolete
live-`rate` equality loop (or move its live side into the new v3 `rate` cases). Explicitly do this before Phase A.
Do not change `rateV2`, the fixture version check or the final suite requirements.

#### TP14 — Certification counts a different central result as a lost central result

**Severity: Major.** MP09d2's `certify.mjs`, the `else if (central(b))` branch, and its definition of lost.

After a genuine firing, the script increments `lost` whenever the baseline is central and the final key/score
differs. The rerun may itself still be central. RES-15's success condition is the central half, not preservation
of one particular baseline puzzle.

The exact script, on an in-memory Hard-band example, classified baseline score 21 and a different repaired
puzzle also scoring 21 as `lost = 1`, despite an identical prefix through rating 13 and both results lying in
[19, 23]. With N = 16 unchanged, the decision table then raises the limit unnecessarily; if both reruns return
different central puzzles, it can stop the gate on a nonexistent loss.

**Exact fix:** use `else if (central(b) && !central(x))` for `lost`. A changed result which remains central belongs
in `other changed results`, not `lost`. Update the accompanying definition. Add synthetic cases for a different
central key at score 21, a different central score of 20, and a real loss to score 18 or no result. Only the last
two outcomes lose centrality. The prefix proof and the remainder of the decision table need no change.

#### TP15 — Initialize the conditional sample flag explicitly

**Severity: Minor; developer addendum only.** MP09e, Exact commands.

Set `$skipHell3 = $false` before applying the record-based override to true. The current block reads an unset
variable on the non-skip path (and fails under strict PowerShell). This does not change the fallback decision.

**Result:** the rerun architecture, prefix property, bounds, TP02 ordering, TP04 and TP05 are verified.
Two precise task corrections remain before MP09d2 dispatch: TP13 and TP14. No gate was run and no implementation
was edited; only this review file was changed.

MP09d BLOCKED: TP13, TP14

### Orchestrator dispatch addendum — 2026-11-12 20:48

**TP13/TP14 applied by the orchestrator at MP09d2 dispatch.** The exact fixes above were included as a binding
developer addendum. They no longer block MP09d2; the earlier blocked marker records the reviewed file revision,
not the dispatched task with its addendum. MP09d2 is now frozen and in implementation.

TP15 will be passed to MP09e in the same way. No MP09d2 or MP09e task file was edited by this reviewer.

### MP10-MP11 READY tranche

Reviewed against HEAD `041ff83`, including the Execution log handoffs of MP09a1, MP09a2, MP09b, MP09c and
MP09d1. MP09d2's ongoing implementation and MP09e are outside this review.

| File under `tasks/difficulty-v3/` | LastWriteTime (2026-11-12, +07:00) |
|---|---|
| `MP10a-auxiliary-requests.md` | 20:42:10.942 |
| `MP10b1-display-rating-player.md` | 20:42:10.948 |
| `MP10b2-display-rating-generator-and-pages.md` | 20:42:10.970 |
| `MP11-calibration-tooling.md` | 20:42:10.964 |

SA1's §2 dispositions and `MP10-MP11 READY` were read in the response revision last written at 20:43:28.180.

| Earlier finding | Verification |
|---|---|
| SP04 | Accepted. The Generator sends startup wishes before relying on its non-immediate subscription; the Player's card invalidation includes `displayRatings`; both failed and unavailable outcomes retain the claim with the failure note. Tests cover untouched restored state and a reply-only redraw. The quoted startup and renderer anchors agree with the committed code. |
| SP05 | Accepted. The tests now distinguish waiting beside main work from running under an ended token. The queue uses the owner's allocator, bootstraps only when idle, and does not claim zero latency for certificates sharing the FIFO idle queue. Main-request cancellation and maintenance re-queue cases are separate. |
| SP07, MP10 portion | Accepted. MP10b1 owns the Player's brief/detail/EN+VI guide updates in the same change; MP10b2 owns the corresponding Generator updates. MP10a adds internal plumbing, not an already-visible feature. The later MP12/MP13 portions are not closed by this review. |
| SP16, MP11 portion | MP11's accepted-puzzle metrics and diagnostic sampling counts are consistent and implementable. They are not a measurement of every generation profile or repair. The additional search-evidence producer is now MP12b2/GS-P3; its TP07 remains for the MP12+ review, not a prerequisite of MP11. |
| SP19, MP10b2 portion | Main-phase page coverage, ports, announcement, timeout and PID cleanup are specified. The small per-page evidence/summary correction below remains. Native-key and GZ phase proof belong to the later tasks and are not signed off here. |

**Compatibility with the delivered MP09 contracts.**

- Re-rating uses the existing `rate` payload `{ boardRows, pieces, clues }` and the existing pool, not a new task
  kind or a second pool. `rating-incomplete` is a `WorkerTaskError` code, matching MP09c; MP11's `errorCode`
  helper reads that code directly.
- MP09b's legacy v1/v2 claims may lack metrics or saturation. The display logic does not need those metrics to
  request a fresh rating and never rewrites the claim. Full v3 estimates use `censusUndecided`; summary claims
  without metrics get the short note and are not needlessly re-rated.
- The Generator builds its controller after restore/duplicate-set cleanup, so startup wishes use the surviving
  sets. Updating only `displayRatings` does not replace the one-time cleanup notice or the explicit saved-state
  fields.
- MP11's metric names match the 28-field measurement delivered by MP09d1. The legacy clue count `G` is read as
  `clues ?? G`, separately from decisive guesses in v3 metrics. Old records may omit `ratingCensoredCount`;
  new aggregates must treat that absence as zero, as required by the old-record tests.
- `level(id).index`, `firstSetAttempt`, `runFold`, the workspace APIs and the sampling/error locations exist as
  named. MP11's one owned slow test is announced, estimated at 2-8 minutes and subject to the ten-minute limit;
  it does not authorise a landscape run or `npm test` here.

All four task files passed read-only CRLF/no-BOM/final-newline/trailing-whitespace checks and their PowerShell
blocks parse. No application suite, browser page, timing run or gate was started by this review.

#### TP16 — Distinguish an unfinished census from an unrateable path in the guide sentence

**Severity: Minor; MP10b1 developer addendum.** The suggested USERGUIDE sentence says a puzzle whose "rating
could not be finished within the work limit" shows a decisive estimate. That is too broad: a capped first path
is unrateable; only an unfinished census gets the estimate mark.

Use, in both languages: "An unfinished census of the guess alternatives is marked as a decisive estimate.
If the first solution cannot be found within the limits, the stored rating stays with 'Could not be re-rated'."
The display table and tests already distinguish these cases correctly.

#### TP17 — Preserve one evidence directory per browser page and read the legacy summary element

**Severity: Minor; MP10b2 developer addendum (the main-phase part of SP19).** The referenced native client writes
fixed `browser.json` and `browser.png` names under `RP_EVIDENCE_DIR`, and reads only `dataset.summary`
(`tasks/regenerate-puzzle/check-list.md:378-389`). `generator-flow.js:988` and `acceptance.js:717` put their counts
in `#summary` instead.

For each page set `RP_EVIDENCE_DIR` to `tests\artifacts\MP10b2\<page-name>\main`. In the copied driver's
evaluation expression use `document.documentElement.dataset.summary || document.querySelector("#summary")?.textContent || ""`.
Keep the existing pass/error assertions and timeout. This preserves all six results and the promised counts;
no new browser phase or production change is needed.

#### TP18 — Include the new client dependency in the benchmark source digest

**Severity: Minor; MP10a developer addendum.** `tools/bench/report.js:37-48` hashes the generation client and pool
but not the new `core/browser/auxiliary.js` which that client will import and execute. A later change of that helper
would otherwise leave the measurement source digest unchanged.

Give MP10a narrow ownership of the `SOURCE_FILES` list and add `core/browser/auxiliary.js` beside the other browser
generation modules. Run the existing quick `tests/benchmark-report.test.js` along with its targeted checks.
Do not add display/UI files that the benchmark does not execute.

#### TP19 — Carry the stated no-worker flag into the Generator submit wrapper

**Severity: Minor; MP10b2 developer addendum.** "The Generator" correctly requires an unavailable entry when
`options.workersAvailable === false`, but implementation item 2's shorthand checks only whether the client method
exists. `generator/app.js:124-128` can supply both a client and an explicit false flag.

Before calling the client, reject with `PoolError('worker-unavailable', ...)` when that flag is false or the method
is absent. Add a case with a present spy method and `workersAvailable: false`: zero submissions, unavailable
entry/failure note, no general error notice. This implements the already-stated contract.

**Relay, not another review:** SA1 reports `MP09d2 AMENDMENT B1 READY` (about 21:10) in its response file.
It carries TP13/TP14 and their self-test into the frozen task's amendment, and additionally authorises the
post-GF/pre-Phase-E v2-pin migrations in `tests/pack.test.js:576` and `tests/rate-probe.test.js:71,77,101`.
The orchestrator should pass that amendment to the active MP09d2 developer. It was not re-reviewed in this tranche;
TP13/TP14 were already binding at dispatch as recorded above.

**Sign-off:** no Blocker or Major finding in MP10a-MP11; four precise minor addenda, TP16-TP19. The scope is ready
for sequential dispatch with those addenda. No task, implementation, fixture, execution log or checklist was edited.

MP10-MP11 VERIFIED

## MP12 tranche: calibration slice, full landscape and lock

Read-only verification, 2026-11-13. Requested baseline: `30232a5`. MP11 was running when this review started and
was committed as `a85ed55` during it. I checked its delivered interfaces and Execution log as well as its task
contract; that does not change the baseline for the earlier engine work.

| File under `tasks/difficulty-v3/` | Last written (+07:00) | SHA-256 prefix |
|---|---|---|
| `MP12a-calibration-slice.md` | 2026-11-12 20:45:19 | `a99994331fc0` |
| `MP12b1-full-landscape.md` | 2026-11-13 06:16:35 | `1732d433cbe3` |
| `MP12b2-search-evidence-and-lock.md` | 2026-11-13 06:16:57 | `469594e7d4b0` |

SA1's response sections 3-5 and 7, D36/P-OD5, D37/P-OD6, the MP09d2 record and handoff, and MP11's committed
handoff were read. No task file, implementation, fixture, checklist or other analyst's file was edited.

### Verified parts and light checks

| Item | Result |
|---|---|
| Actual activation outcome | Correct in the task inputs: v3 is active; `STALL_LIMIT` is 12 and is **not** inert; population S is therefore skipped. The recipe is `square-22x22-nightmare`, quantity 10. |
| D36 characterisations | `tests/clues.test.js:552-569` has the 15 x 20 Nightmare case, K 24, score 67, 4 clues, and the separate 22 x 22 Hell 3 unrateable case, both seed `t18-big-a`, attempt 0. The negative input is not the old 15 x 20 Hell 2 input. |
| Hell evidence | The 164-cell board made Hell 1 in 2 of 3 set attempts. Do not abbreviate all other failures as "every profile capped": the 266-cell Hell 2 row has 26 rated profiles above its band and 102 capped profiles. MP12b1/b2 carry that distinction correctly. |
| TP06 | The general test order is corrected: fixture-independent checks between rounds; GF-P2 before fixture-dependent checks; the first GA-P2 result retained; only completed UI-flow recipes migrate. TP26 below makes the D36 re-pin handoff explicit. |
| SP06 | Capturing once, the identity join, budget labels and the fit adapter are specified. The new problem is the meaning of the fitting objective versus C2, not the capture mechanism (TP22). |
| TP07 | The new observer works with the committed `finish` closure and its returned object identities. The old repaired-result/index inference problem is fixed. |
| TP08 / D37 | The population is correctly carried: all 25 prescreens; 20 requests for every successful prescreen and exactly one smallest failing boundary case per Hell level; other Hell cases retain 3 requests. No second boundary is selected if its full run succeeds. The aggregate must not read both reports for a promoted cell. |
| SP07 | MP12a owns same-commit updates for changed values and example piece counts; MP12b2 owns the measured parameters, the lock and the conditional Hell sentence. The owner fork to MP12b3 for option (i) is explicit. |
| MP11 API | Delivered as specified: `clues`, the v3 metric subset, per-cell `v3`, `sampledUnrateable`, and `ratingCensoredCount`. The important distinctions are in TP21, TP23 and TP27. |
| KI-1 | No MP12 task changes its implementation or its browser acceptance allowance. No KI-1 finding in this tranche. |

Two small, non-timing checks ran from stdin, with no scratch files:

1. Pure matrix/aggregation checks: 105 cases, 16 boards, 25 Hell cases (12/9/4). An empty cell has `v3: null`.
   A three-row reduced Hell cell passed to the stipulated full matrix retains `runs.requested: 20`,
   `runs.recorded: 3` and the legacy 20-seed criterion. The literal list-2 expression throws on `v3: null`.
2. The exact embedded observer, with its import resolved to the existing D21 module, ran the four scripted cases.
   JSONL writes were intercepted in memory. All four expected attempt/finish strings and selected clues matched:
   S4 `YUVWZ`, S4ok `IYTWZX`, S6 `YUVWZ`, and `repair-ri-0` `IUTWX`. There were 18 raw rated attempts; four repair
   ratings (2 rated, 1 refused, 1 capped); six finishes (2 unique, 2 repaired, 1 refused, 1 capped). The last case's
   chosen finish is `4@5:repaired>5*` although the old result index is 3. No real rating or generation corpus ran.

The three task files pass CRLF/no-BOM/final-newline/trailing-whitespace checks. Their PowerShell fences parse
(4, 3 and 1 blocks respectively). This is syntax evidence, not proof of the run-control contracts below.
No landscape, recorder, slow suite, full suite or browser gate was run by this review.

### TP20 — Make the timing lock and bounded landscape resume executable

**Severity: Major. Files: all three MP12 tasks; especially MP12a:50-56,98-104 and MP12b1:49-55,88-110.**

Announcing a batch is not the timing-lock protocol. Neither landscape command nor the MP12b2 `Capture` helper
acquires the shared lock. Moreover, a single `--seeds 20` Hell command takes about 40 minutes by the task's own
estimate. Its per-row child limit is 400 seconds, not a limit on the command (`tools/calibrate.mjs:46,521`).
MP12a says to finish the current row and resume, but supplies no signal or wrapper; its exit check rejects the
normal interrupted exit 2. MP12b1 instead kills the command, potentially losing its current row. A parent-only
kill also does not specify cleanup of a fresh-process child and that child's workers.

**Exact fix.**

- Route every timed command through the orchestrator's existing two-repository lock helper: wait for the other
  repository's lock, acquire the Pentomino timing lock exclusively, recheck, and release only the lock owned by this
  invocation in `finally`. Record lock wait separately from measured time. Apply this to probes, captures, the slow
  test, GF-P2 and both GA-P2 runs, not just the landscape.
- Give MP12a ownership of a small task-local landscape launcher and have MP12b1 use it read-only. The existing
  `run(argv, overrides)` API supports the necessary graceful stop (`tools/calibrate.mjs:443-580`):
  use `onInterrupt(callback)` to request a pause after 150 seconds; retain the existing 400-second child limit;
  enforce a separate outer deadline of 590 seconds with PID-tree cleanup. Thus even a row started immediately
  before the pause normally has 400 seconds to finish, with time left for report writing. A hard timeout remains
  an error, not a successful pause.
- Exit 2 after that scheduled pause means resume the **same** arguments, output/checkpoint and 20-request matrix.
  Do not lower `--seeds`, use `--restart`, change a seed, or discard a completed row to make an invocation fit.
  Stop on an unusable checkpoint or unexpected failure. Delete the checkpoint only after the required rows have
  completed. Verify the report's row keys before publication.
- Preserve partial report snapshots or use a mutable staging prefix and publish the completed report once.
  `calibrate.mjs:576-577` rewrites its report files on resume; that must not silently contradict "records are never
  overwritten". The checkpoint remains the tool's normal mutable checkpoint.
- Apply the same outer bound to MP12a's capture/rating commands. If one captured pack needs smaller rating shards,
  split its puzzle IDs, not its generation request or identity. Keep the 300-second H limit. For R/A/S use a
  deadline below 600 seconds so cleanup does not exceed the task's overall ten-minute limit.

Test the launcher's pause/resume and timeout cleanup with a small fake child before the expensive runs. This is
run control only: no production request budget, child-row budget, worker count or population changes.

### TP21 — Diagnostic sampling failures are not capped accepted puzzles

**Severity: Major. File: MP12a:124, its C5 criterion and the change-selection rules that use it.**

The second half of C5 requires `sampledUnrateable === 0`. That field does not count the accepted-puzzle corpus.
The benchmark deliberately rates random clue subsets at several clue counts, twice each
(`tools/bench/runner.js:423-487`), including sparse subsets much harder than the requested level. For example,
`sampleCounts(30, 4)` includes 1, 2 and 3 clues as well as 28. MP11 counts a capped diagnostic separately;
it does not promise every such subset is rateable.

Consequently this criterion can force repeated cap increases or stop calibration even though every generated
puzzle and its canonical re-probe is rateable. Conversely, a request that creates no set has no diagnostic
samples, so a zero here is not evidence that its generation profiles were uncapped. RES-25 requires these
outcomes to be reported; it does not require every randomly sampled clue subset to complete.

**Exact fix.** Keep the first half of C5: canonical `prod` re-ratings of the captured, accepted puzzles at the same
caps must not be capped. Keep diagnostic `sampledUnrateable` counts and their attempted-sample denominators in
the record, separately from accepted-puzzle census shares and from GS-P3's generation-profile counts. Remove the
zero-diagnostic requirement and never feed those arbitrary subsets into the accepted-corpus cap-sizing rule.
Any stronger all-subsets requirement would be a new decision, not an implication of P-OD2.

Add a pure criteria-check case with complete accepted puzzles and one capped diagnostic: the accepted-path
criterion passes and the diagnostic is still reported. A capped canonical re-probe must fail it.

### TP22 — C2 uses request success, but its tuning trigger uses accepted-puzzle hits

**Severity: Major. File: MP12a:121,205-217; reference: MP06c:109-118.**

C2 correctly compares the fraction of 20 requests that complete ten in-band puzzles. MP06c's fitting objective
instead counts individual retained puzzle lines that re-score into their requested band. The task then compares
that predicted puzzle hit rate with the request-success bound to decide whether `SHARES` or `K60` may change.
These denominators are not interchangeable.

There is a stronger failure on this new corpus: for nonempty identity-matched cells of newly accepted v3 puzzles,
the current tuple already has 100% puzzle hits, satisfies the ordering constraint and has distance zero from
itself. The stated grid objective therefore keeps the current tuple, even if most generation requests are partial
or fail. Its predicted rate cannot fall below C2's bound. The task can repeat an unchanged round three times
without reaching the already-authorised availability controls.

**Exact fix.** Name the two measures separately: `requestCompletionRate` for C2, `puzzleRescoreHitRate` for the
MP06c fit and the P-OD3 comparison. Preserve the accepted grid and penalty experiment; do not claim that its
rescore predicts missing puzzles or completed requests. Replace the `SHARES`/`K60` trigger with **measured C2
failure**, not the rescore rate. If the best score tuple is unchanged, do not consume another round with it:
prepare one justified `SHARES`/`K60` trial under SA2-Q-P09, record the proposed values and obtain the orchestrator's
go-ahead for that next round; if no justified trial is available, stop with the numbers. A changed score tuple
still needs the next real generation measurement. The three-round ceiling stays.

Use a pure case where all retained puzzles are in-band but no request reaches ten: puzzle hits 100%, request
success 0%. It must enter the availability branch, not pass C2 or schedule an identical score-only round.

### TP23 — The Hell report still names a producer which does not supply its fields

**Severity: Major. File: MP12b2:424-427 and B02; related to the remaining SP16 evidence obligation.**

The record says ratings per puzzle come from MP12b1's 20-request reports. They do not. MP11's
`details.puzzles[]` stores final puzzle metrics, not all selection attempts; `ratingCensoredCount` counts accepted
estimates; diagnostic samples are another population. None is the number of generation ratings, refused
profiles or repair ratings. The run schema also does not provide the requested `setMs`/`foldMs` decomposition
(`tools/bench/runner.js:705-733`, `tools/bench/report.js:104-153`).

The five H captures supply these observations for their own cells only, and contain no Hell 1 case. They cannot
supply them for successful Hell 1 landscape cells or for every other zero-puzzle cell in the owner table.
The repaired-candidate producer is now correct; this separate per-cell producer gap remains.

**Exact fix.** Add a named, bounded GS-P3 companion population for the Hell cells not covered by H:

- Select each case from the actual landscape matrix, including its exact `boardRows`, rotation and uniqueness;
  do not replace `15x15b10` by a rectangle. A task-local variant of the serial flow driver must accept a case ID
  and use those rows. The existing `flow.mjs --board WxH` interface cannot express that board.
- For a cell with accepted puzzles, use a seed identified in its selected report, preferably the lowest rep that
  completed the request. For a zero-puzzle cell use rep 0. Capture with `observe.mjs`, state quantity and limits,
  and retain the companion's input manifest, source tuple and final event. These are labelled diagnostic
  replays, not additional independent landscape requests.
- Derive ratings per accepted puzzle from that companion's attempt totals and its own accepted count; derive
  set/fold/total times from its events. Keep landscape hit rates and response-time statistics in separate columns.
  Never divide one population's rating count by another population's accepted count.
- For zero accepted puzzles show the ratio as unavailable. For a timed-out capture show observed completed-call
  counts and censoring explicitly, not a complete request failure or invented zero. A required successful-cell
  ratio which cannot be measured within the bound is a stop/report point.

Amend the capture table, commands, summary, ownership and machine-time estimate accordingly. Alternatively,
assign actual full-run instrumentation to an explicit earlier tooling task; do not infer missing counters from
MP11's existing fields.

### TP24 — The fail-fast check does not evaluate the combined mechanism or censored tails

**Severity: Major. File: MP12b2:377-399, B03 and T04.**

Item 2 proposes F1, F2 and F1+F2; item 3 defines only separate F1 and F2 checks. Adding their results is unsound:

- Attempt 0 has four capped raw profiles, then a rated out-of-band profile; its calibration ultimately fails.
- Attempt 1 succeeds.
- F1 alone does not fire at attempt 0, since not all its profiles were capped. F2 alone loses no successful
  selection there. But F2 truncates attempt 0 to four capped profiles, so F1+F2 now stops the whole request and
  loses attempt 1.

A pure synthetic check reproduced exactly this distinction: independent false stops 0 and 0, combined false stops
1. Further, H captures are deliberately killed after 300 seconds. Absence of a later success in an unfinished
file is **unknown**, not proof of zero false stops.

**Exact fix.** Define F1+F2 over the effective prefix after F2 has truncated a calibration. Its first qualifying
set attempt terminates the request; compare that against later successful baseline set-attempt events. Keep the
F2 check for a truncated selection that itself succeeded. Add synthetic checks for the example above, a genuinely
all-capped completed request, an F2-lost successful call, and a trigger followed by a censored tail.

Report per mechanism: evaluated completed baselines, triggers, observed false stops, and unknown outcomes.
Only completed baselines can contribute to the zero-observed-false-stop claim; unknowns remain visible and
cannot establish safety. Say "no false stop observed in N completed baselines", not that a finite corpus proves
no future request can succeed. Qualification of an implementation remains later work.

The notice should also describe an observation, not impossibility: for example, "No <level> puzzle was found
within the search limits; the attempted ratings reached their work limits", with the corresponding Vietnamese
text. Retain the serial/two-worker distinction and label any composed time saving as a counterfactual estimate.

### TP25 — The lock and area decision need final-source evidence, including after a change round

**Severity: Major. File: MP12b2:333-355,440-447 and the lock/record sections.**

The smallest-area availability results come from MP09d2, before MP12a is allowed to change weights, caps, `K60`
and `SHARES`. Those boards (164, 266 and 450 active cells) are absent from the full landscape. Thus after a change,
the historical Hell 1 success at score 93/103 is not evidence that the final tuple still makes that level there.
Nevertheless the task uses these observations to derive the largest successful and smallest unsuccessful areas
for option (i).

An ordered change round has the same problem on a larger scale: it runs affected landscape cells and the slice,
but does not explicitly rebuild the final aggregate, repeat affected search/fail-fast evidence or refresh the
owner table before locking. A global score/cap change can affect every generation cell; "affected" must not mean
only the cells which failed earlier.

**Exact fix.**

1. Give each evidence population its generating/rating tuple and relevant source identity. Historical MP09d2
   observations stay historical. If the relevant tuple changed, repeat its three-attempt smallest-area probe
   under the final tuple, with the original seed and exact boards (164 means 13 x 13 with 5 blocked). Use bounded
   invocations of the existing availability driver; keep each attempt's identity and distinguish set attempts
   from full quantity-10 requests. If inputs affecting these results are unchanged, document that reuse instead.
2. Derive proposed area boundaries from final-tuple observations only. Keep the old results alongside them for
   comparison, never as interchangeable samples. A boundary is an observed availability policy choice, not a
   proof that every shape of an area is impossible.
3. Before an ordered change, enumerate affected cases and evidence. A global rating/cap change normally affects
   all cases; a narrower set needs a stated dependency argument. Afterward rebuild the selected-report map and
   aggregate, rerun affected GS-P3/availability evidence, recompute the fail-fast table, and refresh the owner's
   question. Use new output paths; do not overwrite or pool different tuples.
4. An unresolved measurement or changed availability decision stops the lock. The already specified option-(i)
   handoff to MP12b3 stays; do not reopen P-OD5/P-OD6 or implement a fail-fast in this task.

The same provenance discipline permits reuse of MP12a's measured working-tree code after its commit: equality
of the measured source digest/tuple is what matters. Do not reject it solely because the subsequent MP12a commit
records the very knob edits already present during measurement; document the committed counterpart explicitly.

### TP26 — Spell out all four D36/fixture re-pins before the strict final gate

**Severity: Minor, binding before a knob change. File: MP12a:219-242,274-280 and MP12b2's change round.**

The broad MP09d2 reference grants the right files, but the explicit instructions name only the 15 x 20 slow test
and then say any slow D36 failure stops GA-P2. Expand that reference into the following table and a bounded
characterisation check before the first strict final `npm test`:

| Pin | Required treatment |
|---|---|
| 15 x 20 Nightmare, `t18-big-a`, attempt 0 | Measure the same request at the new tuple; re-pin K/score/clue count from checked output (currently 24/67/4). A request that no longer succeeds is a finding, not permission to change its seed or level. |
| All UI-flow recipes, including `square-22x22-nightmare` | Keep quantity and request inputs; migrate `expect.pieces`, `expect.puzzles`, `expect.scores` only after complete batches with no notice, as the existing first-GA procedure requires. |
| Unrateable calibration input | Keep the 22 x 22 Hell 3 attempt only while current-source observations establish the unrateable premise. `not-in-band` alone does not prove it: a now-rateable but out-of-band calibration returns the same object. When affected by a change, re-observe its profiles; if necessary select a documented still-all-capped input by a fixed bounded rule, or stop if none is established. |
| Generation fixture scores/keys/versions | GF-P2 alone refreshes `generation-case.json` and `generated-sample-pack.json`; then the strict fixture tests. No hand editing of claims, no weakening of `checkRecipe`, and no changes to the frozen Player sample or code vector. |

For static recipe characterisations, a score-only change may reuse pinned deduction inputs. A cap change requires
current deduction inputs first, then an independent `breakdownV3` calculation; blindly re-scoring old deduction
metrics is not enough. Semantic failures remain stops; authorised numerical characterisations must be settled
before the final strict verdict. Add the same table to the ordered-change handoff by reference.

### TP27 — Handle null metrics and distinguish the D37 waiver from missing coverage

**Severity: Minor. File: MP12b1:135-160,193-195; MP12a criteria and MP12b2 record readers.**

MP11 deliberately returns `v3: null` without accepted v3 data
(`tools/bench/calibration-reference.js:340-362`). The stated list-2/list-3 expressions need a null guard. The pure
probe threw `Cannot read properties of null (reading 'score')` when applying the literal list-2 expression.

**Exact fix.** List 2 requires `v3 !== null`, a finite band and `v3.score.n > 0`, then the parenthesised
one-sided-score disjunction. List 3 requires `v3 !== null` and `v3.censored.share > 0.05`. Missing score, census or
proved-guess statistics are unavailable, not zero. Keep the no-puzzle row with its actual observations. Do not
silently evaluate an empty median or count an empty cell as measured ordering evidence.

Keep the shared aggregator's original 20-request coverage/criteria unchanged. Add an explicit protocol-coverage
table with required N = 3 or 20 by P-OD6, completed distinct rep keys, selected report, boundary reference and
measurement status. A reduced cell can satisfy that protocol while the legacy aggregate still says 3/20;
explain both. An arbitrary partial 20-request report or missing report is not a D37 waiver and must not become
"no puzzle observed" evidence merely because its file exists. Validate completion/source/row keys before the
selection rule accepts a report; unresolved missing measurements go to the orchestrator before the lock.

Use pure cases for a valid reduced zero-puzzle cell, a complete positive cell, and a missing/unfinished cell.
No shared benchmark threshold needs to be weakened.

### TP28 — Remove the stale inert-stall wording and guard its command block

**Severity: Minor. File: MP12b2:22-23 and its final PowerShell block.**

The inputs correctly say the rule was not inert, but the Goal still says "When MP09d2 found the stall stop inert".
The PowerShell block also executes S unconditionally; its "only when" comment is not a guard.

**Exact fix.** State the actual outcome in the Goal. Initialise an explicit `runStallRecheck` flag to false from
the recorded D21 decision and put the S capture, file enumeration and simulation inside that conditional. Do not
derive the flag by searching for the word "inert": the record contains it in negative statements too. On this
source, S is skipped and the record explains why.

### Machine time, stop points and disposition

- MP12a's 30-60 minutes per round is a provisional estimate, not a limit on the complete case. It covers 360
  landscape requests, 90 captures and 90 pack re-probes, plus any diagnostic budget trials. Project again from
  the first small and large cases; do not spend a second unchanged round (TP22).
- MP12b1's components imply about 5.5-10.5 hours before promoted/boundary full runs. Three 40-minute boundary runs
  and three successful-case full runs add up to four hours: about 9.5-14.5 hours in that example. The task's header
  already says the extra runs are additional; do not quote 6-11 hours as an all-inclusive promise.
- Existing GS-P3 has 20 R/A captures at a 600-second ceiling and five H captures at 300 seconds: up to 225 minutes,
  not a guaranteed 45-90. TP23 and any final-tuple availability refresh add work which must be budgeted separately.
  MP11's committed slow test took about 102 seconds, mostly 12 x 12 Nightmare; that is useful current evidence
  for the between-round gate, not a promise after a cap/policy change.
- Preserve the existing stops for an out-of-range knob, an unresolved criterion after round 2, a semantic test
  failure, an incomplete fixed UI-flow request, N = 16 missing a central result if S ever runs, and the owner
  decision. Add the explicit timeout, missing-producer and stale/incomplete-evidence stops above.

**Disposition:** 0 Blocker, 6 Major (TP20-TP25), 3 Minor (TP26-TP28). The accepted D36/D37 decisions do not need to
be reopened. The existing owner question (i)/(ii)/(iii) remains, after final-source evidence exists. TP07's
observer and TP08's population fixes are verified; MP12a is not ready to dispatch until TP20-TP22 are fixed, and
the tranche cannot be signed off until TP23-TP25 are fixed too.

MP12 BLOCKED: TP20, TP21, TP22, TP23, TP24, TP25

## MP12 re-verification

2026-11-13, HEAD `a85ed55`. SA1's response section 10 and the revised tasks/checklist are the inputs.
This section supersedes the earlier blocked status only for the parts explicitly signed off below.

### MP12a first

Reviewed `MP12a-calibration-slice.md` SHA-256 `3bc45bcb63a9...` (written 11:32 +07:00) and the shared-lock
checklist SHA-256 `8acf289f10c3...` (11:50 +07:00).

| Finding | Re-verification |
|---|---|
| TP20 | Resolved for dispatch. The launcher uses the delivered `run(argv, overrides)` API, pauses at 150 seconds, preserves the 400-second child budget and resumes only its distinguished scheduled-pause exit 3. Dated staging keeps report/checkpoint names stable across midnight; publication checks completeness, repetitions and source identity before copying once. Every expensive command uses the shared bounded helper. One minor explicit-interrupt edge is TP29 below. |
| TP21 | Resolved. C5 covers canonical re-ratings of accepted puzzles only. Diagnostic unrateable samples retain their attempted-sample denominator, do not gate C5 and do not size the accepted-path cap. |
| TP22 | Resolved. C2 uses measured request completion; the fit and penalty comparison use puzzle rescore hits. An availability failure cannot schedule an unchanged tuple. One evidence-based `SHARES`/`K60` proposal requires the orchestrator's go-ahead; absent justification, the task stops. |
| TP26 | Resolved. All four re-pin classes are explicit, with bounded current-source D36 observations before the strict tests. The negative case needs all-capped evidence, not merely `not-in-band`; its fallback order is finite. A `DEDUCE` change requires fresh recipe deduction inputs before formula checking. |
| TP27, MP12a part | Resolved. Null metrics make ordering/other relevant criteria unavailable rather than zero. The criteria script has the requested pure cases and treats missing reports/repetitions as input errors. |

**Lock interleaving with MS05r4.** The helper holds the mutex for one bounded Node invocation, not the surrounding
case/round loop. It releases it before its mandatory 15-second sleep; only after that sleep can the `do/while`
resume call acquire another lock. Captures/ratings are limited to 570 seconds and other commands to 590 seconds;
normal landscape invocations finish after the scheduled pause plus the existing child deadline. The Sudoku
helper checks the matching lock names and polls every five seconds. With the orchestrator's specified 15-second
gaps on the Sudoku side too, neither series immediately takes the lock back ahead of the waiting peer. No lock is
held during a series-wide wait or across the next invocation. This satisfies the requested interleaving rule,
without claiming a stricter FIFO scheduler.

**Checks.** The exact embedded launcher's existing self-test passed 22/22 using only its in-memory filesystem.
MP12a's six PowerShell blocks and the shared helper's block parse. The `package.json` Node test commands, dated
`reportBase`, source-digest API and `onInterrupt` behavior match the committed tooling. No production generation,
real mutex acquisition, slow run or fixture rewrite was performed.

#### TP29 — An explicit interrupt must not become a scheduled resume

**Severity: Minor; precise MP12a developer addendum.**

The launcher says Ctrl+C is an unscheduled stop, but its handler only calls `onSignal`. If the current row then
runs beyond the scheduled timer, `paused` becomes true and exit 2 becomes exit 3: the outer loop resumes despite
the explicit interruption.

An in-memory reproduction emitted SIGINT, let the scheduled timer fire while the fake row finished, and added
one checkpoint row. Actual launcher exit: 3; stated contract: 2. The real calibration API supports this sequence
because it finishes the current row after either interrupt.

Add a separate `interrupted` boolean, set it in the SIGINT handler, and classify
`code === 2 && interrupted` as exit 2 **before** either scheduled-pause case. The timer may still request its
pause, but it cannot erase the explicit stop. Add this one memory-only case to the self-test and update its
expected count from 22 to 23. No budget, seed, checkpoint or lock-policy change is needed.

**MP12a disposition:** no Blocker or Major remains. Dispatchable with the small TP29 addendum; MP12b1/b2 are
reviewed separately below.

MP12a VERIFIED

### MP12b1 and MP12b2

Reviewed `MP12b1-full-landscape.md` SHA-256 `25e37e9b02fb...` (11:49 +07:00) and
`MP12b2-search-evidence-and-lock.md` SHA-256 `573b83f63f00...` (11:55 +07:00), with the same checklist revision.

| Finding | Re-verification |
|---|---|
| TP20, remaining tasks | Resolved. Both tasks use MP12a's bounded launcher/shared helper, release between invocations and retain the 15-second gap. R/A use 570 seconds, H 300, HL 180 or 570; capture timeouts are explicitly censored, not passes. |
| TP23 | Resolved. H plus the new HL population cover all 25 Hell cells. The driver preserves actual board rows, rotation, seed convention and quantity; the selected-report path and rep rule are explicit. Ratios use the capture's own observed counts, with censoring shown; landscape request rates remain separate. The missing-successful-companion stop is explicit. |
| TP24 | Resolved. F1+F2 is evaluated on the effective prefix, not by adding separate results. Censored tails are unknown; completed baselines and observed false stops are separate. The four required synthetic cases include the composition counterexample. No universal safety claim or impossibility notice remains. |
| TP25 | Source identity checks, historical-data reuse, current-tuple availability probes and new output folders are corrected. The ordered-change branch still omits re-evaluation of the acceptance criteria: TP30 below. Two smaller branch-contract clarifications are TP32/TP33. |
| TP27 | Null guards, actual sample denominators, explicit protocol coverage, missing/invalid statuses and one selected run population are corrected. Clarify the prescreen read versus aggregation distinction as TP31. |
| TP28 | Resolved. The actual non-inert decision is stated; S's capture, enumeration and simulation are inside the explicit false-by-default guard. |

**Additional light checks.**

- The exact new case-argument block, evaluated without starting generation, produced the 15 x 15 blocked board
  with 215 active cells, seed `landscape/15x15b10-hell-1/3`, quantity 10 and uniqueness `any`. Unknown case, absent
  rep, reps -1, 1.5 and 20 all refused. H and the command block's HL list form a disjoint cover of the current
  matrix's 25 Hell cases.
- The embedded observer is byte-identical after newline normalisation to the observer at `a85ed55`
  (SHA-256 `696bd54d78d1...`); the earlier four-case verification therefore still applies.
- The historical engine comparison against `eea5fed` and current engine status both print nothing at this HEAD.
  The reuse argument is valid now, but must be checked again after MP12a's possible knob changes.
- MP12b1's four PowerShell blocks and MP12b2's one block parse. All four reviewed files retain CRLF, no BOM,
  no trailing whitespace and a final newline. No real capture, benchmark, lock or suite was run.

#### TP30 — Re-evaluate the criteria after an ordered change, not just its generation data

**Severity: Major; remaining part of TP25. File: MP12b2:558-560,585-618.**

Record section 4 still takes the criteria from **MP12a's final round**, by reference. The ordered-change steps
rerun the landscape and search populations, rebuild the aggregate and refresh availability decisions, but do not
re-run `criteria.mjs`, replace that old criteria table or obtain its new canonical probe input. The only other
mention of `criteria.mjs` is its read-only ownership restriction.

Fresh generation data and a matching source digest do not establish C2. For example, a GV2 rate of 95% sets an
85% bound. An earlier slice at 90% passes, while a changed tuple at 80% fails. The latter still makes puzzles on
the same areas; neither the availability-change stop nor the ordinary quick/slow tests necessarily catches this.
The general landscape aggregate is not the GV2 comparison, and its intentionally retained Hell failures prevent
using its overall verdict as a substitute.

**Exact fix, within the accepted contract.**

1. Add the slice criteria and their probe input to the ordered round's evidence inventory. After the new reports,
   repeat MP12a's capture-once/canonical-`prod` procedure for the same 90 matching requests, under the helper and
   the same 570-second bounds, into `landscape-v3-change-1/probe/` (new packs, manifest and `final.jsonl`).
   No old tuple's captured results may stand in for these current inputs.
2. Run the existing, read-only `criteria.mjs` on the change round's 18 GV2 reports, the unchanged GV2 baseline and
   that new `final.jsonl`. Its report selection must ignore the other full-landscape cases and the aggregate;
   it still requires exactly one valid report for each GV2 case. Keep diagnostic samples separate as in TP21.
3. Replace record section 4's reference with this current-tuple C1-C5 table when a change round ran. Recompute the
   P-OD1/P-OD2 numbers affected by the change; the P-OD3 experiment remains labelled with its own tuple.
   A failed or unavailable criterion returns to the orchestrator with numbers before the lock; a prior
   disposition is not silently carried across changed results.
4. Add these outputs to ownership, the estimated time, T05 and the pre-lock stop list. Nothing here changes a
   threshold or reopens D36/D37.

A synthetic handoff check should use the 95%/90%/80% example: the new source identity and valid report coverage
must not leave the old passing C2 table in the lock record.

#### TP31 — Read prescreens for the protocol; exclude their runs from the aggregate

**Severity: Minor. File: MP12b1, aggregation steps 1-3.**

Step 1 says a promoted cell's `-s3` report is "never read", while step 2 must derive the P-OD6 plan from all
prescreens. The intended exclusion is from the aggregated run population, not from protocol inputs.

Read and validate the 25 three-rep prescreens first to determine successful cells and the original boundary of
each level. Then choose one report's `runs` per case. Change "never read" to "never appended to the aggregate's
run list alongside the selected 20-request report". Add the case where the original boundary has no puzzle in
its prescreen but makes one in its full run: it remains the boundary and no second case is promoted.

#### TP32 — The optional narrowed rerun is incompatible with the strict aggregate

**Severity: Minor; binding before choosing that branch. File: MP12b2:591-610.**

The default whole-landscape rerun is executable. The optional narrower rerun is not specified consistently:
`aggregate.mjs` requires every case and one shared source digest, and its change-round invocation searches only
the new folder. Every allowed production-value edit changes a hashed source file (`SOURCE_FILES`,
`tools/bench/report.js:37-48`). Unrerun cases are therefore either missing, or have the previous digest if copied;
the strict aggregate correctly refuses them.

For this pack, remove the narrower-rerun exception and require the complete landscape/P-OD6 population whenever
the source identity changes. That is already the default cost given to the orchestrator. A later proposal for
proved-compatible per-case reuse needs its own explicit data contract; do not re-stamp old evidence or weaken
the present aggregate opportunistically. This fails closed today, so it does not block the ordinary tranche.

#### TP33 — Separate script paths from change-round data paths

**Severity: Minor; binding for an ordered change round. File: MP12b2:604-610,885-889.**

Make "in place of `$s` for the populations" unambiguous. Keep a script root at `search-<date>` and introduce a
separate data root, initially the same folder and later `search-<date>/change-1`. The observer, summary,
`flow-case.mjs` and fail-fast script remain at the script root; captures, manifests, `runs.md` and derived tables
use the data root, with the change aggregate supplying `$ref`.

Do not move/copy the observer into `change-1` without changing its import: its fixed
`../d21-2026-11-12/register.mjs` would resolve to the wrong directory there. In particular, HL's manifest must
be the new data-root manifest, not the old manifest whose case IDs cause the loop to skip captures.
Add a no-generation stub pass of the change-round path, not only the initial/resume paths already checked.

**Final re-verification disposition.** MP12a is dispatchable with TP29; its fair lock interleaving is verified.
MP12b1 has no Blocker or Major (TP31 is a precise clarification). MP12b2's normal measurement path is corrected,
but its ordered-change qualification needs TP30 before the whole tranche can be signed off. TP32/TP33 are
small accompanying clarifications. No new owner or plan-author decision is needed for these fixes.

MP12 BLOCKED: TP30

## MP12b final verification

2026-11-13, HEAD `f33aa71` (the pack snapshot; MP11's engine/tooling remains the reviewed baseline).
Scope: MP12b1 and MP12b2, SA1's response section 11 and TP30-TP33. MP12a remains frozen; its earlier sign-off
and the already-dispatched TP29 addendum are unchanged.

| Input | SHA-256 prefix | Written (+07:00) |
|---|---|---|
| `tasks/difficulty-v3/MP12b1-full-landscape.md` | `a037705e52ac` | 12:28:57 |
| `tasks/difficulty-v3/MP12b2-search-evidence-and-lock.md` | `8b1c093a13a0` | 12:39:27 |
| `tasks/difficulty-v3/check-list.md` | `94d38dacb9ad` | 12:36:12 |

| Finding | Result |
|---|---|
| TP30 | Resolved. The ordered round now includes fresh captures and canonical `prod` ratings for the same 90 requests, evaluates C1-C5 against the unchanged GV2 baseline, replaces record §4's old table, recomputes affected P-OD1/P-OD2 evidence, and stops on a failed or unavailable criterion. Source checks prevent an earlier tuple's passing table from being carried into the lock. Ownership, gates and the time estimate include this work. |
| TP31 | Resolved. All 25 prescreens are read and validated first to derive the protocol. Only the selected report's runs enter the aggregate. A boundary which succeeds in its full run remains the boundary; no second case is promoted. Tests (g)-(i) cover the boundary, double counting and invalid protocol inputs. |
| TP32 | Resolved. A changed source identity requires the complete landscape/P-OD6 population and the associated evidence again. The incompatible narrower-rerun exception is removed; old reports are neither copied nor re-stamped. |
| TP33 | Resolved. `$s` remains the script root; `$data`, `$full` and `$criteriaFolder` select the new evidence. Captures, the new HL manifest, logs and derived tables use `$data`; the observer's relative import stays valid. |

### Compatibility with the frozen criteria script

The separate `landscape-v3-change-1/slice/` is correct. The inspected `criteria.mjs:313-336` requires exactly one
dated report per GV2 case and rejects other dated JSON files in that folder. The 18 reports therefore belong in
`slice/`; the full aggregate and other cases remain in its parent. The non-recursive scan ignores `slice/probe/`.

The command uses the existing `--round`, `--baseline` and `--final` flags and legitimately omits optional `--fit`
(`criteria.mjs:527-565`). Exit 0 means the inputs could be evaluated, **not** that C1-C5 passed. MP12b2's explicit
status-based stop in change-round step 7 correctly covers that distinction. No change or addendum to MP12a's
criteria script is needed.

Light checks, with no live data:

- The exact criteria input loader, evaluated in memory with virtual filesystem functions, accepted the new
  18-case slice layout and its `probe/` subfolder with no fit file. It loaded a current request rate of 80% and
  baseline rate of 95% from their separate inputs. It rejected a parent layout containing a Hell report and the
  aggregate, as expected.
- The exact `Assert-CriteriaSource` function passed four memory-only cases: current identity accepted; old digest,
  changed version and missing case rejected.
- MP12b1's four PowerShell blocks, MP12b2's two and the checklist's helper block parse.

Only the criteria/probe-driver source was read to check these contracts. No live report, captured pack or manifest
was opened or changed; no criteria command was run against the live round, and no timing lock, generation or heavy
test was started.

### TP34 — Finish the local probe-copy path adaptation

**Severity: Minor; MP12b2 implementation note, not an MP12a addendum.**

When adapting the scratch driver for change-round step 5, account for the extra `change-1` directory. The current
`tests/artifacts/MP12a/corpus.mjs:13-18` uses six `../../../core/...` or `../../../tools/...` imports, while
`lib.mjs:15-23` derives the repository root with three parent steps and derives `ROUND_DIR` from `MP12A_ROUND`.
A literal copy one level deeper will not resolve correctly.

In the **MP12b2 copies only**, use four parent steps/import prefixes, set `ROUND_DIR` to the new `slice/`, and
replace the MP12a-specific round/date configuration with this round's configuration. The expected-report lookup
(`corpus.mjs:116`) must select the unique dated report of that case in the new slice; do not assume every shard
has the same start date or fall back to MP12a's old folder. Keep all outputs in the already-specified new paths.
Check those resolved paths before the first capture. This completes the task's existing copy-and-adapt instruction;
it requires no change to the frozen originals or to `criteria.mjs`.

**Sign-off:** TP30-TP33 are closed. No Blocker or Major remains in the MP12 tranche. TP34 is a small local-copy
note for the future ordered-change branch. The existing owner gates and all measured acceptance requirements stay
in force; this verifies the task pack, not the as-yet-unrun calibration outcome.

MP12 VERIFIED

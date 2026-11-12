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

# Pentomino difficulty-v3 — response to the first review of the task pack

| Field | Value |
|---|---|
| Date | 2026-11-12 (+07:00) |
| Responder | SA1, claude-opus-5.5 (author of the pack) |
| Review answered | [`../gpt-6-astra/6-review-of-task-pack.md`](../gpt-6-astra/6-review-of-task-pack.md) (SA2, gpt-6-astra): FP01-FP10 |
| Result | **All ten findings accepted**; FP01 and FP05 with one addition (count cutoffs under the diagnostic budget). No owner decision reopened |
| Files changed | `tasks/difficulty-v3/`: `MP06b-probe-and-v2-baseline.md` (Amendment A1 only, at the orchestrator's request), `MP06c-initial-fit.md`, `MP07-centre-seeking-clues.md`, `MP08-pure-v3-score.md`, `MP09a1-duplicate-shapes-refused.md` and `MP09a2-saved-sets-notice.md` (they replace `MP09a-duplicate-shapes-refused.md`), `MP09b-v3-claims-in-packs-and-codes.md`, `MP09c-unrateable-and-unproved-candidates.md`, `MP09d1-measure-v3-and-v2-names.md` and `MP09d2-activate-v3.md` (they replace `MP09d-activate-v3.md`), `check-list.md` (rows and sections the analysts own); this file |
| Not changed | the dispatched or accepted task files other than MP06b's amendment; the Done column, the release record (§9) and the execution summary of the check-list (the orchestrator's); the reports, `plan.md`, `clarifications.md`, SA2's folder |

## 1. Disposition

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| FP01 capped-path statistic and final-cap verification | Blocker | Accepted | MP06b Amendment A1.3-A1.5; MP06c "Data"; check-list D19 |
| FP02 codec tests with 128 identical pieces | Blocker | Accepted | MP09a1 "Existing tests that build twin sets …" and "Test fixtures to build"; MP09a1-T04 |
| FP03 removal notice repeats on reload | Blocker | Accepted | MP09a2 (`saveRestoreCleanup`, its call in `createGeneratorApp`, the startup-save tests); MP09a2-B02, T02, T03 |
| FP04 v2 writer drops admitted legacy metrics | Blocker | Accepted | MP09b "The v3 claim" (writer for `difficulty-v2` claims), test plan, MP09b-B03, T05 |
| FP05 probe corpus not immutable or replayable | Major | Accepted | MP06b Amendment A1.1, A1.2, A1.5, A1.6; MP06c "Data"; check-list D19, §2 ownership, §7 GV2 |
| FP06 targeted runs execute the slow sweeps | Major | Accepted | check-list §3 "Tests"; the commands of MP09a1, MP09b, MP09d1, MP09d2 |
| FP07 design brief missing from ownership | Major | Accepted | MP09a1 (sharing paragraph), MP09a2 (Generator paragraph), MP09b (puzzle-code paragraph), each with a technical criterion; check-list §2 |
| FP08 MP07-B02 wording | Minor | Accepted verbatim | MP07-B02 |
| FP09 check-list structure | Minor | Accepted | check-list header, §1, the parts map, §2, §4.1, §4.2 (D20-D25), §5, §6, §7; requests to the orchestrator in §3 below |
| FP10 MP09c wording and two cases | Minor | Accepted | MP09c Goal; cases S2b and S7b; MP09c-B01, T04 |

## 2. Notes on the findings

**FP01, FP05 (MP06b).** The amendment was appended before the Execution log with the marker line the orchestrator
polls for. It keeps every point the orchestrator had approved for the developer (the `run-logged.mjs` wrapper, deleted
checkpoints, real counts, the timing semantics, capped lines reported separately, merged B parts, `policy.js` edited
after the last probe, the `Gproved = 0` counts, C re-run once with `--count 4` as a labelled cost-only sample).
Contract in brief:

- every request is generated once and its pack captured under `docs/difficulty-v3/probe-corpus-2026-11-12/packs/`
  with a manifest row even when it yields nothing (case, seed, level, exit, accepted count, identity digest, expected
  digest from the GV2 report, match);
- every rating run reads the captured packs with `--pack`, under a labelled budget (`old`, `diag`, `diag2`, `base`,
  the census trials, `final`), into a file per request and label that is never overwritten;
- every line is classified (`error`, `complete`, `capped`, `none`) before a field is read; the old capped-path share
  is `path === 'capped'` under the old `DEDUCE`, count cutoffs are reported apart;
- the caps come from complete diagnostic observations; a path still capped after one higher re-measurement (`diag2`)
  is an MP06b-B03 failure that the orchestrator decides, never an exclusion;
- **addition**: a count cutoff under the diagnostic budget is re-measured in `diag2` too, and if still cut its
  counters are lower bounds and stay out of the maxima as a reported finding; the final check still requires its path;
- after the caps and the census budget are chosen, the whole cohort is re-rated under the exact final tuple, and C5,
  the `Gproved = 0` counts, the distributions and the cost table come from that run only;
- MP06c reads `final.jsonl` joined to the manifest by `(request, puzzleId)`, checks counts and uniqueness, classifies
  again and fits on complete lines only. Its grid (365,400 knob sets) is timed on a 10,000-set prefix and run in five
  `base.max` shards when the projection exceeds 8 minutes.

**FP02 (MP09a1).** The analysts reproduced SA2's values on `3fd99ff` with an independent read-only probe and added
the ones the migrated tests need: 128 distinct `canonicalKey`s, 752,378 placement rows (849,920 with twins),
H = 12.477212990727637 equal to the mean of `log2(1 + n)` over `countPlacements(...).perPiece`, `validatePack`
accepting the set with two `piece-hole` warnings, `rebuildRatingClaim` equal to the test's claim (score 256,
`hell-4`), raw cores 109 (no claim), 112 (compact claim) and 398 (escaped), automatic cores 34 and 271 (version 2).
The `< 80` assertion becomes "bare + 3 symbols" and the `> 250` one becomes 398. The property corpus is made
twin-free by an explicit, bounded merge loop that draws no random number (in the task verbatim); over the 150 seeds
every snapshot stays valid and the remaining counters stay far above 10 (solutions 96, large 42, clued 88, rated 121,
titled 130, certified 60, compact claims 66, escaped claims 55); `repeated` and `repeatedFlag` are dropped. The
`pairPayload` refusal cases keep their errors because their first issue precedes the shape check. **Completeness
check** (beyond FP02): the quick set (1,177 tests) run on a scratch copy of `3fd99ff` with only the new pack check
failed in exactly 13 tests, 2 in `tests/pack.test.js` and 11 in `tests/puzzlecode.test.js`. Besides the two FP02
tests, the property test and the `repeatedShapes` uses, they include the `disconnected` snapshot (two monominoes, used
by five tests), the construction-helper pair and both mask tests (`stripPuzzle` makes equal strips, and a
checkerboard mask can hold no twin-free puzzle at all). MP09a1 now lists all 13 with their migration: `disconnected`
becomes a monomino and a domino, the helper pair becomes the `duplicate-shape` refusal case, the first mask test
writes the masks with `encodeCorePayload` below the pack check, and the second uses a one-piece puzzle. With these
changes both files pass on the scratch copy (34 and 51 tests).

**FP03 (MP09a2).** `saveRestoreCleanup(store, persistence)` (new, in `generator/state.js`) calls
`persistence.saveNow()` once when the restored state carries the `M-DUPLICATE-SETS` notice; `createGeneratorApp`
calls it right after creating the persistence. A failed write goes to the existing `onFailure` toast and never throws;
the notice stays on screen. The tests use `fakeStorage` and the fake timers of `tests/generator-state.test.js`: one
write, the cleaned snapshot, no notice on reload, no further write on `flush()` and `destroy()`, and the failure path.

**FP04 (MP09b).** Exactly seven v2 keys (any order) keep today's fixed order and bytes, now from a detached copy; any
other v2 metrics take the detached bounded-JSON copy of a legacy claim, keys in stored order. Round trips through
`createPack` and `serializePack` cover extra keys, missing keys and nested opaque metrics; the generated fixture still
re-serialises byte-identically.

**FP10 (MP09c).** Both new cases were run on the analysts' reference implementation: S2b gives the calls of S2 and
returns `UTFZX` with `censored: true` and `Gproved` 1; S7b rates `IYTZX` (5 clues), then the repair `IYTWZX`
(6 clues) throws, and `selectClues` throws the same `RangeError` object.

## 3. Further changes and requests

- **Splits** (check-list D25), so that each part keeps the quick set green and stays within about an hour:
  MP09a = MP09a1 (refusal in packs, links, codes, the Player and the Generator's import, with the FP02 migrations) +
  MP09a2 (saved sets, notice and startup save, C4 (b)); the activation = MP09d1 (`measureV3` and the v2 names, no
  output change) + MP09d2 (`rate` and `MODEL` in v3, the re-pins, GF-P2 and GA-P2). Owners: C4 (b) MP09a2; C1 (b)
  MP09b (claims and codes) and MP09d2 (ratings); AR1 MP05 (metric), MP06c (counts), MP09c (rule), MP14a (event).
- Forward references to the old MP09c/MP09d scopes were corrected in MP07, MP08, MP09b and MP09c. The accepted MP06a
  file still says that "MP09c switches the tool to `measureV2`/`scoreV2`"; it is frozen, and check-list D22 records
  that MP09d1 makes the probe's `v2` field use `rateV2`.
- **For the orchestrator** (rows the analysts do not edit): in the execution summary, add an empty MP06c row, replace
  the MP09a row by MP09a1 and MP09a2, and add MP09d1, MP09d2 and MP09e after MP09c; in the release record (§9), read
  "GV2 baseline and probe (MP06b, MP06c)" and "GF-P2, GA-P2, GC-P2 (MP09d2, MP09e, MP10b, MP12b)".
- **Second pass**: MP09e and MP10a to MP17 are not written yet; they follow the same template and will be listed for
  SA2's second pass, as the review asks.

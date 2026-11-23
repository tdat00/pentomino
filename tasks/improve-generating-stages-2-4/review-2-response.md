# Review 2 of the stages 2 to 4 task pack: the pack author's response

| Field | Value |
|---|---|
| Review | `tasks/improve-generating-stages-2-4/review-2.md` (SA-Astra; 9 findings: 4 P1, 4 P2, 1 P3) |
| Response | SA-Opus, pack author, 2026-11-23 |
| Pack | `tasks/improve-generating-stages-2-4/`, base `57ef5cf`, branch `improve-generating`; frozen source `3fc65f4` |
| Result | 9 findings applied, the review's exact texts verbatim; none rejected |
| Owner or supervisor | no question: no allowance, scope, owner decision or plan v4 changes |

## Summary

- All nine findings are accepted and applied. Every replacement text the review gives is in the task verbatim, marked
  as SA-Astra's review R2-0x, with the concrete interface it asked for beside it.
- **The batch hard bound (R2-02)** is now a bound: at the cutoff the host returns the client's **prefix snapshot**
  (`igPrefix()`: the batch's own accepted prefix, provenance and seen histories, with a pack built from the same parts
  as the batch's own final assembly and validated at once with the synchronous `validatePack`), never awaiting the
  batch, its tasks or its pack assembly. A test-only **assembly gate** holds a set or batch assembly beyond the bound.
- **P7** builds the kernel inputs with the fixed `instr` constructor (R2-01). Its verdicts check every declaration
  against the corpus recomputed from its sources (`P7_COUNTS`), the run's producer and the item log's protocol
  (`resumePlan`), and every binding rechecks the complete input index (R2-04, R2-05).
- **To stay within about three developer hours**, T03b was split: T03b keeps the declaration, the checks and the
  verdicts; the new T03c has the bindings, the go rule and the commands; the C1 task is renamed from T03c to T03d. The
  index has 35 tasks and 68 developer hours (it had 34 and 64.5).
- Machine allowances, owner stops and prices are unchanged. The P7 equality runs' locked-verification estimates rise a
  few minutes, because the six Hell 1 kernel inputs now run.

## Per finding

| ID | Priority | Status | Where now | What was done |
|---|---|---|---|---|
| R2-01 | P1 | applied | T03a, T03b, check-list D-P24-05 | constants `P7_INPUT_CONSTRUCTOR` (`instr`), `P7_INPUT_RULE` (`kernel-window-v1`), `P7_CATALOGUE` (`data/boards-v1.json`); kernel and timing declarations carry `inputTree`, converted by `runtimeItems` to `inputRoot`; the worker builds every kernel input with the cached `inputEngine(root)` (carving and subsets need no workspace), outside every timed interval, and passes the same board, pieces and clues to `base` and the candidate; the declaration binds the constructor's tree identity and rule, and the catalogue's hash among the corpus inputs; the base-against-base case adds `equal:base:kernel:26x26-hell-1:0`, which must end `ok`; a `no-set`/`no-subset` is an item error (an incomplete verdict, a probe defect for a ruling) |
| R2-02 | P1 | applied | T07b, T07c, T08a, T08c, T09a, check-list D-P24-01, D-P24-04 | five client edits `lv-15` to `lv-19` (the gate before the set's and the batch's `assemblePack`, the snapshot `job.igPrefix()`, `client.igPrefix()`, the synchronous validator's import); `lv-14` rewritten: one `race` per phase, the batch's cut resolves `client.igPrefix()` at once (a missing or failing snapshot is a fault, never an invented prefix); T07b's `hostBoundCase`: (a) a held batch answered by the snapshot at t0 + 119000, (b) every set attempt held cut by the reserve at 46000, (c) held set and batch promises at the controller seam; T07c's last factory case is now `the host bound around a held assembly`: the batch's own assembly held beyond 120 s (the response already there at 119 s, the fake clock driven to 125 s, the release changes nothing, the snapshot equals the batch's own prefix, `made`, seen histories and pack) and a set assembly held after a success at 10 s; the gate's `entered` list replaces the microtask count; edit counts `live` 76, `live-test` 77, the frozen arms 90, the twins 91, the no-window variant 92 |
| R2-03 | P1 | applied | T02b, T02c, T11, S01, check-list D-P24-07 | `declaredRowProblem(declared, row)` (T02b), used by `previewCell` and by `prefixes` before `ingestRow` (`wrong declared identity (...)`, the row `invalid`); `rawIdentityProblems` (T02c): the shard declaration, the row identity line and the publication's tree, copy and producer, kept apart from the ledger in each row's `identity`; complete fixtures (`shard.json`, `.row.jsonl`, the runs file's `meta`, a real `mp12b1-x.json` hashed from disk); negatives for a self-consistent wrong seed, a wrong rep, a missing row identity, a mismatched producer and a missing shard declaration; one fresh fixture per refusal, the existing output made inside its own scenario; T11 and S01 pause on every identity problem |
| R2-04 | P1 | applied | T03b, T03c, check-list D-P24-05 | `P7_COUNTS` (quick 30/112/7, full 30/676/7, timing 90, by source), `corpusCounts`, `corpusInputPaths`, `expectedCorpus` (production only, recomputed from the sources at every check); `runProblems`: the declaration against the expected corpus (items with their settings, counts, constructor, corpus version, input index), the state's manifest, tree and producer against the declaration, and `resumePlan` over the log; a problem makes the verdict `incomplete`; valid start/end fixtures; negatives for an end without a start, a producer mismatch, a self-consistent run without its kernel item, an empty index, a changed corpus file, an unexpected start and a count mismatch, and their timing analogs; T03c's reports bind the declared corpus inputs and, for `V4-P7`, the equality reports, and every binding rechecks the complete required inputs |
| R2-05 | P2 | applied | T03a, T03b, T03c, T03d, T04, T05a, T05b | every compared step records `referenceError` and `candidateError`; the `mem-above` case asserts the exact reference error and the equal candidate error; `equalVerdict`'s `diagnostics` carries each unequal item's `differing` list, which the C1, R5, C5 and full-tier stop points now name; `bind` and `time` read both equality reports before any tree (`boundReports`), and the two refusal gates run while `p7-c1` has no manifest (a `Test-Path` gate shows it) |
| R2-06 | P2 | applied | T09a, T09b, T09c, check-list D-P24-10 | `LIVE_TWIN_OF`, `LIVE_TEST_DEADLINE`, `twinDerivationProblems` on the captured `ig-tree.json` (the twin's chain is its parent's plus `w8`, its edits its parent's plus `w8-1`, the same added files, the same parameters but `liveDeadline`, and that deadline exactly); `verifyChecks` validates the identity record's format, version and fields and applies the derivation check even when the recorded tree id equals the captured one; T09b passes the arms' and twins' full records; T09c's expectation applies the same checks; negatives for the wrong parent, an extra edit, an unauthorized parameter, another deadline, an extra file, a missing parent capture and the identity's version; T09c's producer fixtures corrected (a mixed producer changes a runs file and its raw shard; a single-file change is the raw-identity mismatch) |
| R2-07 | P2 | applied | T12a, T12b, T11, check-list D-P24-08 | T12a adds `readRepoFile` (from `lib/proof.mjs`) and `sha256Text` to the imports, and T12b extends them; `FIT_INPUTS` gains `t11-transport.mjs` and `t11-projection.mjs`; `fitIndex` returns `uncaptured` items with their hashes and captures of `kind: 'normalized-text'`; T12a's gates stop on any problem but the three named harness sources and check that every `FIT_INPUTS` path exists; T12b's capture block refuses an existing destination, requires `git --no-pager show` to succeed, strips a BOM, writes CRLF, checks `sha256Lf` before writing once (`flag: 'wx'`), and its gates test an existing destination (hash unchanged) and a failed read (nothing written) |
| R2-08 | P2 | applied | S07, S06, check-list §3.2 | S07 step 7 carries the review's text: no comparator closure (`close` knows only `V4-S4`, `manifest.mjs:1941-1946,2027-2077`), the owner's instruction and the missing comparator rows recorded in `s07-stop.md`, the finalization suffix only with every `publish-<twin>` arm published with its tree identity (`verdict-input`, `manifest.mjs:2593-2595`) and the owner's authorization, otherwise the measured stop and a joint SA ruling; S06's post-closure suffix gains the same publication precondition; §3.2 states it once |
| R2-09 | P3 | applied | T03d, T09b, T09a, T05b | T03d's G3 lists `tools/ig-proto/self-test.mjs`; T09b's clean CLI case asserts the exact seven-file listing of the copies; T09a's Scope no longer names `declaredRows`; T05b names `timeDeclarations`, converted by `runtimeItems` |

## Design choices within the findings

1. **R2-02, which snapshot.** The review offers two designs; the pack takes the first, a snapshot assembled at once on
   demand. An assembled snapshot maintained before acceptance would add a pack validation to every accepted puzzle of
   every bounded batch and change the arms' measured times. The on-demand snapshot costs nothing until the bound fires.
   It is a synchronous assembly from the batch's own state: `createPack` of the same parts as the final assembly
   (`generation-client.js:1185-1204`, compared textually by `bt-bound.mjs`), validated by `validatePack`
   (`core/engine/pack.js:1595`), which gives "the same result" as `validatePackSliced` (line 1621).
2. **R2-02, where the gate lives.** `igAssemblyGate` is a client option. The bench creates its client with `{ clock }`
   only (`tools/bench/runner.js:374,380`), and so does the product, so neither has a gate. The controller-seam cases are
   part (c) of `hostBoundCase`, so they also run on both twins (T08c); `LIVE_CASES` keeps fifteen names, one of them
   renamed.
3. **R2-04 and the split.** T03b had no room for the validation contract, so the commands moved to a new T03c, and the
   C1 task was renamed T03d. In reviews 1 and 2, "T03c" for C1 now means T03d.
4. **R2-07, the capture runner.** The capture block runs in Node through PowerShell, not `cmd /c git show > file`. Node
   reads git's UTF-8 output exactly, while PowerShell's decoding of native output depends on the code page. It is the
   developer's read-only git, never the harness's (T01b's guard scans `tools/` only).

## Index changes

| Before | After | Reason |
|---|---|---|
| T02c 2.5 h | T02c 3 h | R2-03 |
| T03b 3 h (commands, declaration, verdicts, go) | T03b 3 h (declaration, checks, verdicts) + T03c 2.5 h (bindings, go, commands) | R2-01, R2-04, R2-05 |
| T03c 3 h (C1) | T03d 3 h (C1), depends on T03c | the split |
| T09c 2.5 h | T09c 3 h | R2-06 |
| 34 tasks, 64.5 h | 35 tasks, 68 h | |

T07b stays at 3 h: its ten edits and its test code are given verbatim. The P7 equality runs' estimates change from
about 15 to about 15 to 20 minutes (quick tier) and from about 45 to about 45 to 50 minutes per composite (full tier),
still within their invocation limits. The traceability rows (§2 Scope, §6 T6, §8.2 T03-T05) and the register (D-P24-01,
D-P24-04, D-P24-05, D-P24-07, D-P24-08, D-P24-10) follow.

## Verification

Run at the repository root on 2026-11-23, unlocked; no engine, rating, search or generation run:

| Command | Result |
|---|---|
| `node --experimental-vm-modules --no-warnings docs\improve-generating-stages-2-4\evidence\sa-opus\bt-variants.mjs --label frozen` and the same with `--draft` | 11 manifests, every check passed: every anchor matches once in its composed chain and every touched module parses (`live` 76, `live-test` 77, frozen arms 90, twins 91, no-window 92) |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-bound.mjs` | 18 checks passed: held set and batch promises end at t0 + 119000, the batch with the snapshot; a later release changes nothing; a missing or failing snapshot is a fault; a result that settles first is unchanged; the snapshot's pack parts equal the final assembly's in the composed client |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-capture-check.mjs` | the three normalized captures of `57ef5cf` reproduce their indexed `sha256Lf` |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-git-guard.mjs` | every check passed (T01b unchanged) |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-prior-check.mjs` | all 12 Hell 1 entries reproduced |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-fit-index.mjs --check` | SA-Astra's three indices: 0 missing, 0 changed |
| the index check of `check-list.md` | 35 rows, 68 developer hours, every linked file exists |
| `npm run check` | `check-conventions: OK`, `check-site: OK` |

The code facts cited were re-read at `57ef5cf` and in the frozen source: `generation-client.js:398,407-418,498-502,
709-752,1097-1101,1185-1204,1282-1289`; `runner.js:374,380,536,566-568,626-629,638-645,669-677`; `pack.js:1595,1621`;
`lib/items.mjs:34,89,123`; `lib/sets.mjs:44-51,88`; `lib/lane-worker.mjs:12-16,323-336`; `self-test.mjs:607-617,
620-630`; `arm.mjs:116-120`; `variants/log.json:51`; `lib/records.mjs:161-206`; `lib/tree.mjs:317-329`;
`manifest.mjs:1941-1946,2027-2077,2593-2595`.

## Files

- Created: `T03b-p7-probe-declaration-and-verdicts.md` (T03b rewritten), `T03c-p7-probe-bindings-and-commands.md`,
  `review-2-response.md`.
- Renamed: `T03c-p7-c1-live-row-lists.md` to `T03d-p7-c1-live-row-lists.md` (and edited).
- Removed: `T03b-p7-probe-commands.md` (replaced by the two above).
- Edited: `check-list.md`, S01, S02, S06, S07, T02b, T02c, T03a, T04, T05a, T05b, T07a, T07b, T07c, T08a, T08c, T09a,
  T09b, T09c, T11, T12a, T12b.
- Evidence (`docs/improve-generating-stages-2-4/evidence/sa-opus/`): `bt-live.mjs` (`lv-14` rewritten, `lv-15` to
  `lv-19` added), new `bt-bound.mjs` and `bt-capture-check.mjs`.

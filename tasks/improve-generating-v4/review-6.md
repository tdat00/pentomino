# improve-generating-v4: task-pack cross-review 6

Reviewer: SA-Astra (gpt-6-astra). Pack author: SA-Opus.
Start: 2026-11-17 00:39:39 +07:00.
End: 2026-11-17 00:43:33 +07:00.

## Basis and result

This is the requested confirmation round, limited to RV5-01, RV5-02 and RV5-03 and their directly affected
contracts. Read `review-5-response.md`, the revised T04b/T04d/T11d and checklist entries, and the relevant
T04e/T04f and tree-planner references. Earlier closed findings are not reopened.

- Pack-input SHA-256: `fc8d24af91333834e234f3f1962b24fdd1ec95665ca9271f7cd4e02dfead68b3`
  (37 sorted checklist/T-file names, each followed by LF and its LF-normalized content).
- Plan SHA-256: `ce6170b8f927a5f8681794a2aad714b4637374b04841e55fe2063f20e705b708`, unchanged.
- The task table remains 36 tasks, 97.5 developer hours and 73 allocated machine minutes.

**All 3 RV5 findings are resolved; 0 remain unresolved. New findings: 0 blocking, 0 major, 0 minor.**

## Finding status

Task paths are relative to `tasks/improve-generating-v4/`.

| ID | Status | Verified disposition |
|---|---|---|
| RV5-01 | resolved | T04d step 4 now separates the early gate from the historical receipt block. `pm4GateEvidence(instrTreeId, readFile = readRepoFile)` reads only the two named IGP-02 records. The CLI verifies the frozen snapshot/digest and obtains its independent expected identity from `planTree('instr').treeId`, without suppressing edit failures. It does not consume or create V4-T04 captured inputs or a stage-1 receipt, and every non-pass exits 2. Step 3 still captures and hashes the historical instr metadata. T04e still runs IGP-02, the successful gate, then V4-T04. The new injected-reader case covers the exact two paths, a mismatching independent ID and unfinished screens; T04d-T05 records the acceptance criterion. |
| RV5-02 | resolved | T04b's first-begin bound violation now expects `bound exceeded c 0`, matching `pairPrimitives`' zero-based begin index. Case (m) still expects `overlapping begin c 1` for the second begin. The completeness outcomes and accounting rules are unchanged. |
| RV5-03 | resolved | T11d's `stepExpectation` now explicitly calls `stepEvidence(T, S, M, isV4, { historical: true })`. As defined in T04f, only the current-tree comparison is skipped: manifest, log and source checks remain. Captured metadata must still match the stored tree ID. T11d step 3's fresh receipt call and step 1's capture-time tree/producer checks remain unchanged; explicit current-arm checks still belong to `checkAccepted`. |

## Related checks

- Checklist section 2.7 maps each RV5 finding to its actual correction. The revision and decisions-register
  entries describe this round consistently; no task, estimate, dependency or allowance was added.
- T04d's acceptance references account for the inserted fourth test: the stage-1 line is case 6 and the immutable
  input index is case 5. The gate's new pure test does not require a measurement or historical evidence write.
- The early gate classifies snapshot/digest/plan errors as incomplete with a nonzero exit. This preserves the
  required fail-closed behavior and T04e's stop before the second plan; it does not weaken PM4's acceptance rule.
- The existing `planTree` implementation returns its computed `treeId` and throws on an edit failure when
  `opts.errors` is absent (`tools/ig-proto/lib/tree.mjs:172-187`, `:270-277`), matching the new caller contract.
- IG-P-Q37, N-V4-14 and the owner stop points are unchanged. No supervisor or owner question is raised.

## New findings

None. No RV6 replacement text is required.

## Completion

Acceptance is of the task pack, not permission to spend an unapproved allowance, run a deferred stage or release
the feature. Implementation and measurement gates remain mandatory.

Only this review is written. No production/test change, measurement, test suite or Git action was performed.
The output is verified as UTF-8 without BOM, CRLF, no trailing whitespace and a final newline; the reviewed pack
and plan hashes remain unchanged at completion.

Verdict: accept

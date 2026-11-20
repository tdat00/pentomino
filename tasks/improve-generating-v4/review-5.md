# improve-generating-v4: task-pack cross-review 5

Reviewer: SA-Astra (gpt-6-astra). Pack author: SA-Opus.
Start: 2026-11-17 00:13:35 +07:00.
End: 2026-11-17 00:34:32 +07:00.

## Basis and result

- Reviewed the 14 dispositions in `review-4-response.md` against the task files themselves: the six older findings
  still open after review 4 and RV4-01 to RV4-08. Earlier resolved findings are not reopened.
- The new review is limited to the changed contracts and their immediate producers/consumers: T02d, T04b,
  T04d/T04e/T04f, T09c/T09d, T11b/T11c/T11d/T11e/T11f/T11g, the shared checklist and related runner/code references.
- Pack-input SHA-256: `fc9249fea2210de8b5f805cc564bb846be27f6c42e9579efd5f8a1b67a120fa4`
  (37 sorted checklist/T-file names, each followed by LF and its LF-normalized content).
  Plan SHA-256: `ce6170b8f927a5f8681794a2aad714b4637374b04841e55fe2063f20e705b708`, unchanged from review 4.
- The production-source digest remains
  `e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b`, matching `3fc65f4`.
  Checks were reads, hashing and bounded arithmetic only. No generation, rating, replay, benchmark, test suite
  or Git action was run. Only this review is written.

**The 14 prior findings are resolved; none remains open under its original finding.**
There are **3 new findings: 0 blocking, 1 major, 2 minor**. The major finding is a narrowly scoped producer/order
gap introduced by the new captured-input contract, not a renewed objection to historical bindings.

Severity follows review 4: a material execution/inference gap blocks acceptance; a mechanical clarification that
does not change the acceptance outcome is minor. The two minors alone would not block acceptance.

## Prior-finding status

Task paths below are relative to `tasks/improve-generating-v4/`.

| ID | Status | Verified disposition |
|---|---|---|
| RV1-15 | resolved | T11b separates the projection from the enforced helper ceiling. The latter is `units * 345`, with at most one progress-making or final failed invocation per remaining unit. T11c refuses zero-row steps. |
| RV1-17 | resolved | T11c fixes argv arrays, full script paths, states, `repeatUntilDone: true` and explicit minimum horizons for every locked kind. Probe case populations are written out and match their priced populations; `instr` and `r4c` are built. |
| RV2-09 | resolved | T04d now names immutable evidence inputs and captures mutable metadata before writing the receipt. T04f verifies under `V4-T04f-verify`, protects historical self-test IDs and derives the stage-1 expectation from stored identities and captured copies. The new early PM4 caller gap is RV5-01. |
| RV2-12 | resolved | T11b prices each emitted step independently and no longer treats an admission reserve or the ten-second row allowance as a hard duration bound. The actual helper ceiling and the separate spending guard are explicit. |
| RV3-05 | resolved | The enforced 300-second helper limit plus counted quiet time supplies the row/item ceiling; zero-row steps are excluded. The 20-row example is 6,900 seconds. No extra allowance or tighter unenforced row deadline is implied. |
| RV3-06 | resolved | Explicit evidence indexes/copies, distinct verification namespaces and write-once accepted bindings address the original evidence-mutation defect. Later binding checks re-hash historical inputs rather than rebinding them to today's producer. The parity constructor's unnecessary current-tree read is the minor RV5-03. |
| RV4-01 | resolved | T02d uses `3 NZ + NC^2 / 2 + 3 (NC^2 / 2) K L` in both the derivation and code. Per pair, `K L + 2 K (L - 1) <= 3 K L`, covering the omitted scans. On review 4's CSR dimensions the corrected term is 5,365,464, above the 1,829,551 charged counterexample. Magnitude references and N-V4-14 follow the revised formula; real-rating cases remain sanity checks, not the proof. |
| RV4-02 | resolved | T04b specifies one shared `pairPrimitives`, used unchanged by T09c. Overlap is permanent when encountered; unquantified `error`/`unsat` ratings and any primitive open at an ordinary end make the ledger incomplete. Quantified work-cap results remain valid. The new focused cases and D-V4-17 reflect all three repairs. |
| RV4-03 | resolved | The stage-1 index includes captured tree/harness metadata rather than mutable source/cache paths. T04f's verification no longer overwrites `V4-T04f`'s historical state and checks evidence before editing and before accepting. T11d similarly captures parity inputs. The first-use PM4 gate needs the separate caller correction in RV5-01. |
| RV4-04 | resolved | T11c defines the runner's argv representation and appended arguments, required resume flags, states and minimum horizons. `accept-p0` names `tools\ig-proto\v4-check.mjs`; probe trees and populations are explicit. T11e/T11f inherit these builder rules. |
| RV4-05 | resolved | T11b explicitly says the row's admission/postprocessing allowances are assumptions, not an enforced row deadline. `ceilingInvocations = units` and `ceilingS = units * 345` use the helper/progress rules; T11c rejects a zero-row locked step. |
| RV4-06 | resolved | Both arms of `synthClass` use `K: 30`. The nine clue-14 rows are valid evidence and the case asserts that fact before expecting the clue-rule failure: 9 of 40 moved by two. The evidence validator is unchanged. |
| RV4-07 | resolved | T11e, T11g, checklist §3.4, D-V4-20 and N-V4-03 agree: authorize data-only activation first, then approve the emitted concrete plan's time. Every activated group has `optional: false`, with origin recorded separately; the default run/approval covers exactly the declared collection. |
| RV4-08 | resolved | The bound-helper wording includes board scanning and journal I/O; T04f limits its tree-independence claim to non-variant edits; P-0 has 8 manifest rows/23 expanded items; receipt assertions use root `blocks`; T09d normalizes valid zero-accepted rows to empty lists without reading `details`. |

## Work rule, authority and scope

IG-P-Q37 is unchanged. The shared primitive checks now reject the unrecorded losses identified in review 4.
The screen upper/no-screen lower comparison still decides pass; the opposite disjoint interval decides worse;
overlap or incomplete evidence is unknown. The completed-unit ratio remains diagnostic. No projection has become
a live-deadline receipt, and no new measurement or allowance is authorized by these corrections.

N-V4-14 can remain a named item under the previous ruling. The corrected bound can be wide, but feasibility was
not promised. Stage-2 width reporting before the freeze remains required. No supervisor or owner question is
raised in this round.

## New findings

Line references are to the reviewed task files unless a code path is given.

| ID | File and section | Severity | Problem | Exact replacement text |
|---|---|---|---|---|
| RV5-01 | T04d step 3 (`:99-100`, `:120-126`) and step 4 (`:148-149`); T04e step 2 (`:51-55`) | major | The revised summary's PM4 block consumes the captured `V4-T04/inputs/instr.ig-tree.json`, whose only specified producer is `summary`. But the standalone `pm4-gate` still says to evaluate that block alone, and T04e runs it after IGP-02 and before the V4-T04 plan that produces the summary. IGP-02 does not create that snapshot. Reusing the specified block literally therefore requires a future input; choosing a different producer is left to the developer. The pure `pm4Verdict` is not the problem: its early caller needs an explicit independent identity source. | Replace T04d step 4 with **R5-01** below and add its focused caller test. Keep T04e's gate between the two plans; do not move it after the measurements it is intended to authorize. |
| RV5-02 | T04b Tests, `items: item ledger`, case (i) (`:145`) | minor | `pairPrimitives` defines the primitive index from zero, but case (i) lowers the first begin's bound and expects index 1. The ledger must still be incomplete either way; only the diagnostic assertion is inconsistent. | Replace case (i)'s message `bound exceeded c 1` with `bound exceeded c 0`. Keep case (m)'s `overlapping begin c 1` unchanged: that is the second begin. |
| RV5-03 | T11d step 4, `stepExpectation` (`:93-96`); T04f step 2 (`:135-136`) | minor | The new expectation says that no tree folder is read, but its four-argument `stepEvidence(T, S, M, isV4)` uses the default `historical: false`, which compares current trees. Immediate receipt/accept execution still works and this fails closed, so it is not an unsafe admission. It is an unnecessary cache dependency inconsistent with the captured-input reader specified here. | In `stepExpectation` only, replace the call with `stepEvidence(T, S, M, isV4, { historical: true })`. Keep the captured-copy/stored-ID equality check and every manifest/log/source check. Keep step 3's fresh `receipt` call and `captureStepInputs` checks unchanged; current-arm comparisons remain the explicit `checkAccepted(..., { current })` responsibility. |

### R5-01: distinguish the early PM4 gate from the historical receipt block

Replace T04d step 4 with:

> **`pm4-gate`** (`node tools\ig-proto\v4-check.mjs pm4-gate --label frozen --source-label <SL>`) is the early,
> read-only PM4 check and does not require the V4-T04 observations or captured inputs. Add the export
> `pm4GateEvidence(instrTreeId, readFile = readRepoFile)`: read and JSON-parse
> `docs/improve-generating/evidence/frozen/IGP-02/pm4.json` and
> `tests/artifacts/ig-proto/frozen/IGP-02/main/screens-all-state.json` (a missing file is `null`), and return
> `pm4Verdict(pm4, screensState, instrTreeId)`. The CLI first verifies `verifySnapshot().ok` and
> `await sourceDigest() === FROZEN_DIGEST`, as for `source`; it obtains the independent expected instr identity
> with `planTree('instr').treeId` using T01a's frozen source routing, without an `errors` option that would suppress
> a failed edit, then calls `pm4GateEvidence(expectedInstrTreeId)`. A snapshot/digest/plan error prevents the gate
> from passing. Do not take the expected ID from the PM4 record itself, and do not read or write `V4-T04/inputs/`
> or a stage-1 receipt in this command.
> Print `pm4-gate: pass` or `pm4-gate: <verdict> (<reasons>)`; exit 0 only for pass.
>
> The later `summary` continues to capture and hash `inputs/instr.ig-tree.json` before writing the historical
> stage-1 receipt and to use that copy for its PM4 block. The early gate does not replace that capture or evidence
> index. T04e's order remains IGP-02, successful PM4 gate, then V4-T04.

Add `proof: the early PM4 gate needs no stage-1 capture`: call `pm4GateEvidence` with the complete, passing
PM4/state fixture from `proof: PM4 block`, a matching independent instr ID and an injected `readFile` that returns
the fixture's JSON only for those two paths and throws for every other path. The result is `pass`, and the reader
is called for exactly the two paths. With a different instr ID the result fails the tree binding; with unfinished
screens it is incomplete. Keep the existing certificate/source/coverage checks. This case must not generate a
real PM4 run or write synthetic data into the real historical evidence namespace.

`planTree` already returns its computed `treeId` and throws on an edit failure without an `errors` array
(`tools/ig-proto/lib/tree.mjs:172-187`, `:270-277`). This is a data-only caller correction, not a new experiment,
new prerequisite measurement or change to the PM4 acceptance rule.

## Completion

The original 14 fixes are verified. Resolve RV5-01 before handing the pack to a developer; RV5-02 and RV5-03 are
mechanical minor corrections. No owner/supervisor decision is needed. The input hashes above are unchanged at
the end of the review, and the output is checked for UTF-8 without BOM, CRLF, no trailing whitespace and a final
newline.

Verdict: changes required

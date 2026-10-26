# Phase 5c — Response to the task-pack review (architect-2)

**Date:** 2026-10-25.
**Review:** `5-review-of-task-pack.md`, findings T5-01 through T5-12.
**Scope:** the eight implementation tasks and their checklist; no production
source, historical design, previous report or Git history was changed.

## Outcome

**Ready for the orchestrator's review and commit before dispatch.**

T5-01 through T5-11 are accepted and implemented. T5-12 is an optional scheduling
optimization, not a correctness defect; its split is not adopted. The plan keeps
eight tasks and six waves, with one RP05 owner and explicit shared-file barriers.
RP07 remains in scope, optional and release-non-blocking in wave5.
No product decision has been reopened.

## Per-finding response

| Finding | Decision | Change and location |
|---|---|---|
| T5-01 — blocker, vendor whitespace | Accepted | RP04, **Vendoring instructions / Runtime encoder**: strip trailing spaces/tabs after line-ending normalization. The five affected upstream lines are 52, 640, 644, 790 and 816. Pin the clean CRLF and LF forms below. The clean module passes the existing checker and all five matrices remain unchanged. |
| T5-02 — major, checkout-dependent hashes | Accepted | RP04, **Runtime encoder**, **Independent test decoder**, and **RP04-T03**: provenance tests normalize CRLF to LF, without trimming or otherwise forgiving content changes. The encoder's LF digest is normative; its CRLF digest is informative. The jsQR LF digest remains the pinned upstream digest. State explicitly that Node22 CI runs all tests, including `slow`. |
| T5-03 — major, hash-parser ownership | Accepted | RP01, **Public exports / Single-owner puzzle-hash parser**, inlined Section5.8 and ownership list: RP01 owns `parsePuzzleHash` in `puzzlecode-input.js`, a pure extraction/normalization module, and the shared `puzzlecode-hashes.json` fixture. RP02, **Route rules**, delegates p-bearing hashes and maps `index` to `invalid-index`, `invalid` to `invalid-hash`; legacy p-absent routes remain unchanged. RP03 documents the inverse code-UI aliases. The already-extracted value goes through `normalizePuzzleCodeValue`, never a second URI decode or nested hash parser. |
| T5-04 — minor, copied creation imperatives | Accepted | RP03 **Browser client** says RP02 created the client and that it is read-only for RP03. RP06 **Preparation API** says RP05 created the snapshot/preparation module and that it is read-only for RP06. |
| T5-05 — minor, external-looking references | Accepted | Before inlined report blocks, the relevant tasks explain that Section n/Dn references are informative references to the final report and that normative task information is inlined. Prototype filenames are replaced by descriptions identifying the design prototype as not in the repository. No implementation requires importing a session artifact. |
| T5-06 — minor, duplicated wire specification | Accepted | RP07 replaces the full bit-level copy with RP01's public DTOs/APIs, codec-only encoding, the sample/hand-authored/243-character parity fixtures, and concrete CLI sink/output tests. RP08 keeps decoder limits, error vocabulary/texts, all positive/negative vectors, QR hashes and oracle facts, explicitly identifying RP01's copy as normative. Checklist Section4 requires a retained-contract diff before either consumer is dispatched. |
| T5-07 — minor, Node-import purity | Accepted | RP05 **Owned helper API** explicitly prohibits import-time document/window/Worker/locale effects in `puzzle-title.js` and `puzzle-snapshot.js`. Page base and client are arguments. A Node import-and-snapshot test is required; RP06/RP07 consume the pure seam. |
| T5-08 — minor, browser environment | Accepted with the orchestrator's exact override | Checklist Section7 is the sole environment definition: the specified Edge executable, `tests\artifacts\edge-<TASKID>\` profiles, HTTP87NN/CDP92NN, native CDP, readiness, owned PID cleanup and profile deletion. Every task refers to that section instead of maintaining a separate launch recipe. The former C: profile fallback and 884x/894x ports are removed. |
| T5-09 — minor, shared working tree | Accepted with the orchestrator's stricter gate | Checklist Sections2, 3 and 7 plus every task test plan distinguish targeted developer checks from whole-tree orchestrator checks. While peers write, use owned tests and owned-file conventions only. After the wave code-ready barrier, the orchestrator runs `npm run check` and `npm test` before per-accepted-task commits. Peer-owned failures are reported, not edited or waived. Documentation-slot ordering explicitly avoids a barrier/lease deadlock. |
| T5-10 — minor, asynchronous task lifetime | Accepted | RP02 **Existing architecture** keeps `current` until the Promise settles, posts one result/error after settlement, and preserves existing synchronous control flow. RP02 owns the `engine.worker.js` comment update only; no unrelated worker-entry rewrite is authorized. |
| T5-11 — minor, RP01 execution size | Accepted | RP01 **Mid-task checkpoint** requires raw codec tests, raw positive/negative vectors, catalogue/frozen-table checks, shared parser fixtures, identity/fingerprint checks, import laziness and scoped conventions after steps1–12. The orchestrator reviews this before steps13–17. RP01b is a conditional recovery option for remaining DEFLATE/correction/property work, not an automatic extra task. RP02 still waits for complete acceptance. |
| T5-12 — optional, split RP05 | Not adopted | Checklist Section4 records the deliberate choice: retain one RP05 and the existing six-wave plan to minimize handoffs and preserve disjoint ownership. The proposed split is not required by a data contract and the review explicitly permits retaining the current plan. RP07 remains optional in wave5 rather than blocking release. |

## Verified QR adaptation

The adaptation was reproduced independently in memory from the previously pinned
upstream source; no vendor file was added to the repository during this phase.

| Representation | Bytes | SHA-256 |
|---|---:|---|
| Clean CRLF adaptation | 46,207 | `c5b15113a4ec416ba65d1a75acd664d74d8f187a081c46bb622590bef2f971c2` |
| Clean LF canonical adaptation | 45,368 | `68453133c5cffbaebe89cdfba48f1bb0918535335bae75adfbdbfde2a8b318f5` |

Both forms pass `checkText`. The five unchanged QR matrix hashes pass for
versions5, 5, 5, 6 and11, with37, 37, 37, 41 and61 data modules respectively.
All five generated matrices were rasterized with the specified quiet zone and
independently decoded by the pinned jsQR to the exact full URL: **5/5 pass**.

The unmodified test-only jsQR `.cjs` payload is outside the repository's authored
text-extension scope. It is checked through its pinned provenance test, not
reformatted to satisfy an ad-hoc `.js` check. Runtime Nayuki `.js` remains inside
the normal convention scope.

## Execution clarifications

- `tools/check-conventions.mjs` has a root-directory CLI, not a file-list flag.
  Checklist Section3 therefore gives an exact Node command using its existing
  `checkText` export on the owned files. This is the same checker, scoped without
  changing tooling or inventing an unsupported option.
- All concurrently running tasks finish exclusively owned code/tests and pause
  writes before the orchestrator's whole-tree gate. A task waiting for the
  documentation lease can be code-ready; that prevents a circular wait.
- The documentation holder completes its living-doc updates, is verified and
  committed, then releases the lease. The next holder is verified on the current
  tree before its own accepted-task commit.
- Developers never switch branches, stage, commit or push. The orchestrator
  commits on `regenerate-puzzle`, not `main`. Pushing/merging to main still
  requires the owner.
- Browser profile and port failures must be reported, not worked around by
  killing unrelated processes or silently selecting an unapproved directory.
- No browser/server was started in this documentation phase. Future physical
  printer/Android/iPhone evidence remains a genuine implementation-release gate.

## Final waves

| Wave | Tasks | Shared-file rule |
|---:|---|---|
| 1 | RP01 + RP04 | Disjoint codec and QR files; serialized living docs |
| 2 | RP02 | Accepted codec required |
| 3 | RP03 | Accepted service/route/controller required |
| 4 | RP05 | Player/Generator integration owned by this task |
| 5 | RP06 + RP07 | App Copy versus CLI files; RP07 optional/non-blocking |
| 6 | RP08 | Integrated acceptance after required owners finish |

## Validation

- Structural/format validation: nine task-pack files; UTF-8 without BOM, CRLF,
  no trailing whitespace, final newline, balanced fences and resolvable links.
- All eight tasks remain within600–1,500 lines and contain the required sections.
  Their execution logs remain empty with all eleven requested fields.
- No obsolete browser ports/profile placeholders, upstream-trailing-space digest,
  prototype filename prerequisite or concurrent developer full-suite command remains.
- Eight RP07 DTO definitions match RP01. Retained QA limits/messages and the
  complete positive/negative/vector/hash/oracle block match RP01.
- Existing `checkText` passes on all nine task documents.
- `npm run check`: **PASS** (`check-conventions: OK`, `check-site: OK`).
- Independent QR verification: **5/5 matrix hashes and 5/5 exact URL decodes**.

An initial validation helper used Windows' default text encoding for a later
comparison and failed on Unicode. It was rerun with explicit UTF-8 and passed;
this was a helper issue, not a task-file encoding defect. Narrow patch-context
mismatches were retried only for unapplied hunks; prior successful edits were
retained. No production implementation or physical test is claimed.

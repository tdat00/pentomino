# SA-Astra: second review of the joint drafts, round 1

Date: 2026-11-23. Reviewed the revised working-tree `report.md`, `plan.md`, `clarifications.md` and
`sa-opus\round-1-draft-response.md`.

**Verdict: two narrowly scoped findings; not yet accept.** The previous seven findings are otherwise applied.
The delegated decisions D-S24-21 to D-S24-24 and the five remaining owner questions stand. No new owner
question or external supervisor question is raised here. These corrections preserve the existing contracts.

## 1. Do not turn fixed plan references into an exception to experimental identity

**Location:** `plan.md` §4.3, the added sentences in “A candidate epoch, then final trees”
(`:137-139`); `sa-opus\round-1-draft-response.md`, addition 2.

The unconditional “a replacement changes their trees and parameter hashes, never their ids” is not acceptable.
It goes beyond the agreed candidate-epoch text and conflicts with **D-V4-05**:
“A variant whose results change for the same parameters gets a new id”
(`tasks\improve-generating-v4\check-list.md:524`).

Parameter refitting and result-changing code fixes are different cases. The compiled references constrain
execution; they do not waive D-V4-05. Moreover the stored recipe versions use the experimental algo ID and
the prior/screen table versions (`tools\ig-proto\variants\v4.json:33-40,61-69`), not the external tree/parameter
hashes. Fresh proof hashes alone do not ensure that an old recipe is refused under changed effective settings.

**Replace the added sentences beginning “The variant ids stay those...” through “never their ids” with:**

> The four reserved names are the references used by the current compiled plans, not an exemption from
> D-V4-05. Before the freeze, a parameter-only refit may retain those names only with a distinctly versioned
> effective configuration, new tree/parameter identities and fresh proof tasks; all earlier observations,
> receipts and bindings remain immutable. A result-changing code edit for the same parameters still requires
> a new variant identity under D-V4-05. Any replay-relevant change must also be distinguishable by the stored
> experimental recipe identity, not merely by hashes held outside that recipe.
>
> If a replacement requires an identity that the existing compiled references cannot express, the current
> task stops for a joint SA ruling under the owner's delegation on the versioned replacement and its
> plan/variant mapping. Do not rerun `compile`, silently rename references, overwrite historical plans or
> reuse an observed task namespace. Any additional measured scope requires the owner's approval.

Keep the accepted candidate-epoch paragraph before this replacement and the final-tree/binding lock after it.
Update response addition 2 to describe this conditional rule, not “never ids”.

This leaves the default path and prices unchanged. It prevents a rare rejected-epoch/code-fix path from
silently overriding an inherited identity decision. It does not pre-authorize a replacement mapping or extra run.

## 2. Make explicit that the 18x18 reporting note is not a gate exemption

**Location:** `plan.md` §6, B2 (`:259`); `sa-opus\round-1-draft-response.md`, addition 1.

The historical note is correct, but appended “completion-passing only” can be read as an exception to the
preceding completion and no-regression requirements. That is not how the binding plan and implemented gate
classify this control:

- `docs\improve-generating\plan.md:641-644` separates the old tail result from completion.
- D-V4-16 (`check-list.md:535`) explicitly uses 18x18 as the example of completion apart from the deadline.
- `manifest.mjs:381-412` includes completion-passing cells regardless of their old response time.
- `verdicts.mjs:1167-1238` applies both control conditions, with no 18x18 exception.

**Replace B2's added parenthesis with:**

> The old 18x18 baseline is described as completion-passing, not as meeting the absolute tail-time target
> (20/20 reached ten; p95 134.5 s). This reporting note does not exempt 18x18 from either control gate above:
> its shipped arm still needs at least 18/20 completions and the one-sided 90% no-regression lower bound
> of at least 0.9. No separate absolute tail-time qualification is inferred for the old baseline.

Keep the rest of B2 unchanged. Update response addition 1 accordingly. No statistics, cell list, threshold
or price changes.

## Verification

These are source-checked guard/wording corrections, not new measurement findings. The updated table values,
the 20-row read gate, the corrected timing-proxy/minimum-cap chain and the owner-only clarification list
otherwise agree with my preceding review.

Only this review file was written. No shared draft, harness, production code, test, historical record or
other architect's file was edited. No git command or engine/timed run was performed.

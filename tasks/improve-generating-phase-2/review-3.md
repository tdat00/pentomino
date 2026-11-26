# Review-2 amendment check

| Item | Value |
|---|---|
| Reviewer / date | SA-Astra / 2026-11-25 |
| Base | `97a6326a5ff149ad27f667c777987fe73df35d07` |
| Scope | Targeted replacement/self-check, amended contracts and task boundaries; not a new whole-pack review |
| Result | The counter is accepted. Two small contract corrections remain before final acceptance. |

## Confirmed

- The saved `p2-review2-check.md` is reproduced by its script after newline normalization: 16 exact block
  replacements, one formatting-only difference, one substantive sentence counter; 11 inline checks and 19
  requested cases present.
- **The R2-04 counter is correct.** `tools/ig-proto/lib/tree.mjs:306-307` calculates `copyDigest` with the copy's
  own `computeSourceDigest`. My description of it as a whole-tree digest was wrong. Accept
  `runtimeDigest === copyDigest` in both receipts, with the separate `filesDigest` covering the whole tree and
  excluding the two metadata files, as C13 now specifies.
- Estimates recomputed: 39 task files, 34 development tasks before measurement, **85.75 developer hours**
  including publication; maximum 3 h; amended dependency model's estimated longest path 24 h. The relocated
  runner and the three tooling splits stay within the existing feature scope.
- The nine locale rows remain identical to the final plan. The 812-minute population/schedule is unchanged.
  The runtime/tests/final-plan diff against the base is empty. No engine measurement or commit was made.

## R3-01: creation checks must not stop subsequent measured invocations

**Evidence.** P2-13e step 2 (`P2-13e-source-and-row-binding.md:113-115`) says `seal --check` "repeats every refusal".
P2-13a's creation refusals include matching HEAD and an entirely clean tracked worktree
(`P2-13a-stage-driver.md:105-109`). P2-18 commits the first ledger; P2-19's first invocation appends to that tracked
ledger. Repeating the whole-worktree cleanliness refusal then prevents the next group, despite unchanged sealed
sources. The "except commit" clause also needs to apply to that refusal, not only to the serialized field.

**Replace P2-13e's `seal --check` paragraph, and clarify P2-13a's corresponding paragraph, with:**

> Creation alone requires the production repository's HEAD to equal `--commit` and its tracked worktree to be
> clean. `seal --check` does not repeat those two creation-only refusals. It preserves the recorded `commit`,
> requires the current Node version to equal `seal.node`, and recomputes/checks the sealed plan, tools, inputs,
> production source digest, copy identity/input/runtime/files digests and frozen snapshot. Changes to files
> outside that sealed inventory, including ledger lines, published observations, readouts and task logs, and
> commits containing only such changes are allowed. A sealed-file change still fails by digest. The today
> worktree's fixed HEAD and cleanliness checks still apply. Output remains `seal: OK` or
> `seal: drift <field> <path or id>` (exit 3).

Add one synthetic P2-13e case using its existing injected git/read adapters: after sealing, change HEAD and dirty
only the excluded ledger; check passes. Then change a sealed source file; check fails. No new task or measurement.

## R3-02: the receipt verifiers need positive success predicates

**Evidence.** P2-13v step 4 rejects known bad item statuses and `margin: 'exceeded'`, but does not require the
positive values `measured` and `ok`. Step 5 similarly rejects known bad browser statuses but does not require
`pass`. Their final "otherwise pass" therefore accepts a missing status, or a missing resource margin, provided
the other supplied fields look successful. This contradicts the exact A4/A5 replacement already in their
authority section. The browser source check also only requires the page; omitted required shipping-source entries
must not qualify.

**Add these requirements to P2-13v steps 4 and 5, before their final classifications:**

> A4 passes an item only when `status === 'measured'`, `margin === 'ok'`, the fixed identity and source binding
> hold, at least one ordinary candidate was replayed, and every replay is matched. An absent/unknown status or
> margin is incomplete, not success; the existing failed-item precedence remains.
>
> A5 passes a check only when `status === 'pass'`, its required C16 source inventory is present and bound, and
> its matching `CHECK-END PASS` seconds are finite, nonnegative and at most 60. An absent/unknown status,
> missing required source, or absent/invalid duration is incomplete. An observed fail/timeout/error, `FAIL`
> reading or reading above 60 still fails.
>
> For the source inventory, import the current `SOURCE_FILES` from `../../bench/report.js` (available at the
> pack base). Require the page, every sealed `tests/browser/` entry whose basename starts with the page's
> basename without extension, every `SOURCE_FILES` entry, and the five explicit generator paths of C16.
> Check their hashes against the seal, along with every additional source entry supplied by the receipt.

Extend the existing two gate tests with missing resource status, missing resource margin, missing browser status,
and omission of `generator/jobs.js` while keeping the page. Each must be incomplete. These are small extensions
to the requested positive admission contract, not new product scope or additional engine tests.

## Verification commands

```powershell
Set-Location -LiteralPath 'Q:\git\pentomino'
node docs\improve-generating-phase-2\evidence\sa-opus\p2-review2-check.mjs
npm run check
git --no-pager diff --exit-code 97a6326 -- core generator player tests tools package.json index.html docs/improve-generating-phase-2/plan.md
```

Final acceptance is withheld only for R3-01 and R3-02; the R2-04 digest correction needs no further change.

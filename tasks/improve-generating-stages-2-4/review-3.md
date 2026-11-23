# SA-Astra: task-pack cross-review, round 3

Base: `57ef5cf`. Reviewed the revised 35-task pack and `review-2-response.md`.

**Verdict: changes requested. Three small remaining findings: two P2, one P3.**

The major fixes are accepted, including the bounded prefix snapshot, its controlled assembly
gate, the independent `instr` constructor and the P7 split. Two evidence-validation details
still do not implement their quoted requirements, and one fixture needs an explicit override.
These are technical corrections within the accepted plan; no owner question or new run is needed.

## Verification and disposition of review 2

**Verified:** 35 distinct tasks, 68 developer hours, every individual developer estimate at most
three hours; all index links resolve and all declared dependencies precede their dependent task.
The new T03b/T03c split and T03d rename agree across the index, dependencies, traceability and
register. No active task refers to either removed filename.

All 14 variant compositions have matching anchors and parse in memory: frozen arms 90 edits,
live test derivatives 91, no-window test 92, `live` 76, `live-test` 77, P7 composites 9/10/13.
The prior file remains correctly pending T06a. No tree was built.

The actual task's `lv-14`, executed with a fake clock and a held promise, returns its supplied
prefix snapshot at 119,000 ms; releasing the original promise at 125,000 ms changes nothing.
The author's separate 18-check pure host-bound check also passes with the frozen source.
The real-client controlled assembly cases are specified, not executed in this read-only review.

The revised estimates remain plausible because the large client edits are supplied literally
and P7's declaration/verdict work is now separate from its commands/bindings. The revision
does not change the counted-run scope, formal prices, grants or owner stops. The higher P7
equality estimates are locked verification, not new timing allocations.

| Earlier finding | Disposition |
|---|---|
| R2-01 input construction | closed: fixed `instr` constructor, identity, catalogue and Hell 1 verification input |
| R2-02 host bound | closed: synchronous prefix snapshot, held-assembly seam, real 46-second reserve oracle |
| R2-03 fitting identity | substantially fixed; the remaining missing/ambiguous identity cases are R3-02 |
| R2-04 P7 validation | protocol, producer and independent corpus fixed; the remaining required-input hole is R3-01 |
| R2-05 executable P7 interfaces | closed: errors/diagnostics and missing-report checks before tree lookup |
| R2-06 live derivatives | closed: parent/edit/file/parameter/deadline identities independently checked; producer fixtures corrected |
| R2-07 fit index and capture | closed: imports, T11 scripts, normalized immutable captures and failure gates |
| R2-08 comparator stop | closed: no unsupported S4C closure; finalization requires the real arm publications and owner authorization |
| R2-09 scope/oracle names | closed; the small post-split corrections below are R3-03 |

## R3-01 (P2): equality binding still permits omission of all three run-observation files

**Locations:** `T03c-p7-probe-bindings-and-commands.md:47-60,69-75,97-99,112`.

Step 1 defines the required inputs as only the nine corpus paths. The positive fixture adds
an arbitrary `x/state.json`, but neither `experiment.json` nor `items.jsonl` is required.
A report containing only those nine corpus entries passes all specified nonempty, required-path
and hash checks. It can therefore claim equality without binding any declaration, state or
item log. The writer normally includes those files, but the independent binding must reject
their omission, as R2-04 explicitly requires.

**Replace step 1 with:**

> 1. **The required inputs of an equality report.** Export the pure helper
>    `equalityEvidencePaths(candidate, tier)`, where `candidate` is the variant-id string. Let
>    `dir = 'tests/artifacts/ig-proto/frozen/V4-P7E-' + candidate + '-' + tier + '/equal'`.
>    Return `[dir + '/experiment.json', dir + '/state.json', dir + '/items.jsonl',
>    ...corpusInputPaths('equal')]`: twelve paths, in that order. The three observation paths
>    are mandatory independently of which entries the supplied report happens to list.

Add `equalityEvidencePaths` to Scope and the README's binding description.

**In step 2, replace the required-input check with:**

> After `the <tier> report binds no input`, examine each `requiredInputs` path in order.
> Zero matching entries gives `the <tier> report does not bind <path>`; more than one gives
> `the <tier> report binds <path> more than once`. Then perform the existing missing/changed
> file-hash checks on every listed input. Each required observation or corpus path must have
> exactly one entry.

**Change the two production call sites:**

- `boundReports`: use `requiredInputs: equalityEvidencePaths(candidate.variant, tier)` after
  resolving the candidate tree reference.
- `report --task V4-P7`: use `requiredInputs: equalityEvidencePaths(c, tier)` for each equality
  binding against the time declaration's trees.

**Change the existing binding test:**

> The clean report has one `{ path, sha256: 'h' }` per
> `equalityEvidencePaths('p7-x', 'quick')`, and no `x/state.json` entry. Its binding uses that
> same required list. The missing-file variant makes `fileHash` return null for
> `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json`; expect
> `the quick report's input tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json is missing`.
> All other existing negative and go cases remain.
>
> Additionally, on separate copies of the clean report:
> - Remove each of the three run-file entries in turn: each binding is false with
>   `the quick report does not bind <that exact path>`.
> - Keep only `corpusInputPaths('equal')`: false, first missing
>   `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/experiment.json`.
> - Duplicate the canonical `state.json` entry: false with
>   `the quick report binds tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json more than once`.

No experiment format, corpus size, go threshold or timed scope changes.

## R3-02 (P2): two absent producer identities compare equal; duplicate raw identities are silently selected

**Location:** `T02c-fit-reader-commands.md:111-127`, its prefixes fixture and Tests.

The new helper compares `tree?.treeId` with `shard.treeId`, the two copy digests, and the two
producer hashes without requiring any of those fields. With a valid row/shard tuple,
`shard.variant: 'v'`, absent identity fields on both sides and
`meta: { trees: { v: {} }, harness: {} }`, all three comparisons are
`undefined === undefined`; the specified identity problem list is empty.

The row/header checks likewise do not require a unique match. Selecting a matching first
entry accepts a duplicate shard declaration or a second, conflicting row header. These are
missing or ambiguous evidence, not a clear fitting row under T11's read gate.

**Replace step 5 with:**

> 5. `export function rawIdentityProblems({ task, arm, declared, shard, rowLines, meta })`
>    (pure): return the following problems in this order; never throw for malformed identity
>    input. A "record" is a non-null, non-array object; a "nonempty string" has type `string`
>    and `trim().length > 0`.
>    - When `shard` is null, return only `no shard declaration`. When it is not a record,
>      its format is not `ig-proto-shard`, its version is not 1, or its `rows` is not an array
>      of records, return only `the shard declaration is malformed`.
>    - Unless the shard's task, arm and shard match `task`, `arm` and `declared.shard`, add
>      `the shard declaration is of <shard.task>/<shard.arm>/<shard.shard>`.
>    - For `variant`, `treeId`, `copyDigest`, `harnessHash`, in that order, require a nonempty
>      string; otherwise add `the shard's <field> is missing or malformed`.
>    - Filter `shard.rows` for `key === declared.rowKey`. With zero entries, add
>      `the shard does not declare <rowKey>`; with more than one, add
>      `the shard declares <rowKey> more than once`. Only with exactly one, compare its
>      `caseId`, `rep`, `seed` with the declared tuple and, when unequal, add
>      `the shard declares <rowKey> as <caseId>/<rep>/<seed>`.
>    - With null `rowLines`, add `no row identity`. With a non-array or a member that is not
>      a record, add `the row identity is malformed`. Otherwise filter the lines for
>      `t === 'row'`: zero gives `no row identity`; more than one gives
>      `the row identity appears more than once`. Only with exactly one, compare `row`,
>      `caseId`, `seed` with the declared `rowKey`, `caseId`, `seed`; when unequal, add
>      `the row identity names <row>/<caseId>/<seed>`.
>    - With null `meta`, add `no publication metadata` and finish. With metadata that is
>      not a record, add `the publication metadata is malformed` and finish.
>      Let `tree` be `meta.trees[shard.variant]` only when `meta.trees` is a record and
>      `shard.variant` is a nonempty string, otherwise undefined.
>    - Require a record `tree` with a nonempty `treeId`, otherwise add
>      `the publication's tree identity is missing or malformed`. If both its `treeId`
>      and the shard's are nonempty strings, compare them; unequal gives
>      `the publication's tree <tree.treeId> is not the shard's <shard.treeId>`.
>    - Require a record `tree` with a nonempty `copyDigest`, otherwise add
>      `the publication's copy identity is missing or malformed`. If both its `copyDigest`
>      and the shard's are nonempty strings, compare them; unequal gives
>      `the publication's copy <tree.copyDigest> is not the shard's <shard.copyDigest>`.
>    - Require a record `meta.harness` with a nonempty `harnessHash`, otherwise add
>      `the publication's producer identity is missing or malformed`. If both its hash
>      and the shard's are nonempty strings, compare them; unequal gives
>      `the publication's producer <meta.harness.harnessHash> is not the shard's <shard.harnessHash>`.
>    Keep these identity problems separate from ledger and parse problems as step 4 specifies.

**Append these scenarios to the existing prefixes case, each on its own clean fixture:**

| Input change | Expected identity (ledger fields and `problems` unchanged) |
|---|---|
| Remove `treeId`, `copyDigest`, `harnessHash` from `shard.json`, remove `treeId` and `copyDigest` from the publication's `meta.trees.v`, and remove `harnessHash` from `meta.harness` | Every row: `["the shard's treeId is missing or malformed", "the shard's copyDigest is missing or malformed", "the shard's harnessHash is missing or malformed", "the publication's tree identity is missing or malformed", "the publication's copy identity is missing or malformed", "the publication's producer identity is missing or malformed"]`; `summary.identityRows` 5 |
| Set both the shard's and publication's `harnessHash` to `''` | Every row: `["the shard's harnessHash is missing or malformed", "the publication's producer identity is missing or malformed"]`; `summary.identityRows` 5 |
| Append a duplicate of `x~0`'s entry to `shard.rows` | Only `x~0`: `['the shard declares x~0 more than once']`; `summary.identityRows` 1 |
| Append a duplicate of the row header to `logs/x~0.row.jsonl` | Only `x~0`: `['the row identity appears more than once']`; `summary.identityRows` 1 |

The original clean, mismatched-producer and missing-file expectations remain unchanged.

## R3-03 (P3): explicitly override the timing fixture's task and finish one post-split reference

**Locations:** `T03b-p7-probe-declaration-and-verdicts.md:184`;
`T06b-budget-by-mode-and-per-set-levels.md:109`.

The time fixture inherits `p7Run`'s equality task, but only names command/step/tier/rounds
overrides. Its expected task is `V4-P7`. Taken literally, the new `runProblems` rejects this
positive fixture instead of returning `measured`.

**In the timing test row, replace:**

> `kind: 'p7-time'`, `payload: { otherTree: 't', inputTree: 'ti' }`, the declaration as
> `p7Run`'s with `command: 'time'`, `step: 'time-p7-x'`

**with:**

> `kind: 'p7-time'`, `variant: 'p7-x'`, `payload: { otherTree: 't', inputTree: 'ti' }`,
> the declaration as `p7Run`'s with `task: 'V4-P7'`, `command: 'time'`,
> `step: 'time-p7-x'`

Add immediately before the Tests table:

> The timing fixture rebuilds `state.identity.manifestHash` from its 90 runtime items and
> every start/end line's `identityHash` from that state, just as `p7Run` does for its equality
> items. It does not retain the equality declaration's task or item hash.

**In T06b step 4, replace**
`(after the last case, which is T03a's at this point)` **with**
`(at the end, after T03d's memory case)`.

## Evidence and limits

**Verified, unlocked, at the repository root:**

```powershell
node --experimental-vm-modules --no-warnings docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review3-checks.mjs --label frozen
node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-bound.mjs --label frozen
npm run check
```

- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review3-checks.mjs`
  and `.json`: index/dependencies, literal variant anchors and syntax, actual controller
  under a fake clock, the two specification witnesses, and reviewed task/source hashes.
- `docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review3-validation.txt`:
  the commands' output and format/input-stability checks.
- Source contracts rechecked: `tools\ig-proto\arm.mjs:116-120` (shard identity);
  `tools\ig-proto\lib\items.mjs:123-186` (the real pure resume validator).

The missing-identity and corpus-only witnesses execute translations of the task's enumerated
predicates, explicitly labelled as specification witnesses. The future `fit-read.mjs` and
`p7-probe.mjs` do not yet exist; this is not a claim that those future tools were run.
No rating, search, generation, replay, tree build, locked/timed command or git command ran.
No production, harness, tests, historical evidence or author-owned artifact was edited.

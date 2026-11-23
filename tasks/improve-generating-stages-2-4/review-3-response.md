# SA-Opus: response to SA-Astra's task-pack review, round 3

Base: `57ef5cf`. Review: `review-3.md` (2 P2, 1 P3). **All three findings applied, verbatim where the review gives
exact text; none rejected.** No finding changes an allowance, a scope, an owner decision, a plan v4 point or a price:
no owner or supervisor question. No engine, tree, timed, locked or git command ran.

## Dispositions

| Finding | Disposition | Where |
|---|---|---|
| R3-01 (P2) the equality binding must require the run's declaration, state and log | applied | T03c steps 1, 2 and 4 (`boundReports`, `report --task V4-P7`), Scope, Tests, Documentation; consequential edits below |
| R3-02 (P2) absent or duplicate raw identities | applied | T02c step 5 (replaced), the prefixes case (scenarios (10) to (13)); consequential edits below |
| R3-03 (P3) the timing fixture's task; T06b's post-split reference | applied | T03b, the timing row and the paragraph before the Tests table; T06b step 4 |

### R3-01

- **Step 1** is the review's text, verbatim: the pure helper `equalityEvidencePaths(candidate, tier)` returns the twelve
  paths `tests/artifacts/ig-proto/frozen/V4-P7E-<candidate>-<tier>/equal/experiment.json`, `.../state.json`,
  `.../items.jsonl`, then `corpusInputPaths('equal')`. I added one explanatory sentence: what `corpusInputPaths('equal')`
  is, and that `dir` equals `rel(artifactDir('frozen', <task>, 'equal'))`. This is the folder whose files `readRun`
  lists (`lib/paths.mjs:35,57-60`, `lib/items.mjs:195-198`), so the report's `run.inputs` and the required paths are
  the same strings.
- **Step 2**: the required-input check is the review's text, verbatim. After `binds no input`, each required path is
  checked in order: zero entries means `does not bind`, more than one means `binds <path> more than once`. The two
  existing hash checks follow on every listed input, with their texts kept so that "the existing" checks stay defined.
- **The call sites**: `boundReports` uses `requiredInputs: equalityEvidencePaths(candidate.variant, tier)` after the
  candidate's tree reference is resolved, and `report --task V4-P7` uses `equalityEvidencePaths(c, tier)`. No
  `requiredInputs: corpusInputPaths('equal')` is left.
- **The bindings case**:
  - The clean report has one `{ path, sha256: 'h' }` per `equalityEvidencePaths('p7-x', 'quick')` path and no
    `x/state.json` entry, and it is bound with that same list.
  - The missing-file variant names the canonical `state.json`.
  - These variants are added: the three run-file entries removed in turn, the corpus-only report, and the duplicated
    `state.json` entry. Their expected texts are the review's.
  - All other negative and go cases are unchanged.
  - I added one direct expectation: the twelve paths of `equalityEvidencePaths('p7-x', 'quick')`, in order. This pins
    the helper's own contract and costs one line.
- **Scope and README**:
  - Scope lists `equalityEvidencePaths` among the exports.
  - The README's binding description gives the twelve required paths, each exactly once whatever the report lists,
    then the hash of every listed input.
- **Consequential edits**:
  - T03c: the Goal; an Authority note quoting R3-01; T03c-B01 (the bound inputs); T03c-T01 (`equalityEvidencePaths`).
  - check-list: D-P24-05 (every binding requires the run's three files and the nine corpus inputs, each exactly once;
    source review 3 R3-01) and the traceability of §6 T6.
- **Estimate**: T03c goes from 2.5 h to **3 h**. It gains:
  - a new export;
  - a stricter binding;
  - two changed call sites;
  - six new expectations in the bindings case;
  - the README text.

  That is about 25 minutes of work.
- Not changed: T05b's plan step `bind-<c>` `consumes` the two reports as before. The binding itself reads and hashes
  the six raw files at run time, and the plan's dataflow is unaffected. The run order of T03d, T04, T05a and T05b
  (each equality loop stops at `done`, then `report`, then `bind`) never re-invokes a done step after its report.
  This matters because `runItems` rewrites `state.json` on every invocation (`lib/items.mjs:256-257`), so a later
  re-invocation would make the binding refuse with `changed`. That refusal is the intended outcome.

### R3-02

- **Step 5** is the review's text, verbatim:
  - records and nonempty strings are defined, and the function never throws on malformed identity input;
  - a null shard gives `no shard declaration` only, and a malformed shard gives `the shard declaration is malformed`
    only;
  - the four shard fields `variant`, `treeId`, `copyDigest` and `harnessHash` are required;
  - exactly one matching shard entry and exactly one row header are required;
  - the publication's tree, copy and producer identities are required, and they are compared only when both sides
    are nonempty strings.

  The closing sentence (identity problems kept apart from ledger and parse problems) is a paragraph of item 5.
- **The prefixes case**: the four scenarios of the review's table are appended as (10) to (13), each on its own clean
  fixture, with the review's exact expected lists and `summary.identityRows` 5, 5, 1 and 1. For (12) and (13) I wrote
  out that every other row's `identity` is `[]`, which is what "only `x~0`" means. The closing clause now covers (5)
  to (13): the ledger fields and `problems` stay as in the clean run. The clean, mismatched-producer (8) and
  missing-file (7), (9) expectations are unchanged, and the new step yields them unchanged (witness below).
- **Consequential edits**:
  - T02c: an Authority note quoting R3-02, and the README description of step 5 (every identity field required, every
    matching shard entry and row header unique).
  - check-list: D-P24-07 (the same words; source review 3 R3-02).
- **Estimate**: T02c stays at **3 h**, the pack's bound.
  - The new step 5 replaces the function that the task already wrote with its stricter form.
  - The four scenarios reuse the case's per-scenario fixture helper.
  - That adds about 20 minutes, which I take as inside "about 3 h".
  - A split would separate the identity check from the only command that uses it. I considered it and rejected it.

### R3-03

- T03b, the timing row: the review's replacement, verbatim. The time items carry `variant: 'p7-x'` and the declaration
  carries `task: 'V4-P7'`. Otherwise `runProblems`' first check (`the declaration is not <task>/<step> of ...`) would
  make the positive fixture `incomplete`.
- T03b, immediately before the Tests table: the review's paragraph, verbatim. The timing fixture rebuilds
  `state.identity.manifestHash` from its 90 runtime items and every line's `identityHash`, and it does not retain the
  equality declaration's task or item hash.
- T06b step 4: `(after the last case, which is T03a's at this point)` became `(at the end, after T03d's memory case)`.
  The tasks that append to `v4Cases`, in index order, are T03a, T03d, T06b, T07a, T07b, T07c, T08a and T08c. T03d is
  the last before T06b (witness below).

## Index changes

- 35 tasks, unchanged.
- Developer hours: 68 → **68.5**, because T03c goes from 2.5 h to 3 h.
- Every task stays at 3 h or less.
- Order, dependencies, machine minutes, the owner stops and the counted-run scope are unchanged.

SA-Astra's `bt-review3-checks.mjs` asserts 68 hours, so it now stops at `hours differ` until its total is updated to
68.5.

## Verification (unlocked, at the repository root)

| Command | Result |
|---|---|
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-r3-witness.mjs` | `bt-r3-witness: 63 checks, 0 failed; v4Cases appenders T03a, T03d, T06b, T07a, T07b, T07c, T08a, T08c` |
| the index check (inline Node script, the one of review 2) | 35 tasks, 35 files and rows, sum of the task files' estimates 68.5 = the index total, maximum 3, no mismatched hours, no broken link |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-variants.mjs --label frozen` | `bt-variants: 11 manifests, every check passed` (edit counts unchanged: `live` 76, `live-test` 77, frozen arms 90, twins 91, no-window 92) |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-bound.mjs --label frozen` | `bt-bound: every check passed` |
| `node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-conventions.mjs` | 0 problems |
| `npm run check` | `check-conventions: OK`, `check-site: OK` |

What `bt-r3-witness.mjs` checks:

- **It translates the revised texts into pure functions.** These are T03c's `equalityEvidencePaths` and
  `equalityBinding` and T02c's `rawIdentityProblems`. It runs every row of the bindings case and the prefixes
  scenarios (7) to (13) on the fixture of T02c's Tests. Every result equals the expected value, and every expected text
  appears verbatim in the task.
- **It shows the two holes of the previous texts:**
  - the old required list lets the corpus-only report bind;
  - the old step 5 returns no problem when the three identities are absent on both sides.
- **It checks the call sites, the timing fixture's task, T06b's text and the `v4Cases` order.**

These are specification witnesses, not runs of the future `p7-probe.mjs` or `fit-read.mjs`.

## Files changed

- `tasks/improve-generating-stages-2-4/T03c-p7-probe-bindings-and-commands.md` (R3-01; estimate 3 h)
- `tasks/improve-generating-stages-2-4/T02c-fit-reader-commands.md` (R3-02)
- `tasks/improve-generating-stages-2-4/T03b-p7-probe-declaration-and-verdicts.md` (R3-03)
- `tasks/improve-generating-stages-2-4/T06b-budget-by-mode-and-per-set-levels.md` (R3-03)
- `tasks/improve-generating-stages-2-4/check-list.md` (the T03c row and the total, D-P24-05, D-P24-07, the traceability
  of §6 T6)
- `tasks/improve-generating-stages-2-4/review-3-response.md` (this file)
- `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-r3-witness.mjs` (new)

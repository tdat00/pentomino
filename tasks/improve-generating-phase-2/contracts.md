# Phase-2 measurement contracts (pack author, frozen before lane T starts)

| Item | Value |
|---|---|
| Feature | `improve-generating-phase-2` |
| Purpose | The record formats that the producers and the readers of the measurement tooling share. Review-1 R3 to R6 and R15 require them to be frozen before the tooling lane starts. |
| Producers | P2-06 and P2-12a (production results); P2-12b (the proof runner); P2-12d (the copies' trace layer); P2-13a, P2-13d and P2-13e (the driver and the seal); P2-14b (the replay-probe receipt); P2-16e (the browser receipts) |
| Readers | P2-13r (the trace reader); P2-13v (the binding verifiers); P2-13e (resume and publication); P2-13b (the comparator); P2-13c (P5 and the twins); P2-13f (N-V4-16 and reach) |
| Rule | A field not listed here is not read. A missing required field makes the record **incomplete**, never zero. Changing a format is a pack-author ruling. |

`E` means `docs/improve-generating-phase-2/evidence/`. `RAW` means `tests/artifacts/ig-proto/phase2/` of the main
worktree.

## C1. The worker journal (one file per worker thread)

- **File and identity.** The file is `<IG_LOG_DIR>/<IG_ROW>.<pid>.<threadId>.jsonl`. Each line is one JSON object,
  appended with `appendFileSync`. Nothing is written without `IG_LOG_DIR`.
  - A call id is `<IG_ROW>:<pid>:<threadId>:<sequence>`; `sequence` counts the calls of that thread from 1.
- **Format.** It is the format that `rowLedger(lines, linkLines)` of `tools/ig-proto/verdicts.mjs` (lines 696-850)
  reads, unchanged. The phase-2 additions are marked "added".

| `t` | Fields | Written |
|---|---|---|
| `worker` (added) | `pid`, `threadId`, `at` | the first line of every destination file (the worker header below) |
| `start` | `call`; `stage` (`'set'`, `'batch'` or `'completion'`); `attempt`, see below; `level` (target id); `A` (active cells); `at` (ms since the epoch) | at the dispatcher `selectClues(ctx)`, before the selector runs |
| `caps` | `call`, `count: true` | once, right after `start` |
| `begin` | `call`, `kind` (`'rate'`: a canonical rating through `rate`, `rateDetailed` or `rateLean`; `'screen'`: a `rateWithLimits` rating; `'count'`: a uniqueness count), `bound` (the proved upper bound in units, a finite number from 0: the frozen `igRatingBound` of `ig-select-v4.js:257-278` for a rating, at the rating's own work limit; the count's row limit for a count) | before every rating and every uniqueness count |
| `p` | `call`, `i` (rating index from 0), `tuple: [phase, count, outcome, score, mainWork, censusWork]` | after a rating returns or throws. `phase` is `'call'` (the dispatcher level does not see phases); `count` is the clue count; `outcome` is `'rated'`, `'capped'` (an `IncompleteRatingError`) or `'error'` (any other throw; `pairPrimitives` then reports it unquantified, which makes the row incomplete); `score` is a number or `null`. `mainWork + censusWork` are the units the rating consumed: `metrics.work - metrics.censusWork` and `metrics.censusWork` for a rating; `error.counters.work` and `0` for an `IncompleteRatingError`; `0` and `0` for `'error'`. |
| `count` | `call`, `units` | after a uniqueness count returns; its consumed units |
| `phase` | `call`, `phase: 'p2'`, `at` | when the `gen-v4` selector reaches phase C with no rated subset: a dead end, which `deadEnds` and `cellGate('failing', ...)` of `verdicts.mjs` count |
| `rerate` (added) | `call`, `phase` (`'close'`, `'rescue'` or `'rerate'`), `at` | when a re-rating of the `gen-v4` selector starts |
| `end` | `call`; `result` (`'ok'`, the failure `reason`, or `'error'`); `work` (the sum of the call's `p` units); `profiles` (the number of `p` lines); `locate: { countWork }` (the sum of `count` units); added: `igNoWindow` (the selector's raw value, `'below'`, `'above'` or `null`), `budgetStop` (`true` when the raw result's `counters.budgetStops > 0`, else `false`), `clueCount` (a number or `null`); `at` | after the selector returns or throws, before the dispatcher returns |

- **The worker header (review-2 R2-02).** Ensure a worker header once per absolute destination filename, before its
  first non-header line. Also call this ensure operation at module load when logging is enabled, so a loaded but unused
  worker has a journal. A later change of `IG_LOG_DIR` or `IG_ROW` creates a new destination with its own first header.
  Nothing is written without `IG_LOG_DIR`; sequence numbering remains per thread.
- **`start.attempt`**, by stage:
  - a set attempt: its attempt number;
  - a batch candidate: the text `<slot>/<attempt>`;
  - a completion candidate: `c/` followed by its layout key.

  It comes from `ctx.igStage` and `ctx.igAttempt`, which the copies' `generate.js` adds to the three `selectClues({`
  contexts (P2-12d). A call without them is `stage: 'other'`, and `rowLedger` reports it as unattributed.
- **The raw outcome.** The `end` line keeps the raw outcome, independently of `failureOf` and of every client-side
  translation. N-V4-16 reads it there (C11).

## C2. The link journal (one file per row, parent side)

`<IG_LOG_DIR>/<IG_ROW>.link.jsonl`, written by the frozen `tools/ig-proto/variants/files/link/core/browser/ig-link.js`,
which the copies use unchanged.

- **Its lines** (`t: 'link'`, `ev`):
  - `start`;
  - per candidate task: `dispatch`, `await`, `complete` (`slot`, `attempt`, `ok`, `outcome`) and `consume`;
  - per batch: `calibration`, `discard` and `end`;
  - `set-complete` (`attempt`, `outcome`) for every set attempt that returned;
  - `completion-dispatch` and `completion-complete` (`index`, `key`, `valueKey`, `outcome`);
  - `worker-end-request`, `worker-end` (`pid`, `threadId`, `at`) and `worker-end-failed`.
- **The hooks.** The copies install the frozen link edits `link-2` to `link-15` and `link-17` of
  `tools/ig-proto/variants/link.json`, verbatim (P2-12d).
- **Pre-selection outcomes** need no call (`rowLedger`'s `PRE_SELECTION`):
  - `carve` and `internal` for a set attempt;
  - `layout` for a candidate.

## C3. The row line

`<IG_LOG_DIR>/<IG_ROW>.row.jsonl`: `{ t: 'row', row, seed, caseId, localRep, pid }`, written by the frozen `log-8`
edit of `tools/calibrate.mjs` (verbatim in the copies). `IG_SEED` must equal the row's seed, or the child throws.

## C4. The row receipt (parent side, written by the driver)

`RAW/raw/<fileKey>/receipt.json` has these fields:

- `key`, `fileKey`, `stage`, `group`, `invocation` (the ledger line id);
- `sealSha256`: the active seal (C13; added by P2-13e);
- `variant`, `copy: { treeId, copyDigest }`;
- `report: { path, sha256 }`, with `path` relative to `RAW` and `/`-separated (`raw/<fileKey>/report.json`), or `null`;
- `journal: [{ name, bytes, sha256 }]`, every file of `journal/` in name order;
- `childExit`, `startedAt`, `endedAt`.

It is written after the child returns, killed included. A missing receipt means the row is `interrupted` (C5).

## C5. Row records (the driver)

- **The status journal.** `RAW/rows/<stage>.status.jsonl` gets one line per transition, appended before the next action:
  - `{ t: 'start', key, group, invocation, sealSha256, at }`, durable before the child starts;
  - then exactly one of `{ t: 'done', key, sealSha256, at }` or `{ t: 'interrupted', key, cause, sealSha256, at }`.

  P2-13d writes these lines; P2-13e adds `sealSha256` (C13) to them, to the row line and to the receipt (C4).
- **The row line.** `RAW/rows/<stage>.jsonl` gets one line per finished row:
  `{ key, fileKey, stage, group, component, arm, variant, cell, rep, seed, uniqueness, sealSha256, run, telemetry, receipt, ledger }`.
  - `run` is the report's one generation run.
  - `telemetry` is `run.telemetry` (C6).
  - `receipt` is `RAW/raw/<fileKey>/receipt.json`'s sha256.
  - `ledger` is P2-13r's complete `rowWork` result (C9), with `outcomes` and `rerateStarts`.
- **The binding (review-2 R2-04, verbatim).** "Before resume, skip, publication or statistical use, require the row's
  seal identity to equal the active seal. A foreign epoch is refused, never reused or relabelled. Verify the row's
  `receipt` SHA-256, the receipt's report and journal hashes, and the receipt key/variant/copy identity against the
  sealed plan. Require the sole generation run's `caseId`, `seed`, uniqueness and request quantity to match the row;
  its `sourceDigest` equals the sealed copy's `runtimeDigest`, and its source label equals the declared
  `${variant} ${seal.commit}`. The published `run` must deep-equal that extracted raw generation run.

  Resume uses these same checks, not file existence alone. A started row with absent or mismatched evidence becomes
  interrupted with the specific cause and is never rerun silently. Any bad binding found when reading a published
  observation makes the affected endpoint incomplete; no ratio is qualified from it. Use one verifier from the
  driver/report path, not separate inconsistent implementations."
  - The one verifier is `verifyRow` of `tools/ig-proto/phase2/binding.mjs` (P2-13v). The source label is the run's
    `sourceCommit`, which the copies' `meta-1` edit sets from `IG_SOURCE_LABEL`; uniqueness and the quantity 10 are
    fixed by the report's `meta.matrixDigest`, the `matrixDigest` of the row's matrix (P2-13v's `rowMatrix`).
  - A skip of a terminal key checks its seal identity; resume, publication and statistical use run `verifyRow` in full.
- **Resume.** A key with a `start` line and no terminal line is never run again; an `interrupted` row is missing
  evidence.
  - P2-13d: it becomes `done` when `report.json` and `receipt.json` both exist and the report holds one generation run;
    otherwise `interrupted` with `cause: 'no-report'`.
  - P2-13e replaces that existence check with `verifyRow`: `done` when it passes, otherwise `interrupted` with its first
    problem as the `cause`.

## C6. Production telemetry in a bench row (P2-06, P2-12a)

`run.telemetry = { setCounters, batchCounters, trail }`:

- `setCounters` and `batchCounters`: `{ budgetStops, screenCapped, rescueReratings, tailReratings }`, or `null`.
- `trail`: `{ attempts: [{ attempt, outcome, reason, arrival }], sameSide, boundFired, noWindow: { below, above } }`.
  - `attempts` holds attempts 0 to 3 only.
  - `noWindow` counts every settled set attempt of the request with a no-window reason, all attempts included.

## C7. The ledger (P2-13a)

- **The file.** `E/ledger/ledger.jsonl` gets one line per locked invocation, never rewritten:
  `{ id, stage, group | item, start, end, nodeSeconds, quietS, countedSeconds, limitS, killed, exit, rowsWritten, cause, sealSha256 }`.
  - `cause` is `'ok'`, `'exit'` or `'timeout'`.
  - **`rowsWritten`** (review-2 R2-06, verbatim): "Count terminal keys whose unique durable C5 start names this
    invocation, joining by key within the same seal and stage. Never filter terminal records for an undeclared
    invocation field. Recovered terminals retain the original start association; they do not represent another engine
    invocation or change an old duration line." `ledger --append` counts it itself; the caller passes 0.
  - **`sealSha256`**: the active seal (C13), which `ledger --append` adds itself (P2-13e).
- **The reservation.** `RAW/pending.json` holds `{ id, stage, group | item, limitS, at, sealSha256 }`, created with
  `CreateNew` (`sealSha256` from P2-13e on). It is removed only after its ledger line is durable.
- **The stage map** is sealed in `seal.json` and is not a parameter: `{ A: 410, B: 402 }` counted minutes.

## C8. Snapshots (write-once publications)

`p2.mjs publish --stage <S> --rows <source> --out <dir>` writes three files:

- `<dir>/<S>.jsonl` (CRLF);
- `<dir>/<S>.md` (row counts per component, arm and cell);
- `<dir>/<S>.sha256` (the jsonl's SHA-256).

An existing `<dir>/<S>.jsonl` with other bytes is refused. The fixed directories are:

| Snapshot | Directory |
|---|---|
| P2-18's first group | `E/rows-smoke/` |
| Stage A complete | `E/rows/` |
| Stage B before the twins | `E/rows-before-twins/` |
| Stage B final | `E/rows/` |
| A stopped or partial stage | `E/rows-partial/<S>-<n>/`, `n` from 1 |

A report binds the snapshot's `.sha256`.

## C9. The row work (P2-13r)

`rowWork(dir)` returns `rowLedger(workerLines, linkLines)` of `verdicts.mjs` and these added checks, each a problem
that makes `complete` false:

- every `unparseable line` problem of `parseLines`;
- `no row line` and `row line mismatch` (C3);
- `empty evidence`: no `start` line although the row's run accepted at least one puzzle;
- `missing worker journal <pid>/<threadId>`: a `worker-end` link line names a worker whose journal file
  `<row>.<pid>.<threadId>.jsonl` is absent or does not begin with its `worker` line (C1). The trace writes that header
  first in every destination file, and at module load, so a worker that ran no selection call still has its file.
- `foreign file <name>`: a file of the folder that is neither the row line, the link journal nor a worker journal of
  this row.

The output fields are `complete`, `problems`, `calls`, `ended`, `terminated`, `open`, `lo`, `hi`, `ratingWork` and
`countWork`. They are exactly the `ledger` input that `workRule` and `classVerdict` of `verdicts.mjs` read. One more
field, `outcomes`, lists every ended call in journal order as `{ stage, attempt, result, igNoWindow, budgetStop }`
(from its `start` and `end` lines); P2-13c (the trigger) and P2-13f (N-V4-16) read it (C11). A last field,
`rerateStarts`, counts the `rerate` lines by phase as `{ close, rescue, rerate }`; P2-13f reads it (F7).

**Storage (review-2 R2-01, verbatim).** "Persist the complete C9 result, including `outcomes` and `rerateStarts`, in
C5. Use `workLedger(ledger)` only when constructing the input to the frozen statistical functions; never when storing
or publishing the row." P2-13c reads `outcomes`, and P2-13f reads both; their absence is unknown, never zero.

## C10. Activation of the conditional twins (P2-13c)

- **The receipt.** `E/twins/activation.json` is write-once:
  `{ planSha256, sealSha256, inputs: { A, Bbounded, frozen: [{ path, sha256 }], readings: { path, sha256 } }, predicateVersion: 'p2-twins-v1', eligible: 440, required: [rowKey], slots: { '<open slot key>': <rowKey or null> }, inactive: [slot key], overflow: { keys: [rowKey], groups: [[rowKey]], repriceCountedS, repriceGuardS } }`.
  - `plan.json` never changes.
  - `run-group` resolves an open slot through this receipt, after checking its `planSha256` and `sealSha256`.
- **Unused slots.** An inactive slot is not an observation and does not make a report incomplete.
- **Overflow.** More than 15 required twins puts the rest in `overflow`, three twins per group (the 885-s horizon at
  260 s each). Their groups run as `run-group.ps1 -Stage B -OverflowGroup <n>` only when the ledger admits them;
  otherwise the endpoint is `incomplete`.
- **The reprice (review-2 R2-06, verbatim).** "`repriceCountedS = sum over overflow groups of (2 + 260 * group.length + 45)`.
  Give its separate guard projection as `1.25 * repriceCountedS`; the ledger still admits at the enforced invocation
  limit, never at the price estimate. For four groups of three twins, counted is **3,308 s**, guard is **4,135 s**.
  Keep the pending fixed groups in the continuation quote." The receipt's `repriceGuardS` is that guard projection.

## C11. The P5 trigger, coverage and N-V4-16 (P2-13c, P2-13f; R6)

- **The eligible rows.** The 360 original shipped `gen-v4` rows and the 80 sentinel `gen-v4` rows, 440 in all: 140
  eligible bounded rows in A and 300 in B (P2-13c step 3).
- **The trigger.** A row is triggered when any of these holds, on production or historical evidence:
  - fewer than ten accepted puzzles;
  - any set attempt ended with a no-window outcome, at any attempt index: a C1 `end` line of stage `set` with
    `igNoWindow` not `null`, or C6 `trail.noWindow.below + above > 0`;
  - the bound fired (`trail.boundFired`, or a public set reason `no-window-below` or `no-window-above`);
  - any call budget stop (a C1 `end` line with `budgetStop: true`, or `setCounters` or `batchCounters` with
    `budgetStops > 0`);
  - any clock cut: a set reason `time-limit`, `reserve-cut` or `response-bound` (written `set:` before the name in
    reports), or a batch reason `time-limit` or `response-bound`.
- **Historical rows** (V4-S4, V4-S4C) use their signed F2 and F4 reach readings. Each binds the SHA-256 of its exact
  published dataset.
- **Historical applicability and coverage (review-2 R2-01, verbatim; P2-13c).** "A row in the original validation cells
  requires its declared frozen counterpart and the bound F2/F4 readings. A missing required counterpart or reading is
  unknown. A `non-table` sentinel has no historical counterpart by design: its historical side is `not-applicable`, and
  its trigger is evaluated on production alone.

  Classify coverage only after validating the bounded observation and, when present, the twin against the sealed source
  and receipt bindings. A row line alone is not a valid measured pair. Unknown required evidence, or an invalid,
  erroneous, censored or interrupted required observation, is `unresolved` and cannot become an analytical zero.
  Otherwise a valid measured twin gives `observed-pair`. A triggered row without its required valid twin is
  `unresolved`. Only a fully settled, untriggered row without a measured twin is `analytic-only`: reached ten implies
  zero lost completion; no set-bound reason implies zero false stops. Count the two endpoints separately, without
  mixing observed pairs and analytical zeros."
- **N-V4-16 (review-2 R2-02, verbatim; P2-13f).** "Derive a natural same-side match from the raw ended set calls for
  attempts 0, 1, 2 and 3: all four must exist and have the same non-null `igNoWindow` side. A known pre-selection
  failure is not a no-window end. Keep raw-match count, client `sameSide` count, bound firings and public
  `set:no-window-*` count as separate columns. A disagreement is evidence, not zero reach.

  Join each raw outcome to the client entry by its `attempt` field, never by the array index; retain the client's
  `arrival` ordering. Compare an actual transported reason with `no-window-<raw side>`. Missing required transport is
  unresolved unless explained by the declared higher-priority cancellation/time cut; it is still listed. Report the
  priority explanation separately from unexplained defects.

  For bound-enabled gen-v4 routes, reconcile every raw first-four match with the client condition, firing and public
  reason; list a mismatch as declared-priority or unexplained. On `p2-uncapped` and `p2-uncapped-diag`, firing/public-bound
  expectations are not applicable: continuing after four same-side ends is intended. Still compare their raw and
  transported per-attempt reasons. Print `unexercised` only when complete raw evidence establishes zero natural
  matches."

## C12. The stage-A readout binding (P2-19; R3)

`docs/improve-generating-phase-2/stage-a-readout.md` begins with these lines, verbatim keys:

```text
Seal: <seal.json sha256>
Report A: <E/report-A/report.json sha256>
Accepted by SA-Opus: <yyyy-mm-dd hh:mm +07:00>
Accepted by SA-Astra: <yyyy-mm-dd hh:mm +07:00>
Stage B: PROCEED
```

- **When stage A has a failed or incomplete gate,** a line `Owner continuation: <Discord message id>` follows. C12
  therefore requires `Owner continuation:` for either failed or incomplete A4/A5 before stage B (review-2 R2-05).
- **The check.** `p2.mjs ledger --check --stage B` refuses unless all of these hold:
  - the file is committed (`git ls-files --error-unmatch` and an empty `git diff --quiet HEAD --` on it);
  - its `Seal` and `Report A` equal the current hashes;
  - both acceptances are present;
  - the verdict line is exactly `Stage B: PROCEED`;
  - the owner line is present when the report has a failed or incomplete A gate.

## C13. The seal (P2-13a; hardened by P2-13e; review-2 R2-04)

`E/seal/seal.json` (CRLF, 2-space JSON) is **write-once**. `sealSha256` is the SHA-256 of its bytes.

`{ format: 'p2-seal', version: 1, commit, stageMap, node, plan: { path, sha256 }, sourceDigest, today: { root, head, digest }, copies: [copy], tools: [{ path, sha256 }], inputs: [{ path, sha256 }], snapshot: { manifest, ok, files } }`

- **`copy`** is `{ id, source, root, rehearsal, inputDigest, treeId, copyDigest, chain, params, runtimeDigest, filesDigest, verified }`:
  the fields of its `p2-copy.json` (P2-12b), plus:
  - `runtimeDigest`: the copy's own `computeSourceDigest` (its `tools/bench/report.js`, its `SOURCE_FILES` with the
    trace additions). The frozen tree builder computes `copyDigest` the same way at build time
    (`tools/ig-proto/lib/tree.mjs:306-307`), so a sealed copy has `runtimeDigest === copyDigest` in both `ig-tree.json`
    and `p2-copy.json`;
  - `filesDigest`: the whole-tree fingerprint, the SHA-256 of `JSON.stringify` of the sorted `[path, sha256(bytes)]`
    pairs of every file of the copy except `ig-tree.json` and `p2-copy.json`. It binds the files outside
    `SOURCE_FILES` too (`core/browser/ig-link.js`, `tools/calibrate.mjs`, `tools/node-worker.mjs`);
  - `verified: true`.
- **`tools`**: every file under `tools/ig-proto/phase2/`. **`inputs`**: every other sealed file, deduplicated against
  `tools` (P2-13e's list; P2-13a's list until then). Each entry is in path order; a file without a 0 byte is hashed after
  `lf`, any other as bytes.
- **`snapshot`**: `manifest` is `docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json`
  (`SNAPSHOT_MANIFEST`), `ok` is `verifySnapshot().ok` (true), `files` its file count; the manifest is also in `inputs`.
- **The shipping build** is the repository's files as `inputs` and `tools` hash them. A browser receipt's `sources`
  (C16) are checked against these entries, path by path.
- **Write-once.** Identical bytes may be acknowledged; a different existing seal is refused. A new source epoch stops
  for the ruling of check-list §3.5, which names separate evidence and raw paths and the affected reruns; it does not
  reset or discard the cumulative ledger.
- **`seal --check`** (review-3 R3-01; P2-13a step 3, P2-13e step 2) does not repeat the two creation-only refusals
  (HEAD equal to `--commit`, a clean tracked worktree). It recomputes everything sealed; files outside the sealed
  inventory, such as ledger lines, published observations, readouts and task logs, may change.

## C14. The proof result (P2-12b's runner; read by S1 through P2-13v)

`E/proofs/<bundle>/result.json` and `result.md` (CRLF):
`{ format: 'p2-proof', version: 1, bundle, status: 'pass' | 'fail', quick, cases, counts, sources: { sourceDigest, copies: [{ id, treeId }] } }`.

- `quick` is true when `--quick` ran (a rehearsal). `sources.sourceDigest` is `computeSourceDigest` of the repository
  root; `sources.copies` lists every copy the bundle used, with the `treeId` of its `ig-tree.json` (empty when the
  bundle used production modules only).
- **Review-2 R2-04, verbatim:** "Apply the same rule to the four proof results before S1 passes: their root source
  digest and each used copy's tree id must match the seal, and `quick` must be false. A passing rehearsal or a stale
  passing result is not a qualification proof. Keep those source fields explicit and identical in the common runner and
  S1's contract."

## C15. The replay-probe receipt (P2-14b; read by A4 through P2-13v)

`E/replay-probes/receipt.json` (CRLF):
`{ format: 'p2-replay-probes', version: 1, limits, items: [item], sources: { trees } }`.

- **`item`** is `{ n, cell, uniqueness, copy: { id, treeId }, status, reason, puzzles: [{ id, kind, status, steps, bytes, work }], maxima, margin }`,
  for the eight fixed items of P2-14b, in order.
- `status` is `measured`, `not-measured`, `failed`, `censored` or `not-started`; a puzzle's `status` is the replay's
  (`matched` or another); `margin` is `'ok'` or `'exceeded'`.

## C16. The browser receipts (P2-16e; read by A5 through P2-13v)

`E/browser/<check>/receipt.json` and `console.log` (CRLF), one folder per check; there is **no** aggregate
`E/browser/receipt.json`.

- The receipt is
  `{ format: 'p2-browser', version: 1, page, check, status, durationMs, startedAt, endedAt, edgePid, consoleLines, cleanup, sources: [{ path, sha256 }] }`,
  with `status` `pass`, `fail`, `timeout` or `error`.
- The page's own reading is its console line `CHECK-END PASS|FAIL <s> s <name>` (the `tests/browser/watchdog.js`
  convention).
- `sources` hash each text after `lf`: the page, every file of `tests/browser/` whose name starts with the page's base
  name without its extension (`deadline` for `deadline.html`), the shipping `SOURCE_FILES`, `generator/jobs.js`, both
  locales, `generator/ui/replay-model.js`, `generator/ui/replay-cache.js`, and each `--bind` path. A5 requires this
  whole inventory (review-3 R3-02).

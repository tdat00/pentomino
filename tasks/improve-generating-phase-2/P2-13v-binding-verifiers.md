# P2-13v: The binding verifiers: rows, proofs, replay probes and browser checks

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.1 (source binding, R2), §7.2 (proofs, resources, browser checks), §7.4 (A4, A5); D-P2-12; P2-T11, P2-T14 (part); review-2 R2-04, R2-05; review-3 R3-02; `contracts.md` C4, C5, C13 to C16 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13v` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; the pack commit (it reads only the frozen contracts and its own synthetic files) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.5 h; machine: unlocked synthetic tests (no engine) |

## Goal

One module decides whether an observation belongs to the sealed source: a measured row, a proof result, the
replay-probe receipt and the six browser receipts. The driver, the comparator and the P5 readings all call it. A stale,
foreign or tampered observation is therefore never counted, and an unmeasured resource or browser endpoint is never a
pass.

## Authority and fixed points

- **The row rule (review-2 R2-04, verbatim; `contracts.md` C5).** "Before resume, skip, publication or statistical use,
  require the row's seal identity to equal the active seal. A foreign epoch is refused, never reused or relabelled.
  Verify the row's `receipt` SHA-256, the receipt's report and journal hashes, and the receipt key/variant/copy identity
  against the sealed plan. Require the sole generation run's `caseId`, `seed`, uniqueness and request quantity to match
  the row; its `sourceDigest` equals the sealed copy's `runtimeDigest`, and its source label equals the declared
  `${variant} ${seal.commit}`. The published `run` must deep-equal that extracted raw generation run."
- **The proof rule (`contracts.md` C14, verbatim).** "Apply the same rule to the four proof results before S1 passes:
  their root source digest and each used copy's tree id must match the seal, and `quick` must be false. A passing
  rehearsal or a stale passing result is not a qualification proof. Keep those source fields explicit and identical in
  the common runner and S1's contract."
- **A4 (review-2 R2-05, verbatim; P2-13b's gate table).** "Read `E/replay-probes/receipt.json` and verify the eight
  fixed item identities and their sealed source bindings. Pass only if all eight are `measured`, each has a nonempty
  replayed ordinary-candidate sample, every replay is matched, and every margin is `ok`. Any `failed` item makes the
  gate fail. Missing, not-measured, censored or not-started required items make it incomplete. Keep all item details in
  either case. A declared shortfall is not a successful gate."
- **A5 (review-2 R2-05, verbatim).** "Read `E/browser/<check>/receipt.json` for exactly `set-bound`, `batch-prefix`,
  `late-fence`, `fresh-after-pause`, `no-window-texts` and `screen-capped-step`. Verify their page/check identities and
  source hashes against the sealed shipping build. Require `status: 'pass'` and each check's completed `CHECK-END`
  reading at most 60 seconds. Missing receipts or duration/source evidence make the gate incomplete; an observed
  fail/timeout/error makes it fail. Do not read or require `E/browser/receipt.json`."
- **The formats:** `contracts.md` C4 (the receipt), C5 (the row line), C13 (the seal), C14 (the proof result), C15 (the
  replay-probe receipt) and C16 (the browser receipts).
- **The run record** (`tools/bench/report.js`, `RunRecord`, lines 50-101) has `caseId`, `seed`, `sourceCommit`,
  `sourceDigest` and `probeKind`. In a copy, `sourceCommit` is the `IG_SOURCE_LABEL` value (the frozen `meta-1` edit,
  `tools/ig-proto/lib/tree.mjs:36-41`), so it is the source label; `sourceDigest` is the copy's own
  `computeSourceDigest` (`tools/calibrate.mjs:250`).
- **The matrix digest.** `report.meta.matrixDigest` is `matrixDigest(matrix)` of the row's matrix file
  (`tools/calibrate.mjs:494`), with `matrixDigest = (matrix) => sha256Hex(canonicalJson(matrix))`
  (`tools/bench/calibration-reference.js:596`); `checkMatrix` returns the parsed file unchanged
  (`tools/bench/runner.js`). The row's matrix is P2-13d's step 3.2:
  `{ version: 1, profile: 'smoke', cases: [{ id: cell, boardRows, rotation: 0, levelId, maxActive, quantity: 10, uniqueness, seedPrefix, repetitions: 1, seeds: [seed] }] }`,
  with `seedPrefix` the seed up to its second-last `/`. Its digest therefore fixes the case id, the seed, the
  uniqueness and the quantity 10.
- **The eight replay items** (P2-14b; C15):

  | n | Cell | Uniqueness | Copy |
  |---|---|---|---|
  | 1 | `26x26-hell-1` | `any` | `p2-gen4-diag` |
  | 2 | `20x20-hell-1` | `any` | `p2-gen4-diag` |
  | 3 | `24x24-nightmare` | `any` | `p2-gen4` |
  | 4 | `22x22-nightmare` | `any` | `p2-gen4` |
  | 5 | `22x22-hell-1` | `require` | `p2-gen4-diag` |
  | 6 | `32x15-hell-1` | `require` | `p2-gen4-diag` |
  | 7 | `22x22-nightmare` | `require` | `p2-gen4` |
  | 8 | `32x15-nightmare` | `require` | `p2-gen4` |

- **The six browser checks** (P2-16b; C16): `set-bound`, `batch-prefix`, `late-fence`, `fresh-after-pause`,
  `no-window-texts` and `screen-capped-step`, on the page `tests/browser/deadline.html`.
- **Lane T (check-list §3.7).** The module imports only `node:` modules, `tools/bench/calibration-reference.js` and
  `tools/bench/report.js` (for `SOURCE_FILES`), which exist at the base. Every observation, seal and file reader is
  passed in, so the tests are synthetic.

## Scope

- **Create:** `tools/ig-proto/phase2/binding.mjs` and `tools/ig-proto/phase2/binding.test.mjs`.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/binding.mjs', 'tools/ig-proto/phase2/binding.test.mjs',
    'tasks/improve-generating-phase-2/P2-13v-binding-verifiers.md')
  ```

## Steps

1. **`binding.mjs`** (`// @ts-check`, ES module, CRLF, 2-space indent). Imports: `createHash` (`node:crypto`),
   `isDeepStrictEqual` (`node:util`), `matrixDigest` (`../../bench/calibration-reference.js`) and `SOURCE_FILES`
   (`../../bench/report.js`). Exports:
   - `REPLAY_ITEMS`: the eight items above, as `{ n, cell, uniqueness, copy }`, frozen;
   - `BROWSER_CHECKS`: the six names, in the order above; `BROWSER_PAGE = 'tests/browser/deadline.html'`;
     `CHECK_END_MAX_S = 60`; `BROWSER_GENERATOR_SOURCES`: `generator/jobs.js`, `generator/locale.en.js`,
     `generator/locale.vi.js`, `generator/ui/replay-model.js` and `generator/ui/replay-cache.js` (C16), frozen;
   - `sha256Hex(bytes)`: the hex SHA-256 of a `Buffer` or string;
   - `rowMatrix(expected)`: the row's matrix above, from `expected` (step 2);
   - `verifyRow(row, ctx)`, `verifyProof(result, seal)`, `resourceGate(receipt, seal)` and
     `browserGate(receipts, seal)` (steps 2 to 5).
2. **`verifyRow(row, ctx)`** returns `{ ok, problems }`, `ok` being `problems.length === 0`.
   - **`ctx`** is `{ sealSha256, seal, expected, read, list }`:
     - `expected`: the expected identity of `row.key`, or `null`: `{ key, fileKey, stage, component, arm, variant, cell, rep, seed, uniqueness, levelId, boardRows, maxActive }`
       (P2-13e builds it from the sealed plan and the activation receipt);
     - `read(path)`: the bytes of a file of `RAW` (path relative to `RAW`, `/`-separated), or `null` when it is absent;
     - `list(path)`: the file names of a folder of `RAW`, sorted, or `[]`.
   - **The checks**, in this order; each failure adds the problem text shown:
     1. `row.sealSha256 !== ctx.sealSha256`: `foreign seal <row.sealSha256 or none>`, and return at once (a foreign
        epoch is refused, never reused).
     2. `expected === null`: `no expected row <key>`, and return at once.
     3. Each of `key`, `fileKey`, `stage`, `component`, `arm`, `variant`, `cell`, `rep`, `seed` and `uniqueness` that
        differs between `row` and `expected`: `row <field>`.
     4. The receipt `raw/<fileKey>/receipt.json`: absent, `receipt missing` and return; its SHA-256 differs from
        `row.receipt`, `receipt hash`. Parsed: each of `key`, `fileKey`, `stage`, `variant` and `sealSha256` that
        differs from the row, `receipt <field>`. The sealed copy is `seal.copies` with `id === row.variant`: absent,
        `no sealed copy <variant>` and return; `receipt.copy.treeId` or `receipt.copy.copyDigest` different from it,
        `receipt copy`.
     5. The report: `receipt.report === null` or the file absent, `report missing` and return; its SHA-256 differs from
        `receipt.report.sha256`, `report hash`. Parsed: the runs with `probeKind === 'generation'` are not exactly one,
        `report runs <n>` and return.
     6. The journal: each `receipt.journal` entry whose file `raw/<fileKey>/journal/<name>` is absent, or whose byte
        length or SHA-256 differs: `journal <name>`. `list('raw/<fileKey>/journal')` different from the receipt's names:
        `journal inventory`.
     7. The run: `run.caseId !== expected.cell`, `run caseId`; `run.seed !== expected.seed`, `run seed`;
        `report.meta.matrixDigest !== matrixDigest(rowMatrix(expected))`, `matrix digest` (uniqueness and quantity);
        `run.sourceDigest !== copy.runtimeDigest`, `run sourceDigest`; `run.sourceCommit !== \`${row.variant} ${seal.commit}\``,
        `run source label`; `!isDeepStrictEqual(row.run, run)`, `run differs`; and
        `!isDeepStrictEqual(row.telemetry, run.telemetry ?? null)`, `row telemetry`.
3. **`verifyProof(result, seal)`** returns `{ ok, problems }` for the binding only; S1 checks `status` itself.
   - `result === null`: `missing`, and return. `result.format !== 'p2-proof'`: `format`. `result.quick !== false`:
     `quick`. `result.sources?.sourceDigest !== seal.sourceDigest`: `sourceDigest`.
   - For each `{ id, treeId }` of `result.sources.copies`: no sealed copy with that `id`, `copy <id> not sealed`; a
     different `treeId`, `copy <id> treeId`.
4. **`resourceGate(receipt, seal)`** (A4) returns `{ status, items }`, `status` `pass`, `fail` or `incomplete`, and
   `items` one `{ n, cell, status, problems }` per fixed item, kept in every case.
   - `receipt === null` or `receipt.format !== 'p2-replay-probes'`: every item `missing`; `incomplete`.
   - Per fixed item, the receipt item with the same `n`:
     - absent, or a different `cell`, `uniqueness` or `copy.id`: `missing`;
     - `copy.treeId` different from the sealed copy's: `binding`;
     - `status` `failed`, a puzzle whose `status` is a string other than `matched`, or `margin` `exceeded`: `failed`;
     - `status` `not-measured`, `censored` or `not-started`, or no puzzle with `kind === 'candidate'`: that status, or
       `empty sample`;
     - a `status` that is none of `measured`, `failed`, `not-measured`, `censored` and `not-started` (absent
       included): `status unknown`; a `margin` that is neither `ok` nor `exceeded` (absent included):
       `margin unknown`; a puzzle without a string `status`: `replay unknown`.
   - **Positive admission (review-3 R3-02, verbatim).** "A4 passes an item only when `status === 'measured'`,
     `margin === 'ok'`, the fixed identity and source binding hold, at least one ordinary candidate was replayed, and
     every replay is matched. An absent/unknown status or margin is incomplete, not success; the existing failed-item
     precedence remains."
   - `fail` when any item is `failed`; otherwise `incomplete` when any item has another problem; otherwise `pass`.
5. **`browserGate(receipts, seal)`** (A5). `receipts` maps each of the six names to its parsed receipt or `null`; the
   caller reads only `E/browser/<check>/receipt.json`. It returns `{ status, checks }`, one
   `{ check, status, seconds, problems }` per name.
   - A `null` receipt: `missing`.
   - `format !== 'p2-browser'`, `page !== BROWSER_PAGE` or `check` different from the name: `identity`.
   - **The required source inventory (review-3 R3-02, verbatim).** "For the source inventory, import the current
     `SOURCE_FILES` from `../../bench/report.js` (available at the pack base). Require the page, every sealed
     `tests/browser/` entry whose basename starts with the page's basename without extension, every `SOURCE_FILES`
     entry, and the five explicit generator paths of C16. Check their hashes against the seal, along with every
     additional source entry supplied by the receipt."
     - For `tests/browser/deadline.html`, the sealed entries are those of `seal.inputs` under `tests/browser/` whose
       file name starts with `deadline`.
     - A required path absent from the receipt's `sources`: `source missing <path>`.
     - Any `sources` entry, required or additional, whose path is in neither `seal.inputs` nor `seal.tools`, or whose
       `sha256` differs from the seal's: `source <path>`.
   - `status` `fail`, `timeout` or `error`: `status <status>`. Any other `status` than `pass` (absent included):
     `status unknown`.
   - The reading: the last console line matching `^CHECK-END (PASS|FAIL) (\S+) s (\S+)$` whose name is the check's.
     None: `duration`. Its seconds `Number(<s>)` not finite, or negative: `duration invalid`. `FAIL`, or more than
     `CHECK_END_MAX_S` seconds: `reading <PASS|FAIL> <s>`.
   - **Positive admission (review-3 R3-02, verbatim).** "A5 passes a check only when `status === 'pass'`, its required
     C16 source inventory is present and bound, and its matching `CHECK-END PASS` seconds are finite, nonnegative and
     at most 60. An absent/unknown status, missing required source, or absent/invalid duration is incomplete. An
     observed fail/timeout/error, `FAIL` reading or reading above 60 still fails."
   - `fail` when any check has a `status fail`, `status timeout`, `status error` or `reading` problem; otherwise
     `incomplete` when any has another problem; otherwise `pass`.
6. **`binding.test.mjs`** (`node:test`): the cases below. Each writes its synthetic raw folder under
   `tests/artifacts/ig-proto/phase2/self-test/binding-<start ms>/<case>/` with `writeFileSync`, builds `read` and `list`
   over it, and an `after` hook removes the folder. The base fixture is one bound row: a seal with one copy `p2-gen4`
   (`treeId` `t`, `copyDigest` and `runtimeDigest` `r`, `commit` `c`), a receipt, a report with one generation run
   (`caseId` the cell, the seed, `sourceCommit` `p2-gen4 c`, `sourceDigest` `r`, `meta.matrixDigest` of
   `rowMatrix(expected)`), one journal file, and the row line built from them. The browser fixture is a seal whose
   `inputs` hold, with fake hashes, the page, `tests/browser/deadline.js`, every `SOURCE_FILES` path and the five
   generator paths, and six receipts whose `sources` are exactly those entries.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/binding.test.mjs` | `a bound row verifies` | the base fixture | `ok` true |
| same | `a foreign seal is refused first` | the row with another `sealSha256` | `problems` exactly `['foreign seal <that value>']` |
| same | `a mismatched raw report hash or seed is refused` | the report changed by one byte; separately, the run's `seed` changed in a report whose receipt hash is updated | `report hash`; `run seed` |
| same | `the receipt binds the key, variant, seal and copy` | the receipt changed by one byte; separately, a receipt with another `copy.treeId` and its row's `receipt` hash updated | `receipt hash`; `receipt copy` |
| same | `the run binds its copy's runtime digest and source label` | `sourceDigest` `x`; separately, `sourceCommit` `p2-gen4 d` | `run sourceDigest`; `run source label` |
| same | `the matrix digest fixes uniqueness and quantity` | `expected.uniqueness` `require` against a report whose matrix says `any` | `matrix digest` |
| same | `a published run that differs from the raw run is refused` | `row.run.acceptedCount` changed | `run differs` |
| same | `a changed or added journal file is refused` | the journal file changed; separately, one more file in the journal folder | `journal <name>`; `journal inventory` |
| same | `a proof result binds the seal and is not quick` | a result matching the seal; then `quick: true`; then another `sourceDigest`; then a copy with another `treeId` | `ok` true; `quick`; `sourceDigest`; `copy p2-gen4 treeId` |
| same | `the resource gate` | eight measured items with candidate puzzles, all `matched`, margins `ok`; then item 7 `not-measured`; then item 2 `failed`; then item 4 with only `calibration` puzzles; then item 5 with another `treeId`; then item 3 without `status`; then item 6 without `margin` | `pass`; `incomplete` naming item 7, all eight items kept; `fail`; `incomplete`, `empty sample`; `incomplete`, `binding`; `incomplete`, `status unknown`; `incomplete`, `margin unknown` |
| same | `the browser gate reads six individual receipts` | six valid receipts (status `pass`, `CHECK-END PASS 6.2 s <name>`, sources equal to the seal's); then one `null`; then one `timeout`; then one with `CHECK-END PASS 61 s`; then one without a `CHECK-END` line; then one source hash differing from the seal; then one without `status`; then one whose `sources` omit `generator/jobs.js`, the page kept | `pass`; `incomplete`; `fail`; `fail`; `incomplete`, `duration`; `incomplete`, `source <path>`; `incomplete`, `status unknown`; `incomplete`, `source missing generator/jobs.js` |

## Documentation

None here; P2-17 documents `tools/ig-proto/phase2/` in `tools/ig-proto/README.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/binding.test.mjs` | slot root, unlocked (no engine) | `# fail 0`, `# cancelled 0` | 5 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when:
  - a field named here is not in its contract (C4, C5, C13 to C16);
  - `matrixDigest` cannot be imported from `tools/bench/calibration-reference.js`.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13v-B01 | No stale, foreign or tampered observation can be counted, and an unmeasured resource or browser endpoint is never a pass | the cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13v-T01 | Review-2 R2-04: one row verifier over the seal, the receipt, the report, the journal and the run | the row cases | test output |
| P2-13v-T02 | Review-2 R2-04: proof results bound to the seal; a rehearsal is not a proof | the proof case | test output |
| P2-13v-T03 | Review-2 R2-05 and review-3 R3-02: A4 and A5 as written, from the receipts that exist; success only on the positive values and the complete source inventory; no aggregate browser receipt | the gate cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the test pass counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w3, fb67ba0aba87ed85c8e85b677b0ef66ededbe2e2 |
| Start, end, duration | dispatched 2026-11-25 22:37 +07:00 (developer clock 22:13:26 to 22:16:27); accepted 22:52; about 15 min |
| Waiting for rulings | about 8 min (SA-Opus) |
| Agent id, model | 4648b0bf-c0b3-40c7-8a7b-344d19a4e2a1, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 20; 1,416,043 / 28,816 / 1,339,766 |
| AI credits | 61.28 |
| Questions and rulings | no QUESTION; SA-Opus accepted deviations 1-8 with no code fix (gates classify from every problem); item 7 added one C16 line (consoleLines: array of strings, one per Runtime.consoleAPICalled event, in arrival order), committed in the main worktree as 237a2bc |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 3 files); rebased onto 237a2bc cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked `IG P2-13v merge exit=0 seconds=0.336 quiet=45`, every phase-2 test file 28/28 pass |
| Commit (slot), commit on `gen-v4` | slot 6a87f46, rebased 030475d; gen-v4 030475d73aa4e5f4c891a06d1f6879fe2a6c5b86 |
| Issues and named items | none new; rowMatrix use (P2-13d/13e), consoleLines strings (P2-16e) and C15 receipt fields (P2-14b) already covered by their tasks |

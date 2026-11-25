# P2-13e: The driver's source and row binding

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §7.1 (source binding, R2), §7.6 (stops, source epoch); D-P2-12, D-P2-15; P2-T14; review-1 R13; review-2 R2-04; review-3 R3-01; `contracts.md` C4, C5, C7, C8, C13 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-13e` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; P2-13d (`runGroup`, `publish`) and P2-13v (`binding.mjs`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 3 h; machine: unlocked synthetic tests (no engine) |

## Goal

The seal binds exactly what is measured and what judges it:

- each copy's input sources, its runtime fingerprint and its whole-tree fingerprint;
- the reused frozen comparator and tree builder, with their verified snapshot;
- the shipping files that the browser receipts name.

Every receipt, row, reservation and ledger line names that seal. Resume, publication and the reports accept a row only
through P2-13v's verifier. A stale copy, a changed comparator, a rehearsal or an old epoch's row is therefore refused
before it is measured or counted.

## Authority and fixed points

- **Review-2 R2-04, the seal (verbatim, except one sentence, marked `[...]` and corrected below).** "Every measured copy
  must have `rehearsal === false`, its expected source/id/root, and an `inputDigest` equal to
  `inputDigest(readSources(root))` of the production root or the verified today root, as applicable. Verify its actual
  copy digest against both `ig-tree.json` and `p2-copy.json`.

  Store `runtimeDigest` per copy by importing that copy's `tools/bench/report.js` and calling its
  `computeSourceDigest(path => readFileSync(join(copyRoot, path), 'utf8'))`. Use the copy's own SOURCE_FILES, which
  includes trace additions. [...]

  Bind the reused tooling too: include `tools/ig-proto/` and `tools/bench/`, `tools/calibrate.mjs`,
  `tools/node-worker.mjs`, and `tools/test-server.mjs` in the input inventory, deduplicating paths. Require
  `verifySnapshot().ok` and include the manifest at `SNAPSHOT_MANIFEST` in the sealed inputs
  (`tools/ig-proto/snapshot.mjs:83-98`, `lib/paths.mjs:24`): the comparator dynamically loads that verified snapshot's
  bench schema and level ladder. Do not hash writable raw-output folders. `seal --check` repeats these checks.

  The seal is write-once: identical bytes may be acknowledged; a different existing seal is refused. A new source
  epoch stops for the scoped ruling already required by check-list §3.5. That ruling names separate evidence/raw paths
  and the affected reruns; it does not reset or discard the cumulative ledger."
- **The corrected sentence** (pack author; evidence `tools/ig-proto/lib/tree.mjs:306-307`; accepted in review-3). The
  review's "Do not equate this runtime fingerprint with the whole-tree `copyDigest`" assumes that `copyDigest` is a
  whole-tree digest. The frozen builder computes `copyDigest` with the copy's own `computeSourceDigest`, exactly as
  `runtimeDigest` is computed. So:
  - a sealed copy has `runtimeDigest` equal to both recorded `copyDigest` values (that is the "actual copy digest"
    check);
  - the whole-tree fingerprint is the separate `filesDigest` (`contracts.md` C13). It also binds the copy's files
    outside `SOURCE_FILES`: `core/browser/ig-link.js`, `tools/calibrate.mjs` and `tools/node-worker.mjs`.
- **Review-3 R3-01** refines "`seal --check` repeats these checks": the two creation-only refusals are not repeated
  (step 2).
- **Review-2 R2-04, the rows:** `contracts.md` C5's binding paragraph, verbatim there. The one verifier is P2-13v's
  `verifyRow`.
- **The formats:** `contracts.md` C4, C5, C7, C8 and C13.
- **The reused functions.**
  - `verifySnapshot()` (`tools/ig-proto/snapshot.mjs:83-98`) returns `{ ok, files, differences }`; importing the module
    runs nothing (its command line is guarded).
  - `SNAPSHOT_MANIFEST` is `docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json`
    (`tools/ig-proto/lib/paths.mjs:24`).
  - `computeSourceDigest(readText)` (`tools/bench/report.js:662`) is async.
- **Lane T (check-list §3.7).** `copies.mjs` (P2-12b) may not exist on this task's base. The seal therefore imports
  `readSources` and `inputDigest` with `await import('./copies.mjs')` only when it runs, and the tests pass adapters.

## Scope

- **Change:** `tools/ig-proto/phase2/p2.mjs` (the seal, `reserve`, `ledger --append`, `runGroup`, `publish`, and the
  new exports below) and `tools/ig-proto/phase2/p2.test.mjs` (new cases; every existing state root gains a fake seal).
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/p2.mjs', 'tools/ig-proto/phase2/p2.test.mjs',
    'tasks/improve-generating-phase-2/P2-13e-source-and-row-binding.md')
  ```

## Steps

1. **`SEALED_INPUTS`** becomes this list. It is deduplicated and in path order. `tools/ig-proto/phase2/` stays in the
   seal's `tools` field. No folder under `tests/artifacts/` is hashed.
   - `docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json` and
     `tasks/improve-generating-phase-2/contracts.md`;
   - `docs/improve-generating/evidence/frozen/V4-S4/`, `docs/improve-generating/evidence/frozen/V4-S4C/` and
     `docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json`;
   - `core/`, `generator/` and `tests/browser/` (the shipping build that browser receipts name);
   - `tests/fixtures/replay-case.json` and `tests/fixtures/replay-case-v4.json`;
   - `tools/ig-proto/` (except `tools/ig-proto/phase2/`), `tools/bench/`, `tools/calibrate.mjs`,
     `tools/node-worker.mjs` and `tools/test-server.mjs`.
2. **`export async function buildSeal(opts, deps)`**, which the `seal` command calls.
   - **`opts`:** `{ repoRoot, commit, todayRoot, planPath, rawRoot, inputs, out }`, with `inputs` defaulting to
     `SEALED_INPUTS` (the tests pass a short list). `buildSeal` writes `<out>/seal.json` and returns
     `{ sha256, unchanged }`. A refusal throws `Error('seal: refused <why>')`; the command prints it and exits 3.
   - **`deps`**, defaulting to the real functions:
     - `git(args, cwd)`: `execFileSync('git', args, { cwd, encoding: 'utf8' })`;
     - `copiesApi()`: `await import('./copies.mjs')`, for `readSources` and `inputDigest`;
     - `runtimeDigestOf(copyRoot)`: imports `join(copyRoot, 'tools', 'bench', 'report.js')` by its file URL and
       returns `await computeSourceDigest((path) => readFileSync(join(copyRoot, path), 'utf8'))`;
     - `verifySnapshot` of `tools/ig-proto/snapshot.mjs`;
     - `sourceDigestOf(root)`: imports `<root>/tools/bench/report.js` by its file URL and returns
       `await computeSourceDigest((path) => readFileSync(join(root, path), 'utf8'))`, so each root is digested with its
       own `SOURCE_FILES`; for the production `sourceDigest` and the today `digest` (as P2-13a computes them).
   - **P2-13a's refusals stay.** Added refusals (exit 3, `seal: refused <why>`), per copy folder
     `RAW/trees/<source>/<id>/`:
     - `copy <id> rehearsal`: its `p2-copy.json` has `rehearsal !== false`;
     - `copy <id> identity`: the receipt's `id` or `source` differs from the folder's, or its `root` is not the
       repository root (source `gen-v4`) or `--today-root` (source `today`), compared as lower-case `path.resolve`
       values;
     - `copy <id> input digest`: `inputDigest !== inputDigest(readSources(root))`;
     - `copy <id> digest`: `runtimeDigestOf(copyRoot)` differs from the `copyDigest` of `ig-tree.json` or of
       `p2-copy.json`;
     - `copy <id> tree id`: the two files' `treeId` differ;
     - `snapshot <first difference>`: `verifySnapshot().ok` is false.
   - **Fields (C13).** Each copy entry adds `runtimeDigest` and `filesDigest`: the SHA-256 of `JSON.stringify` of the
     sorted `[path, sha256(bytes)]` pairs of every file of the copy except `ig-tree.json` and `p2-copy.json`, with
     `/`-separated paths. The seal adds `snapshot: { manifest, ok: true, files }` and the `inputs` of step 1.
   - **Write-once.** When `<out>/seal.json` exists, identical bytes print `seal: <sha256> (unchanged)` and exit 0.
     Different bytes print `seal: refused existing seal differs (a new source epoch needs the ruling of check-list §3.5)`
     and exit 3, writing nothing.
   - **`seal --check` (review-3 R3-01, verbatim).** "Creation alone requires the production repository's HEAD to
     equal `--commit` and its tracked worktree to be clean. `seal --check` does not repeat those two creation-only
     refusals. It preserves the recorded `commit`, requires the current Node version to equal `seal.node`, and
     recomputes/checks the sealed plan, tools, inputs, production source digest, copy identity/input/runtime/files
     digests and frozen snapshot. Changes to files outside that sealed inventory, including ledger lines, published
     observations, readouts and task logs, and commits containing only such changes are allowed. A sealed-file change
     still fails by digest. The today worktree's fixed HEAD and cleanliness checks still apply. Output remains
     `seal: OK` or `seal: drift <field> <path or id>` (exit 3)."
     - The command calls `export async function checkSeal(opts, deps)`, with `buildSeal`'s `opts` and `deps`. It
       returns `{ ok, drift }`, `drift` being `[{ field, id }]`; the command prints the lines above from it.
3. **The seal in every record.** `activeSeal(paths)` reads `E/seal/seal.json` and returns `{ seal, sealSha256 }`. When the
   file is absent it throws `no seal`.
   - `reserve` writes `sealSha256` into `RAW/pending.json`; without a seal it exits 4 with `reserve: no seal`.
   - `ledger --append` adds `sealSha256` to the line itself, after P2-13a's validation of the caller's fields (which
     rejects an unknown field, so the caller never passes it); without a seal it exits 5 and writes nothing.
   - `runGroup` adds `sealSha256` to every status line, row line and receipt (C4, C5).
   - Every existing state root of `p2.test.mjs` gains a fake `E/seal/seal.json`, written by one helper
     `fakeSeal(dir, copies)`. P2-13d's fake calibrate (mode `ok`) then writes a report that `verifyRow` accepts: its
     run's `sourceCommit` is `<variant> <the fake seal's commit>`, its `sourceDigest` the fake copy's `runtimeDigest`,
     and its `meta.matrixDigest` that of `rowMatrix(expected)`. P2-13a's and P2-13d's cases keep their expectations.
4. **`export function expectedOf(key, { plan, activation })`**: the `expected` identity that `verifyRow` needs.
   - For a plan row that is not `open`: its `key`, `fileKey`, `stage`, `component`, `arm`, `variant`, `cell`, `rep`,
     `seed`, `uniqueness`, `levelId`, `boardRows` and `maxActive`.
   - For a key `conditional-twin/uncapped/<cell>/<rep>` that is not a plan row: the twin of the triggered row with that
     cell and rep that `activation.slots` or `activation.overflow.groups` names, by P2-13d's twin rule (step 1,
     "A twin").
   - Otherwise `null`.
5. **`runGroup`** (P2-13d) changes.
   - Its matrix file is already `rowMatrix(expected)` of `binding.mjs` (P2-13d); keep it.
   - **Before launching any key:** when a status record of one of this group's keys has a `sealSha256` other than the
     active one, it prints `refused: foreign seal epoch <key>` and exits 9. Nothing is launched.
   - **Skip:** a terminal key with the active seal is skipped.
   - **Resume:** for a key with a `start` and no terminal record, it builds the row line from `raw/` as step 3.5 does,
     then calls `verifyRow(rowLine, ctx)`.
     - When it passes, the key is `done`, and the row line is written if it is missing.
     - When it fails, the key is `interrupted` with `cause` set to its first problem.
     - Either way the key is never launched again.
   - **Exit codes:** P2-13d's, plus 9 for a refused binding.
6. **`publish`** first refuses while a key of the stage has a `start` line without a terminal line (resume reconciles
   only the keys of the group being run, P2-13d): it prints `publish: unreconciled <key> (run its group again)` for
   each, writes nothing and exits 9. Then it verifies every row of its source rows file with `verifyRow`. When any row
   fails, it prints `publish: refused <key>: <problems joined by '; '>` for each, writes nothing and exits 9.
7. **`export function loadSnapshot(dir, stage, ctxOf)`** reads `<dir>/<stage>.jsonl` and checks it against
   `<dir>/<stage>.sha256` (C8); a mismatch throws `snapshot <stage> hash`.
   - It returns `{ sha256, rows }`, each row with `binding: verifyRow(row, ctxOf(row))`.
   - P2-13b, P2-13c and P2-13f read snapshots only through it. A row whose `binding.ok` is false is missing evidence
     for its endpoint; no ratio is qualified from it.
   - `ctxOf(row)` gives `{ sealSha256, seal, expected: expectedOf(row.key, { plan, activation }), read, list }` over
     `RAW`.
8. **Tests:** the cases below, in `p2.test.mjs`, synthetic. `buildSeal` and `checkSeal` run with injected `deps`: a
   `git` that answers HEAD, a clean status and a today head starting `6b94ffb`; adapters for `readSources` and
   `inputDigest`; a fake copy tree whose `tools/bench/report.js` exports `computeSourceDigest`; a `sourceDigestOf`
   stub; and a `verifySnapshot` stub.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/p2.test.mjs` | `the seal refuses a stale but self-consistent copy` | a fake copy whose `p2-copy.json` and `ig-tree.json` agree, with an `inputDigest` that differs from the adapter's `inputDigest(readSources(root))` | `buildSeal` throws `seal: refused copy p2-gen4 input digest` |
| same | `the seal refuses a rehearsal copy` | the same copy with `rehearsal: true` | `buildSeal` throws `seal: refused copy p2-gen4 rehearsal` |
| same | `the seal binds the runtime and whole-tree digests` | a consistent fake copy; then one byte changed in its `tools/calibrate.mjs` after sealing | `runtimeDigest` equals `copyDigest`; `filesDigest` present; then `checkSeal` gives the drift `copies p2-gen4` (the command prints `seal: drift copies p2-gen4` and exits 3) |
| same | `a changed reused comparator input is drift` | `opts.repoRoot` a fake repository holding `tools/ig-proto/verdicts.mjs`, `opts.inputs` naming it; seal; then one byte changed | `checkSeal` gives the drift `inputs tools/ig-proto/verdicts.mjs` |
| same | `the check allows ledger-only changes and refuses sealed changes` | after sealing, the injected `git` answers another HEAD and a status with only ` M docs/improve-generating-phase-2/evidence/ledger/ledger.jsonl`, and that ledger file changes in the fake repository; then one byte of the sealed `tools/ig-proto/verdicts.mjs` changes | `checkSeal` `ok` true (`seal: OK`); then the drift `inputs tools/ig-proto/verdicts.mjs` (exit 3 from the command) |
| same | `the seal is write-once` | `buildSeal` twice with the same inputs; then again after one input changed | `unchanged` true the second time (the command prints `(unchanged)` and exits 0); then it throws `seal: refused existing seal differs (a new source epoch needs the ruling of check-list §3.5)` |
| same | `a failed snapshot refuses the seal` | `verifySnapshot` returning `{ ok: false, files: 0, differences: ['x'] }` | `buildSeal` throws `seal: refused snapshot x` |
| same | `every record names the seal` | P2-13d's first case with a fake seal | `sealSha256` on the start and done lines, the row line, the receipt, the reservation and the ledger line |
| same | `a mismatched raw report is interrupted on resume` | a started key whose `report.json` changed after its receipt was written | `interrupted` with `cause: 'report hash'`; no launch marker |
| same | `an old-seal terminal key is refused after a new seal` | a status journal whose `done` key has another `sealSha256` | runGroup exits 9 with `refused: foreign seal epoch <key>`; no launch; `publish` exits 9 |
| same | `publication refuses a bad binding` | a rows file whose row's `receipt` hash differs from the receipt | exit 9, `publish: refused <key>: receipt hash`; nothing written |
| same | `publication refuses an unreconciled key` | a status journal with a `start` line for `k1` and no terminal line | exit 9, `publish: unreconciled k1 (run its group again)`; nothing written |
| same | `a published row with a later bad binding is marked` | `loadSnapshot` of a published row whose raw report changed afterwards | that row's `binding.ok` false, with `report hash` |

## Documentation

None here; P2-17 writes the README section.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/p2.test.mjs` | slot root, unlocked (no engine) | `# fail 0`, `# cancelled 0` | 5 min |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

No real seal and no row run in this task.

## Stop points and questions

- **`QUESTION:`** when:
  - a C13 field cannot be computed from the inputs named here;
  - a copy's `report.js` cannot be imported by its file URL;
  - an earlier lane-T test cannot keep its meaning with a fake seal.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13e-B01 | Only the sealed source is measured and counted; an old epoch's or a tampered row is refused, never reused | the cases | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-13e-T01 | Review-2 R2-04: the seal binds input, runtime and whole-tree digests, the reused tooling and the snapshot; `seal --check` repeats it without the creation-only refusals (review-3 R3-01) | the seal cases | test output |
| P2-13e-T02 | Review-2 R2-04: the seal identity on every record; resume, skip and publication through `verifyRow` | the record, resume and publication cases | test output |
| P2-13e-T03 | Write-once seal; a new epoch stops for the ruling of check-list §3.5 | the write-once case | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; P2-13a's and P2-13d's cases still green
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
| Slot, base SHA | |
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator (merge gate) | |
| Commit (slot), commit on `gen-v4` | |
| Issues and named items | |

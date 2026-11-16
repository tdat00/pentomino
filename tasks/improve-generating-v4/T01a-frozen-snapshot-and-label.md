# T01a: Verified frozen source snapshot and the frozen label in the harness

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 (preconditions: the freeze, no fallback to the old runtime), §9 (freeze point `3fc65f4`); decisions D-V4-01, D-V4-02, D-V4-12; review RV1-24; the pack author's ruling of 2026-11-17 on line endings |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, `345d29d` |
| Depends on | none |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (nothing rates or times) |

## Goal

Every frozen-round measurement must run on exactly the difficulty-v3 source that was merged (`3fc65f4`), even after
phase-1 commits change the working tree. This task extracts that commit once into a fresh folder, records a hash
manifest of every extracted file, verifies the folder against it before any frozen tree is built, and teaches the
harness to read its sources there under `--label frozen`, with its own tree folder and a zero budget without
approval.

## Authority and fixed points

- Plan §5.1 and §9; D-V4-01 (snapshot, digest, tree folder; `--label frozen` is the only selector), D-V4-02 (round
  cap 0 for `frozen`), D-V4-12 (read-only git for the snapshot).
- The provisional behaviour stays: with `--label provisional` (or no label) every tool reads the worktree exactly as
  before, writes trees under `tests/artifacts/ig-proto/tree/` and keeps the 10,800 s round cap.
- The snapshot folder is never merged into: it is created from an absent folder, or it is verified against the
  recorded manifest; an unverified folder stops the work.
- No production file changes. The harness code runs no git; only the developer's snapshot command does.
- Ruling of the pack author, 2026-11-17 (the developer's report on the first execution): `git archive` writes text
  files with the line endings of the machine (here `core.autocrlf=true`, with `.gitattributes` `* text=auto`), so a
  manifest of raw bytes verifies only where the extraction converts the same way. The manifest therefore hashes every
  file by the rule of `sha256File` (`lib/records.mjs:30`): a file without a NUL byte as UTF-8 text with LF line ends,
  a file with a NUL byte as its raw bytes; the same rule as `computeSourceDigest` and every evidence hash of the pack.
  The extraction command of step 4 is unchanged: its line endings no longer matter.

## Scope

- Create:
  - `tests/artifacts/ig-proto/frozen-source/` (git-ignored): `core/`, `tools/` and `package.json` of commit `3fc65f4`.
  - `tools/ig-proto/snapshot.mjs` (step 2).
  - Evidence `docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json`.
- Change: `tools/ig-proto/lib/paths.mjs`, `tools/ig-proto/lib/records.mjs`, `tools/ig-proto/lib/tree.mjs`,
  `tools/ig-proto/lib/budget.mjs`, `tools/ig-proto/self-test.mjs` (a `--frozen` group), `tools/ig-proto/README.md`
  (a section).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T01a --label frozen`,
  expected `files unchanged`; `git status --short -- core generator player tests docs/design-brief.md docs/design-detail.md tools/bench tools/calibrate.mjs tools/record-fixtures.mjs README.md USERGUIDE.md USERGUIDE.vn.md DEVELOPERGUIDE.md DEVELOPERGUIDE.vn.md`,
  expected no output (`tests/artifacts/` is git-ignored).

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T01a --label frozen`.
1. **`lib/paths.mjs`.** Add after `ROUND_LIMIT_S`:

   ```js
   /** The frozen source of the frozen round (task pack v4, D-V4-01): the merge of difficulty-v3. */
   export const FROZEN_COMMIT = '3fc65f4681a53d3984d9218c15efbf696cc3a1a5';
   /** computeSourceDigest of FROZEN_COMMIT's SOURCE_FILES (40 files). */
   export const FROZEN_DIGEST = 'e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b';
   /** The extracted frozen source (git-ignored), written by V4-T01a's snapshot step. */
   export const FROZEN_SOURCE_DIR = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen-source');
   /** The hash manifest of FROZEN_SOURCE_DIR (committed evidence). */
   export const SNAPSHOT_MANIFEST = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-T01a', 'snapshot-manifest.json');
   /** 'frozen' when this process runs with `--label frozen`, else 'worktree'. Worker threads do not read it (T01b). */
   export const SOURCE_KIND = argValue('label') === 'frozen' ? 'frozen' : 'worktree';
   ```

   and the functions (JSDoc as shown):
   - `export function sourceRoot(kind = SOURCE_KIND)`: `FROZEN_SOURCE_DIR` for `'frozen'` (and throws
     `Error('frozen source missing: run the snapshot step of V4-T01a')` when `join(FROZEN_SOURCE_DIR, 'core',
     'engine', 'clues.js')` does not exist), else `ROOT`.
   - `export function roundLimitS(label)`: `0` for `'frozen'`, else `ROUND_LIMIT_S`.
   - `treeDir(variant, kind = SOURCE_KIND)`: `tests/artifacts/ig-proto/tree-frozen/<variant>/` for `'frozen'`,
     unchanged (`.../tree/<variant>/`) otherwise.
   Update the file's header comment: "No git: identity comes from content; the frozen source is a folder extracted
   once and verified against its manifest (V4-T01a)."
2. **`snapshot.mjs`** (`// @ts-check`; no git): `record`, `verify` and `--help`.
   - `record`: refuses (exit 1, `snapshot: the manifest exists`) when `SNAPSHOT_MANIFEST` exists; else hashes every
     file under `FROZEN_SOURCE_DIR` by the line-ending rule of the Authority section, sorts by the `/`-separated
     relative path, and writes `{ format: 'ig-proto-snapshot', version: 1, frozenCommit: FROZEN_COMMIT, hashRule:
     'lf-text', files: <count>, digest: <SHA-256 of the concatenated "path\tsha256\n" lines>, entries: [{ path,
     sha256, bytes, text }] }` with `writeJson`. Per file, in `snapshotEntries`:

     ```js
     const raw = readFileSync(join(folder, entry.name));
     const text = !raw.includes(0);
     // The rule of sha256File (lib/records.mjs:30): the manifest does not depend on the line endings of the extraction.
     const hashed = text ? Buffer.from(lf(raw.toString('utf8')), 'utf8') : raw;
     out.push({ path, sha256: sha256(hashed), bytes: hashed.length, text });
     ```

     (`lf` and `sha256` from `./lib/records.mjs`; `bytes` is the length of the hashed content.)
   - `verify`: refuses a manifest whose `hashRule` is not `'lf-text'` (exit 1, `snapshot: the manifest's hash rule
     is not lf-text`); else re-hashes the folder and compares with the manifest: missing, extra and changed paths; prints
     `snapshot: verified (<files> files)` and exits 0, or prints the first ten differences and exits 1.
   - Export `export function verifySnapshot()` returning `{ ok, files, differences }` for the tree builder.
   - `--help` (or no argument) prints `usage: node tools/ig-proto/snapshot.mjs record | verify` and exits 0; any other
     argument prints the usage and exits 2. The module loads without the snapshot folder and without the manifest.
   - Export `export function compareSnapshot(entries, manifest)` (the comparison `verify` and `verifySnapshot` use).
   Write the pure case `frozen: a changed snapshot is refused` of step 8 now, before step 4.
3. **Load check, before any extraction:** `node tools\ig-proto\snapshot.mjs --help` prints the usage and exits 0
   (no snapshot exists yet). If it fails, fix the helper before step 4; nothing is extracted before this passes.
4. **Snapshot preparation** (read-only git, D-V4-12), from the repository root, exactly:

   ```powershell
   $dir = 'tests\artifacts\ig-proto\frozen-source'
   $manifest = 'docs\improve-generating\evidence\frozen\V4-T01a\snapshot-manifest.json'
   if ((Test-Path $dir) -and (Test-Path $manifest)) {
     node tools\ig-proto\snapshot.mjs verify
     if ($LASTEXITCODE -ne 0) { throw ('STOP: the snapshot differs from its manifest (exit ' + $LASTEXITCODE + '); report the output') }
   } elseif (Test-Path $dir) {
     throw 'STOP: an unverified snapshot folder exists without its manifest; report it; do not reuse, merge or delete it'
   } elseif (Test-Path $manifest) {
     throw 'STOP: the manifest exists without its folder; report it'
   } else {
     New-Item -ItemType Directory -Force -Path 'tests\artifacts\ig-proto' | Out-Null
     git archive --format=zip -o 'tests\artifacts\ig-proto\frozen-source.zip' 3fc65f4 core tools package.json
     if ($LASTEXITCODE -ne 0) { throw ('STOP: git archive exited ' + $LASTEXITCODE) }
     Expand-Archive -Path 'tests\artifacts\ig-proto\frozen-source.zip' -DestinationPath $dir
     Remove-Item 'tests\artifacts\ig-proto\frozen-source.zip'
     node tools\ig-proto\snapshot.mjs record
     if ($LASTEXITCODE -ne 0) { throw ('STOP: snapshot record exited ' + $LASTEXITCODE + '; the folder stays unverified') }
     node tools\ig-proto\snapshot.mjs verify
     if ($LASTEXITCODE -ne 0) { throw ('STOP: snapshot verify exited ' + $LASTEXITCODE) }
   }
   ```

   Extraction and the first `record` are one preparation sequence: an interruption between them leaves a folder
   without its manifest, on which the second branch stops (a ruling, never an automatic overwrite or merge).
   `Expand-Archive` runs without `-Force`: the folder was absent. Expected: `...\frozen-source\core\engine\clues.js`,
   `...\tools\bench\report.js` and `...\package.json` exist and `...\tools\ig-proto` does not (the harness is not in
   `3fc65f4`).
5. **`lib/records.mjs`.**
   - Remove the static imports of `APP_VERSION`, `computeSourceDigest` and `currentVersions`; import `FROZEN_COMMIT`,
     `FROZEN_DIGEST`, `SOURCE_KIND` and `sourceRoot` from `./paths.mjs`; import `pathToFileURL` from `node:url`.
   - `export async function sourceDigest()`: imports `tools/bench/report.js` from `sourceRoot()` by file URL and
     returns `computeSourceDigest((path) => readFileSync(join(sourceRoot(), ...path.split('/')), 'utf8'))`. Keep
     `export const worktreeDigest = sourceDigest;` so that the existing callers stay as they are (they `await` it).
   - `export async function sourceVersions()`: imports `tools/record-fixtures.mjs` (`currentVersions`) and
     `core/engine/version.js` (`APP_VERSION`) from `sourceRoot()` and returns `{ ...currentVersions(), app: APP_VERSION }`.
     Replace `worktreeVersions` by it; its callers (`buildMeta` here, `buildTree` in `tree.mjs`) `await` it.
   - `buildMeta`: `labelText` is `'frozen (3fc65f4)'` for the frozen label; `source` gains `kind: SOURCE_KIND`,
     `frozenCommit: SOURCE_KIND === 'frozen' ? FROZEN_COMMIT : null` and `equalsFrozenSource: sourceDigest ===
     FROZEN_DIGEST`; `versions: await sourceVersions()`.
   - `banner`: the frozen text becomes `> **Frozen source \`3fc65f4\`.** Measured on <label> (source digest <8
     hex>…<equal>). Re-run: <rerun>.` (the provisional text is unchanged).
6. **`lib/tree.mjs`.**
   - Import `SOURCE_KIND`, `sourceRoot` and `FROZEN_DIGEST` from `./paths.mjs`, `sourceVersions` from `./records.mjs`
     (instead of `worktreeVersions`) and `verifySnapshot` from `../snapshot.mjs`.
   - `collectSources()`: under `SOURCE_KIND === 'frozen'` it first calls `verifySnapshot()` and throws `frozen source
     differs from its manifest: <first difference>` when it is not `ok`; then it reads `core` and `tools` under
     `sourceRoot()` (labels relative to `sourceRoot()`, `tools/ig-proto` skipped as today) and `package.json` from
     `sourceRoot()`.
   - `buildTree`: `const sourceDigest = await worktreeDigest();` stays (it now reads the active source); the `base`
     check also throws `the frozen base copy's digest <d> is not FROZEN_DIGEST` when `SOURCE_KIND === 'frozen'` and
     `copyDigest !== FROZEN_DIGEST`; `worktree` in `ig-tree.json` becomes `{ sourceLabel, sourceDigest, versions:
     await sourceVersions(), kind: SOURCE_KIND }`.
7. **`lib/budget.mjs`.** Import `roundLimitS` instead of `ROUND_LIMIT_S`; `roundCapS = roundLimitS(label) + 60 *
   (approvals.roundMinutes ?? 0)`; the JSDoc of `decide` says "the round's cap is 10,800 s for `provisional` and 0 s
   for `frozen`, each raised by an approval".
8. **`self-test.mjs`**: a switch `--frozen` (add it to `parseArgs`'s switches) that runs only the group
   `frozenCases`; the default task with it is `V4-T01a`. Cases in the Tests table.
9. **`README.md`**: a section "## Frozen source (task pack v4)" after "## Re-run index": the snapshot commands of
   step 4, `snapshot.mjs record|verify`, `--label frozen` (the only selector), the tree folder `tree-frozen/`, the
   zero round cap and `-ApprovedRoundMinutes`, that provisional commands behave as before, and the manifest's hash rule
   (text with LF line ends, so the extraction's line endings do not matter).
10. **Fix round of 2026-11-17 (once, by the pack author's ruling).** The first execution extracted the folder and
    recorded a raw-byte manifest, not yet committed. In this order, at the root: (a) with the code as it is, `node
    tools\ig-proto\snapshot.mjs verify` must print `snapshot: verified (88 files)` (the folder is still that
    extraction), else stop with `QUESTION:`; (b) change `snapshotEntries`, `record` and `verify` as step 2 now says and
    add the line-ending case; (c) delete only `docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json`
    (this ruling allows it once) and keep `tests/artifacts/ig-proto/frozen-source/` as it is: no new extraction, the
    hash rule makes its line endings irrelevant; (d) `node tools\ig-proto\snapshot.mjs record`, then `node
    tools\ig-proto\snapshot.mjs verify`, which prints `snapshot: verified (88 files)`; (e) re-run every gate of the
    Commands table (step 4's script now takes its first branch, `verify`) and report the new manifest's `digest`, its
    `hashRule` and the number of entries with `text: false`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --frozen` | `frozen: snapshot verified, digest and versions` | `verifySnapshot()`, `sourceDigest()` and `sourceVersions()` in a process started with `--label frozen` | `ok` true; the digest equals `FROZEN_DIGEST`; versions deep-equal `{ algo: 'gen-v3', policy: 'mixed-v3', rng: 'xoshiro128ss-v1', model: 'difficulty-v3', app: '1.0.0' }` |
| same | `frozen: line endings do not change a snapshot hash` | `snapshotEntries(dir)` of a fresh folder `artifactDir('selftest', 'snapshot-eol')` holding `a.txt` written as `'x\r\ny\r\n'` and `b.bin` as the bytes `[0, 13, 10]`; then the same folder with `a.txt` rewritten as `'x\ny\n'` and `b.bin` as `[0, 10]` | `a.txt`: equal `sha256` and `bytes` (4) both times, `text` true; `b.bin`: different `sha256`, `bytes` 3 then 2, `text` false |
| same | `frozen: a changed snapshot is refused` | a temporary copy of the manifest with one entry's `sha256` changed, given to the exported `compareSnapshot(entries, manifest)` | one difference naming that path; `ok` false |
| same | `frozen: trees and anchors` | `ensureTree('base')`, then `planTree(id, { errors, sources: collectSources() })` for every `listVariants()` id | the base root ends with `tests/artifacts/ig-proto/tree-frozen/base` and its `copyDigest` equals `FROZEN_DIGEST`; every variant has `errors.length === 0` |
| same | `frozen: round cap 0` | `decide({ task: 'x', label: 'frozen', allocationS: 600, minHorizonS: 60, invocations: [] })`, then with `approvals: { roundMinutes: 10 }` | first `decision: 'stop'`, `roundCapS: 0`; second `decision: 'go'`, `horizonS: 285`, `roundCapS: 600` |
| same | `frozen: provisional unchanged` | `decide({ task: 'x', label: 'provisional', allocationS: 600, minHorizonS: 60, invocations: [] })` | `roundCapS: 10800`, `decision: 'go'` |

For the second case `snapshot.mjs` also exports `compareSnapshot(entries, manifest)` (the comparison that `verify`
and `verifySnapshot` use), so the test needs no file change.

## Documentation

`tools/ig-proto/README.md` (step 9). No production document changes.

## Commands and gates

The cases of this task do no generation, rating or replay, so they run unlocked (check-list §3.2).

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\snapshot.mjs --help` (step 3, before step 4) | root | the usage line; exit 0 | 1 min |
| step 4 commands | repository root | the three files exist; `snapshot-manifest.json` written; `snapshot: verified (<n> files)` | 3 min |
| `node tools\ig-proto\snapshot.mjs verify` | root | `snapshot: verified (<n> files)` | 1 min |
| `node tools\ig-proto\lib\tree.mjs build base instr log --label frozen` | root | three lines `<id> <treeId> <copyDigest> built`; base's copyDigest `e181df2c…` | 3 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok <variant>: <n> edits match` line per declared variant, no error, exit 0; report the printed counts | 2 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all` | root | the same lines as with `--label frozen` (worktree; provisional behaviour) | 2 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T01a` | root | the six cases pass, exit 0 | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T01a --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: deleting or overwriting `tests\artifacts\ig-proto\frozen-source` or the manifest (only on
  the pack author's ruling); changing any file outside `tools/ig-proto/` and the evidence folder; rewriting
  `data/boards-v1.json` (never: the catalogue stays frozen, D-IG13).
- Stop with `QUESTION:` if the snapshot's digest is not `e181df2c…`, if `check-edits --label frozen` lists an error,
  or if a provisional command behaves differently after the change.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01a-B01 | The frozen round's source is exactly `3fc65f4`, whatever later commits change in the working tree | the manifest; `snapshot.mjs verify`; the digest case | `evidence/frozen/V4-T01a/snapshot-manifest.json`; command output |
| T01a-B02 | Nothing runs on the frozen label without an approved budget | `frozen: round cap 0` | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T01a-T01 | A frozen tree is built only from a verified snapshot, under `tree-frozen/`, with `FROZEN_DIGEST` | `tree.mjs build base --label frozen`; the refusal case | command output; self-test output |
| T01a-T02 | Every declared variant's edits apply to the frozen source | `check-edits --all --label frozen` | command output |
| T01a-T03 | Provisional behaviour unchanged | `check-edits --all` (no label); `frozen: provisional unchanged` | command output |
| T01a-T04 | No production file changed; formats | firewall `check`; the `git status` guard; `npm run check` | command output |
| T01a-T05 | The manifest does not depend on the line endings of the extraction (ruling of 2026-11-17): text hashed with LF line ends, a file with a NUL byte raw; `hashRule` `lf-text` | the line-ending case; the manifest's `hashRule` and `text` fields | self-test output; `snapshot-manifest.json` |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers; each AC row with its evidence; the
questions and rulings; the deviations; and the named items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | |
| Waiting for rulings | |
| Agent id, model | |
| Calls; input, output and cache-read tokens | |
| AI credits | |
| Questions and rulings | |
| Fix rounds | |
| Gates re-run by the orchestrator | |
| Commit | |
| Issues and named items | |

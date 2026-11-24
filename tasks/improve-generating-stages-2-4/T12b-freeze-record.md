# T12b: The freeze record `freeze.json` (`freeze.mjs write`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.1, §4.2 (`freeze.json` and `freeze.md`, "written once ... by the encoding task"; "The encoding checks the file against T11e's pure `activation` on the published pilots (both conditional boards) before writing it"), §4.3 ("Once the freeze records the trees ..."), §4.7, §6 T1, §8.2 T12; N-V4-03; this pack's D-P24-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T12a |
| Depends on | T12a; T11 with a jointly signed acceptance of the final epoch (outcome (A)) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (unlocked) |

## Goal

Record the freeze once: the classes and their bounds, the table ids and values, the four variants' tree ids and
parameter hashes, the seeds that fitted it (the records and reps actually used) and those excluded, the validated fit
index of T12a with the captured harness sources, and the proofs of the epoch. `activate` (S05) reads its `classes`;
`V4-LIVE`'s prerequisites (S04) need the file; the live receipt (T09b) and its acceptance (T09c) read its `variants`.

## Authority and fixed points

- Plan §4.2's shape: `format` `ig-v4-freeze`, `version` 1, `classes`, `bounds`, `tables`, `values`, `variants`,
  `seeds`, `fit`; readers use `classes` only and accept extra keys (`manifest.mjs` `readFreeze`, `:2230`); `activate`
  refuses a file whose classes do not name exactly the 19 comparator cells, each once (`freezeMismatch`).
- The values are T08b's constants (`FREEZE_CLASSES`, `FREEZE_BOUNDS`, `FREEZE_TABLES`, `FREEZE_VALUES`), unchanged;
  `freezeChecks()` must pass before anything is written.
- The epoch's proofs: the four bindings `docs/improve-generating/evidence/frozen/V4-S3P/parity-<arm>.accepted.json`
  (S03) must pass `checkAccepted(binding, { current: [<arm's tree id and parameter hash today>] })` (`lib/proof.mjs:209`).
  These are the candidate epoch's paths: after a T11 outcome (B) or (C), this task is not run as written; the pack
  author issues a revised task naming the replacement epoch's constants and proof paths (SA-Astra's review R17: "its
  default hard-coded V4-S3P bindings cannot stand in for a different epoch").
- The fit (SA-Astra's review R18): T12a's `fitIndex()` with no problem; the mutable harness sources it needs are captured
  first (step 1) as normalized text captures of the blobs of `57ef5cf` (`FIT_CAPTURE`; checked on today's records by
  `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-capture-check.mjs`: each reproduces its indexed `sha256Lf`),
  with read-only git by the developer; the harness runs no git. "Add a test that removes one work input or changes one indexed byte: `write` refuses before creating either
  freeze file. Keep original input files untouched."
- Seeds (plan §4.7): fitting only; the record names the records and reps used (`FIT_SEEDS_USED`) and the excluded reps.
- Written once (check-list §3.3); the path is fixed (`ACTIVATE_PATHS.freeze`, `manifest.mjs:1937`).

## Scope

- Change: `tools/ig-proto/freeze.mjs`: the constants `FREEZE_PATH`, `FREEZE_SEEDS`; the pure `freezeRecord`,
  `freezeMarkdown`; the exported command `writeCommand(argv, io)` and its `main` entry; the seventh check `record` in
  `freezeChecks` (only when the file exists).
- Change: `tools/ig-proto/self-test.mjs`: two cases appended to `itemCases`.
- Create (by step 1): the captures `docs/improve-generating/evidence/frozen/V4-S3/fit-sources/tools/ig-proto/...` (one
  file per captured path); (by the command) `docs/improve-generating/evidence/frozen/V4-S3/freeze.json` and `freeze.md`.
- Change: `tools/ig-proto/README.md`: the subsection `### freeze.json (T12a, T12b)`; `## Commands` gains the `write` line;
  two phrases of the subsection `### The freeze checks (T08b)` (Documentation, ruling R-P24-12); the `check` line's
  comment in `## Commands` and the epoch bullet of the frozen family's section (Documentation, ruling R-P24-17).
- Guards: G1, G2 (new files only), G3 (the three code files and the new files of the Scope).

## Steps

1. **The captures** (SA-Astra's review R2-07, verbatim: "Refuse an existing capture; read the blob with read-only `git
   --no-pager show`, require exit 0, normalize that text to CRLF/UTF-8 without BOM and verify its `sha256Lf` against the
   indexed original before writing once. Record this as a normalized text capture of the named commit/path, not a
   byte-for-byte Git-blob copy. The harness still runs no git."). Run (unlocked) `node --input-type=module -e "const f =
   await import('./tools/ig-proto/freeze.mjs'); const r = f.fitIndex(); for (const p of r.problems) console.log(p);"`:
   every problem must be `fit input <p> changed or missing and has no matching capture (index ...)` for one of
   `tools/ig-proto/lib/lane-worker.mjs`, `tools/ig-proto/manifest.mjs`, `tools/ig-proto/v4-check.mjs` (any other problem
   is a stop). Then run this block once from the repository root in PowerShell 7 (the developer's read-only git, never
   the harness's); it captures every `uncaptured` entry of `fitIndex()` (or, with `$env:IG_CAPTURE_PATH` and
   `$env:IG_CAPTURE_HASH` set, that one path), refusing an existing destination, a failed read or a text whose
   `sha256Lf` is not the indexed one, and writes each file once (`flag: 'wx'`, so no existing file is ever truncated):

   ```powershell
   @'
   import { execFileSync } from 'node:child_process';
   import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
   import { dirname } from 'node:path';
   import { pathToFileURL } from 'node:url';
   const root = process.cwd();
   const load = (p) => import(pathToFileURL(`${root}/${p}`).href);
   const f = await load('tools/ig-proto/freeze.mjs');
   const { lf, sha256Text } = await load('tools/ig-proto/lib/records.mjs');
   const { abs } = await load('tools/ig-proto/lib/paths.mjs');
   const todo = process.env.IG_CAPTURE_PATH === undefined ? f.fitIndex().uncaptured
     : [{ path: process.env.IG_CAPTURE_PATH, hash: process.env.IG_CAPTURE_HASH }];
   for (const { path, hash } of todo) {
     const dest = `${f.FIT_CAPTURE.dir}/${path}`;
     if (existsSync(abs(dest))) {
       throw new Error(`capture ${dest} exists: a capture is written once`);
     }
     let blob;
     try {
       blob = execFileSync('git', ['--no-pager', 'show', `${f.FIT_CAPTURE.commit}:${path}`], {
         cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'],
       });
     } catch {
       throw new Error(`git show ${f.FIT_CAPTURE.commit}:${path} failed: nothing written`);
     }
     const text = lf(blob.replace(/^\uFEFF/, '')).replace(/\n/g, '\r\n');
     if (sha256Text(text) !== hash) {
       throw new Error(`${f.FIT_CAPTURE.commit}:${path} is not the indexed text (sha256Lf ${sha256Text(text)}, indexed ${hash}): nothing written`);
     }
     mkdirSync(dirname(abs(dest)), { recursive: true });
     writeFileSync(abs(dest), text, { encoding: 'utf8', flag: 'wx' });
     console.log(`captured ${dest} (normalized text of ${f.FIT_CAPTURE.commit}:${path}, sha256Lf ${hash})`);
   }
   '@ | node --input-type=module -
   ```

   Run it with `$env:IG_CAPTURE_PATH` unset; the closing `'@` stands at the start of its line. It prints one `captured
   ...` line per path (three expected). Then run the same `fitIndex()` line again: it must print nothing. A captured file
   is written once and never edited; the record calls it a normalized text capture (step 3, `kind:
   'normalized-text'`).
2. In `tools/ig-proto/freeze.mjs`, add and export:

   ```js
   export const FREEZE_PATH = 'docs/improve-generating/evidence/frozen/V4-S3/freeze.json';
   export const FREEZE_SEEDS = Object.freeze({
     used: FIT_SEEDS_USED,
     fitting: [
       'landscape/<cell>/<rep>, reps 0-4: V4-S2, V4-S2B and the Hell 1 check of V4-S3P',
       'the provisional reps 0-5',
       'MP12b1 reps 0-19 (reps 10-19 fitted prior-v1)',
       "PM1's first slice (ig-pm1/...; IGP-05)",
       'R28',
       'the parity, replay and kernel streams (ig-v4/parity/..., ig-v4/replay/..., ig-v4/kernel/...)',
     ],
     excluded: ['validation reps 20-39', 'Master reps 20-24', 'second validation reps 40-59'],
   });
   ```

3. Export `freezeRecord({ variants, fit, proofs, meta })` (pure): returns `{ format: 'ig-v4-freeze', version: 1, classes:
   FREEZE_CLASSES, bounds: FREEZE_BOUNDS, tables: FREEZE_TABLES, values: FREEZE_VALUES, variants, seeds: FREEZE_SEEDS,
   fit, proofs, meta }` (plain copies: `JSON.parse(JSON.stringify(...))` of the frozen constants), where `variants` maps
   the four of `FROZEN_VARIANTS` to `{ treeId, paramsHash }`, `proofs` is a `{ path, sha256 }` list and `fit` is `{
   hash: 'sha256Lf: the SHA-256 of the UTF-8 text with every CRLF replaced by LF (lib/records.mjs sha256Text); the
   fit-read records name it sha256', indices: [{ path, key, entries, sha256 }], files: [{ path, sha256 }], checked,
   captures }` (`indices` from `fitIndex()` with each index file's own `sha256File`; `files` the `FIT_INPUTS` with
   `sha256File`; `captures` as `fitIndex()` gives them).
4. Export `freezeMarkdown(record)` (pure): a banner line (`banner(record.meta)` of `./lib/records.mjs`, as the other
   records'; without `meta.source`, no banner line), then `# The freeze of stage 3 (V4-S3)`, and the tables: `| Class |
   Cells | Bounds | W_screen |` (one row per class; `W` `none` for null, else in M units, for example `190 M`); `| Table
   | Id |`; the prior's twelve Hell 1 shares and "the 15 Nightmare entries of prior-v1"; `| Mode | Nightmare | Hell 1 |`
   for the call budget in G units (10 G, 40 G; 32 G, 40 G); the bound; the deadline (reserve, set-stage cap, generation
   stop, response bound); the mechanisms (`c4` off, rescue re-rating with `rerateMax` 4, no ranker, per-set prior on
   Hell 1, the reference kernel); `| Variant | Tree id | Parameter hash |`; the seeds (used, fitting, excluded); the fit:
   the hash convention, `| Fit index | Entries | SHA-256 |`, `| Fit file | SHA-256 |`, `| Captured source | From |
   Captured at | sha256Lf |`, the number checked; `| Proof | SHA-256 |`. Lines end with `\n` (`writeText` writes CRLF).
5. Export `async function writeCommand(argv, io = {})` and add `write` to `main` (`write` → `writeCommand(rest)`): values
   `task`, `label`, `source-label`; `io = { outDir = 'docs/improve-generating/evidence/frozen/V4-S3', fit = {} }` (a test
   passes a private `outDir` and `fit`, the options of `fitIndex`). Refusals (exit 1, `freeze: <reason>`, nothing
   written), in this order: `--label frozen only`; `the freeze record is V4-S3's` when `--task` is not `V4-S3`; `<path>
   exists: the freeze record is written once` when `<outDir>/freeze.json` or `freeze.md` exists; `fit index: <the first
   problem> (<n> problems)` when `fitIndex(fit)` has a problem; `check failed (<n> of 6): <name>: <detail>` when a check
   of `freezeChecks()` fails (its first failing check); `the proofs of the epoch do not stand (<arm>: <reasons>)` when a
   V4-S3P binding is missing or `checkAccepted` with the arm's identity today is not `pass`; `missing fit input <path>`
   for the first absent path of `FIT_INPUTS` (with `io.fit.files` replacing `FIT_INPUTS` when given). Then build
   `variants` from `freezeChecks().trees`, `fit` (step 3), `proofs` = the four binding paths with their `sha256File`,
   `meta = await buildMeta({ task: 'V4-S3', label: 'frozen', kind: 'freeze', trees: [...FROZEN_VARIANTS], sourceLabel })`;
   `writeJson` the record to `<outDir>/freeze.json` and `writeText` `freezeMarkdown(record)` to `<outDir>/freeze.md`;
   print `freeze: wrote <outDir>/freeze.json and freeze.md (5 classes, 19 cells, 4 variants, <checked> fit entries,
   <c> captures)` and return 0. (The imports extend those of T08b and T12a, never redeclare them: `buildMeta`,
   `writeText`, `sha256File`, `banner` join the `./lib/records.mjs` import; `checkAccepted` joins T12a's
   `./lib/proof.mjs` import, which has `readRepoFile`; `abs` joins the `./lib/paths.mjs` import.)
6. Add to `freezeChecks()` a seventh check, `record`, only when `abs(FREEZE_PATH)` exists: the file's `classes`,
   `bounds`, `tables`, `values` and `seeds` deep-equal the constants, its `variants` equal the four trees' identities
   today, and `freezeMismatch(<the file>, <the comparator cells of check 1>)` is empty; `main`'s summary line then says
   `(7 checks; ...)` (T08b's `main` prints `checks.length` in both lines, `(<k> checks; ...)` and `(<n> of <k>)`, so it
   needs no change for this; R-P24-12).
7. Run `node tools\ig-proto\freeze.mjs check ...` (six pass), then `node tools\ig-proto\freeze.mjs write --task V4-S3
   --label frozen --source-label "frozen 3fc65f4"`, then the check again (seven pass), then the second `write` (refused).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `freeze: the record and its markdown` | `freezeRecord({ variants: { 'fr-frozen': { treeId: 'a', paramsHash: 'b' }, 'fr-frozen-none': { treeId: 'c', paramsHash: 'd' }, 'fr-frozen-uncapped': { treeId: 'e', paramsHash: 'f' }, 'fr-frozen-none-uncapped': { treeId: 'g', paramsHash: 'h' } }, fit: { hash: 'sha256Lf: ...', indices: [{ path: 'i', key: 'sha256Lf', entries: 1, sha256: 'z' }], files: [{ path: 'x', sha256: 'y' }], checked: 1, captures: [{ path: 'tools/m.mjs', sourceCommit: '57ef5cf', capturedPath: 'cap/tools/m.mjs', hash: 'q', index: 'i' }] }, proofs: [], meta: {} })`; `freezeMarkdown` of it | `format` `ig-v4-freeze`, `version` 1; `classes` deep-equal `FREEZE_CLASSES` (5 classes, 19 cells); `values.W['n-upper']` 190000000; `values.callBudget.require.nightmare` 32000000000; `seeds.used` deep-equal `FIT_SEEDS_USED`; `seeds.excluded` the three excluded reps; `variants` and `fit` as given; `JSON.parse(JSON.stringify(record))` deep-equals the record; the markdown contains `\| n-upper \| 15x20-nightmare, 18x18-nightmare \| nightmare 257-324 \| 190 M \|`, `\| require \| 32 G \| 40 G \|` and `\| tools/m.mjs \| 57ef5cf \| cap/tools/m.mjs \| q \|` |
| same | `freeze: write refuses a changed or missing fit input` | a private folder `tests/artifacts/ig-proto/selftest/S24-T12b-dev/` (removed first and at the end) with `a.json` (`{"a":1}`) and `idx.json` `[{ "path": "tests/artifacts/ig-proto/selftest/S24-T12b-dev/a.json", "sha256Lf": <sha256Text of a.json> }]`; `writeCommand(['--task', 'V4-S3', '--label', 'frozen', '--source-label', 'self-test'], { outDir: '<folder>/out', fit: { indices: [{ path: '<folder>/idx.json', field: null, key: 'sha256Lf' }] } })` after changing one byte of `a.json` (`{"a":2}`); then after deleting `a.json` | returns 1 with `freeze: fit index: fit input <folder>/a.json changed (index <folder>/idx.json) (1 problems)`; then 1 with `freeze: fit index: missing fit input <folder>/a.json (index <folder>/idx.json) (1 problems)`; neither `<folder>/out/freeze.json` nor `freeze.md` exists after either call |

## Documentation

README, the subsection `### freeze.json (T12a, T12b)`: the record's fields (the fit index, its hash convention, the
captures and how they were made: normalized text captures, CRLF and UTF-8 without BOM, of `57ef5cf:<path>` read with
the developer's read-only `git --no-pager show`, compared by `sha256Lf`, written once, never byte-for-byte Git-blob
copies; the seeds used), its readers (`activate`, `V4-LIVE`'s prerequisites, the live receipt
and its acceptance), the refusals of `write`, "written once; a different freeze is a new task id and file", the seventh
check; `## Commands` gains `node tools\ig-proto\freeze.mjs write --task V4-S3 --label frozen --source-label "frozen
3fc65f4"` (once, by T12b).

In the subsection `### The freeze checks (T08b)` (ruling R-P24-12), exactly these edits, each paragraph rewrapped to the
section's width and nothing else changed:

- in check 5, the words "the two screen arms differ only in" become "the screen arm `fr-frozen` and the no-screen arm
  `fr-frozen-none` differ only in";
- in the paragraph on the output, `(6 checks;` becomes `(<k> checks;`, `(<n> of 6)` becomes `(<n> of <k>)`, and "and
  exits 1." becomes "and exits 1, where `<k>` is 6, or 7 once `freeze.json` exists (the seventh check, `record`, in
  `### freeze.json (T12a, T12b)`)."

Three more edits, which the write makes necessary (ruling R-P24-17; each paragraph rewrapped to its section's width,
nothing else changed, and no other file touched: `freeze.mjs`'s hash is in `freeze.json`'s `fit.files`):

- in `## Commands`, the comment of the `freeze.mjs check` line, `# unlocked (T08b): the six checks of the four frozen
  trees against the freeze's constants`, becomes `# unlocked (T08b, T12b): the six checks of the four frozen trees
  against the freeze's constants, and a seventh, record, once freeze.json exists`;
- in the frozen family's section, the bullet "**A candidate epoch** until T12b records it in `freeze.json`: the four
  trees are proved by `V4-S3P` and read by T11, and nothing else depends on their tree ids until then." becomes
  "**The epoch.** A candidate epoch until T12b recorded it in `freeze.json`: `V4-S3P` proved the four trees and T11 read
  them (outcome (A)); the record's `variants` now hold their tree ids and parameter hashes.";
- at the end of the first paragraph of `### freeze.json (T12a, T12b)`, the sentence "Its Markdown starts with the
  records' common banner, whose re-run hint names a plan `V4-S3.json` that does not exist: the freeze has no plan, and
  `freeze.mjs check` (the seventh check) re-checks the written record."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T12b --label frozen` | repository root, first | `firewall: snapshot of S24-T12b` | 1 min |
| step 1's captures and the second `fitIndex()` line | repository root | three `captured ... (normalized text of 57ef5cf:<path>, sha256Lf <hash>)` lines; then no output | 3 min |
| the capture block again, with `$env:IG_CAPTURE_PATH = 'tools/ig-proto/manifest.mjs'` and `$env:IG_CAPTURE_HASH = '0' * 64`, the destination's `Get-FileHash` taken before and after | PowerShell 7 at the repository root | the error `capture docs/improve-generating/evidence/frozen/V4-S3/fit-sources/tools/ig-proto/manifest.mjs exists: a capture is written once`; the two hashes equal (an existing capture is never truncated) | 1 min |
| the capture block again, with `$env:IG_CAPTURE_PATH = 'tools/ig-proto/no-such-file.mjs'` and `$env:IG_CAPTURE_HASH = '0' * 64`; then `Test-Path docs\improve-generating\evidence\frozen\V4-S3\fit-sources\tools\ig-proto\no-such-file.mjs`; then `Remove-Item Env:IG_CAPTURE_PATH, Env:IG_CAPTURE_HASH` | PowerShell 7 at the repository root | the error `git show 57ef5cf:tools/ig-proto/no-such-file.mjs failed: nothing written`; `False` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T12b --horizon-s 285` | repository root (unlocked) | every case `PASS`; no folder `tests\artifacts\ig-proto\selftest\S24-T12b-dev` left | 5 min |
| `node tools\ig-proto\freeze.mjs check --label frozen --source-label "frozen 3fc65f4"` | repository root | `freeze: check pass (6 checks; ...)` | 5 min |
| `node tools\ig-proto\freeze.mjs write --task V4-S3 --label frozen --source-label "frozen 3fc65f4"` | repository root | `freeze: wrote docs/improve-generating/evidence/frozen/V4-S3/freeze.json and freeze.md (5 classes, 19 cells, 4 variants, <n> fit entries, <c> captures)` | 5 min |
| the same `check` | repository root | `freeze: check pass (7 checks; ...)` | 5 min |
| the same `write` again | repository root | `freeze: docs/improve-generating/evidence/frozen/V4-S3/freeze.json exists: the freeze record is written once`, exit 1 | 1 min |
| `node tools\ig-proto\manifest.mjs check-prerequisites --plan V4-LIVE --label frozen --source-label "frozen 3fc65f4"` | repository root | `prerequisites: pass` | 2 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T12b --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the files of the Scope | 1 min |

## Stop points and questions

- Stop before writing when T11's note does not state a jointly signed acceptance of the final epoch (outcome (A)); after
  an outcome (B) or (C) this task is replaced by the pack author's revised task (its constants and proof paths).
- Stop and report any problem of `fitIndex()` other than one of the three named uncaptured harness sources
  (`tools/ig-proto/lib/lane-worker.mjs`, `tools/ig-proto/manifest.mjs`, `tools/ig-proto/v4-check.mjs`), any capture
  refusal other than the two planned ones of the gates, and any refusal of `write` other than the planned second one.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T12b-B01 | The freeze is recorded once, with what was fitted (the validated transitive inputs and the captured sources), on which records and reps, the trees it binds and their proofs; stage 4 can read it | the write; the seventh check; `check-prerequisites --plan V4-LIVE` | the outputs; `freeze.json`, `freeze.md` |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T12b-T01 | `freezeRecord` and `freezeMarkdown` as the Tests table says | `--items` | the PASS line |
| T12b-T02 | `write` refuses a changed or missing fit input before creating either file | `--items` | the PASS line |
| T12b-T03 | The record equals the constants, names the four trees of today, holds the fit index with no problem, matches the 19 comparator cells, and is refused a second time | the checks and the second write | the outputs |
| T12b-T04 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the four tree ids of the record, the fit
entries checked, the captures); each AC row with its evidence; the questions and rulings; the deviations; and the named
items for later.

## Execution log (filled by the orchestrator, not by the developer)

| Item | Value |
|---|---|
| Start, end, duration | 2026-11-24 09:05:34 to 09:14:26 +07:00 (developer), fix round 09:24-09:27; accepted 09:29; about 24 min |
| Waiting for rulings | about 8 min (R-P24-17) |
| Agent id, model | 7d4e78b2-6264-4871-b546-e2c81ad33482, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 68; 8,852,468 / 55,191 / 8,492,753 |
| AI credits | 230.04 |
| Questions and rulings | no QUESTION; nine deviations and two named items ruled by SA-Opus (R-P24-17): all accepted, a README-only fix round (the `check` line comment, the epoch bullet, the banner sentence) |
| Fix rounds | 1 (README only, R-P24-17) |
| Gates re-run by the orchestrator | firewall check S24-T12b OK (289 files); `--items` 235 passed, 0 failed (234 `freeze: the record and its markdown`, 235 `freeze: write refuses a changed or missing fit input`), no `S24-T12b-dev` folder left; `freeze.mjs check` `record pass (19 cells in their classes; the four trees as today)`, `check pass (7 checks; ...)`; second `write` refused (exit 1); `check-prerequisites --plan V4-LIVE` pass; `fitIndex()` 5697 checked, 3 captures, 0 problems; README diff against a38d9f7 +45 / -6 (only the R-P24-12 and R-P24-17 lines); `npm run check` OK; G1, G2 empty; G3 the Scope files |
| Commit | this task's commit |
| Issues and named items | none open; `freeze.json` written once: 5 classes, 19 cells, 4 variants (b3e530b1, fa903f39, 96ef38e2, e31d829d), 5,697 fit entries, 3 captures (lib/lane-worker.mjs, manifest.mjs, v4-check.mjs of 57ef5cf) |

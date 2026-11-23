# T02c: The fitting reader, part 2: the commands `preview` and `prefixes` and their records

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §8.2 T02 and S-1, §8.2 T11 (the read gate), §4.4, §4.7; pack decision D-P24-07 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T02b |
| Depends on | T02b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (reads records; unlocked) |

## Goal

The SAs' readings (S01 on `V4-S2B`, T11 on `V4-S3P`) must be reproducible commands that read exactly the plan's
declared rows, record every input they read with its hash, and report every missing, unexpected, invalid or ambiguous
member as a warning. This task adds the two commands of `tools/ig-proto/fit-read.mjs` on T02b's pure functions, their
records (written once), their refusals, and a command seam for their tests.

## Authority and fixed points

- SA-Astra's review R03: "Emit one prefixes row for every declared key, including a missing/not-done one. Read its
  publication, shard declaration, row identity, worker journals and linkage. Preserve parsing and `rowLedger` problems
  in `problems`; do not call a missing linkage an empty successful ledger. Return `rowStatus`, `complete` and
  `unreadable` separately." "Include `inputs: [{ path, sha256 }]` for every file actually read, using `sha256File`, plus
  a declared/missing/unexpected row summary. Missing or ambiguous evidence is a fitting warning, never zero work or a
  clear budget reading."
- SA-Astra's review R14: "`fit-read: command refusals`: existing output, zero/non-integer budget, invalid bound, wrong
  label and historical task each exit 1 and write nothing." The tests call the exported command with a private output
  folder (`io.outDir`) and private input folders, never a historical namespace.
- The publication of a shard is T01a's `publicationOf(outDir, name)` (`arm.mjs`): `none`, `complete` or `incomplete`.
- **The row identity** (SA-Astra's review R2-03, verbatim): "Use a shared `declaredRowProblem(declared, row)` check in
  both commands: the row's key, case, rep and seed must match the declared entry before `ingestRow`. A mismatched row
  is `invalid` with `wrong declared identity`; it cannot produce a clear fitting row. Read and hash
  `<rawDir>/<shard>/shard.json` and `<rowKey>.row.jsonl`. Require the declaration's task/arm/case/rep/seed and the raw
  row identity to agree with the publication. Compare the stored shard tree/copy/producer identities with the
  publication's metadata. A missing, malformed or mismatched identity is a row problem. Keep these checks separate from
  ledger closure and preserve all their reasons in the output." The raw files at the base: `arm.mjs run` writes
  `<rawDir>/<shard>/shard.json` (`arm.mjs:116-120`: `format` `ig-proto-shard`, `version` 1, `task`, `arm`, `shard`,
  `variant`, `rows` `[{ key, caseId, rep, seed, ... }]`, `treeId`, `copyDigest`, `harnessHash`), and the variant `log`
  writes `logs/<rowKey>.row.jsonl` with one line `{ t: 'row', row, seed, caseId, localRep, pid }`
  (`variants/log.json:51`); `arm.mjs publish` writes `<shard>.runs.json` `{ meta, shard, rows }` whose `meta` is
  `buildMeta`'s (`lib/records.mjs:161-206`: `meta.trees[<variant>] = { treeId, copyDigest, edits, params }`, `meta.harness
  = harnessInfo()`).
- SA-Astra's review R3-02: two absent identities never compare equal, and a duplicate shard entry or row header is
  ambiguous evidence: step 5 requires every identity field as a nonempty string and exactly one matching shard entry
  and row header; missing or ambiguous identity evidence is a row problem, never a clear fitting row under T11's read
  gate.
- D-P24-07: the records go to `docs/improve-generating/evidence/frozen/<task>/fit-read-<command>-<arm>.json` and `.md`,
  written once per task and arm. Read-only on every published or raw file.

## Scope

- Change: `tools/ig-proto/fit-read.mjs`: the exported `rawIdentityProblems`, `previewCommand(argv, io)`,
  `prefixesCommand(argv, io)` and `main`.
- Change: `tools/ig-proto/self-test.mjs`: three cases appended to `itemCases` (`--items`).
- Change: `tools/ig-proto/README.md`: a new section `## The fitting reader (stages 2 to 4 pack, T02b and T02c)` before
  `## Phase-1 bench of P6 (V4-T14)` (line 2586 at the base).
- Do not change: every other file. Guards: G1, G2, G3; G3 lists only `tools/ig-proto/fit-read.mjs`,
  `tools/ig-proto/self-test.mjs`, `tools/ig-proto/README.md`.

## Steps

1. Imports added to `fit-read.mjs`: `existsSync`, `readdirSync`, `readFileSync` from `node:fs`; `join` from
   `node:path`; `pathToFileURL` from `node:url`; `abs`, `artifactDir`, `evidenceDir`, `IG_DIR`, `mp12b1Report`,
   `parseArgs`, `rel` from `./lib/paths.mjs`; `banner`, `buildMeta`, `sha256File`, `writeJson`, `writeText` from
   `./lib/records.mjs`; `parseLines`, `rowLedger` from `./verdicts.mjs`; `publicationOf` from `./arm.mjs`.
2. **Common rules** of both commands (each refusal prints `fit-read: <reason>` on stderr, returns 1 and writes
   nothing): `--label frozen only`; `needs --task and --arm`; `<task> is a historical namespace: its records are read by
   the SAs' scripts, never written` for `IGP-02`, `V4-T04`, `V4-T04v4`, `V4-T04f`, `V4-T04i`, `V4-S2`, `V4-S2P`,
   `V4-S2K`, `V4-S2W`; `no plan tools/ig-proto/plans/<task>.json`; `fitScope`'s throw (without the `fit-read: `
   prefix); `a record is written once (<rel path>)` when the output exists. The folders come from `io`: `{ outDir =
   evidenceDir('frozen', task), plansDir = join(IG_DIR, 'plans'), runsDir = evidenceDir('frozen', task, arm), rawDir =
   artifactDir('frozen', task, arm) }` (tests pass private folders under `tests/artifacts/ig-proto/selftest/`). Every
   file read is added once to `inputs` as `{ path: rel(file), sha256: sha256File(file) }`; the plan file first.
3. `export async function previewCommand(argv, io = {})` (`preview --task <T> --arm <A> --label frozen --source-label
   <SL>`): the declared grid `fitScope(plan, arm)`; every `*.runs.json` of `runsDir` (name order) and its rows; the
   published rows grouped by cell; `unexpected` the published row keys that are not declared; per declared cell (in
   grid order) `mp12b1Report(cell)` (null: every pair of the cell has the problem `no MP12b1 report`; else its `path` is
   an input) and `previewCell(cell, declared of the cell, published of the cell, report.runs)`. Writes
   `fit-read-preview-<A>.json` (`{ meta: await buildMeta({ task, label: 'frozen', kind: 'fit-read-preview', sourceLabel
   }), arm, note: 'Five fitting seeds and a different time: a fitting warning, never the stage-4 no-regression
   verdict.', declared: <n>, missing: [<declared keys without a row>], unexpected, cells: [...], inputs }`) and `.md` (a
   banner, the note, the table `| Cell | today ten (of 5) | after ten (of 5) | ratios rep 0-4 | geo | lower | lower >=
   0.9 | problems |`, numbers to 3 decimals, `-` for null, then the missing and unexpected keys) and prints `fit-read:
   wrote <rel json> (<cells> cells, <p> problems, <u> unexpected)`; returns 0.
4. `export async function prefixesCommand(argv, io = {})` (`prefixes --task <T> --arm <A> --budget
   <level>=<units>[,<level>=<units>...] [--bound <n>] --label frozen --source-label <SL>`): refusals added to step 2's:
   `bad --budget <value>` unless every entry is `<level>=<units>` with `<units>` an integer above 0 (`0`, `1.5`, `x`
   refused); `bad --bound <value>` unless an integer from 1 to 32. For every declared key, in grid order, one row
   object: `shard` from the grid; `publication` `publicationOf(runsDir, shard)`; `shardDone` the raw
   `<rawDir>/<shard>/state.json`'s `done === true` (absent: false); `rowStatus` `missing` without a published row,
   `duplicate` with two, else `invalid` when `declaredRowProblem(<the key's declared entry>, row)` is not null, else the
   `ingestRow(row, { quantity: 10 }).status` of the key's published row; the shard declaration
   `<rawDir>/<shard>/shard.json` and the row identity file `<rawDir>/<shard>/logs/<rowKey>.row.jsonl` (both added to
   `inputs` when present; parsed with `JSON.parse` and `parseLines`; an absent file is null; an unparseable one is null
   and adds the identity problem `unreadable <rel path>`); the publication's `meta` (of the runs file that holds the
   key's row, else of `<runsDir>/<shard>.runs.json`; null when there is none); `identity` = the declared-row problem
   (when not null) followed by `rawIdentityProblems({ task, arm, declared: <the key's declared entry>, shard, rowLines,
   meta })` (step 5), kept apart from `problems`; the raw journal files of the key in `<rawDir>/<shard>/logs/` (names
   starting `<rowKey>.`, ending `.jsonl`, not `.row.jsonl`, sorted; the link file `<rowKey>.link.jsonl` apart, null when
   absent) read with `parseLines`; `unreadable` true when a file has parse problems; `rowLedger(lines, links)`;
   `callPrefixes(lines, budgets)` and, with `--bound`, `boundFirings`. The row: `{ rowKey, cell, rep, shard,
   publication, shardDone, rowStatus, identity, complete: ledger.complete, unreadable, problems: [...parse problems,
   ...ledger.problems, ...prefixes.problems], calls: <counts by status>, maxSpent, affected: [<ids>],
   potentiallyAffected: [...], ambiguous: [...], bound: <boundFirings or null> }` (a missing linkage keeps the ledger's
   problem `no linkage`; nothing missing is read as zero work). `summary`: `{ declared, present: <rows with a published
   row and a journal>, missing: [<keys>], unexpected: [<published or raw row keys not declared>], identityRows: <rows
   with a non-empty identity>, incompleteRows, unreadableRows, ambiguousRows, affectedCalls, potentiallyAffectedCalls,
   ambiguousCalls, boundFirings }`. Writes
   `fit-read-prefixes-<A>.json` (`{ meta, arm, budgets, bound, rows, summary, inputs }`) and `.md` (a banner, the
   budgets, one line per cell, then every row with an identity problem or a problem, and its reasons), and prints
   `fit-read: wrote <rel json> (<rows> rows, <missing> missing, <identity> identity problems, <incomplete> incomplete,
   <a> affected, <p> potentially affected, <m> ambiguous, <b> bound firings)`; returns 0. The verdict words of the gate
   are the SAs' (T11), not the tool's.
5. `export function rawIdentityProblems({ task, arm, declared, shard, rowLines, meta })` (pure): return the following
   problems in this order; never throw for malformed identity input. A "record" is a non-null, non-array object; a
   "nonempty string" has type `string` and `trim().length > 0`.
   - When `shard` is null, return only `no shard declaration`. When it is not a record, its format is not
     `ig-proto-shard`, its version is not 1, or its `rows` is not an array of records, return only `the shard
     declaration is malformed`.
   - Unless the shard's task, arm and shard match `task`, `arm` and `declared.shard`, add `the shard declaration is of
     <shard.task>/<shard.arm>/<shard.shard>`.
   - For `variant`, `treeId`, `copyDigest`, `harnessHash`, in that order, require a nonempty string; otherwise add `the
     shard's <field> is missing or malformed`.
   - Filter `shard.rows` for `key === declared.rowKey`. With zero entries, add `the shard does not declare <rowKey>`;
     with more than one, add `the shard declares <rowKey> more than once`. Only with exactly one, compare its `caseId`,
     `rep`, `seed` with the declared tuple and, when unequal, add `the shard declares <rowKey> as <caseId>/<rep>/<seed>`.
   - With null `rowLines`, add `no row identity`. With a non-array or a member that is not a record, add `the row
     identity is malformed`. Otherwise filter the lines for `t === 'row'`: zero gives `no row identity`; more than one
     gives `the row identity appears more than once`. Only with exactly one, compare `row`, `caseId`, `seed` with the
     declared `rowKey`, `caseId`, `seed`; when unequal, add `the row identity names <row>/<caseId>/<seed>`.
   - With null `meta`, add `no publication metadata` and finish. With metadata that is not a record, add `the
     publication metadata is malformed` and finish. Let `tree` be `meta.trees[shard.variant]` only when `meta.trees` is
     a record and `shard.variant` is a nonempty string, otherwise undefined.
   - Require a record `tree` with a nonempty `treeId`, otherwise add `the publication's tree identity is missing or
     malformed`. If both its `treeId` and the shard's are nonempty strings, compare them; unequal gives `the
     publication's tree <tree.treeId> is not the shard's <shard.treeId>`.
   - Require a record `tree` with a nonempty `copyDigest`, otherwise add `the publication's copy identity is missing or
     malformed`. If both its `copyDigest` and the shard's are nonempty strings, compare them; unequal gives `the
     publication's copy <tree.copyDigest> is not the shard's <shard.copyDigest>`.
   - Require a record `meta.harness` with a nonempty `harnessHash`, otherwise add `the publication's producer identity
     is missing or malformed`. If both its hash and the shard's are nonempty strings, compare them; unequal gives `the
     publication's producer <meta.harness.harnessHash> is not the shard's <shard.harnessHash>`.

   Keep these identity problems separate from ledger and parse problems as step 4 specifies.
6. `export async function main(argv)`: `preview` → `previewCommand(rest)`, `prefixes` → `prefixesCommand(rest)`, else
   the usage (the two usage lines) and 1; guarded by `if (process.argv[1] && import.meta.url ===
   pathToFileURL(process.argv[1]).href) { process.exitCode = await main(process.argv.slice(2)); }`.

## Tests

The fixtures live in the private folder `tests/artifacts/ig-proto/selftest/S24-T02c-dev/`, built by a helper
`fitFixture(dir)` in `self-test.mjs` that empties `dir` first; every case builds its own fixture in its own subfolder
`<case>/<scenario>/` and the folder is removed at the end. A fixture holds: a plan `plans/V4-XX.json` with the two steps
of T02b's synthetic plan (task `V4-XX`; arm `a`, shard `pilot-x`, `x:0-4`); a runs folder `runs/` with
`pilot-x.runs.json` (`{ meta: { trees: { v: { treeId: 'T', copyDigest: 'C' } }, harness: { harnessHash: 'H' } }, shard:
'pilot-x', rows: <the five rows of T02b's preview case> }`, written with `writeJson`) and `pilot-x.runs.md` (the text `#
pilot-x`, which names no journal: a complete publication by T01a's `publicationOf`); a raw folder `raw/pilot-x/` with
`state.json` `{ done: true }`, the shard declaration `shard.json` `{ format: 'ig-proto-shard', version: 1, task: 'V4-XX',
arm: 'a', shard: 'pilot-x', variant: 'v', rows: [{ key: 'x~<r>', caseId: 'x', rep: r, seed: 'landscape/x/<r>' } for r
0 to 4], treeId: 'T', copyDigest: 'C', harnessHash: 'H' }` and, per row, `logs/x~<r>.row.jsonl` (the line `{ t: 'row',
row: 'x~<r>', seed: 'landscape/x/<r>', caseId: 'x', localRep: 0, pid: 1 }`), `logs/x~<r>.1.2.jsonl` (one JSON line
each, call `c = 'x~<r>:1:2:1'`: `{ t: 'start', call: c, stage: 'set', attempt: 0, at: 10, level: 'nightmare' }`, then
`ledgerLines()`'s (`self-test.mjs:1069`) `C(c), B(c), P(c, 0, 100, 0), B(c), P(c, 1, 50, 10), E(c, 160, 2, 0)`) and
`logs/x~<r>.link.jsonl` (`{ t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' }`); and `mp12b1-x.json` (`{ runs:
<T02b's today runs> }`, written with `writeJson`).

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `fit-read: prefixes of a declared grid` | `prefixesCommand(['--task', 'V4-XX', '--arm', 'a', '--budget', 'nightmare=9000000000', '--bound', '4', '--label', 'frozen', '--source-label', 'self-test'], { outDir, plansDir, runsDir, rawDir })` on a fixture; then, each on its own fresh fixture: (1) rep 3's link file removed; (2) rep 2's journal with a `p` line of an unstarted call `zz`; (3) rep 4's published row removed; (4) an extra published row `x~7`; (5) rep 1's published row with `seed` `landscape/x/20` and its run's `seed` the same (a self-consistent wrong seed); (6) rep 2's published row with `rep` 7; (7) rep 3's `x~3.row.jsonl` removed; (8) `shard.json`'s `harnessHash` `H2`; (9) `shard.json` removed; (10) `treeId`, `copyDigest` and `harnessHash` removed from `shard.json`, `treeId` and `copyDigest` removed from the publication's `meta.trees.v`, and `harnessHash` removed from its `meta.harness`; (11) both the shard's and the publication's `harnessHash` set to `''`; (12) a duplicate of `x~0`'s entry appended to `shard.rows`; (13) a duplicate of the row header appended to `logs/x~0.row.jsonl` | returns 0; `fit-read-prefixes-a.json` has five rows, each `publication` `complete`, `shardDone` true, `rowStatus` `valid`, `identity` `[]`, `complete` true, `problems` `[]`; `summary.declared` 5, `missing` `[]`, `unexpected` `[]`, `identityRows` 0; `inputs` holds the plan, the runs file, `shard.json`, every `.row.jsonl` and every journal file with their sha256; then (1) rep 3's row `complete` false with `problems` holding `no linkage`; (2) rep 2's row with `unowned p line zz`; (3) rep 4's row `rowStatus` `missing` and `summary.missing` `['x~4']`; (4) `summary.unexpected` `['x~7']`; (5) rep 1's row `rowStatus` `invalid`, `identity` `['wrong declared identity (seed "landscape/x/20", declared "landscape/x/1")']`; (6) rep 2's row `invalid` with `wrong declared identity (rep 7, declared 2)`; (7) rep 3's `identity` `['no row identity']`; (8) every row's `identity` `["the publication's producer H is not the shard's H2"]`, `summary.identityRows` 5; (9) every row's `identity` `['no shard declaration']`; (10) every row's `identity` `["the shard's treeId is missing or malformed", "the shard's copyDigest is missing or malformed", "the shard's harnessHash is missing or malformed", "the publication's tree identity is missing or malformed", "the publication's copy identity is missing or malformed", "the publication's producer identity is missing or malformed"]`, `summary.identityRows` 5; (11) every row's `identity` `["the shard's harnessHash is missing or malformed", "the publication's producer identity is missing or malformed"]`, `summary.identityRows` 5; (12) `x~0`'s `identity` `['the shard declares x~0 more than once']` and every other row's `[]`, `summary.identityRows` 1; (13) `x~0`'s `identity` `['the row identity appears more than once']` and every other row's `[]`, `summary.identityRows` 1; in (5) to (13) the ledger fields and `problems` as in the clean run (the identity is kept apart) |
| same | `fit-read: preview of a declared grid` | `previewCommand(['--task', 'V4-XX', '--arm', 'a', '--label', 'frozen', '--source-label', 'self-test'], { outDir, plansDir, runsDir, rawDir, mp12b1: (cell) => ({ path: <rel path of the fixture's mp12b1-x.json>, report: JSON.parse(readFileSync(<that file>, 'utf8')) }) })` (add this seam to `previewCommand`: `io.mp12b1 ?? mp12b1Report`) on a fresh fixture | returns 0; `fit-read-preview-a.json` `cells[0]` equal to T02b's clean preview of `x` (`ratios` `[1, 2, 1, 0.5, 1]`), `missing` `[]`, `unexpected` `[]`; `inputs` holds `mp12b1-x.json` with the sha256 of the file on disk |
| same | `fit-read: command refusals` | each scenario on its own fresh fixture: (a) `prefixesCommand` run once (returns 0), then the same call again (existing output); (b) `--budget nightmare=0`; (c) `--budget nightmare=1.5`; (d) `--bound 0`; (e) `--bound 33`; (f) `--label selftest`; (g) `--task V4-S2`; (h) `previewCommand` with `--task V4-S2B` and no plan in `plansDir` | (a) the second call returns 1 with `a record is written once (...)` and leaves the first output's bytes unchanged; (b) to (h) each returns 1 with its refusal text (`bad --budget nightmare=0`, `bad --budget nightmare=1.5`, `bad --bound 0`, `bad --bound 33`, `--label frozen only`, `V4-S2 is a historical namespace: ...`, `no plan ...`), no output exists before or after it, the sha256 of every file of its fixture is unchanged and no other file is created |

## Documentation

`tools/ig-proto/README.md`, new section `## The fitting reader (stages 2 to 4 pack, T02b and T02c)`: the two usage
lines; the declared grid (`fitScope`: the plan's `arm.mjs run` steps; fitting reps 0-4); what each command reads,
checks and writes (steps 3 and 4: the row validity, the declared identity, the journals, the inputs index, the
summary; step 5: the shard declaration and the row identity checked against the publication's metadata, every
identity field required and every matching shard entry and row header unique, kept apart
from the ledger); the gate's text of plan §8.2 (the prefix rule, between primitives); "missing, invalid or ambiguous evidence is a warning
with its reason, never zero work or a clear reading; the records are written once; the verdict words belong to the
SAs' readings (S01, T11)".

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T02c --label frozen` | repository root, first | `firewall: snapshot of S24-T02c` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T02c --horizon-s 285` | repository root (unlocked) | every case `PASS`; no folder `tests\artifacts\ig-proto\selftest\S24-T02c-dev` left | 5 min |
| `node tools\ig-proto\fit-read.mjs preview --task V4-S2 --arm fr-none --label frozen --source-label "frozen 3fc65f4"` | repository root | `fit-read: V4-S2 is a historical namespace: its records are read by the SAs' scripts, never written`, exit 1; nothing written | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T02c --label frozen` | repository root, last | `firewall: OK, <n> production files unchanged since the snapshot of S24-T02c` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

## Stop points and questions

- Stop and report before: running either command on `V4-S2B` or `V4-S3P` (S01 and T11 do it after their runs).
- Send `QUESTION:` to the pack author (through the orchestrator) when: `publicationOf` (T01a) does not return
  `complete` for the fixture's publication; the task looks wrong or contradicts the code; an ambiguity changes behaviour
  or a contract; a gate fails for a reason not covered here; a change is needed outside the scope; a recorded decision
  would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02c-B01 | The SAs can read the control pilot against today's search and the budgets against the uncapped calls by a command that reads exactly the declared rows, checks each row's declared and raw identity against its publication, binds its inputs and reports every gap with its reason | the cases; S01 runs it | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02c-T01 | The two commands write the Tests table's records, one prefixes row per declared key with its identity problems kept apart from its ledger problems, with the summary and the inputs index (the MP12b1 fixture file hashed from disk) | `--items` | the PASS lines |
| T02c-T02 | The commands refuse an existing record, a zero or non-integer budget, an invalid bound, a wrong label, a historical task and a missing plan, writing nothing | the refusal case and the refusal gate | the PASS line; the output |
| T02c-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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

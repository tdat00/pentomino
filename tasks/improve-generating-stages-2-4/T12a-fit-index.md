# T12a: The freeze's fit index: the validated transitive inputs of every fitted value (`freeze.mjs`)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §4.1, §4.2 (`fit`: "the hash of every input and script that fitted a value"), §4.7 (fitting seeds only), §6 T1, §8.2 T12; N-V4-03; this pack's D-P24-08 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T11 |
| Depends on | T11 with a jointly signed acceptance of the final epoch (outcome (A)); after an outcome (B) or (C), the revised task the pack author issues |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 2.5 h, machine 0 min (unlocked; pure function and synthetic cases) |

## Goal

The freeze must name, and prove unchanged, every input and script that fitted its values: not only the top-level
reports, but the indices of the analyses that fitted `W`, the P5 budgets, the prior, the reserve and deadline, and the
inputs those indices name. This task adds to `tools/ig-proto/freeze.mjs` the fit index: the constants of the indices and
files, and the pure validation that recomputes every indexed hash, accepts an immutable capture for a harness source
the pack edited since, refuses a missing or changed input, and refuses a validation, Master or second-validation
observation among the fitting inputs. T12b writes the record with it.

## Authority and fixed points

- SA-Astra's review R18 (verbatim): "`fit` is a validated transitive input index, not just `FIT_INPUTS`' top-level
  documents. Include the input indices and fitting scripts of the accepted analyses/reviews, the `fit-read` input
  indices from R03, T11's transport/projection scripts and their indexed inputs, and the prior generator's sources.
  Recompute immutable observation/derived-input hashes at freeze time and refuse a missing or changed input. Some
  historical indices also name mutable harness source paths: for those, bind an immutable copy of the indexed source
  epoch, with original path, source commit, captured path and the indexed hash. Do not compare today's deliberately
  edited harness against the old hash or relabel today's code as the old producer." "Existing indices use `sha256Lf`;
  interpret it explicitly, do not relabel it as a raw-byte hash." "The record identifies the fitting records/reps
  actually used; exclusion text is not a filter. A validation/Master-validation/second-validation observation in a
  fitting input is refused. Hashing a source file containing other reps does not authorize fitting those reps."
- **The hash convention.** `sha256Lf` is the SHA-256 of the file's UTF-8 text with every CRLF replaced by LF; it is the
  harness's `sha256Text` (`lib/records.mjs`: `sha256Text = (text) => sha256(lf(text))`), which `sha256File` also uses for
  a text file. SA-Astra's three indices and SA-Opus's index record it under the name `sha256Lf`; the `fit-read` records
  of T02c record the same value under `sha256` (`sha256File`). The fit index keeps each name as the index has it.
- **The indices** (checked by the pack author at `57ef5cf`: every entry of SA-Astra's three indices matches the working
  tree; `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-fit-index.mjs`):
  `docs/improve-generating-stages-2-4/evidence/sa-astra/input-index.json` (1,324 entries, an array),
  `.../sa-astra/review-input-index.json` (1,251, an array), `.../sa-astra/freeze-inputs.json` (39, its field `inputs`),
  `.../sa-opus/fit-input-index.json` (2,403, its field `entries`: SA-Opus's fitting scripts `s2-*.mjs` and
  `j1-numbers.mjs` cited by the joint report, their outputs, and every file of the two V4-S2 record roots they read,
  written by `bt-fit-index.mjs`), T11's `.../sa-opus/t11-transport-inputs.json` and `t11-projection-inputs.json`
  (arrays), and the three `fit-read` records of S01 and T11 (their field `inputs`), with SA-Astra's supplement
  `.../sa-astra/s01-review-checks.json` (its field `publicationInputs`, `sha256`: the eight `.runs.md` files that S01's
  prefixes record read through `publicationOf` but did not index; ruling R-P24-05; only this field is selected, never the
  review's broader `inputs`, which also record mutable draft and harness sources at the review epoch). Their entries'
  paths may use `\`; they are normalized to `/`.
- **Mutable harness sources** named by the indices: `tools/ig-proto/lib/lane-worker.mjs`, `tools/ig-proto/manifest.mjs`,
  `tools/ig-proto/v4-check.mjs`, `tools/ig-proto/verdicts.mjs`, `tools/ig-proto/linkage.mjs` (and the protected
  `tools/ig-proto/data/`, `plans/` and `variants/` files, which G2 keeps unchanged). This pack edits the first three
  (T02a, T03a, T05b, T09c, T10). An indexed `tools/` path whose hash differs today is accepted only through its capture
  `docs/improve-generating/evidence/frozen/V4-S3/fit-sources/<the same path>`, a normalized text capture (CRLF, UTF-8
  without BOM) of the blob of `57ef5cf` (T12b captures it with read-only git before the write; the harness runs no git).

## Scope

- Change: `tools/ig-proto/freeze.mjs`: the exported constants `FIT_INDICES`, `FIT_INPUTS`, `FIT_CAPTURE`,
  `FIT_SEEDS_USED` and the exported pure function `fitIndex`.
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `itemCases` (`--items`).
- Guards: G1, G2, G3 (the two files).

## Steps

1. In `tools/ig-proto/freeze.mjs`, change the `./lib/records.mjs` import of T08b (`lf`, `sha256`) to `lf`, `sha256`,
   `sha256Text`, and add `import { readRepoFile } from './lib/proof.mjs';` (`lib/proof.mjs:74`; T12b extends these two
   imports, never redeclares them; this task's gates run before T12b exists). Then add and export:

   ```js
   /** The indices that fitted the freeze, read transitively (R18); `field` null for an array file. */
   export const FIT_INDICES = Object.freeze([
     { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/input-index.json', field: null, key: 'sha256Lf' },
     { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/review-input-index.json', field: null, key: 'sha256Lf' },
     { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/freeze-inputs.json', field: 'inputs', key: 'sha256Lf' },
     { path: 'docs/improve-generating-stages-2-4/evidence/sa-opus/fit-input-index.json', field: 'entries', key: 'sha256Lf' },
     { path: 'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport-inputs.json', field: null, key: 'sha256Lf' },
     { path: 'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection-inputs.json', field: null, key: 'sha256Lf' },
     { path: 'docs/improve-generating/evidence/frozen/V4-S2B/fit-read-preview-fr-none.json', field: 'inputs', key: 'sha256' },
     { path: 'docs/improve-generating/evidence/frozen/V4-S2B/fit-read-prefixes-fr-none.json', field: 'inputs', key: 'sha256' },
     { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.json', field: 'publicationInputs', key: 'sha256' },
     { path: 'docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json', field: 'inputs', key: 'sha256' },
   ]);
   /** The top-level files and scripts of the fit (hashed as they are today; every index file is one too). */
   export const FIT_INPUTS = Object.freeze([
     'tools/ig-proto/freeze.mjs',
     'tools/ig-proto/fit-prior-s3.mjs',
     'tools/ig-proto/data/prior-s3-v1.json',
     'tools/ig-proto/data/prior-v1.json',
     'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-14x14-hell-1.calls.jsonl',
     'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-20x20-hell-1.calls.jsonl',
     'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-24x24-hell-1.calls.jsonl',
     'docs/improve-generating/evidence/frozen/V4-S2/fr-base/pilot-26x26-hell-1.calls.jsonl',
     'docs/improve-generating/evidence/provisional/IGP-05/families-windows.jsonl',
     'docs/improve-generating/evidence/provisional/IGP-05/families-failed-sets.jsonl',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/analyze-records.mjs',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/freeze-inputs.mjs',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/review-records.mjs',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/stage2-computed.json',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/stage2-computed.md',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/rows-computed.json',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/calls-computed.json',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/review-records.json',
     'docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.mjs',
     'docs/improve-generating-stages-2-4/evidence/sa-opus/bt-fit-index.mjs',
     'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-transport.mjs',
     'docs/improve-generating-stages-2-4/evidence/sa-opus/t11-projection.mjs',
     'docs/improve-generating-stages-2-4/report.md',
     'docs/improve-generating-stages-2-4/plan.md',
     'docs/improve-generating-stages-2-4/s01-reading.md',
     'docs/improve-generating-stages-2-4/t11-reading.md',
   ]);
   /** Where a mutable harness source's indexed epoch is captured, and from which commit. */
   export const FIT_CAPTURE = Object.freeze({ dir: 'docs/improve-generating/evidence/frozen/V4-S3/fit-sources', commit: '57ef5cf' });
   /** The fitting records and reps actually used (plan 4.7); every other rep is excluded, and refused by fitIndex. */
   export const FIT_SEEDS_USED = Object.freeze([
     { source: 'V4-S2', arms: ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'], reps: [0, 1, 2, 3, 4] },
     { source: 'V4-S2B', arms: ['fr-none'], reps: [0, 1, 2, 3, 4] },
     { source: 'V4-S3P', arms: ['fr-frozen-none-uncapped'], reps: [0, 1, 2, 3, 4] },
     { source: 'MP12b1', reps: 'landscape reps 0-19 of docs/difficulty-v3/landscape-v3-full (today\'s search)' },
     { source: 'IGP-05', reps: "PM1's first slice (ig-pm1/...)" },
     { source: 'V4-S2K, V4-T10a-c', reps: 'the kernel streams ig-v4/kernel/<case>' },
   ]);
   ```

2. Export `fitIndex({ indices = FIT_INDICES, read = (p) => readRepoFile(p), capture = FIT_CAPTURE } = {})` (pure but for
   `read`, which returns a repository file's UTF-8 text or null): returns `{ indices: [{ path, key, entries }],
   checked, captures: [{ path, sourceCommit, capturedPath, hash, index, kind: 'normalized-text' }], uncaptured: [{ path,
   hash, index }], problems: [] }`:
   - per index: `read(path)` null gives `missing fit index <path>`; a parse error, or a list (`field` null: the parsed
     value; else its field) that is not an array, gives `malformed fit index <path>`;
   - per entry `e` of an index: `p` = `e.path` with `\` replaced by `/`; `want` = `e[key]`; a `want` that is not a
     64-character lowercase hex string gives `malformed entry <p> (index <index>)`; `text = read(p)`; when `text !==
     null` and `sha256Text(text) === want`, the entry is checked; otherwise, when `p` starts with `tools/`, `cap =
     \`${capture.dir}/${p}\`` must be readable with `sha256Text(read(cap)) === want` (then a `captures` item `{ path: p,
     sourceCommit: capture.commit, capturedPath: cap, hash: want, index, kind: 'normalized-text' }`), else `fit input <p>
     changed or missing and has no matching capture (index <index>)` and an `uncaptured` item `{ path: p, hash: want,
     index }` (T12b's capture block reads it); any other path gives `missing fit input <p> (index <index>)` (null text) or
     `fit input <p> changed (index <index>)`;
   - per checked or captured entry whose `p` ends with `.runs.json`: every `rows[].rep` of its JSON, and whose `p` ends
     with `/rows.jsonl`: every line's `rep`; a `rep` of 20 or more gives `fit input <p> holds rep <r>: validation, Master
     and second-validation reps are never fitting inputs`;
   - `checked` the number of checked entries; the problems keep their order (indices in `indices` order, entries in file
     order).

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `freeze: the fit index` | `fitIndex` with an in-memory `read` over a map: an index `i.json` (array) with entries `{ path: 'x\\a.json', sha256Lf: sha256Text('A\n') }`, `{ path: 'tools/m.mjs', sha256Lf: sha256Text('old\n') }`, `{ path: 'r/s.runs.json', sha256Lf: sha256Text(R) }` where `R` is `JSON.stringify({ rows: [{ rep: 0 }, { rep: 4 }] })`; files `x/a.json` `'A\r\n'`, `tools/m.mjs` `'new\n'`, `cap/tools/m.mjs` `'old\n'`, `r/s.runs.json` `R`; `indices` `[{ path: 'i.json', field: null, key: 'sha256Lf' }]`, `capture` `{ dir: 'cap', commit: '57ef5cf' }`; then one change at a time: `x/a.json` `'B\n'`; `x/a.json` absent; `cap/tools/m.mjs` absent; `cap/tools/m.mjs` `'other\n'`; `R` with a row `{ rep: 20 }` (and the entry's hash updated); `i.json` absent; `i.json` `'{'`; the first entry's hash `'abc'` | `checked` 2, `captures` `[{ path: 'tools/m.mjs', sourceCommit: '57ef5cf', capturedPath: 'cap/tools/m.mjs', hash: sha256Text('old\n'), index: 'i.json', kind: 'normalized-text' }]`, `uncaptured` `[]`, `problems` `[]` (CRLF does not change `sha256Lf`); then `fit input x/a.json changed (index i.json)`; `missing fit input x/a.json (index i.json)`; `fit input tools/m.mjs changed or missing and has no matching capture (index i.json)` twice, each with `uncaptured` `[{ path: 'tools/m.mjs', hash: sha256Text('old\n'), index: 'i.json' }]`; `fit input r/s.runs.json holds rep 20: ...`; `missing fit index i.json`; `malformed fit index i.json`; `malformed entry x/a.json (index i.json)` |

## Documentation

None in this task (T12b documents `freeze.json` with its `fit`).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T12a --label frozen` | repository root, first | `firewall: snapshot of S24-T12a` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T12a --horizon-s 285` | repository root (unlocked) | every case `PASS` | 5 min |
| `node --input-type=module -e "const f = await import('./tools/ig-proto/freeze.mjs'); const r = f.fitIndex(); console.log(r.checked, r.captures.length, r.problems.length); for (const p of r.problems.slice(0, 20)) console.log(p);"` | repository root (unlocked) | three numbers: the entries checked (about 5,000), the captures needed today, the problems; every problem is `fit input <p> changed or missing and has no matching capture` for one of the named mutable harness sources `tools/ig-proto/lib/lane-worker.mjs`, `tools/ig-proto/manifest.mjs`, `tools/ig-proto/v4-check.mjs` (T12b captures them); any other problem, a missing T11 index included, is a stop | 3 min |
| `node --input-type=module -e "const f = await import('./tools/ig-proto/freeze.mjs'); const { existsSync } = await import('node:fs'); const m = f.FIT_INPUTS.filter((p) => !existsSync(p)); console.log(m.length); for (const p of m) console.log(p);"` | repository root (unlocked) | `0` (every top-level input exists, the two T11 indices' scripts `t11-transport.mjs` and `t11-projection.mjs` and `t11-reading.md` included) | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T12a --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the two files | 1 min |

## Stop points and questions

- Stop and report when the real `fitIndex()` gives a problem other than an uncaptured named mutable harness source
  (SA-Astra's review R2-07, verbatim: "Both T11 indices and their scripts must exist before T12a is accepted. The only
  expected outstanding real-index problems at this point are named mutable harness sources awaiting their captures in
  T12b. A missing T11 artifact is a stop, not an accepted future dependency."), or when a path of `FIT_INPUTS` is
  absent: an observation or derived input changed after it was indexed, which no capture may hide.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T12a-B01 | Every input that fitted the freeze, through the analyses' indices, is proved unchanged or bound to its captured epoch, and no validation observation can enter the fit | the case | the PASS line |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T12a-T01 | `fitIndex` gives the Tests table's results, with `sha256Lf` as the LF-normalized hash | `--items` | the PASS line |
| T12a-T02 | The real indices and every top-level input exist and are readable; the only problems today are the three named uncaptured harness sources | the third and fourth gates | their output |
| T12a-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

## Checklist (the developer confirms every item in the final report)

- [ ] Every step done; nothing outside the scope changed (guard command output)
- [ ] Tests added and green; the full gate green
- [ ] Documents updated (each language)
- [ ] File format checks pass
- [ ] Evidence files written
- [ ] Every AC row has its evidence

## Final report (the developer's reply)

The start and end times; the files changed; the gate results with numbers (the three numbers of the real index and
its problems); each AC row with its evidence; the questions and rulings; the deviations; and the named items for later.

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

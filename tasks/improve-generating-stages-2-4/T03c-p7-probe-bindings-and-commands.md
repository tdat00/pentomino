# T03c: P7: the equality bindings, the go rule and the probe's commands (`p7-probe.mjs`, part 3)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §2, §6 T6, §8.2 T03-T05 and S-2; plan v4 §3 P7 ("Rules"); D-S24-15, D-S24-22, D-S24-28; pack decisions D-P24-05, D-P24-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T03b |
| Depends on | T03b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure and unlocked cases; two refusal commands) |

## Goal

A composite may be timed and called a go only when it is proved equal, on both tiers, as the exact tree that is timed,
by reports whose every input is still the one they were made from. This task adds to `p7-probe.mjs` the binding of an
equality report (its verdict, its trees, its corpus, its run's declaration, state and item log, and its complete input
index, rechecked), the go rule of D-P24-05, and the commands `equal`, `bind`, `time` and `report`, which refuse a
candidate without its equality reports before they look up any tree.

## Authority and fixed points

- D-P24-05 (this pack, as revised after SA-Astra's review R07): `go = quickEqual && fullEqual && timing.verdict ===
  'measured' && timing.notSame.length === 0 && timing.ratio >= 1.04`; quick and full equality must refer to the actual
  timed candidate and reference identities and the required corpus and coverage, checked before timing and again by the
  report.
- SA-Astra's review R2-04 (the binding part, verbatim): "Bind and recheck the complete required corpus input index as
  well as experiment/state/log files. Missing, changed or omitted required entries are incomplete. A timing report also
  binds the equality reports and declaration inputs it used to decide go." T03b's verdicts check the declaration against
  `expectedCorpus`; the reports below carry every input they read, and every binding rechecks them. SA-Astra's review
  R3-01: every binding requires, by path and exactly once each, the run's `experiment.json`, `state.json` and
  `items.jsonl` and the nine corpus inputs (`equalityEvidencePaths`, step 1), whatever the report lists; a report that
  omits or repeats one of them does not bind.
- SA-Astra's review R2-05 (verbatim): "In `bind` and `time`, check existence/readability of both equality reports before
  building or looking up candidate/reference trees. Missing quick evidence returns `p7-probe: p7-c1 cannot be timed: no
  quick equality report`, with no run directory created. Test this when the candidate manifest does not yet exist." At
  this task `tools/ig-proto/variants/p7-c1.json` does not exist (T03d creates it): the two refusal gates are that test.
- The reports are derived from the declaration and the logs (D-V4-14): `report` replaces an earlier report of the same
  task; the raw observations are never rewritten.

## Scope

- Change: `tools/ig-proto/p7-probe.mjs`: the exported `equalityEvidencePaths`, `equalityBinding`, `goDecision` and
  `main` with the commands `equal`, `bind`, `time`, `report`.
- Change: `tools/ig-proto/self-test.mjs`: one case appended to `itemCases` (`--items`).
- Change: `tools/ig-proto/README.md`: the P7 section of T03a gains the bindings, the go rule and the commands.
- Do not change: every other file. Guards: G1, G2, G3 (G3 lists the three files).

## Steps

1. **The required inputs of an equality report.** Export the pure helper `equalityEvidencePaths(candidate, tier)`,
   where `candidate` is the variant-id string. Let `dir = 'tests/artifacts/ig-proto/frozen/V4-P7E-' + candidate + '-' +
   tier + '/equal'`. Return `[dir + '/experiment.json', dir + '/state.json', dir + '/items.jsonl',
   ...corpusInputPaths('equal')]`: twelve paths, in that order. The three observation paths are mandatory independently
   of which entries the supplied report happens to list. (`corpusInputPaths('equal')` is T03b's: the seven PM4
   `calls.json`, `MEMORY_MANIFEST` and `P7_CATALOGUE`, in that order; `dir` is `rel(artifactDir('frozen', 'V4-P7E-' +
   candidate + '-' + tier, 'equal'))`, the folder of the run's files that `readRun` lists.)
2. **The binding** (`export function equalityBinding(report, { tier, candidate, reference, fileHash, requiredInputs })`,
   pure; `candidate`, `reference` tree refs; `fileHash(path)` the sha256 of a repository file or `null`;
   `requiredInputs` a list of paths): `{ ok: true }` or `{ ok: false, reason }`, checked in this order: `no <tier>
   equality report` (`report` null); `<tier> equality is <verdict>` (`report.equal.verdict !== 'equal'`); `the <tier>
   report is of tier <t>`; `the <tier> report was made on another candidate tree`
   (`!isDeepStrictEqual(report.equal.declared.candidate, candidate)`); `... on another reference tree`; `the <tier>
   report used corpus <v>` (not `P7_CORPUS_VERSION`); `the <tier> report's memory coverage is incomplete`; `the <tier>
   report binds no input` (`report.meta.inputs` empty or not an array). After `the <tier> report binds no input`,
   examine each `requiredInputs` path in order. Zero matching entries gives `the <tier> report does not bind <path>`;
   more than one gives `the <tier> report binds <path> more than once`. Then perform the existing missing/changed
   file-hash checks on every listed input: `the <tier> report's input <path> is missing` (a `report.meta.inputs` entry
   whose `fileHash` is null); `the <tier> report's input <path> changed` (one whose `fileHash` differs from its
   `sha256`). Each required observation or corpus path must have exactly one entry.
3. **The go rule** (`export function goDecision({ quick, full, timing })`, pure; `quick`, `full` bindings, `timing` a
   time verdict): `{ go: quick.ok && full.ok && timing.verdict === 'measured' && timing.notSame.length === 0 &&
   timing.ratio >= P7_GO_RATIO, reasons }`, `reasons` the failed parts (`quick: <reason>`, `full: <reason>`, `timing
   <verdict>`, `differing <n>`, `ratio <r> below 1.04`).
4. **The commands** (`export async function main(argv)`, guarded `if (process.argv[1] && import.meta.url ===
   pathToFileURL(process.argv[1]).href) { process.exitCode = await main(process.argv.slice(2)); }`; each refusal prints
   `p7-probe: <reason>` on stderr and returns 1, writing nothing; `EVIDENCE` = `docs/improve-generating/evidence/frozen`;
   `fileHash = (p) => (existsSync(abs(p)) ? sha256File(abs(p)) : null)`):
   - common: `--label frozen only`; `<T> is a historical namespace` for `IGP-02`, `V4-T04`, `V4-T04v4`, `V4-T04f`,
     `V4-T04i`, `V4-S2`, `V4-S2P`, `V4-S2K`, `V4-S2W`.
   - **The equality reports, read first** (`async function boundReports(candidate)`, used by `bind` and `time`): for
     `tier` of `quick`, `full`: `path = \`${EVIDENCE}/V4-P7E-${candidate}-${tier}/p7.json\``; a missing file refuses
     `<candidate> cannot be timed: no <tier> equality report`, an unparseable one `<candidate> cannot be timed: the
     <tier> equality report is unreadable`; only then `candidate = await treeRef(candidate)`, `reference = await
     treeRef(P7_REFERENCE)` and, per tier, `equalityBinding(report, { tier, candidate, reference, fileHash,
     requiredInputs: equalityEvidencePaths(candidate.variant, tier) })` (after the candidate's tree reference is
     resolved); a failed binding refuses `<candidate> cannot be timed: <reason>`. Nothing is created before these checks
     pass.
   - `equal --candidate <variant> --tier <quick | full> --task <T> --label frozen --source-label <SL> [--horizon-s <H>]`:
     `<T>` must be `V4-P7E-<candidate>-<tier>` (else `the task of an equality run is V4-P7E-<candidate>-<tier>`);
     `fresh = await declareRun({ task: T, step: 'equal', command: 'equal', candidate, tier })`; when `experiment.json`
     exists, `checkDeclaration(existing, fresh)` (a refusal: nothing written, no dispatch), else `writeJson` it; then
     `runItems({ task: T, step: 'equal', label: 'frozen', horizonS: H ?? 285, items: runtimeItems(fresh.items) })`; print
     `p7-probe: equal <candidate> <tier>: <ended> of <total> items ended, done <true|false>` and return its `exitCode`.
   - `bind --candidate <variant> --task V4-P7 --label frozen --source-label <SL>` (unlocked, the plan's step before each
     timing step): `boundReports(candidate)`; prints `p7-probe: <candidate> bound to its quick and full equality
     reports` and returns 0.
   - `time --candidate <variant> --task <T> --label frozen --source-label <SL> --horizon-s <H>`: `<T>` must be `V4-P7`;
     `boundReports(candidate)`; then as `equal` with step `time-<candidate>` and `declareRun({ ..., command: 'time' })`.
   - `report --task <T> --label frozen --source-label <SL>`:
     - for `V4-P7E-<candidate>-<tier>`: `run = readRun(T, 'equal')`; `verdict = equalVerdict({ ...run, expected: { task:
       T, candidate, tier }, manifest: memoryManifest(), corpus: await expectedCorpus('equal', candidate, tier) })`
       (`verdict.problems` also gets `run.problems`); `inputs` = `run.inputs` followed by the declaration's
       `corpus.inputs` (each `{ path, sha256 }` as declared; none without a declaration);
     - for `V4-P7`: the candidates are the `time-<c>` step ids of `tools/ig-proto/plans/V4-P7.json` (the declared set,
       never the folders that exist); per candidate `run = readRun(T, \`time-${c}\`)`, `timeVerdict({ ...run, expected:
       { task: T, candidate: c }, corpus: await expectedCorpus('time', c, null) })`, the two equality reports read from
       their paths (a missing one: the binding `{ ok: false, reason: 'no <tier> equality report' }`), the two
       `equalityBinding`s against the time declaration's `candidate` and `reference` (the identities actually timed; a
       missing declaration gives the reason `no time declaration`) with `requiredInputs: equalityEvidencePaths(c, tier)`,
       and `goDecision`; `inputs` = per candidate its `run.inputs`, its time declaration's `corpus.inputs` and the two
       equality reports `{ path, sha256: fileHash(path) }` that exist;
     - any other task refuses `report knows V4-P7E-<candidate>-<tier> and V4-P7`.
     It writes `${EVIDENCE}/<T>/p7.json` (`{ meta: { format: 'ig-p7-report', version: 1, task, writtenAt,
     reportProducer: { harnessHash }, inputs }, equal: <verdict> }` or `{ meta, time: { <c>: verdict }, go: { <c>:
     decision } }`) and `p7.md` (the verdicts, the coverage table of the memory fixtures with their reference bytes, list
     bytes and representations, the `diagnostics`, the problems), replacing an earlier report of the same task, and prints
     `p7-probe: wrote <rel json>`, then for `V4-P7` one line per candidate `p7-probe: <c> go <yes|no> (ratio <r or n/a>,
     quick <ok or reason>, full <ok or reason>, timing <verdict>)`.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `p7: bindings and go` | `equalityEvidencePaths('p7-x', 'quick')`; a passing report `{ meta: { inputs: [<one entry { path, sha256: 'h' } per equalityEvidencePaths('p7-x', 'quick') path, in that order, and no x/state.json entry>] }, equal: { verdict: 'equal', declared: { candidate: { variant: 'p7-x', treeId: 'T1', copyDigest: 'C1', root: 'r' }, reference: { variant: 'base', treeId: 'T0', copyDigest: 'C0', root: 'r0' }, tier: 'quick', corpusVersion: 'p7-corpus-v1' }, coverage: { complete: true } } }` bound with `{ tier: 'quick', candidate: <its candidate>, reference: <its reference>, fileHash: () => 'h', requiredInputs: equalityEvidencePaths('p7-x', 'quick') }` (that same required list); then the variants: `report` null; `equal.verdict` `incomplete`; `declared.candidate.treeId` `T9`; `meta.inputs` `[]`; the entry of `tools/ig-proto/data/boards-v1.json` removed; `fileHash` returning `null` for `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json`; `fileHash` returning `'h2'` for the memory manifest; then, each on a separate copy of the clean report: the entry of `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/experiment.json` removed; the entry of `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json` removed; the entry of `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/items.jsonl` removed; only the `corpusInputPaths('equal')` entries kept; the canonical `state.json` entry duplicated; `goDecision` with `quick` and `full` `{ ok: true }` and a `measured` timing of `ratio` 1.04, `notSame` `[]`; the same with `ratio` 1.0399; with `quick` the binding of the `T9` variant; with a timing `{ verdict: 'incomplete', notSame: [], ratio: null }` | the twelve paths `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/experiment.json`, `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json`, `tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/items.jsonl`, then the nine of `corpusInputPaths('equal')` in their order; `{ ok: true }`; then `no quick equality report`; `quick equality is incomplete`; `the quick report was made on another candidate tree`; `the quick report binds no input`; `the quick report does not bind tools/ig-proto/data/boards-v1.json`; `the quick report's input tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json is missing`; `the quick report's input tools/ig-proto/data/p7-memory-fixtures.json changed`; `the quick report does not bind tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/experiment.json`; `the quick report does not bind tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json`; `the quick report does not bind tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/items.jsonl`; `the quick report does not bind tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/experiment.json` (the first missing); `the quick report binds tests/artifacts/ig-proto/frozen/V4-P7E-p7-x-quick/equal/state.json more than once` (each `ok: false`); go `true`; go `false` with `ratio 1.0399 below 1.04`; go `false` with `quick: the quick report was made on another candidate tree`; go `false` with `timing incomplete` |

The refusal gates below are the command-level test of SA-Astra's review R2-05: run while `p7-c1` has no manifest, they
must refuse on the missing report, before any tree lookup.

## Documentation

README, the P7 section: the commands and their refusals (`bind` and `time` read both equality reports before any tree);
`report`'s inputs (the run's files, the declared corpus inputs; for `V4-P7` also the two equality reports per candidate)
and what each binding rechecks (the twelve required paths of `equalityEvidencePaths`: the run's `experiment.json`,
`state.json` and `items.jsonl` and the nine corpus inputs, each listed exactly once whatever the report lists, then the
hash of every listed input); the go rule (D-P24-05); "`time` refuses a candidate whose quick and full equality
reports are not `equal` on the same candidate and reference trees and corpus, or whose inputs are missing or changed".

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T03c --label frozen` | repository root, first | `firewall: snapshot of S24-T03c` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T03c --horizon-s 285` | repository root (unlocked) | every case `PASS` | 5 min |
| `Test-Path tools\ig-proto\variants\p7-c1.json` | repository root | `False` (T03d creates it) | 1 min |
| `node tools\ig-proto\p7-probe.mjs time --candidate p7-c1 --task V4-P7 --label frozen --source-label "frozen 3fc65f4" --horizon-s 285` | repository root (unlocked: it refuses before any work) | exit 1; `p7-probe: p7-c1 cannot be timed: no quick equality report`; no folder `tests\artifacts\ig-proto\frozen\V4-P7` | 1 min |
| `node tools\ig-proto\p7-probe.mjs bind --candidate p7-c1 --task V4-P7 --label frozen --source-label "frozen 3fc65f4"` | repository root (unlocked) | exit 1; `p7-probe: p7-c1 cannot be timed: no quick equality report`; no folder `tests\artifacts\ig-proto\frozen\V4-P7` | 1 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T03c --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

## Stop points and questions

- Stop and report before: any `equal` or `time` run on a candidate (T03d, T04, T05a, T05b and S02 run them); the
  refusal gates above are the only commands run on `V4-P7` here.
- Stop and report when a refusal gate fails with another reason (for example an unknown variant `p7-c1`): the reports
  must be read before any tree.
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code; an
  ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside the
  scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03c-B01 | A composite is called a go only when it is equal on both tiers as the exact timed tree, with complete memory coverage and unchanged inputs (its run's declaration, state and item log and the nine corpus inputs, each bound exactly once), and every one of its 90 timed pairs is valid and equal | the bindings case; D-P24-05 | the PASS line |
| T03c-B02 | A candidate without its equality reports is refused before any tree is looked up or any folder created | the refusal gates | their output; no folder |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03c-T01 | `equalityEvidencePaths`, `equalityBinding` and `goDecision` return the Tests table's values | `--items` | the PASS line |
| T03c-T02 | `time` and `bind` refuse `p7-c1` (no manifest yet) on its missing quick report and write nothing | the refusal gates | their output; no folder |
| T03c-T03 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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

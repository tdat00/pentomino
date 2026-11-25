# T03b: P7: the experiment declaration, the log and corpus checks and the verdicts (`p7-probe.mjs`, part 2)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §2, §6 T6, §8.2 T03-T05 and S-2; plan v4 §3 P7 ("Rules"); D-S24-15, D-S24-22, D-S24-28; pack decisions D-P24-05, D-P24-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T03a |
| Depends on | T03a |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (pure and unlocked cases only) |

## Goal

The spike's verdicts must come from what was declared before the first item ran, checked against the corpus the
spike requires, never from the items that happened to end. This task adds to `p7-probe.mjs` the immutable experiment
declaration each run writes before its first dispatch (with the input constructor of the kernel inputs), the
independently expected corpus, the checks every verdict shares (the declaration against the required corpus, the state
against the declaration and its producer, the item log's start, end, order and duplicates) and the equality and timing
verdicts. T03c adds the bindings, the go rule and the commands.

## Authority and fixed points

- D-P24-05 (this pack, as revised after SA-Astra's review R07): `timeVerdict` is `measured` only for the complete
  declared 90 unique items, each with a structurally valid completed outcome, `outcome: 'ok'`, `same: true`, and finite
  positive `refMs`/`candMs`; otherwise it is incomplete or failed, with explicit missing/error/censored/differing ids;
  never an admission ratio from a subset; quick and full equality must refer to the actual timed candidate and reference
  identities and the required corpus and coverage, checked before timing and again by the report.
- SA-Astra's review R06: before the first dispatch, persist an immutable experiment declaration under `<raw
  task>/<step>/experiment.json` (candidate, reference, tier and rounds, corpus version, input hashes, the complete
  ordered item declarations, the producer and tree identities; repository paths, not absolute roots); one conversion
  to runtime payloads (`runtimeItems`, T03a) for run, resume and report; a changed declaration on resume is refused;
  a missing declaration or an invalid log gives an incomplete verdict with reasons.
- **The validation contract** (SA-Astra's review R2-04, verbatim): "Derive the expected item identity from the recorded
  declaration and its independently expected corpus specification. Compare every identity field, including the
  recorded producer/source, and run `resumePlan` or the same full start/end/order/duplicate validation before judging.
  A missing start, unexpected start, producer/source mismatch or interrupted item is incomplete. Production
  `report`/`bind` validates the complete ordered declarations/settings against the required corpus: 30 kernel inputs,
  the 112/676 PM4 profiles and the seven memory items, plus the fixed input-constructor identity of R2-01; timing has
  the prescribed 90 item identities. Pure unit fixtures may inject a small expected manifest explicitly, but that test
  seam is not used by the production commands and cannot certify `p7-corpus-v1`. Bind and recheck the complete required
  corpus input index as well as experiment/state/log files. Missing, changed or omitted required entries are
  incomplete." T03c applies the last sentence to the reports' bindings.
- The input constructor (SA-Astra's review R2-01, T03a): the kernel inputs are built by `instr` with the rule
  `kernel-window-v1` from the catalogue `tools/ig-proto/data/boards-v1.json`; the declaration binds that tree's
  identity, the rule and the catalogue's hash.
- R05: the verdict records each memory fixture's reference bytes, auxiliary bytes and representation; at least one
  normal model must run the fast path and at least one fitting reference model the fallback; missing memory coverage
  makes the equality verdict incomplete, which excludes the candidate from timing.
- `lib/items.mjs` at the base: `resumePlan(items, lines, identity, stateIdentity)` (line 123, pure) refuses, in this
  order, a duplicate item id, an identity mismatch with the state, a line of another identity (`identity mismatch (log
  line <n>)`), an unknown line type or item (`unknown item <id>`), a duplicate log entry, a line before its item's
  start (`out-of-order log entry for <id>`) and a started item without an end (`interrupted item <id> needs a
  ruling`); `manifestHash(items)` (line 34); `readItemLog(path)` (line 89). The log lines are `item-start`, `item-spawn`
  and `item-end`, each with the run's `identityHash` (lines 64-83).

## Scope

- Change: `tools/ig-proto/p7-probe.mjs`: the exported `P7_COUNTS`, `corpusCounts`, `corpusInputPaths`,
  `expectedCorpus`, `declareRun`, `checkDeclaration`, `readRun`, `runProblems`, `equalVerdict`, `timeVerdict`.
- Change: `tools/ig-proto/self-test.mjs`: the helper `p7Run` and three cases appended to `itemCases` (`--items`).
- Change: `tools/ig-proto/README.md`: the P7 section of T03a gains the declaration, the expected corpus, the shared
  checks and the verdicts.
- Do not change: every other file. Guards: G1, G2, G3 (G3 lists the three files).

## Steps

1. **The required corpus.** `export const P7_COUNTS = Object.freeze({ quick: Object.freeze({ kernel: 30, pm4: 112,
   memory: 7, time: 0 }), full: Object.freeze({ kernel: 30, pm4: 676, memory: 7, time: 0 }), time: Object.freeze({ kernel:
   0, pm4: 0, memory: 0, time: 90 }) });` (an independent statement of the corpus: T10a's 30 kernel inputs, PM4's 112 and
   676 profiles, the seven memory items, the 90 timing pairs). `export function corpusCounts(items)` (pure): `{ kernel,
   pm4, memory, time }`, counting items of kind `p7-time` as `time`, and of kind `p7-equal` by `payload.source`:
   `kernel`, `pm4`, and `memory`, `memory-sequence` or `memory-capacity` as `memory`.
   `export function corpusInputPaths(command)` (pure): for `equal`, the seven
   `tests/artifacts/ig-proto/frozen/IGP-02/main/<cell>/calls.json` in `P7_PM4_CELLS` order (each `rel(join(artifactDir(
   'frozen', 'IGP-02', 'main', cell), 'calls.json'))`), then `MEMORY_MANIFEST`, then `P7_CATALOGUE`; for `time`,
   `[P7_CATALOGUE]`.
   `export async function expectedCorpus(command, candidate, tier)` (production only; never given a test corpus): `{
   items, counts, inputs, inputConstructor }` with `items` = `await equalDeclarations(candidate, tier)` for `equal`, `await
   timeDeclarations(candidate)` for `time`; `counts` = `P7_COUNTS[tier]` for `equal`, `P7_COUNTS.time` for `time`;
   `inputs` = `corpusInputPaths(command).map((path) => ({ path, sha256: sha256File(abs(path)) }))`; `inputConstructor` =
   `{ ...(await treeRef(P7_INPUT_CONSTRUCTOR)), rule: P7_INPUT_RULE }`.
2. **The declaration** (`export async function declareRun({ task, step, command, candidate, tier })`): `const corpus =
   await expectedCorpus(command, candidate, command === 'equal' ? tier : null);` returns `{ format: 'ig-p7-experiment',
   version: 1, task, step, command, candidate: await treeRef(candidate), reference: await treeRef(P7_REFERENCE), tier:
   command === 'equal' ? tier : null, rounds: command === 'time' ? P7_ROUNDS : null, inputConstructor:
   corpus.inputConstructor, corpus: { version: P7_CORPUS_VERSION, inputs: corpus.inputs }, producer: { frozenCommit:
   FROZEN_COMMIT, sourceDigest: await sourceDigest(), harnessHash: harnessInfo().harnessHash }, items: corpus.items }`.
3. **The resume rule** (`export function checkDeclaration(existing, fresh)`, pure): `{ ok: true }` when
   `isDeepStrictEqual(existing, fresh)`; else `{ refuse: \`the declaration of ${fresh.task}/${fresh.step} changed
   (${key}): a ruling is required\` }`, `key` the first of `format, version, task, step, command, candidate, reference,
   tier, rounds, inputConstructor, corpus, producer, items` whose values differ.
4. **Reading a run** (`export function readRun(task, step)`): `dir = artifactDir('frozen', task, step)`; returns `{
   declaration, lines, state, inputs, problems }`: `declaration` the parse of `experiment.json` or `null`, `lines` from
   `readItemLog(join(dir, 'items.jsonl'))` (a throw becomes the problem `items: malformed log line <n>` and `lines`
   `[]`), `state` the parse of `state.json` or `null`, `inputs` `[{ path, sha256 }]` of the three files that exist
   (repository paths), `problems` the read problems (`no declaration`, `no state`, `unreadable <file>`).
5. **The shared checks** (`export function runProblems({ declaration, lines, state, expected, corpus })`, pure;
   `expected` `{ task, step, command, candidate, tier }`; `corpus` `{ items, counts, inputs, inputConstructor }`, in
   production from `expectedCorpus`, in a unit test a small corpus of its own): returns the problems, in this order:
   - `no declaration` (and nothing else) when `declaration` is null;
   - `the declaration is not <task>/<step> of <candidate>[ <tier>]` when `format` is not `ig-p7-experiment`, `version`
     not 1, or `command`, `task`, `step`, `candidate.variant` or `tier` differ from `expected`;
   - `the required corpus counts <JSON of corpusCounts(corpus.items)> differ from <JSON of corpus.counts>` unless
     `isDeepStrictEqual(corpusCounts(corpus.items), corpus.counts)`;
   - `the declared items differ from the required corpus` unless `isDeepStrictEqual(declaration.items, corpus.items)`
     (the ids, kinds, variants and payloads, settings included, in order);
   - `the declared input constructor differs from the required one` unless
     `isDeepStrictEqual(declaration.inputConstructor, corpus.inputConstructor)`;
   - `the declaration uses corpus <v>` unless `declaration.corpus?.version === P7_CORPUS_VERSION`;
   - with `declared = Array.isArray(declaration.corpus?.inputs) ? declaration.corpus.inputs : []`: `the corpus input
     index is empty` when `declared` is empty; for each `corpus.inputs` entry in order, `the corpus input <path> is
     missing from the declaration` (no declared entry of that path) or `the corpus input <path> changed` (its `sha256`
     differs); for each declared entry whose path the corpus does not list, `unexpected corpus input <path>`;
   - `no state` (and the checks below are skipped) when `state` is null;
   - with `id = state.identity ?? {}` and `runtime = runtimeItems(declaration.items)`: `the run's manifest differs from
     its declaration` unless `id.manifestHash === manifestHash(runtime)`; `the run's tree differs from its declaration`
     unless `id.treeIds?.[declaration.candidate?.variant] === declaration.candidate?.treeId`; for each of
     `frozenCommit`, `sourceDigest`, `harnessHash`: `the run's producer differs from its declaration (<field>)` unless
     `id[field] === declaration.producer?.[field]`;
   - `the item log is invalid: <reason>` when `resumePlan(runtime, lines, id, id)` returns `{ refuse: reason }`.
6. **The equality verdict** (`export function equalVerdict({ declaration, lines, state, expected, manifest, corpus })`,
   pure; `expected` `{ task, candidate, tier }`; `manifest` = `memoryManifest()`): returns `{ items, ended, equal,
   notEqual, errors, censored, missing, duplicates, unexpected, problems, diagnostics, coverage, declared, verdict }`:
   - `problems` = `runProblems({ declaration, lines, state, expected: { task, step: 'equal', command: 'equal', candidate,
     tier }, corpus })`, then `the memory fixtures are not all declared` when the declaration lacks one of the seven
     memory items; with no declaration every count is 0 and `verdict` `incomplete`.
   - From the `item-end` lines: `unexpected` (ids not declared), `duplicates` (a second end of an id); per declared id:
     `missing` (no end), `censored` (status `censored`), `errors` (status `error`, or `completed` with `result.outcome
     !== 'ok'`: a `no-set` or `no-subset` of the input constructor is an error, a probe defect), `notEqual` (completed
     `ok` with `same !== true`), `equal` the count of the rest; `ended` the declared ids with one end.
   - `diagnostics` (SA-Astra's review R2-05): `[{ id, differing }]`, one per `notEqual` id in declaration order, with
     that item-end's `result.differing` (each `{ setting, reference, candidate }`).
   - `coverage` = `{ lists, reference, memory: [...], budget: [...], complete }`: `lists` and `reference` count the steps
     of completed `ok` items whose `representation` is `'lists'` or `'reference'`; `memory` has one entry per memory
     fixture `{ fixture, refBytes, listBytes, representation, expected, ok }` (its `fixture` step; `expected` the
     manifest's `canonical`, `model-too-large` matching a null representation) and one per sequence and capacity step
     (`expected` its `expect`); `budget` lists every step with representation `'lists'` that breaks `refBytes + listBytes
     <= memoryBytes` or `wsBytes + listBytes <= capacityBytes` (`refBytes` the item's, or for sequence and capacity steps
     the fixture's manifest value); `complete` when every memory entry is `ok`, `budget` is empty, every memory item
     ended, and at least one step of a non-memory item has representation `'lists'`.
   - `declared` = `{ candidate, reference, tier, corpusVersion: corpus.version, producer, inputConstructor }` of the
     declaration.
   - `verdict`: `incomplete` when `problems` is not empty; else `not-equal` when `notEqual` is not empty; else
     `incomplete` when any of `missing`, `errors`, `censored`, `duplicates`, `unexpected` is not empty or
     `coverage.complete` is false; else `equal`.
7. **The timing verdict** (`export function timeVerdict({ declaration, lines, state, expected, corpus })`, pure;
   `expected` `{ task, candidate }`): `problems` = `runProblems({ ..., expected: { task, step: \`time-${candidate}\`,
   command: 'time', candidate, tier: null }, corpus })`, then `the declaration does not hold 90 items` unless exactly 90
   distinct ids; per declared id `missing`, `censored`, `errors` (as in step 6), `invalid` (completed `ok` with `refMs` or
   `candMs` not a finite number greater than 0), `notSame` (completed `ok` with `same !== true`), and `capped` (completed
   `ok` with `capped === 'both'`: a rating whose deduction path was capped on both trees, a timed pair counted like any
   other, T03a step 10, ruling R-P24-06; reported, never a problem). `verdict`: `incomplete`
   when `problems` is not empty; else `failed` when `notSame` or `invalid` is not empty; else `incomplete` when anything
   else is wrong; else `measured`. Only when `measured`: `refMs` and `candMs` the sums, `ratio = refMs / candMs`,
   `geoRatio` the geometric mean of the per-item `refMs / candMs`; otherwise these four are `null`. The result also has
   `items`, `ended`, `problems`, `declared`, `capped`.

## Tests

The helper `p7Run({ ... })` in `self-test.mjs` (before `itemCases`) builds a synthetic run whose log is valid: a
declaration (as `declareRun` shapes it: `format` `ig-p7-experiment`, `version` 1, `task` `V4-P7E-p7-x-quick`, `step`
and `command` `equal`, `rounds` null, with the fixed refs `{ variant: 'p7-x', treeId: 'T1', copyDigest: 'C1', root:
'r' }` and `{ variant: 'base', treeId: 'T0', copyDigest: 'C0', root: 'r0' }`, `tier` `quick`, `inputConstructor` `{
variant: 'instr', treeId: 'TI', copyDigest: 'CI', root: 'ri', rule: 'kernel-window-v1' }`, `corpus` `{ version:
'p7-corpus-v1', inputs: [{ path: 'a.json', sha256: 'A' }] }`, `producer` `{ frozenCommit: 'f', sourceDigest: 's',
harnessHash: 'h' }`, and the items: one kernel item `n0` (`kind: 'p7-equal'`, `variant: 'p7-x'`, `payload: { source:
'kernel', otherTree: 't', inputTree: 'ti' }`) and seven memory items `m:<fixture>` (the five fixtures of
`memoryManifest()`, `payload: { source: 'memory', fixture, otherTree: 't' }`), `m:sequence` (`source:
'memory-sequence'`) and `m:capacity` (`source: 'memory-capacity'`), in that order); a state whose identity is `{
frozenCommit: 'f', sourceDigest: 's', treeIds: { 'p7-x': 'T1' }, harnessHash: 'h', manifestHash:
manifestHash(runtimeItems(items)) }`; and, per item in order, an `item-start` line `{ type: 'item-start', identityHash,
item, kind, variant, at: '2026-01-01T00:00:00.000Z' }` and an `item-end` line `{ type: 'item-end', identityHash, item,
status: 'completed', result, ms: 1, at: '2026-01-01T00:00:00.000Z' }` with `identityHash = identityHash(identity)`:
`n0`'s result `{ outcome: 'ok', same: true, refBytes: 1000, differing: [], steps: [{ setting: 'canonical', same: true,
representation: 'lists', listBytes: 10, wsBytes: 5000, capacityBytes: 167772160, memoryBytes: 33554432, referenceError:
null, candidateError: null }] }`, each memory item with the representations the manifest expects (`listBytes` the
fixture's for `lists`, 0 for `reference`, null for `model-too-large`; `wsBytes` its `arenaBytes + refBytes`;
`capacityBytes` 167,772,160 or the capacity entry's; `memoryBytes` the step's). Its corpus is `{ items: <the same
items>, counts: { kernel: 1, pm4: 0, memory: 7, time: 0 }, inputs: [{ path: 'a.json', sha256: 'A' }], inputConstructor:
<the same constructor> }`. A variant that changes the identity rebuilds every line's `identityHash` from the new identity.

The timing fixture rebuilds `state.identity.manifestHash` from its 90 runtime items and every start/end line's
`identityHash` from that state, just as `p7Run` does for its equality items. It does not retain the equality
declaration's task or item hash.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `p7: the experiment declaration` | `checkDeclaration(d, structuredClone(d))` of `p7Run()`'s declaration; the same with `tier: 'full'`; with one item's `payload.subsetIndex` changed; with `inputConstructor.treeId` `'TJ'`; with `producer.harnessHash` changed; `corpusCounts` of `p7Run()`'s items; `corpusInputPaths('equal')` and `corpusInputPaths('time')` | `{ ok: true }`; refusals naming `tier`, `items`, `inputConstructor` and `producer`, each ending `: a ruling is required`; `{ kernel: 1, pm4: 0, memory: 7, time: 0 }`; nine paths (the seven `calls.json` from `tests/artifacts/ig-proto/frozen/IGP-02/main/10x10-nightmare/calls.json` to `.../26x26-nightmare/calls.json`, `tools/ig-proto/data/p7-memory-fixtures.json`, `tools/ig-proto/data/boards-v1.json`); `['tools/ig-proto/data/boards-v1.json']` |
| same file (`--items`) | `p7: equality verdict` | `equalVerdict` of `p7Run()` with `expected` `{ task: 'V4-P7E-p7-x-quick', candidate: 'p7-x', tier: 'quick' }` and its corpus; then the variants: (1) the last item's end deleted (its start kept); (2) `n0` ended twice; (3) `state.identity.manifestHash` `'x'`; (4) `declaration` null; (5) `n0` `same: false` with `differing` `[{ setting: 'canonical', reference: { result: 1 }, candidate: { result: 2 } }]`; (6) `n0`'s step `representation: 'reference'` (no fast path on a normal model); (7) `mem-near-reference`'s `fixture` step `representation: 'lists'`; (8) a `lists` step with `wsBytes + listBytes` above its capacity; (9) `n0`'s `item-start` line deleted; (10) `state.identity.harnessHash` `'h2'` (the lines rebuilt from that identity; the declaration still says `'h'`); (11) `n0` removed from the declaration's items, the state's `manifestHash` recomputed and `n0`'s lines removed (a self-consistent run without the kernel item); (12) `declaration.corpus.inputs` `[]`; (13) the corpus's input `a.json` with `sha256` `'B'`; (14) an extra `item-start` line of the undeclared item `zz`; (15) the corpus's `counts` `{ kernel: 2, pm4: 0, memory: 7, time: 0 }` | `equal`, `problems` `[]`, `coverage.complete` true, `coverage.memory` 16 entries (five fixtures, nine sequence and two capacity steps), all `ok`; then (1) `incomplete`, `missing` `['m:capacity']`, the problem `the item log is invalid: interrupted item m:capacity needs a ruling`; (2) `incomplete`, `duplicates` `['n0']`, the problem `the item log is invalid: duplicate log entry for n0`; (3) `incomplete` with `the run's manifest differs from its declaration`; (4) `incomplete` with `no declaration`; (5) `not-equal`, `notEqual` `['n0']`, `diagnostics` `[{ id: 'n0', differing: <that list> }]`; (6) `incomplete`, `coverage.complete` false; (7) `incomplete`, that memory entry `ok: false`; (8) `incomplete`, one `budget` entry; (9) `incomplete` with `the item log is invalid: out-of-order log entry for n0`; (10) `incomplete` with `the run's producer differs from its declaration (harnessHash)`; (11) `incomplete` with `the declared items differ from the required corpus`; (12) `incomplete` with `the corpus input index is empty` and `the corpus input a.json is missing from the declaration`; (13) `incomplete` with `the corpus input a.json changed`; (14) `incomplete` with `the item log is invalid: unknown item zz`; (15) `incomplete` with `the required corpus counts {"kernel":1,"pm4":0,"memory":7,"time":0} differ from {"kernel":2,"pm4":0,"memory":7,"time":0}` |
| same file (`--items`) | `p7: timing verdict` | a synthetic time run of 90 items `t0` to `t89` (`kind: 'p7-time'`, `variant: 'p7-x'`, `payload: { otherTree: 't', inputTree: 'ti' }`, the declaration as `p7Run`'s with `task: 'V4-P7'`, `command: 'time'`, `step: 'time-p7-x'`, `tier` and `rounds` `null` and `3`, `corpus.inputs` `[{ path: 'b.json', sha256: 'B' }]`; a valid log, each result `{ outcome: 'ok', refMs: 104, candMs: 100, same: true }`), its corpus `{ items, counts: { kernel: 0, pm4: 0, memory: 0, time: 90 }, inputs: [{ path: 'b.json', sha256: 'B' }], inputConstructor }` and `expected` `{ task: 'V4-P7', candidate: 'p7-x' }`; then the variants: `t2`'s result with `capped: 'both'` added (a capped pair, ruling R-P24-06); `t5` `same: false`; `t89`'s end deleted; `t3` status `censored`; `t4` status `error`; `t6` `candMs: 0`; `t7` `refMs: null`; `t0`'s `item-start` deleted; `state.identity.sourceDigest` `'s2'` (lines rebuilt); `t1` removed from the declaration, the state and the log | `measured`, `problems` `[]`, `capped` `[]`, `ratio` 1.04 and `geoRatio` 1.04 (to 1e-9); then `measured` with `capped` `['t2']` and `ratio` 1.04; then `failed` with `notSame` `['t5']`, `ratio` null; `incomplete` with `missing` `['t89']` and `the item log is invalid: interrupted item t89 needs a ruling`; `incomplete` with `censored` `['t3']`; `incomplete` with `errors` `['t4']`; `failed` with `invalid` `['t6']`; `failed` with `invalid` `['t7']`; `incomplete` with `the item log is invalid: out-of-order log entry for t0`; `incomplete` with `the run's producer differs from its declaration (sourceDigest)`; `incomplete` with `the declared items differ from the required corpus` and `the declaration does not hold 90 items` |

## Documentation

README, the P7 section: the declaration (`experiment.json`, written before the first dispatch, refused when changed),
its input constructor (`instr`, `kernel-window-v1`, the catalogue's hash); the required corpus (`P7_COUNTS`:
quick 30 + 112 + 7, full 30 + 676 + 7, timing 90; `expectedCorpus` recomputed at every check from its sources, never
from the declaration); the shared checks (the declared items and constructor against the required corpus, the corpus
input index, the producer, the item log through `resumePlan`); the two verdicts and their `diagnostics`; the coverage
rule of the memory fixtures (D-P24-05). "A unit test may give a small corpus of its own; the commands always use
`expectedCorpus`, so a shortened corpus can never certify `p7-corpus-v1`."

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T03b --label frozen` | repository root, first | `firewall: snapshot of S24-T03b` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T03b --horizon-s 285` | repository root (unlocked) | every case `PASS` | 5 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T03b --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the three files | 1 min |

## Stop points and questions

- Stop and report before: any `equal` or `time` run on a candidate (T03c adds the commands; T03d, T04, T05a, T05b and
  S02 run them).
- Send `QUESTION:` to the pack author (through the orchestrator) when: `runItems`' identity or `resumePlan` does not hold
  what steps 5 to 7 read; the task looks wrong or contradicts the code; an ambiguity changes behaviour or a contract; a
  gate fails for a reason not covered here; a change is needed outside the scope; a recorded decision would change.
  Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03b-B01 | The expected items of every verdict come from a declaration written before the run and are checked against the corpus the spike requires, recomputed from its sources; a shortened, re-hashed or reordered corpus is never `equal` or `measured` | the verdict cases | the PASS lines |
| T03b-B02 | A run whose log has a missing or extra start, an interruption or another producer than its declaration never yields a verdict other than `incomplete` | the verdict cases | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03b-T01 | `corpusCounts`, `corpusInputPaths`, `checkDeclaration`, `runProblems`, `equalVerdict`, `timeVerdict` return the Tests table's values on valid start/end logs and on every negative variant | `--items` | the PASS lines |
| T03b-T02 | `npm run check`, the firewall and G1 to G3 pass | the gates | their output |

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
| Start, end, duration | 2026-11-24 01:35 +07:00 (dispatch, base `d8feac0`); 2026-11-24 01:46 +07:00 (accepted); 12 min. The developer reported 01:35:37-01:42 |
| Waiting for rulings | about 6 min (the pack author's review of the open details) |
| Agent id, model | `309b6a23-5009-4c9e-8f4a-50ff3eded938`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 36 calls; 4,296,740 input, 52,587 output, 4,154,705 cache-read tokens |
| AI credits | 129.64 (developer only) |
| Questions and rulings | no QUESTION; the six open details (counts, memory coverage and budget entry shapes, `corpusVersion`, no `duplicates`/`unexpected` in `timeVerdict`, `unreadable <file>`) accepted by SA-Opus as ruling R-P24-07 |
| Fix rounds | 0 |
| Gates re-run by the orchestrator | `self-test --items --task S24-T03b-orch`: 220 passed, 0 failed (35.6 s; cases 218-220 PASS); `check-edits --all` exit 0; `firewall check --task S24-T03b`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the three Scope files |
| Commit | this task's commit |
| Issues and named items | `declareRun`, `expectedCorpus` and `readRun` first run on real trees in T03d's quick equality run (R-P24-07) |

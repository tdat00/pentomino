# T03a: P7: the equality and timing items and their memory fixtures (`p7-probe.mjs`, part 1)

| Item | Value |
|---|---|
| Feature, plan | improve-generating-stages-2-4, `docs/improve-generating-stages-2-4/plan.md` §2 (P7's scoped spike), §6 T6, §8.2 T03-T05; `report.md` §3; plan v4 §3 P7 ("Rules"); D-S24-15, D-S24-22, D-S24-28; pack decisions D-P24-05, D-P24-06 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of S01 |
| Depends on | S01 |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min allocated (two locked verification cases of about a minute each) |

## Goal

P7 may make the rating kernel faster only if every result stays identical: the complete `DeductionResult`, its work
units, node counts, caps, tie order, undo paths and memory-limit outcome. This task builds the measured part of the
spike's instrument before any kernel change: the item declarations of the corpora (T10a's kernel corpus, PM4's
profiles and a deterministic memory-boundary fixture manifest with models near 32 MiB), the conversion of a declaration
into runtime items, and the two worker kinds that compare a candidate tree with the reference tree `base`
(`p7-equal`) and time them in pairs (`p7-time`). T03b adds the experiment declaration, its checks and the verdicts,
T03c the bindings, the go rule and the commands; T03d, T04 and T05a add candidate variants.

## Authority and fixed points

- Plan v4 P7 "Rules": "Each item is tested by equality of the complete `DeductionResult`, `work` and `nodes` included,
  on PM4's corpus, with tie order and cap boundaries"; "The memory-limit outcome is part of equality. `model-too-large`
  is decided on the reference slot table exactly as today (`deduce.js:302-309`, `limits.memoryBytes` = 32 MiB). A new
  representation may add storage only while the reference slots plus that storage stay within `limits.memoryBytes`
  (and the worker budget); otherwise the rating runs on the reference representation. The corpus includes models near
  the limit."
- D-P24-05 (this pack): reference `base`; tiers `quick` and `full`; the memory-boundary fixtures are part of both
  tiers; error equality covers name, `code`, message and details.
- D-V4-14: every measurement runs as items of `lib/items.mjs` (an identity, an `item-start` before dispatch, one
  `item-end`, an ended item never rerun); a lane worker runs real work, admitted by a reserve per kind. D-V4-15: the
  equality runs are locked verification (no allocation, through the lock helper); the timing run is a measurement under
  the runner (S02).
- The corpora are read, never written: T10a's kernel corpus (carved again from `ig-v4/kernel/<case>`, as
  `kernel-probe.mjs` `kernelItems` and `lane-worker.mjs` `kernelItem` do), PM4's
  (`tests/artifacts/ig-proto/frozen/IGP-02/main/<cell>/calls.json`, a historical namespace read-only, with `pm4.mjs`
  `profilesOf` and `screenValues`; the existing coverage is 30 kernel items, 112 quick and 676 full PM4 profiles, and the
  first-profile rule gives 123 numeric screen settings across 28 sets, SA-Astra's review R06) and the memory fixture
  manifest of step 2.
- **The input constructor** (SA-Astra's review R2-01, verbatim): "Construct T10a's kernel inputs using the fixed frozen
  `instr` input-construction engine, with the original `ig-v4/kernel/<case>` seeds and subset rule. The input
  constructor is independent of the candidate. Bind its tree identity, the catalogue and its construction rule/version
  in the experiment declaration. Pass the same resulting board, pieces and clues to `base` and the candidate. The
  deductions/ratings being compared and timed remain `base` versus the candidate; do not add instrumentation to the
  reference or candidate to work around an input-offer problem. Input construction remains outside the timed rating
  interval." The reason: `base` does not offer Hell 1 (`lib/sets.mjs:44-51` returns `not-offered` for a null
  `pieceCountRange`, the frozen level-7 area interval is `[Infinity, Infinity]`, and `self-test.mjs:607-617` expects
  `base` on 26x26 Hell 1 to be `not-offered`), while T10a carved with `r4c`, which extends `instr`, whose diagnostic
  offers carve it; the P7 candidates extend `base`. The rule `kernel-window-v1` is `kernelItem`'s (lines 323-336):
  `firstCarvedSet(maker, { boardRows, levelId, seedText: 'ig-v4/kernel/<case>' })` (eight attempts, carving only, no
  rating; `lib/sets.mjs:88`), then `windowSubsets(maker, { set, seedText, offsets: [1, 2, 3], perCount: 2,
  startCount: startCountFor(maker, levelId, K) })` (`lib/calls.mjs`, pure: shuffles of the stream
  `ig/window/<g>/<s>`), subset index 0 to 5; the catalogue is `tools/ig-proto/data/boards-v1.json` (`caseBoard`). A
  corpus-construction failure (`no-set`, `no-subset`) is a probe defect: an item error, so the verdict is `incomplete`
  and the pack author rules, never evidence against a candidate.
- **The memory fixtures** (SA-Astra's review R05; `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-p7-memory.mjs`
  and its `bt-p7-memory.json`, computed on the frozen engine: `buildModel`, the arena's bytes after a build in a fresh
  main workspace, and the bytes of the precheck's `model-too-large` error under `memoryBytes: 0`; no deduction ran).
  Each fixture is a fully active `width x height` board tiled by `pieces` equal rectangles of `a` columns by `b` rows,
  no clue. The canonical limit is 33,554,432 bytes; the main workspace 167,772,160 bytes:

  | Fixture | Board, pieces | Rows | Nonzeros | Columns | Arena bytes | Reference slot bytes | List bytes `4 (3 NZ + 2 C)` | At 32 MiB |
  |---|---|---:|---:|---:|---:|---:|---:|---|
  | `mem-small` | 10 x 6, 12 of 1 x 5 | 672 | 4,032 | 72 | 126,772 | 41,543 | 48,960 | lists |
  | `mem-mid` | 20 x 12, 48 of 1 x 5 | 16,896 | 101,376 | 288 | 3,106,996 | 857,735 | 1,218,816 | lists |
  | `mem-near-lists` | 34 x 119, 1 of 34 x 119 | 1 | 4,047 | 4,047 | 323,827 | 33,072,156 (482,276 below) | 80,940 | lists |
  | `mem-near-reference` | 32 x 126, 2 of 16 x 126 | 34 | 68,578 | 4,034 | 2,130,514 | 33,107,689 (446,743 below) | 855,208 | reference (the slots fit, the lists do not) |
  | `mem-above` | 32 x 127, 2 of 16 x 127 | 34 | 69,122 | 4,066 | 2,147,410 | 33,630,537 (76,105 above) | 861,992 | `model-too-large` |

  The near-limit fixtures are the smallest (by nonzeros) whose arena plus slots fit the main workspace, so the
  reference precheck, not the arena, decides. No valid product input reaches 32 MiB (a 676-cell model stays under about
  27 MB of slots), so the near-limit models are synthetic, as the precheck's formula allows. Their limits are the
  canonical `DEDUCE` with `work` and `census` bounded to 20,000,000 each (`fixtureLimits`) so that each deduction is
  short; `memoryBytes` stays canonical.

## Scope

- Create: `tools/ig-proto/lib/p7-core.mjs`, the pure helpers that both the command and the lane worker use:
  `MEMORY_MANIFEST`, `MEMORY_SETTINGS`, `memoryManifest`, `fixtureInput`, `workInputs`, `limitsFor`, `outcomeOf` (steps
  1 to 7). They live in `lib/` and not in `p7-probe.mjs` so that the lane worker keeps importing only Node built-ins and
  label-free `lib/` modules (at the base `lib/lane-worker.mjs:12-16` imports `./calls.mjs`, `./engine.mjs`,
  `./ledger.mjs`, `./packs.mjs` and `./sets.mjs`; the rule of the case `frozen: worker modules do not read the label`,
  `self-test.mjs:620-630`): importing the command `p7-probe.mjs` would load its whole command graph (the label, the
  lanes, the records) in every lane thread. (A worker's `process.argv[1]` is its own file, checked with Node v26.13.0
  by `docs/improve-generating-stages-2-4/evidence/sa-opus/bt-worker-argv.mjs`, so the command's main guard would not
  run in a worker; the reason is the import graph.)
- Create: `tools/ig-proto/p7-probe.mjs` (this task: the constants, `export { MEMORY_MANIFEST, MEMORY_SETTINGS,
  memoryManifest, fixtureInput, workInputs, limitsFor, outcomeOf } from './lib/p7-core.mjs';`, `settingsOf`, `treeRef`,
  `equalDeclarations`, `timeDeclarations`, `runtimeItems`; T03b and T03c add the declaration, the verdicts, the bindings
  and the commands to this file).
- Create: `tools/ig-proto/data/p7-memory-fixtures.json` (step 2).
- Change: `tools/ig-proto/lib/lane-worker.mjs`: two item kinds in `handle` (line 363), their functions after
  `kernelItem` (line 323), and the cached input-construction engine `inputEngine(root)` before them.
- Change: `tools/ig-proto/lib/lanes.mjs`: `DEFAULT_LIMITS.itemReserveS` (line 22) gains `'p7-equal': 120, 'p7-time': 90`.
- Change: `tools/ig-proto/lib/items.mjs`: `ITEM_LANES` (line 22) gains `'p7-equal': 2, 'p7-time': 1`.
- Change: `tools/ig-proto/self-test.mjs`: two cases appended to `itemCases` (`--items`) and two to `v4Cases` (`--v4`;
  the second, `p7: timing items of base against base`, by ruling R-P24-06).
- Change: `tools/ig-proto/README.md`: a new section `## P7's spike (stages 2 to 4 pack, T03a to T05b)` after the
  section `## The fitting reader (stages 2 to 4 pack, T02b and T02c)` (T02c's).
- Do not change: every other file; no variant is added here. Guards: G1, G2 (the data file is an addition), G3 lists
  only the eight files above.

## Steps

1. **Constants.** In `lib/p7-core.mjs` (`// @ts-check`, header comment "P7's pure helpers (stages 2 to 4 pack T03a):
   shared by p7-probe.mjs and lib/lane-worker.mjs; no main, no lanes, no label"):
   `export const MEMORY_MANIFEST = 'tools/ig-proto/data/p7-memory-fixtures.json';`,
   `export const MEMORY_SETTINGS = Object.freeze(['fixture', 'mem-below', 'mem-ref', 'mem-fast']);`. In `p7-probe.mjs`
   (`// @ts-check`, header comment naming T03a to T03c): `export const P7_REFERENCE = 'base';`,
   `export const P7_CORPUS_VERSION = 'p7-corpus-v1';`,
   `export const P7_KERNEL_CASES = Object.freeze(['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '26x26-nightmare', '26x26-hell-1']);`
   (`manifest.mjs` `KERNEL_CASES`; six window subsets each, `kernel-probe.mjs` `SUBSETS_PER_CASE`),
   `export const P7_PM4_CELLS = Object.freeze(['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-hell-1', '26x26-master', '26x26-nightmare']);`,
   `export const P7_ROUNDS = 3;`, `export const P7_GO_RATIO = 1.04;`,
   `export const P7_INPUT_CONSTRUCTOR = 'instr';`, `export const P7_INPUT_RULE = 'kernel-window-v1';`,
   `export const P7_CATALOGUE = 'tools/ig-proto/data/boards-v1.json';`. Steps 3, 5, 6 and 7 go to `lib/p7-core.mjs`;
   steps 4 and 8 to `p7-probe.mjs`.
2. **The fixture manifest.** Create `tools/ig-proto/data/p7-memory-fixtures.json` with exactly this content (two-space
   JSON, CRLF, final newline):

   ```json
   {
     "format": "ig-p7-memory-fixtures",
     "version": 1,
     "source": "docs/improve-generating-stages-2-4/evidence/sa-opus/bt-p7-memory.mjs on the frozen engine 3fc65f4",
     "limit": 33554432,
     "workspaceBytes": 167772160,
     "limits": { "work": 20000000, "census": 20000000 },
     "fixtures": [
       { "id": "mem-small", "width": 10, "height": 6, "a": 1, "b": 5, "pieces": 12, "rows": 672, "nonzeros": 4032, "columns": 72, "arenaBytes": 126772, "refBytes": 41543, "listBytes": 48960, "canonical": "lists" },
       { "id": "mem-mid", "width": 20, "height": 12, "a": 1, "b": 5, "pieces": 48, "rows": 16896, "nonzeros": 101376, "columns": 288, "arenaBytes": 3106996, "refBytes": 857735, "listBytes": 1218816, "canonical": "lists" },
       { "id": "mem-near-lists", "width": 34, "height": 119, "a": 34, "b": 119, "pieces": 1, "rows": 1, "nonzeros": 4047, "columns": 4047, "arenaBytes": 323827, "refBytes": 33072156, "listBytes": 80940, "canonical": "lists" },
       { "id": "mem-near-reference", "width": 32, "height": 126, "a": 16, "b": 126, "pieces": 2, "rows": 34, "nonzeros": 68578, "columns": 4034, "arenaBytes": 2130514, "refBytes": 33107689, "listBytes": 855208, "canonical": "reference" },
       { "id": "mem-above", "width": 32, "height": 127, "a": 16, "b": 127, "pieces": 2, "rows": 34, "nonzeros": 69122, "columns": 4066, "arenaBytes": 2147410, "refBytes": 33630537, "listBytes": 861992, "canonical": "model-too-large" }
     ],
     "sequence": [
       { "fixture": "mem-small", "memoryBytes": 33554432, "expect": "lists" },
       { "fixture": "mem-mid", "memoryBytes": 33554432, "expect": "lists" },
       { "fixture": "mem-small", "memoryBytes": 33554432, "expect": "lists" },
       { "fixture": "mem-mid", "memoryBytes": 2076550, "expect": "reference" },
       { "fixture": "mem-small", "memoryBytes": 33554432, "expect": "lists" },
       { "fixture": "mem-near-reference", "memoryBytes": 33554432, "expect": "reference" },
       { "fixture": "mem-small", "memoryBytes": 33554432, "expect": "lists" },
       { "fixture": "mem-above", "memoryBytes": 33554432, "expect": "model-too-large" },
       { "fixture": "mem-small", "memoryBytes": 33554432, "expect": "lists" }
     ],
     "capacity": [
       { "fixture": "mem-mid", "memoryBytes": 33554432, "capacityBytes": 5183547, "expect": "lists" },
       { "fixture": "mem-mid", "memoryBytes": 33554432, "capacityBytes": 5183546, "expect": "reference" }
     ]
   }
   ```

   (`sequence` runs in one fresh main workspace per tree: first allocation, growth to `mem-mid`, a smaller model after
   growth, a reference-only call (2,076,550 = 857,735 + 1,218,816 - 1) followed by a list call, the near-limit fallback,
   the rejected model, and a list call after each. `capacity` runs each entry in a fresh workspace of that capacity:
   5,183,547 = arena 3,106,996 + slots 857,735 + lists 1,218,816.)
3. **`memoryManifest()`** (exported): reads and parses `abs(MEMORY_MANIFEST)` once (cached); throws `p7-probe: bad
   memory manifest: <reason>` unless `format` is `ig-p7-memory-fixtures`, `version` 1, the five fixture ids are
   distinct, and every `sequence`/`capacity` entry names a fixture. **`fixtureInput(f)`** (exported, pure): `{ boardRows:
   Array.from({ length: f.height }, () => '#'.repeat(f.width)), pieces: Array.from({ length: f.pieces }, (_, i) => ({ id:
   \`r${i}\`, label: \`R${i}\`, color: '#888888', cells: Array.from({ length: f.a * f.b }, (_, k) => [k % f.a, Math.floor(k / f.a)]) })), clues: [] }`.
4. **Settings** (`export function settingsOf(tier)`): `quick` → `['canonical', 'tie1', 'undo', 'work-half', 'mem-ref',
   'mem-fast']`; `full` → `['canonical', 'tie1', 'undo', 'work-half', 'work-minus1', 'work-ref', 'census-half',
   'mem-below', 'mem-ref', 'mem-fast']`; any other tier throws `p7-probe: unknown tier <t>`. Memory fixture items always
   use `MEMORY_SETTINGS`.
5. **Work inputs** (`export function workInputs(result)`, pure): `const refCensusWork = result.census?.work ?? 0;`
   returns `{ refWork: result.search.work - refCensusWork, refCensusWork }`. `DeductionResult.search.work` includes the
   census's work (`deduce.js:1747,1811,1820-1822`), so `refWork` is the main search's work.
6. **Limits** (`export function limitsFor(setting, { base, refWork, refCensusWork, refBytes, extraBytes })`, pure):
   `base` is the item's base limits (the tree's `DEDUCE` for corpus items, `{ ...DEDUCE, ...manifest.limits }` for
   memory items); returns `{ limits, diagnostics }`, or `null` when the setting does not apply to this item:
   - `canonical` and `fixture`: `{ limits: base, diagnostics: {} }` (the same object `base`); `tie1`: `{ limits: base,
     diagnostics: { tieOrder: 1 } }`; `undo`: `{ limits: base, diagnostics: { verifyUndo: true } }`;
   - `work-half`: `{ ...base, work: Math.floor(refWork / 2) }` when `refWork >= 2`, else null; `work-minus1`: `work:
     refWork - 1` when `refWork >= 1`; `work-ref`: `work: refWork` when `refWork >= 1`;
   - `census-half`: `{ ...base, census: Math.floor(refCensusWork / 2) }` when `refCensusWork >= 2`, else null;
   - `mem-below`: `memoryBytes: refBytes - 1` when `refBytes >= 1`; `mem-ref`: `memoryBytes: refBytes + extraBytes - 1`
     and `mem-fast`: `memoryBytes: refBytes + extraBytes`, both only when `extraBytes > 0`;
   - `screen:<W>`: `{ limits: { ...base, work: W }, diagnostics: {} }`, where `<W>` must match `^(0|[1-9][0-9]*)$` and be
     a safe integer, else throw `p7-probe: bad screen setting <setting>`;
   - any other setting throws `p7-probe: unknown setting <setting>`.
   Every non-null value has `diagnostics: {}` unless listed above. A work setting whose inputs are `undefined` (the
   reference's canonical outcome was an error) is not passed to `limitsFor`: the worker lists it as `inapplicable`.
7. **Outcome** (`export function outcomeOf(fn)`, pure): runs `fn()`; returns `{ result }` with `structuredClone` of the
   returned value, or `{ error: { name, code, message, details } }` from a thrown value (`name` the error's name or
   `typeof`; `code` and `details` its own properties or `null`; `details` through `JSON.parse(JSON.stringify(...))`).
   Two outcomes are equal when `isDeepStrictEqual` holds.
8. **Declarations** (repository paths only, never an absolute root; SA-Astra's review R06):
   - `export async function treeRef(variant)` → `{ variant, treeId, copyDigest, root: rel(info.root) }` from
     `ensureTree(variant)`.
   - `export async function equalDeclarations(candidate, tier)`: `const otherTree = (await treeRef(P7_REFERENCE)).root;`
     and `const inputTree = (await treeRef(P7_INPUT_CONSTRUCTOR)).root;`, then, in this order: **kernel** — for each
     case of `P7_KERNEL_CASES` and subset index 0 to 5: `{ id: \`equal:${candidate}:kernel:${caseId}:${i}\`, kind:
     'p7-equal', variant: candidate, payload: { source: 'kernel', boardRows, levelId, seedText:
     \`ig-v4/kernel/${caseId}\`, subsetIndex: i, settings: settingsOf(tier), otherTree, inputTree } }`
     (`boardRows`, `levelId` from `lib/sets.mjs` `caseBoard(caseId)`); **PM4** — for each cell of `P7_PM4_CELLS`, `calls
     = JSON.parse(readFileSync(join(artifactDir('frozen', 'IGP-02', 'main', cell), 'calls.json'), 'utf8'))`, each set
     with `set.pieces !== null` in order, each `{ order, record }` of `profilesOf(set)` (`order < 4` in `quick`, all in
     `full`): `{ id: \`equal:${candidate}:pm4:${cell}:${set.i}:${order}\`, kind: 'p7-equal', variant: candidate, payload:
     { source: 'pm4', boardRows: set.boardRows, pieces: set.pieces, clues: record.idx.map((i) => set.witness[i]),
     levelId: calls.levelId, settings: tier === 'quick' ? ['canonical'] : order === 0 ? ['canonical',
     ...[...screenValues(record, calls.limits.work).keys()].map((W) => \`screen:${W}\`)] : ['canonical'], otherTree } }`;
     **memory** — for each fixture of the manifest: `{ id: \`equal:${candidate}:memory:${f.id}\`, kind: 'p7-equal',
     variant: candidate, payload: { source: 'memory', fixture: f.id, settings: [...MEMORY_SETTINGS], otherTree } }`, then
     `{ id: \`equal:${candidate}:memory:sequence\`, ..., payload: { source: 'memory-sequence', otherTree } }` and `{ id:
     \`equal:${candidate}:memory:capacity\`, ..., payload: { source: 'memory-capacity', otherTree } }`. Counts: `quick`
     30 + 112 + 7 = 149 items; `full` 30 + 676 + 7 = 713 items.
   - `export async function timeDeclarations(candidate)`: for `round` 0 to 2, each kernel case and subset 0 to 5: `{ id:
     \`time:${candidate}:${caseId}:${i}:${round}\`, kind: 'p7-time', variant: candidate, payload: { boardRows, levelId,
     seedText, subsetIndex: i, round, otherTree, inputTree } }` (90 items; `otherTree` and `inputTree` as in
     `equalDeclarations`).
   - `export function runtimeItems(declared)` (pure, the one conversion used by run, resume and report): each item with
     `payload` replaced by `{ ...rest, otherRoot: abs(otherTree) }` (`otherTree` removed) and, when the payload has
     `inputTree`, also `inputRoot: abs(inputTree)` (`inputTree` removed).
9. **The `p7-equal` item** (`lib/lane-worker.mjs`, `async function p7EqualItem(p)`; reference = `otherKit(p.otherRoot)`,
   candidate = this thread's engine). Helpers inside the function: `build(t, w, input)` =
   `t.tiling.buildModel(t.board.boardFromRows(input.boardRows), input.pieces, input.clues, w)`; `run(t, w, input,
   limits, diagnostics)` = `{ const d = { ...diagnostics }; const outcome = outcomeOf(() => t.deduce.measureDeduction(build(t, w, input), limits, d)); return { outcome, representation: d.igRepresentation ?? null, listBytes: d.igListBytes ?? null, wsBytes: w.bytes(), capacityBytes: w.capacityBytes }; }`
   (a fresh copy of the diagnostics per call, so a candidate's `ig*` fields never reach the reference; `outcomeOf`,
   `workInputs`, `limitsFor`, `fixtureInput` and `memoryManifest` imported from `./p7-core.mjs`, never from
   `../p7-probe.mjs`). By source:
   - `kernel`: the input is constructed by the input-construction engine, never by this thread's or the reference's:
     `const maker = await inputEngine(p.inputRoot)`, where `inputEngine(root)` (a function added before `p7EqualItem`:
     a `Map` of `loadEngine(root)` promises by root, made once per root; no workspace, since carving and subsets need
     none) gives the `instr` engine; then `carved = firstCarvedSet(maker, { boardRows, levelId, seedText })`, `subsets =
     windowSubsets(maker, { set: carved.set, seedText, offsets: [1, 2, 3], perCount: 2, startCount: startCountFor(maker,
     levelId, carved.K) })`, `subset = subsets[subsetIndex]` (as `kernelItem`, lines 326-336, with `maker` for `engine`)
     → `input = { boardRows, pieces: carved.set.pieces, clues: subset.clues }`; no carve or no subset: `{ outcome:
     'no-set', reason }` or `{ outcome: 'no-subset' }` (an item error for the verdict). `pm4`: `input = { boardRows,
     pieces, clues }` from the payload. Base limits `engine.policy.DEDUCE`. First the reference's
     canonical run in its kit workspace `wsOther`; when its outcome has `result`, `workInputs(outcome.result)` gives
     `refWork`, `refCensusWork`; otherwise every setting of `work-half`, `work-minus1`, `work-ref`, `census-half` is
     `inapplicable`. `refBytes` = `details.bytes` of `outcomeOf(() => other.deduce.measureDeduction(build(other,
     wsOther, input), { ...base, memoryBytes: 0 }))` when that outcome is an error with code `model-too-large` and a
     numeric `details.bytes`, else the memory settings are `inapplicable`. `extraBytes` = `outcomeOf(() =>
     engine.deduce.igListBytes?.(build(engine, ws, input)) ?? 0)`'s result (0 on an error). Then each setting in order:
     `inapplicable`, or `limitsFor` (null: `skipped`), or both runs (reference in `wsOther`, candidate in `ws`) and their
     equality. A model-construction error is an outcome like any other: it is compared, never skipped.
   - `memory`: `f` = the manifest's fixture, `input = fixtureInput(f)`, base `{ ...engine.policy.DEDUCE,
     ...manifest.limits }`; in a fresh workspace `createWorkspace(MAIN_WORKSPACE_BYTES)` of the reference tree, build
     the model and require `w.bytes() === f.arenaBytes`; require the reference's `memoryBytes: 0` error bytes `===
     f.refBytes`; a mismatch or a missing value ends the item `{ outcome: 'error', reason: \`fixture ${f.id}: <field>
     <seen>, the manifest says <expected>\` }`. `extraBytes` as above. Each setting of `MEMORY_SETTINGS` runs each tree in
     its own fresh main workspace.
   - `memory-sequence`: one fresh main workspace per tree for the whole `sequence`; each step runs `fixtureInput` of its
     fixture with `{ ...base, memoryBytes: step.memoryBytes }`.
   - `memory-capacity`: each `capacity` entry runs each tree in a fresh workspace `createWorkspace(entry.capacityBytes)`
     with `{ ...base, memoryBytes: entry.memoryBytes }`.
   Result: `{ outcome: 'ok', same: <every compared step equal>, compared: [<settings or step labels>], skipped: [...],
   inapplicable: [...], differing: [{ setting, reference, candidate }] (at most 3, the first ones), refBytes (or null),
   extraBytes, steps: [{ setting, same, representation, listBytes, wsBytes, capacityBytes, memoryBytes, referenceError,
   candidateError }] }`, where `representation` and `listBytes` are the candidate's, the step labels of the sequence and
   capacity items are `seq-<i>` and `cap-<i>` (0-based), `memoryBytes` is the limit of that step, and `referenceError`
   and `candidateError` are the two outcomes' `error` objects (as `outcomeOf` normalizes them) or null, for every
   compared step, equal error outcomes included (SA-Astra's review R2-05).
10. **The `p7-time` item** (`async function p7TimeItem(p)`): the input as the `kernel` source of step 9 (constructed by
    `inputEngine(p.inputRoot)`, before any timing); then, per tree, `board = t.board.boardFromRows(boardRows)` before
    its timing; `rateOf(t, w, board)` = `outcomeOf(() => t.difficulty.rate(board, pieces, clues, w))`, timed with
    `performance.now()` around that call only.
    Order: `round` even → reference then candidate; odd → candidate then reference. **A capped rating is a timed rating**
    (ruling R-P24-06): `rate` throws `IncompleteRatingError` (`code` `rating-incomplete`, own `counters` `{ nodes,
    work, stop }`) when the deduction path was capped (RES-04, `difficulty.js:63-79` and `:316-322` of the frozen source),
    and the generator charges that work and goes on (`clues.js:323-344`), so its time is real work time. `rateOf` keeps
    the thrown error's `counters` (null otherwise) beside the outcome. Result: when each rating returned a result or
    threw `IncompleteRatingError`, `{ outcome: 'ok', refMs, candMs, same, capped }` (ms rounded to 3 decimals; `same` the
    equality of the two outcomes and of the two `counters`; `capped` `'both'`, `'one'` or `'none'`, the ratings that
    threw `IncompleteRatingError`); else `{ outcome: 'error', reason: 'a rating threw', reference: <outcome>, candidate:
    <outcome> }`; no carve or no subset: `{ outcome: 'no-set', reason }` or `{ outcome: 'no-subset' }`. In
    `lib/lane-worker.mjs` (the code of T03a's first round, at the end of `p7TimeItem`), `rateOf` and the result are:

    ```js
      const rateOf = (/** @type {any} */ t, /** @type {any} */ w, /** @type {any} */ board) => {
        let ms = 0;
        /** @type {any} */
        let counters = null;
        const outcome = outcomeOf(() => {
          const t0 = performance.now();
          try {
            return t.difficulty.rate(board, pieces, clues, w);
          } catch (error) {
            counters = /** @type {any} */ (error)?.counters ?? null;
            throw error;
          } finally {
            ms = performance.now() - t0;
          }
        });
        return { outcome, ms, counters };
      };
    ```

    and, replacing the two returns after the two `rateOf` calls:

    ```js
      /** @param {ReturnType<typeof rateOf>} r @returns {boolean} A result, or a capped deduction path (RES-04). */
      const timed = (r) => 'result' in r.outcome || r.outcome.error?.name === 'IncompleteRatingError';
      /** @param {ReturnType<typeof rateOf>} r @returns {boolean} */
      const cappedOf = (r) => !('result' in r.outcome);
      if (timed(reference) && timed(candidate)) {
        return {
          outcome: 'ok',
          refMs: round3(reference.ms),
          candMs: round3(candidate.ms),
          same: isDeepStrictEqual(reference.outcome, candidate.outcome) && isDeepStrictEqual(reference.counters, candidate.counters),
          capped: cappedOf(reference) && cappedOf(candidate) ? 'both' : cappedOf(reference) || cappedOf(candidate) ? 'one' : 'none',
        };
      }
      return { outcome: 'error', reason: 'a rating threw', reference: reference.outcome, candidate: candidate.outcome };
    ```

    A capped rating on one tree only is `same: false` (T03b's `notSame`: the timing verdict `failed`); any other thrown
    error stays an item error (T03b's `errors`: the verdict `incomplete`, and the pack author rules).
11. In `handle`: `if (kind === 'p7-equal') { return p7EqualItem(p); }` and `if (kind === 'p7-time') { return
    p7TimeItem(p); }` before the test kinds. `lanes.mjs` and `items.mjs`: the reserves and lanes of the Scope.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `self-test.mjs` (`--items`) | `p7: settings, work inputs and limits` | `settingsOf('quick')`, `settingsOf('full')`, `settingsOf('x')`; `workInputs({ search: { work: 107 }, census: { work: 100 } })` and `workInputs({ search: { work: 9 }, census: null })`; `limitsFor` with `base = { lookaheadWidth: 2, nodes: 100, solutions: 2, work: 1000, census: 50, memoryBytes: 4096 }`, `refWork: 7, refCensusWork: 100, refBytes: 300, extraBytes: 40` for each setting; `limitsFor('screen:500', ...)`, `('screen:-1', ...)`, `('screen:1e3', ...)`, `('wat', ...)`; the conversion `[...new Map([[95000000, ['fixed']], [7, ['mainWork-1', 'tail-mid']]]).keys()].map((W) => \`screen:${W}\`)` | the two lists of step 4; the throw `p7-probe: unknown tier x`; `{ refWork: 7, refCensusWork: 100 }` and `{ refWork: 9, refCensusWork: 0 }`; `work-half` work 3, `work-minus1` 6, `work-ref` 7 (not 53, 106, 107); `census-half` census 50; `mem-below` memoryBytes 299; `mem-ref` 339; `mem-fast` 340; `canonical` and `fixture` the same object `base`; `tie1` diagnostics `{ tieOrder: 1 }`; with `extraBytes: 0`: `mem-ref` and `mem-fast` null; `screen:500` work 500; the throws `p7-probe: bad screen setting screen:-1`, `... screen:1e3`, `p7-probe: unknown setting wat`; `['screen:95000000', 'screen:7']` |
| same file (`--items`) | `p7: outcomes, fixtures and declarations` | `outcomeOf(() => ({ a: [1, 2] }))`; `outcomeOf(() => { const e = new RangeError('m'); e.code = 'c'; e.details = { b: 1 }; throw e; })`; `memoryManifest()`; `fixtureInput` of `mem-near-reference`; `runtimeItems([{ id: 'x', kind: 'p7-equal', variant: 'base', payload: { source: 'pm4', otherTree: 'tests/artifacts/ig-proto/tree-frozen/base' } }, { id: 'y', kind: 'p7-equal', variant: 'base', payload: { source: 'kernel', otherTree: 'tests/artifacts/ig-proto/tree-frozen/base', inputTree: 'tests/artifacts/ig-proto/tree-frozen/instr' } }])` | `{ result: { a: [1, 2] } }`; `{ error: { name: 'RangeError', code: 'c', message: 'm', details: { b: 1 } } }`; five fixtures, nine sequence and two capacity entries; 126 board rows of 32 `#`, two pieces of 2,016 cells, the second piece id `r1`, `clues` `[]`; the payloads `{ source: 'pm4', otherRoot: abs('tests/artifacts/ig-proto/tree-frozen/base') }` and `{ source: 'kernel', otherRoot: abs('tests/artifacts/ig-proto/tree-frozen/base'), inputRoot: abs('tests/artifacts/ig-proto/tree-frozen/instr') }`, without `otherTree` or `inputTree` |
| same file (`--v4`, locked) | `p7: equality items of base against base` | `runItems` on the scratch task `S24-T03a-dev` (step `equal`, horizon 285) with `runtimeItems` of: `equal:base:kernel:10x10-nightmare:0` and `equal:base:kernel:26x26-hell-1:0` (each with settings `canonical`, `tie1`, `work-half`; the input built by `instr`); the PM4 item of `10x10-nightmare`, its first set with `pieces !== null`, order 0, full-tier settings; the five memory fixture items, the sequence item and the capacity item of `equalDeclarations('base', 'quick')`; and a construction-error item `{ id: 'equal:base:pm4:bad-clue', kind: 'p7-equal', variant: 'base', payload: { source: 'pm4', boardRows: <the PM4 item's>, pieces: <its>, clues: [{ ...<its first clue>, piece: 'no-such-piece' }], levelId: <its>, settings: ['canonical', 'work-half', 'mem-ref'], otherTree } }`; the folder is removed at the end | every item `completed`, `same: true`; the two kernel items `outcome` `ok` (never `no-set` or `no-subset`: the Hell 1 input is built by `instr`), `compared` `['canonical', 'tie1', 'work-half']`, `skipped` `[]`; the PM4 item compared at least two `screen:` settings; the memory items' `refBytes` equal the manifest's (`mem-near-reference` 33,107,689; `mem-above` 33,630,537) and `mem-above`'s `fixture` step's `referenceError` is `{ name: 'ModelError', code: 'model-too-large', message: 'deduction buffers need 33630537 bytes, the limit is 33554432', details: { bytes: 33630537, limit: 33554432 } }` and its `candidateError` is deep-equal to it; every step's `representation` null (the reference has no lists); the sequence item has nine steps and the capacity item two; the bad-clue item compared `['canonical']` with an `invalid-clue` error on both trees (its `canonical` step's `referenceError` and `candidateError` both of code `invalid-clue`) and `inapplicable` `['work-half', 'mem-ref']` |
| same file (`--v4`, locked) | `p7: timing items of base against base` (ruling R-P24-06) | as the equality case: `runItems({ task: 'S24-T03a-dev-time', step: 'time', label: 'selftest', horizonS: elapsedS() + 285, items: runtimeItems(items) })` after `fresh(artifactDir('selftest', 'S24-T03a-dev-time'))`, the folder removed at the end; `items` = the three declarations of `await timeDeclarations('base')` with the ids `time:base:10x10-nightmare:0:0`, `time:base:10x10-nightmare:0:1` and `time:base:26x26-hell-1:0:0`, in that order | the run `{ exitCode: 0, done: true, progress: 3, refused: null }`; every item's end `completed`; each result `outcome` `ok`, `same` true, `refMs` and `candMs` finite numbers above 0; `capped` `'none'` for the two 10x10 items and `'both'` for the Hell 1 item (both trees threw `IncompleteRatingError` with equal `counters`) |

## Documentation

`tools/ig-proto/README.md`, new section `## P7's spike (stages 2 to 4 pack, T03a to T05b)`: the corpora and tiers
(step 8, with the counts 149 and 713), the input constructor of the kernel inputs (`instr`, the rule
`kernel-window-v1`, the catalogue `data/boards-v1.json`; outside every timed interval; why `base` cannot build the Hell 1
inputs), the settings (steps 4 and 6), the memory fixture manifest (step 2, its table and
why the near-limit models are synthetic), the equality rule (step 7), the two item kinds and what their results record
(steps 9 and 10; a capped rating on both trees is a timed pair with `capped: 'both'`, ruling R-P24-06), "equality runs
are locked verification under the task ids `V4-P7E-<candidate>-<tier>`; the timing run is `V4-P7` (S02)".

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\firewall.mjs snapshot --task S24-T03a --label frozen` | repository root, first | `firewall: snapshot of S24-T03a` | 1 min |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --items --task S24-T03a --horizon-s 285` | repository root (unlocked) | every case `PASS` | 5 min |
| check-list §3.1's selection block with `$Id = 'S24-T03a'`, `$GroupArgs = @('--v4')`, `$Locked = $true`, `$Required = @('p7: equality items of base against base', 'p7: timing items of base against base')` | PowerShell 7 at the repository root | `PASS <n> p7: equality items of base against base`; `PASS <m> p7: timing items of base against base`; `IG S24-T03a cases exit=0`; `cases: 2 passed, as required` | 5 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | repository root | no error | 3 min |
| `node tools\ig-proto\firewall.mjs check --task S24-T03a --label frozen` | repository root, last | `firewall: OK, ...` | 1 min |
| `npm run check` | repository root | `check-conventions: OK`, `check-site: OK` | 2 min |
| G1, G2, G3 | repository root | G1, G2 print nothing; G3 lists the eight files | 1 min |

## Stop points and questions

- Stop and report before: any `equal` or `time` run on a candidate (T03c adds the commands; T03d, T04, T05a, T05b and
  S02 run them).
- Send `QUESTION:` to the pack author (through the orchestrator) when: a fixture's arena or slot bytes differ from the
  manifest (do not edit the manifest); `measureDeduction` with `memoryBytes: 0` does not throw a `model-too-large` error
  with `details.bytes`; the task looks wrong or contradicts the code; an ambiguity changes behaviour or a contract; a
  gate fails for a reason not covered here; a change is needed outside the scope; a recorded decision would change.
  Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03a-B01 | A kernel candidate can be compared with the reference on T10a's and PM4's corpora and on declared models near the 32-MiB limit, with ties, cap boundaries, undo paths and memory limits, before any timing | the cases; the README | the PASS lines |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T03a-T01 | `settingsOf`, `workInputs`, `limitsFor`, `outcomeOf`, `memoryManifest`, `fixtureInput`, `runtimeItems` return the Tests table's values (main-work boundaries from main work; screen settings from the map's keys) | `--items` | the PASS lines |
| T03a-T02 | The memory fixtures reproduce the manifest's bytes on the reference engine; a model-construction error is compared; `p7-equal` items of `base` against `base` end equal on every source; `p7-time` items time both trees, a capped rating on both trees included as a timed pair (`capped: 'both'`, `same: true`; ruling R-P24-06) | the two `--v4` cases through the lock helper | the PASS lines, the helper line |
| T03a-T03 | The new kinds have their reserves and lanes (`p7-equal` 120 s, 2 lanes; `p7-time` 90 s, 1 lane) | the diff of `lanes.mjs` and `items.mjs` | the diff |
| T03a-T04 | `npm run check`, `check-edits`, the firewall and G1 to G3 pass | the gates | their output |

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
| Start, end, duration | 2026-11-24 01:09 +07:00 (dispatch, base `f3fe6a6`); 2026-11-24 01:35 +07:00 (accepted); 26 min. The developer reported 01:09:48-01:19:00 and, in the fix round, 01:30:11-01:32:16 |
| Waiting for rulings | about 10 min (the pack author's review of the open details and the Hell 1 finding) |
| Agent id, model | `218e44b2-996b-46a3-ab06-2e785b88d4e0`, claude-sonnet-5.5 (Dev-Sonnet) |
| Calls; input, output and cache-read tokens | 61 calls; 8,131,413 input, 60,652 output, 7,788,941 cache-read tokens |
| AI credits | 224.15 (developer only) |
| Questions and rulings | no QUESTION; the developer's smoke check found `p7-time` on `26x26-hell-1` subset 0 ending `a rating threw` (`IncompleteRatingError` on both trees): ruling R-P24-06 by SA-Opus, a fix round (a capped rating on both trees is a timed pair, `capped` reported; a new `--v4` timing case; T03b amended); the six open details accepted; pack amendment `1ad38c0` |
| Fix rounds | 1 (R-P24-06) |
| Gates re-run by the orchestrator | `self-test --items --task S24-T03a-orch2`: 217 passed, 0 failed (36.2 s); the locked selection block (`--v4`, `S24-T03a-orch2`): `p7: equality items of base against base` PASS (17.3 s, 11 items), `p7: timing items of base against base` PASS (6.2 s; capped none, none, both), `IG ... exit=0 seconds=23.711 quiet=15`, `cases: 2 passed, as required`; `check-edits --all` exit 0; `firewall check --task S24-T03a`: OK, 289 files; `npm run check` OK; G1, G2 empty; G3 the eight Scope files |
| Commit | this task's commit |
| Issues and named items | the `capped: 'one'` and `error` branches of `p7-time` and the `differing`, `representation`, `listBytes`, `mem-ref`, `mem-fast` paths are exercised only by the candidates (T03d and later); future smoke checks are committed cases (R-P24-06) |

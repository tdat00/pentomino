# P2-12b: Measurement copies, their source binding and the common proof runner

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.1 (`tools/ig-proto/phase2/`), §7.1 (arms, counterfactual identities, source binding: R2), §7.2 (the common proof runner); D-P2-11, D-P2-12; P2-T14 (part); review-1 R13; review-2 R2-03 (the runner moved here from P2-12c), R2-04; `contracts.md` C14 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-12b` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | join; P2-05b (the selector is final), P2-11b (the client, CLI and bench anchors are final) and P2-13r |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`). The today worktree `Q:\git\pentomino-p2-today` exists from the setup of check-list §3.7 |
| Estimate | developer 3 h (2.5 h for the copies, 0.5 h for the runner moved from P2-12c); machine: unlocked copy checks, locked focused runs |

## Goal

Every measured arm runs as an identified copy of a known source:

- `today`, from the phase-1 head `6b94ffb`;
- `gen-v4`, the candidate;
- the counterfactuals `p2-none` and `p2-uncapped`, with their own algorithm ids;
- the Hell 1 diagnostic offer, as a separately identified layer.

Each copy records the root and the digest of the sources it was built from, so the seal (P2-13a) binds them. P2-12d
then adds the trace layer to the same chains. This task also writes the common proof runner `proofs.mjs`, into which
P2-12c and P2-12e plug their bundles.

## Authority and fixed points

- **R2 (plan §7.1), verbatim:** "Use distinct experimental identities for altered recipes: `gen-v4-proto:p2-none` with
  `screen-p2-none-v1` (no screen), and `gen-v4-proto:p2-uncapped` with the selected production prior/screen tables but
  P5's budget, bound and combined deadline disabled. A diagnostic-offer or trace layer is separately identified in the
  receipt, including when combined with a counterfactual. These copies are never published as the shipping build."
- **The frozen tree builder, unchanged.** `planTree(id, opts)` and `buildTree(id, opts)` of `tools/ig-proto/lib/tree.mjs`
  (lines 185-330), with the options `manifests` (an object: id to manifest), `filesRoot`, `sources` (a `Map` of
  path to text or `Buffer`), `errors`, `dest` and `sourceLabel`.
  - A manifest missing from `opts.manifests` is read from `tools/ig-proto/variants/`; this is how `base` is found.
  - `meta-1` (the no-git edit of `tools/calibrate.mjs`) and `meta-2` (the added `core/engine/` files appended to the
    copy's `SOURCE_FILES`) apply to every copy. `meta-2` needs `SOURCE_FILES`' last line,
    `'tools/bench/responsiveness.js', 'tools/bench/calibration-reference.js',`, to stay last (P2-01).
  - No existing file under `tools/ig-proto/` changes (G-PROTECTED).
- **R13: the builder's `info.worktree` describes the invoking slot, not the input root.** So each copy gets its own
  receipt, `p2-copy.json`, naming its input root and the digest of its input sources. The seal adds the git facts of
  the today worktree (P2-13a); this tool runs no git.
- **The edit anchors** are exact texts of the merged production code:
  - `const bound = setBound(results);` (P2-06, `generation-client.js`);
  - `  const scope = usesGenV4(caseDef.levelId, boardFromRows(caseDef.boardRows)) ? { origin: s.t0, setCutAt: s.t0 + DEADLINE.setStageCapMs } : undefined;`
    (P2-10, `tools/bench/runner.js`);
  - the `gen-v4.js` lines of P2-01 step 2;
  - `export const ALGO_ID = 'gen-v4';` (`version.js`; before P2-15 only through `--rehearse-cutover`);
  - the frozen `diag-1` anchor of `core/engine/policy.js`.
- **The common proof runner (review-2 R2-03, verbatim):** "P2-12b also creates `tools/ig-proto/phase2/proofs.mjs`: move
  P2-12c step 1, including the exported `compare`, verbatim into P2-12b. Add that path to P2-12b's scope and
  `$Allowed`, and remove it from P2-12c's create list and `$Allowed`. Test `compare`'s equal/differing-path cases in
  `copies.test.mjs`; bundle modules remain dynamically loaded only on invocation. P2-12c and P2-12e create only their
  own bundles and test files. P2-12e's focused test command names only `proofs-prior-legacy.test.mjs`, not P2-12c's
  future test file. Both retain P2-12d as their start prerequisite."
- **The proof record** is `contracts.md` C14, with `quick` and `sources` (review-2 R2-04).

## Scope

- **Create, under `tools/ig-proto/phase2/`:**
  - `copies.mjs`: the tool;
  - `copies.test.mjs`: its tests, and those of the runner;
  - `proofs.mjs`: the common proof runner (step 4);
  - `variants/p2-diag.json`, `variants/p2-gen4.json`, `variants/p2-gen4-diag.json`, `variants/p2-none.json`,
    `variants/p2-uncapped.json`, `variants/p2-uncapped-diag.json` and `variants/p2-today.json`.

  No manifest of this task lists `files`, so the builder never reads `filesRoot` yet; P2-12d creates
  `tools/ig-proto/phase2/files/`.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/copies.mjs', 'tools/ig-proto/phase2/copies.test.mjs',
    'tools/ig-proto/phase2/proofs.mjs',
    'tools/ig-proto/phase2/variants/p2-diag.json', 'tools/ig-proto/phase2/variants/p2-gen4.json',
    'tools/ig-proto/phase2/variants/p2-gen4-diag.json', 'tools/ig-proto/phase2/variants/p2-none.json',
    'tools/ig-proto/phase2/variants/p2-uncapped.json', 'tools/ig-proto/phase2/variants/p2-uncapped-diag.json',
    'tools/ig-proto/phase2/variants/p2-today.json', 'tasks/improve-generating-phase-2/P2-12b-copies.md')
  ```

## Steps

1. **Style.** Every new file: `// @ts-check` ES modules, CRLF, 2-space indent. JSON manifests: 2-space indent, CRLF, a
   final newline. `copies.mjs` runs no git and never edits a file outside its `dest`.
2. **The manifests** (the tree builder's format: `id`, `extends`, `description`, `edits`, `files`, `params`). Every edit
   is `{ id, file, find, replace }` or `{ id, file, append }`; `find` texts are exact substrings, matched once.

   | Manifest | `extends` | Edits | `params` |
   |---|---|---|---|
   | `p2-diag` | `[]` | `diag-1` and `diag-2`: the objects of `tools/ig-proto/variants/instr.json` with those ids, copied verbatim | `{ "diagnosticOffers": true }` |
   | `p2-gen4` | `["base"]` | none | `{ "p2": "gen-v4", "source": "gen-v4" }` |
   | `p2-gen4-diag` | `["p2-gen4", "p2-diag"]` | none | `{}` |
   | `p2-none` | `["p2-gen4"]` | `nn-1` `core/engine/gen-v4.js`: `export const SCREEN_TABLE_ID = 'screen-v4-v1';` to `export const SCREEN_TABLE_ID = 'screen-p2-none-v1';`; `nn-2` the same file: `export const SCREEN_AREAS = Object.freeze([196, 256]);` to `export const SCREEN_AREAS = Object.freeze([1, 0]);` (no area is screened); `nn-3` `core/engine/version.js`: `export const ALGO_ID = 'gen-v4';` to `export const ALGO_ID = 'gen-v4-proto:p2-none';` | `{ "p2": "p2-none" }` |
   | `p2-uncapped` | `["p2-gen4"]` | `un-1` `core/engine/gen-v4.js`: the whole `export const CALL_BUDGET = ...;` line of P2-01 to `export const CALL_BUDGET = Object.freeze({ any: Object.freeze({}), require: Object.freeze({}) });` (every budget is `Infinity`); `un-2` `core/browser/generation-client.js`: `const bound = setBound(results);` to `const bound = null;` (no bound); `un-3` `tools/bench/runner.js`: P2-10's scope line above to `  const scope = undefined;` (no shared scope: a guard per request); `un-4` `core/engine/version.js`: `export const ALGO_ID = 'gen-v4';` to `export const ALGO_ID = 'gen-v4-proto:p2-uncapped';` | `{ "p2": "p2-uncapped" }` |
   | `p2-uncapped-diag` | `["p2-uncapped", "p2-diag"]` | none | `{}` |
   | `p2-today` | `["base"]` | `td-1` `tools/bench/runner.js`: `  if (c.uniqueness !== 'any') {` to `  if (c.uniqueness !== 'any' && c.uniqueness !== 'require') {` (today's bench accepts `require` rows, as P2-12a's does) | `{ "p2": "today", "source": "today" }` |

   `files` is `[]` in each. `description` is one sentence naming the arm or layer and R2.
3. **`copies.mjs`.** Export the functions below and a command line. It imports `planTree` and `buildTree` from
   `../lib/tree.mjs`, and `lf` and `sha256` from `../lib/records.mjs`.
   - `export const COPIES = Object.freeze({ 'gen-v4': Object.freeze(['p2-gen4', 'p2-gen4-diag', 'p2-none', 'p2-uncapped', 'p2-uncapped-diag']), today: Object.freeze(['p2-today']) });`
   - `export function loadManifests()`: every `*.json` of `tools/ig-proto/phase2/variants/`, parsed, keyed by its
     `id`. A file whose `id` differs from its name throws.
   - `export function readSources(root)`: the same map as `collectSources()` of `tree.mjs` (lines 133-176), built from
     `root` instead of the slot:
     - `core/` and `tools/` read recursively in name order, skipping the folder `tools/ig-proto`;
     - `package.json`;
     - a file whose bytes contain 0 is kept as a `Buffer`; any other is `lf(text)`.
   - `export function rehearse(sources)`: returns a copy of the map in which `core/engine/version.js` has
     `export const ALGO_ID = 'gen-v3';` replaced by `export const ALGO_ID = 'gen-v4';`, and `core/engine/gen-v4.js` has
     `export const GEN_V4_LIVE = false;` replaced by `export const GEN_V4_LIVE = true;`. Each anchor must occur once;
     otherwise it throws `Error('--rehearse-cutover: <file> has no <anchor>; the cutover is already merged')`.
   - `export function inputDigest(sources)`: `sha256(JSON.stringify([...sources].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, c]) => [p, sha256(c)])))`.
   - `export function checkCopies({ source, root, rehearsal })`: for each id of `COPIES[source]`, `planTree(id, { manifests, filesRoot, sources, errors })`.
     Returns `{ ok, variants, edits, errors }`, where `edits` counts the applied edits.
   - `export async function buildCopies({ source, root, rehearsal, destRoot })`: for each id, `buildTree(id, { manifests, filesRoot, sources, dest: join(destRoot, source, id), sourceLabel: 'p2-' + source })`.
     Then it writes `p2-copy.json` (CRLF, 2-space JSON) into each tree:
     `{ format: 'p2-copy', version: 1, id, source, root, rehearsal, inputDigest, treeId, copyDigest, chain, params }`.
     It returns those records.
   - **Defaults.** `filesRoot` is `tools/ig-proto/phase2/files`. `destRoot` is `tests/artifacts/ig-proto/phase2/trees`.
     `root` is the slot (the folder three levels above `copies.mjs`) for `gen-v4`; for `today` it is required.
   - **The command line.** `node tools\ig-proto\phase2\copies.mjs check|build --source gen-v4|today [--root <dir>] [--rehearse-cutover] [--dest <dir>]`.
     - `check` prints `copies: OK (<n> variants, <m> edits match)` and exits 0, or prints each error and exits 1.
     - `build` prints one line `<id> <treeId> <copyDigest>` per copy and exits 0.
     - A missing or unknown argument prints the usage and exits 1.
4. **`proofs.mjs <bundle> --out <dir> [--quick]`** (P2-12c step 1, moved verbatim; review-2 R2-03).
   - It imports `./proof-<bundle>.mjs` by name, with `bundle` one of `observer`, `certificate`, `prior-replay` or
     `legacy`. A missing module exits 2 with `proofs: no bundle <bundle>`.
   - It calls `run({ out, quick, root, trees })`, where `root` is the repository root and `trees` the copies' folder.
     `run` returns `{ status, cases, counts }`.
   - It writes `result.json` and `result.md` with the `sources` it computes: `computeSourceDigest` of the root, and
     each copy's `treeId` from its `ig-tree.json`.
   - It exits 0 on `pass` and 1 on `fail`.
   - `--quick` runs only the first case of each kind (the rehearsal).
   - Export `compare(a, b)` (the first differing path, or `null`) for the bundles and the tests.

   The C14 record (review-2 R2-04) completes it:
   - `run` also returns `copies`, the ids of the copies the bundle used (`[]` when it used production modules only).
     The runner reads each one's `ig-tree.json` at `<trees>/<source>/<id>/`, with `source` from `COPIES`.
   - `result.json` is
     `{ format: 'p2-proof', version: 1, bundle, status, quick, cases, counts, sources: { sourceDigest, copies: [{ id, treeId }] } }`,
     built by the exported pure function `resultOf({ bundle, quick, outcome, sourceDigest, copies })`, with `outcome`
     the value `run` returned; `result.md` is its table. Both are CRLF.
   - `root` is the folder three levels above `proofs.mjs`; `trees` is `tests/artifacts/ig-proto/phase2/trees` under it.
     `computeSourceDigest` is that of `tools/bench/report.js`, reading `join(root, path)`.
   - A bundle module is imported only on invocation, with `await import(new URL(\`./proof-${bundle}.mjs\`, import.meta.url))`;
     no test loads a bundle.
5. **`copies.test.mjs`** (`node:test`): the cases below. They plan trees in memory; the one build writes under
   `tests/artifacts/ig-proto/phase2/self-test/<run>/`, with `<run>` = `copies-` plus the test's start time in
   milliseconds, and removes it at the end.
6. **Gates.** Run the two copy checks and the locked focused gate.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/copies.test.mjs` | `the source reader matches the harness's` | `readSources(<slot root>)` and `collectSources()` of `tree.mjs` | the same keys; equal contents |
| same | `every gen-v4 copy plans with its edits` | `checkCopies({ source: 'gen-v4', root: <slot>, rehearsal })`, with `rehearsal = !versionText.includes("ALGO_ID = 'gen-v4'")` | `ok` true; 5 variants |
| same | `the today copy plans on the phase-1 head` | `checkCopies({ source: 'today', root: 'Q:\\git\\pentomino-p2-today', rehearsal: false })` | `ok` true; 1 variant |
| same | `the counterfactuals carry their own identities` | `planTree` of `p2-none` and `p2-uncapped` | `version.js` has `gen-v4-proto:p2-none` and `gen-v4-proto:p2-uncapped`; `p2-none`'s `gen-v4.js` has `screen-p2-none-v1` and `[1, 0]`; `p2-uncapped`'s client has `const bound = null;`, its runner has `  const scope = undefined;`, its `gen-v4.js` has the empty budgets |
| same | `the diagnostic layer is identified` | `planTree` of `p2-gen4-diag` and `p2-uncapped-diag` | `params.diagnosticOffers` true; `policy.js` has `IG.diagnosticOffers !== true &&`; `p2-gen4`'s `params` has no `diagnosticOffers` |
| same | `the copies are distinct identities` | the treeIds of the six copies | six different values; each `params.variant` is its id |
| same | `the rehearsal refuses after the cutover` | a sources map whose `version.js` already says `gen-v4` | `rehearse` throws the message of step 3 |
| same | `a build writes its receipt` | `buildCopies({ source: 'gen-v4', ... })` restricted to `p2-gen4` into the self-test root | `p2-copy.json` with the fields of step 3; its `treeId` and `copyDigest` equal `ig-tree.json`'s; `inputDigest` equals `inputDigest(readSources(<slot>))` of the (rehearsed) map |
| same | `compare reports the first difference` | two results differing in `skips.subsets[1]` | `skips.subsets.1` |
| same | `compare returns null for equal values` | two deep-equal results | `null` |
| same | `an unknown bundle exits 2` | `node tools/ig-proto/phase2/proofs.mjs nope --out <self-test folder>`, spawned | exit 2, `proofs: no bundle nope` |
| same | `the proof record binds its sources and quick` | `resultOf({ bundle: 'observer', quick: true, outcome: { status: 'pass', cases: [], counts: {} }, sourceDigest: 'd', copies: [{ id: 'p2-gen4', treeId: 't' }] })` | exactly the C14 fields; `quick` true; `sources` `{ sourceDigest: 'd', copies: [{ id: 'p2-gen4', treeId: 't' }] }` |

For the last case, export `buildCopies`'s per-copy step as `buildCopy(id, opts)` and call it once.

## Documentation

None here; P2-17 documents `tools/ig-proto/phase2/` in `tools/ig-proto/README.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\phase2\copies.mjs check --source gen-v4 @flag`, with `$flag` as G-COPIES defines it (check-list §3.4) | slot root, unlocked (no engine) | `copies: OK (5 variants, <m> edits match)` | 1 min |
| `node tools\ig-proto\phase2\copies.mjs check --source today --root Q:\git\pentomino-p2-today` | slot root, unlocked | `copies: OK (1 variants, <m> edits match)` | 1 min |
| locked focused gate: `-NodeArgs @('--test', 'tools/ig-proto/phase2/copies.test.mjs')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

From this task's merge on, G-COPIES runs in every merge gate (check-list §3.7).

## Stop points and questions

- **`QUESTION:`** when:
  - an anchor does not match exactly once (a production task changed an anchor line);
  - the today worktree is missing or `copies.mjs check --source today` fails;
  - `buildTree` needs a change to accept a source map from another root.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12b-B01 | Counterfactual arms can never be mistaken for the shipping build | proto ids and distinct treeIds | test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-12b-T01 | P2-T14 (part): distinct identities for altered recipes; the diagnostic layer identified by its params | identity cases | test output |
| P2-12b-T02 | R13: each copy's receipt names its input root and input digest | the build case | test output |
| P2-12b-T03 | No frozen harness file changes | G-PROTECTED | gate output |
| P2-12b-T04 | Review-2 R2-03 and R2-04: one common runner loads the bundles by name at invocation and writes the C14 record with `quick` and `sources` | the runner cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the focused gate green
- [ ] Both `copies.mjs check` runs OK
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the two check outputs;
- the helper lines and the pass counts;
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

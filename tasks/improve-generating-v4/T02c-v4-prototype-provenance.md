# T02c: `gen-v4` prototype provenance: per-arm identity, the seven-key shape and old records

| Item | Value |
|---|---|
| Feature, plan | improve-generating, `docs/improve-generating/plan.md` §5.1 ("Skip replay", "One running version (IG-P-Q34)", "Provenance shape (IG-P-Q36)"), §6 ("Replay (P4)"), §9 ("Provenance beyond the version keys"); decisions D-V4-04, D-V4-05; drift DR-O01, DR-O14, DR-A06; review RV1-02 (R02), RV2-15 |
| Repository, branch, base | `Q:\git\pentomino`, `improve-generating`, the commit of T02b |
| Depends on | T02b |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (claude-sonnet-5.5) |
| Estimate | developer 3 h, machine 0 min (reader cases and replay preflights; verification through the lock helper) |

## Goal

The prototype adopts the complete `gen-v4` provenance contract before its measurement receipt (plan §5.1, IG-P-Q36):
each experimental arm has its own algo identity, a `gen-v4` record carries seven version keys (today's five plus the
prior table and the screen table) and the field `igPrior`, a `gen-v3` record keeps exactly today's shape, bounds and
behaviour, and a record whose arm or table version differs from the running one is "unavailable" before any skip is
applied. Phase 2 (N-V4-07) ports this proven contract to production instead of designing it.

## Authority and fixed points

- Plan §5.1 "Provenance shape (IG-P-Q36)": "The stored `versions` keys depend on the record's `algo`. A `gen-v4` record
  has today's five keys plus P4's table version and the `W_screen` table version, and needs all seven; every other
  record, `gen-v3` included, keeps exactly today's five keys. The reader checks the shape of the record's own `algo`,
  copies those keys, and keeps a valid record of either shape through a load and a save; a record of the wrong shape is
  dropped with a warning, as today. The version comparison includes the two table versions when both sides are
  `gen-v4`." §6 "Replay (P4)": "a record of another `algo` or table version is 'unavailable'".
- D-V4-05 (check-list §4): the experimental algo id of a tree is `gen-v4-proto:<variant id>` (the tree builder writes
  `IG.variant`, `tools/ig-proto/lib/tree.mjs:244`); a receipted variant is never edited, a changed configuration is a
  new variant id; the table versions are the variant's `params.priorTable` and `params.screenTable` (`'none'` when
  absent). A record's family is `gen-v4` exactly when its `versions.algo` is the production id `gen-v4` or an
  experimental id `gen-v4-proto:<variant id>` with a variant id of 1 to 40 characters from `a-z`, `0-9` and `-`
  starting with a letter or digit (review RV2-15); every other algo string, `gen-v40` included, keeps the five-key
  reader and the `gen-v3` bounds.
- D-V4-04: a `gen-v4` record's subset ordinals are below 2,192 and its repair ordinals below 64; a `gen-v3` record keeps
  2,128 and 64 (`core/engine/pack.js:49-55`). The 64-entry subset and 16-entry repair list limits stay for both.
- Production files do not change: the edits are copy-only anchored edits of `variants/v4.json`, inherited by every
  `v4`-family arm. The frozen readers of the `base`, `instr`, `log` and `p1p5*` trees stay as they are.
- `tests/fixtures/replay-case.json` is read, never written (it is the `gen-v3` refusal case, plan §6).

## Scope

- Change: `tools/ig-proto/variants/v4.json` (edits `pv-1` to `pv-17` appended to `edits`), `tools/ig-proto/self-test.mjs`
  (helpers and four cases appended to `v4Cases`; two asserts in T02b's case `v4: throwing observers propagate`, step 3),
  `tools/ig-proto/README.md` (a subsection).
- Do not change: everything else. Guards: `node tools\ig-proto\firewall.mjs check --task V4-T02c --label frozen`,
  expected `files unchanged`; `git status --short -- tools/ig-proto/variants/files core generator tests`, expected no
  output.

## Steps

0. `node tools\ig-proto\firewall.mjs snapshot --task V4-T02c --label frozen`.
1. **Edits** appended to `variants/v4.json`'s `edits`, in this order (`\n` is a line break; every `find` occurs exactly
   once in its file of the `log` tree, which `v4` extends; checked by the pack author on `3fc65f4`):

   | Id | File | Find | Replace |
   |---|---|---|---|
   | `pv-1` | `core/engine/version.js` | `// @ts-check\n` | `// @ts-check\nimport { IG } from './ig-params.js';\n` |
   | `pv-2` | `core/engine/version.js` | `export const ALGO_ID = 'gen-v3';\n` | the block A below |
   | `pv-3` | `core/engine/generate.js` | `import { ALGO_ID } from './version.js';\n` | `import { ALGO_ID, PRIOR_TABLE_ID, SCREEN_TABLE_ID } from './version.js';\n` |
   | `pv-4` | `core/engine/generate.js` | `  return { algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, seedScheme: SEED_SCHEME, ratingModel: MODEL };\n` | `  return {\n    algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, seedScheme: SEED_SCHEME, ratingModel: MODEL,\n    priorTable: PRIOR_TABLE_ID, screenTable: SCREEN_TABLE_ID,\n  };\n` |
   | `pv-5` | `core/engine/generate.js` | `    recordSource: 'candidate',\n    replaySkips,\n` | `    recordSource: 'candidate',\n    replaySkips,\n    ...(ctx.igPrior === undefined ? {} : { igPrior: ctx.igPrior }),\n` |
   | `pv-6` | `core/engine/generate.js` | `      skips: capSkips(sel.skips),\n      versions: provenanceVersions(),\n` | `      skips: capSkips(sel.skips),\n      igPrior: ctx.igPrior ?? null,\n      versions: provenanceVersions(),\n` |
   | `pv-7` | `core/engine/pack.js` | `const VERSION_KEYS = ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel'];\n` | the same line, then the block B below |
   | `pv-8` | `core/engine/pack.js` | `function versionsProblem(v) {\n  const shape = exactKeysProblem(v, VERSION_KEYS);\n` | `function versionsProblem(v) {\n  const keys = isV4Versions(v) ? VERSION_KEYS_V4 : VERSION_KEYS;\n  const shape = exactKeysProblem(v, keys);\n` |
   | `pv-9` | `core/engine/pack.js` | `  const o = /** @type {Record<string, unknown>} */ (v);\n  for (const key of VERSION_KEYS) {\n` | `  const o = /** @type {Record<string, unknown>} */ (v);\n  for (const key of keys) {\n` |
   | `pv-10` | `core/engine/pack.js` | `function skipsProblem(v) {\n` | `function skipsProblem(v, subsetBound = PROVENANCE.subsetOrdinals) {\n` |
   | `pv-11` | `core/engine/pack.js` | `  return ordinalsProblem('subsets', o.subsets, PROVENANCE.subsetSkips, PROVENANCE.subsetOrdinals)\n` | `  return ordinalsProblem('subsets', o.subsets, PROVENANCE.subsetSkips, subsetBound)\n` |
   | `pv-12` | `core/engine/pack.js` | `  const shape = exactKeysProblem(v, kind === 'candidate' ? MADE_CANDIDATE_KEYS : MADE_PLAIN_KEYS);\n` | `  const v4 = kind === 'candidate' && isV4Versions(ownValue(v, 'versions'));\n  const shape = exactKeysProblem(v, kind !== 'candidate' ? MADE_PLAIN_KEYS : v4 ? MADE_CANDIDATE_KEYS_V4 : MADE_CANDIDATE_KEYS);\n` |
   | `pv-13` | `core/engine/pack.js` | `  return skipsProblem(o.skips) ?? versionsProblem(o.versions);\n` | `  if (v4 && o.igPrior !== null && !isIntIn(o.igPrior, 1, MAX_PIECES)) {\n    return \`igPrior must be null or an integer from 1 to ${MAX_PIECES}\`;\n  }\n  return skipsProblem(o.skips, v4 ? SUBSET_ORDINALS_V4 : PROVENANCE.subsetOrdinals) ?? versionsProblem(o.versions);\n` |
   | `pv-14` | `core/engine/pack.js` | `    ratingModel: /** @type {string} */ (v.ratingModel),\n  };\n}\n` | `    ratingModel: /** @type {string} */ (v.ratingModel),\n    ...(isV4Versions(v) ? { priorTable: v.priorTable, screenTable: v.screenTable } : {}),\n  };\n}\n` |
   | `pv-15` | `core/engine/pack.js` | `    skips: skips === 'overflow' ? skips : { subsets: skips.subsets.slice(), repairs: skips.repairs.slice() },\n` | the same line, then `    ...(isV4Versions(v.versions) ? { igPrior: v.igPrior } : {}),\n` |
   | `pv-16` | `core/engine/replay.js` | `    && a.ratingModel === b.ratingModel;\n` | `    && a.ratingModel === b.ratingModel && a.priorTable === b.priorTable && a.screenTable === b.screenTable;\n` |
   | `pv-17` | `core/engine/replay.js` | `          uniqueness: m.uniqueness,\n` | `          uniqueness: m.uniqueness,\n          ...(m.igPrior === null \|\| m.igPrior === undefined ? {} : { igPrior: m.igPrior }),\n` |

   In the JSON the backquotes of `pv-13` are plain characters; the `\|\|` of `pv-17` is the Markdown escape of `||`.
   Block A (`pv-2`):

   ```js
   // ig-proto, variant v4 (V4-T02c): one experimental algo id per arm, and the arm's table versions (D-V4-05).
   export const ALGO_ID = `gen-v4-proto:${IG.variant}`;
   export const PRIOR_TABLE_ID = typeof IG.priorTable === 'string' ? IG.priorTable : 'none';
   export const SCREEN_TABLE_ID = typeof IG.screenTable === 'string' ? IG.screenTable : 'none';
   ```

   Block B (`pv-7`):

   ```js
   // ig-proto, variant v4 (V4-T02c): the provenance shape follows the record's own algo (plan 5.1, IG-P-Q36).
   const VERSION_KEYS_V4 = [...VERSION_KEYS, 'priorTable', 'screenTable'];
   const MADE_CANDIDATE_KEYS_V4 = [
     'schema', 'kind', 'batchSeed', 'targetLevel', 'uniqueness', 'slot', 'attempt', 'start', 'skips', 'igPrior', 'versions',
   ];
   const SUBSET_ORDINALS_V4 = 2192;
   /**
    * Whether a raw `versions` value names the gen-v4 family: `gen-v4` or `gen-v4-proto:<variant id>` (D-V4-05).
    * @param {unknown} versions
    * @returns {boolean}
    */
   function isV4Versions(versions) {
     const algo = isPlainObject(versions) ? ownValue(versions, 'algo') : undefined;
     return typeof algo === 'string' && (algo === 'gen-v4' || /^gen-v4-proto:[a-z0-9][a-z0-9-]{0,39}$/.test(algo));
   }
   ```

   The candidate's `igPrior` is the effective request's per-set prior: `null` when the request has none (the table
   prior of the record's `priorTable` version is then used). T05 adds the transport that sets `BatchContext.igPrior`;
   until then every `v4`-family record has `igPrior: null`.
2. **Self-test helpers** in `self-test.mjs`, next to `v4Ctx`:
   - `fixtureInput(tree, packIndex, puzzleIndex)`: reads `tests/fixtures/replay-case.json` and builds `{ set, puzzle,
     generation }` exactly as `fixtureInputs()` of `tests/replay.test.js:52-62` (with `setOfPack` of lines 38-46),
     using `validatePack` of the tree's `core/engine/pack.js` and `boardFromRows` of its `board.js` (file URLs).
   - `asV4(made, versions)`: for a `made` entry of kind `candidate`, a new object with the keys in the order of
     `MADE_CANDIDATE_KEYS_V4`: the entry's fields, `igPrior: null` after `skips`, and `versions` replaced by
     `versions`; other kinds are returned unchanged.
   - `v4Generation(generation, versions)`: a deep copy of `generation` whose `setOrigin.versions` is `versions` and whose
     `made` entries are `asV4(entry, versions)`.
   - `cancelTrap = () => { throw new Error('isCancelled was reached'); }`.
3. **Cases** (after T02b's five), with the Tests table's inputs and expectations:
   1. `v4: provenance versions per arm`.
   2. `v4: provenance reader by the record's own algo`.
   3. `v4: old and new records load and save`.
   4. `v4: version and table refusal before any work`.

   And in T02b's case `v4: throwing observers propagate` (ruling of 2026-11-17, T02b's report: a throw must end the
   call at once), two asserts: right after `assert(rc.error === boomC, ...)`,
   ``assert(charges === 3, `charge: ${charges} charges, expected 3 (the throw ends the call at once)`);``; right after
   `assert(rr.error === boomR, ...)`,
   ``assert(events === 2, `record: ${events} events, expected 2 (the throw ends the call at once)`);``.
4. **README.md**: a subsection "### Provenance of the `gen-v4` prototype" in T02a's section: the algo id rule, the
   seven keys, `igPrior`, the per-algo bounds and key sets, the comparison, the rule that a receipted variant is never
   edited, and that the `base`, `instr`, `log` and `p1p5*` readers stay frozen (they drop a `gen-v4` record with a
   warning).

## Tests

`V` = `provenanceVersions()` of the `v4` tree's `generate.js`; `L` = that of the `log` tree; `m3` = the first entry of
kind `candidate`, in puzzle order, of the fixture's `packs[0].generation.made`; `m4 = asV4(m3, V)`; `P` =
`provenanceProblem` of the tree named in the row.

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/self-test.mjs --v4` | `v4: provenance versions per arm` | `provenanceVersions()` of the `v4`, `v4-w760`, `v4-w095` and `v4-w380` trees and of the `log` tree | `Object.keys(V)` equals `['algo', 'policy', 'rng', 'seedScheme', 'ratingModel', 'priorTable', 'screenTable']`; `V.algo` `'gen-v4-proto:v4'`, `V.priorTable` `'prior-v1'`, `V.screenTable` `'w190'`; the other three arms: algo `'gen-v4-proto:v4-w760'` / `'gen-v4-proto:v4-w095'` / `'gen-v4-proto:v4-w380'`, `priorTable` `'prior-v1'`, `screenTable` `'none'` / `'w095'` / `'w380'`; the four algo ids are pairwise different; `policy`, `rng`, `seedScheme`, `ratingModel` equal `L`'s; `L` has exactly the five keys and `L.algo` `'gen-v3'` |
| same | `v4: provenance reader by the record's own algo` | `P` of the `v4` tree on: (a) `m3`; (b) `m4`; (c) `m4` with `igPrior` 5, 0, 129 and `'5'`; (d) `m4` without `igPrior`; (e) `m4` with `versions` without `screenTable`; (f) `m3` with `igPrior: null` after `skips`; (g) `m3` with `versions.priorTable: 'prior-v1'`; (h) `m3` with `skips: { subsets: [2191], repairs: [] }`, `m4` with the same skips, `m4` with `subsets: [2192]`, `m4` with `repairs: [64]`; (i) `P('setOrigin', o)` for the fixture's `packs[0].generation.setOrigin` `o`, for `o` with `versions: V`, and for `o` with `versions: { ...L, algo: V.algo }`; (j) `P` of the `log` tree on `m4`; (k) `m3` with `versions.algo` `'gen-v40'`, and the same with `versions: { ...V, algo: 'gen-v40' }`; (l) `m4` with `versions.algo` `'gen-v4'`, and `m3` with `versions.algo` `'gen-v4'`; (m) `m4` with `versions.algo` `'gen-v4-proto:'` | (a) `null`; (b) `null`; (c) `null`, then three times `'igPrior must be null or an integer from 1 to 128'`; (d) `'missing field "igPrior"'`; (e) `'versions: missing field "screenTable"'`; (f) `'unknown field "igPrior"'`; (g) `'versions: unknown field "priorTable"'`; (h) `'skips.subsets[0] must be an integer from 0 to 2127'`, `null`, `'skips.subsets[0] must be an integer from 0 to 2191'`, `'skips.repairs[0] must be an integer from 0 to 63'`; (i) `null`, `null`, `'versions: missing field "priorTable"'`; (j) `'unknown field "igPrior"'`; (k) `null` (a foreign five-key record stays valid), then `'versions: unknown field "priorTable"'`; (l) `null` (the production id has the seven-key shape), then `'missing field "igPrior"'` (a `gen-v4` candidate needs the field); (m) `'unknown field "igPrior"'` (an empty experimental suffix is not the family) |
| same | `v4: old and new records load and save` | with the `v4` tree's `validatePack`, `serializePack` and `parsePack`: (a) each fixture pack as it is; (b) pack 0 with `generation` replaced by `v4Generation(generation, V)`; (c) pack 0 with `igPrior: null` added after `skips` to the `m3` entry only; (d) the pack of (b) read by the `log` tree's `validatePack` | (a) and (b): `ok` true, no warning with code `provenance-ignored`, `value.generation.setOrigin` and `value.generation.made` deep-equal the input's; then `parsePack(serializePack(value))` is `ok` with no `provenance-ignored` warning and the same `setOrigin` and `made`; (c) `ok` true, exactly one `provenance-ignored` warning, its path starts with `generation.made`, and that entry is absent from `value.generation.made`; (d) `ok` true, one `provenance-ignored` warning for `generation.setOrigin` and one per candidate entry, and no `setOrigin` in the value |
| same | `v4: version and table refusal before any work` | `R(tree, gen)` = `runReplay({ ...fixtureInput(tree, 1, 0), generation: gen }, { ws, scratch }, REPLAY, cancelTrap)` with the tree's `replay.js`, its `policy.REPLAY` and its workspaces; `g3` = the fixture's pack 1 `generation`; `g4 = v4Generation(g3, V)`; in the `v4` tree: (i) `R(v4, g4)`; (ii) `g4` with `priorTable: 'prior-v0'` in `setOrigin.versions` and in every candidate's `versions`; (iii) `g4` without `setOrigin` and with `screenTable: 'w095'` in the puzzle's `made` entry; (iv) `g4` without `setOrigin`; (v) `g3`; and (vi) `R(v4-w095, g4)` in the `v4-w095` tree | (i) throws an error with message `isCancelled was reached` (the record passes the preflight); (ii) returns `status: 'unavailable'`, `reason: 'set-versions'`, `stages` `{ set: 'unavailable', candidate: 'unavailable', final: 'not-compared' }`, `work: 0`; (iii) `status: 'unavailable'`, `reason: 'no-set-origin'`, `stages.candidate: 'unavailable'`, `work: 0`; (iv) throws `isCancelled was reached` (the control of iii: only the screen table differs); (v) `status: 'unavailable'`, `reason: 'set-versions'`, `work: 0`; (vi) `status: 'unavailable'`, `reason: 'set-versions'`, `work: 0` |
| same | `v4: throwing observers propagate` (T02b's case with the two asserts of step 3) | as in T02b | as in T02b, and after the calls `charges` is 3 and `events` is 2 |

The expected values follow from `core/engine/pack.js:1084-1110, 1147-1300` and `core/engine/replay.js:305-363, 531-555`
with the edits of step 1. If a case fails, report the actual values with the input (`QUESTION:`); never change an
expected value.

## Documentation

`tools/ig-proto/README.md` (step 4). No production document changes (the production format is phase 2's, N-V4-07).

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node tools\ig-proto\lib\tree.mjs build v4 v4-w760 v4-w095 v4-w380 --label frozen` | root | four `built` lines (the tree ids change: `v4.json` changed) | 3 min |
| `node tools\ig-proto\lib\tree.mjs check-edits --all --label frozen` | root | one `ok` line per declared variant, no error; `v4` reports 21 edits more than its parent `log` (`v4-1` to `v4-4`, `pv-1` to `pv-17`) | 2 min |
| `Invoke-IgNode -Repo pentomino -Task 'V4-T02c verify' -NodeArgs @('tools\ig-proto\self-test.mjs', '--label', 'frozen', '--source-label', 'frozen 3fc65f4', '--v4', '--task', 'V4-T02c')` (check-list §3.2) | root | twelve cases pass (T02a's three, T02b's five, these four), exit 0 | 5 min (the helper's 300 s) |
| `node tools\ig-proto\self-test.mjs --label frozen --source-label "frozen 3fc65f4" --frozen --task V4-T01b` | root | the nine `--frozen` cases pass | 2 min |
| `node tools\ig-proto\firewall.mjs check --task V4-T02c --label frozen` | root | `files unchanged` | 1 min |
| `npm run check` | root | exit 0 | 2 min |

## Stop points and questions

- Stop and report before: editing a production file, the fixture, `ig-select-v4.js` or a variant other than `v4.json`.
- `QUESTION:` when an anchor does not match exactly once; when a case fails (with the actual values).
- Send `QUESTION:` to the pack author (through the orchestrator) when: the task looks wrong or contradicts the code;
  an ambiguity changes behaviour or a contract; a gate fails for a reason not covered here; a change is needed outside
  the scope; a recorded decision would change. Never decide such a point yourself.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02c-B01 | A record of another arm, or of the same arm with another prior or screen table, is "unavailable" before any work (one running version, table versions in the comparison) | case 4 (ii), (iii), (v), (vi) with their controls (i), (iv) | self-test output |
| T02c-B02 | `gen-v3` records load, save and validate exactly as today in a `v4` tree; a malformed record of either shape is dropped with a warning | cases 2 and 3 | self-test output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| T02c-T01 | Seven keys per `v4`-family arm, one algo id per arm | case 1 | self-test output |
| T02c-T02 | Per-algo key sets, `igPrior` rule and ordinal bounds (2,192 / 2,128; 64) | case 2 | self-test output |
| T02c-T03 | Reader copies and the save keep both shapes | case 3 | self-test output |
| T02c-T04 | The 17 edits apply exactly once on the `log` tree | `check-edits` | command output |
| T02c-T05 | Nothing else changed; formats | guards; `npm run check` | command output |
| T02c-T06 | A `charge` or `record` throw ends the call at once (T02b's case 2, ruling of 2026-11-17) | the two asserts of step 3 | self-test output |

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

# P2-08: Provenance per algorithm family, `made.igPrior`, replay and the saved-steps key

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.3 (seven keys, R2 wording), §4.7 (records, saved-steps key), §4.8; D-P2-06, D-P2-09; IG-P-Q34, IG-P-Q36; P2-T07 (provenance part); review-1 R8 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-08` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | C; P2-07 (the same import line in `generate.js`) |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2.75 h; machine: locked focused runs |

## Goal

Records of the `gen-v4` family carry seven version keys and `made.igPrior`. Every record is read, copied and compared
by its own family, so old `gen-v3` records keep their five keys and stay playable, while their steps are refused by
version. The running code still writes `gen-v3` records until the cutover (P2-15) switches `ALGO_ID`. Everything here
is keyed on the algorithm id, not on a flag.

## Authority and fixed points

- **Frozen edits being ported** (`tools/ig-proto/variants/v4.json`):
  - `pv-3` and `pv-4`: `provenanceVersions`;
  - `pv-6`: `made.igPrior`;
  - `pv-7` to `pv-15`: `pack.js`;
  - `pv-16` and `pv-17`: `replay.js`.

  `pv-1` and `pv-2` (the `IG.variant` ids) are not ported: the ids come from `gen-v4.js` and `version.js`.
- **P2-01's names**, imported from `core/engine/gen-v4.js`: `isV4Family`, `PRIOR_TABLE_ID` (`'prior-s3-v1'`),
  `SCREEN_TABLE_ID` (`'screen-v4-v1'`) and `SKIP_BOUNDS_V4` (`{ subsets: 2192, repairs: 64 }`). This task adds nothing
  to `gen-v4.js`.
- **R2 (plan §4.3), verbatim:** "The gen-v4 family (`gen-v4` and the frozen D-V4-05 namespace `gen-v4-proto:<variant>`)
  uses `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable`, `screenTable` and the gen-v4 candidate/skip
  shape. Other algorithms, including `gen-v3`, retain their five-key shape. Reading/copying follows the record's own
  family; replay still requires equality with the running tuple, so an experimental record is unavailable in the
  shipping build rather than being replayed under its recipe."
- **`made.igPrior`** is an integer from 1 to 128, or `null`. On replay a `null` is omitted, so the table applies
  (`pv-17`).
- **Skip ordinals:** subsets below 2,192 and repairs below 64 for the family; 2,128 and 64 for `gen-v3`
  (`pack.js:51-53`).
- **The fixture.** `tests/fixtures/replay-case.json` stays byte for byte (G-PROTECTED).

## Scope

- **Change:**
  - `core/engine/generate.js`: the import line from `./gen-v4.js`, `provenanceVersions`, `puzzleCandidate`'s `made`;
  - `core/engine/pack.js`: step 4;
  - `core/engine/replay.js`: step 5;
  - `core/engine/types.js`: step 6;
  - `generator/ui/replay-cache.js`: step 7;
  - `docs/design-detail.md` §7.7.
- **Change tests**, new cases only: `tests/pack.test.js`, `tests/replay.test.js` (each at the end of the file),
  `tests/generate.test.js`, `tests/replay-model.test.js` (at the places below).
- **Do not change:** anything else. Guard: G-PROTECTED (including the replay-case blob), and G-WORKTREE with

  ```powershell
  $Allowed = @('core/engine/generate.js', 'core/engine/pack.js', 'core/engine/replay.js', 'core/engine/types.js',
    'generator/ui/replay-cache.js', 'tests/pack.test.js', 'tests/replay.test.js', 'tests/generate.test.js',
    'tests/replay-model.test.js', 'docs/design-detail.md', 'tasks/improve-generating-phase-2/P2-08-provenance-replay.md')
  ```

## Steps

1. **`generate.js`, imports.** Add `isV4Family`, `PRIOR_TABLE_ID` and `SCREEN_TABLE_ID` to the import line from
   `./gen-v4.js` that P2-07 wrote. Keep the names in case-insensitive alphabetical order, as the repository's import
   lines are: `import { isV4Family, PER_SET_LEVELS, perSetPrior, PRIOR_TABLE_ID, SCREEN_TABLE_ID } from './gen-v4.js';`
2. **`provenanceVersions()`.** Return the five keys as today. When `isV4Family(ALGO_ID)`, add
   `priorTable: PRIOR_TABLE_ID, screenTable: SCREEN_TABLE_ID`. Key order: the five, then `priorTable`, then
   `screenTable`.
3. **`puzzleCandidate`'s `made` (`pv-6`, family-gated).** Directly after `skips: capSkips(sel.skips),`, add
   `...(isV4Family(ALGO_ID) ? { igPrior: ctx.igPrior ?? null } : {}),`.
4. **`pack.js`.** Apply `pv-7` to `pv-15`, with these adaptations:
   - `isV4Versions(versions)` is `isV4Family(isPlainObject(versions) ? ownValue(versions, 'algo') : undefined)`;
   - `SUBSET_ORDINALS_V4` is `SKIP_BOUNDS_V4.subsets`, imported from `./gen-v4.js` with `isV4Family`;
   - the `igPrior` check keeps `isIntIn(o.igPrior, 1, MAX_PIECES)` (`MAX_PIECES` is 128, line 40).

   The anchors are line 62 (`VERSION_KEYS`), `versionsProblem` (1147), `skipsProblem` (1194, the ordinals at 1203),
   the made-key check and the two copy functions (frozen `pv-12` to `pv-15`).
5. **`replay.js`.**
   - `sameVersions` (line 180) also compares `priorTable` and `screenTable` (`pv-16`). Five-key records have both
     `undefined`, so they compare equal among themselves. Export it as `export function sameVersions` for the tests.
   - Directly after line 436 (`uniqueness: m.uniqueness,`), add
     `...(m.igPrior === null || m.igPrior === undefined ? {} : { igPrior: m.igPrior }),` (`pv-17`).
6. **`types.js`.** `ProvenanceVersions` gains the optional `priorTable` and `screenTable`; the candidate `Made` gains
   the optional `igPrior: number | null` (the family only).
7. **`generator/ui/replay-cache.js`** (R8: the saved-steps key holds the running tuple).
   - Add `export function replayKeyFor(source, versions)`: the current body of `replayKeyOf` (lines 71-78), with
     `versions, APP_VERSION,` in place of `ALGO_ID, APP_VERSION,` as the first two entries of the canonical array.
   - `replayKeyOf(source)` becomes `return replayKeyFor(source, provenanceVersions());` and keeps its JSDoc, which
     adds: "the running provenance tuple, so steps saved under another tuple are recomputed".
   - Imports: `import { provenanceVersions } from '../../core/engine/generate.js';`, and the `version.js` import keeps
     only `APP_VERSION`.
   - Existing saved replays become cache misses once, and are recomputed: this is a cache, not stored data.
8. **Tests.** Write the cases below and run the focused gate.

## Tests

| Test file, place | Case name | Input | Expected |
|---|---|---|---|
| `tests/pack.test.js`, end | `a gen-v4 record has seven keys and igPrior` | a pack built from the file's valid candidate `made`, with `versions` of algo `gen-v4` plus `priorTable`, `screenTable`, and `igPrior` 7; then `igPrior: null` | valid; a load-save round trip keeps every field |
| same | `family shapes are enforced` | algo `gen-v4` with five keys; algo `gen-v3` with seven keys; `gen-v4` without `igPrior`; `igPrior` 0 and 129 | each refused through the existing warning path (the record is dropped, the puzzle kept) |
| same | `subset ordinals by family` | `skips.subsets [2150]` with `gen-v3`; the same with `gen-v4` | refused; valid (bound 2,192) |
| same | `gen-v4-proto records are the family` | algo `gen-v4-proto:p2-uncapped` with seven keys | valid |
| `tests/replay.test.js`, end | `sameVersions compares the table ids` | two equal seven-key tuples; a differing `screenTable`; five keys against seven | true; false; false |
| same | `the fixture still replays while ALGO_ID is gen-v3` | the file's existing replay of the fixture's first puzzle | `matched`, unchanged |
| `tests/generate.test.js`, at P2-06's place (after the test `lazy certification gives a proof status without changing the accepted fold`) | `provenanceVersions follows ALGO_ID's family` | today | five keys exactly, in the order `algo`, `policy`, `rng`, `seedScheme`, `ratingModel` (`gen-v3`) |
| `tests/replay-model.test.js`, directly after the test `replay cache: the key follows what the replay reads and survives the saved state; a scripted storage has no cache` (lines 1288-1316) | `replay cache: the key holds the running provenance tuple` | `const { replayKeyFor, replayKeyOf } = await import('../generator/ui/replay-cache.js');` and `const { provenanceVersions } = await import('../core/engine/generate.js');`, as that test imports; `source = src('pKey', SET, { schema: 1, kind: 'candidate' })`, as that test builds it; `replayKeyFor(source, provenanceVersions())`; `replayKeyFor(source, { ...provenanceVersions(), rng: 'other' })`; `replayKeyFor(source, { ...provenanceVersions(), priorTable: 'prior-s3-v1', screenTable: 'screen-v4-v1' })` | the first equals `replayKeyOf(source)`; the second and third each differ from it |

## Documentation

`docs/design-detail.md` §7.7 gets one paragraph at the section's end:

- the `gen-v4` family and its seven keys (R2's text);
- `made.igPrior`;
- the per-family skip bounds;
- `sameVersions` with the table ids;
- the saved-steps key with the running tuple;
- `ALGO_ID` stays `gen-v3` until the cutover.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| locked focused gate: `-NodeArgs @('--test', 'tests/pack.test.js', 'tests/replay.test.js', 'tests/generate.test.js', 'tests/replay-model.test.js')` | §3.3 | `# fail 0`, `# cancelled 0` | 300 s |
| G-CHECK, G-PROTECTED (the replay-case blob unchanged), G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **`QUESTION:`** when:
  - a frozen `pv-*` anchor does not match the base text;
  - an existing pack, replay or replay-model test changes its result (behaviour under `gen-v3` must be identical);
  - P2-07's import line from `./gen-v4.js` is missing in `generate.js`.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-08-B01 | Old records stay valid and playable; nothing is restamped | the existing pack and replay cases unchanged; G-PROTECTED blob check | gate output |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-08-T01 | Seven keys and `igPrior` for the family, five for the others, read and copied by family | pack cases | test output |
| P2-08-T02 | Per-family skip bounds | pack case | test output |
| P2-08-T03 | Replay compares the table ids and omits a null prior | `sameVersions` case; the line after 436 | test output, diff |
| P2-08-T04 | The saved-steps key holds the running tuple (R8) | the replay-model case | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added at their places and green; the focused gate green
- [ ] `docs/design-detail.md` §7.7 updated
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the helper lines and the pass counts;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w2, 6c35edaffecc374665d48f949c3e258c0aea2800 |
| Start, end, duration | dispatched 2026-11-25 22:53 +07:00 (developer 22:53:38 to 22:59:04); accepted 23:00 |
| Waiting for rulings | none |
| Agent id, model | 2a3498ec-0d12-4cd6-a9f5-9edb1471281c, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 41; 3,795,456 / 24,776 / 3,687,555 |
| AI credits | 88.62 |
| Questions and rulings | none; eight minor deviations accepted by the orchestrator (one focused re-run after the developer's own new test had the wrong key order, code unchanged; extra refusal cases; JSDoc of replayKeyOf and replayKeyFor; isV4Versions delegates to isV4Family; provenanceVersions built with a conditional spread in the five-keys, priorTable, screenTable order; the 7.7 paragraph on one line; contracts.md not read; unfiltered gate output) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 11 files); rebased onto b9355f7 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked focused `IG P2-08 merge exit=0 seconds=25.892 quiet=45`, 167/167 pass, 0 fail/cancelled/todo; link anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | rebased a53cb60; gen-v4 a53cb60ea2d4f7427cd15bd7f0d2e63dd2a91e42 |
| Issues and named items | P2-15 switches ALGO_ID; P2-09 and P2-12d depend on this task; saved replays miss the cache once after merge (R8); no real gen-v4 run exercises the family branches before P2-15 |

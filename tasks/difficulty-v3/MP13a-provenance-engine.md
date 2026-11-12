# MP13a — Provenance in the engine and in packs

| Header | Value |
|---|---|
| ID | MP13a (first part of the report's MP13; MP13b writes the records from the apps and the CLI and records the replay fixture) |
| Depends on | MP12b (accepted and committed: the calibration lock) |
| Estimated size | Medium–Large: about 650–850 changed lines (`generate.js` about 60, `clues.js` about 30, `types.js` about 50, `pack.js` about 200, tests about 350, documents about 50); about 50–60 minutes |
| Owner role | Engine |
| Milestone | M8 — provenance and recorders |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-27 (provenance; the writer fallback of FC03), RES-28 (the skip points that `replaySkips` will use), RES-33; clarifications AUTH-P1 (a), JR-P2 (a), SA1-Q-P4 (b), SA2-Q-P10 (a) (plan author); check-list §4.2 D30 |
| Gates owned | none |
| Implementation status | Not started |

## Goal & business context

The owner wants the Generator to show how a puzzle was made ("Generation Steps", MP15a to MP16b): the piece set
being carved, the layout being re-tiled, the clue sets that were rated and repaired, and the final puzzle with its
score table. The replay re-runs the deterministic generation, so it needs a small record of where each puzzle came
from. The plan author fixed the record (AUTH-P1, JR-P2 (a), SA1-Q-P4 (b)): `generation.setOrigin` (how the piece set
was made, written once) and `generation.made` (one entry per puzzle), both inside the pack's free-form `generation`
object, which every existing version of the apps keeps.

This task builds the engine half: every puzzle candidate carries its origin record, clue selection reports the
"skip ordinals" that the replay needs, the pack reader checks the records and the pack writer can never produce an
unreadable pack because of them. Nothing visible changes and no rating, puzzle or generated pack changes: the client
and the apps start writing the records in MP13b.

## Scope

### In scope

- `core/engine/clues.js`: skip ordinals in the result of `selectClues`; the exported `SKIP_BOUNDS`.
- `core/engine/generate.js`: the `made` record on every `PuzzleCandidate` (`puzzleCandidate`,
  `completionCandidate`, the reused calibration); the exported `provenanceVersions()` and `capSkips(skips)`.
- `core/engine/pack.js`: `PROVENANCE` constants, `provenanceProblem(kind, value)` and `readProvenance(generation,
  puzzleIds)`; the reader's checks (warnings, invalid records dropped); the writer fallback in `createPack` and
  `serializePack`.
- `core/engine/types.js`: `ProvenanceVersions`, `SetOrigin`, `Skips`, `Made`; `PuzzleCandidate.made`.
- Tests: `tests/clues.test.js`, `tests/generate.test.js`, `tests/pack.test.js` (new cases; the intended contract
  changes listed below).
- Documents: `docs/design-detail.md` §5.2, §5.5 and §6.10.

### Out of scope

- Writing the records into packs from the client, the Generator or the CLI; the saved Generator sets; the replay
  fixture and gate GF-P4 (MP13b).
- `ctx.replaySkips` (the replay side of the skip ordinals) and the recorders (MP14a, MP14b); the replay engine
  (MP15a).
- Any change of a rating, a generated puzzle, a candidate's other fields, an RNG draw or a fixture: after the lock
  (end of MP12b) MP13a to MP17 must not change any rating or generated puzzle (report §5.2, check-list §6).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity: no DOM, storage, clock or randomness; `core/engine/*.js` keep `// @ts-check` and JSDoc types. No new
  engine file in this task.
- Run only the commands of the test plan; no gate, no `npm test`, no `tools/record-fixtures.mjs`. Never stage, commit,
  stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace.

## Inputs & context

Anchors are at HEAD `60575a4`. MP07 and MP09c rewrite parts of `selectClues`, MP09a1 and MP09b edit `pack.js`, MP08
and MP09a1 edit `types.js`: find a moved line by the quoted text.

### The record (RES-27; decided by the plan author)

```text
generation.setOrigin = { schema: 1, seed, level, attempt, uniqueness,
                         versions: { algo, policy, rng, seedScheme, ratingModel } }
generation.made      = { [puzzleId]: Made }
Made = { schema: 1, kind: 'calibration' }
     | { schema: 1, kind: 'candidate', batchSeed, targetLevel, uniqueness, slot, attempt,
         start: 'witness' | 'restart', skips: Skips,
         versions: { algo, policy, rng, seedScheme, ratingModel } }
     | { schema: 1, kind: 'completion' }
Skips = { subsets: number[], repairs: number[] } | 'overflow'    // at most 64 subset and 16 repair ordinals
```

- Both keys live in the free-form `generation` object (`core/engine/pack.js:978-979`); a per-puzzle field would fail
  `PUZZLE_FIELDS` (line 55) in every current reader. Puzzle codes carry no provenance.
- Field order when written is the order above (`schema` first). `versions` holds the running code's ids:
  `algo` = `ALGO_ID` (`core/engine/version.js:4`), `policy` = `POLICY_ID` (`core/engine/policy.js:17`), `rng` =
  `RNG_ID` and `seedScheme` = `SEED_SCHEME` (`core/engine/rng.js:6-7`), `ratingModel` = `MODEL`
  (`core/engine/difficulty.js:18`; `'difficulty-v3'` since MP09d2).
- `start` is the observed outcome: a restart can fall back to the witness (below).
- A `calibration` record marks the set calibration's puzzle reused as puzzle #1; a `completion` record marks a puzzle
  of the completion pass (its clue stages are not replayed, RES-33).

### Skip ordinals (RES-27 "Skips, defined by execution")

A batch candidate's clue selection excludes the clue keys already used (`excludeClueKeys`, the request-start
history). The replay does not have that history, so the record names the points where the exclusion acted:

- **Subset ordinal**: the 0-based index, within one `selectClues` call, of a `rateSubset` call that passed the budget
  and repeat checks and executed `tried.add(id)`. At HEAD (`core/engine/clues.js:205-215`):

  ```js
  const rateSubset = (idx) => {
    const id = idx.join(',');
    if (profiles >= limit || tried.has(id)) {
      return null;
    }
    tried.add(id);
    const clues = idx.map((i) => layout[i]);
    const key = clueKey(board, pieces, clues);
    if (excludeClueKeys.has(key)) {
      return null;
    }
  ```

  Every execution of `tried.add(id)` takes the next subset ordinal. A **subset skip** is such a call whose `key` is in
  `excludeClueKeys`: its ordinal is appended to `subsets` right there, before any rating.
- **Repair ordinal**: the 0-based index of an executed `finish(c)` in `require` mode. Since MP07 every `finish` runs
  through the memoising `finishOnce`, so a memoised result gets no ordinal; `any` mode has no repairs. The ordinal is
  taken when `finish` starts, before `makeUnique`. A **repair skip** is an executed finish whose changed repaired clue
  set has its clue key in `excludeClueKeys`: MP07 added that check after the repair rating (MP09c added the refusal
  of an unrateable or unproved repair before the band check), in the order

  ```text
  finish(c), require mode:  ordinal = repairOrdinal; repairOrdinal += 1
                            repaired = makeUnique(...)               // null: unproved = true, return null
                            rating   = changed ? rateFn(...) : c.rating   // MP09c: unrateable or refused -> null
                            if not inBand(rating, target): return null
                            if changed and excludeClueKeys.has(clueKey(board, pieces, clues)):
                                repairs.push(ordinal); return null           // the repair skip
                            return the result
  ```

  The skip is decided after `makeUnique`, its RNG draws and the repair rating, so a replay executes the same repair,
  rating and draws before it rejects at the recorded ordinal (MP14a).
- **Bounds** come from the loop limits, not from the number of excluded keys: at most `COUNT_CHANGES ×
  SAMPLES_PER_COUNT` = 32 subset calls in phase 1, `4 × SAMPLES_PER_COUNT` = 16 in phase 2, and at most
  `BUDGETS.clueSubsets + 1` = 65 beam rounds of at most `BEAM_WIDTH × MOVES_PER_MEMBER` = 32 calls each (every round
  that does not end the beam rates at least one new subset, so the 64-profile budget ends it), so fewer than
  32 + 16 + 65 × 32 = **2,128** subset ordinals; every finish belongs to a distinct rated in-band candidate, so fewer
  than `BUDGETS.clueSubsets` = **64** repair ordinals. Export them as

  ```js
  /** Exclusive upper bounds of the skip ordinals of one call (RES-27), from the loop limits of `selectClues`. */
  export const SKIP_BOUNDS = Object.freeze({
    subsets: COUNT_CHANGES * SAMPLES_PER_COUNT + 4 * SAMPLES_PER_COUNT
      + (BUDGETS.clueSubsets + 1) * BEAM_WIDTH * MOVES_PER_MEMBER,
    repairs: BUDGETS.clueSubsets,
  });
  ```

  If the loops at MP12b differ from this description (constants, the phase-2 bound or the beam's stop rule), stop and
  report it: the bounds 2,128 and 64 are part of the accepted record format.
- **Encoding** (AUTH-P1 (a)): a record keeps at most 64 subset and 16 repair ordinals; above either, the record
  stores `skips: 'overflow'` and the replay reports the clue stages of that puzzle as unavailable.
- Two subsets can share a clue key on a set with two pieces of the same shape (only a direct engine input since
  RES-34), and two repairs can reach the same excluded key: each executed call is recorded on its own.

### `selectClues` result (the only signature change in `clues.js`)

```js
/**
 * @typedef {{ ok: true, clues: Pose[], rating: Rating, certificate: Certificate | null,
 *     skips: { subsets: number[], repairs: number[] } }
 *   | { ok: false, reason: 'not-in-band' | 'uniqueness-not-proved' }} SelectResult
 */
```

`skips` lists every skip of the whole call up to the return, in increasing order, uncapped (the bounds above cap it).
Build it in the function's local state (`let subsetOrdinal = 0`, `let repairOrdinal = 0`, two arrays) and attach a
fresh copy to every `ok: true` result: the `any`-mode result built in `finish`, the `require`-mode result, and a result
returned through `finishOnce` or `chooseBest`. A memoised result object is created once by `finish`; attach `skips`
when the result is **returned** (for example `return withSkips(r)` at every `return` of an `ok: true` value), so the
lists include the skips that happened after that candidate was finished. Failure results stay
`{ ok: false, reason }`. Nothing else changes: no RNG draw, no rating, no order.

### The candidate's origin (`core/engine/generate.js`)

- `puzzleCandidate` (line 172). Today:

  ```js
  let start = set.witness;
  if (small && (attempt % 3 === 2 || start === null)) {
    start = randomTiling(board, pieces, rng.derive('restart'), scratch, {
      totalRowTrials: BUDGETS.tilingTotal,
      restartBase: BUDGETS.restartBase,
    }) ?? start;
  }
  ```

  Keep the call and its arguments exactly; record `startKind = 'restart'` when `randomTiling` returned a layout and
  it became the start, else `'witness'`. On success return the existing fields plus

  ```js
  made: {
    schema: 1, kind: 'candidate', batchSeed: ctx.batchSeed, targetLevel: ctx.targetLevelId,
    uniqueness: ctx.uniqueness, slot, attempt, start: startKind, skips: capSkips(sel.skips),
    versions: provenanceVersions(),
  },
  ```

- `completionCandidate` (line 222): `made: { schema: 1, kind: 'completion' }`.
- `calibrationCandidate` (line 345, used by `foldStart` for slot 1): `made: { schema: 1, kind: 'calibration' }`.
- `setAttempt` is unchanged: the calibration's `selectClues` call excludes nothing, and the set origin is written by
  the client (MP13b).
- The fold carries the candidate object unchanged: `foldAccept` (line 486) may accept the slot's earlier `best`
  (lines 531-532: `if (best !== null) { return withAccepted(s, best); }`), whose `made` names its own attempt, not the
  attempt at which it was accepted. No fold code changes.
- New exports:

  ```js
  /** @returns {import('./types.js').ProvenanceVersions} The running code's version ids (RES-27). */
  export function provenanceVersions() {
    return { algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, seedScheme: SEED_SCHEME, ratingModel: MODEL };
  }

  /**
   * The stored form of a call's skips: copies, or 'overflow' above 64 subset or 16 repair ordinals (AUTH-P1 (a)).
   * @param {{ subsets: number[], repairs: number[] }} skips
   * @returns {import('./types.js').Skips}
   */
  export function capSkips(skips) {
    return skips.subsets.length > PROVENANCE.subsetSkips || skips.repairs.length > PROVENANCE.repairSkips
      ? 'overflow'
      : { subsets: skips.subsets.slice(), repairs: skips.repairs.slice() };
  }
  ```

  New imports of `generate.js`: `MODEL` from `./difficulty.js`, `PROVENANCE` from `./pack.js`, `POLICY_ID` from
  `./policy.js`, `RNG_ID` and `SEED_SCHEME` from `./rng.js`, `ALGO_ID` from `./version.js` (no import cycle:
  `pack.js` imports neither `generate.js` nor `clues.js`).

### Types (`core/engine/types.js`)

```js
/**
 * Version ids of the code that made a set or a puzzle (RES-27).
 * @typedef {object} ProvenanceVersions
 * @property {string} algo
 * @property {string} policy
 * @property {string} rng
 * @property {string} seedScheme
 * @property {string} ratingModel
 */

/**
 * `generation.setOrigin` (RES-27): how the piece set was made. Written once, when the set is made; never re-stamped.
 * @typedef {object} SetOrigin
 * @property {1} schema
 * @property {string} seed Normalized set seed.
 * @property {string} level Level id the set was made for.
 * @property {number} attempt Winning set attempt.
 * @property {'any' | 'require'} uniqueness
 * @property {ProvenanceVersions} versions
 */

/** @typedef {{ subsets: number[], repairs: number[] } | 'overflow'} Skips */

/**
 * One entry of `generation.made`, by puzzle id (RES-27).
 * @typedef {{ schema: 1, kind: 'calibration' }
 *   | { schema: 1, kind: 'candidate', batchSeed: string, targetLevel: string, uniqueness: 'any' | 'require',
 *       slot: number, attempt: number, start: 'witness' | 'restart', skips: Skips, versions: ProvenanceVersions }
 *   | { schema: 1, kind: 'completion' }} Made
 */
```

`PuzzleCandidate` (lines 181-189) gains `@property {Made} made Origin of the candidate (RES-27); set by every engine
candidate function and carried unchanged by the fold.`

### Pack reader and writer (`core/engine/pack.js`)

Limits that every current reader applies to `generation` (RES-27 "Pack limits"): at most 100,000 JSON values
(`MAX_JSON_NODES`, line 39), depth 32 (`MAX_JSON_DEPTH`, line 38) and 512 KiB (`MAX_FILE_BYTES`, line 30), checked by
`readJsonObject` (lines 323-337, called at 978-979 with `generation-too-large`); above any of them **the whole pack
fails** in every current version. The writer checks only the bytes today (`serializePack`, 1292-1306,
`pack-too-large`), and `createPack` copies `generation` with `copyClaimJson` (1352-1354), which throws
`PackError('invalid-json')` above the node or depth limit.

Constants and helpers (exported):

```js
/** Record format of `generation.setOrigin` and `generation.made` (RES-27, AUTH-P1 (a)). */
export const PROVENANCE = Object.freeze({ schema: 1, subsetSkips: 64, repairSkips: 16, subsetOrdinals: 2128, repairOrdinals: 64 });

/**
 * Why a provenance record is not valid, or null when it is.
 * @param {'setOrigin' | 'made'} kind
 * @param {unknown} value
 * @returns {string | null}
 */
export function provenanceProblem(kind, value)

/**
 * The valid provenance records of a generation object, as fresh copies in the field order of RES-27; invalid ones
 * are left out and described in `problems` (path relative to the pack root, for example `generation.made.X`).
 * Never throws.
 * @param {unknown} generation
 * @param {ReadonlySet<string>} puzzleIds
 * @returns {{ setOrigin: SetOrigin | null, made: Record<string, Made>, problems: { path: string, message: string }[] }}
 */
export function readProvenance(generation, puzzleIds)
```

Validity (every rule is tested):

| Field | Rule |
|---|---|
| any record | a plain object with exactly the listed own keys (an unknown or missing key is a problem); `schema` is exactly `1` |
| `seed` (setOrigin) | a string `s` with `normalizeSeedText(s) === s` (1–64 code points, trimmed, NFC; `core/engine/rng.js:31`; a throw is a problem) |
| `level`, `targetLevel` | an id that `level(id)` of `core/engine/levels.js` accepts (a throw is a problem) |
| `attempt` (setOrigin) | a safe integer >= 0 |
| `uniqueness` | `'any'` or `'require'` |
| `kind` (made) | `'calibration'`, `'candidate'` or `'completion'`; the first and last have only `schema` and `kind` |
| `batchSeed` | a string of 1–256 UTF-16 units with `s.trim().normalize('NFC') === s` (the client's batch-seed rule, `core/browser/generation-client.js` `checkBatch`) |
| `slot` | an integer from 1 to 10 (a batch has at most 10 puzzles, `foldStart`) |
| `attempt` (candidate) | an integer from 0 to `BUDGETS.slotAttempts - 1` (11) |
| `start` | `'witness'` or `'restart'` |
| `skips` | `'overflow'`, or a plain object with exactly `subsets` and `repairs`: arrays of integers, strictly increasing; `subsets` has at most 64 entries in [0, 2128), `repairs` at most 16 entries in [0, 64) |
| `versions` | a plain object with exactly `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, each a string of 1–64 UTF-16 units |
| `made` | a plain object with at most as many own keys as `puzzleIds` has entries (else the whole map is a problem); each key is in `puzzleIds` (else that entry is a problem) |

The reader, in `readPackSteps`, right before `if (generation !== null) { pack.generation = generation; }` (line 1045;
`generation` is the reader's own deep copy, so it may be edited): when it has an own `setOrigin` or `made`, call
`readProvenance(generation, new Set(puzzles.map((p) => p.id)))`, replace `setOrigin` by the valid copy or delete it,
replace `made` by the valid entries or delete it when none is left, and add one warning per problem with
`warn(ctx, 'provenance-ignored', path, message)`. A generation object without these keys is untouched. The apps do
not show pack warnings, so the code needs no locale text. A pack is never refused because of a provenance record.

Writer fallback (RES-27; FC03 of SA2-5): a pack that this writer produces must stay readable in every current
version, and provenance must never cost a puzzle or other data.

```text
writableGeneration(g):                        // replaces copyClaimJson(a.generation) in createPack and is used in toWire
  copy = copyJson(g, MAX_JSON_DEPTH, MAX_JSON_NODES)
  if copy.ok: return copy.value
  if g is a plain object with an own 'made':
    again = copyJson(g without 'made', MAX_JSON_DEPTH, MAX_JSON_NODES)
    if again.ok: return again.value           // made left out; setOrigin and the base keys kept
  throw new PackError('invalid-json', copy.message)   // the existing failure

serializePack(p, o):
  text = the canonical text as today (toWire with writableGeneration)
  if text exceeds MAX_FILE_BYTES and p.generation has an own 'made':
    text = the canonical text of { ...p, generation: p.generation without 'made' }
  if text exceeds MAX_FILE_BYTES: throw new PackError('pack-too-large', ...)          // the existing failure
  return text
```

A pack without `generation.made` makes the replay report the clue stages as unavailable (RES-27); nothing else is
lost. `packFits` of the Generator (`generator/state.js`) calls `serializePack`, so a puzzle is never dropped for its
record.

## Files to create/modify

| File | Change |
|---|---|
| `core/engine/clues.js` | the skip ordinals, `skips` on `ok: true` results, `SKIP_BOUNDS`, the `SelectResult` typedef |
| `core/engine/generate.js` | `made` on candidates; `provenanceVersions`, `capSkips`; imports |
| `core/engine/types.js` | `ProvenanceVersions`, `SetOrigin`, `Skips`, `Made`; `PuzzleCandidate.made` |
| `core/engine/pack.js` | `PROVENANCE`, `provenanceProblem`, `readProvenance`, the reader step, `writableGeneration`, the `serializePack` fallback; imports `normalizeSeedText` (`./rng.js`), `level` (`./levels.js`), `BUDGETS` (`./policy.js`); the `PackError` comment is unchanged |
| `tests/clues.test.js` | new cases 1–5; intended contract change C1 |
| `tests/generate.test.js` | new cases 6–11 |
| `tests/pack.test.js` | new cases 12–20 |
| `docs/design-detail.md` | §5.2, §5.5 and §6.10 (below) |

Exclusive ownership while this task runs: the files above. Do not edit `core/browser/`, `generator/`, `player/`,
`tools/`, the fixtures or `docs/design-brief.md`.

### Documentation slot

- §5.5 "Generation metadata" (line 787): add the two keys to the example (a short `setOrigin` and one `made` entry),
  then a bullet each: what they record, who writes them (the client, the Generator and the CLI from MP13b), the field
  table in short, the skip encoding and `'overflow'`, the reader's checks (invalid records are ignored with a
  `provenance-ignored` warning; the puzzle stays usable), the writer fallback (bytes and JSON values) and the
  documented limitation "a Generator older than this change drops `generation.made` and `generation.setOrigin` when it
  re-exports a pack".
- §6.10 "Clue selection" (line 1345): one paragraph on the subset and repair ordinals and the bounds 2,128 and 64.
- §5.2 "Pack document", the `generation` row of the field table (line 669: "Provenance and generation policy (§5.5);
  type-checked only"): add that its `setOrigin` and `made` records are checked and ignored with a warning when
  invalid (§5.5).

## Implementation steps

1. `types.js`: the typedefs and `PuzzleCandidate.made`.
2. `clues.js`: counters, the two recording points, `withSkips` on every `ok: true` return, `SKIP_BOUNDS`, the typedef.
3. `pack.js`: `PROVENANCE`, `provenanceProblem`, `readProvenance`, the reader step, `writableGeneration` in
   `createPack` and `toWire`, the `serializePack` fallback.
4. `generate.js`: imports, `provenanceVersions`, `capSkips`, `made` in the three candidate functions, `startKind`.
5. Tests, then the documents; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP13a-B01 | Every puzzle the engine can accept carries a record of how it was made (candidate, calibration or completion), with the code versions that made it, so a later replay can tell whether it can reproduce it | cases 6–9 |
| MP13a-B02 | A pack with a damaged or foreign provenance record still opens; the record is ignored with a warning and the puzzle stays playable | cases 15–17 |
| MP13a-B03 | Provenance can never make a pack unreadable or cost a puzzle: near the size limits the writer leaves the per-puzzle records out and keeps the set origin and every other key | cases 18–20 |
| MP13a-B04 | Nothing visible and no generated puzzle or rating changes | case 11; the unchanged fixtures and quick set |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP13a-T01 | Subset ordinals count every executed `tried.add`; a subset skip is recorded before rating; repair ordinals count executed finishes in `require` mode only (memoised ones get none); a repair skip is recorded after the repair rating, at the excluded-key check | cases 1–4 |
| MP13a-T02 | `skips` is on every `ok: true` result, in increasing order, and covers the whole call; failure results are unchanged | cases 1–3, C1 |
| MP13a-T03 | `SKIP_BOUNDS` equals `{ subsets: 2128, repairs: 64 }` and matches `PROVENANCE` | case 5 |
| MP13a-T04 | `made` has exactly the fields and order of RES-27; `start` is the observed outcome; `capSkips` gives `'overflow'` above 64 or 16 | cases 6, 7, 10 |
| MP13a-T05 | The fold keeps each candidate's own record, also when it accepts an earlier best; calibration reuse and completion candidates carry their kinds | cases 8, 9 |
| MP13a-T06 | `readProvenance` and the reader enforce every rule of the validity table; valid records round-trip unchanged | cases 12–17 |
| MP13a-T07 | Writer fallback for bytes and for JSON values; a base that is too large on its own keeps the existing failure | cases 18–20 |
| MP13a-T08 | Determinism and no output change: two runs give deep-equal candidates and records; the other candidate fields and the fixtures are unchanged | case 11; `tests/generate.test.js` fixture tests unchanged |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests/clues.test.js tests/generate.test.js tests/pack.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

### Intended contract change

C1. A test that compares a whole `ok: true` `SelectResult` with a literal (for example `assert.deepEqual(result, { ok:
true, clues, rating, certificate: null }, …)` near `tests/clues.test.js:303` at HEAD) adds the `skips` field with the
values the run gives, after checking them against the oracle of case 1 where the call has `any` mode. List every such
test in the reply. No other existing assertion changes.

### Required test cases

`tests/clues.test.js`:

1. Oracle for subset ordinals (`any` mode): pass as `excludeClueKeys` a wrapper object around a real `Set` whose
   `has(key)` records `[key, answer]` in a list `calls` and returns the answer (check once that `selectClues` calls
   nothing but `has` on it). In `any` mode each executed `tried.add` is followed by exactly one `has` call, so the
   expected `skips.subsets` is the list of the indexes in `calls` whose answer was `true`. Take a recipe and target of
   the existing `tests/clues.test.js` cases whose run without exclusions rates at least two subsets (collect the rated
   clue keys with `onRate`); run again with the key of the second rated subset as the only excluded key: the result is
   `ok`, `skips.subsets` equals the oracle's list and contains 1, `skips.repairs` is `[]`.
2. Two subsets with one clue key (direct twin input, RES-27): the board `['######', '######']` (6 x 2) with four
   pieces A, B, C, D of the same shape `[[0, 0], [1, 0], [2, 0]]` and the layout A at (0, 0), C at (3, 0), D at (0, 1),
   B at (3, 1), all `turn: 0`, `mirrored: false`. With the board's symmetries and equal shape ranks, the pairs {A, C}
   and {B, D} (the two rows) have one clue key: compute it with `clueKey` and assert it once. Use the `rate` seam of
   MP07 (`SelectContext.rate`) with a scripted rating chosen by the sorted clue ids (like MP07's scripted seam
   ratings, without `metrics.Gproved`, so the RES-35 refusal never applies): score 0 for one clue, score 20 for the
   pairs {A, B} and {C, D}, score 0 for the pairs {A, D} and {B, C}; target `{ min: 17, max: 25, share: 0.5 }` (the
   search starts with pairs), `any` mode, `excludeClueKeys` = the oracle wrapper of case 1 around a set holding the
   rows key. Choose the first seed `twin-<n>` (n = 0, 1, …, 99) whose result is `ok` with at least two subset skips,
   pin it, and assert `skips.subsets` equals the oracle's list (two or more ordinals: two distinct subsets with one
   excluded key, each recorded).
3. Repair skip: extend MP07's case "require, excluded repaired key" (seed `req-3`, `excludeClueKeys` = the clue key
   of `req-3`'s result, the `UFX` repair rejected), with the oracle wrapper of case 1: the result is unchanged (score
   21, ids `PFZ`), `skips.repairs` has exactly one entry r with 0 <= r < 64, and `skips.subsets.length +
   skips.repairs.length` equals the number of `true` answers of the oracle (in `require` mode every `true` answer is
   exactly one recorded skip, at a subset or at a repair). The exact repair ordinal is checked by replay in MP14a.
4. Two repairs that reach one excluded key: in MP07's case "require, off-centre repairs, lazy best-first, each repair
   once" (seed `req-3`) the repaired set `WZX` is rated twice (calls 1 and 9 of its list). With `excludeClueKeys` =
   the oracle wrapper around a set holding the clue key of `WZX`: `skips.repairs` is strictly increasing with entries
   below 64, `skips.subsets.length + skips.repairs.length` equals the number of `true` answers of the oracle, and a
   second run gives a deep-equal result. Report the observed `skips` in the reply.
5. `SKIP_BOUNDS` deep-equals `{ subsets: 2128, repairs: 64 }` and equals
   `{ subsets: PROVENANCE.subsetOrdinals, repairs: PROVENANCE.repairOrdinals }`.

`tests/generate.test.js` (the recipe set of `tests/fixtures/generation-case.json`, as the existing tests use it):

6. `puzzleCandidate(ctx, 1, 0)` on the recipe context: `made` deep-equals `{ schema: 1, kind: 'candidate',
   batchSeed: ctx.batchSeed, targetLevel: 'hard', uniqueness: 'any', slot: 1, attempt: 0, start: 'witness', skips: {
   subsets: [], repairs: [] }, versions: provenanceVersions() }` (the recipe context excludes nothing) and its keys
   are in this order.
7. `start`: on the 10 x 6 board (60 cells <= `BUDGETS.restartMaxArea` 150) attempts 0 and 1 give `'witness'`,
   attempts 2 and 5 give `'restart'` exactly when a direct call `randomTiling(board, pieces, createRng(ctx.batchSeed,
   `slot/1/${a}`).derive('restart'), scratch, { totalRowTrials: BUDGETS.tilingTotal, restartBase:
   BUDGETS.restartBase })` with a fresh scratch workspace returns a layout (else `'witness'`), and a copy of the set
   with `witness: null` gives `'restart'` on attempt 0 when that call succeeds.
8. A fold that accepts an earlier best keeps that candidate's record: `foldStart` with quantity 2, accept slot 1, then
   set the state's `distance` to 1000 so no slot-2 candidate is accepted outright; feed the 12 attempts of slot 2
   (`puzzleCandidate(frozen, 2, a)`); the accepted second puzzle is the best, and its `made.attempt` is the attempt
   that produced it (not 11) and `made.slot` is 2; the object is the same one the candidate function returned.
9. Calibration reuse: `runFold` with a context whose `calibration` matches the target level gives
   `accepted[0].made` deep-equal to `{ schema: 1, kind: 'calibration' }`; `completionCandidate` gives `{ schema: 1,
   kind: 'completion' }`.
10. `capSkips`: 64 subset ordinals and 16 repair ordinals give copies (not the same arrays); 65 subset or 17 repair
    ordinals give `'overflow'`.
11. Determinism and no output change: two calls of `puzzleCandidate` with the same arguments give deep-equal results;
    `runFold` on the recipe still reproduces `RECIPE.expected` (the existing test) and every accepted candidate has a
    valid record (`provenanceProblem('made', c.made) === null`).

`tests/pack.test.js` (use `createPack`, `serializePack`, `parsePack`, `validatePack`):

12. Round trip: a pack whose `generation` has a valid `setOrigin` and a `made` with one record of each kind (keys =
    the pack's puzzle ids) serializes and reads back with both keys deep-equal and no warning.
13. `provenanceProblem` returns null for the valid records of case 12 and a message for each rule of the validity
    table (one assertion per row: an unknown key, a missing key, `schema: 2`, a seed with a leading space, an
    unknown level, `attempt: -1`, `uniqueness: 'maybe'`, `kind: 'other'`, a calibration record with an extra key, a
    257-unit batch seed, `slot: 0` and `slot: 11`, candidate `attempt: 12`, `start: 'other'`, unsorted subsets,
    a duplicate repair, a subset ordinal 2128, a repair ordinal 64, 65 subsets, 17 repairs, a missing version key,
    an empty version string).
14. `readProvenance` returns copies (mutating the result does not change the input) in the RES-27 field order.
15. A pack whose `setOrigin` is malformed reads `ok`, without `generation.setOrigin`, with one warning
    `provenance-ignored` at `generation.setOrigin`; the other `generation` keys are unchanged.
16. A `made` entry for an id that no puzzle has, and a malformed entry, are each dropped with one warning at
    `generation.made.<id>`; the valid entries stay; when no entry is valid, `made` is absent.
17. A `made` with more own keys than the pack has puzzles is dropped whole with one warning; a `made` that is not an
    object is dropped with one warning; the pack reads `ok` in every case.
18. Writer, bytes: a pack whose `generation` has a valid `setOrigin`, a `made` record per puzzle and a base key padded
    (for example `note: 'x'.repeat(n)`) so that the canonical text is just above 512 KiB with `made` and below
    without: `serializePack` returns text without `made`, with `setOrigin` and `note`, and `parsePack` of it is `ok`.
19. Writer, JSON values: a pack below 512 KiB whose `generation` holds a base array of numbers whose length is chosen
    so that the generation object has at most 100,000 JSON values without `made` and more with it (count as
    `copyJson` does: every object, array and primitive value is one): `createPack` leaves `made` out and keeps
    `setOrigin` and the array; `serializePack` and `parsePack` of the result are `ok`.
20. A base that is too large on its own: padding above 512 KiB without `made` makes `serializePack` throw `PackError`
    `pack-too-large`; a base array above 100,000 values makes `createPack` throw `PackError` `invalid-json`, as
    before this task.

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the new exports, the intended contract changes C1 and the test
  counts.
- Handoff to MP13b: `candidate.made` (every engine candidate), `provenanceVersions()`, `capSkips()`, `PROVENANCE`,
  `provenanceProblem(kind, value)`, `readProvenance(generation, puzzleIds)`; the reader drops invalid records with a
  `provenance-ignored` warning; `createPack` and `serializePack` leave `made` out near the limits. To MP14a: the two
  recording points in `selectClues` are where `ctx.replaySkips` will act; `SKIP_BOUNDS`.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |

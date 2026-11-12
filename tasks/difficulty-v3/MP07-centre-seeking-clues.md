# MP07 — Centre-seeking clue selection, the `SelectContext.rate` seam, `gen-v3`

| Header | Value |
|---|---|
| ID | MP07 |
| Depends on | MP06c (accepted and committed; the chain is sequential, and MP06b's v2 baseline GV2 must be recorded before clue selection changes) |
| Estimated size | Medium–Large: about 450–650 changed lines (clues.js about 120, tests about 250–350, documents about 80; the two re-recorded fixtures are generated and not counted); about 45–60 minutes plus the gate run (about 2–4 minutes) |
| Owner role | Engine |
| Milestone | M4 — centre-seeking generation |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-15 (centre-seeking acceptance), RES-16 (uniform sampling), RES-17 (versions, tests, gate, docs), RES-35 (the test seam); clarifications SA2-Q-P04, SA2-Q-P05 / SA1-Q-P5, C2 (a); cross-review FP08; check-list §4.2 D9, D20, D21 (traceability only) |
| Gates owned | GF-P1, GA-P1 (check-list §7) |
| Implementation status | Not started |

## Goal & business context

Today a new puzzle is accepted as soon as its score is anywhere inside the requested level's band, so many "Hard"
puzzles sit just above the Normal border. The owner wants Hard to be really hard: generation should aim at the
**middle** of the band. This task changes the clue selection so that it stops early only when a final puzzle (after
any uniqueness repair) lies in the central half of the band; otherwise it returns the in-band result nearest to the
centre once 48 of the 64 rated subsets are spent, or at the end of the search. The rating model itself (v2) does not
change here; MP09d2 later switches the ratings to v3 and the same acceptance then works on v3 scores.

Because the generated puzzles change, the generation algorithm id becomes `gen-v3` (seeds reproduce only within one
algorithm id) and the generation fixtures are re-recorded under the pre-approved gates GF-P1 and GA-P1. The task
also adds an optional `rate` seam to the selection context, used only by tests and diagnostics, so that the
acceptance rules can be tested with scripted ratings.

## Scope

### In scope

- `core/engine/clues.js`: the centre-seeking acceptance of RES-15 in `selectClues`, the memoised repair, the
  rejection of a repaired clue key that is in `excludeClueKeys`, the `SelectContext.rate` seam, the constant
  `CENTRE_RESERVE`.
- `core/engine/version.js`: `ALGO_ID = 'gen-v3'`.
- Gates GF-P1 and GA-P1: re-record `tests/fixtures/generation-case.json` and
  `tests/fixtures/generated-sample-pack.json`; run `npm test`.
- Tests: new cases in `tests/clues.test.js`; four listed intended contract changes in `tests/clues.test.js`,
  `tests/cli.test.js`, `tests/player-load.test.js` and `tests/fixtures/ui-flow-recipes.json`.
- Documents: `docs/design-detail.md`, `docs/design-brief.md`, `USERGUIDE.md`, `USERGUIDE.vn.md` (one sentence each in
  the guides).

### Out of scope

- The v3 rating (MP09d1, MP09d2); `IncompleteRatingError` and the RES-35 refusal of unproved candidates (MP09c, which
  uses the seam added here).
- Any change of sampling (RES-16: `sample(count)` stays the uniform shuffle), of the count steering, of the beam
  moves, of `BUDGETS.clueSubsets` (64), of `makeUnique`, of `generate.js` or of the recorders (MP14a).
- `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json`: they stay byte-for-byte as they are
  (check-list D20; see "The Player sample and the code goldens").

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- `clues.js` stays pure (no DOM, clock or randomness other than the injected `rng`); none of the words `LIMITS`,
  `QUALIFICATION`, `enabledMaxActive`, `deriveLimits` in it, not even in a comment.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace. The fixtures written by `record-fixtures.mjs` are
  already CRLF (`toFileText`); check them with the one-liner of check-list §3.
- This task owns gates GF-P1 and GA-P1: run `tools/record-fixtures.mjs` and `npm test` only as written in the test
  plan, once the implementation and the quick set pass. **Announce to the orchestrator before starting** (the Sudoku
  repository runs in parallel on the same machine; never two heavy runs at once): give the gate commands and the
  expected wall time in your plan, and start the gate only when the orchestrator's dispatch says the machine is free.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports,
  `player/samples/sample-pack.json` or `tests/fixtures/puzzlecode-v1.json`.

## Inputs & context

### Current code (anchors at HEAD `7004175`; find moved lines by the quoted text)

- `core/engine/clues.js`:
  - `SelectContext` typedef, lines 23-35 (`* @property {(clues: Pose[], rating: Rating) => void} [onRate]`).
  - Constants, lines 50-54: `BEAM_WIDTH = 4`, `SAMPLES_PER_COUNT = 4`, `COUNT_CHANGES = 8`, `MOVES_PER_MEMBER = 8`,
    `SMALL_AREA = 200`.
  - `bandDistance(target, r)`, line 158; `ranked(target, list)`, lines 170-175: sorts by band distance, then
    `|score - (min + max) / 2|`, then `key` ascending.
  - `selectClues(ctx)`, lines 183-368: `rateSubset(idx)` (line 205; returns `null` for a repeated, excluded or
    over-budget subset, otherwise rates it, `profiles += 1`, calls `onRate`, pushes the candidate);
    `finish(c)` (line 229); `sample(count)` (line 252); `accept(c)` (line 258:
    `const accept = (c) => (c !== null && inBand(c.rating, target) ? finish(c) : null);`); phase 1 (lines 260-291);
    phase 2 (lines 293-299: `// Phase 2: when every phase-1 sample was skipped, seed the beam afresh.`); the beam
    (lines 346-366); the failure return (line 367:
    `return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band' };`).
- `core/engine/difficulty.js`: `inBand(r, target)` is `r.score >= target.min && r.score < target.max`; `rate(board,
  pieces, clues, ws)` returns a `Rating`.
- `core/engine/version.js:4`: `export const ALGO_ID = 'gen-v2';`.
- Callers of `selectClues` (unchanged): `core/engine/generate.js` (set calibration about line 114, `puzzleCandidate`
  about 193, `completionCandidate` about 231; they pass `ctx.seenClues` as `excludeClueKeys`) and
  `tools/record-fixtures.mjs` `buildSample` (about line 139).
- Level bands (v2, `core/engine/levels.js`): very-easy [0, 8), easy [8, 12), normal [12, 17), hard [17, 25),
  expert [25, 37), master [37, 53), nightmare [53, 77), hell-1 [77, 112), hell-2 [112, 162); `bandEdge` overflows to
  `Infinity` for very deep Hell levels.

### The acceptance (RES-15, confirmed in C2 (a))

Decided by the plan author: "the centre is the real number `(min + max) / 2`; stop early when a final result (after
any uniqueness repair) lies in the central half of the band; otherwise return the best final result seen once 48
profiles are spent; an unbounded band has no centre and keeps 'first in band'". The reserve of 16 is only the stop
point at profile 48; repair ratings are not search profiles; each in-band candidate is repaired at most once; the
64-profile budget is unchanged.

```text
module constant:  CENTRE_RESERVE = 16        // stop point: profiles >= BUDGETS.clueSubsets - CENTRE_RESERVE (48 of 64)

in selectClues, after the existing setup:
  rateFn     = ctx.rate ?? rate              // used for EVERY rating of the call: subsets and repaired sets
  finite     = Number.isFinite(target.max)
  centre     = (target.min + target.max) / 2 // only when finite
  window     = (target.max - target.min) / 4 // only when finite: the central half of the band
  central(r) = !finite || |r.score - centre| <= window
  inBandList = []                            // rated in-band candidates, in rating order
  finals     = Map: raw subset id (idx.join(',')) -> SelectResult with ok: true, or null (the finish failed)

finishOnce(c):
  if finals has no entry for c: finals.set(id(c), finish(c))
  return finals.get(id(c))

afterProfile(c):                             // replaces accept(); called once per rated candidate c
  if inBand(c.rating, target):
    inBandList.push(c)
    if central(c.rating):
      r = finishOnce(c)
      if r !== null and central(r.rating): return r          // a central final result stops the search
  if finite and profiles >= limit - CENTRE_RESERVE and inBandList is not empty:
    return chooseBest()                                      // may be null: the search then continues
  return null

chooseBest():                                // lazy best-first over final results
  loop:
    open = the candidates of inBandList whose finals entry is not null (unfinished or finished successfully)
    if open is empty: return null
    if not finite: c = open[0]                               // rating order
    else: c = the candidate of open with the smallest d(c), where d(c) = |final.rating.score - centre| for a
              finished candidate and |c.rating.score - centre| for an unfinished one; ties: a finished candidate
              before an unfinished one, then the order of ranked(target, open)
    if c is finished: return its final result
    finishOnce(c)                                            // records the result or the failure; loop again

end of the search (after phase 1, phase 2 and the beam):
  best = chooseBest(); if best !== null: return best
  return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band' }   // unchanged
```

`finish(c)` keeps its behaviour, with two changes in `require` mode:

```text
finish(c):
  if uniqueness === 'any': return { ok: true, clues: c.clues, rating: c.rating, certificate: null }   // final = raw
  repaired = makeUnique(board, pieces, layout, c.clues, rng, ws, rowLimit)
  if repaired === null: unproved = true; return null
  changed = repaired.length !== c.clues.length
  clues   = changed ? sortLike(layout, repaired) : c.clues
  rating  = changed ? rateFn(board, pieces, clues, ws) : c.rating   // a repair rating: no profile, no onRate
  if not inBand(rating, target): return null
  if changed and excludeClueKeys.has(clueKey(board, pieces, clues)): return null   // new; decided after the rating
  return { ok: true, clues, rating, certificate: { status: 'unique', model: 'dlx-v1', rowLimit, verified: true } }
```

Rules that follow from it (each is tested):

- Phase 1, phase 2 and the beam call `afterProfile(c)` for every candidate that `rateSubset` returns (a `null` from
  `rateSubset` spends no profile and is skipped, in phase 2 too). The count steering of phase 1 is unchanged: an
  in-band sample counts neither below nor above; the beam's moves and `ranked()` are unchanged.
- In `any` mode the result is the first central candidate, else the in-band candidate nearest to the centre
  (`ranked()` order for ties) at profile 48 or at the end of the search. After profile 48 the first in-band
  candidate rated is returned at once.
- In `require` mode a central raw candidate whose repaired result is off-centre does not stop the search; a failed
  repair falls through; at profile 48 or at the end, candidates are repaired in order of their raw distance until the
  nearest finished result is at least as near as every unfinished raw rating. Each candidate is finished at most once
  (memoised), so `makeUnique` draws from `rng` at deterministic points only.
- `chooseBest` terminates: every iteration returns or finishes one more candidate.
- Unbounded band (`target.max` not finite): no centre, window or `Infinity - Infinity` arithmetic. Every in-band
  candidate is "central", so the first in-band candidate whose memoised finish succeeds is returned; in `require`
  mode the search continues after a failed repair; the reserve stop does not apply.
- Repair ratings are not profiles: there is **no** assertion that repairs and profiles together stay within 64.
- `onRate` is called for subset ratings only, exactly as today.

### The `rate` seam (RES-35 "Test seam"; check-list D9)

```js
 * @property {(board: Board, pieces: Piece[], clues: Pose[], ws: Workspace) => Rating} [rate] Replaces `rate()` of
 *   difficulty.js for every rating of this call (subsets and repaired sets); diagnostics and tests only.
```

Production callers never set it (`generate.js` and `record-fixtures.mjs` stay unchanged). MP09c uses it for the
RES-04 and RES-35 tests; MP14a's recorders will report every rating made through it.

### The Player sample and the code goldens (check-list D20)

`tests/player-load.test.js:243-244` asserts that `player/samples/sample-pack.json` is byte-identical to
`tests/fixtures/generated-sample-pack.json`. The Player sample is also the `source` of the frozen v1 puzzle-code
goldens (`tests/fixtures/puzzlecode-v1.json`, goldens `sample-1` to `sample-3`), which about twenty tests and nine
browser pages compare against (for example `tests/puzzlecode.test.js` "raw: the repository goldens are reproduced
exactly"). Report RES-22 and part D item 6 (accepted): the v2 code goldens stay unchanged as compatibility tests. With
centre-seeking the re-recorded sample pack has a different Easy puzzle (Normal and Hard stay the same in the
reference run), so copying it into the Player would break the goldens. Therefore:

- `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json` are not changed: the Player sample stays
  the gen-v2 sample, the source of the goldens;
- only `tests/fixtures/` is re-recorded, and `tests/player-load.test.js` no longer requires the Player sample to equal
  the generated fixture (intended contract change 3 below).

Whether the Player's built-in sample should later show v3 puzzles is an open owner question raised by the task-pack
author; it is not part of this task.

### Expected gate outcome (reference implementation of this specification, outside the repository)

- `record-fixtures --replace` keeps the recipe seed `fixture-set-0` and set attempt; `versions.algo` changes from
  `gen-v2` to `gen-v3` (policy `mixed-v2`, rng `xoshiro128ss-v1`, model `difficulty-v2` unchanged); `pieceKeys` and
  `layoutKeys` unchanged; 4 of the 10 `clueKeys` change (positions 2, 5, 6 and 8, 0-based) and `scores` change from
  `[21, 21, 18, 23, 23, 24, 18, 19, 18, 19]` to `[21, 21, 20, 23, 23, 21, 20, 19, 23, 19]`: every score now lies in
  the central half [19, 23] of Hard [17, 25).
- `generated-sample-pack.json`: the Easy puzzle changes; Normal and Hard stay the same.
- With the Player sample unchanged, the quick set fails exactly the three tests of the intended contract changes
  below until they are edited, and nothing else.
- GA-P1 (`npm test`) also runs `tests/generator-controller.test.js` "real engine flows (slow)", which pins the UI
  flows of `tests/fixtures/ui-flow-recipes.json` (`expect.pieces`, `expect.puzzles`, `expect.scores`). Reference run
  (2 workers): `default-10x6-normal` scores `[14, 14, 14, 15, 14]` (were `[16, 12, 16, 15, 16]`);
  `heart-n10-master` scores `[43, 41, 46, 49, 47, 46, 47, 48, 45, 42]` (were
  `[43, 41, 37, 49, 38, 38, 47, 48, 45, 42]`); piece counts 8, 14 and 73 unchanged. These two are intended contract
  change 4. `square-22x22-hell-3` ends with the notice `N-PARTIAL` ("Found 9 of 10 different Hell 3 puzzles within
  the time limit"): with v2's saturated scores (D = 2U + 30) and K = 73, no clue set can reach the central half of
  Hell 3 ([180.25, 216.75]; the highest score is 2 x 72 + 30 = 174), so every puzzle spends 48 ratings of about 1 s
  each and the batch hits the time limit. This is finding F-MP07-1 (check-list §4.2 D21): do not edit that recipe;
  apply D21 as written there.

A different outcome is not "fixed" by editing values: report it with the diff (check-list D11).

### Intended contract changes of existing tests (only these)

1. `tests/clues.test.js` "a uniqueness repair that leaves the band is not accepted" (line 167): its first part stays
   (seed `seed3`, target `{ min: 36, max: 38, share: 0.3 }`: the `any` result is in band and its repair leaves the
   band). The final `assert.deepEqual(required, { ok: false, reason: 'not-in-band' })` was a property of first-in-band
   acceptance; the centre search continues after the failed repair (the reference returns an in-band, unique result,
   score 36, clues Y, V, W). Replace that line by: `required.ok` is true, `inBand(required.rating, target)`, the
   certificate status is `'unique'`, `certify(...)` of `required.clues` is `'unique'`, and
   `clueKey(board, pieces, required.clues) !== clueKey(board, pieces, repaired)` (the out-of-band repair is never
   returned).
2. `tests/cli.test.js` line 111: `check({ versions: { ...recipe.versions, algo: 'gen-v3' } });` refused a foreign
   algorithm id; `gen-v3` is now current. Change the value to `'gen-v2'` (a recipe of an older algorithm id is still
   refused).
3. `tests/player-load.test.js` lines 243-244: rename the test to `'sample pack: valid wire format, real in-band
   ratings, independent answers, the gen-v2 source of the code goldens'` and replace the equality with the generated
   fixture by `assert.equal(sample.generation.algo, 'gen-v2');` (the remaining assertions stay).
4. `tests/fixtures/ui-flow-recipes.json` (read by `tests/generator-controller.test.js:750-785` and by three browser
   pages): set `expect.scores` of `default-10x6-normal` and `heart-n10-master` to the values of your GA-P1 run, which
   must equal the reference values above (CRLF and the file's 2-space layout kept). The `square-22x22-hell-3` recipe
   follows check-list D21.

## Files to create/modify

### Exclusive ownership

- `core/engine/clues.js`, `core/engine/version.js`.
- `tests/clues.test.js`; `tests/cli.test.js` (change 2 only); `tests/player-load.test.js` (change 3 only).
- `tests/fixtures/generation-case.json`, `tests/fixtures/generated-sample-pack.json` (written by the tool only);
  `tests/fixtures/ui-flow-recipes.json` (change 4 only).
- Documents listed in the documentation slot.

Must not edit: `player/samples/sample-pack.json`, `tests/fixtures/puzzlecode-v1.json`, `tools/record-fixtures.mjs`,
`core/engine/generate.js`, `difficulty.js`, `deduce.js`, `policy.js`, `levels.js`. If `tests/generate.test.js` or any
other test fails after the gate, report it; do not edit it.

### Documentation slot

- `docs/design-detail.md`:
  - line 24 (table "pending evidence"): `` `difficulty-v2`, `gen-v2` as specified `` becomes `` `difficulty-v2`,
    `gen-v3` as specified ``;
  - §5.4 (about line 781): `generation.algo` (`gen-v3`: macro/flat carving, local LNS, strict batch fold,
    centre-seeking clue selection of §6.10; packs made before it carry `gen-v2`; seeds reproduce only within one algo
    id);
  - §5.5 example: `"algo": "gen-v3"`;
  - §6.10 (about line 1344): replace "if inBand(r, target): go to finish(F, r)" and "stop at the first in-band subset
    or when the budget is spent" by the centre rule (central half, `CENTRE_RESERVE` stop at 48 of 64, `afterProfile`,
    `chooseBest`, memoised finish, the repaired key check after the rating, unbounded bands, repair ratings not
    profiles), and note the optional `rate` seam (tests and diagnostics only);
  - §6.11 `require` bullet: a repaired clue set whose clue key is already used (`excludeClueKeys`) is rejected and the
    next candidate is tried;
  - §7.6 item 3: in-band ratings only, and among them the search aims at the centre of the band (§6.10);
  - §13.2 row `clues` (about line 2631): add "returns the first central candidate, else the nearest in-band final
    result at profile 48 or at the end; scripted ratings through the `rate` seam".
- `docs/design-brief.md`, section "Levels and typical boards" (line 35): one sentence: a new puzzle aims at the middle
  of its level's score range, not just anywhere inside it.
- `USERGUIDE.md` "Difficulty" bullet (line 132) and `USERGUIDE.vn.md` "Độ khó" bullet (line 123): the same sentence
  ("A new puzzle aims at the middle of its level's score range." / natural Vietnamese, for example "Đề mới nhắm vào
  khoảng giữa thang điểm của mức độ.").

## Implementation steps

1. `clues.js`: add the `rate` property to `SelectContext`, `CENTRE_RESERVE`, `rateFn`; change `finish` as specified;
   replace `accept` by `finishOnce`, `chooseBest` and `afterProfile`; call `afterProfile` in phase 1, phase 2 and the
   beam; add the `chooseBest` fallback before the failure return. Update the header comment of the module.
2. `version.js`: `ALGO_ID = 'gen-v3'`.
3. Add the new tests (test plan); make the intended contract changes 1 to 3; run
   `node --test tests\clues.test.js tests\cli.test.js tests\player-load.test.js` (`tests\cli.test.js` and
   `tests\player-load.test.js` fail until the gate has re-recorded the fixtures: that is expected).
4. Run `npm run test:quick`; only the fixture-dependent failures may remain.
5. Gate GF-P1 then GA-P1 (test plan), after announcing it; then intended contract change 4 (and D21 for the Hell 3
   recipe), and run `node --test tests\generator-controller.test.js` again (about 2-3 minutes; it is part of the gate).
6. Documents; `npm run test:quick` and `npm run check` again.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP07-B01 | A new puzzle aims at the centre of its band: generation stops early only on a final result in the central half, otherwise returns the in-band result nearest to the centre | new tests; the re-recorded Hard batch lies in [19, 23] |
| MP07-B02 | Required-unique puzzles are judged after repair: an off-centre repair does not cause an early central-window stop; an out-of-band repair is never returned; an off-centre in-band repair may be the fallback at profile 48 or at the end; an already-used clue set is never returned | scripted tests |
| MP07-B03 | Stored puzzles, codes and the Player's sample are unchanged; only the generation fixtures and the algorithm id move, under the approved gates | gate record; unchanged golden tests |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP07-T01 | `selectClues` implements the pseudo-code above exactly: central half, `CENTRE_RESERVE = 16`, `afterProfile` after every rated candidate, lazy best-first `chooseBest` with the tie rule, memoised finish, repaired key check after the repair rating | review; tests |
| MP07-T02 | Every rating of a call goes through `ctx.rate ?? rate`; `onRate` sees subset ratings only; production callers do not set `rate` | review; seam tests |
| MP07-T03 | Unbounded targets never compute with `Infinity` and return the first in-band candidate whose finish succeeds | unbounded test |
| MP07-T04 | `ALGO_ID` is `'gen-v3'`; the fixtures are re-recorded with the reason "P1: clue selection aims at the band centre" and `record-fixtures --check` passes | gate commands |
| MP07-T05 | Only the four listed changes of existing tests and fixtures are made (change 4 after the GA-P1 run, D21 for the Hell 3 recipe); the Player sample and the code goldens are byte-identical to HEAD | `git diff --stat` in the reply |
| MP07-T06 | `npm test` (GA-P1), `npm run test:quick` and `npm run check` pass; 1 and 4 workers still give identical results (the existing worker tests and the slow CLI test) | command output |
| MP07-T07 | Documents updated as listed, both user-guide languages in step | review |

## Test plan

### Required new test cases (`tests/clues.test.js`)

Use a traced runner that wraps the seam and records every rating call, marking the ones that `onRate` reports as
profiles (a profile's `rate` call is always followed at once by its `onRate`):

```js
/** @param {Record<number, number>} table score by number of clues; other counts score 10 */
const scripted = (table) => (/** @type {Board} */ _b, /** @type {Piece[]} */ p, /** @type {Pose[]} */ clues) => {
  const score = table[clues.length] ?? 10;
  return { model: 'difficulty-v2', score, level: levelForScore(score).id, saturated: false, metrics: { U: p.length - clues.length } };
};
function traced(o) {   // o: partial SelectContext plus seed; returns { result, rated, calls }
  const calls = []; const rated = []; const inner = o.rate ?? rate;
  const result = selectClues({
    board, pieces, layout, rng: createRng(o.seed), uniqueness: 'any', excludeClueKeys: new Set(), ws, ...o,
    onRate: (clues, rating) => { rated.push({ clues, rating }); calls[calls.length - 1].profile = true; },
    rate: (b, p, clues, w) => { const r = inner(b, p, clues, w); calls.push({ ids: clues.map((c) => c.piece).join(''), score: r.score, profile: false }); return r; },
  });
  return { result, rated, calls };
}
```

(`board`, `pieces`, `layout`, `ws` are the file's 10 x 6 recipe fixtures; give the helpers JSDoc types so that
`// @ts-check` passes.) In the table, T = `{ min: 20, max: 30, share: 0.22 }` (centre 25, central [22.5, 27.5],
initial clue count 3) and S = `scripted({ 1: 40, 2: 25, 3: 21, 4: 18 })`. "ids" are the clued piece ids in layout
order. A "repair call" is a call not marked as a profile.

| Case | Set-up | Expected |
|---|---|---|
| any, centre reconstruction | real `rate`; targets `level(id)` with seed `centre-<id>` for very-easy, easy, normal, hard, expert, master; `{ min: 34, max: 36, share: 0.3 }` seed `reserve-0`; `{ min: 28, max: 30, share: 0.3 }` seed `reserve-3` | for each: the result equals the oracle below (clues and rating) and `rated.length` equals the oracle's stop index; at least one case stops on a central candidate before 48 and at least one at profile 48 (reference: the six levels stop centrally after 9, 6, 20, 1, 1, 6 profiles; both `reserve` cases at 48) |
| any, ties by key | seam `scripted({ 2: 21, 3: 29 })`, target T, seed `tie-0` | 48 profiles; the result's clue key is the smallest clue key among the in-band rated subsets; ids `YV` |
| any, end of search | real `rate`; the 3 x 5 board with P, U, V of the existing tests, target `{ min: 6, max: 14, share: 0.3 }`, seed `end` | 3 profiles; score 6; the result is the one of the U and V singles (both score 6, distance 4) with the smaller clue key (`V` in the reference) |
| unbounded | real `rate`; target `{ min: 17, max: Infinity, share: 0.38 }`; `any` seed `unbounded`; `require` seed `unbounded-1` | `any`: 1 profile, the first rated candidate (score 20, ids `ILVTF`); `require`: calls `LVTNX` 19 (profile), `LVTNFX` 12 (repair, out of band), `LTFZX` 20 (profile); result `LTFZX`, certificate `unique`; no `NaN` anywhere |
| require, central stop | seam S, target T, `require`, seed `req-0` | 6 profiles, no repair call, result score 25, ids `FW` |
| require, failed repair falls through | seam S, target T, `require`, seed `req-2` | calls `p3 p3 p3 p3 p4 p2 R4:18 p4 p2` (`pN` a profile with N clues, `RN:s` a repair call); result 25, ids `YP` |
| require, off-centre repairs, lazy best-first, each repair once | seam S, target T, `require`, seed `req-3` | 48 profiles; 12 repair calls, in order `WZX:21 FWZ:21 VTWX:18 PVTF:18 UFX:21 UNWX:18 NFX:21 IPN:21 WZX:21 IPU:21 ILUF:18 PFZ:21`; the last call is a profile (no repair after profile 48); result score 21, ids `UFX`, `certify(...)` `unique` |
| require, excluded repaired key | as `req-3`, with `excludeClueKeys` = the clue key of `req-3`'s result | the `UFX` repair is rated exactly once and rejected; result score 21, ids `PFZ`; 48 profiles |
| require, budget exhausted | seam `scripted({ 1: 25 })`, target T, `require`; seeds `budget-0` and `budget-1` | `budget-0`: `{ ok: false, reason: 'uniqueness-not-proved' }`, 64 profiles, 12 in-band, 11 repair calls; `budget-1`: `{ ok: false, reason: 'not-in-band' }`, 64 profiles, 12 in-band, 12 repair calls (each in-band candidate finished at most once although `chooseBest` runs after every profile from 48 on) |
| no candidate | seam `scripted({})` (every score 10), target T, `any` and `require`, seed `none-0` | `{ ok: false, reason: 'not-in-band' }`, 27 profiles, in both modes |

Oracle of the first case (`any` mode, finite band):

```js
function expectedAny(target, rated) {
  const centre = (target.min + target.max) / 2; const win = (target.max - target.min) / 4; const seen = [];
  const nearest = () => seen.slice().sort((a, b) => Math.abs(a.rating.score - centre) - Math.abs(b.rating.score - centre)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))[0];
  for (let i = 0; i < rated.length; i += 1) {
    const r = { ...rated[i], key: clueKey(board, pieces, rated[i].clues) };
    if (inBand(r.rating, target)) { seen.push(r); if (Math.abs(r.rating.score - centre) <= win) return { stop: i + 1, pick: r }; }
    if (i + 1 >= 48 && seen.length > 0) return { stop: i + 1, pick: nearest() };
  }
  return { stop: rated.length, pick: seen.length > 0 ? nearest() : null };
}
```

The seeds and expected values come from the analysts' reference implementation of this specification; a mismatch is
reported with a trace (check-list D11), never settled by changing a seed or a value. The real-`rate` cases pin v2
scores: MP09d2 re-evaluates them under v3 (its task file lists them); the scripted cases do not depend on the model.

### Exact commands

```powershell
node --test tests\clues.test.js
if ($LASTEXITCODE -ne 0) { throw 'clue tests failed' }
npm run test:quick
# expected before the gate: only tests\cli.test.js and tests\player-load.test.js cases that read the old fixtures fail

# Gate GF-P1 (announced; about 1 s each)
node tools\record-fixtures.mjs --replace --reason "P1: clue selection aims at the band centre"
if ($LASTEXITCODE -ne 0) { throw 'record-fixtures failed' }
node tools\record-fixtures.mjs --check
if ($LASTEXITCODE -ne 0) { throw 'fixture check failed' }
git --no-pager diff --stat -- tests/fixtures player/samples

# Gate GA-P1 (announced; about 2-4 minutes, must stay under 10)
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record: the reason text, the old and new `versions`,
  which `clueKeys` and `scores` moved (and that `pieceKeys` and `layoutKeys` did not, or why they did), which sample
  puzzles changed, the `npm test` counts and duration, the three UI-flow outcomes (scores, piece counts, the
  `square-22x22-hell-3` notice and its duration), and the `git diff --stat` showing that
  `player/samples/sample-pack.json` and `tests/fixtures/puzzlecode-v1.json` are unchanged.
- Handoff to MP08, MP09c and MP09d2: the `afterProfile` / `finishOnce` / `chooseBest` structure (MP09c adds the
  unrateable and refused profiles of RES-04 and RES-35 to `afterProfile` and the failures to `finish`); the seam's
  signature; for MP09d2, the list of real-`rate` test cases that pin v2 scores.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP07: Centre-seeking clues, the rate seam, gen-v3 and the RES-15a stall stop`), after owner decision D21 (P-OD4) |
| Start | 2026-11-12 16:14 (+07:00) |
| End | 2026-11-12 18:25 developer; 18:35 orchestrator review and commit |
| Duration | 65 min developer in three rounds: implementation 16:14-16:33 (19 min), D21 measurements for the plan author 17:23-17:56 (33 min), RES-15a 18:12-18:25 (13 min); about 2 h 10 min elapsed, mostly waiting for the D21 decision; about 10 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 257 model calls; 57,609,226 input tokens (56,644,658 cache reads); 307,417 output tokens (all three rounds) |
| AI credits | about 1,115 (developer): implementation about 217, D21 measurements about 694, RES-15a about 204 |
| Verification | Developer, round 1: GF-P1 re-recorded the generation fixtures; GA-P1 `npm test` failed only the slow flow `square-22x22-hell-3` (`N-PARTIAL`, 9 of 10, three runs). Round 3: `node --test tests\clues.test.js` 30/30 (8.2 s); `npm run test:quick` 1193/1193 (17.7 s); `npm run check` OK; `node tools/record-fixtures.mjs --check` OK, no rewrite; the Hell 3 two-worker flow alone 55.7 s, 10 of 10; `npm test` 1211/1211, 117 suites (65.7 s, against 151.6 s before RES-15a); `STALL_LIMIT` mutated to 11 and 13 makes the stall tests fail. Orchestrator re-run under the timing lock: `npm run check` OK, `record-fixtures --check` OK, `npm test` 1211/1211 (65.9 s) |
| Acceptance | MP07-B01..B03 and MP07-T01..T07 met, with T05's change 4 under D21 = (d): the Hell 3 recipe stays at quantity 10 and pins `[172 x 10]` (was 170). Diff reviewed: central half `centre +/- (max - min) / 4`, `CENTRE_RESERVE = 16`, `afterProfile` after every rated candidate, lazy `chooseBest` over `ranked()`, memoised `finishOnce`, repaired-key check, `ctx.rate ?? rate` for every rating; RES-15a: `STALL_LIMIT = 12` next to `BEAM_WIDTH`, finite bands only, one-sided check from all rated candidates (`!ratedCentral && ratedBelow !== ratedAbove`), counter from the first in-band candidate reset only by a strictly nearer one, skipped subsets not counted (they never increment `profiles`), repair ratings not counted, a null `chooseBest()` continues the search; `ALGO_ID 'gen-v3'`; Player sample and code goldens unchanged |
| Issues & resolutions | (1) D21 / finding F-MP07-1: Hell 3 on 22x22 (K = 73) cannot reach the central half under v2 (maximum 174 < 180.25), so every puzzle spent 48 ratings and the UI flow ended `N-PARTIAL`. The plan author asked for measurements ([D21 record](../../docs/difficulty-v3/d21-measurements-2026-11-12.md), 14 questions; 42 times slower than before MP07; simulated early stop: N = 4 misses 42 central results, N = 8 misses 2, N = 12 none over 2,106 calls) and answered (d), amendment RES-15a (`clarifications.md` Part I); the owner confirmed (P-OD4). (2) Regression cases from the D21 misses at N = 8 pinned: 15x20 Hell 2 K = 50 returns 126 (slow test, 2.4 s) and the 10x6 Master board `pop-master-any-22` returns 48. (3) With RES-15a, Hell 3 on 22x22 still needs 17-22 ratings per puzzle (serial 93 s against 5.75 s before MP07) and returns 172 instead of 170; MP12 reports the Hell cells under v3. (4) Cross-review SP03: the v3 re-validation of `STALL_LIMIT` cannot run in MP09c (no v3 rater yet); the orchestrator moves it to MP09d2 after the switch |
| Handoff | MP08 onward: `SelectContext.rate` is a diagnostics and test seam (production callers never set it); `onRate` sees subset ratings only. The stall rule reads raw subset ratings; MP09c's unrateable (RES-04) and AR1-rejected profiles must neither advance nor reset the stall counter. MP09d2 re-runs the D21 simulation on v3 sequences for N = 8, 12 and 16 (scripts in `docs/difficulty-v3/d21-2026-11-12/`) and may only raise `STALL_LIMIT`. UI-flow recipe re-pins in MP09d2 and MP12b: a recipe that stops completing is a finding for the owner, not a quantity cut |

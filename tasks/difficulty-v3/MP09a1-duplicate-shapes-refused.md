# MP09a1 — Two pieces of the same shape refused in packs, links and puzzle codes

| Header | Value |
|---|---|
| ID | MP09a1 (first part of the report's MP09a; MP09a2 handles the Generator's saved sets) |
| Depends on | MP08 (accepted and committed) |
| Estimated size | Medium–Large: about 550–750 changed lines (engine about 80, Player about 10, locales about 12, tests about 380–520, documents about 50); about 50–60 minutes |
| Owner role | Engine and Player |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-34 (duplicate shapes refused), RES-09 (engine functions stay total); clarifications SA2-Q-P03 / SA1-Q-P6 (owner), C6; cross-review FP02, FP06, FP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`); check-list §4.1 (traceability only) |
| Gates owned | none (the browser check of the refusal is added and run by MP09e under GC-P2) |
| Implementation status | Not started |

## Goal & business context

The owner decided that a piece set must never contain two pieces of the same free shape (mirror images and
rotations count as the same shape): the deduction solver, the rating and the puzzle identity all assume distinct
shapes, and a set with "twins" can be solved by swapping the twins, which no player would call a different
solution. Generated sets never contain twins (the carver refuses them), but packs, links and puzzle codes from outside
could. Today such a set opens with a warning; from this task on it is **refused at every entry** with a clear message
naming the two pieces, in English and Vietnamese.

This part makes the pack reader, the puzzle codes, the Player and the Generator's import refuse such a set. The
Generator's saved sets, which could hold such a set from before, are removed with a one-time notice in MP09a2.

This is a format tightening, not a format change: the puzzle-code grammar, the v2 code goldens and every rating stay
as they are.

## Scope

### In scope

- `core/engine/pack.js`: the duplicate-shape check becomes an error (`checkDistinctShapes`), `fail` gains `params`.
- `core/engine/types.js`: `Issue.params`.
- Puzzle codes: the error mapping to a new `PuzzleCodeError` code `duplicate-shape` (decoder and encoder), its
  default message and documented codes; the worker client's and the entry dialog's code lists and text key.
- Player: `messageForIssues` case and texts; the entry dialog's text in both apps' locales (English and Vietnamese).
- The existing tests that build twin sets through the pack reader or the codec, migrated as listed below (FP02).
- Documents: design §5.3 and §9.8, `docs/design-brief.md`, both user guides.

### Out of scope

- The engine functions `rate`, `measureDeduction`, `selectClues`, `buildModel` and the DLX solvers: they stay total
  on direct inputs with twins (RES-09) and their twin tests stay unchanged (`tests/keys.test.js`,
  `tests/placements.test.js`, `tests/tiling.test.js`, `tests/enumerate.test.js`); `tests/carve.test.js` keeps testing
  the carver's own error.
- The Generator's saved sets, `restoreState` and the notice (MP09a2).
- The puzzle-code format (`puzzlecode-v1.js` grammar and maths) and `tests/fixtures/puzzlecode-v1.json` (the v2
  goldens have no twins and stay unchanged).
- v3 claims (MP09b); activation and its gates (MP09d1, MP09d2); the code-size record and the browser check in
  `tests/browser/puzzle-code-acceptance.js` (MP09e, GC-P2).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity; none of the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive`, `deriveLimits` in the engine
  files you edit.
- Every new visible text has a key in both packs of its app with the same keys and `{placeholders}` (the i18n tests
  check it); natural Vietnamese with the locale's existing terms (mảnh, bộ mảnh, đề, hình dạng).
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no test name containing `slow` unless it is one.
- Run only the commands of the test plan (no browser page; no gate); never stage, commit, stash, reset, push or switch
  branches; never edit `tasks/difficulty-v3/`, the reports or `tests/fixtures/puzzlecode-v1.json`.

## Inputs & context

### Pack reader (anchors at HEAD `3fd99ff`; find moved lines by the quoted text)

- `fail(ctx, code, path, message)` (`core/engine/pack.js:150-156`) pushes `{ code, path, message }`; add an optional
  fifth argument `params` stored as `issue.params` only when given. `Issue` (`core/engine/types.js:43-48`) gains
  `@property {Record<string, string | number>} [params]`.
- `warnAboutPieces(ctx, pieces)` (558-576) warns `small-piece`, `piece-hole` and, at 569-574, `duplicate-shape`
  (`Piece ${piece.id} has the same shape as piece ${first}`). Remove the duplicate part from it; `small-piece`,
  `piece-hole` (and `board-disconnected`) stay warnings.
- In `readPackSteps` (the generator function behind `validatePack` and `validatePackSliced`, line 934), about line
  988: `const pieces = boardModel !== null && fields.has('pieces') ? readPieces(...) : null;`
  followed by the early return `if (ctx.issues.length > 0 || board === null || boardModel === null || pieces === null)
  { return null; }`. Insert between them:

  ```js
  if (pieces !== null) checkDistinctShapes(ctx, pieces);
  // the existing early return follows immediately and stops the read on any issue
  ```

  `pieces` is null for a malformed board, missing pieces or a failed piece read: the guard keeps those inputs
  returning their own issues, never a `TypeError`.
- `checkDistinctShapes(ctx, pieces)`: walk the pieces in pack order with a `Map` from `canonicalKey(piece.cells)`
  (`core/engine/geometry.js:126`; identifies translations, rotations and reflections) to the id of the first piece of
  that shape; for every later piece of a known shape:
  `fail(ctx, 'duplicate-shape', child('pieces', i), \`Piece ${piece.id} has the same shape as piece ${first}\`,
  { piece: piece.id, first })`. One issue per later copy (three copies give two issues).
- Every path through `validatePack`, `parsePack` and `validatePackSliced` refuses such a set, which covers packs and
  `#pack=` links in the Player (`core/browser/handoff.js:394-395`), generated packs
  (`core/browser/generation-client.js:381`) and the Generator's saved sets (`generator/state.js:885-899`; MP09a2 adds
  the notice).
- The comment "Policy warnings only" and design §5.3 item 10 change accordingly.

### Puzzle codes (error mapping only; the grammar and the v2 maths do not change)

- The v1 grammar keeps its repeated-shape flag (design §9.8 payload item 3): such a code still parses, then fails
  the pack check. Where a pack check fails, a first issue `duplicate-shape` throws
  `new PuzzleCodeError('duplicate-shape', issue.message, { params: issue.params })` instead of `invalid(...)`:
  - `validatedPack(wire)` (`core/engine/puzzlecode-v1.js:1787-1799`:
    `throw invalid(checked.issues[0]?.message ?? ...)`);
  - the encoder's `partsFromSnapshot` (`core/engine/puzzlecode.js:183-186`).
  The tail check (`puzzlecode-v1.js:2083-2086`) validates the pack of a core that already passed the same check, so it
  can never see `duplicate-shape`: leave it unchanged.
- A first issue other than `duplicate-shape` keeps today's `invalid` error. The cases of `tests/puzzlecode.test.js`
  that build a pair of monominoes with `pairPayload` (851-864) to test another refusal (from 918: duplicate ids,
  forbidden characters, long ids and labels, ill-formed UTF-8, oversized lengths) fail before or ahead of the shape
  check, so they keep their expected error unchanged.
- `core/engine/puzzlecode-input.js`: add `'duplicate-shape': 'Two pieces of this puzzle have the same shape.'` to
  `MESSAGES` (17-27) and to the documented codes of `PuzzleCodeError` (39-44); `core/engine/puzzlecode.js`: the
  decoder's documented codes (594-599).
- `core/browser/puzzle-code-client.js:98`: add `'duplicate-shape'` to `CODEC_CODES`.
- `core/browser/puzzle-code-dialog.js:47-66`: add it to `INPUT_CODES` (a failure caused by what was typed) and
  `ERROR_KEYS` (`'duplicate-shape': 'code.error.duplicateShape'`).
- The `params` already cross the worker boundary through the `WireIssue` reader (`core/engine/protocol.js:25-26,
  48-50, 789-818`) and `readPuzzleCode` passes the decoder's issues through (`core/browser/handoff.js:250-261`): no
  protocol change. Verify it with the client test below.

### Texts (English and Vietnamese)

| Key | File(s) | English | Vietnamese (suggested) |
|---|---|---|---|
| `code.error.duplicateShape` | `player/locale.*.js`, `generator/locale.*.js` | Pieces {piece} and {first} have the same shape (mirror images count as the same shape), so this puzzle cannot be opened. | Mảnh {piece} và mảnh {first} có cùng hình dạng (hình lật đối xứng cũng tính là cùng hình dạng), nên không thể mở đề này. |
| `msg.duplicateShape` | `player/locale.*.js` | the same text | the same text |

- Player: `messageForIssues` (`player/strings.js:58-75`) gains `case 'duplicate-shape': return t('msg.duplicateShape',
  first.params ?? { piece: '?', first: '?' });` (a missing `params` must not throw).
- The shared entry dialog shows `code.error.duplicateShape` with the error's `params` in both apps (the Player's
  `#p=` route and code dialog; the Generator's Import puzzle dialog and `#p=` import, `generator/jobs.js:551-601`,
  `generator/app.js:263-279`; no change in those two files).

### Existing tests that build twin sets through the reader or the codec (FP02)

These tests pass today with twins and fail after the check; each is an intended contract change of this task. The
list is complete: the analysts ran the quick set (1,177 tests) on a scratch copy of `3fd99ff` with only the new pack
check, and exactly 13 tests failed, 2 in `tests/pack.test.js` and 11 in `tests/puzzlecode.test.js`; with the changes
below both files pass again (34 and 51 tests, slow ones skipped).

| Test (at `3fd99ff`) | Change |
|---|---|
| `tests/pack.test.js:671`, "a classic pentomino set is a clean piece-set; non-standard sets warn but stay playable": the twin case (683-686) | becomes the refusal case (test plan) |
| the same test, the split case (688-690, two monominoes on `['#.#']`) | rebuilt with the split fixture below |
| `tests/pack.test.js:697-706`, "the largest board (64 x 16 = 1024 cells, eight 128-cell pieces) is accepted" (eight identical 64 x 2 bands) | rebuilt with the eight distinct pieces below |
| `tests/puzzlecode.test.js:229-235`, the snapshot `disconnected` (two monominoes on `['#.', '.#']`), used by "raw: constructed puzzles survive …" (621), "raw: the first puzzle clue order …" (644), "raw: Unicode, lone surrogates and a leading byte-order mark survive exactly" (661), "tails: a stored answer survives …" (1192) and "deflate: forced version-2 encoding round trips every kind of puzzle" (1248) | rebuilt without twins (below); the assertions of those tests stay |
| `tests/puzzlecode.test.js:244-253`, `repeatedShapes` (four dominoes) | becomes a refusal case; its other uses at 623, 645, 1193 and 1250 take the four-shape snapshot below (`fourShapes`), which has the same ids, clue order, labels, colours and title, so the expected values of 644-651 stay |
| `tests/puzzlecode.test.js:877-885`, "the construction helpers build a valid minimal puzzle": the pair of monominoes (883-884) | the pair now proves that the helper writes a payload that parses up to the pack check: `rejectsWith(decodePuzzleCode(rawCode(pairPayload((w, i) => overrideId(i === 0 ? 'x' : 'y')(w)))), 'duplicate-shape')` with `params: { piece: 'y', first: 'x' }`; the domino part stays |
| `tests/puzzlecode.test.js:718-743`, "raw: the count-only stress pack of 1,024 cells and 128 pieces needs no exact-cover model" | the distinct-shape stress fixture below; title "… 128 distinct pieces …" |
| `tests/puzzlecode.test.js:1266-1290`, "deflate: auto mode keeps the shortest core and raw wins every tie" | the same fixture in place of the 128 identical octominoes; every assertion stays |
| `tests/puzzlecode.test.js:1894-1924`, "masks: the encoder writes the shortest board mask, the lowest mode on a tie and the smallest k" | the masks are written below the pack check (fixture "Masks" below): `stripPuzzle` gives strips of equal length, and a board such as the `checkerboard` case can hold no puzzle without twins at all |
| `tests/puzzlecode.test.js:1926-1990`, "masks: every mode decodes to the same board when spliced into a real payload" | the real payload is a one-piece puzzle over the connected 7 x 4 board (fixture "Masks") |
| `tests/puzzlecode.test.js:2004-2209`, `randomPuzzle` and "property: seeded random puzzles round-trip …" | twin-free random puzzles below; the counters `repeated` and `repeatedFlag` are dropped |

The direct engine tests with twins (`tests/keys.test.js:131-137`, `tests/placements.test.js:150`,
`tests/tiling.test.js:295-297`, `tests/enumerate.test.js:66`) do not go through the reader and stay unchanged, and
the other `pairPayload` refusal cases (from 918) keep their errors (checked in the same run). If another quick test
fails because a pack or code it builds has two pieces of the same shape, stop and report it with its name; do not
change it without the orchestrator's approval.

### Test fixtures to build

- **Mirror pair**: an L tetromino `[[0,0],[1,0],[2,0],[0,1]]` and its reflection `[[0,0],[1,0],[2,0],[2,1]]`.
- **Split case rebuilt** (`tests/pack.test.js:688-690` used two monominoes on `['#.#']`): board `['#.##']` with a
  monomino `a` `[[0,0]]` and a domino `b` `[[0,0],[1,0]]`; it still checks `board-disconnected` and two pieces.
- **`disconnected` rebuilt**: `rows: ['#..', '.##']`; pieces `piece('q1', [[0, 0]], '\u03b1', '#A1B2C3')` and
  `piece('z-9', [[0, 0], [1, 0]], '', '#0f0f0f')` (a monomino and a domino; ids, labels and colours unchanged); clues
  `[pose('q1', 0, 0)]`; solution `[pose('z-9', 1, 1), pose('q1', 0, 0)]`. The board still has two separate regions.
- **Largest board rebuilt** (`tests/pack.test.js:697-706` used eight identical 64 x 2 bands): eight pairwise distinct
  128-cell pieces tiling the 64 x 16 board. Construction (verified by the analysts: areas all 128, eight distinct
  `canonicalKey`s, `validatePack` accepts it without warnings): start with `owner[y][x] = Math.floor(y / 2)`; for
  k = 0..6 set `owner[2k + 1][2k + 1] = k + 1` (piece k gives one cell to piece k + 1) and
  `owner[2k + 2][2k + 40] = k` (piece k takes one cell from piece k + 1). Piece k's cells are the cells it owns,
  shifted by their minimum x and y; its witness pose is `{ piece, x: minX, y: minY, turn: 0, mirrored: false }`.
  The test asserts the eight keys are distinct with `canonicalKey`.
- **Four different shapes** (`fourShapes`, for the uses of `repeatedShapes` for other features): board
  `['###', '###', '###', '###']`; `d1` I3 `[[0,0],[1,0],[2,0]]` at (0, 0); `d2` L3 `[[0,0],[1,0],[0,1]]` at (0, 1);
  `d3` vertical domino `[[0,0],[0,1]]` at (2, 1); `d4` T4 `[[1,0],[0,1],[1,1],[2,1]]` at (0, 2); labels `a`-`d`,
  colours `#111111`-`#444444`, clues `[d4, d2]` in that order, the solution in any order (the test asserts it comes
  back in piece order), title `'Pairs'`. Check the tiling with `isValidLayout`.
- **Distinct-shape stress fixture** (FP02; the analysts checked every value below at `3fd99ff`): 1,024 active cells
  and 128 connected, pairwise distinct octominoes, count-only (no solution):

  ```js
  const rows = Array.from({ length: 16 }, () => '#'.repeat(64));
  const pieces = v1.catalogueShapes(8).slice(0, 128)
    .map((cells, i) => piece(v1.labelFor(i), cells, v1.labelFor(i), v1.colorFor(i)));
  ```

  | Quantity | Value |
  |---|---|
  | distinct `canonicalKey`s | 128 |
  | `countPlacements(preparePlacements(board, pieces, [])).rows` | 752,378 (the twin version had 849,920) |
  | `v1.measureFreePlacements(board, pieces, [])` | R = 1024; H = 12.477212990727637, which equals the mean of `log2(1 + n)` over `countPlacements(...).perPiece` (assert this relation to 1e-12, not the literal) |
  | `validatePack` | accepted, with two `piece-hole` warnings (`pieces[63]` and `pieces[66]`) |
  | `v1.rebuildRatingClaim(board, pieces, [], { stop: 'solution', branchTrials: 0, rowTrials: 0 }, v1.measureFreePlacements)` | equals the test's claim (score 256, level `hell-4`) |
  | raw core, no claim / compact claim / claim with H + 1 (escaped) | 109 / 112 / 398 symbols |
  | automatic core: compact claim / escaped claim | 34 symbols, version 2 / 271 symbols, version 2 |

  In the raw test, replace `assert.ok(consistent.C.length < 80, …)` by
  `assert.equal(consistent.C.length, bare.encoded.C.length + 3, 'the rebuilt claim costs three symbols, not the escape')`
  (compute `bare` before it) and `assert.ok(escaped.C.length > 250, …)` by
  `assert.equal(escaped.C.length, 398, 'the changed claim is carried whole')`; keep `bare < consistent` and the
  `rebuildRatingClaim` level check. In the deflate test the existing relations hold (34 < 112 and 271 < 398).
- **Masks** (the two mask tests): the first test builds, for each mask case,
  `parts = { board: boardFromRows(rows), rotation: 0, pieces: stripPuzzle(rows).pieces, clues: [], solution: null,
  rating: null, certificate: null, title: null }` (the `PuzzleParts` shape that `partsFromSnapshot` returns,
  `core/engine/puzzlecode.js:192-201`) and the core `rawCode((w) => w.append(v1.encodeCorePayload(parts)))`, then
  reads the mask with `readerAtMask(core)` as today (no decode: the frozen writer accepts repeated shapes below the
  pack check, and the mask starts at bit 22 either way); every assertion stays, including "every mode is the
  shortest somewhere in the cases". The second test replaces `stripPuzzle(rows)` by one piece over all active cells:
  `const cells = rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === '#' ? [[x, y]] : [])));` and
  `base({ rows, pieces: [piece('A', cells, 'A', '#e6194b')], solution: [pose('A', 0, 0)], clues: [] })` (the board is
  connected and its first row starts with an active cell, so the cells need no shift); the splice and decode
  assertions stay. `stripPuzzle` stays for the first test.
- **Twin-free random puzzles** (FP02): in `randomPuzzle`, remove the line
  `const rows = grid.map((row) => row.map((on) => (on ? '#' : '.')).join(''));` before the growth, and insert after
  the growth loop (just before `const relative = regions.map(`):

  ```js
  // Pieces of one puzzle have pairwise distinct free shapes. A region whose shape repeats an earlier region's
  // shape is merged into the region of its first neighbouring cell (its cells in order; right, down, left, up), or,
  // without a neighbouring region, its cells are blocked. Every step removes one region, so the loop ends.
  for (let changed = true; changed;) {
    changed = false;
    const shapes = new Set();
    for (let r = 0; r < regions.length && !changed; r += 1) {
      const key = canonicalKey(/** @type {any} */ (regions[r]));
      if (!shapes.has(key)) {
        shapes.add(key);
        continue;
      }
      const regionOf = new Map(regions.flatMap((cells, i) => cells.map(([x, y]) => [y * W + x, i])));
      let target = -1;
      for (const [cx, cy] of regions[r]) {
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const other = regionOf.get((cy + dy) * W + cx + dx);
          if (target === -1 && cx + dx >= 0 && cx + dx < W && other !== undefined && other !== r) {
            target = other;
          }
        }
      }
      if (target === -1) {
        for (const [x, y] of regions[r]) {
          grid[y][x] = false;
        }
      } else {
        regions[target].push(...regions[r]);
      }
      regions.splice(r, 1);
      changed = true;
    }
  }
  const rows = grid.map((row) => row.map((on) => (on ? '#' : '.')).join(''));
  ```

  It draws no random number, so the rest of each seed's stream is unchanged. The function's comment says "grown
  tilings with large pieces of pairwise distinct shapes". In the property test, remove `repeated` and `repeatedFlag`
  from `seen` and their two increments, and keep `count >= 10` for every other counter. The analysts' run of the 150
  seeds at `3fd99ff` (for information; do not pin): every snapshot valid; solutions 96, large 42, clued 88, rated
  121, titled 130, certified 60, compactRating 66, escapedRating 55 (before: 93, 14, 76, 124, 119, 50, 69, 55).

## Files to create/modify

### Exclusive ownership

- Engine: `core/engine/pack.js` (the duplicate check, `fail`), `core/engine/types.js` (`Issue.params`),
  `core/engine/puzzlecode.js` (encoder mapping, documented codes), `core/engine/puzzlecode-v1.js` (error mapping
  only), `core/engine/puzzlecode-input.js` (message and documented codes).
- Browser: `core/browser/puzzle-code-client.js` (`CODEC_CODES`), `core/browser/puzzle-code-dialog.js`
  (`INPUT_CODES`, `ERROR_KEYS`).
- Player: `player/strings.js` (`messageForIssues`), `player/locale.en.js`, `player/locale.vi.js`.
- Generator: `generator/locale.en.js`, `generator/locale.vi.js` (the `code.error.duplicateShape` key only).
- Tests: `tests/pack.test.js`, `tests/puzzlecode.test.js`, `tests/puzzle-code-client.test.js`,
  `tests/puzzle-code-dialog.test.js`, `tests/player-puzzle-code-route.test.js`, `tests/player-load.test.js`,
  `tests/generator-import.test.js`, `tests/player-i18n.test.js` and `tests/generator-i18n.test.js` (only if a parity
  list must name the keys).
- Documents of the documentation slot.

### Documentation slot

- `docs/design-detail.md` §5.3 (section "Validation: `validatePack`, staged and bounded"): item 6 "Pieces" gains "no
  two pieces of the same free shape (rotations and reflections count as the same shape): error `duplicate-shape` with
  `params { piece, first }`, one per later copy"; item 10 becomes "Policy (warnings only). Pieces smaller than 3 cells
  or pieces with holes produce warnings"; §9.8 (the payload items: "with the repeated flag, one 'same shape as the
  previous piece' bit per piece"): such a code still parses and is then refused with `duplicate-shape`; the
  `PuzzleCodeError` code list.
- `docs/design-brief.md` (FP07), section "Limits, waiting, and sharing", the paragraph "A puzzle code rebuilds one
  puzzle exactly": one sentence, after "The puzzles must share one board and piece set …": a piece set with two pieces
  of the same shape (mirror images and rotations included) is refused wherever it comes from (a link, a code, a pack
  or an import): nothing opens, and the message names the two pieces. The Generator's saved sets are MP09a2's.
- `USERGUIDE.md` and `USERGUIDE.vn.md`: where links, codes and imports are opened (English guide around lines 90-99
  and 152), one sentence: a puzzle or piece set with two pieces of the same shape (mirror images included) cannot be
  opened, and the message names the two pieces. The release note is MP17's.

## Implementation steps

1. Pack reader: `fail` params, `Issue.params`, `checkDistinctShapes` with the null guard; remove the warning.
2. Puzzle codes: the two mappings, messages, documented codes; client and dialog code lists.
3. Player strings and both apps' locale keys.
4. Tests: the migrations of the table "Existing tests …" first, then the new cases (test plan).
5. Documents; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09a1-B01 | A pack, `#pack=` link, `#p=` code, Player route or Generator import with two pieces of the same shape (mirror images included) is refused, and the message names both pieces, in English and Vietnamese | pack, route, dialog and import tests |
| MP09a1-B02 | Puzzle codes and stored ratings are otherwise unchanged: the v2 code goldens still pass | golden tests unchanged |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09a1-T01 | `duplicate-shape` is an error at `pieces[i]` with `params { piece, first }`, one per later copy, from `validatePack`, `parsePack` and `validatePackSliced`; a malformed board, missing `pieces` or an invalid piece return their issues, not a `TypeError` | pack tests |
| MP09a1-T02 | The codec throws `PuzzleCodeError('duplicate-shape', message, { params })` from decoding and encoding; the client passes code and params through; the dialog counts it as an input failure with the localized text | codec, client, dialog tests |
| MP09a1-T03 | Engine functions stay total on twins (their tests unchanged); `tests/fixtures/puzzlecode-v1.json` unchanged | diff; tests |
| MP09a1-T04 | Every test of the table "Existing tests …" is migrated as specified: the stress tests use the distinct-shape fixture with the stated expectations, the property test is twin-free and keeps its other coverage thresholds at 10 of 150; no other test changed | diff; tests |
| MP09a1-T05 | `docs/design-detail.md`, `docs/design-brief.md` and both user guides state the refusal (FP07) | review |
| MP09a1-T06 | Key parity of both apps' packs; the targeted run (without the slow sweeps), `npm run test:quick` and `npm run check` pass | command output |

## Test plan

### Required test cases

| File | Cases |
|---|---|
| `tests/pack.test.js` | the twin case (683-686) becomes a refusal: `duplicate-shape` at `pieces[1]` with `params: { piece: 'b', first: 'a' }`; the mirror pair is refused; three copies give two issues (`pieces[1]`, `pieces[2]`, both with `first: 'a'`); the split case rebuilt; the largest-board test rebuilt with the eight distinct pieces; `validatePackSliced` returns the same refusal; a malformed board, a missing `pieces` field and an invalid piece return their issues and no `TypeError` |
| `tests/puzzlecode.test.js` | `repeatedShapes` becomes a refusal case: encoding it throws `duplicate-shape` with `params: { piece: 'd2', first: 'd1' }`; the construction-helper pair decodes to a `duplicate-shape` error with `params: { piece: 'y', first: 'x' }`; every other change as in the table "Existing tests …"; the `pairPayload` cases for other refusals keep their expected error |
| `tests/puzzle-code-client.test.js` | a decode reply with `duplicate-shape` passes code and params through to the caller |
| `tests/puzzle-code-dialog.test.js` | the localized text with both ids in English and Vietnamese; counted as an input failure |
| `tests/player-puzzle-code-route.test.js`, `tests/player-load.test.js` | a `#p=` code and a `#pack=` link with twins are refused with the message; nothing is opened |
| `tests/generator-import.test.js` | importing a twin code imports nothing and the dialog shows the reason |
| i18n tests | key parity passes with the new keys |

### Exact commands

The targeted run skips the `slow:` sweeps of `tests/puzzlecode.test.js` (1472, 1492, 1645, 1693; FP06); they run in
MP09d2's gate GA-P2 (`npm test`).

```powershell
node --test --test-skip-pattern=slow tests\pack.test.js tests\puzzlecode.test.js tests\puzzle-code-client.test.js tests\puzzle-code-dialog.test.js tests\player-puzzle-code-route.test.js tests\player-load.test.js tests\generator-import.test.js tests\player-i18n.test.js tests\generator-i18n.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the changed tests with the reason for each changed expectation.
- Handoff to MP09a2: the `duplicate-shape` code and `Issue.params` (the saved-set refusal reads them). To MP09b and
  MP09d1: `fail(ctx, code, path, message, params)`. To MP09e (GC-P2): the browser check to add in
  `tests/browser/puzzle-code-acceptance.js` (a twin code is refused with the message, in the real Player). To MP17:
  the release-note sentence.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted and committed (`difficulty-v3 MP09a1: Two pieces of the same shape refused in packs, links and puzzle codes`) |
| Start | 2026-11-12 19:01 (+07:00) |
| End | 2026-11-12 19:13 developer; 19:15 orchestrator review and commit |
| Duration | 12 min developer (722 s); about 2 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 98 model calls; 17,845,655 input tokens (17,563,128 cache reads); 80,675 output tokens |
| AI credits | about 327 (developer) |
| Verification | Developer: the task's targeted `node --test --test-skip-pattern=slow` over nine files 209/209 (7.7 s); `pack.test.js` 36 and `puzzlecode.test.js` 52 alone; `npm run test:quick` 1210/1210 (21.2 s); `npm run check` OK. Orchestrator re-run: targeted 209/209, `test:quick` 1210/1210, `check` OK. `npm test` not run (the slow sweeps run in MP09d2's GA-P2) |
| Acceptance | MP09a1-B01, B02 and T01-T06 met. Diff reviewed: `checkDistinctShapes` in the pack reader makes a repeated free shape an error `duplicate-shape` at `pieces[i]` with `params {piece, first}` (one per later copy; the old warning is removed), run only when the pieces were read, so malformed input keeps its own issues; `fail` takes optional `params`; `PuzzleCodeError('duplicate-shape')` from decoder and encoder; client passes code and params; the dialog counts it as an input failure and localizes `{piece}`/`{first}`; the Player's `messageForIssues` maps it to `msg.duplicateShape`; EN and VI keys in both apps; the v1 code goldens and the twin tests of keys, placements, tiling, enumerate and carve untouched; the 11 FP02 migrations made |
| Issues & resolutions | (1) `describeProblem` returned empty params for every code except `bad-char`; it now passes `{piece, first}` with `?` as fallback. (2) `#pack=` is no longer a Player route; the "pack link" case is covered through `openSample`/`readPack` in `player-load.test.js`. (3) The route, client and import tests use a literal twin code (mirror-L pair on a 4x2 board) written by the frozen payload writer. (4) Design §7.9 ("are to refuse such sets in a later step") and §11 item 11 updated, outside the task's documentation slot, because they became inaccurate. (5) Three extra tests: encoder/decoder refusal, engine-level client, Vietnamese `messageForIssues` |
| Handoff | MP09a2: `readSavedSet` in `generator/state.js` (about line 895) calls `validatePack(dto.setPack)` and returns null when invalid, so a saved twin set is dropped silently until MP09a2 adds the notice; detect it with `issues.some((i) => i.code === 'duplicate-shape')` and read `issue.params`. MP09b and MP09d1: `fail(ctx, code, path, message, params)` stores `params` only when given. MP09e (GC-P2): the browser check of a refused twin code in `tests/browser/puzzle-code-acceptance.js`. MP17: release-note sentence |

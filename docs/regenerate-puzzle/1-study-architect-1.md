# Re-creating one printed puzzle exactly — study by architect-1

> Phase 1 (independent study), 2026-10-25. Research only: no repository file other than this report was changed.
> Prototypes, scripts and generated packs are in the session scratch folder `files/architect-1/` (Appendix A).
> **Measured** marks numbers produced by running that code on real packs; **estimate** marks numbers derived by
> calculation. Code is cited as `path:line` at commit `80af86c`.

## 0. Summary

- **Verdict.** The printout is enough to *play* the puzzle on paper, but not to re-create it in the apps.
  - **Board: not exact.** It is printed only as a picture. The grid size, empty margins, the grid orientation (a 45°
    view is dropped, and the whole printout may be turned a quarter to save paper) and the display angle are lost.
  - **Piece set: partly.** Shapes, letters and colours are visible. The set can be made again in the Generator from
    the printed set seed and level only if the user also redraws the board in its exact grid orientation and guesses
    the uniqueness switch, which are not printed, and only while the generation algorithm stays the same.
  - **Puzzle: no.** The printed puzzle seed is a batch seed whose result depends on the session history and on a
    session-only calibration puzzle (experiments E5, E6); no app accepts a puzzle seed or clue placements as input.
- **Recommendation: a printed puzzle code** (direct encoding, Option B). A bit-packed, versioned, checksummed
  description of the board, the piece shapes (ids, letters and colours follow from the canonical piece order), the
  pre-placed pieces and the display angle, plus the rating and the puzzle number, optionally the solution. It is
  written in Crockford base32 (the alphabet of the app's seeds) in groups of 4. No seed, no regeneration, no
  dependency on the generation algorithm.
- **Measured length** in characters, version character and 20-bit check included: 36 for a 6×10 puzzle, 39–40 for the
  Heart, 38 for the Ring, 40–41 for the Cross, 60 for 12×12 Nightmare, 97 for 18×20 Hell 2, 108–165 for Hell 3 on
  576–676 cells, and at worst 184–210 for Hard puzzles on 484–576 cells (245 on a 676-cell board, CLI only). Today's
  share code of the same single puzzle needs 585–3,422 characters. General-purpose compression makes the code longer.
- **URL.** `…/player/#p=<code>` (81–255 characters up to 576 cells). The Player gets an **Open code** form; the code is
  printed on the first sheet under the heading.

## 1. Current state

### 1.1 What the sheets contain

| Sheet | When | Contents | Evidence |
|---|---|---|---|
| First sheet (puzzle) | Always | Title; up to two detail lines; preview of the board with the pre-placed pieces (hatching, padlock); legend; "Pieces to place (n)" with those pieces; 50 mm bar; "Cells: x mm" and the scale note | `core/browser/print-sheet.js:72`, `:146`, `:170` |
| Solution | Generator only, optional | Heading "Puzzle #n · Solution", the same detail lines, the board with every piece of the stored solution | `core/browser/print-sheet.js` `solutionPage`; `docs/design-detail.md:2217` |
| Piece set | Optional (default on) | Every piece in the unlocked style: colour, letter, fill pattern above 20 pieces; caption "Puzzle #n · Pieces, sheet i of n" | `core/browser/print-layout.js` `layoutPieceSheets`; `print-sheet.js` `piecesPage` |
| Board | Optional (default on) | Playable cells with grid and cut line, holes grey with a cross, parts with join marks; caption | `print-layout.js` `layoutBoard`; `print-sheet.js` `boardPage` |

**Heading and details** (`core/browser/print-dialog.js:39`, texts `core/browser/print-texts.js:37`–`:41`):

| Part | Generator | Player |
|---|---|---|
| Title | "Puzzle #n", the list position (`generator/ui/puzzle-panel.js:185`) | `puzzleDisplayName(title, index)`, e.g. "Hard #3" or "Easy #1" (`player/app.js:372`, `player/puzzle-title.js:26`) |
| Line 1 | "**Level**: score S, seed X" with X = the puzzle's batch seed, a random uint32 (`puzzle-panel.js:177`, `generator/jobs.js:328`, `core/engine/rng.js:183`) | the same with `puzzle.seed` (`player/app.js:375`): a uint32 for Generator packs, `setSeed#k` for CLI packs, absent in the sample |
| Line 2 | "Set: **Level**, seed" from `state.setSeed` and `calibrationFor.levelId` (`puzzle-panel.js:179`, `:189`) | from `pack.generation.setSeed` / `setLevel` (`player/app.js:365`–`:366`) |
| Unknown parts | Left out: no rating gives "Seed: X"; no seed gives "**Level**: score S"; no set seed drops line 2; no set level gives "Set: seed" | same |

**How the picture is drawn.**

- The display angle is cut to a multiple of 90° (`core/browser/print-layout.js:55`): the Heart (45°) is printed upright
  in its grid.
- With the board included, the whole printout is turned one more quarter when that saves parts or gives bigger cells
  (`print-layout.js:492`–`:509`). Only the dialog says so; no sheet does.
- The board is cropped to the bounding box of its playable cells (`print-layout.js:122`), and exterior blocked cells
  are not drawn, so empty margin rows and columns disappear.
- Letters are drawn only where a cell is at least 2.5 mm (`print-sheet.js:34`). The preview uses 60 % of the largest
  scale (`print-layout.js:35`) and shrinks further on a crowded page, so on large boards its letters can vanish.

### 1.2 What is not on paper

The board key or its size W × H, empty margins, the grid orientation, the display angle, the uniqueness switch, the
algorithm, policy, RNG and app versions, the batch index and the session history, the uniqueness result, the puzzle id
or fingerprint, and any machine-readable form of the shapes or the clue poses.

### 1.3 The digital carriers today

- **Generator address** (`generator/address.js:18`, `docs/design-detail.md:1978`):
  `?step&preset&angle&cells=<boardKey>&level&seed&unique`. It names a board and a set request, never a puzzle. The board
  key stores every cell, 6 per character (`core/engine/board.js:108`): 102 characters for 24 × 24.
- **Player share code** `#pack=1z.<base64url(deflate-raw(JSON))>&i=k` (`core/engine/sharecode.js:18`, `:267`;
  `docs/design-detail.md:1730`): the whole pack. Measured for a pack reduced to one puzzle: 585–1,093 characters at 60
  cells (without or with solutions) and up to 3,422 at 676 cells (Table 6.2).
- **Pack JSON** (`docs/design-detail.md:565`, `core/engine/pack.js:1237`): per puzzle `id`, `title`, `seed`, `clues`,
  `solution`, `rating`, `certificate`; per pack the board rows, `presentation.rotation`, `pieces` (`id`, `label`,
  `color`, `cells`), `witness` and `generation` (app, algo, policy, rng, seedScheme, setSeed, setLevel, carving,
  macroRegion, batchSeed, batchLevel, batchIndex, uniqueness, createdAt; `generator/state.js:1221`–`:1249`).

## 2. Sufficiency analysis

### 2.1 Experiments

All run in Node on the engine of the repository (scratch `exp-repro.mjs`, `set-time.mjs`; packs made with
`tools/generate.mjs` into the scratch folder).

| # | Experiment | Result (measured) |
|---|---|---|
| E1 | Same board, level, seed and uniqueness → `firstSetAttempt` | The same shapes in the same order, hence the same ids, letters and colours, for 8 of 8 boards (60–676 cells), ≤ 1.2 s single-threaded |
| E2 | 6×10 with an extra blocked column (right or left) or row (below) | Same shapes: empty margins do not change the set |
| E3 | 6×10 turned a quarter (10 rows × 6 columns) | A different set |
| E4 | Uniqueness `require` instead of `any` | The same set here (attempt 0 succeeds in both modes); in general the successful attempt depends on the mode, because its calibration puzzle must pass under it |
| E5 | Batch seed `2718281828` on a fresh set, with and without the session's calibration puzzle | Different puzzles. With the calibration puzzle, slot 1 *is* the calibration puzzle for any batch seed (`1234567` gives the same) |
| E6 | The same batch seed with the first result in the history | A different puzzle (score 19 → 18) |
| E7 | Rating recomputed from board, shapes and clues | 19 of 19 equal to the stored score, level and saturation |

### 2.2 Board

- **From the drawing:** the playable shape and its holes can be counted from the preview or the board sheets, but not
  its grid. The print may be turned by 90°, 180° or 270° (display angle snapped, plus the paper-saving quarter turn),
  and nothing tells the reader which way. E3 shows that a turned board makes a different set from the same seed.
- **Margins:** cropped. They do not change the set (E2), but they are part of the puzzle's identity: the progress
  fingerprint and the puzzle id hash the exact rows (`core/engine/keys.js:462`, `:478`).
- **Display angle:** not printed (the Heart's 45° cannot be read back).
- **Verdict: not exact.** No machine-readable board is printed.

### 2.3 Piece set

- **Shapes:** readable on the piece-set sheets or the preview.
- **Identity:** a generated set is fully canonical. `finalizeSet` sorts the pieces by size (largest first) and then by
  canonical shape, stores each in its canonical orientation, and names and colours them by position
  (`core/engine/carve.js:579`, `:605`, `:612`; `core/engine/palette.js:48`, `:62`). Letters and colours therefore
  follow from the shapes, and the printed letters match.
- **Regeneration path:** the set seed and level are printed. The Generator re-creates the set from seed, board, level
  and uniqueness (`docs/design-detail.md:1673`; E1), but the board must be redrawn cell by cell in the right
  orientation (E3) and the uniqueness switch is not printed (E4). Seeds reproduce only within one algorithm id
  (`docs/design-detail.md:697`), and the sheet does not say which one. The sample pack has no set level (its line reads
  "Set: fixture-set-0") and hand-made packs have no seed at all.
- **Verdict: partly.** Possible by hand with effort and luck, impossible for packs without a seed, and fragile across
  versions.

### 2.4 Puzzle

- **Pre-placed pieces** are visible in the preview, so the puzzle can be played on paper. No app accepts placements:
  the Generator has no import (`docs/design-detail.md:1777`) and no clue editor.
- **Puzzle seed:** in the Generator a fresh random uint32 per New puzzle press (`generator/jobs.js:328`). The batch also
  depends on the target level, the uniqueness mode, the session history of the set (`jobs.js:359`–`:360`) and on
  whether the session-only calibration puzzle can be reused (`jobs.js:333`). E5 and E6 show that the seed alone
  does not name a puzzle, as `docs/design-detail.md:1674`–`:1676` also states. No UI accepts a puzzle seed.
- **Workers, timing:** the fold is deterministic for any worker count (§8.2), but a slow device can stop at the time
  limit before a slot is filled; reproduction could then fail but never differ.
- **Rating:** printed (level and score) and recomputable (E7). **Solution:** printed only by the Generator, on an
  optional sheet. **Title:** positional.
- **Verdict: not re-creatable.** The brief and the README promise otherwise ("so both can be made again",
  `docs/design-brief.md:78`, `README.md:208`).

### 2.5 Verdict

| Item | Re-creatable from the printout today? | Path |
|---|---|---|
| Board cells and holes | By hand, up to an unknown quarter turn | Redraw in the editor |
| Board grid, margins, display angle | No | — |
| Piece shapes | By hand; via the Generator only with unprinted inputs and the same algorithm | Seed + level + board + uniqueness |
| Piece letters, colours, order | Yes for generated sets (they follow from the shapes) | Canonical order |
| Pre-placed pieces | No (visible, but no way to enter them) | — |
| Pieces to place | Follows from the above | — |
| Rating | Printed; recomputable | `rate()` |
| Solution | Generator's optional sheet only | — |

## 3. What "exact" must mean

A puzzle is re-created exactly when the decoded one-puzzle pack has the same board rows, display angle, pieces (id,
label, colour, cells, order) and pre-placed pieces (canonical poses) as the original. Then its progress fingerprint
equals the original's, so saved progress follows the puzzle between a `#pack=` link and the code (measured: 34 of 34
fingerprints equal; 33 of 33 generated puzzle ids equal; the hand-made fixture keeps its own id `example-1` in packs).

| Item | Needed | Why |
|---|---|---|
| Grid W × H including empty margins, playable mask (holes, exterior) | Essential | Identity (fingerprint, puzzle id), board picture |
| Display angle (0–315) | Essential, cheap (3 bits) | The screen must look like the original (Heart at 45°) |
| Piece shapes in their stored orientation | Essential | Poses refer to them; the tray and the cut-outs show them |
| Piece order, ids, letters, colours | Essential | Letters and colours must match the cut-outs; ids enter the fingerprint. Free for generated sets |
| Pre-placed pieces (piece and pose) | Essential | They are the puzzle |
| Pieces to place | Derived | Every piece that is not pre-placed |
| Rating (score, level, saturation) | Recommended, cheap | Printed on the sheet; a claim like in packs; recomputing costs up to seconds on large boards |
| Puzzle number (title "#n") | Recommended, cheap | The re-created puzzle keeps its name |
| Solution | Optional | Not part of the puzzle's identity (any valid completion wins); speeds up verification, helps hints and the solution sheet; expensive on boards with many pieces |
| Uniqueness result | Leave out | Not settled when printing (lazy check), so the code would change after printing |
| Seeds, generation metadata, other puzzles of the pack | Leave out | They do not re-create the puzzle; only one puzzle is wanted |

## 4. Design options

### 4.1 Option A — regeneration from seeds and parameters

To regenerate a puzzle, the sheet would need the board key, set seed, set level, uniqueness, algorithm and policy
ids, batch seed, target level, the calibration flag **and the set's history** (up to 1,000 keys). That is not
printable. Making each press reproducible would need a new algorithm (`gen-v3`): today `selectClues` excludes the
seen clue keys, so even a single candidate depends on the history (`core/engine/generate.js:175`). Every printed
sheet would still stop working at the next change of any weight, budget or band (§5.4), and decoding would run the
generator for seconds. **Rejected.**

### 4.2 Option B — direct encoding (puzzle code)

Encode the puzzle content itself, as compactly as the structure allows (Section 5). It is self-contained, does not
depend on the generator or its version, works for every valid pack (the sample, hand-made packs, custom letters and
colours) and decodes in milliseconds. Its length grows with the information in the shapes: about 1.5 bits per cell
for large pieces. Shapes of up to 10 cells cost much less, because they are coded as a choice from the known list of
polyominoes.

### 4.3 Option C — hybrid: the set from its seed, the clues directly

Print the board, set seed, level, uniqueness and algorithm id, and encode only the clue placements. **Estimate:** 31–54
characters for every board measured (Table 6.2), much shorter than Option B for Hard puzzles on large boards (44
instead of 210 at 576 cells). Against it:

- the code is tied to one algorithm version, as in Option A, so old sheets break at the next calibration change;
- the Player would have to run set generation to open a code (E1: up to 1.2 s in Node, several seconds in a browser);
- it does not work for packs without a seed, and a typed seed may be long Unicode text;
- on boards up to 75 cells it saves at most 5 characters (31–42 against 36–41); the gain starts around 144 cells
  (34 against 60).

It could become a second code type later (another version character). **Not recommended for v1.**

### 4.4 General-purpose compression

| Approach (measured) | 6×10 | 24×24 Hell 3 | 24×24 Hard |
|---|---:|---:|---:|
| Today's `1z.` share code of the single puzzle | 1,043 | 3,222 | 1,874 |
| Minimal JSON (rows, angle, cells, clues) + deflate-raw + base64url | 172 | 519 | 652 |
| Bit-packed puzzle code, base32 (Option B) | 36 | 136 | 210 |
| Deflate-raw applied to the bit-packed bytes | +2 bytes | +5 bytes | +5 bytes |

Deflate cannot help a payload of 20–130 bytes whose bits are already close to random: its block header and Huffman
tables add 2–5 bytes in every case measured (34 of 34). The saving comes from structure: canonical order, choices
among known shapes, and positions counted only among legal placements. **The user's idea of storing only blocked
cells** is right, and Option B generalises it: the board is coded by the shortest of five forms (full rectangle,
blocked list, runs, blocked rectangles, bitmap). The board is cheap, though (14 bits for a rectangle, 28–36 for the
Heart or Ring, 93–97 for an irregular board with holes). The piece shapes are 30–85 % of the code, the more the
larger the board.

### 4.5 Comparison

| Criterion | A: seeds | B: puzzle code | C: hybrid |
|---|---|---|---|
| Length at 60–144 cells | n/a (not printable) | 36–60 | 31–42 (estimate) |
| Length at 576 cells | n/a | 108–210 | 37–45 (estimate) |
| Self-contained | No | Yes | No (needs the generator) |
| Survives algorithm changes | No | Yes | No |
| Works for every pack | No | Yes | Only for generated sets with seed and level |
| Decode cost | Seconds to minutes | < 60 ms (measured, tables built) | Seconds |
| Complexity | Very high (new algorithm) | Medium (one codec module) | Medium plus generator coupling |

**Recommendation: Option B.**

## 5. The puzzle code, version 1

### 5.1 Principles

- One code per puzzle content: the encoder makes no free choices, so the Generator and the Player print the same code
  for the same puzzle, and a re-created puzzle prints the code it came from.
- Every bounded choice is written in as few bits as possible: truncated binary for an index among n possibilities,
  Exp-Golomb (EG(k)) for unbounded counts, and the colex rank of a k-subset in ⌈log₂ C(n, k)⌉ bits.
- Fixed definitions only (canonical form, enumeration orders, the v1 palette) that are frozen with the version.

### 5.2 Field list

| # | Field | Bits | Notes |
|---|---|---|---|
| 1 | Version | 5 | The first character: `1` |
| 2 | Flags | 3 | Solution, rating, number present (the prototype used one; rating and number are counted in their columns below) |
| 3 | Width − 1, height − 1 | 6 + 6 | 1–64, every size a valid pack allows |
| 4 | Mask form | 2–3 | Truncated binary over 5 forms (5.3) |
| 5 | Mask | By form | — |
| 6 | Display angle | 3 | θ / 45 |
| 7 | K − 1 | EG(3) | Number of pieces |
| 8 | Identity flags | 3 | Canonical order; canonical cells; default ids, letters and colours |
| 9 | Sizes | EG(2), then EG(0) | In canonical order, the first size and then each decrease; otherwise every size |
| 10 | Shapes | 5.4 | Subset ranks for sizes ≤ 10, a breadth-first code above |
| 11 | Stored orientation | 3 per piece | Only without canonical cells |
| 12 | Custom identity | Strings + 24-bit colour | Only without default identity: id and label as length-prefixed UTF-8 |
| 13 | G (pre-placed count) | Truncated binary over K | 0 … K − 1 |
| 14 | Clue order flag | 1 | Whether the pack lists the clues in piece order |
| 15 | Clue pieces | ⌈log₂ C(K, G)⌉ | Colex rank of the set of piece indices |
| 16 | Clue order | Lehmer code | Only when not in piece order |
| 17 | Clue poses | One index each | Among the legal placements of that piece that miss the earlier clues (5.6) |
| 18 | Rating | EG(4) score + 1 | If flagged; difficulty-v2 only; the level follows from the score (`levelForScore`) |
| 19 | Number | EG(0) of n − 1 | If flagged; from the title "… #n", else the list position |
| 20 | Solution | One index per step | If flagged (5.7) |
| 21 | Padding | 0–4 zero bits | To a whole character |
| 22 | Check | 20 | CRC over fields 1–21 (5.8) |

### 5.3 Board

The encoder writes the shortest of: **full** (no bits), **blocked list** (count, then the gaps between blocked cell
indices in EG(k), k in 3 bits), **runs** (alternating playable and blocked run lengths in row-major order, EG(k), the
last run implied), **blocked rectangles** (greedy maximal rectangles: corner index, width and height, each truncated
to what still fits) and **bitmap** (W·H bits). Ties go to the earlier form. Measured: a rectangular board costs 14 bits
in total (W, H and form); Heart 30; Ring 28; Cross 66; the irregular 466- and 558-cell boards 93–97 (the blocked
rectangles win for every non-rectangular sample).

### 5.4 Piece shapes

- **Sizes ≤ 10:** the shape is its rank in the list of all free polyominoes of that size (with holes; 1, 1, 2, 5, 12,
  35, 108, 369, 1,285, 4,655), each in canonical form and sorted by the canonical comparison of
  `core/engine/geometry.js`. In canonical order the pieces of one size are distinct and ascending, so the group is
  written once as a subset rank: 30 heptominoes out of 108 cost about 90 bits instead of 30 × 7. The decoder builds the
  lists on first use: 450 ms for sizes up to 10 in Node (measured, naive code; 140 ms up to 9).
- **Sizes > 10:** breadth-first code. Start at the canonical form's first cell. For each cell taken from the queue,
  write one bit for each of its right, down, left and up neighbours that is not yet decided and not before the start
  in row-major order, and stop when n cells are found. Measured 1.47 bits per cell on 131 large pieces. An adaptive
  context model would save only 12 % (measured empirical entropy), not worth an arithmetic coder.
- Rejected after measurement: a bounding-box bitmap (the whole code 23–50 % longer) and a per-piece choice between the
  two codes (the selector bit costs more than it saves).
- "About 90 bits" for 30 heptominoes is an estimate (log₂ C(108, 30) ≈ 88.6).

### 5.5 Piece identity

Three flags cover the cases. All 33 generated puzzles measured (the sample included) set all three, so ids, letters
(`labelFor`), colours (`colorFor`), order and orientation cost nothing. The hand-made fixture has a non-canonical order
and orientation but default letters and colours: it pays 3 bits per piece for the orientation, and its sizes and
shapes are written one by one (42 characters; about 37 if it were canonical, an estimate). Custom ids, letters and
colours are written as text and 24-bit colours: a copy of that fixture with its own ids, letters (one of them `Ü`)
and colours round-trips exactly but needs about 152 characters with its solution (measured), so custom identities
work but are expensive.

### 5.6 Pre-placed pieces

Which pieces are pre-placed is one subset rank. Each pose is an index into the legal placements of that piece:
orientations in `distinctOrientations` order, then positions in row-major order, keeping only placements on playable
cells that miss the earlier clues. The decoded pose uses `canonicalT`, as packs store it. Measured: 0–3 bits per clue
fewer than "anchor cell + orientation".

### 5.7 Optional solution

The solution is a path through the exact-cover search: repeatedly take the first uncovered playable cell, list in a
fixed order every unused piece and orientation whose first cell fits there without overlap, and write the index of the
one the solution uses. Measured cost: 1–55 bits (0–11 characters) on boards up to 144 cells and for Hard and Master
puzzles on large boards (few, large pieces), but 229–481 bits (+45 to +96 characters) on Hell boards with 50–84
pieces.

### 5.8 Check

- A 20-bit CRC (4 characters) over the padded payload. It detects every single wrong character and every swap of
  neighbours (bursts of at most 20 bits).
- **Measured** with the polynomial 0x6C1BD: 300 of 300 substitutions, all adjacent transpositions, 300 of 300
  deletions and 300 of 300 insertions detected, on a 34- and a 207-character code.
- Trying every single-character change of a damaged code found exactly one valid correction in 60 of 60 cases on both
  codes, so the UI can say where the typo is.
- The polynomial matters: the first placeholder (0x8359D, period 210 bits) also detected every error, but its
  corrections were unique in none of 60 cases with the CRC alone (48 of 60 with the decoder's structure checks added).
  The implementation must pick a polynomial whose period exceeds the longest payload and test all
  1- and 2-character errors at the maximum length.

### 5.9 Text

- **Alphabet:** Crockford base32 `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, the alphabet of the seeds (`core/engine/rng.js:11`):
  no I, L, O or U, case-insensitive, usable in URLs, typed without Shift. The decoder upper-cases, drops spaces, hyphens
  and line breaks, reads O as 0 and I or L as 1, and rejects anything else with its position.
- base64url would be 17 % shorter (30 instead of 36 characters for 6×10, 175 instead of 210 at 576 cells) but is
  case-sensitive and mixes `l`, `I`, `1`, `O`, `0`, `-` and `_`: worse for typing.
- **Groups of 4** characters separated by a space on paper (a hyphen in text), as the seeds `XXXX-XXXX-XXXX`; 10 groups
  per line.

### 5.10 Versions and frozen definitions

The first character is the version. Version 1 freezes the bit layout, the five mask forms, the canonical comparison,
the polyomino order, the placement and cover orders, the default palette (`BASE_COLORS` and the `colorFor` formula)
and the rating model `difficulty-v2`. A later change to any of them needs a new version, and decoders keep every
older version. Golden test vectors pin this.

### 5.11 Decoder safety

Every count is bounded (W, H ≤ 64; K ≤ 128; sizes summing to the playable area; loops bounded by the cell count), the
CRC rejects nearly all random input before decoding, and the result passes `validatePack` like any incoming pack.

## 6. Measurements

### 6.1 Method

- Prototype encoder and decoder `pcode.mjs` (scratch), driven by `measure.mjs`.
- Inputs: `player/samples/sample-pack.json`, `tests/fixtures/hand-authored-pack.json`, and 30 puzzles in 16 packs made
  with `tools/generate.mjs` into the scratch folder: 6×10, Heart 10, Ring 8, Cross 9, 12×12, 18×20, Heart 24, the
  `bq-irregular-466` and `-558` boards (corners and holes, via recipes), 22×22, 24×24, 32×18 and 26×26 at levels from
  Easy to Hell 3, with up to 84 pieces and pieces of up to 35 cells.
- Code lengths include the version character, the rating, the number and the 20-bit check. Rating and number are
  added as exact bit counts of their fixed codes; every other field went through the prototype.

### 6.2 Code lengths in characters (measured)

| Puzzle | Board (cells) | Level | K | G | Code | With solution | As base64url | Lines | URL | Hybrid C (estimate) | Minimal JSON + deflate | `1z.` share code | `1z.` without solution |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Sample #1 | 10×6 (60) | Easy | 9 | 5 | 36 | 37 | 30 | 1 | 81 | n/a | 171 | 906 | 827 |
| Hand-made | 10×6 (60) | — | 10 | 2 | 42 | 46 | 35 | 2 | 87 | n/a | 186 | 662 | 585 |
| 6x10 #1 | 10×6 (60) | Hard | 9 | 3 | 36 | 37 | 30 | 1 | 81 | 31 | 172 | 1,043 | 943 |
| Heart #1 | Heart 10 (75) | Master | 14 | 3 | 39 | 44 | 32 | 1 | 84 | 35 | 190 | 1,187 | 1,033 |
| Ring #1 | Ring 8 (60) | Normal | 9 | 4 | 38 | 39 | 32 | 1 | 83 | 34 | 176 | 1,053 | 962 |
| Cross #1 | Cross 9 (45) | Easy | 8 | 4 | 41 | 41 | 34 | 2 | 86 | 42 | 180 | 1,013 | 927 |
| 12x12 #1 | 12×12 (144) | Nightmare | 19 | 3 | 60 | 71 | 50 | 2 | 105 | 34 | 235 | 1,419 | 1,207 |
| 18x20 #1 | 18×20 (360) | Hell 2 | 50 | 3 | 97 | 142 | 81 | 3 | 142 | 36 | 382 | 2,375 | 1,873 |
| Heart 24 #1 | Heart 24 (432) | Hell 2 | 58 | 3 | 119 | 177 | 99 | 3 | 164 | 40 | 443 | 2,653 | 2,054 |
| Irregular 466 #1 | 22×22 (466) | Hell 2 | 56 | 3 | 144 | 196 | 120 | 4 | 189 | 51 | 458 | 2,663 | 2,065 |
| Irregular 558 #1 | 24×24 (558) | Hell 3 | 76 | 3 | 140 | 218 | 117 | 4 | 185 | 53 | 522 | 3,218 | 2,423 |
| 22x22 Hard #1 | 22×22 (484) | Hard | 19 | 8 | 186 | 187 | 155 | 5 | 231 | 45 | 572 | 1,766 | 1,598 |
| 24x24 #1 | 24×24 (576) | Hell 3 | 76 | 3 | 136 | 212 | 113 | 4 | 181 | 37 | 519 | 3,222 | 2,414 |
| 24x24 Master #1 | 24×24 (576) | Master | 23 | 5 | 203 | 208 | 169 | 6 | 248 | 39 | 571 | 1,899 | 1,650 |
| 24x24 Hard #1 | 24×24 (576) | Hard | 20 | 8 | 210 | 211 | 175 | 6 | 255 | 44 | 652 | 1,874 | 1,699 |
| 32x18 #1 | 32×18 (576) | Hell 3 | 84 | 3 | 108 | 198 | 90 | 3 | 153 | 37 | 507 | 3,395 | 2,525 |
| 26x26 #1 | 26×26 (676) | Hell 3 | 83 | 3 | 165 | 261 | 137 | 5 | 210 | 37 | 527 | 3,422 | 2,538 |
| 26x26 Hard #1 | 26×26 (676) | Hard | 20 | 8 | 245 | 247 | 204 | 7 | 290 | 45 | 747 | 1,965 | 1,799 |

- *Lines:* 40 characters per printed line. *URL:* `https://tdat00.github.io/pentomino/player/#p=` plus the code.
- *Hybrid C:* assumes a random 12-character set seed (61 bits) plus level, uniqueness and the measured board and clue
  bits; n/a where the pack has no set level or no seed.
- The other puzzles of each pack differ by at most 2 characters from the row shown (all 34 rows are in the scratch
  `measure.json`).

### 6.3 Where the bits go (measured)

| Puzzle | Header | Board | Angle | Pieces | Clues | Rating + number | Check + padding | Total bits | Characters | Solution (optional) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 6x10 #1 | 6 | 14 | 3 | 91 | 32 | 11 | 23 | 180 | 36 | 7 |
| Heart #1 | 6 | 30 | 3 | 85 | 36 | 11 | 24 | 195 | 39 | 29 |
| Cross #1 | 6 | 66 | 3 | 62 | 35 | 9 | 24 | 205 | 41 | 3 |
| 12x12 #1 | 6 | 14 | 3 | 198 | 43 | 13 | 23 | 300 | 60 | 55 |
| 18x20 #1 | 6 | 14 | 3 | 371 | 52 | 15 | 24 | 485 | 97 | 229 |
| Irregular 466 #1 | 6 | 93 | 3 | 529 | 51 | 15 | 23 | 720 | 144 | 259 |
| 24x24 #1 | 6 | 14 | 3 | 560 | 59 | 15 | 23 | 680 | 136 | 382 |
| 24x24 Hard #1 | 6 | 14 | 3 | 895 | 97 | 11 | 24 | 1,050 | 210 | 6 |

The worst case is a Hard puzzle on the largest board: about 19 pieces of 25–35 cells cost about 40 bits each, close to
the information such shapes carry (free polyominoes grow about 4.06× per cell, about 2 bits per cell). No encoding
without seeds can make them much shorter.

### 6.4 Variants (bits without check, measured)

| Puzzle | Breadth-first shapes | Bitmap shapes | Best of both per piece | Subset ranks ≤ 10 (chosen) | Ranks only ≤ 8 | Clues as cell + orientation | Partition of the solved board (edges only) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 6x10 #1 | 172 | 215 | 181 | 146 | 150 | 150 | 104 + rest |
| 12x12 #1 | 304 | 430 | 323 | 264 | 274 | 266 | 264 + rest |
| 24x24 #1 | 969 | 1,454 | 1,045 | 642 | 728 | 643 | 1,104 + rest |
| 32x18 #1 | 997 | 1,450 | 1,081 | 503 | 571 | 506 | 1,102 + rest |
| 24x24 Hard #1 | 1,015 | 1,347 | 1,035 | 1,015 | 1,015 | 1,036 | 1,104 + rest |

Encoding the solved board as a partition (one bit per inner edge between playable cells) gives shapes and solution at
once. With header, board, angle and clue subset it would cost about (estimate from the measured edge counts): 138
bits for 6×10 (8 fewer than the chosen code, solution included), 302 for 12×12 (38 more), 1,149 for 24×24 Hard (134
more) and 1,149 for 32×18 Hell 3 (646 more). It wins only on the smallest boards and needs a known solution, so it is
not used.

### 6.5 Exactness

- 272 of 272 encodings (34 puzzles × 4 shape coders × with and without solution) decoded to identical board rows,
  angle, pieces (id, label, colour, cells, order), clues and, when included, solution (compared in piece order). The
  text form passed a round trip in lower case with hyphens inserted. The custom-identity copy of 5.5 passed too.
- All 34 decoded puzzles build a valid pack (`createPack` → `serializePack` → `parsePack`) with the same progress
  fingerprint as the original, and the generated ones with the same puzzle id. The slowest decode took 56 ms.

## 7. URL and entering a code

- **Address:** `player/#p=<code>`, without separators (the decoder also accepts hyphens and lower case). `p` excludes
  `pack` and `lib`; an `i` beside it is ignored, because a code holds one puzzle. `parseLocationHashResult`
  (`core/engine/sharecode.js:288`, keys at `:301`) and `readIncoming` (`core/browser/handoff.js:180`) learn the key;
  the decoded pack goes through the existing load path. The URL is 81–290 characters, far below the 4,000-character
  warning and the 16,000 limit.
- **Address after opening:** stays `#p=<code>` (normalised to upper case), so bookmarks and shares stay short. The
  Player must treat this source like `#pack=` and never rewrite it (`player/state.js:327`, `:349`).
- **Progress:** follows the puzzle, because the fingerprint is the same as through the original `#pack=` link.
- **Where to type:**
  - The start screen (`player/ui/start-view.js:13`) gets a field "Puzzle code" with **Open**.
  - The game panel gets an **Open code** button that opens the same form in a dialog.
  - The Generator, which has no import, links to it.
- **Validation as you type:** the code is shown back in groups with a character count; a wrong character (U, a symbol)
  is named with its position.
- **On Open:**
  - a failed check gives "This code has a typo. Check it against the sheet."; if exactly one single-character change
    fixes it, add "Group 7, character 2 is probably Z, not 2" and a button to use it;
  - an unknown version gives "This code needs a newer version of the Player.";
  - a valid code sets the address, so the hash-change load runs as for any link.
- **A pack already open:** a code replaces it like any followed link, and a failure never replaces the open game
  (`docs/design-detail.md` §11.12).
- **Generator links:** none needed: Play still opens the whole list as a pack.

## 8. On paper

- **Place:** a full-width band under the heading of the first sheet (and of the solution sheet), before the preview.
  Label "Puzzle code" in bold 3.5 mm, then the code in a monospace font (`ui-monospace, 'Cascadia Mono', Consolas,
  'DejaVu Sans Mono', monospace`) at about 4 mm, groups of 4 separated by a space, 10 groups per line, lines numbered
  when there are several. Under it, in small grey text: "To play it on screen, open the Player and enter the code."
- **Text keys:**
  - `print.sheet.code`: "Puzzle code" / "Mã đề";
  - `print.sheet.codeHint`: "To play it on screen, open the Player and enter the code." / "Để chơi trên màn hình,
    hãy mở trình chơi và nhập mã này."
- **Example** (prototype output, 6×10, without rating and number):

  ```text
  Puzzle code  128M 11VA AX56 244P 0S71 A5CW YTKG D2R7 KG
  ```

- **Space:** the heading ends at `PREVIEW_TOP` = 40 mm (`core/browser/print-layout.js:30`). The band adds about 5 mm
  per line plus 4 mm: +9 mm for one line (6×10, Heart, Ring), +14 mm for two (Cross, 12×12), +19–24 mm for 3–4 lines
  (Hell boards up to 576 cells), +34 mm for 6 lines (Hard at 576 cells). `layoutPreview` already shrinks the preview
  until it fits, so only `PREVIEW_TOP` moves (an estimate of the layout; not prototyped).
- **Seeds:** keep the set line, which still lets the Generator make more puzzles from the same set. Drop the puzzle
  seed from line 1 ("**Hard**: score 20"): it cannot re-create the puzzle (open question 4).
- **QR code:** optional, later: a QR of the URL fits version 5 (37 × 37 modules) for a 36-character code and version 12
  (65 × 65) for 255 characters, about 33 mm at 0.5 mm per module (from the QR capacity tables, byte mode, error
  correction M). It needs a QR encoder module (no dependencies today). The user asked for manual entry, so it is an
  extra, not a replacement.

## 9. Impact and plan

### 9.1 Files

| File | Change |
|---|---|
| `core/engine/puzzlecode.js` (new) | `encodePuzzleCode(pack, index, options)`, `decodePuzzleCode(text)` returning `Result<Pack>`, `normalizePuzzleCode`, `formatPuzzleCode`, correction suggestions; bit I/O, Crockford, CRC, subset ranks with `BigInt`, lazy polyomino tables, frozen v1 palette |
| `core/engine/sharecode.js` | Hash key `p`, exclusive with `pack` and `lib`; a player URL for codes |
| `core/browser/handoff.js` | `readIncoming` decodes `#p=` |
| `player/state.js`, `player/app.js` | Source "code": address kept, no `makePortable`; Open code action |
| `player/ui/start-view.js`, new `player/ui/code-dialog.js`, `player/player.css`, locales | Field, dialog, messages (EN, VI) |
| `core/browser/print-dialog.js`, `print-layout.js`, `print-sheet.js`, `print-texts.js` | `PrintJob.code`; band under the heading; `PREVIEW_TOP` per code lines; texts; puzzle seed dropped from line 1 if agreed |
| `generator/ui/puzzle-panel.js`, `player/app.js` | `printJob` adds the code (built from the visible pack) |

### 9.2 Compatibility

No pack schema change; existing `#pack=` and `#lib=` links, stored packs, progress records and generator state are
untouched. A code-opened puzzle is an ordinary one-puzzle pack with `generation: { app: "puzzle-code/1" }`, and its
progress record is shared with the original puzzle.

### 9.3 Documents

- `docs/design-detail.md`:
  - §4.2: the new module;
  - a new section on the puzzle code: bit layout, frozen definitions, check, text form;
  - §9.1, §9.4 and §11.12: `#p=` and Open code;
  - §11.15: the code band, and no more "so the puzzle can be made again" from seeds;
  - §13.2: the suites.
- `docs/design-brief.md`: "Print on paper" (line 78) and the Player section.
- `README.md`: Printing (line 208), opening a puzzle (line 162), privacy (line 226).

### 9.4 Tests

- **Round trips:** every fixture, the sample and recipe-made packs give identical rows, angle, pieces, clues and
  solution, and the same fingerprint.
- **Golden codes:** fixed strings pin version 1.
- **Board forms:** each of the five forms.
- **Pieces:** custom identity (ids, letters, colours), non-canonical order and orientation, K = 1, G = 0, pieces
  larger than 10 cells, a 64 × 64 board, 128 pieces.
- **Determinism:** the same pack gives the same code from both apps.
- **Errors:**
  - every single substitution and adjacent swap of the golden codes is detected, and the suggestion is unique;
  - O, I and L are mapped;
  - a bad character reports its position;
  - unknown versions, truncation and trailing bits are rejected;
  - a fuzz run of random strings stays bounded in time.
- **Slow suite:** the polyomino counts 1, 1, 2, 5, 12, 35, 108, 369, 1,285, 4,655.
- **Hash and loading:** `#p=` parsing and exclusivity; `readIncoming` success and failures; Player state keeps the
  address.
- **Printing:** `print-layout` places the band and moves `PREVIEW_TOP`; `print-details` covers the lines;
  `tests/browser/print.html` shows the code.
- **Texts:** i18n key checks for the new keys.

### 9.5 Task outline

1. Codec module with golden vectors and tests (largest task).
2. `#p=` parsing and loading, Player source handling.
3. Open code form and dialog with messages and suggestions (EN, VI).
4. Code band on the first and solution sheets; the details line.
5. Documents and README; browser acceptance check (print a puzzle, type its code, compare).

### 9.6 Risks

- **The format is a promise:** printed codes must open for years. Freeze v1 with golden vectors; keep old decoders.
- **Long codes for Hard puzzles on large boards** (184–210 characters at 484–576 cells). The check and the
  suggestions catch typos; a QR code or Option C can follow if users ask.
- **Polyomino tables** cost about 0.45 s once (sizes up to 10). Build them lazily, only for the sizes present, or in a
  worker.
- **Look-alike characters** in some fonts (5/S, 2/Z, 8/B, 6/G): use a monospace font and groups; the check catches the
  rest.
- **The rating in a code is a claim**, as in packs. A future rating model needs a new version or a model field.

## 10. Open questions for the user

| # | Question | Recommended default |
|---|---|---|
| 1 | Should the printed code include the solution? (+1–11 characters up to 144 cells, +45–96 on Hell boards) | No on the first sheet; on the optional solution sheet, print a second code that includes it |
| 2 | Include the rating, so the re-created puzzle shows the same level and score without recomputing? | Yes (+2–3 characters) |
| 3 | Include the puzzle number, so the title stays "… #n"? | Yes (about 1 character) |
| 4 | Keep printing the puzzle seed? It cannot re-create the puzzle | Drop it; keep the set line (it still makes more puzzles from the same set) |
| 5 | Where can a code be entered? | Player only: start screen and an Open code button; the Generator links to it. No Generator import |
| 6 | Address key | `#p=` |
| 7 | Alphabet and grouping | Crockford base32 in groups of 4, as the seeds |
| 8 | QR code on the sheet | Not now; maybe later as an extra |
| 9 | Show the code in the apps too (copy button in the Player's game panel and the Generator's main panel)? | Yes, small and secondary; the paper and the address carry it anyway |
| 10 | Offer the shorter seed-based code (Option C) for large boards? | No; reconsider only if users complain about long codes |

## Appendix A. Scratch files

In `C:\Users\ledat\.copilot\session-state\bd310130-fd20-420b-8d77-6abb52737794\files\architect-1\`:

| File | Purpose |
|---|---|
| `gen\*.json`, `gen\recipe-irr*.json` | Packs made with `node tools/generate.mjs … --output <scratch>` (seeds `a1-…`), recipes for the irregular boards |
| `pcode.mjs` | Prototype encoder and decoder (all variants) |
| `measure.mjs`, `measure.json`, `summary.mjs`, `breakdown.mjs` | Round trips and the tables of Section 6 |
| `exp-repro.mjs`, `set-time.mjs` | Experiments E1–E7 |
| `check-pack.mjs` | Decoded packs: validity, ids, fingerprints, decode time |
| `custom-identity.mjs` | Round trip with custom ids, letters and colours |
| `typo-test.mjs`, `crc-poly.mjs` | Error detection and correction; polynomial comparison |
| `ctx-entropy.mjs`, `enum-time.mjs` | Context-model estimate; polyomino table timing |

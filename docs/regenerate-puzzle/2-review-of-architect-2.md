# Review of architect-2's study — by architect-1

> Phase 2 (cross-review), 2026-10-25. I read `1-study-architect-2.md` and ran its scratch prototype read-only from my
> own scratch folder (`files/architect-1/`, Appendix A). **Measured** numbers come from running both prototypes on the
> same puzzles; **estimate** marks calculations. Neither Phase 1 file was edited.

## 0. Summary verdict

- architect-2's study is sound on the *problem*. Its analysis of the printout, the URLs, the pack and the
  history/calibration dependency agrees with mine. It adds good evidence: the 0°/45° and padded-border print
  collisions, a uniqueness counterexample, a 1/4-worker replay, and the validator rule that a `difficulty-v2` rating
  needs all its metrics. It found two real flaws in my Phase 1 design: that rating rule, and the missing handling of
  repeated shapes.
- For generated puzzles its core *code* is 1.4–2.3 times as long as mine, for the same exactness. On the same puzzles,
  its core code is 50 symbols for 6×10 where mine is 32, and 253 where mine is 108 on 32×18 Hell 3 (measured, both
  prototypes).
  - Most of the gap is in the coding of piece shapes, which is not a design choice: 51 of 87 extra bits on 6×10, and
    86 % and 94 % of the gap on the two 576-cell puzzles broken down (24×24 Hell 1, 32×18 Hell 3).
  - The rest comes from choices that I would not keep: `P1.` plus a codec byte and CRC-32C, and byte alignment.
  - Its *default* code is longer still (95 symbols for 6×10, 402–451 at 576 cells), because its "default profile"
    adds the full rating metrics, the title as text and the solution.
- On the default contents, new evidence settles the solution question differently from both studies. Without a
  stored solution, the Player's existing check found a solution within 0–32 s on three puzzles. On four Hell boards
  it used up its whole budget after 3.5–18.5 minutes in Node and ended "not verified" (measured, 3.3). The solution
  should therefore travel with the puzzle, but nobody should have to type it.
- With the QR code now required, the clean answer is one code with an optional tail. The typed code is the core; the
  QR and the URL carry the same code followed by a solution tail.
- No finding is a blocker.
- Both studies preserve arbitrary ids, letters, colours, order and orientation exactly. Both cover every valid pack,
  not only Generator output. The remaining differences are encoding details, settled in Section 3.

## 1. Method

- Ran architect-2's `codec-prototype.mjs` (imported read-only) and my `pcode.mjs` on the **same puzzles**: all 15 packs
  of its corpus (including its controls), plus the sample and the hand-made fixture. My decoder was exact on every
  puzzle of that corpus (Table 3.1, last column).
- Field-by-field bit counts on a common puzzle (`breakdown-a2.mjs`). I also reproduced its 128 shape bits on that
  puzzle from its documented grammar alone (`a2-shape-cost.mjs`), so the per-piece explanation in 3.2 is exact.
- Checked the Player's existing no-solution verification (`solveFirst` with `BUDGETS.verifyRows` = 2,000,000) on
  large puzzles (`verify-one.mjs`). Re-rated the same puzzles with `rate()` and compared the full claims
  (`verify-rate.mjs`, `rate-time.mjs`).
- Measured QR versions with a reference encoder and decoded every symbol with an independent decoder (npm `qrcode`
  and `jsqr`, installed in my scratch folder only, `qr-measure.mjs`).
- Checked its source citations where they carry an argument.

## 2. Findings

| ID | Severity | Claim in architect-2's study | Evidence | Recommendation |
|---|---|---|---|---|
| R1-01 | Major | Its P1 grammar is a compact direct code (§6) | On recipe-w1 #1 its core payload is 190 bits against 135 in mine (both without prefix, version and check). Its shapes alone cost 128 bits against 77 (sizes and shapes), and 1,117 against 439 on 32×18 Hell 3 and 1,289 against 912 on 24×24 Hell 1 (my figures there include K and three flags). Causes: no use of the canonical order (sizes not delta-coded, no subset ranks); a catalogue only up to 8 cells, so the 10-, 10- and 9-cell pieces cost 71 bits by frontier or bitmap against about 34 by ranks; a 2-bit mode on every piece and a 3-bit size on every catalogue piece (36 bits on this puzzle); fixed 7-bit K (Table 3.2) | Adopt the sorted-order coding of my Phase 1 (subset ranks up to 10 cells, breadth-first with known size above), plus a repeated-shape flag (3.1) in place of its back-reference mode |
| R1-02 | Major | Default profile "solution + display", 95–453 symbols (§4.2, §7.3) | Of the 95 symbols on 6×10: the full rating claim costs 130 bits (26 symbols; `H` alone is a 65-bit float) and the title text "Hard #1" costs 67 bits (13 symbols). The metrics are never read outside the engine (no use in `player/`, `generator/`, `core/browser/`). Generated titles are always "level label #n" (`core/browser/generation-client.js:854`) | Carry score and saturation (about 2 symbols) and the title as a pattern (level from the score, number; about 1 symbol); custom titles as text only when present. Rating validation: see 3.3 |
| R1-03 | Major | The stored solution belongs in the default printed code (§4.2) | Right that the solution matters. Without it, the Player's check on 18×20 Hell 2, Heart 24, 24×24 Hell 3 and 24×24 Hell 1 used up its 2,000,000-row budget after 220–1,108 s in Node and ended "not verified"; a browser needs about four times as long (§8.7 planning rule, estimate). But typing it costs +6 symbols on 6×10 and +112 to +131 on the three Hell 3 boards of 558–576 cells in its format (+78 to +94 in mine) | Solution in a **tail** that the QR and URL carry and nobody types (3.3, Section 4) |
| R1-04 | Minor | `P1.` prefix, codec byte, CRC-32C (§6.1) | Envelope: 3 prefix symbols + 8 + 32 bits + byte padding, about 12 symbols, against 1 + 4 in mine. Both detect every single-symbol error and every swap of neighbours: those are error bursts of at most 10 bits, and any CRC of degree ≥ 10 with a constant term detects them | A 1-symbol version and a 20-bit CRC whose polynomial is chosen by an exhaustive test (3.5) |
| R1-05 | Minor | Keep raw/DEFLATE choice (§6.9) | It reports that DEFLATE lost on every generated core and core+solution payload, and so do I (34 of 34). It wins only on the 128-identical-piece control (232 → 83 symbols), where a repeated-shape flag does better (about 55, estimate, 3.1). DEFLATE adds `CompressionStream` dependence, a decompression-bomb limit and 8 bits on every code | No DEFLATE in v1; a repeated-shape flag |
| R1-06 | Minor | "The Generator's current default quantity is five … the printed seed is not even a unique identifier within an ordinary batch" (§3.3) | The page sets `quantity: PUZZLES_PER_PRESS` = 1 (`generator/app.js:28`, `:99`); `DEFAULT_QUANTITY` = 5 (`generator/state.js:104`) is only the store's default and nothing else sets it. Each New puzzle press makes one puzzle with its own seed (`docs/design-detail.md:1194`) | Correct the sentence. The conclusion (the seed does not name a puzzle) still holds by the history and calibration evidence |
| R1-07 | Minor | "Do not … repair a checksum mismatch"; no correction (§8.2) | Agreed for silent repair. A **suggestion** is different: with a good 20-bit polynomial, exactly one single-symbol change passed the check in 60 of 60 damaged codes of 34 and 207 symbols (measured, Phase 1). The user compares it with the paper and confirms | Offer "Group 7, character 2: Z instead of 2?" with a confirm button; never open a guess by itself |
| R1-08 | Minor | A frozen per-code "presentation profile", possibly a `meta` marker per pack (§4.1, §10.1, §10.2) | Display colours, label marks and patterns are rendering rules for every pack (`core/browser/piece-look.js:29`, `core/engine/palette.js`), not content of one code. A per-pack marker would make two rendering paths | Freeze only what the decoder derives (`labelFor`, `colorFor` of v1) inside the codec. Write in `design-detail.md` that display colours, marks and patterns are part of the print contract and change only deliberately |
| R1-09 | Major (correct; corrects my Phase 1) | A v2 rating needs `saturated` and all seven metrics (§6.8) | `core/engine/pack.js:783`–`:785` (required fields of a `difficulty-v2` claim), `:738`–`:739` (all seven metrics). My Phase 1 rating field (score and saturation only) would decode to an invalid pack | Accepted; resolution in 3.3 |
| R1-10 | Minor (correct) | `docs/design-detail.md:1675` describes a CLI replay of earlier batches; `tools/generate.mjs:13`–`:14` starts every batch from an empty history (§3.4) | Confirmed by reading both | Fix the living spec with the feature |
| R1-11 | Minor | Lone surrogates must survive in text (§6.2) | The pack reader only counts code points (`core/engine/pack.js:374`–`:385`), so it accepts them; my prototype's UTF-8 path would replace them | Adopt its UTF-16 escape for ill-formed strings, or refuse to make a code with a clear message; the case is rare |
| R1-12 | Minor | Reject `i > 0` beside `#p=`; `hashWithIndex` would append `&i=0` (§8.1) | `player/state.js:167`–`:181` confirmed. My Phase 1 said "ignore" | Adopt its stricter rule and keep `#p=` without `&i` |
| R1-13 | Minor | Continuation sheets for long codes; QR "a separate decision" (§9) | Superseded by the user's new requirement: the QR is mandatory. With the coding of 3.1 the longest typed code is 210 symbols at 576 cells (6 lines) and 245 on a 676-cell board that only the command-line tool makes (7 lines), so generated puzzles need no continuation sheet | QR on the first sheet (Section 4); continuation sheets only as a fallback for extreme custom packs |
| R1-14 | Minor | Its layout estimate puts 60 symbols per line in groups of 5 (§9.1) | With the QR in the top-right corner, the code lines have about 150 mm | 40 symbols per line (10 groups of 4), Section 4.4 |

## 3. Divergences and unified positions

### 3.1 (a) Code length: the same puzzles in both designs

**Measured, symbols including prefix or version and check, grouping not counted.**

- *a1 core:* board, angle, pieces and clues. *a1 default:* core plus score and saturation plus the puzzle number.
- *a1 + solution:* default plus the solution path, embedded (the tail of Section 4 adds about 5 symbols).
- *a2 default:* its "solution + display" profile.

| Puzzle (first of the pack) | K / G | a1 core | a1 default | a1 + solution | a2 core | a2 + solution | a2 default | a1 exact on this corpus |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| recipe-w1 (6×10 Hard) | 9 / 3 | 32 | 35 | 36 | 50 | 56 | 95 | yes (10 puzzles) |
| Player sample (6×10) | 9 / 5 | 35 | 36 | 37 | 53 | 56 | 87 | yes (3) |
| Hand-made fixture (6×10) | 10 / 2 | 42 | 42 | 46 | 53 | 61 | 74 | yes (1) |
| Twelve pentominoes (6×10) | 12 / 3 | 39 | 39 | 44 | 47 | 55 | 88 | yes (1) |
| Heart 10 (75 cells) | 14 / 3 | 36 | 38 | 44 | 58 | 69 | 119 | yes (3) |
| Ring 8 (60 cells) | 9 / 3 | 34 | 36 | 39 | 53 | 59 | 98 | yes (3) |
| 12×12 (144) | 21 / 3 | 53 | 56 | 70 | 87 | 107 | 168 | yes (3) |
| 24×24 Hell 1 (576) | 40 / 4 | 205 | 208 | 234 | 293 | 344 | 402 | yes (2) |
| 24×24 Hell 3 (576) | 78 / 3 | 131 | 134 | 214 | 274 | 394 | 451 | yes (2) |
| 32×18 Hell 3 (576) | 84 / 3 | 108 | 111 | 205 | 253 | 384 | 442 | yes (2) |
| Irregular 24×24 Hell 3 (558) | 75 / 3 | 147 | 150 | 228 | 282 | 394 | 451 | yes (2) |
| Custom ids, letters, colours | 10 / 2 | 203 | 203 | 207 | 202 | 210 | 223 | yes (1) |
| Piece with a hole + monomino | 2 / 0 | 47 | 48 | 48 | 51 | 51 | 51 | yes (1) |
| Padded hand-made board | 10 / 2 | 52 | 53 | 56 | 67 | 75 | 88 | yes (1) |
| 1,024 cells, 128 identical pieces | 128 / 3 | 356 | 357 | 497 | 83 | 88 | 88 | yes (1) |

The last row is the one case where architect-2's design wins. My prototype's subset ranks cannot express a repeated
shape, so it falls back to a rank per piece (1,679 bits for 128 pieces). Architect-2's own raw code for that row is 232
symbols; its DEFLATE option brings it to 83. Neither is needed: in the canonical order identical shapes are adjacent,
so a set-level "repeated shapes" flag, then one "same as the previous piece" bit per piece only when the flag is set,
makes that row about 55 symbols (estimate) and costs 1 bit on every other set.

### 3.2 Where the bits go (recipe-w1, first puzzle, measured)

| Field | a1 bits | a2 bits | Nature of the difference |
|---|---:|---:|---|
| Version / prefix | 5 (1 symbol) | `P1.` (3 symbols) + 8 (codec byte) | Choice: prefix and DEFLATE option |
| Size, angle, piece count, flags | 25 | 26 | Equal |
| Board mask | 2 | 3 | Equal |
| Piece sizes and shapes | 77 (sizes 21, shapes 56) | 128 | **Coding inefficiency.** The 10-, 10- and 9-cell pieces cost 71 bits (frontier or bitmap, mode included) where ranks among all free 10- and 9-ominoes need about 34. The six catalogue pieces cost 57 bits (12 of them modes, 18 sizes) where subset ranks need about 22. My nine sizes cost 21 bits. (The split of my 56 shape bits is an estimate; the totals are measured.) |
| Clues | 31 | 33 | Nearly equal (placement index against x/y/orientation in whole bits) |
| Check | 20 | 32 | Choice |
| Padding | 0 (up to 4 to fill the last symbol) | 2 (to a whole byte) | Byte alignment, a small inefficiency |
| **Core** | **32 symbols** | **50 symbols** | |
| Solution | 8 | 27 + 1 selector | Coding: candidate index among the pieces that fit, against rank + orientation |
| Rating | 9 (score, saturated) | 130 (full claim, `H` as float64) | Choice, forced by the validator (3.3) |
| Title / number | 2 (number) | 67 ("Hard #1" as UTF-8, flags) | Choice |
| **Default** | **35** (36 with solution) | **95** (with solution) | |

On the 32×18 Hell 3 puzzle the same split reads:

| Field | a1 bits | a2 bits |
|---|---:|---:|
| Shapes | 439 | 1,117 |
| Clues | 57 | 62 |
| Solution | 471 | 650 |
| Rating | 13 | 206 |
| Title or number | 2 | 80 |

With 84 pieces of 4–11 cells, my coding spends about 5.2 bits per piece on sizes and shapes, and architect-2's about
13.3 (measured totals above, divided by 84).

**Position (a):** use my Phase 1 coding of shapes, clues and solution, add the repeated-shape flag and architect-2's
UTF-16 escape, and drop the byte framing. The measured lengths are the a1 columns above.

### 3.3 (c) Default contents

**Solution.**

- Measured, Node, one process per puzzle, `solveFirst` with the Player's verification budget (2,000,000 row trials),
  no stored solution (`verify-one.mjs`; four jobs ran in parallel, so times are approximate, but the outcome does not
  depend on time):

  | Puzzle | Result |
  |---|---|
  | 22×22 Hard | Found after 11 row trials, 0.0 s |
  | 12×12 Nightmare | Found after 27,439 row trials, 1.3 s |
  | 32×18 Hell 3 | Found after 521,315 row trials, 32.2 s |
  | 18×20 Hell 2 | Budget used up after 219.5 s: "not verified" |
  | Heart 24 Hell 2 | Budget used up after 261.1 s: "not verified" |
  | 24×24 Hell 3 | Budget used up after 346.6 s: "not verified" |
  | 24×24 Hell 1 (architect-2's corpus) | Budget used up after 1,107.6 s: "not verified" |

- `verifyPack` reports "not verified" when the budget runs out (`core/engine/tasks.js:97`, `:104`–`:113`), and the
  Player then shows no "At least 1 solution" (`docs/design-detail.md` §9.5). A browser needs about 5 s + 4 × the Node
  time (§8.7, D39), so about 15–74 minutes of worker time for these four (estimate).
- With a stored solution the check is O(cells) and searches nothing (`core/engine/tasks.js:98`–`:99`). Hints and
  Show solution also start from a stored solution that agrees with the placements (`core/engine/hints.js:110`,
  `:145`–`:146`; `docs/design-detail.md` §11.13).
- So architect-2 is right that the solution matters, and my Phase 1 default (no solution on the first sheet) would
  leave large Hell puzzles "not verified".
- Typing it is the wrong price: +78 to +94 symbols on the Hell 3 boards of 558–576 cells even in my coding.

**Position:** the code has an optional solution **tail** after its own check (Section 4.5). The typed code is the
core. The QR, the copied link and Play carry the core plus the tail. Both open the same puzzle with the same progress
fingerprint.

**Rating.**

- architect-2 is right that `{ model, score, level }` fails validation (R1-09). Its fix (carry U, B, branchTrials,
  rowTrials, R, H and stop) costs 26–41 symbols for data that no screen shows.
- `U` = K − G and `R` (free cells) follow from the content. `H` follows from placement counts, and the search fields
  follow from the deterministic `rate()`. Measured: `rate()` rebuilt the **complete** stored claim, metrics included,
  for 12 of 12 distinct puzzles in Node — six Hell puzzles of 360–576 cells in 0.5–3.9 s each (`rate-time.mjs`), and
  the 12×12, 18×20 Hell 2 and 22×22 Hard puzzles (`verify-rate.mjs`). Phase 1 had 19 of 19 equal ratings.
- **Position:** the code carries the score and the saturated flag (about 2 symbols); the level follows from the score,
  as `rate()` derives it (`levelForScore`, `core/engine/difficulty.js:112`; engine scores are integers, `:44`). A
  claim that does not fit this pattern (another model, a fractional score, a level that differs) is carried in full,
  as architect-2 proposes. For the usual claim, the decoded pack needs one of:
  1. `validatePack` accepts a `difficulty-v2` claim without `metrics` (they are optional in practice: only the engine
     writes them, and no screen reads them). A small, backward-compatible reader change; documented in
     `docs/design-detail.md` §5.3;
  2. the decoder runs the existing `rate` worker task (`core/engine/tasks.js:196`) and stores the recomputed claim.
     It is exact as measured above, but costs 0.5–3.9 s in Node (about 7–21 s in a browser, estimate) before the
     pack exists, and ties old codes to today's rating code.
- I recommend 1. Option 2 remains a measured fallback if the owner prefers not to touch the validator.

**Title.**

- Generated titles are `${level label} #${n}`, with the engine's English level label of the requested level
  (`core/browser/generation-client.js:763`, `:854`); the sample's are bare level names.
- **Position:** a 2-bit title kind (none / level name / level name + number / text), so generated titles cost about 1
  symbol and custom titles stay exact.
- The level comes from the rating. The encoder uses a pattern kind only when it reproduces the stored title exactly;
  otherwise it writes the text.

**Seeds and provenance:** both studies leave them out of the code. Keep the readable set line on paper (it still lets
the Generator make more puzzles from the set). The puzzle seed line misleads (it cannot re-create the puzzle): drop it
or say what it is (question 3).

**Certificate:** both leave it out. Agreed.

### 3.4 (b) Piece identity

There is less divergence than the framing suggests. Both designs keep ids, letters, colours, piece order and each
piece's stored orientation **exactly**, and both spend only a few flag bits on them when they equal the defaults.

- **Mine:** three set-level flags (canonical order; canonical orientation; default identity), with full fallbacks.
  Measured exact on the hand-made fixture and on custom ids, Unicode letters and colours.
- **Architect-2's:** an all-defaults flag, an all-canonical flag and per-piece override bits.

The only real difference is that I *exploit* the canonical order to compress the shapes when it holds; it never
reorders a pack.

What must survive so that the cut-outs match the screen and progress follows:

| Item | Cut-outs match | Progress key matches | How |
|---|---|---|---|
| Piece order | Yes: fill patterns follow the index (`patternFor(i, K)`, `core/browser/svg-board.js:492`), and the default letters and colours derive from it (`labelFor(i)`, `colorFor(i)`) | — | Preserved |
| Ids | No (the letter is the separate `label` field) | Yes (`progressFingerprint` sorts the pieces by id, `core/engine/keys.js:462`) | Preserved, free when they equal the default letters |
| Letters (`label`), stored colours | Yes | No | Preserved, free when they equal `labelFor(i)` and `colorFor(i)` |
| Stored orientation of each piece | The tray and sheets draw it | Yes (source orientation is part of the fingerprint) | Preserved (3 bits per piece only when not canonical) |
| Board rows with margins, clue cells | — | Yes | Preserved |
| Display colour remap, label marks, patterns | Yes | No | Renderer rules (R1-08) |

**Position (b):**

- My three flags, plus architect-2's per-field overrides (id, label, colour separately), so a pack with custom letters
  but default colours pays only for the letters.
- The decoder's `labelFor` and `colorFor` are frozen copies for v1. Hand-made and imported packs are fully supported
  and pay for what they customise (about 200 symbols for ten fully custom pieces, the same in both designs).

### 3.5 (d) Integrity and typing

| Topic | a1 Phase 1 | a2 Phase 1 | Unified position |
|---|---|---|---|
| Check | CRC-20 (4 symbols) | CRC-32C (about 6.4 symbols) + codec byte | **CRC-20.** A 20-bit miss rate (10⁻⁶) is far below typing reality, and a code that passes must still pass full structural validation. Choose the polynomial by an exhaustive test: every single-symbol error and every swap of neighbours detected, and every single-symbol suggestion unique, for codes up to a stated length (at least the ~300 symbols of the longest generated code with its tail); longer codes get detection only, no suggestion. My first prototype polynomial had a period of only 210 bits (found in Phase 1), so the test matters |
| Correction | Suggest one correction | None | **Suggest, never apply** (R1-07) |
| Groups | 4 | 5 | **4**, like the seeds `XXXX-XXXX-XXXX`; chunks of four are easier to hold while typing |
| Prefix | Version symbol `1` | `P1.` | **Version symbol.** The `#p=` key, the "Puzzle code" label and the check identify the code; `P1.` costs 2–3 symbols on every code |
| Case | Insensitive; O→0, I/L→1 | Same | Agreed |
| DEFLATE | No | Shortest of raw/DEFLATE | **No** (R1-05) |

### 3.6 (e) Scope

Both designs cover every valid pack: sides up to 64, 1,024 cells, 128 pieces, 128 cells per piece. Both were measured
on such controls (Table 3.1). Generator limits are irrelevant to the codec.

**Position:**

- The encoder and decoder accept every pack that `validatePack` accepts.
- The worst case is bounded (estimate for my coding: about 7,400 symbols for 128 fully custom pieces on a 64 × 64
  grid, so the URL stays under 16,000).
- The QR has its own limit (Section 4.3).

## 4. QR code

The user now requires a QR code on the printed sheet, besides the typed code. architect-2 had proposed one only as an
optional convenience containing the same `#p=` URL. I agree on the URL and on local generation, and propose the
details below.

### 4.1 Payload

- **The full URL, not the bare code.** A phone camera then opens the puzzle in one step; a bare code would need the
  app first.
- **Two segments:**
  - *Byte mode* for the lower-case prefix (the GitHub Pages path is case-sensitive, and `#` and `=` are not in the
    alphanumeric set): for example `https://tdat00.github.io/pentomino/player/#p=`, 45 characters.
  - *Alphanumeric mode* for the code: the upper-case Crockford alphabet is a subset of the QR alphanumeric set (0–9,
    A–Z), at 5.5 bits per symbol against 8.
  - The two segments save up to 2 versions on the measured codes over an all-byte URL (none below about 60 symbols,
    3 for architect-2's longest; Table 4.2). jsQR decoded all 13 mixed-segment test symbols exactly.
- **Base URL:** derived from the page base exactly as the existing Play link is (`new URL('../player/', base)` at
  `core/engine/sharecode.js:279`, with `document.baseURI` from `core/browser/handoff.js:61`). It is right on GitHub
  Pages and on forks, and keeps §12.3's relative-path rule. Printed from a local server, it points to that server,
  which only a developer will do. Print the same URL under the QR in small type only if the user wants it (it does
  not help typing; the code does).

### 4.2 Versions and sizes (measured with the reference encoder)

- QR versions for the URL above, with the code in alphanumeric mode.
- Size: (17 + 4·version + 8) modules × 0.5 mm, including a 4-module quiet zone on each side.
- Code lengths are those of 3.1 and of Phase 1; "+ solution" rows have the solution embedded (the tail of 4.5 adds
  about 5 symbols).

| Code | Symbols | L | M | Q | H | All-byte URL at M | Bare code at M | Printed at M, 0.5 mm |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 6×10 Hard | 35 | 4 | 5 | 6 | 8 | 5 | 2 | 22.5 mm |
| Heart 10 | 38 | 4 | 5 | 6 | 8 | 5 | 2 | 22.5 mm |
| 12×12 | 56 | 5 | 6 | 7 | 9 | 6 | 3 | 24.5 mm |
| 18×20 Hell 2 | 97 | 6 | 7 | 9 | 10 | 8 | 5 | 26.5 mm |
| 24×24 Hell 3 | 134 | 7 | 8 | 10 | 12 | 9 | 6 | 28.5 mm |
| 24×24 Hard, worst typed at 576 | 210 | 8 | 10 | 12 | 14 | 12 | 8 | 32.5 mm |
| 26×26 Hard (676, command-line tool only) | 245 | 9 | 11 | 13 | 15 | 13 | 9 | 34.5 mm |
| 24×24 Hell 3 + solution | 214 | 9 | 10 | 12 | 14 | 12 | 8 | 32.5 mm |
| 26×26 Hell 3 + solution, longest measured | 261 | 9 | 11 | 13 | 16 | 13 | 9 | 34.5 mm |
| architect-2 default, 576 worst | 453 | 12 | 14 | 17 | 20 | 17 | 13 | 40.5 mm |

At M, version 6 holds up to 87 code symbols, version 8 up to 154, version 10 up to 242, version 13 up to 414 and
version 15 up to 531 (measured).

### 4.3 Recommendation for the symbol

- **Error correction M** (about 15 % damage).
  - L saves only 1–2 versions, and paper gets creased, cut, stained and printed on poor printers.
  - Q adds 1–3 versions and H 3–6 (Table 4.2), for little gain on a clean sheet.
- **Modules of 0.5 mm**, never smaller. Every measured code then fits in 22.5–34.5 mm, quiet zone included. Even
  architect-2's longest default fits in 40.5 mm.
- Black on white, never inverted, and never on the mirrored backs of the piece and board sheets.
- If an extreme custom pack exceeds what version 40 holds at M (3,322 code symbols after this 45-character prefix;
  4,227 at L; measured with the reference encoder), first drop the solution tail. If that is still too long, print no
  QR and say why; the typed code and the URL still work.

### 4.4 Place on the first sheet

Today the heading is the title (8 mm type, baseline at 19 mm) and two detail lines (4 mm type, baselines at 26.5 and
32 mm), and the preview starts at 40 mm (`core/browser/print-sheet.js:74`–`:76`, `core/browser/print-layout.js:30`).
Proposal (positions are estimates to be tuned in the browser):

- **QR in the top-right corner:** its quiet zone from y = 10 mm and up to x = 200 mm, so 22.5–34.5 mm square for
  every measured code.
- **Left column, about 150 mm wide:** the title and the detail lines stay where they are. Long custom titles must
  stop short of the QR (shortened or wrapped).
- **Code band** under the detail lines: a label line ("Puzzle code", baseline at 37.5 mm), then the code in monospace
  at about 4.2 mm, 10 groups of 4 per line (49 glyphs, about 118 mm), 6 mm line pitch from 43.5 mm.
- **`PREVIEW_TOP`** becomes the larger of the last code line + 4 mm and the QR bottom + 4 mm:
  - about 48 mm for a one-line code (up to 40 symbols: the generated 6×10 and Heart 10 codes);
  - about 54 mm for two lines (12×12, the hand-made 6×10 fixture);
  - about 78 mm for six lines (210 symbols, the worst typed code at 576 cells).
- The preview then has 225 mm instead of 233 mm for one line, and 195 mm for six. `layoutPreview` already shrinks the
  preview in 5 % steps until it fits (`core/browser/print-layout.js:400`–`:412`). Its start height
  (`PREVIEW_BOARD_MAX_HEIGHT_MM`) and `layoutSolution` (`:517`) must use the new top as well.
- Nothing changes on the piece and board sheets, and the cut-out scale is untouched. The solution sheet keeps its
  heading; repeating the code and QR there is optional.

### 4.5 Does the QR change the trade-offs?

Yes, in one place: the solution no longer has to be typed to travel. Recommended design: **one code with an optional
tail**.

```text
typed code  = version | core fields | rating summary | title kind | pad | CRC-20
QR/URL code = typed code | solution path | pad | CRC-20 (over everything)
```

- The typed code is literally the beginning of the QR's code, so "the same code" holds for paper, QR and URL.
- The decoder accepts both: it checks the first CRC, and if symbols remain, decodes the tail and checks the second.
- Cost of the tail: the solution bits plus about 5 symbols, for example 35 → about 41 symbols for 6×10 and 134 →
  about 218 for 24×24 Hell 3 (estimate from the measured solution bits). The QR at M stays at version 5 for 6×10 and
  grows from version 8 to 10 for 24×24 Hell 3 (measured for those lengths).
- The Player keeps whichever form it was opened with in its address. Printing a puzzle opened from the short form
  produces the short form, because no solution exists to add.

Everything else stays in the core because it is cheap and shown on screen (score, title). Rejected alternatives:

- a richer code only in the QR (two unrelated strings);
- typing the solution (too long on Hell boards);
- no solution anywhere (slow or unverified Hell puzzles).

### 4.6 Implementation and tests

- **Encoder:** vendor a port of Project Nayuki's *QR Code generator* (MIT licence; segments in byte and alphanumeric
  modes, all versions and error-correction levels, standard mask penalty) as one ES module, for example
  `core/engine/qr.js`, with its copyright notice.
  - A pure function (text segments → module matrix) belongs in the engine folder and runs in Node tests.
  - It passes `tools/check-site.mjs`: a local relative import, no bare or external specifier, no inline code, and the
    same `?v=` version stamp as every other module reference.
  - Writing one in-house is possible (Reed–Solomon, block interleaving, placement, format and version information,
    eight masks; estimate 400–500 lines), but a reviewed port is less risky.
  - No new runtime dependency; `package.json` stays without dependencies.
- **Rendering:** `print-sheet.js` draws the matrix as one SVG `<path>` (one `h1v1h-1z` square per dark module, merged
  per row run). Presentation attributes only (`fill="#000"`, `shape-rendering="crispEdges"`), so the CSP of §12.4 is
  unaffected. At exactly `moduleMm` per module, like the cells.
- **Tests:**
  - Golden module matrices for about eight payloads covering versions 1–15, the four error-correction levels, both
    segment modes and every mask, produced once by a reference encoder during development and stored as hex.
  - In-test checks of the format-information BCH code and of the Reed–Solomon syndromes of every block.
  - A print-layout test that the QR, the code band and the preview do not overlap.
  - A browser acceptance item: print three sheets (6×10, 576-cell Hell 3 with tail, the longest), scan them with an
    Android and an iPhone camera at arm's length, and open the puzzle.
  - A decoding library is used only during development, never in the repository.

## 5. Other checks of architect-2's study

- **Current state:** its print, address, `#pack=` and pack descriptions match the code I read and my Phase 1. Two
  additions of its own are useful and correct:
  - the Player's print job never passes a solution (`player/app.js:357`–`:377`);
  - `encodeShareCode` never compares compressed and plain lengths (`core/engine/sharecode.js:172`–`:200`).
- **Its one factual error** is R1-06.
- **History and calibration:** its experiments (batch seed `3`; seeds `12345` and `98765` reusing the calibration
  puzzle; re-running a seed against its own history) match my E5 and E6, and its negative control (an unchanged result
  under a changed history) is a good reminder that dependence is not universal.
- **URL and entry UX:** sound.
  - Atomic loading through `readIncoming`, keeping the input on failure, accessibility attributes, and accepting a
    pasted full URL are all right. Its EN/VI messages are good.
  - Its progress handling — keep the saved moves, say "Saved moves restored; Replay starts as printed", never delete
    silently — is better than my Phase 1, which only noted that progress follows the fingerprint. Adopt it.
- **Paper placement:** superseded by Section 4.4. Its band estimates (22 mm for two lines up to 52 mm for eight) were
  for the longer P1 codes, without a QR.
- **Implementation plan:** its file list matches mine, plus useful items: invalidate the prepared code when the
  selection changes, and pass the raw title rather than the localised heading. Two items should go:
  - the `meta` look profile (R1-08);
  - the 16 KiB decompression limit (no DEFLATE).

## 6. Points of agreement

- Print a self-contained direct code; never rely on seeds (Option A rejected in both); seeds stay readable on paper.
- Crockford base32, case-insensitive, with O/I/L aliases; a checksum; full validation after the checksum.
- The URL `…/player/#p=<code>`: the same code as printed, old `#pack=` and `#lib=` routes unchanged, Play unchanged,
  plus a "Copy this puzzle link".
- Exactness covers board rows with margins, the angle, ordered ids, letters, colours and orientations, and clue cells;
  saved progress follows. The progress fingerprint alone is not a sufficient test.
- Everything a valid pack can hold must encode, including hand-made packs and the 1,024-cell, 128-piece limits.
- Living-spec corrections: the claims that the printed heading lets the puzzle and its set "be made again"
  (`docs/design-brief.md:78`, `docs/design-detail.md:2214`) and the CLI replay sentence
  (`docs/design-detail.md:1675`).

## 7. Proposed unified positions

| Divergence | Unified position |
|---|---|
| (a) Length | a1 coding of shapes, clues and solution, plus a repeated-shape flag and a2's UTF-16 escape. No byte framing, no DEFLATE. Typed codes measured at 35–38 symbols for generated puzzles up to 75 cells (39–53 for hand-made ones with default letters and colours, about 200 with ten fully custom pieces), 56 at 144 cells and 111–210 at 576 cells |
| (b) Identity | Everything preserved exactly. Three set flags and per-field overrides. Defaults derived from frozen v1 tables. Display rules are a documented product contract |
| (c) Solution | Optional tail after the typed code; carried by the QR, the copied link and Play; never typed |
| (c) Rating | Score + saturated in the core, the level derived from the score; other claims carried in full. `validatePack` accepts v2 claims without `metrics` (preferred) or the `rate` task rebuilds them |
| (c) Title | 2-bit kind: none / level / level + number / text; a pattern only when it reproduces the title exactly |
| (c) Seeds, certificate, history | Not in the code; the set line stays on paper |
| (d) Integrity | Version symbol, CRC-20 with an exhaustively tested polynomial, suggestion-only correction, groups of 4, case-insensitive, no DEFLATE |
| (e) Scope | Every pack `validatePack` accepts; QR overflow rule of 4.3 |
| QR | Full URL; byte + alphanumeric segments; error correction M; modules ≥ 0.5 mm; top-right of the first sheet (22.5–34.5 mm); vendored MIT encoder with golden tests |

## 8. Questions for the user

| # | Question | Recommended default |
|---|---|---|
| 1 | Should the solution be part of what you type, or travel only in the QR and links? Typed without it: 35 symbols for 6×10, 134 for 24×24 Hell 3; with it: 36 and 214. A Hell puzzle opened from a typed code without the solution may stay "not verified", and its hints must search on their own | Only in the QR and links (the QR code is the typed code plus a tail) |
| 2 | Print the URL as text under the QR as well? | No: the typed code and "open the Player and enter the code" are enough |
| 3 | Keep printing the puzzle seed, which cannot re-create the puzzle? | Drop it; keep the level, score and set line |
| 4 | Add "Copy this puzzle link" (a `#p=` link) in both apps? | Yes |
| 5 | May the pack reader accept a `difficulty-v2` rating without its internal metrics (needed so the code carries only the score)? | Yes; the alternative recomputes the rating for 0.5–4 s (Node) whenever a code opens |

## Appendix A. Scratch files (architect-1)

| File | Purpose |
|---|---|
| `compare-a2.mjs` | Both prototypes on architect-2's corpus (Table 3.1) |
| `breakdown-a2.mjs` | Field-by-field bits (Table 3.2) |
| `a2-shape-cost.mjs` | Architect-2's per-piece shape bits rebuilt from its documented grammar (128 bits, as measured) |
| `pl-check.mjs`, `pl-a2.mjs` | The 128-identical-piece control: where my bits go, architect-2's raw and DEFLATE lengths, multiset estimate |
| `verify-one.mjs`, `vo-*.txt`, `verify-rate.mjs`, `verify-rate.log` | No-solution verification and re-rating (3.3) |
| `rate-time.mjs`, `rate-time.log` | `rate()` time and full-claim equality on six Hell puzzles (3.3) |
| `qr-measure.mjs`, `qr-extra.mjs`, `qr-extra2.mjs` | QR versions with the reference encoder, decoding with jsQR, version 40 capacity (Section 4) |
| `package.json`, `node_modules\` | npm `qrcode`, `jsqr` and `pngjs`, for measuring only |

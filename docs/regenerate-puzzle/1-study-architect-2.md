# Phase 1: independent study of printed-puzzle reconstruction

**Architect:** architect-2

**Date:** 2026-10-25, UTC+07:00

**Repository:** `Q:\git\pentomino`, `tdat00/pentomino`

**Revision studied:** `80af86c32c232864f4389e825b04a227ea262420`

**Status:** research and an executable scratch prototype, not an implemented application feature.

This study is independent of architect-1. No architect-1 report was read. No existing repository file was changed. All experimental scripts and generated packs are outside the repository, in:

```text
C:\Users\ledat\.copilot\session-state\bd310130-fd20-420b-8d77-6abb52737794\files\architect-2\
```

## 1. Executive conclusion

- **Board:** the drawing usually communicates its playable outline and holes, but not its exact authored dimensions, blocked margins, coordinate origin or original display angle.
- **Piece set:** shapes can often be copied from the drawings. Seeds can reproduce a generated set only with additional inputs and the matching implementation. Neither route guarantees arbitrary piece IDs, stored colours, labels, source orientations and array order from paper alone.
- **Puzzle:** clues are depicted, but there is no supported paper-to-puzzle input route. A printed puzzle seed is not a self-contained puzzle identifier. History, calibration reuse and generation versions matter.
- **Recommendation:** print a self-contained, versioned **single-puzzle content code**, not a more elaborate regeneration recipe.
- Recommended text form: `P1.` followed by uppercase, case-insensitive **Crockford base32**, grouped in fives on paper, with a **CRC-32C** integrity check.
- Encode exact board coordinates, ordered piece identities/shapes and clue poses. Include the selected puzzle's stored solution, title and complete rating claim by default when present; do not include other puzzles, the set witness or generation history. Seeds/provenance are optional.
- Measured proposed default lengths: **95 characters** for the first generated 6-row by 10-column recipe puzzle; **119** for Heart; **168** for a 144-cell board; **402–453** in the 558–576-cell generated cases. These include prefix and checksum, but not grouping spaces.
- Without title/rating or a solution, the same cases need **50, 58, 87 and 253–293** characters respectively. A true twelve-pentomino 6×10 control needs **47** without, or **55** with, its solution.
- URL: `https://tdat00.github.io/pentomino/player/#p=<the-same-code>`. The largest proposed default in this corpus produces a **498-character URL**.
- These are measured examples, **not universal maximums**. Custom labels/colours and arbitrary masks contain real information; a universally tiny seed-length code is impossible without external storage.

## 2. Current state, with source evidence

### 2.1 What the printer actually receives

The two apps share `core\browser\print-dialog.js`, `print-layout.js`, `print-sheet.js` and `print-texts.js`. The common job currently contains board, the **whole** piece set, clues, rotation, a title and already-formatted detail lines; a solution is optional (`core\browser\print-dialog.js:17–24`).

| Printed part | Actual content and omissions | Evidence |
|---|---|---|
| First sheet, always present | Title; optional rating/score/puzzle seed line; optional set level/seed line; board preview with clues; remaining-piece previews; clue legend when applicable; “Pieces to place (n)”; 50 mm ruler, selected cut-out cell size and scaling advice. No reconstruction code, machine-readable board description, original angle, uniqueness mode, generation versions or history. | `core\browser\print-layout.js:533–550`; `core\browser\print-sheet.js:146–181` |
| Heading/details | Example EN: `Nightmare: score 123, seed 4567`, then `Set: Expert, ABCD-EFGH-JKLM`. Level words are bold. Scores are rounded to integers; saturation appends `+`. The title is 8 mm text; details are 4 mm text at 5.5 mm spacing. | `core\browser\print-dialog.js:39–63`; `core\browser\print-sheet.js:72–79`; `core\browser\print-texts.js:34–40` |
| First-sheet clues | Clue pieces have hatching, padlocks when labels are visible, and a 0.6 mm black outline. They occupy their starting cells, not the player's current moves. | `core\browser\print-sheet.js:119–169`; `player\app.js:357–377` |
| First-sheet remaining pieces | Every non-clue piece, at the same preview scale as the board. Layout sorts pieces by dimensions, not necessarily their stored array order. Preview is a reading aid, not a cutting template. | `core\browser\print-layout.js:126–138`, `:400–429`; `core\browser\print-sheet.js:162–170` |
| Piece-set sheets, optional | Every piece, including clue pieces, drawn **unlocked** with colour, label and applicable pattern; tall pieces first, 4 mm gaps; oversized widths can be quarter-turned. Caption identifies the puzzle and piece-sheet number. These sheets do not repeat the full seed/rating heading. | `core\browser\print-layout.js:230–260`; `core\browser\print-sheet.js:189–204`, `:318–320` |
| Board sheets, optional | Blank playable grid, outline/cut line and holes; **no clues on these full-size board sheets**. Enclosed blocked cells are grey and crossed; exterior blocked cells are absent. Large boards are split into numbered parts with matched join marks and assembly advice. | `core\browser\print-sheet.js:99–111`, `:244–263`, `:322–327`; `core\browser\print-layout.js:86–137` |
| Solution sheet, optional, Generator only | Immediately after the puzzle sheet: title plus `Solution`, same detail lines, every piece of the selected stored solution, original clue pieces still locked. It is not a fresh solver result. | `core\browser\print-sheet.js:268–290`; `core\browser\print-layout.js:517–542` |
| Duplex | Piece and board backs are mirrored left-to-right, with upright labels. The first sheet has a blank back unless the solution occupies it. A single preview-only print does not create an unnecessary blank sheet. | `core\browser\print-sheet.js:192–202`, `:247–259`, `:310–316`; `core\browser\print-layout.js:556–568` |

The default dialog enables piece-set and board sheets, medium 15 mm cells, no duplex and no solution. Generator passes `solutionOption: true`; Player does not. A missing stored solution disables the Generator's solution option (`core\browser\print-dialog.js:77`, `:181–193`; `generator\ui\puzzle-panel.js:193`; `player\app.js:379`).

**Information loss before printing:**

1. `snapRotation` drops the odd 45° step: 0° and 45° both become 0°, 90° and 135° both become 90°, etc. (`core\browser\print-layout.js:49–58`).
2. `orientModel` shifts the active-cell bounding box to `(0,0)` and derives its dimensions from active bounds, not authored board dimensions (`core\browser\print-layout.js:107–137`).
3. `chooseModel` can add another quarter-turn when it saves board sheets or permits larger cells. This choice also rotates the preview and pieces (`core\browser\print-layout.js:486–507`).
4. Labels, and the accompanying padlocks, are omitted below **2.5 mm preview cells**. A drawing is therefore not guaranteed to carry every identity visibly (`core\browser\print-sheet.js:34`, `:130–137`, `:151`, `:192`).
5. Browser-added print headers/footers are user settings, not a reliable data channel. The application's controlled content is its generated SVG pages (`core\browser\print-dialog.js:85–103`; `core\browser\print.css:141–176`).

For Heart N=10, the source is a 10×10 grid with its upper-right 5×5 quarter blocked and a 45° presentation rotation (`core\engine\board.js:201–218`). Paper shows the upright grid shape with that exterior quarter omitted, not a reliable record of the original 45° presentation.

### 2.2 Generator versus Player

| Question | Generator | Player |
|---|---|---|
| Which puzzle? | The selected card's underlying puzzle, not all cards. | `pack.puzzles[index]`, not the current arrangement of movable game pieces. |
| Title? | Localized `Puzzle #n`, based on the current list position. | `puzzleDisplayName(puzzle.title, index)`: a title ending in `#digits` stays; another title gets `#n`; missing title gets a localized fallback. |
| Puzzle seed? | `state.puzzleSeeds[puzzle.id]`. | The selected puzzle's `seed`. |
| Set seed/level? | `state.setSeed` and `state.calibrationFor?.levelId`. | String-valued `pack.generation.setSeed` and `setLevel`; metadata is not a proof of origin. |
| Angle supplied? | `state.rotation`. | `viewRotation ?? pack.presentation.rotation ?? 0`. |
| Solution supplied to current print job? | Selected `puzzle.solution`, or null. | None, even if the pack has a stored solution. |

Evidence: `generator\ui\puzzle-panel.js:170–193`; `player\app.js:357–379`; `player\puzzle-title.js:19–31`.

The Player's global **Straighten** preference is a separate display overlay (`player\state.js:144–150`), not puzzle content. Its print job reads the unsnapped angle above, rather than serializing that preference.

**Unknown data is omitted, not reconstructed.** With no rating but a seed, only `Seed: …` is emitted. With rating but no seed, only level/score is emitted. With a set seed but no set level, `Set: …` is emitted. A missing/empty set seed suppresses the set line altogether. A missing/empty puzzle seed suppresses that seed. The complete matrix is implemented and tested in `core\browser\print-dialog.js:51–63` and `tests\print-details.test.js:16–27`.

### 2.3 What the Generator URL contains

`generator\address.js:14` owns `preset`, `angle`, `cells`, `level`, `seed`, `unique`; wizard `step` is separate.

| Parameter | Meaning |
|---|---|
| `cells` | Exact authored W×H mask via `boardKey`: `<W>x<H>:` and six row-major bits per base64url-alphabet character, including blocked margins. |
| `angle` | Display angle in 45° steps. |
| `preset` | Selected preset menu entry, **not** the board's authoritative geometry. |
| `level` | Selected level. |
| `seed` | Seed of the set on show, or a valid typed seed. |
| `unique=1` | Require-unique mode. Absence in a settings link means `any`. |
| `step` | Requested wizard step, not a puzzle index. |

Evidence: `generator\address.js:21–38`, `:62–108`; `core\engine\board.js:94–139`; `docs\design-detail.md:1978–1999`.

The URL does **not** encode selected puzzle clues, puzzle seeds/history, answers or the puzzle list. Nor does it pin generator/rating implementations. Restoring a set by seed is not restoring a selected puzzle.

### 2.4 What `#pack=` and the pack JSON contain

`encodeShareCode` serializes the **supplied whole pack** to compact JSON and uses:

```text
1z. + unpadded_base64url(deflate_raw(UTF8(JSON)))
1j. + unpadded_base64url(UTF8(JSON))       // compressor unavailable/fails
```

The current encoder does not compare compressed and uncompressed lengths before choosing `1z`. Its base64url is case-sensitive. Raw DEFLATE does not add an application checksum. Decoding checks syntax, limits, UTF-8 and pack validity (`core\engine\sharecode.js:172–250`).

`preparePlayerLink(pack, index)` prefers a portable `#pack=<code>&i=<zero-based-index>` URL. Above 16,000 URL characters, or on encoding failure, it may save and read back the pack and return a **same-browser-only** `#lib=<16hex>&i=…` reference. Above 4,000 characters it warns about chat applications truncating URLs (`core\browser\handoff.js:65–113`; `core\engine\sharecode.js:8–11`, `:267–282`).

Generator Play builds a pack of the set and the puzzle list, with solutions and witness, then opens the selected index. Selecting one card does not make its existing share code a single-puzzle code (`generator\state.js:1252–1269`; `docs\design-detail.md:1753–1765`).

The pack stores:

| Scope | Fields |
|---|---|
| Envelope | `format`, `version`, `kind`, `rules`. |
| Board/presentation | All `board.rows` (`#` active, `.` blocked), and `presentation.rotation` with default zero. |
| Piece set | Ordered `pieces[]`, each with `id`, `label`, `color`, normalized reference `cells`. |
| Selected puzzle | Required opaque `id` and `clues`; optional `title`, `seed`, `solution`, `rating`, `certificate`. |
| Shared optional data | A set `witness`; `generation` provenance; arbitrary bounded `meta`. |

There is **no explicit to-place array**: it is all set pieces minus the clue IDs. A set witness is not necessarily the selected puzzle's solution and must not be substituted for one.

Writers preserve piece order, normalize symmetric pose transforms and omit absent proofs. `omitSolutions` removes both set witness and all puzzle solutions. Ratings/certificates remain claims; `verified` is not written (`core\engine\pack.js:1157–1179`, `:1191–1225`, `:1235–1308`).

Pack JSON contains sufficient direct content for exact puzzle reconstruction without generation, provided the desired optional solution/metadata was included. Its seeds are provenance, not the mechanism needed to play it.

### 2.5 Limits: distinguish the requested stress point from current UI release gates

- Board generation sides: at most 32 (`core\engine\board.js:14–15`).
- The shipped qualification flags are all `not-run` (`core\engine\qualification.js:13–18`). Therefore current release defaults are **484 active cells on desktop and 360 on phones**, not 576. The design gate can raise desktop to 576 (`core\engine\policy.js:22–43`).
- The CLI accepts a requested active-cell cap through 676 and defaults to 676 (`tools\generate.mjs:30–33`, `:45–53`).
- The Player/pack format is broader: sides through **64**, up to **1,024 active cells**, **128 pieces**, and **128 cells in a piece** (`core\engine\pack.js:36–40`, `:403–437`, `:454–455`, `:508–509`).

Measurements below include the requested 576-cell boards using the real CLI. A print-code design shared with Player should not accidentally impose Generator-only limits on valid existing Player packs.

## 3. Sufficiency analysis and experiments

### 3.1 Board

**From seeds:** no. Neither set seed nor puzzle seed defines a board. The generator explicitly receives board rows; its streams are derived from the seed/labels, not an invertible description of those rows (`core\engine\generate.js:89–118`; `core\engine\rng.js:133–150`).

**From the drawings:** usually enough to count playable cells and enclosed holes, up to paper orientation and translation, but **not enough for exact authored coordinates**.

**Measured counterexample.** Starting from the real hand-authored 10×6 fixture:

```text
Original board key: 10x6:__________
Padded board key:   12x8:AAf-f-f-f-f-f-AA
```

The second board adds one entirely blocked border and shifts every clue by `(1,1)`. `orientModel(original)` and `orientModel(padded)` were deep-equal. Likewise, supplying 0° and 45° produced identical print models. Different exact boards/angles can therefore produce the same controlled paper content.

The exact-coordinate progress fingerprint deliberately includes blocked margins and source cell orientation (`core\engine\keys.js:454–469`). Losing margins is not merely a different spelling of the same stored puzzle.

### 3.2 Piece set, including paper identity

**From its printed seed:** conditionally possible for generated sets, not guaranteed from printed information alone.

Reproduction requires the board, set level, normalized case-sensitive set seed, uniqueness mode and matching generation/policy/rating/RNG behaviour. A successful set is chosen by the lowest successful calibrated attempt (`core\engine\generate.js:89–160`; `core\browser\generation-client.js:623`).

The generated set sorts shapes by size and canonical geometry, then assigns `labelFor(index)` and `colorFor(index)` (`core\engine\carve.js:572–632`). Therefore a genuinely identical set attempt reproduces shape, reference orientation, IDs, labels, colours and order, not just an unordered bag of shapes.

**Measured positive control:** the recorded `fixture-set-0`, Hard, 10×6, `any` recipe regenerated the exact nine-piece set and all ten recorded puzzles. CLI runs with **one and four real worker threads** matched completely after removing `generation.createdAt`. Both used set attempt zero. Their timestamp values differed, as expected.

**Measured uniqueness counterexample:** 10×6, Master, set seed `a2-uniqueness-0`:

| Mode | Accepted attempt | Piece count | Outcome |
|---|---:|---:|---|
| `any` | 0 | 13 | First carved/calibrated set accepted. |
| `require` | 1 | 13 | Attempt zero failed with `not-in-band`; a different set was accepted. |

The piece arrays differed despite the same printed set seed and set-level name. Uniqueness does not change carving of a fixed attempt directly; it changes calibration/acceptance and thus which attempt becomes the set. The printout does not state this mode.

**From drawings:** a careful person can often transcribe all shapes. However:

- Piece-sheet packing order is not original piece-array order.
- Print orientation and individual packing rotations do not identify the stored reference orientation.
- Small previews can suppress labels.
- Labels are not necessarily IDs in an imported pack.
- Imported colours are arbitrary RGB, and a monochrome print cannot recover them.
- Even a colour print is not an injective representation of stored colours: `displayColor` remaps the twenty base colours (`core\browser\piece-look.js:16–30`).
- Above twenty pieces, pattern identity depends on **array index and set count**, not shape (`core\engine\palette.js:77–88`).
- Labels AA–AZ, BA–BZ and CA–CZ are rendered as A–Z with circle, square and disc marks, respectively (`core\browser\piece-look.js:57–75`; `core\browser\svg-board.js:530–563`).

For a known unchanged generated palette, readable labels and known generated ordering can help reconstruct appearance. That is an assumption, not a guarantee for every puzzle printable in Player.

### 3.3 Puzzle, angle, solution and rating

**Clues and remaining pieces:** the first sheet depicts them. Manual tracing could reconstruct a playable equivalent when cells and labels are readable. The applications do not currently provide a manual clue-entry/piece-authoring import path. Printed seed fields cannot replace that missing data.

**Puzzle seed:** the Generator draws a fresh random uint32, written in decimal, for each New Puzzle request. The request also sends the set witness/macro hints, target level, uniqueness, quantity, frozen seen-layout/seen-clue histories, and possibly its trusted calibration puzzle (`generator\jobs.js:320–365`). The CLI instead derives `setSeed#batchIndex` and always starts its one requested batch with empty history (`tools\generate.mjs:12–13`, `:477–491`).

One request can create several puzzles with the same seed: the Generator's current default quantity is five (`generator\state.js:104`, `:137`), and `seedsFor` assigns that request's seed to every accepted puzzle (`generator\jobs.js:338`). The printed seed is therefore not even a unique identifier within an ordinary batch.

`puzzleCandidate` depends on the batch seed plus slot/attempt labels and the frozen history; it rejects an already-seen layout and excludes seen clue sets (`core\engine\generate.js:166–214`). The fold adds more history and consumes candidates in a deterministic order (`core\engine\generate.js:384–445`, `:601–608`).

**Measured history experiments, same real nine-piece set:**

1. An important negative control: batch seed `fixture-set-0#2`, quantity four, happened to give identical results with empty history and with the ten recorded earlier puzzles. **History dependence does not imply every changed history changes every result.**
2. With batch seed **`3`**, quantity three, that same comparison differed at slot three:
   - empty history: `pc0db3886157e`, score 18;
   - carried ten-puzzle history: `pc7ee959e7476`, score 22.
   The first two puzzle IDs were identical.
3. Re-running `fixture-set-0#2` **after adding its own accepted results to history** returned four different puzzles, with **zero common layouts**.
4. A candidate explicitly given its own layout key in `seenLayouts` returned `{ fail: 'layout' }`.

**Measured calibration experiment:** with fresh history and a reusable calibration, batch seeds `12345` and `98765` both yielded the same first puzzle, `p90d9bbeacb5d`, score 21. The first slot can be the set's calibration rather than a batch-seed-generated candidate (`core\engine\generate.js:346–369`, `:408–412`). Its reuse/trust status must therefore be understood by a regeneration recipe.

Consequently, simply adding a puzzle-seed input box would **not** solve the paper problem. A visible card number is also not a persistent batch-slot identity after removal/renumbering.

**Worker count and wall time:** the engine is intentionally deterministic; arrival order is not random selection. Set results use the lowest successful attempt, and batch/completion results are folded in order (`core\engine\generate.js:2–6`; `core\browser\generation-client.js:623`, `:944–945`). The real 1/4-worker comparison passed. Time still governs whether a request finishes or returns an accepted prefix: the host's dispatch watchdog is 115 seconds with a 120-second response budget (`core\engine\policy.js:54`; `core\browser\worker-pool.js:354–358`). Do not claim that recording generation duration fixes reproduction. Timestamp is provenance only, whereas completion/cancellation and accepted-history evolution can affect what exists in a later session.

**Version dependence:** changes to generation, policy, RNG, rating model, budgets or traversal can change accepted content. Current identifiers are `gen-v2`, `mixed-v2`, `xoshiro128ss-v1`, `seed-sha256-v1` and `difficulty-v2` (`core\engine\version.js:3–4`; `core\engine\policy.js:16`, `:46–52`; `core\engine\rng.js:6–7`). The print heading includes none. A seed solution would require continued access to old implementations, not merely their names.

**Display angle:** not recoverable from the paper transform, as the 0°/45° collision proves.

**Solution:** absent from ordinary printouts and all current Player print jobs. When explicitly printed by Generator, its drawing gives a particular completion, subject to identity/readability issues. Regenerating or solving later can return a different valid completion; the rules accept any valid completion (`docs\design-detail.md:589–593`).

**Rating:** a displayed rounded score/level/`+` is recoverable as text, but not the exact score, model, metrics or other claims. Re-rating later is not equivalent to retaining a stored claim (`core\engine\pack.js:737–846`; `docs\design-detail.md:1518–1524`).

### 3.4 Specification discrepancies to correct during implementation

The brief and detailed printing section currently describe the seed heading as enough “so both can be made again” (`docs\design-brief.md:78`; `docs\design-detail.md:2214`). The counterexamples above show the limit of that claim.

There is also a wording mismatch in the seed section: `docs\design-detail.md:1674–1678` suggests CLI sequence replay, but `tools\generate.mjs:12–13`, `:485–488` explicitly starts with empty history. A `--batch-index` selects a derived seed; it does not replay previous batches. The same section refers to seed “on its card”, whereas the UI specification says the seed is beside the main-panel puzzle name. These should be reconciled with the actual code, not used as evidence that paper reconstruction already works.

## 4. Define “exact” before choosing a code

### 4.1 Required contract: exact puzzle content, not a photograph or session

| Data | Required? | Reason |
|---|---|---|
| Original width, height and every active/blocked cell | Yes | Keeps holes, exterior, origin, coordinates and saved-progress identity. Do not silently trim margins or rotate the data grid. |
| Counter-clockwise presentation angle in 45° steps | Yes | Retains the intended view before print-only snapping/packing rotations. |
| Every piece's reference cells | Yes | Preserve the normalized source orientation, not only its free-polyomino equivalence class. |
| Piece array order, IDs, labels and stored RGB values | Yes | IDs bind poses/progress; labels, colours and order bind screen pieces to cut-outs and patterns. |
| Stable presentation profile | Yes for durable paper matching | Freeze palette derivation, base-colour remapping, label marks and pattern assignment for P1. A future theme should not reinterpret an old paper identity. |
| Clue piece IDs and exact occupied cells | Yes | These are the starting puzzle. Symmetric transforms producing the same occupied cells are equivalent. |
| Pieces to place | Derived | Complement of clue IDs in the preserved ordered set. No redundant list is needed. |
| Other puzzles, original pack size/index | No | Explicitly outside the request. |
| Current moves, tray sorting, timer, undo, viewport/zoom, language, theme, Straighten preference | No | Session/preferences are not the printed starting puzzle. |

“Exact” here is **semantic and presentation-identity equality**, not byte-identical original JSON. Equivalent symmetric `turn`/`mirrored` representations, pose-list ordering, RGB hex letter case and a newly derived opaque puzzle ID need not be preserved. Original piece IDs, piece-array order, source cell orientation and board margins **must** be preserved.

Do not use `progressFingerprint` alone to test this contract. It intentionally excludes colours, labels, presentation and piece-array order (`core\engine\keys.js:415–421`, `:454–469`). The prototype separately compares these.

### 4.2 Optional information and recommended defaults

| Data | Recommendation |
|---|---|
| Selected stored solution | Include by default when present. It preserves the original answer/solution-sheet content and allows existing known-solvable/hint paths without re-solving. It is not mathematically necessary to define the starting puzzle. Never substitute the set witness. |
| Stored rating | Include by default when present, as an unverified claim, retaining its model and complete required metrics. Do not fabricate metrics or recalculate during import. |
| Stored title | Include by default when present; it is cheap in normal cases. Original pack ordinal in a UI-generated heading is not identity. |
| Set seed, set level, puzzle seed | Keep current human-readable print details as reference. Omit from the default compact code; offer provenance inclusion only if desired. Reconstruction does not need them. |
| `createdAt`, set attempt, batch index, generator versions, macro regions/history | Omit. They explain generation but are not needed to play the encoded content. |
| Certificate | Omit initially; not printed and not a proof merely because stored. Add only after a specific product decision. |
| Arbitrary `meta` | Omit. This is a puzzle code, not an archive of every extension in a pack. |

The prototype calls the default profile **solution + display**: selected solution, stored title and entire rating claim, without seeds. It also measures a minimal core profile and a provenance-inclusive profile. Unknown optional data stays absent.

An existing stored game can still restore moves when the code opens because its fingerprint matches. Recommended UX: preserve existing resume behaviour, show “Saved moves restored; Replay starts as printed”, and never silently erase progress. The underlying starting puzzle remains exact.

## 5. Design alternatives

| Option | Advantages | Problems | Verdict |
|---|---|---|---|
| A. Seeds + parameters | Short for a narrowly fixed deterministic generator and simple board. Can produce more puzzles from a set. | Missing board/uniqueness/version/history/calibration inputs; need frozen old generators, slot/request semantics and potentially long replay; generation can time out; cannot describe foreign or hand-authored packs. | Do not make this the paper guarantee. Keep seeds as provenance. |
| B1. Slice to one puzzle, reuse JSON + DEFLATE + base64url | Small implementation change; current pack parser; directly stores content; no history problem. | Still roughly 600–2,700 characters for minimal one-puzzle JSON with solution in measured cases. Inappropriate for pleasant manual entry. | Useful baseline or emergency export, not the recommended printed value. |
| B2. Compact direct single-puzzle binary code | Immediate deterministic decode; independent of generation; supports arbitrary masks/pieces/IDs; tens to hundreds of characters; same value works in URL. | A small permanent codec and versioned lookup/profile data must be maintained and rigorously tested. | **Recommended.** |
| C. Hybrid: regenerate set from seed, encode clues/answer directly | Removes puzzle-history dependence and may shorten large sets. | Still needs exact board/level/uniqueness/old set generator, can fail/time out, and needs a separate fallback for unknown provenance/custom identity. | Not worth making normal opening depend on generation. |
| D. Short lookup ID / URL shortener / `#lib=` | Very short text. | Needs a server catalogue or the originating browser's storage. Paper stops being self-contained and portable. | Does not meet the requirement. |

B2 can itself use a **frozen small-shape dictionary** and default identity profile. This is a compact representation of content, not regeneration by mutable search algorithms.

## 6. Concrete proposed P1 format

This is a complete prototype-level layout, proposed for review before freezing. The production implementation should expose structured `Result` errors rather than the prototype's assertions.

### 6.1 Envelope, alphabet and integrity

```text
Printed/URL code = "P1." + CrockfordBase32(frame)

frame = codec:u8 | payload:bytes | crc32c:u32be
codec = 0: raw binary payload
        1: deflate-raw(binary payload)

crc32c input = ASCII("P1") | codec | payload
```

- CRC-32C uses the reflected Castagnoli polynomial `0x82f63b78`, initial and final XOR `0xffffffff`. Check vector: `CRC32C("123456789") = 0xe3069283`.
- Check the CRC **before** decompressing. It detects typing/transmission mistakes; it is **not authentication**. A malicious author can calculate it, so full structural validation remains mandatory.
- Alphabet: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, no padding.
- Emit uppercase; accept lowercase. Accept `O→0`, `I/L→1`, spaces, CR/LF and grouping hyphens. The writer never emits the ambiguous letters.
- Preserve leading zero symbols. Reject illegal symbols, impossible base32 lengths and non-zero terminal padding bits.
- Require the prefix, reject unknown major versions, and retain the P1 reader/profile permanently after release.
- The checksum is our CRC, **not** Crockford's optional modulo-37 check-symbol scheme.
- Do not apply these normalization rules to existing `1z.`/`1j.` values: those are case-sensitive base64url, in which `-` is actual data.

Unpadded base32 takes approximately 20% more symbols than unpadded base64url. The improved typing ergonomics are worth that cost. Base64url remains a measured alternative, not a second ambiguous alphabet under the production P1 prefix.

Other choices are less attractive here: hexadecimal is easy to type but needs about 25% more symbols than base32; base58 removes several ambiguous characters but remains case-sensitive; base85 introduces punctuation and URL escaping. These alphabet ratios are arithmetic comparisons, not additional measured codec implementations.

### 6.2 Integer and string primitives

Bits are written most-significant first, with only the final byte zero-padded. Let:

- `b(n) = ceil(log2(n))`, with `b(1)=0`;
- `gamma(n)` encode positive n as `floor(log2(n))` zero bits followed by n in binary;
- a zero-inclusive count c use `gamma(c+1)`.

Text uses a one-bit encoding tag, then a gamma length:

- tag 1: UTF-8, length in bytes, strict UTF-8 decoding;
- tag 0: UTF-16 big-endian code units, length in code units, only to preserve legacy ill-formed JS strings.

The latter is an actual compatibility edge: the current pack reader accepts lone surrogate code units, while ordinary UTF-8 encoding would replace them. A focused experiment confirmed exact preservation with the escape form. Normal titles/labels/seeds use UTF-8. Production must retain field-specific limits and the overall byte cap.

Numbers used in optional ratings are one flag plus either `gamma(n+1)` for an integer `0 ≤ n < 2^24−1`, or IEEE-754 float64 in big-endian order. This preserves fractional scores/H values and large valid counts. The integer flag is 1; the float flag is 0.

### 6.3 Main binary payload

| Order | Field | Bits / representation |
|---:|---|---|
| 1 | W−1 | 6; supports existing pack W=1…64. |
| 2 | H−1 | 6. |
| 3 | Presentation angle / 45 | 3; counter-clockwise. |
| 4 | K−1 | 7; K=1…128. |
| 5 | All identities equal frozen defaults | 1. |
| 6 | All reference shapes already equal their free canonical orientation | 1. |
| 7 | Selected solution present | 1. |
| 8 | Optional metadata present | 1. |
| 9 | Exact board mask | Adaptive format below. |
| 10 | K shape/identity records | **In original piece-array order.** |
| 11 | Clue subset and clue poses | Adaptive subset + compact poses below. |
| 12 | Selected solution | Optional, excludes duplicate clue poses. |
| 13 | Optional metadata | Title/rating/provenance flags and fields. |
| 14 | Final padding | 0–7 zero bits only. |

The fixed header is **26 bits**. Rules are implicitly frozen as `free-polyomino-v1`; another ruleset requires another code version.

The default identity/profile means the P1 snapshot of `labelFor(i)`, `colorFor(i)`, `patternFor(i,K)` and the current printed/display glyph/colour interpretation. It must **not** mean “whatever those functions do in the latest release”.

### 6.4 Board mask: do not always store blocked cells

Choose the shortest representation, with deterministic mode-number tie-breaking:

| 3-bit mode | Payload |
|---:|---|
| 0 | All cells active: nothing further. |
| 1 | Blocked-cell count, then sorted row-major index gaps. Count is `gamma(count+1)`; previous index starts at −1; each positive gap uses gamma. |
| 2 | Same, listing active cells instead. |
| 3 | W×H bitmap, 1 active / 0 blocked. |
| 4 | Row-major runs: initial cell value, gamma-coded positive run lengths until W×H cells. |
| 5 | Column-major runs, same coding; transpose traversal on decode, not the board itself. |
| 6 | Exactly one blocked rectangle: x, y, width−1, height−1, six bits each. |
| 7 | Reserved; reject. |

The source W/H and every blocked cell are retained; no inferred preset name, border trimming or stored exterior/hole classification is necessary. Recompute hole/exterior classification from the exact mask.

**Measured board-payload costs, including its three-bit mode but excluding W/H:**

| Board | Chosen | Alternatives |
|---|---:|---|
| Full 10×6 rectangle | **3 bits**, full | Bitmap 63; run format 15. |
| Heart N=10, 25 blocked cells | **27 bits**, blocked rectangle | Blocked-gap list 57; row/column runs 65; bitmap 103. |
| 8×8 ring, four blocked cells | **24 bits**, blocked gaps | Blocked rectangle 27; runs 33; bitmap 67. |
| 24×24 irregular, 18 blocked cells | **101 bits**, column runs | Blocked gaps 110; row runs 113; bitmap 579. |

Thus the user's “only blocked cells” idea is valuable but should be **one candidate**, not the entire format. A full rectangle needs no cell list; a quarter cut-out is better as a rectangle; a dense irregular mask may favour the bitmap.

### 6.5 Shapes, reference orientation and identities

For each piece, calculate the free canonical shape using the existing numeric `(y,x)` comparison over the eight D4 transforms, as defined by `canonicalKey` (`core\engine\geometry.js:95–139`). Store the shortest of:

| 2-bit mode | Payload |
|---:|---|
| 0 | Canonical bounding-box width and height, gamma-coded; then its row-major occupancy bitmap. |
| 1 | Frontier occupancy encoding: root is the first canonical cell, translated to `(0,0)`; breadth-first occupied-cell queue; inspect right, down, left, up; for each unseen neighbour emit occupied/unoccupied, enqueue only occupied cells. Stop when the queue is exhausted, then normalize. Holes work without a special case. |
| 2 | Frozen catalogue: size−1 in three bits (sizes 1…8), then catalogue index in `b(catalogueSize[size])` bits. |
| 3 | Reference to a previous canonical shape in this set, in `b(previousPieceCount)` bits. Reject a forward/out-of-range reference. |

The catalogue contains **533 free polyominoes**, including holey shapes: counts by size are `1, 1, 2, 5, 12, 35, 108, 369`. Within each size, indices use ascending ASCII order of the existing canonical-key strings. Its generated JSON table is 18,180 bytes in this prototype; generation took 48.45 ms in Node. Production should ship a frozen small static table, not enumerate shapes during opening.

Catalogue-data SHA-256, over the prototype's `JSON.stringify(catalogueKeys)`:

```text
2965cf3cc0f406bb32dd762ea8f2b5956fafb3b41e90b5b07ab63b9dde4cd3ed
```

If the global “all canonical” flag is false, each piece adds the smallest 3-bit D4 transform that restores its **original normalized reference cells** from the canonical shape. This is essential for progress identity and imported pieces. It does not rotate the board or change piece-array order.

If all identities are the P1 defaults, store no identity payload. Otherwise each piece has three override bits:

- ID override: length−1 in three bits, then 6-bit characters from `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`.
- Label override: bounded text, preserving the original value, not just its displayed last letter.
- RGB override: 24 bits. Upper/lower hex spelling is not semantically significant.

Default fields still derive by **original ordinal**, never by sorting pieces again. Patterns and glyph marks derive from the frozen P1 profile and preserved order/count.

Catalogue savings are real but not universal. With solution and no metadata, catalogue/no-catalogue values in the same four-mode grammar were **55/71** characters for true classic pentominoes, **69/87** for Heart, and **384/475** for 32×18 Hell 3. The 40-piece Hell 1 case has no piece small enough for the catalogue, so it stays **344/344**. Compared with an earlier one-bit no-catalogue grammar, the extra mode bit costs that case eight characters; this is an explicit trade-off.

### 6.6 Clues and poses

Choose a clue-subset representation with a one-bit selector:

- K-bit membership bitmap; or
- gamma count plus gamma-coded increasing ordinal gaps.

Visit clues in increasing original piece ordinal; encode each pose as:

1. index in the piece's distinct orientation list, ordered by smallest transform t, using `b(numberOfDistinctOrientations)` bits;
2. x in `b(W−orientedWidth+1)` bits;
3. y in `b(H−orientedHeight+1)` bits.

Transform convention is the existing pack convention: mirror x first, then clockwise quarter-turns. The board's presentation field remains counter-clockwise. Validate the oriented cells against the mask and other clues; spare bit patterns are not valid positions/orientations.

No explicit piece ID accompanies each pose: the preserved ordinal identifies it. No explicit remaining-piece list is needed.

### 6.7 Optional selected solution

Store only the non-clue part. Choose the shorter of:

- **Absolute:** the same compact pose encoding for each remaining piece in original order.
- **First-uncovered-cell scan:** initialize occupied cells with clues. Find the first uncovered active cell in row-major order. Encode the owning piece's rank among remaining original ordinals, then its distinct orientation index. The first cell of that oriented shape fixes x/y, so coordinates are implicit. Mark it and repeat.

This is direct decoding, **not search**. Check bounds, mask, overlap and final coverage at each step.

Measured solution-payload alternatives for the first 32×18, 84-piece case were **961 bits absolute versus 649 bits scan**, before the one-bit selector. For the nine-piece recipe they were **48 versus 26 bits**.

Decode the clue and solution maps canonically. Equality means every named piece occupies the same cells as in the original selected solution, not that pose array ordering is unchanged.

### 6.8 Optional metadata

Three presence bits: title, rating, provenance.

- Title: bounded text, when present.
- Rating:
  - one bit for the current `difficulty-v2` model, otherwise model text;
  - known-level flag plus `gamma(index+1)`, where `very-easy=0` through `nightmare=6` and `hell-n=6+n`; otherwise level text;
  - exact score;
  - two-bit saturated state: absent/false/true, fourth value rejected;
  - for v2, exact numeric `U`, `B`, `branchTrials`, `rowTrials`, `R`, `H`, then two-bit `stop` (`solution`, `branch-cap`, `row-cap`);
  - for foreign models, bounded JSON containing optional opaque metrics/censored fields, still validated by the pack reader.
- Provenance: presence bit plus text for each of `setSeed`, `setLevel`, selected `seed`.

**Important discovered constraint:** a `difficulty-v2` rating cannot be represented as only `{model, score, level}` in today's pack parser. `saturated` and all seven metric fields are required (`core\engine\pack.js:737–803`). The first prototype exposed this by failing validation; the corrected prototype retains the full claim. It does not fabricate zero metrics.

The default omits provenance, the set witness, timestamps, certificates, arbitrary meta and every other puzzle. An opaque public puzzle ID is derived from decoded content using the existing `puzzleId`; original piece IDs remain intact.

### 6.9 Compression and bounds

Encode raw first. If `CompressionStream('deflate-raw')` is available, try it and keep it **only when the complete encoded code is shorter**. A failure uses raw mode. The frame tells the decoder which path to use.

Results:

- Every measured generated **core** and **core+solution** payload was shorter **without** DEFLATE. These are already small, bit-packed, relatively high-entropy records.
- Native CompressionStream in Node matched `deflateRawSync` byte-for-byte in four controls. Proposed-default raw/compressed bytes were **52/57** for the recipe, **67/72** for Heart, and **269/274** for the wide large board.
- Repetition still helps: the valid 1,024-cell/128-identical-piece stress control compressed **247→48 bytes**, reducing its solution-inclusive base32 code **407→88 characters**.
- Textual provenance sometimes helps DEFLATE, depending on repetition/alignment. Do not assume compression helps just because a payload is “large”, and do not apply base64 before compressing.
- A more elaborate arithmetic/range coder could exploit shape or mask probabilities, but adds another permanent algorithm and failure surface. The measured catalogue/bit-packing gains are already substantial; defer entropy coding unless a firm typing budget demands it.

Proposed independent safety limits:

- **16 KiB expanded binary limit**, enforced while streaming decompression, not afterwards;
- a bounded encoded-input limit before normalization and parsing;
- existing pack bounds on board, pieces, text and claims;
- strict counts, backward references, orientation indices, zero padding and complete consumption.

The prototype rejected a CRC-valid compressed frame expanding to 20,000 bytes at the 16,384-byte cap.

The essential core plus solution is conservatively under about **4.9 KiB raw** even at the full existing pack bounds: a W×H bitmap, at most four frontier bits per piece cell, bounded per-piece identity overrides and at most fifteen absolute pose bits per piece. Thus its base32 URL can remain below the existing 16,000-character URL policy without a database. Optional provenance/foreign metadata must have separate limits; never silently fall back to `#lib=` or truncate essential fields to make a printed code fit.

Production should enforce the final URL budget before offering a print code, and offer an explicitly identified “puzzle content only” profile if optional metadata is too long. A hard guarantee of a *tiny* code for arbitrary imported labels/colours is not possible.

## 7. Measurements and reproducibility

### 7.1 Corpus and generation method

Environment: Windows, Node **v24.22.1**, local engine at the revision above. No packages were installed. No server, browser automation or external encoding service was used.

Real input files:

- `tests\fixtures\hand-authored-pack.json`;
- `tests\fixtures\generated-sample-pack.json`;
- `player\samples\sample-pack.json` (content-equal to the preceding fixture, independently tested);
- `tests\fixtures\generation-case.json`;
- `tests\fixtures\bq-irregular-558.json`;
- Heart seed/parameters from `tests\fixtures\ui-flow-recipes.json`.

The generation driver calls the actual exported CLI `run` function with these arguments and scratch-relative outputs. It does not implement a second generator.

| Output | CLI inputs beyond `--output` | Exit / measured elapsed |
|---|---|---|
| `recipe-w1.json` | `--recipe <repo>\tests\fixtures\generation-case.json --workers 1` | 0 / 450 ms |
| `recipe-w4.json` | Same, `--workers 4` | 0 / 407 ms |
| `heart-75.json` | `--preset heart --n 10 --level master --seed t18-heart-a --count 3 --workers 2` | 0 / 553 ms |
| `mid-144.json` | `--board 12x12 --level nightmare --seed a2-mid-144 --count 3 --workers 2` | 0 / 793 ms |
| `large-576-h1.json` | `--board 24x24 --level hell-1 --seed a2-large-576-h1 --count 2 --workers 2` | 0 / 7,811 ms |
| `large-576-h3.json` | `--board 24x24 --level hell-3 --seed a2-large-576-h3 --count 2 --workers 2` | 0 / 3,021 ms |
| `wide-576-h3.json` | `--board 32x18 --level hell-3 --seed a2-wide-576 --count 2 --workers 2` | 0 / 1,936 ms |
| `irregular-558.json` | Scratch recipe using the real fixture's rows, rotation 135, `hell-3`, seed `a2-irregular-558`, quantity 2, batch index 1, `any`; `--workers 2` | 0 / 2,927 ms |
| `ring-60.json` | `--preset ring --n 8 --level hard --seed a2-ring-60 --count 3 --workers 2` | 0 / 153 ms |

These timings only document completed research runs; they are not a browser qualification or a performance benchmark.

Additional clearly identified controls:

- All twelve free pentominoes, solved on 10 columns × 6 rows by the real solver, with three clues. Solver found a layout in 1,413 row trials. Labels are A–L, not the conventional F/I/L/etc. naming.
- A reversed-order/custom-ID/Unicode-label/custom-RGB derivative of the real hand-authored pack.
- A piece with a hole plus a monomino.
- A valid 64×16 board, 1,024 active cells and 128 identical eight-cell pieces, to test parser limits/repetition, not generation policy.
- The blocked-border counterexample.

Main corpus: **49 puzzle entries in 17 source packs**, including deliberate worker-replay and fixture/sample duplicates. This is a representative engineering corpus, not 49 statistically independent random puzzles.

### 7.2 Final P1 lengths: all compression/alphabet variants

**All numbers in this table are measured.** Each cell `a / b` means **without stored solution / with stored solution**, with no optional metadata. Character counts include `P1.`, the codec byte and CRC, but exclude grouping spaces/newlines. Byte counts are the uncompressed bit-packed payload only. Rows show the first puzzle of each pack.

| Case | K / clues | Raw payload bytes | Base64url raw | Base64url DEFLATE | Base32 raw | Base32 DEFLATE |
|---|---:|---:|---:|---:|---:|---:|
| Hand-authored 10×6, 60 active | 10 / 2 | 26 / 31 | 45 / 51 | 49 / 55 | 53 / 61 | 58 / 66 |
| Generated fixture / Player sample, 10×6 | 9 / 5 | 26 / 28 | 45 / 47 | 49 / 51 | 53 / 56 | 58 / 61 |
| CLI recipe, 10×6, 60 active | 9 / 3 | 24 / 28 | 42 / 47 | 46 / 51 | 50 / 56 | 55 / 61 |
| True twelve-pentomino 10×6 control | 12 / 3 | 22 / 27 | 39 / 46 | 42 / 50 | 47 / 55 | 50 / 59 |
| Heart 10×10, 75 active, 45° | 14 / 3 | 29 / 36 | 49 / 58 | 53 / 62 | 58 / 69 | 63 / 74 |
| Mid-size 12×12, 144 active | 21 / 3 | 47 / 60 | 73 / 90 | 79 / 97 | 87 / 107 | 95 / 115 |
| 24×24, 576 active, Hell 1 | 40 / 4 | 176 / 208 | 245 / 287 | 251 / 294 | 293 / 344 | 301 / 352 |
| 24×24, 576 active, Hell 3 | 78 / 3 | 164 / 239 | 229 / 329 | 235 / 335 | 274 / 394 | 282 / 402 |
| 32×18, 576 active, Hell 3 | 84 / 3 | 151 / 233 | 211 / 321 | 218 / 327 | 253 / 384 | 261 / 392 |
| Irregular 24×24, 558 active, 135° | 75 / 3 | 169 / 239 | 235 / 329 | 242 / 335 | 282 / 394 | 290 / 402 |
| Ring 8×8, 60 active | 9 / 3 | 26 / 30 | 45 / 50 | 49 / 54 | 53 / 59 | 58 / 64 |

### 7.3 Proposed default versus metadata-free / provenance-inclusive

The default column includes the selected answer, original title and **complete** stored rating claim when known. `+ provenance` adds the three seed/set-reference strings; it is not required for reconstruction. Each uses the shorter raw/DEFLATE representation.

| First puzzle | Core + solution | Proposed default | Default + provenance | Default code lines at 60 body symbols/line |
|---|---:|---:|---:|---:|
| Hand-authored | 61 | 74 | 74 | 2 |
| Generated fixture / Player sample | 56 | 87 | 109 | 2 |
| CLI recipe | 56 | 95 | 152 | 2 |
| True classic control | 55 | 88 | 88 | 2 |
| Heart | 69 | 119 | 168 | 2 |
| 144 cells | 107 | 168 | 223 | 3 |
| 576 cells, Hell 1 | 344 | 402 | 469 | 7 |
| 576 cells, Hell 3 | 394 | 451 | 519 | 8 |
| 32×18 Hell 3 | 384 | 442 | 495 | 8 |
| Irregular 558 | 394 | 451 | 522 | 8 |
| Ring | 59 | 98 | 139 | 2 |

Across **all** generated/sample entries, not only the first rows:

- largest core-only code: **293**;
- largest code with solution but no metadata: **395**;
- largest proposed default: **453**, irregular 558's second puzzle;
- the examples are not a worst-case bound for all accepted custom content.

Control results:

| Control | Raw base32 core / solution | Best solution code | Meaning |
|---|---:|---:|---|
| Ten pieces with custom IDs, reversed order, Unicode labels and custom RGB | 202 / 210 | 210; 223 with title | Preserving identity has a genuine cost. |
| Holey piece + monomino | 51 / 51 | 51 | No hole-free/generation-only assumption. |
| 1,024 active / 128 repeated pieces | 232 / 407 | **88 compressed** | Full parser bounds work; repetition can make DEFLATE very worthwhile. |
| Padded hand-authored board | 67 / 75 | 75 | Unlike printing today, exact empty margins survive. |
| One-cell/one-piece boundary | — | 19 | Zero-bit count/coordinate fields work. |
| Foreign rating, fractional score, arbitrary metrics, Unicode title, absent solution | — | 365 with metadata/provenance | Optional foreign data is preserved, not invented or re-rated. |

### 7.4 Existing JSON/share-code comparison

**Measured character counts.** “Minimal one-puzzle JSON” removes unrelated metadata/witness/other puzzles but retains board, pieces, rotation, clues and optionally selected solution, then uses raw DEFLATE + base64url with the existing three-character prefix. Thus it is a fairer baseline than merely measuring the whole pack.

| Case | Existing whole-pack `1z` code / puzzle count | Existing single-puzzle slice, shared extras kept | Minimal JSON, no answer / answer |
|---|---:|---:|---:|
| Hand-authored | 662 / 1 | 662 | 546 / 619 |
| Generated fixture | 1,243 / 3 | 906 | 553 / 611 |
| CLI recipe | 2,059 / 10 | 1,051 | 526 / 607 |
| Heart | 1,561 / 3 | 1,186 | 611 / 751 |
| 144 cells | 1,901 / 3 | 1,455 | 781 / 973 |
| 576 Hell 1 | 2,567 / 2 | 2,374 | 1,445 / 1,809 |
| 576 Hell 3 | 3,605 / 2 | 3,279 | 1,850 / 2,565 |
| 32×18 Hell 3 | 3,691 / 2 | 3,386 | 1,897 / 2,669 |
| Irregular 558 | 3,513 / 2 | 3,222 | 1,829 / 2,521 |
| Ring | 1,270 / 3 | 1,038 | 526 / 601 |

JSON compression is useful, but removing the repeated JSON field names, default identity strings and explicit coordinates gives another large reduction. Merely printing today's share code is not the best answer to manual entry.

### 7.5 Round-trip proof and negative tests

The prototype did not verify equality with shape hashes alone. It checked:

1. Exact board rows/dimensions and rotation.
2. Ordered piece IDs, labels, RGB values and normalized source cell arrays.
3. Actual display-colour remapping, glyph/mark results, and fill-pattern assignments.
4. Each clue's occupied cells keyed by original piece ID.
5. Exact ordered complement of pieces to place.
6. Every stored solution piece's occupied cells when included.
7. Exact optional title/rating/provenance values.
8. Identical `progressFingerprint`.
9. `parsePack` acceptance of the decoded one-puzzle pack.
10. `isValidLayout` for every included answer.

Results:

- **392 main variant round trips**: 49 puzzles × six solution/metadata profiles plus two no-catalogue controls. Each profile tested raw binary, raw/compressed base32, grouped lowercase base32, and raw/compressed base64url.
- **106 additional board-mask controls**, including randomized masks; together with the real Heart case, every mask mode 0–6 was exercised.
- **4,264 catalogue/reference-orientation controls**: all 533 catalogue shapes at all eight source orientations.
- Explicit tests for custom IDs, Unicode, lone surrogates, repeated shapes, a piece hole, blocked margins, minimum dimensions, maximum pack counts and absent answers.
- All **2,852 single-symbol substitutions** of the displayed 95-character example were rejected; 84 unequal adjacent swaps, 92 truncations, 92 deletions and 92 insertions were rejected. A separate short-code sweep rejected 1,550 substitutions.
- Lowercase, allowed ambiguous-letter aliases and layout whitespace are intentionally normalized rather than treated as corruption.
- A 20,000-byte compressed expansion was rejected by the 16 KiB decompression bound.

Existing focused tests also passed: **101 tests, zero failures**, using:

```powershell
node --test --test-skip-pattern=slow `
  '.\tests\print-details.test.js' `
  '.\tests\print-layout.test.js' `
  '.\tests\generator-address.test.js' `
  '.\tests\sharecode.test.js' `
  '.\tests\generate.test.js' `
  '.\tests\generation-client.test.js'
```

No physical printer, PDF layout or browser interoperability test of a new feature was performed. All layout-space estimates below are explicitly estimates based on the existing pure geometry.

### 7.6 Scratch artifacts and repeat commands

| Artifact | Purpose |
|---|---|
| `generate-data.mjs`, `generation-results.json`, per-case `.log` / `.json` | Real CLI samples and completion evidence. |
| `codec-prototype.mjs`, `catalog-data.mjs`, `catalog-info.json` | Executable encoder/decoder and frozen lookup data. |
| `measurements.json`, `length-summary.json`, `summary.mjs` | Final measurements and every tested code. |
| `measurements-without-catalogue.json` | Earlier simpler one-bit shape-grammar experiment; not the final P1 layout. |
| `experiments.mjs`, `determinism-evidence.json` | Worker/history/calibration/uniqueness and print-collision checks. |
| `baselines.mjs`, `json-baselines.json` | Existing share-code/minimal-JSON measurements. |
| `extra-samples.mjs`, `extra-samples-info.json` | Classic/custom/boundary packs. |
| `extra-validation.mjs`, `validation-extra.json` | Native streams, typo checks and current example code. |
| `property-validation.mjs`, `property-validation.json` | Catalogue orientations, masks and string boundary tests. |

Run from the scratch folder, not the repository, because output paths are deliberately relative:

```powershell
Set-Location 'C:\Users\ledat\.copilot\session-state\bd310130-fd20-420b-8d77-6abb52737794\files\architect-2'
node '.\generate-data.mjs'
node '.\extra-samples.mjs'
node '.\codec-prototype.mjs'
node '.\summary.mjs'
node '.\baselines.mjs'
node '.\experiments.mjs'
node '.\extra-validation.mjs'
node '.\property-validation.mjs'
```

## 8. URL reuse and entry UX

### 8.1 New route, old routes untouched

Recommended route:

```text
https://tdat00.github.io/pentomino/player/#p=P1.<base32-body>
```

The payload is **the same code printed on paper**, with grouping whitespace/hyphens removed. There is no lookup service and no pack index in the payload. The URL's fixed production overhead is **45 characters**.

- Decode to a normal validated one-puzzle pack, index zero.
- Accept absent `i` or `i=0`; reject `i>0` for `#p=` with an explicit “one puzzle” message.
- Reject duplicate `p`, or `p` together with `pack`/`lib`, rather than guessing.
- Preserve legacy `#pack=…&i=…` and `#lib=…&i=…`, including their existing syntax and case rules.
- Keep the short code when synchronizing the Player address. Today's `hashWithIndex` otherwise adds `&i=0` unconditionally (`player\state.js:167–181`).
- Update incoming parsing/loading rather than converting back to a long `#pack=` URL. `readIncoming` is the existing atomic, validated seam (`core\browser\handoff.js:180–194`).
- Prevent `makePortable` from overwriting an already-portable P1 route; it currently uses source classification to avoid replacing incoming `#pack=` links (`player\state.js:344–379`).
- Resolve Player relative to the app's base as today. Do not put P1 on the site-root redirect and assume it will open Player; the root currently redirects to Generator.
- Fragments do not go to the HTTP server, but the code is not secret from whoever receives the URL, browser history or a printout.

Keep existing Generator Play's whole-pack navigation unless the user explicitly wants that changed. Add **Copy this puzzle link** using `#p=` in the code/print UI. This meets the single-puzzle requirement without silently removing existing pack navigation.

### 8.2 Manual-entry UI

Add **Enter puzzle code / Nhập mã đề**:

- On Player's start screen, beside sample/Generator entry points (`player\ui\start-view.js:13–29`).
- As an always-available Player action while a puzzle is already open.
- Optionally a Generator shortcut that opens this Player entry UI; do not build a second decoder/reconstruction workflow.

Use a labelled multiline textarea, monospace, spellcheck/autocorrect off, normal editing/caret behaviour, a character/group count, and **Open puzzle / Mở đề**. Accept a bare P1 code, grouped print text, or a full recognized puzzle URL without fetching any arbitrary pasted URL.

Validation sequence:

1. Bound input size, normalize allowed P1 presentation characters.
2. Check prefix/version/alphabet; identify an invalid symbol by input position where possible.
3. Decode base32 and verify padding and CRC.
4. Decompress if necessary under the streaming limit.
5. Parse bounded fields, expand immutable defaults/catalogue and validate geometry/claims via the pack parser.
6. Only on success commit the new pack, update the hash and render it.

On failure leave the open puzzle/progress unchanged and keep the user's input for correction.

Suggested messages:

| Condition | EN | VI |
|---|---|---|
| Checksum mismatch | The code has a typing error. Check it against the printout. | Mã có lỗi nhập. Hãy đối chiếu với bản in. |
| Unknown version | This puzzle code needs a newer Player version. | Mã đề này cần phiên bản trình chơi mới hơn. |
| Unsupported compression | This browser cannot open compressed puzzle codes. Use a current browser. | Trình duyệt này không mở được mã đề nén. Hãy dùng trình duyệt mới hơn. |
| Structurally invalid content | This code does not describe a valid puzzle. | Mã này không mô tả một đề hợp lệ. |

CRC does not locate or automatically correct a valid-looking wrong symbol. Do not silently “repair” a checksum mismatch or load a best guess. A typo must not open a different apparently valid puzzle.

Use `aria-invalid`, a linked error description, `role="alert"` for failure, and normal keyboard submission. Decode/generation must not require a worker or solving; only the existing optional solvability verification may run afterwards.

## 9. Paper placement and space

### 9.1 Proposed first-sheet block

Keep the current heading/details for familiar reference, but replace the promise that seeds alone recreate the puzzle with an explicit code:

**EN:** `Puzzle code — reopens this puzzle`

**VI:** `Mã đề — mở lại đúng đề này`

Helper:

- EN: `Open tdat00.github.io/pentomino/player/ and choose Enter puzzle code.`
- VI: `Mở tdat00.github.io/pentomino/player/ rồi chọn Nhập mã đề.`

Print the complete code on the first sheet, regardless of whether piece-set/board/solution sheets are selected. Use a legible 10–11 pt monospace font, clear zero/one glyphs, black ink, groups of **five**, and up to **60 payload symbols per line**. Do not shrink long codes to illegible type or clip them. The prefix appears once; final groups may be shorter.

**Actual 95-character prototype example**, for the first CLI recipe puzzle including its answer/title/rating:

```text
P1. 00J50 8Y0AZ ZGKKB 4G05B ZTT0P 7N59S 6MV8A WAMHJ 1K402 T44GR BJCGG 26CE9
    1CSWD HP221 A404X 8HXPM C85N0 TH0JB D0
```

This example round-trips in the scratch decoder. **It is not accepted by the current deployed Player**; `#p=` and P1 are proposals.

### 9.2 Layout impact: measured geometry, estimated typography

Current preview top is **40 mm**, bottom limit **273 mm**, usable width **190 mm** (`core\browser\print-layout.js:15–32`). Current text is emitted as SVG text; it does not automatically wrap long codes (`core\browser\print-sheet.js:55–79`).

Proposed geometry, to validate in browser/PDF tests:

- code heading baseline near 40 mm;
- helper baseline near 45 mm;
- first code baseline at 50 mm, subsequent lines every 5 mm;
- board preview starts at `52 + 5 × codeLineCount` mm.

That adds **22 mm** for a normal two-line code, **27 mm** for three lines, and **52 mm** for eight lines. At 11 pt, a line of twelve five-symbol groups plus separators and prefix is estimated to fit within 190 mm; verify actual bundled/system monospace metrics.

Measured existing preview bottoms and remaining space:

| Case | Existing preview bottom | Space to 273 mm |
|---|---:|---:|
| Recipe 10×6 | 114 mm | 159 mm |
| Heart | 147 mm | 126 mm |
| 144 cells | 186 mm | 87 mm |
| 576 Hell 1 | 189 mm | 84 mm |
| 576 Hell 3 / irregular 558 | 207 mm | 66 mm |
| 32×18 Hell 3 | 217.5 mm | 55.5 mm |

The proposed default blocks fit the measured first-puzzle geometries without changing cut-out scale or adding a sheet, even the wide case's estimated 52 mm block. This is **not a universal layout guarantee**: a different mask, longer metadata or imported piece set can exhaust the space.

Make preview top/available height dynamic. If necessary, reduce only the reading preview within readable limits; never resize the cut-out board independently of its pieces. For genuinely long codes, show the exact extra-sheet count and use clearly labelled code continuation sheets, after the optional solution face so duplex semantics remain correct. Do not replace a self-contained code with a local library reference.

Optional QR: add a locally generated QR containing the same `#p=` URL, with quiet zone, only as a convenience. Do not replace manual text, use a remote QR service or assume a fixed QR size fits every code. A production QR library/dependency and printed scan-size tests are a separate decision.

## 10. Impact, compatibility, implementation outline and risks

### 10.1 Proposed file/module seams

| Area | Change |
|---|---|
| New `core\engine\puzzlecode.js` | Pure binary codec, normalization, CRC, bounded optional streams, single-puzzle extraction/adapter, structured errors. |
| New frozen shape/profile module(s) | P1 catalogue and stable palette/identity definitions; golden hash/test vectors. No runtime search-generation dependency. |
| `core\engine\sharecode.js` | Extend hash parsing/types for `p`, or delegate to a small shared address parser. Preserve `1z/1j` semantics and current public helpers. |
| `core\browser\handoff.js` | Route P1 through the same validated incoming/atomic-load path; build selected-puzzle URLs without library fallback. |
| `core\browser\print-dialog.js` | Supply a real single-puzzle snapshot/code, not parsed localized detail strings. Prepare/cache encoding before Print is enabled; ensure code and artwork describe the same snapshot. |
| `core\browser\print-layout.js` | Dynamic first-sheet code height, preview bounds, continuation accounting without changing cut-out scale or duplex answer placement. |
| `core\browser\print-sheet.js`, `print.css`, `print-texts.js` | Monospace SVG code block, controlled wrapping, EN/VI instructions and errors. |
| `generator\ui\puzzle-panel.js` | Pass selected raw puzzle/rating/solution and set identities/angle to the code snapshot. Never pass the entire puzzle list as encoded payload. |
| `player\app.js` | Same snapshot from `pack.puzzles[index]`; include its stored answer for code purposes even though Player still has no graphical Print solution option. Ignore current movable placements. |
| `player\ui\start-view.js`, Player controls/controller/locales | Code-entry UI, validation messages, persistent P1 hash, optional copy-code/link action. |
| `core\browser\piece-look.js` / shared render callers | Honour frozen P1 identity appearance if future look rules change; current legacy packs keep existing behaviour. |
| Tests and living/user docs | Codec/address/handoff/printing/identity/locale tests; update design brief/detail and README EN/VI. |

Pass the raw stored puzzle title separately from the localized `PrintHeading` title. Generator's `Puzzle #n` caption and Player's generated-title/index conventions can differ today; preserving a title field does not mean preserving the source pack's card ordinal or the interface language.

### 10.2 Compatibility and storage

- Do not change pack version 1, existing pack URLs, existing library entries or progress keys.
- The decoder produces an ordinary one-puzzle pack with the same piece IDs/reference cells and board coordinates, so existing progress fingerprints match.
- Use a permitted namespaced `meta` profile marker if the renderer needs an explicit P1 appearance selector; no new mandatory pack field is necessary.
- Do not derive code identity or cache invalidation only from `packId`/`progressFingerprint`: they omit display/metadata fields that the code may preserve (`core\engine\keys.js:454–469`, `:484–499`).
- The compact code is a transport projection, not a promise to retain every original pack extension, timestamp or public puzzle ID.
- Opening a P1 code must not automatically expand the URL to `#pack=` or require localStorage to remain usable.
- Existing paper printouts cannot all be retroactively repaired. With known seeds, current compatible generator and a clear drawing, manual recovery may be possible; an automatic guarantee cannot be invented for information that was never printed.

### 10.3 Small implementation sequence

1. Confirm the exactness/default-profile decisions below; freeze the P1 grammar, catalogue ordering and appearance contract.
2. Implement pure encode/decode/CRC with golden vectors and strict resource/geometry validation; adapter returns one ordinary pack.
3. Add `#p=` routing and code-entry UI; retain old routes and atomic failure behaviour.
4. Feed raw selected-puzzle snapshots from both print callers; add code preparation, layout/wrapping and copy-link.
5. Verify both apps at print options/angles/large/custom cases, then update both living specs and README together.
6. Optional follow-up: local QR and additional compression improvements only if actual usability testing calls for them.

### 10.4 Test plan for production

- Golden raw and compressed P1 vectors, CRC vector, exact byte order, padding, limits and unknown-version refusal.
- All board modes, margins, holes, disconnected valid Player masks, 1/32/64 side boundaries.
- Frozen catalogue hash, all reference orientations, large fallback pieces, piece holes, repeated shapes and custom identity overrides.
- Exact labels/colours/order/glyphs/patterns, including >20 and >26 pieces; do not rely solely on progress fingerprints.
- Clue subset representations, canonical symmetric poses, overlaps, invalid positions, K−1 clues, and both solution representations.
- Optional absent/full/foreign ratings, fractional values, UTF-8, legacy lone-surrogate fallback, missing answers.
- CRC errors, bad alphabets, substitution/insertion/deletion/transposition, truncated payloads, forward references and decompression bombs.
- `#p` alone, `i=0`, rejected `i>0`, mixed/repeated source keys, lowercase/grouped input, full pasted URL; unchanged `#pack/#lib` behaviour.
- Browser without CompressionStream/DecompressionStream; raw fallback; no synchronous solver during opening.
- Same original progress fingerprint, safe resume/Replay behaviour, no mutation of an open game on failed input.
- Print first sheet only; all sizes; all eight view angles; all option combinations; optional solution and duplex; long code wrapping; no clipping; consistent cut-out scale.
- Generator and Player print the same source puzzle information despite different visible title conventions and Player's omission of graphical solutions.
- EN/VI key/placeholder parity, keyboard/focus behaviour and errors announced accessibly.
- Existing `npm run check`, targeted tests first, then `npm run test:quick`; browser/PDF/physical A4 checks for the new feature before claiming paper readability.

### 10.5 Main risks and mitigations

1. **Manual length at scale.** Hundreds of symbols can still be tedious. Keep explicit profiles and honest lengths; QR is supplementary, not a replacement. The measured 453-character default is eight code lines, not a 12-character seed.
2. **Inherent entropy.** Choosing 576 active cells among 1,024 has over 1,007 bits of combinatorial choice before piece data. Arbitrary 78-piece RGB alone costs 1,872 bits. Compression cannot guarantee seed-sized representations of every such object.
3. **Mutable defaults.** Calling a future live palette/shape enumerator when decoding P1 would break durability. Freeze lookup/profile data and keep its tests.
4. **Print-only transforms accidentally encoded.** Capture source coordinates/angle before snapping, cropping, auto-turning and duplex mirroring.
5. **Wrong selected snapshot.** Async code preparation must be invalidated when selection/angle/content changes, or freeze the job deliberately. Never print code for an earlier puzzle beside a newer preview.
6. **Misleading rating claims.** Preserve complete v2 fields or omit the claim; do not reconstruct missing metrics from the rounded heading.
7. **Untrusted code.** CRC is not permission to trust content. Bounded decode and the existing pack validator are both required.
8. **Over-scoping.** Changing generation, introducing a hosted registry or changing all Play links is not necessary to solve the paper problem.

## 11. Open product questions, with recommended defaults

These are genuine preference/scope decisions rather than missing technical facts:

| Question for the user | Recommended default |
|---|---|
| Must reopening preserve the particular stored answer, or only the starting puzzle? | Include an existing answer. Allow a clearly labelled minimal code without it if shorter typing is more important. “Print solution” still controls only the visible answer sheet. |
| Must title/rating/seeds also survive? | Include original title and full stored rating claim; omit generation seeds/provenance from the code, retaining the current readable header as reference. |
| Is an eight-line code acceptable for large boards, and can unusually long custom cases add a continuation sheet? | Yes; show length/sheet impact beforehand, keep readable type and offer optional QR. Do not promise a tiny universal token. |
| Fewer characters or easier manual typing? | Crockford base32, case-insensitive, five-symbol groups, CRC-32C. Do not expose two confusing alphabets under one prefix. |
| Which angle should the reopened puzzle use after the Player has been manually rotated? | Snapshot the current print-job source angle, before print-only transforms. Treat Straighten/zoom/theme as separate preferences. |
| Must valid imported/hand-authored Player puzzles work, including custom identity and larger pack bounds? | Yes. Use the existing pack limits, not just the Generator's current release limits. |
| Should existing Play links now carry only one puzzle, and should entering a code reset saved play? | Keep existing whole-pack Play; add Copy this puzzle link. Preserve resume, with an explicit Replay/start-as-printed action rather than silently deleting progress. |

## 12. Working-log entry

**Start:** 2026-10-25 15:28:04 UTC+07:00.

Read the current print pipeline, both print callers, board/piece identity code, pack/share-code/address/storage seams, generation/RNG/worker logic and living specification. Verified exact print-model collisions, deterministic real 1/4-worker replay, history/calibration/uniqueness effects. Generated nine real CLI cases in scratch; built and iterated a bounded direct codec with frozen shape catalogue; measured JSON/binary/alphabet/compression variants and tested all corpus entries, mask modes, catalogue orientations and typing errors. Ran 101 existing focused tests successfully. Wrote only this new repository report.

**Incidents and chosen solutions:**

- A reduced v2 rating failed the existing validator because metrics are required: changed the prototype to retain the complete claim, and documented the compatibility constraint.
- The first history comparison happened to reproduce the same results: retained that negative control, then found a concrete differing batch seed (`3`) and tested reusing a seed against its own grown history.
- Ordinary UTF-8 cannot preserve lone surrogates accepted by the legacy reader: added an explicit UTF-16 escape form and verified it.
- DEFLATE increased normal packed payload sizes: adopted shortest-of-raw/DEFLATE selection; retained the compressible large repeated-piece control.
- Minor scratch-only script/path mistakes were corrected locally. No generation failures, dependency installs, external service calls or server/process-cleanup incidents occurred.

**End:** 2026-10-25 16:21:50 UTC+07:00 (53 minutes 46 seconds).

**Final validation:** UTF-8 without BOM, CRLF-only line endings, no trailing whitespace, final newline, 22 consistent Markdown tables and valid source-reference paths/line bounds. Tracked repository files remained unchanged. All started commands finished; no server was started or left running.

# Phase 2: review of architect-1 by architect-2

**Date:** 2026-10-25, UTC+07:00.

**Reviewed:** `docs\regenerate-puzzle\1-study-architect-1.md`, its scratch prototype/corpus, and the relevant current repository code at `80af86c32c232864f4389e825b04a227ea262420`.

**Scope:** research only. Neither Phase 1 report nor any architect-1 scratch file was modified. New experiments are in architect-2's scratch folder. This review incorporates the new requirement: **the first A4 sheet must contain a QR code as well as the typeable code**.

In citations below, `A1\` means:

```text
C:\Users\ledat\.copilot\session-state\bd310130-fd20-420b-8d77-6abb52737794\files\architect-1\
```

`A2\` means the sibling `architect-2` scratch folder. References to “A1 §…” identify sections of the reviewed study.

## 1. Summary verdict

**Adopt architect-1's structural compression ideas, with corrections before freezing a format.**

The smaller numbers are real and are not mainly obtained by sacrificing generated-piece identity. On the **same 34 puzzles**, I reproduced architect-1's exact pieces, clues, valid decoded packs and **34/34 progress fingerprints**. Its canonical-order flag is conditional; it also preserves ordinary custom identities and non-canonical order. The apparent identity disagreement between the studies is largely not a disagreement.

The major compression gains are size-aware shape coding, grouped subset ranks, early-ending breadth-first shape descriptions and locally legal placement ranks. My Phase 1 codec is less efficient on these same inputs, particularly large Hell sets. Its default also includes a solution, title and complete rating claim, which is a different payload.

There are two concrete pre-freeze blockers:

1. The proposed tiny `difficulty-v2` rating cannot become an ordinary valid rating in today's pack schema without an adapter or additional data.
2. The prototype's CRC/framing convention does not support its claimed burst guarantee: I constructed a corruption of the **short 6×10 example** that passes its checksum and pack validation while changing clues.

The new QR requirement is feasible without making typed codes longer. A full-URL, mixed byte/alphanumeric QR at EC **M**, with 0.5 mm modules and the four-module quiet zone, needs **22.5–32.5 mm** for the short-to-210-character codes, and **40.5 mm** for my 453–455-character defaults. Recommend a minimum actual printed box of 25 mm for the smaller symbols.

Prefer **one chosen code/profile per print job**, used unchanged by printed text, QR and the share URL. QR is not a reason to hide richer content in a second payload or to abandon compact manual entry.

## 2. Findings

Severity is relative to freezing and implementing the proposal, not a claim that a research prototype should already be production-ready.

| ID | Severity | Claim or issue | Evidence | Recommendation |
|---|---|---|---|---|
| R2-01 | **blocker** | “Rating costs 2–3 characters” plus “ordinary one-puzzle pack, no schema change” leaves an unresolved compatibility step. | A1 §5.2, §9.2; `A1\summary.mjs` counts metadata bits but does not decode them. `A1\check-pack.mjs` constructs packs without ratings. `core\engine\pack.js:783–785` requires v2 metrics. My reduced-rating experiment returned `missing-field: puzzles[0].rating.metrics`. | Either encode the complete claim, omit it, or define a separate display-summary representation and UI adapter. Do not invent metrics or mislabel a summary as a complete `difficulty-v2` claim. |
| R2-02 | **blocker** | The implemented checksum is not a safe basis for the stated “bursts of at most 20 bits” argument. | A1 §5.8; `A1\pcode.mjs:555–563`. A 20-bit error window crossing the data/check boundary of its 34-character 6×10 core code passes the chosen `0x6C1BD` checksum and decodes to different, pack-valid clues. Details in §4.4. | Correct and freeze the CRC convention and framing, including augmentation, bit/reflection order, padding and check placement. Prefer a fully specified CRC-32C frame, then test the complete transmitted frame, not only a polynomial. |
| R2-03 | **major** | Unique single-typo correction is not guaranteed across the full claimed Player-pack scope. | A1 §5.8. Positive exhaustive syndrome checks passed at the tested short lengths and through 5,000 symbols; a valid 6,180-character custom-identity example has two different, valid one-symbol corrections. Both retain the same CRC but change colours. | Do not promise unique correction. Keep a wider checksum and an explicit error. If suggestions are later added, bound the work, describe them as candidates and require comparison/confirmation; never silently correct. |
| R2-04 | **major** | “Every count is bounded” describes intended validation, not the actual decoder. | A1 §5.11; `A1\pcode.mjs:231–252`, `:458–465`, `:484`; counts/lengths are read before hard K/area/size/text bounds. `readSubset` at `:86–89` does not reject ranks outside `C(n,k)`. | Enforce all bounds before loops, allocations or table/placement work; reject impossible subset ranks, invalid sizes, indices, totals, UTF-8 and padding. A later `parsePack` cannot prevent excessive earlier work. |
| R2-05 | **major — new requirement** | QR was optional/later and the paper-space estimate did not reserve its rectangle. | A1 §8 and §10 question 8; superseded by the user's new requirement. Its quoted 33 mm for a 65-module QR omits the quiet zone: at 0.5 mm, the complete symbol is 36.5 mm. | Make QR first-class now. Reserve `max(text block height, QR height)` plus labels/gaps. Use full URL, explicit mixed segments, opaque white quiet zone and an exact-mm SVG path. See §6. |
| R2-06 | **major — new requirement** | “Works for every valid pack” must not silently become “every code fits one QR”. | Full pack bounds exceed the sampled generated cases. My legal 6,180-character raw example exceeds QR version 40 at every EC level. That particular example is highly compressible, so it is not a proof that its final code cannot fit. | Try bounded adaptive compression, then test actual QR capacity. Define a clear oversized-content policy; never truncate identities or substitute a browser-local `#lib` reference. QR capacity is separate from pack and URL capacity. |
| R2-07 | **minor** | The documented wire format, examples and round-trip evidence are not yet one complete version. | A1 §5.2 places padding before the check; `A1\measure.mjs` appends the check before base32 padding. `A1\typo-test.mjs` tries padding lengths. The displayed example uses the default `0x8359D`, not the recommended `0x6C1BD`. Rating/number lengths are counted rather than encoded/decoded. | Publish one executable end-to-end writer/reader and regenerate golden strings. Label current rating/number-inclusive lengths as bit-accounted size measurements, not completed metadata round trips. |
| R2-08 | **minor** | Freezing the engine palette alone does not freeze the visible cut-out identity. | A1 §5.10; `core\browser\piece-look.js:16–30`, `:57–75`; `core\engine\palette.js:77–88`. Display remapping, circle/square/disc marks and pattern assignment also matter. | Freeze the complete identification profile for old codes, not just stored RGB derivation. Preserve arbitrary data instead of blindly canonicalizing it. |
| R2-09 | **minor** | A puzzle number does not preserve arbitrary titles, and a fingerprint does not prove appearance preservation. | A1 §3 and §5.2; `player\puzzle-title.js:26–31`; `core\engine\keys.js:415–421`, `:454–469`. Title, colours, labels, order and angle are excluded from some identities. | Treat number/title as optional presentation metadata. Explicitly test ordered pieces, colours, glyphs, patterns and angle in addition to the fingerprint. Do not claim that a numeric suffix preserves a custom title. |
| R2-10 | **minor** | Warm decode timing and “only PREVIEW_TOP moves” understate integration work. | A1 §5.4, §6.5, §8. I measured **549 ms** cold construction of the ≤10 tables. Existing print jobs are synchronously reread during dialog refresh/Print (`core\browser\print-dialog.js:181–229`). | Ship frozen tables or prepare off the main thread. Cache a complete immutable selected-puzzle/code/QR snapshot; invalidate correctly. Make preview space dynamic, including QR, solution-sheet heading and continuation accounting. |
| R2-11 | **minor** | “Every valid pack” has a small string-compatibility edge not covered by the ordinary custom example. | `A1\pcode.mjs:357`, `:484`; a label containing lone UTF-16 surrogate `0xD800` is accepted by current `parsePack`, but its codec returns replacement character `0xFFFD`. | Add a lossless escape form, as in my prototype, or explicitly narrow the contract with a clear refusal. Do not silently change an accepted piece label. |

The largest ordinary generated codes are not evidence of a fundamental inability to compress better. A1 §6.3's claim that no seed-free encoding can make the large pieces much shorter is stronger than its measurements establish; generated shapes are not a uniform sample of all free polyominoes. Its own measured improvement is nevertheless compelling enough to adopt now.

## 3. Verified points of agreement and current-state audit

### 3.1 Printing, URLs and packs

Architect-1's principal current-state account is correct:

- First sheet always contains the starting clue picture and remaining pieces; full-size board sheets do not themselves supply clue positions.
- Piece-set sheets include the locked pieces as unlocked cut-outs.
- The Player prints the original puzzle, not current movable placements, and offers no graphical solution sheet.
- Missing rating/seed/set data is omitted.
- The board is cropped to active bounds, the odd 45° step is discarded, and printing can add a quarter-turn.
- Labels can disappear below 2.5 mm.
- Generator URLs describe board/set settings, not puzzle content.
- Existing `#pack` transports the supplied pack and `#lib` is local-storage dependent.

These agree with the shared implementation, especially `core\browser\print-layout.js:55`, `:86–137`, `:492–507`; `core\browser\print-sheet.js:146–204`, `:244–290`; `generator\ui\puzzle-panel.js:170–193`; `player\app.js:357–379`; `generator\address.js:21–38`; `core\browser\handoff.js:76–113`.

A useful wording refinement: one can count the visible grid and redraw a playable outline; what is not recoverable is the **authored grid frame**, including margins/origin and its relationship to the original view. “Not exact” should not be read as “the visible board cannot be copied at all”.

Neither a picture nor optional browser-generated print headers can be relied on as the missing portable data.

### 3.2 E3 is correct, but it is a grid transformation, not a view rotation

I ran `A1\exp-repro.mjs` unchanged. For its seed `a1-6x10`, Hard:

| Experiment | Reproduced result |
|---|---|
| Same board/seed/level/mode | Same shapes, IDs, labels and colours. |
| Right/left blocked column or bottom blocked row | Same shapes for this case. |
| E3, actual grid changed from 10 columns × 6 rows to 6 columns × 10 rows | **Different shapes.** |
| E4, require-unique | Same set for this seed, both attempt zero; the report correctly qualifies this as one result. |
| E5, batch seed `2718281828`, no calibration / reusable calibration | Different puzzles, score **19 / 17**. |
| Different seed `1234567` with the calibration | Same calibration puzzle. |
| E6, prior result put in history | Different puzzle, score **19 → 18**. |
| E7, rerating selected generated examples | **19/19** match score, level and saturation. |

The `turned` construction in E3 really transposes/reverses the **rows**. It is not `presentation.rotation`. Changing only the presentation angle does not change generation (`core\engine\generate.js:82–95`); my Phase 1 independently tested that. Both facts can be true.

E2 is evidence for that board/seed, not a general proof that arbitrary board edits or every form of padding can never influence generation. It does not rescue exact paper reproduction: board rows and shifted clue coordinates still enter the fingerprint.

The history/calibration conclusion is solid. The printed batch seed is not an independent puzzle address. The current default quantity is five, and all accepted puzzles of one request receive the same batch seed (`generator\state.js:104`; `generator\jobs.js:338`).

The statement “a slow device could fail but never differ” should be qualified: completed semantic requests are deterministic, but timestamps, accepted-prefix length, cancellation and the subsequent history can differ. That qualification supports direct encoding; it is not a reason to discard the deterministic engine.

### 3.3 Identity: there is no need to choose between compactness and correctness for generated sets

I inspected and exercised `identityFlags`:

- `order` is true only if the **existing** array already has strict canonical order.
- `cellsCanonical` is a separate flag.
- `defaults` is true only if every actual ID, label and colour matches its default for that ordinal.
- The encoder does **not** sort an arbitrary imported set and overwrite its identity.
- When flags are false it writes individual shapes, reference transforms and explicit identity fields.

Evidence: `A1\pcode.mjs:272–285`, `:315–358`, `:480–489`.

My independent common-corpus run found:

```text
34/34 exact ordered piece arrays
34/34 exact clue arrays
34/34 valid reconstructed packs
34/34 matching progress fingerprints
```

I also ran its codec on my reversed-order, renamed-ID, Unicode-label and custom-RGB fixture. It preserved those pieces and clues. The custom-data escape path is real, not just a proposed sentence.

What must survive:

1. Exact board rows/origin and source-oriented piece cells.
2. Original piece IDs, so poses and fingerprints refer to the same pieces.
3. Original labels and RGB values, plus original piece-array order/count, so glyph marks and patterns match the cut-outs.
4. Exact clue occupied cells and source presentation angle.
5. A frozen visible identification profile if old papers must still match after future appearance changes.

A progress fingerprint alone proves neither 3 nor the angle. Conversely, changing an arbitrary opaque **puzzle** ID does not lose progress: the fingerprint, not that public ID, keys progress. A1's `example-1` fixture is correctly distinguished from generated IDs.

## 4. Resolving the numerical divergence

### 4.1 Same puzzles, same profiles

I imported the original peer encoder read-only and an instrumented copy in my own scratch folder. The instrumentation only divides bit counters; I asserted byte-for-bit equality of the emitted bit arrays with the original. Both codecs then ran on all 34 peer corpus puzzles.

**Measured:** first puzzle in each indicated peer pack. “A1 reported default” includes its separately counted score/saturation/number bits, but no stored solution. “A2 full default” includes stored solution, full title and complete rating claim.

| Common input | Pieces / clues | A1 actual core, CRC included | A1 reported default | A1 reported + solution | A2 actual core | A2 core + solution | A2 full default |
|---|---:|---:|---:|---:|---:|---:|---:|
| Player sample | 9 / 5 | 35 | 36 | 37 | 53 | 56 | 87 |
| Hand-authored fixture | 10 / 2 | 42 | 42 | 46 | 53 | 61 | 74 |
| `6x10` | 9 / 3 | 34 | 36 | 37 | 50 | 55 | 93 |
| `heart10` | 14 / 3 | 36 | 39 | 44 | 58 | 71 | 122 |
| `12x12` | 19 / 3 | 57 | 60 | 71 | 91 | 111 | 170 |
| `18x20hell2` | 50 / 3 | 94 | 97 | 142 | 178 | 247 | 303 |
| `22x22hard` | 19 / 8 | 183 | 186 | 187 | 232 | 245 | 283 |
| `24x24hard` | 20 / 8 | 207 | 210 | 211 | 267 | 282 | 320 |
| `24x24master` | 23 / 5 | 201 | 203 | 208 | 255 | 279 | 323 |
| `24x24` Hell 3 | 76 / 3 | 133 | 136 | 212 | 275 | 392 | 450 |
| `32x18` Hell 3 | 84 / 3 | 105 | 108 | 198 | 255 | 384 | 442 |
| `irr558` | 76 / 3 | 137 | 140 | 218 | 280 | 397 | 455 |
| `26x26hard`, CLI-only area | 20 / 8 | 243 | 245 | 247 | 303 | 315 | 354 |

These replace an apples-to-oranges comparison of my 453-character Hell default with A1's 210-character **Hard, no-answer** example. Even after correcting that comparison, A1's core is substantially shorter.

The original studies also used different seeds/piece sets for several nominally identical board sizes: my 144-cell example has 21 pieces, its example 19. The same-input table removes that variation.

### 4.2 Field-level accounting

All numbers below are **measured bits**, before checksum/framing/padding. Zero means no corresponding field/data is emitted in that profile. A2's literal `P1.` prefix is outside its binary payload.

| Field | A1 6×10 | A2 same 6×10 | A1 24×24 Hell 3 | A2 same Hell 3 | A1 24×24 Hard | A2 same Hard |
|---|---:|---:|---:|---:|---:|---:|
| In-body version | 5 | 0 | 5 | 0 | 5 | 0 |
| Solution-present flag | 1 | 1 | 1 | 1 | 1 | 1 |
| Metadata-present flag, core profile | 0 | 1 | 0 | 1 | 0 | 1 |
| Width/height | 12 | 12 | 12 | 12 | 12 | 12 |
| Mask mode/data, full rectangle | 2 | 3 | 2 | 3 | 2 | 3 |
| Angle | 3 | 3 | 3 | 3 | 3 | 3 |
| Piece count | 6 | 7 | 10 | 7 | 6 | 7 |
| Identity/canonical flags | 3 | 2 | 3 | 2 | 3 | 2 |
| Sizes + shapes + reference orientation | **82** | **124** | **547** | **1,216** | **886** | **1,128** |
| Clue count/subset/order/poses | 32 | 32 | 59 | 72 | 97 | 119 |
| **Core payload total** | **146** | **185** | **642** | **1,317** | **1,015** | **1,276** |

The A1 size/shape subtotals split as:

| Input | Size stream | Shape stream |
|---|---:|---:|
| 6×10, sizes `[10,9,8,8,6,6,5,4,4]` | 23 | 59 |
| 24×24 Hell 3 | 96 | 451 |
| 24×24 Hard | 40 | 846 |

For the 6×10 clues, A1 spends 3 bits on count, 1 on order flag, 7 on the subset, and 21 on poses. A2 spends the same 32 total here; legal-placement ranking is not a saving on every input. On the common Hard board the whole clue section is 97 versus 119 bits.

**Framing example, common 6×10 core:**

- A1: 146 data bits + 20 check bits + 4 final pad bits = **170 bits / 5 = 34 characters**.
- A2: 185 data bits + 7 byte pad bits = 24 bytes; add one codec byte and four CRC bytes = 29 bytes; base32 needs 47 characters; add literal `P1.` = **50 characters**.
- A1's counted display metadata adds 11 bits, bringing its reported value to **36**.
- A2's selected solution adds 26 bits and complete title/rating metadata adds 191 bits, producing **93** on this same puzzle.

Thus the 34→50 core gap contains both about nine characters of less efficient structural representation and about seven characters of framing/padding policy. The 36→93 headline gap also includes substantially different data.

### 4.3 Choices versus avoidable costs

**Adopt from A1:**

- Sizes before shapes, with small delta codes when the original set is already canonical.
- Grouped subset ranks for distinct same-size catalogue shapes, not an independent index for every shape.
- Catalogue coverage through size ten, subject to a frozen-table/startup strategy.
- For larger pieces, omit impossible cells before the root and stop when the known cell count has been found. My original frontier representation encodes unnecessary negative decisions around the boundary.
- Truncated binary for bounded alternatives.
- Locally legal placement/cover candidates instead of spending bits on impossible coordinates or piece/orientation combinations. This is geometry enumeration, not a backtracking solver.

**Real policy choices, not codec inefficiencies:**

- Stored solution versus no answer.
- Whole rating claim/title versus a small display summary/ordinal.
- CRC-32C versus 20 bits, recognisable prefix, and a compression indicator.
- Simpler implementation versus tighter bitpacking of rare fields.

**Not the cause of the generated-code difference:**

- Supporting 64-cell sides: both use 6+6 dimension bits.
- Supporting custom identities: both elide defaults for the measured generated cases.
- Preserving original piece order: A1's grouped encoding only applies when that order is already canonical.

There are further small simplifications available. The **piece-array order** must remain exact, but the order of non-overlapping **clue records** need not. Canonically visiting clues by preserved piece ordinal can remove A1's clue-order flag/permutation without changing appearance or progress. This is a conscious semantic-equality choice, not permission to sort the pieces.

The “minimal JSON” numbers also use different definitions. A1 measures a new compact object with keys `r/a/p/c`, omitting IDs/labels/colours under default assumptions; mine measures a valid one-puzzle pack with those fields. A1's 172-character result and my 526-character result are not contradictory measurements of the same payload (`A1\measure.mjs`, minimal-JSON construction). Neither beats the improved binary core.

### 4.4 Integrity experiments: positive results and concrete counterexamples

I did not assume the 20-bit choice was weak merely because it is shorter.

For polynomial `0x6C1BD`, I calculated the syndrome of **every non-version single-symbol substitution** for the implemented frame:

| Frame length | Substitution patterns | Equal syndromes at different positions |
|---|---:|---:|
| 34 characters | 1,023 | 0 |
| 207 characters | 6,386 | 0 |
| 245 characters | 7,564 | 0 |
| 500 characters | 15,469 | 0 |
| 1,000 characters | 30,969 | 0 |
| 2,000 characters | 61,969 | 0 |
| 5,000 characters | 154,969 | 0 |
| 8,000 characters | 247,969 | 3,294 |

This is stronger positive evidence for normal generated lengths than sixty randomly chosen correction trials. It still is not a guarantee for every valid Player payload.

**Valid two-candidate example.** I used a valid 64×16 board with 128 eight-cell pieces, unique eight-character IDs, valid four-code-point labels and explicit colours. One label was shortened within the same limits. The resulting core code is 6,180 characters. Two codes differing only at one-based positions **383 and 6,115** both pass the selected CRC and decode into valid packs:

- symbols `4,9` versus `3,N`;
- colours change only on pieces `p0000000` and `p0000126`;
- `#123456` becomes `#11b456` and `#2a3456`, respectively.

A damaged string between them is **one substitution away from each**. Structure checks do not disambiguate it. This is a constructed legal boundary case, not a claim about the likelihood of normal users encountering it.

**More immediate framing problem.** For the actual 6×10 core body, length 146 bits, flip bits according to mask **914223** in the 20-bit window starting at zero-based position **131** in `body | check`. This crosses the data/check boundary. With polynomial `0x6C1BD`:

- the checksum still passes;
- the decoder consumes the body;
- the reconstructed pack validates;
- the clue placements differ.

The feedback step in `crc()` already accounts for an `x^20` augmentation, then the function clocks another twenty zero bits. Appending that result as the systematic check does not have the standard convention underlying the cited burst guarantee. The experiment, not merely that explanation, establishes the defect.

The report's printed example also identifies the convention mismatch:

```text
Default 0x8359D: 128M11VAAX56244P0S71A5CWYTKGD2R7KG
Chosen 0x6C1BD:  128M11VAAX56244P0S71A5CWYTKGD7HCF0
```

Use neither as a production golden vector until padding, augmentation and all optional fields are finalized.

A CRC-32C field costs approximately **three additional base32 symbols** over a 20-bit field. That is a good trade for a durable printed format. It is still an integrity check, not authentication, and I would not promise automatic correction from it.

## 5. Proposed unified positions

These are my revised recommendations after the common-input results and mandatory-QR requirement.

| Divergence | Unified position |
|---|---|
| **(a) Compactness** | Use A1's size-aware/grouped shape encoding and legal pose/cover ranks. Retain an explicit fallback for arbitrary sets. My Phase 1 simple per-piece representation should not be kept merely for consistency with my first report. Publish final sizes only after actual end-to-end encoding of all chosen fields. |
| **(b) Identity** | Preserve exact board frame, source piece cells, IDs, labels, RGB, order/count, clue occupied cells and source angle. Use conditional default/canonical flags, as A1 already does. Never blindly sort/relabel imports. Freeze visible glyph/pattern/colour interpretation; test it separately from fingerprints. |
| **(c) Default contents** | Prioritize a **lean starting-puzzle code**: no solution or provenance by default. Title, ordinal and rating are optional presentation data; do not silently upgrade a score summary to a full rating claim. Keep current readable heading/reference information. A full-fidelity metadata profile can carry complete claims/text when requested. This revises my Phase 1 answer-included default in favour of the user's manual-entry priority. |
| **(c), solution printing** | Choose one contents profile for a print job. If an answer-inclusive code is requested, put **that same code** in text and QR on the first sheet and any answer sheet. Otherwise use the lean code everywhere. Do not print a lean first-sheet code and a differently populated QR, or two ambiguously labelled “Puzzle codes”. Whether the existing Print solution checkbox selects the full profile is a product choice below. |
| **(d), checksum/prefix** | Prefer fully specified **CRC-32C**, recognisable **`P1.`**, uppercase Crockford base32 with case-insensitive/alias-tolerant entry. Fix/test the full frame before freezing. No automatic typo repair in the initial release. |
| **(d), grouping/compression** | Prefer **groups of four** to match existing seeds; four versus five is a minor UI choice, not information loss. Line wrapping must follow available width beside QR, not a fixed number of groups everywhere. Try raw/DEFLATE and retain the shorter full encoding, with an explicit protected codec flag. |
| **(e), scope** | Preserve the current Player's full pack-domain identity, not only generated sets. Keep existing pack bounds; do not impose generator release limits on imported content. Separately enforce code/decompression/QR capacity limits and define a truthful oversize error. |

Two clarifications:

1. A **display summary** can be compact and useful. If the user wants it, put it in a defined summary extension, for example namespaced metadata, and have presentation code consume it as such. Do not assign `{model:"difficulty-v2", score, level, saturated}` to `pack.puzzles[0].rating`; that is invalid today. Deriving level from score also requires a consistency check or escape form for accepted foreign/inconsistent claims and non-integer scores.
2. The same code guarantee should mean **the selected projection/profile** produces the same content, not that all possible answer/metadata profiles or all compressor implementations must have one identical string.

Keep old Generator Play's whole-pack links. Add the selected-puzzle `#p=` path without removing existing navigation. For `#p`, accept no index or `i=0`; reject a nonzero index rather than silently ignoring a suspicious copied `i`. Do not change legacy `#pack`/`#lib` rules.

## 6. QR code

### 6.1 Mandatory, full URL, same code

QR is now a required first-sheet element, not a later enhancement. It must encode:

```text
https://tdat00.github.io/pentomino/player/#p=<the-exact-printed-code>
```

A bare code saves some QR space but does not let an ordinary phone camera open the puzzle directly. The full URL is the better user experience and matches the new requirement.

Use two explicit QR segments:

1. **Byte segment:** the exact URL prefix, currently 45 ASCII bytes.
2. **Alphanumeric segment:** the canonical uppercase, ungrouped Crockford code, including `P1.` if that prefix is selected.

QR alphanumeric mode supports the Crockford alphabet and period. It uses eleven bits for each character pair, six for an odd final character, plus mode/count headers. Byte mode uses eight bits per byte. The measured version selection below includes those headers and real QR capacity rules.

**Do not uppercase the whole URL.** GitHub Pages paths such as `/pentomino/player/` are case-sensitive. Only the new code is case-insensitive; legacy base64url pack data is not. Ordinary `encodeText(fullUrl)` in the candidate browser library chooses byte mode for this lowercase-containing URL, so supply the two segments explicitly.

The QR must not carry a longer/richer answer than the visible code. Normalize grouping away for the URL but retain the same semantic payload and checksum. If the user chooses a fuller profile, both typed text and QR change together.

### 6.2 Deployed URL versus page base

For a production deployment, deriving `../player/` from a correct published base preserves repository/fork paths and is appropriate for normal in-browser links.

**Paper needs a portable public target.** `document.baseURI` on `localhost:8712`, a file URL or a developer-only host does not produce a phone-shareable paper link. The QR can be scanned correctly yet open the phone's own localhost.

Recommendation:

- Configure the public print Player base explicitly, defaulting for this project to `https://tdat00.github.io/pentomino/player/`.
- Preserve the exact path case.
- On the deployed site this can agree with the runtime-resolved base.
- Local/dev print previews should display the intended public target and warn if a local target is deliberately selected. A LAN/dev override is useful for testing but must not masquerade as a portable publication.
- Ensure the matching decoder has actually been deployed before publishing real paper codes. A QR cannot make the current unimplemented `#p` route work.

Do not contact a URL-shortening or QR-rendering service. QR generation sends **no puzzle data** anywhere.

### 6.3 Measured QR versions, modules and printed size

I downloaded the MIT-licensed Project Nayuki reference encoder into my own scratch folder and ran `encode_segments` with explicit byte/alphanumeric segments at L/M/Q/H, versions 1–40, **EC boosting disabled**. For capacity measurements the mask was fixed; version/size do not depend on which mask is selected.

Rows based on A1's rating/number-inclusive figures remain **QR capacity measurements at those exact code lengths**, not proof that its missing metadata decoder is complete. Different strings of the same length and specified segment modes have the same capacity requirement.

Each table entry is:

```text
version / dark-and-light symbol modules per side / complete side in mm at 0.5 mm/module
```

The millimetres **include four quiet-zone modules on every side**:

```text
symbol modules = 17 + 4 × version
printed side = (symbol modules + 8) × module size
```

| Code length and example | L | M | Q | H |
|---|---|---|---|---|
| 36–37, A1 small without/with answer | v4 / 33 / 20.5 | v5 / 37 / 22.5 | v6 / 41 / 24.5 | v8 / 49 / 28.5 |
| 40, A1 Heart range | v4 / 33 / 20.5 | v5 / 37 / 22.5 | v6 / 41 / 24.5 | v8 / 49 / 28.5 |
| 44, A1 Heart with answer | v4 / 33 / 20.5 | v5 / 37 / 22.5 | v7 / 45 / 26.5 | v8 / 49 / 28.5 |
| 60–71, A1 144 cells without/with answer | v5 / 37 / 22.5 | v6 / 41 / 24.5 | v8 / 49 / 28.5 | v9 / 53 / 30.5 |
| 95, my Phase 1 small full default | v6 / 41 / 24.5 | v7 / 45 / 26.5 | v9 / 53 / 30.5 | v10 / 57 / 32.5 |
| 119, my Phase 1 Heart full default | v6 / 41 / 24.5 | v8 / 49 / 28.5 | v9 / 53 / 30.5 | v11 / 61 / 34.5 |
| 168, my Phase 1 144-cell full default | v8 / 49 / 28.5 | v9 / 53 / 30.5 | v11 / 61 / 34.5 | v13 / 69 / 38.5 |
| 210–211, A1 576-cell Hard without/with answer | v8 / 49 / 28.5 | v10 / 57 / 32.5 | v12 / 65 / 36.5 | v14 / 73 / 40.5 |
| 218, A1 irregular 558 with answer | v9 / 53 / 30.5 | v10 / 57 / 32.5 | v12 / 65 / 36.5 | v15 / 77 / 42.5 |
| 261, A1 CLI 676-cell example with answer | v9 / 53 / 30.5 | v11 / 61 / 34.5 | v13 / 69 / 38.5 | v16 / 81 / 44.5 |
| 293, my largest core without answer | v10 / 57 / 32.5 | v11 / 61 / 34.5 | v14 / 73 / 40.5 | v16 / 81 / 44.5 |
| 395, my largest core with answer | v11 / 61 / 34.5 | v13 / 69 / 38.5 | v16 / 81 / 44.5 | v19 / 93 / 50.5 |
| 453–455, large full defaults across the two corpora | v12 / 65 / 36.5 | v14 / 73 / 40.5 | v17 / 85 / 46.5 | v20 / 97 / 52.5 |

At 0.4 mm/module, multiply the listed millimetres by 0.8. For example:

- 36-character/M symbol: 18.0 mm;
- 210-character/M symbol: 26.0 mm;
- 453-character/M symbol: 32.4 mm.

**Recommended default:** EC **M**, 0.5 mm modules, four-module opaque white quiet zone, and a **minimum printed box of 25 mm** for smaller symbols. Allow an EC increase that does not increase the selected version if desired. Do not force a large H symbol into an M-sized box and thereby make its modules too small.

A 0.4 mm pitch may be workable but should require actual printer/phone evidence before becoming the default. These are measured geometry/capacity results, not a claim that every damaged print or every camera will scan reliably.

### 6.4 Segment-mode savings and correction of A1's QR remarks

**Measured EC M versions:**

| Code characters | Entire URL as bytes | Byte prefix + alphanumeric code | Bare alphanumeric code |
|---|---:|---:|---:|
| 36 | 5 | 5 | 2 |
| 40 | 6 | 5 | 3 |
| 71 | 7 | 6 | 4 |
| 95 | 8 | 7 | 5 |
| 210 | 12 | 10 | 8 |
| 453 | 17 | 14 | 13 |

A1's version-5 estimate for an 81-character URL is correct in byte mode. Its version-12 estimate for a 255-character URL is also correct in byte mode, but mixed segments reduce that case to **version 10**.

The quoted approximately 33 mm for 65 modules at 0.5 mm excludes the quiet zone. Version 12's complete side is **36.5 mm**. The mixed-segment version 10 complete side is **32.5 mm**.

### 6.5 First-sheet layout

Normal generated examples fit comfortably within A4's 190 mm usable width:

- Allocate a full-width reconstruction band under the heading.
- Put grouped code/instructions on the left and QR on the right, with a real gap.
- Use a solid white QR background; no grid, hatching, caption or cut line may enter its quiet zone.
- Compute band height from the greater of text height and complete QR height, then add captions/gaps.
- Keep 10–11 pt monospace text and wrap at **group boundaries according to available width**. Four-character grouping does not require a fixed ten groups on every line.
- Move/reflow the preview using the measured band height; do not alter the full-size board/piece scale.
- If typed code requires continuation, label it clearly rather than making characters illegibly small. Keep the complete QR on the first sheet.
- Do not mirror QR on a duplex back. Current cut-out mirroring is for board/piece geometry, not a barcode.

Use shared EN/VI labels such as **Scan to open / Quét để mở** and **Puzzle code / Mã đề**. Keep the public Player address or a short opening instruction readable beside the code; do not rely on the camera alone to explain what the square does.

This means the first band for a small code is closer to the QR's **25 mm minimum plus headings/gaps**, not A1's +9 mm text-only estimate. Large normal codes remain roughly 33–41 mm QR boxes, so the layout change is manageable.

The studies' no-QR preview-space calculations cannot be treated as final acceptance. Test every print option/rotation with the new band, especially `fit_page`, solution/duplex placement and long custom data.

### 6.6 Capacity is finite

A preliminary 1,860-character custom-identity raw code fits at:

- L: version 26, 121 modules, **64.5 mm** complete at 0.5 mm;
- M: version 30, 137 modules, **72.5 mm**;
- Q: version 36, 161 modules, **84.5 mm**;
- H: does not fit version 40.

The actual 6,180-character long test code does not fit any EC level even at version 40. That example's 3,863-byte raw frame compresses to **419 bytes**, so adaptive compression is a useful remedy, not an optional optimization to dismiss from the generated-only corpus.

Nevertheless, a general “any valid pack” promise requires explicit **post-compression** capacity handling. QR Model 2 stops at version 40; its 177 modules plus quiet zone occupy 92.5 mm at 0.5 mm pitch, but enlarging a symbol cannot add more capacity.

Do not silently switch to a shorter code with different content, `#lib`, a third-party shortener or a richer bare-code QR that ordinary cameras cannot open. Detect failure before printing and offer a clearly identified smaller metadata profile or an explicit diagnostic. A rare oversized custom-content policy remains a user decision.

### 6.7 Implementation: vendor a small audited encoder, not a new QR algorithm

**Recommendation:** vendor a pinned, MIT-licensed compiled ES6 Project Nayuki encoder, with a thin local ES-module adapter.

Reasons:

- It implements all versions and EC levels, byte/alphanumeric segments, Reed–Solomon, placement, format/version information and automatic mask selection.
- It has no external runtime dependencies.
- Writing these parts in-house is substantially more correctness/testing work than writing the SVG renderer, and none is puzzle-specific.
- Vendoring is compatible with a static site/no build step: commit the chosen compiled JavaScript, not TypeScript requiring a production compiler.

**Measured candidate browser source:**

```text
Source: https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js
License: MIT, complete notice retained
Source bytes: 45,350
gzip level 9: 11,756 bytes
SHA-256: 2511bc17f40a3c41d4a0578995db956b38997334d3d20113a5d4dc5c49c69480
```

This is the fetched reference build, not a recommendation to load a mutable upstream URL in production. Choose and record a pinned release/commit/checksum when vendoring.

I added an ES-module export **only to a copy in my scratch folder**. Its local module graph passed the repository's `checkSite(..., {entries:[...]})`. This checks the module seam, not complete production integration.

Relevant constraints:

- Browser imports must be local relative **`.js`** paths; no bare npm specifier, external CDN or browser `.mjs` (`tools\check-site.mjs:38–80`, `:102–126`).
- Keep it under a published directory such as `core\browser\vendor\`, not `tools`, `tests` or `docs`.
- Use existing strict CSP; no inline script, `eval`, network QR request, inline-style exception or remote image.
- Normalize repository line-ending/whitespace conventions while retaining the MIT notice; document the small adapter/formatting changes.
- Run the full production checker/version-stamping path during implementation, not just the scratch entry check.

Render the module matrix in `core\browser\print-sheet.js` as an opaque white rectangle plus one black SVG `<path>` made from row runs. Use exact millimetres and a viewBox/module transform, no strokes, no logo and no theme-dependent colours. The existing per-page SVG coordinate system is already 1 unit = 1 mm (`core\browser\print-sheet.js:2–4`, `:88–94`).

I generated a real **26.5 mm** SVG from my actual 95-character example's 140-character URL with the JavaScript encoder: **version 7/M, 45 symbol modules**, automatic mask selection. The result is `A2\cross-qr-example.svg`.

Authoritative sources inspected:

- [Project Nayuki library, features, license and segment API](https://www.nayuki.io/page/qr-code-generator-library)
- [Official Python reference source](https://github.com/nayuki/QR-Code-generator/blob/master/python/qrcodegen.py)
- [Official compiled browser reference](https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js)

Only public encoder sources were fetched. No puzzle data was sent to any service.

### 6.8 QR tests and effect on earlier trade-offs

Test strategy:

1. Pin actual payload bytes: decoded QR text must equal the complete URL, including path case and the exact normalized printed code.
2. Test explicit segments and compare version selection to the independent reference port at capacity boundaries and every EC level.
3. Use an independent QR **decoder** in tests only. A vetted test-only dependency is acceptable; it must not ship in the browser. A decoder accepting an RGBA array can consume a raster made directly from the module matrix, avoiding a production canvas/image dependency.
4. Test representative actual codes, QR rotations, quiet zones, supported scaled rasters and mild damage. A same-library encoder/encoder comparison is not a substitute for decode round trips.
5. Check SVG placement/bounds and all A4 layout variants.
6. Physically print at 100% on ordinary printers and scan with several Android/iPhone cameras. Confirm the URL opens the deployed Player and reproduces the same board/pieces/clues.

No independent image decoder or physical printer/camera test was run in this review; those remain release acceptance work.

**QR does not repeal the manual-entry requirement.** Keep the typed code compact. Do not add an answer or full metadata solely because a QR can accommodate it. QR and text should contain one selected code; opt-in richer profiles are fine when both representations remain consistent.

The typeable code still needs its own checksum: QR error correction does not help a human typing from paper.

## 7. Implementation plan adjustments

Retain A1's useful module/load seams, with these concrete gates:

1. **Freeze the contract and frame:** essential identity; metadata/answer profiles; CRC convention; padding; prefix and compression flag. Encode/decode all selected fields, then generate golden vectors.
2. **Implement bounded compact content coding:** grouped shapes and sized BFS, preserved identity fallbacks, valid subset ranks, bounded local placement enumeration. Precompute/freeze tables or prepare asynchronously; do not perform a 549 ms table build inside a synchronous print callback.
3. **Add Player loading and entry:** `#p` exclusivity, normalized code retention, safe invalid-input behaviour, old routes unchanged, explicit resume/Replay behaviour.
4. **Add mandatory local QR:** pinned encoder, explicit public target, byte/alphanumeric segments, capacity preflight, EC/physical sizing.
5. **Prepare one immutable print snapshot:** selected puzzle, source angle, code string, full URL, QR matrix, and all metadata used by the artwork. Repeated size-radio refreshes should only relayout it. Detect selection/content changes before Print.
6. **Lay out the band and continuations:** QR plus text, actual measured heights, existing solution/duplex ordering preserved. Do not encode the paper-snapped/auto-rotated board model.
7. **Extend tests and living docs together:** code/QR/URL equality, full identity rather than hashes alone, legacy strings and schema boundaries, corruption and bounds, full browser/PDF/physical A4 acceptance.

Keep saved pack/progress formats compatible. Decoded P1 can still be an ordinary one-puzzle pack; a display-summary or appearance selector belongs in a defined adapter/metadata convention, not fabricated mandatory rating fields.

Update `docs\design-brief.md`, `docs\design-detail.md` and both README language sections to say that **code and QR**, not seeds alone, provide reproduction.

## 8. Questions genuinely requiring the user's decision

Engineering defaults such as local SVG rendering, preserving imported identity and bounded parsing do not need to be delegated back to the user.

| Product question | Recommended default |
|---|---|
| Is re-creating the stored rating/title/old puzzle number part of “exact”, or is the exact starting puzzle sufficient? | Exact board/pieces/clues/angle are mandatory. Keep rating/title/number out of the minimal code and leave the readable heading as reference; offer full-fidelity metadata explicitly. If cheap summary round-tripping is required, approve a dedicated summary/UI representation rather than fake metrics. |
| Should checking Print solution automatically select an answer-inclusive code? | Yes is a reasonable simple policy, but use that **one full code** consistently in text and QR on all relevant sheets. With the option off, use the lean code. Do not make the QR secretly richer than the text. |
| What public target should local/self-hosted printouts use? | This project's configured deployed Player URL, shown in the dialog. Permit an explicit warned dev/LAN override; never silently publish localhost. |
| What should happen if valid custom content still cannot fit one QR after compression? | Preserve identity, diagnose before printing, and offer an explicitly smaller optional-metadata profile. Do not truncate or use local/hosted lookup substitutes. Confirm whether such extreme inputs should be refused by the code-print feature or receive a separately designed multi-part workflow. |

The QR itself is **not** an open question anymore: it is required.

## 9. Evidence, reproducibility and working log

New artifacts, all in A2 scratch:

| Artifact | Evidence |
|---|---|
| `review-source-hashes.json` | Initial hashes of 65 protected peer/source inputs, including both Phase 1 reports. |
| `pcode-a1-instrumented.mjs` | Own copy with additional bit-accounting sections; original bit output was asserted unchanged. |
| `cross-common.mjs`, `cross-common-measurements.json` | Both codecs on the same 34 peer corpus puzzles; field counts and identity/fingerprint checks. |
| `cross-metadata.mjs`, `cross-metadata-identity.json` | Reduced-rating rejection, normal custom-identity success, lone-surrogate loss. |
| `cross-crc-v2.mjs`, `cross-crc-evidence.json`, `cross-crc-ambiguous-codes.json` | Exhaustive syndrome comparisons and the valid long-code correction ambiguity. |
| `cross-framing-check.json` | Both short-code checksum vectors and the verified boundary-burst counterexample. |
| `cross-long-compression.json` | 3,863→419-byte DEFLATE control. |
| `qrcodegen_reference.py`, `qrcodegen_reference.js` | Public MIT reference sources; notices retained. |
| `cross-qr-measure.py`, `cross-qr-measurements.json` | QR versions, module counts and sizes at all EC levels. |
| `cross-qr-browser.mjs`, `cross-qr-browser.json`, `cross-qr-example.svg` | Real JS/ES-module/SVG seam and site-checker evidence. |

To rerun, first select A2's scratch folder. `cross-common.mjs`, `cross-metadata.mjs`, `cross-crc-v2.mjs`, `cross-qr-measure.py` and `cross-qr-browser.mjs` write only there. Do not run `A1\measure.mjs` as a review command: it writes its own `measure.json`; I used my own driver instead.

**Start:** 2026-10-25 16:24:02 UTC+07:00.

Read A1's complete report and relevant prototypes; reran E1–E7; compared both codecs on the same 34 puzzles with field-level instrumentation; checked ordinary custom identity, legacy strings, rating-schema compatibility and CRC framing/correction; incorporated the mandatory-QR update; measured all EC/size cases and a local ES-module/SVG implementation seam; wrote only this new repository review.

**Incidents and chosen solutions:**

- Initial 20-bit-CRC tests found no collisions at normal lengths. I retained those positive results and widened the analysis rather than asserting that a shorter checksum was inherently broken.
- A full-size constructed case then demonstrated ambiguous correction, and a separate short-code boundary test demonstrated the actual framing defect.
- A Windows default text encoding failed on an emoji in a new scratch script. Recreated the script using explicit UTF-8/Unicode escapes; no protected input was changed.
- The GitHub CLI source download returned an empty file. Used the official public raw/browser sources instead, checked their MIT notices and measured their real contents.
- A mistyped scratch-directory probe failed without writing anything and was corrected.
- No dependencies were installed, no puzzle content was uploaded, and no web server was started or left running.

**End:** 2026-10-25 17:08:43 UTC+07:00 — 44 minutes 41 seconds, including the mandatory-QR extension.

Final checks passed: UTF-8 without BOM, CRLF-only line endings, no trailing whitespace, final newline, consistent Markdown tables, unchanged tracked repository files, and unchanged hashes for all 65 protected inputs including both Phase 1 reports.

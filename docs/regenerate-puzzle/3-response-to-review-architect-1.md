# Response to architect-2's review — by architect-1

> Phase 3, 2026-10-25. This answers `2-review-of-architect-1.md` (findings R2-01 to R2-11) and states my final
> positions. New experiments are in my scratch folder (`files/architect-1/r3-*.mjs`). **Measured** numbers come from
> running them; **estimate** marks calculations. No Phase 1 or Phase 2 file was edited.

## 0. Summary

- Both blockers are real, and I reproduced both.
  - **R2-01 (rating).** My fix needs no schema change and no search. The code carries three numbers from the stored
    rating; the decoder rebuilds the complete `difficulty-v2` claim from them and from the geometry. The rebuilt claim
    was identical in 60 of 60 rated puzzles. It costs about 26 bits on average (13–42).
  - **R2-02 (checksum).** The burst crossing the data/check boundary passes my prototype check and decodes to other,
    valid clues. The cause is a double `x^20` augmentation. The corrected frame (Section 2) detected every burst,
    every two-symbol error and every adjacent swap in the tests. It also needs a final XOR: without one, appending `0`
    symbols at the end passes the check.
- Of the other nine findings I accept eight, and R2-08 in part.
- With these fixes the two designs differ in only four small points: the checksum width (I keep 20 bits), the `P1.`
  prefix (I keep one version symbol), whether v1 offers a correction candidate, and how the QR target is chosen.
  Section 4 lists them; my positions are in Section 2.
- Solution: one code, fully visible on paper and identical in the QR and the URL. It has a short **core**, which is
  what people type, and an optional, labelled **solution tail**. This satisfies architect-2's rule "QR never richer
  than the visible text" and my rule "the typed code stays minimal".

## 1. Findings R2-01 to R2-11

| ID | Verdict | Evidence (mine) | Fix to my design |
|---|---|---|---|
| R2-01 blocker: a score-only `difficulty-v2` rating is invalid | **Accept** | `core/engine/pack.js:783`–`:785`, `:738`–`:739` (I had accepted this in Phase 2, R1-09). New: in `measure()` (`core/engine/difficulty.js:58`–`:99`) only `branchTrials`, `rowTrials` and `stop` come from the search. `U` = K − G. `R` and `H` come from `buildModel` (free cells; Σ log2(1 + placements) / U). `saturated` = `stop` ≠ `solution`. `B` follows from `branchTrials` and `saturated`, the score from U and B (`:44`), the level from the score (`:112`). `r3-rating.mjs` rebuilt the complete stored claim, all seven metrics included, for **60 of 60** rated puzzles (the sample, the hand-made fixture, my 16 packs and 8 of architect-2's) | The code carries `branchTrials`, `rowTrials` (Exp-Golomb, k = 5: 6–20 bits each, mean 12.3 and 12.4) and `stop` (1–2 bits): 13–42 bits, mean about 26 (measured), so about 5 symbols. The decoder builds the model (geometry only) and writes the complete claim. Any claim that does not rebuild exactly (another model, a fractional score, edited values) is carried in full, as in architect-2's grammar. No validator change, no fabricated metrics, no search when a code opens. This withdraws my Phase 2 question 5. `H` is recomputed in floating point; its last bit may differ between JavaScript engines, but no screen shows it and the claim stays valid |
| R2-02 blocker: checksum framing lets a boundary burst pass | **Accept** | `r3-crc.mjs`: architect-2's window (start 131, mask 914223, bits taken least-significant first) passes my prototype check on the 6×10 code `128M11VAAX56244P0S71A5CWYTKGD7HCF0` and decodes to a valid pack with changed clues. Cause: the loop in `pcode.mjs` already multiplies by x^20, and the extra 20 zero clocks make the check M·x^40 mod G, so the sent word is not a multiple of G | Corrected frame, Section 2 (1). Measured with it: the same burst, 453,000 random bursts of 1–20 bits at every offset, all 539,121 two-symbol substitutions and all 30 adjacent swaps of the 6×10 code: **0 undetected**. Without a final XOR, 401 of 461,600 single insertions and deletions passed, nearly all by appending `0` at the end; with XOR-out 0xFFFFF, **0 of 461,600** passed |
| R2-03 major: unique single-typo correction not guaranteed for every length | **Accept** | With the corrected frame, polynomial 0x6C1BD keeps single-symbol syndromes unique up to **5,732 symbols** (exhaustive). Architect-2's 6,180-symbol ambiguity lies beyond that | No promise of correction. A suggestion is offered only when the code has at most 5,732 symbols and exactly one single-symbol change passes both the check and full decoding. It is shown as a candidate ("group 5, character 2: K instead of R?") and applied only after the user confirms. Never silent |
| R2-04 major: the decoder reads counts before bounding them | **Accept** | `pcode.mjs` is a measuring prototype | The production decoder checks every bound before any loop or allocation: code length (16,000 symbols), W, H ≤ 64, cells ≤ 1,024, K ≤ 128, piece size ≤ 128, ranks < C(n, k), placement indices, text lengths and UTF-8/UTF-16, zero padding and no trailing bits; decompressed size at most 64 KiB. `validatePack` runs afterwards as the final gate |
| R2-05 major: QR first-class; 33 mm left out the quiet zone | **Accept** | My Phase 1 "33 mm for 65 modules" left out the quiet zone; my Phase 2 sizes include it | QR is part of the design (Section 3). The band height is max(text, QR) plus gaps. I also accept architect-2's 25 mm minimum box: small symbols get larger modules (version 5: 25 / 45 = 0.56 mm) |
| R2-06 major: "every valid pack" must not mean "every code fits one QR" | **Accept** | Architect-2's 6,180-symbol custom example; version 40-M holds 3,322 code symbols after the 45-character prefix, version 40-L 4,227 (measured, Phase 2) | Oversize policy, Section 2 (6). DEFLATE becomes a codec chosen by the version symbol at no cost to normal codes, Section 2 (5) |
| R2-07 minor: wire format not yet one executable version | **Accept** | My rating and number lengths were counted, not round-tripped; Phase 1 placed padding before the check in the text but after it in `measure.mjs` | One reference writer and reader for every field, golden strings generated from it. Padding goes **before** the check, so the check is always the last 4 symbols. The prototype strings in both reports are not golden vectors |
| R2-08 minor: freezing the palette alone does not freeze the look | **Partly accept** | The display remap, letter marks and patterns are renderer rules for every pack (`core/browser/piece-look.js:16`–`:30`, `:57`–`:75`; `core/engine/palette.js:77`–`:88`) | They must stay stable, but as a documented product rule with a golden rendering test (fixed set → expected colours, marks, patterns), not as a per-code or per-pack profile marker. The code keeps the data (ids, letters, RGB, order) exactly; v1 defaults come from frozen copies of `labelFor` and `colorFor` |
| R2-09 minor: a number does not keep a custom title; a fingerprint does not prove the look | **Accept** | `player/puzzle-title.js:26`–`:31`; `core/engine/keys.js:454`–`:469`. Also: a title without a `#n` ending is shown with the list position appended ("Normal" → "Normal #2"), so in a one-puzzle pack it would read "Normal #1" | Title kind: none / level label / level label + `#n` / text; a pattern only when it rebuilds the title exactly. The code stores the name as shown and printed (`puzzleDisplayName`), so the re-created puzzle shows the paper's name. Tests compare ordered pieces, letters, colours, patterns and angle, not only fingerprints |
| R2-10 minor: 549 ms cold tables; print jobs are re-read synchronously | **Accept** | `core/browser/print-dialog.js:181`–`:229` | Prepare one immutable snapshot (code, URL, QR matrix) asynchronously when the dialog opens; the size options only lay it out again; invalidate it when the selection or content changes. Build the shape tables off the main thread and cache them, or ship them frozen; a golden hash test fixes their order |
| R2-11 minor: lone surrogates | **Accept** | Accepted in Phase 2 (R1-11) | Architect-2's UTF-16 escape for ill-formed text |

Architect-2's review still says that the Generator's default quantity is five (its 3.2). The page asks for one puzzle
per press (`generator/app.js:28`, `:99`; `docs/design-detail.md:1194`). This does not change any conclusion.

## 2. Final positions on the remaining divergences

### (1) Checksum

**Frame (fully specified):**

- Bit string, most significant bit first: `version (5) | payload | zero bits up to a multiple of 5 | check (20)`.
- Check: CRC-20, generator 0x6C1BD (x^20 implicit), initial value 0xFFFFF, no reflection, final XOR 0xFFFFF.
- It covers every bit before it, version and padding included, computed with the direct (non-augmented) algorithm.
- The receiver always takes the **last 4 symbols** as the check, whatever the content says, so the checked span never
  depends on parsing. Only then does it parse. Padding must be zero, and trailing bits are rejected.
- With a solution tail: `core | tail payload | zero bits | check`. The final check covers everything before it,
  including the core's own check. A core alone is complete and valid.

**Guarantees with this frame** (detected for certain unless stated):

| Typing error | Result | Evidence |
|---|---|---|
| 1 wrong symbol | Always detected | Burst of at most 5 bits |
| Adjacent swap | Always detected | Burst of at most 10 bits; 30 of 30 swaps on the 6×10 code |
| Up to 4 neighbouring symbols wrong | Always detected | Burst of at most 20 bits; 453,000 random bursts, 0 missed |
| 2 wrong symbols anywhere | Always detected up to 5,732 symbols | Exhaustive syndrome check; 539,121 pairs on the 6×10 code, 0 missed |
| 1 missing or extra symbol | Not guaranteed. The check passes by chance with probability about 2⁻²⁰, and parsing rejects most cases | 0 of 461,600 on random 34-symbol frames. The paper also states the code's length, so a missing symbol is visible |
| 3 or more wrong symbols | Passes by chance with probability about 2⁻²⁰, before structure checks | Estimate |

**Cost:** 4 symbols. A 25-bit or 30-bit CRC would cost 5 or 6, and CRC-32C 6.4 (about +2.4 symbols in my framing,
+3 in architect-2's byte framing). The wider checks only lower the chance-pass rate of the probabilistic rows (2⁻²⁰
≈ 10⁻⁶). The realistic errors are already caught for certain, and a code that passes must still decode and validate.

**Position:** CRC-20, as framed above. Correction as in R2-03: a candidate, never applied without confirmation.

### (2) Solution

**What the Player does without a stored solution:**

- `verifyPack` searches up to 2,000,000 row trials in a worker (`core/engine/tasks.js:97`–`:113`). Play is allowed
  meanwhile (`docs/design-detail.md` §9.5).
- On four Hell boards it ended "not verified" after 220–1,108 s in Node (measured, Phase 2). That is about 15–74
  minutes of worker time in a browser (estimate, §8.7), on phones too.
- Until a solution is known the page shows no "At least 1 solution". Hints cannot start from a stored answer
  (`core/engine/hints.js:110`) and must search.
- So it is playable, but wasteful and less helpful. With a stored solution the check takes O(cells).

**Proposal that satisfies both rules:** one code per print job, printed **in full**. The QR and the URL contain
exactly the printed characters.

```text
Puzzle code / Mã đề:        1A2B C3D4 ... WXYZ             <- core: type this
+ solution (optional):      KM7Q R2T5 ...                  <- tail: no need to type
```

- The core is an exact, independently valid prefix with its own check. The tail has its own final check.
- Typing only the core opens the same puzzle, with the same progress fingerprint, but without a stored solution.
- The tail is present whenever the puzzle has a stored solution.
- Cost of the tail: about +6 symbols for 6×10 and +84 for 24×24 Hell 3 (estimate from measured solution bits),
  printed smaller and grey.
- The **Print solution** sheet option stays separate: it adds a spoiler page, while the encoded tail reveals nothing.

### (3) Rating, title, number

The re-created puzzle must show what the original showed: its title, the level (bold), the score with "+" when
saturated, and "At least 1 solution" once a solution is known. Therefore:

- **Rating:** the complete claim rebuilt from 3 carried numbers (R2-01): exact, valid, no search, about 5 symbols
  (2–3 more than a score-only summary). Recomputing on open was measured at 0.5–3.9 s in Node per Hell puzzle
  (Phase 2) and would tie old codes to the search code, so I drop it. Omitting the rating is possible, but it loses
  what the paper heading shows.
- **Title:** a 2-bit kind with an exact-text fallback; about 1 symbol for generated titles.
- **Certificate:** 1 presence bit, then status and model when present. None of the 60 corpus puzzles has one.

### (4) QR base URL

- The target is the page base (`new URL('../player/', document.baseURI)`) when the page is served over http(s) from
  a non-local host. That covers GitHub Pages and forks.
- Otherwise the target is a configured public URL, `https://tdat00.github.io/pentomino/player/`. "Local" means
  localhost, loopback, private LAN addresses, `.local` names or `file:`.
- The print dialog shows the target under the QR in small type. A developer can force a local target explicitly,
  with a warning.
- This keeps forks correct without editing a constant, and a printout made from a dev server still opens on a phone.
- Architect-2 prefers the configured URL in every case; on the real site both choices give the same URL.

### (5) Prefix and compression

- **One version symbol, no `P1.`**
  - Value 1 means v1 raw; value 2 means v1 with the payload compressed by DEFLATE-raw.
  - The `#p=` key, the "Puzzle code" label and the check already identify the code. `P1.` adds 2–3 symbols to every
    code, about +8 % at 6×10.
- **Both the repeated-shape flag and DEFLATE.**
  - The 1-bit repeated-shape flag handles identical pieces in raw form (about 55 symbols for the 128-piece control,
    estimate).
  - The encoder tries raw and DEFLATE and keeps the shorter. Raw won on every generated puzzle in both corpora
    (34 of 34 in mine), so normal codes never change.
  - DEFLATE costs no symbol, because the version symbol selects it. It rescues long custom identities, such as
    architect-2's 6,180-symbol example, whose frame compressed from 3,863 to 419 bytes.
  - Decompressed size is bounded to 64 KiB.

### (6) Oversize policy

Applies to valid custom or imported puzzles; generated puzzles never reach these limits.

1. **Typed code:** always printed in full. Lines wrap at group boundaries. If the code band would leave less than
   about 120 mm for the preview (threshold to tune), the code continues on a labelled sheet ("Puzzle code,
   continued") placed after the puzzle sheet. Above about 400 symbols (to tune) the dialog warns that typing is
   impractical, so the QR or the link should be used.
2. **QR:**
   - Over version 40-M, drop the solution tail from both the text and the QR, so they stay identical.
   - If it is still too long, use error correction L, with a note.
   - Over version 40-L, print no QR; a notice explains why.
3. **URL:** "Copy this puzzle link" is offered up to the existing URL budget. Above it, a notice points to sharing the
   pack.
4. **Never:** truncate identities, substitute `#lib`, or use an outside service.

## 3. Final proposed unified positions

| Area | Position |
|---|---|
| Contents | **Core:** board (W, H, mask), display angle, pieces (sizes, shapes, stored orientation, identity), clues, rating (exact claim from 3 numbers, full escape otherwise), title kind, certificate if present. **Tail:** stored solution. Never included: seeds, provenance, witness, other puzzles |
| Identity | Ids, letters, RGB, piece order and count, and stored orientation are preserved exactly. Set flags for canonical order, canonical orientation, default identity and repeated shapes. Per-field overrides (id, label, colour). Defaults from frozen v1 `labelFor` and `colorFor`. UTF-16 escape for ill-formed text. Display remap, marks and patterns are a documented, tested rendering contract |
| Binary layout | `version(5)` · W−1 (6) · H−1 (6) · angle (3) · flags · board mask (best of full / gaps / bitmap / runs) · K (Exp-Golomb) · identity flags · sizes (delta-coded when canonical) · shapes (subset ranks up to 10 cells, sized breadth-first above, repeat bits) · orientations if needed · overrides if needed · clues (count, subset, legal-placement ranks) · metadata · zero pad · CRC-20. Tail: solution as candidate indices · zero pad · CRC-20 |
| Checksum | CRC-20, generator 0x6C1BD, init and XOR-out 0xFFFFF, MSB first, over all preceding bits. The last 4 symbols are always the check. Correction only as a confirmed candidate up to 5,732 symbols |
| Alphabet and grouping | Uppercase Crockford base32. Input is case-insensitive, O→0 and I/L→1, spaces and hyphens ignored. Groups of 4, wrapped at group boundaries by the available width (10 groups beside the QR). The paper states the length ("36 characters") |
| Lengths (measured, core) | Generated: 35–38 symbols up to 75 cells, 56 at 144 cells, 111–210 at 576 cells, plus about 3 for the exact rating (estimate). Hand-made: 39–53, about 200 with ten fully custom pieces |
| URL and route | `…/player/#p=<code>`: uppercase, no groups, core plus tail. `i` absent or 0; any other `i` is an error. The address is never rewritten, so no `&i` is added. `#pack=` and `#lib=` are unchanged. "Copy this puzzle link" in both apps |
| Entry UI and progress | Player "Enter puzzle code / Nhập mã đề". It accepts the core, core plus tail, grouped or lowercase text, or a full URL. Architect-2's EN/VI messages, `aria-invalid`, `role="alert"`, atomic loading through `readIncoming`. Correction candidate as in (1). A matching fingerprint restores saved moves ("Saved moves restored; Replay starts as printed") |
| Paper | First sheet: title and detail lines on the left; the code band below them (label, core in about 4.2 mm monospace, the optional tail smaller and grey); the QR in the top-right corner with "Scan to open / Quét để mở" and the target host. `PREVIEW_TOP` = max(text band, QR) + gap; the start height and `layoutSolution` follow. No QR on mirrored backs. Cut-out scale unchanged |
| QR | Full URL: byte segment for the prefix, alphanumeric for the code. Error correction M; modules at least 0.5 mm; 4-module white quiet zone; box at least 25 mm. Measured: 25 mm (version 5) to 32.5 mm (version 10) for every generated code up to 576 cells, tail included; 34.5 mm for the 676-cell command-line example. Oversize policy (6) |
| QR encoder | Pinned, vendored Project Nayuki encoder (MIT, notice kept) as a local ES module under `core/browser/vendor/`, with a small adapter and explicit segments. Rendered as an opaque white rectangle plus one black SVG `<path>` in `print-sheet.js` at exact millimetres. Strict CSP unchanged |
| Scope and limits | Everything `validatePack` accepts. The decoder bounds every field first (R2-04). URL budget as today; QR limits as in (6) |
| Tests | Round trips on all corpora, custom identities, pack limits and lone surrogates. Golden strings. Checksum properties (bursts, pairs up to 5,732, swaps, length changes). Decoder bounds and corruption. Exact rating rebuild. Title kinds. Route rules. Entry messages. Print layout (band, QR, preview, solution sheet). QR golden matrices against the reference encoder, plus an independent decoder used only in tests (vendored under `tests/`, or a dev dependency if the owner allows one). Physical print-and-scan acceptance on Android and iPhone |
| Docs | `docs/design-brief.md` "Print on paper", and §5.3 (unchanged schema, decoding note), §8.6 (the CLI replay sentence), §9.2 to §9.4, §11.12 and §11.15 of `docs/design-detail.md`: code and QR, not seeds, re-create a puzzle. README feature list |

## 4. Remaining disagreements with architect-2

All minor, none blocks implementation:

1. **Checksum width:**
   - Mine: CRC-20, 4 symbols, with the guarantees of Section 2 (1).
   - Architect-2: CRC-32C, about 3 symbols more.
2. **Prefix:**
   - Mine: one version symbol.
   - Architect-2: `P1.`, 2–3 symbols more.
3. **Correction:**
   - Mine: a confirmed candidate in v1.
   - Architect-2: none in the first release.
4. **QR target:**
   - Mine: page base, with a configured fallback for local pages.
   - Architect-2: the configured URL always.

## 5. Questions for the user

| # | Question | Recommended default |
|---|---|---|
| 1 | The printed code has a short part to type and an optional part that carries the solution, which the QR and the link include. Keep that optional part, or print only the short part everywhere? (Without the solution, a large Hell puzzle opened from the code may stay "not verified" for many minutes, and hints search on their own.) | Keep it, printed smaller and marked "optional" |
| 2 | Should the re-created puzzle show the same title, level and score as the original? (About 6 more symbols to type for a generated puzzle.) | Yes |
| 3 | Keep printing the puzzle seed, which cannot re-create the puzzle? | Drop it; keep the level, score and set line |
| 4 | Add "Copy this puzzle link" in both apps? | Yes |

## Appendix A. Scratch files (architect-1, Phase 3)

| File | Purpose |
|---|---|
| `r3-crc.mjs` | Reproduces the boundary burst; corrected frame; bursts, pairs, swaps, length changes; syndrome uniqueness by length |
| `r3-len.mjs`, `r3-len-xor.mjs` | Single insertions and deletions without and with the final XOR |
| `r3-rating.mjs` | Complete `difficulty-v2` claims rebuilt from three numbers; their cost; certificates in the corpus |

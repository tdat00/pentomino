# Re-creating a printed puzzle exactly — final report

> **Status:** design final; research only. No repository code, test or living document has been changed. Prototypes
> live in the session scratch folders (`files/architect-1/`, `files/architect-2/`), not in the repository.
>
> **Date:** 2026-10-25, UTC+07:00. Written by architect-1 from all phase documents, the orchestrator's binding
> decisions D-A to D-G and the user's decisions.
>
> **Markers:** **measured** = produced by running a prototype or repository code; **estimate** = calculation.
> "Decided — confirmed by the user on 2026-10-25 17:50" marks the product decisions of Section 15. The user accepted
> every recommended default and the technical decisions (CRC-20, rating rebuild, target-URL rules).

## 0. Purpose, process and status

**Problem (from the user):** a puzzle cannot be re-created exactly from what is printed on the A4 sheets. The task:

- check whether the printout suffices;
- if not, define what to add, for **one selected puzzle**;
- keep it **compact enough to type** by hand;
- make it reusable in a **URL**;
- since 16:28, add a mandatory **QR code** on the first sheet.

**Process:** two architects worked independently, then reviewed each other; the orchestrator kept the working log
and took the decisions recorded in Section 4.

| Phase | Files (in `docs/regenerate-puzzle/`) |
|---|---|
| 1. Independent studies | `1-study-architect-1.md`, `1-study-architect-2.md` |
| 2. Cross-reviews (QR requirement added) | `2-review-of-architect-2.md`, `2-review-of-architect-1.md` |
| 3. Responses | `3-response-to-review-architect-1.md`, `3-response-to-review-architect-2.md` |
| 4. Unified report | this file; orchestrator decisions D-A to D-G; user decisions confirmed at 17:50; architect-2's independent checks in `4-verification-architect-2.md` |
| Log | `working-log.md` (agents, times, incidents) |

The reference prototype in the architect-1 scratch folder implements the wire format and its helpers. That covers
Sections 5.1–5.8 (versions 1 and 2, and the link rules of 5.8), the frozen tables of 5.11 (no live score, level or
policy function) and the heading rule of 5.6. It is a reference, not production code. It checks only some bounds
of 5.9, throws descriptive errors instead of the engine codes of 5.10, and has no correction candidate, worker task,
QR adapter or layout. Its files:

- `final-v1.mjs` is the codec;
- `pcode-v1.mjs` holds the inner streams;
- `final-v1-run.mjs` runs the corpus, the edge cases, the golden vectors and the catalogue hash;
- `r5-vectors.mjs` makes the edge-case, version-2 and negative vectors and the QR matrix hashes;
- the splice test is in `r4-splice.mjs`, the checksum tests in `r3-*.mjs`.

Architect-2 independently re-checked the checksum, the tail binding and the rating rebuild. The implementation task
files for developer sub-agents (`tasks/regenerate-puzzle/*.md`) are to be written from this report.

## 1. Executive summary

**Verdict on today's printout:**

| What | Re-creatable exactly from paper today? | Why |
|---|---|---|
| Board | **No** | The drawing loses the authored grid frame: margins, origin and a 45° display step. Different boards print identically (0° and 45°; padded border) |
| Piece set | **Only conditionally** | The set seed regenerates the set if the board, level and uniqueness switch are re-entered exactly. The switch is not printed, and a transposed board gives another set |
| Puzzle | **No** | A batch seed depends on the session history and a calibration puzzle. The display angle, solution and rating claim are not on paper |

**Recommendation:** print a direct, self-contained **puzzle code**: a bit-packed description of exactly this puzzle,
not seeds to regenerate it.

- It is written in case-insensitive Crockford base32, in groups of 4.
- It has one version symbol and a CRC-20 check. The check catches every single-symbol substitution, every swap of
  neighbours and every burst of up to 4 neighbouring symbols, and every two-symbol substitution in a component of up
  to 5,732 symbols. It is not guaranteed to catch a missing or extra symbol (chance of a miss about 1 in a million),
  and it is not an authentication.
- It has a short **core C**, which is all a person must type. The core carries the board, angle, pieces with their
  ids, letters, colours and order, the clues, the full rating and the title.
- An optional **tail T** after a dot carries the stored solution.
- The QR code and the link `…/player/#p=C.T` carry the full code. The printed text shows both parts, with the tail
  marked optional.
- The Player opens it as an ordinary one-puzzle pack: no pack-format change, same progress fingerprint.

**Key numbers (measured, final frame, generated puzzles):**

| Board | Typed core C | Full C.T (QR, link) | QR (error correction M) |
|---|---:|---:|---|
| Up to 75 cells (6×10, Heart 10, Ring) | 37–45 | 45–57 | version 5–6, printed in a 25 mm box |
| 144 cells | 60–63 | 80 | version 6, 25 mm |
| 360–484 cells | 100–188 | 152–205 | version 8–10, 28.5–32.5 mm |
| 558–576 cells | 111–212 | 207–243 | version 10–11, 32.5–34.5 mm |
| 676 cells (command-line tool only) | 168–247 | 255–271 | version 11, 34.5 mm |

All 88 test puzzles round-tripped exactly: both corpora, the repository fixtures, custom identities, 128 identical
pieces and 19 edge-case puzzles, 15 of them added for architect-2's sign-off checks (Section 6). Each keeps its
displayed heading.

## 2. What the printout contains today, and why it is not enough

**First sheet** (`core/browser/print-sheet.js:72`–`:76`; `docs/design-detail.md:2214`):

- the title: "Puzzle #n" in the Generator, the stored title in the Player (`player/app.js:372`);
- a detail line "**Level**: score N, seed S" (the puzzle's batch seed);
- a detail line "Set: **Level**, set seed";
- the board preview with clues, the pieces to place, and a 50 mm scale bar.

The Player takes these from the pack and passes **no solution** (`player/app.js:357`–`:377`). Unknown parts are left
out.

**Other sheets:**

- **Piece sheets:** every piece, clues included, with colour, letter and pattern.
- **Board sheets:** playable cells only; holes grey with a cross, exterior blocked cells not drawn; possibly split
  into parts.
- **Solution sheet:** Generator only, optional.

**Orientation:** paper drops a 45° step (`core/browser/print-layout.js:55`) and may add a quarter turn.

**Addresses today:**

- The Generator address holds board, angle, level, set seed and uniqueness (`generator/address.js`). It names a set,
  not a puzzle.
- `#pack=` carries a whole pack as deflate-raw JSON in base64url (`core/engine/sharecode.js:172`–`:200`).
- `#lib=` only works in the browser that stored the pack.

**Evidence that seeds do not re-create a puzzle:**

| ID | Measured result | Source |
|---|---|---|
| E1 | Same board, level, seed and uniqueness switch → same set (ids, letters, colours) | A1 Phase 1, repeated by A2 |
| E2 | Blocked margins did not change one set (one case only) | A1 |
| E3 | The same board transposed (10×6 → 6×10 grid) → a different set | A1 |
| E4 | The uniqueness switch can change which attempt succeeds; a counterexample changed the set | A1, A2 |
| E5 | Slot 1 can be the set's calibration puzzle whatever the batch seed (seeds 12345 and 98765 gave the same puzzle) | A1, A2 |
| E6 | Earlier puzzles in the history change the next one (batch seed `3`) | A1, A2 |
| E7 | Ratings recompute equal (19/19), with the complete claim rebuilt (60/60, Section 5.5) | A1 |
| Print | 0° and 45°, and a board with an extra blocked border, produce identical print models | A2 |
| Workers | One and four workers give identical results; time limits can still change what exists | A2 |

Also note that `tools/generate.mjs:13`–`:14` starts every batch from an empty history, unlike the replay described in
`docs/design-detail.md:1675`. The Generator page makes **one** puzzle per press (`generator/app.js:28`, `:99`).

## 3. What "exact" means

**Essential, preserved exactly:**

- the board rows, including blocked margins and holes, its width and height;
- the display angle in 45° steps, as shown when the user prints or copies the link (the snapshot of Section 8.1);
- the ordered pieces, each with its id, letter (`label`), colour and cells in the stored orientation;
- the clue placements (occupied cells).

The pieces to place follow from these, and so does the progress fingerprint (`core/engine/keys.js:462`).

**Shown with the puzzle, carried by default (Q2, decided — confirmed by the user on 2026-10-25 17:50):**

- the title, as both apps display it: the re-created puzzle shows the same heading as the printed sheet (Section 5.6);
- the complete `difficulty-v2` rating claim (level, score, saturated flag, metrics);
- the certificate, if present.

**Carried in the tail when stored:** the solution.

**Not carried:** seeds, generation provenance, the set witness, timestamps and other puzzles of the pack. The
puzzle's public id is recomputed as `puzzleId(board, pieces, clues)` (`core/engine/keys.js:478`). The Generator
writes that same id (`core/engine/generate.js:134`, `core/browser/generation-client.js:853`). A custom id of a
hand-made pack, such as `example-1` in `tests/fixtures/hand-authored-pack.json`, is not kept; progress does not
depend on it.

**Accepted normalisations:** each makes no visible or progress difference.

| Normalisation | Example |
|---|---|
| Colour hex case: colours are equal as RGB values | `#Ab12CD` → `#ab12cd` |
| Solution array order | Becomes the piece order |
| Pose notation of symmetric pieces | The smallest transform giving the same cells |
| A title of at most 75 code points without a final "#n", not first in its pack | Stored as the heading the apps show: "Normal" at position 2 becomes "Normal #2" (Section 5.6) |
| Presentation angle | The angle of the snapshot, which is the pack's angle unless the Player's view was turned |

## 4. Decision record

Sources: A1 = architect-1, A2 = architect-2, O = orchestrator decision, U = user decision, confirmed on 2026-10-25
17:50.

| # | Decision | Alternatives considered | Rationale | Source |
|---|---|---|---|---|
| D1 | Direct content code, not regeneration from seeds | Seeds plus history and version | E4–E6; generation history and time limits make seeds non-exact | A1, A2 |
| D2 | One selected puzzle; decoded as an ordinary one-puzzle pack, no schema change | New pack fields | Keeps every reader, store and fingerprint | A1, A2, O (D-B) |
| D3 | Identity preserved exactly; conditional set flags; per-field overrides; frozen v1 defaults (`labelFor`, `colorFor`) | Canonical sort and relabel; per-pack look profile | Cut-outs must match the screen; imports keep their identity | A1, A2 |
| D4 | Size-aware shape coding: catalogue ranks up to 10 cells, BFS with known size above, legal-placement ranks; repeated-shape flag | Per-piece modes; frontier code | 1.4–2.3 times shorter on the same puzzles | A1, A2 (Phase 2) |
| D5 | Checksum: CRC-20, poly 0x6C1BD, init and XOR-out 0xFFFFF, MSB first; the check is always the last 4 symbols of a component | CRC-30/CDMA (A2's preference, 2 symbols more); CRC-32C | Both architects agree a correctly framed CRC-20 is adequate for typing; the user prioritises short codes | O (D-A) |
| D6 | Tail check covers the core payload (not the core's check) plus the tail | Covering the whole core | A valid core makes the CRC register constant, so a tail checked over the whole core is not bound to it. Measured: with the chosen rule 0 of 7,630 cross-puzzle splices are accepted; with the other, 1,560 of 1,560 pass the check | A1 + A2, Phase 4 |
| D7 | Rating rebuilt exactly from `branchTrials`, `rowTrials` and `stop`, by counting placements (no exact-cover model) and with frozen integer score and band tables; full-claim escape otherwise; no reader change | Score-only claim with relaxed reader; recompute on open; omit | 60/60 exact (architect-2: 73/73); 13–33 bits; no search; never throws | O (D-B), A2 sign-off |
| D8 | Title kinds: absent / level label / level label + " #n" / literal text, applied to the displayed heading (Section 5.6) | Puzzle number only; the stored title | Exact headings, about 1 symbol for generated ones | O (D-C), A2 sign-off |
| D9 | Single-symbol typo: show a correction candidate, never apply it automatically; offered for codes up to 5,732 symbols | No correction | Helps manual entry; exactly bounded | O (D-D) |
| D10 | Core and tail form C.T; QR and link carry C.T when a solution is stored; tail also printed, marked optional | Typed solution; QR richer than text; no solution | Without a stored solution, Hell puzzles end "not verified" | A1, A2, U (Q1) |
| D11 | One version symbol, no `P1.`; raw or DEFLATE chosen through it; repeated-shape flag | `P1.` prefix plus codec byte | Saves 2–3 symbols per code; DEFLATE won for 4 of 82 measured puzzles, all with very repetitive content or a long rating escape | O (D-G) |
| D12 | Crockford base32, upper case, case-insensitive entry, O→0, I/L→1, spaces and hyphens ignored, groups of 4 | base64url; groups of 5 | Unambiguous typing; matches the seed format | O (D-G) |
| D13 | Route `#p=` with `i` absent or 0; never rewritten; `#pack`, `#lib` and whole-pack Play unchanged | Converting to `#pack=` | One stable address per code | O (D-G) |
| D14 | Mandatory QR: full URL, byte segment plus alphanumeric segment, error correction M, modules ≥ 0.5 mm, box ≥ 25 mm, 4-module quiet zone | Bare code; error correction L or H | A phone camera opens the puzzle in one step | User, A1, A2 |
| D15 | Vendored, pinned Project Nayuki QR encoder (MIT), SVG path rendering | In-house encoder; external service | Audited, no dependency, strict CSP kept | A1, A2 |
| D16 | QR target: page base when served over http(s) from a non-local host, otherwise the configured public URL; the dialog shows it; explicit developer override with a warning | Always configured; always page base | Forks work; local printouts stay portable | O (D-F) |
| D17 | Oversize: shortest of raw/DEFLATE → drop the tail from text and QR → error correction L → print without code and QR, with notices | Refuse to print | Never truncate identity | O (D-E), U (Q5) |
| D18 | Paper: drop the misleading puzzle-seed line; keep level, score and the set line | Keep the seed | The seed cannot re-create the puzzle | U (Q3) |
| D19 | "Copy this puzzle link" in both apps | None | Same code, shareable | U (Q4) |
| D20 | Opening a code restores saved progress by fingerprint and says so; never erases silently | Fresh start | Progress is keyed by fingerprint | A2 |
| D21 | Scope: every pack `validatePack` accepts; the decoder bounds every field first | Generator limits only | The Player accepts imported packs | A1, A2 |
| D22 | One immutable print/copy snapshot per puzzle feeds the sheet, the code, the QR and the link. It holds the displayed heading, the angle on screen and the stored solution. The Generator's sheet heading becomes the displayed title ("Hard #3") instead of its card heading ("Puzzle #3") | Encode the stored title and angle; print the card heading | Paper, code and re-created screen show the same heading and angle (Q2) | A2 sign-off |

**Sign-off fixes (2026-10-25).** Architect-2 withheld sign-off with findings S2-01 to S2-11
(`4-verification-architect-2.md`, "Sign-off"). All are accepted; the record of each fix:

| Finding | Fix | Sections |
|---|---|---|
| S2-01 Displayed title, angle and stored answer | One immutable print/copy snapshot, rendered and encoded (D22). The encoded title is the displayed heading; untitled headings become "Puzzle #n" / "Đề #n". The Generator prints the displayed title. The shared heading rule never numbers titles longer than 75 code points, so every heading is kept exactly | 3, 4 (D8, D22), 5.6, 8.1, 10, 11, 12, 13, 14 |
| S2-02 Certificate rowLimit up to 2^53 − 1 | EG read and written exactly (BigInt); prefixes up to 53 − k zero bits; values above 2^53 − 1 rejected | 5.1, 5.7, 5.9, 5.12, 13 |
| S2-03 Title numbers outside 1 … 2,147,483,647 | The suffix is checked as a string before any conversion; otherwise kind 3; the decoder rejects larger n | 5.6, 5.12, 13 |
| S2-04 A rebuild that throws | The escape is used on any failure. In addition, the rebuild counts placements (`preparePlacements`, `countPlacements`) instead of building the exact-cover model. This is a different computation, not a solver-limit change: it needs no workspace, so the decoder can always repeat it. The 849,920-row pack therefore takes the compact form when its claim is consistent; an edited claim takes the escape | 5.5, 6, 12, 13 |
| S2-05 Run count and padding grammar | Mode 2 counts stored runs only; the last run is W·H minus their sum. Outer padding 0–4 zero bits; inflated fill 0–7 zero bits; separate checks; decode-only and negative vectors | 5.2, 5.3, 5.4, 5.12, 13 |
| S2-06 Layout for a version-40 QR | Width-dependent groups with a fixed advance; a band ending at y = 149 at most, keeping 120 mm for the preview; continuation sheets with one- and two-sided order; the solution sheet keeps its 40 mm top | 7.2, 10, 10.1, 12, 13 |
| S2-07 Score and level without floating point | Frozen integer threshold and band tables, zero extra bits, checked on all 640,128 (U, B) pairs | 5.5, 5.11, 13, 14 |
| S2-08 QR test strategy | Pinned encoder with upstream and adapted digests; test-only jsQR 1.4.0 (Apache-2.0) under `tests/vendor/`; five golden matrix hashes; the decode procedure | 5.12, 7, 7.3, 12, 13 |
| S2-09 Bounds | Piece id 1–8 ASCII characters; G = K is a negative pack test | 5.9, 13 |
| S2-10 Wording | Substitutions, not "every typo"; splices "none accepted in the measured samples"; no authentication | 1, 5.2, 14 |
| S2-11 Integration contracts | Pasted links go through the hash parser; the URL bound is the existing 16,000-character limit; the local-target override control and its lifetime; one preparation result for Print and Copy link; worker shapes, with a tail error returning the unopened core | 5.8, 5.9, 7.1, 8.1, 12 |

**Re-check (19:02).** Architect-2 rejected the remaining long-title exception. Section 5.6 now uses its rule:
titles longer than 75 code points never get an automatic number. The reference prototype now uses the frozen
tables and the link rules of Section 5.8 instead of live helpers. Its round trips were repeated: 88 of 88.

## 5. Puzzle code v1 specification

### 5.1 Notation

- Bits are written most significant first.
- `u(n)`: an n-bit unsigned integer.
- `EGk(v)`: Exp-Golomb of order k: write `v + 2^k` in binary, preceded by (bit length − k − 1) zero bits.
  - Values are 0 … 2^53 − 1 (`Number.MAX_SAFE_INTEGER`), so a prefix has at most 53 − k zero bits. A certificate's
    `rowLimit` of 2^53 − 1 needs 43 zero bits in EG10.
  - Use exact integer arithmetic (BigInt): `v + 2^k` exceeds 2^53 for the largest values.
- `tb(x, n)`: truncated binary for 0 ≤ x < n. With k = ⌊log2 n⌋ and t = 2^(k+1) − n: x < t uses k bits, otherwise
  x + t in k + 1 bits; 0 bits when n ≤ 1.
- `rank(S, N)`: the colex rank of a sorted k-subset S of {0 … N−1} (Σ C(s_i, i+1)), written in
  bitLength(C(N, k) − 1) bits.
- `text(s)`: one form bit, then:
  - form 0 (UTF-8): EG3(byte count), then the bytes in 8 bits each;
  - form 1 (UTF-16, only for strings with lone surrogates): EG3(code-unit count), then 16 bits per unit.

### 5.2 Frame

```text
C = base32(Pc) + base32(checkC)                     core: always present, typed
T = base32(Pt) + base32(checkT)                     tail: optional
F = C            (no stored solution)
F = C "." T      (with a stored solution)

Pc     = u5(version) + payload + zero bits up to a multiple of 5
checkC = CRC20(Pc)
Pt     = u5(tailTag) + tail payload + zero bits up to a multiple of 5
checkT = CRC20(Pc + Pt)        // the core payload, NOT the core's check symbols
```

**CRC20:** width 20, generator 0x6C1BD (x^20 implicit), init 0xFFFFF, no reflection, XOR-out 0xFFFFF:

```text
r = 0xFFFFF
for each bit b:  f = bit19(r) XOR b;  r = (r << 1) AND 0xFFFFF;  if f: r = r XOR 0x6C1BD
check = r XOR 0xFFFFF          // 20 bits = 4 symbols, most significant first; no extra zero clocks
```

**Vectors (measured with the prototype):**

- CRC20 of the ASCII bytes "123456789" is **0xC80C0**.
- A complete valid component gives **0x6CDCE** when its own check is run through CRC20 as well. This is why the tail
  check does not cover the core's check. Complete puzzle codes are in Section 5.12.

**Decoding:**

- For each component, verify that its last 4 symbols equal the CRC of everything before them (for T, prefixed by Pc),
  before parsing anything.
- After the last field, 0–4 bits remain before the check, and they must all be zero. The last field of C is the
  last clue record; the last field of T is the step that covers the last free cell (T has no steps when no cell is
  free). In version 2 (5.3) the same 0–4-bit rule applies after the compressed bytes, and inside the inflated bytes
  0–7 zero fill bits follow the last field.

**Measured guarantees** (`r3-crc.mjs`, `r3-len-xor.mjs`; independently confirmed by architect-2 in Phase 4):

| Error | Result |
|---|---|
| One substituted symbol | Always detected (burst ≤ 5 bits) |
| Adjacent swap | Always detected (burst ≤ 10 bits); 30/30 on the 6×10 code |
| Up to 4 neighbouring symbols | Always detected (burst ≤ 20 bits); 453,000 random bursts, 0 missed |
| Two substituted symbols anywhere | Always detected while the component (for T: Pc + Pt + check) is at most 5,732 symbols. Single-symbol syndromes are unique up to there (177,692 syndromes; first collision at 5,733); 539,121 pairs on the 6×10 code, 0 missed |
| One missing or extra symbol | Not guaranteed, chance about 2⁻²⁰; 0 of 461,600 random cases; appending `0` symbols is caught (512 cases) |
| A tail from another puzzle | None accepted in the measured samples: 0 of 7,630 cross-puzzle splices (final codec), 0 of 3,660 (first run) and 0 of 2,326 (architect-2). A splice still passes with the normal CRC chance of about 2⁻²⁰; decoding and layout validation follow |

**Cost:** 4 symbols per component.

**Alternative:** architect-2 prefers CRC-30/CDMA (6 symbols, 1 in 10⁹ for random multi-symbol errors). CRC-20
was chosen because both architects agree it is adequate for manual entry and the user prioritises short codes.

### 5.3 Version symbol, tail tag and DEFLATE variant

**Version symbol** (first symbol of C):

| Value | Meaning |
|---|---|
| 1 | v1, raw payload |
| 2 | v1, DEFLATE payload |
| Others | Reserved; the Player says it needs a newer version |

**Version 2 grammar** (S2-05). After the version symbol 2, Pc holds:

1. EG8(m), where m ≥ 1 is the number of compressed bytes;
2. m bytes of deflate-raw data, 8 bits each, most significant bit first;
3. 0–4 zero padding bits up to a multiple of 5 (any other outer remainder, or a 1 in it, is `invalid`).

Inflating the m bytes must give exactly ⌈X / 8⌉ bytes, where X is the bit length of the version-1 payload (the
fields of Section 5.4, without version symbol or padding). The payload is packed most significant bit first, and its
last byte ends with 0–7 zero fill bits. The decoder parses the fields from the inflated bits and then requires the
remaining bits to be fewer than 8 and all zero. So an extra inflated byte, a 1 in the fill or output above 64 KiB is
`invalid`. The 0–4-bit outer rule and the 0–7-bit inflated rule are separate checks.

- The decoder needs `DecompressionStream('deflate-raw')` and stops at 64 KiB of output.
- The encoder compresses with `CompressionStream('deflate-raw')` at its defaults. Compressor output differs between
  engines, so version-2 strings are not canonical: tests decode them and compare the content, never the string.
- The encoder keeps whichever complete C is shorter; raw on a tie.
- **Measured** with the final frame (`r4-deflate.mjs`, zlib levels 6 and 9, all 82 puzzles): raw is shorter for 78.
  That includes every generated puzzle, where DEFLATE adds 7–12 symbols. DEFLATE wins only on very repetitive
  content or a long rating escape: the 128 identical-piece control (52 → 31), the same pack with a v2 claim
  (58 → 39), its edited-claim escape (359 → 276) and the synthetic inconsistent-level escape (322 → 303).
- The reference prototype implements both versions. Its round trips (Section 6) use the shortest form, so the four
  cases above go through version 2.
**Tail tag** (first symbol of T):

| Value | Meaning |
|---|---|
| 1 | Raw solution path |
| 2 | Reserved for a compressed tail |
| Others | Reserved |

### 5.4 Version-1 payload, in order

The reference prototype (`final-v1.mjs` with `pcode-v1.mjs`) writes exactly this order. The golden vectors of
Section 5.12 come from it.

**Options block:**

1. `u1` repeated-shape flag.
2. Rating (5.5).
3. Title (5.6).
4. Certificate (5.7).

**Geometry:**

5. `u6` W − 1 and `u6` H − 1 (sides up to 64).
6. Board mask. First `tb(mode, 5)`, then the mode's data:

   | Mode | Name | Data |
   |---:|---|---|
   | 0 | full | none; only when no cell is blocked |
   | 1 | blocked-cell gap list | EG2(count), `u3` k, then each gap in EGk. The gap is the raster index minus the previous blocked index minus 1, starting from index −1 |
   | 2 | row-major runs, starting with an active run (length 0 if cell 0 is blocked); the last run is implied | `u3` k, EG2(number of stored runs, not counting the implied last run), each stored run in EGk. The implied last run has length W·H minus the sum of the stored runs, which must not be negative |
   | 3 | blocked rectangles, greedy | EG0(count), then for each: tb(y·W + x, W·H), tb(w − 1, W − x), tb(h − 1, H − y) |
   | 4 | bitmap | W·H bits in raster order, 1 = active |

   - The encoder uses the shortest mode; on a tie, the lowest mode number. In modes 1 and 2 it uses the k in 0…7
     that gives the fewest bits; on a tie, the smallest k.
   - Mode 3 rectangles: scan cells in raster order. At each blocked cell not yet covered, extend right while the
     cells are blocked and uncovered, then down while the whole span is. Write the rectangles in that order.
   - Storing only blocked cells is mode 1, which is used when it is shortest.
7. `u3` display angle / 45: the snapshot's angle (Section 8.1).

**Pieces:**

8. EG3(K − 1).
9. `u1` canonical order. The array is strictly sorted by size descending, then by canonical cells ascending under the
   comparison of Section 5.11 (for up to 10 cells, that is the catalogue index).
10. `u1` canonical orientation: every piece is stored in its canonical orientation (Section 5.11).
11. `u1` default identity: for every piece i, id = label = `labelFor(i)` and the colour equals `colorFor(i)`, case
    ignored (frozen tables, Section 5.11).
12. If the repeated-shape flag is set: for i = 1 … K−1, `u1` "same canonical shape as piece i − 1". Such pieces are
    skipped in 13–14 and copy the size and catalogue shape of piece i − 1.
    - The encoder sets the flag when at least one bit would be 1.
    - Canonical order (9) is then judged on the remaining pieces only.
    - Measured: 128 identical pieces give a 52-symbol core.
13. Sizes of the remaining pieces:
    - canonical order: EG2(first size − 1), then EG0(previous size − size) for each;
    - otherwise: EG2(size − 1) for each.
14. Shapes:
    - **Up to 10 cells:** the frozen catalogue of free polyominoes (Section 5.11).
      - With canonical order: one `rank(indices, N_n)` per run of equal-size remaining pieces, indices ascending.
      - Otherwise: `tb(index, N_n)` per piece.
    - **Over 10 cells:** BFS with a known size n.
      - The root is the first cell of the canonical cells, sorted by y then x, placed at (0, 0).
      - Take queue cells in order. For each, look at its neighbours right (+1, 0), down (0, +1), left (−1, 0) and
        up (0, −1).
      - Skip a neighbour already decided, or one before the root in raster order (y < 0, or y = 0 and x < 0).
      - Otherwise write `u1` "in the shape" and enqueue it if it is.
      - Stop as soon as n cells are known.
      - The decoder normalises the cells; the result is the canonical shape.
15. If not canonical orientation: `u3` t per piece. This is the smallest t in 0…7 with `orientedCells(canonical, t)`
    equal to the normalised stored cells (`core/engine/geometry.js:79`; t = turn + 4 if mirrored). Valid packs store
    cells translated to (0, 0) and sorted by y then x (`core/engine/pack.js:485`–`:487`), so the decoded arrays equal
    the stored ones.
16. If not default identity: per piece, `u1` id override, `u1` label override, `u1` colour override. Then `text(id)`,
    `text(label)` and `u24` RGB, only for the overrides that are set. An override is set when the value differs from
    `labelFor(i)`, `labelFor(i)` or `colorFor(i)` (colour compared in lower case).

**Clues:**

17. tb(G, K + 1).
18. `u1` records in piece order.
19. `rank(clued piece indices, K)`.
20. If not in piece order: a Lehmer code, tb(position, remaining) per record.
21. Per record: tb(p, L). L lists the legal placements of the piece's catalogue shape:
    - each orientation of `distinctOrientations(canonical)` in its order (`core/engine/geometry.js:144`);
    - then y ascending, then x ascending;
    - all cells active and not covered by earlier clues.

    The decoder converts the placement to a pose of the stored cells. It uses `canonicalT` (`:168`) for symmetric
    pieces, and takes x and y as the placement's offset.

**Tail payload (tag 1):**

- Repeat until every active cell is covered:
  - c = the first active cell in raster order not covered by clues or earlier steps;
  - the candidates are: for each unused piece in index order, each orientation of `distinctOrientations` in its
    order, anchored with the orientation's first cell (smallest y, then x) on c, fitting free active cells;
  - write tb(index, count).
- The decoder rebuilds the layout, stores the poses in piece order and validates them with `isValidLayout`.

### 5.5 Rating (D7)

- `u1` present.
- If present, `u1` rebuildable. If rebuildable:
  - `tb(stop, 3)` with solution = 0, branch-cap = 1, row-cap = 2;
  - `branchTrials`: with stop = branch-cap, `u1` "equals the cap 5,000", then EG5 if not; otherwise EG5;
  - `rowTrials`: with stop = row-cap, `u1` "equals the cap 50,000", then EG5 if not; otherwise EG5.

**Decoding a rebuildable rating** (the semantics of `core/engine/difficulty.js:58`–`:99`, frozen):

| Field | Rebuilt as |
|---|---|
| U | K − G |
| Placement counts | Count-only, never the exact-cover model: `preparePlacements` then `countPlacements` without limits (`core/engine/placements.js:132`, `:306`). For each unclued piece and each distinct orientation, count the positions where all its cells are free (active and not covered by a clue) |
| H | Start with bits = 0. For each unclued piece, in the plan's order, add `Math.log2(1 + count)` in floating point; then H = bits / U. The plan's order sorts pieces by canonical-shape size, then canonical shape (`compareShapes`), then id (`core/engine/placements.js:192`–`:196`); it is not the piece order |
| R | The number of free cells (`plan.freeCells`) |
| saturated | stop ≠ solution |
| B | 5,000 if saturated, otherwise min(branchTrials, 5,000) |
| score | 2·U + the number of entries of the frozen threshold table (Section 5.11) that are ≤ B. Integer only; equal to round(2·U + 8·log10(1 + B)) |
| level | The level of the frozen band table (Section 5.11) for the score |
| U = 0 | All metrics 0, stop = solution, score 0 |

`buildModel` is not used: it refuses large models (architect-2's valid 1,024-cell, 128-piece pack has 849,920
model rows), while counting needs no workspace.

**Frozen v2 constants:** the decoder keeps frozen copies of the threshold table, the band table and the caps
(Section 5.11). It never calls a newer rating model.

**Encoding:**

- The rebuildable form is used only when:
  - the model is `difficulty-v2`;
  - `branchTrials` and `rowTrials` are non-negative integers within the caps;
  - `stop` is known;
  - the rebuilt claim equals the stored one exactly (JSON, same field order).
- Otherwise the encoder writes `u1 = 0` and `text(JSON)` of the **whole** claim object as the pack reader keeps it.
  That includes `censored`, the opaque metrics of other models and inconsistent levels. The pack reader already
  limits the metrics to 4,096 bytes (`core/engine/pack.js:43`).
- If the rebuild throws, the encoder also uses the escape. The rating never makes the encoder fail on a valid pack.

**Measured:**

- The reference codec rebuilt 60/60 rated corpus claims exactly. It kept the synthetic foreign claim (with
  `censored` and opaque metrics) and the inconsistent-level claim exactly through the escape.
- On the 1,024-cell, 128-piece pack, a consistent v2 claim took the compact form (raw C 58 symbols, 39 as version 2)
  and an edited claim the escape (raw C 359, 276 as version 2); neither threw.
- Architect-2's independent check found 73/73 across 33 packs.
- The three fields cost 13–42 bits without the cap flags and 13–33 bits (mean 17.5) with them (architect-2,
  measured).
- The integer score and level tables equal the current functions for every U of 1 … 128 and B of 0 … 5,000:
  640,128 cases, no difference (`r4-score.mjs`; architect-2 found the same).

**`H` exactness:** exact within one JavaScript engine. `Math.log2` may differ in the last bit between engines. Score
and level do not depend on `H`; no screen shows it, and the claim stays valid.

### 5.6 Title (D8)

**The shared heading rule.** Both apps print and show a puzzle's heading as `heading(title, index)`. This replaces
`puzzleDisplayName` (`player/puzzle-title.js:26`–`:31`) and moves to `core/browser/puzzle-title.js`:

```text
heading(title, index):
  title absent or empty              -> ui.puzzleNumber with n = index + 1: "Puzzle #n" / "Đề #n"
  title ends in "#" and digits       -> title
  title longer than 75 code points   -> title           (never an automatic number, at any index)
  otherwise                          -> title + " #" + (index + 1)
```

A pack holds at most 100 puzzles (`core/engine/pack.js:40`), so the longest number is " #100". A title of at most 75
code points plus that number fits the pack's 80-code-point title limit. Titles of 76–80 code points never get a
number, at any position.

**What is encoded:** the title of the print/copy snapshot (Section 8.1). Let H = `heading(title, index)` for the
original. The re-created puzzle is at position 1 and shows `heading(encoded, 0)`. The encoded title is chosen so
that this equals H in every case:

| Original | Encoded title | Re-created heading |
|---|---|---|
| Any title or none, first puzzle of its pack (index 0) | The stored title (absent stays absent; empty becomes absent) | H |
| A title ending in "#" and digits, or longer than 75 code points | The stored title | H |
| Another title, index > 0 | H = `title + " #" + (index + 1)`, at most 80 code points; for example "Normal" at position 2 becomes "Normal #2" | H |
| No title or an empty one, index > 0 | H, the localized "Puzzle #n" / "Đề #n" (literal, kind 3) | H |

- **Untitled heading change:** the Player's `ui.puzzleNumber` becomes "Puzzle #{n}" / "Đề #{n}" (today "Puzzle {n}" /
  "Đề {n}", `player/locale.en.js:58`, `player/locale.vi.js:55`). It then matches the card heading `card.heading`, and
  an untitled heading ends in "#n", so the rule leaves it unchanged. The tests at
  `tests/player-controller.test.js:727`–`:728` change with it.
- **Long-title change:** a title of 76–80 code points without a final "#n" loses its automatic number. Today it
  shows, for example, "…title #3".
- These two visible changes are the cost of exact headings without a pack-schema change (D2). Architect-2 proposed
  the long-title rule in the sign-off round.
`u2` kind:

| Kind | Meaning |
|---:|---|
| 0 | Absent |
| 1 | The decoded rating's level label (frozen English labels, `core/engine/levels.js:63`) |
| 2 | That label + " #" + n, written as EG2(n − 1) |
| 3 | `text(title)`, for any other title |

- Kind 2 is used only when the suffix is 1–10 decimal digits without a leading zero and its value is at most
  2,147,483,647. The encoder checks this on the string, before converting it to a number; otherwise kind 3. The
  decoder rejects n above that value.
- The level label is looked up **only** for kinds 1 and 2. They need a decoded rating whose level is a known level id
  (Section 5.11); otherwise the decoder rejects the code.
- A literal or absent title never looks up a level, so foreign or unknown levels are fine.
- The encoder uses kinds 1 and 2 only when the level id is known and they rebuild the title exactly.
- **Measured:** "… #2147483647" uses kind 2; "… #2147483648" and "… #9007199254740993" use kind 3; all three
  round-trip exactly. Every one of the 88 test puzzles keeps its displayed heading.
### 5.7 Certificate

- `u1` present.
- If present:
  - `tb(status, 4)`: unique, multiple, not-proved, unsatisfiable;
  - `u1` model is `dlx-v1` (`core/engine/clues.js:87`), else `text(model)`;
  - `u1` rowLimit present, then EG10(rowLimit). The pack allows any safe integer (`core/engine/pack.js:121`, `:860`),
    so EG10 must handle 2^53 − 1 (5.1).

The corpus has no certificates. A synthetic unique certificate round-trips exactly, also with rowLimit 2^53 − 1.

### 5.8 Alphabet, normalisation and grouping

**Alphabet:** `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. Output is upper case.

**Input normalisation** (the same for the entry field, the clipboard and a scanned or typed link):

1. Trim. If the text contains `#`, it is a link: parse the part after the first `#` with the Player's hash parser
   (`parseLocationHashResult`, `core/engine/sharecode.js:288`), as Section 8 does for an address. It must hold the key
   `p`, optionally with `i=0`. Another index gives `index`; a mix with `pack` or `lib`, or no `p`, gives `invalid`.
   The code is the value of `p`.
2. Remove spaces, tabs, line breaks and `-`.
3. Upper-case; map O→0 and I/L→1.
4. Keep at most one `.` (more gives `dots`). Any other character outside the alphabet gives `bad-char`, naming it;
   `U` is not in the alphabet.

**Paper:** groups of 4, separated by spaces, wrapped at group boundaries (Section 10.1). The tail is printed as `.`
followed by its own groups of 4. The label states the length of C, for example "38 characters".

### 5.9 Decoder bounds (R2-04, S2-09, S2-11)

Check every bound before any loop or allocation:

| Item | Bound |
|---|---|
| Input text | ≤ 32,768 characters |
| Normalised code | ≤ 16,000 symbols. A link is also bound by the existing `MAX_URL_CHARS` = 16,000 characters for the whole URL (`core/engine/sharecode.js:13`), which is checked first; Copy link warns above `WARN_URL_CHARS` = 4,000 (`:14`), as share links do (`core/browser/handoff.js:88`) |
| W, H | ≤ 64 |
| Active cells | 1–1,024 |
| K | 1–128 |
| G | ≤ K in the code; a valid pack allows at most K − 1 clues (`core/engine/pack.js:893`), so G = K decodes but fails `validatePack` (`invalid`) |
| Piece size | 1–128 |
| Sizes | Sum matches the board as `validatePack` requires |
| Catalogue indices | < N_n |
| Subset ranks | < C(N, k) |
| Placement indices | < list length |
| EG prefixes | ≤ 53 − k zero bits; values ≤ 2^53 − 1, read exactly (5.1) |
| Text lengths | Byte or unit counts above 4 × the pack limit are rejected before reading. Pack limits: piece id 1–8 ASCII characters `[A-Za-z0-9_-]` (`core/engine/pack.js:46`), letter 0–4 code points (`:529`), title 0–80 code points (`:891`), rating model, rating level and certificate model 1–64 code points (`:790`, `:795`, `:859`) |
| Full rating JSON | ≤ 8,192 bytes; the pack reader then applies its own limits |
| DEFLATE | m ≤ the remaining outer bits / 8; inflated output ≤ 64 KiB (5.3) |
| BFS steps | ≤ 4n + 8 |

`validatePack` runs last, on the decoded one-puzzle pack.
### 5.10 Errors and messages

The engine returns an error code; the Player shows the text in the entry dialog, in English or Vietnamese. Group
and character positions count as printed: in the core from its first symbol, in the tail from the symbol after the
dot.

| Engine code | Key | Condition | English | Vietnamese |
|---|---|---|---|---|
| `empty` | `code.error.empty` | Nothing left after normalisation | Type or paste a puzzle code. | Hãy nhập hoặc dán mã đề. |
| `bad-char` | `code.error.char` | A character outside the alphabet | The code contains "{char}", which puzzle codes never use. | Mã có ký tự "{char}", ký tự này không có trong mã đề. |
| `dots` | `code.error.dots` | More than one dot | A puzzle code has at most one ".". | Mã đề chỉ có tối đa một dấu ".". |
| `too-long` | `code.error.long` | Over the bounds of 5.9 | This code is too long. | Mã này quá dài. |
| `core-check` | `code.error.check` | The core check fails (also for a core shorter than 5 symbols) | The code has a typing error. Check it against the printout. | Mã có lỗi nhập. Hãy đối chiếu với bản in. |
| (candidate) | `code.error.candidate` | Exactly one single-symbol change passes (D9) | Possible correction: in group {group}, character {position} may be "{expected}" instead of "{typed}". Compare with the printout. [Use this correction] | Có thể sửa: ở nhóm {group}, ký tự {position} có thể là "{expected}" thay vì "{typed}". Hãy so với bản in. [Dùng cách sửa này] |
| `version` | `code.error.version` | Unknown version symbol | This puzzle code needs a newer Player version. | Mã đề này cần phiên bản trình chơi mới hơn. |
| `no-deflate` | `code.error.deflate` | Version 2 without `DecompressionStream` | This browser cannot open compressed puzzle codes. Use a current browser. | Trình duyệt này không mở được mã đề nén. Hãy dùng trình duyệt mới hơn. |
| `invalid` | `code.error.invalid` | Structure, bounds or `validatePack` fail | This code does not describe a valid puzzle. | Mã này không mô tả một đề hợp lệ. |
| `tail-check` | `code.error.tail` | The tail check fails | The optional solution part has a typing error. [Open without the solution part] | Phần lời giải (không bắt buộc) có lỗi nhập. [Mở đề không có phần lời giải] |
| `tail-tag` | `code.error.tailVersion` | Unknown tail tag | The optional solution part needs a newer Player version. [Open without the solution part] | Phần lời giải (không bắt buộc) cần phiên bản trình chơi mới hơn. [Mở đề không có phần lời giải] |
| `tail-invalid` | `code.error.tailInvalid` | The tail decodes but is not a valid layout for this puzzle | The optional solution part does not match this puzzle. [Open without the solution part] | Phần lời giải (không bắt buộc) không khớp với đề này. [Mở đề không có phần lời giải] |
| `index` | `code.error.index` | `#p=` with `i` other than 0 | A puzzle code opens one puzzle; remove "&i=…" from the link. | Mã đề chỉ mở một đề; hãy bỏ "&i=…" khỏi liên kết. |

The core is checked and decoded first. A tail error never hides a valid core: the user can open the puzzle without
the tail.
The core-check, unknown-version, compressed-code and invalid-structure messages are architect-2's Phase 1 texts
(`1-study-architect-2.md`, §8.2). A Vietnamese-speaking reviewer should check every Vietnamese text before release.

### 5.11 Frozen tables and constants

The v1 codec owns frozen copies of these. A later change to the live engine must not change how an old code decodes.

**Default identity** (copies of `core/engine/palette.js` at this commit):

- `labelFor(i)`: spreadsheet letters for i = 0 … 127: A … Z, AA … AZ, BA … BZ, CA … CZ, DA … DX.
  - Algorithm: n = i + 1; while n > 0: n −= 1; prepend the letter at position n mod 26 of A–Z; n = ⌊n / 26⌋.
- `colorFor(i)`:
  - for i < 20, the base list `#e6194b #3cb44b #ffe119 #4363d8 #f58231 #911eb4 #42d4f4 #f032e6 #bfef45 #fabed4`
    `#469990 #dcbeff #9a6324 #fffac8 #800000 #aaffc3 #808000 #ffd8b1 #000075 #a9a9a9`;
  - otherwise `hslToHex((i × 137.508) mod 360, 0.65, i even ? 0.45 : 0.65)`, using the function at
    `core/engine/palette.js:33`.
  - A test pins all 128 values.
- Patterns are not stored. The renderer derives them from the piece position and count with `patternFor(i, K)`
  (`core/engine/palette.js:82`): none when K ≤ 20 or i < 20, otherwise `dots`, `hlines`, `vlines` by ⌊i / 20⌋ mod 3.
  The code keeps the piece order and K, so the patterns come back unchanged.

**Shape catalogue:**

- The free polyominoes of n = 1 … 10 cells. Counts: 1, 1, 2, 5, 12, 35, 108, 369, 1,285, 4,655 (6,473 in all).
- **Canonical form:** the smallest of the 8 transforms `orientedCells(cells, t)`. Each transform is normalised, with
  its cells sorted by y then x. Two cell lists compare cell by cell, by y then by x; when one is a prefix of the
  other, the shorter one is smaller.
- Each size list is sorted by the same comparison. For n = 4 the order is I `0,0 1,0 2,0 3,0`, L `0,0 1,0 2,0 0,1`,
  T `0,0 1,0 2,0 1,1`, O `0,0 1,0 0,1 1,1`, S `0,0 1,0 1,1 2,1`.
- **Golden hash (measured):** SHA-256 = `049504c225b9df4aa8f00971c4190ab640dbc66fe7b47e6ec1e654c3f56dae34`.
  - Input: one line per shape, sizes 1 to 10 in catalogue order.
  - Each line lists the cells as `x,y` separated by single spaces.
  - Lines are joined with `\n`, with no final newline, in UTF-8.

**Levels, score and caps** (`core/engine/levels.js:16`–`:102`, `core/engine/difficulty.js:44`,
`core/engine/policy.js:50`–`:51`):

| Item | Frozen value |
|---|---|
| Named levels | index 0–6: ids `very-easy easy normal hard expert master nightmare`, labels "Very easy", "Easy", "Normal", "Hard", "Expert", "Master", "Nightmare" |
| Hell levels | index 6 + n: id `hell-n`, label "Hell n" |
| Band edges (integer table) | index 0–10: 0, 8, 12, 17, 25, 37, 53, 77, 112, 162, 235. They equal round(10 × 1.45^(i − 1.5)) for i ≥ 1. Scores in v1 are at most 2 × 128 + 30 = 286, below the next edge, 341 (Hell 5) |
| Level of a score s | the largest index i with edge(i) ≤ s |
| Score thresholds for B (integer table, 30 entries) | 1, 1, 2, 2, 3, 4, 6, 8, 11, 15, 20, 27, 36, 48, 64, 86, 115, 153, 205, 273, 365, 486, 649, 865, 1154, 1539, 2053, 2738, 3651, 4869 |
| Score | U = 0 ? 0 : 2·U + (the number of thresholds ≤ B), which equals round(2·U + 8·log10(1 + B)) |
| Caps | branch 5,000, rows 50,000 |

**Other:**

- Certificate model `dlx-v1`.
- Alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
- CRC20 parameters (5.2).

### 5.12 Golden test vectors (measured, reference prototype)

From repository fixtures, so that tests can reproduce them. `F` is the full code; its part before the dot is the
typed core `C`. Long strings are split over lines; join them without separators.

**Repository puzzles (raw, canonical):**

```text
player/samples/sample-pack.json, puzzle 1 (also tests/fixtures/generated-sample-pack.json, puzzle 1), title "Easy":
  1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE
puzzle 2, stored title "Normal", encoded as the displayed "Normal #2":
  1D2KTH4A0GXPKPP0VSJR425KR0JJR03GKGJ0N2.1AR9VWV
puzzle 3, stored title "Hard", encoded as the displayed "Hard #3":
  1DESV14A0GXPKPP0VSJR425KR0EKJ97PGQXMQ.19M0GDB
tests/fixtures/hand-authored-pack.json, puzzle 1:
  16YHBRC5PQ0V3528M12FADS1D5515TBQVC9BBY1Y8N835B4XSNGJ9NH.1439213K5
CRC20("123456789") = 0xC80C0
```

The two sample files hold identical puzzles. Puzzles 2 and 3 changed in the sign-off round, when the title rule of
Section 5.6 was added: the earlier strings (`1D2KM92G…`, `1DESM92G…`) carried the stored titles, which re-created
as "Normal #1" and "Hard #1".

**Edge cases** (puzzle 1 of `player/samples/sample-pack.json` as a one-puzzle pack, with one field changed):

```text
title "Easy #2147483647" (kind 2 at its maximum):
  1D0J80000040000044H823PTETR3F6B0G8PF02SZY4CJ8PPTVH.18XY3J
title "Easy #2147483648" (kind 3, literal):
  1D0JCR8NGQ6Y904CS32D1Q6GW36DHM7092G47DMXNG6YCP10HCY05KZW8S4HC9567.18XNYH
certificate { status: unique, model: dlx-v1, rowLimit: 1125899906842623 } (2^50 − 1):
  1D0J6C0000000200000001ZY92G47DMXNG6YCP10HCY05KZW8S4HCE9E3.18SDXC
certificate { status: unique, model: dlx-v1, rowLimit: 9007199254740991 } (2^53 − 1, EG10 with 43 zero bits):
  1D0J6C00000000800000000ZZ4H823PTETR3F6B0G8PF02SZY4CJ8P3647.18QQGB
rating escape after a failed rebuild (rebuild forced to throw; raw form forced, because the shortest
form would be version 2):
  182SQP8KDDXJ6AV1278H68TB6CSMP6XBCEHWJTXHJ48P24WV3DXS6A8HT70P24V35ESJPR8HT49JP2WVS48P24WV1EHTQ4RBMCNJ
  24EK6C5P76S9C49PPAX3JD5HQ68HTFCH5A8HT6GP24GH278R2R8K2E9GPWRV8AHS6JRBCECH3MC1C49S6YXTME9MP2V3K48X38B1
  2EDT6YW1278H76VVCENT6JVVE48P24MH278S3AB1290H3MCSE6WV36D9J6CW3GC1H6CVKCE1P6NYQTH4A0GXPKPP0VSJR425KR0P
  FZH34J5GG3YQ.186DV3
```

The escape vector carries the claim
`{"model":"difficulty-v2","score":8,"level":"easy","saturated":false,"metrics":{"U":4,"B":0,"branchTrials":0,"rowTrials":4,"stop":"solution","R":25,"H":3.7635238801376865}}`
as text.

**Version 2, decode-only** (Node zlib at its defaults; another compressor gives another string):

```text
puzzle 3 of player/samples/sample-pack.json as a one-puzzle pack, version 2 forced, 7 inflated fill bits:
  2HFJYYXK9CARMXF7NW1FEM4T7CT1V45NAVWD8000GHXX.19M0J7Z
```

**Negative vectors:** each passes its check and must be rejected by the grammar.

| Code | Defect | Error |
|---|---|---|
| `1D0J492G47DMXNG6YCP10HCY05KZW8S4HDRJT5` | Raw core with a 1 in its 1-bit padding | `invalid` |
| `2HHJYYXK9CARMXF7NW1FEM4T7CT1V45NAVWD9G000085DD` | Version 2 with one extra inflated zero byte | `invalid` |
| `2HFJYYXK9CARMXF7NW1FEM4T7CT1V45NAVWD8200WXKQ` | Version 2 with a 1 in its inflated fill | `invalid` |
| `2HFJYYXK9CARMXF7NW1FEM4T7CT1V45NAVWD8001X1G0` | Version 2 with a 1 in its outer padding | `invalid` |
| `1D0J6C00000000800000001004H823PTETR3F6B0G8PF02SZY4CJ8PQZYQ` | Certificate rowLimit 2^53, one above the safe range | `invalid` |

**QR matrices** (pinned Nayuki encoder of Section 7.3; byte segment for the 45-character public prefix, alphanumeric
segment for F, error correction M, automatic mask, no error-correction boost). Hash: SHA-256 of the rows as ASCII
`0`/`1` (1 = dark), joined by LF, no final newline.

| URL (`https://tdat00.github.io/pentomino/player/#p=` + F) | Version, size, mask | SHA-256 of the matrix |
|---|---|---|
| Sample puzzle 1 (90 characters) | 5, 37 × 37, 6 | `8fd29495b33327d2b34f1c5b0b2554b832bb25d199f12ad21666959a823b0c42` |
| Sample puzzle 2 (91 characters) | 5, 37 × 37, 6 | `6ca966be5185d6731a4631313c86e06a9445ff187995e62a012320cda64efbc4` |
| Sample puzzle 3 (90 characters) | 5, 37 × 37, 6 | `fcfb568e43da12bdfdeeab914a4bd80ffa91140536ef7ee1db947c9ea40426c6` |
| Hand-authored puzzle 1 (110 characters) | 6, 41 × 41, 6 | `bd4069185f71651f1481a73f68bffd5e532aa48980edee7131ba953b8e50974e` |
| Architect-2's `large-576-h1` puzzle 1, F of 243 symbols (288 characters) | 11, 61 × 61, 2 | `7cd76340de36049de81dd86e02614cca72abd3eac9672d0160e5daeb90ed05b7` |

The first and last hashes equal architect-2's independent results. Architect-2's `large-576-h1.json` is in its
scratch folder; copy it into `tests/fixtures/` with the other QR fixtures. Before freezing, regenerate every vector
with the production encoder and compare it with this list. A difference means one of the two differs from Section 5.
## 6. Measured lengths with the final frame

`final-v1-run.mjs`, first puzzle of each pack.

- **Lengths:** C in symbols; F = C "." T.
- **QR:** the version at error correction M for `https://tdat00.github.io/pentomino/player/#p=` + code, with a byte
  segment for the prefix and an alphanumeric segment for the code.
- **Box:** the printed QR of F, max(25 mm, (17 + 4·version + 8) × 0.5 mm).
- **Option bits:** the repeat flag, rating, title and certificate.

| Puzzle | Cells | K / G | Option bits | Solution bits | C (typed) | F (QR, link) | QR version C / F | Box |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Repository sample, puzzle 1 | 60 | 9 / 5 | 19 | 3 | 38 | 45 | 5 / 5 | 25.0 mm |
| a1 6×10 Hard | 60 | 9 / 3 | 22 | 7 | 38 | 46 | 5 / 5 | 25.0 mm |
| a2 recipe-w1 6×10 | 60 | 9 / 3 | 22 | 8 | 37 | 45 | 5 / 5 | 25.0 mm |
| a1 Ring 8 | 60 | 9 / 4 | 22 | 4 | 40 | 47 | 5 / 5 | 25.0 mm |
| a1 Heart 10 | 75 | 14 / 3 | 42 | 29 | 45 | 57 | 5 / 6 | 25.0 mm |
| a1 12×12 | 144 | 19 / 3 | 32 | 55 | 63 | 80 | 6 / 6 | 25.0 mm |
| a1 18×20 Hell 2 | 360 | 50 / 3 | 32 | 229 | 100 | 152 | 7 / 8 | 28.5 mm |
| a1 Heart 24 Hell 2 | 432 | 58 / 3 | 32 | 290 | 122 | 186 | 8 / 9 | 30.5 mm |
| a1 22×22 Hard | 484 | 19 / 8 | 22 | 6 | 188 | 196 | 9 / 10 | 32.5 mm |
| a1 24×24 Hell 3 | 576 | 76 / 3 | 32 | 382 | 139 | 222 | 8 / 10 | 32.5 mm |
| a1 24×24 Hard | 576 | 20 / 8 | 22 | 6 | 212 | 220 | 10 / 10 | 32.5 mm |
| a1 32×18 Hell 3 | 576 | 84 / 3 | 32 | 450 | 111 | 207 | 8 / 10 | 32.5 mm |
| a2 24×24 Hell 1 | 576 | 40 / 4 | 32 | 130 | 211 | 243 | 10 / 11 | 34.5 mm |
| a2 irregular 558 Hell 3 | 558 | 75 / 3 | 32 | 392 | 153 | 238 | 8 / 10 | 32.5 mm |
| a1 26×26 Hell 3 (CLI only) | 676 | 83 / 3 | 32 | 481 | 168 | 271 | 9 / 11 | 34.5 mm |
| Repository hand-made fixture | 60 | 10 / 2 | 66 | 19 | 55 | 65 | 5 / 6 | 25.0 mm |
| a2 custom ids, Unicode letters, RGB | 60 | 10 / 2 | 66 | 20 | 225 | 235 | 10 / 10 | 32.5 mm |
| a2 128 identical pieces, 1,024 cells (version 2; raw C 52) | 1,024 | 128 / 3 | 5 | 699 | 31 | 177 | 5 / 9 | 30.5 mm |
| Synthetic: certificate | 60 | 9 / 5 | 52 | 3 | 45 | 52 | 5 / 5 | 25.0 mm |
| Synthetic: lone surrogates in title and letter | 60 | 10 / 2 | 204 | 19 | 96 | 106 | 7 / 7 | 26.5 mm |
| Synthetic: foreign rating, unknown level | 60 | 9 / 5 | 864 | 3 | 207 | 214 | 10 / 10 | 32.5 mm |
| Synthetic: v2 rating with an inconsistent level (version 2; raw C 322) | 60 | 9 / 5 | 1,440 | 3 | 303 | 310 | 12 / 12 | 36.5 mm |
| Sign-off: certificate rowLimit 2^53 − 1 | 60 | 9 / 5 | 120 | 3 | 58 | 65 | 6 / 6 | 25.0 mm |
| Sign-off: title "… #2147483647" (kind 2) | 60 | 9 / 5 | 80 | 3 | 50 | 57 | 5 / 6 | 25.0 mm |
| Sign-off: title "… #2147483648" (kind 3) | 60 | 9 / 5 | 154 | 3 | 65 | 72 | 6 / 6 | 25.0 mm |
| Sign-off: title "… #9007199254740993" (kind 3) | 60 | 9 / 5 | 202 | 3 | 75 | 82 | 6 / 6 | 25.0 mm |
| Sign-off: 1,024 cells, consistent v2 claim (version 2; raw C 58) | 1,024 | 128 / 3 | 31 | 699 | 39 | 185 | 5 / 9 | 30.5 mm |
| Sign-off: 1,024 cells, edited claim, escape (version 2; raw C 359) | 1,024 | 128 / 3 | 1,539 | 699 | 276 | 422 | 11 / 14 | 40.5 mm |

**Round trips (measured):** all 88 puzzles, each encoded in its shortest form. That is both corpora, the three
repository files, the custom and limit controls, the four synthetic edge cases and 15 sign-off puzzles in 11 packs.
Besides the rows above, the sign-off packs include one whose second and third puzzles are titled "Normal" (a level
label) and "My puzzle", one whose third puzzle has no title, and one with titles of 76, 75 and 76 code points.

- Every one decoded with the same board rows, angle, ordered pieces (ids, letters, colours, cells), clues, solution,
  full rating claim, title of the snapshot and certificate, with the normalisations of Section 3.
- Every one shows the same heading as the original at its position: 88/88.
- All 88 decoded packs passed `validatePack`, and all 88 progress fingerprints matched.
- Each typed core C alone decoded to the same starting puzzle.
- 0 of 7,630 cross-puzzle tail splices were accepted.

**Typed-length summary (measured), generated puzzles:**

| Board | C (typed) | F (full) |
|---|---:|---:|
| Up to 75 cells | 37–45 | 45–57 |
| 558–576 cells | 111–212 | 207–243 |
| All | 37–247 | 45–271 |

## 7. QR specification

- **Payload:** the full URL, target (Section 7.1) + `#p=` + F, upper case, without groups. The tail is included
  whenever the puzzle has a stored solution.
- **Segments:** a byte segment for the case-sensitive prefix (45 bytes for the public URL) and an alphanumeric
  segment for F. The dot is in the alphanumeric set.
- **Error correction M.** Modules at least 0.5 mm. Box = max(25 mm, (17 + 4v + 8) × 0.5 mm), quiet zone of 4 white
  modules included. Version 40-M holds 3,322 code symbols after this prefix and 40-L 4,227 (measured, Phase 2).
- **Encoder:** the vendored, pinned Project Nayuki generator of Section 7.3, called with explicit segments, error
  correction M (L only on the oversize ladder), versions 1–40, automatic mask and **no error-correction boost**
  (`QrCode.encodeSegments(segs, ecl, 1, 40, -1, false)`).
- **Rendering:** in `core/browser/print-sheet.js`, an opaque white rectangle plus one black SVG `<path>` made of row
  runs, at exact millimetres. Presentation attributes only, so the strict CSP (`docs/design-detail.md` §12.4) is
  unchanged. Never inverted and never on a mirrored back.

### 7.1 Target URL (D16, S2-11)

1. **Public origin:** if the page is served over `http:` or `https:` from a host that is not local, the target is
   `new URL('../player/', document.baseURI)`. This is right for GitHub Pages and forks.
2. **Local origin:** otherwise the target is the configured public URL `https://tdat00.github.io/pentomino/player/`
   (a constant next to the codec). A host is local when it is:
   - `localhost` or a name ending in `.localhost` or `.local`;
   - an IPv4 address in 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 or 169.254.0.0/16;
   - the IPv6 address `::1`, or one in `fc00::/7` or `fe80::/10`;
   - any page that is not served over `http:` or `https:` (for example `file:`).
3. The dialog shows the target in small type (`print.code.target`); on a local origin it adds
   `print.code.localTarget`.
4. **Override:** on a local origin only, the Print dialog shows a checkbox "Use this page's address in the QR code"
   (`print.code.useThisPage`), unchecked by default. When it is checked, the target is
   `new URL('../player/', document.baseURI)` and the dialog shows `print.code.devTarget`. The choice lives in the
   open dialog only: it is not stored and resets when the dialog closes. Copy link uses the same target rule, without
   the override.

### 7.2 Oversize (D17, Q5 — decided, confirmed by the user on 2026-10-25 17:50; extreme custom content only)

1. The encoder already uses the shorter of raw and DEFLATE.
2. If F exceeds version 40-M, drop the tail from both the text and the QR. The dialog notes it.
3. If it still does not fit, use error correction L, with a note.
4. If it still does not fit, print the puzzle **without code and QR**:
   - a notice in the dialog before printing;
   - a line on the sheet: "This puzzle is too large for a puzzle code".

Never truncate identity, never use `#lib`, never call an external service. Typed text that does not fit the band
continues on a labelled continuation sheet.

### 7.3 Pinned QR encoder and test decoder (S2-08)

**Encoder, shipped with the site:**

- Source: `https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js` (Project Nayuki, MIT licence).
- Upstream: 45,350 bytes, SHA-256 `2511bc17f40a3c41d4a0578995db956b38997334d3d20113a5d4dc5c49c69480`.
- Adaptation, recorded separately from the upstream digest: line endings normalised to CRLF, the final newline kept,
  then `\r\nexport { qrcodegen };\r\n` appended. Result: 46,212 bytes, SHA-256
  `26ce50602b29f72b628a1d37568655d8bd5fb65e131792c732064fd8a20d3f22` (architect-2, measured).
- Path: `core/browser/vendor/qrcodegen.js`. The MIT notice in its header stays. A test checks the adapted digest.
- Only `core/browser/qr.js` imports it.

**Decoder, tests only:**

- jsQR 1.4.0, Apache-2.0, from `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js`: 256,885 bytes, SHA-256
  `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`.
- Saved as `tests/vendor/jsqr.cjs`, with its licence from `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/LICENSE` as
  `tests/vendor/jsqr.LICENSE`. Embedded notices stay. Any line-ending change is recorded with its own digest.
- Node tests load it with `createRequire`. It is never imported by site code. No npm dependency, no package or lock
  file change, no external decoding service.

**Test procedure:**

1. Encode the five URLs of Section 5.12 and compare each matrix hash with the table there.
2. Rasterise each matrix into an opaque RGBA array at 4 pixels per module, with a 4-module white quiet zone, and
   decode it with jsQR. The text must equal the URL exactly, including the case of the path.
3. Test the SVG adapter separately: the row-run path coordinates, the white background, the quiet zone and the size
   in millimetres.
4. Keep the physical acceptance test of Section 13: print at 100 % and scan with Android and iPhone cameras.

Architect-2 ran steps 1–2 in scratch: 5 of 5 decodes were exact.
## 8. URL and route

- **Address:** `…/player/#p=<C>` or `…/player/#p=<C>.<T>`, upper case, no groups.
- **`i`:** absent or `0` is accepted; any other `i` is an error. The Player never rewrites a `#p=` address and never
  appends `&i`. `hashWithIndex` (`player/state.js:167`–`:181`) must skip it.
- **Other routes:** `#pack=`, `#lib=`, the Generator's whole-pack Play link and share codes (`1z.`, `1j.`) are
  unchanged.
- **Parsing:** `parseLocationHashResult` (`core/engine/sharecode.js:288`) accepts the key `p`. Mixing `p` with `pack`
  or `lib` is an error. `readIncoming` (`core/browser/handoff.js:180`) loads it atomically.
- **A link that fails:** the Player opens the entry dialog with the code filled in and the message of Section 5.10.
  The open pack and saved progress stay unchanged.
- **"Copy this puzzle link" (Q4, decided — confirmed by the user on 2026-10-25 17:50):** in the Generator beside
  Play and Print for the selected puzzle, and in the Player's game bar. It copies the same URL the QR carries.

### 8.1 The print/copy snapshot (D22)

One immutable snapshot is taken when the Print dialog opens or "Copy this puzzle link" is pressed. The sheet
heading, the code, the QR and the link all come from it; a change of the selected puzzle makes a new one.

| Field | Player (`printJob`, `player/app.js:357`–`:377`) | Generator (`printJob`, `generator/ui/puzzle-panel.js:170`–`:191`) |
|---|---|---|
| Board rows, pieces, clues | The open pack | The set and the selected puzzle, as its Play link writes them (`createPack`) |
| Angle | `viewRotation ?? presentation.rotation ?? 0`, the view on screen | `state.rotation` |
| Solution | The stored solution, although the Player prints no solution sheet | The stored solution |
| Rating, certificate | The stored claims | The claims `createPack` writes |
| Encoded title | The rule of Section 5.6 on the stored title and position | The same rule |
| Sheet heading | `heading(title, index)` (Section 5.6) | The same rule, instead of the card heading "Puzzle #n" (`:185`) |

- The re-created puzzle shows `heading(encoded title, 0)`, which equals the sheet heading in every case (Section 5.6).
- Both apps therefore give the same code for the same puzzle and angle.
- The heading rule must be shared, not copied: today `puzzleDisplayName` lives in `player/puzzle-title.js:26`. It
  becomes `heading` of Section 5.6 in `core/browser/puzzle-title.js`, imported by both apps.

**One preparation result** (S2-11). Print and Copy link both call `preparePuzzleShare(snapshot, { target })` and
use only its result, so the title, angle, target and oversize choices cannot differ between them:

```text
preparePuzzleShare(snapshot, { target }) ->
  { code: { C, T, F, version },          // T and the dot omitted when no solution is stored
    url,                                  // target + "#p=" + the carried code
    carried: "C.T" | "C",                 // after the oversize ladder of Section 7.2
    qr: { version, ecc: "M" | "L", size, modules } | null,   // null: printed without code and QR
    notices: ["noTail" | "lowEc" | "none" | "localTarget" | "devTarget", ...] }
```

**Worker tasks** (`core/engine/tasks.js`), plain data only:

| Task | Input | Result | Error |
|---|---|---|---|
| `encodePuzzleCode` | `{ snapshot }`: rows, rotation, pieces, clues, solution or null, rating or null, certificate or null, title or null | `{ C, T: string or null, F, version: 1 or 2 }` | `{ code }`, one of the engine codes of Section 5.10 (never for a valid pack) |
| `decodePuzzleCode` | `{ text }`, already normalised | `{ pack, hasTail, tailError: null or "tail-check", "tail-tag" or "tail-invalid" }` | `{ code, candidate?: { group, position, expected, typed } }` |

When only the tail fails, the result carries the validated core pack, without its solution, and `tailError`. The
Player does not open it until the user chooses "Open without the solution part".
## 9. Code entry in the Player

**Where:**

- on the start screen when no pack is open;
- as "Enter puzzle code / Nhập mã đề" in the Player menu at any time.

**The field:**

- a labelled multi-line field with monospace text and spell-check off;
- it accepts C, C.T, grouped or lower-case text, or a pasted URL;
- it shows the count of characters typed;
- the button is "Open puzzle / Mở đề".

**Validation:**

- Normalise as in Section 5.8, check, decode and validate, then open atomically.
- On error, keep the input and show the message from Section 5.10 (`aria-invalid`, `role="alert"`).
- **Correction candidate:** only when exactly one single-symbol change passes both the check and full decoding, and
  the component has at most 5,732 symbols. It is found with a syndrome lookup. It is applied only when the user
  confirms; a mere suggestion never opens a puzzle.

**Progress:**

- If saved progress exists for the fingerprint, restore it and say "Saved moves restored; Replay starts as printed" /
  "Đã khôi phục các nước đi đã lưu; Chơi lại sẽ bắt đầu như bản in".
- Never erase progress silently.

**Without a tail:**

- The puzzle is fully playable.
- Verification searches in the background and gives up as "not verified" after the worker deadline (about 115 s;
  `core/engine/policy.js:54`, `player/state.js:513`–`:561`). The measured Node searches for four Hell boards ended
  without a result after 220–1,108 s.
- Hints search on their own. The dialog suggests scanning the QR or typing the optional part for instant
  verification.

## 10. First-sheet layout

Fonts and positions are in millimetres, as in the existing SVG (1 unit = 1 mm). The mock-up shows puzzle 1 of
`player/samples/sample-pack.json` printed from the Player (Section 5.12); the set line is an example. Printed labels
use the app's current language, like every other sheet text; the mock-up shows both languages.

```text
+--------------------------------------------------------------------------------------+
| Easy #1                         (8 mm, bold, baseline 19)          +---------------+ |
| Easy: score 8                   (4 mm, 26.5)                       |               | |
| Set: Expert, ABCD-EFGH-JKLM     (4 mm, 32)                         |      QR       | |
| Puzzle code / Mã đề (38 characters)   (3.2 mm grey, 38)            |  25-35 mm box | |
| 1D0J 492G 47DM XNG6 YCP1 0HCY 05KZ W8S4 HCN2 QR   (4.2 mm mono)    |               | |
| + solution, optional / + lời giải, không bắt buộc   (3.2 mm grey)  +---------------+ |
| .18V3 WE                         (3.2 mm mono, grey)         Scan to open / Quét để mở |
|                                                              tdat00.github.io/...     |
| ------------------------------------------------------------------------------------ |
| [board preview with clues]   PREVIEW_TOP = band bottom + 4 mm                          |
| Pieces to place (6)                                                                    |
| [50 mm bar]  cell size                                                                 |
+--------------------------------------------------------------------------------------+
```

- **Puzzle seed line:** dropped (Q3, decided — confirmed by the user on 2026-10-25 17:50). In `puzzleDetails`
  (`core/browser/print-dialog.js:55`–`:60`) the rating line always uses `print.sheet.ratingOnly`, the seed-only line
  goes, and the set line stays. The keys `print.sheet.rating` and `print.sheet.seed` are removed when nothing uses
  them.
- **Heading:** the snapshot's sheet heading (Section 8.1), in both apps.

### 10.1 Layout contract (S2-06)

The page is A4, 210 × 297 mm, with the existing 10 mm margin (`core/browser/print-layout.js:15`–`:20`), so content
runs from x = 10 to 200 and y = 10 to 287.

**QR column:**

- Box side b = max(25, (17 + 4v + 8) × 0.5) mm, the 4-module quiet zone inside it. Version 40 gives 92.5 mm.
- The box's top-right corner is at (200, 10).
- Below it: "Scan to open" (3.2 mm) on a baseline at 10 + b + 4.5, then the target host (2.8 mm) at 10 + b + 8.5.
  The column ends at 10 + b + 10.

**Text column:**

- From x = 10. Its width is W = 184 − b while a line's top is above the QR column's end, and 190 below it.
- The title wraps at word boundaries within W, at most 3 lines of 8 mm with a 9 mm pitch. A longer title is shortened
  with "…" on paper only; the code still carries the whole title.
- The detail lines, the code label, the code lines, the tail label and the tail lines follow the existing heading
  pitch.

**Code lines:**

- Typed core: 4.2 mm monospace, 5.5 mm pitch. Tail: 3.2 mm monospace, 4.5 mm pitch, grey.
- Character advance is fixed at 0.6 × the font size: 2.52 mm for the core, 1.92 mm for the tail. Every line is one
  `<text>` with `textLength` = characters × advance and `lengthAdjust="spacingAndGlyphs"`, so the width never
  depends on the installed font.
- A group is 4 characters plus one space. Groups per line = ⌊(W + advance) / (5 × advance)⌋, never fewer than 1.
- Computed examples for the core: 12 groups beside a 25 mm box (W = 159), 7 beside a version-40 box (W = 91.5) and
  15 at full width.

**Band and preview reserve:**

- Band bottom = the larger of the text column's last baseline + 2 mm and the QR column's end.
- First-sheet `PREVIEW_TOP` = band bottom + 4 mm. The board preview and the pieces to place keep at least 120 mm:
  `PREVIEW_BOTTOM` − `PREVIEW_TOP` ≥ 120 (`PREVIEW_BOTTOM` = 273, `core/browser/print-layout.js:32`), so the band ends
  at y = 149 at most.
- `layoutPreview` already shrinks the preview to fit (`:400`–`:412`).
- The solution sheet keeps today's top of 40 mm (`PREVIEW_TOP`, `:30`; `layoutSolution`, `:517`): it has no code
  band.

**Continuation:**

- Code lines (core, then tail) that would end below y = 149 − 5.5 move to continuation sheets. The first sheet's last
  code line is then followed by "Continued on the next sheet" (`print.sheet.codeMore`).
- A continuation sheet has the heading `print.sheet.codeContinued` (6 mm bold, baseline 19) and the puzzle heading
  (4 mm, baseline 26.5). Code lines run at full width from baseline 36, down to 287. That is 15 groups and up to 46
  lines, 2,760 core symbols per sheet.
- The QR stays on the first sheet.
- **Sheet order, one side:** puzzle sheet, continuation sheets, solution sheet (if chosen), piece sheets, board
  sheets.
- **Sheet order, two sides:** the puzzle sheet's back is the solution or blank, as today
  (`core/browser/print-layout.js:538`–`:565`). Each continuation sheet follows, with a blank back, so every piece and
  board sheet keeps its mirrored back on the same leaf. The paper count grows by one per continuation sheet.
- Mirrored backs never carry the code or the QR. Piece and board sheets, and the cut-out scale, are unchanged.

**Without code** (Section 7.2, step 4): the band holds the heading and `print.sheet.noCode` in place of the code and
the QR.
### 10.2 Texts (EN/VI)

The keys are proposals that follow the existing pattern (`print.sheet.*` for sheet texts, `print.*` for the dialog).

- Print texts go in `core/browser/print-texts.js`, which both apps spread into their locale packs.
- Player texts go in `player/locale.en.js` and `player/locale.vi.js`; Generator texts in `generator/locale.en.js`
  and `generator/locale.vi.js`.

| Key | English | Vietnamese |
|---|---|---|
| `print.sheet.code` | Puzzle code ({count} characters) | Mã đề ({count} ký tự) |
| `print.sheet.codeTail` | + solution, optional | + lời giải, không bắt buộc |
| `print.sheet.scan` | Scan to open | Quét để mở |
| `print.sheet.codeContinued` | Puzzle code (continued) | Mã đề (tiếp theo) |
| `print.sheet.codeMore` | Continued on the next sheet | Tiếp ở trang sau |
| `print.sheet.noCode` | This puzzle is too large for a puzzle code. | Đề này quá lớn để có mã đề. |
| `print.code.target` | The QR code opens {url} | Mã QR mở {url} |
| `print.code.localTarget` | This page is local; the QR code uses the public Player. | Trang này đang chạy cục bộ; mã QR dùng trình chơi công khai. |
| `print.code.devTarget` | The QR code opens a local address that other devices may not reach. | Mã QR mở một địa chỉ cục bộ mà thiết bị khác có thể không truy cập được. |
| `print.code.useThisPage` | Use this page's address in the QR code | Dùng địa chỉ của trang này trong mã QR |
| `print.code.noTail` | The code is too long for one QR code; the optional solution part is left out. | Mã quá dài cho một mã QR; phần lời giải không bắt buộc được bỏ đi. |
| `print.code.lowEc` | The QR code uses low error correction because the code is long. | Mã QR dùng mức sửa lỗi thấp vì mã dài. |
| `print.code.none` | This puzzle is too large for a puzzle code and a QR code; it will be printed without them. | Đề này quá lớn cho mã đề và mã QR; đề sẽ được in không có chúng. |
| `code.enter` | Enter puzzle code | Nhập mã đề |
| `code.field` | Puzzle code | Mã đề |
| `code.count` | {count} characters | {count} ký tự |
| `code.open` | Open puzzle | Mở đề |
| `code.restored` | Saved moves restored; Replay starts as printed. | Đã khôi phục các nước đi đã lưu; Chơi lại sẽ bắt đầu như bản in. |
| `code.copyLink` (both apps) | Copy this puzzle link | Sao chép liên kết đề này |
| `code.copied` (both apps) | Link copied | Đã sao chép liên kết |
| `code.error.*` | Section 5.10 | Section 5.10 |
| `ui.puzzleNumber` (changed, Section 5.6) | Puzzle #{n} (was "Puzzle {n}") | Đề #{n} (was "Đề {n}") |

## 11. Compatibility and storage

- **Pack format:** no change. A decoded code is an ordinary valid one-puzzle pack, with a complete rating claim
  rebuilt (D7). `validatePack`, `serializePack`, share codes, `#pack=` and `#lib=` are unchanged.
- **Decoded pack:** `createPack({ board, rotation, pieces, witness: null, puzzles: [puzzle] })`
  (`core/engine/pack.js:1322`), without `generation` or `meta`. The puzzle has the recomputed id, the title if any,
  the clues, the solution or `null`, the rating claim and the certificate. **Measured** (`r4-envelope.mjs`): all 82
  decoded test packs built this way (before the last three sign-off puzzles were added) passed `validatePack`. The id
  stayed the same for the 73 puzzles of generated packs; the 9 puzzles with custom ids got the recomputed one.
- **Progress:** the fingerprint of a decoded puzzle equals the original's (88/88), so saved progress resumes.
- **Storage:** a decoded pack is stored like a pack opened from `#pack=` (`docs/design-detail.md` §9.6). The address
  stays `#p=`.
- **Versioning:** the version symbol and the tail tag reserve values for future formats.
- **Frozen v1 data:** the catalogue order, `labelFor` and `colorFor`, the integer score thresholds, band edges, caps
  and level labels. The display colour remap, letter marks and patterns are a documented rendering contract with a
  golden test.
- **Visible changes outside the code:** an untitled puzzle's heading becomes "Puzzle #n" / "Đề #n", a title of 76–80
  code points no longer gets an automatic number (Section 5.6), and the Generator's printed heading becomes the
  displayed title (D22).

## 12. Implementation plan

1. **Codec, engine (pure, Node-testable):** `core/engine/puzzlecode.js`.
   - bit writer and reader with exact (BigInt) EG, `tb`, colex ranks, CRC20, base32, normalisation;
   - the frozen catalogue (built lazily off the main thread, or shipped as frozen data, with a golden hash);
   - encoder and decoder of Sections 5.2–5.7 for versions 1 and 2, with the bounds of Section 5.9;
   - the count-only rating rebuild with `preparePlacements` and `countPlacements`, the frozen integer tables, and the
     escape on any failure;
   - the engine error codes of Section 5.10.
2. **Worker tasks:** in `core/engine/tasks.js`, `encodePuzzleCode` and `decodePuzzleCode` with the shapes of
   Section 8.1, so the cold catalogue build (549 ms measured by architect-2) never blocks the page.
3. **Snapshot and heading:** `core/browser/puzzle-title.js` (moved from `player/puzzle-title.js`, with the
   `ui.puzzleNumber` change) and `core/browser/puzzle-snapshot.js`: `puzzleSnapshot` and `preparePuzzleShare`
   (Section 8.1).
4. **Route:** in `core/engine/sharecode.js`, key `p` in `parseLocationHashResult` and a `puzzleCodeUrl(base, code)`
   helper. In `core/browser/handoff.js`, `readIncoming` for `#p=`. In `player/state.js`, no `&i` for `#p`.
5. **Player entry:** in `player/app.js`, the start-screen field and the menu item "Enter puzzle code"; progress
   notice; texts in `player/locale.en.js` and `player/locale.vi.js`.
6. **QR:**
   - `core/browser/vendor/qrcodegen.js`: the pinned, adapted copy of Section 7.3;
   - `core/browser/qr.js`: the adapter (segments, error correction, capacity check, SVG path);
   - the target URL rules and the override of Section 7.1;
   - `tests/vendor/jsqr.cjs` and `tests/vendor/jsqr.LICENSE`, tests only.
7. **Print:**
   - `core/browser/print-dialog.js`: call `preparePuzzleShare` when the dialog opens, and again when the selection
     changes; show the target, the override and the oversize notices;
   - `core/browser/print-layout.js`: the band, `PREVIEW_TOP` and continuation sheets of Section 10.1;
   - `core/browser/print-sheet.js`: the code band, the continuation sheet and the QR path;
   - `core/browser/print-texts.js`: EN/VI texts;
   - `puzzleDetails`: drop the puzzle seed (Q3);
   - `generator/ui/puzzle-panel.js:185` and `player/app.js:372`: the snapshot's sheet heading.
8. **Copy link:** in `generator/ui/puzzle-panel.js` and the Player game bar, through `preparePuzzleShare`.
9. **Optional:** `tools/generate.mjs --code` prints codes for CLI packs.
10. **Living documents:**

   | Document | Update |
   |---|---|
   | `docs/design-brief.md` | "Print on paper" (lines 68–78: "so both can be made again" becomes "code and QR re-create the puzzle"); "Limits, waiting, and sharing" |
   | `docs/design-detail.md` §8.6 | The CLI replay sentence, line 1675 |
   | §9.2–§9.4 | Puzzle code, route, ways in |
   | §9.5 | Fast path with a tail |
   | §10.5 | Copy link |
   | §11.1, §11.12 | Entry and address |
   | §11.15 | Printing: band, QR, target and override, oversize, seed line, layout contract, continuation sheets, Generator heading |
   | §11 (headings) | The shared heading rule and the "Puzzle #n" / "Đề #n" untitled heading |
   | §9.7 | Decoder bounds of Section 5.9 |
   | §12.4 | Vendored module, CSP unchanged |
   | New subsection | The puzzle code v1 specification of Section 5, with the vectors of Section 5.12 |
   | `README.md` | Features, Printing, Using the Player, in both languages |

**Acceptance criteria per step:**

| Step | Done when |
|---|---|
| 1. Codec | The encoder reproduces every raw string of Section 5.12 exactly (puzzles, edge cases) and the catalogue hash of Section 5.11. The decoder decodes the version-2 vector and rejects every negative vector with `invalid`. All corpus and edge cases of Section 6 round-trip with the normalisations of Section 3, pass `validatePack` and keep their progress fingerprint. The integer score and band tables equal the current functions for all 640,128 (U, B) pairs. A rebuild forced to throw gives the escape vector. Every bound of Section 5.9 has a failing-input test. Runs in Node without a DOM |
| 2. Worker tasks | The catalogue is never built on the main thread. Results and errors have the shapes of Section 8.1; a tail error returns the unopened core |
| 3. Snapshot and heading | For every corpus puzzle at every position, and for titles of 75 and 76 code points at positions 1–100, `heading(encoded title, 0)` equals the sheet heading. A turned Player view is carried as the angle; a stored solution is carried in the Player although it prints no solution sheet. Print and Copy link give the same URL |
| 4. Route | `#p=C`, `#p=C.T`, lower case and `&i=0` open the puzzle; `&i=1` and mixed keys give their messages, also when pasted into the entry field; the address is never rewritten; existing `#pack=` and `#lib=` tests pass unchanged |
| 5. Player entry | Every message of Section 5.10 appears in EN and VI; a failed entry keeps the input, the open pack and the progress; a candidate opens nothing until confirmed; saved progress is restored with its notice |
| 6. QR | The five matrix hashes of Section 5.12 match; jsQR reads back exactly the five URLs; both vendored files match their recorded digests and keep their licence notices; site code never imports `tests/vendor/` |
| 7. Print | The band, QR and preview never overlap for any option combination, a version-40 QR, an 80-character title, continuation sheets and two-sided printing; the preview keeps at least 120 mm; the solution sheet keeps its 40 mm top; the seed line is gone; the oversize ladder shows its notices; a print started after a selection change uses the new puzzle; the cut-out scale is unchanged |
| 8. Copy link | Both apps copy exactly the URL the QR carries and show "Link copied"; a URL above 16,000 characters is refused with the existing message |
| 9. Command-line codes | `tools/generate.mjs --code` prints the same F as the browser encoder for the same pack |
| 10. Documents | The living documents describe the shipped behaviour; `npm run check` and `npm test` pass |
## 13. Test plan

**Codec:**

- Round trips for every corpus puzzle, the sample, the fixtures, custom identities, lone surrogates, repeated shapes,
  holes, padded boards, the pack limits and U = 0 in the engine.
- G = K (every piece a clue) is engine-only. As a pack it is a negative test: the code decodes, and `validatePack`
  rejects it (`core/engine/pack.js:893`), giving `invalid`.
- Golden strings: all vectors of Section 5.12. Raw strings are compared exactly; the version-2 vector is decode-only,
  because compressor output differs between engines; every negative vector must give `invalid`.
- EG: round trips at 2^50 − 1 and 2^53 − 1; an EG value of 2^53, or a longer zero prefix, is rejected.
- Catalogue golden hash.

**Checksum (slow cases tagged `slow`):**

- the CRC20 vector 0xC80C0 and the residue 0x6CDCE;
- every single-symbol substitution and adjacent swap;
- bursts up to 20 bits;
- syndrome uniqueness up to 5,732 symbols;
- insertions and deletions, including appended `0` (no guarantee; measured samples);
- cross-puzzle tail splices (measured samples).

**Decoder:**

- Every bound of Section 5.9, with oversized counts, impossible ranks, a non-zero padding bit, trailing bits, an
  extra inflated byte and a non-zero inflated fill bit.
- Unknown version or tag, a damaged tail, a missing `DecompressionStream`, inflated output above 64 KiB.

**Rating and title:**

- The rebuilt claim equals the stored one; the 1,024-cell, 128-piece pack rebuilds without the exact-cover model.
- The integer score and band tables against the current functions: all 640,128 (U, B) pairs.
- Escape cases: another model, fractional, inconsistent, and a rebuild forced to throw.
- All four title kinds, the kind-2 boundary (2,147,483,647 and 2,147,483,648) and a suffix beyond 2^53.
- Snapshot headings: "Normal" at position 2, a custom title at position 3, an untitled puzzle at positions 1 and 3,
  titles of 75 and 76 code points at positions 1, 2 and 100.

**Route:** `#p` alone, `i=0`, rejected `i>0`, mixed keys, lower case, grouped, a pasted URL with each of these.
Legacy `#pack` and `#lib` are unchanged.

**Player:**

- Entry dialog messages in EN and VI.
- The correction candidate is never applied without confirmation.
- Progress restored with its notice.
- A tail error opens nothing until "Open without the solution part" is chosen.
- Verification fast path with a tail.

**Print:**

- The band, QR and preview never overlap in any option, rotation, Fit to page, two-sided or solution case, with a
  version-40 QR and an 80-character title.
- Continuation sheets, one- and two-sided, with blank backs; the paper count.
- The oversize ladder and its notices, in the dialog and on the sheet.
- Target URL rules for each local-host case of Section 7.1, a public origin and the override.

**QR:** the procedure of Section 7.3: matrix hashes, jsQR decoding, the SVG path. `tools/check-site.mjs`: imports,
CSP and `?v=` stamps; site code never imports `tests/vendor/`.

**Acceptance:** print at 100 % on two printers and scan with Android and iPhone cameras: 6×10, a 576-cell Hell 3 with
its tail, and the longest code. The puzzle must open identically.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The frozen catalogue or v2 constants change by accident | Golden hashes and vectors; the v1 codec owns frozen copies, including the integer score and band tables |
| A future renderer changes the colours, marks or patterns of old cut-outs | Documented contract and golden rendering test; any intended change keeps a compatibility path |
| `H` differs in its last bit between engines | Not displayed; score and level do not depend on it; the claim stays valid; documented |
| A typo passes the check | Every single-symbol substitution is caught, and two-symbol substitutions up to 5,732 symbols; structure and `validatePack` checks; otherwise a chance of about 1 in a million |
| A user accepts a wrong correction candidate | Only a candidate, shown against the paper; explicit confirmation |
| The QR does not scan from a poor print | Error correction M, 0.5 mm modules, 25 mm minimum box, white quiet zone; physical acceptance tests |
| A local printout points to localhost | The target rules of Section 7.1; the override is per dialog and warned |
| Custom content is too long | The oversize ladder of Section 7.2; continuation sheets; never truncate |
| A malicious or large input | Bounds before allocation; worker decode; a decompression limit |
| Users notice that long titles (76–80 code points) and untitled puzzles show their headings slightly differently | Documented visible changes (Section 5.6, 11); they make every re-created heading exact |
| The printed code must match the selected puzzle | One immutable snapshot and one preparation result for Print and Copy link, renewed when the selection changes |
## 15. User decisions

The questions were sent at 17:42. On 2026-10-25 at 17:50 the user accepted every recommended default and the
orchestrator's technical decisions (CRC-20, rating rebuild from three numbers, target-URL rules).

| # | Question | Decision |
|---|---|---|
| Q1 | Print the optional solution tail as text? | Yes, smaller and marked optional. The QR and the link carry C.T whenever a solution is stored. Decided — confirmed by the user on 2026-10-25 17:50 |
| Q2 | Should the re-created puzzle show the same title, level and score? | Yes. Decided — confirmed by the user on 2026-10-25 17:50 |
| Q3 | Drop the printed puzzle seed (keep level, score and the set line)? | Drop it. Decided — confirmed by the user on 2026-10-25 17:50 |
| Q4 | Add "Copy this puzzle link" in both apps? | Yes. Decided — confirmed by the user on 2026-10-25 17:50 |
| Q5 | Extreme custom content that cannot fit a QR? | Print without code and QR, with a clear notice before printing and a line on the sheet (D17). Decided — confirmed by the user on 2026-10-25 17:50 |

No open question remains. The next step is the implementation task files in `tasks/regenerate-puzzle/`.

## Appendix. Phase documents and evidence

| Document | Content |
|---|---|
| `1-study-architect-1.md` | Current state, experiments E1–E7, prototype `pcode.mjs`, first lengths |
| `1-study-architect-2.md` | Current state, print collisions, P1 prototype, UX messages |
| `2-review-of-architect-2.md` | Same-corpus comparison, verification timing, first QR measurements |
| `2-review-of-architect-1.md` | Two blockers (rating, checksum framing), QR sizes, encoder vendoring |
| `3-response-to-review-architect-1.md` | Fixes: rating rebuild, corrected frame, final XOR |
| `3-response-to-review-architect-2.md` | C.T form, CRC-30 preference, watchdog evidence, title kinds |
| `4-verification-architect-2.md` | Independent Phase 4 checks: CRC frame and bound, tail binding, rating rebuild (73/73), two gaps of an earlier prototype snapshot, which `final-v1.mjs` fixes; the sign-off findings S2-01 to S2-11, the integer tables, the QR pins and the five decoded matrices |
| `working-log.md` | Orchestrator log |

**Scratch evidence** (architect-1 folder):

| File | Content |
|---|---|
| `final-v1.mjs`, `pcode-v1.mjs` | Reference codec implementing Section 5, versions 1 and 2 (updated in the sign-off round; the earlier state is kept as `*-pre-signoff.mjs`) |
| `final-v1-run.mjs`, `final-v1-results.json` | Round trips, lengths, QR versions, golden vectors, catalogue hash |
| `final-proto.mjs`, `final-lib.mjs` | First final-frame prototype (superseded) |
| `r4-deflate.mjs` | DEFLATE variant on the final frame |
| `r4-envelope.mjs` | Decoded pack without provenance; puzzle ids |
| `r4-score.mjs` | Integer score and band tables against the current functions |
| `r5-vectors.mjs`, `r5-vectors.json` | Edge-case, version-2 and negative vectors; QR matrix hashes (using architect-2's pinned encoder copy, read-only) |
| `r4-splice.mjs` | Tail binding |
| `r3-crc.mjs`, `r3-len*.mjs` | Checksum properties |
| `r3-rating.mjs` | Rating rebuild |
| `verify-one.mjs`, `vo-*.txt` | Verification without a solution |
| `qr-measure.mjs` | QR versions and decoding |
| `pcode.mjs` | Phase 1 inner coding |

Architect-2's folder holds its corpus, `cross-*` and `phase3-*` experiments, and the reference QR encoder.

# RP01 — Single-puzzle codec, frozen v1 data and bounded decoding

| Header | Value |
|---|---|
| ID | RP01 |
| Depends on | None |
| Estimated size | Large: approximately 1,500–2,500 implementation/test lines |
| Owner role | Core codec |
| Milestone | M1 — portable, independently testable puzzle representation |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§3–5, 11–13; traceability only |
| Implementation status | Not started |

## Goal & business context

A printout must recreate one selected puzzle without seeds or session history.
Preserve the authored board frame, piece identities, clues and display angle.
Carry an available stored answer in an optional checked tail.
Preserve the title, complete rating claim and certificate.
Do not encode the rest of the pack, generation provenance or current moves.

The printed core must remain compact enough for manual entry.
The exact same code is reusable in a URL and QR.
A core alone is valid and playable without an answer.
A tail failure must never silently substitute a different puzzle or answer.

## Scope

### In scope

- Bit I/O, exact Exp-Golomb, truncated binary and colex ranks.
- Frozen v1 geometry/catalogue, labels, RGB defaults and rating constants.
- Core/tail encoding and decoding for raw and DEFLATE payloads.
- Checksum, input normalisation, bounds and typed errors.
- One-substitution correction candidate calculation, never automatic loading.
- Ordinary one-puzzle Pack construction and existing validation.
- Golden strings, negative vectors and property/regression tests.

### Out of scope

- Worker lifecycle and app UI.
- QR encoding, print layout or clipboard operations.
- Regenerating from seeds.
- Searching for a new answer or rerating with a solver.
- Changes to pack/storage schemas or progress identity.
- Main-thread browser catalogue generation.

## Repository rules

- Native ES modules, `// @ts-check`, JSDoc, no build step.
- No npm dependency and no external runtime service.
- Browser-importable source uses `.js`.
- No DOM, storage, clock or network access in the codec.
- Compression uses native streams in browser code, not `node:zlib` imports.
- Node-only tests may use Node zlib as an independent oracle.
- UTF-8 without BOM; CRLF; no trailing whitespace; final newline.
- Do not edit historical docs or `tasks/init-design/`.
- Do not import or copy a session prototype into production.
- Do not commit, stage, stash, reset, push or change branches.
- The orchestrator verifies and commits once per accepted task.
- Acquire the documentation slot for living-doc/README changes.
- Every behaviour change and its relevant living-doc update land together.

## Inputs & context

### Public input

```ts
type XY = [number, number];
type Piece = {
  id: string;
  label: string;
  color: string;
  cells: XY[];
};
type Pose = {
  piece: string;
  x: number;
  y: number;
  turn: 0 | 1 | 2 | 3;
  mirrored: boolean;
};
type RatingClaim = {
  model: string;
  score: number;
  level: string;
  saturated?: boolean;
  censored?: boolean;
  metrics?: object;
};
type CertificateClaim = {
  status: 'unique' | 'multiple' | 'not-proved' | 'unsatisfiable';
  model: string;
  rowLimit?: number;
};
type PuzzleCodeSnapshot = {
  rows: string[];
  rotation: number;
  pieces: Piece[];
  clues: Pose[];
  solution: Pose[] | null;
  rating: RatingClaim | null;
  certificate: CertificateClaim | null;
  title: string | null;
};
```

The browser snapshot owner resolves the displayed title before this call.
The codec does not read an app index, locale or current Player placements.
Rows include blocked margins; do not trim them.
The angle is the pre-print display angle, not a paper-fit rotation.
All arrays are detached input data and must not be mutated.

### Public exports

```ts
type EncodedPuzzleCode = {
  C: string;
  T: string | null;
  F: string;
  version: 1 | 2;
};
type CodeCandidate = {
  component: 'core' | 'tail';
  group: number;
  position: number;
  expected: string;
  typed: string;
  correctedCode: string;
};
type DecodedPuzzleCode = {
  pack: Pack;
  hasTail: boolean;
  tailError: null | 'tail-check' | 'tail-tag' | 'tail-invalid';
  candidate?: CodeCandidate;
};
class PuzzleCodeError extends Error {
  code: string;
  params?: Record<string, string | number>;
  candidate?: CodeCandidate;
}
normalizePuzzleCodeInput(text: string): string;
normalizePuzzleCodeValue(value: string): string;
parsePuzzleHash(hash: string):
  | { ok: true; value: { p: string; index: 0 } }
  | { ok: false; code: 'index' | 'invalid'; message: string };
encodePuzzleCode(
  snapshot: PuzzleCodeSnapshot,
  options?: { compression?: 'auto' | 'raw' }
): Promise<EncodedPuzzleCode>;
decodePuzzleCode(text: string): Promise<DecodedPuzzleCode>;
```

Export from `core/engine/puzzlecode.js`.
RP01 owns `core/engine/puzzlecode-input.js`, including `parsePuzzleHash` and
the two normalizers. RP01 must not import `sharecode.js` or wait for RP02.
RP02 later makes `parseLocationHashResult` delegate to this module for `p`.
This ownership removes the dependency cycle and leaves legacy pack/lib parsing
with RP02's existing host parser.
Define the lightweight input error class in this input module and re-export it
from `puzzlecode.js`; the input module must not import the codec implementation.
No shape catalogue, compression or browser side effect belongs in the parser.

### Single-owner puzzle-hash parser

`parsePuzzleHash` performs structural extraction only; it does not decode a
puzzle or build a catalogue. Its exact algorithm is:

1. Require text; use the body after the first `#`, or the entire string if
   there is no `#`.
2. Split that body on `&`. The key is the text before the first `=`;
   the value is everything after that first `=`, or empty if no `=` exists.
3. Keys are case-sensitive. Known keys are `p`, `pack`, `lib`, `i`.
   Ignore unknown keys, including repeated unknown keys.
4. A repeated known key, missing/empty `p`, or `p` together with `pack` or
   `lib` returns `invalid`.
5. `i` absent or exactly the string `0` returns index zero.
   Another value matching `^(?:0|[1-9][0-9]{0,5})$` returns `index`.
   Every other `i` value returns `invalid`, including `00`, negatives,
   whitespace, more than six digits and URI-escaped digits.
6. Decode the `p` value exactly once with `decodeURIComponent`.
   A `URIError` or an empty decoded value returns `invalid`.
   Do not decode keys or `i`; `+` remains `+`, not a space.
7. Return the decoded-but-not-normalized `p` and `index:0`.

`normalizePuzzleCodeInput` uses this parser for text containing `#`, then
applies only the value normalizer. Otherwise it treats the input as a bare code.
`normalizePuzzleCodeValue` performs grouping removal, uppercasing/aliases and
alphabet validation only. It never parses another hash or URI-decodes again.
Thus `%2520` is not decoded twice and an encoded `#` cannot introduce a nested
`p` route. A preserved `+` fails later as `bad-char`.
Both functions apply the existing input/code-length bounds at their layer.

RP01 owns `tests/fixtures/puzzlecode-hashes.json`, a table of structural cases
with `{hash, ok, p?, code?}`. Include ordinary/empty/missing p, mixed/repeated
known keys, ignored unknown keys, i=0/1/00/-1/1000000, invalid percent escapes,
encoded grouping, a literal plus and a twice-encoded value.
RP02 reads that same fixture for p-bearing host-parser cases and checks its
explicit error mapping. Missing-p legacy routes remain separate host tests.

Encoding defaults to the shortest complete core; raw wins ties.
`compression:'raw'` is an explicit deterministic test/CLI seam.
The worker uses default auto mode.
If native compression is unavailable, auto encoding uses raw rather than failing
an otherwise valid snapshot. Decoding version 2 still requires a decompressor.
F is exactly C or C plus dot plus T.
Do not return grouped display text in these fields.

A bad core throws a typed `PuzzleCodeError`.
A valid core with a bad tail returns its validated core Pack plus `tailError`.
That result is not permission for a browser caller to open it automatically.
Only explicit user confirmation may choose core-only recovery.
A successfully decoded tail sets `hasTail:true` and is a validated stored answer.

The Pack uses the existing `pentomino-pack` version 1 schema.
It has one puzzle, recomputed `puzzleId`, no witness, generation or meta.
Use `createPack`, `serializePack`/`validatePack` as appropriate.
Preserve complete claims; never serialize a `verified` flag.

### Correction contract

Calculate a candidate only after a checksum failure.
Do not repair an unknown but checksum-valid future version.
Do not repair arbitrary structure errors by inventing values.
Normalise aliases/grouping before considering positions.
A position is within core or tail, excluding the dot.
Groups contain four symbols and are numbered from one.
Character positions within a group are one through four.

Use CRC syndrome lookup, not one full decode per possible character edit.
A candidate must pass checksum and complete bounded decoding.
Offer it only when exactly one one-symbol substitution qualifies.
Respect the 5,732-symbol coverage bound of the normative contract below.
For a tail, apply the bound to its covered logical CRC word.
Never apply or open a candidate within the engine.
Return `correctedCode` so a UI can reconfirm it against the still-current input.

Keep candidate work on a worker in browser integration.
Tests in Node may call it directly.
Do not build the catalogue on module import.
Build/cache it lazily in the worker, or ship verified frozen data.

### Fixed geometry conventions

Coordinates grow right and down.
The transform index is `t = turn + 4*mirrored`.
Mirror x first, then apply clockwise quarter turns.
The eight transforms are exactly:

```text
0: ( x,  y)
1: (-y,  x)
2: (-x, -y)
3: ( y, -x)
4: (-x,  y)
5: (-y, -x)
6: ( x, -y)
7: ( y,  x)
```

Normalise by subtracting minimum x and minimum y.
Turn negative zero into zero.
Sort cells numerically by y, then x.
Compare cell lists numerically by y, then x at each cell, then by length.
The canonical shape is the least normalized transform under that comparison.
Distinct orientations iterate t from 0 through 7 and keep the first occurrence.
Symmetric pose notation uses the smallest equivalent transform.
Pose cells are the normalized transformed stored cells translated by x/y.
Do not treat a pose's x/y as a click handle or centre.

The rating's free-piece order is ascending size, canonical shape, then id.
The piece-set wire order is the source array order, with conditional flags.
Those are not interchangeable orders.

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

## Inlined normative wire contract

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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

**Measured guarantees** (the design prototype, not in the repository; independently confirmed by architect-2 in Phase 4):

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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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
- **Measured** with the final frame (the design prototype (not in the repository), zlib levels 6 and 9, all 82 puzzles): raw is shorter for 78.
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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

### 5.4 Version-1 payload, in order

The design prototype (not in the repository) writes exactly this order. The golden vectors of
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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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
  640,128 cases, no difference (the design prototype (not in the repository); architect-2 found the same).

**`H` exactness:** exact within one JavaScript engine. `Math.log2` may differ in the last bit between engines. Score
and level do not depend on `H`; no screen shows it, and the claim stays valid.

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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
Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

### 5.7 Certificate

- `u1` present.
- If present:
  - `tb(status, 4)`: unique, multiple, not-proved, unsatisfiable;
  - `u1` model is `dlx-v1` (`core/engine/clues.js:87`), else `text(model)`;
  - `u1` rowLimit present, then EG10(rowLimit). The pack allows any safe integer (`core/engine/pack.js:121`, `:860`),
    so EG10 must handle 2^53 − 1 (5.1).

The corpus has no certificates. A synthetic unique certificate round-trips exactly, also with rowLimit 2^53 − 1.

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

### 5.8 Alphabet, normalisation and grouping

**Alphabet:** `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. Output is upper case.

**Input normalisation** (the same for the entry field, the clipboard and a scanned or typed link):

1. Trim. If the text contains `#`, use RP01's `parsePuzzleHash`
   (`core/engine/puzzlecode-input.js`; RP02 delegates to it from
   `parseLocationHashResult`). Use its decoded p value and its exact
   `index`/`invalid` rules stated above. Do not import the later host parser.
2. Remove spaces, tabs, line breaks and `-`.
3. Upper-case; map O→0 and I/L→1.
4. Keep at most one `.` (more gives `dots`). Any other character outside the alphabet gives `bad-char`, naming it;
   `U` is not in the alphabet.

**Paper:** groups of 4, separated by spaces, wrapped at group boundaries (Section 10.1). The tail is printed as `.`
followed by its own groups of 4. The label states the length of C, for example "38 characters".

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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
Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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

The first and last hashes were independently verified. The large code and oracle
below are self-contained; do not depend on a session scratch file. Regenerate
the ordinary source-fixture vectors with the production encoder and compare.

### Self-contained large-puzzle oracle

Join this code without whitespace:

```text
1EG2H6A2XE0BZ5TNBYPNFBYQNTVVZF57XNJS67YWYDKZEENH7XSVS3YYTDFKZT7YYTE3YWYEFVS9N3YYC3VDDZ6QXSSSZF73DNQQQXHQFXSHRVZJNYFN0ZTTR5NWKD7XRAJFKYZVKBYYVYTS1ZFA1ZD61TTFMFA3JZKFFKEFSWNQT54VV9ZQ7TPG5ZE28JPP62C5PNNABSE2CX0BYKZ.14ZDJDYJYM30V6MX43A5AWCJY447TZG
```

Expected: 24x24 full board, angle0, K40, G4, C211/F243 characters.
Labels/IDs are the default A through AN, with the frozen RGB values.
Piece sizes in source order:
`20,19,19,18,18,17,17,17,17,17,17,17,16,16,16,15,15,14,14,14,14,14,13,13,13,13,13,13,13,12,12,12,12,12,11,11,11,11,10,10`.
Clues are I at(16,5), turn2 mirrored; P at(5,0), turn1 mirrored;
Z at(14,11), turn3 not mirrored; AL at(4,20), turn2 not mirrored.
Rating: difficulty-v2, score102, hell-1, saturated; metrics U36, B5000,
branchTrials5000, rowTrials5164, stop branch-cap, R520,
H10.850818759479644 (subject to the documented cross-engine H qualification).
The independent progress fingerprint is:
`cdc9a3c0ff8691595d395c8a98f634a885bfe2ccf6aded9b1fcebd9ff8cf4425`.
Decode it into a fixture with these independent assertions; no seed replay or
external/session artifact is required.

## Frozen palette expansion

The table below is the complete v1 RGB default for indices 0 through 127.
Use it directly; do not call a future live palette implementation at decode time.
The label default is spreadsheet letters A through DX, as specified above.
Compare stored colours as RGB values, ignoring hexadecimal case.

| Index | Frozen RGB |
|---:|---|
| 0 | #e6194b |
| 1 | #3cb44b |
| 2 | #ffe119 |
| 3 | #4363d8 |
| 4 | #f58231 |
| 5 | #911eb4 |
| 6 | #42d4f4 |
| 7 | #f032e6 |
| 8 | #bfef45 |
| 9 | #fabed4 |
| 10 | #469990 |
| 11 | #dcbeff |
| 12 | #9a6324 |
| 13 | #fffac8 |
| 14 | #800000 |
| 15 | #aaffc3 |
| 16 | #808000 |
| 17 | #ffd8b1 |
| 18 | #000075 |
| 19 | #a9a9a9 |
| 20 | #2841bd |
| 21 | #e07b6c |
| 22 | #28bd67 |
| 23 | #be6ce0 |
| 24 | #bdbd28 |
| 25 | #6cbee0 |
| 26 | #bd2866 |
| 27 | #7ae06c |
| 28 | #4228bd |
| 29 | #e0a16c |
| 30 | #28bd99 |
| 31 | #e06cda |
| 32 | #8bbd28 |
| 33 | #6c97e0 |
| 34 | #bd2834 |
| 35 | #6ce084 |
| 36 | #7328bd |
| 37 | #e0c86c |
| 38 | #28b0bd |
| 39 | #e06cb4 |
| 40 | #59bd28 |
| 41 | #6c70e0 |
| 42 | #bd4e28 |
| 43 | #6ce0ab |
| 44 | #a528bd |
| 45 | #d1e06c |
| 46 | #287ebd |
| 47 | #e06c8d |
| 48 | #28bd29 |
| 49 | #8e6ce0 |
| 50 | #bd8028 |
| 51 | #6ce0d2 |
| 52 | #bd28a3 |
| 53 | #aae06c |
| 54 | #284cbd |
| 55 | #e0716c |
| 56 | #28bd5b |
| 57 | #b56ce0 |
| 58 | #bdb228 |
| 59 | #6cc7e0 |
| 60 | #bd2872 |
| 61 | #83e06c |
| 62 | #3628bd |
| 63 | #e0986c |
| 64 | #28bd8d |
| 65 | #dc6ce0 |
| 66 | #97bd28 |
| 67 | #6ca0e0 |
| 68 | #bd2840 |
| 69 | #6ce07b |
| 70 | #6828bd |
| 71 | #e0bf6c |
| 72 | #28bcbd |
| 73 | #e06cbd |
| 74 | #65bd28 |
| 75 | #6c79e0 |
| 76 | #bd4328 |
| 77 | #6ce0a2 |
| 78 | #9a28bd |
| 79 | #dae06c |
| 80 | #288abd |
| 81 | #e06c96 |
| 82 | #33bd28 |
| 83 | #856ce0 |
| 84 | #bd7428 |
| 85 | #6ce0c9 |
| 86 | #bd28af |
| 87 | #b3e06c |
| 88 | #2858bd |
| 89 | #e06c6f |
| 90 | #28bd4f |
| 91 | #ac6ce0 |
| 92 | #bda628 |
| 93 | #6cd0e0 |
| 94 | #bd287d |
| 95 | #8ce06c |
| 96 | #2a28bd |
| 97 | #e08f6c |
| 98 | #28bd81 |
| 99 | #d36ce0 |
| 100 | #a2bd28 |
| 101 | #6ca9e0 |
| 102 | #bd284b |
| 103 | #6ce072 |
| 104 | #5c28bd |
| 105 | #e0b66c |
| 106 | #28bdb3 |
| 107 | #e06cc6 |
| 108 | #71bd28 |
| 109 | #6c82e0 |
| 110 | #bd3728 |
| 111 | #6ce099 |
| 112 | #8e28bd |
| 113 | #e0dd6c |
| 114 | #2896bd |
| 115 | #e06c9f |
| 116 | #3fbd28 |
| 117 | #7c6ce0 |
| 118 | #bd6928 |
| 119 | #6ce0c0 |
| 120 | #bd28bb |
| 121 | #bce06c |
| 122 | #2864bd |
| 123 | #e06c78 |
| 124 | #28bd43 |
| 125 | #a36ce0 |
| 126 | #bd9b28 |
| 127 | #6cd9e0 |

## Files to create/modify

### Exclusive ownership

- `core/engine/puzzlecode.js`
- `core/engine/puzzlecode-v1.js`
- `core/engine/puzzlecode-input.js`
- `tests/puzzlecode.test.js`
- `tests/puzzlecode-input.test.js`
- `tests/fixtures/puzzlecode-v1.json`
- `tests/fixtures/puzzlecode-hashes.json`

Keep internal helpers in these owned files unless the orchestrator approves
an additional disjoint codec-only file.
Do not change `pack.js`, `keys.js`, generation, difficulty policy or live palette.
Do not change browser UI or worker dispatch; RP02 owns integration.

### Documentation slot

Update both living documents in the same change:

- `docs/design-brief.md`: direct single-puzzle reconstruction, not seed replay.
- `docs/design-detail.md`: the implemented code format, validation bounds,
  content normalisations and no-schema-change decoded Pack.
- Keep the seeds/history section accurate: a seed alone is not reconstruction.
- README must not claim the unimplemented entry/print UI already exists.

Do not edit the historical final report or task files.

## Implementation steps

1. Implement exact bit I/O with BigInt where arithmetic can exceed safe range.
2. Implement bounded EG, truncated binary and colex rank/unrank.
3. Implement CRC framing before parsing any content.
4. Implement input-only normalisation and new-route extraction.
5. Build and hash the frozen catalogue independently of the generator policy.
6. Implement adaptive board encoding with explicit tie rules.
7. Implement shape/size/repetition/orientation/identity coding.
8. Implement clue records and legal-placement ranking.
9. Implement the solution path and core-bound tail check.
10. Implement exact count-only rating rebuild and full-claim escape.
11. Implement title/certificate/text fields and all numeric boundaries.
12. Implement raw decode and final existing-pack validation.
13. Implement streaming bounded DEFLATE decode.
14. Implement shortest-of encoding with raw on ties.
15. Implement a bounded single-substitution candidate lookup.
16. Run raw goldens before adding property tests.
17. Add the negative and edge fixtures below.
    For the forced-failure vector, provide a test-only codec factory/dependency
    seam that substitutes the rating counter with a throwing function. Do not
    expose a function or force-failure flag in the worker payload.
18. Update living documentation after the implementation exists.
19. Hand off exact APIs and failure semantics to RP02.

### Mid-task checkpoint — raw codec before the remaining work

Keep RP01 as one assigned task, but pause after steps 1–12 for an intermediate
handoff. At that checkpoint the following must pass:

- Exact bit/EG/rank/CRC tests, including the maximum safe certificate value.
- Raw core/full positive goldens, raw padding and raw certificate-overflow
  negatives, complete Pack validation and source fingerprint/identity checks.
- The catalogue hash and frozen identity/rating tables.
- The single-owner input/hash-parser table and no circular sharecode dependency.
- Import-laziness evidence: no catalogue growth merely by importing the module.
- Targeted raw-codec tests and owned-file convention checks.

Send the orchestrator the passing commands, owned files, exported API state and
remaining items. The orchestrator checks this checkpoint before steps 13–17
(DEFLATE, correction candidates and the remaining property tests) continue.
Do not claim RP01 accepted or release RP02 at the checkpoint: all remaining
criteria and the wave gate still apply.
If the run cannot finish after the checkpoint, the orchestrator may define
“RP01b — DEFLATE, correction candidates, property tests” with the same ownership.
That is a recovery option, not an automatically launched extra agent or task.
RP02 waits for the combined RP01/RP01b acceptance in that case.

## Acceptance criteria — Business

- **RP01-B01:** One code recreates one board, piece set and puzzle.
- **RP01-B02:** Blocked margins and display angle survive.
- **RP01-B03:** Labels, RGB values, piece order and stored cell orientation survive.
- **RP01-B04:** Clues remain fixed; to-place pieces derive from the same set.
- **RP01-B05:** A core alone is independently usable without a solution.
- **RP01-B06:** An included answer is exactly compatible with the puzzle.
- **RP01-B07:** Foreign/legacy claims and valid custom identities are not discarded.
- **RP01-B08:** No seed, calibration or search is needed to reconstruct content.
- **RP01-B09:** A bad tail never silently changes a good core.
- **RP01-B10:** A correction remains a candidate, never an automatic action.

## Acceptance criteria — Technical

- **RP01-T01:** Every raw golden below reproduces exactly.
- **RP01-T02:** Every negative vector below rejects with the documented category.
- **RP01-T03:** The catalogue count/hash match exactly.
- **RP01-T04:** All 128 default colours and labels are pinned.
- **RP01-T05:** Every decoded Pack passes the existing validator.
- **RP01-T06:** Progress fingerprints match original geometry and piece IDs.
- **RP01-T07:** Array order and colour spelling normalisations are only those specified.
- **RP01-T08:** BigInt EG handles the maximum safe certificate limit exactly.
- **RP01-T09:** Large title ordinals use the literal escape before Number conversion.
- **RP01-T10:** Failed rating reconstruction selects a full claim.
- **RP01-T11:** Count-only rebuilding is not subject to solver workspace limits.
- **RP01-T12:** Visible scores/levels use integer frozen tables.
- **RP01-T13:** Output/inflation limits are checked while streaming.
- **RP01-T14:** No catalogue growth occurs merely by importing the browser module.
- **RP01-T15:** All ordinary malformed input gives typed errors.
- **RP01-T16:** Existing pack/geometry/keys tests remain unchanged and pass.

## Test plan

### Exact commands

```powershell
node --test .\tests\puzzlecode.test.js .\tests\puzzlecode-input.test.js
```

Run the owned-file convention check from `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.

Use `node:test` and `node:assert/strict`.
Tag the exhaustive long checksum property case with `slow` in its test name.
Do not make a timing measurement a correctness assertion.
Do not regenerate expected vectors merely to match the implementation.

### Fixture construction without research

Use existing repository fixtures for the four main goldens.
For sample positions 2 and 3, supply the encoded title shown in the golden table,
not their unnumbered stored title.
The browser heading/snapshot helper is implemented later; tests may use the
explicit resolved fixture titles rather than importing an unavailable UI module.

Construct these additional small valid packs directly:

1. Disconnected board `['#.','.#']`, two monominoes, one fixed at (0,0),
   one at (1,1), custom IDs/labels/RGB, complete solution.
2. Full 3x3 board, one eight-cell ring and one central monomino.
   The ring cells are `(0,0),(1,0),(2,0),(0,1),(2,1),(0,2),(1,2),(2,2)`.
   The monomino is at (1,1); the ring is at origin (0,0).
3. Repeated shapes with distinct IDs and different colours.
4. The same valid puzzle with padded blocked margins and shifted poses.
5. A title and a label containing a lone surrogate, using the UTF-16 escape.
6. Foreign rating metrics containing nested JSON and `censored:true`.
7. A valid v2 claim with a fractional score or inconsistent level.
8. A maximum safe-integer certificate.

For the 1,024-cell count-only stress case:

- Use a full 64x16 board and 128 pieces of area eight.
- Give every piece these cells:
  `(0,0),(1,0),(2,0),(3,0),(0,1),(1,1),(2,1),(0,2)`.
- Use unique default IDs/labels and the frozen colours.
- Give the one puzzle no clues and no solution.
- Count placements in the specified canonical order.
- There are 849,920 legal placement rows in total.
- Set U=128, B=0, branchTrials=0, rowTrials=0, stop='solution', R=1024.
- Compute H from the actual ordered counts and score=256, level='hell-4'.
- This is a stored claim, not an assertion that a search found an answer.
- The input must validate, encode and decode without building a DLX model.
- Change one claim metric and confirm the full-claim escape preserves it.

### Bounded decoder cases

For every count or rank field, test just inside and just outside its limit.
Check before allocating or iterating over an untrusted value.
A correct CRC does not make an input trusted.

Include:

- Zero/excessive dimensions and active counts.
- Piece count zero/129 and size zero/129.
- Duplicate IDs and invalid ID characters.
- Overlong labels/titles/models and ill-formed UTF-8.
- Oversized text prefixes without allocating their claimed sizes.
- Invalid catalogue/subset/permutation/placement ranks.
- A shape that cannot finish its declared BFS size.
- Nonzero/trailing raw padding.
- Extra inflated zero byte and nonzero inflated fill.
- Compressed output crossing 64 KiB.
- Unknown version/tag.
- Empty core/tail, multiple dots and unsupported alphabet characters.
- Certificate `2^53-1` accepted and `2^53` rejected.
- G=K rejected by final pack validation, not accepted as a playable puzzle.
- Missing native decompression support for version 2.

### Checksum and correction

Verify the primitive vector `CRC20('123456789') = 0xC80C0`.
Verify the complete-component residue `0x6CDCE`.
Verify the old boundary-burst counterexample no longer passes.
For a short golden, enumerate every one-symbol substitution and adjacent swap.
Run the 5,732-symbol syndrome bound as a slow test.
There are 177,692 distinct nonzero single-symbol syndromes at that bound.
The first collision is at 5,733 symbols.
Do not promise insertion/deletion correction.
Include appended zero symbols and component splices.
A valid core must not be included with its own checksum in tail CRC coverage.

A candidate must:

- Refer to the same normalized input revision.
- Change exactly one canonical symbol.
- Pass the relevant checks and complete Pack validation.
- Be unique among qualifying one-substitution candidates.
- Never exceed the guaranteed search/coverage bound.
- Be absent for a checksum-valid unsupported version.
- Never cause state/storage/navigation side effects.

### Integer rating proof

Exhaustively test U=1..128 and B=0..5000: 640,128 pairs.
Compare the frozen integer table calculation with the current score/band functions
as an oracle test, not as a decoder dependency.
The maximum compact-domain score is 286.
The next band edge is 341.
Preserve the documented H summation order.
Do not claim cross-engine bit identity for H beyond the agreed qualification.

### Browser integration handoff

RP02 owns the real module-worker browser harness and its CDP run.
Provide it a raw golden, a DEFLATE golden, one negative input and one repair case.
Its harness is `tests/browser/puzzle-code-worker.html`.
Use only the browser environment, fixed task ports, profile and native CDP
procedure in `check-list.md` Section7; RP02 owns that run.

The harness reports final `<html data-result="pass|fail">` through CDP.
A cold catalogue must execute only in a worker, not in the entry/print caller.
Do not mark RP01's browser integration accepted before RP02 supplies that evidence.
RP01 itself is independently accepted with its Node tests and import-laziness test.

## Definition of done & handoff

- All business and technical criteria have evidence.
- Golden fixtures contain the fixed expected values, not newly generated guesses.
- Public function/types/errors are documented exactly as implemented.
- Private frozen helpers cannot silently pick up live policy changes.
- Raw and compressed forms validate to the same semantic puzzle.
- Valid custom claims never fail merely because reconstruction cannot use compact form.
- No schema, generation-policy or unrelated renderer change was made.
- Living specification changes are included through the documentation slot.
- No commit was made by the developer.

Handoff to RP02 includes the snapshots/results/errors and async requirements.
Handoff to RP05 includes the distinction between source title and resolved title.
Handoff to RP08 includes all fixture oracles and the long-bound slow test.

## Execution log

| Field | Value |
|---|---|
| Status | Done |
| Start | 2026-10-25 20:46:11 (+07:00) |
| End | 2026-10-25 21:39:04 (+07:00); first code-ready 21:28, wave-barrier fix 21:28–21:33, living docs 21:35–21:39 |
| Duration | 52 min 53 s |
| Model | claude-sonnet-5.5 (sub-agent `RP01-codec`, general-purpose); wave 1, in parallel with RP04 |
| Token usage | 174 model calls; 34,259,791 input (33,580,969 cache read), 380,264 output |
| AI credits | 885.76 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: `node --test tests\puzzlecode.test.js tests\puzzlecode-input.test.js` 62/62 (58/58 with `--test-skip-pattern=slow`); unchanged `pack`/`geometry`/`keys` tests 61/61; after the fix round the four affected files 101/101; scoped `checkText` on all owned files and `tools\bench\report.js` OK. Orchestrator at the wave barrier: first full `npm test` 946/948 (2 guard tests failed on the new engine files) → after the fix, full `node --test "tests/**/*.test.js"` 948 pass / 0 fail (46.8 s), codec suites 62/62, `npm run check` OK. |
| Acceptance | Business and technical criteria met: all §5.12 golden vectors, edge vectors, the forced-escape and version-2 decode-only vectors reproduce; the five negative vectors are rejected; catalogue hash and frozen tables (128 colours, labels, score thresholds, band edges) pinned; decoder bounds checked before loops/allocation; typed `PuzzleCodeError` codes; correction offered only as a candidate, never applied; catalogue built lazily (≈100 ms for size 10) for the worker; `parsePuzzleHash` is the single `#p=` parser with a 38-case fixture table. Mid-task checkpoint: run as an internal gate (`^raw:` 25/25 + input 7/7 + scoped conventions) after part of the DEFLATE/correction code already existed — accepted, as every later test passes. |
| Issues & resolutions | (1) Wave-barrier failure in `tests/bq-limits.test.js` (engine files must not name `LIMITS`) → decoder bounds export renamed `CODE_BOUNDS`. (2) Wave-barrier failure in `tests/benchmark-report.test.js` (every engine file must be in `SOURCE_FILES`) → the three `puzzlecode*.js` files added to `tools/bench/report.js` (authorized one-line edit outside the task's ownership). (3) Interpretations not covered by goldens: per-piece identity overrides as three flags then id/label/RGB; board-mask mode = shortest total bits incl. the 5-bit selector, ties to the lowest mode and smallest k (an independent reference test agrees; all five modes win somewhere); the encoder rejects an unsorted shape list under the canonical-order flag; rating counters above caps and overlapping blocked rectangles are `invalid`; `#p=%ZZ&i=1` reports `index` (the `i` check runs first); a decoded empty title becomes absent; colours lower-cased. (4) Its stress pack encodes to 43/45/332 symbols (report: 52/58/359 for a different 3-clue control) — not a defect. (5) Living docs: design-brief "Limits, waiting, and sharing" (puzzle code paragraph, no UI claimed); design-detail glossary, D43, §3.1, §3.3, §4.2 API block, §9.1, §9.7, new §9.8 "Puzzle code", §13.2; README code-layout line (EN/VI). |
| Handoff | `encodePuzzleCode(snapshot, { compression: 'auto' \| 'raw' \| 'deflate' })` → `{ C, T, F, version }` (async); `decodePuzzleCode(text)` → `{ pack, hasTail, tailError, candidate? }` (async; `tailError` ∈ `'tail-check'`, `'tail-invalid'` with the core still returned). `PuzzleCodeError.code` ∈ `empty`, `bad-char`, `dots`, `too-long`, `core-check`, `version`, `no-deflate`, `invalid`, `index`. Candidate `{ component, group, position, expected, typed, correctedCode }` — offer only. `parsePuzzleHash` in `core/engine/puzzlecode-input.js` is the single hash parser (fixture `tests/fixtures/puzzlecode-hashes.json`). The cold catalogue must run in the worker (RP02). Titles are encoded as the source title (RP05 resolves displayed headings); `F` length counts its dot; `compression: 'raw'` is RP07's seam; bounds export `CODE_BOUNDS`; goldens, edges, negatives, oracle and QR matrix hashes in `tests/fixtures/puzzlecode-v1.json`; the slow 5,732-symbol bound test is `slow: single-symbol CRC syndromes…`; `createPuzzleCodec({ measure, allowDeflate })` is a test-only seam. |

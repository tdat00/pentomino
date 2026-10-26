# Phase 3: architect-2's response to review

**Date:** 2026-10-25, UTC+07:00.

**Responding to:** `docs\regenerate-puzzle\2-review-of-architect-2.md`, findings R1-01 through R1-14.

**Status:** final design position and additional scratch experiments, not an implementation change. The Phase 1/2 documents remain untouched.

## 1. Executive position

I accept the principal compression criticism and the new evidence about missing solutions. I also acknowledge a factual error in both of my earlier documents: **the Generator page creates one puzzle per press**, not five.

My final recommendation is a **code family with an independently valid short core and an optional, explicitly labelled answer suffix**:

```text
Core, sufficient to enter manually:       C
Full code for normal QR/link opening:     C.T
```

`C` is literally the prefix of `C.T`, including its own checksum. The suffix has its own checksum bound to the **entire exact core**, not merely a puzzle ID. The first sheet prints the core prominently and identifies the optional suffix; QR and copied links include it whenever a stored answer exists. Prefer also printing the suffix as optional text, so paper retains a manual path to the complete data.

This is a justified, transparent refinement of my earlier “QR never richer than the visible text” position, not two unrelated codes. A reader who types only C gets the identical starting puzzle and progress identity; a reader who scans the QR additionally gets the stored answer and avoids expensive initial verification.

I accept compact rating/title representations and a narrowly scoped change making metrics optional in a stored `difficulty-v2` **claim**. I no longer recommend carrying unused metrics by default or recomputing a rating on opening.

For integrity I recommend **properly framed CRC-30/CDMA**, six Crockford symbols, rather than my earlier byte-framed CRC-32C. Correctly framed 20–25-bit checks are sufficient for the normal 35–210-symbol typing problem when their distance properties are tested. CRC-30 is my preferred standard, whole-domain compromise: only two characters more than CRC-20, no byte alignment, and stronger protection for long custom data.

Measured candidate family lengths, including checks and compact rating/title:

- original nine-piece recipe: **37 core / 47 full**;
- peer 6×10: **38 / 48**;
- peer Heart: **41 / 55**;
- peer 144-cell board: **62 / 81**;
- peer 576-cell Hell 3: **138 / 223**;
- 576-cell Hard: **212 / 222**;
- my slow-verifying 576-cell Hell 1: **210 / 244**.

These are actual core/suffix round trips in a new framing prototype. They reuse the peer shape grammar; the remaining repeated-shape/compression optimization branches are design proposals, not newly measured production implementations.

## 2. Response to every R1 finding

| Finding | Response | Evidence and concrete design change |
|---|---|---|
| **R1-01 — shape-code inefficiency** | **Accept** | My Phase 2 common-corpus measurements independently confirmed the advantage. Adopt size-aware coding, canonical-order size deltas, grouped subset ranks through size ten, known-size breadth-first coding above that, and legal placement/cover ranks. Add an efficient repeated-shape/size-run path while retaining arbitrary-order fallbacks. Do not blindly reorder imported pieces. |
| **R1-02 — expensive default rating/title** | **Accept** | The screen does not need the original search counters or H value to show its stored rating. Carry a compact score/saturation representation only when it reproduces the original model/level correctly. Add exact title pattern kinds and a literal-text escape. Broaden stored-claim validation as specified in §5, not by fabricating metrics. |
| **R1-03 — solution in the typed default** | **Partially accept; materially revise my recommendation** | The supplied logs show real 2,000,000-row failures at 219.5–1,107.6 s in direct Node searches. Normal QR/link opening should carry the stored answer. A separately checked, core-bound suffix achieves this without mandatory answer typing. However, the actual browser Player has a roughly 115 s worker watchdog; it does not normally wait the extrapolated 15–74 minutes. See §4. |
| **R1-04 — prefix/codec byte/CRC overhead** | **Partially accept** | Remove `P1.` and the whole codec byte from the normal path; use one version symbol and bit-level framing. Correctly framed CRC-20 can meet ordinary typing requirements. I prefer standard CRC-30/CDMA, six symbols, for uniform handling of long codes. The earlier prototype's extra CRC augmentation must be corrected regardless of width. |
| **R1-05 — no DEFLATE, repeated-shape flag instead** | **Reject the “no DEFLATE” conclusion; accept the repeated-shape optimization** | A repeated-shape flag cannot compress repeated IDs, labels, RGB fields or opaque optional claims. My valid long custom-identity frame compressed **3,863→419 bytes**; those savings are not explained by its shape stream. Use both structural repetition coding and a bounded, optional compression escape. Raw generated codes pay only a bit-level flag, not eight bits. |
| **R1-06 — Generator quantity** | **Accept; explicit correction** | `generator\app.js:28` sets `PUZZLES_PER_PRESS = 1`; `:99` overrides the store with it. I incorrectly treated `generator\state.js:104`'s five-puzzle store default as the page's behaviour. The page makes **one** puzzle per press. Controller/CLI batches can contain several puzzles. History/calibration still prove that a seed is not a self-contained puzzle address. |
| **R1-07 — correction suggestions** | **Partially accept** | A suggestion is not a silent repair. Permit a bounded, optional suggestion UI for short inputs, provided the user compares it with paper and confirms. Say “possible correction”, not “the corrected puzzle”. A unique one-edit candidate is not proof that a multi-error input came from that candidate. Detection remains mandatory; suggestions are not required for initial release. |
| **R1-08 — per-code presentation marker** | **Partially accept** | Do not introduce two rendering paths or a per-pack marker now. Freeze decoder-derived IDs/colours and make current identification rendering a shared compatibility contract. But “change only deliberately” is not enough if a deliberate change breaks old cut-outs: future incompatible colour/glyph/pattern changes must retain a compatibility path. Until such a change exists, no marker is needed. |
| **R1-09 — v2 metrics are currently required** | **Accept; resolve rather than preserve the original overhead** | The current reader requires metrics (`core\engine\pack.js:783–785`). Change only stored-claim validation to allow metrics to be absent, while validating the complete existing metric object whenever present. Engine-produced ratings stay complete. See §5 for compatibility qualifications and tests. |
| **R1-10 — misleading CLI replay specification** | **Accept** | Correct the living spec with implementation: `--batch-index` selects a derived seed; it does not replay earlier batches. `tools\generate.mjs:12–14`, `:485–488` are authoritative for current behaviour. |
| **R1-11 — lone surrogates** | **Accept the lossless option** | Retain a UTF-16 escape for ill-formed strings accepted by the existing reader. Do not silently substitute U+FFFD. Normal strings use UTF-8. This keeps the full current pack domain instead of introducing an avoidable exception. |
| **R1-12 — `i` beside `#p`** | **Accept agreement** | Accept no `i` or `i=0`, reject a nonzero index, and keep canonical `#p=` addresses free of `&i`. Existing `#pack` and `#lib` behaviour is unchanged. |
| **R1-13 — mandatory QR and continuations** | **Partially accept** | QR is mandatory and normal generated examples do not need continuation sheets. Extreme custom content may. I reject the proposed default “print no QR and say why” if capacity is exhausted: that contradicts the new requirement. Preflight must fail clearly or obtain an explicitly authorized different profile before printing. |
| **R1-14 — groups/line width beside QR** | **Accept the direction, qualify the fixed width** | Use groups of four. Forty symbols per line is a useful normal layout, not an invariant: wrap whole groups using actual available width beside the measured QR. Preserve readable type, full titles through wrapping, and the quiet zone. |

The R1-06 correction applies to the corresponding quantity statements in **both** of my earlier files. They are left unchanged only because the phase rules prohibit editing them; this response is the explicit corrigendum.

## 3. Checksum: final choice, complete framing and measured guarantees

### 3.1 Is a corrected 20–25-bit check enough for ordinary typing?

**Yes.** I do not maintain that CRC-32C is necessary for a 35–210-symbol hand-entered code.

A correctly framed CRC of width at least ten detects a single changed base32 symbol and an adjacent unequal-symbol transposition through its burst property. Two separated wrong symbols require a further distance check; polynomial width or period alone does not prove that property.

New tests use the correct direct MSB-first update, **without appending a second set of width zero bits**:

| Candidate | Polynomial, lower coefficients | Check symbols | Tested frame length | Single-symbol error syndromes tested | Zero / duplicate syndromes |
|---|---|---:|---:|---:|---:|
| Corrected CRC-20 | `0x6C1BD` | 4 | 512 symbols | 15,872 | **0 / 0** |
| Test-only CRC-25 | `0x1685B5F` | 5 | 512 symbols | 15,872 | **0 / 0** |
| CRC-30/CDMA | `0x2030B9C7` | 6 | 16,000 symbols | 496,000 | **0 / 0** |

For a fixed-length linear frame, nonzero, distinct syndromes of all single-symbol changes prove detection of **all one- and two-symbol substitutions**, not just the examples that happened to be sampled. Right-aligned shorter frames have a subset of these error positions, so the result covers shorter frames under the same convention.

The CRC-25 polynomial is an experimental comparison, not a proposed named standard. I prefer the published CRC-30 profile over introducing another private polynomial solely to save one character.

The 20/25-bit comparisons used zero init/xorout, no reflection and the same direct MSB-first update; their widths/polynomials are given above.

### 3.2 Recommended checksum parameters

Use **CRC-30/CDMA**:

```text
width    = 30
poly     = 0x2030B9C7      // leading x^30 term omitted
init     = 0x3FFFFFFF
refin    = false
refout   = false
xorout   = 0x3FFFFFFF
bit order = MSB first
check("123456789") = 0x04C34ABF
```

The check vector was reproduced by the new prototype. The parameters were checked against the [CRC RevEng catalogue](https://reveng.sourceforge.io/crc-catalogue/17plus.htm#crc.cat.crc-30-cdma).

Equivalent bit update:

```text
r = init
for each input bit b:
    feedback = top_bit(r) XOR b
    r = (r << 1) masked to 30 bits
    if feedback: r = r XOR poly
check = r XOR xorout
```

**No extra zero-bit clocks follow that update.** The prior feedback implementation plus an additional width of zero clocks was the source of the systematic-frame problem demonstrated in my Phase 2 review.

Serialize the resulting thirty check bits MSB-first as exactly **six Crockford characters**, retaining leading zeros.

### 3.3 Fully specified core/suffix framing

Let `U32(n)` be an unsigned 32-bit big-endian bit sequence. ASCII constants below are encoded byte by byte, MSB-first. They are fixed domain tags, not text a user must type.

**Core:**

1. Start with the five-bit version value 1, encoded as the first symbol `1`.
2. Encode the core's flags/content, including its encoding-mode flag.
3. Pad with **0–4 zero bits to a whole five-bit symbol**.
4. Let P be that padded payload.
5. Compute:

```text
checkC = CRC30(ASCII("PM1C") | U32(bit_length(P)) | P)
C      = base32(P) | base32_6(checkC)
```

**Optional answer suffix:**

1. Its first five-bit value is the suffix-format tag: 1 for raw v1 answer-path data. A reserved tag can identify the bounded compressed form.
2. Encode the answer path against the already decoded core.
3. Pad with 0–4 zero bits to a whole symbol. Let S be that padded suffix payload.
4. Let B(C) be the five-bit expansion of every symbol of the complete core, **including checkC**.
5. Compute:

```text
checkT = CRC30(
    ASCII("PM1S")
    | U32(bit_length(B(C))) | B(C)
    | ASCII(".")
    | U32(bit_length(S)) | S
)
T = base32(S) | base32_6(checkT)

F = C + "." + T
```

The CRC covers the transmitted version/format symbols, flags, content and zero padding. The length terms protect framing length as well. The suffix check binds it to the exact core, not to a shorter fingerprint or public puzzle ID.

There is no literal `P1.` prefix and no byte alignment on the normal path. The URL prefix/hostname is **not** covered: the same portable code must work on different conforming Player deployments. The route parser and code-version check identify the carrier.

Decoding:

- Bound the input before normalization.
- Normalize case and permitted grouping/aliases; preserve the dot separator.
- Accept either C or exactly one `C.T`.
- Check the core before parsing its data.
- Parse the core and require only 0–4 zero padding bits after its last field.
- If T exists, check it against the full C, parse its tag/path, enforce the same padding rule and validate the complete layout against the core.
- Reject an invalid T; do not silently discard it. An explicit “Open the valid core without the damaged answer suffix” action is acceptable.

This convention is implemented in `phase3-framing-tail.mjs`. The old peer shape decoder is used only as the inner content prototype; it is not the production bounded parser.

### 3.4 What is and is not guaranteed

| Error | Final position |
|---|---|
| One wrong alphabet symbol, same frame length | Detected; covered by the burst property and exhaustive syndrome test. |
| Two wrong alphabet symbols at arbitrary positions | Detected for v1 component frames through the tested **16,000-symbol** limit under this convention. |
| Adjacent transposition of unequal symbols | Detected; at most ten affected contiguous bits. Swapping equal symbols changes nothing. |
| Any nonzero contiguous bit burst of length ≤30 in a fixed-length systematic component frame | Detected under the specified CRC convention. |
| Missing/extra alphabet symbol | Length-bound CRC, version, parsing and padding catch these in the tested examples; do **not** claim a universal edit-distance guarantee from a CRC. |
| Missing/extra grouping space or hyphen; O/I/L alias | Intentionally normalized; not a semantic data error. |
| Entire optional suffix removed exactly at the C boundary | Intentionally valid C. No format that permits C alone can distinguish this from intentional short-form use. |
| Deliberate tampering with recomputed checks | Not prevented. CRC is not authentication; all content still needs validation. |

On the actual new **38- and 212-character cores**, exhaustive local edit sweeps rejected:

- **7,750** single-symbol substitutions;
- **250** deletions;
- **8,064** insertions, including at the end;
- **226** adjacent unequal-symbol swaps.

Cross-core answer-suffix splicing was also rejected.

For wider/random changes, the indicative random miss probabilities are:

| Check | Approximate random miss probability | Symbols |
|---|---:|---:|
| 20 bits | 1 in 1,048,576 | 4 |
| 25 bits | 1 in 33,554,432 | 5 |
| 30 bits | 1 in 1,073,741,824 | 6 |
| CRC-32C | 1 in 4,294,967,296 | 7 if represented as a separately padded base32 check |

These probabilities are not substitutes for the error-distance tests.

**Remaining technical difference with architect-1:** I prefer CRC-30 uniformly. I would not block a **correctly framed and adequately bounded/tested** CRC-20/25 implementation for the normal short-code requirement. I do object to treating the previous CRC implementation, or width/period alone, as sufficient evidence.

Suggestions can use a syndrome lookup and structural checks for short codes, for example up to 512 symbols. Never automatically open the candidate or imply that multiple possible user errors have been proven to be a single typo.

## 4. Solutions: accepting the suffix with a clear paper contract

### 4.1 What the evidence establishes

I read the actual `vo-*.txt` logs and `verify-one.mjs`; I did not repeat the several-minute searches inside this 25-minute phase.

| Puzzle without stored solution | Direct Node result from the supplied logs |
|---|---|
| 18×20 Hell 2 | 2,000,000 rows, no result, not exhausted, **219.5 s** |
| Heart 24 Hell 2 | Same outcome, **261.1 s** |
| 24×24 Hell 3 | Same outcome, **346.6 s** |
| My 24×24 Hell 1 | Same outcome, **1,107.6 s** |

The evidence is decisive for avoiding unnecessary verification searches. It does **not** mean the browser normally waits 15–74 minutes.

The actual Player:

- marks a validated included answer solvable immediately, without starting a worker (`player\state.js:513–517`);
- otherwise starts `verifyPack` in the shared pool (`:522–568`);
- gives up as `not-verified` on the pool's deadline (`:528–545`);
- uses the pool's **115,000 ms** watchdog (`core\browser\worker-pool.js:338–358`, `:591–592`; `core\engine\policy.js:54`).

The direct Node harness bypasses that wall-clock watchdog. Its row-budget failures predict a browser check likely to time out, not a browser UI blocked for eighteen minutes.

The game remains playable while verification is pending or inconclusive. The toolbar's relevant busy state is dragging, not pending verification (`player\app.js:538–558`). “Not verified” does not mean “no solution”; the “At least 1 solution” wording may be absent until existence is known (`player\state.js:158–159`).

With a stored answer, the engine's check is a layout validation instead of a search (`core\engine\tasks.js:98–113`). Existing hint paths can also use a compatible stored answer. A tail does not guarantee that every later contradictory player arrangement can be resolved cheaply; it removes the avoidable initial search and preserves the original answer.

### 4.2 Revised default

- **QR and Copy this puzzle link:** include T whenever a valid stored answer exists.
- **Manual entry:** accept C alone. It opens the exact starting puzzle and keeps the same progress fingerprint, but may remain “not verified” and may require later search for hints.
- **Printing:** show C prominently and clearly say that the QR/link includes an optional answer suffix for faster opening.
- Prefer printing `.` + T in a secondary, still typeable block labelled **Optional answer suffix — not needed to start** / **Phần đuôi lời giải — không bắt buộc để bắt đầu**. It can continue on a later sheet for unusually long custom data.
- The user types only C for the normal manual path; C plus the printed suffix reconstructs the complete form without a camera.
- The graphical **Print solution** checkbox continues to control the visible answer diagram. It need not force people to type the answer data.
- Do not substitute a newly found or the player's current solution for a missing original answer silently.

This is my precise exception to the previous “same visible text/profile” rule: **one code family, one literal shared prefix, labelled optional data, and binding checks**. I still reject two unrelated codes or an undisclosed richer QR.

A corrupt T must not turn into a silently accepted C. Intentionally entering C is different: it is a complete, independently valid form by design.

### 4.3 New measured lengths

The new framing prototype actually writes and reads compact rating/title fields, C and T. It verifies original piece/clue data, stored answer placements, title, visible rating values and matching core/full fingerprints.

| Input | C, typeable core | F = C.T, QR/link | Answer-path bits | QR M version / complete size at 0.5 mm |
|---|---:|---:|---:|---|
| My original 6×10 recipe | **37** | **47** | 8 | v5 / 22.5 mm |
| Peer 6×10 | **38** | **48** | 7 | v5 / 22.5 mm |
| Peer Heart 10 | **41** | **55** | 29 | v5 / 22.5 mm |
| Peer 12×12 | **62** | **81** | 55 | v6 / 24.5 mm |
| Peer 18×20 Hell 2 | **99** | **153** | 229 | v8 / 28.5 mm |
| Peer 24×24 Hell 3 | **138** | **223** | 382 | v10 / 32.5 mm |
| Peer 24×24 Hard | **212** | **222** | 6 | v10 / 32.5 mm |
| My slow-verifying 24×24 Hell 1 | **210** | **244** | 130 | v11 / 34.5 mm |
| Peer 32×18 Hell 3 | **110** | **208** | 450 | v10 / 32.5 mm |
| My 32×18 Hell 3 | **114** | **217** | 471 | v10 / 32.5 mm |
| My irregular 558-cell board | **152** | **239** | 392 | v10 / 32.5 mm |
| Peer CLI 26×26 Hell 3 | **167** | **272** | 481 | v11 / 34.5 mm |

The raw suffix increases length by:

```text
1 separator + 1 suffix-tag symbol + ceil(answerBits / 5) + 6 check symbols
= 8 + ceil(answerBits / 5)
```

So the seven-bit small answer adds ten characters to the full form; the 382-bit large answer adds 85. None of that suffix is mandatory to type.

The measured QR path uses the exact 45-character production URL prefix in byte mode, followed by the actual full code, **including the dot**, in alphanumeric mode. Sizes include the four-module quiet zone on every edge.

**Measurement boundary:** these are twelve tested candidate families using the existing inner shape grammar plus new complete metadata/framing. Production repeated-shape/per-field/compression refinements still need their own final golden vectors and size table. The compact rating was separately compared to the source; geometry/answer packs validate with the current reader when the partial rating is omitted. The proposed reader relaxation is deliberately not applied to repository code in this research phase.

## 5. Rating, title and puzzle number

### 5.1 Accept the narrow reader change

Allow a stored `difficulty-v2` claim with:

```text
model, score, level, saturated
```

and **optional** metrics.

When metrics is present, keep the existing full seven-field validation unchanged; do not accept half a metric object or replace bad metrics with zeros. Engine `rate()` output remains complete. `RatingClaim.metrics` is already optional at the type-description level (`core\engine\types.js:95–102`), and serialization already omits absent metrics (`core\engine\pack.js:1191–1209`).

This is a defensible acceptance broadening for claims, not a change to the scoring algorithm or to what proves a puzzle solvable. It removes the blocker identified in Phase 2 through an explicit, documented change rather than by claiming the existing reader already works.

Compatibility must be described accurately:

- Existing full claims, packs and links remain accepted.
- Old strict readers may reject **new** packs containing partial v2 claims. “Backward-compatible reader change” does not mean bidirectional interoperability with every old reader.
- Keep existing producers' full-claim output unchanged.
- P1 should retain its own address; do not unnecessarily convert it to a legacy share code with a newly shortened rating. If exporting such a pack is added, document the reader requirement or omit the optional claim for old-reader compatibility.

### 5.2 Compact versus full claims

Use compact score/saturation only if all of these are true:

- model is exactly `difficulty-v2`;
- score is an integer from 0 through `2^31−1` (larger/fractional claims use the full fallback);
- saturation is a boolean;
- the original level equals the level derived by the **frozen v2 bands**.

Otherwise encode the complete existing claim as a bounded fallback.

A compact claim reconstructs the exact displayed score, level and saturation, **not the discarded diagnostic metrics**. State this in the specification. No code opening should wait for a `rate()` worker task just to invent missing metrics.

I accept the peer's 0.5–3.9 s Node rerating evidence as a reason **not** to recompute by default. Browser extrapolations are estimates, and future model implementations may differ. Old printed claims should not be silently relabelled.

### 5.3 Title and number

Adopt two-bit title kinds:

- `00`: absent;
- `01`: exact frozen level label;
- `10`: exact frozen level label plus ` #n`;
- `11`: literal text.

Use a pattern only when reconstructing it reproduces the stored title exactly. Otherwise store the text, including the UTF-16 escape when needed. Do not infer an arbitrary title from its last digits or invent an old pack ordinal when no title was stored.

The recreated puzzle should show its stored title and visible rating, with existing app-local title formatting understood. Piece labels are an independent essential identity field and are never reduced to a puzzle number.

Seeds/provenance, certificates, timestamps, generation history and other puzzles remain outside the code. Keep readable set provenance on paper; if the puzzle seed is retained, label it as generation provenance, not a reproduction instruction.

## 6. URL, prefix, compression and oversized content

### 6.1 QR base: combine the valid parts of both approaches

Use `new URL('../player/', document.baseURI)` by default **when it is the intended reachable deployment**. This is correct on GitHub Pages, public forks and self-hosted deployments and preserves exact path case.

Do not silently put `localhost`, `127.0.0.1`, `::1` or a file URL on paper intended for phones:

- If a configured public Player base exists, offer/use it clearly for local print previews.
- Otherwise require an explicit public/LAN destination or an explicit local-use choice before the print is described as portable.
- Warn for private/LAN destinations; they may be intentional but require the scanning device to reach that network.
- Show the destination in the dialog. Never hardcode the upstream project's URL over a public fork's own correct base.

This revises my earlier configured-public-base-first recommendation without accepting silent loopback QR publication.

Use a full URL, not a bare code. Preserve the lowercase `/pentomino/player/` path; only the code is canonical uppercase. Explicit byte-prefix plus alphanumeric-code segments remain the right QR representation.

### 6.2 Prefix and encoding mode

Accept the **single version symbol** instead of `P1.`. The printed label, dedicated entry field and `#p=` key provide context; the version is protected by the checksum. Four-symbol grouping matches the existing seed presentation.

Do not pay a whole codec byte:

- one bit in the core header selects raw or bounded DEFLATE;
- the core never carries an inline answer, so the old prototype's inline-solution flag position can serve this role;
- in a compressed form, include bounded original bit length and compressed byte length, then compressed bytes, so decompression and padding have exact checks;
- protect the outer encoding mode, lengths and compressed bytes with the core checksum before decompression;
- a suffix tag can distinguish raw versus compressed answer data without adding another universal field.

These compression branches are a proposal to implement and test, not a claim that the current phase's raw-family prototype already implements them.

### 6.3 Repetition and DEFLATE are complementary

Adopt an efficient repeated-shape/size-run representation. For canonical unique sets, it should not force a two-bit shape selector on every piece. Preserve arbitrary order and custom per-field overrides.

But reject the conclusion that a repeated-shape flag makes general compression unnecessary:

- a shape flag does not compress repeated Unicode labels, ID prefixes, colours or foreign metadata;
- my valid custom-identity frame compressed **3,863 to 419 bytes**;
- the repeated-shape improvement would remove only a fraction of those literal identity bytes.

Use shortest-of-raw/compressed **complete framed output**, not “always DEFLATE”. Generated cores generally remain raw. Reuse the project's bounded native-stream approach and keep a decompressed-size limit. Lack of a decompressor must produce an explicit capability error, not altered puzzle data.

### 6.4 Oversize policy

The Player's accepted pack domain remains sides ≤64, active cells ≤1,024, pieces ≤128 and piece size ≤128. That does not imply that every transport representation fits a single QR.

Separate limits:

- bounded core/suffix parser and field limits;
- bounded decompressed payload, proposed **16 KiB**;
- bounded text input, proposed **32,768 symbols** before excessive normalization work;
- the existing **16,000-character URL** budget;
- QR Model 2 version/EC capacity.

For the 45-byte prefix and alphanumeric code, version 40 supports approximately **3,322 code characters at M**, or **4,227 at L**, with the exact capacity checked by the encoder. A version-40 symbol plus quiet zone is **92.5 mm** at 0.5 mm/module.

Preflight order:

1. Apply structural compact coding and optional DEFLATE.
2. Prefer full C.T with the answer.
3. If necessary, offer dropping optional bulky metadata explicitly.
4. If the answer is what prevents fitting, offer a **core-only QR** with a clear verification/hint limitation, not silent suffix removal.
5. A lower EC level can be an explicit large-code option; never reduce module pitch below the print minimum merely to fit.
6. If the core still cannot fit a required single QR, **do not print a misleading “complete” reconstruction sheet without QR**. Explain the limitation before printing.

Never drop piece identity, rewrite the board, substitute `#lib`, upload to a shortener or encode unrelated richer data only in the QR.

Continuation text sheets solve long *typeable text*, not QR capacity. Multiple structured-append QRs or an offline transfer workflow would be a separate product feature; ordinary phone cameras cannot be assumed to assemble them. Existing pack play should remain available even when the code-print feature cannot satisfy its stronger QR contract.

## 7. Final proposed unified positions

| Area | Final proposed unified position |
|---|---|
| Reproduction mechanism | Direct content encoding, never seed regeneration. Exactly one selected puzzle. |
| Essential contents | Authored board dimensions/mask/margins, source angle, full ordered piece identities/reference cells, and exact clue occupied cells. To-place pieces are derived. |
| Identity | Conditional canonical/default optimizations only; arbitrary IDs, labels, RGB, order and source orientation preserved. Fingerprints are checked in addition to visual identity, not instead of it. |
| Shapes/masks/poses | A1's size-aware/grouped catalogue ≤10, known-size BFS fallback, adaptive board masks and legal placement/cover ranks. Add repeated-shape/size runs and per-field identity overrides. Canonicalize nonsemantic clue record order if useful, never the piece array. |
| Binary summary | One five-bit version, raw/compressed bit, bounded geometry and identity flags/content, compact-or-full rating, exact title kind, zero symbol padding and checksum. Optional separately tagged answer suffix bound to the full core. |
| Solution | C independently valid; normal QR/copy link uses C.T when stored answer exists. Prominent core plus labelled optional suffix on paper. Do not synthesize an original answer. |
| Rating/title | Compact eligible v2 score+saturation and exact title patterns; full fallback otherwise. Reader accepts absent metrics on stored v2 claims, validates all metrics when present. No default rerating. |
| Provenance | Seeds/history/certificates/timestamps/other puzzles omitted from code. Human-readable provenance may remain, accurately labelled. |
| Checksum | CRC-30/CDMA, fully specified in §3; six symbols per component, length/domain/version/padding coverage, suffix bound to entire C. Corrected tested CRC-20/25 is an acceptable short-code alternative, but not my preferred uniform default. |
| Alphabet/grouping | Crockford base32, uppercase output, case-insensitive entry, O/I/L aliases, groups of four. Dot separates optional suffix and is not ignored. |
| Compression | Raw is normal; structural repetition plus bounded DEFLATE escape when shorter. No universal eight-bit codec tax. |
| URL/route | `…/player/#p=C` or `…/player/#p=C.T`. Keep exact form opened. Reject mixed sources and `i>0`; leave old pack/library routes and whole-pack Play unchanged. |
| Entry/progress | Player start screen and always-available entry dialog; accept core/full code or full URL. Atomic validation, preserve input on error. Restore existing progress, say so, offer Replay; never erase it silently. |
| Manual-only opening | Same starting puzzle and fingerprint; may remain unverified without T. Play remains available. Offer entering/scanning the suffix for the stored answer and fast verification. |
| Paper | QR mandatory on first sheet, normally top-right; core and optional suffix clearly separated in the left/below band. Wrap full titles and code groups; preserve quiet zone and cut-out scale. Use continuation text only when needed. |
| QR | Full URL; exact-case byte prefix + alphanumeric C.T; M by default, modules ≥0.5 mm, four-module white quiet zone, minimum small box about 25 mm. Measured full examples need 22.5–34.5 mm before applying that minimum. |
| QR encoder | Local pinned MIT Project Nayuki compiled ES module, with notice retained; exact-mm SVG path/white background, no external service, no logo/theme inversion. |
| QR destination | Derive reachable published page base; explicit configured/public/LAN alternative for local contexts. Do not silently publish loopback URLs. |
| Scope/limits | Existing Player pack domain; separate parser/decompression/URL/QR limits. Oversize code-print errors are not a change to pack-play validity. |
| Rendering contract | Freeze decoder-derived defaults and shared identification rendering. No per-pack profile marker today; retain compatibility if a future identification-style change needs one. |
| Documentation | Correct the reproduction promises, CLI history wording, and my one-versus-five mistake in future living-spec updates. Document partial rating claims, short/full code guarantees, QR and overflow behaviour. |
| Tests | Final golden frames; all checksum conventions and bounds; exact metadata/identity; prefix/full/suffix-splice tests; verification fast path; claim-reader absence/full/invalid metrics; independent QR decode and physical print/phone checks; old links/progress; EN/VI/layout/CSP checks. |

The “about 25 mm” minimum above is a layout policy; the actual QR must still have at least 0.5 mm per module. Use `max(25 mm, (modules+8)×0.5 mm)`, not a fixed box that shrinks larger symbols.

## 8. Remaining disagreements and genuine user decisions

### Remaining engineering disagreements

1. **Checksum:** I prefer CRC-30/CDMA; architect-1 prefers a corrected, exhaustively tested CRC-20. Both can satisfy normal manual entry. The old augmentation/framing defect is not negotiable.
2. **DEFLATE:** I retain a bounded escape in addition to structural repetition; architect-1 proposes no DEFLATE. The custom-identity compression evidence favours keeping the escape.
3. **Local QR targets:** I require a clear public/LAN choice or warning for local origins; silent page-base localhost publication is not acceptable for portable paper.
4. **Overflow:** I reject “print no QR” as the default fallback under a mandatory-QR requirement.

The solution disagreement is substantially resolved by a labelled, independently valid prefix plus a bound suffix. The rating disagreement is resolved if the narrowly specified reader change is accepted.

### Questions for the user

| Question | Recommended default |
|---|---|
| May QR/copied links include the stored answer by default while manual entry needs only the short core? | **Yes.** Use the C.T family, explicitly label the answer suffix and preferably print that suffix as optional text too. It is not secret; the graphical answer diagram remains controlled by Print solution. |
| May stored `difficulty-v2` claims omit their internal metrics? | **Yes.** Preserve visible score/level/saturation, keep full validation when metrics exist, keep engine ratings complete and document old-reader compatibility. |
| Should local/private printouts use an explicit public or reachable LAN Player destination? | **Yes.** Public deployments/forks derive their own base; local contexts show the destination and use a configured public base or deliberate LAN override. |
| If extreme valid custom content cannot fit any acceptable single QR after compression and optional-data reduction, should the reconstruction print be refused rather than silently lose QR/data? | **Yes.** Fail clearly before printing. A multi-part/offline alternative requires separate approval; do not add a backend or weaken exact piece identity. |

Checksum width, grouping and implementation-library selection are engineering choices with recommended defaults above, not questions the user needs to solve to proceed.

## 9. Validation and working log

New artifacts, only in architect-2's scratch folder:

- `phase3-protected-hashes.json`: hashes of all four Phase 1/2 reports.
- `pcode-phase3.mjs`: own copy of the inner content prototype with a consumed-bit boundary for framing tests.
- `phase3-framing-tail.mjs`, `phase3-framing-tail-results.json`: corrected CRC comparisons, actual compact metadata, prefix/suffix round trips, edits and splice rejection.
- `phase3-qr-tail-results.json`: mixed-segment full-family QR geometry.

Validation performed:

- CRC-30's published check vector reproduced.
- 496,000 CRC-30 single-symbol syndromes at the 16,000-symbol bound, no zero/duplicate values; corrected 20/25-bit comparisons at 512 symbols also passed.
- Twelve actual core/full families with the original board/pieces/clues, stored answers, visible rating/title and matching fingerprints.
- 7,750 substitutions, 250 deletions, 8,064 insertions and 226 swaps rejected on two realistic typed cores.
- A suffix from a different core rejected.
- Actual full-family QR version/size calculation.
- Existing source read to establish one puzzle per page press and the Player watchdog/fast path.
- Long verification logs inspected, not expensively rerun. No claim is made that the current unmodified pack reader accepts the new partial ratings.

**Start:** 2026-10-25 17:11:03 UTC+07:00.

**Work:** responded to all fourteen findings; corrected my public-UI quantity statement; reconciled the verification logs with the actual browser watchdog; built and tested corrected symbol-aligned checks and a bound answer suffix; adopted compact metadata with an explicit reader contract; resolved QR, local-base and overflow policies; wrote only this new repository response.

**Incidents and chosen solutions:** no new tool or generation failures. The important correction was conceptual: direct Node row-budget times do not include the browser's 115-second watchdog. The framing prototype validates geometry against the existing reader without pretending that its compact claim passes before the proposed reader change. Prior reports were preserved, and the quantity error is explicitly corrected here rather than silently editing history.

**End:** 2026-10-25 17:35:58 UTC+07:00 — 24 minutes 55 seconds.

Final validation passed: UTF-8 without BOM, CRLF-only endings, no trailing whitespace, final newline, eight consistent Markdown tables, unchanged tracked files and unchanged hashes for all four Phase 1/2 reports.

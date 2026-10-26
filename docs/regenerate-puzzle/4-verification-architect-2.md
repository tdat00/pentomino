# Phase 4 verification — architect-2

**Date:** 2026-10-25. **Research only:** no application, test, configuration or historical report was changed.

This independently checks the two load-bearing claims in architect-1's Phase 3 response and measures its newer prototype against my corpus. It is not yet a sign-off on `4-final-report.md`; the orchestrator will request that separately.

## 1. Verdict

1. **Corrected CRC-20 core framing: PASS.** The boundary-burst defect is fixed. The exact 5,732-symbol limit for detecting any two symbol substitutions, and therefore uniquely locating an actual single-symbol substitution, is independently reproduced.
2. **Original solution-tail coverage: FAIL as an exact-core binding claim.** Including a complete core **and its own CRC** makes the running remainder independent of that core's contents. Architect-1 has adopted the correction described below. The corrected tail passed independent splice tests without increasing its length.
3. **Three-number rating reconstruction: PASS on all 73 stored v2 ratings in 33 packs / 79 puzzles.** All seven metrics, score, level and saturation were equal, not just what is printed. No search was run.
4. **Full-claim escape in the tested peer prototype: two implementation defects.** Foreign/legacy fields were dropped, and an unknown level threw even with a literal title. A scratch-only two-change correction passed every control and left all 48 previously passing normal code strings unchanged.
5. **Compactness remains good.** Measured generated examples use 37/45 characters for core/full code on a 6×10 board, 43/55 on Heart, 60/80 on 12×12, and at most 212/243 across my generated corpus. A 576-cell example needs QR version 11-M, not merely version 10-M.

The rating idea needs **no reader/schema change**. Its production contract must nevertheless freeze the reconstruction rules and distinguish same-runtime exactness from an unproved bit-identical floating-point result across all JavaScript engines.

## 2. Decisions already made

The following are **decided — confirmed by the user on 2026-10-25 17:50**, not pending questions:

- Print the optional solution tail as smaller, labelled text; the QR and URL carry `C.T`.
- Preserve the displayed title, level and score.
- Drop the printed puzzle seed; retain the level/score and piece-set line.
- Add “Copy this puzzle link” in both applications.
- If extreme custom content cannot fit, drop the tail from text and QR, then try EC L, then print without code/QR with a clear notice **before printing and on the sheet**.
- Use CRC-20, rating reconstruction from the three carried values, the agreed version/compression and repeated-shape choices, and the agreed public-page-base/local-origin URL policy.

The tail-coverage correction in §3.5 is a technical clarification discovered during verification. It preserves the selected width, polynomial, alphabet and character cost. Architect-1 confirmed that its final specification will use it.

## 3. CRC-20 verification

### 3.1 Independent implementation and precise frame

I implemented the CRC from the written specification **before reading the peer's CRC implementation**. The new scratch implementation is `phase4-crc.mjs`; it does not call the peer's checksum routine.

| Property | Verified value |
|---|---|
| Width | 20 bits |
| Polynomial | `0x6C1BD`, with the `x^20` term implicit; full polynomial word `0x16C1BD` |
| Initial register | `0xFFFFF` |
| Reflection | None on input or output |
| Input order | Most significant bit first |
| Final XOR | `0xFFFFF` |
| Padding | Zero to four zero bits **before** the check, bringing the checked body to a multiple of five bits |
| Check placement | Exactly the final four Crockford symbols of the component |
| Coverage | Every preceding body bit, including its version and zero padding |
| Extra zero clocks | **None** |

The update is:

```text
r = 0xFFFFF
for each input bit b, MSB first:
    feedback = (r >> 19) XOR b
    r = (r << 1) AND 0xFFFFF
    if feedback != 0: r = r XOR 0x6C1BD
check = r XOR 0xFFFFF
```

For the 72 MSB-first ASCII bits of `123456789`, my implementation returns **`0xC80C0`**. This is a useful primitive test vector, not a whole puzzle code.

The receiver takes the final four symbols first; it does not trust a corrupted field to determine where the check begins. Content validation still checks version, bounds, zero padding and complete consumption.

### 3.2 Counterexamples and measured tests

| Test | Cases / bound | Result |
|---|---|---|
| Original 20-bit boundary burst: offset 131, mask 914223, mask bits applied least significant first | Original 146-bit geometry body | Old double-augmentation check accepts; corrected check rejects |
| Sliding burst matrices | All 151 windows of 20 bits in a 170-bit frame | Every matrix has rank 20 |
| Random nonzero bursts | 453,000 | 0 undetected |
| One wrong Crockford symbol | All 1,054 substitutions in the 34-symbol frame | 0 undetected |
| Two wrong symbols | All 539,121 pairs of positions/values, exhaustively evaluated through error syndromes | 0 undetected |
| Direct checksum cross-check of two-symbol errors | 1,000 additional mutated strings | 0 accepted |
| Adjacent unequal-symbol swaps | All 30 in that frame | 0 undetected |
| Insertions in 400 independently generated 34-symbol frames | 448,000 | 0 accepted |
| Deletions in those frames | 13,600 | 0 accepted |
| Appending zero symbols | Suffix lengths 1 through 512 | 0 accepted |
| Original long ambiguity, reframed with corrected CRC | 6,180 symbols; two changed RGB fields | Both original alternatives remain valid; one damaged string is one substitution away from each |

The corrected checksum-only boundary vector is:

```text
128M11VAAX56244P0S71A5CWYTKGD0E3F3
```

Applying the old burst produces:

```text
128M11VAAX56244P0S71A5CWYTWSYXY3F3
```

The latter is rejected by the checksum itself, before considering its damaged padding or content. These two vectors reuse the earlier geometry grammar; they are **not** new metadata-format golden puzzle codes.

For the long control, the changed positions are still **383 and 6,115**, counted from one. Both reframed geometry streams decode to packs accepted by the existing reader. The damaged string fails its check, but has two valid one-substitution repair candidates. This is deliberately outside the correction limit; it is not a defect in the bounded recommendation.

### 3.3 The exact 5,732-symbol bound

The independent enumeration includes every symbol position, including the version and the four check symbols, and every nonzero five-bit XOR difference.

- At **5,732 symbols**, all **177,692 = 5,732 × 31** single-symbol error syndromes are nonzero and distinct.
- The first collision occurs at **5,733 symbols**.
- Its two errors are a delta of `7` in the first symbol and a delta of `28` in the last symbol.

Distinct nonzero single-error syndromes imply:

1. Every single-symbol substitution is detected.
2. No pair of distinct single-symbol substitutions can cancel.
3. If a received string really differs from a valid code in exactly one symbol, that checksum repair is unique within the bound.

This is a fixed-length substitution result, **not** an insertion/deletion distance theorem and not a promise that arbitrary corrupted input has one trustworthy repair.

The rank test also provides stronger evidence than the random burst sample: every nonzero error confined to any 20-bit window is detected. Because the CRC uses nonzero init/xorout, valid frames form an affine CRC code; differences between valid frames have the usual polynomial divisibility property.

### 3.4 Typing guarantees that should be stated

- One wrong five-bit symbol: guaranteed detection.
- Up to four neighbouring symbols in one component, or an adjacent unequal-symbol swap within it: guaranteed detection through the 20-bit burst property.
- Two arbitrary symbol substitutions: guaranteed within the verified 5,732-symbol component bound.
- Insertions/deletions: **no universal guarantee**. Our 461,600 random-frame trials and the additional real-family tests below passed, but sampled success must not be promoted to a proof.
- Other errors: the often quoted `2^-20` miss probability is a random-syndrome estimate, not a probability law for every typing process.
- Repair: show a candidate only after checksum and complete decoding succeed; require confirmation. Never silently substitute or claim certainty about the user's intention.

The 6,180-symbol counterexample is a useful permanent regression test preventing accidental removal of the correction bound. CRC is integrity checking, not authentication.

### 3.5 Important correction: a tail must not checksum the core's check

The original Phase 3 wording was:

```text
tailCheck = CRC20(completeCoreIncludingItsCheck | tailPayload)
```

That does **not** bind a tail to a particular valid core. With these parameters, the register after reading any complete valid core is the constant **`0x93231` before final XOR**, or `0x6CDCE` after it. Therefore the remaining tail calculation forgets the core's contents.

I first reproduced this independently, then notified architect-1. It confirmed the issue and changed its prototype/specification to:

```text
P_C = core version, metadata and geometry, including its zero padding
C   = base32(P_C | CRC20(P_C))

S   = tail tag, solution path and zero padding
T   = base32(S | CRC20(P_C | S))

F   = C "." T
```

**Exclude the core's own 20 check bits from the tail calculation.** The dot is the textual separator, not part of the bit stream. For a compressed core, the specification should consistently use the **transmitted** padded payload, allowing both checks before decompression.

Measured against 48 previously passing real corpus codes:

- **96 component/full-frame checks** independently agree with the corrected prototype.
- **2,230 cross-core tail splices:** zero pass the independent tail check; zero are accepted by the full decoder.
- On the actual 45-character `C.T` example: **1,396 substitutions**, **43 adjacent swaps**, **45 deletions** and **1,518 insertions**, including punctuation cases, produce zero accepted changes.

An especially simple control changes only the board presentation from 0° to 45°. Both puzzle packs are valid and have the same solution path. The old rule gives them an identical tail; the corrected rule gives different tails and rejects a transplant.

Actual corrected raw-format vectors from `recipe-w1.json`, selected puzzle 0:

```text
C = 1DCQT14A0GXPKPP0VSJR425KR0EPZGTQGJ7G5
T = 1F0EH78
F = 1DCQT14A0GXPKPP0VSJR425KR0EPZGTQGJ7G5.1F0EH78
```

With the same pack presented at 45°:

```text
C = 1DCQT14A2GXPKPP0VSJR425KR0EPZGTQGNV0Y
T = 1F05W31
```

This fixes the systematic cancellation; it does not make a 20-bit checksum collision-free or cryptographic. The two checks retain their ordinary per-component guarantees. In particular, a short burst touching a core check is caught by the core, while a burst solely in the tail is caught by the tail.

**Corrigendum to my Phase 3 report:** my length/domain-separated CRC-30 proposal had the same cancellation for **same-length** valid cores. Its earlier splice test happened to compare different lengths. I reproduced a same-length 0°/180° pair with identical tail checks. Wider CRC and domain text alone do not fix this; excluding the inner check does. No historical report was silently edited.

## 4. Rating reconstruction

### 4.1 Independent method

The reference code is `core/engine/difficulty.js:58–99`, `:112–115`. Only the search's `branchTrials`, `rowTrials` and `stop` need to be carried.

My independent rebuild used:

```text
U = piece count - clue count
R = remaining board-cell count
L_i = legal placement count of each remaining piece, in canonical order
H = sum(log2(1 + L_i)) / U
saturated = (stop != "solution")
B = saturated ? 5000 : min(branchTrials, 5000)
score = round(2*U + 8*log10(1+B))
level = the frozen v2 band containing score
```

The engine's all-clued special case is zero-valued; it was also checked separately. However, a puzzle with all pieces clued is **not accepted by the current pack reader**, which permits at most `K−1` clues. It is an engine-only control, not an additional valid-pack sample.

For the normal cases I used `preparePlacements` and `countPlacements`, not the peer's reconstruction function. `core/engine/placements.js:192–229` defines the canonical order; `:306–328` supplies per-piece counts. I then separately compared those counts and free-cell totals with `buildModel` for every rated puzzle.

No `solveFirst`, rating search, seed regeneration, calibration or worker was involved.

### 4.2 Corpus and results

- **33 packs, 79 puzzles**, including both repositories' generated corpora and my custom controls.
- **73 stored `difficulty-v2` ratings: 73 exact matches**, including every metric's numeric value.
- The original `tests/fixtures/hand-authored-pack.json` has **no rating**. Its absence is preserved, not synthesized.
- Existing `parsePack` accepts the rebuilt claims with all seven metrics. The current strict reader is unchanged (`core/engine/pack.js:737–785`).

Representative large cases, selected puzzle 0:

| Source | Pieces to place U | Branch trials | Row trials | Stop | Score | Plain tuple bits | With cap flags |
|---|---:|---:|---:|---|---:|---:|---:|
| `large-576-h1.json` | 36 | 5,000 | 5,164 | branch-cap | 102 | 42 | 23 |
| `large-576-h3.json` | 75 | 5,000 | 5,276 | branch-cap | 180 | 42 | 23 |
| `wide-576-h3.json` | 81 | 5,000 | 5,336 | branch-cap | 192 | 42 | 23 |
| `irregular-558.json` | 72 | 5,000 | 5,061 | branch-cap | 174 | 42 | 23 |

Measured Node timings in the final verification run:

- Count-only reconstruction: **0.20–16.30 ms**, mean **3.55 ms**.
- Building the full model for comparison: **0.27–80.14 ms**, mean **11.95 ms**.

These are local Node measurements, not browser/phone guarantees. They nevertheless demonstrate why reconstructing diagnostic placement counts is different from rerunning the 0.5–3.9-second rating searches discussed earlier.

### 4.3 Bit cost and explicit counter coding

For the plain three-number form:

- `stop`: truncated binary over three choices: `0 = solution`, `10 = branch-cap`, `11 = row-cap`.
- `branchTrials` and `rowTrials`: order-5 Exp-Golomb.
- For a nonnegative integer `n`, let `q = n + 32`; write `floor(log2(q))−5` zero bits followed by the complete binary representation of `q`.

The independently encoded and decoded tuples cost **13–42 bits**, mean **23.74**, across the 73 ratings.

The new prototype adds useful special cases:

- On `branch-cap`, a one-bit flag says whether `branchTrials = 5000`; otherwise carry that count normally.
- On `row-cap`, a one-bit flag says whether `rowTrials = 50000`; otherwise carry that count normally.

With these flags the measured cost is **13–33 bits**, mean **17.49**. These numbers exclude rating presence/compact-versus-escape bits, title, certificate and other metadata. In the prototype, a present rating contributes another **two selector bits**, making the compact rating field **15–35 bits** in this corpus.

The caps must be frozen constants of the codec, not read from a future policy object. The relevant current values are in `core/engine/policy.js:48–52`.

### 4.4 Exact eligibility and full-claim escape

Compact encoding must be selected by comparing the **complete rebuilt normalized claim** with the stored claim. Merely checking its model name or visible score is insufficient.

| Control | Current pack accepts it? | Compact rebuild exact? | Required representation |
|---|---|---|---|
| Genuine stored v2 claims, including the four large rows above | Yes | Yes | Three numbers / cap flags |
| No stored rating, including the hand-authored fixture | Yes | Not applicable | Absent |
| Foreign model with opaque metrics and `censored` | Yes | No | Whole original normalized claim |
| Legacy `difficulty-v1` claim | Yes | No | Whole original normalized claim |
| Fractional v2 score | Yes | No | Whole original normalized claim |
| Edited U, R, H, B, saturation or inconsistent level | Yes | No | Whole original normalized claim |
| Only `rowTrials` changed to another valid integer | Yes | Yes in the tested control | Compact is still exact: this value is carried |

A rating remains a **claim**. Carrying counters cannot prove that somebody actually ran the corresponding search. The changed-row-counter case is intentional and is not a reason to reject an otherwise exactly representable claim.

The full escape must retain all allowed fields, including `censored` and opaque foreign metrics. It must also work with a level name that is not in the current ladder: the reader explicitly preserves such claims (`core/engine/pack.js:770–839`). Reconstruction failure or an unrepresentable counter must select the escape, not abort printing.

### 4.5 Prototype defects found and isolated fix

The tested peer snapshot was `final-lib.mjs`, SHA-256:

```text
d26df6772b70ba404e2dccf737337c4256cd6aec0e139d070e25a4d38fd02fa2
```

Two defects were found:

1. **`final-lib.mjs:36,51`:** the full escape used `claimJson(r)`, a projection onto v2 fields. It dropped `censored` and foreign/legacy opaque metrics. These are valid stored data, not irrelevant JSON spelling.
2. **`final-lib.mjs:103`:** the decoder called `level(rating.level)` even for absent/literal title kinds. Valid foreign and inconsistent-v2 level strings therefore threw `unknown level id: author-grade`.

I notified architect-1. I did **not** modify its files. In a copy under my scratch directory I changed only the corresponding behavior:

- Use `JSON.stringify(r)` for the full normalized claim escape.
- Resolve a level label only for title kinds that actually derive their text from that label.

Results of this isolated correction:

- **11/11 metadata controls pass**, versus four failures before it.
- **49/49 own/repository puzzle round trips pass**, using RGB value equality.
- All **48 previously passing core and full strings are byte-for-byte unchanged**.
- Every reconstructed pack passes the current reader; fingerprints and stored solution poses were checked.

One custom-identity control canonicalizes `#Ab12CD` to `#ab12cd`. RGB bytes, labels, IDs, array order and appearance remain equal. This is not a claim of byte-identical JSON colour spelling; the final specification should explicitly define colours as RGB values.

These fixes validate the design, but are not a claim that the peer's live prototype already contains them. The report above identifies the exact tested snapshot; the later sign-off should check the final specification's escape contract.

### 4.6 Versioning and floating-point risk

The complete claim is exactly reproducible **in the measured Node runtime**, but its reconstruction is not independent of implementation:

- Legal orientations, placement enumeration and canonical ordering affect `L_i` and summation order (`placements.js:192–229`).
- Branch cap, score weights and score arithmetic are current policy (`policy.js:48–52`, `difficulty.js:44`).
- Level edges depend on the current 1.45 ladder (`levels.js:18`, `:40–41`, `:95–104`).
- `Math.log2` affects the last bits of H.

Controls demonstrate the dependency:

- Changing the branch cap from 5,000 to 6,000 changes the rebuilt B, even in an example whose rounded score remains 66.
- A **simulated**, slightly different `log2` implementation changed H from `4.9146096300175275` to `4.914609630017528`. This is not a measurement from another browser.

Consequently, old codes must not simply call whatever the newest `difficulty.js`, `levels.js` and placement planner happen to implement. Freeze the v1 constants, band table, counting/order semantics and reconstruction function.

If “complete claim exact” means identical floating-point H across all engines, a deterministic frozen numeric implementation/table or a suitable exact-value escape is also necessary; generic `Math.log2` alone does not establish that guarantee. A writer's equality check against its own runtime cannot discover how another runtime will round. At minimum the final report must not claim that the 73 same-runtime tests prove cross-engine bit identity. The user's decided title/level/score requirement does not require presenting H to the user.

## 5. Measured code and QR lengths

The peer's available raw writer/reader were imported read-only. I did **not** run `final-proto.mjs`, whose top-level corpus runner writes into its own folder.

Measurements below include the corrected core CRC, the corrected tail CRC, metadata and the literal dot in `F = C.T`. For the custom identity row, the isolated escape-fix copy was used; its changes do not affect that row's metadata or normal geometry coding.

QRs were measured separately with the Nayuki reference encoder using:

- Byte segment: the exact-case **45-character** prefix `https://tdat00.github.io/pentomino/player/#p=`.
- Alphanumeric segment: the uppercase Crockford core or full `C.T`.
- EC **M**, no automatic EC boost.
- Four-module quiet zone on every side.

`N = 17 + 4v` modules. At 0.5 mm/module, the outside size is `(N+8) × 0.5 mm`. The recommended small-box minimum remains 25 mm, achieved by increasing module size, not shrinking the quiet zone.

| Source, selected puzzle 0 | Pieces K | Core C | Full F | QR v-M, C / F | Full modules | Full minimum printed side |
|---|---:|---:|---:|---|---:|---:|
| Generated 6×10, `recipe-w1` | 9 | 37 | 45 | 5 / 5 | 37 | 25 mm |
| Heart 75 | 14 | 43 | 55 | 5 / 5 | 37 | 25 mm |
| 12×12, `mid-144` | 21 | 60 | 80 | 6 / 6 | 41 | 25 mm |
| 24×24 Hell 1 | 40 | 211 | 243 | 10 / 11 | 61 | 34.5 mm |
| 24×24 Hell 3 | 78 | 137 | 223 | 8 / 10 | 57 | 32.5 mm |
| 32×18 Hell 3 | 84 | 114 | 215 | 8 / 10 | 57 | 32.5 mm |
| Irregular 558 | 75 | 153 | 238 | 8 / 10 | 57 | 32.5 mm |
| Ring 60 | 9 | 38 | 47 | 5 / 5 | 37 | 25 mm |
| Classic twelve pentominoes, literal title | 12 | 71 | 82 | 6 / 6 | 41 | 25 mm |
| Padded board control | 10 | 65 | 75 | 6 / 6 | 41 | 25 mm |
| Piece containing a hole | 2 | 48 | 55 | 5 / 5 | 37 | 25 mm |
| Custom identities | 10 | 216 | 226 | 10 / 10 | 57 | 32.5 mm |
| Hand-authored fixture, no rating | 10 | 55 | 65 | 5 / 6 | 41 | 25 mm |
| Pack-limit 1,024-cell control | 128 | 357 | 503 | 13 / 15 | 77 | 42.5 mm |

The minima before applying the 25 mm policy are 22.5 mm for version 5 and 24.5 mm for version 6.

Across **all** selected puzzles in my generated packs, rather than only the table's first puzzle, the largest measured core is **212 characters** and the largest full code is **243**. These are corpus maxima, not universal format limits.

The 1,024-cell row is a valid-pack stress control, not an ordinary Generator board. The prototype does not implement the repeated-shape or DEFLATE optimization paths, so its raw length is not a prediction of the final shortest-of encoder. Normal generated code lengths above are actual round-tripped strings, not estimates obtained by adding independently rounded field costs.

A first-sheet QR budget capped at version 10 or 32.5 mm would be too small for my 576-cell Hell 1 example. The layout should use the actual matrix dimensions and the agreed module/quiet-zone rule.

## 6. What is and is not ready to freeze

### Verified foundations

- CRC parameters, padding position, last-four-symbol extraction and the stated substitution bound.
- Corrected `P_C | S` tail coverage.
- Concrete raw vectors in §3.5, verified independently.
- Three-value rating reconstruction, including diagnostic placement counts and cap-flag savings.
- Full original claim escape as a workable no-schema-change fallback.
- Measured raw code and QR sizes on my corpus.

### Requirements for the final specification and implementation tasks

1. State the corrected tail coverage exactly; do not retain the obsolete “complete core including its check” formula in a header, example or golden-vector generator.
2. Freeze the exact metadata/geometry order. The measured prototype uses **version → metadata → geometry/pieces/clues → padding → CRC**, not the earlier draft's metadata-at-the-end order.
3. Specify raw versus DEFLATE representation, repeated-shape mode and all text escapes completely before publishing golden vectors for those paths. They are not implemented/tested by this raw prototype.
4. Keep complete foreign/legacy claims; never run a foreign level through `level()` unless the chosen title representation specifically needs a known level label.
5. Bound counters, sizes, ranks, text, decompressed length and work before allocation/iteration. An encoder unable to use the compact rating path must choose a full claim, not fail the print job.
6. Freeze rating semantics and qualify/fix the floating-point exactness issue; no future search is needed to open the code.
7. Define RGB equality and displayed-title capture explicitly. Do not confuse a fingerprint match with all presentation fields matching.
8. Make every QR size calculation include the quiet zone and handle the measured version 11-M generated example.
9. Test the decided oversize fallback notices both in the dialog and on the final sheet. This is now an explicit user-approved exception to printing a QR, not a silent failure.
10. Preserve the already decided EN/VI entry, optional-tail, scan, destination and error texts in the final report/task contracts; these verification scripts do not implement browser UI.

No new product question is raised by this verification. The remaining work is to make the technical contracts and their executable tests agree.

### Update received at the measurement cut-off

After the measurements and initial formatting validation above, architect-1 announced a newer, specification-conformant `final-v1.mjs` / `pcode-v1.mjs`. It reports that both escape fixes are integrated, H ordering is specified and cross-engine exactness qualified. It also reports 73 exact/valid/fingerprint round trips, zero of 5,250 accepted splices, and a repeated-shape 1,024-cell raw result of **52/198** instead of the older unoptimized row above; DEFLATE reduces that core to **31**.

Those are **architect-1's newly reported results, not measurements independently reproduced in this file**. Its newer runner writes into the peer's folder and must not be run there by this agent. The subsequent requested sign-off should import the safe library from my scratch runner, verify the final vectors and update the final-format measurements. The vectors in §3.5 identify the explicitly tested earlier raw prototype; they must not be substituted for the newer specification's golden vectors without comparison.

## 7. Evidence and reproducibility

All files below are in my own scratch directory:

```text
C:\Users\ledat\.copilot\session-state\bd310130-fd20-420b-8d77-6abb52737794\files\architect-2\
```

| File | Purpose |
|---|---|
| `phase4-crc.mjs` / `phase4-crc-results.json` | Independently written CRC, burst/substitution/length tests and exact syndrome bound |
| `phase4-long-corrected-codes.json` | Reframed long ambiguity vectors |
| `phase4-tail.mjs` / `phase4-tail-results.json` | Independent corrected-tail check, 2,230 splices, real-family edits, my Phase 3 corrigendum |
| `phase4-rating-lengths.mjs` | Independent count-only rating rebuild, tuple codec, pack/model comparisons and prototype measurements |
| `phase4-rating-lengths-results.json` | Initial peer snapshot results, including detected escape defects |
| `phase4-final-lib-fixed.mjs` | Scratch-only proof of the two metadata fixes; peer files untouched |
| `phase4-fixed-rating-lengths-results.json` | Corrected-copy results: 73 exact ratings, 49 round trips, 11 controls |
| `phase4-qr-results.json`, `phase4-fixed-qr-results.json` | Independent core/full QR dimensions |
| `phase4-peer-prototype-hash.json` | Identifies the tested peer snapshot |
| `phase4-protected-hashes.json` | Hashes of all six pre-existing Phase 1–3 reports |

Reruns must set the working directory to that scratch folder. `phase4-rating-lengths.mjs` uses the peer library by default; setting `PHASE4_FIXED=1` selects my corrected copy. Neither route invokes the peer's file-writing corpus runner.

## 8. Working log

**Start:** 2026-10-25 17:40:21 UTC+07:00.

**Work:** read architect-1's Phase 3 response; independently implemented the selected CRC frame; reproduced the old counterexamples and exact bound; found and coordinated the tail-coverage correction; rebuilt every stored v2 rating in the combined corpus; tested valid foreign/fractional/inconsistent claims; measured the newer raw codec and QR matrices; prepared this verification report.

**Incidents and chosen solutions:**

- The original tail rule cancelled core contents. I notified architect-1 immediately and independently verified its corrected rule. I also explicitly corrected the same weakness in my own prior proposal.
- An all-clued engine control initially failed pack validation. The reader correctly requires at least one piece left; I marked it engine-only rather than weakening validation.
- Strict string comparison flagged mixed-case hex colour spelling. I recorded the canonicalization and compared actual RGB values while continuing to require exact IDs, labels, ordering and geometry.
- Four metadata controls exposed two escape bugs. I proved the minimal fixes in my own scratch copy, without modifying the peer's files or the pack reader.
- No server, dependency installation, new generation search or state-changing Git operation was needed.

**Verification cut-off:** 2026-10-25 18:13:14 UTC+07:00 — 32 minutes 53 seconds.

Formatting validation passed: UTF-8 without BOM, CRLF only, no trailing whitespace, final newline and six consistent Markdown tables. All six protected Phase 1–3 reports have unchanged hashes; tracked repository files have no diff. Final-report sign-off has deliberately not been performed.

## Sign-off

**Verdict: Withheld pending fixes.**

**Review start:** 2026-10-25 18:16:14 UTC+07:00. This reviews the unified report as read at the start of this round and the final-format `final-v1.mjs` / `pcode-v1.mjs` exercised by the scripts below. I did not edit the unified report or any peer prototype. Some findings concern missing/contradictory contracts, not a failure of the central design.

### What passed

- Both previous full-claim escape defects are fixed: **11/11 controls pass** against `final-v1.mjs`, including foreign/legacy opaque metrics, `censored`, fractional scores and inconsistent/unknown levels.
- **49/49 own/repository puzzle round trips**, existing-pack validation and fingerprints pass; all **73 stored v2 ratings** in the combined corpus still rebuild identically in this Node runtime.
- All **four §5.12 full-code vectors** reproduce exactly.
- A separately written catalogue generator, using its own coordinate transforms and growth/deduplication, produces all **6,473 shapes** and the exact hash `049504c225b9df4aa8f00971c4190ab640dbc66fe7b47e6ec1e654c3f56dae34`. It does not import the peer's catalogue or the engine's geometry functions.
- The final §5.2 tail formula matches the independently verified correction: **98 frame checks** agree, and **0 of 2,326** cross-core splices pass either the independent check or the final decoder.
- Independent QR measurements agree with the applicable §6 rows, including **211/243, version 10/11-M, 34.5 mm** for the 576-cell Hell 1 puzzle, **225/235** for custom identity and **52/198, version 5/10-M** for repeated pieces.
- **Five actual QR matrices**, covering all four golden strings and the 243-character full code, were decoded locally by a second QR implementation. Every decoded URL is exact.

### Findings

| ID | Severity | Report section | Issue | Evidence | Exact fix |
|---|---|---|---|---|---|
| S2-01 | major | §§3, 5.6, 10, 12, 14; Q2 | The report knowingly permits the displayed title to change, contrary to the confirmed decision. The print/copy input contract also does not explicitly capture effective angle and the Player's stored answer. | Re-encoding `title = "Normal"` at source index 1 gives displayed `Normal #2` before and `Normal #1` after. `player/puzzle-title.js:26–30` appends the index. Current Player printing uses `viewRotation` and `puzzleDisplayName` but omits the solution (`player/app.js:357–377`). | Remove the §14 acceptance of title drift. Define one shared print/copy transport snapshot containing the chosen **displayed title**, effective pre-print angle, original clues, complete rating/certificate and original stored solution. Render the sheet heading and encode/copy from that same snapshot. For imports, capture `puzzleDisplayName(originalTitle, originalIndex)` when needed; do not preserve only raw text and lose the ordinal. Explicitly settle the Generator heading rule and update its measurements if that changes the encoded title. Keep the Player's solution-sheet permission separate from carrying an answer in the code. Add index > 0, absent/custom title, changed view-angle and Player-with-answer tests. |
| S2-02 | major | §§5.7, 5.9, 13 | The certificate domain exceeds the specified EG decoder domain. A valid imported pack cannot round-trip. Number arithmetic also loses precision near the limit. | `pack.js:121,860–861` permits `rowLimit = Number.MAX_SAFE_INTEGER`. The final codec encodes it but decoding throws `bad code`. EG10 needs **43** leading zeros for that value, exceeding the stated 40. `n + 1024` also rounds when n is the maximum safe integer. | Implement EG arithmetic with BigInt, converting to Number only after the field's bound is checked. Permit the certificate EG10 prefix through 43 zeros and `rowLimit` through `2^53−1`; retain tighter bounds on smaller fields. Add round trips at `2^50−1` and `2^53−1`, and rejection of `2^53`. Do not fix this by silently narrowing the existing pack schema. |
| S2-03 | major | §5.6 and final reference writer | The stated title-number escape rule is not implemented by the reference writer. Valid large-number titles either use a forbidden compact representation or fail to decode. | `Easy #2147483648` uses kind 2 although §5.6 limits it to 2,147,483,647. `Easy #9007199254740993` is a valid title but its encoded code throws `bad code`. `final-v1.mjs` converts the regex capture to Number without checking the stated range. | Check the digit string as BigInt, or check safe-integer/range plus exact decimal spelling, **before** choosing kind 2. Only 1…2,147,483,647 qualifies. Every other suffix must use kind 3 literally. Add both demonstrated controls and make the reference writer agree with the already-correct prose. |
| S2-04 | major | §5.5; reference writer; §12 acceptance | The specification promises a full escape when rebuilding throws, but the reference writer does not catch that exception. | A valid 1,024-cell pack with 128 repeated connected eight-cell shapes and a valid v2 claim has **849,920 placement rows**. `encodeCode` throws `model needs more than 600000 rows or 5000000 nonzeros` instead of selecting the escape. The input passes the existing pack reader. | Wrap the compact-eligibility rebuild in a narrow try/catch and select the **whole-claim** escape on failure. Do not relax solver/model limits or reinterpret the claim. Add the demonstrated model-too-large fixture to the full-escape acceptance cases. The report's promise can remain, but the claimed specification-conformant reference must implement it. |
| S2-05 | major | §§5.2–5.4, 5.12, 13 | Two bit-stream details remain ambiguous for independently written decoders: the mode-2 run count and inflated payload padding. | `pcode-v1.mjs:200–209,238–242` writes only runs preceding the implied final run; the report says “run count, each run” without identifying which runs. Version 2 pads inflated data to bytes with 0–7 zeros, whereas §5.2 generally allows fewer than five trailing zeros. | State: mode 2 writes **the number of explicitly stored runs, excluding the implied last run**, followed by exactly that many EG values; the last length is `W*H − sum(stored)`. Separately require 0–4 zero bits for outer wire/raw-v1 padding and 0–7 zero bits at the end of the inflated v1 payload. Keep the outer version-2 length/byte-stream padding check separate. Add at least one decode-only v2 golden with 5–7 inflated fill bits, plus rejection of an extra inflated byte/nonzero fill. |
| S2-06 | major | §§7, 10, 12–13 | The first-sheet geometry is not yet a sufficient layout contract for the accepted extreme cases. Fixed “10 groups / 118 mm beside QR” does not fit every allowed QR, and continuation triggering is unspecified. | Version 40 at 0.5 mm plus quiet zone is **92.5 mm** wide. A 190 mm content area leaves under 97.5 mm before any gap, less than the prescribed 118 mm text line. The report gives no minimum preview reserve or maximum band height. | Derive the line width from actual QR/caption occupancy; choose whole groups by measured glyph advance, not always ten groups. Freeze a minimum preview reserve (recommended **120 mm**) and move overflow groups to labelled continuation sheets. Define duplex continuation/back accounting explicitly. Use per-sheet header height: a solution page without code/QR should not inherit the first sheet's larger band. Test version 40, an 80-character title, continuation and duplex with no overlap and unchanged cut-out scale. |
| S2-07 | minor | §§5.5, 5.11, 14 | H is qualified, but visible score and level still depend on transcendental functions and a formula-based band calculation. A zero-wire-cost deterministic form is available. | Exhaustive verification covers **640,128** legal `(U,B)` pairs. An 80-digit check of all 5,001 B values confirms the integer formulation below. The nearest score-rounding boundary is still 0.000143136… away; no practical cross-engine score failure was observed. | Freeze the integer effort thresholds and finite band edges below. Compute score/level with integer comparisons only. This adds **zero encoded bits** and preserves all current vectors. Keep the separate H qualification. A carried nine-bit score would also work, but is unnecessary here. |
| S2-08 | minor | §§7, 12–13 | QR dependency/pinning/testing is still conditional rather than a concrete dependency-free task contract. The recorded upstream digest is not actually given in the report, and it differs after module/CRLF adaptation. | The local test below successfully decodes five QR matrices using vendored **jsQR 1.4.0, Apache-2.0**, with no npm install or dependency change. The upstream/adapted Nayuki and decoder hashes are listed below. | Specify **both** pinned golden module matrices and the pinned test-only decoder. Vendor jsQR as a Node-test-only `.cjs` file with its licence/notices; do not import it in browser code. Record the Nayuki upstream digest and the exact adaptation recipe/adapted digest separately. Use the concrete test procedure below. |
| S2-09 | minor | §§5.9, 13 | Two scope constants/tests contradict the actual pack reader. | Piece IDs match `[A-Za-z0-9_-]{1,8}`, not 64 characters (`pack.js:46`). The reader allows at most `K−1` clues (`pack.js:893–894`), so `U=0/G=K` is not a valid-pack round-trip case. | Correct the ID bound to **8 ASCII characters**; keep the other field-specific limits distinct. Make all-clued input an engine-only case and a **negative code-to-pack validation test**, not a positive valid-pack round trip. |
| S2-10 | minor | §§1, 5.2 | Some summary language is stronger than the verified checksum guarantees. | The insertion/deletion row correctly says “not guaranteed”, but the executive summary says “every single typo”. The splice row says “Rejected” although it is a finite sample under a 20-bit check. | Say “every single-symbol substitution”; state the applicable component-length bound. Describe splice tests as zero accepted **in the measured sample**, retaining normal CRC collision risk and final layout validation. Do not imply authentication or universal detection of all edit operations. |
| S2-11 | minor | §§5.8, 7.1, 8, 12 | A few integration contracts needed by self-contained tasks remain implicit: pasted-URL validation, actual URL budget, local-target override and the shared print/copy projection. | The specified normalizer discards everything after `&`, so a pasted `#p=C&i=1` loses the invalid index instead of following §8. A 16,000-symbol code is not itself a 16,000-character URL. The override has a warning but no defined control/API/state lifetime. | Route pasted URLs through the same hash parser before extracting `p`, including mixed-key/index checks. Distinguish the decoder's code bound from the existing **complete URL** bound. Define the local-target override API/control and lifetime, and a single preparation result used by Print and Copy so title/angle/target/oversize-tail choices cannot diverge. Record worker input/result/error shapes, including how a tail error returns a validated but unopened core for explicit fallback. |

The major findings are reasons to withhold final approval **now**. S2-03 and S2-04 already have correct intentions in the prose; correcting the reference and adding regression evidence is sufficient. These are not requests for new user decisions or a different codec architecture.

### Deterministic score/level mitigation — zero wire bits

The concern is not an observed bad score in another browser. It is that “freeze a function calling Math.log10/Math.pow” leaves an unnecessary numeric assumption in a promise of exact visible metadata. The measured margin is large, and a simple integer replacement removes the assumption completely.

For integer `0 <= B <= 5000`, freeze this array. Duplicates are intentional:

```text
EFFORT_THRESHOLDS = [
  1, 1, 2, 2, 3, 4, 6, 8, 11, 15, 20, 27, 36, 48, 64,
  86, 115, 153, 205, 273, 365, 486, 649, 865, 1154, 1539,
  2053, 2738, 3651, 4869
]
bonus(B) = number of entries <= B
score(U,B) = U == 0 ? 0 : 2*U + bonus(B)

LEVEL_EDGES = [0, 8, 12, 17, 25, 37, 53, 77, 112, 162, 235]
levelIndex(score) = largest index whose edge <= score
```

For the compact domain, score is at most **286**, so these eleven edges suffice; the next edge is **341**. Level labels/IDs are the existing frozen mapping. Foreign or inconsistent claims still use the full escape and do not pass through this restricted derivation.

- All `128 × 5001 = 640,128` score/level combinations agree with the current engine.
- An independent Python Decimal calculation at 80 digits verifies every effort result and the band edges.
- Closest half-integer effort boundary: B = **865**, distance **0.0001431361387731032944427552780855…**.
- Added payload cost: **0 bits**. Existing raw golden strings remain unchanged.
- H still uses the documented canonical summation and retains its explicitly qualified cross-engine last-bit behavior; this table does not pretend to solve that separate diagnostic issue.

### Concrete QR test contract without npm dependencies

Use **both** reference matrices and independent decoding:

1. Pin the Project Nayuki compiled JavaScript source:
   - URL: `https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js`
   - Upstream bytes: **45,350**
   - Upstream SHA-256: `2511bc17f40a3c41d4a0578995db956b38997334d3d20113a5d4dc5c49c69480`
   - Preserve MIT notices. A concrete ES-module adaptation is: normalize its line endings to CRLF, preserve its existing final newline, then append `\r\nexport { qrcodegen };\r\n`.
   - That exact adaptation is **46,212 bytes**, SHA-256 `26ce50602b29f72b628a1d37568655d8bd5fb65e131792c732064fd8a20d3f22`. Do not compare the adapted file directly with the upstream digest.
2. Store small golden module matrices for the four §5.12 URLs and the 243-character full code. Generate with exact-case byte prefix, alphanumeric F, EC M, automatic mask and **EC boosting disabled**.
3. Pin **jsQR 1.4.0** only under `tests/vendor/`:
   - Bundle: `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js`
   - Save as `jsqr.cjs` for Node tests; upstream bytes **256,885**.
   - Upstream SHA-256: `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`
   - Licence: **Apache-2.0**, `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/LICENSE`; keep it and embedded notices. Record any line-ending-only adaptation separately rather than expecting its raw upstream digest.
   - Load using Node's `createRequire`; add **no npm dependency**, no browser import and no external decoding service.
4. Rasterize the generated matrix locally into an opaque RGBA array at four pixels/module with four white quiet-zone modules. Decode it with jsQR and assert that the result equals the exact URL, including path case.
5. Separately test the SVG adapter's row-run coordinates, white background, quiet zone and millimetre dimensions. A correct matrix alone does not prove a correct printed path.
6. Retain the planned physical 100%-scale print-and-scan acceptance on Android/iPhone. Unit tests do not replace it.

This procedure was executed in scratch: **5/5 independent decodes passed**. No package manifest or lockfile was changed.

The first golden URL's matrix is version 5-M, 37×37 modules. Hashing its rows as ASCII `0`/`1`, joined by LF with no final newline, gives:

```text
8fd29495b33327d2b34f1c5b0b2554b832bb25d199f12ad21666959a823b0c42
```

The 243-character full code's version 11-M, 61×61 matrix gives:

```text
7cd76340de36049de81dd86e02614cca72abd3eac9672d0160e5daeb90ed05b7
```

All five matrices and hashes are in `signoff-qr-goldens.json`, ready to transfer into test fixtures after the report is corrected.

### Task-pack readiness and evidence

The codec architecture, decisions, existing seams, normal vectors and EN/VI messages are sufficiently developed to organize the task pack. **The major findings must be resolved before individual developers receive an allegedly frozen contract.** In particular, the title/snapshot rule, numeric domains, padding/run-count wording and continuation constraints must not be left for separate sub-agents to resolve differently.

The public/local URL selection decision itself is accepted. The task contract should enumerate localhost/loopback/private/local-name cases and provide the override's concrete control/API and state lifetime; it should not silently introduce a persistent storage field. The no-code/QR notices, no automatic correction, optional printed answer tail and all five user decisions remain unchanged.

New scratch evidence:

- `signoff-rating-lengths.mjs` / `signoff-rating-lengths-results.json`: final-format corpus, eleven previous controls, validation and lengths.
- `signoff-verification.mjs` / `signoff-verification-results.json`: four golden vectors, independent catalogue, certificate/title/model-limit controls and integer-score enumeration.
- `signoff-score-precision.json`: 80-digit numeric confirmation.
- `signoff-tail.mjs` / `signoff-tail-results.json`: independent final-frame checks and 2,326 splices.
- `signoff-qr-lengths.json`: independent final-format QR sizes.
- `signoff-qr-goldens.json`, `signoff-qr-decoder-results.json`: matrices and five successful independent decodes.
- `signoff-jsqr.cjs`, `signoff-jsqr.LICENSE`: pinned, scratch-only decoder and licence.
- `signoff-prefix-check.json`: byte count/hash proving that this section was appended without changing the earlier verification.

**Working log:** 2026-10-25 18:16:14 UTC+07:00 → final append/validation time recorded below. Read the complete unified report and reference codec; reran previous controls, vectors and catalogue independently; exercised legal boundary inputs; checked QR sizes and decoded actual matrices with a pinned second implementation; derived the zero-bit integer-score mitigation; documented actionable findings.

**Incidents and chosen solutions:** no new dependency installation or server was needed. The reference's maximum-count and model-limit failures were retained as evidence rather than bypassed. jsQR was fetched only into scratch and run locally. Architect-1 was notified of the concrete major failures during the review. The unified report and peer files were not edited; the earlier portion of this verification is preserved.

**End:** 2026-10-25 18:38:43 UTC+07:00 — 22 minutes 29 seconds. Append-only preservation, UTF-8 without BOM, CRLF-only endings, no trailing whitespace, final newline and seven Markdown tables passed validation. All six historical reports remain unchanged and tracked repository files have no diff.

### Sign-off re-check

**Final verdict: Signed off.** The revised report and the subsequently corrected reference resolve S2-01 through S2-11. This is design sign-off, not a claim that the production feature or its physical print acceptance has already been implemented.

The first revision still allowed long-title drift. I rejected that exception and architect-1 removed it. The now-approved shared heading rule is:

- Absent/empty title: localized `Puzzle #n` / `Đề #n`.
- Existing suffix `#digits`: leave the title unchanged.
- More than 75 code points: leave it unchanged at **every** position, including the first.
- Otherwise append the one-based ordinal.

That fixed 75-code-point threshold reserves room for the largest ` #100` suffix. Testing only whether the particular current suffix overflows would not have been sufficient. The Generator prints this displayed heading, not its old `Puzzle #n` card heading. These visible changes must be included in the implementation tasks and living-spec updates.

**Independent re-check results:**

| Area | Evidence |
|---|---|
| Corpus | 79 puzzles, 73 complete stored v2 ratings, **316** raw/shortest core/full round-trip forms; valid packs, matching geometry, appearance identity and fingerprints |
| Count-only ratings | All 73 claims match. The 558–576-cell Hell cases pass. The valid 1,024-cell/128-piece case with **849,920 legal placement rows** now encodes and decodes without a solver workspace; its selected core was 30 symbols, version 2 |
| Existing escape controls | All **11** pass, including foreign/legacy metrics, `censored`, fractional and inconsistent claims |
| Revised repository vectors | All **4** raw strings in §5.12 reproduce exactly, including the changed titles of sample puzzles 2 and 3 |
| New edge vectors | All **4** maximum-title/certificate strings reproduce exactly; the maximum safe-integer certificate survives |
| Forced rebuild failure | The raw whole-claim escape golden reproduces exactly and retains the full claim |
| Compression | The published decode-only version-2 vector with seven inflated fill bits decodes correctly |
| Negative vectors | All **5** published checked-but-invalid strings are rejected: raw padding, extra inflated byte, inflated nonzero fill, outer nonzero fill and certificate overflow |
| Heading invariance | **60** EN/VI cases pass: positions 1, 2 and 100; absent/empty/custom/numbered titles; 75-, 76- and 80-code-point titles; astral Unicode at the boundary |
| Frozen score/level | The reference no longer imports live score/level/policy functions. Its frozen arrays match the independently verified values; all **640,128** legal `(U,B)` pairs agree |
| Pasted links | Five invalid index/mixed/repeated-key examples reject; `i=0` succeeds without discarding route validation |
| QR updates | Both changed sample-title vectors independently reproduce their new §5.12 matrix hashes; the unchanged first/last hashes retain the earlier independent decode evidence |

The count-only implementation is not a raised solver limit. It counts legal placements in canonical order, allocating neither an exact-cover model nor a search workspace. The whole-claim escape remains mandatory if the count/rebuild nevertheless fails. Score/level use the frozen integer tables; H retains the explicitly documented cross-engine last-bit qualification.

The report now separates outer 0–4-bit padding from inflated 0–7-bit fill, counts only explicitly stored runs, supports exact safe-integer EG fields, guards compact title numbers, specifies QR pins/test decoding, corrects ID/clue bounds, qualifies checksum guarantees and defines width-dependent layout/continuation. The local-target override is explicitly dialog-only; normal Copy link uses the default target policy.

The reference's remaining scope is now honestly stated: it is a Node wire-format/reference implementation, not the finished browser worker, correction UI, QR adapter or layout, and it does not implement every production input guard. Those are implementation-task acceptance requirements, not unresolved design decisions.

**Incident:** the first corpus re-check called `poseCells` with cells instead of its required Piece argument. That verifier-only mistake was corrected; the successful 316-form run above used the proper API. No production or peer file was changed.

**Re-check completed:** 2026-10-25 19:09:23 UTC+07:00. Implementation-task drafting continues against the corrected report.

# RP08 — Cross-app reconstruction acceptance and release evidence

| Header | Value |
|---|---|
| ID | RP08 |
| Depends on | RP01–RP06; RP07 if the optional CLI task is enabled |
| Estimated size | Large: approximately 800–1,400 test/evidence lines |
| Owner role | QA / cross-app release |
| Milestone | M6 — verified reconstruction feature |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§3–15; traceability only |
| Implementation status | Not started |

## Goal & business context

Demonstrate the complete user journey, not only an encoder round trip.
A selected puzzle is printed, its core is typed, and the same puzzle opens.
The QR opens the same full code with its stored answer when carried.
Existing game progress and legacy routes must remain safe.

The user requirements are:

- Exact authored board, holes/margins and angle.
- Exact ordered piece identities, RGB values and shapes.
- Exact original clue definition and remaining pieces.
- One selected puzzle, not a whole pack.
- Compact typeable code, reusable in a URL.
- Mandatory QR, except the explicitly approved extreme-capacity fallback.
- Printed optional answer tail, title/level/score preservation and seed-line removal.
- Copy this puzzle link in both apps.

## Scope

### In scope

- Automated end-to-end Generator/Player/Print/Copy acceptance.
- Fresh-profile portability and existing-progress restoration.
- EN/VI, light/dark/high-contrast, narrow and coarse-pointer coverage.
- Real print-sheet SVG/text/QR assertions.
- Independent QR decoding using the vendored test decoder.
- A documented physical print/scan matrix on Android and iPhone.
- Regression of pack/library/file imports and existing printing features.
- Release checklist and evidence handoff to the orchestrator.

### Out of scope

- Reimplementing or silently repairing another owner's runtime files.
- Changing generation, solver limits or calibration/qualification gates.
- Claiming hardware or public deployment tests that did not run.
- Updating historical docs or task execution logs as a developer.
- Committing, pushing or changing Pages settings.

## Repository rules

- Use existing Node/browser harness patterns and no new package dependency.
- Keep CSP unchanged and all automated requests local unless the orchestrator
  explicitly authorizes a deployment smoke.
- UTF-8 without BOM, CRLF, no trailing whitespace, final newline.
- Developers do not commit or push; the orchestrator verifies/commits each task.
- Acquire the documentation slot before living-doc/README corrections.
- Store generated evidence under `tests\artifacts\RP08\`, not OS temporary paths.
- Use only dedicated approved browser profiles and recorded owned PIDs.
- Report runtime defects to the owning RP task; do not concurrently edit its files.

## Inputs & context

### Accepted module seams

- `core/engine/puzzlecode.js`: encode/decode, frozen data, errors.
- `core/browser/puzzle-code-client.js`: worker-backed service.
- `core/engine/sharecode.js`: authoritative p/pack/lib hash parsing.
- `core/browser/handoff.js`: atomic incoming data path.
- `core/browser/puzzle-code-dialog.js`: explicit entry/correction/recovery.
- `core/browser/puzzle-title.js`: one shared displayed-heading rule.
- `core/browser/puzzle-snapshot.js`: immutable source and prepared share.
- `core/browser/qr.js`: explicit segments, M/L, physical QR dimensions.
- `core/browser/print-*`: the printed code band and continuation sheets.
- `core/browser/puzzle-copy.js`: selected-puzzle clipboard action.

The public worker data uses:

```ts
type Encoded = { C: string; T: string | null; F: string; version: 1 | 2 };
type Decoded = {
  pack: Pack;
  hasTail: boolean;
  tailError: null | 'tail-check' | 'tail-tag' | 'tail-invalid';
};
```

A tail error can return a validated core, but the UI opens nothing until confirmed.
Bad core input has no recoverable Pack.
A correction is also explicitly confirmed and decoded again.

### Comparison oracle

Compare these values with the selected source, not with another generated puzzle:

1. Board rows including dimensions and blocked margins.
2. Effective pre-print display angle.
3. Ordered pieces: IDs, labels, RGB bytes and normalized stored cell arrays.
4. Original clue IDs and occupied cells.
5. Derived pieces-to-place set.
6. Stored solution occupied cells when a tail is carried.
7. Complete rating and certificate claims under the stated H qualification.
8. Shared displayed heading, including source ordinal rules.
9. `progressFingerprint`.

Accepted normalisations are RGB hex case, symmetric pose notation and solution
array order. A custom public puzzle ID may be recomputed.
Do not compare only a public ID, title, score or thumbnail.
Do not compare current moved pieces to original clues.

The retained limits, errors and checked vectors below support independent QA
through the public codec API; RP01 alone owns the full wire specification.

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

## Inlined QA limits, errors and parity vectors

The codec remains RP01's responsibility. This retained contract is identical to
RP01; **RP01's copy is normative**. QA tests through its exported API and does not
maintain another bit-level implementation. Before dispatch, the orchestrator
diffs these retained limits/messages/vectors/oracle facts with RP01's copy.

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


## End-to-end business acceptance matrix

| ID | Scenario | Required observable result |
|---|---|---|
| BA01 | Generator selects one puzzle from several | Printed/decoded data contains only that puzzle |
| BA02 | First-sheet core copied in reading order | Player opens the selected board/pieces/clues |
| BA03 | Full C.T scanned/decoded | Same puzzle plus compatible stored answer |
| BA04 | Core alone | Same fingerprint; no invented answer; play allowed |
| BA05 | Piece identities beyond Z | Labels/RGB/order/pattern assignments match |
| BA06 | Custom IDs, Unicode labels and RGB | No generated-default relabelling |
| BA07 | Padded blocked border | Frame and shifted coordinates retained |
| BA08 | Irregular holes | Exact mask retained |
| BA09 | Player view rotated | Encoded angle equals current view |
| BA10 | Source has saved moves | Moves restored with explicit notice |
| BA11 | Replay after restoration | Starts at the printed clue definition |
| BA12 | One typo | Failure or confirmed candidate, never silent change |
| BA13 | Bad tail | Validated core offered only by explicit action |
| BA14 | Invalid p URL/index/mixed keys | Existing game/progress preserved |
| BA15 | Source changes during preparation | No stale print or copy |
| BA16 | Print options change | Same code, new layout only |
| BA17 | Local origin default | Configured public Player target |
| BA18 | Local dialog override | Explicit warning and dialog-only lifetime |
| BA19 | Public fork | Its own case-sensitive Player target retained |
| BA20 | M capacity exceeded | Tail dropped from both text/QR before trying L |
| BA21 | Neither QR capacity fits | No code/QR; notice before printing and on sheet |
| BA22 | Copy action in both apps | Same prepared default-target URL |
| BA23 | Clipboard denied | Safe manual-copy alternative |
| BA24 | Puzzle seed printed previously | Removed; known level/score/set line retained |
| BA25 | Player has stored answer | Tail carried but no solution-sheet permission added |
| BA26 | Untitled source at later index | Puzzle #n / Đề #n remains exact |
| BA27 | Long unnumbered title | No auto-ordinal above75 code points at any position |
| BA28 | Existing #pack/#lib/file import | Behaviour unchanged |
| BA29 | Missing browser codec/worker capability | Honest error; no hidden main-thread fallback |
| BA30 | Physical print and phone scan | Correct puzzle opens at 100% print scale |

## Headings and localisation

Verify the shared function in both applications:

- Empty/absent -> localized Puzzle #n / Đề #n.
- Existing #digits suffix -> unchanged.
- More than75 code points -> unchanged at every index.
- Otherwise -> title plus source ordinal.

Test75/76/80 code points, including astral Unicode, at positions1/2/100.
The Generator's sheet uses the displayed title, e.g. Hard #3, not Puzzle #3.
The card heading may retain its separate compact UI convention.

Verify all code/error/target/continuation/clipboard texts in EN and VI.
Check actual interpolation, not only presence of translation keys.
Check screen-reader labels, alert/status semantics and focus return.
A Vietnamese-speaking reviewer verifies the final Vietnamese text before release;
record that human check separately from automated key-presence tests.

## Print and QR acceptance

For every existing size option, piece/board selection, duplex and solution choice:

- Page is A4 210x297 mm.
- Content uses the existing10 mm margins.
- Piece and board cell sizes remain equal.
- Existing50 mm scale bar remains correct.
- Code/heading/QR/preview bounds do not overlap.
- First-sheet preview reserve is at least120 mm.
- Core groups stay intact and reading order reconstructs exact C/F.
- Tail dot and optional label are present when carried.
- Mirrored backs have no QR/code.
- Continuations preserve all symbols and duplex blank backs.
- Solution page keeps its own40 mm top without a phantom code band.

Verify QR module/quiet-zone formula:

```text
N = 17 + 4*version
outerModules = N + 8
sideMm = max(25, outerModules*0.5)
```

Real cases include version5, version11 and an injected version40 layout.
A version40 box is92.5 mm; the text column must adapt rather than overlap it.
Compare SVG row-run rasterization with the source matrix.
Use opaque white background and black modules.
Test dark/high-contrast surroundings without inversion or a damaged quiet zone.

Use pinned jsQR from `tests/vendor/jsqr.cjs` only in Node acceptance helpers.
Rasterize at four pixels/module with four white quiet-zone modules.
Decoded text must equal the complete URL, preserving prefix case.
No external decoding service is allowed.

## Files to create/modify

Create/modify only QA-owned files:

- `tests/puzzlecode-acceptance.test.js`
- `tests/browser/puzzle-code-acceptance.html`
- `tests/browser/puzzle-code-acceptance.js`
- QA-owned fixtures under `tests/fixtures/` if not already supplied by RP01/RP04
- Final living-doc/README corrections through the documentation slot

Do not edit another task's runtime files to make a test pass.
Return a minimal reproducible defect to that owner and rerun after its fix.
Do not alter `docs/calibration/`, `docs/init-design/`, `docs/regenerate-puzzle/`
or `tasks/init-design/`.
The orchestrator fills this pack's execution logs/checklist after verification.

## Implementation steps

1. Confirm required tasks are accepted and optional RP07 is accepted or deferred.
2. Freeze the tested runtime while collecting integrated evidence.
3. Add value-based source/decoded comparison helpers.
4. Add Node acceptance using existing fixtures and the supplied goldens.
5. Add browser flows using the real apps, workers and print dialog.
6. Stub `window.print` to inspect generated pages in automated tests.
7. Decode rendered QR data locally and open the same hash on the local Player.
8. Verify portability in a fresh test profile, not merely another same-storage iframe.
9. Verify restored progress in a separate deliberate same-profile case.
10. Exercise errors, cancellation, source revisions and capability failures.
11. Run the theme/locale/viewport matrix.
12. Run all legacy browser harnesses affected by the feature.
13. Collect physical print/phone evidence with the user/operator.
14. Reopen owner defects rather than weakening tests.
15. Update living docs/README to describe the actually shipped feature.
16. Hand off the release checklist and evidence, without committing or deploying.

## Acceptance criteria — Business

- **RP08-B01:** BA01–BA30 pass or their unavailable physical gate is explicitly blocked.
- **RP08-B02:** No generated history or local library is needed for a portable code.
- **RP08-B03:** Paper text, QR and copied URL represent the same selected puzzle.
- **RP08-B04:** Invalid input cannot erase progress/current gameplay.
- **RP08-B05:** User-confirmed defaults Q1–Q5 are visible and tested.
- **RP08-B06:** No unavailable phone/printer result is reported as a pass.

## Acceptance criteria — Technical

- **RP08-T01:** Full Node suite and repository checks pass.
- **RP08-T02:** New browser harnesses report pass through CDP.
- **RP08-T03:** Existing Player/Generator/Print harnesses remain green.
- **RP08-T04:** No unexpected console, CSP or failed local-network event occurs.
- **RP08-T05:** No runtime npm/CDN dependency or schema migration was added.
- **RP08-T06:** The deployed build graph excludes test-only jsQR.
- **RP08-T07:** Data comparisons cover all identity/presentation fields, not just FP.
- **RP08-T08:** Frozen catalogue, score/level, checksum and QR pins pass.
- **RP08-T09:** No main-thread cold catalogue or solver was introduced.
- **RP08-T10:** Evidence names the tested revision, environment and exact commands.

## Test plan

### Exact validation commands

```powershell
node --test .\tests\puzzlecode-acceptance.test.js
```

Run the owned-file convention check in `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.

If optional RP07 is enabled, run its documented CLI smoke and parity harness too.
Do not add npm packages to execute the acceptance suite.

Legacy browser paths to rerun under the local prefix:

```text
tests/browser/print.html
tests/browser/player-load.html
tests/browser/player-controls.html
tests/browser/generator-flow.html
tests/browser/rendering.html
```

New paths:

```text
tests/browser/puzzle-qr.html
tests/browser/puzzle-code-worker.html
tests/browser/puzzle-code-entry.html
tests/browser/puzzle-code-print.html
tests/browser/puzzle-code-copy.html
tests/browser/puzzle-code-acceptance.html
```

Use at least1280px and390px viewports.
Exercise light/dark/high-contrast, both languages and a coarse-pointer mode.
Record which cases are real hardware versus CDP emulation.
An emulated mobile viewport is not Android/iPhone scan evidence.

## Physical release matrix

Use 100% / Actual size, not printer-driver fit/shrink.
Print on two printers and inspect the50 mm scale bar.
Scan with real Android and iPhone cameras.
Use a source reachable by the phone: an orchestrator-approved candidate deployment
or a permitted LAN server opened through its actual LAN address with explicit
local-target override. Do not print a loopback QR and claim phone portability.
Do not open firewall access, push, deploy or change Pages settings without authorization.

| Print case | Printer A | Printer B | Android | iPhone | Required comparison |
|---|---|---|---|---|---|
| 6x10 core plus tail | Pending | Pending | Pending | Pending | Exact title/board/set/clues/answer |
| 576-cell Hell with tail | Pending | Pending | Pending | Pending | Identity, readability, QR and scale |
| Longest actual printable code | Pending | Pending | Pending | Pending | Quiet zone, continuation and correct URL |

Also type at least one core manually from the paper, including a deliberate typo.
Record the physical sheet/photo, phone/browser versions, destination and result.
Do not upload puzzle images or evidence to a third-party service.
If hardware or a reachable candidate is unavailable, mark physical acceptance
blocked and report exactly what remains. Automation may be complete; release
sign-off must not silently treat that as physical completion.

## Release checklist

- All required RP task handoffs accepted.
- Optional CLI explicitly accepted or deferred.
- All Node and browser commands recorded and passing.
- Fresh-profile portability and deliberate progress restoration both demonstrated.
- All visible text/heading changes documented in both living specs.
- README features/commands match reality.
- No historical source/review/calibration/task files modified by developers.
- No dependency or storage-format change outside the approved design.
- Vendor source/adaptation/license hashes recorded.
- Only app assets enter the deployed graph; test decoder is excluded.
- Physical matrix completed or an explicit release blocker retained.
- Public target/version smoke performed only with orchestrator authorization.
- Owner defects closed and integrated tests rerun.
- Orchestrator receives evidence and makes the acceptance/commit decision.

### Exact serving and CDP procedure

Use only `check-list.md` Section7 for the executable, fixed ports, disposable
profile, server command, native CDP runner and owned-PID/profile cleanup.
RP08's harness is `tests/browser/puzzle-code-acceptance.html`.
Save verdict, summary and browser/error evidence under `tests\artifacts\RP08\`.

## Definition of done & handoff

### Reproducible cross-app journey

Use an original sample and the 243-character large oracle as separate journeys.
The small sample makes title/order/angle comparisons easy to inspect.
The large oracle covers a genuinely difficult answer-bearing puzzle.
Do not call a successful decode alone an end-to-end print acceptance.

1. Select one source puzzle with another puzzle also present in the source pack.
2. Record the selected snapshot, heading and effective display angle.
3. Open Print and wait for preparation to settle.
4. Extract the visible core and labelled optional tail in reading order.
5. Remove only printed grouping whitespace and join C.T when a tail is printed.
6. Require equality with the carried F, not a newly encoded substitute.
7. Independently decode the QR to obtain its literal complete URL.
8. Require that URL to carry exactly the same F and expected target.
9. Open a fresh allocated profile with no source pack/library data.
10. Enter the core by the Player's actual code-entry UI.
11. Compare board cells/margins, ordered pieces, clues, angle and heading.
12. Require one puzzle only; the neighbour must not appear.
13. Verify the level/score presentation and absent-answer behaviour.
14. Replay/reset as appropriate without substituting a source seed.
15. Enter the full C.T through the same UI.
16. Require the stored answer to validate against those original clues.
17. Open the scanned URL and compare the same original snapshot.
18. Save evidence for both entry paths and their fingerprints.

Run a separate same-profile progress journey:

1. Make at least one legitimate move and persist progress.
2. Reopen an equivalent core and verify the explicit restoration notice.
3. Reopen its full code and require the same progress fingerprint.
4. Choose Replay and verify the explicit reset path.
5. Confirm no move, elapsed time or progress field was encoded in F.
6. Repeat a failed load and verify it leaves current gameplay unchanged.

Run a cancellation/stale-source journey:

1. Begin preparation or entry for puzzle A.
2. Change to puzzle B or close the owning dialog before completion.
3. Resolve A's delayed operation through the controlled test seam.
4. Require no stale print, clipboard success, route update or gameplay commit.
5. Require every owned worker/dialog to settle or be disposed before pass.

### Physical evidence is a separate release gate

Record each printer, paper size, scaling option and measured scale-bar result.
Record Android and iPhone model/OS/browser plus the tested sheet identifier.
Use the printed sheet, not a screenshot displayed on another monitor.
Check the quiet zone, visible group order, QR position and optional-tail label.
Scan the actual QR and record the URL target before opening it.
Compare the loaded puzzle with the recorded source snapshot.
Test a new device/browser state without the source library entry.
Report a failed scan or unavailable device explicitly.
No automated harness can mark this gate passed on behalf of a physical scan.

If a required device or printer is unavailable:

1. Finish and report the automated acceptance independently.
2. Leave the relevant physical checkbox unchecked.
3. State the remaining device/printer requirement in the final handoff.
4. Keep the release verdict blocked rather than weakening the requirement.

Before dispatch, the orchestrator diffs retained limits, messages, vectors and
oracle facts against RP01. Runtime fixes are returned to the owning task;
QA may not change expected constants just to make an implementation pass.

Return a compact evidence index with commands/results, browser versions,
fixture/source fingerprints, screenshots/matrix checks, manual outcomes and defects.
Separate pass/fail/blocked; never combine missing evidence into a green total.
The developer does not edit task execution logs or commit/push/deploy.
The orchestrator records acceptance and the commit after independent verification.

If physical evidence is blocked, report “automated complete; release blocked”
with the exact remaining operator steps. Do not claim this task is fully done.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |

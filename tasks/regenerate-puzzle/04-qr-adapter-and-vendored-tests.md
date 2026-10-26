# RP04 — Local QR encoder, SVG geometry and independent decoding tests

| Header | Value |
|---|---|
| ID | RP04 |
| Depends on | None; the supplied strings are opaque QR payloads |
| Estimated size | Medium: approximately 900–1,400 implementation/test lines |
| Owner role | Browser infrastructure / QR |
| Milestone | M1 — independently testable transfer primitives |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§5.12, 6–7, 12–13; traceability only |
| Implementation status | Not started |

## Goal & business context

A phone camera must open exactly the puzzle represented by the printed code.
The QR is generated locally.
No puzzle, code, URL or image may be uploaded to a QR service.
The existing application has no build step and no npm dependencies.
This task supplies a small browser-facing adapter around a pinned local encoder.
It also supplies an independent test decoder used only by Node tests.

The visible code remains important.
QR availability does not authorize dropping the typeable code.
The print owner decides whether the full code or its independently valid core fits.
This adapter reports capacity honestly and never silently changes the payload.

The user confirmed these defaults on 2026-10-25 at 17:50:

- Print the optional solution tail as labelled, smaller text.
- Put the same core-plus-tail code in the QR and URL.
- Preserve the displayed title, level and score.
- Drop the misleading puzzle seed from the printed detail lines.
- Keep the level/score and piece-set line.
- Add “Copy this puzzle link” in both applications.
- For exceptional content, try the shorter representation, then omit the tail,
  then use QR error correction L, then omit code and QR with explicit notices.

This task does not implement that policy ladder.
It makes the ladder possible without guessing QR capacity from character counts.

## Scope

### In scope

- A pinned MIT-licensed Nayuki encoder as a local ES module.
- An explicit byte-plus-alphanumeric segmentation adapter.
- Exact matrix, version, error-correction and quiet-zone metadata.
- A compact SVG row-run path helper.
- Matrix golden tests.
- Independent local decoding with pinned jsQR 1.4.0.
- Tests of the exported adapter in Node and a strict-CSP browser harness.
- Related updates to the living specifications and README when applicable.

### Out of scope

- Puzzle-code bit packing, checksums, compression and correction.
- Pack parsing or generation.
- Choosing a public versus local Player destination.
- Reading application state.
- The print dialog, pagination and first-sheet layout.
- Clipboard buttons.
- Writing a QR encoder from scratch.
- A runtime npm package or CDN script.
- Fetching a pasted URL.
- Claiming physical print acceptance from an automated matrix test.

## Repository rules

- Implement in native ES modules with `// @ts-check` and JSDoc.
- Browser modules use `.js`, not `.mjs`.
- Keep the strict existing CSP unchanged.
- Do not add inline scripts, event attributes or style attributes.
- Use safe SVG presentation attributes and `textContent`.
- Never use `eval`, `new Function` or untrusted `innerHTML`.
- Add no npm runtime or development dependency.
- Preserve licence notices in both vendored libraries.
- New/modified authored text is UTF-8 without BOM and CRLF throughout.
- No trailing whitespace; terminate every text file with a newline.
- Do not reformat unrelated files.
- Do not edit `docs/init-design/`, `docs/calibration/`,
  `docs/regenerate-puzzle/` or `tasks/init-design/`.
- Do not edit this task document while implementing it.
- Do not commit, stage, reset, stash, push or change branches.
- The orchestrator verifies and commits once per accepted task.
- Update both living specifications in the same change as behaviour changes.
- Documentation is a single-writer resource; acquire the orchestrator's
  documentation slot before editing either living specification or README.
- While another task holds that slot, continue only in exclusively owned files.
- Stop only processes that this task started, by recorded PID.
- Do not use OS temporary directories for files or browser profiles.

## Inputs & context

### Transfer terminology

`C` is the complete independently valid core.
`T` is an optional solution component.
`F` is `C` when no tail is included, otherwise `C + "." + T`.
The QR adapter treats these as opaque data.
It must not parse, repair, inflate or re-encode them.

The puzzle-code alphabet is:

```text
0123456789ABCDEFGHJKMNPQRSTVWXYZ
```

The output code is uppercase and ungrouped.
The dot separating C and T is part of the QR alphanumeric character set.
The print UI may display spaces between groups of four.
Those display spaces are not included in the QR payload.

The adapter accepts only canonical output supplied by the transfer producer.
Manual-entry normalisation belongs to the codec/entry tasks.
In particular, this adapter does not turn `O` into `0`.
It does not strip hyphens from a URL.
It must never uppercase the URL prefix.

### Destination and segmentation

The standard deployed Player directory is:

```text
https://tdat00.github.io/pentomino/player/
```

The standard URL prefix is exactly:

```text
https://tdat00.github.io/pentomino/player/#p=
```

That prefix is 45 ASCII bytes.
Its path is case-sensitive.
The QR must use two explicit segments:

1. Byte segment containing the UTF-8 bytes of `urlPrefix`.
2. Alphanumeric segment containing the canonical `code`.

Do not ask the library to infer a segmentation for the whole URL.
Do not change the prefix to uppercase to obtain alphanumeric mode.
Do not put just the bare puzzle code in the QR.
A phone camera should navigate without requiring a separate code-entry step.

The caller supplies the selected destination.
The caller is responsible for constructing a prefix ending in `#p=`.
A public fork can have a different hostname or path.
The adapter must use the supplied prefix verbatim.
Measure UTF-8 byte length, not an assumed 45-character universal prefix.

### Error correction and dimensions

The default requested error correction is M.
L is allowed only when explicitly requested by the caller's oversize policy.
Do not automatically boost M to Q or H.
Automatic boosting would make recorded settings and capacity tests misleading.

For QR version `v`:

```text
modules = 17 + 4*v
quietModules = 4
outerModules = modules + 2*quietModules
minimumModuleMm = 0.5
minimumOuterMm = 25
outerMm = max(minimumOuterMm, outerModules*minimumModuleMm)
moduleMm = outerMm / outerModules
```

`moduleMm` must be at least 0.5.
The quiet zone must be at least four modules on every edge.
The 25 mm minimum enlarges small symbols; it never shrinks large ones.

Examples:

| Version | Data modules | Outer modules | Minimum computed side | Required side |
|---:|---:|---:|---:|---:|
| 5 | 37 | 45 | 22.5 mm | 25 mm |
| 6 | 41 | 49 | 24.5 mm | 25 mm |
| 10 | 57 | 65 | 32.5 mm | 32.5 mm |
| 11 | 61 | 69 | 34.5 mm | 34.5 mm |
| 15 | 77 | 85 | 42.5 mm | 42.5 mm |
| 40 | 177 | 185 | 92.5 mm | 92.5 mm |

The adapter chooses the smallest version that fits at the requested EC level.
Search versions 1 through 40.
Use automatic mask selection.
Do not reduce module size to conceal an oversized symbol.

### Owned public API

Create `core/browser/qr.js` with this public contract:

```ts
type QrEc = 'M' | 'L';

type PuzzleQrInput = {
  urlPrefix: string;
  code: string;
  ec?: QrEc;
};

type PuzzleQrMatrix = {
  url: string;
  code: string;
  urlPrefix: string;
  ec: QrEc;
  version: number;
  modules: number;
  quietModules: 4;
  outerModules: number;
  outerMm: number;
  moduleMm: number;
  rows: Uint8Array[];
};

type QrFailure = {
  ok: false;
  code: 'qr-invalid-input' | 'qr-too-long';
  message: string;
};

type QrResult =
  | { ok: true; value: PuzzleQrMatrix }
  | QrFailure;

function makePuzzleQr(input: PuzzleQrInput): QrResult;

function qrRowRunPath(
  rows: ReadonlyArray<ArrayLike<number>>
): string;
```

`rows[y][x]` is exactly 0 or 1.
The array contains data modules only, not the quiet zone.
`rows.length === modules`.
Every row length equals `modules`.
The result owns its arrays; callers must not mutate them.

`makePuzzleQr` is synchronous and pure with respect to DOM/application state.
It performs no network, storage or clipboard operation.
It does not cache a result under a mutable application object.
The caller may cache the immutable transfer preparation result.

The input code must be nonempty.
It must match the canonical alphabet with at most one nonempty tail:

```text
^[0-9A-HJKMNP-TV-Z]+(?:\.[0-9A-HJKMNP-TV-Z]+)?$
```

Reject an empty component, lower-case input, display grouping and extra dots.
This is producer validation, not the permissive manual-entry parser.
Reject an empty URL prefix or a prefix not ending in `#p=`.
Reject an EC value other than M or L.
Validate ordinary input before calling the vendor.

Return `qr-too-long` only when a valid input cannot fit version 40.
Do not catch every programmer exception and mislabel it as capacity failure.
Vendor capacity failure is expected and must not escape through the UI.

### SVG geometry contract

`qrRowRunPath` returns path data in data-module coordinates.
For each row, merge consecutive black modules into one horizontal rectangle.
Use integer coordinates and widths.
Do not create one SVG element per module.

Example matrix:

```text
110
011
000
```

An acceptable equivalent path is:

```text
M0 0h2v1h-2zM1 1h2v1h-2z
```

Ordering is row-major.
No rectangle may extend beyond the matrix.
Do not merge white gaps.
An all-white valid square returns an empty path string.
Malformed/ragged matrices throw a caller-error `RangeError`.

The print owner will render:

```xml
<svg viewBox="0 0 OUTER OUTER" width="MMmm" height="MMmm">
  <rect x="0" y="0" width="OUTER" height="OUTER" fill="#fff"/>
  <path transform="translate(4 4)" d="DATA_PATH" fill="#000"/>
</svg>
```

The concrete integration may use an equivalent translated/scaled group.
The white background must be opaque.
No stroke expands the black modules.
Do not inherit a dark theme's background or foreground.
Do not mirror or invert the QR.
Keep the quiet zone inside the reserved physical box.

## Vendoring instructions

### Runtime encoder

Create:

```text
core/browser/vendor/qrcodegen.js
core/browser/vendor/qrcodegen.LICENSE
```

Source:

```text
https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js
```

The expected upstream source is 45,350 bytes.
Its SHA-256 is:

```text
2511bc17f40a3c41d4a0578995db956b38997334d3d20113a5d4dc5c49c69480
```

Download only this public source.
Check the upstream digest before adapting it.
If it differs, stop and ask the orchestrator for the pinned source artifact.
Do not silently vendor a newer revision.

Keep all upstream MIT copyright and permission notices.
Copy the MIT notice into the adjacent licence file as well.
The only JavaScript adaptation is:

1. Decode UTF-8 without adding a BOM.
2. Normalize line endings to CRLF.
3. Remove spaces and tabs at the end of every line. For the pinned upstream
   file these are exactly lines 52, 640, 644, 790 and 816, all parameter lists.
4. Preserve the source's existing final newline.
5. Append exactly a blank line and `export { qrcodegen };`.
6. End that export line with CRLF.

The appended bytes are:

```text
\r\nexport { qrcodegen };\r\n
```

The clean adapted CRLF file is 46,207 bytes.
Its informative Windows-checkout SHA-256 is:

```text
c5b15113a4ec416ba65d1a75acd664d74d8f187a081c46bb622590bef2f971c2
```

For the portable provenance assertion, replace CRLF by LF before hashing.
The LF-canonical adapted module is 45,368 bytes and has SHA-256:

```text
68453133c5cffbaebe89cdfba48f1bb0918535335bae75adfbdbfde2a8b318f5
```

This LF-canonical digest is normative for tests on Windows and Linux.
CI uses an LF checkout under `* text=auto` and runs every Node test, including
tests named `slow`, on Node 22. Do not compare CI file bytes to the CRLF digest.
Do not strip whitespace in the provenance test: the committed adapted source
itself must already be whitespace-clean. Only CRLF-to-LF normalization is allowed.

Keep provenance in the licence file or an authored test comment.
Do not add another comment to the pinned JavaScript and then expect that hash.
The adapter imports the named `qrcodegen` export.
It uses the vendor's `QrCode` and `QrSegment` APIs.

The relevant call shape is:

```js
const segments = [
  qrcodegen.QrSegment.makeBytes(new TextEncoder().encode(urlPrefix)),
  qrcodegen.QrSegment.makeAlphanumeric(code),
];

const matrix = qrcodegen.QrCode.encodeSegments(
  segments,
  ec === 'M'
    ? qrcodegen.QrCode.Ecc.MEDIUM
    : qrcodegen.QrCode.Ecc.LOW,
  1,
  40,
  -1,
  false,
);
```

The last argument disables EC boosting.
The `-1` selects automatic mask choice.
Copy modules using `matrix.getModule(x, y)`.
Read `matrix.version` and `matrix.size`.

### Independent test decoder

Create:

```text
tests/vendor/jsqr.cjs
tests/vendor/jsqr.LICENSE
```

Bundle:

```text
https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
```

Licence:

```text
https://cdn.jsdelivr.net/npm/jsqr@1.4.0/LICENSE
```

The upstream bundle is 256,885 bytes.
Its SHA-256 is:

```text
bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859
```

The upstream licence is 11,358 bytes.
Its SHA-256 is:

```text
c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08
```

jsQR 1.4.0 is Apache-2.0 licensed.
Preserve the licence and all embedded notices.
Keep any applicable upstream NOTICE material.
Mark a line-ending-only adaptation in an adjacent authored provenance comment.
Do not remove copyright comments to reduce file size.

Check the upstream hashes before line-ending normalization.
The test can compare canonical LF bytes with the upstream digest.
Document that comparison explicitly.
Do not pretend a CRLF-adapted byte stream has the original upstream digest.

Use Node's built-in loader:

```js
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jsQR = require('./vendor/jsqr.cjs');
```

No `npm install` is required.
Do not import this decoder from `core/`, `generator/` or `player/`.
The release site scanner excludes tests from the deployed application graph.

## Golden QR payloads and matrices

All following payloads use the exact 45-byte standard prefix.
They are test data, not instructions to reimplement the puzzle codec.

```text
G1:
1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE

G2:
1D2KTH4A0GXPKPP0VSJR425KR0JJR03GKGJ0N2.1AR9VWV

G3:
1DESV14A0GXPKPP0VSJR425KR0EKJ97PGQXMQ.19M0GDB

G4:
16YHBRC5PQ0V3528M12FADS1D5515TBQVC9BBY1Y8N835B4XSNGJ9NH.1439213K5

G5:
1EG2H6A2XE0BZ5TNBYPNFBYQNTVVZF57XNJS67YWYDKZEENH7XSVS3YYTDFKZT7YYTE3YWYEFVS9N3YYC3VDDZ6QXSSSZF73DNQQQXHQFXSHRVZJNYFN0ZTTR5NWKD7XRAJFKYZVKBYYVYTS1ZFA1ZD61TTFMFA3JZKFFKEFSWNQT54VV9ZQ7TPG5ZE28JPP62C5PNNABSE2CX0BYKZ.14ZDJDYJYM30V6MX43A5AWCJY447TZG
```

For a matrix hash:

1. Convert each data-module row to ASCII `0` and `1`.
2. Join rows with LF.
3. Do not add a final LF.
4. Hash the resulting UTF-8/ASCII bytes with SHA-256.
5. Do not include the quiet zone in this matrix hash.

Expected results with EC M, explicit segments and automatic mask:

| Golden | Version | Modules | Matrix SHA-256 |
|---|---:|---:|---|
| G1 | 5 | 37 | `8fd29495b33327d2b34f1c5b0b2554b832bb25d199f12ad21666959a823b0c42` |
| G2 | 5 | 37 | `6ca966be5185d6731a4631313c86e06a9445ff187995e62a012320cda64efbc4` |
| G3 | 5 | 37 | `fcfb568e43da12bdfdeeab914a4bd80ffa91140536ef7ee1db947c9ea40426c6` |
| G4 | 6 | 41 | `bd4069185f71651f1481a73f68bffd5e532aa48980edee7131ba953b8e50974e` |
| G5 | 11 | 61 | `7cd76340de36049de81dd86e02614cca72abd3eac9672d0160e5daeb90ed05b7` |

The adapter must reproduce these hashes.
A hash mismatch is not waived merely because jsQR can decode the result.
First check segmentation, EC boosting, case and the pinned encoder revision.

### Independent decode procedure

Rasterize locally.
Use four pixels per module.
Add four white quiet-zone modules to every side.
Use opaque RGBA bytes.
White is `[255,255,255,255]`.
Black is `[0,0,0,255]`.

Equivalent test helper:

```js
function rasterize(rows) {
  const scale = 4;
  const quiet = 4;
  const size = rows.length;
  const side = (size + quiet * 2) * scale;
  const data = new Uint8ClampedArray(side * side * 4);
  data.fill(255);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (rows[y][x] !== 1) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const xx = (x + quiet) * scale + dx;
          const yy = (y + quiet) * scale + dy;
          const at = (yy * side + xx) * 4;
          data[at] = 0;
          data[at + 1] = 0;
          data[at + 2] = 0;
        }
      }
    }
  }
  return { data, side };
}
```

Call:

```js
const image = rasterize(result.value.rows);
const decoded = jsQR(image.data, image.side, image.side, {
  inversionAttempts: 'dontInvert',
});
assert.ok(decoded);
assert.equal(decoded.data, urlPrefix + code);
```

Also rasterize the row-run path geometry independently.
Compare that raster with the source matrix.
This catches a correct matrix paired with a broken SVG path helper.

## Files to create/modify

### Exclusive implementation ownership

- `core/browser/vendor/qrcodegen.js`
- `core/browser/vendor/qrcodegen.LICENSE`
- `core/browser/qr.js`
- `tests/vendor/jsqr.cjs`
- `tests/vendor/jsqr.LICENSE`
- `tests/qr.test.js`
- `tests/browser/puzzle-qr.html`
- `tests/browser/puzzle-qr.js`

Do not modify the Player app, Generator app, codec or print modules.
RP05 imports this API after RP04 is accepted.
RP08 extends acceptance coverage in separate files.

### Serialized documentation ownership

Acquire the documentation slot and update:

- `docs/design-brief.md`: QR generated locally; no external service.
- `docs/design-detail.md`: QR segmentation, EC, dimensions and vendored modules
  in the printing and strict-CSP sections.
- `README.md`: only if a user-visible feature/command description would
  otherwise become inaccurate; do not advertise the unintegrated print UI.

Describe the current shipped state.
Do not say the first sheet contains a QR until RP05 actually integrates it.

## Implementation steps

1. Read the existing browser-module/style conventions in owned neighbours.
2. Confirm there are still no npm dependencies.
3. Fetch and verify the two pinned public sources and their licences.
4. Adapt Nayuki exactly as specified.
5. Keep jsQR test-only.
6. Implement input validation before the vendor call.
7. Construct explicit segments.
8. Select M or L exactly as requested.
9. Disable EC boosting.
10. Convert the vendor matrix to owned typed-array rows.
11. Calculate physical dimensions from the actual version.
12. Implement compact row-run paths.
13. Add matrix hash tests.
14. Add independent decoding tests.
15. Add the strict-CSP browser harness.
16. Run targeted Node tests before the repository-wide quick suite.
17. Run the browser harness through CDP.
18. Update the living specifications in the documentation slot.
19. Run repository checks on the combined working tree.
20. Hand off the API and evidence without committing.

## Acceptance criteria — Business

- **RP04-B01:** A standard QR decodes to the complete Player URL.
- **RP04-B02:** Prefix path case is unchanged.
- **RP04-B03:** The code in the URL is exactly the producer's code.
- **RP04-B04:** No QR service receives puzzle information.
- **RP04-B05:** Small QRs occupy at least 25 mm.
- **RP04-B06:** Large QRs retain at least 0.5 mm per module.
- **RP04-B07:** Capacity failure is honest and actionable.
- **RP04-B08:** The adapter never removes a solution tail itself.
- **RP04-B09:** The quiet zone remains white in dark/high-contrast UI.
- **RP04-B10:** A second implementation reads all golden QR URLs exactly.

## Acceptance criteria — Technical

- **RP04-T01:** All five matrix hashes match.
- **RP04-T02:** All five independent decoding tests pass.
- **RP04-T03:** Provenance tests hash CRLF-to-LF-normalized content: encoder
  `68453133c5cffbaebe89cdfba48f1bb0918535335bae75adfbdbfde2a8b318f5`
  (45,368 bytes) and jsQR
  `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`.
  The encoder's CRLF digest is informative only; Node 22 CI runs all tests.
- **RP04-T04:** No package or lockfile change is introduced.
- **RP04-T05:** Browser entry graphs contain no jsQR import.
- **RP04-T06:** Matrix rows contain only zero/one values.
- **RP04-T07:** Physical dimensions follow the formula for every version.
- **RP04-T08:** Empty, grouped, lower-case and malformed producer inputs fail.
- **RP04-T09:** A valid payload exceeding version 40 returns `qr-too-long`.
- **RP04-T10:** Explicit M never becomes Q/H.
- **RP04-T11:** Explicit L remains L.
- **RP04-T12:** Row-run rasterization exactly matches the matrix.
- **RP04-T13:** Ragged matrices fail before generating SVG path data.
- **RP04-T14:** No unsafe DOM/string execution is introduced.
- **RP04-T15:** `npm run check` passes.
- **RP04-T16:** `npm run test:quick` passes.

## Test plan

### Node commands

Run from repository root:

```powershell
node --test .\tests\qr.test.js
```

Run the owned-file convention check in `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.
The pinned test-only `.cjs` payload keeps upstream formatting; its provenance
test, not an authored-`.js` formatter, validates it. Runtime QR `.js` is checked.

Do not add a new test runner.
Use `node:test` and `node:assert/strict`.

### Node test matrix

| Case | Assertion |
|---|---|
| Five supplied goldens | Exact matrix hash and decoded URL |
| Prefix with mixed-case path | Byte-for-byte path preservation |
| Public fork prefix | Correct supplied prefix, no upstream hard-coding |
| Longer prefix | Capacity/version computed from actual bytes |
| Bare core | No dot or answer added |
| Core plus tail | Dot and full tail preserved |
| Empty core | `qr-invalid-input` |
| Trailing dot | `qr-invalid-input` |
| Two dots | `qr-invalid-input` |
| Lower-case code | `qr-invalid-input` |
| Grouping spaces | `qr-invalid-input` |
| `U`, `I`, `O`, `L` in canonical code | `qr-invalid-input` |
| Unsupported EC | `qr-invalid-input` |
| Too-large valid alphanumeric input | `qr-too-long` |
| M versus L | Requested EC retained |
| Version 5 dimensions | 25 mm outer box |
| Version 11 dimensions | 34.5 mm outer box |
| Version 40 dimensions | 92.5 mm outer box |
| White-only square | Empty path |
| One black run | Correct x/y/width |
| Two separated runs | White gap preserved |
| Last row/column | No out-of-bounds rectangle |
| Ragged matrix | Caller-error rejection |

### Browser harness

Create `tests/browser/puzzle-qr.html`.
Use the same CSP as the existing browser harnesses:

```text
default-src 'self'; script-src 'self'; worker-src 'self';
style-src 'self'; img-src 'self' data: blob:; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'none'
```

Load `puzzle-qr.js` through an external module script.
Use existing shared styles or a separately owned stylesheet only if needed.
Do not place JavaScript or style blocks in the HTML.

The harness must:

1. Set `<html data-result="running">` at startup.
2. Render a visible ordered list of cases.
3. Record security-policy violations.
4. Run the five matrix tests in the browser.
5. Render a white-background SVG with the row-run path.
6. Check the actual millimetre geometry using `getBoundingClientRect`.
7. Test both ordinary and dark/high-contrast surrounding containers.
8. Set `data-result="pass"` only after every automated case passes.
9. Set `data-result="fail"` on an assertion or uncaught failure.
10. Put a concise result in `data-summary`.

Do not set pass before asynchronous work finishes.
Do not hide failures in a console-only message.

### Exact serving and CDP procedure

Use only `check-list.md` Section7 for the executable, fixed ports, disposable
profile, server command, native CDP runner and owned-PID/profile cleanup.
RP04's harness is `tests/browser/puzzle-qr.html`.
Save verdict, summary and browser/error evidence under `tests\artifacts\RP04\`.
## Definition of done & handoff

RP04 is done only when:

- Every business and technical acceptance item has evidence.
- The pinned modules and notices are present at the owned paths.
- The matrix/path adapter is independent of application state.
- All targeted and required combined checks pass.
- The strict-CSP browser harness reports pass through CDP.
- No test-only decoder enters the browser application graph.
- Living specification changes describe the actual implemented primitive.
- The orchestrator has received file ownership and API details.
- No implementation commit has been made by this developer.

Handoff to RP05 includes:

- Exported function signatures and JSDoc.
- The exact `QrResult` error semantics.
- Matrix/quiet-zone coordinate conventions.
- The row-run path coordinate convention.
- Dimension examples and maximum QR box size.
- Golden hashes and independent decode evidence.
- Vendor upstream and adapted digests.
- Browser/CDP evidence paths.
- Any blocked physical evidence, explicitly not counted as a pass.

Physical printing is completed in RP08 after print integration.
Do not claim an Android/iPhone scan from the jsQR unit tests.

## Execution log

| Field | Value |
|---|---|
| Status | Done (physical print and phone-scan evidence remains with RP08) |
| Start | 2026-10-25 20:46:11 (+07:00) |
| End | 2026-10-25 21:00:53 (+07:00); code-ready 20:58:26, living docs 20:58–21:00 |
| Duration | 14 min 42 s |
| Model | claude-sonnet-5.5 (sub-agent `RP04-qr`, general-purpose); wave 1, in parallel with RP01 |
| Token usage | 65 model calls; 7,606,535 input (7,411,399 cache read), 99,359 output |
| AI credits | 222.25 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: `node --test .\tests\qr.test.js` 32/32; scoped `checkText` on 6 authored files OK; `checkSite` on `tests/browser/puzzle-qr.html` and `scanSource` on `qr.js`/`qrcodegen.js` clean; headless Edge 156 via CDP on port 8704 → `data-result=pass`, 13/13 cases, 0 CDP errors, 0 CSP violations (with `--disable-extensions`). Orchestrator re-run at the wave barrier: `node --test tests\qr.test.js` 32 pass / 0 fail; `npm run check` OK; full `npm test` 948 tests, 946 pass, 2 fail — both caused by RP01's new engine files (`LIMITS` name, `SOURCE_FILES` list), none in RP04 files. |
| Acceptance | Business and technical criteria met: upstream bytes matched before adaptation (qrcodegen 45,350 bytes `2511bc17…9480`; jsQR bundle 256,885 bytes `bc40c8a1…0859`; jsQR licence `c6596eb7…ba08`); adapted encoder 46,207 bytes CRLF `c5b15113…71c2` = 45,368 bytes LF-canonical `68453133…18f5`; goldens G1–G5 reproduce the five matrix hashes (versions 5, 5, 5, 6, 11) and jsQR decodes each URL exactly with chunks `byte` + `alphanumeric`; EC M by default, L only on request, never boosted; outer size max(25, (25 + 4v) × 0.5) mm; no remote service, CSP unchanged. |
| Issues & resolutions | (1) A pre-installed Edge extension logged a "Permissions policy violation: unload" error that failed the CDP error count → re-run with `--disable-extensions` (0 errors); later tasks launch Edge with this flag. (2) Added `tests/browser/puzzle-qr.css` for the themed surrounds (allowed by the task). (3) Extra exports `qrGeometry`, `QR_QUIET_MODULES`, `QR_MIN_MODULE_MM`, `QR_MIN_OUTER_MM`, `QR_MIN_VERSION`, `QR_MAX_VERSION`; extra input validation (`qr-invalid-input` for a prefix with spaces, controls or lone surrogates; `qr-too-long` above the QR standard's absolute limits before allocation); frozen results; `qrRowRunPath` throws `RangeError` on empty, ragged or non-binary matrices. (4) Living docs: design-brief "Limits, waiting, and sharing"; design-detail §3.1, §3.3, §4.3, §9.7, §12.4, §13.2, §13.3; README licence notes (EN/VI). |
| Handoff | `import { makePuzzleQr, qrRowRunPath, qrGeometry } from '../core/browser/qr.js'`. `makePuzzleQr({ urlPrefix, code, ec? })` → `{ ok: true, value: { url, code, urlPrefix, ec, version, modules, quietModules: 4, outerModules, outerMm, moduleMm, rows } }` or `{ ok: false, code: 'qr-invalid-input' \| 'qr-too-long', message }`. `rows[y][x]` ∈ {0, 1}, quiet zone excluded. Render: `viewBox="0 0 outerModules outerModules"`, width/height `outerMm` mm, opaque `fill="#fff"` rect, `fill="#000"` path from `qrRowRunPath` inside `translate(4 4)`; `stroke="none"` is a safe addition. Capacity with the 45-byte prefix: M v5 ≤ 55 code chars, v40 ≤ 3,322; L v5 ≤ 87, v40 ≤ 4,227 — use the result's `version`, never guess. |

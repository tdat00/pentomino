# RP05 — Shared snapshot, exact headings and printable code/QR sheets

| Header | Value |
|---|---|
| ID | RP05 |
| Depends on | RP01, RP02, RP03, RP04 |
| Estimated size | Large: approximately 1,500–2,500 implementation/test lines |
| Owner role | Shared browser / print integration |
| Milestone | M4 — a printed sheet recreates the selected puzzle |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§3, 5.6, 7–8.1, 10–13; traceability only |
| Implementation status | Not started |

## Goal & business context

The first A4 sheet must carry a typeable code and a scannable QR for one puzzle.
Every piece identity and the original logical board frame must survive.
The printed heading, encoded title and re-created heading must agree.
Do not encode a print-cropped/quarter-turned drawing instead of the authored data.

The user confirmed the optional printed answer tail, preserved title/level/score,
removal of the puzzle seed, Copy link and the exceptional no-code/QR fallback.
This task implements the shared preparation used by both printing and RP06.

## Scope

### In scope

- One detached immutable snapshot per selected puzzle and view.
- The shared heading rule in both applications.
- Worker-backed encoding and local QR preparation.
- Target selection, dialog-only local override and oversize notices.
- Asynchronous preparation before the Print button becomes ready.
- Dynamic first-sheet header, grouped code, QR and continuation sheets.
- Duplex accounting and unchanged cut-out scale.
- Removal of the printed puzzle-seed detail line.
- Player access to its stored answer for the code, without enabling a solution sheet.

### Out of scope

- Generation, solver or pack-format changes.
- New proof/uniqueness claims.
- Encoding current Player moves or elapsed time.
- Entry UI or correction algorithms.
- Clipboard buttons; RP06 consumes the preparation result later.
- A QR network service or URL shortener.

## Repository rules

- ES modules, `// @ts-check`, JSDoc and existing DOM/SVG helpers.
- No build step or npm dependency.
- Strict CSP unchanged; no inline style/handler/script or unsafe HTML.
- Use presentation attributes for SVG geometry and text.
- UTF-8 without BOM, CRLF, no trailing whitespace, final newline.
- Never edit historical docs or `tasks/init-design/`.
- Never edit these task files while implementing.
- Developers do not commit or push; the orchestrator verifies and commits each accepted task.
- Acquire the documentation slot, held through the orchestrator's commit.
- Do not edit files still owned by an active parallel task.
- Stop only recorded task-owned PIDs; no OS temporary artifacts.

## Inputs & context

The following sections inline the approved heading, target, snapshot and layout
contracts. The detailed implementation seams immediately below close the module
boundaries; they do not change the portable format.

### Owned helper API

`core/browser/puzzle-title.js` and `core/browser/puzzle-snapshot.js` must be
importable in Node without a DOM, worker or locale side effect. Nothing they
import may access `document`, `window`, `Worker` or locale state at import time.
`puzzlePlayerTarget` receives `pageBase`; `preparePuzzleShare` receives its client.
Add a Node test that imports both modules and calls `puzzleSnapshot` with injected
data and an untitled-label callback. RP06 and RP07 depend on this property.

```ts
type Piece = {
  id: string;
  label: string;
  color: string;
  cells: [number, number][];
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
type SnapshotSource = {
  rows: string[];
  pieces: Piece[];
  puzzle: {
    title?: string;
    clues: Pose[];
    solution?: Pose[] | null;
    rating?: RatingClaim | null;
    certificate?: CertificateClaim | null;
  };
  index: number;
  rotation: number;
  untitled: (n: number) => string;
};
type PuzzleSnapshot = {
  data: PuzzleCodeSnapshot;
  heading: string;
  key: string;
};
function puzzleSnapshot(source: SnapshotSource): PuzzleSnapshot;
function puzzleDisplayName(
  title: string | null | undefined,
  index: number,
  untitled?: (n: number) => string
): string;
function puzzlePlayerTarget(
  pageBase: string | URL,
  options?: { useThisPage?: boolean }
): {
  target: string;
  local: boolean;
  notice: null | 'localTarget' | 'devTarget';
};
```

`PuzzleCodeSnapshot` is plain data:

```ts
type PuzzleCodeSnapshot = {
  rows: string[];
  rotation: number;
  pieces: { id: string; label: string; color: string; cells: [number,number][] }[];
  clues: { piece: string; x: number; y: number; turn: 0|1|2|3; mirrored: boolean }[];
  solution: Pose[] | null;
  rating: RatingClaim | null;
  certificate: CertificateClaim | null;
  title: string | null;
};
```

Rating retains model/score/level, optional saturated/censored and opaque metrics.
A v2 claim retains all seven metrics: U, B, branchTrials, rowTrials, stop, R, H.
Certificate retains status/model/optional rowLimit, never runtime `verified`.
Use existing pack normalization/claim whitelisting rather than copying proof flags.

`key` compares all code-relevant values, including title, angle, solution and
claims. A fingerprint alone is insufficient because those fields are excluded
from progress identity.
Do not include elapsed time, ordinary moves, progress notifications or unrelated
puzzles in the key: they must not starve an in-flight preparation.
The snapshot copies its arrays/claims and never mutates source state.

The Player source is its original selected pack puzzle, not `game.placements`.
Its effective angle is `viewRotation ?? pack.presentation.rotation ?? 0`.
The Generator source is the accepted set and selected puzzle, with state.rotation.
Do not substitute the currently edited board if the selected old puzzle belongs
to a different accepted set.
Target host comparison ignores case/trailing DNS dot and recognizes the listed
IPv4/IPv6 local ranges, including IPv4-mapped IPv6. Do not perform a DNS lookup.
Copy calls `puzzlePlayerTarget` without the dialog override.

### Preparation API

Create in `core/browser/puzzle-snapshot.js`:

```ts
type PuzzleQrMatrix = {
  url: string;
  code: string;
  urlPrefix: string;
  ec: 'M' | 'L';
  version: number;
  modules: number;
  quietModules: 4;
  outerModules: number;
  outerMm: number;
  moduleMm: number;
  rows: Uint8Array[];
};
type PuzzleCodeClient = {
  encode(snapshot: PuzzleCodeSnapshot): Promise<
    | {
        ok: true;
        value: { C: string; T: string | null; F: string; version: 1 | 2 };
        warnings: { code: string; path: string; message: string }[];
      }
    | {
        ok: false;
        issues: { code: string; path: string; message: string }[];
      }
  >;
};
type PreparedPuzzleShare = {
  code: { C: string; T: string | null; F: string; version: 1 | 2 };
  url: string | null;
  carried: 'C.T' | 'C';
  qr: PuzzleQrMatrix | null;
  notices: ('noTail'|'lowEc'|'none'|'localTarget'|'devTarget')[];
};
preparePuzzleShare(
  snapshot: PuzzleSnapshot,
  options: {
    target: string;
    client: PuzzleCodeClient;
    targetNotice?: 'localTarget' | 'devTarget';
  }
): Promise<PreparedPuzzleShare>;
```

Use the RP02 client's Result wrapper and the RP04 `makePuzzleQr` adapter.
Do not import or call the codec on the main thread.

When the ladder drops T, return T=null and F=C in `code`, not a hidden richer F.
`carried` agrees with those returned values.
When no QR fits, `qr=null` means the print sheet contains neither code nor QR.
A valid core URL may still be returned for Copy if it fits the complete URL
budget; it remains the same selected carried core. A URL exceeding 16,000
characters is null and cannot be copied as a working link.
Never manufacture a local-library fallback.

### Dialog lifecycle

- Open the dialog immediately with a clear preparing state.
- Take a snapshot and start one preparation for its key/target.
- Disable Print until the current preparation and layout are ready.
- Never invoke printing later automatically after a disabled/pending click.
- Keep the eventual `window.print()` call on an explicit ready button action.
- Size/piece/board/duplex/solution-sheet options relayout the same prepared data.
- They do not regenerate a code or change its title/angle.
- A selected-puzzle/content/angle change invalidates the snapshot.
- A locale change that changes a captured heading invalidates it too.
- Closing invalidates pending callbacks and cancels owned work where appropriate.
- A late response cannot replace a newer preview.
- Re-check the source key immediately before printing.
- Do not mislabel worker/encoding failure as an oversized puzzle.
- An infrastructure error keeps Print disabled with an actionable error/retry.
- The approved no-code fallback is for the documented capacity ladder.

The Print dialog owns only the per-open local-target checkbox.
It does not add a persistent preference or change outside Copy's default target.

### Text layout implementation details

Use the physical constraints in the inlined layout contract below.
For long unbroken title tokens, fall back to code-point wrapping.
Never split a surrogate pair and never let a word overflow the QR column.
Ellipsize only after the third title line, on paper only.
The snapshot/code retain the complete title.
Elide the small printed target-host caption to its QR-column width;
the dialog still displays the complete target URL.

The title's first baseline is 19 mm and subsequent baselines add 9 mm.
Detail lines start 7.5 mm below the last title baseline and use 5.5 mm pitch.
The code label follows the last detail by 6 mm; when there are no details,
place it 7.5 mm below the last title baseline.
The first core baseline is 6 mm below the code label.
A tail label follows the last core line by 6 mm; its first line follows by 5 mm.
Use the specified core/tail pitches thereafter.
These deterministic baselines are compatible with the report's mock-up.

Treat a line's reserved bottom as its baseline plus 2 mm.
Reserve room for the continuation notice before filling the first sheet.
With a 5.5 mm notice pitch, the previous line's bottom plus 5.5 must be
<=149 mm. Then the notice also fits in the band.
Use actual whole groups and never split a four-symbol group across lines.
The final short group is allowed.
The tail's dot is printed and counts in the line's fixed textLength.

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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

### 7.2 Oversize (D17, Q5 — decided, confirmed by the user on 2026-10-25 17:50; extreme custom content only)

1. The encoder already uses the shorter of raw and DEFLATE.
2. If F exceeds version 40-M, drop the tail from both the text and the QR. The dialog notes it.
3. If it still does not fit, use error correction L, with a note.
4. If it still does not fit, print the puzzle **without code and QR**:
   - a notice in the dialog before printing;
   - a line on the sheet: "This puzzle is too large for a puzzle code".

Never truncate identity, never use `#lib`, never call an external service. Typed text that does not fit the band
continues on a labelled continuation sheet.


Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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

Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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
Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here.

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


## Files to create/modify

### Exclusive implementation ownership

- `core/browser/puzzle-title.js`
- `core/browser/puzzle-snapshot.js`
- `core/browser/print-dialog.js`
- `core/browser/print-layout.js`
- `core/browser/print-sheet.js`
- `core/browser/print-texts.js`
- `core/browser/print.css`
- `player/puzzle-title.js` as a compatibility wrapper/re-export where needed
- `player/app.js`
- `player/locale.en.js`
- `player/locale.vi.js`
- `generator/ui/puzzle-panel.js`
- `generator/locale.en.js`
- `generator/locale.vi.js`
- `tests/puzzle-snapshot.test.js`
- `tests/puzzle-title.test.js`
- Existing directly related print layout/options tests
- Existing Player title expectations affected by `ui.puzzleNumber`
- `tests/browser/puzzle-code-print.html`
- `tests/browser/puzzle-code-print.js`
- `tests/browser/print.js` only for required changed print expectations

RP03 must be accepted before these Player files are touched.
RP06 starts after this task is accepted.
Do not modify the codec, worker protocol, storage schema or QR vendor.

### Documentation slot

Update both living specs in the same change:

- `docs/design-brief.md`: printed code/QR, single-puzzle reconstruction,
  optional tail and exceptional no-code notice.
- `docs/design-detail.md`: first-sheet/continuation/duplex layout, target rules,
  immutable snapshot, heading rules, seed removal and code/QR capacity ladder.
- Explicitly document `Puzzle #n` / `Đề #n` for untitled puzzles.
- Explicitly document no auto-number for titles longer than 75 code points.
- Explicitly document the Generator printed heading becoming its displayed
  title such as `Hard #3`, not the `Puzzle #3` card heading.
- Preserve the distinction between carrying an answer and printing a spoiler sheet.
- README Printing explains typing/scanning, optional answer text, 100% scale
  and the rare explicit no-code/QR exception.

## Implementation steps

1. Move the shared heading algorithm without copying Player locale dependencies.
2. Keep a Player compatibility wrapper for existing imports if useful.
3. Update both applications' untitled translations and title tests.
4. Implement detached snapshots and their semantic keys.
5. Implement target classification and per-dialog override.
6. Implement the worker/QR preparation ladder and complete-URL check.
7. Add asynchronous preparation and stale-result guards to the dialog.
8. Add original stored answers to Player code snapshots, not spoiler permission.
9. Remove the puzzle seed from `puzzleDetails`; preserve known set details.
10. Implement physical code-band layout and dynamic preview top.
11. Add QR white background and row-run SVG path.
12. Add continuation pages and explicit duplex blank backs.
13. Keep the solution sheet's original 40 mm preview top.
14. Update existing print expectations rather than weakening them.
15. Run real DOM geometry tests under all option combinations.
16. Update living documentation/README in the documentation slot.
17. Hand off the snapshot/preparation APIs to RP06 and RP08.

## Acceptance criteria — Business

- **RP05-B01:** The first sheet shows a readable core and its matching QR.
- **RP05-B02:** An available answer tail is printed smaller and labelled optional.
- **RP05-B03:** Text, QR and the prepared URL carry the same selected code.
- **RP05-B04:** The authored board/piece identities/angle, not print cropping, are encoded.
- **RP05-B05:** Source and recreated displayed headings agree at every position.
- **RP05-B06:** The misleading puzzle-seed line is absent; known set details remain.
- **RP05-B07:** The Player carries its stored answer without gaining a solution-sheet option.
- **RP05-B08:** No code, QR, heading or preview overlaps another region.
- **RP05-B09:** Piece and board cut-out scale is unchanged.
- **RP05-B10:** Capacity reduction follows the exact approved order and notices.
- **RP05-B11:** Source changes cannot print stale data.
- **RP05-B12:** Local printouts default to the reachable configured public Player.

## Acceptance criteria — Technical

- **RP05-T01:** The shared heading helper passes all boundary/locale tests.
- **RP05-T02:** Snapshot keys include all code-relevant fields, not progress noise.
- **RP05-T03:** Prepared data is immutable and reused for layout-only changes.
- **RP05-T04:** No main-thread catalogue build occurs.
- **RP05-T05:** QR geometry includes the full quiet zone and minimum module size.
- **RP05-T06:** Version-40 boxes fit through width-dependent grouping.
- **RP05-T07:** The first preview retains at least 120 mm.
- **RP05-T08:** Continuation symbols preserve order exactly, including the tail dot.
- **RP05-T09:** Duplex backs and paper counts remain correct.
- **RP05-T10:** No QR/code appears on a mirrored back.
- **RP05-T11:** Print readiness is revision-safe and no pending click auto-prints later.
- **RP05-T12:** No-code notices appear before printing and on the sheet.
- **RP05-T13:** `npm run check`, targeted tests and browser harnesses pass.

## Test plan

### Exact commands

```powershell
node --test .\tests\puzzle-snapshot.test.js .\tests\puzzle-title.test.js
```

Run the owned-file convention check in `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.

Also run the repository's existing print test files by their current names.
Do not install a DOM test package; use the real browser harness below.

### Snapshot/title matrix

- Original title absent, empty, ordinary, numbered and long.
- Positions 1, 2 and 100.
- 75, 76 and 80 code points, including astral characters.
- EN and VI untitled labels.
- Generator displayed title versus card title.
- Player view angle differing from pack presentation.
- Stored solution present and absent.
- Custom RGB/labels/order and opaque claims.
- One field changes while an old preparation is pending.
- Progress/timer changes while preparation is pending: no invalidation.
- A different nonselected puzzle changes: no invalidation unless the selected
  displayed ordinal/content changes.
- Print option changes reuse the same code and matrix.
- Local override changes only the target/preparation, not source geometry.

### Target matrix

- Standard GitHub Pages prefix.
- Public fork with a different case-sensitive path.
- localhost, subdomain.localhost and .local.
- IPv4 loopback, RFC1918 and link-local.
- IPv6 loopback, unique-local and link-local.
- file origin and another non-HTTP origin.
- A public IPv4/IPv6 host that must remain public.
- Override unchecked, checked, closed and reopened.
- No persistent preference is added.

### Layout/capacity matrix

Use injected matrices to exercise versions 5, 11 and 40 without searching for
huge puzzle data. The actual real-code cases also use RP04's adapter.

- Normal 6x10 core and full code.
- A 576-cell code whose QR is version 11-M, 34.5 mm.
- Version 40, 92.5 mm, with a long title and code.
- Both detail lines, one detail line and no known details.
- Long unbroken title token and three-line ellipsis.
- Exact last fitting group and one overflowing group.
- Tail starts on the first sheet or on a continuation.
- Multiple continuation pages, final short group and dot preservation.
- One-sided and duplex output.
- Solution sheet selected and not selected.
- Piece/board sheets enabled and disabled.
- Every existing small/medium/large/Fit-to-page size option.
- All eight 45-degree display angles.
- Light/dark/high-contrast app surroundings.
- M full fits; M requires tail drop; L required; neither fits.
- Complete URL exceeds budget.
- Worker failure: it is not called an oversize event.

Use SVG DOM bounding boxes converted by 25.4/96 mm per CSS pixel.
Check no overlaps, not only page counts.
Reassemble printed code spans in reading order and compare with prepared F.
On duplex pages, compare front/back geometry and confirm QR absence on backs.
Retain the existing 50 mm scale-bar and equal piece/board-cell tests.

### Exact serving and CDP procedure

Use only `check-list.md` Section7 for the executable, fixed ports, disposable
profile, server command, native CDP runner and owned-PID/profile cleanup.
RP05's harness is `tests/browser/puzzle-code-print.html`.
Save verdict, summary and browser/error evidence under `tests\artifacts\RP05\`.

## Definition of done & handoff

- All criteria have automated evidence or explicitly identified physical gates.
- The real Print dialog reaches a ready preview using real worker/QR modules.
- The complete text reconstructs the same code as the QR URL.
- Current-source invalidation and option-only reuse are demonstrated.
- Existing scale/mirroring/solution-sheet behaviour is preserved.
- The new title text/rules and seed removal are documented in the living specs.
- RP06 receives one stable preparation API, not a second encoder recipe.
- No developer commit/push was made.

Handoff includes source/snapshot/preparation types, target rules, notices,
layout constants, code-line DOM reading order and passing CDP evidence.
RP08 owns final physical print/phone acceptance.

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

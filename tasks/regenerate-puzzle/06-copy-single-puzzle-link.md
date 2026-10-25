# RP06 — Copy this puzzle link in Generator and Player

| Header | Value |
|---|---|
| ID | RP06 |
| Depends on | RP02, RP03, RP05 |
| Estimated size | Medium: approximately 600–1,000 implementation/test lines |
| Owner role | Cross-app browser UI |
| Milestone | M5 — the printed representation is also a portable link |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§7–9, 11–13, Q4; traceability only |
| Implementation status | Not started |

## Goal & business context

A user can share the current puzzle without sharing a whole pack.
The action must copy the same representation used by printing.
It must not regenerate from a seed or depend on the local library.
The user confirmed this action in both apps on 2026-10-25 at 17:50.

## Scope

### In scope

- “Copy this puzzle link” in the Generator's selected-puzzle controls.
- The same action in the Player game bar.
- Shared snapshot/preparation reuse, safe async ownership and clipboard feedback.
- Native clipboard plus the existing manual-copy fallback.
- EN/VI messages and browser tests.

### Out of scope

- A separate serializer, title rule or destination classifier.
- Changing whole-pack Play or Copy pack link.
- Changing exports, library links or storage schemas.
- Adding a URL shortener or external service.
- QR rendering or print-layout changes.
- Automatic navigation after copying.

## Repository rules

- Native ES modules, existing DOM helpers, no build/dependencies.
- Keep strict CSP unchanged and user data out of HTML/CSS.
- UTF-8 without BOM, CRLF, no trailing whitespace, final newline.
- Never edit historical docs or task files during implementation.
- Developers do not commit or push.
- The orchestrator verifies and commits once per accepted task.
- Acquire the documentation slot before living-doc/README updates.
- This task starts only after RP05 releases shared app files.
- Do not terminate other applications or use OS temporary artifacts.

## Inputs & context

The selected puzzle, original clues, stored answer, effective angle and resolved
heading come from RP05. Do not reconstruct them from the visible preview SVG.
The two apps use the same preparation function and capacity policy.

The following API and data definitions are inlined from the accepted shared seam.
They are consumed here, not reimplemented.

### Owned helper API

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

RP05 created `core/browser/puzzle-snapshot.js` with this contract
(read-only for this task):

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


## Action contract

Create `core/browser/puzzle-copy.js` with an injectable action helper:

```ts
type PuzzleCopyAction = {
  copy(): Promise<void>;
  cancel(): void;
  dispose(): void;
};
createPuzzleCopyAction(options: {
  getSnapshot: () => PuzzleSnapshot | null;
  getTarget: () => { target: string; notice: null | 'localTarget' };
  prepare: (snapshot: PuzzleSnapshot, target: string) => Promise<PreparedPuzzleShare>;
  writeClipboard: (text: string) => Promise<boolean>;
  showManualCopy: (url: string) => void;
  notify: (key: string, params?: object) => void;
  setBusy: (busy: boolean) => void;
}): PuzzleCopyAction;
```

Use the existing `core/browser/dom.js` `copyText` helper behind writeClipboard.
Do not add a clipboard package or an unsafe hidden HTML fragment.

On copy:

1. Capture the selected snapshot and its key.
2. If there is no selected puzzle, do nothing and keep the control disabled.
3. Resolve the normal target rule, without the Print dialog's local override.
4. Start preparation through RP05 and mark the action busy.
5. Before writing, confirm the selection/key and operation revision are current.
6. If the prepared URL is null, show the too-long message; do not copy a broken link.
7. Otherwise copy exactly `prepared.url`.
8. Show “Link copied” only after clipboard success.
9. On clipboard failure, expose a safe selectable read-only field with that URL.
10. Clear busy state only for the current operation.

Do not recompute F from the snapshot after preparation.
The selected `carried` mode may have removed the optional tail.
Do not copy an original richer F when the shared preparation carried only C.

A null QR does not necessarily invalidate a URL.
If the shared preparation returns a valid URL within 16,000 characters, it may
still be copied; explain that the puzzle exceeds printable QR capacity.
No code or QR is printed in that exceptional case, as Q5 requires.
If the whole URL exceeds 16,000 characters, offer pack export instead.
Never substitute a same-browser `#lib` link.

The dialog-only local-target override resets on closing Print.
Copy uses the default public/local target rule, not that transient override.
For the same snapshot and default target, Copy and Print must give exactly the
same prepared URL. Explicit developer-override printouts are the documented
local-only exception, not a persistent Copy preference.

### Revision and cancellation

- Each click owns an operation token.
- A newer click invalidates the older operation.
- A source-key change before clipboard writing suppresses the stale result.
- Closing/disposal invalidates callbacks and owned preparation work.
- Do not cancel unrelated verification or generation jobs.
- If the source changes after a clipboard write has already started, do not
  claim that the link belongs to a newly selected puzzle; suppress stale feedback.
- Do not erase or rewrite the clipboard to undo a completed user-requested copy.

## UI placement

### Generator

Place the action beside Play and Print for the selected puzzle.
Use the full visible label “Copy this puzzle link”.
A tooltip alone is not the accessible name.
Keep the whole-pack Copy pack link action separate and unchanged.
Do not add two indistinguishable per-puzzle Copy controls.
If an existing per-puzzle Copy control is repurposed, update its label/handler
and directly affected tests, but retain the public whole-pack semantics.

Use the same snapshot-producing callback as Print.
Do not pass the live editor board when the selected puzzle belongs to an older set.
Do not include other puzzles in the data passed to the encoder.

### Player

Place the action in the existing game bar, available only with an open puzzle.
Use the current effective view rotation and the original stored puzzle.
Do not encode the user's placed movable pieces.
Use the same snapshot provider as Print.
Do not trigger a move, selection, reveal or navigation when the button is pressed.

### Accessibility and feedback

- Real button, type=button.
- At least 44 CSS px target in coarse-pointer layouts.
- Busy state is visible and exposed with `aria-busy` or the existing status pattern.
- Do not disable every game control while preparing a link.
- Feedback is a polite status announcement.
- Manual-copy fallback has a labelled read-only field and a close action.
- Selecting text in the fallback must not move a game piece.
- Escape closes the fallback and restores focus.
- Long URLs wrap/scroll within the field, not the whole page.
- No copied URL is navigated automatically.

## Exact EN/VI texts

| Key | English | Vietnamese |
|---|---|---|
| `code.copyLink` | Copy this puzzle link | Sao chép liên kết đề này |
| `code.copied` | Link copied | Đã sao chép liên kết |
| `code.copyFailed` | Could not copy the link. Select and copy it manually. | Không sao chép được liên kết. Hãy chọn và sao chép thủ công. |
| `code.copyTooLong` | This puzzle link is too long. Export the pack instead. | Liên kết đề này quá dài. Hãy xuất gói đề. |
| `code.copyNoQr` | Link copied; this puzzle is too large for a printable QR code. | Đã sao chép liên kết; đề này quá lớn để có mã QR trên bản in. |
| `code.copyField` | Puzzle link | Liên kết đề |

Both locale packs contain the same keys.
Reuse existing busy/cancel/close messages rather than creating duplicates.
The longer-than-4,000-character warning uses the existing long-link wording.
Do not show “Link copied” after a false or rejected clipboard result.

## Files to create/modify

- `core/browser/puzzle-copy.js`
- `generator/ui/puzzle-panel.js`
- `generator/locale.en.js`
- `generator/locale.vi.js`
- `player/app.js`
- `player/locale.en.js`
- `player/locale.vi.js`
- Existing app styles only where the new button/fallback needs layout rules
- `tests/puzzle-copy.test.js`
- `tests/browser/puzzle-code-copy.html`
- `tests/browser/puzzle-code-copy.js`

Do not edit the codec, worker protocol, shared snapshot/QR implementation or storage.
A missing RP05 seam is returned to that owner, not duplicated here.
RP03/RP05 must be accepted before shared Player files are changed.
No parallel task in this wave owns these files.

## Living-document changes

In the documentation slot, update both living specifications:

- Brief: portable Copy this puzzle link in both apps.
- Detail: locations, shared preparation, default target, clipboard fallback,
  stale-result rules and whole-URL limit.
- Detail: distinguish this action from whole-pack Copy/Play and local library links.
- README: explain the action and that the optional answer tail normally travels
  with the URL; raw/compressed strings may differ across encoders but content does not.

Do not edit historical design/task folders.

## Implementation steps

1. Confirm RP05's snapshot/preparation/target API handoff.
2. Implement the injectable copy action with revision guards.
3. Reuse existing clipboard facilities.
4. Implement safe manual-copy fallback and localized feedback.
5. Bind the Generator action to its Print snapshot provider.
6. Bind the Player action to its Print snapshot provider.
7. Keep whole-pack actions and exports untouched.
8. Add unit tests with fake preparation and clipboard promises.
9. Add real browser control/focus/clipboard-fallback tests.
10. Compare prepared Copy and Print URLs for the same source/default target.
11. Update living documents/README in the documentation slot.
12. Hand off without committing.

## Acceptance criteria — Business

- **RP06-B01:** Both apps expose the explicitly named action.
- **RP06-B02:** The link recreates only the selected puzzle.
- **RP06-B03:** It includes the stored answer tail when the shared policy carries it.
- **RP06-B04:** It does not encode moved Player pieces or unrelated puzzles.
- **RP06-B05:** It uses the same default-target URL as Print.
- **RP06-B06:** It never presents a local-library link as portable.
- **RP06-B07:** Clipboard denial has a usable manual alternative.
- **RP06-B08:** A stale preparation cannot silently copy the wrong selection.
- **RP06-B09:** Existing whole-pack actions remain functional.

## Acceptance criteria — Technical

- **RP06-T01:** The action has no serializer or destination-policy duplication.
- **RP06-T02:** It copies exactly `prepared.url`.
- **RP06-T03:** Whole-URL bounds are checked before copying.
- **RP06-T04:** Busy/cancel/dispose/revision behaviour is unit-tested.
- **RP06-T05:** Clipboard success/failure signals are respected.
- **RP06-T06:** Safe text rendering and focus restoration pass in the browser.
- **RP06-T07:** EN/VI keys and narrow/coarse-pointer layout pass.
- **RP06-T08:** Required Node/browser/repository checks pass.

## Test plan

### Commands

```powershell
node --test .\tests\puzzle-copy.test.js
```

Run the owned-file convention check in `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.

### Unit cases

- No selected puzzle: no preparation and no clipboard write.
- Ordinary complete preparation: exact URL written once.
- Tail removed by policy: core-only URL written, no hidden original F.
- QR absent but valid URL: copy plus the explicit advisory.
- URL null: no clipboard call and export guidance.
- 4,000-character warning boundary and 16,000-character rejection boundary.
- Clipboard resolves false or rejects: manual field contains exact URL.
- A later selection arrives before preparation: old write suppressed.
- A later click arrives before old response: only the current result may write.
- Cancel/dispose before response: no write or stale feedback.
- Source changes after writing started: no feedback claiming the new puzzle.
- Existing whole-pack copy method still follows its old path.

### Browser cases

Use real buttons in both applications.
Inject clipboard denial to test the fallback deterministically.
Separately perform a successful browser clipboard call where permissions allow;
record a platform block honestly rather than fabricating success.

Test:

- EN and VI accessible names/announcements.
- Keyboard activation and focus restoration.
- 390 px width and coarse-pointer targets.
- Light/dark/high-contrast surroundings.
- Player moved piece before copy: decoded code still contains only original clues.
- Player view turned before copy: decoded angle matches.
- Generator editor changed after creating a set: selected puzzle keeps its own board.
- Source title without an ordinal at position 2: heading stays correct after opening.
- Print/default Copy URL equality.
- Local Print override versus normal Copy: intentional documented target difference.
- Existing pack/library actions and JSON export still work.

The harness is an external module with the repository's strict CSP.
It reports final `<html data-result="pass|fail">` and a concise data-summary.
No public URL needs to be fetched: decode locally and navigate only to the
local test Player for automated cross-page tests.

### Exact serving and CDP procedure

Use only `check-list.md` Section7 for the executable, fixed ports, disposable
profile, server command, native CDP runner and owned-PID/profile cleanup.
RP06's harness is `tests/browser/puzzle-code-copy.html`.
Save verdict, summary and browser/error evidence under `tests\artifacts\RP06\`.

## Definition of done & handoff

### Evidence for the shared-tree handoff

Record these independently for both Generator and Player:

1. The selected source snapshot key before preparation.
2. The resolved heading, effective angle and puzzle position.
3. The default target URL and returned carried F.
4. Clipboard success with exactly that URL.
5. Clipboard rejection with the same selectable URL.
6. A source change while encoding is pending: stale result not copied.
7. A Player move while encoding is pending: original snapshot remains stable.
8. A local-origin print override: Copy still uses its own default target.
9. A no-fitting-QR advisory: no false claim that the copied link is a QR.
10. No app/schema/storage change outside this task's owned files.

Give RP08 the fixture names and evidence paths, not just a success screenshot.
Do not release the documentation lease before the orchestrator's accepted-task
commit; RP07 may finish its disjoint code while waiting for that lease.

- Business/technical criteria have evidence.
- Both actions use the same preparation API as Print.
- No hidden richer URL or local-library fallback is used.
- Clipboard failures and cancellation are safe and understandable.
- Whole-pack actions and gameplay are unchanged.
- Living documents and README describe the implemented action.
- Exported helper callbacks, new UI hooks and evidence are handed to RP08.
- No developer commit or push was made.

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

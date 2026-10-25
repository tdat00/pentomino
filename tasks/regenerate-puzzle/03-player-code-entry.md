# RP03 — Player puzzle-code entry, confirmed correction and progress notice

| Header | Value |
|---|---|
| ID | RP03 |
| Depends on | RP02 |
| Estimated size | Large: approximately 900–1,400 implementation/test lines |
| Owner role | Player UI / accessibility |
| Milestone | M3 — a person can type the paper code |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§5.8–5.10, 8–9, 12–13; traceability only |
| Implementation status | Not started |

## Goal & business context

A user must be able to type the printed core and open the same puzzle.
The optional answer part must remain optional.
A typo must be explainable and must not destroy an existing game.
Saved moves may resume, but that must be stated honestly.

This is the human-entry side of the direct-content code.
It does not recreate a puzzle by rerunning seeds or generation.
It does not silently repair input or silently discard a damaged answer.

## Scope

### In scope

- Entry on the empty Player screen and in the Player menu.
- A labelled multiline code field and Open action.
- Localized validation/correction/recovery UI.
- An explicit confirmation button for a correction candidate.
- Explicit opening of a validated core when only its tail is invalid.
- Atomic controller integration and a saved-progress notice.
- Keyboard, focus, screen-reader and narrow-screen behaviour.
- An external-module browser harness driven through CDP.

### Out of scope

- Codec algorithms or main-thread repair computation.
- Worker protocol, URL parser or storage schema changes.
- Generator controls.
- QR rendering or print layout.
- Changing game rules, hints or verification budgets.
- Automatically resetting progress to resemble the paper.

## Repository rules

- Native ES modules and existing styles/helpers; no new framework.
- No npm dependency, CDN, build step or external service.
- Keep the current CSP unchanged.
- Use native controls, `textContent` and safe DOM methods.
- Do not render a supplied code/error parameter as HTML.
- New text is UTF-8 without BOM, CRLF, no trailing whitespace, final newline.
- Do not edit historical docs or `tasks/init-design/`.
- Do not edit these task files during implementation.
- Do not commit/stage/reset/stash/push/change branches.
- Acquire the documentation slot before touching living docs or README.
- Include the relevant living-doc update with the UI change.
- Stop only task-owned server/browser PIDs.

## Inputs & context

### The code a person sees

```text
C      = independently valid core
C.T    = core plus optional stored-solution tail
```

Canonical alphabet:

```text
0123456789ABCDEFGHJKMNPQRSTVWXYZ
```

Paper groups symbols in fours.
Input accepts spaces, tabs, line breaks and hyphens as grouping.
Input is case-insensitive.
O means zero; I and L mean one.
U is never a code symbol.
Do not invent additional substitutions.

A pasted full URL must use the same hash parser as navigation.
Do not strip `&i=1` and open a link that navigation would reject.
`#p=` permits only absent/zero index and cannot coexist with pack/lib.
Never fetch a pasted URL.
RP01 owns the underlying `parsePuzzleHash`; RP02 delegates and adapts it.
For p-source failures, host `invalid-index` corresponds to code UI `index`,
and host `invalid-hash` corresponds to code UI `invalid`. Apply those aliases
only to the dedicated code-entry path, not legacy pack/library error messages.

Raw input is bounded to 32,768 characters.
Normalized code is bounded to 16,000 characters.
A complete pasted URL is also subject to its complete-URL bound.
Do not truncate a code into a different input and then open it.

### Controller contract supplied by RP02

```ts
loadPuzzleCode(
  text: string,
  options?: { commitAddress?: boolean }
): Promise<CodeResult<{ pack: Pack; index: 0 }>>;
cancelPuzzleCodeLoad(): void;
```

Cancellation invalidates the controller's code-load revision before a late
worker response could commit.
It does not cancel unrelated verification or Generator work.
If the method is missing from the accepted RP02 handoff, reopen RP02;
do not implement an independent loading pipeline in this UI.

A successful commit follows the existing Player pack/progress path.
The UI does not assign `store.pack` or construct a game itself.
A rejected load leaves the current pack and moves intact.
Do not reset elapsed time; naturally running time may continue to advance.

Automatic bad `#p=` input must open the same entry UI with the attempted input
and the reported error. RP02 supplies the failure through an injected
`onPuzzleCodeFailure({text, failure})` callback or an equivalent documented
transient controller event. No failure data is stored as a preference.

The following inlined transport details specify the wrappers and candidate data.
The worker itself is owned by RP02, not this task.

### Result and error transport

Use the project's `Result` shape, extended only with typed code details:

```ts
type CodeIssue = {
  code: string;
  path: string;
  message: string;
  params?: Record<string, string | number>;
};

type CoreRecovery = {
  kind: 'core-only';
  code: string;
  pack: Pack;
};

type CodeFailure = {
  ok: false;
  issues: CodeIssue[];
  recovery?: CoreRecovery;
  candidate?: PuzzleCodeCorrection;
};

type CodeResult<T> =
  | { ok: true; value: T; warnings: CodeIssue[] }
  | CodeFailure;

type EncodedPuzzleCode = {
  C: string;
  T: string | null;
  F: string;
  version: 1 | 2;
};

type DecodedPuzzleCode = {
  pack: Pack;
  hasTail: boolean;
  tailError: null | 'tail-check' | 'tail-tag' | 'tail-invalid';
  candidate?: PuzzleCodeCorrection;
  // Added by the browser client from its normalized request:
  code: string;
};
```

F and the client's `code` are normalized, uppercase and ungrouped.
F equals C or `C + "." + T`.
An ordinary malformed code is a typed failure, not a worker crash.
The optional recovery pack has already passed the existing pack validator.
Returning recovery data does **not** authorize loading it automatically.

### RP01 calls consumed by this task

```ts
encodePuzzleCode(
  snapshot: PuzzleCodeSnapshot,
  options?: { compression?: 'auto' | 'raw' }
): Promise<EncodedPuzzleCode>;

decodePuzzleCode(
  text: string
): Promise<{
  pack: Pack;
  hasTail: boolean;
  tailError: null | 'tail-check' | 'tail-tag' | 'tail-invalid';
  candidate?: PuzzleCodeCorrection;
}>;
```

The codec's raw mode is deterministic and supports golden-vector tests.
Auto compression may produce different valid DEFLATE bytes on different engines.
Do not require cross-engine byte equality for compressed output.
These codec calls return the report's plain DTOs and throw `PuzzleCodeError`
for core/encoding errors. The browser client adapts RPC outcomes to the
project-compatible `CodeResult` wrapper above; do not add that wrapper twice.

Correction candidate:

```ts
type PuzzleCodeCorrection = {
  normalizedCode: string;
  correctedCode: string;
  component: 'core' | 'tail';
  offset: number;
  group: number;
  position: number;
  typed: string;
  expected: string;
};
```

`offset` is zero-based within the component.
`group` is one-based for groups of four.
`position` is one through four.
The tail's dot is not a character in a tail group.
The candidate has passed checksum and complete decoding.
The UI still must ask for confirmation.

### Worker protocol additions

Add exactly these two task kinds:

```ts
type CodeRpc =
  | {
      kind: 'encodePuzzleCode';
      payload: {
        snapshot: PuzzleCodeSnapshot;
      };
    }
  | {
      kind: 'decodePuzzleCode';
      payload: { text: string };
    };
```

These are carried inside the existing requestId/revision/message envelope.
They do not create a new worker protocol version.
Validate payload shape before invoking the codec.
Reject unknown fields consistently with existing protocol conventions.
Reject non-string text or text longer than 32,768 UTF-16 code units.
The codec applies its own normalized-code and binary limits afterwards.

Do not put an `AbortSignal`, function, DOM node or URL instance in a payload.
Cancellation remains a client/pool concern.
Request IDs are safe nonnegative integers.
Every request has one revision token.
Stale replies are ignored by the client and never commit UI state.

Expected results:

| RPC | Successful result value |
|---|---|
| `encodePuzzleCode` | `{ C, T, F, version }` |
| `decodePuzzleCode` | `{ pack, hasTail, tailError, candidate? }` |

Codec core errors use the existing worker error reply, retaining their
code/params/candidate instead of becoming generic `internal` errors.
An invalid tail with a valid core is a successful RPC with `tailError`.
The browser client converts that to a `CodeFailure` with validated recovery,
so existing callers cannot accidentally commit it merely because RPC succeeded.
The client enriches a worker candidate with `normalizedCode` from its request
and `offset = 4*(group-1) + position-1`; those two fields are not extra wire fields.
Preserve the codec's `correctedCode` and component, and never apply them here.
Unexpected exceptions still use the existing sanitized worker-error path.
Preserve `params` and recovery data across structured cloning.

### Browser client

RP02 created `core/browser/puzzle-code-client.js` with this contract
(read-only for this task):

```ts
type PuzzleCodeClient = {
  encode(
    snapshot: PuzzleCodeSnapshot
  ): Promise<CodeResult<EncodedPuzzleCode>>;
  decode(text: string): Promise<CodeResult<DecodedPuzzleCode>>;
  repair(text: string): Promise<CodeResult<PuzzleCodeCorrection | null>>;
  cancel(): void;
  dispose(): void;
};

createPuzzleCodeClient(options?: {
  pool?: PoolLike;
  createPool?: () => PoolLike;
}): PuzzleCodeClient;
```

The default pool is lazy and has one worker.
`repair` is a browser convenience over the same decode RPC/candidate outcome;
it is not a third task kind or a separate main-thread algorithm.
Do not construct it until the first operation.
Do not build the catalogue while importing the client module.
The default pool is owned by the client and disposed with it.
An injected pool has explicitly documented ownership; default to caller-owned.

Each logical operation:

1. Allocates an unused request ID and revision.
2. Calls `beginRequest`.
3. Sends one RPC.
4. Awaits its settled result.
5. Calls `endRequest` in `finally`.
6. Rejects/returns cancellation consistently with existing pool conventions.

`cancel` invalidates the client's current operation and cancels its owned work.
It must not cancel unrelated Generator or Player verification work.
`dispose` is idempotent.
A late reply after disposal cannot update a caller.

Use the existing 115-second dispatch/120-second response watchdog framework.
Do not add a separate endless Promise.
Ordinary code operations should complete much sooner.
Do not convert a timeout into “invalid puzzle”.

Without module workers, return a browser-service failure:

```text
worker-unavailable
```

Do not decode on the main thread as a hidden fallback.
Existing JSON/share-code loading must remain usable.


## UI contract

### Owned component

Create `core/browser/puzzle-code-dialog.js`:

```ts
type CodeDialogOptions = {
  host: HTMLElement;
  t: (key: string, params?: object) => string;
  submit: (text: string) => Promise<CodeResult<unknown>>;
  cancel: () => void;
  openRecovery: (code: string) => Promise<CodeResult<unknown>>;
};
type CodeDialog = {
  open(options?: {
    text?: string;
    failure?: CodeFailure;
    opener?: HTMLElement | null;
  }): void;
  close(): void;
  dispose(): void;
};
createPuzzleCodeDialog(options: CodeDialogOptions): CodeDialog;
```

This is a native dialog/controller component, not a new application state store.
It receives the Player controller operations as callbacks.
Tests can inject deferred promises without running a solver.

### Placement

- When no pack is open, show an obvious “Enter puzzle code” action/field.
- Add “Enter puzzle code” to the existing Player menu at all times.
- A menu action closes the menu before opening the dialog.
- Existing file/drop/paste/import and Recent/Sample actions remain available.
- Do not remove the old pack-link import path.

### Field and actions

- A visible label is associated with the textarea.
- The field is multiline and monospace.
- Disable spell-check and unwanted autocapitalization/autocorrection.
- Preserve the user's grouping and case while editing.
- Normalisation is used for validation/counting, not a destructive edit on blur.
- Open puzzle is a real button.
- Cancel/close is always available, including while a worker is busy.
- Enter in the textarea may insert a line break.
- Do not let letter keys move/rotate a game behind the dialog.
- Do not add a conflicting global keyboard shortcut.

The character counter counts the normalized code, excluding grouping whitespace
and hyphens, not the whole URL prefix.
For incomplete malformed text, show a neutral provisional count;
do not display validation errors on every keystroke.
When a tail is present, the count may include its dot and symbols.
It is not a claim that the full input equals the printed core-only count.

### State machine

| State | Open button | Input | Candidate/recovery | Exit behaviour |
|---|---|---|---|---|
| Closed | Not visible | Retained only for this component instance | Hidden | No pending commit |
| Editing | Enabled for nonempty input | Editable | Cleared on edit | Close without changing game |
| Submitting | Disabled | Editable or read-only consistently | Hidden | Cancel invalidates request |
| Invalid | Enabled | Original value retained | Only returned safe actions | Close preserves game |
| Candidate | Enabled | Original value retained | Explicit correction button | No automatic apply |
| Tail recovery | Enabled | Original full input retained | Explicit core-only button | No automatic discard |
| Success | Dialog closes | No further action | Hidden | Controller has committed |

Editing during an in-flight submission cancels/invalidates that submission.
A worker reply for an old input cannot replace the current text or game.
Each submission and candidate stores a monotonically increasing UI revision.

### Correction flow

1. Show the candidate text only when supplied by the worker-backed result.
2. Display the group, character position, expected and typed symbols.
3. State that it is a possible correction to compare with the printout.
4. Do not change the field on arrival of the candidate.
5. Do not open a puzzle on arrival of the candidate.
6. On Use this correction, verify the input revision is still current.
7. Verify normalized input still equals the candidate's source text.
8. Replace the field with its `correctedCode` only after that confirmation.
9. Submit the corrected text through the same controller path again.
10. Never bypass decoding because the candidate already carried a pack.

If the input changed, discard the candidate instead of applying it.
Do not offer a candidate for a checksum-valid unknown version.
Do not implement an exhaustive repair loop on the main thread.
Do not describe a candidate as a guaranteed recovery of the user's intention.

### Tail recovery flow

A `tail-check`, `tail-tag` or `tail-invalid` error may include a validated core.
Show “Open without the solution part” only for that returned recovery.
The displayed full input remains unchanged until the user chooses the action.
On selection, submit the recovery's core code through the same loading path.
The resulting address carries C, not the damaged tail.
Do not silently retain an invalid tail in the address.
Do not offer core recovery for a bad core.

### Progress and verification

Saved progress uses the unchanged geometric fingerprint.
A code may reopen a puzzle the user already played through another pack.
Restore saved moves through the existing controller, then announce:

```text
Saved moves restored; Replay starts as printed.
Đã khôi phục các nước đi đã lưu; Chơi lại sẽ bắt đầu như bản in.
```

Do not erase progress to force the board to look like the first sheet.
Replay remains the explicit existing action for returning to the initial clues.

With a stored solution, existing verification is a linear layout check.
Do not launch a solver merely because a code was used.
Without a tail, play is still allowed while bounded verification runs.
A Hell puzzle may end “not verified” at the approximately 115-second deadline.
That status is not “unsatisfiable”.
The entry UI must not wait for background verification before allowing play.

### Accessibility

- Use a native dialog and its normal focus trapping.
- Place initial focus in the code field when opened by the user.
- A startup error also focuses the field after the dialog is shown.
- Set `aria-invalid=true` only for the invalid field state.
- Associate explanatory/error text through `aria-describedby`.
- Use `role="alert"` for a completed validation failure.
- Use a polite status region for busy/progress/restoration notices.
- Do not announce every keystroke as an error.
- Escape closes/cancels the dialog.
- Restore focus to the opener if it remains connected.
- Otherwise focus the start-screen code action or appropriate Player landmark.
- Use real buttons with accessible names.
- Keep touch targets at least 44 CSS pixels in coarse-pointer layouts.
- Do not communicate error/selection only by colour.
- Avoid motion or respect the existing reduced-motion preference.
- The dialog must fit at 390 CSS pixels without horizontal page scrolling.

## Text keys

Add these exact texts to the Player locale modules:

| Key | English | Vietnamese |
|---|---|---|
| `code.enter` | Enter puzzle code | Nhập mã đề |
| `code.field` | Puzzle code | Mã đề |
| `code.count` | {count} characters | {count} ký tự |
| `code.open` | Open puzzle | Mở đề |
| `code.restored` | Saved moves restored; Replay starts as printed. | Đã khôi phục các nước đi đã lưu; Chơi lại sẽ bắt đầu như bản in. |
| `code.error.worker` | This browser cannot open puzzle codes because module workers are unavailable. You can still import a pack file. | Trình duyệt này không mở được mã đề vì không hỗ trợ worker dạng mô-đun. Bạn vẫn có thể nhập tệp gói đề. |
| `code.error.service` | Puzzle code processing failed. Try again. | Không xử lý được mã đề. Hãy thử lại. |

Use the existing localized Cancel/Close/busy texts where their semantics match.
Do not duplicate an existing translation under a slightly different key.
The codec-specific errors below are also part of this task's locale contract.

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


## Files to create/modify

### Exclusive ownership during this task

- `core/browser/puzzle-code-dialog.js`
- `player/app.js`
- `player/player.css`
- `player/locale.en.js`
- `player/locale.vi.js`
- `tests/puzzle-code-dialog.test.js`
- `tests/browser/puzzle-code-entry.html`
- `tests/browser/puzzle-code-entry.js`

RP05 and RP06 edit some Player files later, after this task is accepted.
They must not run concurrently with this task.
Do not modify the codec, protocol, storage or Generator files.
Reopen RP02 if a promised controller seam is missing.

### Documentation slot

Update both living specifications in the same change:

- `docs/design-brief.md`: entering a printed code in the Player.
- `docs/design-detail.md`: entry locations, accepted input forms, correction
  confirmation, core-only recovery, atomic failure and progress restoration.
- Keep the Player address and background verification description accurate.
- README “Using the Player” gains the implemented entry action and limits.

The shared heading text changes belong to RP05's snapshot integration.
Do not prematurely duplicate its helper in this task.

## Implementation steps

1. Confirm RP02's controller and callback handoff.
2. Implement the injectable dialog state machine.
3. Build safe labelled controls and localized messages.
4. Add empty-screen and menu entry points.
5. Wire startup `#p` failures to the same dialog.
6. Add revision/cancellation guards around every asynchronous response.
7. Implement explicit candidate confirmation and re-submission.
8. Implement explicit core-only recovery and re-submission.
9. Add restoration announcement after the existing controller commits.
10. Check editable-target keyboard guards in the Player.
11. Add Node state-machine tests with deferred callback results.
12. Add real browser focus/keyboard/error tests.
13. Run Node tests, browser CDP evidence and repository checks.
14. Update living documents and README in the documentation slot.
15. Hand off without committing.

## Acceptance criteria — Business

- **RP03-B01:** A user can type the printed core and open its puzzle.
- **RP03-B02:** A full QR URL can be pasted without fetching a remote resource.
- **RP03-B03:** A typo leaves the existing game intact.
- **RP03-B04:** The field keeps the entered text after a failure.
- **RP03-B05:** A candidate is shown, not silently applied.
- **RP03-B06:** A bad tail is not silently discarded.
- **RP03-B07:** Cancel does not allow a late request to replace the game.
- **RP03-B08:** Existing saved moves resume with an honest notice.
- **RP03-B09:** Core-only play does not wait for a search to finish.
- **RP03-B10:** EN and VI users receive equivalent usable guidance.

## Acceptance criteria — Technical

- **RP03-T01:** Every state transition is covered by an injected test.
- **RP03-T02:** Stale results cannot commit or overwrite newer input.
- **RP03-T03:** Correction requires both revision and normalized-text agreement.
- **RP03-T04:** Every confirmed correction is decoded again.
- **RP03-T05:** Recovery can only use validated returned core data.
- **RP03-T06:** All supplied error codes have a localized presentation.
- **RP03-T07:** No code text becomes HTML or CSS.
- **RP03-T08:** No codec/catalogue/search implementation enters the UI module.
- **RP03-T09:** Focus, Escape and editable-key handling pass in a real browser.
- **RP03-T10:** The dialog fits at 390 px and works with coarse-pointer targets.
- **RP03-T11:** `npm run check` and the required Node tests pass.
- **RP03-T12:** Existing Player loading/control harnesses remain green.

## Test plan

### Exact Node commands

```powershell
node --test .\tests\puzzle-code-dialog.test.js .\tests\player-puzzle-code-route.test.js
```

Run the owned-file convention check in `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.
Do not install a DOM package merely for these tests.
Keep pure dialog transition helpers testable in Node and DOM details in the
existing style of external-module browser harness.

### Deferred-response cases

Use manually controlled promises, not timing sleeps, in state-machine tests.

1. Submit A, edit to B, resolve A successfully: A must not open.
2. Submit A, close, resolve A: the old game remains.
3. Receive A's candidate, edit to B, click old action: no substitution.
4. Receive a candidate, confirm without editing: corrected text is re-submitted.
5. Re-submitted correction fails: keep the corrected text and show its error.
6. Tail error without recovery: no core-only action.
7. Tail error with recovery: action exists but nothing opens before selection.
8. Choose recovery: only the returned core is submitted.
9. Worker unavailable: useful error, no main-thread fallback.
10. Dispose while awaiting: no late DOM update or game commit.
11. A second open replaces stale error/candidate state.
12. Empty input never launches a worker request.

### Real-code browser cases

Use this accepted full code and its core:

```text
1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE
```

It is the first repository sample puzzle.
Compare board rows, ordered piece identity and clues with the fixture.
Do not assert only a title or puzzle ID.

The harness must cover:

- Core, full code, grouped text and lower-case text.
- A pasted valid URL and pasted `&i=1` rejection.
- Mixed p/pack and p/lib rejection.
- Empty input, bad character, bad CRC and unknown version.
- An actual one-symbol candidate from the worker.
- A damaged tail and explicit core-only opening.
- Existing pack/progress retained after failure.
- Replay after resumed progress restores original clues.
- Menu opening, focus, Tab/Shift-Tab and Escape.
- Typing letters does not rotate/move a background piece.
- EN and VI messages.
- Light, dark and high-contrast surroundings.
- Narrow layout at 390 px.
- No unexpected CSP, console or local-network error.

Create an external `.js` harness with the existing strict CSP.
It writes final `<html data-result="pass|fail">` and `data-summary`.
Do not mark pass before outstanding test operations settle.
Dispose its apps, workers and dialogs between cases.

### Exact serving and CDP procedure

Use only `check-list.md` Section7 for the executable, fixed ports, disposable
profile, server command, native CDP runner and owned-PID/profile cleanup.
RP03's harness is `tests/browser/puzzle-code-entry.html`.
Save verdict, summary and browser/error evidence under `tests\artifacts\RP03\`.

## Definition of done & handoff

- Every business/technical criterion has evidence.
- All asynchronous state transitions are cancellation-safe.
- Errors preserve input and current gameplay.
- Recovery/correction only occur after explicit actions.
- Screen-reader semantics and focus restoration are verified in Edge.
- The entry path uses RP02 rather than a private parser or loader.
- No storage schema or game-rule change was introduced.
- Living docs and README describe the implemented entry UI.
- The orchestrator receives the new app/component seams and evidence paths.
- No developer commit was made.

Handoff to RP05/RP06:

- The Player app integration locations and menu structure.
- The dialog's exported API and its callbacks.
- Locale keys and focus/cancellation behaviour.
- The existing controller's code-load method/event usage.
- Passing baseline loading/control harness evidence.

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

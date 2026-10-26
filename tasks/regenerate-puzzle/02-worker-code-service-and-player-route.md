# RP02 — Worker code service, portable route and atomic incoming hand-off

| Header | Value |
|---|---|
| ID | RP02 |
| Depends on | RP01 |
| Estimated size | Large: approximately 1,000–1,500 implementation/test lines |
| Owner role | Engine/browser integration |
| Milestone | M2 — codes can open through a stable address |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§5.8–5.10, 8–9, 11–13; traceability only |
| Implementation status | Not started |

## Goal & business context

The Player must open one puzzle from a portable `#p=` address.
It must not need the Generator's history or local library.
Large code work and the cold shape catalogue must not block the main thread.
An invalid link must not erase the current game or its saved progress.

This task makes one worker-backed service available to the entry UI,
the print producer and the Copy link producer.
It preserves all existing `#pack=` and `#lib=` behaviour.

## Scope

### In scope

- Two worker RPC task kinds for encoding and decoding, including candidate data.
- An injectable, lazy browser client using a dedicated one-worker pool.
- `#p=` parsing and URL construction.
- Pasted puzzle-URL extraction with the same route validation.
- Atomic loading through `readIncoming`.
- Player controller integration without rewriting a `#p=` address.
- Transient failure/recovery data for the future entry UI.
- Existing browser and Node worker compatibility.
- Targeted unit tests and a real module-worker browser harness.

### Out of scope

- Bit packing or a second implementation of the codec.
- The entry dialog's DOM and translations.
- QR rendering and print layout.
- Clipboard controls.
- Changing pack format, storage schemas or progress identity.
- Replacing whole-pack Play links with single-puzzle links.
- Raising solver budgets or generation limits.
- Running a cold catalogue or search on the main thread as a fallback.

## Repository rules

- Native ES modules, `// @ts-check`, JSDoc and existing test infrastructure.
- No build step or npm dependency.
- Browser modules have `.js` suffixes.
- Preserve the strict CSP and local relative imports.
- No eval, unsafe HTML, inline handlers or external service.
- UTF-8 without BOM, CRLF, no trailing whitespace and final newline.
- Do not edit historical documents or `tasks/init-design/`.
- Do not edit task documents while implementing.
- Do not commit, stage, stash, reset, push or change branches.
- The orchestrator verifies and commits once per accepted task.
- Own only the implementation files listed below.
- Acquire the single-writer documentation slot before editing living docs.
- Include relevant living-doc updates in the same change as behaviour.
- Keep README features/commands correct.
- Do not install a dependency to run a test.
- Stop only processes started by this task, by recorded PID.

## Inputs & context

### Existing architecture

`core/engine/tasks.js` is the shared dispatch layer.
Both the browser module worker and `tools/node-worker.mjs` use it.
`core/engine/protocol.js` validates task kinds, messages and payloads.
`core/browser/worker-pool.js` serializes tasks within a worker.
`core/browser/handoff.js` returns validated incoming data without committing it.
`player/state.js` owns atomic controller commits and progress restoration.

The existing pool is used like this:

```ts
const pool = createPool({ size: 1 });

pool.beginRequest({
  requestId,
  revision,
  onTimeout,
});

const result = await pool.run({
  requestId,
  revision,
  kind,
  payload,
});

pool.endRequest(requestId);
```

Preserve those APIs.
Do not use a positional `pool.run(kind, payload)` signature.
Do not borrow the active Generator pool and collide with its request IDs.

Existing solver/generation tasks return synchronously from `executeTask`.
Preserve that behaviour for existing task kinds.
New codec tasks may return a Promise because native compression is asynchronous.
The worker message wrapper must await those results and serialize their outcome.
It must never post a Promise object.
`createTaskHandler.handle` keeps `current` set until a returned Promise settles,
so memory/progress still belongs to the correct request. Post one result or one
error only after settlement, then clear `current`. A synchronous `finally` must
not clear it immediately after returning a Promise. Keep existing synchronous
tasks' immediate reply/cleanup control flow unchanged; do not make all tasks
implicitly asynchronous. Test deferred resolve/reject and progress ownership.

### Pack and single-puzzle input

RP01 supplies a code for exactly one puzzle.
Use its validated, detached input:

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
  title: string | null;
  clues: Pose[];
  solution: Pose[] | null;
  rating: RatingClaim | null;
  certificate: CertificateClaim | null;
};
```

No other puzzle, generation metadata, timestamp or witness is included.
The producer supplies the selected display title and effective view angle.
This service must not read live application state to invent either.
It must not replace original clues with currently moved Player pieces.

The decoded result is an ordinary existing pack:

```ts
type Pack = {
  format: 'pentomino-pack';
  version: 1;
  kind: 'puzzle-pack';
  rules: 'free-polyomino-v1';
  board: { rows: string[] };
  presentation: { rotation: number };
  pieces: Piece[];
  puzzles: [{
    id: string;
    title?: string;
    clues: Pose[];
    solution?: Pose[] | null;
    rating?: RatingClaim | null;
    certificate?: CertificateClaim | null;
  }];
};
```

The actual normalized Pack type is the repository's existing type.
Do not create a divergent pack validator.
The puzzle ID is recomputed by `puzzleId(board, pieces, clues)`.
Progress identity remains `progressFingerprint(board, pieces, clues)`.
Title, angle, source index and public puzzle ID do not replace that fingerprint.

### Relevant format facts

The service delegates these to RP01:

```text
alphabet = 0123456789ABCDEFGHJKMNPQRSTVWXYZ
C = independently valid core
T = optional independently checked solution component
F = C or C.T
```

Each component ends in four CRC-20 symbols.
The polynomial is `0x6C1BD`, width 20.
Init and XOR-out are `0xFFFFF`.
Bits are MSB-first, with no reflection and no extra zero clocks.
The core check covers its padded payload.
The tail check covers the core payload **without the core check** plus
the padded tail payload.

Version 1 is raw.
Version 2 is a bounded DEFLATE representation.
The service must not implement a second CRC or a second decoder.
It must preserve the codec's error and recovery information.

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

Create `core/browser/puzzle-code-client.js`:

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

### Route rules

New route:

```text
.../player/#p=C
.../player/#p=C.T
```

`i` may be absent or exactly `0`; do not coerce `00` or whitespace to zero.
Other canonical indices matching `^(?:0|[1-9][0-9]{0,5})$` are rejected as
`index` by RP01. Malformed/repeated values are `invalid`.
`p` cannot coexist with `pack` or `lib`.
Repeated known keys are rejected.
Unknown keys retain the existing parser's ignore behaviour.
Known key names are case-sensitive.

RP01 owns `parsePuzzleHash` in `core/engine/puzzlecode-input.js`:

```ts
parsePuzzleHash(hash: string):
  | { ok: true; value: { p: string; index: 0 } }
  | { ok: false; code: 'index' | 'invalid'; message: string };
```

It reads after the first #, splits on &, uses keys before the first =, ignores
unknown keys, rejects repeated known keys/mixed p+pack/lib/missing or empty p,
and applies the exact i rule above. It URI-decodes p once; URIError is invalid.
It never converts + to a space and never URI-decodes keys or i.
Its returned p is decoded but not yet canonicalized.

Extend the existing parsed value:

```ts
type IncomingHash = {
  index: number;
  pack?: string;
  lib?: string;
  p?: string;
};
```

`parseLocationHashResult` is the host adapter, not a second p parser.
When a p key is present it delegates to RP01's `parsePuzzleHash`.
Map helper `index` to host `invalid-index`, and helper `invalid` to
host `invalid-hash`. On success return `{p, index:0}`.
When p is absent, keep existing pack/lib/no-incoming behaviour unchanged.
Read `tests/fixtures/puzzlecode-hashes.json` without modifying it and exercise
the p-bearing cases through both entry points, asserting the mapped outcomes.
It validates route structure, not the puzzle's binary contents.
`parseLocationHash` remains the nullable convenience wrapper.

Pasted full URLs use RP01's normalizer and the same underlying parser.
Do not extract the substring after `#p=` and discard `&i=1` or mixed keys.
Never fetch a pasted URL.
Only its hash supplies data.
Bare grouped codes remain accepted by the dedicated code-input path.
After the host parser already extracted p, use `normalizePuzzleCodeValue`,
not the link-detecting normalizer. Never decode a value twice or interpret an
encoded # as a nested route. A literal + must reach `bad-char`.
For the dedicated code UI, map p-source host aliases back to `index`/`invalid`
when presenting the failure; do not change legacy pack/lib error presentation.

### URL helper

Add:

```ts
puzzleCodeUrl(
  playerTarget: string | URL,
  code: string
): string;
```

`playerTarget` is the already selected Player URL, not the current Generator URL.
Its normal scheme is HTTP or HTTPS. A file target is allowed only for the
explicit local developer override supplied by RP05; reject javascript/data targets.
It must not contain credentials.
Clear any old search/hash before attaching the new hash.
Preserve hostname/path case as URL rules require.
Do not append an `i` parameter.

The result is:

```text
selectedPlayerTarget + #p= + canonicalCode
```

The caller checks the complete URL against `MAX_URL_CHARS = 16000`.
That is not the same as the codec's 16,000-character normalized-code bound.
Retain the existing 4,000-character long-link warning threshold where applicable.
Do not fall back to `#lib` for this portable single-puzzle action.

Selecting public/local targets belongs to RP05, not this helper.
Do not hard-code the upstream site over a supplied public fork target.

### Atomic hand-off

Extend `HandoffEnv` with an injectable decode callback:

```ts
type PuzzleDecode = (
  text: string
) => Promise<CodeResult<DecodedPuzzleCode>>;
```

For `#p=`:

1. Parse the hash with the shared parser.
2. Send the code through the worker-backed decode callback.
3. On success, return `{pack, index:0}` with warnings.
4. On failure, preserve issues and any core recovery.
5. Do not save a library entry or replace controller state here.

Existing `#pack=` uses its existing share-code decoder.
Existing `#lib=` uses its existing namespaced storage path.
Do not change their precedence, data limits or stored identities.

The Player controller commits only a successful result.
A code recovery is not a success until explicitly chosen by the user.
Invalid input leaves the current pack, moves, timer and progress untouched.

When the current source is `#p=`, skip `hashWithIndex` rewriting.
Do not rewrite lower-case/grouped input into another address on load.
Do not append `&i=0`.
Reloading the address must reopen the same one-puzzle pack.

Expose a controller operation for the future entry UI:

```ts
loadPuzzleCode(
  text: string,
  options?: { commitAddress?: boolean }
): Promise<CodeResult<{ pack: Pack; index: 0 }>>;
cancelPuzzleCodeLoad(): void;
```

On entry success with `commitAddress:true`, use the normalized accepted code
to establish the new `#p=` source.
On hash loading, retain the incoming hash exactly.
Do not update history on failure.
Use the same successful-pack commit path that already restores progress.
The controller accepts an `onPuzzleCodeFailure({text, failure})` callback for
automatic bad-link startup. It changes no persistent state; RP03 opens its dialog
from that callback. `cancelPuzzleCodeLoad` invalidates the controller revision
before cancelling its dedicated client, so a late success cannot commit.

## Error vocabulary and UI handoff

The worker transports these codec errors unchanged:

| Code | Meaning |
|---|---|
| `empty` | Nothing after normalisation |
| `bad-char` | Character outside the supported code syntax |
| `dots` | More than one component separator |
| `too-long` | Input/code/binary bound exceeded |
| `core-check` | Core checksum failure or too-short core |
| `version` | Unknown core version |
| `no-deflate` | Missing raw-DEFLATE decompressor |
| `invalid` | Invalid structure, bounds or decoded pack |
| `tail-check` | Invalid tail checksum |
| `tail-tag` | Unknown tail tag |
| `tail-invalid` | Tail is not a valid compatible layout |
| `index` | A puzzle-code route requests another index |

Additional client failures are not codec-format claims:

| Code | English | Vietnamese |
|---|---|---|
| `worker-unavailable` | This browser cannot open puzzle codes because module workers are unavailable. You can still import a pack file. | Trình duyệt này không mở được mã đề vì không hỗ trợ worker dạng mô-đun. Bạn vẫn có thể nhập tệp gói đề. |
| `worker-error` | Puzzle code processing failed. Try again. | Không xử lý được mã đề. Hãy thử lại. |

RP03 owns presentation and translation registration.
This task supplies stable codes and data, not DOM strings embedded in a worker.
Use sanitized diagnostic messages; do not expose a stack trace as user text.

## Files to create/modify

### Exclusive ownership

- `core/engine/protocol.js`
- `core/engine/tasks.js`
- `core/workers/engine.worker.js`, comment only: correct the claim that every task is synchronous
- `core/engine/sharecode.js`
- `core/browser/puzzle-code-client.js`
- `core/browser/handoff.js`
- `player/state.js`
- `tools/node-worker.mjs`, only if its wrapper needs Promise handling
- `tests/protocol.test.js`
- `tests/tasks.test.js`
- `tests/sharecode.test.js`
- `tests/handoff.test.js`
- `tests/puzzle-code-client.test.js`
- `tests/player-puzzle-code-route.test.js`
- `tests/browser/puzzle-code-worker.html`
- `tests/browser/puzzle-code-worker.js`

RP01's codec files are read-only to this task.
Do not edit Player/Generator DOM or locale files.
RP03 begins only after this task's controller/API handoff is accepted.

### Documentation slot

Update `docs/design-brief.md` with the available portable one-puzzle route.
Update `docs/design-detail.md`:

- Hand-off/links: `#p`, parser rules and atomic failures.
- Worker task protocol: the two additions and async result handling.
- Player address: no `&i` rewriting for `#p`.
- Verification: stored answer fast path remains unchanged.
- Bounds: code versus complete URL limits.

Keep README route documentation correct.
Do not describe the entry/print UI as implemented before its owner lands it.

## Implementation steps

1. Confirm RP01's API and tests are accepted.
2. Add protocol kinds and strict payload validators.
3. Dispatch to the codec without duplicating its logic.
4. Add Promise-aware handling only where needed.
5. Test that existing synchronous task calls remain synchronous.
6. Test that both worker hosts settle new task replies correctly.
7. Implement the lazy dedicated browser client.
8. Add cancellation, disposal and stale-reply tests.
9. Extend the shared hash parser.
10. Add the selected-target URL helper.
11. Extend `readIncoming` with injectable code decoding.
12. Preserve validated core recovery without automatically opening it.
13. Integrate the Player controller's atomic load operation.
14. Skip history rewriting for active `#p` sources.
15. Preserve progress restoration through the existing commit path.
16. Add the real worker browser harness.
17. Run targeted tests and then quick/full combined checks.
18. Update the living specifications in the documentation slot.
19. Hand off without committing.

## Acceptance criteria — Business

- **RP02-B01:** `#p=C.T` opens exactly one puzzle without local library data.
- **RP02-B02:** `#p=C` opens the same board/pieces/clues without an answer.
- **RP02-B03:** A full code with an answer uses normal stored-solution verification.
- **RP02-B04:** A malformed link preserves the current game and progress.
- **RP02-B05:** A damaged tail offers recoverable core data but opens nothing.
- **RP02-B06:** Existing pack/library links remain functional.
- **RP02-B07:** Reload does not require regenerating from seeds.
- **RP02-B08:** A nonzero puzzle index is not silently ignored.
- **RP02-B09:** No large codec operation runs on the main thread.
- **RP02-B10:** Worker unavailability is explained without breaking JSON import.

## Acceptance criteria — Technical

- **RP02-T01:** New RPC payloads are validated before execution.
- **RP02-T02:** New async operations return settled structured data.
- **RP02-T03:** No Promise is posted through structured cloning.
- **RP02-T04:** Existing synchronous dispatch tests pass unchanged.
- **RP02-T05:** Request IDs/revisions prevent stale commits.
- **RP02-T06:** Every begun request is ended or cancelled.
- **RP02-T07:** Client disposal is idempotent.
- **RP02-T08:** The default client owns exactly one lazy worker.
- **RP02-T09:** No Generator pool/request is cancelled by code entry.
- **RP02-T10:** `p` mixed with `pack`/`lib` is rejected.
- **RP02-T11:** Pasted URLs obey the same index/mixed-key rules.
- **RP02-T12:** Complete URL limits are distinct from code limits.
- **RP02-T13:** `#p` history is not rewritten during normal loading.
- **RP02-T14:** `npm run check` and the required suites pass.

## Test plan

### Exact Node commands

```powershell
node --test .\tests\protocol.test.js .\tests\tasks.test.js .\tests\sharecode.test.js .\tests\handoff.test.js .\tests\puzzle-code-client.test.js .\tests\player-puzzle-code-route.test.js
```

Run the owned-file convention check in `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.
Do not skip existing tests merely because a signature changed.

### Required test cases

| Case | Expected result |
|---|---|
| Encode raw sample through worker | Exact RP01 raw golden |
| Decode sample full code | One valid puzzle and stored answer |
| Decode sample core | Same fingerprint, no answer |
| Decode one changed core symbol | Candidate data, not a committed game |
| Repair ambiguous/out-of-bound input | No candidate |
| Malformed RPC payload | Structured invalid-payload reply |
| Codec validation failure | Original codec error preserved |
| Missing worker support | `worker-unavailable` |
| Worker transport failure | `worker-error`, no state replacement |
| Cancel before reply | Settled cancellation, stale result ignored |
| Dispose twice | No throw or unrelated cancellation |
| Two independent clients | No request-ID collision |
| `#p=C` | Index zero |
| `#p=C&i=0` | Index zero, original hash retained |
| `#p=C&i=1` | Host `invalid-index`; code UI `index` |
| `#p=C&i=-1` | Host `invalid-hash`; code UI `invalid` |
| `#p=C&i=x` | Host `invalid-hash`; code UI `invalid` |
| Repeated `p` | Failure |
| Repeated `i` | Failure |
| `p` plus `pack` | Failure |
| `p` plus `lib` | Failure |
| Pasted invalid-index URL | Same failure as navigation |
| Lower-case code | Decoder normalises it |
| Existing `#pack` | Existing behaviour |
| Existing `#lib` | Existing behaviour |
| Bad code while a game is open | Pack/moves/timer remain unchanged |
| Valid code with saved fingerprint | Existing restoration path used |
| New source at index zero | No appended `&i` |

### Golden transport smoke

Use this complete code:

```text
1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE
```

It represents `player/samples/sample-pack.json`, puzzle index zero.
The part before the dot is the complete core.
The full code has 45 characters.
The core has 38 characters.
Its pieces, board and clues must compare to the fixture after the documented
normalisations, not merely by puzzle ID.

### Browser harness and CDP

Create external-module harness files at the owned browser paths.
Use the existing strict CSP from other browser harnesses.
Use the real module worker and default one-worker client.
Do not replace all worker behaviour with a mock in this harness.

The harness writes:

```text
<html data-result="running">
<html data-result="pass" data-summary="...">
<html data-result="fail" data-summary="...">
```

Only the final two values count as a result.
Collect unexpected console exceptions, failed local requests and CSP violations.
Test encode, decode, candidate return, cancellation and disposal.
Dispose all owned workers before marking the harness complete.

Use only `check-list.md` Section7 for the executable, fixed ports, disposable
profile, server command, native CDP runner and owned-PID/profile cleanup.
RP02's harness is `tests/browser/puzzle-code-worker.html`.
Save verdict, summary and browser/error evidence under `tests\artifacts\RP02\`.

## Definition of done & handoff

- All acceptance items have recorded evidence.
- The new route is usable before the entry UI exists.
- Existing pack/library/progress semantics remain unchanged.
- The browser client never causes a cold main-thread catalogue build.
- Async worker results are handled by both hosts.
- Recovery is validated data, never an automatic state change.
- Living docs and applicable README content match this implementation.
- No commit or unrelated file modification was made.

Handoff to RP03/RP05/RP06:

- Public client and controller methods.
- Hash/parser/URL helper signatures.
- Code error/params/recovery shapes.
- Cancellation/disposal ownership.
- The selected-target versus current-page-base distinction.
- Worker/browser evidence and regression results.

## Execution log

| Field | Value |
|---|---|
| Status | Done |
| Start | 2026-10-25 21:41:19 (+07:00) |
| End | 2026-10-25 22:09:34 (+07:00) |
| Duration | 28 min 15 s |
| Model | claude-sonnet-5.5 (sub-agent `RP02-route`, general-purpose); wave 2, alone (held the documentation slot from the start) |
| Token usage | 145 model calls; 34,318,196 input (33,866,195 cache read), 219,153 output |
| AI credits | 670.80 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: six targeted suites 112/112 (protocol 17, tasks 28, sharecode 14, handoff 20, puzzle-code-client 19, player-puzzle-code-route 14); full `npm test` 1,009/1,009; `npm run check` OK; browser harness `tests/browser/puzzle-code-worker.html` in headless Edge 156 (`--disable-extensions`, ports 8702/9202) → pass, 12 checks, 4 workers spawned and terminated, `catalogueStats.sizesBuilt === 0` on the page, 0 CDP errors; a throwaway check on the real Player page opened `#p=<golden>` and the lowercase core-only form, and showed the right start-screen messages for a typo, `&i=1` and an empty `#p=` without rewriting the address. Orchestrator re-run: full `node --test "tests/**/*.test.js"` 1,009 pass / 0 fail (47.1 s); `npm run check` OK. |
| Acceptance | Business and technical criteria met: encode/decode/repair run only in workers (the cold catalogue is never built on a page); `#p=` opens exactly one puzzle through `readIncoming` with the codec's single `parsePuzzleHash`, rejects `i ≠ 0` and mixed keys with their messages, never rewrites a `p` address; legacy `#pack=`/`#lib=` behaviour and tests unchanged; tail-only damage recovers the core puzzle; cancellation and deadlines map to typed failures. |
| Issues & resolutions | (1) The first Promise-aware `createTaskHandler` stalled its queue after a sync task → `run`/`release`/`waiting` design with tests. (2) `parseWorkerMessage` is strict and `worker-pool.js` is not owned → `params` and `candidate` ride on `issues[]` entries, passed through unchanged. (3) Node-worker scratch runs need a file script under `tests/artifacts/` (stdin modules break `nodeWorkerFactory`). (4) Deviations: `puzzleCodeUrl` accepts `file:` targets (RP05 decides when to pass one; the caller enforces `MAX_URL_CHARS`); aborted calls reject with `PoolAbortError`, mapped to `cancelled`; `worker-unavailable` text omits the non-existent file import (RP03 owns final texts); extra `createTaskHandler` option `execute` (test seam) and exports `isPuzzleHash`, `readPuzzleCode`; optional snapshot fields default to null; encode compression is automatic. (5) Living docs: design-brief Player address and puzzle-code paragraphs (no entry/print/scan UI claimed); design-detail §1.1, §3.1, §3.2, §4.2, §4.3, §8.1, D43, §9.1, §9.4, §9.5, §9.7, §9.8, new §9.9, §11.12, §13.2, §13.3 item 19; README Player bullet, privacy line, code layout and test-page list (EN/VI). |
| Handoff | `createPuzzleCodeClient({ pool?, createPool? })` → `{ encode(snapshot), decode(text), repair(text), cancel(), dispose() }` and `failureFromCodeError(error)`; results `{ ok: true, value, warnings }` or `{ ok: false, issues, recovery?, candidate? }`; an injected pool must be dedicated. Issues carry `code`, `path`, `message`, `params?`, `candidate?` (`offset = 4·(group − 1) + position − 1`, `normalizedCode`); `recovery: { kind: 'core-only', code, pack }` when only the tail is bad; service failures `worker-unavailable`, `worker-error` (`params.reason: 'deadline'`); controller failure `cancelled`. Player controller (RP03): options `puzzleCodeClient`, `createPuzzleCodeClient`, `onPuzzleCodeFailure({ text, failure })`; methods `loadPuzzleCode(text, { commitAddress })` (`commitAddress: true` → `replaceState('#p=<normalized>')`) and `cancelPuzzleCodeLoad()`. Routing (RP05–RP08): `parseLocationHashResult(hash)` → `{ p, index: 0 }`; `isPuzzleHash(hash)`; `puzzleCodeUrl(playerTarget, code)` → http(s)/file URL with `#p=<normalized>` and no `i` — keep the selected Player target apart from the current page base. `handoff.js`: `readPuzzleCode(text, env)`; `readIncoming` decodes `p` through `env.decodePuzzle`. Open for RP05: allow `file:` targets only for the developer override; RP03 owns the final failure wording. |

# RP07 — Optional headless --code output with browser parity

| Header | Value |
|---|---|
| ID | RP07 |
| Depends on | RP01, RP02, RP05 |
| Estimated size | Medium: approximately 500–900 implementation/test lines |
| Owner role | Node CLI / integration |
| Milestone | Optional M5 extension; not a blocker for the browser feature |
| Design refs | `docs/regenerate-puzzle/4-final-report.md` §§5, 8.1, 12–13; traceability only |
| Implementation status | Not started; in scope, optional and release-non-blocking |

## Goal & business context

A command-line caller may request one self-contained code per accepted puzzle.
The same selected puzzle and title/angle must decode identically in the browser.
This option must not alter generation, seeds, histories, ratings or exit semantics.

Each emitted code contains one puzzle, never an entire pack.
A generation run can emit multiple lines because it accepted multiple puzzles.
The first line corresponds to puzzle index zero in the generated pack.

## Scope

### In scope

- A boolean `--code` flag in the existing headless generator.
- Clean code-only stdout when that explicit mode is selected.
- Optional simultaneous pack JSON output through existing `--output`.
- Shared snapshot and codec reuse.
- Parser/output/exit/fixture tests and browser decoding parity.

### Out of scope

- A new generator or code format.
- New generation flags or a selected-index flag.
- Changing the default stdout format without `--code`.
- QR generation, clipboard or print UI.
- Writing new provenance into the code.
- Changing recipe replay or calibrated policies.

## Repository rules

- Native Node ES modules and existing CLI test hooks.
- No npm dependency, build step or external service.
- No browser global at module import.
- UTF-8 without BOM, CRLF, no trailing whitespace, final newline.
- Do not edit historical docs or tasks during implementation.
- Developers do not commit or push; the orchestrator commits each accepted task.
- Use the documentation slot for both living specs and README.
- Put test outputs in project-local `tests\artifacts\RP07\`, never an OS temp folder.

## Inputs & context

Current exports in `tools/generate.mjs` include:

```ts
parseArgs(argv, readText?);
checkRecipe(data);
compareExpected(expected, actual);
packText(pack);
run(argv, overrides?): Promise<number>;
```

`run` already accepts injected stdout/stderr/readText/writeText and worker facilities.
Use those seams rather than starting a new application pipeline.
The file also exports `USAGE`, default/max area and count constants.

### Flag contract

`--code` is a boolean flag with no value.
Reject repeated `--code` and `--code=true`/`--code=false` rather than guessing.
Allow it with a recipe because it changes output, not semantic generation inputs.
It is not forwarded into generation/worker semantic payloads.

Without `--code`, preserve every existing output rule:

- Pack JSON goes to stdout or `--output`.
- Progress and errors go to stderr.
- Existing recipe/argument validation is unchanged.

With `--code`:

- stdout contains exactly one ungrouped uppercase F per accepted puzzle.
- Each line ends with a newline.
- Do not prefix a line with an index, JSON quote, label or logging message.
- Progress/warnings/errors remain on stderr.
- When `--output` is also supplied, write the original pack JSON there as before.
- Without `--output`, the explicit code mode replaces pack JSON on stdout.
- Do not create an unsolicited pack file.
- Emit only complete validated code lines, never a partially streamed code.

A stored solution normally produces C.T.
An absent answer produces C alone.
Use shortest-of encoding; do not force raw in user mode.
Raw mode is used only in deterministic golden tests.

### Exit contract

Keep current meanings:

- 0: complete result, including a proven complete smaller arrangement set.
- 2: valid partial/cancelled result.
- 1: invalid arguments or no usable result/output failure.

A partial pack emits codes for its accepted puzzles and keeps exit 2.
A code-output failure is reported on stderr and is not called a successful copy.
Do not make a valid partial generation appear complete merely because its codes encode.
Do not rewrite generation history to make a seed seem to reproduce a later batch.

### Shared snapshot/codec calls

```ts
const snapshot = puzzleSnapshot({
  rows: pack.board.rows,
  pieces: pack.pieces,
  puzzle: pack.puzzles[index],
  index,
  rotation: pack.presentation?.rotation ?? 0,
  untitled: n => `Puzzle #${n}`,
});
const encoded = await encodePuzzleCode(snapshot.data);
stdout(encoded.F + '\n');
```

`puzzleSnapshot` comes from `core/browser/puzzle-snapshot.js` and must remain
Node-importable/pure for this operation. It does not create a worker or read DOM
merely because it was imported.
`encodePuzzleCode` comes from `core/engine/puzzlecode.js`.
Node may run that pure codec directly; the no-main-thread rule concerns browsers.

The encoded DTO is `{C,T,F,version}`.
Version 2 compressor bytes are not canonical across engines.
Compare decoded content/fingerprint for compressed browser parity.
Do not require a Node zlib stream to be byte-identical to every browser stream.

### Snapshot data

The wire input contains only:

- rows including margins;
- effective angle;
- ordered pieces with ID/label/RGB/stored cells;
- original clues;
- stored solution or null;
- complete rating/certificate claims or null;
- the resolved title or null.

No seed, history, witness, timestamps, generation metadata or other puzzle is encoded.
The original pack JSON is not mutated by title resolution or code generation.
Use the shared heading rule: #n for untitled puzzles, no automatic ordinal for
unnumbered titles longer than 75 code points, and an exact source-position title.

The consumer API and parity vectors are inlined next. RP01 is the only encoder;
this task does not re-specify the wire format.

## Codec consumption contract — no second encoder

RP01's implementation is the only encoder/decoder. This task consumes its public
API; do not copy bit I/O, CRC, ranking, compression, palette or catalogue logic.
RP01's task is normative for codec internals. The following consumer contract and
parity fixtures are sufficient for this CLI work.

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
  candidate?: CodeCandidate;
};
type CodeCandidate = {
  component: 'core' | 'tail';
  group: number;
  position: number;
  expected: string;
  typed: string;
  correctedCode: string;
};
class PuzzleCodeError extends Error {
  code: string;
  params?: Record<string, string | number>;
  candidate?: CodeCandidate;
}
encodePuzzleCode(
  snapshot: PuzzleCodeSnapshot,
  options?: { compression?: 'auto' | 'raw' }
): Promise<EncodedPuzzleCode>;
decodePuzzleCode(text: string): Promise<DecodedPuzzleCode>;
```

Both functions are imported from `core/engine/puzzlecode.js`.
Pack is the existing normalized `pentomino-pack` version1 type.
The decoded pack has one puzzle and is already validated.
A bad core/encoding request throws a typed PuzzleCodeError with a code.
A valid core with a damaged tail returns tailError; parity tests must not accept
that as a successful full-answer round trip.
Do not catch an unexpected failure and emit an empty line as a code.

F is exactly C or C plus dot plus T, ungrouped and uppercase.
The CLI prints F, not C unconditionally and not a serialized object.
Native auto-compression may select version2; raw wins a tie.
A missing compressor falls back to raw for encoding.
A missing decompressor cannot decode a version2 input and is reported honestly.
Raw is deterministic for a given snapshot.
Compressed bytes may differ by engine; their decoded content must not differ.

The shared `puzzleSnapshot` from RP05 resolves title, angle and original data.
Its `.data` is the exact argument to encodePuzzleCode.
Do not duplicate the heading algorithm inside tools/generate.mjs.
Never mutate the generated Pack when preparing a snapshot.
Snapshot rows include the authored board margins.
Piece IDs/labels/RGB/order/reference cells and original clues remain unchanged.
No current move, seed, timestamp, witness or other puzzle belongs in a code.
A source answer is carried when present; no solver is run to invent one.

## Explicit CLI output-helper seam

Extract this small testable helper in the existing CLI module:

```ts
emitGeneratedResult(
  pack: Pack,
  config: { code: boolean; output?: string },
  io: {
    stdout(text: string): void;
    stderr(text: string): void;
    writeText(path: string, text: string): void;
  }
): Promise<void>;
```

The helper receives an already accepted/validated generation result.
It does not choose a generation exit code or invoke a new generation.
The existing run function keeps responsibility for complete/partial/cancelled exits.
Output or encoding exceptions propagate to run's existing failure handling.

Implement in this order:

1. In code mode, prepare all snapshots and code lines before writing stdout.
2. Reject an encoder failure instead of emitting a partial code token.
3. If --output is set, write original packText(pack) to that file.
4. Preserve the existing file-written diagnostic on stderr.
5. In code mode, write the ordered F lines with final newlines.
6. Otherwise keep the existing pack-JSON stdout/file behaviour exactly.

No labels, indices, JSON quoting or progress belong between code lines.
A help request retains the existing usage output rather than generating a code.
Do not change the source Pack's title or replace it with the snapshot title.
A partial generation with accepted puzzles still emits those puzzles and exits2.
No usable generation still exits1 without inventing a puzzle.

## Consumer tests with injected sinks

Use the existing run overrides and the helper above to separate output policy
from generation. Most tests need only fixture data, not a live generator.

| Mode | File sink | Standard output | Required property |
|---|---|---|---|
| Default | None | Existing pack JSON | Backward-compatible bytes |
| Default | --output | No pack JSON on stdout | Original file output |
| --code | None | Ordered F lines | One line per accepted puzzle |
| --code | --output | Ordered F lines | Original pack also saved |
| --help | Any ignored generation input | Existing help path | No generation |
| Invalid arguments | None | No valid-result data | Existing exit1 |
| Valid partial | Optional file | Accepted puzzle codes | Exit2 retained |
| Encoder failure | Optional file | No malformed code | Failure reported |
| File-write failure | File throws | No false success | Exit1 |
| Stdout-write failure | Optional file | Exception reported | Exit1 |

Assertions for every fixture code:

- Nonempty ASCII uppercase canonical output.
- No embedded whitespace or newline within F.
- A final newline separates every emitted puzzle.
- The count of lines equals accepted puzzle count.
- Line order equals source puzzle order.
- Core-only source stays core-only.
- A carried full answer is valid for its own clues.
- Decoded rows preserve width, height and blocked margins.
- Decoded ordered identities match source RGB values, labels and IDs.
- Clue occupied cells match, allowing symmetric pose notation.
- Display angle and resolved heading match the shared snapshot.
- Full claims survive, including foreign/censored metrics.
- The source Pack has not been modified.
- A full-code parity test requires tailError=null.
- Progress fingerprint is unchanged.

Do not compare a public custom puzzle ID that the decoder intentionally recomputes.
Do not treat the existence of a compatible answer as a uniqueness proof.
Do not compare floating H bits across different engines beyond the agreed
qualification; visible level and score remain exact.

## Fixture preparation and parity vectors

The first three strings below are the canonical raw outputs for the existing
sample after RP05's source-position snapshot rule. The hand-authored example is
an additional consumer check. Force raw only in the golden test seam.
For ordinary CLI mode, compare these values after decoding if auto selects a
different valid compression representation.

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


## Failure and integration boundaries

The CLI consumes codec failures; it does not translate them into browser UI text.
Report a concise diagnostic on stderr and preserve the existing exit contract.
Do not send an error message through stdout where a downstream consumer expects F.
Do not catch a programming error and fall back to the source seed.
Do not make a same-browser library link as a fallback.
Do not fetch the printed/copied public URL during a unit test.
The browser parity harness decodes locally with RP02's real worker.

The optional CLI remains in scope in wave5 and is release-non-blocking.
The orchestrator may defer its dispatch rather than delay the browser feature.
That is an explicit execution status, not removal from this pack.
Do not advertise --code until this task's implementation is accepted.
If dispatched alongside RP06, use only targeted tests and owned-file conventions
until the orchestrator declares the wave write barrier.

## Files to create/modify

- `tools/generate.mjs`
- `tests/puzzlecode-cli.test.js`
- Existing CLI tests only where new flag coverage belongs
- `tests/browser/puzzle-code-cli-parity.html`
- `tests/browser/puzzle-code-cli-parity.js`

Do not modify the core codec, shared snapshot, browser UI, workers or vendor files.
RP06 can run in parallel because it owns different source/test files.
Documentation ownership is serialized through the orchestrator.

## Living-document updates

Update both living specs in the same change:

- Brief: the optional headless code output exists, if implemented.
- Detail: `--code` output and unchanged generation/empty-history semantics.
- Do not claim `--batch-index N` replays previous batches; it starts with empty history.
- README CLI usage includes flag behaviour, one code per puzzle, output destination,
  stdout/stderr separation and exit codes.

If the orchestrator defers this task, do not advertise the flag anywhere.
The checklist must record the explicit optional deferral.

## Implementation steps

1. Extend the known-flag list and boolean parser.
2. Allow the flag as a recipe transport option.
3. Keep it out of semantic Config payloads sent to the generator.
4. Isolate an output helper that consumes a validated Pack and injected sinks.
5. Resolve each puzzle through the shared snapshot helper.
6. Encode each accepted puzzle through the core codec.
7. Route lines and pack JSON according to the explicit mode contract.
8. Preserve exits and stderr progress/error messages.
9. Update usage and comment documentation.
10. Add fixture-driven parser/output tests.
11. Add one bounded real CLI smoke with the existing accepted recipe.
12. Add browser decode parity for emitted fixture codes.
13. Update living docs/README through the documentation slot.
14. Hand off without committing.

## Acceptance criteria — Business

- **RP07-B01:** Each line recreates exactly one accepted puzzle.
- **RP07-B02:** Every accepted puzzle has one complete line, in pack order.
- **RP07-B03:** A browser opens the emitted core/full representation correctly.
- **RP07-B04:** Existing users without the flag see unchanged output.
- **RP07-B05:** Pack JSON output remains available alongside codes.
- **RP07-B06:** Partial runs stay partial and retain their accepted results.

## Acceptance criteria — Technical

- **RP07-T01:** Flag parsing is strict and recipe-compatible.
- **RP07-T02:** stdout contains only the selected machine-readable format.
- **RP07-T03:** Generation inputs/versions/histories remain unchanged.
- **RP07-T04:** Encoders and snapshot rules are not duplicated.
- **RP07-T05:** Raw golden tests match exactly.
- **RP07-T06:** Compressed parity compares semantic content, not compressor bytes.
- **RP07-T07:** Output failures never produce a success exit.
- **RP07-T08:** All targeted/repository/browser checks pass.

## Test plan

### Commands

```powershell
node --test .\tests\puzzlecode-cli.test.js
```

Run the owned-file convention check in `check-list.md` Section3.
Whole-tree `npm run check`, `npm run test:quick` and `npm test` are orchestrator
gates after the wave code-ready barrier, not concurrent developer commands.

Bounded real smoke, with outputs in the project:

```powershell
New-Item -ItemType Directory -Force .\tests\artifacts\RP07 | Out-Null
node .\tools\generate.mjs --recipe .\tests\fixtures\generation-case.json --workers 1 --code --output .\tests\artifacts\RP07\pack.json
```

Capture stdout and stderr separately in the test runner.
Do not depend on a PowerShell redirection's implicit text encoding for a golden.
Use the injected sinks or Node child_process byte buffers.

### Required tests

- Help includes the flag and exact output/exit explanation.
- No flag: the existing pack JSON stdout/file behaviour is unchanged.
- Flag alone: code lines only on stdout.
- Flag plus output: pack file plus code lines, no interleaved JSON.
- Recipe plus flag accepted.
- Duplicate flag and value-bearing boolean forms rejected.
- Invalid recipe/board arguments remain rejected.
- Count one emits one code.
- Several puzzles emit one code each in the same order.
- A fixture without a stored answer emits core only.
- A valid partial result preserves exit 2 and accepted lines.
- Output sink failure is reported and not swallowed.
- Source pack fields and arrays are not mutated.
- Source positions 2/3 preserve displayed titles through shared snapshot rules.
- A maximum-title and foreign-claim fixture still encodes.
- Core and full decoding produce the same fingerprint.
- Worker counts 1 and 4 do not alter the semantic input/output puzzle.

Use fixture packs and injected sinks for most tests.
Do not run a fresh generation for every formatting assertion.
Tag the real generation smoke as slow if it is included in Node tests.
Do not weaken a failed generation expectation by accepting an empty output.

### Browser parity harness

The external-module harness receives fixture code lines, decodes them through
RP02's real worker and compares board rows, ordered identities, clues, angle,
complete claims, solution and fingerprint with the fixture.
Use the existing sample's three puzzles and the hand-authored fixture.
Include a DEFLATE example; bytes may differ, decoded values may not.
The harness sets final `<html data-result="pass|fail">` and data-summary.
Do not fetch a remote code URL; all comparisons/navigation are local.

### Exact serving and CDP procedure

Use only `check-list.md` Section7 for the executable, fixed ports, disposable
profile, server command, native CDP runner and owned-PID/profile cleanup.
RP07's harness is `tests/browser/puzzle-code-cli-parity.html`.
Save verdict, summary and browser/error evidence under `tests\artifacts\RP07\`.

## Definition of done & handoff

### Reproducible output-policy test setup

Use a fresh in-memory array for stdout calls and another for stderr calls.
Use an in-memory map for writeText path/content pairs.
The fixture Pack is cloned before each call.
Keep an immutable reference clone for mutation assertions.
Call emitGeneratedResult directly for formatting and sink-failure cases.
Call run with its existing overrides for parsing and exit-code cases.
Do not bypass the real codec in semantic parity tests.
Do not invoke a solver merely to test line endings.

For a two-puzzle fixture:

1. Supply indices zero and one from a validated source pack.
2. Compute expected snapshots with RP05's pure helper.
3. Join captured stdout calls before splitting output lines.
4. Remove only the final empty split element caused by the final newline.
5. Require two nonempty lines, in source order.
6. Decode each line through the real codec.
7. Compare each decoded puzzle with its own snapshot, not its neighbour.
8. Require no JSON brace, label prefix or progress message in stdout.
9. With --output, require exactly one original pack-JSON file write.
10. Compare that saved pack with packText of the untouched source.

For a partial-result fixture:

1. Supply an accepted nonempty partial result through the existing run seam.
2. Require exit2, not exit0.
3. Require one code for every accepted puzzle and no placeholder for failures.
4. Require the existing partial/progress explanation on stderr.
5. Repeat without --code to protect legacy JSON output.

For output failures:

1. Inject a writeText function that throws a distinctive test error.
2. Require run's failure exit and a stderr diagnostic.
3. Do not accept a success diagnostic after the failed write.
4. Inject a stdout sink failure separately.
5. Confirm no swallowed rejection or unhandled Promise remains.

For Node/browser parity:

1. Record the source fixture and the emitted F together.
2. Load the browser harness through the shared Section7 CDP procedure.
3. Decode the exact captured F, rather than regenerating it in the browser.
4. Compare canonical geometry/identity/claims and the progress fingerprint.
5. Require tailError=null whenever the Node line carried a tail.
6. Accept different valid DEFLATE bytes only when decoding them independently.
7. Record the Node and Edge versions with the evidence.

Before dispatch, the orchestrator compares the API and retained vectors here
with RP01. Any mismatch is corrected in the task before implementation, rather
than resolved by a private encoder inside the CLI.

- All criteria and output modes have evidence.
- Old default CLI behaviour is unchanged.
- Browser parity is based on content and validated Pack data.
- Optional feature status is explicit in the checklist and README.
- No dependency, schema or generation-policy change occurred.
- The orchestrator receives the new flag/output contract and evidence.
- No developer commit or push was made.

## Execution log

| Field | Value |
|---|---|
| Status | Done (optional task, accepted) |
| Start | 2026-10-25 23:56:23 (+07:00) |
| End | 2026-10-26 00:10:25 (+07:00); code-ready ≈ 00:07, living docs 00:08–00:10 |
| Duration | 14 min 01 s |
| Model | claude-sonnet-5.5 (sub-agent `RP07-cli`, general-purpose); wave 5, in parallel with RP06 (held the documentation slot first) |
| Token usage | 77 model calls; 11,420,154 input (11,196,377 cache read), 96,347 output |
| AI credits | 264.25 AIU (local usage store, keyed by sub-agent id) |
| Verification | Developer: `node --test tests\cli.test.js tests\puzzlecode-cli.test.js tests\bq-limits.test.js tests\benchmark-report.test.js` 79/79 (`puzzlecode-cli` 29/29, 26/26 without slow); scoped `checkText` on owned files and the three living docs OK; real smoke `--recipe … --workers 1 --code --output` exit 0, 10 lines, pack written (`tests/artifacts/RP07/`); parity harness `tests/browser/puzzle-code-cli-parity.html` in headless Edge 156 (`--disable-extensions`, ports 8707/9207) → pass, 15/15, 0 CDP errors — the browser encoder is byte-equal to the CLI line 4/4, the captured lines (full, core-only, DEFLATE, 24×24 oracle) decode in the real worker, a deliberate mutation failed as expected. Orchestrator at the wave barrier: full `node --test "tests/**/*.test.js"` 1,120 pass / 0 fail (48.4 s); `npm run check` OK. |
| Acceptance | Business and technical criteria met: `--code` prints one canonical uppercase `F` per accepted puzzle in pack order, built with the same snapshot and codec as Print; `--output` and stderr behave as before; without the flag stdout and files are byte-identical; exit codes unchanged (a partial run keeps exit 2 and the same stderr); the pack is not mutated; worker messages and packs identical with and without `--code`. |
| Issues & resolutions | (1) Optional `encode` field on the run/helper `io` as a test seam (goldens force `compression: 'raw'`; failure tests inject an encoder error); the shared codec is the default — not a second encoder. (2) Encoding happens before the `--output` write, so a failed encode leaves no pack file (task order). (3) The 4-worker slow test runs in-process to avoid the known 0xC0000005 crash of fresh 4-worker child processes; child-process smokes use `--workers 1`. (4) Living docs: design-brief puzzle-code paragraph (one sentence); design-detail D43, §9.8 intro and a new "Command-line output" bullet, §8.6 corrected (`--batch-index N` only selects the seed `<seed>#N` with an empty history; earlier batches are not replayed), §13.2 `puzzlecode-cli` row, §13.3 item 22; README headless-generation bullet with an example and the test-page lists (EN/VI). |
| Handoff | `emitGeneratedResult(pack, { code, output }, { stdout, stderr, writeText, encode? })` and the `--code` flag in `tools/generate.mjs`; in user mode the CLI emits exactly the four frozen raw goldens for the sample and hand-authored puzzles; `tests/artifacts/RP07/run-harness.ps1` and `cdp-run.mjs` reproduce the parity run (reads `tests/fixtures/puzzlecode-v1.json`). |

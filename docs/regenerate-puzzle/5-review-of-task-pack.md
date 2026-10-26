# Phase 5b — Review of the implementation task pack (architect-1)

- **Subject:** `tasks/regenerate-puzzle/` (RP01–RP08 and `check-list.md`), written by architect-2 from the signed-off
  design `docs/regenerate-puzzle/4-final-report.md`.
- **Reviewer:** architect-1, 2026-10-25, 20:00–20:30.
- **Method:** programmatic comparison of the task files with the report, the reference codec and the repository
  (scripts `r6-*.mjs` in the architect-1 session scratch folder, not in the repository), plus a targeted read of every
  task's contracts, ownership lists, documentation slots and test plans. I did not edit any task file.

## Verdict

**Approve with fixes.** The pack is faithful to the signed-off report: every wire detail, frozen table, golden and
negative vector, QR pin and EN/VI text I could compare matches exactly, and the contracts name real repository
functions. There is **1 blocker**, **2 major** and **9 minor** findings. None of them changes the design; all are text
fixes in the task files. Two of them need a recomputed digest, given below. Fix T5-01 to T5-03 before RP01/RP04 are
dispatched; the minor ones can be applied in the same edit.

## 1. What was verified

| # | Check | Method | Result |
|---:|---|---|---|
| V1 | Golden and negative vectors | Every code string in every task file was extracted and decoded with the reference codec (`final-v1.mjs` / `pcode-v1.mjs`) | All 11 positive codes decode; the 5 negative vectors are rejected with their documented category (structure ×3, invalid ×1, bad code ×1). Every report vector is present in the tasks |
| V2 | Extra large-puzzle oracle (243 characters, `1EG2H6A2…447TZG`, RP01/04/07/08) | Decoded and compared with RP01 "Self-contained large-puzzle oracle" | Matches: fingerprint `cdc9a3c0…4425`; 30 pieces of sizes 20, 19, 19, …, 10, 10; clues I (16,5) t2 mirrored, P (5,0) t1 mirrored, Z (14,11) t3, AL (4,20) t2; rating 102, `hell-1`, saturated, rowTrials 5,164, R 520, H 10.850818759479644 |
| V3 | Frozen constants | Token comparison of tasks against report §5.5, §5.9, §5.11 | CRC-20 (poly 0x6C1BD, init/xorout 0xFFFFF, check 0xC80C0, residue 0x6CDCE), alphabet, 30 score thresholds, 11 band edges, 20 base colours, catalogue counts and hash `049504…ae34`: identical |
| V4 | RP01 128-row palette table | Compared with live `colorFor` / `labelFor` (`core/engine/palette.js`) | 128 rows, 0 mismatches; labels A … DX |
| V5 | QR pins | Hashing architect-2's pinned artifacts | Upstream qrcodegen 45,350 bytes `2511bc17…9480`; jsQR 256,885 bytes `bc40c8a1…0859`; licence 11,358 bytes `c6596eb7…ba08`; the five matrix hashes equal report §7.3; the adapted digest `26ce5060…3f22` reproduces the RP04 recipe exactly (but see T5-01) |
| V6 | EN/VI texts | Key and text comparison with report §9 and §10.2 | No mismatch. Keys that RP06 only references are defined in RP05 |
| V7 | Inlined report sections | Section-by-section diff | §5.1–5.11 verbatim in RP01, RP07 and RP08; §5.6, 7.1, 7.2, 8.1, 10, 10.1, 10.2 verbatim in RP05/RP06; §5.10 in RP03. Only §5.12 is adapted: scratch-file references are replaced by an inline oracle, which is correct |
| V8 | Error vocabulary | Code-token comparison | RP01–RP03 use exactly the report's 11 codes (`bad-char`, `dots`, `empty`, `index`, `invalid`, `no-deflate`, `tail-check`, `tail-invalid`, `tail-tag`, `too-long`, `version`); RP02 adds `worker-unavailable` and `worker-error`; RP04 adds `qr-invalid-input` and `qr-too-long` |
| V9 | Repository facts | Path/line scan (`r6-paths.mjs`) and reads | Every existing path exists and no line reference passes the end of its file. The 37 new paths each appear in one owner's list. Verified APIs: `createPool`/`beginRequest`/`endRequest` (`core/browser/worker-pool.js:61`, `:62`, `:189`), `executeTask` (`core/engine/tasks.js:156`), `createTaskHandler` (`:285`), `readIncoming` (`core/browser/handoff.js:180`), `progressFingerprint`/`puzzleId` (`core/engine/keys.js:462`, `:478`), `validatePack`/`parsePack`/`serializePack`/`createPack` (`core/engine/pack.js:1082`, `:1135`, `:1297`, `:1322`), `parseLocationHashResult` (`core/engine/sharecode.js:288`), the eight transforms (`core/engine/geometry.js:13`), first-occurrence `distinctOrientations` (`:144`), `tools/serve.mjs` `--port`/`--prefix` (`:206`), the `slow` skip pattern of `test:quick`, `tests/artifacts/` in `.gitignore` |
| V10 | UI ownership | Read `player/index.html` and the panels | Both apps build their controls in JavaScript (`player/index.html` has only `#app`), so no HTML file is missing from an ownership list |
| V11 | Living specifications | Documentation-slot sections of every task | Complete; see Section 4 |

## 2. Findings

| ID | Sev. | Task file + section | Issue | Evidence | Exact fix |
|---|---|---|---|---|---|
| T5-01 | blocker | `04-qr-adapter-and-vendored-tests.md`, "Vendoring instructions › Runtime encoder" (lines 335–354); RP04-T15 (line 626) | The adaptation recipe keeps five upstream lines that end in a space. `npm run check` scans `core/**/*.js` (`tools/check-conventions.mjs:8`, rule at `:59`–`:64`) and fails. A developer who follows the recipe and matches the pinned digest therefore cannot pass RP04-T15 | `checkText('core/browser/vendor/qrcodegen.js', recipe)` reports trailing whitespace at lines 52, 640, 644, 790 and 816 (`version, `, `mode, `, `numChars, `, `ordinal, `, `modeBits, `; all inside parameter lists, so removing the space is semantically inert) | Add a step after "2. Normalize line endings to CRLF": "Remove spaces and tabs at the end of every line (exactly upstream lines 52, 640, 644, 790 and 816)". Replace "46,212 bytes" and `26ce5060…3f22` by **46,207 bytes**, SHA-256 `c5b15113a4ec416ba65d1a75acd664d74d8f187a081c46bb622590bef2f971c2` (CRLF form) and add the LF-canonical form: **45,368 bytes**, SHA-256 `68453133c5cffbaebe89cdfba48f1bb0918535335bae75adfbdbfde2a8b318f5`. Verified: the stripped module still produces the sample #1 matrix `8fd29495…` (version 5, 37 modules) and passes `checkText` with no problem |
| T5-02 | major | RP04, RP04-T03 (line 614) and "Independent test decoder" (lines 427–431) | A provenance test that hashes the vendored encoder's bytes on disk will fail in CI. The repository's workflow (`.github/workflows/pages.yml:14`) runs `node --test "tests/**/*.test.js"` on `ubuntu-latest` with Node 22, and `.gitattributes` is `* text=auto`, so a CI checkout has LF endings. Only a Windows checkout with `core.autocrlf=true` (this machine) has CRLF | Workflow and `.gitattributes` read; RP04 already prescribes LF canonicalisation for jsQR, but not for the encoder | RP04-T03: "Provenance tests hash the vendored files after replacing CRLF by LF and compare with the LF-canonical digests: encoder `68453133…18f5` (45,368 bytes, T5-01), jsQR the upstream `bc40c8a1…0859`. The CRLF digest is informative only." Mention that CI runs every test, including the ones tagged `slow`, on Node 22 |
| T5-03 | major | `01-single-puzzle-codec.md`, "Public exports" (lines 149–153) and the inlined §5.8 step 1 (lines 556–560); `02-worker-code-service-and-player-route.md`, "Route rules" (lines 422–465) | The single `p`-route implementation has no owner and the two tasks contradict each other. RP01 (wave 1) must parse pasted links "with `parseLocationHashResult`", but today that parser ignores `p` and answers `no-incoming` for `#p=…` (`core/engine/sharecode.js:296`–`:317`), and RP01 may not edit `sharecode.js` (RP02 owns it). RP02 keeps `parseLocationHashResult` as the authority and never mentions RP01's input module. Their error codes also differ (`index`/`invalid` versus `invalid-index`/`invalid-hash`/`no-incoming`). Percent-decoding appears only in RP02 | Read of both tasks and of `sharecode.js:288`–`:333`; `HASH_INDEX = /^(?:0\|[1-9][0-9]{0,5})$/` (`:25`) | Make RP01 own `parsePuzzleHash(hash: string): { ok: true, value: { p: string, index: 0 } } \| { ok: false, code: 'index' \| 'invalid', message: string }` in `core/engine/puzzlecode-input.js`, with these rules: body after the first `#`; split on `&`; the key is the text before the first `=`; keys are case-sensitive; the known keys are `p`, `pack`, `lib` and `i`; unknown keys are ignored; a repeated known key, `p` together with `pack` or `lib`, or a missing or empty `p` gives `invalid`; `i` absent or exactly `0` gives index 0; another value matching `HASH_INDEX` gives `index`; any other `i` gives `invalid`; the `p` value is decoded once with `decodeURIComponent` (a `URIError` gives `invalid`; `+` stays `+` and later fails as `bad-char`). Then apply §5.8 steps 2–4. `normalizePuzzleCodeInput` uses it for text containing `#`. In RP01's inlined §5.8 replace "(`parseLocationHashResult`, `core/engine/sharecode.js:288`)" by "(`parsePuzzleHash`; RP02 makes `parseLocationHashResult` delegate to it)". In RP02: when `p` is present, `parseLocationHashResult` delegates to `parsePuzzleHash`, maps `index` → `invalid-index` and `invalid` → `invalid-hash`, and returns `{ p, index: 0 }`; one shared table-driven test runs the same hashes through both entry points |
| T5-04 | minor | `03-player-code-entry.md`, "Browser client" (line 272); `06-copy-single-puzzle-link.md`, "Preparation API" (line 162) | Copied contracts start with the imperative "Create" for files that another task owns: `core/browser/puzzle-code-client.js` belongs to RP02 and `core/browser/puzzle-snapshot.js` to RP05. A literal developer may re-create them | Ownership lists: RP02 and RP05 "Files to create/modify" | Reword to "RP02 created `core/browser/puzzle-code-client.js` with this contract (read-only for this task):" and "RP05 created … (read-only for this task):" |
| T5-05 | minor | Inlined report sections in RP01/RP07/RP08 (§5.1–5.11), RP05/RP06 (§5.6, 7.x, 8.1, 10.x) and RP03 (§5.10) | The verbatim copies keep references that the task does not contain: "Section 6", "7.3", "8", "8.1", "10.1" in RP01/07/08; "5.10", "5.11", "5.12" in RP05; "8.1", "5.11" in RP06; decision ids D2, D7, D8, D9, D16, D17, D22. They also name prototype files: `final-v1.mjs` / `pcode-v1.mjs` (§5.4) and `r4-deflate.mjs` (RP01 line 326) | Reference scan of the task files | Before each inlined block add: "Section and decision references (Section n, Dn) point into `docs/regenerate-puzzle/4-final-report.md` and are informative; everything normative for this task is inlined here." Replace the prototype file names by "the design prototype (not in the repository)" |
| T5-06 | minor | `07-optional-headless-code-output.md` "Inlined normative wire contract"; `08-cross-app-acceptance-and-release.md` (same block) | RP07 (49 KB) and RP08 (54 KB) each repeat the whole bit-level contract although RP07 must not implement an encoder and RP08 tests through public APIs. Three copies of a normative text can diverge when one is corrected, and they load the developer's context with irrelevant detail | Today the three copies are identical (V7) | RP07: replace the block by RP01's public API (`encodePuzzleCode`, `decodePuzzleCode`, the DTOs), the rule "the codec is the only encoder", and the parity vectors (samples #1–#3 and the 243-character oracle with their expected F). RP08: keep §5.10 limits, §5.12 vectors, the oracle facts and the texts; mark any remaining copy "identical to RP01; RP01's copy is normative". Add a check-list step: "Before dispatching RP07/RP08, diff their inlined contract with RP01's" |
| T5-07 | minor | `05-print-snapshot-dialog-and-sheets.md`, "Owned helper API" and "Preparation API" (lines 66–215) | RP07 requires `core/browser/puzzle-snapshot.js` to be importable in Node without a DOM, worker or locale side effect (RP07 lines 127–129), but RP05, its owner, does not state that constraint | Read of RP05 and RP07 | Add to RP05: "`core/browser/puzzle-title.js` and `core/browser/puzzle-snapshot.js` import nothing that touches `document`, `window`, `Worker` or locale state at import time. `puzzlePlayerTarget` receives `pageBase` as an argument. `preparePuzzleShare` receives its client. A Node test imports both modules and calls `puzzleSnapshot` (consumers: RP06, RP07)" |
| T5-08 | minor | Browser test sections of RP02–RP08 (for example RP02 lines 753–777) | The headless browser is not fully specified: there is no executable path, and the profile directory is a placeholder (`--user-data-dir=<approved RPxx profile directory>`) | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` exists on this machine; `.gitignore` has `tests/artifacts/` | Give the path `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` and the profile `tests\artifacts\RPxx\edge-profile`. Record the PIDs of `serve.mjs` and Edge and stop only those |
| T5-09 | minor | `check-list.md`, "Ready waves" (lines 31–45) | Waves 1 and 5 run two tasks in one working tree, but `npm run check` and `npm run test:quick` scan the whole tree. Each task therefore sees the other's unfinished files: for example, RP01's check fails on RP04's half-adapted vendor file (T5-01) | `SCOPE_DIRS` (`tools/check-conventions.mjs:8`); `test:quick` runs every `tests/**/*.test.js` except the `slow` ones (`package.json`) | Add: "In a parallel wave, acceptance uses the task's targeted commands. Whole-tree checks run at handoff. A failure that lies only in the other task's owned files is reported to the orchestrator, not fixed" |
| T5-10 | minor | RP02, "Existing architecture" (lines 104–108) | The asynchronous codec tasks need one more precise rule. `createTaskHandler.handle` (`core/engine/tasks.js:319`–`:351`) clears `current` in a synchronous `finally`, and memory progress depends on `current` (`:309`–`:313`). The worker entry's comment "Every task runs synchronously" (`core/workers/engine.worker.js:1`–`:3`) becomes false, but that file is not in RP02's list | Read of `tasks.js` and `engine.worker.js` | Add: "`current` stays set until a returned Promise settles; the result or error is posted once, after settlement; existing synchronous tasks keep their exact control flow. Update the comment in `core/workers/engine.worker.js` (add that file to RP02's ownership; comment only)" |
| T5-11 | minor | RP01 header and "Implementation steps" (lines 937–960) | RP01 is the largest single run: 57 KB of specification. Production code with JSDoc, typed errors, streaming bounded DEFLATE, candidate lookup and property tests is likely 1,500–2,500 lines; the dense prototype alone has about 750 lines | Sizes in Section 5 | Keep one task, but add a checkpoint: steps 1–12, raw goldens and negative vectors form an intermediate handoff that the orchestrator checks; steps 13–17 follow. If the run fails after the checkpoint, split the rest out as "RP01b — DEFLATE, correction candidates, property tests" with the same ownership |
| T5-12 | minor (optional) | `check-list.md`, waves | The critical path has six waves. The only orderings that no data dependency forces are RP05 after RP03 (they share Player files) and RP07 after the whole of RP05 (RP07 only needs `puzzleSnapshot` and the heading rule) | Dependency analysis, Section 3 | Optional: split RP05 into RP05a (`puzzle-title.js`, the heading change in both apps, `puzzle-snapshot.js`, `preparePuzzleShare`, Node tests) and RP05b (dialog lifecycle, layout, sheets, browser harness). RP07 then depends on RP01 and RP05a. Keep the current plan if the orchestrator prefers fewer handoffs |

## 3. Dependencies, waves and ownership

- **Disjointness:** the ownership lists of the tasks in the same wave are disjoint (wave 1: RP01 codec files against
  RP04 QR/vendor files; wave 5: RP06 app files against RP07 `tools/generate.mjs` and its tests). Shared living
  documents are serialised by the documentation-slot lease. The check-list's "do not run concurrently" rules for
  RP03/RP05/RP06 match the real overlaps (`player/app.js`, Player and Generator locales,
  `generator/ui/puzzle-panel.js`).
- **Order:** RP02 needs RP01's API; RP03 needs RP02's client and controller method (`loadPuzzleCode`, defined in RP02
  lines 532–546); RP05 needs RP01, RP02 and RP04; RP06 needs RP05's `preparePuzzleShare`. The order is therefore
  correct. It is conservative only where T5-12 says.
- **Parallel runs in one tree:** see T5-09.

## 4. Living specifications

| Visible change | Owner | Task section |
|---|---|---|
| Code format, bounds, decoded Pack without schema change; a seed alone is not reconstruction | RP01 | Documentation slot, lines 925–933 |
| `#p=` route, parser rules, atomic failures, code against URL limits | RP02 | Documentation slot, lines 603–614 |
| Entering a code in the Player, correction candidate, progress notice; README "Using the Player" | RP03 | Documentation slot, lines 534–542 |
| QR generated locally, segments, error correction, size, vendored modules and licences | RP04 | Lines 563–568 |
| Printed code and QR, first-sheet/continuation/duplex layout, snapshot, untitled "Puzzle #n" / "Đề #n", no automatic number for titles over 75 code points, Generator printed heading = displayed title (for example "Hard #3"), seed line removed, no-code notice; README Printing | RP05 | Documentation slot, lines 551–565 |
| "Copy this puzzle link" in both apps, default target, whole-URL limit, difference from whole-pack links; README | RP06 | Lines 445–452 |
| CLI `--code`; README CLI usage | RP07 | Line 719 |
| Final corrections to match the shipped feature | RP08 | Lines 756 and 780 |

Every visible change that the report names (Section 11, "Visible changes outside the code", and Section 12) has an owner. RP01 and RP02 correctly forbid describing the
entry and print UI before their owners land them.

## 5. Task sizes

| Task | Specification | Expected work | Assessment |
|---|---|---|---|
| RP01 | 57.0 KB, 1,151 lines | Complete codec and tests, 1,500–2,500 lines | Largest; one run with a checkpoint (T5-11) |
| RP02 | 28.4 KB, 822 lines | Protocol, task handler, route, client, hand-off, controller, browser harness | Medium; fine |
| RP03 | 32.1 KB, 767 lines | Entry dialog, Player wiring, texts, harness | Medium; fine |
| RP04 | 27.2 KB, 825 lines | Adapter (about 200 lines), vendoring, tests | Small to medium; fine after T5-01/T5-02 |
| RP05 | 38.6 KB, 792 lines | Heading move, snapshot and preparation, dialog lifecycle, layout and sheets in both apps | Large and the most cross-cutting; fine, optional split (T5-12) |
| RP06 | 26.9 KB, 644 lines | Copy helper, two controls, harness | Small; fine |
| RP07 | 49.4 KB, 916 lines | One flag, 100–200 lines plus tests | Small task with an oversized specification (T5-06) |
| RP08 | 54.4 KB, 983 lines | 800–1,400 lines of tests and evidence | Large but test-only; fine |

## 6. RP07 recommendation

Keep RP07 in the pack as an **optional, non-blocking** task in wave 5. It is cheap and low-risk: one flag that calls
the existing codec. It gives an independent headless check that the browser and Node produce the same content, and a
way to produce codes for test corpora without a browser. The check-list and RP08 already treat it correctly ("accepted
or deferred", `check-list.md:26`, RP08 line 766). Apply T5-06 before dispatching it. Do not let it delay the release:
if wave 5 is short of capacity, defer it.

## 7. Not checked

- No task has been executed yet, so the browser harnesses, CDP scripts and physical print/scan steps were checked
  only for consistency with the repository (`tools/serve.mjs`, the Edge path, ports 8842–8848 / 8942–8948).
- New texts that exist only in the tasks (for example the worker failure messages of RP02/RP03) were checked for
  presence in both languages, not for wording.

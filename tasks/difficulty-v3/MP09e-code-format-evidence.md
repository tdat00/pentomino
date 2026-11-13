# MP09e — GC-P2 format evidence: the 676-cell code sizes and the duplicate-shape browser check

| Header | Value |
|---|---|
| ID | MP09e (last part of the activation milestone; the report's MP09 gate GC-P2, format part) |
| Depends on | MP09d2 (accepted and committed: `rate` and `MODEL` are v3, generated claims are full v3 claims); MP09b (summary claims in codes); MP09a1 (the `duplicate-shape` refusal in packs and codes) |
| Estimated size | Small–Medium: about 150–250 changed lines (the browser page about 60–90, the record about 100–150); about 30–45 minutes plus the gate runs (about 10–20 minutes of machine time) |
| Owner role | QA |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-22 (puzzle codes, summary claims, gate GC-P2 format part), RES-34 (two pieces of the same shape refused), RES-05 and C1 (b) (`censored`); check-list §4.2 D24, §7 (GC-P2, browser checks) |
| Gates owned | GC-P2, format part (check-list §7) |
| Implementation status | Not started |

## Goal & business context

A puzzle travels as a code in its link and on its printed QR code. With v3 a generated puzzle carries a richer rating,
so the owner needs evidence that the largest production puzzles (26 x 26 boards, 676 cells) still fit every limit of
the code, the link and the QR code: a code carries only the **summary** of a v3 rating (level, score, and the estimate
mark when the rating is an estimate), while the pack keeps the full metrics (RES-22). This task measures that on real
v3 puzzles and records it.

It also proves in a real browser what MP09a1 built in the engine: a puzzle code whose piece set has two pieces of the
same shape (a mirror image counts as the same shape) is refused by the real Player, with a message that names both
pieces, in English and in Vietnamese, and nothing opens (RES-34, owner decision SA2-Q-P03 / SA1-Q-P6).

No production code changes in this task.

## Scope

### In scope

- The size record `docs/difficulty-v3/codes-<date>.md` (`<date>` = the day of the run, `YYYY-MM-DD`) from 26 x 26
  puzzles generated with v3, through a scratch script under `tests/artifacts/MP09e/`.
- `tests/browser/puzzle-code-acceptance.js`: the summary rule in `claimsOf`, one summary assertion in the Generator
  journey, and the new duplicate-shape check.
- One run of `tests/browser/puzzle-code-acceptance.html` (main phase) in headless Edge; one regression run each of
  `tests/browser/puzzle-code-entry.html` and `tests/browser/puzzle-code-cli-parity.html` (not edited).

### Out of scope

- Any engine, app or locale change (a defect found goes back to its owner task as a fix round, check-list §2 step 5).
- The derived display rating and the estimate note (MP10b, the display part of GC-P2); the other browser pages.
- A compact v3 codec (RES-33); `tests/fixtures/puzzlecode-v1.json`, `tests/fixtures/puzzlecode-acceptance.json`
  (BA01-BA30 stay as they are) and `player/samples/sample-pack.json` (check-list D20).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Every browser check finishes within 1 minute and every page run within 10 minutes (`AGENTS.md`); a longer run has an
  error: stop it and find the stalled check.
- This task owns the GC-P2 format runs: `tools/generate.mjs` on 26 x 26 and the three browser pages, exactly as
  written in the test plan. **Announce to the orchestrator before starting them** (the Sudoku repository runs in
  parallel on the same machine; never two heavy runs at once): give the commands and the expected wall time (about
  10–20 minutes in total) in your plan, and start only when the orchestrator says the machine is free.
- Scratch files only under `tests/artifacts/MP09e/` and the throwaway Edge profile `tests\artifacts\edge-MP09e\`
  (git-ignored); never an OS temporary folder. Stop only the processes you started, by PID.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no absolute path in the record.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports,
  `plan.md` or `clarifications.md`.

## Inputs & context

### Code (anchors at HEAD `7604eff`; MP07 to MP09d2 do not change these lines unless stated)

- `core/engine/puzzlecode.js`: `createPuzzleCodec(deps)` (line 563; `allowDeflate: true` lets
  `compression: 'deflate'` force the version-2 form), `encodePuzzleCode(snapshot, { compression: 'auto' | 'raw' })`
  (590) returns `{ C, T, F, version }` (`T` null without a stored answer; `F = C` or `C.T`); it throws
  `PuzzleCodeError('too-long')` above `MAX_CODE_SYMBOLS`. `decodePuzzleCode(text)` (603). After MP09b,
  `partsFromSnapshot` (163) reduces a `difficulty-v3` rating to its summary `{ model, score, level, saturated: false }`
  plus `censored: true` when the full claim has it.
- `core/engine/puzzlecode-v1.js` (frozen format; exported): `BitWriter` (193), `writeEG` (349), `crc20Register` (521),
  `crc20` (540), `bitsToSymbols` (568), `checkSymbols` (581), `CRC20` (62, `xorOut`), `encodeCorePayload(parts)`
  (1519), `encodeTailPayload(parts)` (1719). `encode` in `puzzlecode.js` (228-270) frames a core as: version symbol
  (5 bits: 1 raw, 2 DEFLATE), the payload (raw) or `writeEG(pc, 8, deflated.length)` and the deflated bytes, zero fill
  to a multiple of 5 bits, then `C = bitsToSymbols(pc.bits) + checkSymbols(crc20Register(pc.bits, 0, pc.length) ^
  CRC20.xorOut)`; the tail `T` = the tail payload padded to 5 bits, then `checkSymbols(crc20Register(pt.bits, 0,
  pt.length, crc20Register(pc.bits, 0, pc.length)) ^ CRC20.xorOut)`. Native DEFLATE is
  `CompressionStream('deflate-raw')` (`deflateRaw`, 128-139; Node has it).
- `core/engine/puzzlecode-input.js:12`: `MAX_CODE_SYMBOLS = 16000`. `core/engine/sharecode.js`: `MAX_URL_CHARS = 16000`
  (11), `WARN_URL_CHARS = 4000` (13), `puzzleCodeUrl(playerTarget, code)` (108).
- `core/browser/puzzle-snapshot.js`: `puzzleSnapshot({ rows, pieces, puzzle, index, rotation, untitled })` (111),
  `PUBLIC_PLAYER_URL` (68), `preparePuzzleShare(snapshot, { target, client })` (274): the capacity ladder — the full
  code at QR level M, then without the tail (notice `noTail`), then level L (`lowEc`), then no QR (`none`); it returns
  `{ code, url, carried: 'C.T' | 'C', qr, notices }`, where `qr` (from `makePuzzleQr`, `core/browser/qr.js:111`) has
  `version` (1-40) and `ec` ('M' or 'L'). `client.encode(data)` must resolve
  `{ ok: true, value: { C, T, F, version } }`.
- `tools/generate.mjs` (the `USAGE` text from line 55): `--board 26x26 --level <id> --count N --seed <text> --uniqueness
  any --workers 4 --output <file>`; exit 0 complete, 2 valid partial pack, 1 nothing usable. Each request is bounded by
  the generation time limits (`TIME` in `core/engine/policy.js:54`: dispatch stops at 115 s), so a call ends within
  about 4 minutes (set and puzzles). Offered levels on 676 cells: hard, expert, master, nightmare, hell-1, hell-2,
  hell-3 (`offeredLevels(676)`); hard has the most clues (the longest codes), hell-3 the fewest.

### Orientation values (not pins)

The analysts measured the same matrix at HEAD on the MP06b probe corpus C (`docs/difficulty-v3/probe-corpus-2026-11-12/
packs/C-26x26-master-s0.json`: v2-made 26 x 26 puzzles, 26 pieces of 26 cells, 6 clues) with hand-written claims:

| Claim | C raw | C deflate | Tail T | F (auto) | URL (auto, public Player) | QR (ladder) |
|---|---:|---:|---:|---:|---:|---|
| v2 compact (stored) | 242 | 252 | 12-13 | 255-256 | 300-301 | version 11, M, with the tail |
| v3 summary | 355 | 366 | 12-13 | 368-369 | 413-414 | version 13, M, with the tail |
| v3 summary, `censored: true` | 381 | 391 | 12-13 | 394-395 | 439-440 | version 13, M, with the tail |
| v3 full claim (hand-made) | 1,143-1,144 | 932-934 | 12-13 | 945-948 | 990-993 | version 21, M, with the tail |

So every case is far below 16,000 symbols and 4,000 URL characters. A result far from these values (for example a
summary claim that is not about 110 symbols longer than the compact v2 form) is a finding to report, not a reason to
change anything.

### The size record (gate GC-P2, format part)

Samples (announced runs; the seeds are fixed so that anyone can regenerate them):

```powershell
node tools\generate.mjs --board 26x26 --level hard --count 3 --seed codes-v3/26x26-hard --uniqueness any --workers 4 --output tests\artifacts\MP09e\26x26-hard.json
# the fewest-clue sample: hell-3, nightmare, master in the order and with the skip rule below (Exact commands)
```

Exit 0 or 2 with at least one puzzle is a sample. With exit 1 (no puzzle) from the hard request, use expert once with
the seed `codes-v3/26x26-expert` and record it. The fewest-clue sample follows the D36 rule below (it replaces the
earlier hell-3 → hell-2 fallback, which is withdrawn). A request that still gives nothing is a finding for the owner
(v3 availability on 26 x 26), and the matrix is then built from the samples that exist. Record per request: the exit
code, the number of puzzles, the wall time, and per puzzle its id, level, score, `censored` and the number of clues.

Hell levels on large boards (check-list D36, `clarifications.md` Part I; answered (a), owner decision P-OD5;
cross-review TP05): SA1's probe found v3 ratings of Hell sets on boards from 15 x 20 to 24 x 24 capped, so a Hell
request on 26 x 26 is expected to end with exit 1 after about 4 minutes. The Hell levels stay offered until the
owner's MP12 decision. The fewest-clue sample is taken in this order, stopping at the first request that gives a
sample:

1. hell-3 (`--level hell-3 --seed codes-v3/26x26-hell-3`), once, unless MP09d2's record
   (`docs/difficulty-v3/d21-v3-<date>.md`, sections 2 and 4) shows that Hell 3 made no puzzle on 22 x 22 and 24 x 24:
   then skip it and say so in the record;
2. nightmare (`--level nightmare --seed codes-v3/26x26-nightmare`), once;
3. master (`--level master --seed codes-v3/26x26-master`), once.

hell-2 and hell-1 are never requested here. Record the Hell outcome (run and failed, or skipped by the rule) as D36
evidence. The fewest-clue sample only bounds the short end; the long end (hard) is the one the 4,000-character and QR
limits depend on.

Write the scratch script `tests/artifacts/MP09e/code-sizes.mjs` (Node, ES module, imports the repository modules by
relative path; it reads the sample packs with `parsePack`). For every puzzle of every sample, with `data` =
`puzzleSnapshot({ rows: pack.board.rows, pieces: pack.pieces, puzzle, index, rotation: pack.presentation?.rotation ??
0, untitled: (n) => \`Puzzle #${n}\` }).data`, measure three claim variants:

| Variant | How the code is made |
|---|---|
| `summary` | the production encoder on `data` as generated (its full v3 claim is reduced to the summary by MP09b) |
| `summary-censored` | the production encoder on `{ ...data, rating: { model, score, level, saturated: false, censored: true } }` (a summary claim given directly; the pack check accepts a v3 claim without metrics, RES-21) |
| `full` | hand-made: the parts of the snapshot built like `partsFromSnapshot` (`createPack` with the one puzzle, `validatePack`, the same field mapping) **without** the summary reduction, so `parts.rating` is the full v3 claim; then `encodeCorePayload(parts)` framed exactly like `encode` (raw: version 1; DEFLATE: version 2 with `CompressionStream('deflate-raw')`), and the tail with `encodeTailPayload(parts)` |

For each variant and each compression (`raw`, `deflate`, `auto`; for `full`, auto = the shorter core, raw on a tie):

1. `|C|`, `|T|` (0 without a tail) and `|F|`; whether `|F| <= 16000`.
2. `url = puzzleCodeUrl(PUBLIC_PLAYER_URL, F)`: its length, `<= 16000`, and whether it is above 4,000 (the Share
   dialog's warning).
3. The real share preparer: `preparePuzzleShare({ data, heading: 'x', key: 'x' }, { target: PUBLIC_PLAYER_URL,
   client: { encode: async () => ({ ok: true, value: code }) } })` with the measured code (with its tail), and again
   with the core only (`{ C, T: null, F: C, version }`): `carried`, `notices` and `qr.version` / `qr.ec` (or "no QR").
4. `decodePuzzleCode(F)` and `decodePuzzleCode(C)` succeed; the decoded board, pieces, clues and (for F) solution equal
   the source; the decoded claim equals the summary for `summary` and `summary-censored`, and equals the full claim
   (metrics included, in the `MetricsV3` order) for `full` — a full claim in a hand-made code is read strictly (RES-22).

The record `docs/difficulty-v3/codes-<date>.md` (English, CRLF):

1. Header: date, code revision (`git rev-parse --short HEAD`), Node and Edge versions, the gate (GC-P2, format part),
   the commands with exit codes and wall times.
2. Samples: one row per puzzle (request, puzzle id, level, score, `censored`, clues, pieces).
3. The matrix: one row per puzzle, variant and compression with the columns `|C|`, `|T|`, `|F|`, URL length, above
   4,000, and the ladder outcome with the tail and with the core only (`carried`, notices, QR version and level).
4. Limits: the largest `|F|`, URL and QR version of each variant against 16,000 symbols, 16,000 URL characters and QR
   version 40 (level M, then L); and the analytic bounds: a summary claim is at most about 95 bytes of JSON text (so
   at most about 152 symbols), and the full metrics of a v3 claim are bounded by 4,096 bytes of JSON (RES-21).
5. The production codes `F` (auto) of the `summary` variant of every sample puzzle, and one `full` code, verbatim, so
   that the record can be checked by decoding them.
6. The browser runs (below): page, verdict, summary, check counts, browser version, error counts.
7. Findings (or "none").

### The browser page: `tests/browser/puzzle-code-acceptance.js`

The page runs the real Generator (real engine in module workers) and the real Player and compares a puzzle re-created
from its code with its source, claim included (`assertSameView`, lines 387-392, through `viewOf` 313-336 and `claimsOf`
280-305). After MP09d2 the Generator journey ("BA01 BA02 BA03 BA04 BA22 BA23 BA24: the real Generator …", line 1377)
generates v3 puzzles with full claims, while the opened puzzle carries the summary claim of its code, so `claimsOf`
must compare a v3 claim by its summary. Three edits, nothing else:

1. **`claimsOf` (280-305): the summary rule.** A `difficulty-v3` rating is compared without its metrics; everything
   else stays:

   ```js
   // A code carries the summary of a difficulty-v3 claim (RES-22); its metrics stay in the pack.
   if (rating.model !== 'difficulty-v3' && rating.metrics !== undefined && rating.metrics !== null) {
     const m = rating.metrics;
     r.metrics = rating.model === 'difficulty-v2' ? { U: m.U, B: m.B, branchTrials: m.branchTrials, rowTrials: m.rowTrials, stop: m.stop, R: m.R, H: m.H } : m;
   }
   ```

   (`censored` is already copied when present; a v3 claim never carries `censored: false`.)
2. **One summary assertion in the Generator journey (1377-1442).** After `const opened = await freshOpen(...)` (about
   line 1438), assert that the source claim has metrics and the opened one is exactly the summary:

   ```js
   const openedRating = /** @type {any} */ (opened.m.player.store.getState()).pack.puzzles[0].rating;
   assert(puzzle.rating?.model === 'difficulty-v3' && puzzle.rating.metrics !== undefined, 'the generated puzzle has a full v3 claim');
   equal(openedRating, { model: puzzle.rating.model, score: puzzle.rating.score, level: puzzle.rating.level, saturated: false, ...(puzzle.rating.censored === true ? { censored: true } : {}) }, 'the code carries the summary claim (RES-22)');
   ```

   (`equal` compares with `JSON.stringify`, so the key order is part of the assertion: the codec writes `model`,
   `score`, `level`, `saturated`, `censored`.)
3. **The new check**, placed before the last check ("every worker this page started has ended, …", line 2148), in the
   main phase (its name must not start with `narrow` or `keys`, and it must not use an id `BA..`: the BA01-BA30 matrix
   and its traceability test `tests/puzzlecode-acceptance.test.js:801` stay as they are):

   ```js
   // RES-34: an L pentomino and its mirror image on a 5 x 2 board (default identity: pieces A and B), written with the
   // frozen v1 grammar below the pack check; the decoder refuses it with `duplicate-shape` and params { piece: 'B', first: 'A' }.
   const TWIN_CODE = '1G2084V8248S341';
   await check('RES-34 duplicate shapes: a code whose two pieces have the same shape (a piece and its mirror image) is refused by the real Player, from the entry and from the address, in English and Vietnamese, and nothing opens', async () => { … });
   ```

   The check:
   - English text: `const en = playerI18n.t('code.error.duplicateShape', { piece: 'B', first: 'A' });` (key and
     placeholders of MP09a1); assert that it contains `B` and `A` and differs from the generic text "This code does not
     describe a valid puzzle.".
   - Entry: `const m = await mount();` then `await enterCode(m, TWIN_CODE);` The entry stays open (`isOpen(m)`);
     `problemOf(m).error` equals `en`; `[problem.candidate, problem.useCorrection, problem.openCore]` equals
     `[null, false, false]`; `m.root.dataset.screen` is still `'start'`; `m.urls` is `[]`; `m.adapter.map.size` is 0;
     the field keeps `TWIN_CODE`.
   - Vietnamese: `playerI18n.setLocale('vi', document);` `const vi = playerI18n.t('code.error.duplicateShape', {
     piece: 'B', first: 'A' });` assert `vi !== en`; enter `TWIN_CODE` again; `problemOf(m).error` equals `vi`;
     then `playerI18n.setLocale('en', document)` (the `check` helper also resets it).
   - Address: `const a = await mount({ hash: \`#p=${TWIN_CODE}\` });` wait (at most 20 s, `waitFor`) until the entry
     is open with a problem: a failed `#p=` address opens the entry with the address as its text
     (`onPuzzleCodeFailure`, `player/app.js:101`); `problemOf(a).error` equals `en`; no game is open
     (`a.player.store.getState().screen !== 'game'`); nothing was stored (`a.adapter.map.size === 0`).
   - The code is decoded by the real puzzle-code worker, so the page still builds no catalogue on the main thread (the
     last check asserts it); do not encode anything with the v1 module in the page.

   `TWIN_CODE` was computed by the analysts with the frozen v1 encoder at HEAD (board `['#####', '#####']`, piece A =
   cells `[[0,0],[1,0],[2,0],[3,0],[0,1]]`, piece B = `[[0,0],[1,0],[2,0],[3,0],[3,1]]`, default ids, labels and
   colours, no clues, no answer, no claim): today's decoder opens it with a `duplicate-shape` warning, and a reader with
   MP09a1's pack check refuses it. If the decoder after MP09a1 gives another error code or other params, report it
   with the trace (check-list D11); do not change the literal.

### Running the pages (check-list §7: headless Edge through CDP)

- Ports for this task: HTTP 8809, CDP 9309; server `node tools/serve.mjs --port 8809 --prefix /pentomino/`; profile
  `tests\artifacts\edge-MP09e\`; evidence `tests\artifacts\MP09e\`. Use the startup, readiness, PID and cleanup
  procedure and the native CDP client of `tasks/regenerate-puzzle/check-list.md` §7 (the Edge executable named
  there, `--headless=new`), with the three task values
  changed and the client's wait for `data-result` raised from 180,000 to 540,000 ms (the page runs real generation;
  each of its checks still has to finish within 1 minute). If `tests\artifacts\RP08\run-harness.mjs` exists, you may
  copy it to `tests\artifacts\MP09e\` and use it instead (environment `RP_CDP_PORT`, `RP_HARNESS_URL`,
  `RP_EVIDENCE_DIR`, `RP_MODE=main`, `RP_NAME`): it also decodes the page's QR rasters with the test-only jsQR.
- Pages (main phase only; the `narrow` and `keys` phases do not change in this task):
  `http://127.0.0.1:8809/pentomino/tests/browser/puzzle-code-acceptance.html`,
  `…/puzzle-code-entry.html`, `…/puzzle-code-cli-parity.html`. A run passes only with `data-result="pass"` and no
  CDP error; no result, a timeout or a closed browser is not a pass.
- `puzzle-code-entry.html` and `puzzle-code-cli-parity.html` are regression runs of the code pages after MP09a1 to
  MP09d2: do not edit them; a failing check is reported with its name and message.

## Files to create/modify

| File | Change |
|---|---|
| `tests/browser/puzzle-code-acceptance.js` | the `claimsOf` summary rule, the summary assertion in the Generator journey, the RES-34 check |
| `docs/difficulty-v3/codes-<date>.md` (new) | the GC-P2 format record |
| `tests/artifacts/MP09e/*` (scratch, git-ignored) | the sample packs, `code-sizes.mjs`, its JSON output, browser evidence |

Exclusive ownership while active: the files above. Documentation slot: none needed beyond the record (no behaviour
changes); `docs/design-detail.md` §13.2 already lists `puzzle-code-acceptance`; if its row names the checks one by one,
tell the orchestrator instead of editing it. Must not edit: engine, app, locale and fixture files, the other browser
pages.

## Implementation steps

1. Read the inputs; check that `node -e "import('./core/engine/difficulty.js').then(m=>console.log(m.MODEL))"` prints
   `difficulty-v3` (MP09d2 is in the tree).
2. Edit `tests/browser/puzzle-code-acceptance.js` (the three edits). Run `npm run check` (its convention checker
   covers `tests/`).
3. Write `tests/artifacts/MP09e/code-sizes.mjs`; try it on the MP06b corpus C pack (no generation needed) and compare
   with the orientation table.
4. Announce the runs; generate the two samples; run the script; write the record.
5. Run the three pages (one at a time); add the results to the record.
6. `npm run test:quick`; `npm run check`; normalise the record to CRLF and check it.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09e-B01 | The largest v3 puzzles (676 cells) fit the code, link and QR limits with the summary claim, with and without the stored answer; the record shows the margins | `codes-<date>.md` |
| MP09e-B02 | A code with two pieces of the same shape is refused by the real Player with both piece names, in English and Vietnamese, and nothing opens or is stored | the RES-34 check passes |
| MP09e-B03 | A puzzle generated with v3 and opened from its printed code is the same puzzle, and its code carries the summary claim | the Generator journey passes with the summary assertion |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09e-T01 | The matrix covers every sample puzzle × {summary, summary-censored, full} × {raw, deflate, auto} with `|C|`, `|T|`, `|F|`, URL length and the ladder outcome with and without the tail; every code decodes to its source, the full claim strictly | the record; the script's JSON in the evidence folder |
| MP09e-T02 | The samples are named by command, seed, exit code and wall time; any fallback level is recorded | the record |
| MP09e-T03 | `puzzle-code-acceptance.html` passes in the main phase (all checks, the new one included, no CSP violation, no uncaught error, every worker ended); `puzzle-code-entry.html` and `puzzle-code-cli-parity.html` pass or their failures are reported | browser evidence (`browser.json`, screenshot) |
| MP09e-T04 | Only the three edits are made to the page; BA01-BA30 names are unchanged; `node --test tests\puzzlecode-acceptance.test.js` passes (traceability) | diff; command output |
| MP09e-T05 | `npm run test:quick` and `npm run check` pass; the record is UTF-8 without BOM, CRLF, no trailing whitespace, no absolute path | command output; the check-list §3 one-liner |

## Test plan

### Exact commands

```powershell
node --test --test-skip-pattern=slow tests\puzzlecode-acceptance.test.js
if ($LASTEXITCODE -ne 0) { throw 'traceability test failed' }

# announced gate runs (one at a time)
New-Item -ItemType Directory -Force tests\artifacts\MP09e | Out-Null
node tools\generate.mjs --board 26x26 --level hard --count 3 --seed codes-v3/26x26-hard --uniqueness any --workers 4 --output tests\artifacts\MP09e\26x26-hard.json
"hard: exit $LASTEXITCODE"
# only when hard gave exit 1:
#   node tools\generate.mjs --board 26x26 --level expert --count 3 --seed codes-v3/26x26-expert --uniqueness any --workers 4 --output tests\artifacts\MP09e\26x26-expert.json
# the fewest-clue sample, in the order of the D36 rule, stopping at the first exit 0 or 2:
$fewest = @()
if (-not $skipHell3) { $fewest += 'hell-3' }   # set $skipHell3 = $true first when MP09d2's record shows no Hell 3 puzzle on 22x22 and 24x24
$fewest += @('nightmare', 'master')
foreach ($lv in $fewest) {
  node tools\generate.mjs --board 26x26 --level $lv --count 3 --seed "codes-v3/26x26-$lv" --uniqueness any --workers 4 --output "tests\artifacts\MP09e\26x26-$lv.json"
  $code = $LASTEXITCODE
  "${lv}: exit $code"
  if ($code -eq 0 -or $code -eq 2) { break }
}
node tests\artifacts\MP09e\code-sizes.mjs
if ($LASTEXITCODE -ne 0) { throw 'size script failed' }

# browser pages: the procedure of tasks/regenerate-puzzle/check-list.md section 7 with ports 8809 / 9309,
# one page at a time, PIDs stopped and the profile removed afterwards (also on failure)

npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');console.log(/[^\r]\n/.test(t)?'LF found':'CRLF only')" docs\difficulty-v3\codes-<date>.md
```

### Required test cases

- The RES-34 check (entry in English, entry in Vietnamese, address) as specified.
- The summary assertion in the Generator journey.
- Every other check of the page unchanged and passing.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate commands, exit codes and wall times, the largest `|F|`,
  URL and QR version per variant, the page verdicts and summaries, the Edge version, and any finding.
- Handoff to MP10b: the display part of GC-P2 (share and print pages with the derived ratings and the estimate note)
  follows the same browser procedure; the summary rule of `claimsOf` stays. To MP17: the record path, for the final
  evidence.

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

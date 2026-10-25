# Printed-puzzle reconstruction — task index and overall acceptance

**Scope:** production implementation of the signed-off single-puzzle code/QR design.
**Status:** task documents prepared; implementation has not started.
**Traceability:** `docs/regenerate-puzzle/4-final-report.md`, signed off by architect-2.
**Execution:** one `claude-sonnet-5.5` general-purpose developer sub-agent per task.

Each task contains its relevant contracts. Design references are traceability,
not instructions to research an earlier proposal or session prototype.
The orchestrator reviews and commits this pack before launching developers.
Checkboxes below mean implementation accepted, not that a task document exists.

## 1. Task index

| Done | ID | File | Depends on | Owner | Milestone |
|---|---|---|---|---|---|
| [ ] | RP01 | [Single-puzzle codec](01-single-puzzle-codec.md) | None | Core codec | M1 |
| [ ] | RP02 | [Worker service and route](02-worker-code-service-and-player-route.md) | RP01 | Engine/browser integration | M2 |
| [ ] | RP03 | [Player code entry](03-player-code-entry.md) | RP02 | Player UI | M3 |
| [ ] | RP04 | [QR adapter and vendored tests](04-qr-adapter-and-vendored-tests.md) | None | QR/browser infrastructure | M1 |
| [ ] | RP05 | [Print snapshot/dialog/sheets](05-print-snapshot-dialog-and-sheets.md) | RP01, RP02, RP03, RP04 | Shared print/UI | M4 |
| [ ] | RP06 | [Copy this puzzle link](06-copy-single-puzzle-link.md) | RP02, RP03, RP05 | Cross-app UI | M5 |
| [ ] | RP07 | [Optional CLI code output](07-optional-headless-code-output.md) | RP01, RP02, RP05 | Node CLI | Optional M5 |
| [ ] | RP08 | [Cross-app acceptance/release](08-cross-app-acceptance-and-release.md) | RP01–RP06; RP07 if enabled | QA/release | M6 |

RP07 is **in scope**, optional and release-non-blocking in wave5. Before RP08,
record it as accepted or explicitly deferred. Do not advertise an unimplemented
`--code` flag.
Required browser-feature completion is RP01–RP06 and RP08.
Missing physical acceptance remains an explicit release blocker.

## 2. Ready waves

| Wave | Tasks | Parallel-safety reason |
|---:|---|---|
| 1 | RP01 and RP04 | New codec/codec tests versus QR/vendor/QR tests |
| 2 | RP02 | Worker/protocol/route/controller after codec acceptance |
| 3 | RP03 | Player entry after controller/API acceptance |
| 4 | RP05 | Shared print/heading integration after RP03 releases Player files |
| 5 | RP06 and optional RP07 | App Copy controls versus CLI/output tests |
| 6 | RP08 | Integrated QA after required owners finish |

A dependency means an accepted handoff, not a file appearing in the tree.
Do not run RP03, RP05 and RP06 concurrently: they share Player files.
Do not run RP05 and RP06 concurrently: they share Generator puzzle-panel files.
RP08 reports runtime defects back to the owner; it does not silently edit those files.

### Exclusive ownership

| Owner | Exclusive runtime area | Later handoff |
|---|---|---|
| RP01 | `core/engine/puzzlecode*.js`, codec tests/fixtures | RP02 consumes exports |
| RP02 | protocol/tasks/sharecode/handoff/code-client/player-state | RP03 consumes controller |
| RP03 | code dialog and Player app/style/locales | RP05 later edits Player integration |
| RP04 | QR adapter, runtime vendor, test decoder, QR tests | RP05/RP08 consume |
| RP05 | heading/snapshot/print modules, both print sources | RP06 later adds Copy controls |
| RP06 | copy helper and both app Copy controls/locales | QA reads integrated UI |
| RP07 | `tools/generate.mjs` and CLI/parity tests | Independent of RP06 source |
| RP08 | acceptance tests, fixtures and evidence | Runtime fixes return to owners |

Detailed file lists in each task refine this table.
A new shared file requires an explicit owner before parallel editing.

### Living-document lease and per-task commits

These files have one writer at a time:

```text
docs/design-brief.md
docs/design-detail.md
README.md
```

Every behaviour/storage/URL/UI task updates the relevant living-spec sections
in the same change, as AGENTS.md requires. Use this sequence:

1. Finish exclusively owned implementation/tests.
2. Request the orchestrator's documentation slot.
3. Only the slot holder edits living docs/README.
4. Report ready with the complete owned-file list and verification evidence.
5. Before whole-tree validation or any commit, wait until every task in the wave
   has finished its exclusively owned code/tests and paused writes. Waiting for
   the documentation slot does not block this code-ready barrier.
6. At that barrier, the orchestrator runs `npm run check` and `npm test` over the
   combined tree, independently verifies, and commits **once per accepted task**.
7. Only that task's files, documentation and orchestrator-owned execution-log
   updates enter the commit.
8. Release the documentation slot after the commit.

Other agents may continue in disjoint files until the wave code-ready barrier.
After a commit releases the documentation slot, the next ready owner completes
its documentation; the orchestrator verifies the current tree again before that
task's commit. Do not deadlock by requiring every task to finish documentation
before the first documentation-slot holder can be accepted.
Do not stage a still-running task's files.
If the combined tree is temporarily inconsistent, wait for a write barrier;
do not call a failing broad check a pass.

## 3. Shared working conventions

- One `claude-sonnet-5.5` general-purpose developer per assigned task.
- Do not use nested delegation without orchestrator approval.
- Read AGENTS.md and the assigned task before editing.
- Implement these contracts, not historical examples in `tasks/init-design/`.
- Never edit `docs/init-design/`, `docs/calibration/`, `docs/regenerate-puzzle/`
  or `tasks/init-design/`.
- Developers do not edit this pack or its execution logs; report corrections
  to the orchestrator.
- Developers do not commit, push, stage, reset, stash or change branches.
- The orchestrator independently verifies and commits once per accepted task.
- During concurrent work in a wave, developers run only their own targeted tests
  and the repository convention checker scoped to their own authored files.
  No developer runs whole-tree `npm run check`, `npm run test:quick` or `npm test`
  while a peer is editing. The orchestrator runs full checks after the wave's
  code-ready/write barrier and before committing.
- A failure confined to a peer's files is reported, not fixed, hidden or waived.
- All feature commits belong to **`regenerate-puzzle`**, created from `main` at
  `80af86c` and already checked out. Developers never switch branches.
- The orchestrator commits on `regenerate-puzzle`, never directly on `main`.
  Nothing is pushed or merged to `main` without the owner's authorization.
- Final developer replies include commands/results, issues and exported
  APIs/contracts for later tasks, plus changed files and blockers.
- The orchestrator records actual model, times, token usage and AI credits.
- Never invent unavailable usage, browser, printer or phone evidence.
- Native ES modules, `// @ts-check`, JSDoc, no build step.
- Browser modules use `.js`; Node-only tools may use `.mjs` or test-only `.cjs`.
- No npm runtime or development dependency is added.
- Runtime QR is pinned Nayuki/MIT; test-only decoder is pinned jsQR1.4.0/Apache-2.0.
- Keep licence notices and record adaptations separately from upstream hashes.
- Strict CSP unchanged: no unsafe HTML, eval or inline script/handler/style.
- UTF-8 without BOM, CRLF, no trailing whitespace, final newline.
- Filesystem paths are Windows-style; URL/module syntax remains standard.
- Use existing Node tests and external-module browser harnesses.
- Add tests for introduced behaviour, not a coverage-driven rewrite.
- Do not change generation policies, solver limits or qualification gates.
- Count-only rating reconstruction is not a solver or a raised memory limit.
- Never build the cold catalogue on a browser main thread.
- No remote QR service, shortener, upload or `#lib` substitution.
- Use project evidence paths and the task-specific disposable profiles in Section7.
- No OS temporary directories or user's normal browser profile.
- Stop only owned recorded PIDs, never processes by name.
- HTTP200, screenshots alone and `--dump-dom` are not browser-harness passes.

### Scoped conventions during a parallel wave

`tools/check-conventions.mjs` accepts a root directory, not file arguments or a
`--files` flag. Use its existing exported `checkText` function for the owned-file
check; do not invent an unsupported command-line switch. Supply every owned
authored text file as a separate argument, including leased living-doc changes:

```powershell
node --input-type=module -e 'import{readFileSync}from"node:fs";import{checkText}from"./tools/check-conventions.mjs";const e=process.argv.slice(1).flatMap(p=>checkText(p,readFileSync(p)));if(e.length){console.error(e.join("\n"));process.exitCode=1}' .\path\to\owned-file.js .\path\to\owned-test.js
```

Replace the two example arguments with the task's actual owned paths. Match the
repository text scope: `.js`, `.mjs`, `.html`, `.css`, `.json`, `.yml`, `.yaml`,
`.md`. The pinned test-only `.cjs`/licence payloads are checked by provenance
tests, not reformatted as authored JavaScript. Runtime QR `.js` is in scope.
Report both the targeted test command and this scoped check. Only the orchestrator
may run the full-tree commands at the wave barrier.

## 4. Inlined-contract clarifications

| Seam | Resolution |
|---|---|
| Engine/client wrappers | RP01 plain DTOs/typed errors; RP02 adapts RPCs to browser Result wrappers |
| Hash parser | RP01 owns parsePuzzleHash/input normalization; RP02 delegates p routes and maps host errors |
| Bad tail | Validated core plus tailError becomes explicit recovery, never automatic loading |
| Correction | Candidate comes through decode; client repair convenience is not a third RPC |
| Snapshot | Flat wire data plus a separate browser heading/key; no current moves/provenance |
| Snapshot key | All code-relevant values, not timer/progress/unrelated puzzles |
| Titles | `#n` for untitled; existing suffix retained; no auto-ordinal above75 code points |
| Generator heading | Printed displayed title, e.g. Hard #3; card heading stays a separate convention |
| Print/Copy equality | Same snapshot/default target gives the same URL; dialog-only developer override is not persisted |
| Reduced tail | Returned T=null/F=C agrees with carried mode |
| No fitting QR | Print neither code nor QR; a within-budget core URL may still be copied with advisory |
| Clipboard | Show copied only after success; otherwise safe selectable field |
| Optional CLI | Explicit code-only stdout, one line per accepted puzzle; `--output` retains pack JSON |
| Compression | Decode parity, not cross-engine compressed-byte equality |
| Long words | Code-point wrapping fallback; paper ellipsis never changes encoded title |
| Physical evidence | Automated completion is not physical release acceptance |

No developer reopens Q1–Q5 independently.
A real contradiction is returned before divergent implementation lands.
Before dispatching RP07/RP08, diff their retained API/limits/messages/vectors and
oracle facts with RP01. RP01's shared codec contract is normative; consumers
must not fork its encoder. Do not compare consumer-only CLI/QA text as wire data.
RP01's raw checkpoint is reviewed before DEFLATE/correction/property work begins.
Keep one RP05 rather than an RP05a/RP05b split: the six-wave plan deliberately
trades a slightly longer critical path for fewer handoffs and clear ownership.

## 5. Business traceability

| Done | Requirement | Observable acceptance | Owners |
|---|---|---|---|
| [ ] | Exact board | Dimensions, holes, margins and angle survive | RP01, RP05, RP08 |
| [ ] | Exact piece set | Ordered IDs/labels/RGB/shapes match cut-outs | RP01, RP05, RP08 |
| [ ] | Exact puzzle | Original clues and remaining pieces match | RP01–RP03, RP05, RP08 |
| [ ] | One selected puzzle | No other puzzle/history/witness is required or encoded | RP01, RP05–RP08 |
| [ ] | Compact manual code | Crockford core, groups of4, useful errors and confirmed candidate | RP01–RP03, RP05 |
| [ ] | URL reuse | Stable portable `#p=C`/`C.T`, no appended index | RP02, RP06, RP08 |
| [ ] | Mandatory QR | Local full-URL QR, exact/readable on first sheet | RP04, RP05, RP08 |
| [ ] | Q1 Optional tail | Stored answer printed smaller/labelled and carried in normal QR/URL | RP01, RP04–RP06, RP08 |
| [ ] | Q2 Title/level/score | Shared heading and complete claims preserved | RP01, RP05, RP08 |
| [ ] | Q3 Seed removal | Puzzle seed removed; known level/score/set line retained | RP05, RP08 |
| [ ] | Q4 Both Copy actions | Shared prepared selected-puzzle URL | RP06, RP08 |
| [ ] | Q5 Extreme capacity | Shortest → drop tail → L → explicit no-code/QR | RP04–RP06, RP08 |
| [ ] | Progress | Matching fingerprint restores with notice; Replay explicit | RP02, RP03, RP08 |
| [ ] | Atomic failures | Invalid/cancelled/stale work preserves gameplay | RP02, RP03, RP05, RP06, RP08 |
| [ ] | Compatibility | Existing schema, pack/library/file routes and unrelated game behaviour preserved | All, RP08 |

Q1–Q5 were confirmed on 2026-10-25 at17:50.
No product question is pending.
Optional CLI scheduling and hardware availability are execution decisions.

## 6. Technical acceptance

- [ ] Raw and DEFLATE core/full forms decode to one valid existing Pack.
- [ ] CRC parameters, last-four-symbol placement, tail coverage and bound tests pass.
- [ ] Catalogue hash,128 RGB defaults, labels and transform/order rules are frozen.
- [ ] Raw/edge/negative vectors have their exact expected outcomes.
- [ ] BigInt EG handles maximum-safe certificates; large title ordinals escape.
- [ ] Count-only ratings and full-claim fallbacks preserve all fields.
- [ ] Integer score/bands pass640,128 combinations.
- [ ] Foreign/censored/opaque metrics, Unicode and custom identities survive.
- [ ] Bounds precede allocation/iteration/inflation.
- [ ] Decoded packs validate and progress fingerprints match.
- [ ] No cold main-thread catalogue or solver.
- [ ] Both worker hosts handle asynchronous results safely.
- [ ] Candidate/recovery data never automatically opens a puzzle.
- [ ] Pasted URLs obey the navigation parser's index/mixed-key rules.
- [ ] `#p` stays stable; legacy routes retain their behaviour.
- [ ] EN/VI, keyboard/focus, alerts, narrow and coarse-pointer cases pass.
- [ ] New title texts/rules are implemented in both apps.
- [ ] QR source/adaptation/decoder/licence pins pass.
- [ ] Explicit segments, requested M/L, no EC boost and independent decoding pass.
- [ ] Quiet zone4, module≥0.5 mm, box≥25 mm.
- [ ] Preview reserve≥120 mm; version40/long-title/continuation/duplex have no overlap.
- [ ] Printed symbol order reconstructs carried F exactly.
- [ ] No QR/code on mirrored backs; cell size/scale bar unchanged.
- [ ] Solution sheet retains its independent header.
- [ ] Source changes invalidate preparation; option changes reuse encoding.
- [ ] Q5 notices occur before printing and on the sheet.
- [ ] Full Node, quick Node and repository checks pass.
- [ ] New and relevant legacy browser harnesses pass through CDP.
- [ ] No unexpected console/CSP/failed local-network events.
- [ ] Living specs and README describe shipped behaviour.
- [ ] Test-only decoder is absent from the deployed graph.
- [ ] Physical matrix passes or release remains explicitly blocked.

## 7. Browser harness environment and validation commands

The orchestrator runs these from the repository root after the completed wave's
code-ready/write barrier and before committing. Developers use their task's
targeted commands and Section3's scoped convention check while peers work:

```powershell
npm run test:quick
npm test
npm run check
```

Focused `tests/*.test.js` commands are in each task.
Browser harnesses use external modules and final
`<html data-result="pass|fail">`, with `data-summary`.

| Task | HTTP | CDP | Harness under `tests/browser/` |
|---|---:|---:|---|
| RP01 | 8701 | 9201 | Reserved; Node-only owner, browser evidence follows in RP02 |
| RP02 | 8702 | 9202 | puzzle-code-worker.html |
| RP03 | 8703 | 9203 | puzzle-code-entry.html |
| RP04 | 8704 | 9204 | puzzle-qr.html |
| RP05 | 8705 | 9205 | puzzle-code-print.html |
| RP06 | 8706 | 9206 | puzzle-code-copy.html |
| RP07 | 8707 | 9207 | puzzle-code-cli-parity.html |
| RP08 | 8708 | 9208 | puzzle-code-acceptance.html |

The single authoritative browser environment for every task is:

- Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- Headless through CDP; use Node22+ built-in `fetch` and `WebSocket`, no package.
- Throwaway profile: `tests\artifacts\edge-<TASKID>\`, for example
  `tests\artifacts\edge-RP04\`. `tests/artifacts/` is already git-ignored.
- Fixed serve port `87<NN>` and CDP port `92<NN>`; NN is the two-digit task number.
- Serve with `node tools/serve.mjs --port N --prefix /pentomino/`.
- Verify both the harness URL and `/json/version` respond before running CDP.
- Record server/Edge PIDs; always stop owned processes by PID and delete the
  task's throwaway profile after use, including failure paths.
- Never use an OS temporary directory, a user's profile or process-name killing.
- If a fixed port is occupied or this profile cannot start, report the blocker;
  do not terminate somebody else's listener or silently choose another profile.

RP08 example, started from the repository root (use the owning task's table row):

```powershell
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile = Join-Path (Get-Location) 'tests\artifacts\edge-RP08'
New-Item -ItemType Directory -Force $profile | Out-Null
$server = Start-Process -FilePath node -ArgumentList '.\tools\serve.mjs','--port','8708','--prefix','/pentomino/' -WorkingDirectory (Get-Location) -PassThru
$browser = Start-Process -FilePath $edge -ArgumentList '--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9208',("--user-data-dir=`"$profile`""),'--no-first-run','--no-default-browser-check','about:blank' -PassThru
$server.Id
$browser.Id
```

Wrap startup, readiness and the client below in a `try/finally`. Retain the actual
PIDs even if CDP fails; stop those still running with `Stop-Process -Id <PID>`,
then remove only this allocated profile with `Remove-Item -Recurse -Force`.
Do not remove another task's evidence directory.

### Ready-to-run native CDP client

Start the owned server/Edge first. Change the three task-specific values:

```powershell
$env:RP_CDP_PORT='9208'
$env:RP_HARNESS_URL='http://127.0.0.1:8708/pentomino/tests/browser/puzzle-code-acceptance.html'
$env:RP_EVIDENCE_DIR='tests\artifacts\RP08'
@'
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = `http://127.0.0.1:${process.env.RP_CDP_PORT}`;
const url = process.env.RP_HARNESS_URL;
const out = process.env.RP_EVIDENCE_DIR;
assert(url && out);
mkdirSync(out, { recursive: true });
const info = await (await fetch(base + '/json/version')).json();
const target = await (await fetch(base + '/json/new?about:blank', {
  method: 'PUT',
})).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
let serial = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', event => {
  const m = JSON.parse(String(event.data));
  if (m.id) {
    const item = pending.get(m.id);
    if (!item) return;
    clearTimeout(item.timer);
    pending.delete(m.id);
    if (m.error) item.reject(new Error(JSON.stringify(m.error)));
    else item.resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown'
    || m.method === 'Network.loadingFailed'
    || (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
    || (m.method === 'Network.responseReceived' && m.params.response.status >= 400)) {
    errors.push(m);
  }
});
function call(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 30000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
let final;
try {
  for (const domain of ['Page', 'Runtime', 'Log', 'Network']) {
    await call(domain + '.enable');
  }
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await call('Page.navigate', { url });
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const r = await call('Runtime.evaluate', {
      expression: '({result:document.documentElement.dataset.result,summary:document.documentElement.dataset.summary})',
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error('Evaluation failed');
    final = r.result.value;
    if (final.result === 'pass' || final.result === 'fail') break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const image = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(out, 'browser.png'), Buffer.from(image.data, 'base64'));
  const evidence = { browser: info.Browser, url, final, errors };
  writeFileSync(join(out, 'browser.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  assert.equal(final?.result, 'pass');
  assert.equal(errors.length, 0);
} finally {
  ws.send(JSON.stringify({ id: ++serial, method: 'Browser.close' }));
  ws.close();
}
'@ | node --input-type=module -
if ($LASTEXITCODE -ne 0) { throw 'Browser harness failed' }
```

Always clean up recorded server/browser PIDs in a surrounding `finally`
or the corresponding process-management tool, even when startup/CDP fails.
The harness itself makes CSP violations fail its final result.
No final attribute, a timeout or a disconnected browser is not a pass.

## 8. Evidence and sign-off

Each developer's final reply supplies:

1. Changed owned files.
2. Exported APIs/types/contracts for dependants.
3. Exact commands and outcomes.
4. Browser version, URL, viewport, verdict and error counts.
5. Evidence paths and unavailable physical/platform coverage.
6. Issues and chosen solutions.
7. Remaining blockers, without downgraded acceptance.

The orchestrator independently reruns checks and fills the empty task log:
Status, Start, End, Duration, Model, Token usage, AI credits, Verification,
Acceptance, Issues & resolutions, Handoff.

Do not claim a physical scan from a screenshot or a fresh-profile test from a
same-storage iframe. Do not change goldens just to match a changed implementation.

## 9. Release decision record

| Gate | Status | Evidence / remaining action |
|---|---|---|
| Required tasks | | |
| Optional RP07 decision | | |
| Full Node suite | | |
| Repository/site checks | | |
| New browser harnesses | | |
| Legacy browser regressions | | |
| EN/VI human review | | |
| Fresh-profile portability | | |
| Progress / Replay | | |
| Printer A/B scale/layout | | |
| Android scan | | |
| iPhone scan | | |
| Authorized deployment smoke | | |
| Living-doc/README review | | |
| Release verdict | | |

The orchestrator owns this record.
No developer changes qualification or deployment settings to make it green.

## Orchestrated execution summary

| Task | Status | Duration | AI credits | Commit |
|---|---|---|---|---|
| RP01 | | | | |
| RP02 | | | | |
| RP03 | | | | |
| RP04 | done | 14m42s | 222.25 | (this commit) |
| RP05 | | | | |
| RP06 | | | | |
| RP07 | | | | |
| RP08 | | | | |
| **Totals** | | | | |

# MP16b — Generation Steps: card button, wiring, browser page (GB-P4) and documents

| Header | Value |
|---|---|
| ID | MP16b (second part of the report's MP16) |
| Depends on | MP16a (accepted and committed: `createReplayDialog`, `replay-model.js`, `highlightedIds`, the locale keys) |
| Estimated size | Medium: about 500–700 changed lines (wiring about 60, the browser page about 300, rendering check about 30, documents about 120 in both languages); about 50–60 minutes plus the gate |
| Owner role | Generator UI |
| Milestone | M9 — Generation Steps |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-31 (the button inside `li.puzzle-card`, the browser page), RES-32 (documents of MP13-MP16), §5.3 GB-P4; clarification SA2-Q-P10 (a) (plan author); check-list §7 |
| Gates owned | **GB-P4**: `tests/browser/replay.html` (main and keys phases) and the affected pages (`rendering.html`, `generator-flow.html`, `acceptance.html`), headless Edge with the runner of this task, ports 8816 and 9316 |
| Implementation status | Not started |

## Goal & business context

This task makes Generation Steps reachable: every puzzle card of the Generator gets a "How it was made" button that
opens the dialog of MP16a for that puzzle. It proves in a real browser that the dialog works end to end — open, step,
play, slider, keyboard, closing, unavailable steps, the incomplete and mismatch states and the language switch — and
that the card's selection, removal and keyboard order are unchanged. It also finishes the living documents of the
provenance and replay work (MP13a to MP16b) for users and developers, in English and Vietnamese.

## Scope

### In scope

- `generator/ui/puzzle-panel.js`: the third card button and its `onReplay` option.
- `generator/app.js`: the replay dialog, the `onReplay` wiring, language refresh and disposal.
- `generator/state.js`: the pure helper `replaySourceOf(state, puzzleId)`.
- `generator/ui/replay-dialog.js` and `generator/ui/replay-model.js`: **only** fixes that the browser page shows to
  be needed (each listed in the reply with the failing check).
- Tests: `tests/generator-state.test.js` (the helper), `tests/browser/replay.html` and `tests/browser/replay.js`
  (new), `tests/browser/rendering.js` (the highlight check), and existing browser pages only where the third button
  changes an expectation (each change listed).
- Documents: `docs/design-detail.md` §10.5; `docs/design-brief.md`; `USERGUIDE.md`, `USERGUIDE.vn.md`;
  `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`; `README.md` (one feature line).

### Out of scope

- The engine, the replay, the client and the protocol (report a defect instead). The Player.
- New locale keys beyond MP16a's list, unless a check proves one missing (then add it in both packs and list it).

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 and §7 first.
- Browser pages run **only** in gate GB-P4, announced first; each check logs its start and finishes within 1 minute;
  each page within the runner's 540 s bound.
- **Amendment L1 (lock; orchestrator decision 2026-11-13).** The Sudoku repository runs on the same machine. Save the
  helper `Invoke-Dv3Timed` of check-list §7 ("Shared-machine lock protocol") verbatim as
  `tests/artifacts/MP16b/dv3-lock.ps1` and dot-source it in every call. Every test run and every browser run go
  through it, as written in the test plan and in "Running the pages": one bounded command per acquisition of the lock
  (one page and phase per runner invocation), at most 590 s, at least 15 s between releasing the lock and taking it
  again (the helper waits), never a lock held across a series of commands. Only `npm run check` and, while you work,
  a single test file that ends within 10 seconds run without it. A command that the helper stops at its limit has an
  error: report it, never rerun it outside the helper. The reply gives each invocation's label, exit, seconds and
  lock wait.
- Never stage, commit, stash, reset, push or switch branches; never edit `tasks/difficulty-v3/`, the reports or
  `docs/difficulty-v3/`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no absolute path in a document.

## Inputs & context

Anchors are at HEAD `55c0c61` (resume revision); MP09a2, MP10b2, MP12b3 and MP13b edited `generator/app.js`,
`generator/state.js` and `generator/ui/puzzle-panel.js`: find moved lines by the quoted text.

### The card (`generator/ui/puzzle-panel.js`)

`createCard(id, cellPx)` (line 317) builds

```js
const item = /** @type {HTMLLIElement} */ (el('li', { className: 'puzzle-card', dataset: { puzzleId: id } }, select, remove));
```

with `select` = `button.card-select` (heading, rating, clue count, certificate, thumbnail) and `remove` =
`button.card-remove`; their listeners follow (lines 328-340: selection, and removal that keeps the focus on the next
`.card-remove`, else the previous, else the New puzzle button).

Change (RES-31, SA2-4 JC13): when the panel's options have `onReplay`, create `replay` = `button.card-replay
ghost-small` (`type="button"`, `data-action="replay"`, text `t('replay.button')`, `aria-label` =
`t('replay.button.aria', { title })` with the card's displayed title, kept current where the heading text is set) and
build the item as `el('li', …, select, replay, remove)`: a **third button inside the same `li`**, not inside
`button.card-select` and not a direct child of the list. Its click calls `onReplay(id, replay)`. Selection, removal,
focus return and the Tab order (select, How it was made, remove) are otherwise unchanged; the removal focus logic still
uses `.card-remove`. Without `onReplay` the card is exactly as before. `mountPuzzlePanel(host, options)` (line 186)
documents the new option `onReplay?: (puzzleId: string, opener: HTMLElement) => void`. Style the button in
`generator/generator.css` only if MP16a's styles do not cover `.card-replay` (list the change).

### The app (`generator/app.js`)

- After the client is created (line 122: `const client = options.client ?? createGenerationClient(…)`): when
  `typeof client.replayPuzzle === 'function'`, create `replayDialog = createReplayDialog({ host: doc.body, t, closeKey:
  'replay.close', run: (source, signal) => client.replayPuzzle(source, { signal }) })`; otherwise no dialog and no
  `onReplay` (scripted test clients keep today's cards).
- Pass `onReplay: (puzzleId, opener) => { const source = replaySourceOf(store.getState(), puzzleId); if (source !==
  null) replayDialog.open(source, opener); }` to `mountPuzzlePanel` (line 141).
- In the language-change handler (`const unsubscribeLanguage = onChange(() => { … importDialog?.refresh(); … })`,
  line 304), call `replayDialog?.refreshTexts()`; in `destroy()` (line 402), `replayDialog?.dispose()`.

### The source (`generator/state.js`)

```js
/**
 * What Generation Steps needs for one listed puzzle (RES-27, RES-29), or null without a set or that puzzle.
 * @param {GeneratorState} state
 * @param {string} puzzleId
 * @returns {{ set: PieceSet, puzzle: Puzzle, setOrigin: SetOrigin | null, made: Made | null } | null}
 */
export function replaySourceOf(state, puzzleId)
```

`made` = `state.puzzleMade[puzzleId] ?? null` (own property only); `setOrigin` = `state.setOrigin`.

### The browser page (`tests/browser/replay.html`, `tests/browser/replay.js`)

Copy the structure of `tests/browser/generator-flow.html` / `generator-flow.js` (same CSP meta, `common.css` and
`generator.css`, the `check`, `assert`, `equal`, `waitFor`, `h`, `memoryStorage` and `mountApp` helpers, a sandbox
section). Each check logs `CHECK-START <name>` with `console.log` before it runs and must finish within 60 s; at the
end the page sets `data-result` (`pass` or `fail`) and `data-summary` (`<passed>/<total>`) on `<html>`, like the pages
of `tasks/regenerate-puzzle/check-list.md` §7.

Part A — the real Generator with real workers (`mountApp` with a fixed `random` seed; the 10 x 6 board; level Hard;
quantity 2). The page reads its phase as `tests/browser/puzzle-code-acceptance.js:34-35` does (`new
URLSearchParams(location.search).get('phase') ?? 'main'`): the main phase runs every check but 5, and `?phase=keys`
runs check 5 only, whose keys the runner presses (cross-review SP19). The kind of each card is read from the
Generator's state, `ctx.app.store.getState().puzzleMade[id]?.kind` for the `data-puzzle-id` of each
`li.puzzle-card`: the first card is normally the set's reused calibration, which has no layout stage, so the checks
that need a layout walk use a `candidate` card (cross-review SP13).

1. "open": make a set and two puzzles; take the first card whose kind is `'candidate'` (when there is none, press
   New puzzle once more, a batch without the calibration, and take its first candidate; when there is still none,
   fail and print the kinds); click its `button.card-replay`; the dialog (`[data-role="replay-dialog"]`) is open, the
   focus is on its close control, the status line reaches `replay.status.matched` text within 60 s, the stage list
   shows seven stages.
2. "step": on that candidate, Next and Previous change the step sentence and the slider value; at stage 4 the board
   has a highlighted piece (`[data-highlighted="true"]`) for a `retile` step that lifted pieces (a candidate's layout
   differs from the set's, so its walk has one).
3. "play": Play advances the slider at least three steps, the play button has `aria-pressed="true"` while playing;
   Pause stops it; the live region text did not change during playback (compare before Play and before Pause).
4. "slider": setting the slider to the last value shows the final step (stage 7) and its score table with a Total
   equal to the card's score.
5. "keyboard" (`?phase=keys` only; trusted keys, never synthetic `KeyboardEvent`s, which prove neither Tab traversal
   nor the dialog's native Escape): copy `press(key)` of `tests/browser/puzzle-code-acceptance.js:2046-2050` (the page
   sets `data-stage="key-<name>"` and waits up to 15 s for `key-<name>-done`; names `Tab`, `Shift+Tab`, `Enter`,
   `Escape`, `ArrowRight`). Make a set and two puzzles as in check 1; focus the candidate card's `button.card-replay`
   and `press('Enter')`: the dialog opens with the focus on its close control. Each `press('Tab')` moves the focus to
   the next control of the dialog in visual order, up to the last one: the expected list is the dialog's enabled,
   visible `button`, `input` and `[tabindex="0"]` elements in document order, with only the checked radio of the view
   switch. `press('Shift+Tab')` moves back one; with the focus on the slider, `press('ArrowRight')` changes the step
   sentence; `press('Escape')` closes the dialog and the focus returns to the card's `button.card-replay`.
6. "card": the card's `li.puzzle-card` has exactly three buttons in the order `card-select`, `card-replay`,
   `card-remove`; `button.card-replay` is not inside `button.card-select`; selecting and removing a card still work
   and removal still moves the focus to the next `.card-remove`.
7. "unavailable": import the code of the Player sample's first puzzle (G1 of `tests/fixtures/puzzlecode-v1.json`)
   through the Import puzzle dialog; its card's replay shows "Steps not available for this puzzle." for stages 1 to 6
   and the stored puzzle at stage 7; status `replay.status.unavailable`.
8. "language": with the dialog open, switch the language to Vietnamese with `setLocale('vi')` of `generator/i18n.js`
   (the harness has no language buttons); the dialog title, controls and status use the Vietnamese texts of
   `generator/locale.vi.js`; switch back with `setLocale('en')`.
12. "calibration" (numbered after Part B so that the other numbers stay): open the replay of the card whose kind is
    `'calibration'` (when the run has none, fail and print the kinds): the status reaches `replay.status.matched`;
    stage 4 has no step and is marked with the `replay.notAvailable` text; no step highlights lifted pieces (the
    calibration keeps the set's layout: no layout walk; cross-review SP13).

Part B — the dialog alone (`createReplayDialog` on the page with a scripted `run`):

9. "incomplete": `run` resolves a result with `status: 'incomplete'`, `reason: 'work'` and three steps plus the final:
   the status line names the work limit, and the final step's sentence is the "stored puzzle" one, not "generated".
10. "mismatch": `status: 'mismatch'`, `reason: 'rating'`: the status line names the rating; the final step is the
    "stored puzzle" one.
11. "cancel": `run` returns a promise that never settles; closing the dialog aborts the signal given to `run` (record
    `signal.aborted`) and nothing else; a `run` that rejects with `PoolAbortError('cancelled')` while open shows the
    interrupted message; `PoolError('worker-unavailable')` shows the worker message.

`tests/browser/rendering.js` (one check): "highlighted pieces": render the page's existing pack model with
`highlightedIds: ['C']`: the group of piece C has `data-highlighted="true"` and contains a `.pm-highlight` path; the
same model without `highlightedIds` has no `.pm-highlight` in the SVG.

### Running the pages (check-list §7; cross-review SP19)

Headless Microsoft Edge through CDP with the runner below, saved verbatim as `tests/artifacts/MP16b/pages.mjs`
(scratch, not committed; MP17 copies it). It follows the procedure of `tasks/regenerate-puzzle/check-list.md` §7 and
adds what this gate needs: it serves the repository (`node tools/serve.mjs --port 8816 --prefix /pentomino/`), starts
Edge for every run with the throwaway profile `tests\artifacts\edge-MP16b\` and CDP port 9316, presses the trusted
keys a page asks for (the `data-stage="key-<name>"` handshake; `Shift+` adds the Shift modifier), emulates a 390 px
touch viewport in the narrow phase, reads `data-summary` or else `#summary`, bounds every run at 540 s, stops Edge
and the server by PID and removes the profile (also on failure), and writes one evidence directory per page and
phase (`browser.json` with the final state, errors, keys pressed and the last console lines; `page.png`) and
`runs.json` with the PIDs. It refuses to start when a port is busy: report it and never stop someone else's
process. It was checked by the analyst on a scratch copy of the repository (see the Execution log of this file for
the date); if it fails on this machine, report the error rather than changing the procedure.

```js
// @ts-check
// Scratch browser runner (git-ignored, under tests/artifacts/<task>/): serves the repository, starts a headless Edge with
// a throwaway profile for each run, opens one harness page per run over CDP (Node's fetch and WebSocket, no package),
// presses the trusted keys the page asks for (<html data-stage="key-<name>">, "Shift+" for a shifted key), saves the
// screenshots it asks for (data-stage="shot-<name>"), and writes the evidence of each page and phase to its own
// directory. Run it from the repository root:
//   node tests/artifacts/<task>/pages.mjs --task <id> --http <port> --cdp <port> --evidence <dir> <page>[:<phase>] ...
// phase: main (1280 x 900, the default), keys (1280 x 900, "?phase=keys"), narrow (390 x 844 touch, "?phase=narrow").
// Exit 0 when every run passed, 1 when a run failed, 2 on a usage or start-up error (a busy port, no Edge).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const EDGE = join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const RUN_MS = 540000;
/** @type {Record<string, { key: string, code: string, windowsVirtualKeyCode: number, text?: string }>} */
const KEYS = {
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
  Home: { key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 },
  End: { key: 'End', code: 'End', windowsVirtualKeyCode: 35 },
};
const PHASES = ['main', 'keys', 'narrow'];
const sleep = (/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms));

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: { task: { type: 'string' }, http: { type: 'string' }, cdp: { type: 'string' }, evidence: { type: 'string' } },
});
const runs = positionals.map((s) => {
  const [page, phase = 'main'] = s.split(':');
  return { page, phase };
});
if (!o.task || !/^\d+$/.test(o.http ?? '') || !/^\d+$/.test(o.cdp ?? '') || !o.evidence || runs.length === 0
  || runs.some((r) => !/^[a-z0-9-]+$/.test(r.page) || !PHASES.includes(r.phase))) {
  console.error('usage: pages.mjs --task <id> --http <port> --cdp <port> --evidence <dir> <page>[:main|keys|narrow] ...');
  process.exit(2);
}
const root = process.cwd();
if (!existsSync(join(root, 'tools', 'serve.mjs')) || !existsSync(EDGE)) {
  console.error('run it from the repository root, with Microsoft Edge installed at the usual place');
  process.exit(2);
}
const http = Number(o.http);
const cdp = Number(o.cdp);
const evidence = resolve(root, o.evidence);
const profile = join(root, 'tests', 'artifacts', `edge-${o.task}`);

/** True when something already answers on the port (then it is somebody else's: report it, never stop it). */
async function busy(/** @type {number} */ port) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch (error) {
    return error instanceof Error && error.name === 'TimeoutError';
  }
}

/** One CDP connection: calls with a 30 s timeout, the page's errors and console lines. */
async function connect(/** @type {string} */ endpoint) {
  const socket = new WebSocket(endpoint);
  let serial = 0;
  /** @type {Map<number, { resolve: (v: any) => void, reject: (e: Error) => void, timer: any }>} */
  const pending = new Map();
  /** @type {any[]} */ const errors = [];
  /** @type {string[]} */ const logs = [];
  socket.addEventListener('message', (event) => {
    const m = JSON.parse(String(event.data));
    if (m.id !== undefined) {
      const item = pending.get(m.id);
      if (item === undefined) return;
      clearTimeout(item.timer);
      pending.delete(m.id);
      if (m.error) item.reject(new Error(JSON.stringify(m.error)));
      else item.resolve(m.result);
    } else if (m.method === 'Runtime.consoleAPICalled') {
      logs.push(m.params.args.map((/** @type {any} */ a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Network.loadingFailed'
      || (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
      || (m.method === 'Network.responseReceived' && m.params.response.status >= 400)) {
      errors.push(m);
    }
  });
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });
  const call = (/** @type {string} */ method, /** @type {object} */ params = {}) => new Promise((done, fail) => {
    const id = ++serial;
    const timer = setTimeout(() => {
      pending.delete(id);
      fail(new Error(`CDP timeout: ${method}`));
    }, 30000);
    timer.unref();
    pending.set(id, { resolve: done, reject: fail, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (/** @type {string} */ expression) => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`evaluation failed: ${expression.slice(0, 60)}`);
    return r.result.value;
  };
  return { call, evaluate, errors, logs, close: () => socket.close() };
}

/** Opens one page in the running Edge and follows it to its final data-result. */
async function runPage(/** @type {string} */ url, /** @type {string} */ phase, /** @type {string} */ out) {
  mkdirSync(out, { recursive: true });
  const base = `http://127.0.0.1:${cdp}`;
  const info = await (await fetch(`${base}/json/version`)).json();
  const target = await (await fetch(`${base}/json/new?about:blank`, { method: 'PUT' })).json();
  const page = await connect(target.webSocketDebuggerUrl);
  const started = Date.now();
  /** @type {any} */ let final = null;
  /** @type {string[]} */ const pressed = [];
  /** @type {string[]} */ const shots = [];
  let timedOut = true;
  let evaluationErrors = 0;
  try {
    for (const domain of ['Page', 'Runtime', 'Log', 'Network']) await page.call(`${domain}.enable`);
    await page.call('Emulation.setFocusEmulationEnabled', { enabled: true });
    if (phase === 'narrow') {
      await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await page.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    } else {
      await page.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    }
    await page.call('Page.navigate', { url });
    while (Date.now() - started < RUN_MS) {
      try {
        final = await page.evaluate('(() => { const d = document.documentElement.dataset; return { result: d.result ?? null, '
          + 'stage: d.stage ?? null, summary: d.summary || document.querySelector("#summary")?.textContent || "" }; })()');
        evaluationErrors = 0;
      } catch (error) {
        // A navigation can replace the context between two polls: retry, but not forever.
        if (++evaluationErrors > 50) throw error;
        await sleep(100);
        continue;
      }
      const stage = final?.stage;
      if (typeof stage === 'string' && stage.startsWith('key-') && !stage.endsWith('-done')) {
        const name = stage.slice(4);
        const shift = name.startsWith('Shift+');
        const k = KEYS[shift ? name.slice(6) : name];
        if (k === undefined) throw new Error(`the page asked for an unknown key: ${name}`);
        const modifiers = shift ? 8 : 0;
        const typed = k.text !== undefined && !shift;
        const key = { modifiers, key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode };
        await page.call('Input.dispatchKeyEvent', { type: typed ? 'keyDown' : 'rawKeyDown', ...key, ...(typed ? { text: k.text } : {}) });
        await page.call('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
        pressed.push(name);
        await page.evaluate(`document.documentElement.dataset.stage = ${JSON.stringify(`${stage}-done`)}`);
        continue;
      }
      if (typeof stage === 'string' && stage.startsWith('shot-') && !stage.endsWith('-done')) {
        const image = await page.call('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(out, `${stage.slice(5)}.png`), Buffer.from(image.data, 'base64'));
        shots.push(stage.slice(5));
        await page.evaluate(`document.documentElement.dataset.stage = ${JSON.stringify(`${stage}-done`)}`);
        continue;
      }
      if (final?.result === 'pass' || final?.result === 'fail') {
        timedOut = false;
        break;
      }
      await sleep(100);
    }
    const image = await page.call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(out, 'page.png'), Buffer.from(image.data, 'base64'));
    const viewport = await page.evaluate('({ w: innerWidth, h: innerHeight, coarse: matchMedia("(pointer: coarse)").matches })');
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    const pass = !timedOut && final?.result === 'pass' && page.errors.length === 0;
    writeFileSync(join(out, 'browser.json'), JSON.stringify({
      browser: info.Browser, url, phase, viewport, final, timedOut, seconds, pressed, shots, errors: page.errors,
      lastLogs: page.logs.slice(-50),
    }, null, 2));
    return { pass, seconds, final, timedOut, errors: page.errors.length, pressed: pressed.length, logs: page.logs.slice(-5) };
  } finally {
    page.close();
  }
}

if ((await busy(http)) || (await busy(cdp))) {
  console.error(`port ${http} or ${cdp} is in use by another process: report it (never stop it)`);
  process.exit(2);
}
mkdirSync(evidence, { recursive: true });
const server = spawn(process.execPath, ['tools/serve.mjs', '--port', String(http), '--prefix', '/pentomino/'], { cwd: root, stdio: 'ignore' });
console.log(`server PID ${server.pid}`);
/** @type {object[]} */ const rows = [];
let failed = 0;
try {
  for (const run of runs) {
    const query = run.phase === 'main' ? '' : `?phase=${run.phase}`;
    const url = `http://127.0.0.1:${http}/pentomino/tests/browser/${run.page}.html${query}`;
    rmSync(profile, { recursive: true, force: true });
    const edge = spawn(EDGE, ['--headless=new', '--disable-extensions', '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${cdp}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
      'about:blank'], { stdio: 'ignore' });
    const exited = new Promise((done) => edge.once('exit', done));
    /** @type {any} */ let row = { page: run.page, phase: run.phase, edgePid: edge.pid, pass: false };
    try {
      let ready = false;
      for (let i = 0; i < 80 && !ready; i += 1) {
        try {
          const a = await fetch(`http://127.0.0.1:${http}/pentomino/tests/browser/${run.page}.html`);
          const b = await fetch(`http://127.0.0.1:${cdp}/json/version`);
          ready = a.ok && b.ok;
        } catch {
          // not yet
        }
        if (!ready) await sleep(250);
      }
      if (!ready) throw new Error('the server or Edge did not start');
      row = { ...row, ...(await runPage(url, run.phase, join(evidence, run.page, run.phase))) };
    } catch (error) {
      row.error = error instanceof Error ? error.message : String(error);
    } finally {
      /** @type {any} */ let browser = null;
      try {
        const info = await (await fetch(`http://127.0.0.1:${cdp}/json/version`)).json();
        browser = await connect(info.webSocketDebuggerUrl);
        browser.call('Browser.close').catch(() => {});
      } catch {
        // already gone
      }
      await Promise.race([exited, sleep(5000)]);
      if (edge.exitCode === null && edge.signalCode === null) edge.kill();
      await Promise.race([exited, sleep(5000)]);
      browser?.close();
      for (let i = 0; i < 10 && existsSync(profile); i += 1) {
        try {
          rmSync(profile, { recursive: true, force: true });
        } catch {
          await sleep(500);
        }
      }
    }
    if (!row.pass) failed += 1;
    rows.push(row);
    const summary = String(row.final?.summary ?? '').replace(/\s+/g, ' ').slice(0, 160);
    console.log(`${row.pass ? 'PASS' : 'FAIL'} ${run.page} [${run.phase}] ${row.seconds ?? '-'} s, result ${row.final?.result ?? '-'}`
      + `${row.timedOut ? ' (timed out)' : ''}, "${summary}", errors ${row.errors ?? '-'}, keys ${row.pressed ?? 0}, Edge PID ${edge.pid}`
      + `${row.error ? `, runner error: ${row.error}` : ''}`);
    if (!row.pass) for (const line of row.logs ?? []) console.log(`  log: ${line}`);
  }
} finally {
  server.kill();
  console.log(`server PID ${server.pid} stopped; profile ${existsSync(profile) ? 'NOT removed' : 'removed'}`);
}
writeFileSync(join(evidence, 'runs.json'), JSON.stringify({ server: server.pid, runs: rows.map(({ logs, ...r }) => r) }, null, 2));
process.exitCode = failed === 0 ? 0 : 1;
```

Run from the repository root, one page and phase per invocation of the lock helper (Amendment L1; each about 1-2
minutes plus its lock wait; start the loop in async mode and read its output):

```powershell
. tests\artifacts\MP16b\dv3-lock.ps1
$pages = @('replay', 'replay:keys', 'rendering', 'generator-flow', 'acceptance')
for ($i = 0; $i -lt $pages.Count; $i++) {
  $t = Invoke-Dv3Timed -Task "MP16b GB-P4 $($pages[$i])" -NodeArgs @('tests/artifacts/MP16b/pages.mjs', '--task',
    'MP16b', '--http', '8816', '--cdp', '9316', '--evidence', "tests/artifacts/MP16b/pages/$($i + 1)", $pages[$i])
  "page $($i + 1) $($pages[$i]): exit $($t.Exit)"
  if ($t.TimedOut -or $t.Exit -eq 2) { throw "page run $($pages[$i]) stopped at the limit or did not start: report it" }
}
```

Announce the gate in your reply plan ("GB-P4: five runs, the four pages and the keys phase of replay, about 10
minutes plus the lock waits"); each run goes through the lock helper, which interleaves the gate with the Sudoku
repository's runs. `tests/browser/acceptance.html` reported "16 checks, 4 blocked" at the
regenerate-puzzle release (blocked checks need a physical device): the same blocked checks are expected; any new
blocked or failed check is reported.

### Documents (RES-32, MP13-MP16 row; EN and VI in the same task)

- `docs/design-detail.md` §10.5 "Step 3: Create puzzles" (line 2354 at HEAD): the "How it was made" button on each
  card, the dialog (link §6.12 and §11.11), what "Steps not available for this puzzle" means (imported puzzles, sets or
  puzzles made by an older version, completion-pass puzzles, an overflowing record).
- `docs/design-brief.md`: the Generator's feature list gains Generation Steps in one or two sentences.
- `USERGUIDE.md` (Generator part, line 41 at HEAD) and `USERGUIDE.vn.md` (line 40): a short subsection "How a puzzle
  was made": open it from a card, the two views (key steps, every step), Play and the slider, the score table, and when
  steps are not available.
- `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md` "Code layout" (line 92 at HEAD): `core/engine/replay.js`,
  `generator/ui/replay-model.js`, `generator/ui/replay-dialog.js`, `tests/browser/replay.html`, and the
  `--replay-case` mode of `tools/record-fixtures.mjs` (MP13b).
- `README.md` "Features" (lines 13-28): one line, for example "Generation Steps: replay how the generator made a
  puzzle, step by step, with its score table."

## Files to create/modify

| File | Change |
|---|---|
| `generator/ui/puzzle-panel.js` | the third button, `onReplay` |
| `generator/app.js` | the dialog and its wiring |
| `generator/state.js` | `replaySourceOf` |
| `generator/ui/replay-dialog.js`, `generator/ui/replay-model.js` | fixes proven by the page only |
| `generator/generator.css` | only `.card-replay` if needed |
| `tests/generator-state.test.js` | case N1 |
| `tests/browser/replay.html`, `tests/browser/replay.js` | new (main and keys phases) |
| `tests/browser/rendering.js` | one check |
| existing browser pages | only expectations changed by the third button (listed) |
| documents of the list above | as described |

Exclusive ownership while this task runs: the files above; scratch under `tests/artifacts/MP16b/` (the runner
`pages.mjs`, the lock helper `dv3-lock.ps1` and the evidence) and the Edge profile `tests\artifacts\edge-MP16b\`.

## Implementation steps

1. `replaySourceOf` and its Node test; the card button; the app wiring.
2. The browser page and the rendering check.
3. Run the targeted Node tests and the quick set; save the runner; announce GB-P4; run the five runs (one runner
   invocation each, through the lock helper); fix what they show (only in the files of this task); record the results.
4. The documents in both languages; `npm run test:quick`; `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP16b-B01 | Every generated puzzle card has a "How it was made" button that opens Generation Steps for that puzzle, and the replay confirms the puzzle | page checks 1, 4 |
| MP16b-B02 | The dialog can be used with the keyboard and a screen reader: focus, Tab order, Escape, focus return, labelled controls, no announcement of playback ticks | page checks 3, 5 (trusted keys, keys phase) |
| MP16b-B03 | Puzzles without steps say so; incomplete and mismatching replays show their status and never pass for the generated puzzle | page checks 7, 9, 10 |
| MP16b-B04 | Closing the dialog cancels only the replay | page check 11 |
| MP16b-B05 | The cards keep their selection, removal and keyboard behaviour | page check 6; generator-flow |
| MP16b-B06 | Users and developers can read about the feature in English and Vietnamese | documents |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP16b-T01 | The button is the third button inside `li.puzzle-card`; without `onReplay` the card is unchanged | page check 6; review |
| MP16b-T02 | `replaySourceOf` returns the set, the puzzle, the state's origin and the puzzle's record, or null | case N1 |
| MP16b-T03 | `highlightedIds` renders `data-highlighted` and `.pm-highlight` only when given | rendering check |
| MP16b-T04 | GB-P4: the five runs pass (replay main and keys, rendering, generator-flow, acceptance: the known blocked checks only), no CSP violation, no uncaught error; checks under 1 minute; one evidence directory per page and phase | gate record; the five `runs.json` |
| MP16b-T06 | Checks 1-2 use a `candidate` card and check 12 the calibration card (no stage 4 step); check 5 uses trusted keys only (the runner's `pressed` list is not empty) | page checks 1, 2, 5, 12; `browser.json` |
| MP16b-T05 | `npm run test:quick` and `npm run check` pass; documents in step in both languages | command output; review |

## Test plan

### Exact commands

```powershell
. tests\artifacts\MP16b\dv3-lock.ps1
$r = Invoke-Dv3Timed -Task 'MP16b targeted tests' -NodeArgs @('--test', '--test-skip-pattern=slow',
  'tests/generator-state.test.js', 'tests/generator-i18n.test.js', 'tests/replay-model.test.js')
if ($r.Exit -ne 0) { throw 'targeted tests failed' }

# announced gate GB-P4: ports 8816 / 9316, the loop of "Running the pages" (five runs, one helper invocation each)

$r = Invoke-Dv3Timed -Task 'MP16b quick set' -NodeArgs @('--test', '--test-skip-pattern=slow', 'tests/**/*.test.js')
if ($r.Exit -ne 0) { throw 'quick tests failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'check failed' }
```

### Required test cases

N1. `tests/generator-state.test.js`: `replaySourceOf` returns `{ set, puzzle, setOrigin, made }` for a listed puzzle
    with a record, `made: null` for a puzzle without one (also when `puzzleMade` has an inherited property of that
    name), and null without a set or for an unknown id.

The browser checks are those of "The browser page" above (checks 1-12; check 5 in the keys phase), plus the
rendering check.

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the gate record (pages, results, durations, PIDs stopped), any
  change to an existing page's expectation, any fix to MP16a's files with its failing check, and the test counts.
- Handoff to MP17: the pages of GB-P4 and their results; the documents of the feature.

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

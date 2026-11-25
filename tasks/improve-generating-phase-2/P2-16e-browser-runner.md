# P2-16e: The browser runner

| Item | Value |
|---|---|
| Feature, plan | `improve-generating-phase-2`; plan §4.6 ("browser deadline checks run on the shipping build"), §7.2 (six browser checks), §7.6 (990 s); P2-T13; review-1 R2, R12, R13; review-2 R2-03; `contracts.md` C16 |
| Repository, slot, branch, base | `Q:\git\pentomino`; the slot the orchestrator names (`Q:\git\pentomino-p2-w<n>`, check-list §3.7), branch `p2/P2-16e` from the `gen-v4` head at the start; G-PROTECTED base `97a6326` |
| Lane; starts when merged | T; the pack commit |
| Pack author / reviewer | SA-Opus / SA-Astra |
| Executor | Dev-Sonnet (`claude-sonnet-5.5`) |
| Estimate | developer 2 h; machine: one locked runner self-check (at most 120 s) |

## Goal

One command runs one browser check of a test page in headless Edge, under a 60-s watchdog, and writes a durable receipt.
The receipt names the check, its status and duration, its console lines, and the source files it ran on. It always
cleans up its own browser, server and profile, also on failure or timeout. P2-16b's six deadline checks and P2-19's six
locked items use it.

## Authority and fixed points

- **The price** (check-list §3.5): six invocations of at most 120 s each, 990 counted s in all. One invocation runs one
  check.
- **R12, verbatim:** "Each check has an explicit per-check 60-s watchdog even when the runner executes all six. Emit a
  durable JSON/log receipt containing the six names, status, duration and shipping-build source bindings. Cleanup is
  in `finally`: close the owned browser and server and remove the owned profile on failure/timeout too; any process
  termination is limited to that invocation's PID tree."
- **R2.** The tool writes its own CRLF UTF-8 receipt and log to `--out`. The lock helper's console is not evidence. The
  receipt's format is `contracts.md` C16, which P2-13v's `browserGate` reads for gate A5 (review-2 R2-05).
- **R13.** A receipt binds the files the check ran on, including `generator/jobs.js`, the locales, and the replay model
  and cache.
- **The pieces that exist:**
  - `createStaticServer({ root, prefix })` of `tools/serve.mjs` (line 92), prefix `/pentomino/`; it returns an
    `http.Server`;
  - Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`;
  - the page convention of `tests/browser/watchdog.js`: `CHECK-START <name>` and `CHECK-END PASS|FAIL <s> s <name>`
    console lines, and `data-result` `pass` or `fail` on `<html>` (lines 33-44 and 248).
- **No dependency.** The DevTools protocol goes over Edge's pipe (`--remote-debugging-pipe`, file descriptors 3 and 4,
  each message ending with `\0`). Nothing is installed.

## Scope

- **Create:**
  - `tools/ig-proto/phase2/browser-run.mjs`;
  - `tools/ig-proto/phase2/browser-run.test.mjs`;
  - `tools/ig-proto/phase2/fixtures/browser-selftest.html` and `tools/ig-proto/phase2/fixtures/browser-selftest.js`:
    a page that sets `data-result` by its `?check=` value (`pass`, `fail`, or `hang`, which never sets it), between the
    two console lines.
- **Do not change:** anything else. Guard: G-PROTECTED, and G-WORKTREE with

  ```powershell
  $Allowed = @('tools/ig-proto/phase2/browser-run.mjs', 'tools/ig-proto/phase2/browser-run.test.mjs',
    'tools/ig-proto/phase2/fixtures/browser-selftest.html', 'tools/ig-proto/phase2/fixtures/browser-selftest.js',
    'tasks/improve-generating-phase-2/P2-16e-browser-runner.md')
  ```

## Steps

1. **`browser-run.mjs --page <path> --check <name> --out <dir> [--timeout-s <s>] [--bind <path>...]`.** The page path
   is relative to the repository root. `--timeout-s` defaults to 60. Each `--bind` names one more source file.
   1. Start `createStaticServer({ root: <repository root>, prefix: '/pentomino/' })` on `127.0.0.1`, port 0.
   2. Create the profile folder `tests/artifacts/ig-proto/phase2/edge/<pid>-<ms>/`.
   3. Spawn Edge with the arguments `--headless=new`, `--remote-debugging-pipe`, `--no-first-run`,
      `--no-default-browser-check`, `--user-data-dir=<absolute profile folder>` and `about:blank`, and with
      `stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe']`.
   4. Over the pipe:
      - `Target.createTarget` with `http://127.0.0.1:<port>/pentomino/<page>?check=<name>`;
      - `Target.attachToTarget` with `flatten: true`;
      - `Runtime.enable` on that session.
      - Keep every `Runtime.consoleAPICalled` text as a console line.
   5. Every 500 ms, evaluate `document.documentElement.dataset.result ?? ''` until it is `pass` or `fail`, or until
      `--timeout-s` seconds have passed (status `timeout`).
   6. In `finally`:
      - send `Browser.close` and wait at most 5 s for Edge to exit;
      - if Edge has not exited, run `taskkill /PID <its pid> /T /F` (its own tree only);
      - close the server;
      - remove the profile folder; if that fails, note it in the receipt as `cleanup`.
   7. Write `<dir>/receipt.json` and `<dir>/console.log` (CRLF, UTF-8 without BOM). The receipt is
      `{ format: 'p2-browser', version: 1, page, check, status, durationMs, startedAt, endedAt, edgePid, consoleLines, cleanup, sources }`.
      `status` is `pass`, `fail`, `timeout` or `error`. `sources` is `[{ path, sha256 }]` (text hashed after `lf`) for:
      - the page and every file of `tests/browser/` whose name starts with the page's base name without its extension
        (`deadline` for `deadline.html`);
      - `tools/bench/report.js`'s `SOURCE_FILES`;
      - `generator/jobs.js`, `generator/locale.en.js`, `generator/locale.vi.js`, `generator/ui/replay-model.js` and
        `generator/ui/replay-cache.js`;
      - each `--bind` path.
   8. **Exit codes:** 0 `pass`; 1 `fail`; 2 `timeout`; 3 `error`; 4 Edge is missing (nothing launched; a receipt with
      `status: 'error'`).
   - Export the pure parts for the tests: `frame(message)` and `unframe(buffer)` (the `\0` framing), `receiptOf(...)`
     and `sourcesOf(page, binds)`.
2. **The self-test page.** `browser-selftest.html` holds the CSP `<meta>` of `tests/browser/watchdog.html` and a module
   script `browser-selftest.js`. The script reads `check` from `location.search` and logs `CHECK-START <check>`. For
   `pass` and `fail` it logs the `CHECK-END` line and sets `data-result` to that value; for `hang` it does nothing more.
3. **`browser-run.test.mjs`:** the unit cases below run unlocked. The self-check is one locked command (step 4).
4. **The self-check:** a locked invocation of a small Node script, inline in the command below, that runs
   `browser-run.mjs` three times on the self-test page (`pass`; `fail`; `hang` with `--timeout-s 5`), into
   `tests/artifacts/ig-proto/phase2/self-test/browser-<ms>/<check>/`, and prints the three exit codes and statuses.

## Tests

| Test file | Case name | Input | Expected |
|---|---|---|---|
| `tools/ig-proto/phase2/browser-run.test.mjs` | `pipe messages are framed by a zero byte` | two JSON messages in one buffer, and one split across two buffers | `unframe` returns the two messages, then the split one when complete |
| same | `the receipt has the required fields` | `receiptOf` of a fake run | exactly the fields of step 1.7; `durationMs` a number |
| same | `the sources bind the shipping build` | (review-2 R2-03) `sourcesOf('tools/ig-proto/phase2/fixtures/browser-selftest.html', ['tools/ig-proto/phase2/fixtures/browser-selftest.js'])` | holds both fixture paths, `generator/jobs.js`, both locales, `replay-model.js`, `replay-cache.js` and every `SOURCE_FILES` path, each with a 64-hex `sha256` |
| the self-check (step 4) | `pass`, `fail`, `hang` | the self-test page | exit 0 `pass`; exit 1 `fail`; exit 2 `timeout`; each receipt written; no profile folder left under `tests/artifacts/ig-proto/phase2/edge/`; `Get-Process -Id <edgePid>` finds nothing for each receipt |

## Documentation

None here; P2-17 documents the runner in `tools/ig-proto/README.md`.

## Commands and gates

| Command | Where | Expected | Time limit |
|---|---|---|---|
| `node --test tools/ig-proto/phase2/browser-run.test.mjs` | slot root, unlocked (no browser) | `# fail 0`, `# cancelled 0` | 2 min |
| the locked self-check: `Invoke-IgNode -Repo pentomino -Task 'P2-16e selfcheck' -LimitSeconds 120 -QuietSeconds 45 -NodeArgs @('--input-type=module', '-e', "import { spawnSync } from 'node:child_process'; const out = 'tests/artifacts/ig-proto/phase2/self-test/browser-' + Date.now(); for (const [c, extra] of [['pass', []], ['fail', []], ['hang', ['--timeout-s', '5']]]) { const r = spawnSync(process.execPath, ['tools/ig-proto/phase2/browser-run.mjs', '--page', 'tools/ig-proto/phase2/fixtures/browser-selftest.html', '--check', c, '--out', out + '/' + c, ...extra], { encoding: 'utf8' }); console.log(c, r.status); }")` | §3.3 | `pass 0`, `fail 1`, `hang 2` | 120 s |
| G-CHECK, G-PROTECTED, G-WORKTREE, G-FORMAT | §3.4 | OK lines | 2 min |

## Stop points and questions

- **Stop and report** when Edge does not start with `--remote-debugging-pipe` on this machine, or when a self-check run
  leaves a process or a profile folder behind.

## Acceptance criteria

### Business

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16e-B01 | A browser check leaves a durable record of what ran, on which sources, and how it ended | the self-check | the three receipts (reported, not committed) |

### Technical

| ID | Criterion | How it is verified | Evidence |
|---|---|---|---|
| P2-16e-T01 | R12: a per-check watchdog; cleanup in `finally`, limited to its own PID tree | the `hang` run; no leftovers | self-check output |
| P2-16e-T02 | R2 and R13: the tool's own receipt, binding the shipping sources | unit cases | test output |

## Checklist

- [ ] Every step done; nothing outside `$Allowed` changed
- [ ] Tests added and green; the self-check gives `pass 0`, `fail 1`, `hang 2`
- [ ] G-FORMAT, G-CHECK, G-PROTECTED pass
- [ ] Every AC row has its evidence

## Final report

- the start and end times, and the files changed;
- the self-check output and the helper line;
- each AC row with its evidence;
- the questions and deviations.

## Execution log

| Item | Value |
|---|---|
| Slot, base SHA | w3, df7261576074fa267aab660b023ad6971b5f61fd |
| Start, end, duration | dispatched 2026-11-25 22:58 +07:00 (developer clock 22:27:25 to 22:31); accepted 23:10; about 12 min |
| Waiting for rulings | about 5 min (SA-Opus) |
| Agent id, model | 715a631e-37cc-418f-8441-e8aa098dce30, claude-sonnet-5.5 |
| Calls; input, output and cache-read tokens | 20; 1,477,159 / 24,007 / 1,412,329 |
| AI credits | 54.34 |
| Questions and rulings | no QUESTION; SA-Opus accepted deviations 1-9 and the three gaps with no code fix; C16 now pins consoleLines text (arguments joined by spaces), startedAt/endedAt/durationMs and cleanup (null or a string); P2-19 step 3 checks a non-null cleanup receipt's Edge PID before stage B (55774d4) |
| Fix rounds | 0 |
| Gates re-run by the orchestrator (merge gate) | slot static guards OK (format OK 5 files); rebased onto 55774d4 cleanly; merge gate: G-PROTECTED, G-CHECK, G-FORMAT-COMMIT OK; locked `IG P2-16e merge exit=0 seconds=0.355 quiet=45`, every phase-2 test file 31/31 pass; link anchors 22 of 22 |
| Commit (slot), commit on `gen-v4` | slot 556f320, rebased e14e7a4; gen-v4 e14e7a437bee4ec6e15825cd9b84768e4bd4fa3f |
| Issues and named items | none; P2-17 documents the runner; P2-16b and P2-19 use one invocation per check |

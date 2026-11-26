// @ts-check
// Runs ONE check of a browser test page in headless Edge under a watchdog and writes a durable receipt (P2-16e;
// contracts.md C16; R2, R12, R13). The DevTools protocol goes over Edge's pipe (file descriptors 3 and 4, each message
// ending with a zero byte); nothing is installed. The page signals its end with `data-result` on <html>, and its
// console lines `CHECK-START <name>` and `CHECK-END PASS|FAIL <s> s <name>` are kept in the receipt.
//
//   node tools/ig-proto/phase2/browser-run.mjs --page <path> --check <name> --out <dir> [--timeout-s <s>] [--bind <path>...]
//
// Exit codes: 0 pass; 1 fail; 2 timeout; 3 error; 4 Edge is missing (nothing launched).
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { SOURCE_FILES } from '../../bench/report.js';
import { createStaticServer } from '../../serve.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PREFIX = '/pentomino/';
const POLL_MS = 500;
const CLOSE_WAIT_MS = 5000;
const DEFAULT_TIMEOUT_S = 60;
const GENERATOR_SOURCES = Object.freeze([
  'generator/jobs.js', 'generator/locale.en.js', 'generator/locale.vi.js', 'generator/ui/replay-model.js', 'generator/ui/replay-cache.js',
]);
const EXIT = Object.freeze({ pass: 0, fail: 1, timeout: 2, error: 3 });

/**
 * @param {unknown} message A JSON-serialisable protocol message.
 * @returns {Buffer} The message with the zero-byte terminator.
 */
export function frame(message) {
  return Buffer.concat([Buffer.from(JSON.stringify(message), 'utf8'), Buffer.from([0])]);
}

/**
 * @param {Buffer} buffer Unread bytes: the rest of the previous call followed by the new data.
 * @returns {{ messages: any[], rest: Buffer }} The complete messages and the bytes of an unfinished one.
 */
export function unframe(buffer) {
  const messages = [];
  let start = 0;
  for (let end = buffer.indexOf(0, start); end >= 0; end = buffer.indexOf(0, start)) {
    if (end > start) {
      messages.push(JSON.parse(buffer.subarray(start, end).toString('utf8')));
    }
    start = end + 1;
  }
  return { messages, rest: buffer.subarray(start) };
}

/** @param {string} text @returns {string} Lowercase hex SHA-256 of the text after `lf`. */
function sha256Lf(text) {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

/**
 * The files a check ran on (C16): the page, `tests/browser/` files named like the page, the shipping SOURCE_FILES, the
 * generator files of the replay page and each bound path.
 * @param {string} page Repository-relative page path.
 * @param {string[]} [binds] Repository-relative paths.
 * @param {string} [root] Repository root.
 * @returns {{ path: string, sha256: string }[]}
 */
export function sourcesOf(page, binds = [], root = ROOT) {
  const base = (page.split('/').pop() ?? '').replace(/\.[^.]*$/, '');
  const browserDir = join(root, 'tests', 'browser');
  const named = existsSync(browserDir)
    ? readdirSync(browserDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.startsWith(base))
      .map((entry) => `tests/browser/${entry.name}`)
      .sort()
    : [];
  const paths = [...new Set([page, ...named, ...SOURCE_FILES, ...GENERATOR_SOURCES, ...binds])];
  return paths.map((path) => ({ path, sha256: sha256Lf(readFileSync(join(root, ...path.split('/')), 'utf8')) }));
}

/**
 * @param {{ page: string, check: string, status: string, durationMs: number, startedAt: string, endedAt: string,
 *   edgePid: number | null, consoleLines: string[], cleanup: string | null, sources: { path: string, sha256: string }[] }} run
 * @returns {Record<string, unknown>} The receipt of contracts.md C16, fields in this order.
 */
export function receiptOf(run) {
  return {
    format: 'p2-browser',
    version: 1,
    page: run.page,
    check: run.check,
    status: run.status,
    durationMs: run.durationMs,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    edgePid: run.edgePid,
    consoleLines: run.consoleLines,
    cleanup: run.cleanup,
    sources: run.sources,
  };
}

/** @param {string} text @returns {string} CRLF text with a final newline. */
function crlf(text) {
  const lf = text.replace(/\r\n/g, '\n');
  return (lf.endsWith('\n') ? lf : `${lf}\n`).replace(/\n/g, '\r\n');
}

/**
 * @param {string} out Output folder.
 * @param {Record<string, any>} receipt
 */
function writeReceipt(out, receipt) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'receipt.json'), crlf(JSON.stringify(receipt, null, 2)), 'utf8');
  const lines = /** @type {string[]} */ (receipt.consoleLines);
  writeFileSync(join(out, 'console.log'), lines.length === 0 ? '' : crlf(lines.join('\n')), 'utf8');
}

/**
 * @param {string[]} argv
 * @returns {{ page: string, check: string, out: string, timeoutS: number, binds: string[] }}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const values = {};
  /** @type {string[]} */
  const binds = [];
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (value === undefined || !['--page', '--check', '--out', '--timeout-s', '--bind'].includes(flag)) {
      throw new Error(`Bad argument: ${flag}`);
    }
    if (flag === '--bind') {
      binds.push(value.replace(/\\/g, '/'));
    } else {
      values[flag] = value;
    }
  }
  for (const flag of ['--page', '--check', '--out']) {
    if (!values[flag]) {
      throw new Error(`Missing ${flag}`);
    }
  }
  const timeoutS = values['--timeout-s'] === undefined ? DEFAULT_TIMEOUT_S : Number(values['--timeout-s']);
  if (!Number.isFinite(timeoutS) || timeoutS <= 0) {
    throw new Error(`Invalid --timeout-s: ${values['--timeout-s']}`);
  }
  return { page: values['--page'].replace(/\\/g, '/'), check: values['--check'], out: values['--out'], timeoutS, binds };
}

/** @param {number} ms @returns {Promise<void>} */
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

/**
 * Starts Edge on the pipe and returns a small protocol client. Everything it owns is released by `dispose`.
 * @param {string} profile Absolute profile folder.
 */
function launchEdge(profile) {
  const child = spawn(EDGE, [
    '--headless=new', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'], windowsHide: true });
  /** @type {Promise<void>} */
  const exited = new Promise((resolveExit) => {
    child.once('exit', () => resolveExit());
    child.once('error', () => resolveExit());
  });
  let hasExited = false;
  void exited.then(() => {
    hasExited = true;
  });
  const toEdge = /** @type {import('node:net').Socket} */ (child.stdio[3]);
  const fromEdge = /** @type {import('node:net').Socket} */ (child.stdio[4]);
  for (const socket of [toEdge, fromEdge]) {
    socket.on('error', () => {});
  }

  let nextId = 1;
  /** @type {Map<number, { resolve: (value: any) => void, reject: (error: Error) => void }>} */
  const pending = new Map();
  /** @type {string[]} */
  const consoleLines = [];
  let rest = Buffer.alloc(0);
  fromEdge.on('data', (/** @type {Buffer} */ chunk) => {
    const parsed = unframe(Buffer.concat([rest, chunk]));
    rest = parsed.rest;
    for (const message of parsed.messages) {
      if (message.id !== undefined && pending.has(message.id)) {
        const waiter = /** @type {NonNullable<ReturnType<typeof pending.get>>} */ (pending.get(message.id));
        pending.delete(message.id);
        if (message.error) {
          waiter.reject(new Error(`${message.error.message ?? 'protocol error'}`));
        } else {
          waiter.resolve(message.result);
        }
      } else if (message.method === 'Runtime.consoleAPICalled') {
        const args = /** @type {any[]} */ (message.params?.args ?? []);
        consoleLines.push(args.map((arg) => (typeof arg.value === 'string' ? arg.value : String(arg.description ?? arg.value ?? arg.type))).join(' '));
      }
    }
  });
  fromEdge.on('close', () => {
    for (const waiter of pending.values()) {
      waiter.reject(new Error('Edge closed the pipe'));
    }
    pending.clear();
  });

  /**
   * @param {string} method
   * @param {Record<string, unknown>} [params]
   * @param {string} [sessionId]
   * @returns {Promise<any>}
   */
  const send = (method, params = {}, sessionId) => new Promise((resolveSend, rejectSend) => {
    const id = nextId;
    nextId += 1;
    pending.set(id, { resolve: resolveSend, reject: rejectSend });
    /** @type {Record<string, unknown>} */
    const message = { id, method, params };
    if (sessionId) {
      message.sessionId = sessionId;
    }
    toEdge.write(frame(message), (error) => {
      if (error) {
        pending.delete(id);
        rejectSend(error);
      }
    });
  });

  return {
    pid: child.pid ?? null,
    consoleLines,
    exited,
    hasExited: () => hasExited,
    send,
    /** @returns {Promise<string[]>} Cleanup problems; empty when Edge is gone. */
    async close() {
      /** @type {string[]} */
      const problems = [];
      if (!hasExited) {
        void send('Browser.close').catch(() => {});
        await Promise.race([exited, sleep(CLOSE_WAIT_MS)]);
      }
      if (!hasExited && child.pid) {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
        await Promise.race([exited, sleep(CLOSE_WAIT_MS)]);
        if (!hasExited) {
          problems.push(`Edge ${child.pid} is still running`);
        }
      }
      toEdge.destroy();
      fromEdge.destroy();
      return problems;
    },
  };
}

/**
 * @param {string} profile
 * @returns {Promise<string | null>} A note when the folder could not be removed.
 */
async function removeProfile(profile) {
  let lastError = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      rmSync(profile, { recursive: true, force: true });
      return null;
    } catch (error) {
      lastError = error;
      await sleep(300);
    }
  }
  return `profile ${profile} not removed: ${lastError instanceof Error ? lastError.message : String(lastError)}`;
}

/**
 * Runs one check and writes its receipt.
 * @param {{ page: string, check: string, out: string, timeoutS: number, binds: string[] }} options
 * @returns {Promise<number>} The exit code.
 */
export async function run(options) {
  const { page, check, out, timeoutS, binds } = options;
  const startedMs = Date.now();
  const startedAt = new Date(startedMs).toISOString();
  /** @type {string} */
  let status = 'error';
  let endedMs = startedMs;
  let edgePid = null;
  /** @type {string[]} */
  let consoleLines = [];
  /** @type {string[]} */
  const cleanupNotes = [];
  /** @type {{ path: string, sha256: string }[]} */
  let sources = [];
  let exitCode = 3;

  const finish = () => {
    const cleanup = cleanupNotes.length === 0 ? null : cleanupNotes.join('; ');
    writeReceipt(out, receiptOf({
      page, check, status, durationMs: endedMs - startedMs, startedAt, endedAt: new Date(endedMs).toISOString(), edgePid, consoleLines, cleanup, sources,
    }));
  };

  try {
    sources = sourcesOf(page, binds);
  } catch (error) {
    console.error(`browser-run: ${error instanceof Error ? error.message : String(error)}`);
    endedMs = Date.now();
    finish();
    return 3;
  }
  if (!existsSync(EDGE)) {
    console.error(`browser-run: Edge is missing at ${EDGE}`);
    endedMs = Date.now();
    finish();
    return 4;
  }

  const server = createStaticServer({ root: ROOT, prefix: PREFIX });
  const profile = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'phase2', 'edge', `${process.pid}-${startedMs}`);
  /** @type {ReturnType<typeof launchEdge> | null} */
  let edge = null;
  /** @type {NodeJS.Timeout | null} */
  let watchdog = null;
  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once('error', rejectListen);
      server.listen(0, '127.0.0.1', () => resolveListen(undefined));
    });
    const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
    mkdirSync(profile, { recursive: true });
    edge = launchEdge(profile);
    edgePid = edge.pid;
    const launched = edge;
    const deadline = new Promise((resolveDeadline) => {
      watchdog = setTimeout(() => resolveDeadline('timeout'), timeoutS * 1000);
    });
    const gone = launched.exited.then(() => 'gone');

    const work = (async () => {
      const url = `http://127.0.0.1:${port}${PREFIX}${page}?check=${encodeURIComponent(check)}`;
      const { targetId } = await launched.send('Target.createTarget', { url });
      const { sessionId } = await launched.send('Target.attachToTarget', { targetId, flatten: true });
      await launched.send('Runtime.enable', {}, sessionId);
      for (;;) {
        const reading = await launched.send('Runtime.evaluate', {
          expression: "document.documentElement.dataset.result ?? ''", returnByValue: true,
        }, sessionId);
        const value = reading.result?.value;
        if (value === 'pass' || value === 'fail') {
          await sleep(100);
          return value;
        }
        await sleep(POLL_MS);
      }
    })();
    work.catch(() => {});
    const outcome = await Promise.race([work, deadline, gone]);
    if (outcome === 'pass' || outcome === 'fail') {
      status = outcome;
    } else if (outcome === 'timeout') {
      status = 'timeout';
    } else {
      status = 'error';
      console.error('browser-run: Edge exited before the check ended');
    }
  } catch (error) {
    status = 'error';
    console.error(`browser-run: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    endedMs = Date.now();
    if (watchdog) {
      clearTimeout(watchdog);
    }
    if (edge) {
      consoleLines = [...edge.consoleLines];
      cleanupNotes.push(...await edge.close());
    }
    await new Promise((resolveClose) => {
      server.close(() => resolveClose(undefined));
      server.closeAllConnections();
    });
    const profileNote = await removeProfile(profile);
    if (profileNote) {
      cleanupNotes.push(profileNote);
    }
  }
  exitCode = EXIT[/** @type {keyof typeof EXIT} */ (status)] ?? 3;
  finish();
  return exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let code = 3;
  try {
    code = await run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Usage: node tools/ig-proto/phase2/browser-run.mjs --page <path> --check <name> --out <dir> [--timeout-s <s>] [--bind <path>...]');
  }
  process.exit(code);
}

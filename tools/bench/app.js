// @ts-check
// Unattended browser benchmark page (design §8.7; T21). It drives the same runner
// and report modules as tools/calibrate.mjs, with four module workers, the
// longtask/heartbeat instrumentation and the real Cancel button. Thumbnails stay
// off, so `renderingEnabled` is always false. Automation: `?auto=smoke` starts the
// smoke matrix on load; `?matrix=<path>` loads a same-origin matrix file (relative to this page)
// instead of the chooser and `?auto=matrix` starts it on load; `?commit=<sha>` records the served commit id.
import { createPool, systemClock } from '../../core/browser/worker-pool.js';
import { downloadText, el } from '../../core/browser/dom.js';
import { MODEL } from '../../core/engine/difficulty.js';
import { POLICY_ID } from '../../core/engine/policy.js';
import { RNG_ID } from '../../core/engine/rng.js';
import { ALGO_ID, APP_VERSION } from '../../core/engine/version.js';
import { matrixDigest } from './calibration-reference.js';
import { buildReport, computeSourceDigest, renderMarkdown, reportJson, toCrlf } from './report.js';
import { browserMonitorEnv, createResponsiveness } from './responsiveness.js';
import { planRuns, releaseHost, runMatrix, validateMatrix } from './runner.js';

const WORKERS = 4;
const MEMORY_POLL_MS = 1000;
const g = /** @type {any} */ (globalThis);
const byId = (/** @type {string} */ id) => /** @type {any} */ (g.document.getElementById(id));
const params = new URLSearchParams(g.location.search);

const state = {
  running: false,
  stop: false,
  /** @type {(() => void) | null} */
  probeHandler: null,
  /** @type {(() => void) | null} */
  userCancel: null,
  /** @type {ReturnType<typeof buildReport> | null} */
  report: null,
  markdown: '',
};

/** @param {string} text */
function setStatus(text) {
  byId('status').textContent = text;
}

/** @param {string} value */
function setState(value) {
  g.document.body.dataset.state = value;
}

/**
 * Browser memory API measurement; it needs cross-origin isolation, otherwise the
 * evidence is the task manager or about:memory (recorded by hand, never guessed).
 */
function trackMemory() {
  const usable = typeof g.performance?.measureUserAgentSpecificMemory === 'function' && g.crossOriginIsolated === true;
  if (!usable) {
    return {
      stop: () => ({
        bytes: /** @type {number | null} */ (null),
        notes: ['browser memory API unavailable (needs cross-origin isolation): collect task-manager or about:memory evidence by hand'],
      }),
    };
  }
  let alive = true;
  let peak = 0;
  const poll = async () => {
    while (alive) {
      try {
        const sample = await g.performance.measureUserAgentSpecificMemory();
        peak = Math.max(peak, sample.bytes);
      } catch {
        return;
      }
      await new Promise((resolve) => g.setTimeout(resolve, MEMORY_POLL_MS));
    }
  };
  void poll();
  return {
    stop() {
      alive = false;
      return {
        bytes: peak > 0 ? peak : null,
        notes: ['performance.measureUserAgentSpecificMemory polled once per second (agent cluster incl. workers; deduplicated by the browser)'],
      };
    },
  };
}

/**
 * @param {'cold' | 'warm'} lifecycle
 * @param {string} digest
 * @returns {import('./runner.js').Host}
 */
function createBrowserHost(lifecycle, digest) {
  const ua = g.navigator.userAgent;
  return {
    kind: 'browser',
    platform: g.navigator.userAgentData?.platform ?? g.navigator.platform ?? 'unknown',
    browserOrNode: ua,
    workerCount: WORKERS,
    lifecycle,
    sourceCommit: params.get('commit') ?? 'unknown (serve the page with ?commit=<sha>)',
    sourceDigest: digest,
    versions: { algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, model: MODEL, app: APP_VERSION },
    clock: systemClock,
    createPool: (size, clock) => createPool({ size, clock }),
    responsiveness: createResponsiveness(browserMonitorEnv(g)),
    processMemory: trackMemory,
    clickCancel: (handler) => {
      state.probeHandler = handler;
      g.setTimeout(() => byId('cancel').click(), 0);
    },
    uiIdle: () => new Promise((resolve) => g.setTimeout(resolve, 0)),
    renderingEnabled: false,
  };
}

function describeEnvironment() {
  const env = byId('env');
  const entries = /** @type {[string, string][]} */ ([
    ['User agent', g.navigator.userAgent],
    ['Logical cores', String(g.navigator.hardwareConcurrency ?? 'unknown')],
    ['Device memory (GB, coarse)', String(g.navigator.deviceMemory ?? 'unknown')],
    ['Cross-origin isolated', String(g.crossOriginIsolated === true)],
    ['Long-task API', String(g.PerformanceObserver?.supportedEntryTypes?.includes('longtask') === true)],
    ['Visibility', g.document.visibilityState],
    ['Workers', `${WORKERS} module workers`],
  ]);
  for (const [name, value] of entries) {
    env.append(el('dt', { text: name }), el('dd', { text: value }));
  }
}

/** @param {number | null} ms */
const fmt = (ms) => (ms === null ? 'n/a' : `${Math.round(ms)} ms`);

/** @param {import('./report.js').RunRecord} run */
function addRow(run) {
  const cells = [run.probeKind, run.caseId, run.seed, `${run.acceptedCount}/10`, fmt(run.firstReadyMs), fmt(run.tenthReadyMs),
    fmt(run.responseMs), fmt(run.cancelLatencyMs), `${fmt(run.maxMainTaskMs)} (${run.mainTaskMethod})`, run.partialReason ?? 'complete'];
  byId('rows').append(el('tr', { dataset: { valid: String(run.measurementValid) } }, ...cells.map((text) => el('td', { text }))));
}

/** @returns {Promise<string>} */
async function sourceDigest() {
  return computeSourceDigest(async (path) => {
    const response = await g.fetch(new URL(`../../${path}`, g.location.href));
    if (!response.ok) {
      throw new Error(`cannot read ${path} (${response.status})`);
    }
    return response.text();
  });
}

/** @returns {Promise<string>} */
async function readMatrixText() {
  if (params.has('matrix')) {
    const url = new URL(/** @type {string} */ (params.get('matrix')), g.location.href);
    if (url.origin !== g.location.origin) {
      throw new Error('the matrix must be served from this origin');
    }
    const response = await g.fetch(url);
    if (!response.ok) {
      throw new Error(`cannot load the matrix (${response.status})`);
    }
    return response.text();
  }
  if (byId('matrix').value === 'file') {
    const file = byId('matrix-file').files?.[0];
    if (file === undefined) {
      throw new Error('choose a matrix file first');
    }
    return file.text();
  }
  const response = await g.fetch(new URL('./matrices/smoke.json', import.meta.url));
  if (!response.ok) {
    throw new Error(`cannot load the smoke matrix (${response.status})`);
  }
  return response.text();
}

async function start() {
  if (state.running) {
    return;
  }
  state.running = true;
  state.stop = false;
  state.report = null;
  byId('rows').replaceChildren();
  byId('start').disabled = true;
  byId('cancel').disabled = false;
  byId('download-json').disabled = true;
  byId('download-md').disabled = true;
  setState('running');
  try {
    const text = await readMatrixText();
    const matrix = validateMatrix(JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text));
    setStatus('Hashing the measured sources...');
    const digest = await sourceDigest();
    const lifecycle = byId('lifecycle').value === 'warm' ? 'warm' : 'cold';
    const host = createBrowserHost(lifecycle, digest);
    const watchdogScale = Number(byId('watchdog').value) || 0;
    const plan = { cancelProbes: byId('cancel-probes').checked, watchdogScale };
    const specs = planRuns(matrix, plan);
    const startedAt = new Date().toISOString();
    const progress = byId('progress');
    progress.max = specs.length;
    progress.value = 0;
    /** @type {import('./report.js').RunRecord[]} */
    const runs = [];
    try {
      await runMatrix(matrix, host, {
        specs,
        shouldStop: () => state.stop,
        run: { registerCancel: (fn) => { state.userCancel = fn; } },
        onStart: (spec, index, total) => setStatus(`Row ${index + 1} of ${total}: ${spec.probeKind} ${spec.caseId} (seed ${spec.seed})`),
        onRun: (run) => {
          runs.push(run);
          progress.value = runs.length;
          addRow(run);
        },
      });
    } finally {
      releaseHost(host);
    }
    const repetitions = Object.fromEntries(matrix.cases.map((c) => [c.id, c.repetitions]));
    const report = buildReport({
      kind: 'browser',
      profile: matrix.profile,
      sourceCommit: host.sourceCommit,
      sourceDigest: digest,
      versions: host.versions,
      platform: host.platform,
      browserOrNode: host.browserOrNode,
      hardware: {
        userAgent: g.navigator.userAgent,
        logicalCores: g.navigator.hardwareConcurrency ?? null,
        deviceMemoryGB: g.navigator.deviceMemory ?? null,
        crossOriginIsolated: g.crossOriginIsolated === true,
      },
      workerCount: WORKERS,
      lifecycle,
      matrixDigest: matrixDigest(matrix),
      startedAt,
      finishedAt: new Date().toISOString(),
      expectedRuns: specs.length,
      notes: ['thumbnails off (renderingEnabled false); full-preview UX checks belong to the release acceptance task'],
    }, runs, { repetitions });
    state.report = report;
    state.markdown = toCrlf(renderMarkdown(report));
    byId('download-json').disabled = false;
    byId('download-md').disabled = false;
    setStatus(report.complete ? `Done: ${runs.length} rows.` : `Stopped: ${runs.length} of ${specs.length} rows recorded.`);
    setState('done');
  } catch (e) {
    setStatus(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    setState('error');
  } finally {
    state.running = false;
    byId('start').disabled = false;
    byId('cancel').disabled = true;
  }
}

function wire() {
  describeEnvironment();
  byId('matrix').addEventListener('change', () => {
    byId('matrix-file').disabled = byId('matrix').value !== 'file';
  });
  byId('start').addEventListener('click', () => void start());
  byId('cancel').addEventListener('click', () => {
    // A cancel probe routes through this very handler; a user click stops the matrix.
    const probe = state.probeHandler;
    if (probe !== null) {
      state.probeHandler = null;
      probe();
      return;
    }
    state.stop = true;
    state.userCancel?.();
  });
  byId('download-json').addEventListener('click', () => {
    if (state.report !== null) {
      downloadText('bench-report.json', reportJson(state.report), 'application/json;charset=utf-8');
    }
  });
  byId('download-md').addEventListener('click', () => {
    if (state.markdown !== '') {
      downloadText('bench-report.md', state.markdown, 'text/markdown;charset=utf-8');
    }
  });
  g.__bench = { report: () => state.report, reportJson: () => (state.report === null ? null : reportJson(state.report)) };
  setState('idle');
  if (params.get('auto') === 'smoke' || (params.get('auto') === 'matrix' && params.has('matrix'))) {
    void start();
  }
}

wire();

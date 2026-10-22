// @ts-check
// Main-thread responsiveness instrumentation for the browser benchmark (design
// §8.7 criterion 4). Two methods, always labelled in the result:
//  - `longtask-api`: a PerformanceObserver of type `longtask` installed before
//    the run; the maximum observed duration (0 when none) and the count over 50 ms.
//  - `heartbeat`: a MessageChannel tick scheduled every 10 ms; the delay beyond
//    the scheduled delivery is the PROXY for the longest main-thread task.
// Missing instrumentation, missing data or a hidden tab make the measurement
// invalid; nothing is ever converted to zero. Environments are injected so the
// tests drive fake clocks, entries and channels.

export const LONG_TASK_MS = 50;
export const HEARTBEAT_MS = 10;

/**
 * @typedef {object} ResponsivenessResult
 * @property {'longtask-api' | 'heartbeat' | 'not-applicable'} method
 * @property {number | null} maxMainTaskMs
 * @property {number | null} longTasksOver50
 * @property {boolean} valid
 * @property {string[]} notes
 */

/**
 * @typedef {object} Monitor
 * @property {'longtask-api' | 'heartbeat' | 'not-applicable'} method
 * @property {() => void} start Clears the per-run accumulators and begins observing.
 * @property {() => ResponsivenessResult} stop Flushes pending records and ends the run window.
 */

/**
 * @typedef {object} MonitorEnv
 * @property {() => number} now Monotonic milliseconds on the performance timeline.
 * @property {() => boolean} isVisible Whether the tab is in the foreground.
 * @property {(listener: () => void) => (() => void)} onVisibilityChange
 * @property {new (callback: (list: { getEntries(): any[] }) => void) => { observe(o: object): void, disconnect(): void, takeRecords(): any[] }} [PerformanceObserver]
 * @property {(fn: () => void, ms: number) => unknown} [setTimeout]
 * @property {(handle: unknown) => void} [clearTimeout]
 * @property {(onMessage: () => void) => { send(): void, close(): void }} [createChannel]
 */

/**
 * Visibility tracking shared by both methods: any hidden moment inside the run invalidates it.
 * @param {MonitorEnv} env
 */
function visibilityGuard(env) {
  let off = () => {};
  let hidden = false;
  return {
    begin() {
      hidden = !env.isVisible();
      off();
      off = env.onVisibilityChange(() => {
        if (!env.isVisible()) {
          hidden = true;
        }
      });
    },
    end() {
      if (!env.isVisible()) {
        hidden = true;
      }
      off();
      off = () => {};
      return hidden;
    },
  };
}

/**
 * @param {MonitorEnv} env
 * @returns {Monitor | null} null when the longtask entry type is unsupported.
 */
export function createLongTaskMonitor(env) {
  const Observer = env.PerformanceObserver;
  const supported = /** @type {any} */ (Observer)?.supportedEntryTypes;
  if (Observer === undefined || !Array.isArray(supported) || !supported.includes('longtask')) {
    return null;
  }
  const guard = visibilityGuard(env);
  /** @type {{ start: number, end: number }[]} */
  let entries = [];
  let runStart = 0;
  let running = false;
  /** @param {{ getEntries(): any[] }} list */
  const collect = (list) => {
    if (running) {
      for (const e of list.getEntries()) {
        entries.push({ start: e.startTime, end: e.startTime + e.duration });
      }
    }
  };
  const observer = new Observer(collect);
  observer.observe({ type: 'longtask' });
  return {
    method: 'longtask-api',
    start() {
      observer.takeRecords();
      entries = [];
      runStart = env.now();
      running = true;
      guard.begin();
    },
    stop() {
      collect({ getEntries: () => observer.takeRecords() });
      const runEnd = env.now();
      running = false;
      const hidden = guard.end();
      const inRun = entries.filter((e) => e.end > runStart && e.start < runEnd);
      const durations = inRun.map((e) => e.end - e.start);
      /** @type {string[]} */
      const notes = ['PerformanceObserver longtask: durations of tasks over 50 ms; 0 means none observed'];
      if (hidden) {
        notes.push('the tab was not in the foreground during the run');
      }
      return {
        method: 'longtask-api',
        maxMainTaskMs: durations.length === 0 ? 0 : Math.max(...durations),
        longTasksOver50: durations.filter((d) => d > LONG_TASK_MS).length,
        valid: !hidden,
        notes,
      };
    },
  };
}

/**
 * @param {MonitorEnv} env
 * @returns {Monitor | null} null when timers or MessageChannel are unavailable.
 */
export function createHeartbeatMonitor(env) {
  if (env.createChannel === undefined || env.setTimeout === undefined || env.clearTimeout === undefined) {
    return null;
  }
  const { createChannel, setTimeout: schedule, clearTimeout: cancelTimer } = env;
  const guard = visibilityGuard(env);
  let running = false;
  let due = 0;
  let maxDelay = 0;
  let over50 = 0;
  let ticks = 0;
  /** @type {unknown} */
  let timer = null;
  /** @type {{ send(): void, close(): void } | null} */
  let channel = null;

  const arm = () => {
    due = env.now() + HEARTBEAT_MS;
    timer = schedule(() => {
      timer = null;
      channel?.send();
    }, HEARTBEAT_MS);
  };
  const onMessage = () => {
    if (!running) {
      return;
    }
    const delay = Math.max(0, env.now() - due);
    ticks += 1;
    maxDelay = Math.max(maxDelay, delay);
    if (delay > LONG_TASK_MS) {
      over50 += 1;
    }
    arm();
  };
  return {
    method: 'heartbeat',
    start() {
      maxDelay = 0;
      over50 = 0;
      ticks = 0;
      running = true;
      channel = createChannel(onMessage);
      guard.begin();
      arm();
    },
    stop() {
      // A tick still undelivered at the end is overdue by at least this much.
      const pending = Math.max(0, env.now() - due);
      running = false;
      if (timer !== null) {
        cancelTimer(timer);
        timer = null;
      }
      channel?.close();
      channel = null;
      const hidden = guard.end();
      const worst = Math.max(maxDelay, pending);
      const over = over50 + (pending > LONG_TASK_MS ? 1 : 0);
      /** @type {string[]} */
      const notes = ['heartbeat proxy: delay of a 10 ms MessageChannel tick, not a measured JavaScript task duration'];
      if (hidden) {
        notes.push('the tab was not in the foreground during the run');
      }
      if (ticks === 0 && pending <= LONG_TASK_MS) {
        notes.push('no heartbeat tick was delivered during the run');
      }
      const missing = ticks === 0 && pending <= LONG_TASK_MS;
      return {
        method: 'heartbeat',
        maxMainTaskMs: missing ? null : worst,
        longTasksOver50: missing ? null : over,
        valid: !hidden && !missing,
        notes,
      };
    },
  };
}

/**
 * Prefers the longtask API, falls back to the heartbeat proxy; with neither the
 * result is invalid (never zero).
 * @param {MonitorEnv} env
 * @returns {Monitor}
 */
export function createResponsiveness(env) {
  const monitor = createLongTaskMonitor(env) ?? createHeartbeatMonitor(env);
  if (monitor !== null) {
    return monitor;
  }
  return {
    method: 'heartbeat',
    start() {},
    stop: () => ({
      method: 'heartbeat',
      maxMainTaskMs: null,
      longTasksOver50: null,
      valid: false,
      notes: ['no longtask support and no MessageChannel heartbeat: main-thread responsiveness was not measured'],
    }),
  };
}

/** Node has no browser main thread: the fields stay null and the method says so. @returns {Monitor} */
export function createNotApplicable() {
  return {
    method: 'not-applicable',
    start() {},
    stop: () => ({ method: 'not-applicable', maxMainTaskMs: null, longTasksOver50: null, valid: true, notes: [] }),
  };
}

/**
 * Environment of a real page.
 * @param {any} scope A window (`globalThis` of the bench page).
 * @returns {MonitorEnv}
 */
export function browserMonitorEnv(scope) {
  const doc = scope.document;
  return {
    now: () => scope.performance.now(),
    isVisible: () => doc.visibilityState === 'visible',
    onVisibilityChange: (listener) => {
      doc.addEventListener('visibilitychange', listener);
      return () => doc.removeEventListener('visibilitychange', listener);
    },
    PerformanceObserver: scope.PerformanceObserver,
    setTimeout: (fn, ms) => scope.setTimeout(fn, ms),
    clearTimeout: (handle) => scope.clearTimeout(handle),
    createChannel: typeof scope.MessageChannel === 'function'
      ? (onMessage) => {
        const { port1, port2 } = new scope.MessageChannel();
        port1.onmessage = () => onMessage();
        return { send: () => port2.postMessage(0), close: () => port1.close() };
      }
      : undefined,
  };
}

// @ts-check
// SA-Opus, break-tasks of improve-generating-stages-2-4: composes the variant manifests of T07a, T07b, T08a and T08b
// from readable source text and prints them as the JSON the task files give verbatim (two-space indent, like
// tools/ig-proto/variants/v4-p5.json). Read-only: it prints, writes nothing.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-live.mjs <live|live-add|live-test|frozen|tests>

const L = (/** @type {string[]} */ ...lines) => lines.map((l) => `${l}\n`).join('');

const live = {
  id: 'live',
  extends: ['v4-link'],
  description: 'Frozen family (stages 2 to 4 pack T07a, T07b; plan 4.5, N-V4-13): the live request deadline. With IG.liveDeadline listing the level and the host origin igOrigin, the set stage and the batch share one 115-s clock from the request start, the set stage is cut at origin + setStageCapMs (reserve-cut), and the host returns the accepted prefix by origin + responseBoundMs; inert with liveDeadline null.',
  edits: [
    {
      id: 'lv-1',
      file: 'core/browser/worker-pool.js',
      find: L('    beginRequest({ requestId, revision, onTimeout }) {'),
      replace: L('    beginRequest({ requestId, revision, onTimeout, igOrigin }) {'),
    },
    {
      id: 'lv-2',
      file: 'core/browser/worker-pool.js',
      find: L(
        '      const request = { requestId, revision, startedAt: clock.now(), timer: null, onTimeout, ended: false, timedOut: false };',
        '      request.timer = clock.setTimeout(() => expire(request), TIME.dispatchStopMs);',
      ),
      replace: L(
        '      // ig-proto, variant live (stages 2 to 4 pack T07a, plan 4.5): the 115-s clock may start at an earlier reading of',
        "      // the same clock (the host request's origin, shared by the set stage and the batch); never at a later one.",
        '      const igNow = clock.now();',
        "      const igStart = typeof igOrigin === 'number' && Number.isFinite(igOrigin) && igOrigin <= igNow ? igOrigin : igNow;",
        '      const request = { requestId, revision, startedAt: igStart, timer: null, onTimeout, ended: false, timedOut: false };',
        '      request.timer = clock.setTimeout(() => expire(request), Math.max(0, igStart + TIME.dispatchStopMs - igNow));',
      ),
    },
    {
      id: 'lv-3',
      file: 'core/browser/generation-client.js',
      find: L('  function begin(revision) {'),
      replace: L('  function begin(revision, igLive = null) {'),
    },
    {
      id: 'lv-4',
      file: 'core/browser/generation-client.js',
      find: L('      pool.beginRequest({', '        requestId,', '        revision: tag,'),
      replace: L('      pool.beginRequest({', '        requestId,', '        revision: tag,', '        ...(igLive === null ? {} : { igOrigin: igLive.origin }),'),
    },
    {
      id: 'lv-5',
      file: 'core/browser/generation-client.js',
      find: L('    const maxAttempts = options.maxSetAttempts ?? Infinity;', '    const job = begin(input.revision);'),
      replace: L(
        '    const maxAttempts = options.maxSetAttempts ?? Infinity;',
        "    // ig-proto, variant live (T07a): the request's origin and the set stage's cut at origin + setStageCapMs (plan 4.5).",
        '    const igLive = igLiveOf(input, request.levelId, clock);',
        '    const job = begin(input.revision, igLive);',
        '    const igCut = igLive === null ? null : clock.setTimeout(() => job.wake?.(), Math.max(0, igLive.setCutAt - clock.now()));',
      ),
    },
    {
      id: 'lv-6',
      file: 'core/browser/generation-client.js',
      find: L('        while (winner < 0 && inflight.size < size && next < maxAttempts) {'),
      replace: L(
        "        // ig-proto, variant live (T07a): after the bound and the ordered scan, the reserve's cut ends the set stage.",
        '        if (igLive !== null && clock.now() >= igLive.setCutAt) {',
        "          return { status: 'failed', reason: 'reserve-cut', failures: tally() };",
        '        }',
        '        while (winner < 0 && inflight.size < size && next < maxAttempts) {',
      ),
    },
    {
      id: 'lv-7',
      file: 'core/browser/generation-client.js',
      find: L('      for (const c of inflight.values()) {', '        c.abort();', '      }', '      finish(job);'),
      replace: L('      for (const c of inflight.values()) {', '        c.abort();', '      }', '      if (igCut !== null) {', '        clock.clearTimeout(igCut);', '      }', '      finish(job);'),
    },
    {
      id: 'lv-8',
      file: 'core/browser/generation-client.js',
      find: L('    const job = begin(input.revision);', '    const frozen = candidateContext(ctx, state);'),
      replace: L('    const job = begin(input.revision, igLiveOf(input, levelId, clock));', '    const frozen = candidateContext(ctx, state);'),
    },
    {
      id: 'lv-9',
      file: 'core/browser/generation-client.js',
      append: L(
        '',
        '// ig-proto, variant live (stages 2 to 4 pack T07a, plan 4.5, N-V4-13): the live request deadline. With',
        "// IG.liveDeadline listing the request's level and a host origin `igOrigin` (a reading of the client's clock, not",
        '// later than now), the set stage and the batch share that origin: the pool stops both at origin + 115 s, and the set',
        "// stage is cut at origin + setStageCapMs with the reason `reserve-cut`. Otherwise null: today's two separate timers.",
        "import { IG as IG_LIVE } from '../engine/ig-params.js';",
        '',
        '/**',
        ' * @param {any} input The SetInput or BatchInput.',
        ' * @param {string} levelId',
        ' * @param {{ now: () => number }} clock',
        ' * @param {any} [live] IG.liveDeadline by default.',
        ' * @returns {{ origin: number, setCutAt: number } | null}',
        ' */',
        'export function igLiveOf(input, levelId, clock, live = IG_LIVE.liveDeadline) {',
        '  const origin = input?.igOrigin;',
        '  if (live === undefined || live === null || !Array.isArray(live.levels) || !live.levels.includes(levelId)',
        "    || typeof live.setStageCapMs !== 'number' || !Number.isFinite(live.setStageCapMs)",
        "    || typeof origin !== 'number' || !Number.isFinite(origin) || origin > clock.now()) {",
        '    return null;',
        '  }',
        '  return { origin, setCutAt: origin + live.setStageCapMs };',
        '}',
      ),
    },
  ],
  files: [],
  params: { liveDeadline: null },
};

const liveAdd = {
  addTo: 'live',
  edits: [
    {
      id: 'lv-10',
      file: 'tools/bench/runner.js',
      find: L('  s.t0 = clock.now();', '  try {', '    const set = await client.generateSet({', '      boardRows: caseDef.boardRows,'),
      replace: L(
        '  s.t0 = clock.now();',
        '  const igBound = igBoundStart(s, caseDef, clock, client);',
        '  try {',
        '    const set = await igBound.set(client.generateSet({',
        '      igOrigin: s.t0,',
        '      boardRows: caseDef.boardRows,',
      ),
    },
    {
      id: 'lv-11',
      file: 'tools/bench/runner.js',
      find: L('      maxActive: caseDef.maxActive,', '    });', '    s.set = set;'),
      replace: L('      maxActive: caseDef.maxActive,', '    }));', '    s.set = set;'),
    },
    {
      id: 'lv-12',
      file: 'tools/bench/runner.js',
      find: L('    s.batch = await client.generateBatch({', '      set: set.set,'),
      replace: L('    s.batch = await igBound.batch(client.generateBatch({', '      igOrigin: s.t0,', '      set: set.set,'),
    },
    {
      id: 'lv-13',
      file: 'tools/bench/runner.js',
      find: L('      },', '    });', '  } catch (e) {', '    s.fault = e;', '  } finally {', '    s.tDone = clock.now();', '  }'),
      replace: L('      },', '    }));', '  } catch (e) {', '    s.fault = e;', '  } finally {', '    igBound.clear();', '    s.tDone = clock.now();', '  }'),
    },
    {
      id: 'lv-14',
      file: 'tools/bench/runner.js',
      append: L(
        '',
        "// ig-proto, variant live (stages 2 to 4 pack T07b, plan 4.5, N-V4-13): the host's hard response bound. With",
        "// IG.liveDeadline listing the case's level, one timer starts at the request origin, before the set call, and fires",
        '// at t0 + responseBoundMs - hostMarginMs: it cancels the client and ends the request at once. In the set phase the',
        '// response is the set reason `response-bound`; a set that settles later, even one still assembling its pack,',
        "// changes nothing. In the batch phase the response is the client's prefix snapshot (`client.igPrefix()`, T07b): the",
        '// accepted prefix with its provenance, seen histories and a pack assembled and validated at once, `partial`,',
        '// `response-bound`. After the bound the host never awaits the batch, its tasks or its own pack assembly. A result',
        '// that settles first is returned unchanged; the timer is cleared on every terminal path.',
        "import { IG as IG_HOST } from '../../core/engine/ig-params.js';",
        '',
        '/**',
        ' * @param {any} s The RunState of the row (its t0 is the request origin).',
        ' * @param {any} caseDef',
        ' * @param {any} clock',
        ' * @param {any} client',
        ' * @returns {{ set: (p: Promise<any>) => Promise<any>, batch: (p: Promise<any>) => Promise<any>, clear: () => void }}',
        ' */',
        'export function igBoundStart(s, caseDef, clock, client) {',
        '  const live = IG_HOST.liveDeadline;',
        '  if (live === undefined || live === null || !Array.isArray(live.levels) || !live.levels.includes(caseDef.levelId)) {',
        '    return { set: (p) => p, batch: (p) => p, clear() {} };',
        '  }',
        '  let fired = false;',
        '  /** @type {(() => void) | null} */',
        '  let onFire = null;',
        '  const cancel = () => {',
        '    try {',
        '      client.cancel();',
        '    } catch {',
        '      // the bound must not fail the row',
        '    }',
        '  };',
        '  const timer = clock.setTimeout(() => {',
        '    fired = true;',
        '    cancel();',
        '    onFire?.();',
        '  }, Math.max(0, s.t0 + live.responseBoundMs - live.hostMarginMs - clock.now()));',
        '  /**',
        "   * The phase's promise, or the response at the bound, whichever comes first; never both.",
        '   * @param {Promise<any>} promise',
        '   * @param {() => any} atBound',
        '   * @returns {Promise<any>}',
        '   */',
        '  const race = (promise, atBound) => new Promise((resolve, reject) => {',
        '    let done = false;',
        '    const cut = () => {',
        '      if (done) {',
        '        return;',
        '      }',
        '      done = true;',
        '      onFire = null;',
        '      try {',
        '        resolve(atBound());',
        '      } catch (error) {',
        '        reject(error);',
        '      }',
        '    };',
        '    if (fired) {',
        '      cancel();',
        '      cut();',
        '    } else {',
        '      onFire = cut;',
        '    }',
        '    promise.then((value) => {',
        '      if (!done) {',
        '        done = true;',
        '        onFire = null;',
        '        resolve(value);',
        '      }',
        '    }, (error) => {',
        '      if (!done) {',
        '        done = true;',
        '        onFire = null;',
        '        reject(error);',
        '      }',
        '    });',
        '  });',
        '  return {',
        "    set: (promise) => race(promise, () => ({ status: 'failed', reason: 'response-bound', failures: {} })),",
        '    batch: (promise) => race(promise, () => {',
        "      const prefix = typeof client.igPrefix === 'function' ? client.igPrefix() : null;",
        '      if (prefix === null || prefix === undefined) {',
        "        throw new Error('the hard bound found no batch prefix to return');",
        '      }',
        '      return prefix;',
        '    }),',
        '    clear() {',
        '      clock.clearTimeout(timer);',
        '      onFire = null;',
        '    },',
        '  };',
        '}',
      ),
    },
    {
      id: 'lv-15',
      file: 'core/browser/generation-client.js',
      find: L('    const pack = await assemblePack({', '      board,', '      rotation: request.rotation,'),
      replace: L(
        "    // ig-proto, variant live (T07b): the test seam of an assembly gate (the option igAssemblyGate); a product or",
        "    // bench client has none and runs today's path.",
        '    if (options.igAssemblyGate !== undefined) {',
        "      await options.igAssemblyGate('set');",
        '    }',
        '    const pack = await assemblePack({',
        '      board,',
        '      rotation: request.rotation,',
      ),
    },
    {
      id: 'lv-16',
      file: 'core/browser/generation-client.js',
      find: L('    const detail = () => ({ accepted: accepted.slice(), seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues] });'),
      replace: L(
        '    const detail = () => ({ accepted: accepted.slice(), seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues] });',
        '    // ig-proto, variant live (stages 2 to 4 pack T07b, plan 4.5): the accepted prefix of this batch as a response,',
        '    // assembled and validated at once, without waiting for the batch, its pool tasks or its own pack assembly; the',
        "    // host's hard bound returns it through igPrefix(). The prefix only shortens the answer: fold order is kept.",
        '    /** @type {any} */ (job).igPrefix = () => {',
        '      /** @type {any} */',
        '      const out = {',
        "        status: 'partial', reason: 'response-bound', accepted: accepted.slice(), made: structuredClone(made),",
        '        seenLayouts: [...state.seenLayouts], seenClues: [...state.seenClues],',
        '      };',
        '      if (accepted.length > 0) {',
        '        let checked;',
        '        try {',
        '          checked = igValidatePack(createPack({',
        '            board: set.board,',
        '            rotation: request.rotation,',
        '            pieces: set.pieces,',
        '            witness: set.witness,',
        '            puzzles: accepted.slice(),',
        '            generation: generationMeta({',
        '              setSeed: request.setSeed,',
        '              setLevel: input.setLevel,',
        '              setAttempt: input.setAttempt,',
        '              set,',
        '              uniqueness,',
        '              createdAt: createdAt(),',
        '              batch: { batchSeed, batchLevel: levelId, batchIndex: input.batchIndex },',
        '              setOrigin: request.setOrigin,',
        '              made,',
        '            }),',
        '          }));',
        '        } catch (e) {',
        "          throw new GenerationError('internal', e instanceof Error ? e.message.slice(0, 500) : 'The pack could not be built', detail());",
        '        }',
        '        if (!checked.ok) {',
        "          throw new GenerationError('internal', 'The generated pack failed validation', { ...detail(), issues: checked.issues });",
        '        }',
        '        out.pack = checked.value;',
        '      }',
        '      return out;',
        '    };',
      ),
    },
    {
      id: 'lv-17',
      file: 'core/browser/generation-client.js',
      find: L('    if (accepted.length > 0) {', '      result.pack = await assemblePack({'),
      replace: L(
        '    if (accepted.length > 0) {',
        '      // ig-proto, variant live (T07b): the test seam of an assembly gate; a product or bench client has none.',
        '      if (options.igAssemblyGate !== undefined) {',
        "        await options.igAssemblyGate('batch');",
        '      }',
        '      result.pack = await assemblePack({',
      ),
    },
    {
      id: 'lv-18',
      file: 'core/browser/generation-client.js',
      find: L('    replayPuzzle,', '    cancel,', '    recycle() {'),
      replace: L(
        '    replayPuzzle,',
        '    cancel,',
        "    // ig-proto, variant live (T07b): the latest batch's prefix snapshot, or null outside a batch (the hard bound).",
        '    igPrefix: () => /** @type {any} */ (latest)?.igPrefix?.() ?? null,',
        '    recycle() {',
      ),
    },
    {
      id: 'lv-19',
      file: 'core/browser/generation-client.js',
      append: L(
        '',
        '// ig-proto, variant live (stages 2 to 4 pack T07b): the synchronous pack validator of the prefix snapshot (the same',
        "// result as validatePackSliced, without the host pauses).",
        "import { validatePack as igValidatePack } from '../engine/pack.js';",
      ),
    },
  ],
};
const DEADLINE = { id: 'deadline-s3-v1', levels: ['nightmare', 'hell-1'], reserve: 0.6, setStageCapMs: 46000, generationStopMs: 115000, responseBoundMs: 120000, hostMarginMs: 1000 };
const TEST_DEADLINE = { ...DEADLINE, id: 'deadline-test' };

const liveTest = {
  id: 'live-test',
  extends: ['live', 'w8'],
  description: "Test only (stages 2 to 4 pack T07b, T07c): the live deadline on the fixture level 'hard' (tests/fixtures/generation-case.json) with the eight-worker pool limit of w8, for the scripted cases; never an arm, a plan step or a binding's current id.",
  edits: [],
  files: [],
  params: { liveDeadline: { ...TEST_DEADLINE, levels: ['hard'] } },
};

const frozen = [
  {
    id: 'fr-frozen',
    extends: ['fr-base', 'v4-ps', 'v4-p5', 'live', 'p5-mode', 'ps-levels'],
    description: 'Frozen arm (stages 2 to 4 pack T08a; plan v4 stage 3, N-V4-03; plan 4.1-4.5): the freeze with the screen by class (screen-s3-v1), the prior prior-s3-v1, the per-set prior on Hell 1, P5 by mode (budget-s3-v1) and the bound of 4, the live deadline (deadline-s3-v1), rescue re-rating, no (c4), no ranker, the reference kernel.',
    edits: [],
    files: [],
    paramFiles: { prior: 'data/prior-s3-v1.json' },
    params: {
      priorTable: 'prior-s3-v1',
      screenTable: 'screen-s3-v1',
      screenClasses: { 'hell-1': null, 'n-small': null, 'n-mid': 190000000, 'n-large': 190000000 },
      rerate: 'rescue',
      rerateMax: 4,
      c4: false,
      callBudget: { id: 'budget-s3-v1', any: { nightmare: 10000000000, 'hell-1': 40000000000 }, require: { nightmare: 32000000000, 'hell-1': 40000000000 } },
      setAttemptsBound: 4,
      liveDeadline: DEADLINE,
      perSetLevels: ['hell-1'],
    },
  },
  {
    id: 'fr-frozen-none',
    extends: ['fr-frozen'],
    description: 'Frozen arm (stages 2 to 4 pack T08a): fr-frozen with no screen in any class (screen-s3-none); everything else frozen.',
    edits: [],
    files: [],
    params: { screenTable: 'screen-s3-none', screenClasses: { 'hell-1': null, 'n-small': null, 'n-mid': null, 'n-large': null } },
  },
  {
    id: 'fr-frozen-uncapped',
    extends: ['fr-frozen'],
    description: 'Comparator (stages 2 to 4 pack T08a, RV3-04): fr-frozen without the call budget, the set-attempt bound and the live deadline (two separate timers as today).',
    edits: [],
    files: [],
    params: { callBudget: null, setAttemptsBound: null, liveDeadline: null },
  },
  {
    id: 'fr-frozen-none-uncapped',
    extends: ['fr-frozen-none'],
    description: 'Comparator (stages 2 to 4 pack T08a, RV3-04): fr-frozen-none without the call budget, the set-attempt bound and the live deadline (two separate timers as today).',
    edits: [],
    files: [],
    params: { callBudget: null, setAttemptsBound: null, liveDeadline: null },
  },
];

const TEST_LEVELS = ['hard', 'nightmare', 'hell-1'];
const tests = [
  {
    id: 'fr-frozen-live-test',
    extends: ['fr-frozen', 'w8'],
    description: "Test only (stages 2 to 4 pack T08c): fr-frozen with the live deadline also on the fixture level 'hard' and the eight-worker pool limit of w8, for the live scripted cases; never an arm, a plan step or a binding's current id.",
    edits: [],
    files: [],
    params: { liveDeadline: { ...TEST_DEADLINE, levels: TEST_LEVELS } },
  },
  {
    id: 'fr-frozen-none-live-test',
    extends: ['fr-frozen-none', 'w8'],
    description: "Test only (stages 2 to 4 pack T08c): fr-frozen-none with the live deadline also on the fixture level 'hard' and the eight-worker pool limit of w8, for the live scripted cases; never an arm, a plan step or a binding's current id.",
    edits: [],
    files: [],
    params: { liveDeadline: { ...TEST_DEADLINE, levels: TEST_LEVELS } },
  },
  {
    id: 'fr-frozen-nowindow-test',
    extends: ['fr-frozen'],
    description: "Test only (stages 2 to 4 pack T08c, plan 4.4): fr-frozen whose set-stage calibration rates every probe below its band (synthetic ratings), so that a real worker returns no-window-below; never an arm, a plan step or a binding's current id.",
    edits: [
      {
        id: 'nw-1',
        file: 'core/engine/generate.js',
        find: L('    record,', "    recordSource: 'calibration',", '    charge,', '  });'),
        replace: L('    record,', "    recordSource: 'calibration',", '    charge,', '    ...igNoWindowSeams(),', '  });'),
      },
      {
        id: 'nw-2',
        file: 'core/engine/generate.js',
        append: L(
          '',
          "// ig-proto, variant fr-frozen-nowindow-test (stages 2 to 4 pack T08c): test only. With IG.testNoWindow 'below', the",
          "// set stage's calibration call rates every probe at the synthetic score 30, below every gen-v4 band, so that a real",
          '// worker returns the reason no-window-below (plan 4.4); never an arm or a plan step.',
          "import { IG as IG_NW } from './ig-params.js';",
          '',
          '/** @returns {Record<string, unknown>} */',
          'function igNoWindowSeams() {',
          "  if (IG_NW.testNoWindow !== 'below') {",
          '    return {};',
          '  }',
          '  const rating = () => ({',
          "    model: 'difficulty-v3', score: 30, level: 'st', saturated: false,",
          "    metrics: { work: 1, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: 'exhausted', Gproved: 1, censusComplete: true },",
          '  });',
          '  return { igScreen: rating, igCanonical: rating };',
          '}',
        ),
      },
    ],
    files: [],
    params: { testNoWindow: 'below' },
  },
];

/**
 * The house style of tools/ig-proto/variants/*.json: top-level keys one per line; `extends`, `files` and `paramFiles`
 * inline; each edit's keys one per line; `params` inline when short, else one parameter per line, each inline.
 * @param {any} v
 * @returns {string}
 */
function inline(v) {
  if (Array.isArray(v)) {
    return `[${v.map(inline).join(', ')}]`;
  }
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v);
    return entries.length === 0 ? '{}' : `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }`;
  }
  return JSON.stringify(v);
}

/** @param {any} m @returns {string} */
function fmt(m) {
  const lines = ['{'];
  const keys = Object.keys(m);
  keys.forEach((k, i) => {
    const comma = i < keys.length - 1 ? ',' : '';
    const v = m[k];
    if (k === 'edits' && v.length > 0) {
      lines.push('  "edits": [');
      v.forEach((/** @type {any} */ e, j) => {
        lines.push('    {');
        const ek = Object.keys(e);
        ek.forEach((x, n) => lines.push(`      ${JSON.stringify(x)}: ${JSON.stringify(e[x])}${n < ek.length - 1 ? ',' : ''}`));
        lines.push(`    }${j < v.length - 1 ? ',' : ''}`);
      });
      lines.push(`  ]${comma}`);
    } else if (k === 'params' && inline(v).length > 100) {
      lines.push('  "params": {');
      const pk = Object.keys(v);
      pk.forEach((x, n) => lines.push(`    ${JSON.stringify(x)}: ${inline(v[x])}${n < pk.length - 1 ? ',' : ''}`));
      lines.push(`  }${comma}`);
    } else {
      lines.push(`  ${JSON.stringify(k)}: ${inline(v)}${comma}`);
    }
  });
  lines.push('}');
  return lines.join('\n');
}

export { live, liveAdd, liveTest, frozen, tests, fmt };

const which = process.argv[2];
if (which === 'outs') {
  const { writeFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  for (const m of [live, liveTest, ...frozen, ...tests, liveAdd]) {
    const text = fmt(m);
    if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(m)) {
      throw new Error(`the formatted ${m.id ?? m.addTo} does not parse back to itself`);
    }
    const name = m.id ?? `${m.addTo}-add`;
    writeFileSync(join(here, `bt-live-out-${name}.json`), `${text}\n`);
    process.stdout.write(`bt-live: wrote bt-live-out-${name}.json\n`);
  }
}
const out = which === 'live' ? live : which === 'live-add' ? liveAdd : which === 'live-test' ? liveTest
  : which === 'frozen' ? frozen : which === 'tests' ? tests : null;
if (process.argv[1] === undefined || !process.argv[1].endsWith('bt-live.mjs')) {
  // imported
} else if (out === null && which !== 'outs') {
  process.stderr.write('usage: bt-live.mjs live|live-add|live-test|frozen|tests|outs\n');
  process.exitCode = 1;
} else if (out !== null) {
  for (const m of Array.isArray(out) ? out : [out]) {
    const text = fmt(m);
    if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(m)) {
      throw new Error(`the formatted ${m.id ?? m.addTo} does not parse back to itself`);
    }
    process.stdout.write(`${text}\n\n`);
  }
}

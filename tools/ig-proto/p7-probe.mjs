// @ts-check
// P7's spike: the rating kernel may be made faster only if every result stays identical (stages 2 to 4 pack, T03a to T03c).
// T03a: the constants of the corpora, the item declarations of the two worker kinds `p7-equal` (a candidate tree against
// the reference tree `base`, on the complete `DeductionResult`) and `p7-time` (the same ratings timed in pairs) and their
// conversion to runtime items. The pure helpers are in lib/p7-core.mjs so that the lane worker does not load this
// command's graph. T03b adds the experiment declaration, its checks and the verdicts; T03c the bindings, the go rule and
// the commands.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { manifestHash, readItemLog, resumePlan } from './lib/items.mjs';
import { MEMORY_MANIFEST, memoryManifest, MEMORY_SETTINGS } from './lib/p7-core.mjs';
import { abs, artifactDir, FROZEN_COMMIT, rel } from './lib/paths.mjs';
import { harnessInfo, sha256File, sourceDigest } from './lib/records.mjs';
import { caseBoard } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';
import { profilesOf, screenValues } from './pm4.mjs';

export { MEMORY_MANIFEST, MEMORY_SETTINGS, memoryManifest, fixtureInput, workInputs, limitsFor, outcomeOf } from './lib/p7-core.mjs';

/**
 * @typedef {import('./lib/items.mjs').Item} Item
 */

export const P7_REFERENCE = 'base';
export const P7_CORPUS_VERSION = 'p7-corpus-v1';
export const P7_KERNEL_CASES = Object.freeze(['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '26x26-nightmare', '26x26-hell-1']);
export const P7_PM4_CELLS = Object.freeze(['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-hell-1', '26x26-master', '26x26-nightmare']);
export const P7_ROUNDS = 3;
export const P7_GO_RATIO = 1.04;
export const P7_INPUT_CONSTRUCTOR = 'instr';
export const P7_INPUT_RULE = 'kernel-window-v1';
export const P7_CATALOGUE = 'tools/ig-proto/data/boards-v1.json';
/** The required corpus: an independent statement, never read from a declaration (T10a's 30 kernel inputs, PM4's profiles, the memory items, the timing pairs). */
export const P7_COUNTS = Object.freeze({
  quick: Object.freeze({ kernel: 30, pm4: 112, memory: 7, time: 0 }),
  full: Object.freeze({ kernel: 30, pm4: 676, memory: 7, time: 0 }),
  time: Object.freeze({ kernel: 0, pm4: 0, memory: 0, time: 90 }),
});
/** Window subsets per kernel case (kernel-probe.mjs `SUBSETS_PER_CASE`). */
const SUBSETS = 6;
const SEED_PREFIX = 'ig-v4/kernel/';

/**
 * @param {string} tier `quick` or `full`.
 * @returns {string[]} The settings of the kernel items of the tier.
 */
export function settingsOf(tier) {
  if (tier === 'quick') {
    return ['canonical', 'tie1', 'undo', 'work-half', 'mem-ref', 'mem-fast'];
  }
  if (tier === 'full') {
    return ['canonical', 'tie1', 'undo', 'work-half', 'work-minus1', 'work-ref', 'census-half', 'mem-below', 'mem-ref', 'mem-fast'];
  }
  throw new Error(`p7-probe: unknown tier ${tier}`);
}

/**
 * @param {string} variant
 * @returns {Promise<{ variant: string, treeId: string, copyDigest: string, root: string }>} A tree by repository paths only.
 */
export async function treeRef(variant) {
  const info = await ensureTree(variant);
  return { variant, treeId: info.treeId, copyDigest: info.copyDigest, root: rel(info.root) };
}

/**
 * @param {string} candidate The candidate's variant.
 * @param {string} tier `quick` or `full`.
 * @returns {Promise<Item[]>} The equality items, in the order kernel, PM4, memory: 149 for `quick`, 713 for `full`.
 */
export async function equalDeclarations(candidate, tier) {
  const otherTree = (await treeRef(P7_REFERENCE)).root;
  const inputTree = (await treeRef(P7_INPUT_CONSTRUCTOR)).root;
  /** @type {Item[]} */
  const items = [];
  for (const caseId of P7_KERNEL_CASES) {
    const { boardRows, levelId } = caseBoard(caseId);
    for (let i = 0; i < SUBSETS; i += 1) {
      items.push({
        id: `equal:${candidate}:kernel:${caseId}:${i}`,
        kind: 'p7-equal',
        variant: candidate,
        payload: {
          source: 'kernel', boardRows, levelId, seedText: `${SEED_PREFIX}${caseId}`, subsetIndex: i, settings: settingsOf(tier), otherTree, inputTree,
        },
      });
    }
  }
  for (const cell of P7_PM4_CELLS) {
    const calls = JSON.parse(readFileSync(join(artifactDir('frozen', 'IGP-02', 'main', cell), 'calls.json'), 'utf8'));
    for (const set of calls.sets) {
      if (set.pieces === null) {
        continue;
      }
      for (const { order, record } of profilesOf(set)) {
        if (tier === 'quick' && order >= 4) {
          continue;
        }
        const settings = tier === 'quick' || order !== 0
          ? ['canonical']
          : ['canonical', ...[...screenValues(record, calls.limits.work).keys()].map((W) => `screen:${W}`)];
        items.push({
          id: `equal:${candidate}:pm4:${cell}:${set.i}:${order}`,
          kind: 'p7-equal',
          variant: candidate,
          payload: {
            source: 'pm4',
            boardRows: set.boardRows,
            pieces: set.pieces,
            clues: record.idx.map((/** @type {number} */ i) => set.witness[i]),
            levelId: calls.levelId,
            settings,
            otherTree,
          },
        });
      }
    }
  }
  for (const f of memoryManifest().fixtures) {
    items.push({
      id: `equal:${candidate}:memory:${f.id}`,
      kind: 'p7-equal',
      variant: candidate,
      payload: { source: 'memory', fixture: f.id, settings: [...MEMORY_SETTINGS], otherTree },
    });
  }
  items.push({ id: `equal:${candidate}:memory:sequence`, kind: 'p7-equal', variant: candidate, payload: { source: 'memory-sequence', otherTree } });
  items.push({ id: `equal:${candidate}:memory:capacity`, kind: 'p7-equal', variant: candidate, payload: { source: 'memory-capacity', otherTree } });
  return items;
}

/**
 * @param {string} candidate The candidate's variant.
 * @returns {Promise<Item[]>} The timing items: for each round, each kernel case and subset (90 items).
 */
export async function timeDeclarations(candidate) {
  const otherTree = (await treeRef(P7_REFERENCE)).root;
  const inputTree = (await treeRef(P7_INPUT_CONSTRUCTOR)).root;
  /** @type {Item[]} */
  const items = [];
  for (let round = 0; round < P7_ROUNDS; round += 1) {
    for (const caseId of P7_KERNEL_CASES) {
      const { boardRows, levelId } = caseBoard(caseId);
      for (let i = 0; i < SUBSETS; i += 1) {
        items.push({
          id: `time:${candidate}:${caseId}:${i}:${round}`,
          kind: 'p7-time',
          variant: candidate,
          payload: { boardRows, levelId, seedText: `${SEED_PREFIX}${caseId}`, subsetIndex: i, round, otherTree, inputTree },
        });
      }
    }
  }
  return items;
}

/**
 * The one conversion of declarations to runtime items (run, resume and report): the repository paths of the trees become
 * absolute roots.
 * @param {Item[]} declared
 * @returns {Item[]}
 */
export function runtimeItems(declared) {
  return declared.map((item) => {
    const { otherTree, inputTree, ...rest } = /** @type {Record<string, any>} */ (item.payload);
    return {
      ...item,
      payload: { ...rest, otherRoot: abs(otherTree), ...(inputTree === undefined ? {} : { inputRoot: abs(inputTree) }) },
    };
  });
}

/**
 * @param {Item[]} items
 * @returns {{ kernel: number, pm4: number, memory: number, time: number }} The corpus counts of declared items.
 */
export function corpusCounts(items) {
  const counts = { kernel: 0, pm4: 0, memory: 0, time: 0 };
  for (const item of items) {
    if (item.kind === 'p7-time') {
      counts.time += 1;
    } else if (item.kind === 'p7-equal') {
      const { source } = item.payload;
      if (source === 'kernel') {
        counts.kernel += 1;
      } else if (source === 'pm4') {
        counts.pm4 += 1;
      } else if (source === 'memory' || source === 'memory-sequence' || source === 'memory-capacity') {
        counts.memory += 1;
      }
    }
  }
  return counts;
}

/**
 * @param {string} command `equal` or `time`.
 * @returns {string[]} The repository paths of the inputs the corpus is built from, in a fixed order.
 */
export function corpusInputPaths(command) {
  if (command === 'time') {
    return [P7_CATALOGUE];
  }
  if (command !== 'equal') {
    throw new Error(`p7-probe: unknown command ${command}`);
  }
  return [
    ...P7_PM4_CELLS.map((cell) => rel(join(artifactDir('frozen', 'IGP-02', 'main', cell), 'calls.json'))),
    MEMORY_MANIFEST,
    P7_CATALOGUE,
  ];
}

/**
 * The required corpus, recomputed from its sources. Production only: a unit test never gives a corpus of its own to the commands.
 * @param {string} command `equal` or `time`.
 * @param {string} candidate
 * @param {string | null} tier `quick` or `full` for `equal`.
 * @returns {Promise<{ items: Item[], counts: Record<string, number>, inputs: { path: string, sha256: string }[], inputConstructor: Record<string, unknown> }>}
 */
export async function expectedCorpus(command, candidate, tier) {
  const equal = command === 'equal';
  const items = equal ? await equalDeclarations(candidate, /** @type {string} */ (tier)) : await timeDeclarations(candidate);
  return {
    items,
    counts: equal ? P7_COUNTS[/** @type {'quick' | 'full'} */ (tier)] : P7_COUNTS.time,
    inputs: corpusInputPaths(command).map((path) => ({ path, sha256: sha256File(abs(path)) })),
    inputConstructor: { ...(await treeRef(P7_INPUT_CONSTRUCTOR)), rule: P7_INPUT_RULE },
  };
}

/**
 * The experiment declaration a run writes before its first dispatch.
 * @param {{ task: string, step: string, command: string, candidate: string, tier: string | null }} o
 * @returns {Promise<Record<string, any>>}
 */
export async function declareRun({ task, step, command, candidate, tier }) {
  const corpus = await expectedCorpus(command, candidate, command === 'equal' ? tier : null);
  return {
    format: 'ig-p7-experiment',
    version: 1,
    task,
    step,
    command,
    candidate: await treeRef(candidate),
    reference: await treeRef(P7_REFERENCE),
    tier: command === 'equal' ? tier : null,
    rounds: command === 'time' ? P7_ROUNDS : null,
    inputConstructor: corpus.inputConstructor,
    corpus: { version: P7_CORPUS_VERSION, inputs: corpus.inputs },
    producer: { frozenCommit: FROZEN_COMMIT, sourceDigest: await sourceDigest(), harnessHash: harnessInfo().harnessHash },
    items: corpus.items,
  };
}

/**
 * The resume rule of a run's declaration (pure): the written declaration must equal the fresh one.
 * @param {any} existing
 * @param {any} fresh
 * @returns {{ ok: true } | { refuse: string }}
 */
export function checkDeclaration(existing, fresh) {
  if (isDeepStrictEqual(existing, fresh)) {
    return { ok: true };
  }
  const key = ['format', 'version', 'task', 'step', 'command', 'candidate', 'reference', 'tier', 'rounds', 'inputConstructor', 'corpus', 'producer', 'items']
    .find((k) => !isDeepStrictEqual(existing?.[k], fresh?.[k])) ?? 'declaration';
  return { refuse: `the declaration of ${fresh?.task}/${fresh?.step} changed (${key}): a ruling is required` };
}

/**
 * @param {string} task
 * @param {string} step
 * @returns {{ declaration: any, lines: any[], state: any, inputs: { path: string, sha256: string }[], problems: string[] }}
 *   A run's files, read: the declaration, the item log's lines, the state, the index of the files that exist and the read problems.
 */
export function readRun(task, step) {
  const dir = artifactDir('frozen', task, step);
  /** @type {string[]} */
  const problems = [];
  /** @type {{ path: string, sha256: string }[]} */
  const inputs = [];
  /** @param {string} name @param {string} missing @returns {any} */
  const readJson = (name, missing) => {
    const file = join(dir, name);
    if (!existsSync(file)) {
      problems.push(missing);
      return null;
    }
    inputs.push({ path: rel(file), sha256: sha256File(file) });
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      problems.push(`unreadable ${name}`);
      return null;
    }
  };
  const declaration = readJson('experiment.json', 'no declaration');
  /** @type {any[]} */
  let lines = [];
  const logFile = join(dir, 'items.jsonl');
  if (existsSync(logFile)) {
    inputs.push({ path: rel(logFile), sha256: sha256File(logFile) });
    try {
      lines = readItemLog(logFile);
    } catch (e) {
      problems.push(e instanceof Error ? e.message : String(e));
    }
  }
  const state = readJson('state.json', 'no state');
  return { declaration, lines, state, inputs, problems };
}

/**
 * The checks every verdict shares (pure), in a fixed order.
 * @param {{ declaration: any, lines: any[], state: any, expected: { task: string, step: string, command: string, candidate: string, tier: string | null },
 *   corpus: { items: Item[], counts: Record<string, number>, inputs: { path: string, sha256: string }[], inputConstructor: Record<string, unknown> } }} o
 * @returns {string[]} The problems; none when the run is what its declaration and the required corpus say.
 */
export function runProblems({ declaration, lines, state, expected, corpus }) {
  if (declaration === null || declaration === undefined) {
    return ['no declaration'];
  }
  /** @type {string[]} */
  const problems = [];
  const tier = expected.tier ?? null;
  if (declaration.format !== 'ig-p7-experiment' || declaration.version !== 1 || declaration.command !== expected.command
    || declaration.task !== expected.task || declaration.step !== expected.step || declaration.candidate?.variant !== expected.candidate
    || (declaration.tier ?? null) !== tier) {
    problems.push(`the declaration is not ${expected.task}/${expected.step} of ${expected.candidate}${tier === null ? '' : ` ${tier}`}`);
  }
  const counts = corpusCounts(corpus.items);
  if (!isDeepStrictEqual(counts, corpus.counts)) {
    problems.push(`the required corpus counts ${JSON.stringify(counts)} differ from ${JSON.stringify(corpus.counts)}`);
  }
  if (!isDeepStrictEqual(declaration.items, corpus.items)) {
    problems.push('the declared items differ from the required corpus');
  }
  if (!isDeepStrictEqual(declaration.inputConstructor, corpus.inputConstructor)) {
    problems.push('the declared input constructor differs from the required one');
  }
  if (declaration.corpus?.version !== P7_CORPUS_VERSION) {
    problems.push(`the declaration uses corpus ${declaration.corpus?.version}`);
  }
  /** @type {{ path: string, sha256: string }[]} */
  const declared = Array.isArray(declaration.corpus?.inputs) ? declaration.corpus.inputs : [];
  if (declared.length === 0) {
    problems.push('the corpus input index is empty');
  }
  for (const input of corpus.inputs) {
    const entry = declared.find((d) => d.path === input.path);
    if (entry === undefined) {
      problems.push(`the corpus input ${input.path} is missing from the declaration`);
    } else if (entry.sha256 !== input.sha256) {
      problems.push(`the corpus input ${input.path} changed`);
    }
  }
  for (const entry of declared) {
    if (!corpus.inputs.some((input) => input.path === entry.path)) {
      problems.push(`unexpected corpus input ${entry.path}`);
    }
  }
  if (state === null || state === undefined) {
    problems.push('no state');
    return problems;
  }
  const id = state.identity ?? {};
  const runtime = runtimeItems(Array.isArray(declaration.items) ? declaration.items : []);
  if (id.manifestHash !== manifestHash(runtime)) {
    problems.push("the run's manifest differs from its declaration");
  }
  if (id.treeIds?.[declaration.candidate?.variant] !== declaration.candidate?.treeId) {
    problems.push("the run's tree differs from its declaration");
  }
  for (const field of ['frozenCommit', 'sourceDigest', 'harnessHash']) {
    if (id[field] !== declaration.producer?.[field]) {
      problems.push(`the run's producer differs from its declaration (${field})`);
    }
  }
  const plan = resumePlan(runtime, lines, id, id);
  if ('refuse' in plan) {
    problems.push(`the item log is invalid: ${plan.refuse}`);
  }
  return problems;
}

/**
 * The item-end lines of a log by item id, and how each declared item ended.
 * @param {string[]} ids The declared item ids.
 * @param {any[]} lines
 */
function endsOf(ids, lines) {
  /** @type {Map<string, any[]>} */
  const byId = new Map();
  for (const line of lines) {
    if (line?.type === 'item-end') {
      byId.set(line.item, [...(byId.get(line.item) ?? []), line]);
    }
  }
  const declared = new Set(ids);
  const unexpected = [...byId.keys()].filter((id) => !declared.has(id));
  const duplicates = [...byId].filter(([, ends]) => ends.length > 1).map(([id]) => id);
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const censored = [];
  /** @type {string[]} */
  const errors = [];
  /** @type {Map<string, any>} Completed `ok` results by id. */
  const ok = new Map();
  let ended = 0;
  for (const id of ids) {
    const ends = byId.get(id) ?? [];
    if (ends.length === 0) {
      missing.push(id);
      continue;
    }
    if (ends.length === 1) {
      ended += 1;
    }
    const [end] = ends;
    if (end.status === 'censored') {
      censored.push(id);
    } else if (end.status !== 'completed' || end.result === null || typeof end.result !== 'object' || end.result.outcome !== 'ok') {
      errors.push(id);
    } else {
      ok.set(id, end.result);
    }
  }
  return { unexpected, duplicates, missing, censored, errors, ok, ended };
}

/** @param {any} d A declaration or null. @returns {Record<string, unknown> | null} */
const declaredOf = (d) => (d === null || d === undefined ? null : {
  candidate: d.candidate, reference: d.reference, tier: d.tier, corpusVersion: d.corpus?.version ?? null, producer: d.producer, inputConstructor: d.inputConstructor,
});

/** @param {unknown} a @param {unknown} b @param {unknown} c @returns {boolean} `a + b <= c`, all finite numbers. */
const fits = (a, b, c) => [a, b, c].every((v) => typeof v === 'number' && Number.isFinite(v)) && /** @type {number} */ (a) + /** @type {number} */ (b) <= /** @type {number} */ (c);

/**
 * The equality verdict (pure): the declared items, as the log ended them, with the coverage of the memory fixtures.
 * @param {{ declaration: any, lines: any[], state: any, expected: { task: string, candidate: string, tier: string },
 *   manifest: ReturnType<typeof memoryManifest>, corpus: Parameters<typeof runProblems>[0]['corpus'] }} o
 * @returns {Record<string, any>}
 */
export function equalVerdict({ declaration, lines, state, expected, manifest, corpus }) {
  const problems = runProblems({ declaration, lines, state, expected: { task: expected.task, step: 'equal', command: 'equal', candidate: expected.candidate, tier: expected.tier }, corpus });
  /** @type {Item[]} */
  const items = Array.isArray(declaration?.items) ? declaration.items : [];
  const sourceOf = (/** @type {Item} */ item) => item.payload.source;
  const isMemory = (/** @type {Item} */ item) => ['memory', 'memory-sequence', 'memory-capacity'].includes(/** @type {string} */ (sourceOf(item)));
  if (declaration !== null && declaration !== undefined) {
    const all = manifest.fixtures.every((f) => items.some((i) => sourceOf(i) === 'memory' && i.payload.fixture === f.id))
      && ['memory-sequence', 'memory-capacity'].every((s) => items.some((i) => sourceOf(i) === s));
    if (!all) {
      problems.push('the memory fixtures are not all declared');
    }
  }
  const ids = items.map((i) => i.id);
  const { unexpected, duplicates, missing, censored, errors, ok, ended } = endsOf(ids, lines);
  /** @type {string[]} */
  const notEqual = [];
  let equal = 0;
  /** @type {{ id: string, differing: unknown }[]} */
  const diagnostics = [];
  let lists = 0;
  let reference = 0;
  let listsOutsideMemory = false;
  /** @type {Record<string, any>[]} */
  const memory = [];
  /** @type {Record<string, any>[]} */
  const budget = [];
  /** @param {unknown} representation @param {string} wanted @returns {boolean} A null representation is the `model-too-large` outcome. */
  const matches = (representation, wanted) => (wanted === 'model-too-large' ? (representation ?? null) === null : representation === wanted);
  const fixtureOf = (/** @type {unknown} */ id) => manifest.fixtures.find((f) => f.id === id);
  for (const item of items) {
    const result = ok.get(item.id);
    if (result === undefined) {
      continue;
    }
    if (result.same === true) {
      equal += 1;
    } else {
      notEqual.push(item.id);
      diagnostics.push({ id: item.id, differing: result.differing ?? [] });
    }
    /** @type {any[]} */
    const steps = Array.isArray(result.steps) ? result.steps : [];
    const source = sourceOf(item);
    /** The fixture a step of a sequence or capacity item runs, by the manifest; the item's own fixture for a `memory` item. */
    const stepFixture = (/** @type {any} */ step) => {
      const at = /^(seq|cap)-(\d+)$/.exec(step.setting);
      const entry = at === null ? undefined : (at[1] === 'seq' ? manifest.sequence : manifest.capacity)[Number(at[2])];
      return entry === undefined ? fixtureOf(item.payload.fixture) : fixtureOf(entry.fixture);
    };
    for (const step of steps) {
      if (step.representation === 'reference') {
        reference += 1;
      }
      if (step.representation !== 'lists') {
        continue;
      }
      lists += 1;
      if (!isMemory(item)) {
        listsOutsideMemory = true;
      }
      const refBytes = source === 'memory-sequence' || source === 'memory-capacity' ? stepFixture(step)?.refBytes : result.refBytes;
      if (!fits(refBytes, step.listBytes, step.memoryBytes) || !fits(step.wsBytes, step.listBytes, step.capacityBytes)) {
        budget.push({ id: item.id, setting: step.setting, refBytes: refBytes ?? null, listBytes: step.listBytes ?? null, wsBytes: step.wsBytes ?? null, memoryBytes: step.memoryBytes ?? null, capacityBytes: step.capacityBytes ?? null });
      }
    }
    /** @param {any} step @param {any} fixture @param {string} wanted */
    const entryOf = (step, fixture, wanted) => ({
      fixture: fixture?.id ?? null,
      refBytes: source === 'memory' ? (result.refBytes ?? null) : (fixture?.refBytes ?? null),
      listBytes: step?.listBytes ?? null,
      representation: step?.representation ?? null,
      expected: wanted,
      ok: step !== undefined && matches(step.representation, wanted),
    });
    if (source === 'memory') {
      const fixture = fixtureOf(item.payload.fixture);
      memory.push(entryOf(steps.find((s) => s.setting === 'fixture'), fixture ?? { id: item.payload.fixture }, fixture?.canonical ?? 'unknown'));
    } else if (source === 'memory-sequence' || source === 'memory-capacity') {
      const [list, prefix] = source === 'memory-sequence' ? [manifest.sequence, 'seq'] : [manifest.capacity, 'cap'];
      for (const [i, entry] of list.entries()) {
        memory.push(entryOf(steps.find((s) => s.setting === `${prefix}-${i}`), fixtureOf(entry.fixture) ?? { id: entry.fixture }, entry.expect));
      }
    }
  }
  const memoryIds = items.filter(isMemory).map((i) => i.id);
  const complete = memory.every((m) => m.ok) && budget.length === 0 && memoryIds.every((id) => !missing.includes(id)) && listsOutsideMemory;
  const verdict = problems.length > 0 ? 'incomplete'
    : notEqual.length > 0 ? 'not-equal'
      : [missing, errors, censored, duplicates, unexpected].some((list) => list.length > 0) || !complete ? 'incomplete' : 'equal';
  return {
    items: items.length, ended, equal, notEqual, errors, censored, missing, duplicates, unexpected, problems, diagnostics,
    coverage: { lists, reference, memory, budget, complete }, declared: declaredOf(declaration), verdict,
  };
}

/**
 * The timing verdict (pure): measured only for the complete declared items, each a valid completed outcome that is equal.
 * @param {{ declaration: any, lines: any[], state: any, expected: { task: string, candidate: string },
 *   corpus: Parameters<typeof runProblems>[0]['corpus'] }} o
 * @returns {Record<string, any>}
 */
export function timeVerdict({ declaration, lines, state, expected, corpus }) {
  const problems = runProblems({ declaration, lines, state, expected: { task: expected.task, step: `time-${expected.candidate}`, command: 'time', candidate: expected.candidate, tier: null }, corpus });
  /** @type {Item[]} */
  const items = Array.isArray(declaration?.items) ? declaration.items : [];
  const ids = items.map((i) => i.id);
  if (declaration !== null && declaration !== undefined && (ids.length !== 90 || new Set(ids).size !== 90)) {
    problems.push('the declaration does not hold 90 items');
  }
  const { missing, censored, errors, ok, ended } = endsOf(ids, lines);
  /** @type {string[]} */
  const invalid = [];
  /** @type {string[]} */
  const notSame = [];
  /** @type {string[]} */
  const capped = [];
  const positive = (/** @type {unknown} */ v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  for (const [id, result] of ok) {
    if (!positive(result.refMs) || !positive(result.candMs)) {
      invalid.push(id);
    }
    if (result.same !== true) {
      notSame.push(id);
    }
    if (result.capped === 'both') {
      capped.push(id);
    }
  }
  const order = (/** @type {string[]} */ list) => ids.filter((id) => list.includes(id));
  const verdict = problems.length > 0 ? 'incomplete'
    : notSame.length > 0 || invalid.length > 0 ? 'failed'
      : missing.length > 0 || censored.length > 0 || errors.length > 0 ? 'incomplete' : 'measured';
  let refMs = null;
  let candMs = null;
  let ratio = null;
  let geoRatio = null;
  if (verdict === 'measured') {
    const results = ids.map((id) => ok.get(id));
    refMs = results.reduce((sum, r) => sum + r.refMs, 0);
    candMs = results.reduce((sum, r) => sum + r.candMs, 0);
    ratio = refMs / candMs;
    geoRatio = Math.exp(results.reduce((sum, r) => sum + Math.log(r.refMs / r.candMs), 0) / results.length);
  }
  return {
    items: items.length, ended, missing, censored, errors, invalid: order(invalid), notSame: order(notSame), capped: order(capped), problems,
    declared: declaredOf(declaration) === null ? null : { ...declaredOf(declaration), rounds: declaration.rounds }, verdict, refMs, candMs, ratio, geoRatio,
  };
}

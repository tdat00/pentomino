// @ts-check
// P7's spike: the rating kernel may be made faster only if every result stays identical (stages 2 to 4 pack, T03a to T03c).
// T03a: the constants of the corpora, the item declarations of the two worker kinds `p7-equal` (a candidate tree against
// the reference tree `base`, on the complete `DeductionResult`) and `p7-time` (the same ratings timed in pairs) and their
// conversion to runtime items. The pure helpers are in lib/p7-core.mjs so that the lane worker does not load this
// command's graph. T03b adds the experiment declaration, its checks and the verdicts; T03c the bindings, the go rule and
// the commands.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { manifestHash, readItemLog, resumePlan, runItems } from './lib/items.mjs';
import { MEMORY_MANIFEST, memoryManifest, MEMORY_SETTINGS } from './lib/p7-core.mjs';
import { abs, artifactDir, FROZEN_COMMIT, parseArgs, rel } from './lib/paths.mjs';
import { harnessInfo, sha256File, sourceDigest, writeJson, writeText } from './lib/records.mjs';
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

/**
 * The inputs every binding requires of an equality report, by path and once each (SA-Astra's review R3-01).
 * @param {string} candidate The candidate's variant.
 * @param {string} tier `quick` or `full`.
 * @returns {string[]} The run's `experiment.json`, `state.json` and `items.jsonl`, then the nine corpus inputs.
 */
export function equalityEvidencePaths(candidate, tier) {
  const dir = rel(artifactDir('frozen', `V4-P7E-${candidate}-${tier}`, 'equal'));
  return [`${dir}/experiment.json`, `${dir}/state.json`, `${dir}/items.jsonl`, ...corpusInputPaths('equal')];
}

/**
 * Whether an equality report may justify timing a candidate (pure): its verdict, trees, corpus and coverage, then every
 * required input exactly once and every listed input unchanged.
 * @param {any} report The report read from `p7.json`, or null.
 * @param {{ tier: string, candidate: unknown, reference: unknown, fileHash: (path: string) => string | null, requiredInputs: string[] }} o
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function equalityBinding(report, { tier, candidate, reference, fileHash, requiredInputs }) {
  /** @param {string} reason @returns {{ ok: false, reason: string }} */
  const no = (reason) => ({ ok: false, reason });
  if (report === null || report === undefined) {
    return no(`no ${tier} equality report`);
  }
  const equal = report.equal;
  if (equal?.verdict !== 'equal') {
    return no(`${tier} equality is ${equal?.verdict ?? 'missing'}`);
  }
  if (equal.declared?.tier !== tier) {
    return no(`the ${tier} report is of tier ${equal.declared?.tier}`);
  }
  if (!isDeepStrictEqual(equal.declared.candidate, candidate)) {
    return no(`the ${tier} report was made on another candidate tree`);
  }
  if (!isDeepStrictEqual(equal.declared.reference, reference)) {
    return no(`the ${tier} report was made on another reference tree`);
  }
  if (equal.declared.corpusVersion !== P7_CORPUS_VERSION) {
    return no(`the ${tier} report used corpus ${equal.declared.corpusVersion}`);
  }
  if (equal.coverage?.complete !== true) {
    return no(`the ${tier} report's memory coverage is incomplete`);
  }
  /** @type {{ path: string, sha256: string }[]} */
  const inputs = report.meta?.inputs;
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return no(`the ${tier} report binds no input`);
  }
  for (const path of requiredInputs) {
    const count = inputs.filter((input) => input?.path === path).length;
    if (count === 0) {
      return no(`the ${tier} report does not bind ${path}`);
    }
    if (count > 1) {
      return no(`the ${tier} report binds ${path} more than once`);
    }
  }
  for (const input of inputs) {
    const hash = fileHash(input.path);
    if (hash === null) {
      return no(`the ${tier} report's input ${input.path} is missing`);
    }
    if (hash !== input.sha256) {
      return no(`the ${tier} report's input ${input.path} changed`);
    }
  }
  return { ok: true };
}

/**
 * The go rule of D-P24-05 (pure).
 * @param {{ quick: { ok: true } | { ok: false, reason: string }, full: { ok: true } | { ok: false, reason: string }, timing: Record<string, any> }} o
 * @returns {{ go: boolean, reasons: string[] }}
 */
export function goDecision({ quick, full, timing }) {
  /** @type {string[]} */
  const reasons = [];
  for (const [name, binding] of /** @type {const} */ ([['quick', quick], ['full', full]])) {
    if (!binding.ok) {
      reasons.push(`${name}: ${binding.reason}`);
    }
  }
  const measured = timing.verdict === 'measured';
  if (!measured) {
    reasons.push(`timing ${timing.verdict}`);
  }
  if (timing.notSame.length > 0) {
    reasons.push(`differing ${timing.notSame.length}`);
  }
  const fast = timing.ratio >= P7_GO_RATIO;
  if (measured && !fast) {
    reasons.push(`ratio ${timing.ratio} below ${P7_GO_RATIO}`);
  }
  return { go: quick.ok && full.ok && measured && timing.notSame.length === 0 && fast, reasons };
}

const EVIDENCE = 'docs/improve-generating/evidence/frozen';
const HISTORICAL_TASKS = Object.freeze(['IGP-02', 'V4-T04', 'V4-T04v4', 'V4-T04f', 'V4-T04i', 'V4-S2', 'V4-S2P', 'V4-S2K', 'V4-S2W']);
const TIERS = Object.freeze(['quick', 'full']);
const DEFAULT_HORIZON_S = 285;
const VARIANT_ID = /^[a-z0-9][a-z0-9-]*$/;

/** @param {string} reason @returns {1} */
function refuse(reason) {
  process.stderr.write(`p7-probe: ${reason}\n`);
  return 1;
}

/** @param {string} path A repository path. @returns {string | null} The file's hash, or null when it does not exist. */
const fileHash = (path) => (existsSync(abs(path)) ? sha256File(abs(path)) : null);

/** @param {string} candidate @param {string} tier @returns {string} The repository path of an equality report. */
const equalityReportPath = (candidate, tier) => `${EVIDENCE}/V4-P7E-${candidate}-${tier}/p7.json`;

/**
 * @param {string} path A repository path.
 * @returns {{ report: any } | { missing: true } | { unreadable: true }} The report, read.
 */
function readReport(path) {
  if (!existsSync(abs(path))) {
    return { missing: true };
  }
  try {
    return { report: JSON.parse(readFileSync(abs(path), 'utf8')) };
  } catch {
    return { unreadable: true };
  }
}

/**
 * The equality reports of a candidate, read and bound before any tree is looked up (SA-Astra's review R2-05).
 * @param {string} candidate The candidate's variant.
 * @returns {Promise<string | null>} The reason for a refusal, or null when both reports bind.
 */
async function boundReports(candidate) {
  /** @type {Record<string, any>} */
  const reports = {};
  for (const tier of TIERS) {
    const read = readReport(equalityReportPath(candidate, tier));
    if ('missing' in read) {
      return `${candidate} cannot be timed: no ${tier} equality report`;
    }
    if ('unreadable' in read) {
      return `${candidate} cannot be timed: the ${tier} equality report is unreadable`;
    }
    reports[tier] = read.report;
  }
  const tree = await treeRef(candidate);
  const reference = await treeRef(P7_REFERENCE);
  for (const tier of TIERS) {
    const binding = equalityBinding(reports[tier], { tier, candidate: tree, reference, fileHash, requiredInputs: equalityEvidencePaths(candidate, tier) });
    if (!binding.ok) {
      return `${candidate} cannot be timed: ${binding.reason}`;
    }
  }
  return null;
}

/**
 * Declares (or checks the declaration of) a run, then runs its pending items.
 * @param {{ command: 'equal' | 'time', task: string, step: string, candidate: string, tier: string | null, horizonS: number }} o
 * @returns {Promise<number>}
 */
async function dispatch({ command, task, step, candidate, tier, horizonS }) {
  const fresh = await declareRun({ task, step, command, candidate, tier });
  const file = join(artifactDir('frozen', task, step), 'experiment.json');
  if (existsSync(file)) {
    /** @type {any} */
    let existing;
    try {
      existing = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      return refuse(`${rel(file)} is unreadable: a ruling is required`);
    }
    const checked = checkDeclaration(existing, fresh);
    if ('refuse' in checked) {
      return refuse(checked.refuse);
    }
  } else {
    writeJson(file, fresh);
  }
  const out = await runItems({ task, step, label: 'frozen', horizonS, items: runtimeItems(fresh.items) });
  const ended = readRun(task, step).state?.items?.done ?? 0;
  process.stdout.write(`p7-probe: ${command} ${candidate} ${tier ?? ''}`.trimEnd() + `: ${ended} of ${fresh.items.length} items ended, done ${out.done}\n`);
  return out.exitCode;
}

/**
 * @param {string[]} argv
 * @param {string[]} [values] The command's own options.
 * @returns {{ args: Record<string, string> } | { refusal: number }} The parsed arguments, or the refusal of the common checks.
 */
function commonArgs(argv, values = []) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label', ...values] });
  if (args.label !== 'frozen') {
    return { refusal: refuse('--label frozen only') };
  }
  if (args.task !== undefined && HISTORICAL_TASKS.includes(args.task)) {
    return { refusal: refuse(`${args.task} is a historical namespace`) };
  }
  return { args };
}

/** @param {Record<string, string>} args @returns {number} The horizon in seconds, or NaN. */
const horizonOf = (args) => {
  const horizonS = Number(args['horizon-s'] ?? DEFAULT_HORIZON_S);
  return Number.isFinite(horizonS) && horizonS > 0 ? horizonS : NaN;
};

/** @param {string[]} argv `--candidate <variant> --tier <quick | full> --task <T> --label frozen --source-label <SL> [--horizon-s <H>]` @returns {Promise<number>} */
async function equalCommand(argv) {
  const common = commonArgs(argv, ['candidate', 'tier', 'horizon-s']);
  if ('refusal' in common) {
    return common.refusal;
  }
  const { args } = common;
  const { candidate, tier, task } = args;
  if (candidate === undefined || !VARIANT_ID.test(candidate)) {
    return refuse('equal needs --candidate <variant>');
  }
  if (tier === undefined || !TIERS.includes(tier)) {
    return refuse('equal needs --tier quick or full');
  }
  if (task !== `V4-P7E-${candidate}-${tier}`) {
    return refuse(`the task of an equality run is V4-P7E-${candidate}-${tier}`);
  }
  const horizonS = horizonOf(args);
  if (Number.isNaN(horizonS)) {
    return refuse('--horizon-s must be a positive number');
  }
  return dispatch({ command: 'equal', task, step: 'equal', candidate, tier, horizonS });
}

/**
 * @param {string} name `bind` or `time`.
 * @param {string[]} argv
 * @returns {{ args: Record<string, string>, candidate: string } | { refusal: number }}
 */
function timingArgs(name, argv) {
  const common = commonArgs(argv, ['candidate', 'horizon-s']);
  if ('refusal' in common) {
    return common;
  }
  const { args } = common;
  if (args.candidate === undefined || !VARIANT_ID.test(args.candidate)) {
    return { refusal: refuse(`${name} needs --candidate <variant>`) };
  }
  if (args.task !== 'V4-P7') {
    return { refusal: refuse(`the task of ${name} is V4-P7`) };
  }
  return { args, candidate: args.candidate };
}

/** @param {string[]} argv `--candidate <variant> --task V4-P7 --label frozen --source-label <SL>` @returns {Promise<number>} */
async function bindCommand(argv) {
  const parsed = timingArgs('bind', argv);
  if ('refusal' in parsed) {
    return parsed.refusal;
  }
  const reason = await boundReports(parsed.candidate);
  if (reason !== null) {
    return refuse(reason);
  }
  process.stdout.write(`p7-probe: ${parsed.candidate} bound to its quick and full equality reports\n`);
  return 0;
}

/** @param {string[]} argv `--candidate <variant> --task V4-P7 --label frozen --source-label <SL> --horizon-s <H>` @returns {Promise<number>} */
async function timeCommand(argv) {
  const parsed = timingArgs('time', argv);
  if ('refusal' in parsed) {
    return parsed.refusal;
  }
  const horizonS = horizonOf(parsed.args);
  if (Number.isNaN(horizonS)) {
    return refuse('--horizon-s must be a positive number');
  }
  const reason = await boundReports(parsed.candidate);
  if (reason !== null) {
    return refuse(reason);
  }
  return dispatch({ command: 'time', task: 'V4-P7', step: `time-${parsed.candidate}`, candidate: parsed.candidate, tier: null, horizonS });
}

/**
 * @param {string[]} problems The verdict's problems, which gain the read problems of the run.
 * @param {string[]} readProblems
 * @returns {boolean} Whether a problem was added.
 */
function addProblems(problems, readProblems) {
  const added = readProblems.filter((p) => !problems.includes(p));
  problems.push(...added);
  return added.length > 0;
}

/** @param {unknown} v @returns {string} A Markdown table cell. */
const cell = (v) => String(v ?? 'n/a').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** @param {string[]} list @returns {string} */
const idList = (list) => (list.length === 0 ? 'none' : list.map((id) => `\`${id}\``).join(', '));

/** @param {string[]} problems @returns {string[]} */
const problemLines = (problems) => (problems.length === 0 ? ['- none'] : problems.map((p) => `- ${p}`));

/**
 * @param {string} task @param {string} candidate @param {string} tier @param {Record<string, any>} v An equality verdict.
 * @returns {string}
 */
function renderEqual(task, candidate, tier, v) {
  const d = v.declared;
  return [
    `# P7 equality: ${candidate}, ${tier} (${task})`, '',
    `Verdict: **${v.verdict}**. Reference \`${P7_REFERENCE}\`; the reports are derived from the declaration and the logs, never from a raw observation.`, '',
    '| Items | Ended | Equal | Not equal | Errors | Censored | Missing | Duplicates | Unexpected |', '|---|---|---|---|---|---|---|---|---|',
    `| ${v.items} | ${v.ended} | ${v.equal} | ${v.notEqual.length} | ${v.errors.length} | ${v.censored.length} | ${v.missing.length} | ${v.duplicates.length} | ${v.unexpected.length} |`, '',
    '## Declared', '',
    d === null ? 'No declaration.' : [
      `- candidate: \`${d.candidate?.variant}\`, tree ${d.candidate?.treeId}, copy ${d.candidate?.copyDigest}`,
      `- reference: \`${d.reference?.variant}\`, tree ${d.reference?.treeId}, copy ${d.reference?.copyDigest}`,
      `- tier ${d.tier}, corpus ${d.corpusVersion}, input constructor \`${d.inputConstructor?.variant}\` (${d.inputConstructor?.rule})`,
    ].join('\n'), '',
    '## Coverage of the memory fixtures', '',
    `Complete: ${v.coverage.complete}. \`lists\` steps: ${v.coverage.lists}; \`reference\` steps: ${v.coverage.reference}; budget breaks: ${v.coverage.budget.length}.`, '',
    '| Fixture | Reference bytes | List bytes | Representation | Expected | Ok |', '|---|---:|---:|---|---|---|',
    ...v.coverage.memory.map((/** @type {any} */ m) => `| ${cell(m.fixture)} | ${cell(m.refBytes)} | ${cell(m.listBytes)} | ${cell(m.representation)} | ${cell(m.expected)} | ${cell(m.ok)} |`), '',
    ...(v.coverage.budget.length === 0 ? [] : ['Budget breaks:', '', ...v.coverage.budget.map((/** @type {any} */ b) => `- \`${b.id}\` ${b.setting}: ${JSON.stringify(b)}`), '']),
    '## Items', '',
    `- not equal: ${idList(v.notEqual)}`, `- errors: ${idList(v.errors)}`, `- censored: ${idList(v.censored)}`, `- missing: ${idList(v.missing)}`,
    `- duplicates: ${idList(v.duplicates)}`, `- unexpected: ${idList(v.unexpected)}`, '',
    '## Diagnostics', '',
    ...(v.diagnostics.length === 0 ? ['- none'] : v.diagnostics.map((/** @type {any} */ x) => `- \`${x.id}\`: differing ${JSON.stringify(x.differing)}`)), '',
    '## Problems', '', ...problemLines(v.problems), '',
  ].join('\n');
}

/**
 * @param {string} task @param {Record<string, { verdict: Record<string, any>, decision: ReturnType<typeof goDecision>, quick: any, full: any }>} rows
 * @returns {string}
 */
function renderTime(task, rows) {
  const lines = [
    `# P7 timing (${task})`, '',
    `go = quick equality and full equality bound to the timed trees, timing \`measured\`, no differing pair and ratio >= ${P7_GO_RATIO} (D-P24-05).`, '',
    '| Candidate | Go | Timing | Items | Ratio | Geometric ratio | Reference ms | Candidate ms |', '|---|---|---|---|---|---|---|---|',
    ...Object.entries(rows).map(([c, r]) => `| ${cell(c)} | ${r.decision.go ? 'yes' : 'no'} | ${r.verdict.verdict} | ${r.verdict.ended} of ${r.verdict.items} | ${cell(r.verdict.ratio)} | ${cell(r.verdict.geoRatio)} | ${cell(r.verdict.refMs)} | ${cell(r.verdict.candMs)} |`), '',
  ];
  for (const [c, r] of Object.entries(rows)) {
    const v = r.verdict;
    lines.push(
      `## ${c}`, '',
      `- go: ${r.decision.go ? 'yes' : 'no'}${r.decision.reasons.length === 0 ? '' : ` (${r.decision.reasons.join('; ')})`}`,
      `- quick equality: ${r.quick.ok ? 'bound' : r.quick.reason}`, `- full equality: ${r.full.ok ? 'bound' : r.full.reason}`,
      `- not same: ${idList(v.notSame)}`, `- invalid: ${idList(v.invalid)}`, `- capped on both trees: ${idList(v.capped)}`,
      `- missing: ${idList(v.missing)}`, `- censored: ${idList(v.censored)}`, `- errors: ${idList(v.errors)}`, '',
      '### Problems', '', ...problemLines(v.problems), '',
    );
  }
  return lines.join('\n');
}

/**
 * @param {string} task
 * @param {{ path: string, sha256: string }[]} inputs
 * @param {Record<string, unknown>} body `{ equal }` or `{ time, go }`.
 * @returns {Record<string, any>}
 */
const reportRecord = (task, inputs, body) => ({
  meta: { format: 'ig-p7-report', version: 1, task, writtenAt: new Date().toISOString(), reportProducer: { harnessHash: harnessInfo().harnessHash }, inputs },
  ...body,
});

/**
 * @param {string} task `V4-P7E-<candidate>-<tier>`.
 * @param {string} candidate
 * @param {string} tier
 * @returns {Promise<{ record: Record<string, any>, md: string, lines: string[] } | string>} The report, or the reason for a refusal.
 */
async function equalityReport(task, candidate, tier) {
  const run = readRun(task, 'equal');
  if (run.inputs.length === 0) {
    return `report needs a run: ${task} has none (no experiment.json, state.json or items.jsonl under ${rel(artifactDir('frozen', task, 'equal'))})`;
  }
  const verdict = equalVerdict({ ...run, expected: { task, candidate, tier }, manifest: memoryManifest(), corpus: await expectedCorpus('equal', candidate, tier) });
  if (addProblems(verdict.problems, run.problems) && verdict.verdict === 'equal') {
    verdict.verdict = 'incomplete';
  }
  const declared = Array.isArray(run.declaration?.corpus?.inputs) ? run.declaration.corpus.inputs : [];
  const inputs = [...run.inputs, ...declared.map((/** @type {{ path: string, sha256: string }} */ i) => ({ path: i.path, sha256: i.sha256 }))];
  return { record: reportRecord(task, inputs, { equal: verdict }), md: renderEqual(task, candidate, tier, verdict), lines: [] };
}

/**
 * @param {string} task `V4-P7`.
 * @returns {Promise<{ record: Record<string, any>, md: string, lines: string[] } | string>} The report, or the reason for a refusal.
 */
async function timingReport(task) {
  const planPath = 'tools/ig-proto/plans/V4-P7.json';
  if (!existsSync(abs(planPath))) {
    return `no plan ${planPath}: there is no timing to report`;
  }
  /** @type {string[]} */
  const candidates = JSON.parse(readFileSync(abs(planPath), 'utf8')).steps
    .map((/** @type {{ id: string }} */ s) => s.id).filter((/** @type {string} */ id) => id.startsWith('time-')).map((/** @type {string} */ id) => id.slice('time-'.length));
  if (candidates.length === 0) {
    return `${planPath} has no time-<candidate> step`;
  }
  if (candidates.every((c) => readRun(task, `time-${c}`).inputs.length === 0)) {
    return `report needs a run: ${task} has none (no time-<candidate> run under ${rel(artifactDir('frozen', task))})`;
  }
  /** @type {Record<string, any>} */
  const time = {};
  /** @type {Record<string, ReturnType<typeof goDecision>>} */
  const go = {};
  /** @type {Parameters<typeof renderTime>[1]} */
  const rows = {};
  /** @type {{ path: string, sha256: string }[]} */
  const inputs = [];
  /** @type {string[]} */
  const lines = [];
  for (const c of candidates) {
    const run = readRun(task, `time-${c}`);
    const verdict = timeVerdict({ ...run, expected: { task, candidate: c }, corpus: await expectedCorpus('time', c, null) });
    addProblems(verdict.problems, run.problems);
    if (verdict.problems.length > 0 && verdict.verdict === 'measured') {
      verdict.verdict = 'incomplete';
    }
    /** @type {Record<string, { ok: true } | { ok: false, reason: string }>} */
    const bindings = {};
    for (const tier of TIERS) {
      const read = readReport(equalityReportPath(c, tier));
      const report = 'report' in read ? read.report : null;
      if ('unreadable' in read) {
        bindings[tier] = { ok: false, reason: `the ${tier} equality report is unreadable` };
      } else if (run.declaration === null || run.declaration === undefined) {
        bindings[tier] = { ok: false, reason: report === null ? `no ${tier} equality report` : 'no time declaration' };
      } else {
        bindings[tier] = equalityBinding(report, {
          tier, candidate: run.declaration.candidate, reference: run.declaration.reference, fileHash, requiredInputs: equalityEvidencePaths(c, tier),
        });
      }
    }
    const decision = goDecision({ quick: bindings.quick, full: bindings.full, timing: verdict });
    time[c] = verdict;
    go[c] = decision;
    rows[c] = { verdict, decision, quick: bindings.quick, full: bindings.full };
    const declared = Array.isArray(run.declaration?.corpus?.inputs) ? run.declaration.corpus.inputs : [];
    inputs.push(...run.inputs, ...declared.map((/** @type {{ path: string, sha256: string }} */ i) => ({ path: i.path, sha256: i.sha256 })));
    for (const tier of TIERS) {
      const path = equalityReportPath(c, tier);
      const sha256 = fileHash(path);
      if (sha256 !== null) {
        inputs.push({ path, sha256 });
      }
    }
    const shown = (/** @type {{ ok: true } | { ok: false, reason: string }} */ b) => (b.ok ? 'ok' : b.reason);
    lines.push(`p7-probe: ${c} go ${decision.go ? 'yes' : 'no'} (ratio ${typeof verdict.ratio === 'number' ? verdict.ratio.toFixed(4) : 'n/a'}, quick ${shown(bindings.quick)}, full ${shown(bindings.full)}, timing ${verdict.verdict})`);
  }
  return { record: reportRecord(task, inputs, { time, go }), md: renderTime(task, rows), lines };
}

/** @param {string[]} argv `--task <T> --label frozen --source-label <SL>` @returns {Promise<number>} */
async function reportCommand(argv) {
  const common = commonArgs(argv);
  if ('refusal' in common) {
    return common.refusal;
  }
  const { task } = common.args;
  const equalTask = task === undefined ? null : /^V4-P7E-([a-z0-9][a-z0-9-]*)-(quick|full)$/.exec(task);
  if (task === undefined || (task !== 'V4-P7' && equalTask === null)) {
    return refuse('report knows V4-P7E-<candidate>-<tier> and V4-P7');
  }
  const made = equalTask === null ? await timingReport(task) : await equalityReport(task, equalTask[1], equalTask[2]);
  if (typeof made === 'string') {
    return refuse(made);
  }
  const json = `${EVIDENCE}/${task}/p7.json`;
  writeJson(abs(json), made.record);
  writeText(abs(`${EVIDENCE}/${task}/p7.md`), made.md);
  process.stdout.write(`p7-probe: wrote ${json}\n${made.lines.map((l) => `${l}\n`).join('')}`);
  return 0;
}

/**
 * @param {string[]} argv `equal ...`, `bind ...`, `time ...` or `report ...`
 * @returns {Promise<number>} The runner's exit code for `equal` and `time`, 0 for a command that ended, 1 for a refusal.
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  const commands = /** @type {Record<string, (argv: string[]) => Promise<number>>} */ ({
    equal: equalCommand, bind: bindCommand, time: timeCommand, report: reportCommand,
  });
  if (command === undefined || !Object.hasOwn(commands, command)) {
    return refuse(`unknown command ${command ?? ''} (equal, bind, time, report)`);
  }
  try {
    return await commands[command](rest);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}

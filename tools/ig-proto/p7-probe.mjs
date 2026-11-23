// @ts-check
// P7's spike: the rating kernel may be made faster only if every result stays identical (stages 2 to 4 pack, T03a to T03c).
// T03a: the constants of the corpora, the item declarations of the two worker kinds `p7-equal` (a candidate tree against
// the reference tree `base`, on the complete `DeductionResult`) and `p7-time` (the same ratings timed in pairs) and their
// conversion to runtime items. The pure helpers are in lib/p7-core.mjs so that the lane worker does not load this
// command's graph. T03b adds the experiment declaration, its checks and the verdicts; T03c the bindings, the go rule and
// the commands.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { memoryManifest, MEMORY_SETTINGS } from './lib/p7-core.mjs';
import { abs, artifactDir, rel } from './lib/paths.mjs';
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

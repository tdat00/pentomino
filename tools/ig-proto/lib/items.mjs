// @ts-check
// Bounded, identity-checked measurement items (task pack v4, V4-T04a; reviews R05 and RV2-01; D-V4-14).
// A measurement is a list of items. Each item has a stable id and runs in a supervised lane worker that the parent
// cuts before the lock helper's limit (lib/lanes.mjs). Every log line of the item log carries the run's
// `identityHash`: an `item-start` line is written before dispatch, at most one `item-spawn` line (a child process's
// PID, for the runners that spawn one) and one terminal `item-end` line (`completed`, `censored` or `error`). An item
// that has ended is never run again; a started item without an end, an identity that changed or a malformed log
// stops the step (exit 3) and needs a ruling. The line helpers below are the only way any runner writes an item log.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { admits, createLanes, DEFAULT_LIMITS } from './lanes.mjs';
import { artifactDir, elapsedS, FROZEN_COMMIT } from './paths.mjs';
import { harnessInfo, sha256, sourceDigest, writeJson } from './records.mjs';
import { ensureTree } from './tree.mjs';

/** Lanes per group of one kind; any other kind, the test kinds included, has 1. */
export const ITEM_LANES = Object.freeze({ 'v4-select': 2, 'v4-generate': 1, 'v4-replay': 2, 'v4-kernel': 1 });

/**
 * @typedef {{ id: string, kind: string, variant: string, payload: Record<string, unknown> }} Item
 * @typedef {{ frozenCommit: string, sourceDigest: string, treeIds: Record<string, string>, harnessHash: string,
 *   manifestHash: string }} Identity
 */

const IDENTITY_FIELDS = Object.freeze(['frozenCommit', 'sourceDigest', 'treeIds', 'harnessHash', 'manifestHash']);
const LINE_TYPES = Object.freeze(['item-start', 'item-spawn', 'item-end']);

/** @param {Item[]} items @returns {string} */
export function manifestHash(items) {
  return sha256(JSON.stringify(items.map((i) => [i.id, i.kind, i.variant, i.payload])));
}

/**
 * @param {Item[]} items
 * @returns {Promise<Identity>} The experiment's inputs: never an invocation's remaining time.
 */
export async function itemIdentity(items) {
  /** @type {Record<string, string>} */
  const treeIds = {};
  for (const variant of [...new Set(items.map((i) => i.variant))].sort()) {
    treeIds[variant] = (await ensureTree(variant)).treeId;
  }
  return {
    frozenCommit: FROZEN_COMMIT,
    sourceDigest: await sourceDigest(),
    treeIds,
    harnessHash: harnessInfo().harnessHash,
    manifestHash: manifestHash(items),
  };
}

/** @param {Identity} identity @returns {string} */
export const identityHash = (identity) => sha256(JSON.stringify(identity));

/** @param {string} path @param {Record<string, unknown>} line One JSON line, appended at once. */
const append = (path, line) => appendFileSync(path, `${JSON.stringify(line)}\n`);

/** @param {string} path @param {string} hash @param {Item} item Written before the item is dispatched. */
export function logStart(path, hash, item) {
  append(path, { type: 'item-start', identityHash: hash, item: item.id, kind: item.kind, variant: item.variant, at: new Date().toISOString() });
}

/** @param {string} path @param {string} hash @param {string} itemId @param {number} pid The child's PID. */
export function logSpawn(path, hash, itemId, pid) {
  append(path, { type: 'item-spawn', identityHash: hash, item: itemId, pid, at: new Date().toISOString() });
}

/**
 * @param {string} path
 * @param {string} hash
 * @param {string} itemId
 * @param {'completed' | 'censored' | 'error'} status
 * @param {unknown} result
 * @param {number} ms
 */
export function logEnd(path, hash, itemId, status, result, ms) {
  append(path, { type: 'item-end', identityHash: hash, item: itemId, status, result, ms, at: new Date().toISOString() });
}

/**
 * @param {string} path
 * @returns {any[]} One object per non-empty line; `[]` when the file is absent.
 */
export function readItemLog(path) {
  if (!existsSync(path)) {
    return [];
  }
  /** @type {any[]} */
  const lines = [];
  for (const [index, text] of readFileSync(path, 'utf8').split('\n').entries()) {
    if (text.trim() === '') {
      continue;
    }
    /** @type {unknown} */
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(`items: malformed log line ${index + 1}`);
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`items: malformed log line ${index + 1}`);
    }
    lines.push(value);
  }
  return lines;
}

/**
 * What a resumed step may do, or why it must not (pure). The rules are checked in this order, each over the whole log;
 * a log line is counted from 1.
 * @param {Item[]} items
 * @param {any[]} lines
 * @param {Identity} identity
 * @param {Record<string, any> | null} stateIdentity The identity in the earlier state file; null without one.
 * @returns {{ refuse: string } | { pending: Item[], ended: number }}
 */
export function resumePlan(items, lines, identity, stateIdentity) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) {
      return { refuse: `duplicate item id ${item.id}` };
    }
    ids.add(item.id);
  }
  if (stateIdentity !== null) {
    for (const field of IDENTITY_FIELDS) {
      const now = identity[/** @type {keyof Identity} */ (field)];
      if (JSON.stringify(now) !== JSON.stringify(stateIdentity[field])) {
        return { refuse: `identity mismatch (${field})` };
      }
    }
  }
  const hash = identityHash(identity);
  for (const [index, line] of lines.entries()) {
    if (line?.identityHash !== hash) {
      return { refuse: `identity mismatch (log line ${index + 1})` };
    }
  }
  for (const [index, line] of lines.entries()) {
    if (!LINE_TYPES.includes(line.type)) {
      return { refuse: `unknown log line ${index + 1}` };
    }
    if (!ids.has(line.item)) {
      return { refuse: `unknown item ${line.item}` };
    }
  }
  const seen = new Set();
  for (const line of lines) {
    const key = JSON.stringify([line.type, line.item]);
    if (seen.has(key)) {
      return { refuse: `duplicate log entry for ${line.item}` };
    }
    seen.add(key);
  }
  /** @type {Map<string, { ended: boolean }>} */
  const started = new Map();
  for (const line of lines) {
    if (line.type === 'item-start') {
      started.set(line.item, { ended: false });
      continue;
    }
    const entry = started.get(line.item);
    if (entry === undefined || (line.type === 'item-spawn' && entry.ended)) {
      return { refuse: `out-of-order log entry for ${line.item}` };
    }
    if (line.type === 'item-end') {
      entry.ended = true;
    }
  }
  for (const item of items) {
    if (started.has(item.id) && started.get(item.id)?.ended !== true) {
      return { refuse: `interrupted item ${item.id} needs a ruling` };
    }
  }
  const pending = items.filter((item) => started.get(item.id)?.ended !== true);
  return { pending, ended: items.length - pending.length };
}

/**
 * Runs the pending items of a list, group by group (consecutive items of one variant and kind share lanes), and
 * writes the item log and the state. Exit code 3 and nothing written when the step refuses to resume.
 * @param {{ task: string, step: string, label: string, horizonS: number, items: Item[],
 *   limits?: Partial<typeof DEFAULT_LIMITS>, testKinds?: boolean, identity?: Identity }} o
 *   `limits`, `testKinds` and `identity` are for the self-test.
 * @returns {Promise<{ exitCode: number, done: boolean, progress: number, refused: string | null }>}
 */
export async function runItems(o) {
  const { task, step, label, horizonS, items, limits, testKinds } = o;
  const dir = artifactDir(label, task, step);
  mkdirSync(dir, { recursive: true });
  const logPath = join(dir, 'items.jsonl');
  const statePath = join(dir, 'state.json');
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();

  const identity = o.identity ?? await itemIdentity(items);
  const hash = identityHash(identity);
  const earlier = existsSync(statePath) ? (JSON.parse(readFileSync(statePath, 'utf8')).identity ?? {}) : null;
  const plan = resumePlan(items, readItemLog(logPath), identity, earlier);
  if ('refuse' in plan) {
    process.stderr.write(`items: STOP: ${plan.refuse}\n`);
    return { exitCode: 3, done: false, progress: 0, refused: plan.refuse };
  }

  /** @type {Item[][]} */
  const groups = [];
  for (const item of plan.pending) {
    const last = groups.at(-1);
    if (last !== undefined && last[0].variant === item.variant && last[0].kind === item.kind) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  }
  const lim = { ...DEFAULT_LIMITS, ...limits };
  let written = 0;
  for (const group of groups) {
    const { variant, kind } = group[0];
    if (!admits(kind, elapsedS(), horizonS, lim)) {
      break;
    }
    const size = Object.hasOwn(ITEM_LANES, kind) ? /** @type {Record<string, number>} */ (ITEM_LANES)[kind] : 1;
    const lanes = await createLanes({ variant, size, horizonS, limits, testKinds });
    /** @type {number[]} */
    const startedMs = [];
    let stop = false;
    try {
      const out = await lanes.runAll(group.map((i) => ({ ...i.payload, kind: i.kind })), {
        onStart(j) {
          startedMs[j] = performance.now();
          logStart(logPath, hash, group[j]);
        },
        onEnd(j, result) {
          const outcome = result?.outcome;
          const status = outcome === 'censored' ? 'censored' : outcome === 'error' || outcome === 'defect' ? 'error' : 'completed';
          logEnd(logPath, hash, group[j].id, status, result, Math.round(performance.now() - startedMs[j]));
          written += 1;
        },
      });
      stop = !out.done || out.results.some((r) => r?.outcome === 'censored');
    } finally {
      await lanes.close();
    }
    if (stop) {
      break;
    }
  }

  const ended = plan.ended + written;
  const done = ended === items.length;
  const verified = plan.pending.length === 0 ? 1 : 0;
  writeJson(statePath, {
    format: 'ig-proto-state',
    version: 1,
    task,
    step,
    label,
    identity,
    done,
    items: { done: ended, total: items.length },
    lastInvocation: {
      start: startedAt,
      end: new Date().toISOString(),
      seconds: Math.round(elapsedS() * 1000) / 1000,
      horizonS,
      progress: { items: written, verified },
    },
  });
  return { exitCode: 0, done, progress: written + verified, refused: null };
}

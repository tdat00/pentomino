// @ts-check
// Stage-1 checks (task pack v4, V4-T04c and V4-T04d; reviews R06, R2-14, RV3-02, R4-03 and RV5-01; D-V4-14, D-V4-18).
// `run` expands an item manifest (tools/ig-proto/plans/V4-T04.*.json) into the bounded items of lib/items.mjs and runs
// them; the two verdicts judge the joined rows of a finished step: parity (observers change nothing) and replay (the
// prototype's own records replay in full). The verdicts and `expandManifest` are pure (apart from the catalogue read of
// `caseBoard`). `summary` judges the stage-1 blocks from the stored observations and writes the typed receipt
// (lib/proof.mjs); `pm4-gate` is the early, read-only check of the PM4 record.
//   node tools\ig-proto\v4-check.mjs run --task V4-T04 --step parity --manifest tools\ig-proto\plans\V4-T04.parity.json
//     --label frozen --source-label "frozen 3fc65f4" [--horizon-s 285]
//   node tools\ig-proto\v4-check.mjs summary --task V4-T04 --label frozen --source-label "frozen 3fc65f4"
//   node tools\ig-proto\v4-check.mjs pm4-gate --label frozen --source-label "frozen 3fc65f4"
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { identityHash, manifestHash, readItemLog, runItems } from './lib/items.mjs';
import { abs, artifactDir, evidenceDir, FROZEN_COMMIT, FROZEN_DIGEST, parseArgs, rel, ROOT } from './lib/paths.mjs';
import { proofEnvelope, readRepoFile, STAGE1_COVERAGE_EXTRA } from './lib/proof.mjs';
import { banner, buildMeta, harnessInfo, readTreeInfo, sha256, sha256File, sourceDigest, writeJson, writeText } from './lib/records.mjs';
import { caseBoard } from './lib/sets.mjs';
import { collectSources, ensureTree, listVariants, planTree } from './lib/tree.mjs';
import { verifySnapshot } from './snapshot.mjs';

/**
 * @typedef {import('./lib/items.mjs').Item} Item
 * @typedef {{ item: string, variant: string, caseId: string, seedText: string, mode: string | null,
 *   route: string | null, status: string, result: any }} Row An expanded item joined with its `item-end` line;
 *   `status` is the end line's (`completed`, `censored`, `error`) or `missing` without one.
 * @typedef {{ verdict: 'pass' | 'fail' | 'incomplete', reasons: string[], rows: Row[] }} Verdict
 * @typedef {{ verdict: 'pass' | 'fail' | 'incomplete', reasons: string[], rows: Record<string, unknown>[] }} Block
 *   A stage-1 block: its verdict, the reasons (each names a condition with its numbers) and its table rows.
 */

const MODES = Object.freeze(['absent', 'charge', 'record']);
const ROW_KINDS = Object.freeze(['v4-select', 'v4-generate', 'v4-replay']);
/** The levels whose `v4`-family call runs `selectCluesV4` (D-V4-03). */
const NEW_LEVELS = Object.freeze(['nightmare', 'hell-1']);
/** Subset ordinals stay below these bounds (D-V4-04; core/engine/pack.js:53): a new-route call, any other call. */
const SEQUENCE_BOUND = Object.freeze({ new: 2192, legacy: 2128 });
const DEFAULT_HORIZON_S = 285;

/** @param {string} reason @returns {Error} */
const problem = (reason) => new Error(`v4-check: ${reason}`);

/** @param {string} id @returns {string} The id as a file-system name. */
const safe = (id) => id.replace(/[^A-Za-z0-9._-]/g, '_');

/**
 * The ordered items of a manifest (RV3-02: the raw folders derive from the manifest, so `rawDir` is the one of its own
 * task and step).
 * @param {any} manifest `{ format, version, task, step, rows }`
 * @param {string} rawDir `artifactDir('frozen', manifest.task, manifest.step)`
 * @param {(variant: string) => boolean} isV4 True when the variant's tree chain contains `v4`.
 * @returns {Item[]}
 */
export function expandManifest(manifest, rawDir, isV4) {
  const { task, step, rows } = manifest;
  if (!Array.isArray(rows)) {
    throw problem('manifest has no rows');
  }
  /** @type {Item[]} */
  const items = [];
  const ids = new Set();
  const add = (/** @type {Item} */ item) => {
    if (ids.has(item.id)) {
      throw problem(`duplicate item id ${item.id}`);
    }
    ids.add(item.id);
    items.push(item);
  };
  for (const row of rows) {
    const { kind, variant, caseId, seedText } = row ?? {};
    if (!ROW_KINDS.includes(kind)) {
      throw problem(`unknown row kind ${kind}`);
    }
    for (const [name, value] of Object.entries({ variant, caseId, seedText })) {
      if (typeof value !== 'string' || value === '') {
        throw problem(`a ${kind} row has no ${name}`);
      }
    }
    const entry = caseBoard(caseId);
    const stem = `${step}:${variant}:${caseId}:${seedText}`;
    if (kind === 'v4-select') {
      if (!Array.isArray(row.modes) || row.modes.length === 0) {
        throw problem(`row ${stem} has no modes`);
      }
      for (const mode of row.modes) {
        if (!MODES.includes(mode)) {
          throw problem(`unknown mode ${mode}`);
        }
        const id = `${stem}:${mode}`;
        const route = !isV4(variant) ? 'base' : NEW_LEVELS.includes(entry.levelId) ? 'new' : mode === 'record' ? 'legacy-recorded' : 'legacy';
        add({
          id,
          kind,
          variant,
          payload: { boardRows: entry.boardRows, levelId: entry.levelId, seedText, mode, logDir: join(rawDir, 'logs', safe(id)), row: safe(id), route },
        });
      }
    } else if (kind === 'v4-generate') {
      if (!Number.isInteger(row.quantity) || row.quantity < 1) {
        throw problem(`row ${stem} needs a positive integer quantity`);
      }
      const id = `${stem}:gen`;
      add({
        id,
        kind,
        variant,
        payload: {
          boardRows: entry.boardRows,
          rotation: entry.rotation,
          levelId: entry.levelId,
          seedText,
          uniqueness: 'require',
          maxActive: entry.maxActive,
          quantity: row.quantity,
          packPath: join(rawDir, 'packs', `${safe(id)}.pack.json`),
          logDir: join(rawDir, 'logs', safe(id)),
          row: safe(id),
        },
      });
    } else {
      if (!Number.isInteger(row.puzzles) || row.puzzles < 1) {
        throw problem(`row ${stem} needs a positive integer puzzles`);
      }
      const generated = `${row.packStep ?? step}:${variant}:${caseId}:${seedText}:gen`;
      const packPath = join(artifactDir('frozen', task, row.packStep ?? step), 'packs', `${safe(generated)}.pack.json`);
      for (let i = 0; i < row.puzzles; i += 1) {
        add({ id: `${stem}:puzzle-${i}`, kind, variant, payload: { packPath, puzzleIndex: i } });
      }
    }
  }
  return items;
}

/** @param {unknown} value @returns {value is number} */
const num = (value) => typeof value === 'number' && Number.isFinite(value);

/** @param {string[]} fails @param {string[]} gaps @param {string[]} notes @param {Row[]} rows @returns {Verdict} `fail` wins over `incomplete`. */
const verdictOf = (fails, gaps, notes, rows) => ({
  verdict: fails.length > 0 ? 'fail' : gaps.length > 0 ? 'incomplete' : 'pass',
  reasons: [...fails, ...gaps, ...notes],
  rows,
});

/** @param {Row} row @returns {string} The error text of a row's result, with its leading space; '' without one. */
const messageOf = (row) => (typeof row.result?.message === 'string' ? ` (${row.result.message})` : '');

/**
 * @param {Row} row
 * @param {string[]} fails
 * @param {string[]} gaps
 * @returns {boolean} True when the row ended `completed` with the outcome `ok`; otherwise its reason is recorded.
 */
function usable(row, fails, gaps) {
  if (row.status === 'missing') {
    gaps.push(`${row.item}: no item-end line`);
  } else if (row.status === 'censored') {
    gaps.push(`${row.item}: censored`);
  } else if (row.status === 'error') {
    fails.push(`${row.item}: error${messageOf(row)}`);
  } else if (row.status !== 'completed' || row.result?.outcome !== 'ok') {
    fails.push(`${row.item}: outcome ${row.result?.outcome ?? row.status}`);
  } else {
    return true;
  }
  return false;
}

/** @param {Row} row @returns {boolean} A complete ledger with a known total: the only work evidence a verdict reads. */
const hasWork = (row) => row.result?.ledger?.complete === true && num(row.result.ledger.totalWork);

/**
 * The checks of every `record` row: events, the detail counts and the rechecked ratings (R2-14).
 * @param {Row} row A usable record row.
 * @param {number | null} bound Subset ordinals must stay below it; null for the `base` route.
 * @param {string[]} fails
 * @param {string[]} gaps
 */
function recordChecks(row, bound, fails, gaps) {
  const r = row.result;
  if (!(num(r.events) && r.events > 0)) {
    fails.push(`${row.item}: no recorded event`);
  }
  if (bound !== null && !(num(r.maxSequence) && r.maxSequence < bound)) {
    fails.push(`${row.item}: maxSequence ${r.maxSequence} is not below ${bound}`);
  }
  const d = r.detail;
  if (d === null || typeof d !== 'object') {
    fails.push(`${row.item}: no detail counts`);
    return;
  }
  if (d.scored !== d.rated + d.rejected) {
    fails.push(`${row.item}: scored ${d.scored} differs from rated ${d.rated} + rejected ${d.rejected}`);
  }
  if (d.missing !== 0) {
    fails.push(`${row.item}: ${d.missing} scored events without detail`);
  }
  if (d.scored === 0) {
    gaps.push(`${row.item}: no completed scored event`);
    return;
  }
  const rechecked = Array.isArray(d.rechecked) ? d.rechecked : [];
  if (rechecked.length !== Math.min(2, d.scored)) {
    fails.push(`${row.item}: ${rechecked.length} rechecked ratings, expected ${Math.min(2, d.scored)}`);
  } else if (!rechecked.every((/** @type {any} */ c) => c?.equal === true)) {
    fails.push(`${row.item}: a rechecked rating differs from its canonical re-rating`);
  }
}

/** @param {Set<string | null>} routes @returns {'base' | 'new' | 'legacy' | null} The route kind of a group; null for a mixed or unknown set. */
function groupKind(routes) {
  if (routes.size === 1 && routes.has('base')) {
    return 'base';
  }
  if (routes.size === 1 && routes.has('new')) {
    return 'new';
  }
  return [...routes].every((route) => route === 'legacy' || route === 'legacy-recorded') ? 'legacy' : null;
}

/**
 * The parity verdict of a step of `v4-select` rows (plan §5.1 "Parity passes"; R2-14): per (variant, case) group,
 * equal results, equal complete total work, charge sequences equal to that work, and complete, rechecked detail.
 * @param {Row[]} rows
 * @returns {Verdict}
 */
export function parityVerdict(rows) {
  /** @type {string[]} */
  const fails = [];
  /** @type {string[]} */
  const gaps = [];
  if (rows.length === 0) {
    gaps.push('no parity rows');
  }
  /** @type {Map<string, Row[]>} */
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.variant}\n${row.caseId}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  /** @type {Map<string, { name: string, caseId: string, kind: string, byMode: Map<string | null, Row>, ok: Map<string, boolean> }>} */
  const judged = new Map();
  for (const [key, group] of groups) {
    const { variant, caseId } = group[0];
    const name = `${variant} ${caseId}`;
    const routes = new Set(group.map((row) => row.route));
    const kind = groupKind(routes);
    if (kind === null) {
      fails.push(`${name}: rows of mixed or unknown routes (${[...routes].join(', ')})`);
      continue;
    }
    const byMode = new Map(group.map((row) => [row.mode, row]));
    /** @type {Map<string, boolean>} */
    const ok = new Map();
    for (const mode of kind === 'base' ? ['absent', 'record'] : MODES) {
      const row = byMode.get(mode);
      if (row === undefined) {
        gaps.push(`${name}: the ${mode} item is absent from the rows`);
        ok.set(mode, false);
      } else {
        ok.set(mode, usable(row, fails, gaps));
      }
    }
    judged.set(key, { name, caseId, kind, byMode, ok });
    const record = /** @type {Row} */ (byMode.get('record'));
    if (ok.get('record') === true) {
      recordChecks(record, kind === 'base' ? null : SEQUENCE_BOUND[kind], fails, gaps);
    }
    if (kind === 'base' || [...ok.values()].includes(false)) {
      continue;
    }
    const [absent, charge] = [/** @type {Row} */ (byMode.get('absent')), /** @type {Row} */ (byMode.get('charge'))];
    const modes = MODES.map((mode) => /** @type {Row} */ (byMode.get(mode)));
    for (const row of modes) {
      if (typeof row.result.digest !== 'string' || row.result.digest === '') {
        fails.push(`${row.item}: no result digest`);
      }
    }
    if (new Set(modes.map((row) => row.result.digest)).size > 1) {
      fails.push(`${name}: result digests differ between modes (${modes.map((row) => `${row.mode} ${row.result.digest}`).join(', ')})`);
    }
    // Work evidence: only complete ledgers are read, and an incomplete one is never equality (R06).
    const worked = (kind === 'new' ? modes : [absent, charge]).filter(hasWork);
    for (const row of kind === 'new' ? modes : [absent, charge]) {
      if (!hasWork(row)) {
        gaps.push(`${row.item}: no complete work evidence`);
      }
    }
    const totals = worked.map((row) => row.result.ledger.totalWork);
    if (new Set(totals).size > 1) {
      fails.push(`${name}: total work differs between modes (${worked.map((row) => `${row.mode} ${row.result.ledger.totalWork}`).join(', ')})`);
    }
    for (const row of kind === 'new' ? [charge, record] : [charge]) {
      if (hasWork(row) && !(num(row.result.units) && row.result.units === row.result.ledger.totalWork)) {
        fails.push(`${row.item}: charged units ${row.result.units} differ from total work ${row.result.ledger.totalWork}`);
      }
    }
    if (kind === 'legacy' && !(num(record.result.units) && record.result.units === charge.result.units)) {
      fails.push(`${record.item}: recorded charged units ${record.result.units} differ from the charged mode's ${charge.result.units}`);
    }
    if (!Array.isArray(charge.result.chargeUnits) || !isDeepStrictEqual(record.result.chargeUnits, charge.result.chargeUnits)) {
      fails.push(`${name}: the charge sequences of the charge and record modes differ`);
    }
  }
  // The legacy identity case: the frozen search's observed run against the v4 tree's legacy route.
  for (const g of judged.values()) {
    if (g.kind !== 'base' || g.ok.get('absent') !== true || g.ok.get('record') !== true) {
      continue;
    }
    const v4 = judged.get(`v4\n${g.caseId}`);
    if (v4 === undefined) {
      gaps.push(`${g.name}: no v4 rows of ${g.caseId} to compare`);
      continue;
    }
    if (v4.ok.get('absent') !== true || v4.ok.get('record') !== true) {
      gaps.push(`${g.name}: the v4 absent and record rows of ${g.caseId} are not both usable`);
      continue;
    }
    const [bAbsent, bRecord, vAbsent, vRecord] = [g.byMode.get('absent'), g.byMode.get('record'), v4.byMode.get('absent'), v4.byMode.get('record')]
      .map((row) => /** @type {Row} */ (row).result);
    if (typeof bAbsent.digest !== 'string' || bAbsent.digest !== vAbsent.digest) {
      fails.push(`${g.name}: the absent result digest differs from v4's`);
    }
    if (typeof bRecord.eventsDigest !== 'string' || bRecord.eventsDigest !== vRecord.eventsDigest) {
      fails.push(`${g.name}: the recorded events digest differs from v4's`);
    }
    if (!(num(bRecord.units) && bRecord.units === vRecord.units)) {
      fails.push(`${g.name}: base recorded total ${bRecord.units} differs from v4's ${vRecord.units}`);
    }
  }
  return verdictOf(fails, gaps, [], rows);
}

/**
 * The replay verdict of the rows of generation (`...:gen`) and replay (`...:puzzle-<i>`) items (R06; R04): per
 * generation case, at least one `candidate` replay that matched with a measuring step. A replay row belongs to the
 * generation row of the same variant, case and `seedText`, also from another step (`packStep`).
 * @param {Row[]} rows
 * @returns {Verdict} `incomplete` replays are listed as `finding` entries of `reasons` (with their reason, work and bytes), never as proofs.
 */
export function replayVerdict(rows) {
  /** @type {string[]} */
  const fails = [];
  /** @type {string[]} */
  const gaps = [];
  /** @type {string[]} */
  const findings = [];
  /** @type {Map<string, { label: string, gen: Row | null, replays: Row[] }>} */
  const cases = new Map();
  for (const row of rows) {
    const part = row.item.endsWith(':gen') ? 'gen' : /:puzzle-\d+$/.test(row.item) ? 'replay' : null;
    if (part === null) {
      continue;
    }
    const key = [row.variant, row.caseId, row.seedText].join('\n');
    const entry = cases.get(key) ?? { label: `${row.caseId} (${row.variant})`, gen: null, replays: [] };
    cases.set(key, entry);
    if (part === 'replay') {
      entry.replays.push(row);
    } else if (entry.gen === null) {
      entry.gen = row;
    } else {
      fails.push(`${row.item}: a second generation item of ${entry.label}`);
    }
  }
  if (cases.size === 0) {
    gaps.push('no generation or replay rows');
  }
  for (const { label, gen, replays } of cases.values()) {
    let records = false;
    if (gen === null) {
      gaps.push(`no generation item for ${label}`);
    } else if (gen.status === 'missing') {
      gaps.push(`${gen.item}: no item-end line`);
    } else if (gen.status === 'censored') {
      gaps.push(`${gen.item}: censored`);
    } else if (gen.status === 'error') {
      fails.push(`${gen.item}: error${messageOf(gen)}`);
    } else {
      const r = gen.result ?? {};
      if (r.outcome === 'ok' && num(r.puzzles) && r.puzzles >= 1) {
        records = true;
      } else if (['ok', 'no-set', 'no-pack'].includes(r.outcome)) {
        gaps.push(`no record obtained for ${label} (${r.outcome === 'ok' ? 'no puzzle' : r.outcome})`);
      } else {
        fails.push(`${gen.item}: outcome ${r.outcome}`);
      }
    }
    let candidates = 0;
    for (const row of replays) {
      if (row.status === 'missing') {
        gaps.push(`${row.item}: no item-end line`);
        continue;
      }
      if (row.status === 'censored') {
        gaps.push(`${row.item}: censored`);
        continue;
      }
      if (row.status === 'error') {
        fails.push(`${row.item}: error${messageOf(row)}`);
        continue;
      }
      const r = row.result ?? {};
      if (typeof r.packSha256 === 'string' && r.packSha256 !== gen?.result?.packSha256) {
        fails.push(`${row.item}: the pack's SHA-256 differs from its generation item's`);
      }
      if (r.outcome === 'no-record') {
        continue;
      }
      if (r.outcome !== 'ok') {
        fails.push(`${row.item}: outcome ${r.outcome}`);
      } else if (r.status === 'matched') {
        if (!Number.isInteger(r.detailStep)) {
          fails.push(`${row.item}: matched without a measuring step (detailStep ${r.detailStep})`);
        } else if (r.kind === 'candidate') {
          candidates += 1;
        }
      } else if (r.status === 'incomplete') {
        findings.push(`finding ${row.item}: incomplete (reason ${r.reason}, work ${r.work}, bytes ${r.bytes})`);
      } else if (r.status === 'mismatch' || r.status === 'unavailable') {
        fails.push(`${row.item}: replay ${r.status}${typeof r.reason === 'string' ? ` (${r.reason})` : ''}`);
      } else {
        fails.push(`${row.item}: unknown replay status ${r.status}`);
      }
    }
    if (records && candidates === 0) {
      gaps.push(`no matched candidate replay for ${label}`);
    }
  }
  return verdictOf(fails, gaps, findings, rows);
}

/** The seeds of the identity receipt in the record's `seed` form (`plans/IGP-00.json`: `26x26-nightmare:0-1,14x14-master:0-1`). */
export const IDENTITY_SEEDS = Object.freeze([
  'landscape/26x26-nightmare/0', 'landscape/26x26-nightmare/1', 'landscape/14x14-master/0', 'landscape/14x14-master/1',
]);
const STEPS = Object.freeze(['parity', 'replay']);
const SELF_TEST_SUFFIXES = Object.freeze(['', 'v4', 'f', 'i']);
const PM4_RECORD = rel(evidenceDir('frozen', 'IGP-02', 'pm4.json'));
const PM4_SCREENS = rel(artifactDir('frozen', 'IGP-02', 'main', 'screens-all-state.json'));

/** @param {Block['verdict']} verdict @param {string[]} reasons @param {Record<string, unknown>[]} [rows] @returns {Block} */
const block = (verdict, reasons, rows = []) => ({ verdict, reasons, rows });

/** @param {unknown} error @returns {string} The message without the worktree's absolute root (records refuse it). */
function cleanMessage(error) {
  const root = ROOT.replace(/[\\/]+$/, '');
  const text = error instanceof Error ? error.message : String(error);
  return text.split(root).join('.').split(root.replaceAll('\\', '/')).join('.').split(root.replaceAll('\\', '\\\\')).join('.');
}

/** @param {Record<string, Block>} blocks @returns {Block['verdict']} `fail` wins over `incomplete`; no block is incomplete. */
function overall(blocks) {
  const verdicts = Object.values(blocks).map((b) => b.verdict);
  return verdicts.includes('fail') ? 'fail' : verdicts.length === 0 || verdicts.includes('incomplete') ? 'incomplete' : 'pass';
}

/** @param {string[]} reasons @returns {string} The first three reasons of a block, then how many more. */
const shown = (reasons) => (reasons.length === 0 ? 'no reason' : `${reasons.slice(0, 3).join(', ')}${reasons.length > 3 ? `, +${reasons.length - 3} more` : ''}`);

/**
 * @param {{ snapshotOk: boolean, digestEqual: boolean, variants: Record<string, string[]> }} source The verified
 *   snapshot, the frozen digest and the edit errors of every variant's plan on the frozen sources.
 * @returns {Block}
 */
export function sourceVerdict(source) {
  /** @type {string[]} */
  const reasons = [];
  if (!source.snapshotOk) {
    reasons.push('the frozen source differs from its manifest');
  }
  if (!source.digestEqual) {
    reasons.push('the source digest is not the frozen digest');
  }
  const bad = Object.entries(source.variants).filter(([, errors]) => errors.length > 0);
  for (const [id, errors] of bad) {
    reasons.push(`variant ${id}: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`);
  }
  const total = Object.keys(source.variants).length;
  return block(reasons.length === 0 ? 'pass' : 'fail', reasons, [
    { check: 'the snapshot matches its manifest', result: source.snapshotOk },
    { check: 'the source digest is the frozen digest', result: source.digestEqual },
    { check: 'variants whose edits plan on the frozen sources', result: `${total - bad.length} of ${total}` },
  ]);
}

/**
 * @param {any} state The `state.json` of a self-test run; null when absent.
 * @returns {Block} `pass` only when the run is `done` and every one of its results passed.
 */
export function selfTestVerdict(state) {
  if (state === null || state === undefined) {
    return block('incomplete', ['not run']);
  }
  const results = Array.isArray(state.results) ? state.results : [];
  const failing = results.filter((/** @type {any} */ r) => r?.pass !== true).map((/** @type {any} */ r) => String(r?.name));
  const rows = [{ done: state.done === true, cases: results.length, passed: results.length - failing.length }];
  if (state.done === true && results.length > 0 && failing.length === 0) {
    return block('pass', [], rows);
  }
  return block('fail', [failing.length > 0 ? `failing: ${failing.join(', ')}` : state.done === true ? 'no result' : 'not done'], rows);
}

/**
 * @param {any} identity The published `identity.json` of the identity receipt; null when absent.
 * @param {readonly string[]} expectedSeeds The record's `seed` values the receipt must cover.
 * @returns {Block} `incomplete` without the record, with other seeds, or while a seed has no MP12b1 run (under the
 *   frozen label such a seed is compared among the arms only, which proves nothing for DR-O13); else `fail` on a
 *   problem of the record, a seed whose `mp12b1~base` result differs or whose `base~log` pair is not a puzzle identity.
 */
export function identityVerdict(identity, expectedSeeds) {
  if (identity === null || identity === undefined) {
    return block('incomplete', ['not run']);
  }
  const seeds = Array.isArray(identity.seeds) ? identity.seeds : [];
  const found = seeds.map((/** @type {any} */ s) => s?.seed);
  if (!isDeepStrictEqual([...found].sort(), [...expectedSeeds].sort())) {
    return block('incomplete', [`the seeds of the record (${found.join(', ')}) differ from the expected (${expectedSeeds.join(', ')})`]);
  }
  const rows = seeds.map((/** @type {any} */ s) => ({
    seed: s.seed, 'mp12b1~base': s.pairs?.['mp12b1~base']?.sameResult ?? '-', 'base~log': s.pairs?.['base~log']?.level ?? '-',
  }));
  const without = Math.max(Number(identity.summary?.withoutMp12b1) || 0, seeds.filter((/** @type {any} */ s) => s.mp12b1 === undefined).length);
  if (without > 0) {
    return block('incomplete', [`withoutMp12b1 ${without}: a seed without an MP12b1 run is compared among the arms only`], rows);
  }
  /** @type {string[]} */
  const reasons = [];
  if (!(Number(identity.summary?.failures) === 0)) {
    reasons.push(`the record has ${identity.summary?.failures} failures`);
  }
  for (const s of seeds) {
    if (s.pairs?.['mp12b1~base']?.sameResult !== true) {
      reasons.push(`${s.seed}: the mp12b1~base pair has no equal result`);
    }
    if (s.pairs?.['base~log']?.level !== 'puzzle-identity') {
      reasons.push(`${s.seed}: the base~log pair is ${s.pairs?.['base~log']?.level ?? 'absent'}, not puzzle-identity`);
    }
  }
  return block(reasons.length === 0 ? 'pass' : 'fail', reasons, rows);
}

/**
 * @param {any} pm4 The published `pm4.json` of IGP-02 under `-Label frozen`; null when absent.
 * @param {any} screensState The `screens-all-state.json` of its `main` run; null when absent.
 * @param {string | null} instrTreeId The expected `instr` tree id, taken apart from the record.
 * @returns {Block} `incomplete` without the record or before the screens step is done, or when the record lacks a
 *   field this verdict reads; `fail` on a mismatch of the source, the run or the tree, a violation, no certified run, a
 *   coverage gap or a certified run that differs from its canonical rating.
 */
export function pm4Verdict(pm4, screensState, instrTreeId) {
  if (pm4 === null || pm4 === undefined) {
    return block('incomplete', ['not run']);
  }
  if (screensState?.done !== true) {
    return block('incomplete', ['the screens step of IGP-02 is not done']);
  }
  const cert = pm4.certificate;
  const certified = cert?.coverage?.equalCanonical?.certified;
  const absent = [
    [typeof pm4.meta?.source?.frozenCommit === 'string' && typeof pm4.meta.source.sourceDigest === 'string', 'meta.source'],
    [typeof pm4.meta?.trees?.instr?.treeId === 'string', 'meta.trees.instr.treeId'],
    [Array.isArray(cert?.violations), 'certificate.violations'],
    [Number.isInteger(cert?.certifiedRuns), 'certificate.certifiedRuns'],
    [Array.isArray(cert?.coverage?.gaps), 'certificate.coverage.gaps'],
    [num(certified?.equal) && num(certified?.of), 'certificate.coverage.equalCanonical.certified'],
  ].filter(([present]) => present !== true).map(([, name]) => name);
  if (absent.length > 0) {
    return block('incomplete', [`the record lacks ${absent.join(', ')}`]);
  }
  const { frozenCommit, sourceDigest: digest } = pm4.meta.source;
  const instr = pm4.meta.trees.instr.treeId;
  /** @type {string[]} */
  const reasons = [];
  if (frozenCommit !== FROZEN_COMMIT) {
    reasons.push(`frozen commit ${frozenCommit} is not ${FROZEN_COMMIT}`);
  }
  if (digest !== FROZEN_DIGEST) {
    reasons.push(`source digest ${digest} is not ${FROZEN_DIGEST}`);
  }
  if (pm4.run !== 'main') {
    reasons.push(`run ${pm4.run} is not main`);
  }
  if (instr !== instrTreeId) {
    reasons.push(`instr tree ${instr} is not the expected ${instrTreeId}`);
  }
  if (cert.violations.length > 0) {
    reasons.push(`${cert.violations.length} certificate violations`);
  }
  if (cert.certifiedRuns === 0) {
    reasons.push('0 certified runs');
  }
  if (cert.coverage.gaps.length > 0) {
    reasons.push(`${cert.coverage.gaps.length} coverage gaps: ${cert.coverage.gaps.join('; ')}`);
  }
  if (certified.equal !== certified.of) {
    reasons.push(`certified runs equal to their canonical rating: ${certified.equal} of ${certified.of}`);
  }
  return block(reasons.length === 0 ? 'pass' : 'fail', reasons, [
    { check: 'run', value: pm4.run },
    { check: 'instr tree', value: String(instr).slice(0, 12) },
    { check: 'certificate violations', value: cert.violations.length },
    { check: 'certified runs', value: cert.certifiedRuns },
    { check: 'certified runs equal to their canonical rating', value: `${certified.equal} of ${certified.of}` },
    { check: 'coverage gaps', value: cert.coverage.gaps.length },
  ]);
}

/**
 * The early PM4 check (RV5-01): the two IGP-02 records and nothing else.
 * @param {string} instrTreeId The expected `instr` tree id, taken from the frozen plan (never from the record).
 * @param {(path: string) => string | null} [readFile] Reads a repository-relative path; null when absent.
 * @returns {Block}
 */
export function pm4GateEvidence(instrTreeId, readFile = readRepoFile) {
  const texts = [PM4_RECORD, PM4_SCREENS].map((path) => [path, readFile(path)]);
  /** @type {any[]} */
  const parsed = [];
  for (const [path, text] of texts) {
    try {
      parsed.push(text === null ? null : JSON.parse(/** @type {string} */ (text)));
    } catch {
      return block('incomplete', [`unreadable ${path}`]);
    }
  }
  return pm4Verdict(parsed[0], parsed[1], instrTreeId);
}

/**
 * @param {Record<string, Block>} blocks
 * @returns {string} `Stage 1: holds.` when every block passes; `Stage 1: STOP (...)` naming the failed blocks; else
 *   `Stage 1: INCOMPLETE (...)` naming the incomplete ones.
 */
export function stage1Verdict(blocks) {
  const verdict = overall(blocks);
  if (verdict === 'pass') {
    return 'Stage 1: holds.';
  }
  const named = Object.entries(blocks).filter(([, b]) => b.verdict === verdict).map(([name, b]) => `${name}: ${shown(b.reasons)}`);
  return `Stage 1: ${verdict === 'fail' ? 'STOP' : 'INCOMPLETE'} (${named.join('; ')})`;
}

/** @param {string} variant @returns {any | null} The tree's `ig-tree.json` as built now; null without one. */
function currentTree(variant) {
  try {
    return readTreeInfo(variant);
  } catch {
    return null;
  }
}

/**
 * The observations of a step, read from its folder and checked against its declared manifest (R2-09, RV3-02). The
 * identity is the one stored in the state, never a fresh one; an observation is never relabelled.
 * @param {string} task
 * @param {string} step
 * @param {string} manifestPath The declared manifest.
 * @param {(variant: string) => boolean} isV4 True when the variant's tree chain contains `v4`.
 * @returns {{ identity: any, rows: Row[], problems: string[] }} `rows` are the manifest's items in order, each joined
 *   with its `item-end` line; `problems` name every way the stored identity or log does not match the manifest, the
 *   frozen source or the current trees.
 */
export function stepEvidence(task, step, manifestPath, isV4) {
  const dir = artifactDir('frozen', task, step);
  const statePath = join(dir, 'state.json');
  const manifestName = rel(resolve(manifestPath));
  /** @type {string[]} */
  const problems = [];
  /** @type {any} */
  let identity = null;
  if (!existsSync(statePath)) {
    problems.push(`no state ${rel(statePath)}`);
  } else {
    try {
      identity = JSON.parse(readFileSync(statePath, 'utf8')).identity ?? null;
    } catch (e) {
      problems.push(`unreadable state ${rel(statePath)}: ${cleanMessage(e)}`);
    }
    if (identity === null && problems.length === 0) {
      problems.push(`the state ${rel(statePath)} has no identity`);
    }
  }
  /** @type {any} */
  let manifest = null;
  /** @type {Item[]} */
  let items = [];
  try {
    manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
    items = expandManifest(manifest, dir, isV4);
  } catch (e) {
    problems.push(`cannot expand the manifest ${manifestName}: ${cleanMessage(e)}`);
  }
  /** @type {any[]} */
  let lines = [];
  try {
    lines = readItemLog(join(dir, 'items.jsonl'));
  } catch (e) {
    problems.push(`unreadable log ${rel(join(dir, 'items.jsonl'))}: ${cleanMessage(e)}`);
  }
  if (identity !== null) {
    if (items.length > 0 && identity.manifestHash !== manifestHash(items)) {
      problems.push(`the manifest hash of the state differs from the declared manifest ${manifestName}`);
    }
    if (identity.frozenCommit !== FROZEN_COMMIT) {
      problems.push(`the frozen commit of the state (${identity.frozenCommit}) is not ${FROZEN_COMMIT}`);
    }
    if (identity.sourceDigest !== FROZEN_DIGEST) {
      problems.push(`the source digest of the state (${identity.sourceDigest}) is not ${FROZEN_DIGEST}`);
    }
    const hash = identityHash(identity);
    for (const [index, line] of lines.entries()) {
      if (line.identityHash !== hash) {
        problems.push(`log line ${index + 1} carries another identityHash than the state's`);
      }
    }
    for (const [variant, treeId] of Object.entries(identity.treeIds ?? {})) {
      const current = currentTree(variant)?.treeId;
      if (current !== treeId) {
        problems.push(`stale tree ${variant} (${treeId} vs ${current ?? 'missing'})`);
      }
    }
  }
  /** @type {Map<string, any>} */
  const ends = new Map();
  for (const line of lines) {
    if (line.type !== 'item-end') {
      continue;
    }
    if (ends.has(line.item)) {
      problems.push(`a second item-end line for ${line.item}`);
    } else {
      ends.set(line.item, line);
    }
  }
  /** @type {Row[]} */
  const rows = [];
  if (items.length > 0) {
    for (const row of manifest.rows) {
      for (const item of expandManifest({ ...manifest, rows: [row] }, dir, isV4)) {
        const end = ends.get(item.id);
        rows.push({
          item: item.id,
          variant: row.variant,
          caseId: row.caseId,
          seedText: row.seedText,
          mode: /** @type {string | undefined} */ (item.payload.mode) ?? null,
          route: /** @type {string | undefined} */ (item.payload.route) ?? null,
          status: end?.status ?? 'missing',
          result: end?.result ?? null,
        });
      }
    }
  }
  return { identity, rows, problems };
}

/**
 * The receipt's evidence: an explicit index of immutable inputs (R4-03), never a tree folder, a variant file or a
 * harness file.
 * @param {string} task
 * @param {string[]} variants The variants whose captured tree copies are listed (the two steps' variants and `instr`).
 * @returns {string[]} Repository-relative paths with `/`, in the order of the receipt.
 */
export function stage1Inputs(task, variants) {
  const inputs = (/** @type {string} */ name) => rel(evidenceDir('frozen', task, 'inputs', name));
  return [
    ...STEPS.map((step) => `tools/ig-proto/plans/${task}.${step}.json`),
    ...STEPS.flatMap((step) => ['state.json', 'items.jsonl'].map((name) => rel(artifactDir('frozen', task, step, name)))),
    rel(evidenceDir('frozen', task, 'identity.json')),
    PM4_RECORD,
    PM4_SCREENS,
    ...selfTestIds(task).map((id) => rel(artifactDir('frozen', id, 'self-test', 'state.json'))),
    inputs('harness.json'),
    ...[...new Set(variants)].sort().map((variant) => inputs(`${variant}.ig-tree.json`)),
  ];
}

/** @param {string} task @returns {string[]} The task ids of the four self-test runs of stage 1. */
const selfTestIds = (task) => SELF_TEST_SUFFIXES.map((suffix) => `${task}${suffix}`);

/** @param {string} path @returns {any} The JSON file at a repository-relative path; null when absent. */
function readJson(path) {
  const text = readRepoFile(path);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw problem(`unreadable ${path}`);
  }
}

/**
 * The source facts of the `source` block.
 * @returns {Promise<{ snapshotOk: boolean, digestEqual: boolean, variants: Record<string, string[]> }>}
 */
async function sourceFacts() {
  const snapshotOk = verifySnapshot().ok;
  /** @type {Record<string, string[]>} */
  const variants = {};
  let digestEqual = false;
  if (snapshotOk) {
    digestEqual = (await sourceDigest()) === FROZEN_DIGEST;
    const sources = collectSources();
    for (const id of listVariants()) {
      /** @type {string[]} */
      const errors = [];
      try {
        planTree(id, { errors, sources });
      } catch (e) {
        errors.push(cleanMessage(e));
      }
      variants[id] = errors;
    }
  }
  return { snapshotOk, digestEqual, variants };
}

/**
 * Copies the mutable metadata the receipt relies on under `inputs/` (R4-03), each only when it is what the
 * observations stored: a tree's `ig-tree.json` when its id equals a stored id, the harness metadata when its hash
 * equals the parity step's. A copy that is not written is a reason, never a relabelled one.
 * @param {string} task
 * @param {{ identity: any }} parity
 * @param {{ identity: any }} replay
 * @param {any} pm4
 * @returns {{ trees: Record<string, { treeId: string, paramsHash: string } | null>, reasons: { pm4: string[], inputs: string[] } }}
 */
function captureInputs(task, parity, replay, pm4) {
  /** @type {Map<string, Set<string>>} */
  const stored = new Map();
  const add = (/** @type {string} */ variant, /** @type {unknown} */ treeId) => {
    if (typeof treeId === 'string') {
      stored.set(variant, new Set([...(stored.get(variant) ?? []), treeId]));
    }
  };
  for (const ev of [parity, replay]) {
    for (const [variant, treeId] of Object.entries(ev.identity?.treeIds ?? {})) {
      add(variant, treeId);
    }
  }
  add('instr', pm4?.meta?.trees?.instr?.treeId);
  /** @type {Record<string, { treeId: string, paramsHash: string } | null>} */
  const trees = {};
  const reasons = { pm4: /** @type {string[]} */ ([]), inputs: /** @type {string[]} */ ([]) };
  for (const [variant, ids] of [...stored].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const current = currentTree(variant);
    const equal = current !== null && ids.has(current.treeId);
    if (equal) {
      writeJson(evidenceDir('frozen', task, 'inputs', `${variant}.ig-tree.json`), current);
      trees[variant] = { treeId: current.treeId, paramsHash: sha256(JSON.stringify(current.params)) };
    } else {
      trees[variant] = null;
      if (variant === 'instr') {
        reasons.pm4.push(`stale tree instr (${[...ids].join(', ')} vs ${current?.treeId ?? 'missing'})`);
      }
    }
    if (ids.size > 1) {
      reasons.inputs.push(`tree ${variant} has more than one stored id (${[...ids].join(', ')})`);
    }
  }
  const harnessHash = parity.identity?.harnessHash;
  if (typeof harnessHash === 'string') {
    const harness = harnessInfo();
    if (harness.harnessHash === harnessHash) {
      writeJson(evidenceDir('frozen', task, 'inputs', 'harness.json'), harness);
    } else {
      reasons.inputs.push('producer changed since the observation');
    }
    if (typeof replay.identity?.harnessHash === 'string' && replay.identity.harnessHash !== harnessHash) {
      reasons.inputs.push(`the replay step was produced by another harness (${replay.identity.harnessHash} vs ${harnessHash})`);
    }
  }
  return { trees, reasons };
}

/** @param {Row} row @returns {string} What a step block's table says about an item beside its status. */
function rowDetail(row) {
  const r = row.result;
  if (r === null || typeof r !== 'object') {
    return '-';
  }
  if (row.item.endsWith(':gen')) {
    return `${r.outcome}, ${r.puzzles ?? 0} puzzles`;
  }
  if (/:puzzle-\d+$/.test(row.item)) {
    return `${r.kind ?? '-'} ${r.status ?? r.outcome}`;
  }
  return r.ledger?.totalWork === undefined ? `${r.outcome}` : `${r.outcome}, total work ${r.ledger.totalWork}`;
}

/**
 * Judges the stage-1 blocks and assembles the receipt (pure: everything is read by the caller).
 * @param {object} d
 * @param {string} d.task
 * @param {{ identity: any, rows: Row[], problems: string[] }} d.parity
 * @param {{ identity: any, rows: Row[], problems: string[] }} d.replay
 * @param {string[]} d.itemIds Every item id of the two expanded manifests.
 * @param {any} d.identityRecord
 * @param {any} d.pm4
 * @param {any} d.screens
 * @param {Record<string, any>} d.selfTests The `state.json` of each self-test task id; null when absent.
 * @param {{ snapshotOk: boolean, digestEqual: boolean, variants: Record<string, string[]> }} d.source
 * @param {ReturnType<typeof captureInputs>} d.captured
 * @param {{ path: string, sha256: string }[]} d.evidence The inputs that exist, with their hashes.
 * @param {string[]} d.missingInputs
 * @param {any} d.meta
 * @returns {{ receipt: Record<string, any>, blocks: Record<string, Block>, line: string }}
 */
export function judgeStage1(d) {
  const { task, parity, replay, captured } = d;
  const stepBlock = (/** @type {typeof parity} */ ev, /** @type {(rows: Row[]) => Verdict} */ verdictOf) => {
    const rows = ev.rows.map((row) => ({ item: row.item, status: row.status, detail: rowDetail(row) }));
    if (ev.problems.length > 0) {
      return block('incomplete', ev.problems, rows);
    }
    const v = verdictOf(ev.rows);
    return block(v.verdict, v.reasons, rows);
  };
  const ids = selfTestIds(task);
  const tests = ids.map((id) => ({ id, ...selfTestVerdict(d.selfTests[id] ?? null) }));
  const testsVerdict = overall(Object.fromEntries(tests.map((t) => [t.id, t])));
  const instrId = captured.trees.instr?.treeId ?? null;
  /** @type {Record<string, Block>} */
  const blocks = {
    source: sourceVerdict(d.source),
    identity: identityVerdict(d.identityRecord, IDENTITY_SEEDS),
    pm4: captured.reasons.pm4.length > 0 ? block('incomplete', captured.reasons.pm4) : pm4Verdict(d.pm4, d.screens, instrId),
    'self-test': block(testsVerdict, tests.flatMap((t) => t.reasons.map((r) => `${t.id}: ${r}`)),
      tests.map((t) => ({ task: t.id, verdict: t.verdict, ...t.rows[0] }))),
    parity: stepBlock(parity, parityVerdict),
    replay: stepBlock(replay, replayVerdict),
  };
  const inputReasons = [...captured.reasons.inputs, ...d.missingInputs.map((path) => `missing input ${path}`)];
  blocks.inputs = block(inputReasons.length === 0 ? 'pass' : 'incomplete', inputReasons,
    d.evidence.map((e) => ({ path: e.path, sha256: e.sha256.slice(0, 12) })));

  const expected = [...d.itemIds, ...STAGE1_COVERAGE_EXTRA];
  const observed = new Set();
  const censored = [];
  for (const row of [...parity.rows, ...replay.rows]) {
    if (row.status === 'completed') {
      observed.add(row.item);
    } else if (row.status === 'censored') {
      censored.push(row.item);
    }
  }
  for (const seed of IDENTITY_SEEDS) {
    const pairs = d.identityRecord?.seeds?.find((/** @type {any} */ s) => s?.seed === seed)?.pairs;
    if (pairs?.['mp12b1~base'] !== undefined && pairs['base~log'] !== undefined) {
      observed.add(`identity:${seed}`);
    }
  }
  if (blocks.pm4.verdict !== 'incomplete') {
    observed.add('pm4');
  }
  for (const id of ids) {
    if (d.selfTests[id]?.done === true) {
      observed.add(`self-test:${id}`);
    }
  }
  const variants = [...new Set([...Object.keys(parity.identity?.treeIds ?? {}), ...Object.keys(replay.identity?.treeIds ?? {})])].sort();
  const arms = variants.map((id) => {
    const treeId = parity.identity?.treeIds?.[id] ?? replay.identity?.treeIds?.[id];
    const copy = captured.trees[id];
    return { id, treeId, paramsHash: copy?.treeId === treeId ? copy.paramsHash : null };
  });
  const line = stage1Verdict(blocks);
  const verdict = overall(blocks);
  const receipt = proofEnvelope({
    kind: 'stage1',
    verdict,
    source: { frozenCommit: FROZEN_COMMIT, sourceDigest: parity.identity?.sourceDigest ?? null },
    harnessHash: parity.identity?.harnessHash ?? null,
    arms,
    coverage: { expected, observed: expected.filter((id) => observed.has(id)), missing: expected.filter((id) => !observed.has(id)), censored },
    evidence: d.evidence,
    fields: { meta: d.meta, blocks, line },
  });
  return { receipt, blocks, line };
}

/** @param {unknown} value @returns {string} A Markdown table cell. */
const cell = (value) => (value === null || value === undefined ? '-' : String(value).replaceAll('|', '\\|'));

/**
 * @param {string} task
 * @param {Record<string, any>} receipt The stage-1 receipt.
 * @returns {string} The Markdown record `stage1.md`.
 */
export function renderStage1(task, receipt) {
  const { blocks, line, coverage } = receipt;
  const lines = [
    `# Stage 1 receipt (${task})`, '', banner(receipt.meta), '', line, '',
    `Receipt verdict \`${receipt.verdict}\`; coverage: ${coverage.expected.length - coverage.missing.length} of ${coverage.expected.length} expected ids observed, `
    + `${coverage.missing.length} missing, ${coverage.censored.length} censored.`, '',
  ];
  for (const [name, b] of /** @type {[string, Block][]} */ (Object.entries(blocks))) {
    lines.push(`## ${name}: ${b.verdict}`, '');
    if (b.rows.length > 0) {
      const columns = Object.keys(b.rows[0]);
      lines.push(`| ${columns.join(' | ')} |`, `|${columns.map(() => '---').join('|')}|`,
        ...b.rows.map((row) => `| ${columns.map((c) => cell(row[c])).join(' | ')} |`), '');
    }
    if (b.reasons.length > 0) {
      lines.push(...b.reasons.map((r) => `- ${r}`), '');
    }
  }
  const findings = /** @type {string[]} */ (blocks.replay.reasons).filter((r) => r.startsWith('finding '));
  lines.push('## Replay findings', '', ...(findings.length === 0 ? ['None.'] : findings.map((f) => `- ${f}`)));
  return lines.join('\n');
}

/**
 * `summary --task <T> --label frozen --source-label <SL>`: judges the stage-1 blocks from the stored observations and
 * writes `stage1.json` and `stage1.md` (and the captured inputs) under `evidence/frozen/<task>/`.
 * @param {string[]} argv The arguments after `summary`.
 * @returns {Promise<number>} 0 when the record was written, whatever its verdict.
 */
async function summary(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'label', 'source-label'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const { task } = args;
  if (task === undefined) {
    return refuse('summary needs --task');
  }
  const isV4 = (/** @type {string} */ variant) => {
    const info = currentTree(variant);
    if (info === null) {
      throw problem(`tree ${variant} is not built`);
    }
    return info.chain.includes('v4');
  };
  const manifests = STEPS.map((step) => abs(`tools/ig-proto/plans/${task}.${step}.json`));
  const [parity, replay] = STEPS.map((step, i) => stepEvidence(task, step, manifests[i], isV4));
  const itemIds = manifests.flatMap((path, i) => {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    return expandManifest(manifest, artifactDir('frozen', task, STEPS[i]), () => false).map((item) => item.id);
  });
  const pm4 = readJson(PM4_RECORD);
  const captured = captureInputs(task, parity, replay, pm4);
  const variants = [...new Set([...parity.rows, ...replay.rows].map((row) => row.variant)), ...Object.keys(captured.trees)];
  const wanted = stage1Inputs(task, [...variants, 'instr']);
  const present = wanted.filter((path) => existsSync(abs(path)));
  const { receipt, blocks, line } = judgeStage1({
    task,
    parity,
    replay,
    itemIds,
    identityRecord: readJson(rel(evidenceDir('frozen', task, 'identity.json'))),
    pm4,
    screens: readJson(PM4_SCREENS),
    selfTests: Object.fromEntries(selfTestIds(task).map((id) => [id, readJson(rel(artifactDir('frozen', id, 'self-test', 'state.json')))])),
    source: await sourceFacts(),
    captured,
    evidence: present.map((path) => ({ path, sha256: sha256File(abs(path)) })),
    missingInputs: wanted.filter((path) => !present.includes(path)),
    meta: await buildMeta({ task, label: 'frozen', kind: 'stage1', sourceLabel: args['source-label'] }),
  });
  writeJson(evidenceDir('frozen', task, 'stage1.json'), receipt);
  writeText(evidenceDir('frozen', task, 'stage1.md'), renderStage1(task, receipt));
  process.stdout.write(`${line}\nv4-check: wrote ${rel(evidenceDir('frozen', task, 'stage1.json'))} (verdict ${receipt.verdict}; ${Object.entries(blocks).map(([name, b]) => `${name} ${b.verdict}`).join(', ')})\n`);
  return 0;
}

/**
 * `pm4-gate --label frozen --source-label <SL>` (RV5-01): the PM4 record against the frozen source, nothing else.
 * @param {string[]} argv The arguments after `pm4-gate`.
 * @returns {Promise<number>} 0 only on `pass`; 2 otherwise; 1 for a refused command.
 */
async function pm4Gate(argv) {
  const { args } = parseArgs(argv, { values: ['label', 'source-label'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const incomplete = (/** @type {string} */ reason) => {
    process.stdout.write(`pm4-gate: incomplete (${reason})\n`);
    return 2;
  };
  /** @type {string} */
  let instrTreeId;
  try {
    if (!verifySnapshot().ok) {
      return incomplete('the frozen source differs from its manifest');
    }
    if ((await sourceDigest()) !== FROZEN_DIGEST) {
      return incomplete('the source digest is not the frozen digest');
    }
    instrTreeId = planTree('instr').treeId;
  } catch (e) {
    return incomplete(cleanMessage(e));
  }
  const { verdict, reasons } = pm4GateEvidence(instrTreeId);
  process.stdout.write(verdict === 'pass' ? 'pm4-gate: pass\n' : `pm4-gate: ${verdict} (${reasons.join('; ')})\n`);
  return verdict === 'pass' ? 0 : 2;
}

/** @param {string} reason @returns {1} */
function refuse(reason) {
  process.stderr.write(`v4-check: ${reason}\n`);
  return 1;
}

/**
 * @param {string[]} argv The arguments after `run`.
 * @returns {Promise<number | Parameters<typeof runItems>[0]>} An exit code after its message, or the options of the run.
 */
async function prepareRun(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'step', 'manifest', 'label', 'source-label', 'horizon-s'] });
  if (args.label !== 'frozen') {
    return refuse('--label frozen only');
  }
  const { task, step, manifest: path } = args;
  if (task === undefined || step === undefined || path === undefined) {
    return refuse('run needs --task, --step and --manifest');
  }
  const horizonS = Number(args['horizon-s'] ?? DEFAULT_HORIZON_S);
  if (!Number.isFinite(horizonS) || horizonS <= 0) {
    return refuse('--horizon-s must be a positive number');
  }
  /** @type {any} */
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch {
    return refuse(`cannot read manifest ${path}`);
  }
  if (manifest?.format !== 'ig-proto-items' || manifest.version !== 1) {
    return refuse(`manifest ${path} is not an ig-proto-items version 1 manifest`);
  }
  if (manifest.task !== task || manifest.step !== step) {
    return refuse(`manifest ${path} is ${manifest.task}/${manifest.step}, not ${task}/${step}`);
  }
  const variants = [...new Set((Array.isArray(manifest.rows) ? manifest.rows : []).map((/** @type {any} */ row) => row?.variant).filter((/** @type {unknown} */ v) => typeof v === 'string'))];
  for (const variant of /** @type {string[]} */ (variants)) {
    await ensureTree(variant);
  }
  const items = expandManifest(manifest, artifactDir('frozen', task, step), (variant) => readTreeInfo(variant).chain.includes('v4'));
  return { task, step, label: 'frozen', horizonS, items };
}

/**
 * @param {string[]} argv `run --task <T> --step <S> --manifest <path> --label frozen --source-label <SL> [--horizon-s <H>]`,
 *   `summary --task <T> --label frozen --source-label <SL>` or `pm4-gate --label frozen --source-label <SL>`
 * @returns {Promise<number>} The exit code: 1 for a refused command or manifest, else the command's (`run`: the runner's, 0, or
 *   3 for a refused resume; `summary`: 0 once the record is written; `pm4-gate`: 0 only on `pass`, else 2).
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'summary' || command === 'pm4-gate') {
    try {
      return await (command === 'summary' ? summary(rest) : pm4Gate(rest));
    } catch (e) {
      return refuse(cleanMessage(e).replace(/^v4-check: /, ''));
    }
  }
  if (command !== 'run') {
    return refuse(`unknown command ${command ?? ''} (run, summary, pm4-gate)`);
  }
  /** @type {Awaited<ReturnType<typeof prepareRun>>} */
  let prepared;
  try {
    prepared = await prepareRun(rest);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return refuse(message.replace(/^v4-check: /, ''));
  }
  if (typeof prepared === 'number') {
    return prepared;
  }
  return (await runItems(prepared)).exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}

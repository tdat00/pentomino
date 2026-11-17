// @ts-check
// Stage-1 checks (task pack v4, V4-T04c; reviews R06, R2-14 and RV3-02; D-V4-14). `run` expands an item manifest
// (tools/ig-proto/plans/V4-T04.*.json) into the bounded items of lib/items.mjs and runs them; the two verdicts judge the
// joined rows of a finished step: parity (observers change nothing) and replay (the prototype's own records replay in
// full). The verdicts and `expandManifest` are pure (apart from the catalogue read of `caseBoard`).
//   node tools\ig-proto\v4-check.mjs run --task V4-T04 --step parity --manifest tools\ig-proto\plans\V4-T04.parity.json
//     --label frozen --source-label "frozen 3fc65f4" [--horizon-s 285]
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { runItems } from './lib/items.mjs';
import { artifactDir, parseArgs } from './lib/paths.mjs';
import { readTreeInfo } from './lib/records.mjs';
import { caseBoard } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';

/**
 * @typedef {import('./lib/items.mjs').Item} Item
 * @typedef {{ item: string, variant: string, caseId: string, seedText: string, mode: string | null,
 *   route: string | null, status: string, result: any }} Row An expanded item joined with its `item-end` line;
 *   `status` is the end line's (`completed`, `censored`, `error`) or `missing` without one.
 * @typedef {{ verdict: 'pass' | 'fail' | 'incomplete', reasons: string[], rows: Row[] }} Verdict
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
 * @param {string[]} argv `run --task <T> --step <S> --manifest <path> --label frozen --source-label <SL> [--horizon-s <H>]`
 * @returns {Promise<number>} The exit code: 1 for a refused command or manifest, else the runner's (0, or 3 for a refused resume).
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  if (command !== 'run') {
    return refuse(`unknown command ${command ?? ''} (run)`);
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

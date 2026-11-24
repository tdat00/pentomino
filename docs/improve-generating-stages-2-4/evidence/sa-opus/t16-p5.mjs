// @ts-check
// SA-Opus, T16 step 3 (stages 2 to 4 pack): N-V4-16, P5's set-attempt bound and its glue on the frozen arms' real
// requests (stage 2 saw none). It reads the raw journals of V4-S4's two bounded arms (fr-frozen, fr-frozen-none) and,
// for information, of V4-S4C's uncapped twins (no budget, no bound, no live deadline), with the published rows:
// - per arm and cell, the set calls (attempts 0-3, started in parallel; the lowest success wins) by their end:
//   in-band (`ok`), `below-to-one`, `above-to-max`, another reason, a budget stop (`end.locate.budgetStop`), or no end
//   line (cancelled when a lower attempt won, or cut);
// - the requests whose attempts 0-3 all ended without a window on the same side (the bound's condition,
//   generation-client.js's igSetBound), the rows whose partialReason is `set:no-window-<side>` (the bound fired), and
//   the glue: a request meeting the condition whose row is not `set:no-window-<side>`, or the reverse;
// - every budget stop of a call by the case's uniqueness mode (`require` calls: none expected, stage 4 runs `any`),
//   and the largest metered spend of a call (`end.locate.spent`) against its level's `any` budget;
// - P5's lost completions of the final record (V4-S4F): the bounded and the uncapped row of each lost pair, and what
//   cut the bounded row.
// Unlocked: it reads records only; it writes its outputs beside itself.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-p5.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const RAW = 'tests/artifacts/ig-proto/frozen';
const PUB = 'docs/improve-generating/evidence/frozen';
const sha256 = (/** @type {string} */ t) => createHash('sha256').update(t, 'utf8').digest('hex');
const lf = (/** @type {string} */ t) => t.replace(/\r\n/g, '\n');
/** @type {{ path: string, sha256Lf: string }[]} */
const published = [];
const readPub = (/** @type {string} */ p) => {
  const text = readFileSync(join(ROOT, p), 'utf8');
  published.push({ path: p, sha256Lf: sha256(lf(text)) });
  return JSON.parse(text);
};
const crlf = (/** @type {string} */ t) => `${t.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;
const s1 = (/** @type {number | null | undefined} */ ms) => (typeof ms === 'number' ? Math.round(ms / 100) / 10 : null);
const g = (/** @type {number} */ u) => Math.round(u / 1e7) / 100;

const boards = readPub('tools/ig-proto/data/boards-v1.json');
/** @type {Map<string, string>} */
const uniquenessOf = new Map(Object.values(boards.cases).map((/** @type {any} */ c) => [c.id, c.uniqueness]));
const fz = readPub(`${PUB}/V4-S3/freeze.json`);
const budgetAny = fz.values.callBudget?.any ?? { nightmare: 10000000000, 'hell-1': 40000000000 };
const final = readPub(`${PUB}/V4-S4F/verdicts.json`);
const manifest = readPub('tools/ig-proto/plans/verdicts/V4-S4F.verdict-manifest.json');

/** @param {any} end @returns {string} */
const endKind = (end) => {
  if (end === undefined) {
    return 'no end';
  }
  if (end.locate?.budgetStop) {
    return 'budget stop';
  }
  if (end.result === 'ok') {
    return 'in-band';
  }
  if (end.result === 'no-window') {
    return String(end.locate?.result);
  }
  return `other: ${end.result}`;
};
/** @param {string} kind @returns {string | null} The no-window side as the worker reports it (ig-select-v4.js:1079). */
const sideOf = (kind) => (kind === 'below-to-one' ? 'below' : kind === 'above-to-max' ? 'above' : null);

/**
 * @param {string} task
 * @param {string} arm
 * @param {boolean} bounded
 */
function readArm(task, arm, bounded) {
  const rawArm = `${RAW}/${task}/${arm}`;
  const pubArm = `${PUB}/${task}/${arm}`;
  /** @type {Map<string, any>} */
  const rowsByKey = new Map();
  for (const name of readdirSync(join(ROOT, pubArm)).filter((n) => n.endsWith('.runs.json')).sort()) {
    for (const row of readPub(`${pubArm}/${name}`).rows) {
      rowsByKey.set(row.rowKey, row);
    }
  }
  /** @type {{ shard: string, files: number, lines: number, sha256: string }[]} */
  const shards = [];
  /** @type {Map<string, { cell: string, pids: Set<string>, set: Map<number, { start: any, end: any }>, calls: { start: any, end: any }[] }>} */
  const requests = new Map();
  for (const shard of readdirSync(join(ROOT, rawArm)).sort()) {
    const logs = join(ROOT, rawArm, shard, 'logs');
    if (!existsSync(logs)) {
      continue;
    }
    const names = readdirSync(logs).filter((n) => n.endsWith('.jsonl') && !n.endsWith('.link.jsonl') && !n.endsWith('.row.jsonl')).sort();
    /** @type {string[]} */
    const digests = [];
    let lines = 0;
    for (const name of names) {
      const text = lf(readFileSync(join(logs, name), 'utf8'));
      digests.push(`${name}\t${sha256(text)}\n`);
      const [rowKey, pid] = name.split('.');
      /** @type {Map<string, { start: any, end: any }>} */
      const calls = new Map();
      for (const line of text.split('\n')) {
        if (line.trim() === '') {
          continue;
        }
        lines += 1;
        const o = JSON.parse(line);
        if (o.t === 'start') {
          calls.set(o.call, { start: o, end: undefined });
        } else if (o.t === 'end' && calls.has(o.call)) {
          const c = /** @type {{ start: any, end: any }} */ (calls.get(o.call));
          c.end = o;
        }
      }
      const req = requests.get(rowKey) ?? { cell: rowKey.split('~')[0], pids: new Set(), set: new Map(), calls: [] };
      req.pids.add(pid);
      for (const c of calls.values()) {
        req.calls.push(c);
        if (c.start.stage === 'set') {
          req.set.set(c.start.attempt, c);
        }
      }
      requests.set(rowKey, req);
    }
    shards.push({ shard, files: names.length, lines, sha256: sha256(digests.join('')) });
  }

  /** @type {Record<string, any>} */
  const cells = {};
  /** @type {any[]} */
  const findings = [];
  /** @type {any[]} */
  const budgetStops = [];
  /** @type {any[]} Calls outside the set stage that ended without a window (the bound does not cover them). */
  const otherNoWindow = [];
  for (const [rowKey, req] of [...requests].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const row = rowsByKey.get(rowKey);
    const uniqueness = uniquenessOf.get(req.cell) ?? 'unknown';
    const c = cells[req.cell] ??= {
      uniqueness, requests: 0, published: 0, multiPid: 0, setCalls: 0, setByEnd: {}, attemptsMax: 0,
      boundCondition: 0, boundFired: 0, glue: 0, budgetStops: 0, maxSpent: 0, maxSpentStage: null, level: null,
    };
    c.requests += 1;
    c.published += row ? 1 : 0;
    c.multiPid += req.pids.size > 1 ? 1 : 0;
    for (const [attempt, call] of req.set) {
      c.setCalls += 1;
      c.attemptsMax = Math.max(c.attemptsMax, Number(attempt) + 1);
      const k = endKind(call.end);
      c.setByEnd[k] = (c.setByEnd[k] ?? 0) + 1;
    }
    for (const call of req.calls) {
      c.level ??= call.start.level;
      if (call.start.stage !== 'set' && call.end?.result === 'no-window') {
        otherNoWindow.push({ rowKey, call: call.start.call, stage: call.start.stage, attempt: call.start.attempt, locate: call.end.locate?.result });
      }
      const spent = call.end?.locate?.spent;
      if (typeof spent === 'number' && spent > c.maxSpent) {
        c.maxSpent = spent;
        c.maxSpentStage = call.start.stage;
      }
      if (call.end?.locate?.budgetStop) {
        c.budgetStops += 1;
        budgetStops.push({ rowKey, call: call.start.call, stage: call.start.stage, uniqueness, budgetStop: call.end.locate.budgetStop, result: call.end.result });
      }
    }
    const firstFour = [0, 1, 2, 3].map((j) => req.set.get(j));
    const sides = firstFour.map((call) => (call === undefined ? null : sideOf(endKind(call.end))));
    const condition = sides.every((s) => s !== null && s === sides[0]) ? /** @type {string} */ (sides[0]) : null;
    const reason = row?.run?.partialReason ?? null;
    const fired = typeof reason === 'string' && reason.startsWith('set:no-window-');
    c.boundCondition += condition !== null ? 1 : 0;
    c.boundFired += fired ? 1 : 0;
    if (bounded && (condition !== null) !== fired) {
      c.glue += 1;
      findings.push({ rowKey, condition, partialReason: reason });
    } else if (bounded && condition !== null && reason !== `set:no-window-${condition}`) {
      c.glue += 1;
      findings.push({ rowKey, condition, partialReason: reason });
    }
  }
  const unjournaled = [...rowsByKey.keys()].filter((k) => !requests.has(k));
  for (const cell of Object.values(cells)) {
    cell.maxSpentG = g(cell.maxSpent);
    cell.budgetAnyG = budgetAny[cell.level] === undefined ? null : g(budgetAny[cell.level]);
    delete cell.maxSpent;
  }
  return { task, arm, bounded, rows: rowsByKey.size, journaledRequests: requests.size, unjournaled, shards, cells, findings, budgetStops, otherNoWindow };
}

const arms = [
  readArm('V4-S4', 'fr-frozen', true),
  readArm('V4-S4', 'fr-frozen-none', true),
  readArm('V4-S4C', 'fr-frozen-uncapped', false),
  readArm('V4-S4C', 'fr-frozen-none-uncapped', false),
];

// P5's lost completions in the final record: each lost pair's two rows and what cut the bounded row.
const deadline = fz.values.deadline;
/** @type {any[]} */
const lost = [];
for (const entry of final.p5.filter((/** @type {any} */ p) => p.lostCompletions > 0)) {
  const pair = manifest.p5.find((/** @type {any} */ p) => p.cell === entry.cell);
  const b = arms.find((a) => a.arm === pair.bounded && a.task === 'V4-S4');
  for (const rep of entry.lostReps) {
    const rowKey = `${entry.cell}~${rep}`;
    const rowOf = (/** @type {string} */ task, /** @type {string} */ arm) => {
      const doc = JSON.parse(readFileSync(join(ROOT, PUB, task, arm, `val-${entry.cell}.runs.json`), 'utf8'));
      return doc.rows.find((/** @type {any} */ r) => r.rowKey === rowKey).run;
    };
    const br = rowOf('V4-S4', pair.bounded);
    const ur = rowOf('V4-S4C', pair.uncapped);
    const lastMs = (/** @type {any} */ r) => (r.igAcceptedMs?.length ? r.igAcceptedMs[r.igAcceptedMs.length - 1] : null);
    const budgetStopsInRow = (b?.budgetStops ?? []).filter((x) => x.rowKey === rowKey).length;
    const cutByDeadline = br.partialReason === 'time-limit' && br.responseMs >= deadline.generationStopMs && budgetStopsInRow === 0
      && ur.tenthReadyMs > deadline.generationStopMs;
    lost.push({
      cell: entry.cell, rep, bounded: pair.bounded, uncapped: pair.uncapped,
      boundedRow: { acceptedCount: br.acceptedCount, partialReason: br.partialReason, responseS: s1(br.responseMs), igSetS: s1(br.igSetMs), lastAcceptedS: s1(lastMs(br)) },
      uncappedRow: { acceptedCount: ur.acceptedCount, partialReason: ur.partialReason, responseS: s1(ur.responseMs), igSetS: s1(ur.igSetMs), t10S: s1(ur.tenthReadyMs) },
      budgetStopsInBoundedRow: budgetStopsInRow,
      uncappedT10AboveResponseBound: ur.tenthReadyMs > deadline.responseBoundMs,
      cause: cutByDeadline ? 'the live deadline\'s 115-s generation stop (the uncapped twin reached ten after 115 s)' : 'not the deadline alone: read the rows',
    });
  }
}

const summary = arms.map((a) => {
  const t = Object.values(a.cells).reduce((acc, c) => {
    acc.requests += c.requests;
    acc.setCalls += c.setCalls;
    for (const [k, n] of Object.entries(c.setByEnd)) {
      acc.setByEnd[k] = (acc.setByEnd[k] ?? 0) + n;
    }
    acc.boundCondition += c.boundCondition;
    acc.boundFired += c.boundFired;
    acc.glue += c.glue;
    acc.budgetStops += c.budgetStops;
    acc.multiPid += c.multiPid;
    acc.uniqueness[c.uniqueness] = (acc.uniqueness[c.uniqueness] ?? 0) + 1;
    return acc;
  }, { requests: 0, setCalls: 0, setByEnd: /** @type {Record<string, number>} */ ({}), boundCondition: 0, boundFired: 0, glue: 0, budgetStops: 0, multiPid: 0, uniqueness: /** @type {Record<string, number>} */ ({}) });
  return { task: a.task, arm: a.arm, bounded: a.bounded, rows: a.rows, journaledRequests: a.journaledRequests, unjournaled: a.unjournaled.length, shards: a.shards.length, ...t, otherNoWindow: a.otherNoWindow };
});
const result = {
  script: `${HERE}/t16-p5.mjs`, budgetAny, deadline, summary, lost,
  arms: arms.map((a) => ({ task: a.task, arm: a.arm, cells: a.cells, findings: a.findings, budgetStops: a.budgetStops, unjournaled: a.unjournaled })),
  inputs: {
    published: { entries: published.length, sha256Lf: sha256(JSON.stringify(published)) },
    journals: arms.map((a) => ({ task: a.task, arm: a.arm, shards: a.shards })),
  },
};
writeFileSync(join(ROOT, HERE, 't16-p5.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');

const kinds = ['in-band', 'below-to-one', 'above-to-max', 'budget stop', 'no end'];
const md = [
  '# T16: N-V4-16, P5\'s bound and glue on the frozen arms (V4-S4 bounded, V4-S4C uncapped for information)',
  '',
  '| Task, arm | Rows | Journaled requests | Set calls | In-band | below-to-one | above-to-max | Budget stop | No end line | Other | Bound condition | `set:no-window-*` rows | Glue mismatches | Budget stops (all calls) | Cases by mode |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
  ...summary.map((s) => {
    const other = Object.entries(s.setByEnd).filter(([k]) => !kinds.includes(k)).reduce((n, [, v]) => n + v, 0);
    return `| ${s.task} ${s.arm} | ${s.rows} | ${s.journaledRequests} | ${s.setCalls} | ${kinds.map((k) => s.setByEnd[k] ?? 0).join(' | ')} | ${other} | ${s.boundCondition} | ${s.boundFired} | ${s.bounded ? s.glue : 'n/a'} | ${s.budgetStops} | ${Object.entries(s.uniqueness).map(([k, n]) => `${k} ${n}`).join(', ')} |`;
  }),
  '',
  '## Per cell (set calls in-band / below-to-one / above-to-max / no end line; the largest metered call against the level\'s `any` budget)',
  '',
  '| Task, arm | Cell | Requests | Set calls | In-band / below / above / no end | Largest call (G units) | Budget (G units) |',
  '|---|---|---:|---:|---|---:|---:|',
  ...arms.flatMap((a) => Object.entries(a.cells).map(([cell, c]) => `| ${a.task} ${a.arm} | ${cell} | ${c.requests} | ${c.setCalls} | ${['in-band', 'below-to-one', 'above-to-max', 'no end'].map((k) => c.setByEnd[k] ?? 0).join(' / ')} | ${c.maxSpentG} (${c.maxSpentStage}) | ${c.budgetAnyG ?? 'none'} |`)),
  '',
  '## P5\'s lost completions (V4-S4F) and what cut the bounded row',
  '',
  '| Cell, rep | Bounded arm: accepted, reason, response, set stage | Uncapped twin: accepted, T10, response | Budget stops in the bounded row | Cause |',
  '|---|---|---|---:|---|',
  ...lost.map((l) => `| ${l.cell} ${l.rep} | ${l.bounded}: ${l.boundedRow.acceptedCount}, ${l.boundedRow.partialReason}, ${l.boundedRow.responseS} s, ${l.boundedRow.igSetS} s | ${l.uncapped}: ${l.uncappedRow.acceptedCount}, ${l.uncappedRow.t10S} s, ${l.uncappedRow.responseS} s | ${l.budgetStopsInBoundedRow} | ${l.cause} |`),
  '',
  '## Calls outside the set stage that ended without a window (the bound does not cover them)',
  '',
  ...summary.flatMap((s) => (s.otherNoWindow.length === 0 ? [`- ${s.task} ${s.arm}: none.`]
    : s.otherNoWindow.map((x) => `- ${s.task} ${s.arm}: ${x.rowKey}, call ${x.call}, stage ${x.stage} ${x.attempt}, ${x.locate}.`))),
].join('\n');
writeFileSync(join(ROOT, HERE, 't16-p5.md'), crlf(md), 'utf8');
process.stdout.write(`t16-p5: ${published.length} published files (sha256 of the index ${result.inputs.published.sha256Lf}); journals ${arms.map((a) => `${a.arm} ${a.shards.length} shards (sha256 of the shard digests ${sha256(JSON.stringify(a.shards))})`).join(', ')}\n`);
for (const s of summary) {
  process.stdout.write(`  ${s.task} ${s.arm}: ${JSON.stringify(s)}\n`);
}
for (const a of arms) {
  for (const f of a.findings) {
    process.stdout.write(`  finding ${a.arm}: ${JSON.stringify(f)}\n`);
  }
  for (const b of a.budgetStops) {
    process.stdout.write(`  budget stop ${a.arm}: ${JSON.stringify(b)}\n`);
  }
}
for (const l of lost) {
  process.stdout.write(`  lost ${JSON.stringify(l)}\n`);
}

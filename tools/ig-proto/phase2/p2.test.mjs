// @ts-check
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { rectRows } from '../../bench/calibration-reference.js';
import { sha256Hex } from './binding.mjs';
import { buildSeal, checkReadout, checkSeal, COPIES, STAGE_MAP } from './p2.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const P2 = join(HERE, 'p2.mjs');
const RUN_GROUP = join(HERE, 'run-group.ps1');
const FAKE = join(HERE, 'fixtures', 'fake-invoker.ps1');
const RUN = join(REPO, 'tests', 'artifacts', 'ig-proto', 'phase2', 'self-test', `p2-${Date.now()}`);
const AUDIT = JSON.parse(readFileSync(join(REPO, 'docs', 'improve-generating-phase-2', 'evidence', 'sa-astra', 'round1-cross-audit.json'), 'utf8'));

after(() => {
  rmSync(RUN, { recursive: true, force: true });
});

/** @param {string} name @returns {string} A new state folder. */
function state(name) {
  const dir = join(RUN, name);
  mkdirSync(join(dir, 'E', 'ledger'), { recursive: true });
  mkdirSync(join(dir, 'RAW', 'rows'), { recursive: true });
  return dir;
}

/** @param {string[]} args @returns {{ status: number | null, out: string }} */
function p2(args) {
  const r = spawnSync(process.execPath, [P2, ...args], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

/** Writes ledger lines (C7 fields that the admission reads). @param {string} dir @param {object[]} lines */
function ledger(dir, lines) {
  writeFileSync(join(dir, 'E', 'ledger', 'ledger.jsonl'), lines.map((l) => `${JSON.stringify(l)}\r\n`).join(''));
}

/** @param {string} stage @param {number} countedSeconds @param {string} [id] */
const spent = (stage, countedSeconds, id = `${stage}-1.1`) => ({ id, stage, group: 1, countedSeconds });

/** A passing stage-A readout and its inputs in a state folder. @param {string} dir */
function passingReadout(dir) {
  mkdirSync(join(dir, 'E', 'seal'), { recursive: true });
  mkdirSync(join(dir, 'E', 'report-A'), { recursive: true });
  writeFileSync(join(dir, 'E', 'seal', 'seal.json'), '{"seal":1}\r\n');
  writeFileSync(join(dir, 'E', 'report-A', 'report.json'), '{"gates":[{"gate":"A4","status":"pass"}]}\r\n');
  const seal = sha256Hex(readFileSync(join(dir, 'E', 'seal', 'seal.json')));
  const report = sha256Hex(readFileSync(join(dir, 'E', 'report-A', 'report.json')));
  writeFileSync(join(dir, 'stage-a-readout.md'), [
    `Seal: ${seal}`, `Report A: ${report}`, 'Accepted by SA-Opus: 2026-11-26 10:00 +07:00', 'Accepted by SA-Astra: 2026-11-26 10:05 +07:00', 'Stage B: PROCEED', '',
  ].join('\r\n'));
  writeFileSync(join(dir, 'stage-a-readout.committed'), '');
}

describe('the plan', () => {
  /** @type {any} */
  let plan;
  /** @type {string} */
  let out;

  before(() => {
    out = join(RUN, 'plan');
    const r = p2(['plan', '--out', out]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^plan: [0-9a-f]{64} \(1013 rows\)/);
    plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  });

  it('the plan keeps the approved schedule', () => {
    assert.equal(plan.rows.length, 1013);
    const a = plan.rows.filter((/** @type {any} */ r) => r.stage === 'A');
    const b = plan.rows.filter((/** @type {any} */ r) => r.stage === 'B');
    assert.equal(a.length, 318);
    assert.equal(b.length, 695);
    assert.deepEqual([...new Set(a.map((/** @type {any} */ r) => r.group))].sort((x, y) => x - y), Array.from({ length: 23 }, (_, i) => i + 1));
    assert.deepEqual([...new Set(b.map((/** @type {any} */ r) => r.group))].sort((x, y) => x - y), Array.from({ length: 26 }, (_, i) => i + 1));
    const first = plan.groups.find((/** @type {any} */ g) => g.stage === 'A' && g.group === 1);
    assert.deepEqual(first.keys, AUDIT.stages.A.schedule[0].keys);
    assert.deepEqual(first.keys.slice(0, 8).map((/** @type {string} */ k) => k.split('/')[0]), Array(8).fill('smoke'));
    assert.deepEqual(first.keys.slice(8).map((/** @type {string} */ k) => k.split('/')[0]), ['require', 'require', 'require']);
    assert.equal(plan.groups.length, 49);
    assert.equal(Math.min(...plan.rows.map((/** @type {any} */ r) => r.group)), 1);
    assert.equal(plan.rows.filter((/** @type {any} */ r) => r.open).length, 5);
    assert.ok(plan.rows.filter((/** @type {any} */ r) => r.open).every((/** @type {any} */ r) => !('levelId' in r) && !('boardRows' in r) && !('variant' in r)));
    assert.match(readFileSync(join(out, 'plan.md'), 'utf8'), /^# Phase-2 plan\r\n/);
  });

  it('variants and boards', () => {
    const row = (/** @type {string} */ key) => plan.rows.find((/** @type {any} */ r) => r.key === key);
    assert.equal(row('require/gen-v4/22x22-hell-1/0').variant, 'p2-gen4-diag');
    assert.equal(row('require/uncapped/22x22-hell-1/0').variant, 'p2-uncapped-diag');
    assert.equal(row('require/today/22x22-nightmare/0').variant, 'p2-today');
    assert.equal(row('require/today/22x22-nightmare/0').source, 'today');
    const noScreen = plan.rows.find((/** @type {any} */ r) => r.arm === 'no-screen');
    assert.equal(noScreen.variant, 'p2-none');
    assert.equal(noScreen.source, 'gen-v4');
    assert.equal(row('require/gen-v4/22x22-hell-1/0').levelId, 'hell-1');
    assert.equal(row('require/gen-v4/22x22-hell-1/0').fileKey, 'require~gen-v4~22x22-hell-1~0');
    const catalogue = plan.rows.find((/** @type {any} */ r) => r.cell === '15x15b10-nightmare');
    const boards = JSON.parse(readFileSync(join(REPO, 'tools', 'ig-proto', 'data', 'boards-v1.json'), 'utf8'));
    assert.deepEqual(catalogue.boardRows, boards.cases['15x15b10-nightmare'].boardRows);
    const rect = plan.rows.find((/** @type {any} */ r) => r.cell === '11x11-nightmare');
    assert.deepEqual(rect.boardRows, rectRows(11, 11));
    assert.equal(rect.maxActive, 676);
    assert.equal(rect.uniqueness, 'any');
    assert.equal(rect.quantity, 10);
    assert.equal(row('require/gen-v4/22x22-hell-1/0').uniqueness, 'require');
    assert.equal(row('require/gen-v4/22x22-hell-1/0').maxActive, 484);
  });

  it('the plan is write-once', () => {
    const again = p2(['plan', '--out', out]);
    assert.equal(again.status, 0, again.out);
    const dir = join(RUN, 'plan-once');
    assert.equal(p2(['plan', '--out', dir]).status, 0);
    const file = join(dir, 'plan.json');
    writeFileSync(file, readFileSync(file, 'utf8').replace('"version": 1', '"version": 2'));
    assert.equal(p2(['plan', '--out', dir]).status, 3);
  });
});

describe('the ledger', () => {
  it('the ledger refuses what could pass the stage', () => {
    const dir = state('refuse');
    ledger(dir, [spent('A', 24000)]);
    const r = p2(['ledger', '--check', '--stage', 'A', '--limit', '900', '--state', dir]);
    assert.equal(r.status, 4);
    assert.match(r.out, /ledger: refused/);
    ledger(dir, [spent('A', 23655)]);
    assert.equal(p2(['ledger', '--check', '--stage', 'A', '--limit', '900', '--state', dir]).status, 0);
    ledger(dir, [spent('A', 23656)]);
    assert.equal(p2(['ledger', '--check', '--stage', 'A', '--limit', '900', '--state', dir]).status, 4);
    assert.deepEqual(STAGE_MAP, { A: 410, B: 402 });
  });

  it('nothing is borrowed between stages', () => {
    const dir = state('borrow');
    passingReadout(dir);
    ledger(dir, [spent('A', 10)]);
    const open = p2(['ledger', '--check', '--stage', 'B', '--limit', '900', '--state', dir]);
    assert.equal(open.status, 0, open.out);
    ledger(dir, [spent('A', 10), spent('B', 24000, 'B-1.2')]);
    const r = p2(['ledger', '--check', '--stage', 'B', '--limit', '900', '--state', dir]);
    assert.equal(r.status, 4);
    assert.match(r.out, /exceeds 24120/);
  });

  it('stage B is refused without the readout', () => {
    const dir = state('no-readout');
    const r = p2(['ledger', '--check', '--stage', 'B', '--limit', '900', '--state', dir]);
    assert.equal(r.status, 4);
    assert.match(r.out, /readout is missing/);
  });

  it('a reservation blocks a second invocation', () => {
    const dir = state('reserve');
    const first = p2(['reserve', '--stage', 'A', '--group', '2', '--limit', '900', '--state', dir]);
    assert.equal(first.status, 0, first.out);
    assert.equal(first.out.trim(), 'A-2.1');
    assert.equal(p2(['reserve', '--stage', 'A', '--group', '3', '--limit', '900', '--state', dir]).status, 4);
    assert.equal(p2(['ledger', '--check', '--stage', 'A', '--limit', '900', '--state', dir]).status, 4);
    assert.equal(p2(['release', '--id', 'A-2.1', '--state', dir]).status, 5);
  });

  it('reservation ids name rows, items and overflow groups', () => {
    const dir = state('ids');
    const pending = join(dir, 'RAW', 'pending.json');
    assert.equal(p2(['reserve', '--stage', 'B', '--item', 'replay', '--limit', '533', '--state', dir]).out.trim(), 'B-replay.1');
    rmSync(pending);
    assert.equal(p2(['reserve', '--stage', 'B', '--overflow-group', '2', '--limit', '900', '--state', dir]).out.trim(), 'B-o2.1');
    rmSync(pending);
    assert.equal(p2(['reserve', '--stage', 'A', '--overflow-group', '2', '--limit', '900', '--state', dir]).status, 2);
  });

  it('append validates a line and release needs its ledger line', () => {
    const dir = state('append');
    const line = { id: 'A-2.1', stage: 'A', group: 2, start: '2026-11-26T10:00:00.000+07:00', end: '2026-11-26T10:01:00.000+07:00', nodeSeconds: 12.5, quietS: 45, countedSeconds: 57.5, limitS: 900, killed: false, exit: 0, rowsWritten: 0, cause: 'ok' };
    const file = join(dir, 'E', 'ledger', 'ledger.jsonl');
    const { id: _id, ...noId } = line;
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify(noId), '--state', dir]).status, 5);
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify({ ...line, countedSeconds: 50 }), '--state', dir]).status, 5);
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify({ ...line, extra: 1 }), '--state', dir]).status, 5);
    assert.equal(existsSync(file), false);
    p2(['reserve', '--stage', 'A', '--group', '2', '--limit', '900', '--state', dir]);
    assert.equal(p2(['release', '--id', 'A-2.1', '--state', dir]).status, 5);
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify(line), '--state', dir]).status, 0);
    const before = readFileSync(file, 'utf8');
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify(line), '--state', dir]).status, 5);
    assert.equal(readFileSync(file, 'utf8'), before);
    assert.equal(p2(['release', '--id', 'A-2.1', '--state', dir]).status, 0);
    assert.match(p2(['ledger', '--status', '--state', dir]).out, /^A spent 57\.500 s \(0\.958 min\) authorization 24600\.000 s \(410\.000 min\)/);
  });
});

describe('the readout gate', () => {
  const good = {
    text: ['Seal: s1', 'Report A: r1', 'Accepted by SA-Opus: 2026-11-26 10:00 +07:00', 'Accepted by SA-Astra: 2026-11-26 10:05 +07:00', 'Stage B: PROCEED', ''].join('\r\n'),
    committed: true,
    sealSha256: 's1',
    reportSha256: 'r1',
    reportGates: [{ gate: 'A4', status: 'pass' }],
  };

  it('the readout gate refuses B', () => {
    const lines = good.text.split('\r\n');
    const without = (/** @type {number} */ i) => [...lines.slice(0, i), ...lines.slice(i + 1)].join('\r\n');
    const cases = [
      { ...good, text: null },
      { ...good, committed: false },
      { ...good, sealSha256: 'other' },
      { ...good, reportSha256: 'other' },
      { ...good, text: without(3) },
      { ...good, text: good.text.replace('10:05 +07:00', '10:05 +00:00') },
      { ...good, text: good.text.replace('PROCEED', 'STOP') },
      { ...good, reportGates: [{ gate: 'A4', status: 'fail' }] },
      { ...good, reportGates: [{ gate: 'A5', status: 'incomplete' }] },
      { ...good, reportGates: [{ gate: 'A4', status: 'fail' }], text: `${good.text}Owner continuation: abc\r\n` },
      { ...good, reportGates: null },
    ];
    for (const c of cases) {
      const r = checkReadout(/** @type {any} */ (c));
      assert.equal(r.ok, false, JSON.stringify(c));
      assert.notEqual(r.why, '');
    }
  });

  it('the readout gate admits B', () => {
    assert.equal(checkReadout(good).ok, true);
    const failed = { ...good, reportGates: [{ gate: 'A4', status: 'fail' }], text: `${good.text}Owner continuation: 1575100035077771386\r\n` };
    assert.equal(checkReadout(failed).ok, true);
  });
});

/**
 * The wrapper through a fresh PowerShell, with the fake invoker. `pwsh -Command "& script"` reports exit 1 for a script's
 * `exit 7`, so a case that needs the script's own code passes `tail` `; exit $LASTEXITCODE`.
 * @param {string} dir @param {string} mode @param {string} [extra] @param {string} [tail]
 */
function wrapper(dir, mode, extra = '', tail = '') {
  const marker = join(dir, 'marker.txt');
  const r = spawnSync('pwsh', ['-NoProfile', '-Command', `& '${RUN_GROUP}' -Stage A -Group 2 -State '${dir}' -InvokerScript '${FAKE}'${extra}${tail}`], {
    encoding: 'utf8',
    env: { ...process.env, P2_FAKE_MODE: mode, P2_FAKE_MARKER: marker },
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}`, marker: existsSync(marker) };
}

/** @param {string} dir @returns {any[]} */
const ledgerOf = (dir) => {
  const file = join(dir, 'E', 'ledger', 'ledger.jsonl');
  return existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
};

describe('the locked wrapper', () => {
  it('the wrapper charges a successful invocation', () => {
    const dir = state('w-ok');
    const r = wrapper(dir, 'ok');
    assert.equal(r.status, 0, r.out);
    const lines = ledgerOf(dir);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].id, 'A-2.1');
    assert.equal(lines[0].nodeSeconds, 12.5);
    assert.equal(lines[0].countedSeconds, 57.5);
    assert.equal(lines[0].cause, 'ok');
    assert.equal(lines[0].killed, false);
    assert.equal(existsSync(join(dir, 'RAW', 'pending.json')), false);
    assert.match(r.out, /RG: A-2\.1 ok/);
  });

  it('the wrapper charges a failed invocation and rethrows', () => {
    const dir = state('w-exit1');
    const r = wrapper(dir, 'exit1');
    assert.notEqual(r.status, 0);
    const lines = ledgerOf(dir);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].exit, 1);
    assert.equal(lines[0].cause, 'exit');
    assert.equal(existsSync(join(dir, 'RAW', 'pending.json')), false);
    assert.match(r.out, /command failed: 1/);
  });

  it('the wrapper charges a timeout at its limit', () => {
    const dir = state('w-timeout');
    const r = wrapper(dir, 'timeout');
    assert.notEqual(r.status, 0);
    const lines = ledgerOf(dir);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].nodeSeconds, 900);
    assert.equal(lines[0].countedSeconds, 945);
    assert.equal(lines[0].killed, true);
    assert.equal(lines[0].cause, 'timeout');
  });

  it('an unknown failure is an accounting stop', () => {
    const dir = state('w-noslot');
    const r = wrapper(dir, 'noslot');
    assert.notEqual(r.status, 0);
    assert.equal(ledgerOf(dir).length, 0);
    assert.equal(existsSync(join(dir, 'RAW', 'pending.json')), true);
    assert.match(r.out, /STOP: accounting/);
  });

  it('a duplicate reservation refuses before invoking', () => {
    const dir = state('w-dup');
    writeFileSync(join(dir, 'RAW', 'pending.json'), '{"id":"A-9.1"}\r\n');
    const r = wrapper(dir, 'ok');
    assert.notEqual(r.status, 0);
    assert.equal(r.marker, false);
    assert.equal(ledgerOf(dir).length, 0);
    assert.match(r.out, /STOP: ledger refused/);
  });

  it('deferred keys exit 7 after charging', () => {
    const dir = state('w-deferred');
    const r = wrapper(dir, 'deferred', '', '; exit $LASTEXITCODE');
    assert.equal(r.status, 7, r.out);
    const lines = ledgerOf(dir);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].exit, 7);
    assert.match(r.out, /deferred keys remain/);
  });

  it('rowsWritten joins terminals to their start', () => {
    const dir = state('w-rows');
    writeFileSync(join(dir, 'RAW', 'rows', 'A.status.jsonl'), [
      { t: 'start', key: 'k1', group: 2, invocation: 'A-2.1' },
      { t: 'done', key: 'k1' },
      { t: 'start', key: 'k3', group: 2, invocation: 'A-2.1' },
    ].map((l) => `${JSON.stringify(l)}\r\n`).join(''));
    assert.equal(wrapper(dir, 'ok').status, 0);
    assert.equal(ledgerOf(dir)[0].rowsWritten, 1);
  });

  it('a recovered terminal keeps its original invocation', () => {
    const dir = state('w-recovered');
    const first = { id: 'A-2.1', stage: 'A', group: 2, start: '2026-11-26T10:00:00.000+07:00', end: '2026-11-26T10:01:00.000+07:00', nodeSeconds: 12.5, quietS: 45, countedSeconds: 57.5, limitS: 900, killed: false, exit: 0, rowsWritten: 0, cause: 'ok' };
    const status = join(dir, 'RAW', 'rows', 'A.status.jsonl');
    writeFileSync(status, `${JSON.stringify({ t: 'start', key: 'k2', group: 2, invocation: 'A-2.1' })}\r\n`);
    ledger(dir, [first]);
    const before = readFileSync(join(dir, 'E', 'ledger', 'ledger.jsonl'), 'utf8');
    writeFileSync(status, `${readFileSync(status, 'utf8')}${JSON.stringify({ t: 'done', key: 'k2' })}\r\n`);
    assert.equal(wrapper(dir, 'ok').status, 0);
    const lines = ledgerOf(dir);
    assert.equal(lines[1].id, 'A-2.2');
    assert.equal(lines[1].rowsWritten, 0);
    assert.equal(readFileSync(join(dir, 'E', 'ledger', 'ledger.jsonl'), 'utf8').startsWith(before), true);
  });

  it("an item's node arguments are passed unchanged", () => {
    const dir = state('w-item');
    const marker = join(dir, 'marker.txt');
    const r = spawnSync('pwsh', ['-NoProfile', '-Command', `& '${RUN_GROUP}' -Stage A -Item smoke -LimitSeconds 60 -NodeArgs @('-e','0') -State '${dir}' -InvokerScript '${FAKE}'`], {
      encoding: 'utf8',
      env: { ...process.env, P2_FAKE_MODE: 'ok', P2_FAKE_MARKER: marker },
    });
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
    assert.equal(readFileSync(marker, 'utf8'), '-e 0');
    const lines = ledgerOf(dir);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].item, 'smoke');
  });

  it('there is no authorization parameter', () => {
    const dir = state('w-auth');
    const r = wrapper(dir, 'ok', ' -Authorization 410');
    assert.notEqual(r.status, 0);
    assert.equal(r.marker, false);
    assert.equal(ledgerOf(dir).length, 0);
  });
});

describe('the seal', () => {
  const DIGEST_MODULE = 'export async function computeSourceDigest(read) { return `d:${await read(\'a.txt\')}`; }\n';

  /** @param {string} dir @param {string} text */
  function stub(dir, text) {
    mkdirSync(join(dir, 'tools', 'bench'), { recursive: true });
    writeFileSync(join(dir, 'tools', 'bench', 'report.js'), DIGEST_MODULE);
    writeFileSync(join(dir, 'a.txt'), text);
  }

  /** Builds a synthetic root, copies and today worktree. @param {string} name */
  function world(name) {
    const dir = state(name);
    const root = join(dir, 'repo');
    const today = join(dir, 'today');
    stub(root, 'prod\n');
    stub(today, 'today\n');
    mkdirSync(join(root, 'tools', 'ig-proto', 'phase2'), { recursive: true });
    writeFileSync(join(root, 'tools', 'ig-proto', 'phase2', 'x.mjs'), 'export const x = 1;\r\n');
    mkdirSync(join(root, 'inputs'), { recursive: true });
    writeFileSync(join(root, 'inputs', 'one.json'), '{}\r\n');
    writeFileSync(join(root, 'plan.json'), '{"rows":[]}\r\n');
    for (const [source, ids] of Object.entries(COPIES)) {
      for (const id of ids) {
        const tree = join(dir, 'RAW', 'trees', source, id);
        stub(tree, `${id}\n`);
        writeFileSync(join(tree, 'ig-tree.json'), JSON.stringify({ treeId: `t-${id}`, copyDigest: `d:${id}\n` }));
        writeFileSync(join(tree, 'p2-copy.json'), JSON.stringify({
          format: 'p2-copy', version: 1, id, source, root: 'r', rehearsal: false, inputDigest: 'i', treeId: `t-${id}`, copyDigest: `d:${id}\n`, chain: [], params: {},
        }));
      }
    }
    const gitState = { head: 'c0ffee', status: '', todayHead: '6b94ffb1234', todayStatus: '' };
    const gitRun = (/** @type {string} */ cwd, /** @type {string[]} */ args) => {
      const isToday = cwd === today;
      if (args[0] === 'rev-parse') return isToday ? gitState.todayHead : gitState.head;
      return isToday ? gitState.todayStatus : gitState.status;
    };
    const o = { commit: 'c0ffee', todayRoot: today, planFile: join(root, 'plan.json'), paths: { E: join(dir, 'E'), RAW: join(dir, 'RAW'), readout: '', state: dir }, root, gitRun, inputs: ['inputs/'] };
    return { dir, root, today, gitState, o };
  }

  it('seals the sources, copies, today worktree, tools and inputs, and checks them', async () => {
    const w = world('seal-ok');
    const seal = await buildSeal(w.o);
    assert.equal(seal.format, 'p2-seal');
    assert.equal(seal.copies.length, 6);
    assert.ok(seal.copies.every((/** @type {any} */ c) => c.verified === true));
    assert.deepEqual(seal.tools.map((/** @type {any} */ t) => t.path), ['tools/ig-proto/phase2/x.mjs']);
    assert.deepEqual(seal.inputs.map((/** @type {any} */ t) => t.path), ['inputs/one.json']);
    assert.equal(seal.sourceDigest, 'd:prod\n');
    assert.equal(seal.plan.path, 'plan.json');
    const { paths, root, gitRun, inputs } = w.o;
    assert.equal(await checkSeal({ seal, paths, root, gitRun, inputs }), null);
    w.gitState.head = 'other';
    assert.equal(await checkSeal({ seal, paths, root, gitRun, inputs }), null, 'a later commit is allowed');
    assert.match(String(await checkSeal({ seal: { ...seal, node: 'v0.0.0' }, paths, root, gitRun, inputs })), /^drift node/);
  });

  it('refuses what the creation requires', async () => {
    const w = world('seal-refuse');
    w.gitState.head = 'other';
    await assert.rejects(buildSeal(w.o), /HEAD is not c0ffee/);
    w.gitState.head = 'c0ffee';
    w.gitState.status = ' M a.txt';
    await assert.rejects(buildSeal(w.o), /tracked worktree is not clean/);
    w.gitState.status = '';
    w.gitState.todayHead = 'abcdef0';
    await assert.rejects(buildSeal(w.o), /today worktree is not at 6b94ffb/);
    w.gitState.todayHead = '6b94ffb1234';
    w.gitState.todayStatus = '?? x';
    await assert.rejects(buildSeal(w.o), /today worktree is not clean/);
    w.gitState.todayStatus = '';
    await assert.rejects(buildSeal({ ...w.o, inputs: ['inputs/', 'missing/file.json'] }), /sealed input is missing/);
    rmSync(join(w.dir, 'RAW', 'trees', 'today', 'p2-today'), { recursive: true });
    await assert.rejects(buildSeal(w.o), /copy is missing: today\/p2-today/);
  });

  it('drift exits with the field and the path', async () => {
    const w = world('seal-drift');
    const seal = await buildSeal(w.o);
    const { paths, root, gitRun, inputs } = w.o;
    const check = () => checkSeal({ seal, paths, root, gitRun, inputs });
    writeFileSync(join(w.root, 'inputs', 'one.json'), '{"a":1}\r\n');
    assert.equal(await check(), 'drift inputs inputs/one.json');
    writeFileSync(join(w.root, 'inputs', 'one.json'), '{}\r\n');
    writeFileSync(join(w.root, 'tools', 'ig-proto', 'phase2', 'y.mjs'), '\r\n');
    assert.equal(await check(), 'drift tools tools/ig-proto/phase2/y.mjs');
    rmSync(join(w.root, 'tools', 'ig-proto', 'phase2', 'y.mjs'));
    writeFileSync(join(w.root, 'a.txt'), 'changed\n');
    assert.equal(await check(), 'drift sourceDigest repository');
    writeFileSync(join(w.root, 'a.txt'), 'prod\n');
    writeFileSync(join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-none', 'a.txt'), 'edited\n');
    assert.equal(await check(), 'drift copy gen-v4/p2-none');
    writeFileSync(join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-none', 'a.txt'), 'p2-none\n');
    w.gitState.todayStatus = ' M a.txt';
    assert.match(String(await check()), /^drift today /);
  });
});

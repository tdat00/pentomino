// @ts-check
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { matrixDigest, rectRows } from '../../bench/calibration-reference.js';
import { newRunRecord, SOURCE_FILES } from '../../bench/report.js';
import { BROWSER_CHECKS, BROWSER_GENERATOR_SOURCES, BROWSER_PAGE, REPLAY_ITEMS, rowMatrix, sha256Hex, verifyRow } from './binding.mjs';
import { cohorts, equality, memory, oracleOf, smokeGate, stageGates } from './gates.mjs';
import { buildPlan, buildSeal, checkReadout, checkSeal, COPIES, loadSnapshot, pathsOf, rowContextOf, runGroup, STAGE_MAP } from './p2.mjs';

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

/** The fake active seal of a state folder (C13): the commit and the copies that `verifyRow` reads. @param {string} dir @param {object[]} [copies] */
function fakeSeal(dir, copies = []) {
  mkdirSync(join(dir, 'E', 'seal'), { recursive: true });
  writeFileSync(join(dir, 'E', 'seal', 'seal.json'), `${JSON.stringify({ format: 'p2-seal', version: 1, commit: 'c0ffee', copies }, null, 2)}\r\n`);
}

/** @param {string} dir @returns {string} The SHA-256 of the state folder's active seal. */
const sealOf = (dir) => sha256Hex(readFileSync(join(dir, 'E', 'seal', 'seal.json')));

/** @param {string} name @returns {string} A new state folder, with a fake seal. */
function state(name) {
  const dir = join(RUN, name);
  mkdirSync(join(dir, 'E', 'ledger'), { recursive: true });
  mkdirSync(join(dir, 'RAW', 'rows'), { recursive: true });
  fakeSeal(dir);
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
  mkdirSync(join(dir, 'E', 'report-A'), { recursive: true });
  writeFileSync(join(dir, 'E', 'report-A', 'report.json'), '{"gates":[{"gate":"A4","status":"pass"}]}\r\n');
  const seal = sealOf(dir);
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
    const sealSha256 = sealOf(dir);
    writeFileSync(join(dir, 'RAW', 'rows', 'A.status.jsonl'), [
      { t: 'start', key: 'k1', group: 2, invocation: 'A-2.1', sealSha256 },
      { t: 'done', key: 'k1', sealSha256 },
      { t: 'start', key: 'k3', group: 2, invocation: 'A-2.1', sealSha256 },
      { t: 'start', key: 'k4', group: 2, invocation: 'A-2.1', sealSha256: 'f'.repeat(64) },
      { t: 'done', key: 'k4', sealSha256: 'f'.repeat(64) },
    ].map((l) => `${JSON.stringify(l)}\r\n`).join(''));
    assert.equal(wrapper(dir, 'ok').status, 0);
    assert.equal(ledgerOf(dir)[0].rowsWritten, 1);
  });

  it('a recovered terminal keeps its original invocation', () => {
    const dir = state('w-recovered');
    const first = { id: 'A-2.1', stage: 'A', group: 2, start: '2026-11-26T10:00:00.000+07:00', end: '2026-11-26T10:01:00.000+07:00', nodeSeconds: 12.5, quietS: 45, countedSeconds: 57.5, limitS: 900, killed: false, exit: 0, rowsWritten: 0, cause: 'ok' };
    const status = join(dir, 'RAW', 'rows', 'A.status.jsonl');
    const sealSha256 = sealOf(dir);
    writeFileSync(status, `${JSON.stringify({ t: 'start', key: 'k2', group: 2, invocation: 'A-2.1', sealSha256 })}\r\n`);
    ledger(dir, [first]);
    const before = readFileSync(join(dir, 'E', 'ledger', 'ledger.jsonl'), 'utf8');
    writeFileSync(status, `${readFileSync(status, 'utf8')}${JSON.stringify({ t: 'done', key: 'k2', sealSha256 })}\r\n`);
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

  /** @param {boolean} isToday @returns {string} The adapter's input digest of a root. */
  const inputDigestOf = (isToday) => (isToday ? 'in:today' : 'in:prod');

  /** Builds a synthetic root, copies and today worktree. @param {string} name */
  function world(name) {
    const dir = state(name);
    const root = join(dir, 'repo');
    const today = join(dir, 'today');
    stub(root, 'prod\n');
    stub(today, 'today\n');
    mkdirSync(join(root, 'tools', 'ig-proto', 'phase2'), { recursive: true });
    writeFileSync(join(root, 'tools', 'ig-proto', 'phase2', 'x.mjs'), 'export const x = 1;\r\n');
    writeFileSync(join(root, 'tools', 'ig-proto', 'verdicts.mjs'), 'export const v = 1;\r\n');
    mkdirSync(join(root, 'inputs'), { recursive: true });
    writeFileSync(join(root, 'inputs', 'one.json'), '{}\r\n');
    writeFileSync(join(root, 'plan.json'), '{"rows":[]}\r\n');
    for (const [source, ids] of Object.entries(COPIES)) {
      for (const id of ids) {
        const tree = join(dir, 'RAW', 'trees', source, id);
        stub(tree, `${id}\n`);
        mkdirSync(join(tree, 'tools'), { recursive: true });
        writeFileSync(join(tree, 'tools', 'calibrate.mjs'), `// ${id}\r\n`);
        writeFileSync(join(tree, 'ig-tree.json'), JSON.stringify({ treeId: `t-${id}`, copyDigest: `d:${id}\n` }));
        writeFileSync(join(tree, 'p2-copy.json'), copyReceipt(id, source));
      }
    }
    const gitState = { head: 'c0ffee', status: '', todayHead: '6b94ffb1234', todayStatus: '' };
    const git = (/** @type {string[]} */ args, /** @type {string} */ cwd) => {
      const isToday = cwd === today;
      if (args[0] === 'rev-parse') return isToday ? gitState.todayHead : gitState.head;
      return isToday ? gitState.todayStatus : gitState.status;
    };
    const snapshot = { ok: true, files: 3, differences: /** @type {string[]} */ ([]) };
    const deps = {
      git,
      copiesApi: async () => ({ readSources: (/** @type {string} */ r) => ({ root: r }), inputDigest: (/** @type {{ root: string }} */ s) => inputDigestOf(s.root === today) }),
      verifySnapshot: () => snapshot,
    };
    const o = {
      repoRoot: root, commit: 'c0ffee', todayRoot: today, planPath: join(root, 'plan.json'), rawRoot: join(dir, 'RAW'), inputs: ['inputs/', 'tools/ig-proto/verdicts.mjs'], out: join(dir, 'sealed'),
    };
    return { dir, root, today, gitState, snapshot, deps, o, copyReceipt };

    /** @param {string} id @param {string} source @param {object} [over] */
    function copyReceipt(id, source, over = {}) {
      return JSON.stringify({
        format: 'p2-copy', version: 1, id, source, root: source === 'today' ? today : root, rehearsal: false, inputDigest: inputDigestOf(source === 'today'), treeId: `t-${id}`, copyDigest: `d:${id}\n`, chain: [], params: {}, ...over,
      });
    }
  }

  it('seals the sources, copies, today worktree, tools and inputs, and checks them', async () => {
    const w = world('seal-ok');
    const built = await buildSeal(w.o, w.deps);
    assert.equal(built.unchanged, false);
    const seal = JSON.parse(readFileSync(join(w.o.out, 'seal.json'), 'utf8'));
    assert.equal(built.sha256, sha256Hex(readFileSync(join(w.o.out, 'seal.json'))));
    assert.deepEqual(Object.keys(seal), ['format', 'version', 'commit', 'stageMap', 'node', 'plan', 'sourceDigest', 'today', 'copies', 'tools', 'inputs', 'snapshot']);
    assert.equal(seal.format, 'p2-seal');
    assert.equal(seal.copies.length, 6);
    assert.ok(seal.copies.every((/** @type {any} */ c) => c.verified === true));
    assert.deepEqual(seal.tools.map((/** @type {any} */ t) => t.path), ['tools/ig-proto/phase2/x.mjs']);
    assert.deepEqual(seal.inputs.map((/** @type {any} */ t) => t.path), ['inputs/one.json', 'tools/ig-proto/verdicts.mjs']);
    assert.equal(seal.sourceDigest, 'd:prod\n');
    assert.equal(seal.today.digest, 'd:today\n');
    assert.equal(seal.plan.path, 'plan.json');
    assert.deepEqual(seal.snapshot, { manifest: 'docs/improve-generating/evidence/frozen/V4-T01a/snapshot-manifest.json', ok: true, files: 3 });
    assert.deepEqual(await checkSeal(w.o, w.deps), { ok: true, drift: [] });
    w.gitState.head = 'other';
    assert.equal((await checkSeal(w.o, w.deps)).ok, true, 'a later commit is allowed');
    const file = join(w.o.out, 'seal.json');
    writeFileSync(join(w.dir, 'other-seal.json'), JSON.stringify({ ...seal, node: 'v0.0.0' }));
    assert.deepEqual((await checkSeal({ ...w.o, sealFile: join(w.dir, 'other-seal.json') }, w.deps)).drift, [{ field: 'node', id: process.version }]);
    assert.equal(existsSync(file), true);
  });

  it('refuses what the creation requires', async () => {
    const w = world('seal-refuse');
    w.gitState.head = 'other';
    await assert.rejects(buildSeal(w.o, w.deps), /HEAD is not c0ffee/);
    w.gitState.head = 'c0ffee';
    w.gitState.status = ' M a.txt';
    await assert.rejects(buildSeal(w.o, w.deps), /tracked worktree is not clean/);
    w.gitState.status = '';
    w.gitState.todayHead = 'abcdef0';
    await assert.rejects(buildSeal(w.o, w.deps), /today worktree is not at 6b94ffb/);
    w.gitState.todayHead = '6b94ffb1234';
    w.gitState.todayStatus = '?? x';
    await assert.rejects(buildSeal(w.o, w.deps), /today worktree is not clean/);
    w.gitState.todayStatus = '';
    await assert.rejects(buildSeal({ ...w.o, inputs: ['inputs/', 'missing/file.json'] }, w.deps), /sealed input is missing/);
    rmSync(join(w.dir, 'RAW', 'trees', 'today', 'p2-today'), { recursive: true });
    await assert.rejects(buildSeal(w.o, w.deps), /copy is missing: today\/p2-today/);
    assert.equal(existsSync(join(w.o.out, 'seal.json')), false);
  });

  it('the seal refuses a stale but self-consistent copy', async () => {
    const w = world('seal-stale');
    const dir = join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-gen4');
    writeFileSync(join(dir, 'p2-copy.json'), w.copyReceipt('p2-gen4', 'gen-v4', { inputDigest: 'in:older' }));
    await assert.rejects(buildSeal(w.o, w.deps), /^Error: seal: refused copy p2-gen4 input digest$/);
    assert.equal(existsSync(join(w.o.out, 'seal.json')), false);
  });

  it('the seal refuses a rehearsal copy', async () => {
    const w = world('seal-rehearsal');
    const dir = join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-gen4');
    writeFileSync(join(dir, 'p2-copy.json'), w.copyReceipt('p2-gen4', 'gen-v4', { rehearsal: true }));
    await assert.rejects(buildSeal(w.o, w.deps), /^Error: seal: refused copy p2-gen4 rehearsal$/);
  });

  it('the seal refuses a copy of another identity, digest or tree', async () => {
    const w = world('seal-identity');
    const dir = join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-gen4');
    const receipt = join(dir, 'p2-copy.json');
    const good = readFileSync(receipt, 'utf8');
    writeFileSync(receipt, w.copyReceipt('p2-gen4', 'gen-v4', { root: w.today }));
    await assert.rejects(buildSeal(w.o, w.deps), /seal: refused copy p2-gen4 identity/);
    writeFileSync(receipt, w.copyReceipt('p2-gen4', 'gen-v4', { id: 'p2-none' }));
    await assert.rejects(buildSeal(w.o, w.deps), /seal: refused copy p2-gen4 identity/);
    writeFileSync(receipt, w.copyReceipt('p2-gen4', 'gen-v4', { root: w.root.toUpperCase() }));
    await buildSeal(w.o, w.deps);
    rmSync(join(w.o.out, 'seal.json'));
    writeFileSync(receipt, good);
    writeFileSync(join(dir, 'a.txt'), 'edited\n');
    await assert.rejects(buildSeal(w.o, w.deps), /seal: refused copy p2-gen4 digest/);
    writeFileSync(join(dir, 'a.txt'), 'p2-gen4\n');
    writeFileSync(receipt, w.copyReceipt('p2-gen4', 'gen-v4', { treeId: 't-other' }));
    await assert.rejects(buildSeal(w.o, w.deps), /seal: refused copy p2-gen4 tree id/);
  });

  it('the seal binds the runtime and whole-tree digests', async () => {
    const w = world('seal-digests');
    await buildSeal(w.o, w.deps);
    const seal = JSON.parse(readFileSync(join(w.o.out, 'seal.json'), 'utf8'));
    for (const c of seal.copies) {
      assert.equal(c.runtimeDigest, c.copyDigest);
      assert.match(c.filesDigest, /^[0-9a-f]{64}$/);
    }
    assert.deepEqual((await checkSeal(w.o, w.deps)).drift, []);
    const calibrate = join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-gen4', 'tools', 'calibrate.mjs');
    writeFileSync(calibrate, `${readFileSync(calibrate, 'utf8')}x`);
    assert.deepEqual((await checkSeal(w.o, w.deps)).drift, [{ field: 'copies', id: 'p2-gen4' }]);
  });

  it('a changed reused comparator input is drift', async () => {
    const w = world('seal-comparator');
    await buildSeal(w.o, w.deps);
    writeFileSync(join(w.root, 'tools', 'ig-proto', 'verdicts.mjs'), 'export const v = 2;\r\n');
    assert.deepEqual((await checkSeal(w.o, w.deps)).drift, [{ field: 'inputs', id: 'tools/ig-proto/verdicts.mjs' }]);
  });

  it('the check allows ledger-only changes and refuses sealed changes', async () => {
    const w = world('seal-ledger-only');
    await buildSeal(w.o, w.deps);
    w.gitState.head = 'abc1234';
    w.gitState.status = ' M docs/improve-generating-phase-2/evidence/ledger/ledger.jsonl';
    const ledgerFolder = join(w.root, 'docs', 'improve-generating-phase-2', 'evidence', 'ledger');
    mkdirSync(ledgerFolder, { recursive: true });
    writeFileSync(join(ledgerFolder, 'ledger.jsonl'), '{"id":"A-1.1"}\r\n');
    assert.deepEqual(await checkSeal(w.o, w.deps), { ok: true, drift: [] });
    writeFileSync(join(w.root, 'tools', 'ig-proto', 'verdicts.mjs'), 'export const v = 3;\r\n');
    assert.deepEqual((await checkSeal(w.o, w.deps)).drift, [{ field: 'inputs', id: 'tools/ig-proto/verdicts.mjs' }]);
  });

  it('the seal is write-once', async () => {
    const w = world('seal-once');
    const first = await buildSeal(w.o, w.deps);
    const file = join(w.o.out, 'seal.json');
    const bytes = readFileSync(file, 'utf8');
    assert.deepEqual(await buildSeal(w.o, w.deps), { sha256: first.sha256, unchanged: true });
    writeFileSync(join(w.root, 'inputs', 'one.json'), '{"a":1}\r\n');
    await assert.rejects(buildSeal(w.o, w.deps), /^Error: seal: refused existing seal differs \(a new source epoch needs the ruling of check-list §3\.5\)$/);
    assert.equal(readFileSync(file, 'utf8'), bytes);
  });

  it('a failed snapshot refuses the seal', async () => {
    const w = world('seal-snapshot');
    Object.assign(w.snapshot, { ok: false, files: 0, differences: ['x'] });
    await assert.rejects(buildSeal(w.o, w.deps), /^Error: seal: refused snapshot x$/);
    assert.equal(existsSync(join(w.o.out, 'seal.json')), false);
    Object.assign(w.snapshot, { ok: true, files: 3, differences: [] });
    await buildSeal(w.o, w.deps);
    Object.assign(w.snapshot, { ok: false, files: 0, differences: ['y'] });
    assert.deepEqual((await checkSeal(w.o, w.deps)).drift, [{ field: 'snapshot', id: 'y' }]);
  });

  it('drift names the field and the path', async () => {
    const w = world('seal-drift');
    await buildSeal(w.o, w.deps);
    const check = async () => (await checkSeal(w.o, w.deps)).drift.map((d) => `${d.field} ${d.id}`);
    writeFileSync(join(w.root, 'inputs', 'one.json'), '{"a":1}\r\n');
    assert.deepEqual(await check(), ['inputs inputs/one.json']);
    writeFileSync(join(w.root, 'inputs', 'one.json'), '{}\r\n');
    writeFileSync(join(w.root, 'tools', 'ig-proto', 'phase2', 'y.mjs'), '\r\n');
    assert.deepEqual(await check(), ['tools tools/ig-proto/phase2/y.mjs']);
    rmSync(join(w.root, 'tools', 'ig-proto', 'phase2', 'y.mjs'));
    writeFileSync(join(w.root, 'a.txt'), 'changed\n');
    assert.deepEqual(await check(), ['sourceDigest repository']);
    writeFileSync(join(w.root, 'a.txt'), 'prod\n');
    writeFileSync(join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-none', 'a.txt'), 'edited\n');
    assert.deepEqual(await check(), ['copies p2-none']);
    writeFileSync(join(w.dir, 'RAW', 'trees', 'gen-v4', 'p2-none', 'a.txt'), 'p2-none\n');
    w.gitState.todayStatus = ' M a.txt';
    assert.deepEqual(await check(), [`today ${w.today}`]);
  });

  it('the command reports a missing seal as drift', () => {
    const dir = state('seal-cli');
    rmSync(join(dir, 'E', 'seal'), { recursive: true });
    const r = p2(['seal', '--check', '--state', dir]);
    assert.equal(r.status, 3, r.out);
    assert.match(r.out, /seal: drift file /);
  });
});

/** The journal of one complete row (C1 to C3), written by the fake calibrate and by the resume case. */
function writeJournal(/** @type {string} */ dir, /** @type {string} */ row, /** @type {string} */ seed, /** @type {number} */ pid) {
  mkdirSync(dir, { recursive: true });
  const call = `${row}:${pid}:1:1`;
  const put = (/** @type {string} */ name, /** @type {object[]} */ lines) => writeFileSync(join(dir, name), lines.map((l) => `${JSON.stringify(l)}\n`).join(''));
  put(`${row}.${pid}.1.jsonl`, [
    { t: 'worker', pid, threadId: 1, at: 0 },
    { t: 'start', call, stage: 'set', attempt: 0, level: 'x', A: 1, at: 1 },
    { t: 'caps', call, count: true },
    { t: 'begin', call, kind: 'rate', bound: 1000 },
    { t: 'p', call, i: 0, tuple: ['call', 5, 'rated', 60, 90, 10] },
    { t: 'end', call, result: 'ok', work: 100, profiles: 1, locate: { countWork: 0 }, igNoWindow: null, budgetStop: false, clueCount: null, at: 2 },
  ]);
  put(`${row}.link.jsonl`, [
    { t: 'link', ev: 'set-complete', attempt: 0, outcome: 'ok' },
    { t: 'link', ev: 'worker-end', pid, threadId: 1, at: 50 },
  ]);
  put(`${row}.row.jsonl`, [{ t: 'row', row, seed, caseId: 'c', localRep: 20, pid }]);
}

const TELEMETRY = { setCounters: null, batchCounters: null, trail: { attempts: [], sameSide: 0, boundFired: false, noWindow: { below: 0, above: 0 } } };

/**
 * The stand-in for `tools/calibrate.mjs` of a copy: it acts by `P2_FAKE_CALIBRATE`, records every launch and writes the
 * report that `verifyRow` reads: the matrix digest of its `--matrix` file, and the run's case, seed, source digest
 * (`rd-<variant>`, the fake seal's `runtimeDigest`) and label (`IG_SOURCE_LABEL`).
 */
const FAKE_CALIBRATE = [
  "import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';",
  "import { join } from 'node:path';",
  `import { matrixDigest } from ${JSON.stringify(pathToFileURL(join(REPO, 'tools', 'bench', 'calibration-reference.js')).href)};`,
  writeJournal.toString(),
  "appendFileSync(process.env.P2_FAKE_MARKER, `${process.env.IG_ROW} ${process.env.IG_SOURCE_LABEL} ${process.env.IG_SEED} ${process.cwd()}\\n`);",
  "if (process.env.P2_FAKE_CALIBRATE === 'noreport') process.exit(1);",
  'const args = process.argv.slice(2);',
  'writeJournal(process.env.IG_LOG_DIR, process.env.IG_ROW, process.env.IG_SEED, process.pid);',
  "const matrix = JSON.parse(readFileSync(args[args.indexOf('--matrix') + 1], 'utf8'));",
  `const run = { probeKind: 'generation', acceptedCount: 10, caseId: matrix.cases[0].id, seed: process.env.IG_SEED, sourceDigest: 'rd-' + process.env.IG_SOURCE_LABEL.split(' ')[0], sourceCommit: process.env.P2_FAKE_CALIBRATE === 'badlabel' ? 'other' : process.env.IG_SOURCE_LABEL, telemetry: ${JSON.stringify(TELEMETRY)} };`,
  "writeFileSync(args[args.indexOf('--output') + 1] + '.json', JSON.stringify({ meta: { matrixDigest: matrixDigest(matrix) }, runs: [run] }));",
  '',
].join('\n');

process.on('exit', () => {
  delete process.env.P2_FAKE_CALIBRATE;
  delete process.env.P2_FAKE_MARKER;
});

/** @param {string} key @param {Record<string, any>} [over] @returns {Record<string, any>} A plan row. */
function planRow(key, over = {}) {
  const rep = Number(key.split('/').pop());
  return {
    key, fileKey: key.replaceAll('/', '~'), component: 'shipped', stage: 'A', group: 2, arm: 'gen-v4', cell: '10x10-nightmare', rep,
    seed: `landscape/10x10-nightmare/${rep}`, rowLimitS: 130, uniqueness: 'any', quantity: 10, maxActive: 676, open: false, source: 'gen-v4',
    levelId: 'nightmare', variant: 'p2-gen4', boardRows: rectRows(10, 10), ...over,
  };
}

/**
 * A state root with a plan, a seal and fake copies.
 * @param {string} name @param {{ rows: any[], groups: { stage: string, group: number, keys: string[] }[] }} o
 */
function runWorld(name, o) {
  const dir = state(name);
  mkdirSync(join(dir, 'E', 'plan'), { recursive: true });
  writeFileSync(join(dir, 'E', 'plan', 'plan.json'), `${JSON.stringify({ format: 'p2-plan', version: 1, rows: o.rows, groups: o.groups }, null, 2)}\r\n`);
  const variants = ['p2-gen4', 'p2-gen4-diag', 'p2-uncapped', 'p2-uncapped-diag'];
  fakeSeal(dir, variants.map((id) => ({ id, source: 'gen-v4', treeId: `t-${id}`, copyDigest: `d-${id}`, runtimeDigest: `rd-${id}` })));
  for (const id of variants) {
    const tools = join(dir, 'RAW', 'trees', 'gen-v4', id, 'tools');
    mkdirSync(tools, { recursive: true });
    writeFileSync(join(tools, 'calibrate.mjs'), FAKE_CALIBRATE);
  }
  return { dir, P: pathsOf(dir), marker: join(dir, 'launched.txt') };
}

/** @param {string} dir @param {string} file @returns {any[]} */
const jsonLines = (dir, file) => {
  const path = join(dir, 'RAW', 'rows', file);
  return existsSync(path) ? readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const launched = (/** @type {{ marker: string }} */ w) => (existsSync(w.marker) ? readFileSync(w.marker, 'utf8').split('\n').filter(Boolean).map((l) => l.split(' ')[0]) : []);

/**
 * Runs a group with the fake calibrate.
 * @param {ReturnType<typeof runWorld>} w @param {Record<string, any>} [opts] @param {Record<string, any>} [deps] @param {string} [mode]
 */
function go(w, opts = {}, deps = {}, mode = 'ok') {
  process.env.P2_FAKE_MARKER = w.marker;
  process.env.P2_FAKE_CALIBRATE = mode;
  return runGroup(/** @type {any} */ ({ stage: 'A', group: 2, invocation: 'A-2.1', paths: w.P, ...opts }), { now: () => 0, ...deps });
}

/** @param {string} dir @param {Record<string, any>} extra Writes an activation receipt for the plan and seal of the state root. */
function activate(dir, extra) {
  mkdirSync(join(dir, 'E', 'twins'), { recursive: true });
  writeFileSync(join(dir, 'E', 'twins', 'activation.json'), `${JSON.stringify({
    planSha256: sha256Hex(readFileSync(join(dir, 'E', 'plan', 'plan.json'))),
    sealSha256: sha256Hex(readFileSync(join(dir, 'E', 'seal', 'seal.json'))),
    predicateVersion: 'p2-twins-v1',
    slots: {},
    overflow: { keys: [], groups: [] },
    ...extra,
  }, null, 2)}\r\n`);
}

describe('the rows of a group', () => {
  const K1 = 'shipped/gen-v4/10x10-nightmare/20';
  const K2 = 'shipped/gen-v4/10x10-nightmare/21';

  /** Leaves the start lines of a finished group and drops its row lines, as a crash after the receipts would. @param {ReturnType<typeof runWorld>} w */
  function crash(w) {
    const starts = jsonLines(w.dir, 'A.status.jsonl').filter((l) => l.t === 'start');
    writeFileSync(join(w.dir, 'RAW', 'rows', 'A.status.jsonl'), starts.map((l) => `${JSON.stringify(l)}\r\n`).join(''));
    rmSync(join(w.dir, 'RAW', 'rows', 'A.jsonl'));
  }

  it('a row starts durably and ends with its receipt and line', async () => {
    const w = runWorld('row-ok', { rows: [planRow(K1)], groups: [{ stage: 'A', group: 2, keys: [K1] }] });
    const r = await go(w);
    assert.deepEqual(r, { code: 0, lines: [`row ${K1} done`] });
    const status = jsonLines(w.dir, 'A.status.jsonl');
    assert.deepEqual(status.map((l) => [l.t, l.key]), [['start', K1], ['done', K1]]);
    assert.deepEqual({ group: status[0].group, invocation: status[0].invocation }, { group: 2, invocation: 'A-2.1' });
    const fileKey = K1.replaceAll('/', '~');
    const raw = join(w.dir, 'RAW', 'raw', fileKey);
    const receiptFile = join(raw, 'receipt.json');
    const receiptText = readFileSync(receiptFile, 'utf8');
    assert.ok(receiptText.includes('\r\n') && !/[^\r]\n/.test(receiptText));
    const receipt = JSON.parse(receiptText);
    assert.deepEqual(Object.keys(receipt), ['key', 'fileKey', 'stage', 'group', 'invocation', 'sealSha256', 'variant', 'copy', 'report', 'journal', 'childExit', 'startedAt', 'endedAt']);
    assert.deepEqual({ key: receipt.key, fileKey: receipt.fileKey, stage: receipt.stage, group: receipt.group, invocation: receipt.invocation, variant: receipt.variant, childExit: receipt.childExit },
      { key: K1, fileKey, stage: 'A', group: 2, invocation: 'A-2.1', variant: 'p2-gen4', childExit: 0 });
    assert.deepEqual(receipt.copy, { treeId: 't-p2-gen4', copyDigest: 'd-p2-gen4' });
    assert.deepEqual(receipt.report, { path: `raw/${fileKey}/report.json`, sha256: sha256Hex(readFileSync(join(raw, 'report.json'))) });
    assert.equal(receipt.journal.length, 3);
    assert.deepEqual(receipt.journal.map((/** @type {any} */ j) => j.name), receipt.journal.map((/** @type {any} */ j) => j.name).sort());
    for (const j of receipt.journal) {
      const bytes = readFileSync(join(raw, 'journal', j.name));
      assert.deepEqual({ bytes: j.bytes, sha256: j.sha256 }, { bytes: bytes.length, sha256: sha256Hex(bytes) });
    }
    const rows = jsonLines(w.dir, 'A.jsonl');
    assert.equal(rows.length, 1);
    const [row] = rows;
    assert.equal(row.key, K1);
    assert.equal(row.group, 2);
    assert.equal(row.receipt, sha256Hex(readFileSync(receiptFile)));
    assert.equal(row.ledger.complete, true, JSON.stringify(row.ledger.problems));
    assert.equal(row.ledger.outcomes.length, 1);
    assert.deepEqual(row.ledger.rerateStarts, { close: 0, rescue: 0, rerate: 0 });
    assert.equal(row.run.acceptedCount, 10);
    assert.deepEqual(row.telemetry, TELEMETRY);
    assert.deepEqual(readFileSync(w.marker, 'utf8').trim().split(' ').slice(0, 4), [fileKey, 'p2-gen4', 'c0ffee', 'landscape/10x10-nightmare/20']);
    const matrix = JSON.parse(readFileSync(join(raw, 'matrix.json'), 'utf8'));
    assert.deepEqual(matrix.cases[0].seeds, ['landscape/10x10-nightmare/20']);
    assert.equal(matrix.cases[0].quantity, 10);
  });

  it('a child without a report is interrupted', async () => {
    const w = runWorld('row-noreport', { rows: [planRow(K1)], groups: [{ stage: 'A', group: 2, keys: [K1] }] });
    const r = await go(w, {}, {}, 'noreport');
    assert.equal(r.code, 0);
    const status = jsonLines(w.dir, 'A.status.jsonl');
    assert.deepEqual(status.map((l) => l.t), ['start', 'interrupted']);
    assert.equal(status[1].cause, 'child-exit 1');
    assert.equal(jsonLines(w.dir, 'A.jsonl').length, 0);
    assert.equal((await go(w, {}, {}, 'noreport')).code, 0);
    assert.equal(launched(w).length, 1, 'an interrupted row is never launched again');
  });

  it('resume never launches a started row again', async () => {
    const w = runWorld('row-resume', { rows: [planRow(K1), planRow(K2)], groups: [{ stage: 'A', group: 2, keys: [K1, K2] }] });
    assert.equal((await go(w)).code, 0);
    crash(w);
    rmSync(join(w.dir, 'RAW', 'raw', K2.replaceAll('/', '~')), { recursive: true });
    const receiptFile = join(w.dir, 'RAW', 'raw', K1.replaceAll('/', '~'), 'receipt.json');
    const before = launched(w).length;
    const r = await go(w);
    assert.equal(r.code, 0);
    const status = jsonLines(w.dir, 'A.status.jsonl');
    assert.deepEqual(status.slice(2).map((l) => [l.t, l.key, l.cause]), [['done', K1, undefined], ['interrupted', K2, 'no-report']]);
    assert.ok(status.slice(2).every((l) => l.sealSha256 === sealOf(w.dir)));
    const rows = jsonLines(w.dir, 'A.jsonl');
    assert.deepEqual(rows.map((l) => l.key), [K1]);
    assert.equal(rows[0].receipt, sha256Hex(readFileSync(receiptFile)));
    assert.equal(rows[0].ledger.complete, true);
    assert.equal(launched(w).length, before, 'nothing is launched again');
    assert.equal((await go(w)).code, 0);
    assert.equal(jsonLines(w.dir, 'A.jsonl').length, 1, 'the row line is not written twice');
  });

  it('a mismatched raw report is interrupted on resume', async () => {
    const w = runWorld('row-report-hash', { rows: [planRow(K1)], groups: [{ stage: 'A', group: 2, keys: [K1] }] });
    assert.equal((await go(w)).code, 0);
    crash(w);
    const report = join(w.dir, 'RAW', 'raw', K1.replaceAll('/', '~'), 'report.json');
    writeFileSync(report, `${readFileSync(report, 'utf8')} `);
    assert.equal((await go(w)).code, 0);
    const [, terminal] = jsonLines(w.dir, 'A.status.jsonl').filter((l) => l.key === K1);
    assert.deepEqual([terminal.t, terminal.cause], ['interrupted', 'report hash']);
    assert.equal(jsonLines(w.dir, 'A.jsonl').length, 0);
    assert.equal(launched(w).length, 1, 'no launch marker after the first run');
  });

  it('an old-seal terminal key is refused after a new seal', async () => {
    const w = runWorld('row-old-seal', { rows: [planRow(K1), planRow(K2)], groups: [{ stage: 'A', group: 2, keys: [K1, K2] }] });
    assert.equal((await go(w)).code, 0);
    const copies = JSON.parse(readFileSync(join(w.dir, 'E', 'seal', 'seal.json'), 'utf8')).copies;
    fakeSeal(w.dir, [...copies].reverse());
    const before = launched(w).length;
    const r = await go(w);
    assert.deepEqual(r, { code: 9, lines: [`refused: foreign seal epoch ${K1}`, `refused: foreign seal epoch ${K2}`] });
    assert.equal(launched(w).length, before);
    const cli = p2(['publish', '--stage', 'A', '--out', join(w.dir, 'out'), '--state', w.dir]);
    assert.equal(cli.status, 9, cli.out);
    assert.match(cli.out, new RegExp(`publish: refused ${K1}: foreign seal [0-9a-f]{64}`));
    assert.equal(existsSync(join(w.dir, 'out')), false);
  });

  it('every record names the seal', async () => {
    const w = runWorld('row-seal-names', { rows: [planRow(K1)], groups: [{ stage: 'A', group: 2, keys: [K1] }] });
    const seal = sealOf(w.dir);
    assert.equal((await go(w)).code, 0);
    const status = jsonLines(w.dir, 'A.status.jsonl');
    assert.deepEqual(status.map((l) => [l.t, l.sealSha256]), [['start', seal], ['done', seal]]);
    assert.equal(jsonLines(w.dir, 'A.jsonl')[0].sealSha256, seal);
    assert.equal(JSON.parse(readFileSync(join(w.dir, 'RAW', 'raw', K1.replaceAll('/', '~'), 'receipt.json'), 'utf8')).sealSha256, seal);
    const reserved = p2(['reserve', '--stage', 'A', '--group', '3', '--limit', '900', '--state', w.dir]);
    assert.equal(reserved.status, 0, reserved.out);
    assert.equal(JSON.parse(readFileSync(join(w.dir, 'RAW', 'pending.json'), 'utf8')).sealSha256, seal);
    const line = { id: 'A-3.1', stage: 'A', group: 3, start: '2026-11-26T10:00:00.000+07:00', end: '2026-11-26T10:01:00.000+07:00', nodeSeconds: 12.5, quietS: 45, countedSeconds: 57.5, limitS: 900, killed: false, exit: 0, rowsWritten: 0, cause: 'ok' };
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify(line), '--state', w.dir]).status, 0);
    assert.equal(JSON.parse(readFileSync(join(w.dir, 'E', 'ledger', 'ledger.jsonl'), 'utf8')).sealSha256, seal);
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify({ ...line, id: 'A-3.2', sealSha256: seal }), '--state', w.dir]).status, 5, 'the caller never passes the seal');
  });

  it('reserve and append refuse without a seal', () => {
    const dir = state('no-seal');
    rmSync(join(dir, 'E', 'seal'), { recursive: true });
    const reserved = p2(['reserve', '--stage', 'A', '--group', '2', '--limit', '900', '--state', dir]);
    assert.equal(reserved.status, 4);
    assert.match(reserved.out, /reserve: no seal/);
    assert.equal(existsSync(join(dir, 'RAW', 'pending.json')), false);
    const line = { id: 'A-2.1', stage: 'A', group: 2, start: '2026-11-26T10:00:00.000+07:00', end: '2026-11-26T10:01:00.000+07:00', nodeSeconds: 12.5, quietS: 45, countedSeconds: 57.5, limitS: 900, killed: false, exit: 0, rowsWritten: 0, cause: 'ok' };
    assert.equal(p2(['ledger', '--append', '--json', JSON.stringify(line), '--state', dir]).status, 5);
    assert.equal(existsSync(join(dir, 'E', 'ledger', 'ledger.jsonl')), false);
  });

  it('a group keeps its deferred keys', async () => {
    const w = runWorld('row-deferred', {
      rows: [planRow(K1, { rowLimitS: 130 }), planRow(K2, { rowLimitS: 130 })],       groups: [{ stage: 'A', group: 2, keys: [K1, K2] }],
    });
    const r = await go(w, { clockOffsetS: 800 });
    assert.deepEqual(r, { code: 7, lines: [`deferred ${K1}`, `deferred ${K2}`] });
    assert.equal(existsSync(w.marker), false);
    assert.equal(jsonLines(w.dir, 'A.status.jsonl').length, 0);
    const cli = p2(['run-group', '--stage', 'A', '--group', '2', '--invocation', 'A-2.1', '--state', w.dir, '--clock-offset-s', '800']);
    assert.equal(cli.status, 7);
    assert.match(cli.out, new RegExp(`deferred ${K1}`));
    assert.equal(p2(['run-group', '--stage', 'A', '--group', '2', '--invocation', 'A-2.1', '--clock-offset-s', '800']).status, 2);
    const again = await go(w);
    assert.equal(again.code, 0);
    assert.deepEqual(launched(w), [K1, K2].map((k) => k.replaceAll('/', '~')));
  });

  const smokeRows = ['smoke/gen-v4/10x10-nightmare/20', 'smoke/gen-v4/10x10-nightmare/21'];
  const requireKey = 'require/gen-v4/10x10-nightmare/0';
  const G1 = { group: 1, invocation: 'A-1.1' };
  const smokeWorld = (/** @type {string} */ name) => runWorld(name, {
    rows: [...smokeRows.map((k) => planRow(k, { component: 'smoke' })), planRow(requireKey, { component: 'require', uniqueness: 'require', seed: 'ig-p2/require/10x10-nightmare/0' })],
    groups: [{ stage: 'A', group: 1, keys: [...smokeRows, requireKey] }],
  });

  it('the smoke gate stops before the first require row', async () => {
    const w = smokeWorld('smoke-fail');
    /** @type {number[]} */
    const calls = [];
    const smokeGate = (/** @type {any[]} */ rows) => {
      calls.push(rows.length);
      return { ok: false, problems: ['x'] };
    };
    const r = await go(w, G1, { smokeGate });
    assert.equal(r.code, 6);
    assert.deepEqual(launched(w), smokeRows.map((k) => k.replaceAll('/', '~')));
    const gate = JSON.parse(readFileSync(join(w.dir, 'RAW', 'rows', 'smoke-gate.json'), 'utf8'));
    assert.deepEqual({ ok: gate.ok, problems: gate.problems, at: typeof gate.at }, { ok: false, problems: ['x'], at: 'string' });
    assert.ok(!jsonLines(w.dir, 'A.status.jsonl').some((l) => l.key === requireKey));
    assert.deepEqual(calls, [2]);
    assert.equal((await go(w, G1, { smokeGate })).code, 6);
    assert.equal(launched(w).length, 2);
    assert.deepEqual(calls, [2], 'the verdict is decided once');
    assert.equal((await go(w, G1)).code, 6, 'the default gate fails without proofs, and an existing verdict is read, not recomputed');
  });

  it('the default smoke gate fails without proofs and oracles', async () => {
    const w = smokeWorld('smoke-default');
    const r = await go(w, G1);
    assert.equal(r.code, 6);
    assert.match(r.lines.at(-1) ?? '', /smoke gate failed: S1 proof observer: missing/);
    assert.equal(launched(w).length, 2);
  });

  it('a smoke row with a bad binding stops the group', async () => {
    const w = smokeWorld('smoke-unbound');
    /** @type {number[]} */
    const lengths = [];
    const smokeGate = (/** @type {any[]} */ rows) => {
      lengths.push(rows.length);
      return { ok: true, problems: [] };
    };
    const r = await go(w, G1, { smokeGate }, 'badlabel');
    assert.equal(r.code, 6);
    assert.deepEqual(lengths, [0]);
    const gate = JSON.parse(readFileSync(join(w.dir, 'RAW', 'rows', 'smoke-gate.json'), 'utf8'));
    assert.equal(gate.ok, false);
    assert.ok(gate.problems[0].startsWith('S2 smoke/gen-v4/10x10-nightmare/20: binding '), gate.problems[0]);
    assert.deepEqual(launched(w), smokeRows.map((k) => k.replaceAll('/', '~')));
    assert.ok(!jsonLines(w.dir, 'A.status.jsonl').some((l) => l.key === requireKey));
  });

  it('a passing smoke gate lets the require rows run', async () => {
    const w = smokeWorld('smoke-pass');
    /** @type {any[]} */
    const given = [];
    const r = await go(w, G1, { smokeGate: (/** @type {any[]} */ _rows, /** @type {any} */ _plan, /** @type {any} */ paths) => { given.push(paths); return { ok: true, problems: [] }; } });
    assert.equal(r.code, 0);
    assert.equal(given[0], w.P, 'run-group passes the paths of its state');
    assert.equal(jsonLines(w.dir, 'A.jsonl').length, 3);
    assert.equal(JSON.parse(readFileSync(join(w.dir, 'RAW', 'rows', 'smoke-gate.json'), 'utf8')).ok, true);
  });

  const OPEN = 'conditional-twin/uncapped/unresolved-trigger-0/0';
  const TRIGGERED = 'shipped/gen-v4/20x20-hell-1/23';
  const openWorld = (/** @type {string} */ name) => runWorld(name, {
    rows: [
      planRow(TRIGGERED, { cell: '20x20-hell-1', levelId: 'hell-1', variant: 'p2-gen4-diag', seed: 'landscape/20x20-hell-1/23', maxActive: 484, uniqueness: 'require', boardRows: rectRows(20, 20) }),
      planRow(OPEN, { component: 'conditional-twin', stage: 'B', arm: 'uncapped', cell: 'unresolved-trigger-0', rep: 0, seed: null, rowLimitS: 260, open: true, variant: undefined, levelId: undefined, boardRows: undefined }),
    ],
    groups: [{ stage: 'B', group: 2, keys: [OPEN] }],
  });

  it('open slots resolve through the activation receipt', async () => {
    const none = openWorld('open-none');
    const refused = await go(none, { stage: 'B', invocation: 'B-1.1' });
    assert.equal(refused.code, 8);
    assert.match(refused.lines.join('\n'), /activation receipt required/);
    assert.equal(existsSync(none.marker), false);

    const mapped = openWorld('open-mapped');
    activate(mapped.dir, { slots: { [OPEN]: TRIGGERED } });
    const ran = await go(mapped, { stage: 'B', invocation: 'B-1.1' });
    assert.equal(ran.code, 0, ran.lines.join('\n'));
    const rows = jsonLines(mapped.dir, 'B.jsonl');
    assert.equal(rows.length, 1);
    assert.deepEqual(verifyRow(rows[0], rowContextOf(mapped.P)(rows[0])), { ok: true, problems: [] });
    assert.deepEqual([rows[0].key, rows[0].variant, rows[0].component, rows[0].arm, rows[0].cell, rows[0].rep, rows[0].seed, rows[0].uniqueness],
      ['conditional-twin/uncapped/20x20-hell-1/23', 'p2-uncapped-diag', 'conditional-twin', 'uncapped', '20x20-hell-1', 23, 'landscape/20x20-hell-1/23', 'require']);
    const matrix = JSON.parse(readFileSync(join(mapped.dir, 'RAW', 'raw', 'conditional-twin~uncapped~20x20-hell-1~23', 'matrix.json'), 'utf8'));
    assert.deepEqual([matrix.cases[0].maxActive, matrix.cases[0].levelId, matrix.cases[0].boardRows.length], [484, 'hell-1', 20]);
    const [started] = jsonLines(mapped.dir, 'B.status.jsonl');
    assert.equal(started.key, 'conditional-twin/uncapped/20x20-hell-1/23');
    assert.equal(launched(mapped)[0].startsWith('conditional-twin~uncapped~20x20-hell-1~23'), true);

    const inactive = openWorld('open-null');
    activate(inactive.dir, { slots: { [OPEN]: null } });
    const skipped = await go(inactive, { stage: 'B', invocation: 'B-1.1' });
    assert.deepEqual(skipped, { code: 0, lines: [] });
    assert.equal(jsonLines(inactive.dir, 'B.status.jsonl').length, 0);
    assert.equal(existsSync(inactive.marker), false);
  });

  it('an activation for another plan is refused', async () => {
    const w = openWorld('open-foreign');
    activate(w.dir, { slots: { [OPEN]: null }, planSha256: 'f'.repeat(64) });
    const r = await go(w, { stage: 'B', invocation: 'B-1.1' });
    assert.equal(r.code, 8);
    assert.match(r.lines.join('\n'), /activation receipt does not match the plan/);
    const other = openWorld('open-foreign-seal');
    activate(other.dir, { slots: { [OPEN]: null }, sealSha256: 'f'.repeat(64) });
    assert.match((await go(other, { stage: 'B', invocation: 'B-1.1' })).lines.join('\n'), /does not match the seal/);
  });

  it('overflow groups come from the receipt', async () => {
    const t = 'shipped/gen-v4/10x10-nightmare/21';
    const w = runWorld('overflow', { rows: [planRow(t)], groups: [{ stage: 'B', group: 1, keys: [] }] });
    assert.equal((await go(w, { stage: 'B', group: undefined, overflowGroup: 1, invocation: 'B-o1.1' })).code, 8);
    activate(w.dir, { overflow: { keys: [t], groups: [[t]] } });
    const r = await go(w, { stage: 'B', group: undefined, overflowGroup: 1, invocation: 'B-o1.1' });
    assert.equal(r.code, 0, r.lines.join('\n'));
    const rows = jsonLines(w.dir, 'B.jsonl');
    assert.equal(rows.length, 1);
    assert.deepEqual([rows[0].key, rows[0].variant, rows[0].group], ['conditional-twin/uncapped/10x10-nightmare/21', 'p2-uncapped', 'o1']);
    assert.equal(jsonLines(w.dir, 'B.status.jsonl')[0].group, 'o1');
    const twin = rowContextOf(w.P)(rows[0]);
    assert.deepEqual([twin.expected?.stage, twin.expected?.variant], ['B', 'p2-uncapped']);
    assert.deepEqual(verifyRow(rows[0], twin), { ok: true, problems: [] });
    assert.equal(JSON.parse(readFileSync(join(w.dir, 'RAW', 'raw', 'conditional-twin~uncapped~10x10-nightmare~21', 'receipt.json'), 'utf8')).group, 'o1');
    assert.equal((await go(w, { stage: 'B', group: undefined, overflowGroup: 2, invocation: 'B-o2.1' })).code, 8);
  });

  it('status counts the keys of each group', async () => {
    const w = runWorld('status', { rows: [planRow(K1), planRow(K2), planRow('shipped/gen-v4/10x10-nightmare/22')], groups: [{ stage: 'A', group: 2, keys: [K1, K2, 'shipped/gen-v4/10x10-nightmare/22'] }] });
    writeFileSync(join(w.dir, 'RAW', 'rows', 'A.status.jsonl'), [
      { t: 'start', key: K1 }, { t: 'done', key: K1 }, { t: 'start', key: K2 }, { t: 'interrupted', key: K2, cause: 'no-report' },
    ].map((l) => `${JSON.stringify(l)}\r\n`).join(''));
    const r = p2(['status', '--stage', 'A', '--state', w.dir]);
    assert.equal(r.status, 0, r.out);
    assert.equal(r.out.trim(), 'group 2: done 1 interrupted 1 inactive 0 pending 1');
  });
});

describe('publication', () => {
  const K1 = 'shipped/gen-v4/10x10-nightmare/20';
  const K2 = 'shipped/gen-v4/10x10-nightmare/21';
  const K3 = 'shipped/gen-v4/12x12-nightmare/22';

  /** A finished group of three rows, two cells. @param {string} name */
  async function finished(name) {
    const w = runWorld(name, {
      rows: [planRow(K1), planRow(K2), planRow(K3, { cell: '12x12-nightmare', seed: 'landscape/12x12-nightmare/22', boardRows: rectRows(12, 12) })],
      groups: [{ stage: 'A', group: 2, keys: [K1, K2, K3] }],
    });
    assert.equal((await go(w)).code, 0);
    const rowsDir = join(w.dir, 'rows-copy');
    mkdirSync(rowsDir, { recursive: true });
    writeFileSync(join(rowsDir, 'A.jsonl'), readFileSync(join(w.dir, 'RAW', 'rows', 'A.jsonl')));
    return { ...w, rowsDir, out: join(w.dir, 'out') };
  }

  it('publish is write-once', async () => {
    const w = await finished('publish');
    const lines = readFileSync(join(w.rowsDir, 'A.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 3);
    const args = ['publish', '--stage', 'A', '--out', w.out, '--rows', w.rowsDir, '--state', w.dir];
    const first = p2(args);
    assert.equal(first.status, 0, first.out);
    const jsonl = readFileSync(join(w.out, 'A.jsonl'), 'utf8');
    assert.equal(jsonl, lines.map((l) => `${l}\r\n`).join(''));
    const sha = sha256Hex(Buffer.from(jsonl, 'utf8'));
    assert.equal(first.out.trim(), `publish: A 3 rows ${sha}`);
    assert.equal(readFileSync(join(w.out, 'A.sha256'), 'utf8'), `${sha}\r\n`);
    const md = readFileSync(join(w.out, 'A.md'), 'utf8');
    assert.match(md, /\| shipped \| gen-v4 \| 10x10-nightmare \| 2 \|\r\n\| shipped \| gen-v4 \| 12x12-nightmare \| 1 \|\r\n$/);
    const before = [jsonl, md, `${sha}\r\n`];
    const second = p2(args);
    assert.equal(second.status, 0, second.out);
    assert.deepEqual(['A.jsonl', 'A.md', 'A.sha256'].map((f) => readFileSync(join(w.out, f), 'utf8')), before);
    writeFileSync(join(w.rowsDir, 'A.jsonl'), `${lines.slice(0, 2).join('\r\n')}\r\n`);
    const third = p2(args);
    assert.equal(third.status, 3, third.out);
    assert.deepEqual(['A.jsonl', 'A.md', 'A.sha256'].map((f) => readFileSync(join(w.out, f), 'utf8')), before);
    const fresh = p2(['publish', '--stage', 'A', '--out', join(w.dir, 'out2'), '--rows', w.rowsDir, '--state', w.dir]);
    assert.equal(fresh.status, 0, fresh.out);
    assert.equal(existsSync(join(w.dir, 'out2', 'A.sha256')), true);
  });

  it('publication refuses a bad binding', async () => {
    const w = await finished('publish-bad');
    const rows = readFileSync(join(w.rowsDir, 'A.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    rows[0].receipt = 'f'.repeat(64);
    writeFileSync(join(w.rowsDir, 'A.jsonl'), rows.map((r) => `${JSON.stringify(r)}\r\n`).join(''));
    const r = p2(['publish', '--stage', 'A', '--out', w.out, '--rows', w.rowsDir, '--state', w.dir]);
    assert.equal(r.status, 9, r.out);
    assert.equal(r.out.trim(), `publish: refused ${K1}: receipt hash`);
    assert.equal(existsSync(w.out), false);
  });

  it('publication refuses an unreconciled key', async () => {
    const w = await finished('publish-open');
    const status = join(w.dir, 'RAW', 'rows', 'A.status.jsonl');
    writeFileSync(status, `${readFileSync(status, 'utf8')}${JSON.stringify({ t: 'start', key: 'k1', group: 2, invocation: 'A-2.2', sealSha256: sealOf(w.dir) })}\r\n`);
    const r = p2(['publish', '--stage', 'A', '--out', w.out, '--rows', w.rowsDir, '--state', w.dir]);
    assert.equal(r.status, 9, r.out);
    assert.equal(r.out.trim(), 'publish: unreconciled k1 (run its group again)');
    assert.equal(existsSync(w.out), false);
  });

  it('a published row with a later bad binding is marked', async () => {
    const w = await finished('publish-later');
    assert.equal(p2(['publish', '--stage', 'A', '--out', w.out, '--rows', w.rowsDir, '--state', w.dir]).status, 0);
    const ctxOf = rowContextOf(w.P);
    assert.deepEqual(loadSnapshot(w.out, 'A', ctxOf).rows.map((r) => r.binding.ok), [true, true, true]);
    const report = join(w.dir, 'RAW', 'raw', K2.replaceAll('/', '~'), 'report.json');
    writeFileSync(report, `${readFileSync(report, 'utf8')} `);
    const { sha256, rows } = loadSnapshot(w.out, 'A', ctxOf);
    assert.equal(sha256, sha256Hex(readFileSync(join(w.out, 'A.jsonl'))));
    assert.deepEqual(rows.map((r) => [r.key, r.binding.ok]), [[K1, true], [K2, false], [K3, true]]);
    assert.ok(rows[1].binding.problems.includes('report hash'));
    writeFileSync(join(w.out, 'A.sha256'), `${'0'.repeat(64)}\r\n`);
    assert.throws(() => loadSnapshot(w.out, 'A', ctxOf), /^Error: snapshot A hash$/);
  });
});

const MIB = 1024 * 1024;

/** The details of a run with ten puzzles. The keys derive from the cell and the rep, so two arms of one request agree. @param {string} cell @param {number} rep */
function detailsOf(cell, rep) {
  const level = cell.endsWith('-hell-1') ? 'hell-1' : cell.endsWith('-master') ? 'master' : 'nightmare';
  const score = { nightmare: 60, 'hell-1': 90, master: 45 }[level];
  return {
    K: 30,
    igSetKey: sha256Hex(`set/${cell}/${rep}`),
    igPuzzleKeys: Array.from({ length: 10 }, (_, i) => sha256Hex(`${cell}/${rep}/${i}`)),
    resultDigest: sha256Hex(`result/${cell}/${rep}`),
    puzzles: Array.from({ length: 10 }, () => ({ clues: 20, score, level })),
  };
}

const LEDGER = {
  complete: true, problems: [], calls: 1, ended: 1, terminated: 0, open: 0, lo: 100, hi: 100, ratingWork: 100, countWork: 0, outcomes: [], rerateStarts: { close: 0, rescue: 0, rerate: 0 },
};

/**
 * A published row line made by hand (no raw folder): ten puzzles at 1,000 ms unless `over` says otherwise.
 * @param {string} component @param {string} arm @param {string} cell @param {number} rep @param {Record<string, any>} [over] Run fields. @param {Record<string, any>} [extra] Row fields.
 */
function hand(component, arm, cell, rep, over = {}, extra = {}) {
  const key = `${component}/${arm}/${cell}/${rep}`;
  const seed = `landscape/${cell}/${rep}`;
  const run = newRunRecord({
    caseId: cell, seed, rep, acceptedCount: 10, tenthReadyMs: 1000, responseMs: 1500, peakProcessBytes: 500 * MIB, peakAccountedBytes: 100 * MIB, details: detailsOf(cell, rep), ...over,
  });
  return { key, fileKey: key.replaceAll('/', '~'), stage: 'A', component, arm, cell, rep, seed, run, telemetry: null, ledger: LEDGER, ...extra };
}

const REP_LIST = Array.from({ length: 20 }, (_, i) => 20 + i);
/** @param {string} component @param {string} arm @param {string} cell @param {Record<string, any> | ((rep: number) => Record<string, any>)} [over] @param {Record<string, any>} [extra] @param {number[]} [reps] */
const handRows = (component, arm, cell, over = {}, extra = {}, reps = REP_LIST) => reps.map((rep) => hand(component, arm, cell, rep, typeof over === 'function' ? over(rep) : over, extra));
/** A shipped arm at 1,000 ms and today's at 2,000 ms: the ratio is 2. @param {string} cell @param {Record<string, any>} [extra] */
const controlRows = (cell, extra = {}) => [
  ...handRows('shipped', 'gen-v4', cell, {}, extra),
  ...handRows('baseline-control', 'today', cell, { tenthReadyMs: 2000, responseMs: 2500 }, extra),
];
/** @param {{ id: string, stage: string }[]} gates @param {string} id */
const gateOf = (gates, id) => /** @type {any} */ (gates.find((g) => g.id === id));

describe('the comparator', () => {
  const O = 'docs/improve-generating/evidence/frozen';

  it('oracles follow the table', () => {
    /** @type {[string, string, string, string | null][]} */
    const cases = [
      ['shipped', 'gen-v4', '14x14-nightmare', `${O}/V4-S4/fr-frozen/val-14x14-nightmare.runs.json`],
      ['shipped', 'gen-v4', '15x20-nightmare', `${O}/V4-S4/fr-frozen-none/val-15x20-nightmare.runs.json`],
      ['shipped', 'gen-v4', '26x26-nightmare', `${O}/V4-S4/log-link/val-26x26-nightmare.runs.json`],
      ['baseline-control', 'today', '10x10-nightmare', `${O}/V4-S4/log-link/val-10x10-nightmare.runs.json`],
      ['shipped-master', 'gen-v4', '10x10-master', `${O}/V4-S4/log-link/master-10x10-master.runs.json`],
      ['non-table', 'gen-v4', '11x11-nightmare', null],
      ['conditional-twin', 'uncapped', '14x14-hell-1', `${O}/V4-S4C/fr-frozen-none-uncapped/val-14x14-hell-1.runs.json`],
      ['conditional-twin', 'uncapped', '16x16-nightmare', `${O}/V4-S4C/fr-frozen-uncapped/val-16x16-nightmare.runs.json`],
      ['smoke', 'gen-v4', '20x20-hell-1', `${O}/V4-S4/fr-frozen-none/val-20x20-hell-1.runs.json`],
      ['baseline-master', 'today', '10x10-master', `${O}/V4-S4/log-link/master-10x10-master.runs.json`],
      ['n-mid-no-screen', 'no-screen', '16x16-nightmare', `${O}/V4-S4/fr-frozen-none/val-16x16-nightmare.runs.json`],
      ['require', 'gen-v4', '22x22-nightmare', null],
      ['baseline-control', 'today', '14x14-hell-1', null],
    ];
    for (const [component, arm, cell, path] of cases) {
      assert.equal(oracleOf({ component, arm, cell })?.path ?? null, path, `${component} ${arm} ${cell}`);
    }
    assert.equal(oracleOf({ component: 'shipped', arm: 'gen-v4', cell: '14x14-nightmare' })?.arm, 'fr-frozen');
    assert.equal(oracleOf({ component: 'shipped', arm: 'gen-v4', cell: '14x14-nightmare' }, join(RUN, 'no-such-root')), null, 'a cell without the file has no oracle');
  });

  /** @param {number} n @param {Record<string, any>} [over] @param {Record<string, any>} [details] */
  const runOf = (n, over = {}, details = {}) => ({
    acceptedCount: n, partialReason: null, details: { igSetKey: 'S', igPuzzleKeys: Array.from({ length: n }, (_, i) => `k${i}`), resultDigest: 'R', ...details }, ...over,
  });

  it('exact equality without a wall-clock cause', () => {
    assert.deepEqual(equality(runOf(10), runOf(10)), { verdict: 'equal' });
    const keys = Array.from({ length: 10 }, (_, i) => (i === 4 ? 'x' : `k${i}`));
    assert.deepEqual(equality(runOf(10, {}, { igPuzzleKeys: keys }), runOf(10)), { verdict: 'differ', path: 'details.igPuzzleKeys.4' });
    assert.deepEqual(equality(runOf(4, { partialReason: 'layouts-not-found' }), runOf(4, { partialReason: 'layouts-not-found' })), { verdict: 'equal' });
    assert.deepEqual(equality(runOf(4, { partialReason: 'layouts-not-found' }), runOf(5, { partialReason: 'layouts-not-found' })), { verdict: 'differ', path: 'acceptedCount' });
    assert.deepEqual(equality(runOf(10, {}, { igSetKey: 'T' }), runOf(10)), { verdict: 'differ', path: 'details.igSetKey' });
    assert.deepEqual(equality(runOf(10, {}, { resultDigest: 'Q' }), runOf(10)), { verdict: 'differ', path: 'details.resultDigest' });
    assert.equal(equality(runOf(10, { details: { igSetKey: 'S', resultDigest: 'R' } }), runOf(10)).verdict, 'no-evidence', 'a missing key list');
    assert.deepEqual(equality(runOf(10), null), { verdict: 'no-evidence', why: 'no oracle row' });
  });

  it('prefix equality only for the five causes', () => {
    assert.deepEqual(equality(runOf(7, { partialReason: 'set:reserve-cut' }), runOf(10)), { verdict: 'prefix-equal', n: 7 });
    assert.deepEqual(equality(runOf(7, { partialReason: 'set:no-window-below' }), runOf(10)), { verdict: 'differ', path: 'acceptedCount' });
    for (const cause of ['time-limit', 'set:time-limit', 'set:reserve-cut', 'response-bound', 'set:response-bound']) {
      assert.deepEqual(equality(runOf(7, { partialReason: cause }), runOf(10)), { verdict: 'prefix-equal', n: 7 }, cause);
      assert.deepEqual(equality(runOf(10), runOf(7, { partialReason: cause })), { verdict: 'prefix-equal', n: 7 }, `${cause} on the oracle side`);
    }
    const keys = Array.from({ length: 7 }, (_, i) => (i === 5 ? 'x' : `k${i}`));
    assert.deepEqual(equality(runOf(7, { partialReason: 'time-limit' }, { igPuzzleKeys: keys }), runOf(10)), { verdict: 'differ', path: 'details.igPuzzleKeys.5' });
    assert.deepEqual(equality(runOf(7, { partialReason: 'time-limit' }, { igSetKey: 'T' }), runOf(10)), { verdict: 'differ', path: 'details.igSetKey' });
  });

  it('an empty prefix is no evidence', () => {
    assert.deepEqual(equality(runOf(0, { partialReason: 'time-limit' }), runOf(10)), { verdict: 'no-evidence', why: 'empty prefix' });
    assert.equal(equality(runOf(7, { partialReason: 'set:reserve-cut', details: {} }), runOf(10)).verdict, 'no-evidence', 'a run without a set key');
  });

  it('cohorts keep components, arms and cells apart', () => {
    const rows = [hand('shipped', 'gen-v4', 'a', 20), hand('smoke', 'gen-v4', 'a', 21), hand('baseline-control', 'today', 'a', 20), hand('shipped', 'gen-v4', 'b', 20)];
    const c = cohorts(rows);
    assert.deepEqual(Object.keys(c).sort(), ['baseline-control', 'shipped', 'smoke']);
    assert.deepEqual(Object.keys(c.shipped['gen-v4']).sort(), ['a', 'b']);
    assert.equal(c.smoke['gen-v4'].a[0].rep, 21);
  });

  it('a smoke row does not complete a main cohort', () => {
    const cell = '3x29-nightmare';
    const today = handRows('baseline-control', 'today', cell, { tenthReadyMs: 2000, responseMs: 2500 });
    const partial = [...handRows('shipped', 'gen-v4', cell).slice(0, 19), hand('smoke', 'gen-v4', cell, 39), ...today];
    const entry = (/** @type {any[]} */ rows) => gateOf(stageGates('A', { rows }), 'A1').detail.cells.find((/** @type {any} */ c) => c.cell === cell);
    assert.equal(entry(partial).verdict, 'incomplete');
    assert.match(entry(partial).reasons.join(), /missing row: side a rep 39/);
    assert.equal(entry([...handRows('shipped', 'gen-v4', cell), ...today]).verdict, 'pass', 'the same cell with its 20 main rows passes');
  });

  it('memory limits', () => {
    const big = hand('shipped', 'gen-v4', '3x29-nightmare', 20, { peakProcessBytes: 1700 * MIB });
    const result = memory([big, hand('shipped', 'gen-v4', '3x29-nightmare', 21)]);
    assert.equal(result.status, 'fail');
    assert.deepEqual(result.problems, [`${big.key}: peakProcessBytes 1700 MiB exceeds 1536 MiB`]);
    const a6 = gateOf(stageGates('A', { rows: [big] }), 'A6');
    assert.equal(a6.status, 'fail');
    assert.match(a6.detail.problems[0], new RegExp(big.key));
    assert.equal(memory([hand('shipped', 'gen-v4', 'c', 20, { peakProcessBytes: 1536 * MIB, peakAccountedBytes: 1196 * MIB })]).status, 'pass', 'at most');
    assert.equal(memory([hand('shipped', 'gen-v4', 'c', 20, { peakAccountedBytes: 1196 * MIB + 1 })]).status, 'fail');
    assert.equal(memory([hand('shipped', 'gen-v4', 'c', 20, { errors: [{ phase: 'sampling', code: 'model-too-large', message: 'x' }] })]).status, 'fail');
    assert.equal(memory([hand('shipped', 'gen-v4', 'c', 20, { peakProcessBytes: null })]).status, 'incomplete');
    assert.equal(memory([]).status, 'incomplete');
    assert.equal(memory([], [{ key: 'k' }]).status, 'incomplete', 'a refused row is missing evidence');
  });

  it('the 18x18 control is completion only', () => {
    const slow = (/** @type {number} */ rep) => (rep === 39 ? { acceptedCount: 3, tenthReadyMs: null, partialReason: 'time-limit', responseMs: 120000 } : { tenthReadyMs: 100000, responseMs: 100500 });
    const rows = [
      ...handRows('shipped', 'gen-v4', '18x18-nightmare', slow),
      ...handRows('baseline-control', 'today', '18x18-nightmare', { tenthReadyMs: 1000 }),
    ];
    const b2 = gateOf(stageGates('B', { rows }), 'B2');
    const entry = b2.detail.cells.find((/** @type {any} */ c) => c.cell === '18x18-nightmare');
    assert.equal(entry.verdict, 'pass');
    assert.equal(entry.reachedTen, 19);
    assert.equal('noRegression' in entry, false, 'no lower bound is reported');
    assert.equal(b2.status, 'incomplete', 'the other cells of B2 have no rows');
    const three = rows.map((r) => (r.component === 'shipped' && r.rep >= 37 ? { ...r, run: { ...r.run, acceptedCount: 3, tenthReadyMs: null } } : r));
    assert.equal(gateOf(stageGates('B', { rows: three }), 'B2').detail.cells.find((/** @type {any} */ c) => c.cell === '18x18-nightmare').verdict, 'fail', 'three short requests fail');
  });

  it('stage B computes its gates from hand-made rows', () => {
    const B = (/** @type {Record<string, any>[]} */ rows) => rows.map((r) => ({ ...r, stage: 'B' }));
    const noScreen = { ledger: { ...LEDGER, lo: 200, hi: 200 } };
    const slow = { tenthReadyMs: 2000, responseMs: 2500 };
    const sentinelCells = ['11x11', '18x19', '21x21'].map((c) => `${c}-nightmare`);
    const sentinels = [
      ...sentinelCells.flatMap((c) => [...handRows('non-table', 'gen-v4', c), ...handRows('non-table', 'today', c, slow)]),
      ...handRows('non-table', 'gen-v4', '15x15-nightmare'),
    ];
    const rows = [...B([
      ...['12x12', '14x14', '15x15b10', '16x16', '15x20'].flatMap((c) => handRows('shipped', 'gen-v4', `${c}-nightmare`)),
      ...['14x14', '15x15b10', '16x16'].flatMap((c) => handRows('n-mid-no-screen', 'no-screen', `${c}-nightmare`, slow, noScreen)),
      ...['10x10', '18x20', '20x20', '20x21', '24x24', '26x26'].flatMap((c) => controlRows(`${c}-nightmare`)),
      ...handRows('shipped', 'gen-v4', '18x18-nightmare'),
      ...['14x14', '20x20', '24x24', '26x26'].flatMap((c) => handRows('shipped', 'gen-v4', `${c}-hell-1`)),
      ...['6x10', '3x29', '10x10', '12x12', '14x14', '15x15b10', '16x16', '15x20', '18x18', '18x20', '20x20', '20x21', '32x15', '22x22', '24x24', '26x26'].flatMap((c) => [
        ...handRows('shipped-master', 'gen-v4', `${c}-master`, {}, {}, [20, 21, 22, 23, 24]),
        ...handRows('baseline-master', 'today', `${c}-master`, {}, {}, [20, 21, 22, 23, 24]),
      ]),
    ]), ...sentinels];
    const journals = Object.fromEntries(rows.filter((r) => r.component === 'shipped' && /^(12x12|14x14|15x15b10|16x16|15x20)-nightmare$/.test(r.cell)).map((r) => [r.fileKey, []]));
    const equalityEntries = rows.filter((r) => r.cell === '26x26-nightmare' && r.component === 'shipped').map((r, i) => ({ key: r.key, oracle: 'o', verdict: i % 2 === 0 ? 'equal' : 'prefix-equal' }));
    const gates = stageGates('B', { rows, journals, equality: equalityEntries });
    assert.deepEqual(gates.map((g) => [g.id, g.status]), [['B1', 'pass'], ['B2', 'pass'], ['B3', 'pass'], ['B4', 'pass'], ['B5', 'pass'], ['B6', 'pass'], ['B7', 'pass'], ['B8', 'not-due']]);
    assert.ok(gates.slice(0, 7).every((g) => g.rows.length > 0));
    assert.equal(gateOf(gates, 'B4').detail.verdict, 'admitted');
    const b2 = gateOf(gates, 'B2').detail.cells.find((/** @type {any} */ c) => c.cell === '26x26-nightmare');
    assert.deepEqual(b2.identity, { equal: 10, prefixEqual: 10, noEvidence: 0, missing: 0 });
    assert.ok(b2.timing.noRegression, 'the timing of 26x26 is reported');
    assert.ok(gateOf(gates, 'B5').detail.paired.length > 0);
    assert.deepEqual(
      gateOf(gates, 'B5').detail.paired.filter((/** @type {any} */ p) => p.pair === 'non-table/gen-v4 vs non-table/today').map((/** @type {any} */ p) => p.cell).sort(),
      sentinelCells,
      'B5 pairs the sentinels',
    );
    // Without the journals B1 is incomplete, and so is the class's cell gate.
    const without = stageGates('B', { rows, equality: equalityEntries });
    assert.equal(gateOf(without, 'B1').status, 'incomplete');
    assert.equal(gateOf(without, 'B4').status, 'incomplete');
    assert.equal(gateOf(without, 'B4').detail.decidedBy, 'cell-gate');
    // A differing Master request fails the cell; a screen that is no faster fails the class.
    const swapped = rows.map((r) => (r.component === 'shipped-master' && r.cell === '10x10-master' && r.rep === 22 ? { ...r, run: { ...r.run, details: detailsOf('other', 1) } } : r));
    assert.equal(gateOf(stageGates('B', { rows: swapped, journals, equality: equalityEntries }), 'B3').status, 'fail');
    const noFaster = rows.map((r) => (r.component === 'n-mid-no-screen' ? { ...r, run: { ...r.run, tenthReadyMs: 1000, responseMs: 1500 } } : r));
    assert.equal(gateOf(stageGates('B', { rows: noFaster, journals, equality: equalityEntries }), 'B4').detail.decidedBy, 'faster');
  });
});

/** Builds the raw folder of one row (receipt, report, one journal file) and returns its published line, as `run-group` would. */
function fabricate(/** @type {string} */ dir, /** @type {any} */ seal, /** @type {string} */ sealSha256, /** @type {any} */ r, /** @type {Record<string, any>} */ over, /** @type {{ name: string, text: string }[]} */ extra = []) {
  const raw = join(dir, 'RAW', 'raw', r.fileKey);
  mkdirSync(join(raw, 'journal'), { recursive: true });
  const journalName = `${r.fileKey}.row.jsonl`;
  const files = [{ name: journalName, text: `${JSON.stringify({ t: 'row', row: r.fileKey, seed: r.seed })}\n` }, ...extra];
  const journal = files.map(({ name, text }) => {
    const bytes = Buffer.from(text);
    writeFileSync(join(raw, 'journal', name), bytes);
    return { name, bytes: bytes.length, sha256: sha256Hex(bytes) };
  }).sort((a, b) => (a.name < b.name ? -1 : 1));
  const copy = seal.copies.find((/** @type {any} */ c) => c.id === r.variant);
  const run = newRunRecord({
    caseId: r.cell, seed: r.seed, rep: r.rep, sourceDigest: copy.runtimeDigest, sourceCommit: `${r.variant} ${seal.commit}`,
    acceptedCount: 10, tenthReadyMs: 1000, responseMs: 1500, peakProcessBytes: 500 * MIB, peakAccountedBytes: 100 * MIB, ...over,
  });
  const reportText = JSON.stringify({ meta: { matrixDigest: matrixDigest(rowMatrix(r)) }, runs: [run] });
  writeFileSync(join(raw, 'report.json'), reportText);
  const receiptBytes = Buffer.from(JSON.stringify({
    key: r.key,
    fileKey: r.fileKey,
    stage: r.stage,
    group: r.group,
    invocation: 'A-1.1',
    sealSha256,
    variant: r.variant,
    copy: { treeId: copy.treeId, copyDigest: copy.copyDigest },
    report: { path: `raw/${r.fileKey}/report.json`, sha256: sha256Hex(Buffer.from(reportText)) },
    journal,
    childExit: 0,
    startedAt: 'x',
    endedAt: 'y',
  }));
  writeFileSync(join(raw, 'receipt.json'), receiptBytes);
  return {
    key: r.key, fileKey: r.fileKey, stage: r.stage, group: r.group, component: r.component, arm: r.arm, variant: r.variant, cell: r.cell, rep: r.rep, seed: r.seed,
    uniqueness: r.uniqueness, sealSha256, run, telemetry: null, receipt: sha256Hex(receiptBytes), ledger: LEDGER,
  };
}

let realPlan;
/** @returns {any} The approved plan of the audit (the same one `plan` writes). */
const planOf = () => (realPlan ??= buildPlan().plan);
const VARIANT_IDS = ['p2-gen4', 'p2-gen4-diag', 'p2-none', 'p2-uncapped', 'p2-uncapped-diag', 'p2-today'];

/**
 * A state root with a seal, the plan rows and a published snapshot of their fabricated rows.
 * @param {string} name
 * @param {{ rows: any[], folder?: string, runFor?: (row: any) => Record<string, any>, journalFor?: (row: any) => { name: string, text: string }[] }} o
 * `folder` is `rows` (not smoke) or `rows-smoke` (smoke only); each row goes to `<folder>/<row.stage>.jsonl`.
 */
function world(name, { rows, folder = 'rows', runFor = () => ({}), journalFor = () => [] }) {
  const dir = state(name);
  const sources = [...new Set([BROWSER_PAGE, ...SOURCE_FILES, ...BROWSER_GENERATOR_SOURCES])].sort();
  const copies = VARIANT_IDS.map((id) => ({ id, source: id === 'p2-today' ? 'today' : 'gen-v4', treeId: `t-${id}`, copyDigest: `d-${id}`, runtimeDigest: `rd-${id}` }));
  const seal = { format: 'p2-seal', version: 1, commit: 'c0ffee', sourceDigest: 'sd-1', copies, tools: [], inputs: sources.map((path) => ({ path, sha256: sha256Hex(path) })) };
  writeFileSync(join(dir, 'E', 'seal', 'seal.json'), `${JSON.stringify(seal, null, 2)}\r\n`);
  const sealSha256 = sealOf(dir);
  mkdirSync(join(dir, 'E', 'plan'), { recursive: true });
  writeFileSync(join(dir, 'E', 'plan', 'plan.json'), `${JSON.stringify({ format: 'p2-plan', version: 1, rows, groups: [] }, null, 2)}\r\n`);
  const lines = rows.filter((r) => (r.component === 'smoke') === (folder === 'rows-smoke')).map((r) => fabricate(dir, seal, sealSha256, r, runFor(r), journalFor(r)));
  mkdirSync(join(dir, 'E', folder), { recursive: true });
  for (const stage of [...new Set(lines.map((l) => l.stage))]) {
    const jsonl = lines.filter((l) => l.stage === stage).map((l) => `${JSON.stringify(l)}\r\n`).join('');
    writeFileSync(join(dir, 'E', folder, `${stage}.jsonl`), jsonl);
    writeFileSync(join(dir, 'E', folder, `${stage}.sha256`), `${sha256Hex(Buffer.from(jsonl))}\r\n`);
  }
  const out = join(dir, 'out');
  return {
    dir,
    P: pathsOf(dir),
    seal,
    sealSha256,
    lines,
    out,
    /** @param {string} [stage] */
    report: (stage = 'A') => p2(['report', '--stage', stage, '--out', out, '--state', dir]),
    read: () => JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')),
  };
}

/** @param {ReturnType<typeof world>} w @param {string[]} [skip] The checks without a receipt. */
function writeBrowser(w, skip = []) {
  for (const check of BROWSER_CHECKS.filter((c) => !skip.includes(c))) {
    mkdirSync(join(w.dir, 'E', 'browser', check), { recursive: true });
    writeFileSync(join(w.dir, 'E', 'browser', check, 'receipt.json'), `${JSON.stringify({
      format: 'p2-browser', version: 1, page: BROWSER_PAGE, check, status: 'pass', durationMs: 5000, startedAt: 'x', endedAt: 'y', edgePid: 1,
      consoleLines: [`CHECK-END PASS 5.0 s ${check}`], cleanup: null, sources: w.seal.inputs,
    }, null, 2)}\r\n`);
  }
}

/** @param {ReturnType<typeof world>} w @param {(items: any[]) => any[]} [mutate] */
function writeReplay(w, mutate = (items) => items) {
  const items = REPLAY_ITEMS.map((it) => ({
    n: it.n, cell: it.cell, uniqueness: it.uniqueness, copy: { id: it.copy, treeId: `t-${it.copy}` }, status: 'measured', reason: null,
    puzzles: [{ id: 'p1', kind: 'candidate', status: 'matched', steps: 1, bytes: 1, work: 1 }], maxima: {}, margin: 'ok',
  }));
  mkdirSync(join(w.dir, 'E', 'replay-probes'), { recursive: true });
  writeFileSync(join(w.dir, 'E', 'replay-probes', 'receipt.json'), `${JSON.stringify({ format: 'p2-replay-probes', version: 1, limits: {}, items: mutate(items), sources: { trees: [] } }, null, 2)}\r\n`);
}

/** @param {any} row @returns {Record<string, any>} The run of an A row: today's arm is the slower one. */
const aRun = (row) => ({
  tenthReadyMs: row.arm === 'today' ? 2000 : 1000,
  responseMs: row.arm === 'today' ? 2500 : 1500,
  ...(row.component === 'require' ? { certificates: { unique: 1, multiple: 0, notProved: 0, notChecked: 0 } } : {}),
});
const aRows = () => planOf().rows.filter((/** @type {any} */ r) => r.stage === 'A');
const statusesOf = (/** @type {any} */ report, /** @type {string} */ stage) => report.gates.filter((/** @type {any} */ g) => g.stage === stage).map((/** @type {any} */ g) => [g.id, g.status]);

describe('the report', () => {
  it('stage A is not vetoed by B\'s cells', () => {
    const w = world('report-a', { rows: aRows(), runFor: aRun });
    writeBrowser(w);
    writeReplay(w);
    const r = w.report();
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^report: A complete /);
    const report = w.read();
    assert.deepEqual(Object.keys(report), ['stage', 'status', 'snapshots', 'bindings', 'equality', 'gates', 'ledger']);
    assert.equal(report.status, 'complete');
    assert.deepEqual(statusesOf(report, 'A'), ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((id) => [id, 'pass']));
    assert.deepEqual(statusesOf(report, 'B'), ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'].map((id) => [id, 'not-due']));
    assert.deepEqual(report.bindings, []);
    assert.deepEqual(report.snapshots, [{ path: 'rows/A.jsonl', sha256: sha256Hex(readFileSync(join(w.dir, 'E', 'rows', 'A.jsonl'))) }]);
    assert.match(report.ledger, /^A spent 0\.000 s/);
    const a3 = report.gates.find((/** @type {any} */ g) => g.id === 'A3');
    assert.equal(a3.rows.length, 50);
    assert.deepEqual(a3.detail.cells.find((/** @type {any} */ c) => c.arm === 'today' && c.cell === '22x22-nightmare'), { arm: 'today', cell: '22x22-nightmare', rows: 5, reachedTen: 5, statuses: { valid: 5, invalid: 0, incorrect: 0, censored: 0, error: 0 }, unique: 5, budgetStops: 0, deadlineStops: 0 });
    const md = readFileSync(join(w.out, 'report.md'), 'utf8');
    assert.ok(md.includes('\r\n') && !/[^\r]\n/.test(md) && md.endsWith('\r\n'));
    assert.match(md, /## A1 \(stage A\): pass/);
    assert.match(md, /\| shipped\/gen-v4\/3x29-nightmare\/20 \|/);
    assert.equal(/ +\r\n/.test(md), false, 'no trailing whitespace');
  });

  it('a missing individual browser receipt is incomplete', () => {
    const w = world('report-late-fence', { rows: aRows(), runFor: aRun });
    writeBrowser(w, ['late-fence']);
    writeReplay(w);
    assert.equal(w.report().status, 0);
    const report = w.read();
    assert.equal(report.status, 'incomplete');
    const a5 = report.gates.find((/** @type {any} */ g) => g.id === 'A5');
    assert.equal(a5.status, 'incomplete');
    assert.deepEqual(a5.detail.problems, ['A5 late-fence: missing']);
    assert.deepEqual(statusesOf(report, 'A').filter(([id]) => id !== 'A5').map(([, s]) => s), Array(5).fill('pass'));
  });

  it('six individual browser receipts pass without an aggregate', () => {
    const w = world('report-six', { rows: aRows(), runFor: aRun });
    writeBrowser(w);
    writeReplay(w);
    assert.equal(existsSync(join(w.dir, 'E', 'browser', 'receipt.json')), false);
    assert.equal(w.report().status, 0);
    const a5 = w.read().gates.find((/** @type {any} */ g) => g.id === 'A5');
    assert.equal(a5.status, 'pass');
    assert.equal(a5.detail.checks.length, 6);
    writeFileSync(join(w.dir, 'E', 'browser', 'receipt.json'), '{"status":"fail"}\r\n');
    assert.equal(w.report().status, 0);
    assert.equal(w.read().gates.find((/** @type {any} */ g) => g.id === 'A5').status, 'pass', 'an aggregate file is never read');
  });

  it('a not-measured resource item leaves A4 incomplete, and B is refused without the owner line', () => {
    const w = world('report-a4', { rows: aRows(), runFor: aRun });
    writeBrowser(w);
    writeReplay(w, (items) => items.map((item) => (item.n === 7 ? { ...item, status: 'not-measured', puzzles: [] } : item)));
    assert.equal(w.report().status, 0);
    const report = w.read();
    assert.equal(report.status, 'incomplete');
    const a4 = report.gates.find((/** @type {any} */ g) => g.id === 'A4');
    assert.equal(a4.status, 'incomplete');
    assert.equal(a4.detail.items.length, 8);
    assert.deepEqual(a4.detail.items.map((/** @type {any} */ i) => i.n), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(a4.detail.items.filter((/** @type {any} */ i) => i.problems.length > 0).map((/** @type {any} */ i) => [i.n, i.status]), [[7, 'not-measured']]);
    const text = [
      `Seal: ${w.sealSha256}`,
      `Report A: ${sha256Hex(readFileSync(join(w.out, 'report.json')))}`,
      'Accepted by SA-Opus: 2026-11-26 10:00 +07:00',
      'Accepted by SA-Astra: 2026-11-26 10:05 +07:00',
      'Stage B: PROCEED',
      '',
    ].join('\r\n');
    const refused = checkReadout({ text, committed: true, sealSha256: w.sealSha256, reportSha256: sha256Hex(readFileSync(join(w.out, 'report.json'))), reportGates: report.gates });
    assert.equal(refused.ok, false);
    assert.match(refused.why, /Owner continuation/);
    const allowed = checkReadout({ text: `${text}Owner continuation: 1234567890\r\n`, committed: true, sealSha256: w.sealSha256, reportSha256: sha256Hex(readFileSync(join(w.out, 'report.json'))), reportGates: report.gates });
    assert.equal(allowed.ok, true);
  });

  it('a row with a bad binding is missing evidence', () => {
    const w = world('report-binding', { rows: aRows(), runFor: aRun });
    writeBrowser(w);
    writeReplay(w);
    const bad = w.lines.find((l) => l.component === 'shipped' && l.cell === '3x29-nightmare' && l.rep === 25);
    assert.ok(bad);
    const receipt = join(w.dir, 'RAW', 'raw', bad.fileKey, 'receipt.json');
    writeFileSync(receipt, `${readFileSync(receipt, 'utf8')} `);
    assert.equal(w.report().status, 0);
    const report = w.read();
    assert.deepEqual(report.bindings, [{ key: bad.key, problems: ['receipt hash'] }]);
    assert.equal(report.status, 'incomplete');
    const a1 = report.gates.find((/** @type {any} */ g) => g.id === 'A1');
    assert.equal(a1.status, 'incomplete');
    assert.equal(a1.detail.cells.find((/** @type {any} */ c) => c.cell === '3x29-nightmare').verdict, 'incomplete');
    assert.deepEqual(a1.detail.cells.filter((/** @type {any} */ c) => c.cell !== '3x29-nightmare').map((/** @type {any} */ c) => c.verdict), ['pass', 'pass']);
    assert.ok(!a1.rows.includes(bad.key), 'no statistic reads the row');
    assert.equal(report.gates.find((/** @type {any} */ g) => g.id === 'A6').status, 'incomplete');

    // A key that occurs twice has every line refused.
    const d = world('report-binding-dup', { rows: aRows(), runFor: aRun });
    writeBrowser(d);
    writeReplay(d);
    const again = d.lines.find((l) => l.key === 'shipped/gen-v4/3x29-nightmare/25');
    assert.ok(again);
    const file = join(d.dir, 'E', 'rows', 'A.jsonl');
    const jsonl = `${readFileSync(file, 'utf8')}${JSON.stringify(again)}\r\n`;
    writeFileSync(file, jsonl);
    writeFileSync(join(d.dir, 'E', 'rows', 'A.sha256'), `${sha256Hex(Buffer.from(jsonl))}\r\n`);
    assert.equal(d.report().status, 0);
    const dup = d.read();
    assert.deepEqual(dup.bindings, [{ key: again.key, problems: ['duplicate key'] }, { key: again.key, problems: ['duplicate key'] }]);
    const dupA1 = dup.gates.find((/** @type {any} */ g) => g.id === 'A1');
    assert.equal(dupA1.status, 'incomplete');
    assert.equal(dupA1.detail.cells.find((/** @type {any} */ c) => c.cell === '3x29-nightmare').verdict, 'incomplete');
    assert.ok(dup.gates.every((/** @type {any} */ g) => !g.rows.includes(again.key)), 'no gate reads the key');
  });

  it('an incorrect require row fails A3', () => {
    const key = 'require/gen-v4/22x22-nightmare/0';
    const w = world('report-incorrect', {
      rows: aRows(),
      runFor: (row) => ({ ...aRun(row), ...(row.key === key ? { errors: [{ phase: 'validation', code: 'invalid-puzzle', message: 'x' }] } : {}) }),
    });
    writeBrowser(w);
    writeReplay(w);
    assert.equal(w.report().status, 0);
    const a3 = w.read().gates.find((/** @type {any} */ g) => g.id === 'A3');
    assert.equal(a3.status, 'fail');
    assert.deepEqual(a3.detail.problems, [`A3 ${key}: incorrect (error validation/invalid-puzzle)`]);
    assert.equal(a3.detail.cells.find((/** @type {any} */ c) => c.arm === 'gen-v4' && c.cell === '22x22-nightmare').statuses.incorrect, 1);
  });

  it('stage B reads the bound journals of the failing cells', () => {
    const cells = new Set(['12x12', '14x14', '15x15b10', '16x16', '15x20'].map((c) => `${c}-nightmare`));
    const failing = planOf().rows.filter((/** @type {any} */ r) => r.stage === 'B' && r.component === 'shipped' && r.arm === 'gen-v4' && cells.has(r.cell));
    assert.equal(failing.length, 100);
    const rows = [...aRows(), ...failing];
    const P2_KEY = 'shipped/gen-v4/12x12-nightmare/20';
    const worker = (/** @type {any} */ r, /** @type {string[]} */ more = []) => ({ name: `${r.fileKey}.101.1.jsonl`, text: `${['{"t":"worker","pid":101,"threadId":1}', ...more].map((l) => `${l}\n`).join('')}` });
    const p2Line = `{"t":"phase","phase":"p2","call":"${P2_KEY.replaceAll('/', '~')}:101:1:1"}`;
    const entry = (/** @type {any} */ report, /** @type {string} */ cell) => report.gates.find((/** @type {any} */ g) => g.id === 'B1').detail.cells.find((/** @type {any} */ c) => c.cell === cell);

    const first = world('report-b-journals', { rows, runFor: aRun, journalFor: (r) => (r.stage === 'B' ? [worker(r, r.key === P2_KEY ? [p2Line] : [])] : []) });
    writeBrowser(first);
    writeReplay(first);
    assert.equal(first.report('B').status, 0);
    const one = first.read();
    assert.deepEqual(one.snapshots.map((/** @type {any} */ s) => s.path), ['rows/A.jsonl', 'rows/B.jsonl']);
    assert.deepEqual(one.bindings, []);
    assert.equal(one.gates.find((/** @type {any} */ g) => g.id === 'B1').status, 'fail');
    assert.equal(entry(one, '12x12-nightmare').deadEnds, 1);
    assert.deepEqual(entry(one, '12x12-nightmare').reasons, ['dead-end entry: row shipped~gen-v4~12x12-nightmare~20 has 1 call(s) in phase p2']);
    for (const cell of [...cells].filter((c) => c !== '12x12-nightmare')) {
      assert.deepEqual([entry(one, cell).verdict, entry(one, cell).deadEnds], ['pass', 0], cell);
    }

    const lost = 'shipped/gen-v4/14x14-nightmare/20';
    const cut = 'shipped/gen-v4/16x16-nightmare/20';
    const second = world('report-b-journals-lost', {
      rows,
      runFor: aRun,
      journalFor: (r) => (r.stage !== 'B' || r.key === lost ? [] : [worker(r, r.key === cut ? ['{"t":"phase"'] : [])]),
    });
    writeBrowser(second);
    writeReplay(second);
    assert.equal(second.report('B').status, 0);
    const two = second.read();
    assert.equal(two.gates.find((/** @type {any} */ g) => g.id === 'B1').status, 'incomplete');
    assert.deepEqual(entry(two, '14x14-nightmare').reasons, [`no journal: row ${lost.replaceAll('/', '~')}`]);
    assert.deepEqual(entry(two, '16x16-nightmare').reasons, [`no journal: row ${cut.replaceAll('/', '~')}`]);
    for (const cell of ['12x12-nightmare', '15x15b10-nightmare', '15x20-nightmare']) assert.equal(entry(two, cell).verdict, 'pass', cell);
  });

  it('a port defect stops interpretation', () => {
    const cell = '22x22-nightmare';
    const w = world('report-defect', {
      rows: aRows(),
      runFor: (row) => ({ ...aRun(row), ...(row.component === 'shipped' && row.cell === cell && row.rep === 20 ? { details: detailsOf(cell, 20) } : {}) }),
    });
    writeBrowser(w);
    writeReplay(w);
    const oracle = join(w.dir, ...'docs/improve-generating/evidence/frozen/V4-S4/fr-frozen-none/val-22x22-nightmare.runs.json'.split('/'));
    const writeOracle = (/** @type {Record<string, any>} */ details) => {
      mkdirSync(dirname(oracle), { recursive: true });
      writeFileSync(oracle, JSON.stringify({ meta: {}, shard: {}, rows: [{ rowKey: `${cell}~20`, caseId: cell, rep: 20, seed: `landscape/${cell}/20`, localRep: 0, run: { acceptedCount: 10, partialReason: null, details } }] }));
    };
    writeOracle(detailsOf(cell, 20));
    assert.equal(w.report().status, 0);
    const equal = w.read();
    assert.equal(equal.status, 'complete');
    assert.equal(equal.equality.length, 20);
    assert.deepEqual(equal.equality.find((/** @type {any} */ e) => e.verdict === 'equal'), { key: `shipped/gen-v4/${cell}/20`, oracle: 'docs/improve-generating/evidence/frozen/V4-S4/fr-frozen-none/val-22x22-nightmare.runs.json', verdict: 'equal' });
    assert.equal(equal.equality.filter((/** @type {any} */ e) => e.verdict === 'no-evidence').length, 19, 'a rep without an oracle row is no evidence, not a difference');
    const differing = detailsOf(cell, 20);
    differing.igPuzzleKeys[4] = sha256Hex('another');
    writeOracle(differing);
    const r = w.report();
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, new RegExp(`port defect: shipped/gen-v4/${cell}/20 differs at details.igPuzzleKeys.4`));
    const report = w.read();
    assert.equal(report.status, 'port-defect');
    assert.equal('gates' in report, false);
    assert.equal(report.equality.find((/** @type {any} */ e) => e.verdict === 'differ').path, 'details.igPuzzleKeys.4');
    assert.equal(existsSync(join(w.out, 'report.md')), false, 'no report.md for a port defect');
  });

  it('the smoke stage reads its own snapshot and leaves later gates not due', () => {
    const smokePlan = planOf().rows.filter((/** @type {any} */ r) => r.component === 'smoke');
    assert.equal(smokePlan.length, 8);
    const w = world('report-smoke', { rows: smokePlan, folder: 'rows-smoke', runFor: (row) => ({ details: detailsOf(row.cell, row.rep) }) });
    const oracleFor = (/** @type {string} */ cell) => (cell === '14x14-nightmare' ? 'V4-S4/fr-frozen' : cell === '26x26-nightmare' || cell.endsWith('-master') ? 'V4-S4/log-link' : 'V4-S4/fr-frozen-none');
    for (const row of smokePlan) {
      const file = join(w.dir, 'docs', 'improve-generating', 'evidence', 'frozen', ...oracleFor(row.cell).split('/'), `${row.cell.endsWith('-master') ? 'master' : 'val'}-${row.cell}.runs.json`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ meta: {}, shard: {}, rows: [{ rowKey: row.fileKey, caseId: row.cell, rep: 20, seed: row.seed, localRep: 0, run: { acceptedCount: 10, partialReason: null, details: detailsOf(row.cell, 20) } }] }));
    }
    for (const bundle of ['observer', 'certificate', 'prior-replay', 'legacy']) {
      mkdirSync(join(w.dir, 'E', 'proofs', bundle), { recursive: true });
      writeFileSync(join(w.dir, 'E', 'proofs', bundle, 'result.json'), `${JSON.stringify({ format: 'p2-proof', version: 1, bundle, status: 'pass', quick: false, cases: [], counts: {}, sources: { sourceDigest: 'sd-1', copies: [{ id: 'p2-gen4', treeId: 't-p2-gen4' }] } })}\r\n`);
    }
    const r = w.report('smoke');
    assert.equal(r.status, 0, r.out);
    const report = w.read();
    assert.equal(report.status, 'complete');
    assert.deepEqual(statusesOf(report, 'smoke'), [['S1', 'pass'], ['S2', 'pass']]);
    assert.ok(['A', 'B'].every((stage) => statusesOf(report, stage).every(([, s]) => s === 'not-due')));
    assert.equal(report.equality.length, 8);
    assert.equal(report.snapshots[0].path, 'rows-smoke/A.jsonl');
    rmSync(join(w.dir, 'E', 'proofs', 'legacy'), { recursive: true });
    assert.equal(w.report('smoke').status, 0);
    assert.equal(w.read().status, 'incomplete');
    assert.equal(p2(['report', '--stage', 'A', '--out', w.out, '--state', w.dir]).status, 3, 'stage A has no snapshot here');
    assert.equal(p2(['report', '--stage', 'X', '--out', w.out, '--state', w.dir]).status, 2);
  });
});

describe('the smoke gate', () => {
  const CELL_ORACLE = {
    '14x14-nightmare': 'V4-S4/fr-frozen/val-14x14-nightmare.runs.json',
    '10x10-nightmare': 'V4-S4/fr-frozen-none/val-10x10-nightmare.runs.json',
    '18x18-nightmare': 'V4-S4/fr-frozen-none/val-18x18-nightmare.runs.json',
    '22x22-nightmare': 'V4-S4/fr-frozen-none/val-22x22-nightmare.runs.json',
    '26x26-nightmare': 'V4-S4/log-link/val-26x26-nightmare.runs.json',
    '20x20-hell-1': 'V4-S4/fr-frozen-none/val-20x20-hell-1.runs.json',
    '15x20-nightmare': 'V4-S4/fr-frozen-none/val-15x20-nightmare.runs.json',
    '10x10-master': 'V4-S4/log-link/master-10x10-master.runs.json',
  };

  /** A state root with the seal, four proof results and the eight oracle files. @param {string} name */
  function setup(name) {
    const dir = state(name);
    writeFileSync(join(dir, 'E', 'seal', 'seal.json'), `${JSON.stringify({ format: 'p2-seal', version: 1, commit: 'c0ffee', sourceDigest: 'sd-1', copies: [{ id: 'p2-gen4', treeId: 't-p2-gen4' }] })}\r\n`);
    const proof = (/** @type {string} */ bundle, /** @type {Record<string, any>} */ over = {}) => {
      mkdirSync(join(dir, 'E', 'proofs', bundle), { recursive: true });
      writeFileSync(join(dir, 'E', 'proofs', bundle, 'result.json'), `${JSON.stringify({
        format: 'p2-proof', version: 1, bundle, status: 'pass', quick: false, cases: [], counts: {}, sources: { sourceDigest: 'sd-1', copies: [{ id: 'p2-gen4', treeId: 't-p2-gen4' }] }, ...over,
      })}\r\n`);
    };
    for (const bundle of ['observer', 'certificate', 'prior-replay', 'legacy']) proof(bundle);
    for (const [cell, path] of Object.entries(CELL_ORACLE)) {
      const file = join(dir, 'docs', 'improve-generating', 'evidence', 'frozen', ...path.split('/'));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ meta: {}, shard: {}, rows: [{ rowKey: `${cell}~20`, caseId: cell, rep: 20, seed: `landscape/${cell}/20`, localRep: 0, run: hand('smoke', 'gen-v4', cell, 20).run }] }));
    }
    const plan = { rows: Object.keys(CELL_ORACLE).map((cell) => ({ key: `smoke/gen-v4/${cell}/20`, component: 'smoke' })) };
    const rows = () => Object.keys(CELL_ORACLE).map((cell) => hand('smoke', 'gen-v4', cell, 20));
    return { dir, P: pathsOf(dir), plan, rows, proof };
  }

  it('the smoke gate', () => {
    const w = setup('smoke-gate');
    assert.deepEqual(smokeGate(w.rows(), w.plan, w.P), { ok: true, problems: [] });

    w.proof('observer', { status: 'fail' });
    const failed = smokeGate(w.rows(), w.plan, w.P);
    assert.equal(failed.ok, false);
    assert.deepEqual(failed.problems, ['S1 proof observer: status fail']);
    w.proof('observer');

    w.proof('legacy', { quick: true });
    const quick = smokeGate(w.rows(), w.plan, w.P);
    assert.equal(quick.ok, false);
    assert.deepEqual(quick.problems, ['S1 proof legacy: quick']);
    w.proof('legacy');

    w.proof('certificate', { sources: { sourceDigest: 'stale', copies: [] } });
    assert.deepEqual(smokeGate(w.rows(), w.plan, w.P).problems, ['S1 proof certificate: sourceDigest']);
    w.proof('certificate');

    const rows = w.rows();
    rows[2].run.details.igPuzzleKeys[4] = sha256Hex('x');
    const differ = smokeGate(rows, w.plan, w.P);
    assert.equal(differ.ok, false);
    assert.deepEqual(differ.problems, [`S2 ${rows[2].key}: differ details.igPuzzleKeys.4`]);

    const missing = smokeGate(w.rows().slice(1), w.plan, w.P);
    assert.equal(missing.ok, false, 'a missing smoke row is not a pass');
    assert.match(missing.problems[0], /missing row/);

    const cut = w.rows();
    Object.assign(cut[0].run, { partialReason: 'time-limit', acceptedCount: 4 });
    cut[0].run.details = { ...cut[0].run.details, igPuzzleKeys: cut[0].run.details.igPuzzleKeys.slice(0, 4) };
    assert.deepEqual(smokeGate(cut, w.plan, w.P), { ok: true, problems: [] }, 'a prefix-equal row passes');

    rmSync(join(w.dir, 'E', 'proofs'), { recursive: true });
    assert.equal(smokeGate(w.rows(), w.plan, w.P).ok, false, 'no proof results is not a pass');
    assert.equal(smokeGate(w.rows(), w.plan, pathsOf(join(w.dir, 'nowhere'))).ok, false, 'no seal is not a pass');
  });
});

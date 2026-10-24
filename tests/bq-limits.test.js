// @ts-check
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { activeCount, preset, rectangle } from '../core/engine/board.js';
import { offeredLevels } from '../core/engine/levels.js';
import { LIMITS, deriveLimits, enabledMaxActive } from '../core/engine/policy.js';
import { QUALIFICATION } from '../core/engine/qualification.js';
import { capFor, defaultGeneratorState, describeBoard, detectHardware, withBoard } from '../generator/state.js';

const ROOT = new URL('../', import.meta.url);
const STATUSES = /** @type {const} */ (['not-run', 'blocked', 'fail', 'pass']);

/**
 * @param {string} dir Repo-relative directory.
 * @returns {string[]} Repo-relative .js files below it.
 */
const jsFiles = (dir) => readdirSync(new URL(`${dir}/`, ROOT), { withFileTypes: true }).flatMap((entry) => (
  entry.isDirectory() ? jsFiles(`${dir}/${entry.name}`) : entry.name.endsWith('.js') ? [`${dir}/${entry.name}`] : []
));

/** @param {boolean} coarse @param {number | undefined} deviceMemory */
const device = (coarse, deviceMemory) => detectHardware({
  matchMedia: (/** @type {string} */ query) => ({ matches: coarse && query === '(pointer: coarse)' }),
  navigator: { hardwareConcurrency: 8, ...(deviceMemory === undefined ? {} : { deviceMemory }) },
});

describe('shipped fallback while BQ-1..BQ-3 are not passed', () => {
  test('no gate is passed and none references a report', () => {
    for (const key of /** @type {const} */ (['bq0', 'bq1', 'bq2', 'bq3'])) {
      assert.notEqual(QUALIFICATION[key].status, 'pass', key);
      assert.equal(QUALIFICATION[key].report, null, key);
    }
  });

  test('a passing gate must reference an existing report', () => {
    for (const entry of Object.values(QUALIFICATION)) {
      if (entry.status === 'pass') {
        assert.equal(typeof entry.report, 'string');
        assert.ok(existsSync(new URL(String(entry.report), ROOT)), String(entry.report));
      }
    }
  });

  test('production limits stay desktop 484 / phone 360 with 676 as the desktop opt-in', () => {
    assert.equal(LIMITS.releaseMaxActive, 484);
    assert.equal(LIMITS.phoneMaxActive, 360);
    assert.equal(LIMITS.largeBoardMaxActive, 676);
    assert.equal(LIMITS.designMaxActive, 576);
  });

  test('device modes: default desktop, experimental desktop, phone with low memory, phone with unknown memory and stored largeBoards', () => {
    const base = defaultGeneratorState();
    const large = { ...base, largeBoards: true };
    const desktop = device(false, 8);
    const lowMemoryPhone = device(true, 2);
    const unknownMemoryPhone = device(true, undefined);
    assert.deepEqual([desktop.phone, lowMemoryPhone.phone, unknownMemoryPhone.phone], [false, true, true]);
    assert.equal(capFor(base, desktop), 484);
    assert.equal(capFor(large, desktop), 676);
    assert.equal(capFor(base, lowMemoryPhone), 360);
    assert.equal(capFor(large, lowMemoryPhone), 360);
    assert.equal(capFor(base, unknownMemoryPhone), 360);
    assert.equal(capFor(large, unknownMemoryPhone), 360);
  });

  test('candidate-cap boards are rejected by the fallback caps and the 676 label stays experimental', () => {
    const heart = preset('heart', { n: 22 });
    const named = /** @type {[string, import('../core/engine/types.js').Board, number][]} */ ([
      ['24x24', rectangle(24, 24), 576],
      ['32x18', rectangle(32, 18), 576],
      ['26x26', rectangle(26, 26), 676],
      ['32x21', rectangle(32, 21), 672],
      ['22x22', rectangle(22, 22), 484],
      ['heart 22', heart.board, 363],
    ]);
    for (const [name, board, area] of named) {
      assert.equal(activeCount(board), area, name);
      const state = withBoard(defaultGeneratorState(), board, name === 'heart 22' ? heart.rotation : 0);
      const large = { ...state, largeBoards: true };
      assert.equal(describeBoard(state, device(false, 8)).valid, area <= 484, `${name} default desktop`);
      assert.equal(describeBoard(large, device(false, 8)).valid, true, `${name} large boards desktop`);
      assert.equal(describeBoard(state, device(true, 2)).valid, false, `${name} low-memory phone`);
      assert.equal(describeBoard(large, device(true, undefined)).valid, false, `${name} unknown-memory phone, stored largeBoards`);
      const codes = describeBoard(large, device(false, 8)).notices.map((n) => n.code);
      assert.equal(codes.includes('N-EXPERIMENTAL'), area > 484, name);
    }
    assert.equal(describeBoard({ ...withBoard(defaultGeneratorState(), rectangle(27, 25)), largeBoards: true }, device(false, 8)).valid, true, '675 cells');
    assert.equal(describeBoard({ ...withBoard(defaultGeneratorState(), rectangle(27, 26)), largeBoards: true }, device(false, 8)).valid, false, '702 cells');
  });
});

describe('gate outcomes and limits', () => {
  test('only a pass raises its limit; fail, blocked and not-run keep the fallback', () => {
    for (const status of STATUSES) {
      const limits = deriveLimits({ bq1: { status }, bq3: { status } });
      assert.equal(limits.releaseMaxActive, status === 'pass' ? 576 : 484, status);
      assert.equal(limits.phoneMaxActive, status === 'pass' ? 484 : 360, status);
    }
  });

  test('BQ-1 unlocks 576 for normal desktop only; BQ-3 unlocks 484 for phones only', () => {
    const pass = { status: 'pass' };
    const idle = { status: 'fail' };
    const bq1 = deriveLimits({ bq1: pass, bq3: idle });
    assert.equal(enabledMaxActive({ phone: false, largeBoards: false }, bq1), 576);
    assert.equal(enabledMaxActive({ phone: false, largeBoards: true }, bq1), 676);
    assert.equal(enabledMaxActive({ phone: true, largeBoards: true }, bq1), 360);
    const bq3 = deriveLimits({ bq1: idle, bq3: pass });
    assert.equal(enabledMaxActive({ phone: true, largeBoards: false }, bq3), 484);
    assert.equal(enabledMaxActive({ phone: true, largeBoards: true }, bq3), 484);
    assert.equal(enabledMaxActive({ phone: false, largeBoards: false }, bq3), 484);
  });

  test('BQ-2 cannot move any limit: 676 stays an explicit opt-in', () => {
    const withBq2 = deriveLimits({ bq1: { status: 'fail' }, bq2: { status: 'pass' }, bq3: { status: 'fail' } });
    assert.deepEqual({ ...withBq2 }, { ...LIMITS });
    assert.equal(enabledMaxActive({ phone: false, largeBoards: false }, withBq2), 484);
  });

  test('a gate changes only the two shipped caps, never side, minimum, batch or design limits', () => {
    const all = deriveLimits({ bq1: { status: 'pass' }, bq3: { status: 'pass' } });
    const { releaseMaxActive: r0, phoneMaxActive: p0, ...fixed } = LIMITS;
    const { releaseMaxActive: r1, phoneMaxActive: p1, ...raised } = all;
    assert.deepEqual(raised, fixed);
    assert.deepEqual([r0, p0, r1, p1], [484, 360, 576, 484]);
  });
});

describe('level availability is independent of caps and gates', () => {
  test('Heart 363 is never offered Hell-3; 484 and larger boards are', () => {
    const heart = offeredLevels(363).map((l) => l.id);
    assert.deepEqual(heart, ['hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2']);
    assert.ok(!heart.includes('hell-3'));
    for (const area of [466, 484, 558, 576, 658, 672, 676]) {
      assert.ok(offeredLevels(area).some((l) => l.id === 'hell-3'), String(area));
    }
    assert.equal(offeredLevels(449).some((l) => l.id === 'hell-3'), false);
  });

  test('generation code never reads the gates, limits or qualification', () => {
    const importers = [...jsFiles('core'), ...jsFiles('generator'), ...jsFiles('player')]
      .filter((file) => /qualification\.js/.test(readFileSync(new URL(file, ROOT), 'utf8')));
    assert.deepEqual(importers.sort(), ['core/engine/policy.js', 'generator/state.js']);
    for (const file of jsFiles('core/engine').filter((f) => f !== 'core/engine/policy.js' && f !== 'core/engine/qualification.js')) {
      assert.doesNotMatch(readFileSync(new URL(file, ROOT), 'utf8'), /\bLIMITS\b|\bQUALIFICATION\b|enabledMaxActive|deriveLimits/, file);
    }
  });
});

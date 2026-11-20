// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, test } from 'node:test';
import {
  ENTRY_ERROR_CODES, createCodeEntryMachine, describeProblem, provisionalCount,
} from '../core/browser/puzzle-code-dialog.js';
import { packOf, setLocale, t } from '../player/i18n.js';

afterEach(() => {
  setLocale('en', null);
});

const CORE = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR';
const TAIL = '18V3WE';
const FULL = `${CORE}.${TAIL}`;
const FIXED = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QQ';
const PACK = { format: 'pentomino-pack' };

/** @template T */
function deferred() {
  /** @type {(value: T) => void} */
  let resolve = () => {};
  /** @type {(reason?: unknown) => void} */
  let reject = () => {};
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

/** Lets every settled promise run its callbacks; no timers are involved. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** @param {string} code @param {Record<string, unknown>} [more] */
const failure = (code, more = {}) => ({ ok: false, issues: [{ code, path: '$', message: code, ...(more.params === undefined ? {} : { params: more.params }) }], ...more });
const success = () => ({ ok: true, value: { pack: PACK, index: 0 }, warnings: [] });

/** @param {string} normalizedCode @param {string} correctedCode @param {'core' | 'tail'} [component] */
const candidateOf = (normalizedCode, correctedCode, component = 'core') => ({
  normalizedCode, correctedCode, component, offset: 4, group: 2, position: 1, typed: 'X', expected: 'Y',
});

/**
 * A controller stand-in with the contract of `loadPuzzleCode` and `cancelPuzzleCodeLoad`: a reply that arrives after a
 * cancel is the `cancelled` failure and commits nothing.
 */
function fakeController() {
  let epoch = 0;
  const state = {
    committed: /** @type {string[]} */ ([]),
    submits: /** @type {string[]} */ ([]),
    recoveries: /** @type {string[]} */ ([]),
    cancels: 0,
    pending: /** @type {Array<ReturnType<typeof deferred>>} */ ([]),
  };
  /** @param {string[]} log @param {string} text */
  function load(log, text) {
    log.push(text);
    epoch += 1;
    const mine = epoch;
    const reply = deferred();
    state.pending.push(reply);
    return reply.promise.then((result) => {
      if (mine !== epoch) {
        return failure('cancelled');
      }
      if (/** @type {any} */ (result).ok) {
        state.committed.push(text);
      }
      return result;
    });
  }
  return {
    state,
    options: {
      submit: (/** @type {string} */ text) => /** @type {Promise<any>} */ (load(state.submits, text)),
      openRecovery: (/** @type {string} */ core) => /** @type {Promise<any>} */ (load(state.recoveries, core)),
      cancel: () => {
        state.cancels += 1;
        epoch += 1;
      },
    },
    /** @param {number} at @param {unknown} result */
    reply(at, result) {
      state.pending[at].resolve(result);
      return flush();
    },
  };
}

/** @param {string} [text] */
function openMachine(text = '') {
  const controller = fakeController();
  const machine = createCodeEntryMachine(controller.options);
  /** @type {import('../core/browser/puzzle-code-dialog.js').EntryState[]} */
  const seen = [];
  machine.subscribe((s) => seen.push(s));
  machine.open({ text });
  return { controller, machine, seen };
}

describe('deferred replies', () => {
  test('submit A, edit to B, then A succeeds: A never opens and B stays', async () => {
    const { controller, machine } = openMachine();
    machine.edit('AAAA');
    assert.equal(machine.submit(), true);
    assert.equal(machine.getState().phase, 'submitting');
    machine.edit('BBBB');
    assert.equal(controller.state.cancels, 1, 'the controller is told to drop A');
    assert.equal(machine.getState().phase, 'editing');
    await controller.reply(0, success());
    assert.deepEqual(controller.state.committed, []);
    assert.deepEqual([machine.getState().phase, machine.getState().text], ['editing', 'BBBB']);
  });

  test('submit A, close, then A succeeds: nothing opens and the dialog stays closed', async () => {
    const { controller, machine } = openMachine('AAAA');
    machine.submit();
    machine.close();
    assert.equal(controller.state.cancels, 1);
    await controller.reply(0, success());
    assert.deepEqual(controller.state.committed, []);
    assert.deepEqual([machine.getState().phase, machine.getState().text], ['closed', 'AAAA'], 'the text is kept for the next opening');
  });

  test('a late failure of an old submission shows nothing', async () => {
    const { controller, machine } = openMachine('AAAA');
    machine.submit();
    machine.edit('AAAB');
    await controller.reply(0, failure('core-check'));
    assert.equal(machine.getState().problem, null);
    assert.equal(machine.getState().phase, 'editing');
  });

  test('a success closes the dialog, clears the text and reports the controller as the only committer', async () => {
    const { controller, machine } = openMachine(FULL);
    machine.submit();
    await controller.reply(0, success());
    assert.deepEqual(controller.state.committed, [FULL]);
    assert.deepEqual([machine.getState().phase, machine.getState().text], ['closed', '']);
  });

  test('a rejected request is a failed request, with the text kept', async () => {
    const { controller, machine } = openMachine(CORE);
    machine.submit();
    controller.state.pending[0].reject(new Error('boom'));
    await flush();
    const state = machine.getState();
    assert.deepEqual([state.phase, state.text, state.problem?.code, state.problem?.input], ['invalid', CORE, 'worker-error', false]);
  });

  test('disposing while awaiting stops the request and no later reply touches the machine', async () => {
    const { controller, machine, seen } = openMachine(CORE);
    machine.submit();
    const count = seen.length;
    machine.dispose();
    assert.equal(controller.state.cancels, 1);
    await controller.reply(0, success());
    assert.equal(seen.length, count, 'no state change after dispose');
    assert.deepEqual(controller.state.committed, []);
    machine.open({ text: 'X' });
    machine.edit('Y');
    assert.equal(seen.length, count, 'a disposed machine ignores every call');
  });
});

describe('correction candidate', () => {
  /** A checksum failure of FIXED with a candidate that gives CORE. */
  async function withCandidate() {
    const setup = openMachine(FIXED);
    setup.machine.submit();
    await setup.controller.reply(0, failure('core-check', { candidate: candidateOf(FIXED, CORE) }));
    return setup;
  }

  test('arrives as an offer: the text stays, nothing opens and nothing else is submitted', async () => {
    const { controller, machine } = await withCandidate();
    const state = machine.getState();
    assert.equal(state.phase, 'candidate');
    assert.equal(state.text, FIXED, 'the field is not changed by the candidate');
    assert.equal(state.candidate?.correctedCode, CORE);
    assert.equal(state.problem?.code, 'core-check');
    assert.deepEqual(controller.state.submits, [FIXED]);
    assert.deepEqual(controller.state.committed, []);
  });

  test('Use this correction replaces the text, submits the corrected code again and opens it only if it decodes', async () => {
    const { controller, machine } = await withCandidate();
    assert.equal(machine.useCorrection(), true);
    assert.deepEqual([machine.getState().phase, machine.getState().text], ['submitting', CORE]);
    assert.deepEqual(controller.state.submits, [FIXED, CORE], 'the corrected text goes through the same path');
    await controller.reply(1, success());
    assert.deepEqual(controller.state.committed, [CORE]);
    assert.equal(machine.getState().phase, 'closed');
  });

  test('a corrected code that fails keeps the corrected text and shows its own error', async () => {
    const { controller, machine } = await withCandidate();
    machine.useCorrection();
    await controller.reply(1, failure('invalid'));
    const state = machine.getState();
    assert.deepEqual([state.phase, state.text, state.problem?.code, state.candidate], ['invalid', CORE, 'invalid', null]);
    assert.deepEqual(controller.state.committed, []);
  });

  test('after an edit the old offer does nothing', async () => {
    const { controller, machine } = await withCandidate();
    const shown = machine.getState().revision;
    machine.edit(`${FIXED}0`);
    assert.equal(machine.useCorrection(shown), false, 'the action of the old offer');
    assert.equal(machine.useCorrection(), false, 'and there is no offer any more');
    assert.deepEqual([machine.getState().text, controller.state.submits], [`${FIXED}0`, [FIXED]]);
  });

  test('an offer is refused when the revision moved on even if the text was typed back', async () => {
    const { machine } = await withCandidate();
    const shown = machine.getState().revision;
    machine.edit('X');
    machine.edit(FIXED);
    assert.equal(machine.useCorrection(shown), false);
  });

  test('a candidate found for other text, for the wrong component or beside a valid checksum is not offered', async () => {
    for (const [name, code, candidate] of /** @type {const} */ ([
      ['other text', 'core-check', candidateOf(`${FIXED}0`, CORE)],
      ['a tail candidate for a core error', 'core-check', candidateOf(FIXED, CORE, 'tail')],
      ['an unknown version', 'version', candidateOf(FIXED, CORE)],
      ['an invalid structure', 'invalid', candidateOf(FIXED, CORE)],
      ['no change', 'core-check', candidateOf(FIXED, FIXED)],
    ])) {
      const { controller, machine } = openMachine(FIXED);
      machine.submit();
      await controller.reply(0, failure(code, { candidate }));
      assert.equal(machine.getState().candidate, null, name);
      assert.equal(machine.useCorrection(), false, name);
    }
  });

  test('a link is normalized like the controller does, so its candidate matches', async () => {
    const link = `https://example.test/player/#p=${FIXED.toLowerCase()}&i=0`;
    const { controller, machine } = openMachine(link);
    machine.submit();
    await controller.reply(0, failure('core-check', { candidate: candidateOf(FIXED, CORE) }));
    assert.equal(machine.getState().phase, 'candidate');
    machine.useCorrection();
    assert.deepEqual(controller.state.submits, [link, CORE]);
  });
});

describe('damaged solution part', () => {
  /** @param {string} code @param {Record<string, unknown>} [more] */
  async function failedTail(code, more = {}) {
    const setup = openMachine(FULL);
    setup.machine.submit();
    await setup.controller.reply(0, failure(code, more));
    return setup;
  }
  const recovery = (code = 'tail-check') => ({ kind: 'core-only', code, pack: PACK });

  test('without a returned core there is no core action', async () => {
    const { controller, machine } = await failedTail('tail-check');
    assert.deepEqual([machine.getState().phase, machine.getState().canOpenCore], ['invalid', false]);
    assert.equal(machine.openCore(), false);
    assert.deepEqual(controller.state.recoveries, []);
  });

  test('with a returned core the action exists, the text is untouched and nothing opens before the choice', async () => {
    const { controller, machine } = await failedTail('tail-check', { recovery: recovery() });
    const state = machine.getState();
    assert.deepEqual([state.phase, state.canOpenCore, state.text, state.problem?.code], ['tail-recovery', true, FULL, 'tail-check']);
    assert.deepEqual([controller.state.recoveries, controller.state.committed], [[], []]);
  });

  test('choosing it submits only the core, through the recovery path, and keeps the full input meanwhile', async () => {
    const { controller, machine } = await failedTail('tail-tag', { recovery: recovery('tail-tag') });
    assert.equal(machine.openCore(), true);
    assert.deepEqual(controller.state.recoveries, [CORE]);
    assert.deepEqual(controller.state.submits, [FULL], 'the typed text is not submitted again');
    assert.equal(machine.getState().text, FULL);
    await controller.reply(1, success());
    assert.deepEqual(controller.state.committed, [CORE]);
    assert.equal(machine.getState().phase, 'closed');
  });

  test('the core of a pasted link is the part before the dot of its normalized code', async () => {
    const link = `#p=${CORE.toLowerCase()}.${TAIL}`;
    const { controller, machine } = openMachine(link);
    machine.submit();
    await controller.reply(0, failure('tail-invalid', { recovery: recovery('tail-invalid') }));
    machine.openCore();
    assert.deepEqual(controller.state.recoveries, [CORE]);
  });

  test('a core is never offered for a bad core, a code without a tail or an edited text', async () => {
    const bad = await failedTail('core-check', { recovery: recovery() });
    assert.equal(bad.machine.getState().canOpenCore, false, 'bad core');
    const bare = openMachine(CORE);
    bare.machine.submit();
    await bare.controller.reply(0, failure('tail-check', { recovery: recovery() }));
    assert.equal(bare.machine.getState().canOpenCore, false, 'no dot, nothing to drop');
    const shown = await failedTail('tail-check', { recovery: recovery() });
    const revision = shown.machine.getState().revision;
    shown.machine.edit(`${FULL}0`);
    assert.equal(shown.machine.openCore(revision), false, 'the old action');
    assert.equal(shown.machine.openCore(), false);
    assert.deepEqual(shown.controller.state.recoveries, []);
  });

  test('a tail candidate and the core offer can be on show together', async () => {
    const { machine } = await failedTail('tail-check', { recovery: recovery(), candidate: candidateOf(FULL, FULL.replace('WE', 'WD'), 'tail') });
    assert.deepEqual([machine.getState().phase, machine.getState().candidate !== null, machine.getState().canOpenCore], ['candidate', true, true]);
  });
});

describe('failures, startup and reopening', () => {
  test('empty input is answered locally and never reaches the controller', async () => {
    const { controller, machine } = openMachine(' \t\r\n - ');
    assert.equal(machine.submit(), false);
    assert.deepEqual([machine.getState().phase, machine.getState().problem?.code, machine.getState().problem?.input], ['invalid', 'empty', true]);
    assert.deepEqual([controller.state.submits, controller.state.recoveries, controller.state.cancels], [[], [], 0]);
    const none = openMachine('');
    none.machine.submit();
    assert.deepEqual(none.controller.state.submits, []);
  });

  test('missing module workers is a failure of the service, not of the text, and nothing is decoded here', async () => {
    const { controller, machine } = openMachine(CORE);
    machine.submit();
    await controller.reply(0, failure('worker-unavailable'));
    const state = machine.getState();
    assert.deepEqual([state.phase, state.text, state.problem?.code, state.problem?.input], ['invalid', CORE, 'worker-unavailable', false]);
    assert.equal(describeProblem(state.problem ?? { code: '' }).key, 'code.error.worker');
  });

  test('a failure given to open (a bad address at start-up) is shown for the attempted text, with its offers', () => {
    const controller = fakeController();
    const machine = createCodeEntryMachine(controller.options);
    machine.open({ text: `#p=${FIXED}`, failure: /** @type {any} */ (failure('core-check', { candidate: candidateOf(FIXED, CORE) })) });
    assert.deepEqual([machine.getState().phase, machine.getState().text], ['candidate', `#p=${FIXED}`]);
    assert.deepEqual(controller.state.submits, [], 'showing a failure submits nothing');
    machine.useCorrection();
    assert.deepEqual(controller.state.submits, [CORE]);
  });

  test('a second opening replaces a stale error and candidate, keeps the text and stops a request in flight', async () => {
    const { controller, machine } = openMachine(FIXED);
    machine.submit();
    await controller.reply(0, failure('core-check', { candidate: candidateOf(FIXED, CORE) }));
    assert.equal(machine.getState().phase, 'candidate');
    machine.close();
    machine.open();
    assert.deepEqual([machine.getState().phase, machine.getState().text, machine.getState().problem, machine.getState().candidate], ['editing', FIXED, null, null]);
    machine.submit();
    machine.open({ text: 'NEW' });
    assert.equal(controller.state.cancels, 1);
    assert.deepEqual([machine.getState().phase, machine.getState().text], ['editing', 'NEW']);
    await controller.reply(1, success());
    assert.deepEqual(controller.state.committed, []);
  });

  test('actions are refused while a request is in flight and when closed', async () => {
    const { controller, machine } = openMachine(CORE);
    machine.submit();
    assert.equal(machine.submit(), false);
    assert.equal(machine.useCorrection(), false);
    assert.equal(machine.openCore(), false);
    assert.deepEqual(controller.state.submits, [CORE]);
    machine.close();
    assert.equal(machine.submit(), false);
    machine.edit('Z');
    assert.equal(machine.getState().text, CORE, 'a closed entry takes no edits');
  });

  test('the UI revision only grows', async () => {
    const { controller, machine, seen } = openMachine(FIXED);
    machine.edit(`${FIXED}0`);
    machine.submit();
    await controller.reply(0, failure('core-check'));
    machine.close();
    machine.open();
    const revisions = seen.map((s) => s.revision);
    assert.deepEqual(revisions, [...revisions].sort((a, b) => a - b));
    assert.ok(new Set(revisions).size >= 5);
  });
});

describe('texts', () => {
  const codes = ['empty', 'bad-char', 'dots', 'too-long', 'core-check', 'version', 'no-deflate', 'invalid', 'index',
    'tail-check', 'tail-tag', 'tail-invalid', 'worker-unavailable', 'worker-error', 'cancelled'];

  test('every code the controller, the client and the codec can send has its own localized text in both languages', () => {
    assert.deepEqual([...ENTRY_ERROR_CODES].sort(), [...codes].sort());
    const english = packOf('en');
    const vietnamese = packOf('vi');
    for (const code of codes) {
      const { key, params } = describeProblem({ code, params: { char: '!' } });
      if (code !== 'worker-error') {
        assert.notEqual(key, 'code.error.service', `${code} has its own key`);
      }
      assert.ok(key in english && key in vietnamese, `${key} exists in both languages`);
      for (const locale of /** @type {const} */ (['en', 'vi'])) {
        setLocale(locale, null);
        const text = t(key, params);
        assert.ok(text !== key && text.trim() !== '' && !/\{\w+\}/.test(text), `${locale} ${key}: ${text}`);
      }
    }
    assert.equal(describeProblem({ code: 'worker-error' }).key, 'code.error.service');
    assert.equal(describeProblem({ code: 'something-new' }).key, 'code.error.service', 'an unknown code reads as a failed request');
  });

  test('the host loader names of a bad address read as the entry\'s own codes', async () => {
    const { controller, machine } = openMachine('#p=ABCD&i=1');
    machine.submit();
    await controller.reply(0, failure('invalid-index'));
    assert.equal(machine.getState().problem?.code, 'index');
    machine.submit();
    await controller.reply(1, failure('invalid-hash'));
    assert.equal(machine.getState().problem?.code, 'invalid');
  });

  test('the message names the offending character, and an invisible one by its code point', () => {
    assert.equal(t('code.error.char', describeProblem({ code: 'bad-char', params: { char: '!' } }).params), 'The code contains "!", which puzzle codes never use.');
    assert.deepEqual(describeProblem({ code: 'bad-char', params: { char: '\u00a0' } }).params, { char: 'U+00A0' });
    assert.deepEqual(describeProblem({ code: 'bad-char', params: { char: '\u200b' } }).params, { char: 'U+200B' });
    assert.deepEqual(describeProblem({ code: 'bad-char', params: { char: '<' } }).params, { char: '<' });
    assert.deepEqual(describeProblem({ code: 'bad-char', params: {} }).params, { char: '?' });
    assert.deepEqual(describeProblem({ code: 'core-check' }).params, {});
  });

  test('the count is that of the normalized code, a link\'s p value, or a neutral provisional number', () => {
    assert.equal(provisionalCount(CORE), 38);
    assert.equal(provisionalCount(FULL), 45, 'the dot is counted');
    assert.equal(provisionalCount('1d0j 492g\n47dm-xng6'), 16, 'grouping, case and line breaks');
    assert.equal(provisionalCount(`https://example.test/player/#p=${CORE}&i=0`), 38, 'the prefix is not counted');
    assert.equal(provisionalCount('ab!c d'), 5, 'a wrong character still counts, with no error');
    assert.equal(provisionalCount(`#p=${CORE}&i=1`), 38, 'a link that will be refused still counts its code');
    assert.equal(provisionalCount(' \n '), 0);
    assert.equal(provisionalCount(''), 0);
  });
});

describe('the module', () => {
  const source = readFileSync(new URL('../core/browser/puzzle-code-dialog.js', import.meta.url), 'utf8');

  test('holds no codec, catalogue or search: it only imports the text normalizer and the safe DOM helper', () => {
    const imports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map((match) => match[1]);
    assert.deepEqual(imports.sort(), ['../engine/puzzlecode-input.js', './dom.js']);
  });

  test('builds the DOM from text only: no markup, no inline style, no handler attribute', () => {
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\.style\b|setAttribute\('style'|srcdoc|eval\(|new Function/);
  });

  test('every text key the module and the Player page use for the entry exists in both languages', () => {
    const app = readFileSync(new URL('../player/app.js', import.meta.url), 'utf8');
    const english = packOf('en');
    const vietnamese = packOf('vi');
    const used = new Set([...(source + app).matchAll(/'(code\.[\w.]+)'/g)].map((match) => match[1]));
    for (const key of ENTRY_ERROR_CODES.map((code) => describeProblem({ code }).key)) {
      used.add(key);
    }
    assert.ok(used.size >= 20);
    for (const key of used) {
      assert.ok(key in english || `${key}_other` in english, `${key} in English`);
      assert.ok(key in vietnamese, `${key} in Vietnamese`);
    }
  });
});

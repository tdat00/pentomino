// MP12b2 fail-fast check (cross-review TP24, TP07; PR-P2 amendment): replays the three candidate stops of the
// fail-fast proposal over the captures of the GS-P3 populations (JSONL lines of kind call, attempts and event; the
// attempts lines come from observe.mjs) and prints Markdown, ASCII only.
//   node ./<folder>/failfast.mjs <files...>
//   node ./<folder>/failfast.mjs --self-test      (pure: four synthetic files, no file is read or written)
// F2: a selection call ends after its first four raw attempts when all four are capped (unrateable).
// F1: a set request ends at the first set attempt (tag <label>/set/<j>) whose raw attempts are not empty and all capped.
// F1 + F2: F1 reads each set attempt as F2 has cut it (a call that F2 fires on keeps its first four raw attempts).
// Only a file with an end event is a completed baseline; a capture stopped at its limit is censored after its last
// event. An observed false stop is a stop that a successful call or set attempt shows to be wrong; an outcome that a
// censored tail leaves open is unknown and never establishes safety. A finite corpus never proves that no request
// could succeed. Times are ms of the capture; a saving is a counterfactual estimate (serial captures only).
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { load } from './summary.mjs';

const SET_TAG = /\/set\/(\d+)$/;
const MECHANISMS = ['F2', 'F1', 'F1 + F2'];

/** @param {any} call @returns {any[]} The raw attempts of the call in order. */
const rawOf = (call) => call.attempts.list.filter((/** @type {any} */ a) => a.ph === 'raw');
/** @param {any} call */
const fires2 = (call) => {
  const raw = rawOf(call);
  return raw.length >= 4 && raw.slice(0, 4).every((/** @type {any} */ a) => a.o === 'capped');
};
/** @param {any[]} attempts */
const allCapped = (attempts) => attempts.length > 0 && attempts.every((a) => a.o === 'capped');
/** @param {any[]} attempts @returns {number} */
const msOf = (attempts) => attempts.reduce((t, a) => t + a.ms, 0);

const blank = () => ({ triggers: 0, false: 0, correct: 0, unknown: 0, notes: /** @type {string[]} */ ([]) });

/**
 * @param {{ calls: any[], events: any[] }} data
 * @returns {{ completed: boolean, F2: ReturnType<typeof blank>, F1: ReturnType<typeof blank>,
 *   'F1 + F2': ReturnType<typeof blank>, setMs: number | null, saved: Record<string, number | null> }}
 */
export function evaluate(data) {
  const { calls, events } = data;
  const completed = events.some((e) => e.ev === 'end');
  const setEvents = events.filter((e) => e.ev === 'set-attempt');
  const okFrom = (/** @type {number} */ j) => setEvents.some((e) => e.j >= j && e.ok);
  /** @type {Map<number, any[]>} */
  const sets = new Map();
  /** @type {any[]} */
  const batch = [];
  for (const c of calls) {
    const m = SET_TAG.exec(c.tag);
    if (m === null) {
      batch.push(c);
    } else {
      sets.set(Number(m[1]), [...(sets.get(Number(m[1])) ?? []), c]);
    }
  }
  const order = [...sets.keys()].sort((a, b) => a - b);
  const setTime = (/** @type {number} */ j) => setEvents.find((e) => e.j === j)?.ms ?? msOf(sets.get(j) ?? []);
  const r = { completed, F2: blank(), F1: blank(), 'F1 + F2': blank(), setMs: events.find((e) => e.ev === 'end')?.setMs ?? null,
    saved: /** @type {Record<string, number | null>} */ ({ F2: 0, F1: null, 'F1 + F2': null }) };

  for (const c of calls) {
    if (fires2(c)) {
      r.F2.triggers += 1;
      if (c.result.ok) {
        r.F2.false += 1;
        r.F2.notes.push(`false stop at ${c.tag}`);
      } else {
        r.F2.correct += 1;
      }
      r.saved.F2 = /** @type {number} */ (r.saved.F2) + c.ms - msOf(rawOf(c).slice(0, 4));
    }
  }

  const judge = (/** @type {ReturnType<typeof blank>} */ m, /** @type {number} */ j) => {
    m.triggers += 1;
    if (okFrom(j)) {
      m.false += 1;
      m.notes.push(`false stop at set attempt ${j}`);
    } else if (completed) {
      m.correct += 1;
    } else {
      m.unknown += 1;
      m.notes.push(`unknown at set attempt ${j} (censored tail)`);
    }
  };
  // Every set attempt before j counts, a carve failure included (it has a set-attempt event but no selection call).
  const firstTime = (/** @type {number} */ j) => [...new Set([...setEvents.filter((e) => e.j < j).map((e) => e.j), ...order.filter((i) => i < j)])]
    .reduce((t, i) => t + setTime(i), 0);

  for (const j of order) {
    const raw = (sets.get(j) ?? []).flatMap(rawOf);
    if (allCapped(raw)) {
      judge(r.F1, j);
      r.saved.F1 = firstTime(j) + setTime(j);
      break;
    }
  }

  let walked = false;
  for (const j of order) {
    /** @type {any[]} */
    const effective = [];
    let cut = 0;
    for (const c of sets.get(j) ?? []) {
      const raw = rawOf(c);
      if (fires2(c)) {
        if (c.result.ok) {
          r['F1 + F2'].triggers += 1;
          r['F1 + F2'].false += 1;
          r['F1 + F2'].notes.push(`false stop at ${c.tag}`);
          walked = true;
          break;
        }
        effective.push(...raw.slice(0, 4));
        cut += c.ms - msOf(raw.slice(0, 4));
      } else {
        effective.push(...raw);
      }
    }
    if (walked) {
      break;
    }
    if (allCapped(effective)) {
      judge(r['F1 + F2'], j);
      r.saved['F1 + F2'] = firstTime(j) + setTime(j) - cut;
      walked = true;
      break;
    }
  }
  if (!walked) {
    for (const c of batch) {
      if (fires2(c)) {
        r['F1 + F2'].triggers += 1;
        if (c.result.ok) {
          r['F1 + F2'].false += 1;
          r['F1 + F2'].notes.push(`false stop at ${c.tag}`);
        } else {
          r['F1 + F2'].correct += 1;
        }
      }
    }
  }
  return r;
}

/** @typedef {ReturnType<typeof evaluate>} Evaluation */

/** @param {number | null} v */
const sec = (v) => (v === null ? '-' : (v / 1000).toFixed(1));

/**
 * @param {string[]} files
 * @returns {string}
 */
export function report(files) {
  const rows = files.map((f) => {
    const data = load(f);
    return { file: f, pop: basename(dirname(f)), started: data.events.some((e) => e.ev === 'start'), e: evaluate(data), calls: data.calls.length };
  });
  const out = ['# Fail-fast false-stop check (MP12b2)', ''];
  const completed = rows.filter((x) => x.e.completed).length;
  out.push(`Files evaluated: ${rows.length}; completed baselines (an end event): ${completed}; censored captures (stopped at their limit): ${rows.length - completed}.`,
    'F2 fires on a selection call whose first four raw attempts are all capped (false stop when the call returned a result).',
    'F1 fires at the first set attempt whose raw attempts are not empty and all capped (false stop when that set attempt or a later one was ok;',
    'a correct stop in a completed baseline; unknown in a censored tail). F1 + F2 reads each set attempt as F2 has cut it and stops the walk at an F2 false stop;',
    'when F1 never fires, F2 cuts of batch calls are judged as for F2.', '');
  out.push('## Mechanisms', '', '| Mechanism | Files evaluated | Completed baselines evaluated | Triggers | Observed false stops | Correct stops | Unknown outcomes | Reading |', '|---|---|---|---|---|---|---|---|');
  for (const m of MECHANISMS) {
    const sum = (/** @type {(e: Evaluation) => number} */ f) => rows.reduce((t, x) => t + f(x.e), 0);
    const key = /** @type {'F2' | 'F1' | 'F1 + F2'} */ (m);
    const triggers = sum((e) => e[key].triggers);
    const falseStops = sum((e) => e[key].false);
    const correct = sum((e) => e[key].correct);
    const unknown = sum((e) => e[key].unknown);
    let reading;
    const withTrigger = rows.filter((x) => x.e.completed && x.e[key].triggers > 0).length;
    if (falseStops > 0) {
      reading = `not proposable: ${falseStops} observed false stop(s)`;
    } else if (triggers === 0) {
      reading = 'no trigger in this corpus: its effect is unmeasured (never "no false stop observed")';
    } else if (completed === 0) {
      reading = `no completed baseline: nothing established (${unknown} unknown outcome(s))`;
    } else {
      reading = `no false stop observed in ${completed} completed baselines, ${withTrigger} of them with a trigger (${unknown} unknown outcome(s) stay open; a finite corpus proves nothing about other requests)`;
    }
    out.push(`| ${m} | ${rows.length} | ${completed} | ${triggers} | ${falseStops} | ${correct} | ${unknown} | ${reading} |`);
  }
  out.push('', '## Per file', '', '| File | Population | Completed baseline | Calls | F2 triggers/false/correct | F1 triggers/false/correct/unknown | F1 + F2 triggers/false/correct/unknown | Set stage observed (s) | F1 stop at (s) | F1 + F2 stop at (s) | F2 time saved on cut calls (s) |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const x of rows) {
    const e = x.e;
    const t = (/** @type {ReturnType<typeof blank>} */ m) => `${m.triggers}/${m.false}/${m.correct}/${m.unknown}`;
    out.push(`| ${basename(x.file)} | ${x.pop} | ${e.completed ? 'yes' : 'no'} | ${x.calls} | ${e.F2.triggers}/${e.F2.false}/${e.F2.correct} | ${t(e.F1)} | ${t(e['F1 + F2'])} | ${e.completed ? sec(e.setMs) : 'censored'} | ${sec(e.saved.F1)} | ${sec(e.saved['F1 + F2'])} | ${e.F2.triggers === 0 ? '-' : sec(e.saved.F2)} |`);
  }
  const notes = rows.flatMap((x) => MECHANISMS.flatMap((m) => /** @type {any} */ (x.e)[m].notes.map((/** @type {string} */ n) => `- ${basename(x.file)}, ${m}: ${n}`)));
  if (notes.length > 0) {
    out.push('', '## False stops and unknown outcomes', '', ...notes);
  }
  const pops = [...new Set(rows.map((x) => x.pop))];
  out.push('', '## Per population', '', '| Population | Files | Completed baselines | F2 triggers/false | F1 triggers/false/unknown | F1 + F2 triggers/false/unknown |', '|---|---|---|---|---|---|');
  for (const p of pops) {
    const r = rows.filter((x) => x.pop === p);
    const s = (/** @type {'F2' | 'F1' | 'F1 + F2'} */ m, /** @type {'triggers' | 'false' | 'unknown'} */ k) => r.reduce((t, x) => t + x.e[m][k], 0);
    out.push(`| ${p} | ${r.length} | ${r.filter((x) => x.e.completed).length} | ${s('F2', 'triggers')}/${s('F2', 'false')} | ${s('F1', 'triggers')}/${s('F1', 'false')}/${s('F1', 'unknown')} | ${s('F1 + F2', 'triggers')}/${s('F1 + F2', 'false')}/${s('F1 + F2', 'unknown')} |`);
  }
  out.push('', '## Diagnostic: leading capped raw attempts of the calls that returned a result', '',
    'Not a mechanism and not a proposal: how many raw attempts of a call were capped before its first rated one, among the calls that returned a result (a stop after n capped attempts is a false stop for each call at or above n).', '',
    '| Population | Calls with a result | Calls with no leading capped attempt | Leading capped >= 4 | >= 8 | >= 12 | >= 16 | >= 20 | Largest |', '|---|---|---|---|---|---|---|---|---|');
  for (const p of pops) {
    /** @type {number[]} */
    const lead = [];
    for (const x of rows.filter((r) => r.pop === p)) {
      for (const c of load(x.file).calls) {
        if (!c.result.ok) {
          continue;
        }
        const raw = rawOf(c);
        const first = raw.findIndex((a) => a.o !== 'capped');
        lead.push(first < 0 ? raw.length : first);
      }
    }
    const atLeast = (/** @type {number} */ n) => lead.filter((v) => v >= n).length;
    out.push(`| ${p} | ${lead.length} | ${lead.filter((v) => v === 0).length} | ${atLeast(4)} | ${atLeast(8)} | ${atLeast(12)} | ${atLeast(16)} | ${atLeast(20)} | ${lead.length === 0 ? '-' : Math.max(...lead)} |`);
  }
  out.push('', 'The times are those of serial captures: F1 stop at = the set attempts up to and including the firing one; F1 + F2 stop at = the same with the firing attempt cut after its first four ratings;', 'the saving of F2 on a cut call = its time minus the time of its first four ratings. They are counterfactual estimates, never measurements of a built mechanism.', '');
  return `${out.join('\n')}\n`;
}

/** @param {string} tag @param {string[]} raw 'c' capped, 'r' rated @param {boolean} ok @param {number} [ms] */
const call = (tag, raw, ok, ms = 10) => ({
  tag, mode: 'any', ms, result: { ok },
  attempts: { list: raw.map((o) => ({ ph: 'raw', o: o === 'c' ? 'capped' : 'rated', ms: 1 })), finishes: [] },
});
const ev = (/** @type {any} */ e) => ({ kind: 'event', ...e });

function selfTest() {
  const cases = [
    { name: '(a) four capped then a rated out-of-band attempt, then a success',
      data: { calls: [call('x/set/0', ['c', 'c', 'c', 'c', 'r'], false), call('x/set/1', ['r'], true)],
        events: [ev({ ev: 'start' }), ev({ ev: 'set-attempt', j: 0, ok: false, ms: 10 }), ev({ ev: 'set-attempt', j: 1, ok: true, ms: 10 }),
          ev({ ev: 'end', status: 'complete', accepted: 10 })] },
      want: { F2: [1, 0, 1, 0], F1: [0, 0, 0, 0], 'F1 + F2': [1, 1, 0, 0] }, completed: true },
    { name: '(b) a completed request whose every attempt is all capped',
      data: { calls: [call('x/set/0', ['c', 'c', 'c', 'c', 'c', 'c'], false), call('x/set/1', ['c', 'c', 'c', 'c', 'c', 'c'], false)],
        events: [ev({ ev: 'start' }), ev({ ev: 'set-attempt', j: 0, ok: false, ms: 10 }), ev({ ev: 'set-attempt', j: 1, ok: false, ms: 10 }),
          ev({ ev: 'end', status: 'set-failed', setMs: 20 })] },
      want: { F2: [2, 0, 2, 0], F1: [1, 0, 1, 0], 'F1 + F2': [1, 0, 1, 0] }, completed: true },
    { name: '(c) four capped then a rated in-band profile, the call returned a result',
      data: { calls: [call('x/set/0', ['c', 'c', 'c', 'c', 'r'], true)],
        events: [ev({ ev: 'start' }), ev({ ev: 'set-attempt', j: 0, ok: true, ms: 10 }), ev({ ev: 'end', status: 'complete', accepted: 10 })] },
      want: { F2: [1, 1, 0, 0], F1: [0, 0, 0, 0], 'F1 + F2': [1, 1, 0, 0] }, completed: true },
    { name: '(d) F1 fires at attempt 0 in a file without an end event',
      data: { calls: [call('x/set/0', ['c', 'c', 'c'], false)],
        events: [ev({ ev: 'start' }), ev({ ev: 'set-attempt', j: 0, ok: false, ms: 10 })] },
      want: { F2: [0, 0, 0, 0], F1: [1, 0, 0, 1], 'F1 + F2': [1, 0, 0, 1] }, completed: false },
    { name: '(e) a carve failure before the firing set attempt (PLK01 regression): its time counts in the stop estimates',
      data: { calls: [call('x/set/1', ['c', 'c', 'c', 'c', 'c', 'c'], false, 43000)],
        events: [ev({ ev: 'start' }), ev({ ev: 'set-attempt', j: 0, ok: false, reason: 'carve', ms: 8000 }),
          ev({ ev: 'set-attempt', j: 1, ok: false, reason: 'not-in-band', ms: 43000 })] },
      want: { F2: [1, 0, 1, 0], F1: [1, 0, 0, 1], 'F1 + F2': [1, 0, 0, 1] }, completed: false,
      saved: { F1: 51000, 'F1 + F2': 8004 } },
  ];
  /** @type {string[]} */
  const diffs = [];
  for (const c of cases) {
    const e = evaluate(c.data);
    if (e.completed !== c.completed) {
      diffs.push(`${c.name}: completed ${e.completed}, expected ${c.completed}`);
    }
    for (const m of MECHANISMS) {
      const k = /** @type {'F2' | 'F1' | 'F1 + F2'} */ (m);
      const got = [e[k].triggers, e[k].false, e[k].correct, e[k].unknown];
      if (JSON.stringify(got) !== JSON.stringify(/** @type {any} */ (c.want)[m])) {
        diffs.push(`${c.name}: ${m} triggers/false/correct/unknown ${got.join('/')}, expected ${/** @type {any} */ (c.want)[m].join('/')}`);
      }
    }
    for (const [m, want] of Object.entries(/** @type {any} */ (c).saved ?? {})) {
      const got = e.saved[m];
      if (got !== want) {
        diffs.push(`${c.name}: ${m} stop estimate ${got} ms, expected ${want} ms`);
      }
    }
  }
  if (diffs.length > 0) {
    console.error(`self-test FAILED (${diffs.length}):\n${diffs.join('\n')}`);
    process.exit(1);
  }
  console.log('self-test passed: 5 synthetic files (SA2 combined case, an all-capped completed request, an F2-lost successful call, a censored tail, a carve failure before the firing attempt)');
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) {
    selfTest();
  } else if (argv.length === 0) {
    console.error('usage: node failfast.mjs <files...> | --self-test');
    process.exit(1);
  } else {
    process.stdout.write(report(argv));
  }
}

// D36 summary (MP09d2): reads the captures of spent.mjs, flow.mjs, flow-pool.mjs and avail.mjs and prints Markdown;
// it writes nothing. Per file: a heading with the file name, a table of its `call` lines (rated candidates, AR1
// refusals, unrateable profiles from the `spent` line that follows each call, best rated score, whether some rated
// score is in band, the result), one bullet per driver line (`start`, `set-attempt`, `set`, `set-done`, `end`) and a
// total line. ASCII output only.
//   node ./<this folder>/summarise.mjs <files...>
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const files = process.argv.slice(2);
if (files.length === 0) {
  throw new Error('usage: summarise.mjs <files...>');
}
const DRIVER_EVENTS = new Set(['start', 'set-attempt', 'set', 'set-done', 'end']);

/** @param {string} text */
const ascii = (text) => text.replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
/** @param {any} call */
const inBand = (call) => call.ratings.some((/** @type {any} */ r) => r.s >= call.target.min
  && (call.target.max === null || call.target.max === undefined || r.s < call.target.max));
/** @param {any} call */
const resultText = (call) => (call.result.ok ? `ok ${call.result.s} (${call.result.n} clues)` : String(call.result.reason));

const sum = { files: 0, calls: 0, rated: 0, refused: 0, capped: 0, setOk: 0, setFailed: 0 };
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
  console.log(`## ${ascii(basename(file))}`);
  console.log('');
  console.log('| Call | Rated | Refused (AR1) | Capped | Best score | In band | Result |');
  console.log('|---|---|---|---|---|---|---|');
  const total = { calls: 0, rated: 0, refused: 0, capped: 0, setOk: 0, setFailed: 0 };
  lines.forEach((line, i) => {
    if (line.kind !== 'call') {
      return;
    }
    const next = lines[i + 1];
    const spent = next !== undefined && next.kind === 'spent' && next.tag === line.tag ? next : null;
    const best = line.ratings.length === 0 ? '-' : String(Math.max(...line.ratings.map((/** @type {any} */ r) => r.s)));
    console.log(`| ${ascii(String(line.tag))} | ${line.ratings.length} | ${(line.repairs ?? []).length} | ${spent === null ? '?' : spent.capped} | `
      + `${best} | ${inBand(line) ? 'yes' : 'no'} | ${ascii(resultText(line))} |`);
    total.calls += 1;
    total.rated += line.ratings.length;
    total.refused += (line.repairs ?? []).length;
    total.capped += spent === null ? 0 : spent.capped;
  });
  console.log('');
  for (const line of lines) {
    if (line.kind === 'call' || line.kind === 'spent' || !DRIVER_EVENTS.has(line.ev)) {
      continue;
    }
    const { kind, tag, ...rest } = line;
    console.log(`- ${ascii(JSON.stringify(rest))}`);
    if (line.ev === 'set-attempt') {
      total[line.ok === true ? 'setOk' : 'setFailed'] += 1;
    }
  }
  console.log('');
  console.log(`Total: ${total.calls} calls, ${total.rated} rated, ${total.refused} refused, ${total.capped} capped, `
    + `${total.setOk} set attempts ok, ${total.setFailed} failed`);
  console.log('');
  sum.files += 1;
  for (const key of Object.keys(total)) {
    sum[/** @type {keyof typeof total} */ (key)] += total[/** @type {keyof typeof total} */ (key)];
  }
}
if (files.length > 1) {
  console.log(`Total over ${sum.files} files: ${sum.calls} calls, ${sum.rated} rated, ${sum.refused} refused, `
    + `${sum.capped} capped, ${sum.setOk} set attempts ok, ${sum.setFailed} failed`);
}

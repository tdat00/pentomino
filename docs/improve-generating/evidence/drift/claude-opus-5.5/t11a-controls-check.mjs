// Read-only check (SA-Opus, ruling on V4-T11a's QUESTION 1): which Nightmare cells of MP12b1 are completion-passing
// (at least 18 of 20 runs valid and reaching ten) when the landscape's post-interval sampling entries are or are not
// part of `runStatus`. Reads the reports only; writes nothing.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const { runStatus, reachedTen } = await import(`file:///${join(root, 'tools/ig-proto/verdicts.mjs').replace(/\\/g, '/')}`);
const { mp12b1Report } = await import(`file:///${join(root, 'tools/ig-proto/lib/paths.mjs').replace(/\\/g, '/')}`);
const boards = JSON.parse(readFileSync(join(root, 'tools/ig-proto/data/boards-v1.json'), 'utf8'));
const ids = Object.keys(boards.cases).filter((id) => /-nightmare$/.test(id));
const withoutSampling = (run) => ({ ...run, errors: (run.errors ?? []).filter((e) => e?.phase !== 'sampling') });
const rows = [];
for (const id of ids) {
  const found = mp12b1Report(id);
  if (found === null || found === undefined) {
    rows.push(`${id}: no report`);
    continue;
  }
  const report = found.report ?? JSON.parse(readFileSync(join(root, found.path ?? found), 'utf8'));
  const runs = (report.runs ?? []).filter((r) => r.probeKind === 'generation');
  const literal = runs.filter((r) => runStatus(r, { quantity: 10 }).status === 'valid' && reachedTen(r, { quantity: 10 })).length;
  const stripped = runs.filter((r) => runStatus(withoutSampling(r), { quantity: 10 }).status === 'valid' && reachedTen(r, { quantity: 10 })).length;
  const other = runs.flatMap((r) => (r.errors ?? []).filter((e) => e?.phase !== 'sampling').map((e) => `${e.phase}/${e.code}`));
  rows.push(`${id}: runs ${runs.length}, valid reaching ten ${literal} literal, ${stripped} without sampling${stripped >= 18 ? '  CONTROL' : ''}${other.length ? `; other errors ${[...new Set(other)].join(',')}` : ''}`);
}
console.log(rows.join('\n'));

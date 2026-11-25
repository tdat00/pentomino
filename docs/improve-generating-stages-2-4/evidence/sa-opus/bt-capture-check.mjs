// @ts-check
// SA-Opus, review 2 of the stages 2 to 4 pack (R2-07): the normalized text capture of T12b step 1 reproduces the
// indexed sha256Lf. For the three mutable harness sources the indices name, it reads the 57ef5cf blob with read-only
// `git --no-pager show`, normalizes it as the capture block does (BOM removed, CRLF) and compares `sha256Text` with
// SA-Astra's review-input-index.json. Read-only: nothing is written.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-capture-check.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const { lf, sha256Text } = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'lib', 'records.mjs')).href);
const index = JSON.parse(readFileSync(join(ROOT, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-astra', 'review-input-index.json'), 'utf8'));
let bad = 0;
for (const path of ['tools/ig-proto/lib/lane-worker.mjs', 'tools/ig-proto/manifest.mjs', 'tools/ig-proto/v4-check.mjs']) {
  const entry = index.find((/** @type {any} */ e) => String(e.path).replace(/\\/g, '/') === path);
  const blob = execFileSync('git', ['--no-pager', 'show', `57ef5cf:${path}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  const text = lf(blob.replace(/^\uFEFF/, '')).replace(/\n/g, '\r\n');
  const ok = entry !== undefined && entry.sha256Lf === sha256Text(text);
  bad += ok ? 0 : 1;
  process.stdout.write(`${ok ? 'ok' : 'FAIL'} ${path}: indexed ${entry?.sha256Lf ?? 'none'}, normalized blob ${sha256Text(text)}\n`);
}
process.stdout.write(`bt-capture-check: ${bad === 0 ? 'every capture reproduces its indexed hash' : `${bad} mismatch(es)`}\n`);
process.exitCode = bad === 0 ? 0 : 1;

// @ts-check
// SA-Opus, break-tasks of improve-generating-stages-2-4: fills the placeholders `@@<name>@@` (alone on a line, any
// indent) of a task file with the JSON that bt-live.mjs printed into bt-live-out-<name>.json, indented like the
// placeholder, so that the task files give the manifests verbatim. Writes only the named task file.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-fill.mjs <task file>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (file === undefined) {
  throw new Error('usage: bt-fill.mjs <task file>');
}
const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const out = text.replace(/^( *)@@([a-z][\w-]*)@@$/gm, (_, indent, name) => {
  n += 1;
  const json = readFileSync(join(HERE, `bt-live-out-${name}.json`), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  return json.split('\n').map((l) => (l === '' ? '' : `${indent}${l}`)).join('\n');
});
writeFileSync(file, out.replace(/\n/g, '\r\n'));
process.stdout.write(`bt-fill: ${n} placeholders filled in ${file}\n`);

// @ts-check
// SA-Opus, improve-generating phase 2, round-1 analysis: resolves the variant chain of the shipped frozen arms
// (fr-frozen, fr-frozen-none) as tools/ig-proto applies it to the frozen source 3fc65f4, and lists every added file,
// parameter and anchored edit by target file. Read-only; writes p2-variant-chain.md beside itself.
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-variant-chain.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const V = join(ROOT, 'tools', 'ig-proto', 'variants');
/** @param {string} id @returns {any} */
const load = (id) => JSON.parse(readFileSync(join(V, `${id}.json`), 'utf8'));

/** Depth-first, parents before children, each variant once. */
function chain(/** @type {string} */ id, /** @type {string[]} */ seen = []) {
  const v = load(id);
  for (const p of v.extends ?? []) chain(p, seen);
  if (!seen.includes(id)) seen.push(id);
  return seen;
}
const first = (/** @type {string | undefined} */ s) => (s ?? '').split('\n').find((l) => l.trim() !== '')?.trim().slice(0, 110) ?? '';
const out = ['# Variant chains of the shipped frozen arms (SA-Opus, phase-2 analysis)', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-variant-chain.mjs` (read-only).',
  'Source: `tools/ig-proto/variants/*.json` at the base of `gen-v4`. The harness applies each chain to the frozen source `3fc65f4`.',
  'The chain order is a depth-first resolution of `extends` (parents first, each variant once); the harness\'s own order is in',
  '`tools/ig-proto/variant.mjs`.', ''];
/** @type {string[]} */
const summary = [];
for (const arm of ['fr-frozen', 'fr-frozen-none']) {
  const ids = chain(arm);
  out.push(`## ${arm}`, '', `Chain: ${ids.map((i) => `\`${i}\``).join(' → ')}.`, '');
  /** @type {Record<string, number>} */
  const perFile = {};
  for (const id of ids) {
    const v = load(id);
    const edits = v.edits ?? [];
    out.push(`### ${id} (${edits.length} edits${(v.files ?? []).length ? `; adds the files of \`variants/files/${v.files.join('`, `')}\`` : ''})`, '',
      (v.description ?? '').replace(/\s+/g, ' ').trim(), '');
    if (v.params && Object.keys(v.params).length) out.push(`Params: \`${JSON.stringify(v.params)}\``, '');
    for (const e of edits) {
      perFile[e.file] = (perFile[e.file] ?? 0) + 1;
      const kind = e.append !== undefined ? 'append' : 'replace';
      out.push(`- \`${e.file}\` (${kind}${e.id ? `, ${e.id}` : ''}): ${kind === 'append' ? `+ ${first(e.append).replace(/`/g, "'")}` : `'${first(e.find).replace(/`/g, "'")}'`}`);
    }
    if (edits.length) out.push('');
  }
  const files = Object.entries(perFile).sort();
  out.push('Edits per file:', '', ...files.map(([f, n]) => `- \`${f}\`: ${n}`), '');
  summary.push(`${arm}: ${ids.length} variants; ${files.reduce((a, [, n]) => a + n, 0)} edits in ${files.length} files (${files.map(([f, n]) => `${f.replace(/^.*\//, '')} ${n}`).join(', ')})`);
}
writeFileSync(join(HERE, 'p2-variant-chain.md'), `${out.map((l) => l.trimEnd()).join('\r\n')}\r\n`);
process.stdout.write(`${summary.join('\n')}\n`);

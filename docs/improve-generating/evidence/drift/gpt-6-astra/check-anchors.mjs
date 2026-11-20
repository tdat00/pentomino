// @ts-check
// Read-only applicability check: source blobs from Git, manifests from the provisional harness.
// Run from the repository root: node docs\improve-generating\evidence\drift\gpt-6-astra\check-anchors.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listVariants, planTree } from '../../../../../tools/ig-proto/lib/tree.mjs';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const manifestsRoot = join(root, 'tools', 'ig-proto', 'variants');
const ids = listVariants();
const manifests = ids.map((id) => JSON.parse(readFileSync(join(manifestsRoot, `${id}.json`), 'utf8')));
const paths = [...new Set([
  'tools/calibrate.mjs',
  'tools/bench/report.js',
  ...manifests.flatMap((m) => (m.edits ?? []).map((edit) => edit.file)),
])].sort();
const revisions = process.argv.slice(2);
if (revisions.length === 0) {
  revisions.push('cd5d17f', '3fc65f4');
}

for (const revision of revisions) {
  const sources = new Map(paths.map((path) => [
    path,
    execFileSync('git', ['show', `${revision}:${path}`], { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n'),
  ]));
  console.log(`\nSource ${revision}; ${ids.length} variant manifests; in-memory edits only`);
  const failed = new Map();
  let passed = 0;
  for (const id of ids) {
    const errors = [];
    const plan = planTree(id, { sources, errors });
    console.log(`${errors.length === 0 ? 'PASS' : 'FAIL'} ${id}: ${plan.edits.length} applied; ${errors.length} failed`);
    if (errors.length === 0) {
      passed += 1;
    }
    for (const error of errors) {
      const key = error.replace(` (${id})`, '');
      const variants = failed.get(key) ?? [];
      variants.push(id);
      failed.set(key, variants);
    }
  }
  console.log(`Summary: ${passed}/${ids.length} variants have every anchor; ${failed.size} distinct failing edits`);
  for (const [error, variants] of failed) {
    console.log(`${error}; variants: ${variants.join(', ')}`);
  }
}

console.log('\nExplicit file:line references in plan v4 sections 2-6 (plan at HEAD):');
const plan = readFileSync(join(root, 'docs', 'improve-generating', 'plan.md'), 'utf8').split(/\r?\n/);
let inScope = false;
plan.forEach((line, index) => {
  if (line.startsWith('## 2.')) {
    inScope = true;
  } else if (line.startsWith('## 7.')) {
    inScope = false;
  }
  if (inScope && /:\d/.test(line)) {
    console.log(`${index + 1}: ${line}`);
  }
});

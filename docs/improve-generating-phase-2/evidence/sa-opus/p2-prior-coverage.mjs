// @ts-check
// SA-Opus, improve-generating phase 2, round-1 analysis: which offered Nightmare boards the frozen tables cover.
// Reads tools/ig-proto/data/prior-s3-v1.json and docs/improve-generating/evidence/frozen/V4-S3/freeze.json (bounds),
// enumerates the rectangles W x H (3 <= W <= H <= 32) whose area the Generator offers for Nightmare (81 cells and up;
// at most 484 on a desktop and 360 on a phone while BQ-1 and BQ-3 are not run: core/engine/policy.js:24-31,
// generator/state.js:322-324), and counts them per screen class and with or without a prior-table cell.
// Read-only; writes p2-prior-coverage.md.
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-prior-coverage.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'tools', 'ig-proto', 'data', 'prior-s3-v1.json'), 'utf8'));
const freeze = JSON.parse(readFileSync(join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S3', 'freeze.json'), 'utf8'));
const tableAreas = Object.keys(prior.cells).filter((k) => k.startsWith('nightmare@')).map((k) => Number(k.split('@')[1])).sort((a, b) => a - b);
/** @param {number} area @returns {string} */
const classOf = (area) => {
  for (const [id, [level, lo, hi]] of Object.entries(freeze.bounds)) {
    if (level === 'nightmare' && area >= lo && (hi === null || area <= hi)) return id;
  }
  return 'unlisted';
};
const W = freeze.values.W;
const lines = ['# Prior-table and screen-class coverage of the offered Nightmare rectangles (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-prior-coverage.mjs` (read-only).', '',
  `Nightmare areas with a \`prior-s3-v1\` cell: ${tableAreas.join(', ')} (${tableAreas.length}).`,
  'A board whose active-cell count has no cell starts its locate at K - 8 with step 8 (frozen `priorCount`,',
  '`tools/ig-proto/variants/files/v4/core/engine/ig-select-v4.js:199-205`).', ''];
for (const [label, cap] of [['desktop (484 cells)', 484], ['phone (360 cells)', 360]]) {
  /** @type {Record<string, { rects: number, withPrior: number, without: { w: number, h: number }[], examplesWithout?: string[] }>} */
  const by = {};
  let total = 0;
  let withPrior = 0;
  for (let w = 3; w <= 32; w += 1) {
    for (let h = w; h <= 32; h += 1) {
      const area = w * h;
      if (area < 81 || area > /** @type {number} */ (cap)) continue;
      const cls = classOf(area);
      const has = tableAreas.includes(area);
      const c = (by[cls] ??= { rects: 0, withPrior: 0, without: [] });
      c.rects += 1;
      total += 1;
      if (has) {
        c.withPrior += 1;
        withPrior += 1;
      } else {
        c.without.push({ w, h });
      }
    }
  }
  // The examples are the most nearly square boards without a cell, smallest first.
  for (const c of Object.values(by)) {
    c.examplesWithout = c.without.sort((a, b) => a.h / a.w - b.h / b.w || a.w * a.h - b.w * b.h).slice(0, 6).map((r) => `${r.w}x${r.h}`);
  }
  lines.push(`## Rectangles offered on a ${label}`, '',
    `${total} rectangles (W <= H), ${withPrior} with a prior cell (${(100 * withPrior / total).toFixed(1)} %).`, '',
    '| Screen class (freeze bounds) | Shipped W | Rectangles | With a prior cell | Examples without one |', '|---|---|---:|---:|---|');
  for (const cls of ['n-small', 'unlisted', 'n-mid', 'n-upper', 'n-large']) {
    const c = by[cls];
    if (c === undefined) continue;
    const shipped = cls === 'n-mid' ? `${W['n-mid'] / 1e6} M` : 'none (760 M)';
    lines.push(`| ${cls} | ${shipped} | ${c.rects} | ${c.withPrior} | ${(c.examplesWithout ?? []).join(', ')} |`);
  }
  lines.push('');
}
lines.push('"Shipped W" is the V4-S4F selection (`docs/improve-generating/evidence/frozen/V4-S4F/verdicts.md`): only `n-mid`',
  'ships the screen. "unlisted" are the areas 145-195 and 325-359, which no class lists (no screen).', '');
writeFileSync(join(HERE, 'p2-prior-coverage.md'), lines.join('\r\n'));
process.stdout.write(`${lines.join('\n')}\n`);

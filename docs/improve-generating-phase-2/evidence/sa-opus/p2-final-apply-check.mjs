// SA-Opus, phase 2 finalization: checks that every exact replacement text (blockquote) of SA-Astra's review
// sa-astra/review-report-plan.md (R1 to R6) is present in plan.md or report.md, and that the R5 task-table
// dependencies and the owner decisions are recorded. Read-only; run from the repository root:
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-final-apply-check.mjs
import fs from 'node:fs';

const dir = 'docs/improve-generating-phase-2/';
const review = fs.readFileSync(dir + 'sa-astra/review-report-plan.md', 'utf8').replace(/\r\n/g, '\n');
const plan = fs.readFileSync(dir + 'plan.md', 'utf8').replace(/\r\n/g, '\n');
const report = fs.readFileSync(dir + 'report.md', 'utf8').replace(/\r\n/g, '\n');
const clar = fs.readFileSync(dir + 'clarifications.md', 'utf8').replace(/\r\n/g, '\n');

/** @param {string} s */
const norm = (s) => s.replace(/[–]/g, '-').replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const hay = norm(plan) + ' \u0000 ' + norm(report);

// Blockquote paragraphs, with the finding they belong to.
const paragraphs = [];
let finding = '';
let cur = [];
const flush = () => {
  if (cur.length > 0) {
    paragraphs.push({ finding, text: norm(cur.join(' ')) });
    cur = [];
  }
};
for (const line of review.split('\n')) {
  const h = /^## (R\d)\b/.exec(line);
  if (h) {
    flush();
    finding = h[1];
    continue;
  }
  const q = /^\s*>\s?(.*)$/.exec(line);
  if (q) {
    if (q[1].trim() === '') flush();
    else cur.push(q[1]);
  } else {
    flush();
  }
}
flush();

// The documented adaptations: hyphens and straight quotes as in the plan, table cells instead of a dash, no final
// period in a table cell, `require` rows.
/** @param {string} t */
function needles(t) {
  let s = t.replace(/^REQUIRE and/, '`require` rows and').replace(/\. REQUIRE and/, '. `require` rows and');
  return s
    .split(' — ')
    .map((p) => p.replace(/^verified by /, '').replace(/\.$/, '').trim())
    .filter((p) => p.length > 0);
}

let missing = 0;
for (const p of paragraphs.filter((x) => x.finding !== '')) {
  for (const n of needles(p.text)) {
    const ok = hay.includes(n);
    if (!ok) missing++;
    console.log(`${ok ? 'present' : 'MISSING'} ${p.finding}: ${n.slice(0, 90)}${n.length > 90 ? '...' : ''}`);
  }
}

/** @param {string} id */
const row = (id) => plan.split('\n').find((l) => l.startsWith(`| ${id} |`)) ?? '';
const checks = [
  ['R5 P2-12 depends on P2-09; P2-11', / \| Dev \| P2-09; P2-11 \| 3 \|$/.test(row('P2-12'))],
  ['R5 P2-14 depends on P2-12', / \| Dev \| P2-12 \| 2\.5 \|$/.test(row('P2-14'))],
  ['R1 D-P2-07 clamped fallback', row('D-P2-07').includes('`clamp(K - 8, 1, K - 2)` with step 8')],
  ['R6.6 report task count', norm(report).includes('about 46 developer hours in 17 developer tasks, plus five SA/orchestrator tasks')],
  ['R6.7 reserve cut', norm(report).includes('one distinct cell/seed, 14x14 Hell 1 rep 33 (two bounded-arm rows)')],
  ['Owner D-P2-15 with message id', row('D-P2-15').includes('1575060196269490259')],
  ['Owner D-P2-16 with message id', row('D-P2-16').includes('1575060196269490259')],
  ['Status final', plan.includes('\nStatus: Final (2026-11-25, base 7c1bad2)\n')],
  ['clarifications: no open questions', clar === '# Clarifications: improve-generating phase 2\n\nNo open questions.\n'],
  ['no stale "Q-P2-1 ... open"', !/Q-P2-1, Q-P2-5 \| open/.test(plan)],
  ['no stale "re-derived"', !/REPLAY` (is )?re-derived|`REPLAY` re-derived/.test(plan + report)],
];
for (const [name, ok] of checks) {
  if (!ok) missing++;
  console.log(`${ok ? 'present' : 'MISSING'} ${name}`);
}
console.log(`paragraphs ${paragraphs.filter((x) => x.finding !== '').length}; problems ${missing}`);
process.exitCode = missing === 0 ? 0 : 1;

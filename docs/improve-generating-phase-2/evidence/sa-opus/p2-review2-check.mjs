// @ts-check
// SA-Opus: checks that every exact replacement text of SA-Astra's review-2 and review-3 is present in the revised pack.
// Unlocked and engine-free. Usage (repository root):
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-review2-check.mjs
// It prints a Markdown report; p2-review2-check.md is that output.
//
// Method. Each blockquote of a review (contiguous `>` lines) and each fenced code block is one replacement text.
// Texts and pack files are compared after collapsing whitespace ("exact"). When that fails, a second comparison also
// ignores Markdown formatting (backticks, asterisks and straight double quotes: "format-insensitive"). A block not found
// whole is checked paragraph by paragraph (a reviewer's block may be placed in several steps), and a paragraph not
// found is checked sentence by sentence, so a partial deviation is named. Further checks cover the replacements that a
// review states inline, and the test cases it requests.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PACK = join(ROOT, 'tasks', 'improve-generating-phase-2');
const read = (/** @type {string} */ f) => readFileSync(join(PACK, f), 'utf8').replace(/\r\n/g, '\n');

/** @type {{ file: string, text: string }[]} */
const files = readdirSync(PACK)
  .filter((f) => f.endsWith('.md') && !f.startsWith('review-'))
  .sort()
  .map((f) => ({ file: f, text: read(f) }));

const exact = (/** @type {string} */ s) => s.replace(/\s+/g, ' ').trim();
const loose = (/** @type {string} */ s) => exact(s.replace(/[`*"]/g, '').replace(/^\s*>\s?/gm, ''));
const packExact = files.map((f) => ({ file: f.file, text: exact(f.text.replace(/^\s*>\s?/gm, '')) }));
const packLoose = files.map((f) => ({ file: f.file, text: loose(f.text) }));

/** @param {string} needle @returns {{ level: string, where: string[] }} */
function find(needle) {
  const e = exact(needle);
  let where = packExact.filter((f) => f.text.includes(e)).map((f) => f.file);
  if (where.length > 0) {
    return { level: 'exact', where };
  }
  const l = loose(needle);
  where = packLoose.filter((f) => f.text.includes(l)).map((f) => f.file);
  return where.length > 0 ? { level: 'format-insensitive', where } : { level: 'absent', where: [] };
}

/** @param {string} text @returns {{ section: string, kind: string, text: string }[]} */
function blocksOf(text) {
  const blocks = [];
  let section = '';
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const h = /^##+ (.*)$/.exec(line);
    if (h) {
      section = h[1];
      continue;
    }
    if (/^\s*```/.test(line)) {
      const body = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ section, kind: 'code', text: body.join('\n') });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      i -= 1;
      blocks.push({ section, kind: 'quote', text: body.join('\n') });
    }
  }
  return blocks;
}

const esc = (/** @type {string} */ s) => s.replace(/\|/g, '\\|');
const sentencesOf = (/** @type {string} */ s) => exact(s).split(/(?<=[.:;])\s+(?=[A-Z`*])/);

/**
 * @param {string[]} out
 * @param {string} reviewFile
 * @param {(section: string) => boolean} isReplacement
 * @param {[string, string, (text: string) => boolean][]} inline
 * @param {[string, string, string][]} cases
 */
function checkReview(out, reviewFile, isReplacement, inline, cases) {
  const replacements = blocksOf(read(reviewFile)).filter((b) => isReplacement(b.section));
  out.push(`## ${reviewFile}`, '');
  out.push('### Block replacements', '');
  out.push('| # | Section | Kind | First words | Result | Found in |');
  out.push('|---:|---|---|---|---|---|');
  /** @type {{ n: number, parts: { paragraph: string, r: { level: string, where: string[] }, sentences: { s: string, r: { level: string, where: string[] } }[] }[] }[]} */
  const split = [];
  replacements.forEach((b, i) => {
    let r = find(b.text);
    const n = i + 1;
    if (r.level === 'absent') {
      const paragraphs = b.text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p !== '');
      const parts = paragraphs.map((paragraph) => {
        const pr = find(paragraph);
        const sentences = pr.level === 'absent' ? sentencesOf(paragraph).map((s) => ({ s, r: find(s) })) : [];
        return { paragraph, r: pr, sentences };
      });
      const whole = parts.every((p) => p.r.level !== 'absent');
      r = { level: whole ? 'present by paragraph' : 'partly absent', where: [...new Set(parts.flatMap((p) => p.r.where))] };
      split.push({ n, parts });
    }
    out.push(`| ${n} | ${esc(b.section)} | ${b.kind} | ${esc(exact(b.text).slice(0, 60))} | ${r.level} | ${r.where.join(', ')} |`);
  });
  out.push('');
  for (const s of split) {
    out.push(`Block ${s.n}, paragraph by paragraph:`, '');
    out.push('| Paragraph or sentence | Result | Found in |');
    out.push('|---|---|---|');
    for (const p of s.parts) {
      out.push(`| ${esc(exact(p.paragraph).slice(0, 80))} | ${p.r.level} | ${p.r.where.join(', ')} |`);
      for (const { s: sentence, r } of p.sentences) {
        out.push(`| - sentence: ${esc(sentence)} | ${r.level} | ${r.where.join(', ')} |`);
      }
    }
    out.push('');
  }
  out.push('### Inline replacements', '');
  out.push('| Replacement | File | Result |');
  out.push('|---|---|---|');
  for (const [what, file, test] of inline) {
    const f = files.find((x) => x.file === file);
    out.push(`| ${esc(what)} | \`${file}\` | ${f !== undefined && test(f.text) ? 'present' : 'ABSENT'} |`);
  }
  out.push('');
  out.push('### Requested tests', '');
  out.push('| Requested case | File | Text in the test table | Result |');
  out.push('|---|---|---|---|');
  for (const [what, file, needle] of cases) {
    const f = files.find((x) => x.file === file);
    out.push(`| ${esc(what)} | \`${file}\` | ${esc(needle)} | ${f !== undefined && f.text.includes(needle) ? 'present' : 'ABSENT'} |`);
  }
  out.push('');
  const absentBlocks = split.filter((s) => s.parts.some((p) => p.r.level === 'absent')).length;
  return { blocks: replacements.length, inline: inline.length, cases: cases.length, absentBlocks };
}

const has = (/** @type {string} */ needle) => (/** @type {string} */ t) => t.includes(needle);
const lacks = (/** @type {string} */ needle) => (/** @type {string} */ t) => !t.includes(needle);

const out = [];
out.push('# Review-2 and review-3 replacement check (SA-Opus)', '');
out.push('Generated by `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-review2-check.mjs`; engine-free.', '');
out.push(`Pack files searched: ${files.length} (every \`.md\` of \`tasks/improve-generating-phase-2/\` except the reviews).`, '');

const r2 = checkReview(out, 'review-2.md', (s) => !s.startsWith('9.'), [
  ['R2-05: P2-19 steps 2 and 3, both catch filters', 'P2-19-stage-a.md', (t) => t.split("'^STOP: (accounting|ledger|seal|reservation)'").length === 3],
  ['R2-06 B: the 17-trigger test expects 3,308', 'P2-13c-p5-coverage-twins.md', has('`repriceCountedS` 3,308')],
  ['R2-06 B: its guard projection 4,135', 'P2-13c-p5-coverage-twins.md', has('`repriceGuardS` 4,135')],
  ['R2-03.2: P2-16c starts after P2-12d', 'P2-16c-no-window-glue.md', has('join; P2-12d (the traced/tagged copies) and P2-09.')],
  ['R2-03.2: the conditional raw-side rerun is removed from check-list §3.7', 'check-list.md', lacks('no trace in the copy')],
  ['R2-03.1: proofs.mjs is in P2-12b\'s $Allowed', 'P2-12b-copies.md', has("'tools/ig-proto/phase2/proofs.mjs'")],
  ['R2-03.1: proofs.mjs is not in P2-12c\'s $Allowed', 'P2-12c-proof-bundles.md', lacks("'tools/ig-proto/phase2/proofs.mjs'")],
  ['R2-03.1: P2-12e\'s focused gate names only its own test file', 'P2-12e-proof-bundles-prior-legacy.md', has("-NodeArgs @('--test', 'tools/ig-proto/phase2/proofs-prior-legacy.test.mjs')")],
  ['R2-03.4: P2-16a has no gate-2 command row', 'P2-16a-integrated-cases.md', lacks('| gate 2 of `gates.md` (locked)')],
  ['R2-06 C: the UI recipe script writes its own log', 'P2-15-cutover.md', has('to `E/P2-15/ui-recipe.log` itself')],
  ['R2-06 C: the forward check writes its own log', 'P2-15-cutover.md', has('to `E/P2-15/forward-check.log` itself')],
], [
  ['R2-01.4 (1) raw no-window outcome and rescue start through runGroup, publish and the readers', 'P2-13f-glue-and-reach.md', '`raw outcomes and rescue starts survive to the readings`'],
  ['R2-01.4 (2) a valid new sentinel with no historical oracle', 'P2-13c-p5-coverage-twins.md', '`a valid new sentinel has no historical unknown`'],
  ['R2-01.4 (3) a missing counterpart; an invalid twin receipt', 'P2-13c-p5-coverage-twins.md', '`a missing counterpart or an invalid twin is unresolved`'],
  ['R2-01.4 (4) one required A twin missing, every B twin present', 'P2-13c-p5-coverage-twins.md', '`B8 covers both stages`'],
  ['R2-02.4 (1) arrival order [2, 0, 3, 1], transported not-in-band', 'P2-13f-glue-and-reach.md', '`a raw match survives a broken transport`'],
  ['R2-02.4 (2) uncapped row that later succeeds', 'P2-13f-glue-and-reach.md', '`an uncapped row that continues is no missing-bound defect`'],
  ['R2-02.4 (3) one trace module, two destinations', 'P2-12d-trace-layer.md', '`each destination begins with its worker header`'],
  ['R2-04.3 stale-but-self-consistent copy input digest', 'P2-13e-source-and-row-binding.md', '`the seal refuses a stale but self-consistent copy`'],
  ['R2-04.3 rehearsal copy at seal', 'P2-13e-source-and-row-binding.md', '`the seal refuses a rehearsal copy`'],
  ['R2-04.3 changed reused comparator input', 'P2-13e-source-and-row-binding.md', '`a changed reused comparator input is drift`'],
  ['R2-04.3 mismatched raw report hash/seed', 'P2-13v-binding-verifiers.md', '`a mismatched raw report hash or seed is refused`'],
  ['R2-04.3 mismatched raw report on resume', 'P2-13e-source-and-row-binding.md', '`a mismatched raw report is interrupted on resume`'],
  ['R2-04.3 old-seal terminal key after a new seal', 'P2-13e-source-and-row-binding.md', '`an old-seal terminal key is refused after a new seal`'],
  ['R2-05 missing individual browser receipt', 'P2-13b-comparator.md', '`a missing individual browser receipt is incomplete`'],
  ['R2-05 seven measured and one not-measured item; checkReadout refuses', 'P2-13b-comparator.md', '`a not-measured resource item leaves A4 incomplete, and B is refused without the owner line`'],
  ['R2-05 six individual receipts pass without an aggregate', 'P2-13b-comparator.md', '`six individual browser receipts pass without an aggregate`'],
  ['R2-06 A start/done example', 'P2-13a-stage-driver.md', '`rowsWritten joins terminals to their start`'],
  ['R2-06 A recovered prior-invocation example', 'P2-13a-stage-driver.md', '`a recovered terminal keeps its original invocation`'],
  ['R2-03.1 compare equal and differing cases in copies.test.mjs', 'P2-12b-copies.md', '`compare returns null for equal values`'],
]);

const r3 = checkReview(out, 'review-3.md', (s) => s.startsWith('R3-'), [
  ['R3-01: the text is in P2-13a\'s `seal --check` paragraph too', 'P2-13a-stage-driver.md', has('(review-3 R3-01, verbatim)')],
  ['R3-01: no "repeats every refusal" remains in P2-13e', 'P2-13e-source-and-row-binding.md', lacks('repeats every refusal')],
  ['R3-02: `SOURCE_FILES` is imported from `../../bench/report.js`', 'P2-13v-binding-verifiers.md', has('`SOURCE_FILES`\n   (`../../bench/report.js`)')],
  ['R3-02: C16 names the base name without its extension (producer side)', 'contracts.md', has('name without its extension (`deadline` for `deadline.html`)')],
  ['R3-02: P2-16e binds the same files (producer side)', 'P2-16e-browser-runner.md', has('base name without its extension')],
], [
  ['R3-01 HEAD changed and only the excluded ledger dirty passes; a sealed file change fails', 'P2-13e-source-and-row-binding.md', '`the check allows ledger-only changes and refuses sealed changes`'],
  ['R3-02 missing resource status is incomplete', 'P2-13v-binding-verifiers.md', 'then item 3 without `status`'],
  ['R3-02 missing resource margin is incomplete', 'P2-13v-binding-verifiers.md', 'then item 6 without `margin`'],
  ['R3-02 missing browser status is incomplete', 'P2-13v-binding-verifiers.md', 'then one without `status`'],
  ['R3-02 `generator/jobs.js` omitted, page kept, is incomplete', 'P2-13v-binding-verifiers.md', 'then one whose `sources` omit `generator/jobs.js`, the page kept'],
]);

const absent = out.filter((l) => / ABSENT \|$/.test(l)).length;
out.push('## Summary', '');
out.push(`- review-2: ${r2.blocks} block replacements, ${r2.inline} inline checks, ${r2.cases} requested tests; ${r2.absentBlocks} block(s) with an absent paragraph (listed above).`);
out.push(`- review-3: ${r3.blocks} block replacements, ${r3.inline} inline checks, ${r3.cases} requested tests; ${r3.absentBlocks} block(s) with an absent paragraph.`);
out.push(`- Inline or test checks absent: ${absent}.`);
process.stdout.write(`${out.join('\n')}\n`);

// @ts-check
// SA-Opus, improve-generating phase 1, review of P1-04's drafts (Dev-Sonnet, uncommitted on dac2ff2): checks every
// number, hash, commit and link of readiness.md and pr-body.md against the sealed records (verification/index.json,
// adoption.json, the logs) and the repository, and checks that pr-body.md keeps every literal line of P1-04 step 4's
// template (file names may be turned into links). Unlocked reads and Git reads only.
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-04-review.mjs
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const F = 'docs/improve-generating-phase-1';
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {string | Buffer} */ b) => createHash('sha256').update(b).digest('hex');
const read = (/** @type {string} */ p) => readFileSync(abs(p), 'utf8');
/** @type {string[]} */
const out = [];
const row = (/** @type {string} */ name, /** @type {boolean} */ ok, /** @type {string} */ detail) => {
  out.push(`| ${name} | ${ok ? 'pass' : 'FAIL'} | ${detail} |`);
};
const readiness = read(`${F}/readiness.md`);
const body = read(`${F}/pr-body.md`);
const idx = JSON.parse(read(`${F}/evidence/verification/index.json`));
const ad = JSON.parse(read(`${F}/evidence/adoption.json`));
const both = (/** @type {string} */ s) => readiness.includes(s) && body.includes(s);

// 1. Qualification numbers.
const g = Object.fromEntries(idx.gates.map((/** @type {any} */ x) => [x.id, x]));
const nums = [idx.qualifiedCommit, idx.attempt, idx.node.node26, idx.node.node22, idx.runtimeDigest,
  `| ${idx.focused.seconds} |`, `| ${g['full-node26'].seconds} |`, `| ${g['full-node22'].seconds} |`,
  `| ${g.fixtures.seconds} |`, `| ${g['replay-case'].seconds} |`, String(idx.nodePlusQuietSeconds),
  `stamped \`${idx.site.version}\``, `${idx.site.files} files`];
const missing = nums.filter((s) => !both(s));
const minutes = (idx.nodePlusQuietSeconds / 60).toFixed(2);
row('qualification values in both files', missing.length === 0 && both(`${minutes} minutes`),
  `commit, attempt, versions, digest, five node-second values, total ${idx.nodePlusQuietSeconds} s = ${minutes} min, site ${idx.site.version}/${idx.site.files}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
const stampText = '414 references in 91 of 114 files stamped';
row('stamp counts', idx.site.stamp.includes('414 reference(s) in 91 of 114 file(s)') && both(stampText), idx.site.stamp);

// 2. Hash tables: every listed SHA-256 equals the index and the file's bytes now.
const indexed = [...idx.focused.files, ...idx.evidence];
const listed = [...body.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)].map((m) => ({ name: m[1], hash: m[2] }));
const hashOk = listed.length === 13 && listed.every((l) => {
  const e = indexed.find((/** @type {any} */ x) => x.path.endsWith(`/${l.name}`));
  return e && e.sha256 === l.hash && sha(readFileSync(abs(e.path))) === l.hash;
});
const sameTables = [...readiness.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)].map((m) => `${m[1]} ${m[2]}`).join('\n')
  === listed.map((l) => `${l.name} ${l.hash}`).join('\n');
row('raw-hash tables', hashOk && sameTables, `${listed.length} rows, equal to index.json and the files; the same table in both documents`);
const captionWrong = body.includes('verification files under') && listed.some((l) => l.name.startsWith('fold-width8/'));
row('hash-table caption accurate', !captionWrong, 'the caption places all rows under the attempt folder, but fold-width8/run.log and helper.log are not there');

// 3. Adoption values.
const b = ad.bench;
const mib = (/** @type {number} */ n) => (n / 1048576).toFixed(3);
const adoptionNums = [ad.inputIndexHash, ad.inspectedCommit, `${mib(b.memory.processPeak)} MiB of a ${mib(b.memory.processLimit)} MiB`,
  `${mib(b.memory.accountedPeak)} MiB of a ${mib(b.memory.accountedLimit)} MiB`, '2,244.925 seconds of a separate 2,700-second grant'];
const cellsOk = b.cells.every((/** @type {any} */ c) => both(`| ${c.cell} | ${c.oldTen}/${c.newTen} | ${c.equal}/${c.pairs} | ${c.response.median.toFixed(5)} |`));
const adMissing = adoptionNums.filter((s) => !(readiness.includes(s) || body.includes(s)));
row('adoption values', cellsOk && adMissing.length === 0 && b.ledger.countedSeconds === 2244.925,
  `7 cell rows (oldTen/newTen, equal/pairs, response median), memory, ledger, inspected commit, input index${adMissing.length ? `; missing: ${adMissing.join(', ')}` : ''}`);
const ten = b.identity.list.find((/** @type {any} */ x) => x.caseId === '10x10-nightmare' && x.oldAccepted === 9);
row('10x10 9/9 pair', ten && ten.seed === 'landscape/10x10-nightmare/2' && both(`seed \`${ten.seed}\``), `rep ${ten?.rep}, seed ${ten?.seed}, ${ten?.category}`);

// 4. Commits and links.
const commits = [...new Set([...readiness.matchAll(/commit\/([0-9a-f]{40})/g), ...body.matchAll(/commit\/([0-9a-f]{40})/g)].map((m) => m[1]))];
const badCommits = commits.filter((c) => spawnSync('git', ['cat-file', '-e', `${c}^{commit}`], { cwd: ROOT }).status !== 0);
row('commit links', badCommits.length === 0, `${commits.length} distinct commits exist${badCommits.length ? `; missing ${badCommits.join(', ')}` : ''}`);
const rel = [...readiness.matchAll(/\]\(([^)#:]+)\)/g)].map((m) => posix.normalize(posix.join(F, m[1])));
const badRel = rel.filter((p) => !existsSync(abs(p)));
row('readiness.md relative links', badRel.length === 0, `${rel.length} links resolve${badRel.length ? `; missing ${badRel.join(', ')}` : ''}`);
const gh = [...body.matchAll(/https:\/\/github\.com\/tdat00\/pentomino\/(blob|tree)\/improve-generating\/([^)\s]+)\)/g)];
const badGh = gh.filter((m) => !existsSync(abs(m[2])) || (m[1] === 'tree') !== statSync(abs(m[2])).isDirectory());
row('pr-body.md branch links', badGh.length === 0, `${gh.length} blob/tree links name existing paths${badGh.length ? `; missing ${badGh.map((m) => m[2]).join(', ')}` : ''}`);

// 5. The literal template of P1-04 step 4 survives line by line (file names may become links).
const task = read('tasks/improve-generating-phase-1/P1-04-readiness-and-pr-description.md');
const blocks = [...task.matchAll(/```markdown\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
const unlink = (/** @type {string} */ s) => s.replace(/\[(`[^`]+`)\]\([^)]+\)/g, '$1');
const bodyLines = new Set(unlink(body).replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()));
const tmpl = blocks.flatMap((x) => x.replace(/\r\n/g, '\n').split('\n')).map((l) => l.trim()).filter(Boolean);
const lost = tmpl.filter((l) => !bodyLines.has(l));
row('literal template lines kept', blocks.length === 3 && lost.length === 0, `${tmpl.length} lines from 3 blocks${lost.length ? `; lost: ${lost.join(' / ')}` : ''}`);

// 6. Route and known item.
row('route, FAIL line and N-P1-DOC', ['Do not merge.', 'separate PR into `main`', 'Phase 0: FAIL (control 26x26-nightmare: fail)', 'This is N-P1-DOC',
  'Neither this PR nor the later phase-2 PR is merged'].every((s) => body.includes(s))
  && ['is not merged', '`gen-v4`', 'N-P1-DOC', 'Phase 0: FAIL (control 26x26-nightmare: fail)'].every((s) => readiness.includes(s)),
'no-merge, gen-v4 into main, phase-0 FAIL line and N-P1-DOC in both documents');

// 7. Format.
const gformat = "import { readFileSync } from 'node:fs'; import { checkText } from './tools/check-conventions.mjs'; let bad = 0; for (const f of process.argv.slice(1)) { const b = readFileSync(f); const t = b.toString('utf8'); const p = checkText(f, b); if (b.includes(10) && !t.includes('\\r\\n')) p.push(f + ': LF line endings, not CRLF'); t.replace(/\\r\\n/g, '\\n').split('\\n').forEach((l, i) => { const m = f + ':' + (i + 1) + ': trailing whitespace'; if (/[ \\t]+$/.test(l) && !p.includes(m)) p.push(m); }); for (const x of p) { console.error(x); bad += 1; } } console.log(bad ? 'format: ' + bad + ' problem(s)' : 'format: OK (' + (process.argv.length - 1) + ' files)'); process.exitCode = bad ? 1 : 0;";
const fmt = spawnSync(process.execPath, ['--input-type=module', '-e', gformat, abs(`${F}/readiness.md`), abs(`${F}/pr-body.md`)], { cwd: ROOT, encoding: 'utf8' });
row('strict G-FORMAT', fmt.status === 0, fmt.stdout.trim());
const words = (/** @type {string} */ s) => s.split(/\s+/).filter(Boolean).length;
row('size', true, `pr-body.md ${body.split('\n').length} lines, ${words(body)} words; readiness.md ${readiness.split('\n').length} lines, ${words(readiness)} words; HEAD ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()}`);

const md = ['# P1-04 drafts: review checks (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-1\\evidence\\sa-opus\\p1-04-review.mjs` (unlocked; reads only).', '',
  '| Check | Result | Detail |', '|---|---|---|', ...out, ''];
writeFileSync(join(HERE, 'p1-04-review.md'), md.join('\r\n'));
process.stdout.write(`${md.join('\n')}\n`);

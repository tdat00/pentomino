// @ts-check
// Read-only cross-review checks; the only runnable site work is static assembly/checking in this evidence folder.
// node docs\improve-generating-phase-1\evidence\sa-astra\cross-review-audit.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool, MAX_POOL_SIZE } from '../../../../core/browser/worker-pool.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-phase-1/evidence/sa-astra';
const BASE = '006ca68';
const abs = (p) => join(ROOT, ...p.split('/'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const inputs = new Map();
const read = (p) => {
  const b = readFileSync(abs(p));
  inputs.set(p, { path: p, bytes: b.length, sha256Raw: sha(b) });
  return b.toString('utf8');
};
const json = (p) => JSON.parse(read(p));
const check = (v, why) => { if (!v) throw new Error(why); };
const commands = [];
const run = (exe, args, stdin, keepOutput = true) => {
  const out = execFileSync(exe, args, { cwd: ROOT, encoding: 'utf8', input: stdin, maxBuffer: 32 * 1024 * 1024 });
  commands.push({ command: [exe === process.execPath ? 'node' : exe, ...args],
    ...(stdin === undefined ? {} : { stdinSha256: sha(stdin) }), outputSha256: sha(out),
    ...(keepOutput ? { output: out.trim() } : {}) });
  return out;
};
const git = (args, stdin, keep = true) => run('git', ['--no-pager', ...args], stdin, keep);
const gh = (args) => JSON.parse(run('gh', args));
const main = git(['rev-parse', 'origin/main']).trim();
const remoteBranch = git(['rev-parse', 'origin/improve-generating']).trim();
const head = git(['rev-parse', 'HEAD']).trim();
const remoteRefs = git(['ls-remote', 'origin', 'refs/heads/main', 'refs/heads/improve-generating']).trim().split(/\r?\n/);
check(remoteRefs.some((r) => r === `${main}\trefs/heads/main`)
  && remoteRefs.some((r) => r === `${remoteBranch}\trefs/heads/improve-generating`), 'Cached remote refs are stale');
const pr = gh(['pr', 'view', '11', '--json',
  'number,state,title,headRefName,headRefOid,baseRefName,baseRefOid,isDraft,mergeable,mergeStateStatus,statusCheckRollup,url,updatedAt,mergedAt,changedFiles']);
check(pr.headRefOid === remoteBranch && pr.baseRefOid === main && pr.state === 'OPEN', 'PR identity changed');
const ciRuns = gh(['run', 'list', '--branch', 'main', '--limit', '3', '--json',
  'databaseId,headSha,workflowName,event,conclusion,status,createdAt,url']);
const releases = gh(['release', 'list', '--limit', '10', '--json', 'tagName,name,isDraft,isPrerelease,publishedAt,createdAt']);
const v12 = gh(['release', 'view', 'v1.2', '--json', 'tagName,name,publishedAt,body,targetCommitish']);
const v13Tag = git(['ls-remote', '--tags', 'origin', 'refs/tags/v1.3']).trim();

const site = ['core', 'generator', 'player', 'assets', 'index.html', 'redirect.js', 'sitemap.xml'];
const deployedFileDiff = git(['diff', '--name-only', main, BASE, '--', ...site]).trim().split(/\r?\n/);
check(deployedFileDiff.join(',') === 'core/engine/clues.js,core/engine/difficulty.js,core/engine/types.js',
  'Unexpected deployed file delta');
check(git(['diff', '--name-only', '3fc65f4', main, '--', ...site]).trim() === '', 'T14 old site differs from main');
check(git(['diff', '--name-only', '27c6189', BASE, '--', ...site]).trim() === '', 'T14 new site differs from the analysis base');
check(git(['diff', '--name-only', BASE, '--', ...site]).trim() === '', 'Current staging inputs differ from the analysis base');
check(git(['cat-file', '-e', `${remoteBranch}:docs/improve-generating/evidence/phase1/P6-bench/compare.md`]) === '',
  'T14 evidence absent from the already published PR head');
const numstat = git(['diff', '--numstat', main, BASE], undefined, false).trim().split(/\r?\n/).map((s) => {
  const [add, del, ...p] = s.split('\t');
  return { add: Number(add) || 0, del: Number(del) || 0, path: p.join('\t') };
});
const research = (p) => p.startsWith('docs/improve-generating') || p.startsWith('tasks/') || p.startsWith('tools/ig-proto/');
const scopes = {
  base: BASE, head, main, remoteBranch,
  aheadMain: Number(git(['rev-list', '--count', `${main}..${BASE}`]).trim()),
  aheadRemoteBranch: Number(git(['rev-list', '--count', `${remoteBranch}..${BASE}`]).trim()),
  files: numstat.length, additions: numstat.reduce((s, r) => s + r.add, 0), deletions: numstat.reduce((s, r) => s + r.del, 0),
  nonResearch: numstat.filter((r) => !research(r.path)), deployedFileDiff,
};
const objectSizes = [];
for (const range of [main, `${main}..${BASE}`, `${remoteBranch}..${BASE}`]) {
  const objects = git(['rev-list', '--objects', range], undefined, false).trim().split(/\r?\n/).filter(Boolean).map((s) => {
    const split = s.indexOf(' ');
    return { id: split < 0 ? s : s.slice(0, split), path: split < 0 ? '' : s.slice(split + 1) };
  });
  const list = git(['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize) %(objectsize:disk)'],
    `${objects.map((o) => o.id).join('\n')}\n`, false).trim().split(/\r?\n/).map((s, i) => {
    const [id, type, raw, disk] = s.split(' ');
    return { ...objects[i], id, type, raw: Number(raw), disk: Number(disk) };
  });
  const diskBytes = list.reduce((s, o) => s + o.disk, 0);
  objectSizes.push({ range, objects: list.length, diskBytes, diskMiB: diskBytes / 1048576,
    diskMB: diskBytes / 1e6, largestBlob: list.filter((o) => o.type === 'blob').sort((a, b) => b.raw - a.raw)[0] });
}

const p6 = json('docs/improve-generating/evidence/phase1/P6-bench/compare.json');
const memoryChanges = p6.cells.map((c) => ({
  cell: c.caseId, processPercent: 100 * (c.new.checks.peakProcessMemory.value / c.old.checks.peakProcessMemory.value - 1),
  accountedPercent: 100 * (c.new.checks.byteAccounting.value / c.old.checks.byteAccounting.value - 1),
}));
const opus = 'docs/improve-generating-phase-1/evidence/sa-opus';
const tests = ['p1-full-node26.log', 'p1-full-node22.log'].map((name) => {
  const s = read(`${opus}/${name}`);
  const summary = Object.fromEntries([...s.matchAll(/^# (tests|pass|fail|cancelled|skipped|duration_ms) (\S+)/gm)]
    .map((m) => [m[1], Number(m[2])]));
  check(summary.tests === 1514 && summary.pass === 1514 && summary.fail === 0 && summary.cancelled === 0
    && summary.skipped === 0 && /p1-run: exit 0/.test(s), `Non-passing test evidence: ${name}`);
  return { path: `${opus}/${name}`, runtime: s.split(/\r?\n/)[0], summary };
});
const verification = read(`${opus}/p1-verify.log`);
const nodeSeconds = [...verification.matchAll(/IG .+? exit=0 seconds=([\d.]+) quiet=45/g)].map((m) => Number(m[1]));
check(nodeSeconds.length === 4, 'Expected four successful locked verification invocations');
let factories = 0;
let eight;
try {
  createPool({ size: 8, workerFactory: () => { factories += 1; throw new Error('No worker may be launched by this check'); } });
  eight = 'accepted';
} catch (error) {
  eight = `${error.name}: ${error.message}`;
}
check(MAX_POOL_SIZE === 4 && factories === 0 && eight === 'RangeError: pool size must be an integer from 1 to 4',
  'Eight-worker counterexample differs');

// Independently reproduce CI's static site pipeline, not its tests or deployment. Remove only this fresh owned copy.
const staging = `${HERE}/cross-site-owned`;
const stagingRelative = relative(process.cwd(), abs(staging));
check(!existsSync(abs(staging)), 'Owned staging directory already exists; nothing overwritten');
const walk = (p) => readdirSync(abs(p), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap((e) => e.isDirectory() ? walk(`${p}/${e.name}`) : [`${p}/${e.name}`]);
const sourceSiteFiles = site.flatMap((p) => p.includes('.') ? [p] : walk(p)).sort();
sourceSiteFiles.forEach(read);
let stagedSite;
mkdirSync(stagingRelative);
try {
  for (const p of site) cpSync(abs(p), join(stagingRelative, p), { recursive: true });
  const stamp = run(process.execPath, ['tools\\stamp-version.mjs', staging.replaceAll('/', '\\'), '006ca68f']).trim();
  const checked = run(process.execPath, ['tools\\check-site.mjs', staging.replaceAll('/', '\\'), '--expect-version', '006ca68f']).trim();
  const stagedFiles = walk(staging).map((p) => ({ path: p.slice(staging.length + 1), sha256Raw: sha(readFileSync(abs(p))) }));
  stagedSite = { sourceCount: sourceSiteFiles.length, stamp, checked, files: stagedFiles, removedAfterCheck: true };
} finally {
  rmSync(stagingRelative, { recursive: true });
}
for (const p of [
  '.github/workflows/pages.yml',
  'docs/improve-generating-phase-1/sa-opus/round-1-analysis.md',
  'docs/improve-generating-phase-1/sa-astra/round-1-analysis.md',
  `${HERE}/phase1-audit.json`, `${HERE}/cross-review-audit.mjs`,
  `${opus}/p1-verify.ps1`, `${opus}/p1-run.mjs`, `${opus}/p1-site.log`, `${opus}/p1-fixtures.log`, `${opus}/p1-replay-case.log`,
  'tools/ig-proto/lock/ig-lock.ps1', 'tools/ig-proto/variants/w8.json', 'tools/ig-proto/self-test.mjs',
  'tools/stamp-version.mjs', 'tools/check-site.mjs',
  'tests/generation-client.test.js', 'tests/generator-controller.test.js',
  'docs/improve-generating/plan.md', 'tasks/improve-generating-stages-2-4/check-list.md',
]) read(p);
const result = {
  base: BASE, observedAt: new Date().toISOString(),
  ownerInstruction: { message: '1574937911546085528', time: '2026-11-25T07:00:59+07:00',
    text: 'Tiếp tục làm các phase 2 đến khi xong, gom trong 1 PR (không merge)',
    effect: 'Phase 1 and phase 2 in one unmerged PR; no merge, deployment or GitHub release now; phase 2 analysis starts separately after phase 1 plan is final.' },
  pr, remoteRefs, ciRuns, releases, v12, v13TagPresent: v13Tag !== '', scopes, objectSizes,
  objectSizeLimit: 'Sum of objectsize:disk in this local Git representation, not a transfer estimate or guaranteed GitHub clone/repack growth.',
  memoryChanges, tests, verification: { nodeSeconds, totalNodeSeconds: nodeSeconds.reduce((a, b) => a + b, 0),
    quietSeconds: 180, minimumNodePlusQuietSeconds: nodeSeconds.reduce((a, b) => a + b, 0) + 180 },
  pool: { MAX_POOL_SIZE, eight, factories }, stagedSite,
  scope: 'No solver, rating, generation, replay, browser run, new test suite, benchmark, push, merge, tag or release. '
    + 'Remote operations are reads only; static staged-site copy removed.',
  commands, inputIndexHash: sha(JSON.stringify([...inputs.values()])), inputs: [...inputs.values()],
};
const target = relative(process.cwd(), abs(`${HERE}/cross-review-audit.json`));
writeFileSync(target, `${JSON.stringify(result, null, 2).replace(/\n/g, '\r\n')}\r\n`, 'utf8');
console.log(JSON.stringify({ base: BASE, pr: { state: pr.state, head: pr.headRefOid, files: pr.changedFiles },
  scopes, objectSizes, memoryChanges, tests: tests.map((t) => t.summary), verification: result.verification,
  pool: result.pool, stagedSite: { ...stagedSite, files: stagedSite.files.length },
  inputCount: inputs.size, inputIndexHash: result.inputIndexHash }, null, 2));

// @ts-check
// Read-only drift check of plan v4's code references (SA-Opus, 2026-11-16; docs/improve-generating/claude-opus-5.5/
// 7-code-drift-at-3fc65f4.md). It reads files with `git show <commit>:<path>` only and writes nothing.
//   node docs/improve-generating/evidence/drift/claude-opus-5.5/refs.mjs [--edits]
// Part 1 prints, for each reference of plan v4 (sections 2 to 6) and of the answers it cites, the lines where its
// anchor text occurs at cd5d17f (MP12b1's runtime), 6122dc9 (MP14b), e5bb721 (MP15a2) and 3fc65f4 (origin/main).
// Part 2 (--edits) checks every anchored edit of tools/ig-proto/variants/*.json against 3fc65f4 (not the worktree):
// the number of occurrences, the line and the enclosing function at cd5d17f and at 3fc65f4.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const COMMITS = ['cd5d17f', '6122dc9', 'e5bb721', '3fc65f4'];
/** @type {Map<string, string | null>} */
const cache = new Map();

/** @param {string} commit @param {string} path @returns {string | null} LF text, or null when absent. */
function show(commit, path) {
  const key = `${commit}:${path}`;
  if (!cache.has(key)) {
    try {
      const text = execFileSync('git', ['show', key], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      cache.set(key, text.replace(/\r\n/g, '\n'));
    } catch {
      cache.set(key, null);
    }
  }
  return /** @type {string | null} */ (cache.get(key));
}

/** @param {string | null} text @param {string | RegExp} needle @returns {number[] | null} 1-based lines. */
function lines(text, needle) {
  if (text === null) {
    return null;
  }
  const out = [];
  const all = text.split('\n');
  for (let i = 0; i < all.length; i += 1) {
    if (typeof needle === 'string' ? all[i].includes(needle) : needle.test(all[i])) {
      out.push(i + 1);
    }
  }
  return out;
}

// [id, path, anchor, plan's reference]
/** @type {[string, string, string | RegExp, string][]} */
const REFS = [
  ['2.1 phase-1 start count', 'core/engine/clues.js', 'let count = initialClueCount(target.share, K);', 'clues.js:429'],
  ['2.1 phase-1 loop', 'core/engine/clues.js', 'for (let step = 0; step < COUNT_CHANGES; step += 1) {', 'clues.js:432'],
  ['2.1 phase-2 comment (phase 1 ends 2 lines above)', 'core/engine/clues.js', '// Phase 2: when every phase-1 sample was skipped', 'clues.js:464 (+2)'],
  ['2.1 COUNT_CHANGES', 'core/engine/clues.js', 'const COUNT_CHANGES = 8;', 'COUNT_CHANGES = 8'],
  ['2.1 SAMPLES_PER_COUNT', 'core/engine/clues.js', 'const SAMPLES_PER_COUNT = 4;', '4 samples'],
  ['2.1 AR1 refusal', 'core/engine/clues.js', 'if (refuseUnproved && noProvedGuess(rating)) {', 'clues.js:273-274'],
  ['1 STALL_LIMIT', 'core/engine/clues.js', 'const STALL_LIMIT = 12;', 'STALL_LIMIT'],
  ['2.1 SHARES', 'core/engine/levels.js', 'const SHARES = [0.62, 0.54, 0.46, 0.38, 0.3, 0.22, 0.14, 0.1, 0.06, 0.04, 0.04];', 'levels.js:18'],
  ['1 AREAS Hell 1-3', 'core/engine/levels.js', '[Infinity, Infinity],', 'rating-v3 offers no Hell level'],
  ['2.1/P7 R7 direct checks', 'core/engine/deduce.js', /^ {6,10}if \(work > workLimit\) \{$/, 'deduce.js:1102, 1128'],
  ['P7 ladder', 'core/engine/deduce.js', '  function ladder(counting) {', 'deduce.js:1448'],
  ['P7 ruleR4 (start)', 'core/engine/deduce.js', '  function ruleR4(counting) {', 'deduce.js:709-778'],
  ['P7 ruleR5 (after R4)', 'core/engine/deduce.js', '  function ruleR5(counting) {', 'ends R4 range'],
  ['P7 closure', 'core/engine/deduce.js', '  function closure() {', ':858 (overWork in closure)'],
  ['P7 reachable', 'core/engine/deduce.js', '  function reachable(n, skip, tArea, tImb) {', ':1013-1075'],
  ['P7 ruleR7 (after reachable)', 'core/engine/deduce.js', '  function ruleR7(counting) {', 'ends reachable range'],
  ['P7 kill', 'core/engine/deduce.js', '  function kill(r) {', ':432'],
  ['P7 select', 'core/engine/deduce.js', '  function select(r) {', ':444'],
  ['P7 undo', 'core/engine/deduce.js', '  function undo(m) {', ':482'],
  ['P7 memory sum', 'core/engine/deduce.js', '  let bytes = 0;', 'deduce.js:302-309'],
  ['P7 model-too-large', 'core/engine/deduce.js', "throw new ModelError('model-too-large'", 'deduce.js:302-309'],
  ['P7 memoryBytes 32 MiB', 'core/engine/policy.js', 'memoryBytes: 32 * 1048576,', 'limits.memoryBytes'],
  ['1 DEDUCE.work 760 M', 'core/engine/policy.js', 'work: 760000000,', '760 M'],
  ['1 DEDUCE.census 80 M', 'core/engine/policy.js', 'census: 80000000,', '80 M'],
  ['REPLAY bounds (new)', 'core/engine/policy.js', 'export const REPLAY = Object.freeze({', '(not in plan)'],
  ['2.1 dispatchOrder', 'core/engine/generate.js', 'export function dispatchOrder(s, have, limit) {', 'generate.js:554'],
  ['2.1 slotAttempts 12', 'core/engine/policy.js', 'slotAttempts: 12,', 'policy.js:87'],
  ['2.1 client dispatch loop (start)', 'core/browser/generation-client.js', 'for (const next of dispatchOrder(state,', 'generation-client.js:1057'],
  ['2.1 client dispatch loop (end)', 'core/browser/generation-client.js', 'progress({ slot: awaited.slot, attempt: awaited.attempt });', 'generation-client.js:1085'],
  ['2.1 timers: begin()', 'core/browser/generation-client.js', 'function begin(revision) {', 'generation-client.js:447'],
  ['2.1 timers: set job and batch begin', 'core/browser/generation-client.js', 'const job = begin(input.revision);', 'generation-client.js:575, 812'],
  ['2.1 timers: generateSet', 'core/browser/generation-client.js', 'async function generateSet(input, hooks = {}) {', '(set job)'],
  ['client replayPuzzle (new)', 'core/browser/generation-client.js', 'async function replayPuzzle(input, replayOptions = {}) {', '(not in plan)'],
  ['C3 capped throw', 'core/engine/difficulty.js', "throw new IncompleteRatingError('the deduction path was capped'", 'difficulty.js:240-253'],
  ['P6 DLX call (edit p6-1)', 'core/engine/difficulty.js', 'const run = solveFirst(model, { rowTrialLimit: limits.dlx.rows, branchTrialLimit: limits.dlx.branch });', 'P6 edit'],
  ['rateDetailed (new)', 'core/engine/difficulty.js', 'export function rateDetailed(', '(MP14a)'],
  ['P3 D21 test', 'tests/clues.test.js', "test('unproved or unrateable subsets, none usable", 'tests/clues.test.js:701'],
  ['P3 helper before it', 'tests/clues.test.js', 'const allDistinctWith5Clues', 'tests/clues.test.js:701'],
  ['5.1 SelectContext record', 'core/engine/clues.js', '@property {(event: ClueEvent) => void} [record]', 'clues.js:45-53 (Q28)'],
  ['5.1 SelectContext charge', 'core/engine/clues.js', '@property {(units: number) => void} [charge]', 'clues.js:45-53 (Q28)'],
  ['5.1 selectClues destructuring', 'core/engine/clues.js', 'const { board, pieces, layout, target, rng, uniqueness, excludeClueKeys, ws, onRate, record, charge } = ctx;', 'clues.js:270-276 (Q28)'],
  ['5.1 onCount: charge', 'core/engine/clues.js', 'onCount: charge,', 'onCount: charge'],
  ['5.1 SKIP_BOUNDS', 'core/engine/clues.js', 'export const SKIP_BOUNDS = Object.freeze({', 'gen-v4 own bounds'],
  ['5.1 PROVENANCE bounds', 'core/engine/pack.js', 'export const PROVENANCE = Object.freeze({', 'IG-P-Q36'],
  ['5.1 VERSION_KEYS', 'core/engine/pack.js', "const VERSION_KEYS = ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel'];", 'pack.js:62 (Q36)'],
  ['5.1 MADE_CANDIDATE_KEYS', 'core/engine/pack.js', 'const MADE_CANDIDATE_KEYS = [', '(made shape)'],
  ['5.1 versionsProblem', 'core/engine/pack.js', 'function versionsProblem(v) {', 'IG-P-Q36'],
  ['5.1 copyVersions', 'core/engine/pack.js', 'function copyVersions(v) {', 'IG-P-Q36'],
  ['5.1 provenanceVersions', 'core/engine/generate.js', 'export function provenanceVersions() {', 'IG-P-Q36 (generate.js:273-281 at e5bb721)'],
  ['5.1 ALGO_ID', 'core/engine/version.js', "export const ALGO_ID = 'gen-v3';", 'version.js:4 (Q34)'],
  ['5.1 sameVersions', 'core/engine/replay.js', 'function sameVersions(a, b) {', 'replay.js:180-183 (Q34)'],
  ['5.1 set-versions', 'core/engine/replay.js', "setReason = 'set-versions';", 'IG-P-Q34/Q36'],
  ['5.1 record-versions', 'core/engine/replay.js', "candReason = 'record-versions';", 'IG-P-Q36'],
  ['5.1 replay caller: setAttempt observers', 'core/engine/replay.js', '}, o.attempt, { record, charge: tick });', 'only caller'],
  ['5.1 replay caller: candidate observers', 'core/engine/replay.js', 'record, replaySkips:', 'only caller'],
  ['5.1 replay test matched (Q34)', 'tests/replay.test.js', "'matched'", 'tests/replay.test.js:142'],
  ['worker task replayPuzzle (new)', 'core/engine/tasks.js', "case 'replayPuzzle':", '(MP15b)'],
  ['replay cache key (new)', 'generator/ui/replay-cache.js', 'ALGO_ID, APP_VERSION, boardToRows(set.board)', '(07406cf)'],
  ['replay storage bounds (new)', 'core/browser/storage.js', 'export const MAX_REPLAY_ENTRIES = 8;', '(07406cf)'],
  ['P8 MAX_POOL_SIZE', 'core/browser/worker-pool.js', 'export const MAX_POOL_SIZE = 4;', 'P8 / w8-1'],
];

/** @param {string} text @param {number} line @returns {string} The nearest function, method or arrow header above. */
function enclosing(text, line) {
  const all = text.split('\n');
  const head = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|^\s*(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/;
  for (let i = line - 1; i >= 0; i -= 1) {
    const m = head.exec(all[i]);
    if (m !== null) {
      return `${m[1] ?? m[2]}@${i + 1}`;
    }
  }
  return '-';
}

function partRefs() {
  process.stdout.write(`id | path | plan | ${COMMITS.join(' | ')}\n`);
  for (const [id, path, needle, plan] of REFS) {
    const cells = COMMITS.map((c) => {
      const found = lines(show(c, path), needle);
      return found === null ? 'no file' : found.length === 0 ? 'absent' : found.join(',');
    });
    process.stdout.write(`${id} | ${path} | ${plan} | ${cells.join(' | ')}\n`);
  }
}

/** @param {string} text @param {string} needle @returns {number} */
function count(text, needle) {
  let n = 0;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length)) {
    n += 1;
  }
  return n;
}

function partEdits() {
  const dir = join('tools', 'ig-proto', 'variants');
  const files = readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  process.stdout.write('\nvariant | edit | file | kind | count cd5d17f | count 3fc65f4 | line cd5d17f -> 3fc65f4 | enclosing cd5d17f -> 3fc65f4\n');
  for (const name of files) {
    const manifest = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    for (const edit of manifest.edits ?? []) {
      const anchor = 'find' in edit ? edit.find : 'from' in edit ? edit.from : null;
      const kind = 'find' in edit ? 'find' : 'from' in edit ? 'from/through' : 'append';
      if (anchor === null) {
        process.stdout.write(`${manifest.id} | ${edit.id} | ${edit.file} | ${kind} | - | - | - | -\n`);
        continue;
      }
      const needle = anchor.replace(/\r\n/g, '\n');
      const at = COMMITS.filter((c) => c === 'cd5d17f' || c === '3fc65f4').map((c) => {
        const text = show(c, edit.file);
        if (text === null) {
          return { n: -1, line: 0, fn: 'no file' };
        }
        const n = count(text, needle);
        const index = text.indexOf(needle);
        const line = index < 0 ? 0 : text.slice(0, index).split('\n').length;
        return { n, line, fn: index < 0 ? '-' : enclosing(text, line) };
      });
      let extra = '';
      if ('through' in edit) {
        const text = show('3fc65f4', edit.file) ?? '';
        const through = edit.through.replace(/\r\n/g, '\n');
        const start = text.indexOf(needle);
        const end = text.indexOf(through) + through.length;
        extra = ` through x${count(text, through)}, ${start >= 0 && end > start ? text.slice(start, end).split('\n').length - 1 : '?'} lines (manifest ${edit.lines})`;
      }
      process.stdout.write(`${manifest.id} | ${edit.id} | ${edit.file} | ${kind} | ${at[0].n} | ${at[1].n}${extra} | ${at[0].line} -> ${at[1].line} | ${at[0].fn} -> ${at[1].fn}\n`);
    }
  }
}

partRefs();
if (process.argv.includes('--edits')) {
  partEdits();
}

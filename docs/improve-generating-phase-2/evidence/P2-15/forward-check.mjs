// @ts-check
// P2-15 step 5: the forward check. The phase-1 reader (`6b94ffb`, the worktree Q:\git\pentomino-p2-today) parses each pack of
// tests/fixtures/replay-case-v4.json: the pack must be accepted, every puzzle kept, and each `made` record dropped with
// the reader's `provenance-ignored` warning. The result lines go to forward-check.log before the summary is printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { parsePack } = await import(pathToFileURL('Q:\\git\\pentomino-p2-today\\core\\engine\\pack.js').href);
const file = JSON.parse(readFileSync(new URL('../../../../tests/fixtures/replay-case-v4.json', import.meta.url), 'utf8'));

/** @type {string[]} */
const lines = [];
let failed = false;
file.packs.forEach((/** @type {any} */ raw, /** @type {number} */ i) => {
  const result = parsePack(JSON.stringify(raw));
  if (!result.ok) {
    lines.push(`pack ${i + 1}: refused (${result.issues.map((/** @type {any} */ x) => `${x.path} ${x.code}`).join(', ')})`);
    failed = true;
    return;
  }
  const kept = result.value.puzzles.length;
  const made = Object.values(raw.generation?.made ?? {});
  // A calibration record has no versions and no igPrior, so the phase-1 reader still accepts it; only candidate records are dropped.
  const candidates = made.filter((/** @type {any} */ m) => m.kind === 'candidate').length;
  const keptMade = Object.keys(result.value.generation?.made ?? {}).length;
  const dropped = result.warnings.filter((/** @type {any} */ w) => w.code === 'provenance-ignored' && w.path.startsWith('generation.made.'));
  const droppedOrigin = result.warnings.filter((/** @type {any} */ w) => w.code === 'provenance-ignored' && w.path.startsWith('generation.setOrigin'));
  const good = kept === raw.puzzles.length && keptMade === made.length - candidates && dropped.length === candidates;
  failed = failed || !good;
  lines.push(`pack ${i + 1}: ok, puzzles ${kept} of ${raw.puzzles.length}, made records ${made.length} (candidates ${candidates}) kept ${keptMade} `
    + `dropped with a warning ${dropped.length}, set origin warnings ${droppedOrigin.length}, warnings ${result.warnings.length}${good ? '' : ' MISMATCH'}`);
  for (const w of result.warnings) {
    lines.push(`  warning ${w.code} ${w.path}: ${w.message}`);
  }
});
lines.push(failed ? 'forward check: FAILED' : 'forward check: ok');
writeFileSync(fileURLToPath(new URL('./forward-check.log', import.meta.url)), `${lines.join('\r\n')}\r\n`);
console.log(lines.join('\n'));
process.exitCode = failed ? 1 : 0;

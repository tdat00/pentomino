// @ts-check
// SA-Astra: final check of S06-R1..R3 and the measurement-only R-P24-19 amendment.
// Preserves the original review and observations. No engine, git, tree build or measured run.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\s06-final-checks.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const sha = (/** @type {Buffer | string} */ v) => createHash('sha256').update(v).digest('hex');
const D = 'docs/improve-generating-stages-2-4';
const P = 'tasks/improve-generating-stages-2-4';
const auditPath = `${D}/evidence/sa-astra/s06-review-checks.json`;
const auditBytes = readFileSync(abs(auditPath));
const auditHash = sha(auditBytes);
const audit = JSON.parse(auditBytes.toString('utf8'));
/** @param {boolean} value @param {string} why */
function check(value, why) {
  if (!value) {
    throw new Error(why);
  }
}
/** @type {Map<string, any>} */
const inputs = new Map();
const read = (/** @type {string} */ path) => {
  const b = readFileSync(abs(path));
  inputs.set(path, { path, sha256Raw: sha(b) });
  return b.toString('utf8');
};
const text = (/** @type {string} */ path) => read(path).replace(/\s+/g, ' ');
const permitted = new Set([`${D}/s06-reading.md`, `${P}/S07-run-v4-s4c.md`, `${P}/T16-stage4-report-and-phase0.md`,
  `${D}/evidence/sa-opus/s06-numbers.mjs`, `${D}/evidence/sa-opus/s06-numbers.json`]);
const changed = [];
for (const i of audit.inputs) {
  read(i.path);
  if (inputs.get(i.path).sha256Raw !== i.sha256Raw) {
    check(permitted.has(i.path), `Unexpected changed observation/source: ${i.path}`);
    changed.push(i.path);
  }
}
const author = JSON.parse(read(`${D}/evidence/sa-opus/s06-numbers.json`));
for (const c of audit.controls) {
  const a = author.controls.find((r) => r.cell === c.cell);
  check(a !== undefined && Math.abs(a.reproduced.geoMean - c.geoMean) < 1e-12
    && Math.abs(a.reproduced.lower - c.lower) < 1e-12 && Math.abs(a.logSd - c.logSd) < 1e-12
    && Math.abs(a.gmNeededFor09 - c.approximateNeeded20) < 1e-12
    && Math.abs(a.passChanceAtParity - c.approximateFresh20PowerAtTrueParity) < 1e-6,
  `${c.cell}: numerical evidence changed`);
}
const notePath = `${D}/s06-reading.md`;
const note = text(notePath);
const s07 = text(`${P}/S07-run-v4-s4c.md`);
const t16 = text(`${P}/T16-stage4-report-and-phase0.md`);
for (const clause of [
  'has not established the required non-inferiority',
  'These summaries neither prove equivalence nor rule out a material regression.',
  'not measured probabilities, the exact power of the frozen bootstrap rule',
  'Do not silently pool the failed 20 with another 20 and call the result the unchanged original gate',
  'Approval or deferral of S07 is not this decision.',
  'postponement alone does not require re-activation or new proofs',
  'not a guarantee about every request',
  'This approves the measurement only, not a 26x26 exception or phase-2 deployment.',
  '380 requests',
]) {
  check(note.includes(clause), `Missing correction: ${clause}`);
}
check(!note.includes('never more than 10 % slower'), 'Old per-request guarantee remains');
check(s07.includes('not on assumed deployment of the other boards. Approval of S07 is measurement approval only; the recorded FAIL and phase-2 block remain.'),
  'S07 measurement-only amendment missing');
check(t16.includes('not an accepted production configuration') && t16.includes('compatibility/replay, N-V4-15 and production-validation gates')
  && t16.includes('empty `p5` array means **not measured**, not zero false stops or lost completions')
  && t16.includes('preserve the original FAIL rather than recomputing it on a reduced control set'),
  'T16 boundaries missing');
const reading = read(notePath);
const blank = '- SA-Astra (reviewer):\r\n';
const signed = '- SA-Astra (reviewer): the joint reading and the recommendations above, 2026-11-24.\r\n';
check(reading.split(blank).length + reading.split(signed).length === 3, 'Expected exactly one blank or accepted reviewer line');
const unsigned = reading.includes(blank) ? reading : reading.replace(signed, blank);
for (const path of [notePath, `${P}/S07-run-v4-s4c.md`, `${P}/T16-stage4-report-and-phase0.md`,
  ...['mjs', 'json', 'md'].map((ext) => `${D}/evidence/sa-opus/s06-numbers.${ext}`)]) {
  const b = readFileSync(abs(path));
  const s = new TextDecoder('utf-8', { fatal: true }).decode(b);
  check(!(b[0] === 239 && b[1] === 187 && b[2] === 191) && !/(?<!\r)\n|\r(?!\n)/.test(s)
    && !/[ \t]+\r?$/m.test(s) && s.endsWith('\r\n'), `Bad format: ${path}`);
}
check(sha(readFileSync(abs(auditPath))) === auditHash, 'Original review evidence was changed');
const result = {
  base: '96f231e', disposition: 'accept',
  register: 'R-P24-19 as relayed by the orchestrator on 2026-11-24 19:52 +07:00; pending sign-off may be changed to signed by both.',
  boundaries: 'FAIL and phase-2 block retained; S07 scope approval still belongs to the owner and is measurement only. Legacy routing remains provisional. No refit, waiver, offer or deployment approval.',
  earlierAudit: { path: auditPath, sha256Raw: auditHash, unchangedInputs: audit.inputs.length - changed.length, changedInputs: changed },
  signoff: { path: notePath, beforeSha256Raw: sha(unsigned), expectedAfterSha256Raw: sha(unsigned.replace(blank, signed)), text: signed.trimEnd() },
  inputs: [...inputs.values()],
};
writeFileSync(relative(process.cwd(), join(HERE, 's06-final-checks.json')), JSON.stringify(result, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(`PASS: ${result.earlierAudit.unchangedInputs} prior observation/source hashes unchanged; permitted amended inputs: ${changed.join(', ')}`);
console.log('PASS: all ten control numbers unchanged; S06-R1..R3, S07/T16 boundaries and file formats verified.');
console.log('ACCEPT: joint reading and proposed R-P24-19; S07 remains an owner scope decision, not production approval.');

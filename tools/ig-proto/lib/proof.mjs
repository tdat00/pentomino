// @ts-check
// Typed proof receipts of the frozen round (task pack v4, V4-T04d; reviews R2-09, RV3-06 and R4-03; D-V4-18). Every
// prerequisite of a gate is one envelope, `ig-v4-proof` version 1, and `proofCheck` accepts a `verdict: 'pass'` only
// against an expectation built apart from the receipt: the source, the producer (`harnessHash`), the arms with their
// tree ids and parameter hashes, the declared coverage, the fields of the kind and the hashes of the evidence files.
import { existsSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

import { abs, FROZEN_COMMIT, FROZEN_DIGEST } from './paths.mjs';
import { sha256Text } from './records.mjs';

/**
 * @typedef {{ id: string, treeId: string | null, paramsHash: string | null }} ProofArm
 * @typedef {{ expected: string[], observed: string[], missing: string[], censored: string[] }} ProofCoverage
 * @typedef {{ path: string, sha256: string }} ProofEvidence
 * @typedef {{ frozenCommit: string, sourceDigest: string | null }} ProofSource
 * @typedef {{ kind: string, source: ProofSource, harnessHash?: string, arms?: ProofArm[],
 *   coverage?: { expected: string[] }, fields?: Record<string, unknown> }} ProofExpectation
 */

const VERDICTS = Object.freeze(['pass', 'fail', 'incomplete']);
const ENVELOPE_FIELDS = Object.freeze(['format', 'version', 'kind', 'verdict', 'source', 'harnessHash', 'arms', 'coverage', 'evidence']);
const COVERAGE_LISTS = Object.freeze(['expected', 'observed', 'missing', 'censored']);

/** The `fields` a `kind: 'live-deadline'` receipt must carry (N-V4-13 produces it, T09e consumes it). */
export const LIVE_DEADLINE_FIELDS = Object.freeze({ live: true, postHoc: false, workCutoffMs: 115000, responseBoundMs: 120000, reserveChecked: true });

/** The stage-1 coverage beyond the item ids of the two manifests (`plans/V4-T04.parity.json` and `.replay.json`). */
export const STAGE1_COVERAGE_EXTRA = Object.freeze([
  'identity:landscape/26x26-nightmare/0', 'identity:landscape/26x26-nightmare/1',
  'identity:landscape/14x14-master/0', 'identity:landscape/14x14-master/1',
  'pm4', 'self-test:V4-T04', 'self-test:V4-T04v4', 'self-test:V4-T04f', 'self-test:V4-T04i',
]);

/** @param {unknown} value @returns {value is Record<string, any>} */
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** @param {unknown} value @returns {value is string[]} */
const isStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * @param {{ kind: string, verdict: 'pass' | 'fail' | 'incomplete', source: ProofSource, harnessHash: string | null,
 *   arms: ProofArm[], coverage: ProofCoverage, evidence: ProofEvidence[], fields?: Record<string, unknown> }} o
 *   `evidence` entries hold the SHA-256 of the file's text (`sha256File` of `abs(path)`) at write time; `path` is
 *   relative to the repository root with `/`. `fields` are the kind's own fields, spread into the envelope's root; a
 *   field named like an envelope field is refused.
 * @returns {Record<string, any>} The envelope.
 */
export function proofEnvelope({ kind, verdict, source, harnessHash, arms, coverage, evidence, fields = {} }) {
  if (!VERDICTS.includes(verdict)) {
    throw new RangeError(`proof: unknown verdict ${verdict}`);
  }
  const clash = Object.keys(fields).filter((name) => ENVELOPE_FIELDS.includes(name));
  if (clash.length > 0) {
    throw new RangeError(`proof: the fields of a ${kind} receipt name an envelope field (${clash.join(', ')})`);
  }
  return {
    format: 'ig-v4-proof',
    version: 1,
    kind,
    verdict,
    source: { frozenCommit: source.frozenCommit, sourceDigest: source.sourceDigest },
    harnessHash,
    arms: arms.map(({ id, treeId, paramsHash }) => ({ id, treeId, paramsHash })),
    coverage: {
      expected: [...coverage.expected], observed: [...coverage.observed], missing: [...coverage.missing], censored: [...coverage.censored],
    },
    evidence: evidence.map(({ path, sha256 }) => ({ path, sha256 })),
    ...fields,
  };
}

/** @param {string} path Repository-relative, with `/`. @returns {string | null} The file's UTF-8 text; null when absent. */
export function readRepoFile(path) {
  const file = abs(path);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

/**
 * @param {unknown} receipt
 * @returns {string | null} Why the value is not an envelope; null for a well-formed one (its kind is judged apart).
 */
function envelopeProblem(receipt) {
  if (!isRecord(receipt)) {
    return 'not an object';
  }
  for (const name of ENVELOPE_FIELDS) {
    if (!(name in receipt)) {
      return `missing field ${name}`;
    }
  }
  if (receipt.format !== 'ig-v4-proof') {
    return `format ${JSON.stringify(receipt.format)}`;
  }
  if (receipt.version !== 1) {
    return `version ${JSON.stringify(receipt.version)}`;
  }
  const { source, arms, coverage, evidence } = receipt;
  if (!isRecord(source)) {
    return 'malformed field source';
  }
  if (!Array.isArray(arms) || !arms.every(isRecord)) {
    return 'malformed field arms';
  }
  if (!isRecord(coverage) || !COVERAGE_LISTS.every((name) => isStrings(coverage[name]))) {
    return 'malformed field coverage';
  }
  if (!Array.isArray(evidence) || !evidence.every((entry) => isRecord(entry) && typeof entry.path === 'string' && typeof entry.sha256 === 'string')) {
    return 'malformed field evidence';
  }
  return null;
}

/**
 * Checks a receipt against an expectation built apart from it (R2-09, RV3-06). The checks run in this order and the
 * first that finds a reason decides; a substantive failure (`fail`) is kept apart from missing or stale evidence
 * (`incomplete`); only a receipt that passes every check is `pass`.
 * @param {any} receipt
 * @param {ProofExpectation} expected `harnessHash` binds the producer: without it the receipt is incomplete.
 * @param {(path: string) => string | null} [readFile] The text of an evidence file by repository-relative path; null when absent.
 * @returns {{ status: 'pass' | 'fail' | 'incomplete', reasons: string[] }}
 */
export function proofCheck(receipt, expected, readFile = readRepoFile) {
  const incomplete = (/** @type {string[]} */ ...reasons) => ({ status: /** @type {const} */ ('incomplete'), reasons });
  const malformed = envelopeProblem(receipt);
  if (malformed !== null || receipt.kind !== expected.kind) {
    return incomplete(`not a ${expected.kind} receipt`, malformed ?? `kind ${JSON.stringify(receipt.kind)}`);
  }
  if (receipt.verdict === 'fail') {
    const own = isStrings(receipt.reasons) && receipt.reasons.length > 0 ? receipt.reasons
      : typeof receipt.line === 'string' ? [receipt.line] : ['the receipt\'s verdict is fail'];
    return { status: 'fail', reasons: [...own] };
  }
  if (receipt.verdict !== 'pass') {
    return incomplete(`verdict ${JSON.stringify(receipt.verdict)}`);
  }
  if (!isDeepStrictEqual(receipt.source, expected.source)) {
    return incomplete('stale source');
  }
  if (typeof expected.harnessHash !== 'string') {
    return incomplete('no producer binding');
  }
  if (receipt.harnessHash !== expected.harnessHash) {
    return incomplete('producer changed');
  }
  const stale = (expected.arms ?? []).filter((arm) => {
    const found = receipt.arms.find((/** @type {any} */ a) => a.id === arm.id);
    return found === undefined || found.treeId !== arm.treeId || found.paramsHash !== arm.paramsHash;
  });
  if (stale.length > 0) {
    return incomplete(...stale.map((arm) => `stale arm ${arm.id}`));
  }
  const gaps = [...new Set([
    ...(expected.coverage?.expected ?? []).filter((id) => !receipt.coverage.observed.includes(id)),
    ...receipt.coverage.missing,
    ...receipt.coverage.censored,
  ])];
  if (gaps.length > 0) {
    return incomplete(`coverage gap ${gaps.join(', ')}`);
  }
  const changed = receipt.evidence.filter((/** @type {ProofEvidence} */ entry) => {
    const text = readFile(entry.path);
    return text === null || sha256Text(text) !== entry.sha256;
  });
  if (changed.length > 0) {
    return incomplete(...changed.map((/** @type {ProofEvidence} */ entry) => `evidence changed ${entry.path}`));
  }
  const wrong = Object.entries(expected.fields ?? {}).filter(([name, value]) => !isDeepStrictEqual(receipt[name], value));
  if (wrong.length > 0) {
    return incomplete(...wrong.map(([name]) => `${name} is ${JSON.stringify(receipt[name])}`));
  }
  return { status: 'pass', reasons: [] };
}

export const ACCEPTED_FORMAT = 'ig-v4-accepted';

/**
 * The accepted binding of a passing receipt (RV3-06): built from an expectation declared apart from the receipt.
 * @param {{ receiptPath: string, harnessHash: string, arms: { id: string, treeId: string, paramsHash: string }[],
 *   params: Record<string, unknown>, coverage: string[], fields: Record<string, unknown>, by: string }} o
 * @param {(path: string) => string | null} [readFile]
 */
export function acceptedBinding(o, readFile = readRepoFile) {
  const text = readFile(o.receiptPath);
  if (text === null) {
    throw new Error(`accept: missing receipt ${o.receiptPath}`);
  }
  const receipt = JSON.parse(text);
  const expected = {
    kind: receipt.kind, source: { frozenCommit: FROZEN_COMMIT, sourceDigest: FROZEN_DIGEST },
    harnessHash: o.harnessHash, arms: o.arms, coverage: { expected: o.coverage }, fields: o.fields,
  };
  const check = proofCheck(receipt, expected, readFile);
  if (check.status !== 'pass') {
    throw new Error(`accept: ${check.status} (${check.reasons.join('; ')})`);
  }
  return {
    format: ACCEPTED_FORMAT, version: 1, receipt: { path: o.receiptPath, sha256: sha256Text(text) }, expected,
    params: o.params, acceptedAt: new Date().toISOString(), acceptedBy: o.by,
  };
}

/**
 * Checks a prerequisite through its accepted binding; `current` lists today's identities of the arms to compare.
 * @param {any} binding
 * @param {{ readFile?: (path: string) => string | null, current: { id: string, treeId: string, paramsHash: string }[] }} o
 * @returns {{ status: 'pass' | 'fail' | 'incomplete', reasons: string[] }}
 */
export function checkAccepted(binding, { readFile = readRepoFile, current }) {
  if (binding?.format !== ACCEPTED_FORMAT || binding.version !== 1) {
    return { status: 'incomplete', reasons: ['not an accepted binding'] };
  }
  const text = readFile(binding.receipt.path);
  if (text === null) {
    return { status: 'incomplete', reasons: [`missing receipt ${binding.receipt.path}`] };
  }
  if (sha256Text(text) !== binding.receipt.sha256) {
    return { status: 'incomplete', reasons: [`receipt changed ${binding.receipt.path}`] };
  }
  const check = proofCheck(JSON.parse(text), binding.expected, readFile);
  if (check.status !== 'pass') {
    return check;
  }
  for (const c of current) {
    const arm = binding.expected.arms.find((/** @type {{ id: string }} */ a) => a.id === c.id);
    if (arm === undefined) {
      return { status: 'incomplete', reasons: [`unbound arm ${c.id}`] };
    }
    if (arm.treeId !== c.treeId || arm.paramsHash !== c.paramsHash) {
      return { status: 'incomplete', reasons: [`stale arm ${c.id}`] };
    }
  }
  return { status: 'pass', reasons: [] };
}

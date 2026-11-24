// @ts-check
// SA-Opus, T11 (stages 2 to 4 pack): the candidate epoch that the 20 uncapped Hell 1 rows of V4-S3P belong to. For each
// of the four frozen arms, the P-1 receipt of S03 (kind, verdict, the parity and replay blocks, the arm's tree id and
// parameter hash) and its accepted binding (the receipt's hash, the expectation's arm, acceptedBy); then the four
// published runs files of fr-frozen-none-uncapped: the frozen source, and the tree id and parameter hash of the arm
// they ran, which must be the uncapped binding's. Unlocked: it reads records only; it rates nothing and builds no tree.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t11-epoch.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const DIR = 'docs/improve-generating/evidence/frozen/V4-S3P';
const ARMS = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-uncapped', 'fr-frozen-none-uncapped'];
const UNCAPPED = 'fr-frozen-none-uncapped';
const SHARDS = ['pilot-14x14-hell-1', 'pilot-20x20-hell-1', 'pilot-24x24-hell-1', 'pilot-26x26-hell-1'];
const FROZEN_COMMIT = '3fc65f4681a53d3984d9218c15efbf696cc3a1a5';
const FROZEN_DIGEST = 'e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b';

const sha256 = (/** @type {string} */ text) => createHash('sha256').update(text, 'utf8').digest('hex');
/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
/** @param {string} path @returns {{ text: string, hash: string }} */
function read(path) {
  const text = readFileSync(join(ROOT, path), 'utf8');
  const hash = sha256(text.replace(/\r\n/g, '\n'));
  inputs.push({ path, sha256Lf: hash });
  return { text, hash };
}
const crlf = (/** @type {string} */ text) => `${text.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;

/** @type {string[]} */
const problems = [];
const arms = ARMS.map((id) => {
  const receiptPath = `${DIR}/parity-${id}.receipt.json`;
  const r = read(receiptPath);
  const receipt = JSON.parse(r.text);
  const binding = JSON.parse(read(`${DIR}/parity-${id}.accepted.json`).text);
  const arm = receipt.arms?.[0] ?? {};
  const out = {
    id, kind: receipt.kind, verdict: receipt.verdict, blocks: receipt.blocks, treeId: arm.treeId, paramsHash: arm.paramsHash,
    source: receipt.source, bindingReceiptHashMatches: binding.receipt?.path === receiptPath && binding.receipt?.sha256 === r.hash,
    bindingArm: binding.expected?.arms?.[0] ?? null, acceptedBy: binding.acceptedBy, acceptedAt: binding.acceptedAt,
  };
  if (receipt.kind !== 'parity' || receipt.verdict !== 'pass' || receipt.blocks?.parity !== 'pass' || receipt.blocks?.replay !== 'pass') {
    problems.push(`${id}: receipt ${receipt.kind} ${receipt.verdict} ${JSON.stringify(receipt.blocks)}`);
  }
  if (receipt.arms?.length !== 1 || arm.id !== id || receipt.source?.frozenCommit !== FROZEN_COMMIT || receipt.source?.sourceDigest !== FROZEN_DIGEST) {
    problems.push(`${id}: the receipt's arm or source`);
  }
  if (!out.bindingReceiptHashMatches || binding.acceptedBy !== 'V4-S3' || JSON.stringify(out.bindingArm) !== JSON.stringify({ id, treeId: arm.treeId, paramsHash: arm.paramsHash })) {
    problems.push(`${id}: the binding (receipt hash, arm or acceptedBy)`);
  }
  return out;
});
const uncapped = arms.find((a) => a.id === UNCAPPED);
const runs = SHARDS.map((shard) => {
  const doc = JSON.parse(read(`${DIR}/${UNCAPPED}/${shard}.runs.json`).text);
  const tree = doc.meta?.trees?.[UNCAPPED] ?? {};
  const out = {
    shard, rows: doc.rows?.length ?? 0, frozenCommit: doc.meta?.source?.frozenCommit, sourceDigest: doc.meta?.source?.sourceDigest,
    treeId: tree.treeId, paramsHash: tree.params === undefined ? null : sha256(JSON.stringify(tree.params)), harnessHash: doc.meta?.harness?.harnessHash,
  };
  if (out.frozenCommit !== FROZEN_COMMIT || out.sourceDigest !== FROZEN_DIGEST || out.treeId !== uncapped?.treeId || out.paramsHash !== uncapped?.paramsHash) {
    problems.push(`${shard}: the runs file is not of the uncapped binding's tree or of the frozen source`);
  }
  return out;
});
const result = { script: `${HERE}/t11-epoch.mjs`, arms, runs, problems, inputs };
writeFileSync(join(ROOT, HERE, 't11-epoch.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
process.stdout.write(`t11-epoch: ${problems.length} problems; ${inputs.length} files read\n`);
for (const a of arms) {
  process.stdout.write(`  ${a.id}: ${a.kind} ${a.verdict} parity ${a.blocks?.parity} replay ${a.blocks?.replay}; tree ${String(a.treeId).slice(0, 12)} params ${String(a.paramsHash).slice(0, 12)}; binding ${a.bindingReceiptHashMatches ? 'binds this receipt' : 'DIFFERS'}, acceptedBy ${a.acceptedBy}\n`);
}
for (const r of runs) {
  process.stdout.write(`  ${r.shard}: ${r.rows} rows, tree ${String(r.treeId).slice(0, 12)} params ${String(r.paramsHash).slice(0, 12)}, frozen source ${r.frozenCommit === FROZEN_COMMIT && r.sourceDigest === FROZEN_DIGEST}, producer ${String(r.harnessHash).slice(0, 12)}\n`);
}
for (const p of problems) {
  process.stdout.write(`  PROBLEM ${p}\n`);
}
process.exitCode = problems.length === 0 ? 0 : 1;

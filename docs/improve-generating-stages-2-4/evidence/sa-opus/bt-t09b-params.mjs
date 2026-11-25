// @ts-check
// SA-Opus, read-only check for ruling R-P24-14 (T09b): the parameter hash of each live tree is the same whether it is
// computed from `ensureTree(id).params` (T08b's freeze check, so T12b's freeze.json, and the self-test identity record)
// or from `readTreeInfo(id).params` (the receipt's trees and the runs files' `meta.trees`, `buildMeta`). The trees exist;
// `ensureTree` reuses them (it builds only a missing tree). Unlocked: it rates nothing and writes nothing.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-t09b-params.mjs --label frozen --source-label "frozen 3fc65f4"
import { readTreeInfo, sha256 } from '../../../../tools/ig-proto/lib/records.mjs';
import { ensureTree } from '../../../../tools/ig-proto/lib/tree.mjs';

const IDS = ['fr-frozen', 'fr-frozen-none', 'fr-frozen-live-test', 'fr-frozen-none-live-test'];
let same = 0;
for (const id of IDS) {
  const tree = await ensureTree(id);
  const info = readTreeInfo(id);
  const a = sha256(JSON.stringify(tree.params));
  const b = sha256(JSON.stringify(info.params));
  const ok = a === b && tree.treeId === info.treeId && tree.copyDigest === info.copyDigest;
  same += ok ? 1 : 0;
  process.stdout.write(`${id}: treeId ${info.treeId.slice(0, 12)} ensureTree ${a.slice(0, 12)} readTreeInfo ${b.slice(0, 12)} ${ok ? 'same' : 'DIFFERENT'}\n`);
}
process.stdout.write(`bt-t09b-params: ${same} of ${IDS.length} trees give one identity\n`);
process.exitCode = same === IDS.length ? 0 : 1;

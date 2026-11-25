# Round-1 cross-review checks (SA-Opus), base 006ca68

1. The import closure of `core/engine/deduce.js` (9 files): `core/engine/deduce.js`, `core/engine/dlx.js`, `core/engine/geometry.js`, `core/engine/levels.js`, `core/engine/placements.js`, `core/engine/policy.js`, `core/engine/qualification.js`, `core/engine/tiling.js`, `core/engine/workspace.js`.
   `git diff --stat 3fc65f4 HEAD -- <closure>`: empty (byte-equal).
2. Packed sizes (`git pack-objects --revs --stdout`, deltas included): origin/main 9.3 MB; origin/main..HEAD (thin) 16.8 MB; origin/improve-generating..HEAD (thin) 13.6 MB.
3. The production pool: core/browser/worker-pool.js:75 `export const MAX_POOL_SIZE = 4;`; core/browser/worker-pool.js:195 `if (!Number.isInteger(size) || size < 1 || size > MAX_POOL_SIZE) {`.
   Width tests:
   - tests/generate.test.js:420 `for (const width of [1, 2, 3, 4]) {`
   - tests/generate.test.js:808 `test(`pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}`, () => {`
   - tests/generate.test.js:821 `for (const width of [1, 2, 3, 4]) {`
   - tests/generation-client.test.js:561 `test('fills a short batch from the unused arrangements, in layout-key order, whatever the pool width', async () => {`
   - tests/generation-client.test.js:566 `for (const size of [1, 2, 3, 4]) {`
   - tests/generation-client.test.js:1300 `test('one and four workers reproduce the recorded recipe and an importable pack', async () => {`
   - tests/generation-client.test.js:1301 `const one = await runRecipe(1);`
   - tests/generation-client.test.js:1302 `const four = await runRecipe(4);`
   - tests/generation-client.test.js:1340 `test('progressive presentation: accepted puzzles stream in slot order, the same at one and four workers', async () => {`
   - tests/generation-client.test.js:1345 `const narrow = await runRecipe(1, { hooks: { onAccepted: (e) => one.push([e.index, e.puzzle.id]) } });`
   - tests/generation-client.test.js:1346 `const wide = await runRecipe(4, { hooks: { onAccepted: (e) => four.push([e.index, e.puzzle.id]) } });`
   - tests/generation-client.test.js:1357 `const base = await runRecipe(2);`
   - tests/generation-client.test.js:1359 `const turned = await runRecipe(2, { rotation });`
   - tests/generation-client.test.js:1369 `const first = await runRecipe(4, { quantity: 4 });`
   - tests/generation-client.test.js:1371 `const second = await runRecipe(1, { batchIndex: 2, history, quantity: 4 });`
   - tests/generation-client.test.js:1372 `const secondWide = await runRecipe(4, { batchIndex: 2, history, quantity: 4 });`
   - tests/generation-client.test.js:1378 `const replay = await runRecipe(2, { quantity: 4 });`

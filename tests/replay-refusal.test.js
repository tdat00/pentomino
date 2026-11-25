// @ts-check
// The gen-v3 replay case under gen-v4 (P2-15): tests/fixtures/replay-case.json stays byte for byte as it was recorded
// before the cutover. Its packs still load and keep their provenance, and every replay of them is refused by version.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import { boardFromRows } from '../core/engine/board.js';
import { parsePack, serializePack } from '../core/engine/pack.js';
import { REPLAY } from '../core/engine/policy.js';
import { runReplay } from '../core/engine/replay.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';

test('the gen-v3 replay case is refused by version', () => {
  const recorded = JSON.parse(readFileSync(new URL('./fixtures/replay-case.json', import.meta.url), 'utf8'));
  assert.equal(recorded.versions.algo, 'gen-v3');
  assert.ok(recorded.packs.length > 0);
  const workspaces = { ws: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
  for (const [i, raw] of recorded.packs.entries()) {
    const parsed = parsePack(JSON.stringify(raw));
    assert.ok(parsed.ok, `pack ${i} loads`);
    const pack = /** @type {import('../core/engine/types.js').Pack} */ (parsed.value);
    const written = JSON.parse(serializePack(pack));
    assert.ok(isDeepStrictEqual(written.generation, raw.generation), `pack ${i} keeps every provenance field`);
    const set = {
      board: boardFromRows(pack.board.rows), pieces: pack.pieces, witness: pack.witness ?? null,
      carving: pack.generation?.carving, macroRegion: pack.generation?.macroRegion,
    };
    assert.ok(pack.puzzles.length > 0);
    for (const puzzle of pack.puzzles) {
      const run = runReplay(/** @type {any} */ ({ set, puzzle, generation: pack.generation }), workspaces, REPLAY);
      assert.equal(run.status, 'unavailable', `pack ${i} puzzle ${puzzle.id}`);
      assert.equal(run.reason, 'set-versions', `pack ${i} puzzle ${puzzle.id}`);
    }
  }
});

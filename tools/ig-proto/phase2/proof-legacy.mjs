// @ts-check
// Proof bundle 4, the legacy route (P2-12e; plan §7.2, §4.2 the legacy exception, review-1 R10 and R11; D-P2-05):
// Master, the full 26x26 Nightmare board and an ordinary small board return today's puzzles through the `gen-v4`
// build, and a 26x26 Nightmare candidate replays `matched`. Run by proofs.mjs:
//   node tools\ig-proto\phase2\proofs.mjs legacy --out <dir> [--quick]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { bundleStatus, caseStatus, moduleOf, openCopy, squareRows } from './proof-prior-replay.mjs';
import { compare } from './proofs.mjs';

const QUANTITY = 3;
const SEEDS = 2;
const GEN4 = { source: 'gen-v4', id: 'p2-gen4' };
const TODAY = { source: 'today', id: 'p2-today' };

/**
 * @typedef {object} LegacyView What one copy produced for one seed.
 * @property {unknown[]} pieces The set's pieces.
 * @property {{ layoutKey: string, clueKey: string, score: number | null }[]} accepted The accepted puzzles in order.
 */

/**
 * Judges one seed's equality between today's copy and the gen-v4 copy; the versions are not compared.
 * @param {LegacyView} today
 * @param {LegacyView} gen4
 * @returns {{ status: 'pass' | 'fail' | 'not-measured', problems: string[], gaps: string[] }}
 */
export function judgeEqual(today, gen4) {
  /** @type {string[]} */
  const problems = [];
  /** @type {string[]} */
  const gaps = [];
  const path = compare(today, gen4);
  if (path !== null) {
    problems.push(`today and gen-v4 differ at ${path}`);
  }
  if (today.accepted.length === 0 || gen4.accepted.length === 0) {
    gaps.push('no accepted puzzle');
  }
  return { status: caseStatus(problems, gaps), problems, gaps };
}

/**
 * Judges the replay sample of one 26x26 Nightmare seed (R10, R11).
 * @param {{ id: string, kind: string, replay: string | null }[]} records The accepted puzzles with their replay status.
 * @returns {{ status: 'pass' | 'fail' | 'not-measured', problems: string[], gaps: string[] }}
 */
export function judgeReplay(records) {
  const candidates = records.filter((r) => r.kind === 'candidate');
  /** @type {string[]} */
  const gaps = candidates.length === 0 ? ['no ordinary candidate to replay'] : [];
  const problems = candidates.filter((r) => r.replay !== 'matched').map((r) => `record ${r.id}: replay ${r.replay === null ? 'not run' : r.replay}`);
  return { status: caseStatus(problems, gaps), problems, gaps };
}

/**
 * @param {boolean} quick
 * @param {string} root The repository root.
 * @returns {{ cell: string, boardRows: string[], level: string, seed: string }[]} The requests: two seeds of each cell; with `quick` the first seed.
 */
export function requestsOf(quick, root) {
  const fixture = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'generation-case.json'), 'utf8'));
  const cells = [
    { cell: '10x10-master', boardRows: squareRows(10), level: 'master' },
    { cell: '26x26-master', boardRows: squareRows(26), level: 'master' },
    { cell: '26x26-nightmare', boardRows: squareRows(26), level: 'nightmare' },
    { cell: '10x6-hard', boardRows: /** @type {string[]} */ (fixture.boardRows), level: fixture.levelId },
  ];
  return cells.flatMap((c) => Array.from({ length: quick ? 1 : SEEDS }, (_, i) => ({ ...c, seed: `p2-proof/${c.cell}/${i}` })));
}

/**
 * Generates one seed on a copy.
 * @param {Awaited<ReturnType<typeof openCopy>>} copy
 * @param {{ boardRows: string[], level: string, seed: string }} request
 * @returns {Promise<{ view: LegacyView, set: any, setOrigin: any, batch: any } | { gap: string }>}
 */
async function generate(copy, request) {
  const { client, base } = copy;
  const keys = await moduleOf(base, 'core/engine/keys.js');
  const made = await client.generateSet({
    boardRows: request.boardRows, rotation: 0, levelId: request.level, seedText: request.seed, uniqueness: 'any', maxActive: 676,
  });
  if (made.status !== 'complete' || made.set === undefined) {
    return { gap: `the set request ended ${made.status}${made.reason === undefined ? '' : ` (${made.reason})`}` };
  }
  const { set } = made;
  const batch = await client.generateBatch({
    set,
    rotation: 0,
    targetLevelId: request.level,
    quantity: QUANTITY,
    setSeed: request.seed,
    batchIndex: 1,
    uniqueness: 'any',
    seenLayouts: [],
    seenClues: [],
    calibration: made.calibration,
    setLevel: request.level,
    setAttempt: made.attempt,
    setOrigin: made.setOrigin,
  });
  return {
    set,
    setOrigin: made.setOrigin,
    batch,
    view: {
      pieces: set.pieces,
      accepted: batch.accepted.map((/** @type {any} */ p) => ({
        layoutKey: keys.layoutKey(set.board, set.pieces, p.solution),
        clueKey: keys.clueKey(set.board, set.pieces, p.clues),
        score: p.rating?.score ?? null,
      })),
    },
  };
}

/**
 * @param {{ out: string, quick: boolean, root: string, trees: string }} o
 * @returns {Promise<{ status: 'pass' | 'fail', cases: unknown[], counts: Record<string, unknown>, copies: string[] }>}
 */
export async function run({ quick, root, trees }) {
  const gen4 = await openCopy(trees, GEN4.source, GEN4.id);
  const today = await openCopy(trees, TODAY.source, TODAY.id);
  /** @type {any[]} */
  const cases = [];
  const counts = { cases: 0, pass: 0, fail: 0, notMeasured: 0, accepted: 0, candidatesReplayed: 0, matched: 0 };
  /** @param {Record<string, unknown>} entry @param {{ status: string }} verdict */
  const add = (entry, verdict) => {
    cases.push({ ...entry, ...verdict });
    counts.cases += 1;
    if (verdict.status === 'pass') {
      counts.pass += 1;
    } else if (verdict.status === 'fail') {
      counts.fail += 1;
    } else {
      counts.notMeasured += 1;
    }
  };
  try {
    for (const request of requestsOf(quick, root)) {
      const t0 = Date.now();
      try {
        const g = await generate(gen4, request);
        const t = await generate(today, request);
        if ('gap' in g || 'gap' in t) {
          add({ case: 'equal', cell: request.cell, seed: request.seed, ms: Date.now() - t0 }, { status: 'not-measured', problems: [], gaps: ['gap' in g ? `gen-v4: ${g.gap}` : `today: ${/** @type {{ gap: string }} */ (t).gap}`] });
          continue;
        }
        counts.accepted += g.view.accepted.length;
        add({ case: 'equal', cell: request.cell, seed: request.seed, accepted: g.view.accepted.length, ms: Date.now() - t0 }, judgeEqual(t.view, g.view));
        if (request.cell === '26x26-nightmare') {
          const t1 = Date.now();
          const records = await Promise.all(g.batch.accepted.map(async (/** @type {any} */ puzzle) => {
            const made = g.batch.made[puzzle.id];
            const kind = made?.kind ?? 'unknown';
            const reply = kind === 'candidate' ? await gen4.client.replayPuzzle({ set: g.set, puzzle, setOrigin: g.setOrigin, made }) : null;
            return { id: puzzle.id, kind, replay: reply === null ? null : reply.status };
          }));
          counts.candidatesReplayed += records.filter((r) => r.replay !== null).length;
          counts.matched += records.filter((r) => r.replay === 'matched').length;
          add({ case: 'replay', cell: request.cell, seed: request.seed, records, ms: Date.now() - t1 }, judgeReplay(records));
        }
      } catch (e) {
        add({ case: 'equal', cell: request.cell, seed: request.seed, ms: Date.now() - t0 }, { status: 'fail', problems: [`error: ${e instanceof Error ? e.message : String(e)}`], gaps: [] });
      }
    }
  } finally {
    gen4.close();
    today.close();
  }
  return { status: bundleStatus(cases), cases, counts, copies: [GEN4.id, TODAY.id] };
}

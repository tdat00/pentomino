// @ts-check
// Proof bundle 2, the certificates (P2-12c; plan §7.2; P2-T03): a certified screen rating is the canonical rating, and
// the screen never changes a result. Production modules only. Each case runs `selectCluesV4` with and without a
// `rateScreen` seam that rates as the search does and records every rating it returns, then rates the same clues
// canonically. Run by proofs.mjs:
//   node tools\ig-proto\phase2\proofs.mjs certificate --out <dir> [--quick]
import { IncompleteRatingError, rateLean, rateWithLimits, screenCertified } from '../../../core/engine/difficulty.js';
import { level } from '../../../core/engine/levels.js';
import { selectCluesV4 } from '../../../core/engine/select-v4.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../../../core/engine/workspace.js';
import { makeSet } from './proof-observer.mjs';
import { bundleStatus, caseStatus } from './proof-prior-replay.mjs';
import { compare } from './proofs.mjs';

const CELLS = Object.freeze(['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare']);
const SEEDS = 3;

/** @typedef {{ rating: any } | { capped: true }} Rated A rating, or the `IncompleteRatingError` of a capped path. */

/**
 * @typedef {object} ScreenRecord One screen rating of the call and the canonical rating of the same clues.
 * @property {string[]} clues The piece ids of the clues.
 * @property {number} W The screen limit of the call.
 * @property {Rated} screen
 * @property {Rated} canonical
 */

/**
 * @typedef {object} CertificateRecord One measured case.
 * @property {string} case
 * @property {string | null} sameResult The first path where the call with the seam differs from the call without it, `null` when equal.
 * @property {ScreenRecord[]} screens
 */

/**
 * @param {boolean} quick
 * @returns {{ id: string, cell: string, seed: string }[]} Three seeds of each cell; with `quick` the first case.
 */
export function certificateRequests(quick) {
  const all = CELLS.flatMap((cell) => Array.from({ length: SEEDS }, (_, i) => ({ id: `${cell}-${i}`, cell, seed: `p2-proof/${cell}/${i}` })));
  return quick ? all.slice(0, 1) : all;
}

/**
 * @param {Rated} screen
 * @param {number} W
 * @returns {'certified' | 'screen-capped' | 'capped'} `capped`: the screen's path was capped (an `IncompleteRatingError`); `screen-capped`: a rating above `W`.
 */
export function kindOf(screen, W) {
  if ('capped' in screen) {
    return 'capped';
  }
  return screenCertified(screen.rating.metrics, W) ? 'certified' : 'screen-capped';
}

/**
 * @param {ScreenRecord} rec
 * @returns {{ kind: 'certified' | 'screen-capped' | 'capped', problem: string | null }} A certified rating must deep-equal the canonical one; any other must be capped canonically too, or take more than `W` main work.
 */
export function judgeScreen(rec) {
  const kind = kindOf(rec.screen, rec.W);
  if (kind === 'certified') {
    if ('capped' in rec.canonical) {
      return { kind, problem: 'certified, but the canonical rating is capped' };
    }
    const path = compare(rec.canonical.rating, /** @type {{ rating: any }} */ (rec.screen).rating);
    return { kind, problem: path === null ? null : `a certified rating differs from the canonical one at ${path}` };
  }
  if ('capped' in rec.canonical) {
    return { kind, problem: null };
  }
  const { metrics } = rec.canonical.rating;
  const main = metrics.work - metrics.censusWork;
  return { kind, problem: main > rec.W ? null : `not certified, but the canonical main work ${main} is within ${rec.W}` };
}

/**
 * Judges the recorded corpus; a problem names its case. A case without a screen rating is no evidence and fails.
 * @param {CertificateRecord[]} corpus
 * @returns {{ status: 'pass' | 'fail' | 'not-measured', problems: string[], counts: { certified: number, screenCapped: number, capped: number },
 *   cases: { case: string, status: 'pass' | 'fail' | 'not-measured', problems: string[], screens: number, certified: number, screenCapped: number, capped: number }[] }}
 */
export function judgeCertificate(corpus) {
  const counts = { certified: 0, screenCapped: 0, capped: 0 };
  /** @type {string[]} */
  const all = [];
  const cases = corpus.map((rec) => {
    /** @type {string[]} */
    const problems = [];
    const own = { certified: 0, screenCapped: 0, capped: 0 };
    if (rec.sameResult !== null) {
      problems.push(`${rec.case}: the call with the seam differs from the call without it at ${rec.sameResult}`);
    }
    if (rec.screens.length === 0) {
      problems.push(`${rec.case}: no screen rating was recorded`);
    }
    rec.screens.forEach((screen, i) => {
      const { kind, problem } = judgeScreen(screen);
      own[kind === 'certified' ? 'certified' : kind === 'capped' ? 'capped' : 'screenCapped'] += 1;
      if (problem !== null) {
        problems.push(`${rec.case}: screen rating ${i} (clues ${screen.clues.join(',')}): ${problem}`);
      }
    });
    counts.certified += own.certified;
    counts.screenCapped += own.screenCapped;
    counts.capped += own.capped;
    all.push(...problems);
    return { case: rec.case, status: caseStatus(problems, []), problems, screens: rec.screens.length, ...own };
  });
  if (corpus.length > 0 && counts.certified === 0) {
    all.push('no certified screen rating was recorded');
  }
  return { status: corpus.length > 0 && all.length === 0 ? 'pass' : 'fail', problems: all, counts, cases };
}

/**
 * @param {{ id: string, cell: string, seed: string }} request
 * @returns {CertificateRecord}
 */
function measure(request) {
  const ctxOf = (/** @type {Record<string, any>} */ extra) => {
    const made = makeSet(request.cell, request.seed);
    return {
      board: made.board, pieces: made.set.pieces, layout: made.set.witness, target: level('nightmare'), rng: made.cal,
      uniqueness: /** @type {const} */ ('any'), excludeClueKeys: new Set(), ws: createWorkspace(MAIN_WORKSPACE_BYTES), ...extra,
    };
  };
  const plain = selectCluesV4(ctxOf({}));
  /** @type {{ clues: any[], W: number, screen: Rated }[]} */
  const seen = [];
  const seamed = ctxOf({});
  seamed.rateScreen = (/** @type {any[]} */ clues, /** @type {number} */ W) => {
    try {
      const { rating } = rateWithLimits(seamed.board, seamed.pieces, clues, seamed.ws, W, 'lean');
      seen.push({ clues, W, screen: { rating } });
      return rating;
    } catch (e) {
      if (e instanceof IncompleteRatingError) {
        seen.push({ clues, W, screen: { capped: true } });
      }
      throw e;
    }
  };
  const withSeam = selectCluesV4(seamed);
  const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
  const screens = seen.map(({ clues, W, screen }) => {
    /** @type {Rated} */
    let canonical;
    try {
      canonical = { rating: rateLean(seamed.board, seamed.pieces, clues, ws) };
    } catch (e) {
      if (!(e instanceof IncompleteRatingError)) {
        throw e;
      }
      canonical = { capped: true };
    }
    return { clues: clues.map((/** @type {{ piece: string }} */ p) => p.piece), W, screen, canonical };
  });
  return { case: request.id, sameResult: compare(plain, withSeam), screens };
}

/**
 * @param {{ out: string, quick: boolean, root?: string, trees?: string }} o
 * @returns {Promise<{ status: 'pass' | 'fail', cases: unknown[], counts: Record<string, unknown>, copies: string[] }>}
 */
export async function run({ quick }) {
  /** @type {CertificateRecord[]} */
  const corpus = [];
  /** @type {Record<string, number>} */
  const ms = {};
  /** @type {any[]} */
  const errors = [];
  for (const request of certificateRequests(quick)) {
    const t0 = Date.now();
    try {
      corpus.push(measure(request));
    } catch (e) {
      errors.push({ case: 'certificate', id: request.id, cell: request.cell, seed: request.seed, status: 'fail', problems: [`error: ${e instanceof Error ? e.message : String(e)}`] });
    }
    ms[request.id] = Date.now() - t0;
  }
  const verdict = judgeCertificate(corpus);
  const requests = certificateRequests(quick);
  const cases = [
    ...verdict.cases.map((c) => ({ ...c, cell: requests.find((r) => r.id === c.case)?.cell, ms: ms[c.case] })),
    ...errors,
    ...(verdict.problems.some((p) => p.startsWith('no certified')) ? [{ case: 'corpus', status: 'fail', problems: verdict.problems.filter((p) => p.startsWith('no certified')) }] : []),
  ];
  const counts = { cases: cases.length, pass: cases.filter((c) => c.status === 'pass').length, fail: cases.filter((c) => c.status !== 'pass').length, ...verdict.counts };
  return { status: bundleStatus(cases), cases, counts, copies: [] };
}

// @ts-check
// The test seams of the no-window glue proof (P2-16c). This file exists only in the copy `p2-glue`; no production file
// imports it. Only the ratings of the scripted set attempts are replaced: the selector, `setAttempt`, the protocol, the
// worker pool and the client stay the production code. `P2_GLUE_SCRIPT` is a JSON object from set-attempt index to
// 'below', 'above' or 'budget'; worker threads see the environment of their parent.

/**
 * The synthetic rating of the frozen vectors (P2-05a).
 * @param {number} score
 * @param {{ work?: number }} [opts]
 * @returns {any}
 */
function synthetic(score, { work = 1 } = {}) {
  return {
    model: 'difficulty-v3', score, level: 'st', saturated: false,
    metrics: { work, censusWork: 0, nodes: 1, censusNodes: 0, searchStop: 'exhausted', Gproved: 1, censusComplete: true },
  };
}

/** The rating of each scripted outcome: below every band, above Nightmare's band, and inside it with a heavy work. */
const OUTCOMES = Object.freeze({
  below: () => synthetic(0),
  above: () => synthetic(200),
  budget: () => synthetic(54, { work: 6000000000 }),
});

/**
 * @param {any} ctx The SelectContext, with `igStage` and `igAttempt` set by the copy's `generate.js`.
 * @returns {Record<string, any>} The seams of the scripted set attempt, else `{}`: the real selector runs.
 */
export function glueSeams(ctx) {
  const text = process.env.P2_GLUE_SCRIPT;
  if (text === undefined || ctx.igStage !== 'set') {
    return {};
  }
  /** @type {Record<string, string>} */
  const script = JSON.parse(text);
  const outcome = script[String(ctx.igAttempt)];
  if (outcome === undefined) {
    return {};
  }
  const rating = /** @type {Record<string, () => any>} */ (OUTCOMES)[outcome];
  if (rating === undefined) {
    throw new Error(`p2-glue: unknown outcome ${outcome}`);
  }
  return { rateScreen: () => rating(), rate: () => rating() };
}

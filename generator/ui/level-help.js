// @ts-check
// Worked explanations behind the numbers of the level table. Each one shows how the generator's own policy
// (piece-count plan, piece-size window, starting share of pre-placed pieces) arrives at the value in the cell;
// the values come from the engine functions, so an explanation cannot drift from what is generated.
import { initialClueCount, level } from '../../core/engine/levels.js';
import { pieceCountPlan, SIZE_WINDOW, sizeWindow } from '../../core/engine/policy.js';
import { formatNumber as formatLocal, t } from '../i18n.js';

/**
 * One line: `text = value → result` (value and result are optional; the result is shown in bold).
 * @typedef {{ text: string, value?: string, result?: string }} HelpLine
 */
/** @typedef {{ title: string, lines: HelpLine[], note: string }} Help */
/** @typedef {'pieces' | 'size' | 'placed'} HelpKind */

/**
 * @param {number} value
 * @returns {string} At most two decimals, in the page language.
 */
export function formatNumber(value) {
  return formatLocal(value, { maximumFractionDigits: 2 });
}

/**
 * @param {number} low
 * @param {number} high
 * @returns {string}
 */
export function range(low, high) {
  return low === high ? String(low) : `${low}–${high}`;
}

/**
 * A calculation line; the unrounded value is left out when it already equals the result.
 * @param {string} text
 * @param {number} raw
 * @param {number} result
 * @param {string} unitKey
 * @returns {HelpLine}
 */
function step(text, raw, result, unitKey) {
  const value = formatNumber(raw);
  return value === formatNumber(result)
    ? { text, result: t(unitKey, { n: result }) }
    : { text, value, result: t(unitKey, { n: result }) };
}

/**
 * The explanation for one number of the level table, or null when the level has no counts on this board.
 * @param {HelpKind} kind
 * @param {string} levelId
 * @param {number} area Playable squares of the board.
 * @returns {Help | null}
 */
export function levelHelp(kind, levelId, area) {
  const plan = Number.isInteger(area) && area > 0 ? pieceCountPlan(levelId, area) : null;
  if (plan === null || plan.counts.length === 0) {
    return null;
  }
  const kmin = plan.counts[0];
  const kmax = plan.counts[plan.counts.length - 1];

  if (kind === 'pieces') {
    const raw = plan.base * (area / plan.referenceArea) ** plan.exponent;
    /** @type {HelpLine[]} */
    const lines = [{
      text: t('level.help.pieces.target', { base: formatNumber(plan.base), area, ref: plan.referenceArea, exp: formatNumber(plan.exponent) }),
      value: formatNumber(raw),
    }];
    if (plan.mid < raw) {
      lines.push({ text: t('level.help.pieces.cap'), value: String(plan.cap) });
    }
    lines.push({
      text: t('level.help.pieces.spread', { mid: formatNumber(plan.mid), spread: formatNumber(plan.spread) }),
      value: range(Math.round(plan.mid - plan.spread), Math.round(plan.mid + plan.spread)),
    });
    lines.push({ text: t('level.help.pieces.limits', { low: plan.low, high: plan.high }) });
    const skipped = [];
    for (let k = plan.from; k <= plan.to; k += 1) {
      if (!plan.counts.includes(k)) {
        skipped.push(k);
      }
    }
    if (skipped.length > 0) {
      lines.push({ text: t('level.help.pieces.skipped', { list: skipped.join(', ') }) });
    }
    lines.push({ text: t('level.help.result'), result: t('level.help.unit.pieces', { n: range(kmin, kmax) }) });
    return { title: t('level.help.pieces.title'), lines, note: t('level.help.pieces.note', { base: formatNumber(plan.base), ref: plan.referenceArea }) };
  }

  if (kind === 'size') {
    const [smallest] = sizeWindow(area, kmax);
    const [, largest] = sizeWindow(area, kmin);
    return {
      title: t('level.help.size.title'),
      lines: [
        step(t('level.help.size.smallest', { pct: formatNumber(SIZE_WINDOW.low * 100), area, k: kmax }), SIZE_WINDOW.low * (area / kmax), smallest, 'level.help.unit.squares'),
        step(t('level.help.size.largest', { pct: formatNumber(SIZE_WINDOW.high * 100), area, k: kmin }), SIZE_WINDOW.high * (area / kmin), largest, 'level.help.unit.squares'),
      ],
      note: t('level.help.size.note', { min: SIZE_WINDOW.minSize }),
    };
  }

  const share = level(levelId).share;
  const pct = formatNumber(share * 100);
  return {
    title: t('level.help.placed.title'),
    lines: (kmin === kmax ? [kmin] : [kmin, kmax])
      .map((k) => step(t('level.help.placed.line', { pct, k }), share * k, initialClueCount(share, k), 'level.help.unit.pieces')),
    note: t('level.help.placed.note', { pct }),
  };
}

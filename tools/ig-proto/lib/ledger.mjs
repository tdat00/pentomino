// @ts-check
// The work ledger of one stage-1 item (task pack v4, V4-T04b; reviews R2-14, R2-07 and RV4-02; D-V4-17). Pure: it reads
// parsed journal lines and never touches a file. A work total that cannot be known is `null`, never zero.

const ROUTES = Object.freeze(['new', 'legacy', 'legacy-recorded']);
const PRIMITIVE_KINDS = Object.freeze(['rate', 'screen', 'count']);

/** @param {unknown} value @returns {value is number} A finite number from 0. */
const valid = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** @param {any} line @returns {number} The units of a `p` line (`tuple[4] + tuple[5]`), NaN when either is not valid. */
const pUnits = (line) => (Array.isArray(line.tuple) && valid(line.tuple[4]) && valid(line.tuple[5]) ? line.tuple[4] + line.tuple[5] : NaN);

/** @param {any} line @returns {boolean} A rating that carries zero placeholders, not measured units. */
const unquantified = (line) => line.tuple?.[2] === 'unsat' || line.tuple?.[2] === 'error';

/**
 * Pairs the begin lines of one call with their completion lines (IG-P-Q37; RV4-02), at most one primitive pending.
 * `<index>` of a problem is the primitive's position among the call's `begin` lines, from 0.
 * @param {any[]} callLines The lines of one call, in their order.
 * @param {string | null} call The call id the problems name.
 * @returns {{ problems: string[], lo: number, open: { kind: unknown, bound: unknown, index: number } | null }}
 *   `lo` is the sum of the completed, quantified primitives' finite units; `open` the primitive still pending after
 *   the last line.
 */
export function pairPrimitives(callLines, call) {
  /** @type {string[]} */
  const problems = [];
  let lo = 0;
  let begins = 0;
  /** @type {{ kind: unknown, bound: unknown, index: number } | null} */
  let pending = null;
  for (const line of callLines) {
    if (line.t === 'begin') {
      const index = begins;
      begins += 1;
      if (!PRIMITIVE_KINDS.includes(line.kind)) {
        problems.push(`invalid begin ${call} ${index}`);
      }
      if (!valid(line.bound)) {
        problems.push(`invalid bound ${call}`);
      }
      if (pending !== null) {
        problems.push(`overlapping begin ${call} ${index}`);
      }
      pending = { kind: line.kind, bound: line.bound, index };
    } else if (line.t === 'p' || line.t === 'count') {
      const closes = line.t === 'p' ? ['rate', 'screen'] : ['count'];
      if (pending === null || !closes.includes(/** @type {string} */ (pending.kind))) {
        problems.push(`unpaired ${line.t} line ${call}`);
        continue;
      }
      const { index, bound } = pending;
      pending = null;
      if (line.t === 'p' && unquantified(line)) {
        problems.push(`unquantified ${line.tuple[2]} ${call} ${index}`);
        continue;
      }
      const units = line.t === 'p' ? pUnits(line) : line.units;
      if (!valid(units)) {
        continue;
      }
      lo += units;
      if (valid(bound) && units > bound) {
        problems.push(`bound exceeded ${call} ${index}`);
      }
    }
  }
  return { problems, lo, open: pending };
}

/**
 * The ledger of one item: rating work and uniqueness-count work from the journal lines of its log folder, with its
 * completeness (R2-14, R2-07).
 * @param {any[]} lines Every journal line of the item's `logDir`, file order then line order.
 * @param {'new' | 'legacy' | 'legacy-recorded'} route `new`: a Nightmare or Hell 1 target in a `v4`-family tree;
 *   `legacy`: another target through the journaled route; `legacy-recorded`: another target with a recorder (the
 *   frozen search runs without the journal).
 * @returns {{ complete: boolean, ratingWork: number | null, countWork: number | null, totalWork: number | null,
 *   calls: number, problems: string[] }} `calls` is the number of `start` lines; `complete` is true only without a
 *   problem; `totalWork` is the sum of the two works when both are known, else null.
 */
export function itemLedger(lines, route) {
  if (!ROUTES.includes(route)) {
    throw new Error(`unknown route ${route}`);
  }
  /** @type {string[]} */
  const problems = [];
  const recorded = route === 'legacy-recorded';
  const starts = lines.filter((l) => l.t === 'start');
  const call = starts[0]?.call ?? null;
  const identified = starts.length === 1;
  const ends = lines.filter((l) => l.t === 'end' && l.call === call);
  // The call the count lines and the capability line belong to: the call itself on the new route, null otherwise.
  const countCall = route === 'new' ? call : null;
  const ratings = recorded ? [] : lines.filter((l) => l.t === 'p' && l.call === call);
  const counts = lines.filter((l) => l.t === 'count' && l.call === countCall);
  const capable = lines.some((l) => l.t === 'caps' && l.call === countCall && l.count === true);

  if (!recorded) {
    if (!identified) {
      problems.push(`expected one start line, found ${starts.length}`);
    }
    if (ends.length === 0) {
      problems.push(`no end line ${call}`);
    } else if (ends.length > 1) {
      problems.push(`duplicate end ${call}`);
    }
  }
  if (!capable) {
    problems.push('absent count capability');
  }
  const foreign = lines.filter((l) => (route === 'new' && (l.t === 'p' || l.t === 'begin') && l.call !== call)
    || (l.t === 'count' && l.call !== countCall)
    || (route === 'legacy' && l.t === 'p' && l.call !== call));
  for (const l of foreign) {
    problems.push(`foreign ${l.t} line ${l.call}`);
  }
  const bad = [...ratings.filter((l) => Number.isNaN(pUnits(l))), ...counts.filter((l) => !valid(l.units))];
  for (const l of bad) {
    const text = `invalid work ${l.call}`;
    if (!problems.includes(text)) {
      problems.push(text);
    }
  }

  const badRatings = ratings.some((l) => Number.isNaN(pUnits(l)));
  const badCounts = counts.some((l) => !valid(l.units));
  /** @type {number | null} */
  const ratingWork = recorded || !identified || badRatings ? null : ratings.reduce((sum, l) => sum + pUnits(l), 0);
  /** @type {number | null} */
  const countWork = (!recorded && !identified) || !capable || badCounts ? null : counts.reduce((sum, l) => sum + l.units, 0);
  if (recorded) {
    problems.push('ratings not journaled on the recorded route');
  }

  if (!recorded && ends.length === 1) {
    const end = ends[0];
    if (ratingWork !== null && ratingWork !== end.work) {
      problems.push(`sum of p work ${ratingWork} differs from end.work ${end.work}`);
    }
    if (route === 'new' && countWork !== null) {
      const total = end.locate?.countWork;
      if (typeof total !== 'number') {
        problems.push('absent count total');
      } else if (countWork !== total) {
        problems.push(`sum of counts ${countWork} differs from end.locate.countWork ${total}`);
      }
    }
  }
  if (route === 'new') {
    const paired = pairPrimitives(lines.filter((l) => l.call === call && (l.t === 'begin' || l.t === 'p' || l.t === 'count')), call);
    problems.push(...paired.problems);
    if (paired.open !== null && ends.length > 0) {
      problems.push(`unfinished primitive ${call}`);
    }
  } else if (!recorded) {
    ratings.forEach((l, index) => {
      if (unquantified(l)) {
        problems.push(`unquantified ${l.tuple[2]} ${call} ${index}`);
      }
    });
  }
  return {
    complete: problems.length === 0,
    ratingWork,
    countWork,
    totalWork: ratingWork !== null && countWork !== null ? ratingWork + countWork : null,
    calls: starts.length,
    problems,
  };
}

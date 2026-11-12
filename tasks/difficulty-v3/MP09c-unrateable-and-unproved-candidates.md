# MP09c — Unrateable and unproved candidates in clue selection (RES-04, RES-35 / AR1)

| Header | Value |
|---|---|
| ID | MP09c |
| Depends on | MP09b (accepted and committed); MP07's `selectClues` structure (`rateSubset`, `finish`, `finishOnce`, `chooseBest`, `afterProfile`, the `SelectContext.rate` seam) |
| Estimated size | Medium: about 300–450 changed lines (clues.js about 50, difficulty.js about 25, tasks.js about 10, tests about 200–300, documents about 40); about 30–45 minutes |
| Owner role | Engine |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-04 (the unrateable capped path), RES-35 (a generated Hard-or-above puzzle needs a proved decisive guess), RES-15 (memoised repairs); clarifications SA2-Q-P02 (owner), AR1 (owner, part G); check-list §4.2 D9, D10, D24; cross-review FP10 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`) |
| Gates owned | none (this task changes no output: `rate` is still v2 until MP09d2) |
| Implementation status | Not started |

## Goal & business context

The owner decided two rules for the coming `difficulty-v3` rating, and this task builds the part of them that lives in
clue selection, before the rating is switched on:

- **AR1 (owner):** "Hard and above require at least one real choice." A v3 rating can reach Hard as an *estimate*
  when its census of the guesses did not finish. The Generator must not accept a Hard-or-above candidate whose rating
  has no proved decisive guess, even when its estimated score is in band. A labelled estimate with `Gproved >= 1` is
  still eligible. For a target at Hard or above, a candidate whose rating has `metrics.Gproved === 0` (no alternative
  proved to fail) is refused, whatever its score. This task owns that rule (C1 (b) `censored` is MP09b's and MP09d2's;
  the `Gproved` metric is MP05's; the recorder event is MP14a's).
- **SA2-Q-P02 (owner):** a puzzle whose deduction search was capped before its first solution is **unrateable**:
  `measureV3` (MP09d1) and so `rate` (from MP09d2) will throw `IncompleteRatingError`. Clue selection must treat such a
  subset as spent and move on, never as a failure of the whole request.

Today `rate` is still `difficulty-v2`: it never throws `IncompleteRatingError` and its ratings carry no `Gproved`, so
no generated puzzle, pack, fixture or document example changes in this task. The rules are proven with scripted
ratings through the `SelectContext.rate` seam that MP07 added.

## Scope

### In scope

- `core/engine/difficulty.js`: the exported class `IncompleteRatingError` (nothing throws it yet in production).
- `core/engine/clues.js`: an unrateable subset and a refused subset spend a profile and are neutral; a repaired
  rating that is unrateable or refused makes that repair fail.
- `core/engine/tasks.js`: the worker error code `rating-incomplete` for `IncompleteRatingError`.
- Tests in `tests/clues.test.js` and `tests/tasks.test.js`; documents (design §4.2, §6.10, §6.11, §7.6, §8.1, §13.2).

### Out of scope

- `measureV3`, switching `rate` to v3, `MODEL`, renaming the v2 functions, the pinned rating tests and the gates
  (MP09d1, MP09d2). The recorder events `unrateable` and `rejected` / `no-proved-guess` (MP14a).
- Any change of sampling, of the count steering, of the beam moves, of the centre rule of MP07, of `makeUnique`, of
  `generate.js`, or of the `IncompleteRatingError` handling outside `selectClues` and `errorReply`.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity; none of the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive`, `deriveLimits` in `clues.js`,
  `difficulty.js` or `tasks.js`, not even in a comment.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no test name containing `slow`.
- Run only the commands of the test plan; never stage, commit, stash, reset, push or switch branches; never edit
  `tasks/difficulty-v3/`, the reports, `docs/difficulty-v3/` or any fixture.

## Inputs & context

### Current code (anchors at HEAD `6b772a9` plus MP07; find moved lines by the quoted text)

- `core/engine/difficulty.js`: `UnsatisfiableError` (lines 20-28: `export class UnsatisfiableError extends Error {`),
  `rate` (109), `inBand` (121). `MODEL` is `'difficulty-v2'`.
- `core/engine/clues.js` after MP07 (its task file gives the exact structure):
  - `selectClues(ctx)` reads `const rateFn = ctx.rate ?? rate;` and uses it for every rating;
  - `rateSubset(idx)` returns `null` for a repeated, excluded or over-budget subset (no profile), otherwise rates the
    subset, `profiles += 1`, calls `onRate`, pushes the candidate to `rated` and returns it;
  - `finish(c)` in `require` mode: `makeUnique`, then `rating = changed ? rateFn(board, pieces, clues, ws) :
    c.rating`, then `if (!inBand(rating, target)) return null;`, then the `excludeClueKeys` check of a changed key;
  - `finishOnce(c)` memoises `finish` by the raw subset id; `chooseBest()`; `afterProfile(c)` is called once per rated
    candidate in phase 1, phase 2 and the beam; it adds an in-band candidate to `inBandList`, may stop on a central
    final result, and from profile 48 (`profiles >= limit - CENTRE_RESERVE`) returns `chooseBest()` when
    `inBandList` is not empty;
  - phase 1 counts each rated sample `below` or `above` the band (count steering); phase 2 runs while
    `rated.length === 0`; the beam pushes each rated neighbour to `fresh` and stops when `fresh` is empty.
- `core/engine/levels.js:42`: `export function bandEdge(index)`; `bandEdge(3)` is 17, the lower edge of Hard.
- `core/engine/tasks.js`: `ERROR_CODES` (lines 46-55: `invalidTask` … `internal`), `errorReply(id, error)`
  (218-250; `} else if (error instanceof UnsatisfiableError) {` at 239, then the `RangeError`/`TypeError` branch and
  the generic `Error` branch). The error `code` of a reply is any short string (`core/engine/protocol.js:851-858`):
  adding a code is not a protocol change.

### `IncompleteRatingError` (RES-04)

```js
/**
 * Thrown when the deduction search was capped (node or work cap) before its first solution: the puzzle is unrateable
 * (RES-04). `counters` are the search totals at the cap. Nothing is derived from a capped path.
 */
export class IncompleteRatingError extends Error {
  /**
   * @param {string} message
   * @param {{ nodes: number, work: number, stop: 'node-cap' | 'work-cap' }} counters
   */
  constructor(message, counters) {
    super(message);
    this.name = 'IncompleteRatingError';
    this.code = 'rating-incomplete';
    this.reason = 'path-capped';
    this.counters = { nodes: counters.nodes, work: counters.work, stop: counters.stop };
  }
}
```

Place it right after `UnsatisfiableError`. MP09d1's `measureV3` throws it with the message
`'the deduction path was capped'`.

### The rules in `selectClues` (RES-04, RES-35; check-list D10)

```text
setup:     refuseUnproved = target.min >= bandEdge(3)          // "Hard or above"; the target has no level index
           noProvedGuess(r) = r.metrics is an object with own property Gproved and r.metrics.Gproved === 0

rateSubset(idx):                                               // returns null, 'spent' or a Candidate
  unchanged up to the rating (null for a repeated, excluded or over-budget subset; no profile spent)
  try rating = rateFn(board, pieces, clues, ws)
  catch e: if e is not an IncompleteRatingError: rethrow e unchanged
           profiles += 1; return 'spent'                       // unrateable (RES-04)
  profiles += 1
  if refuseUnproved and noProvedGuess(rating): return 'spent'  // refused (RES-35)
  onRate(clues, rating) if set; push { idx, clues, rating, key } to rated; return it

every caller of rateSubset (phase 1, phase 2, the beam):
  c = rateSubset(...)
  if c === null: continue                                      // as today: no profile
  done = afterProfile(c === 'spent' ? null : c)                // the reserve stop also counts spent profiles
  if done !== null: return done
  if c === 'spent': continue                                   // neutral: not below, not above, not in fresh
  ... the existing code for a rated candidate (count steering in phase 1, fresh.push in the beam)

afterProfile(c):                                               // c may now be null
  if c !== null and inBand(c.rating, target): ... unchanged (inBandList, central stop)
  the reserve check stays as it is (it runs for a spent profile too)

finish(c), require mode, when the repair changed the clue set:
  try rating = rateFn(board, pieces, clues, ws)
  catch e: if e is not an IncompleteRatingError: rethrow e unchanged
           return null                                         // that repair fails; memoised by finishOnce
  if refuseUnproved and noProvedGuess(rating): return null     // refused repair (RES-35)
  then, unchanged: the band check, the excluded-key check, the result
```

Consequences (each is tested):

- A spent subset counts toward the 64 profiles and toward the stop at profile 48, is not added to `rated` (so it never
  seeds the beam and phase 2 keeps sampling while nothing was rated), is neither in band nor below nor above, and
  `onRate` is not called for it. It is never rated again (`tried` already holds it).
- Below Hard (`target.min < 17`) nothing changes; a rating without `metrics.Gproved` (every v2 rating, MP07's scripted
  ratings) is never refused.
- Every error other than `IncompleteRatingError` (`UnsatisfiableError`, `ModelError`, `RangeError`, …) propagates
  unchanged, from a subset rating and from a repair rating.
- Name the helper `noProvedGuess`: `selectClues` already has a `let unproved` (the uniqueness flag).

### Worker error code (RES-04: the `rate` task fails its request)

In `tasks.js` add `ratingIncomplete: 'rating-incomplete'` to `ERROR_CODES` and, before the `RangeError` /
`TypeError` branch of `errorReply`, `} else if (error instanceof IncompleteRatingError) { code =
ERROR_CODES.ratingIncomplete; message = error.message; }`. MP10b's display rating treats this reply like any rating
error ("could not be re-rated").

### Test vectors (analysts' reference implementation of this specification, check-list D11)

Use the 10 x 6 recipe fixtures of `tests/clues.test.js` (`board`, `pieces`, `layout`, `ws`) and MP07's `traced`
helper, or a copy of it that also records how each call ended. Scripted raters, written in the test file:

```js
/**
 * @param {Piece[]} p @param {Pose[]} clues @param {number} score @param {number | undefined} Gproved
 * @param {boolean} [censored] true for a labelled estimate (C1 (b))
 */
const v3Rating = (p, clues, score, Gproved, censored = false) => /** @type {Rating} */ (/** @type {unknown} */ ({
  model: 'difficulty-v3', score, level: levelForScore(score).id, saturated: false,
  ...(censored ? { censored: true } : {}),
  metrics: Gproved === undefined ? { U: p.length - clues.length } : { U: p.length - clues.length, Gproved },
}));
const capped = () => new IncompleteRatingError('the deduction path was capped', { nodes: 5, work: 7, stop: 'work-cap' });
/**
 * entries: a score (Gproved 1), [score, Gproved], [score, Gproved, true] (censored), 'capped', or an Error object
 * (thrown as it is); by number of clues; other counts [10, 1]
 */
const byCount = (table) => (_b, p, clues) => { /* look up table[clues.length] ?? [10, 1]; throw or return v3Rating */ };
/** the same entries by call order; the last entry repeats */
const bySequence = (list) => { /* a counter; list[Math.min(i, list.length - 1)] */ };
```

H = `level('hard')` (`{ min: 17, max: 25, share: 0.38 }`, initial clue count 5, centre 21, central [19, 23]);
N = `level('normal')` (initial count 6). Mode `any` unless stated. "Calls" are the calls of the seam in order, written
`<clued ids in layout order>:<score>/<Gproved>` or `:capped`; `*` marks a call followed by `onRate`.

| Case | Seam, target, mode, seed | Expected |
|---|---|---|
| S1 every subset refused | `byCount({ 5: [21, 0] })`, H, `refused-0` | `{ ok: false, reason: 'not-in-band' }`; 20 calls (4 in phase 1, which then stops because nothing counted below or above, and 16 in phase 2), all with 5 clues and pairwise distinct; `onRate` never called |
| S2 refused, then proved | `bySequence([[21, 0], [21, 1]])`, H, `refused-1` | calls `LPUVF:21/0 UTFZX:21/1*`; result clues `UTFZX`, score 21, certificate null |
| S2b a proved estimate stays eligible (FP10) | `bySequence([[21, 0], [21, 1, true]])`, H, `refused-1` | the same calls as S2; result `UTFZX`, score 21, and the result's rating has `censored: true` and `metrics.Gproved === 1` |
| S3 below Hard: Gproved 0 accepted | `bySequence([[14, 0]])`, N, `normal-0` | calls `YUTFWX:14/0*`; result `YUTFWX`, score 14 |
| S4 refused repair falls through | `byCount({ 5: [21, 1], 6: [21, 0], 7: [21, 0], 8: [21, 0], 9: [21, 0] })`, H, `require`, `repair-2` | calls `IYTZX:21/1* IYTWZX:21/0 YUVWZ:21/1*` (the middle one is the repair rating of `IYTZX`, refused); result `YUVWZ`, certificate `unique`, `certify(board, pieces, result.clues, ws, 10000).status` is `'unique'` |
| S5 unrateable, then proved | `bySequence(['capped', [21, 1]])`, H, `capped-1` | calls `ILYTZ:capped IVTZX:21/1*`; result `IVTZX` |
| S5b every subset unrateable | `byCount({ 5: 'capped' })`, H, `capped-0` | `{ ok: false, reason: 'not-in-band' }`; 20 calls, all with 5 clues and distinct; `onRate` never called |
| S5c unrateable below Hard | `bySequence(['capped', [14, 0]])`, N, `capped-2` | calls `IYPUTF:capped ILUVTW:14/0*`; result `ILUVTW` |
| S6 unrateable repair falls through | `byCount({ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' })`, H, `require`, `repair-2` | calls `IYTZX:21/1* IYTWZX:capped YUVWZ:21/1*`; result `YUVWZ`, certificate `unique` |
| S7 other errors propagate | a seam that throws `new RangeError('boom')`, H, `boom`; and one that throws `new UnsatisfiableError('x')` | `selectClues` throws that same error object |
| S7b another error at the repair propagates (FP10) | `byCount({ 5: [21, 1], 6: boom })` with `const boom = new RangeError('boom')` created once, H, `require`, `repair-2` | calls `IYTZX:21/1*`, then the repair rating of `IYTZX` (6 clues, `IYTWZX`) throws; `selectClues` throws exactly `boom` (`assert.throws(..., (e) => e === boom)`), not a failed-selection result |
| S8 spent profiles count for the stop at 48 | `byCount({ 5: [17, 1], 4: 'capped', 6: [30, 0] })`, H, `reserve-spent` | exactly 48 calls, every one a profile (no repair in `any` mode); the 48th call is `LNWZ:capped`; 17 calls followed by `onRate`; result `LYNWZ`, score 17 (all in-band ratings are 17, so the smallest clue key wins) |
| S9 no `Gproved` is never refused | `bySequence` of a v2-like rating `{ model: 'difficulty-v2', score: 21, metrics: { U } }` (no `Gproved`), H, `v2-0` | calls `IYUVX:21*`; result `IYUVX` |
| S10 the Hard edge | `bySequence([[23, 0]])`, target `{ min: 16, max: 30, share: 0.38 }`, `edge-16`; and `bySequence([[23, 0], [23, 1]])`, target `{ min: 17, max: 30, share: 0.38 }`, `edge-17` | min 16: calls `LYUFZ:23/0*`, result `LYUFZ`; min 17: calls `UVNFX:23/0 ILUVW:23/1*`, result `ILUVW` |

The ids depend on MP07's sampling being exactly as specified (MP07's own vectors pin it). A mismatch is reported with
the trace (check-list D11), never settled by changing a seed or a value.

## Files to create/modify

### Exclusive ownership

- `core/engine/difficulty.js` (the `IncompleteRatingError` class only), `core/engine/clues.js`,
  `core/engine/tasks.js` (`ERROR_CODES` and `errorReply` only).
- `tests/clues.test.js` (new cases only), `tests/tasks.test.js` (new cases only).
- `docs/design-detail.md` (the sections of the documentation slot).

Must not edit: any fixture, `rate`, `MODEL`, `measure`, `score`, `generate.js`, `deduce.js`, `policy.js`.

### Documentation slot (`docs/design-detail.md`)

- §4.2 `difficulty.js` block (line 486): add `export class IncompleteRatingError extends Error { code:
  'rating-incomplete'; reason: 'path-capped'; counters: { nodes, work, stop } }` with the comment "thrown by the v3
  rating when the deduction path is capped (§7.3); nothing throws it before the v3 activation".
- §6.10 (as rewritten by MP07): after the rating line, "an unrateable subset (`IncompleteRatingError`) and, for a target
  whose `min` is at least `bandEdge(3)` (Hard or above), a rating with `metrics.Gproved === 0` spend a profile and are
  neutral: not rated candidates, not below or above the band, no `onRate`; other errors propagate".
- §6.11 `require` bullet: a repair whose rating is unrateable or, for a Hard-or-above target, has `Gproved === 0`
  fails like an out-of-band repair, and the next candidate is tried.
- §7.6 item 3: "Hard or above also needs a proved decisive guess: a candidate whose rating has `Gproved === 0` is
  refused (AR1, §7.9). Ratings without `Gproved` (`difficulty-v2`) are never refused; imported puzzles and stored claims
  are not filtered."
- §8.1 protocol block (line 1759): the comment `// e.g. 'model-too-large'` becomes `// e.g. 'model-too-large';
  'rating-incomplete' when a rating's deduction path was capped`.
- §13.2 row `clues`: add "unrateable and refused subsets (spent, neutral) and repairs (fail), scripted through the
  `rate` seam".

## Implementation steps

1. `difficulty.js`: `IncompleteRatingError` after `UnsatisfiableError`.
2. `clues.js`: import `IncompleteRatingError` and `bandEdge`; `refuseUnproved`, `noProvedGuess`; the `rateSubset`,
   caller and `finish` changes above; update the JSDoc of `rateSubset` (`@returns {Candidate | 'spent' | null}`) and
   of `afterProfile` (`@param {Candidate | null} c`).
3. `tasks.js`: the error code and the `errorReply` branch.
4. Tests (test plan); documents.
5. `npm run test:quick` and `npm run check`.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09c-B01 | For a Hard-or-above target, a candidate without a proved decisive guess is never returned, at the subset or at the repaired rating, while a labelled estimate with a proved decisive guess stays eligible (AR1) | S1, S2, S2b, S4, S10 |
| MP09c-B02 | An unrateable candidate never fails a request: the search spends one rating on it and goes on | S5, S5b, S6, S8 |
| MP09c-B03 | Nothing changes below Hard, for v2 ratings, or for today's generated puzzles and fixtures | S3, S5c, S9; the unchanged quick set |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09c-T01 | `IncompleteRatingError` has `name`, `code: 'rating-incomplete'`, `reason: 'path-capped'` and an owned `counters` copy | unit test |
| MP09c-T02 | A spent subset counts as a profile (budget 64 and the stop at 48), is not in `rated`, is neutral for the count steering and for the beam, gets no `onRate`, and is never rated twice | S1, S5b, S8 |
| MP09c-T03 | A repaired rating that is unrateable or refused makes `finish` return null, memoised; the next candidate is tried | S4, S6 |
| MP09c-T04 | Only `IncompleteRatingError` is caught, at the subset and at the repair; every other error propagates as the same object | S7, S7b |
| MP09c-T05 | "Hard or above" is `target.min >= bandEdge(3)`; a rating without `metrics.Gproved` is never refused | S9, S10 |
| MP09c-T06 | `errorReply` maps the error to `code: 'rating-incomplete'` with its message | tasks test |
| MP09c-T07 | No existing test changes; `npm run test:quick` and `npm run check` pass; documents updated as listed | command output; review |

## Test plan

### Required test cases

- `tests/clues.test.js`: S1 to S10 of the table (with S2b, S5b, S5c and S7b), each as written (calls, `onRate`
  count, result); for S1 and S5b also that the 20 subsets are pairwise distinct.
- `tests/tasks.test.js`: `errorReply(7, new IncompleteRatingError('the deduction path was capped', { nodes: 5, work:
  7, stop: 'work-cap' }))` deep-equals `{ type: 'error', id: 7, code: 'rating-incomplete', message: 'the deduction
  path was capped' }`; the class fields of MP09c-T01 (a counters object passed in and changed afterwards does not change
  `error.counters`).

### Exact commands

```powershell
node --test tests\clues.test.js tests\tasks.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply lists the new tests and states that no existing test, fixture or output
  changed.
- Handoff to MP09d1 and MP09d2: `IncompleteRatingError` (constructor `(message, { nodes, work, stop })`), the `'spent'`
  return of `rateSubset` and the two refusal points; MP09d1's `measureV3` throws the error and MP09d2's tests reach
  these paths with the real rating. Handoff to MP14a: the points where the recorder events `unrateable` and `rejected`
  (`no-proved-guess`) and a refused repair (`accepted: false`, same reason) belong.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |

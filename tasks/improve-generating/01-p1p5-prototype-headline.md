# IGP-01 — PM3 prototype of P1 to P5 and the headline before/after

| Header | Value |
|---|---|
| ID | IGP-01 |
| Depends on | IGP-00 (accepted and committed) |
| Estimated size | Large: about 950 new lines (`ig-select-proto.js` about 480, `compare.mjs` 300, `verify.mjs` 110, `fit-prior.mjs` 80, self-test additions 130, small additions to `tree.mjs` and `ig-log.js`); about 3 to 4 hours of developer work; machine time about 62 minutes (high case 78; check-list §7) |
| Owner role | Measurement prototype |
| Confirms or refutes | report §2 rows 14x14, 15x15b10, 12x12 and 26x26 Nightmare, two Master cells, Hell 1 26x26 against the analysts' P1 to P5 scenario rows; completion of the failing Nightmare cells; the dead-end share; window profiles per call; batch waves (a proxy); locate profiles with the prior (check-list §5 R01 to R08, R10 to R13, R18, R19, R29) |
| Design refs | plan §3 P1 to P5; report §2 (the call model), §4, §6 item 4; `clarifications.md` IG-P-Q01 (certificate, re-rating), Q02 (whole response reported beside the budgets), Q03 (prior), Q05 (gates at four workers), Q06 (D21 line), Q07 (AR1 direction), Q09 (W values), Q10 (budgets per level); check-list §4 D-IG3 to D-IG7, D-IG12 |
| Label | provisional (pre-freeze); frozen re-run by check-list §6 |
| Implementation status | Not started |

## Goal & business context

The report's headline is that Nightmare on 196 to 324 cells gets much faster, mostly from P1 and P3 (bracketing the
count and reading a capped profile as "too few clues"), while 12x12 gains little and 26x26 is already near its start
count. This task builds the smallest prototype of P1 to P5 that runs inside real requests and measures it against
today's search on the same seeds on this machine: T1, T10, the whole response and completion, plus the per-call numbers
behind the model (dead-end entries, profiles per call by outcome, window profiles, re-ratings, work per accepted
puzzle). It is a prototype in a copy of the source, not `gen-v4`: the copy keeps `ALGO_ID` `gen-v3`, and nothing in
production changes.

## Scope

### In scope

- The prototype search `ig-select-proto.js` (copy-only) and the variants `p1p5` and `p1p5-main`.
- The P4 prior table `data/prior-v1.json` and its fitting script.
- `verify.mjs` (every accepted prototype rating against its canonical rating) and `compare.mjs` (paired comparison on
  matched cohorts).
- Additions: `paramFiles` in `lib/tree.mjs`; the logger API the prototype calls in `ig-log.js`; `self-test.mjs
  --proto`.
- The run plan `plans/IGP-01.json` and its records.

### Out of scope

- The W variants 95 M and 380 M on Nightmare, the arity-3 set stage, the window re-rating and the P5 budget analysis
  (IGP-03); P6 and eight workers (IGP-04); PM4's corpus (IGP-02); 16x16 and 15x20 Nightmare (later round).
- P5's enforced budgets and attempt limit, the per-set calibration prior, a lowered `N_screen` (check-list D-IG9).

## Repository rules

- The check-list §3 and §7 hold. Every timed or rating command runs through the runner under `Invoke-IgNode`. No git.
- The prototype lives only in `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js` and runs only in a
  tree. No production file is edited.

## Inputs & context

- Today's search, `core/engine/clues.js`: setup and the D21 counting rule (lines 207-247); `rateSubset` (250-288; AR1
  at 273-274); `finish`, `finishOnce`, `central`, `chooseBest`, `afterProfile` (289-415); phase 1 (429-464); phase 2,
  the dead end (466-475); `neighbours` and the beam (477-545); constants (60-68): `BEAM_WIDTH` 4, `STALL_LIMIT` 12,
  `SAMPLES_PER_COUNT` 4, `COUNT_CHANGES` 8, `MOVES_PER_MEMBER` 8, `CENTRE_RESERVE` 16; `BUDGETS.clueSubsets` 64.
- `core/engine/difficulty.js`: `measureV3` with `limits` (214), `rate` (325-334), `scoreV3` (140); `DEDUCE` (`work`
  760,000,000, `nodes` 30,000, `solutions` 8, `census` 80,000,000; `core/engine/policy.js:114-121`).
- The screen certificate (IG-P-Q01): with **only** `DEDUCE.work` lowered and every other limit unchanged, every
  main-phase check compares `work` with the same limit (`deduce.js:840, 1102, 1128, 1623`), work never decreases, and
  the census budget is relative (`workLimit = work + limits.census`, line 1747). So a screen run whose main work at the
  end (`metrics.work - metrics.censusWork`) is at most `W` took every branch the canonical run took, and its rating is
  the canonical rating. A run above `W` is screen-capped: never accepted.
- MP12b1 (`docs/difficulty-v3/landscape-v3-full/`, MP12a's `landscape-v3/r2/` for the reused cells): the measured
  "today" of report §2 and the seeds `landscape/<case>/<rep>`. The estimates to compare with are the analysts' P1 to P5
  scenario rows (check-list §5).

## Design

### 1. The prototype search (`ig-select-proto.js`)

`export function igSelectProto(ctx)`: the same contract as `selectClues` (`SelectContext` in, `SelectResult` out). It
copies today's helpers it needs (`bandDistance`, `ranked`, `noProvedGuess`, `sortLike`, the constants above, `finish`,
`finishOnce`, `central`, `chooseBest`, `afterProfile`, `neighbours`, `sample`) with a comment naming their lines in
`clues.js`, and imports `makeUnique` and `countRowLimit` from `./clues.js`. It draws randomness only from `ctx.rng`.

**Parameters** (from `IG` of `ig-params.js`): `W` (a map by level id with `default`), `U0` 8, `rerateMax` 4, `rerate`
`end`, `a3` false, `prior` (the table), `logAccepted` true. For a call, `W = IG.W[target.id] ?? IG.W.default`; with `W
>= DEDUCE.work` every rating is canonical. `rerateMax` is the call's **shared allowance** of canonical re-ratings: the
rescue of phase A, phase E and (in IGP-03's `rerate: 'window'` variant) the window re-rating all draw from it, each
taking at most what remains, so a call never makes more than four (D-IG7).

**Screened rating.** `screen(clues)`: `measureV3(board, pieces, clues, ws, { deduce: { ...DEDUCE, work: W }, dlx:
SCORE.caps })` and the rating built as `rate()` builds it (`rate()` itself when `W >= DEDUCE.work`). Test seams
(self-test only): `ctx.igScreen(clues, W)` and `ctx.igCanonical(clues)` replace the screened and the canonical rating;
`ctx.igPrior` (a number or null), when defined, replaces the table lookup.

**`probe(idx, phase)`** (replaces `rateSubset`): skipped (returns null, no profile) when `profiles >= limit`, the subset
was tried, or its clue key is excluded, exactly as today. Otherwise one screened rating through `recordRating` of
`ig-log.js` (so every probe is journaled), `profiles += 1`, and:

| Screen result | Kind | Direction | Candidate |
|---|---|---|---|
| `IncompleteRatingError` | `too-few` (`scap0`, or `capped` when `W >= DEDUCE.work`) | above (P3) | no |
| a rating with main work > `W` | `too-few` (`scap1` or `over`) | above (P3; IG-P-Q01: a screen-capped run steers only) | no |
| a rating refused by AR1 (Hard and above, `Gproved` 0) | `ar1`, `estimated` when the census is incomplete | the side of its score (IG-P-Q07 (b)); in band: `in-refused` | no; not in the stall count |
| any other rating (certified: canonical) | `rated` | below, in, above by its score | yes (`onRate`, `rated.push`) |

After each probe, `afterProfile(kind === 'rated' ? candidate : null)` exactly as today; a non-null return ends the call.

**Phase A: locate (P1 with the P4 prior), on one nested family.**

```text
igPhase('locate')
order = rng.shuffle(positions 0..K-1); fam(c) = order[0..c-1] sorted        # one nested family
prior = IG.prior["<target.id>@<area>"] ? clamp(round(share * K), 1, K - 2) : null
c0 = clamp(prior ?? K - U0, 1, K - 2); step0 = prior !== null ? 1 : U0
side(c): p = probe(fam(c)); if p is null: p = probe(sample(c)) once; if still null: SKIP
         (afterProfile as above; a final result returns at once)
s = side(c0)
IN or IN-REFUSED: hit = c0
BELOW: hiBelow = c0, step = step0; repeat:
         c = max(1, hiBelow - step); if c == hiBelow: noWindow = 'below-to-one'; stop
         s = side(c): IN/IN-REFUSED -> hit = c, stop; BELOW -> hiBelow = c, if c == 1: noWindow = 'below-to-one', stop;
         step *= 2; ABOVE -> loAbove = c, stop; SKIP -> stop
ABOVE: loAbove = c0, step = step0; repeat (towards more clues):
         c = min(K - 2, loAbove + step); if c == loAbove: noWindow = 'above-to-max'; stop
         s = side(c): IN/IN-REFUSED -> hit = c, stop; ABOVE -> loAbove = c, if c == K - 2: noWindow = 'above-to-max', stop;
         step *= 2; BELOW -> hiBelow = c, stop; SKIP -> stop
bisect while no hit and both known and hiBelow - loAbove > 1:
         mid = floor((loAbove + hiBelow) / 2); s = side(mid): IN/IN-REFUSED -> hit = mid; BELOW -> hiBelow = mid;
         ABOVE -> loAbove = mid; SKIP -> stop
```

- **Window count** `wc`: the hit; else, with both ends known, `hiBelow` when the `loAbove` probe was `too-few`, otherwise
  the end whose score is nearer the band centre; else the one known end; else `c0`.
- **No window and P5's fail-at-once.** A `below-to-one` verdict rests on certified ratings only (a below result is
  always a certified rating): it is **canonical**, and the call ends at once with `{ ok: false, reason: 'not-in-band'
  }`, journaled `result: 'no-window'`. An `above-to-max` verdict is canonical only when none of its above-side probes
  was screen-capped. Otherwise the call runs the **rescue**, once per call: `igPhase('rescue')`; the screen-capped locate
  probes, in phase E's order (distance to `wc`, then the higher count, then probe order), as many as the shared
  allowance leaves (at most `rerateMax`), are re-rated canonically through `recordRating` (outside the 64-profile limit;
  counted as re-ratings). Each rescued result takes its side as a probe does (§1 table: canonical `capped` is above,
  an AR1 refusal goes by its score, in band `in-refused`). Then, with the canonical results in place of the rescued
  screens:
  - a rescued result in band, eligible or refused: a window hit (the first one in rescue order sets `hit` and `wc`); an
    AR1-eligible in-band rating also becomes a candidate (`rated.push`, `afterProfile`; a final result returns), while
    an `in-refused` one is never a candidate, never accepted and not in the stall count (IG-P-Q07); the call continues
    at phase B from the hit (`noWindowProof: 'rescued-in'`);
  - else, a rescued result below the band (a rating or an AR1 refusal by its score): the bracket is rebuilt from every
    locate result (`hiBelow` = the smallest count with a below result; `loAbove` = the largest count under `hiBelow`
    with an above result, a screen-capped probe that was not rescued still counting as above); phase A resumes from
    that bracket (the bisection when both ends are known, else the BELOW march from `hiBelow` with step `step0`), with
    no second rescue; it ends as phase A ends (a hit, a window, or a canonical `below-to-one`; a new `above-to-max`
    cannot arise below `hiBelow`) (`noWindowProof: 'rebracketed'`);
  - else (every rescued result above the band: a rating, an AR1 refusal by its score, or canonically capped): the
    verdict stands and the call ends: `confirmed` when every screen-capped probe of the verdict was re-rated,
    `heuristic` when some were not (the allowance ran out). A `heuristic` end is an unverified stop: the comparison
    counts it apart and never calls it a no-window proof.

  The `end` line records `noWindowProof` (`canonical`, `confirmed`, `heuristic`, `rescued-in`, `rebracketed`; null when
  phase A found a window directly) and the rescue's re-rated counts with their canonical sides; the comparison reports
  each class per cell.

**Phase B: window (today's phase 1 with P3 and IG-P-Q07), from `wc`.** `igPhase('window')`; today's loop of lines
429-464 with `COUNT_CHANGES` and `SAMPLES_PER_COUNT`, where a probe counts for `above` when its direction is above
(`too-few` included: P3), for `below` when below (`ar1` by its score included), for neither when in band or skipped.
The count changes and the `countsTried` stop are today's.

**Phase C: today's phase 2,** unchanged except that it samples at `wc`, under `igPhase('p2')`. It runs when no rated
candidate exists (for example every probe was too few, refused by AR1, excluded or skipped); every entry is journaled
and reported as a dead-end entry. Its absence in the runs is a hypothesis to measure, not a requirement.

**Phase D: today's beam,** unchanged, under `igPhase('beam')`, with screened probes.

**Phase E: re-rating (IG-P-Q01), then the end.** When `chooseBest()` is null: `igPhase('rerate')`; take the `too-few`
probes that were screen-capped (`scap0`, `scap1`, `over`; not canonical `capped`) and not yet re-rated, ordered by
`|count - wc|` ascending, then by the higher count, then by probe order; for as many as the shared allowance leaves (at
most `rerateMax` in all, the rescue's re-ratings included), a canonical `rate()` through `recordRating` (outside the
64-profile limit; a capped or AR1-refused re-rating is skipped); a rated re-rating becomes a candidate through
`rated.push` and `afterProfile`; a final result returns. Then `chooseBest()`; else today's failure result.

**Logging.** `startCall(ctx)` (with `call.W`, `call.priorCount`), every rating through `recordRating`, every phase
entry through `igPhase`, and `endCall` with `call.locate = { c0, prior, probes, result: 'hit' | 'window' |
'below-to-one' | 'above-to-max' | 'skip', hit, hiBelow, loAbove, wc, noWindowProof, rescue: [{ count, side }] }`. With
`IG.logAccepted`, an ok result carries `accepted { boardRows, pieces, clues, rating }` for `verify.mjs`. IGP-00's
journal format stays valid; add only what the prototype needs.

### 2. Variants and the prior

- `lib/tree.mjs` gains `paramFiles` in manifests: `{ "prior": "data/prior-v1.json" }` puts the `cells` of that file
  under `params.prior` and the file into `treeId`.
- `variants/p1p5.json`: extends `log`; edits `p1p5-1` (`core/engine/clues.js`, find `import { igDispatch, igPhase }
  from './ig-log.js';\n`, replace it with itself followed by `import { igSelectProto } from './ig-select-proto.js';\n`)
  and `p1p5-2` (find `  return igDispatch(ctx, selectCluesV3);\n`, replace `  return igSelectProto(ctx);\n`); files
  `p1p5`; params `{ "logAccepted": true, "U0": 8, "rerateMax": 4, "rerate": "end", "a3": false, "W": { "default":
  190000000 } }`; `paramFiles { "prior": "data/prior-v1.json" }`.
- `variants/p1p5-main.json`: extends `p1p5`; params `{ "W": { "default": 190000000, "hell-1": 380000000, "hell-2":
  380000000, "hell-3": 380000000 } }` (D-IG5).
- `fit-prior.mjs` (unlocked; it reads MP12b1's reports, no rating) writes `tools/ig-proto/data/prior-v1.json`: for every
  MP12b1 report (both folders) with accepted puzzles, the runs with `rep` 10 to 19, the shares `clues / K` of their
  accepted puzzles (`details.puzzles[].clues`, `details.K`); per cell the `median` and n. Format: `{ version: 1, rule:
  'median clue share of the accepted puzzles of MP12b1 reps 10-19 (held out from the measured reps 0-9)', source: {
  sourceDigest, reports: [paths] }, cells: { '<levelId>@<area>': { caseId, share, n } } }`, CRLF. When the file exists,
  the script recomputes it and exits 1 if it differs; `--replace` rewrites it only on the pack author's instruction. For
  orientation (all reps): 14x14 Nightmare 0.190, 15x15b10 0.182, 12x12 0.211, 26x26 0.133, Hell 1 26x26 0.128, 14x14
  Master 0.222, 26x26 Master 0.189.

### 3. Verification of accepted ratings (`verify.mjs`)

`node tools\ig-proto\verify.mjs --task <T> --arm <A>[,<A2>...] --label <L>`: for each listed arm in turn, every journal
`end` line of the arm's shards with an `accepted` block (`tests/artifacts/ig-proto/<L>/<T>/<A>/*/logs/`); four lanes on
the `base` tree rate its clues canonically (`rate` jobs, admitted by the check-list §7 bound); the result must deep-equal
(`util.isDeepStrictEqual`, both sides parsed from JSON) the logged rating. One invocation can verify several arms (IGP-03
and IGP-04 verify theirs in one step). Resumable: a checkpoint `tests/artifacts/ig-proto/<L>/<T>/verify-<A>/
checkpoint.jsonl` per arm whose header holds the `base` tree's `treeId` and the harness hash (a mismatch exits 1), and a
`state.json` per step with `done`. Writes `docs/improve-generating/evidence/<L>/<T>/verify-<A>.json|md` per arm
(checked, equal, mismatches with the differing fields, per cell and stage) and exits 1 when any differs: a stop
(certificate failure).

### 4. Paired comparison (`compare.mjs`)

```text
node tools\ig-proto\compare.mjs --task <T> --pairs <before>:<after>[,...] --label <L> [--reference mp12b1]
```

It reads the published runs, shard files and call journals of the arms and MP12b1's reports, pairs **only seeds present
in both arms** (matched cohorts), and writes `docs/improve-generating/evidence/<L>/<T>/compare.json|md`. Definitions
(statistics by `summarize`, check-list §3):

| Quantity | Definition | §5 row |
|---|---|---|
| T1, T10, response | `firstReadyMs`, `tenthReadyMs` (requests that reached ten), `responseMs`; `summarize` per arm and case | R01-R08 |
| completion | requests with `acceptedCount` 10 / requests, always beside a time; censored rows (`censoredAtR`) counted apart | R03, R08 |
| paired ratio | per seed: before / after on T10 (both reached ten) and on response (all); median, min, max, n; a pair where the after arm delivered fewer puzzles is marked and never read as a gain | R02-R08 |
| drift | per seed of the `log` arm: response / MP12b1's response on the same seed; median | R01 |
| identity | the `log` arm against MP12b1 by the check-list §3 rule: puzzle identity by digest where the accepted counts are equal, otherwise metric-prefix agreement, named as such; required | R00 again |
| calls per stage | per stage (`set`, `batch`, `completion`): calls, ok calls, unfinished calls (with their unknown tails), profiles per call (median, p90 by `percentile(0.9)`, max), counts by outcome, ms and work per call (median, p90) | R12, R18 |
| dead-end share | calls with a `p2` phase entry / calls; Σ ms of `p2` tuples / Σ ms of all tuples, for the batch stage, the set stage and both | R10, R11 |
| start-count capped share | `before` arm: `p1` tuples at the call's `startCount` that are `capped` / all `p1` tuples at it | R29 |
| locate | prototype: results (`hit`, `window`, no-window sides, `skip`), the `noWindowProof` classes per cell (`heuristic` ends counted apart, never as proofs), the rescues and what they changed, and locate probes per call (median, p90) | R19 |
| window profiles | per ok call: prototype tuples of phases `window`, `p2`, `beam`, `rerate`; `before` arm: all tuples of the call; median | R12 |
| re-ratings | `rescue` and `rerate` tuples per call (mean, max) and their share of Σ ms and Σ work | R18 |
| work per accepted puzzle | per request: Σ work of the batch and completion calls / `acceptedCount` (and with the set stage), with the unfinished calls' unknown tails reported beside; median | R16 input |
| waves (proxy) | per request that reached ten: (T10 − T1) / the median ms of its ok batch calls; median. A proxy: it ignores layout work and counts speculative and rejected calls | R13 |
| set-stage share | per request that reached ten: T1 / T10; median (IG-P-Q02's reserve) | |

The Markdown gives, per cell: MP12b1 on the same seeds, the before arm, the after arm, the paired ratios and the
completion; then the per-stage tables; then the §5 values with their kind and formula. Every "after" value is labelled
*Measured, provisional*; every ratio *Derived*. The journal append count times the measured append cost is shown
beside the timings.

### 5. Cells, seeds and sample sizes (D-IG3, D-IG4, D-IG12)

Matched cohorts: both arms run the same seeds. Four workers throughout (IG-P-Q05).

| Shard | Cells and reps (both arms) | Row limit R | Rows per invocation | MP12b1 on these seeds |
|---|---|---:|---|---|
| fast | 26x26-nightmare 0-5, 14x14-master 0-4, 26x26-master 0-4 | 90 s | while elapsed ≤ 185 s | responses 142 s, 21 s, 54 s in total; all reached ten |
| 14x14-nightmare | 0-2 | 260 s | one | 156, 183, 46 s; one reached ten |
| 15x15b10-nightmare | 0-2 | 260 s | one | 71, 47, 186 s; two reached ten |
| 12x12-nightmare | 0-2 | 260 s | one | 73, 30, 58 s; all reached ten |
| 26x26-hell-1 | 0-2 | 260 s | one | 146, 168, 120 s; two reached ten |

A fast-shard row above 90 s is recorded as censored at 90 s (a finding). A slow-cell row cannot pass 260 s: the
application ends each action at 115 s.

## Files to create/modify

| File | Change |
|---|---|
| `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js` | new (copy-only) |
| `tools/ig-proto/variants/p1p5.json`, `p1p5-main.json` | new |
| `tools/ig-proto/fit-prior.mjs`, `data/prior-v1.json` | new |
| `tools/ig-proto/verify.mjs`, `compare.mjs` | new |
| `tools/ig-proto/plans/IGP-01.json` | new |
| `tools/ig-proto/lib/tree.mjs` | `paramFiles` |
| `tools/ig-proto/variants/files/log/core/engine/ig-log.js` | exports the prototype needs; the `c` flag (census R7 cuts); nothing else changes |
| `tools/ig-proto/self-test.mjs` | `--proto` cases; case 4 also checks `r7Cut` (main search) and `r7CutCensus` |
| `tools/ig-proto/run-task.ps1`, `variants/instr.json`, `lib/calls.mjs`, `lib/lanes.mjs` | the IGP-00 review fixes of step 0 only |
| `tools/ig-proto/README.md` | the prototype and the comparison; the IGP-00 review fixes (charging, test-only knobs, R7 fields) |
| `docs/improve-generating/evidence/provisional/IGP-01/` | new records |

## Implementation steps

0. The IGP-00 review fixes, before any locked invocation of this task (IGP-00 §3, §5, §8 as amended):
   - `run-task.ps1`: a failed invocation without a fresh state is charged the node seconds the lock helper printed
     (300 when killed, 0 when node never started), never the wall time;
   - `variants/instr.json` (instr-1, instr-3 to instr-6): R7 cuts counted apart by `inCensus` (`r7Cut` main search,
     `r7CutCensus` census); `ig-log.js` adds the `c` flag; `lib/calls.mjs` records `r7CutCensus`;
   - `lib/calls.mjs`: `recordedCall` throws on a tree whose chain includes `log`; `lib/lanes.mjs`: `setHorizon` keeps
     the smaller horizon;
   - README: the charging rule, the test-only knobs (`limits`, `testKinds`, `setHorizon`, `--only`), `invocations` and
     `--forecast-s` (dry run only), the R7 fields and the -1 sentinel.
1. `fit-prior.mjs` and `data/prior-v1.json`; `paramFiles`; the two manifests; `tree.mjs check-edits --all`.
2. `ig-select-proto.js` with its test seams; the `--proto` self-test cases.
3. `verify.mjs`, `compare.mjs`, the plan.
4. Run the plan; `npm run check`; the firewall check.

## Commands

The run plan `tools/ig-proto/plans/IGP-01.json` (allocation 62 minutes; the runner adds `--label` and
`--source-label`; arm steps are `tools/ig-proto/arm.mjs run --task IGP-01 ... --workers 4`):

| Step | Locked | Node arguments | projectS | State |
|---|---|---|---:|---|
| firewall-snapshot | no | `tools/ig-proto/firewall.mjs snapshot --task IGP-01` | | |
| fit-prior | no | `tools/ig-proto/fit-prior.mjs` | | |
| trees | no | `tools/ig-proto/lib/tree.mjs build base log p1p5-main` | | |
| self-test-proto | yes, once | `tools/ig-proto/self-test.mjs --proto` (IGP-00's cases 1 to 9 first, then the `--proto` cases, in one invocation) | 135 | `IGP-01/self-test/state.json` |
| before-fast | yes, until done | `--arm before --shard fast --variant log --cases 26x26-nightmare:0-5,14x14-master:0-4,26x26-master:0-4 --row-limit-s 90` | 330 | `IGP-01/before/fast/state.json` |
| after-fast | yes, until done | `--arm after --shard fast --variant p1p5-main --cases 26x26-nightmare:0-5,14x14-master:0-4,26x26-master:0-4 --row-limit-s 90` | 330 | `IGP-01/after/fast/state.json` |
| before-14x14, after-14x14 | yes, until done | `--arm before --shard 14x14-nightmare --variant log --cases 14x14-nightmare:0-2 --row-limit-s 260`; the same with `--arm after --variant p1p5-main` | 330 | `IGP-01/<arm>/14x14-nightmare/state.json` |
| before-15x15b10, after-15x15b10 | yes, until done | as 14x14 with `15x15b10-nightmare` | 330 | |
| before-12x12, after-12x12 | yes, until done | as 14x14 with `12x12-nightmare` | 330 | |
| before-hell1, after-hell1 | yes, until done | as 14x14 with `26x26-hell-1` | 330 | |
| verify-after | yes, until done | `tools/ig-proto/verify.mjs --task IGP-01 --arm after` | 330 | `IGP-01/verify-after/state.json` |
| publish-before, publish-after | no | `tools/ig-proto/arm.mjs publish --task IGP-01 --arm before` (and `after`) | | |
| compare | no | `tools/ig-proto/compare.mjs --task IGP-01 --pairs before:after --reference mp12b1` | | |
| firewall-check | no | `tools/ig-proto/firewall.mjs check --task IGP-01` | | |

```powershell
pwsh -NoProfile -File tools\ig-proto\run-task.ps1 -Plan tools\ig-proto\plans\IGP-01.json -Label provisional `
  -SourceLabel 'rating-v3 runtime cd5d17f (worktree 0e1283e)' `
  -LockHelper "$env:USERPROFILE\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ig-lock.ps1"
if ($LASTEXITCODE -ne 0) { throw "IGP-01 run plan stopped: exit $LASTEXITCODE" }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

Projection: before arm about 1,580 s of node time (MP12b1's responses on these seeds plus about 3 s per row), after arm
about 600 s if the scenario rows hold (about 1,500 s if the prototype gains nothing), verify about 120 s, self-test
about 90 s; about 30 locked commands, 22.5 minutes of quiet periods.

## Record formats

- Published arms (IGP-00's `publish`): `IGP-01/<arm>/<shard>.runs.json|md`, `.calls.jsonl`.
- `verify-after.json|md` (§3).
- `compare.json`: `{ meta, pairs: [{ before, after, cells: { '<case>': { mp12b1, before: { requests, reached, censored,
  t1, t10, response, stages }, after: { ... }, paired: { seeds: [...], t10Ratio, responseRatio, completion,
  fewerPuzzles }, drift, identity } } }], rows: { R01: { value, kind, formula }, ... }, journal: { appends, appendCostMs } }`;
  `compare.md` as §4.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| IGP-01-B01 | The headline rows have before/after numbers on matched seeds on this machine: 14x14, 15x15b10, 12x12 and 26x26 Nightmare, two Master cells, Hell 1 26x26 (T1, T10, response, completion, censoring) | `compare.md` |
| IGP-01-B02 | The multipliers behind them are measured: dead-end share and entries, window profiles, re-ratings, locate profiles and their no-window proofs, work per accepted puzzle with unfinished tails, waves (proxy), set-stage share | `compare.md` |
| IGP-01-B03 | Every number is labelled provisional (pre-freeze) and by kind; the §5 rows of this task have values | records; the reply |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| IGP-01-T01 | The prototype follows §1 (locate, no-window proof and rescue, window, phase C, beam, re-rating order, P5 fail-at-once only when canonical, AR1 direction, journaling); the `--proto` self-test passes | code review; self-test output |
| IGP-01-T02 | Every accepted prototype rating equals its canonical rating | `verify-after.md`: 0 mismatches |
| IGP-01-T03 | The `log` arm agrees with MP12b1 by the check-list §3 rule on every seed, with the level reached (puzzle identity or metric-prefix agreement) named per seed | `compare.md` identity |
| IGP-01-T04 | `data/prior-v1.json` uses only reps 10-19, records its source, and is reproduced by `fit-prior.mjs` | command output |
| IGP-01-T05 | Every locked command ran under the wrapper within its horizon; no started row was rerun; the budget guard was respected | `invocations.jsonl` |
| IGP-01-T06 | `npm run check` passes; the firewall check passes; records follow the check-list §3 | command output |

## Test plan

- `self-test.mjs --proto`, under the runner, with these cases:
  - P1, synthetic locate. A real set with K = 15: the first of the seeds `ig-selftest/proto/k15/0` to `/49` of
    `10x10-master` whose carved set has 15 pieces (the case fails if none has; the chosen seed is recorded).
    `ctx.igScreen` returns score `100 - 10 c` for `c` clues and throws `IncompleteRatingError` for `c <= 2`; a
    synthetic target with band [55, 70); synthetic ratings have main work 1 unit, `Gproved` 1 and a complete census
    unless the case needs otherwise; `ctx.igPrior` sets the prior. Cases:
    - no prior: probes at 7, 1 and 4; hit at 4;
    - prior 6: probes 6, 5, 3 and 4; hit at 4;
    - a probe whose screen rating has main work above `W` counts as above;
    - an AR1-refused probe with an in-band score is a hit for the window, never accepted;
    - all below down to 1: `no-window`, `below-to-one`, `noWindowProof: canonical`;
    - rescue, `confirmed`: every screen capped, canonical score 90 at every count; no prior: probes 7 and 13, rescue
      re-rates 13 then 7 (both above), the call ends `no-window` with `confirmed`;
    - rescue, `heuristic`: as above with prior 2: probes 2, 3, 5, 9 and 13; the rescue re-rates 13, 9, 5 and 3 (four,
      `rerateMax`), 2 stays unrescued, the call ends with `heuristic`;
    - rescue to below, `rebracketed`: every screen capped, canonical score `100 - 10 c`; no prior: probes 7 and 13, the
      rescue re-rates 13 then 7 (both below); phase A resumes with probes 1, 4, 5 and 6 in that order (all
      screen-capped), ends `window` with `hiBelow` 7, `loAbove` 6 and `wc` 7, and the call goes on to phase B;
    - rescue in band, `rescued-in`: every screen capped, canonical score 60 at 13 and 90 elsewhere; no prior: the rescue
      re-rates 13 first, it becomes a candidate, and the call continues from 13 (or returns it, if today's
      `afterProfile` finishes on it);
    - rescue in band but refused, `rescued-in`: as the case before, with `Gproved` 0 at 13 (an AR1 refusal in band; the
      synthetic band is above Hard's edge, so AR1 applies): 13 is a window hit, never a candidate (`rated` stays empty,
      nothing is accepted), the verdict is not `confirmed`, and the call continues at phase B from 13;
    - shared allowance: in the `rebracketed` case the rescue used two re-ratings, so a later phase E re-rates at most
      two more; in the `heuristic` case it used all four, so phase E re-rates none;
    - re-rating: with `wc` known, the screen-capped probes nearest `wc` come first (ties to the higher count, then probe
      order), at most four.
  - P2: on a real `10x10-hard` set with `W = DEDUCE.work`, the result's rating equals `rate()` of its clues; two runs
    give identical results and journals (the `at` fields aside).
  - P3: on a real `12x12-nightmare` set (seed `ig-selftest/proto/n`) with `W = 190 M`, every ok result's rating equals
    its canonical rating.
- The run plan's `verify-after` step (all accepted ratings).

## Definition of done & handoff

- Every criterion has its evidence; the reply gives the headline table (MP12b1, before, after, paired ratio,
  completion per cell), the multipliers, the counted machine time and the lock waits, and any named finding (for
  example a cell where the prototype is slower than today or delivers fewer puzzles).
- Handoff: to IGP-03 the prototype with its variant switches (`a3`, `rerate`, `W`); to IGP-04 the `p1p5-main` tree and
  the `log` arm; to IGP-07 `compare.json`.

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

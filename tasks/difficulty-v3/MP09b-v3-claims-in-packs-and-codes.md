# MP09b — v3 claims in packs and codes: strict v3 metrics, `censored`, the `Gproved` checks, v2 legacy, summary claims

| Header | Value |
|---|---|
| ID | MP09b |
| Depends on | MP09a2 (accepted and committed) |
| Estimated size | Medium: about 450–700 changed lines (pack.js about 150, puzzlecode.js about 20, tests about 250–450, documents about 40); about 40–60 minutes |
| Owner role | Engine |
| Milestone | M5 — v3 active |
| Design refs | `docs/difficulty-v3/report-detailed.md` RES-21 (pack reader and writer), RES-22 (puzzle codes), RES-04 (statuses, `solutions`, no v3 "+"), RES-05 (census), RES-19 (`MetricsV3`), RES-35 (`Gproved`); clarifications C1 (b) (owner), SA1-Q-P3 (b), part D items 3 and 6; cross-review FP04, FP06, FP07 (`docs/difficulty-v3/gpt-6-astra/6-review-of-task-pack.md`); check-list §4.1 (traceability only) |
| Gates owned | none (GC-P2 runs in MP09e) |
| Implementation status | Not started |

## Goal & business context

From MP09d2 on, every rating the apps compute is a `difficulty-v3` rating with its measured metrics. Packs must store
such a claim exactly and refuse an inconsistent one; puzzle codes must stay short, so they carry only a **summary**
of a v3 claim (model, score, level), while packs keep the full metrics. An estimate (an unfinished census) must stay
visible wherever the claim travels: the owner decided (C1 (b)) that such a claim carries `censored: true`, in packs
and in the summary of a code. Old `difficulty-v2` claims become legacy claims that are kept and shown as they are,
never reinterpreted.

This task prepares the format before the switch: the pack reader and writer learn v3 claims, the encoder writes
summary claims, and v2 claims are read as legacy. Ratings are still v2 until MP09d2, so every existing pack, link and
code keeps opening exactly as before.

## Scope

### In scope

- `core/engine/pack.js`: `RATING_V3_FIELDS`, `METRICS_V3_FIELDS`, `readMetricsV3` with every cross-field check,
  `readRating` (v3 current, v2 legacy), `ratingClaim` (v3 metrics in fixed order, `censored` only when true).
- `core/engine/puzzlecode.js`: the summary claim of a v3 rating in `partsFromSnapshot` (every encoder path).
- Tests in `tests/pack.test.js` and `tests/puzzlecode.test.js`; design §5.2, §5.3, §9.8; `docs/design-brief.md`.

### Out of scope

- Computing v3 ratings and `MODEL` (MP09d1, MP09d2); `IncompleteRatingError` (MP09c); the derived display rating and the
  estimate note in the apps (MP10b); the code size matrix and the browser pages (gate GC-P2 in MP09e).
- `core/engine/protocol.js`: no change (it already passes bounded plain claim metrics; MP09d1 adds the protocol
  round-trip tests). The frozen v1 codec (`puzzlecode-v1.js`) and its goldens: no change.

## Repository rules

- Read `AGENTS.md` and `tasks/difficulty-v3/check-list.md` §3 first.
- Engine purity; none of the words `LIMITS`, `QUALIFICATION`, `enabledMaxActive`, `deriveLimits` in `pack.js` or
  `puzzlecode.js`.
- UTF-8 without BOM, CRLF, final newline, no trailing whitespace; no test name containing `slow`.
- Run only the commands of the test plan; never stage, commit, stash, reset, push or switch branches; never edit
  `tasks/difficulty-v3/`, the reports or `tests/fixtures/puzzlecode-v1.json`.

## Inputs & context

### Current reader and writer (anchors at HEAD `7004175`; find moved lines by the quoted text)

- `core/engine/pack.js`: constants 40-41 (`MAX_CLAIM_METRICS_BYTES = 4096`, `CLAIM_JSON_DEPTH = 8`), `STOPS` (47:
  `'solution', 'branch-cap', 'row-cap'`), `RATING_V2_FIELDS` and `RATING_CLAIM_FIELDS` (56-57), `METRICS_FIELDS` (58);
  `readMetricsV2(ctx, v, path)` (734-764; `isCount`, `isScore`, `fail(ctx, 'rating-invalid', ...)`);
  `readRating(ctx, v, path)` (774-838: `const current = ownValue(v, 'model') === 'difficulty-v2';` selects strict
  reading; other models get basic fields and opaque bounded metrics, `copyJson(..., CLAIM_JSON_DEPTH,
  MAX_JSON_NODES)`, the 4,096-byte check, and an `unsupported-model` warning except for `difficulty-v1`);
  `ratingClaim(r)` (1193-1211; v2 metrics in fixed order, other models `copyClaimJson`).
- `core/engine/puzzlecode.js` `partsFromSnapshot(snapshot)` (163-199): builds a pack with `createPack`, validates it,
  returns the parts with `rating: puzzle.rating ?? null`. The frozen v1 codec writes a v2 claim compactly when it can
  be rebuilt and any other claim as JSON text in the field order `model`, `score`, `level`, `saturated`, `censored`,
  `metrics` (`tests/puzzlecode.test.js:710-714`). The apps' `puzzleSnapshot` (`core/browser/puzzle-snapshot.js:111`)
  and the CLI both end in this encoder.

### `MetricsV3` (RES-19; the order is the write order)

`U`, `R`, `H`, `B`, `branchTrials`, `rowTrials`, `dlxStop`, `searchStop`, `F`, `E`, `rules`, `deductionTier`,
`tier`, `G`, `info`, `Cmax`, `Dmax`, `Gt`, `nodes`, `work`, `S`, `solutionLimit`, `solutions`, `censusComplete`,
`censusUndecided`, `censusNodes`, `censusWork`, `Gproved` (28 fields, all required).

| Check | Rule |
|---|---|
| Counts | non-negative safe integers (`isCount`): `U`, `R`, `B`, `branchTrials`, `rowTrials`, `F`, `E`, `G`, `Cmax`, `Dmax`, `Gt`, `nodes`, `work`, `S`, `solutionLimit`, `censusUndecided`, `censusNodes`, `censusWork`, `Gproved`, and each of `rules.R1` to `rules.R9` |
| Numbers | finite and >= 0 (`isScore`): `H`, `info` |
| Enums | `dlxStop` in `STOPS`; `searchStop` in `exhausted`, `solution-limit`, `node-cap`, `work-cap`; `solutions` in `unique`, `few`, `many`, `unknown`; `deductionTier` an integer 0-3; `tier` an integer 0-4; `censusComplete` a boolean |
| `rules` | a plain object with exactly the keys `R1` to `R9` (an extra or missing key is invalid) |
| Limit | `solutionLimit >= 2`; `1 <= S <= solutionLimit` (a rated puzzle has a first solution) |
| Valid tuple | G = 0 implies info = 0, Cmax = 0 and Dmax = 0; G > 0 implies info > 0 and Cmax >= 2 |
| Tiers | `deductionTier` = 3 if R7 + R8 + R9 > 0, else 2 if R4 + R5 + R6 > 0, else 1 if R1 + R2 + R3 > 0, else 0; `tier = G > 0 ? 4 : deductionTier` |
| Sums | `F = R1 + R2 + R3`; `E = R6` |
| Count status | `solutions` equals the value derived by RES-04: `S >= solutionLimit` gives `many`; else with `searchStop === 'exhausted'`: S = 1 `unique`, S >= 2 `few`; else (a cap stopped the count): S <= 1 `unknown`, S >= 2 `few` |
| Census | `censusComplete` iff `censusUndecided === 0`; `censusNodes <= nodes`; `censusWork <= work` |
| `Gproved` (RES-35) | `Gproved <= G`; `Gproved === G` when `censusComplete` |

Any failure is `fail(ctx, 'rating-invalid', <path of the field>, <message>)` and rejects the metrics like an invalid v2
field today. Check the single fields first; run the cross-field checks only when every single field is valid (one
issue per failed cross-field rule, at the path of its first field).

### The v3 claim (RES-21, C1 (b))

- `RATING_V3_FIELDS`: `model`, `score`, `level`, `saturated`, `censored`, `metrics`. Required: `model`, `score`,
  `level`, `saturated`; `metrics` optional (a summary claim from a code); present metrics are read strictly with
  `readMetricsV3` and must also meet the generic bound (at most 4,096 UTF-8 bytes of JSON and depth 8).
- `saturated` must be `false` (no v3 "+", RES-04): `saturated: true` on a v3 claim is `rating-invalid`.
- `censored`: optional boolean. With metrics, `Boolean(censored)` must equal `!metrics.censusComplete` (a mismatch is
  `rating-invalid`); a summary claim (no metrics) may carry it alone.
- `difficulty-v2` becomes a **legacy** model, read like `difficulty-v1` today: basic fields, metrics as opaque bounded
  JSON, no `unsupported-model` warning. Other models are unchanged (warned, kept, not used).
- Writer `ratingClaim`: a v3 claim is written as `model`, `score`, `level`, `saturated`, then `censored: true` only
  when the claim's `censored` is `true` (never `censored: false`), then `metrics` in the fixed `MetricsV3` order (with
  `rules` in R1-R9 order) when present; a claim without metrics stays without metrics (never zeros).
- Writer for `difficulty-v2` claims (FP04): when the claim's `metrics` is a plain object whose own keys are exactly
  the seven v2 keys `U`, `B`, `branchTrials`, `rowTrials`, `stop`, `R`, `H` (in any order), write them in that fixed
  order as today, from a detached copy (`copyClaimJson`), so that packs written from v2 ratings until MP09d2 stay
  byte-identical to today. Any other v2 metrics (an extra key, a missing key, nested values under other keys, or a
  value that is not a plain object) are written with the same detached bounded-JSON copy as a legacy `difficulty-v1`
  claim (`copyClaimJson(r.metrics)`, keys in their stored order): every admitted key and value is kept, no missing
  field is invented and no extension is dropped. The key-shape test only chooses the writer path; it never brings
  back strict reading of legacy claims. Today's writer (`pack.js:1202-1207`) copies only the seven keys for every v2
  claim: with the legacy reader that would silently drop data (SA2's probe: metrics
  `{ "oldCounter": 7, "nested": { "note": "keep" } }` were written as `{}`).

### Summary claims in codes (RES-22; SA1-Q-P3 (b), plan author)

In `partsFromSnapshot`, after the pack check, a `difficulty-v3` rating becomes
`{ model, score, level, saturated: false }` plus `censored: true` when the full claim has `censored: true`; every
other rating is passed unchanged. The frozen codec then writes it as JSON text. No codec version, no change of the
frozen v1 maths or of `ratingJsonBytes` (8,192). A decoded summary claim is validated by the pack reader (v3 without
metrics) and shown as it is; missing metrics are absent evidence, never zeros. v2 claims keep the compact v2 form and
the v2 goldens stay unchanged.

### Test literals (valid by every rule above)

```js
const V3_METRICS = {
  U: 7, R: 35, H: 3.5, B: 12, branchTrials: 12, rowTrials: 40, dlxStop: 'solution', searchStop: 'exhausted',
  F: 4, E: 0, rules: { R1: 3, R2: 1, R3: 0, R4: 2, R5: 0, R6: 0, R7: 0, R8: 58, R9: 0 }, deductionTier: 3, tier: 4,
  G: 2, info: 3.321928094887362, Cmax: 5, Dmax: 2, Gt: 2, nodes: 8, work: 123456, S: 1, solutionLimit: 8,
  solutions: 'unique', censusComplete: true, censusUndecided: 0, censusNodes: 0, censusWork: 0, Gproved: 2,
};
const V3_CLAIM = { model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, metrics: V3_METRICS };
// an estimate: the census did not finish
const V3_ESTIMATE = { model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, censored: true,
  metrics: { ...V3_METRICS, S: 8, searchStop: 'solution-limit', solutions: 'many', censusComplete: false,
    censusUndecided: 3, nodes: 18, censusNodes: 10, censusWork: 5000, Gproved: 1 } };
```

(The score and level are not checked against the metrics: a claim is not re-rated.)

## Files to create/modify

### Exclusive ownership

- `core/engine/pack.js` (rating claims only), `core/engine/puzzlecode.js` (`partsFromSnapshot` only).
- `tests/pack.test.js`, `tests/puzzlecode.test.js`.
- `docs/design-detail.md` §5.2, §5.3, §9.8; `docs/design-brief.md` (the puzzle-code paragraph only).

### Documentation slot

- §5.2 (pack document): the v3 rating claim (fields, `saturated: false`, optional `censored: true`, optional metrics)
  and the `MetricsV3` fields in write order; `difficulty-v2` and `difficulty-v1` are legacy claims kept as they are.
- §5.3 item 9 "Claims": the strict v3 reading with the cross-field checks of the table above (as a compact list),
  the `censored` rule, the 4,096-byte and depth-8 bound, legacy and foreign models.
- §9.8 (puzzle code): a v3 rating travels as a summary claim (model, score, level, `saturated: false`, and
  `censored: true` for an estimate); the full metrics stay in packs.
- `docs/design-brief.md` (FP07), section "Limits, waiting, and sharing", paragraph "A puzzle code rebuilds one puzzle
  exactly": the core holds "the level, score and uniqueness claims"; add that for a rating of the new model the code
  carries only its summary (level, score and, when the rating is an estimate, the estimate mark), while a pack keeps
  the full measurement, and that older ratings travel and are kept exactly as they were. Do not describe how the apps
  show an estimate (MP10b).

## Implementation steps

1. `readMetricsV3` with the single-field and cross-field checks.
2. `readRating`: v3 current (strict), v2 legacy; the `saturated` and `censored` rules.
3. `ratingClaim`: the v3 write order and the `censored` rule.
4. `partsFromSnapshot`: the summary claim.
5. Tests (test plan); documents; run the test plan.

## Acceptance criteria — Business

| ID | Criterion | Evidence |
|---|---|---|
| MP09b-B01 | A pack keeps a v3 claim with its full metrics exactly and refuses an inconsistent one | pack tests |
| MP09b-B02 | An estimate stays marked: `censored: true` travels in packs and in the summary of a code, and a claim that hides or invents it is refused (C1 (b)) | pack and code tests |
| MP09b-B03 | Every existing pack, link and code opens exactly as before (v2 claims as legacy; goldens unchanged), and a legacy claim is written back with every field it was read with | existing tests; goldens; legacy writer tests |

## Acceptance criteria — Technical

| ID | Criterion | Evidence |
|---|---|---|
| MP09b-T01 | Every rule of the table is enforced (one valid and one invalid case each) | pack tests |
| MP09b-T02 | `saturated: true` and a `censored` mismatch on a v3 claim are `rating-invalid`; a summary claim with `censored: true` is read | pack tests |
| MP09b-T03 | A v3 claim round-trips through `createPack`/`serializePack`/`parsePack` byte-identically, metrics in the fixed order; a v2 pack written from v2 ratings is byte-identical to today | pack tests |
| MP09b-T04 | Codes carry the summary claim (JSON text order `model`, `score`, `level`, `saturated`, `censored`); a hand-made code with a full v3 claim is read strictly | code tests |
| MP09b-T05 | The v2 writer keeps the fixed seven-key order for exactly seven-key v2 metrics and writes any other v2 metrics as a detached bounded-JSON copy: the extra-key, missing-key and nested round trips keep every key and value in order through `createPack` and `serializePack` (FP04) | pack tests |
| MP09b-T06 | `docs/design-detail.md` §5.2, §5.3, §9.8 and `docs/design-brief.md` state the summary claims, the full metrics in packs, the estimate mark and the unchanged legacy claims (FP07) | review |
| MP09b-T07 | The targeted run (without the slow sweeps), `npm run test:quick` and `npm run check` pass; v2 goldens unchanged | command output |

## Test plan

### Required test cases

| File | Cases |
|---|---|
| `tests/pack.test.js` | legacy v2 writer (FP04): read, `createPack`, `serializePack` and read again keep, key for key and in their order, v2 metrics with an extra key (the seven keys plus `oldCounter: 7`), with missing keys (`{ U: 5, B: 3 }`) and nested opaque metrics (`{ oldCounter: 7, nested: { note: 'keep' } }`), through both writer paths (`createPack` and `serializePack`); ordinary seven-key v2 metrics given in another key order are written in the fixed order, and `tests/fixtures/generated-sample-pack.json` re-serialises byte-identically; v3 round trip (`V3_CLAIM` and `V3_ESTIMATE`, byte-identical rewrite); v3 without metrics; an unknown field in the claim and in the metrics; a missing metrics field; a negative and a non-integer counter; a non-finite `info`; each enum violation; `rules` with an extra and with a missing key; every cross-field rule of the table (a valid and an invalid tuple each); `saturated: true` refused; `censored: true` with a complete census, and no `censored` with an incomplete one, refused; `censored: false` with a complete census read, and written back without `censored`; a summary claim with `censored: true` read; `Gproved > G` refused; `Gproved < G` with a complete census refused; the generic 4,096/4,097-byte boundary with an opaque legacy or foreign claim, and a strict v3 metrics object with large legal values well under the bound (no padding field); depth 9 refused for a foreign claim; `difficulty-v2` read as legacy without warning (the strict v2 cases of "current ratings are checked strictly", line 481, become legacy cases: a v2 claim with invalid v2 metrics is now kept as opaque metrics; the `createPack` case at 626-640 keeps its v2 claim); `omitSolutions` (594) keeps v3 claims unchanged |
| `tests/puzzlecode.test.js` | a v3 snapshot encodes to a summary claim (decoded claim equals `{ model, score, level, saturated: false }`); with `censored: true` the summary keeps it; the JSON text order; a hand-made code (built with the bit writer like the existing JSON-text rating cases) carrying a full valid v3 claim decodes with its metrics, and one with an invalid tuple is refused (`invalid`); v2 snapshots still use the compact form; the goldens are unchanged |

### Exact commands

The targeted run skips the `slow:` sweeps of `tests/puzzlecode.test.js` (FP06); they run in MP09d2's gate GA-P2.

```powershell
node --test --test-skip-pattern=slow tests\pack.test.js tests\puzzlecode.test.js
if ($LASTEXITCODE -ne 0) { throw 'targeted tests failed' }
npm run test:quick
if ($LASTEXITCODE -ne 0) { throw 'quick set failed' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'repository check failed' }
```

## Definition of done & handoff

- Every criterion has its evidence; the reply lists every existing test whose expectation changed and why.
- Handoff to MP09d1 and MP09d2: the reader accepts what `rate` will produce (full v3 metrics in the `MetricsV3` order,
  `censored` only when true); the summary rule; for MP10b: a summary claim has no metrics (the estimate note without n).

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

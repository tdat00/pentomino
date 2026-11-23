# SA-Astra: S01 reading review

Date: 2026-11-24. Base named by the draft: `dd38457`; records read uncommitted.

**The numbers, W1/W2's no-change decisions and the proposed S06 sentence are agreed.**
Two narrow corrections are requested before finalizing the reading: distinguish recorded
work prefixes from consumed-work totals, and explicitly close a small input-index omission.
Neither correction changes a frozen value, needs a new measured run or asks the owner a question.

## Verified independently

- Exactly 40 declared rows, eight cells, five unique reps 0-4 per cell. Every publication,
  raw shard, row header and baseline pair has the right identity; every after and baseline
  run is valid under the frozen schema (baseline sampling errors removed as the rule requires).
- All 40 after requests reached ten; baseline 20x20 rep 1 is a valid measured non-completion,
  not a censored or invalid input. All preview ratios, geometric means and bootstrap lower
  bounds reproduce from the published and baseline runs, independently of the preview record.
- All 40 row ledgers close, with no identity, parsing, linkage or prefix problem. All 863
  calls are clear against 10 G; no four-attempt bound fires.
- 32x15: geo 0.991, lower 0.813, log-sd 0.407; the stated descriptive normal approximation
  needs about 1.011 at 20 seeds. It is not a forecast or a replacement for validation.
- Carried 26x26: geo 1.122, lower 0.881, log-sd 0.444, corresponding approximation 1.022.
- All other table values reproduce, including the capped baseline times, per-cell work-prefix
  maxima, 19.7-second longest set stage and 38.7-second longest response.
- Eight successful, done, non-killed invocations: 833.444 counted seconds.
  The account is 186.225933 counted minutes, correctly reported as 186.2 of 749.
- The stored input indices have 17 and 334 unique entries; every indexed hash matches.

I agree with decision **(a)** for W1 and W2 under the owner's delegation. No supported change
to the current configuration follows from these five fitting pairs. Validation must retain
the existing per-control completion and 0.9 no-regression gates; no failure is excused by this
reading. I also agree with the exact S06 STOP 2 addition in section 6: remind the owner of the
32x15/26x26 risk before approving the long run, without discarding other measured verdicts.

## 1. Qualify the work statements: 183 calls have an unreported final primitive

**Evidence:** `verdicts.mjs:684-690,802-815` defines a complete ledger as a proved work interval,
not necessarily an ended call. The raw S01 journals contain **863 calls: 680 ended, 183 closed
by confirmed worker termination, all 183 with one open primitive**. Their consumed work in that
primitive is bounded but not measured exactly. The new review JSON records these counts and
each row's interval. This is expected cancellation, not a censored request or an evidence gap.

The draft's numerical `maxSpent` values are correct, but "no call reached 10 G" and "the most
work one selection call spent" overstate what those values measure. P5 tests work between
primitives (`fit-read.mjs:229-237`), so the conclusion that its check would not fire is unchanged.

**Exact changes to `s01-reading.md`:**

1. In Summary item 2, replace `no call reached 10 G` with
   `no recorded completed-primitive prefix reached 10 G`.
2. Replace section 3's first bullet with:

   > **Calls:** `affected` and `potentially affected` are against 10 G (the frozen `any`
   > budget for Nightmare). "Largest logged prefix" is the largest sum of completed
   > rating/count primitives recorded for one call, in units of 10^9; it is not an upper
   > bound on consumed work in an unfinished primitive. Of 863 calls, 680 ended and 183
   > were closed by confirmed worker termination with one open primitive. Their row ledgers
   > are complete as work intervals. Every recorded prefix stays below 10 G, so no
   > between-primitive P5 stop is indicated; these cancellations are not ambiguous or
   > censored request inputs.

3. Rename the table column `Largest call` to `Largest logged prefix`; keep all numbers.
4. Replace the P5 bullet immediately below that table with:

   > P5's 10 G: no recorded primitive-boundary check reaches it; the largest completed-
   > primitive sum for a call is 6.65 G. This is a prefix result, not a claim that every
   > terminated call's total consumed work is known to be below 10 G.

The time-limit and four-attempt conclusions, and the separately marked assumption about
the future frozen arm's identical behavior, remain unchanged.

## 2. Record and close the eight omitted publication-metadata inputs

**Evidence:** `arm.mjs:254-263`'s `publicationOf` reads each `<shard>.runs.md` to identify its
published journal. `fit-read.mjs:728-740` calls it without registering that Markdown input
with `addInput`. None of the eight files appears in the prefixes record's 334-entry index.
The files are all present and parse as expected, and all eight referenced published journals
are present. This does not invalidate any measured row or change the numeric warning.

The reviewer has read and hashed the eight metadata files and their referenced journals.
The review JSON's **`publicationInputs`** array binds the eight omitted metadata files with
the harness's normal `sha256` convention. This supplements the written-once record; it does
not modify or relabel that record.

**Replace section 4's paragraph beginning `The preview's 40 pairs` with:**

> The preview's 40 pairs all hold a ratio. The stored input indices have 17 files for the
> preview and 334 for the prefixes; every indexed hash verifies. The prefixes reader also
> reads the eight publication `.runs.md` files through `publicationOf`, but omitted those
> files from its index. All eight and their referenced published journals are present.
> SA-Astra's `evidence/sa-astra/s01-review-checks.json`, field `publicationInputs`, binds
> the omitted metadata. W3 below records this provenance correction; no measured input is
> missing and neither existing fitting record is rewritten.

**Add after W2, before `Not warnings`, this proposed joint ruling:**

> ### W3: the prefixes input index omitted eight publication-metadata files
>
> **Facts [V]:** `publicationOf` reads the eight `.runs.md` files, but the prefixes reader
> did not register them. They and their referenced journals are present; the review's
> supplementary `publicationInputs` index now binds the eight metadata files. All numeric,
> identity and ledger checks still pass.
>
> **Decision (joint, under the owner's delegation): (a) no configuration change.**
> Accept S01's reading with the supplementary index; preserve both original written-once
> fitting records. Correct the reader's input registration before the next prefixes
> record is produced, and carry the supplementary index into the freeze. This is an
> in-scope provenance repair, not another pilot or an owner question.

Consequential wording: Summary item 4 should start `One performance warning` rather than
`One warning`; add `The separate metadata-index omission is closed by W3 without another run.`
at its end.

**Concrete follow-up for the pack author, within this ruling:**

- In `prefixesCommand`, register the existing
  `join(ctx.runsDir, \`${shard}.runs.md\`)` with `addInput` before calling `publicationOf`;
  extend the existing clean prefixes fixture to require its `runs.md` hash in `inputs`.
  No engine run is needed for this correction; do not regenerate S01's records.
- T12a's `FIT_INDICES` must also contain:

  ```js
  { path: 'docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.json',
    field: 'publicationInputs', key: 'sha256' },
  ```

  Add `docs/improve-generating-stages-2-4/evidence/sa-astra/s01-review-checks.mjs`
  to `FIT_INPUTS`. Select only `publicationInputs` from the review JSON for this supplement,
  not its broader review-snapshot `inputs`, which deliberately also records mutable draft
  and harness sources at the review epoch.

This repair may follow S01; it does not require holding the P7 work or revisiting the approved
pilot. The reading needs the explicit ruling and supplemental provenance before sign-off.

## Evidence and validation

```powershell
node docs\improve-generating-stages-2-4\evidence\sa-astra\s01-review-checks.mjs --label frozen
npm run check
```

- `evidence\sa-astra\s01-review-checks.mjs|json`: declared-row, baseline and raw-identity
  checks; journal/linkage and prefix recomputation; an independent implementation of the
  10,000-resample/20261116 bootstrap; comparison with both fitting records and the author's
  reported numbers; the run account; supplementary metadata hashes; every reviewed input.
- `evidence\sa-astra\s01-review-validation.txt`: command results, formatting and unchanged-input
  verification.

Only existing records were read. No rating, search, generation, replay, tree build, locked or
timed command, git command or modification of an existing record was performed.

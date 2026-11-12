# Rating v3: SA2's check of the final Pentomino report

Date: 2026-11-12. Code baseline: `77e62cb`; original clarification answers: `04e7e90`.
Checked the complete detailed report, brief, answers and part E, plus the subsequently appended part F.
Report line references below precede the co-signature-only change-log row added with this check.
No tests, generation probes or application-code changes.

## Verdict

**Signed subject to FC01-FC04.** The selected design is reflected correctly; four specifications or
claims need the precise corrections below before task-pack preparation.

- All **25 original clarification questions** appear in the answer traceability table.
- There are **34 resolutions and 17 task rows**. MP04b and shape-group quotienting are no longer active;
  RES-34 belongs to MP09, with the direct-engine twin-input exemption retained.
- No uppercase pending marker remains in either report. Original unselected alternatives are historical
  or explicitly rejected, except the stale queueing permission identified in FC02.
- The formula/ranges, capped-path error, decisive-census estimate, legacy display scope, provenance
  records, cost/fit order and gate ownership agree with the answers. The brief otherwise matches.
- C1-C5 are still acceptance questions, not answers already given in part E. My recommendations are
  below; this signature does not adopt them on the owner's behalf.

## Required corrections

### FC01 — Do not promise a proved decisive guess for an estimated rating

Locations: `docs/difficulty-v3/report-brief.md:35-39,46`;
`docs/difficulty-v3/report-detailed.md:64-69,188-191,453-456` (summary, theorem and RES-09).

RES-05 correctly counts an undecided alternative as failing for the upper estimate. A census node
`{c:2, kLow:1, f:0, u:1}` contributes G=1 and info=1 although no failure has been proved; the other
alternative may eventually prove solvable. Thus the brief's “Hard and above always need at least one
real guess” is not guaranteed by the chosen policy.

Replace that sentence with:

> Hard and above have at least one counted choice under this model. With a complete census that
> choice is proved decisive; with an incomplete census the score is an upper estimate, not proof
> that a decisive choice was necessary.

Qualify the summary/theorem's “counts only when an alternative is proved to fail” with “with a complete
census”. In RES-09 replace “a swap of twins can count as a guess and double S” with:

> Twin swaps remain distinct in raw `choices` and labelled S. A node proved free contributes zero
> to decisive G/info; an unfinished census follows RES-05's estimate rule.

This changes no formula or owner decision; it keeps raw branches, decisive counts and estimates distinct.

### FC02 — Complete the auxiliary-request contract for a fresh or timed-out client

Location: `docs/difficulty-v3/report-detailed.md:1076-1089`, RES-29; MP10 and its tests.

The sentence “a new generation may supersede or queue it” leaves an unchosen policy active:
JR-P4 (a) requires abortion when a new generation or verification starts. Also, “under the client's
current valid token without `beginRequest`” is incomplete when no token exists.
`core/browser/worker-pool.js:512-537` rejects an idle task with no matching current request or a timed-out
request. `core/browser/generation-client.js:428-446` starts with no job/token; a stored Player solution
bypasses verification (`player/state.js:584-587`), so the first display re-rating can encounter this case.

Replace the queueing permission and extend the mechanism with:

> A new generation or verification aborts both waiting and running auxiliary requests. Reuse an
> existing valid token when possible. On a fresh or timed-out client, bootstrap/renew an idle-only
> request context through the same monotonic request-id allocator, only when no active main request
> or other work would be cancelled. Then submit through `runIdle`. An auxiliary submission never
> replaces a context that still owns generation, verification, hints or certificates.

The bootstrap may use `beginRequest` followed by `endRequest` when the pool is otherwise idle;
an ended, non-timed-out token accepts idle work (`worker-pool.js:535-537,597-604`).
Add cold-start re-rating with an included solution, re-rating after a timed-out request, cancellation
while waiting, and a new main request aborting a waiting auxiliary to MP10's existing overlap tests.
No second pool or new owner policy is needed.

### FC03 — Apply the provenance fallback to the JSON-node limit too

Location: `docs/difficulty-v3/report-detailed.md:951-981,1004-1007`, RES-27; MP13.

The report identifies both limits, but the concrete writer fallback mentions only 512 KiB.
`core/engine/pack.js:323-337` enforces 100,000 JSON values independently of bytes; its counter is at
`:243-245`. A valid generation object containing 95,000 small array values can remain well below
512 KiB after adding about 10,000 provenance nodes, yet become unreadable. The current writer checks
bytes only (`:1289-1305`).

Replace the fallback clause with:

> Before writing, check the complete generation object against the reader's JSON-node/depth limits
> and the serialized pack against its byte limit. If otherwise valid base data would exceed a limit
> because of `generation.made`, omit that map, preserve `setOrigin` and the base metadata, and re-check.
> If the base itself is invalid/too large, retain the existing failure rather than discard unrelated data.

Add a below-512-KiB/over-100,000-node case to the near-limit MP13 tests. Qualify “malformed or oversized
records are ignored” as applying only within a valid generic generation envelope; the report must not
promise recovery from an envelope every current reader rejects.

### FC04 — Guard the new duplicate check before the existing null gate

Location: `docs/difficulty-v3/report-detailed.md:1167-1176`, RES-34.

At `core/engine/pack.js:985-991`, `pieces` can be null for a malformed board, missing pieces or a failed
piece read. The new call is prescribed before that null gate. State the guard explicitly:

```js
if (pieces !== null) checkDistinctShapes(ctx, pieces);
// Keep the existing issues/board/boardModel/pieces early return immediately afterwards.
```

Alternatively the helper can explicitly accept null and return without inspecting it. Add/retain
malformed-board and missing/invalid-pieces tests proving that validation returns issues, not a TypeError.

## Positions on the acceptance concerns

| Item | SA2 position |
|---|---|
| C1 estimate flag in codes | **Recommend (b)**, with explicit author/owner confirmation of the extra summary field. Add optional `censored` to the strict v3 claim schema and summary writer; when metrics exist, check `Boolean(censored) === !metrics.censusComplete`. A summary with `censored:true` gets a generic estimate note, never an invented n. Existing readers accept the flag (`core/engine/pack.js:57,793-797,829-833,1199-1200`); current score formatting uses `saturated`, not `censored` (`player/strings.js:94-99`), so no v3 "+" is required. |
| C2 centre and reserve | **Recommend (a)**. The final-result interpretation matches the answer. Preserve the existing profile accounting (`core/engine/clues.js:216-217,239-241`) and memoised repairs. “Best final result seen” is not a guarantee about the repaired value of an unfinished candidate; no such lower-bound theorem should be claimed. |
| C3 release notes | **Recommend (a)**: a Release notes section in the final v3 evidence record. No new root changelog is needed. This is a document-location confirmation, not a new scoring choice. |
| C4 restored twin sets | **Recommend (b)**: refuse them as decided, but show a one-time localized notice rather than lose saved work unexplained. `generator/state.js:895-899` currently loses the validation reason by returning null. Do not retain an invalid set as playable. |
| C5 estimate-share trigger | **Recommend confirming 5%, strictly greater than 5%**, with numerator/denominator and board/level breakdown recorded. An empty accepted cohort is unavailable evidence, not 0%. Until confirmed, 5% is a proposed interpretation, not a measured fact. |
| C6 retired tests | **Agree**. Product-boundary twin round trips become explicit refusal tests; the disconnected/large-board tests need distinct shapes. Keep direct-engine labelled-input tests and the cutoff assertion (`tests/clues.test.js:196-214`), re-evaluating only its v2-specific target. No new policy decision. |

## Minor consistency edits

- RES-01's “until MP06 measures them” also names REPLAY, but RES-29 and §5.2 correctly assign replay
  bounds to MP15. Say “DEDUCE/initial score fit in MP06; replay-only bounds in MP15”. Clarify that the
  MP12 rating/generation lock does not prevent setting replay-only presentation/work limits.
- Prefer “no original clarification remains unanswered” to “no task waits for an answer” while C1-C5
  still await acceptance. Keep the existing task-pack pause.
- Use “no capped paths observed on the specified corpus” consistently in summaries, as RES-04/RES-10
  already do; a finite probe does not establish a universal guarantee over every possible input.
- After this signature, the lead should update the detailed header and brief's verification status;
  I changed only the permitted signature row and one change-log row.

## Sign-off

SA2 (gpt-6-astra), 2026-11-12: **signed subject to FC01-FC04**.
The author's/owner's existing C1-C5 confirmations remain necessary for acceptance. No additional policy
question is introduced by FC01-FC04. Task-pack work remains paused.

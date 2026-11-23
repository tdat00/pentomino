# Improve generating, stages 2 to 4: clarifications

| Item | Value |
|---|---|
| Status | Open owner questions of round 1, revised after SA-Astra's review (`sa-astra/round-1-draft-review.md`) |
| Base | `c159ab4`; the joint report [`report.md`](report.md) and the sub-plan [`plan.md`](plan.md) |
| Authority | For a matter that would previously have required the supervisor, both SAs decide jointly under the owner's delegation (2026-11-23 15:29 +07:00, Discord message 1574341211701907457). Owner approvals remain mandatory, and a joint decision changing one of the owner's recorded decisions still needs his confirmation. |
| Decided jointly, removed | Q-S24-1 (the Hell 1 start table) and Q-S24-2 (the kernel of the frozen arms), decided under that delegation as D-S24-21 and D-S24-22 ([`plan.md`](plan.md) §5); no supervisor question remains |
| Owner | Q-S24-3 to Q-S24-7 can be answered now. Later owner stops (the frozen arms' proofs, `V4-LIVE`, S4-6 and the activation, `V4-S4`, `V4-S4C`) are asked at their turn with the account re-read ([`plan.md`](plan.md) §8) |
| Account | 172 of the 749 counted minutes granted are used. A *counted minute* is a minute of the test machine as the frozen round counts it; "cap" is the round's cumulative limit an approval sets |

## Q-S24-3: A work limit for "unique solution" requests

- **Addressee:** owner. **Raised by:** SA-Astra and SA-Opus (N-V4-21). **Date:** 2026-11-23.
- **Decision needed:** should requests that must return puzzles with exactly one solution (the `require` mode) also have a fixed
  work limit per selection call (one search for a puzzle, which can include many ratings and uniqueness counts) on Nightmare
  and Hell 1, like normal requests?
- **Context.** The new search gives each selection call a work limit, so that a stuck call stops by itself, the same way on any
  computer; you decided "work limits first, the 115-second clock as the backstop" (IG-P-D1). The canonical rating limits (how a
  puzzle's difficulty is scored) remain unchanged. The stage-2 test of a small limit (2 G work units) could not finish a
  unique-solution test request: every call hit the limit and the request ran out of time at 115 s, so that arm could not be
  proved. The SAs set 32 G on Nightmare (about three times the largest successful call seen, 10.3 G) and 40 G on Hell 1 (not
  below the normal-mode Hell 1 limit). Normal requests keep 10 G (Nightmare) and 40 G (Hell 1).
- **Evidence:** [`report.md`](report.md) §1.8 and §2.4; [`plan.md`](plan.md) D-S24-23;
  `docs/improve-generating/evidence/frozen/V4-S2P/parity-fr-p5.receipt.json`; `evidence/sa-opus/x1-recheck.md` §4;
  `evidence/sa-astra/review-records.json` (`requireCases`, `requireGeneration`).
- **Options.**
  - (a) Yes, a finite limit. One rule for both modes. Before stage 4, the proofs of the four final arms must show a
    unique-solution request completing under it. On very hard sets a call may stop earlier than it would without a limit; the
    request then tries other sets until the clock. Large boards in this mode are measured later, before any production claim
    (N-V4-15).
  - (b) No limit for unique-solution calls: only the 115-s clock stops them. This changes your own decision IG-P-D1 ("work
    limits first"); choosing (b) confirms that change, and the SAs record it.
  - (c) A different stop rule that counts limit-stopped attempts: it changes when a request gives up and needs its own design
    and tests.
- **Recommendation:** both SAs (a).
- **Blocked meanwhile:** the budget table of the frozen arms (T06, T08) and their proofs.

**Answer (owner, 2026-11-23 16:30 +07:00, Discord message 1574356572102991934):** (a). Verbatim: "Tôi trả lời Q-S24 đều là a" ("I answer all Q-S24 with a").

## Q-S24-4: A short pilot on the eight control boards never tested

- **Addressee:** owner. **Raised by:** SA-Opus, agreed by SA-Astra. **Date:** 2026-11-23.
- **Decision needed:** run a short pilot of the new search (without the screen) on the eight Nightmare control boards that stage 2
  did not test, before the freeze?
- **Context.** Stage 4 must show "no regression" on ten control boards: each must reach ten puzzles on at least 18 of 20
  requests and be about as fast as today's search, and one failure stops the next phase. Stage 2 tried only two of the ten; on
  26x26 one seed ran at 0.55 of today's speed and the estimated lower bound was 0.88, just under the 0.9 the gate needs. The pilot
  runs 5 requests on each of 3x29, 18x18, 18x20, 20x20, 20x21, 32x15, 22x22 and 24x24 Nightmare and compares them with today's
  search on the same seeds. It also reads the uncapped call prefixes against the proposed 10 G limit to assess affordability;
  `fr-none` does not enforce that budget. This is a fitting warning, not a five-seed no-regression verdict. It needs only a plan
  file, no new search code.
- **Evidence:** [`report.md`](report.md) §1.12 and §5; [`plan.md`](plan.md) §4.6; `evidence/sa-opus/s2-today.md`, `s4-cost.md`,
  `x1-prices.md`.
- **Options.**
  - (a) Yes: about 16 to 20 machine minutes (formal guard 28.2; minimum cap 201 on the round's account if it runs first; inside
    the 749 granted).
  - (b) No: a control at risk is first seen in stage 4, after about 8 to 9 hours of runs.
- **Recommendation:** both SAs (a).
- **Blocked meanwhile:** nothing hard; the SAs want its reading before the freeze values are fixed (T06).

**Answer (owner, 2026-11-23 16:30 +07:00, Discord message 1574356572102991934):** (a). Verbatim: "Tôi trả lời Q-S24 đều là a" ("I answer all Q-S24 with a").

## Q-S24-5: The 20-request check of the new Hell 1 settings before the freeze

- **Addressee:** owner (the scope and its minutes; the SAs agreed the design, D-S24-24). **Raised by:** SA-Astra and SA-Opus.
  **Date:** 2026-11-23.
- **Decision needed:** approve the SAs' 20-request uncapped Hell 1 check, with the read/stop gate of [`plan.md`](plan.md) T11,
  before the freeze? The four final-family proof passes are a separate required part of V4-S3P.
- **Context.** The Hell 1 start table changes a lot (starts 3 to 6 clues higher on three boards; 20x20 gets a table start for
  the first time) and it was not in the stage-2 pilots. Hell 1 is reported, not gated, but its stage-4 result decides which
  Hell 1 boards stay candidates for later offers. The check runs the final new Hell 1 setting, without its work limits, on the
  four Hell 1 boards with test seeds, and the SAs read from its logs whether the limits would have intervened. If they could
  have, the freeze pauses and the SAs come back with a priced follow-up for your approval.
- **Scope and price:** four Hell 1 boards, reps 0-4, 20 rows; 67.687958 projected /84.609948 guard counted
  minutes, with a timing-proxy scenario of about 20-22 minutes. The 749-minute grant remains; this new scope
  still requires approval, with the account re-read. No additional paired run or replacement epoch is
  pre-authorized by this approval.
- **Evidence:** [`report.md`](report.md) §2.7 and §5; [`plan.md`](plan.md) D-S24-24 and T11; `sa-astra/round-1-draft-review.md`
  finding 3; `evidence/sa-opus/x1-prices.md`; `evidence/sa-astra/draft-review-check.json` (`hellCheck`).
- **Options.**
  - (a) approve this scope;
  - (b) do not authorize it yet, so the freeze waits for a revised SA proposal.
- **Recommendation:** both SAs (a); the read gate is agreed.
- **Blocked meanwhile:** the freeze record (T12).

**Answer (owner, 2026-11-23 16:30 +07:00, Discord message 1574356572102991934):** (a). Verbatim: "Tôi trả lời Q-S24 đều là a" ("I answer all Q-S24 with a").

## Q-S24-6: Machine time to time the faster-kernel candidates (P7)

- **Addressee:** owner. **Raised by:** SA-Astra (its Q-A02 and M-O02), agreed by SA-Opus. **Date:** 2026-11-23.
- **Decision needed:** approve up to 20 machine minutes for one timing run of the faster-kernel candidates, after their equality
  tests?
- **Context.** P7 makes the rating code faster while giving identical results (plan estimate: 4 to 15 % faster). The plan runs
  its scoped test before the freeze; its result is for the later production work (phase 1), and the frozen round keeps today's
  kernel (D-S24-22). The equality tests are verification and need no allowance; one timing run compares at most three candidates
  with today's code: about 11.4 to 12.9 machine minutes in a timing-proxy scenario (formal guard 19.4). A candidate that is not
  identical or not at least 4 % faster is dropped. The developer work (14 to 22 hours) comes before the freeze in the plan's
  order.
- **Evidence:** [`report.md`](report.md) §3; `evidence/sa-opus/j1-numbers.md` §2; `evidence/sa-astra/draft-review-check.json`
  (`spike`); `docs/improve-generating/evidence/frozen/V4-S2K/kernel.md`.
- **Options.**
  - (a) Approve 20 minutes.
  - (b) Approve the first candidate only (about 4 minutes, guard 6.5) and re-ask for more.
  - (c) No: the spike gives its equality results without a timing result; whether P7 still goes to phase 1 is then decided
    jointly by the SAs under your delegation.
- **Recommendation:** both SAs (a).
- **Blocked meanwhile:** the spike's timing result, which decides whether P7 goes to phase 1.

**Answer (owner, 2026-11-23 16:30 +07:00, Discord message 1574356572102991934):** (a). Verbatim: "Tôi trả lời Q-S24 đều là a" ("I answer all Q-S24 with a").

## Q-S24-7: Skip the duplicate rows of stage 4 (N-V4-18)?

- **Addressee:** owner. **Raised by:** SA-Astra (its Q-A04 and M-O05) and SA-Opus (its Q4). **Date:** 2026-11-23.
- **Decision needed:** implement the optional change that skips stage 4's duplicate requests on the boards fixed without a screen?
- **Context.** On the seven boards fixed without a screen (3x29, 10x10 and 12x12 Nightmare and the four Hell 1 boards), stage 4
  runs two identical arms, 20 requests each; one copy could be skipped. Saving: 140 requests, about 90 to 95 machine minutes of
  `V4-S4` (formal 240.4 projected, 300.5 guard); none in `V4-S4C`. Cost: a reviewed change of about ten places in the verdict code
  just before the validation (5 to 8 developer hours) with new tests; the identical copies are also a free consistency check.
- **Evidence:** [`report.md`](report.md) §5; `tasks/improve-generating-v4/check-list.md:640`; `evidence/sa-opus/x1-prices.md`;
  `evidence/sa-astra/review-records.json` (`prices.optionalDuplicateSavingS4Only`).
- **Options.**
  - (a) No: keep both copies.
  - (b) Yes: the change before the activation; the saving applies to `V4-S4` only.
- **Recommendation:** both SAs (a).
- **Blocked meanwhile:** nothing; with (b), task T-N18 before the activation.

**Answer (owner, 2026-11-23 16:30 +07:00, Discord message 1574356572102991934):** (a). Verbatim: "Tôi trả lời Q-S24 đều là a" ("I answer all Q-S24 with a").

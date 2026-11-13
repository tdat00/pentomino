# Pentomino difficulty-v3 — response to the second review pass of the task pack

| Field | Value |
|---|---|
| Date | 2026-11-12 (+07:00); §9 (KI-1) 2026-11-13; §10 (MP12 tranche) 2026-11-13; §11 (MP12 re-verification) 2026-11-13; §12 (schedule question of the orchestrator) 2026-11-13 |
| Responder | SA1, claude-opus-5.5 (author of the pack) |
| Review answered | [`../gpt-6-astra/6-review-of-task-pack.md`](../gpt-6-astra/6-review-of-task-pack.md) § "Second pass" (SA2, gpt-6-astra): SP01-SP19; § "Third pass": TP01-TP05 (MP09 series), TP13-TP15 (MP09d2), TP06-TP12 and TP16-TP19 (§4); § "MP12 tranche": TP20-TP28 (§10); § "MP12 re-verification": TP29-TP33 (§11) |
| Source revision | `05fa958` (MP08 committed); MP07 committed as `2b4c5b9`; third pass at `041ff83` (MP09d1 committed); §9 at `ed54ecc` (MP10b1 committed); §10 at `a85ed55` (MP11 committed); §11 at `f33aa71` (the pack snapshot with §10); §12 at `f33aa71` |
| Order of work | as the orchestrator asked: SP01-SP03 (the MP09 series) first, then SP04 and SP05 (MP10a, MP10b), then the rest |
| Not changed | dispatched or accepted task files (MP01-MP08, then each task once dispatched); the Done column, the release record and the execution summary of the check-list; the reports, `plan.md`, SA2's folder; `clarifications.md` only by the new questions D36 and D37 in Part I |

## 1. MP09 series: SP01, SP02, SP03 and a new finding (D36)

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| SP01 the proved-guess promise is for generated puzzles | Major | Accepted | MP09d2 Goal, MP09d2-B01, the "Census estimate in `rate`" case (now also `Gproved === 0` returned as it is), documentation slot (design §1.2 R3, `docs/design-brief.md`, both user guides) |
| SP02 the activation commands abort before their own repair step | Major | Accepted | MP09d2 implementation steps 4-10 and test plan: Phases A-F, the named allow-list before GF-P2, GA-P2 first-run evidence, the final `npm test` verdict; MP09d2-T03, T08 |
| SP03 the D21 v3 re-validation placed before a v3 rater exists | Blocker | Accepted with the orchestrator's placement (MP09d2, after the switch, before GF-P2) | MP09d2 "D21-V3" section, Phase C, MP09d2-B04, T07; MP09c (counting rule, vectors); check-list D21-V3 gate row, ownership, §5 |
| D36 (new, SA1): Hell levels on large boards are unrateable under v3 | — (question for the plan author and the owner) | Raised in `clarifications.md` Part I, D36, with evidence | MP09d2 "Hell levels under v3"; MP09e (fewest-clue sample); check-list D36 |

**SP01.** The rule is a rule of generation acceptance (MP09c's AR1 refusal), never of `rate`. MP09d2 now says, in the
Goal, B01, the design brief and both guides, that the Generator makes Hard-or-above puzzles only with a proved
decisive guess, that imports and stored claims are not filtered, and that an unfinished census gives a labelled
estimate. The 41-I strip case pins `metrics.Gproved === 0` on a rating `rate` returns unchanged. MP10b's display
wording is checked with SP04 (§2).

**SP02.** The phases are executable in order: Phase A (fixture-independent targeted tests, fail-fast); Phase B (the
quick set with a TAP reporter, failures compared with six named tests that compare recorded fixture values; anything
else stops the task); Phase C (D21-V3); Phase D (GF-P2); Phase E (the full targeted run and the quick set, strict);
Phase F (GA-P2: the first `npm test` kept in `tests/artifacts/MP09d2/ga-p2-first.txt`, migration of UI-flow
expectations only for recipes that completed, `node --test tests\generator-controller.test.js`, then the final
`npm test` as the verdict). A recipe that does not complete is never reduced: it is a finding for the owner (D21 as
answered: the quantity-3 fallback of option (a) was not chosen) and the task stops before the final run.

**SP03.** MP09c keeps only the counting rule, and the rule needed a real code change, not only tests: MP07 committed
the stall counter as `profiles - nearestAt` with `nearestAt = profiles`, which equals the number of rated candidates
only while no profile is spent. Once MP09c spends profiles, that expression advances the counter on unrateable and
refused profiles, against Part I ("neither advances nor resets"). MP09c now changes it to `rated.length - nearestAt`
with `nearestAt = rated.length` (output-identical while nothing is spent; MP07's 30 clue tests pass unchanged on the
analysts' reference). Evidence on the reference (MP07 at `2b4c5b9` plus MP09c as specified):

- the first S8 (48 calls with the 6-clue subsets refused) no longer reaches the stop at 48: the stall stops it after 34
  calls. It became S8s (pins the stall with 21 spent profiles interleaved), and S8 now keeps a rated candidate above
  the band, so it still ends at the 48th call `LNWZ:capped`;
- ST1 (three unrateable profiles) and ST2 (a refused central or above-band rating, two lists) pin the rule; with
  MP07's profile counter they stop after 13 calls instead of 16 and 14 (S8s: 13 instead of 34), so they kill that
  mutant;
- S1-S7b, S9 and S10 are unchanged by the stall stop.

MP09d2 owns gate D21-V3: the D21 cells and populations as 20 serial captures (600 s each, the Hell captures 180 s),
run with the D21 drivers from where they are under a new preload `docs/difficulty-v3/d21-v3-<date>/nostall.mjs` (the
D21 observer plus a load hook that sets `STALL_LIMIT = Infinity` in memory, so each call records the counterfactual
sequence); `simulate.mjs --ns 8,12,16 --list`; the decision reads the TOTAL "missed a central result" for N = 12 and
16 (keep 12; raise to 16 only if 12 misses and 16 does not; otherwise stop and report). For the raise, the task lists
every value that moves (MP07's stall tests and MP09c's S8s, ST1, ST2 at 16, from the reference run with the limit 16),
and the raise comes before GF-P2. `fixtures-check` is not repeated (it compares with v2 fixtures before GF-P2); the
timed runs are MP12's.

**D36 (new).** While preparing D21-V3 I measured v3 on the Hell sets the D21 flow builds. At the pinned `DEDUCE`, 26
of 27 ratings are capped (1.6-2.5 s each) on 22x22 Hell 1-3, 15x20 and 18x18 Hell 2 and 24x24 Hell 3; 3 of 3 stay
capped at ten times the work cap (32-46 s each) and 3 of 3 with `lookaheadWidth: 0`; the 20x18 and 12x12 Master
controls complete in 2-50 ms ([`d36-hell-probe.txt`](d36-hell-probe.txt), script
[`d36-hell-probe.mjs`](d36-hell-probe.mjs)). After MP09c such a calibration ends `not-in-band` after 20 spent
profiles, so the recipe `square-22x22-hell-3` and MP07's slow 15 x 20 Hell 2 test will fail in MP09d2, and the D21-V3
capture gets no v3 sequence from the cells where the stall stop mattered. The report foresaw the risk ("the owner is
told with numbers"); the numbers are now in `clarifications.md` Part I, D36, with options (a) activate as specified
and let MP12 propose the offered levels, (b) a bounded engine investigation first, (c) a higher work cap, (d) reopen
SA2-Q-P02 for generation; I recommend (a).
MP09d2 applies the answer if it exists and otherwise finishes D21-V3 and GF-P2 and reports; MP09e no longer spends
eight minutes on two Hell requests that cannot succeed (one hell-3 attempt, then nightmare, then master).

The MP09 files after this pass: MP09a1, MP09a2, MP09b and MP09d1 unchanged (no second-pass finding); MP09c, MP09d2 and
MP09e changed as above; check-list rows D21-V3 (§7), D36 (§4.2), MP09c and MP09d2 (ownership and index), §5.

MP09 SERIES FIXED

## Third pass: TP01-TP05 (MP09c, MP09d2, MP09e) and the check of MP09d2 against the committed code

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| TP01 MP09c "nothing changes below Hard" is too broad | Minor | Accepted; applied by the orchestrator at dispatch (SA2's wording in the developer's brief); MP09c is committed (`d156f5b`) and I did not edit it | MP09c Consequences, MP09c-B03 |
| TP02 Phase B stops before the fixture migration it permits | Major | Accepted as corrected by SA2 | MP09d2 "Current code" (`checkRecipe`), implementation steps 4, 5 and 10, test plan Phases A, B and E, MP09d2-T04, T08, ownership |
| TP03 the reused simulator cannot certify a repaired final result | Major | Accepted: screening (A), certification by reruns (B), controls apart; four new scripts, tested | MP09d2 Goal, "What is measured", `stall16.mjs`, `split.mjs`, `rerun.mjs`, `certify.mjs`, population, "Reading the result" and the decision table, record section 5, ownership, step 8, B04, T07, DoD; check-list §7 D21-V3 and the MP09d2 ownership row |
| TP04 the 164-cell boundary replaced by 165 | Minor | Accepted | `avail.mjs` (`--blocked`), C2 row `avail-13x13b5-hell-1`, commands, record section 4, T09; check-list D36 |
| TP05 two fallback recipes for the fewest-clue sample | Minor | Accepted | MP09e "The size record" and Exact commands; check-list §5 "Hell levels under v3" |
| Note in the third pass: the 15 x 20 replacement must also make 10 of 10 | — | Accepted | MP09d2 C1 replacement step 2 (quantity 10, 600 s, `end` complete with 10), the tests table, T09, the example command |

**TP02.** Phase A (difficulty, difficulty-v3, clues, tasks and worker-pool tests: no recorded fixture is read and no
recorded recipe is run) is the only test gate before GF-P2. Phase B keeps the quick set as a labelled diagnostic: the
TAP output goes to `tests/artifacts/MP09d2/phase-b-diagnostic.txt`, the failing names go into the reply, nothing
throws, and no test is edited because of it. With the allow-list gone, the parent suites, `generate.test.js:734` and
`:764` and the recipe version refusal (`tools/generate.mjs:276-279`, which also breaks `cli.test.js:95`) no longer
matter before GF-P2. After GF-P2, Phase E runs strictly the eleven files that read the recorded fixtures or run the
recipe (found by searching `tests/*.test.js` for the fixture files and the recipe tool: generate, cli,
puzzlecode-cli, generation-client, calibration, benchmark-matrix, player-load, rate-probe, generator-state,
generator-controller and pack), then the whole quick set. T08 states all of this and that `checkRecipe` is not
weakened.

**TP03.** Agreed: `simulate.mjs` returns the best raw candidate, which is the stop's final result only in `any` mode.
The gate now reads the no-stall baseline in three parts, separated by a new `split.mjs`:

- A: the `any`-mode calls, screened by `simulate.mjs` (exact for them);
- B: the `require`-mode calls with a finite band (30 per level of `pop.mjs --recipe-board` and the four real-rating
  `require` vectors), rerun by a new `rerun.mjs` with the product's limit 12 (the plain D21 observer) and with 16 (a
  new load hook `stall16.mjs`), and compared by tag with the baseline by a new `certify.mjs`;
- the nine scripted `difficulty-v2` vectors, as a separate controls table outside A and B.

`certify.mjs` relies on one property of the code: a rerun is identical to the baseline until the first rating at
which the rule holds on the baseline sequence (same decisions, same rng draws; the repair draws from the search's
rng, so after a stop whose repairs all fail the sequences may diverge). It computes that rating with the rule of
`simulate.mjs` (cross-checked against `simulate()` on 328 pairs of call and N: no difference), requires the identical
prefix, and classifies each call: never fired (it must equal the baseline), fired with the same final result, lost
central final result, other changed result, or not reproducible. The decision uses missed(N) = A's misses + B's lost
central final results; raw `require` triggers are reported only. A call that is not reproducible, a call without its
partner (for example after a capture stopped at its limit), or a `require`-mode call left in the screening stops the
gate.

Trial (scratch only, HEAD `041ff83` with `rate` switched to v3 in memory):

- `pop.mjs --recipe-board 4` and `vectors.mjs` gave 24 + 5 `require`-mode calls and the nine controls;
- at N = 12 and 16 all 28 finite-band calls were identical to the baseline;
- with N = 4 (trial only), one call fired after rating 5, kept the identical 5-rating prefix and changed its result
  (13 to 12, not central), so the classification matches the product;
- synthetic vectors covered the lost, same, changed and both not-reproducible branches.

Extrapolated costs: the no-stall `pop-recipe-board` capture takes about 4-5 minutes and each rerun about
1.5 minutes. C3 is now announced as 20-45 minutes.

**TP04.** Accepted. `avail.mjs` takes `--blocked <n>` (the last n cells of the last row blank, as `rectRows`), names
the board `13x13b5` as `boardId` does, and records `blocked` and the active `area` in its `start` event. The first C2
row is `avail-13x13b5-hell-1` (164 active cells). One set attempt in scratch, under v2, confirmed a valid board and
label. The three attempts, the seed and the 300 s limit are unchanged.

**TP05.** Accepted. In MP09e the hell-3 to hell-2 fallback is withdrawn. The fewest-clue sample is taken in the order
hell-3, nightmare, master and stops at the first sample. hell-3 runs once, or is skipped by the D36 rule with the
reason recorded. Hard to expert stays for the long end, and the exact commands follow that order. In the check-list
§5, the row is now "Hell levels under v3 (D36, decided (a), P-OD5)", owned by MP09d2 (B05, T09), MP09e (T02), MP12a,
MP12b1 and MP12b2.

**MP09d2 against the committed MP09c and MP09d1.** The anchors are moved to HEAD `041ff83`. "Current code" now quotes:

- `measureV3(board, pieces, clues, ws, limits = { deduce: DEDUCE, dlx: SCORE.caps })` (line 213);
- `rate` (line 322, still `return rateV2(...)`);
- `IncompleteRatingError`, with `code: 'rating-incomplete'` and `counters.stop` and `work`, used by `spent.mjs` and
  `verifySample`;
- `rateSubset` returning `'spent'`;
- the stall test `rated.length - nearestAt >= STALL_LIMIT` (clues.js:415);
- `makeUnique(..., rng, ...)` (line 293).

The `verifySample` assertion of `player-load.test.js` moved to line 261 (T04). No other contract of MP09d2 had to
change.

**TP06-TP12** concern MP12a, MP12b1, MP12b2, MP15a1, MP15a2 and MP16a. None of them is dispatched. Their dispositions
follow with the remaining second-pass sections.

MP09d2 READY

## 2. Auxiliary requests, display rating and calibration tooling: SP04, SP05, SP07 (MP10a-MP11)

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| SP04 startup wishes, card invalidation, failure note | Major | Accepted (SA2: implemented, third pass) | MP10b1 display table (a settled `unavailable` shows the claim with "Could not be re-rated"; only an unsettled request shows the claim alone), the cards' `drawn` state, case 13; MP10b2 "What to build" item 2 (wishes sent once at controller creation), cases 1 and 3, T02, T06, the browser redraw check |
| SP05 unreachable queue states, certificate wording | Major | Accepted (SA2: implemented, third pass) | MP10a Goal (FIFO idle queue: never cancels or supersedes a certificate, no latency promise), "the queue states the tests use", cases 4, 5, 7, 11 |
| SP07 same-commit documentation | Minor | Accepted; MP10b1 and MP12a reviewed by SA2; MP13a and MP13b in §4 | MP10b1 documentation slot (the brief's sentence in the same task); MP10b2 keeps the Generator's sentence |

**Final check of MP10a, MP10b1, MP10b2 and MP11 against HEAD `041ff83`.** Every `file:line` anchor of the four files
was printed from the code. The files they anchor are unchanged since `7604eff`, except three lines:

- `core/engine/protocol.js:671` was wrong already at `7604eff`: the `rate` payload is line 666 (MP10a rule 8,
  MP10b1 "Code").
- `ratingParts` moved to `player/strings.js:111-117` (MP09a1 added the duplicate-shape message above it).
- The store and the controller moved to `generator/app.js:97, 124` (MP09a2 added `saveRestoreCleanup`).

The four headers now say "anchors at HEAD `041ff83`". MP10b2's page table notes that MP09e adds a check to
`tests/browser/puzzle-code-acceptance.js`, so its two lines there are found by their quoted text. MP11 had no
finding: `tools/bench/`, `tools/calibrate.mjs` and the anchored engine lines (`firstSetAttempt` at
`core/engine/generate.js:148`, `run.details` at `tools/bench/runner.js:682`) are unchanged, and no task before MP11
owns them. No contract changed.

MP10-MP11 READY

## Critical-path re-verification of MP09d2: TP13, TP14, TP15

MP09d2 was dispatched (DEV-P-MP09d2) while SA2 re-verified it. The corrections are written into the task's sections
and summarised in its new "Amendment B1" (before the Execution log, ending "AMENDMENT B1 READY") for the orchestrator
to pass on. The developer's working tree already removes the delegation loop of TP13 exactly as below.

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| TP13 the delegation assertion of MP09d1 fails Phase A | Major | Accepted | MP09d2 test table (new row for 'the v2 rating keeps its results under its v2 names': keep lines 331-347, remove the loop of lines 348-350), step 3 |
| TP14 a different central rerun counted as lost | Major | Accepted | MP09d2 "What is measured" (definitions), embedded `certify.mjs` (`classify`, `lost` = `central(b) && !central(x)`, `--self-test`), Phase C3 step and commands, files list, T07 |
| TP15 `$skipHell3` not initialised | Minor | Accepted as a developer addendum (MP09e is not blocked; its file is unchanged) | Amendment B1 item 4; the addendum text below |
| SA1-1 (new) two Phase E files pin `difficulty-v2` values of the re-recorded sample | Major | Fixed with TP13 | MP09d2 test table (rows for `tests/pack.test.js` and `tests/rate-probe.test.js`), step 10, Phase E comment; check-list ownership row of MP09d2 |

**TP14.** `certify.mjs` now classifies each call in one function, `classify(b, x, n)`. A fired call is `lost` only
when the baseline result is central and the rerun's result is not, or the rerun has none. Any other difference is
`changed`. `--self-test` runs ten synthetic calls on the Hard band [17, 25), whose central half is [19, 23]. The
baseline is thirteen ratings of 18 and then 21, so N = 12 fires after rating 13 and N = 16 never fires. The cases
are:

- a different central puzzle at 21, and a different central score of 20: both `changed`;
- a loss to 18, and no result: both `lost`;
- the same result: `same`;
- a rerun that differs before rating 13: not reproducible;
- a change of a result that was not central: `changed`;
- N = 16 with an identical rerun: never fired; with another result: not reproducible;
- a call with a central rating, which never fires, with an identical rerun.

In scratch the script printed "10 of 10" and exit 0. On the trial captures of `041ff83` it printed the same table
as before (28 compared, 0 fired at N = 12 and 16). It also matched the earlier synthetic files, which have no
changed-but-central case. The prefix proof and the decision table are unchanged.

**SA1-1.** While checking TP13 I listed every test that reads `tests/fixtures/generated-sample-pack.json` or
`generation-case.json` for `difficulty-v2`-specific assertions. Two would fail in Phase E by design after GF-P2, and
neither was in the "only these" table:

- `tests/pack.test.js:576` pins `rating.model === 'difficulty-v2'` on the re-recorded sample.
- `tests/rate-probe.test.js`, the first pack-mode test:
  - line 71 pins `sourceModel === 'difficulty-v2'`;
  - line 77 pins `v2.score === storedScore`, but the stored score becomes a v3 score;
  - line 101 pins `raw.G === 1` for the Hard sample; AR1 guarantees only `>= 1`.

The re-pins are:

- `'difficulty-v3'` for both model pins;
- `line.v2.score === scoreV2(line.v2.metrics.U, line.v2.metrics.B)`, checked on the current sample: equal for all
  three puzzles;
- `raw.G >= 1`; index 2 stays the Hard sample (`SAMPLE_LEVELS`).

The other readers (generator-controller, generator-state, generate, cli, benchmark-matrix, calibration,
generation-client, puzzlecode-cli) either compare with the re-recorded `expected` values or use literal claims.

**TP15 addendum for MP09e's developer** (MP09e's file is unchanged, as the orchestrator asked): in "Exact commands",
just before line 320 (`if (-not $skipHell3) { $fewest += 'hell-3' }`), add `$skipHell3 = $false`, then
`$skipHell3 = $true` only when MP09d2's record shows no Hell 3 puzzle on 22x22 and 24x24 (the comment of line 320).

MP09d2 AMENDMENT B1 READY

## 3. Calibration, provenance, replay and final evidence: SP06, SP07 (rest), SP08-SP19

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| SP06 probe splits and an implicit fit input in MP12 | Major | Accepted (SA2: implemented, third pass) | MP12a: the captured corpus, labels, the manifest, the identity join and the fit adapter |
| SP07 same-commit documentation (MP13a, MP13b) and MP13b's open-ended seed search | Minor | Accepted | MP13a: one sentence of `docs/design-brief.md` "Limits, waiting, and sharing"; MP13b: one sentence of "Generator: make a challenge"; both removed the brief from their must-not lists; MP13b's recorder: a bounded, resumable `--search` (540 s, `--from`), `--create`/`--replace` with `--seed`, the selection rule over all printed lines, case 14 (usage cases; the `--check` assertion moves to a `(slow)` test when it alone takes over 15 s), the gate commands and MP13b-T07; check-list ownership rows of MP13a and MP13b |
| SP08 replay discards a multi-puzzle pack's provenance | Blocker | Accepted (SA2: implemented) | MP15a1: the one-entry projection |
| SP09 the replay work meter misses RES-29's work | Blocker | Accepted (SA2: implemented) | MP14a, MP14b, MP15a1: the meter of ratings, uniqueness counts (zero-add finishes included) and hidden calibration events |
| SP10 the byte bound applied after buffering | Major | Accepted; closed with TP10 (§4) | MP15a1 `record()`, MP15a2 reserve |
| SP11 the final step loses clues and census detail | Major | Accepted (SA2: implemented) | MP15a2: final clue placements, `args.detailStep` |
| SP12 a v2 metrics object is no proof of a breakdown | Major | Accepted; closed with TP11 (§4) | MP15a2 `breakdownOf` |
| SP13 trace tests against valid calibration and repair sequences | Major | Accepted | Engine part (SA2: implemented): MP15a1 case 2, MP15a2 order. UI part: MP16b checks 1 and 2 use the first `candidate` card (kinds read from `puzzleMade`; New puzzle once more when there is none), new check 12 opens the calibration card (no stage 4 step), MP16b-T06 |
| SP14 one definition of the zero-add repair exception | Minor | Accepted | MP14a zero-add paragraph and case 7; MP16a no-piece sentence and cases 3, 8; check-list D31 now says the same: a successful zero-add finish emits none, a failed one emits one failure event without a piece name |
| SP15 compact mode drops the last key of `ranked` | Minor | Accepted (SA2: accepted) | MP16a: the full `ranked` comparator and the tied-score case |
| SP16 no producer for the search and repair evidence | Major | Accepted; closed with TP07 and TP08 (§4) | MP11 record fields; MP12b2 observer; MP12b1 population |
| SP17 GZ passes on missing or stale outputs | Major | Accepted | MP17: a fresh attempt directory per attempt; `runs.json` with exit code, time, size and SHA-256 of each pack; levels not offered after the lock are recorded `skipped`; `summarise.mjs` checks the manifest (12 runs in order, exit 0/2/1 against the pack and its size, the digests, skips only for levels not offered) and fails without any Hard-or-above puzzle; each `MISS` line is an approved exception (lock record cell or D36 answer) or a finding, never coverage; probes only on packs of the attempt; unavailable levels stay visible in record §6 and the release notes; MP17-B01, B02, T03 |
| SP18 heavy fixture checks before the announcement | Major | Accepted | MP17: before the announcement only git commands and `lock-values.mjs`; the two fixture checks are the first gate commands, in the announced time; a retry waits for the go; MP17-T01, implementation steps; check-list GZ row |
| SP19 no trusted keys, phases omitted | Major | Accepted | MP16b: the runner `pages.mjs` in full (trusted keys through the `key-<name>` handshake of `puzzle-code-acceptance.js:2018-2023`, `Shift+`, the 390 px touch viewport for `narrow`, the `#summary` fallback, one evidence directory per page and phase, PIDs, a 540 s bound per run, profile removal, refusal on a busy port); the replay page's phases (check 5 in `?phase=keys` with trusted Tab, Shift+Tab, Enter, ArrowRight and Escape); MP16b-T04, T06. MP17: the same runner, 19 runs in four invocations (16 pages in the main phase, the keys and narrow phases of `puzzle-code-acceptance`, the keys phase of `replay`), MP17-T04; check-list GB-P4 and GZ rows. MP10b2's main-phase evidence: TP17 (§4) |

**SP17 and SP19, checked code.** The new generation block of MP17 and its `summarise.mjs` were run on a scratch export
of `041ff83` with a reduced run list: the manifest, the skipped rows (`hell-2` on 10x6, `very-easy` on 20x18), a
changed digest, an exit 2 without a pack and a run of a level that is not offered all give the expected `FAIL` or
`MISS` lines; the knobs one-liner writes the file it is given. The runner of MP16b passes `node --check`; its live
check (one main page and the keys phase of `puzzle-code-acceptance` on a scratch export) is reported in section 6.

## 4. Third pass, later parts: TP06-TP12 and TP16-TP19

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| TP06 MP12a repeats the pre-fixture test order after a knob change | Major | Accepted | MP12a "Test order around a knob change": between rounds only fixture-independent files and the slow v3 test, the quick set as an optional diagnostic; after the final round, only if a knob changed: GF-P2, the strict files of MP09d2's Phase E, the quick set, then GA-P2 by MP09d2's Phase F; step 4, implementation steps 3-4, T04; MP12b2's change round uses the same order |
| TP07 the search observer cannot derive repair and timing statistics | Major | Accepted | MP12b2: `observe.mjs` brackets `finish` with a load hook; one record per attempt (`ph, f, c, o, s, g, t, cc, w, ms`) and per finish (`f, c0, ri, o, c1, s, sel, ms`, `sel` by object identity); definitions of a repair attempt, a successful repair and a result from a repair; four self-test cases with exact expected strings and summary counts; F1/F2 count raw attempts only; fail-fast item 1 uses the `ms` of capped attempts; record §6; T01. Checked on a scratch export of `041ff83`: SA2's case (constant score 18, seed `repair-ri-0`) gives 13 raw attempts, then `repair:5:rated` and the finish `4@5:repaired>5*` selected (IUTX to IUTWX) |
| TP08 three Hell repetitions are not the approved landscape | Major | Accepted; the population is a question for the plan author: D37 in `clarifications.md` Part I | MP12b1: all 25 Hell cases are prescreened; a case where a puzzle is seen gets 20 requests; the others follow the D37 answer, which the task waits for; one report per case, never a `-s3` report beside a 20-request report; "no puzzle observed in N requests"; MP12b2 inputs and owner rows; check-list D37, GL-P3, §5. D37 options: (a) 20 requests for all 25 cases (up to about 17 h), (b) a waiver at 3, (c) (b) plus 20 requests for the boundary case of each Hell level; I recommend (c) |
| TP09 `ReplayRun.set` is not plain JSON | Major | Accepted | MP15a1: `set` is a `PieceSet` (`board.active` is a `Uint8Array`); every other field is plain JSON; case 13: a JSON round trip of `rest` and `structuredClone(run)`; T05 |
| TP10 the reserve is not maximal and the array framing is uncounted | Major | Accepted | MP15a2: reserve = 2 + max(final(`'unavailable'`, null), final(`'unavailable'`, maxSteps - 2) when maxSteps >= 2); each non-final step charged its bytes + 1; the bound is `utf8Length(JSON.stringify(steps)) <= maxBytes`; case 5 (exact fits at maxSteps = 1, the unavailable result, the multi-step `need`); MP15a1 `record()` counts the events as one JSON array (case 8, `reserveBytes`); T04 |
| TP11 finite legacy inputs give an infinite term | Major | Accepted | MP15a2: the v2 breakdown also needs finite computed `u` and `b`; case 4 uses `{ U: Number.MAX_VALUE, B: 0 }`; T03 |
| TP12 UI tests of the final, zero-add and stopped cases | Minor | Accepted; already in MP16a when the third pass was written | MP16a cases 3, 7, 8 |
| TP16 the guide sentence mixes an unfinished census and an unrateable path | Minor | Accepted; applied in the task file (MP10b1 is not dispatched) | MP10b1 "Documents": an unfinished count of the guess alternatives is a "decisive estimate"; a re-rating that cannot find the first solution keeps the original rating with "Could not be re-rated" |
| TP17 one evidence directory per page; the `#summary` element | Minor | Accepted; applied in the task file | MP10b2 repository rules: `RP_EVIDENCE_DIR` = `tests\artifacts\MP10b2\<page-name>\main`, the summary read as `dataset.summary`, else `#summary` (`acceptance.js:716-717`, `generator-flow.js:987-988`) |
| TP18 the benchmark digest misses the new client dependency | Minor | Accepted; applied in the task file | MP10a: `tools/bench/report.js` gains `'core/browser/auxiliary.js'` in `SOURCE_FILES` after the generation client; `tests/benchmark-report.test.js` in the targeted command; T04; check-list MP10a ownership row and D12 |
| TP19 the Generator submit wrapper ignores `workersAvailable: false` | Minor | Accepted; applied in the task file | MP10b2 "What to build" item 2 (the flag is checked before the method), the inputs bullet, case 1 (a spy with `workersAvailable: false`: zero calls, `unavailable`, no notice), T02 |

TP16-TP19 were offered as developer addenda; since MP10a, MP10b1 and MP10b2 are not dispatched, the fixes are in the
files themselves, so the developers need no addendum. The anchors were checked at HEAD `041ff83`
(`generator/app.js:124-128`, `core/browser/worker-pool.js:92`, `tools/bench/report.js:37-48`, the two `#summary`
pages). MP10-MP11 stay ready for dispatch.

**Counts.** Second pass: 19 findings (3 Blocker, 13 Major, 3 Minor), all 19 accepted, none disputed. Third pass:
TP01-TP19, all accepted, none disputed (TP08 with the population question D37 for the plan author; TP15 as a
developer addendum for MP09e). One question was added to `clarifications.md` Part I in this round: D37.

## 5. D36 carry check (P-OD5)

The plan author's answer to D36 ("(a) now", four MP09d2 precisions and an MP12 owner question; owner decision P-OD5)
is carried into every undispatched file that needs it:

| Item of the answer | Where |
|---|---|
| MP09d2: every Hell failure recorded (profiles spent, all `path-capped`, time) | MP09d2 "Hell levels under v3" and the D21-V3 record (dispatched; SA2 verified) |
| MP09d2: `square-22x22-hell-3` and the 15 x 20 Hell 2 slow test replaced by the highest level the same board completes 10 of 10, from the D21-V3 captures; one small test pins an unrateable calibration ending `not-in-band` | MP09d2 Phase C and the test table (dispatched) |
| MP09d2: D21-V3 only on cells v3 completes; "inert on the v3 corpus" when the stall stop fires nowhere; never Hell sequences from v2 | MP09d2 D21-V3 (dispatched) |
| MP09d2: the availability probe (Hell 1/2/3 on the smallest offered board and one mid-size board, 3 set attempts each) | MP09d2 C2 (`avail.mjs`, TP04's 164-cell boundary) |
| MP12a: the `STALL_LIMIT` in force and "inert on the v3 corpus"; a GV2 cell without a puzzle is a finding with options (i) and (iii) ((ii) is for Hell levels only) | MP12a "The stall stop and cells v3 cannot make (D21, D36)", record §1 and §5 |
| MP12b1: Hell cases expected to fail; prescreen, 20 requests where a puzzle is seen, the rest by D37; "no puzzle observed in N requests" | MP12b1 Goal and "Hell cases" (TP08) |
| MP12b2: for every (area, level) v3 cannot make, the owner's choice of (i) stop offering, (ii) a different contract (reopens SA2-Q-P02 for Hell only), (iii) a separate engine project, with the plan author's recommendation (i) quoted, and what follows each answer (MP12b3 for (i)) | MP12b2 "The owner's question: cells v3 cannot make (D36, P-OD5)", record §9, MP12b2-B03 |
| MP12b2: a fail-fast proposal for unrateable set requests, with measured numbers and a false-stop check | MP12b2 "The fail-fast proposal" (F1 set requests, F2 selection calls; per-attempt `ms` of capped attempts, TP07; zero false stops required), record §10, MP12b2-T04 |
| MP12a/MP12b (D21 carry): ratings per puzzle and generation time per Hell cell (22x22, 32x15 and 24x24 Hell 3; 15x20 and 18x18 Hell 2), and the `STALL_LIMIT` chosen | MP12b2 population H and record §7, §8; MP12a record §1 |
| MP17: levels no longer offered after an answer (i) stay visible | MP17 generation runs (`skipped: 'not-offered'`), record §6, release notes (SP17) |

Nothing of the answer is left without an owner task. The check-list D36 row is decided (P-OD5); its ownership and
traceability rows name MP09d2, MP12a, MP12b1 and MP12b2.

D36 CARRIED

## 6. Live check of the MP16b runner (SP19)

The runner checked here is identical to the code block in MP16b (MP17 copies it verbatim). It ran at 22:03 on a
scratch export of `041ff83`, outside the repository, with no timing lock present:

```powershell
node tests\artifacts\SA1\pages.mjs --task SA1 --http 8899 --cdp 9399 --evidence tests\artifacts\SA1\pages rendering puzzle-code-acceptance:keys
```

| Page and phase | Result | Time | Trusted keys | Evidence |
|---|---|---:|---|---|
| `rendering`, main (1280 x 900) | PASS, "PASS 17/17", no page error | 1.1 s | none | `browser.json`, `page.png` |
| `puzzle-code-acceptance`, `?phase=keys` | PASS, no failed check, no page error | 2.7 s | Tab, Shift+Tab, Enter, Enter, Escape | `browser.json`, `page.png` |

The invocation took 14 s and exited 0. Afterwards the server and both Edge processes had ended, the profile
directory was removed, and `runs.json` recorded the PIDs. MP16b and MP17 need no change from this check.

## 7. D37 carried (owner decision P-OD6)

The owner answered D37 with (c) (`clarifications.md` Part I, D37; part H, P-OD6). It is carried into MP12b1, MP12b2
and the check-list with MP09d2's measured Hell outcomes (`docs/difficulty-v3/d21-v3-2026-11-12.md` §4 and §6):

| Item of the answer | Where |
|---|---|
| Every Hell case gets the 3-request prescreen | MP12b1 "Hell cases" step 1: all 25 cases, after the other cases, listed with their active cells; MP12b1-T04 |
| A case that makes a puzzle is run with 20 requests | MP12b1 step 2, first item |
| The boundary case of each Hell level is run with 20 requests | MP12b1 step 2, second item: the case with the fewest active cells among the level's cases whose prescreen accepted no puzzle; exactly one per level, none when every prescreen of the level made a puzzle, no second one when its own 20 requests make a puzzle |
| The others stay at 3 requests, "no puzzle observed in 3 requests", never "cannot be made" | MP12b1 step 2, third item ("reduced (D37, P-OD6)", read with the boundary case of its level); the aggregation's selection rule, its coverage table and list 1 |
| MP12b2's owner question states its evidence | MP12b2 "The evidence the question rests on (D37, owner decision P-OD6)": per level the boundary case, the cases with a puzzle, the reduced cases, population H and MP09d2's measurements of the smallest offered areas, each row with its source and failure mode (capped, or rated only above the band), and for option (i) the largest area with a puzzle and the smallest without one; record §2, §7 and §9; MP12b2-B03 |
| MP09d2's real data | MP12b1 "Expected from MP09d2's record" (a projection, never a reason to skip a prescreen): Hell 1 was made only on the 164-cell board (13 x 13 with 5 blocked, 2 of 3 attempts), not on 300, 400 or 484 cells; Hell 2 not on 266 cells (rated, all above the band) nor on 300 to 484 cells; Hell 3 not on 450 to 576 cells. Expected boundary cases: one of 14x14, 15x15b10, 16x16 and 15x20 for Hell 1, 15x20 for Hell 2, 32x15 for Hell 3. MP12b2 Inputs also state that `STALL_LIMIT` stays 12 and the rule is not inert, so population S is skipped |
| Machine time | MP12b1 header and wall-time line: about 2.5 hours of prescreens, about 40 minutes per boundary case (at most three) and up to about 40 minutes per Hell case with a puzzle |
| Check-list | the D37 row (decided, P-OD6), the Hell traceability row (MP12b1-T04, MP12b2-B03) and the GL-P3 gate row |

D37 CARRIED

## 8. MP09e against the outcome of MP09d2

MP09d2's outcome (its record and the orchestrator's summary): `square-22x22-nightmare` replaced the Hell 3 recipe
(§3.1), MP07's 15 x 20 slow test runs Nightmare (§3.2), `STALL_LIMIT` stays 12 (§5.5) and GF-P2 re-recorded the
fixtures. MP09e (20:11:05, not dispatched) was checked against each fact:

| Part of MP09e | Depends on | Result |
|---|---|---|
| The fewest-clue sample (the D36 skip rule) | MP09d2's record §2 and §4: Hell 3 made no puzzle on 22 x 22 and 24 x 24 | The condition holds (§2.1, §2.2, §2.8, §4), so hell-3 is skipped and the sample is nightmare on 26 x 26 (`codes-v3/26x26-nightmare`); MP09d2 made 10 Nightmare puzzles on 22 x 22 in 4.7 s. The task already says this; with TP15's addendum the developer sets `$skipHell3 = $false` and then `$true` from the record |
| The Generator journey of `puzzle-code-acceptance` | `tests/fixtures/ui-flow-recipes.json` | It reads `recipes[0]` only (`tests/browser/puzzle-code-acceptance.js:1379`), the 10 x 6 Normal recipe; the replaced recipe is index 2. No change |
| `puzzle-code-entry` and `puzzle-code-cli-parity` | fixtures | They read `puzzlecode-v1.json`, `hand-authored-pack.json` and `player/samples/sample-pack.json`, none of which GF-P2 records. No change |
| `STALL_LIMIT` | - | No pin of MP09e depends on it |

No change of MP09e is needed because of these facts. One optional developer note, to pass with TP15: since
`7604eff`, MP08, MP09a1 and MP09b moved some anchors of MP09e's "Code" list (not MP09d2): `TIME` is at
`core/engine/policy.js:66` (was 54); in `core/engine/puzzlecode.js`, `partsFromSnapshot` is at 184 (163), `encode`
at 253 (228), `createPuzzleCodec` at 588 (563), `encodePuzzleCode` at 616 (590) and `decodePuzzleCode` at 630 (603).
The task names each function, so a developer finds them.

MP09e OK

## 9. KI-1: where the fix belongs, and how

Read-only investigation (2026-11-13): git history, the code and MP09e's git-ignored evidence under
`tests/artifacts/MP09e/`; no page run.

**It predates rating-v3.** The merge base with `main` is `9d45142` (2026-10-28), and `main` has not moved since.
`core/browser/worker-pool.js`, `core/workers/engine.worker.js` and `tests/browser/puzzle-code-acceptance.html` are the
same at `9d45142` and at HEAD `ed54ecc`; `core/browser/puzzle-code-client.js` differs by one code in `CODEC_CODES`
(RES-34), and `tests/browser/puzzle-code-acceptance.js` only by MP09e's three additions (`claimsOf`, the summary claim
of the Generator journey, the RES-34 check). The failing checks and the helpers they use (`check`, `packHash`,
`mount`) date from the page's commits of 2026-10-26 (`8012276` to `3df6798`). The one rating-v3 effect on the path: the
worker's static module graph grew from 25 modules (390,153 bytes) to 26 (481,202 bytes, +23 %), so every worker takes
longer to load, which may widen the window. The rate at `9d45142` is not measured (no page runs).

**What fails.**
- `dbg53.console.json`: BA09 starts with `mount({ hash: await packHash(sample, 0) })`. Worker 8 (`packHash`'s client)
  answers at 2,454 ms and is terminated at 2,465 by the client's `dispose()`; worker 9 (the Player's decode worker) is
  created at 2,470 and fires `error` at 2,511, before any reply; the pool then discards it.
- `dbg31.console.json`: the failing worker is BA09's first (`packHash`'s), created just after the previous check's
  cleanup; it fires `error` 19 ms after creation, with `message`, `filename` and `lineno` undefined: a plain `Event`,
  which a browser fires when a worker's script or a static import fails to load (a runtime exception is an
  `ErrorEvent` with a message). That run's only CDP error is `Network.loadingFailed` (`Script`, `net::ERR_ABORTED`,
  `canceled: true`). The engine worker has no dynamic `import()`, so the canceled request is most likely the new
  worker's own load.
- The pool maps the event to `worker-crashed` (`core/browser/worker-pool.js:429-433`), so the puzzle-code step fails;
  the check's message depends on the step: "the codes of the pack could be made", "timed out: the view to turn", "the
  Print dialog is ready", "expected "game", got "start"" (BA05) or "the entry accepted the text (Puzzle code
  processing failed. Try again.)". These are the 8 KI-1 failures of MP09e's 24 recorded runs; MP09e's passing runs
  all spawned 122 workers.

**Approach: (A), in the pool.**
- (A) A delayed load retry in `core/browser/worker-pool.js`: on a plain `error` before any reply, terminate the
  worker, wait 100 ms with the slot reserved, then send the same task to a new worker, once per task; every other
  `error` stays `worker-crashed`. It also protects the apps, which run the same sequence: an aborted or stale busy
  task whose worker is discarded and replaced, `recycle` after a set change (D38), a disposed client and a new one.
  The wait avoids repeating the trigger, since the retry itself follows a termination (that of the failed worker).
- (B) A pause in the page's `check` cleanup: rejected. It would reach `dbg31`'s case (a spawn after the previous
  check's cleanup) but not `dbg53`'s, which happens inside one check (`packHash`, then `mount`), and a page-only pause
  would hide a product race.
- (C) A retry in `puzzle-code-client.js`: rejected. It covers puzzle codes only, not generation, verification or the
  auxiliary ratings of MP10a and MP10b1.

**Placement: Amendment D1 at the end of MP10b2** (written before its dispatch, before its Execution log, like A1 and
B1). MP10b2 is the next task and runs this page in its GC-P2 display gate, so the proof costs about 17 more minutes
under the same announcement: 20 consecutive runs whose page result is `pass` (by chance about 0.3 % at MP09e's 5
failures in 20). The fix is file-disjoint from MP10b2's other work (the pool, its Node tests and one design bullet;
about 150-180 lines). D1 cannot block GC-P2 display: after one bounded step (100 to 300 ms) it stops and reports, and
the known-flake rule applies as today. A separate task before MP17 would cost one more dispatch and leave MP10b2's
runs under the flake rule.

**Files changed for this placement.**
- `tasks/difficulty-v3/MP10b2-display-rating-generator-and-pages.md`: "Amendment D1" (contract, five Node cases, the
  design bullet, the 20-run check with its log, the fallback and the stop, the handoff), with pointers in the header,
  the repository rules, the files table and ownership sentence, step 0 and step 3, criteria MP10b2-T07 and T08, the
  test plan and the definition of done.
- `tasks/difficulty-v3/check-list.md`: MP10b2's rows in §2, the wave table and "Exclusive ownership". The
  orchestrator set KI-1's status in "Known issues" (assigned to MP10b2 Amendment D1; closed when MP10b2-T08 passes,
  after which MP17 has no re-run allowance).

**Late clarifications.** MP10b2 was dispatched while this section was being finished (its first code change is at
09:20). Three clarifications reached D1 after the dispatch, before 09:27; none changes the contract, the Node cases or
the files:
1. "Why" lists the five failure messages of MP09e's runs (the visible message depends on the step that lost its
   worker) and says that `dbg31`'s failing worker is BA09's first, `packHash`'s.
2. The 20-run check's KI-1 signature is "a failed check whose message is one of the five of 'Why', or any failed check
   whose message contains 'Puzzle code processing failed'". The first text said "a worker `error` and 'Puzzle code
   processing failed'", which a page run cannot see and which misses four of the five messages.
3. The ownership row is named "§2 'Exclusive ownership'" (the first text said "§5").

The orchestrator may pass item 2 to the developer as an addendum.

KI-1 PLACED

## 10. MP12 tranche: TP20-TP28 (MP12a, MP12b1, MP12b2)

SA2's review: [`../gpt-6-astra/6-review-of-task-pack.md`](../gpt-6-astra/6-review-of-task-pack.md) § "MP12 tranche"
(2026-11-13; MP11 committed as `a85ed55` during it). All nine findings are accepted; none is disputed. The fixes use
MP11's delivered interfaces at `a85ed55`: `run(argv, overrides)` of `tools/calibrate.mjs` with its `onInterrupt`
hook, `reportBase`, the checkpoint and the exit codes 0, 1 and 2; `aggregateLandscape` with `v3: null`,
`requestInBandRate` and `sampledUnrateable`; the run records' `details.sampleFailures`; `computeSourceDigest` over
`SOURCE_FILES`. They follow the orchestrator's fairness rule: at least 15 s between locked runs, one bounded run per
lock, no lock held across a series.

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| TP20 the timing lock and a bounded, resumable landscape | Major | Accepted | check-list §7 "Shared-machine lock protocol" (new: the helper `Invoke-Dv3Timed`, fairness, the 590 s bound, the process-tree stop), §2 step 2, §7 intro and GL-P3 row; MP12a "Run control" (new: the launcher `launch.mjs`, staging, exit codes, publication, self-test, fake-tree check), round step 1, the probe driver, the between-round checks, GF-P2 and GA-P2, test plan; MP12b1 and MP12b2 below |
| TP21 diagnostic sampling failures are not capped accepted puzzles | Major | Accepted | MP12a C5, "Diagnostic samples are not accepted puzzles", "Choosing a change" (C5), the criteria script (cases 1 and 2); check-list D29 |
| TP22 C2 counts request success, its trigger counted puzzle hits | Major | Accepted | MP12a C2, the fit input, "Choosing a change" (the availability branch), round step 4, the criteria script (case 3), MP12a-B01 and T03; check-list D29 |
| TP26 the four D36 and fixture re-pins | Minor | Accepted | MP12a "The D36 and fixture re-pins" (table, commands A and B), "Pinned tests", the between-round checks (both D36 slow tests) |

**TP20.**

- The lock. SA2 is right: announcing is not the lock protocol, and this pack's check-list had none. MP09e and MP10b2
  used task-local `Invoke-Locked` helpers that create the lock with `Set-Content` (not exclusively), do not recheck
  the other lock and neither bound nor clean up the command. Check-list §7 now has the protocol and one helper,
  `Invoke-Dv3Timed`, on the model of the Sudoku helper (`dv3-timing.lock` here, `dv3-sudoku.lock` there; exclusive
  create, recheck, back-off after a race, removal of its own lock only). It puts the fairness rule in the helper
  itself (15 s after every release, so any loop of locked runs leaves the gap), bounds each invocation at 590 s with
  a deepest-first stop of the process tree, measures the lock wait apart and passes `D21_OUT` through
  `-Environment`. `npm test` and the quick set run as their `package.json` node commands through it. Checked in a
  scratch lock folder: exits 0 and 3, an environment value with a space, a two-process fake tree stopped at 5 s with
  both processes gone and the lock released, a 10 s wait for the other lock, a missing lock folder (it throws at
  once), and a relative lock folder from a PowerShell location other than the process directory. That last check
  found a defect of my first text: `[IO.File]::Open` resolves a relative path against the process directory, so the
  helper now resolves the folder first.
- The launcher. MP12a creates `docs/difficulty-v3/landscape-v3/launch.mjs` exactly as given (about 400 lines with its
  self-test); MP12b1 and MP12b2 use it read-only. It calls MP11's `run(argv, { onInterrupt })`
  (`tools/calibrate.mjs:454-581`) in its own process. The hook requests the pause at 150 s and `calibrate.mjs`
  finishes the row in progress (child limit 400 s, `:46`), so an invocation ends by about 555 s, inside the helper's
  590 s. The exit codes separate the scheduled pause (3: the identical command again) from an unexpected stop (2), an
  unusable checkpoint or invalid input (1) and completion (0, also when the pause fell into the last row, which
  `calibrate.mjs` reports as 2). A paused invocation that recorded no row is 2, so a resume loop cannot spin.
  `--restart` and an output outside `tests/artifacts/` or without a date are refused: a dated base keeps `reportBase`
  (`:436-441`) and the checkpoint name stable across midnight, and the staged files are the ones `calibrate.mjs`
  rewrites at every resume (`:577-578`). `publish` checks completeness, the rows against `expectedRuns`, the reps
  0 to n - 1 of each case (so no row twice), that no row was interrupted, the source digest and versions against the
  tree, and the Markdown; it never overwrites, then copies both files and deletes the checkpoint. 22 self-test cases;
  each of 16 single-condition mutations fails the self-test. SA2's "exit 2 after the scheduled pause means resume"
  is kept in substance as the launcher's exit 3, because `calibrate.mjs` returns 2 in both situations.
- The other timed commands. Every capture and rating command of MP12a runs under the helper with a 570 s bound
  (TP20's R/A/S bound, applied to the slice too). A pack whose rating exceeds it stops the task: `rate-probe --pack`
  has no puzzle selector, so splitting by puzzle ids has no tool, and a request is never regenerated. The
  between-round checks, the D36 slow tests, GF-P2, the strict checks and both GA-P2 runs go through the helper; the
  first GA-P2 run keeps its evidence through a TAP reporter destination, since the helper does not redirect output.

**TP21.** C5 keeps only the accepted-path half: no `capped` line among the canonical `prod` re-ratings of the captured
accepted puzzles. `sampledUnrateable` is reported per cell with its denominator (the rated samples plus
`details.sampleFailures`), never gates and never feeds the cap rule; a request without a set has no samples. The
criteria script's cases 1 and 2 are SA2's pure cases.

**TP22.** Two names: `requestCompletionRate` (C2; MP11's `requestInBandRate`) and `puzzleRescoreHitRate` (MP06c's fit
and P-OD3). The `SHARES` or `K60` trigger is now the measured C2 failure, or a cell without puzzles (C1
unavailable). Because the current tuple has 100 % rescore hits and distance 0 on a v3-made corpus, the grid is run
once to show it and never schedules an unchanged round. The task prepares one evidence-based trial (the request
outcomes, K against `pieceCountRange`, and at most one serial capture per failing cell under MP09d2's `spent.mjs`
showing where the rated scores fall against the band), records it and stops for the orchestrator's go-ahead, or
stops with the numbers. The three-round ceiling stays. SA2's pure case is case 3 of the criteria script. The penalty
comparison of P-OD3 keeps the grid and now says that the corpus favours the current knobs.

**TP26.** MP12a has SA2's four-row table: the 15 x 20 Nightmare test re-pinned from the checked output of the same set
attempt (command A); the UI-flow recipes migrated only after complete batches; the unrateable input re-observed after
any knob change under MP09d2's observer (command B, `avail.mjs --attempts 1`) and replaced only by the rule of
MP09d2's record §3.3, or a stop; the generation fixtures by GF-P2 only. "Pinned tests" says that a `DEDUCE` change
needs current deduction inputs before `breakdownV3`. The between-round checks run both D36 slow tests. MP12b2's
change round refers to the table.

MP12a READY

### The rest of the tranche: TP23, TP24, TP25, TP27, TP28 (MP12b1, MP12b2)

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| TP23 the Hell report named a producer that does not supply its fields | Major | Accepted (SA2's first fix: a companion population) | MP12b2 GS-P3 table (HL row), "The Hell companion HL" (new: `flow-case.mjs` with its exact block, the rep rule, the manifest, what it gives, the stop), the summary contract (censored rows, one TOTAL row per population), record §6 and §7, files table, B02, T07, test plan (block HL); MP12b1 `coverage` entries of the aggregate (the selected report's path); check-list ownership and GS-P3 rows |
| TP24 the fail-fast check did not evaluate the combined mechanism or censored tails | Major | Accepted | MP12b2 "The fail-fast proposal" item 3 (new durable `failfast.mjs`: F1, F2 and F1 + F2 on the effective prefix, completed baselines, outcome categories, four self-test cases) and item 4 (the notice as an observation), record §10, B03, T04, test plan |
| TP25 the lock and the area decision need final-source evidence, also after a change round | Major | Accepted | MP12b2 "Evidence provenance and the final tuple" (new: the identity of each block, the reuse argument for MP09d2's observations, the availability probe again, boundaries from final-tuple observations only), the owner's question, "Findings and an ordered change round" (six ordered steps, new paths), the lock evidence, record §1, T02, T05, T08, test plan (`Identity`, the reuse check, the availability block); MP12b1 slice reuse by source identity and `aggregate.mjs` writing into its `--full` folder; check-list ownership and GS-P3 rows |
| TP27 null metrics; the D37 waiver against missing coverage | Minor | Accepted | MP12b1 `aggregate.mjs` (new: selection by name, the P-OD6 protocol, validation and statuses, exit 2 on a gap, the protocol coverage table, null-guarded lists, self-test cases (a)-(f)); MP12a criteria script and "Missing values"; MP12b2 record §3 |
| TP28 stale inert-stall wording; an unguarded S block | Minor | Accepted | MP12b2 Goal, scope, inputs, the stall section, record §8, B04, T03, test plan (`$runStallRecheck = $false`, S inside the guard) |

**TP23.** I took SA2's first fix. HL is one labelled diagnostic replay for each of the 20 Hell cases that H does not
cover (Hell 1 on the 12 boards, Hell 2 on 18x20, 20x20, 20x21, 32x15, 22x22, 24x24 and 26x26, Hell 3 on 26x26; MP11's
matrix at `a85ed55` has 25 Hell cases, all rotation 0, `any`, quantity 10, 20 repetitions). Its driver
`flow-case.mjs` is `flow.mjs` with two edits only, the header and the argument block, given exactly: the case comes
from `buildLandscapeMatrix`, so `15x15b10` keeps its blocked cells, and the seed from `seedFor`
(`landscape/<case id>/<rep>`, batch seed `#1` as the landscape's `batchIndex` 1). I ran the block without
generating: the expected board, level, seed and label for a valid case, and exit 1 for an unknown case and for a rep
of 20, -1, 1.5 or none. The rep is the selected report's lowest complete rep, else its lowest rep with a puzzle, else
rep 0. The limit is 570 s, or 180 s for a cell without a landscape puzzle. A manifest names each input, the rule,
the limit, the outcome, the final event and the identity. Each population's ratios are its own: zero accepted
puzzles is unavailable, never 0, and a censored row is marked. A landscape cell with puzzles whose replay accepts
none within 570 s stops the task. While writing the summary contract I found that puzzles accepted from the
calibration have no `accepted` event: a censored file now counts the `slot` of its last `accepted` event, else the
`fold-start` event's `fromCalibration`. MP12b1's aggregate JSON now fixes the shape of its `coverage` entries, so
MP12b2 reads the selected report's path instead of guessing it. SA2's alternative, an earlier tooling task, would
change MP11's committed run schema, which the browser benchmark shares. I did not choose it.

**TP24.** `failfast.mjs` is durable and has SA2's definitions. F2 cuts a call after four capped raw attempts and is a
false stop only when that call succeeded. F1 fires at the first set attempt whose raw attempts are all capped. F1 + F2
walks the set attempts on the prefix that F2 leaves: a cut successful call is a false stop, and the walk ends there.
Otherwise F1 is judged on that prefix: a false stop when a later set attempt succeeds, a correct stop in a completed
baseline (a file with an `end` event), and unknown in a censored tail. The report gives, per mechanism, the completed
baselines, triggers, observed false stops, correct stops and unknown outcomes. The self-test covers SA2's four cases;
its combined case gives 0, 0 and 1 false stops. The proposal is worded "no false stop observed in N completed
baselines". The notice is an observation in English and Vietnamese. Serial and two-worker times stay apart, and a
time saving is a counterfactual estimate.

**TP25.**

- **Identity.** `Identity` prints `sourceDigest`, `versions`, HEAD and the core/tools state into `runs.md` before and
  after every block. It stops when `sourceDigest` or `versions` differ from MP12b1's aggregate `source`, or from the
  change round's aggregate after an ordered change round.
- **Reusing MP09d2's observations.** They count only with a quoted reuse argument:
  - `git diff --stat eea5fed -- core/engine` and `git status --porcelain -- core/engine` print nothing;
  - the versions are equal;
  - the knob literals of MP09d2's record §1 equal the tree's, because its captures ran before its commit.

  At `a85ed55` all three hold: both git commands print nothing, and `SCORE_V3`, `DEDUCE` and `STALL_LIMIT` 12 equal
  §1.
- **Availability probe again.** Without that argument, the six availability captures run again on MP09d2's exact
  boards, seed and file names (999 s at MP09d2).
- **Boundaries.** Option (i)'s boundaries come from final-tuple observations only.
- **Change round.** It runs in six ordered steps:
  1. enumerate the evidence, where a global change reaches every case and population;
  2. the re-pins by MP12a's TP26 table;
  3. the between-round checks;
  4. the evidence again in new paths (`landscape-v3-change-1/`, `search-<date>/change-1/`), with the selected-report
     map and the aggregate rebuilt;
  5. GF-P2 and GA-P2;
  6. the stops.

  `aggregate.mjs` writes into its `--full` folder for that purpose.
- **SA2's last paragraph.** MP12b1's reuse of MP12a's slice by equal measured identity, with MP12a's commit named,
  answers it.

**TP27.** MP12b1's `aggregate.mjs` selects one report per case by name and never reads an `-s3` report beside the
20-request report of the same case. It derives the P-OD6 protocol, validates completeness, the reps, the row keys and
one shared identity, and gives each case a status: `measured`, `reduced (D37, P-OD6)`, `missing` or `invalid`. On a gap
it exits 2 without writing. Its coverage table shows the protocol N beside the shared aggregator's "3 / 20". The
lists have SA2's null guards. Its six self-test cases include SA2's three pure cases and the `v3: null` case that
threw in SA2's probe.

**TP28.** The Goal states MP09d2's outcome (not inert, 10 firings at N = 12). `$runStallRecheck` starts `$false`. It
is set by hand only from a recorded D21 decision, never by searching for the word. The S capture, the file listing
and the simulation are inside the guard.

**Machine time** (SA2's "Machine time, stop points and disposition"). I took the corrections:

- MP12a's 30-60 minutes per round is provisional and re-projected from the first cases.
- MP12b1 is 9.5-14.5 hours, plus lock waits and 15 s per invocation.
- MP12b2's header gives expected times with the upper bounds of its limits in brackets: R and A 20-40 minutes [190];
  H 25 [25]; HL 60-90 [190]; the availability probe 16 [57], only when needed; the lock commands about 10 minutes.
- A change round is budgeted from its enumerated evidence.
- The listed stops are kept, and the timeout, missing-producer and stale-evidence stops are added.

**Checks of the new text** (scratch only, nothing generated):

- The MP12b2 test-plan block ran on a stub tree with a private lock folder, in two passes. The first pass ended at the
  HL stop, with the manifest kept. The second ran the availability branch, the summaries, S skipped, the lock commands
  and the identity rows. A rerun skipped the HL cases of the manifest and the availability files already captured.
- Every PowerShell block of MP12a, MP12b1, MP12b2 and the check-list parses.
- The identity one-liner at `a85ed55` gives digest `b4aa119a…` with `gen-v3`, `mixed-v2`, `xoshiro128ss-v1` and
  `difficulty-v3`.

**Questions.** None for the owner or the plan author. The `SHARES` or `K60` trial of MP12a's availability branch
needs the orchestrator's go-ahead under SA2-Q-P09 branch A. D36 (P-OD5) and D37 (P-OD6) apply as decided.

MP12 FIXED

## 11. MP12 re-verification: TP29-TP33 (MP12b1, MP12b2)

SA2's re-verification ([`../gpt-6-astra/6-review-of-task-pack.md`](../gpt-6-astra/6-review-of-task-pack.md) § "MP12
re-verification", 2026-11-13, at `a85ed55`; the pack snapshot is `f33aa71`) verified MP12a and kept MP12b1 and MP12b2
blocked on TP30. All five findings are accepted; none is disputed. MP12a is dispatched and frozen: TP29 went to its
developer as SA2 wrote it, and TP30 needs no change of MP12a (below), so this section adds no MP12a addendum.

| Finding | Severity | Disposition | Where |
|---|---|---|---|
| TP29 an explicit interrupt must not become a scheduled resume | Minor | Accepted as SA2 wrote it (an MP12a developer addendum, passed by the orchestrator) | MP12a only. MP12b1 and MP12b2 resume only on exit 3 and stop on any other exit, so an interrupted invocation (now exit 2) stops them: no change |
| TP30 a change round regenerated the data but not the C1-C5 evaluation | Major | Accepted | MP12b2 change round steps 1, 4, 5, 7 and 8 (new: the slice criteria from a new probe corpus with `criteria.mjs`; record §4 replaced) and its PowerShell block, record §2-§5 and §11, the lock evidence, files table, ownership, implementation step 5, header, T05, T09 (new), test plan (`$criteriaFolder`, `Assert-CriteriaSource`, the synthetic 95/90/80 handoff check); MP12b1 `aggregate.mjs` (the change round's `slice` subfolder); check-list D29, GL-P3 and ownership rows |
| TP31 prescreens read for the protocol, excluded from the aggregate | Minor | Accepted | MP12b1 `aggregate.mjs` steps 1-4 (prescreens first, the protocol from them alone, then the selection and the validation), self-test cases (g)-(i), T02, T05; check-list ownership row |
| TP32 the optional narrower rerun is incompatible with the strict aggregate | Minor | Accepted | MP12b2 change round step 1 (the exception removed: the complete population whenever the identity changes) |
| TP33 script paths and change-round data paths | Minor | Accepted | MP12b2 test plan (`$s` for the scripts, `$data` for everything written, the change round's three values), change round step 6, files table; check-list GS-P3 row |

**TP30.**

- **Where the slice goes.** A change round publishes its 18 GV2 cases into `landscape-v3-change-1/slice/`, the layout
  of an MP12a round folder. MP12a's read-only `criteria.mjs` therefore runs on it unchanged, with exactly one report
  per GV2 case. Every other case, the prescreens, the shard table and the aggregate stay in the parent folder.
  MP12b1's `aggregate.mjs` takes `slice/` as its `--slice` and searches the full folder without its subfolders.
  SA2 placed the probe in `landscape-v3-change-1/probe/`. Putting it under `slice/` instead keeps the script's folder
  rule satisfied, so MP12a needs no addendum. MP12a's 12:32 draft of the script confirms this (untracked, read only:
  `docs/difficulty-v3/landscape-v3/criteria.mjs:320-336`): any dated JSON of another case in the round folder, the
  aggregate and the prescreens included, is an input error, so the parent folder could not be the `--round`.
- **The probe corpus.** It is MP12a's procedure for the same 90 requests, label `prod` only, run through the helper
  at 570 s, into `slice/probe/`. No result of an earlier tuple stands in for it.
- **The criteria table.** It goes to `landscape-v3-change-1/criteria-<date>.md` and replaces MP12a's reference in
  record §4. P-OD1 and P-OD2 are recomputed; P-OD3 stays labelled with MP12a's tuple.
- **Stops.** A failed or unavailable criterion, or an input error of the script, stops the task before the record
  and the lock.
- **The handoff check.** `Assert-CriteriaSource` checks that every GV2 report behind record §4 carries the locked
  tree's identity. It runs in both paths:
  - without a change round, on MP12a's final round; it fails there only if MP12b1 could not reuse the slice, and
    that is a stop;
  - after a change round, on the change round's `slice/`.

  SA2's example is a synthetic check that runs before §4: the GV2 rate is 95 %, an old tuple's 90 % passes C2 and
  the new tuple's 80 % fails it. Under the new identity the old folder is refused and the new one is accepted.

**TP31.** `aggregate.mjs` now works in this order:

1. It reads and validates the 25 prescreens with N = 3. A missing or invalid prescreen leaves its level's protocol
   underivable, which is a stop.
2. It derives the protocol from the prescreens alone. The boundary case keeps its role even when its full run makes
   a puzzle, and no second case is promoted.
3. It selects one report per case. A prescreen of a 20-request case is never appended to the run list:
   `aggregateLandscape` counts every row and does not deduplicate by rep, so the case shows 20, not 23. A 20-request
   report outside the plan is `invalid`.
4. It checks one identity across every report it reads, the prescreens included.

Self-test (g) is SA2's case; (h) is the double count; (i) covers a missing prescreen and a report outside the plan.

**TP32.** The narrower variant is gone. Every allowed change edits a file of `SOURCE_FILES`
(`tools/bench/report.js:37-48` lists `policy.js`, `levels.js` and `clues.js`), and the aggregate accepts one shared
identity. A change round therefore reruns the complete population in new folders. The orchestrator gets its
projection first: about 12-18 hours, including the probe corpus. Reusing cases across identities would need its own
data contract, outside this pack.

**TP33.** The test plan keeps `$s` for the four scripts and `$data` for everything it writes. A change round sets three
values:

- `$data = "$s/change-1"`;
- `$full`, the change aggregate, which gives `$ref`, `Identity`'s reference and HL's selected reports;
- `$criteriaFolder`.

The HL manifest lives under `$data`, so a change round starts a new one. The scripts are never copied: `observe.mjs`
imports `../d21-2026-11-12/register.mjs` from its own folder. A forgotten `$full` fails closed, because `Identity`
stops on the changed digest.

**Checks** (scratch only, nothing generated):

- **MP12b2 test-plan block, normal path.** It ran on a stub tree with a private lock folder. MP09d2's observations
  were reusable, so there were no availability captures, and `Assert-CriteriaSource` passed on a stub of MP12a's
  final round.
- **Change-round path.** It ran on the same tree after an engine change:
  - every capture, the availability probe and the tables went under `change-1/`, with a new HL manifest whose three
    cases were captured again from the change round's reports;
  - the scripts were loaded from `$s`, and the first pass's files were left untouched;
  - the change `slice/` was accepted, and MP12a's final round was refused under the new identity.

  A third run, with `$full` left at MP12b1's aggregate, stopped at the first `Identity` without writing a capture.
  The synthetic handoff check refused the old table in both passes.
- **Change-round shard block.** On stubs it resumed after a scheduled pause, published a GV2 case into `slice/` and
  a Hell prescreen into the parent folder, and called the aggregate and criteria scripts with the expected arguments.
  It left no lock.
- **Parsing and repository check.** Every PowerShell block of MP12b1, MP12b2 and the check-list parses, and
  `npm run check` passes.

**Questions.** None for the owner or the plan author; no threshold changes, and D36 and D37 are not reopened.

MP12b FIXED

## 12. Schedule: MP13+ beside MP12b

The orchestrator asked (2026-11-13 12:53) whether MP13a-MP16b can run while MP12b1 and MP12b2 run their captures,
at what risk and for what gain. Read at `f33aa71`: the task files MP12b1-MP17, the check-list, `plan.md`, report §5.2,
`tools/calibrate.mjs`, `tools/bench/runner.js`, `core/engine/policy.js` and the lock helper of the Sudoku check-list.
Nothing was run; no task file and no check-list row was changed.

### 12.1 What MP13a-MP16b take from MP12

| Task | Locked values, `POLICY_ID`, areas | Fixtures and recipes | Files shared with MP12b1 or MP12b2 |
|---|---|---|---|
| MP13a | none: `provenanceVersions()` reads the ids at run time; `SKIP_BOUNDS` come from `BUDGETS` and the loop constants, which no MP12 change may touch (D29, D19); `level(id)` checks ids, not areas | the recipe of `generation-case.json`, compared with the run; case 6 needs a candidate at slot 1, attempt 0; cases 1-5 use scripted seams or compare with the run | only in a change round: the `STALL_LIMIT` line of `clues.js`, the knob-dependent pins of `tests/clues.test.js` and `tests/generate.test.js` |
| MP13b | the replay fixture stores `currentVersions()` and eight 10 x 6 Hard puzzles made with the current knobs | `tests/fixtures/replay-case.json` (new, GF-P4) | only in a change round: `tests/generate.test.js`, as MP13a |
| MP14a | none: `rateDetailed` is compared with `rate`; the meter logs are pinned on scripted ratings (`req-0`, `req-2`, S6) and uniqueness counts | the recipe, compared with the run | only in a change round: `clues.js` (`STALL_LIMIT`) |
| MP14b | none (`pieceCountRange` is computed) | the recipe; cases 3 and 4 need candidates at slot 1, attempts 0 and 2 | none |
| MP15a1 | `REPLAY.work = 256 * (DEDUCE.work + DEDUCE.census)` (D33): its pin follows a change of either cap | the fixture, compared with the run; case 16 only measures | only in a change round: `policy.js`, `tests/policy.test.js` |
| MP15a2, MP15b, MP16a | none | the fixture (steps, a worker payload, a real replay), compared with the run | none |
| MP16b | none | the replay page uses the fixture; `generator-flow` and `acceptance` generate with the current knobs | none (MP12b2 may add one sentence to the brief's "Levels and typical boards", MP16b edits another paragraph); under D36 (i) MP12b3 edits the areas, design §7.5, the brief and both user guides |

No task needs a locked value. Report §5.2 draws MP13-MP17 after the lock with the rule that they "must not change any
rating or generated puzzle (the recorders are observers; provenance does not change outputs ...)", a rule about
outputs, and the plan's P4 "Order" says that P4.1 and P4.2 "do not depend on v3 and can ship first". The only artefact
bound to the knobs is `tests/fixtures/replay-case.json`; one pin follows `DEDUCE`, and three recipe cases assume that
a given attempt makes a candidate.

What the side tasks do need is MP12a's commit. MP12a changes the knob values, re-pins `tests/clues.test.js`,
`tests/generate.test.js`, `tests/policy.test.js`, `tests/difficulty-v3.test.js` and the UI-flow recipes, and re-records
the generation fixtures: files that MP13a, MP13b and MP15a1 extend or read. After MP12a, and without a change round,
`rating-v3` receives only records and documents (MP12b1's folder; MP12b2's folders, record, design §7.5 and §7.8, at
most one sentence of the brief), which no side task edits. Starting before MP12a's commit would gain at most one task
and invite merges in the files MP12a re-pins: not recommended.

### 12.2 Risk (a): perturbing the captures

- **Outcomes, not only times.** The landscape's results depend on the wall clock: the pool stops dispatching a request
  after `TIME.dispatchStopMs` = 115 s (`core/engine/policy.js:66`, `core/browser/worker-pool.js:364` and `:643`),
  the runner stops a row after 400 s (`tools/calibrate.mjs:46`, `child-timeout`; the launcher keeps the default) and
  waits 30 s for certificates (`tools/bench/runner.js:75`). MP12b2's capture limits are recorded outcomes. Load beside
  a capture lowers completion (C2) and moves partial outcomes, so the lock protects the evidence itself.
- **The rule exists.** From MP12a on, check-list §7 sends every command of more than about 10 s (the quick set,
  `npm test`, the slow tests, `tools/record-fixtures.mjs`, browser pages) through `Invoke-Dv3Timed`, one bounded
  command per acquisition. Two gaps remain:
  1. MP13a-MP17 were written before it. Their command blocks run `node --test`, `npm run test:quick`, `npm test` and
     the browser runner directly and never mention the lock. That needs Amendment L1 (12.4) in either schedule.
  2. The lock does not protect the checkout. Each landscape row is a fresh Node process that imports
     `core/engine/*.js` from the working tree (`--fresh-process`, `tools/calibrate.mjs:326`). A side edit in progress
     changes what later rows run, and every report's `meta.sourceDigest` covers `SOURCE_FILES`, so MP12b1's
     aggregate refuses the mixed identities and the landscape is lost. Both would also write `tests/artifacts/`
     (check-list §3). Work beside MP12b therefore needs a second worktree; no rule replaces it.
- **Unlocked commands.** `node --test` runs files in parallel, up to 15 processes on this 16-thread machine (64 GB),
  so any run of several files belongs under the lock. Editing, read-only git, `npm run check` and one test file run
  with `--test-concurrency=1` that ends within 10 s can stay outside.
- **Three lock users.** Both helpers stop waiting after 10 minutes (`Invoke-Dv3Timed` here; Sudoku's
  `Invoke-Dv3Node`, `$until = (Get-Date).AddMinutes(10)`). Today a waiter waits for one holder, which releases within
  about 10 minutes. With the landscape (at most 590 s), a Sudoku measurement (at most 540 s) and a side run taking
  the slot in turn, a waiter can see it taken for more than 10 minutes. The throw ends MP12b1's shard block
  (`MP12b1-full-landscape.md:115-118`) or the Sudoku command until someone restarts it: guard G3.
- **Cost.** The side stream holds the lock for about 30-60 minutes in all (per task 1.5-2.5 minutes of targeted
  runs, the quick set and the orchestrator's re-run; GF-P4 7-25 minutes; GB-P4 5-15 minutes), and MP12b lasts about
  as much longer. Each side run waits about 5 minutes on average for the current invocation: about 3-5 hours over the
  chain, off the critical path.

### 12.3 Risk (b): a change round after the side chain

It does not fit inside MP12b2's change round: the side commits are not on `rating-v3` then, and MP12b2 would have to
own GF-P4, GB-P4 and the side tests. It belongs to an integration task after the lock (MP16c, 12.4). When the locked
tuple differs from MP12a's, MP16c re-pins:

1. `tests/fixtures/replay-case.json`. `--replay-case --check` compares the whole text, versions included. Re-record
   with `--replace --seed <n> --reason <text>` when seed n still meets MP13b's conditions and qualifies, else with
   `--search` and MP13b's selection rule; then `npm test`.
2. The `REPLAY` pin of `tests/policy.test.js`, when `DEDUCE.work` or `DEDUCE.census` changed and MP15a1 pinned `work`
   as a number (nothing when it pins the D33 expression).
3. MP13a case 6 and MP14b cases 3 and 4, only when the new `RECIPE.expected` leaves slot 1 without a candidate at
   attempt 0 or 2: the nearest attempt with the same `start`.
4. The merges with the change round's own edits: `policy.js` (`REPLAY` beside the knobs), `clues.js` (`STALL_LIMIT`
   beside the recorders), `tests/policy.test.js`, `tests/clues.test.js`, `tests/generate.test.js`.
5. GB-P4 again (the replay page uses the fixture; two pages generate with the knobs).

That is about 1.5-2.5 hours instead of 0.5-0.75. A change round is ordered after MP12b2's first pass, when the side
chain has normally finished. The owner's D36 answer comes at the same point: (i) adds MP12b3's areas and texts (text
merges and GB-P4 again); (iii) changes nothing now; (ii), a different contract for Hell, may change `selectClues`
itself, which MP13a and MP14a instrument: the side stream then stops at its next task boundary and MP16c is planned
with the new task.

### 12.4 Proposal: a side stream from MP12a's commit

| Task | Dependency now | Proposed |
|---|---|---|
| MP12b1, MP12b2 (MP12b3) | as written | unchanged, in the main checkout on `rating-v3` |
| MP13a | MP12b2 (the lock) | MP12a (accepted and committed), in the side worktree on `rating-v3-steps` |
| MP13b-MP16b | the previous task | unchanged, accepted and committed on `rating-v3-steps` |
| MP16c (new) | - | the lock (MP12b2, or MP12b3 under D36 (i)) and MP16b |
| MP17 | MP16b and the lock | MP16c |

The two streams share only the timing lock. Guards, as check-list text for the orchestrator's decision:

- **G1 Worktree.** The orchestrator runs `git worktree add -b rating-v3-steps ../pentomino-steps <MP12a commit>`.
  Side developers work and run commands only there, never in the main checkout; the orchestrator's re-runs of a side
  task also run there, under the lock. A side commit holds the task's product files only; pack files
  (`tasks/difficulty-v3/`, logs, addenda) are committed on `rating-v3` only. Before each side dispatch the
  orchestrator runs `git -C ../pentomino-steps merge --no-edit rating-v3` while `rating-v3` holds only pack, record
  and document commits since MP12a, so the worktree reads the current pack; after a change round's first commit,
  addenda go in the dispatch prompt instead. `rating-v3` receives no side commit before MP16c; MP12b2's identity
  checks would refuse the changed digest anyway.
- **G2 Amendment L1** for MP13a-MP17, needed in the serial schedule too:

  > **Amendment L1 (lock).** Run every command of the test plan that takes more than about 10 seconds or runs more
  > than one test file (the targeted runs, `npm run test:quick`, `npm test`, `tools/record-fixtures.mjs`, the browser
  > runner one page and phase at a time) through `Invoke-Dv3Timed` of check-list §7, saved as
  > `tests/artifacts/<task id>/dv3-lock.ps1`, with the command's node arguments (`npm run test:quick` is
  > `--test --test-skip-pattern=slow tests/**/*.test.js`, `npm test` is `--test tests/**/*.test.js`). Only
  > `npm run check` and one test file run with `--test-concurrency=1` within 10 seconds run without it. The reply
  > gives each invocation's seconds and lock wait.

- **G3 Wait limit.** In the helper of check-list §7, `-ge 10` becomes `-ge 30` ("within 30 minutes"), for MP12b1
  (with TP34), MP12b2 and the side stream, and the Sudoku helper's `AddMinutes(10)` becomes 30 while both pentomino
  streams run (SA2's pack). One holder still releases within 10 minutes, so a stale lock is still reported, later.
- **G4 Acceptance.** A side task is accepted on MP12a's knobs: `record-fixtures --check` and the quick set pass on the
  side branch. Check-list §6's "after the lock" rule and MP13a's "loops at the lock" check are proven again on the
  locked tree by MP16c. On `rating-v3` the lock commit precedes every MP13-MP17 change, as report §5.2 draws it.

**MP16c, integration on the lock** (new; Small, or Medium with gates after a change round). After the lock commit,
with the main checkout idle, the orchestrator runs `git merge --no-ff --no-commit rating-v3-steps`. The developer
resolves conflicts in content only (both sides' additions kept, the locked values from `rating-v3`) and runs under
the lock: the quick set, `npm run check`, `record-fixtures --check` (the locked generation fixtures: MP13a-MP16b
change no output), `record-fixtures --replay-case --check` and `npm test`. When the locked tuple equals MP12a's, a
difference in either check is a defect for the owning task; when it differs, the re-pins of 12.3 and GB-P4 follow,
each named in the reply. The orchestrator then commits `difficulty-v3 MP16c: ...`, removes the worktree and deletes
the merged branch. D35 still finds the lock as the latest `difficulty-v3 MP12b` commit.

**Time** from MP12a's commit (MP12b1 and MP12b2 from their headers; MP13a-MP16b at the commit-to-commit pace of
MP08-MP11, 6-78 minutes a task, GF-P4 and GB-P4 included; MP17 from its header):

| | Serial (now) | Side stream |
|---|---|---|
| MP12b1 and MP12b2 | 13.5-20 h | 14-21 h (the side stream's lock time added) |
| After the lock | MP13a-MP16b 5-7 h, MP17 2-2.7 h | MP16c 0.5-0.75 h, MP17 2-2.7 h |
| Total | about 20.5-30 h | about 16.5-24.5 h |
| With a change round (12-18 h) | about 32.5-48 h | about 29.5-44 h (MP16c 1.5-2.5 h) |

The side stream saves about 3-6 hours, or 1.5-5 hours with a change round. The side chain (5-7 hours, plus 3-5 hours
of lock waits) fits inside MP12b1 and MP12b2. Serially the pack ends those hours later, not a day: the long parts,
the landscape and a change round, are the same in both schedules.

**Recommendation.** Take the side stream if G3 can be applied in both repositories; it costs MP12b about 30-60 minutes
and adds one integration task. Without G3, stay serial: a third lock user would then stop MP12b1's shard block or a
Sudoku measurement whenever two holders keep a waiter out for 10 minutes. Either way, MP13a-MP17 need Amendment L1.

**Owner.** The integrated history keeps report §5.2's order and its rule (MP16c proves them on the locked tree); what
changes is when MP13a-MP16b are developed. The plan allows P4.1 and P4.2 first, so I see no owner decision, only a
notice. If the orchestrator finds it material, the question is (a) the side stream with G1-G4 and MP16c, or (b) the
serial order; I recommend (a).

SCHEDULE PROPOSED

**Orchestrator decision 2026-11-13: serial (the critical path is sudoku).** About 40 Sudoku tasks remain after its
recovery tasks, so the whole job ends with Sudoku in either schedule; a pentomino side stream would not move that end,
and it would add a third lock user that slows Sudoku's runs. The plan's sequencing is unchanged: G1, G4, MP16c and the
Sudoku half of G3 are not adopted. Applied, as the parts that hold in either schedule (request of 13:17):

- **Amendment L1** in MP13a, MP13b, MP14a, MP14b, MP15a1, MP15a2, MP15b, MP16a, MP16b and MP17 (none dispatched). Each
  has a "Repository rules" bullet: save the helper as `tests/artifacts/<ID>/dv3-lock.ps1` and dot-source it, one
  bounded command per lock, the 15 s gap, and what may run without it. Every timed or heavy command block now calls
  `Invoke-Dv3Timed`:
  - the targeted runs and the quick set in every task;
  - GF-P4's search, create, check and `npm test` (MP13b);
  - the GB-P4 pages, one page and phase per invocation, five in all (MP16b; before, one invocation of 8-12 minutes);
  - in MP17 the two fixture checks, `npm test`, the 12 generation runs, `summarise.mjs` (with an output-file
    argument, since the helper redirects nothing), the `rate-probe` runs and the 19 browser runs, one per invocation
    (before, four invocations of 4-10 minutes, which could pass the 590 s bound).

  An `npm test` stopped at the bound runs again as the quick set plus `--test --test-name-pattern=slow`; a GF-P4
  search stopped there resumes after its last printed seed.
- **Wait limit** of the helper in check-list §7: 20 minutes instead of 10. The bullet gives the reason and says that a
  copy saved earlier keeps its 10 minutes until its task ends.
- **Checks** (scratch only):
  - every PowerShell block of the eleven edited files parses;
  - the MP17 generation loop and page loop ran against stubs, with the helper on a scratch lock folder: exit codes
    0, 1 and 2, the skipped row, the digests, one evidence folder per run, the failure list, the throw on exit 2, and
    the lock released;
  - the `summarise.mjs` output capture wrote CRLF lines and kept exit 1, and the edited script parses;
  - `npm run check` passes.

L1 APPLIED

# Pentomino difficulty-v3 — response to the second review pass of the task pack

| Field | Value |
|---|---|
| Date | 2026-11-12 (+07:00) |
| Responder | SA1, claude-opus-5.5 (author of the pack) |
| Review answered | [`../gpt-6-astra/6-review-of-task-pack.md`](../gpt-6-astra/6-review-of-task-pack.md) § "Second pass" (SA2, gpt-6-astra): SP01-SP19; § "Third pass": TP01-TP05 (MP09 series), TP13-TP15 (MP09d2), TP06-TP12 and TP16-TP19 (§4) |
| Source revision | `05fa958` (MP08 committed); MP07 committed as `2b4c5b9`; third pass at `041ff83` (MP09d1 committed) |
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

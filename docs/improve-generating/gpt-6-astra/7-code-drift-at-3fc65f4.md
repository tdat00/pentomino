# Plan version 4: independent code-drift check at 3fc65f4 (Pentomino)

Astra (SA2), 2026-11-16. Independent check; Opus's round-7 file has not been read.
Start: 2026-11-16 13:43:46 +07:00; first recorded shell clock: 13:44:03 +07:00.
End of audit: 2026-11-16 13:58:43 +07:00.

| Field | Basis |
|---|---|
| Planning input | Version 4 of `docs\improve-generating\plan.md` at `d1ae8dd`; the v3 joint report, clarifications through IG-P-Q36, the earlier joint report, speed comparison, provisional summary and executed IGP pack |
| Old runtime | `cd5d17f`, MP12b1 source digest `34cea386...`; the provisional harness was built against this runtime |
| Previously analysed production | `6122dc9` (MP14b); replay and offers subsequently checked at `e5bb721` (MP15a2) |
| Target runtime | `3fc65f4681a53d3984d9218c15efbf696cc3a1a5`, the `rating-v3` merge into main; 27 non-merge commits after `cd5d17f` |
| Worktree | `improve-generating`, HEAD `d1ae8dd4976c5a397bb3c854079a91a4bcbe0048`; merge-base with `origin/main` is `3fc65f4`; clean at the start |
| Scope | Runtime, worker protocol, provenance, replay, Generation steps and its cache; changed tests/fixtures and living specifications; MP17/MP18 evidence and owner decisions; plan sections 2-6 references; prototype edit applicability |
| Method | Read-only Git diffs/logs/blob reads and direct source reads; the latter were checked to equal the target for `core`, `generator`, `tests` and the two living specifications. Read-only scripts inspected constants, source identity and in-memory text edits. No generation, rating, replay execution, benchmark, browser run or test suite |
| Citation convention | Production paths and difficulty-v3 records below are at `3fc65f4`. The improve-generating plan, harness and provisional evidence exist on the feature branch, not at `3fc65f4`; their citations are explicitly to `d1ae8dd` |

**Verdict: breaking changes: no.** There is no **B** finding requiring an owner/supervisor choice or a
change to the plan's scope, rating, admission gates or recorded decisions. There are **8 A adjustments and
4 N findings**. The pack author can absorb the adjustments while breaking tasks.

This is **not** a claim that the old prototype runs unchanged: it has a concrete result-shape incompatibility
despite every textual anchor matching. Version 4 already requires that semantic rebuild before measurements.
Nor is this a gate result, an approved measurement budget or permission to replace old records. The formal
frozen-source receipt and the priced manifest remain prerequisites.

Labels: **Verified** means source or committed-record inspection; **Derived** means a consequence of that
code, not an executed `gen-v4` result. `gen-v4` itself is not implemented.

## 1. Findings

Classes: **B** changes the plan and needs the owner or supervisor; **A** is implementation/preparation within
the plan; **N** leaves the plan's decision or assumption intact.

| ID | Commit and files | Plan affected | Class | Verified evidence at `3fc65f4` | Handling in the plan or task pack |
|---|---|---|---|---|---|
| DR-A01 | `43312ad`, `3d36592`, `9239a39`, merge `3fc65f4`; difficulty-v3 execution record | Introduction; 5.1 prerequisite | N | `tasks\difficulty-v3\check-list.md:637-639`; `docs\difficulty-v3\final-2026-11-15.md:78-141` | MP17 has closed, and MP18a/b are accepted. Use the actual merged source, including `07406cf`, for the receipt; do not freeze at MP17's earlier commit by accident. Closure does not itself evaluate any improve-generating gate. |
| DR-A02 | `13d61fd`, `66bbed9`, `0ed8800`; `policy.js`, `levels.js`, `deduce.js`, `difficulty.js` | 2.1; P2, P6, P7; 6 | N | `core\engine\policy.js:61-123,138`; `core\engine\levels.js:18`; `core\engine\clues.js:79`; `core\engine\deduce.js:1496-1502`; `docs\difficulty-v3\final-2026-11-15.md:117-125,429-431` | The tuple, caps, work meanings and kernel remain the reference. The three-deduction-tier wording is a documentation correction, not a new ladder or score. Preserve the existing equality and memory gates. |
| DR-A03 | `2f2035e`, `43312ad`; levels, availability, MP17 final evidence and bench matrices | 2.2; 4; 5.1/5.2 controls; 6 offers | N | `core\engine\levels.js:22-34`; `core\engine\policy.js:18`; `docs\difficulty-v3\final-2026-11-15.md:443-486`; `tools\bench\calibration-reference.js:126-133,198-201` | Hell withdrawal, no fail-fast, census acceptance and the five failing Nightmare cells are exactly the state v4 anticipates. Keep diagnostic Hell offers in the harness, not production. MP17 does not replace MP12b1 with a new 20-seed landscape or pass a browser offer gate. |
| DR-A04 | MP12b3-MP15b; moved source references, benchmark source list; provisional manifests at feature HEAD | 2.1; P1/P3/P6/P7/C3; 5.1 | A | Mappings in section 5; `tools\bench\report.js:37-49,662-668`; `core\engine\clues.js:650-685`; `core\engine\difficulty.js:312-326` | Use refreshed locations and the new receipt. All 14 variant chains still apply textually; none is thereby semantically certified. Keep `cd5d17f` on historical measurements instead of relabelling them as new-source results. |
| DR-A05 | `77a4ff3`, `7d2f7f6`, `66bbed9`, `6122dc9`; selection/generation, pack and state provenance | P4; 5.1 IG-P-Q28/Q31/Q36; 6 | A | `core\engine\clues.js:45-61,329-344,461,537-544`; `core\engine\generate.js:262-295`; `core\engine\pack.js:49-62,1147-1160,1203-1204,1315-1323`; `generator\state.js:980-992` | Implement the already-required semantic rebase: successful selections return skips; observers and uniqueness charges survive; record-specific bounds and five/seven-key readers preserve old provenance. The old prototype omits `skips`, so a successful candidate reaches `capSkips(undefined)` under the merged generator. This is a known preparation task, not a new design choice. |
| DR-A06 | `cb54ce5`, `e5bb721`, `0d5c257`; replay, task dispatch, protocol and client | 5.1 “only caller”; P4; 6 replay | A | `core\engine\replay.js:419,441`; `core\engine\tasks.js:196-198`; `core\engine\protocol.js:619-629,719-723,742`; `core\browser\generation-client.js:1269-1279` | Qualify the sentence as “the only direct production caller of the engine observer interface”; it remains true. Add the worker/client path to the consumer and round-trip tests. MP15b adds transitive callers, not another observer implementation or a changed nested provenance schema. |
| DR-A07 | `27840d5`, `3a2f14e`, `3d36592`, `07406cf`; Generation steps, replay model, locales and SVG highlighting | 5.1 consumers/recorders; 6 replay and presentation | A | `core\engine\types.js:319-340`; `core\engine\replay.js:765-902`; `generator\ui\replay-model.js:75,284-327,692-706`; `generator\ui\generation-steps.js:410-421`; `generator\locale.en.js:258-329`; `generator\locale.vi.js:253-324` | Preserve the current hidden-by-default table, not the superseded dialog. Map gen-v4's locate/window/rescue observations into its versioned event/step contract, with honest English/Vietnamese descriptions, stable ordering and no displayed noncanonical screen score. This is adoption by an existing consumer, not a new UI feature. |
| DR-A08 | `2daf57c`, `c13aa23`, `3d36592`, `07406cf`; P-OD14, version refusal and history display | 5.1 IG-P-Q34/Q36; 6 replay | N | `core\engine\replay.js:180-183,325-361`; `generator\ui\replay-model.js:692-706,800-812`; `tasks\difficulty-v3\check-list.md:319`; `docs\difficulty-v3\steps-table-2026-11-16.md:150-160` | History puzzles remain playable and retain their provenance, but their old-version generation steps are unavailable in a gen-v4 build. Q34 already chooses this, and later P-OD14 Q3 explicitly chooses the stored-puzzle-only presentation for every unavailable replay. Do not reopen that decision merely because it now has a visible table. |
| DR-A09 | `07406cf`; replay cache and storage | P4 identity; 5.1 Q34/Q36; 6 replay | A | `generator\ui\replay-cache.js:70-76,117-123`; `generator\ui\replay-model.js:967-971`; `core\engine\version.js:3-4`; `tools\stamp-version.mjs:10-45` | A gen-v3-to-gen-v4 change already invalidates cached steps by `ALGO_ID`. Extend cache validity to the full running provenance tuple, including both new table versions, or perform the equivalent version check before serving a hit. Stored versions in the key are not a comparison with running versions; `APP_VERSION` remains `1.0.0`. Add a table-version-only mismatch case. No new owner choice is required to enforce Q36. |
| DR-A10 | `07406cf` over MP15b; app prefetch, auxiliary queue and storage | 4 cost interpretation; 5.1 timed comparator and manifest; 6 browser/memory gates | A | `generator\app.js:144-165`; `generator\ui\replay-cache.js:129-160`; `core\browser\auxiliary.js:162-194,230-245`; `core\browser\generation-client.js:498-501,1172-1186`; `core\browser\storage.js:45-47,503-548` | Foreground generation is still observer-free, but the normal app now also prefetches observed replays. Include normal prefetch/cache behaviour in browser and response-bound checks; distinguish request timings from post-request CPU/storage work and price evidence passes. Do not silently disable the shipped feature or add its unmeasured cost to the old Node figures. Stage-1 pricing already accommodates this. |
| DR-A11 | `cb54ce5`, `e5bb721`; replay limits and step construction | P1/P2/P5; 5.1 observers; 6 replay | A | `core\engine\policy.js:126-136`; `core\engine\replay.js:365-405,914-953`; `docs\difficulty-v3\final-2026-11-15.md:490-500` | Keep replay work/step/byte limits separate from the locked rating caps and the new selection budget. Check gen-v4 traces against the existing bounds and re-derive the old “64 profiles plus 64 repairs” rationale. A bounded incomplete trace is already supported. No automatic limit increase or new latency promise follows from this audit. |
| DR-A12 | `7d2f7f6`, MP14-MP18 and `07406cf`; fixtures, recorder/model/protocol/client/browser tests and fixture writer | P3; 5.1 parity; 6 tests | A | `tests\clues.test.js:818-831`; `tests\fixtures\replay-case.json:18-23,1038-1080`; `tests\replay-model.test.js:33,61-62,1288-1373`; `tools\record-fixtures.mjs:52,501-540`; `tests\browser\replay.js:793-829` | Preserve the gen-v3 fixture as the refusal/round-trip case and give gen-v4 a separate matched fixture. Migrate every matched consumer and the fixture CLI's current-version assumption, not just `tests\replay.test.js`. Keep legacy D21 coverage and add the gen-v4 route, observer modes, table/cache versions and current browser table behaviour. |

## 2. Section 5.1 contracts, checked individually

### 2.1 Provenance, skips and observers

**Verified:** the direct observer calls are still `runReplay`'s calls into `setAttempt` and
`puzzleCandidate` (`replay.js:419,441`). `executeTask('replayPuzzle')` calls `replayPuzzle`, not the
generation functions with another observer set. The client submits plain data. Searches of committed
`core`, `generator` and `tools` at the target found no other direct production caller of those three
options. Tests intentionally exercise the interface independently.

The transport reader copies bounded plain JSON for `setOrigin` and a `made` map with at most one entry
(`protocol.js:575-629`). It delegates meaning to `readProvenance`; it does not introduce a second
five-key whitelist. Thus the Q36 change belongs in the shared provenance reader/copier, type definitions,
version producer/comparator and all their consumers. Transport tests still need the new seven-key case.

The actual current shape is:

- `ProvenanceVersions`: `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`
  (`types.js:251-258`, `pack.js:62`, `generate.js:281-282`).
- Reader validation and copying are still unconditional five-key operations
  (`pack.js:1147-1160,1315-1323`); `sameVersions` still compares those five (`replay.js:180-183`).
- Current skip storage permits 64 subset skips and 16 repair skips, with exclusive ordinal bounds 2,128
  and 64 (`pack.js:49-55`). These are gen-v3 limits, not ready-made gen-v4 limits.
- `selectClues` charges each attempted rating before its event; repair uniqueness uses `onCount: charge`
  (`clues.js:329-344,461`). The detail path copies deduction data before DLX reuses the workspace
  (`difficulty.js:312-326`). Normal generation still calls without these observers.

These are precisely the changes version 4 already requires adopting. The old harness's
`igSelectProto` still destructures the old context and returns old-style successes
(`d1ae8dd:tools\ig-proto\variants\files\p1p5\core\engine\ig-select-proto.js:148-149,331`).
The merged candidate reads `sel.skips` and `capSkips` immediately reads its arrays
(`generate.js:271,291-295`). **Derived:** merely applying today's JSON edits would fail on a successful
candidate; adding a dummy empty skip list would still violate replay and observer semantics.

### 2.2 One running version

The target already compares provenance to `provenanceVersions()` before running each stage
(`replay.js:319-361`); it contains no old-generator dispatcher. The switch to gen-v4 and the Q36
record-specific readers implement the plan, rather than contradicting this source.

Keep both distinctions:

1. **Readable old record:** its five-key provenance survives load/save unchanged. It is not corrupt.
2. **Replayable record:** its versions must match the running implementation. A valid gen-v3 record
   under gen-v4 is unavailable, normally `set-versions`, not reinterpreted and not rewritten.

The second is already explicit in plan lines 517-528 and 685-691 and in the recorded Q34/Q36 decisions.
No new compatibility engine, legacy transcript migration or erasure of history is needed.

## 3. Generation steps and the replay cache

### 3.1 Current UI, not the historical dialog

MP16's card button/dialog has been superseded. The current component is
`generator\ui\generation-steps.js`; it is under “Pieces to place” on every screen size, including phones.
`07406cf` makes it collapsed until **Show generation steps**, with **Hide generation steps** thereafter
(`generation-steps.js:394-421`). The seven stage groups, step disclosures, pieces, techniques and score
tables are driven by `replay-model.js`. P-OD14 Q3 requires that **every** unavailable replay show only its
stored-puzzle row, even when the engine could replay part of it.

**Derived outcomes when the planned gen-v4 build is made:**

| Stored source | Required result under the existing decisions |
|---|---|
| gen-v3 set and gen-v3 candidate/calibration | Readable provenance; replay unavailable, `set-versions`; stages 1-6 marked unavailable, final stored-puzzle row retained |
| New gen-v4 candidate on a saved gen-v3 set | Do not restamp the old set origin. Its unavailable set stage prevents a fully matched replay; P-OD14 Q3 still shows only the stored puzzle, even if the candidate stage could run |
| Matching gen-v4 set and candidate/table versions | Replay the new search and show its truthful events in the existing table |
| gen-v4 record from another prior/screen-table version | Unavailable before the incompatible stage's skips are applied; a cache hit must not bypass that comparison |
| Completion-pass or missing/invalid provenance | Existing unavailable behaviour, not a new gen-v4 failure mode |

The first two rows are user-visible, but **not new decisions**: MP18's release-note amendment explicitly
includes “one made by an earlier version, or one made on a piece set saved by an earlier version”
(`steps-table-2026-11-16.md:157-160`). A request to retain executable old replay or display old verified
transcripts despite that refusal would be a different scope/compatibility proposal; this audit does not make it.

Gen-v4 need not create additional top-level stages merely because it has locate and rescue phases. The
current stage 5 is “Rating clue sets”; the current types restrict its phase names to `sample`, `seed`,
`beam`, while the builder passes `phase` through and rejects unknown event kinds
(`types.js:319-334`; `replay.js:862-901`). The pack author must specify the new phase/event mapping,
ordinal and selected-detail linkage, and any needed locale keys. It must not present a screen cutoff as
proof that the canonical rating is unrateable, or present the search's `TOO_FEW` guidance as a score.
Existing `set-versions` and `record-versions` messages already exist in both languages.

### 3.2 Exactly what the cache keys

`replayKeyOf` canonicalizes this ordered input:

```text
running ALGO_ID, running APP_VERSION,
board rows, pieces, witness, carving, macroRegion,
{ puzzle id, clues, solution, stored rating },
stored setOrigin, stored made
```

Object keys are sorted; absent/null object properties are omitted. Two cyrb53 hashes and the text length
form the key (`replay-cache.js:32-76`). Title, certificate, puzzle seed, display rotation and language are
not key inputs. The result is locale-neutral data; English/Vietnamese text is rendered later.

Storage is `pentomino:v1:replay:<key>`, `{ v: 1, result }`, at most 8 entries, LRU; the implementation
allows `600 * 1024` serialized JavaScript characters per entry, not 4 MiB of replay steps. Cache writes
do not evict progress, and normal quota handling drops replays first
(`storage.js:45-55,303-330,503-548`). Cache loss is already permitted; persistence across a reload is not
a promise of persistence across a generator-version change.

**Initial gen-v4 upgrade:** the running `ALGO_ID` changes, so an old matched gen-v3 cache entry is not
looked up. On demand the record takes the unavailable path described above. Old keys can remain until
ordinary cache eviction; no puzzle/provenance migration is implied.

**Later table-version changes:** the current key includes the record's versions but not the running
`provenanceVersions()` tuple. For the same stored record, unchanged `ALGO_ID` and unchanged `APP_VERSION`,
a change only to a running table version leaves this key unchanged. `createStepsController` serves a
persisted hit without running replay (`replay-model.js:967-971`). `APP_VERSION` is literally `1.0.0`;
the Pages stamp rewrites asset-reference query strings, not that constant. Consequently Q36's new table
comparison must also govern cache hits. This is **DR-A09, A**: extending an existing consumer to obey
an already-set identity rule, not asking the owner to choose another rule.

### 3.3 Cost and limits

The app prefetches newly added puzzles, not every restored/imported history entry
(`app.js:148-159`). A displayed puzzle can join its in-flight prefetch instead of submitting another
replay. A new generation interrupts background replay; the prefetch retries through the auxiliary
queue. Hiding the steps does not cancel that independent prefetch
(`replay-cache.js:129-185`; `tests\replay-model.test.js:1320-1373`).

The auxiliary queue does not dispatch while its main generation request is active. However, the client
ends that request and releases auxiliary work **before** assembling its final pack
(`generation-client.js:1172-1186`). Therefore “background” is not proof of zero response-assembly,
main-thread hashing/storage, warm-state or total CPU cost. The plan's observer-free timed **generation**
comparator remains valid; the phrase “what the app runs” should not imply that the entire app never runs
recorders. Browser checks must retain normal prefetch behaviour in both arms and record cache state.

`REPLAY` is separate from rating and selection budgets: 4,096 steps, 4 MiB serialized steps and
215,040,000,000 metered units (`policy.js:130-136`). Its old rationale counts 64 profile and 64 repair
ratings for each of the set and candidate stages. Gen-v4's rescue re-ratings and new call budgets require
a fresh trace/bound check, not a change to `DEDUCE`. MP17 measured one 20x18 Nightmare replay at 1.710 s,
40 steps and 125,302 bytes; that is neither a maximum nor a service level
(`final-2026-11-15.md:490-500`). Existing `incomplete`/limit presentation stays.

No frozen-round allocation is invalidated: there is no approved numerical allocation yet. Section 5.1
already prices preparation/parity and the later manifest separately. Record the additional consumer
checks and browser workload there; do not turn an unmeasured prefetch cost into a claimed new multiplier.

## 4. Locked state, offers and evidence

The read-only comparison found exact equality of the source declarations of `SCORE_V3`, `DEDUCE`,
`TIME`, `BUDGETS`, `K60`, `SHARES` and `STALL_LIMIT` between `cd5d17f` and `3fc65f4`.
`deduce.js`, `version.js`, `keys.js`, `worker-pool.js` and `tools\calibrate.mjs` have no diff in that interval.

| Item | Target state | Effect on v4 |
|---|---|---|
| Rating tuple | Base 12/3, rule `[0,0,2,3]`, G weight 5, info 0.5, few/many penalties 1/2 | Unchanged |
| Deduction limits | Main 760 M; census 80 M; 30,000 nodes; 8 solutions; lookahead 4; 32 MiB deduction slots | Unchanged; the screen certificate and P7 equality still need their planned frozen-source proof |
| Search constants | `STALL_LIMIT = 12`, four samples, eight count changes; `K60` and `SHARES` unchanged | Keep the legacy route and its tests; P4 is the approved new start mechanism |
| Tiers | Deduction tiers 1-3, 0 when none; `metrics.tier` becomes 4 for guesses | MP17 corrected prose about “four deduction tiers”; `deduce.js:1496-1502` and `difficulty.js:352` retain their old meanings |
| Offers | `mixed-v3`; Hell 1/2/3 `[Infinity, Infinity]`; other area intervals unchanged; Nightmare starts at area 81 | Already represented in v4 and its diagnostic-offer precondition |
| Fail-fast | None, P-OD12 | Matches v4; P5 remains a separately measured new policy |
| Census acceptance | P-OD13 accepts the 17 non-Hell cells above 25% estimates at 80 M | No new cap/rating decision; continue reporting estimate share |
| MP12b1 baseline | The landscape/state-report files have no changes in this interval | Old measured numbers remain old-source numbers, not results from the new runtime |
| MP17 evidence | GZ checked lock, fixtures, tests and selected generation/browser cases; the five Nightmare completion limitations and 43 Nightmare responses over 120 s remain | No replacement of phase 0, its controls, OD-P4 browser offers, or the blind comparison |
| P-OD14 / MP18 / `07406cf` | Changes presentation and adds replay caching/prefetch; no offer, rating or deduction change | Consumer/cost adjustments above, not new score or speed evidence |

The computed target benchmark digest is
`e181df2cc2e784355345c1a43c6a97800fbfa5e6d139d1b465054fa94204284b` over the 40 entries of
`tools\bench\report.js:37-49`. That list now includes `replay.js`; it does **not** include the Generator
UI/cache or storage wrapper. Pin the full app snapshot as well when measuring the browser. Do not use
digest equality alone to assert equality of the browser UI workload.

After `e5bb721`, the only changed files under `core\engine` are `protocol.js` and `tasks.js`.
In particular MP15b, MP16, MP17, MP18 and the replay cache do not subsequently alter the analysed
selector, deduction kernel, provenance reader, replay engine or score.

## 5. Re-verified references in plan sections 2-6

### 5.1 Every explicit file:line reference

“Unchanged” means the cited source still contains the referenced operation; a nearby declaration is
identified where the old citation pointed inside a function. Repeated citations are combined.

| Plan location | Citation in v4 | Verified location / disposition |
|---|---|---|
| 2.1, line 65 | `clues.js:432-464` | `core\engine\clues.js:653-685`: the same sided-count loop and break when both counters stay zero |
| 2.1, line 66 | `clues.js:429-464` | `core\engine\clues.js:650-685`; four/eight constants now at 80-81; `initialClueCount` remains `levels.js:125-127` |
| 2.1, line 67 | `levels.js:18` | `core\engine\levels.js:18`, unchanged `SHARES` |
| 2.1, line 68 | `clues.js:273-274` | `core\engine\clues.js:420-425`; the new rejected recorder event lies between the condition and the same `spent` return |
| 2.1, line 69; P7, line 368 | `deduce.js:1102,1128` | `core\engine\deduce.js:1102,1128`, unchanged direct R7 work checks |
| 2.1, lines 70/75 | `generate.js:554`, later described as 638 | `core\engine\generate.js:638`, `dispatchOrder`; the MP14b correction is still current |
| 2.1, line 70 | `policy.js:87` | `core\engine\policy.js:88`, `slotAttempts: 12` |
| 2.1, line 70 | `generation-client.js:1057-1085` | `core\browser\generation-client.js:1106-1134`, dispatch, await and ordered fold |
| 2.1, line 71 | `generation-client.js:447` | `core\browser\generation-client.js:470`, `begin`; timestamp at 474 |
| 2.1, line 71 | `generation-client.js:575,812` | `core\browser\generation-client.js:598,850`, the separate set/batch calls to `begin` |
| P1, line 165 | `tools/ig-proto/variants/files/p1p5/core/engine/ig-select-proto.js:450-722` | Same path/range at **`d1ae8dd`**, not a file in `3fc65f4`; locate, directions and rescue are still there |
| P2, line 262 | `IGP-05 pm1.md:48` | `docs\improve-generating\evidence\provisional\IGP-05\pm1.md:48` at **`d1ae8dd`**: Hell 1 row, 47 eligible ratings, 16/47 above 380 M |
| P3, line 279; 6, line 694 | `tests/clues.test.js:701` | Helper moved to `tests\clues.test.js:818`; the operative “20 distinct subsets spent, no onRate” test is **820-831**. The old line itself was the helper, not the test declaration |
| P7, line 360 | `deduce.js:1448` | `core\engine\deduce.js:1448`, `ladder`, unchanged |
| P7, line 361 | `:709-778`, `ruleR4` | `core\engine\deduce.js:709-778`, unchanged cited range; function starts at 709 |
| P7, line 368 | `:858`, `closure` | `core\engine\deduce.js:858` is still its `overWork()` check; declaration is **856** |
| P7, line 369 | `:1013-1075`, `reachable` | Same comment/body range in `core\engine\deduce.js`; declaration is **1023** |
| P7, line 372 | `kill :432`, `undo :482` | `core\engine\deduce.js:432,482`, unchanged |
| P7, line 378 | `select/undo/kill loops :444` | `select` starts at `core\engine\deduce.js:444`; `kill` 432, `undo` 482, unchanged |
| P7, line 387 | `deduce.js:302-309` | Same slot-byte accounting and `model-too-large` check; comparison at 306 |
| C3, line 428 | `difficulty.js:240-253` | `core\engine\difficulty.js:312-326`; capped-path throw at 316-322 still precedes DLX at 326; this is now in `measureV3Core` |

### 5.2 Other named files/functions and document pointers

This includes file-only references in 2.1/5.1 and functions named without line numbers.

| Reference / plan use | Current location / meaning |
|---|---|
| `selectClues`, its profile/beam/centre machinery | `core\engine\clues.js:257`; `rateOnce` 329, `rateSubset` 395, `afterProfile` 608, count loop 650; the semantic rebase target |
| `initialClueCount` | `core\engine\levels.js:125`; unchanged formula |
| `overWork`, `branch`, probes, deduction replay/census | `core\engine\deduce.js:839,1593,1680,1721,1738,1786`; no change. “Replay” in this cap discussion is the deduction's census replay, not the new Generation steps worker task |
| `fewestColumn`, `neighbourCell`, `sameState` | `core\engine\deduce.js:1541,922,428`; unchanged; `sameState` compares picked/trail lengths and live/column-count/covered arrays |
| `measureDeduction` / P7, P11 | `core\engine\deduce.js:280`; unchanged reference kernel |
| Canonical `rate`, `solveFirst` / P2, P6, C3 | `core\engine\difficulty.js:399`, shared `measureV3Core:285`; detail entry `rateDetailed:415`; DLX call 326; `core\engine\tiling.js:166` |
| `generateBatch`, `puzzleCandidate` / P4, P5 | `core\browser\generation-client.js:822`; `core\engine\generate.js:205`; update request propagation, observers and provenance together |
| `setAttempt`, `provenanceVersions`, `capSkips` | `core\engine\generate.js:108,281,291`; current observer and record boundaries |
| `layoutKey`, `clueKey` / P9/P10 | `core\engine\keys.js:330,345`, unchanged; no new novelty semantics |
| `core/engine/replay.js` / 5.1 | `runReplay:305`, `sameVersions:180`, `stepMaker:765`, `replayPuzzle:914`; its worker caller is `tasks.js:196` |
| `tests/fixtures/replay-case.json` / 5.1 and 6 | File exists; root fixture versions at 18-23 are not the nested five-key provenance object. Nested set versions at 1044-1050 and candidate versions at 1070-1076 pin gen-v3/mixed-v3/difficulty-v3 |
| `tools/calibrate.mjs` / 5.1 | `readSource:241-252`, unchanged; meta edit anchor is at 244-246 |
| `identity.mjs`, `compare.mjs` / 5.1 | **Feature HEAD:** `tools\ig-proto\identity.mjs:191-195,211-240`; `compare.mjs:1655-1658`. Non-provisional labels already avoid the top-level digest failure; identity still assumes an MP12b1 record per seed. The new validation/comparator receipt must not invent missing old-source baselines |
| P1 pseudocode `locateCount`, `march`, `bisect`, `window` | Design names, not promises of existing production functions. **Feature HEAD prototype:** locate block 450, `side` 470, `marchDown` 484, `marchUp` 515, `bisect` 610, `windowCount` 630 |
| `onCount: charge` / 5.1 | `core\engine\clues.js:461`; `makeUnique` is at 173; keep this independent of whether `record` exists |
| State report 1.9 / 2.2 in 2.1 | `docs\difficulty-v3\generator-state-2026-11-14.md:238-250,298-326`; historical timing, unchanged file. Default pool remains capped at four (`core\browser\worker-pool.js:138-141`) with the unchanged workspace/cache budgets |
| `summary.md` / 5.3 and Rnn references | **Feature HEAD:** `docs\improve-generating\evidence\provisional\summary.md:1-10` defines its old source and provisional status; the row citations remain that evidence, not main-branch measurements |

### 5.3 Fixture consumer inventory

The committed direct reads of `replay-case.json` at the target are:

- `tests\replay.test.js:27`;
- `tests\replay-model.test.js:33` (real replays are constructed at 61-62);
- `tests\generation-client.test.js:959`;
- `tests\protocol.test.js:55`;
- `tests\tasks.test.js:615`;
- `tools\record-fixtures.mjs:52`.

The fixture writer's `--replay-case --check` currently rejects a root version mismatch and regenerates
the recipe (`record-fixtures.mjs:501-540`). It cannot remain an unchanged “matched” gate on the
preserved gen-v3 file after the algo switch. Add a current-version fixture/check path while keeping the
old-file refusal and provenance-round-trip tests. The browser page generates its own real-worker
Hard fixture rather than reading that JSON (`tests\browser\replay.js:1-8`); it needs gen-v4-specific
coverage in addition to that legacy-route control.

## 6. Prototype edit applicability

Read-only script:
`docs\improve-generating\evidence\drift\gpt-6-astra\check-anchors.mjs`.
It reads the named Git source blobs, resolves the existing manifest inheritance with `planTree`, and
applies edits to strings in memory. It does not build a copied tree, run an engine or write results.
The provisional manifests/added files are the ones at feature HEAD.

Command, from the repository root:

```powershell
node docs\improve-generating\evidence\drift\gpt-6-astra\check-anchors.mjs cd5d17f 3fc65f4
```

| Variant | Applied edits at `cd5d17f` | Applied edits at `3fc65f4` | Failing anchors |
|---|---:|---:|---|
| base | 1 | 1 | none |
| instr | 11 | 11 | none |
| log | 19 | 19 | none |
| log-p6 | 21 | 21 | none |
| log-p6-w8 | 22 | 22 | none |
| p1p5 | 21 | 21 | none |
| p1p5-main | 21 | 21 | none |
| p1p5-main-a3 | 21 | 21 | none |
| p1p5-main-p6-w8 | 24 | 24 | none |
| p1p5-w095 | 21 | 21 | none |
| p1p5-w380 | 21 | 21 | none |
| p1p5-w760 | 21 | 21 | none |
| p6 | 4 | 4 | none |
| w8 | 3 | 3 | none |

Counts include inherited edits, append operations and the helper's meta edits. **14/14 complete chains,
zero failed anchors**, on both sources. These are text-applicability results only. `p1p5-2` still replaces
the native dispatch wholesale; it does not adopt MP13/MP14 because its import and replacement strings
happen to survive. P6's same anchor now sits inside the shared normal/detail implementation, so its
semantic and observer checks must include both entry points.

## 7. Required pack-author adjustments; no new owner choice

1. Pin `3fc65f4` or the explicitly chosen later frozen snapshot, including the browser app/cache; retain
   historical source labels and price preparation, parity and any new baseline work in the manifest.
2. Rebuild the prototype on the native selector/generator/detail path; preserve successful-result shape,
   version-specific skips, all observer modes and throwing-observer behaviour. Re-prove the screen
   certificate, not just the patch applicability.
3. Implement Q36 through reader, copier, producer, replay comparator, worker round-trip, app state and
   cache validity. Preserve old records without claiming they are replayable.
4. Carry new-search observations through the existing Generation steps table and both locales; preserve
   hidden-by-default, phone/keyboard behaviour, selected/detail linkage, unavailable final-only display
   and bounded incomplete traces.
5. Add the new matched fixture and update all its consumers and fixture CLI. Keep the old fixture as
   refusal/round-trip evidence, legacy D21 pins and the planned Very easy-to-Master identity controls.
6. Exercise normal prefetch/cache behaviour in browser timing, response-bound, cancellation and memory
   checks. Do not make a new speed/latency claim from MP17's one replay or from the old provisional runs.

These adjustments do not change the 18/20 cell gates, the (c5) admission recipe, global phase-0
prerequisite, Hell 1 candidate/offer distinction, OD-P6 blind comparison, P7 equality, or the locked caps.

## 8. B questions

**None.** No drafted owner/supervisor question is needed for this drift check.

The report does not choose a new policy for preserving old executable replay, keeping old verified
cached transcripts across versions, relaxing replay bounds or suppressing background prefetch. If any of
those is proposed instead of preserving the contracts above, it must be considered as a separate change.

## 9. Evidence and validation

Commands used included:

```powershell
git --no-pager log --reverse --no-merges --format="%h %ad %s" --date=iso-strict cd5d17f..3fc65f4
git --no-pager diff cd5d17f 3fc65f4 -- <named-path>
git --no-pager diff --name-only e5bb721 3fc65f4 -- core\engine
git --no-pager diff --name-only 3fc65f4 HEAD -- core generator tests docs\design-brief.md docs\design-detail.md
git --no-pager grep -n -F "replay-case.json" 3fc65f4 -- tests tools
git --no-pager diff --exit-code cd5d17f 3fc65f4 -- core\engine\deduce.js core\engine\version.js core\engine\keys.js core\browser\worker-pool.js tools\calibrate.mjs
node docs\improve-generating\evidence\drift\gpt-6-astra\check-anchors.mjs cd5d17f 3fc65f4
```

Additional inline Node scripts only read Git blobs: mapping unchanged old lines through zero-context
diff hunks, comparing named constant declarations and computing the target `SOURCE_FILES` digest.
All observed results are recorded above. The harness script is retained for reproduction; no generated
tree or temporary measurement file was created.

Validation:

- `npm run check`: **passed**, `check-conventions: OK`, `check-site: OK`.
- Direct `checkText` plus strict CRLF checks on both authored files: **passed**; UTF-8 without BOM,
  no trailing whitespace, final newline.
- Citation path/range validation: **passed**, 98 occurrences across 47 sources, including the new
  read-only script; code references read from the pinned Git object.
- `node --check` on the scratch script: **passed**. Both source revisions passed all 14 anchor chains.
- Final branch/HEAD: still `improve-generating` / `d1ae8dd`; no production, test, task-pack or living-spec
  modification, no commit and no branch operation. Only this report and its named script were authored.

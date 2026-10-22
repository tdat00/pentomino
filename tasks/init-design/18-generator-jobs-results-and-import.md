# T18 — Generator jobs, puzzle cards, imports, and exports

**ID:** T18  
**Depends on:** T15, T17  
**Estimated size:** 1,000–1,500 implementation/test lines  
**Owner role:** generator-ui  
**Milestone:** MVP
**Design refs:** §5.5, §6.9, §6.11, §8.6, §9.3–§9.4, §10.1, §10.4–§10.7.

## Goal & business context

Complete the maker journey: create a set, obtain genuinely different puzzles, inspect truthful status, and Play/share/export even when a batch is partial.

## Scope

**In scope:** generation-client integration, result panels, progress/cancel, set import/history, lazy status updates and Play/export actions.  
**Out of scope:** engine algorithms, player controls and changing qualified limits.

## Inputs & context

Use T17’s store, T15’s `createGenerationClient(pool)` and T12’s prepared hand-off/storage helpers. Calls:

```ts
client.generateSet({boardRows,rotation,levelId,seedText,uniqueness,maxActive},hooks);
client.generateBatch({set,rotation,targetLevelId,quantity,setSeed,batchIndex,displayOffset,uniqueness,
 seenLayouts,seenClues,calibration},hooks);
client.cancel(); client.recycle();
preparePlayerLink(pack,index); downloadPack(pack,name,{omitSolutions});
```

Set success includes independently validated set, witness and calibration. Keep them atomically; never replace a prior result with an unfinished attempt. New Puzzles does not change board/shapes/IDs/colors/K.

Data read by these panels: `PieceSet={board,pieces,witness,carving,macroRegion}`; each piece has `id,label,color,cells`; a runtime Puzzle has `id,title?,clues,solution,rating,certificate`. Rating exposes `score,level,saturated,metrics`; certificate exposes `status,model,rowLimit,verified`. Use `store.getState/subscribe/update` from T17, never mutate stored pieces or maps.

### Agreed screen layout and owned elements

```text
┌ Pentomino Puzzle Generator ───────────────────────────────────── [Open player] ┐
│ ① Board                         │ ② Level                 │ ③ Piece set       │
│ Cols [10] Rows [6] Preset [Rect]│ difficulty radios        │ piece thumbnails  │
│ View / Edit unrotated           │ count / size / share     │ Ready ✓ / sizes   │
│ Trim · Undo · Reset             │ Advanced                 │ Show solution     │
│ [board]                        │ Generate Piece Set        │ history / Export  │
│ {active}/{max} playable · status│                          │                   │
├───────────────────────────────────────────────────────────────────────────────┤
│ ④ Puzzles [quantity 5] [level] New Puzzles · Add more · Play all · Export · 🔗 │
│ [preview | title | est. score | clues | certificate | Play/Copy/Export/Remove] │
│ accepted count / current stage / elapsed / Cancel                             │
└───────────────────────────────────────────────────────────────────────────────┘
```

The puzzle row has its **own level selector**, defaulting to the accepted set's level, and an explicit **Copy pack link** action. On narrow screens it joins T17's stacked steps/sticky action bar. This task owns set/cards/results layout and accessibility fixes; QA must not edit its files directly.

Panels:

- Set thumbnails: ID, color/pattern, size and current display rotation. Summary “9 pieces · sizes 4–9 · Ready for Hard ✓”.
- Show solution overlays the generator witness only. Optional unclued benchmark must say “not a limit”.
- Last-five-set history; Export set writes kind `piece-set`, with witness unless answers are omitted.
- Quantity1–10, default5. New Puzzles replaces the visible batch; Add more appends. Its selector may choose any offered level without changing the set. Previous keys remain in history.
- Before every New Puzzles/Add more request, increment the accepted set's batchIndex and pass its immutable setSeed plus that index to the client. Keep seed affects set regeneration, never repeats a batch seed against the same history. Store the index even after failure/cancel.
- An explicit seen-history reset does not rewind batchIndex on that set; only accepting a newly generated set resets it to0.
- Titles use visible position: append3 to5 → #6,#7,#8; a replacement batch starts at#1. If byte-limit splitting creates a new visible pack, renumber its display titles without changing IDs, seed labels or layouts.
- A visible/exported pack has at most100 puzzles and512 KiB serialized data. Check remaining capacity before Add more; if a generated append would exceed the byte limit, preserve the accepted puzzles as a separate valid pack and explain/export both, rather than dropping results or writing an unimportable file.
- Cards: rotated clue thumbnail; level and actual score (Hard20 is valid); clue count and percentage; Play/Copy/Export/Remove.
- First certificate state is Checking; later Unique solution ✓ / Several solutions / Uniqueness not proved. Cancelled checks show Uniqueness not checked. Imported claims remain visibly claimed.
- Play all and pack export include every accepted puzzle. Certificates never block navigation/export.
- Same-tab Play cancels unfinished work before navigation; precomputed real anchors preserve normal modifier/middle-click behavior. Local-only fallback anchors require a successful library save before exposure.
- A removed card does not erase seen history. At1,000 identities, ask explicitly to reset history before another batch.

Progress and failure:

- Show stage, elapsed time, accepted count and Cancel.
- One request owns one115/120-second budget; do not reset it for each worker task.
- At failure/cancel preserve completed results; no “ten” padding, no old-layout clue variants.
- A new user action cancels idle certificates and invalidates stale task ownership.

Exact notices:

| ID | Text |
|---|---|
| N-PARTIAL | Found {n} of {q} different {level} puzzles within the time limit. The piece set was not changed. |
| N-FEWLAYOUTS | Found {n} of {q} different {level} puzzles. This piece set may allow only a few different arrangements — generate a new piece set for more. |
| N-SETLEVEL | Found {n} of {q} {level} puzzles: other arrangements of this piece set did not reach {level} difficulty. Try again, or generate a new piece set for {level}. |
| N-NOSET | Couldn't create a {level} piece set for this board within the time limit. Try again, choose another level, or change the board. |
| N-UNIQUE | Found {n} of {q} {level} puzzles with exactly one solution. Turn off 'Require one solution' or choose another level. |
| N-TOOLARGE | This board and level need more memory than allowed. Choose a smaller board or a lower level. |
| N-LONGLINK | This link is long; some apps may cut it. Use Export file to share. |
| N-NOWORKER | This browser cannot run the generator (module workers are required). |

Trigger mapping: `time-limit`→N-PARTIAL; `layouts-not-found`→N-FEWLAYOUTS; `difficulty-not-found`→N-SETLEVEL; `uniqueness-not-proved`→N-UNIQUE; failed set search→N-NOSET; GenerationError `model-too-large`→N-TOOLARGE; `history-full`→explicit reset/smaller-quantity prompt. Show **Generate new piece set** for both layout and difficulty shortfalls. Cancellation says cancelled and retains the accepted prefix; do not pretend it exhausted the search.

Import set:

1. Parse a piece-set file or puzzle pack through T11; do not replace state on failure.
2. Use its validated witness, otherwise a valid puzzle solution. Without either, obtain a bounded first solution in a worker; a cutoff is not “unsatisfiable”.
3. Runtime `PieceSet` uses Board/pieces/witness and carving imported; generation policy warnings do not invalidate gameplay.
4. Known `macroRegion` provenance may be reused only after checking array length=K, integer group IDs and a valid piece-order mapping. Missing/invalid/foreign hints fall back to flat LNS, never restrict legal placement.
5. Operational generation limits still apply. A valid imported file outside generator area/connectivity limits, or with K<3 (cannot satisfy one clue plus two movable pieces), remains viewable/exportable/playable but cannot start New Puzzles; explain why.
6. Restore a valid `generation.setSeed` and nonnegative safe-integer `generation.batchIndex`; the next request uses index+1. Missing/foreign seed data gets a new local normalized set seed; missing index starts0. Import alone does not reconstruct absent historical layout keys, and must not claim that it does.

This separates opaque player metadata from generator optimization hints. No metadata is evaluated as code.

After restoring saved generator state or importing a pack, ratings/certificates remain claims. Preserve the validated witness, but omit reusable calibration until it has been re-rated (and re-certified if required), or let the next batch create a fresh calibration/candidate. Never accept a new generated puzzle solely because storage says it was in band.

## Files to create/modify

Extend `generator\app.js`, `generator\state.js`, `generator\strings.js`, `generator\generator.css`; create `generator\ui\set-panel.js`, `generator\ui\puzzle-panel.js`, `generator\ui\progress.js`; `tests\generator-controller.test.js`, `tests\fixtures\ui-flow-recipes.json`; `tests\browser\generator-flow.html`, `tests\browser\generator-flow.js`.

## Implementation steps

1. Bind generation jobs, request/revision checks and atomic state replacement.
2. Render sets/cards and update accepted history in the deterministic order delivered by the client.
3. Add progress, Cancel and all failure notices.
4. Prepare links asynchronously with revision checks; stale encodings cannot replace current card URLs.
5. Add imports, history, exports and lazy-certificate updates.

## Acceptance criteria — Business

- **BAC-1:** Real-engine success recipes cover default10×6→set→5 puzzles→Play, Heart N10/Master→set→10→Play, and22×22/Hell-3→set→10→Play, preserving all pieces/clues.
- **BAC-2:** Partial/cancelled batches remain usable and never change the set or invent a requested level.
- **BAC-3:** Import with/without answers has truthful verification status; invalid imports leave existing work intact.
- **BAC-4:** Layout and difficulty shortfalls each show their mapped notice and Generate new piece set; K is never silently changed.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\generator-controller.test.js"` and `node tools\check-conventions.mjs` pass.
- **TAC-2:** The HTTP flow harness covers streaming, stale revisions, rejected imports, library denial and oversized-link fallback.
- **TAC-3:** All Play actions use validated packs/prepared real anchors; no solver runs in the main-thread controller.
- **TAC-4:** CSP, relative module paths, CRLF, zero runtime dependencies and text-only rendering are preserved.

## Test plan

Use a fake client for partial/error/status cases, then the three real-engine flows in BAC-1. Record successful inputs in `tests\fixtures\ui-flow-recipes.json` (same recipe structure as T10); missing successes are blockers, not skipped assertions. Test consecutive #1/#2 requests and fresh-set Keep-seed replay, Add-more numbering, old encoding/certificate replies, imported batchIndex continuation, nonstandard sets, cancellation and pending-certificate export.

## Definition of done & handoff

T23 performs cross-browser acceptance; it reports defects back to this owner. Report real-flow evidence and blockers, never prototype screenshots.

# Response to task-pack review — Architect 2

**Phase 9c · 22 October 2026**

Applied all seven major findings and sixteen minor findings. One optional split is rejected below. The pack retains 25 tasks, now arranged in 13 dependency waves. No application, prototype, or signed-off design file was edited.

The latest D41/D42 refinement governs the tasks: Keep seed preserves set-seed text, **never reuses a batch seed on the same set**, and browser modules use `.js`. Regenerating the set resets its batch index/history and reproduces the numbered sequence.

| Review ID | Decision | Change / location |
|---|---|---|
| T9-01 | **Accepted** | T10/T15 specify awaited attempt → later-slot attempt0 → current retries → later retries; cached fold-order consumption and the three-round pool4 test. |
| T9-02 | **Accepted** | T02/T10/T11/T15/T17/T18 define D41, internal seed-length exemption, per-set persisted index, imported continuation, metadata and fresh-set replay tests. |
| T9-03 | **Accepted** | T01 owns zero-dependency `tools/serve.mjs`, explicit MIME types and `/pentomino/` mapping. T16/T21/T23/T24 use it; browser runner/report modules are `.js`. |
| T9-04 | **Accepted** | T21 adds longtask/10 ms MessageChannel-proxy methods, validity/method fields, cancel latency/probe separation and notChecked counts; T23/T24 require them. |
| T9-05 | **Accepted** | T21 owns the landscape profile, ≥20 seeds per selected board/offered level, sampled clue counts, complete profile statistics, checkpointing and the inlined §7.5 reference table. Measured/n/m/incomparable references remain distinguished. |
| T9-06 | **Accepted** | T17–T20 inline both agreed desktop/mobile layouts and inventories, including puzzle-level selection, Copy pack link, status count, top-bar Straighten and selection toolbar. |
| T9-07 | **Accepted** | Trimmed/renamed T22 to `22-release-tooling-and-readme.md`, dependent only on T01. UI fixes remain with T16–T20; cross-app/a11y acceptance and defect reporting move to T23. |
| T9-08 | **Accepted** | T18 maps every partial/control failure to its notice/action and exposes Generate new piece set for both layout and difficulty shortfalls. |
| T9-09 | **Accepted** | T08 exports the bounded `carveFlatSet`; T10 inlines `set/j`, macro/flat/calibration streams and `r+i` restart derivation. |
| T9-10 | **Accepted** | T15 adds displayOffset; T18 continues titles after Add more and renumbers a newly split visible pack without changing IDs/seeds/layouts. |
| T9-11 | **Accepted** | T17 persists largeBoards only in prefs; runtime state derives it and ignores legacy gen-state duplicates. |
| T9-12 | **Accepted** | T15 specifies CLI `--max-active`, default676, with the side32 guard; batch-index/recipe validation is explicit. |
| T9-13 | **Accepted** | T19 adds empty-library Import/Sample state, Recent Delete/Export, exact error messages and claimed/runtime badge mappings. |
| T9-14 | **Accepted** | T16/T20 own targets/focus, board role/instructions, accessible names, axis hints,200 ms rejection shake and reduced-motion celebration. T23 owns screen-reader/axe evidence. |
| T9-15 | **Accepted** | T19 drops T15; T25 depends on T23 rather than T24. Checklist requires a runtime measurement lock, not indefinite post-MVP blocking. |
| T9-16 | **Accepted** | T01 inlines exact `.gitattributes` and `.editorconfig`, including CRLF checkout and Markdown hard-break handling. |
| T9-17 | **Accepted** | T01 aligns BatchResult with T15’s accepted/pack/history structure and enumerates all four set-attempt failures. |
| T9-18 | **Accepted** | T24 gives exact bottom-right ranges for the558/658-cell fixtures. |
| T9-19 | **Accepted** | T25’s regression explicitly copies only the fixture board/pieces and replaces clues with `[A]`; J is movable in that test. |
| T9-20 | **Accepted** | T16’s Heart criterion is geometric; T19 lists exact message mappings; T23 checks notices/badges and T22 now has objective tooling criteria. |
| T9-21 | **Accepted** | T18/T23 add real Heart-Master and22×22 Hell-3 ten-puzzle Play flows. T23 adds a real-browser scaled-clock watchdog probe, separate from performance statistics. |
| T9-22 | **Accepted** | Every task has Design refs. Checklist BA rows have a § column; notation is columns×rows, and added modules/tools are listed explicitly. |
| T9-23 | **Accepted** | T02 removes the stray `0x` from the displayed state-vector word. |
| T9-24 | **Rejected** | Retain T10 as one bounded 1,000–1,500-line pure-engine slice with separate discovery/generation tests and fixture tooling. A further split is optional rather than a correctness fix; retaining it avoids ID churn and preserves the25-task target. Earlier T22/T19 execution already removes three dependency waves. |

## Handoff notes

- New Puzzles and Add more always advance batchIndex, even if a dispatched request later fails/cancels. Resetting seen history alone does not rewind it.
- The Node server fixes MIME behavior, but D42 still prohibits browser-loaded `.mjs` files.
- Landscape timing comparisons use explicit historical reference status; forecasts do not become measured acceptance evidence.
- T22 no longer has permission to edit app/UI owners’ files. QA reopens defects with the owning task.
- Qualification and post-MVP work may proceed independently after T23, provided an active measurement’s served runtime remains frozen.
- All task files, checklist and this response are UTF-8 without BOM and CRLF.

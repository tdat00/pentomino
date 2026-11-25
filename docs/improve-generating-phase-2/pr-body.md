# gen-v4 in production (improve generating, phase 2)

Draft description for PR #14 (into `main`). Draft: nothing in it is a validation result, and nothing is merged.

## What changes

- **The route.** The `gen-v4` clue search (the frozen round's P1 to P5) runs in `core/` behind `selectClues` for Nightmare and
  Hell 1, except the exact full 26x26 Nightmare board (width 26, height 26, 676 active cells, whatever the display rotation).
  Every other level (Very easy to Master, Hell 2 and above) and that 26x26 board keep today's `gen-v3` search, its timers and no
  budgets. The Generator does not offer Hell 1 (phase 3). The command line also reaches boards of 577 to 675 cells, which run
  `gen-v4` (class `n-large`, no screen) **without a measurement of their own**.
- **`gen-v4`.** Every new record carries `algo: 'gen-v4'`, and the app replays `gen-v4` records only. The tables are the frozen
  `prior-s3-v1`, `screen-v4-v1` (190,000,000 units on Nightmare boards of 196 to 256 active cells, the canonical 760,000,000
  elsewhere), the per-call work budgets, the bound and the re-rating rule. The app version, the policy, the RNG, the seed scheme
  and the pack and puzzle-code formats do not change.
- **Seven keys.** A `gen-v4` record has seven provenance keys: `algo`, `policy`, `rng`, `seedScheme`, `ratingModel`, `priorTable` and
  `screenTable`, plus the `gen-v4` candidate and skip shape. `gen-v3` records keep their five keys. A set can also record a
  per-set clue-count override, `made.igPrior` (null when none was used).
- **The bound (P5).** A set request that has four attempts all ending without a clue window on the same side stops early with
  `no-window-below` or `no-window-above`, instead of running to the time limit. A call budget stop has no side. Counters for budget
  stops, screen-capped profiles and re-ratings reach the benchmark result.
- **Deadlines and the host guard.** "New piece set" and "New puzzle" each get their own scope: a 115-s generation stop and a 120-s
  hard response bound. An automatic `gen-v4`-route request of the command line or the bench uses one scope of 46 s for the set stage,
  115 s of generation and a 120-s response bound, with the host acting at 119 s. A DOM-free guard covers the whole operation,
  including pack assembly, and fences late completions by request and revision.
- **Texts.** Nine English and Vietnamese texts: the Generation steps of the clue search (locate, quick rating at its work limit,
  full re-rating, re-rating at its limit, work limit reached), the two piece-set notices and the two no-window step texts; and one
  sentence in both user guides. The living specification replaces "no fail-fast" for the `gen-v4` route.
- **Replay and fixtures.** Replay accepts `gen-v4` records, and its steps show the new events. The fixtures
  `tests/fixtures/replay-case-v4.json` (Hard) and `replay-case-v4-screen.json` (the screen) are new; `record-fixtures.mjs`
  checks the refusal of the old `replay-case.json` apart from regenerating the matched cases.
- **Tooling and documents.** `tools/ig-proto/phase2/` holds the measurement copies, the proof bundles, the driver and ledger, the
  comparator, the replay probes and the browser runner; both developer guides and the tools README describe them.

## Compatibility

- **Old records stay.** Sets, packs and histories made by `gen-v3` load and play unchanged. Nothing is restamped: an old record
  keeps its five keys through a load and a save.
- **Steps are refused by version.** The Generation steps of a `gen-v3` puzzle, and of a new puzzle made on a set saved before this
  release, are unavailable with today's reasons; `tests/fixtures/replay-case.json` stays byte for byte and replays "unavailable".
- **Forward check.** An older build reading a `gen-v4` pack drops the `made` record it cannot read, with a warning, and keeps the
  puzzles. One check with the `6b94ffb` reader, `docs/improve-generating-phase-2/evidence/P2-15/forward-check.log`, shows this.
- **Browser storage.** The saved-steps key holds the running version, so a version change does not show a stale replay.

## Not yet validated

- The phase-2 validation has not run: the proof bundles, the smoke rows, stage A (controls, sentinels, `require`, the replay
  probes and the browser checks) and stage B (failing cells, controls, Master, `n-mid`, populations, Hell 1 and the coverage of the
  bound) are pending (P2-18 to P2-21). This description claims no validation result.
- No performance, speed or quality claim is made. The frozen validation never saw the bound fire, so its false-stop rate on real
  requests is not established.
- Hell 1 offers, browser runs on real devices and the blind play comparison belong to phase 3.

## Depends on

- PR #11 (phase 1: the P6 change and the prototype pack), **unmerged**. PR #14 carries phase 1's unmerged commits and cannot be
  merged before PR #11 is decided.

## Not merged

- Nothing is merged, released, tagged or deployed. A merge, a release or a deployment needs the owner's explicit instruction.

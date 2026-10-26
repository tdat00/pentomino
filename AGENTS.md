# Agent instructions

## Documentation

- The living specification is `docs/design-brief.md` and `docs/design-detail.md`. They must always describe the current code: when a change alters behaviour, storage, URLs or UI, update these two files in the same change.
- Do not edit files in subfolders of `docs/` (`docs/init-design/`, `docs/calibration/`, ...) or in `tasks/`. They record the original design, reviews and measurements and stay as written.
- `README.md` is user-facing; keep its feature list and commands correct.

## Checks

- `npm run check` checks repository conventions (consistent line endings, no trailing whitespace, final newline) and the site files.
- `npm run test:quick` runs the unit tests without the slow ones; `npm test` runs all of them.
- Every test run, unit tests (`npm test`, `npm run test:quick`, `node --test`) and browser test pages (`tests/browser/*.html`) alike, must finish within 10 minutes at most. A run that takes longer has an error (a hang, an endless wait or a broken test): stop waiting, cancel it and investigate instead of waiting longer. For a browser page, log the start of each check (for example `console.log` in its `check` function) or read the page's progress over CDP, to see which check stalls.
- Each browser test (each `check` of a `tests/browser/*.js` page) must finish within 1 minute at most. A check that takes longer has an error: do not wait for it; find the stalled check, cancel the run and fix the cause.

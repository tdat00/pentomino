# P1-05 proposed single push: read-only dry run (SA-Opus)

Command: `Set-Location Q:\git; pwsh -NoProfile -File pentomino\docs\improve-generating-phase-1\evidence\sa-opus\p1-05-preflight-dryrun.ps1`
(read-only: no commit, push or PR edit; stand-ins: plan.md for pr-body.md, HEAD for the fork SHA).

- Step 1 preflight: pass. Remote main b5eb85805f609af7deaa2489eb08675c60b2cc49; remote head 826ce79dcc4a77daaaea00894a6dcea46bcbd8b7; PR #11 OPEN, mergedAt null, improve-generating -> main, base b5eb858; fast-forward from 826ce79 to HEAD eca0f94; out-of-scope paths since eca0f94: none.
- Step 4 body: 31964 chars; normalized equality with itself after a CRLF round trip: True; footer lines:
  - ``
  - `Published head and phase-2 fork point: `eca0f94717a56de43c52f6cb54d739360670fef8`.`
  - ``
  - `Phase 2 will branch `gen-v4` from this commit and use a separate PR into `main`. Neither PR is merged.`
  - `The phase-2 PR initially includes the unmerged phase-1 prefix and must disclose that dependency.`
  - ``
- Current PR #11 body under the same normalization: 13318 chars (read only).

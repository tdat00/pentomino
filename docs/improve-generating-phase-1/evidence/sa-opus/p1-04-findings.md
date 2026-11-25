# P1-04 drafts: SA-Opus's review

| Item | Value |
|---|---|
| Drafts | `docs/improve-generating-phase-1/readiness.md` and `pr-body.md` (Dev-Sonnet, uncommitted on `dac2ff2`) |
| Verdict | **Accept after F1 to F4**, four text-only edits. Every number, hash, commit and link is correct. The edits make the PR description easier for a human reviewer to read and fix one caption. |
| Checks | `p1-04-review.md` (`node docs\improve-generating-phase-1\evidence\sa-opus\p1-04-review.mjs`, read-only) |

## 1. Verified

All of the following were checked against `verification/index.json`, `adoption.json`, the logs and Git; the results are in `p1-04-review.md`.

- **Qualification:**
  - qualified commit `02edc6a`, attempt `P1-03b-20261125T042920136Z`, Node `v26.13.0` and `v22.23.5`, digest `a51e8196…`;
  - node seconds 18.964, 122.063, 141.735, 0.673 and 1.306, for a total of 509.741 s (8.50 min);
  - site stamped `02edc6a4`, 120 files, 414 references in 91 of 114 files;
  - the 13 raw SHA-256 values match the index and the files.
- **Adoption:**
  - the seven T14 rows, memory in MiB, 2,244.925 of 2,700 s, the 10x10 pair at seed `landscape/10x10-nightmare/2`;
  - inspected commit `fce2f36` and the input index `a8a0029f…`.
- **Commits and links:**
  - 9 commit links exist;
  - the 21 relative links in readiness.md resolve;
  - the 32 branch links in pr-body.md name existing paths.
- **Template and route:**
  - all 54 literal lines of P1-04 step 4's template are kept (only the file names became links);
  - the route is right in both documents: two PRs, neither merged, phase 2 on `gen-v4` into `main`;
  - the phase-0 FAIL line and N-P1-DOC are kept.
- **Format:** the strict G-FORMAT passes on both files.

## 2. Rulings on the developer's deviations

1. Branch links in pr-body.md: **accept.** Relative links do not resolve in a PR description. The linked files are immutable records, and the commit links are pinned.
2. The two "Evidence:" paragraphs: **accept**. They are step 5's T12, T13 and P1-02 links.
3. Raw-hash tables:
   - **Accept in readiness.md**, which step 3 asks to carry the evidence hashes; fix its caption (F4).
   - **Remove it from pr-body.md** (F1). It is 13 lines of hexadecimal that a reviewer cannot use; `verification/index.json` is linked. The extra row sentences are accepted, but the two longest rows are shortened (F2).
4. Source-guard row: **accept in readiness.md** as a record. In pr-body.md, replace it with a statement for the reader that does not name the drafting head (F2). P1-05 runs G-QUALIFIED again before publishing.
5. 8.50 minutes: **accept** (509.741 / 60 = 8.4957).
6. Three-column T14 table: **accept the content**. Reformat the reach column in both files, because "5/5" next to "5/5" and "4/4" read as fractions, and say which way the ratio goes (F3).
7. Sign-off left empty: **correct**.

## 3. Findings and exact replacement text

### F1 (pr-body.md): remove the raw-hash table

- Delete the paragraph that starts `Raw SHA-256 of the sealed logs (verification files under`. Also delete the 13-row table after it, through the row `` | `tested-files.txt` | … | ``, and one of the two blank lines around it.
- In the paragraph that starts `Observed on the qualified commit`, replace `; raw SHA-256 values follow the table.` with:

  ```markdown
  ; the raw SHA-256 of every log is in `verification/index.json`, linked below.
  ```

### F2 (pr-body.md): shorten two verification rows

Replace the row that starts `| Adoption record |` with:

```markdown
| Adoption of T14 (P1-01) | - | the runtime is the source T14 measured (same 40-file digest); only the three P6 files differ from `main`; the nine deduction files and the three fixtures are unchanged from the frozen source; 35 of 35 pairs equal | - | [`adoption.json`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/adoption.json), [`adoption.md`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/adoption.md) |
```

Replace the row that starts `| Source guards (G-QUALIFIED) |` with:

```markdown
| Source guard (G-QUALIFIED) | - | later commits change documents only: no tested file has changed since the qualified commit, and every sealed log keeps its recorded SHA-256 | - | [`verification/index.json`](https://github.com/tdat00/pentomino/blob/improve-generating/docs/improve-generating-phase-1/evidence/verification/index.json) |
```

### F3 (both files): make the T14 table readable

In pr-body.md under `## Historical timing and memory`, and in readiness.md under `## Historical measurement adopted`, replace the table (its header row starts `| Cell | Ten reached, old/new (of 5) |`) with:

```markdown
| Cell | Requests reaching ten, old and new | Equal pairs | Median response ratio, old/new |
|---|---|---:|---:|
| 14x14-master | 5 of 5, 5 of 5 | 5/5 | 1.14669 |
| 26x26-master | 5 of 5, 5 of 5 | 5/5 | 1.20652 |
| 26x26-expert | 5 of 5, 5 of 5 | 5/5 | 1.14279 |
| 26x26-nightmare | 5 of 5, 5 of 5 | 5/5 | 1.32283 |
| 10x10-nightmare | 4 of 5, 4 of 5 | 5/5 | 0.99951 |
| 12x12-nightmare | 5 of 5, 5 of 5 | 5/5 | 1.02356 |
| 18x18-nightmare | 5 of 5, 5 of 5 | 5/5 | 1.13278 |
```

Directly after the table, in both files, insert this line, followed by a blank line:

```markdown
The ratio is the old source's response time divided by the new source's, per seed pair: above 1, the new source answered sooner.
```

This is the direction of `pairedRatios` in `tools/ig-proto/phase1/p6-bench.mjs`, which divides old by new per pair.

### F4 (readiness.md): the hash-table caption

Replace:

```markdown
Raw SHA-256 of the sealed logs (from the index; the verification files are under
`docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/`):
```

with:

```markdown
Raw SHA-256 of the sealed logs, from the index. The two `fold-width8/` files are under
`docs/improve-generating-phase-1/evidence/`; the others are under
`docs/improve-generating-phase-1/evidence/verification/P1-03b-20261125T042920136Z/`.
```

## 4. Sign-off

- SA-Opus signs readiness.md after SA-Astra's result once F1 to F4, and any change she asks for, are applied. If her changes go beyond F1 to F4, I re-read only those.
- Process note: this file and `p1-04-review.mjs` / `.md` are untracked review evidence. Commit them before P1-04's task commit, as with P1-01's review evidence; otherwise P1-04's G-WORKTREE stops on them.

SA-Opus, 2026-11-25.

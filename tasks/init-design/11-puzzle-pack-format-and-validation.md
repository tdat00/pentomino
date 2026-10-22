# T11 — Versioned puzzle packs and bounded validation

**ID:** T11  
**Depends on:** T02, T03, T05, T07  
**Estimated size:** 1,000–1,500 implementation/test/fixture lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §5.1–§5.5, §9.5, §9.7.

## Goal & business context

A downloaded puzzle must stand alone and safely open in either app. Valid nonstandard puzzles must not be rejected merely because the generator would not create them.

## Scope

**In scope:** wire format, schema validation, serialization, omitted solutions, legacy rating claims and reusable fixture.  
**Out of scope:** compression, local storage, solving for missing witnesses and browser import UI.

## Inputs & context

```ts
FORMAT='pentomino-pack';
SUPPORTED_VERSIONS=[1];
RULES=['free-polyomino-v1'];
createPack(a:{board:Board;rotation:number;pieces:Piece[];witness?:Pose[];
 puzzles:Puzzle[];generation?:object;meta?:object}):Pack;
validatePack(input:unknown):Result<Pack>;
serializePack(p:Pack,o?:{omitSolutions?:boolean;pretty?:boolean}):string;
parsePack(text:string):Result<Pack>;
```

`Result<T>` is `{ok:true,value,warnings:Issue[]}` or `{ok:false,issues:Issue[]}`; Issue has code/path/message. Do not throw ordinary malformed-file errors through UI callers.

Wire fields:

| Object | Allowed fields / constraints |
|---|---|
| Root | `format`, `version`, `kind`, `rules`, `board`, optional `presentation`, `pieces`, optional `witness`, `puzzles`, optional `generation`, `meta` |
| kind | `piece-set`: puzzles=[]; `puzzle-pack`: 1–100 puzzles |
| rules | Exactly `free-polyomino-v1` |
| board | `{rows:string[]}`; `#` active, `.` blocked; W/H each1–64; active area1–1024 |
| presentation | `{rotation}`; absent defaults0; one of0,45,…315 |
| piece | `{id,label,color,cells}`; ID `[A-Za-z0-9_-]{1,8}` unique; label≤4 code points; color `#[0-9a-fA-F]{6}`; 1–128 unique integer cells, normalized/sorted y/x and edge-connected |
| pieces | 1–128; sum of piece areas equals active area |
| pose | `{piece,x,y,turn,mirrored}`; known ID; integer coordinates; turn in0..3; Boolean mirrored; footprint active/in bounds |
| puzzle | `{id,title?,clues,solution?,rating?,certificate?}`; ID `[A-Za-z0-9_-]{1,64}` unique; title≤80 code points |
| clues | Unique piece IDs, no overlap; 0..K−1 on import (generation uses1..K−2) |
| witness/solution | Exactly one pose per piece, exact cover; a puzzle solution contains all its clues by occupied cells, not necessarily identical pose encoding |
| generation | Plain JSON object; preserved as untrusted provenance, never executed |
| meta | Plain JSON object, serialized UTF-8≤4096 bytes; preserved, never executed |

File limit **512 KiB in UTF-8 bytes**, checked before parsing. `serializePack` must also reject an oversized result with `pack-too-large` rather than create a file this application cannot import. Validate container lengths/types before expensive shape work. Unknown core fields are errors; metadata is the explicit extension point. Safe-copy properties; never `Object.assign` untrusted data into application objects. No depth-recursive copying that can crash on adversarial metadata.

Runtime normalization clarification:

- Absent optional witness/solution/rating/certificate becomes null internally; accept explicit null as absence for these optional fields. Serialize them by omission, never invent a proof.
- `createPack` derives kind from `puzzles.length`, writes format/version/rules and converts Board to rows.
- Writers canonicalize symmetric poses with `canonicalT`, retaining their occupied cells and origins. Preserve piece-array order (and the parallel macroRegion mapping); canonical serialization must not reorder pieces behind that metadata.
- Wire certificates contain status/model/optional rowLimit; **never serialize `verified:true`**. Import always treats proof and rating information as claims.
- Current ratings: `{model:'difficulty-v2',score,level,saturated,metrics}` where metrics are `{U,B,branchTrials,rowTrials,stop,R,H}` and stop is solution/branch-cap/row-cap.
- Legacy `difficulty-v1` claims are accepted with finite nonnegative score, model/level strings of1–64 code points and optional JSON diagnostic metrics; they are not reinterpreted as v2. Legacy/foreign rating records allow only model, score, level, optional saturated/censored booleans and metrics. Other well-typed model claims may be preserved with an unsupported-model warning, never treated as executable rules or verified facts.
- Certificate status must be unique/multiple/not-proved/unsatisfiable; a model string is a claim, not authorization to run code.
- Recognized current diagnostics have the documented field types; unknown nested v2 diagnostic fields are rejected. Older/foreign diagnostics are opaque bounded JSON claims.

Game rules: connected nonempty pieces, all eight orientations, every piece exactly once, all active cells covered once, no blocked cells covered, fixed clues unchanged. Holes, duplicate shapes, pieces smaller than3, disconnected boards, and generator-policy size/count differences do not invalidate otherwise rules-valid imports. Return policy warnings where relevant.

Generation provenance normally contains:

```json
{
  "app":"pentomino-generator/1.0.0","algo":"gen-v2","policy":"mixed-v2",
  "rng":"xoshiro128ss-v1","seedScheme":"seed-sha256-v1",
  "setSeed":"K7Q2-9MXA-3FWD","setLevel":"hard","setAttempt":2,
  "carving":"macro","macroRegion":[0,0,1,1,1,2,2,3,3,3],
  "batchSeed":"K7Q2-9MXA-3FWD#1","batchLevel":"hard","batchIndex":1,
  "uniqueness":"any","createdAt":"2026-10-22T03:00:00.000Z"
}
```

The generator may separately validate recognized `macroRegion` hints before reuse; the player never trusts them as rules.

Required hand-authored fixture: 10 columns ×6 rows, all active; clues A and J; all turns0/mirrored=false. Piece cells and witness origins:

| ID | Local cells | Origin |
|---|---|---|
| A | `[[0,0],[1,0],[0,1],[0,2]]` | `[0,0]` |
| B | `[[1,0],[2,0],[0,1],[1,1],[1,2],[2,2],[1,3]]` | `[1,0]` |
| C | `[[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[1,2],[2,2],[3,2],[3,3]]` | `[3,0]` |
| D | `[[1,0],[0,1],[1,1]]` | `[6,0]` |
| E | `[[1,0],[0,1],[1,1],[0,2],[1,2]]` | `[0,2]` |
| F | `[[2,0],[3,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1]]` | `[0,4]` |
| G | `[[0,0],[1,0],[2,0],[2,1],[2,2],[3,2]]` | `[3,3]` |
| H | `[[1,0],[2,0],[0,1],[1,1],[2,1],[1,2]]` | `[6,3]` |
| I | `[[1,0],[2,0],[1,1],[0,2],[1,2]]` | `[7,0]` |
| J | `[[1,0],[1,1],[1,2],[1,3],[0,4],[1,4]]` | `[8,1]` |

Use labels A–J and `colorFor(0..9)`. Puzzle ID `example-1`, title `Example`, no rating/certificate, generation `{app:'hand-authored'}`. Its complete ownership rows are:

```text
AABBCCCDII
ABBCCCDDIJ
AEBBCCCIIJ
EEBGGGCHHJ
EEFFFGHHHJ
FFFFFGGHJJ
```

## Files to create/modify

`core\engine\pack.js` with exported validator/claim JSDoc details compatible with T01’s Pack contract; `tests\pack.test.js`; `tests\fixtures\hand-authored-pack.json`. Do not edit the shared typedef file concurrently with other core tasks.

## Implementation steps

1. Add staged, path-specific validators and safe normalized records.
2. Validate geometry and full witnesses using T03/T07, independently of generation policy.
3. Implement canonical writing, pretty writing, and `omitSolutions` removing both set witness and puzzle solutions.
4. Add the exact fixture and malicious/boundary cases.

## Acceptance criteria — Business

- **BAC-1:** A complete exported puzzle opens without generator state or another file.
- **BAC-2:** A classic pentomino set, a holed piece and a nonstandard small-piece set remain playable with appropriate warnings.
- **BAC-3:** “Omit solutions” removes answers; it never fabricates solvability or uniqueness.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\pack.test.js"` passes round trips and rejected-input cases.
- **TAC-2:** Versions0,−1,2 and `"1"` are rejected; supported v1 and legacy rating claims behave as specified.
- **TAC-3:** Oversized UTF-8, deep metadata, malicious property names, bad poses, duplicated cells, repeated IDs and overlapping clues produce structured errors without prototype pollution.
- **TAC-4:** `node tools\check-conventions.mjs` passes; pure ES modules, CRLF, no dependencies/eval/network/DOM.

## Test plan

Corrupt one fixture property at a time. Test a symmetric pose encoding that occupies the same clue cells, an invalid answer, no answer, zero clues, K clues rejected, metadata byte limits and Unicode code-point lengths. T15/T19 later validate T10’s generated fixtures through this module; this task does not depend on future T10 fixtures.

## Definition of done & handoff

T12 owns encoding/storage, T13 consumes normalized packs, and T19 stages imports before replacing a game. Publish exact error codes and warning semantics; do not leak trust through serialized `verified`.

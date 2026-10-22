# T02 — Hashing and deterministic random streams

**ID:** T02  
**Depends on:** T01  
**Estimated size:** 450–800 implementation/test lines  
**Owner role:** core  
**Milestone:** MVP
**Design refs:** §4.2 hash/rng APIs, §8.6, §13.2; D21, D41.

## Goal & business context

The same seed and semantic inputs must reproduce the same puzzle attempts. Saved identities must not depend on colors, display rotation, clocks, or a browser-specific hash implementation.

## Scope

**In scope:** synchronous SHA-256, canonical JSON, seed normalization, xoshiro128**, derived streams and friendly random seed text.  
**Out of scope:** puzzle IDs, storage, generation, UI and prototype files.

## Inputs & context

Required exports:

```ts
// core/engine/hash.js
sha256Hex(data: string | Uint8Array): string;
canonicalJson(value: unknown): string;
// core/engine/rng.js
RNG_ID = 'xoshiro128ss-v1';
SEED_SCHEME = 'seed-sha256-v1';
normalizeSeedText(text: string): string;
createRng(seedText: string, label?: string): Rng;
batchSeedFor(setSeed: string, batchIndex: number): string;
randomSeedText(): string;
type Rng = {
  nextU32():number; int(n:number):number; float():number;
  shuffle<T>(a:T[]):T[]; pick<T>(a:readonly T[]):T;
  derive(label:string):Rng;
};
```

- Pure engine modules: no DOM, storage, timers or wall-clock reads. `randomSeedText` is the explicit entropy exception and uses `crypto.getRandomValues`, never `Math.random`.
- Canonical JSON recursively sorts object keys by code-point order and preserves array order, with no whitespace. Accept JSON-safe primitives, arrays, plain/null-prototype objects; reject cycles, unsupported values and non-finite numbers. Do not execute `toJSON` hooks. Callers omit absent optional fields before hashing.
- SHA-256 is synchronous, pure JS over UTF-8 or exact bytes; output 64 lower-case hexadecimal characters. Implement the standard 512-bit block compression with the 64 constants derived from cube roots of the first 64 primes, or inline those standard constants. Padding: append bit 1, zeroes to length 448 mod 512, then the original 64-bit big-endian bit length. Use unsigned 32-bit arithmetic and rotations.
- Visible/set seed validation is `normalizeSeedText`: trim, NFC,1–64 Unicode code points, case-sensitive. Set creation, CLI and UI must call it.
- `batchSeedFor` validates a normalized set seed and a positive safe-integer index, returning exactly `setSeed+"#"+batchIndex`. Internal batch seeds are not editable and are exempt from the UI64-code-point limit.
- `createRng` hashes the complete normalized semantic seed (set or internal batch seed); it must not truncate or apply the UI length limit to an internal seed. Derivation retains that complete seed. No extra batch label/salt is inserted.
- Hash UTF-8 of `pentomino-seed-v1:` + normalized text + (`"\u0000"+labelPath` if nonempty).
- First 16 digest bytes become four **big-endian** uint32 words. Replace an all-zero state with `0x9E3779B9, 0x243F6A88, 0xB7E15162, 0x6A09E667`.
- A child label appends `"/"+label` to its parent label path. Derivation uses the original normalized seed and full path, not consumed state.

SHA-256 compression details (so no external algorithm lookup is required):

```text
Initial H = 6a09e667 bb67ae85 3c6ef372 a54ff53a 510e527f 9b05688c 1f83d9ab 5be0cd19
Ch(x,y,z)=(x&y)^(~x&z); Maj(x,y,z)=(x&y)^(x&z)^(y&z)
S0(x)=rotr(x,2)^rotr(x,13)^rotr(x,22)
S1(x)=rotr(x,6)^rotr(x,11)^rotr(x,25)
s0(x)=rotr(x,7)^rotr(x,18)^(x>>>3)
s1(x)=rotr(x,17)^rotr(x,19)^(x>>>10)
W[0..15] = big-endian block words
W[t>=16] = s1(W[t-2])+W[t-7]+s0(W[t-15])+W[t-16] mod2^32
a..h = H; repeat64 rounds:
 T1=h+S1(e)+Ch(e,f,g)+K[t]+W[t]; T2=S0(a)+Maj(a,b,c)
 h=g; g=f; f=e; e=d+T1; d=c; c=b; b=a; a=T1+T2 (mod2^32)
H += a..h (mod2^32)
K =
428a2f98 71374491 b5c0fbcf e9b5dba5 3956c25b 59f111f1 923f82a4 ab1c5ed5
d807aa98 12835b01 243185be 550c7dc3 72be5d74 80deb1fe 9bdc06a7 c19bf174
e49b69c1 efbe4786 0fc19dc6 240ca1cc 2de92c6f 4a7484aa 5cb0a9dc 76f988da
983e5152 a831c66d b00327c8 bf597fc7 c6e00bf3 d5a79147 06ca6351 14292967
27b70a85 2e1b2138 4d2c6dfc 53380d13 650a7354 766a0abb 81c2c92e 92722c85
a2bfe8a1 a81a664b c24b8b70 c76c51a3 d192e819 d6990624 f40e3585 106aa070
19a4c116 1e376c08 2748774c 34b0bcb5 391c0cb3 4ed8aa4a 5b9cca4f 682e6ff3
748f82ee 78a5636f 84c87814 8cc70208 90befffa a4506ceb bef9a3f7 c67178f2
```

Exact xoshiro128** transition:

```text
rotl(x,k) = ((x << k) | (x >>> (32-k))) >>> 0
result = imul(rotl(imul(s1,5),7),9) >>> 0
t = s1 << 9
s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t
s3 = rotl(s3,11)
coerce all state words to uint32; return result
```

`float = nextU32()/2^32`. For `int(n)`, require integer `1 <= n <= 2^32`, draw until `x < floor(2^32/n)*n`, then return `x % n`. Fisher–Yates shuffle operates in place and returns the same array; `pick` rejects an empty array. Derived streams are independent of parent consumption.

Friendly seeds use alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, 12 uniformly drawn characters, displayed `XXXX-XXXX-XXXX`; the displayed text is the reproducible seed input.

Golden vectors:

| Input | Expected |
|---|---|
| SHA-256 empty UTF-8 string | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| SHA-256 `abc` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| State `(1,2,3,4)` | `11520, 0, 5927040, 70819200` |
| Seed `demo`, empty label | state `ac19d7fd,1f47dc98,444f9bb4,bbb91ffa`; outputs `3504561854,188375601,1212981724` |

The test may expose a test-only state constructor locally; do not add a mutable global RNG.

## Files to create/modify

`core\engine\hash.js`, `core\engine\rng.js`, `tests\hash.test.js`, `tests\rng.test.js`.

## Implementation steps

1. Implement and independently verify SHA-256 against Node’s built-in `node:crypto` in tests.
2. Implement strict canonical serialization.
3. Implement seed normalization, digest-to-state conversion, PRNG transition and rejection sampling.
4. Add derivation and friendly seed generation; keep only the latter nondeterministic.

## Acceptance criteria — Business

- **BAC-1:** A copied seed reproduces the same stream in Node and browsers.
- **BAC-2:** Leading/trailing whitespace and canonically equivalent Unicode input do not surprise users; case remains meaningful.
- **BAC-3:** Parallel tasks can derive named streams without consuming or changing each other’s results.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\hash.test.js" "tests\rng.test.js"` passes all vectors, multi-block and Unicode byte tests.
- **TAC-2:** Reordering object keys preserves canonical hashes; reordering array elements does not.
- **TAC-3:** Sampling edge cases, rejected arguments and a forced rejection-sampling branch are tested.
- **TAC-4:** Consuming the parent before/after `derive('slot/1')` does not change that child’s sequence.
- **TAC-5:** `node tools\check-conventions.mjs` passes; native ES modules/JSDoc, UTF-8 no BOM, CRLF, no external packages or runtime fetches.

## Test plan

Compare byte vectors of lengths 0, 1, 55, 56, 64 and multiple blocks with `node:crypto`. Test composed/decomposed `é`, surrogate-pair length, zero-state substitution, bounds1 and2^32, label paths, and a64-code-point set seed plus `#1`: UI validation still rejects over64 user text, but the derived internal seed hashes in full. Test batch indices1,2 and invalid/non-safe values.

## Definition of done & handoff

Publish the stable exports above and test evidence. T04/T08/T10 consume Rng objects; T07/T11/T12 consume hashes. No downstream consumer should reimplement hashing or RNG.

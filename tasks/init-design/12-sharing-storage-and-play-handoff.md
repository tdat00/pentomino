# T12 — Portable sharing, local storage, and Play hand-off

**ID:** T12  
**Depends on:** T07, T11  
**Estimated size:** 900–1,400 implementation/test lines  
**Owner role:** core / browser
**Milestone:** MVP
**Design refs:** §5.6, §9.1–§9.7, §12.3.

## Goal & business context

Play must transfer a puzzle safely between independent pages. Shared links/files should work on another device, while storage denial must not prevent play.

## Scope

**In scope:** native compression codes, URL parsing/building, namespace-safe library/progress/preferences, download/clipboard primitives and prepared Play links.  
**Out of scope:** app panels, game moves, generating puzzles and remote upload services.

## Inputs & context

```ts
// core/engine/sharecode.js
encodeShareCode(pack:Pack):Promise<string>;
decodeShareCode(code:string,o?:{maxBytes?:number}):Promise<Result<Pack>>;
playerUrl(base:string|URL,code:string,index:number):string;
parseLocationHash(hash:string):{pack?:string;lib?:string;index:number}|null;
extractCode(text:string):string|null;
// core/browser/handoff.js
openInPlayer(pack:Pack,index:number):Promise<void>;
readIncoming(location:LocationLike):Promise<Result<{pack:Pack;index:number}>>;
downloadPack(pack:Pack,fileName:string,o?:{omitSolutions?:boolean}):void;
preparePlayerLink(pack:Pack,index:number):Promise<{href:string|null;portable:boolean;warning?:string}>;
```

`preparePlayerLink` is the explicit adapter needed for real precomputed `<a href>` card links; it does not navigate. `openInPlayer` uses it for same-tab navigation. All incoming paths use T11 `parsePack`/`validatePack`.

Share format:

- UTF-8 compact JSON → native `CompressionStream('deflate-raw')` → unpadded base64url, prefix `1z.`.
- Without compression support, prefix `1j.` with uncompressed UTF-8 bytes.
- Decode only valid prefix/alphabet, input≤350,000 characters, output≤256 KiB. Abort the stream as soon as the output would cross that limit; do not buffer a bomb first.
- Decode UTF-8 strictly. Missing decompressor gives “This browser can't open compressed links — use Import file.”
- `extractCode` accepts a bounded pasted code, full URL, surrounding text, or raw JSON. Extract only data; never fetch a pasted remote URL.
- `#pack=<code>&i=<index>` is portable; `#lib=<16-hex-packId>&i=<index>` is same-browser only. Index is a nonnegative integer, default0; an out-of-range puzzle index is an input error.
- File size≤512 KiB; output codec size≤256 KiB. The encoder must refuse to create a link that its decoder would reject, even if compression makes it short.
- URLs are built with `new URL('../player/', document.baseURI)` or the supplied page base. No root-relative `/player/`.
- Total URL limit16,000 characters; warn Copy link above4,000.

Storage keys and limits:

| Key | Data / limit |
|---|---|
| `pentomino:v1:gen:state` | Serialized generator state, including board rows, witness, batch and seen history |
| `pentomino:v1:lib:index` | `{packId,title,createdAt,lastOpened,puzzles,solved}[]`, max30 packs, LRU |
| `pentomino:v1:lib:<packId>` | Validated Pack JSON |
| `pentomino:v1:progress:<fp>` | `{v:1,placements,elapsedMs,moves,solved,updatedAt}`, max300 entries |
| `pentomino:v1:prefs` | Labels, Patterns, Timer, Straighten view, Large boards |

Add a private namespaced progress index for LRU bookkeeping; do not scan/read foreign values. `createStorage(storageAdapter,now)` returns the same methods as the module's default lazy browser instance; `now` returns host milliseconds. Concrete exports:

```ts
type StorageFailure={ok:false;code:'storage-unavailable'|'quota'|'invalid-data';message:string};
type StorageResult={ok:true}|StorageFailure;
get<T>(key:string):T|null; set(key:string,value:unknown):StorageResult;
remove(key:string):StorageResult; list(prefix:string):string[];
lastStorageIssue():Issue|null;
libraryIndex():{packId:string;title:string;createdAt:string;lastOpened:string;puzzles:number;solved:number}[];
saveLibraryPack(pack:Pack):{ok:true;packId:string}|StorageFailure;
loadLibraryPack(packId:string):Result<Pack>;
removeLibraryPack(packId:string):StorageResult;
saveProgress(fp:string,value:Progress):StorageResult;
loadProgress(fp:string):Progress|null;
getPrefs():{labels:boolean;patterns:boolean;timer:boolean;straighten:boolean;largeBoards:boolean};
setPrefs(partial:object):StorageResult;
getGeneratorState():unknown|null;
setGeneratorState(snapshot:unknown):StorageResult;
```

Default preferences are true/true/true/false/false. Reads return a safe memory fallback or null and record a read error for one user notice; missing entries are not storage errors. Merge preference updates so one app cannot erase another preference. Library solved counts may be refreshed when a pack is opened/listed; do not hash all stored packs after every drag.

- Every storage access is caught. On quota: evict LRU entries in this namespace only, retry once, then continue in memory with “Progress can't be saved in this browser”.
- Never call `clear()` or get/remove foreign keys. Key-name enumeration may filter the namespace before any value read.
- Last write wins across tabs; validate every loaded record.
- Pack ID is T07’s semantic-content hash. Progress uses the exact-coordinate fingerprint, never the public puzzle ID.
- T13 provides snapshots; browser code stamps `updatedAt` and supplies elapsed time. No clock enters engine hashing or game rules.

Play:

1. Build a self-contained pack and best-effort save the pack/library and generator state.
2. Encode and prepare the portable URL.
3. If URL too long/encoding unavailable, use a local-library link only after a successful save/readback.
4. If both fail, offer Download and Open player; do not claim a successful transfer.
5. Clearly label local links as not shareable. Keep incoming hash for reload; puzzle switching changes only `i` with `history.replaceState`.

`dom.js` supplies safe element creation, text-only toasts, clipboard handling and Blob downloads. Use `textContent`, DOM methods, classes/CSSOM; no eval, untrusted `innerHTML`, inline handlers or inline style attributes. Revoke object URLs after use.

## Files to create/modify

`core\engine\sharecode.js`; `core\browser\storage.js`, `core\browser\handoff.js`, `core\browser\dom.js`; `tests\sharecode.test.js`, `tests\storage.test.js`, `tests\handoff.test.js`.

## Implementation steps

1. Implement portable codec/UTF-8/base64url boundaries and URL helpers.
2. Implement injectable storage, bounded indexes and safe retries.
3. Implement prepared-link selection, input loading and download/clipboard primitives.
4. Publish browser helper return/error contracts; no UI should independently parse packs.

## Acceptance criteria — Business

- **BAC-1:** A portable link/file opens in another browser profile without local generator data.
- **BAC-2:** A local-only fallback is labeled and never offered as a portable Copy link.
- **BAC-3:** Storage denial, missing library entries and oversized links produce useful fallback actions, not lost current games.

## Acceptance criteria — Technical

- **TAC-1:** `node --test "tests\sharecode.test.js" "tests\storage.test.js" "tests\handoff.test.js"` passes.
- **TAC-2:** Both codecs round-trip; malformed base64/UTF-8/prefix/index and decompression overflow fail safely.
- **TAC-3:** Instrumented storage proves no foreign value is read/deleted; quota retry occurs once; LRU limits are enforced.
- **TAC-4:** Prefix-hosted URL tests pass for `/pentomino/generator/` and root-hosted development.
- **TAC-5:** `node tools\check-conventions.mjs` passes; UTF-8/CRLF, native APIs only, no runtime network dependencies.

## Test plan

Use the hand-authored fixture, uncompressed fallback, a highly compressible >256 KiB decoded payload, quota/security exceptions, stale library IDs and same-ID/different-geometry progress. Unit tests inject adapters; browser clipboard/download behavior is checked by T23 and fixes return to this owner.

## Definition of done & handoff

T18 exposes real prepared anchors and export buttons. T19 uses one incoming-loader path. The loader returns validated data without mutating app state; controllers commit only after success.

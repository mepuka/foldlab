# Go stream optimization: adversarial test matrix

Research memo, 2026-08-12. Scope: the Go 1.26.5 standard library, the
official `golang.org/x/text` v0.38.0 sources, and the current foldlab stream
implementation. Primary sources only. This began as a test-design note; the
implementation outcomes below record the protocol decisions its
counterexamples forced.

---

## TL;DR

1. **The current uppercase optimization has a known failing class, and its
   new test masks it.** `bytes.ToUpper` uses a fixed-width fast path only for
   ASCII; non-ASCII falls through to `bytes.Map`, whose output is explicitly
   allowed to grow or shrink. Go's own test uses U+0250 `ɐ` → U+2C6F `Ɐ`, a
   two-byte UTF-8 rune becoming three bytes. Invalid UTF-8 is decoded as
   U+FFFD with width one, so one invalid byte can also become three output
   bytes. `upperInto` writes into `len(src)` and can therefore truncate a
   rune or leave zero padding. `TestMapValueUpperMatchesByteSemantics`
   preallocates `want` to the input length and `copy`s `bytes.ToUpper` into
   it, truncating the oracle in exactly the same way. Compare against an
   appended, naturally sized oracle instead. [Implementation and growth
   contract](https://go.dev/src/bytes/bytes.go#L603), [official U+0250
   regression seed](https://go.dev/src/bytes/bytes_test.go#L1138),
   [`utf8.DecodeRune` invalid-input rule](https://go.dev/src/unicode/utf8/utf8.go#L149).

2. **“Uppercase” is not yet a cross-language semantic.** `bytes.ToUpper`
   applies Go's simple `unicode.ToUpper` rune mapping: `ß` stays `ß`.
   JavaScript's `String.prototype.toUpperCase` performs full mappings such as
   `ß` → `SS`. The official x/text full-case tables also contain `ß` → `SS`,
   `ﬃ` → `FFI`, and one-to-many Greek/Armenian mappings. A wall test must
   choose simple byte semantics or full Unicode semantics before it can be a
   law. [x/text full-case regression table](https://github.com/golang/text/blob/v0.38.0/cases/tables17.0.0_test.go#L28-L78).

3. **Fixed destination buffers need an explicit short-buffer contract.** The
   older official `x/text/transform` API makes `ErrShortDst`, `ErrShortSrc`,
   bytes-produced, bytes-consumed, EOF, and `Reset` part of the interface;
   its casing tests split a rune across source buffers and use destinations
   too short for the result. Foldlab transforms whole events, so they do not
   need that interface, but they need its core invariant: never partially
   emit an encoded rune. Grow the result or compute its exact size.
   [Transformer contract](https://github.com/golang/text/blob/v0.38.0/transform/transform.go#L17-L64),
   [casing short-buffer tests](https://github.com/golang/text/blob/v0.38.0/cases/map_test.go#L325-L360).

4. **Wire widths are limits, not estimates.** `AppendUint16` and
   `AppendUint32` append exactly the value they receive; converting `len` to
   those types first silently truncates, because Go integer conversions give
   no overflow indication. Every entry point that emits canonical bytes must
   share the same validation, including `EncodeEvent`, `Extend`, `HeadFrom`,
   `EncodeFact`, and `GzipEvents`. Parsing must compare a `uint32` length to
   the remaining bytes before converting it to `int`, especially under
   `GOARCH=386`. [Big-endian append source](https://go.dev/src/encoding/binary/binary.go#L167),
   [numeric-conversion rule](https://go.dev/ref/spec#Conversions_between_numeric_types).

5. **Gzip correctness is more than a happy round trip.** `Writer.Close`
   writes the footer; `Reader` verifies CRC and size only when consumed to
   EOF; concatenated members are accepted by default; trailing garbage,
   truncation, corrupt size, and corrupt checksum are distinct cases.
   `Writer.Reset` is the supported reuse boundary. The standard library has
   tests and a fuzz target for all of these shapes. [gzip lifecycle docs](https://pkg.go.dev/compress/gzip),
   [reset/empty/concatenation tests](https://go.dev/src/compress/gzip/gzip_test.go#L16),
   [malformed-stream tests](https://go.dev/src/compress/gzip/gunzip_test.go#L239),
   [official gzip fuzz target](https://go.dev/src/compress/gzip/fuzz_test.go).

## Implementation outcomes

- Go's transform now grows complete UTF-8 runes and is exhaustively checked
  against `bytes.ToUpper` for every Unicode scalar, every isolated
  non-ASCII byte, deterministic quick-check corpora, and native fuzzing.
- The cross-language contract is Go simple Unicode casing. TypeScript uses a
  Go-compatible byte decoder for malformed UTF-8 and a compact bridge for the
  27 Greek mappings where JavaScript's full uppercase expansion differs from
  Go's single-rune result. The optional wasm wall covers every scalar whose
  JavaScript uppercase changes plus malformed byte sequences.
- Prefix filtering is defined over the key before the first byte `=`; empty
  or missing keys are malformed for filtering. KV state accepts valid UTF-8
  `key=value` only and rejects NUL and u32 count overflow, eliminating the
  delimiter collision described below.
- Stream IDs are valid UTF-8 with u16 encoded length. TypeScript additionally
  rejects sequence values outside its safe-integer domain instead of silently
  rounding. Frame parsers validate every boundary before reading.
- Segment stores own payload bytes and reject parent cycles. Gzip accepts
  concatenated standard members, rejects corrupt/truncated/garbage-suffixed
  members, cap-limits decoded payload slices, and does not retain canonical
  buffers larger than 1 MiB in its pool.


`Reference` means a deliberately boring implementation kept in `_test.go`:
## Edge-case matrix

canonical frames built with fixed arrays and `PutUint*`, merge lookup with a
map, KV values copied into fresh storage, and casing with `bytes.ToUpper`.
Properties should compare exact bytes/events first and digest equality as the
wall witness second.

| Priority | Surface | Minimum witnesses | Property / expected result |
|---|---|---|---|
| P0 | `MapValueUpper` sizing | `k=ɐ` (U+0250 → U+2C6F grows), `k=ⱥ` (U+2C65 → U+023A shrinks), repetitions and ASCII on either side | Exact payload equals `append(copy(prefix), bytes.ToUpper(value)...)`; output is valid UTF-8 when the transformed value is valid; no truncation or NUL tail. |
| P0 | Invalid UTF-8 casing | `k=\xffa`, stray continuation `\x80`, overlong `\xc0\xaf`, incomplete `\xe2\x82`, surrogate encoding, out-of-range four-byte encoding | Exact equality with `bytes.ToUpper`; each invalid byte is processed under `DecodeRune`'s `(RuneError, 1)` rule; input remains unchanged. Do not constrain the oracle to input length. |
| P0 | Simple vs full case | `Straße`, `ﬃ`, `և`, `ΐ`, dotted/dotless I, combining marks | First assert the selected contract. If Go remains `bytes.ToUpper`, TS must implement simple mapping or the wall must reject these inputs. If TS semantics win, Go needs full mapping; `bytes.ToUpper` is not the oracle. |
| P0 | Canonical length fields | stream byte lengths 0, 1, 65,535, 65,536; payload lengths around feasible allocation boundaries; fact stream names at the same u16 boundary | Values within range encode exactly; over-width values are rejected consistently by **every** canonical emitter, never modulo-truncated. `EncodeEvent` and gzip must not disagree about admissibility. |
| P0 | 32-bit decoder arithmetic | Valid gzip containing a raw frame whose payload field is `0xffffffff` but has no payload; run with `GOARCH=386` | Return a truncation/size error, never convert to negative `int`, slice backward, or panic. Also cross-compile the package tests for 386. |
| P0 | Frame parser totality | gzip of raw lengths 0..13; truncation after every field byte; valid event plus one trailing byte; declared ID/payload longer than remainder | `GunzipEvents` either returns the exact event sequence or a non-nil error and no partial success; it never panics or hangs. |
| P1 | Casing boundary grammar | no `=`, leading `=`, empty value, multiple `=`, embedded NUL, empty payload | The first `=` is the only boundary. Lock down whether malformed KV payloads are transformed, passed through, or rejected; `MapValueUpper` and `KV.Apply` currently have different admissibility. |
| P1 | Prefix filter grammar | empty prefix, exact key, partial key, longer prefix, prefix containing `=`, no `=`, multibyte UTF-8, invalid payload bytes | For admitted `key=value` events, keep iff the key bytes start with the prefix. Separately decide malformed-input and invalid-UTF-8 behavior; Go byte-prefix and TS decode-then-prefix differ on replacement characters. |
| P1 | Fusion algebra | arbitrary bounded event slices, including all-drop/no-drop/mixed; instrument a transform after a drop | Fused output is structurally identical to sequential output, preserves survivor order, and never invokes downstream transforms after a drop. Associativity and identity hold for exact events, then for heads. |
| P1 | Transform aliasing | retain input, mutate returned payload, append to returned payload | No transform mutates input during evaluation. Decide whether output payloads must be isolated afterward: rename/filter/identity currently share payload storage while value-map-with-`=` promises a fresh payload. Test the chosen contract explicitly. |
| P1 | Head fast path | event sizes 0, 1, 255/256 boundary, 4 KiB; stream/payload NULs and invalid bytes; seq 0 and `MaxUint64` | Optimized `Extend` and `HeadFrom` equal `sha256.Sum256(head || referenceEncode(event))`; batch fold equals repeated single-step fold for every prefix. |
| P1 | Dense merge fast path | first seq 0, nonzero, `MaxUint64`; wrap `MaxUint64,0,1`; lower-than-first pick; empty source; one gap; descending/sparse order; duplicate seq | Exact result/error equals a map-index reference. Sparse duplicate positions resolve to the last source event. Missing source name and missing seq both identify the correct pick index. |
| P1 | KV buffer reuse | same key long→empty→short→long; mutate each source payload after `Apply`; multiple `=`; invalid UTF-8 and NUL bytes | State/digest equals the fresh-copy reference after every prefix. No stale suffix survives reuse and later source mutation cannot change state. |
| P1 | Gzip lifecycle and reuse | empty batch; tiny/large/tiny sequence; repeated calls; many goroutines using different corpora and sizes | Each output fully closes and verifies, round-trips exact canonical bytes, and is independent of prior pool occupants. Run under `-race`; compare deterministic output to a fresh writer where byte determinism is intended. |
| P1 | Gzip corruption policy | flip header, deflate body, CRC, and size bytes; truncate at every byte; append garbage; concatenate two valid members | Corrupt/truncated input errors. Decide and pin whether concatenated members are accepted (stdlib default) and whether trailing bytes are forbidden. No events escape before checksum verification. |
| P1 | Decompression bounds | a small highly compressible member expanding past the service's chosen maximum | Once an ingestion bound exists, fail explicitly before unbounded allocation. `io.ReadAll` reads until EOF and supplies no limit by itself. [ReadAll contract](https://pkg.go.dev/io#ReadAll). |
| P1 | Decoded payload caps | two adjacent non-empty events; append to event 0's payload, mutate event 0, retain event 1 | `cap(payload) == len(payload)` for each decoded event; append cannot overwrite the next frame. Direct mutation may share the decompressed backing array but must remain within that payload. Full slice expressions set this cap deliberately. [Go slice-capacity rule](https://go.dev/ref/spec#Full_slice_expressions). |
| P1 | Pool retention | one very large frame followed by a long run of tiny frames, with GC/heap profile outside unit tests | Oversized buffers are not returned to the pool. This is a profile/benchmark assertion, not a brittle `runtime.MemStats` unit test. Go issue #27735 documents a 256 MiB pooled buffer retained by 1 KiB traffic growing a process to 6 GiB. [Issue #27735](https://github.com/golang/go/issues/27735). |
| P2 | Empty/nil representation | nil events, empty non-nil events, empty stream, empty payload, empty gzip member | Semantic equality and digest laws hold without requiring nil-slice identity unless the API promises it. Empty input still produces a valid closed gzip member. |
| P2 | Stream interning switches | `a,a,b,a,b,b`, empty ID, long ID, invalid Go string bytes | Decode preserves exact canonical bytes across switches. Separately require valid UTF-8 for cross-language streams or document Go-only byte-string behavior; JavaScript cannot represent arbitrary invalid UTF-8 strings byte-for-byte. |

## Two protocol decisions property tests will expose

These are not caused by the allocation work, but an honest arbitrary-byte
corpus reaches them quickly.

### State digest fields are not self-delimiting

`StateDigest` writes `key || 0 || value || 0`. Two one-event states built
from `a=b\x00c` and `a\x00b=c` are structurally different but feed identical
bytes into SHA-256 (same count, then `a\x00b\x00c\x00`). A regression test
should pin the current collision before any claim that the digest uniquely
names arbitrary-byte KV state. The protocol must either forbid NUL in keys
and values or length-prefix both fields. Changing this affects the frozen
cross-language protocol and therefore requires an explicit decision, not an
incidental optimization fix.

The event count is also encoded as u32. A same-package boundary test can set
the count to `MaxUint32`, apply once, and expose wrap without processing four
billion events. Again, decide whether the domain is bounded or the encoding
must widen.

### The Go/TS domains are wider in different places

Go accepts arbitrary bytes in `string` and all `uint64` sequence values. The
TS side stores stream IDs as JavaScript strings and sequence values as
`number` before converting to `BigInt`; invalid UTF-8 stream bytes and
integers above the safe-integer range cannot round-trip through that domain
unchanged. Property generators for the wall must either enforce the common
domain (valid UTF-8 streams and safe sequence integers) or change the TS
types. A Go-only round trip should still exercise the full byte/u64 domain.

## Recommended property suite

Keep seed corpora in code unless the native fuzzer discovers a useful
minimized file. The Go fuzzing guide requires fast, deterministic targets
with no state surviving an invocation because workers run in parallel; seed
entries run under ordinary `go test`, and minimized failures written under
`testdata/fuzz` become permanent regressions. [Official fuzzing guide](https://go.dev/doc/security/fuzz/).

1. `FuzzMapValueUpperMatchesBytes`: arbitrary payload bytes, seeded with
   every casing row above; exact oracle, purity, and fresh-result assertions.
2. `FuzzCanonicalHeadReference`: bounded stream/payload bytes and seq;
   optimized encoder/head versus fixed-array reference at every prefix.
3. `FuzzApplyMergeReference`: decode fuzz bytes into bounded source lists and
   picks; optimized dense/sparse path versus the original map semantics.
4. `FuzzKVReference`: arbitrary payload sequences; compare error position,
   count, copied state, and digest after every prefix.
5. `FuzzGzipRoundTrip`: deterministically decode bytes into a bounded event
   corpus; require exact canonical round trip and head preservation.
6. `FuzzGunzipEvents`: arbitrary compressed bytes plus valid-gzip wrappers
   around malformed raw frames; success implies canonical re-encode
   stability, failure must be panic-free. Mirror the standard library's
   practice of seeding valid and malformed members and trying multistream
   behavior. [Official `gzip.FuzzReader`](https://go.dev/src/compress/gzip/fuzz_test.go).

Run the deterministic seed corpus in every gate, then time-box active fuzzing
locally (for example, each target on amd64 plus the ordinary suite under
`GOARCH=386`). Run the concurrency corpus under `go test -race`. Fuzzing is
for finding counterexamples; each discovered semantic counterexample should
be promoted to a small named law.

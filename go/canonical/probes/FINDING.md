# CG1 — cross-language chain-identity refusal closure

Status: **CLOSED, GREEN** under Task 23 Addendum 1 on 2026-08-13.

## Evidence sequence

The pre-fix finding remains captured in `cg1.out`: distinct invalid Go byte
strings `ff` and `fe` collided after U+FFFD substitution, while the real
`proto/ts` `entryDigest` minted identity for a lone high surrogate. The red
probe exited 1. That finding triggered the original stop condition and was not
reconstructed after the fix.

Addendum 1 authorized a coordinated API migration and the exact `proto/ts`
scope extension. The same vector is now a normal cross-language gate:

```text
bun run go/canonical/probes/cg1.ts
```

```text
go-invalid-ff-refused=true field=payload
go-invalid-fe-refused=true field=payload
go-invalid-sequence-refused=true seq=-1
go-invalid-sequence-refused=true seq=9007199254740992
go-valid-max-sequence-digest=d2338eb081d537359a754aa421eae568c07c95da25f41cd19d945135bf6b5b42 seq=9007199254740991
ts-lone-surrogate-refused=true tag=InvalidUnicode field=payload reason=payload is not valid Unicode
ts-invalid-sequence-refused=true tag=InvalidSequence seq=-1
ts-invalid-sequence-refused=true tag=InvalidSequence seq=9007199254740992
cross-language-valid-max-sequence-digest=d2338eb081d537359a754aa421eae568c07c95da25f41cd19d945135bf6b5b42 seq=9007199254740991
ts-replacement-scalar-digest=19b4e8fa2dd74b761cf77894f1e4cf7fb008c95f69cfa055e7a74378da4d6c26
CG1 GATE PASS: both identity implementations agree on their Unicode and sequence domains
```

Exit code: `0`; captured in `cg1-green.out`. The gate executes the actual Go
`canonical.EntryDigest` and actual `proto/ts/src/jcs.ts` `entryDigest`; neither
side is a port. `go/canonical/entry_refusal_test.go` and
`proto/ts/test/identity-refusal.test.ts` promote the shared vector into their
scoped suites as well.

## Implemented closure

- Go `EntryDigest` returns `(string, error)` and refuses invalid UTF-8 in both
  `payload` and `prev` with `*InvalidUTF8Error` naming the field.
- Go `BuildChain` returns `([]string, string, error)`, propagates the typed
  refusal, and returns no partial identity on failure.
- Every root-Go and `proto/go` caller now handles the error; verifiers propagate
  refusals, runtime paths return errors, and fixture-only tests/helpers fail
  explicitly on their known-valid inputs.
- The stop-time audit against `origin/main@fe63ffed41a1c59bd6e1db0137d4e7f077b0f41a`
  found 26 `EntryDigest` calls and 9 `BuildChain` calls across 18 files. The
  authorized migration includes all 14 files that were outside the original
  scope: both runtime commands, crashstorm, transfleet, six gauntlet files, and
  all four `proto/go` callers. The post-rebase call graph compiles and tests as
  one API; no old one-result or two-result call remains.
- TypeScript `entryDigest` returns a discriminated `EntryDigestResult` and
  represents lone high/low surrogates in `payload` or `prev` as an
  `InvalidUnicode` refusal value. `foldChain` propagates its reason without an
  exception crossing the exported identity seam.
- Both implementations share the exact sequence domain `0..2^53-1`. Go's
  canonical sequence lane is explicitly `int64` on every architecture and
  returns `*InvalidSequenceError` for the integer costumes it can represent;
  TypeScript returns `InvalidSequence` data for negative zero, non-finite,
  fractional, negative, unsafe, and non-number runtime values before entering
  the throwing general-purpose canonicalizer. `foldChain` performs this domain
  check before sequence arithmetic. The shared gate refuses `-1` and `2^53`
  on both sides and byte-compares the digest at the accepted `2^53-1` edge.
- Existing valid-domain fixtures and digests remain byte-identical. No fixture
  was regenerated.

## M1 — shared merge-refusal closure

Task 23 Addendum 2 extended this closure to the merge boundary. Both real
implementations initially failed the same frozen vector,
`go/stream/testdata/m1-duplicate-seq.json`:

```text
cd go && go test ./stream -run TestApplyMergeRefusesSharedDuplicateSequenceVector -count=1
--- FAIL: TestApplyMergeRefusesSharedDuplicateSequenceVector (0.00s)
    merge_refusal_test.go:45: duplicate source sequence was accepted as []stream.Event{...alpha@3 "b=middle"..., ...alpha@7 "a=last"...}
FAIL
```

```text
bun test packages/core/test/stream.merge-refusal.test.ts
Expected: "Failure"
Received: "Success"
0 pass
1 fail
```

The vector is now a shared green gate. Go returns
`*stream.MergeDuplicateSequence`; TypeScript fails the Effect with
`MergeDuplicateSequence`. Both refusals name the source, repeated sequence,
first event index, and duplicate event index. Go also exposes the pre-existing
gap refusal as `*stream.MergeGap`, matching TypeScript's established
`MergeGap`. Sparse unique sources still resolve in arbitrary source order, and
Go retains its allocation-free dense lookup path. The established
`fixtures/stream-wall.json` merge corpus is byte-identical and was not
regenerated.

The fixed vector is supplemented by a deterministic fast-check law (seed
`0x6d31cafe`, 500 runs). It generates the source name, unique sparse sequence
coordinates, source order, duplicate source position, insertion position, and
payload. Every duplicate case fails without a merged value and names the exact
first/duplicate indexes; removing the duplicate preserves unique sparse replay
in reverse pick order.

## Non-claims

This gate proves refusal agreement for the recorded invalid-domain boundary
and that the valid frozen corpora did not move. It does not claim exhaustive
equivalence over every malformed runtime string. The Go and TypeScript
representations differ—invalid UTF-8 bytes versus unpaired UTF-16 surrogates—so
the vector witnesses their corresponding excluded domains, not identical raw
inputs. Network JSON already excludes invalid UTF-8 independently.

The M1 vector proves refusal agreement for a duplicate in one sparse source.
It does not claim source-event ordering is semantically meaningful or impose a
dense-sequence requirement: unique sparse coordinates remain lawful. It does
not alter merge-fact identity or any existing valid merge output.

The sequence gate does not claim Go can represent JavaScript's `NaN`,
infinities, fractions, negative zero, or non-number runtime costumes;
`ChainEntry.Seq` is an `int64`. TypeScript negative controls cover those local
representations. Journal cursors and in-memory slice indexes remain
platform-sized `int`; every narrowing from canonical `int64` or JetStream
`uint64` is range-checked before conversion. The common cross-language claim
is limited to exactly representable integer positions `0..2^53-1`.

## Proposed merge-time DECISIONS entries

Task 23 keeps its decision evidence here rather than editing the
repository-wide `proto/DECISIONS.md`. The merger must replace each placeholder
with the next free repository-wide number and record any renumbering under
Task 23.

### D<merge-1>. Every stored journal head is verified before cursor adoption

Decided: `Open`, verified `Read`, and conflict recovery use one stored-entry
verification path before changing a journal cursor. A losing append still
returns `ErrConflict` once, but may heal its handle only by adopting a tail
whose position and canonical wire-byte digest verify. Alternatives: leave
resync to callers; adopt the broker tail without verification; give each path
its own verifier. Why: the writer must not inherit a weaker tamper-evidence law
than the reader, and one verifier prevents the law from drifting between
resume and recovery. **Load-bearing? yes.**

### D<merge-2>. Chain-entry identity refuses invalid Unicode in both runtimes

Decided: chain-entry identity never substitutes a replacement scalar or mints
an identity outside the canonical Unicode and safe-unsigned sequence domains.
The Go `EntryDigest` and
`BuildChain` APIs return typed errors and every caller propagates or handles
them; the TypeScript chain-entry identity lane refuses lone surrogates and
invalid runtime numbers as data; a shared refusal vector proves both domains
agree, including the accepted `2^53-1` edge. Alternatives: panic; return a
sentinel digest; add a checked twin while retaining the unsafe export; fix only
one runtime. Why: all four alternatives leave either an untyped failure, an
identity collision, or a cross-language domain mismatch. **Load-bearing? yes.**

### D<merge-3>. Merge replay refuses duplicate source sequence coordinates

Decided: each source supplied to `ApplyMerge` / `applyMerge` must contain at
most one event for each sequence coordinate. Both runtimes refuse duplicates
before resolving picks with a typed `MergeDuplicateSequence` carrying the
source, sequence, and both event indexes; one frozen vector licenses the shared
boundary. Unique sparse coordinates remain valid. Alternatives: first-write-
wins; last-write-wins; require all sources to be dense; validate only events
referenced by the merge fact. Why: either winner policy makes an identity
coordinate ambiguous, a density rule rejects lawful sparse sources, and
pick-only validation lets an invalid supplied source change admissibility with
an unrelated fact. **Load-bearing? yes.**

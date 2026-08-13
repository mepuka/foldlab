# CG1 — cross-language chain-identity refusal mismatch

Status: **CONFIRMED, RED, STOPPED without a fix** on 2026-08-13.

## Executable evidence

From the repository root:

```text
bun run go/canonical/probes/cg1.ts
```

The command intentionally exits 1 while the finding reproduces. It reads
`cg1-vector.json`, runs the actual exported Go `canonical.EntryDigest` through
`cg1-go`, and calls the actual `proto/ts/src/jcs.ts` `entryDigest`; neither is a
test-local port. The captured run is in `cg1.out`.

```text
go-invalid-ff=19b4e8fa2dd74b761cf77894f1e4cf7fb008c95f69cfa055e7a74378da4d6c26
go-invalid-fe=19b4e8fa2dd74b761cf77894f1e4cf7fb008c95f69cfa055e7a74378da4d6c26
go-collision=true
ts-lone-high-surrogate=a9ab2d9c8d6fc8144c61ef397005add940c5137f2c75d385112a09967774a6f1
ts-replacement-scalar=19b4e8fa2dd74b761cf77894f1e4cf7fb008c95f69cfa055e7a74378da4d6c26
ts-lone-surrogate-accepted=true
CG1 RED: proto/ts entryDigest minted identity for a lone surrogate
```

Exit code: `1`.

Observed:

- Go gives byte strings `ff` and `fe` the same entry digest,
  `19b4e8fa...da4d6c26`, because both are replaced by U+FFFD.
- TypeScript mints `a9ab2d9c...774a6f1` for a lone high surrogate instead of
  refusing it. Its digest for the replacement scalar is
  `19b4e8fa...da4d6c26`.

This refutes Task 23's premise that the TypeScript chain-identity lane already
refuses lone surrogates. `packages/core` constrained byte decode does refuse
them, but that is not the `proto/ts` chain-entry identity function exercised by
the cross-language wall.

## Why implementation stopped

Task 23 requires stopping if TypeScript refusal behavior disagrees. It also
limits source edits to `go/journal` and `go/canonical`. A real Go typed refusal
cannot be added inside that scope without either breaking the build or leaving
the unsafe public minting path available:

```go
var ErrInvalidUTF8 = errors.New("chain entry contains invalid UTF-8")

func EntryDigest(entry ChainEntry) (string, error)
func BuildChain(payloads []string) ([]string, string, error)
```

Against `origin/main@fe63ffed41a1c59bd6e1db0137d4e7f077b0f41a`, the two
functions have 26 `EntryDigest` calls and 9 `BuildChain` calls across 18 files.
Four files are in scope (`go/canonical/{canonical.go,conformance_test.go}` and
`go/journal/{journal.go,journal_test.go}`); these 14 required migration files
are not:

```text
go/cmd/climb/worker.go
go/cmd/realrun/main.go
go/crashstorm/worker.go
go/gauntlet/climb_test.go
go/gauntlet/real_test.go
go/gauntlet/transposition.go
go/gauntlet/transposition_test.go
go/gauntlet/verify.go
go/gauntlet/verify_test.go
go/transfleet/worker.go
proto/go/catalogr4/driver.go
proto/go/cmd/wirefix/main.go
proto/go/protod/conformance_test.go
proto/go/protod/wall_test.go
```

A panic or sentinel digest would not be a typed refusal. Adding a new checked
function while retaining `EntryDigest(ChainEntry) string` would leave the
public identity-minting path that violates the law. Neither is a fix.

## Operator choices

1. Ratify a coordinated Go API migration plus the `proto/ts` refusal change,
   then make this probe exit 0 and promote the vector into the cross-language
   wall.
2. Merge the independently complete JR1/JR2/JR3 journal repair now and leave
   this executable red finding as the CG1 gate for a separately scoped task.

No fixture, digest, production Go canonical code, or TypeScript source was
changed here. This finding does not claim that valid-UTF-8 journal entries move
identity, that network JSON admits invalid UTF-8, or that the existing frozen
corpora contain an invalid-domain value.

## Proposed merge-time DECISIONS entries

These entries are intentionally not written to `proto/DECISIONS.md`, which is
outside Task 23's edit scope. The merger must replace each placeholder with the
next free repository-wide number and record any renumbering under Task 23.

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
an identity outside the canonical Unicode domain. The Go `EntryDigest` and
`BuildChain` APIs return typed errors and every caller propagates or handles
them; the TypeScript chain-entry identity lane refuses lone surrogates; a
shared refusal vector proves both domains agree. Alternatives: panic; return a
sentinel digest; add a checked twin while retaining the unsafe export; fix only
one runtime. Why: all four alternatives leave either an untyped failure, an
identity collision, or a cross-language domain mismatch. **Load-bearing? yes.**

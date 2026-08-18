# go/ — agent contract (substrate)

Slimmed 2026-08-15 to the focus substrate, then extended by DEV-711 with a
fresh `register/` twin and `cmd/registerwall/`, and by the kernel-model slice
with the conformance consumer `kmconform/`, its generator `cmd/kmgen/`, and
the brand lint `brandlint/` with `cmd/brandlint/`: `canonical/`, `journal/`,
`register/`, `kmconform/`, `brandlint/`, and the commands. The
stream/transform hot path, the archived effector, the
gauntlet lanes, and their commands live at tag
`archive/pre-estate-focus`. Read root `AGENTS.md` first; scoped laws:

- Stdlib + the pinned nats libraries only; `gofmt -l .` prints nothing;
  `go vet ./...` and `go test -count=1 ./...` green before completion.
  `-count=1` is required, not tidy: `canonical/` reads the root
  `fixtures/**` oracles, `journal/` reads
  `proto/wire/fixtures/chains.json`, and `kmconform/` plus `cmd/kmgen/`
  read `packages/plait/fixtures/kernel-conformance.ndjson` — all outside
  this module, and Go's
  test cache cannot see a mutation in a file it cannot attribute to the
  module root — `go test ./...` prints `ok (cached)` over a mutated
  oracle. Measured on the first two (`docs/FREEZING.md`).
- `canonical/` is RFC 8785: identity is of canonical uncompressed bytes
  (ADR-0002); never fingerprint a transport form. The frozen oracle is
  `fixtures/golden-conformance.json`; the cross-language referee rows
  are `fixtures/jcs-rfc8785.json`.
- `journal/` is CAS-append, verify-on-read; the shape gate refusing
  imports is the AUTHORITY rule (ADR-0009) — do not weaken it to admit
  mirrors; replicas are a distinct declared role.
- `cmd/jcsprobe/` is the Go side of the JCS differential wall,
  spawned as a persistent process by `packages/core/test/jcsProbe.ts`.
  Its line protocol is part of the wall; a change to it is a change to
  the wall.
- `register/` is fresh code, not restored `go/effector`. It has exactly the
  five F5 actions and no watch surface; `cmd/registerwall/` exists only for the
  heterogeneous hard-kill/steal/zombie schedule.
- `kmconform/` is the kernel model's conformance corpus, consumed. Its
  serialization is ESTATE CANONICAL JSON — RFC 8785 with one deviation, an
  unbounded non-negative-integer number domain — and it is deliberately not
  `canonical/`: that package is the substrate's chain identity and its
  numbers are binary64 by the spec it implements, so sharing one encoder
  would mean either rounding a kernel Nat or breaking a frozen digest wall.
  The BOTH-WAYS LAW binds it: parse then re-emit of the whole corpus is
  byte-identical, every `canon` record's value canonicalizes to its `bytes`,
  and every `program` record's declaration canonicalizes to its `bytes`.
  `kmconform/tables_generated.go` is written only by
  `go run ./cmd/kmgen`; its regeneration gate lives in `cmd/kmgen/`, and a
  drift there is a FINDING to report, not a file to overwrite
  (`docs/FREEZING.md`).
- The `program` group is the ninth, added under the format's ADD-ONLY rule:
  appended after every existing group, one new counts key, no format bump.
  Its laws are in `kmconform/program.go` — nodes newest-first, the edge set
  equal to exactly the consumptions the local argrefs imply, holes ascending,
  and args keyed by the generator's own field names read out of the corpus's
  `Act` record rather than retyped. Never pin the corpus line count as a
  literal: validate it as `1 + sum(header.counts)`, which is what let the
  ninth group land without touching an arithmetic constant.
- `brandlint/` closes the two brand leaks Go leaves open: a conversion
  between distinct brand types, and a comparison against a non-zero untyped
  constant. Brands are DECLARED by the `//foldlab:brand` directive that
  `cmd/kmgen` emits, never guessed from a name. It is stdlib-only by the law
  above — `golang.org/x/tools/go/analysis` is not in the standard library —
  so it keeps that package's SHAPE without its dependency. It runs inside
  `go test`, and its two arms (`brandlint/testdata/{clean,leaky}`) are the
  control pair: a lint with no failing case proves nothing.

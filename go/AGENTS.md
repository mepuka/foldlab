# go/ — agent contract (substrate)

Slimmed 2026-08-15 to the focus substrate: `canonical/`, `journal/`,
and `cmd/jcsprobe/`. The stream/transform hot path, the effector, the
gauntlet lanes, and their commands live at tag
`archive/pre-estate-focus`. Read root `AGENTS.md` first; scoped laws:

- Stdlib + the pinned nats libraries only; `gofmt -l .` prints nothing;
  `go vet ./...` and `go test -count=1 ./...` green before completion.
  `-count=1` is required, not tidy: `canonical/` reads the root
  `fixtures/**` oracles and `journal/` reads
  `proto/wire/fixtures/chains.json`, both outside this module, and Go's
  test cache cannot see a mutation in a file it cannot attribute to the
  module root — `go test ./...` prints `ok (cached)` over a mutated
  oracle. Measured on both (`docs/FREEZING.md`).
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

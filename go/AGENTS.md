# go/ — agent contract (substrate)

Slimmed 2026-08-15 to the focus substrate: `canonical/`, `journal/`,
and `cmd/jcsprobe/`. The stream/transform hot path, the effector, the
gauntlet lanes, and their commands live at tag
`archive/pre-estate-focus`. Read root `AGENTS.md` first; scoped laws:

- Stdlib + the pinned nats libraries only; `gofmt -l .` prints nothing;
  `go vet ./...` and `go test ./...` green before completion.
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

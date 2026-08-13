# go/ — agent contract (substrate)

The Go module holds the substrate and the algebra's hot path. Read root
`AGENTS.md` first; scoped laws:

- Stdlib + the pinned nats libraries only; `gofmt -l .` prints nothing;
  `go vet ./...` and `go test ./...` green before completion.
- `stream/` is one half of the value/transform walls: a change that
  moves a digest in `fixtures/stream-wall.json` is wrong unless fixture
  regeneration was explicitly requested with a stated reason.
- `canonical/` is RFC 8785: identity is of canonical uncompressed bytes
  (ADR-0002); never fingerprint a transport form.
- `journal/` is CAS-append, verify-on-read; the shape gate refusing
  imports is the AUTHORITY rule (ADR-0009) — do not weaken it to admit
  mirrors; replicas are a distinct declared role.
- `effector/` implements the shipped EL0–EL10 single-key register
  contract indexed in `docs/laws/INDEX.md`. Its public executable
  evidence is `effector_test.go`; the historical R3/R4 model artifacts
  are not in this repository, so the formal claim is HELD by ticket 013.
  Preserve one authority value per digest and change the contract only
  with its obligation table. Do not cite an absent “A6 transition
  table” as a public spec.
- Every NATS-backed top-level test owns a fresh embedded server and temp
  store, uses `DontListen` + `InProcessServer`, and cleans both up. No
  fixed ports, cross-test server, or cross-test stream state. Server
  boot churn is a performance cost to measure separately, not a reason
  to trade away isolation or to mask issue #15's watch-retention race.
- `daemon/` has its own scoped contract — read `daemon/AGENTS.md`
  before editing there.
- Benchmarks live next to laws (`go test -bench -benchmem`); watch
  allocations, not cycles (`bench/BENCH.md`).

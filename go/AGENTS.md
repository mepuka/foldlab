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
- `effector/` implements the proven A6 register protocol. Its substrate
  contract is exactly: atomic create-if-absent, revision CAS,
  linearizable reads, and `Done` is never deleted or mutated. Safety is
  clock-free and identity-free — leases and owner ids are liveness
  only. Do not "improve" the protocol; it is a theorem, and the
  two-key variant was refuted by bounded search.
- `daemon/` has its own scoped contract — read `daemon/AGENTS.md`
  before editing there.
- Benchmarks live next to laws (`go test -bench -benchmem`); watch
  allocations, not cycles (`bench/BENCH.md`).

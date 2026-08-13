# go/daemon — agent contract

The daemon is the runtime owner: the deep module behind the system's one
runtime seam (NEXT.md seam decision; ticket 002 resolution; ADR-0009).
Read root `AGENTS.md` first; these laws are scoped here and
non-negotiable:

- The interface is data on subjects: canonical frames and requests in,
  facts and typed refusals out (ADR-0003). Lifecycle (acquire → ready →
  release) is the only Go API a caller sees.
- No asserted identity: every digest committed to the catalog is
  recomputed here from submitted bytes; what cannot be derived is
  refused. The catalog lives inside this package until a second
  consumer earns it a seam of its own.
- Ingress refuses what does not resolve. A refusal is a typed reply,
  never a silent drop, never admission on faith.
- An authority journal imports nothing; a replica is a verified mirror,
  locally read-only (ADR-0009). This package writes only journals it is
  authority for.
- Decisions (named bindings, fork adoptions, committed merge orders) go
  through the effector. Evidence (facts, folds, catalog records) is
  served, never owned — any daemon folding the same journal gets the
  same answer.
- Dependencies: stdlib + the pinned nats libraries, nothing else.
  Gates: `gofmt -l .` prints nothing, `go vet`, `go test`.

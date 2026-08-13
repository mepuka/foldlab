# go/daemon — agent contract

STATUS (2026-08-13): this directory holds no Go source. The daemon was
BUILT as the tracer bullet in [`proto/`](../../proto/) and has not
graduated yet; ticket 003's remaining debt is the move, and
`proto/AGENTS.md` carries the no-redesign map. The laws below are not
aspirational — most are already discharged somewhere else, and the
graduation table at the bottom of this file says where. Read that table
before assuming anything here is unbuilt, and read
[`proto/AGENTS.md`](../../proto/AGENTS.md) before editing the code that
actually enforces these laws today.

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

## Where each law is enforced today (2026-08-13)

Nothing below is retired. GRADUATED means the law is live in `proto/`
and comes back here at the move; UNBUILT means no code enforces it
anywhere yet.

| Law | Status | Enforced at |
| --- | --- | --- |
| Data on subjects; lifecycle is the only Go API | GRADUATED | `proto/go/protod/dispatch.go`; the lifecycle built as `Acquire` / `URL` / `Release`, and "ready" became the stdout ready line (`proto/CONTEXT.md`) |
| No asserted identity; catalog stays internal | GRADUATED | SPEC law W1 — `proto/go/protod/{catalog,scheme}.go` |
| Ingress refuses what does not resolve | GRADUATED, NARROWED | SPEC laws W4/W8 — `proto/go/protod/ingress.go`. Two ratified narrowings: admission checks identity resolution only, never payload conformance (`proto/SPEC.md`), and the never-a-silent-drop absolute has two carve-outs — a request with no reply inbox, and substrate failure (DECISIONS D3, D4) |
| Authority journal imports nothing | GRADUATED (authority half) | `proto/go/protod/protod.go` writes only journals it owns |
| Replica is a verified read-only mirror | UNBUILT | ADR-0009 ratified it; a stated non-goal of the tracer's scope |
| Decisions go through the effector | UNBUILT here | The proven register lives in `go/effector/`, i.e. beside the daemon rather than behind its seam; effector operations are a stated tracer non-goal |
| Evidence is served, never owned | GRADUATED | SPEC law W6, verify-on-read — `proto/go/protod/read.go` |
| Stdlib + pinned nats only; gofmt/vet/test | GRADUATED | `proto/go/go.mod`, gates in `proto/AGENTS.md` |

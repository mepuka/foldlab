# packages/core — module vocabulary

Local terms hidden behind the seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it. The
archived modules' vocabulary (folds, entities, transforms, segments)
lives with them at tag `archive/pre-estate-focus`.

**Canonical bytes**:
The RFC 8785 serialization of one JSON value. Identity is a digest
over these bytes and never over a transport form (ADR-0002).

**Constrained decode**:
The acceptance half of identity: one value, valid UTF-8 and scalars,
member names unique after unescaping, finite binary64 numbers,
256-container depth. A value refused here has no canonical bytes and
therefore no identity.

**The probe**:
`test/jcsProbe.ts` — a persistent `go run ./cmd/jcsprobe` process, so
every differential case runs the REAL Go implementation, never a port
of it.

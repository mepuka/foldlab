# packages/core — agent contract

The TS algebra and Schema face. Read root `AGENTS.md` first; scoped
laws:

- Every module here is one half of a wall: `stream.ts` ≡ `go/stream`,
  `xform.ts` ≡ `go/stream/transform.go`, `schema.ts` decoding the
  frozen Go frame. A change that moves a frozen digest is wrong unless
  fixture regeneration was explicitly requested with a stated reason.
- This package is authoring and proof, never runtime authority: no
  NATS, no IO in the algebra, transforms are pure, dropping an event is
  a return value. Runtime lives behind the daemon's seam.
- Schema identity is GREENFIELD (map ticket 004; ADR-0008 records the
  wipe): do not add digest-of-schema code here until 004 is ratified.
- Dependency: `effect` at the pinned catalog version, nothing else.
  Confirm APIs against the pinned declarations and `repos/effect/`,
  never memory.

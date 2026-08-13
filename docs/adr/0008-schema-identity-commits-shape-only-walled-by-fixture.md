# Superseded (2026-08-12): the walled machinery was wiped; identity restarts greenfield

The original decision — schema identity commits the shapes of both
sides, with the pinned beta's `SchemaRepresentation` as the digest
preimage, tripwired by a frozen fixture — was retired the same day the
ownership model landed, in a second rollback pass (operator decision).
Three reasons: nothing consumed the structural digest except its own
tests; the adversarial battery encoded semantic decisions (checks move
identity; brands, getters, and defaults do not) that were never grilled
with the operator from first principles; and the preimage was a TS
library internal of the pinned rc — unusable by the Go daemon that the
ownership model (ticket 002; ADR-0009) makes the verifier of every
digest it commits.

Schema identity is now greenfield in map ticket 004: the foldlab-owned
canonical schema encoding decides the preimage, the semantic tiers, and
the Go verification path from zero, every decision grilled. The wiped
machinery (schemaIdentity.ts, schemaBattery.ts, fixtures/schema-wall.json,
the identity wall test) remains in git history as evidence of what the
rc representation did. One lesson carries as a constraint on 004:
whatever the new preimage is, it must be walled by frozen fixture from
day one, and a red wall at a dependency bump is a deliberate re-pin,
never a fixture edit.

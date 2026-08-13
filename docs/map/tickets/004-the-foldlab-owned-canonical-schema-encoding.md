---
id: 004
title: The foldlab-owned canonical schema encoding
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

Design schema identity GREENFIELD (the mint-era machinery — digest fn,
adversarial battery, frozen fixture, wall test — was wiped 2026-08-12;
ADR-0008 records why; git history holds the evidence of what the rc
representation did). This is on the critical path: the ownership model
makes the Go daemon the verifier of every digest it commits, so the
encoding must be derivable and checkable from bytes alone, in Go, with
no TS library in the loop — independent of the Effect pin (currently
`4.0.0-rc.108`, the latest) or any future one.

Decide, from zero, grilling every decision with the operator:

- The preimage: which shape-facts enter the digest at all. The mint-era
  answers (checks move identity; brands, getters, and constructor
  defaults never do; annotations are stripped; local symbols refuse)
  are EVIDENCE of one coherent design, not precedent — each gets
  re-asked and ratified or rejected.
- The encoding discipline: canonical bytes, versioned
  (`foldlab.schema.v1` of the owned encoding), walled by frozen fixture
  from day one — a red wall at a dependency bump is a deliberate
  re-pin, never a fixture edit.
- The Go verification path: what the daemon needs to recompute a schema
  digest from the encoding alone (the no-asserted-identity law from the
  002 resolution).
- The migration story: the interim catalog identity (digest over
  submitted canonical bytes) upgrades to the owned encoding — decide
  whether interim digests are re-derived or dual-recorded.

## Ratified in grilling (2026-08-12)

The mechanism and the semantic core are decided, operator-grilled one
decision at a time:

1. **The fold mechanism.** Authoring is TypeScript + Effect Schema,
   unchanged — the unification stands for every author. Identity is a
   digest over a foldlab-owned canonical structure produced by an
   EXHAUSTIVE fold of the pinned SchemaAST's 21-node union — a pin bump
   that changes the AST is a compile error in the fold, never a silent
   digest move. The structure encodes via RFC 8785 (`go/canonical`
   already implements it), digests SHA-256; the daemon verifies bytes
   with no TS library in the loop.
2. **Both sides.** The fold walks encoding links: identity commits the
   shapes of Type and Encoded and the link structure between them.
   Transformations are opaque code and contribute structure only —
   physics, not choice: functions have no canonical bytes, so getter
   behavior and constructor defaults can never move identity.
3. **Checks.** Declared checks (serializable filter metadata: pattern,
   bounds, length) enter identity — narrowing the domain is a new
   type. Anonymous checks REFUSE at the fold: code with no canonical
   form cannot claim identity.
4. **Brands.** Identity-bearing: declared nominal intent is exactly the
   distinction a catalog exists to preserve — `UserId` ≠ `OrderId` at
   equal shape.
5. **Annotations.** Claims, never identity — aligned with Effect's own
   semantics (annotations do not affect parsing) — with one carve-out:
   a Declaration node must carry a declared identifier (its only
   canonicalizable substance), which is identity-bearing; a Declaration
   without one refuses.

Meta-principle (operator, ratified): align with the pinned Effect's
SEMANTIC decisions wherever possible — their tier choices, their JSON
Schema / Standard Schema derivations as guidance for ours — but never
depend on their bytes. Alignment of meaning, independence of preimage.

Remaining before close: the field-level spec of the owned structure and
its frozen fixture wall (lands with the build, beside the wrapper
prototype); the migration decision for interim catalog digests
(re-derive vs dual-record), deferred until the prototype shows real
records.

Addendum (2026-08-12, ratified): the owned structure's first cut exists
as `flb.type.v0` — the tracer bullet's authoring grammar
(proto/SPEC.md). It IS this ticket's build item, not a parallel interim:
its shape encodes laws 3–5 (brand node, declared-check node, resolvable
refs making the catalog a DAG), and it grows toward full SchemaAST
coverage here. Never a second grammar.

Addendum 2 (2026-08-12, from the bullet's DECISIONS.md grilling —
holes the build smoked out of the ratified laws, now closed):
6. **Array-order law**: in unordered collections, order never moves
   identity — union members canonically sorted by canonical bytes,
   optional-lists UTF-16-sorted. (The grammar spec must state a sort
   wherever an array's order is not semantic; JCS sorts objects only.)
7. **Refs are Declarations**: a cross-type reference is a Declaration
   whose identifier is the digest; no second annotation exception. The
   annotation law generalizes: identity-bearing exactly when the
   annotation is the node's only canonicalizable substance.
8. **Opaque node**: `{"k":"opaque"}` = any well-formed v0 value, the
   honest escape hatch for contract self-description until 004-full.

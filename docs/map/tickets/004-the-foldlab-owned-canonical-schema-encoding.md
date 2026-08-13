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

Addendum 3 (2026-08-13, from the language-frontier grilling —
docs/research/2026-08-13-language-ontology-frontier.md):
9. **Normalize-then-digest**: identity = SHA-256 over canonical bytes
   of normalize(term), where normalize is the identity function today
   and a SPECIFIED reduction once reducible constructs (binders,
   aliases, imports, parameterized types) arrive — ratified now so
   semantically identical grammars can never fork digests later. Any
   future normalize ships termination + confluence arguments and a
   fixture wall BEFORE touching identity. α-law: bound-variable names
   are annotations and never move identity. Adopt Dhall's name once
   normalization is real: the semantic integrity check.
10. **The closure law**: every node kind admitted to the grammar must
    preserve regularity of the induced tree language, with the
    argument written in the node's spec. This keeps emptiness,
    membership, and inclusion decidable — frontier liveness, legality,
    and inter-agent subsumption stay theorems. Known trap to refuse:
    cross-sibling constraints.

## Resolution (2026-08-14, operator + Mac seat, grilled on issue #23)

D1 — IDENTITY RUNS ON THE OWNED WALK. flb.type.v0's canonical walk is
the identity substrate; the SchemaAST fold (foldlab.schema.v1) is
DERIVATION machinery — first member of the semantic fold family, its
exhaustiveness check celebrated there — never identity. Vendor churn
cannot reach the digest. bytes-sha256-v1 remains honestly
attestation-grade until the owned scheme ships.
D2 — NORMALIZE IS NAMED. identity = SHA-256(canonical(normalize(term))).
The certify-path union-member sort IS normalize's first clause; the
partial-walk position-preserving discipline is the OTHER reading and
both are now named. Required properties of any normalize: total,
terminating, confluent, IDEMPOTENT (property-tested). Every normalize
change is a new scheme.
D3 — RECURSION IS BANNED AS STATED LAW (one-line test now); the
Unison SCC rule (hash the SCC, order members by cycle-removed hashes,
address digest.n) is PRE-RATIFIED as the designated successor. No
cycle machinery until a consumer exists (workflow.v0 is the first
plausible one).
D4 — DUAL-RECORD. A commit names a digest under a scheme; re-derive
is refuted by the append-only axiom. Scheme bridges (old digest, new
digest, scheme pair) are themselves evidence records.
D5 — the trusted-base statement takes the EXECUTABLE-ASSUMPTION form:
file list, per file (a) what could betray us, (b) which wall or
control catches it, (c) which substrate assumptions it leans on.

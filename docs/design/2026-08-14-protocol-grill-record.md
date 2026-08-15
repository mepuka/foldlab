# The protocol-value grill record: six rulings, all grounded

2026-08-14, operator + coordinator. The first protocol value is designed
against what verify/moves proved (merged `5afdb1864`) and what the
four-lane literature sweep established (D1–D6, ratified). Companions:
[the agent surface](2026-08-14-agent-surface-production-shape.md),
[streamed values and reactions](2026-08-14-streamed-values-and-reactions.md),
[the lit synthesis](../research/2026-08-14-lit-synthesis.md).

## The rulings

**G1 — the consumer is the task-acceptance protocol** (dogfood): the
spec → authorize → build → review → decide flow the estate already runs
by hand (tasks 46–48). First user = operator; adoption cost zero; real
disputes exist (task 48's acceptance finding was one).

**G2 — the form**: seats `operator`, `coordinator`, `builder`; blanks
`spec` (coordinator), `authorization` (operator), `build_report`
(builder), `review` (coordinator), `decision` (coordinator AND
operator). Three embedded choices, each ratified:
- **A. Variable-length content rides as ONE list-valued blank with a
  single writer** — stays inside the proved fixed-hole model; no list
  merging ever occurs.
- **B. Iteration is a new linked session, never a revision** — a
  `revise` decision closes the round; the next round opens with a
  predecessor link. No self-overwrite exists anywhere (D3).
- **C. `decision` is two-seat and is the protocol's one live fence** —
  coordinator proposes, operator may counter; conflict surfaces as a
  dispute (proved: never a silent overwrite) and settles by declared
  seat authority, operator > coordinator (proved: any rule over the
  accumulated candidate set is arrival-order-independent).

**G3 — hole types are catalog references**, created first through the
daemon's existing certify path. Honest dependency named: catalog
identity today is the interim digest-over-submitted-bytes
(attestation-grade); the owned-encoding upgrade path is already
ratified and does not change the protocol's shape.

**G4 — identity is plain-string principals**, the mechanism main's
sessions already enforce, extended to consult the seat table. The trust
assumption is DECLARED in the protocol value (`identity:
trusted-principals`) so it is machine-readable, not folklore.
Cryptographic identity is a later field value + daemon capability, not
a redesign.

**G5 — close is an operator-seat move**, and close is where three
things happen: the SEAL (absence of objection becomes a monotone fact —
uncontested fills go permanently stable), the FENCE (disputed blanks
settle by the declared rule), and the RECORD (unfilled blanks noted; a
close with an empty decision is legal and recorded `abandoned`).
Operator-only close makes the human override structural: the
coordinator cannot seal past the operator. Liveness honesty: no
timeout; an unclosed session stays open.

**G6 — the build plan** (task 49, codex): `flb.protocol.v0` record;
session runtime verbs `open` / `fill` / `close` / `state` on protod
with the repair discipline built in (conflicting fill auto-becomes a
recorded dispute); Go-step ≡ Lean-step conformance VECTORS (a wall, not
a correspondence proof — stated honestly); MCP tools derived from the
contract. Acceptance: task 50 runs through it end to end; its journal
is the first real protocol artifact.

## Out of v0, chosen not discovered

Cryptographic identity; multiple venues; dynamic/growing blank sets;
disputes carrying reasons (attack relations, grounded semantics);
UNDECIDED beyond `abandoned`; the push-based watch surface (polling
`state` suffices for three actors); any bounded-time promise.

## Why this is grounded

Every mechanism lands on a proved or shipped floor: the move semantics
are verify/moves' step relation (twelve theorems, five controls, gate
with mechanical axiom check); the seal is the sweep's sealing result;
the fence's order-independence is the generalized path-independence
theorem; the no-silent-clobber and no-loss behaviors are theorems, not
intentions; sessions, principals, catalog create, and MCP derivation
all exist on main today. The only new code is the protocol record, the
seat/step/close logic, and four small types.

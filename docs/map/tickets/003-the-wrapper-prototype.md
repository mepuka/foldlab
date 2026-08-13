---
id: 003
title: The wrapper prototype
type: wayfinder:prototype
status: open
assignee:
blocked-by: [002]
---

## Question

Build the cheap concrete thing to react to: the Go daemon (embedded
NATS + journal + effector + catalog) behind the narrow-writ interface,
with an Effect v4 TS client as its first consumer, per the ownership
model decided in
[The ownership question](002-the-ownership-question.md) — type
creation as a REQUEST on the node (catalog append; the daemon
recomputes the digest from submitted bytes), one entity fold
maintained node-locally, records flowing subject → journal → fold.
Amended 2026-08-12: built as a TRACER BULLET in `proto/` — a thin
permanent skeleton, not throwaway code (tracer DATA stays disposable).
Design ratified from a four-way comparison; the behavioral spec is
[proto/SPEC.md](../../../proto/SPEC.md) (coordinator-owned). The
machine-author path is first-class: `flb.type.v0` authoring grammar
(= ticket 004's owned structure, first cut), `contract.describe` with
MCP tools derived from it, codegen with a round-trip wall. The
co-deliverable is `proto/DECISIONS.md` — every decision the spec didn't
fix, logged for grilling.

Bullet two, ratified 2026-08-12 (operator; builds after bullet one's
DECISIONS.md lands): STATELESS GUIDED CONSTRUCTION — the concierge
authoring flow. One authoring-layer concept: a hole (`{"k":"hole"}`) in
a partial `flb.type.v0` tree; the partial IS the state and travels in
every request/reply, so the daemon holds no sessions. Three pure
operations as daemon REQUEST KINDS (never MCP-layer logic — the
concierge is contract, `contract.describe` describes it, MCP tools
derive from it): `type.fill` (partial + path + subtree → new partial +
frontier: remaining holes, each annotated with legal kinds, examples,
and fitting cataloged refs — the refusal machinery pointed forward),
`type.unfill` (mechanical undo — the zipper; the model's context also
holds every prior partial), and finish = zero holes = `type.create`
unchanged. Holes never touch the catalog grammar or identity: a tree
with holes cannot be cataloged. Later optimization if partials grow
heavy, inside the laws: digest-addressed partials with refusal-on-miss
(a recomputable cache, never a session).

Amended 2026-08-13 (language-frontier grilling): the concierge's
contract grows three ratified laws beyond C1–C5 — SENSIBILITY (every
reachable partial state is well-formed, so every intermediate has a
digest; `opaque` upgrades to a TYPED hole, making half-built grammars
shareable by hash — which softens the tree-with-holes-cannot-be-
cataloged rule into: partials are addressable, never catalogable),
CONSTRUCTION REACHABILITY (every legal closed term is constructible
from the empty hole), and the PREFIX PROPERTY (every offered fill
admits a closed completion, discharged mechanically as tree-automaton
emptiness — no dead ends, ever). Heritage: Hazelnut (POPL 2017) for
the calculus; type-constrained generation (PLDI 2025) for the prefix
property. The frontier becomes a DERIVED artifact: successor states of
the tree automaton compiled from the declared grammar, never a
hand-written table. If
[The workflow abstraction](008-the-workflow-abstraction.md) has
resolved by then, the prototype should interpret a program value
rather than a hand-wired pipeline — the node-as-interpreter and
workflow-as-value abstractions have to meet here.

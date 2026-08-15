# The ontology demo: the test bed's acceptance artifact

BLOCKED ON: issue 03 (the completion declaration) — an
ecommerce-shaped protocol cannot close `completed` before it lands.

## Why now

The alignment grill's ruling on what foldlab is FOR, near term: a test
bed where, given a domain ontology in prose, an agent authors the
types, a protocol is declared over them, sessions run, and journals
come out replayable. Task acceptance was the first instance; this
issue is the first instance that is not about the estate itself.

## Scope

One domain, end to end, agents driving:

1. Domain: ecommerce order acceptance (or another domain the operator
   names at dispatch). Input is PROSE — a paragraph describing orders,
   line items, refusal reasons — not hand-written type definitions.
2. An agent authors the domain types through the daemon's MCP surface
   (concierge typed holes; refusals teaching repairs). The transcript
   of tool calls is part of the artifact — it is the flywheel
   evidence.
3. The agent (or coordinator seat) declares the protocol value over
   those cataloged types: seats (e.g. buyer, merchant, arbiter),
   holes, the declared fence rule, and the completion declaration
   from issue 03.
4. Sessions run: at least one clean acceptance and one session with a
   genuine cross-seat dispute settled by the fence at close.
5. Journals, state digests, and the scheme digests committed with the
   replay commands beside them, as a dated `docs/research/` record.

## Acceptance (mechanical)

- Every claimed artifact replays: `protocol.session.state`
  reproduces each committed digest.
- The type-authoring path was the MCP surface — the tool-call
  transcript is committed, and at least one refusal-repair round
  appears in it (an authoring run with zero refusals should be called
  out as suspicious, not celebrated).
- The dispute session's journal carries pair-attributed candidates
  and the fenced outcome.
- Nothing in the artifact was produced out-of-band: every type digest
  cited by the protocol resolves in the catalog journal.

## Out of scope

Generalizing the demo into a product surface; more than one domain;
performance claims; the referee vectors (which will later referee the
very walk this demo exercises).

## Pointers

`docs/design/2026-08-15-estate-focus-grill-record.md` (alignment
addendum); `proto/ts/src/mcp.ts`; `proto/wire/CONTRACT.md`;
issue 03's ruling.

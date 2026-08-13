---
id: 025
title: Typed metadata holes — should the grammar represent more than type positions?
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

FINDING-FRONTIER-001 (proto/go/protod/FINDING-FRONTIER-001.md)
established that flb.type.v0 permits holes only at type positions:
`fields/<name>` addresses the field's TYPE value, so a field-NAME
hole — or any metadata hole (a journal name, a ref choice presented
as a decision, a constraint parameter) — is unrepresentable. The
frontier is therefore uniform and correct today (a tripwire test
pins this), and the concierge can guide only what the grammar can
hole.

The question: does guided construction WANT metadata holes? The case
for: agent-first authoring means names and parameters are also
decisions an agent should be walked through with teaching refusals —
the typed-hole calculus (Hazelnut lineage) does not restrict holes to
one nonterminal, and ticket 015's grammar generator will face the
same question for every generated DSL. The case against: names may
be exactly the thing the CALLER should own atomically (a name is not
structure; the certifier validates it in one step), and every new
hole kind multiplies the frontier, the certifier, and the wire
surface.

If ratified, the change is deep: flb.type.v0 grows a hole-kind
dimension (digest-bearing — the walled-edge byte-probe discipline
applies), the frontier becomes genuinely per-hole (task 28's
originally specced derivation un-parks), and the C-laws' no-dead-ends
obligation extends to the new kinds.

## Pre-registered prediction (2026-08-14)

If metadata holes are ratified, the first real demand will come from
ticket 015 (generated DSLs whose programs carry named bindings), not
from flb.type.v0 itself — the type grammar's names are few and
caller-owned. If that prediction holds, the right sequencing is:
decide the hole-kind dimension AS PART OF the grammar-generator
design rather than retrofitting flb.type.v0 first.

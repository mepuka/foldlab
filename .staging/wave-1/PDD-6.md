# PDD-6 — The sync claim: delivery to the front end, proved over the word

CATEGORIES algebraic-laws, specification-design, contracts,
           termination
STATUS     QUEUED behind the cas-word merge (the carriers —
           WordSig/`since`, LogEntry receipts, History.next — land
           with it). Dispatch on the standing approval once it
           lands. This is core work, not backlog.

## The operator's ruling (2026-08-30)

No sync service. No event-store API. The estate's local writes are
completely monotonic — content-addressed ingress only ever creates
new addresses and appends receipts — so sync is not a system to
build, it is a THEOREM to state: "what can we say about it? we
should prove that." The whole design is a giant pull stream: throw
receipts in the net, collect from the other side. Reads are pinned
as SIMPLE DUMB REACTIVE — a cursor that pulls. The purpose: CLI,
daemon, and UI all read one store through one word; force every
update through that flow and everything simplifies — you don't even
think about it.

## What is owed (the breaker states these over the merged carriers)

Model, loosely and deliberately small: a READER is a cursor — a
position in the word — with one operation, pull: since(n) answers
the suffix beyond n and the new frontier. No other read primitive
exists for reactive surfaces.

1. **Monotone ingress** — the word only extends; a receipt once
   present is present in every later word (prefix/`since` laws —
   several land proved with the merge; cite, do not re-prove).
2. **At-least-once** — pulls compose: consecutive pulls from n
   concatenate to since(n). No receipt between two frontiers can
   fail to appear in the pulls that cross it. (The
   `since_compose` shape.)
3. **At-most-once** — consecutive pulls are disjoint: a receipt's
   seq appears in exactly one pull. Together with (2): EXACTLY-ONCE
   delivery to any reader that pulls, by construction — not by a
   delivery protocol.
4. **No spurious update** — pull at the frontier is empty.
   A reader at the frontier receives nothing, so nothing can make a
   UI refresh without a new receipt. Stated as an iff: the pull is
   non-empty exactly when the word grew past the cursor.
5. **The funnel** — a reader pinned to an address set receives
   exactly the receipts whose address lies in the set — no loss on
   the pins, no leakage across them. Shared address spaces funnel
   efficiently because filtering commutes with (2) and (3).

Falsifiers, exhibit form: a receipt appearing in two pulls (kills
3); a receipt in since(n) missing from every crossing pull (kills
2); a non-empty pull with an unchanged word (kills 4); a pinned
reader receiving a foreign address or missing a matching one
(kills 5).

## Claim scope

This governs the LOCAL app system: every reactive surface (UI, CLI
watch modes, daemon subscribers) is a reader in the above sense.
Remote ingress inherits the same laws BECAUSE it is also just a
puller — re-pull after failure is harmless by (3)'s seq dedup — but
nothing is claimed about transport, ordering across stores, or
push. "At-least-once over the network" is exactly re-pull plus
these theorems, and the packet says so rather than proving
networking.

## Fences

No new sorts, no event-store API, no sync service, no push
machinery. Carriers are the merged Worded/WordWire files as they
land — nothing here re-opens them; this ticket STATES AND PROVES on
top. `Cas/Backend/Mcp.lean` untouched.

## Gates

`lake build` green; `check:cas` byte-identical (theorem work);
battery includes the four falsifier classes as counter-`example`s
or refusal tests, and one host-side demonstration: a TS reader over
a recorded word pulls the suffix exactly once (effects suite).

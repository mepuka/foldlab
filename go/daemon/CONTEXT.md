# go/daemon — module vocabulary

Local terms hidden behind this seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

These terms are live: they were built in [`proto/`](../../proto/) and
return here at graduation. Where the built vocabulary differs, the note
says so; the bullet-local terms it added (frame, fact, refusal kind,
structure walk, hole, partial, frontier, scheme, ready line) are in
[`proto/CONTEXT.md`](../../proto/CONTEXT.md) until then.

**Request surface**:
The daemon-owned subjects on which narrow-writ REQUESTs arrive (type
creation, journal append, effector operations, resource creation).
Location-transparent: NATS routes a request to whichever daemon serves
the subject, so clients never address a daemon.
_Built as_: `flb.req.<noun>.<verb>` (DECISIONS D1). Type creation and
the two concierge steps are requests; journal append moved to the
ingress subject; effector operations and resource creation are still
unbuilt. Location transparency holds by construction and is untested —
multi-daemon is out of the tracer's scope.

**Ingress subject**:
A designated subject accepting canonical frames — the only PUBLISH path
into a journal. Validation at ingress: the frame decodes and its schema
identity resolves; otherwise refusal.

**Resolve index**:
The read-side projection of the catalog (local journal plus mirrored
catalogs, union-resolved). An index miss is a typed refusal
(unknown identity), never a lookup error.
_Built as_: an in-memory map rebuilt by verified read at open
(DECISIONS D18). The union over mirrored catalogs is unbuilt — it needs
replicas. In `verify/catalog/Catalog.tla` the index is modelled as a
pure fold of the journal, which is a STATED abstraction and exactly the
drift R4 (ticket 010) exists to close.

**Writ**:
The three client verbs — read, publish, request — enforced by
construction on the client side and by validation here.
_Built as_: SPEC law W9. A missing capability is a missing request
kind, never a client-side protocol.

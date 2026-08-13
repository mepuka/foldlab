# go/daemon — module vocabulary

Local terms hidden behind this seam. The public language is root
[CONTEXT.md](../../CONTEXT.md); nothing here may leak into it.

**Request surface**:
The daemon-owned subjects on which narrow-writ REQUESTs arrive (type
creation, journal append, effector operations, resource creation).
Location-transparent: NATS routes a request to whichever daemon serves
the subject, so clients never address a daemon.

**Ingress subject**:
A designated subject accepting canonical frames — the only PUBLISH path
into a journal. Validation at ingress: the frame decodes and its schema
identity resolves; otherwise refusal.

**Resolve index**:
The read-side projection of the catalog (local journal plus mirrored
catalogs, union-resolved). An index miss is a typed refusal
(unknown identity), never a lookup error.

**Writ**:
The three client verbs — read, publish, request — enforced by
construction on the client side and by validation here.

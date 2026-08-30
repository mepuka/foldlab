# PDD-5 — The collector: passive file-diff collection as a cas program

CATEGORIES contracts, mutation-frames, specification-design,
           abstraction-modules
STATUS     WRITTEN, not dispatched — blocked on the daemon-spine
           and cas-word merges (the collector rides the daemon and
           writes words; both are pending). Dispatch after they
           land, on the standing approval.

## The operator's ruling (2026-08-30)

A daemon process with a DEFAULT cas program: turn on file watching,
it passively collects diffs — creation and change — with a very
modest API (set the file types; simple). Passive collection only.
The collection becomes an API. This is the front-end design law's
root: everything in the UI is an action on the store or derived;
want it in your UI, start collecting it; our job is that arbitrary
collection still functions and looks good. Product register:
.staging/product-sphere/REGISTER-HANDLER.md "Collection is the
front end". Design basis: the streaming-integrations study ("the
word is the feed, pull-first").

## Shape (breaker states the algebra first, as always)

- The collector is a PROGRAM (content, addressed, published) run by
  the daemon — not bespoke daemon code. R7: programs are content,
  hosts are code; the watcher plumbing is host, the collection
  semantics is a program.
- Collection is puts: a watched event becomes content in the store,
  receipted in the word. The feed IS the word; consumers pull.
- Contract sketch for the breaker: REQUIRES a running store and a
  watch root; ENSURES every admitted event is content whose receipt
  appears in the word exactly once, ordered by observation;
  FRAME — the collector writes only its own collection roots,
  reads only the watch root; passive means NO writes to watched
  files, ever — that is the law a falsifier must be able to kill.
- Modest API: enable/disable, file-type filter, list what is being
  collected. Verb naming is a CLI-lane ruling — candidates named in
  the packet, not claimed.

## Fences

Blocked-on files (bin/cli/daemon.ts, bin/mcp/http.ts, WordLog and
friends) are the MERGED versions once they land — nothing here
starts before that. `Cas/Backend/Mcp.lean` untouched. No new sorts.

## Gates

Effects suite green; the collector's battery includes the
passivity falsifier (exhibit a watched-file write by the collector
and the claim dies) and the exactly-once receipt law against a
recorded word.

# TEXT-CRDT — the buffer as a derived view, not a second store

Status: **STAGED DIRECTION — pre-grade**. Written 2026-08-30 on the
operator's ask ("should we have a separate text buffer? can we model
a crdt text buffer?"), against
[store-crdt.md](store-crdt.md)'s join algebra and
[QUERIES.md](../frontend-trunk/QUERIES.md)'s rungs. External source:
Evan Wallace, "CRDT: Text Buffer"
(`https://madebyevan.com/algos/crdt-text-buffer/`, fetched
2026-08-30; `.reference` receipt owed at promotion). The page
presents the causal-tree/RGA family: element id = (site, clock) +
parent pointer to the preceding character; order = pre-order
traversal, siblings by counter descending then site; deletion = a
tombstone set ("deleted characters persist forever"); runs coalesce
per site. **The page proves no convergence** — that gap is exactly
what our algebra can pay.

## The mapping — his protocol facts become our structural facts

| Evan's construction | ours | what changes |
|---|---|---|
| id = (site, clock), "never reuse the same counter in the same spot" | the ADDRESS — hash of the canonical pre-image (payload + parent ref + site + counter) | uniqueness stops being a protocol invariant: an identical re-insert is the SAME address, and a duplicate put is the identity (L92) — **replay-safety by construction, not by discipline** |
| parent pointer, must have seen the parent | a ref, and admission WF (refs resolve strictly earlier) | **causal delivery stops being a network obligation and becomes `wf`** — you cannot admit an insert whose parent the store has not seen |
| tombstone set; "values can be forgotten but the positions must be remembered" | a delete-ANNOTATION node referencing the insert's address | the store forgets nothing (grow-only law); the BUFFER forgets — the same divergence Mathlib's `AList` exhibited: the canonical structure erases, ours renders history |
| convergence (asserted, unproven) | the buffer is a query with a COMMUTATIVE target — the R1/R2 factorization | **provable here**: same content, any admission orders ⇒ same text (QA-6's theorem applied); join-agreement under `Store.Compatible` |

## The factorization — the general CRDT lesson

The buffer is NOT a monoid hom into text (the traversal needs the
whole tree). It factors as:

```
buffer = render ∘ state
state  : Q-HOM into (set of inserts, set of tombstones)   -- R2 pair:
                                                          -- grow-only,
                                                          -- comm + idem
render : pure function — pre-order traversal,
         siblings by (counter desc, site), tombstones elided
```

**Pattern: a CRDT is an R2 state query plus a pure render.** The
state patches by `run_append`; the render's incremental form (insert
into a contiguous array — Evan's own optimization) is exactly a
cached fold, SPEC §2.2's view-state kind (b) `(mark, value)`. So:

- **separate text buffer as a second source of truth — NO** (the
  mirror prohibition, SPEC §2.2, applies unchanged);
- **separate buffer as a render cache — YES**, and it is already the
  licensed kind of view state.

The visible text is non-monotone (deletes shrink it) while the state
pair is monotone — the observed-remove pattern, and a clean instance
of QUERIES §4: patch the sets, re-render the cut.

## What it costs, honestly

1. **Granularity**: runs/spans, never per-character nodes (Evan's
   coalescing; per-char admission at store weight would be ruinous).
   Live keystrokes are INTENT (view-state kind (c)) until a cut
   admits the run — a cadence ruling like GEOMETRY's G2.
2. **The wire carrier is a registry event.** New-sorts-NO stands: an
   insert wants {payload, ref→same-kind parent, site, counter} and no
   landed form carries typed self-referencing runs (`entry.prev` is
   the right SHAPE — a parent pointer whose sharing is concurrency —
   but entries are journal vocabulary, not buffer vocabulary). The
   LEAN MODEL needs none of this: parameterize over an abstract
   element embedding (the parameterize-don't-import pattern), prove
   the factorization and convergence, and let the registry event
   wait for the ruling.
3. **Where it slots**: the write-side arc (interactions/annotations),
   not the read-only trunk. It is also the showcase for decision 35 —
   "the set syncs, the word does not" is EXACTLY the hypothesis the
   buffer view is insensitive to — and the first worked client of
   QA-1's query layer and QA-6's replication theorem.

## Storage cost, computed (operator's ask 2026-08-30)

From the landed constants, not vibes: a receipt row is
`(seq, address TEXT hex-64, tag, size, at)` (`WordLog.ts:241-247`)
≈ ~90 B; the object row keys the same 64-hex address plus SQLite
overhead ≈ ~80–90 B + payload; **fixed cost ≈ ~200 B per binding,
plus the node's own bytes.** Recipe 1 fixes 65,536-byte chunks
(`Blob.ts:4`). That one number sorts every case:

| what | bindings | total ≈ | overhead vs payload |
|---|---|---|---|
| 1 GB blob (landed chunk path) | ~16.4k chunks + ~16.4k leaves + ~16.4k parents + manifest + file ≈ 49k | 1 GB + ~13 MB | **~1.3%** — and the API answers ONE 32-byte ref |
| 100 KB doc, per-KEYSTROKE CRDT (~180–260k ops incl. deletes) | ~200k | ~50–80 MB | **~300× amplification** — the RGA classic; avoid |
| same doc, per-RUN nodes (typing bursts, model-knowledge run counts) | ~10–20k | ~2–6 MB | ~20–60× — acceptable for full collaborative provenance |
| same doc, snapshot cuts only (file via chunk path per epoch) | a handful | ~100 KB × epochs | ~1× per epoch |
| embedding annotation, 384-d f32 | 1 | ~1.7 KB (int8: ~0.6 KB) | mid-sweet-spot; ×10⁶ ≈ 1.7 GB — and ×(checkpoints pinned), since old vectors never leave |
| 1,000-address result set / memory note | 1 | ~65 KB / ~0.1–10 KB | sweet spot |

**The granularity law this yields** (the general fact, bigger than
text): with ~200 B fixed per binding, payload ≥ 64 KB costs ~0.3%
overhead, ~1 KB costs ~20%, ~10 B costs ~2000%. So —
**chunk big data DOWN to 64 KB; batch small data UP into ≥ ~1 KB
nodes.** Admission granularity targets the sweet spot from both
directions; per-keystroke text is the only regime the store actually
punishes, and runs (TB-3's cadence) are the standard cure.

**"Return refs for big data" is already the law three times over**:
receipts are five fields and no bytes (rows-first/bodies-on-demand,
SPEC §3.4); the blob path answers one address for a gigabyte; SR-2
makes addresses-not-payloads the search discipline. Storage is paid
once, append-only, forever (grow-only law — it never shrinks);
READ cost is what the snapshot/epoch pattern bounds: admit a
rendered snapshot as a normal file at a cut, parent subsequent edits
off it, and readers load snapshot + tail while history stays whole.
"Ten-million-entry normal" ≈ ~2 GB of overhead plus payloads —
single-digit gigabytes before blobs, i.e. **store everything is
economically sound**; the only multiplier to watch is re-embedding
under new checkpoints.

## Ruling asks

- **TB-1**: commission the Lean model — derived structure over the
  word, parameterized embedding, no new sorts; theorems: state is R2,
  buffer = render ∘ state, convergence (order-insensitivity +
  join-agreement under Compatible), causality-from-wf.
- **TB-2**: the wire form (a text/run form family) — a registry
  event, deferred until the buffer ships; the model does not wait.
- **TB-3**: admission cadence for text (run/debounce cuts; keystrokes
  are intent) — ruled when the surface is built.

# Merkle set reconciliation: survey and design record

Status: DESIGN RECORD, pre-ratification. Direction ratified by the
operator 2026-08-27 ("the direction I want to go is the merkle trees");
nothing below is normative until its slice is ruled. The mechanization
-gap claim in §2 is UNVERIFIED and must pass the survey discipline
before it is ever stated as fact.

## 1. The idea, in estate terms

Each authority maintains a deterministic, history-independent search
tree over its admitted addresses. The set determines the root: one
32-byte identifier names the entire store state, and two instances
agree exactly when their roots agree, up to the standing collision
disjunct. Find-missing today is linear (key lists in `maxBatchKeys`
batches); reconciliation over the tree is logarithmic rounds with
bytes moved proportional to the symmetric difference. The algebra is
the one the store already is: the admitted set is a join-semilattice,
the range fingerprint is a monoid homomorphism out of it, and the
reconciliation dialogue is correct because it computes along that
homomorphism.

The server foundation this record builds on landed first: the
byte-plane backend seam (`src/server/Backend.ts`) owns exactly the
admitted-address set the tree indexes, and the admission core
guarantees everything under the tree is canonical admitted content.

## 2. Prior art (survey scaffold — receipts owed at papers-lock)

| Work | What it gives us | Status |
|---|---|---|
| Auvolat & Taïani, *Merkle Search Trees* (SRDS 2019) | The deterministic history-independent tree: layer by leading-zero count of the item hash; set determines shape | to pin |
| Meyer, *Range-Based Set Reconciliation* (2023) | The dialogue: exchange range fingerprints, split on mismatch, recurse; complexity bounds | to pin |
| Negentropy (strfry/nostr) | Production RBSR wire protocol; concrete framing prior art for a `/recon` plane | to pin |
| Iroh (n0), Willow protocol | Production range-based sync over authenticated structures | to pin |
| Prolly trees (Noms, Dolt) | Content-defined chunking of ordered trees; the same set-determines-shape property from a different construction | to pin |
| Clarke et al., *Incremental Multiset Hash Functions* (ASIACRYPT 2003); Bellare–Micciancio; LtHash | The fingerprint monoid done right: cheap XOR fingerprints are forgeable; lattice/multiset hashes are the cryptographic treatment | to pin |
| Mechanization gap | No known Lean/Coq/Isabelle mechanization of MST or RBSR — **UNVERIFIED**; check AFP, mathlib, Coq community packages before claiming | to verify |

Production referents matter beyond citation: Negentropy and Iroh are
differential-test targets for the dialogue, the same way LeanServer
and the hostile peers serve the wire families today.

## 3. Division of labor (ruled: Effect maximal, Lean minimal)

The operator's standing directive for this program: use Effect to its
fullest so the Lean model stays as simple as possible. Concretely:

**Lean owns the batch semantics only, over a canonical set
representation.**

- A set of addresses is a STRICTLY SORTED LIST — Std-only, no Finset
  machinery, and canonicality of the representation makes
  set-determines-root free by construction. The theorem with content
  is agreement between incremental operation and batch rebuild.
- The MST layer function is a pure `rank : Addr → Nat` (leading-zero
  count over the address bytes) — a deterministic parameter, no
  randomness anywhere in the model.
- `build : SortedAddrs → Tree`, `root : Tree → Digest` through the
  existing canonical-encoding + toy-digest vector pattern.
- `fingerprint : Range → SortedAddrs → Fp` as a monoid fold.
- The reconciliation dialogue as a pure function over TWO sorted
  lists producing the transcript — no wire, no state, no IO.

Law families (the shape, pre-minting):

1. **History independence**: `build (insertSorted x s) = insert x
   (build s)` — incremental agrees with batch, so maintenance order
   never shows in the root.
2. **Fingerprint homomorphism**: for disjoint ranges,
   `fp (r₁ ⊔ r₂) = fp r₁ ⊕ fp r₂`.
3. **Reconciliation join**: after the dialogue both sides hold the
   join of the two sets, transfer is bounded by the symmetric
   difference — or a fingerprint-collision witness is exhibited (the
   standing collision-disjunct posture, stated constructively).

**Effect owns everything operational.**

- Incremental tree maintenance as a derived index over the backend
  seam (`SynchronizedRef`, or lock-free reads riding the grow-only
  monotonicity argument the admission core states).
- Streaming ranges (`Stream`), batching and budgets (config fields),
  deadlines and retry (the existing shell), spans (`Effect.fn`).
- The `/recon` transport as new routes on the server core — the
  dispatcher already factors as handler-over-backend, so the plane is
  additive.
- Differential harnesses: the dialogue run in-process between two
  backend interpretations is handler substitution, exactly the
  EffectPeer binding landed with the server slice.

The TS mirror consumes model-minted vectors the same way every family
does today: the Lean batch semantics generates rows (build roots over
generated sets, fingerprints over ranges, dialogue transcripts over
set pairs), and the TS incremental implementation must reproduce them
byte-for-byte — the incremental-equals-batch law is the conformance
suite, not just a theorem.

## 4. Wire sketch (planned-planes only — never a packet guess)

A `/recon` plane enters PROFILE-CAS-HTTP-0 §13 as planned, ratified
separately: a root-fingerprint read, a range-fingerprint exchange, and
a range-items transfer, all closed binary framings in the house style.
The fingerprint construction on the wire is a RULING (cryptographic
multiset hash, never bare XOR) before any framing is drafted.

## 5. Proposed slice order (for ratification)

- **S1 — survey verification**: pin the table above with provenance
  receipts; verify or retract the mechanization-gap claim.
- **S2 — the Lean first bite**: canonical sorted-list sets, `rank`,
  `build`, `root`; the history-independence family minted
  plan-§7-first with generated vectors; TS incremental index over the
  backend seam bound to those vectors.
- **S3 — the fingerprint ruling + monoid**: choose the multiset-hash
  construction; homomorphism family.
- **S4 — the dialogue**: pure reconciliation model + join theorem;
  differential against a production referent under the adopted-tools
  discipline.
- **S5 — the `/recon` plane**: profile ratification, server routes,
  adapter surface.

Context mints owed when S2 lands: the search-tree term, the range
fingerprint, the reconciliation dialogue — through the owning
CONTEXT.md, with obligations and avoid-lists, at ratification.

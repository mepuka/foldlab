# Lit note: Algebraic Replicated Data Types (ECOOP 2023)

_provenance: liteparse transcript of "C:\Users\kokok\Dev\2023 Secure ARDTs (preprint).pdf", read in full 2026-08-18._

Kuessner, Mogk, Wickert, Mezini (TU Darmstadt / REScala). "Algebraic Replicated
Data Types: Programming Secure Local-First Software." ECOOP 2023, article 8,
pp. 8:1–8:33. DOI 10.4230/LIPIcs.ECOOP.2023.8. The operator's filename says
"Secure ARDTs"; the A is "Algebraic."

## What it is

Local-first replication where the entire consistency story is one typeclass:
`Lattice[S]` with `merge : S × S → S` required to be associative, commutative,
idempotent (ACI). Operators return deltas; the runtime merges deltas into
state, which makes every operator's effect monotone by construction (their
CALM citation). Instances for products/maps/sums are compile-time derived from
component instances; underivable types are a compile error. On top: encARDTs —
encryption as an ARDT (sets of AEAD messages), with version-vector or dot
metadata so untrusted intermediaries prune subsumed ciphertext without reading
it. Plus a coordination-free nonce study (default XChaCha20-Poly1305, 192-bit
random nonces). Appendix proofs are pen-and-paper, not mechanized.

## Why it matters to the unity bridge (sharpest first)

1. **ACI vs the kernel's associative+idempotent-only hypothesis.** The paper
   derives the state order FROM the merge: s1 ≤ s2 iff s1 ⊔ s2 = s2 (§2.3,
   8:5). That induced relation is a partial order only WITH commutativity —
   drop it and antisymmetry can fail (s1⊔s2=s2 and s2⊔s1=s1 with s1≠s2). If
   the kernel builds its greatest-wins/subsumption order by the induced-order
   trick from assoc+idem alone, something is missing: either commutativity
   should be a named obligation or the kernel must carry an explicit order
   hypothesis. Concrete, checkable, cheap. → KB grill list.

2. **Published precedent for a law amendment at a real carrier (A.5, 8:31).**
   Their subsuming merge does NOT satisfy m(x,x)=x — filtering means
   m(x,x)=f(x). They prove the weakened m(m(x,y),y)=m(x,y) instead. On
   already-filtered (canonical) states the strong law holds — i.e. the lawful
   carrier is really the invariant subtype. This is exactly the shape the
   fabric bridge should expect at fabric's mergeSort-canonicalizing merge: if
   the kernel states idempotence as x⊔x=x on a bare type, fabric may satisfy
   it only on the well-formed/canonical subtype. Two amendment shapes, both
   legitimate: weaken the abstract law, or instantiate at the subtype carrier.

3. **LWW tie semantics as the silent-lie exhibit (Fig. 7, 8:9).** Their LWW
   merge is `if right.time < left.time then left else right` — equal
   timestamps keep RIGHT. Non-commutative unless timestamps are unique; the
   paper assumes uniqueness in prose. Greatest-wins reads at the bridge must
   name the uniqueness/total-order side condition explicitly. Negative
   control: at two distinct values with equal rank, merge(a,b) ≠ merge(b,a)
   must be provable — if commutativity survives dropping uniqueness, the
   translation is lying.

4. **Transparency theorems as bridge-statement shape (A.4/A.5).**
   "rec ∘ send = merge directly" — operating through the wrapper equals
   operating on the ground state. Same skeleton as "kernel program admission
   then semantics = fabric journal application under translation." A good
   template for the commuting-square lens.

5. **Sound-approximation orders (§4.1, 8:13).** Version metadata gives
   e(s) ≤ e(s') ⟹ s ⊔ s' = s' — one direction only, deliberately. Model for
   bridge statements relating an abstract rank/order to fabric's ground
   subsumption: implication, not iff.

## Fit with the operator's architecture (CALM lattices + CAS w/ fenced tokens)

The paper is the lattice plane only. Its own limitations paragraph (§3.3,
8:12) concedes CALM's boundary: nothing needing consensus is expressible
(decrement dies against max-merge). Fenced CAS lives on the other side of that
boundary — the coordination plane. The kernel's admission door with rank
well-foundedness is the fencing-token half; this paper has no counterpart
machinery among trusted replicas (any key holder may write anything;
"consistent but undesirable actions" are out of scope, 8:23). Related-work
pointers for the door side: Rault et al. (access control as CRDT), Truong et
al. (authenticated op logs), Kollmann et al. (Snapdoc). So: strong precedent
for the merge half of unity, none for the admission half — consistent with
the two proof shapes being genuinely different obligations.

## Honest bounds

- Appendix proofs are informal calculations; nothing mechanized. Fabric's
  ~200-theorem gate is already past this paper on rigor; use it as design
  precedent, not proof source.
- The crypto/nonce material is probabilistic (2^-32 bounds) and runtime-
  flavored — veil-side if anywhere; it does not cross into the Lean models.
- Safety-shaped claims only (convergence, transparency); delivery/liveness
  out of scope. Matches house posture.

## Counts verified against the transcript

33 pages; 3 encARDT variants (naive/subsuming/dotted); 4 AEAD constructions
studied (AES-GCM, AES-GCM-SIV, ChaCha20-Poly1305, XChaCha20-Poly1305);
appendix has 4 proof sections (A.1 map, A.3 product, A.4 naive transparency,
A.5 subsuming transparency) plus A.2 implementation detail and A.6 benchmark.

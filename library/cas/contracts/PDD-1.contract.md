# PDD-1 — CANON-1's theorem pair

The contract packet for Lane E: the canonicalization the authoring door
already performs, stated in algebra before the proof file exists.

```
CATEGORIES algebraic-laws, lemmas-proofs, proof-mechanics,
           representation-invariants
```

CATALOG rows opened for those tags, and what each contributed:

- **§8.0 Specification** and **§8.3 Summary** (`specification-design,
  algebraic-laws, inductive-data, lemmas-proofs`) — sorting is a
  CONJUNCTION, and the third axis is the one that bites here: "a sorter
  of keyed records preserves keys and order by key but reverses records
  within an equal-key group". `canonServices` is a keyed sort, and its
  stability axis is exactly where E2 dies without the Nodup premise.
- **§8.2 Merge Sort** (`… termination …`) — the toolchain's `mergeSort`
  supplies `mergeSort_perm`, `pairwise_mergeSort`,
  `mergeSort_of_pairwise`; the section's discipline (attack the parts
  before the end-to-end sort) is why the lemma bank below is stated
  separately from E1/E2.
- **§10.1/§10.4 Representation invariants** — `Valid` is a gate, not a
  comment: here `Valid xs := (xs.map (·.key)).Nodup ∧ xs.Pairwise
  keyLe`, established by `canonServices` and required by E2.
- **§B proof mechanics** — universals proved for arbitrary, the
  existential (the falsifier) discharged by exhibiting its witness.

## The degree claim

**I have shown algebraically that this can be implemented at the Lean
escalation tier**: every law below is a Lean statement over the shipped
`canonServices` / `isCanonServices` declarations, proved to the kernel
with no `sorry`, no `native_decide`, and no new axiom; the falsifier is
a formal counter-`example` whose witness the kernel evaluates.

**The escalation gate is named, and it is a NEGATIVE gate.** This slice
adds theorems only. Nothing it proves reaches the host as new bytes, so
`γ` is discharged by byte-identity of the generated layers module under
`emitlayers --check` — the claim is "the model gained theorems and the
emitted TypeScript did not move", and a red `--check` refutes it. There
is no host battery because there is no host change; per CONTRACT.md
§Escalation this packet's floor is the Lean statement plus the byte
gate, and it is written down rather than implied.

## The algebra

Carrier: `xs : List ServiceRef`, where `ServiceRef` is the generated
struct `⟨key, name, path⟩` (`Cas/Schema/System.lean:202-205`).

Two derived predicates, both already in the code's vocabulary:

```
keys xs        := xs.map (·.key)
NodupKeys xs   := (keys xs).Nodup
SortedKeys xs  := xs.Pairwise (fun a b => a.key ≤ b.key)
Canon xs       := NodupKeys xs ∧ SortedKeys xs
```

`canonServices` is the intended RETRACTION onto `Canon`:
`canonServices = sort ∘ dedup` (`EmitLayer.lean:220-221`), with `dedup`
keeping the LAST occurrence per key (`:202-206`). That last-wins choice
is the whole subtlety, and it is what makes E2 conditional.

```
REQUIRES   E1: nothing — total on every `List ServiceRef`.
           E2: `NodupKeys xs`. Run-relative note: the premise is not a
           wish. It is discharged at every site the estate has, by the
           authoring door's own guard (`isCanonServices`,
           `EmitLayer.lean:225-226`, enforced at elaboration by
           `tools/EmitLayers.lean:235-237`), and DOOR below proves that
           discharge rather than asserting it.

ENSURES    E1  canonServices (canonServices xs) = canonServices xs
           E2  NodupKeys xs → xs ~ ys → canonServices xs = canonServices ys
           C   Canon (canonServices xs) — the retraction lands in the
               invariant, which is why E1 holds
           DOOR isCanonServices xs = true → NodupKeys xs, and
               isCanonServices xs = true → canonServices xs = xs
           ADDR systemAddressOf (mk (canonServices p) (canonServices r))
               is invariant under permuting key-Nodup p and r —
               ONE ADDRESS for one service set, which is CANON-1's
               falsifiable claim.
           There is no second state: every declaration under contract is
           a pure function of its argument, so `old` is vacuous.

DECREASES  `dedup`: structural on the list (each recursive edge is the
           tail). `mergeSort`: the toolchain's own `l.length` variant,
           already discharged in `Init.Data.List.Sort`. No new recursion
           is introduced by this slice, so no new variant is owed.

FRAME      reads: `xs` only. writes: nothing — no state, no store, no
           address is written. The FILE frame is the load-bearing half:
           this slice adds ONE new module under `Cas/Backend/` and edits
           NO existing file. In particular it does not touch the
           `SystemNode` carrier, the load path, `Cas/Backend/Mcp.lean`,
           `library/effects/src/cas/Programs.ts`, or its test — and it
           does not touch `Cas/Backend/EmitLayer.lean` either, which
           costs a proof step (see "the mirror pin") and is worth it.
```

## The mirror pin — the one honest cost of the file frame

`dedup` and `hasKey` are `private` to `Cas/Backend/EmitLayer.lean`, so a
theorem file in another module cannot name them, and every E1/E2
decomposition needs lemmas about `dedup`. Two ways out: unseal the
helpers in `EmitLayer.lean` (moves that module's surface), or restate
them in the theorem module and PIN the restatement to the real one.

This packet takes the second. The proof module carries private
`canonDedup` / `canonHasKey` and proves

```
canonServices xs = (canonDedup xs).mergeSort keyLe
```

The pin is a THEOREM, kernel-checked against the shipped
`canonServices`, not an assumption: if the mirror ever drifts from the
private original, the pin fails to elaborate and `lake build` goes red.
No trust is added and `EmitLayer.lean` keeps its bytes. This is stated
here because a reader who finds two `dedup`s deserves to be told which
one is real and what holds them together.

## The laws and their falsifiers

```
LAW E1     Idempotence. canonServices (canonServices xs)
                          = canonServices xs
FALSIFIER  exhibit xs with canonServices (canonServices xs)
                             ≠ canonServices xs
BATTERY    library/cas/Cas/Backend/Canon.lean — `canonServices_idem`,
           kernel-checked; the executable form of the refutation is
           `#guard`-shaped: any concrete xs that survives elaboration
           while the equation fails is a red build.
```

```
LAW E2     Order-blindness under a Nodup-key premise.
           NodupKeys xs → xs ~ ys → canonServices xs = canonServices ys
FALSIFIER  exhibit xs, ys with NodupKeys xs, xs ~ ys, and
           canonServices xs ≠ canonServices ys
BATTERY    library/cas/Cas/Backend/Canon.lean — `canonServices_perm`.
```

```
LAW E2-BARE  The SAME statement with the premise DELETED is FALSE:
             ¬ ∀ xs ys, xs ~ ys → canonServices xs = canonServices ys
FALSIFIER    this law's "falsifier" is the theorem itself — exhibit the
             two permuted lists on which canonServices disagrees. This
             is the adequacy obligation discharged by construction: the
             adversarial reading ("the premise is decoration, drop it")
             is killed by a witness, not by an argument.
WITNESS      refA = ⟨key := "k", name := "A", path := "a"⟩
             refB = ⟨key := "k", name := "B", path := "b"⟩
             xs = [refA, refB]      ys = [refB, refA]      xs ~ ys
             canonServices xs = [refB]   (dedup keeps the LAST)
             canonServices ys = [refA]
             and refA ≠ refB, witnessed on `.name`.
BATTERY      library/cas/Cas/Backend/Canon.lean — the counter-`example`
             beside E2, house style, plus the ledger row below.
```

```
LAW DOOR   isCanonServices xs = true → NodupKeys xs
           isCanonServices xs = true → canonServices xs = xs
FALSIFIER  exhibit xs with isCanonServices xs = true and a repeated
           key — or with isCanonServices xs = true and
           canonServices xs ≠ xs.
BATTERY    library/cas/Cas/Backend/Canon.lean —
           `nodup_keys_of_isCanonServices`,
           `canonServices_of_isCanonServices`; and the witness above
           run through the door: `isCanonServices [refA, refB] = false`,
           which is why the estate never meets E2-BARE's counterexample.
```

```
LAW ADDR   Address stability (CANON-1's docket claim).
           NodupKeys p → NodupKeys r → p ~ p' → r ~ r' →
             systemAddressOf (mk (canonServices p)  (canonServices r))
           = systemAddressOf (mk (canonServices p') (canonServices r'))
FALSIFIER  exhibit two authored orders of one key-Nodup service set
           whose canonicalized nodes reside at different addresses.
BATTERY    library/cas/Cas/Backend/Canon.lean —
           `systemAddressOf_canon_stable`.
```

## Claim-scope — what these theorems do NOT say

The anti-overclaim class, written before the proofs so it cannot be
written to fit them:

- They are about `canonServices` as a function on lists. They do NOT
  say that every `SystemNode` in the store is canonical. The
  `cas_union` constructors remain raw (`tools/EmitLayers.lean:200-216`
  records why closing that door is its own ruling), so the guarantee is
  exactly: **terms authored through the guarded door are canonical, and
  for those terms authored order does not move the address.**
- ADDR is a congruence, not an address theory. It says equal terms have
  equal addresses because `systemAddressOf` is a function. It says
  nothing about collision resistance, and nothing about two DIFFERENT
  service sets.
- Nothing here touches the load path. Renormalize-on-read remains the
  named defect it was; a stored non-canonical term stays non-canonical.
- No soundness word attaches to any host code. The TypeScript is
  unchanged and is claimed only by the byte gate.

## Obligation classes in play

`invariant` (Canon established by `canonServices`, required by E2),
`algebraic-laws`/`abstraction` (idempotence = retraction; E2 = the
square over the key-set abstraction), `adequacy` (E2-BARE's witness:
the premise is load-bearing, proved by refutation), `claim-scope` (the
section above), `conformance` (the negative byte gate),
`termination` (structural `dedup`, toolchain `mergeSort`). The
`frame`, `domain`, and `contract` classes generate nothing: there is no
state, no partial operation, and no two-state postcondition.

## Gates

```
lake build                      (from library/cas) — green, no sorry
lake exe emitlayers --check     (from library/cas) — byte-identical
```

## Breaks

```
BROKE      n/a — no implementation was broken; this row records the
           SPEC-level falsification the packet was built around.
LAW        ∀ (xs ys : List ServiceRef), xs.Perm ys →
             canonServices xs = canonServices ys
           (E2 as the docket first phrased it, with no premise)
WITNESS    refA = ⟨"k", "A", "a"⟩, refB = ⟨"k", "B", "b"⟩
           xs = [refA, refB] ~ ys = [refB, refA]
           canonServices xs = [refB], canonServices ys = [refA]
           (`dedup` keeps the LAST occurrence, EmitLayer.lean:202-206)
CLASS      adequacy — the specification, not an implementation, was
           the defect: the unpremised law admits no correct
           implementation of a last-wins dedup.
FIXED-BY   SPEC-BUG. The packet carries the amended law (E2 with
           `NodupKeys xs`) and the witness is kept as a live
           counter-`example` in Canon.lean, so the amendment cannot be
           quietly relaxed back.
```

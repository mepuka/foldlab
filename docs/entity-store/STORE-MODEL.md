# STORE-MODEL — the CAS model specification

Status: staged material, pre-grade — 2026-08-25. This document is the model spec for the
E2 entity store: the mathematical object the Lean development implements and the pipeline
serves. It enters `docs/` only after grilling (C4). Three joints are deliberately open
(§7); everything else is proposed as stable enough to build against.

Authority relations: the schema carrier and its admission rules are owned by
`KICKOFF.md` §5/§11 (ratified); the identity-scheme vocabulary follows the
E1 spec draft (`.staging/e1/experiment-spec-draft.md` §0, §3); this document owns the
store itself — state, operations, invariants, and the theorem inventory. The scaffold
`formal/entity-store/` already implements fragments (§9 maps them).

Notation: `Bytes` = `List UInt8`. `Digest` = a 64-byte value (`Address` in the scaffold).
`⇀` = finite partial map. All claims conditional on cryptographic properties say so by
carrying the hypothesis; none is ever an axiom.

---

## 1. Parameters

- `H : Bytes → Digest` — the digest function, an abstract parameter. One concrete
  instantiation exists (`formal/fips202` SHA3-512); the model never inspects `H`.
  `H`'s injectivity appears only as a named hypothesis (`hInj : Function.Injective H`)
  in Direction-B-shaped theorems. Collision resistance is never stated.
- `versionByte : UInt8` — the scheme version, first byte of every pre-image.
- A finite set of **kinds**, each with a distinct tag byte. v1 kinds: `S` (schema
  object, tag `kindSchema`), `E` (entity object, tag `kindEntity`). Raw-bytes kind
  deferred (kickoff R-7).

## 2. Identity scheme (per kind)

For each kind `k`, the scheme is the quintuple the estate already owns:

| Piece | Requirement | Status |
|---|---|---|
| Carrier `C_k` | an inductive type; no functions anywhere in it | ratified (§11) |
| Declared equivalence `≈_k` | an equivalence relation, compositional per constructor | ratified table (kickoff §4.3, R-10) |
| Canonicalizer `canon_k : C_k → C_k` | respects **and** reflects `≈_k`; idempotent | scaffold `canonS`; obligations stated |
| Serialization `ser_k : C_k → Bytes` | framed (discriminator byte per node, unbounded LEB128-style Nat frames per the Q10 amendment); injective on canonical forms | scaffold `encSchema`/`encValue`; obligations stated |
| Pre-image `pre_k(c) := versionByte ∷ tag_k ∷ ser_k(canon_k c)` | version and kind in the pre-image, never in the address | ratified (L6) |

Address: `addr_k := H ∘ pre_k`.

For kind `E` the pre-image additionally embeds the schema address before the value bytes
(§5), so an entity's type is part of its identity.

## 3. Store state

**State.** `σ : Digest ⇀ Bytes` — a finite partial map from digests to **pre-image
bytes, stored verbatim** (the ratified store-the-pre-image rule; re-hash-on-read is one
`H` application).

**Reachability, not axioms.** The model does not impose invariants on arbitrary maps.
It defines the legal stores inductively:

```
Reachable ∅
Reachable σ  ∧  legalInsert σ b  →  Reachable (σ ∪ {H b ↦ b})
```

where `legalInsert σ b` requires: `b` parses as a well-formed pre-image of some kind
(version byte correct, kind tag known, body decodes), and — closure — every digest in
`refs(b)` is in `dom σ` (§7 joint B fixes where `refs` is defined). All store theorems
quantify over reachable states.

**Invariants (theorems over `Reachable`, not assumptions):**

- **WF1 — address consistency.** `∀ d ↦ b ∈ σ, H b = d`. Immediate from the insert rule;
  makes the checked read (§4) exactly the invariant check.
- **WF2 — reference closure.** Every address referenced by a stored object resolves in
  `σ`. Immediate from `legalInsert`.
- **WF3 — acyclicity.** The reference graph of a reachable store is a DAG. Proof shape:
  induction over `Reachable` — each insert's references point only at previously present
  objects, so insertion order is a topological order. (The anatomy document's
  "cycles are unconstructible" argument, made a two-line induction instead of a
  cryptographic story. No preimage-resistance hypothesis is needed at the model layer.)

Deliberate consequence: recursion never crosses objects. Recursive structure lives
*inside* one object (`mu` inside a schema); the graph between objects is acyclic by
construction.

## 4. Operations and laws

| Operation | Type | Notes |
|---|---|---|
| `put_k` | `C_k → Store → Store × Digest` | serializes `canon_k c`, assembles the pre-image, inserts. Defined when `legalInsert` holds (for kind `E`, includes the typing precondition, §5). |
| `get` | `Digest → Store → Option Bytes` | raw lookup |
| `getChecked` | `Digest → Store → Option Bytes` | lookup, then `H b = d` or `none`. On reachable stores, agrees with `get` (WF1); its purpose is the implementation boundary, where the map may be a disk. |
| `resolve_k` | `Digest → Store → Option C_k` | `getChecked`, strip version/tag, decode via `ser_k`'s partial inverse |
| Names | `NameMap := Name ⇀ Digest`, beside the store | mutable plane; never inside any pre-image (discriminator carve-out already priced at the schema layer) |

**Laws (the store algebra):**

- **L-put-idem.** `put c (put c σ).1 = put c σ` — same carrier twice is once.
- **L-dedup (unconditional).** `c₁ ≈_k c₂ → put c₁ σ = put c₂ σ` (same resulting store,
  same digest). Powered by Direction A alone: equivalent carriers canonicalize to equal
  forms, hence identical bytes, hence identical addresses. **No cryptographic
  hypothesis.** This is the model-level statement that deduplication is a theorem of the
  encoding, not a property of the hash.
- **L-comm.** Independent puts commute; with L-put-idem, reachable stores under insertion
  form a join-semilattice (E1 T7–T9 carried over: monotone, idempotent,
  order-independent).
- **L-frame.** `put` disturbs no existing binding: `d ∈ dom σ → (put c σ).1 d = σ d`.
  Append-only is a law, not a policy.
- **L-get-put.** `getChecked (put c σ).2 (put c σ).1 = some (pre_k c)`.
- **L-faithful (the store's contract in one line).**
  `resolve_k (put c σ).2 (put c σ).1 = some c'` with `c' = canon_k c`, hence `c' ≈_k c`.
  *What you get is what you put, up to exactly the declared equivalence, and nothing
  coarser.* Requires the round-trip obligation on `ser_k` (decode ∘ ser = some on
  canonical forms).
- **L-names-inert.** Any `NameMap` change leaves every address, every resolve, and `σ`
  itself unchanged (E1 T10).

## 5. The instantiation: kinds S and E, coupled

**Kind S — schemas.** Carrier `SchemaCore` as ratified. Its well-formedness judgment
`WFS s` is the admission ruling made formal:

1. closed — every `var` index bound by an enclosing `mu`;
2. **guarded** — every `mu`-body is productive (no bare `var` chains back to the binder
   without intervening structure); decidable check;
3. discriminators pairwise distinct where groups exist (D1);
4. every `Check` id in the pinned allowlist; every field-name list duplicate-free;
5. no `encoding`/`encodingChecks`/`constructorDefault` (absent from the carrier by
   construction).

**Kind E — entities.** Carrier: `(sAddr : Digest) × Value`. Pre-image:
`versionByte ∷ kindEntity ∷ encAddress sAddr ++ ser_V(canonV v)` where `canonV` is the
structural value canonicalizer (Q11, 2026-08-25): `vobj` fields sort by key (R-10
mirrored), array/tuple element order stays semantic, leaves are fixed. Total on all
values; on conforming values it agrees with the schema-directed ordering this line
originally named — canonical schemas are already key-sorted — and any schema-directed
refinement (e.g. default elision) arrives only by future amendment.

**The typing precondition.** `put_E (sAddr, v) σ` is legal only when:

- `resolve_S sAddr σ = some s` (the schema exists in this store), and
- `Conforms s v` (the value conforms).

**Typed reachability (the model's distinctive feature).** Every reachable store is
internally well-typed: for every stored entity, its schema resolves and its value
conforms. Git's trees may point at anything; Unison's decls float free of terms; here
the entity plane is typed by construction of reachability, and — because `sAddr` is
inside the entity's pre-image — the typing is part of identity: the same value at two
schemas is two entities at two addresses.

**`Conforms` under `mu` (joint C, proposed firm).** Unfolding `mu` grows the schema
while the value stays fixed, so termination is not structural on either side alone.
`Conforms` is therefore defined **only on guarded schemas**, total by well-founded
recursion on value size: guardedness guarantees every unfolding consumes value structure
before re-entering the binder. (Shape demonstrated in Lean in
`research/rocq-itrees-lean-probe.lean`; guardedness is checked at admission, never assumed.)
`Conforms` is decidable on the v1 universe.

## 6. Theorem inventory

Numbered for the ledger; each becomes a pinned statement. Gate target G1 throughout;
what a theorem does **not** claim is part of its statement discipline.

**Identity spine (per kind; schema instances exist in the scaffold ledger):**

| # | Statement shape | Anti-claim |
|---|---|---|
| M1 | `canon` idempotent | — |
| M2 | `canon` respects `≈`; M2′ reflects it (separate) | nothing about pinned-library semantics |
| M3 | `ser` injective on canonical forms | nothing about `H` |
| M4 | round-trip: decode ∘ ser = some, on canonical forms; decode rejects non-image bytes | — |
| M5 | Direction A: `c₁ ≈ c₂ → addr c₁ = addr c₂` (unconditional) | — |
| M6 | Direction B: `hInj → addr c₁ = addr c₂ → c₁ ≈ c₂` | hypothesis, never axiom |
| M7 | kind separation at pre-image level (`preimageS ≠ preimageE`, proved in scaffold); lifted: under `hInj`, a digest resolves under at most one kind | address disjointness unconditional |

**Store algebra:**

| # | Statement |
|---|---|
| M8 | WF1 holds on all reachable stores |
| M9 | WF2 holds on all reachable stores |
| M10 | WF3: reference graph acyclic (induction on `Reachable`) |
| M11 | L-put-idem, L-comm: insertion semilattice |
| M12 | L-dedup, unconditional |
| M13 | L-frame (append-only) |
| M14 | L-get-put; getChecked = get on reachable stores |
| M15 | L-faithful (round-trip through the store, up to `≈`) |
| M16 | L-names-inert |
| M19 | transport adequacy (G8, 2026-08-25): every ref-closed, acyclic finite set of pre-images admits an insertion order reaching it — owed with M10's reference-graph vocabulary; R-15c makes no G1 claim until this is proved |

**Coupling:**

| # | Statement |
|---|---|
| M17 | typed reachability: every stored entity's schema resolves and its value conforms |
| M18 | `Conforms` total and decidable on guarded schemas × v1 values |

**Negative exhibits (kept, in the `v2_stream_not_injective` tradition):**

- NEG-1 — dropping the kind tag admits a schema/entity pre-image collision (motivates M7).
- NEG-2 — a store violating WF2 (a dangling reference, constructible only outside
  `Reachable`) breaks M15's resolve chain — exhibits why reachability, not raw maps, is
  the object of the theorems.

**Stated-only obligations (deliberately not v1 theorems):** GC — reachability-from-roots
preserves all root-resolves; deletion exists only below the model. Everything in §16
(dynamics) is deferred and attaches *on top of* this model (traces reference these
addresses) without changing it.

## 7. Joints — CLOSED (grilling pass, 2026-08-25, operator: "all as recommended")

| Joint | Ruling |
|---|---|
| **A — state representation** | **RATIFIED: finite map + inductive `Reachable`.** Sharpening ratified with it: the model's public claims are always about reachable stores, so an implementation opening a directory as a store must *establish* reachability (verify WF1/WF2 on load, or trust its own append-only history) before the theorems apply — verification-on-open is a spec'd shell operation, not hand-waving. |
| **B — `refs`** | **RATIFIED: carrier side** (`refs_k : C_k → Finset Digest`); byte-level derivable later if needed. |
| **C — `Conforms` on `mu`** | **RATIFIED: total-on-guarded**, well-founded on value size; guardedness checked at admission; no fuel anywhere in statements. |

**Further rulings from the same pass (Q4–Q10):** the `put_E` typing precondition stays
(noting WF2 already forces schema-presence via `refs`; the marginal content is the
decidable `Conforms` check). **Canonical-image strictness**: `legalInsert` admits only
bytes in the image of `pre_k` — the store never holds a non-canonical byte-form of
anything; in the model this holds by construction (inserts come from carriers through
`pre_k`); at the shell, a put of received raw bytes must check canonicity. Names plane
stays in the v1 model (M16). Both negative exhibits kept. GC stated-only and kinds as an
open tag-byte enumeration confirmed. Vocabulary held as working labels until R-1 rules
the context home. M1–M18 + NEG-1/2 is the pinned ledger; additions by amendment only,
never smuggled.

**Naming-as-entities addendum (2026-08-25).** The design thrust for modeling naming —
name views, scenario/local naming, annotation sidecars — is captured in KICKOFF.md §17
and does not change this model: naming structures are ordinary entities; M16's mutable
plane stays one pointer per scope. Amendments A-1 (address-valued values: `Value.vaddr`
+ a schema address node, extending entity `refs` and WF2 to entity→entity references)
and A-2 (the name-view schema) are ratified as planned and enter §5's carriers by
declared amendment when implemented.

**Value-canonicalization ruling (Q11, 2026-08-25).** Pinning M15's entity half exposed
a spec-to-scaffold gap: §5's pre-image line already demanded `canonV`, while the
scaffold's `preimageE` embedded the value as given — so L-dedup silently failed to
extend to entities (two values differing only in `vobj` field order took two
addresses). Operator ruling: mint `canonV` structurally, mirroring R-10. Alternatives
weighed: treating JS own-property enumeration order as semantics (the
mechanical-fidelity reading) — rejected as a host incidental, per the closure-identity
precedent; schema-directed ordering — subsumed for conforming values, deferred
otherwise (§5). Landed same day: canonicalizing `preimageE`; M12E (unconditional entity
dedup) proved; `ObligationM15_faithful_entity` amended to return `canonV v` (before any
seat proof existed); `ObligationCanonVIdempotent` stated. Owed bridge lemmas noted for
M17: the raw-carrier put preconditions (`WFS s`, `Conforms env s v`) must transfer to
the stored canonical forms — `canonS`/`canonV` respect well-formedness and conformance,
symmetric across both kinds.

**M1 falsification and planned amendment A-3 (2026-08-25).** The scenario scout proved
— kernel-checked, within the estate allowlist, coordinator-reverified — that the
unconditional S1 obligations were FALSE: on a run of equal field keys, `insertField`
inserts after equals while `canonFields` folds right-to-left, so each canon pass
REVERSES the run — an involution, not idempotence, for both kinds. Root cause: `WFS`
implements only §5 clauses 1–2; clause 4's duplicate-free demand was never carried into
the scaffold, so duplicate-key schemas are reachable today. Landed same day under Q10
discipline: `dupFreeS`/`dupFreeV` vocabulary (`E2/Canon.lean`) and both S1 obligations
restated conditionally on duplicate-freedom. **A-3 IMPLEMENTED the same day**, in the
serialization window that opened when the seat wave merged: `WFS` carries the clause-4
conjunct (`dupFreeS`), every seat proof rebuilds green over the strengthened
`Reachable`, and the model-accepts/shell-rejects incoherence is closed. Value-plane
duplicate-freedom stays a boundary admission, not a `Reachable` clause (a JS object
cannot carry duplicate keys, so the excluded values have no host counterpart). Related statement caution from the same wave:
L-comm is false as `StoreMap` value equality (the list conses) and true up to `find` —
M11's commutation half must be pinned up to `find`-extensionality when seated.

**Mapping-wave rulings touching the model (G1–G8 ratified 2026-08-25, all as
recommended; full record in KICKOFF §18).** G4: `tupleRest` and `record` (index
signature) constructors enter the carrier by amendment **A-4** — value shapes cannot
be patched later (scout-proved at the value plane); `Declaration` stays rejected-v1.
**A-4 IMPLEMENTED 2026-08-25** (worktree seat, adjudicated): tags 0x3B/0x3C,
componentwise and guard-positive throughout, M4a still unconditional, every
pre-existing statement byte-identical except the ordered `tags_distinct` extension to
13 variants; the gain exhibited by an axiom-free re-proof that the old nested spelling
still rejects the flat value the new constructor accepts (`E2/A4Probe.lean`). M18
seat note, pinned from the delivery: `tupleRest` conformance stays syntax-directed —
`ConformsL` is lockstep, so the split point is forced by the element count, no search
over splits. G2: the value plane stays float-free in v1; anything float-bearing is
REJECTED explicitly — silent reinterpretation of Effect's `Number` as `Int` is
forbidden. G5: addresses never ride inside object KEYS (`refs` does not look there);
order-insensitive collection nodes (set/map with sorted canonicalization) are a future
amendment candidate (A-5), not a key-encoding idiom. G3: the `mu` discriminator stays
in identity (D1's priced carve-out); alpha-invariance of recursive schemas is a
non-goal v1. G8: obligation M19 added to §6 as owed. The §16 provenance-merge and §17
naming-convergence aspirations are DEMOTED to pending-A-5 (both die on array
order-sensitivity today).

## 8. Exclusions

No mutation or deletion in the model (GC stated only). No cycles (unconstructible —
M10). No names in identity (M16; the discriminator is the one priced carve-out, at the
schema layer). No runtime semantics of schemas, values, Effect, or JavaScript. No
cryptographic claims: `H`'s properties are hypotheses with names. No claim that the v1
kinds exhaust the design — kinds are an open enumeration behind the tag byte.

## 9. Mapping to the existing scaffold (`formal/entity-store/`)

Already implemented and building: `SchemaCore`/`Value`/`Check` carriers; `encSchema`/
`encValue` (framed `ser`); `canonS` with the R-10 field sort; `preimageS`/`preimageE`/
`addressS`; **proved**: M5 for schemas (`directionA`), M7's pre-image half
(`kind_separation`), Shape B correspondence + `tags_distinct`. Stated as `Prop`s: M1
(idempotence), M3 (encode injectivity), M6 (Direction B), field-sort sortedness (half of
M2). **Built 2026-08-25, post-ratification (`E2/Model.lean`, green on v4.33.1, gate clean at
830 constants):** `refsS` (joint B), `closedB`/`guardSpineB`/`guardedB` + `WFS` (§5
clauses 1–2; R-4 clause by amendment), `substS`/`unfoldMu`, the mutual inductive
`Conforms` family parameterized by `ConformsEnv` (joint C shape; check semantics and
resolver as parameters), `StoreMap`/`putPre`/`putSchema`/`putEntity`/`getChecked`,
`Reachable` (joint A — with the Q4 typing precondition on `putE` and Q5 strictness by
construction), `NameMap`. Ledger state: **proved** — M8 WF1 (induction on `Reachable`),
M12 unconditional dedup, M13 frame, M14 fresh-half (M8/M12 on the allowlist; M13/M14 at
`[propext]` alone); **stated Props** — M11 idempotence, M18 conformance decidability
(ref-free fragment first); **owed with named vocabulary dependencies** — M9, M10, M11's
commutation half, M15, M16, M17/M17', NEG-2 (all pending decode/M4 or the graph
vocabulary; listed in the file's OWED block).

**Decode seat delivered (same day, `E2/Decode.lean`, green, gate clean at 1,144
constants):** fueled parsers with (fuel, count)-lexicographic termination, fuel derived
from input length and absent from every public statement; **M4a proved unconditionally
for both kinds** (`M4a_schema`, `M4a_value` — decode is a left inverse of the framed
encoding; axioms within the allowlist). The seat surfaced and fixed a latent encoding
defect (Q10 amendment, recorded in `E2/Encode.lean`): the fixed-width be64 frame
truncated Nat mod 2^64, falsifying unconditional injectivity — frames are now unbounded
LEB128-style `encNat`, restoring injectivity and the fuel-free round-trip. Strings decode
via validity check plus the `String.ofByteArray` constructor (no dependence on the
runtime's `fromUTF8`). M4b (rejection of non-image bytes) stated as owed. Next seats,
unblocked: M15 faithfulness, M9 closure, M17 typed reachability, NEG-2; then M18.

**Statement pins and Q11 (same day):** the M15/M9/NEG-2 statements are pinned in
`E2/Resolve.lean` with seat stubs and worktree dispatch briefs
(`docs/entity-store/dispatch/`); the Q11 ruling (§7) landed `canonV`, the
canonicalizing `preimageE`, and the proved M12E — build and gate green at 1,217
constants.

**Seat wave delivered (same day, codex worktree, coordinator-adjudicated):** **M15
proved** — the fresh half hypothesis-free, both L-faithful halves on reachable stores
with H-injectivity only ever a hypothesis; **M9 proved** as WF2 over stored bytes,
via the canon-refs lemma families on both planes; **NEG-2 proved** for every `H` and
every environment, by derivation analysis through `kind_separation` and
M4a-injectivity. The F/S and F/V encode-injectivity obligations (the load-bearing
layer-(b) statements) are **discharged** as two-line M4a corollaries
(`encSchema_inj`, `encValue_inj`). All axiom reports within the allowlist; gate green
at 1,372 constants.

## Claim posture

This document is a specification: highest satisfied gate none. The scaffold's proved
items are G1 statements about lab-owned definitions. Nothing here claims anything about
the pinned Effect implementation (that is the correspondence lane's separate, gated
business), about any digest's security, or about deployment.
